package com.nammamedmate.server.feature.sales;

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
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.SalesInvoiceLine;
import com.nammamedmate.server.domain.SalesInvoiceStatus;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.SalesInvoiceLineRepository;
import com.nammamedmate.server.persistence.SalesInvoiceRepository;
import com.nammamedmate.server.persistence.SalesPrescriptionFulfillmentRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import jakarta.servlet.http.Cookie;
import java.math.BigDecimal;
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

class SalesInvoicePrescriptionTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-05T07:00:00Z");
  private static final long UNIT_TOTAL = 11200L;

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private SalesInvoiceRepository salesInvoiceRepository;
  @Autowired private SalesInvoiceLineRepository salesInvoiceLineRepository;
  @Autowired private SalesPrescriptionFulfillmentRepository fulfillmentRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @Test
  void ac01_storesVerifiedCheckboxAndReferenceNotImage() throws Exception {
    Fixture fx = seed("rx-ac01");
    Stocked product = stocked(fx, "RX-OTC", "Amoxil", true, false);
    UUID customerId = createCustomer(fx.cookie(), "Ravi", "9421000001");
    UUID invoiceId =
        idOf(
            mockMvc
                .perform(
                    post("/api/v1/sales/invoices")
                        .cookie(fx.cookie())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                            draftJson(
                                customerId, null, "RX-1", true, product, "1", "90", "rx-ac01")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.prescriptionReference").value("RX-1"))
                .andExpect(jsonPath("$.data.prescriptionVerified").value(true))
                .andExpect(jsonPath("$.data.prescriptionImage").doesNotExist())
                .andExpect(jsonPath("$.data.lines[0].prescribedQuantity").value(90))
                .andReturn());

    mockMvc
        .perform(get("/api/v1/sales/invoices/" + invoiceId).cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.prescriptionReference").value("RX-1"))
        .andExpect(jsonPath("$.data.prescriptionVerified").value(true))
        .andExpect(jsonPath("$.data.prescriptionImage").doesNotExist());
  }

  @Test
  void ac02_controlledNeedsPharmacistPatientAndPrescriber() throws Exception {
    Fixture fx = seed("rx-ac02");
    Stocked controlled = stocked(fx, "H1-RX", "Alprazolam", true, true);
    UUID customerId = createCustomer(fx.cookie(), "Meera", "9421000002");
    UUID doctorId = createDoctor(fx.cookie(), "Dr Rao", "KA-100");
    Cookie cashier = staffWithPredefined(fx, "cashier", "till@rx-ac02.local");
    Cookie pharmacist = staffWithPredefined(fx, "pharmacist", "rx@rx-ac02.local");

    mockMvc
        .perform(
            post("/api/v1/sales/invoices")
                .cookie(cashier)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    draftJson(
                        customerId, doctorId, "RX-H1", true, controlled, "1", "30", "cash-h1")))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("PHARMACIST_REQUIRED"));

    mockMvc
        .perform(
            post("/api/v1/sales/invoices")
                .cookie(pharmacist)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    draftJson(customerId, null, "RX-H1", true, controlled, "1", "30", "no-doc")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("INCOMPLETE_CONTROLLED"));

    UUID invoiceId =
        idOf(
            mockMvc
                .perform(
                    post("/api/v1/sales/invoices")
                        .cookie(pharmacist)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                            draftJson(
                                customerId,
                                doctorId,
                                "RX-H1",
                                true,
                                controlled,
                                "1",
                                "30",
                                "ok-h1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.doctorId").value(doctorId.toString()))
                .andReturn());

    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/complete")
                .cookie(cashier)
                .contentType(MediaType.APPLICATION_JSON)
                .content(completeJson(1, UNIT_TOTAL, "cash-collect")))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("PHARMACIST_REQUIRED"));

    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/complete")
                .cookie(pharmacist)
                .contentType(MediaType.APPLICATION_JSON)
                .content(completeJson(1, UNIT_TOTAL, "rx-collect")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("COMPLETED"));
  }

  @Test
  void ac03_partialFulfillmentIsTrackedAgainstReference() throws Exception {
    Fixture fx = seed("rx-ac03");
    Stocked product = stocked(fx, "RX-FILL", "Thyronorm", true, false);
    UUID customerId = createCustomer(fx.cookie(), "Anu", "9421000003");
    UUID firstId =
        idOf(
            mockMvc
                .perform(
                    post("/api/v1/sales/invoices")
                        .cookie(fx.cookie())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                            draftJson(
                                customerId, null, "RX-90", true, product, "30", "90", "fill-1")))
                .andExpect(status().isOk())
                .andReturn());
    mockMvc
        .perform(
            get("/api/v1/sales/prescriptions")
                .cookie(fx.cookie())
                .param("reference", "RX-90")
                .param("customerId", customerId.toString()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items").isEmpty());

    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + firstId + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(completeJson(1, 30 * UNIT_TOTAL, "fill-1-pay")))
        .andExpect(status().isOk());

    mockMvc
        .perform(
            get("/api/v1/sales/prescriptions")
                .cookie(fx.cookie())
                .param("reference", "RX-90")
                .param("customerId", customerId.toString()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items[0].productId").value(product.productId().toString()))
        .andExpect(jsonPath("$.data.items[0].prescribedQuantity").value(90))
        .andExpect(jsonPath("$.data.items[0].fulfilledQuantity").value(30))
        .andExpect(jsonPath("$.data.items[0].remainingQuantity").value(60));

    UUID secondId =
        idOf(
            mockMvc
                .perform(
                    post("/api/v1/sales/invoices")
                        .cookie(fx.cookie())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                            draftJson(
                                customerId, null, "RX-90", true, product, "30", "90", "fill-2")))
                .andExpect(status().isOk())
                .andReturn());
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + secondId + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(completeJson(1, 30 * UNIT_TOTAL, "fill-2-pay")))
        .andExpect(status().isOk());

    mockMvc
        .perform(
            get("/api/v1/sales/prescriptions")
                .cookie(fx.cookie())
                .param("reference", "RX-90")
                .param("customerId", customerId.toString()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items[0].fulfilledQuantity").value(60))
        .andExpect(jsonPath("$.data.items[0].remainingQuantity").value(30));

    mockMvc
        .perform(
            post("/api/v1/sales/invoices")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    draftJson(customerId, null, "RX-90", true, product, "31", "90", "fill-over")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("OVER_FULFILLMENT"));
  }

  @Test
  void ac03_firstVisitCannotExceedPrescribedQuantity() throws Exception {
    Fixture fx = seed("rx-ac03-first");
    Stocked product = stocked(fx, "RX-OVER", "Thyronorm Over", true, false);
    UUID customerId = createCustomer(fx.cookie(), "Dev", "9421000031");

    mockMvc
        .perform(
            post("/api/v1/sales/invoices")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    draftJson(
                        customerId, null, "RX-FIRST", true, product, "91", "90", "first-over")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("OVER_FULFILLMENT"));

    UUID invoiceId =
        idOf(
            mockMvc
                .perform(
                    post("/api/v1/sales/invoices")
                        .cookie(fx.cookie())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                            draftJson(
                                customerId,
                                null,
                                "RX-FIRST",
                                true,
                                product,
                                "90",
                                "90",
                                "first-ok")))
                .andExpect(status().isOk())
                .andReturn());
    SalesInvoiceLine line =
        salesInvoiceLineRepository
            .findAllBySalesInvoiceIdAndTenantIdAndBranchIdOrderBySortOrderAsc(
                invoiceId, fx.tenantId(), fx.branchId())
            .get(0);
    line.setQuantity(new BigDecimal("91"));
    line.setBaseQuantity(new BigDecimal("91"));
    salesInvoiceLineRepository.saveAndFlush(line);

    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(completeJson(1, 90 * UNIT_TOTAL, "first-over-pay")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("OVER_FULFILLMENT"));
    assertThat(
            fulfillmentRepository.findByTenantIdAndPrescriptionReferenceAndProductId(
                fx.tenantId(), "RX-FIRST", product.productId()))
        .isEmpty();
    assertThat(salesInvoiceRepository.findById(invoiceId).orElseThrow().getStatus())
        .isEqualTo(SalesInvoiceStatus.DRAFT);
  }

  @Test
  void ac04_doctorRemainsAReferenceEntity() throws Exception {
    Fixture fx = seed("rx-ac04");
    Stocked controlled = stocked(fx, "H1-DOC", "Schedule Pack", true, true);
    UUID customerId = createCustomer(fx.cookie(), "Kiran", "9421000004");
    UUID doctorId = createDoctor(fx.cookie(), "Dr Nair", "KA-200");
    UUID foreignDoctor = UUID.randomUUID();

    mockMvc
        .perform(
            post("/api/v1/sales/invoices")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    draftJson(
                        customerId,
                        foreignDoctor,
                        "RX-DOC",
                        true,
                        controlled,
                        "1",
                        "10",
                        "bad-doc")))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));

    mockMvc
        .perform(
            post("/api/v1/sales/invoices")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    draftJson(
                        customerId, doctorId, "RX-DOC", true, controlled, "1", "10", "ok-doc")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.doctorId").value(doctorId.toString()));
    mockMvc
        .perform(get("/api/v1/doctors/" + doctorId).cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.name").value("Dr Nair"));
  }

  @Test
  void ac05_unverifiedCashierOverfillForeignAndIsolationFail() throws Exception {
    Fixture fx = seed("rx-ac05");
    Stocked rx = stocked(fx, "RX-ISO", "Cefixime", true, false);
    Stocked controlled = stocked(fx, "H1-ISO", "NDPS Pack", true, true);
    UUID customerA = createCustomer(fx.cookie(), "Asha", "9421000005");
    UUID customerB = createCustomer(fx.cookie(), "Bala", "9421000006");
    UUID doctorId = createDoctor(fx.cookie(), "Dr Iyer", "KA-300");
    Cookie cashier = staffWithPredefined(fx, "cashier", "till@rx-ac05.local");

    mockMvc
        .perform(
            post("/api/v1/sales/invoices")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(draftJson(customerA, null, null, false, rx, "1", "10", "no-rx")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("RX_REQUIRED"));

    mockMvc
        .perform(
            post("/api/v1/sales/invoices")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(draftJson(null, doctorId, "RX-H", true, controlled, "1", "10", "walk-h1")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("INCOMPLETE_CONTROLLED"));

    mockMvc
        .perform(
            post("/api/v1/sales/invoices")
                .cookie(cashier)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    draftJson(customerA, doctorId, "RX-H", true, controlled, "1", "10", "cash-h1")))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("PHARMACIST_REQUIRED"));

    UUID firstId =
        idOf(
            mockMvc
                .perform(
                    post("/api/v1/sales/invoices")
                        .cookie(fx.cookie())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                            draftJson(customerA, null, "RX-BIND", true, rx, "1", "5", "bind-a")))
                .andExpect(status().isOk())
                .andReturn());
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + firstId + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(completeJson(1, UNIT_TOTAL, "bind-a-pay")))
        .andExpect(status().isOk());

    mockMvc
        .perform(
            post("/api/v1/sales/invoices")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(draftJson(customerB, null, "RX-BIND", true, rx, "1", "5", "bind-b")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("FOREIGN_REFERENCE"));

    mockMvc
        .perform(
            get("/api/v1/sales/prescriptions")
                .cookie(fx.cookie())
                .param("reference", "RX-BIND")
                .param("customerId", customerB.toString()))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("FOREIGN_REFERENCE"))
        .andExpect(jsonPath("$.data").doesNotExist());

    Fixture other = seed("rx-ac05b");
    mockMvc.perform(get("/api/v1/sales/prescriptions")).andExpect(status().isUnauthorized());
    mockMvc
        .perform(
            get("/api/v1/sales/prescriptions")
                .cookie(other.cookie())
                .param("reference", "RX-BIND")
                .param("customerId", customerA.toString()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items").isEmpty());
    mockMvc
        .perform(get("/api/v1/sales/invoices/" + firstId).cookie(other.cookie()))
        .andExpect(status().isNotFound());
    assertThat(salesInvoiceRepository.findById(firstId).orElseThrow().getStatus())
        .isEqualTo(SalesInvoiceStatus.COMPLETED);
    assertThat(
            fulfillmentRepository
                .findByTenantIdAndPrescriptionReferenceAndProductId(
                    fx.tenantId(), "RX-BIND", rx.productId())
                .orElseThrow()
                .getCustomerId())
        .isEqualTo(customerA);
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
    AppUser staff = persistUser(fx.tenantId(), email, AppUserRole.pharmacy_staff);
    UUID roleId = predefinedId(fx.cookie(), roleCode);
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

  private Fixture seed(String tag) throws Exception {
    Tenant tenant = persistTenant(tag, "Rx " + tag);
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
    return new Fixture(tenant.getId(), branch.getId(), cookie);
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

  private static String draftJson(
      UUID customerId,
      UUID doctorId,
      String reference,
      boolean verified,
      Stocked product,
      String quantity,
      String prescribed,
      String key) {
    String customer = customerId == null ? "null" : "\"" + customerId + "\"";
    String doctor = doctorId == null ? "null" : "\"" + doctorId + "\"";
    String rx = reference == null ? "null" : "\"" + reference + "\"";
    return """
        {
          "customerId":%s,
          "doctorId":%s,
          "prescriptionReference":%s,
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
            customer,
            doctor,
            rx,
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
        .formatted(sku, name, categoryId, prescriptionRequired, schedule, controlled);
  }

  private record Fixture(UUID tenantId, UUID branchId, Cookie cookie) {}

  private record Stocked(UUID productId, UUID batchId) {}
}
