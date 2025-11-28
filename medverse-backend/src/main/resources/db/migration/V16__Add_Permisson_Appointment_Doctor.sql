INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'DOCTOR' AND p.code IN ('APPOINTMENT:READ_ANY', 'APPOINTMENT:WRITE_ANY');