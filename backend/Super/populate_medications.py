"""
populate_medications.py
========================
diseases.json မှာ medications: [] ဖြစ်နေတဲ့ entries တွေကို
medicines.json ထဲမှာ ရှိတဲ့ medicine name တွေနဲ့ cross-match လုပ်ပြီး
recommendation field မှာ ပါတဲ့ ဆေးနာမည်တွေကို medications array ထဲ populate လုပ်ပေးသည်။
"""

import json
import re
import os

DATA_DIR = r"c:\VirtualDoctor\backend\data"
DISEASES_EN_PATH = os.path.join(DATA_DIR, "diseases.json")
DISEASES_MM_PATH = os.path.join(DATA_DIR, "diseases_mm.json")
MEDICINES_EN_PATH = os.path.join(DATA_DIR, "medicines.json")
MEDICINES_MM_PATH = os.path.join(DATA_DIR, "medicines_mm.json")

# -------------------------------------------------------------------
# Disease-to-medication mapping (disease name keywords -> medicine names)
# diseases.json မှာ recommendation ထဲမပါဘဲ manually map လုပ်ရမဲ့ ဆေးများ
# -------------------------------------------------------------------
DISEASE_MED_MAP = {
    # Respiratory
    "common cold": ["Paracetamol", "Decolgen", "Cetirizine"],
    "cold": ["Paracetamol", "Decolgen", "Cetirizine"],
    "influenza": ["Paracetamol", "Oseltamivir", "Decolgen"],
    "flu": ["Paracetamol", "Oseltamivir", "Decolgen"],
    "asthma": ["Salbutamol (Ventolin)", "Dexamethasone", "Prednisolone"],
    "bronchitis": ["Azithromycin", "Bromhexine (Bisolvon)", "Amoxicillin", "Paracetamol"],
    "pneumonia": ["Amoxicillin", "Azithromycin", "Paracetamol"],
    "sinusitis": ["Amoxicillin", "Decolgen", "Cetirizine"],
    "rhinitis": ["Cetirizine", "Decolgen", "Loratadine (Claritin)"],
    "allergic rhinitis": ["Cetirizine", "Loratadine (Claritin)", "Decolgen"],
    "cough": ["Bromhexine (Bisolvon)", "Carbocisteine (Solmux)", "Decolgen"],
    "copd": ["Salbutamol (Ventolin)", "Prednisolone"],
    # GI
    "diarrhea": ["Loperamide (Imodium)", "Oral Rehydration Salts (ORS)", "Metronidazole (Flagyl)"],
    "gastroenteritis": ["Oral Rehydration Salts (ORS)", "Loperamide (Imodium)", "Metronidazole (Flagyl)"],
    "dysentery": ["Metronidazole (Flagyl)", "Ciprofloxacin", "Oral Rehydration Salts (ORS)"],
    "peptic ulcer": ["Omeprazole", "Pantoprazole", "Amoxicillin", "Metronidazole (Flagyl)"],
    "gerd": ["Omeprazole", "Pantoprazole", "Gaviscon"],
    "reflux": ["Omeprazole", "Gaviscon", "Pantoprazole"],
    "heartburn": ["Gaviscon", "Omeprazole", "Kremil-S"],
    "gastritis": ["Omeprazole", "Pantoprazole", "Kremil-S"],
    "indigestion": ["Kremil-S", "Gaviscon", "Domperidone (Motilium)"],
    "nausea": ["Domperidone (Motilium)"],
    "vomiting": ["Domperidone (Motilium)", "Oral Rehydration Salts (ORS)"],
    "cholera": ["Oral Rehydration Salts (ORS)", "Ciprofloxacin"],
    "typhoid": ["Ciprofloxacin", "Azithromycin", "Paracetamol"],
    "worm": ["Albendazole (Zentel)", "Mebendazole"],
    "intestinal worm": ["Albendazole (Zentel)", "Mebendazole"],
    "roundworm": ["Albendazole (Zentel)", "Mebendazole"],
    "hookworm": ["Albendazole (Zentel)"],
    "tapeworm": ["Albendazole (Zentel)"],
    "amoeba": ["Metronidazole (Flagyl)"],
    "amoebiasis": ["Metronidazole (Flagyl)", "Ciprofloxacin"],
    # Pain / Inflammation
    "headache": ["Paracetamol", "Ibuprofen"],
    "migraine": ["Paracetamol", "Ibuprofen"],
    "fever": ["Paracetamol"],
    "arthritis": ["Ibuprofen", "Diclofenac (Voltaren)", "Mefenamic Acid (Ponstan)", "Prednisolone"],
    "rheumatoid arthritis": ["Prednisolone", "Ibuprofen"],
    "gout": ["Diclofenac (Voltaren)", "Allopurinol"],
    "back pain": ["Ibuprofen", "Diclofenac (Voltaren)", "Paracetamol"],
    "muscle pain": ["Ibuprofen", "Diclofenac (Voltaren)", "Paracetamol"],
    "toothache": ["Mefenamic Acid (Ponstan)", "Amoxicillin", "Paracetamol"],
    "period pain": ["Mefenamic Acid (Ponstan)", "Ibuprofen"],
    "dysmenorrhea": ["Mefenamic Acid (Ponstan)", "Ibuprofen"],
    "fibromyalgia": ["Ibuprofen", "Paracetamol"],
    "fracture": ["Ibuprofen", "Paracetamol", "Calcium"],
    # Cardiovascular
    "hypertension": ["Amlodipine", "Losartan", "Enalapril", "Atenolol"],
    "high blood pressure": ["Amlodipine", "Losartan", "Enalapril", "Atenolol"],
    "heart failure": ["Furosemide (Lasix)", "Enalapril", "Aspirin"],
    "angina": ["Aspirin", "Atenolol", "Amlodipine"],
    "atrial fibrillation": ["Aspirin", "Atenolol"],
    "stroke": ["Aspirin", "Clopidogrel (Plavix)", "Atorvastatin"],
    "transient ischemic attack": ["Aspirin", "Clopidogrel (Plavix)", "Atorvastatin"],
    "cholesterol": ["Atorvastatin"],
    "hyperlipidemia": ["Atorvastatin"],
    "edema": ["Furosemide (Lasix)"],
    # Diabetes
    "diabetes": ["Metformin", "Gliclazide", "Glibenclamide (Daonil)"],
    "type 2 diabetes": ["Metformin", "Sitagliptin (Januvia)", "Gliclazide"],
    # Skin
    "eczema": ["Betamethasone (Skin Cream)", "Cetirizine", "Prednisolone"],
    "dermatitis": ["Betamethasone (Skin Cream)", "Cetirizine"],
    "psoriasis": ["Betamethasone (Skin Cream)", "Prednisolone"],
    "urticaria": ["Cetirizine", "Loratadine (Claritin)", "Prednisolone"],
    "hives": ["Cetirizine", "Loratadine (Claritin)"],
    "ringworm": ["Clotrimazole (Canesten)"],
    "athlete foot": ["Clotrimazole (Canesten)"],
    "athlete's foot": ["Clotrimazole (Canesten)"],
    "itching": ["Cetirizine", "Betamethasone (Skin Cream)"],
    "allergy": ["Cetirizine", "Loratadine (Claritin)", "Prednisolone"],
    "allergic reaction": ["Cetirizine", "Prednisolone", "Dexamethasone"],
    "anaphylaxis": ["Dexamethasone", "Prednisolone"],
    "cellulitis": ["Amoxicillin", "Ibuprofen"],
    "abscess": ["Amoxicillin", "Ciprofloxacin", "Metronidazole (Flagyl)"],
    # Infections
    "bacterial infection": ["Amoxicillin", "Ciprofloxacin", "Azithromycin"],
    "malaria": ["Chloroquine"],
    "dengue": ["Paracetamol", "Oral Rehydration Salts (ORS)"],
    "urinary tract infection": ["Ciprofloxacin", "Cefixime (Zifi)"],
    "uti": ["Ciprofloxacin", "Cefixime (Zifi)"],
    "pyelonephritis": ["Ciprofloxacin", "Amoxicillin", "Paracetamol"],
    "ear infection": ["Amoxicillin", "Ciprofloxacin", "Paracetamol"],
    "conjunctivitis": ["Chloramphenicol"],
    "tonsillitis": ["Amoxicillin", "Paracetamol", "Ibuprofen"],
    "pharyngitis": ["Amoxicillin", "Paracetamol"],
    "sore throat": ["Paracetamol", "Amoxicillin"],
    "gonorrhea": ["Cefixime (Zifi)", "Azithromycin"],
    # Women's Health
    "vaginal infection": ["Clotrimazole (Canesten)", "Metronidazole (Flagyl)", "Fluconazole (Diflucan)"],
    "yeast infection": ["Fluconazole (Diflucan)", "Clotrimazole (Canesten)"],
    "vaginitis": ["Metronidazole (Flagyl)", "Clotrimazole (Canesten)"],
    "candidiasis": ["Fluconazole (Diflucan)", "Clotrimazole (Canesten)"],
    "endometriosis": ["Ibuprofen", "Mefenamic Acid (Ponstan)"],
    "menstrual": ["Mefenamic Acid (Ponstan)", "Ibuprofen"],
    "pregnancy": ["Ferrous Sulfate (Sangobion)", "Multivitamins"],
    # Nutrition
    "anemia": ["Ferrous Sulfate (Sangobion)", "Vitamin B-complex (Neurobion)"],
    "iron deficiency": ["Ferrous Sulfate (Sangobion)"],
    "vitamin deficiency": ["Multivitamins", "Vitamin B-complex (Neurobion)", "Enervon-C"],
    "malnutrition": ["Multivitamins", "Ferrous Sulfate (Sangobion)"],
    "neuropathy": ["Vitamin B-complex (Neurobion)"],
    # Other
    "osteoporosis": ["Calcium"],
    "hypothyroidism": ["Levothyroxine"],
    "hyperthyroidism": ["Atenolol"],
    "glaucoma": ["Timolol Eye Drops", "Latanoprost"],
    "mumps": ["Paracetamol", "Ibuprofen"],
    "measles": ["Paracetamol"],
    "chickenpox": ["Paracetamol", "Cetirizine"],
    "panic disorder": ["Fluoxetine"],
    # Kidney / Urinary
    "kidney stone": ["Ibuprofen", "Tamsulosin"],
    "renal stone": ["Ibuprofen", "Tamsulosin"],
    "kidney failure": ["Furosemide (Lasix)", "Enalapril"],
    "chronic kidney": ["Furosemide (Lasix)", "Enalapril", "Amlodipine"],
    "nephrotic": ["Furosemide (Lasix)", "Prednisolone"],
    "nephritis": ["Prednisolone", "Furosemide (Lasix)"],
    "bladder infection": ["Ciprofloxacin", "Cefixime (Zifi)"],
    "urethritis": ["Ciprofloxacin", "Azithromycin"],
    # Liver / GI
    "hepatitis": ["Paracetamol", "Vitamin B-complex (Neurobion)"],
    "liver cirrhosis": ["Furosemide (Lasix)", "Spironolactone"],
    "fatty liver": ["Atorvastatin", "Metformin"],
    "jaundice": ["Paracetamol", "Vitamin B-complex (Neurobion)"],
    "pancreatitis": ["Paracetamol", "Ibuprofen"],
    "appendicitis": ["Amoxicillin", "Metronidazole (Flagyl)"],
    "irritable bowel": ["Loperamide (Imodium)", "Domperidone (Motilium)"],
    "colitis": ["Prednisolone", "Metronidazole (Flagyl)"],
    "crohn": ["Prednisolone", "Azathioprine"],
    "hemorrhoid": ["Ibuprofen", "Bisacodyl"],
    "constipation": ["Bisacodyl", "Loperamide (Imodium)"],
    "bloating": ["Domperidone (Motilium)", "Kremil-S"],
    "flatulence": ["Kremil-S", "Domperidone (Motilium)"],
    "gallbladder": ["Ibuprofen", "Ursodeoxycholic Acid"],
    "gallstone": ["Ibuprofen"],
    # Neurological
    "epilepsy": ["Valproic Acid", "Carbamazepine"],
    "seizure": ["Valproic Acid", "Diazepam"],
    "meningitis": ["Ceftriaxone", "Dexamethasone", "Paracetamol"],
    "encephalitis": ["Acyclovir", "Dexamethasone"],
    "parkinson": ["Levodopa"],
    "alzheimer": ["Donepezil"],
    "dementia": ["Donepezil"],
    "multiple sclerosis": ["Prednisolone"],
    "neuropathy": ["Vitamin B-complex (Neurobion)", "Gabapentin"],
    "neuralgia": ["Carbamazepine", "Gabapentin"],
    "vertigo": ["Dimenhydrinate", "Betahistine"],
    "dizziness": ["Dimenhydrinate", "Betahistine"],
    # Mental Health
    "depression": ["Fluoxetine", "Amitriptyline"],
    "anxiety": ["Diazepam", "Buspirone"],
    "insomnia": ["Melatonin", "Diazepam"],
    "bipolar": ["Valproic Acid"],
    "schizophrenia": ["Haloperidol"],
    "adhd": ["Methylphenidate"],
    "attention deficit": ["Methylphenidate"],
    # Eye / ENT
    "dry eye": ["Artificial Tears"],
    "eye infection": ["Ciprofloxacin Eye Drops", "Chloramphenicol"],
    "cataracts": ["Eye Vitamins"],
    "hearing loss": ["Vitamin B-complex (Neurobion)"],
    "tinnitus": ["Betahistine"],
    "otitis": ["Amoxicillin", "Ciprofloxacin", "Paracetamol"],
    # Autoimmune / Inflammatory
    "lupus": ["Prednisolone", "Hydroxychloroquine"],
    "scleroderma": ["Prednisolone"],
    "vasculitis": ["Prednisolone", "Azathioprine"],
    "polymyalgia": ["Prednisolone"],
    "gout": ["Allopurinol", "Diclofenac (Voltaren)", "Ibuprofen"],
    # Bone / Muscle
    "osteomyelitis": ["Ciprofloxacin", "Cloxacillin"],
    "osteoarthritis": ["Ibuprofen", "Diclofenac (Voltaren)", "Paracetamol"],
    "tendinitis": ["Ibuprofen", "Diclofenac (Voltaren)"],
    "bursitis": ["Ibuprofen", "Prednisolone"],
    "sprain": ["Ibuprofen", "Diclofenac (Voltaren)"],
    "strain": ["Ibuprofen", "Paracetamol"],
    "rotator cuff": ["Ibuprofen", "Paracetamol"],
    # Endocrine
    "hypoglycemia": ["Glucose", "Glucagon"],
    "thyroid": ["Levothyroxine"],
    "polycystic ovary": ["Metformin"],
    "pcos": ["Metformin"],
    "cushing": ["Prednisolone"],
    "addison": ["Prednisolone"],
    # Respiratory (more)
    "pulmonary embolism": ["Warfarin", "Heparin"],
    "pleural effusion": ["Furosemide (Lasix)", "Prednisolone"],
    "tuberculosis": ["Rifampicin", "Isoniazid", "Pyrazinamide"],
    "pneumothorax": ["Paracetamol", "Ibuprofen"],
    "whooping cough": ["Azithromycin", "Paracetamol"],
    "pertussis": ["Azithromycin"],
    "croup": ["Dexamethasone", "Paracetamol"],
    # Infectious disease
    "sepsis": ["Ciprofloxacin", "Ceftriaxone"],
    "tetanus": ["Diazepam", "Metronidazole (Flagyl)"],
    "rabies": ["Rabies vaccine"],
    "leptospirosis": ["Penicillin", "Doxycycline"],
    "typhus": ["Doxycycline"],
    "brucellosis": ["Doxycycline", "Rifampicin"],
    "anthrax": ["Ciprofloxacin", "Doxycycline"],
    "plague": ["Doxycycline", "Ciprofloxacin"],
    # Skin (more)
    "acne": ["Benzoyl Peroxide", "Doxycycline", "Clindamycin"],
    "rosacea": ["Metronidazole (Flagyl)", "Doxycycline"],
    "impetigo": ["Amoxicillin", "Cloxacillin"],
    "scabies": ["Permethrin Cream"],
    "lice": ["Permethrin Shampoo"],
    "wart": ["Salicylic Acid"],
    "molluscum": ["Salicylic Acid"],
    "alopecia": ["Minoxidil"],
    "hair loss": ["Minoxidil"],
    "burn": ["Paracetamol", "Silver Sulfadiazine"],
    "wound infection": ["Amoxicillin", "Ciprofloxacin"],
    # Cardiovascular (more)
    "arrhythmia": ["Atenolol", "Amiodarone"],
    "bradycardia": ["Atropine"],
    "tachycardia": ["Atenolol"],
    "pericarditis": ["Ibuprofen", "Colchicine"],
    "myocarditis": ["Ibuprofen", "Prednisolone"],
    "raynaud": ["Amlodipine", "Nifedipine"],
    "varicose": ["Ibuprofen"],
    # Reproductive (more)
    "prostatitis": ["Ciprofloxacin", "Doxycycline"],
    "prostate": ["Tamsulosin", "Finasteride"],
    "erectile": ["Sildenafil"],
    "infertility": ["Clomiphene", "Metformin"],
    "pelvic inflammatory": ["Metronidazole (Flagyl)", "Azithromycin", "Ciprofloxacin"],
    # Pediatric
    "diaper rash": ["Clotrimazole (Canesten)", "Zinc Oxide Cream"],
    "colic": ["Simethicone"],
    "teething": ["Paracetamol"],
    "jaundice neonatal": ["Phototherapy"],
    "febrile seizure": ["Paracetamol", "Diazepam"],
}

