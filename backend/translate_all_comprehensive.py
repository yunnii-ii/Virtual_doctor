import json, re, sys

# Master Medical Myanmar Dictionary
COMPREHENSIVE_DICT = {
    # Diseases
    "abdominal injury": "ဝမ်းဗိုက် ထိခိုက်ဒဏ်ရာရခြင်း (Abdominal Injury)",
    "head injury": "ဦးခေါင်း ထိခိုက်ဒဏ်ရာရခြင်း (Head Injury)",
    "chest injury": "ရင်ဘတ် ထိခိုက်ဒဏ်ရာရခြင်း (Chest Injury)",
    "burns": "မီးလောင်ဒဏ်ရာ (Burns)",
    "food poisoning": "အစာအဆိပ်သင့်ခြင်း (Food Poisoning)",
    "heat stroke": "အပူလျှပ်ခြင်း (Heat Stroke)",
    "hypothermia": "ခန္ဓာကိုယ်အပူချိန် လွန်ကဲစွာကျဆင်းခြင်း (Hypothermia)",
    "dehydration": "ရေဓာတ်ခန်းခြောက်ခြင်း (Dehydration)",
    "sunburn": "နေလောင်ဒဏ်ရာ (Sunburn)",
    "sepsis": "သွေးဆိပ်တက်ခြင်း (Sepsis)",
    "shock": "ရှော့ခ်ဖြစ်ခြင်း (Shock)",
    "anaphylaxis": "ပြင်းထန်သော ဓာတ်မတည့်ရှော့ခ်ဖြစ်ခြင်း (Anaphylaxis)",
    "meningitis": "ဦးနှောက်မြှေးရောင်ရောဂါ (Meningitis)",
    "encephalitis": "ဦးနှောက်ရောင်ရောဂါ (Encephalitis)",
    "tetanus": "မေးခိုင်ရောဂါ (Tetanus)",
    "rabies": "ခွေးရူးပြန်ရောဂါ (Rabies)",
    "malaria": "ငှက်ဖျားရောဂါ (Malaria)",
    "dengue fever": "သွေးလွန်တုပ်ကွေးရောဂါ (Dengue Fever)",
    "typhoid fever": "အူရောင်ငန်းဖျားရောဂါ (Typhoid Fever)",
    "cholera": "ကာလဝမ်းရောဂါ (Cholera)",
    
    # Clinical Actions & Procedures
    "x-ray": "ဓာတ်မှန်ရိုက်ကူးခြင်း",
    "ct scan": "ကွန်ပျူတာဓာတ်မှန် ရိုက်ကူးခြင်း",
    "mri": "သံလိုက်ဓာတ်မှန် ရိုက်ကူးခြင်း",
    "ultrasound": "အာထရာဆောင်း ရိုက်ကူးစစ်ဆေးခြင်း",
    "stabilization of vital signs": "အသက်ရှူနှုန်းနှင့် သွေးပေါင်ချိန် တည်ငြိမ်အောင် ထိန်းသိမ်းခြင်း",
    "pain management": "အကိုက်အခဲ သက်သာစေရန် ကုသပေးခြင်း",
    "observation for signs of internal bleeding": "ခန္ဓာကိုယ်တွင်း သွေးယိုစိမ့်မှု လက္ခဏာများကို စောင့်ကြည့်ခြင်း",
    "potential surgical intervention": "လိုအပ်ပါက ခွဲစိတ်ကုသခြင်း",
    "potential surgery": "လိုအပ်ပါက ခွဲစိတ်ကုသခြင်း",
    "potential ခွဲစိတ်ကုသခြင်း": "လိုအပ်ပါက ခွဲစိတ်ကုသခြင်း",
    "wound care": "ဒဏ်ရာကို စနစ်တကျ သန့်စင်ဆေးကြော ကုသခြင်း",
    "blood transfusion": "သွေးသွင်းကုသခြင်း",
    "oxygen therapy": "အောက်ဆီဂျင် ပေးခြင်း",
    "intravenous fluids": "အကြောဆေးရည်/ဆားရည် သွင်းခြင်း",
    "iv fluids": "အကြောဆေးရည်/ဆားရည် သွင်းခြင်း",
    "monitoring": "အနီးကပ် စောင့်ကြည့်စစ်ဆေးခြင်း",
    "hospitalization": "ဆေးရုံတက်ရောက် ကုသမှုခံယူခြင်း",
    "isolation": "ရောဂါမကူးစက်စေရန် သီးသန့်ခွဲနေထိုင်ခြင်း",
    "antibiotic therapy": "ပဋိဇီဝ ပိုးသတ်ဆေးဖြင့် ကုသခြင်း",
    "antiviral therapy": "ဗိုင်းရပ်စ်သတ်ဆေးဖြင့် ကုသခြင်း",
    "surgical removal": "ခွဲစိတ်ဖယ်ရှားခြင်း",
    "radiation therapy": "ဓာတ်ရောင်ခြည် ကုထုံးခံယူခြင်း",
    "chemotherapy": "ကင်ဆာဆေးသွင်း ကုသခြင်း",
    "dialysis": "ကျောက်ကပ်ဆေးခြင်း",
    "bed rest": "အိပ်ရာထဲတွင် ကောင်းစွာ အနားယူခြင်း",
    "physical therapy": "ကာယကုထုံး ခံယူခြင်း",
    "speech therapy": "စကားပြောကုထုံး ခံယူခြင်း",
    "occupational therapy": "အလုပ်အကိုင် အထောက်အကူပြု ကုထုံးခံယူခြင်း",
    "counseling": "စိတ်ပိုင်းဆိုင်ရာ ဆွေးနွေးနှစ်သိမ့်မှု ခံယူခြင်း",
    "psychotherapy": "စိတ်ကုထုံး ခံယူခြင်း",
    "lifestyle changes": "နေထိုင်မှုပုံစံ ပြုပြင်ပြောင်းလဲခြင်း",
    "dietary changes": "အစားအသောက် စားသောက်မှုပုံစံ ပြင်ဆင်ခြင်း",
    "weight management": "ကိုယ်အလေးချိန် ထိန်းညှိခြင်း",
    "smoking cessation": "ဆေးလိပ်ဖြတ်ခြင်း",
    "alcohol cessation": "အရက်ဖြတ်ခြင်း",
    "stress reduction": "စိတ်ဖိစီးမှု လျှော့ချခြင်း",
    "hydration": "ရေနှင့် အရည်များများ သောက်သုံးခြင်း",
    "adequate hydration": "ရေလုံလောက်စွာ သောက်သုံးခြင်း",
    "fluid replacement": "ဆုံးရှုံးသွားသော ရေဓာတ်နှင့် ဓာတ်ဆား ပြန်လည်ဖြည့်တင်းခြင်း",
    "rest": "လုံလောက်စွာ အနားယူခြင်း",
    "ice packs": "ရေခဲကပ်ပေးခြင်း",
    "warm compress": "ရေနွေးဝတ် ကပ်ပေးခြင်း",
    "elevation of affected area": "ထိခိုက်သောနေရာကို မြှင့်ထားခြင်း",
    "splinting": "ကျောက်ပတ်တီး/ဒိုင်း ထိန်းချုပ်ပေးခြင်း",
    "cast application": "ကျောက်ပတ်တီး စည်းခြင်း",
    "compression bandage": "ပတ်တီးတင်းတင်း စည်းပေးခြင်း",
    "gentle exercise": "ပေါ့ပေါ့ပါးပါး ကိုယ်လက်လှုပ်ရှားခြင်း",
    "stretching": "အကြောလျှော့ လေ့ကျင့်ခန်း ပြုလုပ်ခြင်း",
}

