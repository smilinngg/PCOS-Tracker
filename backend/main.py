from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import numpy as np
from database import predictions_collection, users_collection, health_records_collection, periods_collection, client
import bcrypt
import jwt
from typing import Optional
from datetime import datetime

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Shutdown event to properly close MongoDB connection
@app.on_event("shutdown")
def shutdown_event():
    client.close()

# Load model artifact (contains both model and feature list)
artifact = joblib.load("pcos_model.pkl")
model = artifact["model"]
MODEL_FEATURES = artifact["features"]
feature_importance = dict(zip(MODEL_FEATURES, model.feature_importances_))

SECRET_KEY = "my_super_secret_pcos_key"

class SignupModel(BaseModel):
    name: str
    email: str
    password: str
    age: int
    phone: str

class LoginModel(BaseModel):
    email: str
    password: str

@app.get("/")
def home():
    return {"message": "PCOS API running"}

@app.post("/signup")
def signup(user: SignupModel):
    existing_user = users_collection.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    new_user = {
        "name": user.name,
        "email": user.email,
        "password": hashed_password,
        "age": user.age,
        "phone": user.phone
    }
    
    result = users_collection.insert_one(new_user)
    return {"message": "User created successfully", "user_id": str(result.inserted_id)}

@app.post("/login")
def login(user: LoginModel):
    db_user = users_collection.find_one({"email": user.email})
    if not db_user:
        raise HTTPException(status_code=400, detail="Invalid email or password")
    
    if not bcrypt.checkpw(user.password.encode('utf-8'), db_user["password"].encode('utf-8')):
        raise HTTPException(status_code=400, detail="Invalid email or password")
    
    token = jwt.encode({"email": db_user["email"]}, SECRET_KEY, algorithm="HS256")
    
    return {
        "message": "Login successful",
        "token": token,
        "user": {
            "name": db_user["name"],
            "email": db_user["email"],
            "age": db_user["age"]
        }
    }

@app.post("/predict")
def predict(data: dict = Body(...)):
    try:
        # Validate that all required fields are present
        required_fields = ["age", "weight", "bmi", "cycle_length", "weight_gain", "hair_growth", 
                          "skin_darkening", "hair_loss", "pimples", "fast_food"]
        
        for field in required_fields:
            if field not in data or data[field] is None or data[field] == "":
                return {"error": f"Missing required field: {field}"}
        
        # --- Map all incoming fields ---
        age          = float(data["age"])
        weight       = float(data["weight"])
        bmi          = float(data["bmi"])
        cycle_length = float(data["cycle_length"])
        weight_gain  = float(data["weight_gain"])
        hair_growth  = float(data["hair_growth"])
        skin_dark    = float(data["skin_darkening"])
        hair_loss    = float(data["hair_loss"])
        pimples      = float(data["pimples"])
        fast_food    = float(data["fast_food"])

        # Validate ranges (age should be > 0, cycle > 0, etc.)
        if age <= 0 or weight <= 0 or bmi <= 0 or cycle_length <= 0:
            return {"error": "All measurements must be positive numbers"}

        # Derived: cycle irregularity (matches what model was trained on)
        cycle_irregular = 1.0 if cycle_length > 35 else 0.0

        # Build feature array in the EXACT order the model was trained on
        feature_map = {
            "Age (yrs)":         age,
            "Weight (Kg)":        weight,
            "BMI":                bmi,
            "Cycle length(days)": cycle_length,
            "Weight gain(Y/N)":   weight_gain,
            "hair growth(Y/N)":   hair_growth,
            "Skin darkening (Y/N)": skin_dark,
            "Hair loss(Y/N)":     hair_loss,
            "Pimples(Y/N)":       pimples,
            "Fast food (Y/N)":    fast_food,
            "cycle_irregular":    cycle_irregular,
        }

        feature_values = [feature_map[f] for f in MODEL_FEATURES]
        features = np.array([feature_values])

        prediction  = model.predict(features)[0]
        probability = model.predict_proba(features)[0][1]  # float between 0.0 and 1.0

        # --- Rule-based safety layer: boost risk for irregular cycles ---
        if cycle_length > 35:
            probability = probability + 0.10  # Irregular periods raise PCOS risk

        # Hard clamp: probability MUST stay between 0.0 and 1.0
        probability = max(0.0, min(1.0, probability))

        risk_percentage = float(f"{float(probability) * 100:.2f}")

        # Categorize
        if risk_percentage < 30:
            risk_level = "Low Risk"
        elif risk_percentage < 60:
            risk_level = "Moderate Risk"
        else:
            risk_level = "High Risk"

        result_data = {
            "prediction":      int(prediction),
            "risk_percentage": risk_percentage,
            "risk_level":      risk_level,
            "date":            datetime.now().strftime("%d %b %Y")
        }

        record = {**data, **result_data}

        email = data.get("email")
        if email:
            health_records_collection.insert_one(record)
        else:
            predictions_collection.insert_one(record)

        if "_id" in record:
            record.pop("_id")

        return record
    except ValueError as e:
        return {"error": f"Invalid number format: {str(e)}", "details": str(e)}
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Prediction error: {error_trace}")
        return {"error": "An error occurred during prediction.", "details": str(e)}

