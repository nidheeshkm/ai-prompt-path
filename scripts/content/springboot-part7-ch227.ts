// Part VII — DDD, CQRS & Event Sourcing
// Chapter 227: Event Sourcing

import type { QuizQuestion } from '../../src/data/curriculum'

export const courseId = 'springboot-ai-architect'

export const content: Record<string, string> = {

'227.1': `# Event Sourcing Fundamentals — The Event Store

Event Sourcing flips the storage model: instead of storing the current state of an entity, you store the sequence of events that led to that state. The current state is derived by replaying events.

## Traditional State vs Event Sourcing

**Traditional (current state storage):**
\`\`\`
orders table:
| id  | status    | total  | updated_at          |
| 123 | CONFIRMED | 149.99 | 2024-01-15 14:30:00 |
\`\`\`

You know the current state. You don't know how it got there.

**Event Sourced:**
\`\`\`
order_events table:
| id | order_id | event_type     | payload                          | occurred_on         |
|  1 |      123 | OrderPlaced    | {total: 149.99, items: [...]}    | 2024-01-15 09:00:00 |
|  2 |      123 | CouponApplied  | {code: SAVE10, discount: 14.99}  | 2024-01-15 09:01:00 |
|  3 |      123 | OrderConfirmed | {}                               | 2024-01-15 14:30:00 |
\`\`\`

You know the complete history. Current state is derived by replaying events 1, 2, 3.

## Why Event Sourcing?

1. **Complete audit log** — every state change is recorded with who, what, and when
2. **Temporal queries** — "what did the order look like at 10am?" — replay up to event 2
3. **Event replay** — rebuild any read model from the event log
4. **Debugging** — reproduce any bug by replaying the exact sequence of events
5. **Business intelligence** — rich historical data for analytics

## The Event Store

An Event Store is an append-only log of domain events, partitioned by aggregate ID:

\`\`\`java
@Entity
@Table(name = "domain_events")
public class StoredEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long sequenceNumber; // global ordering

    @Column(nullable = false)
    private String aggregateId;

    @Column(nullable = false)
    private String aggregateType;

    @Column(nullable = false)
    private Long aggregateVersion; // version within this aggregate's stream

    @Column(nullable = false)
    private String eventType;      // "OrderPlaced", "OrderConfirmed"

    @Column(columnDefinition = "TEXT", nullable = false)
    private String payload;        // JSON-serialized event

    @Column(nullable = false)
    private Instant occurredOn;

    @Column
    private String correlationId;  // trace request across services

    @Column
    private String causationId;    // ID of the event that caused this one
}
\`\`\`

## Optimistic Concurrency with Versions

Each event stream has a version number. Concurrent writers must specify the expected version:

\`\`\`java
@Repository
@RequiredArgsConstructor
public class EventStoreRepository {

    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    public void append(String aggregateId, String aggregateType,
                       long expectedVersion, List<DomainEvent> events) {
        // Verify no concurrent modification
        long currentVersion = jdbc.queryForObject(
            "SELECT COALESCE(MAX(aggregate_version), -1) FROM domain_events WHERE aggregate_id = ?",
            Long.class, aggregateId);

        if (currentVersion != expectedVersion) {
            throw new OptimisticConcurrencyException(
                "Aggregate " + aggregateId + " was modified concurrently. " +
                "Expected version " + expectedVersion + " but found " + currentVersion);
        }

        // Append new events
        long nextVersion = expectedVersion + 1;
        for (DomainEvent event : events) {
            jdbc.update("""
                INSERT INTO domain_events
                    (aggregate_id, aggregate_type, aggregate_version, event_type, payload, occurred_on)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                aggregateId, aggregateType, nextVersion++,
                event.getClass().getSimpleName(),
                serialize(event),
                Instant.now()
            );
        }
    }

    public List<StoredEvent> load(String aggregateId) {
        return jdbc.query(
            "SELECT * FROM domain_events WHERE aggregate_id = ? ORDER BY aggregate_version ASC",
            this::mapRow, aggregateId);
    }
}
\`\`\`

## Event-Sourced Aggregate

An event-sourced aggregate reconstructs itself by applying events:

\`\`\`java
public class Order {

    private OrderId id;
    private OrderStatus status;
    private List<OrderItem> items = new ArrayList<>();
    private Money totalAmount;
    private long version = -1; // -1 means "new, no events yet"

    private final List<DomainEvent> uncommittedEvents = new ArrayList<>();

    // Reconstitute from stored events
    public static Order reconstitute(List<DomainEvent> history) {
        Order order = new Order();
        history.forEach(order::apply);
        return order;
    }

    // Business operation: generates event, does NOT directly set fields
    public void confirm() {
        if (status != OrderStatus.PENDING) throw new IllegalStateException("...");
        apply(new OrderConfirmed(id, Instant.now()));
    }

    // Apply event: actually modifies state, called both during reconstitution and new operations
    private void apply(DomainEvent event) {
        switch (event) {
            case OrderPlaced e -> {
                this.id = e.orderId();
                this.status = OrderStatus.PENDING;
                this.items = new ArrayList<>(e.items());
                this.totalAmount = e.totalAmount();
            }
            case OrderConfirmed e -> this.status = OrderStatus.CONFIRMED;
            case OrderCancelled e -> this.status = OrderStatus.CANCELLED;
            default -> throw new IllegalArgumentException("Unknown event: " + event.getClass());
        }
        this.version++;
        if (this.id != null) uncommittedEvents.add(event);
    }

    public List<DomainEvent> pullUncommittedEvents() {
        List<DomainEvent> events = List.copyOf(uncommittedEvents);
        uncommittedEvents.clear();
        return events;
    }
}
\`\`\``,

'227.2': `# Snapshots & Event Stream Management

As an aggregate accumulates events, reconstitution by replaying all events from the beginning becomes slow. An aggregate with 10,000 events takes 10,000 apply() calls to reconstruct. Snapshots solve this.

## Snapshot Pattern

A snapshot is a point-in-time capture of the aggregate's full state. Instead of replaying from event 1, replay from the latest snapshot and only apply events since the snapshot:

\`\`\`
Snapshot at version 500 → apply events 501, 502, 503 → current state (version 503)
vs
Apply events 1, 2, 3, ..., 503 → current state (version 503)
\`\`\`

## Snapshot Table

\`\`\`java
@Entity
@Table(name = "aggregate_snapshots")
public class AggregateSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String aggregateId;

    @Column(nullable = false)
    private String aggregateType;

    @Column(nullable = false)
    private Long snapshotVersion; // the version when snapshot was taken

    @Column(columnDefinition = "TEXT", nullable = false)
    private String state;         // JSON-serialized aggregate state

    @Column(nullable = false)
    private Instant takenAt;
}
\`\`\`

## Loading with Snapshot Support

\`\`\`java
@Service
@RequiredArgsConstructor
public class OrderRepository {

    private final EventStoreRepository eventStore;
    private final SnapshotRepository snapshotRepo;
    private static final int SNAPSHOT_THRESHOLD = 50; // snapshot every 50 events

    public Order load(OrderId orderId) {
        String id = orderId.value().toString();

        // 1. Find the latest snapshot (if any)
        Optional<AggregateSnapshot> snapshot = snapshotRepo.findLatestByAggregateId(id);

        long fromVersion = snapshot.map(s -> s.getSnapshotVersion() + 1).orElse(0L);

        // 2. Load only events since the snapshot
        List<DomainEvent> events = eventStore.loadFromVersion(id, fromVersion);

        // 3. Reconstitute: start from snapshot state (or empty) + apply remaining events
        Order order = snapshot.map(s -> deserializeOrder(s.getState()))
                              .orElse(new Order());
        events.forEach(order::applyForReconstitution);

        return order;
    }

    public void save(Order order) {
        List<DomainEvent> newEvents = order.pullUncommittedEvents();
        if (newEvents.isEmpty()) return;

        eventStore.append(
            order.getId().value().toString(),
            "Order",
            order.getVersion() - newEvents.size(),
            newEvents
        );

        // Take snapshot if threshold crossed
        if (order.getVersion() % SNAPSHOT_THRESHOLD == 0) {
            snapshotRepo.save(new AggregateSnapshot(
                order.getId().value().toString(),
                "Order",
                order.getVersion(),
                serializeOrder(order),
                Instant.now()
            ));
        }
    }
}
\`\`\`

## Event Schema Evolution

Events are immutable once written — you cannot change them. As business requirements evolve, events must evolve carefully:

### Strategy 1 — Upcasting (Recommended)

Add a transformation layer that converts old event formats to the current format:

\`\`\`java
@Component
public class OrderEventUpcaster {

    // OrderPlacedV1 didn't have shippingAddress
    // OrderPlacedV2 adds shippingAddress (with a default for old events)
    public DomainEvent upcast(StoredEvent stored) {
        if (stored.getEventType().equals("OrderPlaced") &&
            stored.getSchemaVersion() == 1) {
            OrderPlacedV1 v1 = deserialize(stored, OrderPlacedV1.class);
            return new OrderPlaced(  // current version
                v1.orderId(),
                v1.customerId(),
                v1.items(),
                v1.totalAmount(),
                ShippingAddress.UNKNOWN  // default for old events
            );
        }
        return deserialize(stored);
    }
}
\`\`\`

### Strategy 2 — Versioned Event Types

Use versioned event class names: \`OrderPlacedV1\`, \`OrderPlacedV2\`. The aggregate's apply() method handles all versions.

### What Never Changes

Once an event is stored, its payload must be interpretable forever. This means:
- Never rename fields in an event record (break old stored JSON)
- Never remove fields without providing defaults
- Never change the meaning of a field (create a new field instead)

## Temporal Queries

Replay events up to a specific time to answer "what was the state at time T?":

\`\`\`java
public Order loadAtTime(OrderId orderId, Instant pointInTime) {
    List<DomainEvent> events = eventStore.loadUpToTime(
        orderId.value().toString(), pointInTime);
    return Order.reconstitute(events);
}

// Usage: audit query
public OrderDetail getOrderHistorySnapshot(OrderId orderId, LocalDateTime at) {
    Order historicalOrder = repository.loadAtTime(orderId, at.toInstant(ZoneOffset.UTC));
    return toOrderDetail(historicalOrder);
}
\`\`\``,

'227.3': `# Event Replay, Projections & Event Sourcing Trade-offs

Event Sourcing's power lies in the ability to derive any current or historical view by replaying the event log. This section covers projection building, operational considerations, and when not to use Event Sourcing.

## Building Projections from the Event Stream

A projection is any view built by consuming the event stream:

\`\`\`java
@Component
@RequiredArgsConstructor
public class OrdersByStatusProjection {

    private final OrdersByStatusRepository repo;
    private final EventStoreRepository eventStore;

    // Called on startup or on-demand to build/rebuild the projection
    public void build() {
        repo.deleteAll();

        // Stream all events for all orders
        eventStore.streamAll("Order").forEach(storedEvent -> {
            DomainEvent event = deserialize(storedEvent);
            handleEvent(storedEvent.getAggregateId(), event);
        });
    }

    // Called in real-time for new events
    @EventListener
    public void on(OrderPlaced event) {
        repo.upsert(event.orderId().toString(), "PENDING", event.occurredOn());
    }

    @EventListener
    public void on(OrderConfirmed event) {
        repo.updateStatus(event.orderId().toString(), "CONFIRMED");
    }

    @EventListener
    public void on(OrderCancelled event) {
        repo.updateStatus(event.orderId().toString(), "CANCELLED");
    }

    private void handleEvent(String aggregateId, DomainEvent event) {
        switch (event) {
            case OrderPlaced e   -> on(e);
            case OrderConfirmed e -> on(e);
            case OrderCancelled e -> on(e);
            default -> {} // ignore events this projection doesn't care about
        }
    }
}
\`\`\`

## Catchup Subscriptions

Real-time projections must handle events that arrived while the subscriber was down. A catchup subscription replays missed events from a stored position:

\`\`\`java
@Component
@RequiredArgsConstructor
public class ProjectionSubscription {

    private final EventStoreRepository eventStore;
    private final CheckpointRepository checkpoints;
    private final OrdersByStatusProjection projection;

    @Scheduled(fixedDelay = 1000)  // poll every second for new events
    public void processNewEvents() {
        long lastProcessedSequence = checkpoints.get("OrdersByStatusProjection");

        List<StoredEvent> newEvents = eventStore.loadFromSequence(lastProcessedSequence + 1, 100);

        for (StoredEvent stored : newEvents) {
            projection.handleEvent(stored.getAggregateId(), deserialize(stored));
            checkpoints.update("OrdersByStatusProjection", stored.getSequenceNumber());
        }
    }
}
\`\`\`

The checkpoint persists the last processed sequence number. If the service restarts, it resumes from where it left off — no events are lost, no events are double-processed (with idempotent handlers).

## Event Sourcing Trade-offs

### Advantages

| Advantage | Description |
|---|---|
| Complete audit log | Every state change is recorded |
| Temporal queries | Query state at any point in time |
| Event replay | Rebuild any projection from history |
| Debugging | Reproduce exact state that caused a bug |
| Decoupled projections | Add new read models without changing write side |

### Disadvantages

| Disadvantage | Mitigation |
|---|---|
| Complexity | Only use when audit log or temporal queries are required |
| Event schema evolution | Careful versioning, upcasters |
| Eventual consistency | Design UI for it; use pessimistic locking for critical reads |
| Storage growth | Event compaction policies, cold archiving |
| Query complexity | Dedicated read models (CQRS) |

## When to Use Event Sourcing

**Use Event Sourcing when:**
- Audit log is a regulatory requirement (financial, healthcare, legal)
- You need temporal queries ("what was the account balance at the time of this transaction?")
- Multiple read models need to be derived from the same state changes
- Event-driven microservices architecture where events are the integration mechanism

**Don't use Event Sourcing for:**
- Simple CRUD with no history requirements
- When the team is unfamiliar with the pattern (high learning curve)
- Small aggregates that change rarely
- When a simple activity log table is sufficient for audit needs

## Event Sourcing + CQRS = Natural Pair

Event Sourcing naturally produces an event stream. CQRS naturally consumes event streams to build read models. They fit together:

\`\`\`
Write: Command → CommandHandler → EventSourcedAggregate → Events → EventStore
Read:  EventStore → ProjectionBuilder → ReadModel → QueryHandler → UI
\`\`\`

The event store is the integration point. Write side writes events; read side consumes events. No shared database queries; no direct coupling between read and write sides.`,
}

