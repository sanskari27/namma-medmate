package com.nammamedmate.server.feature.kiosk;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.nullValue;
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
import com.nammamedmate.server.domain.KioskSessionStatus;
import com.nammamedmate.server.domain.KioskTicketStatus;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.KioskSessionRepository;
import com.nammamedmate.server.persistence.KioskTicketRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
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

class KioskTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-04T01:00:00Z");

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private UserSessionRepository userSessionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private UserBranchRepository userBranchRepository;
  @Autowired private KioskSessionRepository kioskSessionRepository;
  @Autowired private KioskTicketRepository kioskTicketRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @BeforeEach
  void wipe() {
    kioskTicketRepository.deleteAll();
    kioskSessionRepository.deleteAll();
    userBranchRepository.deleteAll();
    userSessionRepository.deleteAll();
    locationRepository.deleteAll();
    tenantSubscriptionRepository.deleteAll();
    appUserRepository.deleteAll();
    tenantRepository.deleteAll();
  }

  @Test
  void ac01_d009ClosedExposesKioskApi() throws Exception {
    mockMvc.perform(get("/api/v1/kiosk")).andExpect(status().isUnauthorized());
  }

  @Test
  void ac02_kioskTypeOnFreeDoesNotOpenSession() throws Exception {
    Tenant tenant = persistTenant("free-kiosk", "Free Kiosk");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@free-kiosk.local", AppUserRole.pharmacy_owner);
    Location stall = persistBranch(tenant.getId(), "Kiosk stall", "BR01", true, BranchType.KIOSK);
    Cookie cookie = login("owner@free-kiosk.local");
    selectBranch(cookie, stall.getId());

    mockMvc
        .perform(get("/api/v1/kiosk").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.planEntitled").value(false))
        .andExpect(jsonPath("$.data.branchType").value("KIOSK"))
        .andExpect(jsonPath("$.data.blockReason").value("PLAN_LIMIT"))
        .andExpect(jsonPath("$.data.session").value(nullValue()));

    mockMvc
        .perform(post("/api/v1/kiosk/open").cookie(cookie))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("PLAN_LIMIT"));

    assertThat(kioskSessionRepository.findAll()).isEmpty();
    assertThat(stall.getBranchType()).isEqualTo(BranchType.KIOSK);
  }

  @Test
  void ac03_proRetailRejectedAndKioskOpensTickets() throws Exception {
    Tenant tenant = persistTenant("pro-kiosk", "Pro Kiosk");
    persistPlan(tenant.getId(), PlanCode.PRO);
    persistUser(tenant.getId(), "owner@pro-kiosk.local", AppUserRole.pharmacy_owner);
    Location retail = persistBranch(tenant.getId(), "Retail till", "BR01", true, BranchType.RETAIL);
    Location kiosk =
        persistBranch(tenant.getId(), "Self-order stall", "BR02", false, BranchType.KIOSK);
    Cookie cookie = login("owner@pro-kiosk.local");

    mockMvc
        .perform(get("/api/v1/auth/me").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.modules").value(hasItem("KIOSK")));

    selectBranch(cookie, retail.getId());
    mockMvc
        .perform(post("/api/v1/kiosk/open").cookie(cookie))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("BRANCH_TYPE"));

    selectBranch(cookie, kiosk.getId());
    mockMvc
        .perform(post("/api/v1/kiosk/open").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.session.status").value("OPEN"))
        .andExpect(jsonPath("$.data.waitingTickets.length()").value(0));

    mockMvc
        .perform(post("/api/v1/kiosk/open").cookie(cookie))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("STALE_STATE"));

    mockMvc
        .perform(
            post("/api/v1/kiosk/tickets")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"walkInName\":\"Meera\",\"pickupRequest\":\"Crocin 650 two strips\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.waitingTickets[0].token").value(1))
        .andExpect(jsonPath("$.data.waitingTickets[0].walkInName").value("Meera"))
        .andExpect(
            jsonPath("$.data.waitingTickets[0].pickupRequest").value("Crocin 650 two strips"));

    String ticketId =
        objectMapper
            .readTree(
                mockMvc
                    .perform(get("/api/v1/kiosk").cookie(cookie))
                    .andExpect(status().isOk())
                    .andReturn()
                    .getResponse()
                    .getContentAsString())
            .path("data")
            .path("waitingTickets")
            .get(0)
            .path("id")
            .asText();

    mockMvc
        .perform(post("/api/v1/kiosk/tickets/" + ticketId + "/cancel").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.waitingTickets.length()").value(0));

    mockMvc
        .perform(post("/api/v1/kiosk/close").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.session").value(nullValue()));

    mockMvc
        .perform(
            post("/api/v1/kiosk/tickets")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"pickupRequest\":\"Dolo\"}"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("SESSION_CLOSED"));

    assertThat(kioskSessionRepository.findAll())
        .allMatch(row -> row.getStatus() == KioskSessionStatus.CLOSED);
    assertThat(kioskTicketRepository.findAll())
        .allMatch(row -> row.getStatus() == KioskTicketStatus.CANCELLED);
  }

  @Test
  void missingActiveBranchStaffWithoutModuleAndValidation() throws Exception {
    Tenant tenant = persistTenant("gates", "Gate Chemist");
    persistPlan(tenant.getId(), PlanCode.PRO);
    persistUser(tenant.getId(), "owner@gates.local", AppUserRole.pharmacy_owner);
    AppUser staff = persistUser(tenant.getId(), "clerk@gates.local", AppUserRole.pharmacy_staff);
    Location kiosk = persistBranch(tenant.getId(), "Kiosk", "BR01", true, BranchType.KIOSK);
    Cookie owner = login("owner@gates.local");

    mockMvc
        .perform(post("/api/v1/kiosk/open").cookie(owner))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("NO_ACTIVE_BRANCH"));

    mockMvc
        .perform(
            put("/api/v1/users/" + staff.getId() + "/branches")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchIds\":[\"" + kiosk.getId() + "\"]}"))
        .andExpect(status().isOk());

    Cookie clerk = login("clerk@gates.local");
    mockMvc.perform(post("/api/v1/kiosk/open").cookie(clerk)).andExpect(status().isForbidden());

    selectBranch(owner, kiosk.getId());
    mockMvc.perform(post("/api/v1/kiosk/open").cookie(owner)).andExpect(status().isOk());
    mockMvc
        .perform(
            post("/api/v1/kiosk/tickets")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"pickupRequest\":\"\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
  }

  @Test
  void isolationHidesForeignTenantAndBranchTickets() throws Exception {
    Tenant tenantA = persistTenant("iso-a", "Iso A");
    Tenant tenantB = persistTenant("iso-b", "Iso B");
    persistPlan(tenantA.getId(), PlanCode.PRO);
    persistPlan(tenantB.getId(), PlanCode.PRO);
    persistUser(tenantA.getId(), "owner@iso-a.local", AppUserRole.pharmacy_owner);
    persistUser(tenantB.getId(), "owner@iso-b.local", AppUserRole.pharmacy_owner);
    Location a1 = persistBranch(tenantA.getId(), "A kiosk", "BR01", true, BranchType.KIOSK);
    Location a2 = persistBranch(tenantA.getId(), "A other", "BR02", false, BranchType.KIOSK);
    Location b1 = persistBranch(tenantB.getId(), "B kiosk", "BR01", true, BranchType.KIOSK);
    Cookie ownerA = login("owner@iso-a.local");
    Cookie ownerB = login("owner@iso-b.local");

    selectBranch(ownerA, a1.getId());
    mockMvc.perform(post("/api/v1/kiosk/open").cookie(ownerA)).andExpect(status().isOk());
    String ticketId =
        objectMapper
            .readTree(
                mockMvc
                    .perform(
                        post("/api/v1/kiosk/tickets")
                            .cookie(ownerA)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"pickupRequest\":\"A slip\"}"))
                    .andExpect(status().isOk())
                    .andReturn()
                    .getResponse()
                    .getContentAsString())
            .path("data")
            .path("waitingTickets")
            .get(0)
            .path("id")
            .asText();

    selectBranch(ownerB, b1.getId());
    mockMvc
        .perform(get("/api/v1/kiosk").cookie(ownerB))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.waitingTickets.length()").value(0))
        .andExpect(jsonPath("$.data.session").value(nullValue()));

    mockMvc
        .perform(post("/api/v1/kiosk/tickets/" + ticketId + "/cancel").cookie(ownerB))
        .andExpect(status().isNotFound());

    selectBranch(ownerA, a2.getId());
    mockMvc
        .perform(post("/api/v1/kiosk/tickets/" + ticketId + "/cancel").cookie(ownerA))
        .andExpect(status().isNotFound());

    persistUser(null, "ops@hq.local", AppUserRole.admin_super);
    Cookie master = login("ops@hq.local");
    mockMvc.perform(get("/api/v1/kiosk").cookie(master)).andExpect(status().isForbidden());
  }

  @Test
  void growthPlanDoesNotEntitleKiosk() throws Exception {
    Tenant tenant = persistTenant("growth", "Growth Chemist");
    persistPlan(tenant.getId(), PlanCode.GROWTH);
    persistUser(tenant.getId(), "owner@growth-kiosk.local", AppUserRole.pharmacy_owner);
    Location stall = persistBranch(tenant.getId(), "Kiosk", "BR01", true, BranchType.KIOSK);
    Cookie cookie = login("owner@growth-kiosk.local");
    selectBranch(cookie, stall.getId());
    mockMvc
        .perform(post("/api/v1/kiosk/open").cookie(cookie))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("PLAN_LIMIT"));
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

  private Location persistBranch(
      UUID tenantId, String name, String code, boolean defaultBranch, BranchType type) {
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
    branch.setBranchType(type);
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

  private void persistPlan(UUID tenantId, PlanCode planCode) {
    TenantSubscription subscription = new TenantSubscription();
    subscription.setId(UUID.randomUUID());
    subscription.setTenantId(tenantId);
    subscription.setPlanCode(planCode);
    subscription.setStatus(SubscriptionStatus.ACTIVE);
    subscription.setStartedAt(T0);
    subscription.setCreatedAt(T0);
    subscription.setUpdatedAt(T0);
    tenantSubscriptionRepository.saveAndFlush(subscription);
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
