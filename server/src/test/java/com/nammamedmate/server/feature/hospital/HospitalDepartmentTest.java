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

class HospitalDepartmentTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-20T10:00:00Z");

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private UserSessionRepository userSessionRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private HospitalDepartmentRepository hospitalDepartmentRepository;
  @Autowired private DoctorRepository doctorRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @BeforeEach
  void wipe() {
    hospitalDepartmentRepository.deleteAll();
    doctorRepository.deleteAll();
    userSessionRepository.deleteAll();
    locationRepository.deleteAll();
    tenantSubscriptionRepository.deleteAll();
    appUserRepository.deleteAll();
    tenantRepository.deleteAll();
  }

  @Test
  void ac01_ownerCreatesAndUpdatesDepartmentWithHeadDoctor() throws Exception {
    Fixture fx = seedPro("dept-owner");
    UUID headDoctorId = persistDoctor(fx.tenantId(), "Dr. Rao", "KA-90001");

    MvcResult created =
        mockMvc
            .perform(
                post("/api/v1/hospital/departments")
                    .cookie(fx.owner())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        departmentJson("General Medicine", "OPD", headDoctorId.toString(), null)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.name").value("General Medicine"))
            .andExpect(jsonPath("$.data.type").value("OPD"))
            .andExpect(jsonPath("$.data.headDoctorId").value(headDoctorId.toString()))
            .andExpect(jsonPath("$.data.headDoctorName").value("Dr. Rao"))
            .andReturn();

    UUID departmentId = departmentId(created);
    long version = departmentVersion(created);

    mockMvc
        .perform(
            put("/api/v1/hospital/departments/" + departmentId)
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    departmentJson(
                        "General Medicine — IPD", "IPD", headDoctorId.toString(), version)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.name").value("General Medicine — IPD"))
        .andExpect(jsonPath("$.data.type").value("IPD"));
  }

  @Test
  void ac01_pharmacistCanManageDepartments() throws Exception {
    Fixture fx = seedPro("dept-pharm");
    Cookie pharmacist = staffWithPredefined(fx, "pharmacist", "pharm@dept-pharm.local");

    mockMvc
        .perform(
            post("/api/v1/hospital/departments")
                .cookie(pharmacist)
                .contentType(MediaType.APPLICATION_JSON)
                .content(departmentJson("Diagnostics", "DIAGNOSTIC", null, null)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.type").value("DIAGNOSTIC"));
  }

  @Test
  void ac05_duplicateNameBlankNameCashierPlanLimitAndForeignTenant() throws Exception {
    Fixture fx = seedPro("dept-guard");
    mockMvc
        .perform(
            post("/api/v1/hospital/departments")
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(departmentJson("Cardiology", "OPD", null, null)))
        .andExpect(status().isOk());

    mockMvc
        .perform(
            post("/api/v1/hospital/departments")
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(departmentJson("cardiology", "IPD", null, null)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("DUPLICATE_NAME"));

    mockMvc
        .perform(
            post("/api/v1/hospital/departments")
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(departmentJson("", "OPD", null, null)))
        .andExpect(status().isBadRequest());

    Cookie cashier = staffWithPredefined(fx, "cashier", "cash@dept-guard.local");
    mockMvc
        .perform(
            post("/api/v1/hospital/departments")
                .cookie(cashier)
                .contentType(MediaType.APPLICATION_JSON)
                .content(departmentJson("Blocked", "OPD", null, null)))
        .andExpect(status().isForbidden());

    assertThat(hospitalDepartmentRepository.count()).isEqualTo(1);

    Tenant freeTenant = persistTenant("free-dept", "Free Dept");
    persistPlan(freeTenant.getId(), PlanCode.FREE);
    persistUser(freeTenant.getId(), "owner@free-dept.local", AppUserRole.pharmacy_owner);
    Cookie freeOwner = login("owner@free-dept.local");
    mockMvc
        .perform(get("/api/v1/hospital/departments").cookie(freeOwner))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("PLAN_LIMIT"));

    Fixture fxB = seedPro("dept-iso-b");
    MvcResult created =
        mockMvc
            .perform(
                post("/api/v1/hospital/departments")
                    .cookie(fx.owner())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(departmentJson("Isolation", "OPD", null, null)))
            .andReturn();
    UUID departmentId = departmentId(created);

    mockMvc
        .perform(
            put("/api/v1/hospital/departments/" + departmentId)
                .cookie(fxB.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(departmentJson("Cross", "OPD", null, null)))
        .andExpect(status().isNotFound());
  }

  @Test
  void ac05_staleUpdateReturnsConflict() throws Exception {
    Fixture fx = seedPro("dept-stale");
    MvcResult created =
        mockMvc
            .perform(
                post("/api/v1/hospital/departments")
                    .cookie(fx.owner())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(departmentJson("Stale Dept", "OPD", null, null)))
            .andReturn();
    UUID departmentId = departmentId(created);
    long version = departmentVersion(created);

    mockMvc
        .perform(
            put("/api/v1/hospital/departments/" + departmentId)
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(departmentJson("Stale Dept", "OPD", null, 99L)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("STALE_STATE"));

    mockMvc
        .perform(get("/api/v1/hospital/departments").cookie(fx.owner()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(1)))
        .andExpect(jsonPath("$.data.items[0].version").value(version));
  }

  private String departmentJson(String name, String type, String headDoctorId, Long version) {
    String headJson = headDoctorId == null ? "null" : "\"" + headDoctorId + "\"";
    String versionJson = version == null ? "null" : version.toString();
    return """
        {
          "name":"%s",
          "type":"%s",
          "headDoctorId":%s,
          "expectedVersion":%s
        }
        """
        .formatted(name, type, headJson, versionJson);
  }

  private UUID departmentId(MvcResult result) throws Exception {
    return UUID.fromString(
        objectMapper
            .readTree(result.getResponse().getContentAsString())
            .path("data")
            .path("id")
            .asText());
  }

  private long departmentVersion(MvcResult result) throws Exception {
    return objectMapper
        .readTree(result.getResponse().getContentAsString())
        .path("data")
        .path("version")
        .asLong();
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
