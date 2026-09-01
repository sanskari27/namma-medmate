package com.nammamedmate.server.infrastructure;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("local")
public class LocalEnvironmentGuard {

  @Value("${spring.datasource.url:}")
  private String databaseUrl;

  @Value("${spring.data.redis.host:}")
  private String redisHost;

  @PostConstruct
  public void failIfPointingAtProd() {
    if (databaseUrl != null && databaseUrl.contains("rds.amazonaws.com")) {
      throw new IllegalStateException(
          "Local profile must not use RDS. Use compose postgres or localhost:25432.");
    }
    if (redisHost != null && redisHost.contains("cache.amazonaws.com")) {
      throw new IllegalStateException(
          "Local profile must not use ElastiCache. Use compose redis or localhost:16379.");
    }
  }
}
