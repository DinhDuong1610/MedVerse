
-- =========================================================
-- MedVerse Demo Seed Helper
-- Tự động bỏ qua các cột không tồn tại để hạn chế lệch schema.
-- Chạy an toàn trong nhánh demo/local, không dùng cho production.
-- =========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION demo_table_exists(p_table TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = p_table
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION demo_column_exists(p_table TEXT, p_column TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = p_table
          AND column_name = p_column
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION demo_upsert_json(p_table TEXT, p_data JSONB)
RETURNS VOID AS $$
DECLARE
    r RECORD;
    col_names TEXT[] := ARRAY[]::TEXT[];
    col_values TEXT[] := ARRAY[]::TEXT[];
    update_parts TEXT[] := ARRAY[]::TEXT[];
    raw JSONB;
    val TEXT;
    sql TEXT;
    has_id BOOLEAN;
BEGIN
    IF NOT demo_table_exists(p_table) THEN
        RAISE NOTICE 'Skip table %, not exists', p_table;
        RETURN;
    END IF;

    FOR r IN
        SELECT a.attname AS column_name,
               pg_catalog.format_type(a.atttypid, a.atttypmod) AS column_type
        FROM pg_attribute a
        JOIN pg_class c ON c.oid = a.attrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = p_table
          AND a.attnum > 0
          AND NOT a.attisdropped
        ORDER BY a.attnum
    LOOP
        IF p_data ? r.column_name THEN
            raw := p_data -> r.column_name;

            IF raw::TEXT = 'null' THEN
                val := 'NULL';
            ELSIF r.column_type IN ('json', 'jsonb') THEN
                val := format('%L::%s', raw::TEXT, r.column_type);
            ELSE
                val := format('%L::%s', p_data ->> r.column_name, r.column_type);
            END IF;

            col_names := col_names || format('%I', r.column_name);
            col_values := col_values || val;

            IF r.column_name <> 'id' THEN
                update_parts := update_parts || format('%I = EXCLUDED.%I', r.column_name, r.column_name);
            END IF;
        END IF;
    END LOOP;

    IF array_length(col_names, 1) IS NULL THEN
        RAISE NOTICE 'No matched columns for %', p_table;
        RETURN;
    END IF;

    has_id := demo_column_exists(p_table, 'id') AND p_data ? 'id';

    IF has_id AND array_length(update_parts, 1) IS NOT NULL THEN
        sql := format(
            'INSERT INTO %I (%s) VALUES (%s) ON CONFLICT (id) DO UPDATE SET %s',
            p_table,
            array_to_string(col_names, ', '),
            array_to_string(col_values, ', '),
            array_to_string(update_parts, ', ')
        );
    ELSE
        sql := format(
            'INSERT INTO %I (%s) VALUES (%s)',
            p_table,
            array_to_string(col_names, ', '),
            array_to_string(col_values, ', ')
        );
    END IF;

    EXECUTE sql;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION demo_upsert_by_code(p_table TEXT, p_code TEXT, p_data JSONB)
RETURNS VOID AS $$
DECLARE
    existing_id TEXT;
    sql TEXT;
BEGIN
    IF NOT demo_table_exists(p_table) THEN
        RAISE NOTICE 'Skip table %, not exists', p_table;
        RETURN;
    END IF;

    IF NOT demo_column_exists(p_table, 'code') THEN
        PERFORM demo_upsert_json(p_table, p_data);
        RETURN;
    END IF;

    IF demo_column_exists(p_table, 'id') THEN
        EXECUTE format('SELECT id::text FROM %I WHERE code = $1 LIMIT 1', p_table)
        INTO existing_id
        USING p_code;

        IF existing_id IS NOT NULL THEN
            p_data := jsonb_set(p_data, '{id}', to_jsonb(existing_id), TRUE);
        END IF;
    END IF;

    PERFORM demo_upsert_json(p_table, p_data);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION demo_delete_by_id(p_table TEXT, p_id UUID)
RETURNS VOID AS $$
BEGIN
    IF demo_table_exists(p_table) AND demo_column_exists(p_table, 'id') THEN
        EXECUTE format('DELETE FROM %I WHERE id = $1', p_table) USING p_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION demo_delete_by_user_ids(p_table TEXT, p_user_ids UUID[])
RETURNS VOID AS $$
BEGIN
    IF NOT demo_table_exists(p_table) THEN
        RETURN;
    END IF;

    IF demo_column_exists(p_table, 'user_id') THEN
        EXECUTE format('DELETE FROM %I WHERE user_id = ANY($1)', p_table) USING p_user_ids;
    ELSIF demo_column_exists(p_table, 'patient_id') THEN
        EXECUTE format('DELETE FROM %I WHERE patient_id = ANY($1)', p_table) USING p_user_ids;
    END IF;
END;
$$ LANGUAGE plpgsql;


DO $$
DECLARE
    admin_id UUID := '49e8a779-2722-584b-940e-62e848685d71';
    doctor_id UUID := '1ff22e3e-d592-51e5-8fec-f579ea92e703';
    receptionist_id UUID := '22422a7f-af57-5091-8162-a42e9f0b513a';
    patient_id UUID := '2dfbdbe2-96ca-5968-9620-e2e1b918e4b3';
    demo_users UUID[] := ARRAY[admin_id, doctor_id, receptionist_id, patient_id];
    role_id UUID;
    perm_id UUID;
BEGIN
    -- 1) Xóa dữ liệu nghiệp vụ demo trước để reset sạch mỗi lần chạy.
    PERFORM demo_delete_by_id('payment_events', '6ffe3c13-2471-5c12-bd7c-1a147f91d042'::uuid);
    PERFORM demo_delete_by_id('invoice_items', '896bbdbd-3869-5ed7-9ca6-878e710bba7b'::uuid);
    PERFORM demo_delete_by_id('invoices', '872c80e6-bdca-59b3-8136-e3fcec7bc84f'::uuid);

    PERFORM demo_delete_by_id('prescription_safety_alerts', '62aa10f6-5cc2-5af2-9b2f-cc852873b617'::uuid);
    PERFORM demo_delete_by_id('prescription_items', 'b5e51c34-0ca8-5fbb-a27e-9ffb2d646220'::uuid);
    PERFORM demo_delete_by_id('prescription_items', '234e2fd2-1884-5530-a300-ae4c21955b92'::uuid);
    PERFORM demo_delete_by_id('prescriptions', '55c03fe7-9f96-5312-bb78-71b39d2c3cc9'::uuid);

    PERFORM demo_delete_by_id('medical_record_diagnoses', '95b2dadf-aa34-5109-9e23-3ff1397c295f'::uuid);
    PERFORM demo_delete_by_id('medical_record_diagnoses', '2d17f9b3-5d99-5c23-8f3e-cecbc5c9c879'::uuid);
    PERFORM demo_delete_by_id('medical_records', 'ffc5abdf-8d7d-5cdd-84c7-0dcd64a0e95b'::uuid);
    PERFORM demo_delete_by_id('medical_records', 'b761b9af-d459-5e4d-8d7a-91ee79db4bf1'::uuid);

    PERFORM demo_delete_by_id('appointments', '4ef98229-d371-5e7b-9883-2d11f05f2532'::uuid);
    PERFORM demo_delete_by_id('appointments', 'a3d95f3c-20c5-5337-9a17-4b57a2dd8858'::uuid);
    PERFORM demo_delete_by_id('appointment_requests', '6408f695-cf13-5787-98cb-80c9f1ded976'::uuid);
    PERFORM demo_delete_by_id('appointment_requests', '069b1435-58a8-509e-8213-8e5b17848df0'::uuid);
    PERFORM demo_delete_by_id('appointment_requests', 'adeec098-59f8-5868-bff1-f6e8fa8087ed'::uuid);

    PERFORM demo_delete_by_id('work_slots', 'b4b0b265-a02f-5edf-84c1-9e9bfb846d6a'::uuid);
    PERFORM demo_delete_by_id('work_slots', 'c52f7bac-4d6e-54dc-bbc5-c14374df382e'::uuid);
    PERFORM demo_delete_by_id('work_slots', 'df0c605c-b9a9-5c33-82d9-56ad7aa836b8'::uuid);
    PERFORM demo_delete_by_id('work_slots', '4e3e70c3-db9d-52f5-84b5-747d4179b33c'::uuid);
    PERFORM demo_delete_by_id('work_slots', '4e052a67-f768-5be4-8228-1f80df073a8d'::uuid);
    PERFORM demo_delete_by_id('work_slots', '9ccd9d59-0d3c-5e15-a85d-77f2255aaee1'::uuid);

    PERFORM demo_delete_by_id('allergies', '732693cf-b325-572e-8b40-fb43942ee5ac'::uuid);
    PERFORM demo_delete_by_id('allergies', 'a1614a5a-0f6e-528b-8990-0b890baf14a3'::uuid);
    PERFORM demo_delete_by_id('patient_medical_profiles', '811575ad-e819-5a4d-8c13-7eed5b590109'::uuid);

    -- Xóa quan hệ role/profile/token cũ của demo users nếu tồn tại.
    IF demo_table_exists('user_roles') AND demo_column_exists('user_roles', 'user_id') THEN
        DELETE FROM user_roles WHERE user_id = ANY(demo_users);
    END IF;
    PERFORM demo_delete_by_user_ids('user_profiles', demo_users);
    PERFORM demo_delete_by_user_ids('doctor_profiles', demo_users);
    PERFORM demo_delete_by_user_ids('receptionist_profiles', demo_users);
    PERFORM demo_delete_by_user_ids('refresh_tokens', demo_users);
    PERFORM demo_delete_by_user_ids('verification_tokens', demo_users);
    IF demo_table_exists('users') AND demo_column_exists('users', 'email') THEN
        DELETE FROM users WHERE email IN ('admin@medverse.vn','doctor.demo@medverse.vn','receptionist.demo@medverse.vn','patient.demo@medverse.vn');
    END IF;

    -- 2) Roles cơ bản.
    PERFORM demo_upsert_by_code('roles', 'ADMIN', jsonb_build_object(
        'id', '64b5af23-77b3-5e5d-8fd2-3133f62d342b', 'code', 'ADMIN', 'name', 'Quản trị viên', 'description', 'Full system administrator',
        'created_at', NOW()::text, 'updated_at', NOW()::text
    ));
    PERFORM demo_upsert_by_code('roles', 'DOCTOR', jsonb_build_object(
        'id', '6da9d069-bf55-5e7f-9b41-b5055602de7d', 'code', 'DOCTOR', 'name', 'Bác sĩ', 'description', 'Doctor role',
        'created_at', NOW()::text, 'updated_at', NOW()::text
    ));
    PERFORM demo_upsert_by_code('roles', 'RECEPTIONIST', jsonb_build_object(
        'id', '80387056-fe4f-5da6-8af5-29227646be6c', 'code', 'RECEPTIONIST', 'name', 'Lễ tân', 'description', 'Receptionist role',
        'created_at', NOW()::text, 'updated_at', NOW()::text
    ));
    PERFORM demo_upsert_by_code('roles', 'PATIENT', jsonb_build_object(
        'id', 'a092fd5e-64a2-55c7-8740-6ab46b6e8f10', 'code', 'PATIENT', 'name', 'Bệnh nhân', 'description', 'Patient role',
        'created_at', NOW()::text, 'updated_at', NOW()::text
    ));

