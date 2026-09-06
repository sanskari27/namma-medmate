package com.nammamedmate.server.application.campaign;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.application.audit.AuditRecordCommand;
import com.nammamedmate.server.application.audit.AuditService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.Campaign;
import com.nammamedmate.server.domain.CampaignPolicy;
import com.nammamedmate.server.domain.CampaignRecipient;
import com.nammamedmate.server.domain.CampaignStatus;
import com.nammamedmate.server.domain.CustomerTag;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.WhatsAppApprovedStructure;
import com.nammamedmate.server.domain.WhatsAppTemplatePolicy;
import com.nammamedmate.server.domain.WhatsAppTenantTemplate;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.CampaignRecipientRepository;
import com.nammamedmate.server.persistence.CampaignRepository;
import com.nammamedmate.server.persistence.CustomerTagAssignmentRepository;
import com.nammamedmate.server.persistence.CustomerTagRepository;
import com.nammamedmate.server.persistence.WhatsAppApprovedStructureRepository;
import com.nammamedmate.server.persistence.WhatsAppTenantTemplateRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CampaignService {

  private final CampaignRepository campaignRepository;
  private final CampaignRecipientRepository recipientRepository;
  private final CustomerTagRepository tagRepository;
  private final CustomerTagAssignmentRepository assignmentRepository;
  private final WhatsAppApprovedStructureRepository structureRepository;
  private final WhatsAppTenantTemplateRepository overlayRepository;
  private final AppUserRepository appUserRepository;
  private final AccessQueryService accessQueryService;
  private final AuditService auditService;
  private final Clock clock;

  public CampaignService(
      CampaignRepository campaignRepository,
      CampaignRecipientRepository recipientRepository,
      CustomerTagRepository tagRepository,
      CustomerTagAssignmentRepository assignmentRepository,
      WhatsAppApprovedStructureRepository structureRepository,
      WhatsAppTenantTemplateRepository overlayRepository,
      AppUserRepository appUserRepository,
      AccessQueryService accessQueryService,
      AuditService auditService,
      Clock clock) {
    this.campaignRepository = campaignRepository;
    this.recipientRepository = recipientRepository;
    this.tagRepository = tagRepository;
    this.assignmentRepository = assignmentRepository;
    this.structureRepository = structureRepository;
    this.overlayRepository = overlayRepository;
    this.appUserRepository = appUserRepository;
    this.accessQueryService = accessQueryService;
    this.auditService = auditService;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public CampaignListView list(AuthPrincipal principal) {
    UUID tenantId = requireCampaignAccess(principal);
    List<CampaignView> items =
        campaignRepository.findAllByTenantIdOrderByCreatedAtDesc(tenantId).stream()
            .map(this::toView)
            .toList();
    List<CampaignListView.TagOption> tags =
        tagRepository.findAllByTenantIdOrderByNameAsc(tenantId).stream()
            .map(tag -> new CampaignListView.TagOption(tag.getId(), tag.getName()))
            .toList();
    return new CampaignListView(items, tags, templateOptions(tenantId));
  }

  @Transactional(readOnly = true)
  public CampaignView get(AuthPrincipal principal, UUID id) {
    UUID tenantId = requireCampaignAccess(principal);
    return toView(requireCampaign(id, tenantId));
  }

  @Transactional
  public CampaignView create(AuthPrincipal principal, CampaignCommand command) {
    UUID tenantId = requireCampaignAccess(principal);
    if (command == null) {
      throw CampaignPolicy.shape();
    }
    String name = requireName(command.name());
    List<UUID> tagIds = requireTags(tenantId, command.tagIds());
    TemplateRef template =
        requireTemplate(tenantId, command.templateUniqueName(), command.variables());
    Instant now = clock.instant();
    Campaign campaign = new Campaign();
    campaign.setId(UUID.randomUUID());
    campaign.setTenantId(tenantId);
    campaign.setName(name);
    campaign.setStatus(CampaignStatus.DRAFT);
    campaign.setTagIds(tagIds);
    campaign.setTemplateUniqueName(template.uniqueName());
    campaign.setTemplateNamespaceName(template.namespaceName());
    campaign.setTemplateVariables(template.variables());
    campaign.setVersion(1);
    campaign.setCreatedByUserId(principal.userId());
    campaign.setCreatedAt(now);
    campaign.setUpdatedAt(now);
    campaignRepository.saveAndFlush(campaign);
    audit(principal, campaign.getId(), CampaignPolicy.AUDIT_DRAFT);
    return toView(campaign);
  }

  @Transactional
  public CampaignView preview(AuthPrincipal principal, UUID id, Integer expectedVersion) {
    UUID tenantId = requireCampaignAccess(principal);
    Campaign campaign = lockCampaign(id, tenantId);
    CampaignPolicy.requireDraft(campaign.getStatus());
    CampaignPolicy.requireVersion(campaign.getVersion(), expectedVersion);
    List<UUID> audience = resolveAudience(tenantId, campaign.getTagIds());
    CampaignPolicy.requireAudience(audience);
    Instant now = clock.instant();
    campaign.setPreviewedAt(now);
    campaign.setPreviewRecipientCount(audience.size());
    campaign.setVersion(campaign.getVersion() + 1);
    campaign.setUpdatedAt(now);
    campaignRepository.saveAndFlush(campaign);
    audit(principal, campaign.getId(), CampaignPolicy.AUDIT_PREVIEW);
    return toView(campaign);
  }

  @Transactional
  public CampaignView ready(AuthPrincipal principal, UUID id, Integer expectedVersion) {
    UUID tenantId = requireCampaignAccess(principal);
    Campaign campaign = lockCampaign(id, tenantId);
    CampaignPolicy.requireDraft(campaign.getStatus());
    CampaignPolicy.requireVersion(campaign.getVersion(), expectedVersion);
    CampaignPolicy.requirePreviewed(campaign.getPreviewedAt(), campaign.getPreviewRecipientCount());
    TemplateRef template =
        requireTemplate(
            tenantId, campaign.getTemplateUniqueName(), campaign.getTemplateVariables());
    List<UUID> audience = resolveAudience(tenantId, campaign.getTagIds());
    CampaignPolicy.requireAudience(audience);
    Instant now = clock.instant();
    for (UUID customerId : audience) {
      CampaignRecipient row = new CampaignRecipient();
      row.setTenantId(tenantId);
      row.setCampaignId(campaign.getId());
      row.setCustomerId(customerId);
      row.setCreatedAt(now);
      recipientRepository.save(row);
    }
    campaign.setTemplateNamespaceName(template.namespaceName());
    campaign.setTemplateVariables(template.variables());
    campaign.setStatus(CampaignStatus.READY_FOR_DELIVERY);
    campaign.setFrozenAt(now);
    campaign.setFrozenRecipientCount(audience.size());
    campaign.setVersion(campaign.getVersion() + 1);
    campaign.setUpdatedAt(now);
    campaignRepository.saveAndFlush(campaign);
    audit(principal, campaign.getId(), CampaignPolicy.AUDIT_READY);
    return toView(campaign);
  }

  private List<UUID> resolveAudience(UUID tenantId, List<UUID> tagIds) {
    if (tagIds == null || tagIds.isEmpty()) {
      return List.of();
    }
    return CampaignPolicy.dedupe(
        assignmentRepository.findLiveCustomerIdsByTagIds(tenantId, tagIds));
  }

  private TemplateRef requireTemplate(
      UUID tenantId, String uniqueName, Map<String, String> variables) {
    CampaignPolicy.requireCampaignTemplate(uniqueName);
    WhatsAppApprovedStructure structure =
        structureRepository
            .findByUniqueName(uniqueName)
            .orElseThrow(
                () ->
                    new ApiException(
                        HttpStatus.UNPROCESSABLE_ENTITY,
                        CampaignPolicy.UNAPPROVED_TEMPLATE,
                        "This WhatsApp template is not approved for this pharmacy."));
    WhatsAppTenantTemplate overlay =
        overlayRepository.findByTenantIdAndUniqueName(tenantId, uniqueName).orElse(null);
    CampaignPolicy.requireApprovedTemplate(structure.getStatus(), overlay != null);
    Map<String, String> cleaned =
        CampaignPolicy.requireTenantVariables(
            structure.getTenantSlots(), structure.getRuntimeSlots(), variables);
    String namespace =
        overlay.getNamespaceName() == null || overlay.getNamespaceName().isBlank()
            ? WhatsAppTemplatePolicy.namespaceName(tenantId, uniqueName)
            : overlay.getNamespaceName();
    return new TemplateRef(uniqueName, namespace, cleaned);
  }

  private List<UUID> requireTags(UUID tenantId, List<UUID> incoming) {
    if (incoming == null || incoming.isEmpty()) {
      throw CampaignPolicy.shape();
    }
    List<UUID> ids = CampaignPolicy.dedupe(incoming);
    List<CustomerTag> found = tagRepository.findAllByTenantIdAndIdIn(tenantId, ids);
    if (found.size() != ids.size()) {
      throw CampaignPolicy.notFound();
    }
    return ids;
  }

  private String requireName(String raw) {
    if (raw == null || raw.isBlank()) {
      throw CampaignPolicy.shape();
    }
    return raw.trim();
  }

  private List<CampaignListView.TemplateOption> templateOptions(UUID tenantId) {
    return structureRepository
        .findByUniqueName(CampaignPolicy.CAMPAIGN_TEMPLATE)
        .map(
            structure -> {
              WhatsAppTenantTemplate overlay =
                  overlayRepository
                      .findByTenantIdAndUniqueName(tenantId, structure.getUniqueName())
                      .orElse(null);
              String namespace =
                  overlay == null
                      ? WhatsAppTemplatePolicy.namespaceName(tenantId, structure.getUniqueName())
                      : overlay.getNamespaceName();
              return List.of(
                  new CampaignListView.TemplateOption(
                      structure.getUniqueName(), namespace, structure.getStatus().name()));
            })
        .orElse(List.of());
  }

  private CampaignView toView(Campaign campaign) {
    Integer count =
        campaign.getStatus() == CampaignStatus.READY_FOR_DELIVERY
            ? campaign.getFrozenRecipientCount()
            : campaign.getPreviewRecipientCount();
    Map<String, String> variables =
        campaign.getTemplateVariables() == null
            ? Map.of()
            : new LinkedHashMap<>(campaign.getTemplateVariables());
    List<UUID> tags =
        campaign.getTagIds() == null ? List.of() : new ArrayList<>(campaign.getTagIds());
    return new CampaignView(
        campaign.getId(),
        campaign.getTenantId(),
        campaign.getName(),
        campaign.getStatus(),
        tags,
        campaign.getTemplateUniqueName(),
        campaign.getTemplateNamespaceName(),
        variables,
        campaign.getPreviewedAt(),
        count,
        campaign.getFrozenAt(),
        campaign.getVersion(),
        campaign.getCreatedAt(),
        campaign.getUpdatedAt());
  }

  private Campaign requireCampaign(UUID id, UUID tenantId) {
    return campaignRepository
        .findByIdAndTenantId(id, tenantId)
        .orElseThrow(CampaignPolicy::notFound);
  }

  private Campaign lockCampaign(UUID id, UUID tenantId) {
    return campaignRepository
        .lockByIdAndTenantId(id, tenantId)
        .orElseThrow(CampaignPolicy::notFound);
  }

  private UUID requireCampaignAccess(AuthPrincipal principal) {
    if (principal == null || principal.tenantId() == null) {
      throw CampaignPolicy.forbidden();
    }
    AppUser user =
        appUserRepository
            .findById(principal.userId())
            .filter(row -> row.getDeletedAt() == null)
            .orElseThrow(CampaignPolicy::forbidden);
    boolean campaigns = accessQueryService.effectiveModules(user).contains(ModuleCode.CAMPAIGNS);
    CampaignPolicy.requireAllowed(user.getRole(), campaigns);
    return principal.tenantId();
  }

  private void audit(AuthPrincipal principal, UUID campaignId, String action) {
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
            "{\"campaignId\":\"" + campaignId + "\"}"));
  }

  private record TemplateRef(
      String uniqueName, String namespaceName, Map<String, String> variables) {}
}