export const quiz: Record<string, QuizQuestion[]> = {

'227.1': [
  {
    question: 'What is the fundamental difference between Event Sourcing and traditional state storage?',
    options: [
      'Event Sourcing stores events in Kafka; traditional storage uses a relational database',
      'Traditional storage stores the current state (last write wins); Event Sourcing stores the sequence of events that led to the current state — current state is derived by replaying the event log',
      'Event Sourcing is always more performant because it avoids UPDATE statements',
      'Traditional storage is for microservices; Event Sourcing is for monolithic applications',
    ],
    correctIndex: 1,
    explanation: 'In a traditional system, each update overwrites the previous state — you only know where you are now, not how you got there. With Event Sourcing, every OrderPlaced, CouponApplied, OrderConfirmed event is stored. The order\'s current state is the result of replaying all these events in order. This means you have complete history, can replay to any point in time, and can build any projection from the same event data.',
  },
  {
    question: 'What is optimistic concurrency in an event store and how does it prevent data corruption?',
    options: [
      'Optimistic concurrency allows multiple writes to the same aggregate simultaneously, merging conflicts automatically',
      'The writer specifies the expected current version of the aggregate\'s event stream; if another writer has appended events since the writer loaded the aggregate, the version won\'t match and the write fails — preventing lost updates',
      'Optimistic concurrency uses database row locks to serialize writes to the same aggregate',
      'Optimistic concurrency caches the aggregate in memory to avoid re-loading for each write',
    ],
    correctIndex: 1,
    explanation: 'Without concurrency control, two concurrent writers could both load version 5 of an order, generate events based on the same state, and both append at version 6 — creating two divergent version 6 events. Optimistic concurrency says "only append if current version is still 5." The second writer gets a concurrency exception, must reload the aggregate (now at version 6), and re-apply its changes on top of the new state.',
  },
  {
    question: 'Why does an event-sourced aggregate have an "apply" method that is called both when raising new events and when reconstituting from history?',
    options: [
      'Having one apply method reduces code duplication between save and load paths',
      'The apply method is the single source of truth for how an event changes aggregate state — using it for both new events and replay ensures reconstitution produces exactly the same state as if the events had happened live',
      'Java requires a single method to handle both cases for serialization compatibility',
      'The apply method notifies event listeners before and after state changes',
    ],
    correctIndex: 1,
    explanation: 'If you had separate logic for "apply event during reconstitution" and "apply event when raising," they could diverge — a bug fix in one path doesn\'t apply to the other. One apply method guarantees: replaying events 1-5 always produces the same state as having processed events 1-5 live. This is the foundation of Event Sourcing correctness — replay must be deterministic and identical to live processing.',
  },
  {
    question: 'What information does the correlationId and causationId in a stored event capture?',
    options: [
      'correlationId tracks the database transaction ID; causationId tracks the aggregate version',
      'correlationId traces a request across all services in a distributed system (same value for all events from one user request); causationId identifies which event caused this event to be raised (enabling causal chains)',
      'correlationId links events to their originating command; causationId links events to their resulting read model updates',
      'Both are encryption keys used to sign and verify event integrity',
    ],
    correctIndex: 1,
    explanation: 'In a distributed system, one HTTP request might cause events in multiple services. correlationId (also called trace ID in distributed tracing) links them all. causationId enables causality tracking: OrderPlaced caused ShipmentRequested caused TrackingNumberAssigned — you can trace the exact chain of causality across services and time. This is invaluable for debugging complex distributed workflows.',
  },
  {
    question: 'Why must the event store be append-only — why can\'t you update or delete events?',
    options: [
      'Append-only is required for Kafka compatibility in event-driven architectures',
      'Events represent facts that already happened — modifying or deleting them would falsify history, break all existing projections built from those events, and destroy the audit trail. Corrections are made by appending compensating events',
      'Append-only is a performance optimization; UPDATE statements on event records are too slow',
      'Spring JPA does not support deletion from event store tables',
    ],
    correctIndex: 1,
    explanation: 'If you delete OrderPlaced and replace it with a corrected version, all projections built from the original event now have wrong data — and you\'ve lost the record of the mistake. If a customer was incorrectly charged twice, you don\'t delete the first charge event; you append a RefundIssued event. The audit log shows: charged, error discovered, refunded. Immutability is what makes Event Sourcing trustworthy for audit purposes.',
  },
],

'227.2': [
  {
    question: 'What problem do snapshots solve in Event Sourcing and how do they work?',
    options: [
      'Snapshots solve the problem of event schema evolution by storing pre-processed state',
      'As an aggregate accumulates thousands of events, replaying all of them becomes slow. A snapshot captures the full aggregate state at a version; subsequent loads start from the snapshot and only replay events since that version',
      'Snapshots enable concurrent writes by providing a consistent base state for conflict resolution',
      'Snapshots eliminate the need for read models by providing a queryable cache of aggregate state',
    ],
    correctIndex: 1,
    explanation: 'A bank account with 10 years of transaction history might have 100,000 events. Without snapshots, every load replays all 100,000 events. With a snapshot taken every 500 events, loading is: deserialize the snapshot (instant) + replay at most 499 events. The snapshot is a performance optimization — correctness doesn\'t depend on it. If the snapshot is corrupted, it can be rebuilt by replaying from event 1.',
  },
  {
    question: 'What is the recommended strategy for evolving event schemas and why?',
    options: [
      'Rename event classes with version suffixes (OrderPlacedV2) and handle all versions in apply()',
      'Use upcasters — transformation functions that convert old event payloads to the current format during loading, keeping the aggregate\'s apply() method dealing only with the current event version',
      'Delete old events and replace them with new-format events when the schema changes',
      'Add all new fields as nullable to existing events and use Optional<> for backward compatibility',
    ],
    correctIndex: 1,
    explanation: 'Upcasters run during deserialization: old JSON → upcaster transforms it → current event class. The aggregate never sees the old format. This keeps apply() clean (handles only current versions) while preserving backward compatibility with stored history. The alternative — versioned class names (OrderPlacedV1, V2, V3) — clutters the aggregate with handling for all historical versions. Upcasters isolate the compatibility code.',
  },
  {
    question: 'Why must field names and semantics in event payloads never change after being stored?',
    options: [
      'Event JSON is compressed; renaming fields changes the compression ratio',
      'Stored events contain the original field names in JSON. Renaming a field breaks deserialization of all existing events. Event payloads must be interpretable forever — use additive changes (new fields with defaults) and upcasters for incompatible changes',
      'Spring\'s @EventListener uses field names to route events to the correct handler',
      'Event field names are used as database column names in the event store',
    ],
    correctIndex: 1,
    explanation: 'An event stored in 2020 must be deserializable in 2030. If OrderPlaced had field "itemList" and you rename it to "items," all pre-rename events have "itemList" in their JSON — they\'ll fail to deserialize. The rule: never rename, never change meaning, never remove. New fields can be added (old events won\'t have them; handle with defaults). Breaking changes require upcasters that transform old JSON before deserialization.',
  },
  {
    question: 'What is a temporal query in Event Sourcing and what makes it possible?',
    options: [
      'A query that runs periodically on a schedule, using the event log as its data source',
      'A query for the state of an aggregate at a specific point in the past — possible because the event log is immutable and ordered, allowing replay to stop at the target timestamp to reconstruct historical state',
      'A query that aggregates events over time windows (hourly totals, daily summaries)',
      'A query that sorts events by their occurrence time for chronological display',
    ],
    correctIndex: 1,
    explanation: '"What was the customer\'s account balance on January 15th?" is a temporal query. With traditional storage, the answer might be gone — the balance was overwritten. With Event Sourcing: load all events for the account → stop replaying at midnight January 15th → the derived state IS the balance at that point. This makes Event Sourcing invaluable for financial systems, legal records, and anywhere historical state has regulatory significance.',
  },
  {
    question: 'When should you take a snapshot of an event-sourced aggregate?',
    options: [
      'After every event — to ensure the latest state is always immediately available',
      'After a configurable threshold of events (e.g., every 50 or 500 events) or when the aggregate version crosses a multiple of the threshold — balancing snapshot overhead against replay cost',
      'Only when the aggregate is first created',
      'Snapshots should be taken manually by administrators, never automatically',
    ],
    correctIndex: 1,
    explanation: 'Taking a snapshot after every event adds write overhead (two writes per event) with little benefit (you only ever replay 0 events). Taking snapshots too rarely means long replays. The threshold (50–500 events depending on event size and replay cost) is a tuning parameter. Checking version % threshold == 0 after each save is simple and effective. High-traffic aggregates (bank accounts, shopping carts) need more frequent snapshots than rarely-changing aggregates.',
  },
],

'227.3': [
  {
    question: 'What is a "catchup subscription" in Event Sourcing and why is it needed?',
    options: [
      'A subscription that retries failed event deliveries until they succeed',
      'A mechanism for a projection to process events that arrived while it was offline — it reads from a persisted checkpoint (last processed event sequence number) and replays all missed events before switching to real-time processing',
      'A Kafka consumer group that catches up to the latest offset after a partition rebalance',
      'A Spring @Scheduled job that periodically re-processes events to correct projection drift',
    ],
    correctIndex: 1,
    explanation: 'A real-time @EventListener misses events while the service is restarted. A catchup subscription persists a checkpoint (last processed sequence number), and on startup processes all events from checkpoint+1 before connecting to the real-time stream. This guarantees exactly-once processing (with idempotent handlers) regardless of restarts. Every production Event Sourcing system needs this — real-time listeners alone are insufficient.',
  },
  {
    question: 'What is a projection in Event Sourcing and how does it differ from an event handler?',
    options: [
      'Projections are mathematical operations that reduce event payloads to smaller representations',
      'A projection builds and maintains a specialized read model by consuming the event stream — it is a persistent, queryable view derived from events. An event handler triggers side effects (send email, call API) but doesn\'t maintain a queryable state',
      'Projections use CQRS; event handlers use traditional CRUD patterns',
      'Projections are synchronous; event handlers are always asynchronous',
    ],
    correctIndex: 1,
    explanation: 'An event handler for OrderPlaced might send a confirmation email — a one-time side effect. A projection for OrdersByStatus maintains a table that can be queried anytime for the current status distribution. Projections are read models: they process every relevant event to keep their state current and can be rebuilt at any time by replaying the event log. The distinction matters for design: projections must be idempotent; side-effect handlers must be carefully guarded against replays.',
  },
  {
    question: 'Why is Event Sourcing described as a "natural pair" with CQRS?',
    options: [
      'Both patterns were invented by the same person (Greg Young) and are usually taught together',
      'Event Sourcing naturally produces an event stream that CQRS projects consume to build read models — writes go to the event store, reads come from event-derived projections, with the event stream as the decoupled integration point between the two sides',
      'CQRS requires an append-only event store, which Event Sourcing provides',
      'Both patterns optimize for the same workload: high write throughput with eventual read consistency',
    ],
    correctIndex: 1,
    explanation: 'CQRS needs read models, and read models need to be kept current as state changes. Event Sourcing provides a stream of exactly what changed and when. The event store is the perfect integration point: write side commits events, read side consumes events to update projections. No polling, no shared domain queries, no tight coupling. CQRS without Event Sourcing requires triggers or polling; Event Sourcing without CQRS means querying the event store directly for reads (possible but awkward).',
  },
  {
    question: 'What is the most significant operational disadvantage of Event Sourcing?',
    options: [
      'Event Sourcing requires a specialized database that most cloud providers don\'t offer',
      'Complexity — the pattern has a steep learning curve, event schema evolution requires careful discipline, eventual consistency must be designed for throughout the system, and the event store grows indefinitely without archival policies',
      'Event Sourcing cannot be used with Spring Data JPA, requiring a complete technology stack change',
      'Snapshots cause data corruption when taken at incorrect intervals',
    ],
    correctIndex: 1,
    explanation: 'Event Sourcing is not a free lunch. Teams unfamiliar with the pattern make mistakes: mutating events, coupling projections to the write side, ignoring schema evolution. Every developer must understand the model deeply. The event store grows without bound — you need archival policies. Debugging is harder initially (though ultimately richer). Apply Event Sourcing selectively where the audit trail, temporal queries, or multi-projection benefits justify the complexity investment.',
  },
  {
    question: 'How should a projection handle an event during a rebuild (replay) that it has already processed in real-time?',
    options: [
      'Skip events with sequence numbers below the stored checkpoint to avoid double-processing',
      'Use idempotent projection logic — applying the same event twice produces the same result as applying it once. Upsert (insert-or-update) patterns in projection handlers prevent duplicate data from double-processing',
      'Clear the projection before every replay to ensure clean state',
      'Projections should be rebuilt from a backup, not by replaying, to avoid double-processing',
    ],
    correctIndex: 1,
    explanation: 'During a rebuild, events may be processed that were already applied by the real-time listener. Idempotent handlers handle this safely: an upsert for OrderPlaced (insert if not exists, update if exists) can be called 10 times and produces the same result as calling it once. This is safer than tracking "have I seen this event?" — it doesn\'t require state, works after crashes, and simplifies the projection implementation.',
  },
],
}

