from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Header, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict
from typing import Any, Dict, List, Optional
from contextlib import asynccontextmanager
import json
import os
import re
import uuid
import hashlib
import datetime
import bcrypt
import easyocr
import io
import numpy as np
import requests
from PIL import Image
from thefuzz import fuzz, process
from sqlalchemy.orm import Session
import database
from database import get_db, init_db
from dotenv import load_dotenv
from faster_whisper import WhisperModel

# Load environment variables
load_dotenv()

# Suppress the "unauthenticated requests to HF Hub" warning that comes from
# faster-whisper / huggingface-hub when downloading whisper models. The library
# prints this warning even for completely public models. Setting HF_TOKEN to a
# placeholder (without a real token) is harmless and silences the noise.
if not os.getenv("HF_TOKEN"):
    os.environ["HF_TOKEN"] = "hf_local_only_no_token"
if not os.getenv("HUGGINGFACE_HUB_DISABLE_TELEMETRY"):
    os.environ["HUGGINGFACE_HUB_DISABLE_TELEMETRY"] = "1"
import logging
logging.getLogger("huggingface_hub").setLevel(logging.ERROR)

# Initialize local Whisper model lazily (only when needed to save memory on startup)
# You can choose size: tiny, base, small, medium, large
# "small" model recommended for good Burmese (my) accuracy with acceptable CPU usage
whisper_model = None

def get_whisper_model():
    global whisper_model
    if whisper_model is None:
        whisper_model = WhisperModel("small", device="cpu", compute_type="int8")
    return whisper_model

# Password utility functions
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

# Load datasets
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

def load_json(filename):
    path = os.path.join(DATA_DIR, filename)
    if os.path.exists(path):
        with open(path, "r", encoding='utf-8') as f:
            return json.load(f)
    return []

# English Datasets
DISEASES_EN = load_json("diseases.json")
MEDICINES_EN = load_json("medicines.json")
TIPS_EN = load_json("tips.json")

# Myanmar Datasets
DISEASES_MM = load_json("diseases_mm.json")
MEDICINES_MM = load_json("medicines_mm.json")
TIPS_MM = load_json("tips_mm.json")

