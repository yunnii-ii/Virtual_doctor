# Virtual Doctor - Developer Handover Guide

## ၁။ ပရောဂျက်အကြောင်း

**Virtual Doctor** သည် အင်္ဂလိပ်-မြန်မာ နှစ်ဘာသာသုံး ကျန်းမာရေးမိုဘိုင်း application တစ်ခုဖြစ်သည်။ AI စွမ်းအင်သုံး Symptom Checker၊ Clinical Decision Support၊ Telemedicine၊ Voice Assistant၊ OCR ဆေးမှတ်မိခြင်း၊ Predictive Health Analytics နှင့် အခြားကျန်းမာရေးဆိုင်ရာ ကိရိယာများစွာ ပါဝင်သည်။

**Git Remote:** `https://github.com/ZenithFluxMyanmar/virtual-doctor-backend` (backend folder တွင်သာ)

---

## ၂။ Tech Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | React Native 0.81.5 (Expo 54) |
| **Frontend Language** | JavaScript (ES6+) |
| **Backend** | Python 3.x - FastAPI |
| **Database** | SQLite (SQLAlchemy ORM) |
| **Auth** | bcrypt password hashing |
| **OCR** | EasyOCR |
| **Speech-to-Text** | faster-whisper (local, offline, tiny model) |
| **Fuzzy Matching** | thefuzz + python-Levenshtein |
| **ML/AI** | scikit-learn, PyTorch |
| **i18n** | i18next (frontend) |
| **Navigation** | React Navigation (Stack + Bottom Tabs) |
| **UI Library** | React Native Paper (Material Design 3) |
| **WebRTC** | react-native-webrtc |
| **API Client** | Axios |

---

## ၃။ Project Structure

```
E:\VirtualDoctor\
├── backend/
│   ├── main.py                    # FastAPI app (1812 lines) - တစ်ခုတည်းသော backend code
│   ├── database.py                # SQLAlchemy models (User, History)
│   ├── requirements.txt           # Python dependencies
│   ├── run.ps1                    # Backend run script
│   ├── .env                       # Environment variables
│   ├── virtual_doctor.db          # SQLite database
│   ├── doctor.html                # Telemedicine web console
│   ├── data/                      # Medical datasets (JSON)
│   │   ├── diseases.json          # 4000+ English diseases
│   │   ├── diseases_mm.json       # Myanmar translations
│   │   ├── medicines.json         # 2388 English medicines
│   │   ├── medicines_mm.json      # Myanmar medicine names
│   │   ├── tips.json              # 52 health tips (English)
│   │   └── tips_mm.json           # 52 health tips (Myanmar)
│   ├── tests/
│   │   └── test_voice_translation.py
│   ├── Super/                     # Dataset enrichment scripts
│   │   ├── check_recommendations.py
│   │   ├── fix_recommendations.py
│   │   ├── populate_medications.py
│   │   └── rebuild_full_dataset.py
│   ├── migrate.py                 # Database migration
│   └── collect_symptoms.py        # Extract unique symptoms
│
├── frontend/
│   ├── App.js                     # Main app entry
│   ├── app.json                   # Expo config
│   ├── eas.json                   # EAS Build config
│   ├── package.json               # Node dependencies
│   ├── index.js                   # Expo registerRootComponent
│   ├── src/
│   │   ├── api/
│   │   │   └── index.js           # Axios API client (16 endpoints)
│   │   ├── components/
│   │   │   ├── ErrorBoundary.js
│   │   │   └── VoiceInput.js
│   │   ├── screens/               # 27 screens
│   │   │   ├── HomeScreen.js
│   │   │   ├── SymptomCheckerScreen.js
│   │   │   ├── MedicineInfoScreen.js
│   │   │   ├── HealthTipsScreen.js
│   │   │   ├── TelemedicineScreen.js
│   │   │   ├── VoiceAssistantScreen.js
│   │   │   ├── ClinicalDecisionSupportScreen.js
│   │   │   ├── PredictiveAnalyticsScreen.js
│   │   │   ├── PersonalizedInterventionScreen.js
│   │   │   ├── NearbyHospitalsScreen.js
│   │   │   ├── BloodPressureScreen.js
│   │   │   ├── WaterTrackerScreen.js
│   │   │   ├── MoodTrackerScreen.js
│   │   │   ├── BMICalculatorScreen.js
│   │   │   ├── BreathingScreen.js
│   │   │   ├── MedicineAlarmScreen.js
│   │   │   ├── MedicineInteractionScreen.js
│   │   │   ├── VaccinationScreen.js
│   │   │   ├── AppointmentScreen.js
│   │   │   ├── LabReportScreen.js
│   │   │   ├── HealthReportScreen.js
│   │   │   ├── FirstAidScreen.js
│   │   │   ├── ProfileScreen.js
│   │   │   ├── LoginScreen.js
│   │   │   ├── RegisterScreen.js
│   │   │   ├── HistoryScreen.js
│   │   │   └── PrivacyShieldScreen.js
│   │   └── utils/
│   │       ├── i18n.js            # EN + MM translations (1030 lines)
│   │       ├── AuthContext.js
│   │       ├── theme.js
│   │       ├── asyncStorage.js
│   │       ├── storage.js
│   │       └── logger.js
│   └── assets/
│       ├── icon.png
│       ├── logo.png
│       └── splash-icon.png
│
├── translate_mm_dataset.py        # English -> Myanmar dataset translator
├── scan_mm_english.py             # Scan for remaining English in MM data
└── virtual_doctor.db              # Root-level DB copy
```

