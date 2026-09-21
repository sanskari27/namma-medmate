package com.nammamedmate.server.feature.hospital;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
import com.nammamedmate.server.persistence.AuditEventRepository;
import com.nammamedmate.server.persistence.HospitalIssueRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.SalesInvoiceRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

class HospitalSalesRegisterTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-21T06:00:00Z");
  private static final long TOTAL = 11200L;
  private static final String HOSPITAL_GSTIN = "29ABCDE1234F1Z5";
  private static final String PHARMACY_GSTIN = "29AAAAA0000A1Z5";
  private static final ZoneId IST = ZoneId.of("Asia/Kolkata");

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private SalesInvoiceRepository salesInvoiceRepository;
  @Autowired private HospitalIssueRepository hospitalIssueRepository;
  @Autowired private AuditEventRepository auditEventRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @Test
  void ac01_tilesMatchCompletedInvBySourceAndOmitWsAndOnline() throws Exception {
    Mix mix = seedMix("reg-tiles");

    mockMvc
        .perform(
            get("/api/v1/hospital/sales-register")
                .cookie(mix.fx().cookie())
                .param("from", today())
                .param("to", today()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.tiles", hasSize(4)))
        .andExpect(jsonPath("$.data.tiles[0].source").value("OPD_RX"))
        .andExpect(jsonPath("$.data.tiles[0].count").value(1))
        .andExpect(jsonPath("$.data.tiles[0].revenuePaise").value(TOTAL))
        .andExpect(jsonPath("$.data.tiles[1].source").value("COUNTER"))
        .andExpect(jsonPath("$.data.tiles[1].count").value(1))
        .andExpect(jsonPath("$.data.tiles[1].revenuePaise").value(TOTAL))
        .andExpect(jsonPath("$.data.tiles[2].source").value("WARD"))
        .andExpect(jsonPath("$.data.tiles[2].count").value(1))
        .andExpect(jsonPath("$.data.tiles[2].revenuePaise").value(TOTAL))
        .andExpect(jsonPath("$.data.tiles[3].source").value("EMERGENCY"))
        .andExpect(jsonPath("$.data.tiles[3].count").value(1))
        .andExpect(jsonPath("$.data.tiles[3].revenuePaise").value(TOTAL))
        .andExpect(jsonPath("$.data.items", hasSize(4)))
        .andExpect(jsonPath("$.data.items[0].invoiceNumber", startsWith("INV/")))
        .andExpect(jsonPath("$.data.tiles[?(@.source=='ONLINE')]").doesNotExist());
    String list =
        mockMvc
            .perform(
                get("/api/v1/hospital/sales-register")
                    .cookie(mix.fx().cookie())
                    .param("from", today())
                    .param("to", today()))
            .andReturn()
            .getResponse()
            .getContentAsString();
    assertThat(list).doesNotContain(mix.wsNumber());
  }

  @Test
  void ac02_insuranceAndWardFiltersExcludeWs() throws Exception {
    Mix mix = seedMix("reg-filt");

    mockMvc
        .perform(
            get("/api/v1/hospital/sales-register")
                .cookie(mix.fx().cookie())
                .param("from", today())
                .param("to", today())
                .param("paymentMode", "INSURANCE_TPA"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(1)))
        .andExpect(jsonPath("$.data.items[0].invoiceNumber").value(mix.emergencyNumber()))
        .andExpect(jsonPath("$.data.items[0].insurerName").value("Star Health"));
    String filtered =
        mockMvc
            .perform(
                get("/api/v1/hospital/sales-register")
                    .cookie(mix.fx().cookie())
                    .param("from", today())
                    .param("to", today())
                    .param("paymentMode", "INSURANCE_TPA"))
            .andReturn()
            .getResponse()
            .getContentAsString();
    assertThat(filtered).doesNotContain(mix.wsNumber());

    mockMvc
        .perform(
            get("/api/v1/hospital/sales-register")
                .cookie(mix.fx().cookie())
                .param("from", today())
                .param("to", today())
                .param("wardId", mix.wardId().toString()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(1)))
        .andExpect(jsonPath("$.data.items[0].invoiceNumber").value(mix.wardNumber()))
        .andExpect(jsonPath("$.data.items[0].wardName").value("General"));
  }

  @Test
  void ac02_searchMatchesInvoicePatientAndPhone() throws Exception {
    Mix mix = seedMix("reg-q");

    mockMvc
        .perform(
            get("/api/v1/hospital/sales-register")
                .cookie(mix.fx().cookie())
                .param("from", today())
                .param("to", today())
                .param("q", "Ravi Kumar"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(1)))
        .andExpect(jsonPath("$.data.items[0].invoiceNumber").value(mix.wardNumber()));

    mockMvc
        .perform(
            get("/api/v1/hospital/sales-register")
                .cookie(mix.fx().cookie())
                .param("from", today())
                .param("to", today())
                .param("q", "9876500021"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items[0].invoiceNumber").value(mix.wardNumber()));

    mockMvc
        .perform(
            get("/api/v1/hospital/sales-register")
                .cookie(mix.fx().cookie())
                .param("from", today())
                .param("to", today())
                .param("q", mix.counterNumber()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(1)))
        .andExpect(jsonPath("$.data.items[0].invoiceNumber").value(mix.counterNumber()))
        .andExpect(jsonPath("$.data.items[0].invoiceNumber", startsWith("INV/")));
  }

  @Test
  void ac03_totalsMatchFilteredRowsAndIstBounds() throws Exception {
    Mix mix = seedMix("reg-tot");
    UUID staleId =
        createDraft(mix.fx(), mix.product(), null, "reg-tot-old", "COUNTER", null, null, null);
    complete(mix.fx(), staleId, 1, "reg-tot-old-c", cash(TOTAL), null, null);
    SalesInvoice stale = salesInvoiceRepository.findById(staleId).orElseThrow();
    stale.setCompletedAt(LocalDate.now(IST).atStartOfDay(IST).minusSeconds(1).toInstant());
    salesInvoiceRepository.saveAndFlush(stale);

    mockMvc
        .perform(
            get("/api/v1/hospital/sales-register")
                .cookie(mix.fx().cookie())
                .param("from", today())
                .param("to", today())
                .param("source", "WARD"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(1)))
        .andExpect(jsonPath("$.data.totals.count").value(1))
        .andExpect(jsonPath("$.data.totals.revenuePaise").value(TOTAL))
        .andExpect(jsonPath("$.data.totals.paidPaise").value(TOTAL))
        .andExpect(jsonPath("$.data.totals.unpaidPaise").value(TOTAL))
        .andExpect(jsonPath("$.data.totals.insurancePaise").value(0))
        .andExpect(jsonPath("$.data.tiles[1].count").value(1));

    mockMvc
        .perform(
            get("/api/v1/hospital/sales-register")
                .cookie(mix.fx().cookie())
                .param("from", today())
                .param("to", today()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(4)))
        .andExpect(jsonPath("$.data.totals.count").value(4))
        .andExpect(jsonPath("$.data.totals.revenuePaise").value(TOTAL * 4))
        .andExpect(jsonPath("$.data.totals.paidPaise").value(TOTAL * 4))
        .andExpect(jsonPath("$.data.totals.unpaidPaise").value(TOTAL))
        .andExpect(jsonPath("$.data.totals.insurancePaise").value(TOTAL))
        .andExpect(jsonPath("$.data.items[?(@.id=='" + staleId + "')]").doesNotExist());
  }

  @Test
  void ac04_csvAndPdfMatchFilteredRowsAndAudit() throws Exception {
    Mix mix = seedMix("reg-exp");

    MvcResult csv =
        mockMvc
            .perform(
                get("/api/v1/hospital/sales-register/export")
                    .cookie(mix.fx().cookie())
                    .param("from", today())
                    .param("to", today())
                    .param("source", "EMERGENCY")
                    .param("format", "csv"))
            .andExpect(status().isOk())
            .andExpect(header().string("Content-Disposition", containsString("patient-sales")))
            .andReturn();
    String csvBody = csv.getResponse().getContentAsString();
    assertThat(csvBody).contains(mix.emergencyNumber());
    assertThat(csvBody).doesNotContain(mix.wardNumber());
    assertThat(csvBody).doesNotContain(mix.wsNumber());
    assertThat(csvBody).contains("Star Health");

    MvcResult pdf =
        mockMvc
            .perform(
                get("/api/v1/hospital/sales-register/export")
                    .cookie(mix.fx().cookie())
                    .param("from", today())
                    .param("to", today())
                    .param("source", "EMERGENCY")
                    .param("format", "pdf"))
            .andExpect(status().isOk())
            .andReturn();
    PdfReader reader = new PdfReader(pdf.getResponse().getContentAsByteArray());
    String text = new PdfTextExtractor(reader).getTextFromPage(1).replace("\n", "");
    reader.close();
    assertThat(text).contains("INV/2026-");
    assertThat(text).contains("BR01/00004");
    assertThat(text).doesNotContain("WS/");

    assertThat(
            auditEventRepository.findAll().stream()
                .filter(
                    event -> HospitalPolicy.SALES_REGISTER_EXPORT_ACTION.equals(event.getAction()))
                .count())
        .isEqualTo(2);
  }

  @Test
  void ac05_cashierForbiddenPharmacistAccountantAllowed() throws Exception {
    Mix mix = seedMix("reg-auth");
    Cookie cashier = staffWithPredefined(mix.fx(), "cashier", "cash@reg-auth.local");
    Cookie pharmacist = staffWithPredefined(mix.fx(), "pharmacist", "pharm@reg-auth.local");
    Cookie accountant = staffWithPredefined(mix.fx(), "accountant", "acc@reg-auth.local");

    mockMvc
        .perform(
            get("/api/v1/hospital/sales-register")
                .cookie(cashier)
                .param("from", today())
                .param("to", today()))
        .andExpect(status().isForbidden());
    mockMvc
        .perform(
            get("/api/v1/hospital/sales-register")
                .cookie(pharmacist)
                .param("from", today())
                .param("to", today()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(4)));
    mockMvc
        .perform(
            get("/api/v1/hospital/sales-register")
                .cookie(accountant)
                .param("from", today())
                .param("to", today()))
        .andExpect(status().isOk());
  }

  @Test
  void ac05_unauthenticatedOtherTenantOtherBranchAndInvalidInput() throws Exception {
    Mix home = seedMix("reg-iso");
    Mix away = seedMix("reg-away");
    Location annex = persistBranch(home.fx().tenantId(), "Annex", "BR02", false);
    selectBranch(home.fx().cookie(), annex.getId());
    Fixture annexFx = new Fixture(home.fx().tenantId(), annex.getId(), home.fx().cookie());
    Stocked annexProduct = stocked(annexFx, "ANX-1", "Annex Pack");
    UUID annexDraft =
        createDraft(annexFx, annexProduct, null, "reg-iso-ax", "COUNTER", null, null, null);
    String annexNumber = complete(annexFx, annexDraft, 1, "reg-iso-ax-c", cash(TOTAL), null, null);
    selectBranch(home.fx().cookie(), home.fx().branchId());

    mockMvc.perform(get("/api/v1/hospital/sales-register")).andExpect(status().isUnauthorized());

    mockMvc
        .perform(
            get("/api/v1/hospital/sales-register")
                .cookie(home.fx().cookie())
                .param("from", today())
                .param("to", today()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(4)));
    String homeBody =
        mockMvc
            .perform(
                get("/api/v1/hospital/sales-register")
                    .cookie(home.fx().cookie())
                    .param("from", today())
                    .param("to", today()))
            .andReturn()
            .getResponse()
            .getContentAsString();
    assertThat(homeBody).doesNotContain(away.counterId().toString());
    assertThat(homeBody).doesNotContain(annexNumber);

    mockMvc
        .perform(
            get("/api/v1/hospital/sales-register")
                .cookie(home.fx().cookie())
                .param("from", today())
                .param("to", today())
                .param("branchId", annex.getId().toString()))
        .andExpect(status().isNotFound());

    mockMvc
        .perform(
            get("/api/v1/hospital/sales-register")
                .cookie(home.fx().cookie())
                .param("from", today())
                .param("to", today())
                .param("source", "ONLINE"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

    Fixture growth = seedPlan("reg-free", PlanCode.GROWTH);
    mockMvc
        .perform(
            get("/api/v1/hospital/sales-register")
                .cookie(growth.cookie())
                .param("from", today())
                .param("to", today()))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value(HospitalPolicy.PLAN_LIMIT));
  }

  private Mix seedMix(String slug) throws Exception {
    Fixture fx = seedPro(slug);
    configureAccount(fx);
    WardBed ward = createWard(fx, "General", "GEN", 1);
    UUID admissionId = admit(fx, "Ravi Kumar", "UHID-00021", ward, "9876500021");
    UUID customerId = createCustomer(fx.cookie(), "Ravi Kumar", "9876500021");
    setLimit(fx.cookie(), customerId, 50_000, 0);
    Stocked product = stocked(fx, slug + "-p", slug + " Pack");
    issueFloorStock(fx, ward.wardId(), product, slug + "-ws");
    String wsNumber =
        hospitalIssueRepository
            .findAllByTenantIdAndBranchIdOrderByIssuedAtDesc(fx.tenantId(), fx.branchId())
            .get(0)
            .getInvoiceNumber();
    UUID counterId = createDraft(fx, product, null, slug + "-ctr", "COUNTER", null, null, null);
    String counterNumber = complete(fx, counterId, 1, slug + "-ctr-c", cash(TOTAL), null, null);
    UUID opdId = createDraft(fx, product, null, slug + "-opd", "OPD_RX", null, null, null);
    String opdNumber = complete(fx, opdId, 1, slug + "-opd-c", cash(TOTAL), null, null);
    UUID wardId =
        createDraft(
            fx,
            product,
            customerId,
            slug + "-wrd",
            "WARD",
            "UHID-00021",
            ward.wardId(),
            admissionId);
    String wardNumber =
        complete(
            fx,
            wardId,
            1,
            slug + "-wrd-c",
            "{\"mode\":\"CREDIT\",\"amountPaise\":11200}",
            null,
            null);
    UUID emergencyId =
        createDraft(fx, product, null, slug + "-emg", "EMERGENCY", "UHID-CAS-1", null, null);
    String emergencyNumber =
        complete(
            fx,
            emergencyId,
            1,
            slug + "-emg-c",
            "{\"mode\":\"INSURANCE_TPA\",\"amountPaise\":11200}",
            "Star Health",
            "POL-88");
    return new Mix(
        fx,
        product,
        ward.wardId(),
        wsNumber,
        counterId,
        counterNumber,
        opdNumber,
        wardNumber,
        emergencyNumber);
  }

  private String complete(
      Fixture fx,
      UUID invoiceId,
      int version,
      String key,
      String payments,
      String insurer,
      String policy)
      throws Exception {
    String body =
        mockMvc
            .perform(
                post("/api/v1/sales/invoices/" + invoiceId + "/complete")
                    .cookie(fx.cookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(completeJson(version, TOTAL, 0, key, payments, insurer, policy)))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return objectMapper.readTree(body).path("data").path("invoiceNumber").asText();
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

  private static String today() {
    return LocalDate.now(IST).toString();
  }

  private static String cash(long amount) {
    return "{\"mode\":\"CASH\",\"amountPaise\":" + amount + "}";
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

  private record Mix(
      Fixture fx,
      Stocked product,
      UUID wardId,
      String wsNumber,
      UUID counterId,
      String counterNumber,
      String opdNumber,
      String wardNumber,
      String emergencyNumber) {}

  private record Fixture(UUID tenantId, UUID branchId, Cookie cookie) {}

  private record WardBed(UUID wardId, UUID bedId) {}

  private record Stocked(UUID productId, UUID batchId) {}
}
