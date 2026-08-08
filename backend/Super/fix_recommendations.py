"""
fix_recommendations.py
========================
diseases_mm.json ရဲ့ recommendation field တွေကို
English recommendation ကို အခြေခံပြီး ကောင်းမွန်တဲ့ Myanmar recommendation ပြန်ရေးပေးသည်။
diseases.json ရဲ့ empty/nan recommendation တွေကိုလည်း fix လုပ်ပေးသည်။
"""
import json
import re
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

DATA_DIR = r"c:\VirtualDoctor\backend\data"

# ====================================================================
# English medical term -> Myanmar translation dictionary
# ====================================================================
TERM_MAP = {
    # Treatment methods
    "surgery": "ခွဲစိတ်ကုသမှု",
    "surgical excision": "ခွဲစိတ်ဖယ်ရှားမှု",
    "surgical removal": "ခွဲစိတ်ဖယ်ရှားမှု",
    "surgical intervention": "ခွဲစိတ်ကုသမှု",
    "surgical drainage": "ခွဲစိတ်အရည်ထုတ်ခြင်း",
    "surgical repair": "ခွဲစိတ်ပြုပြင်ခြင်း",
    "radiation therapy": "ဓာတ်ရောင်ခြည်ကုသမှု",
    "chemotherapy": "ဓာတုကုထုံးဆေးဝါးကုသမှု",
    "immunotherapy": "ကိုယ်ခံအားကုထုံး",
    "targeted therapy": "ပစ်မှတ်ထားကုထုံး",
    "physical therapy": "ကာယကုထုံး",
    "occupational therapy": "အလုပ်အကိုင်ကုထုံး",
    "speech therapy": "စကားပြောကုထုံး",
    "psychotherapy": "စိတ်ပိုင်းဆိုင်ရာကုထုံး",
    "cognitive behavioral therapy": "အသိပညာဆိုင်ရာအပြုအမူကုထုံး (CBT)",
    "behavioral therapy": "အပြုအမူကုထုံး",
    "rehabilitation": "ပြန်လည်ထူထောင်ရေး",
    "dialysis": "ကျောက်ကပ်ဆေးဆေးခြင်း",
    "hemodialysis": "သွေးသန့်စင်ခြင်း",
    "blood transfusion": "သွေးသွင်းခြင်း",
    "organ transplant": "ကိုယ်အင်္ဂါအစားထိုးခြင်း",
    "bone marrow transplant": "ရိုးတွင်းခြင်ဆီအစားထိုးခြင်း",
    
    # Medications / Drug categories
    "antibiotics": "ပဋိဇီဝဆေးများ",
    "antibiotic": "ပဋိဇီဝဆေး",
    "antiviral": "ဗိုင်းရပ်စ်ဆန့်ကျင်ဆေး",
    "antifungal": "မှိုသတ်ဆေး",
    "antiparasitic": "ပရာဆိုက်သတ်ဆေး",
    "antidepressant": "စိတ်ကျရောဂါဆေး",
    "antidepressant medications": "စိတ်ကျရောဂါဆေးများ",
    "anticonvulsant": "တက်ခြင်းဆန့်ကျင်ဆေး",
    "antihistamine": "ဓာတ်မတည့်မှုဆေး",
    "anti-inflammatory": "ရောင်ရမ်းမှုသက်သာဆေး",
    "pain medications": "အကိုက်အခဲပျောက်ဆေးများ",
    "pain management": "နာကျင်မှုသက်သာအောင်ဆောင်ရွက်ခြင်း",
    "pain relievers": "အကိုက်အခဲပျောက်ဆေးများ",
    "analgesics": "အကိုက်အခဲပျောက်ဆေးများ",
    "corticosteroids": "ကော်တီကိုစတီရွိုက်ဆေးများ",
    "steroids": "စတီရွိုက်ဆေးများ",
    "nsaids": "အဆစ်ရောင်ဆေးများ (NSAIDs)",
    "bronchodilator": "ရှူလမ်းကြောင်းချဲ့ဆေး",
    "diuretic": "ဆီးသွားဆေး",
    "insulin": "အင်ဆူလင်",
    "topical treatments": "အသားအရေအပေါ်လိမ်းဆေးများ",
    "topical cream": "လိမ်းဆေး",
    "eye drops": "မျက်စိချိုးဆေးရည်",
    "oral medications": "သောက်ဆေးများ",
    "intravenous": "သွေးကြောထဲသို့ဆေးထိုးခြင်း",
    "injection": "ဆေးထိုးခြင်း",
    "vaccine": "ကာကွယ်ဆေး",
    "vaccination": "ကာကွယ်ဆေးထိုးခြင်း",
    "mmr": "MMR ကာကွယ်ဆေး",
    
    # Supportive care
    "supportive care": "အထောက်အကူပြုစောင့်ရှောက်မှု",
    "supportive measures": "အထောက်အကူပြုစောင့်ရှောက်မှု",
    "conservative measures": "ခွဲစိတ်မလိုသောကုသနည်းများ",
    "bed rest": "အနားယူခြင်း",
    "rest": "အနားယူခြင်း",
    "hydration": "ရေဓာတ်ဖြည့်တင်းခြင်း",
    "fluid replacement": "ရေဓာတ်ဖြည့်တင်းခြင်း",
    "intravenous fluids": "သွေးကြောထဲသို့ ရေရည်သွင်းခြင်း",
    "nutritional counseling": "အာဟာရဆိုင်ရာ အကြံပေးခြင်း",
    "nutritional support": "အာဟာရ ထောက်ပံ့ခြင်း",
    "dietary modifications": "အစားအစာ ပြုပြင်ပြောင်းလဲခြင်း",
    "lifestyle modifications": "နေထိုင်မှုပုံစံ ပြုပြင်ပြောင်းလဲခြင်း",
    "warm compresses": "ရေနွေးအုပ်ခြင်း",
    "cold compresses": "ရေအေးအုပ်ခြင်း",
    "ice therapy": "ရေခဲကပ်ခြင်း",
    "elevation": "မြှင့်တင်ထားခြင်း",
    "immobilization": "မလှုပ်ရှားအောင်ထိန်းသိမ်းခြင်း",
    "splint": "စပလင့်တပ်ခြင်း",
    "wrist splints": "လက်ကောက်ဝတ် စပလင့်တပ်ခြင်း",
    
    # Monitoring
    "monitoring": "စောင့်ကြည့်စစ်ဆေးခြင်း",
    "medical monitoring": "ဆေးဘက်ဆိုင်ရာ စောင့်ကြည့်စစ်ဆေးခြင်း",
    "observation": "စောင့်ကြည့်ခြင်း",
    "blood pressure monitoring": "သွေးပေါင်ချိန် တိုင်းတာစောင့်ကြည့်ခြင်း",
    "blood tests": "သွေးစစ်ခြင်း",
    "regular check-ups": "ပုံမှန်ကျန်းမာရေးစစ်ဆေးခြင်း",
    "regular follow-up": "ပုံမှန်ပြန်လာစစ်ဆေးခြင်း",
    "prenatal visits": "ကိုယ်ဝန်ဆေးစစ်ခြင်း",
    "ultrasound": "အာထရာဆောင်းစစ်ဆေးခြင်း",
    
    # Specific treatments
    "voice rest": "အသံအနားယူခြင်း",
    "gastric decontamination": "အစာအိမ်သန့်စင်ခြင်း",
    "antidote administration": "အဆိပ်ဖြေဆေးပေးခြင်း",
    "epidural blood patch": "ခါးရိုးထဲသွေးထိုးကုသခြင်း",
    "glasses": "မျက်မှန်တပ်ခြင်း",
    "patching therapy": "မျက်စိဖုံးကုထုံး",
    "vision therapy": "အမြင်အာရုံကုထုံး",
    "botox injections": "ဘိုတောက်ဆေးထိုးခြင်း",
    "growth hormone therapy": "ကြီးထွားမှုဟော်မုန်းကုထုံး",
    "estrogen replacement therapy": "အီစထရိုဂျင်အစားထိုးကုထုံး",
    "hormone therapy": "ဟော်မုန်းကုထုံး",
    "insulin therapy": "အင်ဆူလင်ကုထုံး",
    "blood sugar control": "သွေးတွင်းသကြားဓာတ်ထိန်းချုပ်ခြင်း",
    "blood pressure control": "သွေးပေါင်ချိန်ထိန်းချုပ်ခြင်း",
    "cholesterol management": "ကိုလက်စထရော ထိန်းချုပ်ခြင်း",
    "stress management": "စိတ်ဖိစီးမှုထိန်းချုပ်ခြင်း",
    "relaxation techniques": "အနားယူစိတ်ငြိမ်နည်းများ",
    "biofeedback": "ဇီဝတုံ့ပြန်ချက်ကုထုံး",
    "exercise": "လေ့ကျင့်ခန်းလုပ်ခြင်း",
    "exercise programs": "လေ့ကျင့်ခန်းအစီအစဉ်များ",
    "gentle stretching": "ဖြည်းညင်းစွာ ဆန့်ခြင်း",
    "weight management": "ကိုယ်အလေးချိန်ထိန်းချုပ်ခြင်း",
    "wound care": "ဒဏ်ရာစောင့်ရှောက်ခြင်း",
    "isolation": "သီးခြားခွဲထားခြင်း",
    "oxygen therapy": "အောက်ဆီဂျင်ကုထုံး",
    "airway management": "လေလမ်းကြောင်းထိန်းသိမ်းခြင်း",
    "phototherapy": "အလင်းရောင်ကုထုံး",
    "nerve blocks": "အာရုံကြော ပိတ်ဆို့ကုသခြင်း",
    "trigger point injections": "အမှတ်ထိုးကုသခြင်း",
    
    # General
    "consult a doctor": "ဆရာဝန်နှင့်တိုင်ပင်ပါ",
    "seek medical advice": "ဆေးဘက်ဆိုင်ရာအကြံဉာဏ်ရယူပါ",
    "hospitalization": "ဆေးရုံတက်ကုသခြင်း",
    "emergency": "အရေးပေါ်ကုသခြင်း",
    "early intervention": "အစောပိုင်းကုသခြင်း",
    "support groups": "ပံ့ပိုးကူညီရေးအဖွဲ့များ",
}

