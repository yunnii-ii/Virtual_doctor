import requests
import json
import os
from bs4 import BeautifulSoup

DATA_DIR = "data"
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

def fetch_myanmar_medicines():
    url = "https://tajgenerics.com/countries/myanmar/"
    print(f"Fetching medicine data from {url}...")
    
    try:
        response = requests.get(url, timeout=15)
        if response.status_code != 200:
            print("Failed to reach site.")
            return False
            
        soup = BeautifulSoup(response.content, 'html.parser')
        table = soup.find('table')
        if not table:
            print("No data table found.")
            return False
            
        medicines = []
        rows = table.find_all('tr')
        for row in rows[1:]: # Skip header
            cols = row.find_all('td')
            if len(cols) >= 2:
                generic_name = cols[0].text.strip()
                brand_name = cols[1].text.strip()
                strength = cols[2].text.strip() if len(cols) > 2 else ""
                category = cols[4].text.strip() if len(cols) > 4 else "General"
                
                medicines.append({
                    "name": f"{brand_name} ({generic_name})",
                    "description": f"{brand_name} is a {category.lower()} medication containing {generic_name} ({strength}).",
                    "uses": [f"Treatment related to {category.lower()} conditions."],
                    "dosage": strength,
                    "side_effects": ["Consult a pharmacist for side effects."],
                    "precautions": "Take as directed by your physician."
                })
        
        # Save to JSON
        output_path = os.path.join(DATA_DIR, "medicines.json")
        
        # Merge with existing
        if os.path.exists(output_path):
            with open(output_path, 'r', encoding='utf-8') as f:
                existing = json.load(f)
                medicines.extend(existing)
        
        # Remove duplicates based on name
        unique_medicines = {m['name']: m for m in medicines}.values()
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(list(unique_medicines), f, ensure_ascii=False, indent=2)
            
        print(f"Successfully updated medicines.json with {len(unique_medicines)} entries.")
        return True
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    fetch_myanmar_medicines()
