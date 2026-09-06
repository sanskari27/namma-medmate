package com.nammamedmate.server.feature.campaign;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.AbstractIntegrationTest;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.AuditEvent;
import com.nammamedmate.server.domain.CampaignPolicy;
import com.nammamedmate.server.domain.CampaignStatus;
import com.nammamedmate.server.domain.Customer;
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
import com.nammamedmate.server.persistence.AuditEventRepository;
import com.nammamedmate.server.persistence.CampaignRecipientRepository;
import com.nammamedmate.server.persistence.CampaignRepository;
import com.nammamedmate.server.persistence.CustomerRepository;
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

class CampaignTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-06T12:00:00Z");
  private static final String PATH = "/api/v1/campaigns";

  @MockBean private MetaWhatsAppAdapter metaWhatsAppAdapter;

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private CustomerRepository customerRepository;
  @Autowired private CampaignRepository campaignRepository;
  @Autowired private CampaignRecipientRepository recipientRepository;
  @Autowired private WhatsAppApprovedStructureRepository structureRepository;
  @Autowired private AuditEventRepository auditEventRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @BeforeEach
  void seedCatalogue() {
    persistStructure(
        "campaign",
        "Hi {{customer_name}}, {{pharmacy_name}} has an update for you.",
        List.of("pharmacy_name"),
        List.of("customer_name"),
        "meta-campaign");
  }

  @Test
  void ac01_draftTargetsSavedTenantSegmentAndApprovedNamespace() throws Exception {
    Fixture fx = seed("camp-ac01");
    UUID diabetic = createTag(fx.cookie(), "diabetic");
    createTag(fx.cookie(), "senior");
    UUID tagged = createCustomer(fx.cookie(), "Diabetic A", "9402000001");
    createCustomer(fx.cookie(), "Walk-in", "9402000002");
    assignTags(fx.cookie(), tagged, diabetic);
    approveCampaignTemplate(fx.cookie());

    MvcResult created =
        mockMvc
            .perform(
                post(PATH)
                    .cookie(fx.cookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(draftJson("Diabetes promo", diabetic)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.status").value("DRAFT"))
            .andExpect(jsonPath("$.data.templateUniqueName").value("campaign"))
            .andExpect(jsonPath("$.data.namespaceName").value(fx.tenantId() + "_campaign"))
            .andExpect(jsonPath("$.data.tagIds[0]").value(diabetic.toString()))
            .andReturn();
    UUID campaignId =
        UUID.fromString(
            objectMapper
                .readTree(created.getResponse().getContentAsString())
                .at("/data/id")
                .asText());

    mockMvc
        .perform(
            post(PATH + "/" + campaignId + "/preview")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expectedVersion\":1}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.recipientCount").value(1))
        .andExpect(jsonPath("$.data.tagIds[0]").value(diabetic.toString()));

    String body = created.getResponse().getContentAsString();
    assertThat(body).doesNotContain("9402000001");
    assertThat(body).doesNotContain("Diabetic A");
    verifyNoInteractions(metaWhatsAppAdapter);
  }

  @Test
  void ac02_campaignPermissionIsAssignableAndEnforced() throws Exception {
    Fixture fx = seed("camp-ac02");
    UUID diabetic = createTag(fx.cookie(), "diabetic");
    createCustomer(fx.cookie(), "Tagged", "9402000011");
    approveCampaignTemplate(fx.cookie());
    UUID campaignsRole = createRole(fx.cookie(), "Promo desk", "[\"CAMPAIGNS\"]");
    AppUser staff = persistUser(fx.tenantId(), "promo@camp-ac02.local", AppUserRole.pharmacy_staff);
    mockMvc
        .perform(
            put("/api/v1/users/" + staff.getId() + "/roles")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleIds\":[\"" + campaignsRole + "\"]}"))
        .andExpect(status().isOk());
    Cookie promo = login("promo@camp-ac02.local");

    mockMvc
        .perform(
            post(PATH)
                .cookie(promo)
                .contentType(MediaType.APPLICATION_JSON)
                .content(draftJson("Staff promo", diabetic)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("DRAFT"));

    UUID pharmacist = predefinedId(fx.cookie(), "pharmacist");
    AppUser rx = persistUser(fx.tenantId(), "rx@camp-ac02.local", AppUserRole.pharmacy_staff);
    mockMvc
        .perform(
            put("/api/v1/users/" + rx.getId() + "/roles")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleIds\":[\"" + pharmacist + "\"]}"))
        .andExpect(status().isOk());
    Cookie rxCookie = login("rx@camp-ac02.local");
    mockMvc
        .perform(
            post(PATH)
                .cookie(rxCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(draftJson("Rx promo", diabetic)))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value(CampaignPolicy.FORBIDDEN));

    mockMvc.perform(get(PATH)).andExpect(status().isUnauthorized());
  }

  @Test
  void ac03_previewRecordsCriteriaAndDedupedCountWithoutSending() throws Exception {
    Fixture fx = seed("camp-ac03");
    UUID diabetic = createTag(fx.cookie(), "diabetic");
    UUID senior = createTag(fx.cookie(), "senior");
    UUID both = createCustomer(fx.cookie(), "Both Tags", "9402000021");
    UUID onlyDiabetic = createCustomer(fx.cookie(), "Only Diabetic", "9402000022");
    assignTags(fx.cookie(), both, diabetic, senior);
    assignTags(fx.cookie(), onlyDiabetic, diabetic);
    approveCampaignTemplate(fx.cookie());
    UUID campaignId = createDraft(fx.cookie(), "Warm list", diabetic, senior);

    MvcResult preview =
        mockMvc
            .perform(
                post(PATH + "/" + campaignId + "/preview")
                    .cookie(fx.cookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"expectedVersion\":1}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.recipientCount").value(2))
            .andExpect(jsonPath("$.data.status").value("DRAFT"))
            .andExpect(jsonPath("$.data.previewedAt").isNotEmpty())
            .andExpect(jsonPath("$.data.tagIds.length()").value(2))
            .andReturn();
    String body = preview.getResponse().getContentAsString();
    assertThat(body).doesNotContain("9402000021");
    assertThat(body).doesNotContain("9402000022");
    assertThat(body).doesNotContain("Both Tags");
    assertThat(recipientRepository.count()).isZero();
    verifyNoInteractions(metaWhatsAppAdapter);

    List<AuditEvent> audits =
        auditEventRepository.findAll().stream()
            .filter(event -> CampaignPolicy.AUDIT_PREVIEW.equals(event.getAction()))
            .toList();
    assertThat(audits).isNotEmpty();
  }

  @Test
  void ac04_readyFreezesSnapshotWithoutProviderCall() throws Exception {
    Fixture fx = seed("camp-ac04");
    UUID diabetic = createTag(fx.cookie(), "diabetic");
    UUID tagged = createCustomer(fx.cookie(), "Ready Patient", "9402000031");
    assignTags(fx.cookie(), tagged, diabetic);
    approveCampaignTemplate(fx.cookie());
    UUID campaignId = createDraft(fx.cookie(), "Ready blast", diabetic);
    mockMvc
        .perform(
            post(PATH + "/" + campaignId + "/preview")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expectedVersion\":1}"))
        .andExpect(status().isOk());

    mockMvc
        .perform(
            post(PATH + "/" + campaignId + "/ready")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expectedVersion\":2}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("READY_FOR_DELIVERY"))
        .andExpect(jsonPath("$.data.recipientCount").value(1))
        .andExpect(jsonPath("$.data.frozenAt").isNotEmpty());

    assertThat(campaignRepository.findById(campaignId))
        .get()
        .extracting(row -> row.getStatus())
        .isEqualTo(CampaignStatus.READY_FOR_DELIVERY);
    assertThat(recipientRepository.findAllByTenantIdAndCampaignId(fx.tenantId(), campaignId))
        .hasSize(1)
        .first()
        .extracting(row -> row.getCustomerId())
        .isEqualTo(tagged);
    verifyNoInteractions(metaWhatsAppAdapter);

    mockMvc
        .perform(
            post(PATH + "/" + campaignId + "/ready")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expectedVersion\":3}"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value(CampaignPolicy.READY_ALREADY));
    assertThat(recipientRepository.count()).isEqualTo(1);

    List<AuditEvent> audits =
        auditEventRepository.findAll().stream()
            .filter(event -> CampaignPolicy.AUDIT_READY.equals(event.getAction()))
            .toList();
    assertThat(audits).isNotEmpty();
  }

  @Test
  void ac05_isolationEmptyAudienceInvalidVarsAndNoDisclosure() throws Exception {
    Fixture a = seed("camp-a");
    Fixture b = seed("camp-b");
    UUID tagA = createTag(a.cookie(), "diabetic");
    UUID taggedA = createCustomer(a.cookie(), "Secret Patient", "9402000041");
    assignTags(a.cookie(), taggedA, tagA);
    approveCampaignTemplate(a.cookie());
    approveCampaignTemplate(b.cookie());
    UUID campaignA = createDraft(a.cookie(), "A list", tagA);

    mockMvc
        .perform(get(PATH + "/" + campaignA).cookie(b.cookie()))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value(CampaignPolicy.NOT_FOUND));
    mockMvc
        .perform(get(PATH).cookie(b.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items.length()").value(0));

    Customer hidden = customerRepository.findById(taggedA).orElseThrow();
    hidden.setDeletedAt(T0);
    customerRepository.saveAndFlush(hidden);
    mockMvc
        .perform(
            post(PATH + "/" + campaignA + "/preview")
                .cookie(a.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expectedVersion\":1}"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value(CampaignPolicy.EMPTY_AUDIENCE));
    assertThat(recipientRepository.count()).isZero();
    assertThat(campaignRepository.findById(campaignA).orElseThrow().getPreviewedAt()).isNull();

    long before = campaignRepository.count();
    mockMvc
        .perform(
            post(PATH)
                .cookie(a.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"name\":\"Bad vars\",\"tagIds\":[\""
                        + tagA
                        + "\"],\"templateUniqueName\":\"campaign\",\"variables\":{\"customer_name\":\"Ravi\"}}"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value(CampaignPolicy.UNKNOWN_VARIABLE));
    assertThat(campaignRepository.count()).isEqualTo(before);

    persistStructure(
        "pending_promo",
        "Hi {{customer_name}} from {{pharmacy_name}}.",
        List.of("pharmacy_name"),
        List.of("customer_name"),
        "meta-pending");
    structureRepository
        .findByUniqueName("pending_promo")
        .ifPresent(
            row -> {
              row.setStatus(WhatsAppApprovalStatus.PENDING);
              structureRepository.saveAndFlush(row);
            });
    mockMvc
        .perform(
            post(PATH)
                .cookie(a.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"name\":\"Pending\",\"tagIds\":[\""
                        + tagA
                        + "\"],\"templateUniqueName\":\"pending_promo\",\"variables\":{\"pharmacy_name\":\"X\"}}"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value(CampaignPolicy.UNAPPROVED_TEMPLATE));

    mockMvc
        .perform(
            post(PATH).cookie(a.cookie()).contentType(MediaType.APPLICATION_JSON).content("{}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    verifyNoInteractions(metaWhatsAppAdapter);
  }

  @Test
  void ac05_stalePreviewOrReadyExpectedVersionConflicts() throws Exception {
    Fixture fx = seed("camp-stale");
    UUID diabetic = createTag(fx.cookie(), "diabetic");
    UUID tagged = createCustomer(fx.cookie(), "Stale Patient", "9402000051");
    assignTags(fx.cookie(), tagged, diabetic);
    approveCampaignTemplate(fx.cookie());
    UUID campaignId = createDraft(fx.cookie(), "Stale blast", diabetic);

    mockMvc
        .perform(
            post(PATH + "/" + campaignId + "/preview")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expectedVersion\":99}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value(CampaignPolicy.STALE_STATE));
    assertThat(campaignRepository.findById(campaignId).orElseThrow().getPreviewedAt()).isNull();

    mockMvc
        .perform(
            post(PATH + "/" + campaignId + "/preview")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expectedVersion\":1}"))
        .andExpect(status().isOk());

    mockMvc
        .perform(
            post(PATH + "/" + campaignId + "/ready")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expectedVersion\":1}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value(CampaignPolicy.STALE_STATE));
    assertThat(recipientRepository.count()).isZero();
    assertThat(campaignRepository.findById(campaignId).orElseThrow().getStatus())
        .isEqualTo(CampaignStatus.DRAFT);
    verifyNoInteractions(metaWhatsAppAdapter);
  }

  private UUID createDraft(Cookie cookie, String name, UUID... tags) throws Exception {
    String body =
        mockMvc
            .perform(
                post(PATH)
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(draftJson(name, tags)))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return UUID.fromString(objectMapper.readTree(body).at("/data/id").asText());
  }

  private String draftJson(String name, UUID... tags) {
    StringBuilder ids = new StringBuilder();
    for (int i = 0; i < tags.length; i++) {
      if (i > 0) {
        ids.append(',');
      }
      ids.append('"').append(tags[i]).append('"');
    }
    return "{\"name\":\""
        + name
        + "\",\"tagIds\":["
        + ids
        + "],\"templateUniqueName\":\"campaign\",\"variables\":{\"pharmacy_name\":\"Varshmaan\"}}";
  }

  private void approveCampaignTemplate(Cookie cookie) throws Exception {
    mockMvc
        .perform(
            put("/api/v1/communications/whatsapp/templates/campaign/variables")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"variables\":{\"pharmacy_name\":\"Varshmaan\"}}"))
        .andExpect(status().isOk());
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

  private void assignTags(Cookie cookie, UUID customerId, UUID... tagIds) throws Exception {
    StringBuilder ids = new StringBuilder();
    for (int i = 0; i < tagIds.length; i++) {
      if (i > 0) {
        ids.append(',');
      }
      ids.append('"').append(tagIds[i]).append('"');
    }
    mockMvc
        .perform(
            put("/api/v1/customers/" + customerId + "/tags")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"tagIds\":[" + ids + "]}"))
        .andExpect(status().isOk());
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
    return UUID.fromString(objectMapper.readTree(body).path("data").path("id").asText());
  }

  private UUID createRole(Cookie owner, String name, String modulesJson) throws Exception {
    String body =
        mockMvc
            .perform(
                post("/api/v1/roles")
                    .cookie(owner)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":\"" + name + "\",\"modules\":" + modulesJson + "}"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return UUID.fromString(objectMapper.readTree(body).path("data").path("id").asText());
  }

  private UUID predefinedId(Cookie cookie, String code) throws Exception {
    String body =
        mockMvc
            .perform(get("/api/v1/roles").cookie(cookie))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    for (JsonNode role : objectMapper.readTree(body).path("data").path("roles")) {
      if (code.equals(role.path("code").asText())) {
        return UUID.fromString(role.path("id").asText());
      }
    }
    throw new AssertionError("missing predefined role " + code);
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
    Tenant tenant = persistTenant(tag, "Pharmacy " + tag);
    persistPlan(tenant.getId());
    persistUser(tenant.getId(), tag + ".owner@varshmaan.local", AppUserRole.pharmacy_owner);
    return new Fixture(tenant.getId(), login(tag + ".owner@varshmaan.local"));
  }

  private void persistPlan(UUID tenantId) {
    TenantSubscription subscription = new TenantSubscription();
    subscription.setId(UUID.randomUUID());
    subscription.setTenantId(tenantId);
    subscription.setPlanCode(PlanCode.FREE);
    subscription.setStatus(SubscriptionStatus.ACTIVE);
    subscription.setStartedAt(T0);
    subscription.setCreatedAt(T0);
    subscription.setUpdatedAt(T0);
    tenantSubscriptionRepository.saveAndFlush(subscription);
  }

  private Tenant persistTenant(String slug, String name) {
    Tenant tenant = new Tenant();
    tenant.setId(UUID.randomUUID());
    tenant.setSlug(slug);
    tenant.setName(name);
    tenant.setStatus(TenantStatus.ACTIVE);
    tenant.setEmailVerifiedAt(T0);
    tenant.setCreatedAt(T0);
    tenant.setUpdatedAt(T0);
    return tenantRepository.saveAndFlush(tenant);
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
