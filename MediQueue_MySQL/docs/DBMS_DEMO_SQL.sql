-- MediQueue DBMS demonstration queries (MySQL 8+)

-- 1. Patients with their appointments and doctor details (INNER JOIN)
SELECT p.patient_id, p.full_name AS patient, d.full_name AS doctor,
       a.appointment_date, a.status
FROM patients p
INNER JOIN appointments a ON a.patient_id = p.patient_id
INNER JOIN doctors d ON d.doctor_id = a.doctor_id
ORDER BY a.appointment_date DESC;

-- 2. Count appointments per doctor (GROUP BY + aggregate)
SELECT d.full_name, COUNT(a.appointment_id) AS appointment_count
FROM doctors d
LEFT JOIN appointments a ON a.doctor_id = d.doctor_id
GROUP BY d.doctor_id, d.full_name
ORDER BY appointment_count DESC;

-- 3. Queue position using a window function
SELECT doctor_id, token_number, status,
       ROW_NUMBER() OVER (PARTITION BY doctor_id, appointment_date ORDER BY token_number) AS queue_position
FROM tokens
WHERE status = 'WAITING';

-- 4. Common Table Expression (CTE): doctors with more than zero appointments
WITH doctor_load AS (
    SELECT doctor_id, COUNT(*) AS total_appointments
    FROM appointments
    GROUP BY doctor_id
)
SELECT d.full_name, dl.total_appointments
FROM doctors d
JOIN doctor_load dl ON dl.doctor_id = d.doctor_id
WHERE dl.total_appointments > 0;

-- 5. Index for frequently filtered queue rows
CREATE INDEX idx_tokens_doctor_date_status
ON tokens(doctor_id, appointment_date, status);

-- 6. View for appointment reporting
CREATE OR REPLACE VIEW appointment_details AS
SELECT a.appointment_id, p.full_name AS patient_name,
       d.full_name AS doctor_name, a.appointment_date,
       a.status, t.token_number, t.status AS token_status
FROM appointments a
JOIN patients p ON p.patient_id = a.patient_id
JOIN doctors d ON d.doctor_id = a.doctor_id
LEFT JOIN tokens t ON t.appointment_id = a.appointment_id;

-- 7. Transaction concept (illustrative SQL)
BEGIN;
-- Insert appointment first, then its token referencing the appointment.
-- COMMIT only when both operations succeed; otherwise ROLLBACK.
COMMIT;
