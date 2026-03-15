from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import joblib
import numpy as np
from database import predictions_collection

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = joblib.load("pcos_model.pkl")

@app.get("/")
def home():
    return {"message": "PCOS API running"}

@app.post("/predict")
def predict(data: dict):
    try:
        features = np.array([list(data.values())])

        prediction = model.predict(features)[0]
        probability = model.predict_proba(features)[0][1]

        result = {
            "inputs": data,
            "prediction": int(prediction),
            "risk_percentage": float(probability * 100)
        }

        # save to database
        predictions_collection.insert_one(result)

        # remove the MongoDB object _id before returning the result
        if "_id" in result:
            result.pop("_id")

        return result
    except ValueError as e:
        return {"error": "Prediction failed! Make sure you are passing the correct number of features.", "details": str(e)}
    except Exception as e:
        return {"error": "An error occurred during prediction.", "details": str(e)}