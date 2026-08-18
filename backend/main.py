import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
os.environ["OMP_NUM_THREADS"] = "4"
os.environ["MKL_NUM_THREADS"] = "4"

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Header, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict
from typing import Any, Dict, List, Optional
from contextlib import asynccontextmanager
import json
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
        try:
            whisper_model = WhisperModel("base", device="cpu", compute_type="float32", cpu_threads=2)
        except Exception as e:
            print(f"Failed to load base Whisper model, falling back to tiny: {e}")
            whisper_model = WhisperModel("tiny", device="cpu", compute_type="float32", cpu_threads=2)
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
    "chest pain": "ရင်ဘတ်အောင့်ခြင်း",
    "shortness of breath": "အသက်ရှူရခက်ခြင်း",
    "difficulty breathing": "မောကျပ်ခြင်း",
    "fainting": "သတိလစ်မူးမေ့ခြင်း",
    "confusion": "စိတ်ရှုပ်ထွေးခြင်း",
    "severe headache": "ခေါင်းကိုက်ပြင်းထန်ခြင်း",
    "weakness": "အားအင်ကုန်ခမ်းခြင်း",
    "slurred speech": "စကားမပီမသဖြစ်ခြင်း",
    "high fever": "အဖျားကြီးခြင်း",
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

DISEASE_NAME_TRANSLATIONS_MM = {
    "mumps": "ပါးချိတ်ရောင်ရောဂါ (Mumps)",
    "ludwig's angina": "ပါးစပ်နှင့် လည်ချောင်း ပြင်းထန်စွာ ရောင်ရမ်းပိုးဝင်ခြင်း (Ludwig's Angina)",
    "abscess": "ပြည်တည်နာ (Abscess)",
    "common cold": "ရိုးရိုးအအေးမိခြင်း (Common Cold)",
    "influenza": "တုပ်ကွေးရောဂါ (Flu / Influenza)",
    "acute bronchitis": "ရုတ်တရက် လေပြွန်ရောင်ခြင်း (Bronchitis)",
    "bronchitis": "လေပြွန်ရောင်ခြင်း (Bronchitis)",
    "pneumonia": "အဆုတ်ရောင်ရောဂါ (Pneumonia)",
    "tonsillitis": "အာသီးရောင်ခြင်း (Tonsillitis)",
    "pharyngitis": "လည်ချောင်းရောင်ခြင်း (Pharyngitis)",
    "laryngitis": "အသံအိုးရောင်ခြင်း (Laryngitis)",
    "sinusitis": "ထိပ်ကပ်နာ (Sinusitis)",
    "gastroenteritis": "အစာအိမ်နှင့် အူလမ်းကြောင်းရောင်ခြင်း (Gastroenteritis)",
    "gastritis": "အစာအိမ်ရောင်ခြင်း (Gastritis)",
    "gerd": "အစာအိမ်အက်ဆစ်ပြန်တက်ခြင်း (GERD)",
    "peptic ulcer disease": "အစာအိမ်အနာရောဂါ (Peptic Ulcer)",
    "migraine": "ခေါင်းတစ်ခြမ်းကိုက်ခြင်း (Migraine)",
    "tension headache": "စိတ်ဖိစီးမှုကြောင့် ခေါင်းကိုက်ခြင်း (Tension Headache)",
    "dengue fever": "သွေးလွန်တုပ်ကွေးရောဂါ (Dengue Fever)",
    "malaria": "ငှက်ဖျားရောဂါ (Malaria)",
    "typhoid fever": "အူရောင်ငန်းဖျားရောဂါ (Typhoid Fever)",
    "urinary tract infection": "ဆီးလမ်းကြောင်းပိုးဝင်ခြင်း (UTI)",
    "allergic rhinitis": "ဓာတ်မတည့် နှာစေးခြင်း (Allergic Rhinitis)",
    "asthma": "ပန်းနာရင်ကျပ်ရောဂါ (Asthma)",
    "copd": "နာတာရှည် အဆုတ်ရောဂါ (COPD)",
    "hypertension": "သွေးတိုးရောဂါ (Hypertension)",
    "type 2 diabetes": "အမျိုးအစား ၂ ဆီးချိုရောဂါ (Type 2 Diabetes)",
    "food poisoning": "အစာအဆိပ်သင့်ခြင်း (Food Poisoning)",
    "panic disorder": "ထိတ်လန့်တကြားဖြစ်ခြင်း (Panic Disorder)",
    "urticaria": "အင်ပြင်ထွက်ခြင်း (Hives / Urticaria)",
    "eczema": "နှင်းခူ / အရေပြားရောင်ခြင်း (Eczema)",
    "covid-19": "ကိုဗစ်-၁၉ ရောဂါ (COVID-19)",
}

COMMON_DISEASE_BOOST = {
    "influenza": 15,
    "common cold": 15,
    "acute bronchitis": 10,
    "bronchitis": 10,
    "gastroenteritis": 12,
    "gastritis": 12,
    "gerd": 10,
    "migraine": 10,
    "tension headache": 10,
    "allergic rhinitis": 12,
    "tonsillitis": 10,
    "pharyngitis": 10,
    "urinary tract infection": 10,
    "covid-19": 10,
    "dengue fever": 8,
    "food poisoning": 10,
}

