package com.nammamedmate.server.feature.analytics;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.AbstractIntegrationTest;
import com.nammamedmate.server.domain.AnalyticsPolicy;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.BranchType;
import com.nammamedmate.server.domain.Customer;
import com.nammamedmate.server.domain.DiscountApprovalStatus;
import com.nammamedmate.server.domain.DiscountType;
import com.nammamedmate.server.domain.EinvoiceApplicability;
import com.nammamedmate.server.domain.EinvoiceStatus;
import com.nammamedmate.server.domain.GstRateSource;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.ProductUnit;
import com.nammamedmate.server.domain.SalesInvoice;
import com.nammamedmate.server.domain.SalesInvoiceLine;
import com.nammamedmate.server.domain.SalesInvoiceStatus;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.TaxJurisdiction;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.CustomerRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.SalesInvoiceLineRepository;
import com.nammamedmate.server.persistence.SalesInvoiceRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import jakarta.servlet.http.Cookie;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

class AnalyticsTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-06T02:00:00Z");
  private static final long TOTAL = 11_200L;
  private static final long COST = 5_000L;
  private static final long PRIOR_TOTAL = 5_600L;
  private static final ZoneId IST = ZoneId.of("Asia/Kolkata");

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private SalesInvoiceRepository salesInvoiceRepository;
  @Autowired private SalesInvoiceLineRepository salesInvoiceLineRepository;
  @Autowired private CustomerRepository customerRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @Test
  void ac01_wowAndMomUseEquivalentPeriods() throws Exception {
    Fixture fx = seed("an-ac01", PlanCode.GROWTH);
    Stocked fast = stocked(fx, "AN-FAST", "Fast Pack", null);
    completeCash(fx, createDraft(fx, fast, "an-ac01-now"), 1, "an-ac01-now-c");
    persistPriorSale(fx, fast, PRIOR_TOTAL, "Prior Pack");

    AnalyticsPolicy.Window wow = AnalyticsPolicy.wow(LocalDate.now(IST));
    mockMvc
        .perform(get("/api/v1/analytics").param("compare", "WOW").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.compare").value("WOW"))
        .andExpect(jsonPath("$.data.from").value(wow.from().toString()))
        .andExpect(jsonPath("$.data.to").value(wow.to().toString()))
        .andExpect(jsonPath("$.data.priorFrom").value(wow.priorFrom().toString()))
        .andExpect(jsonPath("$.data.priorTo").value(wow.priorTo().toString()))
        .andExpect(jsonPath("$.data.current.salesPaise").value((int) TOTAL))
        .andExpect(jsonPath("$.data.current.billCount").value(1))
        .andExpect(jsonPath("$.data.prior.salesPaise").value((int) PRIOR_TOTAL))
        .andExpect(jsonPath("$.data.prior.billCount").value(1))
        .andExpect(jsonPath("$.data.delta.salesPaise").value((int) (TOTAL - PRIOR_TOTAL)))
        .andExpect(jsonPath("$.data.salesTrend.points", hasSize(7)));

    AnalyticsPolicy.Window mom = AnalyticsPolicy.mom(LocalDate.now(IST));
    mockMvc
        .perform(get("/api/v1/analytics").param("compare", "MOM").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.compare").value("MOM"))
        .andExpect(jsonPath("$.data.from").value(mom.from().toString()))
        .andExpect(jsonPath("$.data.to").value(mom.to().toString()))
        .andExpect(jsonPath("$.data.priorFrom").value(mom.priorFrom().toString()))
        .andExpect(jsonPath("$.data.priorTo").value(mom.priorTo().toString()));
  }

  @Test
  void ac02_chartsIncludeSalesTrendTopSellersSlowDeadAndFrequency() throws Exception {
    Fixture fx = seed("an-ac02", PlanCode.GROWTH);
    Stocked fast = stocked(fx, "AN-TOP", "Top Pack", null);
    stocked(fx, "AN-DEAD", "Idle Pack", null);
    completeCash(fx, createDraft(fx, fast, "an-ac02-now"), 1, "an-ac02-now-c");
    persistPriorSale(fx, fast, PRIOR_TOTAL, "Top Pack");

    mockMvc
        .perform(get("/api/v1/analytics").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.salesTrend.points[0].date").exists())
        .andExpect(jsonPath("$.data.topSellers[0].name").value("Top Pack"))
        .andExpect(jsonPath("$.data.topSellers[0].salesPaise").value((int) TOTAL))
        .andExpect(jsonPath("$.data.slowDeadStock[*].classification", hasItem("DEAD")))
        .andExpect(jsonPath("$.data.slowDeadStock[*].classification", hasItem("SLOW")))
        .andExpect(jsonPath("$.data.slowDeadStock[*].name", hasItem("Idle Pack")))
        .andExpect(jsonPath("$.data.slowDeadStock[*].name", hasItem("Top Pack")))
        .andExpect(jsonPath("$.data.customerFrequency[*].bucket", hasItem("WALK_IN")));
  }

  @Test
  void ac03_responseOmitsForecastFields() throws Exception {
    Fixture fx = seed("an-ac03", PlanCode.GROWTH);
    mockMvc
        .perform(get("/api/v1/analytics").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.forecast").doesNotExist())
        .andExpect(jsonPath("$.data.stockoutInDays").doesNotExist())
        .andExpect(jsonPath("$.data.predicted").doesNotExist())
        .andExpect(jsonPath("$.data.salesTrend.forecast").doesNotExist());
  }

  @Test
  void ac04_planAndBranchAssignmentGateAccess() throws Exception {
    Fixture free = seed("an-ac04-free", PlanCode.FREE);
    mockMvc
        .perform(get("/api/v1/analytics").cookie(free.cookie()))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("PLAN_LIMIT"))
        .andExpect(jsonPath("$.data").doesNotExist());

    Fixture fx = seed("an-ac04", PlanCode.GROWTH);
    Location annex = persistBranch(fx.tenantId(), "Annex", "BR02", false);
    Cookie cashier = staffWithPredefined(fx, "cashier", "till@an-ac04.local");
    Cookie accountant = staffWithPredefined(fx, "accountant", "books@an-ac04.local");

    mockMvc
        .perform(get("/api/v1/analytics").cookie(cashier))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    mockMvc
        .perform(get("/api/v1/analytics").cookie(accountant))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.scope").value("branch"));
    mockMvc
        .perform(
            get("/api/v1/analytics").param("branchId", annex.getId().toString()).cookie(accountant))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    mockMvc
        .perform(get("/api/v1/analytics").param("scope", "tenant").cookie(accountant))
        .andExpect(status().isBadRequest());
    mockMvc
        .perform(get("/api/v1/analytics").param("scope", "tenant").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.scope").value("tenant"));
  }

  @Test
  void ac05_isolationRejectsCrossTenantNonEquivalentAndUnauthenticated() throws Exception {
    Fixture fx = seed("an-ac05", PlanCode.GROWTH);
    Fixture other = seed("an-ac05-b", PlanCode.GROWTH);
    Stocked product = stocked(other, "AN-ISO", "Other Pack", null);
    completeCash(other, createDraft(other, product, "an-iso"), 1, "an-iso-c");

    mockMvc.perform(get("/api/v1/analytics")).andExpect(status().isUnauthorized());
    mockMvc
        .perform(get("/api/v1/analytics").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.current.salesPaise").value(0))
        .andExpect(jsonPath("$.data.topSellers", hasSize(0)));
    mockMvc
        .perform(
            get("/api/v1/analytics")
                .param("branchId", other.branchId().toString())
                .cookie(fx.cookie()))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"))
        .andExpect(jsonPath("$.data").doesNotExist());
    mockMvc
        .perform(
            get("/api/v1/analytics")
                .param("from", "2026-09-01")
                .param("to", "2026-09-06")
                .param("priorFrom", "2026-08-01")
                .param("priorTo", "2026-08-31")
                .cookie(fx.cookie()))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("RANGE_UNSUPPORTED"));
    mockMvc
        .perform(get("/api/v1/analytics").param("compare", "FORECAST").cookie(fx.cookie()))
        .andExpect(status().isBadRequest());
    mockMvc
        .perform(get("/api/v1/analytics").param("limit", "99").cookie(fx.cookie()))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("RANGE_UNSUPPORTED"));
  }

  @Test
  void ac05_customerFrequencyDoesNotLeakOtherTenant() throws Exception {
    Fixture fx = seed("an-ac05c", PlanCode.GROWTH);
    Stocked mine = stocked(fx, "AN-C1", "Mine Pack", null);
    completeCash(fx, createDraft(fx, mine, "an-c1-now"), 1, "an-c1-now-c");
    Fixture other = seed("an-ac05d", PlanCode.GROWTH);
    Stocked theirs = stocked(other, "AN-C2", "Theirs Pack", null);
    completeCash(other, createDraft(other, theirs, "an-c2-now"), 1, "an-c2-now-c");

    mockMvc
        .perform(get("/api/v1/analytics").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.topSellers[*].name", hasItem("Mine Pack")))
        .andExpect(jsonPath("$.data.topSellers[*].name", not(hasItem("Theirs Pack"))));
  }

  private void persistPriorSale(Fixture fx, Stocked product, long totalPaise, String name) {
    persistPriorSale(fx, product, totalPaise, name, null);
  }

  private void persistPriorSale(
      Fixture fx, Stocked product, long totalPaise, String name, Customer customer) {
    AnalyticsPolicy.Window wow = AnalyticsPolicy.wow(LocalDate.now(IST));
    Instant completed = wow.priorFrom().atStartOfDay(IST).plusHours(10).toInstant();
    SalesInvoice invoice = new SalesInvoice();
    invoice.setId(UUID.randomUUID());
    invoice.setTenantId(fx.tenantId());
    invoice.setBranchId(fx.branchId());
    invoice.setInvoiceNumber("INV/2026-27/BR01/" + invoice.getId().toString().substring(0, 5));
    invoice.setStatus(SalesInvoiceStatus.COMPLETED);
    invoice.setStaffUserId(fx.userId());
    invoice.setTerminalId(UUID.randomUUID());
    invoice.setCustomerId(customer == null ? null : customer.getId());
    invoice.setSubtotalPaise(totalPaise);
    invoice.setDiscountPaise(0);
    invoice.setTaxPaise(0);
    invoice.setTotalPaise(totalPaise);
    invoice.setBillDiscountType(DiscountType.NONE);
    invoice.setBillDiscountValue(0);
    invoice.setTaxJurisdiction(TaxJurisdiction.INTRA);
    invoice.setDiscountApprovalStatus(DiscountApprovalStatus.NOT_REQUIRED);
    invoice.setEinvoiceApplicability(EinvoiceApplicability.NOT_APPLICABLE);
    invoice.setEinvoiceStatus(EinvoiceStatus.NOT_SUBMITTED);
    invoice.setAmountPaidPaise(totalPaise);
    invoice.setCompletedAt(completed);
    invoice.setIdempotencyKey("inv-" + invoice.getId());
    invoice.setVersion(1);
    invoice.setCreatedAt(completed);
    invoice.setUpdatedAt(completed);
    salesInvoiceRepository.saveAndFlush(invoice);
    SalesInvoiceLine line = new SalesInvoiceLine();
    line.setId(UUID.randomUUID());
    line.setTenantId(fx.tenantId());
    line.setBranchId(fx.branchId());
    line.setSalesInvoiceId(invoice.getId());
    line.setProductId(product.productId());
    line.setProductName(name);
    line.setSku("PRIOR");
    line.setQuantity(BigDecimal.ONE);
    line.setUnit(ProductUnit.Tablet);
    line.setBaseQuantity(BigDecimal.ONE);
    line.setMrpPaise(totalPaise);
    line.setSellingPricePaise(totalPaise);
    line.setDiscountPaise(0);
    line.setDiscountType(DiscountType.FLAT);
    line.setGstRateSource(GstRateSource.PRODUCT);
    line.setLineTaxablePaise(totalPaise);
    line.setLineTotalPaise(totalPaise);
    line.setSortOrder(0);
    line.setCreatedAt(completed);
    salesInvoiceLineRepository.saveAndFlush(line);
  }

  private UUID createDraft(Fixture fx, Stocked product, String key) throws Exception {
    return idOf(
        mockMvc
            .perform(
                post("/api/v1/sales/invoices")
                    .cookie(fx.cookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
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
                            "discountPaise":0,
                            "prescribedQuantity":null
                          }]
                        }
                        """
                            .formatted(key, product.productId(), product.batchId())))
            .andExpect(status().isOk())
            .andReturn());
  }

  private void completeCash(Fixture fx, UUID invoiceId, int version, String key) throws Exception {
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "expectedVersion":%d,
                      "expectedTotalPaise":%d,
                      "changePaise":0,
                      "idempotencyKey":"%s",
                      "payments":[{"mode":"CASH","amountPaise":11200}]
                    }
                    """
                        .formatted(version, TOTAL, key)))
        .andExpect(status().isOk());
  }

  private Stocked stocked(Fixture fx, String sku, String name, Integer reorderLevel)
      throws Exception {
    UUID categoryId =
        idOf(
            mockMvc
                .perform(
                    post("/api/v1/product-categories")
                        .cookie(fx.cookie())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + sku + " cat\"}"))
                .andExpect(status().isOk())
                .andReturn());
    UUID productId =
        idOf(
            mockMvc
                .perform(
                    post("/api/v1/products")
                        .cookie(fx.cookie())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(productJson(sku, name, categoryId, reorderLevel)))
                .andExpect(status().isOk())
                .andReturn());
    mockMvc
        .perform(
            post("/api/v1/inventory/receipts")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"productId\":\"%s\",\"batchNumber\":\"LOT-%s\",\"manufacturedOn\":\"2026-01-15\",\"expiresOn\":\"2027-06-30\",\"purchasePricePaise\":%d,\"quantity\":\"10\",\"idempotencyKey\":\"%s-recv\",\"expectedVersion\":0}"
                        .formatted(productId, sku, COST, sku)))
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
    Tenant tenant = persistTenant(tag, "An " + tag);
    persistPlan(tenant.getId(), plan);
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

  private Customer persistCustomer(UUID tenantId, String name, String phone) {
    Customer customer = new Customer();
    customer.setId(UUID.randomUUID());
    customer.setTenantId(tenantId);
    customer.setName(name);
    customer.setPhone(phone);
    customer.setCreatedAt(T0);
    customer.setUpdatedAt(T0);
    return customerRepository.saveAndFlush(customer);
  }

  private UUID idOf(MvcResult result) throws Exception {
    return UUID.fromString(
        objectMapper
            .readTree(result.getResponse().getContentAsString())
            .path("data")
            .path("id")
            .asText());
  }

  private static String productJson(
      String sku, String name, UUID categoryId, Integer reorderLevel) {
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
          "reorderLevel":%s,
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
        .formatted(sku, name, categoryId, reorderLevel == null ? "null" : reorderLevel.toString());
  }

  private record Fixture(UUID tenantId, UUID branchId, UUID userId, Cookie cookie) {}

  private record Stocked(UUID productId, UUID batchId) {}
}
