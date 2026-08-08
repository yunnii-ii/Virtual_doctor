# c:\VirtualDoctor\backend\data_processor.py
import json
import pandas as pd

def csv_to_json(csv_file, json_file, data_type):
    df = pd.read_csv(csv_file)
    data = []
    
    for _, row in df.iterrows():
        if data_type == 'disease':
            item = {
                "name": row['name'],
                "symptoms": row['symptoms'].split(','),
                "description": row['description'],
                "precautions": row['precautions'].split('|'),
                "recommendation": row['recommendation'],
                "medications": row['medications'].split(',')
            }
        # အခြား data type များအတွက်လည်း ဤနေရာတွင် logic ထည့်နိုင်သည်
        data.append(item)
        
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

print("Data processing complete!")