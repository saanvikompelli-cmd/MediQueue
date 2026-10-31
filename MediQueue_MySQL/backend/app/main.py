from datetime import date, datetime
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from .database import engine, SessionLocal, get_db

app = FastAPI(title='MediQueue API', version='2.0.0', description='MediQueue hospital appointment and queue management')
app.add_middleware(CORSMiddleware, allow_origins=['http://localhost:5173','http://127.0.0.1:5173','http://localhost:5174','http://127.0.0.1:5174'], allow_credentials=True, allow_methods=['*'], allow_headers=['*'])


def setup_compatibility():
    dialect = engine.dialect.name
    with engine.begin() as c:
        if dialect == 'sqlite':
            c.execute(text('''CREATE TABLE IF NOT EXISTS patients (
                patient_id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT NOT NULL,
                age INTEGER NOT NULL,
                gender TEXT,
                phone TEXT NOT NULL UNIQUE,
                email TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )'''))
            c.execute(text('''CREATE TABLE IF NOT EXISTS doctors (
                doctor_id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT NOT NULL,
                specialization TEXT NOT NULL,
                available INTEGER NOT NULL DEFAULT 1
            )'''))
            c.execute(text('''CREATE TABLE IF NOT EXISTS appointments (
                appointment_id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id INTEGER NOT NULL,
                doctor_id INTEGER NOT NULL,
                appointment_date TEXT NOT NULL,
                appointment_time TEXT,
                token_number INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'Waiting',
                reason TEXT NOT NULL DEFAULT 'General consultation',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )'''))
            c.execute(text('''CREATE TABLE IF NOT EXISTS activity_logs (
                log_id INTEGER PRIMARY KEY AUTOINCREMENT,
                appointment_id INTEGER,
                action_description TEXT NOT NULL,
                action_time TEXT DEFAULT CURRENT_TIMESTAMP
            )'''))
            cols = {row[1] for row in c.execute(text('PRAGMA table_info(patients)')).fetchall()}
            if 'email' not in cols:
                c.execute(text('ALTER TABLE patients ADD COLUMN email TEXT'))
            cols = {row[1] for row in c.execute(text('PRAGMA table_info(appointments)')).fetchall()}
            if 'reason' not in cols:
                c.execute(text("ALTER TABLE appointments ADD COLUMN reason TEXT NOT NULL DEFAULT 'General consultation'"))
            if 'appointment_time' not in cols:
                c.execute(text("ALTER TABLE appointments ADD COLUMN appointment_time TEXT"))
        else:
            cols = {r[0] for r in c.execute(text('SHOW COLUMNS FROM patients'))}
            if 'email' not in cols:
                c.execute(text('ALTER TABLE patients ADD COLUMN email VARCHAR(150) NULL'))
            cols = {r[0] for r in c.execute(text('SHOW COLUMNS FROM appointments'))}
            if 'reason' not in cols:
                c.execute(text("ALTER TABLE appointments ADD COLUMN reason VARCHAR(250) NOT NULL DEFAULT 'General consultation'"))
            c.execute(text('''CREATE TABLE IF NOT EXISTS activity_logs (
                log_id INT AUTO_INCREMENT PRIMARY KEY,
                appointment_id INT NULL,
                action_description VARCHAR(255) NOT NULL,
                action_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )'''))


@app.on_event('startup')
def startup_event():
    setup_compatibility()


@app.get('/')
def root(): return {'message':'MediQueue API is running','database':engine.dialect.name,'docs':'/docs'}
@app.get('/api/health')
def health(): return {'status':'ok','database':engine.dialect.name}


@app.get('/api/patients')
def patients(db: Session=Depends(get_db)):
    return db.execute(text('SELECT patient_id, full_name, age, phone, email, gender FROM patients ORDER BY patient_id DESC')).mappings().all()


@app.post('/api/patients')
def add_patient(data: dict, db: Session=Depends(get_db)):
    name=str(data.get('full_name','')).strip(); phone=str(data.get('phone','')).strip(); email=str(data.get('email','')).strip(); age=int(data.get('age') or 0)
    if len(name)<2 or not phone or not email or age<0 or age>120: raise HTTPException(400,'Enter valid name, age, phone and email.')
    exists=db.execute(text('SELECT patient_id FROM patients WHERE phone=:p OR email=:e LIMIT 1'),{'p':phone,'e':email}).first()
    if exists: raise HTTPException(409,'A patient with this phone or email already exists.')
    result=db.execute(text('INSERT INTO patients(full_name,age,gender,phone,email) VALUES(:n,:a,:g,:p,:e)'),{'n':name,'a':age,'g':data.get('gender'),'p':phone,'e':email})
    db.commit(); row=db.execute(text('SELECT patient_id,full_name,age,phone,email FROM patients WHERE patient_id=:id'),{'id':result.lastrowid}).mappings().one()
    return row


@app.get('/api/doctors')
def doctors(db: Session=Depends(get_db)):
    return db.execute(text('SELECT doctor_id,full_name,specialization,available FROM doctors ORDER BY doctor_id')).mappings().all()


@app.post('/api/demo/seed')
def seed(db: Session=Depends(get_db)):
    if db.execute(text('SELECT COUNT(*) FROM doctors')).scalar()==0:
        db.execute(text("INSERT INTO doctors(full_name,specialization,available) VALUES ('Dr. Ananya Rao','General Physician',1),('Dr. Rahul Mehta','Cardiologist',1),('Dr. Priya Sharma','Dermatologist',1)")); db.commit()
    return {'message':'Doctors ready','doctors':db.execute(text('SELECT COUNT(*) FROM doctors')).scalar()}


