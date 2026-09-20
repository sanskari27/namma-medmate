package com.nammamedmate.server.feature.hospital;

import static org.assertj.core.api.Assertions.assertThat;
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
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.BranchType;
import com.nammamedmate.server.domain.HospitalIssue;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.Product;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.HospitalAdmissionRepository;
import com.nammamedmate.server.persistence.HospitalBedRepository;
import com.nammamedmate.server.persistence.HospitalCreditAccountRepository;
import com.nammamedmate.server.persistence.HospitalIndentLineRepository;
import com.nammamedmate.server.persistence.HospitalIndentRepository;
import com.nammamedmate.server.persistence.HospitalIndentSequenceRepository;
import com.nammamedmate.server.persistence.HospitalIssueLineRepository;
import com.nammamedmate.server.persistence.HospitalIssueRepository;
import com.nammamedmate.server.persistence.HospitalLedgerEntryRepository;
import com.nammamedmate.server.persistence.HospitalProductPriceRuleRepository;
import com.nammamedmate.server.persistence.HospitalReturnLineRepository;
import com.nammamedmate.server.persistence.HospitalReturnRepository;
import com.nammamedmate.server.persistence.HospitalWardRepository;
import com.nammamedmate.server.persistence.HospitalWardStockRepository;
import com.nammamedmate.server.persistence.HospitalWsInvoiceSequenceRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.NotificationDeliveryRepository;
import com.nammamedmate.server.persistence.NotificationEventRepository;
import com.nammamedmate.server.persistence.NotificationRepository;
import com.nammamedmate.server.persistence.NotificationSourceRepository;
import com.nammamedmate.server.persistence.ProductRepository;
import com.nammamedmate.server.persistence.StockBalanceRepository;
import com.nammamedmate.server.persistence.StockBatchRepository;
import com.nammamedmate.server.persistence.StockMovementRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import com.nammamedmate.server.persistence.UserSessionRepository;
import jakarta.servlet.http.Cookie;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

class HospitalArTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-20T12:00:00Z");
  private static final long MRP = 10_000L;
  private static final int UNIFORM_BPS = 1_000;
  private static final long CREDIT_PRICE = 9_000L;
  private static final String HOSPITAL_GSTIN = "29ABCDE1234F1Z5";
  private static final String PHARMACY_GSTIN = "29AAAAA0000A1Z5";

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private UserSessionRepository userSessionRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private HospitalWardRepository hospitalWardRepository;
  @Autowired private HospitalBedRepository hospitalBedRepository;
  @Autowired private HospitalAdmissionRepository hospitalAdmissionRepository;
  @Autowired private HospitalIndentRepository hospitalIndentRepository;
  @Autowired private HospitalIndentLineRepository hospitalIndentLineRepository;
  @Autowired private HospitalIndentSequenceRepository hospitalIndentSequenceRepository;
  @Autowired private HospitalIssueRepository hospitalIssueRepository;
  @Autowired private HospitalIssueLineRepository hospitalIssueLineRepository;
  @Autowired private HospitalReturnRepository hospitalReturnRepository;
  @Autowired private HospitalReturnLineRepository hospitalReturnLineRepository;
  @Autowired private NotificationDeliveryRepository notificationDeliveryRepository;
  @Autowired private NotificationRepository notificationRepository;
  @Autowired private NotificationEventRepository notificationEventRepository;
  @Autowired private NotificationSourceRepository notificationSourceRepository;
  @Autowired private HospitalWsInvoiceSequenceRepository hospitalWsInvoiceSequenceRepository;
  @Autowired private HospitalWardStockRepository hospitalWardStockRepository;
  @Autowired private HospitalLedgerEntryRepository hospitalLedgerEntryRepository;
  @Autowired private HospitalCreditAccountRepository hospitalCreditAccountRepository;
  @Autowired private HospitalProductPriceRuleRepository hospitalProductPriceRuleRepository;
  @Autowired private ProductRepository productRepository;
  @Autowired private StockBatchRepository stockBatchRepository;
  @Autowired private StockBalanceRepository stockBalanceRepository;
  @Autowired private StockMovementRepository stockMovementRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @BeforeEach
  void wipe() {
    notificationDeliveryRepository.deleteAll();
    notificationRepository.deleteAll();
    notificationEventRepository.deleteAll();
    notificationSourceRepository.deleteAll();
    hospitalReturnLineRepository.deleteAll();
    hospitalLedgerEntryRepository.deleteAll();
    hospitalReturnRepository.deleteAll();
    hospitalIssueLineRepository.deleteAll();
    hospitalIssueRepository.deleteAll();
    hospitalWsInvoiceSequenceRepository.deleteAll();
    hospitalWardStockRepository.deleteAll();
    hospitalIndentLineRepository.deleteAll();
    hospitalIndentRepository.deleteAll();
    hospitalIndentSequenceRepository.deleteAll();
    hospitalAdmissionRepository.deleteAll();
    hospitalBedRepository.deleteAll();
    hospitalWardRepository.deleteAll();
    hospitalProductPriceRuleRepository.deleteAll();
    hospitalCreditAccountRepository.deleteAll();
    stockMovementRepository.deleteAll();
    stockBalanceRepository.deleteAll();
    stockBatchRepository.deleteAll();
    productRepository.deleteAll();
    userSessionRepository.deleteAll();
    locationRepository.deleteAll();
    tenantSubscriptionRepository.deleteAll();
    appUserRepository.deleteAll();
    tenantRepository.deleteAll();
  }

  @Test
  void ac01_wardStockListsOnHandValuedAtCreditPrice() throws Exception {
    Ready ready = readyIssue("ar-stock");
    UUID issueId = issueFloor(ready, "2", "ar-stock-iss");

    mockMvc
        .perform(get("/api/v1/hospital/ward-stock").cookie(ready.fx().owner()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items.length()").value(1))
        .andExpect(jsonPath("$.data.items[0].wardId").value(ready.wardId().toString()))
        .andExpect(jsonPath("$.data.items[0].quantity").value(2))
        .andExpect(jsonPath("$.data.items[0].creditPricePaise").value(CREDIT_PRICE))
        .andExpect(jsonPath("$.data.items[0].valuePaise").value(18_000));

    Location annex = persistBranch(ready.fx().tenantId(), "Annex", "AN01", false);
    Cookie ownerAnnex = login("owner@ar-stock.local");
    selectBranch(ownerAnnex, annex.getId());
    mockMvc
        .perform(get("/api/v1/hospital/ward-stock").cookie(ownerAnnex))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items").isEmpty());
    assertThat(issueId).isNotNull();
  }

  @Test
  void ac02_returnRestocksPharmacyAndCreditsHospitalAr() throws Exception {
    Ready ready = readyIssue("ar-ret");
    UUID issueId = issueFloor(ready, "2", "ar-ret-iss");
    Cookie inventory = staffWithPredefined(ready.fx(), "inventory", "inv@ar-ret.local");

    mockMvc
        .perform(
            post("/api/v1/hospital/returns")
                .cookie(inventory)
                .contentType(MediaType.APPLICATION_JSON)
                .content(returnJson(issueId, ready.productId(), "1", "ar-ret-1")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.issueId").value(issueId.toString()))
        .andExpect(jsonPath("$.data.creditPaise").value(9_000));

    assertThat(hospitalIssueRepository.count()).isEqualTo(1);
    assertThat(hospitalWardStockRepository.findAll().get(0).getQuantity())
        .isEqualByComparingTo("1");
    assertThat(
            stockBalanceRepository
                .findByTenantIdAndBranchIdAndProductIdAndBatchId(
                    ready.fx().tenantId(),
                    ready.fx().branchId(),
                    ready.productId(),
                    ready.batchId())
                .orElseThrow()
                .getQuantity())
        .isEqualByComparingTo("9");
    assertThat(hospitalCreditAccountRepository.findAll().get(0).getBalancePaise()).isEqualTo(9_000);

    mockMvc
        .perform(
            post("/api/v1/hospital/returns")
                .cookie(ready.fx().owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(returnJson(issueId, ready.productId(), "5", "ar-ret-over")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("OVER_RETURN"));
  }

  @Test
  void ac03_statementReconstructsSuppliedReturnsAndPayments() throws Exception {
    Ready ready = readyIssue("ar-stmt");
    UUID issueId = issueFloor(ready, "2", "ar-stmt-iss");
    mockMvc
        .perform(
            post("/api/v1/hospital/returns")
                .cookie(ready.fx().owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(returnJson(issueId, ready.productId(), "1", "ar-stmt-ret")))
        .andExpect(status().isOk());
    long version = hospitalCreditAccountRepository.findAll().get(0).getVersion();
    mockMvc
        .perform(
            post("/api/v1/hospital/payments")
                .cookie(ready.fx().owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(paymentJson(3_000, "UPI", "UPI-1", "ar-stmt-pay", version)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.balancePaise").value(6_000));

    mockMvc
        .perform(
            get("/api/v1/hospital/statement")
                .param("from", "2026-01-01")
                .param("to", "2026-12-31")
                .cookie(ready.fx().owner()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.suppliedPaise").value(18_000))
        .andExpect(jsonPath("$.data.creditsPaise").value(12_000))
        .andExpect(jsonPath("$.data.closingPaise").value(6_000))
        .andExpect(jsonPath("$.data.balancePaise").value(6_000))
        .andExpect(jsonPath("$.data.lines.length()").value(3))
        .andExpect(jsonPath("$.data.ageing.d0_30").value(6_000));

    Cookie accountant = staffWithPredefined(ready.fx(), "accountant", "books@ar-stmt.local");
    mockMvc
        .perform(get("/api/v1/hospital/statement").cookie(accountant))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.closingPaise").value(6_000));

    MvcResult csv =
        mockMvc
            .perform(
                get("/api/v1/hospital/statement/export")
                    .param("format", "csv")
                    .cookie(ready.fx().owner()))
            .andExpect(status().isOk())
            .andExpect(
                header()
                    .string(
                        HttpHeaders.CONTENT_DISPOSITION,
                        org.hamcrest.Matchers.containsString("hospital-statement.csv")))
            .andReturn();
    assertThat(csv.getResponse().getContentAsString()).contains("Particulars");

    mockMvc
        .perform(
            get("/api/v1/hospital/statement/export")
                .param("format", "pdf")
                .cookie(ready.fx().owner()))
        .andExpect(status().isOk())
        .andExpect(
            header()
                .string(
                    HttpHeaders.CONTENT_DISPOSITION,
                    org.hamcrest.Matchers.containsString("hospital-statement.pdf")))
        .andExpect(content().contentType(MediaType.APPLICATION_PDF));
  }

  @Test
  void ac03_patientRefillStatementOptionallyShowsUhid() throws Exception {
    Ready ready = readyIssue("ar-uhid");
    admit(ready, "Rahul", "UHID-00001");
    mockMvc
        .perform(
            post("/api/v1/hospital/issues")
                .cookie(ready.fx().owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    issueJson(
                        ready.wardId(),
                        null,
                        "PATIENT_REFILL",
                        "UHID-00001",
                        "Rahul",
                        ready.productId(),
                        ready.batchId(),
                        "1",
                        "ar-uhid-iss")))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            get("/api/v1/hospital/statement")
                .param("includePatient", "true")
                .cookie(ready.fx().owner()))
        .andExpect(status().isOk())
        .andExpect(
            jsonPath("$.data.lines[0].particulars")
                .value(org.hamcrest.Matchers.containsString("UHID-00001")));
  }

  @Test
  void ac04_paymentAgeingAndReminderWithoutTpa() throws Exception {
    Ready ready = readyIssue("ar-pay");
    issueFloor(ready, "2", "ar-pay-iss");
    Cookie accountant = staffWithPredefined(ready.fx(), "accountant", "books@ar-pay.local");
    long version = hospitalCreditAccountRepository.findAll().get(0).getVersion();

    mockMvc
        .perform(
            post("/api/v1/hospital/payments")
                .cookie(accountant)
                .contentType(MediaType.APPLICATION_JSON)
                .content(paymentJson(5_000, "CASH", "RCPT-1", "ar-pay-1", version)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.amountPaise").value(5_000))
        .andExpect(jsonPath("$.data.balancePaise").value(13_000));

    mockMvc
        .perform(
            post("/api/v1/hospital/payments")
                .cookie(accountant)
                .contentType(MediaType.APPLICATION_JSON)
                .content(paymentJson(99_000, "CASH", "RCPT-X", "ar-pay-over", version + 1)))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("OVERPAYMENT"));

    mockMvc
        .perform(post("/api/v1/hospital/payments/reminder").cookie(accountant))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("NOTHING_DUE"));

    HospitalIssue posted = hospitalIssueRepository.findAll().get(0);
    posted.setIssuedAt(Instant.parse("2026-08-01T12:00:00Z"));
    hospitalIssueRepository.save(posted);

    mockMvc
        .perform(post("/api/v1/hospital/payments/reminder").cookie(accountant))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.sent").value(true));
    MvcResult inbox =
        mockMvc
            .perform(get("/api/v1/notifications").cookie(ready.fx().owner()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.items[0].title").value("Hospital credit overdue"))
            .andExpect(jsonPath("$.data.items[0].sourceType").value("hospital_credit_due"))
            .andReturn();
    String notificationId =
        objectMapper
            .readTree(inbox.getResponse().getContentAsString())
            .path("data")
            .path("items")
            .get(0)
            .path("id")
            .asText();
    mockMvc
        .perform(
            post("/api/v1/notifications/" + notificationId + "/open").cookie(ready.fx().owner()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.href").value("/hospital-billing?view=statement"));
  }

  @Test
  void ac05_isolationAndFailureSafety() throws Exception {
    Ready ready = readyIssue("ar-iso");
    UUID issueId = issueFloor(ready, "2", "ar-iso-iss");
    Cookie pharmacist = staffWithPredefined(ready.fx(), "pharmacist", "pharm@ar-iso.local");
    Cookie inventory = staffWithPredefined(ready.fx(), "inventory", "inv@ar-iso.local");
    Cookie cashier = staffWithPredefined(ready.fx(), "cashier", "cash@ar-iso.local");

    mockMvc
        .perform(
            post("/api/v1/hospital/returns")
                .cookie(pharmacist)
                .contentType(MediaType.APPLICATION_JSON)
                .content(returnJson(issueId, ready.productId(), "1", "ar-iso-pharm")))
        .andExpect(status().isForbidden());
    mockMvc
        .perform(get("/api/v1/hospital/statement").cookie(inventory))
        .andExpect(status().isForbidden());
    mockMvc
        .perform(get("/api/v1/hospital/ward-stock").cookie(cashier))
        .andExpect(status().isForbidden());
    mockMvc.perform(get("/api/v1/hospital/ward-stock")).andExpect(status().isUnauthorized());

    Ready other = readyIssue("ar-other");
    UUID foreignIssue = issueFloor(other, "1", "ar-other-iss");
    mockMvc
        .perform(
            post("/api/v1/hospital/returns")
                .cookie(ready.fx().owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(returnJson(foreignIssue, ready.productId(), "1", "ar-iso-foreign")))
        .andExpect(status().isNotFound());
    assertThat(
            hospitalWardStockRepository.findAll().stream()
                .filter(row -> row.getTenantId().equals(ready.fx().tenantId()))
                .findFirst()
                .orElseThrow()
                .getQuantity())
        .isEqualByComparingTo("2");

    long version =
        hospitalCreditAccountRepository.findAll().stream()
            .filter(row -> row.getTenantId().equals(ready.fx().tenantId()))
            .findFirst()
            .orElseThrow()
            .getVersion();
    String payBody = paymentJson(2_000, "UPI", "DUP", "ar-iso-dup", version);
    mockMvc
        .perform(
            post("/api/v1/hospital/payments")
                .cookie(ready.fx().owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(payBody))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.balancePaise").value(16_000));
    mockMvc
        .perform(
            post("/api/v1/hospital/payments")
                .cookie(ready.fx().owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(payBody))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.balancePaise").value(16_000));
    mockMvc
        .perform(
            post("/api/v1/hospital/payments")
                .cookie(ready.fx().owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(paymentJson(1_000, "CASH", "OTHER", "ar-iso-dup", version + 1)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("IDEMPOTENCY_CONFLICT"));
    long currentVersion =
        hospitalCreditAccountRepository.findAll().stream()
            .filter(row -> row.getTenantId().equals(ready.fx().tenantId()))
            .findFirst()
            .orElseThrow()
            .getVersion();
    mockMvc
        .perform(
            post("/api/v1/hospital/payments")
                .cookie(ready.fx().owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(paymentJson(1_000, "UPI", "STALE", "ar-iso-stale", currentVersion - 1)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("STALE_STATE"));
    assertThat(
            hospitalCreditAccountRepository.findAll().stream()
                .filter(row -> row.getTenantId().equals(ready.fx().tenantId()))
                .findFirst()
                .orElseThrow()
                .getBalancePaise())
        .isEqualTo(16_000);
  }

  private UUID issueFloor(Ready ready, String qty, String key) throws Exception {
    MvcResult created =
        mockMvc
            .perform(
                post("/api/v1/hospital/issues")
                    .cookie(ready.fx().owner())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        issueJson(
                            ready.wardId(),
                            null,
                            "FLOOR_STOCK",
                            null,
                            null,
                            ready.productId(),
                            ready.batchId(),
                            qty,
                            key)))
            .andExpect(status().isOk())
            .andReturn();
    return UUID.fromString(
        objectMapper
            .readTree(created.getResponse().getContentAsString())
            .path("data")
            .path("id")
            .asText());
  }

  private String returnJson(UUID issueId, UUID productId, String qty, String key) {
    return """
        {
          "issueId":"%s",
          "idempotencyKey":"%s",
          "lines":[{"productId":"%s","quantity":%s}]
        }
        """
        .formatted(issueId, key, productId, qty);
  }

  private String paymentJson(long amount, String mode, String reference, String key, long version) {
    return """
        {
          "amountPaise":%d,
          "mode":"%s",
          "reference":"%s",
          "idempotencyKey":"%s",
          "expectedAccountVersion":%d
        }
        """
        .formatted(amount, mode, reference, key, version);
  }

  private Ready readyIssue(String slug) throws Exception {
    Fixture fx = seedPro(slug);
    configureAccount(fx);
    WardBed wardBed = createWard(fx, "General", "GEN", 2);
    Stocked stocked = stocked(fx, "PARA-1", "Paracetamol 500");
    setUniformDiscount(fx);
    return new Ready(fx, wardBed.wardId(), wardBed.bedId(), stocked.productId(), stocked.batchId());
  }

  private void configureAccount(Fixture fx) throws Exception {
    mockMvc
        .perform(
            put("/api/v1/hospital/account")
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(accountJson("City Care Hospital", "NET_30", 2_000_000L, null)))
        .andExpect(status().isOk());
  }

  private void setUniformDiscount(Fixture fx) throws Exception {
    mockMvc
        .perform(
            put("/api/v1/hospital/prices")
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"uniformDiscountBps\":" + UNIFORM_BPS + "}"))
        .andExpect(status().isOk());
  }

  private UUID createApprovedIndent(Ready ready) throws Exception {
    MvcResult created =
        mockMvc
            .perform(
                post("/api/v1/hospital/indents")
                    .cookie(ready.fx().owner())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        indentJson(
                            ready.wardId(),
                            ready.bedId(),
                            "Patient",
                            null,
                            "Sister",
                            ready.productId(),
                            "3")))
            .andExpect(status().isOk())
            .andReturn();
    UUID indentId =
        UUID.fromString(
            objectMapper
                .readTree(created.getResponse().getContentAsString())
                .path("data")
                .path("id")
                .asText());
    mockMvc
        .perform(
            post("/api/v1/hospital/indents/" + indentId + "/approve").cookie(ready.fx().owner()))
        .andExpect(status().isOk());
    return indentId;
  }

  private String admit(Ready ready, String name, String uhid) throws Exception {
    mockMvc
        .perform(
            post("/api/v1/hospital/admissions")
                .cookie(ready.fx().owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "patientName":"%s",
                      "uhid":"%s",
                      "wardId":"%s",
                      "bedId":"%s",
                      "phone":null,
                      "age":null,
                      "gender":null,
                      "attendingDoctorId":null,
                      "diagnosis":null,
                      "payerType":"SELF_PAY",
                      "insurerName":null,
                      "policyNumber":null
                    }
                    """
                        .formatted(name, uhid, ready.wardId(), ready.bedId())))
        .andExpect(status().isOk());
    return uhid;
  }

  private Stocked stocked(Fixture fx, String sku, String name) throws Exception {
    UUID productId = createProduct(fx.owner(), sku, name);
    mockMvc
        .perform(
            post("/api/v1/inventory/receipts")
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"productId":"%s","batchNumber":"LOT-AA","manufacturedOn":"2026-01-15","expiresOn":"2027-06-30","purchasePricePaise":12500,"quantity":10,"idempotencyKey":"%s-recv","expectedVersion":0}
                    """
                        .formatted(productId, sku)))
        .andExpect(status().isOk());
    String body =
        mockMvc
            .perform(get("/api/v1/inventory/products/" + productId + "/batches").cookie(fx.owner()))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    UUID batchId =
        UUID.fromString(
            objectMapper.readTree(body).path("data").path("items").get(0).path("batchId").asText());
    return new Stocked(productId, batchId);
  }

  private UUID createProduct(Cookie owner, String sku, String name) throws Exception {
    UUID categoryId = createCategory(owner, sku + " cat");
    MvcResult created =
        mockMvc
            .perform(
                post("/api/v1/products")
                    .cookie(owner)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(productJson(sku, name, categoryId)))
            .andExpect(status().isOk())
            .andReturn();
    UUID productId =
        UUID.fromString(
            objectMapper
                .readTree(created.getResponse().getContentAsString())
                .path("data")
                .path("id")
                .asText());
    Product product = productRepository.findById(productId).orElseThrow();
    product.setDefaultMrpPaise(MRP);
    product.setHsnCode("30049099");
    product.setGstRate(new BigDecimal("12"));
    productRepository.saveAndFlush(product);
    return productId;
  }

  private UUID createCategory(Cookie owner, String name) throws Exception {
    MvcResult result =
        mockMvc
            .perform(
                post("/api/v1/product-categories")
                    .cookie(owner)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":\"" + name + "\"}"))
            .andExpect(status().isOk())
            .andReturn();
    return UUID.fromString(
        objectMapper
            .readTree(result.getResponse().getContentAsString())
            .path("data")
            .path("id")
            .asText());
  }

  private WardBed createWard(Fixture fx, String name, String code, int capacity) throws Exception {
    MvcResult ward =
        mockMvc
            .perform(
                post("/api/v1/hospital/wards")
                    .cookie(fx.owner())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "name":"%s",
                          "code":"%s",
                          "floor":null,
                          "category":"GENERAL",
                          "capacity":%d,
                          "nurseInCharge":null,
                          "expectedVersion":null
                        }
                        """
                            .formatted(name, code, capacity)))
            .andExpect(status().isOk())
            .andReturn();
    JsonNode data = objectMapper.readTree(ward.getResponse().getContentAsString()).path("data");
    return new WardBed(
        UUID.fromString(data.path("id").asText()),
        UUID.fromString(data.path("beds").get(0).path("id").asText()));
  }

  private String issueJson(
      UUID wardId,
      UUID indentId,
      String reason,
      String uhid,
      String patientName,
      UUID productId,
      UUID batchId,
      String quantity,
      String key) {
    return """
        {
          "wardId":"%s",
          "indentId":%s,
          "reason":"%s",
          "uhid":%s,
          "patientName":%s,
          "idempotencyKey":"%s",
          "lines":[{"productId":"%s","batchId":"%s","quantity":%s}]
        }
        """
        .formatted(
            wardId,
            indentId == null ? "null" : "\"" + indentId + "\"",
            reason,
            jsonString(uhid),
            jsonString(patientName),
            key,
            productId,
            batchId,
            quantity);
  }

  private String indentJson(
      UUID wardId,
      UUID bedId,
      String patientName,
      String note,
      String requestedBy,
      UUID productId,
      String quantity) {
    return """
        {
          "wardId":"%s",
          "bedId":%s,
          "patientName":%s,
          "note":%s,
          "requestedBy":"%s",
          "lines":[{"productId":"%s","quantity":%s}]
        }
        """
        .formatted(
            wardId,
            bedId == null ? "null" : "\"" + bedId + "\"",
            jsonString(patientName),
            jsonString(note),
            requestedBy,
            productId,
            quantity);
  }

  private String accountJson(String name, String terms, long limit, Long version) {
    String versionJson = version == null ? "null" : version.toString();
    return """
        {
          "institutionName":"%s",
          "gstin":"%s",
          "storesContact":"Central stores",
          "billingPhone":"9876543210",
          "billingEmail":"billing@citycare.local",
          "creditTerms":"%s",
          "creditLimitPaise":%d,
          "expectedVersion":%s
        }
        """
        .formatted(name, HOSPITAL_GSTIN, terms, limit, versionJson);
  }

  private static String jsonString(String value) {
    if (value == null) {
      return "null";
    }
    return "\"" + value + "\"";
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
          "taxCategory":null,
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

  private Fixture seedPro(String slug) throws Exception {
    return seedPlan(slug, PlanCode.PRO);
  }

  private Fixture seedPlan(String slug, PlanCode plan) throws Exception {
    Tenant tenant = persistTenant(slug, slug + " Chemist");
    persistPlan(tenant.getId(), plan);
    persistUser(tenant.getId(), "owner@" + slug + ".local", AppUserRole.pharmacy_owner);
    Location branch = persistBranch(tenant.getId(), "Main", "BR01", true);
    Cookie owner = login("owner@" + slug + ".local");
    selectBranch(owner, branch.getId());
    return new Fixture(slug, tenant.getId(), branch.getId(), owner);
  }

  private Cookie staffWithPredefined(Fixture fx, String roleCode, String email) throws Exception {
    AppUser staff = persistUser(fx.tenantId(), email, AppUserRole.pharmacy_staff);
    UUID roleId = predefinedRoleId(fx.owner(), roleCode);
    mockMvc
        .perform(
            put("/api/v1/users/" + staff.getId() + "/roles")
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleIds\":[\"" + roleId + "\"]}"))
        .andExpect(status().isOk());
    assignBranch(fx.owner(), staff.getId(), fx.branchId());
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

  private void selectBranch(Cookie cookie, UUID branchId) throws Exception {
    mockMvc
        .perform(
            post("/api/v1/session/branch")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchId\":\"" + branchId + "\"}"))
        .andExpect(status().isOk());
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

  private AppUser persistUser(UUID tenantId, String email, AppUserRole role) {
    AppUser user = new AppUser();
    user.setId(UUID.randomUUID());
    user.setTenantId(tenantId);
    user.setEmail(email);
    user.setDisplayName(email.split("@")[0]);
    user.setRole(role);
    user.setStatus(UserAccountStatus.ACTIVE);
    user.setActive(true);
    user.setPasswordHash(passwordEncoder.encode(PASSWORD));
    user.setCreatedAt(T0);
    user.setUpdatedAt(T0);
    return appUserRepository.saveAndFlush(user);
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
    branch.setCreatedAt(T0);
    branch.setUpdatedAt(T0);
    return locationRepository.saveAndFlush(branch);
  }

  private record Fixture(String slug, UUID tenantId, UUID branchId, Cookie owner) {}

  private record WardBed(UUID wardId, UUID bedId) {}

  private record Stocked(UUID productId, UUID batchId) {}

  private record Ready(Fixture fx, UUID wardId, UUID bedId, UUID productId, UUID batchId) {}
}