END $$;

-- Seed permissions theo code và gán role_permissions.
DO $$
DECLARE
    code TEXT;
    role_code TEXT;
    role_codes TEXT[];
    permission_codes TEXT[] := ARRAY[
        'ADMIN_PANEL:ACCESS','RBAC:MANAGE','USER:READ','USER:WRITE','SYSTEM:READ','AUDIT:READ',
        'SPECIALTY:READ','SPECIALTY:WRITE','DOCTOR:READ','DOCTOR:WRITE','RECEPTIONIST:READ','RECEPTIONIST:WRITE',
        'INVENTORY:READ','INVENTORY:WRITE','APPOINTMENT:READ_ANY','APPOINTMENT:WRITE',
        'APPOINTMENT_REQUEST:READ_ANY','APPOINTMENT_REQUEST:WRITE','WORK_SLOT:READ','WORK_SLOT:WRITE',
        'PATIENT:READ_OWN','PATIENT:WRITE_OWN','PATIENT:READ_ANY','ALLERGY:READ_ANY',
        'EHR:READ_OWN','EHR:READ_ANY','EHR:WRITE',
        'PRESCRIPTION:READ_OWN','PRESCRIPTION:READ_ANY','PRESCRIPTION:WRITE',
        'BILLING:READ_OWN','BILLING:READ_ANY','BILLING:WRITE','NOTIFICATION:READ'
    ];
