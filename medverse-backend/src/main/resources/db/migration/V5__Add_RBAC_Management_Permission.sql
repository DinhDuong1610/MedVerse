INSERT INTO permissions (id, code, description) VALUES
(gen_random_uuid(), 'RBAC:MANAGE', 'Allows managing roles and their permissions.');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'ADMIN' AND p.code = 'RBAC:MANAGE';