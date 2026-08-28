// Part X — Capstone Project
// Chapter 236: Data Layer & Event Streaming

import type { QuizQuestion } from '../../src/data/curriculum'

export const courseId = 'springboot-ai-architect'

export const content: Record<string, string> = {

'236.1': `# RAG Knowledge Base with Per-Tenant Vector Store

Chapter 222 introduced RAG. In the capstone, RAG operates under an additional constraint: every retrieval must be scoped to the querying tenant's documents. A single pgVector table serves all tenants; metadata filters enforce isolation.

## pgVector Setup for Multi-Tenancy

\`\`\`sql
-- V3__vector_store.sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE vector_store (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content     TEXT NOT NULL,
    metadata    JSONB NOT NULL DEFAULT '{}',
    embedding   vector(1536),   -- text-embedding-3-small dimensions
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- HNSW index for fast approximate nearest-neighbour search
CREATE INDEX ON vector_store USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- GIN index on metadata for fast filter evaluation
CREATE INDEX ON vector_store USING gin (metadata);

-- RLS: tenants can only read their own chunks
ALTER TABLE vector_store ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON vector_store
    USING ((metadata->>'tenant_id')::TEXT = current_setting('app.tenant_id'));
\`\`\`

RLS on \`vector_store\` provides defence-in-depth: even if the Spring AI filter expression is omitted by mistake, the database policy blocks cross-tenant retrieval.

## Spring AI PgVector Configuration

\`\`\`yaml
spring:
  ai:
    vectorstore:
      pgvector:
        index-type: HNSW
        distance-type: COSINE_DISTANCE
        dimensions: 1536
        schema-name: public
        table-name: vector_store
        initialize-schema: false  # Flyway manages schema
    openai:
      embedding:
        options:
          model: text-embedding-3-small
\`\`\`

\`\`\`java
@Configuration
public class VectorStoreConfig {

    @Bean
    public EmbeddingModel embeddingModel(OpenAiApi openAiApi) {
        return new OpenAiEmbeddingModel(openAiApi,
            MetadataMode.EMBED,
            OpenAiEmbeddingOptions.builder()
                .withModel("text-embedding-3-small")
                .build());
    }

    @Bean
    public VectorStore vectorStore(JdbcTemplate jdbc, EmbeddingModel embedding) {
        return new PgVectorStore(jdbc, embedding,
            PgVectorStore.PgDistanceType.COSINE_DISTANCE,
            false,  // do not remove existing data on start
            PgIndexType.HNSW);
    }
}
\`\`\`

## Document Upload API

\`\`\`java
@RestController
@RequestMapping("/api/v1/documents")
public class DocumentController {

    private final DocumentIngestionService ingestionService;
    private final DocumentRepository documentRepo;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DocumentUploadResponse> upload(
            @RequestParam("file") MultipartFile file) {

        String tenantId = TenantContext.tenantId();

        // Validate file type
        if (!file.getOriginalFilename().endsWith(".pdf")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Only PDF files are supported");
        }

        // Record in DB first (status = PROCESSING)
        Document doc = documentRepo.save(new Document(
            tenantId, file.getOriginalFilename(), "processing"));

        // Ingest asynchronously
        ingestionService.ingestAsync(tenantId, doc.getId(),
                                     file.getResource());

        return ResponseEntity.accepted()
            .body(new DocumentUploadResponse(doc.getId(), "processing"));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        String tenantId = TenantContext.tenantId();
        Document doc = documentRepo.findByIdAndTenantId(id, tenantId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        ingestionService.delete(tenantId, id);
        documentRepo.delete(doc);
    }
}
\`\`\`

## Async Ingestion with Spring Events

Heavy PDF parsing and embedding generation should not block the HTTP thread:

\`\`\`java
@Service
public class DocumentIngestionService {

    private final VectorStore vectorStore;
    private final DocumentRepository documentRepo;
    private final ApplicationEventPublisher events;

    @Async("ingestionExecutor")
    public void ingestAsync(String tenantId, String documentId, Resource resource) {
        try {
            int chunks = ingest(tenantId, documentId, resource);
            documentRepo.updateStatus(documentId, "ready");
            events.publishEvent(new DocumentReadyEvent(tenantId, documentId, chunks));
        } catch (Exception e) {
            documentRepo.updateStatus(documentId, "failed");
            log.error("Ingestion failed for document {}", documentId, e);
        }
    }

    @Bean
    public Executor ingestionExecutor() {
        ThreadPoolTaskExecutor exec = new ThreadPoolTaskExecutor();
        exec.setCorePoolSize(2);
        exec.setMaxPoolSize(4);
        exec.setQueueCapacity(50);
        exec.setThreadNamePrefix("ingestion-");
        exec.initialize();
        return exec;
    }
}
\`\`\`

## Retrieval Quality Metrics

Track RAG quality in production:

| Metric | How to measure | Alert threshold |
|--------|---------------|----------------|
| Retrieved chunk count | Log \`RETRIEVED_DOCUMENTS\` size | Alert if 0 on knowledge questions |
| Similarity score | Log top-1 similarity score | Alert if max score < 0.5 |
| Response latency | Timer on \`ChatService.processMessage\` | Alert if p99 > 5s |
| Embedding failures | Counter on \`EmbeddingModel\` exceptions | Alert on any failure |
| Token cost per query | Log \`Usage.getTotalTokens()\` | Alert if > 4000 tokens |
`,

'236.2': `# Kafka Event Streaming — Domain Events & Audit Trail

Every significant action in the capstone system — a document upload, a chat message, a tenant creation — produces a Kafka event. These events feed an audit trail, analytics, and future downstream services without coupling the chat service to them.

## Event Schema Design

All events share a common envelope for consistent routing and processing:

\`\`\`java
// Shared event envelope
public record DomainEvent<T>(
    String eventId,        // UUID, idempotency key
    String eventType,      // "chat.message.created", "document.ingested", ...
    String tenantId,
    String userId,
    Instant occurredAt,
    String version,        // schema version for upcasting
    T payload
) {
    public static <T> DomainEvent<T> of(String type, String tenantId,
                                         String userId, T payload) {
        return new DomainEvent<>(
            UUID.randomUUID().toString(), type, tenantId, userId,
            Instant.now(), "1.0", payload);
    }
}

// Event payloads
public record ChatMessagePayload(String sessionId, String messageId,
                                  String role, int tokenCount) {}
public record DocumentIngestedPayload(String documentId, String filename,
                                       int chunkCount) {}
public record TenantCreatedPayload(String tenantSlug, String plan) {}
\`\`\`

## Kafka Configuration

\`\`\`yaml
spring:
  kafka:
    bootstrap-servers: \${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer
      acks: all            # wait for all ISR acknowledgements
      retries: 3
      properties:
        enable.idempotence: true   # exactly-once producer semantics
        max.in.flight.requests.per.connection: 1
    consumer:
      group-id: \${spring.application.name}
      auto-offset-reset: earliest
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer
      properties:
        spring.json.trusted.packages: "com.example.aks.events"
    listener:
      ack-mode: MANUAL_IMMEDIATE   # commit offset only after successful processing
\`\`\`

## Topic Design

\`\`\`
ai-knowledge-service.chat.messages       # partition key: tenantId
ai-knowledge-service.documents.ingested  # partition key: tenantId
ai-knowledge-service.tenants.created     # partition key: tenantId
ai-knowledge-service.audit               # all events, compacted
\`\`\`

Partition by \`tenantId\` so all events for a tenant land in the same partition, preserving order per tenant without global ordering overhead.

## Event Publisher

\`\`\`java
@Component
public class DomainEventPublisher {

    private final KafkaTemplate<String, Object> kafka;

    private static final Map<String, String> TOPIC_MAP = Map.of(
        "chat.message.created",   "ai-knowledge-service.chat.messages",
        "document.ingested",      "ai-knowledge-service.documents.ingested",
        "tenant.created",         "ai-knowledge-service.tenants.created"
    );

    public <T> void publish(DomainEvent<T> event) {
        String topic = TOPIC_MAP.getOrDefault(event.eventType(),
            "ai-knowledge-service.audit");

        ProducerRecord<String, Object> record =
            new ProducerRecord<>(topic, event.tenantId(), event);
        record.headers().add("eventType", event.eventType().getBytes());
        record.headers().add("eventId", event.eventId().getBytes());

        kafka.send(record)
             .thenAccept(result -> log.debug("Event {} published to {}:{}",
                 event.eventId(), topic,
                 result.getRecordMetadata().offset()))
             .exceptionally(ex -> {
                 log.error("Failed to publish event {}", event.eventId(), ex);
                 // In production: store in outbox table for retry
                 return null;
             });
    }
}
\`\`\`

## Audit Consumer

A separate Spring Boot service (or a listener in the same app during early stages) consumes all events and writes to an audit log table:

\`\`\`java
@Component
public class AuditEventConsumer {

    private final AuditLogRepository auditRepo;

    @KafkaListener(
        topics = "ai-knowledge-service.audit",
        containerFactory = "auditListenerFactory")
    public void onEvent(ConsumerRecord<String, DomainEvent<?>> record,
                        Acknowledgment ack) {
        try {
            DomainEvent<?> event = record.value();
            auditRepo.save(new AuditLog(
                event.eventId(),
                event.tenantId(),
                event.userId(),
                event.eventType(),
                event.occurredAt(),
                objectMapper.writeValueAsString(event.payload())));
            ack.acknowledge();
        } catch (Exception ex) {
            log.error("Audit consumer failed for offset {}", record.offset(), ex);
            // Do NOT acknowledge — will be retried
        }
    }
}
\`\`\`

## Dead Letter Topic & Retry

\`\`\`java
@Bean
public DefaultErrorHandler errorHandler(KafkaTemplate<String, Object> kafka) {
    DeadLetterPublishingRecoverer recoverer =
        new DeadLetterPublishingRecoverer(kafka,
            (record, ex) -> new TopicPartition(
                record.topic() + ".dlt", record.partition()));

    FixedBackOff backOff = new FixedBackOff(1000L, 3L); // 3 retries, 1s apart
    return new DefaultErrorHandler(recoverer, backOff);
}
\`\`\`

## Event-Driven Analytics

Downstream analytics can consume \`chat.messages\` to build real-time dashboards without touching the production database:

\`\`\`
chat.messages topic → Flink / ksqlDB / Kafka Streams
    → tenant_daily_token_usage aggregate
    → top_questions_per_tenant
    → response_latency_histogram
    → billing_events (when token budget exceeded)
\`\`\`

This decouples analytics latency from OLTP query performance — the chat service is never impacted by heavy analytics queries.
`,

'236.3': `# Redis Caching — Multi-Tenant Rate Limiting & Session Cache

Redis in the capstone serves three purposes: response caching, conversation memory (via \`RedisChatMemory\`), and per-tenant rate limiting. Each is tenant-scoped using a key prefix convention.

## Redis Key Naming Convention

\`\`\`
{tenant_id}:cache:chat:{message_hash}      → cached response (TTL 10m)
{tenant_id}:memory:{session_id}            → conversation history (TTL 24h)
{tenant_id}:rate:{user_id}:{window_start}  → request count (TTL = window size)
{tenant_id}:doc:status:{doc_id}            → document processing status (TTL 1h)
\`\`\`

Using \`{tenant_id}:\` as a key prefix ensures:
- Redis Cluster routes all tenant keys to the same hash slot (if using hash tags \`{tenant_id}\`)
- Key scanning and bulk deletion by tenant is simple (\`SCAN 0 MATCH {tenantId}:*\`)
- No cross-tenant key collision is possible

## Redis Configuration

\`\`\`java
@Configuration
public class RedisConfig {

    @Bean
    public RedisTemplate<String, Object> redisTemplate(
            RedisConnectionFactory factory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(factory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(
            new GenericJackson2JsonRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setHashValueSerializer(
            new GenericJackson2JsonRedisSerializer());
        template.afterPropertiesSet();
        return template;
    }

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory factory) {
        RedisCacheConfiguration config = RedisCacheConfiguration
            .defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(10))
            .disableCachingNullValues()
            .serializeKeysWith(
                RedisSerializationContext.SerializationPair
                    .fromSerializer(new StringRedisSerializer()))
            .serializeValuesWith(
                RedisSerializationContext.SerializationPair
                    .fromSerializer(new GenericJackson2JsonRedisSerializer()));

        return RedisCacheManager.builder(factory)
            .cacheDefaults(config)
            .build();
    }
}
\`\`\`

## Per-Tenant Rate Limiting

Use Redis's atomic increment + TTL for a sliding-window rate limiter:

\`\`\`java
@Component
public class TenantRateLimiter {

    private final RedisTemplate<String, String> redis;

    private static final int FREE_LIMIT    = 50;    // requests per hour
    private static final int PRO_LIMIT     = 500;
    private static final Duration WINDOW   = Duration.ofHours(1);

    public void checkLimit(String tenantId, String userId, String plan) {
        String window = String.valueOf(Instant.now().getEpochSecond() / 3600);
        String key = tenantId + ":rate:" + userId + ":" + window;

        Long count = redis.opsForValue().increment(key);
        if (count == 1) {
            redis.expire(key, WINDOW);  // set TTL on first increment
        }

        int limit = "pro".equals(plan) ? PRO_LIMIT : FREE_LIMIT;
        if (count > limit) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                "Rate limit exceeded. Limit: " + limit + " requests/hour.");
        }
    }
}
\`\`\`

### Rate Limiter in the Chat Controller

\`\`\`java
@PostMapping("/messages")
public ResponseEntity<ChatMessageResponse> sendMessage(
        @Valid @RequestBody ChatMessageRequest request) {
    String tenantId = TenantContext.tenantId();
    rateLimiter.checkLimit(tenantId, TenantContext.userId(),
                            tenantService.getPlan(tenantId));
    return ResponseEntity.status(201)
        .body(chatService.processMessage(tenantId,
                                         TenantContext.userId(), request));
}
\`\`\`

## Conversation Memory with Redis

\`\`\`java
@Component
public class RedisChatMemory implements ChatMemory {

    private final RedisTemplate<String, Object> redis;
    private static final Duration SESSION_TTL = Duration.ofHours(24);

    public RedisChatMemory(RedisTemplate<String, Object> redis) {
        this.redis = redis;
    }

    @Override
    public void add(String conversationId, List<Message> messages) {
        String key = conversationId + ":memory";
        messages.forEach(msg ->
            redis.opsForList().rightPush(key, msg));
        redis.expire(key, SESSION_TTL);
    }

    @Override
    public List<Message> get(String conversationId, int lastN) {
        String key = conversationId + ":memory";
        long size = Optional.ofNullable(redis.opsForList().size(key)).orElse(0L);
        long start = Math.max(0, size - lastN);
        List<Object> raw = redis.opsForList().range(key, start, -1);
        return raw == null ? List.of() :
            raw.stream().map(o -> (Message) o).toList();
    }

    @Override
    public void clear(String conversationId) {
        redis.delete(conversationId + ":memory");
    }
}
\`\`\`

## Cache Invalidation Strategy

| Event | Cache keys to invalidate |
|-------|------------------------|
| Document deleted | All chat responses for that tenant (conservative) OR maintain a document→response index |
| Tenant plan upgraded | Rate limit counters (reset) |
| Session cleared | \`{tenantId}:memory:{sessionId}\` |
| Document re-ingested | Same as document deleted |

For the capstone, use conservative invalidation: on any document change, clear all \`{tenantId}:cache:chat:*\` keys. Use \`SCAN\` (not \`KEYS\`) to avoid blocking Redis in production:

\`\`\`java
public void invalidateTenantCache(String tenantId) {
    String pattern = tenantId + ":cache:chat:*";
    ScanOptions opts = ScanOptions.scanOptions().match(pattern).count(100).build();
    try (Cursor<byte[]> cursor = redis.getConnectionFactory()
            .getConnection().scan(opts)) {
        cursor.forEachRemaining(key ->
            redis.delete(new String(key)));
    }
}
\`\`\`
`,

}

