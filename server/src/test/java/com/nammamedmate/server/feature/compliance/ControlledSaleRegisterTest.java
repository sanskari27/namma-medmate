package com.nammamedmate.server.feature.compliance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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
import com.nammamedmate.server.domain.ControlledSaleKind;
import com.nammamedmate.server.domain.ControlledSaleRegister;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.SalesInvoiceStatus;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.ControlledSaleRegisterRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.SalesInvoiceLineRepository;
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

class ControlledSaleRegisterTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-05T12:00:00Z");
  private static final long UNIT_TOTAL = 11200L;

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private SalesInvoiceRepository salesInvoiceRepository;
  @Autowired private SalesInvoiceLineRepository salesInvoiceLineRepository;
  @Autowired private ControlledSaleRegisterRepository controlledSaleRegisterRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @Test
  void ac01_completedControlledSaleWritesImmutableSnapshots() throws Exception {
    Fixture fx = seed("csr-ac01", "Anika Owner");
    Stocked controlled = stocked(fx, "H1-SALE", "Alprazolam", true, true);
    Stocked otc = stocked(fx, "OTC-SALE", "Paracetamol", false, false);
    UUID customerId = createCustomer(fx.cookie(), "Ravi Patient", "9431000001");
    UUID doctorId = createDoctor(fx.cookie(), "Dr Rao", "KA-2001");

    sellOtc(fx, otc, "otc-skip");
    UUID invoiceId = sellControlled(fx, controlled, customerId, doctorId, "RX-NDPS-1", "csr-ac01");

    mockMvc
        .perform(get("/api/v1/compliance/controlled-register").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.items", hasSize(1)))
        .andExpect(jsonPath("$.data.items[0].kind").value("SALE"))
        .andExpect(jsonPath("$.data.items[0].productName").value("Alprazolam"))
        .andExpect(jsonPath("$.data.items[0].batchNumber").value("LOT-RX"))
        .andExpect(jsonPath("$.data.items[0].quantity").value(1))
        .andExpect(jsonPath("$.data.items[0].prescriptionReference").value("RX-NDPS-1"))
        .andExpect(jsonPath("$.data.items[0].patientName").value("Ravi Patient"))
        .andExpect(jsonPath("$.data.items[0].patientId").value(customerId.toString()))
        .andExpect(jsonPath("$.data.items[0].pharmacistName").value("Anika Owner"))
        .andExpect(jsonPath("$.data.items[0].pharmacistUserId").value(fx.userId().toString()))
        .andExpect(jsonPath("$.data.items[0].salesInvoiceId").value(invoiceId.toString()))
        .andExpect(jsonPath("$.data.items[0].occurredAt").isNotEmpty());

    mockMvc
        .perform(
            get("/api/v1/compliance/controlled-register")
                .cookie(fx.cookie())
                .param("schedule", "H1")
                .param("productId", controlled.productId().toString())
                .param("patientId", customerId.toString())
                .param("pharmacistUserId", fx.userId().toString()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(1)));
    mockMvc
        .perform(
            get("/api/v1/compliance/controlled-register")
                .cookie(fx.cookie())
                .param("patientId", UUID.randomUUID().toString()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(0)));

    Cookie pharmacist = staffWithPredefined(fx, "pharmacist", "rx@csr-ac01.local");
    mockMvc
        .perform(get("/api/v1/compliance/controlled-register").cookie(pharmacist))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(1)));
  }

  @Test
  void ac02_salesReturnWritesLinkedCompensatingFact() throws Exception {
    Fixture fx = seed("csr-ac02", "Anika Owner");
    Stocked controlled = stocked(fx, "H1-RET", "Tramadol", true, true);
    UUID customerId = createCustomer(fx.cookie(), "Meera Patient", "9431000002");
    UUID doctorId = createDoctor(fx.cookie(), "Dr Shah", "KA-2002");
    UUID invoiceId = sellControlled(fx, controlled, customerId, doctorId, "RX-RET-1", "csr-ac02");
    UUID lineId = lineId(fx, invoiceId);

    mockMvc
        .perform(
            post("/api/v1/sales/returns")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(returnJson(invoiceId, lineId, "1", "CASH", "Wrong pack", "csr-ret-1")))
        .andExpect(status().isOk());

    mockMvc
        .perform(get("/api/v1/compliance/controlled-register").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(2)));

    ControlledSaleRegister sale =
        controlledSaleRegisterRepository.findAll().stream()
            .filter(row -> row.getKind() == ControlledSaleKind.SALE)
            .findFirst()
            .orElseThrow();
    ControlledSaleRegister ret =
        controlledSaleRegisterRepository.findAll().stream()
            .filter(row -> row.getKind() == ControlledSaleKind.RETURN)
            .findFirst()
            .orElseThrow();
    assertThat(ret.getSourceRegisterId()).isEqualTo(sale.getId());
    assertThat(ret.getSalesInvoiceLineId()).isEqualTo(sale.getSalesInvoiceLineId());
    assertThat(ret.getQuantity()).isEqualByComparingTo("1");
    assertThat(ret.getPatientName()).isEqualTo("Meera Patient");
    assertThat(ret.getPrescriptionReference()).isEqualTo("RX-RET-1");

    mockMvc
        .perform(
            post("/api/v1/sales/returns")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(returnJson(invoiceId, lineId, "1", "CASH", "Wrong pack", "csr-ret-1")))
        .andExpect(status().isOk());
    assertThat(controlledSaleRegisterRepository.count()).isEqualTo(2);
  }

  @Test
  void ac03_registerHasNoManualWriteEndpoints() throws Exception {
    Fixture fx = seed("csr-ac03", "Anika Owner");
    mockMvc
        .perform(
            post("/api/v1/compliance/controlled-register")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isMethodNotAllowed());
    mockMvc
        .perform(
            patch("/api/v1/compliance/controlled-register")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isMethodNotAllowed());
    mockMvc
        .perform(
            put("/api/v1/compliance/controlled-register")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isMethodNotAllowed());
    mockMvc
        .perform(delete("/api/v1/compliance/controlled-register").cookie(fx.cookie()))
        .andExpect(status().isMethodNotAllowed());
  }

  @Test
  void ac04_exportsNdpsFormAndSpreadsheet() throws Exception {
    Fixture fx = seed("csr-ac04", "Anika Owner");
    Stocked controlled = stocked(fx, "NDPS-X", "Morphine", true, true);
    UUID customerId = createCustomer(fx.cookie(), "Kiran Patient", "9431000004");
    UUID doctorId = createDoctor(fx.cookie(), "Dr Iyer", "KA-2004");
    sellControlled(fx, controlled, customerId, doctorId, "RX-X-4", "csr-ac04");

    mockMvc
        .perform(
            get("/api/v1/compliance/controlled-register/export")
                .cookie(fx.cookie())
                .param("format", "csv"))
        .andExpect(status().isOk())
        .andExpect(
            header()
                .string(
                    "Content-Disposition", "attachment; filename=\"controlled-sale-register.csv\""))
        .andExpect(content().string(org.hamcrest.Matchers.containsString("Kiran Patient")))
        .andExpect(content().string(org.hamcrest.Matchers.containsString("RX-X-4")))
        .andExpect(content().string(org.hamcrest.Matchers.containsString("SALE")));

    mockMvc
        .perform(
            get("/api/v1/compliance/controlled-register/export")
                .cookie(fx.cookie())
                .param("format", "ndps"))
        .andExpect(status().isOk())
        .andExpect(
            header()
                .string("Content-Disposition", "attachment; filename=\"ndps-sale-register.csv\""))
        .andExpect(content().string(org.hamcrest.Matchers.containsString("date_ist")))
        .andExpect(content().string(org.hamcrest.Matchers.containsString("Kiran Patient")))
        .andExpect(content().string(org.hamcrest.Matchers.containsString("issue_qty")));

    mockMvc
        .perform(
            get("/api/v1/compliance/controlled-register/export")
                .cookie(fx.cookie())
                .param("format", "xlsx"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
  }

  @Test
  void ac05_incompleteUnauthorizedAndCrossTenantAreDenied() throws Exception {
    Fixture incomplete = seed("csr-ac05a", "  ");
    Stocked controlled = stocked(incomplete, "H1-MISS", "Alprazolam", true, true);
    UUID customerId = createCustomer(incomplete.cookie(), "No Name", "9431000005");
    UUID doctorId = createDoctor(incomplete.cookie(), "Dr Gap", "KA-2005");
    UUID invoiceId =
        idOf(
            mockMvc
                .perform(
                    post("/api/v1/sales/invoices")
                        .cookie(incomplete.cookie())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                            draftJson(
                                customerId,
                                doctorId,
                                "RX-MISS",
                                true,
                                controlled,
                                "1",
                                "30",
                                "miss-draft")))
                .andExpect(status().isOk())
                .andReturn());
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/complete")
                .cookie(incomplete.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(completeJson(1, UNIT_TOTAL, "miss-pay")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("INCOMPLETE_REGISTER"));
    assertThat(salesInvoiceRepository.findById(invoiceId).orElseThrow().getStatus())
        .isEqualTo(SalesInvoiceStatus.DRAFT);
    assertThat(controlledSaleRegisterRepository.count()).isZero();

    Fixture fx = seed("csr-ac05b", "Anika Owner");
    Stocked packed = stocked(fx, "H1-OK", "Alprazolam", true, true);
    UUID patient = createCustomer(fx.cookie(), "Safe Patient", "9431000006");
    UUID doc = createDoctor(fx.cookie(), "Dr Safe", "KA-2006");
    UUID sold = sellControlled(fx, packed, patient, doc, "RX-OK", "csr-ac05b");
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + sold + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(completeJson(2, UNIT_TOTAL, "csr-ac05b-pay")))
        .andExpect(status().isOk());
    assertThat(controlledSaleRegisterRepository.count()).isEqualTo(1);

    Cookie cashier = staffWithPredefined(fx, "cashier", "till@csr-ac05b.local");
    mockMvc
        .perform(get("/api/v1/compliance/controlled-register").cookie(cashier))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    mockMvc
        .perform(
            get("/api/v1/compliance/controlled-register/export")
                .cookie(cashier)
                .param("format", "csv"))
        .andExpect(status().isForbidden());

    mockMvc
        .perform(get("/api/v1/compliance/controlled-register"))
        .andExpect(status().isUnauthorized());

    Fixture other = seed("csr-ac05c", "Other Owner");
    mockMvc
        .perform(
            get("/api/v1/compliance/controlled-register")
                .cookie(other.cookie())
                .param("branchId", fx.branchId().toString()))
        .andExpect(status().isNotFound());
    mockMvc
        .perform(get("/api/v1/compliance/controlled-register").cookie(other.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(0)));

    Location annex = persistBranch(fx.tenantId(), "Annex", "BR2", false);
    mockMvc
        .perform(
            get("/api/v1/compliance/controlled-register")
                .cookie(fx.cookie())
                .param("branchId", annex.getId().toString()))
        .andExpect(status().isNotFound());
    mockMvc
        .perform(
            get("/api/v1/compliance/controlled-register/export")
                .cookie(fx.cookie())
                .param("branchId", annex.getId().toString())
                .param("format", "csv"))
        .andExpect(status().isNotFound());
    selectBranch(fx.cookie(), annex.getId());
    mockMvc
        .perform(get("/api/v1/compliance/controlled-register").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(0)));
    mockMvc
        .perform(
            get("/api/v1/compliance/controlled-register/export")
                .cookie(fx.cookie())
                .param("format", "csv"))
        .andExpect(status().isOk())
        .andExpect(
            content()
                .string(
                    org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("Safe Patient"))));

    AppUser stray =
        persistUser(fx.tenantId(), "nobranch@csr-ac05b.local", AppUserRole.pharmacy_owner, "Stray");
    Cookie noBranch = login(stray.getEmail());
    mockMvc
        .perform(get("/api/v1/compliance/controlled-register").cookie(noBranch))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("NO_ACTIVE_BRANCH"));

    mockMvc
        .perform(
            get("/api/v1/compliance/controlled-register")
                .cookie(fx.cookie())
                .param("schedule", "COLD"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
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

  private void sellOtc(Fixture fx, Stocked product, String key) throws Exception {
    UUID invoiceId =
        idOf(
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
                                "discountPaise":0
                              }]
                            }
                            """
                                .formatted(key, product.productId(), product.batchId())))
                .andExpect(status().isOk())
                .andReturn());
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(completeJson(1, UNIT_TOTAL, key + "-pay")))
        .andExpect(status().isOk());
  }

  private UUID lineId(Fixture fx, UUID invoiceId) {
    return salesInvoiceLineRepository
        .findAllBySalesInvoiceIdAndTenantIdAndBranchIdOrderBySortOrderAsc(
            invoiceId, fx.tenantId(), fx.branchId())
        .get(0)
        .getId();
  }

  private UUID idOf(MvcResult result) throws Exception {
    return UUID.fromString(
        objectMapper
            .readTree(result.getResponse().getContentAsString())
            .path("data")
            .path("id")
            .asText());
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
    mockMvc
        .perform(
            post("/api/v1/session/branch")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchId\":\"" + fx.branchId() + "\"}"))
        .andExpect(status().isOk());
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

  private Fixture seed(String tag, String ownerName) throws Exception {
    Tenant tenant = persistTenant(tag, "Sale " + tag);
    persistPlan(tenant.getId());
    AppUser owner =
        persistUser(
            tenant.getId(), "owner@" + tag + ".local", AppUserRole.pharmacy_owner, ownerName);
    Location branch = persistBranch(tenant.getId(), "Main", "BR01", true);
    Cookie cookie = login(owner.getEmail());
    mockMvc
        .perform(
            post("/api/v1/session/branch")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchId\":\"" + branch.getId() + "\"}"))
        .andExpect(status().isOk());
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

  private static String returnJson(
      UUID invoiceId, UUID lineId, String quantity, String refundMode, String reason, String key) {
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
        .formatted(invoiceId, reason, refundMode, key, lineId, quantity);
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
