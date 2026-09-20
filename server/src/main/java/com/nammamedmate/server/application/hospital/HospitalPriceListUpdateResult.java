package com.nammamedmate.server.application.hospital;

import java.util.UUID;

public record HospitalPriceListUpdateResult(
    String status, HospitalPriceListView priceList, UUID approvalRequestId) {}
