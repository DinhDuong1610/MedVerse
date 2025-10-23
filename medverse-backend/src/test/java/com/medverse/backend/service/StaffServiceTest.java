package com.medverse.backend.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.medverse.backend.entity.*;
import com.medverse.backend.payload.staff.*;
import com.medverse.backend.repository.*;
import com.medverse.backend.utils.enumeration.RoleCode;
import com.medverse.backend.utils.enumeration.UserStatus;
import com.medverse.backend.utils.exception.DuplicateResourceException;
import com.medverse.backend.utils.exception.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@ExtendWith(MockitoExtension.class)
class StaffServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private SpecialtyRepository specialtyRepository;
    @Mock
    private RoleRepository roleRepository;
    @Mock
    private DoctorProfileRepository doctorProfileRepository;
    @Mock
    private ReceptionistProfileRepository receptionistProfileRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private AuditService auditService;

    private StaffService staffService;

    @Captor
    private ArgumentCaptor<List<String>> roleCodesCaptor;
    @Captor
    private ArgumentCaptor<User> userCaptor;
    @Captor
    private ArgumentCaptor<DoctorProfile> doctorProfileCaptor;
    @Captor
    private ArgumentCaptor<ReceptionistProfile> receptionistProfileCaptor;
    @Captor
    private ArgumentCaptor<String> auditDetailsCaptor;
    @Captor
    private ArgumentCaptor<User> deletedUserCaptor;

    private ObjectMapper realObjectMapper;

    @BeforeEach
    void setUp() {
        realObjectMapper = new ObjectMapper();
        realObjectMapper.findAndRegisterModules();

        staffService = new StaffService(
                userRepository,
                specialtyRepository,
                roleRepository,
                doctorProfileRepository,
                receptionistProfileRepository,
                passwordEncoder,
                auditService,
                realObjectMapper);
    }

    @Test
    void findAllSpecialties_Success_ShouldReturnListOfSpecialtyDtos() {
        Specialty specialty1 = new Specialty(UUID.randomUUID(), "CARDIO", "Tim mạch", "Chuyên khoa tim mạch",
                OffsetDateTime.now(), OffsetDateTime.now(), null);
        Specialty specialty2 = new Specialty(UUID.randomUUID(), "DERMA", "Da liễu", "Chuyên khoa da liễu",
                OffsetDateTime.now(), OffsetDateTime.now(), null);
        List<Specialty> mockSpecialties = List.of(specialty1, specialty2);
        when(specialtyRepository.findAll()).thenReturn(mockSpecialties);

        List<SpecialtyDto> resultDtos = staffService.findAllSpecialties();

        assertNotNull(resultDtos);
        assertEquals(2, resultDtos.size());
        assertEquals("CARDIO", resultDtos.get(0).getCode());
        assertEquals("Da liễu", resultDtos.get(1).getName());
        verify(specialtyRepository, times(1)).findAll();
    }

    @Test
    void findAllStaff_Success_ShouldReturnPageOfStaffListDtos() {
        Role doctorRole = new Role(UUID.randomUUID(), "DOCTOR", "Doctor", null, new HashSet<>(), new HashSet<>());
        Role adminRole = new Role(UUID.randomUUID(), "ADMIN", "Admin", null, new HashSet<>(), new HashSet<>());

        User user1 = new User();
        user1.setId(UUID.randomUUID());
        user1.setEmail("doctor@test.com");
        user1.setStatus(UserStatus.ACTIVE);
        user1.setCreatedAt(LocalDateTime.now());
        UserProfile profile1 = new UserProfile(UUID.randomUUID(), user1, "Dr. John Doe", LocalDate.now().minusYears(30),
                "Male", "0912345678", "123 Main St");
        user1.setUserProfile(profile1);
        UserRole userRole1 = new UserRole(user1, doctorRole);
        user1.setUserRoles(Set.of(userRole1));

        User user2 = new User();
        user2.setId(UUID.randomUUID());
        user2.setEmail("admin@test.com");
        user2.setStatus(UserStatus.ACTIVE);
        user2.setCreatedAt(LocalDateTime.now().minusDays(1));
        UserProfile profile2 = new UserProfile(UUID.randomUUID(), user2, "Admin User", LocalDate.now().minusYears(40),
                "Female", "0987654321", "456 Oak Ave");
        user2.setUserProfile(profile2);
        UserRole userRole2 = new UserRole(user2, adminRole);
        user2.setUserRoles(Set.of(userRole2));

        Pageable mockPageable = PageRequest.of(0, 10);
        Page<User> mockUserPage = new PageImpl<>(List.of(user1, user2), mockPageable, 2);
        when(userRepository.findUsersByRoleCodes(anyList(), any(Pageable.class))).thenReturn(mockUserPage);

        Page<StaffListDto> resultPage = staffService.findAllStaff(mockPageable);

        assertNotNull(resultPage);
        assertEquals(2, resultPage.getTotalElements());
        assertEquals(2, resultPage.getContent().size());
        assertEquals("doctor@test.com", resultPage.getContent().get(0).getEmail());
        assertEquals("Admin User", resultPage.getContent().get(1).getFullName());
        assertTrue(resultPage.getContent().get(0).getRoles().contains("DOCTOR"));
        assertTrue(resultPage.getContent().get(1).getRoles().contains("ADMIN"));

        verify(userRepository, times(1)).findUsersByRoleCodes(roleCodesCaptor.capture(), eq(mockPageable));
        List<String> capturedRoleCodes = roleCodesCaptor.getValue();
        assertEquals(3, capturedRoleCodes.size());
        assertTrue(capturedRoleCodes.containsAll(List.of("ADMIN", "DOCTOR", "RECEPTIONIST")));
    }

    @Nested
    class CreateStaffTests {
        private StaffCreateRequest baseRequest;
        private Role doctorRole;
        private Role receptionistRole;
        private Specialty cardioSpecialty;

        @BeforeEach
        void setupCreateTest() {
            baseRequest = new StaffCreateRequest();
            baseRequest.setEmail("new.staff@medverse.com");
            baseRequest.setPassword("Password123!");
            baseRequest.setFullName("New Staff Member");

            doctorRole = new Role(UUID.randomUUID(), "DOCTOR", "Doctor", null, new HashSet<>(), new HashSet<>());
            receptionistRole = new Role(UUID.randomUUID(), "RECEPTIONIST", "Receptionist", null, new HashSet<>(),
                    new HashSet<>());
            cardioSpecialty = new Specialty(UUID.randomUUID(), "CARDIO", "Tim mạch", null, OffsetDateTime.now(),
                    OffsetDateTime.now(), null);

            lenient().when(userRepository.findByEmail(baseRequest.getEmail())).thenReturn(Optional.empty());
            lenient().when(passwordEncoder.encode(baseRequest.getPassword())).thenReturn("hashedPassword");

            lenient().when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
                User userToSave = invocation.getArgument(0);
                if (userToSave.getId() == null) {
                    userToSave.setId(UUID.randomUUID());
                }
                if (userToSave.getUserProfile() != null) {
                    userToSave.getUserProfile().setUser(userToSave);
                }
                userToSave.getUserRoles().forEach(ur -> ur.setUser(userToSave));
                return userToSave;
            });
            lenient().when(userRepository.findById(any(UUID.class))).thenAnswer(invocation -> {
                UUID requestedId = invocation.getArgument(0);
                User dummyUser = new User();
                dummyUser.setId(requestedId);
                dummyUser.setEmail(baseRequest.getEmail());
                UserProfile dummyProfile = new UserProfile();
                dummyProfile.setFullName(baseRequest.getFullName());
                dummyUser.setUserProfile(dummyProfile);
                Role role = baseRequest.getRole() == RoleCode.DOCTOR ? doctorRole : receptionistRole;
                dummyUser.setUserRoles(Set.of(new UserRole(dummyUser, role)));
                dummyUser.setCreatedAt(LocalDateTime.now()); // **FIX:** Thêm createdAt cho mapper

                return Optional.of(dummyUser);
            });
        }

        @Test
        void createStaff_Success_ForDoctor() throws JsonProcessingException {
            baseRequest.setRole(RoleCode.DOCTOR);
            DoctorProfileRequest docProfileRequest = new DoctorProfileRequest();
            docProfileRequest.setSpecialtyId(cardioSpecialty.getId());
            docProfileRequest.setLicenseNumber("DOC123");
            docProfileRequest.setExperienceYears(5);
            baseRequest.setDoctorProfile(docProfileRequest);

            when(roleRepository.findByCode("DOCTOR")).thenReturn(Optional.of(doctorRole));
            when(specialtyRepository.findById(cardioSpecialty.getId())).thenReturn(Optional.of(cardioSpecialty));
            when(doctorProfileRepository.save(any(DoctorProfile.class))).thenAnswer(inv -> inv.getArgument(0));

            StaffListDto resultDto = staffService.createStaff(baseRequest);

            assertNotNull(resultDto);
            assertEquals(baseRequest.getEmail(), resultDto.getEmail());
            assertEquals(baseRequest.getFullName(), resultDto.getFullName());
            assertTrue(resultDto.getRoles().contains("DOCTOR"));

            verify(userRepository, times(1)).save(userCaptor.capture());
            User savedUser = userCaptor.getValue();
            assertEquals("hashedPassword", savedUser.getPassword());
            assertEquals(UserStatus.ACTIVE, savedUser.getStatus());
            assertEquals(1, savedUser.getUserRoles().size());
            assertEquals("DOCTOR", savedUser.getUserRoles().iterator().next().getRole().getCode());

            verify(doctorProfileRepository, times(1)).save(doctorProfileCaptor.capture());
            DoctorProfile savedDocProfile = doctorProfileCaptor.getValue();
            assertEquals(savedUser, savedDocProfile.getUser());
            assertEquals(cardioSpecialty, savedDocProfile.getSpecialty());
            assertEquals("DOC123", savedDocProfile.getLicenseNumber());
            assertEquals(5, savedDocProfile.getExperienceYears());

            verify(auditService, times(1)).record(eq("CREATE_STAFF"), eq("USER"), eq(savedUser.getId().toString()),
                    auditDetailsCaptor.capture());
            String detailsJson = auditDetailsCaptor.getValue();
            Map<String, Object> detailsMap = realObjectMapper.readValue(detailsJson, Map.class);
            assertEquals("new.staff@medverse.com", detailsMap.get("email"));
            assertEquals("DOCTOR", detailsMap.get("role"));
        }

        @Test
        void createStaff_Success_ForReceptionist() {
            baseRequest.setRole(RoleCode.RECEPTIONIST);
            ReceptionistProfileRequest recepProfileRequest = new ReceptionistProfileRequest();
            recepProfileRequest.setEmployeeId("REC001");
            baseRequest.setReceptionistProfile(recepProfileRequest);

            when(roleRepository.findByCode("RECEPTIONIST")).thenReturn(Optional.of(receptionistRole));
            when(receptionistProfileRepository.save(any(ReceptionistProfile.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            StaffListDto resultDto = staffService.createStaff(baseRequest);

            assertNotNull(resultDto);
            assertTrue(resultDto.getRoles().contains("RECEPTIONIST"));

            verify(userRepository, times(1)).save(userCaptor.capture());
            User savedUser = userCaptor.getValue();

            verify(receptionistProfileRepository, times(1)).save(receptionistProfileCaptor.capture());
            ReceptionistProfile savedRecepProfile = receptionistProfileCaptor.getValue();
            assertEquals(savedUser, savedRecepProfile.getUser());
            assertEquals("REC001", savedRecepProfile.getEmployeeId());

            verify(auditService, times(1)).record(eq("CREATE_STAFF"), eq("USER"), eq(savedUser.getId().toString()),
                    anyString());
        }

        @Test
        void createStaff_FailsWhenEmailExists() {
            when(userRepository.findByEmail(baseRequest.getEmail())).thenReturn(Optional.of(new User()));
            baseRequest.setRole(RoleCode.DOCTOR);
            baseRequest.setDoctorProfile(new DoctorProfileRequest());

            assertThrows(DuplicateResourceException.class, () -> {
                staffService.createStaff(baseRequest);
            });

            verify(userRepository, never()).save(any(User.class));
            verify(doctorProfileRepository, never()).save(any(DoctorProfile.class));
            verify(auditService, never()).record(any(), any(), any(), any());
        }

        @Test
        void createStaff_FailsForPatientRole() {
            baseRequest.setRole(RoleCode.PATIENT);

            assertThrows(IllegalArgumentException.class, () -> {
                staffService.createStaff(baseRequest);
            });

            verify(userRepository, never()).save(any(User.class));
        }

        @Test
        void createStaff_FailsWhenDoctorProfileMissing() {
            baseRequest.setRole(RoleCode.DOCTOR);
            baseRequest.setDoctorProfile(null);

            assertThrows(IllegalArgumentException.class, () -> {
                staffService.createStaff(baseRequest);
            });

            verify(userRepository, never()).save(any(User.class));
        }

        @Test
        void createStaff_FailsWhenSpecialtyNotFound() {
            baseRequest.setRole(RoleCode.DOCTOR);
            DoctorProfileRequest docProfileRequest = new DoctorProfileRequest();
            UUID invalidSpecialtyId = UUID.randomUUID();
            docProfileRequest.setSpecialtyId(invalidSpecialtyId);
            baseRequest.setDoctorProfile(docProfileRequest);

            when(roleRepository.findByCode("DOCTOR")).thenReturn(Optional.of(doctorRole));
            when(specialtyRepository.findById(invalidSpecialtyId)).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class, () -> {
                staffService.createStaff(baseRequest);
            });

            verify(userRepository, times(1)).save(any(User.class));
            verify(doctorProfileRepository, never()).save(any(DoctorProfile.class));
        }
    }

    @Nested
    class FindStaffByIdTests {
        @Test
        void findStaffById_FailsWhenUserNotFound() {
            UUID nonExistentUserId = UUID.randomUUID();
            when(userRepository.findById(nonExistentUserId)).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class, () -> {
                staffService.findStaffById(nonExistentUserId);
            });
        }

        @Test
        void findStaffById_FailsWhenUserIsPatient() {
            UUID patientUserId = UUID.randomUUID();
            Role patientRole = new Role(UUID.randomUUID(), "PATIENT", "Patient", null, new HashSet<>(),
                    new HashSet<>());
            User patientUser = new User();
            patientUser.setId(patientUserId);
            patientUser.setEmail("patient@test.com");
            UserProfile patientProfile = new UserProfile(UUID.randomUUID(), patientUser, "Patient Zero", null, null,
                    null, null);
            patientUser.setUserProfile(patientProfile);
            UserRole userRole = new UserRole(patientUser, patientRole);
            patientUser.setUserRoles(Set.of(userRole));

            when(userRepository.findById(patientUserId)).thenReturn(Optional.of(patientUser));

            assertThrows(ResourceNotFoundException.class, () -> {
                staffService.findStaffById(patientUserId);
            });
        }
    }

    @Nested
    class UpdateStaffTests {

        private UUID staffUserId;
        private User existingDoctorUser;
        private DoctorProfile existingDocProfile;
        private StaffUpdateRequest updateRequest;
        private Specialty newSpecialty;

        @BeforeEach
        void setupUpdateTest() {
            staffUserId = UUID.randomUUID();
            Role doctorRole = new Role(UUID.randomUUID(), "DOCTOR", "Doctor", null, new HashSet<>(), new HashSet<>());
            Specialty oldSpecialty = new Specialty(UUID.randomUUID(), "OLD_SPEC", "Old", null, OffsetDateTime.now(),
                    OffsetDateTime.now(), null);

            existingDoctorUser = new User();
            existingDoctorUser.setId(staffUserId);
            existingDoctorUser.setEmail("doctor.to.update@medverse.com");
            existingDoctorUser.setStatus(UserStatus.ACTIVE);
            UserProfile profile = new UserProfile(UUID.randomUUID(), existingDoctorUser, "Dr. To Update", null, null,
                    null, null);
            existingDoctorUser.setUserProfile(profile);
            UserRole userRole = new UserRole(existingDoctorUser, doctorRole);
            existingDoctorUser.setUserRoles(Set.of(userRole));

            existingDocProfile = new DoctorProfile(UUID.randomUUID(), existingDoctorUser, oldSpecialty, "OLD123", "MD",
                    5, "Old Bio");

            updateRequest = new StaffUpdateRequest();
            updateRequest.setFullName("Dr. Updated Name");
            updateRequest.setStatus(UserStatus.LOCKED);

            DoctorProfileRequest docProfileUpdate = new DoctorProfileRequest();
            newSpecialty = new Specialty(UUID.randomUUID(), "NEW_SPEC", "New", null, OffsetDateTime.now(),
                    OffsetDateTime.now(), null);
            docProfileUpdate.setSpecialtyId(newSpecialty.getId());
            docProfileUpdate.setLicenseNumber("NEW456");
            updateRequest.setDoctorProfile(docProfileUpdate);

            lenient().when(userRepository.findById(staffUserId)).thenReturn(Optional.of(existingDoctorUser));
            lenient().when(doctorProfileRepository.findByUserId(staffUserId))
                    .thenReturn(Optional.of(existingDocProfile));
            lenient().when(specialtyRepository.findById(newSpecialty.getId())).thenReturn(Optional.of(newSpecialty));
            lenient().when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
            lenient().when(doctorProfileRepository.save(any(DoctorProfile.class)))
                    .thenAnswer(inv -> inv.getArgument(0));
            lenient().when(doctorProfileRepository.findByUserId(staffUserId))
                    .thenReturn(Optional.of(existingDocProfile));
            lenient().when(receptionistProfileRepository.findByUserId(staffUserId)).thenReturn(Optional.empty());

        }

        @Test
        void updateStaff_FailsWhenUserNotFound() {
            when(userRepository.findById(staffUserId)).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class, () -> {
                staffService.updateStaff(staffUserId, updateRequest);
            });
            verify(userRepository, never()).save(any(User.class));
        }

    }

    @Nested
    class DeactivateStaffTests {

        private UUID staffUserId;
        private User activeStaffUser;

        @BeforeEach
        void setupDeactivateTest() {
            staffUserId = UUID.randomUUID();
            Role receptionistRole = new Role(UUID.randomUUID(), "RECEPTIONIST", "Receptionist", null, new HashSet<>(),
                    new HashSet<>());

            activeStaffUser = new User();
            activeStaffUser.setId(staffUserId);
            activeStaffUser.setEmail("staff.to.delete@medverse.com");
            activeStaffUser.setStatus(UserStatus.ACTIVE);
            UserProfile profile = new UserProfile(UUID.randomUUID(), activeStaffUser, "Staff To Delete", null, null,
                    null, null);
            activeStaffUser.setUserProfile(profile);
            UserRole userRole = new UserRole(activeStaffUser, receptionistRole);
            activeStaffUser.setUserRoles(Set.of(userRole));

            lenient().when(userRepository.findById(staffUserId)).thenReturn(Optional.of(activeStaffUser));
        }

        @Test
        void deactivateStaff_Success_ShouldSoftDeleteUser() {
            staffService.deactivateStaff(staffUserId);
            verify(userRepository, times(1)).delete(deletedUserCaptor.capture());
            assertEquals(staffUserId, deletedUserCaptor.getValue().getId());

            verify(auditService, times(1)).record(eq("DEACTIVATE_STAFF"), eq("USER"), eq(staffUserId.toString()),
                    anyString());
        }

        @Test
        void deactivateStaff_FailsWhenUserNotFound() {
            when(userRepository.findById(staffUserId)).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class, () -> {
                staffService.deactivateStaff(staffUserId);
            });
            verify(userRepository, never()).delete(any(User.class));
            verify(auditService, never()).record(any(), any(), any(), any());
        }

        @Test
        void deactivateStaff_FailsForPatient() {
            Role patientRole = new Role(UUID.randomUUID(), "PATIENT", "Patient", null, new HashSet<>(),
                    new HashSet<>());
            UserRole userRole = new UserRole(activeStaffUser, patientRole);
            activeStaffUser.setUserRoles(Set.of(userRole));

            assertThrows(IllegalArgumentException.class, () -> {
                staffService.deactivateStaff(staffUserId);
            });
            verify(userRepository, never()).delete(any(User.class));
        }
    }
}
