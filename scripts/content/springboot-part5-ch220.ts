// Part V — Microservices + Virtual Threads
// Chapter 220: Resilience Patterns — Circuit Breaker, Retry & Distributed Tracing

import type { QuizQuestion } from '../../src/data/curriculum'

export const courseId = 'springboot-ai-architect'

export const content: Record<string, string> = {

'220.1': `# Circuit Breaker with Resilience4j

In a microservices system, a slow or failing downstream service can cascade into a full system failure. If every request to Order Service waits 30 seconds for a timeout from a failing Inventory Service, Order Service's thread pool (or virtual threads) backs up, and soon Order Service is down too. This is a **cascade failure**.

The Circuit Breaker pattern prevents cascade failures by detecting when a downstream service is unhealthy and stopping calls to it temporarily, allowing the system to recover.

## The Three States

\`\`\`
           too many failures
CLOSED ──────────────────────→ OPEN
  ↑                               │
  │                        wait (30s)
  │                               │
  └─── success ─── HALF_OPEN ←───┘
                  (probe calls)
\`\`\`

- **CLOSED**: Normal operation. Calls pass through. Failure rate is tracked.
- **OPEN**: Calls are rejected immediately (fail fast) without reaching the downstream service. A timer runs.
- **HALF_OPEN**: After the timer, a limited number of probe calls are allowed. If they succeed, the circuit closes. If they fail, it opens again.

## Dependency

\`\`\`xml
<dependency>
    <groupId>io.github.resilience4j</groupId>
    <artifactId>resilience4j-spring-boot3</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-aop</artifactId>
</dependency>
\`\`\`

## Configuration

\`\`\`yaml
resilience4j:
  circuitbreaker:
    instances:
      inventory-service:
        sliding-window-type: COUNT_BASED      # or TIME_BASED
        sliding-window-size: 10               # last 10 calls
        failure-rate-threshold: 50            # open if ≥50% fail
        wait-duration-in-open-state: 30s      # stay open 30s before HALF_OPEN
        permitted-number-of-calls-in-half-open-state: 3  # 3 probe calls
        slow-call-duration-threshold: 3s      # calls over 3s count as failures
        slow-call-rate-threshold: 80          # open if ≥80% are slow
        record-exceptions:
          - java.io.IOException
          - feign.FeignException.ServiceUnavailable
        ignore-exceptions:
          - com.example.exception.ProductNotFoundException  # 404s don't trip the breaker
\`\`\`

## Using @CircuitBreaker

\`\`\`java
@Service
@RequiredArgsConstructor
public class OrderService {

    private final InventoryClient inventoryClient;

    @CircuitBreaker(name = "inventory-service", fallbackMethod = "getStockFallback")
    public StockLevel getStock(String productId) {
        return inventoryClient.getStockLevel(productId);
    }

    // Fallback signature must match the annotated method + one additional Throwable parameter
    private StockLevel getStockFallback(String productId, Exception e) {
        log.warn("Circuit breaker active for inventory-service: {}", e.getMessage());
        // Return a safe default — assume no stock available
        return new StockLevel(productId, 0, false);
    }
}
\`\`\`

The fallback is called when:
- The circuit is OPEN (fail fast, fallback immediately)
- The call throws a recorded exception
- The call exceeds the slow call threshold

## Monitoring Circuit Breaker State

Resilience4j integrates with Spring Boot Actuator:

\`\`\`yaml
management:
  endpoints:
    web:
      exposure:
        include: health,circuitbreakers,metrics
  health:
    circuitbreakers:
      enabled: true
\`\`\`

\`GET /actuator/health\` shows each circuit breaker's current state and failure rate. \`GET /actuator/metrics/resilience4j.circuitbreaker.calls\` gives call counts by outcome.

## Combining @CircuitBreaker with @Retry

\`\`\`java
@CircuitBreaker(name = "payment-service", fallbackMethod = "paymentFallback")
@Retry(name = "payment-service")      // Retry is applied first (inner); circuit breaker is outer
public ChargeResult chargeCustomer(ChargeRequest request) {
    return paymentClient.charge(request);
}
\`\`\`

The order of decoration matters: \`@Retry\` wraps the call; \`@CircuitBreaker\` wraps the retry. This means retries happen before the circuit breaker counts failures — three failed retries count as one failure to the circuit breaker.

## Testing Circuit Breakers

\`\`\`java
@SpringBootTest
class CircuitBreakerTest {

    @Autowired
    private OrderService orderService;

    @MockBean
    private InventoryClient inventoryClient;

    @Autowired
    private CircuitBreakerRegistry circuitBreakerRegistry;

    @Test
    void circuit_opens_after_threshold_failures() {
        // Simulate persistent failure
        when(inventoryClient.getStockLevel(any()))
            .thenThrow(new FeignException.ServiceUnavailable("Service down", null, null, null));

        // Trigger enough failures to open the circuit
        for (int i = 0; i < 10; i++) {
            assertDoesNotThrow(() -> orderService.getStock("sku-123")); // fallback handles it
        }

        CircuitBreaker cb = circuitBreakerRegistry.circuitBreaker("inventory-service");
        assertThat(cb.getState()).isEqualTo(CircuitBreaker.State.OPEN);
    }
}
\`\`\``,

'220.2': `# Retry, Rate Limiter & Bulkhead

Resilience4j provides four complementary patterns beyond the circuit breaker. Together they form a defensive layer that makes inter-service calls resilient to transient failures, overload, and resource exhaustion.

## Retry

Retries handle transient failures — a brief network blip, a momentary DB overload — without exposing them to callers.

\`\`\`yaml
resilience4j:
  retry:
    instances:
      payment-service:
        max-attempts: 3
        wait-duration: 500ms
        retry-exceptions:
          - java.io.IOException
          - feign.FeignException.ServiceUnavailable
        ignore-exceptions:
          - com.example.exception.PaymentDeclinedException  # Don't retry business errors
        exponential-backoff-multiplier: 2    # Wait: 500ms, 1000ms, 2000ms
        enable-exponential-backoff: true
\`\`\`

\`\`\`java
@Retry(name = "payment-service", fallbackMethod = "paymentRetryFallback")
public ChargeResult chargeCustomer(ChargeRequest request) {
    return paymentClient.charge(request);
}

private ChargeResult paymentRetryFallback(ChargeRequest request, Exception e) {
    throw new PaymentServiceException("Payment service unavailable after retries: " + e.getMessage());
}
\`\`\`

**Critical rule**: Only retry **idempotent** operations. If charging a customer's card is not idempotent (it isn't), retrying on timeout can charge them twice. Use an idempotency key on the request:

\`\`\`java
public ChargeResult chargeCustomer(ChargeRequest request) {
    // Add an idempotency key — if the payment provider received the first request, it returns the same result
    return paymentClient.charge(request.withIdempotencyKey(request.orderId()));
}
\`\`\`

## Rate Limiter

A rate limiter caps how many calls your service makes to a downstream service per unit of time, preventing you from overwhelming it:

\`\`\`yaml
resilience4j:
  ratelimiter:
    instances:
      email-service:
        limit-for-period: 100         # max 100 calls per refresh period
        limit-refresh-period: 1s      # reset every 1 second
        timeout-duration: 0           # fail immediately if limit exceeded (don't queue)
\`\`\`

\`\`\`java
@RateLimiter(name = "email-service", fallbackMethod = "emailRateLimitFallback")
public void sendEmail(String to, String subject, String body) {
    emailClient.send(to, subject, body);
}

private void emailRateLimitFallback(String to, String subject, String body,
                                     RequestNotPermitted e) {
    log.warn("Email rate limit exceeded — queuing email to {} for later", to);
    emailQueueService.enqueue(to, subject, body);
}
\`\`\`

## Bulkhead

A bulkhead limits the number of concurrent calls to a downstream service, preventing one slow service from consuming all available threads/resources:

\`\`\`yaml
resilience4j:
  bulkhead:
    instances:
      inventory-service:
        max-concurrent-calls: 20       # Only 20 concurrent calls allowed
        max-wait-duration: 100ms       # How long to wait if all 20 slots are taken
\`\`\`

\`\`\`java
@Bulkhead(name = "inventory-service", fallbackMethod = "stockBulkheadFallback",
          type = Bulkhead.Type.SEMAPHORE)
public StockLevel getStock(String productId) {
    return inventoryClient.getStockLevel(productId);
}

private StockLevel stockBulkheadFallback(String productId, BulkheadFullException e) {
    return new StockLevel(productId, 0, false); // safe default when overloaded
}
\`\`\`

With virtual threads, use \`Bulkhead.Type.SEMAPHORE\` (the default). Thread pool bulkheads (\`Bulkhead.Type.THREADPOOL\`) manage a separate thread pool — less useful when virtual threads are the thread model.

## Combining Patterns — The Recommended Stack

\`\`\`java
// Decoration order (inner to outer): Bulkhead → Retry → CircuitBreaker → RateLimiter
@RateLimiter(name = "inventory-service")
@CircuitBreaker(name = "inventory-service", fallbackMethod = "stockFallback")
@Retry(name = "inventory-service")
@Bulkhead(name = "inventory-service")
public StockLevel getStock(String productId) {
    return inventoryClient.getStockLevel(productId);
}
\`\`\`

The annotations are applied in reverse order of declaration (Spring AOP wraps them). The outermost check is RateLimiter (fail fast before even attempting the call), then CircuitBreaker (fail fast if circuit is open), then Retry (try again on transient failures), then Bulkhead (limit concurrency).

## Resilience4j Events

Resilience4j fires events for every state change that can be subscribed to:

\`\`\`java
@EventListener
public void onCircuitBreakerStateChange(CircuitBreakerOnStateTransitionEvent event) {
    log.warn("Circuit breaker {} transitioned from {} to {}",
        event.getCircuitBreakerName(),
        event.getStateTransition().getFromState(),
        event.getStateTransition().getToState());

    // Send alert if circuit opens
    if (event.getStateTransition().getToState() == CircuitBreaker.State.OPEN) {
        alertService.sendAlert(
            "Circuit breaker OPEN: " + event.getCircuitBreakerName());
    }
}
\`\`\``,

'220.3': `# Distributed Tracing with Micrometer & Zipkin

When a single user request spans five microservices, a failure in service 4 shows up as an error in service 1. Without distributed tracing, you have five separate log streams with no way to correlate them. Distributed tracing solves this by propagating a **trace ID** across all service calls, giving you a complete picture of one request's journey.

## Concepts

- **Trace**: The entire journey of one request across all services. Identified by a unique **trace ID**.
- **Span**: One unit of work within a trace (e.g., a service call, a database query). Each span has a **span ID**, a start time, and a duration.
- **Parent span**: The span that created this span. Spans form a tree under a root span.

\`\`\`
Trace ID: abc123
  ├── Span: api-gateway [0ms–5ms]
  ├── Span: order-service [5ms–80ms]
  │     ├── Span: inventory-client-call [10ms–40ms]
  │     │     └── Span: inventory-service [12ms–38ms]
  │     └── Span: db-query [50ms–75ms]
  └── Span: payment-service [80ms–130ms]
\`\`\`

## Dependencies

\`\`\`xml
<!-- Micrometer tracing core + Brave (OpenTelemetry or Brave for propagation) -->
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-tracing-bridge-brave</artifactId>
</dependency>
<!-- Zipkin reporter -->
<dependency>
    <groupId>io.zipkin.reporter2</groupId>
    <artifactId>zipkin-reporter-brave</artifactId>
</dependency>
<!-- Feign integration (adds tracing to Feign calls automatically) -->
<dependency>
    <groupId>io.github.openfeign</groupId>
    <artifactId>feign-micrometer</artifactId>
</dependency>
\`\`\`

## Configuration

\`\`\`yaml
management:
  tracing:
    sampling:
      probability: 1.0     # Sample 100% of requests (reduce to 0.1 in production)
  zipkin:
    tracing:
      endpoint: http://zipkin:9411/api/v2/spans

spring:
  application:
    name: order-service   # Appears as the service name in Zipkin
\`\`\`

Micrometer auto-configures tracing for:
- Incoming HTTP requests (adds trace/span IDs to MDC)
- Outgoing Feign calls (propagates B3 headers)
- Spring Data (spans for DB queries)
- Kafka producers and consumers

## What Happens Automatically

Once configured, every incoming HTTP request gets a trace ID in the log MDC:

\`\`\`
2024-01-15 10:30:45 [order-service] [traceId=abc123def456,spanId=789abc] INFO  OrderController - Creating order for user@example.com
2024-01-15 10:30:45 [order-service] [traceId=abc123def456,spanId=789abc] INFO  InventoryClient - GET http://inventory-service/api/inventory/products/sku-123/stock
2024-01-15 10:30:46 [inventory-service] [traceId=abc123def456,spanId=111ccc] INFO  InventoryController - Stock check for sku-123: 42 units
\`\`\`

The \`traceId\` is the same across both services — paste it into Zipkin to see the full trace.

## Adding Custom Spans

Trace your own business operations:

\`\`\`java
@Service
@RequiredArgsConstructor
public class OrderService {

    private final Tracer tracer;

    public Order createOrder(CreateOrderRequest request) {
        Span span = tracer.nextSpan().name("create-order").start();

        try (Tracer.SpanInScope scope = tracer.withSpan(span)) {
            span.tag("user.email", request.userEmail());
            span.tag("order.item.count", String.valueOf(request.items().size()));

            Order order = doCreateOrder(request);

            span.tag("order.id", order.getId().toString());
            return order;
        } catch (Exception e) {
            span.error(e);
            throw e;
        } finally {
            span.end();
        }
    }
}
\`\`\`

## Adding Trace ID to HTTP Responses

Expose the trace ID in a response header so clients can report it in bug reports:

\`\`\`java
@Component
public class TraceIdResponseFilter implements Filter {

    private final Tracer tracer;

    @Override
    public void doFilter(ServletRequest request, ServletResponse response,
                          FilterChain chain) throws IOException, ServletException {
        String traceId = tracer.currentSpan() != null
            ? tracer.currentSpan().context().traceId()
            : "none";
        ((HttpServletResponse) response).setHeader("X-Trace-Id", traceId);
        chain.doFilter(request, response);
    }
}
\`\`\`

## Running Zipkin Locally

\`\`\`yaml
# docker-compose.yml
services:
  zipkin:
    image: openzipkin/zipkin:3
    ports:
      - "9411:9411"
\`\`\`

Open \`http://localhost:9411\` — the Zipkin UI lets you search traces by service name, trace ID, duration, and tags.

## Production Sampling

100% sampling is only for development. In production, sample 1–10% of traces to balance observability with storage cost:

\`\`\`yaml
management:
  tracing:
    sampling:
      probability: 0.05    # Sample 5% of requests
\`\`\`

For errors and slow requests, always sample regardless of the rate:

\`\`\`java
@Bean
public Sampler customSampler() {
    return Sampler.create(0.05f); // 5% of all requests
}

// Always sample errors and slow requests by overriding in a filter
// or using a custom SamplerFunction
\`\`\`

## OpenTelemetry as an Alternative

Spring Boot 3.x also supports the OpenTelemetry (OTEL) protocol, which is vendor-neutral and supported by many backends (Jaeger, Tempo, Honeycomb, Datadog):

\`\`\`xml
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-tracing-bridge-otel</artifactId>
</dependency>
<dependency>
    <groupId>io.opentelemetry</groupId>
    <artifactId>opentelemetry-exporter-otlp</artifactId>
</dependency>
\`\`\`

\`\`\`yaml
management:
  otlp:
    tracing:
      endpoint: http://otel-collector:4318/v1/traces
\`\`\`

OTEL is the direction the ecosystem is moving. For new projects, prefer OTEL over Zipkin/B3 directly.`,
}

