package com.nammamedmate.server.infrastructure.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.UserSessionRepository;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Clock;
import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class SecurityConfig {

  @Bean
  public JwtAuthenticationFilter jwtAuthenticationFilter(
      JwtService jwtService,
      AuthCookieService authCookieService,
      UserSessionRepository userSessionRepository,
      Clock clock) {
    return new JwtAuthenticationFilter(jwtService, authCookieService, userSessionRepository, clock);
  }

  @Bean
  public PasswordChangeRequiredFilter passwordChangeRequiredFilter(
      AppUserRepository appUserRepository, Clock clock, ObjectMapper objectMapper) {
    return new PasswordChangeRequiredFilter(appUserRepository, clock, objectMapper);
  }

  @Bean
  public TenantAccessFilter tenantAccessFilter(
      TenantRepository tenantRepository, ObjectMapper objectMapper) {
    return new TenantAccessFilter(tenantRepository, objectMapper);
  }

  @Bean
  public FilterRegistrationBean<PasswordChangeRequiredFilter> disableDuplicatePasswordFilter(
      PasswordChangeRequiredFilter passwordChangeRequiredFilter) {
    FilterRegistrationBean<PasswordChangeRequiredFilter> registration =
        new FilterRegistrationBean<>(passwordChangeRequiredFilter);
    registration.setEnabled(false);
    return registration;
  }

  @Bean
  public FilterRegistrationBean<TenantAccessFilter> disableDuplicateTenantAccessFilter(
      TenantAccessFilter tenantAccessFilter) {
    FilterRegistrationBean<TenantAccessFilter> registration =
        new FilterRegistrationBean<>(tenantAccessFilter);
    registration.setEnabled(false);
    return registration;
  }

  @Bean
  public Clock utcClock() {
    return Clock.systemUTC();
  }

  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(10);
  }

  @Bean
  public CorsConfigurationSource corsConfigurationSource(
      @Value("${app.security.cors.allowed-origins:http://localhost:5173,http://localhost:5174}")
          String allowedOriginsCsv) {
    List<String> origins =
        Arrays.stream(allowedOriginsCsv.split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .toList();
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOrigins(origins);
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    config.setAllowedHeaders(List.of("*"));
    config.setAllowCredentials(true);
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return source;
  }

  @Bean
  public SecurityFilterChain securityFilterChain(
      HttpSecurity http,
      CorsConfigurationSource corsConfigurationSource,
      ObjectMapper objectMapper,
      JwtAuthenticationFilter jwtAuthenticationFilter,
      PasswordChangeRequiredFilter passwordChangeRequiredFilter,
      TenantAccessFilter tenantAccessFilter)
      throws Exception {
    http.csrf(AbstractHttpConfigurer::disable)
        .cors(cors -> cors.configurationSource(corsConfigurationSource))
        .sessionManagement(
            session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(
            auth ->
                auth.requestMatchers("/actuator/health", "/actuator/info", "/api/v1/health")
                    .permitAll()
                    .requestMatchers(HttpMethod.POST, "/api/v1/auth/login")
                    .permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/v1/auth/saved-logins")
                    .permitAll()
                    .requestMatchers(HttpMethod.POST, "/api/v1/auth/pin/login")
                    .permitAll()
                    .requestMatchers(HttpMethod.DELETE, "/api/v1/auth/saved-logins/**")
                    .permitAll()
                    .requestMatchers(HttpMethod.POST, "/api/v1/auth/password/reset-request")
                    .permitAll()
                    .requestMatchers(HttpMethod.POST, "/api/v1/auth/password/reset")
                    .permitAll()
                    .requestMatchers(HttpMethod.POST, "/api/v1/tenants/register")
                    .permitAll()
                    .requestMatchers(HttpMethod.POST, "/api/v1/tenants/verify-email")
                    .permitAll()
                    .requestMatchers(HttpMethod.POST, "/api/v1/integrations/resend/webhook")
                    .permitAll()
                    .requestMatchers(
                        HttpMethod.POST, "/api/v1/subscriptions/payments/cashfree/callback")
                    .permitAll()
                    .anyRequest()
                    .authenticated())
        .exceptionHandling(
            ex ->
                ex.authenticationEntryPoint(
                        (request, response, authException) ->
                            writeError(
                                response,
                                objectMapper,
                                HttpStatus.UNAUTHORIZED,
                                "UNAUTHORIZED",
                                "Authentication required"))
                    .accessDeniedHandler(
                        (request, response, accessDeniedException) ->
                            writeError(
                                response,
                                objectMapper,
                                HttpStatus.FORBIDDEN,
                                "FORBIDDEN",
                                "Access denied")))
        .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
        .addFilterAfter(passwordChangeRequiredFilter, JwtAuthenticationFilter.class)
        .addFilterAfter(tenantAccessFilter, PasswordChangeRequiredFilter.class);
    return http.build();
  }

  private static void writeError(
      HttpServletResponse response,
      ObjectMapper objectMapper,
      HttpStatus status,
      String code,
      String message)
      throws IOException {
    response.setStatus(status.value());
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    objectMapper.writeValue(response.getOutputStream(), ApiResponse.error(code, message));
  }
}
