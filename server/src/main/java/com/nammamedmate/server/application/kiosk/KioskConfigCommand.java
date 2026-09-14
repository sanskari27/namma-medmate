package com.nammamedmate.server.application.kiosk;

public record KioskConfigCommand(
    String displayName,
    String welcomeMessage,
    String staffExitPin,
    Integer idleResetSeconds,
    String accentTheme,
    Boolean showPrices,
    Boolean allowRxUpload,
    Boolean acceptCash,
    Boolean acceptUpi,
    Boolean acceptCard,
    Boolean acceptCod) {}