export const quiz: Record<string, QuizQuestion[]> = {

'236.3': [
  {
    question: 'In the capstone Redis key naming scheme, why is the tenant_id used as a key prefix rather than a suffix?',
    options: [
      'Redis alphabetically sorts keys by prefix for faster lookups',
      'Prefix-based naming enables bulk deletion and scanning of all keys for a tenant using SCAN MATCH {tenantId}:*',
      'Redis Cluster requires tenant IDs at the beginning of keys for cluster routing',
      'Spring Data Redis only supports prefix-based key generation',
    ],
    correctIndex: 1,
    explanation: 'A consistent prefix lets you efficiently find and delete all keys for a tenant with SCAN MATCH {tenantId}:*, which is the only Redis-safe way to enumerate keys in production (KEYS blocks Redis).',
  },
  {
    question: 'Why does the rate limiter call redis.expire(key, WINDOW) only when count == 1?',
    options: [
      'To avoid resetting the TTL on every request, which would prevent the window from ever expiring',
      'Because Redis.expire() fails if called more than once per key',
      'To reduce network round trips by skipping unnecessary TTL updates',
      'Because the first request determines the rate limit tier for the window',
    ],
    correctIndex: 0,
    explanation: 'Setting the TTL only on the first increment ensures the window expires at a fixed time after it opened. Resetting TTL on every increment would push the expiry forward indefinitely, never expiring the rate limit window.',
  },
  {
    question: 'Why is SCAN preferred over KEYS for cache invalidation in production Redis?',
    options: [
      'SCAN returns results in sorted order; KEYS does not',
      'KEYS blocks the entire Redis server for the duration of the scan; SCAN is non-blocking and iterates incrementally',
      'SCAN supports pattern matching; KEYS does not',
      'KEYS is deprecated in Redis 7 and no longer available',
    ],
    correctIndex: 1,
    explanation: 'KEYS is O(N) and blocks Redis single-threaded event loop for the full scan duration. On a large keyspace this can cause latency spikes for all other clients. SCAN iterates incrementally, returning a cursor each round and never blocking for long.',
  },
  {
    question: 'The RedisChatMemory stores conversation messages in a Redis List. What does opsForList().rightPush() do to maintain conversation order?',
    options: [
      'Prepends the message at the head of the list so newest messages are first',
      'Appends the message at the tail of the list so messages are in chronological order',
      'Inserts the message at a sorted score position',
      'Replaces the oldest message in a fixed-size ring buffer',
    ],
    correctIndex: 1,
    explanation: 'rightPush appends to the tail, preserving chronological order. The `get` method then reads from `(size - lastN)` to `-1` to retrieve the most recent N messages in the correct order.',
  },
  {
    question: 'What does the Redis producer configuration `enable.idempotence: true` guarantee for Kafka event publishing?',
    options: [
      'Each Kafka consumer processes each event exactly once',
      'The producer will not publish the same message twice even if it retries after a network failure',
      'Redis and Kafka stay in sync via two-phase commit',
      'The producer batches events until the Redis cache is warm',
    ],
    correctIndex: 1,
    explanation: 'Idempotent producers assign a sequence number to each message. If a retry occurs after a network failure, the broker detects the duplicate sequence number and deduplicates — preventing double-writes to downstream consumers.',
  },
],

}

