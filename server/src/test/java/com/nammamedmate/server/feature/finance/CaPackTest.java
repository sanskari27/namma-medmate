package com.nammamedmate.server.feature.finance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
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
import com.nammamedmate.server.domain.Customer;
import com.nammamedmate.server.domain.FinanceAccessPolicy;
import com.nammamedmate.server.domain.FinanceReportPolicy;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.AuditEventRepository;
import com.nammamedmate.server.persistence.CustomerRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import jakarta.servlet.http.Cookie;
import java.nio.charset.StandardCharsets;
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

class CaPackTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-06T02:00:00Z");
  private static final long TOTAL = 11_200L;
  private static final long COST = 5_000L;
  private static final long RENT = 2_000L;
  private static final ZoneId IST = ZoneId.of("Asia/Kolkata");
  private static final String ALLERGY = "Penicillin anaphylaxis";
  private static final String PATIENT = "Penicillin Patient";
  private static final String RX = "RX-PENICILLIN-9";
  private static final String DOCTOR = "Dr Hidden Prescriber";
  private static final String CONDITION = "Type 2 diabetes tag";

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private AuditEventRepository auditEventRepository;
  @Autowired private CustomerRepository customerRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @Test
  void ac01_onlyOwnerAndAccountantAccessFinanceAndCaPack() throws Exception {
    Fixture fx = seed("ca-ac01");
    Stocked product = stocked(fx, "CA-1", "CA Pack");
    completeCash(fx, createDraft(fx, product, "ca-1"), 1, "ca-1-c");

    mockMvc
        .perform(
            get("/api/v1/finance/ca-pack")
                .param("from", today().toString())
                .param("to", today().toString())
                .cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.sections[*].key", hasItem("PROFIT_AND_LOSS")))
        .andExpect(jsonPath("$.data.sections[*].key", hasItem("SALES_SUMMARY")));

    Cookie accountant = staffWithPredefined(fx, "accountant", "books@ca-ac01.local");
    mockMvc
        .perform(
            get("/api/v1/finance/ca-pack")
                .param("from", today().toString())
                .param("to", today().toString())
                .cookie(accountant))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.sections[*].key", hasItem("EXPENSE_SUMMARY")));
    mockMvc.perform(get("/api/v1/finance/reports").cookie(accountant)).andExpect(status().isOk());
    mockMvc.perform(get("/api/v1/finance/expenses").cookie(accountant)).andExpect(status().isOk());
    mockMvc
        .perform(get("/api/v1/finance/receivables").cookie(accountant))
        .andExpect(status().isOk());

    Cookie cashier = staffWithPredefined(fx, "cashier", "till@ca-ac01.local");
    mockMvc
        .perform(get("/api/v1/finance/ca-pack").cookie(cashier))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    mockMvc
        .perform(get("/api/v1/finance/reports").cookie(cashier))
        .andExpect(status().isForbidden());

    Cookie pharmacist = staffWithPredefined(fx, "pharmacist", "rx@ca-ac01.local");
    mockMvc
        .perform(get("/api/v1/finance/ca-pack").cookie(pharmacist))
        .andExpect(status().isForbidden());

    AppUser custom = persistUser(fx.tenantId(), "custom@ca-ac01.local", AppUserRole.pharmacy_staff);
    UUID finRole = createRole(fx.cookie(), "Night books", "[\"FINANCE\"]");
    mockMvc
        .perform(
            put("/api/v1/users/" + custom.getId() + "/roles")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleIds\":[\"" + finRole + "\"]}"))
        .andExpect(status().isOk());
    assignBranch(fx.cookie(), custom.getId(), fx.branchId());
    Cookie customBooks = login("custom@ca-ac01.local");
    selectBranch(customBooks, fx.branchId());
    mockMvc
        .perform(get("/api/v1/finance/ca-pack").cookie(customBooks))
        .andExpect(status().isForbidden());
    mockMvc
        .perform(get("/api/v1/finance/expenses").cookie(customBooks))
        .andExpect(status().isForbidden());
    mockMvc
        .perform(get("/api/v1/finance/receivables").cookie(customBooks))
        .andExpect(status().isForbidden());
  }

  @Test
  void ac02_ownerConsolidatesAndDrillsDownAccountantStaysOnAssignedOutlet() throws Exception {
    Fixture fx = seed("ca-ac02");
    Location annex = persistBranch(fx.tenantId(), "Annex", "BR02", false);
    Stocked product = stocked(fx, "CA-2", "CA Two");
    completeCash(fx, createDraft(fx, product, "ca-2"), 1, "ca-2-c");
    postRentOn(fx, annex.getId(), RENT, today(), "ca-2-rent");

    mockMvc
        .perform(
            get("/api/v1/finance/ca-pack")
                .param("from", today().toString())
                .param("to", today().toString())
                .param("scope", "tenant")
                .cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.scope").value("tenant"))
        .andExpect(jsonPath("$.data.sections[*].key", hasItem("BRANCH_PNL")))
        .andExpect(
            jsonPath(
                "$.data.sections[?(@.key=='BRANCH_PNL')].items[*].branchName", hasItem("Main")))
        .andExpect(
            jsonPath(
                "$.data.sections[?(@.key=='BRANCH_PNL')].items[*].branchName", hasItem("Annex")));

    mockMvc
        .perform(
            get("/api/v1/finance/ca-pack")
                .param("from", today().toString())
                .param("to", today().toString())
                .param("branchId", annex.getId().toString())
                .cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.scope").value("branch"))
        .andExpect(jsonPath("$.data.branchId").value(annex.getId().toString()))
        .andExpect(jsonPath("$.data.sections[*].key", not(hasItem("BRANCH_PNL"))));

    Cookie accountant = staffWithPredefined(fx, "accountant", "books@ca-ac02.local");
    mockMvc
        .perform(get("/api/v1/finance/ca-pack").param("scope", "tenant").cookie(accountant))
        .andExpect(status().isForbidden());
    mockMvc
        .perform(
            get("/api/v1/finance/ca-pack")
                .param("branchId", annex.getId().toString())
                .cookie(accountant))
        .andExpect(status().isNotFound());
    mockMvc
        .perform(
            get("/api/v1/finance/ca-pack")
                .param("from", today().toString())
                .param("to", today().toString())
                .cookie(accountant))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.scope").value("branch"))
        .andExpect(jsonPath("$.data.sections[*].key", not(hasItem("BRANCH_PNL"))));
  }

  @Test
  void ac03_caPackHasCategorizedFinanceNotPersonalMedicalData() throws Exception {
    Fixture fx = seed("ca-ac03");
    persistMedicalCustomer(fx.tenantId());
    Stocked product = stocked(fx, "CA-3", "CA Three");
    completeCash(fx, createDraft(fx, product, "ca-3"), 1, "ca-3-c");
    postRent(fx, RENT, today(), "ca-3-rent");

    MvcResult preview =
        mockMvc
            .perform(
                get("/api/v1/finance/ca-pack")
                    .param("from", today().toString())
                    .param("to", today().toString())
                    .cookie(fx.cookie()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.sections[*].key", hasItem("PROFIT_AND_LOSS")))
            .andExpect(jsonPath("$.data.sections[*].key", hasItem("GSTR1")))
            .andExpect(jsonPath("$.data.sections[*].key", hasItem("GSTR3B")))
            .andExpect(jsonPath("$.data.sections[*].key", hasItem("RECEIVABLES")))
            .andExpect(jsonPath("$.data.sections[*].key", hasItem("PAYABLES")))
            .andExpect(
                jsonPath(
                        "$.data.sections[?(@.key=='PROFIT_AND_LOSS')].totals[?(@.key=='profit')].amountPaise")
                    .value(hasItem(4200)))
            .andReturn();
    String json = preview.getResponse().getContentAsString();
    assertThat(json).doesNotContain(ALLERGY, PATIENT, RX, DOCTOR, CONDITION);

    MvcResult pdf =
        mockMvc
            .perform(
                get("/api/v1/finance/ca-pack/export")
                    .param("from", today().toString())
                    .param("to", today().toString())
                    .cookie(fx.cookie()))
            .andExpect(status().isOk())
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PDF))
            .andExpect(
                header()
                    .string(
                        "Content-Disposition", org.hamcrest.Matchers.containsString("ca-pack.pdf")))
            .andReturn();
    String pdfText =
        new String(pdf.getResponse().getContentAsByteArray(), StandardCharsets.ISO_8859_1);
    assertThat(pdfText).contains("Pack for the CA");
    assertThat(pdfText).contains("Profit & Loss");
    assertThat(pdfText).contains("GSTR-1");
    assertThat(pdfText).doesNotContain(ALLERGY, PATIENT, RX, DOCTOR, CONDITION);
  }

  @Test
  void ac04_caExportIsAudited() throws Exception {
    Fixture fx = seed("ca-ac04");
    mockMvc
        .perform(
            get("/api/v1/finance/ca-pack/export")
                .param("from", today().toString())
                .param("to", today().toString())
                .cookie(fx.cookie()))
        .andExpect(status().isOk());
    List<AuditEvent> audits =
        auditEventRepository.findByTenantIdAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(
            fx.tenantId(), Instant.now().minusSeconds(60));
    assertThat(audits.stream().map(AuditEvent::getAction))
        .contains(FinanceAccessPolicy.CA_EXPORT_ACTION);
    assertThat(
            audits.stream()
                .filter(event -> FinanceAccessPolicy.CA_EXPORT_ACTION.equals(event.getAction())))
        .isNotEmpty()
        .allSatisfy(
            event -> {
              assertThat(event.getOutcome()).isEqualTo("SUCCESS");
              assertThat(event.getContextJson()).contains("pdf");
              assertThat(event.getContextJson()).doesNotContain(ALLERGY);
            });
  }

  @Test
  void ac05_cashierUnassignedCrossTenantAndOverBroadRevealNothing() throws Exception {
    Fixture fx = seed("ca-ac05");
    mockMvc.perform(get("/api/v1/finance/ca-pack")).andExpect(status().isUnauthorized());
    mockMvc
        .perform(get("/api/v1/finance/ca-pack/export").param("format", "csv").cookie(fx.cookie()))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    mockMvc
        .perform(
            get("/api/v1/finance/ca-pack")
                .param("from", "2024-01-01")
                .param("to", "2026-01-10")
                .cookie(fx.cookie()))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value(FinanceReportPolicy.RANGE_UNSUPPORTED));

    Tenant other = persistTenant("other-ca", "Other Ca");
    persistPlan(other.getId(), PlanCode.FREE);
    persistUser(other.getId(), "owner@other-ca.local", AppUserRole.pharmacy_owner);
    Location otherBranch = persistBranch(other.getId(), "Other", "BR01", true);
    Cookie otherCookie = login("owner@other-ca.local");
    selectBranch(otherCookie, otherBranch.getId());
    mockMvc
        .perform(
            get("/api/v1/finance/ca-pack")
                .param("branchId", fx.branchId().toString())
                .cookie(otherCookie))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
  }

  private LocalDate today() {
    return LocalDate.now(IST);
  }

  private void persistMedicalCustomer(UUID tenantId) {
    Customer customer = new Customer();
    customer.setId(UUID.randomUUID());
    customer.setTenantId(tenantId);
    customer.setName(PATIENT);
    customer.setPhone("9000000099");
    customer.setAllergies(ALLERGY);
    customer.setChronicConditions(CONDITION);
    customer.setCreatedAt(T0);
    customer.setUpdatedAt(T0);
    customerRepository.saveAndFlush(customer);
  }

  private void postRent(Fixture fx, long amount, LocalDate occurredOn, String key)
      throws Exception {
    postRentOn(fx, fx.branchId(), amount, occurredOn, key);
  }

  private void postRentOn(Fixture fx, UUID branchId, long amount, LocalDate occurredOn, String key)
      throws Exception {
    UUID rentId = categoryId(listCategories(fx.cookie()), "RENT");
    mockMvc
        .perform(
            post("/api/v1/finance/expenses")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
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
                        .formatted(rentId, amount, occurredOn, branchId, key)))
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
    assignBranch(fx.cookie(), staff.getId(), fx.branchId());
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

  private Fixture seed(String tag) throws Exception {
    Tenant tenant = persistTenant(tag, "Ca " + tag);
    persistPlan(tenant.getId(), PlanCode.GROWTH);
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
