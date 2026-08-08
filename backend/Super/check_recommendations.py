import json
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open("backend/data/diseases.json", "r", encoding="utf-8") as f:
    en = json.load(f)

with open("backend/data/diseases_mm.json", "r", encoding="utf-8") as f:
    mm = json.load(f)

# Check EN recommendations
empty_en = [d for d in en if not d.get("recommendation") or d["recommendation"].strip() == "" or d["recommendation"] == "nan"]
print(f"=== English Recommendations ===")
print(f"Total: {len(en)}, Empty/nan: {len(empty_en)}")
for d in empty_en:
    print(f"  {d['name']}")

# Check MM recommendations
bad_mm = []
for i, d in enumerate(mm):
    rec = d.get("recommendation", "")
    if not rec or rec == "nan" or len(rec) < 5:
        bad_mm.append((i, "empty"))
    elif rec in ["ဆေးဝါး", "ခွဲစိတ်ကုသခြင်း", "နားနားနေနေနေပါ"]:
        bad_mm.append((i, "too_simple"))
    elif "ဆရာဝန်နှင့် တိုင်ပင်ဆွေးနွေးပြီး" in rec:
        bad_mm.append((i, "generic_fallback"))
    # Check for garbage: mostly commas, periods, parentheses with few real chars
    else:
        cleaned = rec.replace(",", "").replace(".", "").replace("(", "").replace(")", "").replace(" ", "").replace("-", "")
        if len(cleaned) < 8:
            bad_mm.append((i, "garbage"))

print(f"\n=== Myanmar Recommendations ===")
print(f"Total: {len(mm)}, Bad: {len(bad_mm)}")
print(f"\nBreakdown:")
from collections import Counter
counts = Counter(r for _, r in bad_mm)
for reason, count in counts.items():
    print(f"  {reason}: {count}")

print(f"\nSample bad recommendations (index, reason, EN rec):")
for idx, reason in bad_mm[:30]:
    en_name = en[idx]["name"] if idx < len(en) else "?"
    en_rec = en[idx].get("recommendation", "")[:80] if idx < len(en) else ""
    print(f"  [{idx}] {reason} | {en_name} | EN: {en_rec}")
