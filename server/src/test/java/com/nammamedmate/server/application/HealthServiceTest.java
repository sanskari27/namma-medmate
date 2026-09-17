package com.nammamedmate.server.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.sql.Connection;
import java.sql.SQLException;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;

class HealthServiceTest {

  @Test
  void upWhenDatabasePingSucceeds() throws Exception {
    DataSource dataSource = mock(DataSource.class);
    Connection connection = mock(Connection.class);
    when(dataSource.getConnection()).thenReturn(connection);
    when(connection.isValid(2)).thenReturn(true);

    assertThat(new HealthService(dataSource).getHealth().status()).isEqualTo("UP");
  }

  @Test
  void downWhenDatabasePingFails() throws Exception {
    DataSource dataSource = mock(DataSource.class);
    when(dataSource.getConnection()).thenThrow(new SQLException("refused"));

    assertThat(new HealthService(dataSource).getHealth().status()).isEqualTo("DOWN");
  }
}
