package com.nammamedmate.server.application.inventory;

import java.util.List;

public record StockBalancesResult(List<StockBalanceView> items) {}
