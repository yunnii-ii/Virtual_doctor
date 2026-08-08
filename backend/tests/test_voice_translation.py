from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[1]))
import main


def test_burmese_to_english_translation():
    assert main.translate_incoming_symptoms(["ခေါင်းကိုက်နေတယ်"])[0] == "headache"
    assert main.translate_incoming_symptoms(["ဖျားနေတယ်"])[0] == "fever"
    assert main.translate_incoming_symptoms(["Konkai miri!"])[0] == "headache"
    assert main.translate_incoming_symptoms(["chaung soe"])[0] == "cough"