BEGIN
    FOREACH code IN ARRAY permission_codes LOOP
        PERFORM demo_upsert_by_code('permissions', code, jsonb_build_object(
            'id', gen_random_uuid()::text,
            'code', code,
            'name', code,
            'description', 'Demo permission ' || code,
            'created_at', NOW()::text,
            'updated_at', NOW()::text
        ));
    END LOOP;

    IF demo_table_exists('role_permissions') THEN
        -- ADMIN: tất cả quyền.
        INSERT INTO role_permissions(role_id, permission_id)
        SELECT r.id, p.id FROM roles r JOIN permissions p ON TRUE
        WHERE r.code = 'ADMIN'
          AND NOT EXISTS (
              SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
          );

        -- DOCTOR.
        INSERT INTO role_permissions(role_id, permission_id)
        SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code = ANY(ARRAY[
            'APPOINTMENT:READ_ANY','WORK_SLOT:READ','WORK_SLOT:WRITE','PATIENT:READ_ANY','ALLERGY:READ_ANY',
            'EHR:READ_ANY','EHR:WRITE','PRESCRIPTION:READ_ANY','PRESCRIPTION:WRITE','INVENTORY:READ','BILLING:READ_ANY','NOTIFICATION:READ'
        ])
        WHERE r.code = 'DOCTOR'
          AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);

        -- RECEPTIONIST.
        INSERT INTO role_permissions(role_id, permission_id)
        SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code = ANY(ARRAY[
            'APPOINTMENT:READ_ANY','APPOINTMENT:WRITE','APPOINTMENT_REQUEST:READ_ANY','APPOINTMENT_REQUEST:WRITE',
            'WORK_SLOT:READ','PATIENT:READ_ANY','ALLERGY:READ_ANY','EHR:READ_ANY','PRESCRIPTION:READ_ANY','BILLING:READ_ANY','BILLING:WRITE','NOTIFICATION:READ'
        ])
        WHERE r.code = 'RECEPTIONIST'
          AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);

        -- PATIENT.
        INSERT INTO role_permissions(role_id, permission_id)
        SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code = ANY(ARRAY[
            'PATIENT:READ_OWN','PATIENT:WRITE_OWN','EHR:READ_OWN','PRESCRIPTION:READ_OWN','BILLING:READ_OWN','NOTIFICATION:READ'
        ])
        WHERE r.code = 'PATIENT'
          AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);
    END IF;
END $$;

-- 4) Demo users.
DO $$
DECLARE
    admin_id UUID := '49e8a779-2722-584b-940e-62e848685d71';
    doctor_id UUID := '1ff22e3e-d592-51e5-8fec-f579ea92e703';
    receptionist_id UUID := '22422a7f-af57-5091-8162-a42e9f0b513a';
    patient_id UUID := '2dfbdbe2-96ca-5968-9620-e2e1b918e4b3';
