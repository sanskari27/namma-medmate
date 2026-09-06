package com.nammamedmate.server.feature.campaign;

import com.nammamedmate.server.application.campaign.CampaignCommand;
import com.nammamedmate.server.application.campaign.CampaignListView;
import com.nammamedmate.server.application.campaign.CampaignService;
import com.nammamedmate.server.application.campaign.CampaignView;
import com.nammamedmate.server.domain.CampaignStatus;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/campaigns")
public class CampaignController {

  private final CampaignService campaignService;

  public CampaignController(CampaignService campaignService) {
    this.campaignService = campaignService;
  }

  @GetMapping
  public ApiResponse<CampaignListResponse> list(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    CampaignListView view = campaignService.list(principal);
    return ApiResponse.ok(
        new CampaignListResponse(
            view.items().stream().map(this::toResponse).toList(), view.tags(), view.templates()));
  }

  @GetMapping("/{id}")
  public ApiResponse<CampaignResponse> get(Authentication authentication, @PathVariable UUID id) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(campaignService.get(principal, id)));
  }

  @PostMapping
  public ApiResponse<CampaignResponse> create(
      Authentication authentication, @Valid @RequestBody CreateCampaignRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(
            campaignService.create(
                principal,
                new CampaignCommand(
                    request.name(),
                    request.tagIds(),
                    request.templateUniqueName(),
                    request.variables() == null ? Map.of() : request.variables()))));
  }

  @PostMapping("/{id}/preview")
  public ApiResponse<CampaignResponse> preview(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody VersionRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(campaignService.preview(principal, id, request.expectedVersion())));
  }

  @PostMapping("/{id}/ready")
  public ApiResponse<CampaignResponse> ready(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody VersionRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(campaignService.ready(principal, id, request.expectedVersion())));
  }

  private CampaignResponse toResponse(CampaignView view) {
    return new CampaignResponse(
        view.id(),
        view.tenantId(),
        view.name(),
        view.status(),
        view.tagIds(),
        view.templateUniqueName(),
        view.namespaceName(),
        view.variables(),
        view.previewedAt(),
        view.recipientCount(),
        view.frozenAt(),
        view.version(),
        view.createdAt(),
        view.updatedAt());
  }

  public record CreateCampaignRequest(
      @NotBlank @Size(max = 120) String name,
      @NotEmpty List<UUID> tagIds,
      @NotBlank String templateUniqueName,
      Map<String, String> variables) {}

  public record VersionRequest(@NotNull Integer expectedVersion) {}

  public record CampaignListResponse(
      List<CampaignResponse> items,
      List<CampaignListView.TagOption> tags,
      List<CampaignListView.TemplateOption> templates) {}

  public record CampaignResponse(
      UUID id,
      UUID tenantId,
      String name,
      CampaignStatus status,
      List<UUID> tagIds,
      String templateUniqueName,
      String namespaceName,
      Map<String, String> variables,
      Instant previewedAt,
      Integer recipientCount,
      Instant frozenAt,
      int version,
      Instant createdAt,
      Instant updatedAt) {}
}
