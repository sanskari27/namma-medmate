package com.nammamedmate.server.shared.web;

public record ApiResponse<T>(boolean success, T data, String message, String code) {

  public static <T> ApiResponse<T> ok(T data) {
    return new ApiResponse<>(true, data, null, null);
  }

  public static <T> ApiResponse<T> error(String code, String message) {
    return new ApiResponse<>(false, null, message, code);
  }
}
