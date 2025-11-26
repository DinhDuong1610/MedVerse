INSERT INTO permissions (id, code, description) VALUES
(gen_random_uuid(), 'INVENTORY:READ', 'Allows viewing medication catalog and stock levels.'),
(gen_random_uuid(), 'INVENTORY:WRITE', 'Allows creating medications and importing stock.');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'ADMIN' AND p.code IN ('INVENTORY:READ', 'INVENTORY:WRITE');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'DOCTOR' AND p.code = 'INVENTORY:READ';