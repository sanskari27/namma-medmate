package com.nammamedmate.server.application.communications;

import java.util.List;

public record WhatsAppMessageList(
    List<WhatsAppMessageView> items, int queued, int sent, int failed) {}
