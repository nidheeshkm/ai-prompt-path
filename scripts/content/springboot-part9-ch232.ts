// Part IX — Architect Thinking
// Chapter 232: System Design & Architecture Patterns

import type { QuizQuestion } from '../../src/data/curriculum'

export const courseId = 'springboot-ai-architect'

export const content: Record<string, string> = {

'232.1': `# System Design Fundamentals for Architects

Senior engineers write code. Architects make decisions that constrain code for years. The difference is not seniority — it is the habit of reasoning explicitly about trade-offs before committing to a design.

## CAP Theorem in Practice

CAP Theorem states that a distributed system can guarantee at most two of three properties simultaneously:

| Property | Meaning |
|----------|---------|
| **Consistency** | Every read receives the most recent write or an error |
| **Availability** | Every request receives a (non-error) response |
| **Partition Tolerance** | The system continues operating despite network partitions |

Because network partitions always happen in real distributed systems, the practical choice is **CP** (consistent but potentially unavailable during partitions) or **AP** (available but potentially returning stale data).

**CP systems:** Zookeeper, HBase, traditional RDBMS with synchronous replication
**AP systems:** Cassandra, CouchDB, DNS, most caches

### PACELC Extension

CAP only describes behaviour during partitions. PACELC adds the normal-operation dimension: even when the system is not partitioned (**E**lse), you choose between **L**atency and **C**onsistency.

- **PostgreSQL with synchronous replication**: PC/EC — consistent always, higher latency
- **Cassandra with ONE consistency level**: PA/EL — available and low latency, eventual consistency
- **Redis with async replication**: PA/EL — fast reads/writes, risk of loss during failover

## Architecture Decision Records

An ADR documents a single architectural decision: the context that drove it, the options considered, the choice made, and the consequences accepted.

\`\`\`markdown
# ADR-007: Use PostgreSQL for Order Service

## Status
Accepted

## Context
The order service needs ACID transactions across order lines, payments,
and inventory reservations. We evaluated three options:
- PostgreSQL (relational, ACID, pgvector for future AI features)
- MongoDB (document, flexible schema, weaker transactions)
- DynamoDB (key-value, AWS-native, single-digit ms latency)

## Decision
Use PostgreSQL 16 with Spring Data JPA.

## Consequences
- Positive: Full ACID, rich query capabilities, pgvector for AI features later
- Negative: Horizontal write scaling requires Citus or read replicas
- Accepted risk: If write throughput exceeds 10k TPS we revisit sharding
\`\`\`

ADRs live in the repository alongside the code they constrain. Tools like **ADR Tools** or Backstage manage them at scale.

## Distributed System Design Patterns

### Saga Pattern

Sagas coordinate long-running business transactions across services without distributed locks. Each step publishes an event; if a step fails, compensating transactions undo prior steps.

**Choreography-based saga** (event-driven):
\`\`\`
Order Placed → Inventory Reserved → Payment Charged → Order Confirmed
     ↓ (fail)         ↓ (fail)
Release Inventory  Cancel Order
\`\`\`

**Orchestration-based saga** (central coordinator):
\`\`\`
SagaOrchestrator → calls InventoryService → calls PaymentService → confirms
                ← rollback on failure
\`\`\`

Spring Modulith and Axon Framework both support saga orchestration. The trade-off: choreography is more decoupled but harder to trace; orchestration is easier to reason about but creates a central dependency.

### Outbox Pattern

The Outbox Pattern solves the dual-write problem: writing to your database and publishing an event atomically.

\`\`\`sql
-- In the same transaction as the business write:
INSERT INTO outbox_events (aggregate_id, event_type, payload, created_at)
VALUES ('order-123', 'OrderPlaced', '{"customerId":"c1"}', NOW());
\`\`\`

A separate **relay process** (Debezium CDC or a polling job) reads the outbox table and publishes to the message broker. If the relay fails, it retries from the last successful position — no lost events.

## Making Trade-off Decisions

The architect's job is not to find the right answer but to surface the correct trade-off for the team to accept consciously. Use this decision template:

1. **What problem are we solving?** (not the solution — the actual problem)
2. **What are the constraints?** (budget, team skill, timeline, SLA)
3. **What options exist?** (at least three)
4. **What do we give up with each option?**
5. **Which trade-offs can we accept, and why?**
6. **When do we revisit?** (trigger condition, not a date)

Architectural decisions made under time pressure without this structure tend to become permanent — the worst possible outcome.
`,

'232.2': `# Designing for Scale — Caching, Load Balancing & Data Partitioning

Scalability is not a feature you add; it is a property you design for. The cost of retrofitting a non-scalable design is almost always higher than designing for eventual scale from the start.

## Caching Strategies

Caching reduces load on expensive resources (databases, external APIs, computation). The challenge is cache invalidation — one of the famously hard problems in computer science.

### Cache-Aside (Lazy Loading)

The application manages the cache explicitly:

\`\`\`java
@Service
public class ProductService {
    private final ProductRepository repo;
    private final Cache<String, Product> cache;

    public Product findById(String id) {
        return cache.get(id, key -> repo.findById(key)
            .orElseThrow(() -> new NotFoundException(key)));
    }

    public void update(Product product) {
        repo.save(product);
        cache.invalidate(product.getId()); // evict stale entry
    }
}
\`\`\`

**Pros:** Only requested data is cached; cache failures degrade gracefully.
**Cons:** Cache miss on every first request (cold start); risk of stale data between write and invalidation.

### Write-Through Cache

Every write goes to cache and DB simultaneously. Guarantees cache is always warm but adds write latency.

### Write-Behind (Write-Back)

Writes go to cache first, DB asynchronously later. Very high write throughput; risk of data loss if cache fails before flush.

### Cache Eviction Policies

| Policy | Evicts | Best for |
|--------|--------|---------|
| LRU | Least Recently Used | General-purpose |
| LFU | Least Frequently Used | Hot-key workloads |
| TTL | Expired entries | Time-sensitive data |
| FIFO | Oldest entry | Simple, low overhead |

### Spring Cache Abstraction

\`\`\`java
@Configuration
@EnableCaching
public class CacheConfig {
    @Bean
    public CacheManager cacheManager(RedisConnectionFactory factory) {
        RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(10))
            .serializeValuesWith(
                RedisSerializationContext.SerializationPair
                    .fromSerializer(new GenericJackson2JsonRedisSerializer()));
        return RedisCacheManager.builder(factory)
            .cacheDefaults(config)
            .build();
    }
}

@Service
public class CatalogService {
    @Cacheable(value = "products", key = "#id", unless = "#result == null")
    public Product findById(String id) { ... }

    @CacheEvict(value = "products", key = "#product.id")
    public void update(Product product) { ... }

    @CacheEvict(value = "products", allEntries = true)
    public void invalidateAll() { ... }
}
\`\`\`

## Load Balancing

### Client-Side vs Server-Side

**Server-side load balancing** (Nginx, AWS ALB): A proxy distributes traffic. Clients see a single endpoint; the load balancer is a potential bottleneck and failure point.

**Client-side load balancing** (Spring Cloud LoadBalancer): Each service instance maintains a list of peers and selects one per request. More resilient, but adds complexity to each client.

### Load Balancing Algorithms

| Algorithm | Best for |
|-----------|---------|
| Round Robin | Homogeneous instances, uniform requests |
| Weighted Round Robin | Mixed instance sizes |
| Least Connections | Long-lived connections (WebSockets, gRPC) |
| Consistent Hashing | Session affinity, cache locality |
| Random with two choices (P2C) | Very large clusters |

## Data Partitioning (Sharding)

Sharding splits a dataset across multiple database nodes. Each shard holds a subset of data.

### Horizontal Partitioning Strategies

**Range partitioning:** Rows with IDs 1–1M on shard 1, 1M–2M on shard 2. Simple but creates hot spots if recent data is accessed most.

**Hash partitioning:** \`shard = hash(customerId) % numShards\`. Uniform distribution but makes range queries span all shards.

**Directory-based partitioning:** A lookup service maps entity IDs to shards. Maximum flexibility; the lookup service becomes a bottleneck and single point of failure.

### Consistent Hashing

Consistent hashing places both shards and keys on a virtual ring. When a shard is added or removed, only keys in the adjacent range are remapped — not the entire dataset. Used by Cassandra, DynamoDB, and Redis Cluster.

\`\`\`
Ring positions: S1(0°) S2(90°) S3(180°) S4(270°)
Key "user-123" hashes to 45° → assigned to S2 (next clockwise)
Adding S5 at 60° → only keys in 45°–90° range remapped from S2 to S5
\`\`\`

## Read Replicas & CQRS at the Database Level

For read-heavy workloads, direct writes to a primary and reads to read replicas:

\`\`\`yaml
spring:
  datasource:
    primary:
      url: jdbc:postgresql://primary:5432/orders
    replica:
      url: jdbc:postgresql://replica:5432/orders
      hikari:
        read-only: true
\`\`\`

Combine with database-level CQRS: maintain denormalized read-optimised views as materialised views or separate tables updated by triggers or events.

## Connection Pooling at Scale

Each Spring Boot instance opens a pool of connections. With 50 instances each holding 10 connections, you hit 500 connections — well above PostgreSQL's default \`max_connections\` of 100.

**Solution: PgBouncer** — a connection pooler that multiplexes many application connections onto few database connections in transaction-pooling mode. Reduces active connections to the DB by 10–100x with no application changes.
`,

'232.3': `# Microservices Patterns — API Gateway, Service Mesh & Event-Driven Design

Microservices solve the problem of independent deployability at scale. They create the problem of distributed systems complexity. Patterns in this topic address that complexity.

## API Gateway Pattern

An API Gateway is the single entry point for all clients. It handles cross-cutting concerns so individual services don't have to:

| Concern | Without Gateway | With Gateway |
|---------|----------------|-------------|
| Authentication | Every service implements JWT validation | Gateway validates; services trust headers |
| Rate limiting | Each service tracks limits independently | Centralised policy |
| Request routing | Clients must know service addresses | Clients know only the gateway |
| Request transformation | Services handle multiple API versions | Gateway adapts requests |
| Observability | Separate logs per service | Unified access logs and traces |

### Spring Cloud Gateway

\`\`\`yaml
spring:
  cloud:
    gateway:
      routes:
        - id: order-service
          uri: lb://order-service    # Spring Cloud LoadBalancer
          predicates:
            - Path=/api/v1/orders/**
          filters:
            - StripPrefix=2
            - name: CircuitBreaker
              args:
                name: orderService
                fallbackUri: forward:/fallback/orders
            - name: RequestRateLimiter
              args:
                redis-rate-limiter.replenishRate: 100
                redis-rate-limiter.burstCapacity: 200
                key-resolver: "#{@userKeyResolver}"
\`\`\`

### Backend for Frontend (BFF)

A BFF is an API Gateway specialised for a specific client type (mobile app, web app, partner API). Instead of one generic gateway, each client has a tailored facade that aggregates data in the shape the client needs, reducing over-fetching and round trips.

## Service Mesh

A service mesh moves network concerns (mTLS, retries, circuit breaking, tracing) out of application code into a sidecar proxy (Envoy/Istio) running beside each service pod.

\`\`\`yaml
# Istio VirtualService — traffic splitting for canary
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: product-service
spec:
  http:
    - match:
        - headers:
            x-canary:
              exact: "true"
      route:
        - destination:
            host: product-service
            subset: v2
    - route:
        - destination:
            host: product-service
            subset: v1
          weight: 90
        - destination:
            host: product-service
            subset: v2
          weight: 10
\`\`\`

**When to use a service mesh:** Large organisations with many services, strong security requirements (mTLS), and dedicated platform engineering teams. The operational overhead is real — Istio adds ~15ms latency per hop and significant configuration complexity.

## Event-Driven Architecture

### Event Types

**Domain events:** Something that happened in your domain. Immutable, past tense. (\`OrderPlaced\`, \`PaymentFailed\`, \`InventoryReserved\`)

**Integration events:** Domain events published to the message broker for other services. May differ in schema from internal domain events.

**Commands:** A request to do something. Not an event. (\`PlaceOrder\`, \`CancelOrder\`). Commands have one recipient; events have many.

### Message Broker Trade-offs

| Broker | Guarantees | Best for |
|--------|-----------|---------|
| RabbitMQ | At-least-once delivery, message ordering per queue | Task queues, RPC |
| Kafka | At-least-once, total ordering per partition, log retention | Event streaming, audit logs |
| AWS SNS+SQS | At-least-once, fan-out, dead-letter queues | AWS-native workloads |
| Redis Streams | At-least-once, consumer groups | Low-latency event processing |

### Spring Integration with Kafka

\`\`\`java
@Component
public class OrderEventPublisher {
    private final KafkaTemplate<String, Object> kafka;

    public void publish(OrderPlacedEvent event) {
        kafka.send("orders.placed", event.orderId(), event)
             .thenAccept(result -> log.info("Published to partition {}",
                 result.getRecordMetadata().partition()))
             .exceptionally(ex -> {
                 log.error("Failed to publish order event", ex);
                 return null;
             });
    }
}

@Component
public class InventoryEventListener {
    @KafkaListener(topics = "orders.placed", groupId = "inventory-service")
    public void onOrderPlaced(OrderPlacedEvent event) {
        inventoryService.reserve(event.productId(), event.quantity());
    }
}
\`\`\`

### Idempotency

At-least-once delivery means your consumer may receive duplicates. Design consumers to be idempotent:

\`\`\`java
@Transactional
public void reserve(String orderId, String productId, int quantity) {
    if (reservationRepo.existsByOrderId(orderId)) {
        log.info("Duplicate event for order {}, skipping", orderId);
        return;
    }
    // ... perform reservation
    reservationRepo.save(new Reservation(orderId, productId, quantity));
}
\`\`\`

## Dead Letter Queues and Error Handling

Events that fail processing after N retries go to a Dead Letter Queue (DLQ). A monitoring process alerts on DLQ depth. Operations can replay DLQ messages after fixing the root cause.

\`\`\`java
@KafkaListener(topics = "orders.placed.dlt")
public void onDeadLetter(OrderPlacedEvent event,
                         @Header(KafkaHeaders.DLT_EXCEPTION_MESSAGE) String error) {
    log.error("Dead letter: orderId={} error={}", event.orderId(), error);
    alerting.sendDLQAlert(event, error);
}
\`\`\`

## Strangler Fig Pattern

Migrating a monolith to microservices incrementally: route traffic through a facade; gradually extract functionality to new services; the monolith "strangles" down over time. This avoids the big-bang rewrite that almost always fails.

\`\`\`
Phase 1: All traffic → Monolith
Phase 2: /api/orders → OrderService; everything else → Monolith
Phase 3: /api/orders + /api/products → Microservices; auth → Monolith
Phase 4: Monolith retired
\`\`\`
`,

}

