import json, os, sys

NEW_DISEASES_MM = [
    {
        "name": "ကျောအောင့်ခြင်းနှင့် ကြွက်သားဒဏ်ဖြစ်ခြင်း (Back Muscle Strain & Sprain)",
        "description": "ကျောအောင့်ခြင်းနှင့် ကြွက်သားဒဏ်ဖြစ်ခြင်း (Back Muscle Strain) သည် နောက်ကျောအောင့်ခြင်း၊ ကျောနာခြင်း၊ ကိုယ်လက်ကိုက်ခဲခြင်း၊ ကြွက်သားများ နာကျင်ကိုက်ခဲခြင်း စသည့် လက္ခဏာများ ဖြစ်ပွားတတ်သော ရောဂါအခြေအနေ ဖြစ်ပါသည်။",
        "symptoms": [
            "နောက်ကျောအောင့်ခြင်း",
            "ကျောအောင့်ခြင်း",
            "ခါးနာခြင်း",
            "ကိုယ်လက်ကိုက်ခဲခြင်း",
            "ကြွက်သားများ နာကျင်ကိုက်ခဲခြင်း",
            "အကြောတက်ခြင်း",
            "ထိလျှင်နာကျင်ခြင်း"
        ],
        "precautions": [
            "အလေးအပင် မ,ခြင်းကို ရှောင်ကြဉ်ပါ",
            "မှန်ကန်သော ကိုယ်နေဟန်ထားဖြင့် ထိုင်ပါ",
            "လုံလောက်စွာ အနားယူပါ",
            "ရေနွေးဝတ် သို့မဟုတ် ရေခဲဝတ် ကပ်ပေးပါ"
        ],
        "recommendation": "အနားယူခြင်း, အပူ သို့မဟုတ် အအေး ကပ်ပေးခြင်း, အကိုက်အခဲ သက်သာစေရန် ဆေးဝါးများ သောက်သုံးခြင်း, ပေါ့ပေါ့ပါးပါး အကြောလျှော့ လေ့ကျင့်ခန်း ပြုလုပ်ခြင်း, လိုအပ်ပါက ကာယကုထုံး ခံယူခြင်း",
        "medications": [
            "ပါရာစီတမော (Paracetamol)",
            "အိုင်ဗျူပရိုဖင် (Ibuprofen)",
            "ဒိုင်ကလိုဖီနက် (Diclofenac)"
        ]
    },
    {
        "name": "ဇက်နှင့် ကျောရိုးအကြောတက်ခြင်း (Upper Back Pain & Postural Strain)",
        "description": "ဇက်နှင့် ကျောရိုးအကြောတက်ခြင်း (Upper Back Pain) သည် ကွန်ပျူတာ/ဖုန်း အကြည့်များခြင်း၊ ရုံးထိုင်များခြင်းတို့ကြောင့် နောက်ကျောအောင့်ခြင်း၊ ဇက်ကိုက်ခြင်း၊ ကျောရိုးအကြောတင်းခြင်း လက္ခဏာများ ဖြစ်ပွားတတ်သော ရောဂါအခြေအနေ ဖြစ်ပါသည်။",
        "symptoms": [
            "နောက်ကျောအောင့်ခြင်း",
            "ကျောနာခြင်း",
            "ဇက်ဆစ်ရိုးနာခြင်း",
            "ပခုံးနာကျင်ခြင်း",
            "ကြွက်သားများ နာကျင်ကိုက်ခဲခြင်း",
            "ခေါင်းအုံခေါင်းကိုက်ခြင်း"
        ],
        "precautions": [
            "ကွန်ပျူတာ/ဖုန်း ကြည့်ချိန်များပါက ၁ နာရီတစ်ခါ အကြောလျှော့ပါ",
            "ကျောဆန့်၍ ထိုင်ပါ",
            "ခေါင်းအုံး အမြင့်ကြီး မအုံးပါနှင့်"
        ],
        "recommendation": "မှန်ကန်သော ကိုယ်နေဟန်ထား ထိန်းသိမ်းခြင်း, ဇက်နှင့် ကျော အကြောလျှော့ လေ့ကျင့်ခန်း ပုံမှန် ပြုလုပ်ပေးခြင်း, ရေနွေးဝတ် ကပ်ပေးခြင်း, အကိုက်အခဲပျောက် လိမ်းဆေး လိမ်းပေးခြင်း",
        "medications": [
            "ပါရာစီတမော (Paracetamol)",
            "အိုင်ဗျူပရိုဖင် (Ibuprofen)",
            "ဗီတာမင်ဘီ (Vitamin B Complex)"
        ]
    },
    {
        "name": "ခါးဆစ်ရိုး ကျီးပေါင်းတက်ခြင်း (Lumbar Spondylosis)",
        "description": "ခါးဆစ်ရိုး ကျီးပေါင်းတက်ခြင်း (Lumbar Spondylosis) သည် ခါးဆစ်ရိုးများ ပျက်စီးယိုယွင်းလာသဖြင့် ခါးနာခြင်း၊ နောက်ကျောအောင့်ခြင်း၊ ခြေထောက်သို့ ထုံကျင်နာကျင်ခြင်း စသည့် လက္ခဏာများ ဖြစ်ပွားတတ်သော ရောဂါအခြေအနေ ဖြစ်ပါသည်။",
        "symptoms": [
            "ခါးနာခြင်း",
            "နောက်ကျောအောင့်ခြင်း",
            "ကိုယ်လက်ကိုက်ခဲခြင်း",
            "ထုံကျင်ခြင်း",
            "အဆစ်အမြစ်ကိုက်ခဲခြင်း",
            "လှုပ်ရှားရခက်ခဲခြင်း"
        ],
        "precautions": [
            "ခါးကို ရုတ်တရက် လှည့်ခြင်းနှင့် အလေးအပင်မခြင်း ရှောင်ပါ",
            "ခါးပတ် စနစ်တကျ ပတ်ထားပါ",
            "ဆရာဝန်နှင့် ပုံမှန် ပြသစစ်ဆေးပါ"
        ],
        "recommendation": "ကာယကုထုံး ခံယူခြင်း, အကိုက်အခဲပျောက်ဆေး သောက်သုံးခြင်း, ကယ်လ်စီယမ်နှင့် အရိုးအားဆေး သောက်သုံးခြင်း, ခါးကြွက်သား သန်မာစေသော လေ့ကျင့်ခန်းများ ပြုလုပ်ခြင်း",
        "medications": [
            "ဒိုင်ကလိုဖီနက် (Diclofenac)",
            "ကယ်လ်စီယမ် (Calcium)",
            "ဗီတာမင်ဘီ (Vitamin B Complex)"
        ]
    },
    {
        "name": "ခါးဆစ်ရိုး အချပ်ပြားကျွံခြင်း (Herniated / Slipped Disc)",
        "description": "ခါးဆစ်ရိုး အချပ်ပြားကျွံခြင်း (Slipped Disc) သည် ကျောရိုးဆစ်ကြားရှိ အချပ်ပြားကျွံထွက်ပြီး အာရုံကြောကို ဖိမိသဖြင့် ခါးနှင့် ကျောအောင့်ခြင်း၊ ခြေထောက်တစ်လျှောက် စူးအောင့်နာကျင်ခြင်း လက္ခဏာများ ဖြစ်ပွားတတ်သော ရောဂါအခြေအနေ ဖြစ်ပါသည်။",
        "symptoms": [
            "ခါးနာခြင်း",
            "နောက်ကျောအောင့်ခြင်း",
            "တင်ပါးဆုံ နာကျင်ကိုက်ခဲခြင်း",
            "ခြေထောက် ထုံကျင်ခြင်း",
            "စစ်စစ်မြည်ကျင်ခြင်း",
            "ကြွက်သားများ အားနည်းခြင်း"
        ],
        "precautions": [
            "အလေးအပင် မ,ခြင်း လုံးဝရှောင်ကြဉ်ပါ",
            "ကွေးကွေးထိုင်ခြင်း ရှောင်ပါ",
            "ဆရာဝန်နှင့် အမြန်ဆုံး ပြသတိုင်ပင်ပါ"
        ],
        "recommendation": "အိပ်ရာထဲတွင် ကောင်းစွာ အနားယူခြင်း, ကာယကုထုံး ခံယူခြင်း, သံလိုက်ဓာတ်မှန် (MRI) ရိုက်ကူးစစ်ဆေးခြင်း, ဆေးဝါးကုသမှု ခံယူခြင်း, လိုအပ်ပါက ခွဲစိတ်ကုသခြင်း",
        "medications": [
            "ဒိုင်ကလိုဖီနက် (Diclofenac)",
            "ထရာမာဒေါ (Tramadol)",
            "ဗီတာမင်ဘီ (Vitamin B Complex)"
        ]
    },
    {
        "name": "တင်ပါးဆုံ အာရုံကြောနာခြင်း (Sciatica)",
        "description": "တင်ပါးဆုံ အာရုံကြောနာခြင်း (Sciatica) သည် ခါးအောက်ပိုင်း၊ တင်ပါးနှင့် ခြေထောက်တစ်လျှောက်သို့ အာရုံကြောတစ်လျှောက် ထိုးအောင့်နာကျင်ခြင်း၊ ထုံကျင်ခြင်း လက္ခဏာများ ဖြစ်ပွားတတ်သော ရောဂါအခြေအနေ ဖြစ်ပါသည်။",
        "symptoms": [
            "ခါးနာခြင်း",
            "နောက်ကျောအောင့်ခြင်း",
            "တင်ပါးဆုံ နာကျင်ကိုက်ခဲခြင်း",
            "ထုံကျင်ခြင်း",
            "ခြေထောက်နာကျင်ခြင်း",
            "မတ်တပ်ရပ်ရခက်ခဲခြင်း"
        ],
        "precautions": [
            "အချိန်ကြာမြင့်စွာ တစ်နေရာတည်း ထိုင်ခြင်း ရှောင်ပါ",
            "နူးညံ့သော မွေ့ရာပေါ်တွင် အိပ်ပါ"
        ],
        "recommendation": "အကြောလျှော့ လေ့ကျင့်ခန်း ပုံမှန်ပြုလုပ်ခြင်း, ရေနွေးဝတ် ကပ်ပေးခြင်း, ကာယကုထုံး ခံယူခြင်း, အာရုံကြော အားဖြည့်ဆေးများ သောက်သုံးခြင်း",
        "medications": [
            "အိုင်ဗျူပရိုဖင် (Ibuprofen)",
            "ပါရာစီတမော (Paracetamol)",
            "ဗီတာမင်ဘီ (Vitamin B Complex)"
        ]
    },
    {
        "name": "ဗိုင်းရပ်စ်အဖျားနှင့် ကိုယ်လက်ကိုက်ခဲခြင်း (Viral Fever with Body Aches)",
        "description": "ဗိုင်းရပ်စ်အဖျားနှင့် ကိုယ်လက်ကိုက်ခဲခြင်း (Viral Fever) သည် ဗိုင်းရပ်စ်ပိုး ကူးစက်ခံရသဖြင့် ဖျားနာခြင်း၊ ကိုယ်လက်ကိုက်ခဲခြင်း၊ နောက်ကျောအောင့်ခြင်း၊ မောပန်းနွမ်းနယ်ခြင်း စသည့် လက္ခဏာများ ဖြစ်ပွားတတ်သော ရောဂါအခြေအနေ ဖြစ်ပါသည်။",
        "symptoms": [
            "ဖျားနာခြင်း",
            "ကိုယ်လက်ကိုက်ခဲခြင်း",
            "နောက်ကျောအောင့်ခြင်း",
            "ကြွက်သားများ နာကျင်ကိုက်ခဲခြင်း",
            "ခေါင်းကိုက်ခြင်း",
            "ချမ်းတုန်ဖျားခြင်း",
            "မောပန်းနွမ်းနယ်ခြင်း"
        ],
        "precautions": [
            "ရေနှင့် ဓာတ်ဆားရည် များများ သောက်သုံးပါ",
            "လုံလောက်စွာ အနားယူပါ",
            "အာဟာရပြည့်ဝသော အစားအစာများ စားသုံးပါ"
        ],
        "recommendation": "လုံလောက်စွာ အနားယူခြင်း, ရေနှင့် အရည်များများ သောက်သုံးခြင်း, အဖျားကျဆေး သောက်သုံးခြင်း, ဗီတာမင်စီ သောက်သုံးခြင်း",
        "medications": [
            "ပါရာစီတမော (Paracetamol)",
            "ဓာတ်ဆားရည် (ORS)",
            "ဗီတာမင်စီ (Vitamin C)"
        ]
    },
    {
        "name": "ကျောက်ကပ်ပိုးဝင်ခြင်း (Kidney Infection / Pyelonephritis)",
        "description": "ကျောက်ကပ်ပိုးဝင်ခြင်း (Pyelonephritis) သည် ဘက်တီးရီးယားပိုးကြောင့် ခါးနှင့် နောက်ကျောတစ်ဖက်ခြမ်းတွင် ပြင်းထန်စွာ ထိုးအောင့်နာကျင်ခြင်း၊ အဖျားကြီးခြင်း၊ ဆီးသွားရခက်ခဲခြင်း လက္ခဏာများ ဖြစ်ပွားတတ်သော ရောဂါအခြေအနေ ဖြစ်ပါသည်။",
        "symptoms": [
            "ခါးနာခြင်း",
            "နောက်ကျောအောင့်ခြင်း",
            "ဖျားနာခြင်း",
            "ချမ်းတုန်ဖျားခြင်း",
            "ပျို့အန်ချင်ခြင်း",
            "ဆီးသွားစဉ် ပူစပ်ပူလောင်ဖြစ်ခြင်း",
            "ဆီးခဏခဏသွားခြင်း"
        ],
        "precautions": [
            "ရေများများ သောက်ပါ",
            "ဆီးအောင့်မထားပါနှင့်",
            "ဆရာဝန်နှင့် ချက်ချင်း ပြသကုသမှု ခံယူပါ"
        ],
        "recommendation": "ဆရာဝန်ညွှန်ကြားသော ပဋိဇီဝ ပိုးသတ်ဆေးကို သတ်မှတ်ရက်ပြည့်အောင် သောက်သုံးခြင်း, ရေများများ သောက်သုံးခြင်း, ဆီးစစ်ဆေးခြင်း",
        "medications": [
            "စီပရိုဖလော့ဆာဆင် (Ciprofloxacin)",
            "ပါရာစီတမော (Paracetamol)",
            "ဓာတ်ဆားရည် (ORS)"
        ]
    }
]

