# Chemical Equipment Parameter Visualizer (Hybrid Web + Desktop)

Hybrid application for uploading a CSV of chemical equipment and viewing analytics as:
- **Web app** (React + Chart.js)
- **Desktop app** (PyQt5 + Matplotlib)

Both clients use the same **Django REST API**.

## Prerequisites (Windows)
- Python 3.11+ (recommended)
- Node.js 18+ (for web)

## Run the project (Windows)

### 1) Backend (Django API)
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Backend will run on `http://127.0.0.1:8000/`.

If PowerShell blocks venv activation, run (once):
```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

### 2) Web (React)
```powershell
cd web
npm install
npm run dev
```

Web will run on `http://localhost:5173/`.

### 3) Desktop (PyQt5)
```powershell
cd desktop
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python app.py
```

## Backend API (DRF)
- `GET /api/health/` (no auth)
- `POST /api/auth/register/` (no auth) → create a user (used by web/desktop UI)
- `GET /api/datasets/` (basic auth) → latest 5 uploads
- `POST /api/datasets/` (basic auth, multipart `file`) → upload CSV + returns summary
- `GET /api/datasets/<id>/data/?limit=200&offset=0` (basic auth) → table preview
- `GET /api/datasets/<id>/csv/` (basic auth) → download the original CSV
- `GET /api/datasets/<id>/report/` (basic auth) → PDF report

Note: `createsuperuser` is optional; you can create normal users from the Web/Desktop app.

## Sample CSV
Use [data/sample_equipment_data.csv](data/sample_equipment_data.csv) for quick testing.

## Features
- Upload CSV from Web and Desktop
- Summary stats (count + averages) + type distribution
- Data preview table
- History of last 5 uploads (stored in SQLite)
- Downloadable PDF report
- Basic authentication
