import json, re

with open('data/diseases.json', 'r', encoding='utf-8') as f:
    diseases_en = json.load(f)

with open('data/diseases_mm.json', 'r', encoding='utf-8') as f:
    diseases_mm = json.load(f)

MED_MAP = {
    "amoxicillin": "အမောက်စီဆလင် (Amoxicillin)",
    "azithromycin": "အဇစ်သရိုမိုင်ဆင် (Azithromycin)",
    "cetirizine": "စီထရီဇင်း (Cetirizine)",
    "loratadine": "လိုရာတာဒင်း (Claritin / Loratadine)",
    "loratadine (claritin)": "လိုရာတာဒင်း (Claritin)",
    "paracetamol": "ပါရာစီတမော (Paracetamol)",
    "ibuprofen": "အိုင်ဗျူပရိုဖင် (Ibuprofen)",
    "omeprazole": "အိုမီပရာဇော (Omeprazole)",
    "metformin": "မက်ဖော်မင် (Metformin)",
    "amlodipine": "အမ်လိုဒီပင်း (Amlodipine)",
    "salbutamol": "ဆာဘူတမော ရင်ကြပ်ရှူဆေး (Salbutamol)",
    "ciprofloxacin": "စီပရိုဖလော့ဆာဆင် (Ciprofloxacin)",
    "doxycycline": "ဒေါ့ဆီဆိုက်ကလင်း (Doxycycline)",
    "ors": "ဓာတ်ဆားရည် (ORS)",
    "oral rehydration salts": "ဓာတ်ဆားရည် (ORS)",
    "zinc sulfate": "ဇင့်ဓာတ်ဆေးပြား (Zinc)",
    "buscopan": "ဘတ်စ်ကိုပန် ဗိုက်နာပျောက်ဆေး (Buscopan)",
    "air-x": "အဲယားအိတ်စ် လေထိုးလေအောင့်ပျောက်ဆေး (Air-X)",
    "bisolvon": "ဘိုင်ဆောဗွန် ချွဲသလိပ်ပျော်ဆေး (Bisolvon)",
    "dextromethorphan": "ဒက်စ်ထရို ချောင်းဆိုးပျောက်ဆေး (Dextromethorphan)",
    "kremil-s": "ခရီမင်အက်စ် လေကြေအစာကြေဆေး (Kremil-S)",
    "telmisartan": "တယ်လ်မီဆာတန် သွေးတိုးကျဆေး (Telmisartan)",
    "eltroxin": "အယ်လ်ထရောက်ဆင် သိုင်းရွိုက်ဆေး (Levothyroxine)",
    "singulair": "မွန်တီလူကတ်စ် ရင်ကြပ်ကာကွယ်ဆေး (Montelukast)",
    "betadine": "ဘီတာဒင်း ပိုးသတ်ဆေးရည် (Povidone Iodine)",
    "canesten": "ကာနက်စ်တင် မှိုသတ်လိမ်းဆေး (Clotrimazole)",
    "calamine lotion": "ကာလာမင်း ယားယံသက်သာလိမ်းဆေး (Calamine)",
    "hyoscine butylbromide": "ဘတ်စ်ကိုပန် ဗိုက်နာပျောက်ဆေး (Buscopan)",
    "simethicone": "ဆီမီသီကုန်း လေကြေဆေး (Simethicone)",
    "bromhexine": "ဘရွန်ဟက်ဆင်း ချွဲပျော်ဆေး (Bromhexine)",
    "levothyroxine": "သိုင်းရွိုက်ဟော်မုန်းဆေး (Levothyroxine)",
    "montelukast": "မွန်တီလူကတ်စ် (Montelukast)",
    "clotrimazole": "ကလိုထရီမာဇော မှိုသတ်ဆေး (Clotrimazole)",
    "aspirin": "အက်စပရင် (Aspirin)",
    "atorvastatin": "အာတိုဗာစတက်တင် အဆီကျဆေး (Atorvastatin)",
    "losartan": "လိုဆာတန် သွေးတိုးကျဆေး (Losartan)",
    "enalapril": "အီနာလာပရီ သွေးတိုးကျဆေး (Enalapril)",
    "captopril": "ကက်ပတိုပရီ သွေးတိုးကျဆေး (Captopril)",
    "pantoprazole": "ပန်တိုပရာဇော အစာအိမ်ဆေး (Pantoprazole)",
    "rabeprazole": "ရာဘီပရာဇော အစာအိမ်ဆေး (Rabeprazole)",
    "ranitidine": "ရာနီတီဒင်း အစာအိမ်ဆေး (Ranitidine)",
    "famotidine": "ဖာမိုတီဒင်း အစာအိမ်ဆေး (Famotidine)",
    "metronidazole": "မက်ထရိုနီဒါဇော ဝမ်းကိုက်ပျောက်ဆေး (Metronidazole)",
    "ceftriaxone": "ဆက်ဖ်ထရီယာဇုန်း ပိုးသတ်ဆေး (Ceftriaxone)",
    "cefuroxime": "ဆက်ဖူရောက်ဆင်း ပိုးသတ်ဆေး (Cefuroxime)",
    "erythromycin": "အီရီသရိုမိုင်ဆင် ပိုးသတ်ဆေး (Erythromycin)",
    "clarithromycin": "ကလာရီသရိုမိုင်ဆင် (Clarithromycin)",
    "diclofenac": "ဒိုင်ကလိုဖီနက် အကိုက်အခဲပျောက်ဆေး (Diclofenac)",
    "mefenamic acid": "ပိုစတန် အကိုက်အခဲပျောက်ဆေး (Mefenamic Acid)",
    "tramadol": "ထရာမာဒေါ အကိုက်အခဲပျောက်ဆေး (Tramadol)",
    "chlorpheniramine": "စီပီအမ် အအေးမိဓာတ်မတည့်ပျောက်ဆေး (CPM)",
    "fexofenadine": "ဖက်ဆိုဖီနာဒင်း (Telfast / Fexofenadine)",
    "prednisolone": "ပရက်ဒနီဆိုလုံး စတီးရွိုက်ဆေး (Prednisolone)",
    "dexamethasone": "ဒက်ဆာမီသာဆုန်း (Dexamethasone)",
    "hydrocortisone": "ဟိုက်ဒရိုကော်တီဆုန်း လိမ်းဆေး (Hydrocortisone)",
    "vitamin c": "ဗီတာမင်စီ (Vitamin C)",
    "vitamin b complex": "ဗီတာမင်ဘီ အားဆေး (Vitamin B Complex)",
    "folic acid": "ဖောလစ်အက်ဆစ် သွေးအားကောင်းဆေး (Folic Acid)",
    "iron supplement": "သံဓာတ်အားဆေး (Iron)",
    "calcium + vitamin d": "ကယ်လ်စီယမ် အရိုးအားဆေး (Calcium + Vit D)",
    "domperidone": "ဒေါမ်ပယ်ရီဒုန်း အအန်ပျောက်ဆေး (Domperidone)",
    "ondansetron": "အွန်ဒန်စီထရွန် အအန်ပျောက်ဆေး (Ondansetron)",
    "dimenhydrinate": "ကားမူးပျောက်ဆေး (Dimenhydrinate)",
    "loperamide": "အီမိုဒီယမ် ဝမ်းပိတ်ဆေး (Loperamide)",
    "lactulose": "လက်တူလို့စ် ဝမ်းနုတ်ဆေးရည် (Lactulose)",
    "bisacodyl": "ဒူကိုလက်စ် ဝမ်းနုတ်ဆေး (Dulcolax)",
    "insulin": "အင်ဆူလင် ထိုးဆေး (Insulin)",
    "glimepiride": "ဂလိုင်မီပရိုက် ဆီးချိုဆေး (Glimepiride)",
    "allopurinol": "အယ်လိုပူရီနော ဂေါက်ရောဂါဆေး (Allopurinol)",
    "colchicine": "ကောလ်ချီဆင်း ဂေါက်ရောဂါဆေး (Colchicine)",
    "antacid": "လေကြေအစာကြေ အက်ဆစ်ပျယ်ဆေး (Antacid)",
}

