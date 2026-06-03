export type PatientMedicalProfile = {
    id: string;
    patientId: string;
    bloodType?: string;
    heightCm?: number;
    weightKg?: number;
    chronicDiseases?: string;
    medicalHistory?: string;
    currentMedicationsNote?: string;
};

export type Allergy = {
    id: string;
    patientId: string;
    allergen: string;
    reaction?: string;
    severity?: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | 'UNKNOWN';
    note?: string;
};

export type MedicalRecordDiagnosis = {
    id: string;
    diagnosisText: string;
    icdCode?: string;
    icdDisplay?: string;
    codingSystem?: string;
    source?: string;
    confidence?: number;
    acceptedByDoctor?: boolean;
};

export type MedicalRecord = {
    id: string;
    appointmentId?: string;
    patientId: string;
    patientName?: string;
    patientEmail?: string;
    doctorId: string;
    doctorName?: string;
    doctorEmail?: string;
    chiefComplaint?: string;
    symptoms?: string;
    clinicalNote?: string;
    diagnosisText?: string;
    treatmentPlan?: string;
    followUpNote?: string;
    status: 'DRAFT' | 'COMPLETED' | 'CANCELLED';
    diagnoses?: MedicalRecordDiagnosis[];
    createdAt?: string;
};

export type PrescriptionItem = {
    id: string;
    prescriptionId: string;
    medicationId?: string;
    medicationName: string;
    activeIngredient?: string;
    atcCode?: string;
    unit?: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    quantity?: number;
    instruction?: string;
};

export type PrescriptionSafetyAlert = {
    id: string;
    prescriptionId: string;
    type: string;
    severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
    title?: string;
    message?: string;
    recommendation?: string;
};

export type Prescription = {
    id: string;
    medicalRecordId: string;
    appointmentId?: string;
    patientId: string;
    patientName?: string;
    doctorId: string;
    doctorName?: string;
    status: 'DRAFT' | 'FINALIZED' | 'CANCELLED';
    note?: string;
    finalizedAt?: string;
    items: PrescriptionItem[];
    safetyAlerts: PrescriptionSafetyAlert[];
};

export type Appointment = {
    id: string;
    patientId: string;
    patientName?: string;
    doctorId: string;
    doctorName?: string;
    startTime: string;
    endTime: string;
    status: string;
    type?: string;
    diagnosis?: string;
};

export type AiHealth = {
    service: string;
    status: string;
    fallbackEnabled: boolean;
    modules?: Record<string, string>;
};