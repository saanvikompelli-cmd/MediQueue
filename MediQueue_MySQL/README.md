# MediQueue — Smart Hospital Queue Management

A college expo prototype using **React frontend + Python FastAPI backend + MySQL database**.

## Your setup
This updated package is adapted to the `mediqueue` database and the three tables already created in MySQL Workbench: `patients`, `doctors`, and `appointments`. You do not need to manually insert sample rows or run extra SQL queries. Existing records are read from MySQL, and new records are saved by the backend.

## Run it
Follow `docs/RUN_WITHOUT_DOCKER.md`. Start the Python backend in one VS Code terminal and the React frontend in a second terminal. You need your existing MySQL Server, Python and Node.js.

## Features
- Patient directory and registration
- Doctor directory
- Appointment booking
- Automatic doctor/date-specific token generation
- Live waiting and in-consultation queue
- Call patient and complete consultation
- Queue activity history and dashboard statistics
- REST API documentation at `/docs`

The backend automatically adds optional `email` and `reason` columns if your current tables do not have them, and creates an `activity_logs` table for the dashboard history. It does not erase existing records.

Educational prototype only; use fictional patient details.
