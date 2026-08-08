import sqlite3

# All columns that should exist in the users table (beyond the base ones)
REQUIRED_COLUMNS = [
    ("profile_pic", "TEXT"),
    ("phone", "TEXT"),
    ("address", "TEXT"),
    ("height", "VARCHAR"),
    ("weight", "VARCHAR"),
    ("blood_pressure", "VARCHAR"),
    ("emergency_contact", "VARCHAR"),
]

def migrate():
    conn = sqlite3.connect('virtual_doctor.db')
    cursor = conn.cursor()

    # Get existing columns
    cursor.execute("PRAGMA table_info(users)")
    existing = {row[1] for row in cursor.fetchall()}

    for col_name, col_type in REQUIRED_COLUMNS:
        if col_name not in existing:
            cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}")
            print(f"[migrate] Added column: {col_name} ({col_type})")
        else:
            print(f"[migrate] Column already exists: {col_name}")

    conn.commit()
    conn.close()
    print("[migrate] Migration complete.")

if __name__ == "__main__":
    migrate()
