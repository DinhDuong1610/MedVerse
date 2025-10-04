CREATE TABLE permissions (
    id UUID PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE, 
    description VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,
    deleted_at TIMESTAMPTZ 
);

CREATE TABLE role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

INSERT INTO permissions (id, code, description) VALUES
(gen_random_uuid(), 'USER_PROFILE:READ_OWN', 'Allows a user to read their own profile.'),
(gen_random_uuid(), 'USER_PROFILE:WRITE_OWN', 'Allows a user to update their own profile.'),
(gen_random_uuid(), 'APPOINTMENT:READ_OWN', 'Allows a patient to view their own appointments.'),
(gen_random_uuid(), 'APPOINTMENT:WRITE_OWN', 'Allows a patient to request or cancel their own appointments.'),
(gen_random_uuid(), 'APPOINTMENT:READ_ANY', 'Allows staff to view all appointments.'),
(gen_random_uuid(), 'APPOINTMENT:WRITE_ANY', 'Allows staff to create, update, or cancel any appointment.'),
(gen_random_uuid(), 'EHR:READ_OWN', 'Allows a patient to view their own electronic health records.'),
(gen_random_uuid(), 'EHR:READ_ANY', 'Allows a doctor to view any patient''s electronic health records.'),
(gen_random_uuid(), 'EHR:WRITE', 'Allows a doctor to create or update an electronic health record.'),
(gen_random_uuid(), 'ADMIN_PANEL:ACCESS', 'Allows access to the administration panel.');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'PATIENT' AND p.code IN ('USER_PROFILE:READ_OWN', 'USER_PROFILE:WRITE_OWN', 'APPOINTMENT:READ_OWN', 'APPOINTMENT:WRITE_OWN', 'EHR:READ_OWN');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'DOCTOR' AND p.code IN ('USER_PROFILE:READ_OWN', 'USER_PROFILE:WRITE_OWN', 'APPOINTMENT:READ_OWN', 'EHR:READ_ANY', 'EHR:WRITE');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'RECEPTIONIST' AND p.code IN ('APPOINTMENT:READ_ANY', 'APPOINTMENT:WRITE_ANY');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.code = 'ADMIN';

