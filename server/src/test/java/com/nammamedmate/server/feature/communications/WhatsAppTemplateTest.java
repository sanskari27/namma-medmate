package com.nammamedmate.server.feature.communications;

import static org.assertj.core.api.Assertions.assertThat;
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
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.domain.WhatsAppApprovalStatus;
import com.nammamedmate.server.domain.WhatsAppApprovedStructure;
import com.nammamedmate.server.domain.WhatsAppTenantTemplate;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.AuditEventRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import com.nammamedmate.server.persistence.WhatsAppApprovedStructureRepository;
import com.nammamedmate.server.persistence.WhatsAppTenantTemplateRepository;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

class WhatsAppTemplateTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-06T06:00:00Z");
  private static final String PATH = "/api/v1/communications/whatsapp/templates";

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private WhatsAppApprovedStructureRepository structureRepository;
  @Autowired private WhatsAppTenantTemplateRepository overlayRepository;
  @Autowired private AuditEventRepository auditEventRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @org.junit.jupiter.api.BeforeEach
  void seedCatalogue() {
    persistStructure(
        "refill_due",
        "Hi {{customer_name}}, your refill for {{medicine_name}} is due. Visit {{pharmacy_name}} to restock.",
        List.of("pharmacy_name"),
        List.of("customer_name", "medicine_name"),
        "meta-refill-due");
    persistStructure(
        "refill_due_warm",
        "Hello {{customer_name}}, it is time to refill {{medicine_name}} at {{pharmacy_name}}.",
        List.of("pharmacy_name"),
        List.of("customer_name", "medicine_name"),
        "meta-refill-due-warm");
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
  }

  @Test
  void ac01_oneMasterOwnedNumberServesTenants() throws Exception {
    Fixture a = seedOwner("ac01a");
    Fixture b = seedOwner("ac01b");
    Cookie master = seedMaster("ac01m");

    MvcResult ownerA =
        mockMvc
            .perform(get(PATH).cookie(a.cookie()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.provider.displayNumber").value("+91 90000 00000"))
            .andExpect(jsonPath("$.data.provider.phoneNumberId").value("test-phone-id"))
            .andExpect(jsonPath("$.data.provider.token").doesNotExist())
            .andReturn();
    mockMvc
        .perform(get(PATH).cookie(b.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.provider.displayNumber").value("+91 90000 00000"))
        .andExpect(jsonPath("$.data.provider.phoneNumberId").value("test-phone-id"));
    mockMvc
        .perform(get(PATH).cookie(master))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.provider.displayNumber").value("+91 90000 00000"))
        .andExpect(jsonPath("$.data.provider.phoneNumberId").value("test-phone-id"))
        .andExpect(jsonPath("$.data.structures").isArray())
        .andExpect(jsonPath("$.data.templates").doesNotExist());

    String body = ownerA.getResponse().getContentAsString();
    assertThat(body).doesNotContain("token").doesNotContain("secret");
    assertThat(body).doesNotContain("wabaId");
  }

  @Test
  void ac02_templateIdentityIsTenantIdPlusUniqueName() throws Exception {
    Fixture a = seedOwner("ac02a");
    Fixture b = seedOwner("ac02b");

    mockMvc
        .perform(
            put(PATH + "/refill_due/variables")
                .cookie(a.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"variables\":{\"pharmacy_name\":\"Shop A\"}}"))
        .andExpect(status().isOk())
        .andExpect(
            jsonPath("$.data.namespaceName").value(a.tenantId() + "_refill_due"));
    mockMvc
        .perform(
            put(PATH + "/refill_due/variables")
                .cookie(b.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"variables\":{\"pharmacy_name\":\"Shop B\"}}"))
        .andExpect(status().isOk())
        .andExpect(
            jsonPath("$.data.namespaceName").value(b.tenantId() + "_refill_due"));

    mockMvc
        .perform(get(PATH + "/refill_due").cookie(a.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.variables.pharmacy_name").value("Shop A"))
        .andExpect(jsonPath("$.data.namespaceName").value(a.tenantId() + "_refill_due"));
    mockMvc
        .perform(get(PATH + "/refill_due").cookie(b.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.variables.pharmacy_name").value("Shop B"));
  }

  @Test
  void ac02_namespaceCollisionIsConflict() throws Exception {
    Fixture a = seedOwner("ac02c");
    Fixture b = seedOwner("ac02d");
    WhatsAppTenantTemplate spoof = new WhatsAppTenantTemplate();
    spoof.setId(UUID.randomUUID());
    spoof.setTenantId(b.tenantId());
    spoof.setUniqueName("refill_due");
    spoof.setNamespaceName(a.tenantId() + "_refill_due");
    spoof.setVariables(new LinkedHashMap<>(Map.of("pharmacy_name", "Stolen")));
    spoof.setVersion(1);
    spoof.setCreatedAt(T0);
    spoof.setUpdatedAt(T0);
    overlayRepository.saveAndFlush(spoof);

    mockMvc
        .perform(
            put(PATH + "/refill_due/variables")
                .cookie(a.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"variables\":{\"pharmacy_name\":\"Shop A\"}}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("NAMESPACE_COLLISION"));
  }

  @Test
  void ac03_ownerCustomizesTenantSlotsOnly() throws Exception {
    Fixture fx = seedOwner("ac03");

    mockMvc
        .perform(
            put(PATH + "/refill_due/variables")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"variables\":{\"pharmacy_name\":\"Varshmaan\"}}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.variables.pharmacy_name").value("Varshmaan"))
        .andExpect(jsonPath("$.data.preview").value(org.hamcrest.Matchers.containsString("Varshmaan")))
        .andExpect(
            jsonPath("$.data.preview").value(org.hamcrest.Matchers.containsString("{{customer_name}}")))
        .andExpect(
            jsonPath("$.data.body")
                .value(
                    "Hi {{customer_name}}, your refill for {{medicine_name}} is due. Visit {{pharmacy_name}} to restock."));

    MvcResult get =
        mockMvc
            .perform(get(PATH).cookie(fx.cookie()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.templates[0].uniqueName").exists())
            .andReturn();
    JsonNode templates = objectMapper.readTree(get.getResponse().getContentAsString()).at("/data/templates");
    JsonNode refill = null;
    for (JsonNode node : templates) {
      if ("refill_due".equals(node.path("uniqueName").asText())) {
        refill = node;
      }
    }
    assertThat(refill).isNotNull();
    assertThat(refill.path("preview").asText()).contains("Varshmaan");
    assertThat(refill.path("preview").asText()).contains("{{medicine_name}}");
    assertThat(refill.path("body").asText())
        .isEqualTo(
            "Hi {{customer_name}}, your refill for {{medicine_name}} is due. Visit {{pharmacy_name}} to restock.");

    mockMvc
        .perform(
            put(PATH + "/refill_due/variables")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"variables\":{\"customer_name\":\"Ravi\"},\"version\":1}"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("UNKNOWN_VARIABLE"));

    List<AuditEvent> audits =
        auditEventRepository.findAll().stream()
            .filter(event -> "WHATSAPP_TEMPLATE_VARS".equals(event.getAction()))
            .toList();
    assertThat(audits).isNotEmpty();
    assertThat(audits.get(0).getContextJson()).doesNotContain("token");
  }

  @Test
  void ac04_freeTextStructuralRewriteIsRejected() throws Exception {
    Fixture fx = seedOwner("ac04");

    mockMvc
        .perform(
            put(PATH + "/refill_due/variables")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"variables\":{\"pharmacy_name\":\"X\"},\"body\":\"Hi there rewritten\"}"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("STRUCTURAL_REWRITE"));
    mockMvc
        .perform(
            put(PATH + "/refill_due/variables")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"uniqueName\":\"other\",\"variables\":{\"pharmacy_name\":\"X\"}}"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("STRUCTURAL_REWRITE"));
    assertThat(overlayRepository.count()).isZero();
  }

  @Test
  void ac05_isolationUnknownUnapprovedSecretAndAuth() throws Exception {
    Fixture fx = seedOwner("ac05");
    Cookie master = seedMaster("ac05m");

    mockMvc.perform(get(PATH)).andExpect(status().isUnauthorized());
    mockMvc
        .perform(get(PATH).cookie(fx.staffCookie()))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    mockMvc
        .perform(get(PATH + "/no_such_template").cookie(fx.cookie()))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    mockMvc
        .perform(get(PATH + "/refill_due").cookie(master))
        .andExpect(status().isForbidden());

    WhatsAppApprovedStructure pending = new WhatsAppApprovedStructure();
    pending.setId(UUID.randomUUID());
    pending.setUniqueName("pending_promo");
    pending.setBody("Hi {{customer_name}} from {{pharmacy_name}}.");
    pending.setTenantSlots(List.of("pharmacy_name"));
    pending.setRuntimeSlots(List.of("customer_name"));
    pending.setMetaTemplateId("meta-pending");
    pending.setStatus(WhatsAppApprovalStatus.PENDING);
    pending.setCreatedAt(T0);
    pending.setUpdatedAt(T0);
    structureRepository.saveAndFlush(pending);

    mockMvc
        .perform(
            put(PATH + "/pending_promo/variables")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"variables\":{\"pharmacy_name\":\"X\"}}"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("UNAPPROVED_TEMPLATE"));
    mockMvc
        .perform(
            put(PATH + "/refill_due/variables")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"variables\":{\"pharmacy_name\":\"X\",\"tone\":\"casual\"}}"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("UNKNOWN_VARIABLE"));

    mockMvc
        .perform(
            put(PATH + "/refill_due/variables")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"variables\":{\"pharmacy_name\":\"First\"}}"))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            put(PATH + "/refill_due/variables")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"variables\":{\"pharmacy_name\":\"Second\"},\"version\":0}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("STALE_STATE"));

    mockMvc
        .perform(post(PATH + "/provider/sync").cookie(fx.cookie()))
        .andExpect(status().isForbidden());
    mockMvc
        .perform(post(PATH + "/provider/sync").cookie(master))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.provider.displayNumber").value("+91 90000 00000"))
        .andExpect(jsonPath("$.data.provider.token").doesNotExist());
  }

  @Test
  void ac03_idempotentSamePayloadKeepsVersion() throws Exception {
    Fixture fx = seedOwner("ac03i");
    mockMvc
        .perform(
            put(PATH + "/refill_due/variables")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"variables\":{\"pharmacy_name\":\"Same\"}}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.version").value(1));
    mockMvc
        .perform(
            put(PATH + "/refill_due/variables")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"variables\":{\"pharmacy_name\":\"Same\"},\"version\":1}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.version").value(1));
  }

  private void persistStructure(
      String uniqueName,
      String body,
      List<String> tenantSlots,
      List<String> runtimeSlots,
      String metaTemplateId) {
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

  private Fixture seedOwner(String tag) throws Exception {
    Tenant tenant = persistTenant(tag, "Pharmacy " + tag);
    persistPlan(tenant.getId());
    AppUser owner =
        persistUser(tenant.getId(), tag + ".owner@varshmaan.local", AppUserRole.pharmacy_owner);
    AppUser staff =
        persistUser(tenant.getId(), tag + ".staff@varshmaan.local", AppUserRole.pharmacy_staff);
    return new Fixture(tenant.getId(), login(owner.getEmail()), login(staff.getEmail()));
  }

  private Cookie seedMaster(String tag) throws Exception {
    persistUser(null, tag + ".master@nammamedmate.local", AppUserRole.admin_super);
    return login(tag + ".master@nammamedmate.local");
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

  private record Fixture(UUID tenantId, Cookie cookie, Cookie staffCookie) {}
}
