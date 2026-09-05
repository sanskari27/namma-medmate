package com.nammamedmate.server.application.sales;

public record InvoiceRevalidation(
    boolean stock, boolean expiry, boolean price, boolean tax, boolean approval) {}
