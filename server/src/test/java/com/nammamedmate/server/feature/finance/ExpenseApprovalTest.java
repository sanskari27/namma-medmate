package com.nammamedmate.server.feature.finance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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
import com.nammamedmate.server.domain.Expense;
import com.nammamedmate.server.domain.ExpenseCategory;
import com.nammamedmate.server.domain.ExpensePostingStatus;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.ApprovalDecisionRepository;
import com.nammamedmate.server.persistence.ApprovalRequestRepository;
import com.nammamedmate.server.persistence.ApprovalRuleRepository;
import com.nammamedmate.server.persistence.AuditEventRepository;
import com.nammamedmate.server.persistence.ExpenseCategoryRepository;
import com.nammamedmate.server.persistence.ExpenseRepository;
import com.nammamedmate.server.persistence.LocationRepository;
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

class ExpenseApprovalTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-06T03:00:00Z");
  private static final LocalDate OCCURRED = LocalDate.of(2026, 9, 1);

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private ExpenseRepository expenseRepository;
  @Autowired private ExpenseCategoryRepository expenseCategoryRepository;
  @Autowired private ApprovalRequestRepository approvalRequestRepository;
  @Autowired private ApprovalRuleRepository approvalRuleRepository;
  @Autowired private ApprovalDecisionRepository approvalDecisionRepository;
  @Autowired private AuditEventRepository auditEventRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @Test
  void ac01_ownerAndAccountantPostImmediatelyWithoutApproval() throws Exception {
    Fixture fx = seed("post-now");
    UUID rentId = categoryId(listCategories(fx.cookie()), "RENT");

    MvcResult created =
        mockMvc
            .perform(
                post("/api/v1/finance/expenses")
                    .cookie(fx.cookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(createJson(rentId, 9_999_999, OCCURRED, "shop rent", "big-1")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.status").value("POSTED"))
            .andExpect(jsonPath("$.data.amountPaise").value(9_999_999))
            .andReturn();
    String postedId =
        objectMapper
            .readTree(created.getResponse().getContentAsString())
            .path("data")
            .path("id")
            .asText();
    assertThat(approvalRequestRepository.findAll()).isEmpty();
    assertThat(approvalRuleRepository.findAll()).isEmpty();

    mockMvc
        .perform(get("/api/v1/approvals/actions").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.actions[*].actionKey", not(hasItem("FINANCE_EXPENSE"))))
        .andExpect(jsonPath("$.data.actions[*].actionKey", not(hasItem("EXPENSE"))))
        .andExpect(jsonPath("$.data.actions[*].moduleCode", not(hasItem("FINANCE"))));

    mockMvc
        .perform(
            post("/api/v1/approvals/rules")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "moduleCode":"FINANCE",
                      "actionKey":"SALES_DISCOUNT_PERCENT",
                      "thresholdValue":1,
                      "approverType":"ACCOUNT_CLASS",
                      "approverAccountClass":"pharmacy_owner",
                      "allowSelfApproval":false
                    }
                    """))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("APPROVAL_NOT_REQUIRED"));
    assertThat(approvalRuleRepository.findAll()).isEmpty();

    mockMvc
        .perform(
            post("/api/v1/approvals/requests")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "moduleCode":"FINANCE",
                      "actionKey":"SALES_DISCOUNT_PERCENT",
                      "branchId":"%s",
                      "amountValue":9999999,
                      "contextJson":"{}",
                      "idempotencyKey":"exp-req-1"
                    }
                    """
                        .formatted(fx.branchId())))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("APPROVAL_NOT_REQUIRED"));
    assertThat(approvalRequestRepository.findAll()).isEmpty();

    AppUser books = persistUser(fx.tenantId(), "books@post-now.local", AppUserRole.pharmacy_staff);
    UUID finRole = createRole(fx.cookie(), "Books", "[\"FINANCE\"]");
    mockMvc.perform(putRoles(books.getId(), fx.cookie(), finRole)).andExpect(status().isOk());
    assignBranch(fx.cookie(), books.getId(), fx.branchId());
    Cookie accountant = login("books@post-now.local");
    selectBranch(accountant, fx.branchId());
    mockMvc
        .perform(
            post("/api/v1/finance/expenses")
                .cookie(accountant)
                .contentType(MediaType.APPLICATION_JSON)
                .content(createJson(rentId, 2500, OCCURRED, "power", "acc-1")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("POSTED"));
    assertThat(approvalRequestRepository.findAll()).isEmpty();

    mockMvc
        .perform(
            patch("/api/v1/finance/expenses/" + postedId)
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"expectedVersion\":1,\"categoryId\":\""
                        + rentId
                        + "\",\"amountPaise\":8800,\"occurredOn\":\"2026-09-01\",\"notes\":\"corrected\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("POSTED"))
        .andExpect(jsonPath("$.data.amountPaise").value(8800));
  }

  @Test
  void ac02_pendingSpendDoesNotAffectPostedTotals() throws Exception {
    Fixture fx = seed("pending-out");
    UUID rentId = categoryId(listCategories(fx.cookie()), "RENT");
    mockMvc
        .perform(
            post("/api/v1/finance/expenses")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(createJson(rentId, 150000, OCCURRED, "on books", "posted-1")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("POSTED"));

    persistPending(fx, rentId, 777000);

    mockMvc
        .perform(get("/api/v1/finance/expenses/totals").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.totalPaise").value(150000));
    mockMvc
        .perform(get("/api/v1/finance/expenses").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items.length()").value(1))
        .andExpect(jsonPath("$.data.items[0].status").value("POSTED"));
    mockMvc
        .perform(get("/api/v1/finance/expenses").param("status", "PENDING").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items.length()").value(1))
        .andExpect(jsonPath("$.data.items[0].status").value("PENDING"));
    mockMvc
        .perform(get("/api/v1/finance/expenses").param("status", "REJECTED").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items.length()").value(0));
  }

  @Test
  void ac03_postingHistoryIsAppendOnly() throws Exception {
    Fixture fx = seed("audit-exp");
    UUID rentId = categoryId(listCategories(fx.cookie()), "RENT");
    MvcResult created =
        mockMvc
            .perform(
                post("/api/v1/finance/expenses")
                    .cookie(fx.cookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(createJson(rentId, 4100, OCCURRED, "first", "hist-1")))
            .andExpect(status().isOk())
            .andReturn();
    String id =
        objectMapper
            .readTree(created.getResponse().getContentAsString())
            .path("data")
            .path("id")
            .asText();

    mockMvc
        .perform(get("/api/v1/audit").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.events[*].action", hasItem("EXPENSE_CREATE")));

    mockMvc
        .perform(
            patch("/api/v1/finance/expenses/" + id)
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"expectedVersion\":1,\"categoryId\":\""
                        + rentId
                        + "\",\"amountPaise\":4200,\"occurredOn\":\"2026-09-01\",\"notes\":\"fix\"}"))
        .andExpect(status().isOk());

    String auditBody =
        mockMvc
            .perform(get("/api/v1/audit").cookie(fx.cookie()))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    JsonNode events = objectMapper.readTree(auditBody).path("data").path("events");
    assertThat(events.findValuesAsText("action")).contains("EXPENSE_CREATE", "EXPENSE_UPDATE");
    long createCount =
        events.findValuesAsText("action").stream().filter("EXPENSE_CREATE"::equals).count();
    assertThat(createCount).isEqualTo(1);
    assertThat(approvalDecisionRepository.findAll()).isEmpty();

    mockMvc
        .perform(patch("/api/v1/audit").cookie(fx.cookie()))
        .andExpect(status().isMethodNotAllowed());
  }

  @Test
  void ac04_financeModuleAndTenantScopeRequired() throws Exception {
    Fixture fx = seed("scope-exp");
    UUID rentId = categoryId(listCategories(fx.cookie()), "RENT");
    MvcResult created =
        mockMvc
            .perform(
                post("/api/v1/finance/expenses")
                    .cookie(fx.cookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(createJson(rentId, 1000, OCCURRED, "own", "scope-1")))
            .andExpect(status().isOk())
            .andReturn();
    String expenseId =
        objectMapper
            .readTree(created.getResponse().getContentAsString())
            .path("data")
            .path("id")
            .asText();

    AppUser cashier =
        persistUser(fx.tenantId(), "till@scope-exp.local", AppUserRole.pharmacy_staff);
    UUID salesRole = createRole(fx.cookie(), "Till", "[\"SALES\"]");
    mockMvc.perform(putRoles(cashier.getId(), fx.cookie(), salesRole)).andExpect(status().isOk());
    assignBranch(fx.cookie(), cashier.getId(), fx.branchId());
    Cookie till = login("till@scope-exp.local");
    selectBranch(till, fx.branchId());
    mockMvc
        .perform(get("/api/v1/finance/expenses").cookie(till))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));

    Tenant other = persistTenant("other-post", "Other Post");
    persistPlan(other.getId(), PlanCode.FREE);
    persistUser(other.getId(), "owner@other-post.local", AppUserRole.pharmacy_owner);
    Location otherBranch = persistBranch(other.getId(), "Other", "BR01", true);
    Cookie otherCookie = login("owner@other-post.local");
    selectBranch(otherCookie, otherBranch.getId());
    mockMvc
        .perform(get("/api/v1/finance/expenses/" + expenseId).cookie(otherCookie))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));

    Location annex = persistBranch(fx.tenantId(), "Annex", "BR02", false);
    AppUser books = persistUser(fx.tenantId(), "books@scope-exp.local", AppUserRole.pharmacy_staff);
    UUID finRole = createRole(fx.cookie(), "Books", "[\"FINANCE\"]");
    mockMvc.perform(putRoles(books.getId(), fx.cookie(), finRole)).andExpect(status().isOk());
    assignBranch(fx.cookie(), books.getId(), fx.branchId());
    Cookie accountant = login("books@scope-exp.local");
    selectBranch(accountant, fx.branchId());
    mockMvc
        .perform(
            get("/api/v1/finance/expenses")
                .param("branchId", annex.getId().toString())
                .cookie(accountant))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
  }

  @Test
  void ac05_invalidDuplicateStaleAndUnauthFailWithoutPosting() throws Exception {
    Fixture fx = seed("fail-exp");
    UUID rentId = categoryId(listCategories(fx.cookie()), "RENT");

    mockMvc.perform(get("/api/v1/finance/expenses")).andExpect(status().isUnauthorized());

    mockMvc
        .perform(
            post("/api/v1/finance/expenses")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    assertThat(expenseRepository.findAll()).isEmpty();

    mockMvc
        .perform(
            post("/api/v1/finance/expenses")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(createJson(rentId, 0, OCCURRED, "zero", "zero-a")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("INVALID_AMOUNT"));
    assertThat(expenseRepository.findAll()).isEmpty();
    assertThat(approvalRequestRepository.findAll()).isEmpty();

    MvcResult first =
        mockMvc
            .perform(
                post("/api/v1/finance/expenses")
                    .cookie(fx.cookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(createJson(rentId, 3300, OCCURRED, "self post", "idem-a")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("POSTED"))
            .andReturn();
    String firstId =
        objectMapper
            .readTree(first.getResponse().getContentAsString())
            .path("data")
            .path("id")
            .asText();
    mockMvc
        .perform(
            post("/api/v1/finance/expenses")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(createJson(rentId, 3300, OCCURRED, "self post", "idem-a")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.id").value(firstId));
    assertThat(expenseRepository.findAll()).hasSize(1);

    mockMvc
        .perform(
            patch("/api/v1/finance/expenses/" + firstId)
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"expectedVersion\":99,\"categoryId\":\""
                        + rentId
                        + "\",\"amountPaise\":3300,\"occurredOn\":\"2026-09-01\",\"notes\":\"stale\"}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("STALE_STATE"));
    assertThat(expenseRepository.findById(UUID.fromString(firstId)).orElseThrow().getAmountPaise())
        .isEqualTo(3300);
  }

  private void persistPending(Fixture fx, UUID categoryId, long amountPaise) {
    ExpenseCategory category = expenseCategoryRepository.findById(categoryId).orElseThrow();
    AppUser owner =
        appUserRepository
            .findByEmailAndDeletedAtIsNull("owner@" + fx.tag() + ".local")
            .orElseThrow();
    Instant now = T0;
    Expense row = new Expense();
    row.setId(UUID.randomUUID());
    row.setTenantId(fx.tenantId());
    row.setBranchId(fx.branchId());
    row.setCategoryId(category.getId());
    row.setCategoryCode(category.getCode());
    row.setCategoryLabel(category.getLabel());
    row.setAmountPaise(amountPaise);
    row.setOccurredOn(OCCURRED);
    row.setStatus(ExpensePostingStatus.PENDING);
    row.setVersion(1);
    row.setCreatedBy(owner.getId());
    row.setCreatedAt(now);
    row.setUpdatedAt(now);
    expenseRepository.saveAndFlush(row);
  }

  private JsonNode listCategories(Cookie cookie) throws Exception {
    String body =
        mockMvc
            .perform(get("/api/v1/finance/expense-categories").cookie(cookie))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return objectMapper.readTree(body).path("data");
  }

  private UUID categoryId(JsonNode data, String code) {
    for (JsonNode item : data.path("items")) {
      if (code.equals(item.path("code").asText())) {
        return UUID.fromString(item.path("id").asText());
      }
    }
    throw new IllegalStateException("missing category " + code);
  }

  private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder putRoles(
      UUID userId, Cookie owner, UUID roleId) {
    return org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(
            "/api/v1/users/" + userId + "/roles")
        .cookie(owner)
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"roleIds\":[\"" + roleId + "\"]}");
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
    Tenant tenant = persistTenant(tag, "Exp " + tag);
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@" + tag + ".local", AppUserRole.pharmacy_owner);
    Location branch = persistBranch(tenant.getId(), "Main", "BR01", true);
    Cookie cookie = login("owner@" + tag + ".local");
    selectBranch(cookie, branch.getId());
    return new Fixture(tag, tenant.getId(), branch.getId(), cookie);
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

  private static String createJson(
      UUID categoryId, long amountPaise, LocalDate occurredOn, String notes, String key) {
    return """
        {
          "categoryId":"%s",
          "amountPaise":%d,
          "occurredOn":"%s",
          "notes":"%s",
          "branchId":null,
          "idempotencyKey":"%s"
        }
        """
        .formatted(categoryId, amountPaise, occurredOn, notes, key);
  }

  private record Fixture(String tag, UUID tenantId, UUID branchId, Cookie cookie) {}
}
