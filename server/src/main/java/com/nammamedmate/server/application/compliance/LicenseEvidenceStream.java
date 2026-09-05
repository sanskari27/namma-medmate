package com.nammamedmate.server.application.compliance;

import java.nio.file.Path;

public record LicenseEvidenceStream(
    Path path, String contentType, String filename, long byteSize) {}