export const quiz: Record<string, QuizQuestion[]> = {

'232.1': [
  {
    question: 'A distributed database prioritises returning a response even when some nodes are unreachable, but that response might be stale. Which CAP combination does this represent?',
    options: ['CP — Consistent and Partition Tolerant', 'CA — Consistent and Available', 'AP — Available and Partition Tolerant', 'PA — Partition Avoidant'],
    correctIndex: 2,
    explanation: 'AP systems remain available during partitions but may return stale data. Cassandra with low consistency levels is a classic AP example.',
  },
  {
    question: 'Which problem does the Outbox Pattern solve?',
    options: [
      'Reducing database connection count with pooling',
      'Atomically writing to the database and publishing a message to the broker',
      'Routing API requests to the correct microservice',
      'Caching frequently accessed domain objects',
    ],
    correctIndex: 1,
    explanation: 'The Outbox Pattern stores events in the database (in the same transaction as the business write) and uses a relay process to publish them, ensuring atomicity without distributed transactions.',
  },
  {
    question: 'What is the primary purpose of an Architecture Decision Record (ADR)?',
    options: [
      'To document all the code changes in a release',
      'To capture the context, options, decision, and trade-offs accepted for a single architectural choice',
      'To replace the README with architectural diagrams',
      'To provide a deployment runbook for operations teams',
    ],
    correctIndex: 1,
    explanation: 'An ADR documents why a decision was made, not just what was decided. Capturing context and consequences lets future engineers understand and challenge the decision rather than working around it blindly.',
  },
  {
    question: 'In a choreography-based Saga, what triggers the next step in the transaction?',
    options: [
      'A central orchestrator calls the next service directly',
      'A two-phase commit coordinator signals readiness',
      'Each service publishes an event that the next service in the flow listens to',
      'A distributed lock is acquired before each step',
    ],
    correctIndex: 2,
    explanation: 'Choreography-based sagas are event-driven: each service completes its work, publishes an event, and the next service reacts to that event. There is no central coordinator.',
  },
  {
    question: 'According to the PACELC model, what does the "ELC" portion describe?',
    options: [
      'The trade-off between Elasticity, Latency, and Consistency during normal operation',
      'The trade-off between Latency and Consistency when there is no network partition',
      'The error-logging choices made during failover',
      'The trade-off between Eventual consistency, Linearisability, and Causality',
    ],
    correctIndex: 1,
    explanation: 'PACELC extends CAP: "Else" (when there is no partition), the system must still trade off Latency (lower) against Consistency (stronger). PostgreSQL with synchronous replication is PC/EC; Cassandra with ONE is PA/EL.',
  },
],

'232.3': [
  {
    question: 'What is the key difference between a Domain Event and a Command in event-driven architecture?',
    options: [
      'Commands are asynchronous; domain events are synchronous',
      'Domain events record something that happened and have many consumers; commands are requests to do something with a single recipient',
      'Commands are stored in the event store; domain events are discarded after processing',
      'Domain events carry the full entity state; commands carry only the delta',
    ],
    correctIndex: 1,
    explanation: 'Domain events are immutable facts (past tense) and may be consumed by many listeners. Commands are imperative requests directed at a single handler. Mixing them leads to brittle designs.',
  },
  {
    question: 'A Kafka consumer receives the same OrderPlaced event twice due to a broker retry. What design principle prevents this from corrupting state?',
    options: [
      'Exactly-once delivery guarantee at the broker level',
      'Idempotent consumer: checking whether the event has already been processed before acting',
      'Message TTL set to zero to discard duplicates automatically',
      'Using a saga orchestrator to deduplicate events',
    ],
    correctIndex: 1,
    explanation: 'At-least-once delivery is the practical default. Idempotent consumers check (e.g., by correlating the orderId in the database) whether a message was already processed and skip duplicates without error.',
  },
  {
    question: 'What is the Backend for Frontend (BFF) pattern?',
    options: [
      'A pattern where the database is co-located with the frontend server',
      'A dedicated API gateway variant tailored for a specific client type (mobile, web) that aggregates data in the shape the client needs',
      'A caching layer placed between the frontend and the main API gateway',
      'A pattern where frontend code is rendered server-side for performance',
    ],
    correctIndex: 1,
    explanation: 'BFF creates one gateway per client type. Each BFF aggregates exactly the data its client needs, reducing over-fetching and round trips without forcing a generic API to serve all clients.',
  },
  {
    question: 'Which message broker guarantees total ordering of messages per partition and retains messages for configurable periods?',
    options: ['RabbitMQ', 'Redis Streams', 'Apache Kafka', 'AWS SQS Standard Queue'],
    correctIndex: 2,
    explanation: 'Kafka guarantees ordering within a partition and retains messages on disk for a configurable retention period. This makes it suited for event sourcing, audit logs, and event replay scenarios.',
  },
  {
    question: 'The Strangler Fig pattern is used for what purpose?',
    options: [
      'Gradually migrating a monolith to microservices by routing traffic incrementally to new services',
      'Shutting down legacy services when they have no active connections',
      'Detecting and isolating failing microservices to prevent cascading failures',
      'Compressing old events in an event store after a snapshot is taken',
    ],
    correctIndex: 0,
    explanation: 'Strangler Fig routes traffic through a facade and incrementally extracts functionality to new services. The monolith shrinks over time without a risky big-bang rewrite.',
  },
],

}

