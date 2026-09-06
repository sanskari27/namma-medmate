package com.nammamedmate.server.feature.communications;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.nammamedmate.server.AbstractIntegrationTest;
import com.nammamedmate.server.application.communications.RefillDueScanner;
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
import com.nammamedmate.server.domain.WhatsAppMessagePolicy;
import com.nammamedmate.server.domain.WhatsAppMessageStatus;
import com.nammamedmate.server.infrastructure.whatsapp.MetaWhatsAppAdapter;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import com.nammamedmate.server.persistence.WhatsAppApprovedStructureRepository;
import com.nammamedmate.server.persistence.WhatsAppMessageRepository;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

class WhatsAppMessageRollbackTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-06T13:00:00Z");

  @MockBean private MetaWhatsAppAdapter metaWhatsAppAdapter;

  @Autowired private MockMvc mockMvc;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private WhatsAppApprovedStructureRepository structureRepository;
  @Autowired private WhatsAppMessageRepository messageRepository;
  @Autowired private RefillDueScanner refillDueScanner;
  @Autowired private PasswordEncoder passwordEncoder;

  @BeforeEach
  void seedCatalogue() {
    persistStructure(
        "refill_due",
        "Hi {{customer_name}}, your refill for {{medicine_name}} is due. Visit {{pharmacy_name}} to restock.",
        List.of("pharmacy_name"),
        List.of("customer_name", "medicine_name"),
        "meta-refill-due");
    persistStructure(
        "campaign",
        "Hi {{customer_name}}, {{pharmacy_name}} has an update for you.",
        List.of("pharmacy_name"),
        List.of("customer_name"),
        "meta-campaign");
  }

  @Test
  void adapterFailureLeavesFailedOutcome() throws Exception {
    Fixture fx = seed("roll-send");
    UUID customerId = createCustomer(fx.cookie(), "Roll Patient", "9412000001");
    mockMvc
        .perform(
            post("/api/v1/customers/" + customerId + "/refills")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"medicineName\":\"Atorva\",\"nextDueOn\":\"2026-08-01\"}"))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            put("/api/v1/communications/whatsapp/templates/refill_due/variables")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"variables\":{\"pharmacy_name\":\"Varshmaan\"}}"))
        .andExpect(status().isOk());
    when(metaWhatsAppAdapter.sendTemplate(any(), any(), any()))
        .thenThrow(new IllegalStateException("graph down"));

    refillDueScanner.scanTenant(fx.tenantId());

    assertThat(messageRepository.findAll())
        .hasSize(1)
        .first()
        .satisfies(
            row -> {
              assertThat(row.getStatus()).isEqualTo(WhatsAppMessageStatus.FAILED);
              assertThat(row.getFailureCode())
                  .isEqualTo(WhatsAppMessagePolicy.PROVIDER_UNAVAILABLE);
            });
  }

  @Test
  void unapprovedCampaignSendLeavesNoMessage() throws Exception {
    Fixture fx = seed("roll-unap");
    UUID tagId =
        UUID.fromString(
            objectMapperId(
                mockMvc
                    .perform(
                        post("/api/v1/customers/tags")
                            .cookie(fx.cookie())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"name\":\"diabetic\"}"))
                    .andExpect(status().isOk())
                    .andReturn()
                    .getResponse()
                    .getContentAsString()));
    mockMvc
        .perform(
            post("/api/v1/campaigns")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"name\":\"No overlay\",\"tagIds\":[\""
                        + tagId
                        + "\"],\"templateUniqueName\":\"campaign\",\"variables\":{\"pharmacy_name\":\"X\"}}"))
        .andExpect(status().isUnprocessableEntity());
    mockMvc
        .perform(
            post("/api/v1/communications/whatsapp/messages/campaigns/" + UUID.randomUUID())
                .cookie(fx.cookie()))
        .andExpect(status().isNotFound());
    assertThat(messageRepository.count()).isZero();
  }

  private String objectMapperId(String body) throws Exception {
    return new com.fasterxml.jackson.databind.ObjectMapper()
        .readTree(body)
        .path("data")
        .path("id")
        .asText();
  }

  private UUID createCustomer(Cookie cookie, String name, String phone) throws Exception {
    String body =
        mockMvc
            .perform(
                post("/api/v1/customers")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":\"" + name + "\",\"phone\":\"" + phone + "\"}"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return UUID.fromString(
        new com.fasterxml.jackson.databind.ObjectMapper()
            .readTree(body)
            .path("data")
            .path("id")
            .asText());
  }

  private void persistStructure(
      String uniqueName,
      String body,
      List<String> tenantSlots,
      List<String> runtimeSlots,
      String metaTemplateId) {
    if (structureRepository.findByUniqueName(uniqueName).isPresent()) {
      return;
    }
    WhatsAppApprovedStructure structure = new WhatsAppApprovedStructure();
    structure.setId(UUID.randomUUID());
    structure.setUniqueName(uniqueName);
    structure.setBody(body);
    structure.setTenantSlots(tenantSlots);
    structure.setRuntimeSlots(runtimeSlots);
    structure.setMetaTemplateId(metaTemplateId);
    structure.setStatus(WhatsAppApprovalStatus.APPROVED);
    structure.setCreatedAt(T0);
    structure.setUpdatedAt(T0);
    structureRepository.saveAndFlush(structure);
  }

  private Fixture seed(String tag) throws Exception {
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
    return new Fixture(tenant.getId(), login(tag + "@varshmaan.local"));
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

  private record Fixture(UUID tenantId, Cookie cookie) {}
}
