// Part V — Microservices + Virtual Threads
// Chapter 218: Service Communication — OpenFeign, Kafka & the Saga Pattern

import type { QuizQuestion } from '../../src/data/curriculum'

export const courseId = 'springboot-ai-architect'

export const content: Record<string, string> = {

'218.1': `# Synchronous REST with Spring Cloud OpenFeign

OpenFeign is a declarative HTTP client: you write a Java interface annotated with mapping annotations, and Spring generates the implementation. It integrates with Spring Cloud LoadBalancer for service discovery, Resilience4j for circuit breaking, and Micrometer for metrics — with zero boilerplate.

## Dependency

\`\`\`xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-openfeign</artifactId>
</dependency>
\`\`\`

## Enable Feign

\`\`\`java
@SpringBootApplication
@EnableFeignClients(basePackages = "com.example.clients")
public class OrderServiceApplication { ... }
\`\`\`

## A Feign Client Interface

\`\`\`java
@FeignClient(
    name = "inventory-service",        // spring.application.name of the target service
    path = "/api/inventory",           // base path for all methods
    fallback = InventoryClientFallback.class  // used when circuit breaker opens
)
public interface InventoryClient {

    @GetMapping("/products/{productId}/stock")
    StockLevel getStockLevel(@PathVariable("productId") String productId);

    @PostMapping("/products/{productId}/reserve")
    ReservationResult reserveStock(@PathVariable("productId") String productId,
                                   @RequestBody ReserveRequest request);

    @DeleteMapping("/reservations/{reservationId}")
    void cancelReservation(@PathVariable("reservationId") String reservationId);
}
\`\`\`

Feign generates the HTTP client implementation at startup. The interface is used like any Spring bean:

\`\`\`java
@Service
@RequiredArgsConstructor
public class OrderService {

    private final InventoryClient inventoryClient;

    public Order createOrder(CreateOrderRequest request) {
        StockLevel stock = inventoryClient.getStockLevel(request.productId());
        if (stock.available() < request.quantity()) {
            throw new InsufficientStockException(request.productId());
        }
        // ... create order ...
        inventoryClient.reserveStock(request.productId(),
            new ReserveRequest(orderId, request.quantity()));
        return order;
    }
}
\`\`\`

## Error Handling — FeignException vs Custom Exceptions

By default, Feign wraps non-2xx responses in a \`FeignException\`. Catch specific status codes:

\`\`\`java
try {
    return inventoryClient.getStockLevel(productId);
} catch (FeignException.NotFound e) {
    throw new ProductNotFoundException(productId);
} catch (FeignException.ServiceUnavailable e) {
    throw new InventoryServiceException("Inventory service is unavailable");
}
\`\`\`

Or implement an \`ErrorDecoder\` to map HTTP errors to domain exceptions globally:

\`\`\`java
@Component
public class InventoryErrorDecoder implements ErrorDecoder {

    @Override
    public Exception decode(String methodKey, Response response) {
        return switch (response.status()) {
            case 404 -> new ProductNotFoundException("Product not found");
            case 409 -> new StockConflictException("Stock reservation conflict");
            case 503 -> new InventoryServiceException("Inventory service unavailable");
            default  -> new FeignException.FeignClientException(
                response.status(), "Unexpected error", response.request(), null, null);
        };
    }
}
\`\`\`

## Request Interceptors — Propagating Auth Headers

In a multi-service system, the original JWT must be forwarded from service to service. A Feign request interceptor does this automatically:

\`\`\`java
@Component
public class AuthTokenForwardInterceptor implements RequestInterceptor {

    @Override
    public void apply(RequestTemplate template) {
        // Grab the token from the current request's SecurityContext
        SecurityContext context = SecurityContextHolder.getContext();
        if (context.getAuthentication() instanceof JwtAuthenticationToken jwt) {
            template.header("Authorization", "Bearer " + jwt.getToken().getTokenValue());
        }
    }
}
\`\`\`

## Fallback Implementation

\`\`\`java
@Component
public class InventoryClientFallback implements InventoryClient {

    @Override
    public StockLevel getStockLevel(String productId) {
        // Return a safe default — e.g., assume stock is unavailable
        return new StockLevel(productId, 0, false);
    }

    @Override
    public ReservationResult reserveStock(String productId, ReserveRequest request) {
        throw new InventoryServiceException("Inventory service is unavailable");
    }

    @Override
    public void cancelReservation(String reservationId) {
        // Log and continue — reservation cancellation is not critical for order flow
    }
}
\`\`\`

## Feign Configuration

\`\`\`yaml
spring:
  cloud:
    openfeign:
      client:
        config:
          inventory-service:
            connect-timeout: 2000    # ms
            read-timeout: 5000       # ms
            logger-level: FULL       # NONE, BASIC, HEADERS, FULL
      circuitbreaker:
        enabled: true  # Integrate with Resilience4j
\`\`\`

## Testing Feign Clients

Use WireMock to test the Feign client in isolation:

\`\`\`java
@SpringBootTest
@Testcontainers
class InventoryClientTest {

    @Container
    static WireMockContainer wireMock = new WireMockContainer("wiremock/wiremock:3.5.4");

    @DynamicPropertySource
    static void configure(DynamicPropertyRegistry registry) {
        // Override the inventory-service URL
        registry.add("spring.cloud.openfeign.client.config.inventory-service.url",
            wireMock::getBaseUrl);
    }

    @Autowired
    private InventoryClient inventoryClient;

    @Test
    void getStockLevel_returns_correct_stock() {
        wireMock.stubFor(get(urlEqualTo("/api/inventory/products/sku-123/stock"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("""
                    {"productId": "sku-123", "available": 42, "reserved": false}
                    """)));

        StockLevel result = inventoryClient.getStockLevel("sku-123");

        assertThat(result.available()).isEqualTo(42);
    }
}
\`\`\``,

'218.2': `# Asynchronous Messaging with Spring Kafka

Synchronous REST calls create tight coupling: if Inventory Service is slow, Order Service is slow. Asynchronous messaging decouples them — Order Service publishes an event and continues; Inventory Service processes it when ready. This improves resilience and enables scaling each service independently.

## When to Choose Events Over REST

| Use REST | Use Events |
|---|---|
| You need an immediate response (order total for the checkout screen) | You don't need an immediate response (send welcome email after registration) |
| Strong consistency is required | Eventual consistency is acceptable |
| One-to-one service communication | One-to-many fan-out (one event, multiple consumers) |
| Simple CRUD | Complex workflows spanning multiple services |

## Spring Kafka Setup

\`\`\`xml
<dependency>
    <groupId>org.springframework.kafka</groupId>
    <artifactId>spring-kafka</artifactId>
</dependency>
\`\`\`

\`\`\`yaml
spring:
  kafka:
    bootstrap-servers: \${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer
      properties:
        spring.json.add.type.headers: false  # Don't add Java type headers
    consumer:
      group-id: \${spring.application.name}
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer
      auto-offset-reset: earliest
      properties:
        spring.json.trusted.packages: "com.example.events"
\`\`\`

## Producer — Publishing Events

\`\`\`java
@Component
@RequiredArgsConstructor
@Slf4j
public class OrderEventPublisher {

    private final KafkaTemplate<String, OrderCreatedEvent> kafkaTemplate;

    public void publishOrderCreated(Order order) {
        OrderCreatedEvent event = new OrderCreatedEvent(
            order.getId().toString(),
            order.getUserEmail(),
            order.getTotal(),
            order.getItems().stream()
                .map(i -> new OrderItem(i.getProductId(), i.getQuantity()))
                .toList(),
            Instant.now()
        );

        kafkaTemplate.send("orders.created", order.getId().toString(), event)
            .whenComplete((result, ex) -> {
                if (ex != null) {
                    log.error("Failed to publish OrderCreatedEvent for order {}: {}",
                        order.getId(), ex.getMessage());
                } else {
                    log.info("Published OrderCreatedEvent for order {} to partition {} offset {}",
                        order.getId(),
                        result.getRecordMetadata().partition(),
                        result.getRecordMetadata().offset());
                }
            });
    }
}
\`\`\`

## Consumer — Processing Events

\`\`\`java
@Component
@RequiredArgsConstructor
@Slf4j
public class OrderCreatedEventConsumer {

    private final InventoryService inventoryService;
    private final OrderRepository orderRepository;

    @KafkaListener(
        topics = "orders.created",
        groupId = "inventory-service",
        containerFactory = "kafkaListenerContainerFactory"
    )
    public void handleOrderCreated(
            @Payload OrderCreatedEvent event,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            @Header(KafkaHeaders.RECEIVED_PARTITION) int partition,
            @Header(KafkaHeaders.OFFSET) long offset) {

        log.info("Received OrderCreatedEvent for order {} from {}-{}@{}",
            event.getOrderId(), topic, partition, offset);

        try {
            for (OrderItem item : event.getItems()) {
                inventoryService.reserveStock(item.productId(), item.quantity());
            }
        } catch (InsufficientStockException e) {
            log.error("Stock reservation failed for order {}: {}",
                event.getOrderId(), e.getMessage());
            // Publish compensating event
            // compensatingEventPublisher.publishStockReservationFailed(event);
        }
    }
}
\`\`\`

## Consumer Group Semantics

Kafka partitions a topic into one or more partitions. Each partition is assigned to exactly one consumer in a consumer group at any time. This means:

- **Horizontal scaling**: Add more consumer instances → Kafka rebalances partitions among them
- **Message ordering**: Within one partition, messages are processed in order. Across partitions, there's no order guarantee.
- **Key-based partitioning**: Using the order ID as the message key ensures all events for the same order go to the same partition (and thus the same consumer instance), preserving order.

\`\`\`java
// All events for order "ord-123" go to the same partition
kafkaTemplate.send("orders.created", "ord-123", event); // key = order ID
\`\`\`

## Idempotent Consumers

A Kafka consumer may receive the same message more than once (network failure + retry, consumer rebalance). Your consumer must be idempotent — processing the same event twice produces the same result as processing it once.

\`\`\`java
@KafkaListener(topics = "orders.created")
@Transactional
public void handleOrderCreated(@Payload OrderCreatedEvent event) {
    // Check if already processed
    if (reservationRepository.existsByOrderId(event.getOrderId())) {
        log.warn("Duplicate OrderCreatedEvent received for order {} — skipping",
            event.getOrderId());
        return;
    }
    // Process...
    reservationRepository.save(new Reservation(event.getOrderId(), ...));
}
\`\`\`

## Dead Letter Topic (DLT)

When a consumer fails after retries, Spring Kafka can route the message to a Dead Letter Topic for later inspection or replay:

\`\`\`java
@Bean
public DefaultErrorHandler errorHandler(KafkaTemplate<String, Object> kafkaTemplate) {
    DeadLetterPublishingRecoverer recoverer = new DeadLetterPublishingRecoverer(kafkaTemplate,
        (record, ex) -> new TopicPartition(record.topic() + ".DLT", record.partition()));

    FixedBackOff backOff = new FixedBackOff(1000L, 3); // 3 retries, 1s apart
    return new DefaultErrorHandler(recoverer, backOff);
}
\`\`\``,

'218.3': `# The Saga Pattern for Distributed Transactions

A classic database transaction (ACID) is atomic — all steps succeed or all roll back. In a microservices system, you cannot have a single transaction spanning multiple services because each has its own database. The Saga pattern provides distributed transaction management through a series of local transactions with compensating actions.

## The Problem: Cross-Service Data Consistency

Consider creating an order that spans three services:
1. **Order Service**: Create order record
2. **Inventory Service**: Reserve stock
3. **Payment Service**: Charge customer

If Payment fails after Order and Inventory succeed, you need to roll back the order creation and release the stock reservation. A distributed transaction (2PC) would lock resources across all three services — catastrophic for availability. Sagas solve this without locking.

## The Two Saga Styles

### Choreography Saga
Each service listens for events and reacts, publishing its own events in turn. No central coordinator.

\`\`\`
OrderService → publishes "OrderCreated"
    ↓
InventoryService listens "OrderCreated" → reserves stock → publishes "StockReserved"
    ↓
PaymentService listens "StockReserved" → charges card → publishes "PaymentCompleted"
    ↓
OrderService listens "PaymentCompleted" → marks order CONFIRMED

— If payment fails —
PaymentService → publishes "PaymentFailed"
    ↓
InventoryService listens "PaymentFailed" → releases stock → publishes "StockReleased"
    ↓
OrderService listens "StockReleased" → marks order FAILED
\`\`\`

**Pros**: No single point of failure, services remain decoupled.
**Cons**: Hard to understand the overall flow, difficult to debug, cycles are possible.

### Orchestration Saga
A central Saga Orchestrator coordinates the steps. Each step is a command; failures trigger compensating commands.

\`\`\`
OrderSagaOrchestrator
    │── sends "ReserveStockCommand" → InventoryService
    │   ← receives "StockReservedEvent" or "StockReservationFailedEvent"
    │── sends "ChargeCustomerCommand" → PaymentService
    │   ← receives "PaymentCompletedEvent" or "PaymentFailedEvent"
    │── if all success: sends "ConfirmOrderCommand" → OrderService
    │── if any failure: sends compensating commands in reverse
\`\`\`

**Pros**: Flow is explicit and visible in one place, easier to debug.
**Cons**: Orchestrator is a potential bottleneck; needs persistent state.

## Implementing Choreography with Spring Kafka

\`\`\`java
// Order Service — saga starts here
@Service
@RequiredArgsConstructor
public class OrderSagaInitiator {

    private final OrderRepository orderRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Transactional
    public Order startOrderSaga(CreateOrderRequest request) {
        // Step 1: Create order in PENDING state
        Order order = orderRepository.save(Order.builder()
            .id(UUID.randomUUID())
            .userEmail(request.userEmail())
            .status(OrderStatus.PENDING)
            .build());

        // Step 2: Publish event to kick off saga
        kafkaTemplate.send("orders.created",
            order.getId().toString(),
            new OrderCreatedEvent(order.getId(), request.userEmail(), request.items()));

        return order;
    }
}

// Order Service — saga completion listeners
@Component
@RequiredArgsConstructor
public class OrderSagaCompletionListener {

    private final OrderRepository orderRepository;

    @KafkaListener(topics = "payments.completed")
    @Transactional
    public void onPaymentCompleted(@Payload PaymentCompletedEvent event) {
        orderRepository.findById(event.getOrderId()).ifPresent(order -> {
            order.setStatus(OrderStatus.CONFIRMED);
            orderRepository.save(order);
        });
    }

    @KafkaListener(topics = "payments.failed")
    @Transactional
    public void onPaymentFailed(@Payload PaymentFailedEvent event) {
        orderRepository.findById(event.getOrderId()).ifPresent(order -> {
            order.setStatus(OrderStatus.FAILED);
            orderRepository.save(order);
        });
        // Note: stock compensation is handled by InventoryService listening to the same event
    }
}
\`\`\`

## Outbox Pattern — Ensuring Event Publication

A common bug: the database update commits but the Kafka send fails, leaving the saga in an inconsistent state. The Outbox pattern fixes this:

\`\`\`java
@Transactional
public Order startOrderSaga(CreateOrderRequest request) {
    Order order = orderRepository.save(...);

    // Write event to outbox table in THE SAME transaction
    outboxRepository.save(OutboxEvent.builder()
        .aggregateId(order.getId().toString())
        .topic("orders.created")
        .payload(objectMapper.writeValueAsString(new OrderCreatedEvent(...)))
        .build());

    return order; // transaction commits order + outbox record atomically
}

// Separate polling process (or Debezium CDC) reads outbox table and publishes to Kafka
\`\`\`

The outbox table and the domain data share the same transaction. A separate process (or a Change Data Capture tool like Debezium) reads committed outbox records and publishes to Kafka. This guarantees at-least-once delivery without distributed transactions.

## Saga State Management

For long-running sagas, track the current state to handle timeouts and retries:

\`\`\`java
@Entity
public class OrderSagaState {
    @Id
    private UUID orderId;
    @Enumerated(EnumType.STRING)
    private SagaStatus status; // STARTED, STOCK_RESERVED, PAYMENT_PENDING, COMPLETED, COMPENSATING, FAILED
    private Instant lastUpdated;
    private int retryCount;
}
\`\`\`

A scheduled job can find sagas stuck in intermediate states for too long and trigger retry or compensation.`,
}

