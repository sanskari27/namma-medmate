package com.nammamedmate.server.infrastructure.cashfree;

import com.fasterxml.jackson.databind.JsonNode;
import com.nammamedmate.server.domain.CashfreeBillingPolicy;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
public class CashfreePgAdapter {

  private static final Logger log = LoggerFactory.getLogger(CashfreePgAdapter.class);
  private static final String API_VERSION = "2023-08-01";

  @FunctionalInterface
  public interface OrderCreator {
    CashfreeOrderResult create(CashfreeCreateOrderRequest request);
  }

  @FunctionalInterface
  public interface OrderFetcher {
    Optional<CashfreeOrderStatus> fetch(String orderId);
  }

  private final OrderCreator creator;
  private final OrderFetcher fetcher;
  private final boolean configured;

  @Autowired
  public CashfreePgAdapter(
      @Value("${app.cashfree.client-id:}") String clientId,
      @Value("${app.cashfree.client-secret:}") String clientSecret,
      @Value("${app.cashfree.env:sandbox}") String env) {
    this(clientsFrom(RestClient.create(), clientId, clientSecret, env));
  }

  CashfreePgAdapter(RestClient restClient, String clientId, String clientSecret, String env) {
    this(clientsFrom(restClient, clientId, clientSecret, env));
  }

  static CashfreePgAdapter withClients(OrderCreator creator, OrderFetcher fetcher) {
    return new CashfreePgAdapter(creator, fetcher, creator != null);
  }

  private CashfreePgAdapter(Clients clients) {
    this(clients.creator, clients.fetcher, clients.configured);
  }

  private CashfreePgAdapter(OrderCreator creator, OrderFetcher fetcher, boolean configured) {
    this.creator = creator;
    this.fetcher = fetcher;
    this.configured = configured;
  }

  public boolean configured() {
    return configured;
  }

  public CashfreeOrderResult createOrder(CashfreeCreateOrderRequest request) {
    if (creator == null) {
      log.info("cashfree create order skipped");
      return null;
    }
    return creator.create(request);
  }

  public Optional<CashfreeOrderStatus> fetchOrder(String orderId) {
    if (fetcher == null || orderId == null || orderId.isBlank()) {
      return Optional.empty();
    }
    return fetcher.fetch(orderId);
  }

  private static Clients clientsFrom(
      RestClient client, String clientId, String clientSecret, String env) {
    if (clientId == null || clientId.isBlank() || clientSecret == null || clientSecret.isBlank()) {
      return new Clients(null, null, false);
    }
    String base =
        "production".equalsIgnoreCase(env)
            ? "https://api.cashfree.com/pg"
            : "https://sandbox.cashfree.com/pg";
    OrderCreator creator =
        request -> {
          Map<String, Object> body = new LinkedHashMap<>();
          body.put("order_id", request.orderId());
          body.put("order_amount", CashfreeBillingPolicy.rupeesFromPaise(request.amountPaise()));
          body.put("order_currency", "INR");
          Map<String, Object> customer = new LinkedHashMap<>();
          customer.put("customer_id", request.tenantId().toString());
          customer.put("customer_phone", "9999999999");
          body.put("customer_details", customer);
          Map<String, Object> meta = new LinkedHashMap<>();
          meta.put("return_url", request.returnUrl() + "?payment={order_id}");
          body.put("order_meta", meta);
          Map<String, String> tags = new LinkedHashMap<>();
          tags.put("tenant_id", request.tenantId().toString());
          tags.put("plan_code", request.planCode().name());
          body.put("order_tags", tags);
          try {
            JsonNode response =
                client
                    .post()
                    .uri(base + "/orders")
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("x-client-id", clientId)
                    .header("x-client-secret", clientSecret)
                    .header("x-api-version", API_VERSION)
                    .body(body)
                    .retrieve()
                    .body(JsonNode.class);
            if (response == null) {
              throw new IllegalStateException("empty cashfree order");
            }
            String session = text(response, "payment_session_id");
            String host =
                "production".equalsIgnoreCase(env)
                    ? "https://payments.cashfree.com/pg/view/sessions/"
                    : "https://sandbox.cashfree.com/pg/view/sessions/";
            return new CashfreeOrderResult(
                request.orderId(), session, host + (session == null ? "" : session));
          } catch (RestClientException ex) {
            log.info("cashfree create order failed");
            throw new IllegalStateException("cashfree create order failed");
          }
        };
    OrderFetcher fetcher =
        orderId -> {
          try {
            JsonNode response =
                client
                    .get()
                    .uri(base + "/orders/{id}", orderId)
                    .header("x-client-id", clientId)
                    .header("x-client-secret", clientSecret)
                    .header("x-api-version", API_VERSION)
                    .retrieve()
                    .body(JsonNode.class);
            if (response == null) {
              return Optional.empty();
            }
            String status = text(response, "order_status");
            BigDecimal amount =
                response.hasNonNull("order_amount")
                    ? new BigDecimal(response.get("order_amount").asText())
                    : null;
            return Optional.of(new CashfreeOrderStatus(orderId, status, amount));
          } catch (RestClientException ex) {
            log.info("cashfree fetch order failed");
            return Optional.empty();
          }
        };
    return new Clients(creator, fetcher, true);
  }

  private static String text(JsonNode json, String field) {
    JsonNode node = json.get(field);
    return node == null || node.isNull() ? null : node.asText();
  }

  private record Clients(OrderCreator creator, OrderFetcher fetcher, boolean configured) {}
}
