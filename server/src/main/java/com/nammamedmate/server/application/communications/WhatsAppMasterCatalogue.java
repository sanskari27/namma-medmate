package com.nammamedmate.server.application.communications;

import java.util.List;

public record WhatsAppMasterCatalogue(
    WhatsAppProviderView provider, List<WhatsAppStructureView> structures) {}