export const quiz: Record<string, QuizQuestion[]> = {

'218.1': [
  {
    question: 'What is the main advantage of Spring Cloud OpenFeign over writing a RestClient call manually?',
    options: [
      'OpenFeign is faster because it uses HTTP/2 by default',
      'OpenFeign generates the HTTP client from a declarative interface, eliminating boilerplate and automatically integrating with service discovery, load balancing, and circuit breakers',
      'OpenFeign compresses all requests to reduce network overhead',
      'OpenFeign bypasses Spring Security for inter-service calls',
    ],
    correctIndex: 1,
    explanation: 'A manual RestClient call requires constructing the URL, setting headers, handling errors, and wiring service discovery manually. OpenFeign generates the implementation from an annotated interface, and the "name" field wires it to the load balancer and circuit breaker automatically.',
  },
  {
    question: 'What is the role of a Feign ErrorDecoder?',
    options: [
      'It logs all HTTP errors to the centralized error tracking service',
      'It maps HTTP error status codes from the downstream service to specific domain exceptions on the calling side',
      'It decodes encrypted error response bodies from secured services',
      'It retries failed requests automatically based on the HTTP status code',
    ],
    correctIndex: 1,
    explanation: 'ErrorDecoder lets you convert FeignException (which wraps raw HTTP status codes) into meaningful domain exceptions. Instead of catching FeignException.NotFound everywhere, the ErrorDecoder maps 404 → ProductNotFoundException globally, giving callers a clean exception hierarchy.',
  },
  {
    question: 'Why is a RequestInterceptor needed when forwarding JWT tokens between microservices?',
    options: [
      'Feign strips all headers by default for security reasons',
      'Without an interceptor, Feign makes an unauthenticated call — the downstream service receives a request with no Authorization header and rejects it',
      'JWTs expire faster in inter-service calls and need to be refreshed',
      'Spring Cloud LoadBalancer requires a RequestInterceptor to route requests to the correct instance',
    ],
    correctIndex: 1,
    explanation: 'When Service A receives a user\'s JWT and calls Service B, Feign creates a new HTTP request that doesn\'t inherit any headers from the incoming request. A RequestInterceptor reads the current user\'s JWT from the SecurityContext and adds it to every outgoing Feign call automatically.',
  },
  {
    question: 'What happens when a @FeignClient has a fallback class configured and the downstream service returns a 503?',
    options: [
      'Feign retries the request 3 times before calling the fallback',
      'If a circuit breaker is enabled and open (or on a direct error), the fallback implementation\'s method is called instead of the real HTTP call',
      'The fallback class logs the error and rethrows the original exception',
      'Spring automatically switches to a different instance of the service using load balancing',
    ],
    correctIndex: 1,
    explanation: 'The fallback class is a @Component that implements the same interface. When the circuit breaker is open or an error occurs, Feign calls the fallback implementation instead. The fallback can return a default value, throw a domain exception, or perform any custom logic.',
  },
  {
    question: 'How should you test a Feign client in isolation without a running downstream service?',
    options: [
      'Use @MockBean to mock the FeignClient interface',
      'Start a WireMock server, configure its URL as the service URL, and write test stubs for expected HTTP interactions',
      'Run the entire downstream service in a separate JVM for each test',
      'Use @DataJpaTest to isolate the client from the database layer',
    ],
    correctIndex: 1,
    explanation: 'Mocking the FeignClient interface skips the HTTP layer entirely — you\'re not testing OpenFeign at all. A WireMock server responds to real HTTP calls, validating request construction (URL, headers, body) and testing response deserialization with full fidelity.',
  },
],

'218.2': [
  {
    question: 'Why is using the order ID as the Kafka message key important for ordered event processing?',
    options: [
      'Kafka requires a non-null key for all messages',
      'Kafka routes messages with the same key to the same partition, ensuring all events for one order are processed sequentially by the same consumer',
      'The key is used as the JWT token for authenticating Kafka producers',
      'Messages with the same key are deduplicated by Kafka before delivery',
    ],
    correctIndex: 1,
    explanation: 'Kafka assigns messages with the same key to the same partition (default hash partitioning). Within a partition, messages are consumed in order by a single consumer. Using the order ID ensures OrderCreated, StockReserved, and PaymentCompleted for the same order arrive in sequence at the same consumer.',
  },
  {
    question: 'What does it mean for a Kafka consumer to be idempotent, and why is it necessary?',
    options: [
      'Idempotent consumers compress their output to reduce database writes',
      'Processing the same message multiple times produces the same result as processing it once — necessary because Kafka delivers at-least-once and the same message may be received more than once after failures',
      'Idempotent consumers authenticate each message cryptographically before processing',
      'A Kafka consumer is idempotent if it uses @Transactional on its handler method',
    ],
    correctIndex: 1,
    explanation: 'Kafka guarantees at-least-once delivery by default. Network failures, consumer rebalances, or offsets not being committed can cause the same message to be delivered again. An idempotent consumer checks whether it already processed a message (e.g., by checking a processed-events table) and skips reprocessing.',
  },
  {
    question: 'What is the purpose of a Dead Letter Topic (DLT) in Spring Kafka?',
    options: [
      'A topic where messages are stored permanently for compliance archiving',
      'A topic where messages are sent after all retry attempts fail, allowing them to be inspected, fixed, and replayed without losing them',
      'A backup topic that Kafka uses to recover data after a broker failure',
      'A topic with lower durability settings for non-critical messages',
    ],
    correctIndex: 1,
    explanation: 'Without a DLT, a poison pill message (one that always causes processing to fail) blocks the entire partition. With a DLT, after retries are exhausted the message is moved to orders.created.DLT, the consumer continues with the next message, and operations teams can inspect and replay DLT messages later.',
  },
  {
    question: 'Why is spring.json.trusted.packages configuration required for Kafka JSON deserialization?',
    options: [
      'Kafka encrypts messages from untrusted packages before delivery',
      'The JSON deserializer includes a type header with the fully-qualified class name — it only deserializes to classes in trusted packages to prevent deserialization attacks',
      'Spring requires this to generate the correct JSON schema at startup',
      'It limits which topics a consumer can subscribe to based on package name',
    ],
    correctIndex: 1,
    explanation: 'Spring Kafka\'s JsonDeserializer can embed the Java class name in a type header and use it to determine the target class. Without trustedPackages, it refuses to deserialize to any class (security measure against deserialization attacks). Listing your event package allows the deserializer to instantiate the correct type.',
  },
  {
    question: 'In a consumer group with 3 instances and a topic with 6 partitions, how are partitions assigned?',
    options: [
      'All 6 partitions are read by all 3 instances — each message is processed 3 times',
      'Each instance is assigned 2 partitions — partitions are distributed evenly, each partition assigned to exactly one consumer instance',
      'The first instance gets all 6 partitions; the others are standby replicas',
      'Partitions are assigned randomly on each message — there is no stable assignment',
    ],
    correctIndex: 1,
    explanation: 'Kafka\'s consumer group protocol assigns each partition to exactly one consumer in the group at any time. With 6 partitions and 3 consumers, each gets 2 partitions. Adding a 4th consumer would trigger a rebalance. This enables horizontal scaling: more consumers → fewer partitions per consumer → more parallel processing.',
  },
],

'218.3': [
  {
    question: 'Why can\'t a traditional ACID database transaction span multiple microservices?',
    options: [
      'ACID transactions require all services to use the same database version',
      'Each service has its own database — there is no shared transaction manager that can coordinate a 2PC lock across service boundaries without creating tight coupling and availability risk',
      'Spring does not support @Transactional on inter-service REST calls',
      'ACID transactions are deprecated in Java 21 and replaced by virtual thread transactions',
    ],
    correctIndex: 1,
    explanation: 'A distributed 2PC transaction would require a transaction coordinator to hold locks in multiple databases simultaneously. This creates availability problems (coordinator failure blocks all participants), tight coupling, and poor performance. Sagas replace distributed locks with compensating transactions.',
  },
  {
    question: 'What is the key difference between choreography and orchestration sagas?',
    options: [
      'Choreography uses REST; orchestration uses events',
      'In choreography each service reacts to events and publishes its own; in orchestration a central coordinator issues commands and handles failures — making the flow explicit in one place',
      'Choreography sagas are synchronous; orchestration sagas are asynchronous',
      'Orchestration requires a special framework; choreography uses standard Spring Kafka',
    ],
    correctIndex: 1,
    explanation: 'Choreography is decentralized — services react to events. The overall flow is implicit, distributed across services. Orchestration centralizes the flow in a Saga Orchestrator class. The orchestrator knows all steps and failure paths, making debugging easier at the cost of a central coordination point.',
  },
  {
    question: 'What problem does the Outbox Pattern solve in event-driven sagas?',
    options: [
      'It reduces Kafka broker load by batching events before publication',
      'It solves the dual-write problem — ensures that the database update and event publication are atomic, so the saga is never left in an inconsistent state if Kafka is temporarily unavailable',
      'It prevents duplicate events by storing sent event IDs in a database table',
      'It routes events to the correct topic based on the domain aggregate type',
    ],
    correctIndex: 1,
    explanation: 'Without the outbox pattern: save order to DB (succeeds), then send Kafka event (fails) → order exists but no event published → saga never proceeds. With outbox: save order AND outbox record in one transaction → if Kafka send fails later, the outbox poller will retry. The two writes are atomic via the database transaction.',
  },
  {
    question: 'What is a compensating transaction in the context of the Saga pattern?',
    options: [
      'A transaction that executes in parallel to improve throughput',
      'A transaction that undoes a previously completed step when a later step in the saga fails — e.g., releasing reserved stock when payment fails',
      'A transaction that compensates for network latency by pre-fetching data',
      'A transaction that merges two saga instances when they conflict',
    ],
    correctIndex: 1,
    explanation: 'Sagas do not roll back — once a local transaction commits, it\'s permanent. Instead, when a later step fails, compensating transactions undo the effects of earlier steps: StockReserved is compensated by StockReleased; OrderCreated is compensated by OrderCancelled. Compensating transactions must also be idempotent.',
  },
  {
    question: 'Why is tracking saga state in a persistent store (e.g., a SagaState table) important?',
    options: [
      'Kafka requires saga state to be stored before messages can be published',
      'It enables detection of stuck sagas (e.g., payment pending for too long), supports retry logic, and allows the system to resume a saga after a crash without restarting from scratch',
      'Spring\'s @Transactional requires a matching database record for every Kafka consumer',
      'Saga state tables replace the need for Dead Letter Topics',
    ],
    correctIndex: 1,
    explanation: 'Sagas can run for minutes or hours across multiple services. Without persistent state, a crashed orchestrator loses its position. A SagaState table records the current step, retry count, and timestamp. A scheduled job can find sagas stuck in intermediate states and trigger compensation or alerting.',
  },
],
}

