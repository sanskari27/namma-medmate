package com.nammamedmate.server.feature.purchaseorder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
import com.nammamedmate.server.domain.PurchaseOrder;
import com.nammamedmate.server.domain.PurchaseOrderStatus;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.PurchaseOrderLineRepository;
import com.nammamedmate.server.persistence.PurchaseOrderReorderRunRepository;
import com.nammamedmate.server.persistence.PurchaseOrderRepository;
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

class ReorderToDraftTest extends AbstractIntegrationTest {

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
  @Autowired private PurchaseOrderReorderRunRepository reorderRunRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @Test
  void ac01_fromReorderCreatesDraftsOnly() throws Exception {
    Fixture fx = seed("r1", PlanCode.GROWTH);
    UUID categoryId = createCategory(fx.cookie(), "Tablets");
    UUID productId =
        createLowProduct(fx.cookie(), "PARA-500", "Paracetamol 500", categoryId, "recv-r1");
    createSupplier(fx.cookie(), "SUP-A", categoryId);

    JsonNode preview = preview(fx.cookie());
    assertThat(preview.path("drafts").size()).isEqualTo(1);
    assertThat(preview.path("drafts").get(0).path("status").asText()).isEqualTo("DRAFT");
    assertThat(preview.path("drafts").get(0).path("id").isNull()).isTrue();

    JsonNode created = fromReorder(fx.cookie(), "key-r1", preview.path("fingerprint").asText());
    assertThat(created.path("drafts").size()).isEqualTo(1);
    assertThat(created.path("drafts").get(0).path("status").asText()).isEqualTo("DRAFT");
    assertThat(created.path("drafts").get(0).path("notes").asText())
        .isEqualTo("Draft from outlet reorder");
    UUID poId = UUID.fromString(created.path("drafts").get(0).path("id").asText());
    PurchaseOrder stored = purchaseOrderRepository.findById(poId).orElseThrow();
    assertThat(stored.getStatus()).isEqualTo(PurchaseOrderStatus.DRAFT);
    assertThat(stored.getTenantId()).isEqualTo(fx.tenantId());
    assertThat(stored.getBranchId()).isEqualTo(fx.branchId());
    assertThat(purchaseOrderLineRepository.findAll())
        .anyMatch(line -> line.getProductId().equals(productId));
  }

  @Test
  void ac02_linesSplitIntoOneDraftPerSupplier() throws Exception {
    Fixture fx = seed("r2", PlanCode.GROWTH);
    UUID catA = createCategory(fx.cookie(), "Fever");
    UUID catB = createCategory(fx.cookie(), "Cough");
    createLowProduct(fx.cookie(), "PARA-500", "Paracetamol 500", catA, "recv-r2a");
    createLowProduct(fx.cookie(), "COUGH-1", "Cough syrup", catB, "recv-r2b");
    UUID supplierA = createSupplier(fx.cookie(), "SUP-A", catA);
    UUID supplierB = createSupplier(fx.cookie(), "SUP-B", catB);

    JsonNode created =
        fromReorder(fx.cookie(), "key-r2", preview(fx.cookie()).path("fingerprint").asText());
    assertThat(created.path("drafts").size()).isEqualTo(2);
    List<String> suppliers =
        List.of(
            created.path("drafts").get(0).path("supplierId").asText(),
            created.path("drafts").get(1).path("supplierId").asText());
    assertThat(suppliers).containsExactlyInAnyOrder(supplierA.toString(), supplierB.toString());
    assertThat(created.path("drafts").get(0).path("lines").size()).isEqualTo(1);
    assertThat(created.path("drafts").get(1).path("lines").size()).isEqualTo(1);
  }

  @Test
  void ac03_unmappedReportedWithoutCorruptingValidDrafts() throws Exception {
    Fixture fx = seed("r3", PlanCode.GROWTH);
    UUID mappedCat = createCategory(fx.cookie(), "Mapped");
    UUID noneCat = createCategory(fx.cookie(), "None");
    UUID ambCat = createCategory(fx.cookie(), "Amb");
    createLowProduct(fx.cookie(), "MAP-1", "Mapped pack", mappedCat, "recv-r3m");
    createLowProduct(fx.cookie(), "NONE-1", "Orphan pack", noneCat, "recv-r3n");
    createLowProduct(fx.cookie(), "AMB-1", "Ambiguous pack", ambCat, "recv-r3a");
    UUID mappedSupplier = createSupplier(fx.cookie(), "SUP-MAP", mappedCat);
    createSupplier(fx.cookie(), "SUP-AMB1", ambCat);
    createSupplier(fx.cookie(), "SUP-AMB2", ambCat);

    JsonNode created =
        fromReorder(fx.cookie(), "key-r3", preview(fx.cookie()).path("fingerprint").asText());
    assertThat(created.path("drafts").size()).isEqualTo(1);
    assertThat(created.path("drafts").get(0).path("supplierId").asText())
        .isEqualTo(mappedSupplier.toString());
    assertThat(created.path("unmapped").size()).isEqualTo(2);
    List<String> reasons =
        List.of(
            created.path("unmapped").get(0).path("reason").asText(),
            created.path("unmapped").get(1).path("reason").asText());
    assertThat(reasons).containsExactlyInAnyOrder("UNMAPPED", "AMBIGUOUS");
    assertThat(
            purchaseOrderRepository.findAll().stream()
                .filter(row -> row.getTenantId().equals(fx.tenantId()))
                .count())
        .isEqualTo(1);
  }

