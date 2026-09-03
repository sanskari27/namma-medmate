package com.nammamedmate.server.feature.branch;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.BranchType;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.TenantRepository;
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
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
class BranchAssignmentTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-03T12:00:00Z");

  @Container
  static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:16-alpine")
          .withDatabaseName("nammamedmate_branch_assign")
          .withUsername("postgres")
          .withPassword("postgres");

  @DynamicPropertySource
  static void datasource(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
    registry.add("spring.datasource.username", POSTGRES::getUsername);
    registry.add("spring.datasource.password", POSTGRES::getPassword);
  }

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private UserSessionRepository userSessionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private UserBranchRepository userBranchRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @BeforeEach
  void wipe() {
    userBranchRepository.deleteAll();
    userSessionRepository.deleteAll();
    locationRepository.deleteAll();
    appUserRepository.deleteAll();
    tenantRepository.deleteAll();
  }

  @Test
  void ac01_assignBranchesWithoutChangingModules() throws Exception {
    Tenant tenant = persistTenant("assign", "Assign Chemist");
    persistUser(tenant.getId(), "owner@assign.local", AppUserRole.pharmacy_owner);
    AppUser staff = persistUser(tenant.getId(), "clerk@assign.local", AppUserRole.pharmacy_staff);
    Location main = persistBranch(tenant.getId(), "Main", "BR01", true);
    Location annex = persistBranch(tenant.getId(), "Annex", "BR02", false);
    Cookie owner = login("owner@assign.local");

    mockMvc
        .perform(
            put("/api/v1/users/" + staff.getId() + "/branches")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchIds\":[\"" + main.getId() + "\",\"" + annex.getId() + "\"]}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.branches.length()").value(2));

    Cookie staffCookie = login("clerk@assign.local");
    mockMvc
        .perform(get("/api/v1/auth/me").cookie(staffCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.branches.length()").value(2))
        .andExpect(jsonPath("$.data.activeBranchId").value(main.getId().toString()))
        .andExpect(jsonPath("$.data.modules").isArray());

    JsonNode modulesBefore =
        objectMapper
            .readTree(
                mockMvc
                    .perform(get("/api/v1/auth/me").cookie(staffCookie))
                    .andReturn()
                    .getResponse()
                    .getContentAsString())
            .path("data")
            .path("modules");

    mockMvc
        .perform(
            put("/api/v1/users/" + staff.getId() + "/branches")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchIds\":[\"" + main.getId() + "\"]}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.branches.length()").value(1));

    JsonNode modulesAfter =
        objectMapper
            .readTree(
                mockMvc
                    .perform(get("/api/v1/auth/me").cookie(staffCookie))
                    .andReturn()
                    .getResponse()
                    .getContentAsString())
            .path("data")
            .path("modules");
    assertThat(modulesAfter).isEqualTo(modulesBefore);
  }

  @Test
  void ac02_onlySameTenantBranchesMayBeAssigned() throws Exception {
    Tenant tenantA = persistTenant("iso-a", "Iso A");
    Tenant tenantB = persistTenant("iso-b", "Iso B");
    persistUser(tenantA.getId(), "owner-a@iso.local", AppUserRole.pharmacy_owner);
    AppUser staffA = persistUser(tenantA.getId(), "clerk-a@iso.local", AppUserRole.pharmacy_staff);
    Location foreign = persistBranch(tenantB.getId(), "Foreign", "BR01", true);
    Cookie ownerA = login("owner-a@iso.local");

    mockMvc
        .perform(
            put("/api/v1/users/" + staffA.getId() + "/branches")
                .cookie(ownerA)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchIds\":[\"" + foreign.getId() + "\"]}"))
        .andExpect(status().isNotFound());

    assertThat(userBranchRepository.findAll()).isEmpty();
  }

  @Test
  void ac03_removingAssignmentClearsStaleActiveBranch() throws Exception {
    Tenant tenant = persistTenant("stale", "Stale Chemist");
    persistUser(tenant.getId(), "owner@stale.local", AppUserRole.pharmacy_owner);
    AppUser staff = persistUser(tenant.getId(), "clerk@stale.local", AppUserRole.pharmacy_staff);
    Location main = persistBranch(tenant.getId(), "Main", "BR01", true);
    Location annex = persistBranch(tenant.getId(), "Annex", "BR02", false);
    Cookie owner = login("owner@stale.local");

    mockMvc
        .perform(
            put("/api/v1/users/" + staff.getId() + "/branches")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchIds\":[\"" + main.getId() + "\",\"" + annex.getId() + "\"]}"))
        .andExpect(status().isOk());

    Cookie staffCookie = login("clerk@stale.local");
    mockMvc
        .perform(
            post("/api/v1/session/branch")
                .cookie(staffCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchId\":\"" + annex.getId() + "\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.activeBranchId").value(annex.getId().toString()));

    mockMvc
        .perform(
            put("/api/v1/users/" + staff.getId() + "/branches")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchIds\":[\"" + main.getId() + "\"]}"))
        .andExpect(status().isOk());

    mockMvc
        .perform(get("/api/v1/auth/me").cookie(staffCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.activeBranchId").doesNotExist())
        .andExpect(jsonPath("$.data.branches.length()").value(1));

    mockMvc
        .perform(get("/api/v1/branches/" + annex.getId()).cookie(staffCookie))
        .andExpect(status().isForbidden());
  }

  @Test
  void ac03_activeBranchValidatedAndStaffSeesOnlyAssigned() throws Exception {
    Tenant tenant = persistTenant("scope", "Scope Chemist");
    persistUser(tenant.getId(), "owner@scope.local", AppUserRole.pharmacy_owner);
    AppUser staff = persistUser(tenant.getId(), "clerk@scope.local", AppUserRole.pharmacy_staff);
    Location main = persistBranch(tenant.getId(), "Main", "BR01", true);
    Location annex = persistBranch(tenant.getId(), "Annex", "BR02", false);
    Cookie owner = login("owner@scope.local");

    mockMvc
        .perform(
            put("/api/v1/users/" + staff.getId() + "/branches")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchIds\":[\"" + main.getId() + "\"]}"))
        .andExpect(status().isOk());

    Cookie staffCookie = login("clerk@scope.local");
    mockMvc
        .perform(get("/api/v1/branches").cookie(staffCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items.length()").value(1))
        .andExpect(jsonPath("$.data.items[0].id").value(main.getId().toString()));

    mockMvc
        .perform(get("/api/v1/branches/" + annex.getId()).cookie(staffCookie))
        .andExpect(status().isForbidden());

    UUID before = activeBranch(staffCookie);
    mockMvc
        .perform(
            post("/api/v1/session/branch")
                .cookie(staffCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchId\":\"" + annex.getId() + "\"}"))
        .andExpect(status().isForbidden());
    assertThat(activeBranch(staffCookie)).isEqualTo(before);

    mockMvc
        .perform(
            post("/api/v1/session/branch")
                .cookie(staffCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchId\":\"" + UUID.randomUUID() + "\"}"))
        .andExpect(status().isForbidden());
    assertThat(activeBranch(staffCookie)).isEqualTo(before);
  }

  @Test
  void ac04_ownerConsolidatedAndPerBranchSwitch() throws Exception {
    Tenant tenant = persistTenant("owner-view", "Owner View");
    persistUser(tenant.getId(), "owner@view.local", AppUserRole.pharmacy_owner);
    Location main = persistBranch(tenant.getId(), "Main", "BR01", true);
    Location annex = persistBranch(tenant.getId(), "Annex", "BR02", false);
    Cookie owner = login("owner@view.local");

    mockMvc
        .perform(get("/api/v1/auth/me").cookie(owner))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.branches.length()").value(2))
        .andExpect(jsonPath("$.data.activeBranchId").doesNotExist());

    mockMvc
        .perform(
            post("/api/v1/session/branch")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchId\":\"" + annex.getId() + "\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.activeBranchId").value(annex.getId().toString()));

    mockMvc
        .perform(get("/api/v1/auth/me").cookie(owner))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.activeBranchId").value(annex.getId().toString()));

    mockMvc
        .perform(
            post("/api/v1/session/branch")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchId\":null}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.activeBranchId").doesNotExist());

    mockMvc
        .perform(get("/api/v1/branches").cookie(owner))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items.length()").value(2));
    assertThat(main.getId()).isNotNull();
  }

  @Test
  void ac05_inactiveCrossTenantAndStaffDeniedLeaveNoPartialWrite() throws Exception {
    Tenant tenant = persistTenant("deny", "Deny Chemist");
    Tenant other = persistTenant("other", "Other Chemist");
    persistUser(tenant.getId(), "owner@deny.local", AppUserRole.pharmacy_owner);
    AppUser staff = persistUser(tenant.getId(), "clerk@deny.local", AppUserRole.pharmacy_staff);
    Location main = persistBranch(tenant.getId(), "Main", "BR01", true);
    Location inactive = persistBranch(tenant.getId(), "Closed", "BR02", false);
    inactive.setStatus(BranchStatus.INACTIVE);
    locationRepository.saveAndFlush(inactive);
    Location foreign = persistBranch(other.getId(), "Foreign", "BR01", true);
    Cookie owner = login("owner@deny.local");
    Cookie staffCookie = login("clerk@deny.local");

    mockMvc
        .perform(
            put("/api/v1/users/" + staff.getId() + "/branches")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchIds\":[\"" + inactive.getId() + "\"]}"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("BRANCH_INACTIVE"));
    assertThat(userBranchRepository.findAll()).isEmpty();

    mockMvc
        .perform(
            put("/api/v1/users/" + staff.getId() + "/branches")
                .cookie(staffCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchIds\":[\"" + main.getId() + "\"]}"))
        .andExpect(status().isForbidden());
    assertThat(userBranchRepository.findAll()).isEmpty();

    mockMvc
        .perform(
            post("/api/v1/users/" + staff.getId() + "/branches")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchId\":\"" + main.getId() + "\"}"))
        .andExpect(status().isOk());

    mockMvc
        .perform(
            post("/api/v1/users/" + staff.getId() + "/branches")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchId\":\"" + main.getId() + "\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.branches.length()").value(1));

    mockMvc
        .perform(
            delete("/api/v1/users/" + staff.getId() + "/branches/" + main.getId()).cookie(owner))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.branches.length()").value(0));

    UUID before = activeBranch(owner);
    mockMvc
        .perform(
            post("/api/v1/session/branch")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchId\":\"" + foreign.getId() + "\"}"))
        .andExpect(status().isForbidden());
    assertThat(activeBranch(owner)).isEqualTo(before);
  }

  private UUID activeBranch(Cookie cookie) throws Exception {
    JsonNode node =
        objectMapper
            .readTree(
                mockMvc
                    .perform(get("/api/v1/auth/me").cookie(cookie))
                    .andExpect(status().isOk())
                    .andReturn()
                    .getResponse()
                    .getContentAsString())
            .path("data")
            .path("activeBranchId");
    if (node.isMissingNode() || node.isNull()) {
      return null;
    }
    return UUID.fromString(node.asText());
  }

  private Location persistBranch(UUID tenantId, String name, String code, boolean defaultBranch) {
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
    branch.setDefaultBranch(defaultBranch);
    branch.setLinkedWarehouse(false);
    Map<String, Object> pricing = new LinkedHashMap<>();
    pricing.put("defaultMarkupBps", 0);
    pricing.put("roundToNearestPaise", 1);
    branch.setPricingSettings(pricing);
    Map<String, Object> tax = new LinkedHashMap<>();
    tax.put("gstMode", "CGST_SGST");
    tax.put("defaultGstRateBps", 1200);
    tax.put("taxState", "KA");
    branch.setTaxSettings(tax);
    branch.setCreatedAt(T0);
    branch.setUpdatedAt(T0);
    return locationRepository.saveAndFlush(branch);
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

  private AppUser persistUser(UUID tenantId, String email, AppUserRole role) {
    AppUser user = new AppUser();
    user.setId(UUID.randomUUID());
    user.setTenantId(tenantId);
    user.setEmail(email);
    user.setPasswordHash(passwordEncoder.encode(PASSWORD));
    user.setDisplayName("Test " + email);
    user.setRole(role);
    user.setActive(true);
    user.setStatus(UserAccountStatus.ACTIVE);
    user.setCreatedAt(T0);
    user.setUpdatedAt(T0);
    return appUserRepository.saveAndFlush(user);
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
    Cookie cookie = result.getResponse().getCookie("nmm_access");
    assertThat(cookie).isNotNull();
    return cookie;
  }
}
