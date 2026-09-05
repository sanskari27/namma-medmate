package com.nammamedmate.server.feature.sales;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lowagie.text.pdf.PdfReader;
import com.lowagie.text.pdf.parser.PdfTextExtractor;
import com.nammamedmate.server.AbstractIntegrationTest;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.BranchType;
import com.nammamedmate.server.domain.EinvoiceApplicability;
import com.nammamedmate.server.domain.EinvoiceStatus;
import com.nammamedmate.server.domain.InvoicePdfPolicy;
import com.nammamedmate.server.domain.KycSubmission;
import com.nammamedmate.server.domain.KycSubmissionStatus;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.SalesInvoice;
import com.nammamedmate.server.domain.SalesInvoiceStatus;
import com.nammamedmate.server.domain.StaffRegistration;
import com.nammamedmate.server.domain.StaffRegistrationKind;
import com.nammamedmate.server.domain.StaffRegistrationStatus;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.KycSubmissionRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.SalesInvoiceLineRepository;
import com.nammamedmate.server.persistence.SalesInvoiceRepository;
import com.nammamedmate.server.persistence.StaffRegistrationRepository;
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
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

class InvoicePdfTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-05T08:00:00Z");
  private static final long TOTAL = 11200L;

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private SalesInvoiceRepository salesInvoiceRepository;
  @Autowired private SalesInvoiceLineRepository salesInvoiceLineRepository;
  @Autowired private KycSubmissionRepository kycSubmissionRepository;
  @Autowired private StaffRegistrationRepository staffRegistrationRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @Test
  void
      ac01_pdfIncludesPharmacyTaxLicenseLinePatientPrescriberPharmacistControlledPaymentReturnAndDeclaration()
          throws Exception {
    Fixture fx = seed("pdf-ac01");
    persistKyc(fx);
    persistPharmacist(fx);
    Stocked product = stocked(fx, "PDF-1", "Schedule H1 Pack", true);
    UUID customerId =
        createCustomer(
            fx.cookie(), "Meera Patient", "9501000099", "meera@patient.local", "44 Koramangala");
    UUID doctorId = createDoctor(fx.cookie(), "Dr Rao", "KA-DR-88");
    UUID invoiceId = createDraft(fx, product, customerId, doctorId, true, "pdf-1");
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/pricing")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"expectedVersion":1,"customerGstin":"29AAAAA0000A1Z5","billDiscountType":"NONE","billDiscountValue":0,"lines":[]}
                    """))
        .andExpect(status().isOk());
    completeCash(fx, invoiceId, 2, "pdf-complete-1");
    UUID lineId = lineId(fx, invoiceId);
    mockMvc
        .perform(
            post("/api/v1/sales/returns")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(returnJson(invoiceId, lineId, "1", "CASH", "Wrong strength", "pdf-sr-1")))
        .andExpect(status().isOk());

    SalesInvoice invoice = salesInvoiceRepository.findById(invoiceId).orElseThrow();
    MvcResult pdf =
        mockMvc
            .perform(get("/api/v1/sales/invoices/" + invoiceId + "/pdf").cookie(fx.cookie()))
            .andExpect(status().isOk())
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PDF))
            .andExpect(
                header()
                    .string(
                        HttpHeaders.CONTENT_DISPOSITION,
                        org.hamcrest.Matchers.containsString("attachment")))
            .andReturn();
    byte[] bytes = pdf.getResponse().getContentAsByteArray();
    PdfReader reader = new PdfReader(bytes);
    assertThat(
            InvoicePdfPolicy.isA4(
                reader.getPageSize(1).getWidth(), reader.getPageSize(1).getHeight()))
        .isTrue();
    String text = new PdfTextExtractor(reader).getTextFromPage(1);
    reader.close();
    assertThat(text)
        .contains("Varshmaan Pharma LLP")
        .contains("12 MG Road")
        .contains("9876543210")
        .contains("29ABCDE1234F1Z5")
        .contains("ABCDE1234F")
        .contains("KA-DL-20-21-12345")
        .contains(invoice.getInvoiceNumber())
        .contains("Meera Patient")
        .contains("44 Koramangala")
        .contains("29AAAAA0000A1Z5")
        .contains("Schedule H1 Pack")
        .contains("LOT-HH")
        .contains("30049099")
        .contains("CASH")
        .contains("RX-PDF-1")
        .contains("Dr Rao")
        .contains("KA-DR-88")
        .contains("Ravi Pharmacist")
        .contains("KA-PCI-7788")
        .contains("H1")
        .contains("Wrong strength")
        .contains("Return / refund")
        .contains("computer-generated");
  }

  @Test
  void ac02_thermalFormatIsOutOfScope() throws Exception {
    Fixture fx = seed("pdf-ac02");
    Stocked product = stocked(fx, "PDF-2", "Walk-in Pack", false);
    UUID invoiceId = createDraft(fx, product, null, null, false, "pdf-2");
    completeCash(fx, invoiceId, 1, "pdf-complete-2");
    mockMvc
        .perform(get("/api/v1/sales/invoices/" + invoiceId + "/thermal").cookie(fx.cookie()))
        .andExpect(status().isNotFound());
    MvcResult pdf =
        mockMvc
            .perform(get("/api/v1/sales/invoices/" + invoiceId + "/pdf").cookie(fx.cookie()))
            .andExpect(status().isOk())
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PDF))
            .andReturn();
    assertThat(pdf.getResponse().getContentType()).doesNotContain("thermal");
  }

  @Test
  void ac04_salesInvoiceHealthReportsUp() throws Exception {
    Fixture fx = seed("pdf-health");
    mockMvc
        .perform(get("/api/v1/sales/invoices/health").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.status").value("UP"));
    mockMvc.perform(get("/api/v1/sales/invoices/health")).andExpect(status().isUnauthorized());
  }

  @Test
  void ac05_completeRetainsNeutralEinvoiceStatusWithoutIrn() throws Exception {
    Fixture fx = seed("pdf-ac05");
    Stocked product = stocked(fx, "PDF-5", "Einvoice Pack", false);
    UUID invoiceId = createDraft(fx, product, null, null, false, "pdf-5");
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    completeJson(
                        1,
                        TOTAL,
                        0,
                        "pdf-complete-5",
                        "{\"mode\":\"CASH\",\"amountPaise\":11200}")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.einvoiceApplicability").value("NOT_APPLICABLE"))
        .andExpect(jsonPath("$.data.einvoiceStatus").value("NOT_SUBMITTED"))
        .andExpect(jsonPath("$.data.einvoiceIrn").value(org.hamcrest.Matchers.nullValue()));
    SalesInvoice invoice = salesInvoiceRepository.findById(invoiceId).orElseThrow();
    assertThat(invoice.getEinvoiceApplicability()).isEqualTo(EinvoiceApplicability.NOT_APPLICABLE);
    assertThat(invoice.getEinvoiceStatus()).isEqualTo(EinvoiceStatus.NOT_SUBMITTED);
    assertThat(invoice.getEinvoiceIrn()).isNull();
    assertThat(invoice.getEinvoiceAckNo()).isNull();
    assertThat(invoice.getEinvoiceAckAt()).isNull();
  }

  @Test
  void ac07_pdfDoesNotMutateInvoiceAndDeniesUnauthorizedScope() throws Exception {
    Fixture fx = seed("pdf-ac07");
    Stocked product = stocked(fx, "PDF-7", "Isolation Pack", false);
    UUID draftId = createDraft(fx, product, null, null, false, "pdf-7d");
    mockMvc
        .perform(get("/api/v1/sales/invoices/" + draftId + "/pdf").cookie(fx.cookie()))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value(InvoicePdfPolicy.NOT_COMPLETED));
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + draftId + "/hold")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expectedVersion\":1}"))
        .andExpect(status().isOk());
    mockMvc
        .perform(get("/api/v1/sales/invoices/" + draftId + "/pdf").cookie(fx.cookie()))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value(InvoicePdfPolicy.NOT_COMPLETED));

    UUID invoiceId = createDraft(fx, product, null, null, false, "pdf-7c");
    completeCash(fx, invoiceId, 1, "pdf-complete-7");
    SalesInvoice before = salesInvoiceRepository.findById(invoiceId).orElseThrow();
    Instant updatedAt = before.getUpdatedAt();
    int version = before.getVersion();
    mockMvc
        .perform(get("/api/v1/sales/invoices/" + invoiceId + "/pdf").cookie(fx.cookie()))
        .andExpect(status().isOk());
    SalesInvoice after = salesInvoiceRepository.findById(invoiceId).orElseThrow();
    assertThat(after.getStatus()).isEqualTo(SalesInvoiceStatus.COMPLETED);
    assertThat(after.getVersion()).isEqualTo(version);
    assertThat(after.getUpdatedAt()).isEqualTo(updatedAt);

    mockMvc
        .perform(get("/api/v1/sales/invoices/" + invoiceId + "/pdf"))
        .andExpect(status().isUnauthorized());

    AppUser invOnly = persistUser(fx.tenantId(), "inv@pdf-ac07.local", AppUserRole.pharmacy_staff);
    UUID invRole = createRole(fx.cookie(), "Store", "[\"INVENTORY\"]");
    mockMvc
        .perform(
            put("/api/v1/users/" + invOnly.getId() + "/roles")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleIds\":[\"" + invRole + "\"]}"))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            put("/api/v1/users/" + invOnly.getId() + "/branches")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchIds\":[\"" + fx.branchId() + "\"]}"))
        .andExpect(status().isOk());
    Cookie invCookie = login("inv@pdf-ac07.local");
    mockMvc
        .perform(
            post("/api/v1/session/branch")
                .cookie(invCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchId\":\"" + fx.branchId() + "\"}"))
        .andExpect(status().isOk());
    mockMvc
        .perform(get("/api/v1/sales/invoices/" + invoiceId + "/pdf").cookie(invCookie))
        .andExpect(status().isForbidden());

    Location otherBranch = persistBranch(fx.tenantId(), "Other outlet", "BR02", false);
    mockMvc
        .perform(
            post("/api/v1/session/branch")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchId\":\"" + otherBranch.getId() + "\"}"))
        .andExpect(status().isOk());
    mockMvc
        .perform(get("/api/v1/sales/invoices/" + invoiceId + "/pdf").cookie(fx.cookie()))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));

    Tenant other = persistTenant("other-pdf", "Other Pdf");
    persistPlan(other.getId(), PlanCode.FREE);
    persistUser(other.getId(), "owner@other-pdf.local", AppUserRole.pharmacy_owner);
    Location otherTenantBranch = persistBranch(other.getId(), "Other", "BR01", true);
    Cookie otherCookie = login("owner@other-pdf.local");
    mockMvc
        .perform(
            post("/api/v1/session/branch")
                .cookie(otherCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchId\":\"" + otherTenantBranch.getId() + "\"}"))
        .andExpect(status().isOk());
    mockMvc
        .perform(get("/api/v1/sales/invoices/" + invoiceId + "/pdf").cookie(otherCookie))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
  }

  private UUID lineId(Fixture fx, UUID invoiceId) {
    return salesInvoiceLineRepository
        .findAllBySalesInvoiceIdAndTenantIdAndBranchIdOrderBySortOrderAsc(
            invoiceId, fx.tenantId(), fx.branchId())
        .get(0)
        .getId();
  }

  private void completeCash(Fixture fx, UUID invoiceId, int version, String key) throws Exception {
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    completeJson(
                        version, TOTAL, 0, key, "{\"mode\":\"CASH\",\"amountPaise\":11200}")))
        .andExpect(status().isOk());
  }

  private UUID createDraft(
      Fixture fx, Stocked product, UUID customerId, UUID doctorId, boolean verified, String key)
      throws Exception {
    String customer = customerId == null ? "null" : "\"" + customerId + "\"";
    String doctor = doctorId == null ? "null" : "\"" + doctorId + "\"";
    String reference = verified ? "\"RX-PDF-1\"" : "null";
    String prescribed = verified ? "1" : "null";
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
                          "doctorId":%s,
                          "prescriptionReference":%s,
                          "prescriptionVerified":%s,
                          "idempotencyKey":"%s",
                          "lines":[{
                            "productId":"%s",
                            "batchId":"%s",
                            "quantity":1,
                            "unit":"Tablet",
                            "mrpPaise":12000,
                            "sellingPricePaise":10000,
                            "discountPaise":0,
                            "prescribedQuantity":%s
                          }]
                        }
                        """
                            .formatted(
                                customer,
                                doctor,
                                reference,
                                verified,
                                key,
                                product.productId(),
                                product.batchId(),
                                prescribed)))
            .andExpect(status().isOk())
            .andReturn();
    return UUID.fromString(
        objectMapper
            .readTree(created.getResponse().getContentAsString())
            .path("data")
            .path("id")
            .asText());
  }

  private UUID createCustomer(
      Cookie cookie, String name, String phone, String email, String address) throws Exception {
    String body =
        mockMvc
            .perform(
                post("/api/v1/customers")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        "{\"name\":\"%s\",\"phone\":\"%s\",\"email\":\"%s\",\"address\":\"%s\"}"
                            .formatted(name, phone, email, address)))
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

  private Stocked stocked(Fixture fx, String sku, String name, boolean controlled)
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
                                .content(productJson(sku, name, categoryId, controlled)))
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
                    "{\"productId\":\"%s\",\"batchNumber\":\"LOT-HH\",\"manufacturedOn\":\"2026-01-15\",\"expiresOn\":\"2027-06-30\",\"purchasePricePaise\":12500,\"quantity\":\"10\",\"idempotencyKey\":\"%s-recv\",\"expectedVersion\":0}"
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
    Tenant tenant = persistTenant(tag, "Hold " + tag);
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

  private void persistKyc(Fixture fx) {
    KycSubmission kyc = new KycSubmission();
    kyc.setId(UUID.randomUUID());
    kyc.setTenantId(fx.tenantId());
    kyc.setLegalName("Varshmaan Pharma LLP");
    kyc.setDrugLicenseNumber("KA-DL-20-21-12345");
    kyc.setPan("ABCDE1234F");
    kyc.setGstin("29ABCDE1234F1Z5");
    kyc.setAddressLine1("12 MG Road");
    kyc.setCity("Bengaluru");
    kyc.setState("KA");
    kyc.setPincode("560001");
    kyc.setContactPhone("9876543210");
    kyc.setStatus(KycSubmissionStatus.APPROVED);
    kyc.setSubmittedBy(fx.userId());
    kyc.setSubmittedAt(T0);
    kyc.setCreatedAt(T0);
    kyc.setUpdatedAt(T0);
    kycSubmissionRepository.saveAndFlush(kyc);
  }

  private void persistPharmacist(Fixture fx) {
    AppUser owner = appUserRepository.findById(fx.userId()).orElseThrow();
    owner.setDisplayName("Ravi Pharmacist");
    appUserRepository.saveAndFlush(owner);
    StaffRegistration registration = new StaffRegistration();
    registration.setId(UUID.randomUUID());
    registration.setTenantId(fx.tenantId());
    registration.setUserId(fx.userId());
    registration.setKind(StaffRegistrationKind.PHARMACIST);
    registration.setLicenseNumber("KA-PCI-7788");
    registration.setStatus(StaffRegistrationStatus.APPROVED);
    registration.setCreatedAt(T0);
    staffRegistrationRepository.saveAndFlush(registration);
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

  private static String completeJson(
      int version, long expectedTotal, long change, String key, String payments) {
    return """
        {
          "expectedVersion":%d,
          "expectedTotalPaise":%d,
          "changePaise":%d,
          "idempotencyKey":"%s",
          "payments":[%s]
        }
        """
        .formatted(version, expectedTotal, change, key, payments);
  }

  private static String returnJson(
      UUID invoiceId,
      UUID lineId,
      String quantity,
      String refundMode,
      String reason,
      String idempotencyKey) {
    return """
        {
          "salesInvoiceId":"%s",
          "reason":"%s",
          "decision":"APPROVED",
          "refundMode":"%s",
          "idempotencyKey":"%s",
          "lines":[{"salesInvoiceLineId":"%s","quantity":%s}]
        }
        """
        .formatted(invoiceId, reason, refundMode, idempotencyKey, lineId, quantity);
  }

  private static String productJson(String sku, String name, UUID categoryId, boolean controlled) {
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
          "taxCategory":"GST-12",
          "requiresBatchTracking":true,
          "requiresExpiryTracking":true,
          "requiresSerialTracking":false,
          "controlledSubstance":%s,
          "notes":null,
          "isActive":true
        }
        """
        .formatted(sku, name, categoryId, controlled, controlled ? "\"H1\"" : "null", controlled);
  }

  private record Fixture(UUID tenantId, UUID branchId, UUID userId, Cookie cookie) {}

  private record Stocked(UUID productId, UUID batchId) {}
}
