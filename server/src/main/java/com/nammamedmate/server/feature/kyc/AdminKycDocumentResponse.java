package com.nammamedmate.server.feature.kyc;

import java.util.UUID;

public record AdminKycDocumentResponse(
    UUID id, String docType, String contentType, long byteSize, String originalFilename) {}
