import json, re, sys

# Comprehensive English to Medical Myanmar Glossary
TRANSLATION_MAP = {
    # Pregnancy & Women's Health
    "pregnancy-related back pain": "ကိုယ်ဝန်ဆောင်ချိန် ခါးနာခြင်း (Pregnancy-Related Back Pain)",
    "pregnancy-induced hypertension": "ကိုယ်ဝန်ဆောင် သွေးတိုးရောဂါ (Pregnancy-Induced Hypertension)",
    "gestational diabetes": "ကိုယ်ဝန်ဆောင် ဆီးချိုရောဂါ (Gestational Diabetes)",
    "ectopic pregnancy": "သားအိမ်ပြင်ပ ကိုယ်ဝန်တည်ခြင်း (Ectopic Pregnancy)",
    "threatened pregnancy": "ကိုယ်ဝန်ပျက်ကျနိုင်ခြေရှိခြင်း (Threatened Abortion)",
    "hyperemesis gravidarum": "ကိုယ်ဝန်ဆောင် အလွန်အမင်း ပျို့အန်ခြင်း (Hyperemesis Gravidarum)",
    "preeclampsia": "ကိုယ်ဝန်ဆိပ်တက်ခြင်း (Preeclampsia)",
    "eclampsia": "ကိုယ်ဝန်ဆိပ်တက် တက်ခြင်း (Eclampsia)",
    "postpartum depression": "မီးဖွားပြီး စိတ်ကျရောဂါ (Postpartum Depression)",
    "pelvic inflammatory disease": "တင်ပါးဆုံတွင်း အင်္ဂါများ ရောင်ရမ်းခြင်း (PID)",
    "polycystic ovary syndrome": "သားဥအိမ် အရည်အိတ်တည်ရောဂါ (PCOS)",
    "endometriosis": "သားအိမ်အတွင်းသား အပြင်ရောက်ရောဂါ (Endometriosis)",
    "uterine fibroids": "သားအိမ်အကျိတ်ရောဂါ (Uterine Fibroids)",
    "bacterial vaginosis": "ဘက်တီးရီးယား မိန်းမကိုယ်ရောင်ခြင်း (Bacterial Vaginosis)",
    "vaginal yeast infection": "မှိုကြောင့် မိန်းမကိုယ်ရောင်ခြင်း (Vaginal Candidiasis)",
    "dysmenorrhea": "ရာသီလာစဉ် ကိုက်ခဲခြင်း (Dysmenorrhea)",
    "menopause": "သွေးဆုံးကိုင်ခြင်း လက္ခဏာများ (Menopause)",
    
    # Common Symptoms
    "discomfort in the pelvic area": "တင်ပါးဆုံရိုး ဧရိယာ မအီမသာဖြစ်ခြင်း",
    "vaginal bleeding": "မိန်းမကိုယ် သွေးဆင်းခြင်း",
    "abdominal cramps": "ဝမ်းဗိုက် ကြွက်တက်အောင့်ခြင်း",
    "high blood sugar levels during pregnancy": "ကိုယ်ဝန်ဆောင်ချိန် သွေးတွင်းသကြားဓာတ် မြင့်တက်ခြင်း",
    "high blood pressure during pregnancy": "ကိုယ်ဝန်ဆောင်ချိန် သွေးတိုးခြင်း",
    "severe nausea and vomiting during pregnancy": "ကိုယ်ဝန်ဆောင်ချိန် ပြင်းထန်စွာ ပျို့အန်ခြင်း",
    "pelvic pain": "တင်ပါးဆုံ နာကျင်ကိုက်ခဲခြင်း",
    "fever": "ဖျားနာခြင်း",
    "cough": "ချောင်းဆိုးခြင်း",
    "headache": "ခေါင်းကိုက်ခြင်း",
    "fatigue": "မောပန်းနွမ်းနယ်ခြင်း",
    "sore throat": "လည်ချောင်းနာခြင်း",
    "runny nose": "နှာစေးခြင်း",
    "nasal congestion": "နှာပိတ်ခြင်း",
    "sneezing": "နှာချေခြင်း",
    "shortness of breath": "အသက်ရှူကြပ်ခြင်း",
    "chest pain": "ရင်ဘတ်အောင့်ခြင်း",
    "nausea": "ပျို့အန်ချင်ခြင်း",
    "vomiting": "အန်ခြင်း",
    "diarrhea": "ဝမ်းသွားခြင်း",
    "abdominal pain": "ဗိုက်အောင့်ဗိုက်နာခြင်း",
    "joint pain": "အဆစ်အမြစ်ကိုက်ခဲခြင်း",
    "muscle aches": "ကြွက်သားများ နာကျင်ကိုက်ခဲခြင်း",
    "dizziness": "ခေါင်းမူးခြင်း",
    "itchy skin": "အရေပြားယားယံခြင်း",
    "skin rash": "အရေပြားအင်ပျဉ်/အနီကွက်ထွက်ခြင်း",
    "weight loss": "ကိုယ်အလေးချိန်ကျဆင်းခြင်း",
    "weight gain": "ကိုယ်အလေးချိန်တိုးလာခြင်း",
    "insomnia": "အိပ်မပျော်ခြင်း",
    "anxiety": "စိုးရိမ်ပူပန်ခြင်း",
    "constipation": "ဝမ်းချုပ်ခြင်း",
    "heartburn": "ရင်ပူခြင်း",
    "back pain": "ခါးနာခြင်း",
    "lower back pain": "ခါးအောက်ပိုင်း နာကျင်ကိုက်ခဲခြင်း",
    "difficulty breathing": "အသက်ရှူရခက်ခဲခြင်း",
    "loss of appetite": "ခံတွင်းပျက်ခြင်း / အစားအသောက်ပျက်ခြင်း",
    "swelling in legs": "ခြေထောက်များ ဖောရောင်ခြင်း",
    "blurred vision": "အမြင်အာရုံ ဝေဝါးခြင်း",
    "frequent urination": "ဆီးခဏခဏသွားခြင်း",
    "burning sensation when urinating": "ဆီးသွားစဉ် ပူစပ်ပူလောင်ဖြစ်ခြင်း",
    "blood in urine": "ဆီးထဲသွေးပါခြင်း",
    "blood in stool": "ဝမ်းထဲသွေးပါခြင်း",
    "chills": "ချမ်းတုန်ဖျားခြင်း",
    "sweating": "ချွေးထွက်လွန်ခြင်း",
    "pale skin": "ဖြူဖျော့ခြင်း",
    "irregular heartbeat": "နှလုံးခုန်မမှန်ခြင်း",
    "rapid heartbeat": "နှလုံးခုန်မြန်ခြင်း",
    "hair loss": "ဆံပင်ကျွတ်ခြင်း",
    "dry mouth": "ခံတွင်းခြောက်ခြင်း",
    "dry skin": "အရေပြားခြောက်သွေ့ခြင်း",
    "muscle weakness": "ကြွက်သားများ အားနည်းခြင်း",
    "numbness": "ထုံကျင်ခြင်း",
    "tingling": "စစ်စစ်မြည်ကျင်ခြင်း",
    "memory loss": "မှတ်ဉာဏ်ချို့ယွင်းခြင်း",
    "mood changes": "စိတ်ခံစားမှု ပြောင်းလဲလွယ်ခြင်း",
    "confusion": "စိတ်ရှုပ်ထွေးခြင်း",
    "mouth sores": "ပါးစပ်အနာဖြစ်ခြင်း",
    "earache": "နားကိုက်ခြင်း",
    "hearing loss": "အကြားအာရုံ လျော့နည်းခြင်း",
    "hoarseness": "အသံဝင်ခြင်း / အသံကွဲခြင်း",
    "swollen lymph nodes": "တက်စေ့/ပြန်ရည်ကျိတ်များ ရောင်ရမ်းခြင်း",
}

