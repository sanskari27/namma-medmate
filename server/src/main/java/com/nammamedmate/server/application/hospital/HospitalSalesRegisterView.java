package com.nammamedmate.server.application.hospital;

import java.util.List;

public record HospitalSalesRegisterView(
    List<HospitalSalesRegisterTile> tiles,
    HospitalSalesRegisterTotals totals,
    List<HospitalSalesRegisterRow> items) {}
