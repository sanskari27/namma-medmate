package com.nammamedmate.server.feature.communications;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.AbstractIntegrationTest;
import com.nammamedmate.server.application.communications.CreditDueScanner;
import com.nammamedmate.server.application.communications.RefillDueScanner;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.AuditEvent;
import com.nammamedmate.server.domain.CampaignPolicy;
import com.nammamedmate.server.domain.Customer;
import com.nammamedmate.server.domain.Notification;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.domain.WhatsAppApprovalStatus;
import com.nammamedmate.server.domain.WhatsAppApprovedStructure;
import com.nammamedmate.server.domain.WhatsAppMessage;
import com.nammamedmate.server.domain.WhatsAppMessageKind;
import com.nammamedmate.server.domain.WhatsAppMessagePolicy;
import com.nammamedmate.server.domain.WhatsAppMessageStatus;
import com.nammamedmate.server.infrastructure.whatsapp.MetaSendResult;
import com.nammamedmate.server.infrastructure.whatsapp.MetaWhatsAppAdapter;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.AuditEventRepository;
import com.nammamedmate.server.persistence.CustomerRepository;
import com.nammamedmate.server.persistence.NotificationRepository;
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

class WhatsAppMessageTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-06T12:00:00Z");
  private static final String PATH = "/api/v1/communications/whatsapp/messages";

  @MockBean private MetaWhatsAppAdapter metaWhatsAppAdapter;

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private CustomerRepository customerRepository;
  @Autowired private WhatsAppApprovedStructureRepository structureRepository;
  @Autowired private WhatsAppMessageRepository messageRepository;
  @Autowired private AuditEventRepository auditEventRepository;
  @Autowired private NotificationRepository notificationRepository;
  @Autowired private RefillDueScanner refillDueScanner;
  @Autowired private CreditDueScanner creditDueScanner;
  @Autowired private PasswordEncoder passwordEncoder;

  @BeforeEach
  void seedCatalogueAndAdapter() {
    when(metaWhatsAppAdapter.sendTemplate(any(), any(), any()))
        .thenReturn(MetaSendResult.sent("wamid.test"));
    persistStructure(
        "refill_due",
        "Hi {{customer_name}}, your refill for {{medicine_name}} is due. Visit {{pharmacy_name}} to restock.",
        List.of("pharmacy_name"),
        List.of("customer_name", "medicine_name"),
        "meta-refill-due");
    persistStructure(
        "credit_due",
        "Hi {{customer_name}}, your khata at {{pharmacy_name}} has an amount due.",
        List.of("pharmacy_name"),
        List.of("customer_name"),
        "meta-credit-due");
    persistStructure(
        "campaign",
        "Hi {{customer_name}}, {{pharmacy_name}} has an update for you.",
        List.of("pharmacy_name"),
        List.of("customer_name"),
        "meta-campaign");
    persistStructure(
        "birthday",
        "Happy birthday {{customer_name}} from {{pharmacy_name}}.",
        List.of("pharmacy_name"),
        List.of("customer_name"),
        "meta-birthday");
    persistStructure(
        "refill_due_warm",
        "Hello {{customer_name}}, it is time to refill {{medicine_name}} at {{pharmacy_name}}.",
        List.of("pharmacy_name"),
        List.of("customer_name", "medicine_name"),
        "meta-refill-due-warm");
  }

  @Test
  void ac01_whatsappIsOnlyCustomerChannelAndSmsIsAbsent() throws Exception {
    Fixture fx = seed("msg-ac01");
    approveTemplate(fx.cookie(), "campaign", "Varshmaan");
    mockMvc.perform(get(PATH).cookie(fx.cookie())).andExpect(status().isOk());
    mockMvc
        .perform(get("/api/v1/communications/sms").cookie(fx.cookie()))
        .andExpect(status().isNotFound());
    String body =
        mockMvc
            .perform(get(PATH).cookie(fx.cookie()))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    assertThat(body.toLowerCase()).doesNotContain("sms");
  }

  @Test
  void ac02_refillDueUsesApprovedRefillTemplate() throws Exception {
    Fixture fx = seed("msg-ac02r");
    UUID customerId = createCustomer(fx.cookie(), "Refill Patient", "9411000001");
    createRefill(fx.cookie(), customerId, "Amlodipine");
    approveTemplate(fx.cookie(), "refill_due", "Varshmaan");

    refillDueScanner.scanTenant(fx.tenantId());

    mockMvc
        .perform(get(PATH + "?kind=REFILL_DUE").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.items.length()").value(1))
        .andExpect(jsonPath("$.data.items[0].kind").value("REFILL_DUE"))
        .andExpect(jsonPath("$.data.items[0].templateUniqueName").value("refill_due"))
        .andExpect(jsonPath("$.data.items[0].status").value("SENT"))
        .andExpect(
            jsonPath("$.data.items[0].preview")
                .value(org.hamcrest.Matchers.containsString("Amlodipine")))
        .andExpect(
            jsonPath("$.data.items[0].preview")
                .value(org.hamcrest.Matchers.containsString("Varshmaan")));
    assertThat(messageRepository.findAll())
        .hasSize(1)
        .first()
        .extracting(WhatsAppMessage::getKind, WhatsAppMessage::getTemplateUniqueName)
        .containsExactly(WhatsAppMessageKind.REFILL_DUE, "refill_due");
  }

  @Test
  void ac02_creditDueUsesApprovedCreditTemplate() throws Exception {
    Fixture fx = seed("msg-ac02c");
    UUID customerId = createCustomer(fx.cookie(), "Khata Patient", "9411000002");
    setLimitAndCharge(fx.cookie(), customerId);
    approveTemplate(fx.cookie(), "credit_due", "Varshmaan");

    creditDueScanner.scanTenant(fx.tenantId());

    mockMvc
        .perform(get(PATH + "?kind=CREDIT_DUE").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items.length()").value(1))
        .andExpect(jsonPath("$.data.items[0].templateUniqueName").value("credit_due"))
        .andExpect(jsonPath("$.data.items[0].status").value("SENT"))
        .andExpect(
            jsonPath("$.data.items[0].preview")
                .value(org.hamcrest.Matchers.containsString("khata")));
  }

  @Test
  void ac03_creditDueNotifiesOwnerInternally() throws Exception {
    Fixture fx = seed("msg-ac03");
    UUID customerId = createCustomer(fx.cookie(), "Due Patient", "9411000003");
    setLimitAndCharge(fx.cookie(), customerId);
    approveTemplate(fx.cookie(), "credit_due", "Varshmaan");

    creditDueScanner.scanTenant(fx.tenantId());
    creditDueScanner.scanTenant(fx.tenantId());

    assertThat(messageRepository.count()).isEqualTo(1);
    List<Notification> inbox =
        notificationRepository.findAll().stream()
            .filter(row -> "credit_due".equals(row.getSourceType()))
            .toList();
    assertThat(inbox).isNotEmpty();
    assertThat(inbox.get(0).getHref()).isEqualTo("/credit");
    mockMvc
        .perform(get("/api/v1/notifications").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items[?(@.sourceType=='credit_due')]").isNotEmpty());
  }

  @Test
  void ac04_campaignSendsOnlyFrozenAudience() throws Exception {
    Fixture fx = seed("msg-ac04");
    UUID diabetic = createTag(fx.cookie(), "diabetic");
    UUID tagged = createCustomer(fx.cookie(), "Tagged Patient", "9411000004");
    createCustomer(fx.cookie(), "Walk-in", "9411000005");
    assignTags(fx.cookie(), tagged, diabetic);
    approveTemplate(fx.cookie(), "campaign", "Varshmaan");
    UUID campaignId = readyCampaign(fx.cookie(), diabetic);

    mockMvc
        .perform(post(PATH + "/campaigns/" + campaignId).cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items.length()").value(1))
        .andExpect(jsonPath("$.data.items[0].kind").value("CAMPAIGN"))
        .andExpect(jsonPath("$.data.items[0].templateUniqueName").value("campaign"))
        .andExpect(jsonPath("$.data.items[0].campaignId").value(campaignId.toString()))
        .andExpect(jsonPath("$.data.items[0].status").value("SENT"))
        .andExpect(jsonPath("$.data.sent").value(1));

    mockMvc
        .perform(post(PATH + "/campaigns/" + campaignId).cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items.length()").value(1));
    assertThat(messageRepository.count()).isEqualTo(1);
    assertThat(
            auditEventRepository.findAll().stream()
                .anyMatch(event -> WhatsAppMessagePolicy.AUDIT_SEND.equals(event.getAction())))
        .isTrue();
  }

  @Test
  void ac05_retriesAreIdempotentAndOutcomesAreRetained() throws Exception {
    Fixture fx = seed("msg-ac05");
    UUID customerId = createCustomer(fx.cookie(), "Retry Patient", "9411000006");
    createRefill(fx.cookie(), customerId, "Metformin");
    approveTemplate(fx.cookie(), "refill_due", "Varshmaan");
    doThrow(new IllegalStateException("graph down"))
        .when(metaWhatsAppAdapter)
        .sendTemplate(any(), any(), any());

    refillDueScanner.scanTenant(fx.tenantId());
    WhatsAppMessage failed = messageRepository.findAll().get(0);
    assertThat(failed.getStatus()).isEqualTo(WhatsAppMessageStatus.FAILED);
    assertThat(failed.getFailureCode()).isEqualTo(WhatsAppMessagePolicy.PROVIDER_UNAVAILABLE);
    UUID id = failed.getId();
    int attempts = failed.getAttemptCount();

    doReturn(MetaSendResult.sent("wamid.retry"))
        .when(metaWhatsAppAdapter)
        .sendTemplate(any(), any(), any());
    mockMvc
        .perform(post(PATH + "/" + id + "/retry").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.id").value(id.toString()))
        .andExpect(jsonPath("$.data.status").value("SENT"))
        .andExpect(jsonPath("$.data.providerMessageId").value("wamid.retry"));

    mockMvc
        .perform(post(PATH + "/" + id + "/retry").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("SENT"))
        .andExpect(jsonPath("$.data.providerMessageId").value("wamid.retry"));
    assertThat(messageRepository.count()).isEqualTo(1);
    assertThat(messageRepository.findById(id).orElseThrow().getAttemptCount())
        .isGreaterThanOrEqualTo(attempts);
    assertThat(
            auditEventRepository.findAll().stream()
                .map(AuditEvent::getAction)
                .anyMatch(WhatsAppMessagePolicy.AUDIT_RETRY::equals))
        .isTrue();
  }

  @Test
  void ac06_invalidPhoneUnapprovedReplayAndIsolationAreSafe() throws Exception {
    Fixture a = seed("msg-a");
    Fixture b = seed("msg-b");
    UUID diabetic = createTag(a.cookie(), "diabetic");
    UUID tagged = createCustomer(a.cookie(), "Secret Patient", "9411000007");
    assignTags(a.cookie(), tagged, diabetic);
    approveTemplate(a.cookie(), "campaign", "Varshmaan");
    UUID campaignA = readyCampaign(a.cookie(), diabetic);

    mockMvc
        .perform(post(PATH + "/campaigns/" + campaignA).cookie(b.cookie()))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value(WhatsAppMessagePolicy.NOT_FOUND));
    mockMvc
        .perform(get(PATH).cookie(b.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items.length()").value(0));

    Customer hidden = customerRepository.findById(tagged).orElseThrow();
    hidden.setPhone("xx");
    customerRepository.saveAndFlush(hidden);
    mockMvc
        .perform(post(PATH + "/campaigns/" + campaignA).cookie(a.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items[0].status").value("FAILED"))
        .andExpect(
            jsonPath("$.data.items[0].failureCode").value(WhatsAppMessagePolicy.INVALID_PHONE));

    UUID campaignsRole = createRole(a.cookie(), "Promo desk", "[\"CAMPAIGNS\"]");
    AppUser staff = persistUser(a.tenantId(), "promo@msg-a.local", AppUserRole.pharmacy_staff);
    mockMvc
        .perform(
            put("/api/v1/users/" + staff.getId() + "/roles")
                .cookie(a.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleIds\":[\"" + campaignsRole + "\"]}"))
        .andExpect(status().isOk());
    UUID pharmacist = predefinedId(a.cookie(), "pharmacist");
    AppUser rx = persistUser(a.tenantId(), "rx@msg-a.local", AppUserRole.pharmacy_staff);
    mockMvc
        .perform(
            put("/api/v1/users/" + rx.getId() + "/roles")
                .cookie(a.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleIds\":[\"" + pharmacist + "\"]}"))
        .andExpect(status().isOk());
    Cookie promo = login("promo@msg-a.local");
    mockMvc.perform(get(PATH).cookie(promo)).andExpect(status().isOk());
    Cookie rxCookie = login("rx@msg-a.local");
    mockMvc
        .perform(get(PATH).cookie(rxCookie))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value(CampaignPolicy.FORBIDDEN));
    mockMvc.perform(get(PATH)).andExpect(status().isUnauthorized());

    Fixture draft = seed("msg-draft");
    UUID tag = createTag(draft.cookie(), "diabetic");
    UUID patient = createCustomer(draft.cookie(), "Draft Patient", "9411000008");
    assignTags(draft.cookie(), patient, tag);
    approveTemplate(draft.cookie(), "campaign", "Varshmaan");
    UUID draftId = createDraft(draft.cookie(), "Not ready", tag);
    long before = messageRepository.count();
    mockMvc
        .perform(post(PATH + "/campaigns/" + draftId).cookie(draft.cookie()))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value(WhatsAppMessagePolicy.NOT_READY));
    assertThat(messageRepository.count()).isEqualTo(before);
  }

  private UUID readyCampaign(Cookie cookie, UUID tag) throws Exception {
    UUID campaignId = createDraft(cookie, "Ready blast", tag);
    mockMvc
        .perform(
            post("/api/v1/campaigns/" + campaignId + "/preview")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expectedVersion\":1}"))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            post("/api/v1/campaigns/" + campaignId + "/ready")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expectedVersion\":2}"))
        .andExpect(status().isOk());
    return campaignId;
  }

  private UUID createDraft(Cookie cookie, String name, UUID tag) throws Exception {
    String body =
        mockMvc
            .perform(
                post("/api/v1/campaigns")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        "{\"name\":\""
                            + name
                            + "\",\"tagIds\":[\""
                            + tag
                            + "\"],\"templateUniqueName\":\"campaign\",\"variables\":{\"pharmacy_name\":\"Varshmaan\"}}"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return UUID.fromString(objectMapper.readTree(body).at("/data/id").asText());
  }

  private void approveTemplate(Cookie cookie, String uniqueName, String pharmacy) throws Exception {
    mockMvc
        .perform(
            put("/api/v1/communications/whatsapp/templates/" + uniqueName + "/variables")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"variables\":{\"pharmacy_name\":\"" + pharmacy + "\"}}"))
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

  private void createRefill(Cookie cookie, UUID customerId, String medicine) throws Exception {
    mockMvc
        .perform(
            post("/api/v1/customers/" + customerId + "/refills")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"medicineName\":\"" + medicine + "\",\"nextDueOn\":\"2026-08-01\"}"))
        .andExpect(status().isOk());
  }

  private void setLimitAndCharge(Cookie cookie, UUID customerId) throws Exception {
    mockMvc
        .perform(
            put("/api/v1/customers/" + customerId + "/credit/limit")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"limitPaise\":50000,\"expectedVersion\":0}"))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            post("/api/v1/customers/" + customerId + "/credit/charges")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"amountPaise\":12000,\"invoiceId\":\""
                        + UUID.randomUUID()
                        + "\",\"idempotencyKey\":\"charge-"
                        + customerId
                        + "\",\"expectedVersion\":1}"))
        .andExpect(status().isOk());
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