---

## ၄။ Backend API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | Health check |
| POST | `/register` | User registration |
| POST | `/login` | User login |
| PUT | `/users/{user_id}` | Update profile |
| POST | `/diagnose` | Symptom-based diagnosis |
| POST | `/clinical-decision-support` | Clinical triage |
| POST | `/predictive-analytics` | Health risk prediction |
| POST | `/personalized-intervention` | Health intervention plan |
| POST | `/voice/transcribe` | Speech-to-text |
| POST | `/voice/command` | Voice command intent |
| POST | `/voice/interpret-symptoms` | Extract symptoms from voice |
| POST | `/identify-medicine` | OCR medicine photo ID |
| POST | `/telemedicine/session` | Create WebRTC room |
| WS | `/telemedicine/ws/{room_id}/{participant}` | WebRTC signaling |
| POST | `/federated-learning/update` | Federated learning update |
| GET | `/medicines` | List medicines |
| GET | `/medicine/{name}` | Medicine search |
| GET | `/tips` | Health tips |
| POST | `/history` | Save history |
| GET | `/history/{user_id}` | Get history |
| DELETE | `/history/{user_id}` | Clear history |
| GET | `/doctor` | Telemedicine web console |

---

## ၅။ Database Schema (SQLite/SQLAlchemy)

**users table:**
| Column | Type | Notes |
|--------|------|-------|
| id | Integer | PK, auto-increment |
| name | String | |
| email | String | Unique, indexed |
| hashed_password | String | bcrypt hash |
| profile_pic | String | Nullable |
| phone | String | Nullable |
| address | String | Nullable |
| height | String | (cm) |
| weight | String | (kg) |
| blood_pressure | String | e.g. "120/80" |
| emergency_contact | String | |

**histories table:**
| Column | Type | Notes |
|--------|------|-------|
| id | Integer | PK |
| type | String | 'Diagnosis' / 'Medicine' |
| title | String | |
| details | Text | |
| timestamp | DateTime | UTC default |
| user_id | Integer | FK -> users.id |

---

## ၆။ စက်တွင်း Run ရန်

### Backend

```powershell
# PowerShell (project root)
.\backend\run.ps1
```
- Virtual environment ကို auto-create လုပ်ပြီး dependencies install လုပ်
- Server က `http://0.0.0.0:8001` မှာ start မည်
- `--reload` flag ပါသောကြောင့် code ပြောင်းတိုင်း auto-restart မည်

