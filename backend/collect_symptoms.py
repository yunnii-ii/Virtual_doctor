
import json
import os

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

with open(os.path.join(DATA_DIR, "diseases.json"), "r", encoding='utf-8') as f:
    diseases = json.load(f)

all_symptoms = set()
for disease in diseases:
    symptoms = disease.get("symptoms", [])
    for symptom in symptoms:
        all_symptoms.add(symptom.strip().lower())

print("All unique symptoms from diseases.json:")
for symptom in sorted(all_symptoms):
    print(f"- {symptom}")