def translate_recommendation(en_rec):
    """English recommendation ကို Myanmar ဘာသာပြန်သည်"""
    if not en_rec or en_rec == "nan":
        return "ဆရာဝန်နှင့် တိုင်ပင်ဆွေးနွေးပြီး သင့်တော်သော ကုသမှုခံယူပါ။"
    
    # Split by commas to get individual recommendation items
    parts = [p.strip() for p in en_rec.replace(";", ",").split(",")]
    
    translated_parts = []
    for part in parts:
        if not part:
            continue
        
        part_lower = part.lower().strip()
        translated = False
        
        # Try exact match first
        if part_lower in TERM_MAP:
            translated_parts.append(TERM_MAP[part_lower])
            translated = True
            continue
        
        # Try longest match
        result = part_lower
        sorted_keys = sorted(TERM_MAP.keys(), key=len, reverse=True)
        matches_found = 0
        for key in sorted_keys:
            if key in result:
                result = result.replace(key, TERM_MAP[key])
                matches_found += 1
        
        if matches_found > 0:
            # Clean up: remove leftover English if there's Myanmar
            has_myanmar = bool(re.search(r'[\u1000-\u109F]', result))
            if has_myanmar:
                # Remove stray English words but keep medicine names
                cleaned = re.sub(r'\b[a-z]{1,4}\b', '', result)  # remove short English words
                cleaned = re.sub(r'\s+', ' ', cleaned).strip(' ,.-()/')
                if cleaned:
                    translated_parts.append(cleaned)
                else:
                    translated_parts.append(result.strip())
            else:
                translated_parts.append(part.strip())
        else:
            # No translation found - keep original English (medical terms are ok)
            translated_parts.append(part.strip())
    
    if translated_parts:
        result = "၊ ".join(translated_parts)
        # Clean up excess punctuation
        result = re.sub(r'[,\s]*၊\s*၊', '၊', result)
        result = result.strip(' ,.')
        if not result.endswith('။') and not result.endswith('ပါ'):
            result += "။"
        return result
    
    return "ဆရာဝန်နှင့် တိုင်ပင်ဆွေးနွေးပြီး သင့်တော်သော ကုသမှုခံယူပါ။"

