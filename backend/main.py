from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import numpy as np
try:
    from .database import (
        predictions_collection,
        users_collection,
        health_records_collection,
        periods_collection,
        pregnancy_records_collection,
        client,
    )
except ImportError:
    from database import (
        predictions_collection,
        users_collection,
        health_records_collection,
        periods_collection,
        pregnancy_records_collection,
        client,
    )
import bcrypt
import jwt
from typing import Optional, List
from datetime import datetime, timedelta
import os
import re

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
model_path = os.path.join(os.path.dirname(__file__), "pcos_model.pkl")
artifact = joblib.load(model_path)
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

class VerifyAccountModel(BaseModel):
    email: str

class ResetPasswordModel(BaseModel):
    email: str
    phone: Optional[str] = None
    new_password: str

class PregnancyAssessmentModel(BaseModel):
    email: Optional[str] = None
    days_late: int = 0
    unprotected_intercourse: bool = False
    symptoms: List[str] = []
    test_result: Optional[str] = "not_taken"
    has_pcos: Optional[bool] = False
    last_period_date: Optional[str] = None

@app.get("/")
def home():
    return {"message": "PCOS API running"}

@app.post("/signup")
def signup(user: SignupModel):
    clean_email = user.email.strip().lower()
    existing_user = users_collection.find_one({"email": {"$regex": f"^{re.escape(clean_email)}$", "$options": "i"}})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    new_user = {
        "name": user.name.strip(),
        "email": clean_email,
        "password": hashed_password,
        "age": user.age,
        "phone": user.phone.strip()
    }
    
    result = users_collection.insert_one(new_user)
    return {"message": "User created successfully", "user_id": str(result.inserted_id)}

@app.post("/login")
def login(user: LoginModel):
    clean_email = user.email.strip().lower()
    db_user = users_collection.find_one({"email": {"$regex": f"^{re.escape(clean_email)}$", "$options": "i"}})
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