BEGIN
    PERFORM demo_upsert_json('users', jsonb_build_object(
        'id', admin_id::text, 'email', 'admin@medverse.vn', 'username', 'admin@medverse.vn',
        'password', '$2y$10$4Vr9m3k5ocCWIrj82ozWruD2RFo3j86WOg4qniyAJXfKfnUa7EJ.y', 'password_hash', '$2y$10$4Vr9m3k5ocCWIrj82ozWruD2RFo3j86WOg4qniyAJXfKfnUa7EJ.y',
        'full_name', 'Admin MedVerse', 'name', 'Admin MedVerse', 'phone', '0900000001',
        'status', 'ACTIVE', 'active', TRUE, 'enabled', TRUE, 'email_verified', TRUE,
        'created_at', NOW()::text, 'updated_at', NOW()::text
    ));
    PERFORM demo_upsert_json('users', jsonb_build_object(
        'id', doctor_id::text, 'email', 'doctor.demo@medverse.vn', 'username', 'doctor.demo@medverse.vn',
        'password', '$2y$10$LcVVQjBN./rLxGpGIn2tqO0GL3CUWDMuz2KdT4pjAb6d4t46sQAku', 'password_hash', '$2y$10$LcVVQjBN./rLxGpGIn2tqO0GL3CUWDMuz2KdT4pjAb6d4t46sQAku',
        'full_name', 'BS. Nguyễn Minh An', 'name', 'BS. Nguyễn Minh An', 'phone', '0900000002',
        'status', 'ACTIVE', 'active', TRUE, 'enabled', TRUE, 'email_verified', TRUE,
        'created_at', NOW()::text, 'updated_at', NOW()::text
    ));
    PERFORM demo_upsert_json('users', jsonb_build_object(
        'id', receptionist_id::text, 'email', 'receptionist.demo@medverse.vn', 'username', 'receptionist.demo@medverse.vn',
        'password', '$2y$10$zUmZNCHprTZj0m/Cu/zXSe.XEOrVSTCneq8iouViIvw13fuDcV38W', 'password_hash', '$2y$10$zUmZNCHprTZj0m/Cu/zXSe.XEOrVSTCneq8iouViIvw13fuDcV38W',
        'full_name', 'Lễ tân Trần Thu Hà', 'name', 'Lễ tân Trần Thu Hà', 'phone', '0900000003',
        'status', 'ACTIVE', 'active', TRUE, 'enabled', TRUE, 'email_verified', TRUE,
        'created_at', NOW()::text, 'updated_at', NOW()::text
    ));
    PERFORM demo_upsert_json('users', jsonb_build_object(
        'id', patient_id::text, 'email', 'patient.demo@medverse.vn', 'username', 'patient.demo@medverse.vn',
        'password', '$2y$10$sVaMk.VmhOC53dgETy/bsOx9AAaftsvj6SpWdvkNuO0ymDQZXSLbG', 'password_hash', '$2y$10$sVaMk.VmhOC53dgETy/bsOx9AAaftsvj6SpWdvkNuO0ymDQZXSLbG',
        'full_name', 'Bệnh nhân Lê Quốc Huy', 'name', 'Bệnh nhân Lê Quốc Huy', 'phone', '0900000004',
        'status', 'ACTIVE', 'active', TRUE, 'enabled', TRUE, 'email_verified', TRUE,
        'created_at', NOW()::text, 'updated_at', NOW()::text
    ));

    IF demo_table_exists('user_roles') THEN
        INSERT INTO user_roles(user_id, role_id)
        SELECT admin_id, r.id FROM roles r WHERE r.code = 'ADMIN'
        AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = admin_id AND ur.role_id = r.id);
        INSERT INTO user_roles(user_id, role_id)
        SELECT doctor_id, r.id FROM roles r WHERE r.code = 'DOCTOR'
        AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = doctor_id AND ur.role_id = r.id);
        INSERT INTO user_roles(user_id, role_id)
        SELECT receptionist_id, r.id FROM roles r WHERE r.code = 'RECEPTIONIST'
        AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = receptionist_id AND ur.role_id = r.id);
        INSERT INTO user_roles(user_id, role_id)
        SELECT patient_id, r.id FROM roles r WHERE r.code = 'PATIENT'
        AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = patient_id AND ur.role_id = r.id);
    END IF;
END $$;

