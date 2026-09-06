package com.nammamedmate.server.feature.communications;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.nammamedmate.server.AbstractIntegrationTest;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.domain.WhatsAppApprovalStatus;
import com.nammamedmate.server.domain.WhatsAppApprovedStructure;
import com.nammamedmate.server.infrastructure.whatsapp.MetaWhatsAppAdapter;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import com.nammamedmate.server.persistence.WhatsAppApprovedStructureRepository;
import com.nammamedmate.server.persistence.WhatsAppProviderStatusRepository;
import com.nammamedmate.server.persistence.WhatsAppTenantTemplateRepository;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

class WhatsAppTemplateRollbackTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-06T06:30:00Z");
  private static final String PATH = "/api/v1/communications/whatsapp/templates";

  @MockBean private MetaWhatsAppAdapter metaWhatsAppAdapter;

  @Autowired private MockMvc mockMvc;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private WhatsAppApprovedStructureRepository structureRepository;
  @Autowired private WhatsAppTenantTemplateRepository overlayRepository;
  @Autowired private WhatsAppProviderStatusRepository providerStatusRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @org.junit.jupiter.api.BeforeEach
  void seedCatalogue() {
    WhatsAppApprovedStructure structure = new WhatsAppApprovedStructure();
    structure.setId(UUID.randomUUID());
    structure.setUniqueName("refill_due");
    structure.setBody(
        "Hi {{customer_name}}, your refill for {{medicine_name}} is due. Visit {{pharmacy_name}} to restock.");
    structure.setTenantSlots(List.of("pharmacy_name"));
    structure.setRuntimeSlots(List.of("customer_name", "medicine_name"));
    structure.setMetaTemplateId("meta-refill-due");
    structure.setStatus(WhatsAppApprovalStatus.APPROVED);
    structure.setCreatedAt(T0);
    structure.setUpdatedAt(T0);
    structureRepository.saveAndFlush(structure);
  }

  @Test
  void unknownVariableLeavesNoOverlay() throws Exception {
    Cookie cookie = seedOwner("roll-unk");
    mockMvc
        .perform(
            put(PATH + "/refill_due/variables")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"variables\":{\"pharmacy_name\":\"X\",\"extra\":\"nope\"}}"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("UNKNOWN_VARIABLE"));
    assertThat(overlayRepository.count()).isZero();
  }

  @Test
  void structuralRewriteLeavesNoOverlay() throws Exception {
    Cookie cookie = seedOwner("roll-body");
    mockMvc
        .perform(
            put(PATH + "/refill_due/variables")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"variables\":{\"pharmacy_name\":\"X\"},\"body\":\"rewritten\"}"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("STRUCTURAL_REWRITE"));
    assertThat(overlayRepository.count()).isZero();
  }

  @Test
  void adapterFailureLeavesNoProviderStatus() throws Exception {
    persistUser(null, "roll.master@nammamedmate.local", AppUserRole.admin_super);
    Cookie master = login("roll.master@nammamedmate.local");
    when(metaWhatsAppAdapter.fetchStatus()).thenThrow(new IllegalStateException("graph down"));

    mockMvc
        .perform(post(PATH + "/provider/sync").cookie(master))
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.code").value("PROVIDER_UNAVAILABLE"));
    assertThat(providerStatusRepository.count()).isZero();
  }

  private Cookie seedOwner(String tag) throws Exception {
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

    persistUser(tenant.getId(), tag + "@varshmaan.local", AppUserRole.pharmacy_owner);
    return login(tag + "@varshmaan.local");
  }

  private AppUser persistUser(UUID tenantId, String email, AppUserRole role) {
    AppUser user = new AppUser();
    user.setId(UUID.randomUUID());
    user.setTenantId(tenantId);
    user.setEmail(email);
    user.setPasswordHash(passwordEncoder.encode(PASSWORD));
    user.setDisplayName("Test " + email);
    user.setRole(role);
    user.setActive(true);
    user.setStatus(UserAccountStatus.ACTIVE);
    user.setMustChangePassword(false);
    user.setCreatedAt(T0);
    user.setUpdatedAt(T0);
    user.setPasswordChangedAt(T0);
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