@app.get("/history/{email}")
def get_history(email: str):
    cursor = health_records_collection.find({"email": email}, {"_id": 0}).sort("_id", -1).limit(10)
    records = list(cursor)
    return {"history": records}


import ollama
from fastapi.responses import StreamingResponse
import json

@app.post("/chat")
def chat(data: dict = Body(...)):
    try:
        user_message = data.get("message", "")
        cycle_aware = data.get("cycleAware", False)

        def generate():
            try:
                # Different system prompts based on context
                if cycle_aware:
                    system_prompt = (
                        "You are a supportive menstrual cycle and wellness coach built into the PCOS Prediction App. "
                        "You help users understand their cycle phases and provide natural wellness guidance. "
                        "Keep your answers concise and helpful. "
                        "Provide advice tailored to different cycle phases:\n"
                        "- MENSTRUAL PHASE (Days 1-5): Heavy bleeding. Encourage hydration, iron-rich foods, gentle movement, rest.\n"
                        "- FOLLICULAR PHASE (Days 1-13): Growing energy and hormones. Great for challenging workouts, high-intensity activities.\n"
                        "- OVULATION PHASE (Days 12-16): Fertile window. Peak energy and confidence. Good for important meetings or social events.\n"
                        "- LUTEAL PHASE (Days 17-28): Progesterone rises then falls. Energy may dip, cravings increase. Encourage self-care, restful exercise, protein-rich foods.\n\n"
                        "Also explain how regular cycles support fertility and overall health. "
                        "If they ask about PCOS assessment, tell them to use the Period Tracker dashboard to log dates and assess risk. "
                        "Always be encouraging and emphasize listening to their body's natural rhythms."
                    )
                else:
                    system_prompt = (
                        "You are a concise and helpful PCOS health assistant built into the PCOS Prediction App. "
                        "Keep your answers focused and no longer than necessary. "
                        "Explain PCOS symptoms, risks, and lifestyle advice clearly. "
                        "IMPORTANT: If the user asks anything related to checking whether they have PCOS, "
                        "how to test for PCOS, whether they might have PCOS, or how to find out if they have PCOS, "
                        "you MUST tell them to use the built-in assessment tool on this dashboard. "
                        "Say something like: 'You can check your PCOS risk right here! "
                        "Use the Patient Metrics form on the left side of this dashboard — "
                        "enter your age, height, weight, period dates, and any symptoms, "
                        "then click Run Assessment. Our AI model will instantly calculate your PCOS risk percentage.' "
                        "Always encourage them to use the app's tool first before suggesting external medical tests."
                    )

                stream = ollama.chat(
                    model="llama3",
                    messages=[
                        {
                            "role": "system",
                            "content": system_prompt
                        },
                        {"role": "user", "content": user_message}
                    ],
                    stream=True
                )
                for chunk in stream:
                    token = chunk["message"]["content"]
                    if token:
                        yield f"data: {json.dumps({'token': token})}\n\n"
                yield "data: [DONE]\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"

        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
            }
        )

    except Exception as e:
        return {"error": str(e)}

