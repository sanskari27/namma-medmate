package com.nammamedmate.server.feature.access;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.AbstractIntegrationTest;
import com.nammamedmate.server.application.notification.NotificationRoutingService;
import com.nammamedmate.server.application.notification.RouteCommand;
import com.nammamedmate.server.domain.AccessRoleKind;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.BranchType;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.Notification;
import com.nammamedmate.server.domain.NotificationTrigger;
import com.nammamedmate.server.domain.RoutingRole;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AccessRoleEventRepository;
import com.nammamedmate.server.persistence.AccessRoleRepository;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.NotificationDeliveryRepository;
import com.nammamedmate.server.persistence.NotificationEventRepository;
import com.nammamedmate.server.persistence.NotificationRepository;
import com.nammamedmate.server.persistence.NotificationRoleAssignmentRepository;
import com.nammamedmate.server.persistence.NotificationSourceRepository;
import com.nammamedmate.server.persistence.PasswordHistoryRepository;
import com.nammamedmate.server.persistence.PasswordResetTokenRepository;
import com.nammamedmate.server.persistence.SavedLoginRepository;
import com.nammamedmate.server.persistence.StaffRegistrationRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TransactionalEmailRepository;
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

class AccessRoleTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private UserSessionRepository userSessionRepository;
  @Autowired private PasswordHistoryRepository passwordHistoryRepository;
  @Autowired private PasswordResetTokenRepository passwordResetTokenRepository;
  @Autowired private TransactionalEmailRepository transactionalEmailRepository;
  @Autowired private SavedLoginRepository savedLoginRepository;
  @Autowired private StaffRegistrationRepository staffRegistrationRepository;
  @Autowired private UserAccessRoleRepository userAccessRoleRepository;
  @Autowired private AccessRoleEventRepository accessRoleEventRepository;
  @Autowired private AccessRoleRepository accessRoleRepository;
  @Autowired private PasswordEncoder passwordEncoder;
  @Autowired private LocationRepository locationRepository;
  @Autowired private UserBranchRepository userBranchRepository;
  @Autowired private NotificationRoleAssignmentRepository assignmentRepository;
  @Autowired private NotificationRoutingService routingService;
  @Autowired private NotificationRepository notificationRepository;
  @Autowired private NotificationEventRepository notificationEventRepository;
  @Autowired private NotificationDeliveryRepository notificationDeliveryRepository;
  @Autowired private NotificationSourceRepository notificationSourceRepository;

  @BeforeEach
  void wipe() {
    notificationDeliveryRepository.deleteAll();
    notificationEventRepository.deleteAll();
    notificationRepository.deleteAll();
    notificationSourceRepository.deleteAll();
    assignmentRepository.deleteAll();
    userBranchRepository.deleteAll();
    passwordResetTokenRepository.deleteAll();
    passwordHistoryRepository.deleteAll();
    transactionalEmailRepository.deleteAll();
    savedLoginRepository.deleteAll();
    userSessionRepository.deleteAll();
    staffRegistrationRepository.deleteAll();
    userAccessRoleRepository.deleteAll();
    accessRoleEventRepository.deleteAll();
    accessRoleRepository.deleteAll(accessRoleRepository.findByKind(AccessRoleKind.CUSTOM));
    locationRepository.deleteAll();
    appUserRepository.deleteAll();
    tenantRepository.deleteAll();
  }

  @Test
  void ac01_staffMayHoldPharmacistAndCashier() throws Exception {
    Tenant tenant = persistTenant("multi-role");
    persistUser(tenant.getId(), "owner@roles.local", AppUserRole.pharmacy_owner, null);
    AppUser staff =
        persistUser(tenant.getId(), "clerk@roles.local", AppUserRole.pharmacy_staff, null);
    Cookie owner = login("owner@roles.local");
    UUID pharmacist = predefinedId(owner, "pharmacist");
    UUID cashier = predefinedId(owner, "cashier");

    mockMvc
        .perform(
            put("/api/v1/users/" + staff.getId() + "/roles")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleIds\":[\"" + pharmacist + "\",\"" + cashier + "\"]}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.roles.length()").value(2));

    mockMvc
        .perform(
            put("/api/v1/users/" + staff.getId() + "/roles")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleIds\":[\"" + pharmacist + "\",\"" + cashier + "\"]}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.roles.length()").value(2));

    Cookie staffCookie = login("clerk@roles.local");
    mockMvc
        .perform(get("/api/v1/auth/me").cookie(staffCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.role").value("pharmacy_staff"))
        .andExpect(
            jsonPath("$.data.modules")
                .value(org.hamcrest.Matchers.hasItems("SALES", "INVENTORY", "CRM")));
  }

  @Test
  void ac02_customRoleCappedByPlanAndCreator() throws Exception {
    Tenant tenant = persistTenant("cap-role");
    persistUser(tenant.getId(), "owner@cap.local", AppUserRole.pharmacy_owner, null);
    AppUser staff = persistUser(tenant.getId(), "lead@cap.local", AppUserRole.pharmacy_staff, null);
    Cookie owner = login("owner@cap.local");

    mockMvc
        .perform(
            post("/api/v1/roles")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Loyalty desk\",\"modules\":[\"LOYALTY\"]}"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("PLAN_LIMIT"));

    String created =
        mockMvc
            .perform(
                post("/api/v1/roles")
                    .cookie(owner)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":\"Floor lead\",\"modules\":[\"ROLES\",\"SALES\"]}"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    UUID limited = UUID.fromString(objectMapper.readTree(created).path("data").path("id").asText());

    mockMvc
        .perform(
            put("/api/v1/users/" + staff.getId() + "/roles")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleIds\":[\"" + limited + "\"]}"))
        .andExpect(status().isOk());

    Cookie lead = login("lead@cap.local");
    mockMvc
        .perform(
            post("/api/v1/roles")
                .cookie(lead)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Stock desk\",\"modules\":[\"INVENTORY\"]}"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("PRIVILEGE_ESCALATION"));
  }

  @Test
  void ac03_rejectsActionShapedModuleCodes() throws Exception {
    Tenant tenant = persistTenant("module-level");
    persistUser(tenant.getId(), "owner@mod.local", AppUserRole.pharmacy_owner, null);
    Cookie owner = login("owner@mod.local");

    mockMvc
        .perform(
            post("/api/v1/roles")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Write stock\",\"modules\":[\"inventory:write\"]}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
  }

  @Test
  void ac04_ownerHasAllTenantModulesAndMasterCreatesPlatformSubRole() throws Exception {
    persistUser(null, "ops@hq.local", AppUserRole.admin_super, null);
    persistUser(null, "agent@hq.local", AppUserRole.admin_verification, null);
    Tenant tenant = persistTenant("owner-mods");
    persistUser(tenant.getId(), "owner@all.local", AppUserRole.pharmacy_owner, null);

    Cookie owner = login("owner@all.local");
    mockMvc
        .perform(get("/api/v1/auth/me").cookie(owner))
        .andExpect(status().isOk())
        .andExpect(
            jsonPath("$.data.modules")
                .value(org.hamcrest.Matchers.hasItems("SALES", "INVENTORY", "ROLES")))
        .andExpect(
            jsonPath("$.data.modules")
                .value(org.hamcrest.Matchers.not(org.hamcrest.Matchers.hasItem("LOYALTY"))));

    Cookie master = login("ops@hq.local");
    String created =
        mockMvc
            .perform(
                post("/api/v1/roles")
                    .cookie(master)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":\"KYC night desk\",\"modules\":[\"TENANT_KYC\"]}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.scope").value("PLATFORM"))
            .andExpect(jsonPath("$.data.kind").value("CUSTOM"))
            .andReturn()
            .getResponse()
            .getContentAsString();
    UUID desk = UUID.fromString(objectMapper.readTree(created).path("data").path("id").asText());
    AppUser agent = appUserRepository.findByNormalizedEmail("agent@hq.local").orElseThrow();

    mockMvc
        .perform(
            post("/api/v1/users/" + agent.getId() + "/roles")
                .cookie(master)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleId\":\"" + desk + "\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.roles[0].name").value("KYC night desk"));

    mockMvc
        .perform(
            post("/api/v1/users/" + agent.getId() + "/roles")
                .cookie(master)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleId\":\"" + desk + "\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.roles.length()").value(1));
  }

  @Test
  void ac05_unauthenticatedMissingPermissionIsolationAndConflicts() throws Exception {
    Tenant tenantA = persistTenant("iso-a");
    Tenant tenantB = persistTenant("iso-b");
    persistUser(tenantA.getId(), "owner-a@iso.local", AppUserRole.pharmacy_owner, null);
    persistUser(tenantB.getId(), "owner-b@iso.local", AppUserRole.pharmacy_owner, null);
    AppUser staffA =
        persistUser(tenantA.getId(), "clerk-a@iso.local", AppUserRole.pharmacy_staff, null);
    persistUser(tenantA.getId(), "cashier@iso.local", AppUserRole.pharmacy_staff, null);
    Cookie ownerA = login("owner-a@iso.local");
    UUID cashier = predefinedId(ownerA, "cashier");

    mockMvc
        .perform(
            post("/api/v1/roles")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Night\",\"modules\":[\"SALES\"]}"))
        .andExpect(status().isUnauthorized());

    mockMvc
        .perform(
            put("/api/v1/users/" + staffA.getId() + "/roles")
                .cookie(ownerA)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleIds\":[\"" + cashier + "\"]}"))
        .andExpect(status().isOk());
    Cookie cashierCookie = login("cashier@iso.local");
    mockMvc.perform(get("/api/v1/roles").cookie(cashierCookie)).andExpect(status().isForbidden());

    String created =
        mockMvc
            .perform(
                post("/api/v1/roles")
                    .cookie(ownerA)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":\"Evening till\",\"modules\":[\"SALES\"]}"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    JsonNode roleJson = objectMapper.readTree(created).path("data");
    UUID customId = UUID.fromString(roleJson.path("id").asText());
    int version = roleJson.path("version").asInt();

    mockMvc
        .perform(
            post("/api/v1/roles")
                .cookie(ownerA)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Evening till\",\"modules\":[\"CRM\"]}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("ROLE_NAME_TAKEN"));

    mockMvc
        .perform(
            patch("/api/v1/roles/" + customId)
                .cookie(ownerA)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Evening till\",\"modules\":[\"SALES\"],\"version\":0}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("ROLE_STALE"));

    Cookie ownerB = login("owner-b@iso.local");
    mockMvc
        .perform(
            patch("/api/v1/roles/" + customId)
                .cookie(ownerB)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"name\":\"Stolen\",\"modules\":[\"SALES\"],\"version\":" + version + "}"))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));

    mockMvc
        .perform(
            put("/api/v1/users/" + staffA.getId() + "/roles")
                .cookie(ownerB)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleIds\":[\"" + customId + "\"]}"))
        .andExpect(status().isNotFound());

    UUID pharmacist = predefinedId(ownerA, "pharmacist");
    mockMvc
        .perform(
            patch("/api/v1/roles/" + pharmacist)
                .cookie(ownerA)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Pharmacist\",\"modules\":[\"SALES\"],\"version\":1}"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("ROLE_IMMUTABLE"));
  }

  @Test
  void ac05_deactivateCustomRoleUnassignsMembers() throws Exception {
    Tenant tenant = persistTenant("off-role");
    persistUser(tenant.getId(), "owner@off.local", AppUserRole.pharmacy_owner, null);
    AppUser staff =
        persistUser(tenant.getId(), "clerk@off.local", AppUserRole.pharmacy_staff, null);
    Cookie owner = login("owner@off.local");
    String created =
        mockMvc
            .perform(
                post("/api/v1/roles")
                    .cookie(owner)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":\"Temp till\",\"modules\":[\"SALES\"]}"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    UUID roleId = UUID.fromString(objectMapper.readTree(created).path("data").path("id").asText());
    mockMvc
        .perform(
            put("/api/v1/users/" + staff.getId() + "/roles")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleIds\":[\"" + roleId + "\"]}"))
        .andExpect(status().isOk());

    mockMvc
        .perform(post("/api/v1/roles/" + roleId + "/deactivate").cookie(owner))
        .andExpect(status().isOk());

    mockMvc
        .perform(get("/api/v1/users/" + staff.getId() + "/roles").cookie(owner))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.roles.length()").value(0));
  }

  @Test
  void ac01_addAndRemoveSingleAssignment() throws Exception {
    Tenant tenant = persistTenant("one-role");
    persistUser(tenant.getId(), "owner@one.local", AppUserRole.pharmacy_owner, null);
    AppUser staff =
        persistUser(tenant.getId(), "clerk@one.local", AppUserRole.pharmacy_staff, null);
    Cookie owner = login("owner@one.local");
    UUID inventory = predefinedId(owner, "inventory");

    mockMvc
        .perform(
            post("/api/v1/users/" + staff.getId() + "/roles")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleId\":\"" + inventory + "\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.roles[0].code").value("inventory"));

    mockMvc
        .perform(delete("/api/v1/users/" + staff.getId() + "/roles/" + inventory).cookie(owner))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.roles.length()").value(0));
  }

  @Test
  void inventoryRoleWritesNotificationAssignment_M10_ROUTE_001() throws Exception {
    Tenant tenant = persistTenant("route-inv");
    tenant.setStatus(TenantStatus.ACTIVE);
    tenantRepository.save(tenant);
    persistUser(tenant.getId(), "owner@route-inv.local", AppUserRole.pharmacy_owner, null);
    AppUser staff =
        persistUser(tenant.getId(), "stock@route-inv.local", AppUserRole.pharmacy_staff, null);
    Location branch = persistBranch(tenant.getId());
    Cookie owner = login("owner@route-inv.local");
    UUID inventory = predefinedId(owner, "inventory");

    mockMvc
        .perform(
            post("/api/v1/users/" + staff.getId() + "/roles")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleId\":\"" + inventory + "\"}"))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            put("/api/v1/users/" + staff.getId() + "/branches")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchIds\":[\"" + branch.getId() + "\"]}"))
        .andExpect(status().isOk());

    assertThat(assignmentRepository.findAllByUserIdAndTenantId(staff.getId(), tenant.getId()))
        .anyMatch(
            row ->
                row.getRoutingRole() == RoutingRole.INVENTORY
                    && branch.getId().equals(row.getBranchId()));

    routingService.route(
        new RouteCommand(
            "item-expiry-role-test",
            NotificationTrigger.ITEM_EXPIRY,
            tenant.getId(),
            branch.getId(),
            UUID.randomUUID(),
            null,
            null,
            null));
    assertThat(notificationRepository.findAll().stream().map(Notification::getRecipientUserId))
        .contains(staff.getId());

    mockMvc
        .perform(delete("/api/v1/users/" + staff.getId() + "/roles/" + inventory).cookie(owner))
        .andExpect(status().isOk());
    assertThat(assignmentRepository.findAllByUserIdAndTenantId(staff.getId(), tenant.getId()))
        .isEmpty();
  }

  @Test
  void ac04_roleCatalogExplainsPlanGatedModules() throws Exception {
    Tenant tenant = persistTenant("catalog");
    persistUser(tenant.getId(), "owner@cat.local", AppUserRole.pharmacy_owner, null);
    Cookie owner = login("owner@cat.local");

    mockMvc
        .perform(get("/api/v1/roles").cookie(owner))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.roles[?(@.code=='pharmacist')].kind").value("PREDEFINED"))
        .andExpect(jsonPath("$.data.catalog[?(@.code=='SALES')].entitled").value(true))
        .andExpect(jsonPath("$.data.catalog[?(@.code=='LOYALTY')].gated").value(true))
        .andExpect(jsonPath("$.data.catalog[?(@.code=='LOYALTY')].entitled").value(false));
  }

  private UUID predefinedId(Cookie cookie, String code) throws Exception {
    String body =
        mockMvc
            .perform(get("/api/v1/roles").cookie(cookie))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    for (JsonNode role : objectMapper.readTree(body).path("data").path("roles")) {
      if (code.equals(role.path("code").asText())) {
        return UUID.fromString(role.path("id").asText());
      }
    }
    throw new AssertionError("missing predefined role " + code);
  }

  private Cookie login(String email) throws Exception {
    Cookie cookie =
        mockMvc
            .perform(
                post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getCookie("nmm_access");
    assertThat(cookie).isNotNull();
    return cookie;
  }

  private Tenant persistTenant(String slug) {
    Tenant tenant = new Tenant();
    tenant.setId(UUID.randomUUID());
    tenant.setName(slug);
    tenant.setSlug(slug);
    Instant now = Instant.parse("2026-09-01T00:00:00Z");
    tenant.setCreatedAt(now);
    tenant.setUpdatedAt(now);
    return tenantRepository.saveAndFlush(tenant);
  }

  private Location persistBranch(UUID tenantId) {
    Instant now = Instant.parse("2026-09-01T00:00:00Z");
    Location branch = new Location();
    branch.setId(UUID.randomUUID());
    branch.setTenantId(tenantId);
    branch.setName("Main");
    branch.setBranchCode("BR01");
    branch.setAddressLine("12 MG Road");
    branch.setCity("Bengaluru");
    branch.setState("KA");
    branch.setPincode("560001");
    branch.setContactPhone("9876543210");
    branch.setDrugLicenseNumber("DL-BR01");
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
    Map<String, Object> pricing = new LinkedHashMap<>();
    pricing.put("defaultMarkupBps", 0);
    pricing.put("roundToNearestPaise", 1);
    branch.setPricingSettings(pricing);
    Map<String, Object> tax = new LinkedHashMap<>();
    tax.put("gstMode", "CGST_SGST");
    tax.put("taxState", "KA");
    branch.setTaxSettings(tax);
    branch.setCreatedAt(now);
    branch.setUpdatedAt(now);
    return locationRepository.saveAndFlush(branch);
  }

  private AppUser persistUser(UUID tenantId, String email, AppUserRole role, UUID createdBy) {
    Instant now = Instant.parse("2026-09-01T00:00:00Z");
    AppUser user = new AppUser();
    user.setId(UUID.randomUUID());
    user.setTenantId(tenantId);
    user.setEmail(email);
    user.setPasswordHash(passwordEncoder.encode(PASSWORD));
    user.setDisplayName("Test " + email);
    user.setPhone("9000000000");
    user.setRole(role);
    user.setActive(true);
    user.setStatus(UserAccountStatus.ACTIVE);
    user.setCreatedBy(createdBy);
    user.setPasswordChangedAt(now);
    user.setMustChangePassword(false);
    user.setCreatedAt(now);
    user.setUpdatedAt(now);
    return appUserRepository.saveAndFlush(user);
  }
}