export const quiz: Record<string, QuizQuestion[]> = {

'220.1': [
  {
    question: 'What is a cascade failure in microservices and how does the circuit breaker prevent it?',
    options: [
      'A cascade failure is when one service\'s data corrupts another\'s. The circuit breaker prevents this with data validation.',
      'A cascade failure is when a slow/failing downstream service causes upstream services to back up and fail too. The circuit breaker fails fast, preventing callers from waiting and consuming resources on a failing service.',
      'A cascade failure is when Kafka messages pile up and overwhelm consumers. The circuit breaker rate-limits message production.',
      'A cascade failure occurs when too many services restart simultaneously. The circuit breaker staggers restarts.',
    ],
    correctIndex: 1,
    explanation: 'When Service B is slow, Service A\'s threads wait for timeouts. With 10,000 requests all waiting 30 seconds, Service A runs out of resources and starts failing too — the failure cascades. An OPEN circuit breaker returns immediately (fail fast) without waiting, protecting Service A from Service B\'s failure.',
  },
  {
    question: 'In the HALF_OPEN state, what does the circuit breaker do?',
    options: [
      'It lets through 50% of traffic, blocking the other 50%',
      'After the open-state timer, it allows a limited number of probe calls to test if the downstream service has recovered, then closes or reopens based on results',
      'It switches to an in-memory cache as a permanent fallback',
      'It queries the Eureka registry to find a healthy instance of the failing service',
    ],
    correctIndex: 1,
    explanation: 'HALF_OPEN is a probe state. After the wait duration, the circuit allows a small number of calls through (configured by permitted-number-of-calls-in-half-open-state). If those calls succeed, the circuit closes (normal operation resumes). If they fail, the circuit opens again and the timer restarts.',
  },
  {
    question: 'Why should ProductNotFoundException be in the ignore-exceptions list for the inventory circuit breaker?',
    options: [
      'Spring Security requires exceptions to be ignored before they reach the circuit breaker',
      'A 404 means the product doesn\'t exist — it\'s a valid business response, not a service health problem. Counting it as a failure would trip the circuit breaker for healthy services',
      'Ignored exceptions are automatically retried by the circuit breaker',
      'ProductNotFoundException cannot be thrown from a Feign client',
    ],
    correctIndex: 1,
    explanation: 'The circuit breaker monitors service health, not business logic. A 404 response means inventory service is working correctly — it just doesn\'t have that product. If you count 404s as failures, a spike in lookups for non-existent products trips the circuit even though the service is healthy.',
  },
  {
    question: 'When @CircuitBreaker and @Retry are combined on the same method, which executes first?',
    options: [
      '@CircuitBreaker executes first — if the circuit is open, no retries occur',
      '@Retry executes first (inner) — retries happen before the circuit breaker counts them as a failure',
      'Both execute simultaneously using virtual threads',
      'The order depends on which annotation is listed first in the source code',
    ],
    correctIndex: 1,
    explanation: 'Spring AOP wraps annotations in reverse declaration order. @Retry is inner (closer to the actual call) and @CircuitBreaker is outer. So: circuit breaker checks state → retry wraps the call (tries up to max-attempts times) → all retries failing = one failure counted by the circuit breaker.',
  },
  {
    question: 'What is the slow-call-duration-threshold configuration in Resilience4j and why is it important?',
    options: [
      'It sets the maximum timeout for the entire circuit breaker check',
      'Calls that take longer than this threshold are counted as failures — preventing a service that responds slowly (but doesn\'t fail) from being counted as healthy',
      'It delays the circuit breaker from opening for this duration after the first failure',
      'It sets the time the circuit waits in HALF_OPEN state before opening again',
    ],
    correctIndex: 1,
    explanation: 'A service that always takes 10 seconds to respond is effectively broken from a user experience perspective, even if it doesn\'t throw exceptions. slow-call-duration-threshold counts slow calls as failures, allowing the circuit breaker to open and fail fast rather than making callers wait 10 seconds for every degraded call.',
  },
],

'220.2': [
  {
    question: 'Why is idempotency critical when adding @Retry to a payment charge call?',
    options: [
      'Payment services require an idempotency key for all API calls',
      'Without idempotency, a retry after a timeout might process a payment twice — the first call may have succeeded even though the response was lost',
      '@Retry requires all methods to be idempotent to function correctly',
      'Idempotency prevents the circuit breaker from opening during retries',
    ],
    correctIndex: 1,
    explanation: 'A network timeout means the client never received a response — but the server may have processed the request. Retrying without an idempotency key charges the customer a second time. An idempotency key (e.g., order ID) lets the payment provider detect the duplicate and return the original result instead of processing again.',
  },
  {
    question: 'What is the difference between a Rate Limiter and a Bulkhead in Resilience4j?',
    options: [
      'Rate Limiter limits calls per time window; Bulkhead limits simultaneous concurrent calls',
      'Rate Limiter is for producers; Bulkhead is for consumers',
      'Rate Limiter rejects excess calls immediately; Bulkhead retries them',
      'There is no difference — they are different names for the same pattern',
    ],
    correctIndex: 1,
    explanation: 'Rate Limiter: "you may make at most N calls per second" — controls throughput over time. Bulkhead: "you may have at most N calls in flight simultaneously" — controls concurrency. A rate limiter prevents bursts; a bulkhead prevents resource exhaustion from concurrent calls.',
  },
  {
    question: 'Why is Bulkhead.Type.SEMAPHORE preferred over THREADPOOL when using Java 21 virtual threads?',
    options: [
      'SEMAPHORE is always faster than THREADPOOL regardless of thread model',
      'THREADPOOL creates a separate OS thread pool that conflicts with virtual threads; SEMAPHORE uses a counting semaphore that works correctly within the virtual thread model',
      'Virtual threads do not support THREADPOOL bulkheads due to a JVM limitation',
      'SEMAPHORE bulkheads integrate with circuit breakers while THREADPOOL ones do not',
    ],
    correctIndex: 1,
    explanation: 'THREADPOOL bulkhead creates and manages its own fixed thread pool — redundant and wasteful when virtual threads are the execution model. SEMAPHORE bulkhead uses a simple counter (semaphore) to limit concurrency without creating additional threads, which is the correct approach with virtual threads.',
  },
  {
    question: 'In the recommended resilience annotation stack (@RateLimiter → @CircuitBreaker → @Retry → @Bulkhead), what does the outermost layer (RateLimiter) prevent?',
    options: [
      'It prevents calls when the circuit is open',
      'It prevents your service from sending more requests to the downstream service than it can handle, even when the circuit is closed and retries are configured',
      'It limits the number of concurrent virtual threads',
      'It prevents duplicate calls from being sent within the same request',
    ],
    correctIndex: 1,
    explanation: 'The rate limiter is the first check: "are we within our allowed call rate?" If exceeded, it fails fast without even checking the circuit breaker state, attempting retries, or acquiring a bulkhead semaphore. It\'s the coarsest filter — protecting the downstream service from being overwhelmed by your service.',
  },
  {
    question: 'What should the exponential-backoff-multiplier be set to and why is exponential backoff preferable to fixed delay retries?',
    options: [
      'Always 1 (fixed delay) — predictable timing prevents thundering herd',
      'A multiplier of 2 (wait 500ms, 1000ms, 2000ms) — exponential backoff gives the downstream service more time to recover between retries and reduces thundering herd compared to all callers retrying at the same fixed interval',
      'Any value above 10 — more aggressive backoff always improves reliability',
      'The multiplier does not matter as long as max-attempts is set to 1',
    ],
    correctIndex: 1,
    explanation: 'With fixed delay, all callers retry at the same time — creating a thundering herd that hammers the recovering service. Exponential backoff increases delay between retries. When combined with jitter (random variation), retries from multiple callers spread out, giving the service time to recover incrementally.',
  },
],

'220.3': [
  {
    question: 'What is the relationship between a Trace and a Span in distributed tracing?',
    options: [
      'A Trace is one unit of work; a Span is the collection of all traces for a service',
      'A Trace represents the entire journey of one request across services; a Span is one unit of work within that journey (e.g., one service call or DB query)',
      'A Span is a group of traces correlated by user ID; a Trace is an individual service call',
      'A Trace and a Span are the same thing — the terms are used interchangeably',
    ],
    correctIndex: 1,
    explanation: 'A Trace has one trace ID shared by all its spans. Each Span has its own span ID and an optional parent span ID, forming a tree. The root span is the initial request entry point. Child spans represent downstream calls, DB queries, and any custom operations traced within the request.',
  },
  {
    question: 'How does Micrometer propagate the trace ID from Order Service to Inventory Service in a Feign call?',
    options: [
      'By adding the trace ID to the request body as a JSON field',
      'By adding B3 or W3C Trace Context headers (e.g., X-B3-TraceId) to the outgoing HTTP request, which Inventory Service reads and uses to continue the trace',
      'By writing the trace ID to a shared Redis key before making the call',
      'Trace IDs are generated independently by each service using the same seed algorithm',
    ],
    correctIndex: 1,
    explanation: 'Distributed tracing uses HTTP headers to propagate context. With Brave (Zipkin), these are B3 headers (X-B3-TraceId, X-B3-SpanId, X-B3-ParentSpanId). The feign-micrometer integration automatically adds these headers to outgoing Feign calls and reads them from incoming requests, stitching the trace together across services.',
  },
  {
    question: 'Why should you reduce sampling probability to 0.01–0.10 in production instead of keeping it at 1.0?',
    options: [
      'Higher sampling rates cause latency overhead in the tracing library that degrades application performance significantly',
      'Tracing every request at production scale generates massive storage and network costs — sampling 1–10% still provides statistically representative data for debugging most issues',
      'Spring Boot\'s Micrometer library does not support 1.0 sampling probability in production mode',
      'Lower sampling rates improve trace quality because fewer traces are analyzed at the same time',
    ],
    correctIndex: 1,
    explanation: 'At 10,000 requests/second, 100% sampling means 10,000 traces/second being exported and stored. At $0.10/GB for trace storage, costs add up fast. 1–5% sampling captures 100–500 traces/second — more than enough for debugging. Errors should be sampled at 100% regardless of the base rate.',
  },
  {
    question: 'What is the advantage of OpenTelemetry (OTEL) over the Zipkin/B3 protocol for new Spring Boot projects?',
    options: [
      'OTEL is faster because it uses gRPC instead of HTTP',
      'OTEL is vendor-neutral — the same instrumentation works with Jaeger, Zipkin, Tempo, Honeycomb, Datadog, and any other OTEL-compatible backend without changing application code',
      'OTEL supports distributed tracing while B3 only supports single-service tracing',
      'OTEL is included in the JDK; B3 requires a third-party library',
    ],
    correctIndex: 1,
    explanation: 'B3/Zipkin is a specific protocol tied to Zipkin infrastructure. OTEL is the CNCF standard that all major observability vendors have adopted. With OTEL, you instrument your application once and route telemetry to any backend by changing configuration — no code changes needed when switching from Jaeger to Tempo.',
  },
  {
    question: 'Why is exposing the trace ID in an X-Trace-Id response header useful for production debugging?',
    options: [
      'It allows Zipkin to automatically correlate the trace with the HTTP response',
      'Users or clients can include the trace ID in bug reports, allowing engineers to find the exact trace in Zipkin and see the complete request journey across all services',
      'Spring Security requires the trace ID header for inter-service authentication',
      'The trace ID header enables the API gateway to retry failed requests using the same trace',
    ],
    correctIndex: 1,
    explanation: 'When a customer reports an error ("I got a 500 at 3:47 PM"), you have a large haystack of logs. If the error response included X-Trace-Id: abc123, the customer can provide that ID and an engineer can search Zipkin by trace ID to find the exact failing request and see every service call, DB query, and error that contributed to the failure.',
  },
],
}

