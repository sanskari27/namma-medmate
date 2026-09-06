package com.nammamedmate.server.application.communications;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.application.audit.AuditRecordCommand;
import com.nammamedmate.server.application.audit.AuditService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.Campaign;
import com.nammamedmate.server.domain.CampaignPolicy;
import com.nammamedmate.server.domain.CampaignRecipient;
import com.nammamedmate.server.domain.Customer;
import com.nammamedmate.server.domain.CustomerCreditAccount;
import com.nammamedmate.server.domain.CustomerRefillSchedule;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.WhatsAppApprovedStructure;
import com.nammamedmate.server.domain.WhatsAppMessage;
import com.nammamedmate.server.domain.WhatsAppMessageKind;
import com.nammamedmate.server.domain.WhatsAppMessagePolicy;
import com.nammamedmate.server.domain.WhatsAppMessageStatus;
import com.nammamedmate.server.domain.WhatsAppTemplatePolicy;
import com.nammamedmate.server.domain.WhatsAppTenantTemplate;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.infrastructure.whatsapp.MetaSendResult;
import com.nammamedmate.server.infrastructure.whatsapp.MetaWhatsAppAdapter;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.CampaignRecipientRepository;
import com.nammamedmate.server.persistence.CampaignRepository;
import com.nammamedmate.server.persistence.CustomerRepository;
import com.nammamedmate.server.persistence.WhatsAppApprovedStructureRepository;
import com.nammamedmate.server.persistence.WhatsAppMessageRepository;
import com.nammamedmate.server.persistence.WhatsAppTenantTemplateRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WhatsAppMessageService {

  private final WhatsAppMessageRepository messageRepository;
  private final CampaignRepository campaignRepository;
  private final CampaignRecipientRepository recipientRepository;
  private final CustomerRepository customerRepository;
  private final WhatsAppApprovedStructureRepository structureRepository;
  private final WhatsAppTenantTemplateRepository overlayRepository;
  private final AppUserRepository appUserRepository;
  private final AccessQueryService accessQueryService;
  private final MetaWhatsAppAdapter metaWhatsAppAdapter;
  private final AuditService auditService;
  private final Clock clock;

  public WhatsAppMessageService(
      WhatsAppMessageRepository messageRepository,
      CampaignRepository campaignRepository,
      CampaignRecipientRepository recipientRepository,
      CustomerRepository customerRepository,
      WhatsAppApprovedStructureRepository structureRepository,
      WhatsAppTenantTemplateRepository overlayRepository,
      AppUserRepository appUserRepository,
      AccessQueryService accessQueryService,
      MetaWhatsAppAdapter metaWhatsAppAdapter,
      AuditService auditService,
      Clock clock) {
    this.messageRepository = messageRepository;
    this.campaignRepository = campaignRepository;
    this.recipientRepository = recipientRepository;
    this.customerRepository = customerRepository;
    this.structureRepository = structureRepository;
    this.overlayRepository = overlayRepository;
    this.appUserRepository = appUserRepository;
    this.accessQueryService = accessQueryService;
    this.metaWhatsAppAdapter = metaWhatsAppAdapter;
    this.auditService = auditService;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public WhatsAppMessageList list(
      AuthPrincipal principal, String kind, String status, UUID campaignId) {
    UUID tenantId = requireCampaignAccess(principal);
    List<WhatsAppMessage> rows = messageRepository.findAllByTenantIdOrderByCreatedAtDesc(tenantId);
    WhatsAppMessageKind kindFilter = parseKind(kind);
    WhatsAppMessageStatus statusFilter = parseStatus(status);
    List<WhatsAppMessageView> items = new ArrayList<>();
    int queued = 0;
    int sent = 0;
    int failed = 0;
    for (WhatsAppMessage row : rows) {
      if (row.getStatus() == WhatsAppMessageStatus.QUEUED) {
        queued++;
      } else if (row.getStatus() == WhatsAppMessageStatus.SENT) {
        sent++;
      } else {
        failed++;
      }
      if (kindFilter != null && row.getKind() != kindFilter) {
        continue;
      }
      if (statusFilter != null && row.getStatus() != statusFilter) {
        continue;
      }
      if (campaignId != null && !campaignId.equals(row.getCampaignId())) {
        continue;
      }
      items.add(toView(row));
    }
    return new WhatsAppMessageList(List.copyOf(items), queued, sent, failed);
  }

  @Transactional(readOnly = true)
  public WhatsAppMessageView get(AuthPrincipal principal, UUID id) {
    UUID tenantId = requireCampaignAccess(principal);
    return toView(requireMessage(id, tenantId));
  }

  @Transactional
  public WhatsAppMessageList sendCampaign(AuthPrincipal principal, UUID campaignId) {
    UUID tenantId = requireCampaignAccess(principal);
    if (campaignId == null) {
      throw WhatsAppMessagePolicy.shape();
    }
    Campaign campaign =
        campaignRepository
            .lockByIdAndTenantId(campaignId, tenantId)
            .orElseThrow(WhatsAppMessagePolicy::notFound);
    WhatsAppMessagePolicy.requireReady(campaign.getStatus());
    List<CampaignRecipient> recipients =
        recipientRepository.findAllByTenantIdAndCampaignId(tenantId, campaignId);
    WhatsAppMessagePolicy.requireAudience(recipients.size());
    requireTemplate(tenantId, WhatsAppMessagePolicy.CAMPAIGN_TEMPLATE);
    List<WhatsAppMessage> rows = new ArrayList<>();
    for (CampaignRecipient recipient : recipients) {
      Customer customer = liveCustomer(tenantId, recipient.getCustomerId());
      if (customer == null) {
        continue;
      }
      Map<String, String> runtime = Map.of("customer_name", customer.getName());
      rows.add(
          persist(
              tenantId,
              WhatsAppMessageKind.CAMPAIGN,
              campaign.getId(),
              customer.getId(),
              campaign.getId(),
              WhatsAppMessagePolicy.CAMPAIGN_TEMPLATE,
              WhatsAppMessagePolicy.campaignKey(campaign.getId(), customer.getId()),
              customer.getPhone(),
              runtime));
    }
    for (WhatsAppMessage row : rows) {
      deliver(row);
    }
    audit(principal, WhatsAppMessagePolicy.AUDIT_SEND, campaignId);
    return toList(rows);
  }

  @Transactional
  public WhatsAppMessageView retry(AuthPrincipal principal, UUID id) {
    UUID tenantId = requireCampaignAccess(principal);
    WhatsAppMessage message =
        messageRepository
            .lockByIdAndTenantId(id, tenantId)
            .orElseThrow(WhatsAppMessagePolicy::notFound);
    if (message.getStatus() != WhatsAppMessageStatus.SENT) {
      deliver(message);
    }
    audit(principal, WhatsAppMessagePolicy.AUDIT_RETRY, message.getId());
    return toView(message);
  }

  @Transactional
  public List<WhatsAppMessage> enqueueRefill(UUID tenantId, CustomerRefillSchedule schedule) {
    Customer customer = liveCustomer(tenantId, schedule.getCustomerId());
    if (customer == null) {
      return List.of();
    }
    LocalDate today = LocalDate.ofInstant(clock.instant(), ZoneOffset.UTC);
    Map<String, String> runtime =
        Map.of("customer_name", customer.getName(), "medicine_name", schedule.getMedicineName());
    WhatsAppMessage row =
        persist(
            tenantId,
            WhatsAppMessageKind.REFILL_DUE,
            schedule.getId(),
            customer.getId(),
            null,
            WhatsAppMessagePolicy.REFILL_TEMPLATE,
            WhatsAppMessagePolicy.refillKey(schedule.getId(), today),
            customer.getPhone(),
            runtime);
    deliver(row);
    return List.of(row);
  }

  @Transactional
  public List<WhatsAppMessage> enqueueCredit(UUID tenantId, CustomerCreditAccount account) {
    Customer customer = liveCustomer(tenantId, account.getCustomerId());
    if (customer == null) {
      return List.of();
    }
    LocalDate today = LocalDate.ofInstant(clock.instant(), ZoneOffset.UTC);
    Map<String, String> runtime = Map.of("customer_name", customer.getName());
    WhatsAppMessage row =
        persist(
            tenantId,
            WhatsAppMessageKind.CREDIT_DUE,
            account.getId(),
            customer.getId(),
            null,
            WhatsAppMessagePolicy.CREDIT_TEMPLATE,
            WhatsAppMessagePolicy.creditKey(account.getId(), today),
            customer.getPhone(),
            runtime);
    deliver(row);
    return List.of(row);
  }

  private WhatsAppMessage persist(
      UUID tenantId,
      WhatsAppMessageKind kind,
      UUID sourceId,
      UUID customerId,
      UUID campaignId,
      String uniqueName,
      String idempotencyKey,
      String rawPhone,
      Map<String, String> runtime) {
    WhatsAppMessage existing =
        messageRepository.findByTenantIdAndIdempotencyKey(tenantId, idempotencyKey).orElse(null);
    if (existing != null) {
      return existing;
    }
    Instant now = Instant.now(clock);
    TemplateRef template = loadTemplate(tenantId, uniqueName);
    String previewBody = template == null ? "" : template.body();
    Map<String, String> tenantVars = template == null ? Map.of() : template.variables();
    Map<String, String> merged = WhatsAppMessagePolicy.mergeVariables(tenantVars, runtime);
    WhatsAppMessage row = new WhatsAppMessage();
    row.setId(UUID.randomUUID());
    row.setTenantId(tenantId);
    row.setKind(kind);
    row.setSourceId(sourceId);
    row.setCustomerId(customerId);
    row.setCampaignId(campaignId);
    row.setTemplateUniqueName(uniqueName);
    row.setNamespaceName(
        template == null
            ? WhatsAppTemplatePolicy.namespaceName(tenantId, uniqueName)
            : template.namespaceName());
    row.setPhone(rawPhone == null ? "" : rawPhone);
    row.setVariables(new LinkedHashMap<>(merged));
    row.setPreview(WhatsAppTemplatePolicy.preview(previewBody, merged));
    row.setStatus(WhatsAppMessageStatus.QUEUED);
    row.setIdempotencyKey(idempotencyKey);
    row.setAttemptCount(0);
    row.setCreatedAt(now);
    row.setUpdatedAt(now);
    try {
      return messageRepository.saveAndFlush(row);
    } catch (DataIntegrityViolationException ex) {
      return messageRepository
          .findByTenantIdAndIdempotencyKey(tenantId, idempotencyKey)
          .orElseThrow(() -> ex);
    }
  }

  private void deliver(WhatsAppMessage message) {
    if (message.getStatus() == WhatsAppMessageStatus.SENT) {
      return;
    }
    Instant now = Instant.now(clock);
    message.setAttemptCount(message.getAttemptCount() + 1);
    message.setLastAttemptAt(now);
    message.setUpdatedAt(now);
    TemplateRef template = loadTemplate(message.getTenantId(), message.getTemplateUniqueName());
    if (template == null) {
      fail(message, WhatsAppMessagePolicy.UNAPPROVED_TEMPLATE, now);
      return;
    }
    if (!WhatsAppMessagePolicy.validPhone(message.getPhone())) {
      fail(message, WhatsAppMessagePolicy.INVALID_PHONE, now);
      return;
    }
    try {
      String phone = WhatsAppMessagePolicy.requirePhone(message.getPhone());
      String to = WhatsAppMessagePolicy.graphAddress(phone);
      MetaSendResult result =
          metaWhatsAppAdapter.sendTemplate(to, message.getNamespaceName(), message.getVariables());
      if (result != null && result.sent()) {
        message.setStatus(WhatsAppMessageStatus.SENT);
        message.setProviderMessageId(result.providerMessageId());
        message.setFailureCode(null);
      } else {
        fail(
            message,
            result == null || result.failureCode() == null
                ? WhatsAppMessagePolicy.PROVIDER_UNAVAILABLE
                : result.failureCode(),
            now);
      }
    } catch (RuntimeException ex) {
      fail(message, WhatsAppMessagePolicy.PROVIDER_UNAVAILABLE, now);
    }
    messageRepository.saveAndFlush(message);
  }

  private void fail(WhatsAppMessage message, String code, Instant now) {
    message.setStatus(WhatsAppMessageStatus.FAILED);
    message.setFailureCode(code);
    message.setUpdatedAt(now);
    messageRepository.saveAndFlush(message);
  }

  private void requireTemplate(UUID tenantId, String uniqueName) {
    if (loadTemplate(tenantId, uniqueName) == null) {
      throw WhatsAppMessagePolicy.unapproved();
    }
  }

  private TemplateRef loadTemplate(UUID tenantId, String uniqueName) {
    WhatsAppMessagePolicy.requireSendableTemplate(uniqueName);
    WhatsAppApprovedStructure structure =
        structureRepository.findByUniqueName(uniqueName).orElse(null);
    if (structure == null) {
      return null;
    }
    WhatsAppTenantTemplate overlay =
        overlayRepository.findByTenantIdAndUniqueName(tenantId, uniqueName).orElse(null);
    try {
      WhatsAppMessagePolicy.requireApproved(structure.getStatus(), overlay != null);
    } catch (RuntimeException ex) {
      return null;
    }
    String namespace =
        overlay.getNamespaceName() == null || overlay.getNamespaceName().isBlank()
            ? WhatsAppTemplatePolicy.namespaceName(tenantId, uniqueName)
            : overlay.getNamespaceName();
    return new TemplateRef(namespace, structure.getBody(), overlay.getVariables());
  }

  private Customer liveCustomer(UUID tenantId, UUID customerId) {
    return customerRepository
        .findByIdAndTenantIdAndDeletedAtIsNull(customerId, tenantId)
        .filter(row -> row.getMergedIntoId() == null)
        .orElse(null);
  }

  private WhatsAppMessage requireMessage(UUID id, UUID tenantId) {
    return messageRepository
        .findByIdAndTenantId(id, tenantId)
        .orElseThrow(WhatsAppMessagePolicy::notFound);
  }

  private UUID requireCampaignAccess(AuthPrincipal principal) {
    if (principal == null || principal.tenantId() == null) {
      throw WhatsAppMessagePolicy.forbidden();
    }
    AppUser user =
        appUserRepository
            .findById(principal.userId())
            .filter(row -> row.getDeletedAt() == null)
            .orElseThrow(WhatsAppMessagePolicy::forbidden);
    boolean campaigns = accessQueryService.effectiveModules(user).contains(ModuleCode.CAMPAIGNS);
    CampaignPolicy.requireAllowed(user.getRole(), campaigns);
    return principal.tenantId();
  }

  private void audit(AuthPrincipal principal, String action, UUID recordId) {
    auditService.record(
        new AuditRecordCommand(
            principal.userId(),
            principal.tenantId(),
            principal.activeBranchId(),
            action,
            AuditService.OUTCOME_SUCCESS,
            null,
            null,
            null,
            principal.sessionId(),
            "{\"id\":\"" + recordId + "\"}"));
  }

  private WhatsAppMessageKind parseKind(String raw) {
    if (raw == null || raw.isBlank()) {
      return null;
    }
    try {
      return WhatsAppMessageKind.valueOf(raw.trim());
    } catch (IllegalArgumentException ex) {
      throw WhatsAppMessagePolicy.shape();
    }
  }

  private WhatsAppMessageStatus parseStatus(String raw) {
    if (raw == null || raw.isBlank()) {
      return null;
    }
    try {
      return WhatsAppMessageStatus.valueOf(raw.trim());
    } catch (IllegalArgumentException ex) {
      throw WhatsAppMessagePolicy.shape();
    }
  }

  private static WhatsAppMessageList toList(List<WhatsAppMessage> rows) {
    int queued = 0;
    int sent = 0;
    int failed = 0;
    List<WhatsAppMessageView> items = new ArrayList<>();
    for (WhatsAppMessage row : rows) {
      items.add(toView(row));
      if (row.getStatus() == WhatsAppMessageStatus.QUEUED) {
        queued++;
      } else if (row.getStatus() == WhatsAppMessageStatus.SENT) {
        sent++;
      } else {
        failed++;
      }
    }
    return new WhatsAppMessageList(List.copyOf(items), queued, sent, failed);
  }

  private static WhatsAppMessageView toView(WhatsAppMessage row) {
    return new WhatsAppMessageView(
        row.getId(),
        row.getTenantId(),
        row.getKind().name(),
        row.getSourceId(),
        row.getCustomerId(),
        row.getCampaignId(),
        row.getTemplateUniqueName(),
        row.getNamespaceName(),
        row.getPreview(),
        row.getStatus().name(),
        row.getFailureCode(),
        row.getProviderMessageId(),
        row.getAttemptCount(),
        row.getCreatedAt(),
        row.getUpdatedAt());
  }

  private record TemplateRef(String namespaceName, String body, Map<String, String> variables) {}
}