@app.post("/log-period")
def log_period(data: dict = Body(...)):
    email = data.get("email")
    dates = data.get("dates")

    if not email or not dates:
        return {"error": "Missing email or dates"}

    # Sort dates to ensure chronological order
    sorted_dates = sorted(dates) if dates else []

    record = {
        "email": email,
        "period_dates": sorted_dates,
        "start_date": sorted_dates[0] if sorted_dates else None, # Helpful for sorting
        "logged_at": datetime.now()
    }

    periods_collection.insert_one(record)

    return {"message": "Period logged successfully"}

@app.get("/period-history/{email}")
def get_period_history(email: str):
    records = list(
        periods_collection.find({"email": email}, {"_id": 0}).sort("logged_at", -1)
    )
    return {"history": records}

@app.get("/cycle-info/{email}")
def get_cycle_info(email: str):
    """Calculate cycle info including ovulation dates and symptom status"""
    from datetime import timedelta
    
    # Sort by start_date so we can measure cycle length chronologically
    records = list(
        periods_collection.find({"email": email}).sort("start_date", 1)
    )

    # Filter out empty records
    valid_records = [r for r in records if r.get("start_date")]
    
    historical_dates = []
    for r in valid_records:
        if "period_dates" in r and isinstance(r["period_dates"], list):
            historical_dates.extend(r["period_dates"])

    if len(valid_records) < 2:
        return {
            "message": "Not enough data", 
            "historical_dates": historical_dates,
            "pcos_symptom_status": "Not enough data to determine"
        }

    cycles = []

    for idx, r in enumerate(valid_records):
        if idx > 0:
            prev = datetime.strptime(valid_records[idx-1]["start_date"], "%Y-%m-%d")
            curr = datetime.strptime(valid_records[idx]["start_date"], "%Y-%m-%d")
            cycle_length = (curr - prev).days
            if cycle_length > 10: 
                cycles.append(cycle_length)

    if not cycles:
        return {
            "message": "Not enough valid cycle data", 
            "historical_dates": historical_dates,
            "pcos_symptom_status": "Not enough data to determine"
        }

    avg_cycle = sum(cycles) / len(cycles)
    is_irregular = avg_cycle > 35 or avg_cycle < 21

    # Calculate next predicted date based on the latest period
    latest_start = datetime.strptime(valid_records[-1]["start_date"], "%Y-%m-%d")
    next_period_date = latest_start + timedelta(days=int(avg_cycle))
    
    # Calculate ovulation date (typically 14 days before next period)
    # This is the most common ovulation window
    ovulation_date = next_period_date - timedelta(days=14)
    
    # Ovulation window is typically 5 days (from -2 to +2 days of ovulation)
    ovulation_start = ovulation_date - timedelta(days=2)
    ovulation_end = ovulation_date + timedelta(days=2)
    
    # Determine PCOS symptom status based on cycle regularity
    if is_irregular:
        pcos_status = "Your cycle is irregular. You may have PCOS symptoms."
        has_pcos_risk = True
    else:
        pcos_status = "You have no PCOS symptoms. Your cycle is normal and proper."
        has_pcos_risk = False

    return {
        "cycles": cycles,
        "average_cycle": float(f"{avg_cycle:.1f}"),
        "irregular": is_irregular,
        "next_predicted": next_period_date.strftime("%d %B"),
        "next_predicted_raw": next_period_date.strftime("%Y-%m-%d"),
        "next_period_start": next_period_date.strftime("%Y-%m-%d"),
        "next_period_end": (next_period_date + timedelta(days=5)).strftime("%Y-%m-%d"),
        "ovulation_date": ovulation_date.strftime("%Y-%m-%d"),
        "ovulation_date_display": ovulation_date.strftime("%d %B"),
        "ovulation_window_start": ovulation_start.strftime("%Y-%m-%d"),
        "ovulation_window_end": ovulation_end.strftime("%Y-%m-%d"),
        "pcos_symptom_status": pcos_status,
        "has_pcos_risk": has_pcos_risk,
        "historical_dates": historical_dates
    }