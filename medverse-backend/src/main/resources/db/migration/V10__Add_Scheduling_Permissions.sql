-- V10__Add_Scheduling_Permissions.sql
INSERT INTO permissions (id, code, description) VALUES
(gen_random_uuid(), 'SCHEDULING:READ', 'Allows viewing work slots.'),
(gen_random_uuid(), 'SCHEDULING:WRITE', 'Allows managing work slots (create, delete).');


INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code IN ('DOCTOR', 'RECEPTIONIST') AND p.code IN ('SCHEDULING:READ', 'SCHEDULING:WRITE');