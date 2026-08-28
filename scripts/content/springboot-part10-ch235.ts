// Part X — Capstone Project
// Chapter 235: Foundation & Architecture

import type { QuizQuestion } from '../../src/data/curriculum'

export const courseId = 'springboot-ai-architect'

export const content: Record<string, string> = {

'235.1': `# Capstone Architecture — Multi-Tenant SaaS Design

This capstone builds a production-grade AI-powered SaaS backend end-to-end. Every chapter in the course has prepared one piece of this puzzle. This chapter assembles the architectural blueprint before writing a single line of code.

## What We Are Building

A **multi-tenant AI knowledge assistant** — a SaaS backend where:

- Each **tenant** (company) gets isolated data: their own documents, chat history, and knowledge base
- Authenticated users chat with an AI assistant that answers from their tenant's indexed documents (RAG)
- Every chat message and document upload produces **Kafka events** for audit, analytics, and downstream services
- Hot query results are cached in **Redis** scoped per tenant
- The entire system runs in **Kubernetes**, deployed via a GitHub Actions CI/CD pipeline

### Architecture Diagram

\`\`\`
Browser / Mobile
      │
      ▼
┌─────────────────────────────────────────────┐
│  API Gateway  (Spring Cloud Gateway)        │
│  JWT validation │ Rate limiting │ Routing   │
└──────────────────────┬──────────────────────┘
                       │
          ┌────────────▼──────────────┐
          │  AI Knowledge Service     │
          │  (our Spring Boot app)    │
          │                           │
          │  ┌─────┐  ┌───────────┐  │
          │  │ JWT │  │ Tenant    │  │
          │  │Auth │  │ Context   │  │
          │  └─────┘  └───────────┘  │
          │                           │
          │  ┌──────────────────────┐ │
          │  │  Chat Controller     │ │
          │  │  RAG Pipeline        │ │
          │  │  Document Ingestion  │ │
          │  └──────────────────────┘ │
          └──┬────────┬────────┬──────┘
             │        │        │
         ┌───▼──┐ ┌───▼──┐ ┌──▼──────┐
         │ PG + │ │Redis │ │  Kafka  │
         │pgVec │ │Cache │ │ Events  │
         └──────┘ └──────┘ └─────────┘
\`\`\`

## Multi-Tenancy Strategies

| Strategy | Isolation | Cost | Best for |
|----------|-----------|------|---------|
| **Database per tenant** | Strongest | High (N databases) | Regulated industries, enterprise |
| **Schema per tenant** | Strong | Medium (N schemas, 1 DB) | Mid-market SaaS |
| **Row-level security** | Good | Low (shared tables, RLS filters) | SMB SaaS, startups |

We will use **row-level security (RLS)** with a \`tenant_id\` column on every table. PostgreSQL's RLS policies enforce isolation at the database layer — even a bug in the application cannot leak cross-tenant data when properly configured.

## Project Structure

\`\`\`
ai-knowledge-service/
├── src/main/java/com/example/aks/
│   ├── auth/               # JWT filter, TenantContext
│   ├── chat/               # ChatController, ChatService
│   ├── rag/                # DocumentIngestionService, RAG pipeline
│   ├── events/             # Kafka producers, consumers
│   ├── cache/              # Redis configuration, CacheService
│   └── config/             # Security, AI, Kafka, Redis config
├── src/main/resources/
│   ├── application.yml
│   ├── prompts/            # Prompt templates
│   └── db/migration/       # Flyway migrations
├── k8s/
│   ├── base/               # Kubernetes manifests
│   └── overlays/           # Kustomize environment overlays
├── .github/workflows/      # CI/CD pipeline
└── Dockerfile
\`\`\`

## Technology Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Spring Boot 3.4 | Auto-configuration, production-ready |
| AI | Spring AI + OpenAI | ChatClient, RAG, embeddings |
| Database | PostgreSQL 16 + pgVector | ACID + vector similarity search |
| Cache | Redis 7 | Sub-millisecond lookups, pub/sub |
| Events | Apache Kafka | Durable, ordered, replayable |
| Auth | JWT (RS256) | Stateless, verifiable, tenant claims |
| Container | Docker multi-stage | Small images, non-root |
| Orchestration | Kubernetes (EKS/GKE) | Horizontal scaling, self-healing |
| CI/CD | GitHub Actions + ArgoCD | GitOps, progressive delivery |
| Migrations | Flyway | Version-controlled schema |

## Data Model

\`\`\`sql
-- V1__initial_schema.sql
CREATE TABLE tenants (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        TEXT UNIQUE NOT NULL,
    plan        TEXT NOT NULL DEFAULT 'free',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    email       TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'member',
    UNIQUE(tenant_id, email)
);

CREATE TABLE documents (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    filename    TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status      TEXT NOT NULL DEFAULT 'processing'
);

CREATE TABLE chat_messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    user_id     UUID NOT NULL REFERENCES users(id),
    session_id  UUID NOT NULL,
    role        TEXT NOT NULL,   -- 'user' | 'assistant'
    content     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE documents    ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON documents
    USING (tenant_id = current_setting('app.tenant_id')::UUID);

CREATE POLICY tenant_isolation ON chat_messages
    USING (tenant_id = current_setting('app.tenant_id')::UUID);
\`\`\`

## AI-Assisted Development Workflow

Throughout this capstone, use AI tooling deliberately:

1. **GitHub Copilot / Claude** for boilerplate — Dockerfile, Kubernetes manifests, Flyway migrations, Spring configuration
2. **Claude Code** for architecture review — "does this design violate any principles from Part VII?"
3. **AI for test generation** — describe the behaviour you want; let AI write the initial test; review and correct it
4. **Never let AI own security decisions** — JWT validation, RLS policies, secret management: write these yourself and have a human review them

The capstone is not complete until the full pipeline runs green in CI and the service is reachable in a staging Kubernetes namespace.
`,

'235.2': `# Multi-Tenant JWT Authentication

JWT authentication in a multi-tenant system has one critical difference from single-tenant JWT: the token must carry a \`tenant_id\` claim, and every request must extract and scope all operations to that tenant.

## JWT Token Structure

\`\`\`json
{
  "sub": "user-uuid-here",
  "email": "alice@acme.com",
  "tenant_id": "tenant-uuid-here",
  "tenant_slug": "acme",
  "role": "admin",
  "iss": "https://auth.example.com",
  "aud": "ai-knowledge-service",
  "exp": 1735689600,
  "iat": 1735603200
}
\`\`\`

The \`tenant_id\` claim is the source of truth. The service never trusts a tenant ID from the request body or query parameters — only from the verified JWT.

## TenantContext — Thread-Local Scoping

\`\`\`java
public final class TenantContext {
    private static final ThreadLocal<String> TENANT = new ThreadLocal<>();
    private static final ThreadLocal<String> USER   = new ThreadLocal<>();

    private TenantContext() {}

    public static void set(String tenantId, String userId) {
        TENANT.set(tenantId);
        USER.set(userId);
    }

    public static String tenantId() {
        String id = TENANT.get();
        if (id == null) throw new IllegalStateException("No tenant in context");
        return id;
    }

    public static String userId() { return USER.get(); }

    public static void clear() { TENANT.remove(); USER.remove(); }
}
\`\`\`

## JWT Security Filter

\`\`\`java
@Component
@Order(1)
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtVerifier verifier;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws IOException, ServletException {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            response.sendError(HttpStatus.UNAUTHORIZED.value(), "Missing token");
            return;
        }
        try {
            JwtClaims claims = verifier.verify(header.substring(7));
            TenantContext.set(claims.tenantId(), claims.subject());

            // Set PostgreSQL session variable for RLS
            // (done via DataSource connection decorator — see below)

            UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(
                    claims.subject(), null,
                    List.of(new SimpleGrantedAuthority("ROLE_" + claims.role().toUpperCase())));
            SecurityContextHolder.getContext().setAuthentication(auth);

            chain.doFilter(request, response);
        } catch (JwtException ex) {
            response.sendError(HttpStatus.UNAUTHORIZED.value(), "Invalid token");
        } finally {
            TenantContext.clear(); // always clean up thread-local
        }
    }
}
\`\`\`

## PostgreSQL RLS Integration

For RLS to work, each JDBC connection must set the \`app.tenant_id\` session variable before any query runs. The cleanest approach is a Spring Data JPA \`EntityManagerFactory\` decorator:

\`\`\`java
@Component
public class TenantAwareConnectionProvider implements ConnectionProvider {
    private final DataSource dataSource;

    @Override
    public Connection getConnection() throws SQLException {
        Connection conn = dataSource.getConnection();
        try (var stmt = conn.prepareStatement(
                "SELECT set_config('app.tenant_id', ?, false)")) {
            stmt.setString(1, TenantContext.tenantId());
            stmt.execute();
        }
        return conn;
    }
}
\`\`\`

## Security Configuration

\`\`\`java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http,
                                           JwtAuthFilter jwtFilter) throws Exception {
        return http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(s -> s.sessionCreationPolicy(STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health/**").permitAll()
                .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated())
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
            .build();
    }
}
\`\`\`

## Testing Multi-Tenant Auth

\`\`\`java
@SpringBootTest(webEnvironment = RANDOM_PORT)
class AuthIntegrationTest {

    @Autowired TestRestTemplate rest;

    @Test
    void rejectsRequestWithNoToken() {
        var response = rest.getForEntity("/api/v1/chat/sessions", String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void rejectsCrossTeantAccess() {
        String tenantAToken = issueToken("tenant-a-id", "user-1");
        String tenantBSessionId = "session-from-tenant-b";

        var response = rest.exchange(
            "/api/v1/chat/sessions/" + tenantBSessionId,
            GET,
            new HttpEntity<>(bearerHeader(tenantAToken)),
            String.class);

        // RLS prevents access — returns 404 (not 403, to avoid information leakage)
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }
}
\`\`\`

Return 404 (not 403) for cross-tenant resource access — returning 403 confirms the resource exists, which is itself an information leak.
`,

'235.3': `# Core Domain — Tenant-Aware AI Chat Endpoint

The AI chat endpoint is the centrepiece of the capstone. It receives a user message, retrieves relevant documents from the tenant's knowledge base (RAG), and streams the AI response back.

## Chat Architecture

\`\`\`
POST /api/v1/chat/messages
        │
        ▼
ChatController
        │
        ├── Extract tenant from TenantContext
        ├── Load or create ChatSession (scoped to tenant + user)
        │
        ▼
ChatService
        │
        ├── Check Redis cache for identical recent query
        │
        ├── Build ChatClient with:
        │     ├── MessageChatMemoryAdvisor  (conversation history)
        │     ├── QuestionAnswerAdvisor     (RAG from tenant's vector store)
        │     └── SafeGuardAdvisor          (prompt injection detection)
        │
        ├── Call ChatClient → stream response
        │
        ├── Persist user + assistant messages to DB (tenant-scoped)
        │
        └── Publish ChatMessageEvent to Kafka
\`\`\`

## Domain Records

\`\`\`java
// Incoming request
public record ChatMessageRequest(
    @NotBlank String sessionId,
    @NotBlank @Size(max = 4000) String message
) {}

// Outgoing response
public record ChatMessageResponse(
    String messageId,
    String sessionId,
    String content,
    List<String> sources,  // document names that informed the answer
    Instant createdAt
) {}

// Kafka event
public record ChatMessageEvent(
    String tenantId,
    String userId,
    String sessionId,
    String messageId,
    String role,           // "user" | "assistant"
    int tokenCount,
    Instant occurredAt
) {}
\`\`\`

## ChatController

\`\`\`java
@RestController
@RequestMapping("/api/v1/chat")
@Validated
public class ChatController {

    private final ChatService chatService;
    private final ChatMessageRepository messageRepo;

    @PostMapping("/messages")
    public ResponseEntity<ChatMessageResponse> sendMessage(
            @Valid @RequestBody ChatMessageRequest request) {

        String tenantId = TenantContext.tenantId();
        String userId   = TenantContext.userId();

        ChatMessageResponse response =
            chatService.processMessage(tenantId, userId, request);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/sessions/{sessionId}/messages")
    public List<ChatMessageResponse> getHistory(
            @PathVariable String sessionId,
            @RequestParam(defaultValue = "20") int limit) {
        return messageRepo.findBySessionId(sessionId, limit);
    }

    // Streaming variant using Server-Sent Events
    @GetMapping(value = "/messages/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> streamMessage(@RequestParam String sessionId,
                                      @RequestParam String message) {
        return chatService.streamMessage(TenantContext.tenantId(),
                                         TenantContext.userId(),
                                         sessionId, message);
    }
}
\`\`\`

## ChatService — Core Implementation

\`\`\`java
@Service
@Transactional
public class ChatService {

    private final ChatClient.Builder chatClientBuilder;
    private final VectorStore vectorStore;
    private final ChatMessageRepository messageRepo;
    private final KafkaTemplate<String, Object> kafka;
    private final RedisTemplate<String, String> redis;

    public ChatMessageResponse processMessage(String tenantId, String userId,
                                               ChatMessageRequest request) {
        // 1. Cache check (exact-match for FAQs)
        String cacheKey = "chat:" + tenantId + ":" + request.message().hashCode();
        String cached = redis.opsForValue().get(cacheKey);
        if (cached != null) return deserialize(cached);

        // 2. Build tenant-scoped ChatClient
        ChatClient client = chatClientBuilder
            .defaultSystem("""
                You are a helpful AI assistant for a company.
                Answer questions using ONLY the provided context documents.
                If the context does not contain the answer, say so clearly.
                Never make up information.
                """)
            .defaultAdvisors(
                new MessageChatMemoryAdvisor(
                    new RedisChatMemory(redis, tenantId + ":" + request.sessionId())),
                new QuestionAnswerAdvisor(vectorStore,
                    SearchRequest.defaults()
                        .withTopK(5)
                        .withSimilarityThreshold(0.65)
                        .withFilterExpression("tenant_id == '" + tenantId + "'")),
                new SimpleLoggerAdvisor())
            .build();

        // 3. Call AI
        ChatResponse aiResponse = client.prompt()
            .user(request.message())
            .call()
            .chatResponse();

        String content = aiResponse.getResult().getOutput().getContent();
        List<String> sources = extractSources(aiResponse);

        // 4. Persist messages
        String messageId = saveMessages(tenantId, userId, request, content);

        // 5. Publish event
        kafka.send("chat.messages", tenantId,
            new ChatMessageEvent(tenantId, userId, request.sessionId(),
                                 messageId, "assistant",
                                 aiResponse.getMetadata().getUsage().getTotalTokens(),
                                 Instant.now()));

        ChatMessageResponse result =
            new ChatMessageResponse(messageId, request.sessionId(),
                                    content, sources, Instant.now());

        // 6. Cache result (10-minute TTL)
        redis.opsForValue().set(cacheKey, serialize(result), Duration.ofMinutes(10));
        return result;
    }
}
\`\`\`

## Tenant-Scoped Vector Store Filter

pgVector with Spring AI supports metadata filters. Tag every document chunk with \`tenant_id\` at ingestion time:

\`\`\`java
@Service
public class DocumentIngestionService {

    private final VectorStore vectorStore;
    private final DocumentReader pdfReader;

    public void ingest(String tenantId, String documentId, InputStream content) {
        List<Document> docs = new PagePdfDocumentReader(content).read();
        List<Document> chunks = new TokenTextSplitter().apply(docs);

        // Tag every chunk with tenant metadata
        chunks.forEach(d -> {
            d.getMetadata().put("tenant_id", tenantId);
            d.getMetadata().put("document_id", documentId);
        });

        vectorStore.add(chunks);
    }
}
\`\`\`

The \`SearchRequest\` filter expression \`"tenant_id == '...'\"\` ensures RAG retrieval is scoped to the querying tenant's documents only — cross-tenant knowledge leakage is architecturally prevented.
`,

}