-- 5) Chuyên khoa, profile nhân sự, profile bệnh nhân.
DO $$
BEGIN
    PERFORM demo_upsert_by_code('specialties', 'NOI_TONG_QUAT', jsonb_build_object(
        'id', 'd9e4f2c2-783a-5a9b-8a9b-3ef6b99f873b', 'code', 'NOI_TONG_QUAT', 'name', 'Nội tổng quát', 'description', 'Khám nội tổng quát và tư vấn sức khỏe ban đầu', 'active', TRUE, 'created_at', NOW()::text, 'updated_at', NOW()::text
    ));
    PERFORM demo_upsert_by_code('specialties', 'TIM_MACH', jsonb_build_object(
        'id', 'fc564c96-ac5f-5913-928a-40ce26a7fc15', 'code', 'TIM_MACH', 'name', 'Tim mạch', 'description', 'Khám và theo dõi bệnh lý tim mạch', 'active', TRUE, 'created_at', NOW()::text, 'updated_at', NOW()::text
    ));
    PERFORM demo_upsert_by_code('specialties', 'NHI_KHOA', jsonb_build_object(
        'id', '5cd99aa2-c20e-5f93-bf2c-37ec2a7ade00', 'code', 'NHI_KHOA', 'name', 'Nhi khoa', 'description', 'Khám và tư vấn sức khỏe trẻ em', 'active', TRUE, 'created_at', NOW()::text, 'updated_at', NOW()::text
    ));

    PERFORM demo_upsert_json('user_profiles', jsonb_build_object('id','0c393f41-bacf-5f85-9d5b-fff7005b5d75', 'user_id','49e8a779-2722-584b-940e-62e848685d71', 'full_name','Admin MedVerse','phone','0900000001','created_at',NOW()::text,'updated_at',NOW()::text));
    PERFORM demo_upsert_json('user_profiles', jsonb_build_object('id','ccd58bd2-daaa-5d8b-9836-1fbd21f59b6c', 'user_id','1ff22e3e-d592-51e5-8fec-f579ea92e703', 'full_name','BS. Nguyễn Minh An','phone','0900000002','created_at',NOW()::text,'updated_at',NOW()::text));
    PERFORM demo_upsert_json('user_profiles', jsonb_build_object('id','bafd068c-10f5-59b9-b170-f81bdb2b2758', 'user_id','22422a7f-af57-5091-8162-a42e9f0b513a', 'full_name','Lễ tân Trần Thu Hà','phone','0900000003','created_at',NOW()::text,'updated_at',NOW()::text));
    PERFORM demo_upsert_json('user_profiles', jsonb_build_object('id','07380f2a-0ad1-5264-b80b-b8c60a8bc43a', 'user_id','2dfbdbe2-96ca-5968-9620-e2e1b918e4b3', 'full_name','Bệnh nhân Lê Quốc Huy','phone','0900000004','gender','MALE','date_of_birth','1998-10-16','address','Đà Nẵng','created_at',NOW()::text,'updated_at',NOW()::text));

    PERFORM demo_upsert_json('doctor_profiles', jsonb_build_object(
        'id','0f945aaf-6a22-55ef-949b-137f1cbafb57', 'user_id','1ff22e3e-d592-51e5-8fec-f579ea92e703', 'doctor_id','1ff22e3e-d592-51e5-8fec-f579ea92e703', 'specialty_id','d9e4f2c2-783a-5a9b-8a9b-3ef6b99f873b',
        'license_number','CCHN-DEMO-001', 'degree','Thạc sĩ Y khoa', 'experience_years', 8,
        'bio','Bác sĩ demo phụ trách khám nội tổng quát, kê đơn và kiểm tra an toàn thuốc.',
        'status','ACTIVE','active',TRUE,'created_at',NOW()::text,'updated_at',NOW()::text
    ));
    PERFORM demo_upsert_json('receptionist_profiles', jsonb_build_object(
        'id','3dc15356-0019-5662-a99a-f0ba7f9c9d01', 'user_id','22422a7f-af57-5091-8162-a42e9f0b513a', 'receptionist_id','22422a7f-af57-5091-8162-a42e9f0b513a',
        'employee_code','REC-DEMO-001','status','ACTIVE','active',TRUE,'created_at',NOW()::text,'updated_at',NOW()::text
    ));

    PERFORM demo_upsert_json('patient_medical_profiles', jsonb_build_object(
        'id','811575ad-e819-5a4d-8c13-7eed5b590109', 'patient_id','2dfbdbe2-96ca-5968-9620-e2e1b918e4b3', 'blood_type','O+', 'height_cm',170, 'weight_kg',68,
        'chronic_diseases','Đái tháo đường type 2, tăng huyết áp nhẹ',
        'chronic_conditions_note','Đang theo dõi đường huyết, cần lưu ý thuốc ảnh hưởng glucose.',
        'medical_history','Từng viêm dạ dày, không hút thuốc, ít vận động.',
        'current_medications_note','Metformin 500mg ngày 2 lần; Amlodipine 5mg mỗi sáng.',
        'note','Dữ liệu demo để kiểm tra luồng bệnh án, đơn thuốc và cảnh báo AI.',
        'created_at',NOW()::text,'updated_at',NOW()::text
    ));
    PERFORM demo_upsert_json('allergies', jsonb_build_object(
        'id','732693cf-b325-572e-8b40-fb43942ee5ac', 'patient_id','2dfbdbe2-96ca-5968-9620-e2e1b918e4b3', 'allergen','Penicillin', 'reaction','Nổi mề đay, khó thở nhẹ', 'severity','HIGH', 'note','Dùng để demo cảnh báo kê đơn kháng sinh nhóm penicillin.', 'created_at',NOW()::text,'updated_at',NOW()::text
    ));
    PERFORM demo_upsert_json('allergies', jsonb_build_object(
        'id','a1614a5a-0f6e-528b-8990-0b890baf14a3', 'patient_id','2dfbdbe2-96ca-5968-9620-e2e1b918e4b3', 'allergen','Hải sản', 'reaction','Ngứa da', 'severity','LOW', 'note','Dị ứng nhẹ.', 'created_at',NOW()::text,'updated_at',NOW()::text
    ));
END $$;

-- 6) Work slots, appointment requests, appointments, EHR, prescription, billing.
DO $$
DECLARE
    d1 DATE := CURRENT_DATE + INTERVAL '1 day';
    d2 DATE := CURRENT_DATE + INTERVAL '2 day';
    d3 DATE := CURRENT_DATE + INTERVAL '3 day';
