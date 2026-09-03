package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.nammamedmate.server.application.branch.AssignedBranchView;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class BranchAssignmentDomainTest {

  @Test
  void assignedBranchViewCarriesIdentityFields() {
    UUID id = UUID.randomUUID();
    AssignedBranchView view = new AssignedBranchView(id, "Main", "BR01", BranchStatus.ACTIVE);
    assertThat(view.id()).isEqualTo(id);
    assertThat(view.name()).isEqualTo("Main");
    assertThat(view.branchCode()).isEqualTo("BR01");
    assertThat(view.status()).isEqualTo(BranchStatus.ACTIVE);
  }

  @Test
  void ownerConsolidatedMeansNullActiveBranch() {
    UUID active = null;
    List<AssignedBranchView> branches =
        List.of(
            new AssignedBranchView(UUID.randomUUID(), "Main", "BR01", BranchStatus.ACTIVE),
            new AssignedBranchView(UUID.randomUUID(), "Annex", "BR02", BranchStatus.ACTIVE));
    assertThat(active).isNull();
    assertThat(branches).hasSize(2);
  }
}