export const quiz: Record<string, QuizQuestion[]> = {

'235.1': [
  {
    question: 'In a multi-tenant SaaS application using row-level security (RLS), what enforces data isolation at the database layer?',
    options: [
      'The application layer filters queries by tenant_id in every repository method',
      'PostgreSQL RLS policies that check a session variable (app.tenant_id) against the row\'s tenant_id column',
      'A separate database schema is created for each tenant',
      'A middleware proxy intercepts queries and rewrites the WHERE clause',
    ],
    correctIndex: 1,
    explanation: 'PostgreSQL RLS policies evaluate a per-session variable (set to the authenticated tenant\'s ID) against each row\'s tenant_id. Even if application code forgets a WHERE clause, the database enforces isolation automatically.',
  },
  {
    question: 'Why does the capstone use RS256 (asymmetric) JWT signing rather than HS256 (symmetric)?',
    options: [
      'RS256 tokens are smaller and faster to verify',
      'RS256 allows any service to verify tokens using the public key without needing the signing secret, reducing the blast radius of a secret leak',
      'HS256 is deprecated and no longer supported by Spring Security',
      'RS256 supports multi-tenant claims that HS256 cannot encode',
    ],
    correctIndex: 1,
    explanation: 'With RS256, only the auth service holds the private key. Downstream services verify tokens with the public key — which can be distributed freely. A compromised downstream service cannot forge new tokens.',
  },
  {
    question: 'What is the purpose of Flyway in the capstone project?',
    options: [
      'To deploy the application container to Kubernetes',
      'To manage version-controlled, incremental SQL schema migrations applied automatically at startup',
      'To synchronise Redis cache evictions with PostgreSQL writes',
      'To stream Kafka events to the database for audit storage',
    ],
    correctIndex: 1,
    explanation: 'Flyway applies SQL migration scripts (V1__, V2__, …) in order at application startup. This makes schema changes reproducible, rollback-safe, and part of the version control history.',
  },
  {
    question: 'In the capstone architecture, what is the role of the pgVector extension?',
    options: [
      'It provides full-text search across chat message history',
      'It stores and indexes high-dimensional embedding vectors for similarity search in the RAG pipeline',
      'It encrypts tenant data at the column level for compliance',
      'It replicates PostgreSQL data to Redis for caching',
    ],
    correctIndex: 1,
    explanation: 'pgVector adds a `vector` data type and HNSW/IVFFlat indexes to PostgreSQL. Spring AI uses it as the vector store: document chunks are stored as embeddings and retrieved by cosine similarity during RAG.',
  },
  {
    question: 'Why should the AI chat endpoint return HTTP 404 (not 403) when a tenant attempts to access another tenant\'s session?',
    options: [
      '403 would trigger a retry in the client; 404 does not',
      '404 avoids leaking the information that the resource exists — 403 confirms existence but denies access',
      'Spring Security automatically translates 403 to 404 for REST APIs',
      'The JWT filter cannot determine the tenant of the target resource to issue a 403',
    ],
    correctIndex: 1,
    explanation: 'Returning 403 tells the attacker that the resource exists and they lack permission. Returning 404 reveals nothing — standard security practice for multi-tenant systems is to treat cross-tenant resources as non-existent.',
  },
],

'235.3': [
  {
    question: 'Why is it important to include a metadata filter expression (tenant_id == \'...\') in the QuestionAnswerAdvisor\'s SearchRequest?',
    options: [
      'To improve retrieval performance by reducing the vector search space',
      'To prevent the RAG pipeline from returning document chunks belonging to other tenants',
      'To limit the number of tokens sent to the language model',
      'To enable pgVector\'s HNSW index to activate',
    ],
    correctIndex: 1,
    explanation: 'Without a tenant filter, the vector similarity search spans all tenants\' document chunks. A tenant could receive answers informed by another tenant\'s confidential documents — a critical data leak.',
  },
  {
    question: 'In the ChatService, why is the MessageChatMemoryAdvisor added before the QuestionAnswerAdvisor in the advisor chain?',
    options: [
      'MessageChatMemoryAdvisor must run last to persist the final response',
      'Conversation history must be prepended to the prompt before RAG retrieval so the retrieval query has full context',
      'QuestionAnswerAdvisor requires authentication that MessageChatMemoryAdvisor provides',
      'The order does not matter; Spring AI reorders advisors automatically',
    ],
    correctIndex: 1,
    explanation: 'The memory advisor injects prior turns into the prompt context. When the RAG advisor then retrieves documents, it can use the full conversational context — not just the latest isolated message — to find more relevant chunks.',
  },
  {
    question: 'What is the purpose of including the token count in the ChatMessageEvent published to Kafka?',
    options: [
      'To allow Kafka consumers to split large events across multiple partitions',
      'To enable downstream analytics and billing services to track AI API usage per tenant',
      'To enforce rate limiting directly in the Kafka consumer',
      'To calculate the Redis cache TTL based on message length',
    ],
    correctIndex: 1,
    explanation: 'Token counts are the basis for AI API cost attribution. Publishing them as events lets a billing service aggregate cost per tenant per period without coupling billing logic to the chat service.',
  },
  {
    question: 'Why does the capstone system use an exact-match Redis cache for chat messages rather than caching all responses?',
    options: [
      'Because Redis cannot store the embedding vectors needed for semantic caching',
      'Because exact-match caching is simple and effective for FAQ-type queries that repeat frequently within a tenant',
      'Because Spring AI\'s ChatClient does not support cache integration',
      'Because Kafka consumers would receive duplicate events if responses were cached',
    ],
    correctIndex: 1,
    explanation: 'Many SaaS tenants ask the same FAQ repeatedly ("What is the refund policy?"). Exact-match caching on a hash of the message eliminates repeated AI API calls for identical queries — a significant cost saving at scale.',
  },
  {
    question: 'In the streaming variant of the chat endpoint, which Spring technology is used to emit tokens to the client as they arrive from the AI model?',
    options: [
      'Spring WebSocket with STOMP',
      'Spring WebFlux Flux<String> with Server-Sent Events (text/event-stream)',
      'Spring Batch with chunk-oriented processing',
      'Spring Integration with a message channel',
    ],
    correctIndex: 1,
    explanation: 'Server-Sent Events (SSE) over a reactive Flux<String> stream tokens to the browser as they arrive, giving the user the progressive-generation experience. SSE works over standard HTTP — no WebSocket upgrade needed.',
  },
],

}