def is_bad_mm_rec(rec):
    """Check if Myanmar recommendation is bad/garbage"""
    if not rec or rec == "nan" or len(rec) < 5:
        return True
    if rec in ["ဆေးဝါး", "ခွဲစိတ်ကုသခြင်း", "နားနားနေနေနေပါ"]:
        return True
    if "ဆရာဝန်နှင့် တိုင်ပင်ဆွေးနွေးပြီး လိုအပ်သော ဆေးဝါးများကို သောက်သုံးပါ" in rec:
        return True
    # Garbage check: mostly punctuation
    cleaned = rec.replace(",", "").replace(".", "").replace("(", "").replace(")", "").replace(" ", "").replace("-", "").replace("/", "")
    if len(cleaned) < 8:
        return True
    # Too many commas with few Myanmar chars
    mm_chars = len(re.findall(r'[\u1000-\u109F]', rec))
    if mm_chars < 5 and len(rec) > 10:
        return True
    return False

def run():
    with open(f"{DATA_DIR}/diseases.json", "r", encoding="utf-8") as f:
        en_data = json.load(f)
    with open(f"{DATA_DIR}/diseases_mm.json", "r", encoding="utf-8") as f:
        mm_data = json.load(f)

    # Fix English recommendations
    en_fixed = 0
    for d in en_data:
        rec = d.get("recommendation", "")
        if not rec or rec == "nan":
            d["recommendation"] = "Consult a doctor for proper diagnosis and treatment."
            en_fixed += 1

    # Fix Myanmar recommendations
    mm_fixed = 0
    for i, mm_d in enumerate(mm_data):
        mm_rec = mm_d.get("recommendation", "")
        en_rec = en_data[i].get("recommendation", "") if i < len(en_data) else ""
        
        if is_bad_mm_rec(mm_rec):
            new_rec = translate_recommendation(en_rec)
            mm_d["recommendation"] = new_rec
            mm_fixed += 1

    # Save
    with open(f"{DATA_DIR}/diseases.json", "w", encoding="utf-8") as f:
        json.dump(en_data, f, ensure_ascii=False, indent=2)
    with open(f"{DATA_DIR}/diseases_mm.json", "w", encoding="utf-8") as f:
        json.dump(mm_data, f, ensure_ascii=False, indent=2)

    print(f"EN fixed: {en_fixed}")
    print(f"MM fixed: {mm_fixed}")

    # Verify
    bad_count = sum(1 for d in mm_data if is_bad_mm_rec(d.get("recommendation", "")))
    print(f"Remaining bad MM: {bad_count}")

    # Show samples
    print("\n=== Sample fixed MM recommendations ===")
    count = 0
    for i, mm_d in enumerate(mm_data):
        if count >= 15:
            break
        en_name = en_data[i]["name"] if i < len(en_data) else "?"
        mm_rec = mm_d.get("recommendation", "")
        if len(mm_rec) > 20:
            print(f"  {en_name}: {mm_rec[:100]}")
            count += 1

if __name__ == "__main__":
    run()
