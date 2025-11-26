CREATE TABLE medications (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    active_ingredient VARCHAR(255), 
    code VARCHAR(50) UNIQUE NOT NULL, 
    atc_code VARCHAR(20), 
    
    unit VARCHAR(50) NOT NULL, 
    packing_specification VARCHAR(100),
    
    usage_instruction TEXT,
    contraindication TEXT, 
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_by UUID,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_medications_name ON medications(name);
CREATE INDEX idx_medications_atc ON medications(atc_code);


CREATE TABLE medication_batches (
    id UUID PRIMARY KEY,
    medication_id UUID NOT NULL,
    
    batch_number VARCHAR(100) NOT NULL,
    supplier_name VARCHAR(255),
    
    manufacture_date DATE,
    expiry_date DATE NOT NULL,
    
    initial_quantity INT NOT NULL CHECK (initial_quantity >= 0),
    current_quantity INT NOT NULL CHECK (current_quantity >= 0),
    
    import_price DECIMAL(15, 2) NOT NULL,
    sale_price DECIMAL(15, 2) NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_by UUID,
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT fk_batch_medication FOREIGN KEY (medication_id) REFERENCES medications(id)
);

CREATE INDEX idx_batches_expiry ON medication_batches(expiry_date);
CREATE INDEX idx_batches_medication ON medication_batches(medication_id);


CREATE TABLE stock_transactions (
    id UUID PRIMARY KEY,
    batch_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL, 
    
    quantity INT NOT NULL, 
    balance_after INT NOT NULL, 
    
    reference_code VARCHAR(100), 
    reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID, 

    CONSTRAINT fk_transaction_batch FOREIGN KEY (batch_id) REFERENCES medication_batches(id)
);

CREATE INDEX idx_transactions_type ON stock_transactions(type);