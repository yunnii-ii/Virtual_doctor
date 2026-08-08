# Backend local run script for Windows (PowerShell)

# Ensure we are in the script's directory
$PSScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $PSScriptRoot

Write-Host "`n--- Object Detector Backend Local Runner ---" -ForegroundColor Cyan

# 1. Create virtual environment if it doesn't exist
if (-not (Test-Path "venv")) {
    Write-Host "[1/3] Creating virtual environment (venv)..." -ForegroundColor Yellow
    python -m venv venv
} else {
    Write-Host "[1/3] Virtual environment (venv) already exists." -ForegroundColor Gray
}

# 2. Install dependencies
Write-Host "[2/3] Installing/Updating dependencies..." -ForegroundColor Yellow
& ".\venv\Scripts\python.exe" -m ensurepip --upgrade
& ".\venv\Scripts\python.exe" -m pip install --upgrade pip
& ".\venv\Scripts\pip.exe" install -r requirements.txt

# 3. Run the server
Write-Host "[3/3] Starting FastAPI server on http://localhost:8001 ..." -ForegroundColor Green
Write-Host "Tip: You can use your computer's IP address (e.g., 192.168.x.x:8001) to connect from your phone." -ForegroundColor White
Write-Host "Press Ctrl+C to stop the server.`n" -ForegroundColor Gray

# Run the app from the backend folder
& ".\venv\Scripts\python.exe" -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