DISEASE_NAME_TRANSLATIONS_MM = {
    "mumps": "ပါးချိတ်ရောင်ရောဂါ (Mumps)",
    "ludwig's angina": "ပါးစပ်နှင့် လည်ချောင်း ပြင်းထန်စွာ ရောင်ရမ်းပိုးဝင်ခြင်း (Ludwig's Angina)",
    "abscess": "ပြည်တည်နာ (Abscess)",
    "common cold": "ရိုးရိုးအအေးမိခြင်း (Common Cold)",
    "influenza": "ရာသီတုပ်ကွေး / ဗိုင်းရပ်စ်ကြောင့် ဖျားနာခြင်း (Flu / Viral Fever)",
    "acute bronchitis": "ရုတ်တရက် လေပြွန်ရောင်ခြင်း (Bronchitis)",
    "bronchitis": "လေပြွန်ရောင်ခြင်း (Bronchitis)",
    "pneumonia": "အဆုတ်ရောင်ရောဂါ (Pneumonia)",
    "tonsillitis": "အာသီးရောင်ခြင်း (Tonsillitis)",
    "pharyngitis": "လည်ချောင်းရောင်ခြင်း (Pharyngitis)",
    "laryngitis": "အသံအိုးရောင်ခြင်း (Laryngitis)",
    "sinusitis": "ထိပ်ကပ်နာ (Sinusitis)",
    "gastroenteritis": "အစာအိမ်နှင့် အူလမ်းကြောင်းရောင်ခြင်း (Gastroenteritis)",
    "gastritis": "အစာအိမ်ရောင်ခြင်း (Gastritis)",
    "gerd": "အစာအိမ်အက်ဆစ်ပြန်တက်ခြင်း (GERD)",
    "peptic ulcer disease": "အစာအိမ်အနာရောဂါ (Peptic Ulcer)",
    "migraine": "ခေါင်းတစ်ခြမ်းကိုက်ခြင်း (Migraine)",
    "tension headache": "စိတ်ဖိစီးမှုကြောင့် ခေါင်းကိုက်ခြင်း (Tension Headache)",
    "dengue fever": "သွေးလွန်တုပ်ကွေးရောဂါ (Dengue Fever)",
    "malaria": "ငှက်ဖျားရောဂါ (Malaria)",
    "typhoid fever": "အူရောင်ငန်းဖျားရောဂါ (Typhoid Fever)",
    "urinary tract infection": "ဆီးလမ်းကြောင်းပိုးဝင်ခြင်း (UTI)",
    "allergic rhinitis": "ဓာတ်မတည့် နှာစေးခြင်း (Allergic Rhinitis)",
    "asthma": "ပန်းနာရင်ကျပ်ရောဂါ (Asthma)",
    "copd": "နာတာရှည် အဆုတ်ရောဂါ (COPD)",
    "hypertension": "သွေးတိုးရောဂါ (Hypertension)",
    "type 2 diabetes": "အမျိုးအစား ၂ ဆီးချိုရောဂါ (Type 2 Diabetes)",
    "food poisoning": "အစာအဆိပ်သင့်ခြင်း (Food Poisoning)",
    "panic disorder": "ထိတ်လန့်တကြားဖြစ်ခြင်း (Panic Disorder)",
    "urticaria": "အင်ပြင်ထွက်ခြင်း (Hives / Urticaria)",
    "eczema": "နှင်းခူ / အရေပြားရောင်ခြင်း (Eczema)",
    "covid-19": "ကိုဗစ်-၁၉ ရောဂါ (COVID-19)",
}

def clean_clinical_text(text: str) -> str:
    if not text:
        return ""
    cleaned = re.sub(r'[\(\s]*,\s*,\s*[\)\s]*', ' ', text)
    cleaned = re.sub(r'\(\s*\)', '', cleaned)
    cleaned = re.sub(r'\s*,\s*$', '', cleaned)
    cleaned = re.sub(r'\s{2,}', ' ', cleaned).strip()
    return cleaned

def match_disease_candidates(symptoms: List[str], limit: int = 5, lang_code: str = "en") -> List[Dict[str, Any]]:
    translated = translate_incoming_symptoms(symptoms)
    terms = [s.lower().strip() for s in translated + symptoms if s and s.strip()]
    scored = []
    
    for disease in DISEASES_EN:
        disease_name = (disease.get("name") or "").lower().strip()
        disease_symptoms = [s.lower() for s in disease.get("symptoms", [])]
        score = 0
        matched_terms = []
        
        for term in terms:
            for known in disease_symptoms:
                if term == known:
                    score += 18
                    matched_terms.append(term)
                elif term in known or known in term:
                    score += 10
                    matched_terms.append(term)
                elif len(term) > 3 and fuzz.partial_ratio(term, known) > 85:
                    score += 7
                    matched_terms.append(term)
                    
        if score > 0:
            # Apply clinical base-rate prevalence boost for common everyday illnesses
            if disease_name in COMMON_DISEASE_BOOST:
                score += COMMON_DISEASE_BOOST[disease_name]
            scored.append((score, disease, list(set(matched_terms))))
            
    scored.sort(key=lambda item: item[0], reverse=True)
    result = []
    for score, disease_en, matched in scored[:limit]:
        raw_name = disease_en.get("name", "Unknown")
        name_lower = raw_name.lower().strip()
        
        # Determine likelihood label
        if score >= 32:
            likelihood_mm = "ဖြစ်နိုင်ခြေ အလွန်မြင့်မား"
            likelihood_en = "Very High Likelihood"
        elif score >= 20:
            likelihood_mm = "ဖြစ်နိုင်ခြေ မြင့်မား"
            likelihood_en = "High Likelihood"
        elif score >= 12:
            likelihood_mm = "ဖြစ်နိုင်ခြေ အလယ်အလတ်"
            likelihood_en = "Moderate Likelihood"
        else:
            likelihood_mm = "ဖြစ်နိုင်ခြေ အနည်းငယ်"
            likelihood_en = "Possible"

        # Generate intelligent clinical reasoning explaining WHY this condition is suspected
        matched_str = "၊ ".join(symptoms) if symptoms else "ဖော်ပြထားသော လက္ခဏာများ"
        if lang_code == "mm":
            reason = f"လူနာတွင် {matched_str} လက္ခဏာများ တွေ့ရှိရသဖြင့် ဤရောဂါဖြစ်နိုင်ခြေ အထူးမြင့်မားပါသည်။"
        else:
            reason = f"Patient presents with {', '.join(symptoms) if symptoms else 'reported symptoms'}, which strongly correlates with this condition."

        entry = {
            "name": raw_name,
            "description": clean_clinical_text(disease_en.get("description", "")),
            "recommendation": clean_clinical_text(disease_en.get("recommendation", "")),
            "reason": reason,
            "score": score,
            "likelihood": likelihood_mm if lang_code == "mm" else likelihood_en,
        }
        if lang_code == "mm":
            if name_lower in DISEASE_NAME_TRANSLATIONS_MM:
                entry["name"] = DISEASE_NAME_TRANSLATIONS_MM[name_lower]
            else:
                equiv, _ = _find_equivalent_in_dataset(disease_en, DISEASES_MM, min_score=0.20)
                if equiv is not None and equiv.get("name"):
                    entry["name"] = equiv.get("name")
                    if equiv.get("description"):
                        entry["description"] = clean_clinical_text(equiv.get("description"))
                    if equiv.get("recommendation"):
                        entry["recommendation"] = clean_clinical_text(equiv.get("recommendation"))
        result.append(entry)
    return result

