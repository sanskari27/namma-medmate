package com.nammamedmate.server.feature.customercredit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.domain.AccessRoleKind;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AccessRoleEventRepository;
import com.nammamedmate.server.persistence.AccessRoleModuleRepository;
import com.nammamedmate.server.persistence.AccessRoleRepository;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.CustomerCreditAccountRepository;
import com.nammamedmate.server.persistence.CustomerCreditLedgerEntryRepository;
import com.nammamedmate.server.persistence.CustomerRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import com.nammamedmate.server.persistence.UserAccessRoleRepository;
import com.nammamedmate.server.persistence.UserSessionRepository;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
class CustomerCreditTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-04T05:00:00Z");

  @Container
  static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:16-alpine")
          .withDatabaseName("nammamedmate_customer_credit")
          .withUsername("postgres")
          .withPassword("postgres");

  @DynamicPropertySource
  static void datasource(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
    registry.add("spring.datasource.username", POSTGRES::getUsername);
    registry.add("spring.datasource.password", POSTGRES::getPassword);
  }

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private UserSessionRepository userSessionRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private CustomerRepository customerRepository;
  @Autowired private CustomerCreditAccountRepository accountRepository;
  @Autowired private CustomerCreditLedgerEntryRepository ledgerRepository;
  @Autowired private UserAccessRoleRepository userAccessRoleRepository;
  @Autowired private AccessRoleEventRepository accessRoleEventRepository;
  @Autowired private AccessRoleModuleRepository accessRoleModuleRepository;
  @Autowired private AccessRoleRepository accessRoleRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @BeforeEach
  void wipe() {
    ledgerRepository.deleteAll();
    accountRepository.deleteAll();
    customerRepository.deleteAll();
    accessRoleEventRepository.deleteAll();
    userAccessRoleRepository.deleteAll();
    accessRoleRepository
        .findByKind(AccessRoleKind.CUSTOM)
        .forEach(
            role -> {
              accessRoleModuleRepository.deleteAll(
                  accessRoleModuleRepository.findByRoleIdIn(java.util.List.of(role.getId())));
              accessRoleRepository.delete(role);
            });
    userSessionRepository.deleteAll();
    tenantSubscriptionRepository.deleteAll();
    appUserRepository.deleteAll();
    tenantRepository.deleteAll();
  }

  @Test
  void ac01_creditSalesConsumeAvailableLimitImmediately() throws Exception {
    Tenant tenant = persistTenant("cred-ac01", "Cred AC01");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@cred-ac01.local", AppUserRole.pharmacy_owner);
    Cookie cookie = login("owner@cred-ac01.local");
    UUID customerId = createCustomer(cookie, "Khata Buyer", "9301000001");

    mockMvc
        .perform(
            put("/api/v1/customers/" + customerId + "/credit/limit")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"limitPaise\":50000,\"expectedVersion\":0}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.limitPaise").value(50000))
        .andExpect(jsonPath("$.data.availablePaise").value(50000))
        .andExpect(jsonPath("$.data.version").value(1));

    UUID invoiceId = UUID.randomUUID();
    mockMvc
        .perform(
            post("/api/v1/customers/" + customerId + "/credit/charges")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"amountPaise\":12000,\"invoiceId\":\""
                        + invoiceId
                        + "\",\"idempotencyKey\":\"charge-1\",\"expectedVersion\":1}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.balancePaise").value(12000))
        .andExpect(jsonPath("$.data.availablePaise").value(38000))
        .andExpect(jsonPath("$.data.entries[?(@.type=='SALE_CHARGE')]", hasSize(1)))
        .andExpect(
            jsonPath("$.data.entries[?(@.type=='SALE_CHARGE')].invoiceId")
                .value(invoiceId.toString()));

    assertThat(accountRepository.findByTenantIdAndCustomerId(tenant.getId(), customerId))
        .isPresent()
        .get()
        .extracting(a -> a.getBalancePaise())
        .isEqualTo(12000L);
  }

  @Test
  void ac02_settlementRecordsPayoffWithoutEditingInvoices() throws Exception {
    Tenant tenant = persistTenant("cred-ac02", "Cred AC02");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@cred-ac02.local", AppUserRole.pharmacy_owner);
    Cookie cookie = login("owner@cred-ac02.local");
    UUID customerId = createCustomer(cookie, "Settler", "9301000002");
    UUID invoiceId = UUID.randomUUID();

    setLimit(cookie, customerId, 100000, 0);
    charge(cookie, customerId, 40000, invoiceId, "c-settle-1", 1);

    mockMvc
        .perform(
            post("/api/v1/customers/" + customerId + "/credit/settlements")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"amountPaise\":15000,\"mode\":\"CASH\",\"reference\":\"RCP-1\",\"idempotencyKey\":\"settle-1\",\"expectedVersion\":2}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.balancePaise").value(25000))
        .andExpect(jsonPath("$.data.availablePaise").value(75000))
        .andExpect(jsonPath("$.data.entries[?(@.type=='SETTLEMENT')]", hasSize(1)))
        .andExpect(jsonPath("$.data.entries[?(@.type=='SETTLEMENT')].settlementMode").value("CASH"))
        .andExpect(
            jsonPath("$.data.entries[?(@.type=='SETTLEMENT')].settlementReference").value("RCP-1"));

    mockMvc
        .perform(get("/api/v1/customers/" + customerId + "/credit").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(
            jsonPath("$.data.entries[?(@.type=='SALE_CHARGE')].invoiceId")
                .value(invoiceId.toString()));
  }

  @Test
  void ac03_ownerConfiguresLimits() throws Exception {
    Tenant tenant = persistTenant("cred-ac03", "Cred AC03");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@cred-ac03.local", AppUserRole.pharmacy_owner);
    Cookie cookie = login("owner@cred-ac03.local");
    UUID customerId = createCustomer(cookie, "Limit Me", "9301000003");

    mockMvc
        .perform(get("/api/v1/customers/" + customerId + "/credit").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.limitPaise").value(0))
        .andExpect(jsonPath("$.data.balancePaise").value(0))
        .andExpect(jsonPath("$.data.availablePaise").value(0))
        .andExpect(jsonPath("$.data.version").value(0))
        .andExpect(jsonPath("$.data.entries", hasSize(0)));

    mockMvc
        .perform(
            put("/api/v1/customers/" + customerId + "/credit/limit")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"limitPaise\":250000,\"expectedVersion\":0}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.limitPaise").value(250000))
        .andExpect(jsonPath("$.data.entries[?(@.type=='LIMIT_SET')]", hasSize(1)));
  }

  @Test
  void ac04_overLimitChargeFailsAtomically() throws Exception {
    Tenant tenant = persistTenant("cred-over", "Cred Over");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@cred-over.local", AppUserRole.pharmacy_owner);
    Cookie cookie = login("owner@cred-over.local");
    UUID customerId = createCustomer(cookie, "Over", "9301000004");
    setLimit(cookie, customerId, 10000, 0);

    mockMvc
        .perform(
            post("/api/v1/customers/" + customerId + "/credit/charges")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"amountPaise\":10001,\"idempotencyKey\":\"over-1\",\"expectedVersion\":1}"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("CREDIT_LIMIT_EXCEEDED"));

    assertThat(ledgerRepository.count()).isEqualTo(1); // LIMIT_SET only
    assertThat(accountRepository.findByTenantIdAndCustomerId(tenant.getId(), customerId))
        .get()
        .extracting(a -> a.getBalancePaise())
        .isEqualTo(0L);
  }

  @Test
  void ac04_overpaymentSettlementFailsAtomically() throws Exception {
    Tenant tenant = persistTenant("cred-overpay", "Cred Overpay");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@cred-overpay.local", AppUserRole.pharmacy_owner);
    Cookie cookie = login("owner@cred-overpay.local");
    UUID customerId = createCustomer(cookie, "Overpay", "9301000005");
    setLimit(cookie, customerId, 50000, 0);
    charge(cookie, customerId, 10000, null, "c-op-1", 1);

    mockMvc
        .perform(
            post("/api/v1/customers/" + customerId + "/credit/settlements")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"amountPaise\":10001,\"mode\":\"UPI\",\"idempotencyKey\":\"op-1\",\"expectedVersion\":2}"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("OVERPAYMENT"));

    assertThat(accountRepository.findByTenantIdAndCustomerId(tenant.getId(), customerId))
        .get()
        .extracting(a -> a.getBalancePaise())
        .isEqualTo(10000L);
  }

  @Test
  void ac04_replayedSettlementIsIdempotent() throws Exception {
    Tenant tenant = persistTenant("cred-replay", "Cred Replay");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@cred-replay.local", AppUserRole.pharmacy_owner);
    Cookie cookie = login("owner@cred-replay.local");
    UUID customerId = createCustomer(cookie, "Replay", "9301000006");
    setLimit(cookie, customerId, 50000, 0);
    charge(cookie, customerId, 20000, null, "c-rp-1", 1);

    String body =
        "{\"amountPaise\":5000,\"mode\":\"CASH\",\"idempotencyKey\":\"settle-same\",\"expectedVersion\":2}";
    mockMvc
        .perform(
            post("/api/v1/customers/" + customerId + "/credit/settlements")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.balancePaise").value(15000));

    mockMvc
        .perform(
            post("/api/v1/customers/" + customerId + "/credit/settlements")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.balancePaise").value(15000));

    assertThat(
            ledgerRepository.findAll().stream()
                .filter(e -> "settle-same".equals(e.getIdempotencyKey()))
                .count())
        .isEqualTo(1);
  }

  @Test
  void ac04_staleBalanceFails() throws Exception {
    Tenant tenant = persistTenant("cred-stale", "Cred Stale");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@cred-stale.local", AppUserRole.pharmacy_owner);
    Cookie cookie = login("owner@cred-stale.local");
    UUID customerId = createCustomer(cookie, "Stale", "9301000007");
    setLimit(cookie, customerId, 50000, 0);

    mockMvc
        .perform(
            post("/api/v1/customers/" + customerId + "/credit/charges")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"amountPaise\":1000,\"idempotencyKey\":\"stale-1\",\"expectedVersion\":0}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("STALE_STATE"));
  }

  @Test
  void ac04_unauthorizedLimitChangeIsForbidden() throws Exception {
    Tenant tenant = persistTenant("cred-staff", "Cred Staff");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@cred-staff.local", AppUserRole.pharmacy_owner);
    AppUser staff =
        persistUser(tenant.getId(), "staff@cred-staff.local", AppUserRole.pharmacy_staff);
    Cookie owner = login("owner@cred-staff.local");
    UUID crmRole = createRole(owner, "CRM till", "[\"CRM\"]");
    mockMvc
        .perform(
            put("/api/v1/users/" + staff.getId() + "/roles")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleIds\":[\"" + crmRole + "\"]}"))
        .andExpect(status().isOk());

    UUID customerId = createCustomer(owner, "Staff Limit", "9301000008");
    Cookie staffCookie = login("staff@cred-staff.local");

    mockMvc
        .perform(
            put("/api/v1/customers/" + customerId + "/credit/limit")
                .cookie(staffCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"limitPaise\":1000,\"expectedVersion\":0}"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
  }

  @Test
  void ac04_crmDeniedBlocksCredit() throws Exception {
    Tenant tenant = persistTenant("cred-deny", "Cred Deny");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@cred-deny.local", AppUserRole.pharmacy_owner);
    AppUser staff =
        persistUser(tenant.getId(), "staff@cred-deny.local", AppUserRole.pharmacy_staff);
    Cookie owner = login("owner@cred-deny.local");
    UUID salesOnly = createRole(owner, "Sales only", "[\"SALES\"]");
    mockMvc
        .perform(
            put("/api/v1/users/" + staff.getId() + "/roles")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleIds\":[\"" + salesOnly + "\"]}"))
        .andExpect(status().isOk());
    UUID customerId = createCustomer(owner, "Denied", "9301000009");
    Cookie staffCookie = login("staff@cred-deny.local");

    mockMvc
        .perform(get("/api/v1/customers/" + customerId + "/credit").cookie(staffCookie))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
  }

  @Test
  void ac04_crossTenantCreditIsUndisclosed() throws Exception {
    Tenant tenantA = persistTenant("cred-a", "Cred A");
    Tenant tenantB = persistTenant("cred-b", "Cred B");
    persistPlan(tenantA.getId(), PlanCode.FREE);
    persistPlan(tenantB.getId(), PlanCode.FREE);
    persistUser(tenantA.getId(), "owner-a@cred.local", AppUserRole.pharmacy_owner);
    persistUser(tenantB.getId(), "owner-b@cred.local", AppUserRole.pharmacy_owner);
    Cookie ownerA = login("owner-a@cred.local");
    Cookie ownerB = login("owner-b@cred.local");
    UUID customerA = createCustomer(ownerA, "A", "9301000010");
    setLimit(ownerA, customerA, 10000, 0);

    mockMvc
        .perform(get("/api/v1/customers/" + customerA + "/credit").cookie(ownerB))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));

    mockMvc
        .perform(get("/api/v1/customers/credit-accounts").cookie(ownerB))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(0)));
  }

  @Test
  void listOutstandingReturnsBalances() throws Exception {
    Tenant tenant = persistTenant("cred-list", "Cred List");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@cred-list.local", AppUserRole.pharmacy_owner);
    Cookie cookie = login("owner@cred-list.local");
    UUID customerId = createCustomer(cookie, "Due", "9301000011");
    setLimit(cookie, customerId, 50000, 0);
    charge(cookie, customerId, 9000, null, "list-c-1", 1);

    mockMvc
        .perform(get("/api/v1/customers/credit-accounts").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(1)))
        .andExpect(jsonPath("$.data.items[0].customerId").value(customerId.toString()))
        .andExpect(jsonPath("$.data.items[0].balancePaise").value(9000))
        .andExpect(jsonPath("$.data.items[0].availablePaise").value(41000));
  }

  private void setLimit(Cookie cookie, UUID customerId, long limitPaise, long version)
      throws Exception {
    mockMvc
        .perform(
            put("/api/v1/customers/" + customerId + "/credit/limit")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"limitPaise\":" + limitPaise + ",\"expectedVersion\":" + version + "}"))
        .andExpect(status().isOk());
  }

  private void charge(
      Cookie cookie, UUID customerId, long amount, UUID invoiceId, String key, long version)
      throws Exception {
    String invoicePart = invoiceId == null ? "" : ",\"invoiceId\":\"" + invoiceId + "\"";
    mockMvc
        .perform(
            post("/api/v1/customers/" + customerId + "/credit/charges")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"amountPaise\":"
                        + amount
                        + invoicePart
                        + ",\"idempotencyKey\":\""
                        + key
                        + "\",\"expectedVersion\":"
                        + version
                        + "}"))
        .andExpect(status().isOk());
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

  private UUID createCustomer(Cookie cookie, String name, String phone) throws Exception {
    String body =
        mockMvc
            .perform(
                post("/api/v1/customers")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":\"" + name + "\",\"phone\":\"" + phone + "\"}"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return UUID.fromString(objectMapper.readTree(body).path("data").path("id").asText());
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
    Cookie cookie = result.getResponse().getCookie("nmm_access");
    assertThat(cookie).isNotNull();
    return cookie;
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
}
