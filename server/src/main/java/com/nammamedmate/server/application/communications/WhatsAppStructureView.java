package com.nammamedmate.server.application.communications;

import java.util.List;

public record WhatsAppStructureView(
    String uniqueName,
    String body,
    List<String> tenantSlots,
    List<String> runtimeSlots,
    String status,
    String metaTemplateId) {}