BEGIN
    -- Slots: 1 slot đã book, còn lại available để demo lễ tân duyệt request.
    PERFORM demo_upsert_json('work_slots', jsonb_build_object('id','b4b0b265-a02f-5edf-84c1-9e9bfb846d6a', 'doctor_id','1ff22e3e-d592-51e5-8fec-f579ea92e703', 'start_time',(d1 + TIME '08:00')::text, 'end_time',(d1 + TIME '08:30')::text, 'status','BOOKED', 'created_at',NOW()::text,'updated_at',NOW()::text));
    PERFORM demo_upsert_json('work_slots', jsonb_build_object('id','c52f7bac-4d6e-54dc-bbc5-c14374df382e', 'doctor_id','1ff22e3e-d592-51e5-8fec-f579ea92e703', 'start_time',(d1 + TIME '09:00')::text, 'end_time',(d1 + TIME '09:30')::text, 'status','AVAILABLE', 'created_at',NOW()::text,'updated_at',NOW()::text));
    PERFORM demo_upsert_json('work_slots', jsonb_build_object('id','df0c605c-b9a9-5c33-82d9-56ad7aa836b8', 'doctor_id','1ff22e3e-d592-51e5-8fec-f579ea92e703', 'start_time',(d1 + TIME '10:00')::text, 'end_time',(d1 + TIME '10:30')::text, 'status','AVAILABLE', 'created_at',NOW()::text,'updated_at',NOW()::text));
    PERFORM demo_upsert_json('work_slots', jsonb_build_object('id','4e3e70c3-db9d-52f5-84b5-747d4179b33c', 'doctor_id','1ff22e3e-d592-51e5-8fec-f579ea92e703', 'start_time',(d2 + TIME '08:30')::text, 'end_time',(d2 + TIME '09:00')::text, 'status','AVAILABLE', 'created_at',NOW()::text,'updated_at',NOW()::text));
    PERFORM demo_upsert_json('work_slots', jsonb_build_object('id','4e052a67-f768-5be4-8228-1f80df073a8d', 'doctor_id','1ff22e3e-d592-51e5-8fec-f579ea92e703', 'start_time',(d2 + TIME '09:30')::text, 'end_time',(d2 + TIME '10:00')::text, 'status','AVAILABLE', 'created_at',NOW()::text,'updated_at',NOW()::text));
    PERFORM demo_upsert_json('work_slots', jsonb_build_object('id','9ccd9d59-0d3c-5e15-a85d-77f2255aaee1', 'doctor_id','1ff22e3e-d592-51e5-8fec-f579ea92e703', 'start_time',(d3 + TIME '08:00')::text, 'end_time',(d3 + TIME '08:30')::text, 'status','AVAILABLE', 'created_at',NOW()::text,'updated_at',NOW()::text));

    PERFORM demo_upsert_json('appointment_requests', jsonb_build_object(
        'id','6408f695-cf13-5787-98cb-80c9f1ded976', 'patient_id','2dfbdbe2-96ca-5968-9620-e2e1b918e4b3', 'doctor_id','1ff22e3e-d592-51e5-8fec-f579ea92e703', 'specialty_id','d9e4f2c2-783a-5a9b-8a9b-3ef6b99f873b',
        'status','PENDING', 'reason','Đau họng, sốt nhẹ, ho khan 2 ngày.', 'symptoms','Sốt 38 độ, đau rát họng, ho khan.',
        'preferred_date', d1::text, 'preferred_start_time',(d1 + TIME '09:00')::text, 'preferred_end_time',(d1 + TIME '09:30')::text,
        'created_at',NOW()::text,'updated_at',NOW()::text
    ));
    PERFORM demo_upsert_json('appointment_requests', jsonb_build_object(
        'id','069b1435-58a8-509e-8213-8e5b17848df0', 'patient_id','2dfbdbe2-96ca-5968-9620-e2e1b918e4b3', 'doctor_id','1ff22e3e-d592-51e5-8fec-f579ea92e703', 'specialty_id','d9e4f2c2-783a-5a9b-8a9b-3ef6b99f873b',
        'status','PENDING', 'reason','Tái khám đường huyết và huyết áp.', 'symptoms','Mệt mỏi, khát nước nhiều.',
        'preferred_date', d2::text, 'preferred_start_time',(d2 + TIME '08:30')::text, 'preferred_end_time',(d2 + TIME '09:00')::text,
        'created_at',NOW()::text,'updated_at',NOW()::text
    ));
    PERFORM demo_upsert_json('appointment_requests', jsonb_build_object(
        'id','adeec098-59f8-5868-bff1-f6e8fa8087ed', 'patient_id','2dfbdbe2-96ca-5968-9620-e2e1b918e4b3', 'doctor_id','1ff22e3e-d592-51e5-8fec-f579ea92e703', 'specialty_id','d9e4f2c2-783a-5a9b-8a9b-3ef6b99f873b',
        'status','APPROVED', 'reason','Khám ho sốt, cần bác sĩ tư vấn.', 'symptoms','Sốt nhẹ, ho có đờm, đau họng.',
        'approved_by','22422a7f-af57-5091-8162-a42e9f0b513a', 'work_slot_id','b4b0b265-a02f-5edf-84c1-9e9bfb846d6a',
        'preferred_date', d1::text, 'preferred_start_time',(d1 + TIME '08:00')::text, 'preferred_end_time',(d1 + TIME '08:30')::text,
        'created_at',NOW()::text,'updated_at',NOW()::text
    ));

    PERFORM demo_upsert_json('appointments', jsonb_build_object(
        'id','4ef98229-d371-5e7b-9883-2d11f05f2532', 'appointment_request_id','adeec098-59f8-5868-bff1-f6e8fa8087ed', 'patient_id','2dfbdbe2-96ca-5968-9620-e2e1b918e4b3', 'doctor_id','1ff22e3e-d592-51e5-8fec-f579ea92e703', 'specialty_id','d9e4f2c2-783a-5a9b-8a9b-3ef6b99f873b', 'work_slot_id','b4b0b265-a02f-5edf-84c1-9e9bfb846d6a',
        'status','CONFIRMED', 'type','OFFLINE', 'room_name','Phòng khám A101', 'reason','Khám ho sốt, cần bác sĩ tư vấn.', 'symptoms','Sốt nhẹ, ho có đờm, đau họng.',
        'start_time',(d1 + TIME '08:00')::text, 'end_time',(d1 + TIME '08:30')::text, 'appointment_date',d1::text, 'appointment_time','08:00',
        'created_at',NOW()::text,'updated_at',NOW()::text
    ));

    PERFORM demo_upsert_json('appointments', jsonb_build_object(
        'id','a3d95f3c-20c5-5337-9a17-4b57a2dd8858', 'patient_id','2dfbdbe2-96ca-5968-9620-e2e1b918e4b3', 'doctor_id','1ff22e3e-d592-51e5-8fec-f579ea92e703', 'specialty_id','d9e4f2c2-783a-5a9b-8a9b-3ef6b99f873b',
        'status','COMPLETED', 'type','OFFLINE', 'room_name','Phòng khám A101', 'reason','Đã khám demo hoàn tất.', 'symptoms','Ho khan, sốt nhẹ, đau họng.',
        'start_time',(CURRENT_DATE - INTERVAL '1 day' + TIME '08:00')::text, 'end_time',(CURRENT_DATE - INTERVAL '1 day' + TIME '08:30')::text, 'appointment_date',(CURRENT_DATE - INTERVAL '1 day')::text, 'appointment_time','08:00',
        'created_at',NOW()::text,'updated_at',NOW()::text
    ));

    PERFORM demo_upsert_json('medical_records', jsonb_build_object(
        'id','ffc5abdf-8d7d-5cdd-84c7-0dcd64a0e95b', 'appointment_id','a3d95f3c-20c5-5337-9a17-4b57a2dd8858', 'patient_id','2dfbdbe2-96ca-5968-9620-e2e1b918e4b3', 'doctor_id','1ff22e3e-d592-51e5-8fec-f579ea92e703',
        'chief_complaint','Ho, sốt nhẹ và đau họng 2 ngày.', 'symptoms','Ho khan, rát họng, nhiệt độ 38 độ C.',
        'clinical_note','Niêm mạc họng đỏ nhẹ, phổi thông khí tốt, không khó thở.',
        'diagnosis_text','Viêm đường hô hấp trên cấp tính, theo dõi đường huyết type 2.',
        'diagnosis_summary','Viêm đường hô hấp trên cấp tính trên nền đái tháo đường type 2.',
        'treatment_plan','Điều trị triệu chứng, uống nhiều nước, theo dõi đường huyết.',
        'follow_up_note','Tái khám nếu sốt cao kéo dài trên 3 ngày hoặc khó thở.', 'doctor_advice','Tránh tự dùng kháng sinh do có tiền sử dị ứng Penicillin.',
        'status','COMPLETED', 'completed_at',NOW()::text, 'created_at',NOW()::text,'updated_at',NOW()::text
    ));

    PERFORM demo_upsert_json('medical_record_diagnoses', jsonb_build_object(
        'id','95b2dadf-aa34-5109-9e23-3ff1397c295f', 'medical_record_id','ffc5abdf-8d7d-5cdd-84c7-0dcd64a0e95b', 'diagnosis_text','Viêm đường hô hấp trên cấp tính', 'icd_code','J06.9', 'icd_display','Acute upper respiratory infection, unspecified', 'coding_system','ICD-10', 'source','MANUAL', 'confidence',0.95, 'accepted_by_doctor',TRUE, 'primary',TRUE, 'created_at',NOW()::text,'updated_at',NOW()::text
    ));
    PERFORM demo_upsert_json('medical_record_diagnoses', jsonb_build_object(
        'id','2d17f9b3-5d99-5c23-8f3e-cecbc5c9c879', 'medical_record_id','ffc5abdf-8d7d-5cdd-84c7-0dcd64a0e95b', 'diagnosis_text','Đái tháo đường type 2', 'icd_code','E11', 'icd_display','Type 2 diabetes mellitus', 'coding_system','ICD-10', 'source','MANUAL', 'confidence',0.9, 'accepted_by_doctor',TRUE, 'primary',FALSE, 'created_at',NOW()::text,'updated_at',NOW()::text
    ));

    PERFORM demo_upsert_json('prescriptions', jsonb_build_object(
        'id','55c03fe7-9f96-5312-bb78-71b39d2c3cc9', 'medical_record_id','ffc5abdf-8d7d-5cdd-84c7-0dcd64a0e95b', 'appointment_id','a3d95f3c-20c5-5337-9a17-4b57a2dd8858', 'patient_id','2dfbdbe2-96ca-5968-9620-e2e1b918e4b3', 'doctor_id','1ff22e3e-d592-51e5-8fec-f579ea92e703',
        'status','FINALIZED', 'note','Uống thuốc sau ăn, theo dõi dị ứng và đường huyết.', 'safety_level','HIGH', 'safety_summary','Bệnh nhân dị ứng Penicillin. Không dùng Amoxicillin/Ampicillin nếu chưa đánh giá lại.',
        'created_at',NOW()::text,'updated_at',NOW()::text,'finalized_at',NOW()::text
    ));
