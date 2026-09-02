package com.nammamedmate.server.application.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.SavedLogin;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.infrastructure.security.JwtService;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.SavedLoginRepository;
import com.nammamedmate.server.persistence.UserSessionRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Clock;
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
class SavedLoginServiceTest {

  private static final Instant NOW = Instant.parse("2026-09-02T00:00:00Z");

  @Mock private SavedLoginRepository savedLoginRepository;
  @Mock private AppUserRepository appUserRepository;
  @Mock private UserSessionRepository userSessionRepository;
  @Mock private PasswordEncoder passwordEncoder;
  @Mock private JwtService jwtService;

  private SavedLoginService service;

  @BeforeEach
  void setUp() {
    service =
        new SavedLoginService(
            savedLoginRepository,
            appUserRepository,
            userSessionRepository,
            passwordEncoder,
            jwtService,
            Clock.fixed(NOW, ZoneOffset.UTC),
            720L,
            30L);
  }

  @Test
  void bindSkipsWhenPinIsNotSet() {
    AppUser user = activeUser();
    when(appUserRepository.lockById(user.getId())).thenReturn(Optional.of(user));

    service.bind(UUID.randomUUID(), user.getId());

    verify(savedLoginRepository, org.mockito.Mockito.never()).save(any());
  }

  @Test
  void pinLoginWithoutBindingIsUnauthorized() {
    AppUser user = activeUser();
    user.setPinHash("hash");
    UUID deviceId = UUID.randomUUID();
    when(appUserRepository.lockById(user.getId())).thenReturn(Optional.of(user));
    when(savedLoginRepository.lockByDeviceIdAndUserId(deviceId, user.getId()))
        .thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.pinLogin(deviceId, user.getId(), "123456"))
        .isInstanceOf(ApiException.class)
        .satisfies(
            ex -> {
              ApiException api = (ApiException) ex;
              assertThat(api.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
              assertThat(api.getCode()).isEqualTo("UNAUTHORIZED");
            });
  }

  @Test
  void thirdWrongPinRevokesTheBinding() {
    AppUser user = activeUser();
    user.setPinHash("hash");
    UUID deviceId = UUID.randomUUID();
    SavedLogin binding = activeBinding(deviceId, user);
    binding.setFailedAttempts(2);
    when(appUserRepository.lockById(user.getId())).thenReturn(Optional.of(user));
    when(savedLoginRepository.lockByDeviceIdAndUserId(deviceId, user.getId()))
        .thenReturn(Optional.of(binding));
    when(passwordEncoder.matches("654321", "hash")).thenReturn(false);

    assertThatThrownBy(() -> service.pinLogin(deviceId, user.getId(), "654321"))
        .isInstanceOf(ApiException.class)
        .satisfies(ex -> assertThat(((ApiException) ex).getCode()).isEqualTo("INVALID_PIN"));
    assertThat(binding.getRevokedAt()).isEqualTo(NOW);
    ArgumentCaptor<SavedLogin> captor = ArgumentCaptor.forClass(SavedLogin.class);
    verify(savedLoginRepository).save(captor.capture());
    assertThat(captor.getValue().getRevokedAt()).isEqualTo(NOW);
  }

  private static SavedLogin activeBinding(UUID deviceId, AppUser user) {
    SavedLogin binding = new SavedLogin();
    binding.setId(UUID.randomUUID());
    binding.setDeviceId(deviceId);
    binding.setUserId(user.getId());
    binding.setTenantId(user.getTenantId());
    binding.setExpiresAt(NOW.plusSeconds(3600));
    binding.setCreatedAt(NOW);
    binding.setLastUsedAt(NOW);
    return binding;
  }

  private static AppUser activeUser() {
    AppUser user = new AppUser();
    user.setId(UUID.randomUUID());
    user.setEmail("ops@hq.local");
    user.setDisplayName("Ops");
    user.setRole(AppUserRole.admin_super);
    user.setStatus(UserAccountStatus.ACTIVE);
    user.setCreatedAt(NOW);
    user.setUpdatedAt(NOW);
    return user;
  }
}