export const codingTask: Record<string, { instructions: string; boilerplate: string; rubric: string[]; hints: string[] }> = {

'236.1': {
  instructions: `## Task: Implement the RAG Search Service

Implement a \`KnowledgeSearchService\` that performs tenant-scoped RAG retrieval and returns structured results with source attribution.

### Requirements

1. **\`search(String tenantId, String query, int topK)\`**:
   - Build a \`SearchRequest\` with:
     - \`topK\` from the parameter
     - \`similarityThreshold\` of 0.65
     - Filter expression: \`tenant_id == '<tenantId>'\`
   - Call \`vectorStore.similaritySearch(request)\`
   - Return a \`SearchResult\` record containing:
     - \`answer\` — not generated here; pass the retrieved chunks joined by "\n\n"
     - \`sources\` — distinct document IDs from chunk metadata (\`document_id\` key)
     - \`chunkCount\` — total number of chunks retrieved

2. **\`searchWithAnswer(String tenantId, String query)\`**:
   - Same retrieval as above (topK = 5)
   - Additionally call the \`ChatClient\` to generate an answer grounded in the retrieved chunks
   - The ChatClient prompt must include all retrieved chunk contents
   - Return a \`SearchResult\` with the AI-generated answer and sources

3. **\`SearchResult\` record**: \`String answer, List<String> sources, int chunkCount\`

### Acceptance Criteria

- Filter expression prevents retrieval of chunks from other tenants
- \`sources\` contains only distinct document IDs (no duplicates)
- \`chunkCount\` equals the number of chunks retrieved
- \`searchWithAnswer\` calls the AI model only if at least one chunk was retrieved (return a "no information found" result otherwise)
`,
  boilerplate: `import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import java.util.List;

public class KnowledgeSearchService {

    private final VectorStore vectorStore;
    private final ChatClient chatClient;

    public KnowledgeSearchService(VectorStore vectorStore,
                                   ChatClient.Builder builder) {
        this.vectorStore = vectorStore;
        this.chatClient  = builder.build();
    }

    public record SearchResult(String answer, List<String> sources, int chunkCount) {}

    public SearchResult search(String tenantId, String query, int topK) {
        // TODO: build SearchRequest with topK, threshold 0.65, and tenant filter
        // TODO: call vectorStore.similaritySearch(request)
        // TODO: extract distinct document_id values from metadata as sources
        // TODO: join chunk contents with "\n\n" as the answer
        // TODO: return SearchResult
        return null;
    }

    public SearchResult searchWithAnswer(String tenantId, String query) {
        // TODO: retrieve chunks (topK = 5) using search()
        // TODO: if chunkCount == 0, return SearchResult("No information found", List.of(), 0)
        // TODO: build a prompt with the chunks as context and query as user message
        // TODO: call chatClient to generate the answer
        // TODO: return SearchResult with AI answer and sources
        return null;
    }

    private String buildContextPrompt(List<Document> chunks, String query) {
        // TODO: join chunk contents into a context string
        // TODO: return a prompt like:
        //   "Context:\n{chunks}\n\nQuestion: {query}\n\nAnswer using only the context above."
        return null;
    }
}
`,
  rubric: [
    'SearchRequest includes the tenant_id filter expression',
    'SearchRequest sets similarityThreshold to 0.65',
    'search() extracts distinct document_id values from chunk metadata',
    'search() returns chunkCount equal to chunks.size()',
    'searchWithAnswer() delegates retrieval to search() with topK=5',
    'searchWithAnswer() returns "no information" result when chunkCount is 0',
    'searchWithAnswer() calls chatClient with context built from retrieved chunks',
    'buildContextPrompt() joins chunks with newlines and includes the user query',
  ],
  hints: [
    'Filter: `"tenant_id == \'" + tenantId + "\'"` as a String passed to `.withFilterExpression()`.',
    'Extract sources: `chunks.stream().map(d -> (String) d.getMetadata().get("document_id")).distinct().toList()`.',
    'Join contents: `chunks.stream().map(Document::getContent).collect(Collectors.joining("\\n\\n"))`.',
    'In searchWithAnswer, call `search(tenantId, query, 5)` and check `result.chunkCount() == 0`.',
    'ChatClient call: `chatClient.prompt().user(buildContextPrompt(chunks, query)).call().content()`.',
  ],
},

'236.2': {
  instructions: `## Task: Implement the DomainEventPublisher with Outbox Fallback

Implement a \`DomainEventPublisher\` that publishes events to Kafka and falls back to an outbox table on failure.

### Requirements

1. **\`publish(DomainEvent<?> event)\`**:
   - Determine the Kafka topic from the event type using the provided \`TOPIC_MAP\`
   - Create a \`ProducerRecord\` with partition key = \`event.tenantId()\`
   - Add Kafka headers: \`"eventType"\` and \`"eventId"\`
   - Send via \`KafkaTemplate\` asynchronously
   - On failure: call \`saveToOutbox(event)\` to persist for retry

2. **\`saveToOutbox(DomainEvent<?> event)\`**:
   - Save to the \`outbox_events\` table via \`OutboxRepository\`
   - Record: \`(eventId, eventType, tenantId, payload as JSON, createdAt, status="pending")\`

3. **\`retryOutbox()\`** — scheduled every 30 seconds:
   - Load all outbox events with \`status = "pending"\` (limit 50)
   - For each: attempt Kafka publish; on success mark \`status = "sent"\`; on failure increment \`attempts\` (skip if attempts >= 5)

### Acceptance Criteria

- \`publish\` uses tenantId as the Kafka partition key
- On Kafka failure, the event is persisted to the outbox table
- \`retryOutbox\` does not re-process events with attempts >= 5
- Events published via outbox retry have the same \`eventId\` (idempotency)
`,
  boilerplate: `import org.apache.kafka.clients.producer.ProducerRecord;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import java.util.Map;

public class DomainEventPublisher {

    private final KafkaTemplate<String, Object> kafka;
    private final OutboxRepository outboxRepo;
    private final ObjectMapper objectMapper;

    private static final Map<String, String> TOPIC_MAP = Map.of(
        "chat.message.created",  "ai-ks.chat.messages",
        "document.ingested",     "ai-ks.documents.ingested",
        "tenant.created",        "ai-ks.tenants.created"
    );
    private static final String DEFAULT_TOPIC = "ai-ks.audit";

    public DomainEventPublisher(KafkaTemplate<String, Object> kafka,
                                 OutboxRepository outboxRepo,
                                 ObjectMapper objectMapper) {
        this.kafka = kafka;
        this.outboxRepo = outboxRepo;
        this.objectMapper = objectMapper;
    }

    public void publish(DomainEvent<?> event) {
        // TODO: resolve topic from TOPIC_MAP (default to DEFAULT_TOPIC)
        // TODO: create ProducerRecord with tenantId as key
        // TODO: add headers: "eventType" and "eventId"
        // TODO: send and handle failure by calling saveToOutbox(event)
    }

    void saveToOutbox(DomainEvent<?> event) {
        // TODO: serialize payload to JSON
        // TODO: create OutboxEvent record and save via outboxRepo
    }

    @Scheduled(fixedDelay = 30_000)
    public void retryOutbox() {
        // TODO: load up to 50 pending outbox events
        // TODO: for each: try publish; if attempts >= 5 skip; on success mark sent
    }
}
`,
  rubric: [
    'Topic is resolved from TOPIC_MAP with DEFAULT_TOPIC fallback',
    'ProducerRecord uses event.tenantId() as the partition key',
    'Headers "eventType" and "eventId" are added to the producer record',
    'On Kafka send failure, saveToOutbox(event) is called in the exceptionally handler',
    'saveToOutbox serializes the payload to JSON and saves an OutboxEvent',
    'retryOutbox loads pending events (limit 50) and retries each',
    'retryOutbox skips events with attempts >= 5',
    'retryOutbox marks successfully published events as "sent"',
  ],
  hints: [
    'Use `TOPIC_MAP.getOrDefault(event.eventType(), DEFAULT_TOPIC)` to resolve the topic.',
    'Add headers: `record.headers().add("eventType", event.eventType().getBytes())` and similarly for eventId.',
    'Handle failure: `kafka.send(record).exceptionally(ex -> { saveToOutbox(event); return null; })`.',
    'In retryOutbox, call `outboxRepo.findByStatusAndAttemptsLessThan("pending", 5, PageRequest.of(0, 50))`.',
    'On retry success: `outboxRepo.updateStatus(outboxEvent.eventId(), "sent")`. On failure: `outboxRepo.incrementAttempts(outboxEvent.eventId())`.',
  ],
},

}
