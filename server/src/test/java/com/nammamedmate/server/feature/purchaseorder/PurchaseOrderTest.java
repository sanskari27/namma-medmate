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
import com.nammamedmate.server.domain.PurchaseOrder;
import com.nammamedmate.server.domain.PurchaseOrderLine;
import com.nammamedmate.server.domain.PurchaseOrderStatus;
import com.nammamedmate.server.domain.PurchaseOrderVersion;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.AuditEventRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.PurchaseOrderLineRepository;
import com.nammamedmate.server.persistence.PurchaseOrderRepository;
import com.nammamedmate.server.persistence.PurchaseOrderVersionRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

class PurchaseOrderTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-04T02:00:00Z");

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private PurchaseOrderRepository purchaseOrderRepository;
  @Autowired private PurchaseOrderLineRepository purchaseOrderLineRepository;
  @Autowired private PurchaseOrderVersionRepository purchaseOrderVersionRepository;
  @Autowired private AuditEventRepository auditEventRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @Test
  void ac01_createBindsExactlyOneSupplierAndRejectsMixedSupplierEdit() throws Exception {
    Fixture fx = seed("one-sup");
    UUID supplierA = createSupplier(fx.cookie(), "SUP-A", "29ABCDE1234F1Z5");
    UUID supplierB = createSupplier(fx.cookie(), "SUP-B", "29AAAAA1234A1Z5");
    UUID productId = createProduct(fx.cookie(), "PARA-500", "Paracetamol 500");

    MvcResult created =
        mockMvc
            .perform(
                post("/api/v1/purchase-orders")
                    .cookie(fx.cookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(createJson(supplierA, productId, "10", 10000, "po-one")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.supplierId").value(supplierA.toString()))
            .andExpect(jsonPath("$.data.branchId").value(fx.branchId().toString()))
            .andExpect(jsonPath("$.data.status").value("DRAFT"))
            .andExpect(jsonPath("$.data.poNumber", matchesPattern("PO/\\d{4}-\\d{2}/BR01/00001")))
            .andExpect(jsonPath("$.data.lines", hasSize(1)))
            .andExpect(jsonPath("$.data.lines[0].productId").value(productId.toString()))
            .andReturn();
    UUID poId = idOf(created);

    mockMvc
        .perform(
            patch("/api/v1/purchase-orders/" + poId)
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(patchJson(supplierB, productId, "10", 10000, 1)))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("MIXED_SUPPLIER"));

    PurchaseOrder stored = purchaseOrderRepository.findById(poId).orElseThrow();
    assertThat(stored.getSupplierId()).isEqualTo(supplierA);
    assertThat(stored.getTenantId()).isEqualTo(fx.tenantId());
    assertThat(stored.getBranchId()).isEqualTo(fx.branchId());
  }

  @Test
  void ac02_ownerAndInventoryMayCreateFinanceAndSalesCannot() throws Exception {
    Fixture fx = seed("roles");
    UUID supplierId = createSupplier(fx.cookie(), "SUP-R", null);
    UUID productId = createProduct(fx.cookie(), "AMOX-250", "Amoxicillin 250");

    mockMvc
        .perform(
            post("/api/v1/purchase-orders")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(createJson(supplierId, productId, "4", 5000, "po-owner")))
        .andExpect(status().isOk());

    AppUser inventory = persistUser(fx.tenantId(), "stock@roles.local", AppUserRole.pharmacy_staff);
    UUID invRole = createRole(fx.cookie(), "Stock desk", "[\"INVENTORY\",\"PROCUREMENT\"]");
    mockMvc.perform(putRoles(inventory.getId(), fx.cookie(), invRole)).andExpect(status().isOk());
    assignBranch(inventory.getId(), fx.cookie(), fx.branchId());
    Cookie invCookie = login("stock@roles.local");
    selectBranch(invCookie, fx.branchId());
    mockMvc
        .perform(
            post("/api/v1/purchase-orders")
                .cookie(invCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(createJson(supplierId, productId, "2", 5000, "po-inv")))
        .andExpect(status().isOk());

    AppUser books = persistUser(fx.tenantId(), "books@roles.local", AppUserRole.pharmacy_staff);
    UUID finRole = createRole(fx.cookie(), "Books desk", "[\"FINANCE\"]");
    mockMvc.perform(putRoles(books.getId(), fx.cookie(), finRole)).andExpect(status().isOk());
    assignBranch(books.getId(), fx.cookie(), fx.branchId());
    Cookie finCookie = login("books@roles.local");
    selectBranch(finCookie, fx.branchId());
    mockMvc
        .perform(
            post("/api/v1/purchase-orders")
                .cookie(finCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(createJson(supplierId, productId, "1", 5000, "po-fin")))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));

    AppUser sales = persistUser(fx.tenantId(), "sales@roles.local", AppUserRole.pharmacy_staff);
    UUID salesRole = createRole(fx.cookie(), "Till only", "[\"SALES\"]");
    mockMvc.perform(putRoles(sales.getId(), fx.cookie(), salesRole)).andExpect(status().isOk());
    assignBranch(sales.getId(), fx.cookie(), fx.branchId());
    Cookie salesCookie = login("sales@roles.local");
    mockMvc
        .perform(
            post("/api/v1/purchase-orders")
                .cookie(salesCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(createJson(supplierId, productId, "1", 5000, "po-sales")))
        .andExpect(status().isForbidden());
  }

  @Test
  void ac03_editRetainsVersionAndRecalculatesTotals() throws Exception {
    Fixture fx = seed("ver");
    UUID supplierId = createSupplier(fx.cookie(), "SUP-V", null);
    UUID productId = createProduct(fx.cookie(), "CROCIN", "Crocin Advance");

    MvcResult created =
        mockMvc
            .perform(
                post("/api/v1/purchase-orders")
                    .cookie(fx.cookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(createJson(supplierId, productId, "10", 10000, "po-ver")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.version").value(1))
            .andExpect(jsonPath("$.data.subtotalPaise").value(100000))
            .andExpect(jsonPath("$.data.taxPaise").value(12000))
            .andExpect(jsonPath("$.data.totalPaise").value(112000))
            .andReturn();
    UUID poId = idOf(created);

    mockMvc
        .perform(
            patch("/api/v1/purchase-orders/" + poId)
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(patchJson(null, productId, "20", 10000, 1)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.version").value(2))
        .andExpect(jsonPath("$.data.subtotalPaise").value(200000))
        .andExpect(jsonPath("$.data.taxPaise").value(24000))
        .andExpect(jsonPath("$.data.totalPaise").value(224000));

    mockMvc
        .perform(get("/api/v1/purchase-orders/" + poId + "/versions").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(2)))
        .andExpect(jsonPath("$.data.items[0].version").value(1))
        .andExpect(jsonPath("$.data.items[0].totalPaise").value(112000))
        .andExpect(jsonPath("$.data.items[1].version").value(2))
        .andExpect(jsonPath("$.data.items[1].totalPaise").value(224000))
        .andExpect(
            jsonPath("$.data.items[0].snapshot.lines[0].productName").value("Crocin Advance"));

    List<PurchaseOrderVersion> versions =
        purchaseOrderVersionRepository.findAllByPurchaseOrderIdOrderByVersionAsc(poId);
    assertThat(versions).hasSize(2);
    assertThat(auditEventRepository.findAll())
        .extracting(AuditEvent::getAction)
        .contains("PURCHASE_ORDER_CREATE", "PURCHASE_ORDER_UPDATE");

    mockMvc
        .perform(get("/api/v1/suppliers/" + supplierId).cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.branchProcurement.purchaseOrders", hasSize(1)))
        .andExpect(
            jsonPath("$.data.branchProcurement.purchaseOrders[0].id").value(poId.toString()));
  }

  @Test
  void ac04_closedAndCancelledBlockQuantityEdits() throws Exception {
    Fixture fx = seed("life");
    UUID supplierId = createSupplier(fx.cookie(), "SUP-L", null);
    UUID productId = createProduct(fx.cookie(), "CETIR", "Cetirizine");

    UUID issuedId =
        idOf(
            mockMvc
                .perform(
                    post("/api/v1/purchase-orders")
                        .cookie(fx.cookie())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createJson(supplierId, productId, "5", 8000, "po-issue")))
                .andExpect(status().isOk())
                .andReturn());

    mockMvc
        .perform(
            post("/api/v1/purchase-orders/" + issuedId + "/issue")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expectedVersion\":1}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("ISSUED"));

    mockMvc
        .perform(
            post("/api/v1/purchase-orders/" + issuedId + "/close")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expectedVersion\":2}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("CLOSED"));

    mockMvc
        .perform(
            patch("/api/v1/purchase-orders/" + issuedId)
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(patchJson(null, productId, "9", 8000, 3)))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("PO_CLOSED"));

    UUID cancelId =
        idOf(
            mockMvc
                .perform(
                    post("/api/v1/purchase-orders")
                        .cookie(fx.cookie())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createJson(supplierId, productId, "3", 8000, "po-cancel")))
                .andExpect(status().isOk())
                .andReturn());
    mockMvc
        .perform(
            post("/api/v1/purchase-orders/" + cancelId + "/cancel")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expectedVersion\":1}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("CANCELLED"));
    mockMvc
        .perform(
            patch("/api/v1/purchase-orders/" + cancelId)
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(patchJson(null, productId, "1", 8000, 2)))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("PO_CLOSED"));

    assertThat(purchaseOrderRepository.findById(issuedId).orElseThrow().getStatus())
        .isEqualTo(PurchaseOrderStatus.CLOSED);
    List<PurchaseOrderLine> closedLines =
        purchaseOrderLineRepository
            .findAllByPurchaseOrderIdAndTenantIdAndBranchIdOrderBySortOrderAsc(
                issuedId, fx.tenantId(), fx.branchId());
    assertThat(closedLines).hasSize(1);
    assertThat(closedLines.get(0).getQuantity()).isEqualByComparingTo("5");
  }

  @Test
  void ac05_inactiveStaleInvalidAndCrossScopeFailUndisclosed() throws Exception {
    Fixture fx = seed("iso-po");
    Location annex = persistBranch(fx.tenantId(), "Annex", "BR02", false);
    UUID supplierId = createSupplier(fx.cookie(), "SUP-I", "29ABCDE1234F1Z5");
    UUID productId = createProduct(fx.cookie(), "ISO-SKU", "Isolation Pack");

    mockMvc.perform(get("/api/v1/purchase-orders")).andExpect(status().isUnauthorized());

    mockMvc
        .perform(
            post("/api/v1/purchase-orders")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

    mockMvc
        .perform(
            post("/api/v1/purchase-orders")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(createJson(supplierId, productId, "0", 10000, "po-qty")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("INVALID_QUANTITY"));

    UUID poId =
        idOf(
            mockMvc
                .perform(
                    post("/api/v1/purchase-orders")
                        .cookie(fx.cookie())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createJson(supplierId, productId, "2", 10000, "po-stale")))
                .andExpect(status().isOk())
                .andReturn());

    mockMvc
        .perform(
            patch("/api/v1/purchase-orders/" + poId)
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(patchJson(null, productId, "3", 10000, 1)))
        .andExpect(status().isOk());

    mockMvc
        .perform(
            patch("/api/v1/purchase-orders/" + poId)
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(patchJson(null, productId, "4", 10000, 1)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("STALE_STATE"));

    mockMvc
        .perform(
            post("/api/v1/purchase-orders")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(createJson(supplierId, productId, "2", 10000, "po-stale")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.id").value(poId.toString()));

    selectBranch(fx.cookie(), annex.getId());
    mockMvc
        .perform(get("/api/v1/purchase-orders/" + poId).cookie(fx.cookie()))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    mockMvc
        .perform(get("/api/v1/purchase-orders").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(0)));

    Tenant other = persistTenant("other-po", "Other PO");
    persistPlan(other.getId(), PlanCode.FREE);
    persistUser(other.getId(), "owner@other-po.local", AppUserRole.pharmacy_owner);
    Location otherBranch = persistBranch(other.getId(), "Other", "BR01", true);
    Cookie otherCookie = login("owner@other-po.local");
    selectBranch(otherCookie, otherBranch.getId());
    mockMvc
        .perform(get("/api/v1/purchase-orders/" + poId).cookie(otherCookie))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));

    selectBranch(fx.cookie(), fx.branchId());
    UUID inactiveSupplier = createSupplier(fx.cookie(), "SUP-OFF", "29BBBBB1234B1Z5");
    mockMvc
        .perform(
            patch("/api/v1/suppliers/" + inactiveSupplier)
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    supplierJson("SUP-OFF", "29BBBBB1234B1Z5")
                        .replace("\"ACTIVE\"", "\"INACTIVE\"")))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            post("/api/v1/purchase-orders")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(createJson(inactiveSupplier, productId, "1", 10000, "po-off")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("SUPPLIER_INACTIVE"));

    UUID deadProduct = createProduct(fx.cookie(), "DEAD-1", "Discontinued Pack");
    mockMvc
        .perform(
            patch("/api/v1/products/" + deadProduct)
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    productJson(
                        "DEAD-1", "Discontinued Pack", categoryId(fx.cookie(), "dead cat"), false)))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            post("/api/v1/purchase-orders")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(createJson(supplierId, deadProduct, "1", 10000, "po-dead")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("PRODUCT_INACTIVE"));

    assertThat(
            purchaseOrderRepository.findAll().stream()
                .filter(row -> row.getTenantId().equals(fx.tenantId()))
                .toList())
        .allSatisfy(
            row -> {
              assertThat(row.getTenantId()).isEqualTo(fx.tenantId());
              assertThat(row.getBranchId()).isIn(fx.branchId(), annex.getId());
            });
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
    Tenant tenant = persistTenant(tag, "PO " + tag);
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

  private static String patchJson(
      UUID supplierId, UUID productId, String qty, long rate, int expectedVersion) {
    String supplier = supplierId == null ? "" : "\"supplierId\":\"" + supplierId + "\",";
    return """
        {
          %s
          "expectedVersion":%d,
          "expectedDeliveryDate":"2026-09-22",
          "paymentTerms":"CREDIT",
          "notes":"Revised indent",
          "lines":[{"productId":"%s","quantity":%s,"unitRatePaise":%d}]
        }
        """
        .formatted(supplier, expectedVersion, productId, qty, rate);
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
}
