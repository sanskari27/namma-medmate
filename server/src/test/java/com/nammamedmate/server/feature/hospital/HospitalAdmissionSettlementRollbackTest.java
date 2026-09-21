package com.nammamedmate.server.feature.hospital;

import static org.assertj.core.api.Assertions.assertThat;
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
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.BranchType;
import com.nammamedmate.server.domain.HospitalAdmissionStatus;
import com.nammamedmate.server.domain.HospitalBedOccupancy;
import com.nammamedmate.server.domain.HospitalPolicy;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.SalesInvoice;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.HospitalAdmissionRepository;
import com.nammamedmate.server.persistence.HospitalBedRepository;
import com.nammamedmate.server.persistence.HospitalPatientSettlementRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.SalesInvoicePaymentRepository;
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

class HospitalAdmissionSettlementRollbackTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-21T07:30:00Z");
  private static final String PHARMACY_GSTIN = "29AAAAA0000A1Z5";

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private SalesInvoiceRepository salesInvoiceRepository;
  @Autowired private SalesInvoicePaymentRepository salesInvoicePaymentRepository;
  @Autowired private HospitalAdmissionRepository hospitalAdmissionRepository;
  @Autowired private HospitalBedRepository hospitalBedRepository;
  @Autowired private HospitalPatientSettlementRepository hospitalPatientSettlementRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @Test
  void tpaIncompleteDischargeLeavesOccupiedAndUnpaid() throws Exception {
    Cookie cookie = seedOwner("set-roll");
    JsonNode ward =
        objectMapper
            .readTree(
                mockMvc
                    .perform(
                        post("/api/v1/hospital/wards")
                            .cookie(cookie)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(
                                "{\"name\":\"General\",\"code\":\"GEN\",\"category\":\"GENERAL\",\"capacity\":1}"))
                    .andExpect(status().isOk())
                    .andReturn()
                    .getResponse()
                    .getContentAsString())
            .path("data");
    UUID wardId = UUID.fromString(ward.path("id").asText());
    UUID bedId = UUID.fromString(ward.path("beds").get(0).path("id").asText());
    UUID admissionId =
        UUID.fromString(
            objectMapper
                .readTree(
                    mockMvc
                        .perform(
                            post("/api/v1/hospital/admissions")
                                .cookie(cookie)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                    """
                                    {
                                      "patientName":"Roll Stay",
                                      "uhid":"UHID-ROLL",
                                      "wardId":"%s",
                                      "bedId":"%s",
                                      "phone":"9876500888",
                                      "payerType":"SELF_PAY"
                                    }
                                    """
                                        .formatted(wardId, bedId)))
                        .andExpect(status().isOk())
                        .andReturn()
                        .getResponse()
                        .getContentAsString())
                .path("data")
                .path("id")
                .asText());
    Stocked product = stocked(cookie, "ROL-S", "Roll Pack");
    UUID customerId = createCustomer(cookie, "Roll Stay", "9876500888");
    setLimit(cookie, customerId);
    UUID invoiceId = createDraft(cookie, product, customerId, "UHID-ROLL", wardId, admissionId);
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/complete")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"expectedVersion":1,"expectedTotalPaise":11200,"changePaise":0,"idempotencyKey":"roll-c","payments":[{"mode":"CREDIT","amountPaise":11200}]}
                    """))
        .andExpect(status().isOk());
    long version =
        objectMapper
            .readTree(
                mockMvc
                    .perform(get("/api/v1/hospital/active-patients/" + admissionId).cookie(cookie))
                    .andExpect(status().isOk())
                    .andReturn()
                    .getResponse()
                    .getContentAsString())
            .path("data")
            .path("version")
            .asLong();
    int paymentsBefore = salesInvoicePaymentRepository.findAll().size();

    mockMvc
        .perform(
            post("/api/v1/hospital/admissions/" + admissionId + "/discharge")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "expectedVersion":%d,
                      "paymentMode":"INSURANCE_TPA",
                      "idempotencyKey":"roll-d",
                      "insurerName":"Star Health",
                      "policyNumber":null
                    }
                    """
                        .formatted(version)))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value(HospitalPolicy.TPA_INCOMPLETE));

    assertThat(hospitalAdmissionRepository.findById(admissionId).orElseThrow().getStatus())
        .isEqualTo(HospitalAdmissionStatus.ACTIVE);
    assertThat(hospitalBedRepository.findById(bedId).orElseThrow().getOccupancyStatus())
        .isEqualTo(HospitalBedOccupancy.OCCUPIED);
    SalesInvoice invoice = salesInvoiceRepository.findById(invoiceId).orElseThrow();
    assertThat(invoice.getAmountDuePaise()).isEqualTo(11200L);
    assertThat(salesInvoicePaymentRepository.findAll()).hasSize(paymentsBefore);
    assertThat(hospitalPatientSettlementRepository.count()).isZero();
  }

  @Test
  void bedAlreadyFreeRollsBackInvoicePayments() throws Exception {
    Cookie cookie = seedOwner("set-roll2");
    JsonNode ward =
        objectMapper
            .readTree(
                mockMvc
                    .perform(
                        post("/api/v1/hospital/wards")
                            .cookie(cookie)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(
                                "{\"name\":\"General\",\"code\":\"GEN\",\"category\":\"GENERAL\",\"capacity\":1}"))
                    .andExpect(status().isOk())
                    .andReturn()
                    .getResponse()
                    .getContentAsString())
            .path("data");
    UUID wardId = UUID.fromString(ward.path("id").asText());
    UUID bedId = UUID.fromString(ward.path("beds").get(0).path("id").asText());
    UUID admissionId =
        UUID.fromString(
            objectMapper
                .readTree(
                    mockMvc
                        .perform(
                            post("/api/v1/hospital/admissions")
                                .cookie(cookie)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                    """
                                    {
                                      "patientName":"Free Bed",
                                      "uhid":"UHID-FREE",
                                      "wardId":"%s",
                                      "bedId":"%s",
                                      "phone":"9876500777",
                                      "payerType":"SELF_PAY"
                                    }
                                    """
                                        .formatted(wardId, bedId)))
                        .andExpect(status().isOk())
                        .andReturn()
                        .getResponse()
                        .getContentAsString())
                .path("data")
                .path("id")
                .asText());
    Stocked product = stocked(cookie, "FRE-S", "Free Pack");
    UUID customerId = createCustomer(cookie, "Free Bed", "9876500777");
    setLimit(cookie, customerId);
    UUID invoiceId = createDraft(cookie, product, customerId, "UHID-FREE", wardId, admissionId);
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/complete")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"expectedVersion":1,"expectedTotalPaise":11200,"changePaise":0,"idempotencyKey":"free-c","payments":[{"mode":"CREDIT","amountPaise":11200}]}
                    """))
        .andExpect(status().isOk());
    var bed = hospitalBedRepository.findById(bedId).orElseThrow();
    bed.setOccupancyStatus(HospitalBedOccupancy.FREE);
    hospitalBedRepository.saveAndFlush(bed);
    long version =
        objectMapper
            .readTree(
                mockMvc
                    .perform(get("/api/v1/hospital/active-patients/" + admissionId).cookie(cookie))
                    .andExpect(status().isOk())
                    .andReturn()
                    .getResponse()
                    .getContentAsString())
            .path("data")
            .path("version")
            .asLong();
    int paymentsBefore = salesInvoicePaymentRepository.findAll().size();

    mockMvc
        .perform(
            post("/api/v1/hospital/admissions/" + admissionId + "/discharge")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "expectedVersion":%d,
                      "paymentMode":"CASH",
                      "idempotencyKey":"free-d"
                    }
                    """
                        .formatted(version)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value(HospitalPolicy.STALE_STATE));

    assertThat(hospitalAdmissionRepository.findById(admissionId).orElseThrow().getStatus())
        .isEqualTo(HospitalAdmissionStatus.ACTIVE);
    assertThat(salesInvoiceRepository.findById(invoiceId).orElseThrow().getAmountDuePaise())
        .isEqualTo(11200L);
    assertThat(salesInvoicePaymentRepository.findAll()).hasSize(paymentsBefore);
    assertThat(hospitalPatientSettlementRepository.count()).isZero();
  }

  private Cookie seedOwner(String slug) throws Exception {
    Tenant tenant = persistTenant(slug);
    persistPlan(tenant.getId());
    persistUser(tenant.getId(), "owner@" + slug + ".local");
    Location branch = persistBranch(tenant.getId());
    Cookie cookie = login("owner@" + slug + ".local");
    mockMvc
        .perform(
            post("/api/v1/session/branch")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchId\":\"" + branch.getId() + "\"}"))
        .andExpect(status().isOk());
    return cookie;
  }

  private Stocked stocked(Cookie cookie, String sku, String name) throws Exception {
    UUID categoryId =
        UUID.fromString(
            objectMapper
                .readTree(
                    mockMvc
                        .perform(
                            post("/api/v1/product-categories")
                                .cookie(cookie)
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
                                .cookie(cookie)
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
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"productId\":\"%s\",\"batchNumber\":\"LOT-R\",\"manufacturedOn\":\"2026-01-15\",\"expiresOn\":\"2027-06-30\",\"purchasePricePaise\":12500,\"quantity\":\"10\",\"idempotencyKey\":\"%s-recv\",\"expectedVersion\":0}"
                        .formatted(productId, sku)))
        .andExpect(status().isOk());
    UUID batchId =
        UUID.fromString(
            objectMapper
                .readTree(
                    mockMvc
                        .perform(
                            get("/api/v1/inventory/products/" + productId + "/batches")
                                .cookie(cookie))
                        .andExpect(status().isOk())
                        .andReturn()
                        .getResponse()
                        .getContentAsString())
                .path("data")
                .path("items")
                .get(0)
                .path("batchId")
                .asText());
    return new Stocked(productId, batchId);
  }

  private UUID createDraft(
      Cookie cookie, Stocked product, UUID customerId, String uhid, UUID wardId, UUID admissionId)
      throws Exception {
    return UUID.fromString(
        objectMapper
            .readTree(
                mockMvc
                    .perform(
                        post("/api/v1/sales/invoices")
                            .cookie(cookie)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(
                                """
                                {
                                  "customerId":"%s",
                                  "saleSource":"WARD",
                                  "uhid":"%s",
                                  "wardId":"%s",
                                  "admissionId":"%s",
                                  "prescriptionVerified":false,
                                  "idempotencyKey":"%s",
                                  "lines":[{"productId":"%s","batchId":"%s","quantity":1,"unit":"Tablet","mrpPaise":12000,"sellingPricePaise":10000,"discountPaise":0}]
                                }
                                """
                                    .formatted(
                                        customerId,
                                        uhid,
                                        wardId,
                                        admissionId,
                                        UUID.randomUUID(),
                                        product.productId(),
                                        product.batchId())))
                    .andExpect(status().isOk())
                    .andReturn()
                    .getResponse()
                    .getContentAsString())
            .path("data")
            .path("id")
            .asText());
  }

  private void setLimit(Cookie cookie, UUID customerId) throws Exception {
    mockMvc
        .perform(
            put("/api/v1/customers/" + customerId + "/credit/limit")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"limitPaise\":50000,\"expectedVersion\":0}"))
        .andExpect(status().isOk());
  }

  private UUID createCustomer(Cookie cookie, String name, String phone) throws Exception {
    return UUID.fromString(
        objectMapper
            .readTree(
                mockMvc
                    .perform(
                        post("/api/v1/customers")
                            .cookie(cookie)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"name\":\"%s\",\"phone\":\"%s\"}".formatted(name, phone)))
                    .andExpect(status().isOk())
                    .andReturn()
                    .getResponse()
                    .getContentAsString())
            .path("data")
            .path("id")
            .asText());
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
    branch.setDrugLicenseNumber("DL-BR01");
    branch.setGstin(PHARMACY_GSTIN);
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
    sub.setPlanCode(PlanCode.PRO);
    sub.setStatus(SubscriptionStatus.ACTIVE);
    sub.setStartedAt(T0);
    sub.setCreatedAt(T0);
    sub.setUpdatedAt(T0);
    tenantSubscriptionRepository.saveAndFlush(sub);
  }

  private Tenant persistTenant(String slug) {
    Tenant tenant = new Tenant();
    tenant.setId(UUID.randomUUID());
    tenant.setSlug(slug);
    tenant.setName(slug + " Chemist");
    tenant.setStatus(TenantStatus.ACTIVE);
    tenant.setEmailVerifiedAt(T0);
    tenant.setCreatedAt(T0);
    tenant.setUpdatedAt(T0);
    return tenantRepository.saveAndFlush(tenant);
  }

  private AppUser persistUser(UUID tenantId, String email) {
    AppUser user = new AppUser();
    user.setId(UUID.randomUUID());
    user.setTenantId(tenantId);
    user.setEmail(email);
    user.setPasswordHash(passwordEncoder.encode(PASSWORD));
    user.setDisplayName(email);
    user.setRole(AppUserRole.pharmacy_owner);
    user.setStatus(UserAccountStatus.ACTIVE);
    user.setActive(true);
    user.setMustChangePassword(false);
    user.setCreatedAt(T0);
    user.setUpdatedAt(T0);
    user.setPasswordChangedAt(T0);
    return appUserRepository.saveAndFlush(user);
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
    return result.getResponse().getCookie("nmm_access");
  }

  private static String productJson(String sku, String name, UUID categoryId) {
    return """
        {"sku":"%s","barcode":null,"name":"%s","genericName":null,"brandName":null,"manufacturerId":null,"categoryId":"%s","productType":"Medicine","dosageForm":"Tablet","therapeuticClass":null,"composition":null,"strength":null,"route":null,"prescriptionRequired":false,"scheduleClassification":null,"hsnCode":"30049099","gstRate":12,"baseUnit":"Tablet","packSize":10,"packUnit":"strip","packDescription":null,"storageConditions":null,"requiresColdStorage":false,"rackLocation":null,"reorderLevel":null,"reorderQuantity":null,"minimumStock":null,"isDiscontinued":false,"isReturnable":true,"isTaxable":true,"taxCategory":"GST-12","requiresBatchTracking":true,"requiresExpiryTracking":true,"requiresSerialTracking":false,"controlledSubstance":false,"notes":null,"isActive":true}
        """
        .formatted(sku, name, categoryId);
  }

  private record Stocked(UUID productId, UUID batchId) {}
}
