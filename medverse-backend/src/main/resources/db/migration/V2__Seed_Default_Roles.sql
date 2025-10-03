-- V2__Seed_Default_Roles.sql

INSERT INTO roles (id, code, name, description, created_at, updated_at) VALUES
('c6b9b3e0-f3b7-4a57-9a1a-6f0a3e3e3e3e', 'PATIENT', 'Patient', 'Default role for patients', NOW(), NOW()),
('a2a3b3d1-f3b7-4a57-9a1a-6f0a3e3e3e3e', 'DOCTOR', 'Doctor', 'Role for doctors', NOW(), NOW()),
('b4b5c4e2-f3b7-4a57-9a1a-6f0a3e3e3e3e', 'RECEPTIONIST', 'Receptionist', 'Role for receptionists', NOW(), NOW()),
('d8d9e5f3-f3b7-4a57-9a1a-6f0a3e3e3e3e', 'ADMIN', 'Admin', 'Administrator role with full access', NOW(), NOW());