package com.nammamedmate.server.feature.inventory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
class InventoryAdjustmentTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-04T09:00:00Z");

  @Container
  static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:16-alpine")
          .withDatabaseName("nammamedmate_inventory_adjustment")
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
  @Autowired private ApprovalRuleRepository approvalRuleRepository;
  @Autowired private ApprovalRequestRepository approvalRequestRepository;
  @Autowired private ApprovalDecisionRepository approvalDecisionRepository;
  @Autowired private NotificationDeliveryRepository notificationDeliveryRepository;
  @Autowired private NotificationRepository notificationRepository;
  @Autowired private NotificationEventRepository notificationEventRepository;
  @Autowired private NotificationSourceRepository notificationSourceRepository;
  @Autowired private AuditEventRepository auditEventRepository;
  @Autowired private UserAccessRoleRepository userAccessRoleRepository;
  @Autowired private AccessRoleEventRepository accessRoleEventRepository;
  @Autowired private AccessRoleModuleRepository accessRoleModuleRepository;
  @Autowired private AccessRoleRepository accessRoleRepository;
  @Autowired private StockAdjustmentRepository stockAdjustmentRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @BeforeEach
  void wipe() {
    notificationDeliveryRepository.deleteAll();
    notificationRepository.deleteAll();
    notificationEventRepository.deleteAll();
    notificationSourceRepository.deleteAll();
    auditEventRepository.deleteAll();
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
  void ac01_reasonsAreTheFiveApprovedWriteOffs() throws Exception {
    Fixture fx = seedReady("ac01");
    String[] reasons = {
      "DAMAGE_BREAKAGE", "EXPIRY_WRITE_OFF", "THEFT_LOSS", "PHYSICAL_COUNT", "SAMPLE_FREE_GOODS"
    };
    for (int i = 0; i < reasons.length; i++) {
      String direction = "PHYSICAL_COUNT".equals(reasons[i]) ? "OUT" : "OUT";
      mockMvc
          .perform(
              post("/api/v1/inventory/adjustments")
                  .cookie(fx.cookie())
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(
                      adjustmentJson(
                          fx.productId(), fx.batchId(), reasons[i], "1", direction, "reason-" + i)))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.success").value(true))
          .andExpect(jsonPath("$.data.reason").value(reasons[i]))
          .andExpect(jsonPath("$.data.status").value("PENDING"))
          .andExpect(jsonPath("$.data.quantity").value(1));
    }
    assertThat(stockBalanceRepository.findAll().get(0).getQuantity()).isEqualByComparingTo("10");
  }

  @Test
  void ac01_unknownReasonRejected() throws Exception {
    Fixture fx = seedReady("ac01b");
    mockMvc
        .perform(
            post("/api/v1/inventory/adjustments")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    adjustmentJson(
                        fx.productId(), fx.batchId(), "SHRINKAGE", "1", "OUT", "bad-reason")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("UNKNOWN_REASON"));
  }

  @Test
  void ac02_everyAdjustmentFollowsConfiguredWriteOffRule() throws Exception {
    Fixture fx = seedStock("ac02");
    mockMvc
        .perform(
            post("/api/v1/inventory/adjustments")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    adjustmentJson(
                        fx.productId(), fx.batchId(), "DAMAGE_BREAKAGE", "1", "OUT", "no-rule")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("RULE_MISSING"));

    createWriteOffRule(fx.cookie(), true);
    MvcResult created =
        mockMvc
            .perform(
                post("/api/v1/inventory/adjustments")
                    .cookie(fx.cookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        adjustmentJson(
                            fx.productId(),
                            fx.batchId(),
                            "DAMAGE_BREAKAGE",
                            "2",
                            "OUT",
                            "with-rule")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("PENDING"))
            .andReturn();
    UUID approvalRequestId =
        UUID.fromString(
            objectMapper
                .readTree(created.getResponse().getContentAsString())
                .path("data")
                .path("approvalRequestId")
                .asText());
    assertThat(approvalRequestRepository.findById(approvalRequestId))
        .get()
        .extracting(req -> req.getActionKey().name())
        .isEqualTo("INVENTORY_WRITE_OFF");
    assertThat(approvalRequestRepository.findById(approvalRequestId).get().getAmountValue())
        .isEqualTo(25000);
  }

  @Test
  void ac03_stockChangesOnlyAfterApproval() throws Exception {
    Fixture fx = seedReady("ac03");
    JsonNode created = createAdjustment(fx, "THEFT_LOSS", "3", "OUT", "pending-out");
    assertThat(stockBalanceRepository.findAll().get(0).getQuantity()).isEqualByComparingTo("10");
    assertThat(
            stockMovementRepository.findAll().stream()
                .filter(
                    m ->
                        m.getType() == StockMovementType.ADJUSTMENT_OUT
                            || m.getType() == StockMovementType.ADJUSTMENT_IN)
                .count())
        .isZero();

    mockMvc
        .perform(
            post("/api/v1/inventory/adjustments/" + created.path("id").asText() + "/decide")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(decideJson("APPROVED", created.path("version").asInt(), "counted")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("APPROVED"))
        .andExpect(jsonPath("$.data.approverUserId").value(fx.ownerId().toString()))
        .andExpect(jsonPath("$.data.decidedAt").isNotEmpty());

    assertThat(stockBalanceRepository.findAll().get(0).getQuantity()).isEqualByComparingTo("7");
    assertThat(
            stockMovementRepository.findAll().stream()
                .filter(m -> m.getType() == StockMovementType.ADJUSTMENT_OUT)
                .count())
        .isEqualTo(1);
  }

  @Test
  void ac03_rejectLeavesStockUnchanged() throws Exception {
    Fixture fx = seedReady("ac03r");
    JsonNode created = createAdjustment(fx, "SAMPLE_FREE_GOODS", "2", "OUT", "reject-1");
    mockMvc
        .perform(
            post("/api/v1/inventory/adjustments/" + created.path("id").asText() + "/decide")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(decideJson("REJECTED", created.path("version").asInt(), "keep")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("REJECTED"));
    assertThat(stockBalanceRepository.findAll().get(0).getQuantity()).isEqualByComparingTo("10");
    assertThat(
            stockMovementRepository.findAll().stream()
                .anyMatch(
                    m ->
                        m.getType() == StockMovementType.ADJUSTMENT_OUT
                            || m.getType() == StockMovementType.ADJUSTMENT_IN))
        .isFalse();
  }

  @Test
  void ac03_genericApprovalDecideAlsoAppliesStock() throws Exception {
    Fixture fx = seedReady("ac03g");
    JsonNode created = createAdjustment(fx, "DAMAGE_BREAKAGE", "1", "OUT", "via-waiting");
    UUID approvalRequestId = UUID.fromString(created.path("approvalRequestId").asText());
    int approvalVersion =
        approvalRequestRepository.findById(approvalRequestId).orElseThrow().getVersion();
    mockMvc
        .perform(
            post("/api/v1/approvals/requests/" + approvalRequestId + "/decide")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"outcome":"APPROVED","note":"from waiting","version":%d}
                    """
                        .formatted(approvalVersion)))
        .andExpect(status().isOk());
    assertThat(stockBalanceRepository.findAll().get(0).getQuantity()).isEqualByComparingTo("9");
    mockMvc
        .perform(
            get("/api/v1/inventory/adjustments/" + created.path("id").asText()).cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("APPROVED"));
  }

  @Test
  void ac03_physicalCountIncreaseAppliesAfterApproval() throws Exception {
    Fixture fx = seedReady("ac03in");
    JsonNode created = createAdjustment(fx, "PHYSICAL_COUNT", "4", "IN", "count-in");
    assertThat(stockBalanceRepository.findAll().get(0).getQuantity()).isEqualByComparingTo("10");
    mockMvc
        .perform(
            post("/api/v1/inventory/adjustments/" + created.path("id").asText() + "/decide")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(decideJson("APPROVED", created.path("version").asInt(), null)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("APPROVED"));
    assertThat(stockBalanceRepository.findAll().get(0).getQuantity()).isEqualByComparingTo("14");
    assertThat(
            stockMovementRepository.findAll().stream()
                .anyMatch(m -> m.getType() == StockMovementType.ADJUSTMENT_IN))
        .isTrue();
  }

  @Test
  void ac04_reasonQuantityBatchActorApproverAndTimestampsAreImmutable() throws Exception {
    Fixture fx = seedReady("ac04");
    JsonNode first = createAdjustment(fx, "EXPIRY_WRITE_OFF", "1", "OUT", "same-key");
    mockMvc
        .perform(
            post("/api/v1/inventory/adjustments")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    adjustmentJson(
                        fx.productId(), fx.batchId(), "THEFT_LOSS", "5", "OUT", "same-key")))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("IDEMPOTENCY_CONFLICT"));

    mockMvc
        .perform(
            post("/api/v1/inventory/adjustments")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    adjustmentJson(
                        fx.productId(), fx.batchId(), "EXPIRY_WRITE_OFF", "1", "OUT", "same-key")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.id").value(first.path("id").asText()))
        .andExpect(jsonPath("$.data.reason").value("EXPIRY_WRITE_OFF"))
        .andExpect(jsonPath("$.data.quantity").value(1))
        .andExpect(jsonPath("$.data.batchId").value(fx.batchId().toString()))
        .andExpect(jsonPath("$.data.requesterUserId").value(fx.ownerId().toString()));

    mockMvc
        .perform(
            post("/api/v1/inventory/adjustments/" + first.path("id").asText() + "/decide")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(decideJson("APPROVED", first.path("version").asInt(), "ok")))
        .andExpect(status().isOk());

    mockMvc
        .perform(
            get("/api/v1/inventory/adjustments/" + first.path("id").asText()).cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.reason").value("EXPIRY_WRITE_OFF"))
        .andExpect(jsonPath("$.data.quantity").value(1))
        .andExpect(jsonPath("$.data.batchId").value(fx.batchId().toString()))
        .andExpect(jsonPath("$.data.requesterUserId").value(fx.ownerId().toString()))
        .andExpect(jsonPath("$.data.approverUserId").value(fx.ownerId().toString()))
        .andExpect(jsonPath("$.data.createdAt").value(first.path("createdAt").asText()))
        .andExpect(jsonPath("$.data.decidedAt").isNotEmpty());
  }

  @Test
  void ac05_unknownReasonOverdrawSelfApprovalStaleAndDuplicateFail() throws Exception {
    Fixture fx = seedReady("ac05", false);
    mockMvc
        .perform(
            post("/api/v1/inventory/adjustments")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    adjustmentJson(fx.productId(), fx.batchId(), "UNKNOWN", "1", "OUT", "unknown")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("UNKNOWN_REASON"));

    mockMvc
        .perform(
            post("/api/v1/inventory/adjustments")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    adjustmentJson(
                        fx.productId(), fx.batchId(), "THEFT_LOSS", "99", "OUT", "overdraw")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("INSUFFICIENT_STOCK"));

    JsonNode created = createAdjustment(fx, "DAMAGE_BREAKAGE", "1", "OUT", "self");
    mockMvc
        .perform(
            post("/api/v1/inventory/adjustments/" + created.path("id").asText() + "/decide")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(decideJson("APPROVED", created.path("version").asInt(), "me")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("SELF_APPROVAL"));
    assertThat(stockBalanceRepository.findAll().get(0).getQuantity()).isEqualByComparingTo("10");

    Fixture allowed = seedReady("ac05ok");
    JsonNode pending = createAdjustment(allowed, "DAMAGE_BREAKAGE", "1", "OUT", "stale-dup");
    mockMvc
        .perform(
            post("/api/v1/inventory/adjustments/" + pending.path("id").asText() + "/decide")
                .cookie(allowed.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(decideJson("APPROVED", 99, "stale")))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("STALE_STATE"));

    mockMvc
        .perform(
            post("/api/v1/inventory/adjustments/" + pending.path("id").asText() + "/decide")
                .cookie(allowed.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(decideJson("APPROVED", pending.path("version").asInt(), "first")))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            post("/api/v1/inventory/adjustments/" + pending.path("id").asText() + "/decide")
                .cookie(allowed.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(decideJson("REJECTED", pending.path("version").asInt(), "again")))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("STALE_STATE"));
  }

  @Test
  void ac05_overdrawOnApplyLeavesPendingAndNoMovement() throws Exception {
    Fixture fx = seedReady("ac05apply");
    JsonNode created = createAdjustment(fx, "THEFT_LOSS", "8", "OUT", "later-over");
    UUID batchId = fx.batchId();
    mockMvc
        .perform(
            post("/api/v1/inventory/issues")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"productId":"%s","batchId":"%s","quantity":5,"idempotencyKey":"issue-5","expectedVersion":1}
                    """
                        .formatted(fx.productId(), batchId)))
        .andExpect(status().isOk());
    long movementsBefore = stockMovementRepository.count();
    mockMvc
        .perform(
            post("/api/v1/inventory/adjustments/" + created.path("id").asText() + "/decide")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(decideJson("APPROVED", created.path("version").asInt(), "late")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("INSUFFICIENT_STOCK"));
    mockMvc
        .perform(
            get("/api/v1/inventory/adjustments/" + created.path("id").asText()).cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("PENDING"));
    assertThat(stockMovementRepository.count()).isEqualTo(movementsBefore);
    assertThat(stockBalanceRepository.findAll().get(0).getQuantity()).isEqualByComparingTo("5");
  }

  @Test
  void ac05_isolationDeniedAndUnauthenticated() throws Exception {
    Fixture fx = seedReady("ac05iso");
    JsonNode created = createAdjustment(fx, "DAMAGE_BREAKAGE", "1", "OUT", "iso-1");

    mockMvc
        .perform(get("/api/v1/inventory/adjustments").contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isUnauthorized());

    Tenant other = persistTenant("other-iso", "Other");
    persistPlan(other.getId(), PlanCode.FREE);
    persistUser(other.getId(), "owner@other-iso.local", AppUserRole.pharmacy_owner);
    Location otherBranch = persistBranch(other.getId(), "Other main", "OTH", true);
    Cookie otherCookie = login("owner@other-iso.local");
    selectBranch(otherCookie, otherBranch.getId());
    mockMvc
        .perform(
            get("/api/v1/inventory/adjustments/" + created.path("id").asText()).cookie(otherCookie))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));

    Location second = persistBranch(fx.tenantId(), "Second till", "BR2", false);
    selectBranch(fx.cookie(), second.getId());
    mockMvc
        .perform(
            get("/api/v1/inventory/adjustments/" + created.path("id").asText()).cookie(fx.cookie()))
        .andExpect(status().isNotFound());

    Tenant denied = persistTenant("denied-adj", "Denied");
    persistPlan(denied.getId(), PlanCode.FREE);
    persistUser(denied.getId(), "staff@denied-adj.local", AppUserRole.pharmacy_staff);
    Cookie staff = login("staff@denied-adj.local");
    mockMvc
        .perform(get("/api/v1/inventory/adjustments").cookie(staff))
        .andExpect(status().isForbidden());
  }

  @Test
  void expiryWriteOffAllowsExpiredBatch() throws Exception {
    Fixture fx = seedStock("exp-wo");
    createWriteOffRule(fx.cookie(), true);
    UUID productId = createBatchedProduct(fx.cookie(), "SKU-EXP", "Expired pack");
    mockMvc
        .perform(
            post("/api/v1/inventory/receipts")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    receiptJson(
                        productId, "LOT-OLD", "2025-01-01", "2025-06-01", 500, "6", "old-in", 0)))
        .andExpect(status().isOk());
    UUID batchId =
        stockBatchRepository
            .findByTenantIdAndProductIdAndBatchNumber(fx.tenantId(), productId, "LOT-OLD")
            .orElseThrow()
            .getId();
    mockMvc
        .perform(
            post("/api/v1/inventory/adjustments")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    adjustmentJson(productId, batchId, "EXPIRY_WRITE_OFF", "6", "OUT", "exp-off")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("PENDING"));
  }

  @Test
  void listsPendingAndHistory() throws Exception {
    Fixture fx = seedReady("list");
    JsonNode pending = createAdjustment(fx, "DAMAGE_BREAKAGE", "1", "OUT", "list-p");
    JsonNode done = createAdjustment(fx, "THEFT_LOSS", "1", "OUT", "list-h");
    mockMvc
        .perform(
            post("/api/v1/inventory/adjustments/" + done.path("id").asText() + "/decide")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(decideJson("APPROVED", done.path("version").asInt(), "done")))
        .andExpect(status().isOk());
    mockMvc
        .perform(get("/api/v1/inventory/adjustments?scope=pending").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(1)))
        .andExpect(jsonPath("$.data.items[0].id").value(pending.path("id").asText()));
    mockMvc
        .perform(get("/api/v1/inventory/adjustments?scope=history").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(1)))
        .andExpect(jsonPath("$.data.items[0].id").value(done.path("id").asText()));
  }

  private Fixture seedReady(String tag) throws Exception {
    return seedReady(tag, true);
  }

  private Fixture seedReady(String tag, boolean allowSelfApproval) throws Exception {
    Fixture fx = seedStock(tag);
    createWriteOffRule(fx.cookie(), allowSelfApproval);
    return fx;
  }

  private Fixture seedStock(String tag) throws Exception {
    Tenant tenant = persistTenant(tag, "Adj " + tag);
    persistPlan(tenant.getId(), PlanCode.FREE);
    AppUser owner =
        persistUser(tenant.getId(), "owner@" + tag + ".local", AppUserRole.pharmacy_owner);
    Location branch = persistBranch(tenant.getId(), "Main", "BR01", true);
    Cookie cookie = login("owner@" + tag + ".local");
    selectBranch(cookie, branch.getId());
    UUID productId = createBatchedProduct(cookie, "SKU-" + tag, "Adj Med " + tag);
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

  private JsonNode createAdjustment(
      Fixture fx, String reason, String qty, String direction, String key) throws Exception {
    MvcResult result =
        mockMvc
            .perform(
                post("/api/v1/inventory/adjustments")
                    .cookie(fx.cookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        adjustmentJson(fx.productId(), fx.batchId(), reason, qty, direction, key)))
            .andExpect(status().isOk())
            .andReturn();
    return objectMapper.readTree(result.getResponse().getContentAsString()).path("data");
  }

  private void createWriteOffRule(Cookie cookie, boolean allowSelfApproval) throws Exception {
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
                      "allowSelfApproval":%s
                    }
                    """
                        .formatted(allowSelfApproval)))
        .andExpect(status().isOk());
  }

  private UUID createBatchedProduct(Cookie cookie, String sku, String name) throws Exception {
    UUID categoryId = createCategory(cookie, "Tablets-" + sku);
    MvcResult created =
        mockMvc
            .perform(
                post("/api/v1/products")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(productJson(sku, name, categoryId)))
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

  private static String adjustmentJson(
      UUID productId, UUID batchId, String reason, String quantity, String direction, String key) {
    return """
        {"productId":"%s","batchId":"%s","reason":"%s","quantity":%s,"direction":"%s","idempotencyKey":"%s"}
        """
        .formatted(productId, batchId, reason, quantity, direction, key);
  }

  private static String decideJson(String outcome, int version, String note) {
    String noteJson = note == null ? "null" : "\"" + note + "\"";
    return """
        {"outcome":"%s","expectedVersion":%d,"note":%s}
        """
        .formatted(outcome, version, noteJson);
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

  private static String productJson(String sku, String name, UUID categoryId) {
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
          "requiresBatchTracking":true,
          "requiresExpiryTracking":true,
          "requiresSerialTracking":false,
          "controlledSubstance":false,
          "notes":null,
          "isActive":true
        }
        """
        .formatted(sku, name, categoryId);
  }

  private record Fixture(
      UUID tenantId, UUID branchId, UUID ownerId, Cookie cookie, UUID productId, UUID batchId) {}
}
