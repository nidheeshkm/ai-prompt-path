// Part VII — DDD, CQRS & Event Sourcing
// Chapter 226: CQRS — Command Query Responsibility Segregation

import type { QuizQuestion } from '../../src/data/curriculum'

export const courseId = 'springboot-ai-architect'

export const content: Record<string, string> = {

'226.1': `# CQRS Fundamentals — Separating Reads from Writes

CQRS (Command Query Responsibility Segregation) splits a system into two distinct sides: the **Command** side (writes) and the **Query** side (reads). Each side can be optimized independently.

## Why CQRS?

In a traditional CRUD system, the same domain model serves both reads and writes:
- The Order aggregate enforces business invariants (write concerns)
- But also loads all associations to populate a complex Order summary page (read concerns)

These concerns conflict. The aggregate wants to be minimal and focused; the UI wants everything in one fast query. CQRS resolves this tension by using different models for each purpose.

## The Core Idea

\`\`\`
COMMAND SIDE                          QUERY SIDE
   |                                     |
[Command]                          [Query request]
   |                                     |
[Command Handler]                  [Query Handler]
   |                                     |
[Domain Model (Aggregate)]         [Read Model (DTO / projection)]
   |                                     |
[Write Database]    ===events===>  [Read Database (optional)]
\`\`\`

The write side uses the rich domain model. The read side uses flat, denormalized projections optimized for display.

## Command Side — Commands and Handlers

\`\`\`java
// Commands are simple data carriers — no behavior
public record PlaceOrderCommand(
    CustomerId customerId,
    List<OrderItemRequest> items,
    ShippingAddress shippingAddress
) {}

public record ConfirmOrderCommand(OrderId orderId) {}

public record CancelOrderCommand(OrderId orderId, String reason) {}
\`\`\`

\`\`\`java
@Service
@Transactional
@RequiredArgsConstructor
public class OrderCommandHandler {

    private final OrderRepository orderRepository;
    private final CustomerRepository customerRepository;

    public OrderId handle(PlaceOrderCommand command) {
        Customer customer = customerRepository.findById(command.customerId())
            .orElseThrow(CustomerNotFoundException::new);
        Order order = customer.placeOrder(
            toOrderItems(command.items()),
            command.shippingAddress()
        );
        return orderRepository.save(order).getId();
    }

    public void handle(ConfirmOrderCommand command) {
        Order order = orderRepository.findById(command.orderId())
            .orElseThrow(OrderNotFoundException::new);
        order.confirm();
        orderRepository.save(order);
    }

    public void handle(CancelOrderCommand command) {
        Order order = orderRepository.findById(command.orderId())
            .orElseThrow(OrderNotFoundException::new);
        order.cancel(command.reason());
        orderRepository.save(order);
    }
}
\`\`\`

## Query Side — Read Models

\`\`\`java
// Read model is optimized for display — flat, no aggregate invariants
public record OrderSummary(
    String orderId,
    String customerName,
    String status,
    String totalAmount,
    String currency,
    int itemCount,
    String placedAt
) {}

public record OrderDetail(
    String orderId,
    String customerName,
    String customerEmail,
    String status,
    List<OrderItemView> items,
    String shippingAddress,
    String totalAmount,
    String placedAt,
    String confirmedAt
) {}
\`\`\`

\`\`\`java
@Repository
public interface OrderQueryRepository {

    // Uses a JPQL projection — single query, no N+1
    @Query("""
        SELECT new com.example.query.OrderSummary(
            CAST(o.id.value AS string),
            CONCAT(c.firstName, ' ', c.lastName),
            CAST(o.status AS string),
            CAST(o.totalAmount.amount AS string),
            o.totalAmount.currency,
            SIZE(o.items),
            CAST(o.placedAt AS string)
        )
        FROM Order o JOIN Customer c ON o.customerId = c.id
        WHERE o.customerId = :customerId
        ORDER BY o.placedAt DESC
        """)
    List<OrderSummary> findOrderSummariesByCustomer(@Param("customerId") CustomerId customerId);
}
\`\`\`

## Separating Command and Query in the REST API

\`\`\`java
@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderCommandHandler commandHandler;   // write side
    private final OrderQueryHandler queryHandler;       // read side

    // Commands return minimal data (just the created ID)
    @PostMapping
    public ResponseEntity<Map<String, String>> placeOrder(@RequestBody PlaceOrderRequest request,
                                                          @AuthenticationPrincipal Jwt jwt) {
        OrderId orderId = commandHandler.handle(new PlaceOrderCommand(
            CustomerId.of(jwt.getSubject()), request.items(), request.shippingAddress()));
        return ResponseEntity.created(URI.create("/api/orders/" + orderId.value()))
            .body(Map.of("orderId", orderId.value().toString()));
    }

    // Queries return rich view models
    @GetMapping("/{orderId}")
    public OrderDetail getOrder(@PathVariable String orderId) {
        return queryHandler.findOrderDetail(OrderId.of(orderId));
    }

    @GetMapping
    public List<OrderSummary> listMyOrders(@AuthenticationPrincipal Jwt jwt) {
        return queryHandler.findOrdersByCustomer(CustomerId.of(jwt.getSubject()));
    }
}
\`\`\``,

'226.2': `# Read Models, Projections & Eventual Consistency

The query side's key challenge is keeping read models up to date as the write side changes. Spring offers multiple approaches from simple JPQL projections to dedicated read databases.

## Approach 1 — JPQL Projections (Simplest)

For most applications, the simplest CQRS implementation is JPQL projections on the same database:

\`\`\`java
// Interface projection — Spring Data creates a proxy
public interface OrderListItem {
    String getOrderId();
    String getStatus();
    BigDecimal getTotalAmount();
    LocalDateTime getPlacedAt();
}

@Repository
public interface OrderQueryRepository extends JpaRepository<Order, OrderId> {

    @Query("SELECT CAST(o.id.value AS string) AS orderId, " +
           "CAST(o.status AS string) AS status, " +
           "o.totalAmount.amount AS totalAmount, " +
           "o.placedAt AS placedAt " +
           "FROM Order o WHERE o.customerId.value = :customerId")
    List<OrderListItem> findByCustomerId(UUID customerId);
}
\`\`\`

Trade-off: simple, but the read and write databases are the same — no independent scaling.

## Approach 2 — Dedicated Read Model Tables

Update a flat read model table whenever the domain changes:

\`\`\`java
@Entity
@Table(name = "order_read_model")
public class OrderReadModel {
    @Id
    private String orderId;
    private String customerId;
    private String customerName;
    private String customerEmail;
    private String status;
    private BigDecimal totalAmount;
    private String currency;
    private int itemCount;
    private LocalDateTime placedAt;
    private LocalDateTime updatedAt;
}
\`\`\`

\`\`\`java
@Component
@RequiredArgsConstructor
public class OrderReadModelUpdater {

    private final OrderReadModelRepository readModelRepo;
    private final CustomerRepository customerRepo;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void on(OrderPlaced event) {
        Customer customer = customerRepo.findById(event.customerId()).orElseThrow();
        OrderReadModel model = new OrderReadModel();
        model.setOrderId(event.orderId().value().toString());
        model.setCustomerId(event.customerId().value().toString());
        model.setCustomerName(customer.getFullName());
        model.setCustomerEmail(customer.getEmail().value());
        model.setStatus("PENDING");
        model.setTotalAmount(event.totalAmount().amount());
        model.setCurrency(event.totalAmount().currency());
        model.setItemCount(event.items().size());
        model.setPlacedAt(event.occurredOn().atZone(ZoneOffset.UTC).toLocalDateTime());
        model.setUpdatedAt(LocalDateTime.now());
        readModelRepo.save(model);
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void on(OrderConfirmed event) {
        readModelRepo.findById(event.orderId().value().toString()).ifPresent(model -> {
            model.setStatus("CONFIRMED");
            model.setUpdatedAt(LocalDateTime.now());
            readModelRepo.save(model);
        });
    }
}
\`\`\`

## Approach 3 — Separate Read Database (Full CQRS)

For extreme read scalability, maintain a separate read-optimized database (MongoDB, Elasticsearch, Redis):

\`\`\`yaml
# Write database: PostgreSQL (ACID, normalized)
spring:
  datasource:
    url: jdbc:postgresql://postgres:5432/orders_write

# Read database: MongoDB (flexible schema, fast queries)
spring:
  data:
    mongodb:
      uri: mongodb://mongo:27017/orders_read
\`\`\`

\`\`\`java
@Document(collection = "order_summaries")
public class OrderSummaryDocument {
    @Id
    private String orderId;
    private String status;
    private CustomerInfo customer;   // embedded sub-document
    private List<ItemInfo> items;    // embedded array
    private MoneyInfo total;
    private Instant placedAt;
}
\`\`\`

This approach enables:
- Read replicas for query load
- Elasticsearch for full-text search over orders
- Redis for hot order data (current user's recent orders)

## Eventual Consistency — Handling the Gap

In full CQRS (separate databases), there is a window between writing and the read model being updated. This is **eventual consistency**.

\`\`\`java
@PostMapping
public ResponseEntity<Map<String, Object>> placeOrder(@RequestBody PlaceOrderRequest request) {
    OrderId orderId = commandHandler.handle(new PlaceOrderCommand(...));

    // Read model may not be ready immediately — respond with what we know
    return ResponseEntity.accepted()     // 202 Accepted, not 201 Created
        .body(Map.of(
            "orderId", orderId.value().toString(),
            "status", "PROCESSING",
            "message", "Order is being processed. Check status at /api/orders/" + orderId.value()
        ));
}
\`\`\`

Design the UI to handle this: show a "Processing..." state, poll for status, or use WebSocket/SSE for push notifications when the read model is ready.

## When Not to Use Full CQRS

CQRS adds complexity. Use it selectively:

**Use full CQRS when:**
- Read and write load profiles differ significantly
- Read models need different query capabilities than the write model provides
- You need different consistency levels for reads vs writes

**Don't use full CQRS when:**
- Simple CRUD with no complex domain logic
- The team is small and operational complexity is a concern
- A well-written JPA query with projections handles all read needs`,

'226.3': `# CQRS with Spring + Spring Data

Implementing CQRS in a Spring Boot application doesn't require a framework. Spring Data, Spring Events, and disciplined layering are sufficient for most use cases.

## The Command Bus Pattern

For larger applications, route commands through a central bus:

\`\`\`java
// Marker interface for all commands
public interface Command {}
public interface CommandResult {}

// Command handler interface
public interface CommandHandler<C extends Command, R extends CommandResult> {
    R handle(C command);
}

// Simple command bus implementation
@Component
@RequiredArgsConstructor
public class CommandBus {

    private final ApplicationContext context;

    @SuppressWarnings("unchecked")
    public <C extends Command, R extends CommandResult> R dispatch(C command) {
        // Find the handler for this command type via Spring
        String handlerName = command.getClass().getSimpleName() + "Handler";
        CommandHandler<C, R> handler = (CommandHandler<C, R>) context.getBean(handlerName);
        return handler.handle(command);
    }
}

// Usage
public record PlaceOrderResult(OrderId orderId) implements CommandResult {}

@Component("PlaceOrderCommandHandler")
@RequiredArgsConstructor
public class PlaceOrderCommandHandler implements CommandHandler<PlaceOrderCommand, PlaceOrderResult> {
    // ...
    public PlaceOrderResult handle(PlaceOrderCommand command) {
        OrderId orderId = orderRepo.save(order).getId();
        return new PlaceOrderResult(orderId);
    }
}
\`\`\`

## Query Handler Organization

\`\`\`java
@Service
@RequiredArgsConstructor
public class OrderQueryHandler {

    private final OrderReadModelRepository readModelRepo;

    public OrderDetail findOrderDetail(OrderId orderId, CustomerId requestingCustomer) {
        return readModelRepo.findByOrderIdAndCustomerId(
                orderId.value().toString(),
                requestingCustomer.value().toString())
            .map(this::toOrderDetail)
            .orElseThrow(() -> new OrderNotFoundException(orderId));
    }

    public Page<OrderSummary> findOrdersByCustomer(CustomerId customerId, Pageable pageable) {
        return readModelRepo.findByCustomerId(customerId.value().toString(), pageable)
            .map(this::toOrderSummary);
    }

    public Page<OrderSummary> findOrdersByStatus(OrderStatus status, Pageable pageable) {
        return readModelRepo.findByStatus(status.name(), pageable)
            .map(this::toOrderSummary);
    }

    private OrderDetail toOrderDetail(OrderReadModel model) {
        return new OrderDetail(
            model.getOrderId(),
            model.getCustomerName(),
            model.getStatus(),
            // ... map other fields
        );
    }
}
\`\`\`

## Rebuilding Read Models — Projection Replay

When you add a new field to the read model, you need to rebuild it from events:

\`\`\`java
@Component
@RequiredArgsConstructor
public class ReadModelRebuilder {

    private final EventStore eventStore;
    private final OrderReadModelRepository readModelRepo;
    private final OrderReadModelUpdater updater;

    @Transactional
    public void rebuildAll() {
        readModelRepo.deleteAll();
        eventStore.findAll(OrderPlaced.class).forEach(event -> updater.on(event));
        eventStore.findAll(OrderConfirmed.class).forEach(event -> updater.on(event));
        eventStore.findAll(OrderCancelled.class).forEach(event -> updater.on(event));
    }
}
\`\`\`

This is a key advantage of event-driven CQRS: read models can always be rebuilt from the event history. Add a new read model for a new reporting requirement, replay all events, and the new model is instantly populated.

## Testing CQRS Applications

Test the command and query sides independently:

\`\`\`java
// Command side: test domain invariants
@Test
void confirmOrder_fails_when_already_confirmed() {
    Order order = createConfirmedOrder();
    assertThatThrownBy(() -> commandHandler.handle(new ConfirmOrderCommand(order.getId())))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("Only PENDING orders");
}

// Query side: test read model projections
@Test
void findOrdersByCustomer_returns_orders_in_descending_date_order() {
    // Given: read model populated with 3 orders
    List<OrderSummary> results = queryHandler.findOrdersByCustomer(customerId, Pageable.ofSize(10));
    assertThat(results).hasSize(3);
    assertThat(results.get(0).placedAt()).isAfter(results.get(1).placedAt());
}

// Integration: test event → read model update chain
@Test
@Transactional
void orderConfirmed_event_updates_read_model_status() {
    OrderId orderId = commandHandler.handle(new PlaceOrderCommand(...));
    commandHandler.handle(new ConfirmOrderCommand(orderId));

    // Wait for AFTER_COMMIT listener (use TestTransaction.flagForCommit() in tests)
    OrderReadModel model = readModelRepo.findById(orderId.value().toString()).orElseThrow();
    assertThat(model.getStatus()).isEqualTo("CONFIRMED");
}
\`\`\``,
}

