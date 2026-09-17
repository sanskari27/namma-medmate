package com.nammamedmate.server.shared.web;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

class GlobalExceptionHandlerTest {

  @Test
  void unhandledExceptionReturnsInternalErrorEnvelope_CROSS_001() {
    GlobalExceptionHandler handler = new GlobalExceptionHandler();
    ResponseEntity<ApiResponse<Void>> response =
        handler.handleUnknown(new RuntimeException("boom"));
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
    assertThat(response.getBody()).isNotNull();
    assertThat(response.getBody().success()).isFalse();
    assertThat(response.getBody().code()).isEqualTo("INTERNAL_ERROR");
    assertThat(response.getBody().message()).isEqualTo("Something went wrong.");
  }

  @Test
  void methodNotAllowedStaysMethodNotAllowed() {
    GlobalExceptionHandler handler = new GlobalExceptionHandler();
    ResponseEntity<ApiResponse<Void>> response =
        handler.handleMethodNotAllowed(
            new org.springframework.web.HttpRequestMethodNotSupportedException("POST"));
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.METHOD_NOT_ALLOWED);
    assertThat(response.getBody()).isNotNull();
    assertThat(response.getBody().code()).isEqualTo("METHOD_NOT_ALLOWED");
  }

  @Test
  void missingResourceStaysNotFound() {
    GlobalExceptionHandler handler = new GlobalExceptionHandler();
    ResponseEntity<ApiResponse<Void>> response =
        handler.handleMissing(
            new org.springframework.web.servlet.resource.NoResourceFoundException(
                org.springframework.http.HttpMethod.POST, "/api/v1/missing"));
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    assertThat(response.getBody()).isNotNull();
    assertThat(response.getBody().code()).isEqualTo("NOT_FOUND");
  }
}