### Frontend

```bash
# Development
cd frontend
bash debug.sh        # npx expo start

# Release APK
cd frontend
bash release.sh      # npx eas build --platform all --profile production

# npm scripts
npm start            # expo start
npm run android      # expo run:android
npm run ios          # expo run:ios
npm run web          # expo start --web
```

---

## ၇။ ဗိသုကာလက်ရာများ (Architecture Notes)

### Backend Monolith
- Backend logic အားလုံး `backend/main.py` (1812 lines) ထဲတွင် စုဝေးနေ
- ယခု architecture က MVP (Minimum Viable Product) အဆင့်အတွက် သင့်တော်သော်လည်း scale လုပ်ရန် အောက်ပါအတိုင်း ခွဲသင့်သည်:
  - `routes/` - Route handlers များ
  - `models/` - SQLAlchemy models
  - `services/` - Business logic
  - `nlp/` - Translation & NLP logic
  - `schemas/` - Pydantic schemas

### Bilingual Translation Pipeline (အဓိကအရေးကြီးဆုံး)

Voice/Symptom Input မှ Diagnosis အထိ အဆင့်ဆင့်:

1. **Input** → မြန်မာလို ရိုက်ထည့်ခြင်း သို့မဟုတ် အသံဖြင့် ပြောခြင်း
2. **Whisper STT** → အသံကို မြန်မာစာသားအဖြစ် ပြောင်းပေး
3. **translate_incoming_symptoms()** → 3-level mapping:
   - Direct Myanmar → English dictionary (380+ entries)
   - Romanized Myanmar → English (220+ entries, e.g. "konkai" → "headache")
   - English aliases (250+ entries)
   - Fuzzy matching fallback (thefuzz, threshold 60)
4. **match_disease_candidates()** → Scored disease matching
5. **Result** → Disease name ကို မြန်မာလိုပြန်ပြောင်း (diseases_mm.json lookup)

### Voice Assistant
- **faster-whisper** (tiny model) ကို local တွင် run သည် - offline, free
- ယခင် Groq API, Google Cloud Speech-to-Text တို့ကို စမ်းသပ်ခဲ့ပြီး ကုန်ကျစရိတ်ကြောင့် local model သို့ ပြောင်းခဲ့
- `backend/.env` တွင် HuggingFace fallback ကို configure လုပ်နိုင်

### Federated Learning
- PrivacyShieldScreen သည် federated learning concept ကို UI အနေဖြင့် ပြသထား
- Backend endpoint (`POST /federated-learning/update`) ရှိသော်လည်း actual ML training pipeline မရှိသေး
- ယခုအဆင့်တွင် concept demo သက်သက်ဖြစ်သည်

### Authentication
- Login/Register endpoints များရှိသော်လည်း **JWT token validation middleware မရှိပါ**
- `user_id` ကို API parameter အဖြစ် တိုက်ရိုက်ပေးပို့ရသည်
- Frontend ဘက်တွင် AuthContext ဖြင့် auth state ကို manage လုပ်သည်

---

## ၈။ အဓိက Frontend Screens များ

| Screen | လုပ်ဆောင်ချက် | Key Libraries |
|--------|----------------|---------------|
| HomeScreen | Dashboard, quick actions, emergency call | expo-location, Overpass API |
| SymptomCheckerScreen | ရောဂါရှာဖွေခြင်း, အသံထည့်သွင်းခြင်း, text-to-speech | expo-speech, VoiceInput |
| MedicineInfoScreen | ဆေးအချက်အလက်ရှာဖွေခြင်း, OCR ဓာတ်ပုံမှတ်မိခြင်း | expo-camera, expo-image-picker |
| TelemedicineScreen | WebRTC video call | react-native-webrtc |
| VoiceAssistantScreen | အသံဖြင့် navigate လုပ်ခြင်း | VoiceInput |
| ClinicalDecisionSupportScreen | Multi-step clinical interview | - |
| PredictiveAnalyticsScreen | Health risk dashboard | - |
| NearbyHospitalsScreen | OSM hospital/clinic map | expo-location, Overpass API |
| PrivacyShieldScreen | Federated learning controls | - |