def generate_clinical_action_plan(
    symptoms: List[str],
    answers: Dict[str, str],
    user_profile: Dict[str, Any],
    candidates: List[Dict[str, Any]],
    red_flags: List[str],
    triage: str,
    lang_code: str = "en"
) -> Dict[str, Any]:
    onset_text = ""
    severity_val = 5
    chronic_text = ""
    meds_text = ""

    for q, a in answers.items():
        q_lower = q.lower()
        a_str = str(a).strip()
        if "start" in q_lower or "ဘယ်အချိန်" in q_lower or "စတင်" in q_lower:
            onset_text = a_str
        elif "1 to 10" in q_lower or "severity" in q_lower or "၁ မှ ၁၀" in q_lower or "ပြင်းထန်မှု" in q_lower:
            nums = re.findall(r'\d+', a_str)
            if nums:
                severity_val = int(nums[0])
        elif "long-term" in q_lower or "diabetes" in q_lower or "နာတာရှည်" in q_lower or "ဆက်ခံ" in q_lower:
            chronic_text = a_str
        elif "taking" in q_lower or "medicines" in q_lower or "ဆေးဝါး" in q_lower:
            meds_text = a_str

    normalized_symptoms = [s.lower() for s in translate_incoming_symptoms(symptoms)]
    has_fever = any("fever" in s or "ဖျား" in s or "ကိုယ်ပူ" in s for s in normalized_symptoms)
    has_cough = any("cough" in s or "ချောင်း" in s or "cold" in s for s in normalized_symptoms)
    has_throat = any("throat" in s or "လည်ချောင်း" in s for s in normalized_symptoms)
    has_stomach = any("abdom" in s or "stomach" in s or "diarrhea" in s or "vomit" in s or "ဗိုက်" in s or "ဝမ်း" in s or "အန်" in s for s in normalized_symptoms)
    has_headache = any("headache" in s or "ခေါင်း" in s for s in normalized_symptoms)
    has_chest = any("chest" in s or "breath" in s or "ရင်" in s or "မော" in s or "အသက်ရှူ" in s for s in normalized_symptoms)

    is_mm = (lang_code == "mm")
    top_disease = candidates[0]["name"] if candidates else ("ရာသီတုပ်ကွေး / ဖျားနာခြင်း" if is_mm else "Viral Fever")

    # 0. ChatGPT-Style Doctor Assessment Narrative (ဆရာဝန် သုံးသပ်ချက်)
    symptoms_str = "၊ ".join(symptoms) if symptoms else ("ဖျားနာခြင်း" if is_mm else "Fever")
    onset_phrase = onset_text if onset_text else ("မကြာသေးမီက" if is_mm else "recently")

    if is_mm:
        clinical_narrative = (
            f"လူနာသည် {onset_phrase} မှ စတင်၍ {symptoms_str} ဝေဒနာကို နာကျင်မှုပြင်းထန်မှုအဆင့် ({severity_val}/၁၀) ဖြင့် ခံစားနေရပါသည်။ "
            f"ဆေးဘက်ဆိုင်ရာ ခွဲခြမ်းစိတ်ဖြာချက်အရ အဓိကအားဖြင့် **{top_disease}** ဖြစ်နိုင်ခြေ အများဆုံး ရှိနေပါသည်။ "
            f"အောက်ပါ ဆေးဝါးများနှင့် နေထိုင်စားသောက်မှု အစီအစဉ်အတိုင်း လိုက်နာပြုစုပေးရန် အကြံပြုအပ်ပါသည်။"
        )
    else:
        clinical_narrative = (
            f"Patient has been experiencing {symptoms_str} since {onset_phrase} with a severity level of {severity_val}/10. "
            f"Clinical assessment suggests **{top_disease}** as the most likely primary condition. "
            f"Please follow the recommended medications, home care instructions, and precautions outlined below."
        )

    # 1. Action Plan (ဘာတွေ လုပ်သင့်တယ် / နေထိုင်စားသောက် ပြုစုနည်း)
    action_plan = []
    if is_mm:
        action_plan.append("လုံလောက်စွာ အနားယူပါ (ခန္ဓာကိုယ် ခုခံအား ပြန်လည်ကောင်းမွန်စေရန် အနည်းဆုံး ၇-၈ နာရီ အိပ်စက်အနားယူပါ)။")
        action_plan.append("ရေဓာတ်မခမ်းခြောက်စေရန် ရေနွေးနွေး သို့မဟုတ် အရည်များများ (တစ်နေ့လျှင် ၂ မှ ၃ လီတာအထိ) မကြာခဏ သောက်ပေးပါ။")
        if has_fever or has_headache:
            action_plan.append("ခန္ဓာကိုယ်အပူချိန် မြင့်တက်နေပါက ရေခဲရေမဟုတ်သော ရေကျက်အေး/ရေနွေးနွေးဖြင့် ရေပတ်တိုက်ပေးပါ။")
            action_plan.append("ခန္ဓာကိုယ်အပူချိန်နှင့် ဝေဒနာအခြေအနေကို ၄ နာရီတစ်ကြိမ် စစ်ဆေးမှတ်သားထားပါ။")
        if has_cough or has_throat:
            action_plan.append("ဆားရည်နွေးနွေး (ရေနွေး ၁ ဖန်ခွက်တွင် ဆားလက်ဖက်ရည်ဇွန်းတစ်ဝက်) ဖြင့် တစ်နေ့ ၃ ကြိမ် ပလုတ်ကျင်းပေးပါ။")
            action_plan.append("ရေနွေးငွေ့ ရှူရှိုက်ပေးခြင်းဖြင့် ချွဲသလိပ်များနှင့် အသက်ရှူလမ်းကြောင်းကို သက်သာစေပါသည်။")
        if has_stomach:
            action_plan.append("အစာမာများရှောင်၍ ဆန်ပြုတ်၊ စွပ်ပြုတ်ကဲ့သို့ အစာကြေလွယ်သော အစားအစာများကို အနည်းငယ်စီ မကြာခဏ စားပေးပါ။")
            action_plan.append("ဝမ်းသွား/အန်ပါက ဆုံးရှုံးသွားသော ရေနှင့်ဆားဓာတ်အတွက် ဓာတ်ဆားရည် (ORS) ကို တစ်ငုံချင်း မကြာခဏ သောက်ပါ။")
        if has_chest or red_flags:
            action_plan.append("အသက်ရှူရလွယ်ကူစေရန် ဦးခေါင်းကို အနည်းငယ်မြှင့်၍ သက်သောင့်သက်သာ ထိုင်နေပါ။ လေဝင်လေထွက်ကောင်းသောနေရာတွင် နေပါ။")
    else:
        action_plan.append("Get plenty of bed rest (7-8 hours) to allow your immune system to recover.")
        action_plan.append("Stay well hydrated by drinking 2-3 liters of warm water, clear broths, or herbal teas daily.")
        if has_fever or has_headache:
            action_plan.append("Apply a lukewarm wet compress to help reduce body temperature safely.")
            action_plan.append("Monitor body temperature and symptom progression every 4 hours.")
        if has_cough or has_throat:
            action_plan.append("Gargle with warm salt water (1/2 tsp salt in warm water) 3 times daily.")
        if has_stomach:
            action_plan.append("Stick to a bland congee diet and sip oral rehydration solutions (ORS).")

    # 2. Recommended Medications (သောက်သုံးနိုင်သော ဆေးဝါးများနှင့် သောက်သုံးပုံ)
    meds = []
    if is_mm:
        if has_fever or has_headache or severity_val >= 4 or not (has_cough or has_stomach):
            meds.append({
                "name": "ပါရာစီတမော (Paracetamol 500mg)",
                "dosage": "လိုအပ်ပါက ၄ နာရီမှ ၆ နာရီခြား တစ်ခါ ၁ ပြား သောက်နိုင်ပါသည်။",
                "purpose": "အဖျားကျစေရန်နှင့် ခေါင်းကိုက်၊ ကိုယ်လက်ကိုက်ခဲမှု သက်သာစေရန်",
                "precaution": "၂၄ နာရီအတွင်း ဆေးပမာဏ ၄၀၀၀ မီလီဂရမ် (၈ ပြား) ထက် ပိုမသောက်ရပါ။"
            })
        if has_cough or has_throat:
            meds.append({
                "name": "စီထရီဇင်း (Cetirizine 10mg) သို့မဟုတ် ချောင်းဆိုးပျောက်ဆေး",
                "dosage": "တစ်နေ့လျှင် ၁ ကြိမ် ညအိပ်ရာဝင် ၁ ပြား သောက်ပါ။",
                "purpose": "နှာစေး၊ နှာချေ၊ လည်ချောင်းယားယံခြင်းနှင့် ဓာတ်မတည့်မှု သက်သာစေရန်",
                "precaution": "အိပ်ငိုက်စေနိုင်သဖြင့် ကားမောင်းခြင်း သို့မဟုတ် စက်ယန္တရား ကိုင်တွယ်ခြင်း ရှောင်ပါ။"
            })
        if has_stomach:
            meds.append({
                "name": "ဓာတ်ဆားရည် (Oral Rehydration Salts - ORS)",
                "dosage": "ရေနွေးကျက်အေး ၂၅၀-၅၀၀ မီလီလီတာတွင် ဖျော်၍ ဝမ်းသွား/အန်တိုင်း တစ်ငုံချင်းသောက်ပါ။",
                "purpose": "ခန္ဓာကိုယ်အတွင်း ရေနှင့် သတ္တုဓာတ်များ ပြန်လည်ဖြည့်တင်းရန်",
                "precaution": "ဆီးချိုရောဂါရှိပါက သကြားဓာတ်ပါဝင်မှု သတိပြုပါ။"
            })
            meds.append({
                "name": "အစာအိမ်လေဆေး (Antacid သို့မဟုတ် Omeprazole 20mg)",
                "dosage": "မနက်စာမစားမီ နာရီဝက်အလို ၁ ပြား သောက်ပါ။",
                "purpose": "အစာအိမ်အက်ဆစ် လျော့ကျစေရန်နှင့် လေထိုးလေအောင့် သက်သာစေရန်",
                "precaution": "အခြားဆေးများနှင့် အနည်းဆုံး ၂ နာရီခြား သောက်ပါ။"
            })
    else:
        meds.append({
            "name": "Paracetamol (Acetaminophen 500mg)",
            "dosage": "1 tablet every 4 to 6 hours as needed (Max 4,000mg / 8 tabs in 24 hours).",
            "purpose": "Fever reduction and pain relief.",
            "precaution": "Do not combine with other medications containing paracetamol."
        })
        if has_cough or has_throat:
            meds.append({
                "name": "Cetirizine 10mg / Cough expectorant",
                "dosage": "1 tablet at bedtime.",
                "purpose": "Relief of runny nose, sneezing, and throat irritation.",
                "precaution": "May cause drowsiness."
            })
        if has_stomach:
            meds.append({
                "name": "Oral Rehydration Salts (ORS)",
                "dosage": "Dissolve in clean water and sip slowly after each loose stool.",
                "purpose": "Prevent dehydration and electrolyte imbalance.",
                "precaution": "Do not mix with milk or sugary juices."
            })

    # 3. Things to Avoid (ဘာတွေ ရှောင်သင့်တယ်)
    avoid_list = []
    if is_mm:
        avoid_list.append("ဆရာဝန်ညွှန်ကြားချက်မရှိဘဲ ပိုးသတ်ဆေးများ (Antibiotics) ကို မိမိသဘောဖြင့် ဝယ်ယူသောက်သုံးခြင်း လုံးဝရှောင်ကြဉ်ပါ (ဆေးယဉ်ပါးမှု ဖြစ်စေနိုင်သည်)။")
        avoid_list.append("ပါရာစီတမော ပါဝင်ပြီးဖြစ်သော အအေးမိပျောက်ဆေးများနှင့် ပါရာစီတမောဆေးပြားကို ထပ်မံတွဲမသောက်ပါနှင့် (အသည်းထိခိုက်နိုင်သည်)။")
        avoid_list.append("ရေခဲရေ၊ အလွန်အေးသော အဖျော်ယမကာများ၊ အစပ်လွန်ကဲသော အစားအစာများ၊ အရက်၊ ဘီယာနှင့် ဆေးလိပ်တို့ကို လုံးဝရှောင်ကြဉ်ပါ။")
        avoid_list.append("ပြင်းထန်သော ကိုယ်လက်လေ့ကျင့်ခန်းများနှင့် အလေးအပင်မခြင်းများကို ခေတ္တရှောင်ကြဉ်ပါ။")
        if chronic_text:
            avoid_list.append(f"သင့်တွင် နာတာရှည်ရောဂါရာဇဝင် ({chronic_text}) ရှိသဖြင့် ပုံမှန်သောက်နေသော ဆေးများကို ဆရာဝန်ခွင့်ပြုချက်မရှိဘဲ မရပ်တန့်ပါနှင့်။")
    else:
        avoid_list.append("Do not self-prescribe antibiotics without a physician's prescription (prevents antibiotic resistance).")
        avoid_list.append("Avoid taking multiple combination cold medicines that already contain paracetamol/acetaminophen.")
        avoid_list.append("Avoid alcohol, icy cold drinks, smoking, and heavy/spicy greasy foods.")
        avoid_list.append("Avoid strenuous physical exertion and heavy lifting while ill.")

    # 4. Emergency Warnings (အရေးပေါ် ဆေးရုံ/ဆေးခန်း ပြသရမည့် လက္ခဏာများ)
    emergency_warnings = []
    if is_mm:
        emergency_warnings.append("အဖျား ၃၉ ဒီဂရီစင်တီဂရိတ် (၁၀၂ ဒီဂရီဖာရင်ဟိုက်) ထက်ကျော်လွန်ပြီး ၃ ရက်ကျော် ကြာမြင့်ခြင်း။")
        emergency_warnings.append("ရုတ်တရက် အသက်ရှူရခက်ခဲလာခြင်း၊ ရင်ဘတ်အောင့်ခြင်း သို့မဟုတ် နှုတ်ခမ်းပြာနှမ်းလာခြင်း။")
        emergency_warnings.append("သတိလစ်မူးမေ့ခြင်း၊ စိတ်ရှုပ်ထွေးခြင်း သို့မဟုတ် တက်ခြင်း။")
        emergency_warnings.append("အစာနှင့် ရေ လုံးဝမဝင်အောင် အဆက်မပြတ် အန်ခြင်း၊ သွေးအန်ခြင်း သို့မဟုတ် မည်းနက်သော ဝမ်းသွားခြင်း။")
    else:
        emergency_warnings.append("High fever over 39°C (102°F) persisting for more than 3 days.")
        emergency_warnings.append("Sudden shortness of breath, severe chest pain, or bluish lips/fingertips.")
        emergency_warnings.append("Fainting, confusion, altered mental state, or seizures.")
        emergency_warnings.append("Inability to keep liquids down, persistent vomiting, or vomiting blood.")

    return {
        "clinical_narrative": clinical_narrative,
        "action_plan": action_plan,
        "recommended_medications": meds,
        "things_to_avoid": avoid_list,
        "emergency_warnings": emergency_warnings,
    }

