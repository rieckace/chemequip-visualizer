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

## Quick Demo (2–3 minutes)

1) Start the backend.

2) Web demo:
- Open `http://localhost:5173/`
- Go to **Register** and set API Base URL to `http://127.0.0.1:8000/api`
- Create a user, then log in
- Upload a CSV (use the sample below)
- Check KPIs + Type Distribution chart
- Use **Download PDF** and **Download CSV**
- Verify History rename/delete, and Data Preview pagination

3) Desktop demo:
- Run `python app.py`
- Set API Base URL to `http://127.0.0.1:8000/api`
- Use **Create User** (optional) or log in with existing credentials
- Upload CSV, view chart/table, and download PDF

Note: CSV download is currently available in the Web app (and via the API endpoint); the Desktop app includes PDF download.

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
