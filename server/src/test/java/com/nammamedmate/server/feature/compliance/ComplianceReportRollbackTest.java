package com.nammamedmate.server.feature.compliance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
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

class ComplianceReportRollbackTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-05T12:30:00Z");
  private static final long UNIT_TOTAL = 11200L;

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private SalesInvoiceRepository salesInvoiceRepository;
  @Autowired private StockBalanceRepository stockBalanceRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @Test
  void listAndExportDoNotMutateSourceFacts() throws Exception {
    Cookie cookie = loginOwner("rep-roll");
    UUID branchId = locationRepository.findAll().get(0).getId();
    selectBranch(cookie, branchId);
    Stocked product = stocked(cookie, "H1-ROLL", "Tramadol");
    UUID customerId = createCustomer(cookie, "Roll Patient", "9431999101");
    UUID doctorId = createDoctor(cookie, "Dr Roll", "KA-2199");
    sell(cookie, product, customerId, doctorId, "RX-ROLL", "rep-roll");

    long invoices = salesInvoiceRepository.count();
    BigDecimal qty = stockBalanceRepository.findAll().get(0).getQuantity();

    mockMvc
        .perform(get("/api/v1/compliance/reports/H1_SALES").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items[0].productName").value("Tramadol"));
    mockMvc
        .perform(
            get("/api/v1/compliance/reports/H1_SALES/export").cookie(cookie).param("format", "csv"))
        .andExpect(status().isOk());

    assertThat(salesInvoiceRepository.count()).isEqualTo(invoices);
    assertThat(stockBalanceRepository.findAll().get(0).getQuantity()).isEqualByComparingTo(qty);
  }

  private void sell(
      Cookie cookie, Stocked product, UUID customerId, UUID doctorId, String rx, String key)
      throws Exception {
    UUID invoiceId =
        UUID.fromString(
            objectMapper
                .readTree(
                    mockMvc
                        .perform(
                            post("/api/v1/sales/invoices")
                                .cookie(cookie)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(draftJson(customerId, doctorId, rx, product, key)))
                        .andExpect(status().isOk())
                        .andReturn()
                        .getResponse()
                        .getContentAsString())
                .path("data")
                .path("id")
                .asText());
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/complete")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "expectedVersion":1,
                      "expectedTotalPaise":%d,
                      "changePaise":0,
                      "idempotencyKey":"%s-pay",
                      "payments":[{"mode":"CASH","amountPaise":%d}]
                    }
                    """
                        .formatted(UNIT_TOTAL, key, UNIT_TOTAL)))
        .andExpect(status().isOk());
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
                    "{\"productId\":\"%s\",\"batchNumber\":\"LOT-RX\",\"manufacturedOn\":\"2026-01-15\",\"expiresOn\":\"2027-06-30\",\"purchasePricePaise\":12500,\"quantity\":\"200\",\"idempotencyKey\":\"%s-recv\",\"expectedVersion\":0}"
                        .formatted(productId, sku)))
        .andExpect(status().isOk());
    String body =
        mockMvc
            .perform(get("/api/v1/inventory/products/" + productId + "/batches").cookie(cookie))
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

  private UUID createDoctor(Cookie cookie, String name, String registration) throws Exception {
    return UUID.fromString(
        objectMapper
            .readTree(
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
                    .getContentAsString())
            .path("data")
            .path("id")
            .asText());
  }

  private Cookie loginOwner(String tag) throws Exception {
    Tenant tenant = new Tenant();
    tenant.setId(UUID.randomUUID());
    tenant.setSlug(tag);
    tenant.setName("Roll " + tag);
    tenant.setStatus(TenantStatus.ACTIVE);
    tenant.setEmailVerifiedAt(T0);
    tenant.setCreatedAt(T0);
    tenant.setUpdatedAt(T0);
    tenantRepository.save(tenant);
    TenantSubscription sub = new TenantSubscription();
    sub.setId(UUID.randomUUID());
    sub.setTenantId(tenant.getId());
    sub.setPlanCode(PlanCode.FREE);
    sub.setStatus(SubscriptionStatus.ACTIVE);
    sub.setStartedAt(T0);
    sub.setCreatedAt(T0);
    sub.setUpdatedAt(T0);
    tenantSubscriptionRepository.save(sub);
    AppUser owner = new AppUser();
    owner.setId(UUID.randomUUID());
    owner.setTenantId(tenant.getId());
    owner.setEmail("owner@" + tag + ".local");
    owner.setPasswordHash(passwordEncoder.encode(PASSWORD));
    owner.setDisplayName("Roll Owner");
    owner.setRole(AppUserRole.pharmacy_owner);
    owner.setStatus(UserAccountStatus.ACTIVE);
    owner.setActive(true);
    owner.setMustChangePassword(false);
    owner.setCreatedAt(T0);
    owner.setUpdatedAt(T0);
    owner.setPasswordChangedAt(T0);
    appUserRepository.save(owner);
    Location branch = new Location();
    branch.setId(UUID.randomUUID());
    branch.setTenantId(tenant.getId());
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
    locationRepository.saveAndFlush(branch);
    MvcResult result =
        mockMvc
            .perform(
                post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        "{\"email\":\"owner@"
                            + tag
                            + ".local\",\"password\":\""
                            + PASSWORD
                            + "\"}"))
            .andExpect(status().isOk())
            .andReturn();
    Cookie access = result.getResponse().getCookie("nmm_access");
    assertThat(access).isNotNull();
    return access;
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

  private static String draftJson(
      UUID customerId, UUID doctorId, String rx, Stocked product, String key) {
    return """
        {
          "customerId":"%s",
          "doctorId":"%s",
          "prescriptionReference":"%s",
          "prescriptionVerified":true,
          "idempotencyKey":"%s",
          "lines":[{
            "productId":"%s",
            "batchId":"%s",
            "quantity":1,
            "unit":"Tablet",
            "mrpPaise":12000,
            "sellingPricePaise":10000,
            "discountPaise":0,
            "prescribedQuantity":30
          }]
        }
        """
        .formatted(customerId, doctorId, rx, key, product.productId(), product.batchId());
  }

  private static String productJson(String sku, String name, UUID categoryId) {
    return """
        {
          "sku":"%s","barcode":null,"name":"%s","genericName":null,"brandName":null,
          "manufacturerId":null,"categoryId":"%s","productType":"Medicine","dosageForm":"Tablet",
          "therapeuticClass":null,"composition":null,"strength":null,"route":null,
          "prescriptionRequired":true,"scheduleClassification":"H1","hsnCode":"30049099","gstRate":12,
          "baseUnit":"Tablet","packSize":10,"packUnit":"strip","packDescription":null,
          "storageConditions":null,"requiresColdStorage":false,"rackLocation":null,
          "reorderLevel":null,"reorderQuantity":null,"minimumStock":null,"isDiscontinued":false,
          "isReturnable":true,"isTaxable":true,"taxCategory":"GST-12","requiresBatchTracking":true,
          "requiresExpiryTracking":true,"requiresSerialTracking":false,"controlledSubstance":true,
          "notes":null,"isActive":true
        }
        """
        .formatted(sku, name, categoryId);
  }

  private record Stocked(UUID productId, UUID batchId) {}
}
