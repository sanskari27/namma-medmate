package com.nammamedmate.server.feature.sales;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.AbstractIntegrationTest;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.BranchType;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.SalesInvoiceLine;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.SalesInvoiceLineRepository;
import com.nammamedmate.server.persistence.SalesOfferRepository;
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

class SalesOfferTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-05T12:00:00Z");

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private SalesInvoiceLineRepository salesInvoiceLineRepository;
  @Autowired private SalesOfferRepository salesOfferRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @Test
  void ac01_configureAndApplyFollowsPriorityStackingTaxAndPublish() throws Exception {
    Fixture fx = seed("offer-ac01");
    Stocked product = stocked(fx, "OFF-1", "Scheme Pack");
    UUID bogoId =
        createOffer(fx, bogoJson("Buy 2 get 1", 20, product.productId(), product.productId()));
    mockMvc
        .perform(
            post("/api/v1/offers/" + bogoId + "/publish")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expectedVersion\":1}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("ACTIVE"))
        .andExpect(jsonPath("$.data.discountApprovalStatus").doesNotExist());
    UUID seasonalId =
        createOffer(
            fx,
            seasonalJson(
                "Monsoon 10",
                5,
                product.productId(),
                "2026-01-01T00:00:00Z",
                "2026-12-31T00:00:00Z",
                "PERCENT",
                1000));
    mockMvc
        .perform(
            post("/api/v1/offers/" + seasonalId + "/publish")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expectedVersion\":1}"))
        .andExpect(status().isOk());

    UUID invoiceId = createDraft(fx, product, "3", "offer-1");
    mockMvc
        .perform(get("/api/v1/sales/invoices/" + invoiceId + "/offers").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(2)))
        .andExpect(jsonPath("$.data.items[0].id").value(bogoId.toString()))
        .andExpect(jsonPath("$.data.items[0].priority").value(20));

    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/offers")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expectedVersion\":1}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.lines[0].offerId").value(bogoId.toString()))
        .andExpect(jsonPath("$.data.lines[0].offerKind").value("BOGO"))
        .andExpect(jsonPath("$.data.lines[0].offerBenefitPaise").value(10000))
        .andExpect(jsonPath("$.data.discountPaise").value(10000))
        .andExpect(jsonPath("$.data.subtotalPaise").value(20000))
        .andExpect(jsonPath("$.data.taxPaise").value(2400))
        .andExpect(jsonPath("$.data.totalPaise").value(22400));
  }

  @Test
  void ac02_appliedBenefitsAreSnapshottedOnInvoiceLines() throws Exception {
    Fixture fx = seed("offer-ac02");
    Stocked product = stocked(fx, "OFF-2", "Snap Pack");
    UUID offerId =
        createOffer(
            fx,
            seasonalJson(
                "Festive 10",
                8,
                product.productId(),
                "2026-01-01T00:00:00Z",
                "2026-12-31T00:00:00Z",
                "PERCENT",
                1000));
    publish(fx, offerId, 1);
    UUID invoiceId = createDraft(fx, product, "1", "offer-2");
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/offers")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expectedVersion\":1}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.lines[0].offerName").value("Festive 10"))
        .andExpect(jsonPath("$.data.lines[0].offerBenefitPaise").value(1000))
        .andExpect(jsonPath("$.data.lines[0].offerExplanation").isNotEmpty());

    mockMvc
        .perform(
            patch("/api/v1/offers/" + offerId)
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    seasonalJson(
                        "Renamed festive",
                        8,
                        product.productId(),
                        "2026-01-01T00:00:00Z",
                        "2026-12-31T00:00:00Z",
                        "PERCENT",
                        1000,
                        2)))
        .andExpect(status().isOk());

    mockMvc
        .perform(get("/api/v1/sales/invoices/" + invoiceId).cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.lines[0].offerId").value(offerId.toString()))
        .andExpect(jsonPath("$.data.lines[0].offerName").value("Festive 10"))
        .andExpect(jsonPath("$.data.lines[0].offerKind").value("SEASONAL"))
        .andExpect(jsonPath("$.data.lines[0].offerBenefitPaise").value(1000));
    SalesInvoiceLine line =
        salesInvoiceLineRepository
            .findAllBySalesInvoiceIdAndTenantIdAndBranchIdOrderBySortOrderAsc(
                invoiceId, fx.tenantId(), fx.branchId())
            .get(0);
    assertThat(line.getOfferName()).isEqualTo("Festive 10");
    assertThat(line.getOfferBenefitPaise()).isEqualTo(1000L);
  }

  @Test
  void ac03_expiredAndInactiveOffersNeverApply() throws Exception {
    Fixture fx = seed("offer-ac03");
    Stocked product = stocked(fx, "OFF-3", "Window Pack");
    UUID expiredId =
        createOffer(
            fx,
            seasonalJson(
                "Last year",
                9,
                product.productId(),
                "2020-01-01T00:00:00Z",
                "2020-12-31T00:00:00Z",
                "PERCENT",
                5000));
    publish(fx, expiredId, 1);
    UUID liveId =
        createOffer(
            fx,
            seasonalJson(
                "This year",
                3,
                product.productId(),
                "2026-01-01T00:00:00Z",
                "2026-12-31T00:00:00Z",
                "PERCENT",
                1000));
    publish(fx, liveId, 1);
    mockMvc
        .perform(
            post("/api/v1/offers/" + liveId + "/deactivate")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expectedVersion\":2}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("INACTIVE"));

    UUID invoiceId = createDraft(fx, product, "1", "offer-3");
    mockMvc
        .perform(get("/api/v1/sales/invoices/" + invoiceId + "/offers").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(0)));
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/offers")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expectedVersion\":1}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.lines[0].offerId").value(org.hamcrest.Matchers.nullValue()))
        .andExpect(jsonPath("$.data.totalPaise").value(11200));
    assertThat(
            salesInvoiceLineRepository
                .findAllBySalesInvoiceIdAndTenantIdAndBranchIdOrderBySortOrderAsc(
                    invoiceId, fx.tenantId(), fx.branchId())
                .get(0)
                .getOfferId())
        .isNull();
  }

  @Test
  void ac04_manualDiscountAndSchemeProduceDeterministicTotal() throws Exception {
    Fixture fx = seed("offer-ac04");
    Stocked product = stocked(fx, "OFF-4", "Mix Pack");
    UUID offerId =
        createOffer(
            fx,
            seasonalJson(
                "Till 10",
                6,
                product.productId(),
                "2026-01-01T00:00:00Z",
                "2026-12-31T00:00:00Z",
                "PERCENT",
                1000));
    publish(fx, offerId, 1);
    UUID invoiceId = createDraft(fx, product, "1", "offer-4");
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/pricing")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"expectedVersion":1,"billDiscountType":"NONE","billDiscountValue":0,"lines":[{"productId":"%s","type":"PERCENT","value":1000}]}
                    """
                        .formatted(product.productId())))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/offers")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expectedVersion\":2}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.discountPaise").value(2000))
        .andExpect(jsonPath("$.data.subtotalPaise").value(8000))
        .andExpect(jsonPath("$.data.taxPaise").value(960))
        .andExpect(jsonPath("$.data.totalPaise").value(8960));
    int version =
        objectMapper
            .readTree(
                mockMvc
                    .perform(get("/api/v1/sales/invoices/" + invoiceId).cookie(fx.cookie()))
                    .andExpect(status().isOk())
                    .andReturn()
                    .getResponse()
                    .getContentAsString())
            .path("data")
            .path("version")
            .asInt();
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/offers")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expectedVersion\":%d}".formatted(version)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.totalPaise").value(8960))
        .andExpect(jsonPath("$.data.discountPaise").value(2000));
  }

  @Test
  void ac05_ambiguousRecursiveDatesUnauthorizedStaleAndIsolationFail() throws Exception {
    Fixture fx = seed("offer-ac05");
    Stocked product = stocked(fx, "OFF-5", "Guard Pack");
    UUID first =
        createOffer(
            fx,
            seasonalJson(
                "Same A",
                4,
                product.productId(),
                "2026-01-01T00:00:00Z",
                "2026-12-31T00:00:00Z",
                "PERCENT",
                1000));
    UUID second =
        createOffer(
            fx,
            seasonalJson(
                "Same B",
                4,
                product.productId(),
                "2026-01-01T00:00:00Z",
                "2026-12-31T00:00:00Z",
                "PERCENT",
                2000));
    publish(fx, first, 1);
    publish(fx, second, 1);
    UUID invoiceId = createDraft(fx, product, "1", "offer-5");
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/offers")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expectedVersion\":1}"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("AMBIGUOUS_PRECEDENCE"));
    assertThat(
            salesInvoiceLineRepository
                .findAllBySalesInvoiceIdAndTenantIdAndBranchIdOrderBySortOrderAsc(
                    invoiceId, fx.tenantId(), fx.branchId())
                .get(0)
                .getOfferId())
        .isNull();

    mockMvc
        .perform(
            post("/api/v1/offers")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    seasonalJson(
                        "Bad dates",
                        1,
                        product.productId(),
                        "2026-12-01T00:00:00Z",
                        "2026-01-01T00:00:00Z",
                        "PERCENT",
                        1000)))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("INVALID_DATES"));

    mockMvc
        .perform(
            post("/api/v1/offers")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(bundleJson("Nested", 1, first)))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("RECURSIVE_BUNDLE"));

    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/offers")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expectedVersion\":0}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("STALE_STATE"));

    mockMvc
        .perform(
            post("/api/v1/offers")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    seasonalJson(
                        "Anon",
                        1,
                        product.productId(),
                        "2026-01-01T00:00:00Z",
                        "2026-12-31T00:00:00Z",
                        "PERCENT",
                        1000)))
        .andExpect(status().isUnauthorized());

    AppUser stock =
        persistUser(fx.tenantId(), "stock@offer-ac05.local", AppUserRole.pharmacy_staff);
    UUID invRole = createRole(fx.cookie(), "Store", "[\"INVENTORY\"]");
    mockMvc
        .perform(
            put("/api/v1/users/" + stock.getId() + "/roles")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleIds\":[\"" + invRole + "\"]}"))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            put("/api/v1/users/" + stock.getId() + "/branches")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchIds\":[\"" + fx.branchId() + "\"]}"))
        .andExpect(status().isOk());
    Cookie invCookie = login("stock@offer-ac05.local");
    mockMvc
        .perform(
            post("/api/v1/session/branch")
                .cookie(invCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchId\":\"" + fx.branchId() + "\"}"))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            post("/api/v1/offers")
                .cookie(invCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    seasonalJson(
                        "Denied",
                        1,
                        product.productId(),
                        "2026-01-01T00:00:00Z",
                        "2026-12-31T00:00:00Z",
                        "PERCENT",
                        1000)))
        .andExpect(status().isForbidden());

    Tenant other = persistTenant("other-offer", "Other Offer");
    persistPlan(other.getId());
    persistUser(other.getId(), "owner@other-offer.local", AppUserRole.pharmacy_owner);
    Location otherBranch = persistBranch(other.getId());
    Cookie otherCookie = login("owner@other-offer.local");
    mockMvc
        .perform(
            post("/api/v1/session/branch")
                .cookie(otherCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchId\":\"" + otherBranch.getId() + "\"}"))
        .andExpect(status().isOk());
    mockMvc
        .perform(get("/api/v1/offers/" + first).cookie(otherCookie))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
  }

  private UUID createOffer(Fixture fx, String json) throws Exception {
    MvcResult created =
        mockMvc
            .perform(
                post("/api/v1/offers")
                    .cookie(fx.cookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(json))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andReturn();
    return UUID.fromString(
        objectMapper
            .readTree(created.getResponse().getContentAsString())
            .path("data")
            .path("id")
            .asText());
  }

  private void publish(Fixture fx, UUID offerId, int version) throws Exception {
    mockMvc
        .perform(
            post("/api/v1/offers/" + offerId + "/publish")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expectedVersion\":%d}".formatted(version)))
        .andExpect(status().isOk());
  }

  private UUID createDraft(Fixture fx, Stocked product, String quantity, String key)
      throws Exception {
    MvcResult created =
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
                            "quantity":%s,
                            "unit":"Tablet",
                            "mrpPaise":12000,
                            "sellingPricePaise":10000,
                            "discountPaise":0
                          }]
                        }
                        """
                            .formatted(key, product.productId(), product.batchId(), quantity)))
            .andExpect(status().isOk())
            .andReturn();
    return UUID.fromString(
        objectMapper
            .readTree(created.getResponse().getContentAsString())
            .path("data")
            .path("id")
            .asText());
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
                    "{\"productId\":\"%s\",\"batchNumber\":\"LOT-OF\",\"manufacturedOn\":\"2026-01-15\",\"expiresOn\":\"2027-06-30\",\"purchasePricePaise\":12500,\"quantity\":\"10\",\"idempotencyKey\":\"%s-recv\",\"expectedVersion\":0}"
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
    Tenant tenant = persistTenant(tag, "Offer " + tag);
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

  private static String bogoJson(String name, int priority, UUID trigger, UUID benefit) {
    return """
        {
          "name":"%s",
          "kind":"BOGO",
          "priority":%d,
          "buyQuantity":2,
          "getQuantity":1,
          "benefitType":"FREE_QTY",
          "benefitValue":1,
          "products":[
            {"productId":"%s","slot":"TRIGGER"},
            {"productId":"%s","slot":"BENEFIT"}
          ]
        }
        """
        .formatted(name, priority, trigger, benefit);
  }

  private static String seasonalJson(
      String name,
      int priority,
      UUID productId,
      String startsAt,
      String endsAt,
      String benefitType,
      long benefitValue) {
    return seasonalJson(
        name, priority, productId, startsAt, endsAt, benefitType, benefitValue, null);
  }

  private static String seasonalJson(
      String name,
      int priority,
      UUID productId,
      String startsAt,
      String endsAt,
      String benefitType,
      long benefitValue,
      Integer expectedVersion) {
    String version =
        expectedVersion == null ? "" : ",\"expectedVersion\":%d".formatted(expectedVersion);
    return """
        {
          "name":"%s",
          "kind":"SEASONAL",
          "priority":%d,
          "startsAt":"%s",
          "endsAt":"%s",
          "benefitType":"%s",
          "benefitValue":%d,
          "products":[{"productId":"%s","slot":"TRIGGER"}]
          %s
        }
        """
        .formatted(name, priority, startsAt, endsAt, benefitType, benefitValue, productId, version);
  }

  private static String bundleJson(String name, int priority, UUID nestedOfferId) {
    return """
        {
          "name":"%s",
          "kind":"BUNDLE",
          "priority":%d,
          "benefitType":"FLAT",
          "benefitValue":100,
          "products":[{"productId":"%s","slot":"BUNDLE"}]
        }
        """
        .formatted(name, priority, nestedOfferId);
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

  private record Stocked(UUID productId, UUID batchId) {}
}
