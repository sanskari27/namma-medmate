package com.nammamedmate.server.application.hospital;

import java.util.List;

public record HospitalIndentListView(
    long pendingCount,
    long approvedCount,
    long issuedTodayCount,
    long totalCount,
    List<HospitalIndentView> items) {}
