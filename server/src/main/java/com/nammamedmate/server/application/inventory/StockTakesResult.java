package com.nammamedmate.server.application.inventory;

import java.util.List;

public record StockTakesResult(List<StockTakeView> items) {}
