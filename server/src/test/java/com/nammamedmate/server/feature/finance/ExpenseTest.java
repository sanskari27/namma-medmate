package com.nammamedmate.server.feature.finance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.AbstractIntegrationTest;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.AuditEvent;
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.BranchType;
import com.nammamedmate.server.domain.Expense;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.AuditEventRepository;
import com.nammamedmate.server.persistence.ExpenseRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import jakarta.servlet.http.Cookie;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

class ExpenseTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-06T02:00:00Z");
  private static final LocalDate OCCURRED = LocalDate.of(2026, 9, 1);

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private ExpenseRepository expenseRepository;
  @Autowired private AuditEventRepository auditEventRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @Test
  void ac01_systemCategoriesAndCustomExtensibility() throws Exception {
    Fixture fx = seed("cat");
    JsonNode cats = listCategories(fx.cookie());
    assertThat(cats.path("items").findValuesAsText("code"))
        .containsExactlyInAnyOrder("RENT", "ELECTRICITY", "SALARIES", "MISCELLANEOUS");

    mockMvc
        .perform(
            post("/api/v1/finance/expense-categories")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"code\":\"water_bill\",\"label\":\"Water bill\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.code").value("WATER_BILL"))
        .andExpect(jsonPath("$.data.label").value("Water bill"))
        .andExpect(jsonPath("$.data.system").value(false));

    mockMvc
        .perform(
            post("/api/v1/finance/expense-categories")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"code\":\"RENT\",\"label\":\"Shop rent\"}"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("CATEGORY_TAKEN"));

    UUID rentId = categoryId(cats, "RENT");
    mockMvc
        .perform(
            post("/api/v1/finance/expenses")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(createJson(rentId, 150000, OCCURRED, "September rent", "rent-1")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.categoryCode").value("RENT"))
        .andExpect(jsonPath("$.data.categoryLabel").value("Rent"));
  }

  @Test
  void ac02_amountIsPaiseAndOccurredDateIsRetained() throws Exception {
    Fixture fx = seed("paise");
    UUID rentId = categoryId(listCategories(fx.cookie()), "RENT");
    MvcResult created =
        mockMvc
            .perform(
                post("/api/v1/finance/expenses")
                    .cookie(fx.cookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(createJson(rentId, 250050, OCCURRED, "Bill", "paise-1")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.amountPaise").value(250050))
            .andExpect(jsonPath("$.data.occurredOn").value("2026-09-01"))
            .andReturn();
    UUID id =
        UUID.fromString(
            objectMapper
                .readTree(created.getResponse().getContentAsString())
                .path("data")
                .path("id")
                .asText());
    Expense row = expenseRepository.findByIdAndTenantId(id, fx.tenantId()).orElseThrow();
    assertThat(row.getAmountPaise()).isEqualTo(250050L);
    assertThat(row.getOccurredOn()).isEqualTo(OCCURRED);
  }

  @Test
  void ac03_expensesAreBranchScopedAndOwnerSeesTenantTotals() throws Exception {
    Fixture fx = seed("scope");
    Location annex = persistBranch(fx.tenantId(), "Annex", "BR02", false);
    UUID rentId = categoryId(listCategories(fx.cookie()), "RENT");
    UUID elecId = categoryId(listCategories(fx.cookie()), "ELECTRICITY");

    mockMvc
        .perform(
            post("/api/v1/finance/expenses")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(createJson(rentId, 100000, OCCURRED, "Main rent", "main-rent")))
        .andExpect(status().isOk());

    mockMvc
        .perform(
            post("/api/v1/finance/expenses")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    createJson(elecId, 40000, OCCURRED, "Annex power", "annex-power")
                        .replace("\"branchId\":null", "\"branchId\":\"" + annex.getId() + "\"")))
        .andExpect(status().isOk());

    mockMvc
        .perform(get("/api/v1/finance/expenses").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(1)))
        .andExpect(jsonPath("$.data.items[0].branchId").value(fx.branchId().toString()))
        .andExpect(jsonPath("$.data.items[0].amountPaise").value(100000));

    mockMvc
        .perform(get("/api/v1/finance/expenses").param("branchId", "").cookie(fx.cookie()))
        .andExpect(status().isOk());

    mockMvc
        .perform(get("/api/v1/finance/expenses").param("scope", "tenant").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(2)))
        .andExpect(jsonPath("$.data.items[*].branchId", hasItem(annex.getId().toString())))
        .andExpect(jsonPath("$.data.items[*].branchId", hasItem(fx.branchId().toString())));

    mockMvc
        .perform(
            get("/api/v1/finance/expenses/totals").param("scope", "tenant").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.totalPaise").value(140000))
        .andExpect(jsonPath("$.data.byBranch", hasSize(2)))
        .andExpect(jsonPath("$.data.byCategory", hasSize(2)));

    selectBranch(fx.cookie(), annex.getId());
    mockMvc
        .perform(get("/api/v1/finance/expenses").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(1)))
        .andExpect(jsonPath("$.data.items[0].amountPaise").value(40000));
  }

  @Test
  void ac04_cashierHasNoFinanceAccessAccountantCanRecord() throws Exception {
    Fixture fx = seed("authz");
    AppUser cashier = persistUser(fx.tenantId(), "till@authz.local", AppUserRole.pharmacy_staff);
    UUID salesRole = createRole(fx.cookie(), "Till", "[\"SALES\"]");
    mockMvc.perform(putRoles(cashier.getId(), fx.cookie(), salesRole)).andExpect(status().isOk());
    assignBranch(fx.cookie(), cashier.getId(), fx.branchId());
    Cookie till = login("till@authz.local");
    selectBranch(till, fx.branchId());

    mockMvc
        .perform(get("/api/v1/finance/expenses").cookie(till))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    mockMvc
        .perform(
            post("/api/v1/finance/expenses")
                .cookie(till)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    createJson(
                        categoryId(listCategories(fx.cookie()), "RENT"),
                        1000,
                        OCCURRED,
                        "no",
                        "till-no")))
        .andExpect(status().isForbidden());

    AppUser books = persistUser(fx.tenantId(), "books@authz.local", AppUserRole.pharmacy_staff);
    assignAccountant(fx.cookie(), books.getId());
    assignBranch(fx.cookie(), books.getId(), fx.branchId());
    Cookie accountant = login("books@authz.local");
    selectBranch(accountant, fx.branchId());
    mockMvc
        .perform(get("/api/v1/finance/expenses").cookie(accountant))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true));
  }

  @Test
  void ac05_validationIsolationIdempotencyAndStaleState() throws Exception {
    Fixture fx = seed("iso");
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

    mockMvc
        .perform(
            post("/api/v1/finance/expenses")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(createJson(rentId, 0, OCCURRED, "zero", "zero-1")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("INVALID_AMOUNT"));

    mockMvc
        .perform(
            post("/api/v1/finance/expenses")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(createJson(rentId, 1000, LocalDate.of(2099, 1, 1), "future", "fut-1")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("INVALID_DATE"));

    mockMvc
        .perform(
            post("/api/v1/finance/expenses")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(createJson(UUID.randomUUID(), 1000, OCCURRED, "bad cat", "badcat")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("INVALID_CATEGORY"));

    MvcResult first =
        mockMvc
            .perform(
                post("/api/v1/finance/expenses")
                    .cookie(fx.cookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(createJson(rentId, 8800, OCCURRED, "replay", "idem-1")))
            .andExpect(status().isOk())
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
                .content(createJson(rentId, 8800, OCCURRED, "replay", "idem-1")))
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
                        + "\",\"amountPaise\":8800,\"occurredOn\":\"2026-09-01\",\"notes\":\"stale\"}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("STALE_STATE"));

    mockMvc
        .perform(
            patch("/api/v1/finance/expenses/" + firstId)
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"expectedVersion\":1,\"categoryId\":\""
                        + rentId
                        + "\",\"amountPaise\":9900,\"occurredOn\":\"2026-09-01\",\"notes\":\"corrected\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.amountPaise").value(9900))
        .andExpect(jsonPath("$.data.version").value(2));

    mockMvc
        .perform(
            multipart("/api/v1/finance/expenses/" + firstId + "/evidence")
                .file(
                    new MockMultipartFile(
                        "evidence",
                        "receipt.pdf",
                        "application/pdf",
                        "%PDF-1.4".getBytes(StandardCharsets.UTF_8)))
                .cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.currentEvidenceId").isNotEmpty());

    Tenant other = persistTenant("other-exp", "Other Exp");
    persistPlan(other.getId(), PlanCode.FREE);
    persistUser(other.getId(), "owner@other-exp.local", AppUserRole.pharmacy_owner);
    Location otherBranch = persistBranch(other.getId(), "Other", "BR01", true);
    Cookie otherCookie = login("owner@other-exp.local");
    selectBranch(otherCookie, otherBranch.getId());
    mockMvc
        .perform(get("/api/v1/finance/expenses/" + firstId).cookie(otherCookie))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    mockMvc
        .perform(get("/api/v1/finance/expenses").cookie(otherCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items[*].id", not(hasItem(firstId))));

    Location annex = persistBranch(fx.tenantId(), "Annex", "BR02", false);
    AppUser books = persistUser(fx.tenantId(), "books@iso.local", AppUserRole.pharmacy_staff);
    assignAccountant(fx.cookie(), books.getId());
    assignBranch(fx.cookie(), books.getId(), fx.branchId());
    Cookie accountant = login("books@iso.local");
    selectBranch(accountant, fx.branchId());
    mockMvc
        .perform(
            get("/api/v1/finance/expenses")
                .param("branchId", annex.getId().toString())
                .cookie(accountant))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));

    List<AuditEvent> audits = auditEventRepository.findAll();
    assertThat(audits)
        .extracting(AuditEvent::getAction)
        .contains("EXPENSE_CREATE", "EXPENSE_UPDATE");
    assertThat(audits.stream().filter(event -> event.getAction().startsWith("EXPENSE")))
        .isNotEmpty()
        .allSatisfy(
            event -> {
              assertThat(event.getContextJson()).contains("expenseId");
              assertThat(event.getContextJson()).doesNotContain("corrected");
            });
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
    Tenant tenant = persistTenant(tag, "Exp " + tag);
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@" + tag + ".local", AppUserRole.pharmacy_owner);
    Location branch = persistBranch(tenant.getId(), "Main", "BR01", true);
    Cookie cookie = login("owner@" + tag + ".local");
    selectBranch(cookie, branch.getId());
    return new Fixture(tenant.getId(), branch.getId(), cookie);
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

  private record Fixture(UUID tenantId, UUID branchId, Cookie cookie) {}
}
