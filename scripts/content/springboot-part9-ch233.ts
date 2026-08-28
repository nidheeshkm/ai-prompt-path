// Part IX — Architect Thinking
// Chapter 233: Observability & Resilience Engineering

import type { QuizQuestion } from '../../src/data/curriculum'

export const courseId = 'springboot-ai-architect'

export const content: Record<string, string> = {

'233.1': `# Observability with OpenTelemetry & Spring Boot

"Monitoring" tells you that something is wrong. "Observability" tells you why. The shift from one to the other is architectural.

## The Three Pillars of Observability

| Pillar | What it answers | Example |
|--------|----------------|---------|
| **Traces** | Which path did this request take? | A trace spanning API Gateway → Order → Payment → Inventory |
| **Metrics** | How is the system performing in aggregate? | p99 latency, error rate, saturation |
| **Logs** | What happened at a specific moment? | Exception with stack trace, business event |

These three are most valuable together: a metric alerts you, a trace shows you which operation is slow, and logs explain why.

## OpenTelemetry — The Standard

OpenTelemetry (OTel) is the CNCF standard for instrumentation. A single OTel SDK instruments your application; the collected data is exported to any backend (Jaeger, Zipkin, Grafana Tempo, Datadog, Honeycomb).

### Spring Boot Auto-Configuration

\`\`\`xml
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-tracing-bridge-otel</artifactId>
</dependency>
<dependency>
    <groupId>io.opentelemetry.instrumentation</groupId>
    <artifactId>opentelemetry-spring-boot-starter</artifactId>
    <version>2.7.0</version>
</dependency>
\`\`\`

\`\`\`yaml
management:
  tracing:
    sampling:
      probability: 1.0    # 100% in dev; 0.1–0.5 in production
  otlp:
    tracing:
      endpoint: http://otel-collector:4318/v1/traces
    metrics:
      export:
        url: http://otel-collector:4318/v1/metrics
\`\`\`

Spring Boot 3 automatically propagates trace and span IDs through \`@RestController\`, \`RestClient\`, \`WebClient\`, and \`@KafkaListener\`.

## Structured Logging

Unstructured logs (\`"User 123 placed order 456"\`) are grep-able. Structured logs are queryable:

\`\`\`java
// application.properties
logging.structured.format.console=ecs  // Elastic Common Schema
\`\`\`

Output:
\`\`\`json
{
  "@timestamp": "2025-08-01T12:00:00Z",
  "log.level": "INFO",
  "message": "Order placed",
  "trace.id": "abc123",
  "span.id": "def456",
  "order.id": "order-789",
  "customer.id": "cust-42"
}
\`\`\`

The \`trace.id\` field links this log entry to the distributed trace automatically.

## Micrometer Metrics

Micrometer is the "SLF4J for metrics" — a vendor-neutral metrics facade. Spring Boot auto-configures JVM, HTTP, and DataSource metrics.

### Custom Metrics

\`\`\`java
@Component
public class OrderMetrics {
    private final Counter ordersPlaced;
    private final Timer orderProcessingTime;
    private final Gauge activeOrders;

    public OrderMetrics(MeterRegistry registry, OrderRepository repo) {
        this.ordersPlaced = Counter.builder("orders.placed")
            .description("Total orders placed")
            .tag("channel", "web")
            .register(registry);

        this.orderProcessingTime = Timer.builder("order.processing.time")
            .description("Time to fully process an order")
            .percentiles(0.5, 0.95, 0.99)
            .register(registry);

        Gauge.builder("orders.active", repo, OrderRepository::countActive)
            .description("Currently active orders")
            .register(registry);
    }

    public void recordOrderPlaced() { ordersPlaced.increment(); }

    public <T> T recordProcessing(Supplier<T> fn) {
        return orderProcessingTime.record(fn);
    }
}
\`\`\`

## SLOs and Error Budgets

A **Service Level Objective (SLO)** is an internal reliability target: "99.9% of order-placement requests succeed within 500ms, measured over 28 days."

An **Error Budget** is the amount of unreliability allowed: 99.9% availability = 0.1% error budget = 43.8 minutes of downtime per 28 days.

When the error budget is healthy, engineering can ship changes aggressively. When it is burned, reliability work takes priority over features. This creates a data-driven negotiation between product velocity and engineering reliability.

\`\`\`yaml
# Prometheus alerting rule for SLO burn rate
- alert: OrderSLOBudgetBurning
  expr: |
    (
      sum(rate(http_server_requests_seconds_count{
        uri="/api/v1/orders", status=~"5.."
      }[5m]))
      /
      sum(rate(http_server_requests_seconds_count{
        uri="/api/v1/orders"
      }[5m]))
    ) > 0.001   # 0.1% error rate threshold
  for: 2m
  labels:
    severity: warning
  annotations:
    summary: "Order SLO error budget burning at 5x rate"
\`\`\`

## Distributed Tracing Best Practices

1. **Always propagate context** — use Spring's \`Observation\` API or OTel's \`Context.propagators()\`
2. **Add business attributes to spans** — \`span.setAttribute("order.id", orderId)\`
3. **Sample intelligently** — 100% in dev, 10–20% in production, 100% for errors
4. **Name spans meaningfully** — \`"order.payment.charge"\` not \`"POST /api"\`
`,

'233.2': `# Resilience Patterns with Resilience4j

A resilient system degrades gracefully rather than failing catastrophically. Netflix's famous Chaos Monkey made resilience engineering mainstream; today, Resilience4j provides production-grade implementations for Spring Boot.

## Circuit Breaker

A circuit breaker wraps calls to external dependencies. When the failure rate exceeds a threshold, the breaker "opens" — calls fail immediately without hitting the dependency, giving it time to recover.

### States

\`\`\`
CLOSED → (failure rate ≥ threshold) → OPEN → (wait duration elapsed) → HALF_OPEN
   ↑                                                                         |
   └─────────────────── (probe calls succeed) ──────────────────────────────┘
   ↑
   └─────────────────── (probe calls fail) → back to OPEN ─────────────────┘
\`\`\`

### Spring Boot Configuration

\`\`\`yaml
resilience4j:
  circuitbreaker:
    instances:
      payment-service:
        register-health-indicator: true
        sliding-window-type: COUNT_BASED
        sliding-window-size: 20
        failure-rate-threshold: 50          # open when 50% of last 20 calls fail
        wait-duration-in-open-state: 30s
        permitted-number-of-calls-in-half-open-state: 5
        slow-call-duration-threshold: 2s    # calls > 2s count as failures
        slow-call-rate-threshold: 80
\`\`\`

\`\`\`java
@Service
public class PaymentClient {
    private final RestClient http;

    @CircuitBreaker(name = "payment-service", fallbackMethod = "paymentFallback")
    public PaymentResult charge(PaymentRequest request) {
        return http.post()
            .uri("/payments")
            .body(request)
            .retrieve()
            .body(PaymentResult.class);
    }

    private PaymentResult paymentFallback(PaymentRequest request, Exception ex) {
        log.warn("Payment service unavailable, queuing payment", ex);
        return PaymentResult.queued(request.orderId());
    }
}
\`\`\`

## Retry Pattern

Retry is appropriate for transient failures (brief network glitches, temporary resource exhaustion) but catastrophic if applied to a genuinely overloaded service — it amplifies load.

\`\`\`yaml
resilience4j:
  retry:
    instances:
      inventory-service:
        max-attempts: 3
        wait-duration: 200ms
        enable-exponential-backoff: true
        exponential-backoff-multiplier: 2   # 200ms, 400ms, 800ms
        retry-exceptions:
          - java.net.SocketTimeoutException
          - org.springframework.web.client.ResourceAccessException
        ignore-exceptions:
          - com.example.InsufficientStockException  # don't retry business errors
\`\`\`

\`\`\`java
@Retry(name = "inventory-service")
@CircuitBreaker(name = "inventory-service")
public InventoryStatus checkStock(String sku) {
    return inventoryClient.check(sku);
}
\`\`\`

**Order matters:** Apply retry inside the circuit breaker. If retry is outside, a slow retrying call does not count as a single call from the circuit breaker's perspective.

## Bulkhead Pattern

Bulkheads prevent a slow dependency from exhausting all threads or connections. Named after the watertight compartments in a ship's hull.

### Thread Pool Bulkhead

\`\`\`yaml
resilience4j:
  bulkhead:
    instances:
      slow-partner-api:
        max-concurrent-calls: 10          # max simultaneous calls
        max-wait-duration: 50ms           # time to wait if bulkhead full
\`\`\`

\`\`\`java
@Bulkhead(name = "slow-partner-api", type = Bulkhead.Type.THREADPOOL)
@CircuitBreaker(name = "slow-partner-api")
public CompletableFuture<PartnerData> fetchPartnerData(String partnerId) {
    return CompletableFuture.supplyAsync(() -> partnerClient.fetch(partnerId));
}
\`\`\`

If the partner API becomes slow, at most 10 threads are tied up waiting. All other requests get a \`BulkheadFullException\` immediately rather than waiting behind the queue.

## Rate Limiter

Protect your own service from being overwhelmed by abusive clients:

\`\`\`yaml
resilience4j:
  ratelimiter:
    instances:
      api-rate-limit:
        limit-for-period: 100             # 100 requests per window
        limit-refresh-period: 1s          # window size
        timeout-duration: 0s              # fail immediately if rate exceeded
\`\`\`

\`\`\`java
@RateLimiter(name = "api-rate-limit", fallbackMethod = "rateLimitFallback")
@GetMapping("/api/v1/products")
public List<Product> getProducts() { ... }

private List<Product> rateLimitFallback(RequestNotPermitted ex) {
    throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
        "Rate limit exceeded. Retry after 1 second.");
}
\`\`\`

## Time Limiter

Never let a call wait indefinitely:

\`\`\`yaml
resilience4j:
  timelimiter:
    instances:
      ai-service:
        timeout-duration: 10s    # AI calls can be slow; still need a bound
        cancel-running-future: true
\`\`\`

## Resilience Composition

Apply patterns in this order (outermost to innermost):

\`\`\`
Retry → CircuitBreaker → RateLimiter → TimeLimiter → Bulkhead → actual call
\`\`\`

Each annotation in Spring Boot is an AOP advice. Control the order with \`@Order\` or Resilience4j's \`decorateXxx\` API when exact control matters.

## Chaos Engineering

Verify resilience claims by deliberately injecting failures in production (or a production-like environment). Principles:

1. **Define the steady state** — measurable baseline metrics
2. **Hypothesize** — "if we kill one pod, latency stays below 200ms p99"
3. **Introduce chaos** — kill a pod, add latency, saturate CPU
4. **Observe** — did the steady state hold?
5. **Fix gaps** — reinforce weak paths

Chaos Monkey for Spring Boot (\`chaos-monkey-spring-boot\`) integrates with Resilience4j to inject failures at method level without code changes.
`,

'233.3': `# Performance Engineering — Profiling, Tuning & Capacity Planning

Premature optimisation is the root of all evil. But so is deploying to production without understanding your system's performance envelope. This topic covers systematic performance engineering.

## Performance Testing Taxonomy

| Test type | Question answered | Tool |
|-----------|-----------------|------|
| **Baseline** | What does normal look like? | JMeter, Gatling, k6 |
| **Load test** | Can the system handle expected traffic? | Gatling, k6 |
| **Stress test** | Where does the system break? | k6 with ramp-up |
| **Soak test** | Does it degrade over time (memory leaks)? | Gatling (hours-long) |
| **Spike test** | Can it handle sudden traffic bursts? | k6 scenarios |

### Gatling Simulation

\`\`\`scala
class OrderSimulation extends Simulation {
  val httpProtocol = http.baseUrl("http://api.example.com")
    .acceptHeader("application/json")
    .contentTypeHeader("application/json")

  val placeOrder = scenario("Place Order")
    .exec(http("place-order")
      .post("/api/v1/orders")
      .body(StringBody("""{"productId":"p-1","quantity":1}"""))
      .check(status.is(201)))

  setUp(
    placeOrder.inject(
      rampUsersPerSec(1).to(100).during(2.minutes),  // ramp
      constantUsersPerSec(100).during(5.minutes),     // sustain
      rampUsersPerSec(100).to(200).during(2.minutes)  // spike
    )
  ).protocols(httpProtocol)
   .assertions(
     global.responseTime.percentile3.lt(500),  // p99 < 500ms
     global.successfulRequests.percent.gte(99) // 99% success
   )
}
\`\`\`

## JVM Profiling

### Async Profiler

The most accurate Java profiler available. Zero-overhead sampling that catches both CPU and wall-clock time:

\`\`\`bash
# Attach to running JVM and record 30 seconds
./profiler.sh -d 30 -f flamegraph.html <pid>
# Open flamegraph.html in a browser
\`\`\`

Read a flame graph bottom-up: the bottom row is the entry point; wide frames indicate methods spending the most time on CPU. Peaks (plateaus) are optimisation candidates.

### JFR (Java Flight Recorder)

Built into the JVM since Java 11. Low-overhead (< 1%) continuous profiling:

\`\`\`bash
# Enable in production
java -XX:+FlightRecorder \
     -XX:StartFlightRecording=filename=recording.jfr,duration=60s,settings=profile \
     -jar app.jar

# Analyse with JDK Mission Control or IntelliJ profiler
\`\`\`

## Common Spring Boot Performance Pitfalls

### N+1 Query Problem

\`\`\`java
// BAD — 1 query for orders + N queries for customers
List<Order> orders = orderRepo.findAll();  // SELECT * FROM orders
orders.forEach(o -> o.getCustomer().getName()); // N SELECT * FROM customers

// GOOD — 1 query with JOIN FETCH
@Query("SELECT o FROM Order o JOIN FETCH o.customer")
List<Order> findAllWithCustomer();
\`\`\`

Detect N+1 with Hibernate's \`statistics\` in dev:
\`\`\`yaml
spring.jpa.properties.hibernate.generate_statistics: true
logging.level.org.hibernate.stat: debug
\`\`\`

### Connection Pool Starvation

Default HikariCP pool size is 10. Each request holds a connection for its entire duration. At 10 concurrent requests, the 11th waits. Signs: timeout exceptions, rising \`hikaricp.connections.pending\` metric.

Tune based on Little's Law: \`pool_size = concurrent_transactions × average_hold_time\`

### Virtual Threads (Spring Boot 3.2+)

\`\`\`yaml
spring:
  threads:
    virtual:
      enabled: true
\`\`\`

Virtual threads (Project Loom) eliminate the thread-per-request bottleneck for blocking I/O. Each request gets a lightweight virtual thread that parks during I/O without consuming an OS thread. Effective for IO-bound workloads; does not help CPU-bound workloads.

## Capacity Planning

Capacity planning answers "how many instances do we need for Black Friday?"

### Back-of-Envelope Calculation

\`\`\`
Peak RPS estimate:           50,000 requests/minute = 833 RPS
P99 latency target:          200ms → max 5 req/thread/second
Threads per instance:        200 (with virtual threads: much higher)
Required instances:          833 / (200 × 5) = ~1 instance (conservative)
Safety factor (2×):          2 instances minimum
\`\`\`

Use production data to refine: metric \`http_server_requests_seconds_max\` shows actual latency; \`system_cpu_usage\` and \`hikaricp.connections.active\` show resource saturation.

### Horizontal vs Vertical Scaling

| Axis | When to choose |
|------|---------------|
| **Horizontal** (more instances) | Stateless services, CPU or IO bound, need fault tolerance |
| **Vertical** (bigger instance) | Stateful (JVM heap), cannot partition the workload, quick fix |

Most Spring Boot services should scale horizontally. The HPA (Chapter 230) handles this automatically in Kubernetes.
`,

}