def build_health_summary(summary: Dict[str, Any], patient_name: Optional[str]) -> str:
    lines = [
        "Health Summary",
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

MYANMAR_COLLOQUIAL_SYMPTOMS = {
    "နောက်ကျောအောင့်": ["back pain", "ခါးနာခြင်း", "နောက်ကျောနာကျင်ခြင်း"],
    "နောက်ကျောနာ": ["back pain", "ခါးနာခြင်း", "နောက်ကျောနာကျင်ခြင်း"],
    "ခါးနာ": ["back pain", "ခါးနာခြင်း", "ကျောအောင့်ခြင်း"],
    "ခါးကိုက်": ["back pain", "ခါးနာခြင်း"],
    "ခါးအောင့်": ["back pain", "ခါးနာခြင်း"],
    "ကျောအောင့်": ["back pain", "နောက်ကျောနာခြင်း"],
    "ကျောနာ": ["back pain", "နောက်ကျောနာခြင်း"],
    "ကိုယ်လက်ကိုက်": ["muscle aches", "ကြွက်သားများ နာကျင်ကိုက်ခဲခြင်း", "အဆစ်အမြစ်ကိုက်ခဲခြင်း", "fatigue"],
    "ကိုယ်လက်နာ": ["muscle aches", "ကြွက်သားများ နာကျင်ကိုက်ခဲခြင်း"],
    "တစ်ကိုယ်လုံးကိုက်": ["muscle aches", "ကြွက်သားများ နာကျင်ကိုက်ခဲခြင်း"],
    "ကြွက်သားနာ": ["muscle aches", "ကြွက်သားများ နာကျင်ကိုက်ခဲခြင်း"],
    "ကြွက်သားကိုက်": ["muscle aches", "ကြွက်သားများ နာကျင်ကိုက်ခဲခြင်း"],
    "အကြောတက်": ["muscle aches", "ကြွက်သားများ နာကျင်ကိုက်ခဲခြင်း"],
    "ဖျား": ["fever", "ဖျားနာခြင်း"],
    "ကိုယ်ပူ": ["fever", "ဖျားနာခြင်း"],
    "အဖျားကြီး": ["high fever", "ဖျားနာခြင်း"],
    "ချမ်းတုန်": ["chills", "ချမ်းတုန်ဖျားခြင်း"],
    "ခေါင်းကိုက်": ["headache", "ခေါင်းကိုက်ခြင်း"],
    "ခေါင်းခဲ": ["headache", "ခေါင်းကိုက်ခြင်း"],
    "ခေါင်းအုံ": ["headache", "ခေါင်းကိုက်ခြင်း"],
    "ဇက်ကိုက်": ["headache", "ဇက်ဆစ်ရိုးနာခြင်း"],
    "ချောင်းဆိုး": ["cough", "ချောင်းဆိုးခြင်း"],
    "သလိပ်ထွက်": ["cough", "ချောင်းဆိုးခြင်း"],
    "နှာစေး": ["runny nose", "နှာစေးခြင်း"],
    "နှာပိတ်": ["nasal congestion", "နှာပိတ်ခြင်း"],
    "နှာချေ": ["sneezing", "နှာချေခြင်း"],
    "လည်ချောင်းနာ": ["sore throat", "လည်ချောင်းနာခြင်း"],
    "ရင်ကြပ်": ["shortness of breath", "အသက်ရှူကြပ်ခြင်း"],
    "မော": ["shortness of breath", "အသက်ရှူရခက်ခဲခြင်း"],
    "ဗိုက်အောင့်": ["abdominal pain", "ဗိုက်အောင့်ခြင်း / ဗိုက်နာခြင်း"],
    "ဗိုက်နာ": ["abdominal pain", "ဗိုက်အောင့်ခြင်း / ဗိုက်နာခြင်း"],
    "ဝမ်းဗိုက်နာ": ["abdominal pain", "ဗိုက်အောင့်ခြင်း"],
    "ရင်ပူ": ["heartburn", "ရင်ပူခြင်း"],
    "အစာမကြေ": ["indigestion", "အစာမကြေခြင်း"],
    "လေပွ": ["bloating", "လေပွခြင်း"],
    "လေထိုး": ["bloating", "လေထိုးခြင်း"],
    "ဝမ်းလျှော": ["diarrhea", "ဝမ်းသွားခြင်း"],
    "ဝမ်းသွား": ["diarrhea", "ဝမ်းသွားခြင်း"],
    "ဝမ်းချုပ်": ["constipation", "ဝမ်းချုပ်ခြင်း"],
    "ပျို့": ["nausea", "ပျို့အန်ချင်ခြင်း"],
    "အန်": ["vomiting", "အန်ခြင်း"],
    "ခေါင်းမူး": ["dizziness", "ခေါင်းမူးခြင်း"],
    "မူးဝေ": ["dizziness", "ခေါင်းမူးခြင်း"],
    "ချာချာလည်": ["vertigo", "ခေါင်းမူး ချာချာလည်ခြင်း"],
    "မောပန်း": ["fatigue", "မောပန်းနွမ်းနယ်ခြင်း"],
    "နုံး": ["fatigue", "မောပန်းနွမ်းနယ်ခြင်း"],
    "အားမရှိ": ["weakness", "ကြွက်သားများ အားနည်းခြင်း"],
    "အဆစ်အမြစ်ကိုက်": ["joint pain", "အဆစ်အမြစ်ကိုက်ခဲခြင်း"],
    "ဒူးနာ": ["joint pain", "အဆစ်အမြစ်ကိုက်ခဲခြင်း"],
}

MYANMAR_VERB_ENDINGS = [
    "ဖြစ်နေပါသည်", "ဖြစ်နေပါတယ်", "ဖြစ်နေတယ်", "ဖြစ်နေတာ", "ဖြစ်ပါတယ်", "ဖြစ်တယ်", "ဖြစ်တာ",
    "နေပါသည်", "နေပါတယ်", "နေတယ်", "နေတာ", "နေလို့", "လိုက်တာ", "လိုက်တယ်",
    "ပါသည်", "ပါတယ်", "တယ်", "တာ", "ခြင်း", "လို့", "ပြီး", "နေ"
]

def strip_myanmar_verb_endings(text):
    if not text or not isinstance(text, str):
        return ""
    cleaned = text.strip()
    for ending in MYANMAR_VERB_ENDINGS:
        if cleaned.endswith(ending) and len(cleaned) > len(ending) + 1:
            cleaned = cleaned[:-len(ending)].strip()
            break
    return cleaned

def translate_incoming_symptoms(symptoms):
    expanded = []
    for s in symptoms or []:
        s_clean = s.lower().strip()
        expanded.append(s_clean)
        
        # Stem root word
        stemmed = strip_myanmar_verb_endings(s_clean)
        if stemmed:
            expanded.append(stemmed)
            
        for mm_key, en_aliases in MYANMAR_COLLOQUIAL_SYMPTOMS.items():
            if mm_key in s_clean or (stemmed and mm_key in stemmed) or (stemmed and stemmed in mm_key):
                expanded.extend(en_aliases)
    return list(set(expanded))

def get_diseases_mm():
    return load_json("diseases_mm.json")

def get_diseases_en():
    return load_json("diseases.json")

@app.post("/diagnose", response_model=DiseaseResponse)
async def diagnose(input_data: SymptomInput, accept_language: str = Header("en")):
    lang_code = accept_language.split(',')[0].split('-')[0].lower()
    
    # Dynamically load fresh datasets
    d_mm = get_diseases_mm()
    d_en = get_diseases_en()
    dataset = d_mm if lang_code == "mm" else d_en
    
    # Translate / Expand incoming symptoms
    raw_symptoms = input_data.symptoms
    translated_symptoms = translate_incoming_symptoms(raw_symptoms)
    user_symptoms = [s.lower().strip() for s in translated_symptoms]
    
    best_match = None
    max_score = 0
    
    # Search prioritized by requested language dataset first
    search_dataset = (d_mm + d_en) if lang_code == "mm" else (d_en + d_mm)
    search_terms = list(set(user_symptoms + raw_symptoms))
    
    for disease in search_dataset:
        disease_name = disease.get("name", "").lower()
        disease_desc = disease.get("description", "").lower()
        disease_symptoms = [s.lower() for s in disease.get("symptoms", [])]
        
        score = 0
        
        for term in search_terms:
            term_clean = term.lower().strip()
            if not term_clean or len(term_clean) < 2:
                continue
            
            # 1. Direct Name Match
            if term_clean == disease_name:
                score += 50
            elif term_clean in disease_name:
                score += 35
            elif disease_name in term_clean:
                score += 25
            
            # 2. Description Match
            if term_clean in disease_desc:
                score += 20
                
            # 3. Symptom Matching
            for ds in disease_symptoms:
                ds_clean = ds.lower().replace('ခြင်း', '').replace('တယ်', '').replace('နေတယ်', '').replace('တာ', '').strip()
                t_clean = term_clean.replace('ခြင်း', '').replace('တယ်', '').replace('နေတယ်', '').replace('တာ', '').strip()
                
                if t_clean and ds_clean:
                    if t_clean == ds_clean:
                        score += 30
                    elif t_clean in ds_clean or ds_clean in t_clean:
                        score += 18
                    elif len(t_clean) >= 3 and len(ds_clean) >= 3:
                        if fuzz.ratio(t_clean, ds_clean) > 70:
                            score += 12
        
        if score > max_score:
            max_score = score
            best_match = disease
            
    if not best_match or max_score < 8:
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

    # Ensure result is in the user's preferred language
    final_result = best_match
    if lang_code == "mm" and best_match not in d_mm:
        equiv, equiv_score = _find_equivalent_in_dataset(best_match, d_mm, min_score=0.20)
        if equiv is not None:
            final_result = equiv
    elif lang_code != "mm" and best_match not in d_en:
        equiv, equiv_score = _find_equivalent_in_dataset(best_match, d_en, min_score=0.20)
        if equiv is not None:
            final_result = equiv

    prevention_list = final_result.get("prevention") or final_result.get("precautions") or []
    if isinstance(prevention_list, str):
        prevention_list = [prevention_list]

    meds_list = final_result.get("medications") or []
    if isinstance(meds_list, str):
        meds_list = [meds_list]

    return {
        "disease": str(final_result.get("name", "Unknown Condition")),
        "description": str(final_result.get("description", "")),
        "prevention": prevention_list,
        "recommendation": str(final_result.get("recommendation", "")),
        "medications": meds_list
    }

@app.get("/medicines")
async def get_all_medicines(accept_language: str = Header("en")):
    lang_code = accept_language.split(',')[0].split('-')[0].lower()
    return MEDICINES_MM if lang_code == "mm" else MEDICINES_EN

@app.get("/medicine/{name}")
async def get_medicine_info(name: str, accept_language: str = Header("en")):
    lang_code = accept_language.split(',')[0].split('-')[0].lower()
    name_query = name.lower().strip()
    
    is_myanmar_query = any('\u1000' <= c <= '\u109F' for c in name_query)
    
    if lang_code == "mm" or is_myanmar_query:
        primary_dataset = MEDICINES_MM
        secondary_dataset = MEDICINES_EN
    else:
        primary_dataset = MEDICINES_EN
        secondary_dataset = MEDICINES_MM
        
    all_meds = primary_dataset + secondary_dataset
    
    # 1. Try exact match or partial match in primary dataset first
    for med in primary_dataset:
        med_name = med["name"].lower()
        if name_query == med_name or name_query in med_name or med_name in name_query:
            return med
            
    # 2. Try match in secondary dataset if not in primary
    for med in secondary_dataset:
        med_name = med["name"].lower()
        if name_query == med_name or name_query in med_name or med_name in name_query:
            return med
            
    # 3. Use Fuzzy Matching if no direct match found
    best_match = None
    highest_score = 0
    
    for med in all_meds:
        med_name = med["name"].lower()
        clean_name = re.sub(r'\(.*?\)', '', med_name).strip()
        
        score = max(fuzz.partial_ratio(name_query, med_name), 
                    fuzz.partial_ratio(name_query, clean_name))
        
        if med in primary_dataset:
            score += 5
            
        if score > highest_score:
            highest_score = score
            best_match = med
            
    if best_match and highest_score > 75:
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

    answered_questions = {k: v for k, v in payload.answers.items() if v and v.strip()}
    
    # If no symptoms were explicitly selected, extract any symptoms mentioned in follow-up answers
    if not symptoms and answered_questions:
        extracted = []
        for ans in answered_questions.values():
            if ans and isinstance(ans, str):
                extracted.extend(translate_incoming_symptoms([ans]))
        symptoms = list(dict.fromkeys([e for e in extracted if e]))

    normalized = [s.lower().strip() for s in translate_incoming_symptoms(symptoms)]
    red_flags_en = sorted({s for s in normalized if s in RED_FLAG_SYMPTOMS})
    candidates = match_disease_candidates(symptoms, limit=5, lang_code=lang_code)

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

    plan_data = generate_clinical_action_plan(
        symptoms=symptoms,
        answers=answered_questions,
        user_profile=payload.user_profile or {},
        candidates=candidates,
        red_flags=red_flags,
        triage=triage,
        lang_code=lang_code,
    )

    return {
        "triage": triage,
        "risk_score": risk_score,
        "red_flags": red_flags,
        "candidate_conditions": candidates,
        "next_questions": next_questions,
        "recommendation": recommendation,
        "clinical_narrative": plan_data.get("clinical_narrative", ""),
        "action_plan": plan_data.get("action_plan", []),
        "recommended_medications": plan_data.get("recommended_medications", []),
        "things_to_avoid": plan_data.get("things_to_avoid", []),
        "emergency_warnings": plan_data.get("emergency_warnings", []),
        "clinical_summary": {
            "symptoms": symptoms,
            "answers": answered_questions,
            "profile": payload.user_profile,
        },
        "disclaimer": CLINICAL_DISCLAIMER.get(lang_code, CLINICAL_DISCLAIMER.get("en", "")),
    }

@app.post("/predictive-analytics")
async def predictive_analytics(payload: PredictiveAnalyticsRequest, accept_language: str = Header("en")):
    lang_code = accept_language.split(',')[0].split('-')[0].lower()
    is_mm = (lang_code == "mm")

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
            risk_factors.append("နောက်ဆုံးတိုင်းထားသော သွေးပေါင်ချိန်သည် ပုံမှန်ထက် မြင့်မားနေပါသည်။" if is_mm else "Latest blood pressure is in a high range.")
            forecast_parts.append("သွေးပေါင်ချိန်ကို အနီးကပ် စောင့်ကြည့်ပြီး မူးဝေခြင်း သို့မဟုတ် ခေါင်းကိုက်ခြင်း လက္ခဏာများ ရှိပါက ဆရာဝန်နှင့် ပြသပါ။" if is_mm else "Monitor blood pressure closely and consider a doctor check-up if symptoms occur.")
        elif latest_sys >= 130 or latest_dia >= 85:
            risk_score += 18
            risk_factors.append("နောက်ဆုံးတိုင်းထားသော သွေးပေါင်ချိန်သည် အနည်းငယ် မြင့်တက်နေပါသည်။" if is_mm else "Latest blood pressure is elevated.")
            forecast_parts.append("သွေးပေါင်ချိန် မှတ်တမ်းများကို ပုံမှန်ဆက်လက် တိုင်းတာပြီး အငန်နှင့် ဆား လျှော့စားပါ။" if is_mm else "Continue logging blood pressure and reduce salt intake.")
        else:
            forecast_parts.append("သွေးပေါင်ချိန်သည် ကျန်းမာသော ပုံမှန်အဆင့်တွင် ရှိနေပါသည် - ဒီအတိုင်း ဆက်လက်ထိန်းသိမ်းပါ။" if is_mm else "Blood pressure is currently in a healthy range - keep up the good habits!")
    else:
        forecast_parts.append("တိကျသော ခန့်မှန်းချက် ရရှိရန် သွေးပေါင်ချိန် မှတ်တမ်းများကို နေ့စဉ် မှတ်သားပေးပါ။" if is_mm else "Log blood pressure readings to get personalized predictions.")

    bmi = payload.bmi
    if bmi and bmi >= 30:
        risk_score += 22
        risk_factors.append("BMI ကိုယ်အလေးချိန်သည် အဝလွန်သည့် အဆင့်တွင် ရှိနေပါသည်။" if is_mm else "BMI is in an obesity range.")
        forecast_parts.append("အာဟာရမျှတသော အစားအစာများကို ဦးစားပေးစားပြီး နေ့စဉ် လမ်းလျှောက်ခြင်းကဲ့သို့ ပေါ့ပါးသော လေ့ကျင့်ခန်းများ ပြုလုပ်ပါ။" if is_mm else "Focus on balanced nutrition and light daily activity.")
    elif bmi and bmi >= 25:
        risk_score += 12
        risk_factors.append("BMI ကိုယ်အလေးချိန်သည် ပုံမှန်ထက် အနည်းငယ် များနေပါသည်။" if is_mm else "BMI is above the normal range.")
        forecast_parts.append("အစားအသောက် အနည်းငယ် ထိန်းညှိခြင်းနှင့် လှုပ်ရှားမှု ပြုလုပ်ခြင်းဖြင့် ကျန်းမာသော ကိုယ်အလေးချိန်သို့ ရောက်ရှိနိုင်ပါသည်။" if is_mm else "Small daily changes can help move toward a healthier BMI.")
    elif bmi:
        forecast_parts.append("BMI ကိုယ်အလေးချိန်သည် သင့်တင့်မျှတသော ကျန်းမာသည့် အဆင့်တွင် ရှိနေပါသည်။" if is_mm else "BMI is in a healthy range - maintain your current routine!")
    else:
        forecast_parts.append("BMI တွက်ချက်နိုင်ရန် အရပ်နှင့် ကိုယ်အလေးချိန်ကို ထည့်သွင်းပေးပါ။" if is_mm else "Save your height and weight to calculate BMI.")

    water_intake = payload.water or 0
    if water_intake < 5:
        risk_score += 10
        risk_factors.append("နေ့စဉ် ရေသောက်သုံးမှု ပမာဏသည် သတ်မှတ်ပန်းတိုင်ထက် နည်းပါးနေပါသည်။" if is_mm else "Water intake is below the daily target.")
        forecast_parts.append("တစ်နေ့လျှင် ရေ ၆ မှ ၈ ဖန်ခွက် (သို့မဟုတ် ၂ လီတာခန့်) ပြည့်အောင် မကြာခဏ သောက်ပေးပါ။" if is_mm else "Aim for 6-8 glasses of water today - sip regularly!")
    elif water_intake >= 8:
        forecast_parts.append("ရေသောက်သုံးမှု ပန်းတိုင်ပြည့်မီအောင် သောက်နိုင်သဖြင့် အလွန်ကောင်းမွန်ပါသည်။" if is_mm else "Great job hitting your water intake goal!")
    else:
        forecast_parts.append("ရေသောက်သုံးမှု ပန်းတိုင်ပြည့်ရန် နီးကပ်နေပါပြီ - နောက်ထပ် အနည်းငယ် ပိုသောက်ပေးပါ။" if is_mm else "You're close to your water goal - just a few more glasses!")

    sys_values = [log.systolic for log in bp_logs if log.systolic]
    if len(sys_values) >= 3:
        trend = sys_values[0] - sys_values[-1]
        if trend > 5:
            risk_score += 12
            risk_factors.append("သွေးပေါင်ချိန် တဖြည်းဖြည်း မြင့်တက်လာသည့် အလားအလာ တွေ့ရှိရပါသည်။" if is_mm else "Blood pressure trend is increasing.")
            forecast_parts.append("သွေးပေါင်ချိန် တဖြည်းဖြည်း မြင့်တက်လာနေသဖြင့် အနီးကပ် ဆက်လက်စောင့်ကြည့်ပေးပါ။" if is_mm else "Your blood pressure has been rising - monitor it closely.")
            bp_trend = "rising"
        elif trend < -5:
            forecast_parts.append("သွေးပေါင်ချိန် အခြေအနေသည် တဖြည်းဖြည်း တိုးတက်ကောင်းမွန်လာနေပါသည်။" if is_mm else "Great news - your blood pressure trend is improving!")
            bp_trend = "improving"
        else:
            forecast_parts.append("သွေးပေါင်ချိန်သည် တည်ငြိမ်ကောင်းမွန်စွာ ရှိနေပါသည်။" if is_mm else "Your blood pressure has been stable.")
            bp_trend = "stable"
    else:
        bp_trend = "not_enough_data"

    risk_score = min(100, risk_score)
    if risk_score >= 70:
        level = "high"
    elif risk_score >= 45:
        level = "moderate"
    else:
        level = "stable"

    default_fallback_forecast = "ကျန်းမာရေး ခန့်မှန်းချက် ပိုမိုတိကျစေရန် သွေးပေါင်ချိန်၊ BMI၊ ရေသောက်သုံးမှုနှင့် စိတ်ခံစားမှု မှတ်တမ်းများကို နေ့စဉ် ဆက်လက် မှတ်သားပေးပါ။" if is_mm else "Keep logging blood pressure, BMI, water, and mood daily to improve prediction quality."
    forecast = " ".join(forecast_parts) if forecast_parts else default_fallback_forecast
    default_risk_factor = ["ပေးထားသော အချက်အလက်များအရ ကြီးမားသော ကျန်းမာရေး အန္တရာယ် မတွေ့ရှိပါ။"] if is_mm else ["No major risk trend detected from supplied data."]

    return {
        "risk_score": risk_score,
        "risk_level": level,
        "bp_trend": bp_trend,
        "risk_factors": risk_factors or default_risk_factor,
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
async def transcribe_voice(file: UploadFile = File(...), accept_language: str = Header("en")):
    lang_code = accept_language.split(',')[0].split('-')[0].lower()
    try:
        audio_content = await file.read()

        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1] or ".wav") as temp_file:
            temp_file.write(audio_content)
            temp_file_path = temp_file.name

        try:
            model = get_whisper_model()
            transcript = ""
            
            # Primary pass based on requested language
            primary_lang = "my" if lang_code == "mm" else "en"
            secondary_lang = "en" if lang_code == "mm" else "my"

            try:
                segments, info = model.transcribe(
                    temp_file_path,
                    beam_size=1,
                    language=primary_lang,
                    task="transcribe",
                    vad_filter=False,
                )
                for segment in segments:
                    transcript += segment.text
            except Exception as primary_err:
                print(f"Primary transcription attempt ({primary_lang}) failed: {primary_err}")

            if len(transcript.strip()) < 2:
                try:
                    segments, info = model.transcribe(
                        temp_file_path,
                        beam_size=1,
                        language=secondary_lang,
                        task="transcribe",
                        vad_filter=False,
                    )
                    transcript = ""
                    for segment in segments:
                        transcript += segment.text
                except Exception as secondary_err:
                    print(f"Secondary transcription attempt ({secondary_lang}) failed: {secondary_err}")

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