  @Test
  void ac04_freeAndStarterRemainManualPoOnly() throws Exception {
    Fixture free = seed("r4f", PlanCode.FREE);
    UUID cat = createCategory(free.cookie(), "Free cat");
    UUID product = createLowProduct(free.cookie(), "FREE-1", "Free pack", cat, "recv-r4f");
    UUID supplier = createSupplier(free.cookie(), "SUP-F", cat);

    mockMvc
        .perform(get("/api/v1/purchase-orders/reorder-preview").cookie(free.cookie()))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("PLAN_LIMIT"));
    mockMvc
        .perform(
            post("/api/v1/purchase-orders/from-reorder")
                .cookie(free.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"idempotencyKey\":\"k-free\",\"fingerprint\":\"abc\"}"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("PLAN_LIMIT"));
    assertThat(purchaseOrderRepository.findAll()).isEmpty();

    mockMvc
        .perform(
            post("/api/v1/purchase-orders")
                .cookie(free.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(manualPo(supplier, product, "manual-free")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("DRAFT"));

    Fixture starter = seed("r4s", PlanCode.STARTER);
    UUID starterCat = createCategory(starter.cookie(), "Starter cat");
    createLowProduct(starter.cookie(), "STA-1", "Starter pack", starterCat, "recv-r4s");
    createSupplier(starter.cookie(), "SUP-S", starterCat);
    mockMvc
        .perform(get("/api/v1/purchase-orders/reorder-preview").cookie(starter.cookie()))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("PLAN_LIMIT"));
    mockMvc
        .perform(
            post("/api/v1/purchase-orders/from-reorder")
                .cookie(starter.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"idempotencyKey\":\"k-starter\",\"fingerprint\":\"abc\"}"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("PLAN_LIMIT"));
  }

  @Test
  void ac05_proPermitsBulkIssueAndSpendAnalytics() throws Exception {
    Fixture growth = seed("r5g", PlanCode.GROWTH);
    mockMvc
        .perform(get("/api/v1/purchase-orders/analytics").cookie(growth.cookie()))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("PLAN_LIMIT"));
    mockMvc
        .perform(
            post("/api/v1/purchase-orders/bulk")
                .cookie(growth.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"action\":\"ISSUE\",\"items\":[{\"id\":\""
                        + UUID.randomUUID()
                        + "\",\"expectedVersion\":1}]}"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("PLAN_LIMIT"));

    Fixture pro = seed("r5p", PlanCode.PRO);
    UUID cat = createCategory(pro.cookie(), "Pro cat");
    createLowProduct(pro.cookie(), "PRO-1", "Pro pack", cat, "recv-r5p");
    createSupplier(pro.cookie(), "SUP-P", cat);
    JsonNode created =
        fromReorder(pro.cookie(), "key-r5", preview(pro.cookie()).path("fingerprint").asText());
    String poId = created.path("drafts").get(0).path("id").asText();
    int version = created.path("drafts").get(0).path("version").asInt();

    mockMvc
        .perform(
            post("/api/v1/purchase-orders/bulk")
                .cookie(pro.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"action\":\"ISSUE\",\"items\":[{\"id\":\""
                        + poId
                        + "\",\"expectedVersion\":"
                        + version
                        + "}]}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(1)))
        .andExpect(jsonPath("$.data.items[0].status").value("ISSUED"));

    mockMvc
        .perform(get("/api/v1/purchase-orders/" + poId).cookie(pro.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("ISSUED"))
        .andExpect(
            jsonPath("$.data.totalPaise")
                .value(created.path("drafts").get(0).path("totalPaise").asLong()));

    mockMvc
        .perform(get("/api/v1/purchase-orders/analytics").cookie(pro.cookie()))
        .andExpect(status().isOk())
        .andExpect(
            jsonPath("$.data.totalSpendPaise")
                .value(created.path("drafts").get(0).path("totalPaise").asLong()))
        .andExpect(jsonPath("$.data.suppliers", hasSize(1)))
        .andExpect(jsonPath("$.data.suppliers[0].orderCount").value(1));

    JsonNode extra =
        fromReorder(
            pro.cookie(), "key-r5-cancel", preview(pro.cookie()).path("fingerprint").asText());
    String cancelId = extra.path("drafts").get(0).path("id").asText();
    int cancelVersion = extra.path("drafts").get(0).path("version").asInt();
    mockMvc
        .perform(
            post("/api/v1/purchase-orders/bulk")
                .cookie(pro.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"action\":\"CANCEL\",\"items\":[{\"id\":\""
                        + cancelId
                        + "\",\"expectedVersion\":"
                        + cancelVersion
                        + "}]}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items[0].status").value("CANCELLED"));
  }

  @Test
  void ac06_replayStaleIsolationAndAuth() throws Exception {
    Fixture empty = seed("r6e", PlanCode.GROWTH);
    mockMvc
        .perform(get("/api/v1/purchase-orders/reorder-preview").cookie(empty.cookie()))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("REORDER_EMPTY"));
    mockMvc
        .perform(
            post("/api/v1/purchase-orders/from-reorder")
                .cookie(empty.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"idempotencyKey\":\"empty-r6\",\"fingerprint\":\"deadbeef\"}"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("REORDER_EMPTY"));

    Fixture fx = seed("r6", PlanCode.GROWTH);
    UUID cat = createCategory(fx.cookie(), "Iso");
    createLowProduct(fx.cookie(), "ISO-1", "Iso pack", cat, "recv-r6");
    createSupplier(fx.cookie(), "SUP-I", cat);
    String fingerprint = preview(fx.cookie()).path("fingerprint").asText();

    JsonNode first = fromReorder(fx.cookie(), "replay-r6", fingerprint);
    String draftId = first.path("drafts").get(0).path("id").asText();
    JsonNode replay = fromReorder(fx.cookie(), "replay-r6", fingerprint);
    assertThat(replay.path("drafts").get(0).path("id").asText()).isEqualTo(draftId);
    assertThat(
            purchaseOrderRepository.findAll().stream()
                .filter(row -> row.getTenantId().equals(fx.tenantId()))
                .count())
        .isEqualTo(1);

    mockMvc
        .perform(
            post("/api/v1/purchase-orders/from-reorder")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"idempotencyKey\":\"stale-r6\",\"fingerprint\":\"deadbeef\"}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("STALE_STATE"));
    assertThat(
            purchaseOrderRepository.findAll().stream()
                .filter(row -> row.getTenantId().equals(fx.tenantId()))
                .count())
        .isEqualTo(1);

    Location annex = persistBranch(fx.tenantId(), "Annex", "BR02", false);
    selectBranch(fx.cookie(), annex.getId());
    mockMvc
        .perform(get("/api/v1/purchase-orders/" + draftId).cookie(fx.cookie()))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    JsonNode annexPreview = preview(fx.cookie());
    assertThat(annexPreview.path("drafts")).isNotEmpty();
    for (JsonNode draft : annexPreview.path("drafts")) {
      assertThat(draft.path("id").isNull()).isTrue();
      assertThat(draft.path("branchId").asText()).isEqualTo(annex.getId().toString());
    }
    mockMvc
        .perform(
            post("/api/v1/purchase-orders/from-reorder")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"idempotencyKey\":\"replay-r6\",\"fingerprint\":\"" + fingerprint + "\"}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("STALE_STATE"));
    assertThat(
            reorderRunRepository.findAll().stream()
                .filter(row -> row.getTenantId().equals(fx.tenantId()))
                .filter(row -> row.getBranchId().equals(fx.branchId()))
                .toList())
        .hasSize(1)
        .allMatch(row -> row.getDraftIds().contains(draftId));
    assertThat(
            purchaseOrderRepository.findAll().stream()
                .filter(row -> row.getTenantId().equals(fx.tenantId()))
                .filter(row -> row.getBranchId().equals(fx.branchId()))
                .count())
        .isEqualTo(1);
    assertThat(
            purchaseOrderRepository.findAll().stream()
                .filter(row -> row.getTenantId().equals(fx.tenantId()))
                .filter(row -> row.getBranchId().equals(annex.getId()))
                .count())
        .isEqualTo(0);

    selectBranch(fx.cookie(), fx.branchId());
    JsonNode afterAnnex = fromReorder(fx.cookie(), "replay-r6", fingerprint);
    assertThat(afterAnnex.path("drafts").get(0).path("id").asText()).isEqualTo(draftId);

    Fixture other = seed("r6b", PlanCode.GROWTH);
    mockMvc
        .perform(get("/api/v1/purchase-orders/" + draftId).cookie(other.cookie()))
        .andExpect(status().isNotFound());

    mockMvc
        .perform(get("/api/v1/purchase-orders/reorder-preview"))
        .andExpect(status().isUnauthorized());

    AppUser sales = persistUser(fx.tenantId(), "sales@r6.local", AppUserRole.pharmacy_staff);
    UUID salesRole = createRole(fx.cookie(), "Till", "[\"SALES\"]");
    mockMvc
        .perform(
            org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(
                    "/api/v1/users/" + sales.getId() + "/roles")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleIds\":[\"" + salesRole + "\"]}"))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(
                    "/api/v1/users/" + sales.getId() + "/branches")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchIds\":[\"" + fx.branchId() + "\"]}"))
        .andExpect(status().isOk());
    Cookie salesCookie = login("sales@r6.local");
    selectBranch(salesCookie, fx.branchId());
    mockMvc
        .perform(get("/api/v1/purchase-orders/reorder-preview").cookie(salesCookie))
        .andExpect(status().isForbidden());
  }

  private JsonNode preview(Cookie cookie) throws Exception {
    String body =
        mockMvc
            .perform(get("/api/v1/purchase-orders/reorder-preview").cookie(cookie))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return objectMapper.readTree(body).path("data");
  }

  private JsonNode fromReorder(Cookie cookie, String key, String fingerprint) throws Exception {
    String body =
        mockMvc
            .perform(
                post("/api/v1/purchase-orders/from-reorder")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        "{\"idempotencyKey\":\""
                            + key
                            + "\",\"fingerprint\":\""
                            + fingerprint
                            + "\"}"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return objectMapper.readTree(body).path("data");
  }

  private UUID createLowProduct(
      Cookie cookie, String sku, String name, UUID categoryId, String recvKey) throws Exception {
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
    UUID productId = UUID.fromString(objectMapper.readTree(body).path("data").path("id").asText());
    mockMvc
        .perform(
            post("/api/v1/inventory/receipts")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"productId\":\"%s\",\"batchNumber\":\"LOT-%s\",\"manufacturedOn\":\"2026-01-01\",\"expiresOn\":\"2027-06-30\",\"purchasePricePaise\":1000,\"quantity\":2,\"idempotencyKey\":\"%s\",\"expectedVersion\":0}"
                        .formatted(productId, sku, recvKey)))
        .andExpect(status().isOk());
    return productId;
  }

  private UUID createCategory(Cookie cookie, String name) throws Exception {
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

  private UUID createSupplier(Cookie cookie, String code, UUID categoryId) throws Exception {
    String body =
        mockMvc
            .perform(
                post("/api/v1/suppliers")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(supplierJson(code, categoryId)))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return UUID.fromString(objectMapper.readTree(body).path("data").path("id").asText());
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

  private void selectBranch(Cookie cookie, UUID branchId) throws Exception {
    mockMvc
        .perform(
            post("/api/v1/session/branch")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchId\":\"" + branchId + "\"}"))
        .andExpect(status().isOk());
  }

  private Fixture seed(String tag, PlanCode plan) throws Exception {
    Tenant tenant = persistTenant(tag, "Reorder " + tag);
    persistPlan(tenant.getId(), plan);
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

  private static String manualPo(UUID supplierId, UUID productId, String key) {
    return """
        {
          "supplierId":"%s",
          "paymentTerms":"CREDIT",
          "idempotencyKey":"%s",
          "lines":[{"productId":"%s","quantity":4,"unitRatePaise":1000}]
        }
        """
        .formatted(supplierId, key, productId);
  }

  private static String supplierJson(String code, UUID categoryId) {
    return """
        {
          "supplierCode":"%s",
          "legalName":"Acme Pharma Pvt Ltd",
          "supplierType":"DISTRIBUTOR",
          "contactPersonName":"Ramesh Rao",
          "phone":"9876500001",
          "addressLine1":"12 MG Road",
          "city":"Bengaluru",
          "state":"KA",
          "pincode":"560001",
          "country":"India",
          "paymentTerms":"COD",
          "categoryIds":["%s"],
          "status":"ACTIVE"
        }
        """
        .formatted(code, categoryId);
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
          "reorderLevel":10,
          "reorderQuantity":40,
          "minimumStock":2,
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
}
