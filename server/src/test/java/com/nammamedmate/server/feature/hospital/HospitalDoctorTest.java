package com.nammamedmate.server.feature.hospital;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.AbstractIntegrationTest;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.BranchType;
import com.nammamedmate.server.domain.Doctor;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.DoctorRepository;
import com.nammamedmate.server.persistence.HospitalDepartmentRepository;
import com.nammamedmate.server.persistence.HospitalDoctorRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import com.nammamedmate.server.persistence.UserSessionRepository;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

class HospitalDoctorTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-20T10:30:00Z");

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private UserSessionRepository userSessionRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private HospitalDepartmentRepository hospitalDepartmentRepository;
  @Autowired private HospitalDoctorRepository hospitalDoctorRepository;
  @Autowired private DoctorRepository doctorRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @BeforeEach
  void wipe() {
    hospitalDoctorRepository.deleteAll();
    hospitalDepartmentRepository.deleteAll();
    doctorRepository.deleteAll();
    userSessionRepository.deleteAll();
    locationRepository.deleteAll();
    tenantSubscriptionRepository.deleteAll();
    appUserRepository.deleteAll();
    tenantRepository.deleteAll();
  }

  @Test
  void ac02_persistsHospitalDoctorProfileFields() throws Exception {
    Fixture fx = seedPro("doc-profile");
    UUID departmentId = createDepartment(fx, "General Medicine", "OPD");

    mockMvc
        .perform(
            post("/api/v1/hospital/doctors")
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    doctorJson(
                        "Dr. Mehta",
                        "KA-55555",
                        "9888000001",
                        departmentId,
                        "MBBS, MD",
                        "Cardiology",
                        "Male",
                        12,
                        "mehta@hospital.local",
                        "OPD-3",
                        "Mon,Wed,Fri",
                        "10:00-13:00",
                        50000L,
                        "AVAILABLE",
                        "English, Hindi",
                        "Senior consultant",
                        null)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.name").value("Dr. Mehta"))
        .andExpect(jsonPath("$.data.registrationNumber").value("KA-55555"))
        .andExpect(jsonPath("$.data.qualification").value("MBBS, MD"))
        .andExpect(jsonPath("$.data.specialty").value("Cardiology"))
        .andExpect(jsonPath("$.data.gender").value("Male"))
        .andExpect(jsonPath("$.data.experienceYears").value(12))
        .andExpect(jsonPath("$.data.email").value("mehta@hospital.local"))
        .andExpect(jsonPath("$.data.opdRoom").value("OPD-3"))
        .andExpect(jsonPath("$.data.consultingDays").value("Mon,Wed,Fri"))
        .andExpect(jsonPath("$.data.consultingHours").value("10:00-13:00"))
        .andExpect(jsonPath("$.data.consultationFeePaise").value(50000))
        .andExpect(jsonPath("$.data.status").value("AVAILABLE"))
        .andExpect(jsonPath("$.data.languages").value("English, Hindi"))
        .andExpect(jsonPath("$.data.notes").value("Senior consultant"))
        .andExpect(jsonPath("$.data.departmentName").value("General Medicine"));
  }

  @Test
  void ac03_hospitalDoctorHasNoLoginFields() throws Exception {
    Fixture fx = seedPro("doc-nologin");
    mockMvc
        .perform(
            post("/api/v1/hospital/doctors")
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    doctorJson(
                        "Dr. Shah",
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        0L,
                        "VISITING",
                        null,
                        null,
                        null)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.password").doesNotExist())
        .andExpect(jsonPath("$.data.passwordHash").doesNotExist())
        .andExpect(jsonPath("$.data.pin").doesNotExist())
        .andExpect(jsonPath("$.data.session").doesNotExist());
  }

  @Test
  void ac04_reusesExistingM3DoctorByRegistration() throws Exception {
    Fixture fx = seedPro("doc-reuse");
    UUID existingDoctorId = persistDoctor(fx.tenantId(), "Dr. Legacy", "KA-77777");

    MvcResult attached =
        mockMvc
            .perform(
                post("/api/v1/hospital/doctors")
                    .cookie(fx.owner())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        doctorJson(
                            "Dr. Legacy",
                            "KA-77777",
                            "9888111111",
                            null,
                            "MBBS",
                            "General",
                            null,
                            null,
                            null,
                            null,
                            null,
                            null,
                            25000L,
                            "AVAILABLE",
                            null,
                            null,
                            null)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.doctorId").value(existingDoctorId.toString()))
            .andReturn();

    assertThat(doctorRepository.count()).isEqualTo(1);
    assertThat(hospitalDoctorRepository.count()).isEqualTo(1);

    mockMvc
        .perform(
            post("/api/v1/hospital/doctors")
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    doctorJson(
                        "Dr. Duplicate",
                        "KA-77777",
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        0L,
                        "AVAILABLE",
                        null,
                        null,
                        null)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("REGISTRATION_TAKEN"));

    UUID doctorId = doctorId(attached);
    mockMvc
        .perform(
            put("/api/v1/hospital/doctors/" + doctorId)
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    doctorJson(
                        "Dr. Legacy Updated",
                        "KA-77777",
                        "9888222222",
                        null,
                        "MBBS, MD",
                        "General",
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        30000L,
                        "ON_LEAVE",
                        null,
                        "On leave till month end",
                        0L)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.name").value("Dr. Legacy Updated"))
        .andExpect(jsonPath("$.data.status").value("ON_LEAVE"));
  }

  @Test
  void ac05_blankNameForeignTenantAndCashierDenied() throws Exception {
    Fixture fx = seedPro("doc-guard");
    mockMvc
        .perform(
            post("/api/v1/hospital/doctors")
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    doctorJson(
                        "",
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        0L,
                        "AVAILABLE",
                        null,
                        null,
                        null)))
        .andExpect(status().isBadRequest());

    Cookie cashier = staffWithPredefined(fx, "cashier", "cash@doc-guard.local");
    mockMvc
        .perform(
            post("/api/v1/hospital/doctors")
                .cookie(cashier)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    doctorJson(
                        "Dr. Blocked",
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        0L,
                        "AVAILABLE",
                        null,
                        null,
                        null)))
        .andExpect(status().isForbidden());

    MvcResult created =
        mockMvc
            .perform(
                post("/api/v1/hospital/doctors")
                    .cookie(fx.owner())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        doctorJson(
                            "Dr. Iso",
                            null,
                            null,
                            null,
                            null,
                            null,
                            null,
                            null,
                            null,
                            null,
                            null,
                            null,
                            0L,
                            "AVAILABLE",
                            null,
                            null,
                            null)))
            .andReturn();
    UUID doctorId = doctorId(created);

    Fixture fxB = seedPro("doc-iso-b");
    mockMvc
        .perform(
            put("/api/v1/hospital/doctors/" + doctorId)
                .cookie(fxB.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    doctorJson(
                        "Cross tenant",
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        0L,
                        "AVAILABLE",
                        null,
                        null,
                        null)))
        .andExpect(status().isNotFound());

    mockMvc
        .perform(get("/api/v1/hospital/doctors").cookie(fx.owner()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(1)));
  }

  private UUID createDepartment(Fixture fx, String name, String type) throws Exception {
    MvcResult result =
        mockMvc
            .perform(
                post("/api/v1/hospital/departments")
                    .cookie(fx.owner())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {"name":"%s","type":"%s"}
                        """
                            .formatted(name, type)))
            .andExpect(status().isOk())
            .andReturn();
    return UUID.fromString(
        objectMapper
            .readTree(result.getResponse().getContentAsString())
            .path("data")
            .path("id")
            .asText());
  }

  private String doctorJson(
      String name,
      String registration,
      String phone,
      UUID departmentId,
      String qualification,
      String specialty,
      String gender,
      Integer experienceYears,
      String email,
      String opdRoom,
      String consultingDays,
      String consultingHours,
      Long feePaise,
      String status,
      String languages,
      String notes,
      Long version) {
    return """
        {
          "name":"%s",
          "registrationNumber":%s,
          "phone":%s,
          "departmentId":%s,
          "qualification":%s,
          "specialty":%s,
          "gender":%s,
          "experienceYears":%s,
          "email":%s,
          "opdRoom":%s,
          "consultingDays":%s,
          "consultingHours":%s,
          "consultationFeePaise":%s,
          "status":"%s",
          "languages":%s,
          "notes":%s,
          "expectedVersion":%s
        }
        """
        .formatted(
            name,
            jsonString(registration),
            jsonString(phone),
            jsonUuid(departmentId),
            jsonString(qualification),
            jsonString(specialty),
            jsonString(gender),
            experienceYears == null ? "null" : experienceYears.toString(),
            jsonString(email),
            jsonString(opdRoom),
            jsonString(consultingDays),
            jsonString(consultingHours),
            feePaise == null ? "null" : feePaise.toString(),
            status,
            jsonString(languages),
            jsonString(notes),
            version == null ? "null" : version.toString());
  }

  private static String jsonString(String value) {
    if (value == null) {
      return "null";
    }
    return "\"" + value + "\"";
  }

  private static String jsonUuid(UUID value) {
    if (value == null) {
      return "null";
    }
    return "\"" + value + "\"";
  }

  private UUID doctorId(MvcResult result) throws Exception {
    return UUID.fromString(
        objectMapper
            .readTree(result.getResponse().getContentAsString())
            .path("data")
            .path("doctorId")
            .asText());
  }

  private UUID persistDoctor(UUID tenantId, String name, String registration) {
    Doctor doctor = new Doctor();
    doctor.setId(UUID.randomUUID());
    doctor.setTenantId(tenantId);
    doctor.setName(name);
    doctor.setRegistrationNumber(registration);
    doctor.setCreatedAt(T0);
    doctor.setUpdatedAt(T0);
    return doctorRepository.saveAndFlush(doctor).getId();
  }

  private Fixture seedPro(String slug) throws Exception {
    Tenant tenant = persistTenant(slug, slug + " Chemist");
    persistPlan(tenant.getId(), PlanCode.PRO);
    persistUser(tenant.getId(), "owner@" + slug + ".local", AppUserRole.pharmacy_owner);
    Location branch = persistBranch(tenant.getId(), "Main", "BR01");
    Cookie owner = login("owner@" + slug + ".local");
    selectBranch(owner, branch.getId());
    return new Fixture(slug, tenant.getId(), branch.getId(), owner);
  }

  private Cookie staffWithPredefined(Fixture fx, String roleCode, String email) throws Exception {
    AppUser staff = persistUser(fx.tenantId(), email, AppUserRole.pharmacy_staff);
    UUID roleId = predefinedRoleId(fx.owner(), roleCode);
    mockMvc
        .perform(
            put("/api/v1/users/" + staff.getId() + "/roles")
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleIds\":[\"" + roleId + "\"]}"))
        .andExpect(status().isOk());
    assignBranch(fx.owner(), staff.getId(), fx.branchId());
    Cookie cookie = login(email);
    selectBranch(cookie, fx.branchId());
    return cookie;
  }

  private UUID predefinedRoleId(Cookie owner, String code) throws Exception {
    MvcResult result = mockMvc.perform(get("/api/v1/roles").cookie(owner)).andReturn();
    var roles =
        objectMapper.readTree(result.getResponse().getContentAsString()).path("data").path("roles");
    for (var role : roles) {
      if (code.equals(role.path("code").asText())) {
        return UUID.fromString(role.path("id").asText());
      }
    }
    throw new AssertionError("missing predefined role " + code);
  }

  private Cookie login(String email) throws Exception {
    MvcResult result =
        mockMvc
            .perform(
                post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}"))
            .andExpect(status().isOk())
            .andReturn();
    return result.getResponse().getCookie("nmm_access");
  }

  private void selectBranch(Cookie cookie, UUID branchId) throws Exception {
    mockMvc
        .perform(
            post("/api/v1/session/branch")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchId\":\"" + branchId + "\"}"))
        .andExpect(status().isOk());
  }

  private void assignBranch(Cookie owner, UUID userId, UUID branchId) throws Exception {
    mockMvc
        .perform(
            put("/api/v1/users/" + userId + "/branches")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchIds\":[\"" + branchId + "\"]}"))
        .andExpect(status().isOk());
  }

  private Tenant persistTenant(String slug, String name) {
    Tenant tenant = new Tenant();
    tenant.setId(UUID.randomUUID());
    tenant.setSlug(slug);
    tenant.setName(name);
    tenant.setStatus(TenantStatus.ACTIVE);
    tenant.setEmailVerifiedAt(T0);
    tenant.setCreatedAt(T0);
    tenant.setUpdatedAt(T0);
    return tenantRepository.saveAndFlush(tenant);
  }

  private void persistPlan(UUID tenantId, PlanCode plan) {
    TenantSubscription sub = new TenantSubscription();
    sub.setId(UUID.randomUUID());
    sub.setTenantId(tenantId);
    sub.setPlanCode(plan);
    sub.setStatus(SubscriptionStatus.ACTIVE);
    sub.setStartedAt(T0);
    sub.setCreatedAt(T0);
    sub.setUpdatedAt(T0);
    tenantSubscriptionRepository.saveAndFlush(sub);
  }

  private AppUser persistUser(UUID tenantId, String email, AppUserRole role) {
    AppUser user = new AppUser();
    user.setId(UUID.randomUUID());
    user.setTenantId(tenantId);
    user.setEmail(email);
    user.setDisplayName(email.split("@")[0]);
    user.setRole(role);
    user.setStatus(UserAccountStatus.ACTIVE);
    user.setActive(true);
    user.setPasswordHash(passwordEncoder.encode(PASSWORD));
    user.setCreatedAt(T0);
    user.setUpdatedAt(T0);
    return appUserRepository.saveAndFlush(user);
  }

  private Location persistBranch(UUID tenantId, String name, String code) {
    Location branch = new Location();
    branch.setId(UUID.randomUUID());
    branch.setTenantId(tenantId);
    branch.setName(name);
    branch.setBranchCode(code);
    branch.setAddressLine("12 MG Road");
    branch.setCity("Bengaluru");
    branch.setState("KA");
    branch.setPincode("560001");
    branch.setContactPhone("9876543210");
    branch.setDrugLicenseNumber("DL-" + code);
    Map<String, Object> hours = new LinkedHashMap<>();
    Map<String, Object> mon = new LinkedHashMap<>();
    mon.put("open", "09:00");
    mon.put("close", "21:00");
    hours.put("mon", mon);
    branch.setOperatingHours(hours);
    branch.setBranchType(BranchType.RETAIL);
    branch.setStatus(BranchStatus.ACTIVE);
    branch.setOpeningDate(LocalDate.of(2026, 9, 1));
    branch.setDefaultBranch(true);
    branch.setLinkedWarehouse(false);
    branch.setCreatedAt(T0);
    branch.setUpdatedAt(T0);
    return locationRepository.saveAndFlush(branch);
  }

  private record Fixture(String slug, UUID tenantId, UUID branchId, Cookie owner) {}
}
