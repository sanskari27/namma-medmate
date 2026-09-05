package com.nammamedmate.server.feature.purchaseorder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.PurchaseOrderStatus;
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
import com.nammamedmate.server.persistence.PurchaseOrderRepository;
import com.nammamedmate.server.persistence.StockBalanceRepository;
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

class GoodsReceiptTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-04T02:00:00Z");

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private PurchaseOrderRepository purchaseOrderRepository;
  @Autowired private GoodsReceiptRepository goodsReceiptRepository;
  @Autowired private GoodsReceiptLineRepository goodsReceiptLineRepository;
  @Autowired private StockBalanceRepository stockBalanceRepository;
  @Autowired private StockMovementRepository stockMovementRepository;
  @Autowired private AuditEventRepository auditEventRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @Test
  void ac01_grnCrossChecksQuantityAndPriceAgainstPo() throws Exception {
    Fixture fx = seed("grn-match");
    IssuedPo po = issuePo(fx, "10", 10000, "po-match");

    mockMvc
        .perform(
            post("/api/v1/purchase-orders/" + po.poId() + "/receipts")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(receiptJson("CH-BAD-RATE", "grn-bad-rate", po.lineId(), "10", 9900)))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("PRICE_MISMATCH"));

    mockMvc
        .perform(
            post("/api/v1/purchase-orders/" + po.poId() + "/receipts")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(receiptJson("CH-OK", "grn-ok", po.lineId(), "10", 10000)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.status").value("PENDING_QC"))
        .andExpect(jsonPath("$.data.receiptReference").value("CH-OK"))
        .andExpect(
            jsonPath("$.data.receiptNumber", matchesPattern("GRN/\\d{4}-\\d{2}/BR01/00001")));

    assertThat(auditEventRepository.findAll())
        .extracting(AuditEvent::getAction)
        .contains("GOODS_RECEIPT_CREATE");
  }

  @Test
  void ac02_partialDeliveryKeepsRemainingPending() throws Exception {
    Fixture fx = seed("grn-part");
    IssuedPo po = issuePo(fx, "10", 10000, "po-part");

    mockMvc
        .perform(
            post("/api/v1/purchase-orders/" + po.poId() + "/receipts")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(receiptJson("CH-4", "grn-4", po.lineId(), "4", 10000)))
        .andExpect(status().isOk());

    mockMvc
        .perform(get("/api/v1/purchase-orders/" + po.poId() + "/receipts").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.purchaseOrderId").value(po.poId().toString()))
        .andExpect(jsonPath("$.data.status").value("ISSUED"))
        .andExpect(jsonPath("$.data.lines[0].orderedQuantity").value(10))
        .andExpect(jsonPath("$.data.lines[0].receivedQuantity").value(4))
        .andExpect(jsonPath("$.data.lines[0].remainingQuantity").value(6))
        .andExpect(jsonPath("$.data.receipts", hasSize(1)));

    assertThat(purchaseOrderRepository.findById(po.poId()).orElseThrow().getStatus())
        .isEqualTo(PurchaseOrderStatus.ISSUED);

    mockMvc
        .perform(
            post("/api/v1/purchase-orders/" + po.poId() + "/receipts")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(receiptJson("CH-6", "grn-6", po.lineId(), "6", 10000)))
        .andExpect(status().isOk());

    mockMvc
        .perform(get("/api/v1/purchase-orders/" + po.poId() + "/receipts").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("ISSUED"))
        .andExpect(jsonPath("$.data.lines[0].receivedQuantity").value(10))
        .andExpect(jsonPath("$.data.lines[0].remainingQuantity").value(0))
        .andExpect(jsonPath("$.data.receipts", hasSize(2)));

    assertThat(purchaseOrderRepository.findById(po.poId()).orElseThrow().getStatus())
        .isEqualTo(PurchaseOrderStatus.ISSUED);
  }

  @Test
  void ac03_receiptDoesNotIncreaseSellableStock() throws Exception {
    Fixture fx = seed("grn-stock");
    IssuedPo po = issuePo(fx, "8", 5000, "po-stock");
    long balancesBefore = stockBalanceRepository.count();
    long movementsBefore = stockMovementRepository.count();

    mockMvc
        .perform(
            post("/api/v1/purchase-orders/" + po.poId() + "/receipts")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(receiptJson("CH-STK", "grn-stk", po.lineId(), "8", 5000)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("PENDING_QC"));

    assertThat(stockBalanceRepository.count()).isEqualTo(balancesBefore);
    assertThat(stockMovementRepository.count()).isEqualTo(movementsBefore);
    mockMvc
        .perform(get("/api/v1/inventory/balances").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(0)));
  }

  @Test
  void ac04_overReceiptFailsUntilPoQuantityCorrected() throws Exception {
    Fixture fx = seed("grn-over");
    IssuedPo po = issuePo(fx, "10", 10000, "po-over");

    mockMvc
        .perform(
            post("/api/v1/purchase-orders/" + po.poId() + "/receipts")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(receiptJson("CH-11", "grn-11", po.lineId(), "11", 10000)))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("OVER_RECEIPT"));
    assertThat(goodsReceiptRepository.count()).isZero();
    assertThat(goodsReceiptLineRepository.count()).isZero();

    mockMvc
        .perform(
            patch("/api/v1/purchase-orders/" + po.poId())
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(patchJson(po.productId(), "11", 10000, po.version())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("ISSUED"));

    UUID correctedLineId = lineIdOf(fx.cookie(), po.poId());
    mockMvc
        .perform(
            post("/api/v1/purchase-orders/" + po.poId() + "/receipts")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(receiptJson("CH-11B", "grn-11b", correctedLineId, "11", 10000)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("PENDING_QC"));
  }

  @Test
  void ac05_duplicateWrongScopeClosedPoFailAtomically() throws Exception {
    Fixture fx = seed("grn-iso");
    Location annex = persistBranch(fx.tenantId(), "Annex", "BR02", false);
    IssuedPo po = issuePo(fx, "5", 8000, "po-iso");

    mockMvc
        .perform(post("/api/v1/purchase-orders/" + po.poId() + "/receipts"))
        .andExpect(status().isUnauthorized());

    mockMvc
        .perform(
            post("/api/v1/purchase-orders/" + po.poId() + "/receipts")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

    AppUser sales = persistUser(fx.tenantId(), "sales@grn-iso.local", AppUserRole.pharmacy_staff);
    UUID salesRole = createRole(fx.cookie(), "Till only", "[\"SALES\"]");
    mockMvc.perform(putRoles(sales.getId(), fx.cookie(), salesRole)).andExpect(status().isOk());
    assignBranch(sales.getId(), fx.cookie(), fx.branchId());
    Cookie salesCookie = login("sales@grn-iso.local");
    mockMvc
        .perform(
            post("/api/v1/purchase-orders/" + po.poId() + "/receipts")
                .cookie(salesCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(receiptJson("CH-SALES", "grn-sales", po.lineId(), "1", 8000)))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));

    Tenant other = persistTenant("other-grn", "Other GRN");
    persistPlan(other.getId(), PlanCode.FREE);
    persistUser(other.getId(), "owner@other-grn.local", AppUserRole.pharmacy_owner);
    Location otherBranch = persistBranch(other.getId(), "Other", "BR01", true);
    Cookie otherCookie = login("owner@other-grn.local");
    selectBranch(otherCookie, otherBranch.getId());
    mockMvc
        .perform(get("/api/v1/purchase-orders/" + po.poId() + "/receipts").cookie(otherCookie))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    mockMvc
        .perform(
            post("/api/v1/purchase-orders/" + po.poId() + "/receipts")
                .cookie(otherCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(receiptJson("CH-OTH", "grn-oth", po.lineId(), "1", 8000)))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));

    selectBranch(fx.cookie(), annex.getId());
    mockMvc
        .perform(get("/api/v1/purchase-orders/" + po.poId() + "/receipts").cookie(fx.cookie()))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    mockMvc
        .perform(
            post("/api/v1/purchase-orders/" + po.poId() + "/receipts")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(receiptJson("CH-ANN", "grn-ann", po.lineId(), "1", 8000)))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));

    selectBranch(fx.cookie(), fx.branchId());
    MvcResult first =
        mockMvc
            .perform(
                post("/api/v1/purchase-orders/" + po.poId() + "/receipts")
                    .cookie(fx.cookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(receiptJson("CH-DUP", "grn-dup-a", po.lineId(), "1", 8000)))
            .andExpect(status().isOk())
            .andReturn();
    UUID receiptId = idOf(first);

    mockMvc
        .perform(
            post("/api/v1/purchase-orders/" + po.poId() + "/receipts")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(receiptJson("CH-DUP", "grn-dup-b", po.lineId(), "1", 8000)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("DUPLICATE_RECEIPT"));

    mockMvc
        .perform(
            post("/api/v1/purchase-orders/" + po.poId() + "/receipts")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(receiptJson("CH-DUP", "grn-dup-a", po.lineId(), "1", 8000)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.id").value(receiptId.toString()));

    UUID draftId =
        idOf(
            mockMvc
                .perform(
                    post("/api/v1/purchase-orders")
                        .cookie(fx.cookie())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                            createJson(po.supplierId(), po.productId(), "2", 8000, "po-draft")))
                .andExpect(status().isOk())
                .andReturn());
    UUID draftLine = lineIdOf(fx.cookie(), draftId);
    mockMvc
        .perform(
            post("/api/v1/purchase-orders/" + draftId + "/receipts")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(receiptJson("CH-DRAFT", "grn-draft", draftLine, "1", 8000)))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("PO_NOT_ISSUED"));

    UUID closedId =
        idOf(
            mockMvc
                .perform(
                    post("/api/v1/purchase-orders")
                        .cookie(fx.cookie())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                            createJson(po.supplierId(), po.productId(), "2", 8000, "po-close")))
                .andExpect(status().isOk())
                .andReturn());
    mockMvc
        .perform(
            post("/api/v1/purchase-orders/" + closedId + "/issue")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expectedVersion\":1}"))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            post("/api/v1/purchase-orders/" + closedId + "/close")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expectedVersion\":2}"))
        .andExpect(status().isOk());
    UUID closedLine = lineIdOf(fx.cookie(), closedId);
    mockMvc
        .perform(
            post("/api/v1/purchase-orders/" + closedId + "/receipts")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(receiptJson("CH-CL", "grn-cl", closedLine, "1", 8000)))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("PO_CLOSED"));

    assertThat(
            goodsReceiptRepository.findAll().stream()
                .filter(row -> row.getTenantId().equals(fx.tenantId()))
                .toList())
        .allSatisfy(
            row -> {
              assertThat(row.getTenantId()).isEqualTo(fx.tenantId());
              assertThat(row.getBranchId()).isEqualTo(fx.branchId());
            });
  }

  private IssuedPo issuePo(Fixture fx, String qty, long rate, String key) throws Exception {
    UUID supplierId = createSupplier(fx.cookie(), "SUP-" + key, null);
    UUID productId = createProduct(fx.cookie(), "SKU-" + key, "Pack " + key);
    UUID poId =
        idOf(
            mockMvc
                .perform(
                    post("/api/v1/purchase-orders")
                        .cookie(fx.cookie())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createJson(supplierId, productId, qty, rate, key)))
                .andExpect(status().isOk())
                .andReturn());
    MvcResult issued =
        mockMvc
            .perform(
                post("/api/v1/purchase-orders/" + poId + "/issue")
                    .cookie(fx.cookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"expectedVersion\":1}"))
            .andExpect(status().isOk())
            .andReturn();
    int version =
        objectMapper
            .readTree(issued.getResponse().getContentAsString())
            .path("data")
            .path("version")
            .asInt();
    UUID lineId = lineIdOf(fx.cookie(), poId);
    return new IssuedPo(poId, lineId, productId, supplierId, version);
  }

  private UUID lineIdOf(Cookie cookie, UUID poId) throws Exception {
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

  private UUID categoryId(Cookie cookie, String name) throws Exception {
    String body =
        mockMvc
            .perform(
                post("/api/v1/product-categories")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":\"" + name + "\"}"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return UUID.fromString(objectMapper.readTree(body).path("data").path("id").asText());
  }

  private UUID createProduct(Cookie cookie, String sku, String name) throws Exception {
    UUID categoryId = categoryId(cookie, sku + " cat");
    String body =
        mockMvc
            .perform(
                post("/api/v1/products")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(productJson(sku, name, categoryId, true)))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return UUID.fromString(objectMapper.readTree(body).path("data").path("id").asText());
  }

  private UUID createSupplier(Cookie cookie, String code, String gstin) throws Exception {
    String body =
        mockMvc
            .perform(
                post("/api/v1/suppliers")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(supplierJson(code, gstin)))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return UUID.fromString(objectMapper.readTree(body).path("data").path("id").asText());
  }

  private UUID idOf(MvcResult result) throws Exception {
    JsonNode data = objectMapper.readTree(result.getResponse().getContentAsString()).path("data");
    return UUID.fromString(data.path("id").asText());
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
    Tenant tenant = persistTenant(tag, "GRN " + tag);
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

  private void assignBranch(UUID userId, Cookie owner, UUID branchId) throws Exception {
    mockMvc
        .perform(
            org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(
                    "/api/v1/users/" + userId + "/branches")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchIds\":[\"" + branchId + "\"]}"))
        .andExpect(status().isOk());
  }

  private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder putRoles(
      UUID userId, Cookie owner, UUID roleId) {
    return org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(
            "/api/v1/users/" + userId + "/roles")
        .cookie(owner)
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"roleIds\":[\"" + roleId + "\"]}");
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

  private static String createJson(
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

  private static String patchJson(UUID productId, String qty, long rate, int expectedVersion) {
    return """
        {
          "expectedVersion":%d,
          "expectedDeliveryDate":"2026-09-22",
          "paymentTerms":"CREDIT",
          "notes":"Corrected indent",
          "lines":[{"productId":"%s","quantity":%s,"unitRatePaise":%d}]
        }
        """
        .formatted(expectedVersion, productId, qty, rate);
  }

  private static String supplierJson(String code, String gstin) {
    String gstinJson = gstin == null ? "null" : "\"" + gstin + "\"";
    return """
        {
          "supplierCode":"%s",
          "legalName":"Acme Pharma Pvt Ltd",
          "tradeName":null,
          "supplierType":"DISTRIBUTOR",
          "gstin":%s,
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
        .formatted(code, gstinJson);
  }

  private static String productJson(String sku, String name, UUID categoryId, boolean active) {
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
          "isDiscontinued":%s,
          "isReturnable":true,
          "isTaxable":true,
          "taxCategory":null,
          "requiresBatchTracking":false,
          "requiresExpiryTracking":false,
          "requiresSerialTracking":false,
          "controlledSubstance":false,
          "notes":null,
          "isActive":%s
        }
        """
        .formatted(sku, name, categoryId, !active, active);
  }

  private record Fixture(UUID tenantId, UUID branchId, Cookie cookie) {}

  private record IssuedPo(UUID poId, UUID lineId, UUID productId, UUID supplierId, int version) {}
}
