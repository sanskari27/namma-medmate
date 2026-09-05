package com.nammamedmate.server.application.finance;

import java.nio.file.Path;

public record ExpenseEvidenceStream(
    Path path, String contentType, String filename, long byteSize) {}