@app.post("/verify-reset-email")
def verify_reset_email(data: VerifyAccountModel):
    email = data.email.strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Please provide an email address")
    
    db_user = users_collection.find_one({"email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}})
    if not db_user:
        raise HTTPException(status_code=404, detail="No account registered with this email address")
    
    has_phone = bool(db_user.get("phone"))
    masked_phone = ""
    if has_phone:
        raw_phone = str(db_user.get("phone")).strip()
        if len(raw_phone) >= 4:
            masked_phone = "••••••" + raw_phone[-4:]
        else:
            masked_phone = "••••"
            
    return {
        "exists": True,
        "name": db_user.get("name", "User"),
        "has_phone": has_phone,
        "masked_phone": masked_phone
    }

@app.post("/reset-password")
def reset_password(data: ResetPasswordModel):
    email = data.email.strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
        
    db_user = users_collection.find_one({"email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}})
    if not db_user:
        raise HTTPException(status_code=404, detail="No account found with this email address")
    
    # Check phone number verification if account has a registered phone number
    db_phone = str(db_user.get("phone", "")).strip()
    if db_phone:
        if not data.phone:
            raise HTTPException(status_code=400, detail="Please provide your registered phone number for verification")
        
        # Compare normalized digits
        clean_input = "".join(filter(str.isdigit, data.phone))
        clean_db = "".join(filter(str.isdigit, db_phone))
        if clean_input and clean_db:
            if clean_input != clean_db:
                raise HTTPException(status_code=400, detail="Phone number does not match our records for this account")
        elif data.phone.strip() != db_phone:
            raise HTTPException(status_code=400, detail="Phone number does not match our records for this account")

    if not data.new_password or len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters long")
    
    hashed_password = bcrypt.hashpw(data.new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    users_collection.update_one(
        {"_id": db_user["_id"]},
        {"$set": {"password": hashed_password}}
    )
    
    return {"message": "Password updated successfully"}

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

def calculate_user_cycle_summary(email: str):
    if not email:
        return None
    records = list(periods_collection.find({"email": email}).sort("start_date", 1))
    valid_records = [r for r in records if r.get("start_date")]
    if len(valid_records) < 2:
        if valid_records:
            latest_start = datetime.strptime(valid_records[-1]["start_date"], "%Y-%m-%d")
            days_since = (datetime.now() - latest_start).days
            return {
                "has_enough_data": False,
                "latest_period_start": valid_records[-1]["start_date"],
                "days_since_latest": days_since,
                "average_cycle": 28.0,
                "is_irregular": False,
                "days_overdue": max(0, days_since - 28)
            }
        return None

    cycles = []
    for idx, r in enumerate(valid_records):
        if idx > 0:
            prev = datetime.strptime(valid_records[idx-1]["start_date"], "%Y-%m-%d")
            curr = datetime.strptime(valid_records[idx]["start_date"], "%Y-%m-%d")
            cycle_length = (curr - prev).days
            if cycle_length > 10:
                cycles.append(cycle_length)

    if not cycles:
        return None

    recent_cycles = cycles[-3:] if len(cycles) >= 3 else cycles
    avg_cycle = sum(recent_cycles) / len(recent_cycles)
    latest_start = datetime.strptime(valid_records[-1]["start_date"], "%Y-%m-%d")
    days_since_latest = (datetime.now() - latest_start).days
    days_overdue = max(0, days_since_latest - int(avg_cycle))
    is_irregular = avg_cycle > 35 or avg_cycle < 21 or (days_since_latest > avg_cycle + 10)

    return {
        "has_enough_data": True,
        "latest_period_start": valid_records[-1]["start_date"],
        "days_since_latest": days_since_latest,
        "average_cycle": round(avg_cycle, 1),
        "is_irregular": is_irregular,
        "days_overdue": days_overdue
    }

def get_user_pcos_summary(email: str):
    if not email:
        return None
    latest_record = health_records_collection.find_one({"email": email}, sort=[("_id", -1)])
    if not latest_record:
        return None

    symptoms_found = []
    if latest_record.get("hair_growth"):
        symptoms_found.append("Hirsutism / Facial Hair")
    if latest_record.get("skin_darkening"):
        symptoms_found.append("Skin Darkening")
    if latest_record.get("hair_loss"):
        symptoms_found.append("Hair Loss")
    if latest_record.get("pimples"):
        symptoms_found.append("Acne / Pimples")
    if latest_record.get("weight_gain"):
        symptoms_found.append("Weight Gain")

    return {
        "has_record": True,
        "risk_percentage": float(latest_record.get("risk_percentage", 0)),
        "risk_level": latest_record.get("risk_level", "Unknown"),
        "bmi": latest_record.get("bmi"),
        "cycle_length": latest_record.get("cycle_length"),
        "symptoms": symptoms_found,
        "assessed_date": latest_record.get("date")
    }

@app.post("/pregnancy-assess")
def pregnancy_assess(data: PregnancyAssessmentModel):
    try:
        test = (data.test_result or "").strip().lower()
        basis_factors = []

        # Query database for authentic user history
        cycle_summary = calculate_user_cycle_summary(data.email) if data.email else None
        pcos_summary = get_user_pcos_summary(data.email) if data.email else None

        # Reconcile effective days late from period tracker or form input
        effective_days_late = data.days_late
        if cycle_summary and cycle_summary.get("has_enough_data"):
            # If user has period tracker data, reconcile with tracked overdue days
            tracked_delay = cycle_summary.get("days_overdue", 0)
            if data.days_late <= 0 and tracked_delay > 0:
                effective_days_late = tracked_delay
            elif tracked_delay > 0:
                # Use tracked delay if closely aligned
                effective_days_late = max(data.days_late, tracked_delay)

        # 1. BIOLOGICAL PREREQUISITE: Intercourse Timing
        # Without intercourse during fertile window, conception is biologically impossible (<1%)
        if not data.unprotected_intercourse and test not in ["positive", "faint_positive"]:
            final_probability = 0.5
            likelihood_category = "Extremely Unlikely (< 1%)"
            status_color = "teal"
            basis_factors.append({
                "factor": "Biological Prerequisite",
                "weight": "0%",
                "detail": "No unprotected intercourse during fertile window. Conception is biologically impossible."
            })

            # Check period tracker
            if cycle_summary:
                basis_factors.append({
                    "factor": "Period Tracker Analysis",
                    "weight": "Tracked",
                    "detail": f"Last logged period: {cycle_summary['latest_period_start']}. Average cycle: {cycle_summary['average_cycle']}d. You are on Cycle Day {cycle_summary['days_since_latest']}."
                })

            # Check PCOS assessment
            if pcos_summary:
                basis_factors.append({
                    "factor": "PCOS Assessment Alignment",
                    "weight": f"{pcos_summary['risk_percentage']}% Risk",
                    "detail": f"Assessed as {pcos_summary['risk_level']} PCOS ({pcos_summary['risk_percentage']}%) with symptoms: {', '.join(pcos_summary['symptoms']) or 'None logged'}. This confirms your missed period is caused by anovulation."
                })
            else:
                basis_factors.append({
                    "factor": "Cycle Delay Cause",
                    "weight": "PCOS / Anovulation",
                    "detail": "Your missed or delayed period is attributed to delayed ovulation or PCOS hormonal fluctuations."
                })

            pcos_vs_pregnancy = [
                "Because you had no unprotected intercourse during your fertile window, pregnancy is ruled out.",
                "Your delayed period and any symptoms (cramping, breast soreness, fatigue) are characteristic of delayed ovulation (anovulation) caused by PCOS or stress."
            ]
            recommendations = [
                "Continue logging your cycle on the Period Tracker to monitor when ovulation and menstruation resume.",
                "If your period is delayed by more than 45–60 days, consult your gynecologist to induce withdrawal bleeding with progesterone.",
                "Focus on stress reduction, balanced blood sugar, and PCOS lifestyle management."
            ]
        else:
            # 2. IF HOME TEST IS POSITIVE:
            if test == "positive":
                final_probability = 99.0
                likelihood_category = "High Likelihood (Confirmed by Test)"
                status_color = "rose"
                basis_factors.append({
                    "factor": "Diagnostic Test",
                    "weight": "+99%",
                    "detail": "Positive urine hCG test. Clinical accuracy of modern home tests after a missed period exceeds 99%."
                })
            elif test == "faint_positive":
                final_probability = 92.0
                likelihood_category = "Probable Positive"
                status_color = "rose"
                basis_factors.append({
                    "factor": "Diagnostic Test",
                    "weight": "+92%",
                    "detail": "Faint positive line observed within reading window, typical of early hCG secretion."
                })
            else:
                # 3. STATISTICAL OBSTETRIC FECUNDABILITY MODEL INTEGRATING PERIOD TRACKER & PCOS DATA
                base_score = 25.0
                basis_factors.append({
                    "factor": "Fertile Window Exposure",
                    "weight": "25% Base",
                    "detail": "Per published reproductive fecundability models (Wilcox et al. NEJM), peak single-cycle conception probability is 25–30%."
                })

                # A. PERIOD TRACKER INTEGRATION
                delay_pts = 0.0
                if effective_days_late >= 14:
                    delay_pts = 35.0
                    delay_desc = f"Period {effective_days_late}+ days overdue (+35%)"
                elif effective_days_late >= 7:
                    delay_pts = 25.0
                    delay_desc = f"Period {effective_days_late} days overdue (+25%)"
                elif effective_days_late >= 3:
                    delay_pts = 15.0
                    delay_desc = f"Period {effective_days_late} days overdue (+15%)"
                elif effective_days_late >= 1:
                    delay_pts = 8.0
                    delay_desc = f"Period {effective_days_late} days overdue (+8%)"
                else:
                    delay_desc = "Period not yet overdue (0%)"

                if delay_pts > 0:
                    detail_text = f"{delay_desc}. Amenorrhea after fertile window intercourse is a primary clinical indicator of conception."
                    if cycle_summary:
                        detail_text += f" (Verified via Period Tracker: average cycle {cycle_summary['average_cycle']}d, Cycle Day {cycle_summary['days_since_latest']})."
                    basis_factors.append({
                        "factor": "Period Tracker Delay Analysis",
                        "weight": f"+{int(delay_pts)}%",
                        "detail": detail_text
                    })

                # B. PCOS ASSESSMENT INTEGRATION
                pcos_adjustment = 0.0
                if pcos_summary and pcos_summary.get("has_record"):
                    risk_pct = pcos_summary["risk_percentage"]
                    risk_lvl = pcos_summary["risk_level"]
                    syms = pcos_summary["symptoms"]

                    if risk_pct >= 60.0:
                        # High PCOS risk significantly increases the probability that missed period is anovulatory
                        pcos_adjustment = -12.0
                        basis_factors.append({
                            "factor": "PCOS Assessment Sync (High Risk)",
                            "weight": "-12%",
                            "detail": f"Assessment confirms {risk_lvl} PCOS ({risk_pct}%) with symptoms ({', '.join(syms) or 'hyperandrogenism'}). Chronic anovulation is a strong alternative cause for cycle delay."
                        })
                    elif risk_pct >= 35.0:
                        pcos_adjustment = -6.0
                        basis_factors.append({
                            "factor": "PCOS Assessment Sync (Moderate Risk)",
                            "weight": "-6%",
                            "detail": f"Moderate PCOS risk ({risk_pct}%). Accounts for mild ovulatory irregularities."
                        })
                    else:
                        # Low PCOS risk: user has normal ovulatory cycles, making pregnancy much more likely when period is missed
                        pcos_adjustment = 6.0
                        basis_factors.append({
                            "factor": "PCOS Assessment Sync (Low Risk)",
                            "weight": "+6%",
                            "detail": f"Low PCOS risk ({risk_pct}%). Anovulatory delays are rare in your baseline; missed period is clinically more concerning for conception."
                        })
                elif data.has_pcos:
                    pcos_adjustment = -8.0
                    basis_factors.append({
                        "factor": "PCOS History Adjustment",
                        "weight": "-8%",
                        "detail": "Accounts for chronic oligomenorrhea/anovulation common in PCOS."
                    })

                # C. EARLY CLINICAL SYMPTOMS INTEGRATION
                symptom_pts = 0.0
                symptom_names = []
                symptom_weights = {
                    "spotting_implantation": (12.0, "Implantation Spotting"),
                    "breast_tenderness": (8.0, "Breast Swelling/Tenderness"),
                    "nausea": (8.0, "Morning Sickness / Nausea"),
                    "frequent_urination": (4.0, "Frequent Urination"),
                    "fatigue": (3.0, "Early Fatigue"),
                    "food_aversions": (4.0, "Food Aversion / Heightened Smell"),
                    "elevated_bbt": (6.0, "Sustained Elevated Basal Temp"),
                }

                for sym in data.symptoms:
                    if sym in symptom_weights:
                        pts, name = symptom_weights[sym]
                        symptom_pts += pts
                        symptom_names.append(name)

                symptom_pts = min(symptom_pts, 30.0)
                if symptom_pts > 0:
                    basis_factors.append({
                        "factor": "Clinical Symptom Profile",
                        "weight": f"+{int(symptom_pts)}%",
                        "detail": f"Recognized early signs: {', '.join(symptom_names)}."
                    })

                raw_score = base_score + delay_pts + symptom_pts + pcos_adjustment

                # D. TEST ADJUSTMENT
                if test == "negative":
                    if effective_days_late <= 3:
                        raw_score = min(raw_score * 0.35, 20.0)
                        basis_factors.append({
                            "factor": "Negative Urine Test (Early)",
                            "weight": "-65%",
                            "detail": "Negative test taken ≤3 days late. Urine hCG may still be below test detection threshold (~25 mIU/mL)."
                        })
                    else:
                        raw_score = min(raw_score * 0.12, 8.0)
                        basis_factors.append({
                            "factor": "Negative Urine Test (Confirmed)",
                            "weight": "-88%",
                            "detail": "Negative test taken >3 days late has high negative predictive value (>95%)."
                        })

                final_probability = float(min(95.0, max(2.0, raw_score)))

                if final_probability >= 70.0:
                    likelihood_category = "High Likelihood"
                    status_color = "rose"
                elif final_probability >= 30.0:
                    likelihood_category = "Moderate Likelihood"
                    status_color = "amber"
                else:
                    likelihood_category = "Low Likelihood"
                    status_color = "teal"

            # Differential Insight
            pcos_vs_pregnancy = []
            if pcos_summary and pcos_summary.get("has_record"):
                pcos_vs_pregnancy.append(
                    f"Your PCOS Assessment indicates a {pcos_summary['risk_percentage']}% ({pcos_summary['risk_level']}) risk with symptoms ({', '.join(pcos_summary['symptoms']) or 'hormonal imbalance'}). "
                    "In PCOS, delayed periods are frequently caused by delayed ovulation (anovulation). However, because unprotected intercourse occurred during your fertile window, early conception cannot be excluded until confirmed by a test."
                )
            elif data.has_pcos:
                pcos_vs_pregnancy.append(
                    "With PCOS, delayed periods are frequently caused by lack of ovulation rather than pregnancy. "
                    "However, because unprotected intercourse occurred during your fertile window, early conception cannot be excluded until confirmed by a test."
                )
            else:
                pcos_vs_pregnancy.append(
                    "Unprotected intercourse during the fertile window followed by a missed period strongly indicates potential conception."
                )

            if "spotting_implantation" in data.symptoms:
                pcos_vs_pregnancy.append(
                    "Light pink/brown spotting around 6–12 days post-ovulation often signifies blastocyst implantation."
                )
            if "nausea" in data.symptoms or "breast_tenderness" in data.symptoms:
                pcos_vs_pregnancy.append(
                    "Breast tenderness and morning sickness are driven by rising beta-hCG and progesterone."
                )

            recommendations = []
            if test in ["positive", "faint_positive"]:
                recommendations.append("Schedule an appointment with an OB-GYN for a confirmatory serum beta-hCG blood test and early dating ultrasound.")
                recommendations.append("Begin taking a prenatal vitamin with at least 400 mcg of folic acid if you haven't already.")
            elif effective_days_late >= 1:
                recommendations.append("Take a home urine hCG test using your first-morning urine, which contains the highest concentration of pregnancy hormone.")
                recommendations.append("If the test is negative but your period does not arrive within 5–7 days, repeat the test or consult your doctor.")
            else:
                recommendations.append("It may be too early for a reliable home urine test. Wait until the first day of your missed period for maximum test accuracy.")

        result_record = {
            "email": data.email,
            "days_late": effective_days_late,
            "unprotected_intercourse": data.unprotected_intercourse,
            "symptoms": data.symptoms,
            "test_result": data.test_result,
            "has_pcos": data.has_pcos,
            "probability": round(final_probability, 1),
            "likelihood_category": likelihood_category,
            "status_color": status_color,
            "basis_factors": basis_factors,
            "pcos_vs_pregnancy": " ".join(pcos_vs_pregnancy),
            "recommendations": recommendations,
            "cycle_tracker_data": cycle_summary,
            "pcos_assessment_data": pcos_summary,
            "assessed_at": datetime.now().strftime("%d %b %Y, %I:%M %p"),
            "logged_timestamp": datetime.utcnow()
        }

        if data.email:
            pregnancy_records_collection.insert_one(result_record)

        if "_id" in result_record:
            result_record.pop("_id")

        return result_record
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/pregnancy-history/{email}")
def get_pregnancy_history(email: str):
    cursor = pregnancy_records_collection.find(
        {"email": email},
        {"_id": 0, "logged_timestamp": 0}
    ).sort("logged_timestamp", -1).limit(10)
    return {"history": list(cursor)}


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
                user_info = data.get("user", {}) if isinstance(data, dict) else {}
                user_name = user_info.get("name") if user_info else None
                user_email = user_info.get("email") if user_info else None

                if cycle_aware:
                    
                    context_str = ""
                    user_account_context = ""
                    if user_name or user_email:
                        account_lines = []
                        if user_name:
                            account_lines.append(f"User name: {user_name}")
                        if user_email:
                            account_lines.append(f"User email: {user_email}")
                        user_account_context = (
                            "\n\n[USER ACCOUNT CONTEXT]\n" + "\n".join(account_lines) +
                            "\n\n"
                        )
                    if cycle_data and not cycle_data.get("message") and cycle_data.get("historical_dates"):
                        historical_dates = cycle_data.get("historical_dates", [])
                        last_period_date = historical_dates[-1] if historical_dates else "None"
                        next_predicted_raw = cycle_data.get("next_predicted_raw", cycle_data.get("next_predicted", "None"))
                        next_predicted_display = cycle_data.get("next_predicted", next_predicted_raw)
                        ovulation_display = cycle_data.get("ovulation_date_display", cycle_data.get("ovulation_date", "None"))
                        avg_cycle = cycle_data.get("average_cycle", "Unknown")
                        cycle_day = cycle_data.get("cycle_day", "Unknown")
                        next_period_starts = cycle_data.get("next_period_starts", [])
                        # Format up to 3 upcoming predicted dates for context
                        upcoming_dates = ", ".join(next_period_starts[:3]) if next_period_starts else "None"

                        context_str = (
                            f"\n\n[USER ACCOUNT CONTEXT]\n{user_account_context}" if user_account_context else ""
                        ) + (
                            f"\n\n[USER'S CYCLE DATA - USE THIS TO ANSWER DATE QUESTIONS]\n"
                            f"• Last logged period date: {last_period_date}\n"
                            f"• All historical logged dates: {', '.join(historical_dates[-5:]) if historical_dates else 'None'}\n"
                            f"• Next predicted period: {next_predicted_display} (exact: {next_predicted_raw})\n"
                            f"• Upcoming predicted period dates: {upcoming_dates}\n"
                            f"• Ovulation window: around {ovulation_display}\n"
                            f"• Average cycle length: {avg_cycle} days\n"
                            f"• Current cycle day: {cycle_day}\n\n"
                            f"CRITICAL INSTRUCTION: If the user asks 'what is my next period date', 'when is my next period', "
                            f"'tell me my predicted period date', or anything similar — you MUST explicitly state: "
                            f"'Your next predicted period is on {next_predicted_display}.' "
                            f"If they ask 'what was my last period date' or 'previous period date' — explicitly say: "
                            f"'Your last logged period date was {last_period_date}.' "
                            f"Always answer date questions using ONLY the data above, never guess or make up dates."
                        )
                    else:
                        context_str = (
                            f"\n\n[USER ACCOUNT CONTEXT]\n{user_account_context}\n"
                            if user_account_context
                            else ""
                        ) + (
                            "\n\n[USER'S CYCLE CONTEXT]\n"
                            "The user has NOT logged enough period dates yet.\n"
                            "WARNING INSTRUCTION: If the user asks about their cycle or dates, warmly tell them you cannot find their dates because they haven't logged periods yet. "
                            "Encourage them to log at least 2 periods on the Period Tracker calendar to enable predictions."
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

    next_period_date = future_periods[0]
    ovulation_date = future_ovulations[0]

    # Dynamically find the TRUE next upcoming period (skipping ones in the past if user stopped logging)
    today_date = datetime.now()
    for i in range(len(future_periods)):
        if future_periods[i] >= today_date - timedelta(days=5):
            next_period_date = future_periods[i]
            ovulation_date = future_ovulations[i]
            break

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