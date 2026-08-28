// Part VII — DDD, CQRS & Event Sourcing
// Chapter 225: Domain-Driven Design Foundations

import type { QuizQuestion } from '../../src/data/curriculum'

export const courseId = 'springboot-ai-architect'

export const content: Record<string, string> = {

'225.1': `# Strategic DDD — Bounded Contexts & Ubiquitous Language

Domain-Driven Design (DDD) is a philosophy for building complex software where the core domain model is the heart of the application. Strategic DDD defines how to carve a large domain into manageable, independently-deployable units.

## The Problem DDD Solves

Large enterprise applications suffer from:
- **Ambiguous language** — "Order" means different things in Sales (a quote), Warehouse (a picking list), and Finance (an invoice)
- **Big Ball of Mud** — everything coupled to everything; no clear boundaries
- **Anemic domain model** — business logic scattered in services, domain objects are data bags

DDD addresses these by making the business domain explicit in the code.

## Bounded Context

A Bounded Context is a clear boundary within which a particular domain model is valid and internally consistent. Within its boundary, words have precise, agreed-upon meanings.

\`\`\`
+------------------+     +------------------+     +------------------+
|  Order Context   |     | Shipping Context |     | Billing Context  |
|                  |     |                  |     |                  |
| Order: a         |     | Order: a          |     | Order: an        |
| customer's       |     | consignment to    |     | invoice to       |
| purchase intent  |     | dispatch          |     | collect payment  |
+------------------+     +------------------+     +------------------+
\`\`\`

Same word "Order" — three different models. DDD makes this explicit rather than pretending one "Order" class can serve all three.

## Ubiquitous Language

The language used in code must match the language used by domain experts (business people). If a product manager says "a customer places an order," your code should have a \`Customer\` who \`places\` an \`Order\` — not a \`UserService.createOrderRecord()\`.

\`\`\`java
// BAD: Technical language, not domain language
public class OrderService {
    public void createOrderRecord(Long userId, List<Long> productIds, BigDecimal totalAmount) { ... }
}

// GOOD: Ubiquitous language
public class Customer {
    public Order placeOrder(List<OrderItem> items, ShippingAddress address) {
        validateItems(items);
        Order order = new Order(this.id, items, address);
        order.registerEvent(new OrderPlaced(order.getId(), this.id, items));
        return order;
    }
}
\`\`\`

## Context Mapping — Relationships Between Bounded Contexts

Bounded contexts don't exist in isolation. They need to exchange data:

| Relationship | Meaning |
|---|---|
| **Shared Kernel** | Two contexts share a small model; changes need both teams' agreement |
| **Customer/Supplier** | Upstream context defines interface; downstream consumes it |
| **Anti-Corruption Layer (ACL)** | Downstream translates upstream's model to protect its own domain language |
| **Published Language** | Contexts communicate via a well-defined, versioned event format |
| **Conformist** | Downstream simply adopts upstream's model |

The Anti-Corruption Layer (ACL) is the most important pattern for microservices:

\`\`\`java
// The Shipping context receives an Order from the Order context
// but translates it into its own Consignment model
@Component
public class OrderToConsignmentTranslator {

    public Consignment translate(ExternalOrderDto externalOrder) {
        return new Consignment(
            ConsignmentId.of(externalOrder.orderId()),
            toShippingAddress(externalOrder.deliveryAddress()),
            toConsignmentItems(externalOrder.lineItems()),
            Priority.from(externalOrder.shippingMethod())
        );
    }
}
\`\`\`

## Spring Modulith for Bounded Contexts in a Monolith

Before reaching for microservices, Spring Modulith enforces bounded context boundaries within a single Spring Boot application:

\`\`\`
src/main/java/com/example/
    orders/          <- Order bounded context
        Order.java
        OrderService.java
        OrderRepository.java
    shipping/        <- Shipping bounded context
        Consignment.java
        ShippingService.java
    billing/         <- Billing bounded context
        Invoice.java
        BillingService.java
\`\`\`

\`\`\`java
@SpringBootApplication
@EnableModulith
public class Application { ... }
\`\`\`

Spring Modulith validates that module boundaries are respected at test time:

\`\`\`java
@Test
void verifyModularStructure() {
    ApplicationModules.of(Application.class).verify();
    // Fails if shipping.* imports from orders.* internal classes
}
\`\`\``,

'225.2': `# Tactical DDD — Aggregates, Entities & Value Objects

Tactical DDD provides building blocks for implementing a rich domain model. These patterns define how domain objects are structured and how they protect business invariants.

## The Building Blocks

| Building Block | Description | Identity |
|---|---|---|
| **Entity** | Has a unique identity that persists over time | Has ID |
| **Value Object** | Defined by its attributes; immutable; no identity | No ID |
| **Aggregate** | Cluster of entities and value objects with one root | Root has ID |
| **Domain Event** | Something significant that happened in the domain | Timestamped |
| **Repository** | Retrieves and persists aggregates | Per aggregate |
| **Domain Service** | Stateless logic that doesn't belong to an entity | Stateless |

## Entities

An Entity has a unique identity. Two entities with the same data are still different if their IDs differ:

\`\`\`java
@Entity
public class Order {

    @Id
    private OrderId id;

    private CustomerId customerId;
    private OrderStatus status;

    @ElementCollection
    private List<OrderItem> items;

    private Money totalAmount;

    protected Order() {} // JPA requires no-arg constructor

    public static Order create(CustomerId customerId, List<OrderItem> items) {
        Order order = new Order();
        order.id = OrderId.generate();
        order.customerId = customerId;
        order.items = new ArrayList<>(items);
        order.status = OrderStatus.PENDING;
        order.totalAmount = calculateTotal(items);
        return order;
    }

    public void confirm() {
        if (status != OrderStatus.PENDING) {
            throw new IllegalStateException("Only PENDING orders can be confirmed");
        }
        this.status = OrderStatus.CONFIRMED;
    }

    public void cancel(CancellationReason reason) {
        if (status == OrderStatus.SHIPPED) {
            throw new IllegalStateException("Cannot cancel a shipped order");
        }
        this.status = OrderStatus.CANCELLED;
    }
}
\`\`\`

## Value Objects

A Value Object has no identity — it is defined entirely by its attributes. Two \`Money\` instances with \`amount=100, currency=USD\` are equal. Value Objects are immutable:

\`\`\`java
@Embeddable
public final class Money {

    private final BigDecimal amount;
    private final Currency currency;

    public Money(BigDecimal amount, Currency currency) {
        if (amount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Money amount cannot be negative");
        }
        this.amount = amount.setScale(2, RoundingMode.HALF_UP);
        this.currency = Objects.requireNonNull(currency);
    }

    public Money add(Money other) {
        if (!currency.equals(other.currency)) {
            throw new IllegalArgumentException("Cannot add different currencies");
        }
        return new Money(amount.add(other.amount), currency);
    }

    public Money multiply(int quantity) {
        return new Money(amount.multiply(BigDecimal.valueOf(quantity)), currency);
    }

    @Override
    public boolean equals(Object o) {
        if (!(o instanceof Money m)) return false;
        return amount.compareTo(m.amount) == 0 && currency.equals(m.currency);
    }

    @Override
    public int hashCode() { return Objects.hash(amount, currency); }
}
\`\`\`

Other examples of Value Objects: \`EmailAddress\`, \`OrderId\`, \`ShippingAddress\`, \`DateRange\`, \`Coordinates\`.

## Aggregates — The Most Important Pattern

An Aggregate is a cluster of domain objects (entities + value objects) treated as a single unit. It has one **Aggregate Root** — the only entry point for external access.

**Rules:**
1. External objects can only reference the Aggregate Root, never internal entities
2. All changes go through the Root (which enforces invariants)
3. A transaction boundary equals an Aggregate boundary — save one Aggregate per transaction
4. Aggregates communicate through Domain Events, not direct references

\`\`\`java
// Order is the Aggregate Root
// OrderItem is an internal entity — only Order can create/modify it
public class Order { // Aggregate Root

    private List<OrderItem> items; // internal entity — no public setters

    public void addItem(ProductId productId, int quantity, Money price) {
        // Enforce invariant: max 20 items per order
        if (items.size() >= 20) {
            throw new OrderItemLimitExceededException();
        }
        items.add(new OrderItem(productId, quantity, price));
        recalculateTotal();
    }

    public void removeItem(ProductId productId) {
        items.removeIf(item -> item.getProductId().equals(productId));
        recalculateTotal();
    }
}
\`\`\`

## Aggregate Design — How Small?

**Too large:** An Order Aggregate that includes Customer history violates the one-transaction-per-Aggregate rule and creates contention.

**Too small:** An Order with no items (just an ID) cannot enforce "an order must have at least one item."

Rule of thumb: an Aggregate should enforce a single business invariant. Design the smallest Aggregate that can protect its invariants.

## Typed IDs — Preventing Primitive Obsession

\`\`\`java
// BAD: easy to mix up
public Order findOrder(Long orderId, Long customerId) { ... }

// GOOD: compiler catches ID mix-ups
public record OrderId(UUID value) {
    public static OrderId generate() { return new OrderId(UUID.randomUUID()); }
    public static OrderId of(String value) { return new OrderId(UUID.fromString(value)); }
}
public record CustomerId(UUID value) { ... }

public Order findOrder(OrderId orderId) { ... }
\`\`\``,

'225.3': `# Domain Events & Application Services

Domain Events capture something significant that happened in the domain — in the past tense. They are the primary mechanism for communication between bounded contexts and for decoupling within a context.

## Domain Events

\`\`\`java
public sealed interface OrderEvent permits OrderPlaced, OrderConfirmed, OrderCancelled {}

public record OrderPlaced(
    OrderId orderId,
    CustomerId customerId,
    List<OrderItem> items,
    Money totalAmount,
    Instant occurredOn
) implements OrderEvent {
    public OrderPlaced(OrderId orderId, CustomerId customerId, List<OrderItem> items, Money total) {
        this(orderId, customerId, items, total, Instant.now());
    }
}

public record OrderConfirmed(OrderId orderId, Instant confirmedAt) implements OrderEvent {}
public record OrderCancelled(OrderId orderId, String reason, Instant cancelledAt) implements OrderEvent {}
\`\`\`

## Raising Events from Aggregates

Aggregates produce events; they don't publish them. The infrastructure layer handles publication:

\`\`\`java
public class Order {

    @Transient
    private final List<OrderEvent> domainEvents = new ArrayList<>();

    public List<OrderEvent> pullEvents() {
        List<OrderEvent> events = List.copyOf(domainEvents);
        domainEvents.clear();
        return events;
    }

    public void confirm() {
        if (status != OrderStatus.PENDING) throw new IllegalStateException("...");
        this.status = OrderStatus.CONFIRMED;
        domainEvents.add(new OrderConfirmed(this.id, Instant.now()));
    }
}
\`\`\`

## Spring Data Domain Events — @DomainEvents

Spring Data provides built-in support for publishing domain events after a save:

\`\`\`java
// Extend AbstractAggregateRoot for automatic event publishing
@Entity
public class Order extends AbstractAggregateRoot<Order> {

    public void confirm() {
        this.status = OrderStatus.CONFIRMED;
        registerEvent(new OrderConfirmed(this.id, Instant.now())); // Spring Data handles publishing
    }
}

// Spring Data publishes events automatically after orderRepository.save(order)
// Listeners are called in the same transaction
@Component
public class OrderEventListener {

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOrderConfirmed(OrderConfirmed event) {
        notificationService.sendConfirmationEmail(event.orderId());
    }
}
\`\`\`

\`@TransactionalEventListener(AFTER_COMMIT)\` is critical — it ensures the listener only fires after the transaction commits. Without this, a failure after the event fires but before commit could trigger notifications for orders that were rolled back.

## Application Services — The Orchestration Layer

Application Services are the entry points to the domain. They:
- Receive commands from the API layer (Controllers, Message Listeners)
- Load aggregates from repositories
- Delegate to the domain (call aggregate methods)
- Save aggregates and publish events

\`\`\`java
@Service
@Transactional
@RequiredArgsConstructor
public class OrderApplicationService {

    private final OrderRepository orderRepository;
    private final CustomerRepository customerRepository;
    private final ProductCatalogService productCatalogService;

    public OrderId placeOrder(PlaceOrderCommand command) {
        // 1. Load the customer
        Customer customer = customerRepository.findById(command.customerId())
            .orElseThrow(() -> new CustomerNotFoundException(command.customerId()));

        // 2. Validate each product exists and is available
        List<OrderItem> items = command.items().stream()
            .map(i -> {
                ProductInfo product = productCatalogService.getProduct(i.productId());
                return new OrderItem(i.productId(), i.quantity(), product.price());
            })
            .toList();

        // 3. Delegate to domain
        Order order = customer.placeOrder(items, command.shippingAddress());

        // 4. Persist
        orderRepository.save(order);

        return order.getId();
    }

    public void confirmOrder(ConfirmOrderCommand command) {
        Order order = orderRepository.findById(command.orderId())
            .orElseThrow(() -> new OrderNotFoundException(command.orderId()));
        order.confirm();
        orderRepository.save(order);
    }
}
\`\`\`

## Commands vs Queries vs Events

| Message Type | Direction | Example |
|---|---|---|
| **Command** | Request to change state | \`PlaceOrder\`, \`CancelOrder\` |
| **Query** | Request for information | \`GetOrderById\`, \`ListCustomerOrders\` |
| **Event** | Notification that something happened | \`OrderPlaced\`, \`OrderConfirmed\` |

Commands can fail (validation errors, business rule violations). Events always succeed — they describe the past. Queries have no side effects.`,
}