def get_all_medicine_names(medicines_en):
    """medicines.json ထဲမှာ ရှိတဲ့ medicine name list ကို extract လုပ်သည်"""
    names = []
    for m in medicines_en:
        full_name = m["name"]
        names.append(full_name)
        base_name = re.sub(r'\s*\(.*?\)', '', full_name).strip()
        if base_name and base_name != full_name:
            names.append(base_name)
        match = re.search(r'\((.*?)\)', full_name)
        if match:
            inner = match.group(1).strip()
            names.append(inner)
    seen = set()
    unique = []
    for n in names:
        if n.lower() not in seen:
            seen.add(n.lower())
            unique.append(n)
    return unique

def find_medications_for_disease(disease_name, recommendation, medicine_names):
    """
    Disease name + recommendation ကို ကြည့်ပြီး relevant medications တွေ ရှာသည်:
    1. DISEASE_MED_MAP မှာ disease name ကို match လုပ်ကြည့်
    2. recommendation string ထဲမှာ medicine name ပါမပါ စစ်ကြည့်
    """
    found_meds = set()

    disease_lower = disease_name.lower()
    rec_lower = recommendation.lower()

    # Step 1: Map-based matching (disease name)
    for keyword, meds in DISEASE_MED_MAP.items():
        if keyword in disease_lower:
            for med in meds:
                found_meds.add(med)
            break  # Stop at first disease keyword match

    # Step 2: Recommendation-based matching (medicine name in recommendation)
    for med_name in medicine_names:
        base = re.sub(r'\s*\(.*?\)', '', med_name).strip().lower()
        brand_match = re.search(r'\((.*?)\)', med_name)
        brand = brand_match.group(1).strip().lower() if brand_match else None

        if base and len(base) >= 5 and base in rec_lower:
            found_meds.add(med_name)
        elif brand and len(brand) >= 5 and brand in rec_lower:
            found_meds.add(med_name)

    # Step 3: Generic term matching (recommendation mentions categories, not specific names)
    GENERIC_MAP = {
        "pain reliever": ["Paracetamol", "Ibuprofen"],
        "pain medication": ["Paracetamol", "Ibuprofen"],
        "pain management": ["Paracetamol", "Ibuprofen"],
        "analgesic": ["Paracetamol", "Ibuprofen"],
        "anti-inflammatory": ["Ibuprofen", "Diclofenac (Voltaren)"],
        "nsaid": ["Ibuprofen", "Diclofenac (Voltaren)"],
        "antibiotic": ["Amoxicillin", "Azithromycin"],
        "antidepressant": ["Fluoxetine", "Amitriptyline"],
        "anticonvulsant": ["Carbamazepine", "Valproic Acid"],
        "anti-nausea": ["Domperidone (Motilium)"],
        "antiemetic": ["Domperidone (Motilium)"],
        "antacid": ["Kremil-S", "Gaviscon"],
        "proton pump inhibitor": ["Omeprazole", "Pantoprazole"],
        "antihistamine": ["Cetirizine", "Loratadine (Claritin)"],
        "bronchodilator": ["Salbutamol (Ventolin)"],
        "corticosteroid": ["Prednisolone", "Dexamethasone"],
        "steroid": ["Prednisolone", "Dexamethasone"],
        "diuretic": ["Furosemide (Lasix)"],
        "beta blocker": ["Atenolol"],
        "calcium channel blocker": ["Amlodipine"],
        "ace inhibitor": ["Enalapril"],
        "statin": ["Atorvastatin"],
        "antiplatelet": ["Aspirin", "Clopidogrel (Plavix)"],
        "anticoagulant": ["Aspirin", "Warfarin"],
        "antifungal": ["Fluconazole (Diflucan)", "Clotrimazole (Canesten)"],
        "antiviral": ["Acyclovir"],
        "mucolytic": ["Carbocisteine (Solmux)", "Bromhexine (Bisolvon)"],
        "iron supplement": ["Ferrous Sulfate (Sangobion)"],
        "vitamin supplement": ["Multivitamins", "Enervon-C"],
        "oral rehydration": ["Oral Rehydration Salts (ORS)"],
        "rehydration": ["Oral Rehydration Salts (ORS)"],
        "topical steroid": ["Betamethasone (Skin Cream)"],
        "muscle relaxant": ["Diazepam"],
        "sedative": ["Diazepam"],
        "antispasmodic": ["Domperidone (Motilium)"],
        "laxative": ["Bisacodyl"],
        "fever reducer": ["Paracetamol"],
        "antipyretic": ["Paracetamol"],
    }
    for term, meds in GENERIC_MAP.items():
        if term in rec_lower:
            for med in meds:
                found_meds.add(med)

    return sorted(list(found_meds))

