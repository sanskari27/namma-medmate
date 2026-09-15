package com.nammamedmate.server.domain;

import com.nammamedmate.server.shared.exception.ApiException;
import org.springframework.http.HttpStatus;

public final class ImpersonationCredentialPolicy {

  public static final String CODE = "SUPPORT_CREDENTIALS_BLOCKED";
  public static final String MESSAGE =
      "Exit the support session before changing a password or PIN.";

  private ImpersonationCredentialPolicy() {}

  public static void rejectRotateWhileImpersonating(boolean impersonating) {
    if (impersonating) {
      throw new ApiException(HttpStatus.FORBIDDEN, CODE, MESSAGE);
    }
  }
}