# Symptom translation mapping (Myanmar to English) for Input
SYMPTOM_MAP = {
    "နှာချေ": "sneezing",
    "နှာစေး": "runny nose",
    "လည်ချောင်းနာ": "sore throat",
    "ချောင်းဆိုး": "cough",
    "မျိုချောင်း": "dry cough",
    "နှာပိတ်": "congestion",
    "ဖျား": "fever",
    "ကိုယ်ပူ": "fever",
    "ချမ်းတုန်": "chills",
    "ကြွက်သားနာ": "muscle aches",
    "ခေါင်းကိုက်": "headache",
    "ခေါင်းကိုက်ခြင်း": "headache",
    "နုံး": "fatigue",
    "ပင်ပန်း": "fatigue",
    "အဖျားကြီး": "high fever",
    "အဆစ်အမြစ်နာ": "joint pain",
    "အနီစက်": "rash",
    "အင်ပြင်": "rash",
    "မူး": "dizziness",
    "မျက်စိလည်": "dizziness",
    "ရင်ဘတ်အောင့်": "chest pain",
    "ဗိုက်အောင့်": "stomach pain",
    "ဗိုက်နာ": "stomach pain",
    "ပျို့": "nausea",
    "အန်": "vomiting",
    "ဝမ်းလျှော": "diarrhea",
    "ဝမ်းပျက်": "diarrhea",
    "အသက်ရှူကျပ်": "shortness of breath",
    "ရင်ကျပ်": "shortness of breath",
    "နှာခေါင်းသွေးယို": "nosebleeds",
    "သွေးတိုး": "hypertension",
    "အစာမကြေ": "indigestion",
    "ရင်ပူ": "heartburn",
    "ဝမ်းချုပ်": "constipation",
    "ယား": "itching",
    "အိပ်မပျော်": "insomnia",
    "ညောင်း": "fatigue",
    "ကိုက်": "muscle aches",
    "ခါး": "back pain",
    "ခါးကိုက်": "back pain",
    "ခါးနာ": "back pain",
    "အသက်ရှူမဝ": "difficulty breathing",
    "မေ့လျော့": "forgetfulness",
    "မှားယွင်း": "memory loss",
    "မျက်လုံးခြောက်သွေ့": "dry eyes",
    "ပါးစပ်ခြောက်သွေ့": "dry mouth",
    "နားကိုက်": "ear pain",
    "နားကိုက်ခြင်း": "earache",
    "မျက်လုံးကိုက်": "eye pain",
    "မျက်လုံးနီ": "eye redness",
    "အရေပြားခြောက်သွေ့": "dry skin",
    "အရေပြားယားယား": "itchy skin",
    "ဆူးလာ": "wheezing",
    "အန်ထွက်": "vomiting",
    "သွေးချောင်း": "bleeding",
    "သွေးယို": "bleeding",
    "ဝမ်းသွေးယို": "rectal bleeding",
    "သွေးတိုက်ခြင်း": "bruising",
    "အဆစ်ရောင်ရမ်း": "joint swelling",
    "ကြွက်သားတင်းမာ": "muscle stiffness",
    "ခေါင်းမူး": "dizziness",
    "ထိုင်မကျ": "lightheadedness",
    "မျက်နှာမသက်တောင့်": "facial numbness",
    "မျက်နှာအားနည်း": "facial weakness",
    "သတိလွဲ": "confusion",
    "မိုက်မဲ": "fainting",
    "သွေးတိုး": "high blood pressure",
    "သွေးနိမ့်": "low blood pressure",
    "အစာမစားချင်": "loss of appetite",
    "ကိုယ်အလေးချိန်ကျ": "weight loss",
    "ကိုယ်အလေးချိန်တိုး": "weight gain",
    "ချမ်းလွန်တာကြမ်း": "night sweats",
    "အိပ်ချိန်မှန်မဟုတ်": "sleep disturbances",
    "မိတ်ဆက်": "anxiety",
    "စိတ်ဓာတ်ကျ": "depression",
    "စိတ်ဓာတ်တက်လျှကျ": "mood swings",
    "ရင်လျှင်မြင်ကျ": "vision loss",
    "မျက်လုံးမှောင်မိုက်": "blurred vision",
    "အရပ်မြင်ကျ": "visual disturbances",
    "ရင်ချင်းကြားမျက်လုံးမှာအလင်းရှိ": "halos around lights",
    "နားမကြား": "hearing loss",
    "နားထဲမှာအသံမြည်ခြင်း": "tinnitus",
    "သရေစက်ပြားမောင့်": "difficulty swallowing",
    "ပါးစပ်ထဲမှာအနာ": "mouth sores",
    "မျက်လုံးမျက်နှာရောင်ရမ်း": "swollen eyelids",
    "လညှိခေါင်း": "neck pain",
    "လညှိခေါင်းတင်းမာ": "neck stiffness",
    "ကျောက်ကိုက်": "back pain",
    "ခြေကိုက်": "leg pain",
    "လက်ကိုက်": "arm pain",
    "ပခုံးကိုက်": "shoulder pain",
    "ဒူးကိုက်": "knee pain",
    "ကိုယ်တွင်းအပူလွန်ကဲ": "fever",
    "ရောဂါကူးစက်ခံရ": "infection",
    "ရောင်ရမ်း": "swelling",
    "နီရောင်": "redness",
    "ပူ": "warmth",
    "နာကျင်မှု": "pain",
    "ထိလို့မကျ": "tenderness",
    "အသားရည်ထွက်": "discharge",
    "ချွေးများလွန်း": "excessive sweating",
    "ရေသောက်ချင်တာများ": "excessive thirst",
    "ဆီးများလွန်း": "frequent urination",
    "ဆီးကိုက်ခြင်း": "painful urination",
    "ဆီးမပြည့်ဝင်ဘူး": "incontinence",
    "မျက်ရည်များလွန်း": "excessive tearing",
    "ဆီးကြောင်းရောဂါ": "urinary tract infection",
    "ကျောက်ကပ်နာ": "kidney pain",
    "ချက်ပြားနာ": "flank pain",
    "အမျိုးသမီးအင်္ဂါနာ": "pelvic pain",
    "အစာစားပြီးနာကျင်": "pain after eating",
    "အစာစားမီနာကျင်": "pain before eating",
    "မိန်းမကျန်းမာရေးပြဿနာ": "gynecological issues",
    "မျက်လုံးအဝိုင်းရောင်ရမ်း": "swollen eyes",
    "အရေပြားပေါ်မှာအနာများ": "skin lesions",
    "အရေပြားပေါ်မှာအနီစက်များ": "skin rash",
    "ရောင်ရမ်းတဲ့အရေပြား": "inflamed skin",
    "အရေပြားပေါ်မှာနာများ": "skin wounds",
    "အရေပြားပေါ်မှာအမှတ်တံများ": "skin spots",
    "သွေးအားနည်း": "anemia",
    "ကိုယ်အလေးချိန်တက်လျှကျ": "weight changes",
    "အစာစားချင်စိတ်များ": "increased appetite",
    "အစာစားချင်စိတ်မရှိ": "loss of appetite",
    "ကိုယ်အလေးချိန်အလျင်လျင်ကျ": "unexplained weight loss",
    "ကိုယ်အလေးချိန်အလျင်လျင်တိုး": "unexplained weight gain",
    "အိပ်ချိန်မှန်မဟုတ်": "sleep problems",
    "အိပ်မက်များ": "nightmares",
    "အိပ်ချိန်မှာအိပ်မက်မက်": "sleepwalking",
    "အိပ်ချိန်မှာအသက်ရှူကျပ်": "sleep apnea",
    "သတိရှိမှုလျော့နည်း": "impaired memory",
    "စိတ်ဓာတ်မတည်မှု": "mood changes",
    "စိတ်ဓာတ်ကျ": "depression",
    "မိတ်ဆက်စိတ်": "anxiety",
    "စိတ်ဓာတ်တက်လျှကျ": "mood swings",
    "စိတ်အားနည်း": "fatigue",
    "ကိုယ်အားနည်း": "weakness",
    "လက်ခြေအားနည်း": "muscle weakness",
    "ကြွက်သားအားနည်း": "muscle weakness",
    "လှုပ်ရှားရန်ခက်ခဲ": "difficulty moving",
    "လှည့်ရန်ခက်ခဲ": "difficulty walking",
    "ကိုယ်ထိန်းချုပ်မှုမရှိ": "loss of balance",
    "ကိုယ်ထိန်းချုပ်မှုလျော့နည်း": "impaired coordination",
    "လက်ခြေမတုန်လှုပ်": "tremors",
    "ကြွက်သားမကျုံ့မထိ": "muscle cramps",
    "ကြွက်သားတုန်လှုပ်": "muscle twitches",
    "မျက်လုံးမြင်ကျ": "vision changes",
    "မျက်လုံးမှာအမှတ်တံများ": "floaters",
    "မျက်လုံးမှာအလင်းရှိ": "flashes of light",
    "မျက်လုံးမှောင်မိုက်": "blurred vision",
    "မျက်လုံးမြင်ကျ": "vision loss",
    "မျက်လုံးကိုက်": "eye pain",
    "မျက်လုံးရောင်ရမ်း": "red eyes",
    "မျက်လုံးခြောက်သွေ့": "dry eyes",
    "မျက်လုံးမျက်ရည်များ": "watery eyes",
    "နားကိုက်": "ear pain",
    "နားကိုက်ခြင်း": "earache",
    "နားမကြား": "hearing loss",
    "နားထဲမှာအသံမြည်ခြင်း": "tinnitus",
    "နားထဲမှာရေရှိ": "ear fullness",
    "နားထဲမှာရေထွက်": "ear drainage",
    "နှာခေါင်းကိုက်": "sinus pain",
    "နှာခေါင်းပိတ်": "nasal congestion",
    "နှာခေါင်းစေး": "runny nose",
    "နှာခေါင်းချေ": "sneezing",
    "လည်ချောင်းနာ": "sore throat",
    "ချောင်းဆိုး": "cough",
    "အသက်ရှူကျပ်": "shortness of breath",
    "အသက်ရှူမဝ": "difficulty breathing",
    "ဆူးလာ": "wheezing",
    "ရင်ဘတ်နာ": "chest pain",
    "ရင်ဘတ်အောင့်": "chest pressure",
    "နှလုံးခုန်မမှန်": "palpitations",
    "နှလုံးခုန်မြန်": "rapid heartbeat",
    "နှလုံးခုန်နှေး": "slow heartbeat",
    "ဗိုက်နာ": "abdominal pain",
    "ဗိုက်အောင့်": "abdominal pain",
    "ပျို့": "nausea",
    "အန်": "vomiting",
    "ဝမ်းလျှော": "diarrhea",
    "ဝမ်းပျက်": "diarrhea",
    "ဝမ်းချုပ်": "constipation",
    "ဝမ်းသွေးယို": "rectal bleeding",
    "အစာမကြေ": "indigestion",
    "ရင်ပူ": "heartburn",
    "အစာစားပြီးနာကျင်": "pain after eating",
    "ခါးနာ": "back pain",
    "ကျောက်ကပ်နာ": "kidney pain",
    "ချက်ပြားနာ": "flank pain",
    "ဆီးကိုက်ခြင်း": "painful urination",
    "ဆီးများလွန်း": "frequent urination",
    "ဆီးအနှောင့်": "urgency",
    "ဆီးမပြည့်ဝင်ဘူး": "incontinence",
    "အမျိုးသမီးအင်္ဂါနာ": "pelvic pain",
    "အမျိုးသမီးအင်္ဂါရေထွက်": "vaginal discharge",
    "အမျိုးသမီးအင်္ဂါယားယား": "vaginal itching",
    "အမျိုးသမီးအင်္ဂါရောင်ရမ်း": "vaginal irritation",
    "လမစ်လျှကာလမှန်မဟုတ်": "irregular periods",
    "လမစ်လျှကာလကြီးမား": "heavy periods",
    "လမစ်လျှကာလကြာရှည်": "prolonged periods",
    "လမစ်လျှကာလမရှိ": "missed periods",
    "ကိုယ်ဝန်ဆောင်စဉ်": "pregnancy",
    "ကိုယ်ဝန်ဆောင်စဉ်မှာပြဿနာများ": "pregnancy complications",
    "ကျောက်ကိုက်": "back pain",
    "ပခုံးကိုက်": "shoulder pain",
    "ဒူးကိုက်": "knee pain",
    "ခြေကိုက်": "leg pain",
    "လက်ကိုက်": "arm pain",
    "ကိုက်တဲ့နေရာများ": "painful areas",
    "ရောင်ရမ်းတဲ့နေရာများ": "swollen areas",
    "နီရောင်တဲ့နေရာများ": "red areas",
    "ပူတဲ့နေရာများ": "warm areas",
    "ထိလို့မကျတဲ့နေရာများ": "tender areas",
    "အသားရည်ထွက်တဲ့နေရာများ": "discharge areas",
    "သွေးယိုတဲ့နေရာများ": "bleeding areas",
    "အနာတွေ": "wounds",
    "အနီစက်တွေ": "rashes",
    "ယားယားတဲ့နေရာများ": "itchy areas",
    "ခြောက်သွေ့တဲ့နေရာများ": "dry areas",
    "စိုစွတ်တဲ့နေရာများ": "moist areas",
    "အရေပြားပေါ်မှာအမှတ်တံတွေ": "skin spots",
    "အရေပြားပေါ်မှာအနာတွေ": "skin lesions",
    "အရေပြားပေါ်မှာရောင်ရမ်းတွေ": "skin inflammation",
    "ကိုယ်အလေးချိန်ကျ": "weight loss",
    "ကိုယ်အလေးချိန်တိုး": "weight gain",
    "ကိုယ်အလေးချိန်အလျင်လျင်ကျ": "unexplained weight loss",
    "ကိုယ်အလေးချိန်အလျင်လျင်တိုး": "unexplained weight gain",
    "အစာစားချင်စိတ်များ": "increased appetite",
    "အစာစားချင်စိတ်မရှိ": "loss of appetite",
    "ရေသောက်ချင်တာများ": "excessive thirst",
    "ချွေးများလွန်း": "excessive sweating",
    "အိပ်ချိန်မှန်မဟုတ်": "sleep problems",
    "သတိရှိမှုလျော့နည်း": "impaired memory",
    "စိတ်ဓာတ်မတည်မှု": "mood changes",
    "စိတ်ဓာတ်ကျ": "depression",
    "မိတ်ဆက်စိတ်": "anxiety",
    "စိတ်ဓာတ်တက်လျှကျ": "mood swings",
    "စိတ်အားနည်း": "fatigue",
    "ကိုယ်အားနည်း": "weakness",
    "လှုပ်ရှားရန်ခက်ခဲ": "difficulty moving",
    "လှည့်ရန်ခက်ခဲ": "difficulty walking",
    "ကိုယ်ထိန်းချုပ်မှုမရှိ": "loss of balance",
    "ကိုယ်ထိန်းချုပ်မှုလျော့နည်း": "impaired coordination",
    "လက်ခြေမတုန်လှုပ်": "tremors",
    "ကြွက်သားမကျုံ့မထိ": "muscle cramps",
    "ကြွက်သားတုန်လှုပ်": "muscle twitches",
    "မျက်လုံးမြင်ကျ": "vision changes",
    "မျက်လုံးမှာအမှတ်တံများ": "floaters",
    "မျက်လုံးမှာအလင်းရှိ": "flashes of light",
    "မျက်လုံးမှောင်မိုက်": "blurred vision",
    "မျက်လုံးမြင်ကျ": "vision loss",
    "မျက်လုံးကိုက်": "eye pain",
    "မျက်လုံးရောင်ရမ်း": "red eyes",
    "မျက်လုံးခြောက်သွေ့": "dry eyes",
    "မျက်လုံးမျက်ရည်များ": "watery eyes",
    "နားကိုက်": "ear pain",
    "နားကိုက်ခြင်း": "earache",
    "နားမကြား": "hearing loss",
    "နားထဲမှာအသံမြည်ခြင်း": "tinnitus",
    "နားထဲမှာရေရှိ": "ear fullness",
    "နားထဲမှာရေထွက်": "ear drainage",
    "နှာခေါင်းကိုက်": "sinus pain",
    "နှာခေါင်းပိတ်": "nasal congestion",
    "နှာခေါင်းစေး": "runny nose",
    "နှာခေါင်းချေ": "sneezing",
    "လည်ချောင်းနာ": "sore throat",
    "ချောင်းဆိုး": "cough",
    "အသက်ရှူကျပ်": "shortness of breath",
    "အသက်ရှူမဝ": "difficulty breathing",
    "ဆူးလာ": "wheezing",
    "ရင်ဘတ်နာ": "chest pain",
    "ရင်ဘတ်အောင့်": "chest pressure",
    "နှလုံးခုန်မမှန်": "palpitations",
    "နှလုံးခုန်မြန်": "rapid heartbeat",
    "နှလုံးခုန်နှေး": "slow heartbeat",
}

