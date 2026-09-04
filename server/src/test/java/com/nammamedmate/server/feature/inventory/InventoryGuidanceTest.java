package com.nammamedmate.server.feature.inventory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
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
import com.nammamedmate.server.persistence.BranchProductStockLevelRepository;
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
class InventoryGuidanceTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-04T06:00:00Z");

  @Container
  static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:16-alpine")
          .withDatabaseName("nammamedmate_inventory_guidance")
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
  @Autowired private BranchProductStockLevelRepository branchProductStockLevelRepository;
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
    branchProductStockLevelRepository.deleteAll();
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
  void ac01_fefoSuggestedButNonFefoValidBatchMayBeIssued() throws Exception {
    Fixture fx = seed("ac01");
    UUID productId = createBatchedProduct(fx.cookie(), "SKU-FEFO", "Fefo Med", null, null, null);

    receive(fx.cookie(), productId, "LOT-EARLY", "2026-01-01", "2026-09-25", 1000, "10", "r1", 0);
    receive(fx.cookie(), productId, "LOT-LATE", "2026-02-01", "2027-06-30", 2000, "10", "r2", 0);

    MvcResult batches =
        mockMvc
            .perform(
                get("/api/v1/inventory/products/" + productId + "/batches").cookie(fx.cookie()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.items", hasSize(2)))
            .andExpect(jsonPath("$.data.items[0].batchNumber").value("LOT-EARLY"))
            .andExpect(jsonPath("$.data.items[0].suggestedFefo").value(true))
            .andExpect(jsonPath("$.data.items[1].batchNumber").value("LOT-LATE"))
            .andExpect(jsonPath("$.data.items[1].suggestedFefo").value(false))
            .andReturn();

    JsonNode late =
        objectMapper
            .readTree(batches.getResponse().getContentAsString())
            .path("data")
            .path("items")
            .get(1);
    UUID lateBatchId = UUID.fromString(late.path("batchId").asText());
    long version = late.path("version").asLong();

    mockMvc
        .perform(
            post("/api/v1/inventory/issues")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(issueJson(productId, lateBatchId, "1", "iss-late", version)))
        .andExpect(status().isOk());
  }

  @Test
  void ac02_nearExpiryWarnsButRemainsSellable() throws Exception {
    Fixture fx = seed("ac02");
    UUID productId = createBatchedProduct(fx.cookie(), "SKU-NEAR", "Near Med", null, null, null);
    receive(
        fx.cookie(), productId, "LOT-NEAR", "2026-01-01", "2026-09-20", 1500, "5", "recv-near", 0);

    MvcResult batches =
        mockMvc
            .perform(
                get("/api/v1/inventory/products/" + productId + "/batches").cookie(fx.cookie()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.items[0].nearExpiry").value(true))
            .andExpect(jsonPath("$.data.items[0].expired").value(false))
            .andExpect(jsonPath("$.data.items[0].suggestedFefo").value(true))
            .andReturn();

    JsonNode item =
        objectMapper
            .readTree(batches.getResponse().getContentAsString())
            .path("data")
            .path("items")
            .get(0);
    mockMvc
        .perform(
            post("/api/v1/inventory/issues")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    issueJson(
                        productId,
                        UUID.fromString(item.path("batchId").asText()),
                        "1",
                        "iss-near",
                        item.path("version").asLong())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.nearExpiry").value(true));
  }

  @Test
  void ac03_expiryThresholdIsConfigurable() throws Exception {
    Fixture fx = seed("ac03");
    UUID productId = createBatchedProduct(fx.cookie(), "SKU-THR", "Thresh Med", null, null, null);
    receive(fx.cookie(), productId, "LOT-T", "2026-01-01", "2026-09-20", 1000, "5", "recv-t", 0);

    mockMvc
        .perform(get("/api/v1/inventory/settings").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.expiryWarnDays").value(30));

    mockMvc
        .perform(
            put("/api/v1/inventory/settings")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expiryWarnDays\":5}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.expiryWarnDays").value(5));

    mockMvc
        .perform(get("/api/v1/inventory/products/" + productId + "/batches").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items[0].nearExpiry").value(false));

    mockMvc
        .perform(
            put("/api/v1/inventory/settings")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expiryWarnDays\":30}"))
        .andExpect(status().isOk());

    mockMvc
        .perform(get("/api/v1/inventory/products/" + productId + "/batches").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items[0].nearExpiry").value(true));
  }

  @Test
  void ac04_branchReorderLevelsProduceCsv() throws Exception {
    Fixture fx = seed("ac04");
    UUID lowId = createBatchedProduct(fx.cookie(), "SKU-LOW", "Low Med", 20, 100, 5);
    UUID highId = createBatchedProduct(fx.cookie(), "SKU-HIGH", "High Med", 5, 10, 1);

    receive(fx.cookie(), lowId, "LOT-L", "2026-01-01", "2027-06-30", 1000, "3", "recv-low", 0);
    receive(fx.cookie(), highId, "LOT-H", "2026-01-01", "2027-06-30", 1000, "100", "recv-high", 0);

    mockMvc
        .perform(
            put("/api/v1/inventory/products/" + lowId + "/stock-levels")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"reorderLevel\":10,\"reorderQuantity\":50,\"minimumStock\":2}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.reorderLevel").value(10))
        .andExpect(jsonPath("$.data.reorderQuantity").value(50))
        .andExpect(jsonPath("$.data.minimumStock").value(2));

    mockMvc
        .perform(get("/api/v1/inventory/products/" + lowId + "/stock-levels").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.reorderLevel").value(10));

    MvcResult csv =
        mockMvc
            .perform(get("/api/v1/inventory/reorder-report").cookie(fx.cookie()))
            .andExpect(status().isOk())
            .andExpect(content().contentTypeCompatibleWith("text/csv"))
            .andReturn();
    String body = csv.getResponse().getContentAsString();
    assertThat(body).contains("SKU-LOW");
    assertThat(body).contains("suggestedOrderQty");
    assertThat(body).doesNotContain("SKU-HIGH");
  }

  @Test
  void ac05_noMaxStockOrAutomatedPurchasePlacement() throws Exception {
    Fixture fx = seed("ac05");
    UUID productId = createBatchedProduct(fx.cookie(), "SKU-MAX", "Max Med", 10, 20, 2);
    receive(fx.cookie(), productId, "LOT-M", "2026-01-01", "2027-06-30", 1000, "1", "recv-m", 0);

    MvcResult csv =
        mockMvc
            .perform(get("/api/v1/inventory/reorder-report").cookie(fx.cookie()))
            .andExpect(status().isOk())
            .andReturn();
    String body = csv.getResponse().getContentAsString();
    assertThat(body).doesNotContain("maximumStock");
    assertThat(body).doesNotContainIgnoringCase("purchaseOrder");
    assertThat(body).doesNotContainIgnoringCase("autoPo");

    mockMvc
        .perform(get("/api/v1/inventory/valuation").cookie(fx.cookie()))
        .andExpect(status().isOk());
  }

  @Test
  void ac06_valuationUsesBatchPurchasePrice() throws Exception {
    Fixture fx = seed("ac06");
    UUID productId = createBatchedProduct(fx.cookie(), "SKU-VAL", "Val Med", null, null, null);
    receive(fx.cookie(), productId, "LOT-A", "2026-01-01", "2027-06-30", 1000, "10", "recv-a", 0);
    receive(fx.cookie(), productId, "LOT-B", "2026-02-01", "2027-07-30", 2000, "5", "recv-b", 0);

    mockMvc
        .perform(get("/api/v1/inventory/valuation").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.totalPurchaseValuePaise").value(20000));
  }

  @Test
  void ac07_lowStockAlertShowsOtherBranchAndIsolation() throws Exception {
    Tenant tenant = persistTenant("ac07", "Alert Co");
    persistPlan(tenant.getId(), PlanCode.GROWTH);
    persistUser(tenant.getId(), "owner@ac07.local", AppUserRole.pharmacy_owner);
    Location main = persistBranch(tenant.getId(), "Main", "BR01", true);
    Location warehouse = persistBranch(tenant.getId(), "Warehouse", "BR02", false);
    Cookie cookie = login("owner@ac07.local");
    selectBranch(cookie, main.getId());

    UUID productId = createBatchedProduct(cookie, "SKU-XBR", "Cross Med", 50, 100, 10);
    receive(cookie, productId, "LOT-MAIN", "2026-01-01", "2027-06-30", 1000, "5", "recv-main", 0);

    selectBranch(cookie, warehouse.getId());
    receive(cookie, productId, "LOT-WH", "2026-01-01", "2027-06-30", 1000, "40", "recv-wh", 0);

    selectBranch(cookie, main.getId());
    mockMvc
        .perform(get("/api/v1/inventory/alerts").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.lowStock[0].productSku").value("SKU-XBR"))
        .andExpect(jsonPath("$.data.lowStock[0].otherBranches[0].branchName").value("Warehouse"))
        .andExpect(jsonPath("$.data.lowStock[0].otherBranches[0].quantity").value(40));

    Tenant other = persistTenant("ac07-b", "Other Co");
    persistPlan(other.getId(), PlanCode.FREE);
    persistUser(other.getId(), "owner@ac07-b.local", AppUserRole.pharmacy_owner);
    Location otherBranch = persistBranch(other.getId(), "Other Main", "OB01", true);
    Cookie otherCookie = login("owner@ac07-b.local");
    selectBranch(otherCookie, otherBranch.getId());

    mockMvc
        .perform(get("/api/v1/inventory/alerts").cookie(otherCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.lowStock", hasSize(0)));
  }

  @Test
  void ac08_expiredDepletedInaccessibleCannotIssue() throws Exception {
    Fixture fx = seed("ac08");
    UUID productId = createBatchedProduct(fx.cookie(), "SKU-SAFE", "Safe Med", null, null, null);

    MvcResult expiredReceipt =
        receive(
            fx.cookie(),
            productId,
            "LOT-EXP",
            "2025-01-01",
            "2026-08-01",
            1000,
            "5",
            "recv-exp",
            0);
    JsonNode expiredData =
        objectMapper.readTree(expiredReceipt.getResponse().getContentAsString()).path("data");
    mockMvc
        .perform(
            post("/api/v1/inventory/issues")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    issueJson(
                        productId,
                        UUID.fromString(expiredData.path("batchId").asText()),
                        "1",
                        "iss-exp",
                        expiredData.path("version").asLong())))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("BATCH_EXPIRED"));

    MvcResult valid =
        receive(
            fx.cookie(), productId, "LOT-OK", "2026-01-01", "2027-06-30", 1000, "2", "recv-ok", 0);
    JsonNode ok = objectMapper.readTree(valid.getResponse().getContentAsString()).path("data");
    UUID okBatch = UUID.fromString(ok.path("batchId").asText());
    mockMvc
        .perform(
            post("/api/v1/inventory/issues")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    issueJson(productId, okBatch, "2", "iss-all", ok.path("version").asLong())))
        .andExpect(status().isOk());

    mockMvc
        .perform(
            post("/api/v1/inventory/issues")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(issueJson(productId, okBatch, "1", "iss-more", 2)))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("INSUFFICIENT_STOCK"));

    Tenant other = persistTenant("ac08-b", "Other");
    persistPlan(other.getId(), PlanCode.FREE);
    persistUser(other.getId(), "owner@ac08-b.local", AppUserRole.pharmacy_owner);
    Location otherBranch = persistBranch(other.getId(), "Other", "OX01", true);
    Cookie otherCookie = login("owner@ac08-b.local");
    selectBranch(otherCookie, otherBranch.getId());
    UUID otherProduct = createBatchedProduct(otherCookie, "SKU-O", "Other Med", null, null, null);
    mockMvc
        .perform(
            post("/api/v1/inventory/issues")
                .cookie(otherCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(issueJson(otherProduct, okBatch, "1", "iss-x", 1)))
        .andExpect(status().isNotFound());

    receive(
        fx.cookie(),
        productId,
        "LOT-STALE",
        "2026-01-01",
        "2027-06-30",
        1000,
        "3",
        "recv-stale",
        0);
    MvcResult staleBatches =
        mockMvc
            .perform(
                get("/api/v1/inventory/products/" + productId + "/batches").cookie(fx.cookie()))
            .andExpect(status().isOk())
            .andReturn();
    JsonNode staleItem = null;
    for (JsonNode n :
        objectMapper
            .readTree(staleBatches.getResponse().getContentAsString())
            .path("data")
            .path("items")) {
      if ("LOT-STALE".equals(n.path("batchNumber").asText())) {
        staleItem = n;
        break;
      }
    }
    assertThat(staleItem).isNotNull();
    mockMvc
        .perform(
            post("/api/v1/inventory/issues")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    issueJson(
                        productId,
                        UUID.fromString(staleItem.path("batchId").asText()),
                        "1",
                        "iss-stale",
                        999)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("STALE_STATE"));

    Tenant denied = persistTenant("ac08-denied", "Denied");
    persistPlan(denied.getId(), PlanCode.FREE);
    persistUser(denied.getId(), "staff@ac08-denied.local", AppUserRole.pharmacy_staff);
    Cookie staff = login("staff@ac08-denied.local");
    mockMvc
        .perform(get("/api/v1/inventory/settings").cookie(staff))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    mockMvc
        .perform(get("/api/v1/inventory/alerts").cookie(staff))
        .andExpect(status().isForbidden());
  }

  @Test
  void ac04_sameSkuKeepsIndependentReorderPerBranch() throws Exception {
    Tenant tenant = persistTenant("ac04-b", "Split Levels");
    persistPlan(tenant.getId(), PlanCode.GROWTH);
    persistUser(tenant.getId(), "owner@ac04-b.local", AppUserRole.pharmacy_owner);
    Location main = persistBranch(tenant.getId(), "Main", "BR01", true);
    Location warehouse = persistBranch(tenant.getId(), "Warehouse", "BR02", false);
    Cookie cookie = login("owner@ac04-b.local");
    selectBranch(cookie, main.getId());

    UUID productId = createBatchedProduct(cookie, "SKU-SPLIT", "Split Med", 50, 100, 10);
    receive(cookie, productId, "LOT-M", "2026-01-01", "2027-06-30", 1000, "20", "recv-m", 0);

    mockMvc
        .perform(
            put("/api/v1/inventory/products/" + productId + "/stock-levels")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"reorderLevel\":10,\"reorderQuantity\":40,\"minimumStock\":2}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.reorderLevel").value(10));

    selectBranch(cookie, warehouse.getId());
    receive(cookie, productId, "LOT-W", "2026-01-01", "2027-06-30", 1000, "20", "recv-w", 0);
    mockMvc
        .perform(
            put("/api/v1/inventory/products/" + productId + "/stock-levels")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"reorderLevel\":50,\"reorderQuantity\":90,\"minimumStock\":15}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.reorderLevel").value(50));

    selectBranch(cookie, main.getId());
    mockMvc
        .perform(get("/api/v1/inventory/products/" + productId + "/stock-levels").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.reorderLevel").value(10))
        .andExpect(jsonPath("$.data.reorderQuantity").value(40));
    String mainCsv =
        mockMvc
            .perform(get("/api/v1/inventory/reorder-report").cookie(cookie))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    assertThat(mainCsv).doesNotContain("SKU-SPLIT");

    selectBranch(cookie, warehouse.getId());
    mockMvc
        .perform(get("/api/v1/inventory/products/" + productId + "/stock-levels").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.reorderLevel").value(50))
        .andExpect(jsonPath("$.data.minimumStock").value(15));
    String warehouseCsv =
        mockMvc
            .perform(get("/api/v1/inventory/reorder-report").cookie(cookie))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    assertThat(warehouseCsv).contains("SKU-SPLIT");
    mockMvc
        .perform(get("/api/v1/inventory/alerts").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.lowStock[0].productSku").value("SKU-SPLIT"));
  }

  private Fixture seed(String tag) throws Exception {
    Tenant tenant = persistTenant(tag, "Guidance " + tag);
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@" + tag + ".local", AppUserRole.pharmacy_owner);
    Location branch = persistBranch(tenant.getId(), "Main", "BR01", true);
    Cookie cookie = login("owner@" + tag + ".local");
    selectBranch(cookie, branch.getId());
    return new Fixture(tenant.getId(), branch.getId(), cookie);
  }

  private MvcResult receive(
      Cookie cookie,
      UUID productId,
      String batchNumber,
      String mfg,
      String expires,
      long price,
      String qty,
      String key,
      long version)
      throws Exception {
    return mockMvc
        .perform(
            post("/api/v1/inventory/receipts")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    receiptJson(productId, batchNumber, mfg, expires, price, qty, key, version)))
        .andExpect(status().isOk())
        .andReturn();
  }

  private UUID createBatchedProduct(
      Cookie cookie, String sku, String name, Integer reorder, Integer reorderQty, Integer min)
      throws Exception {
    UUID categoryId = createCategory(cookie, "Cat-" + sku);
    MvcResult created =
        mockMvc
            .perform(
                post("/api/v1/products")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        productJson(sku, name, categoryId, true, true, reorder, reorderQty, min)))
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
    Map<String, Object> inventory = new LinkedHashMap<>();
    inventory.put("expiryWarnDays", 30);
    branch.setInventorySettings(inventory);
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
    return """
        {"productId":"%s","batchNumber":"%s","manufacturedOn":"%s","expiresOn":"%s","purchasePricePaise":%d,"quantity":%s,"idempotencyKey":"%s","expectedVersion":%d}
        """
        .formatted(
            productId,
            batchNumber,
            manufacturedOn,
            expiresOn,
            pricePaise,
            quantity,
            key,
            expectedVersion);
  }

  private static String issueJson(
      UUID productId, UUID batchId, String quantity, String key, long expectedVersion) {
    return """
        {"productId":"%s","batchId":"%s","quantity":%s,"idempotencyKey":"%s","expectedVersion":%d}
        """
        .formatted(productId, batchId, quantity, key, expectedVersion);
  }

  private static String productJson(
      String sku,
      String name,
      UUID categoryId,
      boolean batch,
      boolean expiry,
      Integer reorderLevel,
      Integer reorderQuantity,
      Integer minimumStock) {
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
          "reorderLevel":%s,
          "reorderQuantity":%s,
          "minimumStock":%s,
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
        .formatted(
            sku,
            name,
            categoryId,
            reorderLevel == null ? "null" : reorderLevel,
            reorderQuantity == null ? "null" : reorderQuantity,
            minimumStock == null ? "null" : minimumStock,
            batch,
            expiry);
  }

  private record Fixture(UUID tenantId, UUID branchId, Cookie cookie) {}
}
