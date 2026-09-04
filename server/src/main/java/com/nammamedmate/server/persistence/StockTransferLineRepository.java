package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.StockTransferLine;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StockTransferLineRepository extends JpaRepository<StockTransferLine, UUID> {

  List<StockTransferLine> findAllByTransferIdOrderByCreatedAtAsc(UUID transferId);

  List<StockTransferLine> findAllByTransferIdIn(List<UUID> transferIds);
}
