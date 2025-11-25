-- V9__Create_Appointment_Module_Schema.sql
CREATE TABLE work_slots (
    id UUID PRIMARY KEY,
    doctor_id UUID NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) NOT NULL, 
    is_recurring BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_by UUID,
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT fk_work_slot_doctor FOREIGN KEY (doctor_id) REFERENCES users(id),
    CONSTRAINT chk_work_slot_time CHECK (end_time > start_time)
);

CREATE INDEX idx_work_slots_doctor_time ON work_slots(doctor_id, start_time, end_time);
CREATE INDEX idx_work_slots_status ON work_slots(status);


CREATE TABLE appointment_requests (
    id UUID PRIMARY KEY,
    patient_id UUID NOT NULL,
    doctor_id UUID, 
    specialty_id UUID, 
    
    desired_date DATE NOT NULL, 
    desired_time VARCHAR(50), 
    
    type VARCHAR(50) NOT NULL, 
    status VARCHAR(50) NOT NULL, 
    
    symptoms TEXT, 
    rejection_reason TEXT, 
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_by UUID,
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT fk_request_patient FOREIGN KEY (patient_id) REFERENCES users(id),
    CONSTRAINT fk_request_doctor FOREIGN KEY (doctor_id) REFERENCES users(id),
    CONSTRAINT fk_request_specialty FOREIGN KEY (specialty_id) REFERENCES specialties(id)
);

CREATE INDEX idx_requests_status ON appointment_requests(status);
CREATE INDEX idx_requests_patient ON appointment_requests(patient_id);


CREATE TABLE appointments (
    id UUID PRIMARY KEY,
    patient_id UUID NOT NULL,
    doctor_id UUID NOT NULL,
    
    request_id UUID UNIQUE, 
    work_slot_id UUID, 
    
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    
    status VARCHAR(50) NOT NULL, 
    type VARCHAR(50) NOT NULL,   
    
    diagnosis TEXT, 
    meeting_link TEXT,
    cancellation_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_by UUID,
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT fk_appointment_patient FOREIGN KEY (patient_id) REFERENCES users(id),
    CONSTRAINT fk_appointment_doctor FOREIGN KEY (doctor_id) REFERENCES users(id),
    CONSTRAINT fk_appointment_request FOREIGN KEY (request_id) REFERENCES appointment_requests(id),
    CONSTRAINT fk_appointment_slot FOREIGN KEY (work_slot_id) REFERENCES work_slots(id),
    CONSTRAINT chk_appointment_time CHECK (end_time > start_time)
);

CREATE INDEX idx_appointments_doctor_time ON appointments(doctor_id, start_time, end_time);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);