package com.nammamedmate.server.feature.communications;

import com.nammamedmate.server.application.communications.WhatsAppMessageList;
import com.nammamedmate.server.application.communications.WhatsAppMessageService;
import com.nammamedmate.server.application.communications.WhatsAppMessageView;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/communications/whatsapp/messages")
public class WhatsAppMessageController {

  private final WhatsAppMessageService whatsAppMessageService;

  public WhatsAppMessageController(WhatsAppMessageService whatsAppMessageService) {
    this.whatsAppMessageService = whatsAppMessageService;
  }

  @GetMapping
  public ApiResponse<WhatsAppMessageList> list(
      Authentication authentication,
      @RequestParam(required = false) String kind,
      @RequestParam(required = false) String status,
      @RequestParam(required = false) UUID campaignId) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(whatsAppMessageService.list(principal, kind, status, campaignId));
  }

  @GetMapping("/{id}")
  public ApiResponse<WhatsAppMessageView> get(
      Authentication authentication, @PathVariable UUID id) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(whatsAppMessageService.get(principal, id));
  }

  @PostMapping("/campaigns/{campaignId}")
  public ApiResponse<WhatsAppMessageList> sendCampaign(
      Authentication authentication, @PathVariable UUID campaignId) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(whatsAppMessageService.sendCampaign(principal, campaignId));
  }

  @PostMapping("/{id}/retry")
  public ApiResponse<WhatsAppMessageView> retry(
      Authentication authentication, @PathVariable UUID id) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(whatsAppMessageService.retry(principal, id));
  }
}