export const codingTask: Record<string, { instructions: string; boilerplate: string; rubric: string[]; hints: string[] }> = {

'232.2': {
  instructions: `## Task: Implement a Cache-Aside Service with TTL and Eviction

You need to implement a \`ProductCatalogService\` that uses a local in-memory cache with Cache-Aside strategy and TTL expiry.

### Requirements

1. **\`findById(String id)\`** — look up the product in the cache first. On a cache miss, load from the repository, store in cache, and return. On a cache hit, return immediately.
2. **\`update(Product product)\`** — save to the repository AND evict the stale entry from the cache.
3. **\`findAll()\`** — always fetch from the repository (not cached).
4. **Cache entry expiry** — entries expire after 5 minutes. Expired entries must not be returned; they must be treated as cache misses and reloaded.
5. **Thread safety** — use \`ConcurrentHashMap\` for the cache store.

### Acceptance Criteria

- A \`findById\` call after \`update\` fetches fresh data from the repository (not stale cache).
- A \`findById\` call on an expired entry fetches from the repository and repopulates the cache.
- The \`CacheEntry\` inner class stores both the value and the expiry \`Instant\`.
- \`findById\` calls \`repo.findById\` exactly once per cache miss; zero times per cache hit.
`,
  boilerplate: `import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

public class ProductCatalogService {

    private static final Duration TTL = Duration.ofMinutes(5);

    private final ProductRepository repo;
    // TODO: declare a ConcurrentHashMap<String, CacheEntry> named 'cache'

    public ProductCatalogService(ProductRepository repo) {
        this.repo = repo;
        // TODO: initialise the cache
    }

    public Optional<Product> findById(String id) {
        // TODO: 1. Check cache for a non-expired entry; if found, return it
        // TODO: 2. On miss or expiry: load from repo, store in cache, return
        return Optional.empty();
    }

    public void update(Product product) {
        // TODO: save to repo then evict from cache
    }

    public List<Product> findAll() {
        // TODO: always fetch from repo (bypass cache)
        return List.of();
    }

    // TODO: Define an inner record or class CacheEntry that holds:
    //         - Product value
    //         - Instant expiresAt
    //       and a method boolean isExpired() that compares Instant.now() to expiresAt
}
`,
  rubric: [
    'CacheEntry inner type stores both a Product value and an Instant expiresAt',
    'CacheEntry.isExpired() compares Instant.now() with expiresAt',
    'findById checks cache first; returns cached value if present and not expired',
    'findById calls repo.findById and stores in cache on miss or expiry',
    'update calls repo.save then removes the entry from cache',
    'findAll delegates directly to repo.findAll without touching the cache',
    'Cache field is a ConcurrentHashMap for thread safety',
  ],
  hints: [
    'Use `Instant.now().plus(TTL)` to compute the expiry time when inserting.',
    'In findById, call `cache.get(id)`, then check `entry != null && !entry.isExpired()`.',
    'If the entry is expired, remove it with `cache.remove(id)` before fetching from repo.',
    'CacheEntry can be a `record` with `Product value` and `Instant expiresAt` fields.',
    'In update, call `cache.remove(product.getId())` after saving to the repo.',
  ],
},

}
