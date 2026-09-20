package com.nammamedmate.server.feature.hospital;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.AbstractIntegrationTest;
import com.nammamedmate.server.application.hospital.HospitalWardService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.BranchType;
import com.nammamedmate.server.domain.HospitalBedOccupancy;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.HospitalAdmissionRepository;
import com.nammamedmate.server.persistence.HospitalBedRepository;
import com.nammamedmate.server.persistence.HospitalWardRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import com.nammamedmate.server.persistence.UserAccessRoleRepository;
import com.nammamedmate.server.persistence.UserBranchRepository;
import com.nammamedmate.server.persistence.UserSessionRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

class HospitalWardTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-20T09:00:00Z");

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private HospitalWardService hospitalWardService;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private UserSessionRepository userSessionRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private UserBranchRepository userBranchRepository;
  @Autowired private UserAccessRoleRepository userAccessRoleRepository;
  @Autowired private HospitalWardRepository hospitalWardRepository;
  @Autowired private HospitalBedRepository hospitalBedRepository;
  @Autowired private HospitalAdmissionRepository hospitalAdmissionRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @BeforeEach
  void wipe() {
    hospitalAdmissionRepository.deleteAll();
    hospitalBedRepository.deleteAll();
    hospitalWardRepository.deleteAll();
    userBranchRepository.deleteAll();
    userAccessRoleRepository.deleteAll();
    userSessionRepository.deleteAll();
    locationRepository.deleteAll();
    tenantSubscriptionRepository.deleteAll();
    appUserRepository.deleteAll();
    tenantRepository.deleteAll();
  }

  @Test
  void ac01_ownerCreatesAndEditsWardMaster() throws Exception {
    Fixture fx = seedPro("ward-owner");
    MvcResult created =
        mockMvc
            .perform(
                post("/api/v1/hospital/wards")
                    .cookie(fx.owner())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        wardJson("General Ward A", "GWA", "2", "GENERAL", 4, "Sister Meena", null)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.name").value("General Ward A"))
            .andExpect(jsonPath("$.data.code").value("GWA"))
            .andExpect(jsonPath("$.data.floor").value("2"))
            .andExpect(jsonPath("$.data.category").value("GENERAL"))
            .andExpect(jsonPath("$.data.capacity").value(4))
            .andExpect(jsonPath("$.data.nurseInCharge").value("Sister Meena"))
            .andReturn();

    UUID wardId = wardId(created);
    long version = wardVersion(created);

    mockMvc
        .perform(
            put("/api/v1/hospital/wards/" + wardId)
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    wardJson(
                        "General Ward A — updated", "GWA", "3", "ICU", 4, "Sister Anu", version)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.name").value("General Ward A — updated"))
        .andExpect(jsonPath("$.data.floor").value("3"))
        .andExpect(jsonPath("$.data.category").value("ICU"))
        .andExpect(jsonPath("$.data.nurseInCharge").value("Sister Anu"));
  }

  @Test
  void ac01_pharmacistCanCreateWard() throws Exception {
    Fixture fx = seedPro("ward-pharm");
    Cookie pharmacist = staffWithPredefined(fx, "pharmacist", "pharm@ward-pharm.local");

    mockMvc
        .perform(
            post("/api/v1/hospital/wards")
                .cookie(pharmacist)
                .contentType(MediaType.APPLICATION_JSON)
                .content(wardJson("Pediatric", "PED", "1", "PEDIATRIC", 2, null, null)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.name").value("Pediatric"));
  }

  @Test
  void ac02_creatingWardAllocatesSequentialFreeBeds() throws Exception {
    Fixture fx = seedPro("ward-beds");
    mockMvc
        .perform(
            post("/api/v1/hospital/wards")
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(wardJson("ICU Block", "ICU", null, "ICU", 3, null, null)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.beds.length()").value(3))
        .andExpect(jsonPath("$.data.beds[0].label").value("ICU-1"))
        .andExpect(jsonPath("$.data.beds[0].occupancyStatus").value("FREE"))
        .andExpect(jsonPath("$.data.beds[2].label").value("ICU-3"));

    mockMvc
        .perform(get("/api/v1/hospital/wards").cookie(fx.owner()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.wards[0].beds[1].label").value("ICU-2"));
  }

  @Test
  void ac03_occupancyKpisAndBedMapGroupedByWard() throws Exception {
    Fixture fx = seedPro("ward-kpi");
    MvcResult ward =
        mockMvc
            .perform(
                post("/api/v1/hospital/wards")
                    .cookie(fx.owner())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(wardJson("General", "GEN", "1", "GENERAL", 2, null, null)))
            .andReturn();
    UUID bedId = bedId(ward, 0);
    UUID wardId = wardId(ward);
    mockMvc
        .perform(
            post("/api/v1/hospital/admissions")
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "patientName":"Ravi Kumar",
                      "uhid":"UHID-00001",
                      "wardId":"%s",
                      "bedId":"%s",
                      "payerType":"SELF_PAY"
                    }
                    """
                        .formatted(wardId, bedId)))
        .andExpect(status().isOk());

    mockMvc
        .perform(get("/api/v1/hospital/wards").cookie(fx.owner()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.wardCount").value(1))
        .andExpect(jsonPath("$.data.totalBeds").value(2))
        .andExpect(jsonPath("$.data.occupiedBeds").value(1))
        .andExpect(jsonPath("$.data.freeBeds").value(1))
        .andExpect(jsonPath("$.data.occupancyPercent").value(50))
        .andExpect(jsonPath("$.data.admittedCount").value(1))
        .andExpect(jsonPath("$.data.wards[0].beds[0].occupancyStatus").value("OCCUPIED"))
        .andExpect(jsonPath("$.data.wards[0].beds[1].occupancyStatus").value("FREE"));
  }

  @Test
  void ac04_secondOccupyReturnsBedOccupied() throws Exception {
    Fixture fx = seedPro("ward-occupy");
    MvcResult ward =
        mockMvc
            .perform(
                post("/api/v1/hospital/wards")
                    .cookie(fx.owner())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(wardJson("Surgical", "SUR", null, "SURGICAL", 1, null, null)))
            .andReturn();
    UUID bedId = bedId(ward, 0);
    occupyAsOwner(fx, bedId);

    AuthPrincipal principal = authPrincipal(fx);
    assertThatThrownBy(() -> hospitalWardService.occupyBed(principal, bedId))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo("BED_OCCUPIED");

    assertThat(hospitalBedRepository.findById(bedId).orElseThrow().getOccupancyStatus())
        .isEqualTo(HospitalBedOccupancy.OCCUPIED);
  }

  @Test
  void ac04_concurrentOccupyLeavesOneOccupant() throws Exception {
    Fixture fx = seedPro("ward-concurrent");
    MvcResult ward =
        mockMvc
            .perform(
                post("/api/v1/hospital/wards")
                    .cookie(fx.owner())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(wardJson("Private", "PRV", null, "PRIVATE", 1, null, null)))
            .andReturn();
    UUID bedId = bedId(ward, 0);
    AuthPrincipal principal = authPrincipal(fx);
    ExecutorService pool = Executors.newFixedThreadPool(2);
    CountDownLatch start = new CountDownLatch(1);
    AtomicInteger successes = new AtomicInteger();
    AtomicInteger failures = new AtomicInteger();
    try {
      for (int i = 0; i < 2; i++) {
        pool.submit(
            () -> {
              try {
                start.await();
                hospitalWardService.occupyBed(principal, bedId);
                successes.incrementAndGet();
              } catch (ApiException ex) {
                if ("BED_OCCUPIED".equals(ex.getCode())) {
                  failures.incrementAndGet();
                } else {
                  throw ex;
                }
              } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
              }
            });
      }
      start.countDown();
      pool.shutdown();
      while (!pool.isTerminated()) {
        Thread.sleep(20);
      }
    } finally {
      pool.shutdownNow();
    }
    assertThat(successes.get()).isEqualTo(1);
    assertThat(failures.get()).isEqualTo(1);
    assertThat(hospitalBedRepository.findById(bedId).orElseThrow().getOccupancyStatus())
        .isEqualTo(HospitalBedOccupancy.OCCUPIED);
  }

  @Test
  void ac05_duplicateCodeZeroCapacityForeignBranchCashierAndPlanLimit() throws Exception {
    Fixture fx = seedPro("ward-guard");
    mockMvc
        .perform(
            post("/api/v1/hospital/wards")
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(wardJson("Maternity", "MAT", null, "MATERNITY", 2, null, null)))
        .andExpect(status().isOk());

    mockMvc
        .perform(
            post("/api/v1/hospital/wards")
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(wardJson("Duplicate", "mat", null, "MATERNITY", 2, null, null)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("DUPLICATE_CODE"));

    mockMvc
        .perform(
            post("/api/v1/hospital/wards")
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(wardJson("Zero", "ZRO", null, "GENERAL", 0, null, null)))
        .andExpect(status().isUnprocessableEntity());

    Cookie cashier = staffWithPredefined(fx, "cashier", "cash@ward-guard.local");
    mockMvc
        .perform(
            post("/api/v1/hospital/wards")
                .cookie(cashier)
                .contentType(MediaType.APPLICATION_JSON)
                .content(wardJson("Blocked", "BLK", null, "GENERAL", 2, null, null)))
        .andExpect(status().isForbidden());

    assertThat(hospitalWardRepository.count()).isEqualTo(1);

    Tenant tenant = persistTenant("free-ward", "Free Ward");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@free-ward.local", AppUserRole.pharmacy_owner);
    Location branch = persistBranch(tenant.getId(), "Main", "FW01");
    Cookie freeOwner = login("owner@free-ward.local");
    selectBranch(freeOwner, branch.getId());
    mockMvc
        .perform(get("/api/v1/hospital/wards").cookie(freeOwner))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("PLAN_LIMIT"));
  }

  @Test
  void ac05_foreignBranchWardIsUndisclosed404() throws Exception {
    Fixture fxA = seedPro("iso-ward-a");
    Fixture fxB = seedPro("iso-ward-b");
    MvcResult created =
        mockMvc
            .perform(
                post("/api/v1/hospital/wards")
                    .cookie(fxA.owner())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(wardJson("Ward A", "WA", null, "GENERAL", 1, null, null)))
            .andReturn();
    UUID wardId = wardId(created);

    mockMvc
        .perform(
            put("/api/v1/hospital/wards/" + wardId)
                .cookie(fxB.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(wardJson("Cross", "CR", null, "GENERAL", 1, null, null)))
        .andExpect(status().isNotFound());
  }

  @Test
  void ac05_noActiveBranchAndStaleUpdateFailSafely() throws Exception {
    Fixture fx = seedPro("ward-stale");
    MvcResult created =
        mockMvc
            .perform(
                post("/api/v1/hospital/wards")
                    .cookie(fx.owner())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(wardJson("Stale", "STL", null, "GENERAL", 2, null, null)))
            .andReturn();
    UUID wardId = wardId(created);
    long version = wardVersion(created);

    mockMvc
        .perform(
            put("/api/v1/hospital/wards/" + wardId)
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(wardJson("Stale", "STL", null, "GENERAL", 2, null, 99L)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("STALE_STATE"));

    mockMvc
        .perform(
            put("/api/v1/hospital/wards/" + wardId)
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(wardJson("Stale updated", "STL", null, "GENERAL", 2, null, version)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.name").value("Stale updated"));

    Cookie noBranch = login("owner@ward-stale.local");
    mockMvc
        .perform(get("/api/v1/hospital/wards").cookie(noBranch))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("NO_ACTIVE_BRANCH"));
  }

  private void occupyAsOwner(Fixture fx, UUID bedId) {
    hospitalWardService.occupyBed(authPrincipal(fx), bedId);
  }

  private AuthPrincipal authPrincipal(Fixture fx) {
    AppUser owner =
        appUserRepository.findAll().stream()
            .filter(user -> user.getEmail().equals("owner@" + fx.slug() + ".local"))
            .findFirst()
            .orElseThrow();
    return new AuthPrincipal(owner.getId(), fx.tenantId(), UUID.randomUUID(), owner.getRole())
        .withActiveBranchId(fx.branchId());
  }

  private String wardJson(
      String name,
      String code,
      String floor,
      String category,
      int capacity,
      String nurse,
      Long version) {
    String floorJson = floor == null ? "null" : "\"" + floor + "\"";
    String nurseJson = nurse == null ? "null" : "\"" + nurse + "\"";
    String versionJson = version == null ? "null" : version.toString();
    return """
        {
          "name":"%s",
          "code":"%s",
          "floor":%s,
          "category":"%s",
          "capacity":%d,
          "nurseInCharge":%s,
          "expectedVersion":%s
        }
        """
        .formatted(name, code, floorJson, category, capacity, nurseJson, versionJson);
  }

  private UUID wardId(MvcResult result) throws Exception {
    return UUID.fromString(
        objectMapper
            .readTree(result.getResponse().getContentAsString())
            .path("data")
            .path("id")
            .asText());
  }

  private long wardVersion(MvcResult result) throws Exception {
    return objectMapper
        .readTree(result.getResponse().getContentAsString())
        .path("data")
        .path("version")
        .asLong();
  }

  private UUID bedId(MvcResult result, int index) throws Exception {
    JsonNode beds =
        objectMapper.readTree(result.getResponse().getContentAsString()).path("data").path("beds");
    return UUID.fromString(beds.get(index).path("id").asText());
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
