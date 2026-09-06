package com.nammamedmate.server.application.communications;

import com.fasterxml.jackson.databind.JsonNode;
import com.nammamedmate.server.application.audit.AuditRecordCommand;
import com.nammamedmate.server.application.audit.AuditService;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.WhatsAppApprovedStructure;
import com.nammamedmate.server.domain.WhatsAppProviderStatus;
import com.nammamedmate.server.domain.WhatsAppTemplatePolicy;
import com.nammamedmate.server.domain.WhatsAppTenantTemplate;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.infrastructure.whatsapp.MetaProviderSnapshot;
import com.nammamedmate.server.infrastructure.whatsapp.MetaWhatsAppAdapter;
import com.nammamedmate.server.persistence.WhatsAppApprovedStructureRepository;
import com.nammamedmate.server.persistence.WhatsAppProviderStatusRepository;
import com.nammamedmate.server.persistence.WhatsAppTenantTemplateRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WhatsAppTemplateService {

  private final WhatsAppApprovedStructureRepository structureRepository;
  private final WhatsAppTenantTemplateRepository overlayRepository;
  private final WhatsAppProviderStatusRepository providerStatusRepository;
  private final MetaWhatsAppAdapter metaWhatsAppAdapter;
  private final AuditService auditService;
  private final Clock clock;

  public WhatsAppTemplateService(
      WhatsAppApprovedStructureRepository structureRepository,
      WhatsAppTenantTemplateRepository overlayRepository,
      WhatsAppProviderStatusRepository providerStatusRepository,
      MetaWhatsAppAdapter metaWhatsAppAdapter,
      AuditService auditService,
      Clock clock) {
    this.structureRepository = structureRepository;
    this.overlayRepository = overlayRepository;
    this.providerStatusRepository = providerStatusRepository;
    this.metaWhatsAppAdapter = metaWhatsAppAdapter;
    this.auditService = auditService;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public WhatsAppOwnerCatalogue listOwner(AuthPrincipal principal) {
    UUID tenantId = requireOwner(principal);
    Map<String, WhatsAppTenantTemplate> overlays = overlaysByName(tenantId);
    List<WhatsAppTemplateView> templates =
        structureRepository.findAllByOrderByUniqueNameAsc().stream()
            .map(
                structure ->
                    toTemplate(tenantId, structure, overlays.get(structure.getUniqueName())))
            .toList();
    return new WhatsAppOwnerCatalogue(providerView(), templates);
  }

  @Transactional(readOnly = true)
  public WhatsAppMasterCatalogue listMaster(AuthPrincipal principal) {
    requireMaster(principal);
    List<WhatsAppStructureView> structures =
        structureRepository.findAllByOrderByUniqueNameAsc().stream()
            .map(WhatsAppTemplateService::toStructure)
            .toList();
    return new WhatsAppMasterCatalogue(providerView(), structures);
  }

  @Transactional(readOnly = true)
  public WhatsAppTemplateView getOwner(AuthPrincipal principal, String uniqueName) {
    UUID tenantId = requireOwner(principal);
    WhatsAppApprovedStructure structure = requireStructure(uniqueName);
    WhatsAppTenantTemplate overlay =
        overlayRepository.findByTenantIdAndUniqueName(tenantId, uniqueName).orElse(null);
    return toTemplate(tenantId, structure, overlay);
  }

  @Transactional
  public WhatsAppTemplateView putVariables(
      AuthPrincipal principal, String uniqueName, JsonNode payload) {
    UUID tenantId = requireOwner(principal);
    if (payload == null || !payload.isObject()) {
      throw WhatsAppTemplatePolicy.shape();
    }
    Set<String> fields = new HashSet<>();
    payload.fieldNames().forEachRemaining(fields::add);
    WhatsAppTemplatePolicy.rejectStructuralRewrite(fields);
    JsonNode variablesNode = payload.get("variables");
    if (variablesNode == null || !variablesNode.isObject()) {
      throw WhatsAppTemplatePolicy.shape();
    }
    Map<String, String> incoming = new LinkedHashMap<>();
    variablesNode
        .fields()
        .forEachRemaining(entry -> incoming.put(entry.getKey(), textValue(entry.getValue())));
    Integer expectedVersion = intValue(payload.get("version"));

    WhatsAppApprovedStructure structure = requireStructure(uniqueName);
    WhatsAppTemplatePolicy.requireApproved(structure.getStatus());
    Map<String, String> variables =
        WhatsAppTemplatePolicy.requireTenantVariables(
            structure.getTenantSlots(), structure.getRuntimeSlots(), incoming);

    Instant now = Instant.now(clock);
    WhatsAppTenantTemplate overlay =
        overlayRepository.lockByTenantIdAndUniqueName(tenantId, uniqueName).orElse(null);
    try {
      if (overlay == null) {
        WhatsAppTemplatePolicy.requireVersion(0, expectedVersion);
        overlay = new WhatsAppTenantTemplate();
        overlay.setId(UUID.randomUUID());
        overlay.setTenantId(tenantId);
        overlay.setUniqueName(uniqueName);
        overlay.setNamespaceName(WhatsAppTemplatePolicy.namespaceName(tenantId, uniqueName));
        overlay.setVariables(variables);
        overlay.setVersion(1);
        overlay.setCreatedAt(now);
        overlay.setUpdatedAt(now);
        overlay = overlayRepository.saveAndFlush(overlay);
      } else {
        WhatsAppTemplatePolicy.requireVersion(overlay.getVersion(), expectedVersion);
        if (Objects.equals(overlay.getVariables(), variables)) {
          return toTemplate(tenantId, structure, overlay);
        }
        overlay.setVariables(variables);
        overlay.setVersion(overlay.getVersion() + 1);
        overlay.setUpdatedAt(now);
        overlay = overlayRepository.saveAndFlush(overlay);
      }
    } catch (DataIntegrityViolationException ex) {
      String detail = String.valueOf(ex.getMostSpecificCause().getMessage());
      if (detail.contains("namespace_name")) {
        throw WhatsAppTemplatePolicy.namespaceCollision();
      }
      throw WhatsAppTemplatePolicy.namespaceCollision();
    }
    audit(
        principal,
        "WHATSAPP_TEMPLATE_VARS",
        "{\"uniqueName\":\"" + uniqueName + "\",\"templateId\":\"" + overlay.getId() + "\"}");
    return toTemplate(tenantId, structure, overlay);
  }

  @Transactional
  public WhatsAppMasterCatalogue syncProvider(AuthPrincipal principal) {
    requireMaster(principal);
    MetaProviderSnapshot snapshot;
    try {
      snapshot = metaWhatsAppAdapter.fetchStatus();
    } catch (RuntimeException ex) {
      throw new ApiException(
          HttpStatus.SERVICE_UNAVAILABLE,
          "PROVIDER_UNAVAILABLE",
          "WhatsApp provider status is unavailable.");
    }
    Instant now = Instant.now(clock);
    WhatsAppProviderStatus row = new WhatsAppProviderStatus();
    row.setId(UUID.randomUUID());
    row.setDisplayNumber(snapshot.displayNumber());
    row.setPhoneNumberId(snapshot.phoneNumberId());
    row.setHealth(snapshot.health());
    row.setSyncedAt(now);
    row.setCreatedAt(now);
    providerStatusRepository.saveAndFlush(row);
    audit(principal, "WHATSAPP_PROVIDER_SYNC", "{\"health\":\"" + snapshot.health() + "\"}");
    return listMaster(principal);
  }

  private WhatsAppProviderView providerView() {
    Optional<WhatsAppProviderStatus> stored =
        providerStatusRepository.findFirstByOrderBySyncedAtDesc();
    if (stored.isPresent()) {
      WhatsAppProviderStatus row = stored.get();
      return new WhatsAppProviderView(
          row.getDisplayNumber(), row.getPhoneNumberId(), row.getHealth(), row.getSyncedAt());
    }
    MetaProviderSnapshot snapshot = metaWhatsAppAdapter.fetchStatus();
    return new WhatsAppProviderView(
        snapshot.displayNumber(), snapshot.phoneNumberId(), snapshot.health(), null);
  }

  private Map<String, WhatsAppTenantTemplate> overlaysByName(UUID tenantId) {
    Map<String, WhatsAppTenantTemplate> overlays = new LinkedHashMap<>();
    for (WhatsAppTenantTemplate overlay : overlayRepository.findAllByTenantId(tenantId)) {
      overlays.put(overlay.getUniqueName(), overlay);
    }
    return overlays;
  }

  private WhatsAppApprovedStructure requireStructure(String uniqueName) {
    return structureRepository
        .findByUniqueName(uniqueName)
        .orElseThrow(WhatsAppTemplatePolicy::notFound);
  }

  private static WhatsAppStructureView toStructure(WhatsAppApprovedStructure structure) {
    return new WhatsAppStructureView(
        structure.getUniqueName(),
        structure.getBody(),
        structure.getTenantSlots(),
        structure.getRuntimeSlots(),
        structure.getStatus().name(),
        structure.getMetaTemplateId());
  }

  private static WhatsAppTemplateView toTemplate(
      UUID tenantId, WhatsAppApprovedStructure structure, WhatsAppTenantTemplate overlay) {
    Map<String, String> variables = overlay == null ? Map.of() : Map.copyOf(overlay.getVariables());
    int version = overlay == null ? 0 : overlay.getVersion();
    return new WhatsAppTemplateView(
        structure.getUniqueName(),
        WhatsAppTemplatePolicy.namespaceName(tenantId, structure.getUniqueName()),
        structure.getBody(),
        structure.getTenantSlots(),
        structure.getRuntimeSlots(),
        structure.getStatus().name(),
        variables,
        WhatsAppTemplatePolicy.preview(structure.getBody(), variables),
        version);
  }

  private UUID requireOwner(AuthPrincipal principal) {
    if (principal == null
        || principal.role() != AppUserRole.pharmacy_owner
        || principal.tenantId() == null) {
      throw WhatsAppTemplatePolicy.forbidden();
    }
    return principal.tenantId();
  }

  private void requireMaster(AuthPrincipal principal) {
    if (principal == null || principal.role() != AppUserRole.admin_super) {
      throw WhatsAppTemplatePolicy.forbidden();
    }
  }

  private void audit(AuthPrincipal principal, String action, String contextJson) {
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
            contextJson));
  }

  private static String textValue(JsonNode node) {
    if (node == null || node.isNull()) {
      return "";
    }
    return node.asText();
  }

  private static Integer intValue(JsonNode node) {
    if (node == null || node.isNull() || node.isMissingNode()) {
      return null;
    }
    if (!node.isNumber() && !node.isTextual()) {
      throw WhatsAppTemplatePolicy.shape();
    }
    return node.asInt();
  }
}
