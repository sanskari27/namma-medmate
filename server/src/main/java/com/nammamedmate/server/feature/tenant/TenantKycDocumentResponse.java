package com.nammamedmate.server.feature.tenant;

import java.util.UUID;

public record TenantKycDocumentResponse(
    UUID id, String docType, String contentType, long byteSize, String originalFilename) {}