# Clinical Recommendations Glossary
REC_MAP = [
    (r"prenatal exercises.*?", "ကိုယ်ဝန်ဆောင် သီးသန့် ကိုယ်လက်လေ့ကျင့်ခန်းများ ပြုလုပ်ပေးခြင်း"),
    (r"good posture", "မှန်ကန်သော ကိုယ်နေဟန်ထား ထိန်းသိမ်းခြင်း"),
    (r"heat or cold therapy", "အပူ သို့မဟုတ် အအေး ကပ်ပေးခြင်း"),
    (r"prenatal massages", "ကိုယ်ဝန်ဆောင် နှိပ်နယ်ကုသမှု ခံယူခြင်း"),
    (r"supportive devices.*?", "ခါးပတ်နှင့် အထောက်အကူပြု ပစ္စည်းများ အသုံးပြုခြင်း"),
    (r"physical therapy", "ကာယကုထုံး ခံယူခြင်း"),
    (r"bed rest", "အိပ်ရာထဲတွင် ကောင်းစွာ အနားယူခြင်း"),
    (r"immediate medical attention", "အရေးပေါ် ဆေးကုသမှု ချက်ချင်းခံယူပါ"),
    (r"close monitoring", "ကျန်းမာရေး အခြေအနေကို အနီးကပ် စောင့်ကြည့်စစ်ဆေးခြင်း"),
    (r"emotional support", "စိတ်ပိုင်းဆိုင်ရာ အားပေးကူညီမှု ရယူခြင်း"),
    (r"dietary modifications", "အစားအသောက် စားသောက်မှုပုံစံ ပြင်ဆင်ပြောင်းလဲခြင်း"),
    (r"lifestyle modifications", "ကျန်းမာရေးနှင့် ညီညွတ်သော နေထိုင်မှုပုံစံ ပြုပြင်ခြင်း"),
    (r"insulin therapy", "အင်ဆူလင် ထိုးဆေးဖြင့် ကုသခြင်း"),
    (r"blood glucose monitoring", "သွေးတွင်းသကြားဓာတ်ကို ပုံမှန် စစ်ဆေးတိုင်းတာခြင်း"),
    (r"blood pressure monitoring", "သွေးပေါင်ချိန်ကို နေ့စဉ် စောင့်ကြည့်တိုင်းတာခြင်း"),
    (r"antihypertensive medications", "သွေးတိုးကျဆေးများ ပုံမှန်သောက်သုံးခြင်း"),
    (r"folic acid supplementation", "ဖောလစ်အက်ဆစ် အားဆေး နေ့စဉ်သောက်သုံးခြင်း"),
    (r"adequate hydration", "ရေနှင့် အရည်များများ သောက်သုံးပေးခြင်း"),
    (r"avoid activities that may stress the pregnancy", "ကိုယ်ဝန်ကို ထိခိုက်စေနိုင်သော လှုပ်ရှားမှုနှင့် အလေးအပင်မခြင်းများကို ရှောင်ကြဉ်ပါ"),
    (r"consult with a healthcare professional.*?", "ဆရာဝန် သို့မဟုတ် သားဖွားမီးယပ် အထူးကုနှင့် ဆွေးနွေးတိုင်ပင်ပါ"),
    (r"avoid self-medication", "ဆရာဝန်ညွှန်ကြားချက်မပါဘဲ ဆေးသောက်ခြင်းကို ရှောင်ကြဉ်ပါ"),
    (r"avoid smoking and alcohol", "ဆေးလိပ်နှင့် အရက်သောက်သုံးခြင်းကို လုံးဝရှောင်ကြဉ်ပါ"),
    (r"take prescribed medications", "ဆရာဝန်ညွှန်ကြားထားသော ဆေးဝါးများကို တိကျစွာ သောက်သုံးပါ"),
    (r"gentle stretching", "အကြောလျှော့ လေ့ကျင့်ခန်း ဖြည်းဖြည်းချင်း ပြုလုပ်ပါ"),
]

