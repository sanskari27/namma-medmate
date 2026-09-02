package com.nammamedmate.server.feature.approval;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.domain.AccessRole;
import com.nammamedmate.server.domain.AccessRoleKind;
import com.nammamedmate.server.domain.AccessRoleModule;
import com.nammamedmate.server.domain.AccessScope;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.UserAccessRole;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AccessRoleEventRepository;
import com.nammamedmate.server.persistence.AccessRoleModuleRepository;
import com.nammamedmate.server.persistence.AccessRoleRepository;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.ApprovalDecisionRepository;
import com.nammamedmate.server.persistence.ApprovalRequestRepository;
import com.nammamedmate.server.persistence.ApprovalRuleRepository;
import com.nammamedmate.server.persistence.AuditEventRepository;
import com.nammamedmate.server.persistence.NotificationDeliveryRepository;
import com.nammamedmate.server.persistence.NotificationEventRepository;
import com.nammamedmate.server.persistence.NotificationRepository;
import com.nammamedmate.server.persistence.NotificationSourceRepository;
import com.nammamedmate.server.persistence.PasswordHistoryRepository;
import com.nammamedmate.server.persistence.PasswordResetTokenRepository;
import com.nammamedmate.server.persistence.SavedLoginRepository;
import com.nammamedmate.server.persistence.StaffRegistrationRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TransactionalEmailRepository;
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
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
class ApprovalWorkflowTest {

  private static final String PASSWORD = "counter-pass-1";

  @Container
  static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:16-alpine")
          .withDatabaseName("nammamedmate_approvals")
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
  @Autowired private PasswordHistoryRepository passwordHistoryRepository;
  @Autowired private PasswordResetTokenRepository passwordResetTokenRepository;
  @Autowired private TransactionalEmailRepository transactionalEmailRepository;
  @Autowired private SavedLoginRepository savedLoginRepository;
  @Autowired private StaffRegistrationRepository staffRegistrationRepository;
  @Autowired private UserAccessRoleRepository userAccessRoleRepository;
  @Autowired private AccessRoleEventRepository accessRoleEventRepository;
  @Autowired private AccessRoleRepository accessRoleRepository;
  @Autowired private AccessRoleModuleRepository accessRoleModuleRepository;
  @Autowired private ApprovalRuleRepository approvalRuleRepository;
  @Autowired private ApprovalRequestRepository approvalRequestRepository;
  @Autowired private ApprovalDecisionRepository approvalDecisionRepository;
  @Autowired private AuditEventRepository auditEventRepository;
  @Autowired private NotificationDeliveryRepository notificationDeliveryRepository;
  @Autowired private NotificationEventRepository notificationEventRepository;
  @Autowired private NotificationRepository notificationRepository;
  @Autowired private NotificationSourceRepository notificationSourceRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @BeforeEach
  void wipe() {
    approvalDecisionRepository.deleteAll();
    approvalRequestRepository.deleteAll();
    approvalRuleRepository.deleteAll();
    auditEventRepository.deleteAll();
    notificationDeliveryRepository.deleteAll();
    notificationEventRepository.deleteAll();
    notificationRepository.deleteAll();
    notificationSourceRepository.deleteAll();
    passwordResetTokenRepository.deleteAll();
    passwordHistoryRepository.deleteAll();
    transactionalEmailRepository.deleteAll();
    savedLoginRepository.deleteAll();
    userSessionRepository.deleteAll();
    staffRegistrationRepository.deleteAll();
    userAccessRoleRepository.deleteAll();
    accessRoleEventRepository.deleteAll();
    accessRoleModuleRepository.deleteAll(
        accessRoleModuleRepository.findAll().stream()
            .filter(
                row ->
                    accessRoleRepository
                        .findById(row.getRoleId())
                        .map(role -> role.getKind() == AccessRoleKind.CUSTOM)
                        .orElse(false))
            .toList());
    accessRoleRepository.deleteAll(accessRoleRepository.findByKind(AccessRoleKind.CUSTOM));
    appUserRepository.deleteAll();
    tenantRepository.deleteAll();
  }

