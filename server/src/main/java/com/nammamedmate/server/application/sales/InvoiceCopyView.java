package com.nammamedmate.server.application.sales;

import com.nammamedmate.server.domain.EmailDeliveryStatus;
import java.util.UUID;

public record InvoiceCopyView(
    UUID id, EmailDeliveryStatus status, boolean replayed, String invoiceNumber) {}
