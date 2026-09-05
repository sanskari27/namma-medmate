package com.nammamedmate.server.application.compliance;

public record ComplianceReportExport(String filename, String contentType, byte[] body) {}
