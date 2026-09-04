package com.nammamedmate.server.feature.staff;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.nammamedmate.server.AbstractIntegrationTest;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.SavedLoginRepository;
import com.nammamedmate.server.persistence.StaffRegistrationRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.UserSessionRepository;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

class StaffOnboardingRollbackTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";

  @Autowired private MockMvc mockMvc;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private StaffRegistrationRepository staffRegistrationRepository;
  @Autowired private UserSessionRepository userSessionRepository;
  @Autowired private SavedLoginRepository savedLoginRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @BeforeEach
  void wipe() {
    savedLoginRepository.deleteAll();
    userSessionRepository.deleteAll();
    staffRegistrationRepository.deleteAll();
    appUserRepository.deleteAll();
    tenantRepository.deleteAll();
  }

  @Test
  void ac05_invalidCreateLeavesNoUserOrRegistration() throws Exception {
    Tenant tenant = persistTenant("roll-pharma");
    persistUser(tenant.getId(), "owner@roll.local", AppUserRole.pharmacy_owner);
    Cookie cookie = login("owner@roll.local");
    long users = appUserRepository.count();

    mockMvc
        .perform(
            post("/api/v1/users")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"displayName\":\"Asha\",\"phone\":\"9876543210\",\"email\":\"rx@roll.local\",\"password\":\"till-pass-1\",\"role\":\"pharmacy_staff\",\"kind\":\"PHARMACIST\",\"licenseNumber\":\"\"}"))
        .andExpect(status().isUnprocessableEntity());

    assertThat(appUserRepository.count()).isEqualTo(users);
    assertThat(staffRegistrationRepository.count()).isZero();
    assertThat(appUserRepository.findByNormalizedEmailAndDeletedAtIsNull("rx@roll.local"))
        .isEmpty();
  }

  @Test
  void ac05_shortPasswordLeavesNoPartialStaff() throws Exception {
    Tenant tenant = persistTenant("short-pharma");
    persistUser(tenant.getId(), "owner@short.local", AppUserRole.pharmacy_owner);
    Cookie cookie = login("owner@short.local");
    long users = appUserRepository.count();

    mockMvc
        .perform(
            post("/api/v1/users")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"displayName\":\"Asha\",\"phone\":\"9876543210\",\"email\":\"short@roll.local\",\"password\":\"short\",\"role\":\"pharmacy_staff\",\"kind\":\"STAFF\"}"))
        .andExpect(status().isBadRequest());

    assertThat(appUserRepository.count()).isEqualTo(users);
    assertThat(staffRegistrationRepository.count()).isZero();
  }

  private Cookie login(String email) throws Exception {
    Cookie cookie =
        mockMvc
            .perform(
                post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getCookie("nmm_access");
    assertThat(cookie).isNotNull();
    return cookie;
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

  private AppUser persistUser(UUID tenantId, String email, AppUserRole role) {
    Instant now = Instant.parse("2026-09-01T00:00:00Z");
    AppUser user = new AppUser();
    user.setId(UUID.randomUUID());
    user.setTenantId(tenantId);
    user.setEmail(email);
    user.setPasswordHash(passwordEncoder.encode(PASSWORD));
    user.setDisplayName("Test");
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
