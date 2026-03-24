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
        cycle_data = data.get("cycleData", {})

        def generate():
            try:
                # Different system prompts based on context
                if cycle_aware:
                    
                    context_str = ""
                    if cycle_data and not cycle_data.get("message") and cycle_data.get("historical_dates"):
                        prev_dates = cycle_data.get("historical_dates", [])
                        prev_date_str = prev_dates[-1] if prev_dates else "None"
                        next_date_str = cycle_data.get("next_predicted", "None")
                        
                        context_str = (
                            f"\n\n[USER'S CYCLE CONTEXT]\n"
                            f"Previous exact logged date: {prev_date_str}\n"
                            f"Next predicted period date: {next_date_str}\n"
                            f"If the user asks to tell them the next predicted period date, explicitly answer with the previous exact date AND predicted date based on this context data. "
                            f"If they ask to search the exact date in the calendar, use this data to inform them."
                        )
                    else:
                        context_str = (
                            "\n\n[USER'S CYCLE CONTEXT]\n"
                            "The user has NOT logged enough period dates yet.\n"
                            "WARNING INSTRUCTION: If the user asks about their cycle or dates, warmly tell them you cannot search for it because they haven't logged dates. Give a warning that this may cause a problem if periods are missed, and ask the user to give the PCOS assessment inside the app."
                        )

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
                    ) + context_str
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

    if not sorted_dates:
        return {"error": "Empty dates array"}

    # Group dates into distinct periods (e.g., gap > 10 days means a new period)
    periods = []
    current_period = [sorted_dates[0]]
    
    for i in range(1, len(sorted_dates)):
        prev_date = datetime.strptime(sorted_dates[i-1], "%Y-%m-%d")
        curr_date = datetime.strptime(sorted_dates[i], "%Y-%m-%d")
        if (curr_date - prev_date).days > 10:
            periods.append(current_period)
            current_period = [sorted_dates[i]]
        else:
            current_period.append(sorted_dates[i])
    periods.append(current_period)

    for p in periods:
        record = {
            "email": email,
            "period_dates": p,
            "start_date": p[0], # Helpful for sorting
            "logged_at": datetime.now()
        }
        periods_collection.insert_one(record)

    return {"message": "Period logged successfully"}

@app.delete("/period-history/{email}/{start_date}")
def delete_period_record(email: str, start_date: str):
    res = periods_collection.delete_one({"email": email, "start_date": start_date})
    return {"message": "Deleted successfully", "deleted": res.deleted_count > 0}

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

    # Use LAST 3 cycles for average as per advanced tracking strategy
    recent_cycles = cycles[-3:] if len(cycles) >= 3 else cycles
    avg_cycle = sum(recent_cycles) / len(recent_cycles)

    # Calculate latest start
    latest_start = datetime.strptime(valid_records[-1]["start_date"], "%Y-%m-%d")

    # Identify if they are currently missing their period
    days_since_latest = (datetime.now() - latest_start).days
    currently_missing_risk = days_since_latest > (avg_cycle + 10)

    # Calculate cycle day (1-based: day 1 is first day of period)
    cycle_day = (days_since_latest % int(avg_cycle)) + 1 if days_since_latest >= 0 else 1

    is_irregular = avg_cycle > 35 or avg_cycle < 21 or currently_missing_risk

    # Calculate 24 future period and ovulation windows (2 years) iteratively
    # This ensures we have predictions for all months including if some are skipped
    future_periods = []
    future_ovulations = []
    current_proj_date = latest_start

    # Generate 24 months of predictions to cover all possible scenarios
    for _ in range(24): 
        current_proj_date = current_proj_date + timedelta(days=int(avg_cycle))
        future_periods.append(current_proj_date)
        future_ovulations.append(current_proj_date - timedelta(days=14))

    next_period_starts = [p.strftime("%Y-%m-%d") for p in future_periods]
    next_period_ends = [(p + timedelta(days=5)).strftime("%Y-%m-%d") for p in future_periods]
    ovulation_window_starts = [(o - timedelta(days=2)).strftime("%Y-%m-%d") for o in future_ovulations]
    ovulation_window_ends = [(o + timedelta(days=2)).strftime("%Y-%m-%d") for o in future_ovulations]

    # For singular endpoints like UI dashboards relying on scalar 
    next_period_date = future_periods[0]
    ovulation_date = future_ovulations[0]
    ovulation_start = ovulation_date - timedelta(days=2)
    ovulation_end = ovulation_date + timedelta(days=2)

    if currently_missing_risk:
        pcos_status = "You've missed your expected period! Please take the Assessment."
        has_pcos_risk = True
    elif is_irregular:
        pcos_status = "Your cycle is irregular. You may have PCOS symptoms."
        has_pcos_risk = True
    else:
        pcos_status = "You have no PCOS symptoms. Your cycle is normal and proper."
        has_pcos_risk = False

    return {
        "cycles": cycles,
        "average_cycle": float(f"{avg_cycle:.1f}"),
        "cycle_day": int(cycle_day),
        "irregular": is_irregular,
        "next_predicted": next_period_date.strftime("%d %B"),
        "next_predicted_raw": next_period_date.strftime("%Y-%m-%d"),
        "next_period_start": next_period_date.strftime("%Y-%m-%d"),
        "next_period_end": (next_period_date + timedelta(days=5)).strftime("%Y-%m-%d"),
        "ovulation_date": ovulation_date.strftime("%Y-%m-%d"),
        "ovulation_date_display": ovulation_date.strftime("%d %B"),
        "ovulation_window_start": ovulation_start.strftime("%Y-%m-%d"),
        "ovulation_window_end": ovulation_end.strftime("%Y-%m-%d"),
        "next_period_starts": next_period_starts,
        "next_period_ends": next_period_ends,
        "ovulation_window_starts": ovulation_window_starts,
        "ovulation_window_ends": ovulation_window_ends,
        "pcos_symptom_status": pcos_status,
        "has_pcos_risk": has_pcos_risk,
        "historical_dates": historical_dates
    }