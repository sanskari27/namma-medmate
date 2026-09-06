package com.nammamedmate.server.feature.dashboard;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.nammamedmate.server.AbstractIntegrationTest;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.BranchType;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.ExpenseRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.SalesInvoiceRepository;
import com.nammamedmate.server.persistence.StockBalanceRepository;
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

class RoleDashboardRollbackTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-06T02:00:00Z");
  private static final long TOTAL = 11_200L;
  private static final long COST = 5_000L;

  @Autowired private MockMvc mockMvc;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private SalesInvoiceRepository salesInvoiceRepository;
  @Autowired private StockBalanceRepository stockBalanceRepository;
  @Autowired private ExpenseRepository expenseRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @Test
  void ac06_dashboardReadsDoNotMutateSourceFacts() throws Exception {
    Fixture fx = seed("dash-roll");
    UUID productId = createProduct(fx);
    receive(fx, productId, "ROLL");
    UUID invoiceId = createDraft(fx, productId);
    completeCash(fx, invoiceId, 1, "dash-roll-c");

    long invoices = salesInvoiceRepository.count();
    BigDecimal qty = stockBalanceRepository.findAll().get(0).getQuantity();
    long expenses = expenseRepository.count();

    mockMvc
        .perform(get("/api/v1/dashboards/owner").param("scope", "tenant").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.owner.todaySalesPaise").value((int) TOTAL));
    mockMvc
        .perform(get("/api/v1/dashboards/cashier").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.cashier.todayBillCount").value(1));
    mockMvc
        .perform(get("/api/v1/dashboards/owner").param("scope", "tenant").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.owner.todaySalesPaise").value((int) TOTAL));

    assertThat(salesInvoiceRepository.count()).isEqualTo(invoices);
    assertThat(stockBalanceRepository.findAll().get(0).getQuantity()).isEqualByComparingTo(qty);
    assertThat(expenseRepository.count()).isEqualTo(expenses);
  }

  private UUID createProduct(Fixture fx) throws Exception {
    String cat =
        mockMvc
            .perform(
                post("/api/v1/product-categories")
                    .cookie(fx.cookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":\"roll cat\"}"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    UUID categoryId =
        UUID.fromString(
            new com.fasterxml.jackson.databind.ObjectMapper()
                .readTree(cat)
                .path("data")
                .path("id")
                .asText());
    String body =
        mockMvc
            .perform(
                post("/api/v1/products")
                    .cookie(fx.cookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(productJson(categoryId)))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return UUID.fromString(
        new com.fasterxml.jackson.databind.ObjectMapper()
            .readTree(body)
            .path("data")
            .path("id")
            .asText());
  }

  private void receive(Fixture fx, UUID productId, String sku) throws Exception {
    mockMvc
        .perform(
            post("/api/v1/inventory/receipts")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"productId\":\"%s\",\"batchNumber\":\"LOT-%s\",\"manufacturedOn\":\"2026-01-15\",\"expiresOn\":\"2027-06-30\",\"purchasePricePaise\":%d,\"quantity\":\"10\",\"idempotencyKey\":\"%s-recv\",\"expectedVersion\":0}"
                        .formatted(productId, sku, COST, sku)))
        .andExpect(status().isOk());
  }

  private UUID createDraft(Fixture fx, UUID productId) throws Exception {
    String batches =
        mockMvc
            .perform(
                get("/api/v1/inventory/products/" + productId + "/batches").cookie(fx.cookie()))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    UUID batchId =
        UUID.fromString(
            new com.fasterxml.jackson.databind.ObjectMapper()
                .readTree(batches)
                .path("data")
                .path("items")
                .get(0)
                .path("batchId")
                .asText());
    String body =
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
                          "idempotencyKey":"dash-roll-d",
                          "lines":[{
                            "productId":"%s",
                            "batchId":"%s",
                            "quantity":1,
                            "unit":"Tablet",
                            "mrpPaise":12000,
                            "sellingPricePaise":10000,
                            "discountPaise":0,
                            "prescribedQuantity":null
                          }]
                        }
                        """
                            .formatted(productId, batchId)))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return UUID.fromString(
        new com.fasterxml.jackson.databind.ObjectMapper()
            .readTree(body)
            .path("data")
            .path("id")
            .asText());
  }

  private void completeCash(Fixture fx, UUID invoiceId, int version, String key) throws Exception {
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "expectedVersion":%d,
                      "expectedTotalPaise":%d,
                      "changePaise":0,
                      "idempotencyKey":"%s",
                      "payments":[{"mode":"CASH","amountPaise":11200}]
                    }
                    """
                        .formatted(version, TOTAL, key)))
        .andExpect(status().isOk());
  }

  private Fixture seed(String tag) throws Exception {
    Tenant tenant = persistTenant(tag, "Dash " + tag);
    persistPlan(tenant.getId());
    persistUser(tenant.getId(), "owner@" + tag + ".local");
    Location branch = persistBranch(tenant.getId());
    Cookie cookie = login("owner@" + tag + ".local");
    mockMvc
        .perform(
            post("/api/v1/session/branch")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchId\":\"" + branch.getId() + "\"}"))
        .andExpect(status().isOk());
    return new Fixture(cookie);
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
    Map<String, Object> pricing = new LinkedHashMap<>();
    pricing.put("defaultMarkupBps", 0);
    pricing.put("roundToNearestPaise", 1);
    branch.setPricingSettings(pricing);
    Map<String, Object> tax = new LinkedHashMap<>();
    tax.put("gstMode", "CGST_SGST");
    tax.put("taxState", "KA");
    branch.setTaxSettings(tax);
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

  private static String productJson(UUID categoryId) {
    return """
        {
          "sku":"DASH-ROLL",
          "barcode":null,
          "name":"Roll Pack",
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
        .formatted(categoryId);
  }

  private record Fixture(Cookie cookie) {}
}
