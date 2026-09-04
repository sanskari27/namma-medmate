package com.nammamedmate.server.feature.inventory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.domain.AccessRoleKind;
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
import com.nammamedmate.server.persistence.AccessRoleEventRepository;
import com.nammamedmate.server.persistence.AccessRoleModuleRepository;
import com.nammamedmate.server.persistence.AccessRoleRepository;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.ManufacturerRepository;
import com.nammamedmate.server.persistence.ProductCategoryRepository;
import com.nammamedmate.server.persistence.ProductRepository;
import com.nammamedmate.server.persistence.StockBalanceRepository;
import com.nammamedmate.server.persistence.StockBatchRepository;
import com.nammamedmate.server.persistence.StockMovementRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import com.nammamedmate.server.persistence.UserAccessRoleRepository;
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
class InventoryStockTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-04T06:00:00Z");

  @Container
  static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:16-alpine")
          .withDatabaseName("nammamedmate_inventory_stock")
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
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private ProductRepository productRepository;
  @Autowired private ProductCategoryRepository productCategoryRepository;
  @Autowired private ManufacturerRepository manufacturerRepository;
  @Autowired private StockBatchRepository stockBatchRepository;
  @Autowired private StockBalanceRepository stockBalanceRepository;
  @Autowired private StockMovementRepository stockMovementRepository;
  @Autowired private UserAccessRoleRepository userAccessRoleRepository;
  @Autowired private AccessRoleEventRepository accessRoleEventRepository;
  @Autowired private AccessRoleModuleRepository accessRoleModuleRepository;
  @Autowired private AccessRoleRepository accessRoleRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @BeforeEach
  void wipe() {
    stockMovementRepository.deleteAll();
    stockBalanceRepository.deleteAll();
    stockBatchRepository.deleteAll();
    productRepository.deleteAll();
    manufacturerRepository.deleteAll();
    productCategoryRepository.deleteAll();
    accessRoleEventRepository.deleteAll();
    userAccessRoleRepository.deleteAll();
    accessRoleRepository
        .findByKind(AccessRoleKind.CUSTOM)
        .forEach(
            role -> {
              accessRoleModuleRepository.deleteAll(
                  accessRoleModuleRepository.findByRoleIdIn(java.util.List.of(role.getId())));
              accessRoleRepository.delete(role);
            });
    userSessionRepository.deleteAll();
    locationRepository.deleteAll();
    tenantSubscriptionRepository.deleteAll();
    appUserRepository.deleteAll();
    tenantRepository.deleteAll();
  }

  @Test
  void ac01_receiptRetainsBatchNumberMfgExpiryAndPurchasePrice() throws Exception {
    Fixture fx = seed("ac01");
    UUID productId = createBatchedProduct(fx.cookie(), "SKU-B1", "Crocin");

    mockMvc
        .perform(
            post("/api/v1/inventory/receipts")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    receiptJson(
                        productId, "LOT-AA", "2026-01-15", "2027-06-30", 12500, "10", "recv-1", 0)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.batchNumber").value("LOT-AA"))
        .andExpect(jsonPath("$.data.manufacturedOn").value("2026-01-15"))
        .andExpect(jsonPath("$.data.expiresOn").value("2027-06-30"))
        .andExpect(jsonPath("$.data.purchasePricePaise").value(12500))
        .andExpect(jsonPath("$.data.quantity").value(10))
        .andExpect(jsonPath("$.data.version").value(1));

    mockMvc
        .perform(get("/api/v1/inventory/products/" + productId + "/batches").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(1)))
        .andExpect(jsonPath("$.data.items[0].batchNumber").value("LOT-AA"))
        .andExpect(jsonPath("$.data.items[0].manufacturedOn").value("2026-01-15"))
        .andExpect(jsonPath("$.data.items[0].expiresOn").value("2027-06-30"))
        .andExpect(jsonPath("$.data.items[0].purchasePricePaise").value(12500));

    assertThat(stockBatchRepository.count()).isEqualTo(1);
    assertThat(stockBatchRepository.findAll().get(0).getPurchasePricePaise()).isEqualTo(12500L);
  }

  @Test
  void ac02_batchTrackingMandatoryWhenProductRequiresIt() throws Exception {
    Fixture fx = seed("ac02");
    UUID batched = createBatchedProduct(fx.cookie(), "SKU-REQ", "Batch Med");
    UUID plain = createPlainProduct(fx.cookie(), "SKU-PLAIN", "OTC Soap");

    mockMvc
        .perform(
            post("/api/v1/inventory/receipts")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"productId":"%s","batchNumber":null,"manufacturedOn":null,"expiresOn":null,"purchasePricePaise":100,"quantity":5,"idempotencyKey":"no-batch","expectedVersion":0}
                    """
                        .formatted(batched)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

    mockMvc
        .perform(
            post("/api/v1/inventory/receipts")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    receiptJson(batched, "LOT-1", "2026-02-01", null, 1000, "5", "no-expiry", 0)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

    mockMvc
        .perform(
            post("/api/v1/inventory/receipts")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    receiptJson(
                        batched, "LOT-BAD", "2027-01-01", "2026-01-01", 1000, "5", "bad-dates", 0)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

    mockMvc
        .perform(
            post("/api/v1/inventory/receipts")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"productId":"%s","batchNumber":null,"manufacturedOn":null,"expiresOn":null,"purchasePricePaise":null,"quantity":3,"idempotencyKey":"plain-ok","expectedVersion":0}
                    """
                        .formatted(plain)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.batchId").isEmpty())
        .andExpect(jsonPath("$.data.quantity").value(3));
  }

  @Test
  void ac03_inventoryIsStrictlyBranchScoped() throws Exception {
    Tenant tenant = persistTenant("ac03", "Branch Scope");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@ac03.local", AppUserRole.pharmacy_owner);
    Location branchA = persistBranch(tenant.getId(), "Outlet A", "BRA", true);
    Location branchB = persistBranch(tenant.getId(), "Outlet B", "BRB", false);
    Cookie cookie = login("owner@ac03.local");
    selectBranch(cookie, branchA.getId());
    UUID productId = createBatchedProduct(cookie, "SKU-BR", "Branch Med");

    mockMvc
        .perform(
            post("/api/v1/inventory/receipts")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    receiptJson(
                        productId, "LOT-A", "2026-01-01", "2027-01-01", 900, "8", "a-recv", 0)))
        .andExpect(status().isOk());

    selectBranch(cookie, branchB.getId());
    mockMvc
        .perform(get("/api/v1/inventory/balances").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(0)));

    mockMvc
        .perform(get("/api/v1/inventory/products/" + productId + "/batches").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(0)));

    selectBranch(cookie, branchA.getId());
    mockMvc
        .perform(get("/api/v1/inventory/balances").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(1)))
        .andExpect(jsonPath("$.data.items[0].quantity").value(8));

    Tenant other = persistTenant("ac03-b", "Other");
    persistPlan(other.getId(), PlanCode.FREE);
    persistUser(other.getId(), "owner@ac03-b.local", AppUserRole.pharmacy_owner);
    Location otherBranch = persistBranch(other.getId(), "Other", "BRO", true);
    Cookie otherCookie = login("owner@ac03-b.local");
    selectBranch(otherCookie, otherBranch.getId());
    mockMvc
        .perform(get("/api/v1/inventory/balances").cookie(otherCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(0)));
    mockMvc
        .perform(get("/api/v1/inventory/products/" + productId + "/batches").cookie(otherCookie))
        .andExpect(status().isNotFound());
  }

  @Test
  void ac04_mutationsCreateImmutableMovementsAndCannotGoNegative() throws Exception {
    Fixture fx = seed("ac04");
    UUID productId = createBatchedProduct(fx.cookie(), "SKU-MV", "Move Med");

    MvcResult received =
        mockMvc
            .perform(
                post("/api/v1/inventory/receipts")
                    .cookie(fx.cookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        receiptJson(
                            productId,
                            "LOT-M",
                            "2026-03-01",
                            "2027-03-01",
                            2000,
                            "10",
                            "mv-in",
                            0)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.quantity").value(10))
            .andReturn();
    UUID batchId =
        UUID.fromString(
            objectMapper
                .readTree(received.getResponse().getContentAsString())
                .path("data")
                .path("batchId")
                .asText());
    long version =
        objectMapper
            .readTree(received.getResponse().getContentAsString())
            .path("data")
            .path("version")
            .asLong();

    mockMvc
        .perform(
            post("/api/v1/inventory/issues")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"productId":"%s","batchId":"%s","quantity":4,"idempotencyKey":"mv-out","expectedVersion":%d}
                    """
                        .formatted(productId, batchId, version)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.quantity").value(6));

    mockMvc
        .perform(
            get("/api/v1/inventory/movements")
                .cookie(fx.cookie())
                .param("productId", productId.toString()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(2)))
        .andExpect(jsonPath("$.data.items[*].type", hasItem("STOCK_IN")))
        .andExpect(jsonPath("$.data.items[*].type", hasItem("STOCK_OUT")));

    mockMvc
        .perform(
            post("/api/v1/inventory/issues")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"productId":"%s","batchId":"%s","quantity":7,"idempotencyKey":"mv-over","expectedVersion":2}
                    """
                        .formatted(productId, batchId)))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("INSUFFICIENT_STOCK"));

    assertThat(stockBalanceRepository.findAll().get(0).getQuantity()).isEqualByComparingTo("6");
    assertThat(stockMovementRepository.count()).isEqualTo(2);
  }

  @Test
  void ac05_duplicateBatchIdentityAndCrossBranchFailAtomically() throws Exception {
    Fixture fx = seed("ac05");
    UUID productId = createBatchedProduct(fx.cookie(), "SKU-DUP", "Dup Med");

    mockMvc
        .perform(
            post("/api/v1/inventory/receipts")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    receiptJson(
                        productId, "LOT-SAME", "2026-01-01", "2027-01-01", 1000, "5", "dup-1", 0)))
        .andExpect(status().isOk());

    mockMvc
        .perform(
            post("/api/v1/inventory/receipts")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    receiptJson(
                        productId, "LOT-SAME", "2026-02-01", "2027-02-01", 1100, "2", "dup-2", 1)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("BATCH_IDENTITY_CONFLICT"));

    assertThat(stockBatchRepository.count()).isEqualTo(1);
    assertThat(stockBalanceRepository.findAll().get(0).getQuantity()).isEqualByComparingTo("5");
    assertThat(stockMovementRepository.count()).isEqualTo(1);

    mockMvc
        .perform(
            post("/api/v1/inventory/receipts")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    receiptJson(
                        productId,
                        "LOT-SAME",
                        "2026-01-01",
                        "2027-01-01",
                        1000,
                        "3",
                        "dup-add",
                        1)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.quantity").value(8));

    mockMvc
        .perform(
            post("/api/v1/inventory/receipts")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    receiptJson(
                        productId, "LOT-SAME", "2026-01-01", "2027-01-01", 9999, "1", "dup-1", 2)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("IDEMPOTENCY_CONFLICT"));

    Location otherBranch = persistBranch(fx.tenantId(), "Other till", "BRX", false);
    selectBranch(fx.cookie(), otherBranch.getId());
    long movementsBefore = stockMovementRepository.count();
    mockMvc
        .perform(
            post("/api/v1/inventory/issues")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"productId":"%s","batchId":"%s","quantity":1,"idempotencyKey":"cross-out","expectedVersion":0}
                    """
                        .formatted(productId, stockBatchRepository.findAll().get(0).getId())))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("INSUFFICIENT_STOCK"));
    assertThat(stockMovementRepository.count()).isEqualTo(movementsBefore);

    mockMvc
        .perform(get("/api/v1/inventory/balances").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(0)));

    Cookie noBranch = login("owner@ac05.local");
    mockMvc
        .perform(get("/api/v1/inventory/balances").cookie(noBranch))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("NO_ACTIVE_BRANCH"));
  }

  @Test
  void inventoryModuleDeniedBlocksStock() throws Exception {
    Tenant tenant = persistTenant("denied", "Denied");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "staff@denied.local", AppUserRole.pharmacy_staff);
    Cookie cookie = login("staff@denied.local");
    mockMvc
        .perform(get("/api/v1/inventory/balances").cookie(cookie))
        .andExpect(status().isForbidden());
  }

  private Fixture seed(String tag) throws Exception {
    Tenant tenant = persistTenant(tag, "Stock " + tag);
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@" + tag + ".local", AppUserRole.pharmacy_owner);
    Location branch = persistBranch(tenant.getId(), "Main", "BR01", true);
    Cookie cookie = login("owner@" + tag + ".local");
    selectBranch(cookie, branch.getId());
    return new Fixture(tenant.getId(), branch.getId(), cookie);
  }

  private UUID createBatchedProduct(Cookie cookie, String sku, String name) throws Exception {
    UUID categoryId = createCategory(cookie, "Tablets-" + sku);
    MvcResult created =
        mockMvc
            .perform(
                post("/api/v1/products")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(productJson(sku, name, categoryId, true, true)))
            .andExpect(status().isOk())
            .andReturn();
    return UUID.fromString(
        objectMapper
            .readTree(created.getResponse().getContentAsString())
            .path("data")
            .path("id")
            .asText());
  }

  private UUID createPlainProduct(Cookie cookie, String sku, String name) throws Exception {
    UUID categoryId = createCategory(cookie, "OTC-" + sku);
    MvcResult created =
        mockMvc
            .perform(
                post("/api/v1/products")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(productJson(sku, name, categoryId, false, false)))
            .andExpect(status().isOk())
            .andReturn();
    return UUID.fromString(
        objectMapper
            .readTree(created.getResponse().getContentAsString())
            .path("data")
            .path("id")
            .asText());
  }

  private UUID createCategory(Cookie cookie, String name) throws Exception {
    MvcResult result =
        mockMvc
            .perform(
                post("/api/v1/product-categories")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":\"" + name + "\"}"))
            .andExpect(status().isOk())
            .andReturn();
    return UUID.fromString(
        objectMapper
            .readTree(result.getResponse().getContentAsString())
            .path("data")
            .path("id")
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

  private static String receiptJson(
      UUID productId,
      String batchNumber,
      String manufacturedOn,
      String expiresOn,
      long pricePaise,
      String quantity,
      String key,
      long expectedVersion) {
    String expires = expiresOn == null ? "null" : "\"" + expiresOn + "\"";
    String mfg = manufacturedOn == null ? "null" : "\"" + manufacturedOn + "\"";
    return """
        {"productId":"%s","batchNumber":"%s","manufacturedOn":%s,"expiresOn":%s,"purchasePricePaise":%d,"quantity":%s,"idempotencyKey":"%s","expectedVersion":%d}
        """
        .formatted(
            productId, batchNumber, mfg, expires, pricePaise, quantity, key, expectedVersion);
  }

  private static String productJson(
      String sku, String name, UUID categoryId, boolean batch, boolean expiry) {
    return """
        {
          "sku":"%s",
          "barcode":null,
          "name":"%s",
          "genericName":null,
          "brandName":null,
          "manufacturerId":null,
          "categoryId":"%s",
          "productType":"Medicine",
          "dosageForm":"Tablet",
          "therapeuticClass":null,
          "composition":null,
          "strength":null,
          "route":null,
          "prescriptionRequired":false,
          "scheduleClassification":null,
          "hsnCode":null,
          "gstRate":null,
          "baseUnit":"Tablet",
          "packSize":10,
          "packUnit":"strip",
          "packDescription":null,
          "storageConditions":null,
          "requiresColdStorage":false,
          "rackLocation":null,
          "reorderLevel":null,
          "reorderQuantity":null,
          "minimumStock":null,
          "isDiscontinued":false,
          "isReturnable":true,
          "isTaxable":true,
          "taxCategory":null,
          "requiresBatchTracking":%s,
          "requiresExpiryTracking":%s,
          "requiresSerialTracking":false,
          "controlledSubstance":false,
          "notes":null,
          "isActive":true
        }
        """
        .formatted(sku, name, categoryId, batch, expiry);
  }

  private record Fixture(UUID tenantId, UUID branchId, Cookie cookie) {}
}
