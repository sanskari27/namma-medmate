package com.nammamedmate.server.feature.customerfamily;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.AbstractIntegrationTest;
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
import com.nammamedmate.server.persistence.CustomerFamilyMemberRepository;
import com.nammamedmate.server.persistence.CustomerFamilyRepository;
import com.nammamedmate.server.persistence.CustomerRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import com.nammamedmate.server.persistence.UserAccessRoleRepository;
import com.nammamedmate.server.persistence.UserSessionRepository;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

class CustomerFamilyCreditTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-04T07:00:00Z");

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private UserSessionRepository userSessionRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private CustomerRepository customerRepository;
  @Autowired private CustomerFamilyRepository customerFamilyRepository;
  @Autowired private CustomerFamilyMemberRepository customerFamilyMemberRepository;
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
    customerFamilyMemberRepository.deleteAll();
    customerFamilyRepository.deleteAll();
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
  void ac01_individualLimitsOwnLedgerConsumption() throws Exception {
    Tenant tenant = persistTenant("fc-ac01", "Fam Cred AC01");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@fc-ac01.local", AppUserRole.pharmacy_owner);
    Cookie cookie = login("owner@fc-ac01.local");

    UUID memberA = createCustomer(cookie, "Parent A", "9401000001");
    UUID memberB = createCustomer(cookie, "Child B", "9401000002");
    UUID familyId = createFamily(cookie, memberA, memberB);

    setLimit(cookie, memberA, 10000, 0);
    setLimit(cookie, memberB, 50000, 0);

    UUID invoiceA = UUID.randomUUID();
    charge(cookie, memberA, 8000, invoiceA, "fc-a-charge", 1);

    mockMvc
        .perform(
            post("/api/v1/customers/" + memberA + "/credit/charges")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"amountPaise\":3000,\"idempotencyKey\":\"fc-a-over\",\"expectedVersion\":2}"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("CREDIT_LIMIT_EXCEEDED"));

    mockMvc
        .perform(get("/api/v1/customers/" + memberA + "/credit").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.balancePaise").value(8000))
        .andExpect(jsonPath("$.data.availablePaise").value(2000));

    mockMvc
        .perform(get("/api/v1/customers/" + memberB + "/credit").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.balancePaise").value(0))
        .andExpect(jsonPath("$.data.availablePaise").value(50000));

    mockMvc
        .perform(
            post("/api/v1/customers/" + memberA + "/credit/settlements")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"amountPaise\":3000,\"mode\":\"CASH\",\"idempotencyKey\":\"fc-a-settle\","
                        + "\"expectedVersion\":2}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.balancePaise").value(5000));

    mockMvc
        .perform(get("/api/v1/customers/" + memberB + "/credit").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.balancePaise").value(0));

    assertThat(accountRepository.findByTenantIdAndCustomerId(tenant.getId(), memberA))
        .get()
        .extracting(a -> a.getBalancePaise())
        .isEqualTo(5000L);
    assertThat(accountRepository.findByTenantIdAndCustomerId(tenant.getId(), memberB))
        .get()
        .extracting(a -> a.getBalancePaise())
        .isEqualTo(0L);
    assertThat(familyId).isNotNull();
  }

  @Test
  void ac02_familyCreditVisibilityAggregatesAttributedLedger() throws Exception {
    Tenant tenant = persistTenant("fc-ac02", "Fam Cred AC02");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@fc-ac02.local", AppUserRole.pharmacy_owner);
    Cookie cookie = login("owner@fc-ac02.local");

    UUID memberA = createCustomer(cookie, "Parent A", "9401000011");
    UUID memberB = createCustomer(cookie, "Child B", "9401000012");
    UUID familyId = createFamily(cookie, memberA, memberB);

    setLimit(cookie, memberA, 20000, 0);
    setLimit(cookie, memberB, 30000, 0);
    UUID invoiceA = UUID.randomUUID();
    UUID invoiceB = UUID.randomUUID();
    charge(cookie, memberA, 7000, invoiceA, "fc-vis-a", 1);
    charge(cookie, memberB, 4000, invoiceB, "fc-vis-b", 1);
    settle(cookie, memberA, 2000, "CASH", "slip-a", "fc-vis-settle-a", 2);

    mockMvc
        .perform(get("/api/v1/customer-families/" + familyId + "/credit").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.familyId").value(familyId.toString()))
        .andExpect(jsonPath("$.data.totalLimitPaise").value(50000))
        .andExpect(jsonPath("$.data.totalBalancePaise").value(9000))
        .andExpect(jsonPath("$.data.totalAvailablePaise").value(41000))
        .andExpect(jsonPath("$.data.members", hasSize(2)))
        .andExpect(
            jsonPath("$.data.members[?(@.customerId=='" + memberA + "')].balancePaise")
                .value(org.hamcrest.Matchers.contains(5000)))
        .andExpect(
            jsonPath("$.data.members[?(@.customerId=='" + memberB + "')].balancePaise")
                .value(org.hamcrest.Matchers.contains(4000)))
        .andExpect(
            jsonPath("$.data.members[?(@.customerId=='" + memberA + "')].customerName")
                .value(org.hamcrest.Matchers.contains("Parent A")))
        .andExpect(
            jsonPath("$.data.entries", hasSize(org.hamcrest.Matchers.greaterThanOrEqualTo(4))))
        .andExpect(
            jsonPath(
                    "$.data.entries[?(@.type=='SALE_CHARGE' && @.customerId=='"
                        + memberA
                        + "')].invoiceId")
                .value(org.hamcrest.Matchers.contains(invoiceA.toString())))
        .andExpect(
            jsonPath(
                    "$.data.entries[?(@.type=='SALE_CHARGE' && @.customerId=='"
                        + memberB
                        + "')].invoiceId")
                .value(org.hamcrest.Matchers.contains(invoiceB.toString())))
        .andExpect(
            jsonPath(
                    "$.data.entries[?(@.type=='SETTLEMENT' && @.customerId=='"
                        + memberA
                        + "')].settlementReference")
                .value(org.hamcrest.Matchers.contains("slip-a")));
  }

  @Test
  void ac02_membersWithoutAccountsAppearWithZeroBalances() throws Exception {
    Tenant tenant = persistTenant("fc-empty", "Fam Cred Empty");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@fc-empty.local", AppUserRole.pharmacy_owner);
    Cookie cookie = login("owner@fc-empty.local");

    UUID memberA = createCustomer(cookie, "A", "9401000021");
    UUID memberB = createCustomer(cookie, "B", "9401000022");
    UUID familyId = createFamily(cookie, memberA, memberB);

    mockMvc
        .perform(get("/api/v1/customer-families/" + familyId + "/credit").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.totalLimitPaise").value(0))
        .andExpect(jsonPath("$.data.totalBalancePaise").value(0))
        .andExpect(jsonPath("$.data.totalAvailablePaise").value(0))
        .andExpect(jsonPath("$.data.members", hasSize(2)))
        .andExpect(jsonPath("$.data.entries", hasSize(0)));
  }

  @Test
  void ac03_concurrentChargesOnDifferentMembersRespectIndividualLimits() throws Exception {
    Tenant tenant = persistTenant("fc-ac03", "Fam Cred AC03");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@fc-ac03.local", AppUserRole.pharmacy_owner);
    Cookie cookie = login("owner@fc-ac03.local");

    UUID memberA = createCustomer(cookie, "Parent A", "9401000031");
    UUID memberB = createCustomer(cookie, "Child B", "9401000032");
    createFamily(cookie, memberA, memberB);
    setLimit(cookie, memberA, 10000, 0);
    setLimit(cookie, memberB, 10000, 0);

    ExecutorService pool = Executors.newFixedThreadPool(2);
    CountDownLatch start = new CountDownLatch(1);
    List<Future<Integer>> futures = new ArrayList<>();
    futures.add(
        pool.submit(
            () -> {
              start.await(5, TimeUnit.SECONDS);
              return chargeStatus(cookie, memberA, 6000, "fc-conc-a", 1);
            }));
    futures.add(
        pool.submit(
            () -> {
              start.await(5, TimeUnit.SECONDS);
              return chargeStatus(cookie, memberB, 7000, "fc-conc-b", 1);
            }));
    start.countDown();
    List<Integer> statuses = new ArrayList<>();
    for (Future<Integer> future : futures) {
      statuses.add(future.get(15, TimeUnit.SECONDS));
    }
    pool.shutdown();

    assertThat(statuses).containsExactlyInAnyOrder(200, 200);
    assertThat(accountRepository.findByTenantIdAndCustomerId(tenant.getId(), memberA))
        .get()
        .extracting(a -> a.getBalancePaise())
        .isEqualTo(6000L);
    assertThat(accountRepository.findByTenantIdAndCustomerId(tenant.getId(), memberB))
        .get()
        .extracting(a -> a.getBalancePaise())
        .isEqualTo(7000L);
  }

  @Test
  void ac03_concurrentOverLimitOnOneMemberDoesNotBorrowSiblingCapacity() throws Exception {
    Tenant tenant = persistTenant("fc-ac03b", "Fam Cred AC03b");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@fc-ac03b.local", AppUserRole.pharmacy_owner);
    Cookie cookie = login("owner@fc-ac03b.local");

    UUID memberA = createCustomer(cookie, "Parent A", "9401000041");
    UUID memberB = createCustomer(cookie, "Child B", "9401000042");
    createFamily(cookie, memberA, memberB);
    setLimit(cookie, memberA, 5000, 0);
    setLimit(cookie, memberB, 50000, 0);

    ExecutorService pool = Executors.newFixedThreadPool(2);
    CountDownLatch start = new CountDownLatch(1);
    Future<Integer> overA =
        pool.submit(
            () -> {
              start.await(5, TimeUnit.SECONDS);
              return chargeStatus(cookie, memberA, 6000, "fc-over-a", 1);
            });
    Future<Integer> okB =
        pool.submit(
            () -> {
              start.await(5, TimeUnit.SECONDS);
              return chargeStatus(cookie, memberB, 10000, "fc-ok-b", 1);
            });
    start.countDown();
    int statusA = overA.get(15, TimeUnit.SECONDS);
    int statusB = okB.get(15, TimeUnit.SECONDS);
    pool.shutdown();

    assertThat(statusA).isEqualTo(422);
    assertThat(statusB).isEqualTo(200);
    assertThat(accountRepository.findByTenantIdAndCustomerId(tenant.getId(), memberA))
        .get()
        .extracting(a -> a.getBalancePaise())
        .isEqualTo(0L);
    assertThat(accountRepository.findByTenantIdAndCustomerId(tenant.getId(), memberB))
        .get()
        .extracting(a -> a.getBalancePaise())
        .isEqualTo(10000L);
  }

  @Test
  void ac02_crmDeniedBlocksFamilyCredit() throws Exception {
    Tenant tenant = persistTenant("fc-deny", "Fam Cred Deny");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@fc-deny.local", AppUserRole.pharmacy_owner);
    AppUser staff = persistUser(tenant.getId(), "staff@fc-deny.local", AppUserRole.pharmacy_staff);
    Cookie owner = login("owner@fc-deny.local");

    UUID memberA = createCustomer(owner, "A", "9401000051");
    UUID memberB = createCustomer(owner, "B", "9401000052");
    UUID familyId = createFamily(owner, memberA, memberB);

    UUID salesOnly = createRole(owner, "Sales only", "[\"SALES\"]");
    mockMvc
        .perform(
            put("/api/v1/users/" + staff.getId() + "/roles")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleIds\":[\"" + salesOnly + "\"]}"))
        .andExpect(status().isOk());
    Cookie staffCookie = login("staff@fc-deny.local");

    mockMvc
        .perform(get("/api/v1/customer-families/" + familyId + "/credit").cookie(staffCookie))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
  }

  @Test
  void ac02_crossTenantFamilyCreditIsUndisclosed() throws Exception {
    Tenant tenantA = persistTenant("fc-ta", "Fam Cred TA");
    Tenant tenantB = persistTenant("fc-tb", "Fam Cred TB");
    persistPlan(tenantA.getId(), PlanCode.FREE);
    persistPlan(tenantB.getId(), PlanCode.FREE);
    persistUser(tenantA.getId(), "owner-a@fc.local", AppUserRole.pharmacy_owner);
    persistUser(tenantB.getId(), "owner-b@fc.local", AppUserRole.pharmacy_owner);
    Cookie ownerA = login("owner-a@fc.local");
    Cookie ownerB = login("owner-b@fc.local");

    UUID memberA = createCustomer(ownerA, "A", "9401000061");
    UUID memberB = createCustomer(ownerA, "B", "9401000062");
    UUID familyId = createFamily(ownerA, memberA, memberB);

    mockMvc
        .perform(get("/api/v1/customer-families/" + familyId + "/credit").cookie(ownerB))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
  }

  private int chargeStatus(Cookie cookie, UUID customerId, long amount, String key, long version)
      throws Exception {
    return mockMvc
        .perform(
            post("/api/v1/customers/" + customerId + "/credit/charges")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"amountPaise\":"
                        + amount
                        + ",\"idempotencyKey\":\""
                        + key
                        + "\",\"expectedVersion\":"
                        + version
                        + "}"))
        .andReturn()
        .getResponse()
        .getStatus();
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

  private void settle(
      Cookie cookie,
      UUID customerId,
      long amount,
      String mode,
      String reference,
      String key,
      long version)
      throws Exception {
    mockMvc
        .perform(
            post("/api/v1/customers/" + customerId + "/credit/settlements")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"amountPaise\":"
                        + amount
                        + ",\"mode\":\""
                        + mode
                        + "\",\"reference\":\""
                        + reference
                        + "\",\"idempotencyKey\":\""
                        + key
                        + "\",\"expectedVersion\":"
                        + version
                        + "}"))
        .andExpect(status().isOk());
  }

  private UUID createFamily(Cookie cookie, UUID memberA, UUID memberB) throws Exception {
    String body =
        mockMvc
            .perform(
                post("/api/v1/customer-families")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"memberIds\":[\"" + memberA + "\",\"" + memberB + "\"]}"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return UUID.fromString(objectMapper.readTree(body).path("data").path("id").asText());
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
