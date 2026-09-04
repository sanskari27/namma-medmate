package com.nammamedmate.server.feature.kyc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.nammamedmate.server.AbstractIntegrationTest;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.KycDocumentRepository;
import com.nammamedmate.server.persistence.KycSubmissionRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.UserSessionRepository;
import jakarta.servlet.http.Cookie;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;

class KycRollbackTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";

  @Autowired private MockMvc mockMvc;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private UserSessionRepository userSessionRepository;
  @Autowired private KycSubmissionRepository kycSubmissionRepository;
  @Autowired private KycDocumentRepository kycDocumentRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @BeforeEach
  void wipe() {
    kycDocumentRepository.deleteAll();
    kycSubmissionRepository.deleteAll();
    userSessionRepository.deleteAll();
    appUserRepository.deleteAll();
    tenantRepository.deleteAll();
  }

  @Test
  void ac05_unsupportedFileLeavesNoSubmissionOrDocuments() throws Exception {
    Tenant tenant = persistPendingTenant("roll-kyc", "Roll Kyc");
    persistOwner(tenant.getId(), "owner@roll-kyc.local");
    Cookie cookie = login("owner@roll-kyc.local");

    MockMultipartHttpServletRequestBuilder builder =
        multipart("/api/v1/tenants/" + tenant.getId() + "/kyc")
            .file(
                new MockMultipartFile(
                    "drugLicense",
                    "license.pdf",
                    "application/pdf",
                    "%PDF".getBytes(StandardCharsets.UTF_8)))
            .file(
                new MockMultipartFile(
                    "panDocument",
                    "pan.txt",
                    "text/plain",
                    "bad".getBytes(StandardCharsets.UTF_8)));
    builder.param("legalName", "Roll");
    builder.param("drugLicenseNumber", "DL-1");
    builder.param("pan", "ABCDE1234F");
    builder.param("addressLine1", "1 Road");
    builder.param("city", "Bengaluru");
    builder.param("state", "KA");
    builder.param("pincode", "560001");
    builder.param("contactPhone", "9876543210");

    mockMvc
        .perform(builder.cookie(cookie))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("UNSUPPORTED_FILE"));

    assertThat(kycSubmissionRepository.findAll()).isEmpty();
    assertThat(kycDocumentRepository.findAll()).isEmpty();
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

  private Tenant persistPendingTenant(String slug, String name) {
    Tenant tenant = new Tenant();
    tenant.setId(UUID.randomUUID());
    tenant.setName(name);
    tenant.setSlug(slug);
    Instant now = Instant.parse("2026-09-01T00:00:00Z");
    tenant.setStatus(TenantStatus.VERIFICATION_REQUIRED);
    tenant.setEmailVerifiedAt(now);
    tenant.setCreatedAt(now);
    tenant.setUpdatedAt(now);
    return tenantRepository.saveAndFlush(tenant);
  }

  private void persistOwner(UUID tenantId, String email) {
    Instant now = Instant.parse("2026-09-01T00:00:00Z");
    AppUser user = new AppUser();
    user.setId(UUID.randomUUID());
    user.setTenantId(tenantId);
    user.setEmail(email);
    user.setPasswordHash(passwordEncoder.encode(PASSWORD));
    user.setDisplayName("Test " + email);
    user.setPhone("9000000000");
    user.setRole(AppUserRole.pharmacy_owner);
    user.setActive(true);
    user.setStatus(UserAccountStatus.ACTIVE);
    user.setPasswordChangedAt(now);
    user.setMustChangePassword(false);
    user.setCreatedAt(now);
    user.setUpdatedAt(now);
    appUserRepository.saveAndFlush(user);
  }
}