export const quiz: Record<string, QuizQuestion[]> = {

'225.1': [
  {
    question: 'What is a Bounded Context in Domain-Driven Design?',
    options: [
      'A Java package that groups all classes related to one feature',
      'A clear boundary within which a specific domain model applies — the same word ("Order") can mean completely different things in different Bounded Contexts, and each context has its own model',
      'A microservice boundary — one Bounded Context always maps to one microservice',
      'A database schema that isolates one module\'s tables from another\'s',
    ],
    correctIndex: 1,
    explanation: 'A Bounded Context is a semantic boundary, not a technical one. "Order" in Sales means a customer\'s purchase intent; in Shipping it means a consignment to dispatch; in Billing it means an invoice to collect. DDD makes these separate models explicit rather than building one giant Order class that tries to serve all three contexts — which inevitably becomes a compromise that serves none well.',
  },
  {
    question: 'What is Ubiquitous Language and why is it central to DDD?',
    options: [
      'A universal programming language that all DDD practitioners use',
      'A shared language between developers and domain experts that is reflected directly in the code — method names, class names, and variable names must match the terms domain experts use',
      'A documentation standard that requires all methods to have Javadoc comments using business terms',
      'An internationalization strategy for making software available in multiple human languages',
    ],
    correctIndex: 1,
    explanation: 'When a product manager says "a customer places an order" and the code has UserService.createOrderRecord(), there\'s a translation layer between business and code. Bugs hide in translations. Ubiquitous Language eliminates the translation: customer.placeOrder() means the same thing to the developer and the product manager. Changes in business vocabulary are reflected immediately in code changes.',
  },
  {
    question: 'What is an Anti-Corruption Layer (ACL) and when should you use it?',
    options: [
      'A security layer that prevents SQL injection and XSS attacks',
      'A translation layer that converts an upstream context\'s model into the downstream context\'s own domain language, protecting the downstream context from being shaped by the upstream model\'s concepts',
      'A caching layer that protects the database from being corrupted by concurrent writes',
      'A validation layer placed at API boundaries to reject invalid input',
    ],
    correctIndex: 1,
    explanation: 'When context A calls context B, B can become dependent on A\'s model — adopting A\'s terminology and structure. The ACL translates A\'s ExternalOrderDto into B\'s own Consignment, protecting B\'s ubiquitous language. This is critical when the upstream model is poorly designed, uses different terminology, or belongs to a third-party system you cannot change.',
  },
  {
    question: 'What does Spring Modulith\'s ApplicationModules.verify() do at test time?',
    options: [
      'It verifies that all Spring beans are correctly wired with no circular dependencies',
      'It validates that module boundaries are respected — that no module imports internal classes from another module, enforcing Bounded Context isolation within a modular monolith',
      'It runs all @SpringBootTest integration tests in the correct dependency order',
      'It verifies that each module has a dedicated database schema',
    ],
    correctIndex: 1,
    explanation: 'Spring Modulith uses package structure to define module boundaries. verify() performs static analysis: if the shipping module imports an internal class from the orders module (orders.internal.OrderInternalHelper), the test fails. This enforces Bounded Context isolation without requiring microservices. It\'s the automated architecture test for your module structure.',
  },
  {
    question: 'Why does mapping one Bounded Context to one microservice not always make sense?',
    options: [
      'Microservices cannot communicate across Bounded Context boundaries',
      'A Bounded Context is a semantic model boundary, not a deployment boundary. Some contexts are small enough to coexist in a modular monolith; deploying each as a separate microservice adds operational complexity (distributed tracing, network latency, distributed transactions) without proportional benefit',
      'Microservices must share a database, which prevents independent Bounded Context models',
      'Spring Boot cannot deploy multiple Bounded Contexts in the same application',
    ],
    correctIndex: 1,
    explanation: 'The Bounded Context/microservice mapping is a popular simplification that doesn\'t account for scale. A small startup\'s entire application might be one Bounded Context deployed as one service. A large enterprise might have 50 Bounded Contexts but only 10 microservices (grouping related contexts). Start with a modular monolith (Spring Modulith enforces the boundaries), and extract to microservices only when there\'s a compelling reason (independent scaling, different release cadences, team autonomy).',
  },
],

'225.2': [
  {
    question: 'What distinguishes an Entity from a Value Object in DDD?',
    options: [
      'Entities are persisted to the database; Value Objects exist only in memory',
      'Entities have a unique identity that persists over time (two entities with the same data are different if their IDs differ); Value Objects are defined by their attributes and are interchangeable if all attributes are equal',
      'Entities belong to a bounded context; Value Objects are shared across contexts',
      'Entities contain business logic; Value Objects are plain data holders',
    ],
    correctIndex: 1,
    explanation: 'An order with ID 123 is different from an order with ID 456 even if every field is identical — identity is what matters. Two Money(100, USD) instances are identical — if one is replaced with another that has the same values, nothing changes. Value Objects should be immutable (all fields set in constructor, no setters) because their value IS their identity.',
  },
  {
    question: 'What are the key rules of Aggregate design?',
    options: [
      'Aggregates must have at most 5 entities and use exactly one Repository',
      'External objects can only reference the Aggregate Root; all state changes go through the Root; save exactly one Aggregate per transaction; Aggregates communicate through Domain Events, not direct references',
      'Aggregates must be annotated with @Aggregate and deployed as separate microservices',
      'All entities in an Aggregate share the same database table for performance',
    ],
    correctIndex: 1,
    explanation: 'The Aggregate Root is the guardian of the Aggregate\'s invariants. If external code could modify internal entities directly, invariants could be violated. One transaction per Aggregate prevents the "save two aggregates in one transaction" distributed transaction problem. Domain Events (not direct references) keep Aggregates decoupled — the Order doesn\'t hold a reference to the Customer; it fires an OrderPlaced event that the Customer context can handle.',
  },
  {
    question: 'Why should Value Objects be immutable?',
    options: [
      'Immutability is required for Java records, and all Value Objects must use records',
      'Value Objects have no identity — mutation would change the "thing" represented without creating a new instance, causing aliasing bugs when shared. Immutability means operations return new instances rather than modifying in place',
      'Mutable Value Objects cannot be stored in JPA @Embeddable columns',
      'Immutability enables the Spring container to cache Value Object instances for performance',
    ],
    correctIndex: 1,
    explanation: 'If Money were mutable and you pass the same Money instance to two orders, mutating it (via setAmount()) would silently change both orders. With immutable Money, every operation (add, multiply) returns a new Money — sharing instances is safe because they cannot be changed. This eliminates an entire class of aliasing bugs and makes the code easier to reason about.',
  },
  {
    question: 'What problem do typed IDs (like OrderId and CustomerId records) solve?',
    options: [
      'Typed IDs enable JPA to generate UUIDs instead of auto-increment integers',
      'Typed IDs make ID mix-up errors compile-time failures instead of runtime bugs — passing a CustomerId where an OrderId is expected is caught by the compiler, not by a wrong query result or a runtime exception',
      'Typed IDs automatically validate UUID format before accepting input',
      'Typed IDs enable Spring Data to use composite primary keys',
    ],
    correctIndex: 1,
    explanation: 'findOrder(Long orderId, Long customerId) compiles fine when called as findOrder(customerId, orderId) — the arguments are swapped, but both are Long. The method runs, hits the database with wrong IDs, and returns the wrong order (or null). findOrder(OrderId orderId) fails at compile time if you pass a CustomerId — the type system catches the bug for free.',
  },
  {
    question: 'How does an Aggregate enforce the "order must have at least one item" invariant?',
    options: [
      'Add a @NotEmpty annotation to the items collection and Spring Validation enforces it',
      'All item creation and removal goes through Aggregate Root methods (addItem, removeItem) which check the invariant before modifying state — external code cannot directly manipulate the items list',
      'Configure Hibernate constraints on the order_items table',
      'Implement a custom JPA entity listener that validates item count before flush',
    ],
    correctIndex: 1,
    explanation: 'If the items list were public and directly modifiable, any caller could write order.getItems().clear() — bypassing all validation. The Aggregate Root is the only path: addItem() and removeItem() check constraints before allowing changes. The domain model\'s integrity is enforced in the domain layer, not in the database or in a service that might forget to check.',
  },
],

'225.3': [
  {
    question: 'Why should Domain Events be named in the past tense?',
    options: [
      'Java naming conventions require past-tense names for event classes',
      'Domain Events describe something that already happened — they are facts about the past. Past tense (OrderPlaced, OrderConfirmed) communicates that the state change occurred and is immutable, unlike commands (PlaceOrder) which are requests that might fail',
      'Past tense enables Spring\'s event bus to automatically sequence events chronologically',
      'Domain experts in business use past tense when discussing events, so code matches their language',
    ],
    correctIndex: 1,
    explanation: 'Commands are requests: "please place this order" — they can be rejected. Events are facts: "the order was placed" — they cannot be undone (you can correct with a compensating event). Naming matters because it communicates intent: OrderPlaced cannot be "un-happened"; CancelOrder can be refused. This asymmetry is fundamental to event-driven design.',
  },
  {
    question: 'What does @TransactionalEventListener(phase = AFTER_COMMIT) guarantee?',
    options: [
      'The listener runs before the transaction commits, enabling rollback if the listener fails',
      'The listener only fires after the database transaction commits successfully — preventing notifications or side effects for state changes that were rolled back',
      'The listener runs in a new transaction, independent of the original transaction',
      'The listener is called synchronously within the same thread as the commit',
    ],
    correctIndex: 1,
    explanation: 'Without AFTER_COMMIT, the listener fires when the event is published (during the transaction). If the transaction later rolls back (due to a subsequent exception), the listener already executed — sending a confirmation email for an order that doesn\'t exist. AFTER_COMMIT guarantees the database state is committed before any side effects run. The trade-off: if the listener fails, the transaction is already committed, so you need idempotent listeners with retry logic.',
  },
  {
    question: 'What is the role of an Application Service in the DDD layered architecture?',
    options: [
      'Application Services contain business logic for operations that span multiple bounded contexts',
      'Application Services orchestrate the domain: load aggregates from repositories, call domain methods (which enforce invariants), save aggregates, and publish events — they contain no business logic themselves',
      'Application Services are Spring @Service beans that replace the Repository pattern',
      'Application Services transform DTOs to domain objects and vice versa',
    ],
    correctIndex: 1,
    explanation: 'The distinction between Application Services and Domain Services matters: Application Services are infrastructure-aware (they use repositories, send emails, call external APIs) but contain no business rules. Business rules live in the domain objects. An Application Service that validates business rules is an anti-pattern — it recreates the anemic domain model. "Load, delegate, save" is the Application Service mantra.',
  },
  {
    question: 'How does AbstractAggregateRoot enable domain event publishing in Spring Data?',
    options: [
      'It automatically saves domain events to a separate database table after each repository save',
      'It provides a registerEvent() method that accumulates events; Spring Data automatically publishes all registered events via ApplicationEventPublisher after a successful repository.save() call',
      'It configures a background thread that polls for new events and publishes them asynchronously',
      'It generates Kafka topics for each event type and publishes events automatically',
    ],
    correctIndex: 1,
    explanation: 'AbstractAggregateRoot.registerEvent() stores events in a transient list. After orderRepository.save(order), Spring Data calls ApplicationEventPublisher.publishEvent() for each registered event — in the same transaction. This ties event publication to the Aggregate\'s persistence lifecycle: no save, no events; save fails, no events. Combines the aggregate\'s state change and its event announcements in a single atomic operation.',
  },
  {
    question: 'What distinguishes a Command from a Domain Event in terms of intent and handling?',
    options: [
      'Commands are synchronous; Domain Events are always asynchronous',
      'A Command is a request to change state that can be rejected (PlaceOrder may fail validation); a Domain Event is a fact that something happened (OrderPlaced cannot be rejected — it already happened). Commands have one handler; Events can have many listeners',
      'Commands are handled by Application Services; Events are handled by the domain model',
      'Commands carry the current user\'s identity; Events carry only the aggregate ID',
    ],
    correctIndex: 1,
    explanation: 'The asymmetry is fundamental: commands represent intent and carry uncertainty (the system might refuse). Events represent completed facts and carry certainty (this happened). One PlaceOrderCommand has exactly one handler (the OrderApplicationService); an OrderPlaced event can be observed by the NotificationService, the InventoryService, the AnalyticsService, and the BillingService simultaneously — each reacts independently.',
  },
],
}