export const quiz: Record<string, QuizQuestion[]> = {

'233.1': [
  {
    question: 'Which of the three pillars of observability helps you understand the path a single request took across multiple microservices?',
    options: ['Metrics', 'Logs', 'Distributed Traces', 'Health checks'],
    correctIndex: 2,
    explanation: 'Distributed traces link spans across service boundaries using a shared trace ID, showing exactly which services a request traversed, in what order, and how long each step took.',
  },
  {
    question: 'What does a sampling probability of 0.1 mean in Spring Boot tracing configuration?',
    options: [
      '10% of requests have tracing disabled',
      '10% of traces are exported; 90% are not recorded',
      'Tracing is enabled for 100% of requests but only 10% are alertable',
      'The trace buffer flushes every 100ms',
    ],
    correctIndex: 1,
    explanation: 'A sampling probability of 0.1 means only 10% of incoming requests generate a complete exported trace. This reduces observability overhead in high-traffic production systems.',
  },
  {
    question: 'What advantage does structured logging (e.g., ECS JSON format) have over plain-text log lines?',
    options: [
      'Log files are smaller because JSON compresses better',
      'Log entries are machine-queryable by field (order.id, trace.id) rather than requiring regex on free text',
      'Structured logs are written synchronously while plain text is async',
      'Structured logging eliminates the need for distributed tracing',
    ],
    correctIndex: 1,
    explanation: 'Structured logs expose fields to log aggregators (Elasticsearch, Loki, CloudWatch Insights) enabling efficient filtering and aggregation — e.g., all errors for a specific order or trace ID.',
  },
  {
    question: 'In SLO engineering, what does an "error budget" represent?',
    options: [
      'The number of 5xx responses allowed before rolling back a deployment',
      'The allowable amount of downtime or errors within a compliance period, derived from the reliability target',
      'The CPU budget reserved for error-handling code paths',
      'The percentage of error logs that are investigated vs. silenced',
    ],
    correctIndex: 1,
    explanation: 'A 99.9% availability SLO means 0.1% of requests may fail. Over 28 days that is about 43.8 minutes of downtime. That allowable unreliability is the error budget — burning it triggers reliability work.',
  },
  {
    question: 'Why is \`micrometer-tracing-bridge-otel\` used instead of importing an OpenTelemetry SDK directly in Spring Boot 3?',
    options: [
      'Micrometer provides a vendor-neutral metrics and tracing facade; the bridge connects it to the OTel SDK for export',
      'OpenTelemetry is not compatible with Java 21',
      'Micrometer replaces OpenTelemetry entirely for Spring applications',
      'The bridge provides a UI dashboard embedded in Spring Boot Actuator',
    ],
    correctIndex: 0,
    explanation: 'Micrometer is the abstraction layer. The OTel bridge allows Micrometer\'s Observation API to export traces via the OpenTelemetry protocol, keeping the application code decoupled from any specific backend.',
  },
],

'233.3': [
  {
    question: 'What is the primary purpose of a soak test (endurance test)?',
    options: [
      'To determine the maximum requests per second the system can handle before failing',
      'To verify that the system remains stable under sustained load over hours, revealing memory leaks and gradual degradation',
      'To simulate a sudden spike in traffic above normal levels',
      'To measure the latency of cold-start JVM initialisation',
    ],
    correctIndex: 1,
    explanation: 'Soak tests run for hours at a moderate load level. They surface issues that only appear over time: memory leaks (heap growth), connection pool exhaustion, log rotation problems, and disk fill.',
  },
  {
    question: 'What is the N+1 query problem in JPA?',
    options: [
      'When N concurrent requests all hit the same database query simultaneously',
      'When loading N entities results in 1 query for the collection plus N additional queries to load associations',
      'When a query returns N+1 rows due to a missing DISTINCT clause',
      'When the HikariCP pool size is set to N and the N+1th request times out',
    ],
    correctIndex: 1,
    explanation: 'Without JOIN FETCH or batch fetching, JPA loads the parent collection in one query then issues a separate SELECT for each entity\'s lazy-loaded association — dramatically increasing database round trips.',
  },
  {
    question: 'When are Java virtual threads (Project Loom) most beneficial for Spring Boot applications?',
    options: [
      'CPU-intensive computation like image processing or encryption',
      'IO-bound workloads where threads spend time blocked waiting for database responses, network calls, or file reads',
      'Applications that use WebFlux reactive programming exclusively',
      'Reducing garbage collection pause times in JVM heap management',
    ],
    correctIndex: 1,
    explanation: 'Virtual threads park (without consuming an OS thread) while waiting for IO. This lets a JVM handle many more concurrent blocking IO operations than the OS thread pool would allow. CPU-bound workloads see no benefit.',
  },
  {
    question: 'According to Little\'s Law, if a service processes 500 concurrent transactions and each holds a connection for 20ms on average, what is the minimum connection pool size required?',
    options: ['10', '25', '100', '500'],
    correctIndex: 0,
    explanation: 'Little\'s Law: pool_size = concurrent_transactions × hold_time_in_seconds = 500 × 0.02s = 10. The 20ms hold time means each connection handles 50 transactions per second, so 10 connections serve 500 concurrent.',
  },
  {
    question: 'What does a flame graph\'s horizontal width of a frame represent?',
    options: [
      'The number of times that method was called',
      'The amount of heap memory allocated by that method',
      'The proportion of total CPU time (or wall-clock time) spent in that method and its callees',
      'The depth of the call stack at the time of sampling',
    ],
    correctIndex: 2,
    explanation: 'In a flame graph, frame width represents the proportion of samples in which that stack frame appeared. Wider frames mean more time was spent there — these are the optimisation candidates.',
  },
],

}

