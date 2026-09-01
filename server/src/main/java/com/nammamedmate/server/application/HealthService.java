package com.nammamedmate.server.application;

import org.springframework.stereotype.Service;

@Service
public class HealthService {

  public HealthStatus getHealth() {
    return new HealthStatus("UP", "namma-medmate-server");
  }
}