ROMANIZED_SYMPTOM_MAP = {
    "konkai": "headache",
    "khon kai": "headache",
    "kon kai": "headache",
    "khonkai": "headache",
    "konkai miri": "headache",
    "khon kai miri": "headache",
    "kon kai miri": "headache",
    "kaung ai": "headache",
    "kaungai": "headache",
    "kone kai": "headache",
    "kyaw kai": "headache",
    "pyar": "fever",
    "pyaar": "fever",
    "pyar nyar": "fever",
    "pyaar nyar": "fever",
    "chaung soe": "cough",
    "chaungsoe": "cough",
    "chaung so": "cough",
    "chaung soe lar": "cough",
    "chawng soe": "cough",
    "hsaung htaung": "sore throat",
    "hsaung htaung nar": "sore throat",
    "hsaung htaung nar": "sore throat",
    "nga hsay": "runny nose",
    "nga hsay lar": "runny nose",
    "nga hsay": "sneezing",
    "nga pay": "congestion",
    "nga pay nar": "congestion",
    "twar": "fever",
    "twar nyar": "fever",
    "kyi pu": "chills",
    "kywet thar nar": "muscle aches",
    "myok thar nar": "muscle aches",
    "nar": "pain",
    "swar": "fatigue",
    "pin pan": "fatigue",
    "a twar gyi": "high fever",
    "a sait a myit nar": "joint pain",
    "a ni sit": "rash",
    "a in pyin": "rash",
    "mu": "dizziness",
    "myet si lae": "dizziness",
    "yin tot aung": "chest pain",
    "boke aung": "stomach pain",
    "boke nar": "stomach pain",
    "pyo": "nausea",
    "an": "vomiting",
    "wan hlao": "diarrhea",
    "wan pyat": "diarrhea",
    "a htauk kyap": "shortness of breath",
    "yin kyap": "shortness of breath",
    "nga htaung hse yo": "nosebleeds",
    "hse do": "hypertension",
    "a sa ma kyay": "indigestion",
    "yin pu": "heartburn",
    "wan gyoke": "constipation",
    "yar": "itching",
    "aite ma pyaw": "insomnia",
    "yaung": "fatigue",
    "kait": "muscle aches",
    "khar": "back pain",
    "khar kai": "back pain",
    "khar nar": "back pain",
    "a htauk ma wai": "difficulty breathing",
    "met la yaung": "forgetfulness",
    "ma yaung": "memory loss",
    "myet si khauk thwar": "dry eyes",
    "pa hset khauk thwar": "dry mouth",
    "nar kai": "ear pain",
    "nar kai nar": "earache",
    "myet si nar": "eye pain",
    "myet si ni": "eye redness",
    "a yay pyar khauk thwar": "dry skin",
    "a yay pyar yar yar": "itchy skin",
    "hsu la": "wheezing",
    "an twat": "vomiting",
    "hse hlaing": "bleeding",
    "hse yo": "bleeding",
    "wan hse yo": "rectal bleeding",
    "hse toat hlaing": "bruising",
    "a sait a myit yaung yan": "joint swelling",
    "myok thar tin ma": "muscle stiffness",
    "kaung hmu": "dizziness",
    "htain ma kya": "lightheadedness",
    "myet na ma that taung": "facial numbness",
    "myet na a hnar nyung": "facial weakness",
    "thati hlaing": "confusion",
    "mite me": "fainting",
    "hse do": "high blood pressure",
    "hse nge": "low blood pressure",
    "a sa ma saung": "loss of appetite",
    "ko yay a hnit kya": "weight loss",
    "ko yay a hnit to": "weight gain",
    "kyaung hlaung ta hkwan": "night sweats",
    "aite hman ma hpar": "sleep disturbances",
    "mit sat": "anxiety",
    "sint dat kya": "depression",
    "sint dat to kya": "mood swings",
    "yaung hlaing kya": "vision loss",
    "myet si maung myauk": "blurred vision",
    "a yit hlaing kya": "visual disturbances",
    "myet si a htaung a light": "halos around lights",
    "nar ma kya": "hearing loss",
    "nar htway htaung a sone myaung": "tinnitus",
    "thay zet ma kya": "difficulty swallowing",
    "pa hset htway a na": "mouth sores",
    "myet si myet na yaung yan": "swollen eyelids",
    "la gyi khar": "neck pain",
    "la gyi khar tin ma": "neck stiffness",
    "kyaung kai": "back pain",
    "kywe kai": "leg pain",
    "let kai": "arm pain",
    "pa hton kai": "shoulder pain",
    "du kai": "knee pain",
    "ko to a pu laing": "fever",
    "a yit kya sit": "infection",
    "yaung yan": "swelling",
    "ni": "redness",
    "pu": "warmth",
    "nar": "pain",
    "htet la ma kya": "tenderness",
    "a yay twat": "discharge",
    "hkye hswar laing": "excessive sweating",
    "yay saung laing": "excessive thirst",
    "hsi hlaing laing": "frequent urination",
    "hsi nar": "painful urination",
    "hsi ma pyaung": "incontinence",
    "myet yay hlaing laing": "excessive tearing",
    "hsi htaung a yit": "urinary tract infection",
    "kyaung pal nar": "kidney pain",
    "hkyet pran nar": "flank pain",
    "a myo thar nar": "pelvic pain",
    "a sa sa pyin nar": "pain after eating",
    "a sa sa ma nar": "pain before eating",
    "a myo thar a yit": "gynecological issues",
    "myet si a htaung yaung yan": "swollen eyes",
    "a yay pyar htway a na": "skin lesions",
    "a yay pyar htway a ni sit": "skin rash",
    "yaung yan a yay pyar": "inflamed skin",
    "a yay pyar htway a na": "skin wounds",
    "a yay pyar htway a sit": "skin spots",
    "hse a hnar nyung": "anemia",
    "ko yay a hnit to kya": "weight changes",
    "a sa saung laing": "increased appetite",
    "a sa saung ma laing": "loss of appetite",
    "ko yay a hnit a lwin lwin kya": "unexplained weight loss",
    "ko yay a hnit a lwin lwin to": "unexplained weight gain",
    "aite hman ma hpar": "sleep problems",
    "aite maung": "nightmares",
    "aite hman htaung a lwin": "sleepwalking",
    "aite hman htaung a htauk kyap": "sleep apnea",
    "thati hman laing laing": "impaired memory",
    "sint dat ma hpar": "mood changes",
    "sint dat kya": "depression",
    "mit sat": "anxiety",
    "sint dat to kya": "mood swings",
    "sint a hnar nyung": "fatigue",
    "ko a hnar nyung": "weakness",
    "let kywe a hnar nyung": "muscle weakness",
    "myok thar a hnar nyung": "muscle weakness",
    "lut htat ma kya": "difficulty moving",
    "hlyat htat ma kya": "difficulty walking",
    "ko htet hmu ma hpar": "loss of balance",
    "ko htet hmu laing laing": "impaired coordination",
    "let kywe ma ton hlat": "tremors",
    "myok thar ma kyon ma htat": "muscle cramps",
    "myok thar ton hlat": "muscle twitches",
    "myet si hlaing kya": "vision changes",
    "myet si htway a sit": "floaters",
    "myet si htway a light": "flashes of light",
    "myet si maung myauk": "blurred vision",
    "myet si hlaing kya": "vision loss",
    "myet si nar": "eye pain",
    "myet si ni": "red eyes",
    "myet si khauk thwar": "dry eyes",
    "myet si myet yay hlaing": "watery eyes",
    "nar kai": "ear pain",
    "nar kai nar": "earache",
    "nar ma kya": "hearing loss",
    "nar htway htaung a sone myaung": "tinnitus",
    "nar htway htaung yay hsi": "ear fullness",
    "nar htway htaung yay twat": "ear drainage",
    "nga htaung nar": "sinus pain",
    "nga htaung pay": "nasal congestion",
    "nga htaung hsay": "runny nose",
    "nga htaung hsay": "sneezing",
    "hsaung htaung nar": "sore throat",
    "chaung soe": "cough",
    "a htauk kyap": "shortness of breath",
    "a htauk ma wai": "difficulty breathing",
    "hsu la": "wheezing",
    "yin tot nar": "chest pain",
    "yin tot aung": "chest pressure",
    "hlet hsin ma hpar": "palpitations",
    "hlet hsin myan": "rapid heartbeat",
    "hlet hsin hnau": "slow heartbeat",
    "boke nar": "abdominal pain",
    "boke aung": "abdominal pain",
    "pyo": "nausea",
    "an": "vomiting",
    "wan hlao": "diarrhea",
    "wan pyat": "diarrhea",
    "wan gyoke": "constipation",
    "wan hse yo": "rectal bleeding",
    "a sa ma kyay": "indigestion",
    "yin pu": "heartburn",
    "a sa sa pyin nar": "pain after eating",
    "khar nar": "back pain",
    "kyaung pal nar": "kidney pain",
    "hkyet pran nar": "flank pain",
    "hsi nar": "painful urination",
    "hsi hlaing laing": "frequent urination",
    "hsi a hnau": "urgency",
    "hsi ma pyaung": "incontinence",
    "a myo thar nar": "pelvic pain",
    "a myo thar yay twat": "vaginal discharge",
    "a myo thar yar yar": "vaginal itching",
    "a myo thar yaung yan": "vaginal irritation",
    "la hman ma hpar": "irregular periods",
    "la hman gyi": "heavy periods",
    "la hman kya laing": "prolonged periods",
    "la hman ma hpar": "missed periods",
}

