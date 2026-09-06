package com.nammamedmate.server.feature.communications;

import com.fasterxml.jackson.databind.JsonNode;
import com.nammamedmate.server.application.communications.WhatsAppMasterCatalogue;
import com.nammamedmate.server.application.communications.WhatsAppTemplateService;
import com.nammamedmate.server.application.communications.WhatsAppTemplateView;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.WhatsAppTemplatePolicy;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/communications/whatsapp/templates")
public class WhatsAppTemplateController {

  private final WhatsAppTemplateService whatsAppTemplateService;

  public WhatsAppTemplateController(WhatsAppTemplateService whatsAppTemplateService) {
    this.whatsAppTemplateService = whatsAppTemplateService;
  }

  @GetMapping
  public ApiResponse<?> list(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    if (principal.role() == AppUserRole.admin_super) {
      return ApiResponse.ok(whatsAppTemplateService.listMaster(principal));
    }
    return ApiResponse.ok(whatsAppTemplateService.listOwner(principal));
  }

  @GetMapping("/{uniqueName}")
  public ApiResponse<WhatsAppTemplateView> get(
      Authentication authentication, @PathVariable String uniqueName) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    if (principal.role() == AppUserRole.admin_super) {
      throw WhatsAppTemplatePolicy.forbidden();
    }
    return ApiResponse.ok(whatsAppTemplateService.getOwner(principal, uniqueName));
  }

  @PutMapping("/{uniqueName}/variables")
  public ApiResponse<WhatsAppTemplateView> putVariables(
      Authentication authentication,
      @PathVariable String uniqueName,
      @RequestBody JsonNode payload) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(whatsAppTemplateService.putVariables(principal, uniqueName, payload));
  }

  @PostMapping("/provider/sync")
  public ApiResponse<WhatsAppMasterCatalogue> sync(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(whatsAppTemplateService.syncProvider(principal));
  }
}