def translate_med(m_name):
    clean = m_name.lower().strip()
    if clean in MED_MAP:
        return MED_MAP[clean]
    for k, v in MED_MAP.items():
        if k in clean or clean in k:
            return v
    return m_name

# Translation glossary for phrases in Recommendations
REC_REPLACEMENTS = [
    (r"Treatment depends on the underlying cause \(such as allergies, sinusitis, or nasal polyps\), and may include medications \(such as decongestants, ဓာတ်မတည့်ပျောက်ဆေးများ \(Antihistamines\), nasal sprays\), saline nasal irrigation, steam inhalation, allergy management, ပဋိဇီဝပိုးသတ်ဆေးများ \(if bacterial infection is present\), ခွဲစိတ်ကုသခြင်း \(in some cases\)",
     "ကုသမှုသည် ဖြစ်ပွားရသောအကြောင်းရင်း (ဓာတ်မတည့်ခြင်း၊ ထိပ်ကပ်နာ သို့မဟုတ် နှာခေါင်းအသားပို) ပေါ်မူတည်ပြီး နှာပိတ်ပျောက်ဆေးများ၊ ဓာတ်မတည့်ပျောက်ဆေးများ၊ နှာခေါင်းဖျန်းဆေးများ၊ ဆားရည်ဖြင့် နှာခေါင်းဆေးကြောခြင်း၊ ရေနွေးငွေ့ရှူရှိုက်ခြင်း၊ ဘက်တီးရီးယားပိုးဝင်ပါက ပဋိဇီဝပိုးသတ်ဆေးများ သောက်သုံးခြင်းနှင့် လိုအပ်ပါက ခွဲစိတ်ကုသခြင်းများ ပြုလုပ်နိုင်ပါသည်။"),
    (r"Treatment depends on the underlying cause.*?surgical intervention",
     "ကုသမှုသည် ဖြစ်ပွားရသောအကြောင်းရင်းပေါ်မူတည်ပြီး သက်ဆိုင်ရာဆေးဝါးများ သောက်သုံးခြင်း၊ အနားယူခြင်းနှင့် လိုအပ်ပါက ခွဲစိတ်ကုသခြင်း"),
    (r"Observation and monitoring", "အနီးကပ် စောင့်ကြည့်စစ်ဆေးခြင်း"),
    (r"hormone therapy", "ဟော်မုန်းကုထုံး ခံယူခြင်း"),
    (r"surgical intervention", "ခွဲစိတ်ကုသမှု ခံယူခြင်း"),
    (r"open or laparoscopic surgery", "မှန်ပြောင်း သို့မဟုတ် ရိုးရိုးခွဲစိတ်ကုသခြင်း"),
    (r"regular follow-up visits with a urologist or pediatric surgeon", "ဆီးနှင့်ကျောက်ကပ် သို့မဟုတ် ကလေးခွဲစိတ်ဆရာဝန်နှင့် ပုံမှန်ပြသစစ်ဆေးခြင်း"),
    (r"regular follow-up visits", "ဆရာဝန်နှင့် ပုံမှန်ပြသစစ်ဆေးခြင်း"),
    (r"antibiotics \(if bacterial infection is present\)", "ဘက်တီးရီးယားပိုးဝင်ပါက ပဋိဇီဝပိုးသတ်ဆေးများ သောက်သုံးခြင်း"),
    (r"antihistamines", "ဓာတ်မတည့်ပျောက်ဆေးများ"),
    (r"decongestants", "နှာပိတ်သက်သာစေသောဆေးများ"),
    (r"nasal sprays", "နှာခေါင်းဖျန်းဆေးများ"),
    (r"saline nasal irrigation", "ဆားရည်ဖြင့် နှာခေါင်းဆေးကြောခြင်း"),
    (r"steam inhalation", "ရေနွေးငွေ့ရှူရှိုက်ခြင်း"),
    (r"allergy management", "ဓာတ်မတည့်ဖြစ်စေသော အရာများကို ရှောင်ကြဉ်ခြင်း"),
    (r"in cases of mild or transient", "အခြေအနေ သာမန်ဖြစ်ပါက"),
    (r"in some cases", "လိုအပ်သောအခြေအနေများတွင်"),
    (r"Consult a healthcare professional", "ကျန်းမာရေးဝန်ထမ်း သို့မဟုတ် ဆရာဝန်နှင့် ပြသတိုင်ပင်ပါ"),
    (r"Seek medical advice", "နီးစပ်ရာ ဆေးရုံဆေးခန်းသို့ သွားရောက်ပြသပါ"),
    (r"Follow recommended health guidelines", "ကျန်းမာရေးဆိုင်ရာ လမ်းညွှန်ချက်များကို လိုက်နာပါ"),
    (r"Drink plenty of fluids", "ရေနှင့် အရည်များများ သောက်သုံးပါ"),
    (r"Get plenty of rest", "လုံလောက်စွာ အနားယူပါ"),
    (r"Avoid known triggers", "ရောဂါထကြွစေသော အကြောင်းရင်းများကို ရှောင်ကြဉ်ပါ"),
    (r"Eat a healthy, balanced diet", "အာဟာရပြည့်ဝ မျှတသော အစားအစာများကို စားသုံးပါ"),
    (r"Maintain good hygiene", "တစ်ကိုယ်ရေ သန့်ရှင်းရေးကို အထူးဂရုပြုပါ"),
    (r"Practice good hand hygiene", "လက်ကို စင်ကြယ်စွာ မကြာခဏ ဆေးကြောပါ"),
    (r"Avoid self-medication", "ဆရာဝန်ညွှန်ကြားချက်မပါဘဲ ဆေးသောက်ခြင်းကို ရှောင်ကြဉ်ပါ"),
    (r"Avoid smoking and alcohol", "ဆေးလိပ်နှင့် အရက်သောက်သုံးခြင်းကို ရှောင်ကြဉ်ပါ"),
    (r"Take prescribed medications", "ဆရာဝန်ညွှန်ကြားထားသော ဆေးဝါးများကို တိကျစွာ သောက်သုံးပါ"),
]

