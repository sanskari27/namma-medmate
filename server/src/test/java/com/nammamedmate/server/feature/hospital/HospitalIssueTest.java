package com.nammamedmate.server.feature.hospital;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lowagie.text.pdf.PdfReader;
import com.lowagie.text.pdf.parser.PdfTextExtractor;
import com.nammamedmate.server.AbstractIntegrationTest;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.BranchType;
import com.nammamedmate.server.domain.HospitalIndentStatus;
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
import com.nammamedmate.server.persistence.HospitalWardRepository;
import com.nammamedmate.server.persistence.HospitalWardStockRepository;
import com.nammamedmate.server.persistence.HospitalWsInvoiceSequenceRepository;
import com.nammamedmate.server.persistence.LocationRepository;
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

class HospitalIssueTest extends AbstractIntegrationTest {

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
    hospitalIssueLineRepository.deleteAll();
    hospitalLedgerEntryRepository.deleteAll();
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
  void ac01_issueDebitsStockWardArAndWritesWsInvoice() throws Exception {
    Ready ready = readyIssue("iss-basic");

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
                            "2",
                            "iss-basic-1")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.invoiceNumber").value(startsWith("WS/")))
            .andExpect(
                jsonPath("$.data.invoiceNumber")
                    .value(org.hamcrest.Matchers.containsString("BR01")))
            .andExpect(jsonPath("$.data.reason").value("FLOOR_STOCK"))
            .andExpect(jsonPath("$.data.indentId").doesNotExist())
            .andExpect(jsonPath("$.data.billedPaise").value(18_000))
            .andExpect(jsonPath("$.data.mrpValuePaise").value(20_000))
            .andExpect(jsonPath("$.data.creditTerms").value("NET_30"))
            .andExpect(jsonPath("$.data.hospitalGstin").value(HOSPITAL_GSTIN))
            .andExpect(jsonPath("$.data.pharmacyGstin").value(PHARMACY_GSTIN))
            .andExpect(jsonPath("$.data.lines[0].mrpPaise").value(MRP))
            .andExpect(jsonPath("$.data.lines[0].creditPricePaise").value(CREDIT_PRICE))
            .andExpect(jsonPath("$.data.lines[0].discountBps").value(UNIFORM_BPS))
            .andExpect(jsonPath("$.data.lines[0].hsnCode").value("30049099"))
            .andReturn();

