package com.nammamedmate.server;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import javax.sql.DataSource;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class AbstractIntegrationTest {

  private static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:16-alpine")
          .withDatabaseName("nammamedmate_test")
          .withUsername("postgres")
          .withPassword("postgres");

  static {
    POSTGRES.start();
  }

  @DynamicPropertySource
  static void registerDatasource(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
    registry.add("spring.datasource.username", POSTGRES::getUsername);
    registry.add("spring.datasource.password", POSTGRES::getPassword);
  }

  @Autowired private DataSource dataSource;

  @BeforeEach
  void resetPublicTables() throws SQLException {
    try (Connection connection = dataSource.getConnection();
        Statement statement = connection.createStatement()) {
      String tables;
      try (ResultSet rs =
          statement.executeQuery(
              "SELECT string_agg(format('%I', tablename), ', ') FROM pg_tables"
                  + " WHERE schemaname = 'public'"
                  + " AND tablename NOT IN ("
                  + "'flyway_schema_history', 'access_role', 'access_role_module')")) {
        rs.next();
        tables = rs.getString(1);
      }
      statement.execute("SET session_replication_role = replica");
      try {
        if (tables != null && !tables.isBlank()) {
          for (String table : tables.split(", ")) {
            statement.execute("DELETE FROM " + table);
          }
        }
        statement.execute(
            "DELETE FROM access_role_module WHERE role_id IN"
                + " (SELECT id FROM access_role WHERE kind = 'CUSTOM')");
        statement.execute("DELETE FROM access_role WHERE kind = 'CUSTOM'");
      } finally {
        statement.execute("SET session_replication_role = DEFAULT");
      }
    }
  }
}
