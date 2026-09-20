package com.nammamedmate.server.application.hospital;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record HospitalReturnCommand(UUID issueId, String idempotencyKey, List<Line> lines) {

  public record Line(UUID productId, BigDecimal quantity) {}
}