    assertThat(hospitalIssueRepository.count()).isEqualTo(1);
    assertThat(hospitalIssueLineRepository.count()).isEqualTo(1);
    assertThat(hospitalLedgerEntryRepository.count()).isEqualTo(1);
    assertThat(hospitalWardStockRepository.findAll().get(0).getQuantity())
        .isEqualByComparingTo("2");
    assertThat(
            stockBalanceRepository
                .findByTenantIdAndBranchIdAndProductIdAndBatchId(
                    ready.fx().tenantId(),
                    ready.fx().branchId(),
                    ready.productId(),
                    ready.batchId())
                .orElseThrow()
                .getQuantity())
        .isEqualByComparingTo("8");
    assertThat(hospitalCreditAccountRepository.findAll().get(0).getBalancePaise())
        .isEqualTo(18_000);
    assertThat(created.getResponse().getContentAsString()).contains("WS/");
  }

  @Test
  void ac01_pharmacistAndInventoryCanIssue() throws Exception {
    Ready ready = readyIssue("iss-roles");
    Cookie pharmacist = staffWithPredefined(ready.fx(), "pharmacist", "pharm@iss-roles.local");
    Cookie inventory = staffWithPredefined(ready.fx(), "inventory", "inv@iss-roles.local");

    mockMvc
        .perform(
            post("/api/v1/hospital/issues")
                .cookie(pharmacist)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    issueJson(
                        ready.wardId(),
                        null,
                        "CONSUMPTION",
                        null,
                        null,
                        ready.productId(),
                        ready.batchId(),
                        "1",
                        "iss-roles-p")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.invoiceNumber").value(startsWith("WS/")));

    mockMvc
        .perform(
            post("/api/v1/hospital/issues")
                .cookie(inventory)
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
                        "1",
                        "iss-roles-i")))
        .andExpect(status().isOk());
  }

  @Test
  void ac02_linkedIndentClosesAndSecondIssueConflicts() throws Exception {
    Ready ready = readyIssue("iss-indent");
    UUID indentId = createApprovedIndent(ready);

    mockMvc
        .perform(
            post("/api/v1/hospital/issues")
                .cookie(ready.fx().owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    issueJson(
                        ready.wardId(),
                        indentId,
                        "FLOOR_STOCK",
                        null,
                        null,
                        ready.productId(),
                        ready.batchId(),
                        "3",
                        "iss-indent-1")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.indentId").value(indentId.toString()))
        .andExpect(jsonPath("$.data.invoiceNumber").value(startsWith("WS/")));

    mockMvc
        .perform(get("/api/v1/hospital/indents/" + indentId).cookie(ready.fx().owner()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("ISSUED"))
        .andExpect(jsonPath("$.data.hospitalInvoiceRef").value(startsWith("WS/")))
        .andExpect(jsonPath("$.data.lines[0].issuedQty").value(3));

    mockMvc
        .perform(
            post("/api/v1/hospital/issues")
                .cookie(ready.fx().owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    issueJson(
                        ready.wardId(),
                        indentId,
                        "FLOOR_STOCK",
                        null,
                        null,
                        ready.productId(),
                        ready.batchId(),
                        "1",
                        "iss-indent-2")))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("STALE_STATE"));

    assertThat(hospitalIndentRepository.findById(indentId).orElseThrow().getStatus())
        .isEqualTo(HospitalIndentStatus.ISSUED);
  }

  @Test
  void ac02_adHocIssueHasNoIndent() throws Exception {
    Ready ready = readyIssue("iss-adhoc");
    mockMvc
        .perform(
            post("/api/v1/hospital/issues")
                .cookie(ready.fx().owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    issueJson(
                        ready.wardId(),
                        null,
                        "CONSUMPTION",
                        null,
                        null,
                        ready.productId(),
                        ready.batchId(),
                        "1",
                        "iss-adhoc-1")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.indentId").doesNotExist())
        .andExpect(jsonPath("$.data.indentNumber").doesNotExist());
  }

  @Test
  void ac03_patientRefillRequiresUhidOthersMayOmit() throws Exception {
    Ready ready = readyIssue("iss-refill");

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
                        null,
                        null,
                        ready.productId(),
                        ready.batchId(),
                        "1",
                        "iss-refill-bad")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("UHID_REQUIRED"));

    String uhid = admit(ready, "Ravi Kumar", "UHID-00007");
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
                        uhid,
                        "Ravi Kumar",
                        ready.productId(),
                        ready.batchId(),
                        "1",
                        "iss-refill-ok")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.uhid").value(uhid))
        .andExpect(jsonPath("$.data.patientName").value("Ravi Kumar"));

    mockMvc
        .perform(
            post("/api/v1/hospital/issues")
                .cookie(ready.fx().owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    issueJson(
                        ready.wardId(),
                        null,
                        "CONSUMPTION",
                        null,
                        null,
                        ready.productId(),
                        ready.batchId(),
                        "1",
                        "iss-consume")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.uhid").doesNotExist());
  }

  @Test
  void ac04_invoiceAndPdfShowCreditPriceMrpAndBothGstins() throws Exception {
    Ready ready = readyIssue("iss-pdf");
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
                            "2",
                            "iss-pdf-1")))
            .andExpect(status().isOk())
            .andReturn();
    UUID issueId =
        UUID.fromString(
            objectMapper
                .readTree(created.getResponse().getContentAsString())
                .path("data")
                .path("id")
                .asText());
    String invoiceNumber =
        objectMapper
            .readTree(created.getResponse().getContentAsString())
            .path("data")
            .path("invoiceNumber")
            .asText();

    mockMvc
        .perform(get("/api/v1/hospital/issues/" + issueId).cookie(ready.fx().owner()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.lines[0].batchNumber").value("LOT-AA"))
        .andExpect(jsonPath("$.data.lines[0].expiryOn").value("2027-06-30"))
        .andExpect(jsonPath("$.data.lines[0].gstRate").value(12))
        .andExpect(jsonPath("$.data.lines[0].amountPaise").value(18_000));

    MvcResult pdf =
        mockMvc
            .perform(get("/api/v1/hospital/issues/" + issueId + "/pdf").cookie(ready.fx().owner()))
            .andExpect(status().isOk())
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PDF))
            .andExpect(
                header()
                    .string(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + invoiceNumber.replace("/", "-") + ".pdf\""))
            .andReturn();
    PdfReader reader = new PdfReader(pdf.getResponse().getContentAsByteArray());
    String text = new PdfTextExtractor(reader).getTextFromPage(1);
    reader.close();
    assertThat(text).contains(invoiceNumber);
    assertThat(text).contains("LOT-AA");
    assertThat(text).contains("30049099");
    assertThat(text).contains(HOSPITAL_GSTIN);
    assertThat(text).contains(PHARMACY_GSTIN);
    assertThat(text).contains("NET_30");
    assertThat(text).contains("Billed to hospital");
    assertThat(text).contains("MRP value");
  }

  @Test
  void ac05_isolationAndFailureSafety() throws Exception {
    Ready ready = readyIssue("iss-guard");
    Cookie cashier = staffWithPredefined(ready.fx(), "cashier", "cash@iss-guard.local");
    mockMvc
        .perform(
            post("/api/v1/hospital/issues")
                .cookie(cashier)
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
                        "1",
                        "iss-cash")))
        .andExpect(status().isForbidden());

    mockMvc.perform(get("/api/v1/hospital/issues")).andExpect(status().isUnauthorized());

    Fixture free = seedPlan("iss-free", PlanCode.FREE);
    mockMvc
        .perform(
            post("/api/v1/hospital/issues")
                .cookie(free.owner())
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
                        "1",
                        "iss-free")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("PLAN_LIMIT"));

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
                        "99",
                        "iss-stock")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("INSUFFICIENT_STOCK"));

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
                        UUID.randomUUID(),
                        "1",
                        "iss-batch")))
        .andExpect(status().isNotFound());

    Ready other = readyIssue("iss-other");
    UUID foreignIndent = createApprovedIndent(other);
    mockMvc
        .perform(
            post("/api/v1/hospital/issues")
                .cookie(ready.fx().owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    issueJson(
                        ready.wardId(),
                        foreignIndent,
                        "FLOOR_STOCK",
                        null,
                        null,
                        ready.productId(),
                        ready.batchId(),
                        "1",
                        "iss-foreign")))
        .andExpect(status().isNotFound());

    mockMvc
        .perform(
            put("/api/v1/hospital/account")
                .cookie(ready.fx().owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    accountJson(
                        "City Care",
                        "NET_30",
                        5_000L,
                        hospitalCreditAccountRepository.findAll().stream()
                            .filter(row -> row.getTenantId().equals(ready.fx().tenantId()))
                            .findFirst()
                            .orElseThrow()
                            .getVersion())))
        .andExpect(status().isOk());

    long stockBefore =
        stockBalanceRepository
            .findByTenantIdAndBranchIdAndProductIdAndBatchId(
                ready.fx().tenantId(), ready.fx().branchId(), ready.productId(), ready.batchId())
            .orElseThrow()
            .getQuantity()
            .longValue();
    long issuesBefore = hospitalIssueRepository.count();
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
                        "2",
                        "iss-limit")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("CREDIT_LIMIT"));
    assertThat(hospitalIssueRepository.count()).isEqualTo(issuesBefore);
    assertThat(
            stockBalanceRepository
                .findByTenantIdAndBranchIdAndProductIdAndBatchId(
                    ready.fx().tenantId(),
                    ready.fx().branchId(),
                    ready.productId(),
                    ready.batchId())
                .orElseThrow()
                .getQuantity()
                .longValue())
        .isEqualTo(stockBefore);
    assertThat(
            hospitalCreditAccountRepository.findAll().stream()
                .filter(row -> row.getTenantId().equals(ready.fx().tenantId()))
                .findFirst()
                .orElseThrow()
                .getBalancePaise())
        .isZero();
  }

  @Test
  void ac05_sameTenantOtherBranchCannotListOrIssueHomeWard() throws Exception {
    Ready ready = readyIssue("iss-annex");
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
                        "1",
                        "iss-annex-home")))
        .andExpect(status().isOk());

    Location annex = persistBranch(ready.fx().tenantId(), "Annex", "AN01", false);
    Cookie ownerAnnex = login("owner@iss-annex.local");
    selectBranch(ownerAnnex, annex.getId());

    mockMvc
        .perform(get("/api/v1/hospital/issues").cookie(ownerAnnex))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items").isEmpty());

    long stockBefore =
        stockBalanceRepository
            .findByTenantIdAndBranchIdAndProductIdAndBatchId(
                ready.fx().tenantId(), ready.fx().branchId(), ready.productId(), ready.batchId())
            .orElseThrow()
            .getQuantity()
            .longValue();
    long issuesBefore = hospitalIssueRepository.count();
    long arBefore =
        hospitalCreditAccountRepository.findAll().stream()
            .filter(row -> row.getTenantId().equals(ready.fx().tenantId()))
            .findFirst()
            .orElseThrow()
            .getBalancePaise();

    mockMvc
        .perform(
            post("/api/v1/hospital/issues")
                .cookie(ownerAnnex)
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
                        "1",
                        "iss-annex-cross")))
        .andExpect(status().isNotFound());

    assertThat(hospitalIssueRepository.count()).isEqualTo(issuesBefore);
    assertThat(
            stockBalanceRepository
                .findByTenantIdAndBranchIdAndProductIdAndBatchId(
                    ready.fx().tenantId(),
                    ready.fx().branchId(),
                    ready.productId(),
                    ready.batchId())
                .orElseThrow()
                .getQuantity()
                .longValue())
        .isEqualTo(stockBefore);
    assertThat(
            hospitalCreditAccountRepository.findAll().stream()
                .filter(row -> row.getTenantId().equals(ready.fx().tenantId()))
                .findFirst()
                .orElseThrow()
                .getBalancePaise())
        .isEqualTo(arBefore);
  }

  @Test
  void ac05_duplicateIdempotencyKeyReplaysSameInvoice() throws Exception {
    Ready ready = readyIssue("iss-idem");
    String body =
        issueJson(
            ready.wardId(),
            null,
            "FLOOR_STOCK",
            null,
            null,
            ready.productId(),
            ready.batchId(),
            "2",
            "iss-idem-key");
    MvcResult first =
        mockMvc
            .perform(
                post("/api/v1/hospital/issues")
                    .cookie(ready.fx().owner())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.invoiceNumber").value(startsWith("WS/")))
            .andReturn();
    JsonNode created = objectMapper.readTree(first.getResponse().getContentAsString()).path("data");
    String invoiceNumber = created.path("invoiceNumber").asText();
    String issueId = created.path("id").asText();

    mockMvc
        .perform(
            post("/api/v1/hospital/issues")
                .cookie(ready.fx().owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.id").value(issueId))
        .andExpect(jsonPath("$.data.invoiceNumber").value(invoiceNumber));

    assertThat(hospitalIssueRepository.count()).isEqualTo(1);
    assertThat(hospitalIssueLineRepository.count()).isEqualTo(1);
    assertThat(hospitalLedgerEntryRepository.count()).isEqualTo(1);
    assertThat(stockMovementRepository.count()).isEqualTo(2);
    assertThat(
            stockBalanceRepository
                .findByTenantIdAndBranchIdAndProductIdAndBatchId(
                    ready.fx().tenantId(),
                    ready.fx().branchId(),
                    ready.productId(),
                    ready.batchId())
                .orElseThrow()
                .getQuantity())
        .isEqualByComparingTo("8");
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