  @Test
  void ac01_staffWithApprovalsModuleCanConfigureRules() throws Exception {
    Tenant tenant = persistTenant("approvals-ac01");
    persistUser(tenant.getId(), "owner@appr.local", AppUserRole.pharmacy_owner, null);
    AppUser staff =
        persistUser(tenant.getId(), "builder@appr.local", AppUserRole.pharmacy_staff, null);
    UUID approvalsRole = createCustomRole(tenant.getId(), "Sign-off builder", ModuleCode.APPROVALS);
    assignRole(staff.getId(), tenant.getId(), approvalsRole);

    Cookie builder = login("builder@appr.local");
    mockMvc
        .perform(
            post("/api/v1/approvals/rules")
                .cookie(builder)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "moduleCode":"SALES",
                      "actionKey":"SALES_DISCOUNT_PERCENT",
                      "thresholdValue":1000,
                      "approverType":"ACCOUNT_CLASS",
                      "approverAccountClass":"pharmacy_owner",
                      "allowSelfApproval":false
                    }
                    """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.actionKey").value("SALES_DISCOUNT_PERCENT"))
        .andExpect(jsonPath("$.data.thresholdValue").value(1000));
  }

  @Test
  void ac01_staffWithoutApprovalsModuleIsDenied() throws Exception {
    Tenant tenant = persistTenant("approvals-denied");
    persistUser(tenant.getId(), "owner2@appr.local", AppUserRole.pharmacy_owner, null);
    persistUser(tenant.getId(), "clerk@appr.local", AppUserRole.pharmacy_staff, null);
    Cookie clerk = login("clerk@appr.local");
    mockMvc
        .perform(get("/api/v1/approvals/rules").cookie(clerk))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
  }

  @Test
  void ac02_thresholdAndApproverConfiguredPerModule() throws Exception {
    Tenant tenant = persistTenant("approvals-ac02");
    persistUser(tenant.getId(), "owner3@appr.local", AppUserRole.pharmacy_owner, null);
    Cookie owner = login("owner3@appr.local");
    UUID pharmacist = predefinedId(owner, "pharmacist");

    mockMvc
        .perform(
            post("/api/v1/approvals/rules")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "moduleCode":"INVENTORY",
                      "actionKey":"INVENTORY_WRITE_OFF",
                      "thresholdValue":50000,
                      "approverType":"ACCESS_ROLE",
                      "approverRoleId":"%s",
                      "allowSelfApproval":false
                    }
                    """
                        .formatted(pharmacist)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.moduleCode").value("INVENTORY"))
        .andExpect(jsonPath("$.data.approverRoleId").value(pharmacist.toString()))
        .andExpect(jsonPath("$.data.thresholdValue").value(50000));

    mockMvc
        .perform(get("/api/v1/approvals/actions").cookie(owner))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.actions.length()").value(2));
  }

