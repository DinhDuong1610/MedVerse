package com.medverse.backend.config;

import com.medverse.backend.entity.*;
import com.medverse.backend.entity.inventory.Medication;
import com.medverse.backend.entity.prescription.Prescription;
import com.medverse.backend.entity.prescription.PrescriptionItem;
import com.medverse.backend.repository.*;
import com.medverse.backend.utils.enumeration.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class DemoDataInitializer implements ApplicationRunner {

    @Value("${medverse.demo-data.enabled:false}")
    private boolean enabled;

    private final PasswordEncoder passwordEncoder;

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final SpecialtyRepository specialtyRepository;
    private final MedicationRepository medicationRepository;

    private final PatientMedicalProfileRepository patientMedicalProfileRepository;
    private final AllergyRepository allergyRepository;

    private final WorkSlotRepository workSlotRepository;
    private final AppointmentRequestRepository appointmentRequestRepository;
    private final AppointmentRepository appointmentRepository;

    private final MedicalRecordRepository medicalRecordRepository;
    private final MedicalRecordDiagnosisRepository medicalRecordDiagnosisRepository;

    private final PrescriptionRepository prescriptionRepository;
    private final PrescriptionItemRepository prescriptionItemRepository;

    private final DoctorProfileRepository doctorProfileRepository;
    private final ReceptionistProfileRepository receptionistProfileRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!enabled) {
            log.info("Demo data seeding disabled. Set DEMO_DATA_ENABLED=true to enable.");
            return;
        }

        log.info("Seeding MedVerse demo data...");

        Specialty general = seedSpecialty(
                "GENERAL",
                "Khám tổng quát",
                "Khám sức khỏe tổng quát, triệu chứng thông thường.");

        Specialty cardio = seedSpecialty(
                "CARDIOLOGY",
                "Tim mạch",
                "Khám và tư vấn bệnh lý tim mạch.");

        User doctor = seedUser(
                "doctor.demo@medverse.vn",
                "Doctor@123456",
                "Bác sĩ Nguyễn Minh An",
                LocalDate.of(1985, 3, 12),
                "MALE",
                "0901000001",
                "Đà Nẵng",
                "DOCTOR");

        seedDoctorProfile(doctor, general);

        User receptionist = seedUser(
                "receptionist.demo@medverse.vn",
                "Receptionist@123456",
                "Lễ tân Trần Thảo",
                LocalDate.of(1998, 7, 20),
                "FEMALE",
                "0901000002",
                "Đà Nẵng",
                "RECEPTIONIST");

        seedReceptionistProfile(receptionist);

        User patient = seedUser(
                "patient.demo@medverse.vn",
                "Patient@123456",
                "Bệnh nhân Lê Văn Bình",
                LocalDate.of(2000, 1, 1),
                "MALE",
                "0901000003",
                "Hải Châu, Đà Nẵng",
                "PATIENT");

        seedPatientMedicalProfile(patient);
        seedAllergies(patient);

        Medication paracetamol = seedMedication(
                "PARA-500",
                "Paracetamol 500mg",
                "Paracetamol",
                "N02BE01",
                "viên",
                "Hộp 10 vỉ x 10 viên",
                "Uống sau ăn.",
                "Quá mẫn với Paracetamol.");

        Medication amoxicillin = seedMedication(
                "AMOX-500",
                "Amoxicillin 500mg",
                "Amoxicillin",
                "J01CA04",
                "viên",
                "Hộp 10 vỉ x 10 viên",
                "Uống theo chỉ định của bác sĩ.",
                "Dị ứng Penicillin hoặc beta-lactam.");

        WorkSlot slot = seedWorkSlot(doctor);
        AppointmentRequest request = seedAppointmentRequest(patient, doctor, general);
        Appointment appointment = seedAppointment(patient, doctor, request, slot);

        MedicalRecord record = seedMedicalRecord(patient, doctor, appointment);
        seedDiagnosis(record);

        Prescription prescription = seedPrescription(patient, doctor, appointment, record);
        seedPrescriptionItem(prescription, paracetamol);
        seedPrescriptionItem(prescription, amoxicillin);

        log.info("MedVerse demo data seeded successfully.");
    }

    private Specialty seedSpecialty(String code, String name, String description) {
        return specialtyRepository.findAll()
                .stream()
                .filter(s -> code.equals(s.getCode()))
                .findFirst()
                .orElseGet(() -> {
                    Specialty specialty = new Specialty();
                    specialty.setCode(code);
                    specialty.setName(name);
                    specialty.setDescription(description);
                    return specialtyRepository.save(specialty);
                });
    }

    private User seedUser(
            String email,
            String rawPassword,
            String fullName,
            LocalDate dateOfBirth,
            String gender,
            String phone,
            String address,
            String roleCode) {
        return userRepository.findByEmail(email)
                .orElseGet(() -> {
                    Role role = roleRepository.findByCode(roleCode)
                            .orElseThrow(() -> new IllegalStateException("Role not found: " + roleCode));

                    User user = new User();
                    user.setEmail(email);
                    user.setPassword(passwordEncoder.encode(rawPassword));
                    user.setStatus(UserStatus.ACTIVE);

                    UserProfile profile = new UserProfile();
                    profile.setUser(user);
                    profile.setFullName(fullName);
                    profile.setDateOfBirth(dateOfBirth);
                    profile.setGender(gender);
                    profile.setPhoneNumber(phone);
                    profile.setAddress(address);
                    user.setUserProfile(profile);

                    UserRole userRole = new UserRole(user, role);
                    user.getUserRoles().add(userRole);

                    return userRepository.save(user);
                });
    }

    private void seedDoctorProfile(User doctor, Specialty specialty) {
        doctorProfileRepository.findByUserId(doctor.getId())
                .orElseGet(() -> {
                    DoctorProfile profile = new DoctorProfile();
                    profile.setUser(doctor);
                    profile.setSpecialty(specialty);
                    profile.setLicenseNumber("CCHN-DEMO-001");
                    profile.setDegree("Bác sĩ CKI");
                    profile.setExperienceYears(8);
                    profile.setBio("Bác sĩ demo chuyên khám tổng quát và tư vấn điều trị ban đầu.");
                    return doctorProfileRepository.save(profile);
                });
    }

    private void seedReceptionistProfile(User receptionist) {
        receptionistProfileRepository.findByUserId(receptionist.getId())
                .orElseGet(() -> {
                    ReceptionistProfile profile = new ReceptionistProfile();
                    profile.setUser(receptionist);
                    profile.setEmployeeId("RECEP-DEMO-001");
                    return receptionistProfileRepository.save(profile);
                });
    }

    private void seedPatientMedicalProfile(User patient) {
        patientMedicalProfileRepository.findByPatientId(patient.getId())
                .orElseGet(() -> {
                    PatientMedicalProfile profile = PatientMedicalProfile.builder()
                            .patient(patient)
                            .bloodType("O+")
                            .heightCm(new BigDecimal("170.00"))
                            .weightKg(new BigDecimal("65.00"))
                            .chronicDiseases("Tăng huyết áp nhẹ")
                            .medicalHistory("Từng bị viêm họng cấp nhiều lần.")
                            .currentMedicationsNote("Không dùng thuốc thường xuyên.")
                            .build();

                    return patientMedicalProfileRepository.save(profile);
                });
    }

    private void seedAllergies(User patient) {
        boolean exists = allergyRepository.findByPatientIdOrderByCreatedAtDesc(patient.getId())
                .stream()
                .anyMatch(a -> "Penicillin".equalsIgnoreCase(a.getAllergen()));

        if (!exists) {
            Allergy allergy = Allergy.builder()
                    .patient(patient)
                    .allergen("Penicillin")
                    .reaction("Nổi mẩn đỏ, ngứa, khó thở nhẹ")
                    .severity(AllergySeverity.HIGH)
                    .note("Cần cảnh báo khi kê kháng sinh nhóm beta-lactam.")
                    .build();

            allergyRepository.save(allergy);
        }
    }

    private Medication seedMedication(
            String code,
            String name,
            String activeIngredient,
            String atcCode,
            String unit,
            String packingSpecification,
            String usageInstruction,
            String contraindication) {
        return medicationRepository.search(code, org.springframework.data.domain.PageRequest.of(0, 1))
                .stream()
                .filter(m -> code.equals(m.getCode()))
                .findFirst()
                .orElseGet(() -> {
                    Medication medication = Medication.builder()
                            .code(code)
                            .name(name)
                            .activeIngredient(activeIngredient)
                            .atcCode(atcCode)
                            .unit(unit)
                            .packingSpecification(packingSpecification)
                            .usageInstruction(usageInstruction)
                            .contraindication(contraindication)
                            .build();

                    return medicationRepository.save(medication);
                });
    }

    private WorkSlot seedWorkSlot(User doctor) {
        OffsetDateTime start = OffsetDateTime.now().plusDays(1).withHour(8).withMinute(0).withSecond(0).withNano(0);
        OffsetDateTime end = start.plusMinutes(30);

        return workSlotRepository.findAll()
                .stream()
                .filter(s -> s.getDoctor().getId().equals(doctor.getId()))
                .findFirst()
                .orElseGet(() -> {
                    WorkSlot slot = WorkSlot.builder()
                            .doctor(doctor)
                            .startTime(start)
                            .endTime(end)
                            .status(WorkSlotStatus.BOOKED)
                            .isRecurring(false)
                            .build();

                    return workSlotRepository.save(slot);
                });
    }

    private AppointmentRequest seedAppointmentRequest(User patient, User doctor, Specialty specialty) {
        return appointmentRequestRepository.findAll()
                .stream()
                .filter(r -> r.getPatient().getId().equals(patient.getId()))
                .findFirst()
                .orElseGet(() -> {
                    AppointmentRequest request = AppointmentRequest.builder()
                            .patient(patient)
                            .doctor(doctor)
                            .specialty(specialty)
                            .desiredDate(LocalDate.now().plusDays(1))
                            .desiredTime("Morning")
                            .type(AppointmentType.OFFLINE)
                            .status(AppointmentRequestStatus.APPROVED)
                            .symptoms("Sốt nhẹ, đau họng, ho khan 3 ngày.")
                            .build();

                    return appointmentRequestRepository.save(request);
                });
    }

    private Appointment seedAppointment(User patient, User doctor, AppointmentRequest request, WorkSlot slot) {
        return appointmentRepository.findAll()
                .stream()
                .filter(a -> a.getPatient().getId().equals(patient.getId()))
                .findFirst()
                .orElseGet(() -> {
                    Appointment appointment = Appointment.builder()
                            .patient(patient)
                            .doctor(doctor)
                            .request(request)
                            .workSlot(slot)
                            .startTime(slot.getStartTime())
                            .endTime(slot.getEndTime())
                            .status(AppointmentStatus.SCHEDULED)
                            .type(AppointmentType.OFFLINE)
                            .diagnosis("Viêm họng cấp")
                            .build();

                    return appointmentRepository.save(appointment);
                });
    }

    private MedicalRecord seedMedicalRecord(User patient, User doctor, Appointment appointment) {
        return medicalRecordRepository.findByAppointmentId(appointment.getId())
                .orElseGet(() -> {
                    MedicalRecord record = MedicalRecord.builder()
                            .appointment(appointment)
                            .patient(patient)
                            .doctor(doctor)
                            .chiefComplaint("Đau họng và sốt nhẹ")
                            .symptoms("Ho khan, đau họng, sốt nhẹ.")
                            .clinicalNote("Bệnh nhân tỉnh, tiếp xúc tốt, họng đỏ nhẹ.")
                            .diagnosisText("Viêm họng cấp")
                            .treatmentPlan("Điều trị triệu chứng, nghỉ ngơi, uống nhiều nước.")
                            .followUpNote("Tái khám sau 3 ngày nếu không giảm.")
                            .status(MedicalRecordStatus.DRAFT)
                            .build();

                    return medicalRecordRepository.save(record);
                });
    }

    private void seedDiagnosis(MedicalRecord record) {
        boolean exists = medicalRecordDiagnosisRepository
                .findByMedicalRecordIdOrderByCreatedAtDesc(record.getId())
                .stream()
                .anyMatch(d -> "J02".equalsIgnoreCase(d.getIcdCode()));

        if (!exists) {
            MedicalRecordDiagnosis diagnosis = MedicalRecordDiagnosis.builder()
                    .medicalRecord(record)
                    .diagnosisText("Viêm họng cấp")
                    .icdCode("J02")
                    .icdDisplay("Acute pharyngitis")
                    .codingSystem("ICD-10")
                    .source(DiagnosisSource.MANUAL)
                    .confidence(new BigDecimal("1.0000"))
                    .acceptedByDoctor(true)
                    .build();

            medicalRecordDiagnosisRepository.save(diagnosis);
        }
    }

    private Prescription seedPrescription(User patient, User doctor, Appointment appointment, MedicalRecord record) {
        return prescriptionRepository.findByMedicalRecordId(record.getId())
                .orElseGet(() -> {
                    Prescription prescription = Prescription.builder()
                            .medicalRecord(record)
                            .appointment(appointment)
                            .patient(patient)
                            .doctor(doctor)
                            .status(PrescriptionStatus.DRAFT)
                            .note("Đơn thuốc demo dùng cho giao diện.")
                            .build();

                    return prescriptionRepository.save(prescription);
                });
    }

    private void seedPrescriptionItem(Prescription prescription, Medication medication) {
        boolean exists = prescriptionItemRepository
                .findByPrescriptionIdOrderByCreatedAtAsc(prescription.getId())
                .stream()
                .anyMatch(i -> medication.getCode().equalsIgnoreCase(
                        i.getMedication() != null ? i.getMedication().getCode() : ""));

        if (!exists) {
            PrescriptionItem item = PrescriptionItem.builder()
                    .prescription(prescription)
                    .medication(medication)
                    .medicationName(medication.getName())
                    .activeIngredient(medication.getActiveIngredient())
                    .atcCode(medication.getAtcCode())
                    .unit(medication.getUnit())
                    .dosage("500mg")
                    .frequency("2 lần/ngày")
                    .duration("3 ngày")
                    .quantity(new BigDecimal("6"))
                    .instruction("Uống sau ăn.")
                    .build();

            prescriptionItemRepository.save(item);
        }
    }
}