import json
import os
import re

DATA_DIR = r"c:\VirtualDoctor\backend\data"
EN_PATH = os.path.join(DATA_DIR, "diseases.json")
MM_PATH = os.path.join(DATA_DIR, "diseases_mm.json")
MEDS_MM_PATH = os.path.join(DATA_DIR, "medicines_mm.json")

# 1. Comprehensive Medical Translation Dictionary
DICT = {
    "fever": "ဖျားခြင်း",
    "cough": "ချောင်းဆိုးခြင်း",
    "headache": "ခေါင်းကိုက်ခြင်း",
    "nausea": "ပျို့ခြင်း",
    "vomiting": "အော့အန်ခြင်း",
    "diarrhea": "ဝမ်းလျှောခြင်း",
    "fatigue": "နုံးခွေခြင်း",
    "dizziness": "မူးဝေခြင်း",
    "rash": "အဖုအပိမ့်ထွက်ခြင်း",
    "itching": "ယားယံခြင်း",
    "pain": "နာကျင်ခြင်း",
    "shortness of breath": "အသက်ရှူရခက်ခဲခြင်း",
    "sore throat": "လည်ချောင်းနာခြင်း",
    "sneezing": "နှာချေခြင်း",
    "runny nose": "နှာစေးခြင်း",
    "constipation": "ဝမ်းချုပ်ခြင်း",
    "stomach pain": "ဗိုက်နာခြင်း",
    "chest pain": "ရင်ဘတ်အောင့်ခြင်း",
    "joint pain": "အဆစ်အမြစ်နာခြင်း",
    "muscle aches": "ကြွက်သားနာကျင်ခြင်း",
    "back pain": "ခါးနာခြင်း",
    "rest": "နားနားနေနေနေပါ",
    "drink plenty of fluids": "ရေများများသောက်ပါ",
    "wash hands": "လက်ဆေးပါ",
    "consult a doctor": "ဆရာဝန်နှင့် တိုင်ပင်ပါ",
    "medication": "ဆေးဝါး",
    "treatment": "ကုသမှု",
    "prevention": "ကာကွယ်ခြင်း",
    "condition characterized by": "လက္ခဏာများမှာ",
    "follow recommended health guidelines": "ကျန်းမာရေးဆိုင်ရာ လမ်းညွှန်ချက်များကို လိုက်နာပါ",
    "seek medical advice": "ဆရာဝန်နှင့် တိုင်ပင်ပါ",
    "supportive care": "အထောက်အကူပြုဂရုစိုက်မှု",
    "hydration": "ရေဓာတ်ဖြည့်တင်းခြင်း",
    "pain relievers": "အကိုက်အခဲပျောက်ဆေးများ",
    "antibiotics": "ပဋိဇီဝဆေးများ",
    "hospitalization": "ဆေးရုံတက်ရန်လိုအပ်ခြင်း",
    "surgery": "ခွဲစိတ်ကုသခြင်း",
}

# 2. Extract medications from recommendation string
# Common medicine names to look for
MED_KEYWORDS = [
    "Paracetamol", "Amoxicillin", "Ibuprofen", "Cetirizine", "Metformin", 
    "Omeprazole", "Azithromycin", "Decolgen", "Burmeton", "ORS", 
    "Oseltamivir", "Mebendazole", "Albendazole", "Amlodipine", "Losartan",
    "Enalapril", "Insulin", "Gaviscon", "Loperamide", "Domperidone"
]

def extract_meds(recommendation, existing_meds):
    if existing_meds:
        return existing_meds
    
    found = []
    for kw in MED_KEYWORDS:
        if kw.lower() in recommendation.lower():
            found.append(kw)
    return found

# 3. Load medicines_mm.json for mapping
with open(MEDS_MM_PATH, "r", encoding="utf-8") as f:
    meds_mm_data = json.load(f)

MED_MAP = {}
for m in meds_mm_data:
    full_name = m["name"]
    match = re.search(r'\((.*?)\)', full_name)
    if match:
        en_name = match.group(1).lower().strip()
        MED_MAP[en_name] = full_name

def map_med_to_mm(med):
    return MED_MAP.get(med.lower(), med)

def translate(text):
    if not text: return text
    if not isinstance(text, str): return text
    
    text_lower = text.lower().strip()
    
    # Try direct mapping
    if text_lower in DICT:
        return DICT[text_lower]
    
    # Try replacing keywords
    result = text_lower
    sorted_keys = sorted(DICT.keys(), key=len, reverse=True)
    for en in sorted_keys:
        if en in result:
            result = result.replace(en, DICT[en])
            
    # If it's still mostly English, try to clean it
    mm_chars = len(re.findall(r'[\u1000-\u109F]', result))
    if mm_chars > 0:
        # Remove leftover English words and messy punctuation
        result = re.sub(r'[a-zA-Z]+', '', result).strip()
        result = re.sub(r'\s+', ' ', result)
        result = result.strip(',. ')
        if result:
            return result
            
    return text

def run():
    with open(EN_PATH, "r", encoding="utf-8") as f:
        en_data = json.load(f)
    
    mm_data = []
    for d in en_data:
        recommendation = d.get("recommendation", "")
        medications = d.get("medications", [])
        
        # Enrich medications
        final_meds_en = extract_meds(recommendation, medications)
        final_meds_mm = [map_med_to_mm(m) for m in final_meds_en]
        
        mm_entry = {
            "name": translate(d.get("name", "")),
            "description": translate(d.get("description", "")),
            "symptoms": [translate(s) for s in d.get("symptoms", [])],
            "precautions": [translate(p) for p in d.get("precautions", [])],
            "recommendation": translate(recommendation),
            "medications": final_meds_mm
        }
        
        # Cleanup recommendation if it failed translation badly
        if not re.search(r'[\u1000-\u109F]', mm_entry["recommendation"]):
            mm_entry["recommendation"] = "ဆရာဝန်နှင့် တိုင်ပင်ဆွေးနွေးပြီး လိုအပ်သော ဆေးဝါးများကို သောက်သုံးပါ။"
            
        mm_data.append(mm_entry)
        
    with open(MM_PATH, "w", encoding="utf-8") as f:
        json.dump(mm_data, f, ensure_ascii=False, indent=2)
        
    print(f"Successfully rebuilt {len(mm_data)} entries in diseases_mm.json with medications and recommendations.")

if __name__ == "__main__":
    run()