export const codingTask: Record<string, {
  instructions: string; boilerplate: string; rubric: string[]; hints: string[]
}> = {

'218.1': {
  instructions: `Implement a Spring Cloud OpenFeign client for a \`PaymentService\` and write its error decoder.

Requirements:

1. **\`PaymentClient\` interface** (annotated with \`@FeignClient\`):
   - \`name\`: \`"payment-service"\`
   - \`path\`: \`"/api/payments"\`
   - Methods:
     - \`POST /charges\` → body \`ChargeRequest\`, returns \`ChargeResult\`
     - \`GET /charges/{chargeId}\` → returns \`ChargeResult\`
     - \`POST /charges/{chargeId}/refund\` → returns \`void\`

2. **\`PaymentErrorDecoder implements ErrorDecoder\`**:
   - 402 → throw \`PaymentDeclinedException("Payment declined")\`
   - 409 → throw \`DuplicateChargeException("Duplicate charge detected")\`
   - Any other non-2xx → throw \`PaymentServiceException("Payment service error: " + status)\`

3. **Register the \`PaymentErrorDecoder\`** as a \`@Bean\` in a \`@Configuration\` class named \`FeignConfig\`, and reference it in \`@FeignClient(configuration = FeignConfig.class)\`.`,
  boilerplate: `package com.example.clients;

import com.example.dto.ChargeRequest;
import com.example.dto.ChargeResult;
import com.example.exception.DuplicateChargeException;
import com.example.exception.PaymentDeclinedException;
import com.example.exception.PaymentServiceException;
import feign.Response;
import feign.codec.ErrorDecoder;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.bind.annotation.*;

// TODO: Add @FeignClient annotation with name, path, and configuration
public interface PaymentClient {

    // TODO: POST /charges with @RequestBody ChargeRequest → ChargeResult
    ChargeResult charge(ChargeRequest request);

    // TODO: GET /charges/{chargeId} → ChargeResult
    ChargeResult getCharge(String chargeId);

    // TODO: POST /charges/{chargeId}/refund → void
    void refund(String chargeId);
}

// ---

@Configuration
class FeignConfig {

    @Bean
    public ErrorDecoder paymentErrorDecoder() {
        return new PaymentErrorDecoder();
    }
}

// ---

class PaymentErrorDecoder implements ErrorDecoder {

    @Override
    public Exception decode(String methodKey, Response response) {
        // TODO: switch on response.status()
        //   402 → PaymentDeclinedException("Payment declined")
        //   409 → DuplicateChargeException("Duplicate charge detected")
        //   default → PaymentServiceException("Payment service error: " + response.status())
        return new RuntimeException("not implemented");
    }
}`,
  rubric: [
    '@FeignClient(name = "payment-service", path = "/api/payments", configuration = FeignConfig.class)',
    'POST /charges is annotated with @PostMapping("/charges") and @RequestBody ChargeRequest',
    'GET /charges/{chargeId} uses @GetMapping("/charges/{chargeId}") and @PathVariable',
    'POST /charges/{chargeId}/refund uses @PostMapping("/charges/{chargeId}/refund") and @PathVariable',
    'FeignConfig is a @Configuration class with @Bean ErrorDecoder method',
    'PaymentErrorDecoder maps 402 → PaymentDeclinedException',
    'PaymentErrorDecoder maps 409 → DuplicateChargeException',
    'PaymentErrorDecoder maps any other status → PaymentServiceException with status code in message',
  ],
  hints: [
    '@FeignClient(name = "payment-service", path = "/api/payments", configuration = FeignConfig.class)',
    '@PostMapping("/charges") ChargeResult charge(@RequestBody ChargeRequest request)',
    '@GetMapping("/charges/{chargeId}") ChargeResult getCharge(@PathVariable("chargeId") String chargeId)',
    '@PostMapping("/charges/{chargeId}/refund") void refund(@PathVariable("chargeId") String chargeId)',
    'switch (response.status()) { case 402 -> ... case 409 -> ... default -> ... }',
  ],
},
}
