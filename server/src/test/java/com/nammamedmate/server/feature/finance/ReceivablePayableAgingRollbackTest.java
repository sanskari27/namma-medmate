package com.nammamedmate.server.feature.finance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.nammamedmate.server.AbstractIntegrationTest;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.BranchType;
import com.nammamedmate.server.domain.Customer;
import com.nammamedmate.server.domain.CustomerCreditAccount;
import com.nammamedmate.server.domain.CustomerCreditLedgerEntry;
import com.nammamedmate.server.domain.CustomerCreditLedgerType;
import com.nammamedmate.server.domain.DiscountApprovalStatus;
import com.nammamedmate.server.domain.DiscountType;
import com.nammamedmate.server.domain.EinvoiceApplicability;
import com.nammamedmate.server.domain.EinvoiceStatus;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.PlanCode;
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
import com.nammamedmate.server.persistence.CustomerCreditAccountRepository;
import com.nammamedmate.server.persistence.CustomerCreditLedgerEntryRepository;
import com.nammamedmate.server.persistence.CustomerRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.SalesInvoiceRepository;
import com.nammamedmate.server.persistence.SupplierLedgerEntryRepository;
import com.nammamedmate.server.persistence.SupplierPayableAccountRepository;
import com.nammamedmate.server.persistence.SupplierRepository;
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

class ReceivablePayableAgingRollbackTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-06T02:00:00Z");
  private static final LocalDate AS_OF = LocalDate.of(2026, 9, 6);

  @Autowired private MockMvc mockMvc;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private CustomerRepository customerRepository;
  @Autowired private CustomerCreditAccountRepository creditAccountRepository;
  @Autowired private CustomerCreditLedgerEntryRepository creditLedgerRepository;
  @Autowired private SalesInvoiceRepository salesInvoiceRepository;
  @Autowired private SupplierRepository supplierRepository;
  @Autowired private SupplierPayableAccountRepository payableAccountRepository;
  @Autowired private SupplierLedgerEntryRepository supplierLedgerRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @Test
  void ac05_agingReadsDoNotChangeSourceBalances() throws Exception {
    Fixture fx = seed("aging-rb");
    Customer customer = persistCustomer(fx.tenantId(), "Rollback Khata", "9801000091");
    persistCredit(
        fx,
        customer,
        11_000L,
        persistInvoice(fx.tenantId(), fx.branchId(), fx.userId(), customer.getId()),
        Instant.parse("2026-09-01T04:00:00Z"));
    Supplier stockist = persistSupplier(fx.tenantId(), "SUP-RB", "Rollback Stockist");
    persistPayable(fx, stockist, 4_400L, Instant.parse("2026-09-01T04:00:00Z"));

    long creditBalance =
        creditAccountRepository
            .findByTenantIdAndCustomerId(fx.tenantId(), customer.getId())
            .orElseThrow()
            .getBalancePaise();
    long payableBalance =
        payableAccountRepository
            .findByTenantIdAndBranchIdAndSupplierId(fx.tenantId(), fx.branchId(), stockist.getId())
            .orElseThrow()
            .getBalancePaise();
    long creditRows = creditLedgerRepository.count();
    long payableRows = supplierLedgerRepository.count();

    mockMvc
        .perform(
            get("/api/v1/finance/receivables").param("asOf", AS_OF.toString()).cookie(fx.cookie()))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            get("/api/v1/finance/payables").param("asOf", AS_OF.toString()).cookie(fx.cookie()))
        .andExpect(status().isOk());

    assertThat(
            creditAccountRepository
                .findByTenantIdAndCustomerId(fx.tenantId(), customer.getId())
                .orElseThrow()
                .getBalancePaise())
        .isEqualTo(creditBalance);
    assertThat(
            payableAccountRepository
                .findByTenantIdAndBranchIdAndSupplierId(
                    fx.tenantId(), fx.branchId(), stockist.getId())
                .orElseThrow()
                .getBalancePaise())
        .isEqualTo(payableBalance);
    assertThat(creditLedgerRepository.count()).isEqualTo(creditRows);
    assertThat(supplierLedgerRepository.count()).isEqualTo(payableRows);
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

  private Fixture seed(String tag) throws Exception {
    Tenant tenant = persistTenant(tag, "Aging " + tag);
    persistPlan(tenant.getId(), PlanCode.FREE);
    AppUser owner =
        persistUser(tenant.getId(), "owner@" + tag + ".local", AppUserRole.pharmacy_owner);
    Location branch = persistBranch(tenant.getId(), "Main", "BR01", true);
    Cookie cookie = login("owner@" + tag + ".local");
    selectBranch(cookie, branch.getId());
    return new Fixture(tenant.getId(), branch.getId(), owner.getId(), cookie);
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

  private UUID persistInvoice(UUID tenantId, UUID branchId, UUID userId, UUID customerId) {
    SalesInvoice invoice = new SalesInvoice();
    invoice.setId(UUID.randomUUID());
    invoice.setTenantId(tenantId);
    invoice.setBranchId(branchId);
    invoice.setInvoiceNumber("INV/2026-27/BR01/" + invoice.getId().toString().substring(0, 5));
    invoice.setStatus(SalesInvoiceStatus.COMPLETED);
    invoice.setStaffUserId(userId);
    invoice.setTerminalId(UUID.randomUUID());
    invoice.setCustomerId(customerId);
    invoice.setSubtotalPaise(0);
    invoice.setDiscountPaise(0);
    invoice.setTaxPaise(0);
    invoice.setTotalPaise(0);
    invoice.setBillDiscountType(DiscountType.NONE);
    invoice.setBillDiscountValue(0);
    invoice.setTaxJurisdiction(TaxJurisdiction.INTRA);
    invoice.setDiscountApprovalStatus(DiscountApprovalStatus.NOT_REQUIRED);
    invoice.setEinvoiceApplicability(EinvoiceApplicability.NOT_APPLICABLE);
    invoice.setEinvoiceStatus(EinvoiceStatus.NOT_SUBMITTED);
    invoice.setIdempotencyKey("inv-" + invoice.getId());
    invoice.setVersion(1);
    invoice.setCreatedAt(T0);
    invoice.setUpdatedAt(T0);
    return salesInvoiceRepository.saveAndFlush(invoice).getId();
  }

  private void persistCredit(
      Fixture fx, Customer customer, long amountPaise, UUID invoiceId, Instant occurredAt) {
    CustomerCreditAccount account = new CustomerCreditAccount();
    account.setId(UUID.randomUUID());
    account.setTenantId(fx.tenantId());
    account.setCustomerId(customer.getId());
    account.setLimitPaise(1_000_000L);
    account.setBalancePaise(amountPaise);
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
    entry.setAmountPaise(amountPaise);
    entry.setBalanceAfterPaise(amountPaise);
    entry.setInvoiceId(invoiceId);
    entry.setIdempotencyKey("chg-" + entry.getId());
    entry.setCreatedByUserId(fx.userId());
    entry.setOccurredAt(occurredAt);
    entry.setCreatedAt(occurredAt);
    creditLedgerRepository.saveAndFlush(entry);
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

  private void persistPayable(Fixture fx, Supplier supplier, long amountPaise, Instant occurredAt) {
    SupplierPayableAccount account = new SupplierPayableAccount();
    account.setId(UUID.randomUUID());
    account.setTenantId(fx.tenantId());
    account.setBranchId(fx.branchId());
    account.setSupplierId(supplier.getId());
    account.setBalancePaise(amountPaise);
    account.setVersion(1);
    account.setCreatedAt(occurredAt);
    account.setUpdatedAt(occurredAt);
    payableAccountRepository.saveAndFlush(account);
    SupplierLedgerEntry entry = new SupplierLedgerEntry();
    entry.setId(UUID.randomUUID());
    entry.setTenantId(fx.tenantId());
    entry.setBranchId(fx.branchId());
    entry.setSupplierId(supplier.getId());
    entry.setAccountId(account.getId());
    entry.setType(SupplierLedgerType.INVOICE);
    entry.setAmountPaise(amountPaise);
    entry.setBalanceAfterPaise(amountPaise);
    entry.setDueOn(LocalDate.of(2026, 9, 1));
    entry.setIdempotencyKey("inv-" + entry.getId());
    entry.setCreatedByUserId(fx.userId());
    entry.setOccurredAt(occurredAt);
    entry.setCreatedAt(occurredAt);
    supplierLedgerRepository.saveAndFlush(entry);
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

  private record Fixture(UUID tenantId, UUID branchId, UUID userId, Cookie cookie) {}
}
