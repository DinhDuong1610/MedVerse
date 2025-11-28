CREATE TABLE encounters (
    id UUID PRIMARY KEY,
    appointment_id UUID UNIQUE NOT NULL,
    patient_id UUID NOT NULL,
    doctor_id UUID NOT NULL,
    
    status VARCHAR(50) NOT NULL, 
    start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    
    visit_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_by UUID,
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT fk_encounter_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id),
    CONSTRAINT fk_encounter_patient FOREIGN KEY (patient_id) REFERENCES users(id),
    CONSTRAINT fk_encounter_doctor FOREIGN KEY (doctor_id) REFERENCES users(id)
);

CREATE TABLE emr_allergies (
    id UUID PRIMARY KEY,
    patient_id UUID NOT NULL,
    encounter_id UUID, 
    
    substance VARCHAR(255) NOT NULL, 
    standardized_code VARCHAR(50), 
    
    reaction TEXT,
    severity VARCHAR(20), 
    
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT fk_allergy_patient FOREIGN KEY (patient_id) REFERENCES users(id),
    CONSTRAINT fk_allergy_encounter FOREIGN KEY (encounter_id) REFERENCES encounters(id)
);

CREATE TABLE emr_conditions (
    id UUID PRIMARY KEY,
    patient_id UUID NOT NULL,
    encounter_id UUID, 
    
    condition_code VARCHAR(50), 
    description TEXT NOT NULL, 
    
    condition_type VARCHAR(50) NOT NULL, 
    
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT fk_condition_patient FOREIGN KEY (patient_id) REFERENCES users(id),
    CONSTRAINT fk_condition_encounter FOREIGN KEY (encounter_id) REFERENCES encounters(id)
);
CREATE INDEX idx_conditions_code ON emr_conditions(condition_code); 

CREATE TABLE emr_observations (
    id UUID PRIMARY KEY,
    patient_id UUID NOT NULL,
    encounter_id UUID NOT NULL,
    
    observation_type VARCHAR(50) NOT NULL,
    
    standard_code VARCHAR(50), 
    description VARCHAR(255), 
    
    value_quantity DECIMAL(10, 2),
    value_unit VARCHAR(50), 
    value_text TEXT, 
    
    issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT fk_observation_patient FOREIGN KEY (patient_id) REFERENCES users(id),
    CONSTRAINT fk_observation_encounter FOREIGN KEY (encounter_id) REFERENCES encounters(id)
);

CREATE TABLE prescriptions (
    id UUID PRIMARY KEY,
    encounter_id UUID NOT NULL UNIQUE,
    patient_id UUID NOT NULL,
    doctor_id UUID NOT NULL,
    
    note TEXT, 
    status VARCHAR(50) NOT NULL, 
    
    issued_at TIMESTAMP WITH TIME ZONE, 
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_by UUID,
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT fk_prescription_encounter FOREIGN KEY (encounter_id) REFERENCES encounters(id),
    CONSTRAINT fk_prescription_patient FOREIGN KEY (patient_id) REFERENCES users(id),
    CONSTRAINT fk_prescription_doctor FOREIGN KEY (doctor_id) REFERENCES users(id)
);

CREATE TABLE prescription_items (
    id UUID PRIMARY KEY,
    prescription_id UUID NOT NULL,
    medication_id UUID NOT NULL, 
    
    dosage INT NOT NULL,
    unit VARCHAR(50), 
    
    frequency VARCHAR(100),
    route VARCHAR(50), 
    instruction TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_item_prescription FOREIGN KEY (prescription_id) REFERENCES prescriptions(id),
    CONSTRAINT fk_item_medication FOREIGN KEY (medication_id) REFERENCES medications(id)
);