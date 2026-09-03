package com.nammamedmate.server.feature.branch;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.TenantRepository;
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
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
class BranchMasterRollbackTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-03T10:00:00Z");

  @Container
  static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:16-alpine")
          .withDatabaseName("nammamedmate_branch_rollback")
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
  @Autowired private LocationRepository locationRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @BeforeEach
  void wipe() {
    userSessionRepository.deleteAll();
    locationRepository.deleteAll();
    appUserRepository.deleteAll();
    tenantRepository.deleteAll();
  }

  @Test
  void invalidHoursLeavesNoPartialBranch() throws Exception {
    Tenant tenant = persistTenant("roll", "Roll Chemist", TenantStatus.ACTIVE);
    persistOwner(tenant.getId(), "owner@roll.local");
    Cookie cookie = login("owner@roll.local");

    mockMvc
        .perform(
            post("/api/v1/branches")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "name":"Broken Hours",
                      "addressLine":"1 Road",
                      "city":"Bengaluru",
                      "state":"KA",
                      "pincode":"560001",
                      "contactPhone":"9876543210",
                      "drugLicenseNumber":"DL-ROLL",
                      "branchType":"RETAIL",
                      "defaultBranch":true,
                      "operatingHours":{"mon":{"open":"21:00","close":"09:00"}}
                    }
                    """))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("INVALID_HOURS"));

    assertThat(
            locationRepository.findAllByTenantIdAndDeletedAtIsNullOrderByBranchCodeAsc(
                tenant.getId()))
        .isEmpty();
  }

  @Test
  void missingLicenseLeavesNoPartialBranch() throws Exception {
    Tenant tenant = persistTenant("miss", "Miss Chemist", TenantStatus.ACTIVE);
    persistOwner(tenant.getId(), "owner@miss.local");
    Cookie cookie = login("owner@miss.local");

    mockMvc
        .perform(
            post("/api/v1/branches")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "name":"No License",
                      "addressLine":"1 Road",
                      "city":"Bengaluru",
                      "state":"KA",
                      "pincode":"560001",
                      "contactPhone":"9876543210",
                      "drugLicenseNumber":"",
                      "branchType":"RETAIL",
                      "defaultBranch":true
                    }
                    """))
        .andExpect(status().isBadRequest());

    assertThat(
            locationRepository.findAllByTenantIdAndDeletedAtIsNullOrderByBranchCodeAsc(
                tenant.getId()))
        .isEmpty();
  }

  private Tenant persistTenant(String slug, String name, TenantStatus status) {
    Tenant tenant = new Tenant();
    tenant.setId(UUID.randomUUID());
    tenant.setSlug(slug);
    tenant.setName(name);
    tenant.setStatus(status);
    tenant.setEmailVerifiedAt(T0);
    tenant.setCreatedAt(T0);
    tenant.setUpdatedAt(T0);
    return tenantRepository.saveAndFlush(tenant);
  }

  private AppUser persistOwner(UUID tenantId, String email) {
    AppUser user = new AppUser();
    user.setId(UUID.randomUUID());
    user.setTenantId(tenantId);
    user.setEmail(email);
    user.setPasswordHash(passwordEncoder.encode(PASSWORD));
    user.setDisplayName("Owner");
    user.setRole(AppUserRole.pharmacy_owner);
    user.setActive(true);
    user.setStatus(UserAccountStatus.ACTIVE);
    user.setCreatedAt(T0);
    user.setUpdatedAt(T0);
    return appUserRepository.saveAndFlush(user);
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
}
