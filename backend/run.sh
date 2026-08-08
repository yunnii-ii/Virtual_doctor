#!/bin/bash

# Ensure we are in the script's directory
cd "$(dirname "$0")"

echo -e "\n\e[36m--- Object Detector Backend Local Runner ---\e[0m"

# 1. Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    echo -e "\e[33m[1/3] Creating virtual environment (.venv)...\e[0m"
    python3 -m venv .venv
else
    echo -e "\e[90m[1/3] Virtual environment (.venv) already exists.\e[0m"
fi

# 2. Install dependencies
echo -e "\e[33m[2/3] Installing/Updating dependencies...\e[0m"
./.venv/bin/python3 -m ensurepip --upgrade
./.venv/bin/python3 -m pip install --upgrade pip
./.venv/bin/pip install -r requirements.txt

# 3. Run the server
echo -e "\e[32m[3/3] Starting FastAPI server on http://localhost:8001 ...\e[0m"
echo "Tip: You can use your computer's IP address (e.g., 192.168.x.x:8001) to connect from your phone."
echo -e "\e[90mPress Ctrl+C to stop the server.\n\e[0m"

# Run the app from the backend folder
./.venv/bin/python3 -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload