package com.nammamedmate.server.feature.inventory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
import com.nammamedmate.server.domain.StockAdjustmentReason;
import com.nammamedmate.server.domain.StockMovementType;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AccessRoleEventRepository;
import com.nammamedmate.server.persistence.AccessRoleModuleRepository;
import com.nammamedmate.server.persistence.AccessRoleRepository;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.ApprovalDecisionRepository;
import com.nammamedmate.server.persistence.ApprovalRequestRepository;
import com.nammamedmate.server.persistence.ApprovalRuleRepository;
import com.nammamedmate.server.persistence.AuditEventRepository;
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
import com.nammamedmate.server.persistence.StockTakeLineRepository;
import com.nammamedmate.server.persistence.StockTakeRepository;
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
class StockTakeTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-05T04:00:00Z");

  @Container
  static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:16-alpine")
          .withDatabaseName("nammamedmate_stock_take")
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
  @Autowired private StockTakeRepository stockTakeRepository;
  @Autowired private StockTakeLineRepository stockTakeLineRepository;
  @Autowired private StockAdjustmentRepository stockAdjustmentRepository;
  @Autowired private ApprovalRuleRepository approvalRuleRepository;
  @Autowired private ApprovalRequestRepository approvalRequestRepository;
  @Autowired private ApprovalDecisionRepository approvalDecisionRepository;
  @Autowired private NotificationDeliveryRepository notificationDeliveryRepository;
  @Autowired private NotificationRepository notificationRepository;
  @Autowired private NotificationEventRepository notificationEventRepository;
  @Autowired private NotificationSourceRepository notificationSourceRepository;
  @Autowired private AuditEventRepository auditEventRepository;
  @Autowired private UserAccessRoleRepository userAccessRoleRepository;
  @Autowired private UserBranchRepository userBranchRepository;
  @Autowired private AccessRoleEventRepository accessRoleEventRepository;
  @Autowired private AccessRoleModuleRepository accessRoleModuleRepository;
  @Autowired private AccessRoleRepository accessRoleRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @BeforeEach
  void wipe() {
    notificationDeliveryRepository.deleteAll();
    notificationRepository.deleteAll();
    notificationEventRepository.deleteAll();
    notificationSourceRepository.deleteAll();
    auditEventRepository.deleteAll();
    approvalDecisionRepository.deleteAll();
    stockTakeLineRepository.deleteAll();
    stockTakeRepository.deleteAll();
    stockAdjustmentRepository.deleteAll();
    approvalRequestRepository.deleteAll();
    approvalRuleRepository.deleteAll();
    stockMovementRepository.deleteAll();
    stockBalanceRepository.deleteAll();
    stockBatchRepository.deleteAll();
    productRepository.deleteAll();
    manufacturerRepository.deleteAll();
    productCategoryRepository.deleteAll();
    accessRoleEventRepository.deleteAll();
    userAccessRoleRepository.deleteAll();
    userBranchRepository.deleteAll();
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
  void ac01_ownerStartsOptionalCountAndStaffCannot() throws Exception {
    Fixture fx = seedReady("ac01");
    mockMvc
        .perform(get("/api/v1/stock-takes?scope=open").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(0)));

    mockMvc
        .perform(
            post("/api/v1/stock-takes")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(startJson("start-ac01")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.status").value("OPEN"))
        .andExpect(jsonPath("$.data.startedByUserId").value(fx.ownerId().toString()))
        .andExpect(jsonPath("$.data.lines", hasSize(1)))
        .andExpect(jsonPath("$.data.lines[0].expectedQuantity").value(10))
        .andExpect(jsonPath("$.data.lines[0].batchId").value(fx.batchId().toString()));

    Cookie staff = inventoryStaff(fx, "staff-ac01");
    mockMvc
        .perform(
            post("/api/v1/stock-takes")
                .cookie(staff)
                .contentType(MediaType.APPLICATION_JSON)
                .content(startJson("staff-start")))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
  }

  @Test
  void ac02_expectedQuantityIsSnapshottedAtStart() throws Exception {
    Fixture fx = seedReady("ac02");
    JsonNode take = startTake(fx, "snap-1");
    assertThat(take.path("lines").get(0).path("expectedQuantity").asInt()).isEqualTo(10);

    mockMvc
        .perform(
            post("/api/v1/inventory/receipts")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    receiptJson(
                        fx.productId(),
                        "LOT-ac02",
                        "2026-01-01",
                        "2027-01-01",
                        12500,
                        "4",
                        "more-in",
                        1)))
        .andExpect(status().isOk());

    mockMvc
        .perform(get("/api/v1/stock-takes/" + take.path("id").asText()).cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.lines[0].expectedQuantity").value(10));
    assertThat(stockBalanceRepository.findAll().get(0).getQuantity()).isEqualByComparingTo("14");
  }

  @Test
  void ac03_countsSupportBatchesAndResumableProgress() throws Exception {
    Fixture fx = seedReady("ac03");
    UUID looseId = createProduct(fx.cookie(), "SKU-LOOSE", "Loose pack", false);
    mockMvc
        .perform(
            post("/api/v1/inventory/receipts")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(looseReceiptJson(looseId, "7", "loose-in")))
        .andExpect(status().isOk());

    JsonNode take = startTake(fx, "count-resume");
    assertThat(take.path("lines")).hasSize(2);
    JsonNode batchLine = lineForProduct(take, fx.productId());
    JsonNode looseLine = lineForProduct(take, looseId);
    assertThat(batchLine.path("batchId").asText()).isEqualTo(fx.batchId().toString());
    assertThat(looseLine.path("batchId").isNull()).isTrue();

    mockMvc
        .perform(
            post("/api/v1/stock-takes/" + take.path("id").asText() + "/counts")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(countsJson(batchLine.path("id").asText(), "9")))
        .andExpect(status().isOk());
    JsonNode afterBatch =
        objectMapper
            .readTree(
                mockMvc
                    .perform(
                        get("/api/v1/stock-takes/" + take.path("id").asText()).cookie(fx.cookie()))
                    .andExpect(status().isOk())
                    .andReturn()
                    .getResponse()
                    .getContentAsString())
            .path("data");
    assertThat(lineForProduct(afterBatch, fx.productId()).path("countedQuantity").asInt())
        .isEqualTo(9);

    Cookie staff = inventoryStaff(fx, "counter-ac03");
    mockMvc
        .perform(
            post("/api/v1/stock-takes/" + take.path("id").asText() + "/counts")
                .cookie(staff)
                .contentType(MediaType.APPLICATION_JSON)
                .content(countsJson(looseLine.path("id").asText(), "7")))
        .andExpect(status().isOk());

    JsonNode resumed =
        objectMapper
            .readTree(
                mockMvc
                    .perform(get("/api/v1/stock-takes/" + take.path("id").asText()).cookie(staff))
                    .andExpect(status().isOk())
                    .andReturn()
                    .getResponse()
                    .getContentAsString())
            .path("data");
    assertThat(lineForProduct(resumed, fx.productId()).path("countedQuantity").asInt())
        .isEqualTo(9);
    assertThat(lineForProduct(resumed, looseId).path("countedQuantity").asInt()).isEqualTo(7);
  }

  @Test
  void ac04_postCreatesPhysicalCountAdjustmentsThroughApprovalAndIsIdempotent() throws Exception {
    Fixture fx = seedReady("ac04");
    JsonNode take = startTake(fx, "post-1");
    String lineId = take.path("lines").get(0).path("id").asText();
    mockMvc
        .perform(
            post("/api/v1/stock-takes/" + take.path("id").asText() + "/counts")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(countsJson(lineId, "8")))
        .andExpect(status().isOk());

    JsonNode posted =
        objectMapper
            .readTree(
                mockMvc
                    .perform(
                        post("/api/v1/stock-takes/" + take.path("id").asText() + "/post")
                            .cookie(fx.cookie()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.status").value("POSTED"))
                    .andReturn()
                    .getResponse()
                    .getContentAsString())
            .path("data");
    String adjustmentId = posted.path("lines").get(0).path("adjustmentId").asText();
    assertThat(adjustmentId).isNotBlank();
    assertThat(stockBalanceRepository.findAll().get(0).getQuantity()).isEqualByComparingTo("10");
    assertThat(stockAdjustmentRepository.findAll())
        .hasSize(1)
        .first()
        .satisfies(
            row -> {
              assertThat(row.getReason()).isEqualTo(StockAdjustmentReason.PHYSICAL_COUNT);
              assertThat(row.getQuantity()).isEqualByComparingTo("2");
              assertThat(row.getDirection().name()).isEqualTo("OUT");
            });
    assertThat(approvalRequestRepository.findAll().get(0).getActionKey().name())
        .isEqualTo("INVENTORY_WRITE_OFF");

    mockMvc
        .perform(
            post("/api/v1/stock-takes/" + take.path("id").asText() + "/post").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.id").value(take.path("id").asText()))
        .andExpect(jsonPath("$.data.lines[0].adjustmentId").value(adjustmentId));
    assertThat(stockAdjustmentRepository.count()).isEqualTo(1);

    mockMvc
        .perform(
            post("/api/v1/inventory/adjustments/" + adjustmentId + "/decide")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"outcome":"APPROVED","expectedVersion":1,"note":"count"}
                    """))
        .andExpect(status().isOk());
    assertThat(stockBalanceRepository.findAll().get(0).getQuantity()).isEqualByComparingTo("8");
    assertThat(
            stockMovementRepository.findAll().stream()
                .anyMatch(m -> m.getType() == StockMovementType.ADJUSTMENT_OUT))
        .isTrue();
  }

  @Test
  void ac05_overlappingStaleDuplicateUnauthorizedAndIsolationFail() throws Exception {
    Fixture fx = seedReady("ac05");
    JsonNode first = startTake(fx, "open-a");
    mockMvc
        .perform(
            post("/api/v1/stock-takes")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(startJson("open-b")))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("OVERLAPPING_SESSION"));

    mockMvc
        .perform(
            post("/api/v1/stock-takes")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(startJson("open-a")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.id").value(first.path("id").asText()));

    String lineId = first.path("lines").get(0).path("id").asText();
    mockMvc
        .perform(
            post("/api/v1/inventory/issues")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"productId":"%s","batchId":"%s","quantity":1,"idempotencyKey":"issue-stale","expectedVersion":1}
                    """
                        .formatted(fx.productId(), fx.batchId())))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            post("/api/v1/stock-takes/" + first.path("id").asText() + "/counts")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(countsJson(lineId, "10")))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            post("/api/v1/stock-takes/" + first.path("id").asText() + "/post").cookie(fx.cookie()))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("STALE_SNAPSHOT"));

    mockMvc
        .perform(
            post("/api/v1/stock-takes/" + first.path("id").asText() + "/cancel")
                .cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("CANCELLED"));

    JsonNode second = startTake(fx, "open-c");
    mockMvc
        .perform(
            post("/api/v1/stock-takes/" + second.path("id").asText() + "/post").cookie(fx.cookie()))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("INCOMPLETE_COUNT"));

    mockMvc
        .perform(get("/api/v1/stock-takes").contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isUnauthorized());

    Tenant other = persistTenant("other-take", "Other");
    persistPlan(other.getId(), PlanCode.FREE);
    persistUser(other.getId(), "owner@other-take.local", AppUserRole.pharmacy_owner);
    Location otherBranch = persistBranch(other.getId(), "Other main", "OTH", true);
    Cookie otherCookie = login("owner@other-take.local");
    selectBranch(otherCookie, otherBranch.getId());
    mockMvc
        .perform(get("/api/v1/stock-takes/" + second.path("id").asText()).cookie(otherCookie))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));

    Location secondBranch = persistBranch(fx.tenantId(), "Second till", "BR2", false);
    selectBranch(fx.cookie(), secondBranch.getId());
    mockMvc
        .perform(get("/api/v1/stock-takes/" + second.path("id").asText()).cookie(fx.cookie()))
        .andExpect(status().isNotFound());

    Tenant denied = persistTenant("denied-take", "Denied");
    persistPlan(denied.getId(), PlanCode.FREE);
    persistUser(denied.getId(), "staff@denied-take.local", AppUserRole.pharmacy_staff);
    Cookie staff = login("staff@denied-take.local");
    mockMvc.perform(get("/api/v1/stock-takes").cookie(staff)).andExpect(status().isForbidden());
  }

  @Test
  void zeroVarianceSkipsAdjustment() throws Exception {
    Fixture fx = seedReady("zero");
    JsonNode take = startTake(fx, "zero-var");
    mockMvc
        .perform(
            post("/api/v1/stock-takes/" + take.path("id").asText() + "/counts")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(countsJson(take.path("lines").get(0).path("id").asText(), "10")))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            post("/api/v1/stock-takes/" + take.path("id").asText() + "/post").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("POSTED"))
        .andExpect(
            jsonPath("$.data.lines[0].adjustmentId").value(org.hamcrest.Matchers.nullValue()));
    assertThat(stockAdjustmentRepository.count()).isZero();
  }

  private Fixture seedReady(String tag) throws Exception {
    Tenant tenant = persistTenant(tag, "Take " + tag);
    persistPlan(tenant.getId(), PlanCode.FREE);
    AppUser owner =
        persistUser(tenant.getId(), "owner@" + tag + ".local", AppUserRole.pharmacy_owner);
    Location branch = persistBranch(tenant.getId(), "Main", "BR01", true);
    Cookie cookie = login("owner@" + tag + ".local");
    selectBranch(cookie, branch.getId());
    createWriteOffRule(cookie);
    UUID productId = createProduct(cookie, "SKU-" + tag, "Take Med " + tag, true);
    mockMvc
        .perform(
            post("/api/v1/inventory/receipts")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    receiptJson(
                        productId,
                        "LOT-" + tag,
                        "2026-01-01",
                        "2027-01-01",
                        12500,
                        "10",
                        "in-" + tag,
                        0)))
        .andExpect(status().isOk());
    UUID batchId =
        stockBatchRepository.findAll().get(stockBatchRepository.findAll().size() - 1).getId();
    return new Fixture(tenant.getId(), branch.getId(), owner.getId(), cookie, productId, batchId);
  }

  private Cookie inventoryStaff(Fixture fx, String tag) throws Exception {
    AppUser staff = persistUser(fx.tenantId(), tag + "@take.local", AppUserRole.pharmacy_staff);
    UUID roleId = createRole(fx.cookie(), "Count desk " + tag, "[\"INVENTORY\"]");
    mockMvc
        .perform(
            put("/api/v1/users/" + staff.getId() + "/roles")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleIds\":[\"" + roleId + "\"]}"))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            put("/api/v1/users/" + staff.getId() + "/branches")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchIds\":[\"" + fx.branchId() + "\"]}"))
        .andExpect(status().isOk());
    Cookie staffCookie = login(tag + "@take.local");
    selectBranch(staffCookie, fx.branchId());
    return staffCookie;
  }

  private JsonNode startTake(Fixture fx, String key) throws Exception {
    MvcResult result =
        mockMvc
            .perform(
                post("/api/v1/stock-takes")
                    .cookie(fx.cookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(startJson(key)))
            .andExpect(status().isOk())
            .andReturn();
    return objectMapper.readTree(result.getResponse().getContentAsString()).path("data");
  }

  private static JsonNode lineForProduct(JsonNode take, UUID productId) {
    for (JsonNode line : take.path("lines")) {
      if (productId.toString().equals(line.path("productId").asText())) {
        return line;
      }
    }
    throw new AssertionError("missing line for " + productId);
  }

  private UUID createRole(Cookie owner, String name, String modulesJson) throws Exception {
    String body =
        mockMvc
            .perform(
                post("/api/v1/roles")
                    .cookie(owner)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":\"" + name + "\",\"modules\":" + modulesJson + "}"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return UUID.fromString(objectMapper.readTree(body).path("data").path("id").asText());
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

  private UUID createProduct(Cookie cookie, String sku, String name, boolean batched)
      throws Exception {
    UUID categoryId = createCategory(cookie, "Tablets-" + sku);
    MvcResult created =
        mockMvc
            .perform(
                post("/api/v1/products")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(productJson(sku, name, categoryId, batched)))
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

  private static String startJson(String key) {
    return "{\"idempotencyKey\":\"" + key + "\"}";
  }

  private static String countsJson(String lineId, String qty) {
    return """
        {"lines":[{"lineId":"%s","countedQuantity":%s}]}
        """
        .formatted(lineId, qty);
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

  private static String looseReceiptJson(UUID productId, String quantity, String key) {
    return """
        {"productId":"%s","purchasePricePaise":500,"quantity":%s,"idempotencyKey":"%s","expectedVersion":0}
        """
        .formatted(productId, quantity, key);
  }

  private static String productJson(String sku, String name, UUID categoryId, boolean batched) {
    return """
        {
          "sku":"%s",
          "name":"%s",
          "categoryId":"%s",
          "productType":"Medicine",
          "dosageForm":"Tablet",
          "prescriptionRequired":false,
          "baseUnit":"Tablet",
          "packSize":10,
          "packUnit":"strip",
          "requiresColdStorage":false,
          "isDiscontinued":false,
          "isReturnable":true,
          "isTaxable":true,
          "requiresBatchTracking":%s,
          "requiresExpiryTracking":%s,
          "requiresSerialTracking":false,
          "controlledSubstance":false,
          "isActive":true
        }
        """
        .formatted(sku, name, categoryId, batched, batched);
  }

  private record Fixture(
      UUID tenantId, UUID branchId, UUID ownerId, Cookie cookie, UUID productId, UUID batchId) {}
}
