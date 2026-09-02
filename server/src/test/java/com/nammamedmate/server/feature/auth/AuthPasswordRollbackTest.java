package com.nammamedmate.server.feature.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.PasswordHistoryRepository;
import com.nammamedmate.server.persistence.PasswordResetTokenRepository;
import com.nammamedmate.server.persistence.TransactionalEmailRepository;
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
class AuthPasswordRollbackTest {

  private static final String PASSWORD = "counter-pass-1";

  @Container
  static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:16-alpine")
          .withDatabaseName("nammamedmate_password_rollback")
          .withUsername("postgres")
          .withPassword("postgres");

  @DynamicPropertySource
  static void datasource(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
    registry.add("spring.datasource.username", POSTGRES::getUsername);
    registry.add("spring.datasource.password", POSTGRES::getPassword);
  }

  @Autowired private MockMvc mockMvc;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private UserSessionRepository userSessionRepository;
  @Autowired private PasswordHistoryRepository passwordHistoryRepository;
  @Autowired private PasswordResetTokenRepository passwordResetTokenRepository;
  @Autowired private TransactionalEmailRepository transactionalEmailRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @BeforeEach
  void wipe() {
    passwordResetTokenRepository.deleteAll();
    passwordHistoryRepository.deleteAll();
    transactionalEmailRepository.deleteAll();
    userSessionRepository.deleteAll();
    appUserRepository.deleteAll();
  }

  @Test
  void ac05_rejectedChangeLeavesHashAndHistoryUnchanged() throws Exception {
    persistMaster();
    Cookie cookie =
        mockMvc
            .perform(
                post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"email\":\"ops@hq.local\",\"password\":\"" + PASSWORD + "\"}"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getCookie("nmm_access");
    assertThat(cookie).isNotNull();
    String hashBefore =
        appUserRepository
            .findByNormalizedEmailAndDeletedAtIsNull("ops@hq.local")
            .orElseThrow()
            .getPasswordHash();

    mockMvc
        .perform(
            post("/api/v1/auth/password")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"currentPassword\":\"" + PASSWORD + "\",\"newPassword\":\"short\"}"))
        .andExpect(status().isBadRequest());

    AppUser after =
        appUserRepository.findByNormalizedEmailAndDeletedAtIsNull("ops@hq.local").orElseThrow();
    assertThat(after.getPasswordHash()).isEqualTo(hashBefore);
    assertThat(passwordHistoryRepository.count()).isZero();
  }

  @Test
  void ac05_invalidCompleteResetWritesNoHistory() throws Exception {
    persistMaster();

    mockMvc
        .perform(
            post("/api/v1/auth/password/reset")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"bogus-token\",\"password\":\"counter-pass-2\"}"))
        .andExpect(status().isUnprocessableEntity());

    assertThat(passwordHistoryRepository.count()).isZero();
    AppUser stored =
        appUserRepository.findByNormalizedEmailAndDeletedAtIsNull("ops@hq.local").orElseThrow();
    assertThat(passwordEncoder.matches(PASSWORD, stored.getPasswordHash())).isTrue();
  }

  private void persistMaster() {
    Instant now = Instant.parse("2026-09-01T00:00:00Z");
    AppUser user = new AppUser();
    user.setId(UUID.randomUUID());
    user.setEmail("ops@hq.local");
    user.setPasswordHash(passwordEncoder.encode(PASSWORD));
    user.setDisplayName("Ops");
    user.setRole(AppUserRole.admin_super);
    user.setActive(true);
    user.setStatus(UserAccountStatus.ACTIVE);
    user.setPasswordChangedAt(now);
    user.setMustChangePassword(false);
    user.setCreatedAt(now);
    user.setUpdatedAt(now);
    appUserRepository.saveAndFlush(user);
  }
}