ENGLISH_SYMPTOM_ALIASES = {
    "headache": "headache",
    "head ache": "headache",
    "fever": "fever",
    "cough": "cough",
    "dry cough": "dry cough",
    "sore throat": "sore throat",
    "runny nose": "runny nose",
    "chest pain": "chest pain",
    "rash": "rash",
    "fatigue": "fatigue",
    "dizziness": "dizziness",
    "shortness of breath": "shortness of breath",
    "stomach pain": "stomach pain",
    "high fever": "high fever",
    "joint pain": "joint pain",
    "muscle aches": "muscle aches",
    "sneezing": "sneezing",
    "congestion": "congestion",
    "chills": "chills",
    "nausea": "nausea",
    "vomiting": "vomiting",
    "diarrhea": "diarrhea",
    "indigestion": "indigestion",
    "heartburn": "heartburn",
    "constipation": "constipation",
    "itching": "itching",
    "insomnia": "insomnia",
    "back pain": "back pain",
    "abdominal pain": "abdominal pain",
    "abdominal swelling": "abdominal swelling",
    "difficulty breathing": "difficulty breathing",
    "difficulty swallowing": "difficulty swallowing",
    "chest pressure": "chest pressure",
    "palpitations": "palpitations",
    "rapid heartbeat": "rapid heartbeat",
    "slow heartbeat": "slow heartbeat",
    "irregular heartbeat": "irregular heartbeat",
    "numbness": "numbness",
    "tingling": "tingling",
    "weakness": "weakness",
    "muscle weakness": "muscle weakness",
    "muscle cramps": "muscle cramps",
    "muscle stiffness": "muscle stiffness",
    "joint swelling": "joint swelling",
    "swelling": "swelling",
    "redness": "redness",
    "warmth": "warmth",
    "tenderness": "tenderness",
    "discharge": "discharge",
    "bleeding": "bleeding",
    "bruising": "bruising",
    "rash": "rash",
    "itching": "itching",
    "dry skin": "dry skin",
    "itchy skin": "itchy skin",
    "skin rash": "skin rash",
    "skin lesions": "skin lesions",
    "skin changes": "skin changes",
    "dry eyes": "dry eyes",
    "dry mouth": "dry mouth",
    "dry cough": "dry cough",
    "wheezing": "wheezing",
    "sinus pain": "sinus pain",
    "nasal congestion": "nasal congestion",
    "ear pain": "ear pain",
    "earache": "earache",
    "hearing loss": "hearing loss",
    "tinnitus": "tinnitus",
    "ear fullness": "ear fullness",
    "ear drainage": "ear drainage",
    "eye pain": "eye pain",
    "eye redness": "eye redness",
    "blurred vision": "blurred vision",
    "vision loss": "vision loss",
    "vision changes": "vision changes",
    "floaters": "floaters",
    "flashes of light": "flashes of light",
    "halos around lights": "halos around lights",
    "light sensitivity": "sensitivity to light",
    "photophobia": "sensitivity to light",
    "neck pain": "neck pain",
    "neck stiffness": "neck stiffness",
    "shoulder pain": "shoulder pain",
    "arm pain": "arm pain",
    "leg pain": "leg pain",
    "knee pain": "knee pain",
    "flank pain": "flank pain",
    "kidney pain": "kidney pain",
    "pelvic pain": "pelvic pain",
    "painful urination": "painful urination",
    "frequent urination": "frequent urination",
    "urgency": "urgency",
    "incontinence": "incontinence",
    "urinary tract infection": "urinary tract infection",
    "vaginal discharge": "vaginal discharge",
    "vaginal itching": "vaginal itching",
    "vaginal irritation": "vaginal irritation",
    "irregular periods": "irregular periods",
    "heavy periods": "heavy periods",
    "prolonged periods": "prolonged periods",
    "missed periods": "missed periods",
    "weight loss": "weight loss",
    "weight gain": "weight gain",
    "unexplained weight loss": "unexplained weight loss",
    "unexplained weight gain": "unexplained weight gain",
    "loss of appetite": "loss of appetite",
    "increased appetite": "increased appetite",
    "excessive thirst": "excessive thirst",
    "excessive sweating": "excessive sweating",
    "night sweats": "night sweats",
    "sleep disturbances": "sleep disturbances",
    "insomnia": "insomnia",
    "fatigue": "fatigue",
    "weakness": "weakness",
    "malaise": "malaise",
    "general malaise": "malaise",
    "confusion": "confusion",
    "memory loss": "memory loss",
    "impaired memory": "memory loss",
    "mood changes": "mood changes",
    "depression": "depression",
    "anxiety": "anxiety",
    "mood swings": "mood swings",
    "irritability": "irritability",
    "agitation": "agitation",
    "restlessness": "restlessness",
    "tremors": "tremors",
    "seizures": "seizures",
    "fainting": "fainting",
    "syncope": "fainting",
    "lightheadedness": "lightheadedness",
    "dizziness": "dizziness",
    "vertigo": "vertigo",
    "loss of balance": "loss of balance",
    "impaired coordination": "impaired coordination",
    "difficulty walking": "difficulty walking",
    "difficulty moving": "difficulty moving",
    "muscle twitches": "muscle twitches",
    "facial numbness": "facial numbness",
    "facial weakness": "facial weakness",
    "slurred speech": "slurred speech",
    "difficulty speaking": "difficulty speaking",
    "high blood pressure": "high blood pressure",
    "hypertension": "hypertension",
    "low blood pressure": "low blood pressure",
    "hypotension": "low blood pressure",
    "rectal bleeding": "rectal bleeding",
    "bloody stools": "rectal bleeding",
    "tarry stools": "tarry stools",
    "constipation": "constipation",
    "diarrhea": "diarrhea",
    "nausea and vomiting": "nausea",
    "vomiting blood": "vomiting blood",
    "heartburn": "heartburn",
    "acid reflux": "heartburn",
    "indigestion": "indigestion",
    "loss of appetite": "loss of appetite",
    "early satiety": "early satiety",
    "abdominal pain": "abdominal pain",
    "abdominal swelling": "abdominal swelling",
    "jaundice": "jaundice",
    "yellow skin": "jaundice",
    "yellow eyes": "jaundice",
    "dark urine": "dark urine",
    "pale stools": "pale stools",
    "fatty stools": "fatty stools",
    "foul-smelling stools": "foul-smelling stools",
    "pale skin": "pale skin",
    "pallor": "pale skin",
    "fatigue": "fatigue",
    "weakness": "weakness",
    "shortness of breath": "shortness of breath",
    "rapid heart rate": "rapid heartbeat",
    "tachycardia": "rapid heartbeat",
    "bradycardia": "slow heartbeat",
    "arrhythmia": "irregular heartbeat",
    "chest pain": "chest pain",
    "angina": "chest pain",
    "heart attack": "heart attack",
    "myocardial infarction": "heart attack",
    "stroke": "stroke",
    "transient ischemic attack": "transient ischemic attack",
    "tia": "transient ischemic attack",
}

def translate_incoming_symptoms(symptoms: List[str]) -> List[str]:
    translated = []
    print(f"DEBUG: Incoming symptoms: {symptoms}")
    
    # Sort SYMPTOM_MAP keys by length descending to match longest phrases first
    sorted_keys = sorted(SYMPTOM_MAP.keys(), key=len, reverse=True)
    
    for s in symptoms:
        # Split by comma in case user typed multiple symptoms in one go
        parts = [p.strip() for p in re.split(r'[\n,;။]+', s) if p.strip()]
        for p in parts:
            p_raw = p.strip()
            p_lower = p_raw.lower().strip()
            # Remove common Myanmar sentence suffixes and punctuation noise from voice transcripts
            p_clean = re.sub(r'[^a-z0-9\u1000-\u109f\s]', ' ', p_lower)
            p_clean = re.sub(r'\s+', ' ', p_clean).strip()
            p_clean = p_clean.replace('တယ်', '').replace('လို့', '').replace('နေတယ်', '').replace('ပါတယ်', '').strip()
            
            found = False

            if p_clean in ENGLISH_SYMPTOM_ALIASES:
                translated.append(ENGLISH_SYMPTOM_ALIASES[p_clean])
                found = True

            if not found:
                for mm_key in sorted_keys:
                    if mm_key in p_clean or mm_key in p_lower:
                        translated.append(SYMPTOM_MAP[mm_key])
                        found = True
                        break

            if not found and p_clean:
                for roman_key, english_value in ROMANIZED_SYMPTOM_MAP.items():
                    if (
                        p_clean == roman_key
                        or p_clean.startswith(roman_key + ' ')
                        or p_clean.endswith(' ' + roman_key)
                        or roman_key in p_clean
                        or fuzz.partial_ratio(p_clean, roman_key) > 72
                    ):
                        translated.append(english_value)
                        found = True
                        break

            if not found and p_clean:
                for mm_key, english_value in SYMPTOM_MAP.items():
                    if len(mm_key) >= 2 and (mm_key in p_clean or p_clean.startswith(mm_key) or p_clean.endswith(mm_key)):
                        translated.append(english_value)
                        found = True
                        break

            if not found and p_clean:
                candidate_terms = list(ENGLISH_SYMPTOM_ALIASES.keys()) + sorted_keys + list(ROMANIZED_SYMPTOM_MAP.keys())
                best_match, score = process.extractOne(p_clean, candidate_terms, scorer=fuzz.ratio)
                if score > 75:
                    if best_match in ENGLISH_SYMPTOM_ALIASES:
                        translated.append(ENGLISH_SYMPTOM_ALIASES[best_match])
                    elif best_match in ROMANIZED_SYMPTOM_MAP:
                        translated.append(ROMANIZED_SYMPTOM_MAP[best_match])
                    elif best_match in SYMPTOM_MAP:
                        translated.append(SYMPTOM_MAP[best_match])
                    else:
                        translated.append(p_clean)
                    found = True
                else:
                    translated.append(p_clean)
    print(f"DEBUG: Translated symptoms: {translated}")
    return translated

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables and run column migrations on startup
    init_db()
    from migrate import migrate
    migrate()
    yield

