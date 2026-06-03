-- V16__Create_Prescription_Schema.sql
-- Create prescription module and prepare safety alert table for future AI CDS.

CREATE TABLE prescriptions (
    id UUID PRIMARY KEY,

    medical_record_id UUID NOT NULL REFERENCES medical_records(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    patient_id UUID NOT NULL REFERENCES users(id),
    doctor_id UUID NOT NULL REFERENCES users(id),

    status VARCHAR(50) NOT NULL,
    note TEXT,
    finalized_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,
    deleted_at TIMESTAMPTZ,

    CONSTRAINT uq_prescription_medical_record UNIQUE (medical_record_id)
);

COMMENT ON TABLE prescriptions IS 'Lưu đơn thuốc gắn với một bệnh án.';
COMMENT ON COLUMN prescriptions.medical_record_id IS 'Mỗi bệnh án MVP có tối đa một đơn thuốc.';

CREATE TABLE prescription_items (
    id UUID PRIMARY KEY,

    prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    medication_id UUID REFERENCES medications(id) ON DELETE SET NULL,

    medication_name VARCHAR(255) NOT NULL,
    active_ingredient VARCHAR(255),
    atc_code VARCHAR(20),
    unit VARCHAR(50),

    dosage VARCHAR(100),
    frequency VARCHAR(100),
    duration VARCHAR(100),
    quantity NUMERIC(10,2),
    instruction TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE prescription_items IS 'Lưu từng thuốc trong đơn thuốc.';

CREATE TABLE prescription_safety_alerts (
    id UUID PRIMARY KEY,

    prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,

    type VARCHAR(100) NOT NULL,
    severity VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    message TEXT,
    recommendation TEXT,

    ai_payload JSONB,
    doctor_action VARCHAR(100),
    doctor_note TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE prescription_safety_alerts IS 'Lưu cảnh báo an toàn kê đơn, dùng cho AI CDS ở phase sau.';

CREATE INDEX idx_prescriptions_medical_record_id
ON prescriptions(medical_record_id);

CREATE INDEX idx_prescriptions_patient_id
ON prescriptions(patient_id);

CREATE INDEX idx_prescriptions_doctor_id
ON prescriptions(doctor_id);

CREATE INDEX idx_prescription_items_prescription_id
ON prescription_items(prescription_id);

CREATE INDEX idx_prescription_safety_alerts_prescription_id
ON prescription_safety_alerts(prescription_id);

INSERT INTO permissions (id, code, description) VALUES
(gen_random_uuid(), 'PRESCRIPTION:READ_OWN', 'Allows a patient to view their own prescriptions.'),
(gen_random_uuid(), 'PRESCRIPTION:READ_ANY', 'Allows staff to view prescriptions.'),
(gen_random_uuid(), 'PRESCRIPTION:WRITE', 'Allows doctors/admins to create and update prescriptions.')
ON CONFLICT (code) DO NOTHING;

-- Patient can read own prescriptions.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON TRUE
WHERE r.code = 'PATIENT'
  AND p.code IN ('PRESCRIPTION:READ_OWN')
ON CONFLICT DO NOTHING;

-- Doctor can read/write prescriptions.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON TRUE
WHERE r.code = 'DOCTOR'
  AND p.code IN ('PRESCRIPTION:READ_ANY', 'PRESCRIPTION:WRITE')
ON CONFLICT DO NOTHING;

-- Receptionist can read prescriptions for printing/support, but cannot modify.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON TRUE
WHERE r.code = 'RECEPTIONIST'
  AND p.code IN ('PRESCRIPTION:READ_ANY')
ON CONFLICT DO NOTHING;

-- Admin receives all permissions.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON TRUE
WHERE r.code = 'ADMIN'
ON CONFLICT DO NOTHING;