export const codingTask: Record<string, {
  instructions: string; boilerplate: string; rubric: string[]; hints: string[]
}> = {

'220.1': {
  instructions: `Configure Resilience4j circuit breaker and retry for a \`PaymentService\` that calls an external payment gateway via Feign.

Requirements:

**application.yml configuration:**
1. Circuit breaker named \`payment-gateway\`:
   - Sliding window: COUNT_BASED, size 10
   - Failure rate threshold: 60%
   - Wait duration in open state: 20s
   - 2 permitted calls in HALF_OPEN
   - Slow call threshold: 5 seconds
   - Record: \`IOException\`, \`FeignException.ServiceUnavailable\`
   - Ignore: \`PaymentDeclinedException\`

2. Retry named \`payment-gateway\`:
   - Max attempts: 3
   - Wait: 1s with exponential backoff multiplier 2
   - Retry on: \`IOException\`, \`FeignException.ServiceUnavailable\`
   - Ignore: \`PaymentDeclinedException\`

**Java implementation:**
3. In \`PaymentService\`, annotate \`chargeCustomer(ChargeRequest)\` with both \`@CircuitBreaker\` and \`@Retry\`, in the correct order for retry-then-breaker semantics.
4. Add a \`chargeCustomerFallback\` that throws \`PaymentServiceException("Payment gateway unavailable")\`.`,
  boilerplate: `# application.yml — add resilience4j config here

# resilience4j:
#   circuitbreaker: ...
#   retry: ...

---

package com.example.service;

import com.example.client.PaymentGatewayClient;
import com.example.dto.ChargeRequest;
import com.example.dto.ChargeResult;
import com.example.exception.PaymentDeclinedException;
import com.example.exception.PaymentServiceException;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentGatewayClient paymentGatewayClient;

    // TODO: Add @CircuitBreaker and @Retry annotations in the correct order
    //       CircuitBreaker: name="payment-gateway", fallbackMethod="chargeCustomerFallback"
    //       Retry: name="payment-gateway"
    public ChargeResult chargeCustomer(ChargeRequest request) {
        return paymentGatewayClient.charge(request);
    }

    // TODO: Implement fallback — throws PaymentServiceException
    // Remember: fallback signature = same params as annotated method + Exception e
    private ChargeResult chargeCustomerFallback(ChargeRequest request, Exception e) {
        return null; // implement
    }
}`,
  rubric: [
    'resilience4j.circuitbreaker.instances.payment-gateway has sliding-window-type: COUNT_BASED',
    'failure-rate-threshold: 60 and sliding-window-size: 10',
    'wait-duration-in-open-state: 20s and permitted-number-of-calls-in-half-open-state: 2',
    'slow-call-duration-threshold: 5s is configured',
    'record-exceptions includes IOException and FeignException.ServiceUnavailable',
    'ignore-exceptions includes PaymentDeclinedException',
    'resilience4j.retry.instances.payment-gateway has max-attempts: 3 and enable-exponential-backoff: true',
    'retry exponential-backoff-multiplier: 2 and wait-duration: 1s',
    '@CircuitBreaker is declared BEFORE @Retry (outer before inner in annotation order)',
    'Fallback method throws PaymentServiceException("Payment gateway unavailable")',
  ],
  hints: [
    '@CircuitBreaker(name = "payment-gateway", fallbackMethod = "chargeCustomerFallback") goes first (outer)',
    '@Retry(name = "payment-gateway") goes second (inner — closer to the actual call)',
    'Fallback: private ChargeResult chargeCustomerFallback(ChargeRequest request, Exception e) { throw new PaymentServiceException("Payment gateway unavailable"); }',
    'enable-exponential-backoff: true with exponential-backoff-multiplier: 2',
    'record-exceptions is a YAML list: - java.io.IOException',
  ],
},
}
