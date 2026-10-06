@echo off
rem Starts MediQ on Windows: installs what it needs, then runs it.
cd /d "%~dp0"

python --version >nul 2>&1
if errorlevel 1 (
  echo Python is not installed. Get it from https://www.python.org/downloads/
  echo and tick "Add python.exe to PATH" during setup. Then run this file again.
  pause
  exit /b 1
)

echo Checking the required Python packages...
python -m pip install --quiet --disable-pip-version-check -r requirements.txt
if errorlevel 1 (
  echo.
  echo The packages could not be installed. Check the internet connection and try again.
  pause
  exit /b 1
)

echo.
python app.py
pause
