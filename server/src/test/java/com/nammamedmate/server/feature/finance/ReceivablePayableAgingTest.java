package com.nammamedmate.server.feature.finance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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

class ReceivablePayableAgingTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-06T02:00:00Z");
  private static final LocalDate AS_OF = LocalDate.of(2026, 9, 6);
  private static final ZoneId IST = ZoneId.of("Asia/Kolkata");

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
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
  void ac01_arDerivesFromCustomerCreditAndApFromSupplierLedger() throws Exception {
    Fixture fx = seed("aging-src");
    Customer customer = persistCustomer(fx.tenantId(), "Khata Buyer", "9801000001");
    UUID invoiceId = persistInvoice(fx.tenantId(), fx.branchId(), fx.userId(), customer.getId());
    persistCredit(fx, customer, 12_000L, invoiceId, Instant.parse("2026-09-01T04:00:00Z"), null);
    Supplier stockist = persistSupplier(fx.tenantId(), "SUP-AR01", "Acme Stockist");
    persistPayable(
        fx,
        fx.branchId(),
        stockist,
        8_000L,
        Instant.parse("2026-09-01T04:00:00Z"),
        LocalDate.of(2026, 9, 1));

    mockMvc
        .perform(
            get("/api/v1/finance/receivables").param("asOf", AS_OF.toString()).cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.asOf").value(AS_OF.toString()))
        .andExpect(jsonPath("$.data.totalPaise").value(12_000))
        .andExpect(jsonPath("$.data.sourceBalancePaise").value(12_000))
        .andExpect(jsonPath("$.data.buckets", hasSize(4)))
        .andExpect(jsonPath("$.data.items[0].partyId").value(customer.getId().toString()))
        .andExpect(jsonPath("$.data.items[0].name").value("Khata Buyer"))
        .andExpect(jsonPath("$.data.items[0].amountPaise").value(12_000));

    mockMvc
        .perform(
            get("/api/v1/finance/payables").param("asOf", AS_OF.toString()).cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.asOf").value(AS_OF.toString()))
        .andExpect(jsonPath("$.data.totalPaise").value(8_000))
        .andExpect(jsonPath("$.data.sourceBalancePaise").value(8_000))
        .andExpect(jsonPath("$.data.items[0].partyId").value(stockist.getId().toString()))
        .andExpect(jsonPath("$.data.items[0].name").value("Acme Stockist"))
        .andExpect(jsonPath("$.data.items[0].amountPaise").value(8_000));
  }

  @Test
  void ac02_fourBucketsReceiveKnownDayCounts() throws Exception {
    Fixture fx = seed("aging-bkt");
    Customer current = persistCustomer(fx.tenantId(), "Current Due", "9801000011");
    Customer mid = persistCustomer(fx.tenantId(), "Mid Due", "9801000012");
    Customer late = persistCustomer(fx.tenantId(), "Late Due", "9801000013");
    Customer old = persistCustomer(fx.tenantId(), "Old Due", "9801000014");
    persistCredit(
        fx,
        current,
        1_000L,
        persistInvoice(fx.tenantId(), fx.branchId(), fx.userId(), current.getId()),
        Instant.parse("2026-09-01T04:00:00Z"),
        null);
    persistCredit(
        fx,
        mid,
        2_000L,
        persistInvoice(fx.tenantId(), fx.branchId(), fx.userId(), mid.getId()),
        Instant.parse("2026-08-01T04:00:00Z"),
        null);
    persistCredit(
        fx,
        late,
        3_000L,
        persistInvoice(fx.tenantId(), fx.branchId(), fx.userId(), late.getId()),
        Instant.parse("2026-07-01T04:00:00Z"),
        null);
    persistCredit(
        fx,
        old,
        4_000L,
        persistInvoice(fx.tenantId(), fx.branchId(), fx.userId(), old.getId()),
        Instant.parse("2026-05-01T04:00:00Z"),
        null);

    mockMvc
        .perform(
            get("/api/v1/finance/receivables").param("asOf", AS_OF.toString()).cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.buckets[0].key").value("D0_30"))
        .andExpect(jsonPath("$.data.buckets[0].totalPaise").value(1_000))
        .andExpect(jsonPath("$.data.buckets[1].key").value("D31_60"))
        .andExpect(jsonPath("$.data.buckets[1].totalPaise").value(2_000))
        .andExpect(jsonPath("$.data.buckets[2].key").value("D61_90"))
        .andExpect(jsonPath("$.data.buckets[2].totalPaise").value(3_000))
        .andExpect(jsonPath("$.data.buckets[3].key").value("D90_PLUS"))
        .andExpect(jsonPath("$.data.buckets[3].totalPaise").value(4_000));
  }

  @Test
  void ac03_branchFilterAndTenantRollupShareOneAsOf() throws Exception {
    Fixture fx = seed("aging-scope");
    Location annex = persistBranch(fx.tenantId(), "Annex", "BR02", false);
    Customer mainCust = persistCustomer(fx.tenantId(), "Main Khata", "9801000021");
    Customer annexCust = persistCustomer(fx.tenantId(), "Annex Khata", "9801000022");
    persistCredit(
        fx,
        mainCust,
        10_000L,
        persistInvoice(fx.tenantId(), fx.branchId(), fx.userId(), mainCust.getId()),
        Instant.parse("2026-09-01T04:00:00Z"),
        null);
    persistCredit(
        fx,
        annexCust,
        15_000L,
        persistInvoice(fx.tenantId(), annex.getId(), fx.userId(), annexCust.getId()),
        Instant.parse("2026-09-01T04:00:00Z"),
        null);
    Supplier mainSup = persistSupplier(fx.tenantId(), "SUP-MAIN", "Main Stockist");
    Supplier annexSup = persistSupplier(fx.tenantId(), "SUP-ANNEX", "Annex Stockist");
    persistPayable(
        fx,
        fx.branchId(),
        mainSup,
        20_000L,
        Instant.parse("2026-09-01T04:00:00Z"),
        LocalDate.of(2026, 9, 1));
    persistPayable(
        fx,
        annex.getId(),
        annexSup,
        5_000L,
        Instant.parse("2026-09-01T04:00:00Z"),
        LocalDate.of(2026, 9, 1));

    JsonNode arBranch =
        read(
            mockMvc
                .perform(
                    get("/api/v1/finance/receivables")
                        .param("asOf", AS_OF.toString())
                        .cookie(fx.cookie()))
                .andExpect(status().isOk())
                .andReturn());
    JsonNode apBranch =
        read(
            mockMvc
                .perform(
                    get("/api/v1/finance/payables")
                        .param("asOf", AS_OF.toString())
                        .cookie(fx.cookie()))
                .andExpect(status().isOk())
                .andReturn());
    assertThat(arBranch.path("asOf").asText()).isEqualTo(AS_OF.toString());
    assertThat(apBranch.path("asOf").asText()).isEqualTo(arBranch.path("asOf").asText());
    assertThat(arBranch.path("totalPaise").asLong()).isEqualTo(10_000L);
    assertThat(apBranch.path("totalPaise").asLong()).isEqualTo(20_000L);

    JsonNode arTenant =
        read(
            mockMvc
                .perform(
                    get("/api/v1/finance/receivables")
                        .param("asOf", AS_OF.toString())
                        .param("scope", "tenant")
                        .cookie(fx.cookie()))
                .andExpect(status().isOk())
                .andReturn());
    JsonNode apTenant =
        read(
            mockMvc
                .perform(
                    get("/api/v1/finance/payables")
                        .param("asOf", AS_OF.toString())
                        .param("scope", "tenant")
                        .cookie(fx.cookie()))
                .andExpect(status().isOk())
                .andReturn());
    assertThat(arTenant.path("asOf").asText()).isEqualTo(apTenant.path("asOf").asText());
    assertThat(arTenant.path("totalPaise").asLong()).isEqualTo(25_000L);
    assertThat(apTenant.path("totalPaise").asLong()).isEqualTo(25_000L);
  }

  @Test
  void ac04_todayTotalsMatchSourceBalancesAndPastAsOfIgnoresLaterSettlements() throws Exception {
    Fixture fx = seed("aging-auth");
    Customer customer = persistCustomer(fx.tenantId(), "Settled Khata", "9801000031");
    UUID invoiceId = persistInvoice(fx.tenantId(), fx.branchId(), fx.userId(), customer.getId());
    CustomerCreditAccount account =
        persistCredit(
            fx, customer, 10_000L, invoiceId, Instant.parse("2026-08-01T04:00:00Z"), null);
    persistSettlement(fx, account, customer, 4_000L, Instant.parse("2026-09-06T01:00:00Z"));
    Supplier stockist = persistSupplier(fx.tenantId(), "SUP-AUTH", "Balance Stockist");
    persistPayable(
        fx,
        fx.branchId(),
        stockist,
        7_000L,
        Instant.parse("2026-08-01T04:00:00Z"),
        LocalDate.of(2026, 8, 1));

    mockMvc
        .perform(
            get("/api/v1/finance/receivables").param("asOf", AS_OF.toString()).cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.totalPaise").value(6_000))
        .andExpect(jsonPath("$.data.sourceBalancePaise").value(6_000));
    mockMvc
        .perform(get("/api/v1/finance/receivables").param("asOf", "2026-08-15").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.totalPaise").value(10_000));
    mockMvc
        .perform(
            get("/api/v1/finance/payables").param("asOf", AS_OF.toString()).cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.totalPaise").value(7_000))
        .andExpect(jsonPath("$.data.sourceBalancePaise").value(7_000));
  }

  @Test
  void ac05_futureMissingDueUnauthorizedBranchAndCrossTenantAreSafe() throws Exception {
    Fixture fx = seed("aging-iso");
    Customer customer = persistCustomer(fx.tenantId(), "Iso Khata", "9801000041");
    persistCredit(
        fx,
        customer,
        9_000L,
        persistInvoice(fx.tenantId(), fx.branchId(), fx.userId(), customer.getId()),
        Instant.parse("2026-05-01T04:00:00Z"),
        null);
    Supplier undated = persistSupplier(fx.tenantId(), "SUP-NODUE", "No Due Stockist");
    persistPayable(fx, fx.branchId(), undated, 3_000L, Instant.parse("2026-05-01T04:00:00Z"), null);

    mockMvc
        .perform(
            get("/api/v1/finance/payables").param("asOf", AS_OF.toString()).cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.totalPaise").value(3_000))
        .andExpect(jsonPath("$.data.buckets[3].totalPaise").value(3_000));

    LocalDate future = LocalDate.now(IST).plusDays(1);
    mockMvc
        .perform(
            get("/api/v1/finance/receivables").param("asOf", future.toString()).cookie(fx.cookie()))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("FUTURE_AS_OF"));

    AppUser cashier =
        persistUser(fx.tenantId(), "till@aging-iso.local", AppUserRole.pharmacy_staff);
    UUID salesRole = createRole(fx.cookie(), "Till desk", "[\"SALES\"]");
    mockMvc.perform(putRoles(cashier.getId(), fx.cookie(), salesRole)).andExpect(status().isOk());
    assignBranch(fx.cookie(), cashier.getId(), fx.branchId());
    Cookie till = login("till@aging-iso.local");
    selectBranch(till, fx.branchId());
    mockMvc
        .perform(get("/api/v1/finance/receivables").param("asOf", AS_OF.toString()).cookie(till))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));

    Fixture other = seed("aging-other");
    mockMvc
        .perform(
            get("/api/v1/finance/receivables")
                .param("asOf", AS_OF.toString())
                .cookie(other.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.totalPaise").value(0))
        .andExpect(jsonPath("$.data.items", hasSize(0)));
    mockMvc
        .perform(
            get("/api/v1/finance/payables")
                .param("asOf", AS_OF.toString())
                .param("branchId", fx.branchId().toString())
                .cookie(other.cookie()))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));

    AppUser accountant =
        persistUser(fx.tenantId(), "books@aging-iso.local", AppUserRole.pharmacy_staff);
    assignAccountant(fx.cookie(), accountant.getId());
    assignBranch(fx.cookie(), accountant.getId(), fx.branchId());
    Cookie books = login("books@aging-iso.local");
    selectBranch(books, fx.branchId());
    Location annex = persistBranch(fx.tenantId(), "Hidden annex", "BR09", false);
    mockMvc
        .perform(
            get("/api/v1/finance/receivables")
                .param("asOf", AS_OF.toString())
                .param("branchId", annex.getId().toString())
                .cookie(books))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    mockMvc
        .perform(
            get("/api/v1/finance/receivables")
                .param("asOf", AS_OF.toString())
                .param("scope", "tenant")
                .cookie(books))
        .andExpect(status().isForbidden());

    mockMvc.perform(get("/api/v1/finance/receivables")).andExpect(status().isUnauthorized());
  }

  private JsonNode read(MvcResult result) throws Exception {
    return objectMapper.readTree(result.getResponse().getContentAsString()).path("data");
  }

  private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder putRoles(
      UUID userId, Cookie owner, UUID roleId) {
    return org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(
            "/api/v1/users/" + userId + "/roles")
        .cookie(owner)
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"roleIds\":[\"" + roleId + "\"]}");
  }

  private void assignAccountant(Cookie owner, UUID userId) throws Exception {
    mockMvc
        .perform(putRoles(userId, owner, predefinedId(owner, "accountant")))
        .andExpect(status().isOk());
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

  private void assignBranch(Cookie owner, UUID userId, UUID branchId) throws Exception {
    mockMvc
        .perform(
            org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(
                    "/api/v1/users/" + userId + "/branches")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchIds\":[\"" + branchId + "\"]}"))
        .andExpect(status().isOk());
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

  private CustomerCreditAccount persistCredit(
      Fixture fx,
      Customer customer,
      long amountPaise,
      UUID invoiceId,
      Instant occurredAt,
      CustomerCreditAccount existing) {
    CustomerCreditAccount account = existing;
    if (account == null) {
      account = new CustomerCreditAccount();
      account.setId(UUID.randomUUID());
      account.setTenantId(fx.tenantId());
      account.setCustomerId(customer.getId());
      account.setLimitPaise(1_000_000L);
      account.setBalancePaise(0);
      account.setVersion(0);
      account.setCreatedAt(occurredAt);
      account.setUpdatedAt(occurredAt);
    }
    account.setBalancePaise(account.getBalancePaise() + amountPaise);
    account.setVersion(account.getVersion() + 1);
    account.setUpdatedAt(occurredAt);
    creditAccountRepository.saveAndFlush(account);
    CustomerCreditLedgerEntry entry = new CustomerCreditLedgerEntry();
    entry.setId(UUID.randomUUID());
    entry.setTenantId(fx.tenantId());
    entry.setCustomerId(customer.getId());
    entry.setAccountId(account.getId());
    entry.setType(CustomerCreditLedgerType.SALE_CHARGE);
    entry.setAmountPaise(amountPaise);
    entry.setBalanceAfterPaise(account.getBalancePaise());
    entry.setInvoiceId(invoiceId);
    entry.setIdempotencyKey("chg-" + entry.getId());
    entry.setCreatedByUserId(fx.userId());
    entry.setOccurredAt(occurredAt);
    entry.setCreatedAt(occurredAt);
    creditLedgerRepository.saveAndFlush(entry);
    return account;
  }

  private void persistSettlement(
      Fixture fx,
      CustomerCreditAccount account,
      Customer customer,
      long amountPaise,
      Instant occurredAt) {
    account.setBalancePaise(account.getBalancePaise() - amountPaise);
    account.setVersion(account.getVersion() + 1);
    account.setUpdatedAt(occurredAt);
    creditAccountRepository.saveAndFlush(account);
    CustomerCreditLedgerEntry entry = new CustomerCreditLedgerEntry();
    entry.setId(UUID.randomUUID());
    entry.setTenantId(fx.tenantId());
    entry.setCustomerId(customer.getId());
    entry.setAccountId(account.getId());
    entry.setType(CustomerCreditLedgerType.SETTLEMENT);
    entry.setAmountPaise(amountPaise);
    entry.setBalanceAfterPaise(account.getBalancePaise());
    entry.setSettlementMode("CASH");
    entry.setIdempotencyKey("set-" + entry.getId());
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

  private void persistPayable(
      Fixture fx,
      UUID branchId,
      Supplier supplier,
      long amountPaise,
      Instant occurredAt,
      LocalDate dueOn) {
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
    entry.setDueOn(dueOn);
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