NEW_DISEASES_EN = [
    {
        "name": "Back Muscle Strain & Sprain",
        "description": "Back Muscle Strain & Sprain is an injury to back muscles or ligaments resulting in back pain, upper back aching, muscle stiffness, and body soreness.",
        "symptoms": [
            "Back pain",
            "Upper back pain",
            "Muscle aches",
            "Body aches",
            "Stiffness",
            "Tenderness"
        ],
        "precautions": [
            "Avoid lifting heavy objects",
            "Maintain proper sitting posture",
            "Get plenty of rest",
            "Apply heat or cold packs"
        ],
        "recommendation": "Rest, heat/cold therapy, pain relief medications, gentle stretching exercises, physical therapy if symptoms persist.",
        "medications": [
            "Paracetamol",
            "Ibuprofen",
            "Diclofenac"
        ]
    },
    {
        "name": "Upper Back Pain & Postural Strain",
        "description": "Upper Back Pain is caused by poor posture, long desk hours, and muscular tension resulting in upper back soreness, neck pain, and muscle tightness.",
        "symptoms": [
            "Upper back pain",
            "Back pain",
            "Neck pain",
            "Shoulder pain",
            "Muscle aches",
            "Tension headache"
        ],
        "precautions": [
            "Take stretching breaks every hour while working at a desk",
            "Sit with a straight back",
            "Avoid overly high pillows"
        ],
        "recommendation": "Ergonomic workspace adjustments, neck and back stretching exercises, warm compresses, pain relief ointments.",
        "medications": [
            "Paracetamol",
            "Ibuprofen",
            "Vitamin B Complex"
        ]
    },
    {
        "name": "Lumbar Spondylosis",
        "description": "Lumbar Spondylosis is age-related wear and tear of the spinal discs in the lower back causing chronic back pain, stiffness, and radiating numbness.",
        "symptoms": [
            "Back pain",
            "Lower back pain",
            "Muscle aches",
            "Numbness",
            "Joint pain",
            "Reduced mobility"
        ],
        "precautions": [
            "Avoid sudden spinal twists and heavy lifting",
            "Use a lumbar support belt when necessary",
            "Consult a physician regularly"
        ],
        "recommendation": "Physical therapy, NSAID pain management, calcium supplementation, core muscle strengthening exercises.",
        "medications": [
            "Diclofenac",
            "Calcium",
            "Vitamin B Complex"
        ]
    },
    {
        "name": "Herniated / Slipped Disc",
        "description": "Herniated Disc occurs when the soft center of a spinal disc pushes through a tear, compressing nearby nerves and causing severe back pain and sciatica.",
        "symptoms": [
            "Back pain",
            "Lower back pain",
            "Pelvic pain",
            "Leg numbness",
            "Tingling sensation",
            "Muscle weakness"
        ],
        "precautions": [
            "Do not lift heavy weights",
            "Avoid slouching",
            "Seek immediate medical assessment"
        ],
        "recommendation": "Bed rest, physical therapy, MRI imaging, prescription pain management, surgery in refractory cases.",
        "medications": [
            "Diclofenac",
            "Tramadol",
            "Vitamin B Complex"
        ]
    },
    {
        "name": "Sciatica",
        "description": "Sciatica refers to pain radiating along the sciatic nerve pathway, branching from lower back through hips, buttocks, and down each leg.",
        "symptoms": [
            "Back pain",
            "Lower back pain",
            "Pelvic pain",
            "Numbness",
            "Leg pain",
            "Difficulty standing"
        ],
        "precautions": [
            "Avoid prolonged sitting",
            "Sleep on a supportive mattress"
        ],
        "recommendation": "Targeted nerve stretching exercises, warm compresses, physical therapy, neurotropic vitamin therapy.",
        "medications": [
            "Ibuprofen",
            "Paracetamol",
            "Vitamin B Complex"
        ]
    },
    {
        "name": "Viral Fever with Body Aches",
        "description": "Viral Fever is a viral infection characterized by elevated temperature, generalized body aches, back pain, chills, and fatigue.",
        "symptoms": [
            "Fever",
            "Muscle aches",
            "Back pain",
            "Body aches",
            "Headache",
            "Chills",
            "Fatigue"
        ],
        "precautions": [
            "Drink plenty of fluids and ORS",
            "Get sufficient sleep",
            "Eat easily digestible, nutritious meals"
        ],
        "recommendation": "Adequate hydration, antipyretic medications for fever control, vitamin C supplementation, adequate bed rest.",
        "medications": [
            "Paracetamol",
            "Oral Rehydration Salts (ORS)",
            "Vitamin C"
        ]
    },
    {
        "name": "Kidney Infection (Pyelonephritis)",
        "description": "Pyelonephritis is a bacterial infection of one or both kidneys leading to flank/back pain, high fever, chills, and painful urination.",
        "symptoms": [
            "Back pain",
            "Flank pain",
            "Fever",
            "Chills",
            "Nausea",
            "Burning sensation when urinating",
            "Frequent urination"
        ],
        "precautions": [
            "Drink plenty of water",
            "Do not hold in urine",
            "Seek prompt medical treatment"
        ],
        "recommendation": "Complete the full course of prescribed antibiotics, drink generous amounts of water, perform urine cultures.",
        "medications": [
            "Ciprofloxacin",
            "Paracetamol",
            "Oral Rehydration Salts"
        ]
    }
]

# Load existing MM
with open('data/diseases_mm.json', 'r', encoding='utf-8') as f:
    d_mm = json.load(f)

for item in NEW_DISEASES_MM:
    if not any(item['name'] == d.get('name') for d in d_mm):
        d_mm.append(item)

with open('data/diseases_mm.json', 'w', encoding='utf-8') as f:
    json.dump(d_mm, f, ensure_ascii=False, indent=2)

# Load existing EN
with open('data/diseases.json', 'r', encoding='utf-8') as f:
    d_en = json.load(f)

for item in NEW_DISEASES_EN:
    if not any(item['name'] == d.get('name') for d in d_en):
        d_en.append(item)

with open('data/diseases.json', 'w', encoding='utf-8') as f:
    json.dump(d_en, f, ensure_ascii=False, indent=2)

print(f"Added new disease profiles! Total MM: {len(d_mm)}, Total EN: {len(d_en)}")
