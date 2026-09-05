package com.nammamedmate.server.feature.sales;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.AbstractIntegrationTest;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.AuditEvent;
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.BranchType;
import com.nammamedmate.server.domain.DiscountApprovalStatus;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.SalesInvoice;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.ApprovalRequestRepository;
import com.nammamedmate.server.persistence.AuditEventRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.SalesInvoiceRepository;
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

class SalesInvoicePricingTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-04T06:00:00Z");

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private SalesInvoiceRepository salesInvoiceRepository;
  @Autowired private ApprovalRequestRepository approvalRequestRepository;
  @Autowired private AuditEventRepository auditEventRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @Test
  void ac01_lineAndBillPercentOrFlatDiscountAreServerPriced() throws Exception {
    Fixture fx = seed("price-ac01");
    Stocked product = stocked(fx, "DISC-1", "Discount Pack");
    UUID invoiceId = createDraft(fx, product, "price-1");

    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/pricing")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(pricingJson(1, product.productId(), "PERCENT", 1000, "FLAT", 500, null)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.lines[0].discountType").value("PERCENT"))
        .andExpect(jsonPath("$.data.lines[0].discountValue").value(1000))
        .andExpect(jsonPath("$.data.lines[0].discountPaise").value(1500))
        .andExpect(jsonPath("$.data.billDiscountType").value("FLAT"))
        .andExpect(jsonPath("$.data.discountPaise").value(1500))
        .andExpect(jsonPath("$.data.subtotalPaise").value(8500))
        .andExpect(jsonPath("$.data.taxPaise").value(1020))
        .andExpect(jsonPath("$.data.totalPaise").value(9520))
        .andExpect(jsonPath("$.data.discountApprovalStatus").value("NOT_REQUIRED"));
  }

  @Test
  void ac02_thresholdCreatesPendingApprovalAndBlocksAssertReady() throws Exception {
    Fixture fx = seed("price-ac02");
    createDiscountRule(fx.cookie(), 1000, true);
    Stocked product = stocked(fx, "DISC-2", "Sign-off Pack");
    UUID invoiceId = createDraft(fx, product, "price-2");

    MvcResult priced =
        mockMvc
            .perform(
                post("/api/v1/sales/invoices/" + invoiceId + "/pricing")
                    .cookie(fx.cookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(pricingJson(1, product.productId(), "PERCENT", 1500, "NONE", 0, null)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.discountApprovalStatus").value("PENDING"))
            .andExpect(jsonPath("$.data.discountApprovalRequestId").isNotEmpty())
            .andReturn();
    UUID requestId =
        UUID.fromString(
            objectMapper
                .readTree(priced.getResponse().getContentAsString())
                .path("data")
                .path("discountApprovalRequestId")
                .asText());
    int invoiceVersion =
        objectMapper
            .readTree(priced.getResponse().getContentAsString())
            .path("data")
            .path("version")
            .asInt();

    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/pricing/assert-ready")
                .cookie(fx.cookie()))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("APPROVAL_REQUIRED"));

    int requestVersion = approvalRequestRepository.findById(requestId).orElseThrow().getVersion();
    mockMvc
        .perform(
            post("/api/v1/approvals/requests/" + requestId + "/decide")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"outcome\":\"APPROVED\",\"note\":\"till ok\",\"version\":%d}"
                        .formatted(requestVersion)))
        .andExpect(status().isOk());

    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/pricing/assert-ready")
                .cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.discountApprovalStatus").value("APPROVED"));

    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/pricing")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    pricingJson(
                        invoiceVersion + 1, product.productId(), "PERCENT", 500, "NONE", 0, null)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.discountApprovalStatus").value("NOT_REQUIRED"));
  }

  @Test
  void ac02_noRuleDoesNotRequireApproval() throws Exception {
    Fixture fx = seed("price-norule");
    Stocked product = stocked(fx, "DISC-3", "Open Pack");
    UUID invoiceId = createDraft(fx, product, "price-3");
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/pricing")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(pricingJson(1, product.productId(), "PERCENT", 2000, "NONE", 0, null)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.discountApprovalStatus").value("NOT_REQUIRED"));
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/pricing/assert-ready")
                .cookie(fx.cookie()))
        .andExpect(status().isOk());
  }

  @Test
  void ac03_gstUsesProductHsnAndJurisdiction() throws Exception {
    Fixture fx = seed("price-gst");
    Stocked product = stocked(fx, "GST-1", "HSN Pack");
    UUID invoiceId = createDraft(fx, product, "gst-1");

    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/pricing")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    pricingJson(1, product.productId(), "NONE", 0, "NONE", 0, "27AAAAA0000A1Z5")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.taxJurisdiction").value("INTER"))
        .andExpect(jsonPath("$.data.customerGstin").value("27AAAAA0000A1Z5"))
        .andExpect(jsonPath("$.data.lines[0].hsnCode").value("30049099"))
        .andExpect(jsonPath("$.data.lines[0].taxCategory").value("GST-12"))
        .andExpect(jsonPath("$.data.igstPaise").value(1200))
        .andExpect(jsonPath("$.data.cgstPaise").value(0))
        .andExpect(jsonPath("$.data.sgstPaise").value(0))
        .andExpect(jsonPath("$.data.lines[0].igstPaise").value(1200));
  }

  @Test
  void ac02_rejectedDecisionBlocksAssertReady() throws Exception {
    Fixture fx = seed("price-rej");
    createDiscountRule(fx.cookie(), 1000, true);
    Stocked product = stocked(fx, "DISC-R", "Reject Pack");
    UUID invoiceId = createDraft(fx, product, "price-r");

    MvcResult priced =
        mockMvc
            .perform(
                post("/api/v1/sales/invoices/" + invoiceId + "/pricing")
                    .cookie(fx.cookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(pricingJson(1, product.productId(), "PERCENT", 1500, "NONE", 0, null)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.discountApprovalStatus").value("PENDING"))
            .andReturn();
    UUID requestId =
        UUID.fromString(
            objectMapper
                .readTree(priced.getResponse().getContentAsString())
                .path("data")
                .path("discountApprovalRequestId")
                .asText());
    int requestVersion = approvalRequestRepository.findById(requestId).orElseThrow().getVersion();
    mockMvc
        .perform(
            post("/api/v1/approvals/requests/" + requestId + "/decide")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"outcome\":\"REJECTED\",\"note\":\"too steep\",\"version\":%d}"
                        .formatted(requestVersion)))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/pricing/assert-ready")
                .cookie(fx.cookie()))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("APPROVAL_REQUIRED"));
  }

  @Test
  void ac01_patchAfterInterBillKeepsJurisdictionAndTotals() throws Exception {
    Fixture fx = seed("price-keep");
    Stocked product = stocked(fx, "GST-K", "Keep Pack");
    UUID invoiceId = createDraft(fx, product, "gst-k");

    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/pricing")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    pricingJson(1, product.productId(), "NONE", 0, "FLAT", 500, "27AAAAA0000A1Z5")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.taxJurisdiction").value("INTER"))
        .andExpect(jsonPath("$.data.billDiscountType").value("FLAT"))
        .andExpect(jsonPath("$.data.igstPaise").value(1140))
        .andExpect(jsonPath("$.data.cgstPaise").value(0));

    mockMvc
        .perform(
            patch("/api/v1/sales/invoices/" + invoiceId)
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(patchJson(product, 2)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.taxJurisdiction").value("INTER"))
        .andExpect(jsonPath("$.data.billDiscountType").value("FLAT"))
        .andExpect(jsonPath("$.data.billDiscountValue").value(500))
        .andExpect(jsonPath("$.data.igstPaise").value(1140))
        .andExpect(jsonPath("$.data.cgstPaise").value(0))
        .andExpect(jsonPath("$.data.sgstPaise").value(0));
  }

  @Test
  void ac04_taxAdjustmentRequiresReasonAndIsAudited() throws Exception {
    Fixture fx = seed("price-tax");
    Stocked product = stocked(fx, "TAX-1", "Rate Pack");
    UUID invoiceId = createDraft(fx, product, "tax-1");

    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/tax-adjustment")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(taxJson(1, product.productId(), "5", "")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("REASON_REQUIRED"));

    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/tax-adjustment")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(taxJson(1, product.productId(), "5", "Composition billed at 5 percent")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.taxAdjusted").value(true))
        .andExpect(jsonPath("$.data.taxAdjustmentReason").value("Composition billed at 5 percent"))
        .andExpect(jsonPath("$.data.lines[0].gstRate").value(5))
        .andExpect(jsonPath("$.data.lines[0].gstRateSource").value("MANUAL"))
        .andExpect(jsonPath("$.data.taxPaise").value(500));

    assertThat(auditEventRepository.findAll())
        .extracting(AuditEvent::getAction)
        .contains("SALES_TAX_ADJUSTMENT");
  }

  @Test
  void ac05_isolationStaleExcessiveAndDeniedFail() throws Exception {
    Fixture fx = seed("price-iso");
    Stocked product = stocked(fx, "ISO-P", "Iso Pack");
    UUID invoiceId = createDraft(fx, product, "iso-1");

    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/pricing")
                .contentType(MediaType.APPLICATION_JSON)
                .content(pricingJson(1, product.productId(), "FLAT", 100, "NONE", 0, null)))
        .andExpect(status().isUnauthorized());

    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/pricing")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(pricingJson(99, product.productId(), "FLAT", 100, "NONE", 0, null)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("STALE_STATE"));

    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/pricing")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(pricingJson(1, product.productId(), "FLAT", 20000, "NONE", 0, null)))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("EXCESSIVE_DISCOUNT"));

    SalesInvoice stored = salesInvoiceRepository.findById(invoiceId).orElseThrow();
    assertThat(stored.getDiscountPaise()).isEqualTo(0);
    assertThat(stored.getDiscountApprovalStatus()).isEqualTo(DiscountApprovalStatus.NOT_REQUIRED);

    AppUser inventory =
        persistUser(fx.tenantId(), "stock@price-iso.local", AppUserRole.pharmacy_staff);
    UUID invRole = createRole(fx.cookie(), "Stock desk", "[\"INVENTORY\"]");
    mockMvc
        .perform(
            org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(
                    "/api/v1/users/" + inventory.getId() + "/roles")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleIds\":[\"" + invRole + "\"]}"))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(
                    "/api/v1/users/" + inventory.getId() + "/branches")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchIds\":[\"" + fx.branchId() + "\"]}"))
        .andExpect(status().isOk());
    Cookie invCookie = login("stock@price-iso.local");
    mockMvc
        .perform(
            post("/api/v1/session/branch")
                .cookie(invCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchId\":\"" + fx.branchId() + "\"}"))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/tax-adjustment")
                .cookie(invCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(taxJson(1, product.productId(), "5", "not allowed")))
        .andExpect(status().isForbidden());

    Tenant other = persistTenant("other-price", "Other Price");
    persistPlan(other.getId(), PlanCode.FREE);
    persistUser(other.getId(), "owner@other-price.local", AppUserRole.pharmacy_owner);
    Location otherBranch = persistBranch(other.getId(), "Other", "BR01", true);
    Cookie otherCookie = login("owner@other-price.local");
    mockMvc
        .perform(
            post("/api/v1/session/branch")
                .cookie(otherCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchId\":\"" + otherBranch.getId() + "\"}"))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/pricing")
                .cookie(otherCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(pricingJson(1, product.productId(), "FLAT", 100, "NONE", 0, null)))
        .andExpect(status().isNotFound());
  }

  private UUID createDraft(Fixture fx, Stocked product, String key) throws Exception {
    MvcResult created =
        mockMvc
            .perform(
                post("/api/v1/sales/invoices")
                    .cookie(fx.cookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(createJson(product, key)))
            .andExpect(status().isOk())
            .andReturn();
    return UUID.fromString(
        objectMapper
            .readTree(created.getResponse().getContentAsString())
            .path("data")
            .path("id")
            .asText());
  }

  private void createDiscountRule(Cookie cookie, int threshold, boolean self) throws Exception {
    mockMvc
        .perform(
            post("/api/v1/approvals/rules")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "moduleCode":"SALES",
                      "actionKey":"SALES_DISCOUNT_PERCENT",
                      "thresholdValue":%d,
                      "approverType":"ACCOUNT_CLASS",
                      "approverAccountClass":"pharmacy_owner",
                      "allowSelfApproval":%s
                    }
                    """
                        .formatted(threshold, self)))
        .andExpect(status().isOk());
  }

  private Stocked stocked(Fixture fx, String sku, String name) throws Exception {
    UUID categoryId =
        UUID.fromString(
            objectMapper
                .readTree(
                    mockMvc
                        .perform(
                            post("/api/v1/product-categories")
                                .cookie(fx.cookie())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"name\":\"" + sku + " cat\"}"))
                        .andExpect(status().isOk())
                        .andReturn()
                        .getResponse()
                        .getContentAsString())
                .path("data")
                .path("id")
                .asText());
    UUID productId =
        UUID.fromString(
            objectMapper
                .readTree(
                    mockMvc
                        .perform(
                            post("/api/v1/products")
                                .cookie(fx.cookie())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(productJson(sku, name, categoryId)))
                        .andExpect(status().isOk())
                        .andReturn()
                        .getResponse()
                        .getContentAsString())
                .path("data")
                .path("id")
                .asText());
    mockMvc
        .perform(
            post("/api/v1/inventory/receipts")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"productId\":\"%s\",\"batchNumber\":\"LOT-AA\",\"manufacturedOn\":\"2026-01-15\",\"expiresOn\":\"2027-06-30\",\"purchasePricePaise\":12500,\"quantity\":\"10\",\"idempotencyKey\":\"%s-recv\",\"expectedVersion\":0}"
                        .formatted(productId, sku)))
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

  private Fixture seed(String tag) throws Exception {
    Tenant tenant = persistTenant(tag, "Price " + tag);
    persistPlan(tenant.getId(), PlanCode.FREE);
    AppUser owner =
        persistUser(tenant.getId(), "owner@" + tag + ".local", AppUserRole.pharmacy_owner);
    Location branch = persistBranch(tenant.getId(), "Main", "BR01", true);
    Cookie cookie = login("owner@" + tag + ".local");
    mockMvc
        .perform(
            post("/api/v1/session/branch")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchId\":\"" + branch.getId() + "\"}"))
        .andExpect(status().isOk());
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
    branch.setGstin("29ABCDE1234F1Z5");
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

  private static String createJson(Stocked product, String key) {
    return """
        {
          "customerId":null,
          "doctorId":null,
          "prescriptionReference":null,
          "prescriptionVerified":false,
          "idempotencyKey":"%s",
          "lines":[{
            "productId":"%s",
            "batchId":"%s",
            "quantity":1,
            "unit":"Tablet",
            "mrpPaise":12000,
            "sellingPricePaise":10000,
            "discountPaise":0
          }]
        }
        """
        .formatted(key, product.productId(), product.batchId());
  }

  private static String patchJson(Stocked product, int expectedVersion) {
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
            "quantity":1,
            "unit":"Tablet",
            "mrpPaise":12000,
            "sellingPricePaise":10000,
            "discountPaise":0
          }]
        }
        """
        .formatted(expectedVersion, product.productId(), product.batchId());
  }

  private static String pricingJson(
      int version,
      UUID productId,
      String lineType,
      long lineValue,
      String billType,
      long billValue,
      String customerGstin) {
    String gstin = customerGstin == null ? "null" : "\"" + customerGstin + "\"";
    return """
        {
          "expectedVersion":%d,
          "customerGstin":%s,
          "billDiscountType":"%s",
          "billDiscountValue":%d,
          "lines":[{"productId":"%s","type":"%s","value":%d}]
        }
        """
        .formatted(version, gstin, billType, billValue, productId, lineType, lineValue);
  }

  private static String taxJson(int version, UUID productId, String rate, String reason) {
    return """
        {
          "expectedVersion":%d,
          "reason":"%s",
          "lines":[{"productId":"%s","gstRate":%s}]
        }
        """
        .formatted(version, reason, productId, rate);
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
          "taxCategory":"GST-12",
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

  private record Fixture(UUID tenantId, UUID branchId, UUID userId, Cookie cookie) {}

  private record Stocked(UUID productId, UUID batchId) {}
}
