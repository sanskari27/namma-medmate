package com.nammamedmate.server.application.finance;

public record FinanceReportExport(String filename, String contentType, byte[] body) {}
