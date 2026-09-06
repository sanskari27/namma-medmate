package com.nammamedmate.server.application.customreport;

public record CustomReportExport(String filename, String contentType, byte[] body) {}
