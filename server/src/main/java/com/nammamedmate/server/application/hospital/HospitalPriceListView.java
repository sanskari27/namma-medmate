package com.nammamedmate.server.application.hospital;

import java.util.List;
import java.util.UUID;

public record HospitalPriceListView(
    int uniformDiscountBps, UUID pendingApprovalRequestId, List<HospitalProductPriceView> items) {}