END $$;

-- 7) Dịch vụ và hóa đơn demo.
DO $$
BEGIN
    PERFORM demo_upsert_by_code('clinic_services', 'KHAM_TONG_QUAT', jsonb_build_object(
        'id','44a96ba5-7883-5627-8e61-812c34b40fc2', 'code','KHAM_TONG_QUAT', 'name','Khám tổng quát', 'description','Dịch vụ khám tổng quát demo', 'default_price',200000, 'active',TRUE, 'created_at',NOW()::text,'updated_at',NOW()::text
    ));
    PERFORM demo_upsert_by_code('clinic_services', 'TAI_KHAM', jsonb_build_object(
        'id','d8891a13-9f93-59af-9225-c18192412d30', 'code','TAI_KHAM', 'name','Tái khám', 'description','Dịch vụ tái khám demo', 'default_price',100000, 'active',TRUE, 'created_at',NOW()::text,'updated_at',NOW()::text
    ));
    PERFORM demo_upsert_json('invoices', jsonb_build_object(
        'id','872c80e6-bdca-59b3-8136-e3fcec7bc84f', 'appointment_id','a3d95f3c-20c5-5337-9a17-4b57a2dd8858', 'patient_id','2dfbdbe2-96ca-5968-9620-e2e1b918e4b3', 'status','PAID', 'total_amount',200000, 'note','Hóa đơn demo đã thanh toán.', 'created_at',NOW()::text,'updated_at',NOW()::text
    ));
    PERFORM demo_upsert_json('invoice_items', jsonb_build_object(
        'id','896bbdbd-3869-5ed7-9ca6-878e710bba7b', 'invoice_id','872c80e6-bdca-59b3-8136-e3fcec7bc84f', 'service_id','44a96ba5-7883-5627-8e61-812c34b40fc2', 'item_name','Khám tổng quát', 'quantity',1, 'unit_price',200000, 'amount',200000, 'created_at',NOW()::text,'updated_at',NOW()::text
    ));
