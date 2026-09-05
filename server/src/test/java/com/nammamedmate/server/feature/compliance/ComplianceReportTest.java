package com.nammamedmate.server.feature.compliance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
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
import com.nammamedmate.server.domain.ComplianceReportPolicy;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.AuditEventRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import jakarta.servlet.http.Cookie;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;

class ComplianceReportTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-05T12:00:00Z");
  private static final long UNIT_TOTAL = 11200L;

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private AuditEventRepository auditEventRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @Test
  void ac01_catalogLivesUnderComplianceReportsNotBusinessReports() throws Exception {
    Fixture fx = seed("rep-ac01", "Anika Owner");
    mockMvc
        .perform(get("/api/v1/compliance/reports").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.items", hasSize(16)));
    mockMvc.perform(get("/api/v1/reports").cookie(fx.cookie())).andExpect(status().isNotFound());
    mockMvc
        .perform(get("/api/v1/reports/h1-sales").cookie(fx.cookie()))
        .andExpect(status().isNotFound());
  }

  @Test
  void ac02_catalogIncludesEveryModule7Register() throws Exception {
    Fixture fx = seed("rep-ac02", "Anika Owner");
    String body =
        mockMvc
            .perform(get("/api/v1/compliance/reports").cookie(fx.cookie()))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    List<String> keys = new ArrayList<>();
    for (JsonNode item : objectMapper.readTree(body).path("data").path("items")) {
      keys.add(item.path("key").asText());
    }
    assertThat(keys)
        .containsExactly(
            "H1_SALES",
            "PURCHASE",
            "PURCHASE_INVOICE",
            "SUPPLIER_LICENSE",
            "LICENSE_EXPIRY",
            "CONTROLLED_STOCK",
            "BATCH_STOCK",
            "EXPIRED",
            "DAMAGED",
            "SUPPLIER_RETURN",
            "STOCK_LOSS",
            "STOCK_VERIFICATION",
            "NEAR_EXPIRY",
            "TRACEABILITY",
            "SUPPLIER_PURCHASE",
            "PRODUCT_TRACE");
    assertThat(objectMapper.readTree(body).path("data").path("items").get(0).path("title").asText())
        .isEqualTo("Schedule H1 Sale Register");
  }

  @Test
  void ac03_exportsAreOneClickFilteredFacts() throws Exception {
    Fixture fx = seed("rep-ac03", "Anika Owner");
    Stocked h1 = stocked(fx, "H1-REP", "Alprazolam", true, true);
    UUID customerId = createCustomer(fx.cookie(), "Ravi Patient", "9431000101");
    UUID doctorId = createDoctor(fx.cookie(), "Dr Rao", "KA-2101");
    sellControlled(fx, h1, customerId, doctorId, "RX-H1-1", "rep-ac03");
    createLicense(
        fx.cookie(),
        "DRUG_LICENSE",
        "TENANT",
        null,
        "KA-DL-REP",
        LocalDate.now(ZoneOffset.UTC).minusYears(1).toString(),
        LocalDate.now(ZoneOffset.UTC).plusDays(40).toString());

    mockMvc
        .perform(get("/api/v1/compliance/reports/H1_SALES").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.key").value("H1_SALES"))
        .andExpect(jsonPath("$.data.items", hasSize(1)))
        .andExpect(jsonPath("$.data.items[0].productName").value("Alprazolam"))
        .andExpect(jsonPath("$.data.items[0].patientName").value("Ravi Patient"))
        .andExpect(jsonPath("$.data.items[0].prescriptionReference").value("RX-H1-1"));
    mockMvc
        .perform(
            get("/api/v1/compliance/reports/H1_SALES")
                .cookie(fx.cookie())
                .param("productId", UUID.randomUUID().toString()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(0)));

    mockMvc
        .perform(get("/api/v1/compliance/reports/LICENSE_EXPIRY").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(1)))
        .andExpect(jsonPath("$.data.items[0].licenseNumber").value("KA-DL-REP"));

    mockMvc
        .perform(get("/api/v1/compliance/reports/BATCH_STOCK").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items[0].batchNumber").value("LOT-RX"));

    mockMvc
        .perform(get("/api/v1/compliance/reports/STOCK_VERIFICATION").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(0)));

    mockMvc
        .perform(
            get("/api/v1/compliance/reports/H1_SALES/export")
                .cookie(fx.cookie())
                .param("format", "csv"))
        .andExpect(status().isOk())
        .andExpect(
            header()
                .string("Content-Disposition", "attachment; filename=\"h1-sales-register.csv\""))
        .andExpect(content().string(org.hamcrest.Matchers.containsString("Ravi Patient")))
        .andExpect(content().string(org.hamcrest.Matchers.containsString("Alprazolam")));
    mockMvc
        .perform(
            get("/api/v1/compliance/reports/H1_SALES/export")
                .cookie(fx.cookie())
                .param("format", "pdf"))
        .andExpect(status().isOk())
        .andExpect(
            header()
                .string("Content-Disposition", "attachment; filename=\"h1-sales-register.pdf\""))
        .andExpect(content().contentType(MediaType.APPLICATION_PDF));

    assertThat(auditEventRepository.findAll().stream().map(AuditEvent::getAction).toList())
        .contains(ComplianceReportPolicy.ACTION);

    mockMvc
        .perform(get("/api/v1/compliance/reports/TRACEABILITY").cookie(fx.cookie()))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("BATCH_REQUIRED"));
    mockMvc
        .perform(
            get("/api/v1/compliance/reports/TRACEABILITY")
                .cookie(fx.cookie())
                .param("batchNumber", "LOT-RX"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items").isArray());
  }

  @Test
  void ac04_complianceModuleMayBeGrantedToStaff() throws Exception {
    Fixture fx = seed("rep-ac04", "Anika Owner");
    String roles =
        mockMvc
            .perform(get("/api/v1/roles").cookie(fx.cookie()))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    boolean catalogHasCompliance = false;
    for (JsonNode item : objectMapper.readTree(roles).path("data").path("catalog")) {
      if ("COMPLIANCE".equals(item.path("code").asText())) {
        catalogHasCompliance = item.path("entitled").asBoolean();
      }
    }
    assertThat(catalogHasCompliance).isTrue();

    Cookie cashier = staffWithPredefined(fx, "cashier", "till@rep-ac04.local");
    mockMvc
        .perform(get("/api/v1/compliance/reports").cookie(cashier))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));

    Cookie clerk = staffWithCompliance(fx, "books@rep-ac04.local");
    mockMvc
        .perform(get("/api/v1/compliance/reports").cookie(clerk))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(16)));
  }

  @Test
  void ac05_isolationAndFailureSafety() throws Exception {
    Fixture fx = seed("rep-ac05", "Anika Owner");
    Stocked h1 = stocked(fx, "H1-ISO", "Tramadol", true, true);
    UUID customerId = createCustomer(fx.cookie(), "Safe Patient", "9431000105");
    UUID doctorId = createDoctor(fx.cookie(), "Dr Safe", "KA-2105");
    sellControlled(fx, h1, customerId, doctorId, "RX-ISO", "rep-ac05");

    mockMvc.perform(get("/api/v1/compliance/reports")).andExpect(status().isUnauthorized());
    mockMvc
        .perform(get("/api/v1/compliance/reports/NOT_A_BOOK").cookie(fx.cookie()))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    mockMvc
        .perform(
            get("/api/v1/compliance/reports/H1_SALES/export")
                .cookie(fx.cookie())
                .param("format", "xlsx"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    mockMvc
        .perform(
            get("/api/v1/compliance/reports/H1_SALES")
                .cookie(fx.cookie())
                .param("from", "2024-01-01T00:00:00Z")
                .param("to", "2026-01-10T00:00:00Z"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("RANGE_UNSUPPORTED"));

    Fixture other = seed("rep-ac05b", "Other Owner");
    mockMvc
        .perform(
            get("/api/v1/compliance/reports/H1_SALES")
                .cookie(other.cookie())
                .param("branchId", fx.branchId().toString()))
        .andExpect(status().isNotFound());
    mockMvc
        .perform(get("/api/v1/compliance/reports/H1_SALES").cookie(other.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(0)));

    Location annex = persistBranch(fx.tenantId(), "Annex", "BR2", false);
    mockMvc
        .perform(
            get("/api/v1/compliance/reports/H1_SALES")
                .cookie(fx.cookie())
                .param("branchId", annex.getId().toString()))
        .andExpect(status().isNotFound());
    selectBranch(fx.cookie(), annex.getId());
    mockMvc
        .perform(get("/api/v1/compliance/reports/H1_SALES").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(0)));

    AppUser stray =
        persistUser(fx.tenantId(), "nobranch@rep-ac05.local", AppUserRole.pharmacy_owner, "Stray");
    Cookie noBranch = login(stray.getEmail());
    mockMvc
        .perform(get("/api/v1/compliance/reports").cookie(noBranch))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("NO_ACTIVE_BRANCH"));
  }

  private Cookie staffWithCompliance(Fixture fx, String email) throws Exception {
    persistUser(fx.tenantId(), email, AppUserRole.pharmacy_staff, "Register clerk");
    String created =
        mockMvc
            .perform(
                post("/api/v1/roles")
                    .cookie(fx.cookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":\"Register clerk\",\"modules\":[\"COMPLIANCE\"]}"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    UUID roleId = UUID.fromString(objectMapper.readTree(created).path("data").path("id").asText());
    UUID staffId =
        appUserRepository.findAll().stream()
            .filter(user -> email.equals(user.getEmail()))
            .findFirst()
            .orElseThrow()
            .getId();
    mockMvc
        .perform(
            put("/api/v1/users/" + staffId + "/roles")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleIds\":[\"" + roleId + "\"]}"))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            put("/api/v1/users/" + staffId + "/branches")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchIds\":[\"" + fx.branchId() + "\"]}"))
        .andExpect(status().isOk());
    Cookie cookie = login(email);
    selectBranch(cookie, fx.branchId());
    return cookie;
  }

  private Cookie staffWithPredefined(Fixture fx, String roleCode, String email) throws Exception {
    persistUser(fx.tenantId(), email, AppUserRole.pharmacy_staff, "Staff " + roleCode);
    UUID roleId = predefinedId(fx.cookie(), roleCode);
    UUID staffId =
        appUserRepository.findAll().stream()
            .filter(user -> email.equals(user.getEmail()))
            .findFirst()
            .orElseThrow()
            .getId();
    mockMvc
        .perform(
            put("/api/v1/users/" + staffId + "/roles")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleIds\":[\"" + roleId + "\"]}"))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            put("/api/v1/users/" + staffId + "/branches")
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

  private UUID sellControlled(
      Fixture fx, Stocked product, UUID customerId, UUID doctorId, String rx, String key)
      throws Exception {
    UUID invoiceId =
        idOf(
            mockMvc
                .perform(
                    post("/api/v1/sales/invoices")
                        .cookie(fx.cookie())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                            draftJson(customerId, doctorId, rx, true, product, "1", "30", key)))
                .andExpect(status().isOk())
                .andReturn());
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(completeJson(1, UNIT_TOTAL, key + "-pay")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("COMPLETED"));
    return invoiceId;
  }

  private Stocked stocked(
      Fixture fx, String sku, String name, boolean prescriptionRequired, boolean controlled)
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
                                .content(
                                    productJson(
                                        sku, name, categoryId, prescriptionRequired, controlled)))
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
                    "{\"productId\":\"%s\",\"batchNumber\":\"LOT-RX\",\"manufacturedOn\":\"2026-01-15\",\"expiresOn\":\"2027-06-30\",\"purchasePricePaise\":12500,\"quantity\":\"200\",\"idempotencyKey\":\"%s-recv\",\"expectedVersion\":0}"
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

  private UUID createCustomer(Cookie cookie, String name, String phone) throws Exception {
    String body =
        mockMvc
            .perform(
                post("/api/v1/customers")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":\"%s\",\"phone\":\"%s\"}".formatted(name, phone)))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return UUID.fromString(objectMapper.readTree(body).path("data").path("id").asText());
  }

  private UUID createDoctor(Cookie cookie, String name, String registration) throws Exception {
    String body =
        mockMvc
            .perform(
                post("/api/v1/doctors")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        "{\"name\":\"%s\",\"registrationNumber\":\"%s\"}"
                            .formatted(name, registration)))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return UUID.fromString(objectMapper.readTree(body).path("data").path("id").asText());
  }

  private void createLicense(
      Cookie cookie,
      String docType,
      String scope,
      UUID branchId,
      String number,
      String issuedOn,
      String expiresOn)
      throws Exception {
    MockMultipartHttpServletRequestBuilder builder =
        multipart("/api/v1/compliance/licenses")
            .file(
                new MockMultipartFile(
                    "evidence",
                    "licence.pdf",
                    "application/pdf",
                    "%PDF-1.4 licence".getBytes(StandardCharsets.UTF_8)));
    builder.param("docType", docType);
    builder.param("scope", scope);
    builder.param("licenseNumber", number);
    builder.param("issuedOn", issuedOn);
    builder.param("expiresOn", expiresOn);
    if (branchId != null) {
      builder.param("branchId", branchId.toString());
    }
    builder.cookie(cookie);
    mockMvc.perform(builder).andExpect(status().isOk());
  }

  private Fixture seed(String tag, String ownerName) throws Exception {
    Tenant tenant = persistTenant(tag, "Sale " + tag);
    persistPlan(tenant.getId());
    AppUser owner =
        persistUser(
            tenant.getId(), "owner@" + tag + ".local", AppUserRole.pharmacy_owner, ownerName);
    Location branch = persistBranch(tenant.getId(), "Main", "BR01", true);
    Cookie cookie = login(owner.getEmail());
    selectBranch(cookie, branch.getId());
    return new Fixture(tenant.getId(), branch.getId(), owner.getId(), cookie);
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

  private AppUser persistUser(UUID tenantId, String email, AppUserRole role, String name) {
    AppUser user = new AppUser();
    user.setId(UUID.randomUUID());
    user.setTenantId(tenantId);
    user.setEmail(email);
    user.setPasswordHash(passwordEncoder.encode(PASSWORD));
    user.setDisplayName(name);
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

  private UUID idOf(MvcResult result) throws Exception {
    return UUID.fromString(
        objectMapper
            .readTree(result.getResponse().getContentAsString())
            .path("data")
            .path("id")
            .asText());
  }

  private static String draftJson(
      UUID customerId,
      UUID doctorId,
      String reference,
      boolean verified,
      Stocked product,
      String quantity,
      String prescribed,
      String key) {
    return """
        {
          "customerId":"%s",
          "doctorId":"%s",
          "prescriptionReference":"%s",
          "prescriptionVerified":%s,
          "idempotencyKey":"%s",
          "lines":[{
            "productId":"%s",
            "batchId":"%s",
            "quantity":%s,
            "unit":"Tablet",
            "mrpPaise":12000,
            "sellingPricePaise":10000,
            "discountPaise":0,
            "prescribedQuantity":%s
          }]
        }
        """
        .formatted(
            customerId,
            doctorId,
            reference,
            verified,
            key,
            product.productId(),
            product.batchId(),
            quantity,
            prescribed);
  }

  private static String completeJson(int version, long expectedTotal, String key) {
    return """
        {
          "expectedVersion":%d,
          "expectedTotalPaise":%d,
          "changePaise":0,
          "idempotencyKey":"%s",
          "payments":[{"mode":"CASH","amountPaise":%d}]
        }
        """
        .formatted(version, expectedTotal, key, expectedTotal);
  }

  private static String productJson(
      String sku, String name, UUID categoryId, boolean prescriptionRequired, boolean controlled) {
    String schedule = controlled ? "\"H1\"" : "null";
    return """
        {
          "sku":"%s","barcode":null,"name":"%s","genericName":null,"brandName":null,
          "manufacturerId":null,"categoryId":"%s","productType":"Medicine","dosageForm":"Tablet",
          "therapeuticClass":null,"composition":null,"strength":null,"route":null,
          "prescriptionRequired":%s,"scheduleClassification":%s,"hsnCode":"30049099","gstRate":12,
          "baseUnit":"Tablet","packSize":10,"packUnit":"strip","packDescription":null,
          "storageConditions":null,"requiresColdStorage":false,"rackLocation":null,
          "reorderLevel":null,"reorderQuantity":null,"minimumStock":null,"isDiscontinued":false,
          "isReturnable":true,"isTaxable":true,"taxCategory":"GST-12","requiresBatchTracking":true,
          "requiresExpiryTracking":true,"requiresSerialTracking":false,"controlledSubstance":%s,
          "notes":null,"isActive":true
        }
        """
        .formatted(sku, name, categoryId, prescriptionRequired, schedule, controlled);
  }

  private record Fixture(UUID tenantId, UUID branchId, UUID userId, Cookie cookie) {}

  private record Stocked(UUID productId, UUID batchId) {}
}