export const codingTask: Record<string, {
  instructions: string; boilerplate: string; rubric: string[]; hints: string[]
}> = {

'225.2': {
  instructions: `Implement a \`Money\` Value Object that represents a monetary amount with currency.

Requirements:

1. \`Money\` must be a Java record with fields \`amount\` (BigDecimal) and \`currency\` (String, e.g. "USD").

2. In the canonical constructor, enforce:
   - \`amount\` must not be null
   - \`currency\` must not be null or blank
   - \`amount\` must be >= 0 (throw \`IllegalArgumentException\` if negative)
   - Scale \`amount\` to 2 decimal places using \`HALF_UP\` rounding

3. Implement \`Money add(Money other)\`:
   - Throw \`IllegalArgumentException\` if currencies differ
   - Return a new \`Money\` with summed amounts

4. Implement \`Money multiply(int quantity)\`:
   - Throw \`IllegalArgumentException\` if quantity < 0
   - Return a new \`Money\` with amount multiplied by quantity

5. Implement \`boolean isGreaterThan(Money other)\`:
   - Throw \`IllegalArgumentException\` if currencies differ
   - Return true if this amount is greater than other's amount

Note: Java records automatically generate correct equals/hashCode from fields — rely on them.`,
  boilerplate: `package com.example.domain;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Objects;

public record Money(BigDecimal amount, String currency) {

    // TODO: Compact constructor — validate and scale amount
    public Money {
        // validate nulls, blank currency, negative amount
        // scale amount to 2dp HALF_UP
    }

    // TODO: add(Money other)
    public Money add(Money other) {
        return null;
    }

    // TODO: multiply(int quantity)
    public Money multiply(int quantity) {
        return null;
    }

    // TODO: isGreaterThan(Money other)
    public boolean isGreaterThan(Money other) {
        return false;
    }

    public static Money of(String amount, String currency) {
        return new Money(new BigDecimal(amount), currency);
    }
}`,
  rubric: [
    'Compact constructor validates amount != null and currency not null/blank',
    'Compact constructor throws IllegalArgumentException for negative amount',
    'Compact constructor scales amount to 2dp with HALF_UP: amount = amount.setScale(2, RoundingMode.HALF_UP)',
    'add() throws IllegalArgumentException if currencies differ',
    'add() returns new Money(amount.add(other.amount()), currency)',
    'multiply() throws IllegalArgumentException if quantity < 0',
    'multiply() returns new Money(amount.multiply(BigDecimal.valueOf(quantity)), currency)',
    'isGreaterThan() throws IllegalArgumentException if currencies differ',
    'isGreaterThan() returns amount.compareTo(other.amount()) > 0',
  ],
  hints: [
    'Compact constructor: Objects.requireNonNull(amount, "amount"); if (currency == null || currency.isBlank()) throw new IllegalArgumentException("currency"); if (amount.compareTo(BigDecimal.ZERO) < 0) throw new IllegalArgumentException("negative"); amount = amount.setScale(2, RoundingMode.HALF_UP);',
    'add: if (!currency.equals(other.currency())) throw new IllegalArgumentException("Currency mismatch"); return new Money(amount.add(other.amount()), currency);',
    'multiply: if (quantity < 0) throw new IllegalArgumentException("negative quantity"); return new Money(amount.multiply(BigDecimal.valueOf(quantity)), currency);',
    'isGreaterThan: if (!currency.equals(other.currency())) throw new IllegalArgumentException("Currency mismatch"); return amount.compareTo(other.amount()) > 0;',
  ],
},
}
