from datetime import date
from pydantic import BaseModel, Field, EmailStr, ConfigDict

class PatientCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    age: int = Field(ge=0, le=120)
    phone: str = Field(pattern=r"^[6-9][0-9]{9}$")
    email: str = Field(min_length=5, max_length=150)

class PatientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    patient_id: int
    full_name: str
    age: int
    phone: str
    email: str

class AppointmentCreate(BaseModel):
    patient_id: int
    doctor_id: int
    appointment_date: date
    reason: str = Field(default="General consultation", max_length=250)

class DoctorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    doctor_id: int
    full_name: str
    specialization: str
    available: bool

