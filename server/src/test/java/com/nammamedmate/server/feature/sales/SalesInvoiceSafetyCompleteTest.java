package com.nammamedmate.server.feature.sales;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
import com.nammamedmate.server.domain.SalesInvoiceStatus;
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

class SalesInvoiceSafetyCompleteTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-15T06:00:00Z");
  private static final long TOTAL = 11200L;

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private SalesInvoiceRepository salesInvoiceRepository;
  @Autowired private AuditEventRepository auditEventRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @Test
  void ac_completeWithoutReasonWhenWarnings_M3_SAFE_001() throws Exception {
    Fixture fx = seed("safe-noreason");
    Stocked product = stockedAllergy(fx, "SAFE-NR", "Penicillin V");
    UUID customerId = createCustomer(fx.cookie(), "Ravi", "9411000001", "Penicillin");
    UUID invoiceId = createDraft(fx, product, customerId, "safe-nr");
    String warningKey = evaluateWarningKey(fx.cookie(), customerId, product.productId());

    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(completeJson(1, TOTAL, "safe-nr-c", List.of(warningKey), null)))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

    assertThat(salesInvoiceRepository.findById(invoiceId).orElseThrow().getStatus())
        .isEqualTo(SalesInvoiceStatus.DRAFT);
  }

  @Test
  void ac_completeUnmatchedKeys_M3_SAFE_001() throws Exception {
    Fixture fx = seed("safe-keys");
    Stocked product = stockedAllergy(fx, "SAFE-KY", "Penicillin V");
    UUID customerId = createCustomer(fx.cookie(), "Meera", "9411000002", "Penicillin");
    UUID invoiceId = createDraft(fx, product, customerId, "safe-ky");

    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    completeJson(1, TOTAL, "safe-ky-c", List.of("stale-warning-key"), "Reviewed")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

    assertThat(salesInvoiceRepository.findById(invoiceId).orElseThrow().getStatus())
        .isEqualTo(SalesInvoiceStatus.DRAFT);
  }

  @Test
  void ac_assertClearedOnComplete_M3_SAFE_001() throws Exception {
    Fixture fx = seed("safe-ack");
    Stocked product = stockedAllergy(fx, "SAFE-OK", "Penicillin V");
    UUID customerId = createCustomer(fx.cookie(), "Anita", "9411000003", "Penicillin");
    UUID invoiceId = createDraft(fx, product, customerId, "safe-ok");
    String warningKey = evaluateWarningKey(fx.cookie(), customerId, product.productId());

    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    completeJson(
                        1, TOTAL, "safe-ok-c", List.of(warningKey), "Pharmacist reviewed")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("COMPLETED"));

    List<AuditEvent> audits =
        auditEventRepository.findByTenantIdAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(
            fx.tenantId(), Instant.EPOCH);
    assertThat(audits.stream().map(AuditEvent::getAction))
        .contains("MEDICATION_SAFETY_ACKNOWLEDGE", "SALES_INVOICE_COMPLETE");
    assertThat(
            audits.stream()
                .filter(row -> "MEDICATION_SAFETY_ACKNOWLEDGE".equals(row.getAction()))
                .findFirst()
                .orElseThrow()
                .getContextJson())
        .contains("Pharmacist reviewed");
  }

  @Test
  void ac_walkInCompleteWithLinesNotPresentedAsSafe_M3_SAFE_001() throws Exception {
    Fixture fx = seed("safe-walk");
    Stocked product = stockedUnmapped(fx, "SAFE-WK", "Mystery Pack");
    UUID invoiceId = createDraft(fx, product, null, "safe-wk");

    mockMvc
        .perform(
            post("/api/v1/medication-safety/evaluate")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"customerId\":null,\"productIds\":[\"" + product.productId() + "\"]}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.checkStatus").value("INCOMPLETE"))
        .andExpect(jsonPath("$.data.checkLabel").value("Not checked"))
        .andExpect(jsonPath("$.data.safe").doesNotExist());

    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(completeJson(1, TOTAL, "safe-wk-c", List.of(), null)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("COMPLETED"));
  }

  private String evaluateWarningKey(Cookie cookie, UUID customerId, UUID productId)
      throws Exception {
    MvcResult evaluated =
        mockMvc
            .perform(
                post("/api/v1/medication-safety/evaluate")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        "{\"customerId\":\""
                            + customerId
                            + "\",\"productIds\":[\""
                            + productId
                            + "\"]}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.warnings[0].kind").value("ALLERGY"))
            .andReturn();
    return objectMapper
        .readTree(evaluated.getResponse().getContentAsString())
        .path("data")
        .path("warnings")
        .get(0)
        .path("warningKey")
        .asText();
  }

  private UUID createDraft(Fixture fx, Stocked product, UUID customerId, String key)
      throws Exception {
    String customer = customerId == null ? "null" : "\"" + customerId + "\"";
    MvcResult created =
        mockMvc
            .perform(
                post("/api/v1/sales/invoices")
                    .cookie(fx.cookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "customerId":%s,
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
                            .formatted(customer, key, product.productId(), product.batchId())))
            .andExpect(status().isOk())
            .andReturn();
    JsonNode data = objectMapper.readTree(created.getResponse().getContentAsString()).path("data");
    assertThat(data.path("version").asInt()).isEqualTo(1);
    return UUID.fromString(data.path("id").asText());
  }

  private UUID createCustomer(Cookie cookie, String name, String phone, String allergies)
      throws Exception {
    String body =
        mockMvc
            .perform(
                post("/api/v1/customers")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        "{\"name\":\"%s\",\"phone\":\"%s\",\"allergies\":\"%s\"}"
                            .formatted(name, phone, allergies)))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return UUID.fromString(objectMapper.readTree(body).path("data").path("id").asText());
  }

  private Stocked stockedUnmapped(Fixture fx, String sku, String name) throws Exception {
    return stocked(fx, sku, name, null);
  }

  private Stocked stockedAllergy(Fixture fx, String sku, String name) throws Exception {
    return stocked(fx, sku, name, "Amoxicillin trihydrate; penicillin class");
  }

  private Stocked stocked(Fixture fx, String sku, String name, String composition)
      throws Exception {
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
                                .content(productJson(sku, name, categoryId, composition)))
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
                    "{\"productId\":\"%s\",\"batchNumber\":\"LOT-SF\",\"manufacturedOn\":\"2026-01-15\",\"expiresOn\":\"2027-06-30\",\"purchasePricePaise\":12500,\"quantity\":\"10\",\"idempotencyKey\":\"%s-recv\",\"expectedVersion\":0}"
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
    Tenant tenant = persistTenant(tag, "Safe " + tag);
    persistPlan(tenant.getId());
    persistUser(tenant.getId(), "owner@" + tag + ".local", AppUserRole.pharmacy_owner);
    Location branch = persistBranch(tenant.getId());
    Cookie cookie = login("owner@" + tag + ".local");
    mockMvc
        .perform(
            post("/api/v1/session/branch")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchId\":\"" + branch.getId() + "\"}"))
        .andExpect(status().isOk());
    return new Fixture(tenant.getId(), cookie);
  }

  private Location persistBranch(UUID tenantId) {
    Location branch = new Location();
    branch.setId(UUID.randomUUID());
    branch.setTenantId(tenantId);
    branch.setName("Main");
    branch.setBranchCode("BR01");
    branch.setAddressLine("12 MG Road");
    branch.setCity("Bengaluru");
    branch.setState("KA");
    branch.setPincode("560001");
    branch.setContactPhone("9876543210");
    branch.setDrugLicenseNumber("DL-SF");
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
    branch.setDefaultBranch(true);
    branch.setLinkedWarehouse(false);
    branch.setPricingSettings(Map.of("defaultMarkupBps", 0));
    branch.setTaxSettings(Map.of("gstMode", "CGST_SGST", "taxState", "KA"));
    branch.setCreatedAt(T0);
    branch.setUpdatedAt(T0);
    return locationRepository.saveAndFlush(branch);
  }

  private void persistPlan(UUID tenantId) {
    TenantSubscription sub = new TenantSubscription();
    sub.setId(UUID.randomUUID());
    sub.setTenantId(tenantId);
    sub.setPlanCode(PlanCode.FREE);
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

  private static String completeJson(
      int version, long expectedTotal, String key, List<String> warningKeys, String reason) {
    String keys =
        warningKeys.stream().map(k -> "\"" + k + "\"").reduce((a, b) -> a + "," + b).orElse("");
    String reasonJson = reason == null ? "null" : "\"" + reason + "\"";
    return """
        {
          "expectedVersion":%d,
          "expectedTotalPaise":%d,
          "changePaise":0,
          "idempotencyKey":"%s",
          "payments":[{"mode":"CASH","amountPaise":%d}],
          "safetyWarningKeys":[%s],
          "safetyReason":%s
        }
        """
        .formatted(version, expectedTotal, key, expectedTotal, keys, reasonJson);
  }

  private static String productJson(String sku, String name, UUID categoryId, String composition) {
    String compositionJson = composition == null ? "null" : "\"" + composition + "\"";
    String genericJson = composition == null ? "null" : "\"Penicillin\"";
    return """
        {
          "sku":"%s",
          "barcode":null,
          "name":"%s",
          "genericName":%s,
          "brandName":"PenV",
          "manufacturerId":null,
          "categoryId":"%s",
          "productType":"Medicine",
          "dosageForm":"Tablet",
          "therapeuticClass":null,
          "composition":%s,
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
        .formatted(sku, name, genericJson, categoryId, compositionJson);
  }

  private record Fixture(UUID tenantId, Cookie cookie) {}

  private record Stocked(UUID productId, UUID batchId) {}
}