app = FastAPI(title="Virtual Doctor API", lifespan=lifespan)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class UserCreate(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    profile_pic: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    height: Optional[str] = None
    weight: Optional[str] = None
    blood_pressure: Optional[str] = None
    emergency_contact: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    profile_pic: Optional[str] = None
    height: Optional[str] = None
    weight: Optional[str] = None
    blood_pressure: Optional[str] = None
    emergency_contact: Optional[str] = None

class HistoryCreate(BaseModel):
    type: str
    title: str
    details: str
    user_id: int

class HistoryResponse(BaseModel):
    id: int
    type: str
    title: str
    details: str
    timestamp: str
    model_config = ConfigDict(from_attributes=True)

class SymptomInput(BaseModel):
    symptoms: List[str]

class DiseaseResponse(BaseModel):
    disease: str
    description: str
    prevention: List[str]
    recommendation: str
    medications: List[str]

class ClinicalDecisionRequest(BaseModel):
    symptoms: List[str] = []
    answers: Dict[str, str] = {}
    user_profile: Dict[str, Any] = {}

class VitalLog(BaseModel):
    systolic: Optional[int] = None
    diastolic: Optional[int] = None
    value: Optional[float] = None
    date: Optional[str] = None

class PredictiveAnalyticsRequest(BaseModel):
    bmi: Optional[float] = None
    water: Optional[int] = 0
    bp_logs: List[VitalLog] = []
    mood_logs: List[Dict[str, Any]] = []

class TelemedicineSessionRequest(BaseModel):
    patient_id: Optional[int] = None
    patient_name: Optional[str] = None
    health_summary: Dict[str, Any] = {}

class FederatedUpdateRequest(BaseModel):
    user_id: Optional[int] = None
    model_name: str = "virtual-doctor-risk-model"
    metrics: Dict[str, float] = {}
    update: Dict[str, float] = {}

class VoiceCommandRequest(BaseModel):
    transcript: str

class PersonalizedInterventionRequest(BaseModel):
    profile: Dict[str, Any] = {}
    vitals: Dict[str, Any] = {}
    conditions: List[str] = []
    medicines: List[str] = []

ACTIVE_TELEMEDICINE_ROOMS: Dict[str, Dict[str, WebSocket]] = {}
FEDERATED_UPDATES: List[Dict[str, Any]] = []

RED_FLAG_SYMPTOMS = {
    "chest pain",
    "shortness of breath",
    "difficulty breathing",
    "fainting",
    "confusion",
    "severe headache",
    "weakness",
    "slurred speech",
    "high fever",
}

RED_FLAG_TRANSLATIONS_MM = {
    "chest pain": "ရင်နာ",
    "shortness of breath": "အသက်ရှူခက်ခြင်း",
    "difficulty breathing": "အသက်ရှူပြင်းခြင်း",
    "fainting": "မေ့မြောခြင်း",
    "confusion": "စိတ်ထုံလှုပ်ခြင်း",
    "severe headache": "ခေါင်းကိုက်ပြင်းထန်ခြင်း",
    "weakness": "အားနည်းခြင်း",
    "slurred speech": "မိန်းချုပ်မှု",
    "high fever": "အဖျားကြီးတက်ခြင်း",
}

TRIAGE_RECOMMENDATIONS = {
    "urgent": {
        "en": "Seek urgent medical review now, especially if symptoms are worsening.",
        "mm": "လက္ခဏာများ ပိုမိုဆိုးရွားလာပါက အထူးသဖြင့် ချက်ချင်း အရေးပေါ်စစ်ဆေးမှု ခံယူပါ။",
    },
    "doctor_consult": {
        "en": "Arrange a doctor consultation and continue monitoring vital signs.",
        "mm": "ဆရာဝန်နှင့် တိုင်ပင်ဆွေးနွေးရန် စီစဉ်ပြီး ကျန်းမာရေး လက္ခဏာများကို ဆက်လက်စောင့်ကြည့်ပါ။",
    },
    "self_care": {
        "en": "Use self-care and monitor symptoms for 24-48 hours.",
        "mm": "ကိုယ်တိုင်စောင့်ကြည့်ကုသမှုပြုလုပ်ပြီး ၂၄-၄၈ နာရီကြာ လက္ခဏာများကို စောင့်ကြည့်ပါ။",
    },
}

CLINICAL_DISCLAIMER = {
    "en": "Clinical decision support is not a final diagnosis. A licensed clinician must confirm care decisions.",
    "mm": "ဆေးဘက်ဆိုင်ရာ ဆုံးဖြတ်ချက်ပံ့ပိုးမှုသည် နောက်ဆုံးရောဂါရှာဖွေချက်မဟုတ်ပါ။ လိုင်စင်ရ ဆေးဘက်ဆိုင်ရာ ဗဟုသုတရှင်က ကုသမှုဆိုင်ရာ ဆုံးဖြတ်ချက်များကို အတည်ပြုရမည်။",
}

CLINICAL_FOLLOW_UPS = [
    "When did the symptoms start?",
    "How severe is the symptom from 1 to 10?",
    "Do you have chest pain, breathing difficulty, fainting, or confusion?",
    "What medicines are you currently taking?",
    "Do you have diabetes, hypertension, pregnancy, asthma, or heart disease?",
]

def normalize_number(value, default=None):
    try:
        if value is None or value == "":
            return default
        return float(value)
    except (TypeError, ValueError):
        return default

def match_disease_candidates(symptoms: List[str], limit: int = 3, lang_code: str = "en") -> List[Dict[str, Any]]:
    translated = translate_incoming_symptoms(symptoms)
    terms = [s.lower().strip() for s in translated + symptoms if s and s.strip()]
    scored = []
    for disease in DISEASES_EN:
        disease_symptoms = [s.lower() for s in disease.get("symptoms", [])]
        score = 0
        for term in terms:
            for known in disease_symptoms:
                if term == known:
                    score += 18
                elif term in known or known in term:
                    score += 10
                elif len(term) > 3 and fuzz.partial_ratio(term, known) > 85:
                    score += 7
        if score:
            scored.append((score, disease))
    scored.sort(key=lambda item: item[0], reverse=True)
    result = []
    for score, disease_en in scored[:limit]:
        entry = {
            "name": disease_en.get("name", "Unknown"),
            "description": disease_en.get("description", ""),
            "recommendation": disease_en.get("recommendation", ""),
            "score": score,
        }
        if lang_code == "mm":
            equiv, _ = _find_equivalent_in_dataset(disease_en, DISEASES_MM, min_score=0.20)
            if equiv is not None:
                entry["name"] = equiv.get("name") or entry["name"]
                entry["description"] = equiv.get("description") or entry["description"]
                entry["recommendation"] = equiv.get("recommendation") or entry["recommendation"]
        result.append(entry)
    return result

def build_health_summary(summary: Dict[str, Any], patient_name: Optional[str]) -> str:
    lines = [
        "AI Health Summary",
        f"Patient: {patient_name or 'Unknown patient'}",
        f"Generated: {datetime.datetime.utcnow().isoformat()}Z",
    ]
    for key, value in summary.items():
        lines.append(f"{key}: {value}")
    if len(lines) == 3:
        lines.append("No local health metrics were supplied by the app.")
    return "\n".join(lines)

def voice_command_action(transcript: str) -> Dict[str, str]:
    text = (transcript or "").strip()
    text_lower = text.lower()

    has_myanmar = any('\u1000' <= c <= '\u109F' for c in text)

    def matches(*keywords):
        for kw in keywords:
            if not kw:
                continue
            kw_lower = kw.lower()
            if '\u1000' <= kw[0] <= '\u109F':
                if kw in text:
                    return True
            else:
                if kw_lower in text_lower:
                    return True
        return False

    if matches("hospital", "clinic", "doctor", "emergency",
                "ဆေးရုံ", "ဆေးခန်း", "ဒေါက်တာ", "အရေးပေါ်",
                "ဆေးရုံသွား", "ဆေးခန်းသွား", "ဆေးရုံရှာ", "ဆေးရုံကို", "ဆေးခန်းရှာ"):
        reply = "အနီးဆုံး ဆေးရုံများကို ဖွင့်နေပါသည်။" if has_myanmar else "Opening nearby hospitals."
        return {"action": "navigate", "screen": "NearbyHospitals", "reply": reply}

    if matches("blood pressure", "bp",
                "သွေးတိုး", "သွေးပေါင်ချိန်", "သွေးပေါင်",
                "သွေးပေါင်ချိန်ပြ", "သွေးပေါင်ချိန်ကို", "သွေးပေါင်ချိန်မှတ်",
                "သွေးတိုးစစ်", "သွေးပေါင်စစ်"):
        reply = "သွေးပေါင်ချိန် မှတ်တမ်းစာမျက်နှာကို ဖွင့်နေပါသည်။" if has_myanmar else "Opening blood pressure logger."
        return {"action": "navigate", "screen": "BloodPressure", "reply": reply}

    if matches("water", "drink",
                "ရေ", "သောက်", "ရေသောက်", "ရေသောက်မယ်", "ရေသောက်တယ်",
                "ရေသောက်ဖို့", "ရေစာရင်း", "ရေမှတ်တမ်း"):
        reply = "ရေသောက်ခြင်း မှတ်တမ်းစာမျက်နှာကို ဖွင့်နေပါသည်။" if has_myanmar else "Opening water tracker."
        return {"action": "navigate", "screen": "WaterTracker", "reply": reply}

    if matches("medicine", "drug", "med",
                "ဆေး", "ဆေးဝါး", "ဆေးအကြောင်း", "ဆေးအမည်",
                "ဆေးရှာ", "ဆေးသိချင်", "ဆေးအကြောင်းပြ"):
        reply = "ဆေးအချက်အလက် စာမျက်နှာကို ဖွင့်နေပါသည်။" if has_myanmar else "Opening medicine information."
        return {"action": "navigate", "screen": "MedicineInfo", "reply": reply}

    if matches("fever", "cough", "symptom", "sick", "pain", "ill",
                "ဖျား", "ချောင်းဆိုး", "အဖျား", "လက္ခဏာ", "မူး", "နာ",
                "အနာ", "အန်", "ဖျားနာ", "နာကျင်", "ဝေဒနာ", "ပျက်စီး"):
        reply = "လက္ခဏာစစ်ဆေးမှု စာမျက်နှာကို ဖွင့်နေပါသည်။" if has_myanmar else "Opening clinical decision support."
        return {"action": "navigate", "screen": "ClinicalDecisionSupport", "reply": reply}

    if matches("appointment", "book", "schedule",
                "ချိန်းချိတ်", "ချိန်းဆို", "န်တစ်ချိတ်", "အစီအစဥ်"):
        reply = "ချိန်းဆိုမှု စာမျက်နှာကို ဖွင့်နေပါသည်။" if has_myanmar else "Opening appointments."
        return {"action": "navigate", "screen": "Appointment", "reply": reply}

    reply = "သင့်ကိုယ်ပိုင် ကျန်းမာရေးစီမံချက် စာမျက်နှာကို ဖွင့်နေပါသည်။" if has_myanmar else "Opening your personalized health plan."
    return {"action": "navigate", "screen": "PersonalizedIntervention", "reply": reply}

# Auth Endpoints
@app.post("/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(database.User).filter(database.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_pwd = hash_password(user.password)
    new_user = database.User(name=user.name, email=user.email, hashed_password=hashed_pwd)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/login", response_model=UserResponse)
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(database.User).filter(database.User.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    return db_user

@app.put("/users/{user_id}", response_model=UserResponse)
def update_user(user_id: int, user_update: UserUpdate, db: Session = Depends(get_db)):
    db_user = db.query(database.User).filter(database.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = user_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_user, key, value)
    
    db.commit()
    db.refresh(db_user)
    return db_user

# History Endpoints
@app.post("/history")
def add_history(history: HistoryCreate, db: Session = Depends(get_db)):
    new_history = database.History(
        type=history.type,
        title=history.title,
        details=history.details,
        user_id=history.user_id
    )
    db.add(new_history)
    db.commit()
    return {"message": "History saved"}

@app.get("/history/{user_id}", response_model=List[HistoryResponse])
def get_user_history(user_id: int, db: Session = Depends(get_db)):
    histories = db.query(database.History).filter(database.History.user_id == user_id).order_by(database.History.timestamp.desc()).all()
    # Format timestamp for JSON
    results = []
    for h in histories:
        results.append({
            "id": h.id,
            "type": h.type,
            "title": h.title,
            "details": h.details,
            "timestamp": h.timestamp.strftime("%Y-%m-%d %H:%M:%S")
        })
    return results

@app.delete("/history/{user_id}")
def clear_user_history(user_id: int, db: Session = Depends(get_db)):
    db.query(database.History).filter(database.History.user_id == user_id).delete()
    db.commit()
    return {"message": "History cleared"}

# Existing Endpoints
@app.get("/")
async def root():
    return {"message": "Welcome to Virtual Doctor API"}

@app.get("/doctor")
async def doctor_page():
    file_path = os.path.join(os.path.dirname(__file__), "doctor.html")
    return FileResponse(file_path)

def _symptom_token_set(symptoms):
    tokens = set()
    for s in symptoms or []:
        for tok in (s or "").lower().replace("_", " ").replace("ခြင်း", "").replace("တယ်", "").replace("နေတယ်", "").split():
            if len(tok) > 2:
                tokens.add(tok)
    return tokens

def _find_equivalent_in_dataset(source_entry, target_dataset, min_score=0.30, name_weight=0.45, sym_weight=0.55):
    """Find the equivalent entry in target_dataset using name + symptom similarity."""
    if not source_entry or not target_dataset:
        return None, None
    s_name = (source_entry.get("name") or "").strip().lower()
    s_syms = source_entry.get("symptoms", []) or []
    s_tokens = _symptom_token_set(s_syms)
    best_equiv = None
    best_score = 0.0
    for t in target_dataset:
        t_name = (t.get("name") or "").strip().lower()
        # 1. Name similarity
        name_sim = 0.0
        if s_name and t_name:
            if s_name == t_name:
                name_sim = 1.0
            elif s_name in t_name or t_name in s_name:
                name_sim = 0.85
            else:
                name_sim = fuzz.token_sort_ratio(s_name, t_name) / 100.0
        # 2. Symptom similarity (Jaccard)
        t_tokens = _symptom_token_set(t.get("symptoms", []) or [])
        sym_sim = 0.0
        union = s_tokens | t_tokens
        if union:
            sym_sim = len(s_tokens & t_tokens) / len(union)
        # Final weighted score
        score = name_sim * name_weight + sym_sim * sym_weight
        if score > best_score:
            best_score = score
            best_equiv = t
    if best_equiv is not None and best_score >= min_score:
        return best_equiv, best_score
    return None, 0.0

@app.post("/diagnose", response_model=DiseaseResponse)
async def diagnose(input_data: SymptomInput, accept_language: str = Header("en")):
    lang_code = accept_language.split(',')[0].split('-')[0].lower()
    print(f"DEBUG: Language code detected: {lang_code}")
    
    # Translate symptoms if they are in Myanmar
    raw_symptoms = input_data.symptoms
    translated_symptoms = translate_incoming_symptoms(raw_symptoms)
    user_symptoms = [s.lower().strip() for s in translated_symptoms]
    
    # Select dataset for results (primary)
    dataset = DISEASES_MM if lang_code == "mm" else DISEASES_EN
    
    best_match = None
    max_score = 0
    
    # Matching Logic - Always search across both datasets to find the best conceptual match
    all_combined_dataset = DISEASES_MM + DISEASES_EN
    
    for disease in all_combined_dataset:
        disease_name = disease.get("name", "").lower()
        disease_desc = disease.get("description", "").lower()
        disease_symptoms = [s.lower() for s in disease.get("symptoms", [])]
        
        score = 0
        
        # 1. Direct Name/Description Match (Highest priority)
        search_terms = list(set(user_symptoms + raw_symptoms))
        
        for term in search_terms:
            term_clean = term.lower().strip()
            if not term_clean or len(term_clean) < 3: continue
            
            # Boost for exact name match
            if term_clean == disease_name:
                score += 50
            elif term_clean in disease_name or disease_name in term_clean:
                score += 30
            
            # Boost for description match
            if term_clean in disease_desc:
                score += 20
                
            # Fuzzy match for typos in names
            f_score = fuzz.partial_ratio(term_clean, disease_name)
            if f_score > 90:
                score += 15

        # 2. Symptom Matching
        for term in search_terms:
            term_clean = term.lower().replace('ခြင်း', '').replace('တယ်', '').replace('နေတယ်', '').strip()
            if not term_clean: continue
            
            for ds in disease_symptoms:
                ds_clean = ds.lower().replace('ခြင်း', '').replace('တယ်', '').replace('နေတယ်', '').strip()
                # 1. Exact symptom match
                if term_clean == ds_clean:
                    score += 15
                # 2. Direct contains
                elif term_clean in ds_clean or ds_clean in term_clean:
                    score += 8
                # 3. Fuzzy match for symptoms
                elif len(term_clean) > 3:
                    if fuzz.ratio(term_clean, ds_clean) > 85:
                        score += 7
            
        if score > max_score:
            max_score = score
            best_match = disease
            
    if not best_match or max_score < 10: # Threshold to avoid random results
        if lang_code == "mm":
            return {
                "disease": "ရောဂါအမည်မသိရပါ",
                "description": "သင်ဖော်ပြထားသော လက္ခဏာများအရ တိကျသော ရောဂါကို မဖော်ထုတ်နိုင်ပါ။",
                "prevention": ["ဆရာဝန်နှင့် တိုင်ပင်ဆွေးနွေးပါ။", "လက္ခဏာများကို ဆက်လက်စောင့်ကြည့်ပါ။"],
                "recommendation": "လက္ခဏာများ ပိုမိုပြည့်စုံစွာ ဖော်ပြပါ သို့မဟုတ် နီးစပ်ရာ ဆေးခန်းသို့ သွားရောက်ပါ။",
                "medications": []
            }
        else:
            return {
                "disease": "Unknown Condition",
                "description": "We couldn't identify a specific disease based on your symptoms.",
                "prevention": ["Consult a doctor for a proper diagnosis.", "Monitor your symptoms."],
                "recommendation": "Please provide more details or visit a healthcare professional.",
                "medications": []
            }

    # Ensure result is in the user's preferred language using smart lookup
    final_result = best_match
    equiv, equiv_score = _find_equivalent_in_dataset(best_match, dataset, min_score=0.30)
    if equiv is not None:
        final_result = equiv
        print(f"DEBUG: Cross-language match found (score={equiv_score:.2f}): {best_match.get('name')} -> {equiv.get('name')}")
            
    return {
        "disease": final_result["name"],
        "description": final_result["description"],
        "prevention": final_result.get("prevention", final_result.get("precautions", [])),
        "recommendation": final_result["recommendation"],
        "medications": final_result.get("medications", [])
    }

@app.get("/medicines")
async def get_all_medicines(accept_language: str = Header("en")):
    lang_code = accept_language.split(',')[0].split('-')[0].lower()
    return MEDICINES_MM if lang_code == "mm" else MEDICINES_EN

@app.get("/medicine/{name}")
async def get_medicine_info(name: str, accept_language: str = Header("en")):
    lang_code = accept_language.split(',')[0].split('-')[0].lower()
    name_query = name.lower().strip()
    
    all_meds = MEDICINES_MM + MEDICINES_EN
    
    # 1. Try exact match or partial match first (fastest)
    for med in all_meds:
        med_name = med["name"].lower()
        if name_query == med_name or name_query in med_name or med_name in name_query:
            return med
            
    # 2. Use Fuzzy Matching if no direct match found
    best_match = None
    highest_score = 0
    
    for med in all_meds:
        med_name = med["name"].lower()
        # Clean the name for better matching (remove brackets content)
        clean_name = re.sub(r'\(.*?\)', '', med_name).strip()
        
        # Check against full name and clean name
        score = max(fuzz.partial_ratio(name_query, med_name), 
                    fuzz.partial_ratio(name_query, clean_name))
        
        if score > highest_score:
            highest_score = score
            best_match = med
            
    if best_match and highest_score > 80:
        return best_match
                
    raise HTTPException(status_code=404, detail="Medicine not found")

@app.get("/tips")
async def get_tips(accept_language: str = Header("en")):
    lang_code = accept_language.split(',')[0].split('-')[0].lower()
    return TIPS_MM if lang_code == "mm" else TIPS_EN

@app.post("/clinical-decision-support")
async def clinical_decision_support(payload: ClinicalDecisionRequest, accept_language: str = Header("en")):
    lang_code = accept_language.split(',')[0].split('-')[0].lower()
    symptoms = [s for s in payload.symptoms if s and s.strip()]
    normalized = [s.lower().strip() for s in translate_incoming_symptoms(symptoms)]
    red_flags_en = sorted({s for s in normalized if s in RED_FLAG_SYMPTOMS})
    candidates = match_disease_candidates(symptoms, lang_code=lang_code)

    answered_questions = {k: v for k, v in payload.answers.items() if v and v.strip()}
    next_questions = [
        question for question in CLINICAL_FOLLOW_UPS if question not in answered_questions
    ][:2]

    risk_score = min(
        100,
        15 + len(symptoms) * 7 + len(answered_questions) * 3 + len(red_flags_en) * 25,
    )
    if red_flags_en:
        triage = "urgent"
    elif risk_score >= 55:
        triage = "doctor_consult"
    else:
        triage = "self_care"

    recommendation = TRIAGE_RECOMMENDATIONS.get(triage, {}).get(lang_code, TRIAGE_RECOMMENDATIONS.get(triage, {}).get("en", ""))

    if lang_code == "mm":
        red_flags = [RED_FLAG_TRANSLATIONS_MM.get(rf, rf) for rf in red_flags_en]
    else:
        red_flags = red_flags_en

    return {
        "triage": triage,
        "risk_score": risk_score,
        "red_flags": red_flags,
        "candidate_conditions": candidates,
        "next_questions": next_questions,
        "recommendation": recommendation,
        "clinical_summary": {
            "symptoms": symptoms,
            "answers": answered_questions,
            "profile": payload.user_profile,
        },
        "disclaimer": CLINICAL_DISCLAIMER.get(lang_code, CLINICAL_DISCLAIMER.get("en", "")),
    }

@app.post("/predictive-analytics")
async def predictive_analytics(payload: PredictiveAnalyticsRequest):
    bp_logs = payload.bp_logs or []
    latest_bp = bp_logs[0] if bp_logs else None
    latest_sys = latest_bp.systolic if latest_bp else None
    latest_dia = latest_bp.diastolic if latest_bp else None

    risk_score = 18
    risk_factors = []
    forecast_parts = []
    
    if latest_sys and latest_dia:
        if latest_sys >= 140 or latest_dia >= 90:
            risk_score += 35
            risk_factors.append("Latest blood pressure is in a high range.")
            forecast_parts.append("Monitor blood pressure closely and consider a doctor check-up if symptoms occur.")
        elif latest_sys >= 130 or latest_dia >= 85:
            risk_score += 18
            risk_factors.append("Latest blood pressure is elevated.")
            forecast_parts.append("Continue logging blood pressure and reduce salt intake.")
        else:
            forecast_parts.append("Blood pressure is currently in a healthy range - keep up the good habits!")
    else:
        forecast_parts.append("Log blood pressure readings to get personalized predictions.")

    bmi = payload.bmi
    if bmi and bmi >= 30:
        risk_score += 22
        risk_factors.append("BMI is in an obesity range.")
        forecast_parts.append("Focus on balanced nutrition and light daily activity.")
    elif bmi and bmi >= 25:
        risk_score += 12
        risk_factors.append("BMI is above the normal range.")
        forecast_parts.append("Small daily changes can help move toward a healthier BMI.")
    elif bmi:
        forecast_parts.append("BMI is in a healthy range - maintain your current routine!")
    else:
        forecast_parts.append("Save your height and weight to calculate BMI.")

    water_intake = payload.water or 0
    if water_intake < 5:
        risk_score += 10
        risk_factors.append("Water intake is below the daily target.")
        forecast_parts.append("Aim for 6-8 glasses of water today - sip regularly!")
    elif water_intake >= 8:
        forecast_parts.append("Great job hitting your water intake goal!")
    else:
        forecast_parts.append("You're close to your water goal - just a few more glasses!")

    sys_values = [log.systolic for log in bp_logs if log.systolic]
    if len(sys_values) >= 3:
        trend = sys_values[0] - sys_values[-1]
        if trend > 5:
            risk_score += 12
            risk_factors.append("Blood pressure trend is increasing.")
            forecast_parts.append("Your blood pressure has been rising - monitor it closely.")
            bp_trend = "rising"
        elif trend < -5:
            forecast_parts.append("Great news - your blood pressure trend is improving!")
            bp_trend = "improving"
        else:
            forecast_parts.append("Your blood pressure has been stable.")
            bp_trend = "stable"
    else:
        bp_trend = "not_enough_data"

    risk_score = min(100, risk_score)
    if risk_score >= 70:
        level = "high"
    elif risk_score >= 45:
        level = "moderate"
    else:
        level = "stable"  # Changed to match frontend's "predictive_stable_risk_trend" key

    forecast = " ".join(forecast_parts) if forecast_parts else "Keep logging blood pressure, BMI, water, and mood daily to improve prediction quality."

    return {
        "risk_score": risk_score,
        "risk_level": level,
        "bp_trend": bp_trend,
        "risk_factors": risk_factors or ["No major risk trend detected from supplied data."],
        "forecast": forecast,
    }

FIXED_ROOM_ID = "virtual-doctor-direct-call"

@app.get("/doctor")
async def redirect_to_telemedicine_doctor():
    return RedirectResponse(url="/telemedicine/doctor")

@app.get("/telemedicine/doctor")
async def get_doctor_console():
    doctor_html_path = os.path.join(os.path.dirname(__file__), "doctor.html")
    return FileResponse(doctor_html_path)

@app.post("/telemedicine/session")
async def create_telemedicine_session(payload: TelemedicineSessionRequest):
    ACTIVE_TELEMEDICINE_ROOMS[FIXED_ROOM_ID] = {}
    return {
        "room_id": FIXED_ROOM_ID,
        "patient_id": payload.patient_id,
        "doctor_summary": build_health_summary(
            payload.health_summary,
            payload.patient_name,
        ),
        "signaling_path": f"/telemedicine/ws/{FIXED_ROOM_ID}/patient",
    }

@app.websocket("/telemedicine/ws/{room_id}/{participant}")
async def telemedicine_signaling(websocket: WebSocket, room_id: str, participant: str):
    await websocket.accept()
    room = ACTIVE_TELEMEDICINE_ROOMS.setdefault(room_id, {})
    
    # Notify existing participants that a new participant joined
    existing_participants = list(room.keys())
    for existing_participant, existing_ws in room.items():
        try:
            await existing_ws.send_json({
                "type": "participant-joined",
                "participant": participant
            })
        except Exception as e:
            print(f"Error notifying {existing_participant}: {e}")
    
    # Add new participant to the room
    room[participant] = websocket
    
    try:
        await websocket.send_json({
            "type": "joined", 
            "room_id": room_id, 
            "participant": participant,
            "existing_participants": existing_participants
        })
        
        while True:
            message = await websocket.receive_json()
            target = message.get("target")
            recipients = []
            if target and target in room:
                recipients = [room[target]]
            else:
                recipients = [ws for name, ws in room.items() if name != participant]
            for recipient in recipients:
                await recipient.send_json({
                    "from": participant,
                    "room_id": room_id,
                    "payload": message,
                })
    except WebSocketDisconnect:
        if room.get(participant) is websocket:
            del room[participant]
            # Notify remaining participants that someone left
            for remaining_ws in room.values():
                try:
                    await remaining_ws.send_json({
                        "type": "participant-left",
                        "participant": participant
                    })
                except Exception as e:
                    print(f"Error notifying remaining participants: {e}")
        if not room:
            ACTIVE_TELEMEDICINE_ROOMS.pop(room_id, None)

@app.post("/federated-learning/update")
async def federated_learning_update(payload: FederatedUpdateRequest):
    if not payload.update:
        raise HTTPException(status_code=400, detail="Model update is required")
    safe_update = {
        key: float(value)
        for key, value in payload.update.items()
        if isinstance(value, (int, float)) and abs(float(value)) <= 10
    }
    update_hash = hashlib.sha256(
        json.dumps(safe_update, sort_keys=True).encode("utf-8")
    ).hexdigest()
    record = {
        "model_name": payload.model_name,
        "metrics": payload.metrics,
        "update_size": len(safe_update),
        "update_hash": update_hash,
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
    }
    FEDERATED_UPDATES.append(record)
    aggregate = {}
    for update_record in FEDERATED_UPDATES[-25:]:
        aggregate[update_record["model_name"]] = aggregate.get(update_record["model_name"], 0) + 1
    return {
        "accepted": True,
        "privacy_mode": "raw_patient_data_not_received",
        "update_hash": update_hash,
        "aggregation_window": aggregate,
        "message": "Federated update accepted. Only numeric model deltas were processed.",
    }

@app.post("/voice/transcribe")
async def transcribe_voice(file: UploadFile = File(...)):
    try:
        audio_content = await file.read()

        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1] or ".wav") as temp_file:
            temp_file.write(audio_content)
            temp_file_path = temp_file.name

        try:
            model = get_whisper_model()

            transcript = ""
            try:
                segments, info = model.transcribe(
                    temp_file_path,
                    beam_size=5,
                    language="my",
                    task="transcribe",
                    vad_filter=True,
                )
                for segment in segments:
                    transcript += segment.text
            except Exception as my_err:
                print(f"Burmese transcription attempt failed: {my_err}")

            if len(transcript.strip()) < 2:
                try:
                    segments, info = model.transcribe(
                        temp_file_path,
                        beam_size=5,
                        language="en",
                        task="transcribe",
                        vad_filter=True,
                    )
                    transcript = ""
                    for segment in segments:
                        transcript += segment.text
                except Exception as en_err:
                    print(f"English fallback transcription failed: {en_err}")

            if len(transcript.strip()) < 2:
                try:
                    segments, info = model.transcribe(
                        temp_file_path,
                        beam_size=5,
                        task="transcribe",
                        vad_filter=True,
                    )
                    transcript = ""
                    for segment in segments:
                        transcript += segment.text
                except Exception as auto_err:
                    print(f"Auto-detect transcription failed: {auto_err}")

            cleaned_transcript = re.sub(r'[^\x00-\x7F\u1000-\u109F\s\d\.\,\!\?]', '', transcript).strip()

            return {
                "transcript": cleaned_transcript,
            }
        finally:
            os.unlink(temp_file_path)
    except Exception as e:
        print(f"Transcription error: {e}")
        return {
            "transcript": "",
        }

@app.post("/voice/command")
async def voice_command(payload: VoiceCommandRequest):
    return voice_command_action(payload.transcript)

@app.post("/voice/interpret-symptoms")
async def interpret_voice_symptoms(payload: VoiceCommandRequest):
    transcript = (payload.transcript or "").strip()
    if not transcript:
        return {"symptoms": []}

    parts = [p.strip() for p in re.split(r"[\n,;။]+", transcript) if p.strip()]
    if not parts:
        parts = [transcript]

    translated = translate_incoming_symptoms(parts)
    normalized = []
    for item in translated:
        clean = item.strip().lower()
        if clean:
            normalized.append(clean)

    return {"symptoms": normalized}

@app.post("/personalized-intervention")
async def personalized_intervention(payload: PersonalizedInterventionRequest):
    vitals = payload.vitals or {}
    systolic = normalize_number(vitals.get("systolic"))
    diastolic = normalize_number(vitals.get("diastolic"))
    bmi = normalize_number(vitals.get("bmi"))
    water = normalize_number(vitals.get("water"), 0)
    conditions = [item.lower() for item in payload.conditions]

    plan = []
    if (systolic and systolic >= 130) or (diastolic and diastolic >= 85) or "hypertension" in conditions:
        plan.append({
            "title": "Blood pressure prevention",
            "priority": "high",
            "steps": [
                "Choose low-salt meals today.",
                "Avoid energy drinks and smoking exposure.",
                "Walk gently for 20 minutes if there is no chest pain or breathlessness.",
            ],
        })
    if bmi and bmi >= 25:
        plan.append({
            "title": "Weight and nutrition",
            "priority": "medium",
            "steps": [
                "Use half-plate vegetables, quarter protein, quarter rice or grains.",
                "Avoid sugary drinks today.",
            ],
        })
    if water < 6:
        plan.append({
            "title": "Hydration",
            "priority": "medium",
            "steps": ["Drink 1 glass of water now and target 6-8 glasses today unless restricted by a doctor."],
        })
    if payload.medicines:
        plan.append({
            "title": "Medicine safety",
            "priority": "medium",
            "steps": ["Use the medicine interaction checker before adding new medicines."],
        })
    if not plan:
        plan.append({
            "title": "Maintain healthy routine",
            "priority": "low",
            "steps": ["Keep regular sleep, light movement, balanced meals, and daily logs."],
        })
    return {"plan": plan, "generated_at": datetime.datetime.utcnow().isoformat() + "Z"}

# OCR Reader (Initialized lazily)
READER = None

def get_ocr_reader():
    global READER
    if READER is None:
        # Load reader for English (most medicines are in English)
        READER = easyocr.Reader(['en'], gpu=False)
    return READER

@app.post("/identify-medicine")
async def identify_medicine(file: UploadFile = File(...)):
    # Read image file
    contents = await file.read()
    filename = file.filename.lower()
    
    # OCR Logic
    extracted_text = ""
    try:
        # Convert bytes to image
        image = Image.open(io.BytesIO(contents)).convert('RGB')
        
        # Optimization: Resize for speed. 640px is usually enough for medicine labels.
        max_size = 640
        if max(image.size) > max_size:
            ratio = max_size / max(image.size)
            new_size = (int(image.size[0] * ratio), int(image.size[1] * ratio))
            # Use BILINEAR for faster resizing than LANCZOS
            image = image.resize(new_size, Image.Resampling.BILINEAR)
            
        image_np = np.array(image)
        
        reader = get_ocr_reader()
        # detail=0 returns only text, which is faster.
        # paragraph=True can also speed up by grouping nearby text.
        results = reader.readtext(image_np, detail=0, paragraph=False)
        
        # Combine all detected text
        extracted_text = " ".join(results).lower()
        print(f"DEBUG: OCR Extracted Text: {extracted_text}")
    except Exception as e:
        print(f"OCR Error: {e}")
        extracted_text = filename
    
    # Combine OCR text and filename
    search_source = (extracted_text + " " + filename).strip().lower()
    
    # Fuzzy Matching for better accuracy
    all_meds = MEDICINES_MM + MEDICINES_EN
    
    best_med = None
    highest_score = 0
    
    for med in all_meds:
        full_name = med["name"].lower()
        # Clean name for matching (e.g., remove (Cetirizine))
        clean_name = re.sub(r'\(.*?\)', '', full_name).strip()
        
        # Extract individual names (Brand, Generic, etc.)
        names_to_check = [clean_name]
        if "(" in full_name:
            brand_match = re.search(r'\((.*?)\)', full_name)
            if brand_match:
                # Split by / if multiple brands/names are in brackets
                inner_names = [n.strip() for n in brand_match.group(1).lower().split('/')]
                names_to_check.extend(inner_names)
        
        # Check each name against search_source
        for name in names_to_check:
            if not name or len(name) < 3: continue # Skip very short strings
            
            # 1. Exact or Word-in-String check (highest confidence)
            if f" {name} " in f" {search_source} " or search_source.startswith(name + " ") or search_source.endswith(" " + name):
                score = 100
            elif name in search_source:
                score = 95
            else:
                # 2. Fuzzy matching (for OCR errors)
                score = fuzz.partial_ratio(name, search_source)
            
            if score > highest_score:
                highest_score = score
                best_med = med
                
    # We only return if confidence is high enough
    if best_med and highest_score >= 80:
        display_name = best_med["name"]
        # Return the English brand name if possible for consistency
        if "(" in display_name:
            match = re.search(r'\((.*?)\)', display_name)
            if match:
                display_name = match.group(1).split('/')[0].strip()
        return {"medicine_name": display_name, "confidence": highest_score / 100}

    # If no good match, return a clear message instead of random guessing
    return {"medicine_name": "Unknown", "confidence": 0, "message": "Could not identify medicine clearly."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
