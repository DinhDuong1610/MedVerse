

CREATE TABLE medical_records (
    id UUID PRIMARY KEY,

    appointment_id UUID UNIQUE REFERENCES appointments(id) ON DELETE SET NULL,
    patient_id UUID NOT NULL REFERENCES users(id),
    doctor_id UUID NOT NULL REFERENCES users(id),

    chief_complaint TEXT,
    symptoms TEXT,
    clinical_note TEXT,
    diagnosis_text TEXT,
    treatment_plan TEXT,
    follow_up_note TEXT,

    status VARCHAR(50) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE medical_records IS 'Lưu bệnh án điện tử của bệnh nhân.';
COMMENT ON COLUMN medical_records.appointment_id IS 'Lịch hẹn liên quan đến lần khám.';

CREATE TABLE medical_record_diagnoses (
    id UUID PRIMARY KEY,

    medical_record_id UUID NOT NULL REFERENCES medical_records(id) ON DELETE CASCADE,

    diagnosis_text TEXT NOT NULL,
    icd_code VARCHAR(50),
    icd_display VARCHAR(255),
    coding_system VARCHAR(50),

    source VARCHAR(50) NOT NULL,
    confidence NUMERIC(5,4),
    accepted_by_doctor BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE medical_record_diagnoses IS 'Lưu chẩn đoán của bệnh án, có thể nhập tay hoặc gợi ý bởi AI.';

CREATE INDEX idx_medical_records_patient_id
ON medical_records(patient_id);

CREATE INDEX idx_medical_records_doctor_id
ON medical_records(doctor_id);

CREATE INDEX idx_medical_records_appointment_id
ON medical_records(appointment_id);

CREATE INDEX idx_medical_record_diagnoses_record_id
ON medical_record_diagnoses(medical_record_id);

-- Ensure EHR permissions exist.
INSERT INTO permissions (id, code, description) VALUES
(gen_random_uuid(), 'EHR:READ_OWN', 'Allows a patient to view their own electronic health records.'),
(gen_random_uuid(), 'EHR:READ_ANY', 'Allows staff to view electronic health records.'),
(gen_random_uuid(), 'EHR:WRITE', 'Allows doctors/admins to create or update electronic health records.')
ON CONFLICT (code) DO NOTHING;

-- Patient can read own medical records.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON TRUE
WHERE r.code = 'PATIENT'
  AND p.code IN ('EHR:READ_OWN')
ON CONFLICT DO NOTHING;

-- Doctor can read/write EHR.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON TRUE
WHERE r.code = 'DOCTOR'
  AND p.code IN ('EHR:READ_ANY', 'EHR:WRITE')
ON CONFLICT DO NOTHING;

-- Receptionist can read EHR summary/list only if needed.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON TRUE
WHERE r.code = 'RECEPTIONIST'
  AND p.code IN ('EHR:READ_ANY')
ON CONFLICT DO NOTHING;

-- Admin receives all permissions.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON TRUE
WHERE r.code = 'ADMIN'
ON CONFLICT DO NOTHING;