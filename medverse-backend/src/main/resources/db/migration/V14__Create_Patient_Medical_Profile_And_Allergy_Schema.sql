-- V14__Create_Patient_Medical_Profile_And_Allergy_Schema.sql
-- Add patient medical profile and allergy management.

CREATE TABLE patient_medical_profiles (
    id UUID PRIMARY KEY,
    patient_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

    blood_type VARCHAR(10),
    height_cm NUMERIC(5,2),
    weight_kg NUMERIC(5,2),
    chronic_diseases TEXT,
    medical_history TEXT,
    current_medications_note TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE patient_medical_profiles IS 'Lưu hồ sơ y tế nền của bệnh nhân.';
COMMENT ON COLUMN patient_medical_profiles.patient_id IS 'Tham chiếu tới users.id của bệnh nhân.';

CREATE TABLE allergies (
    id UUID PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    allergen VARCHAR(255) NOT NULL,
    reaction VARCHAR(255),
    severity VARCHAR(50),
    note TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE allergies IS 'Lưu thông tin dị ứng của bệnh nhân.';

CREATE INDEX idx_patient_medical_profiles_patient_id
ON patient_medical_profiles(patient_id);

CREATE INDEX idx_allergies_patient_id
ON allergies(patient_id);

INSERT INTO permissions (id, code, description) VALUES
(gen_random_uuid(), 'PATIENT_MEDICAL_PROFILE:READ_OWN', 'Allows a patient to read their own medical profile.'),
(gen_random_uuid(), 'PATIENT_MEDICAL_PROFILE:WRITE_OWN', 'Allows a patient to update their own medical profile.'),
(gen_random_uuid(), 'PATIENT_MEDICAL_PROFILE:READ_ANY', 'Allows staff to read any patient medical profile.'),
(gen_random_uuid(), 'PATIENT_MEDICAL_PROFILE:WRITE_ANY', 'Allows staff to update any patient medical profile.'),
(gen_random_uuid(), 'ALLERGY:READ_OWN', 'Allows a patient to read their own allergies.'),
(gen_random_uuid(), 'ALLERGY:WRITE_OWN', 'Allows a patient to manage their own allergies.'),
(gen_random_uuid(), 'ALLERGY:READ_ANY', 'Allows staff to read any patient allergies.'),
(gen_random_uuid(), 'ALLERGY:WRITE_ANY', 'Allows staff to manage any patient allergies.')
ON CONFLICT (code) DO NOTHING;

-- Patient can manage their own medical profile and allergies.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON TRUE
WHERE r.code = 'PATIENT'
  AND p.code IN (
      'PATIENT_MEDICAL_PROFILE:READ_OWN',
      'PATIENT_MEDICAL_PROFILE:WRITE_OWN',
      'ALLERGY:READ_OWN',
      'ALLERGY:WRITE_OWN'
  )
ON CONFLICT DO NOTHING;

-- Doctor can read/update patient medical information for clinical use.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON TRUE
WHERE r.code = 'DOCTOR'
  AND p.code IN (
      'PATIENT_MEDICAL_PROFILE:READ_ANY',
      'PATIENT_MEDICAL_PROFILE:WRITE_ANY',
      'ALLERGY:READ_ANY',
      'ALLERGY:WRITE_ANY'
  )
ON CONFLICT DO NOTHING;

-- Receptionist can read basic medical profile/allergy if needed for appointment support, but cannot update.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON TRUE
WHERE r.code = 'RECEPTIONIST'
  AND p.code IN (
      'PATIENT_MEDICAL_PROFILE:READ_ANY',
      'ALLERGY:READ_ANY'
  )
ON CONFLICT DO NOTHING;

-- Admin receives all permissions.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON TRUE
WHERE r.code = 'ADMIN'
ON CONFLICT DO NOTHING;