END $$;

-- Prescription item seed cần medications đã import. Nếu medications chưa import, vẫn lưu medication_name để demo không gãy.
DO $$
DECLARE
    para_id UUID;
    acetyl_id UUID;
BEGIN
    IF demo_table_exists('medications') THEN
        IF demo_column_exists('medications', 'atc_code') THEN
            EXECUTE 'SELECT id FROM medications WHERE atc_code = $1 LIMIT 1' INTO para_id USING 'N02BE01';
            EXECUTE 'SELECT id FROM medications WHERE atc_code = $1 LIMIT 1' INTO acetyl_id USING 'R05CB01';
        ELSIF demo_column_exists('medications', 'code') THEN
            EXECUTE 'SELECT id FROM medications WHERE code = $1 LIMIT 1' INTO para_id USING 'N02BE01';
            EXECUTE 'SELECT id FROM medications WHERE code = $1 LIMIT 1' INTO acetyl_id USING 'R05CB01';
        END IF;
    END IF;

    PERFORM demo_upsert_json('prescription_items', jsonb_build_object(
        'id','b5e51c34-0ca8-5fbb-a27e-9ffb2d646220', 'prescription_id','55c03fe7-9f96-5312-bb78-71b39d2c3cc9', 'medication_id', para_id::text,
        'medication_name','Paracetamol 500mg', 'active_ingredient','Paracetamol', 'atc_code','N02BE01',
        'dosage','500mg/lần', 'frequency','3 lần/ngày khi sốt hoặc đau', 'duration','3 ngày', 'quantity',10, 'instruction','Uống sau ăn, không quá 4g/ngày.', 'created_at',NOW()::text,'updated_at',NOW()::text
    ));
    PERFORM demo_upsert_json('prescription_items', jsonb_build_object(
        'id','234e2fd2-1884-5530-a300-ae4c21955b92', 'prescription_id','55c03fe7-9f96-5312-bb78-71b39d2c3cc9', 'medication_id', acetyl_id::text,
        'medication_name','Acetylcysteine 200mg', 'active_ingredient','Acetylcysteine', 'atc_code','R05CB01',
        'dosage','200mg/lần', 'frequency','2 lần/ngày', 'duration','5 ngày', 'quantity',10, 'instruction','Hòa tan với nước, uống sau ăn.', 'created_at',NOW()::text,'updated_at',NOW()::text
    ));
    PERFORM demo_upsert_json('prescription_safety_alerts', jsonb_build_object(
        'id','62aa10f6-5cc2-5af2-9b2f-cc852873b617', 'prescription_id','55c03fe7-9f96-5312-bb78-71b39d2c3cc9', 'alert_type','ALLERGY', 'severity','HIGH', 'title','Dị ứng Penicillin',
        'message','Bệnh nhân có dị ứng Penicillin. Tránh dùng Amoxicillin/Ampicillin hoặc cần đánh giá kỹ trước khi kê.', 'recommendation','Chọn thuốc không thuộc nhóm Penicillin nếu cần kháng sinh.',
        'ai_payload', jsonb_build_object('source','demo-seed','allergen','Penicillin'), 'created_at',NOW()::text,'updated_at',NOW()::text
    ));
END $$;

-- Cleanup helper functions có thể giữ lại để seed lại nhanh; comment các dòng dưới nếu muốn xóa function.
-- DROP FUNCTION IF EXISTS demo_upsert_json(TEXT, JSONB);
-- DROP FUNCTION IF EXISTS demo_upsert_by_code(TEXT, TEXT, JSONB);
-- DROP FUNCTION IF EXISTS demo_delete_by_id(TEXT, UUID);
-- DROP FUNCTION IF EXISTS demo_delete_by_user_ids(TEXT, UUID[]);
-- DROP FUNCTION IF EXISTS demo_column_exists(TEXT, TEXT);
-- DROP FUNCTION IF EXISTS demo_table_exists(TEXT);