def translate_recommendation(rec):
    if not rec:
        return "ဆရာဝန်နှင့် ပြသတိုင်ပင်၍ လိုအပ်သော ဆေးဝါးများ သောက်သုံးခြင်း၊ လုံလောက်စွာ အနားယူခြင်းနှင့် ကျန်းမာရေးနှင့် ညီညွတ်စွာ နေထိုင်ပါ။"
    result = rec
    for pattern, rep in REC_REPLACEMENTS:
        result = re.sub(pattern, rep, result, flags=re.IGNORECASE)
    # Clean any leftover trailing english fragments
    result = re.sub(r'\(in cases of.*?\)', '', result)
    result = re.sub(r'\(to stimulate.*?\)', '', result)
    result = re.sub(r'\(such as.*?\)', '', result)
    result = re.sub(r'\s{2,}', ' ', result).strip()
    return result

# English disease name to Myanmar translation
DISEASE_NAMES = {
    "Nose Disorder": "နှာခေါင်းဆိုင်ရာရောဂါ (Nose Disorder)",
    "Common Cold": "သာမန် အအေးမိနှာစေးခြင်း (Common Cold)",
    "Influenza": "တုပ်ကွေးရောဂါ (Influenza)",
    "Gastroenteritis": "အစာအိမ်နှင့် အူလမ်းကြောင်းရောင်ခြင်း (Gastroenteritis)",
    "Hypertension": "သွေးတိုးရောဂါ (Hypertension)",
    "Diabetes Mellitus": "ဆီးချိုသွေးချိုရောဂါ (Diabetes)",
    "Asthma": "ရင်ကြပ်ပန်းနာရောဂါ (Asthma)",
    "Bronchitis": "လေပြွန်ရောင်ရမ်းခြင်း (Bronchitis)",
    "Pneumonia": "အဆုတ်ရောင် အဆုတ်အအေးမိရောဂါ (Pneumonia)",
    "Dengue Fever": "သွေးလွန်တုပ်ကွေးရောဂါ (Dengue Fever)",
    "Chikungunya": "ချီကွန်ဂန်းယားရောဂါ (Chikungunya)",
    "Hand, Foot & Mouth Disease": "လက်၊ ခြေ၊ ခံတွင်း ရောဂါ (HFMD)",
    "Rabies": "ခွေးရူးပြန်ရောဂါ (Rabies)",
    "Tetanus": "မေးခိုင်ရောဂါ (Tetanus)",
    "Fatty Liver": "အသည်းအဆီဖုံးရောဂါ (Fatty Liver)",
    "Frozen Shoulder": "ပခုံးခဲနာကျင်ခြင်း (Frozen Shoulder)",
    "Cervical Spondylosis": "ဇက်ဆစ်ရိုးကျီးပေါင်းတက်ခြင်း (Cervical Spondylosis)",
    "Sinusitis": "ထိပ်ကပ်နာရောဂါ (Sinusitis)",
    "Allergic Rhinitis": "ဓာတ်မတည့် နှာစေးရောဂါ (Allergic Rhinitis)",
    "Drug Withdrawal": "မူးယစ်ဆေးဖြတ်ခြင်း လက္ခဏာများ (Drug Withdrawal)",
    "Vocal cord polyp": "အသံအိုးအသားပိုဖြစ်ခြင်း (Vocal Cord Polyp)",
    "Turner syndrome": "တာနာဆင်ဒရုန်းရောဂါ (Turner Syndrome)",
    "Ethylene glycol poisoning-1": "အဆိပ်သင့်ခြင်း အဆင့် ၁ (Ethylene Glycol Poisoning)",
    "Ethylene glycol poisoning-2": "အဆိပ်သင့်ခြင်း အဆင့် ၂ (Ethylene Glycol Poisoning)",
    "Ethylene glycol poisoning-3": "အဆိပ်သင့်ခြင်း အဆင့် ၃ (Ethylene Glycol Poisoning)",
    "Atrophic vaginitis": "မိန်းမကိုယ်တစ်သျှူးပါးလွှာရောင်ရမ်းခြင်း (Atrophic Vaginitis)",
    "Fracture": "အရိုးကျိုးခြင်း (Fracture)",
    "Eye alignment disorder": "မျက်စိစွေခြင်းနှင့် ကြည့်မမှန်ခြင်း (Strabismus)",
    "Headache after lumbar puncture": "ခါးဆစ်ရိုးဖောက်ပြီးနောက် ခေါင်းကိုက်ခြင်း",
    "Pyloric stenosis": "အစာအိမ်ထွက်ပေါက်ကျဉ်းခြင်း (Pyloric Stenosis)",
    "Cryptorchidism": "မွေးရာပါ ကပ်ပယ်အိတ်အတွင်း ဝှေးစေ့မဆင်းခြင်း (Cryptorchidism)",
    "Gastritis": "အစာအိမ်ရောင်ရမ်းခြင်း (Gastritis)",
    "GERD": "အစာအိမ်အက်ဆစ် အထက်သို့ဆန်တက်ခြင်း (GERD)",
    "Migraine": "ခေါင်းတစ်ခြမ်းကိုက်ရောဂါ (Migraine)",
    "Tonsillitis": "အာသီးရောင်ခြင်း (Tonsillitis)",
    "Pharyngitis": "လည်ချောင်းရောင်ခြင်း (Pharyngitis)",
    "Laryngitis": "အသံအိုးရောင်ခြင်း (Laryngitis)",
    "Otitis Media": "အလယ်နားရောင်ရမ်းခြင်း (Otitis Media)",
    "Conjunctivitis": "မျက်စိနာခြင်း / မျက်မြှေးပါးရောင်ခြင်း (Conjunctivitis)",
    "Urticaria": "အင်ပျဉ်ထွက်ခြင်း (Urticaria / Hives)",
    "Contact Dermatitis": "ထိတွေ့ဓာတ်မတည့် အရေပြားရောင်ခြင်း (Contact Dermatitis)",
    "Eczema": "နှင်းခူရောဂါ (Eczema)",
    "Psoriasis": "ဖောရောင်အကြေးခွံထ အရေပြားရောဂါ (Psoriasis)",
    "Scabies": "ဝဲရောဂါ (Scabies)",
    "Tinea Corporis": "ပွေးရောဂါ (Ringworm)",
    "Tinea Versicolor": "ညှင်းရောဂါ (Tinea Versicolor)",
    "Urinary Tract Infection (UTI)": "ဆီးလမ်းကြောင်းပိုးဝင်ခြင်း (UTI)",
    "Kidney Stone": "ကျောက်ကပ်ကျောက်တည်ခြင်း (Kidney Stone)",
    "Appendicitis": "အူအတက်ရောင်ခြင်း (Appendicitis)",
    "Cholecystitis": "သည်းခြေအိတ်ရောင်ခြင်း (Cholecystitis)",
    "Hemorrhoids": "လိပ်ခေါင်းရောဂါ (Hemorrhoids)",
    "Anal Fissure": "စအိုကွဲနာ (Anal Fissure)",
    "Peptic Ulcer": "အစာအိမ်နှင့် အူသိမ်အနာ (Peptic Ulcer)",
    "Malaria": "ငှက်ဖျားရောဂါ (Malaria)",
    "Typhoid Fever": "အူရောင်ငန်းဖျားရောဂါ (Typhoid Fever)",
    "Tuberculosis": "တီဘီရောဂါ (Tuberculosis)",
    "Chickenpox": "ရေကျောက်ရောဂါ (Chickenpox)",
    "Measles": "ဝက်သက်ရောဂါ (Measles)",
    "Mumps": "ပါးချိတ်ရောင်ရောဂါ (Mumps)",
    "Rubella": "ဂျိုက်သိုးရောဂါ (German Measles)",
    "Shingles": "ရေယုန်ရောဂါ (Herpes Zoster / Shingles)",
    "Gout": "ဂေါက်အဆစ်ရောင်ရောဂါ (Gout)",
    "Osteoarthritis": "အရိုးအဆစ်ရိုးကျီးပေါင်းရောဂါ (Osteoarthritis)",
    "Rheumatoid Arthritis": "လေးဘက်နာ အဆစ်ရောင်ရောဂါ (Rheumatoid Arthritis)",
    "Sciatica": "တင်ပါးဆုံ အာရုံကြောနာခြင်း (Sciatica)",
    "Carpal Tunnel Syndrome": "လက်ကောက်ဝတ် အာရုံကြောပိခြင်း (Carpal Tunnel)",
    "Bell's Palsy": "မျက်နှာတစ်ခြမ်း လေဖြတ်ခြင်း (Bell's Palsy)",
    "Stroke": "လေဖြတ်ခြင်း (Stroke / CVA)",
    "Epilepsy": "ဝက်ရူးပြန်ရောဂါ (Epilepsy)",
    "Vertigo": "ခေါင်းမူး ချာချာလည်ခြင်း (Vertigo)",
    "Anemia": "သွေးအားနည်းရောဂါ (Anemia)",
    "Thalassemia": "သာလာဆီးမီးယား မျိုးရိုးလိုက်သွေးရောဂါ (Thalassemia)",
    "Hypothyroidism": "သိုင်းရွိုက်ဟော်မုန်းနည်းရောဂါ (Hypothyroidism)",
    "Hyperthyroidism": "သိုင်းရွိုက်ဟော်မုန်းများရောဂါ (Hyperthyroidism)",
    "Insomnia": "အိပ်မပျော်ခြင်းဝေဒနာ (Insomnia)",
    "Depression": "စိတ်ကျရောဂါ (Depression)",
    "Anxiety Disorder": "စိုးရိမ်ပူပန်လွန်ကဲမှုရောဂါ (Anxiety)",
    "Panic Disorder": "ထိတ်လန့်တုန်လှုပ်မှုဝေဒနာ (Panic Disorder)",
}

