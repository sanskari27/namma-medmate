package com.nammamedmate.server.domain;

public enum EmailDeliveryStatus {
  QUEUED,
  SENT,
  TRANSIENT_FAILURE,
  PERMANENT_FAILURE
}
