package com.nammamedmate.server.feature.finance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.ApprovalRequestRepository;
import com.nammamedmate.server.persistence.ApprovalRuleRepository;
import com.nammamedmate.server.persistence.AuditEventRepository;
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

class ExpenseApprovalRollbackTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-06T03:15:00Z");

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private ExpenseRepository expenseRepository;
  @Autowired private ApprovalRequestRepository approvalRequestRepository;
  @Autowired private ApprovalRuleRepository approvalRuleRepository;
  @Autowired private AuditEventRepository auditEventRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @Test
  void invalidCreateLeavesNoExpenseApprovalOrPostingAudit() throws Exception {
    Cookie cookie = seed("roll-appr");

    mockMvc
        .perform(
            post("/api/v1/finance/expenses")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isBadRequest());
    assertThat(expenseRepository.count()).isZero();
    assertThat(approvalRequestRepository.count()).isZero();
    assertThat(
            auditEventRepository.findAll().stream()
                .map(AuditEvent::getAction)
                .filter("EXPENSE_CREATE"::equals))
        .isEmpty();

    UUID rentId = categoryId(cookie, "RENT");
    mockMvc
        .perform(
            post("/api/v1/finance/expenses")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "categoryId":"%s",
                      "amountPaise":0,
                      "occurredOn":"2026-09-01",
                      "notes":"no",
                      "idempotencyKey":"roll-zero-a"
                    }
                    """
                        .formatted(rentId)))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("INVALID_AMOUNT"));
    assertThat(expenseRepository.count()).isZero();
    assertThat(approvalRequestRepository.count()).isZero();
  }

  @Test
  void financeApprovalAttemptLeavesNoRuleOrRequest() throws Exception {
    Cookie cookie = seed("roll-fin");
    mockMvc
        .perform(
            post("/api/v1/approvals/rules")
                .cookie(cookie)
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
    assertThat(approvalRuleRepository.count()).isZero();
    assertThat(approvalRequestRepository.count()).isZero();
  }

  private UUID categoryId(Cookie cookie, String code) throws Exception {
    String body =
        mockMvc
            .perform(get("/api/v1/finance/expense-categories").cookie(cookie))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    JsonNode items = objectMapper.readTree(body).path("data").path("items");
    for (JsonNode item : items) {
      if (code.equals(item.path("code").asText())) {
        return UUID.fromString(item.path("id").asText());
      }
    }
    throw new IllegalStateException("missing " + code);
  }

  private Cookie seed(String tag) throws Exception {
    Tenant tenant = new Tenant();
    tenant.setId(UUID.randomUUID());
    tenant.setSlug(tag);
    tenant.setName("Roll " + tag);
    tenant.setStatus(TenantStatus.ACTIVE);
    tenant.setEmailVerifiedAt(T0);
    tenant.setCreatedAt(T0);
    tenant.setUpdatedAt(T0);
    tenantRepository.saveAndFlush(tenant);

    TenantSubscription subscription = new TenantSubscription();
    subscription.setId(UUID.randomUUID());
    subscription.setTenantId(tenant.getId());
    subscription.setPlanCode(PlanCode.FREE);
    subscription.setStatus(SubscriptionStatus.ACTIVE);
    subscription.setStartedAt(T0);
    subscription.setCreatedAt(T0);
    subscription.setUpdatedAt(T0);
    tenantSubscriptionRepository.saveAndFlush(subscription);

    AppUser owner = new AppUser();
    owner.setId(UUID.randomUUID());
    owner.setTenantId(tenant.getId());
    owner.setEmail("owner@" + tag + ".local");
    owner.setPasswordHash(passwordEncoder.encode(PASSWORD));
    owner.setDisplayName("Owner");
    owner.setRole(AppUserRole.pharmacy_owner);
    owner.setActive(true);
    owner.setStatus(UserAccountStatus.ACTIVE);
    owner.setMustChangePassword(false);
    owner.setCreatedAt(T0);
    owner.setUpdatedAt(T0);
    owner.setPasswordChangedAt(T0);
    appUserRepository.saveAndFlush(owner);

    Location branch = new Location();
    branch.setId(UUID.randomUUID());
    branch.setTenantId(tenant.getId());
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
    locationRepository.saveAndFlush(branch);

    MvcResult result =
        mockMvc
            .perform(
                post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        "{\"email\":\"owner@"
                            + tag
                            + ".local\",\"password\":\""
                            + PASSWORD
                            + "\"}"))
            .andExpect(status().isOk())
            .andReturn();
    Cookie cookie = result.getResponse().getCookie("nmm_access");
    assertThat(cookie).isNotNull();
    mockMvc
        .perform(
            post("/api/v1/session/branch")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchId\":\"" + branch.getId() + "\"}"))
        .andExpect(status().isOk());
    return cookie;
  }
}