export const codingTask: Record<string, { instructions: string; boilerplate: string; rubric: string[]; hints: string[] }> = {

'235.2': {
  instructions: `## Task: Implement the TenantContext + JWT Filter

Implement two classes that form the security foundation of the multi-tenant system.

### Part 1: TenantContext

Implement \`TenantContext\` as a thread-local holder for the current request's tenant and user identity.

Requirements:
- \`set(String tenantId, String userId)\` — stores both values in thread-locals
- \`tenantId()\` — returns the current tenant ID; throws \`IllegalStateException\` if not set
- \`userId()\` — returns the current user ID (may return null if not authenticated)
- \`clear()\` — removes both thread-local values (must be called in finally blocks)
- \`isSet()\` — returns \`true\` if a tenant is currently in context

### Part 2: TenantJwtFilter

Implement a \`OncePerRequestFilter\` that:
1. Reads the \`Authorization: Bearer <token>\` header
2. If absent, calls \`response.sendError(401, "Missing token")\` and returns
3. Verifies the token using the injected \`JwtVerifier\`
4. On success: calls \`TenantContext.set(claims.tenantId(), claims.subject())\`
5. Calls \`chain.doFilter(request, response)\`
6. In a \`finally\` block: calls \`TenantContext.clear()\`
7. On \`JwtException\`: calls \`response.sendError(401, "Invalid token")\`

### Acceptance Criteria

- \`TenantContext.tenantId()\` throws \`IllegalStateException\` when called outside a request
- \`TenantContext.clear()\` is called even when the filter chain throws an exception
- Requests with missing or invalid tokens receive HTTP 401
- Valid tokens result in \`TenantContext.tenantId()\` returning the JWT's \`tenant_id\` claim
`,
  boilerplate: `// ── TenantContext.java ──────────────────────────────────────────────
public final class TenantContext {

    // TODO: Declare two ThreadLocal<String> fields: TENANT_ID and USER_ID

    private TenantContext() {}

    public static void set(String tenantId, String userId) {
        // TODO: set both thread-locals
    }

    public static String tenantId() {
        // TODO: get TENANT_ID; throw IllegalStateException if null
        return null;
    }

    public static String userId() {
        // TODO: get USER_ID (null is acceptable)
        return null;
    }

    public static boolean isSet() {
        // TODO: return true if TENANT_ID is non-null
        return false;
    }

    public static void clear() {
        // TODO: remove both thread-locals
    }
}


// ── TenantJwtFilter.java ─────────────────────────────────────────────
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;

public class TenantJwtFilter extends OncePerRequestFilter {

    private final JwtVerifier jwtVerifier;

    public TenantJwtFilter(JwtVerifier jwtVerifier) {
        this.jwtVerifier = jwtVerifier;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) {
        // TODO: read Authorization header
        // TODO: if missing/not "Bearer ", sendError(401) and return
        // TODO: try { verify token, set TenantContext, chain.doFilter }
        // TODO: catch JwtException { sendError(401) }
        // TODO: finally { TenantContext.clear() }
    }
}
`,
  rubric: [
    'TenantContext uses two separate ThreadLocal<String> fields for tenant and user',
    'tenantId() throws IllegalStateException when the thread-local is null',
    'isSet() returns true only when TENANT_ID thread-local is non-null',
    'clear() calls remove() on both thread-locals',
    'TenantJwtFilter extends OncePerRequestFilter',
    'Filter returns 401 when Authorization header is missing or does not start with "Bearer "',
    'Filter calls TenantContext.set() with verified claims before chain.doFilter()',
    'Filter calls TenantContext.clear() in a finally block regardless of exceptions',
    'Filter returns 401 on JwtException without propagating the exception',
  ],
  hints: [
    'Declare `private static final ThreadLocal<String> TENANT_ID = new ThreadLocal<>()` and similarly for USER_ID.',
    'In `tenantId()`: `String id = TENANT_ID.get(); if (id == null) throw new IllegalStateException("No tenant in context"); return id;`',
    'In the filter, the token is `header.substring(7)` after checking `header.startsWith("Bearer ")`.',
    'Wrap `chain.doFilter(request, response)` in try-catch-finally; the finally block always calls `TenantContext.clear()`.',
    'Call `jwtVerifier.verify(token)` to get a `JwtClaims` object; use `claims.tenantId()` and `claims.subject()`.',
  ],
},

'235.3': {
  instructions: `## Task: Implement DocumentIngestionService with Tenant Isolation

Implement a \`DocumentIngestionService\` that reads a PDF, splits it into chunks, tags each chunk with tenant metadata, and stores it in the vector store.

### Requirements

1. **\`ingest(String tenantId, String documentId, Resource pdfResource)\`**:
   - Read the PDF using \`PagePdfDocumentReader\`
   - Split into chunks using \`TokenTextSplitter\` (default settings)
   - Add metadata to every chunk: \`tenant_id = tenantId\`, \`document_id = documentId\`
   - Add all chunks to the \`VectorStore\`
   - Return the number of chunks stored

2. **\`delete(String tenantId, String documentId)\`**:
   - Delete all vectors where \`tenant_id == tenantId AND document_id == documentId\`
   - Use \`VectorStore.delete(List<String> ids)\` after first finding the IDs via a similarity search with a broad filter

3. **\`countChunks(String tenantId, String documentId)\`**:
   - Return the count of stored chunks for the given tenant and document
   - Use \`VectorStore.similaritySearch\` with \`maxResults=1000\` and the appropriate filter expression

### Acceptance Criteria

- Every chunk in the vector store has \`metadata.tenant_id\` set to the provided tenantId
- Ingesting with one tenantId does not affect chunks with a different tenantId
- \`countChunks\` returns 0 for a documentId that was never ingested
- \`delete\` removes chunks for the specified document without affecting other documents of the same tenant
`,
  boilerplate: `import org.springframework.ai.document.Document;
import org.springframework.ai.reader.pdf.PagePdfDocumentReader;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.core.io.Resource;
import java.util.List;

public class DocumentIngestionService {

    private final VectorStore vectorStore;
    private final TokenTextSplitter splitter;

    public DocumentIngestionService(VectorStore vectorStore) {
        this.vectorStore = vectorStore;
        this.splitter = new TokenTextSplitter();
    }

    public int ingest(String tenantId, String documentId, Resource pdfResource) {
        // TODO: 1. Read PDF with PagePdfDocumentReader
        // TODO: 2. Split into chunks with splitter.apply(docs)
        // TODO: 3. Tag each chunk with tenant_id and document_id metadata
        // TODO: 4. Add to vectorStore
        // TODO: 5. Return chunk count
        return 0;
    }

    public void delete(String tenantId, String documentId) {
        // TODO: find chunks for this tenant+document using similaritySearch with filter
        //       filter: "tenant_id == '<tenantId>' && document_id == '<documentId>'"
        // TODO: collect their IDs and call vectorStore.delete(ids)
    }

    public int countChunks(String tenantId, String documentId) {
        // TODO: similaritySearch with filter expression and topK=1000, threshold=0.0
        // TODO: return the size of the result list
        return 0;
    }
}
`,
  rubric: [
    'PDF is read using PagePdfDocumentReader(pdfResource)',
    'Documents are split using TokenTextSplitter.apply()',
    'Each chunk has metadata key "tenant_id" set to the tenantId parameter',
    'Each chunk has metadata key "document_id" set to the documentId parameter',
    'vectorStore.add(chunks) is called with all tagged chunks',
    'ingest() returns the number of chunks (chunks.size())',
    'delete() uses similaritySearch with filter to find chunk IDs, then calls vectorStore.delete()',
    'countChunks() returns the size of the similaritySearch result list',
  ],
  hints: [
    'Create the reader with `new PagePdfDocumentReader(pdfResource)` and call `.read()` to get a `List<Document>`.',
    'Call `splitter.apply(docs)` to get the chunk list.',
    'Set metadata: `chunk.getMetadata().put("tenant_id", tenantId)` inside a `chunks.forEach(...)` loop.',
    'For the filter expression string: `"tenant_id == \'" + tenantId + "\' && document_id == \'" + documentId + "\'"` .',
    'For countChunks, use `SearchRequest.defaults().withTopK(1000).withSimilarityThreshold(0.0).withFilterExpression(filter)`.',
  ],
},

}
