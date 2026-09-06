package com.nammamedmate.server.feature.campaign;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.AbstractIntegrationTest;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.CampaignPolicy;
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
import com.nammamedmate.server.persistence.CampaignRecipientRepository;
import com.nammamedmate.server.persistence.CampaignRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import com.nammamedmate.server.persistence.WhatsAppApprovedStructureRepository;
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

class CampaignRollbackTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-06T12:30:00Z");
  private static final String PATH = "/api/v1/campaigns";

  @MockBean private MetaWhatsAppAdapter metaWhatsAppAdapter;

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private CampaignRepository campaignRepository;
  @Autowired private CampaignRecipientRepository recipientRepository;
  @Autowired private WhatsAppApprovedStructureRepository structureRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @BeforeEach
  void seedCatalogue() {
    WhatsAppApprovedStructure structure = new WhatsAppApprovedStructure();
    structure.setId(UUID.randomUUID());
    structure.setUniqueName("campaign");
    structure.setBody("Hi {{customer_name}}, {{pharmacy_name}} has an update for you.");
    structure.setTenantSlots(List.of("pharmacy_name"));
    structure.setRuntimeSlots(List.of("customer_name"));
    structure.setMetaTemplateId("meta-campaign");
    structure.setStatus(WhatsAppApprovalStatus.APPROVED);
    structure.setCreatedAt(T0);
    structure.setUpdatedAt(T0);
    structureRepository.saveAndFlush(structure);
  }

  @Test
  void ac05_failedDraftAndPreviewLeaveNoPartialCampaignOrSend() throws Exception {
    Cookie cookie = seedOwner("camp-roll");
    UUID tagId = createTag(cookie, "diabetic");
    mockMvc
        .perform(
            put("/api/v1/communications/whatsapp/templates/campaign/variables")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"variables\":{\"pharmacy_name\":\"Varshmaan\"}}"))
        .andExpect(status().isOk());

    mockMvc
        .perform(
            post(PATH)
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"name\":\"Broken\",\"tagIds\":[\""
                        + tagId
                        + "\"],\"templateUniqueName\":\"campaign\",\"variables\":{\"customer_name\":\"Ravi\"}}"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value(CampaignPolicy.UNKNOWN_VARIABLE));
    assertThat(campaignRepository.count()).isZero();
    assertThat(recipientRepository.count()).isZero();

    String created =
        mockMvc
            .perform(
                post(PATH)
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        "{\"name\":\"Empty list\",\"tagIds\":[\""
                            + tagId
                            + "\"],\"templateUniqueName\":\"campaign\",\"variables\":{\"pharmacy_name\":\"Varshmaan\"}}"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    UUID campaignId = UUID.fromString(objectMapper.readTree(created).at("/data/id").asText());
    mockMvc
        .perform(
            post(PATH + "/" + campaignId + "/preview")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expectedVersion\":1}"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value(CampaignPolicy.EMPTY_AUDIENCE));
    assertThat(campaignRepository.findById(campaignId).orElseThrow().getPreviewedAt()).isNull();
    assertThat(recipientRepository.count()).isZero();
    mockMvc
        .perform(
            post(PATH + "/" + campaignId + "/ready")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expectedVersion\":1}"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value(CampaignPolicy.PREVIEW_REQUIRED));
    assertThat(recipientRepository.count()).isZero();
    verifyNoInteractions(metaWhatsAppAdapter);
  }

  private UUID createTag(Cookie cookie, String name) throws Exception {
    String body =
        mockMvc
            .perform(
                post("/api/v1/customers/tags")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":\"" + name + "\"}"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return UUID.fromString(objectMapper.readTree(body).path("data").path("id").asText());
  }

  private Cookie seedOwner(String tag) throws Exception {
    Tenant tenant = new Tenant();
    tenant.setId(UUID.randomUUID());
    tenant.setSlug(tag);
    tenant.setName("Pharmacy " + tag);
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
    AppUser user = new AppUser();
    user.setId(UUID.randomUUID());
    user.setTenantId(tenant.getId());
    user.setEmail(tag + ".owner@varshmaan.local");
    user.setPasswordHash(passwordEncoder.encode(PASSWORD));
    user.setDisplayName("Owner");
    user.setRole(AppUserRole.pharmacy_owner);
    user.setActive(true);
    user.setStatus(UserAccountStatus.ACTIVE);
    user.setMustChangePassword(false);
    user.setCreatedAt(T0);
    user.setUpdatedAt(T0);
    user.setPasswordChangedAt(T0);
    appUserRepository.saveAndFlush(user);
    MvcResult result =
        mockMvc
            .perform(
                post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        "{\"email\":\""
                            + user.getEmail()
                            + "\",\"password\":\""
                            + PASSWORD
                            + "\"}"))
            .andExpect(status().isOk())
            .andReturn();
    Cookie cookie = result.getResponse().getCookie("nmm_access");
    assertThat(cookie).isNotNull();
    return cookie;
  }
}
