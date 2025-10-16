
INSERT INTO permissions (id, code, description) VALUES
(gen_random_uuid(), 'STAFF:READ', 'Allows viewing staff member profiles and lists.'),
(gen_random_uuid(), 'STAFF:WRITE', 'Allows creating, updating, and deactivating staff member accounts.');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'ADMIN' AND p.code IN ('STAFF:READ', 'STAFF:WRITE');


CREATE TABLE specialties (
    id UUID PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
COMMENT ON TABLE specialties IS 'Lưu trữ danh sách các chuyên khoa y tế.';

INSERT INTO specialties (id, code, name) VALUES
(gen_random_uuid(), 'CARDIOLOGY', 'Cardiology'),
(gen_random_uuid(), 'DERMATOLOGY', 'Dermatology'), 
(gen_random_uuid(), 'PEDIATRICS', 'Pediatrics'),
(gen_random_uuid(), 'NEUROLOGY', 'Neurology'); 

CREATE TABLE doctor_profiles (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    specialty_id UUID REFERENCES specialties(id) ON DELETE SET NULL,
    license_number VARCHAR(100),
    degree VARCHAR(255),
    experience_years INT,
    bio TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);
COMMENT ON TABLE doctor_profiles IS 'Lưu thông tin hồ sơ chuyên môn của các bác sĩ.';


CREATE TABLE receptionist_profiles (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    employee_id VARCHAR(100) UNIQUE, 

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);
COMMENT ON TABLE receptionist_profiles IS 'Lưu thông tin hồ sơ của các nhân viên lễ tân.';
