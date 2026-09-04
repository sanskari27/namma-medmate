package com.nammamedmate.server.feature.inventory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.AbstractIntegrationTest;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.BranchType;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.StockAdjustmentStatus;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.ApprovalDecisionRepository;
import com.nammamedmate.server.persistence.ApprovalRequestRepository;
import com.nammamedmate.server.persistence.ApprovalRuleRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.ManufacturerRepository;
import com.nammamedmate.server.persistence.NotificationDeliveryRepository;
import com.nammamedmate.server.persistence.NotificationEventRepository;
import com.nammamedmate.server.persistence.NotificationRepository;
import com.nammamedmate.server.persistence.NotificationSourceRepository;
import com.nammamedmate.server.persistence.ProductCategoryRepository;
import com.nammamedmate.server.persistence.ProductRepository;
import com.nammamedmate.server.persistence.StockAdjustmentRepository;
import com.nammamedmate.server.persistence.StockBalanceRepository;
import com.nammamedmate.server.persistence.StockBatchRepository;
import com.nammamedmate.server.persistence.StockMovementRepository;
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

class InventoryAdjustmentRollbackTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-04T09:30:00Z");

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private UserSessionRepository userSessionRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private ProductRepository productRepository;
  @Autowired private ProductCategoryRepository productCategoryRepository;
  @Autowired private ManufacturerRepository manufacturerRepository;
  @Autowired private StockBatchRepository stockBatchRepository;
  @Autowired private StockBalanceRepository stockBalanceRepository;
  @Autowired private StockMovementRepository stockMovementRepository;
  @Autowired private StockAdjustmentRepository stockAdjustmentRepository;
  @Autowired private ApprovalRuleRepository approvalRuleRepository;
  @Autowired private ApprovalRequestRepository approvalRequestRepository;
  @Autowired private ApprovalDecisionRepository approvalDecisionRepository;
  @Autowired private NotificationDeliveryRepository notificationDeliveryRepository;
  @Autowired private NotificationRepository notificationRepository;
  @Autowired private NotificationEventRepository notificationEventRepository;
  @Autowired private NotificationSourceRepository notificationSourceRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @BeforeEach
  void wipe() {
    notificationDeliveryRepository.deleteAll();
    notificationRepository.deleteAll();
    notificationEventRepository.deleteAll();
    notificationSourceRepository.deleteAll();
    approvalDecisionRepository.deleteAll();
    stockAdjustmentRepository.deleteAll();
    approvalRequestRepository.deleteAll();
    approvalRuleRepository.deleteAll();
    stockMovementRepository.deleteAll();
    stockBalanceRepository.deleteAll();
    stockBatchRepository.deleteAll();
    productRepository.deleteAll();
    manufacturerRepository.deleteAll();
    productCategoryRepository.deleteAll();
    userSessionRepository.deleteAll();
    locationRepository.deleteAll();
    tenantSubscriptionRepository.deleteAll();
    appUserRepository.deleteAll();
    tenantRepository.deleteAll();
  }

  @Test
  void failedApplyLeavesAdjustmentPendingAndStockUnchanged() throws Exception {
    Tenant tenant = persistTenant("adj-roll", "Adj Roll");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@adj-roll.local", AppUserRole.pharmacy_owner);
    Location branch = persistBranch(tenant.getId(), "Main", "BR01", true);
    Cookie cookie = login("owner@adj-roll.local");
    selectBranch(cookie, branch.getId());
    createWriteOffRule(cookie);

    UUID categoryId =
        UUID.fromString(
            objectMapper
                .readTree(
                    mockMvc
                        .perform(
                            post("/api/v1/product-categories")
                                .cookie(cookie)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"name\":\"Tablets\"}"))
                        .andExpect(status().isOk())
                        .andReturn()
                        .getResponse()
                        .getContentAsString())
                .path("data")
                .path("id")
                .asText());
    UUID productId =
        UUID.fromString(
            objectMapper
                .readTree(
                    mockMvc
                        .perform(
                            post("/api/v1/products")
                                .cookie(cookie)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                    """
                                    {"sku":"SKU-ADJ-R","name":"Adj Roll","categoryId":"%s","productType":"Medicine","dosageForm":"Tablet","prescriptionRequired":false,"baseUnit":"Tablet","packSize":10,"packUnit":"strip","requiresColdStorage":false,"isDiscontinued":false,"isReturnable":true,"isTaxable":true,"requiresBatchTracking":true,"requiresExpiryTracking":true,"requiresSerialTracking":false,"controlledSubstance":false,"isActive":true}
                                    """
                                        .formatted(categoryId)))
                        .andExpect(status().isOk())
                        .andReturn()
                        .getResponse()
                        .getContentAsString())
                .path("data")
                .path("id")
                .asText());
    mockMvc
        .perform(
            post("/api/v1/inventory/receipts")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"productId":"%s","batchNumber":"LOT-R","manufacturedOn":"2026-01-01","expiresOn":"2027-01-01","purchasePricePaise":1000,"quantity":5,"idempotencyKey":"adj-roll-in","expectedVersion":0}
                    """
                        .formatted(productId)))
        .andExpect(status().isOk());
    UUID batchId = stockBatchRepository.findAll().get(0).getId();

    JsonNode created =
        objectMapper
            .readTree(
                mockMvc
                    .perform(
                        post("/api/v1/inventory/adjustments")
                            .cookie(cookie)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(
                                """
                                {"productId":"%s","batchId":"%s","reason":"THEFT_LOSS","quantity":4,"direction":"OUT","idempotencyKey":"adj-roll-req"}
                                """
                                    .formatted(productId, batchId)))
                    .andExpect(status().isOk())
                    .andReturn()
                    .getResponse()
                    .getContentAsString())
            .path("data");

    mockMvc
        .perform(
            post("/api/v1/inventory/issues")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"productId":"%s","batchId":"%s","quantity":3,"idempotencyKey":"adj-roll-issue","expectedVersion":1}
                    """
                        .formatted(productId, batchId)))
        .andExpect(status().isOk());

    long movements = stockMovementRepository.count();
    mockMvc
        .perform(
            post("/api/v1/inventory/adjustments/" + created.path("id").asText() + "/decide")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"outcome":"APPROVED","expectedVersion":%d,"note":"late"}
                    """
                        .formatted(created.path("version").asInt())))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("INSUFFICIENT_STOCK"));

    assertThat(stockMovementRepository.count()).isEqualTo(movements);
    assertThat(stockBalanceRepository.findAll().get(0).getQuantity()).isEqualByComparingTo("2");
    assertThat(stockAdjustmentRepository.findAll().get(0).getStatus())
        .isEqualTo(StockAdjustmentStatus.PENDING);
    assertThat(approvalDecisionRepository.count()).isZero();
  }

  private void createWriteOffRule(Cookie cookie) throws Exception {
    mockMvc
        .perform(
            post("/api/v1/approvals/rules")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "moduleCode":"INVENTORY",
                      "actionKey":"INVENTORY_WRITE_OFF",
                      "thresholdValue":1,
                      "approverType":"ACCOUNT_CLASS",
                      "approverAccountClass":"pharmacy_owner",
                      "allowSelfApproval":true
                    }
                    """))
        .andExpect(status().isOk());
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
    user.setMustChangePassword(false);
    user.setCreatedAt(T0);
    user.setUpdatedAt(T0);
    user.setPasswordChangedAt(T0);
    return appUserRepository.saveAndFlush(user);
  }

  private Cookie login(String email) throws Exception {
    return mockMvc
        .perform(
            post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}"))
        .andExpect(status().isOk())
        .andReturn()
        .getResponse()
        .getCookie("nmm_access");
  }
}
