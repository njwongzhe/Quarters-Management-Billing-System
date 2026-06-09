# Summary of AI Setup Steps

```txt
Preconditions:
- Python 3.10+ installed.
- Make sure you run the command using PowerShell, as the activation command is for PowerShell.

Steps:
1. Navigate to the ai_service directory:
   cd <project_root>\Application_Development_Project_I\ai_service

2. Create a virtual environment for first time setup:
   python -m venv .venv

3. Activate the virtual environment:
   .\.venv\Scripts\Activate.ps1
   In some cases, "Activate.ps1" may be installed at other directories such as "bin\Activate.ps1". If yes:
   .\.venv\bin\Activate.ps1
   Just make sure to adjust the path to the Activate.ps1 file based on where it is located in your .venv directory.

4. Install dependencies for first time setup:
   nts.tx.\.venv\Scripts\pip install -r requiremet
   Still same as above, if the Scripts directory does not exist, check for "bin" or other directories under .venv where pip is located and adjust the path accordingly:
   .\.venv\bin\pip install -r requirements.txt

5. Run the AI service:
   python -m uvicorn main:app --host 127.0.0.1 --port 8000

To Test The Service is Running:
- Go to "http://127.0.0.1:8000/health".
- It should return a 200 OK response with a JSON body: {"status": "ok"}.

Deactivate the Virtual Environment:
- When you're done, you can deactivate the virtual environment by running "deactivate".
```

<br />

# AI Extraction Service

This project uses a Python virtual environment under:

```txt
.venv\Scripts
```

<br />

## Run From Project Root

```powershell
npm run dev:ai
```

<br />

## Environment

The AI service owns its own environment config in `ai_service/.env`:

```txt
AI_SERVICE_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

For deployment, add the deployed frontend URL to this comma-separated list.

<br />

## Run From ai_service

```powershell
cd D:\AP1\Application_Development_Project_I\ai_service
.\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
```

<br />

## Activate The Venv

```powershell
cd D:\AP1\Application_Development_Project_I\ai_service
.\.venv\Scripts\Activate.ps1
```

Then run:

```powershell
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

<br />

## Test

```powershell
Invoke-WebRequest http://127.0.0.1:8000/health
```

