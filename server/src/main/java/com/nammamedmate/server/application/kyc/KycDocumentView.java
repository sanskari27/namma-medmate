package com.nammamedmate.server.application.kyc;

import com.nammamedmate.server.domain.KycDocType;
import java.util.UUID;

public record KycDocumentView(
    UUID id, KycDocType docType, String contentType, long byteSize, String originalFilename) {}