export const quiz: Record<string, QuizQuestion[]> = {

'226.1': [
  {
    question: 'What problem does CQRS solve that a traditional single-model approach cannot?',
    options: [
      'CQRS enables horizontal scaling by routing read traffic to read replicas',
      'In a single model, the aggregate must serve both write concerns (enforcing invariants with minimal associations) and read concerns (loading everything for complex UI queries) — these requirements conflict. CQRS uses separate models for each purpose',
      'CQRS eliminates the need for a database by caching all state in memory',
      'CQRS allows multiple teams to work on the same domain without merge conflicts',
    ],
    correctIndex: 1,
    explanation: 'The Order aggregate wants to be lean: enforce business rules, minimal associations. The Order list page wants: customer name, items, subtotals, addresses, status history — everything in one fast query. Asking the same model to do both creates N+1 query problems, lazy-loading surprises, and complex queries polluting the domain model. CQRS gives each side its own optimized model.',
  },
  {
    question: 'What should a Command return and why?',
    options: [
      'The full state of the modified aggregate, so the client can update its UI immediately',
      'Minimal data — typically just the ID of the created/modified resource. The client queries the read model to get the current state, keeping the command handler focused on state change',
      'A success/failure boolean and a list of validation errors',
      'Nothing — commands are fire-and-forget and should be void',
    ],
    correctIndex: 1,
    explanation: 'Returning the full aggregate from a command violates the separation: the command handler would need to also build a view model, conflating write and read concerns. Return only what the client needs to find the resource (the new ID, or void for modifications). The client then queries the read model if it needs to display updated state. This keeps each side\'s responsibility clear.',
  },
  {
    question: 'In a CQRS system, what role does an HTTP POST response play?',
    options: [
      'It always returns HTTP 200 with the full created resource',
      'It returns HTTP 201 Created with the resource URL (Location header) and minimal body — the "full view" is obtained via a subsequent GET request to the read side',
      'It returns HTTP 202 Accepted in all CQRS systems because writes are asynchronous',
      'It returns nothing — the client must poll a separate status endpoint',
    ],
    correctIndex: 1,
    explanation: 'REST convention: POST for creation returns 201 Created with a Location header pointing to the new resource URL. The body can be minimal (just the ID). The client performs a GET to that URL when it needs the full resource. In simple CQRS (same database), the GET is immediately consistent. In full CQRS (separate databases), the client may see a slight delay before the read model reflects the write.',
  },
  {
    question: 'Why should Command objects be immutable data carriers with no behavior?',
    options: [
      'Commands must be immutable to be safely sent over a message queue',
      'Commands represent user intent at a specific point in time — they describe what the user wanted to do. Business logic belongs in the domain model, not in the message carrying the request',
      'Immutable commands enable the command bus to cache and deduplicate identical commands',
      'Spring\'s command dispatching framework requires immutable records to function correctly',
    ],
    correctIndex: 1,
    explanation: 'A Command is a message saying "please do X with these parameters." It is data, not logic. Putting business logic in a Command couples the command to the domain, making it harder to send across service boundaries or process asynchronously. The Command Handler receives the Command, loads the relevant aggregate, and delegates to the domain model — three distinct responsibilities in three distinct places.',
  },
  {
    question: 'What is the difference between a Query Handler and a Repository in CQRS?',
    options: [
      'Query Handlers use SQL directly; Repositories use JPA/ORM',
      'A Repository is for the write side — it loads and saves Aggregates. A Query Handler is for the read side — it returns optimized view models (DTOs/projections) optimized for display, often bypassing the domain model entirely',
      'Query Handlers return Lists; Repositories return Optional and Page',
      'There is no functional difference — Query Handler is just a renamed Repository',
    ],
    correctIndex: 1,
    explanation: 'Repositories speak the domain model\'s language (load Order, save Order). Query Handlers speak the UI\'s language (give me OrderSummary for display). A Repository returns an Order aggregate with all its invariant-protection machinery. A Query Handler returns a flat OrderSummary record optimized for rendering a list. Using the same class for both collapses the CQRS separation.',
  },
],

'226.2': [
  {
    question: 'What is "eventual consistency" in the context of full CQRS with separate read/write databases?',
    options: [
      'Eventually the database becomes consistent after resolving merge conflicts',
      'There is a brief window after a write completes where the read model has not yet been updated — during this window, a query may return stale data. The system becomes consistent once the event is processed and the read model is updated',
      'The system guarantees consistency only after the evening batch job runs',
      'Eventual consistency means the ACID properties are relaxed — writes may not persist reliably',
    ],
    correctIndex: 1,
    explanation: 'With separate databases, the flow is: write DB commits → event published → read model updater processes event → read DB updated. This takes milliseconds to seconds. A user who places an order then immediately refreshes the orders list might see the old list. The application must design around this: 202 Accepted responses, "Processing..." UI states, or WebSocket/SSE push notifications when the read model is ready.',
  },
  {
    question: 'What is the primary advantage of building read models from domain events rather than from the aggregate\'s current state?',
    options: [
      'Event-based read models are always consistent with the write model because events are atomic',
      'Read models can be rebuilt from scratch by replaying the event log — adding a new read model retroactively (a new report, a new query pattern) only requires defining the projection and replaying history',
      'Events are more efficient to serialize than aggregates, reducing database write latency',
      'Event-based read models automatically handle schema migrations without downtime',
    ],
    correctIndex: 1,
    explanation: 'When you need a new type of report ("show me all orders placed between 3pm and 5pm on weekdays"), you can add a new read model and populate it by replaying the entire event history — the OrderPlaced events are all there. Without an event log, you\'d need to query the current write model and hope the historical data hasn\'t been overwritten. This retroactive capability is one of the key benefits of combining CQRS with Event Sourcing.',
  },
  {
    question: 'What HTTP status code is most appropriate for a command endpoint when CQRS uses eventual consistency?',
    options: [
      '200 OK — the command was processed successfully',
      '202 Accepted — the command was received and will be processed, but the effects may not be visible immediately in the read model',
      '201 Created — always appropriate for commands that create resources',
      '204 No Content — commands should return no body',
    ],
    correctIndex: 1,
    explanation: '202 Accepted means "I received your request and will process it, but I can\'t tell you the outcome yet." This is semantically correct for eventual consistency: the write succeeded, but the read model isn\'t ready yet. The response includes a URL the client can check to see the processed state. 201 implies the resource is immediately available via the Location URL, which may not be true in an eventually consistent system.',
  },
  {
    question: 'When should you NOT use full CQRS (separate read/write databases)?',
    options: [
      'When the application has more than 10,000 users per day',
      'When the application has simple CRUD operations with no complex domain logic, or when the team\'s operational capacity cannot manage two databases — the consistency and complexity trade-off doesn\'t pay off',
      'When the team uses Spring Boot, because Spring Boot doesn\'t support multiple data sources',
      'When the domain model has more than 5 aggregates',
    ],
    correctIndex: 1,
    explanation: 'Full CQRS is a complex pattern. It adds eventual consistency to reason about, two databases to operate, and synchronization logic to maintain. For a simple product catalog or user profile service, JPQL projections in the same database give you 80% of the benefit with 10% of the complexity. Apply full CQRS where read and write loads genuinely differ, or where read query flexibility requires a different database technology.',
  },
  {
    question: 'What is a "Read Model Rebuild" and when is it necessary?',
    options: [
      'A rebuild reloads the Spring application context when the read model schema changes',
      'Replaying all historical domain events through the projection logic to repopulate the read model — necessary when you add a new field to the read model, fix a bug in projection logic, or create an entirely new read model for a new query requirement',
      'Clearing the read model cache when the application detects stale data',
      'A Liquibase migration that updates the read model table schema without data loss',
    ],
    correctIndex: 1,
    explanation: 'Because all state changes are represented as events, you can always derive the current state by replaying from the beginning. When you add a "confirmedAt" column to the read model and need to backfill it, you replay all OrderConfirmed events through the projection — each event sets the confirmedAt on the correct read model row. The event log is the source of truth; the read model is a derived, disposable cache.',
  },
],

'226.3': [
  {
    question: 'What is the Command Bus pattern and what problem does it solve?',
    options: [
      'A message queue (like Kafka or RabbitMQ) that buffers commands for asynchronous processing',
      'A central routing component that receives commands and dispatches them to the correct handler — decoupling the sender from the handler, enabling cross-cutting concerns (logging, validation, authorization) in one place',
      'A Spring bean factory that creates new instances of command handlers for each request',
      'A circuit breaker that retries failed commands automatically',
    ],
    correctIndex: 1,
    explanation: 'Without a command bus, each controller must directly inject and call the specific handler. Adding audit logging means modifying every controller. With a command bus, the controller calls bus.dispatch(command); the bus applies cross-cutting concerns (timing, logging, authorization checks) before routing to the correct handler. It\'s the CQRS equivalent of Spring MVC\'s DispatcherServlet.',
  },
  {
    question: 'When testing CQRS command handlers, what should you focus on and why?',
    options: [
      'Test that the command handler calls the correct repository methods in the right order',
      'Test domain invariants — the command handler should reject invalid state transitions (confirming a cancelled order) and accept valid ones, with the domain model enforcing these rules through the handler\'s delegation',
      'Test the JSON serialization format of command objects',
      'Test that the command handler publishes the correct events to Kafka',
    ],
    correctIndex: 1,
    explanation: 'The command handler\'s job is to load the aggregate, call the domain method, and save. The business logic is in the aggregate. Testing the handler means testing what it does when the aggregate throws (should propagate) and that it calls the right aggregate method. The aggregate\'s own unit tests verify the invariants. Integration tests verify the full command → domain → event → read model chain.',
  },
  {
    question: 'Why is Spring\'s @TransactionalEventListener(AFTER_COMMIT) essential for CQRS read model updates?',
    options: [
      'AFTER_COMMIT reduces database connection pool pressure by running after the main transaction releases its connection',
      'Read model updates triggered BEFORE_COMMIT would be rolled back if the main transaction fails — AFTER_COMMIT guarantees the write succeeded before updating the read model, preventing phantom read model updates for rolled-back writes',
      'AFTER_COMMIT enables asynchronous read model updates without blocking the HTTP response',
      'Spring requires AFTER_COMMIT for read model listeners to access the updated entity state via JPA',
    ],
    correctIndex: 1,
    explanation: 'Consider: write saves the Order, fires OrderConfirmed event, read model listener updates the status to CONFIRMED, then the write transaction rolls back (maybe a subsequent operation failed). The read model now shows CONFIRMED for an order that doesn\'t exist in the write DB. AFTER_COMMIT prevents this: the read model only updates after the write is safely committed. The trade-off is that AFTER_COMMIT listeners run outside the original transaction — they need their own transaction and idempotency handling.',
  },
  {
    question: 'How does CQRS benefit query performance compared to the traditional single-model approach?',
    options: [
      'CQRS always caches query results in Redis for sub-millisecond response times',
      'Read models can be pre-computed, denormalized, and indexed specifically for query patterns — avoiding JOINs, N+1 problems, and lazy-loading by having exactly the data the query needs in one flat structure',
      'CQRS automatically distributes query load across multiple database replicas',
      'Spring Data CQRS repositories use compiled SQL plans that are 10x faster than standard JPA queries',
    ],
    correctIndex: 1,
    explanation: 'A typical order summary query requires JOINs across orders, customers, order_items, and products tables. With a dedicated read model, all this data is pre-materialized in a single flat table (or document). The query becomes a simple indexed primary key or foreign key lookup — no JOINs, no lazy loading surprises. The read model is updated incrementally (only when events arrive) rather than computed on every request.',
  },
  {
    question: 'What distinguishes a query handler from a service that queries a repository?',
    options: [
      'Query handlers use stored procedures; service repositories use ORM',
      'A query handler is explicitly for the read side of CQRS — it returns view models (DTOs optimized for display), has no transactional write responsibility, and can safely use read-only transactions or bypass the aggregate model entirely for performance',
      'Query handlers enforce security; service repositories do not check authorization',
      'Query handlers are stateless Spring components; repositories maintain connection state',
    ],
    correctIndex: 1,
    explanation: 'The distinction is conceptual and architectural. A "service" that mixes reads and writes violates CQRS separation. A query handler is explicitly read-only (@Transactional(readOnly=true)), returns view models (not aggregates), and signals to future developers that "this path has no side effects." The naming makes the read/write split visible in the codebase, not just in the database.',
  },
],
}

