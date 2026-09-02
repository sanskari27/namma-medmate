package com.nammamedmate.server.application.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.domain.UserSession;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.infrastructure.security.JwtService;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.UserSessionRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

  private static final Instant NOW = Instant.parse("2026-09-02T00:00:00Z");

  @Mock private AppUserRepository appUserRepository;
  @Mock private UserSessionRepository userSessionRepository;
  @Mock private PasswordEncoder passwordEncoder;
  @Mock private JwtService jwtService;

  private AuthService authService;

  @BeforeEach
  void setUp() {
    authService =
        new AuthService(
            appUserRepository,
            userSessionRepository,
            passwordEncoder,
            jwtService,
            Clock.fixed(NOW, ZoneOffset.UTC),
            720L);
  }

  @Test
  void ac01_normalizesEmailBeforeLookup() {
    AppUser user = activeUser("owner@pharmacy.local", AppUserRole.pharmacy_owner);
    when(appUserRepository.findByNormalizedEmailAndDeletedAtIsNull("owner@pharmacy.local"))
        .thenReturn(Optional.of(user));
    when(appUserRepository.lockById(user.getId())).thenReturn(Optional.of(user));
    when(passwordEncoder.matches("secret", "hash")).thenReturn(true);
    when(jwtService.accessTokenTtlMinutes()).thenReturn(60L);
    when(userSessionRepository.saveAndFlush(any(UserSession.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));
    when(jwtService.createToken(any(), any(), any(), any(), any(), any())).thenReturn("jwt");

    authService.login("  OWNER@Pharmacy.Local ", "secret");

    verify(appUserRepository).findByNormalizedEmailAndDeletedAtIsNull("owner@pharmacy.local");
  }

  @Test
  void ac02_rejectsWhenPasswordDoesNotMatchHash() {
    AppUser user = activeUser("ops@hq.local", AppUserRole.admin_super);
    when(appUserRepository.findByNormalizedEmailAndDeletedAtIsNull("ops@hq.local"))
        .thenReturn(Optional.of(user));
    when(passwordEncoder.matches("wrong", "hash")).thenReturn(false);

    assertThatThrownBy(() -> authService.login("ops@hq.local", "wrong"))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getStatus())
        .isEqualTo(HttpStatus.UNAUTHORIZED);
    verify(userSessionRepository, never()).saveAndFlush(any());
  }

  @Test
  void ac03_revokesPriorSessionsThenPersistsNewSession() {
    AppUser user = activeUser("ops@hq.local", AppUserRole.admin_super);
    when(appUserRepository.findByNormalizedEmailAndDeletedAtIsNull("ops@hq.local"))
        .thenReturn(Optional.of(user));
    when(appUserRepository.lockById(user.getId())).thenReturn(Optional.of(user));
    when(passwordEncoder.matches("secret", "hash")).thenReturn(true);
    when(jwtService.accessTokenTtlMinutes()).thenReturn(60L);
    when(userSessionRepository.saveAndFlush(any(UserSession.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));
    when(jwtService.createToken(any(), any(), any(), any(), any(), any())).thenReturn("jwt");

    LoginOutcome outcome = authService.login("ops@hq.local", "secret");

    verify(appUserRepository).lockById(user.getId());
    verify(userSessionRepository).revokeActiveSessions(eq(user.getId()), eq(NOW));
    ArgumentCaptor<UserSession> captor = ArgumentCaptor.forClass(UserSession.class);
    verify(userSessionRepository).saveAndFlush(captor.capture());
    assertThat(captor.getValue().getUserId()).isEqualTo(user.getId());
    assertThat(captor.getValue().getTenantId()).isNull();
    assertThat(captor.getValue().getRevokedAt()).isNull();
    assertThat(captor.getValue().getExpiresAt()).isEqualTo(NOW.plus(Duration.ofMinutes(720)));
    assertThat(outcome.accessToken()).isEqualTo("jwt");
    verify(jwtService)
        .createToken(
            eq(user.getId()),
            any(),
            isNull(),
            eq(AppUserRole.admin_super),
            eq(NOW),
            eq(NOW.plus(Duration.ofMinutes(60))));
  }

  @Test
  void ac04_activePasswordStillDeniedWhenStatusIsNotActive() {
    AppUser user = activeUser("locked@hq.local", AppUserRole.admin_super);
    user.setStatus(UserAccountStatus.KYC_LOCKED);
    when(appUserRepository.findByNormalizedEmailAndDeletedAtIsNull("locked@hq.local"))
        .thenReturn(Optional.of(user));
    when(passwordEncoder.matches("secret", "hash")).thenReturn(true);

    assertThatThrownBy(() -> authService.login("locked@hq.local", "secret"))
        .isInstanceOf(ApiException.class)
        .satisfies(
            ex -> {
              ApiException api = (ApiException) ex;
              assertThat(api.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
              assertThat(api.getCode()).isEqualTo("ACCOUNT_CANNOT_SIGN_IN");
            });
    verify(userSessionRepository, never()).revokeActiveSessions(any(), any());
  }

  @Test
  void ac02_setPinHashesSixDigitsAndMarksPinSet() {
    AppUser user = activeUser("ops@hq.local", AppUserRole.admin_super);
    AuthPrincipal principal = principalFor(user);
    when(appUserRepository.lockById(user.getId())).thenReturn(Optional.of(user));
    when(passwordEncoder.encode("123456")).thenReturn("$2pin");

    AuthenticatedUser result = authService.setPin(principal, "123456");

    assertThat(user.getPinHash()).isEqualTo("$2pin");
    assertThat(result.pinSet()).isTrue();
    verify(appUserRepository).save(user);
  }

  @Test
  void ac05_setPinRejectsMalformedDigits() {
    AppUser user = activeUser("ops@hq.local", AppUserRole.admin_super);
    AuthPrincipal principal = principalFor(user);

    assertThatThrownBy(() -> authService.setPin(principal, "12345"))
        .isInstanceOf(ApiException.class)
        .satisfies(
            ex -> {
              ApiException api = (ApiException) ex;
              assertThat(api.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
              assertThat(api.getCode()).isEqualTo("VALIDATION_ERROR");
            });
    verify(appUserRepository, never()).lockById(any());
  }

  @Test
  void idempotency_setPinWhenHashExistsIsConflict() {
    AppUser user = activeUser("ops@hq.local", AppUserRole.admin_super);
    user.setPinHash("$2existing");
    AuthPrincipal principal = principalFor(user);
    when(appUserRepository.lockById(user.getId())).thenReturn(Optional.of(user));

    assertThatThrownBy(() -> authService.setPin(principal, "123456"))
        .isInstanceOf(ApiException.class)
        .satisfies(
            ex -> {
              ApiException api = (ApiException) ex;
              assertThat(api.getStatus()).isEqualTo(HttpStatus.CONFLICT);
              assertThat(api.getCode()).isEqualTo("PIN_ALREADY_SET");
            });
    verify(passwordEncoder, never()).encode(any());
  }

  @Test
  void ac03_thirdFailedUnlockRevokesSession() {
    AppUser user = activeUser("ops@hq.local", AppUserRole.admin_super);
    user.setPinHash("$2pin");
    UserSession session = activeSession(user);
    session.setPinFailedAttempts(2);
    AuthPrincipal principal = principalFor(user, session.getId());
    when(appUserRepository.lockById(user.getId())).thenReturn(Optional.of(user));
    when(userSessionRepository.lockActiveScopedSession(
            session.getId(), user.getId(), user.getTenantId()))
        .thenReturn(Optional.of(session));
    when(passwordEncoder.matches("654321", "$2pin")).thenReturn(false);

    assertThatThrownBy(() -> authService.unlockPin(principal, "654321"))
        .isInstanceOf(ApiException.class)
        .satisfies(
            ex -> {
              ApiException api = (ApiException) ex;
              assertThat(api.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
              assertThat(api.getCode()).isEqualTo("SESSION_REVOKED");
            });
    assertThat(session.getRevokedAt()).isEqualTo(NOW);
    assertThat(session.getPinFailedAttempts()).isEqualTo(3);
    verify(jwtService, never()).createToken(any(), any(), any(), any(), any(), any());
  }

  @Test
  void ac04_successfulUnlockIssuesTokenAndExtendsSession() {
    AppUser user = activeUser("ops@hq.local", AppUserRole.admin_super);
    user.setPinHash("$2pin");
    UserSession session = activeSession(user);
    session.setPinFailedAttempts(2);
    AuthPrincipal principal = principalFor(user, session.getId());
    when(appUserRepository.lockById(user.getId())).thenReturn(Optional.of(user));
    when(userSessionRepository.lockActiveScopedSession(
            session.getId(), user.getId(), user.getTenantId()))
        .thenReturn(Optional.of(session));
    when(passwordEncoder.matches("123456", "$2pin")).thenReturn(true);
    when(jwtService.accessTokenTtlMinutes()).thenReturn(60L);
    when(jwtService.createToken(any(), any(), any(), any(), any(), any())).thenReturn("refreshed");

    LoginOutcome result = authService.unlockPin(principal, "123456");

    assertThat(session.getPinFailedAttempts()).isZero();
    assertThat(session.getRevokedAt()).isNull();
    assertThat(session.getExpiresAt()).isEqualTo(NOW.plus(Duration.ofMinutes(720)));
    assertThat(result.user().pinSet()).isTrue();
    assertThat(result.accessToken()).isEqualTo("refreshed");
    verify(jwtService)
        .createToken(
            eq(user.getId()),
            eq(session.getId()),
            eq(user.getTenantId()),
            eq(user.getRole()),
            eq(NOW),
            eq(NOW.plus(Duration.ofMinutes(60))));
  }

  @Test
  void ac05_unlockWithoutPinIsUnprocessable() {
    AppUser user = activeUser("ops@hq.local", AppUserRole.admin_super);
    UserSession session = activeSession(user);
    AuthPrincipal principal = principalFor(user, session.getId());
    when(appUserRepository.lockById(user.getId())).thenReturn(Optional.of(user));
    when(userSessionRepository.lockActiveScopedSession(
            session.getId(), user.getId(), user.getTenantId()))
        .thenReturn(Optional.of(session));

    assertThatThrownBy(() -> authService.unlockPin(principal, "123456"))
        .isInstanceOf(ApiException.class)
        .satisfies(
            ex -> {
              ApiException api = (ApiException) ex;
              assertThat(api.getStatus()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
              assertThat(api.getCode()).isEqualTo("PIN_NOT_SET");
            });
    assertThat(session.getRevokedAt()).isNull();
  }

  @Test
  void ac07_unknownEmailIsGenericUnauthorized() {
    when(appUserRepository.findByNormalizedEmailAndDeletedAtIsNull("gone@hq.local"))
        .thenReturn(Optional.empty());

    assertThatThrownBy(() -> authService.login("gone@hq.local", "secret"))
        .isInstanceOf(ApiException.class)
        .satisfies(
            ex -> {
              ApiException api = (ApiException) ex;
              assertThat(api.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
              assertThat(api.getMessage()).isEqualTo("Invalid email or password");
            });
  }

  private static AuthPrincipal principalFor(AppUser user) {
    return principalFor(user, UUID.randomUUID());
  }

  private static AuthPrincipal principalFor(AppUser user, UUID sessionId) {
    return new AuthPrincipal(user.getId(), user.getTenantId(), sessionId, user.getRole());
  }

  private static UserSession activeSession(AppUser user) {
    UserSession session = new UserSession();
    session.setId(UUID.randomUUID());
    session.setUserId(user.getId());
    session.setTenantId(user.getTenantId());
    session.setExpiresAt(NOW.plusSeconds(3600));
    session.setCreatedAt(NOW);
    session.setPinFailedAttempts(0);
    return session;
  }

  private static AppUser activeUser(String email, AppUserRole role) {
    AppUser user = new AppUser();
    user.setId(UUID.randomUUID());
    user.setEmail(email);
    user.setPasswordHash("hash");
    user.setDisplayName("User");
    user.setRole(role);
    user.setStatus(UserAccountStatus.ACTIVE);
    user.setCreatedAt(NOW);
    user.setUpdatedAt(NOW);
    return user;
  }
}
