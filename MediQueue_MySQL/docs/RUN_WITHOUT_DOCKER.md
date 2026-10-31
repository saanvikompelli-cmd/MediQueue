# Run MediQueue on Windows (MySQL + Python + React)

No Docker, PostgreSQL or MongoDB is needed. Use your existing MySQL Server, MySQL Workbench, Python, Node.js and VS Code.

## Important: database setup is already done
This project is configured for the database and tables you already created in Workbench:
- `mediqueue`
- `patients`
- `doctors`
- `appointments`

You do not need to run INSERT/JOIN/VIEW/TRIGGER scripts manually. The Python API reads and writes records. On first startup it adds the optional `email` and `reason` columns if missing and creates `activity_logs` automatically.

## 1. Start the Python backend
Open a VS Code terminal in the `MediQueue_MySQL` folder:

```powershell
cd backend
py -m venv .venv
.venv\Scripts\Activate.ps1
py -m pip install -r requirements.txt
$env:DATABASE_URL="mysql+pymysql://root:YOUR_PASSWORD@localhost:3306/mediqueue"
py -m uvicorn app.main:app --reload
```

Replace `YOUR_PASSWORD` with your MySQL root password. If your MySQL account has no password, use `mysql+pymysql://root:@localhost:3306/mediqueue`.

Backend: http://localhost:8000
API test page: http://localhost:8000/docs

## 2. Start the React frontend
Open a SECOND VS Code terminal in the project folder:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL Vite displays (normally http://localhost:5173).

## 3. Expo demo flow
1. Existing doctors and patients appear from your MySQL database.
2. Register a new patient.
3. Book an appointment; Python assigns the next token number for that doctor and date.
4. Open Live Queue and click Call Patient.
5. Click Complete after consultation.
6. Show MySQL Workbench to demonstrate the records persisted in the database.

## Troubleshooting
- `Access denied`: check the MySQL username/password in `DATABASE_URL`.
- `Unknown database mediqueue`: create the database named `mediqueue` in Workbench.
- `Table doesn't exist`: confirm `patients`, `doctors`, and `appointments` exist under the `mediqueue` schema.
- Frontend says it cannot connect: keep the backend terminal running at port 8000.

This is an educational prototype. Use fictional patient details only.
