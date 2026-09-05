package com.nammamedmate.server.feature.purchasereturn;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.nammamedmate.server.AbstractIntegrationTest;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.BranchType;
import com.nammamedmate.server.domain.GoodsReceiptLine;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.GoodsReceiptLineRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.PurchaseReturnLineRepository;
import com.nammamedmate.server.persistence.PurchaseReturnRepository;
import com.nammamedmate.server.persistence.StockBalanceRepository;
import com.nammamedmate.server.persistence.StockMovementRepository;
import com.nammamedmate.server.persistence.SupplierLedgerEntryRepository;
import com.nammamedmate.server.persistence.SupplierPayableAccountRepository;
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

class PurchaseReturnRollbackTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-04T02:00:00Z");

  @Autowired private MockMvc mockMvc;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private GoodsReceiptLineRepository goodsReceiptLineRepository;
  @Autowired private PurchaseReturnRepository purchaseReturnRepository;
  @Autowired private PurchaseReturnLineRepository purchaseReturnLineRepository;
  @Autowired private SupplierPayableAccountRepository payableAccountRepository;
  @Autowired private SupplierLedgerEntryRepository ledgerEntryRepository;
  @Autowired private StockBalanceRepository stockBalanceRepository;
  @Autowired private StockMovementRepository stockMovementRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @Test
  void overReturnLeavesStockAndPayableUnchanged() throws Exception {
    Tenant tenant = persistTenant("pr-roll", "PR Roll");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@pr-roll.local", AppUserRole.pharmacy_owner);
    Location branch = persistBranch(tenant.getId());
    Cookie cookie = login("owner@pr-roll.local");
    mockMvc
        .perform(
            post("/api/v1/session/branch")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchId\":\"" + branch.getId() + "\"}"))
        .andExpect(status().isOk());

    UUID categoryId =
        idOf(postJson(cookie, "/api/v1/product-categories", "{\"name\":\"Roll cat\"}"));
    UUID productId =
        idOf(
            postJson(
                cookie, "/api/v1/products", productJson("SKU-PR-ROLL", "Roll pack", categoryId)));
    UUID supplierId = idOf(postJson(cookie, "/api/v1/suppliers", supplierJson()));
    UUID poId =
        idOf(postJson(cookie, "/api/v1/purchase-orders", createPoJson(supplierId, productId)));
    postJson(cookie, "/api/v1/purchase-orders/" + poId + "/issue", "{\"expectedVersion\":1}");
    UUID poLineId =
        UUID.fromString(
            objectMapper()
                .readTree(
                    mockMvc
                        .perform(
                            org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get(
                                    "/api/v1/purchase-orders/" + poId)
                                .cookie(cookie))
                        .andExpect(status().isOk())
                        .andReturn()
                        .getResponse()
                        .getContentAsString())
                .path("data")
                .path("lines")
                .get(0)
                .path("id")
                .asText());
    UUID receiptId =
        idOf(
            postJson(
                cookie, "/api/v1/purchase-orders/" + poId + "/receipts", receiptJson(poLineId)));
    GoodsReceiptLine line =
        goodsReceiptLineRepository
            .findAllByGoodsReceiptIdAndTenantIdAndBranchIdOrderBySortOrderAsc(
                receiptId, tenant.getId(), branch.getId())
            .get(0);
    postJson(
        cookie,
        "/api/v1/goods-receipts/" + receiptId + "/quality-check",
        qcJson(line.getId(), "10", "0"));

    long payableBefore =
        payableAccountRepository
            .findByTenantIdAndBranchIdAndSupplierId(tenant.getId(), branch.getId(), supplierId)
            .orElseThrow()
            .getBalancePaise();
    long ledgerBefore = ledgerEntryRepository.count();
    long returnsBefore = purchaseReturnRepository.count();
    long returnLinesBefore = purchaseReturnLineRepository.count();
    var stockBefore =
        stockBalanceRepository
            .findAllByTenantIdAndBranchIdAndProductId(tenant.getId(), branch.getId(), productId)
            .get(0)
            .getQuantity();
    long movementsBefore = stockMovementRepository.count();

    mockMvc
        .perform(
            post("/api/v1/purchase-returns")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(returnJson(receiptId, line.getId(), "11")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("OVER_RETURN"));

    assertThat(
            payableAccountRepository
                .findByTenantIdAndBranchIdAndSupplierId(tenant.getId(), branch.getId(), supplierId)
                .orElseThrow()
                .getBalancePaise())
        .isEqualTo(payableBefore);
    assertThat(ledgerEntryRepository.count()).isEqualTo(ledgerBefore);
    assertThat(purchaseReturnRepository.count()).isEqualTo(returnsBefore);
    assertThat(purchaseReturnLineRepository.count()).isEqualTo(returnLinesBefore);
    assertThat(
            stockBalanceRepository
                .findAllByTenantIdAndBranchIdAndProductId(tenant.getId(), branch.getId(), productId)
                .get(0)
                .getQuantity())
        .isEqualByComparingTo(stockBefore);
    assertThat(stockMovementRepository.count()).isEqualTo(movementsBefore);
  }

  private com.fasterxml.jackson.databind.ObjectMapper objectMapper() {
    return new com.fasterxml.jackson.databind.ObjectMapper();
  }

  private MvcResult postJson(Cookie cookie, String path, String json) throws Exception {
    return mockMvc
        .perform(post(path).cookie(cookie).contentType(MediaType.APPLICATION_JSON).content(json))
        .andExpect(status().isOk())
        .andReturn();
  }

  private UUID idOf(MvcResult result) throws Exception {
    return UUID.fromString(
        objectMapper()
            .readTree(result.getResponse().getContentAsString())
            .path("data")
            .path("id")
            .asText());
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
    branch.setPricingSettings(Map.of("defaultMarkupBps", 0));
    branch.setTaxSettings(Map.of("gstMode", "CGST_SGST"));
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

  private static String qcJson(UUID lineId, String accepted, String rejected) {
    return """
        {
          "idempotencyKey":"roll-pr-qc",
          "visualInspectionPassed":true,
          "checklist":{
            "packagingIntact":true,
            "labelMatches":true,
            "batchReadable":true,
            "noDamage":true
          },
          "lines":[{
            "goodsReceiptLineId":"%s",
            "acceptedQuantity":%s,
            "rejectedQuantity":%s,
            "batchNumber":"LOT-ROLL",
            "manufacturedOn":"2026-01-15",
            "expiresOn":"2027-12-31"
          }]
        }
        """
        .formatted(lineId, accepted, rejected);
  }

  private static String returnJson(UUID receiptId, UUID lineId, String qty) {
    return """
        {
          "goodsReceiptId":"%s",
          "idempotencyKey":"roll-pr-ret",
          "lines":[{"goodsReceiptLineId":"%s","quantity":%s}]
        }
        """
        .formatted(receiptId, lineId, qty);
  }

  private static String receiptJson(UUID lineId) {
    return """
        {
          "receiptReference":"CH-PR-ROLL",
          "idempotencyKey":"grn-pr-roll",
          "lines":[{"purchaseOrderLineId":"%s","quantity":10,"unitRatePaise":10000}]
        }
        """
        .formatted(lineId);
  }

  private static String createPoJson(UUID supplierId, UUID productId) {
    return """
        {
          "supplierId":"%s",
          "expectedDeliveryDate":"2026-09-20",
          "paymentTerms":"CREDIT",
          "notes":"Weekly indent",
          "idempotencyKey":"po-pr-roll",
          "lines":[{"productId":"%s","quantity":10,"unitRatePaise":10000}]
        }
        """
        .formatted(supplierId, productId);
  }

  private static String supplierJson() {
    return """
        {
          "supplierCode":"SUP-PR-ROLL",
          "legalName":"Acme Pharma Pvt Ltd",
          "tradeName":null,
          "supplierType":"DISTRIBUTOR",
          "gstin":null,
          "pan":null,
          "drugLicenseNumber":null,
          "drugLicenseType":null,
          "drugLicenseExpiry":null,
          "fssaiLicenseNumber":null,
          "contactPersonName":"Ramesh Rao",
          "contactPersonRole":null,
          "phone":"9876500001",
          "alternatePhone":null,
          "email":null,
          "website":null,
          "addressLine1":"12 MG Road",
          "addressLine2":null,
          "city":"Bengaluru",
          "state":"KA",
          "pincode":"560001",
          "country":"India",
          "paymentTerms":"COD",
          "creditPeriodDays":null,
          "creditLimitPaise":null,
          "bankName":null,
          "accountHolderName":null,
          "accountNumber":null,
          "confirmAccountNumber":null,
          "ifscCode":null,
          "upiId":null,
          "categoryIds":[],
          "status":"ACTIVE",
          "notes":null
        }
        """;
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
          "taxCategory":null,
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
}
