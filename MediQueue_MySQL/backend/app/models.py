from datetime import datetime, date
from sqlalchemy import String, Integer, ForeignKey, Date, DateTime, Text, Boolean, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base

class Patient(Base):
    __tablename__ = "patients"
    patient_id: Mapped[int] = mapped_column(primary_key=True, index=True)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    phone: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    appointments = relationship("Appointment", back_populates="patient")

class Department(Base):
    __tablename__ = "departments"
    department_id: Mapped[int] = mapped_column(primary_key=True)
    department_name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    doctors = relationship("Doctor", back_populates="department")

class Doctor(Base):
    __tablename__ = "doctors"
    doctor_id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    specialization: Mapped[str] = mapped_column(String(100), nullable=False)
    available: Mapped[bool] = mapped_column(Boolean, default=True)
    department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.department_id"))
    department = relationship("Department", back_populates="doctors")
    appointments = relationship("Appointment", back_populates="doctor")

class Appointment(Base):
    __tablename__ = "appointments"
    appointment_id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.patient_id"), nullable=False)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.doctor_id"), nullable=False)
    appointment_date: Mapped[date] = mapped_column(Date, nullable=False)
    reason: Mapped[str] = mapped_column(String(250), default="General consultation")
    status: Mapped[str] = mapped_column(String(20), default="BOOKED")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    patient = relationship("Patient", back_populates="appointments")
    doctor = relationship("Doctor", back_populates="appointments")
    token = relationship("Token", back_populates="appointment", uselist=False)

class Token(Base):
    __tablename__ = "tokens"
    __table_args__ = (UniqueConstraint("doctor_id", "appointment_date", "token_number", name="uq_doctor_day_token"),)
    token_id: Mapped[int] = mapped_column(primary_key=True)
    appointment_id: Mapped[int] = mapped_column(ForeignKey("appointments.appointment_id"), unique=True, nullable=False)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.doctor_id"), nullable=False)
    appointment_date: Mapped[date] = mapped_column(Date, nullable=False)
    token_number: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="WAITING")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    appointment = relationship("Appointment", back_populates="token")

class QueueHistory(Base):
    __tablename__ = "queue_history"
    history_id: Mapped[int] = mapped_column(primary_key=True)
    token_id: Mapped[int] = mapped_column(ForeignKey("tokens.token_id"), nullable=False)
    action: Mapped[str] = mapped_column(String(40), nullable=False)
    note: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
