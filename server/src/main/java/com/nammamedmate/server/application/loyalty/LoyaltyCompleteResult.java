package com.nammamedmate.server.application.loyalty;

public record LoyaltyCompleteResult(
    long redeemPoints,
    long redeemPaise,
    long earnedPoints,
    long taxablePaise,
    long pendingTaxablePaise) {}