export const codingTask: Record<string, { instructions: string; boilerplate: string; rubric: string[]; hints: string[] }> = {

'233.2': {
  instructions: `## Task: Implement Circuit Breaker + Retry + Fallback

You need to implement a \`PaymentGatewayClient\` that uses Resilience4j's programmatic API (no Spring annotations) to wrap calls to an unreliable payment gateway.

### Requirements

1. **Circuit Breaker** named \`"payment-gateway"\`:
   - Opens when 50% of the last 10 calls fail
   - Waits 30 seconds before transitioning to HALF_OPEN
   - Allows 3 probe calls in HALF_OPEN

2. **Retry** named \`"payment-gateway"\`:
   - Maximum 3 attempts
   - Fixed 200ms wait between attempts
   - Only retries \`PaymentGatewayException\` (not \`InsufficientFundsException\`)

3. **\`charge(ChargeRequest request)\`** method:
   - Decorate the underlying \`gateway.charge(request)\` call with retry (inner) inside circuit breaker (outer)
   - On \`CallNotPermittedException\` (breaker open): return \`ChargeResult.queued(request.orderId())\`
   - Propagate \`InsufficientFundsException\` without retrying

4. **\`getCircuitBreakerState()\`** method: return the current circuit breaker state name (e.g. \`"CLOSED"\`)

### Acceptance Criteria

- 5 consecutive \`PaymentGatewayException\` failures open the circuit breaker
- After the breaker opens, \`charge()\` returns a queued result immediately
- A passing call resets the retry counter
`,
  boilerplate: `import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import io.github.resilience4j.circuitbreaker.CallNotPermittedException;
import io.github.resilience4j.retry.Retry;
import io.github.resilience4j.retry.RetryConfig;
import java.time.Duration;
import java.util.function.Supplier;

public class PaymentGatewayClient {

    private final PaymentGateway gateway;
    private final CircuitBreaker circuitBreaker;
    private final Retry retry;

    public PaymentGatewayClient(PaymentGateway gateway) {
        this.gateway = gateway;

        // TODO: Build CircuitBreakerConfig with:
        //   - slidingWindowType: COUNT_BASED
        //   - slidingWindowSize: 10
        //   - failureRateThreshold: 50
        //   - waitDurationInOpenState: 30s
        //   - permittedNumberOfCallsInHalfOpenState: 3
        CircuitBreakerConfig cbConfig = null; // replace with real config

        // TODO: Create CircuitBreaker named "payment-gateway" from cbConfig
        this.circuitBreaker = null;

        // TODO: Build RetryConfig with:
        //   - maxAttempts: 3
        //   - waitDuration: 200ms
        //   - retryExceptions: PaymentGatewayException.class
        //   - ignoreExceptions: InsufficientFundsException.class
        RetryConfig retryConfig = null; // replace with real config

        // TODO: Create Retry named "payment-gateway" from retryConfig
        this.retry = null;
    }

    public ChargeResult charge(ChargeRequest request) {
        // TODO: Create a Supplier<ChargeResult> that calls gateway.charge(request)
        // TODO: Decorate the supplier with retry first (inner), then circuit breaker (outer)
        // TODO: Try to execute the decorated supplier
        // TODO: On CallNotPermittedException, return ChargeResult.queued(request.orderId())
        return null;
    }

    public String getCircuitBreakerState() {
        // TODO: Return the circuit breaker state name as a String
        return null;
    }
}
`,
  rubric: [
    'CircuitBreakerConfig uses COUNT_BASED sliding window of size 10',
    'CircuitBreakerConfig failure rate threshold is 50%',
    'CircuitBreakerConfig wait duration is 30 seconds',
    'RetryConfig max attempts is 3 with 200ms wait duration',
    'RetryConfig retries PaymentGatewayException but ignores InsufficientFundsException',
    'charge() decorates with Retry.decorateSupplier inside CircuitBreaker.decorateSupplier',
    'CallNotPermittedException is caught and returns ChargeResult.queued(orderId)',
    'getCircuitBreakerState() returns circuitBreaker.getState().name()',
  ],
  hints: [
    'Use `CircuitBreakerConfig.custom()` builder; set `.slidingWindowType(COUNT_BASED)` and `.slidingWindowSize(10)`.',
    'Use `CircuitBreaker.of("payment-gateway", cbConfig)` to create the instance.',
    'Use `RetryConfig.custom().maxAttempts(3).waitDuration(Duration.ofMillis(200)).retryExceptions(PaymentGatewayException.class).ignoreExceptions(InsufficientFundsException.class).build()`.',
    'Decorate: `Supplier<ChargeResult> decorated = CircuitBreaker.decorateSupplier(cb, Retry.decorateSupplier(retry, () -> gateway.charge(request)))`.',
    'Wrap the `decorated.get()` call in a try-catch for `CallNotPermittedException`.',
  ],
},

}
