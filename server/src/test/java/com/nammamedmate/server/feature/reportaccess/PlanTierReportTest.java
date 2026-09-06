package com.nammamedmate.server.feature.reportaccess;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
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
import com.nammamedmate.server.domain.FinanceReportPolicy;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.ReportAccessPolicy;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.AuditEventRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.SalesInvoiceRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
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

class PlanTierReportTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-06T02:00:00Z");
  private static final long TOTAL = 11_200L;
  private static final long COST = 5_000L;
  private static final ZoneId IST = ZoneId.of("Asia/Kolkata");

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private AuditEventRepository auditEventRepository;
  @Autowired private SalesInvoiceRepository salesInvoiceRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @Test
  void ac01_freeIncludesDayBookSalesAndPurchaseAndListsGatedBooksWithoutRows() throws Exception {
    Fixture fx = seed("pt-ac01", PlanCode.FREE);
    Stocked product = stocked(fx, "PT-FREE", "Free Pack");
    completeCash(fx, createDraft(fx, product, "pt-free-d"), 1, "pt-free-c");

    mockMvc
        .perform(
            get("/api/v1/finance/reports/DAY_BOOK")
                .param("from", today().toString())
                .param("to", today().toString())
                .cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.items[*].reference", hasItem(not(""))));
    mockMvc
        .perform(
            get("/api/v1/finance/reports/SALES_SUMMARY")
                .param("from", today().toString())
                .param("to", today().toString())
                .cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.key").value("SALES_SUMMARY"))
        .andExpect(jsonPath("$.data.items").isArray());
    mockMvc
        .perform(
            get("/api/v1/finance/reports/PURCHASE_SUMMARY")
                .param("from", today().toString())
                .param("to", today().toString())
                .cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.key").value("PURCHASE_SUMMARY"));

    mockMvc
        .perform(get("/api/v1/finance/reports").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items[?(@.key=='DAY_BOOK')].entitled").value(hasItem(true)))
        .andExpect(
            jsonPath("$.data.items[?(@.key=='SALES_SUMMARY')].entitled").value(hasItem(true)))
        .andExpect(
            jsonPath("$.data.items[?(@.key=='PURCHASE_SUMMARY')].entitled").value(hasItem(true)))
        .andExpect(
            jsonPath("$.data.items[?(@.key=='EXPENSE_SUMMARY')].entitled").value(hasItem(false)))
        .andExpect(jsonPath("$.data.items[?(@.key=='GSTR1')].entitled").value(hasItem(false)))
        .andExpect(
            jsonPath("$.data.items[?(@.key=='PROFIT_AND_LOSS')].entitled").value(hasItem(false)))
        .andExpect(jsonPath("$.data.items[?(@.key=='GSTR1')].upgradeHint").value(hasItem(not(""))))
        .andExpect(jsonPath("$.data.items[?(@.key=='GSTR1')].items").doesNotExist())
        .andExpect(jsonPath("$.data.items[?(@.key=='GSTR1')].totals").doesNotExist());
  }

  @Test
  void ac02_starterAddsExpenseAndNearExpiryWhileGrowthUnlocksGstAgingAnalyticsAndCustom()
      throws Exception {
    Fixture starter = seed("pt-ac02-s", PlanCode.STARTER);
    postRent(starter, 2_000L, today(), "pt-starter-rent");
    mockMvc
        .perform(
            get("/api/v1/finance/reports/EXPENSE_SUMMARY")
                .param("from", today().toString())
                .param("to", today().toString())
                .cookie(starter.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.key").value("EXPENSE_SUMMARY"));
    mockMvc
        .perform(get("/api/v1/compliance/reports/NEAR_EXPIRY").cookie(starter.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.key").value("NEAR_EXPIRY"));
    mockMvc
        .perform(get("/api/v1/finance/reports/GSTR1").cookie(starter.cookie()))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value(ReportAccessPolicy.PLAN_LIMIT))
        .andExpect(jsonPath("$.data").doesNotExist());
    mockMvc
        .perform(get("/api/v1/finance/receivables").cookie(starter.cookie()))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value(ReportAccessPolicy.PLAN_LIMIT))
        .andExpect(jsonPath("$.data").doesNotExist());
    mockMvc
        .perform(get("/api/v1/analytics").cookie(starter.cookie()))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value(ReportAccessPolicy.PLAN_LIMIT));
    mockMvc
        .perform(get("/api/v1/reports/custom").cookie(starter.cookie()))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value(ReportAccessPolicy.PLAN_LIMIT));

    Fixture growth = seed("pt-ac02-g", PlanCode.GROWTH);
    mockMvc
        .perform(get("/api/v1/finance/reports/GSTR1").cookie(growth.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.key").value("GSTR1"));
    mockMvc
        .perform(get("/api/v1/finance/reports/PROFIT_AND_LOSS").cookie(growth.cookie()))
        .andExpect(status().isOk());
    mockMvc
        .perform(get("/api/v1/finance/receivables").cookie(growth.cookie()))
        .andExpect(status().isOk());
    mockMvc
        .perform(get("/api/v1/finance/payables").cookie(growth.cookie()))
        .andExpect(status().isOk());
    mockMvc.perform(get("/api/v1/analytics").cookie(growth.cookie())).andExpect(status().isOk());
    mockMvc
        .perform(get("/api/v1/reports/custom").cookie(growth.cookie()))
        .andExpect(status().isOk());

    Fixture pro = seed("pt-ac02-p", PlanCode.PRO);
    mockMvc
        .perform(get("/api/v1/finance/reports/GSTR3B").cookie(pro.cookie()))
        .andExpect(status().isOk());
    mockMvc
        .perform(get("/api/v1/compliance/reports/NEAR_EXPIRY").cookie(pro.cookie()))
        .andExpect(status().isOk());
  }

  @Test
  void ac03_deniedReportsReturnPlanLimitWithoutLeakingRowsAndCashierStaysForbidden()
      throws Exception {
    Fixture fx = seed("pt-ac03", PlanCode.FREE);
    Stocked product = stocked(fx, "PT-DENY", "Deny Pack");
    completeCash(fx, createDraft(fx, product, "pt-deny-d"), 1, "pt-deny-c");

    mockMvc
        .perform(
            get("/api/v1/finance/reports/GSTR1")
                .param("from", today().toString())
                .param("to", today().toString())
                .cookie(fx.cookie()))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value(ReportAccessPolicy.PLAN_LIMIT))
        .andExpect(jsonPath("$.data").doesNotExist())
        .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Growth")));
    mockMvc
        .perform(
            get("/api/v1/finance/reports/GSTR1/export")
                .param("format", "csv")
                .param("from", today().toString())
                .param("to", today().toString())
                .cookie(fx.cookie()))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value(ReportAccessPolicy.PLAN_LIMIT))
        .andExpect(jsonPath("$.data").doesNotExist());
    List<AuditEvent> audits =
        auditEventRepository.findByTenantIdAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(
            fx.tenantId(), Instant.now().minusSeconds(60));
    assertThat(audits.stream().map(AuditEvent::getAction))
        .doesNotContain(FinanceReportPolicy.ACTION);

    AppUser cashier = persistUser(fx.tenantId(), "till@pt-ac03.local", AppUserRole.pharmacy_staff);
    UUID salesRole = createRole(fx.cookie(), "Till", "[\"SALES\"]");
    mockMvc
        .perform(
            put("/api/v1/users/" + cashier.getId() + "/roles")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleIds\":[\"" + salesRole + "\"]}"))
        .andExpect(status().isOk());
    assignBranch(fx.cookie(), cashier.getId(), fx.branchId());
    Cookie till = login("till@pt-ac03.local");
    selectBranch(till, fx.branchId());
    mockMvc
        .perform(get("/api/v1/finance/reports/GSTR1").cookie(till))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"))
        .andExpect(jsonPath("$.data").doesNotExist());
  }

  @Test
  void ac04_downgradeKeepsHistoricalSaleButRemovesGatedAccess() throws Exception {
    Fixture fx = seed("pt-ac04", PlanCode.GROWTH);
    Stocked product = stocked(fx, "PT-DOWN", "Down Pack");
    UUID invoiceId = createDraft(fx, product, "pt-down-d");
    completeCash(fx, invoiceId, 1, "pt-down-c");

    mockMvc
        .perform(
            get("/api/v1/finance/reports/GSTR1")
                .param("from", today().toString())
                .param("to", today().toString())
                .cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items").isArray());

    setPlan(fx.tenantId(), PlanCode.FREE, SubscriptionStatus.ACTIVE);

    mockMvc
        .perform(get("/api/v1/sales/invoices/" + invoiceId).cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.id").value(invoiceId.toString()));
    assertThat(salesInvoiceRepository.findById(invoiceId)).isPresent();
    mockMvc
        .perform(
            get("/api/v1/finance/reports/DAY_BOOK")
                .param("from", today().toString())
                .param("to", today().toString())
                .cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items").isArray());
    mockMvc
        .perform(
            get("/api/v1/finance/reports/GSTR1")
                .param("from", today().toString())
                .param("to", today().toString())
                .cookie(fx.cookie()))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value(ReportAccessPolicy.PLAN_LIMIT))
        .andExpect(jsonPath("$.data").doesNotExist());
  }

  @Test
  void ac05_isolationExpiredPlanLiveEntitlementAndUnknownKeys() throws Exception {
    Fixture fx = seed("pt-ac05", PlanCode.GROWTH);
    Fixture other = seed("pt-ac05-b", PlanCode.GROWTH);

    mockMvc.perform(get("/api/v1/finance/reports/GSTR1")).andExpect(status().isUnauthorized());
    mockMvc
        .perform(
            get("/api/v1/finance/reports/GSTR1")
                .param("branchId", fx.branchId().toString())
                .cookie(other.cookie()))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"))
        .andExpect(jsonPath("$.data").doesNotExist());
    mockMvc
        .perform(get("/api/v1/finance/reports/TDS").cookie(fx.cookie()))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));

    mockMvc
        .perform(get("/api/v1/finance/reports/GSTR1").cookie(fx.cookie()))
        .andExpect(status().isOk());
    setPlan(fx.tenantId(), PlanCode.GROWTH, SubscriptionStatus.EXPIRED);
    mockMvc
        .perform(get("/api/v1/finance/reports/GSTR1").cookie(fx.cookie()))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value(ReportAccessPolicy.PLAN_LIMIT));
    mockMvc
        .perform(get("/api/v1/finance/reports/DAY_BOOK").cookie(fx.cookie()))
        .andExpect(status().isOk());

    setPlan(fx.tenantId(), PlanCode.GROWTH, SubscriptionStatus.ACTIVE);
    mockMvc
        .perform(get("/api/v1/finance/reports/GSTR1").cookie(fx.cookie()))
        .andExpect(status().isOk());
    setPlan(fx.tenantId(), PlanCode.FREE, SubscriptionStatus.ACTIVE);
    mockMvc
        .perform(get("/api/v1/finance/reports/GSTR1").cookie(fx.cookie()))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value(ReportAccessPolicy.PLAN_LIMIT));

    mockMvc
        .perform(get("/api/v1/compliance/reports").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items[?(@.key=='NEAR_EXPIRY')].entitled").value(hasItem(false)))
        .andExpect(jsonPath("$.data.items[?(@.key=='H1_SALES')].entitled").value(hasItem(true)));
  }

  private LocalDate today() {
    return LocalDate.now(IST);
  }

  private void postRent(Fixture fx, long amount, LocalDate occurredOn, String key)
      throws Exception {
    UUID rentId = categoryId(listCategories(fx.cookie()), "RENT");
    String json =
        """
        {
          "categoryId":"%s",
          "amountPaise":%d,
          "occurredOn":"%s",
          "notes":"rent",
          "branchId":"%s",
          "idempotencyKey":"%s"
        }
        """
            .formatted(rentId, amount, occurredOn, fx.branchId(), key);
    mockMvc
        .perform(
            post("/api/v1/finance/expenses")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
        .andExpect(status().isOk());
  }

  private JsonNode listCategories(Cookie cookie) throws Exception {
    String body =
        mockMvc
            .perform(get("/api/v1/finance/expense-categories").cookie(cookie))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return objectMapper.readTree(body).path("data");
  }

  private UUID categoryId(JsonNode data, String code) {
    for (JsonNode item : data.path("items")) {
      if (code.equals(item.path("code").asText())) {
        return UUID.fromString(item.path("id").asText());
      }
    }
    throw new IllegalStateException("missing category " + code);
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

  private UUID createDraft(Fixture fx, Stocked product, String key) throws Exception {
    MvcResult created =
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
            .andReturn();
    return UUID.fromString(
        objectMapper
            .readTree(created.getResponse().getContentAsString())
            .path("data")
            .path("id")
            .asText());
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

  private void assignBranch(Cookie owner, UUID userId, UUID branchId) throws Exception {
    mockMvc
        .perform(
            put("/api/v1/users/" + userId + "/branches")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchIds\":[\"" + branchId + "\"]}"))
        .andExpect(status().isOk());
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
    Tenant tenant = persistTenant(tag, "Pt " + tag);
    persistPlan(tenant.getId(), plan, SubscriptionStatus.ACTIVE);
    persistUser(tenant.getId(), "owner@" + tag + ".local", AppUserRole.pharmacy_owner);
    Location branch = persistBranch(tenant.getId(), "Main", "BR01", true);
    Cookie cookie = login("owner@" + tag + ".local");
    selectBranch(cookie, branch.getId());
    return new Fixture(tenant.getId(), branch.getId(), cookie);
  }

  private void persistPlan(UUID tenantId, PlanCode plan, SubscriptionStatus status) {
    TenantSubscription sub = new TenantSubscription();
    sub.setId(UUID.randomUUID());
    sub.setTenantId(tenantId);
    sub.setPlanCode(plan);
    sub.setStatus(status);
    sub.setStartedAt(T0);
    sub.setCreatedAt(T0);
    sub.setUpdatedAt(T0);
    tenantSubscriptionRepository.save(sub);
  }

  private void setPlan(UUID tenantId, PlanCode plan, SubscriptionStatus status) {
    TenantSubscription sub = tenantSubscriptionRepository.findByTenantId(tenantId).orElseThrow();
    sub.setPlanCode(plan);
    sub.setStatus(status);
    sub.setUpdatedAt(Instant.now());
    tenantSubscriptionRepository.saveAndFlush(sub);
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

  private record Fixture(UUID tenantId, UUID branchId, Cookie cookie) {}

  private record Stocked(UUID productId, UUID batchId) {}
}