# Standard Medication Translation Map
MED_MAP = {
    "diclofenac": "ဒိုင်ကလိုဖီနက် (Diclofenac)",
    "ibuprofen": "အိုင်ဗျူပရိုဖင် (Ibuprofen)",
    "paracetamol": "ပါရာစီတမော (Paracetamol)",
    "amoxicillin": "အမောက်စီဆလင် (Amoxicillin)",
    "azithromycin": "အဇစ်သရိုမိုင်ဆင် (Azithromycin)",
    "cetirizine": "စီထရီဇင်း (Cetirizine)",
    "loratadine": "လိုရာတာဒင်း (Claritin)",
    "omeprazole": "အိုမီပရာဇော (Omeprazole)",
    "metformin": "မက်ဖော်မင် (Metformin)",
    "amlodipine": "အမ်လိုဒီပင်း (Amlodipine)",
    "aspirin": "အက်စပရင် (Aspirin)",
    "pantoprazole": "ပန်တိုပရာဇော (Pantoprazole)",
    "antacid": "အက်ဆစ်ပျယ်ဆေး (Antacid)",
    "folic acid": "ဖောလစ်အက်ဆစ် (Folic Acid)",
    "iron supplement": "သံဓာတ်အားဆေး (Iron)",
    "calcium": "ကယ်လ်စီယမ် (Calcium)",
    "vitamin c": "ဗီတာမင်စီ (Vitamin C)",
    "vitamin b complex": "ဗီတာမင်ဘီ (Vitamin B Complex)",
    "ors": "ဓာတ်ဆားရည် (ORS)",
    "salbutamol": "ဆာဘူတမော (Salbutamol)",
    "progesterone": "ပရိုဂျက်စထရုန်း (Progesterone)",
    "methyldopa": "မီသိုင်းဒိုပါ (Methyldopa)",
    "labetalol": "လာဘီတာလော (Labetalol)",
    "insulin": "အင်ဆူလင် (Insulin)",
}