---

## ၉။ Dataset များအကြောင်း

**diseases.json** (4000+ entries)
```json
{
  "Acne": {
    "symptoms": ["whiteheads", "blackheads", "pimples", ...],
    "description": "...",
    "recommendations": ["..."]
  }
}
```

**diseases_mm.json** (Myanmar translations)
```json
{
  "Acne": {
    "name_mm": "ဝက်ခြံ",
    "description_mm": "...",
    "symptoms_mm": [...],
    "recommendations_mm": [...]
  }
}
```

**medicines.json** (2388 entries)
```json
{
  "Paracetamol": {
    "uses": "Fever, pain relief",
    "dosage": "...",
    "side_effects": ["..."]
  }
}
```

**Symptom Mapping (in main.py):**
- `mm_to_en_symptoms` - 380+ direct Myanmar → English mappings
- `romanized_to_en` - 220+ romanized → English mappings
- `en_aliases` - 250+ English symptom aliases

---

## ၁၀။ Environment Variables

`backend/.env` တွင် အောက်ပါတို့ကို configure လုပ်နိုင်:

```
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
HUGGINGFACE_API_TOKEN=hf_xxxxxxxx
HF_TRANSCRIPTION_MODEL=openai/whisper-tiny
USE_HUGGINGFACE_TRANSCRIPTION=false
```

- `USE_HUGGINGFACE_TRANSCRIPTION=false` → local faster-whisper ကို သုံးမည်
- `USE_HUGGINGFACE_TRANSCRIPTION=true` → HuggingFace API ကို fallback သုံးမည်

---

## ၁၁။ သတိပြုရန် Known Issues

1. **No Authentication Middleware** - API endpoints များတွင် JWT token validation မပါဝင်ပါ
2. **Monolithic main.py** (1812 lines) - Refactoring လုပ်ရန် လိုအပ်
3. **Git is backend folder တွင်သာရှိ** - Frontend အတွက် git repo သီးခြားမရှိ
4. **No Frontend Tests** - Testing setup မရှိသေး
5. **Backend Tests Minimal** - `test_voice_translation.py` တစ်ခုသာရှိ
6. **Dataset Quality** - Myanmar disease names အားလုံး ပြည့်စုံမှုမရှိနိုင် (အချို့ disease များအတွက် မြန်မာလိုမရှိ)
7. **Whisper Tiny Model Accuracy** - tiny model သည် အသံထွက်ကောင်းမှသာ ကောင်းစွာအလုပ်လုပ်
8. **SQLite Concurrency** - SQLite သည် concurrent writes အတွက် မသင့်တော် (production အတွက် PostgreSQL သို့ပြောင်းသင့်)
9. **Federated Learning** - Concept demo သက်သက်ဖြစ်ပြီး actual ML pipeline မရှိသေး
10. **Database Files** - `virtual_doctor.db` က root နှင့် backend folder နှစ်ခုလုံးတွင်ရှိ (sync issue ဖြစ်နိုင်)

---

## ၁၂။ Testing

```bash
# Backend test
cd backend
python -m pytest tests/ -v

# Frontend - test setup မရှိသေး
```

---

## ၁၃။ Dataset Enhancement Scripts

`backend/Super/` folder အတွင်းမှ scripts များ:

| Script | Purpose |
|--------|---------|
| `check_recommendations.py` | ဆေးဝါးအကြံပြုချက်များ စစ်ဆေးခြင်း |
| `fix_recommendations.py` | ဆေးဝါးအကြံပြုချက်များ ပြင်ဆင်ခြင်း |
| `populate_medications.py` | Disease-medication mapping ဖြည့်စွက်ခြင်း |
| `rebuild_full_dataset.py` | Dataset အသစ်ပြန်ဆောက်ခြင်း |

