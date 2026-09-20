package com.nammamedmate.server.feature.hospital;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
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
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.HospitalCreditAccountRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import com.nammamedmate.server.persistence.UserAccessRoleRepository;
import com.nammamedmate.server.persistence.UserBranchRepository;
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

class HospitalAccountTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-20T09:00:00Z");

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private UserSessionRepository userSessionRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private UserBranchRepository userBranchRepository;
  @Autowired private UserAccessRoleRepository userAccessRoleRepository;
  @Autowired private HospitalCreditAccountRepository hospitalCreditAccountRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @BeforeEach
  void wipe() {
    hospitalCreditAccountRepository.deleteAll();
    userBranchRepository.deleteAll();
    userAccessRoleRepository.deleteAll();
    userSessionRepository.deleteAll();
    locationRepository.deleteAll();
    tenantSubscriptionRepository.deleteAll();
    appUserRepository.deleteAll();
    tenantRepository.deleteAll();
  }

  @Test
  void ac01_freePlanGetsPlanLimitWithoutHospitalRows() throws Exception {
    Tenant tenant = persistTenant("free-hosp", "Free Hospital");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@free-hosp.local", AppUserRole.pharmacy_owner);
    Cookie cookie = login("owner@free-hosp.local");

    mockMvc
        .perform(get("/api/v1/hospital/account").cookie(cookie))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("PLAN_LIMIT"));

    mockMvc
        .perform(
            put("/api/v1/hospital/account")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(accountJson("City Care", "NET_30", 500_000L, null)))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("PLAN_LIMIT"));

    assertThat(hospitalCreditAccountRepository.count()).isZero();
  }

  @Test
  void ac01_proOwnerCanOpenHospitalAccount() throws Exception {
    Fixture fx = seedPro("pro-hosp");
    mockMvc
        .perform(get("/api/v1/auth/me").cookie(fx.owner()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.modules").value(hasItem("HOSPITAL")));

    mockMvc
        .perform(get("/api/v1/hospital/account").cookie(fx.owner()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.configured").value(false));

    mockMvc
        .perform(
            put("/api/v1/hospital/account")
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    accountJson(
                        "City Care Hospital",
                        "NET_30",
                        2_000_000L,
                        null,
                        "29ABCDE1234F1Z5",
                        "Central stores",
                        "9876543210",
                        "billing@citycare.local")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.configured").value(true))
        .andExpect(jsonPath("$.data.institutionName").value("City Care Hospital"))
        .andExpect(jsonPath("$.data.creditTerms").value("NET_30"))
        .andExpect(jsonPath("$.data.creditLimitPaise").value(2_000_000))
        .andExpect(jsonPath("$.data.balancePaise").value(0))
        .andExpect(jsonPath("$.data.availableCreditPaise").value(2_000_000));
  }

  @Test
  void ac02_accountantCanUpsertAccount() throws Exception {
    Fixture fx = seedPro("acct-hosp");
    Cookie accountant = staffWithPredefined(fx, "accountant", "books@acct-hosp.local");

    mockMvc
        .perform(
            put("/api/v1/hospital/account")
                .cookie(accountant)
                .contentType(MediaType.APPLICATION_JSON)
                .content(accountJson("Metro Hospital", "ON_DEMAND", 1_000_000L, null)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.institutionName").value("Metro Hospital"));
  }

  @Test
  void ac04_cashierCannotMutateAccount() throws Exception {
    Fixture fx = seedPro("cash-hosp");
    Cookie cashier = staffWithPredefined(fx, "cashier", "till@cash-hosp.local");

    mockMvc
        .perform(
            put("/api/v1/hospital/account")
                .cookie(cashier)
                .contentType(MediaType.APPLICATION_JSON)
                .content(accountJson("Blocked", "NET_15", 100_000L, null)))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
  }

  @Test
  void ac05_crossTenantAccountIsUndisclosed404() throws Exception {
    Fixture fxA = seedPro("iso-a");
    Fixture fxB = seedPro("iso-b");
    mockMvc
        .perform(
            put("/api/v1/hospital/account")
                .cookie(fxA.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(accountJson("Tenant A Hospital", "NET_45", 500_000L, null)))
        .andExpect(status().isOk());

    mockMvc
        .perform(get("/api/v1/hospital/account").cookie(fxB.owner()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.configured").value(false));
  }

  @Test
  void ac05_negativeLimitAndStaleVersionFailSafely() throws Exception {
    Fixture fx = seedPro("validate-hosp");
    mockMvc
        .perform(
            put("/api/v1/hospital/account")
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(accountJson("Care", "NET_30", -1L, null)))
        .andExpect(status().isUnprocessableEntity());

    MvcResult created =
        mockMvc
            .perform(
                put("/api/v1/hospital/account")
                    .cookie(fx.owner())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(accountJson("Care", "NET_30", 100_000L, null)))
            .andExpect(status().isOk())
            .andReturn();

    mockMvc
        .perform(
            put("/api/v1/hospital/account")
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(accountJson("Care", "NET_30", 200_000L, 99L)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("STALE_STATE"));

    long version =
        objectMapper
            .readTree(created.getResponse().getContentAsString())
            .path("data")
            .path("version")
            .asLong();
    assertThat(hospitalCreditAccountRepository.count()).isEqualTo(1);
    mockMvc
        .perform(
            put("/api/v1/hospital/account")
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(accountJson("Care Updated", "NET_15", 200_000L, version)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.institutionName").value("Care Updated"));
  }

  @Test
  void ac05_unauthenticatedIs401() throws Exception {
    mockMvc.perform(get("/api/v1/hospital/account")).andExpect(status().isUnauthorized());
  }

  private String accountJson(String name, String terms, long limit, Long version) {
    return accountJson(name, terms, limit, version, null, null, null, null);
  }

  private String accountJson(
      String name,
      String terms,
      long limit,
      Long version,
      String gstin,
      String stores,
      String phone,
      String email) {
    String gst = gstin == null ? "null" : "\"" + gstin + "\"";
    String storesJson = stores == null ? "null" : "\"" + stores + "\"";
    String phoneJson = phone == null ? "null" : "\"" + phone + "\"";
    String emailJson = email == null ? "null" : "\"" + email + "\"";
    String versionJson = version == null ? "null" : version.toString();
    return """
        {
          "institutionName":"%s",
          "gstin":%s,
          "storesContact":%s,
          "billingPhone":%s,
          "billingEmail":%s,
          "creditTerms":"%s",
          "creditLimitPaise":%d,
          "expectedVersion":%s
        }
        """
        .formatted(name, gst, storesJson, phoneJson, emailJson, terms, limit, versionJson);
  }

  private Fixture seedPro(String slug) throws Exception {
    Tenant tenant = persistTenant(slug, slug + " Chemist");
    persistPlan(tenant.getId(), PlanCode.PRO);
    persistUser(tenant.getId(), "owner@" + slug + ".local", AppUserRole.pharmacy_owner);
    Location branch = persistBranch(tenant.getId(), "Main", "BR01");
    Cookie owner = login("owner@" + slug + ".local");
    selectBranch(owner, branch.getId());
    return new Fixture(tenant.getId(), branch.getId(), owner);
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

  private record Fixture(UUID tenantId, UUID branchId, Cookie owner) {}
}