export const codingTask: Record<string, {
  instructions: string; boilerplate: string; rubric: string[]; hints: string[]
}> = {

'227.1': {
  instructions: `Implement a simple \`InMemoryEventStore\` that stores domain events by aggregate ID.

Requirements:

1. Define a \`StoredEvent\` record with fields: \`aggregateId\` (String), \`eventType\` (String), \`payload\` (String), \`version\` (long), \`occurredOn\` (Instant).

2. Implement \`InMemoryEventStore\` as a \`@Component\` with a \`Map<String, List<StoredEvent>>\` to store events by aggregateId.

3. Implement \`void append(String aggregateId, long expectedVersion, String eventType, String payload)\`:
   - Get the current list for this aggregateId (default to empty list if absent)
   - Compute current version = list.size() - 1 (so empty list = version -1)
   - If \`currentVersion != expectedVersion\`, throw \`IllegalStateException("Optimistic concurrency conflict for " + aggregateId)\`
   - Create and add a \`StoredEvent\` with the aggregateId, eventType, payload, version = expectedVersion + 1, and \`Instant.now()\`

4. Implement \`List<StoredEvent> load(String aggregateId)\`:
   - Return the list for this aggregateId, or an empty list if none exists
   - Return an unmodifiable view (use \`List.copyOf()\`)`,
  boilerplate: `package com.example.eventsourcing;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.*;

// TODO: Define StoredEvent record
// Fields: aggregateId (String), eventType (String), payload (String), version (long), occurredOn (Instant)

@Component
public class InMemoryEventStore {

    private final Map<String, List<StoredEvent>> store = new HashMap<>();

    public void append(String aggregateId, long expectedVersion, String eventType, String payload) {
        // TODO: load current events for aggregateId
        // TODO: compute currentVersion = events.size() - 1
        // TODO: check expectedVersion == currentVersion, throw if not
        // TODO: create and add StoredEvent with version = expectedVersion + 1
    }

    public List<StoredEvent> load(String aggregateId) {
        // TODO: return copy of stored events or empty list
        return List.of();
    }
}`,
  rubric: [
    'StoredEvent is a record with aggregateId, eventType, payload, version (long), occurredOn (Instant)',
    'store is Map<String, List<StoredEvent>> initialized as new HashMap<>()',
    'append() retrieves list with store.computeIfAbsent(aggregateId, k -> new ArrayList<>())',
    'currentVersion computed as events.size() - 1',
    'Throws IllegalStateException("Optimistic concurrency conflict for " + aggregateId) when versions mismatch',
    'StoredEvent created with correct version = expectedVersion + 1 and Instant.now()',
    'StoredEvent added to the list',
    'load() returns List.copyOf(store.getOrDefault(aggregateId, List.of()))',
  ],
  hints: [
    'public record StoredEvent(String aggregateId, String eventType, String payload, long version, Instant occurredOn) {}',
    'List<StoredEvent> events = store.computeIfAbsent(aggregateId, k -> new ArrayList<>());',
    'long currentVersion = events.size() - 1;',
    'if (currentVersion != expectedVersion) throw new IllegalStateException("Optimistic concurrency conflict for " + aggregateId);',
    'events.add(new StoredEvent(aggregateId, eventType, payload, expectedVersion + 1, Instant.now()));',
    'return List.copyOf(store.getOrDefault(aggregateId, List.of()));',
  ],
},
}
