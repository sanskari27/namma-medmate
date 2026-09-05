package com.nammamedmate.server.feature.sales;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.matchesPattern;
import static org.hamcrest.Matchers.nullValue;
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
import com.nammamedmate.server.domain.SalesInvoice;
import com.nammamedmate.server.domain.SalesInvoiceLine;
import com.nammamedmate.server.domain.SalesInvoiceStatus;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.domain.UserSession;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.AuditEventRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.SalesInvoiceLineRepository;
import com.nammamedmate.server.persistence.SalesInvoiceRepository;
import com.nammamedmate.server.persistence.SalesInvoiceSequenceRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import com.nammamedmate.server.persistence.UserSessionRepository;
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

class SalesInvoiceTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-04T06:00:00Z");

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private SalesInvoiceRepository salesInvoiceRepository;
  @Autowired private SalesInvoiceLineRepository salesInvoiceLineRepository;
  @Autowired private SalesInvoiceSequenceRepository salesInvoiceSequenceRepository;
  @Autowired private UserSessionRepository userSessionRepository;
  @Autowired private AuditEventRepository auditEventRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @Test
  void ac01_numberingIsFinancialYearAndBranchSequential() throws Exception {
    Fixture fx = seed("inv-num");
    Stocked product = stocked(fx, "PARA-500", "Paracetamol 500", false);

    MvcResult first =
        mockMvc
            .perform(
                post("/api/v1/sales/invoices")
                    .cookie(fx.cookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(createJson(null, product, "1", "inv-a")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(
                jsonPath("$.data.invoiceNumber", matchesPattern("INV/\\d{4}-\\d{2}/BR01/00001")))
            .andExpect(jsonPath("$.data.status").value("DRAFT"))
            .andReturn();

    mockMvc
        .perform(
            post("/api/v1/sales/invoices")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(createJson(null, product, "1", "inv-b")))
        .andExpect(status().isOk())
        .andExpect(
            jsonPath("$.data.invoiceNumber", matchesPattern("INV/\\d{4}-\\d{2}/BR01/00002")));

    SalesInvoice stored = salesInvoiceRepository.findById(idOf(first)).orElseThrow();
    assertThat(stored.getTenantId()).isEqualTo(fx.tenantId());
    assertThat(stored.getBranchId()).isEqualTo(fx.branchId());
    assertThat(stored.getInvoiceNumber()).matches("INV/\\d{4}-\\d{2}/BR01/00001");
  }

  @Test
  void ac02_walkInIsAllowedAndCustomerIsOptional() throws Exception {
    Fixture fx = seed("inv-walk");
    Stocked product = stocked(fx, "OTC-1", "ORS Sachet", false);

    mockMvc
        .perform(
            post("/api/v1/sales/invoices")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(createJson(null, product, "2", "walk-1")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.customerId").value(nullValue()))
        .andExpect(jsonPath("$.data.status").value("DRAFT"));

    UUID customerId = createCustomer(fx.cookie(), "Ravi Kumar", "9876500001");
    mockMvc
        .perform(
            post("/api/v1/sales/invoices")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(createJson(customerId, product, "1", "walk-2")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.customerId").value(customerId.toString()));
  }

  @Test
  void ac03_lineSnapshotsProductBatchExpiryQtyUomMrpPriceDiscountHsnGstAndTotals()
      throws Exception {
    Fixture fx = seed("inv-snap");
    Stocked product = stocked(fx, "CROCIN", "Crocin Advance", false);

    mockMvc
        .perform(
            post("/api/v1/sales/invoices")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(createJson(null, product, "10", "snap-1", 12000, 10000, 0)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.lines", hasSize(1)))
        .andExpect(jsonPath("$.data.lines[0].productId").value(product.productId().toString()))
        .andExpect(jsonPath("$.data.lines[0].productName").value("Crocin Advance"))
        .andExpect(jsonPath("$.data.lines[0].sku").value("CROCIN"))
        .andExpect(jsonPath("$.data.lines[0].batchId").value(product.batchId().toString()))
        .andExpect(jsonPath("$.data.lines[0].batchNumber").value("LOT-AA"))
        .andExpect(jsonPath("$.data.lines[0].expiresOn").value("2027-06-30"))
        .andExpect(jsonPath("$.data.lines[0].quantity").value(10))
        .andExpect(jsonPath("$.data.lines[0].unit").value("Tablet"))
        .andExpect(jsonPath("$.data.lines[0].mrpPaise").value(12000))
        .andExpect(jsonPath("$.data.lines[0].sellingPricePaise").value(10000))
        .andExpect(jsonPath("$.data.lines[0].discountPaise").value(0))
        .andExpect(jsonPath("$.data.lines[0].hsnCode").value("30049099"))
        .andExpect(jsonPath("$.data.lines[0].gstRate").value(12))
        .andExpect(jsonPath("$.data.lines[0].cgstPaise").value(6000))
        .andExpect(jsonPath("$.data.lines[0].sgstPaise").value(6000))
        .andExpect(jsonPath("$.data.lines[0].igstPaise").value(0))
        .andExpect(jsonPath("$.data.lines[0].lineTaxablePaise").value(100000))
        .andExpect(jsonPath("$.data.lines[0].lineTaxPaise").value(12000))
        .andExpect(jsonPath("$.data.lines[0].lineTotalPaise").value(112000))
        .andExpect(jsonPath("$.data.subtotalPaise").value(100000))
        .andExpect(jsonPath("$.data.taxPaise").value(12000))
        .andExpect(jsonPath("$.data.totalPaise").value(112000));
  }

  @Test
  void ac04_invoiceRetainsStaffBranchTerminalStatusTimestampsAndOptionalRefs() throws Exception {
    Fixture fx = seed("inv-head");
    Stocked product = stocked(fx, "CETIR", "Cetirizine", false);
    UUID customerId = createCustomer(fx.cookie(), "Meera Nair", "9876500002");
    UUID doctorId = createDoctor(fx.cookie());

    MvcResult created =
        mockMvc
            .perform(
                post("/api/v1/sales/invoices")
                    .cookie(fx.cookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        createJson(
                            customerId,
                            doctorId,
                            "RX-1",
                            true,
                            product,
                            "1",
                            "head-1",
                            5000,
                            5000,
                            0)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.branchId").value(fx.branchId().toString()))
            .andExpect(jsonPath("$.data.staffUserId").value(fx.userId().toString()))
            .andExpect(jsonPath("$.data.status").value("DRAFT"))
            .andExpect(jsonPath("$.data.customerId").value(customerId.toString()))
            .andExpect(jsonPath("$.data.doctorId").value(doctorId.toString()))
            .andExpect(jsonPath("$.data.prescriptionReference").value("RX-1"))
            .andExpect(jsonPath("$.data.prescriptionVerified").value(true))
            .andExpect(jsonPath("$.data.createdAt").exists())
            .andExpect(jsonPath("$.data.updatedAt").exists())
            .andReturn();

    UUID invoiceId = idOf(created);
    UUID terminalId =
        UUID.fromString(
            objectMapper
                .readTree(created.getResponse().getContentAsString())
                .path("data")
                .path("terminalId")
                .asText());
    UserSession session =
        userSessionRepository.findAll().stream()
            .filter(row -> row.getUserId().equals(fx.userId()) && row.getRevokedAt() == null)
            .findFirst()
            .orElseThrow();
    assertThat(terminalId).isEqualTo(session.getId());

    SalesInvoice stored = salesInvoiceRepository.findById(invoiceId).orElseThrow();
    assertThat(stored.getStaffUserId()).isEqualTo(fx.userId());
    assertThat(stored.getTerminalId()).isEqualTo(session.getId());
    assertThat(stored.getStatus()).isEqualTo(SalesInvoiceStatus.DRAFT);
    assertThat(stored.getCreatedAt()).isNotNull();
    assertThat(auditEventRepository.findAll())
        .extracting(AuditEvent::getAction)
        .contains("SALES_INVOICE_DRAFT");
  }

  @Test
  void ac05_isolationAuthzCollisionStaleStockInvalidUomForeignBatchAndControlledFail()
      throws Exception {
    Fixture fx = seed("inv-iso");
    Location annex = persistBranch(fx.tenantId(), "Annex", "BR02", false);
    Stocked product = stocked(fx, "ISO-SKU", "Isolation Pack", false);
    Stocked controlled = stocked(fx, "H1-SKU", "Schedule Pack", true);

    mockMvc.perform(get("/api/v1/sales/invoices")).andExpect(status().isUnauthorized());

    mockMvc
        .perform(
            post("/api/v1/sales/invoices")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

    mockMvc
        .perform(
            post("/api/v1/sales/invoices")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(createJson(null, product, "11", "too-many")))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("STALE_STOCK"));

    mockMvc
        .perform(
            post("/api/v1/sales/invoices")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    createJson(null, product, "1", "uom-bad").replace("\"Tablet\"", "\"bottle\"")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("INVALID_UOM"));

    mockMvc
        .perform(
            post("/api/v1/sales/invoices")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(createJson(null, controlled, "1", "ctrl-walk")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("INCOMPLETE_CONTROLLED"));

    UUID invoiceId =
        idOf(
            mockMvc
                .perform(
                    post("/api/v1/sales/invoices")
                        .cookie(fx.cookie())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createJson(null, product, "1", "iso-ok")))
                .andExpect(status().isOk())
                .andReturn());

    mockMvc
        .perform(
            patch("/api/v1/sales/invoices/" + invoiceId)
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(patchJson(product, "1", 1)))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            patch("/api/v1/sales/invoices/" + invoiceId)
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(patchJson(product, "1", 1)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("STALE_STATE"));

    mockMvc
        .perform(
            post("/api/v1/sales/invoices")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(createJson(null, product, "1", "iso-ok")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.id").value(invoiceId.toString()));

    selectBranch(fx.cookie(), annex.getId());
    mockMvc
        .perform(get("/api/v1/sales/invoices/" + invoiceId).cookie(fx.cookie()))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    mockMvc
        .perform(
            post("/api/v1/sales/invoices")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(createJson(null, product, "1", "foreign-batch")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("FOREIGN_BATCH"));

    Tenant other = persistTenant("other-inv", "Other Inv");
    persistPlan(other.getId(), PlanCode.FREE);
    persistUser(other.getId(), "owner@other-inv.local", AppUserRole.pharmacy_owner);
    Location otherBranch = persistBranch(other.getId(), "Other", "BR01", true);
    Cookie otherCookie = login("owner@other-inv.local");
    selectBranch(otherCookie, otherBranch.getId());
    mockMvc
        .perform(get("/api/v1/sales/invoices/" + invoiceId).cookie(otherCookie))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));

    selectBranch(fx.cookie(), fx.branchId());
    AppUser inventory =
        persistUser(fx.tenantId(), "stock@inv-iso.local", AppUserRole.pharmacy_staff);
    UUID invRole = createRole(fx.cookie(), "Stock desk", "[\"INVENTORY\"]");
    mockMvc.perform(putRoles(inventory.getId(), fx.cookie(), invRole)).andExpect(status().isOk());
    assignBranch(inventory.getId(), fx.cookie(), fx.branchId());
    Cookie invCookie = login("stock@inv-iso.local");
    selectBranch(invCookie, fx.branchId());
    mockMvc
        .perform(
            post("/api/v1/sales/invoices")
                .cookie(invCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(createJson(null, product, "1", "inv-denied")))
        .andExpect(status().isForbidden());

    AppUser cashier = persistUser(fx.tenantId(), "till@inv-iso.local", AppUserRole.pharmacy_staff);
    UUID salesRole = createRole(fx.cookie(), "Till desk", "[\"SALES\"]");
    mockMvc.perform(putRoles(cashier.getId(), fx.cookie(), salesRole)).andExpect(status().isOk());
    assignBranch(cashier.getId(), fx.cookie(), fx.branchId());
    Cookie tillCookie = login("till@inv-iso.local");
    selectBranch(tillCookie, fx.branchId());
    mockMvc
        .perform(
            post("/api/v1/sales/invoices")
                .cookie(tillCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(createJson(null, product, "1", "till-ok")))
        .andExpect(status().isOk());

    SalesInvoice colliding = new SalesInvoice();
    colliding.setId(UUID.randomUUID());
    colliding.setTenantId(fx.tenantId());
    colliding.setBranchId(fx.branchId());
    colliding.setInvoiceNumber("INV/2026-27/BR01/00099");
    colliding.setStatus(SalesInvoiceStatus.DRAFT);
    colliding.setStaffUserId(fx.userId());
    colliding.setTerminalId(UUID.randomUUID());
    colliding.setSubtotalPaise(0);
    colliding.setDiscountPaise(0);
    colliding.setTaxPaise(0);
    colliding.setTotalPaise(0);
    colliding.setIdempotencyKey("collide-seed");
    colliding.setVersion(1);
    colliding.setCreatedAt(T0);
    colliding.setUpdatedAt(T0);
    salesInvoiceRepository.saveAndFlush(colliding);
    var seq =
        salesInvoiceSequenceRepository
            .findByTenantIdAndBranchIdAndFinancialYear(fx.tenantId(), fx.branchId(), "2026-27")
            .orElseThrow();
    seq.setNextValue(99);
    salesInvoiceSequenceRepository.saveAndFlush(seq);
    mockMvc
        .perform(
            post("/api/v1/sales/invoices")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(createJson(null, product, "1", "collide")))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("NUMBER_COLLISION"));

    assertThat(
            salesInvoiceRepository.findAll().stream()
                .filter(row -> row.getTenantId().equals(fx.tenantId()))
                .toList())
        .allSatisfy(
            row -> {
              assertThat(row.getTenantId()).isEqualTo(fx.tenantId());
              assertThat(row.getBranchId()).isIn(fx.branchId(), annex.getId());
            });
    List<SalesInvoiceLine> lines =
        salesInvoiceLineRepository.findAllBySalesInvoiceIdAndTenantIdAndBranchIdOrderBySortOrderAsc(
            invoiceId, fx.tenantId(), fx.branchId());
    assertThat(lines).isNotEmpty();
    assertThat(lines.get(0).getTenantId()).isEqualTo(fx.tenantId());
    assertThat(lines.get(0).getBranchId()).isEqualTo(fx.branchId());
  }

  private Stocked stocked(Fixture fx, String sku, String name, boolean controlled)
      throws Exception {
    UUID productId = createProduct(fx.cookie(), sku, name, controlled);
    mockMvc
        .perform(
            post("/api/v1/inventory/receipts")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    receiptJson(
                        productId,
                        "LOT-AA",
                        "2026-01-15",
                        "2027-06-30",
                        12500,
                        "10",
                        sku + "-recv")))
        .andExpect(status().isOk());
    String body =
        mockMvc
            .perform(
                get("/api/v1/inventory/products/" + productId + "/batches").cookie(fx.cookie()))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    UUID batchId =
        UUID.fromString(
            objectMapper.readTree(body).path("data").path("items").get(0).path("batchId").asText());
    return new Stocked(productId, batchId);
  }

  private UUID createProduct(Cookie cookie, String sku, String name, boolean controlled)
      throws Exception {
    UUID categoryId = categoryId(cookie, sku + " cat");
    String body =
        mockMvc
            .perform(
                post("/api/v1/products")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(productJson(sku, name, categoryId, controlled)))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return UUID.fromString(objectMapper.readTree(body).path("data").path("id").asText());
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

  private UUID createCustomer(Cookie cookie, String name, String phone) throws Exception {
    String body =
        mockMvc
            .perform(
                post("/api/v1/customers")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        "{\"name\":\"%s\",\"phone\":\"%s\",\"email\":null,\"dateOfBirth\":null,\"gender\":null,\"address\":null,\"bloodGroup\":null,\"allergies\":null,\"chronicConditions\":null}"
                            .formatted(name, phone)))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return UUID.fromString(objectMapper.readTree(body).path("data").path("id").asText());
  }

  private UUID createDoctor(Cookie cookie) throws Exception {
    String body =
        mockMvc
            .perform(
                post("/api/v1/doctors")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        "{\"name\":\"Dr. Mehta\",\"registrationNumber\":\"KA-12345\",\"phone\":\"9888000001\",\"notes\":null}"))
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
    Tenant tenant = persistTenant(tag, "Inv " + tag);
    persistPlan(tenant.getId(), PlanCode.FREE);
    AppUser owner =
        persistUser(tenant.getId(), "owner@" + tag + ".local", AppUserRole.pharmacy_owner);
    Location branch = persistBranch(tenant.getId(), "Main", "BR01", true);
    Cookie cookie = login("owner@" + tag + ".local");
    selectBranch(cookie, branch.getId());
    return new Fixture(tenant.getId(), branch.getId(), owner.getId(), cookie);
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
    branch.setPricingSettings(Map.of("defaultMarkupBps", 0));
    branch.setTaxSettings(Map.of("gstMode", "CGST_SGST", "taxState", "KA"));
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

  private static String createJson(UUID customerId, Stocked product, String qty, String key) {
    return createJson(customerId, product, qty, key, 12000, 10000, 0);
  }

  private static String createJson(
      UUID customerId,
      Stocked product,
      String qty,
      String key,
      long mrp,
      long selling,
      long discount) {
    return createJson(customerId, null, null, false, product, qty, key, mrp, selling, discount);
  }

  private static String createJson(
      UUID customerId,
      UUID doctorId,
      String prescriptionReference,
      boolean prescriptionVerified,
      Stocked product,
      String qty,
      String key,
      long mrp,
      long selling,
      long discount) {
    String customer = customerId == null ? "null" : "\"" + customerId + "\"";
    String doctor = doctorId == null ? "null" : "\"" + doctorId + "\"";
    String rx = prescriptionReference == null ? "null" : "\"" + prescriptionReference + "\"";
    return """
        {
          "customerId":%s,
          "doctorId":%s,
          "prescriptionReference":%s,
          "prescriptionVerified":%s,
          "idempotencyKey":"%s",
          "lines":[{
            "productId":"%s",
            "batchId":"%s",
            "quantity":%s,
            "unit":"Tablet",
            "mrpPaise":%d,
            "sellingPricePaise":%d,
            "discountPaise":%d
          }]
        }
        """
        .formatted(
            customer,
            doctor,
            rx,
            prescriptionVerified,
            key,
            product.productId(),
            product.batchId(),
            qty,
            mrp,
            selling,
            discount);
  }

  private static String patchJson(Stocked product, String qty, int expectedVersion) {
    return """
        {
          "expectedVersion":%d,
          "customerId":null,
          "doctorId":null,
          "prescriptionReference":null,
          "prescriptionVerified":false,
          "lines":[{
            "productId":"%s",
            "batchId":"%s",
            "quantity":%s,
            "unit":"Tablet",
            "mrpPaise":12000,
            "sellingPricePaise":10000,
            "discountPaise":0
          }]
        }
        """
        .formatted(expectedVersion, product.productId(), product.batchId(), qty);
  }

  private static String receiptJson(
      UUID productId,
      String batchNumber,
      String manufacturedOn,
      String expiresOn,
      long pricePaise,
      String quantity,
      String key) {
    return """
        {"productId":"%s","batchNumber":"%s","manufacturedOn":"%s","expiresOn":"%s","purchasePricePaise":%d,"quantity":%s,"idempotencyKey":"%s","expectedVersion":0}
        """
        .formatted(productId, batchNumber, manufacturedOn, expiresOn, pricePaise, quantity, key);
  }

  private static String productJson(String sku, String name, UUID categoryId, boolean controlled) {
    String schedule = controlled ? "\"H1\"" : "null";
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
          "prescriptionRequired":%s,
          "scheduleClassification":%s,
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
          "controlledSubstance":%s,
          "notes":null,
          "isActive":true
        }
        """
        .formatted(sku, name, categoryId, controlled, schedule, controlled);
  }

  private record Fixture(UUID tenantId, UUID branchId, UUID userId, Cookie cookie) {}

  private record Stocked(UUID productId, UUID batchId) {}
}
