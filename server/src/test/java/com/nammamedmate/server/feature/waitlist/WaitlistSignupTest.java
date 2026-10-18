package com.nammamedmate.server.feature.waitlist;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.nammamedmate.server.AbstractIntegrationTest;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.domain.WaitlistSignup;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.WaitlistSignupRepository;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

class WaitlistSignupTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final String VALID =
      """
      {"name":"Asha Rao","phone":"9845012345","pincode":"560034","age":28,"gender":"female","consent":true,"source":"home","lang":"en","offer":"premium-3m-v1"}
      """;

  @Autowired private MockMvc mockMvc;
  @Autowired private WaitlistSignupRepository waitlistSignupRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @Test
  void joinPersistsAndSamePhoneCanJoinAgain() throws Exception {
    mockMvc
        .perform(post("/api/v1/waitlist").contentType(MediaType.APPLICATION_JSON).content(VALID))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.name").value("Asha Rao"))
        .andExpect(jsonPath("$.data.phone").value("9845012345"))
        .andExpect(jsonPath("$.data.pincode").value("560034"))
        .andExpect(jsonPath("$.data.age").value(28))
        .andExpect(jsonPath("$.data.gender").value("female"))
        .andExpect(jsonPath("$.data.consent").value(true))
        .andExpect(jsonPath("$.data.source").value("home"))
        .andExpect(jsonPath("$.data.lang").value("en"))
        .andExpect(jsonPath("$.data.offer").value("premium-3m-v1"))
        .andExpect(jsonPath("$.data.createdAt").exists());

    mockMvc
        .perform(post("/api/v1/waitlist").contentType(MediaType.APPLICATION_JSON).content(VALID))
        .andExpect(status().isOk());

    assertThat(waitlistSignupRepository.count()).isEqualTo(2);
  }

  @Test
  void rejectsBadPhoneAgeAndConsent() throws Exception {
    mockMvc
        .perform(
            post("/api/v1/waitlist")
                .contentType(MediaType.APPLICATION_JSON)
                .content(VALID.replace("9845012345", "12345")))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

    mockMvc
        .perform(
            post("/api/v1/waitlist")
                .contentType(MediaType.APPLICATION_JSON)
                .content(VALID.replace("\"age\":28", "\"age\":17")))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

    mockMvc
        .perform(
            post("/api/v1/waitlist")
                .contentType(MediaType.APPLICATION_JSON)
                .content(VALID.replace("\"consent\":true", "\"consent\":false")))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

    assertThat(waitlistSignupRepository.count()).isZero();
  }

  @Test
  void honeypotReturnsSuccessAndWritesNothing() throws Exception {
    String body =
        VALID.replace(
            "\"offer\":\"premium-3m-v1\"",
            "\"offer\":\"premium-3m-v1\",\"companyWebsite\":\"https://spam.test\"");
    mockMvc
        .perform(post("/api/v1/waitlist").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data").value(nullValue()));
    assertThat(waitlistSignupRepository.count()).isZero();
  }

  @Test
  void listIsMasterOnlyAndNewestFirst() throws Exception {
    persistSignup("Older", Instant.parse("2026-10-01T00:00:00Z"));
    persistSignup("Newer", Instant.parse("2026-10-02T00:00:00Z"));
    persistUser("owner@list.local", AppUserRole.pharmacy_owner);
    persistUser("ops@hq.local", AppUserRole.admin_super);
    Cookie owner = login("owner@list.local");
    Cookie master = login("ops@hq.local");

    mockMvc.perform(get("/api/v1/admin/waitlist")).andExpect(status().isUnauthorized());

    mockMvc
        .perform(get("/api/v1/admin/waitlist").cookie(owner))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));

    mockMvc
        .perform(get("/api/v1/admin/waitlist").cookie(master))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items.length()").value(2))
        .andExpect(jsonPath("$.data.items[0].name").value("Newer"))
        .andExpect(jsonPath("$.data.items[1].name").value("Older"));
  }

  private void persistSignup(String name, Instant createdAt) {
    WaitlistSignup row = new WaitlistSignup();
    row.setId(UUID.randomUUID());
    row.setName(name);
    row.setPhone("9845012345");
    row.setPincode("560034");
    row.setAge(30);
    row.setGender("female");
    row.setConsent(true);
    row.setSource("home");
    row.setLang("en");
    row.setOffer("premium-3m-v1");
    row.setCreatedAt(createdAt);
    waitlistSignupRepository.saveAndFlush(row);
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

  private AppUser persistUser(String email, AppUserRole role) {
    Instant now = Instant.parse("2026-09-01T00:00:00Z");
    AppUser user = new AppUser();
    user.setId(UUID.randomUUID());
    user.setTenantId(null);
    user.setEmail(email);
    user.setPasswordHash(passwordEncoder.encode(PASSWORD));
    user.setDisplayName("Test " + email);
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