  @Test
  void ac04_decisionPreservesActorAndBusinessContext() throws Exception {
    Tenant tenant = persistTenant("approvals-ac04");
    AppUser owner =
        persistUser(tenant.getId(), "owner4@appr.local", AppUserRole.pharmacy_owner, null);
    AppUser staff =
        persistUser(tenant.getId(), "requester@appr.local", AppUserRole.pharmacy_staff, null);
    Cookie ownerCookie = login("owner4@appr.local");
    createOwnerRule(ownerCookie);

    Cookie staffCookie = login("requester@appr.local");
    String requestBody =
        mockMvc
            .perform(
                post("/api/v1/approvals/requests")
                    .cookie(staffCookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "moduleCode":"SALES",
                          "actionKey":"SALES_DISCOUNT_PERCENT",
                          "amountValue":1500,
                          "contextJson":"{\\"invoiceId\\":\\"inv-1\\"}",
                          "idempotencyKey":"disc-1"
                        }
                        """))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    UUID requestId =
        UUID.fromString(objectMapper.readTree(requestBody).path("data").path("id").asText());
    int version = objectMapper.readTree(requestBody).path("data").path("version").asInt();

    mockMvc
        .perform(
            post("/api/v1/approvals/requests/" + requestId + "/decide")
                .cookie(ownerCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"outcome\":\"APPROVED\",\"note\":\"ok for till\",\"version\":%d}"
                        .formatted(version)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("APPROVED"))
        .andExpect(jsonPath("$.data.decisionOutcome").value("APPROVED"))
        .andExpect(jsonPath("$.data.decisionActorUserId").value(owner.getId().toString()))
        .andExpect(jsonPath("$.data.contextJson").value("{\"invoiceId\":\"inv-1\"}"))
        .andExpect(jsonPath("$.data.requesterUserId").value(staff.getId().toString()));

    assertThat(approvalDecisionRepository.findByRequestId(requestId)).isPresent();
  }

  @Test
  void ac05_loginAuditRecordsOriginWithoutSecrets() throws Exception {
    Tenant tenant = persistTenant("approvals-login");
    persistUser(tenant.getId(), "login@appr.local", AppUserRole.pharmacy_owner, null);

    mockMvc
        .perform(
            post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", "JUnit-Agent/1.0")
                .header("X-Forwarded-For", "203.0.113.9")
                .content("{\"email\":\"login@appr.local\",\"password\":\"" + PASSWORD + "\"}"))
        .andExpect(status().isOk());

    mockMvc
        .perform(
            post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", "JUnit-Agent/1.0")
                .header("X-Forwarded-For", "203.0.113.9")
                .content("{\"email\":\"login@appr.local\",\"password\":\"wrong-pass-1\"}"))
        .andExpect(status().isUnauthorized());

    assertThat(auditEventRepository.findAll())
        .anySatisfy(
            event -> {
              assertThat(event.getAction()).isEqualTo("LOGIN");
              assertThat(event.getOutcome()).isEqualTo("SUCCESS");
              assertThat(event.getSourceIp()).isEqualTo("203.0.113.9");
              assertThat(event.getUserAgent()).isEqualTo("JUnit-Agent/1.0");
              assertThat(event.getSessionId()).isNotNull();
              assertThat(event.getAttemptedIdentity()).contains("login@appr.local");
              assertThat(
                      event.getContextJson() == null || !event.getContextJson().contains(PASSWORD))
                  .isTrue();
            })
        .anySatisfy(
            event -> {
              assertThat(event.getAction()).isEqualTo("LOGIN");
              assertThat(event.getOutcome()).isEqualTo("FAILURE");
              assertThat(event.getSourceIp()).isEqualTo("203.0.113.9");
              assertThat(event.getContextJson()).isNull();
            });
  }

  @Test
  void ac03_auditListOmitsEventsOlderThanNinetyDays() throws Exception {
    Tenant tenant = persistTenant("approvals-retain");
    AppUser owner =
        persistUser(tenant.getId(), "retain@appr.local", AppUserRole.pharmacy_owner, null);
    var old = new com.nammamedmate.server.domain.AuditEvent();
    old.setId(UUID.randomUUID());
    old.setUserId(owner.getId());
    old.setTenantId(tenant.getId());
    old.setAction("LOGIN");
    old.setOutcome("SUCCESS");
    old.setCreatedAt(Instant.parse("2026-01-01T00:00:00Z"));
    auditEventRepository.save(old);
    var recent = new com.nammamedmate.server.domain.AuditEvent();
    recent.setId(UUID.randomUUID());
    recent.setUserId(owner.getId());
    recent.setTenantId(tenant.getId());
    recent.setAction("LOGIN");
    recent.setOutcome("SUCCESS");
    recent.setCreatedAt(Instant.now());
    auditEventRepository.save(recent);

    Cookie ownerCookie = login("retain@appr.local");
    String body =
        mockMvc
            .perform(get("/api/v1/audit").cookie(ownerCookie))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    JsonNode events = objectMapper.readTree(body).path("data").path("events");
    assertThat(events.toString()).contains(recent.getId().toString());
    assertThat(events.toString()).doesNotContain(old.getId().toString());
  }

  @Test
  void ac06_selfApprovalStaleThresholdExportAndCrossTenantRejected() throws Exception {
    Tenant tenantA = persistTenant("approvals-a");
    Tenant tenantB = persistTenant("approvals-b");
    persistUser(tenantA.getId(), "ownera@appr.local", AppUserRole.pharmacy_owner, null);
    persistUser(tenantB.getId(), "ownerb@appr.local", AppUserRole.pharmacy_owner, null);
    AppUser staff =
        persistUser(tenantA.getId(), "staffa@appr.local", AppUserRole.pharmacy_staff, null);
    AppUser staffNoModule =
        persistUser(tenantA.getId(), "nomodule@appr.local", AppUserRole.pharmacy_staff, null);

    Cookie ownerACookie = login("ownera@appr.local");
    createOwnerRule(ownerACookie);
    Cookie staffCookie = login("staffa@appr.local");

    String selfCreated =
        mockMvc
            .perform(
                post("/api/v1/approvals/requests")
                    .cookie(ownerACookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "moduleCode":"SALES",
                          "actionKey":"SALES_DISCOUNT_PERCENT",
                          "amountValue":2000,
                          "contextJson":"{\\"invoiceId\\":\\"inv-self\\"}"
                        }
                        """))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    UUID selfRequestId =
        UUID.fromString(objectMapper.readTree(selfCreated).path("data").path("id").asText());
    int selfVersion = objectMapper.readTree(selfCreated).path("data").path("version").asInt();

