package com.nammamedmate.server.feature.dashboard;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.AbstractIntegrationTest;
import com.nammamedmate.server.domain.AccessScope;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.ApprovalActionKey;
import com.nammamedmate.server.domain.ApprovalRequest;
import com.nammamedmate.server.domain.ApprovalRequestStatus;
import com.nammamedmate.server.domain.ApprovalRule;
import com.nammamedmate.server.domain.ApproverType;
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.BranchType;
import com.nammamedmate.server.domain.ComplianceDocType;
import com.nammamedmate.server.domain.ComplianceLicense;
import com.nammamedmate.server.domain.ComplianceLicenseScope;
import com.nammamedmate.server.domain.Customer;
import com.nammamedmate.server.domain.CustomerCreditAccount;
import com.nammamedmate.server.domain.CustomerCreditLedgerEntry;
import com.nammamedmate.server.domain.CustomerCreditLedgerType;
import com.nammamedmate.server.domain.DashboardPolicy;
import com.nammamedmate.server.domain.DiscountApprovalStatus;
import com.nammamedmate.server.domain.DiscountType;
import com.nammamedmate.server.domain.EinvoiceApplicability;
import com.nammamedmate.server.domain.EinvoiceStatus;
import com.nammamedmate.server.domain.KycSubmission;
import com.nammamedmate.server.domain.KycSubmissionStatus;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.PurchaseOrder;
import com.nammamedmate.server.domain.PurchaseOrderStatus;
import com.nammamedmate.server.domain.SalesInvoice;
import com.nammamedmate.server.domain.SalesInvoiceStatus;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Supplier;
import com.nammamedmate.server.domain.SupplierLedgerEntry;
import com.nammamedmate.server.domain.SupplierLedgerType;
import com.nammamedmate.server.domain.SupplierPayableAccount;
import com.nammamedmate.server.domain.SupplierPaymentTerms;
import com.nammamedmate.server.domain.SupplierStatus;
import com.nammamedmate.server.domain.SupplierType;
import com.nammamedmate.server.domain.TaxJurisdiction;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.ApprovalRequestRepository;
import com.nammamedmate.server.persistence.ApprovalRuleRepository;
import com.nammamedmate.server.persistence.ComplianceLicenseRepository;
import com.nammamedmate.server.persistence.CustomerCreditAccountRepository;
import com.nammamedmate.server.persistence.CustomerCreditLedgerEntryRepository;
import com.nammamedmate.server.persistence.CustomerRepository;
import com.nammamedmate.server.persistence.KycSubmissionRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.PurchaseOrderRepository;
import com.nammamedmate.server.persistence.SalesInvoiceRepository;
import com.nammamedmate.server.persistence.StockBatchRepository;
import com.nammamedmate.server.persistence.SupplierLedgerEntryRepository;
import com.nammamedmate.server.persistence.SupplierPayableAccountRepository;
import com.nammamedmate.server.persistence.SupplierRepository;
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

class OwnerOverviewTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-06T02:00:00Z");
  private static final long TOTAL = 11_200L;
  private static final long COST = 5_000L;
  private static final ZoneId IST = ZoneId.of("Asia/Kolkata");

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private SalesInvoiceRepository salesInvoiceRepository;
  @Autowired private PurchaseOrderRepository purchaseOrderRepository;
  @Autowired private ComplianceLicenseRepository licenseRepository;
  @Autowired private ApprovalRuleRepository approvalRuleRepository;
  @Autowired private ApprovalRequestRepository approvalRequestRepository;
  @Autowired private KycSubmissionRepository kycSubmissionRepository;
  @Autowired private StockBatchRepository stockBatchRepository;
  @Autowired private CustomerRepository customerRepository;
  @Autowired private CustomerCreditAccountRepository creditAccountRepository;
  @Autowired private CustomerCreditLedgerEntryRepository creditLedgerRepository;
  @Autowired private SupplierRepository supplierRepository;
  @Autowired private SupplierPayableAccountRepository payableAccountRepository;
  @Autowired private SupplierLedgerEntryRepository supplierLedgerRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @Test
  void ac01_ownerWidgetsCoverSalesStockExpiryApprovalsBooksMoversTransfersLicencesAndOpenPos()
      throws Exception {
    Fixture fx = seed("own-ac01");
    Location annex = persistBranch(fx.tenantId(), "Annex", "BR02", false);
    Stocked product = stocked(fx, "OWN-1", "Glance Pack", 50);
    completeCash(fx, createDraft(fx, product, "own-1"), 1, "own-1-c");
    stockBatchRepository
        .findById(product.batchId())
        .ifPresent(
            batch -> {
              batch.setExpiresOn(LocalDate.now(IST).plusDays(7));
              stockBatchRepository.saveAndFlush(batch);
            });
    mockMvc
        .perform(
            post("/api/v1/stock-transfers")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    transferJson(
                        "PUSH",
                        annex.getId(),
                        product.productId(),
                        product.batchId(),
                        "1",
                        "own-1-t")))
        .andExpect(status().isOk());
    Customer customer = persistCustomer(fx.tenantId(), "Khata Buyer", "9801000199");
    persistCredit(
        fx,
        customer,
        9_000L,
        persistInvoice(fx.tenantId(), fx.branchId(), fx.userId(), customer.getId()),
        Instant.parse("2026-09-01T04:00:00Z"));
    Supplier stockist = persistSupplier(fx.tenantId(), "SUP-O1", "Outlet Stockist");
    persistPayable(fx, fx.branchId(), stockist, 4_000L, Instant.parse("2026-09-01T04:00:00Z"));
    persistOpenPo(fx, stockist.getId());
    persistDueLicense(fx);
    persistPendingApproval(fx);
    persistKyc(fx);

    mockMvc
        .perform(get("/api/v1/dashboards/owner").param("scope", "tenant").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.owner.sales.key").value(DashboardPolicy.WIDGET_SALES))
        .andExpect(jsonPath("$.data.owner.sales.status").value("OK"))
        .andExpect(jsonPath("$.data.owner.sales.href").value("/pos"))
        .andExpect(jsonPath("$.data.owner.sales.data.todaySalesPaise").value((int) TOTAL))
        .andExpect(jsonPath("$.data.owner.sales.data.branches", hasSize(2)))
        .andExpect(jsonPath("$.data.owner.lowStock.key").value(DashboardPolicy.WIDGET_LOW_STOCK))
        .andExpect(jsonPath("$.data.owner.lowStock.status").value("OK"))
        .andExpect(jsonPath("$.data.owner.lowStock.data.count").value(1))
        .andExpect(jsonPath("$.data.owner.expiry.key").value(DashboardPolicy.WIDGET_EXPIRY))
        .andExpect(jsonPath("$.data.owner.expiry.status").value("OK"))
        .andExpect(jsonPath("$.data.owner.expiry.data.count").value(1))
        .andExpect(jsonPath("$.data.owner.approvals.key").value(DashboardPolicy.WIDGET_APPROVALS))
        .andExpect(jsonPath("$.data.owner.approvals.data.count").value(1))
        .andExpect(jsonPath("$.data.owner.approvals.href").value("/approvals/pending"))
        .andExpect(jsonPath("$.data.owner.receivables.data.totalPaise").value(9_000))
        .andExpect(jsonPath("$.data.owner.payables.data.totalPaise").value(4_000))
        .andExpect(
            jsonPath("$.data.owner.topProducts.data.items[0].productName").value("Glance Pack"))
        .andExpect(jsonPath("$.data.owner.transfers.data.count").value(1))
        .andExpect(jsonPath("$.data.owner.compliance.data.tenantStatus").value("ACTIVE"))
        .andExpect(jsonPath("$.data.owner.compliance.data.kycStatus").value("SUBMITTED"))
        .andExpect(jsonPath("$.data.owner.compliance.data.licenseDueCount").value(1))
        .andExpect(jsonPath("$.data.owner.openPurchaseOrders.data.count").value(1))
        .andExpect(jsonPath("$.data.owner.openPurchaseOrders.href").value("/purchases"));
  }

  @Test
  void ac02_everyOwnerWidgetSharesGeneratedAsOf() throws Exception {
    Fixture fx = seed("own-ac02");
    String body =
        mockMvc
            .perform(get("/api/v1/dashboards/owner").param("scope", "tenant").cookie(fx.cookie()))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    JsonNode owner = objectMapper.readTree(body).path("data").path("owner");
    String asOf = owner.path("asOf").asText();
    assertThat(asOf).isNotBlank();
    for (String key :
        new String[] {
          "sales",
          "lowStock",
          "expiry",
          "approvals",
          "receivables",
          "payables",
          "topProducts",
          "transfers",
          "compliance",
          "openPurchaseOrders"
        }) {
      assertThat(owner.path(key).path("asOf").asText()).isEqualTo(asOf);
      assertThat(owner.path(key).path("status").asText()).isEqualTo("OK");
    }
  }

  @Test
  void ac03_ownerBranchFilterDrillsIntoSourceHrefs() throws Exception {
    Fixture fx = seed("own-ac03");
    Location annex = persistBranch(fx.tenantId(), "Annex", "BR02", false);
    Stocked product = stocked(fx, "OWN-3", "Filter Pack", null);
    completeCash(fx, createDraft(fx, product, "own-3"), 1, "own-3-c");

    mockMvc
        .perform(
            get("/api/v1/dashboards/owner")
                .param("branchId", annex.getId().toString())
                .cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.scope").value("branch"))
        .andExpect(jsonPath("$.data.branchId").value(annex.getId().toString()))
        .andExpect(jsonPath("$.data.owner.sales.data.todaySalesPaise").value(0))
        .andExpect(jsonPath("$.data.owner.sales.data.branches", hasSize(1)))
        .andExpect(jsonPath("$.data.owner.sales.href").value("/pos"))
        .andExpect(jsonPath("$.data.owner.lowStock.href").value("/inventory"))
        .andExpect(jsonPath("$.data.owner.approvals.href").value("/approvals/pending"))
        .andExpect(jsonPath("$.data.owner.receivables.href").value("/aging"))
        .andExpect(jsonPath("$.data.owner.compliance.href").value("/licenses"));
  }

  @Test
  void ac05_staffForeignBranchAndUnknownTenantDiscloseNothing() throws Exception {
    Fixture fx = seed("own-ac05");
    Fixture other = seed("own-ac05b");
    Cookie cashier = staffWithPredefined(fx, "cashier", "till@own-ac05.local");
    mockMvc
        .perform(get("/api/v1/dashboards/owner").cookie(cashier))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    mockMvc
        .perform(
            get("/api/v1/dashboards/owner")
                .param("branchId", other.branchId().toString())
                .cookie(fx.cookie()))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    mockMvc.perform(get("/api/v1/dashboards/owner").cookie(fx.cookie())).andExpect(status().isOk());
    mockMvc.perform(get("/api/v1/dashboards/owner").cookie(fx.cookie())).andExpect(status().isOk());
    assertThat(salesInvoiceRepository.count()).isGreaterThanOrEqualTo(0);
  }

  private void persistOpenPo(Fixture fx, UUID supplierId) {
    PurchaseOrder order = new PurchaseOrder();
    order.setId(UUID.randomUUID());
    order.setTenantId(fx.tenantId());
    order.setBranchId(fx.branchId());
    order.setSupplierId(supplierId);
    order.setPoNumber("PO/OWN/1");
    order.setStatus(PurchaseOrderStatus.ISSUED);
    order.setPaymentTerms(SupplierPaymentTerms.CREDIT);
    order.setVersion(1);
    order.setSubtotalPaise(1000);
    order.setTaxPaise(0);
    order.setTotalPaise(1000);
    order.setIdempotencyKey("own-po-1");
    order.setCreatedByUserId(fx.userId());
    order.setCreatedAt(T0);
    order.setUpdatedAt(T0);
    purchaseOrderRepository.saveAndFlush(order);
  }

  private void persistDueLicense(Fixture fx) {
    ComplianceLicense license = new ComplianceLicense();
    license.setId(UUID.randomUUID());
    license.setTenantId(fx.tenantId());
    license.setBranchId(fx.branchId());
    license.setDocType(ComplianceDocType.DRUG_LICENSE);
    license.setScope(ComplianceLicenseScope.BRANCH);
    license.setLicenseNumber("KA-DL-1");
    license.setIssuedOn(LocalDate.of(2026, 1, 1));
    license.setExpiresOn(LocalDate.now(IST).plusDays(10));
    license.setVersion(1);
    license.setCreatedAt(T0);
    license.setUpdatedAt(T0);
    licenseRepository.saveAndFlush(license);
  }

  private void persistPendingApproval(Fixture fx) {
    ApprovalRule rule = new ApprovalRule();
    rule.setId(UUID.randomUUID());
    rule.setTenantId(fx.tenantId());
    rule.setScope(AccessScope.TENANT);
    rule.setModuleCode(ModuleCode.INVENTORY);
    rule.setActionKey(ApprovalActionKey.INVENTORY_WRITE_OFF);
    rule.setThresholdValue(1);
    rule.setApproverType(ApproverType.ACCOUNT_CLASS);
    rule.setApproverAccountClass(AppUserRole.pharmacy_owner);
    rule.setAllowSelfApproval(true);
    rule.setVersion(1);
    rule.setCreatedBy(fx.userId());
    rule.setCreatedAt(T0);
    rule.setUpdatedAt(T0);
    approvalRuleRepository.saveAndFlush(rule);
    ApprovalRequest request = new ApprovalRequest();
    request.setId(UUID.randomUUID());
    request.setTenantId(fx.tenantId());
    request.setBranchId(fx.branchId());
    request.setRuleId(rule.getId());
    request.setRequesterUserId(fx.userId());
    request.setModuleCode(ModuleCode.INVENTORY);
    request.setActionKey(ApprovalActionKey.INVENTORY_WRITE_OFF);
    request.setAmountValue(500);
    request.setThresholdSnapshot(1);
    request.setRuleVersionSnapshot(1);
    request.setStatus(ApprovalRequestStatus.PENDING);
    request.setIdempotencyKey("own-appr-1");
    request.setVersion(1);
    request.setCreatedAt(T0);
    request.setUpdatedAt(T0);
    approvalRequestRepository.saveAndFlush(request);
  }

  private void persistKyc(Fixture fx) {
    KycSubmission row = new KycSubmission();
    row.setId(UUID.randomUUID());
    row.setTenantId(fx.tenantId());
    row.setLegalName("Glance Chemist");
    row.setDrugLicenseNumber("KA-20B-1");
    row.setPan("ABCDE1234F");
    row.setAddressLine1("12 MG Road");
    row.setCity("Bengaluru");
    row.setState("KA");
    row.setPincode("560001");
    row.setContactPhone("9876543210");
    row.setStatus(KycSubmissionStatus.SUBMITTED);
    row.setSubmittedBy(fx.userId());
    row.setSubmittedAt(T0);
    row.setVersion(1);
    row.setCreatedAt(T0);
    row.setUpdatedAt(T0);
    kycSubmissionRepository.saveAndFlush(row);
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
    selectBranch(cookie, fx.branchId());
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
    throw new AssertionError("missing role " + code);
  }

  private UUID persistInvoice(UUID tenantId, UUID branchId, UUID userId, UUID customerId) {
    SalesInvoice invoice = new SalesInvoice();
    invoice.setId(UUID.randomUUID());
    invoice.setTenantId(tenantId);
    invoice.setBranchId(branchId);
    invoice.setInvoiceNumber("INV-OWN-" + invoice.getId().toString().substring(0, 8));
    invoice.setStatus(SalesInvoiceStatus.COMPLETED);
    invoice.setStaffUserId(userId);
    invoice.setTerminalId(userId);
    invoice.setCustomerId(customerId);
    invoice.setSubtotalPaise(9000);
    invoice.setTotalPaise(9000);
    invoice.setBillDiscountType(DiscountType.NONE);
    invoice.setTaxJurisdiction(TaxJurisdiction.INTRA);
    invoice.setDiscountApprovalStatus(DiscountApprovalStatus.NOT_REQUIRED);
    invoice.setEinvoiceApplicability(EinvoiceApplicability.NOT_APPLICABLE);
    invoice.setEinvoiceStatus(EinvoiceStatus.NOT_SUBMITTED);
    invoice.setCompletedAt(Instant.parse("2026-09-01T04:00:00Z"));
    invoice.setIdempotencyKey("own-inv-" + invoice.getId());
    invoice.setVersion(1);
    invoice.setCreatedAt(T0);
    invoice.setUpdatedAt(T0);
    return salesInvoiceRepository.saveAndFlush(invoice).getId();
  }

  private void persistCredit(
      Fixture fx, Customer customer, long amount, UUID invoiceId, Instant occurredAt) {
    CustomerCreditAccount account = new CustomerCreditAccount();
    account.setId(UUID.randomUUID());
    account.setTenantId(fx.tenantId());
    account.setCustomerId(customer.getId());
    account.setLimitPaise(50_000);
    account.setBalancePaise(amount);
    account.setVersion(1);
    account.setCreatedAt(occurredAt);
    account.setUpdatedAt(occurredAt);
    creditAccountRepository.saveAndFlush(account);
    CustomerCreditLedgerEntry entry = new CustomerCreditLedgerEntry();
    entry.setId(UUID.randomUUID());
    entry.setTenantId(fx.tenantId());
    entry.setCustomerId(customer.getId());
    entry.setAccountId(account.getId());
    entry.setType(CustomerCreditLedgerType.SALE_CHARGE);
    entry.setAmountPaise(amount);
    entry.setBalanceAfterPaise(amount);
    entry.setInvoiceId(invoiceId);
    entry.setCreatedByUserId(fx.userId());
    entry.setOccurredAt(occurredAt);
    entry.setCreatedAt(occurredAt);
    creditLedgerRepository.saveAndFlush(entry);
  }

  private Customer persistCustomer(UUID tenantId, String name, String phone) {
    Customer customer = new Customer();
    customer.setId(UUID.randomUUID());
    customer.setTenantId(tenantId);
    customer.setName(name);
    customer.setPhone(phone);
    customer.setCreatedAt(T0);
    customer.setUpdatedAt(T0);
    return customerRepository.saveAndFlush(customer);
  }

  private Supplier persistSupplier(UUID tenantId, String code, String legalName) {
    Supplier supplier = new Supplier();
    supplier.setId(UUID.randomUUID());
    supplier.setTenantId(tenantId);
    supplier.setSupplierCode(code);
    supplier.setLegalName(legalName);
    supplier.setSupplierType(SupplierType.DISTRIBUTOR);
    supplier.setContactPersonName("Ravi");
    supplier.setPhone("9876500001");
    supplier.setAddressLine1("12 Stockist Road");
    supplier.setCity("Bengaluru");
    supplier.setState("KA");
    supplier.setPincode("560001");
    supplier.setCountry("IN");
    supplier.setPaymentTerms(SupplierPaymentTerms.CREDIT);
    supplier.setCreditPeriodDays(30);
    supplier.setStatus(SupplierStatus.ACTIVE);
    supplier.setCreatedAt(T0);
    supplier.setUpdatedAt(T0);
    return supplierRepository.saveAndFlush(supplier);
  }

  private void persistPayable(
      Fixture fx, UUID branchId, Supplier supplier, long amountPaise, Instant occurredAt) {
    SupplierPayableAccount account = new SupplierPayableAccount();
    account.setId(UUID.randomUUID());
    account.setTenantId(fx.tenantId());
    account.setBranchId(branchId);
    account.setSupplierId(supplier.getId());
    account.setBalancePaise(amountPaise);
    account.setVersion(1);
    account.setCreatedAt(occurredAt);
    account.setUpdatedAt(occurredAt);
    payableAccountRepository.saveAndFlush(account);
    SupplierLedgerEntry entry = new SupplierLedgerEntry();
    entry.setId(UUID.randomUUID());
    entry.setTenantId(fx.tenantId());
    entry.setBranchId(branchId);
    entry.setSupplierId(supplier.getId());
    entry.setAccountId(account.getId());
    entry.setType(SupplierLedgerType.INVOICE);
    entry.setAmountPaise(amountPaise);
    entry.setBalanceAfterPaise(amountPaise);
    entry.setDueOn(LocalDate.of(2026, 9, 1));
    entry.setIdempotencyKey("own-inv-" + entry.getId());
    entry.setCreatedByUserId(fx.userId());
    entry.setOccurredAt(occurredAt);
    entry.setCreatedAt(occurredAt);
    supplierLedgerRepository.saveAndFlush(entry);
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

  private UUID createDraft(Fixture fx, Stocked product, String key) throws Exception {
    return idOf(
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
                            "discountPaise":0,
                            "prescribedQuantity":null
                          }]
                        }
                        """
                            .formatted(key, product.productId(), product.batchId())))
            .andExpect(status().isOk())
            .andReturn());
  }

  private Stocked stocked(Fixture fx, String sku, String name, Integer reorderLevel)
      throws Exception {
    UUID categoryId =
        idOf(
            mockMvc
                .perform(
                    post("/api/v1/product-categories")
                        .cookie(fx.cookie())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + sku + " cat\"}"))
                .andExpect(status().isOk())
                .andReturn());
    UUID productId =
        idOf(
            mockMvc
                .perform(
                    post("/api/v1/products")
                        .cookie(fx.cookie())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(productJson(sku, name, categoryId, reorderLevel)))
                .andExpect(status().isOk())
                .andReturn());
    mockMvc
        .perform(
            post("/api/v1/inventory/receipts")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"productId\":\"%s\",\"batchNumber\":\"LOT-%s\",\"manufacturedOn\":\"2026-01-15\",\"expiresOn\":\"2027-06-30\",\"purchasePricePaise\":%d,\"quantity\":\"10\",\"idempotencyKey\":\"%s-recv\",\"expectedVersion\":0}"
                        .formatted(productId, sku, COST, sku)))
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

  private UUID idOf(MvcResult result) throws Exception {
    return UUID.fromString(
        objectMapper
            .readTree(result.getResponse().getContentAsString())
            .path("data")
            .path("id")
            .asText());
  }

  private String transferJson(
      String direction, UUID annexId, UUID productId, UUID batchId, String qty, String key) {
    return """
        {
          "direction":"%s",
          "counterpartyBranchId":"%s",
          "idempotencyKey":"%s",
          "lines":[{"productId":"%s","batchId":"%s","quantity":%s}]
        }
        """
        .formatted(direction, annexId, key, productId, batchId, qty);
  }

  private Fixture seed(String tag) throws Exception {
    Tenant tenant = persistTenant(tag, "Own " + tag);
    persistPlan(tenant.getId());
    AppUser owner =
        persistUser(tenant.getId(), "owner@" + tag + ".local", AppUserRole.pharmacy_owner);
    Location branch = persistBranch(tenant.getId(), "Main", "BR01", true);
    Cookie cookie = login("owner@" + tag + ".local");
    selectBranch(cookie, branch.getId());
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
    Map<String, Object> pricing = new LinkedHashMap<>();
    pricing.put("defaultMarkupBps", 0);
    pricing.put("roundToNearestPaise", 1);
    branch.setPricingSettings(pricing);
    Map<String, Object> tax = new LinkedHashMap<>();
    tax.put("gstMode", "CGST_SGST");
    tax.put("taxState", "KA");
    branch.setTaxSettings(tax);
    Map<String, Object> inventory = new LinkedHashMap<>();
    inventory.put("expiryWarnDays", 30);
    branch.setInventorySettings(inventory);
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

  private static String productJson(
      String sku, String name, UUID categoryId, Integer reorderLevel) {
    String reorder = reorderLevel == null ? "null" : reorderLevel.toString();
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
          "reorderLevel":%s,
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
        .formatted(sku, name, categoryId, reorder);
  }

  private record Fixture(UUID tenantId, UUID branchId, UUID userId, Cookie cookie) {}

  private record Stocked(UUID productId, UUID batchId) {}
}
