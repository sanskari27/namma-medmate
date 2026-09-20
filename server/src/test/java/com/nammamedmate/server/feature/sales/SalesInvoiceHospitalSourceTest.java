package com.nammamedmate.server.feature.sales;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.startsWith;
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
import com.nammamedmate.server.domain.HospitalAdmission;
import com.nammamedmate.server.domain.HospitalAdmissionStatus;
import com.nammamedmate.server.domain.InvoiceHospitalSalePolicy;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.CustomerCreditLedgerEntryRepository;
import com.nammamedmate.server.persistence.HospitalAdmissionRepository;
import com.nammamedmate.server.persistence.HospitalCreditAccountRepository;
import com.nammamedmate.server.persistence.HospitalIssueRepository;
import com.nammamedmate.server.persistence.HospitalLedgerEntryRepository;
import com.nammamedmate.server.persistence.HospitalWsInvoiceSequenceRepository;
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

class SalesInvoiceHospitalSourceTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-21T06:00:00Z");
  private static final long TOTAL = 11200L;
  private static final String HOSPITAL_GSTIN = "29ABCDE1234F1Z5";
  private static final String PHARMACY_GSTIN = "29AAAAA0000A1Z5";

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private SalesInvoiceRepository salesInvoiceRepository;
  @Autowired private HospitalAdmissionRepository hospitalAdmissionRepository;
  @Autowired private HospitalCreditAccountRepository hospitalCreditAccountRepository;
  @Autowired private HospitalLedgerEntryRepository hospitalLedgerEntryRepository;
  @Autowired private HospitalIssueRepository hospitalIssueRepository;
  @Autowired private HospitalWsInvoiceSequenceRepository hospitalWsInvoiceSequenceRepository;
  @Autowired private CustomerCreditLedgerEntryRepository customerCreditLedgerEntryRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @Test
  void ac01_counterDraftStoresSourceWithoutUhid() throws Exception {
    Fixture fx = seedPro("src-counter");
    Stocked product = stocked(fx, "CTR-1", "Counter Pack");

    mockMvc
        .perform(
            post("/api/v1/sales/invoices")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(draftJson(product, null, "src-ctr-1", "COUNTER", null, null, null)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.saleSource").value("COUNTER"))
        .andExpect(jsonPath("$.data.invoiceNumber").value(startsWith("INV/")));
  }

  @Test
  void ac01_opdRxStoresSourceOnDraftAndComplete() throws Exception {
    Fixture fx = seedPro("src-opd");
    Stocked product = stocked(fx, "OPD-1", "Opd Pack");
    UUID invoiceId = createDraft(fx, product, null, "src-opd-1", "OPD_RX", null, null, null);

    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(completeJson(1, TOTAL, 0, "src-opd-c", cash(TOTAL), null, null)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.saleSource").value("OPD_RX"))
        .andExpect(jsonPath("$.data.status").value("COMPLETED"))
        .andExpect(jsonPath("$.data.invoiceNumber").value(startsWith("INV/")));
  }

  @Test
  void ac02_wardCompleteWritesInvNotWs() throws Exception {
    Fixture fx = seedPro("src-ward");
    configureAccount(fx);
    WardBed ward = createWard(fx, "General", "GEN", 2);
    UUID admissionId = admit(fx, "Ravi Kumar", "UHID-00021", ward, "9876500021");
    Stocked product = stocked(fx, "WRD-1", "Ward Pack");
    issueFloorStock(fx, ward.wardId(), product, "src-ward-ws");
    long arBefore =
        hospitalCreditAccountRepository
            .findByTenantId(fx.tenantId())
            .orElseThrow()
            .getBalancePaise();
    long ledgerBefore = hospitalLedgerEntryRepository.count();
    long issuesBefore = hospitalIssueRepository.count();
    int wsNextBefore =
        hospitalWsInvoiceSequenceRepository.findAll().stream()
            .mapToInt(row -> row.getNextValue())
            .findFirst()
            .orElse(0);

    UUID invoiceId =
        createDraft(
            fx, product, null, "src-ward-1", "WARD", "UHID-00021", ward.wardId(), admissionId);
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(completeJson(1, TOTAL, 0, "src-ward-c", cash(TOTAL), null, null)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.saleSource").value("WARD"))
        .andExpect(jsonPath("$.data.uhid").value("UHID-00021"))
        .andExpect(jsonPath("$.data.wardId").value(ward.wardId().toString()))
        .andExpect(jsonPath("$.data.admissionId").value(admissionId.toString()))
        .andExpect(jsonPath("$.data.invoiceNumber").value(startsWith("INV/")));

    assertThat(salesInvoiceRepository.findById(invoiceId).orElseThrow().getInvoiceNumber())
        .startsWith("INV/");
    assertThat(
            hospitalCreditAccountRepository
                .findByTenantId(fx.tenantId())
                .orElseThrow()
                .getBalancePaise())
        .isEqualTo(arBefore);
    assertThat(hospitalLedgerEntryRepository.count()).isEqualTo(ledgerBefore);
    assertThat(hospitalIssueRepository.count()).isEqualTo(issuesBefore);
    assertThat(
            hospitalWsInvoiceSequenceRepository.findAll().stream()
                .mapToInt(row -> row.getNextValue())
                .findFirst()
                .orElse(0))
        .isEqualTo(wsNextBefore);
  }

  @Test
  void ac03_wardMissingUhidOrWardIs422() throws Exception {
    Fixture fx = seedPro("src-miss");
    WardBed ward = createWard(fx, "General", "GEN", 1);
    admit(fx, "Missing", "UHID-00031", ward, null);
    Stocked product = stocked(fx, "MIS-1", "Missing Pack");

    mockMvc
        .perform(
            post("/api/v1/sales/invoices")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(draftJson(product, null, "src-miss-u", "WARD", null, ward.wardId(), null)))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value(InvoiceHospitalSalePolicy.UHID_REQUIRED));

    mockMvc
        .perform(
            post("/api/v1/sales/invoices")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(draftJson(product, null, "src-miss-w", "WARD", "UHID-00031", null, null)))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value(InvoiceHospitalSalePolicy.WARD_REQUIRED));
  }

  @Test
  void ac03_emergencyAllowsCasualtyWithoutWard() throws Exception {
    Fixture fx = seedPro("src-cas");
    Stocked product = stocked(fx, "CAS-1", "Casualty Pack");
    UUID invoiceId =
        createDraft(fx, product, null, "src-cas-1", "EMERGENCY", "UHID-CAS-1", null, null);

    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(completeJson(1, TOTAL, 0, "src-cas-c", cash(TOTAL), null, null)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.saleSource").value("EMERGENCY"))
        .andExpect(jsonPath("$.data.uhid").value("UHID-CAS-1"))
        .andExpect(jsonPath("$.data.invoiceNumber").value(startsWith("INV/")));
  }

  @Test
  void ac04_wardKhataStillChargesCustomerCredit() throws Exception {
    Fixture fx = seedPro("src-khata");
    WardBed ward = createWard(fx, "General", "GEN", 1);
    UUID admissionId = admit(fx, "Khata Patient", "UHID-00041", ward, "9876500041");
    Stocked product = stocked(fx, "KHT-1", "Khata Pack");
    UUID customerId = createCustomer(fx.cookie(), "Khata Patient", "9876500041");
    setLimit(fx.cookie(), customerId, 50_000, 0);
    configureAccount(fx);
    long arBefore =
        hospitalCreditAccountRepository
            .findByTenantId(fx.tenantId())
            .map(account -> account.getBalancePaise())
            .orElse(0L);
    long customerLedgerBefore = customerCreditLedgerEntryRepository.count();

    UUID invoiceId =
        createDraft(
            fx, product, customerId, "src-kht-1", "WARD", "UHID-00041", ward.wardId(), admissionId);
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
                        "src-kht-c",
                        "{\"mode\":\"CREDIT\",\"amountPaise\":11200}",
                        null,
                        null)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.amountDuePaise").value(11200));

    assertThat(customerCreditLedgerEntryRepository.count()).isEqualTo(customerLedgerBefore + 1);
    assertThat(
            hospitalCreditAccountRepository
                .findByTenantId(fx.tenantId())
                .map(account -> account.getBalancePaise())
                .orElse(0L))
        .isEqualTo(arBefore);
  }

  @Test
  void ac04_insuranceTpaSnapshotsInsurerWithoutGateway() throws Exception {
    Fixture fx = seedPro("src-tpa");
    Stocked product = stocked(fx, "TPA-1", "Tpa Pack");
    UUID invoiceId =
        createDraft(fx, product, null, "src-tpa-1", "EMERGENCY", "UHID-TPA-1", null, null);

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
                        "src-tpa-c",
                        "{\"mode\":\"INSURANCE_TPA\",\"amountPaise\":11200}",
                        "Star Health",
                        "POL-88")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.payments[0].mode").value("INSURANCE_TPA"))
        .andExpect(jsonPath("$.data.insurerName").value("Star Health"))
        .andExpect(jsonPath("$.data.policyNumber").value("POL-88"))
        .andExpect(jsonPath("$.data.payments[0].gateway").doesNotExist());

    UUID secondId =
        UUID.fromString(
            objectMapper
                .readTree(
                    mockMvc
                        .perform(
                            post("/api/v1/sales/invoices")
                                .cookie(fx.cookie())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                    draftJson(
                                        product,
                                        null,
                                        "src-tpa-2",
                                        "EMERGENCY",
                                        "UHID-TPA-2",
                                        null,
                                        null)))
                        .andExpect(status().isOk())
                        .andReturn()
                        .getResponse()
                        .getContentAsString())
                .path("data")
                .path("id")
                .asText());
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + secondId + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    completeJson(
                        1,
                        TOTAL,
                        0,
                        "src-tpa-bad",
                        "{\"mode\":\"INSURANCE_TPA\",\"amountPaise\":11200}",
                        "Star Health",
                        null)))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value(InvoiceHospitalSalePolicy.TPA_INCOMPLETE));
  }

  @Test
  void ac05_foreignUhidIs404() throws Exception {
    Fixture home = seedPro("src-home");
    Fixture other = seedPro("src-away");
    WardBed otherWard = createWard(other, "Away", "AWY", 1);
    admit(other, "Away Patient", "UHID-AWAY", otherWard, null);
    WardBed homeWard = createWard(home, "Home", "HME", 1);
    Stocked product = stocked(home, "FOR-1", "Foreign Pack");

    mockMvc
        .perform(
            post("/api/v1/sales/invoices")
                .cookie(home.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    draftJson(
                        product, null, "src-for-1", "WARD", "UHID-AWAY", homeWard.wardId(), null)))
        .andExpect(status().isNotFound());
  }

  @Test
  void ac05_otherBranchUhidIs404() throws Exception {
    Fixture home = seedPro("src-xbr");
    Location annex = persistBranch(home.tenantId(), "Annex", "BR02", false);
    selectBranch(home.cookie(), annex.getId());
    Fixture annexFx = new Fixture(home.tenantId(), annex.getId(), home.cookie());
    WardBed annexWard = createWard(annexFx, "Annex", "ANX", 1);
    admit(annexFx, "Annex Patient", "UHID-ANNEX", annexWard, null);
    selectBranch(home.cookie(), home.branchId());
    WardBed homeWard = createWard(home, "Home", "HME", 1);
    Stocked product = stocked(home, "XBR-1", "Cross Pack");
    long arBefore =
        hospitalCreditAccountRepository
            .findByTenantId(home.tenantId())
            .map(account -> account.getBalancePaise())
            .orElse(0L);
    long ledgerBefore = hospitalLedgerEntryRepository.count();
    long issuesBefore = hospitalIssueRepository.count();
    long invoicesBefore = salesInvoiceRepository.count();
    int wsNextBefore =
        hospitalWsInvoiceSequenceRepository.findAll().stream()
            .mapToInt(row -> row.getNextValue())
            .findFirst()
            .orElse(0);

    mockMvc
        .perform(
            post("/api/v1/sales/invoices")
                .cookie(home.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    draftJson(
                        product, null, "src-xbr-1", "WARD", "UHID-ANNEX", homeWard.wardId(), null)))
        .andExpect(status().isNotFound());

    assertThat(salesInvoiceRepository.count()).isEqualTo(invoicesBefore);
    assertThat(
            hospitalCreditAccountRepository
                .findByTenantId(home.tenantId())
                .map(account -> account.getBalancePaise())
                .orElse(0L))
        .isEqualTo(arBefore);
    assertThat(hospitalLedgerEntryRepository.count()).isEqualTo(ledgerBefore);
    assertThat(hospitalIssueRepository.count()).isEqualTo(issuesBefore);
    assertThat(
            hospitalWsInvoiceSequenceRepository.findAll().stream()
                .mapToInt(row -> row.getNextValue())
                .findFirst()
                .orElse(0))
        .isEqualTo(wsNextBefore);
  }

  @Test
  void ac05_dischargedAdmissionCannotTakeWardBill() throws Exception {
    Fixture fx = seedPro("src-dis");
    WardBed ward = createWard(fx, "General", "GEN", 1);
    UUID admissionId = admit(fx, "Discharged", "UHID-00051", ward, null);
    HospitalAdmission row = hospitalAdmissionRepository.findById(admissionId).orElseThrow();
    row.setStatus(HospitalAdmissionStatus.DISCHARGED);
    hospitalAdmissionRepository.saveAndFlush(row);
    Stocked product = stocked(fx, "DIS-1", "Discharged Pack");

    mockMvc
        .perform(
            post("/api/v1/sales/invoices")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    draftJson(
                        product,
                        null,
                        "src-dis-1",
                        "WARD",
                        "UHID-00051",
                        ward.wardId(),
                        admissionId)))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value(InvoiceHospitalSalePolicy.ADMISSION_DISCHARGED));
  }

  @Test
  void ac05_cashierWithoutHospitalCannotUseWardSource() throws Exception {
    Fixture fx = seedPro("src-cash");
    WardBed ward = createWard(fx, "General", "GEN", 1);
    admit(fx, "Cashier", "UHID-00061", ward, null);
    Stocked product = stocked(fx, "CSH-1", "Cashier Pack");
    Cookie cashier = staffWithPredefined(fx, "cashier", "cash@src-cash.local");

    mockMvc
        .perform(
            post("/api/v1/sales/invoices")
                .cookie(cashier)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    draftJson(
                        product, null, "src-cash-1", "WARD", "UHID-00061", ward.wardId(), null)))
        .andExpect(status().isForbidden());
  }

  @Test
  void ac05_freePlanHospitalSourceIsPlanLimit() throws Exception {
    Fixture fx = seedPlan("src-free", PlanCode.FREE);
    Stocked product = stocked(fx, "FRE-1", "Free Pack");

    mockMvc
        .perform(
            post("/api/v1/sales/invoices")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    draftJson(product, null, "src-free-1", "EMERGENCY", "UHID-FREE", null, null)))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("PLAN_LIMIT"));
  }

  @Test
  void ac05_duplicateCompleteReplaysSameInv() throws Exception {
    Fixture fx = seedPro("src-idem");
    Stocked product = stocked(fx, "IDM-1", "Idem Pack");
    UUID invoiceId =
        createDraft(fx, product, null, "src-idm-1", "EMERGENCY", "UHID-IDM", null, null);
    String body = completeJson(1, TOTAL, 0, "src-idm-c", cash(TOTAL), null, null);

    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("COMPLETED"));
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("COMPLETED"))
        .andExpect(jsonPath("$.data.invoiceNumber").value(startsWith("INV/")));
  }

  private UUID createDraft(
      Fixture fx,
      Stocked product,
      UUID customerId,
      String key,
      String source,
      String uhid,
      UUID wardId,
      UUID admissionId)
      throws Exception {
    String body =
        mockMvc
            .perform(
                post("/api/v1/sales/invoices")
                    .cookie(fx.cookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        draftJson(product, customerId, key, source, uhid, wardId, admissionId)))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return UUID.fromString(objectMapper.readTree(body).path("data").path("id").asText());
  }

  private UUID admit(Fixture fx, String name, String uhid, WardBed ward, String phone)
      throws Exception {
    String body =
        mockMvc
            .perform(
                post("/api/v1/hospital/admissions")
                    .cookie(fx.cookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "patientName":"%s",
                          "uhid":"%s",
                          "wardId":"%s",
                          "bedId":"%s",
                          "phone":%s,
                          "payerType":"SELF_PAY"
                        }
                        """
                            .formatted(
                                name,
                                uhid,
                                ward.wardId(),
                                ward.bedId(),
                                phone == null ? "null" : "\"" + phone + "\"")))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return UUID.fromString(objectMapper.readTree(body).path("data").path("id").asText());
  }

  private WardBed createWard(Fixture fx, String name, String code, int capacity) throws Exception {
    MvcResult ward =
        mockMvc
            .perform(
                post("/api/v1/hospital/wards")
                    .cookie(fx.cookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {"name":"%s","code":"%s","category":"GENERAL","capacity":%d}
                        """
                            .formatted(name, code, capacity)))
            .andExpect(status().isOk())
            .andReturn();
    JsonNode data = objectMapper.readTree(ward.getResponse().getContentAsString()).path("data");
    return new WardBed(
        UUID.fromString(data.path("id").asText()),
        UUID.fromString(data.path("beds").get(0).path("id").asText()));
  }

  private void configureAccount(Fixture fx) throws Exception {
    mockMvc
        .perform(
            put("/api/v1/hospital/account")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "institutionName":"City Care Hospital",
                      "gstin":"%s",
                      "creditTerms":"NET_30",
                      "creditLimitPaise":2000000
                    }
                    """
                        .formatted(HOSPITAL_GSTIN)))
        .andExpect(status().isOk());
  }

  private void issueFloorStock(Fixture fx, UUID wardId, Stocked product, String key)
      throws Exception {
    mockMvc
        .perform(
            put("/api/v1/hospital/prices")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"uniformDiscountBps\":1000}"))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            post("/api/v1/hospital/issues")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "wardId":"%s",
                      "reason":"FLOOR_STOCK",
                      "idempotencyKey":"%s",
                      "lines":[{"productId":"%s","batchId":"%s","quantity":"1"}]
                    }
                    """
                        .formatted(wardId, key, product.productId(), product.batchId())))
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

  private void setLimit(Cookie cookie, UUID customerId, long limitPaise, long expectedVersion)
      throws Exception {
    mockMvc
        .perform(
            put("/api/v1/customers/" + customerId + "/credit/limit")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"limitPaise\":%d,\"expectedVersion\":%d}"
                        .formatted(limitPaise, expectedVersion)))
        .andExpect(status().isOk());
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

  private Cookie staffWithPredefined(Fixture fx, String roleCode, String email) throws Exception {
    AppUser staff = persistUser(fx.tenantId(), email, AppUserRole.pharmacy_staff);
    UUID roleId = predefinedRoleId(fx.cookie(), roleCode);
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

  private UUID predefinedRoleId(Cookie owner, String code) throws Exception {
    MvcResult result = mockMvc.perform(get("/api/v1/roles").cookie(owner)).andReturn();
    var roles =
        objectMapper.readTree(result.getResponse().getContentAsString()).path("data").path("roles");
    for (var role : roles) {
      if (code.equals(role.path("code").asText())) {
        return UUID.fromString(role.path("id").asText());
      }
    }
    throw new AssertionError("missing predefined role " + code);
  }

  private Fixture seedPro(String slug) throws Exception {
    return seedPlan(slug, PlanCode.PRO);
  }

  private Fixture seedPlan(String slug, PlanCode plan) throws Exception {
    Tenant tenant = persistTenant(slug, slug + " Chemist");
    persistPlan(tenant.getId(), plan);
    persistUser(tenant.getId(), "owner@" + slug + ".local", AppUserRole.pharmacy_owner);
    Location branch = persistBranch(tenant.getId(), "Main", "BR01");
    Cookie cookie = login("owner@" + slug + ".local");
    selectBranch(cookie, branch.getId());
    return new Fixture(tenant.getId(), branch.getId(), cookie);
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

  private Location persistBranch(UUID tenantId, String name, String code) {
    return persistBranch(tenantId, name, code, true);
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
    tenantSubscriptionRepository.saveAndFlush(sub);
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
    return tenantRepository.saveAndFlush(tenant);
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
    return appUserRepository.saveAndFlush(user);
  }

  private static String draftJson(
      Stocked product,
      UUID customerId,
      String key,
      String source,
      String uhid,
      UUID wardId,
      UUID admissionId) {
    return """
        {
          "customerId":%s,
          "doctorId":null,
          "prescriptionReference":null,
          "prescriptionVerified":false,
          "idempotencyKey":"%s",
          "saleSource":"%s",
          "uhid":%s,
          "wardId":%s,
          "admissionId":%s,
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
        .formatted(
            customerId == null ? "null" : "\"" + customerId + "\"",
            key,
            source,
            uhid == null ? "null" : "\"" + uhid + "\"",
            wardId == null ? "null" : "\"" + wardId + "\"",
            admissionId == null ? "null" : "\"" + admissionId + "\"",
            product.productId(),
            product.batchId());
  }

  private static String completeJson(
      int version,
      long expectedTotal,
      long change,
      String key,
      String payments,
      String insurer,
      String policy) {
    return """
        {
          "expectedVersion":%d,
          "expectedTotalPaise":%d,
          "changePaise":%d,
          "idempotencyKey":"%s",
          "insurerName":%s,
          "policyNumber":%s,
          "payments":[%s]
        }
        """
        .formatted(
            version,
            expectedTotal,
            change,
            key,
            insurer == null ? "null" : "\"" + insurer + "\"",
            policy == null ? "null" : "\"" + policy + "\"",
            payments);
  }

  private static String cash(long amount) {
    return "{\"mode\":\"CASH\",\"amountPaise\":" + amount + "}";
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

  private record WardBed(UUID wardId, UUID bedId) {}

  private record Stocked(UUID productId, UUID batchId) {}
}