    mockMvc
        .perform(
            post("/api/v1/approvals/requests/" + selfRequestId + "/decide")
                .cookie(ownerACookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"outcome\":\"APPROVED\",\"version\":%d}".formatted(selfVersion)))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("SELF_APPROVAL"));

    String created =
        mockMvc
            .perform(
                post("/api/v1/approvals/requests")
                    .cookie(staffCookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "moduleCode":"SALES",
                          "actionKey":"SALES_DISCOUNT_PERCENT",
                          "amountValue":2000,
                          "contextJson":"{\\"invoiceId\\":\\"inv-2\\"}"
                        }
                        """))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    UUID requestId =
        UUID.fromString(objectMapper.readTree(created).path("data").path("id").asText());
    int version = objectMapper.readTree(created).path("data").path("version").asInt();

    mockMvc
        .perform(
            patch("/api/v1/approvals/rules/" + ruleId(ownerACookie))
                .cookie(ownerACookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "thresholdValue":2500,
                      "version":1
                    }
                    """))
        .andExpect(status().isOk());

    mockMvc
        .perform(
            post("/api/v1/approvals/requests/" + requestId + "/decide")
                .cookie(ownerACookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"outcome\":\"APPROVED\",\"version\":%d}".formatted(version)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("THRESHOLD_CHANGED"));

    Cookie ownerBCookie = login("ownerb@appr.local");
    mockMvc
        .perform(get("/api/v1/approvals/rules").cookie(ownerBCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.rules.length()").value(0));
    mockMvc
        .perform(
            post("/api/v1/approvals/requests/" + requestId + "/decide")
                .cookie(ownerBCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"outcome\":\"APPROVED\",\"version\":1}"))
        .andExpect(status().isNotFound());

    Cookie noModuleCookie = login("nomodule@appr.local");
    mockMvc
        .perform(get("/api/v1/audit/export").cookie(noModuleCookie))
        .andExpect(status().isForbidden());

    assertThat(staff.getId()).isNotNull();
    assertThat(staffNoModule.getId()).isNotNull();
  }

  @Test
  void ac01_masterConfiguresPlatformRulesAndReadsAuditWithoutApprovalsModule() throws Exception {
    persistUser(null, "master@appr.local", AppUserRole.admin_super, "Master");
    Cookie master = login("master@appr.local");

    mockMvc
        .perform(
            post("/api/v1/approvals/rules")
                .cookie(master)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "moduleCode":"SALES",
                      "actionKey":"SALES_DISCOUNT_PERCENT",
                      "thresholdValue":500,
                      "approverType":"ACCOUNT_CLASS",
                      "approverAccountClass":"admin_super",
                      "allowSelfApproval":false
                    }
                    """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.scope").value("PLATFORM"))
        .andExpect(jsonPath("$.data.approverAccountClass").value("admin_super"));

    mockMvc
        .perform(get("/api/v1/approvals/rules").cookie(master))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.rules.length()").value(1));

    mockMvc
        .perform(get("/api/v1/audit").cookie(master))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true));
  }

  @Test
  void ac06_staleRequestVersionIsConflict() throws Exception {
    Tenant tenant = persistTenant("stale-ver");
    persistUser(tenant.getId(), "owner-stale@appr.local", AppUserRole.pharmacy_owner, null);
    persistUser(tenant.getId(), "staff-stale@appr.local", AppUserRole.pharmacy_staff, null);
    Cookie owner = login("owner-stale@appr.local");
    createOwnerRule(owner);
    Cookie staff = login("staff-stale@appr.local");
    String created =
        mockMvc
            .perform(
                post("/api/v1/approvals/requests")
                    .cookie(staff)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "moduleCode":"SALES",
                          "actionKey":"SALES_DISCOUNT_PERCENT",
                          "amountValue":1100,
                          "contextJson":"{\\"invoiceId\\":\\"stale-1\\"}"
                        }
                        """))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    UUID requestId =
        UUID.fromString(objectMapper.readTree(created).path("data").path("id").asText());

    mockMvc
        .perform(
            post("/api/v1/approvals/requests/" + requestId + "/decide")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"outcome\":\"APPROVED\",\"version\":99}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("STALE_STATE"));
  }

  @Test
  void ac05_pinLoginFailureIsAuditedWithoutPin() throws Exception {
    Tenant tenant = persistTenant("pin-audit");
    AppUser owner = persistUser(tenant.getId(), "pin@appr.local", AppUserRole.pharmacy_owner, null);
    mockMvc
        .perform(
            post("/api/v1/auth/pin/login")
                .contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", "Pin-Agent/1.0")
                .header("X-Forwarded-For", "198.51.100.20")
                .content("{\"userId\":\"" + owner.getId() + "\",\"pin\":\"123456\"}"))
        .andExpect(status().isUnauthorized());

    assertThat(auditEventRepository.findAll())
        .anySatisfy(
            event -> {
              assertThat(event.getAction()).isEqualTo("PIN_LOGIN");
              assertThat(event.getOutcome()).isEqualTo("FAILURE");
              assertThat(event.getSourceIp()).isEqualTo("198.51.100.20");
              assertThat(event.getUserAgent()).isEqualTo("Pin-Agent/1.0");
              assertThat(event.getAttemptedIdentity()).contains(owner.getId().toString());
              assertThat(event.getContextJson()).isNull();
            });
  }

  private void createOwnerRule(Cookie owner) throws Exception {
    mockMvc
        .perform(
            post("/api/v1/approvals/rules")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "moduleCode":"SALES",
                      "actionKey":"SALES_DISCOUNT_PERCENT",
                      "thresholdValue":1000,
                      "approverType":"ACCOUNT_CLASS",
                      "approverAccountClass":"pharmacy_owner",
                      "allowSelfApproval":false
                    }
                    """))
        .andExpect(status().isOk());
  }

  private UUID ruleId(Cookie owner) throws Exception {
    String body =
        mockMvc
            .perform(get("/api/v1/approvals/rules").cookie(owner))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return UUID.fromString(
        objectMapper.readTree(body).path("data").path("rules").get(0).path("id").asText());
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
    throw new IllegalStateException("missing role " + code);
  }

  private UUID createCustomRole(UUID tenantId, String name, ModuleCode module) {
    Instant now = Instant.now();
    AccessRole role = new AccessRole();
    role.setId(UUID.randomUUID());
    role.setTenantId(tenantId);
    role.setScope(AccessScope.TENANT);
    role.setKind(AccessRoleKind.CUSTOM);
    role.setName(name);
    role.setVersion(1);
    role.setCreatedAt(now);
    role.setUpdatedAt(now);
    accessRoleRepository.save(role);
    AccessRoleModule row = new AccessRoleModule();
    row.setId(UUID.randomUUID());
    row.setRoleId(role.getId());
    row.setModuleCode(module);
    accessRoleModuleRepository.save(row);
    return role.getId();
  }

  private void assignRole(UUID userId, UUID tenantId, UUID roleId) {
    UserAccessRole assignment = new UserAccessRole();
    assignment.setId(UUID.randomUUID());
    assignment.setUserId(userId);
    assignment.setRoleId(roleId);
    assignment.setTenantId(tenantId);
    assignment.setCreatedAt(Instant.now());
    userAccessRoleRepository.save(assignment);
  }

  private Cookie login(String email) throws Exception {
    return mockMvc
        .perform(
            post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}"))
        .andExpect(status().isOk())
        .andReturn()
        .getResponse()
        .getCookie("nmm_access");
  }

  private Tenant persistTenant(String slug) {
    Tenant tenant = new Tenant();
    tenant.setId(UUID.randomUUID());
    tenant.setName(slug);
    tenant.setSlug(slug);
    Instant now = Instant.parse("2026-09-01T00:00:00Z");
    tenant.setCreatedAt(now);
    tenant.setUpdatedAt(now);
    return tenantRepository.saveAndFlush(tenant);
  }

  private AppUser persistUser(UUID tenantId, String email, AppUserRole role, String displayName) {
    Instant now = Instant.parse("2026-09-01T00:00:00Z");
    AppUser user = new AppUser();
    user.setId(UUID.randomUUID());
    user.setTenantId(tenantId);
    user.setEmail(email);
    user.setPasswordHash(passwordEncoder.encode(PASSWORD));
    user.setDisplayName(displayName == null ? email : displayName);
    user.setPhone("9000000000");
    user.setRole(role);
    user.setActive(true);
    user.setStatus(UserAccountStatus.ACTIVE);
    user.setPasswordChangedAt(now);
    user.setMustChangePassword(false);
    user.setCreatedAt(now);
    user.setUpdatedAt(now);
    return appUserRepository.saveAndFlush(user);
  }
}