# Myanmar Symptom Colloquial normalizer (for mapping user inputs to symptoms)
MYANMAR_COLLOQUIAL_MAP = {
    # Back pain / Spine
    "နောက်ကျောအောင့်": "back pain",
    "နောက်ကျောနာ": "back pain",
    "ခါးနာ": "back pain",
    "ခါးကိုက်": "back pain",
    "ခါးအောင့်": "back pain",
    "ကျောအောင့်": "back pain",
    "ကျောနာ": "back pain",
    
    # Body ache / Muscle ache
    "ကိုယ်လက်ကိုက်": "muscle aches",
    "ကိုယ်လက်နာ": "muscle aches",
    "တစ်ကိုယ်လုံးကိုက်": "muscle aches",
    "ကြွက်သားနာ": "muscle aches",
    "ကြွက်သားကိုက်": "muscle aches",
    "အကြောတက်": "muscle aches",
    
    # Fever
    "ဖျား": "fever",
    "ကိုယ်ပူ": "fever",
    "အဖျားကြီး": "fever",
    "ချမ်းတုန်": "chills",
    
    # Headache
    "ခေါင်းကိုက်": "headache",
    "ခေါင်းခဲ": "headache",
    "ခေါင်းအုံ": "headache",
    "ဇက်ကိုက်": "headache",
    
    # Cough / Cold
    "ချောင်းဆိုး": "cough",
    "သလိပ်ထွက်": "cough",
    "နှာစေး": "runny nose",
    "နှာပိတ်": "nasal congestion",
    "နှာချေ": "sneezing",
    "လည်ချောင်းနာ": "sore throat",
    "ရင်ကြပ်": "shortness of breath",
    "မော": "shortness of breath",
    
    # Stomach / Digestion
    "ဗိုက်အောင့်": "abdominal pain",
    "ဗိုက်နာ": "abdominal pain",
    "ဝမ်းဗိုက်နာ": "abdominal pain",
    "ရင်ပူ": "heartburn",
    "အစာမကြေ": "indigestion",
    "လေပွ": "bloating",
    "လေထိုး": "bloating",
    "ဝမ်းလျှော": "diarrhea",
    "ဝမ်းသွား": "diarrhea",
    "ဝမ်းချုပ်": "constipation",
    "ပျို့": "nausea",
    "အန်": "vomiting",
    
    # Dizziness / Fatigue
    "ခေါင်းမူး": "dizziness",
    "မူးဝေ": "dizziness",
    "ချာချာလည်": "vertigo",
    "မောပန်း": "fatigue",
    "နုံး": "fatigue",
    "အားမရှိ": "weakness",
    
    # Joint
    "အဆစ်အမြစ်ကိုက်": "joint pain",
    "ဒူးနာ": "joint pain",
    "လက်ကောက်ဝတ်နာ": "joint pain",
}

