package com.nammamedmate.server.feature.inventory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.application.inventory.CreateStockTransferCommand;
import com.nammamedmate.server.application.inventory.StockTransferService;
import com.nammamedmate.server.domain.AccessRoleKind;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.AuditEvent;
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.BranchType;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.StockBalance;
import com.nammamedmate.server.domain.StockMovementType;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AccessRoleEventRepository;
import com.nammamedmate.server.persistence.AccessRoleModuleRepository;
import com.nammamedmate.server.persistence.AccessRoleRepository;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.AuditEventRepository;
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
import com.nammamedmate.server.persistence.UserAccessRoleRepository;
import com.nammamedmate.server.persistence.UserSessionRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import jakarta.servlet.http.Cookie;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
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
class StockTransferTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-04T08:00:00Z");

  @Container
  static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:16-alpine")
          .withDatabaseName("nammamedmate_stock_transfer")
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
  @Autowired private NotificationDeliveryRepository notificationDeliveryRepository;
  @Autowired private NotificationRepository notificationRepository;
  @Autowired private NotificationEventRepository notificationEventRepository;
  @Autowired private NotificationSourceRepository notificationSourceRepository;
  @Autowired private StockBatchRepository stockBatchRepository;
  @Autowired private StockBalanceRepository stockBalanceRepository;
  @Autowired private StockMovementRepository stockMovementRepository;
  @Autowired private StockTransferRepository stockTransferRepository;
  @Autowired private StockTransferLineRepository stockTransferLineRepository;
  @Autowired private UserAccessRoleRepository userAccessRoleRepository;
  @Autowired private AccessRoleEventRepository accessRoleEventRepository;
  @Autowired private AccessRoleModuleRepository accessRoleModuleRepository;
  @Autowired private AccessRoleRepository accessRoleRepository;
  @Autowired private AuditEventRepository auditEventRepository;
  @Autowired private PasswordEncoder passwordEncoder;
  @Autowired private StockTransferService stockTransferService;

  @BeforeEach
  void wipe() {
    notificationDeliveryRepository.deleteAll();
    notificationRepository.deleteAll();
    notificationEventRepository.deleteAll();
    notificationSourceRepository.deleteAll();
    auditEventRepository.deleteAll();
    stockTransferLineRepository.deleteAll();
    stockTransferRepository.deleteAll();
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
  void ac01_eitherBranchMayInitiatePushOrPull() throws Exception {
    Fixture fx = seed("ac01");
    UUID productId = createBatchedProduct(fx.cookie(), "SKU-P1", "Push Med");
    UUID batchId = receiveAt(fx.cookie(), productId, "LOT-P1", "20", "push-recv");

    mockMvc
        .perform(
            post("/api/v1/stock-transfers")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(createJson("PUSH", fx.branchB(), productId, batchId, "5", "push-1")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.direction").value("PUSH"))
        .andExpect(jsonPath("$.data.status").value("IN_TRANSIT"))
        .andExpect(jsonPath("$.data.fromBranchId").value(fx.branchA().toString()))
        .andExpect(jsonPath("$.data.toBranchId").value(fx.branchB().toString()));

    UUID productB = createBatchedProduct(fx.cookie(), "SKU-PL", "Pull Med");
    UUID batchPull = receiveAt(fx.cookie(), productB, "LOT-PL", "12", "pull-recv");

    selectBranch(fx.cookie(), fx.branchB());
    mockMvc
        .perform(
            post("/api/v1/stock-transfers")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(createJson("PULL", fx.branchA(), productB, batchPull, "3", "pull-1")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.direction").value("PULL"))
        .andExpect(jsonPath("$.data.status").value("REQUESTED"))
        .andExpect(jsonPath("$.data.fromBranchId").value(fx.branchA().toString()))
        .andExpect(jsonPath("$.data.toBranchId").value(fx.branchB().toString()));
  }

  @Test
  void ac02_receivingBranchConfirmsCompletion() throws Exception {
    Fixture fx = seed("ac02");
    UUID productId = createBatchedProduct(fx.cookie(), "SKU-C", "Confirm Med");
    UUID batchId = receiveAt(fx.cookie(), productId, "LOT-C", "10", "c-recv");

    MvcResult created =
        mockMvc
            .perform(
                post("/api/v1/stock-transfers")
                    .cookie(fx.cookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(createJson("PUSH", fx.branchB(), productId, batchId, "4", "c-push")))
            .andExpect(status().isOk())
            .andReturn();
    UUID transferId =
        UUID.fromString(
            objectMapper
                .readTree(created.getResponse().getContentAsString())
                .path("data")
                .path("id")
                .asText());

    mockMvc
        .perform(post("/api/v1/stock-transfers/" + transferId + "/confirm").cookie(fx.cookie()))
        .andExpect(status().isForbidden());

    selectBranch(fx.cookie(), fx.branchB());
    mockMvc
        .perform(post("/api/v1/stock-transfers/" + transferId + "/confirm").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("COMPLETED"));

    assertThat(qtyAt(fx.tenantId(), fx.branchB(), productId, batchId)).isEqualByComparingTo("4");
  }

  @Test
  void ac03_stockStaysIsolatedUntilConfirmed() throws Exception {
    Fixture fx = seed("ac03");
    UUID productId = createBatchedProduct(fx.cookie(), "SKU-I", "Isolated Med");
    UUID batchId = receiveAt(fx.cookie(), productId, "LOT-I", "15", "i-recv");

    mockMvc
        .perform(
            post("/api/v1/stock-transfers")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(createJson("PUSH", fx.branchB(), productId, batchId, "6", "i-push")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("IN_TRANSIT"));

    assertThat(qtyAt(fx.tenantId(), fx.branchA(), productId, batchId)).isEqualByComparingTo("9");
    assertThat(qtyAt(fx.tenantId(), fx.branchB(), productId, batchId)).isEqualByComparingTo("0");

    selectBranch(fx.cookie(), fx.branchB());
    mockMvc
        .perform(get("/api/v1/inventory/balances").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(0)));

    UUID transferId = stockTransferRepository.findAll().get(0).getId();
    mockMvc
        .perform(post("/api/v1/stock-transfers/" + transferId + "/confirm").cookie(fx.cookie()))
        .andExpect(status().isOk());

    assertThat(qtyAt(fx.tenantId(), fx.branchB(), productId, batchId)).isEqualByComparingTo("6");
    assertThat(
            stockMovementRepository.findAll().stream()
                .map(m -> m.getType())
                .filter(
                    t -> t == StockMovementType.TRANSFER_OUT || t == StockMovementType.TRANSFER_IN)
                .count())
        .isEqualTo(2);
  }

  @Test
  void ac04_quantitiesAuditableAndCannotExceedAvailableStock() throws Exception {
    Fixture fx = seed("ac04");
    UUID productId = createBatchedProduct(fx.cookie(), "SKU-Q", "Qty Med");
    UUID batchId = receiveAt(fx.cookie(), productId, "LOT-Q", "5", "q-recv");

    mockMvc
        .perform(
            post("/api/v1/stock-transfers")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(createJson("PUSH", fx.branchB(), productId, batchId, "9", "q-over")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("INSUFFICIENT_STOCK"));

    assertThat(stockTransferRepository.count()).isZero();
    assertThat(qtyAt(fx.tenantId(), fx.branchA(), productId, batchId)).isEqualByComparingTo("5");

    mockMvc
        .perform(
            post("/api/v1/stock-transfers")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(createJson("PUSH", fx.branchB(), productId, batchId, "2", "q-ok")))
        .andExpect(status().isOk());

    selectBranch(fx.cookie(), fx.branchB());
    UUID transferId = stockTransferRepository.findAll().get(0).getId();
    mockMvc
        .perform(get("/api/v1/stock-transfers/" + transferId).cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.lines[0].quantity").value(2))
        .andExpect(jsonPath("$.data.status").value("IN_TRANSIT"));
  }

  @Test
  void ac05_failuresAreSafeAndUndisclosed() throws Exception {
    Fixture fx = seed("ac05");
    UUID productId = createBatchedProduct(fx.cookie(), "SKU-F", "Fail Med");
    UUID batchId = receiveAt(fx.cookie(), productId, "LOT-F", "8", "f-recv");

    mockMvc
        .perform(
            post("/api/v1/stock-transfers")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(createJson("PUSH", fx.branchA(), productId, batchId, "1", "same")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("SAME_BRANCH"));

    MvcResult created =
        mockMvc
            .perform(
                post("/api/v1/stock-transfers")
                    .cookie(fx.cookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(createJson("PUSH", fx.branchB(), productId, batchId, "3", "dup-key")))
            .andExpect(status().isOk())
            .andReturn();
    UUID transferId =
        UUID.fromString(
            objectMapper
                .readTree(created.getResponse().getContentAsString())
                .path("data")
                .path("id")
                .asText());

    mockMvc
        .perform(
            post("/api/v1/stock-transfers")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(createJson("PUSH", fx.branchB(), productId, batchId, "3", "dup-key")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.id").value(transferId.toString()));

    mockMvc
        .perform(
            post("/api/v1/stock-transfers")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(createJson("PUSH", fx.branchB(), productId, batchId, "1", "dup-key")))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("IDEMPOTENCY_CONFLICT"));

    selectBranch(fx.cookie(), fx.branchB());
    mockMvc
        .perform(post("/api/v1/stock-transfers/" + transferId + "/confirm").cookie(fx.cookie()))
        .andExpect(status().isOk());
    mockMvc
        .perform(post("/api/v1/stock-transfers/" + transferId + "/confirm").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("COMPLETED"));
    mockMvc
        .perform(post("/api/v1/stock-transfers/" + transferId + "/reject").cookie(fx.cookie()))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("STALE_STATE"));

    Tenant other = persistTenant("ac05-x", "Other");
    persistPlan(other.getId(), PlanCode.GROWTH);
    persistUser(other.getId(), "owner@ac05-x.local", AppUserRole.pharmacy_owner);
    Location otherBranch = persistBranch(other.getId(), "Other", "OX1", true);
    Cookie otherCookie = login("owner@ac05-x.local");
    selectBranch(otherCookie, otherBranch.getId());
    mockMvc
        .perform(get("/api/v1/stock-transfers/" + transferId).cookie(otherCookie))
        .andExpect(status().isNotFound());

    Tenant deniedTenant = persistTenant("ac05-d", "Denied");
    persistPlan(deniedTenant.getId(), PlanCode.GROWTH);
    persistUser(deniedTenant.getId(), "staff@ac05-d.local", AppUserRole.pharmacy_staff);
    Cookie denied = login("staff@ac05-d.local");
    mockMvc
        .perform(get("/api/v1/stock-transfers").cookie(denied))
        .andExpect(status().isForbidden());
  }

  @Test
  void ac05_concurrentPushReservesStockOnce() throws Exception {
    Fixture fx = seed("race");
    UUID productId = createBatchedProduct(fx.cookie(), "SKU-RACE", "Race Med");
    UUID batchId = receiveAt(fx.cookie(), productId, "LOT-RACE", "5", "race-recv");
    AppUser owner =
        appUserRepository.findAll().stream()
            .filter(u -> u.getTenantId().equals(fx.tenantId()))
            .findFirst()
            .orElseThrow();
    AuthPrincipal principal =
        new AuthPrincipal(
                owner.getId(), fx.tenantId(), UUID.randomUUID(), AppUserRole.pharmacy_owner)
            .withActiveBranchId(fx.branchA());

    int workers = 8;
    ExecutorService pool = Executors.newFixedThreadPool(workers);
    CountDownLatch start = new CountDownLatch(1);
    List<Future<String>> results = new ArrayList<>();
    try {
      for (int i = 0; i < workers; i++) {
        final int idx = i;
        results.add(
            pool.submit(
                () -> {
                  start.await();
                  try {
                    stockTransferService.create(
                        principal,
                        new CreateStockTransferCommand(
                            "PUSH",
                            fx.branchB(),
                            List.of(
                                new CreateStockTransferCommand.Line(
                                    productId, batchId, new BigDecimal("5"))),
                            "race-key-" + idx));
                    return "OK";
                  } catch (ApiException ex) {
                    return ex.getCode();
                  }
                }));
      }
      start.countDown();
      List<String> outcomes = new ArrayList<>();
      for (Future<String> result : results) {
        outcomes.add(result.get(20, TimeUnit.SECONDS));
      }
      assertThat(outcomes.stream().filter("OK"::equals).count()).isEqualTo(1);
      assertThat(outcomes.stream().filter("INSUFFICIENT_STOCK"::equals).count())
          .isEqualTo(workers - 1);
    } finally {
      pool.shutdownNow();
    }

    assertThat(stockTransferRepository.count()).isEqualTo(1);
    assertThat(qtyAt(fx.tenantId(), fx.branchA(), productId, batchId)).isEqualByComparingTo("0");
    assertThat(qtyAt(fx.tenantId(), fx.branchB(), productId, batchId)).isEqualByComparingTo("0");
  }

  @Test
  void pushAndConfirmWriteAuditEvents() throws Exception {
    Fixture fx = seed("audit");
    UUID productId = createBatchedProduct(fx.cookie(), "SKU-AUD", "Audit Med");
    UUID batchId = receiveAt(fx.cookie(), productId, "LOT-AUD", "6", "aud-recv");

    mockMvc
        .perform(
            post("/api/v1/stock-transfers")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(createJson("PUSH", fx.branchB(), productId, batchId, "2", "aud-push")))
        .andExpect(status().isOk());

    List<AuditEvent> afterPush =
        auditEventRepository.findByTenantIdAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(
            fx.tenantId(), Instant.EPOCH);
    assertThat(afterPush.stream().map(AuditEvent::getAction))
        .anyMatch("STOCK_TRANSFER_PUSH"::equals);

    UUID transferId = stockTransferRepository.findAll().get(0).getId();
    selectBranch(fx.cookie(), fx.branchB());
    mockMvc
        .perform(post("/api/v1/stock-transfers/" + transferId + "/confirm").cookie(fx.cookie()))
        .andExpect(status().isOk());

    List<AuditEvent> afterConfirm =
        auditEventRepository.findByTenantIdAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(
            fx.tenantId(), Instant.EPOCH);
    assertThat(afterConfirm.stream().map(AuditEvent::getAction))
        .anyMatch("STOCK_TRANSFER_CONFIRM"::equals);
  }

  @Test
  void pullDispatchThenRejectRestoresSenderStock() throws Exception {
    Fixture fx = seed("pull");
    UUID productId = createBatchedProduct(fx.cookie(), "SKU-R", "Reject Med");
    UUID batchId = receiveAt(fx.cookie(), productId, "LOT-R", "10", "r-recv");

    selectBranch(fx.cookie(), fx.branchB());
    MvcResult created =
        mockMvc
            .perform(
                post("/api/v1/stock-transfers")
                    .cookie(fx.cookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(createJson("PULL", fx.branchA(), productId, batchId, "4", "r-pull")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("REQUESTED"))
            .andReturn();
    UUID transferId =
        UUID.fromString(
            objectMapper
                .readTree(created.getResponse().getContentAsString())
                .path("data")
                .path("id")
                .asText());

    assertThat(qtyAt(fx.tenantId(), fx.branchA(), productId, batchId)).isEqualByComparingTo("10");

    selectBranch(fx.cookie(), fx.branchA());
    mockMvc
        .perform(post("/api/v1/stock-transfers/" + transferId + "/dispatch").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("IN_TRANSIT"));
    assertThat(qtyAt(fx.tenantId(), fx.branchA(), productId, batchId)).isEqualByComparingTo("6");

    selectBranch(fx.cookie(), fx.branchB());
    mockMvc
        .perform(post("/api/v1/stock-transfers/" + transferId + "/reject").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("REJECTED"));
    assertThat(qtyAt(fx.tenantId(), fx.branchA(), productId, batchId)).isEqualByComparingTo("10");
  }

  private Fixture seed(String tag) throws Exception {
    Tenant tenant = persistTenant(tag, "Xfer " + tag);
    persistPlan(tenant.getId(), PlanCode.GROWTH);
    persistUser(tenant.getId(), "owner@" + tag + ".local", AppUserRole.pharmacy_owner);
    Location branchA = persistBranch(tenant.getId(), "Outlet A", "A" + tag, true);
    Location branchB = persistBranch(tenant.getId(), "Outlet B", "B" + tag, false);
    Cookie cookie = login("owner@" + tag + ".local");
    selectBranch(cookie, branchA.getId());
    return new Fixture(tenant.getId(), branchA.getId(), branchB.getId(), cookie);
  }

  private UUID receiveAt(Cookie cookie, UUID productId, String lot, String qty, String key)
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

  private BigDecimal qtyAt(UUID tenantId, UUID branchId, UUID productId, UUID batchId) {
    return stockBalanceRepository
        .findByTenantIdAndBranchIdAndProductIdAndBatchId(tenantId, branchId, productId, batchId)
        .map(StockBalance::getQuantity)
        .orElse(BigDecimal.ZERO);
  }

  private UUID createBatchedProduct(Cookie cookie, String sku, String name) throws Exception {
    UUID categoryId = createCategory(cookie, "Cat-" + sku);
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

  private static String createJson(
      String direction, UUID counterparty, UUID productId, UUID batchId, String qty, String key) {
    return """
        {"direction":"%s","counterpartyBranchId":"%s","lines":[{"productId":"%s","batchId":"%s","quantity":%s}],"idempotencyKey":"%s"}
        """
        .formatted(direction, counterparty, productId, batchId, qty, key);
  }

  private static String productJson(String sku, String name, UUID categoryId) {
    return """
        {
          "sku":"%s","barcode":null,"name":"%s","genericName":null,"brandName":null,
          "manufacturerId":null,"categoryId":"%s","productType":"Medicine","dosageForm":"Tablet",
          "therapeuticClass":null,"composition":null,"strength":null,"route":null,
          "prescriptionRequired":false,"scheduleClassification":null,"hsnCode":null,"gstRate":null,
          "baseUnit":"Tablet","packSize":10,"packUnit":"strip","packDescription":null,
          "storageConditions":null,"requiresColdStorage":false,"rackLocation":null,
          "reorderLevel":null,"reorderQuantity":null,"minimumStock":null,"isDiscontinued":false,
          "isReturnable":true,"isTaxable":true,"taxCategory":null,"requiresBatchTracking":true,
          "requiresExpiryTracking":true,"requiresSerialTracking":false,"controlledSubstance":false,
          "notes":null,"isActive":true
        }
        """
        .formatted(sku, name, categoryId);
  }

  private record Fixture(UUID tenantId, UUID branchA, UUID branchB, Cookie cookie) {}
}
