package com.nammamedmate.server.application.hospital;

import com.nammamedmate.server.domain.HospitalCreditAccount;
import com.nammamedmate.server.domain.HospitalPolicy;
import com.nammamedmate.server.domain.HospitalProductPriceRule;
import com.nammamedmate.server.domain.HospitalWard;
import com.nammamedmate.server.domain.HospitalWardStock;
import com.nammamedmate.server.domain.Product;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.HospitalCreditAccountRepository;
import com.nammamedmate.server.persistence.HospitalProductPriceRuleRepository;
import com.nammamedmate.server.persistence.HospitalWardRepository;
import com.nammamedmate.server.persistence.HospitalWardStockRepository;
import com.nammamedmate.server.persistence.ProductRepository;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HospitalWardStockService {

  private final HospitalArAccess access;
  private final HospitalWardStockRepository wardStockRepository;
  private final HospitalWardRepository wardRepository;
  private final ProductRepository productRepository;
  private final HospitalCreditAccountRepository accountRepository;
  private final HospitalProductPriceRuleRepository priceRuleRepository;

  public HospitalWardStockService(
      HospitalArAccess access,
      HospitalWardStockRepository wardStockRepository,
      HospitalWardRepository wardRepository,
      ProductRepository productRepository,
      HospitalCreditAccountRepository accountRepository,
      HospitalProductPriceRuleRepository priceRuleRepository) {
    this.access = access;
    this.wardStockRepository = wardStockRepository;
    this.wardRepository = wardRepository;
    this.productRepository = productRepository;
    this.accountRepository = accountRepository;
    this.priceRuleRepository = priceRuleRepository;
  }

  @Transactional(readOnly = true)
  public HospitalWardStockListView list(AuthPrincipal principal) {
    HospitalArAccess.BranchContext ctx = access.requireStockReader(principal);
    List<HospitalWardStock> rows =
        wardStockRepository.findAllByTenantIdAndBranchIdOrderByWardIdAscProductIdAsc(
            ctx.tenantId(), ctx.branchId());
    if (rows.isEmpty()) {
      return new HospitalWardStockListView(List.of());
    }
    HospitalCreditAccount account =
        accountRepository
            .findByTenantId(ctx.tenantId())
            .orElseThrow(HospitalPolicy::accountRequired);
    Map<UUID, HospitalProductPriceRule> rules =
        priceRuleRepository.findByTenantIdOrderByProductIdAsc(ctx.tenantId()).stream()
            .collect(Collectors.toMap(HospitalProductPriceRule::getProductId, Function.identity()));
    Map<UUID, HospitalWard> wards =
        wardRepository
            .findAllByTenantIdAndBranchIdOrderByNameAsc(ctx.tenantId(), ctx.branchId())
            .stream()
            .collect(Collectors.toMap(HospitalWard::getId, Function.identity()));
    List<HospitalWardStockListView.Item> items = new ArrayList<>();
    for (HospitalWardStock row : rows) {
      if (row.getQuantity().compareTo(BigDecimal.ZERO) <= 0) {
        continue;
      }
      HospitalWard ward = wards.get(row.getWardId());
      Product product =
          productRepository.findByIdAndTenantId(row.getProductId(), ctx.tenantId()).orElse(null);
      if (ward == null || product == null) {
        continue;
      }
      HospitalProductPriceRule rule = rules.get(product.getId());
      long mrp = product.getDefaultMrpPaise() == null ? 0L : product.getDefaultMrpPaise();
      long credit =
          HospitalPolicy.creditPricePaise(
              mrp,
              account.getUniformDiscountBps(),
              rule == null ? null : rule.getRuleType(),
              rule == null ? null : rule.getValue());
      items.add(
          new HospitalWardStockListView.Item(
              ward.getId(),
              ward.getName(),
              product.getId(),
              product.getName(),
              product.getSku(),
              row.getQuantity(),
              credit,
              HospitalPolicy.lineAmountPaise(credit, row.getQuantity())));
    }
    return new HospitalWardStockListView(items);
  }
}
