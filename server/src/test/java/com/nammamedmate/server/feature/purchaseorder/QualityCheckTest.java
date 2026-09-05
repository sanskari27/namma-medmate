package com.nammamedmate.server.feature.purchaseorder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.AbstractIntegrationTest;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.AuditEvent;
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.BranchType;
import com.nammamedmate.server.domain.GoodsReceiptLine;
import com.nammamedmate.server.domain.GoodsReceiptStatus;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.StockMovementType;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.AuditEventRepository;
import com.nammamedmate.server.persistence.GoodsReceiptLineRepository;
import com.nammamedmate.server.persistence.GoodsReceiptRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.StockBalanceRepository;
import com.nammamedmate.server.persistence.StockBatchRepository;
import com.nammamedmate.server.persistence.StockMovementRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

class QualityCheckTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-04T02:00:00Z");

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private GoodsReceiptRepository goodsReceiptRepository;
  @Autowired private GoodsReceiptLineRepository goodsReceiptLineRepository;
  @Autowired private StockBalanceRepository stockBalanceRepository;
  @Autowired private StockBatchRepository stockBatchRepository;
  @Autowired private StockMovementRepository stockMovementRepository;
  @Autowired private AuditEventRepository auditEventRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @Test
  void ac01_pharmacistOrOwnerCanQcInventoryAndCashierCannot() throws Exception {
    Fixture fx = seed("qc-ac01");
    PendingGrn grn = pendingGrn(fx, "10", 10000, "ac01");
    Cookie inventory = staffWithPredefined(fx, "inventory", "inv@qc-ac01.local");
    Cookie cashier = staffWithPredefined(fx, "cashier", "till@qc-ac01.local");
    Cookie pharmacist = staffWithPredefined(fx, "pharmacist", "rx@qc-ac01.local");

    mockMvc
        .perform(get("/api/v1/goods-receipts").cookie(inventory))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(1)))
        .andExpect(jsonPath("$.data.items[0].status").value("PENDING_QC"));

    mockMvc
        .perform(
            post("/api/v1/goods-receipts/" + grn.receiptId() + "/quality-check")
                .cookie(inventory)
                .contentType(MediaType.APPLICATION_JSON)
                .content(qcJson(grn.lineId(), "10", "0", "qc-inv")))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("PHARMACIST_REQUIRED"));

    mockMvc
        .perform(
            post("/api/v1/goods-receipts/" + grn.receiptId() + "/quality-check")
                .cookie(cashier)
                .contentType(MediaType.APPLICATION_JSON)
                .content(qcJson(grn.lineId(), "10", "0", "qc-till")))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("PHARMACIST_REQUIRED"));

    mockMvc
        .perform(
            post("/api/v1/goods-receipts/" + grn.receiptId() + "/quality-check")
                .cookie(pharmacist)
                .contentType(MediaType.APPLICATION_JSON)
                .content(qcJson(grn.lineId(), "10", "0", "qc-rx")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.status").value("CHECKED"));

    PendingGrn ownerGrn = pendingGrn(fx, "4", 5000, "ac01-own");
    mockMvc
        .perform(
            post("/api/v1/goods-receipts/" + ownerGrn.receiptId() + "/quality-check")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(qcJson(ownerGrn.lineId(), "4", "0", "qc-own")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("CHECKED"));
  }

  @Test
  void ac02_acceptingRequiresVisualInspectionAndChecklist() throws Exception {
    Fixture fx = seed("qc-ac02");
    PendingGrn accept = pendingGrn(fx, "8", 8000, "ac02-a");
    mockMvc
        .perform(
            post("/api/v1/goods-receipts/" + accept.receiptId() + "/quality-check")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    qcJson(accept.lineId(), "8", "0", "qc-no-vis", false, true, true, true, true)))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("CHECKLIST_INCOMPLETE"));

    mockMvc
        .perform(
            post("/api/v1/goods-receipts/" + accept.receiptId() + "/quality-check")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    qcJson(accept.lineId(), "8", "0", "qc-no-pack", true, false, true, true, true)))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("CHECKLIST_INCOMPLETE"));

    PendingGrn reject = pendingGrn(fx, "5", 8000, "ac02-r");
    mockMvc
        .perform(
            post("/api/v1/goods-receipts/" + reject.receiptId() + "/quality-check")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    qcJson(
                        reject.lineId(),
                        "0",
                        "5",
                        "qc-all-rej",
                        false,
                        false,
                        false,
                        false,
                        false)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("CHECKED"))
        .andExpect(jsonPath("$.data.lines[0].acceptedQuantity").value(0))
        .andExpect(jsonPath("$.data.lines[0].rejectedQuantity").value(5));
    assertThat(
            stockMovementRepository.findAll().stream()
                .filter(row -> row.getTenantId().equals(fx.tenantId()))
                .toList())
        .isEmpty();
  }

  @Test
  void ac03_partialAcceptanceStocksOnlyAcceptedQty() throws Exception {
    Fixture fx = seed("qc-ac03");
    PendingGrn grn = pendingGrn(fx, "10", 10000, "ac03");

    mockMvc
        .perform(
            post("/api/v1/goods-receipts/" + grn.receiptId() + "/quality-check")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(qcJson(grn.lineId(), "6", "4", "qc-part")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("CHECKED"))
        .andExpect(jsonPath("$.data.lines[0].acceptedQuantity").value(6))
        .andExpect(jsonPath("$.data.lines[0].rejectedQuantity").value(4))
        .andExpect(jsonPath("$.data.lines[0].stockMovementId").isNotEmpty());

    GoodsReceiptLine line = goodsReceiptLineRepository.findById(grn.lineId()).orElseThrow();
    assertThat(line.getAcceptedQuantity()).isEqualByComparingTo("6");
    assertThat(line.getRejectedQuantity()).isEqualByComparingTo("4");
    assertThat(line.getStockMovementId()).isNotNull();
    assertThat(
            stockBalanceRepository
                .findAllByTenantIdAndBranchIdAndProductId(
                    fx.tenantId(), fx.branchId(), grn.productId())
                .get(0)
                .getQuantity())
        .isEqualByComparingTo("6");
    assertThat(
            stockMovementRepository.findAll().stream()
                .filter(row -> row.getTenantId().equals(fx.tenantId()))
                .toList())
        .hasSize(1)
        .first()
        .extracting(row -> row.getType())
        .isEqualTo(StockMovementType.STOCK_IN);
  }

  @Test
  void ac04_acceptedQtyCreatesBatchAndStockOnce() throws Exception {
    Fixture fx = seed("qc-ac04");
    PendingGrn grn = pendingGrn(fx, "7", 9000, "ac04");
    String body = qcJson(grn.lineId(), "7", "0", "qc-once");

    mockMvc
        .perform(
            post("/api/v1/goods-receipts/" + grn.receiptId() + "/quality-check")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("CHECKED"));

    assertThat(
            stockBatchRepository.findByTenantIdAndProductIdAndBatchNumber(
                fx.tenantId(), grn.productId(), "LOT-QC"))
        .isPresent();
    assertThat(
            stockMovementRepository.findAll().stream()
                .filter(row -> row.getTenantId().equals(fx.tenantId()))
                .toList())
        .hasSize(1);
    assertThat(auditEventRepository.findAll())
        .extracting(AuditEvent::getAction)
        .contains("GOODS_RECEIPT_QC");

    mockMvc
        .perform(
            post("/api/v1/goods-receipts/" + grn.receiptId() + "/quality-check")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("CHECKED"));
    assertThat(
            stockMovementRepository.findAll().stream()
                .filter(row -> row.getTenantId().equals(fx.tenantId()))
                .toList())
        .hasSize(1);

    mockMvc
        .perform(
            post("/api/v1/goods-receipts/" + grn.receiptId() + "/quality-check")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(qcJson(grn.lineId(), "6", "1", "qc-once")))
        .andExpect(status().isConflict());

    mockMvc
        .perform(
            post("/api/v1/goods-receipts/" + grn.receiptId() + "/quality-check")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(qcJson(grn.lineId(), "7", "0", "qc-second")))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("STALE_STATE"));
  }

  @Test
  void ac05_mismatchExpiryReplayAndIsolationFailClosed() throws Exception {
    Fixture fx = seed("qc-ac05");
    Location annex = persistBranch(fx.tenantId(), "Annex", "BR02", false);
    PendingGrn grn = pendingGrn(fx, "10", 10000, "ac05");

    mockMvc
        .perform(post("/api/v1/goods-receipts/" + grn.receiptId() + "/quality-check"))
        .andExpect(status().isUnauthorized());

    mockMvc
        .perform(
            post("/api/v1/goods-receipts/" + grn.receiptId() + "/quality-check")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

    mockMvc
        .perform(
            post("/api/v1/goods-receipts/" + grn.receiptId() + "/quality-check")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(qcJson(grn.lineId(), "7", "2", "qc-mis")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("QUANTITY_MISMATCH"));

    mockMvc
        .perform(
            post("/api/v1/goods-receipts/" + grn.receiptId() + "/quality-check")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    qcJson(
                        grn.lineId(),
                        "10",
                        "0",
                        "qc-exp",
                        true,
                        true,
                        true,
                        true,
                        true,
                        "LOT-OLD",
                        "2020-01-01")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("INVALID_EXPIRY"));

    Tenant other = persistTenant("other-qc", "Other QC");
    persistPlan(other.getId(), PlanCode.FREE);
    persistUser(other.getId(), "owner@other-qc.local", AppUserRole.pharmacy_owner);
    Location otherBranch = persistBranch(other.getId(), "Other", "BR01", true);
    Cookie otherCookie = login("owner@other-qc.local");
    selectBranch(otherCookie, otherBranch.getId());
    mockMvc
        .perform(get("/api/v1/goods-receipts/" + grn.receiptId()).cookie(otherCookie))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    mockMvc
        .perform(
            post("/api/v1/goods-receipts/" + grn.receiptId() + "/quality-check")
                .cookie(otherCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(qcJson(grn.lineId(), "10", "0", "qc-oth")))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));

    selectBranch(fx.cookie(), annex.getId());
    mockMvc
        .perform(get("/api/v1/goods-receipts/" + grn.receiptId()).cookie(fx.cookie()))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    mockMvc
        .perform(
            post("/api/v1/goods-receipts/" + grn.receiptId() + "/quality-check")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(qcJson(grn.lineId(), "10", "0", "qc-ann")))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));

    selectBranch(fx.cookie(), fx.branchId());
    assertThat(goodsReceiptRepository.findById(grn.receiptId()).orElseThrow().getStatus())
        .isEqualTo(GoodsReceiptStatus.PENDING_QC);
    assertThat(stockMovementRepository.count()).isZero();
  }

  private PendingGrn pendingGrn(Fixture fx, String qty, long rate, String key) throws Exception {
    UUID supplierId = createSupplier(fx.cookie(), "SUP-" + key);
    UUID productId = createProduct(fx.cookie(), "SKU-" + key, "Pack " + key);
    UUID poId =
        idOf(
            mockMvc
                .perform(
                    post("/api/v1/purchase-orders")
                        .cookie(fx.cookie())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createPoJson(supplierId, productId, qty, rate, "po-" + key)))
                .andExpect(status().isOk())
                .andReturn());
    mockMvc
        .perform(
            post("/api/v1/purchase-orders/" + poId + "/issue")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expectedVersion\":1}"))
        .andExpect(status().isOk());
    UUID poLineId = poLineIdOf(fx.cookie(), poId);
    UUID receiptId =
        idOf(
            mockMvc
                .perform(
                    post("/api/v1/purchase-orders/" + poId + "/receipts")
                        .cookie(fx.cookie())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(receiptJson("CH-" + key, "grn-" + key, poLineId, qty, rate)))
                .andExpect(status().isOk())
                .andReturn());
    GoodsReceiptLine line =
        goodsReceiptLineRepository
            .findAllByGoodsReceiptIdAndTenantIdAndBranchIdOrderBySortOrderAsc(
                receiptId, fx.tenantId(), fx.branchId())
            .get(0);
    return new PendingGrn(receiptId, line.getId(), productId);
  }

  private Cookie staffWithPredefined(Fixture fx, String roleCode, String email) throws Exception {
    AppUser staff = persistUser(fx.tenantId(), email, AppUserRole.pharmacy_staff);
    UUID roleId = predefinedId(fx.cookie(), roleCode);
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
    Cookie cookie = login(email);
    selectBranch(cookie, fx.branchId());
    return cookie;
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

  private UUID poLineIdOf(Cookie cookie, UUID poId) throws Exception {
    String body =
        mockMvc
            .perform(get("/api/v1/purchase-orders/" + poId).cookie(cookie))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return UUID.fromString(
        objectMapper.readTree(body).path("data").path("lines").get(0).path("id").asText());
  }

  private UUID createProduct(Cookie cookie, String sku, String name) throws Exception {
    UUID categoryId =
        UUID.fromString(
            objectMapper
                .readTree(
                    mockMvc
                        .perform(
                            post("/api/v1/product-categories")
                                .cookie(cookie)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"name\":\"" + sku + " cat\"}"))
                        .andExpect(status().isOk())
                        .andReturn()
                        .getResponse()
                        .getContentAsString())
                .path("data")
                .path("id")
                .asText());
    String body =
        mockMvc
            .perform(
                post("/api/v1/products")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(productJson(sku, name, categoryId)))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return UUID.fromString(objectMapper.readTree(body).path("data").path("id").asText());
  }

  private UUID createSupplier(Cookie cookie, String code) throws Exception {
    String body =
        mockMvc
            .perform(
                post("/api/v1/suppliers")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(supplierJson(code)))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return UUID.fromString(objectMapper.readTree(body).path("data").path("id").asText());
  }

  private UUID idOf(MvcResult result) throws Exception {
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

  private Fixture seed(String tag) throws Exception {
    Tenant tenant = persistTenant(tag, "QC " + tag);
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@" + tag + ".local", AppUserRole.pharmacy_owner);
    Location branch = persistBranch(tenant.getId(), "Main", "BR01", true);
    Cookie cookie = login("owner@" + tag + ".local");
    selectBranch(cookie, branch.getId());
    return new Fixture(tenant.getId(), branch.getId(), cookie);
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
    tax.put("taxState", "KA");
    branch.setTaxSettings(tax);
    branch.setCreatedAt(T0);
    branch.setUpdatedAt(T0);
    return locationRepository.saveAndFlush(branch);
  }

  private void persistPlan(UUID tenantId, PlanCode plan) {
    TenantSubscription sub = new TenantSubscription();
    sub.setId(UUID.randomUUID());
    sub.setTenantId(tenantId);
    sub.setPlanCode(plan);
    sub.setStatus(SubscriptionStatus.ACTIVE);
    sub.setStartedAt(T0);
    sub.setCreatedAt(T0);
    sub.setUpdatedAt(T0);
    tenantSubscriptionRepository.save(sub);
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
    return tenantRepository.save(tenant);
  }

  private AppUser persistUser(UUID tenantId, String email, AppUserRole role) {
    AppUser user = new AppUser();
    user.setId(UUID.randomUUID());
    user.setTenantId(tenantId);
    user.setEmail(email);
    user.setPasswordHash(passwordEncoder.encode(PASSWORD));
    user.setDisplayName(email);
    user.setRole(role);
    user.setStatus(UserAccountStatus.ACTIVE);
    user.setActive(true);
    user.setMustChangePassword(false);
    user.setCreatedAt(T0);
    user.setUpdatedAt(T0);
    user.setPasswordChangedAt(T0);
    return appUserRepository.save(user);
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
    Cookie access = result.getResponse().getCookie("nmm_access");
    assertThat(access).isNotNull();
    return access;
  }

  private static String qcJson(UUID lineId, String accepted, String rejected, String key) {
    return qcJson(lineId, accepted, rejected, key, true, true, true, true, true);
  }

  private static String qcJson(
      UUID lineId,
      String accepted,
      String rejected,
      String key,
      boolean visual,
      boolean pack,
      boolean label,
      boolean readable,
      boolean noDamage) {
    return qcJson(
        lineId,
        accepted,
        rejected,
        key,
        visual,
        pack,
        label,
        readable,
        noDamage,
        "LOT-QC",
        "2027-12-31");
  }

  private static String qcJson(
      UUID lineId,
      String accepted,
      String rejected,
      String key,
      boolean visual,
      boolean pack,
      boolean label,
      boolean readable,
      boolean noDamage,
      String batch,
      String expiresOn) {
    return """
        {
          "idempotencyKey":"%s",
          "visualInspectionPassed":%s,
          "checklist":{
            "packagingIntact":%s,
            "labelMatches":%s,
            "batchReadable":%s,
            "noDamage":%s
          },
          "lines":[{
            "goodsReceiptLineId":"%s",
            "acceptedQuantity":%s,
            "rejectedQuantity":%s,
            "batchNumber":"%s",
            "manufacturedOn":"2026-01-15",
            "expiresOn":"%s"
          }]
        }
        """
        .formatted(
            key, visual, pack, label, readable, noDamage, lineId, accepted, rejected, batch,
            expiresOn);
  }

  private static String receiptJson(
      String reference, String key, UUID lineId, String qty, long rate) {
    return """
        {
          "receiptReference":"%s",
          "idempotencyKey":"%s",
          "lines":[{"purchaseOrderLineId":"%s","quantity":%s,"unitRatePaise":%d}]
        }
        """
        .formatted(reference, key, lineId, qty, rate);
  }

  private static String createPoJson(
      UUID supplierId, UUID productId, String qty, long rate, String key) {
    return """
        {
          "supplierId":"%s",
          "expectedDeliveryDate":"2026-09-20",
          "paymentTerms":"CREDIT",
          "notes":"Weekly indent",
          "idempotencyKey":"%s",
          "lines":[{"productId":"%s","quantity":%s,"unitRatePaise":%d}]
        }
        """
        .formatted(supplierId, key, productId, qty, rate);
  }

  private static String supplierJson(String code) {
    return """
        {
          "supplierCode":"%s",
          "legalName":"Acme Pharma Pvt Ltd",
          "tradeName":null,
          "supplierType":"DISTRIBUTOR",
          "gstin":null,
          "pan":null,
          "drugLicenseNumber":null,
          "drugLicenseType":null,
          "drugLicenseExpiry":null,
          "fssaiLicenseNumber":null,
          "contactPersonName":"Ramesh Rao",
          "contactPersonRole":null,
          "phone":"9876500001",
          "alternatePhone":null,
          "email":null,
          "website":null,
          "addressLine1":"12 MG Road",
          "addressLine2":null,
          "city":"Bengaluru",
          "state":"KA",
          "pincode":"560001",
          "country":"India",
          "paymentTerms":"COD",
          "creditPeriodDays":null,
          "creditLimitPaise":null,
          "bankName":null,
          "accountHolderName":null,
          "accountNumber":null,
          "confirmAccountNumber":null,
          "ifscCode":null,
          "upiId":null,
          "categoryIds":[],
          "status":"ACTIVE",
          "notes":null
        }
        """
        .formatted(code);
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
          "hsnCode":"30049099",
          "gstRate":12,
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

  private record Fixture(UUID tenantId, UUID branchId, Cookie cookie) {}

  private record PendingGrn(UUID receiptId, UUID lineId, UUID productId) {}
}
