package com.nammamedmate.server.feature.hospital;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
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
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.CustomerCreditAccountRepository;
import com.nammamedmate.server.persistence.HospitalAdmissionRepository;
import com.nammamedmate.server.persistence.HospitalBedRepository;
import com.nammamedmate.server.persistence.HospitalCreditAccountRepository;
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
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

class HospitalAdmissionSettlementTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-21T07:00:00Z");
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
  @Autowired private HospitalBedRepository hospitalBedRepository;
  @Autowired private HospitalCreditAccountRepository hospitalCreditAccountRepository;
  @Autowired private HospitalLedgerEntryRepository hospitalLedgerEntryRepository;
  @Autowired private HospitalWsInvoiceSequenceRepository hospitalWsInvoiceSequenceRepository;
  @Autowired private CustomerCreditAccountRepository customerCreditAccountRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @Test
  void ac01_unsettledAndAllViewsListUhidWardAndUnpaidTotals() throws Exception {
    Fixture fx = seedPro("set-list");
    configureAccount(fx);
    WardBed general = createWard(fx, "General", "GEN", 1);
    UUID admissionId = admit(fx, "Ravi Kumar", "UHID-00021", general, "9876500021");
    UUID customerId = createCustomer(fx.cookie(), "Ravi Kumar", "9876500021");
    setLimit(fx.cookie(), customerId, 50_000, 0);
    Stocked product = stocked(fx, "LST-1", "List Pack");
    completeUnpaidWard(fx, product, customerId, "set-list-1", "UHID-00021", general, admissionId);
    WardBed icu = createWard(fx, "ICU", "ICU", 1);
    admit(fx, "Quiet Stay", "UHID-00022", icu, null);

    mockMvc
        .perform(get("/api/v1/hospital/active-patients?view=unsettled").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(1)))
        .andExpect(jsonPath("$.data.items[0].uhid").value("UHID-00021"))
        .andExpect(jsonPath("$.data.items[0].patientName").value("Ravi Kumar"))
        .andExpect(jsonPath("$.data.items[0].kind").value("ADMISSION"))
        .andExpect(jsonPath("$.data.items[0].wardName").value("General"))
        .andExpect(jsonPath("$.data.items[0].locationLabel").value("General"))
        .andExpect(jsonPath("$.data.items[0].unpaidPaise").value(TOTAL))
        .andExpect(jsonPath("$.data.items[0].billCount").value(1))
        .andExpect(jsonPath("$.data.items[0].admissionId").value(admissionId.toString()));

    mockMvc
        .perform(get("/api/v1/hospital/active-patients?view=all").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(2)));
  }

  @Test
  void ac01_searchFiltersUhidNameAndWard() throws Exception {
    Fixture fx = seedPro("set-q");
    WardBed general = createWard(fx, "General", "GEN", 1);
    UUID raviId = admit(fx, "Ravi Kumar", "UHID-00021", general, "9876501021");
    UUID customerId = createCustomer(fx.cookie(), "Ravi Kumar", "9876501021");
    setLimit(fx.cookie(), customerId, 50_000, 0);
    Stocked product = stocked(fx, "SRH-1", "Search Pack");
    completeUnpaidWard(fx, product, customerId, "set-q-1", "UHID-00021", general, raviId);
    WardBed icu = createWard(fx, "ICU", "ICU", 1);
    UUID meeraId = admit(fx, "Meera Shah", "UHID-00031", icu, "9876501031");
    UUID meeraCustomer = createCustomer(fx.cookie(), "Meera Shah", "9876501031");
    setLimit(fx.cookie(), meeraCustomer, 50_000, 0);
    completeUnpaidWard(fx, product, meeraCustomer, "set-q-2", "UHID-00031", icu, meeraId);

    mockMvc
        .perform(get("/api/v1/hospital/active-patients?view=unsettled&q=Ravi").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(1)))
        .andExpect(jsonPath("$.data.items[0].uhid").value("UHID-00021"));
    mockMvc
        .perform(get("/api/v1/hospital/active-patients?q=UHID-00031").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(1)))
        .andExpect(jsonPath("$.data.items[0].patientName").value("Meera Shah"));
    mockMvc
        .perform(get("/api/v1/hospital/active-patients?q=General").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(1)))
        .andExpect(jsonPath("$.data.items[0].wardName").value("General"));
  }

  @Test
  void ac01_cashierWithHospitalCanList() throws Exception {
    Fixture fx = seedPro("set-cash");
    WardBed ward = createWard(fx, "General", "GEN", 1);
    admit(fx, "Listed", "UHID-00041", ward, null);
    Cookie cashier = hospitalTill(fx, "cash@set-cash.local");

    mockMvc
        .perform(get("/api/v1/hospital/active-patients?view=all").cookie(cashier))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(1)))
        .andExpect(jsonPath("$.data.items[0].uhid").value("UHID-00041"));
  }

  @Test
  void ac02_settleUnpaidBillsWithCashLeavesHospitalArUnchanged() throws Exception {
    Fixture fx = seedPro("set-cashpay");
    configureAccount(fx);
    WardBed ward = createWard(fx, "General", "GEN", 1);
    UUID admissionId = admit(fx, "Pay Patient", "UHID-00051", ward, "9876500051");
    UUID customerId = createCustomer(fx.cookie(), "Pay Patient", "9876500051");
    setLimit(fx.cookie(), customerId, 50_000, 0);
    Stocked product = stocked(fx, "PAY-1", "Pay Pack");
    completeUnpaidWard(fx, product, customerId, "set-pay-a", "UHID-00051", ward, admissionId);
    completeUnpaidWard(fx, product, customerId, "set-pay-b", "UHID-00051", ward, admissionId);
    long arBefore =
        hospitalCreditAccountRepository
            .findByTenantId(fx.tenantId())
            .orElseThrow()
            .getBalancePaise();
    long ledgerBefore = hospitalLedgerEntryRepository.count();
    int wsBefore =
        hospitalWsInvoiceSequenceRepository.findAll().stream()
            .mapToInt(row -> row.getNextValue())
            .findFirst()
            .orElse(0);
    long version = admissionVersion(fx, admissionId);

    mockMvc
        .perform(
            post("/api/v1/hospital/admissions/" + admissionId + "/settle")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(settleJson(version, "CASH", "set-pay-s", null, null)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.unpaidPaise").value(0))
        .andExpect(jsonPath("$.data.billCount").value(2));

    assertThat(
            hospitalCreditAccountRepository
                .findByTenantId(fx.tenantId())
                .orElseThrow()
                .getBalancePaise())
        .isEqualTo(arBefore);
    assertThat(hospitalLedgerEntryRepository.count()).isEqualTo(ledgerBefore);
    assertThat(
            hospitalWsInvoiceSequenceRepository.findAll().stream()
                .mapToInt(row -> row.getNextValue())
                .findFirst()
                .orElse(0))
        .isEqualTo(wsBefore);
    assertThat(salesInvoiceRepository.findAll())
        .allSatisfy(invoice -> assertThat(invoice.getAmountDuePaise()).isZero());
  }

  @Test
  void ac02_settleWithInsuranceTpaSnapshotsInsurer() throws Exception {
    Fixture fx = seedPro("set-tpa");
    WardBed ward = createWard(fx, "General", "GEN", 1);
    UUID admissionId = admit(fx, "Tpa Patient", "UHID-00061", ward, "9876500061");
    UUID customerId = createCustomer(fx.cookie(), "Tpa Patient", "9876500061");
    setLimit(fx.cookie(), customerId, 50_000, 0);
    Stocked product = stocked(fx, "TPA-S", "Tpa Settle Pack");
    completeUnpaidWard(fx, product, customerId, "set-tpa-1", "UHID-00061", ward, admissionId);
    long version = admissionVersion(fx, admissionId);

    mockMvc
        .perform(
            post("/api/v1/hospital/admissions/" + admissionId + "/settle")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(settleJson(version, "INSURANCE_TPA", "set-tpa-bad", "Star Health", null)))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value(HospitalPolicy.TPA_INCOMPLETE));

    mockMvc
        .perform(
            post("/api/v1/hospital/admissions/" + admissionId + "/settle")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(settleJson(version, "INSURANCE_TPA", "set-tpa-s", "Star Health", "POL-9")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.unpaidPaise").value(0));

    mockMvc
        .perform(get("/api/v1/hospital/active-patients/" + admissionId).cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.invoices[0].insurerName").value("Star Health"))
        .andExpect(jsonPath("$.data.invoices[0].policyNumber").value("POL-9"))
        .andExpect(jsonPath("$.data.invoices[0].paymentLabel").value("Insurance/TPA"));
  }

  @Test
  void ac02_settleReducesCustomerKhata() throws Exception {
    Fixture fx = seedPro("set-khata");
    WardBed ward = createWard(fx, "General", "GEN", 1);
    UUID admissionId = admit(fx, "Khata Stay", "UHID-00071", ward, "9876500071");
    UUID customerId = createCustomer(fx.cookie(), "Khata Stay", "9876500071");
    setLimit(fx.cookie(), customerId, 50_000, 0);
    Stocked product = stocked(fx, "KHT-S", "Khata Settle Pack");
    completeUnpaidWard(fx, product, customerId, "set-kht-1", "UHID-00071", ward, admissionId);
    assertThat(
            customerCreditAccountRepository
                .findByTenantIdAndCustomerId(fx.tenantId(), customerId)
                .orElseThrow()
                .getBalancePaise())
        .isEqualTo(TOTAL);
    long version = admissionVersion(fx, admissionId);

    mockMvc
        .perform(
            post("/api/v1/hospital/admissions/" + admissionId + "/settle")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(settleJson(version, "UPI", "set-kht-s", null, null)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.unpaidPaise").value(0));

    assertThat(
            customerCreditAccountRepository
                .findByTenantIdAndCustomerId(fx.tenantId(), customerId)
                .orElseThrow()
                .getBalancePaise())
        .isZero();
  }

  @Test
  void ac03_dischargeWithOutstandingIs422UntilSettledInRequest() throws Exception {
    Fixture fx = seedPro("set-out");
    WardBed ward = createWard(fx, "General", "GEN", 1);
    UUID admissionId = admit(fx, "Due Stay", "UHID-00081", ward, "9876500081");
    UUID customerId = createCustomer(fx.cookie(), "Due Stay", "9876500081");
    setLimit(fx.cookie(), customerId, 50_000, 0);
    Stocked product = stocked(fx, "OUT-1", "Outstanding Pack");
    completeUnpaidWard(fx, product, customerId, "set-out-1", "UHID-00081", ward, admissionId);
    long version = admissionVersion(fx, admissionId);

    mockMvc
        .perform(
            post("/api/v1/hospital/admissions/" + admissionId + "/discharge")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(dischargeJson(version, null, "set-out-d", null, null)))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value(HospitalPolicy.OUTSTANDING_BILLS));

    assertThat(hospitalAdmissionRepository.findById(admissionId).orElseThrow().getStatus())
        .isEqualTo(HospitalAdmissionStatus.ACTIVE);
    assertThat(hospitalBedRepository.findById(ward.bedId()).orElseThrow().getOccupancyStatus())
        .isEqualTo(HospitalBedOccupancy.OCCUPIED);
  }

  @Test
  void ac03_dischargeSettlesAndFreesBed() throws Exception {
    Fixture fx = seedPro("set-dis");
    WardBed ward = createWard(fx, "General", "GEN", 1);
    UUID admissionId = admit(fx, "Go Home", "UHID-00091", ward, "9876500091");
    UUID customerId = createCustomer(fx.cookie(), "Go Home", "9876500091");
    setLimit(fx.cookie(), customerId, 50_000, 0);
    Stocked product = stocked(fx, "DIS-S", "Discharge Pack");
    completeUnpaidWard(fx, product, customerId, "set-dis-1", "UHID-00091", ward, admissionId);
    long version = admissionVersion(fx, admissionId);
    Cookie pharmacist = staffWithPredefined(fx, "pharmacist", "pharm@set-dis.local");

    mockMvc
        .perform(
            post("/api/v1/hospital/admissions/" + admissionId + "/discharge")
                .cookie(pharmacist)
                .contentType(MediaType.APPLICATION_JSON)
                .content(dischargeJson(version, "CARD", "set-dis-d", null, null)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("DISCHARGED"))
        .andExpect(jsonPath("$.data.unpaidPaise").value(0))
        .andExpect(jsonPath("$.data.dischargedAt").isNotEmpty());

    assertThat(hospitalAdmissionRepository.findById(admissionId).orElseThrow().getStatus())
        .isEqualTo(HospitalAdmissionStatus.DISCHARGED);
    assertThat(hospitalBedRepository.findById(ward.bedId()).orElseThrow().getOccupancyStatus())
        .isEqualTo(HospitalBedOccupancy.FREE);
  }

  @Test
  void ac03_cashierCannotDischarge() throws Exception {
    Fixture fx = seedPro("set-nocash");
    WardBed ward = createWard(fx, "General", "GEN", 1);
    UUID admissionId = admit(fx, "Stay", "UHID-00101", ward, null);
    Cookie cashier = hospitalTill(fx, "cash@set-nocash.local");

    mockMvc
        .perform(
            post("/api/v1/hospital/admissions/" + admissionId + "/discharge")
                .cookie(cashier)
                .contentType(MediaType.APPLICATION_JSON)
                .content(dischargeJson(0, null, "set-nocash-d", null, null)))
        .andExpect(status().isForbidden());
  }

  @Test
  void ac04_casualtyWithoutBedAppearsAndSettlesWithoutWard() throws Exception {
    Fixture fx = seedPro("set-cas");
    Stocked product = stocked(fx, "CAS-S", "Casualty Pack");
    UUID customerId = createCustomer(fx.cookie(), "Rahul Casualty", "9876500111");
    setLimit(fx.cookie(), customerId, 50_000, 0);
    UUID invoiceId =
        createDraft(fx, product, customerId, "set-cas-1", "EMERGENCY", "UHID-CAS-1", null, null);
    completeCredit(fx, invoiceId, "set-cas-c");

    mockMvc
        .perform(get("/api/v1/hospital/active-patients?view=unsettled").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(1)))
        .andExpect(jsonPath("$.data.items[0].kind").value("CASUALTY"))
        .andExpect(jsonPath("$.data.items[0].uhid").value("UHID-CAS-1"))
        .andExpect(jsonPath("$.data.items[0].locationLabel").value("Casualty"))
        .andExpect(jsonPath("$.data.items[0].wardName").doesNotExist())
        .andExpect(jsonPath("$.data.items[0].unpaidPaise").value(TOTAL));

    mockMvc
        .perform(get("/api/v1/hospital/active-patients/casualty/UHID-CAS-1").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.kind").value("CASUALTY"))
        .andExpect(jsonPath("$.data.invoices", hasSize(1)));

    mockMvc
        .perform(
            post("/api/v1/hospital/admissions/casualty/settle")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(casualtySettleJson("UHID-CAS-1", "CASH", "set-cas-s", null, null)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.unpaidPaise").value(0));

    mockMvc
        .perform(get("/api/v1/hospital/active-patients?view=unsettled").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(0)));
  }

  @Test
  void ac05_foreignUhidIs404() throws Exception {
    Fixture home = seedPro("set-home");
    Fixture away = seedPro("set-away");
    WardBed awayWard = createWard(away, "Away", "AWY", 1);
    UUID awayId = admit(away, "Away Patient", "UHID-AWAY", awayWard, "9876599991");
    UUID awayCustomer = createCustomer(away.cookie(), "Away Patient", "9876599991");
    setLimit(away.cookie(), awayCustomer, 50_000, 0);
    Stocked product = stocked(away, "AWY-1", "Away Pack");
    completeUnpaidWard(away, product, awayCustomer, "set-away-1", "UHID-AWAY", awayWard, awayId);

    mockMvc
        .perform(get("/api/v1/hospital/active-patients/" + awayId).cookie(home.cookie()))
        .andExpect(status().isNotFound());
    mockMvc
        .perform(get("/api/v1/hospital/active-patients/casualty/UHID-AWAY").cookie(home.cookie()))
        .andExpect(status().isNotFound());
    mockMvc
        .perform(
            post("/api/v1/hospital/admissions/" + awayId + "/settle")
                .cookie(home.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(settleJson(0, "CASH", "set-home-s", null, null)))
        .andExpect(status().isNotFound());
  }

  @Test
  void ac05_duplicateSettleReplays() throws Exception {
    Fixture fx = seedPro("set-idem");
    WardBed ward = createWard(fx, "General", "GEN", 1);
    UUID admissionId = admit(fx, "Replay", "UHID-00111", ward, "9876501111");
    UUID customerId = createCustomer(fx.cookie(), "Replay", "9876501111");
    setLimit(fx.cookie(), customerId, 50_000, 0);
    Stocked product = stocked(fx, "IDM-S", "Idem Pack");
    completeUnpaidWard(fx, product, customerId, "set-idm-1", "UHID-00111", ward, admissionId);
    long version = admissionVersion(fx, admissionId);
    String body = settleJson(version, "CASH", "set-idm-s", null, null);

    mockMvc
        .perform(
            post("/api/v1/hospital/admissions/" + admissionId + "/settle")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.unpaidPaise").value(0));
    mockMvc
        .perform(
            post("/api/v1/hospital/admissions/" + admissionId + "/settle")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.unpaidPaise").value(0));
  }

  @Test
  void ac05_staleVersionIs409() throws Exception {
    Fixture fx = seedPro("set-stale");
    WardBed ward = createWard(fx, "General", "GEN", 1);
    UUID admissionId = admit(fx, "Stale", "UHID-00121", ward, "9876501211");
    UUID customerId = createCustomer(fx.cookie(), "Stale", "9876501211");
    setLimit(fx.cookie(), customerId, 50_000, 0);
    Stocked product = stocked(fx, "STL-1", "Stale Pack");
    completeUnpaidWard(fx, product, customerId, "set-stl-1", "UHID-00121", ward, admissionId);

    mockMvc
        .perform(
            post("/api/v1/hospital/admissions/" + admissionId + "/settle")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(settleJson(0, "CASH", "set-stl-s", null, null)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value(HospitalPolicy.STALE_STATE));
  }

  @Test
  void ac05_concurrentDischargeVsWardBillIs409() throws Exception {
    Fixture fx = seedPro("set-race");
    WardBed ward = createWard(fx, "General", "GEN", 2);
    UUID admissionId = admit(fx, "Race", "UHID-00131", ward, "9876501311");
    UUID customerId = createCustomer(fx.cookie(), "Race", "9876501311");
    setLimit(fx.cookie(), customerId, 80_000, 0);
    Stocked product = stocked(fx, "RAC-1", "Race Pack");
    completeUnpaidWard(fx, product, customerId, "set-race-1", "UHID-00131", ward, admissionId);
    UUID secondDraft =
        createDraft(
            fx,
            product,
            customerId,
            "set-race-2",
            "WARD",
            "UHID-00131",
            ward.wardId(),
            admissionId);
    long version = admissionVersion(fx, admissionId);

    ExecutorService pool = Executors.newFixedThreadPool(2);
    CountDownLatch start = new CountDownLatch(1);
    AtomicInteger dischargeOk = new AtomicInteger();
    AtomicInteger completeOk = new AtomicInteger();
    AtomicInteger conflicts = new AtomicInteger();
    try {
      pool.submit(
          () -> {
            try {
              start.await();
              int status =
                  mockMvc
                      .perform(
                          post("/api/v1/hospital/admissions/" + admissionId + "/discharge")
                              .cookie(fx.cookie())
                              .contentType(MediaType.APPLICATION_JSON)
                              .content(dischargeJson(version, "CASH", "set-race-d", null, null)))
                      .andReturn()
                      .getResponse()
                      .getStatus();
              if (status == 200) {
                dischargeOk.incrementAndGet();
              } else if (status == 409 || status == 422) {
                conflicts.incrementAndGet();
              }
            } catch (Exception ex) {
              throw new IllegalStateException(ex);
            }
          });
      pool.submit(
          () -> {
            try {
              start.await();
              int status =
                  mockMvc
                      .perform(
                          post("/api/v1/sales/invoices/" + secondDraft + "/complete")
                              .cookie(fx.cookie())
                              .contentType(MediaType.APPLICATION_JSON)
                              .content(
                                  completeJson(
                                      1,
                                      TOTAL,
                                      0,
                                      "set-race-c",
                                      "{\"mode\":\"CREDIT\",\"amountPaise\":11200}")))
                      .andReturn()
                      .getResponse()
                      .getStatus();
              if (status == 200) {
                completeOk.incrementAndGet();
              } else if (status == 409 || status == 422) {
                conflicts.incrementAndGet();
              }
            } catch (Exception ex) {
              throw new IllegalStateException(ex);
            }
          });
      start.countDown();
      pool.shutdown();
      while (!pool.isTerminated()) {
        Thread.sleep(20);
      }
    } finally {
      pool.shutdownNow();
    }

    assertThat(dischargeOk.get() + completeOk.get()).isEqualTo(1);
    assertThat(conflicts.get()).isEqualTo(1);
    var admission = hospitalAdmissionRepository.findById(admissionId).orElseThrow();
    var bed = hospitalBedRepository.findById(ward.bedId()).orElseThrow();
    if (admission.getStatus() == HospitalAdmissionStatus.DISCHARGED) {
      assertThat(bed.getOccupancyStatus()).isEqualTo(HospitalBedOccupancy.FREE);
      assertThat(salesInvoiceRepository.findById(secondDraft).orElseThrow().getStatus().name())
          .isNotEqualTo("COMPLETED");
    } else {
      assertThat(bed.getOccupancyStatus()).isEqualTo(HospitalBedOccupancy.OCCUPIED);
    }
  }

  @Test
  void ac05_unauthenticatedIs401() throws Exception {
    mockMvc.perform(get("/api/v1/hospital/active-patients")).andExpect(status().isUnauthorized());
  }

  @Test
  void ac05_otherBranchAdmissionIsUndisclosed() throws Exception {
    Fixture home = seedPro("set-xbr");
    Location annex = persistBranch(home.tenantId(), "Annex", "BR02", false);
    selectBranch(home.cookie(), annex.getId());
    Fixture annexFx = new Fixture(home.tenantId(), annex.getId(), home.cookie());
    WardBed annexWard = createWard(annexFx, "Annex", "ANX", 1);
    UUID annexId = admit(annexFx, "Annex Stay", "UHID-ANNEX", annexWard, null);
    selectBranch(home.cookie(), home.branchId());

    mockMvc
        .perform(get("/api/v1/hospital/active-patients?view=all").cookie(home.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(0)));
    mockMvc
        .perform(get("/api/v1/hospital/active-patients/" + annexId).cookie(home.cookie()))
        .andExpect(status().isNotFound());
  }

  private long admissionVersion(Fixture fx, UUID admissionId) throws Exception {
    String body =
        mockMvc
            .perform(get("/api/v1/hospital/active-patients/" + admissionId).cookie(fx.cookie()))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return objectMapper.readTree(body).path("data").path("version").asLong();
  }

  private void completeUnpaidWard(
      Fixture fx,
      Stocked product,
      UUID customerId,
      String key,
      String uhid,
      WardBed ward,
      UUID admissionId)
      throws Exception {
    UUID invoiceId =
        createDraft(fx, product, customerId, key, "WARD", uhid, ward.wardId(), admissionId);
    completeCredit(fx, invoiceId, key + "-c");
  }

  private void completeCredit(Fixture fx, UUID invoiceId, String key) throws Exception {
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    completeJson(1, TOTAL, 0, key, "{\"mode\":\"CREDIT\",\"amountPaise\":11200}")))
        .andExpect(status().isOk());
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
                    "{\"productId\":\"%s\",\"batchNumber\":\"LOT-AA\",\"manufacturedOn\":\"2026-01-15\",\"expiresOn\":\"2027-06-30\",\"purchasePricePaise\":12500,\"quantity\":\"20\",\"idempotencyKey\":\"%s-recv\",\"expectedVersion\":0}"
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

  private Cookie hospitalTill(Fixture fx, String email) throws Exception {
    AppUser staff = persistUser(fx.tenantId(), email, AppUserRole.pharmacy_staff);
    String created =
        mockMvc
            .perform(
                post("/api/v1/roles")
                    .cookie(fx.cookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":\"Till hospital\",\"modules\":[\"SALES\",\"HOSPITAL\"]}"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    UUID roleId = UUID.fromString(objectMapper.readTree(created).path("data").path("id").asText());
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
    Tenant tenant = persistTenant(slug, slug + " Chemist");
    persistPlan(tenant.getId(), PlanCode.PRO);
    persistUser(tenant.getId(), "owner@" + slug + ".local", AppUserRole.pharmacy_owner);
    Location branch = persistBranch(tenant.getId(), "Main", "BR01", true);
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

  private static String settleJson(
      long version, String mode, String key, String insurer, String policy) {
    return """
        {
          "expectedVersion":%d,
          "paymentMode":"%s",
          "idempotencyKey":"%s",
          "insurerName":%s,
          "policyNumber":%s
        }
        """
        .formatted(
            version,
            mode,
            key,
            insurer == null ? "null" : "\"" + insurer + "\"",
            policy == null ? "null" : "\"" + policy + "\"");
  }

  private static String casualtySettleJson(
      String uhid, String mode, String key, String insurer, String policy) {
    return """
        {
          "uhid":"%s",
          "paymentMode":"%s",
          "idempotencyKey":"%s",
          "insurerName":%s,
          "policyNumber":%s
        }
        """
        .formatted(
            uhid,
            mode,
            key,
            insurer == null ? "null" : "\"" + insurer + "\"",
            policy == null ? "null" : "\"" + policy + "\"");
  }

  private static String dischargeJson(
      long version, String mode, String key, String insurer, String policy) {
    return """
        {
          "expectedVersion":%d,
          "paymentMode":%s,
          "idempotencyKey":"%s",
          "insurerName":%s,
          "policyNumber":%s
        }
        """
        .formatted(
            version,
            mode == null ? "null" : "\"" + mode + "\"",
            key,
            insurer == null ? "null" : "\"" + insurer + "\"",
            policy == null ? "null" : "\"" + policy + "\"");
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
