INSERT INTO permissions (id, code, description) VALUES
(gen_random_uuid(), 'PRESCRIPTION:READ', 'Allows viewing prescriptions.'),
(gen_random_uuid(), 'PRESCRIPTION:WRITE', 'Allows creating, modifying, and issuing prescriptions.');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'DOCTOR' AND p.code IN ('PRESCRIPTION:READ', 'PRESCRIPTION:WRITE');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'PATIENT' AND p.code = 'PRESCRIPTION:READ';