package com.nammamedmate.server.application.communications;

import java.util.List;
import java.util.Map;

public record WhatsAppTemplateView(
    String uniqueName,
    String namespaceName,
    String body,
    List<String> tenantSlots,
    List<String> runtimeSlots,
    String status,
    Map<String, String> variables,
    String preview,
    int version) {}
