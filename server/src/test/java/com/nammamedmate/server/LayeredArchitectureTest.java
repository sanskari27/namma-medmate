package com.nammamedmate.server;

import static com.tngtech.archunit.library.Architectures.layeredArchitecture;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

@AnalyzeClasses(
    packages = "com.nammamedmate.server",
    importOptions = ImportOption.DoNotIncludeTests.class)
class LayeredArchitectureTest {

  @ArchTest
  static final ArchRule layers_respected =
      layeredArchitecture()
          .consideringAllDependencies()
          .layer("feature")
          .definedBy("..feature..")
          .layer("application")
          .definedBy("..application..")
          .layer("domain")
          .definedBy("..domain..")
          .layer("persistence")
          .definedBy("..persistence..")
          .layer("infrastructure")
          .definedBy("..infrastructure..")
          .whereLayer("feature")
          .mayNotBeAccessedByAnyLayer()
          .whereLayer("application")
          .mayOnlyBeAccessedByLayers("feature", "infrastructure")
          .whereLayer("persistence")
          .mayOnlyBeAccessedByLayers("application", "infrastructure")
          .whereLayer("domain")
          .mayOnlyBeAccessedByLayers("application", "persistence", "infrastructure", "feature");
}