export const codingTask: Record<string, {
  instructions: string; boilerplate: string; rubric: string[]; hints: string[]
}> = {

'226.1': {
  instructions: `Implement an \`OrderCommandHandler\` for the write side of a CQRS order system.

Requirements:

1. Create a \`PlaceOrderCommand\` record with fields: \`customerId\` (String), \`productId\` (String), \`quantity\` (int), \`unitPrice\` (BigDecimal).

2. Create an \`OrderCreatedEvent\` record with fields: \`orderId\` (String), \`customerId\` (String), \`totalAmount\` (BigDecimal), \`occurredOn\` (Instant).

3. Implement \`OrderCommandHandler\` as a Spring \`@Service\` that:
   - Injects an \`ApplicationEventPublisher\` (for publishing events)
   - Has a \`String handle(PlaceOrderCommand command)\` method annotated with \`@Transactional\`
   - Validates: quantity must be > 0 (throw \`IllegalArgumentException("Quantity must be positive")\`)
   - Validates: unitPrice must be > 0 (throw \`IllegalArgumentException("Unit price must be positive")\`)
   - Computes \`totalAmount = unitPrice * quantity\` using \`BigDecimal\`
   - Generates a random \`orderId = UUID.randomUUID().toString()\`
   - Publishes an \`OrderCreatedEvent(orderId, command.customerId(), totalAmount, Instant.now())\`
   - Returns the \`orderId\``,
  boilerplate: `package com.example.command;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

// TODO: Define PlaceOrderCommand record
// Fields: customerId (String), productId (String), quantity (int), unitPrice (BigDecimal)

// TODO: Define OrderCreatedEvent record
// Fields: orderId (String), customerId (String), totalAmount (BigDecimal), occurredOn (Instant)

@Service
public class OrderCommandHandler {

    private final ApplicationEventPublisher eventPublisher;

    public OrderCommandHandler(ApplicationEventPublisher eventPublisher) {
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public String handle(PlaceOrderCommand command) {
        // TODO: validate quantity > 0
        // TODO: validate unitPrice > 0
        // TODO: compute totalAmount
        // TODO: generate orderId
        // TODO: publish OrderCreatedEvent
        // TODO: return orderId
        return null;
    }
}`,
  rubric: [
    'PlaceOrderCommand is a record with customerId, productId, quantity (int), unitPrice (BigDecimal)',
    'OrderCreatedEvent is a record with orderId, customerId, totalAmount, occurredOn (Instant)',
    'handle() is annotated with @Transactional',
    'Validates quantity > 0 with IllegalArgumentException("Quantity must be positive")',
    'Validates unitPrice > BigDecimal.ZERO with IllegalArgumentException("Unit price must be positive")',
    'totalAmount = command.unitPrice().multiply(BigDecimal.valueOf(command.quantity()))',
    'orderId = UUID.randomUUID().toString()',
    'eventPublisher.publishEvent(new OrderCreatedEvent(orderId, command.customerId(), totalAmount, Instant.now()))',
    'Returns the orderId',
  ],
  hints: [
    'public record PlaceOrderCommand(String customerId, String productId, int quantity, BigDecimal unitPrice) {}',
    'public record OrderCreatedEvent(String orderId, String customerId, BigDecimal totalAmount, Instant occurredOn) {}',
    'if (command.quantity() <= 0) throw new IllegalArgumentException("Quantity must be positive");',
    'if (command.unitPrice().compareTo(BigDecimal.ZERO) <= 0) throw new IllegalArgumentException("Unit price must be positive");',
    'BigDecimal totalAmount = command.unitPrice().multiply(BigDecimal.valueOf(command.quantity()));',
    'String orderId = UUID.randomUUID().toString();',
    'eventPublisher.publishEvent(new OrderCreatedEvent(orderId, command.customerId(), totalAmount, Instant.now()));',
  ],
},
}
