package com.nammamedmate.server.feature.sales;

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
import com.nammamedmate.server.domain.SalesInvoice;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.ApprovalRequestRepository;
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

class SalesInvoicePricingRollbackTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-04T06:00:00Z");

  @Autowired private MockMvc mockMvc;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private SalesInvoiceRepository salesInvoiceRepository;
  @Autowired private SalesInvoiceLineRepository salesInvoiceLineRepository;
  @Autowired private ApprovalRequestRepository approvalRequestRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @Test
  void failedPricingAndTaxLeaveDraftUnchanged() throws Exception {
    Tenant tenant = persistTenant("roll-price", "Roll Price");
    persistPlan(tenant.getId());
    persistUser(tenant.getId(), "owner@roll-price.local", AppUserRole.pharmacy_owner);
    Location branch = persistBranch(tenant.getId());
    Cookie cookie = login("owner@roll-price.local");
    mockMvc
        .perform(
            post("/api/v1/session/branch")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchId\":\"" + branch.getId() + "\"}"))
        .andExpect(status().isOk());

    UUID categoryId =
        UUID.fromString(
            objectMapperId(
                mockMvc
                    .perform(
                        post("/api/v1/product-categories")
                            .cookie(cookie)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"name\":\"roll cat\"}"))
                    .andExpect(status().isOk())
                    .andReturn()));
    UUID productId =
        UUID.fromString(
            objectMapperId(
                mockMvc
                    .perform(
                        post("/api/v1/products")
                            .cookie(cookie)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(productJson(categoryId)))
                    .andExpect(status().isOk())
                    .andReturn()));
    mockMvc
        .perform(
            post("/api/v1/inventory/receipts")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"productId\":\"%s\",\"batchNumber\":\"LOT-R\",\"manufacturedOn\":\"2026-01-15\",\"expiresOn\":\"2027-06-30\",\"purchasePricePaise\":12500,\"quantity\":\"10\",\"idempotencyKey\":\"roll-recv\",\"expectedVersion\":0}"
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
    UUID invoiceId =
        UUID.fromString(
            objectMapperId(
                mockMvc
                    .perform(
                        post("/api/v1/sales/invoices")
                            .cookie(cookie)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(
                                """
                                {"customerId":null,"doctorId":null,"prescriptionReference":null,"prescriptionVerified":false,"idempotencyKey":"roll-inv","lines":[{"productId":"%s","batchId":"%s","quantity":1,"unit":"Tablet","mrpPaise":12000,"sellingPricePaise":10000,"discountPaise":0}]}
                                """
                                    .formatted(productId, batchId)))
                    .andExpect(status().isOk())
                    .andReturn()));

    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/pricing")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"expectedVersion\":1,\"billDiscountType\":\"FLAT\",\"billDiscountValue\":0,\"lines\":[{\"productId\":\"%s\",\"type\":\"FLAT\",\"value\":999999}]}"
                        .formatted(productId)))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("EXCESSIVE_DISCOUNT"));

    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/tax-adjustment")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"expectedVersion\":1,\"reason\":\"\",\"lines\":[{\"productId\":\"%s\",\"gstRate\":5}]}"
                        .formatted(productId)))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("REASON_REQUIRED"));

    SalesInvoice invoice = salesInvoiceRepository.findById(invoiceId).orElseThrow();
    assertThat(invoice.getDiscountPaise()).isZero();
    assertThat(invoice.getTaxPaise()).isEqualTo(1200);
    assertThat(invoice.isTaxAdjusted()).isFalse();
    assertThat(invoice.getVersion()).isEqualTo(1);
    assertThat(approvalRequestRepository.count()).isZero();
    assertThat(
            salesInvoiceLineRepository
                .findAllBySalesInvoiceIdAndTenantIdAndBranchIdOrderBySortOrderAsc(
                    invoiceId, tenant.getId(), branch.getId())
                .get(0)
                .getGstRate()
                .intValue())
        .isEqualTo(12);
  }

  @Autowired private com.fasterxml.jackson.databind.ObjectMapper objectMapper;

  private String objectMapperId(MvcResult result) throws Exception {
    return objectMapper
        .readTree(result.getResponse().getContentAsString())
        .path("data")
        .path("id")
        .asText();
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
        {"sku":"ROLL-P","barcode":null,"name":"Roll Pack","genericName":null,"brandName":null,"manufacturerId":null,"categoryId":"%s","productType":"Medicine","dosageForm":"Tablet","therapeuticClass":null,"composition":null,"strength":null,"route":null,"prescriptionRequired":false,"scheduleClassification":null,"hsnCode":"30049099","gstRate":12,"baseUnit":"Tablet","packSize":10,"packUnit":"strip","packDescription":null,"storageConditions":null,"requiresColdStorage":false,"rackLocation":null,"reorderLevel":null,"reorderQuantity":null,"minimumStock":null,"isDiscontinued":false,"isReturnable":true,"isTaxable":true,"taxCategory":"GST-12","requiresBatchTracking":true,"requiresExpiryTracking":true,"requiresSerialTracking":false,"controlledSubstance":false,"notes":null,"isActive":true}
        """
        .formatted(categoryId);
  }
}
