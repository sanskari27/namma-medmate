package com.nammamedmate.server.application;

import java.sql.Connection;
import java.sql.SQLException;
import javax.sql.DataSource;
import org.springframework.stereotype.Service;

@Service
public class HealthService {

  private static final String SERVICE = "namma-medmate-server";

  private final DataSource dataSource;

  public HealthService(DataSource dataSource) {
    this.dataSource = dataSource;
  }

  public HealthStatus getHealth() {
    try (Connection connection = dataSource.getConnection()) {
      if (connection.isValid(2)) {
        return new HealthStatus("UP", SERVICE);
      }
    } catch (SQLException ignored) {
      // envelope stays; callers read status
    }
    return new HealthStatus("DOWN", SERVICE);
  }
}
