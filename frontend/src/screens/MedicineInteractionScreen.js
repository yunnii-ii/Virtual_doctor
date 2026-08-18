import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Keyboard, 
  TouchableWithoutFeedback 
} from 'react-native';
import { 
  Text, 
  Card, 
  Button, 
  Searchbar, 
  Divider, 
  Chip, 
  ActivityIndicator 
} from 'react-native-paper';
import { 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Pill, 
  ArrowUpDown, 
  Volume2, 
  VolumeX, 
  X, 
  Info, 
  Sparkles, 
  RotateCcw,
  Search,
  Filter,
  Check
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { getAllMedicines, saveHistoryToDB } from '../api';
import { useAuth } from '../utils/AuthContext';
import { saveToHistory } from '../utils/storage';
import { speak, stop as stopTts } from '../utils/tts';

// Quick Filter Categories for interactive dropdown
const MEDICINE_CATEGORIES = [
  { id: 'all', labelMM: 'အားလုံး', labelEN: 'All' },
  { id: 'pain', labelMM: 'အကိုက်အခဲ', labelEN: 'Pain' },
  { id: 'antibiotic', labelMM: 'ပိုးသတ်ဆေး', labelEN: 'Antibiotics' },
  { id: 'heart', labelMM: 'နှလုံး/သွေးတိုး', labelEN: 'Heart / BP' },
  { id: 'stomach', labelMM: 'အစာအိမ်', labelEN: 'Stomach' },
  { id: 'diabetes', labelMM: 'ဆီးချို', labelEN: 'Diabetes' },
  { id: 'allergy', labelMM: 'အအေးမိ/ဓာတ်မတည့်', labelEN: 'Cold / Allergy' },
];

// Comprehensive default fallback medicine list (English + Myanmar)
const DEFAULT_MEDICINES = [
  { name: 'Aspirin (အက်စပရင်)', generic: 'aspirin', category: 'pain', keywords: ['aspirin', 'အက်စပရင်', 'acetylsalicylic acid', 'cardiprin', 'asa'] },
  { name: 'Warfarin (ဝါဖရင်)', generic: 'warfarin', category: 'heart', keywords: ['warfarin', 'ဝါဖရင်', 'coumadin', 'marevan'] },
  { name: 'Paracetamol (ပါရာစီတမော)', generic: 'paracetamol', category: 'pain', keywords: ['paracetamol', 'ပါရာစီတမော', 'acetaminophen', 'panadol', 'biogesic', 'tylenol', 'paramol'] },
  { name: 'Alcohol (အရက် / ဘီယာ)', generic: 'alcohol', category: 'all', keywords: ['alcohol', 'အရက်', 'ဘီယာ', 'ethanol', 'liquor', 'beer', 'wine'] },
  { name: 'Ibuprofen (အိုင်ဗျူပရိုဖန်)', generic: 'ibuprofen', category: 'pain', keywords: ['ibuprofen', 'အိုင်ဗျူပရိုဖန်', 'brufen', 'advil', 'motrin', 'nsaid'] },
  { name: 'Amoxicillin (အမောက်ဆိုဆလင်)', generic: 'amoxicillin', category: 'antibiotic', keywords: ['amoxicillin', 'အမောက်ဆိုဆလင်', 'amoxil', 'augmentin', 'antibiotic', 'clamoxyl'] },
  { name: 'Methotrexate (မက်သိုထရက်ဆိတ်)', generic: 'methotrexate', category: 'all', keywords: ['methotrexate', 'မက်သိုထရက်ဆိတ်', 'mtx', 'trexall'] },
  { name: 'Antacid (အစာအိမ်လေဆေး)', generic: 'antacid', category: 'stomach', keywords: ['antacid', 'အစာအိမ်လေဆေး', 'gaviscon', 'maalox', 'aluminum hydroxide', 'magnesium hydroxide', 'eno'] },
  { name: 'Iron Supplement (သံဓာတ်အားဆေး)', generic: 'iron', category: 'all', keywords: ['iron', 'သံဓာတ်', 'ferrous sulfate', 'ferrous', 'iron supplement', 'sangobion', 'iberet'] },
  { name: 'Atorvastatin / Statin (စတက်တင်)', generic: 'statin', category: 'heart', keywords: ['statin', 'atorvastatin', 'simvastatin', 'rosuvastatin', 'lipitor', 'စတက်တင်', 'အာတိုဗာစတက်တင်'] },
  { name: 'Grapefruit (ဂရိတ်ဖရုသီး)', generic: 'grapefruit', category: 'all', keywords: ['grapefruit', 'ဂရိတ်ဖရုသီး', 'grapefruit juice'] },
  { name: 'Cetirizine (စီထရီဇင်း)', generic: 'cetirizine', category: 'allergy', keywords: ['cetirizine', 'စီထရီဇင်း', 'zyrtec', 'cetrine', 'antihistamine', 'allergy'] },
  { name: 'Omeprazole (အိုမီပရာဇော)', generic: 'omeprazole', category: 'stomach', keywords: ['omeprazole', 'အိုမီပရာဇော', 'losec', 'prilosec', 'omez', 'ppi'] },
  { name: 'Clopidogrel (ကလိုပီဒိုဂရယ်)', generic: 'clopidogrel', category: 'heart', keywords: ['clopidogrel', 'ကလိုပီဒိုဂရယ်', 'plavix', 'antiplatelet'] },
  { name: 'Metformin (မက်ဖော်မင်)', generic: 'metformin', category: 'diabetes', keywords: ['metformin', 'မက်ဖော်မင်', 'glucophage', 'diabex', 'diabetes'] },
  { name: 'Ciprofloxacin (စီပရိုဖလော့ဆာစင်)', generic: 'ciprofloxacin', category: 'antibiotic', keywords: ['ciprofloxacin', 'စီပရိုဖလော့ဆာစင်', 'cipro', 'cifran', 'quinolone'] },
  { name: 'Diazepam / Sedative (စိတ်ငြိမ်ဆေး)', generic: 'sedative', category: 'pain', keywords: ['sedative', 'diazepam', 'valium', 'lorazepam', 'alprazolam', 'sleeping pills', 'စိတ်ငြိမ်ဆေး', 'အိပ်ဆေး'] },
  { name: 'Tramadol (ထရာမာဒေါ)', generic: 'tramadol', category: 'pain', keywords: ['tramadol', 'ထရာမာဒေါ', 'ultram', 'tramal', 'painkiller'] },
  { name: 'Fluoxetine / SSRI (စိတ်ကျရောဂါကုဆေး)', generic: 'ssri', category: 'all', keywords: ['ssri', 'fluoxetine', 'prozac', 'sertraline', 'zoloft', 'escitalopram', 'antidepressant', 'စိတ်ကျဆေး'] },
  { name: 'Lisinopril / ACE Inhibitor (သွေးတိုးကျဆေး)', generic: 'ace_inhibitor', category: 'heart', keywords: ['lisinopril', 'enalapril', 'ramipril', 'captopril', 'ace inhibitor', 'သွေးတိုးကျဆေး', 'လီဆီနိုပရီလ်'] },
  { name: 'Spironolactone / Potassium (ပိုတက်စီယမ်)', generic: 'potassium', category: 'heart', keywords: ['potassium', 'spironolactone', 'aldactone', 'ပိုတက်စီယမ်', 'စပိုင်ရိုနိုလက်တုန်း'] },
  { name: 'Sildenafil / Viagra (ဗိုင်ယာဂရာ)', generic: 'sildenafil', category: 'heart', keywords: ['sildenafil', 'viagra', 'revatio', 'ဗိုင်ယာဂရာ'] },
  { name: 'Nitroglycerin / Nitrates (နှလုံးသွေးကြောကျယ်ဆေး)', generic: 'nitrates', category: 'heart', keywords: ['nitroglycerin', 'nitrate', 'isosorbide', 'isordil', 'angina', 'နှလုံးဆေး'] },
  { name: 'Calcium Supplement (ကယ်လ်စီယမ်)', generic: 'calcium', category: 'all', keywords: ['calcium', 'ကယ်လ်စီယမ်', 'calcium carbonate', 'caltrate'] },
  { name: 'Levothyroxine (သိုင်းရွိုက်ဆေး)', generic: 'levothyroxine', category: 'all', keywords: ['levothyroxine', 'eltroxin', 'synthroid', 'thyroxine', 'သိုင်းရွိုက်ဆေး'] },
  { name: 'Digoxin (ဒစ်ဂျောက်ဆင်)', generic: 'digoxin', category: 'heart', keywords: ['digoxin', 'lanoxin', 'ဒစ်ဂျောက်ဆင်'] },
  { name: 'Amlodipine (အမ်လိုဒီပင်း)', generic: 'amlodipine', category: 'heart', keywords: ['amlodipine', 'norvasc', 'amlong', 'အမ်လိုဒီပင်း'] },
  { name: 'Losartan (လိုဆာတန်)', generic: 'losartan', category: 'heart', keywords: ['losartan', 'cozaar', 'losacar', 'လိုဆာတန်'] },
  { name: 'Salbutamol / Inhaler (ရင်ကြပ်ပျောက်ဆေး)', generic: 'salbutamol', category: 'allergy', keywords: ['salbutamol', 'ventolin', 'albuterol', 'ရင်ကြပ်ဆေး', 'ရှူဆေး'] },
  { name: 'Domperidone (ဒွန်ပယ်ရီဒုန်း)', generic: 'domperidone', category: 'stomach', keywords: ['domperidone', 'motilium', 'ဒွန်ပယ်ရီဒုန်း', 'အန်ဆေး'] },
  { name: 'Decolgen (ဒီကိုဂျင်)', generic: 'decolgen', category: 'allergy', keywords: ['decolgen', 'ဒီကိုဂျင်', 'cold', 'flu', 'အအေးမိဆေး'] },
];

// Rich clinical interaction dataset with bilingual explanations
const INTERACTIONS_DATABASE = [
  {
    keys1: ['aspirin', 'အက်စပရင်', 'cardiprin', 'asa'],
    keys2: ['warfarin', 'ဝါဖရင်', 'coumadin', 'marevan'],
    severity: 'high',
    note_en: 'Major risk of severe internal bleeding and hemorrhage. Both drugs thin the blood through different mechanisms.',
    note_mm: 'သွေးထွက်လွန်နိုင်ခြေ အလွန်မြင့်မားပါသည်။ ဆေးနှစ်မျိုးစလုံးသည် သွေးကျဲစေသော ဆေးများဖြစ်သဖြင့် အစာအိမ်နှင့် ခန္ဓာကိုယ်အတွင်း သွေးယိုစိမ့်မှု အန္တရာယ် ကြီးမားပါသည်။',
    advice_en: 'Avoid combining unless specifically prescribed and strictly monitored by a cardiologist/hematologist.',
    advice_mm: 'ဆရာဝန် အထူးညွှန်ကြားချက်မရှိဘဲ တွဲမသောက်ပါနှင့်။ သွေးထွက်လွယ်ခြင်း သို့မဟုတ် အမည်းကွက်များဖြစ်ပေါ်ပါက ချက်ချင်းပြသပါ။'
  },
  {
    keys1: ['alcohol', 'အရက်', 'ဘီယာ', 'ethanol'],
    keys2: ['sedative', 'diazepam', 'valium', 'lorazepam', 'alprazolam', 'sleeping pills', 'စိတ်ငြိမ်ဆေး', 'အိပ်ဆေး'],
    severity: 'high',
    note_en: 'Life-threatening central nervous system and respiratory depression. Can lead to extreme sedation, coma, or fatal respiratory arrest.',
    note_mm: 'အသက်ရှူရပ်တန့်ခြင်းနှင့် အာရုံကြောစနစ် ပြင်းထန်စွာကျဆင်းခြင်း အန္တရာယ်ရှိပါသည်။ အလွန်အမင်း အိပ်ငိုက်ခြင်း၊ သတိလစ်မေ့မြောခြင်းနှင့် အသက်အန္တရာယ် ဖြစ်ပေါ်စေနိုင်သည်။',
    advice_en: 'Never consume alcohol while taking sedatives or sleeping medications.',
    advice_mm: 'စိတ်ငြိမ်ဆေး သို့မဟုတ် အိပ်ဆေးများ သောက်နေစဉ် အရက်/ဘီယာ လုံးဝမသောက်ပါနှင့်။'
  },
  {
    keys1: ['alcohol', 'အရက်', 'ဘီယာ', 'ethanol'],
    keys2: ['paracetamol', 'ပါရာစီတမော', 'acetaminophen', 'panadol', 'biogesic', 'tylenol'],
    severity: 'medium',
    note_en: 'Markedly increases the risk of acute liver toxicity and severe liver damage, especially with regular drinking or high doses.',
    note_mm: 'အသည်းထိခိုက်ပျက်စီးနိုင်ခြေ အလွန်မြင့်မားစေပါသည်။ အရက်နှင့် ပါရာစီတမော တွဲဖက်မိပါက အသည်းအဆိပ်သင့်မှု မြန်ဆန်စွာ ဖြစ်ပေါ်စေနိုင်သည်။',
    advice_en: 'Avoid drinking alcohol when taking paracetamol. Do not exceed 4,000mg of paracetamol per day.',
    advice_mm: 'ပါရာစီတမော သောက်နေစဉ် အရက်သောက်ခြင်းကို ရှောင်ကြဉ်ပါ။ တစ်နေ့လျှင် ပါရာစီတမော ၄,၀၀၀ မီလီဂရမ် (ဆေးပြား ၈ ပြား) ထက် ပိုမသောက်ပါနှင့်။'
  },
  {
    keys1: ['ibuprofen', 'အိုင်ဗျူပရိုဖန်', 'brufen', 'advil', 'motrin'],
    keys2: ['aspirin', 'အက်စပရင်', 'cardiprin', 'asa'],
    severity: 'high',
    note_en: 'Significantly elevated risk of gastrointestinal ulceration, severe stomach pain, and internal bleeding. Ibuprofen also blocks Aspirin\'s heart-protective antiplatelet effect.',
    note_mm: 'အစာအိမ်အနာဖြစ်ခြင်း၊ ပြင်းထန်စွာဗိုက်အောင့်ခြင်းနှင့် အစာအိမ်သွေးယိုစိမ့်နိုင်ခြေ အလွန်မြင့်မားပါသည်။ ထို့အပြင် အိုင်ဗျူပရိုဖန်သည် အက်စပရင်၏ နှလုံးကာကွယ်ပေးနိုင်စွမ်းကို လျော့ကျစေပါသည်။',
    advice_en: 'Do not take these two NSAIDs together. If both are prescribed, take Aspirin at least 30 minutes before Ibuprofen.',
    advice_mm: 'ဤဆေးနှစ်မျိုးကို တွဲမသောက်သင့်ပါ။ ဆရာဝန်ညွှန်ကြားပါက အက်စပရင်ကို အရင်သောက်ပြီး မိနစ် ၃၀ ကြာမှ အိုင်ဗျူပရိုဖန်ကို သောက်ပါ။'
  },
  {
    keys1: ['statin', 'atorvastatin', 'simvastatin', 'rosuvastatin', 'lipitor', 'စတက်တင်'],
    keys2: ['grapefruit', 'ဂရိတ်ဖရုသီး', 'grapefruit juice'],
    severity: 'medium',
    note_en: 'Grapefruit inhibits the CYP3A4 liver enzyme, causing statin blood concentrations to surge dangerously. Greatly raises the risk of severe muscle breakdown (rhabdomyolysis) and kidney failure.',
    note_mm: 'ဂရိတ်ဖရုသီးသည် အသည်း၏ ဆေးချေဖျက်မှုကို ပိတ်ဆို့သဖြင့် သွေးတွင်း စတက်တင်ဆေးပမာဏ အဆမတန် မြင့်တက်သွားစေပါသည်။ ကြွက်သားများ ပြင်းထန်စွာ ပျက်စီးခြင်းနှင့် ကျောက်ကပ်ထိခိုက်ခြင်း ဖြစ်စေနိုင်ပါသည်။',
    advice_en: 'Avoid eating grapefruit or drinking grapefruit juice while taking Atorvastatin or Simvastatin.',
    advice_mm: 'စတက်တင် အဆီကျဆေးများ သောက်နေစဉ် ဂရိတ်ဖရုသီး သို့မဟုတ် ဂရိတ်ဖရုဖျော်ရည် သောက်သုံးခြင်းကို လုံးဝရှောင်ကြဉ်ပါ။'
  },
  {
    keys1: ['amoxicillin', 'အမောက်ဆိုဆလင်', 'amoxil', 'augmentin'],
    keys2: ['methotrexate', 'မက်သိုထရက်ဆိတ်', 'mtx', 'trexall'],
    severity: 'high',
    note_en: 'Amoxicillin reduces renal clearance of methotrexate, causing dangerous toxic accumulation in the blood. Can lead to severe bone marrow suppression and liver failure.',
    note_mm: 'အမောက်ဆိုဆလင်သည် ကျောက်ကပ်မှ မက်သိုထရက်ဆိတ်ဆေး စွန့်ထုတ်မှုကို လျော့နည်းစေသဖြင့် သွေးတွင်း အဆိပ်အတောက် ဖြစ်ပေါ်စေနိုင်သည်။ သွေးဥဆဲလ်များ ပြင်းထန်စွာ ကျဆင်းစေနိုင်ပါသည်။',
    advice_en: 'Use alternative antibiotics. If unavoidable, close monitoring of methotrexate blood levels and renal function is mandatory.',
    advice_mm: 'အခြား ပိုးသတ်ဆေးကို အစားထိုး အသုံးပြုပါ။ ဆရာဝန်နှင့် အထူးတိုင်ပင်ရန် လိုအပ်ပါသည်။'
  },
  {
    keys1: ['antacid', 'အစာအိမ်လေဆေး', 'gaviscon', 'maalox'],
    keys2: ['iron', 'သံဓာတ်', 'ferrous sulfate', 'sangobion'],
    severity: 'medium',
    note_en: 'Antacids decrease stomach acid, drastically impairing the gastrointestinal absorption of iron supplements.',
    note_mm: 'အစာအိမ်လေဆေးများသည် အစာအိမ်အက်ဆစ်ကို လျှော့ချပစ်သဖြင့် သံဓာတ်အားဆေး ခန္ဓာကိုယ်ထဲ စုပ်ယူမှုကို များစွာ အဟန့်အတားဖြစ်စေပါသည်။',
    advice_en: 'Separate administration by at least 2 hours. Take iron 2 hours before or 2 hours after antacids.',
    advice_mm: 'ဆေးနှစ်မျိုးကြား အနည်းဆုံး ၂ နာရီ ခြားပြီးမှ သောက်ပါ။ သံဓာတ်အားဆေးကို အစာအိမ်ဆေးမသောက်မီ ၂ နာရီ သို့မဟုတ် သောက်ပြီး ၂ နာရီအကြာတွင် သောက်ပါ။'
  },
  {
    keys1: ['metformin', 'မက်ဖော်မင်', 'glucophage', 'diabex'],
    keys2: ['alcohol', 'အရက်', 'ဘီယာ', 'ethanol'],
    severity: 'high',
    note_en: 'Substantially elevates the risk of severe Lactic Acidosis (a life-threatening metabolic condition) and unexpected hypoglycemic shock.',
    note_mm: 'အသက်အန္တရာယ်ရှိသော လက်တစ်အက်ဆစ်လွန်ကဲမှု (Lactic Acidosis) နှင့် သွေးတွင်းသကြားဓာတ် အလွန်အမင်းထိုးကျခြင်း အန္တရာယ် မြင့်မားစေပါသည်။',
    advice_en: 'Avoid excessive or binge alcohol consumption while taking Metformin.',
    advice_mm: 'မက်ဖော်မင် ဆီးချိုဆေး သောက်သုံးနေစဉ် အရက်/ဘီယာ လုံးဝမသောက်ပါနှင့်။'
  },
  {
    keys1: ['omeprazole', 'အိုမီပရာဇော', 'losec', 'prilosec', 'omez'],
    keys2: ['clopidogrel', 'ကလိုပီဒိုဂရယ်', 'plavix'],
    severity: 'medium',
    note_en: 'Omeprazole inhibits CYP2C19 liver activation of Clopidogrel, significantly reducing its anti-clotting efficacy and increasing heart attack / stroke recurrence risk.',
    note_mm: 'အိုမီပရာဇောသည် ကလိုပီဒိုဂရယ် သွေးကျဲဆေး၏ လုပ်ဆောင်နိုင်စွမ်းကို လျော့ကျစေသဖြင့် နှလုံးသွေးကြောပိတ်ခြင်းနှင့် လေဖြတ်ခြင်း ပြန်လည်ဖြစ်ပွားနိုင်ခြေ ရှိပါသည်။',
    advice_en: 'Switch to Pantoprazole or Rabeprazole if a PPI is needed, or discuss with your cardiologist.',
    advice_mm: 'အစာအိမ်ဆေး လိုအပ်ပါက အိုမီပရာဇော အစား ပန်တိုပရာဇော (Pantoprazole) ကို အစားထိုးသုံးစွဲရန် ဆရာဝန်နှင့် တိုင်ပင်ပါ။'
  },
  {
    keys1: ['ciprofloxacin', 'စီပရိုဖလော့ဆာစင်', 'cipro'],
    keys2: ['antacid', 'calcium', 'iron', 'အစာအိမ်လေဆေး', 'ကယ်လ်စီယမ်', 'သံဓာတ်'],
    severity: 'medium',
    note_en: 'Polyvalent cations (calcium, magnesium, aluminum, iron) chelate with Ciprofloxacin in the stomach, blocking antibiotic absorption by up to 90%.',
    note_mm: 'အစာအိမ်လေဆေး၊ ကယ်လ်စီယမ်နှင့် သံဓာတ်တို့သည် စီပရိုဖလော့ဆာစင် ပိုးသတ်ဆေးနှင့် တွဲကပ်သွားပြီး ဆေးအာနိသင် ၉၀% အထိ လျော့ကျသွားစေပါသည်။',
    advice_en: 'Take Ciprofloxacin at least 2 hours before or 6 hours after any mineral supplement or antacid.',
    advice_mm: 'စီပရိုဖလော့ဆာစင် ပိုးသတ်ဆေးကို အစာအိမ်ဆေး သို့မဟုတ် အားဆေး မသောက်မီ ၂ နာရီအလို သို့မဟုတ် သောက်ပြီး ၆ နာရီကြာမှ သောက်ပါ။'
  },
  {
    keys1: ['tramadol', 'ထရာမာဒေါ', 'ultram', 'tramal'],
    keys2: ['ssri', 'fluoxetine', 'prozac', 'sertraline', 'zoloft', 'စိတ်ကျဆေး'],
    severity: 'high',
    note_en: 'High risk of Serotonin Syndrome (hyperthermia, seizures, rigid muscles, delirium, rapid heartbeat) and reduced seizure threshold.',
    note_mm: 'ဆီရိုတိုနင် အဆိပ်သင့်မှု (Serotonin Syndrome) ဖြစ်ပေါ်စေပြီး အဖျားတက်ခြင်း၊ တက်ခြင်း၊ ကြွက်သားတောင့်တင်းခြင်းနှင့် နှလုံးခုန်မြန်ခြင်းတို့ ဖြစ်စေနိုင်ပါသည်။',
    advice_en: 'Avoid concurrent use. Seek immediate emergency medical care if agitation, tremors, or high fever occur.',
    advice_mm: 'ဤဆေးနှစ်မျိုးကို တွဲမသောက်ပါနှင့်။ တက်ခြင်း၊ အဖျားကြီးခြင်း သို့မဟုတ် ဂဏာမငြိမ်ဖြစ်ပါက အရေးပေါ်ဆေးကုသမှု ချက်ချင်းခံယူပါ။'
  },
  {
    keys1: ['ace_inhibitor', 'lisinopril', 'enalapril', 'ramipril', 'သွေးတိုးကျဆေး'],
    keys2: ['spironolactone', 'potassium', 'aldactone', 'ပိုတက်စီယမ်'],
    severity: 'medium',
    note_en: 'Combined use can lead to dangerously elevated blood potassium levels (Hyperkalemia), which can cause fatal cardiac arrhythmias.',
    note_mm: 'သွေးတွင်း ပိုတက်စီယမ်ဓာတ် အလွန်အမင်း မြင့်တက်စေပြီး နှလုံးခုန်မမှန်ခြင်းနှင့် နှလုံးရပ်တန့်ခြင်း အန္တရာယ် ဖြစ်ပေါ်စေနိုင်သည်။',
    advice_en: 'Regular serum potassium and renal function monitoring is strongly advised.',
    advice_mm: 'သွေးတွင်း ပိုတက်စီယမ်ပမာဏနှင့် ကျောက်ကပ်လုပ်ဆောင်ချက်ကို ပုံမှန် စစ်ဆေးပေးရပါမည်။'
  },
  {
    keys1: ['sildenafil', 'viagra', 'revatio', 'ဗိုင်ယာဂရာ'],
    keys2: ['nitrates', 'nitroglycerin', 'isosorbide', 'isordil', 'နှလုံးဆေး'],
    severity: 'high',
    note_en: 'Dangerous, severe, and rapid drop in blood pressure (severe hypotension) that can be fatal or cause fainting and myocardial infarction.',
    note_mm: 'သွေးပေါင်ချိန် အလွန်အမင်း ရုတ်တရက် ထိုးကျသွားနိုင်ပြီး သတိလစ်ခြင်း၊ နှလုံးဖောက်ခြင်းနှင့် အသက်အန္တရာယ် ဖြစ်စေနိုင်သည်။ လုံးဝတွဲမသောက်ရပါ။',
    advice_en: 'Absolute contraindication. Never combine PDE5 inhibitors with nitrates.',
    advice_mm: 'လုံးဝတွဲဖက် မသောက်သုံးရပါ။ နှလုံးဆေး Nitrates သောက်နေသူများ ဗိုင်ယာဂရာဆေး လုံးဝမသောက်သင့်ပါ။'
  },
  {
    keys1: ['levothyroxine', 'eltroxin', 'synthroid', 'သိုင်းရွိုက်ဆေး'],
    keys2: ['calcium', 'iron', 'ကယ်လ်စီယမ်', 'သံဓာတ်'],
    severity: 'medium',
    note_en: 'Calcium and iron minerals bind with levothyroxine in the gut, substantially reducing thyroid hormone absorption.',
    note_mm: 'ကယ်လ်စီယမ်နှင့် သံဓာတ်တို့သည် အစာအိမ်တွင်း သိုင်းရွိုက်ဟော်မုန်းဆေး စုပ်ယူမှုကို အဟန့်အတားဖြစ်စေပါသည်။',
    advice_en: 'Take levothyroxine on an empty stomach at least 4 hours apart from calcium or iron supplements.',
    advice_mm: 'သိုင်းရွိုက်ဆေးကို မနက်စောစော ဗိုက်ထဲအစာမရှိမီ သောက်ပြီး ကယ်လ်စီယမ်/သံဓာတ်အားဆေးကို အနည်းဆုံး ၄ နာရီခြားပြီးမှ သောက်ပါ။'
  },
  {
    keys1: ['amoxicillin', 'ampicillin', 'penicillin', 'အမောက်ဆိုဆလင်', 'ပင်နီဆီလင်', 'augmentin'],
    keys2: ['cephalosporin', 'cefalexin', 'cefixime', 'ceftriaxone', 'cefaclor', 'စယ်ဖာလက်ဆင်', 'စီဖစ်ဇင်း'],
    severity: 'medium',
    isAllergy: true,
    note_en: '⚠️ Cross-Allergy Risk (~5-10%): Penicillin and Cephalosporin share a beta-lactam core. Penicillin-allergic individuals may experience allergic reactions (hives, facial swelling, anaphylaxis).',
    note_mm: '⚠️ ဆေးဓာတ်မတည့်မှု ကူးစက်နိုင်ခြေ (Cross-Allergy Risk ~5-10%): ပင်နီဆီလင် သို့မဟုတ် အမောက်ဆိုဆလင်နှင့် မတည့်ဖူးပါက Cephalosporin ပိုးသတ်ဆေးများနှင့်လည်း အင်ပြင်ထွက်ခြင်း၊ မျက်နှာဖောခြင်း၊ အသက်ရှူကျပ်ခြင်းတို့ ဖြစ်နိုင်ပါသည်။',
    advice_en: 'Inform your physician if you have a known penicillin allergy before starting cephalosporin antibiotics.',
    advice_mm: 'ပင်နီဆီလင်/အမောက်ဆိုဆလင်နှင့် ဓာတ်မတည့်ဖူးသည့် မှတ်တမ်းရှိပါက ဆရာဝန်အား ကြိုတင် အသိပေးပါ။'
  },
  {
    keys1: ['aspirin', 'အက်စပရင်', 'cardiprin'],
    keys2: ['diclofenac', 'mefenamic', 'naproxen', 'ponstan', 'ဒိုင်ကလိုဖီနက်', 'ပွန်စတန်'],
    severity: 'high',
    isAllergy: true,
    note_en: '⚠️ Severe Cross-Hypersensitivity & Bleeding Risk: Aspirin-sensitive individuals often experience acute asthma attacks (bronchospasm), facial angioedema, and severe stomach ulceration with other NSAIDs.',
    note_mm: '⚠️ ပြင်းထန်သော ဓာတ်မတည့်မှုနှင့် သွေးယိုနိုင်ခြေ (Cross-reactivity): အက်စပရင်နှင့် မတည့်သူများသည် ဒိုင်ကလိုဖီနက်၊ ပွန်စတန် စသည့် အကိုက်အခဲပျောက်ဆေးများနှင့်ပါ ရုတ်တရက် ရင်ကြပ်ပန်းနာထခြင်း၊ မျက်နှာဖောခြင်းနှင့် အစာအိမ်သွေးယိုခြင်း ဖြစ်နိုင်ပါသည်။',
    advice_en: 'Avoid all NSAID painkillers if you have aspirin sensitivity or aspirin-induced asthma.',
    advice_mm: 'အက်စပရင် မတည့်ပါက အခြားသော အကိုက်အခဲပျောက်ဆေး NSAIDs အားလုံးကို ရှောင်ကြဉ်ပါ။'
  },
  {
    keys1: ['paracetamol', 'ပါရာစီတမော', 'panadol', 'biogesic'],
    keys2: ['decolgen', 'ဒီကိုဂျင်', 'para', 'tylenol'],
    severity: 'high',
    note_en: '⚠️ Accidental Double-Dosing / Overdose Toxicity: Both medications contain Paracetamol (Acetaminophen). Taking them together can easily exceed the safe 4,000mg/day limit and cause acute liver failure.',
    note_mm: '⚠️ ပါရာစီတမော ဆေးပမာဏ လွန်ကဲမှု အန္တရာယ် (Double Dosing): ဒီကိုဂျင်တွင် ပါရာစီတမော ပါဝင်ပြီးဖြစ်သဖြင့် ပါရာစီတမောဆေးပြားနှင့် ထပ်မံတွဲသောက်ပါက ဆေးပမာဏလွန်ကဲကာ အသည်းပျက်စီးနိုင်ပါသည်။',
    advice_en: 'Do not combine multiple cold/pain medicines that already contain Paracetamol.',
    advice_mm: 'ပါရာစီတမော ပါဝင်ပြီးဖြစ်သော အအေးမိဆေးများနှင့် ပါရာစီတမောကို ထပ်မံတွဲမသောက်ပါနှင့်။'
  }
];

// Popular quick test chips in bilingual formats
const POPULAR_EXAMPLES = [
  { m1: 'Aspirin (အက်စပရင်)', m2: 'Warfarin (ဝါဖရင်)', labelMM: 'အက်စပရင် + ဝါဖရင်', labelEN: 'Aspirin + Warfarin' },
  { m1: 'Paracetamol (ပါရာစီတမော)', m2: 'Alcohol (အရက် / ဘီယာ)', labelMM: 'ပါရာစီတမော + အရက်', labelEN: 'Paracetamol + Alcohol' },
  { m1: 'Ibuprofen (အိုင်ဗျူပရိုဖန်)', m2: 'Aspirin (အက်စပရင်)', labelMM: 'အိုင်ဗျူပရိုဖန် + အက်စပရင်', labelEN: 'Ibuprofen + Aspirin' },
  { m1: 'Atorvastatin / Statin (စတက်တင်)', m2: 'Grapefruit (ဂရိတ်ဖရုသီး)', labelMM: 'စတက်တင် + ဂရိတ်ဖရုသီး', labelEN: 'Statin + Grapefruit' },
  { m1: 'Amoxicillin (အမောက်ဆိုဆလင်)', m2: 'Methotrexate (မက်သိုထရက်ဆိတ်)', labelMM: 'အမောက်ဆိုဆလင် + မက်သိုထရက်ဆိတ်', labelEN: 'Amoxicillin + Methotrexate' },
  { m1: 'Omeprazole (အိုမီပရာဇော)', m2: 'Clopidogrel (ကလိုပီဒိုဂရယ်)', labelMM: 'အိုမီပရာဇော + ကလိုပီဒိုဂရယ်', labelEN: 'Omeprazole + Clopidogrel' },
  { m1: 'Antacid (အစာအိမ်လေဆေး)', m2: 'Iron Supplement (သံဓာတ်အားဆေး)', labelMM: 'အစာအိမ်လေဆေး + သံဓာတ်', labelEN: 'Antacid + Iron' },
  { m1: 'Metformin (မက်ဖော်မင်)', m2: 'Alcohol (အရက် / ဘီယာ)', labelMM: 'မက်ဖော်မင် + အရက်', labelEN: 'Metformin + Alcohol' },
];

const MedicineInteractionScreen = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const isMM = i18n.language === 'mm';
  
  const [med1, setMed1] = useState('');
  const [med2, setMed2] = useState('');
  const [result, setResult] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [allMedicines, setAllMedicines] = useState(DEFAULT_MEDICINES);
  const [loadingMeds, setLoadingMeds] = useState(false);

  // Suggestions & Filter State
  const [suggestions1, setSuggestions1] = useState([]);
  const [suggestions2, setSuggestions2] = useState([]);
  const [activeCategory1, setActiveCategory1] = useState('all');
  const [activeCategory2, setActiveCategory2] = useState('all');
  const [focusedInput, setFocusedInput] = useState(null); // 'med1' | 'med2' | null

  useEffect(() => {
    fetchBackendMedicines();
  }, []);

  const fetchBackendMedicines = async () => {
    try {
      setLoadingMeds(true);
      const data = await getAllMedicines();
      if (Array.isArray(data) && data.length > 0) {
        const formatted = data.map(item => {
          const name = typeof item === 'string' ? item : (item.name || '');
          return {
            name: name,
            generic: name.toLowerCase(),
            category: 'all',
            keywords: [name.toLowerCase(), ...(item.uses || []).map(u => String(u).toLowerCase())]
          };
        });

        const combined = [...DEFAULT_MEDICINES];
        formatted.forEach(f => {
          if (!combined.some(c => c.name.toLowerCase() === f.name.toLowerCase())) {
            combined.push(f);
          }
        });
        setAllMedicines(combined);
      }
    } catch (error) {
      console.log('Using built-in medicine database for interactions:', error.message);
    } finally {
      setLoadingMeds(false);
    }
  };

  // Filter medicines based on user input and selected category
  const getFilteredMedicines = (query = '', category = 'all') => {
    let list = allMedicines;
    if (category && category !== 'all') {
      list = list.filter(item => item.category === category);
    }

    const cleanQuery = (query || '').toLowerCase().trim();
    if (cleanQuery.length === 0) {
      return list.slice(0, 10); // Return top 10 popular when empty
    }

    return list
      .filter(item => {
        const nameMatch = item.name.toLowerCase().includes(cleanQuery);
        const genericMatch = item.generic && item.generic.toLowerCase().includes(cleanQuery);
        const keywordMatch = item.keywords && item.keywords.some(k => k.toLowerCase().includes(cleanQuery));
        return nameMatch || genericMatch || keywordMatch;
      })
      .slice(0, 10);
  };

  // Open & Filter for Medicine 1
  const handleFocusMed1 = (cat = activeCategory1) => {
    setFocusedInput('med1');
    setSuggestions2([]);
    setSuggestions1(getFilteredMedicines(med1, cat));
  };

  const handleMed1Change = (text) => {
    setMed1(text);
    setFocusedInput('med1');
    setSuggestions2([]);
    setSuggestions1(getFilteredMedicines(text, activeCategory1));
  };

  const handleCategory1Change = (catId) => {
    setActiveCategory1(catId);
    setSuggestions1(getFilteredMedicines(med1, catId));
  };

  // Open & Filter for Medicine 2
  const handleFocusMed2 = (cat = activeCategory2) => {
    setFocusedInput('med2');
    setSuggestions1([]);
    setSuggestions2(getFilteredMedicines(med2, cat));
  };

  const handleMed2Change = (text) => {
    setMed2(text);
    setFocusedInput('med2');
    setSuggestions1([]);
    setSuggestions2(getFilteredMedicines(text, activeCategory2));
  };

  const handleCategory2Change = (catId) => {
    setActiveCategory2(catId);
    setSuggestions2(getFilteredMedicines(med2, catId));
  };

  // Select suggestion
  const selectSuggestion1 = (medicineItem) => {
    setMed1(medicineItem.name);
    setSuggestions1([]);
    setFocusedInput(null);
    Keyboard.dismiss();
  };

  const selectSuggestion2 = (medicineItem) => {
    setMed2(medicineItem.name);
    setSuggestions2([]);
    setFocusedInput(null);
    Keyboard.dismiss();
  };

  // Swap Medicine 1 and Medicine 2
  const handleSwap = () => {
    const temp = med1;
    setMed1(med2);
    setMed2(temp);
    setSuggestions1([]);
    setSuggestions2([]);
    if (result) {
      runCheckInteraction(med2, temp);
    }
  };

  // Quick select an example combination
  const handleSelectExample = (example) => {
    setMed1(example.m1);
    setMed2(example.m2);
    setSuggestions1([]);
    setSuggestions2([]);
    Keyboard.dismiss();
    runCheckInteraction(example.m1, example.m2);
  };

  // Clear all inputs
  const handleClearAll = () => {
    setMed1('');
    setMed2('');
    setResult(null);
    setSuggestions1([]);
    setSuggestions2([]);
    setFocusedInput(null);
    stopSpeech();
  };

  const stopSpeech = async () => {
    try {
      await stopTts();
      setIsSpeaking(false);
    } catch (error) {
      console.error("Stop speech error:", error);
    }
  };

  const speakResult = async () => {
    if (!result) return;
    
    if (isSpeaking) {
      await stopSpeech();
      return;
    }
    
    const cleanMed1 = med1.replace(/\(.*?\)/g, "").trim();
    const cleanMed2 = med2.replace(/\(.*?\)/g, "").trim();
    
    let speechText = "";
    if (isMM) {
      const severityMap = {
        high: "အလွန်အန္တရာယ်ရှိသော ဓာတ်ပြုမှု ဖြစ်ပါသည်",
        medium: "သတိထားရန်လိုသော ဓာတ်ပြုမှု ဖြစ်ပါသည်",
        low: "အနည်းငယ် သတိပြုရန်လိုသော ဓာတ်ပြုမှု ဖြစ်ပါသည်",
        none: "မည်သည့် ဆိုးရွားသော ဓာတ်ပြုမှုမျှ မတွေ့ရှိပါ",
      };
      const sevText = severityMap[result.severity] || "စစ်ဆေးမှု ရလဒ် ဖြစ်ပါသည်";
      speechText = `ဆေးဝါးဓာတ်ပြုမှု စစ်ဆေးချက် ရလဒ်။ ${cleanMed1} နှင့် ${cleanMed2}။ အန္တရာယ် အဆင့်အတန်း - ${sevText}။ `;
      if (result.note_mm) {
        speechText += `ဓာတ်ပြုမှုဆိုင်ရာ အသေးစိတ် - ${result.note_mm}။ `;
      }
      if (result.advice_mm) {
        speechText += `ဆေးဝါးဆိုင်ရာ အကြံပြုချက် - ${result.advice_mm}။ `;
      }
      speechText += "သတိပေးချက် - ဆေးနှစ်မျိုးတွဲမသောက်မီ ဆရာဝန် သို့မဟုတ် ဆေးဝါးကျွမ်းကျင်သူနှင့် အမြဲတိုင်ပင်ပါ။";
    } else {
      const severityMap = {
        high: "High Risk Interaction",
        medium: "Moderate Risk Interaction",
        low: "Minor Interaction",
        none: "No Known Interaction",
      };
      const sevText = severityMap[result.severity] || "Check Result";
      speechText = `Medicine Interaction Result. ${cleanMed1} and ${cleanMed2}. Severity Level: ${sevText}. `;
      if (result.note_en) {
        speechText += `Clinical Details: ${result.note_en}. `;
      }
      if (result.advice_en) {
        speechText += `Recommendations: ${result.advice_en}. `;
      }
      speechText += "Disclaimer: Always consult your physician or pharmacist before combining medications.";
    }
    
    try {
      setIsSpeaking(true);
      await speak(speechText, {
        language: isMM ? 'my' : 'en',
        onStart: () => setIsSpeaking(true),
        onDone: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    } catch (error) {
      console.error("TTS Speech error:", error);
      setIsSpeaking(false);
    }
  };

  // Match interaction between two drugs
  const runCheckInteraction = async (m1Name, m2Name) => {
    if (!m1Name.trim() || !m2Name.trim()) return;

    Keyboard.dismiss();
    setSuggestions1([]);
    setSuggestions2([]);
    setFocusedInput(null);
    stopSpeech();

    const m1Lower = m1Name.toLowerCase();
    const m2Lower = m2Name.toLowerCase();

    // Check interaction against database
    let found = null;
    for (const item of INTERACTIONS_DATABASE) {
      const match1to1 = item.keys1.some(k => m1Lower.includes(k.toLowerCase())) &&
                        item.keys2.some(k => m2Lower.includes(k.toLowerCase()));
      const match2to1 = item.keys1.some(k => m2Lower.includes(k.toLowerCase())) &&
                        item.keys2.some(k => m1Lower.includes(k.toLowerCase()));

      if (match1to1 || match2to1) {
        found = item;
        break;
      }
    }

    const interactionResult = found || {
      severity: 'none',
      note_en: 'No major clinical interaction found in database. Still exercise caution and consult your pharmacist or doctor.',
      note_mm: 'အသုံးများသော ဆိုးရွားသည့် ဓာတ်ပြုမှု မတွေ့ရှိပါ။ သို့သော် ဆေးဝါးများ မသောက်မီ ဆရာဝန် သို့မဟုတ် ဆေးဝါးကျွမ်းကျင်သူနှင့် အမြဲတိုင်ပင်ပါ။',
      advice_en: 'Always take medications as prescribed by your healthcare provider.',
      advice_mm: 'ဆေးဝါးများကို သတ်မှတ်ထားသော ဆေးညွှန်းအတိုင်းသာ တိကျစွာ သောက်သုံးပါ။'
    };

    setResult(interactionResult);

    // Save to History
    try {
      const severityLabel = interactionResult.severity.toUpperCase();
      const historyTitle = isMM ? `ဆေးဝါးဓာတ်ပြုမှု: ${m1Name.split(' (')[0]} + ${m2Name.split(' (')[0]}` : `Interaction: ${m1Name} + ${m2Name}`;
      const historyDetails = `${severityLabel}: ${(isMM ? interactionResult.note_mm : interactionResult.note_en) || interactionResult.note}`;
      
      await saveToHistory({
        type: 'Interaction',
        title: historyTitle,
        details: historyDetails
      });

      if (user && user.id) {
        await saveHistoryToDB('Interaction', historyTitle, historyDetails, user.id);
      }
    } catch (e) {
      console.log('Failed to save interaction history:', e);
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'high':
        return {
          bg: '#FFE4E6',
          color: '#E11D48',
          label: isMM ? '🚨 အလွန်အန္တရာယ်ရှိသော ဓာတ်ပြုမှု (High Risk)' : '🚨 High Risk Interaction',
          icon: <AlertTriangle size={24} color="#E11D48" />
        };
      case 'medium':
        return {
          bg: '#FEF3C7',
          color: '#D97706',
          label: isMM ? '⚠️ သတိထားရန်လိုသော ဓာတ်ပြုမှု (Moderate)' : '⚠️ Moderate Risk Interaction',
          icon: <AlertTriangle size={24} color="#D97706" />
        };
      case 'low':
        return {
          bg: '#E0F2FE',
          color: '#0284C7',
          label: isMM ? 'ℹ️ အနည်းငယ် သတိပြုရန် (Minor)' : 'ℹ️ Minor Interaction',
          icon: <Info size={24} color="#0284C7" />
        };
      default:
        return {
          bg: '#DCFCE7',
          color: '#16A34A',
          label: isMM ? '✅ ဓာတ်ပြုမှု မတွေ့ရှိပါ (No Known Interaction)' : '✅ No Known Interaction',
          icon: <CheckCircle2 size={24} color="#16A34A" />
        };
    }
  };

  return (
    <TouchableWithoutFeedback onPress={() => {
      setSuggestions1([]);
      setSuggestions2([]);
      setFocusedInput(null);
      Keyboard.dismiss();
    }}>
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Main Card */}
        <Card style={styles.mainCard} elevation={2}>
          <Card.Content style={styles.cardContent}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconCircle}>
                <ShieldAlert size={28} color="#E11D48" />
              </View>
              <View style={styles.headerTextWrap}>
                <Text variant="titleMedium" style={styles.title}>
                  {isMM ? 'ဆေးဝါးဓာတ်ပြုမှု စစ်ဆေးခြင်း' : (t('interaction_checker') || 'Interaction Checker')}
                </Text>
                <Text variant="bodySmall" style={styles.subtitle}>
                  {isMM 
                    ? 'ဆေးနှစ်မျိုးကို တွဲသောက်ရင် ဘေးထွက်ဆိုးကျိုး ရှိ, မရှိ စစ်ဆေးပါ။' 
                    : (t('interaction_desc_long') || 'Check if two medicines are safe to take together.')}
                </Text>
              </View>
            </View>

            {/* Input 1: Medicine 1 */}
            <View style={styles.inputContainer}>
              <View style={styles.inputLabelRow}>
                <Text style={styles.inputLabel}>
                  {isMM ? '💊 ပထမဆေးအမည် (Medicine 1)' : '💊 First Medicine (Medicine 1)'}
                </Text>
                {med1.length > 0 && (
                  <TouchableOpacity onPress={() => handleMed1Change('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Text style={styles.clearFieldText}>{isMM ? 'ဖျက်မည်' : 'Clear'}</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Searchbar
                placeholder={isMM ? 'ပထမဆေးအမည် ရွေးရန် သို့မဟုတ် ရိုက်ထည့်ပါ' : 'Select or type First Medicine (e.g. Aspirin)'}
                onChangeText={handleMed1Change}
                value={med1}
                onFocus={() => handleFocusMed1()}
                style={[styles.search, (focusedInput === 'med1' || suggestions1.length > 0) && styles.searchActive]}
                inputStyle={styles.searchInput}
                icon={() => <Search size={20} color="#E11D48" />}
                clearIcon={med1 ? () => <X size={18} color="#8A8FA3" /> : undefined}
                onClearIconPress={() => handleMed1Change('')}
                elevation={0}
              />

              {/* Medicine 1 Filter Dropdown List */}
              {focusedInput === 'med1' && suggestions1.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  {/* Category Filter Chips Bar */}
                  <View style={styles.categoryHeaderWrap}>
                    <View style={styles.suggestionsHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Filter size={15} color="#E11D48" />
                        <Text style={styles.suggestionsTitle}>
                          {isMM ? 'ဆေးဝါးအုပ်စု အလိုက် ရွေးချယ်ရန် :' : 'Filter by Category :'}
                        </Text>
                      </View>
                      <Text style={styles.suggestionsCount}>
                        {suggestions1.length} {isMM ? 'မျိုး' : 'items'}
                      </Text>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                      {MEDICINE_CATEGORIES.map(cat => {
                        const isCatActive = activeCategory1 === cat.id;
                        return (
                          <TouchableOpacity
                            key={cat.id}
                            style={[styles.catChip, isCatActive && styles.catChipActive]}
                            onPress={() => handleCategory1Change(cat.id)}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.catChipText, isCatActive && styles.catChipTextActive]}>
                              {isMM ? cat.labelMM : cat.labelEN}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* Dropdown Items List */}
                  <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
                    {suggestions1.map((item, idx) => (
                      <TouchableOpacity
                        key={`sug1-${idx}`}
                        style={[styles.suggestionItem, idx === suggestions1.length - 1 && styles.suggestionItemLast]}
                        onPress={() => selectSuggestion1(item)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.pillIconBg}>
                          <Pill size={16} color="#E11D48" />
                        </View>
                        <View style={styles.suggestionTextWrap}>
                          <Text style={styles.suggestionName} numberOfLines={1}>
                            {item.name}
                          </Text>
                        </View>
                        <Text style={styles.selectPillBtn}>{isMM ? 'ရွေးမည်' : 'Select'}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Swap & Divider Button */}
            <View style={styles.swapRow}>
              <View style={styles.swapLine} />
              <TouchableOpacity 
                style={styles.swapBtn} 
                onPress={handleSwap}
                activeOpacity={0.7}
                accessibilityLabel="Swap medicines"
              >
                <ArrowUpDown size={18} color="#E11D48" />
              </TouchableOpacity>
              <View style={styles.swapLine} />
            </View>

            {/* Input 2: Medicine 2 */}
            <View style={styles.inputContainer}>
              <View style={styles.inputLabelRow}>
                <Text style={styles.inputLabel}>
                  {isMM ? '💊 ဒုတိယဆေးအမည် (Medicine 2)' : '💊 Second Medicine (Medicine 2)'}
                </Text>
                {med2.length > 0 && (
                  <TouchableOpacity onPress={() => handleMed2Change('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Text style={styles.clearFieldText}>{isMM ? 'ဖျက်မည်' : 'Clear'}</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Searchbar
                placeholder={isMM ? 'ဒုတိယဆေးအမည် ရွေးရန် သို့မဟုတ် ရိုက်ထည့်ပါ' : 'Select or type Second Medicine (e.g. Warfarin)'}
                onChangeText={handleMed2Change}
                value={med2}
                onFocus={() => handleFocusMed2()}
                style={[styles.search, (focusedInput === 'med2' || suggestions2.length > 0) && styles.searchActive]}
                inputStyle={styles.searchInput}
                icon={() => <Search size={20} color="#E11D48" />}
                clearIcon={med2 ? () => <X size={18} color="#8A8FA3" /> : undefined}
                onClearIconPress={() => handleMed2Change('')}
                elevation={0}
              />

              {/* Medicine 2 Filter Dropdown List */}
              {focusedInput === 'med2' && suggestions2.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  {/* Category Filter Chips Bar */}
                  <View style={styles.categoryHeaderWrap}>
                    <View style={styles.suggestionsHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Filter size={15} color="#E11D48" />
                        <Text style={styles.suggestionsTitle}>
                          {isMM ? 'ဆေးဝါးအုပ်စု အလိုက် ရွေးချယ်ရန် :' : 'Filter by Category :'}
                        </Text>
                      </View>
                      <Text style={styles.suggestionsCount}>
                        {suggestions2.length} {isMM ? 'မျိုး' : 'items'}
                      </Text>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                      {MEDICINE_CATEGORIES.map(cat => {
                        const isCatActive = activeCategory2 === cat.id;
                        return (
                          <TouchableOpacity
                            key={cat.id}
                            style={[styles.catChip, isCatActive && styles.catChipActive]}
                            onPress={() => handleCategory2Change(cat.id)}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.catChipText, isCatActive && styles.catChipTextActive]}>
                              {isMM ? cat.labelMM : cat.labelEN}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* Dropdown Items List */}
                  <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
                    {suggestions2.map((item, idx) => (
                      <TouchableOpacity
                        key={`sug2-${idx}`}
                        style={[styles.suggestionItem, idx === suggestions2.length - 1 && styles.suggestionItemLast]}
                        onPress={() => selectSuggestion2(item)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.pillIconBg}>
                          <Pill size={16} color="#E11D48" />
                        </View>
                        <View style={styles.suggestionTextWrap}>
                          <Text style={styles.suggestionName} numberOfLines={1}>
                            {item.name}
                          </Text>
                        </View>
                        <Text style={styles.selectPillBtn}>{isMM ? 'ရွေးမည်' : 'Select'}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Action Button */}
            <View style={styles.actionRow}>
              <Button 
                mode="contained" 
                onPress={() => runCheckInteraction(med1, med2)} 
                style={styles.checkBtn}
                labelStyle={styles.checkBtnLabel}
                disabled={!med1.trim() || !med2.trim()}
                icon={() => <ShieldAlert size={20} color="#FFF" />}
              >
                {isMM ? '🛡️ ဓာတ်ပြုမှု စစ်ဆေးမည်' : (t('check_now') || 'Check Now')}
              </Button>
              {(med1.length > 0 || med2.length > 0 || result) && (
                <TouchableOpacity 
                  style={styles.resetBtn} 
                  onPress={handleClearAll}
                  activeOpacity={0.7}
                >
                  <RotateCcw size={16} color="#64748B" />
                  <Text style={styles.resetBtnText}>{isMM ? 'အားလုံးဖျက်' : 'Reset'}</Text>
                </TouchableOpacity>
              )}
            </View>
          </Card.Content>
        </Card>

        {/* Result Card */}
        {result && (
          <Card style={[styles.resultCard, { borderLeftColor: getSeverityBadge(result.severity).color }]}>
            <Card.Content style={styles.resultCardContent}>
              {/* Severity Banner */}
              <View style={[styles.severityBanner, { backgroundColor: getSeverityBadge(result.severity).bg }]}>
                <View style={styles.severityLeft}>
                  {getSeverityBadge(result.severity).icon}
                  <View style={styles.severityTextWrap}>
                    <Text style={[styles.severityLabel, { color: getSeverityBadge(result.severity).color }]}>
                      {getSeverityBadge(result.severity).label}
                    </Text>
                    <Text style={styles.combinationSubtitle}>
                      {med1.split(' (')[0]} + {med2.split(' (')[0]}
                    </Text>
                  </View>
                </View>

                {/* TTS Speaker Button */}
                <TouchableOpacity 
                  onPress={speakResult} 
                  style={[styles.speakButton, { backgroundColor: getSeverityBadge(result.severity).color }]}
                  activeOpacity={0.8}
                  accessibilityLabel="Read result aloud"
                >
                  {isSpeaking ? (
                    <VolumeX size={20} color="#FFFFFF" />
                  ) : (
                    <Volume2 size={20} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>

              <Divider style={styles.divider} />

              {/* Detailed Description */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionHeading}>
                  {isMM ? '📋 ဓာတ်ပြုမှုဆိုင်ရာ အသေးစိတ် :' : '📋 Clinical Details :'}
                </Text>
                <Text style={styles.detailText}>
                  {(isMM ? result.note_mm : result.note_en) || result.note}
                </Text>
              </View>

              {/* Clinical Advice */}
              {(result.advice_mm || result.advice_en || result.advice) && (
                <View style={styles.adviceSection}>
                  <Text style={styles.adviceSectionHeading}>
                    {isMM ? '💡 ဆေးဝါးဆိုင်ရာ အကြံပြုချက် :' : '💡 Recommendations :'}
                  </Text>
                  <Text style={styles.adviceText}>
                    {(isMM ? result.advice_mm : result.advice_en) || result.advice}
                  </Text>
                </View>
              )}

              {/* Disclaimer */}
              <View style={styles.disclaimerBox}>
                <Info size={14} color="#64748B" />
                <Text style={styles.disclaimerText}>
                  {isMM 
                    ? 'သတိပေးချက် - ဤသည်မှာ ဗဟုသုတအလို့ငှာသာ ဖြစ်ပါသည်။ ဆေးနှစ်မျိုးတွဲမသောက်မီ ဆရာဝန် သို့မဟုတ် ဆေးဝါးကျွမ်းကျင်သူနှင့် အမြဲတိုင်ပင်ပါ။'
                    : 'Disclaimer: For informational purposes only. Always consult a licensed healthcare professional.'}
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Popular Combinations Card */}
        <Card style={styles.examplesCard}>
          <Card.Content>
            <View style={styles.examplesHeader}>
              <Sparkles size={20} color="#E11D48" />
              <Text variant="titleSmall" style={styles.examplesTitle}>
                {isMM ? '⚡ အသုံးများသော စမ်းသပ်ရန် ဆေးတွဲများ' : (t('popular_combinations') || '⚡ Popular Combinations to Test')}
              </Text>
            </View>
            <Text style={styles.examplesSubtitle}>
              {isMM ? 'ဆေးတွဲတစ်ခုခုကို နှိပ်၍ ချက်ချင်း စစ်ဆေးနိုင်ပါသည် :' : 'Tap any example to instantly test interaction :'}
            </Text>

            <View style={styles.examplesGrid}>
              {POPULAR_EXAMPLES.map((example, idx) => (
                <TouchableOpacity
                  key={`example-${idx}`}
                  style={styles.exampleChip}
                  onPress={() => handleSelectExample(example)}
                  activeOpacity={0.7}
                >
                  <Pill size={14} color="#E11D48" />
                  <Text style={styles.exampleChipText}>
                    {isMM ? example.labelMM : example.labelEN}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFF1F2' 
  },
  content: { 
    padding: 16,
    paddingBottom: 40 
  },
  mainCard: { 
    borderRadius: 24, 
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFE4E6'
  },
  cardContent: {
    padding: 18,
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 18 
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    marginLeft: 14,
    flex: 1,
  },
  title: { 
    fontWeight: 'bold', 
    color: '#881337',
    fontSize: 18,
  },
  subtitle: { 
    color: '#9F1239', 
    marginTop: 2,
    fontSize: 12,
  },
  inputContainer: {
    marginBottom: 6,
  },
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  clearFieldText: {
    fontSize: 12,
    color: '#E11D48',
    fontWeight: '500',
  },
  search: { 
    backgroundColor: '#F8FAFC', 
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 50,
  },
  searchActive: {
    borderColor: '#E11D48',
    backgroundColor: '#FFF',
  },
  searchInput: {
    fontSize: 13.5,
    color: '#1E293B',
    minHeight: 50,
  },

  // Interactive Category Filter & Dropdown
  suggestionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: '#FDA4AF',
    elevation: 5,
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    overflow: 'hidden',
  },
  categoryHeaderWrap: {
    backgroundColor: '#FFF5F5',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE4E6',
  },
  suggestionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  suggestionsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#E11D48',
  },
  suggestionsCount: {
    fontSize: 11,
    color: '#9F1239',
    fontWeight: '600',
  },
  categoryScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  catChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  catChipActive: {
    backgroundColor: '#E11D48',
    borderColor: '#E11D48',
  },
  catChipText: {
    fontSize: 11,
    color: '#881337',
    fontWeight: '600',
  },
  catChipTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  dropdownScroll: {
    maxHeight: 220,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  suggestionItemLast: {
    borderBottomWidth: 0,
  },
  pillIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  suggestionTextWrap: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '600',
  },
  selectPillBtn: {
    fontSize: 11,
    color: '#E11D48',
    fontWeight: 'bold',
    backgroundColor: '#FFE4E6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },

  swapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  swapLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  swapBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
    borderWidth: 1,
    borderColor: '#FDA4AF',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 10,
  },
  checkBtn: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#E11D48',
    paddingVertical: 4,
  },
  checkBtnLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    gap: 4,
  },
  resetBtnText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },

  // Result Card
  resultCard: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    borderLeftWidth: 6,
    elevation: 3,
  },
  resultCardContent: {
    padding: 16,
  },
  severityBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
  },
  severityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  severityTextWrap: {
    marginLeft: 10,
    flex: 1,
  },
  severityLabel: {
    fontSize: 13.5,
    fontWeight: 'bold',
  },
  combinationSubtitle: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
    fontWeight: '600',
  },
  speakButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  divider: {
    marginVertical: 12,
  },
  detailSection: {
    marginBottom: 12,
  },
  detailSectionHeading: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
  },
  adviceSection: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#E11D48',
    marginBottom: 12,
  },
  adviceSectionHeading: {
    fontSize: 12.5,
    fontWeight: 'bold',
    color: '#881337',
    marginBottom: 4,
  },
  adviceText: {
    fontSize: 12.5,
    color: '#334155',
    lineHeight: 19,
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
  },
  disclaimerText: {
    fontSize: 11,
    color: '#64748B',
    flex: 1,
    lineHeight: 16,
  },

  // Popular Combinations Section
  examplesCard: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFE4E6',
  },
  examplesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  examplesTitle: {
    fontWeight: 'bold',
    color: '#881337',
    fontSize: 14,
  },
  examplesSubtitle: {
    fontSize: 11.5,
    color: '#9F1239',
    marginBottom: 12,
  },
  examplesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  exampleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    gap: 6,
  },
  exampleChipText: {
    fontSize: 11.5,
    color: '#881337',
    fontWeight: '600',
  },
});

export default MedicineInteractionScreen;
