package com.nammamedmate.server.feature.inventory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.AbstractIntegrationTest;
import com.nammamedmate.server.application.inventory.CreateStockTransferCommand;
import com.nammamedmate.server.application.inventory.StockTransferService;
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
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.ManufacturerRepository;
import com.nammamedmate.server.persistence.NotificationDeliveryRepository;
import com.nammamedmate.server.persistence.NotificationEventRepository;
import com.nammamedmate.server.persistence.NotificationRepository;
import com.nammamedmate.server.persistence.NotificationSourceRepository;
import com.nammamedmate.server.persistence.ProductCategoryRepository;
import com.nammamedmate.server.persistence.ProductRepository;
import com.nammamedmate.server.persistence.StockBalanceRepository;
import com.nammamedmate.server.persistence.StockBatchRepository;
import com.nammamedmate.server.persistence.StockMovementRepository;
import com.nammamedmate.server.persistence.StockTransferLineRepository;
import com.nammamedmate.server.persistence.StockTransferRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import com.nammamedmate.server.persistence.UserSessionRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import jakarta.servlet.http.Cookie;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

class StockTransferRollbackTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-04T08:30:00Z");

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
  @Autowired private NotificationDeliveryRepository notificationDeliveryRepository;
  @Autowired private NotificationRepository notificationRepository;
  @Autowired private NotificationEventRepository notificationEventRepository;
  @Autowired private NotificationSourceRepository notificationSourceRepository;
  @Autowired private StockBatchRepository stockBatchRepository;
  @Autowired private StockBalanceRepository stockBalanceRepository;
  @Autowired private StockMovementRepository stockMovementRepository;
  @Autowired private StockTransferRepository stockTransferRepository;
  @Autowired private StockTransferLineRepository stockTransferLineRepository;
  @Autowired private PasswordEncoder passwordEncoder;
  @Autowired private StockTransferService stockTransferService;

  @BeforeEach
  void wipe() {
    notificationDeliveryRepository.deleteAll();
    notificationRepository.deleteAll();
    notificationEventRepository.deleteAll();
    notificationSourceRepository.deleteAll();
    stockTransferLineRepository.deleteAll();
    stockTransferRepository.deleteAll();
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
  void insufficientPushLeavesNoPartialTransfer() throws Exception {
    Tenant tenant = persistTenant("rb1", "Rollback");
    persistPlan(tenant.getId());
    AppUser owner = persistUser(tenant.getId(), "owner@rb1.local");
    Location a = persistBranch(tenant.getId(), "A", "RBA", true);
    Location b = persistBranch(tenant.getId(), "B", "RBB", false);
    Cookie cookie = login("owner@rb1.local");
    selectBranch(cookie, a.getId());
    UUID productId = createProduct(cookie, "SKU-RB", "Rollback Med");
    UUID batchId = receive(cookie, productId, "LOT-RB", "3", "rb-in");

    AuthPrincipal principal =
        new AuthPrincipal(
                owner.getId(), tenant.getId(), UUID.randomUUID(), AppUserRole.pharmacy_owner)
            .withActiveBranchId(a.getId());

    assertThatThrownBy(
            () ->
                stockTransferService.create(
                    principal,
                    new CreateStockTransferCommand(
                        "PUSH",
                        b.getId(),
                        List.of(
                            new CreateStockTransferCommand.Line(
                                productId, batchId, new BigDecimal("9"))),
                        "rb-over")))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo("INSUFFICIENT_STOCK");

    assertThat(stockTransferRepository.count()).isZero();
    assertThat(stockTransferLineRepository.count()).isZero();
    assertThat(
            stockBalanceRepository
                .findByTenantIdAndBranchIdAndProductIdAndBatchId(
                    tenant.getId(), a.getId(), productId, batchId)
                .orElseThrow()
                .getQuantity())
        .isEqualByComparingTo("3");
  }

  private UUID createProduct(Cookie cookie, String sku, String name) throws Exception {
    MvcResult cat =
        mockMvc
            .perform(
                post("/api/v1/product-categories")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":\"Cat-" + sku + "\"}"))
            .andExpect(status().isOk())
            .andReturn();
    UUID categoryId =
        UUID.fromString(
            objectMapper
                .readTree(cat.getResponse().getContentAsString())
                .path("data")
                .path("id")
                .asText());
    MvcResult created =
        mockMvc
            .perform(
                post("/api/v1/products")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {"sku":"%s","barcode":null,"name":"%s","genericName":null,"brandName":null,"manufacturerId":null,"categoryId":"%s","productType":"Medicine","dosageForm":"Tablet","therapeuticClass":null,"composition":null,"strength":null,"route":null,"prescriptionRequired":false,"scheduleClassification":null,"hsnCode":null,"gstRate":null,"baseUnit":"Tablet","packSize":10,"packUnit":"strip","packDescription":null,"storageConditions":null,"requiresColdStorage":false,"rackLocation":null,"reorderLevel":null,"reorderQuantity":null,"minimumStock":null,"isDiscontinued":false,"isReturnable":true,"isTaxable":true,"taxCategory":null,"requiresBatchTracking":true,"requiresExpiryTracking":true,"requiresSerialTracking":false,"controlledSubstance":false,"notes":null,"isActive":true}
                        """
                            .formatted(sku, name, categoryId)))
            .andExpect(status().isOk())
            .andReturn();
    return UUID.fromString(
        objectMapper
            .readTree(created.getResponse().getContentAsString())
            .path("data")
            .path("id")
            .asText());
  }

  private UUID receive(Cookie cookie, UUID productId, String lot, String qty, String key)
      throws Exception {
    MvcResult received =
        mockMvc
            .perform(
                post("/api/v1/inventory/receipts")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {"productId":"%s","batchNumber":"%s","manufacturedOn":"2026-01-01","expiresOn":"2027-01-01","purchasePricePaise":1000,"quantity":%s,"idempotencyKey":"%s","expectedVersion":0}
                        """
                            .formatted(productId, lot, qty, key)))
            .andExpect(status().isOk())
            .andReturn();
    return UUID.fromString(
        objectMapper
            .readTree(received.getResponse().getContentAsString())
            .path("data")
            .path("batchId")
            .asText());
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

  private void persistPlan(UUID tenantId) {
    TenantSubscription subscription = new TenantSubscription();
    subscription.setId(UUID.randomUUID());
    subscription.setTenantId(tenantId);
    subscription.setPlanCode(PlanCode.GROWTH);
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

  private AppUser persistUser(UUID tenantId, String email) {
    AppUser user = new AppUser();
    user.setId(UUID.randomUUID());
    user.setTenantId(tenantId);
    user.setEmail(email);
    user.setPasswordHash(passwordEncoder.encode(PASSWORD));
    user.setDisplayName("Owner");
    user.setRole(AppUserRole.pharmacy_owner);
    user.setActive(true);
    user.setStatus(UserAccountStatus.ACTIVE);
    user.setMustChangePassword(false);
    user.setCreatedAt(T0);
    user.setUpdatedAt(T0);
    user.setPasswordChangedAt(T0);
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