# Symptom translations
SYMPTOM_MAP = {
    "loss of smell": "အနံ့မရခြင်း",
    "loss of taste": "အရသာမသိခြင်း",
    "restlessness": "ဂနာမငြိမ်ဖြစ်ခြင်း",
    "tremors": "လက်တုန်ခြင်း / တုန်ယင်ခြင်း",
    "drug cravings": "ဆေးသုံးစွဲလိုစိတ် ပြင်းပြခြင်း",
    "empty scrotum": "ကပ်ပယ်အိတ်အတွင်း ဝှေးစေ့မရှိခြင်း",
    "inguinal hernia": "ပေါင်ခြံအူကျခြင်း",
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
}

def translate_symptom(s):
    clean = s.lower().strip()
    return SYMPTOM_MAP.get(clean, s)

# Process all diseases
for d in diseases_mm:
    raw_name = d.get("name", "")
    
    # 1. Translate Name
    if raw_name in DISEASE_NAMES:
        mm_name = DISEASE_NAMES[raw_name]
    elif re.match(r'^[A-Za-z0-9\s,\-\(\)\'\.]+$', raw_name):
        # Transliterate / format
        mm_name = f"{raw_name} ရောဂါ"
    else:
        mm_name = raw_name
    d["name"] = mm_name
    
    # 2. Translate Description (ensure begins with Myanmar name)
    desc = d.get("description", "")
    if raw_name in desc and mm_name != raw_name:
        desc = desc.replace(raw_name, mm_name)
    d["description"] = desc
    
    # 3. Translate Recommendation
    d["recommendation"] = translate_recommendation(d.get("recommendation", ""))
    
    # 4. Translate Medications
    meds = d.get("medications", [])
    d["medications"] = [translate_med(m) for m in meds]
    
    # 5. Translate Symptoms
    symptoms = d.get("symptoms", [])
    d["symptoms"] = [translate_symptom(s) for s in symptoms]
    
    # 6. Precautions
    precautions = d.get("precautions", [])
    translated_p = []
    for p in precautions:
        if "Follow recommended" in p:
            translated_p.append("ကျန်းမာရေးဆိုင်ရာ လမ်းညွှန်ချက်များကို လိုက်နာပါ")
        elif "Seek medical" in p:
            translated_p.append("ဆရာဝန်နှင့် ပြသတိုင်ပင်ပါ")
        elif "Drink" in p:
            translated_p.append("ရေနှင့် အရည်များများ သောက်သုံးပါ")
        elif "rest" in p.lower():
            translated_p.append("လုံလောက်စွာ အနားယူပါ")
        else:
            translated_p.append(p)
    d["precautions"] = translated_p

with open('data/diseases_mm.json', 'w', encoding='utf-8') as f:
    json.dump(diseases_mm, f, ensure_ascii=False, indent=2)

print("Updated data/diseases_mm.json successfully!")
