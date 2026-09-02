package com.nammamedmate.server.feature.approval;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.nammamedmate.server.domain.AccessRoleKind;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AccessRoleEventRepository;
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
class ApprovalRollbackTest {

  private static final String PASSWORD = "counter-pass-1";

  @Container
  static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:16-alpine")
          .withDatabaseName("nammamedmate_approval_rb")
          .withUsername("postgres")
          .withPassword("postgres");

  @DynamicPropertySource
  static void datasource(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
    registry.add("spring.datasource.username", POSTGRES::getUsername);
    registry.add("spring.datasource.password", POSTGRES::getPassword);
  }

  @Autowired private MockMvc mockMvc;
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
    accessRoleRepository.deleteAll(accessRoleRepository.findByKind(AccessRoleKind.CUSTOM));
    appUserRepository.deleteAll();
    tenantRepository.deleteAll();
  }

  @Test
  void failedSelfApprovalLeavesNoDecisionRow() throws Exception {
    Tenant tenant = persistTenant("rb-appr");
    persistUser(tenant.getId(), "owner@rb.local", AppUserRole.pharmacy_owner, null);
    Cookie owner = login("owner@rb.local");
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

    String created =
        mockMvc
            .perform(
                post("/api/v1/approvals/requests")
                    .cookie(owner)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "moduleCode":"SALES",
                          "actionKey":"SALES_DISCOUNT_PERCENT",
                          "amountValue":1200,
                          "contextJson":"{\\"invoiceId\\":\\"rb-1\\"}"
                        }
                        """))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    // parse id/version via simple split to avoid ObjectMapper dependency churn
    String id = created.replaceAll("(?s).*\\\"id\\\"\\s*:\\s*\\\"([^\"]+)\\\".*", "$1");
    String version = created.replaceAll("(?s).*\\\"version\\\"\\s*:\\s*(\\d+).*", "$1");

    mockMvc
        .perform(
            post("/api/v1/approvals/requests/" + id + "/decide")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"outcome\":\"APPROVED\",\"version\":" + version + "}"))
        .andExpect(status().isUnprocessableEntity());

    assertThat(approvalDecisionRepository.findAll()).isEmpty();
    assertThat(approvalRequestRepository.findAll())
        .singleElement()
        .extracting(req -> req.getStatus().name())
        .isEqualTo("PENDING");
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
