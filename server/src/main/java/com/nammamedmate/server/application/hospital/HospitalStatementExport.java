package com.nammamedmate.server.application.hospital;

public record HospitalStatementExport(String filename, String contentType, byte[] content) {}
