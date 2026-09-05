package com.nammamedmate.server.feature.compliance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.AbstractIntegrationTest;
import com.nammamedmate.server.application.compliance.ControlledSaleRecorder;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.BranchType;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.SalesInvoice;
import com.nammamedmate.server.domain.SalesInvoiceStatus;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.ControlledSaleRegisterRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.SalesInvoiceRepository;
import com.nammamedmate.server.persistence.SalesReturnRepository;
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
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

class ControlledSaleRegisterRollbackTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-05T12:30:00Z");
  private static final long UNIT_TOTAL = 11200L;

  @SpyBean private ControlledSaleRecorder controlledSaleRecorder;

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private SalesInvoiceRepository salesInvoiceRepository;
  @Autowired private SalesReturnRepository salesReturnRepository;
  @Autowired private ControlledSaleRegisterRepository controlledSaleRegisterRepository;
  @Autowired private StockBalanceRepository stockBalanceRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @Test
  void recorderFailureLeavesInvoiceAndRegisterUncommitted() throws Exception {
    doThrow(new IllegalStateException("register exploded"))
        .when(controlledSaleRecorder)
        .recordCompletedInvoice(any(), anyList());
    Cookie cookie = loginOwner("csr-roll");
    UUID branchId = locationRepository.findAll().get(0).getId();
    selectBranch(cookie, branchId);
    Stocked product = stocked(cookie, "H1-ROLL", "Tramadol");
    UUID customerId = createCustomer(cookie, "Roll Patient", "9431999001");
    UUID doctorId = createDoctor(cookie, "Dr Roll", "KA-2099");
    UUID invoiceId =
        idOf(
            mockMvc
                .perform(
                    post("/api/v1/sales/invoices")
                        .cookie(cookie)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(draftJson(customerId, doctorId, product, "roll-draft")))
                .andExpect(status().isOk())
                .andReturn());
    BigDecimal stockBefore = stockBalanceRepository.findAll().get(0).getQuantity();

    try {
      mockMvc.perform(
          post("/api/v1/sales/invoices/" + invoiceId + "/complete")
              .cookie(cookie)
              .contentType(MediaType.APPLICATION_JSON)
              .content(completeJson("roll-pay")));
      org.junit.jupiter.api.Assertions.fail("complete should fail when the sale book cannot write");
    } catch (Exception ex) {
      assertThat(ex).hasRootCauseInstanceOf(IllegalStateException.class);
      assertThat(ex).hasRootCauseMessage("register exploded");
    }

    SalesInvoice invoice = salesInvoiceRepository.findById(invoiceId).orElseThrow();
    assertThat(invoice.getStatus()).isEqualTo(SalesInvoiceStatus.DRAFT);
    assertThat(controlledSaleRegisterRepository.count()).isZero();
    assertThat(stockBalanceRepository.findAll().get(0).getQuantity())
        .isEqualByComparingTo(stockBefore);
    assertThat(salesReturnRepository.count()).isZero();
  }

  private Cookie loginOwner(String tag) throws Exception {
    Tenant tenant = persistTenant(tag, "Roll " + tag);
    persistPlan(tenant.getId());
    persistUser(tenant.getId(), "owner@" + tag + ".local", AppUserRole.pharmacy_owner, "Anika Owner");
    persistBranch(tenant.getId());
    return login("owner@" + tag + ".local");
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
                    "{\"productId\":\"%s\",\"batchNumber\":\"LOT-RX\",\"manufacturedOn\":\"2026-01-15\",\"expiresOn\":\"2027-06-30\",\"purchasePricePaise\":12500,\"quantity\":\"20\",\"idempotencyKey\":\"%s-recv\",\"expectedVersion\":0}"
                        .formatted(productId, sku)))
        .andExpect(status().isOk());
    UUID batchId =
        UUID.fromString(
            objectMapper
                .readTree(
                    mockMvc
                        .perform(
                            get("/api/v1/inventory/products/" + productId + "/batches")
                                .cookie(cookie))
                        .andExpect(status().isOk())
                        .andReturn()
                        .getResponse()
                        .getContentAsString())
                .path("data")
                .path("items")
                .get(0)
                .path("batchId")
                .asText());
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

  private UUID idOf(MvcResult result) throws Exception {
    return UUID.fromString(
        objectMapper
            .readTree(result.getResponse().getContentAsString())
            .path("data")
            .path("id")
            .asText());
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
    return result.getResponse().getCookie("nmm_access");
  }

  private static String draftJson(UUID customerId, UUID doctorId, Stocked product, String key) {
    return """
        {
          "customerId":"%s",
          "doctorId":"%s",
          "prescriptionReference":"RX-ROLL",
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
        .formatted(customerId, doctorId, key, product.productId(), product.batchId());
  }

  private static String completeJson(String key) {
    return """
        {
          "expectedVersion":1,
          "expectedTotalPaise":%d,
          "changePaise":0,
          "idempotencyKey":"%s",
          "payments":[{"mode":"CASH","amountPaise":%d}]
        }
        """
        .formatted(UNIT_TOTAL, key, UNIT_TOTAL);
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