def build_mm_med_map(medicines_mm):
    """medicines_mm.json ကို EN->MM mapping dict ဆောက်သည်"""
    mm_map = {}
    for m in medicines_mm:
        full_name = m.get("name", "")
        match = re.search(r'\((.*?)\)', full_name)
        if match:
            en_name = match.group(1).lower().strip()
            mm_map[en_name] = full_name
        base = re.sub(r'\s*\(.*?\)', '', full_name).strip().lower()
        if base:
            mm_map[base] = full_name
    return mm_map

def map_to_mm(med_name, mm_map):
    """English medicine name ကို Myanmar name ပြောင်းသည်"""
    base = re.sub(r'\s*\(.*?\)', '', med_name).strip().lower()
    brand_match = re.search(r'\((.*?)\)', med_name)
    brand = brand_match.group(1).strip().lower() if brand_match else None

    if med_name.lower() in mm_map:
        return mm_map[med_name.lower()]
    if base in mm_map:
        return mm_map[base]
    if brand and brand in mm_map:
        return mm_map[brand]
    return med_name  # fallback to English

def run():
    with open(DISEASES_EN_PATH, "r", encoding="utf-8") as f:
        diseases_en = json.load(f)
    with open(MEDICINES_EN_PATH, "r", encoding="utf-8") as f:
        medicines_en = json.load(f)
    with open(MEDICINES_MM_PATH, "r", encoding="utf-8") as f:
        medicines_mm = json.load(f)
    with open(DISEASES_MM_PATH, "r", encoding="utf-8") as f:
        diseases_mm = json.load(f)

    medicine_names = get_all_medicine_names(medicines_en)
    mm_med_map = build_mm_med_map(medicines_mm)

    print(f"Loaded {len(diseases_en)} diseases, {len(medicine_names)} medicine names")

    en_updated = 0
    mm_updated = 0

    # === Update diseases.json (English) ===
    for disease in diseases_en:
        existing_meds = disease.get("medications", [])
        if existing_meds:
            continue  # Skip if already has medications

        name = disease.get("name", "")
        rec = disease.get("recommendation", "")
        meds = find_medications_for_disease(name, rec, medicine_names)

        if meds:
            disease["medications"] = meds
            en_updated += 1

    with open(DISEASES_EN_PATH, "w", encoding="utf-8") as f:
        json.dump(diseases_en, f, ensure_ascii=False, indent=2)

    print(f"diseases.json updated: {en_updated} diseases got medications")

    # === Update diseases_mm.json (Myanmar) ===
    if len(diseases_en) == len(diseases_mm):
        for en_d, mm_d in zip(diseases_en, diseases_mm):
            existing_meds_mm = mm_d.get("medications", [])
            en_meds = en_d.get("medications", [])

            if existing_meds_mm or not en_meds:
                continue

            mm_meds = [map_to_mm(m, mm_med_map) for m in en_meds]
            mm_d["medications"] = mm_meds
            mm_updated += 1

        with open(DISEASES_MM_PATH, "w", encoding="utf-8") as f:
            json.dump(diseases_mm, f, ensure_ascii=False, indent=2)

        print(f"diseases_mm.json updated: {mm_updated} diseases got medications")
    else:
        print(f"WARNING: diseases_en ({len(diseases_en)}) and diseases_mm ({len(diseases_mm)}) count mismatch!")

    # Summary
    total_with_meds = sum(1 for d in diseases_en if d.get("medications"))
    total_empty = sum(1 for d in diseases_en if not d.get("medications"))
    print(f"\n=== Final Summary ===")
    print(f"Total diseases: {len(diseases_en)}")
    print(f"With medications: {total_with_meds}")
    print(f"Still empty: {total_empty}")

    print(f"\n=== Sample Results ===")
    count = 0
    for d in diseases_en:
        meds = d.get("medications", [])
        if meds and count < 10:
            print(f"  {d['name']}: {meds}")
            count += 1

if __name__ == "__main__":
    run()