with open('data/diseases_mm.json', 'r', encoding='utf-8') as f:
    diseases = json.load(f)

for d in diseases:
    # 1. Clean Title
    name = d.get('name', '')
    name_clean = name.replace(' ရောဂါ', '').strip().lower()
    if name_clean in COMPREHENSIVE_DICT:
        d['name'] = COMPREHENSIVE_DICT[name_clean]
    elif ' (' not in name and re.search(r'^[A-Za-z\s\-\,\.\'\&]+$', name.replace(' ရောဂါ', '')):
        raw_eng = name.replace(' ရောဂါ', '').strip()
        d['name'] = f"{raw_eng} ရောဂါ"

    # 2. Clean Recommendation
    rec = d.get('recommendation', '')
    for k, v in COMPREHENSIVE_DICT.items():
        rec = re.sub(r'\b' + re.escape(k) + r'\b', v, rec, flags=re.IGNORECASE)
    
    # Additional common clinical phrase regex
    rec = re.sub(r'\bemergency medical attention\b', 'အရေးပေါ် ဆေးကုသမှု ချက်ချင်းခံယူပါ', rec, flags=re.IGNORECASE)
    rec = re.sub(r'\bimaging tests\b', 'ဓာတ်မှန်နှင့် ပုံရိပ်ဖော် စစ်ဆေးမှုများ ပြုလုပ်ခြင်း', rec, flags=re.IGNORECASE)
    rec = re.sub(r'\bsurgical intervention\b', 'ခွဲစိတ်ကုသမှု ခံယူခြင်း', rec, flags=re.IGNORECASE)
    rec = re.sub(r'\bclose monitoring\b', 'အနီးကပ် စောင့်ကြည့်စစ်ဆေးခြင်း', rec, flags=re.IGNORECASE)
    rec = re.sub(r'\bconsult a doctor\b', 'ဆရာဝန်နှင့် ပြသတိုင်ပင်ပါ', rec, flags=re.IGNORECASE)
    
    # Clean up formatting
    rec = re.sub(r',\s*,', ',', rec)
    rec = re.sub(r'\s{2,}', ' ', rec).strip()
    d['recommendation'] = rec

    # 3. Clean Description
    symptoms_str = "၊ ".join(d.get('symptoms', [])[:4])
    d['description'] = f"{d['name']} သည် {symptoms_str} စသည့် လက္ခဏာများ ဖြစ်ပွားတတ်သော ရောဂါအခြေအနေ ဖြစ်ပါသည်။"

with open('data/diseases_mm.json', 'w', encoding='utf-8') as f:
    json.dump(diseases, f, ensure_ascii=False, indent=2)

print("Comprehensive translation of diseases_mm.json complete!")