@app.post('/api/appointments')
def book(data: dict, db: Session=Depends(get_db)):
    pid=int(data.get('patient_id') or 0); did=int(data.get('doctor_id') or 0); appt_date=str(data.get('appointment_date') or date.today()); reason=str(data.get('reason') or 'General consultation')
    if not db.execute(text('SELECT patient_id FROM patients WHERE patient_id=:id'),{'id':pid}).first(): raise HTTPException(404,'Patient not found. Register the patient first.')
    doctor=db.execute(text('SELECT doctor_id,full_name FROM doctors WHERE doctor_id=:id AND available=1'),{'id':did}).mappings().first()
    if not doctor: raise HTTPException(400,'Selected doctor is unavailable.')
    try:
        last=db.execute(text('SELECT COALESCE(MAX(token_number),0) FROM appointments WHERE doctor_id=:d AND appointment_date=:dt'),{'d':did,'dt':appt_date}).scalar()
        token=int(last or 0)+1
        result=db.execute(text("INSERT INTO appointments(patient_id,doctor_id,appointment_date,appointment_time,token_number,status,reason) VALUES(:p,:d,:dt,:tm,:tk,'Waiting',:r)"),{'p':pid,'d':did,'dt':appt_date,'tm':datetime.now().strftime('%H:%M:%S'),'tk':token,'r':reason})
        db.execute(text("INSERT INTO activity_logs(appointment_id,action_description) VALUES(:id,'New appointment booked')"),{'id':result.lastrowid}); db.commit()
        patient=db.execute(text('SELECT full_name FROM patients WHERE patient_id=:id'),{'id':pid}).scalar()
        return {'message':'Appointment booked successfully','appointment_id':result.lastrowid,'patient_name':patient,'doctor_name':doctor['full_name'],'appointment_date':appt_date,'token_number':token,'token_id':result.lastrowid,'status':'WAITING'}
    except Exception:
        db.rollback(); raise


@app.get('/api/queue')
def queue(doctor_id: int|None=None, db: Session=Depends(get_db)):
    sql="""SELECT a.appointment_id AS token_id,a.token_number,
      CASE a.status WHEN 'Waiting' THEN 'WAITING' WHEN 'In Consultation' THEN 'SERVING' ELSE UPPER(a.status) END AS status,
      p.full_name AS patient_name,d.full_name AS doctor_name,d.doctor_id,
      a.appointment_date,a.reason FROM appointments a JOIN patients p ON p.patient_id=a.patient_id
      JOIN doctors d ON d.doctor_id=a.doctor_id WHERE a.status IN ('Booked','Waiting','In Consultation')"""
    params={}
    if doctor_id: sql+=' AND d.doctor_id=:did'; params['did']=doctor_id
    sql+=' ORDER BY a.appointment_date,a.doctor_id,a.token_number'
    return db.execute(text(sql),params).mappings().all()


@app.post('/api/queue/{token_id}/call')
def call(token_id:int,db:Session=Depends(get_db)):
    r=db.execute(text("UPDATE appointments SET status='In Consultation' WHERE appointment_id=:id AND status IN ('Booked','Waiting')"),{'id':token_id})
    if not r.rowcount: raise HTTPException(404,'Waiting token not found.')
    db.execute(text("INSERT INTO activity_logs(appointment_id,action_description) VALUES(:id,'Patient called for consultation')"),{'id':token_id}); db.commit(); return {'status':'SERVING'}


@app.post('/api/queue/{token_id}/complete')
def complete(token_id:int,db:Session=Depends(get_db)):
    r=db.execute(text("UPDATE appointments SET status='Completed' WHERE appointment_id=:id AND status='In Consultation'"),{'id':token_id})
    if not r.rowcount: raise HTTPException(404,'Active consultation not found.')
    db.execute(text("INSERT INTO activity_logs(appointment_id,action_description) VALUES(:id,'Consultation completed')"),{'id':token_id}); db.commit(); return {'status':'COMPLETED'}


@app.get('/api/history')
def history(db:Session=Depends(get_db)):
    return db.execute(text("SELECT l.log_id AS history_id,l.action_description AS action,l.action_time AS created_at,p.full_name AS patient_name,d.full_name AS doctor_name,a.token_number FROM activity_logs l LEFT JOIN appointments a ON a.appointment_id=l.appointment_id LEFT JOIN patients p ON p.patient_id=a.patient_id LEFT JOIN doctors d ON d.doctor_id=a.doctor_id ORDER BY l.action_time DESC LIMIT 100")).mappings().all()


@app.get('/api/stats')
def stats(db:Session=Depends(get_db)):
    return {'patients':db.execute(text('SELECT COUNT(*) FROM patients')).scalar(),'doctors':db.execute(text('SELECT COUNT(*) FROM doctors')).scalar(),'appointments':db.execute(text('SELECT COUNT(*) FROM appointments')).scalar(),'waiting':db.execute(text("SELECT COUNT(*) FROM appointments WHERE status IN ('Booked','Waiting')")).scalar(),'completed':db.execute(text("SELECT COUNT(*) FROM appointments WHERE status='Completed'")).scalar()}