def translate_phrase(text):
    if not text or not isinstance(text, str):
        return text
    clean = text.lower().strip()
    if clean in TRANSLATION_MAP:
        return TRANSLATION_MAP[clean]
    for k, v in TRANSLATION_MAP.items():
        if k == clean or k in clean:
            return v
    # Try Regex replacements
    res = text
    for pat, rep in REC_MAP:
        res = re.sub(pat, rep, res, flags=re.IGNORECASE)
    return res

def clean_disease_name(raw):
    lower = raw.lower().strip()
    if lower in TRANSLATION_MAP:
        return TRANSLATION_MAP[lower]
    for k, v in TRANSLATION_MAP.items():
        if k in lower:
            return v
    # If ends with 'ရောဂါ' but has english prefix
    eng_match = re.match(r'^([A-Za-z\s\-\,\(\)\'\.]+)(\s*ရောဂါ)?$', raw)
    if eng_match:
        eng_name = eng_match.group(1).strip()
        eng_lower = eng_name.lower()
        if eng_lower in TRANSLATION_MAP:
            return TRANSLATION_MAP[eng_lower]
        return f"{eng_name} ရောဂါ"
    return raw

def translate_recommendation_full(rec):
    if not rec:
        return "ဆရာဝန်နှင့် ပြသတိုင်ပင်၍ လိုအပ်သော ဆေးဝါးများ သောက်သုံးခြင်း၊ လုံလောက်စွာ အနားယူခြင်းနှင့် ကျန်းမာရေးနှင့် ညီညွတ်စွာ နေထိုင်ပါ။"
    res = rec
    for pat, rep in REC_MAP:
        res = re.sub(pat, rep, res, flags=re.IGNORECASE)
    
    # Generic phrase cleanup
    res = re.sub(r'\(such as.*?\)', '', res, flags=re.IGNORECASE)
    res = re.sub(r'\(in some cases\)', ' (လိုအပ်ပါက)', res, flags=re.IGNORECASE)
    res = re.sub(r'\(if needed\)', ' (လိုအပ်ပါက)', res, flags=re.IGNORECASE)
    res = re.sub(r',\s*,', ',', res)
    res = re.sub(r'\s{2,}', ' ', res).strip()
    return res

def clean_medication(m):
    clean = m.lower().strip()
    # Remove any truncated/ugly parenthesized english strings
    m_base = re.sub(r'\s*\(.*?\)', '', m).strip()
    clean_base = m_base.lower()
    if clean_base in MED_MAP:
        return MED_MAP[clean_base]
    for k, v in MED_MAP.items():
        if k in clean:
            return v
    if clean in MED_MAP:
        return MED_MAP[clean]
    return m

# Load and update diseases_mm.json
with open('data/diseases_mm.json', 'r', encoding='utf-8') as f:
    diseases = json.load(f)

for d in diseases:
    # 1. Title
    orig_name = d.get('name', '')
    d['name'] = clean_disease_name(orig_name)
    
    # 2. Symptoms
    symptoms = d.get('symptoms', [])
    d['symptoms'] = [translate_phrase(s) for s in symptoms]
    
    # 3. Description
    clean_symptoms_str = "၊ ".join(d['symptoms'][:4])
    d['description'] = f"{d['name']} သည် {clean_symptoms_str} စသည့် လက္ခဏာများ ဖြစ်ပွားတတ်သော ရောဂါအခြေအနေ ဖြစ်ပါသည်။"
    
    # 4. Recommendation
    d['recommendation'] = translate_recommendation_full(d.get('recommendation', ''))
    
    # 5. Medications
    d['medications'] = [clean_medication(m) for m in d.get('medications', [])]
    
    # 6. Precautions
    d['precautions'] = [
        "ကျန်းမာရေးဆိုင်ရာ လမ်းညွှန်ချက်များကို တိကျစွာ လိုက်နာပါ",
        "ဆရာဝန်နှင့် ပြသတိုင်ပင်ပါ",
        "ရေနှင့် အရည်များများ သောက်သုံးပါ",
        "လုံလောက်စွာ အနားယူပါ"
    ]

with open('data/diseases_mm.json', 'w', encoding='utf-8') as f:
    json.dump(diseases, f, ensure_ascii=False, indent=2)

print("100% updated data/diseases_mm.json successfully!")
