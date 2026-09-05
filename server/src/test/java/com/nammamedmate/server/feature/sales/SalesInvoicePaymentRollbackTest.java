package com.nammamedmate.server.feature.sales;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
import com.nammamedmate.server.domain.SalesInvoice;
import com.nammamedmate.server.domain.SalesInvoiceStatus;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.CustomerCreditAccountRepository;
import com.nammamedmate.server.persistence.CustomerCreditLedgerEntryRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.SalesInvoicePaymentRepository;
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

class SalesInvoicePaymentRollbackTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-05T06:30:00Z");

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private SalesInvoiceRepository salesInvoiceRepository;
  @Autowired private SalesInvoicePaymentRepository salesInvoicePaymentRepository;
  @Autowired private CustomerCreditAccountRepository accountRepository;
  @Autowired private CustomerCreditLedgerEntryRepository ledgerRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @Test
  void failedKhataCompleteLeavesDraftAndNoLedger() throws Exception {
    Tenant tenant = persistTenant("pay-roll", "Pay Roll");
    persistPlan(tenant.getId());
    persistUser(tenant.getId(), "owner@pay-roll.local", AppUserRole.pharmacy_owner);
    Location branch = persistBranch(tenant.getId());
    Cookie cookie = login("owner@pay-roll.local");
    mockMvc
        .perform(
            post("/api/v1/session/branch")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchId\":\"" + branch.getId() + "\"}"))
        .andExpect(status().isOk());

    UUID categoryId =
        UUID.fromString(
            objectMapper
                .readTree(
                    mockMvc
                        .perform(
                            post("/api/v1/product-categories")
                                .cookie(cookie)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"name\":\"roll pay cat\"}"))
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
                                .content(productJson(categoryId)))
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
                    "{\"productId\":\"%s\",\"batchNumber\":\"LOT-R\",\"manufacturedOn\":\"2026-01-15\",\"expiresOn\":\"2027-06-30\",\"purchasePricePaise\":12500,\"quantity\":\"10\",\"idempotencyKey\":\"roll-pay-recv\",\"expectedVersion\":0}"
                        .formatted(productId)))
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
    UUID customerId =
        UUID.fromString(
            objectMapper
                .readTree(
                    mockMvc
                        .perform(
                            post("/api/v1/customers")
                                .cookie(cookie)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"name\":\"Roll Khata\",\"phone\":\"9411000001\"}"))
                        .andExpect(status().isOk())
                        .andReturn()
                        .getResponse()
                        .getContentAsString())
                .path("data")
                .path("id")
                .asText());
    mockMvc
        .perform(
            put("/api/v1/customers/" + customerId + "/credit/limit")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"limitPaise\":5000,\"expectedVersion\":0}"))
        .andExpect(status().isOk());
    UUID invoiceId =
        UUID.fromString(
            objectMapper
                .readTree(
                    mockMvc
                        .perform(
                            post("/api/v1/sales/invoices")
                                .cookie(cookie)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                    """
                                    {"customerId":"%s","doctorId":null,"prescriptionReference":null,"prescriptionVerified":false,"idempotencyKey":"roll-pay-inv","lines":[{"productId":"%s","batchId":"%s","quantity":1,"unit":"Tablet","mrpPaise":12000,"sellingPricePaise":10000,"discountPaise":0}]}
                                    """
                                        .formatted(customerId, productId, batchId)))
                        .andExpect(status().isOk())
                        .andReturn()
                        .getResponse()
                        .getContentAsString())
                .path("data")
                .path("id")
                .asText());

    long ledgerBefore = ledgerRepository.count();
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/complete")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"expectedVersion":1,"expectedTotalPaise":11200,"changePaise":0,"idempotencyKey":"roll-complete","payments":[{"mode":"CREDIT","amountPaise":11200}]}
                    """))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("CREDIT_LIMIT_EXCEEDED"));

    SalesInvoice invoice = salesInvoiceRepository.findById(invoiceId).orElseThrow();
    assertThat(invoice.getStatus()).isEqualTo(SalesInvoiceStatus.DRAFT);
    assertThat(invoice.getAmountPaidPaise()).isZero();
    assertThat(invoice.getAmountDuePaise()).isZero();
    assertThat(
            salesInvoicePaymentRepository
                .findAllBySalesInvoiceIdAndTenantIdAndBranchIdOrderBySortOrderAsc(
                    invoiceId, tenant.getId(), branch.getId()))
        .isEmpty();
    assertThat(ledgerRepository.count()).isEqualTo(ledgerBefore);
    assertThat(accountRepository.findByTenantIdAndCustomerId(tenant.getId(), customerId))
        .get()
        .extracting(account -> account.getBalancePaise())
        .isEqualTo(0L);
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
    return result.getResponse().getCookie("nmm_access");
  }

  private static String productJson(UUID categoryId) {
    return """
        {"sku":"ROLL-PAY","barcode":null,"name":"Roll Pay Pack","genericName":null,"brandName":null,"manufacturerId":null,"categoryId":"%s","productType":"Medicine","dosageForm":"Tablet","therapeuticClass":null,"composition":null,"strength":null,"route":null,"prescriptionRequired":false,"scheduleClassification":null,"hsnCode":"30049099","gstRate":12,"baseUnit":"Tablet","packSize":10,"packUnit":"strip","packDescription":null,"storageConditions":null,"requiresColdStorage":false,"rackLocation":null,"reorderLevel":null,"reorderQuantity":null,"minimumStock":null,"isDiscontinued":false,"isReturnable":true,"isTaxable":true,"taxCategory":"GST-12","requiresBatchTracking":true,"requiresExpiryTracking":true,"requiresSerialTracking":false,"controlledSubstance":false,"notes":null,"isActive":true}
        """
        .formatted(categoryId);
  }
}
