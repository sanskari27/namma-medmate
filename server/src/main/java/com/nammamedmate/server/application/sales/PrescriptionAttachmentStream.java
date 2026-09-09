package com.nammamedmate.server.application.sales;

import java.nio.file.Path;

public record PrescriptionAttachmentStream(
    Path path, String contentType, String filename, long byteSize) {}