---

## ၁၄။ ပြုပြင်ပြောင်းလဲမှုမှတ်တမ်း

### Color Scheme
- Pastel theme သို့ ပြောင်းလဲခဲ့ (7 screen files, 25+ color replacements)
- `frontend/src/utils/theme.js` တွင် color constants များကို သတ်မှတ်ထား

### Voice Assistant Evolution
1. Groq API → (cost)
2. Google Cloud Speech-to-Text → (cost)
3. **faster-whisper local (tiny)** → (free, offline)

### Telemedicine WebRTC
- WebRTC signaling server ကို backend WS endpoint မှတစ်ဆင့် ဆောင်ရွက်
- `doctor.html` က web-based doctor console အဖြစ် ဆောင်ရွက်

---

## ၁၅။ Development Workflow

### New Feature ထည့်ရန်
1. Backend: `main.py` တွင် route အသစ်ထည့်
2. Frontend: `src/api/index.js` တွင် API function အသစ်ထည့်
3. Frontend: `src/screens/` တွင် screen အသစ် create
4. Frontend: `App.js` တွင် navigation route ထည့်
5. i18n: `src/utils/i18n.js` တွင် ဘာသာပြန်စာသားများထည့်

### Data Update
- Diseases/Medicines JSON များကို တိုက်ရိုက် edit လုပ်နိုင်
- `backend/Super/` scripts များဖြင့် dataset ကို enrich လုပ်နိုင်

---

## ၁၆။ Dependencies

### Backend (Python) - 22 packages
```
fastapi, uvicorn, sqlalchemy, python-dotenv, passlib[bcrypt],
python-jose[cryptography], pandas, scikit-learn, torch, torchvision,
easyocr, Pillow, faster-whisper, huggingface-hub, thefuzz,
python-Levenshtein, python-multipart, jinja2, aiofiles,
requests, websockets, pydantic
```

### Frontend (React Native) - 44 packages
```
react@19.1.0, react-native@0.81.5, expo@~54.0.36,
@react-navigation/native@7.2.2, @react-navigation/stack@7.8.11,
@react-navigation/bottom-tabs@7.15.11,
react-native-paper@5.15.1, lucide-react-native@1.14.0,
axios@1.15.2, i18next@26.0.8, react-i18next@17.0.6,
react-native-webrtc@124.0.8, expo-camera@17.0.10,
expo-location@19.0.8, expo-av@16.0.8, expo-speech@14.0.8,
expo-notifications@0.32.17, expo-image-picker@17.0.11,
@react-native-async-storage/async-storage@2.2.0
```

---

## ၁၇။ Production အတွက် ထည့်သွင်းစဉ်းစားရန်

1. **Database** - SQLite မှ PostgreSQL သို့ ပြောင်းသင့်
2. **Auth** - JWT middleware ထည့်သင့်
3. **Backend Refactoring** - main.py ကို routes/services/models/schemas ခွဲသင့်
4. **Testing** - Frontend + Backend testing setup လုပ်သင့်
5. **CI/CD** - GitHub Actions သို့မဟုတ် အခြား CI/CD pipeline ထည့်သင့်
6. **Error Handling** - Frontend တွင် systematic error handling ထည့်သင့် (ErrorBoundary ရှိပြီးသား)
7. **API Security** - Rate limiting, input validation, CORS configuration
8. **Whisper Model** - tiny model အစား small/base model သုံးရန် စဉ်းစားသင့် (accuracy အတွက်)
9. **Monitoring** - Logging centralized လုပ်သင့် (backend တွင် logger.py ရှိပြီးသား)

---

## ၁၈။ အဆက်အသွယ်

- **GitHub:** https://github.com/ZenithFluxMyanmar/virtual-doctor-backend
- **API Base URL:** `http://localhost:8001` (local) / သတ်မှတ်ထားသော production URL
- **Backend Server:** `uvicorn main:app --host 0.0.0.0 --port 8001 --reload`
