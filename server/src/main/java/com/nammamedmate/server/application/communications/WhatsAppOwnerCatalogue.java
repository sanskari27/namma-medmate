package com.nammamedmate.server.application.communications;

import java.util.List;

public record WhatsAppOwnerCatalogue(
    WhatsAppProviderView provider, List<WhatsAppTemplateView> templates) {}
