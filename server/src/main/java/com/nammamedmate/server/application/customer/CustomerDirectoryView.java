package com.nammamedmate.server.application.customer;

import java.time.Instant;
import java.util.UUID;

public record CustomerDirectoryView(
    UUID id,
    boolean walkInAggregate,
    String name,
    String phone,
    String email,
    String chronicConditions,
    int orderCount,
    int storeOrders,
    int onlineOrders,
    long unitsSold,
    Instant lastVisitAt,
    long loyaltyPoints,
    long lifetimeValuePaise,
    long creditDuePaise,
    boolean chronicRx,
    Instant createdAt,
    Instant updatedAt,
    UUID familyId) {}
