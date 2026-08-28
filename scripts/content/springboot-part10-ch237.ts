// Part X — Capstone Project
// Chapter 237: Production Delivery & Final Capstone

import type { QuizQuestion } from '../../src/data/curriculum'

export const courseId = 'springboot-ai-architect'

export const content: Record<string, string> = {

'237.1': `# Containerization & Kubernetes for the Capstone SaaS

Chapters 229–230 covered containerization and Kubernetes fundamentals. Here we apply them to the capstone's multi-service architecture with production-grade configuration.

## Multi-Stage Dockerfile

\`\`\`dockerfile
# ── Stage 1: Build ────────────────────────────────────────────────────
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /build

# Dependency layer cache
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN ./mvnw dependency:go-offline -q

# Build
COPY src/ src/
RUN ./mvnw package -DskipTests -q

# Extract layered JAR
RUN java -Djarmode=layertools -jar target/*.jar extract --destination extracted

# ── Stage 2: Runtime ──────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Security: non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy layers in order of least-to-most-likely-to-change
COPY --from=build /build/extracted/dependencies/            ./
COPY --from=build /build/extracted/spring-boot-loader/      ./
COPY --from=build /build/extracted/snapshot-dependencies/   ./
COPY --from=build /build/extracted/application/             ./

USER appuser
EXPOSE 8080

ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:+ExitOnOutOfMemoryError"

ENTRYPOINT ["sh", "-c", "java \${JAVA_OPTS} org.springframework.boot.loader.launch.JarLauncher"]
\`\`\`

## Kubernetes Manifests (Kustomize)

\`\`\`
k8s/
├── base/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── configmap.yaml
│   └── kustomization.yaml
└── overlays/
    ├── staging/
    │   ├── patch-replicas.yaml   # replicas: 1
    │   └── kustomization.yaml
    └── production/
        ├── patch-replicas.yaml   # replicas: 3
        ├── patch-resources.yaml  # larger CPU/memory limits
        └── kustomization.yaml
\`\`\`

### Deployment (base)

\`\`\`yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-knowledge-service
  namespace: ai-ks
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ai-knowledge-service
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: ai-knowledge-service
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
        prometheus.io/path: "/actuator/prometheus"
    spec:
      serviceAccountName: ai-ks-sa
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
      containers:
        - name: app
          image: ghcr.io/myorg/ai-knowledge-service:latest
          ports:
            - containerPort: 8080
          env:
            - name: SPRING_PROFILES_ACTIVE
              value: "kubernetes"
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: ai-ks-secrets
                  key: database-url
            - name: OPENAI_API_KEY
              valueFrom:
                secretKeyRef:
                  name: ai-ks-secrets
                  key: openai-api-key
            - name: KAFKA_BOOTSTRAP_SERVERS
              valueFrom:
                configMapKeyRef:
                  name: ai-ks-config
                  key: kafka-bootstrap-servers
          resources:
            requests:
              cpu: "250m"
              memory: "512Mi"
            limits:
              cpu: "1000m"
              memory: "1Gi"
          livenessProbe:
            httpGet:
              path: /actuator/health/liveness
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /actuator/health/readiness
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
            failureThreshold: 3
          lifecycle:
            preStop:
              exec:
                command: ["sh", "-c", "sleep 5"]
      terminationGracePeriodSeconds: 40
\`\`\`

## HPA — Horizontal Pod Autoscaler

\`\`\`yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ai-knowledge-service-hpa
  namespace: ai-ks
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ai-knowledge-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 75
\`\`\`

## Spring Boot Graceful Shutdown

\`\`\`yaml
# application.yml
server:
  shutdown: graceful
spring:
  lifecycle:
    timeout-per-shutdown-phase: 30s
\`\`\`

When Kubernetes sends SIGTERM:
1. \`preStop\` sleep (5s) — allows the load balancer to drain traffic
2. Spring starts graceful shutdown — stops accepting new requests
3. In-flight requests complete (up to 30s)
4. JVM exits
5. \`terminationGracePeriodSeconds: 40\` > 35s total — Kubernetes waits before SIGKILL

## Multi-Tenant Database Isolation in Kubernetes

The application uses a single PostgreSQL connection pool but sets \`app.tenant_id\` per connection via a wrapper. In Kubernetes, the PostgreSQL connection string and credentials come from Secrets — never ConfigMaps:

\`\`\`bash
kubectl create secret generic ai-ks-secrets \\
  --from-literal=database-url="jdbc:postgresql://postgres:5432/aiknowledge" \\
  --from-literal=database-username="aiknowledge_app" \\
  --from-literal=database-password="$(openssl rand -base64 32)" \\
  --from-literal=openai-api-key="\${OPENAI_API_KEY}" \\
  -n ai-ks
\`\`\`
`,

'237.2': `# AI-Assisted Development — Workflow & Best Practices

AI coding assistants change not what you build but how fast you move through the mechanics. The capstone uses AI tooling deliberately: it accelerates boilerplate and exploration but never replaces engineering judgment on security, performance, and architecture.

## What AI Tooling Accelerates

### Boilerplate Generation

AI is exceptionally good at generating repetitive, structural code from a brief specification:

\`\`\`
Prompt: "Generate a Spring Boot REST controller for CRUD operations on
a Tenant entity. Use ResponseEntity, @Valid, @PathVariable, @RequestBody.
Include proper HTTP status codes (201 for create, 204 for delete, 404
with ProblemDetail for not found)."
\`\`\`

Review the output: verify that status codes are correct, validation annotations are present, and no logic has been silently omitted.

### Test Generation

\`\`\`
Prompt: "Write a @WebMvcTest for TenantController.createTenant().
Test: (1) valid input returns 201 with Location header,
(2) invalid input returns 400 with ProblemDetail,
(3) duplicate slug returns 409.
Mock TenantService with Mockito."
\`\`\`

AI-generated tests often miss edge cases. Add boundary tests yourself: what happens with a null body? A malformed UUID? A 5000-character slug?

### Infrastructure as Code

\`\`\`
Prompt: "Generate a Kubernetes Deployment YAML for a Spring Boot service
named ai-knowledge-service in the ai-ks namespace. Requirements:
- Non-root user (UID 1000)
- Liveness: /actuator/health/liveness, initialDelay 30s
- Readiness: /actuator/health/readiness, initialDelay 10s
- CPU request 250m, limit 1000m; Memory request 512Mi, limit 1Gi
- OPENAI_API_KEY from Secret named ai-ks-secrets
- terminationGracePeriodSeconds: 40"
\`\`\`

Always verify: resource limits are reasonable, probes point to real actuator endpoints, secret names match what you created.

### Explaining Unfamiliar Code

\`\`\`
Prompt: "Explain what this Kubernetes HPA configuration does, specifically
what triggers a scale-up and what the stabilization window means."
\`\`\`

Use AI to accelerate understanding of technologies new to you — Kustomize overlays, Kafka Streams DSL, Resilience4j configurations.

## What AI Tooling Should NOT Own

| Category | Why humans must review |
|----------|----------------------|
| JWT validation logic | A mistake here means any token is accepted |
| RLS policy SQL | An error leaks cross-tenant data |
| Secret management | AI cannot know which values are sensitive |
| Error handling at security boundaries | AI often swallows exceptions |
| Rate limit thresholds | Business and cost decisions, not code decisions |
| Data retention and deletion | Legal/compliance; AI cannot assess your obligations |

### The Trust-but-Verify Protocol

For any AI-generated code that touches security, auth, or data isolation:

1. Read every line — do not assume correctness
2. Run a negative test: does cross-tenant access return 404?
3. Run a missing-token test: does a request without a JWT return 401?
4. Check the logs: are secrets printed anywhere?
5. Have a second engineer review the diff before merging

## Effective Prompting Patterns for Spring Boot

**Provide context in the prompt:**
\`\`\`
Prompt: "I have a Spring Boot 3.4 application with Spring Security 6
and Resilience4j 2.x. My CircuitBreakerConfig currently uses COUNT_BASED
sliding window. Show me how to add a TimeLimiter that times out after 8s
and combines correctly with the existing circuit breaker in the right
decorator order."
\`\`\`

**Ask for trade-offs, not just implementation:**
\`\`\`
Prompt: "For a multi-tenant SaaS with potentially 1000 tenants,
compare: (1) one Redis key per user-session for conversation memory vs
(2) one Redis List per session. Consider memory usage, eviction,
and scan efficiency."
\`\`\`

**Iterate incrementally:**
- Start with a skeleton: \`"Give me the method signature and Javadoc for ChatService.processMessage() — just the interface, no implementation."\`
- Expand one section at a time: \`"Now implement the Redis cache-check portion only."\`
- Integrate and test before asking for the next section

## Measuring the Impact

Track in your capstone:

| Metric | How to measure |
|--------|---------------|
| Time on boilerplate vs design | Log it for 2 weeks |
| Bugs introduced by AI-generated code | Annotate in code review |
| Tests catching AI errors | Tag in CI failure notes |
| Architecture decisions AI influenced | ADR author attribution |

Honest measurement reveals where AI tooling genuinely accelerates you and where it introduces review overhead that cancels the gain.
`,

'237.3': `# Capstone Retrospective — Architecture, Decisions & What's Next

You have built a production-grade, AI-powered, multi-tenant SaaS backend. Before shipping to production, walk through this final review.

## What You Built

\`\`\`
┌─────────────────────────────────────────────────────────────┐
│              AI Knowledge Service — Full Stack               │
├──────────────────┬──────────────────┬───────────────────────┤
│   SECURITY       │   AI LAYER       │   DATA LAYER          │
│                  │                  │                        │
│ JWT (RS256)      │ Spring AI 1.x    │ PostgreSQL 16         │
│ TenantContext    │ OpenAI GPT-4o    │ pgVector (HNSW)       │
│ RLS Policies     │ RAG Pipeline     │ Flyway migrations     │
│ Role-based auth  │ Memory (Redis)   │ Redis 7               │
│                  │ Guardrails       │ Kafka 3.x             │
├──────────────────┼──────────────────┼───────────────────────┤
│   API            │   RESILIENCE     │   DELIVERY            │
│                  │                  │                        │
│ REST + OpenAPI   │ Circuit Breaker  │ Docker multi-stage    │
│ Problem Details  │ Retry + Backoff  │ Kubernetes (HPA, PDB) │
│ Idempotency keys │ Rate Limiter     │ GitHub Actions        │
│ SSE Streaming    │ Bulkhead         │ ArgoCD + Kustomize    │
│ HATEOAS links    │ Graceful shutdown│ DORA metrics          │
└──────────────────┴──────────────────┴───────────────────────┘
\`\`\`

## Architecture Decision Review

For each major decision made during the capstone, answer:

**1. Row-Level Security vs Schema-per-Tenant**
- Why you chose RLS: cost, single codebase, manageable at 1000 tenants
- When you would migrate: > 10,000 tenants, compliance requiring physical isolation, per-tenant backups needed

**2. pgVector vs Pinecone / Weaviate**
- Why you chose pgVector: fewer infrastructure components, ACID with business data, free for self-hosted
- When you would migrate: > 10M vectors per tenant, need multi-region vector replication, managed embeddings API

**3. Spring AI vs LangChain4j**
- Why you chose Spring AI: native Spring Boot integration, familiar advisor pattern, Spring ecosystem tooling
- When you would reconsider: team already invested in LangChain4j, need Python-first tooling for data science collaboration

**4. Kafka vs RabbitMQ**
- Why you chose Kafka: audit log retention, event replay for future analytics, partitioning by tenantId
- When you would choose RabbitMQ: simpler task queuing, no replay needed, smaller team operational capacity

## Production Readiness Checklist

Before this service goes live:

**Security**
- [ ] JWT signing key rotation procedure documented
- [ ] RLS policies tested with cross-tenant probe queries
- [ ] Secrets in Kubernetes Secret objects, not ConfigMaps or env literals
- [ ] HTTPS enforced end-to-end (Ingress TLS, internal mTLS via Istio or cert-manager)
- [ ] OpenAI API key has spending limits set

**Reliability**
- [ ] Circuit breakers configured for all external dependencies (OpenAI, Kafka, Redis, Postgres)
- [ ] PodDisruptionBudget allows at most 1 unavailable pod during node drain
- [ ] Graceful shutdown tested: in-flight requests complete under SIGTERM
- [ ] Kafka consumer DLT monitored and alerting configured

**Observability**
- [ ] Traces exported to Jaeger/Tempo with business attributes (tenantId, sessionId)
- [ ] SLO defined and burning rate alert configured in Prometheus
- [ ] Structured logging with trace ID correlation enabled
- [ ] Dashboard covers p50/p95/p99 latency, error rate, active sessions, token cost

**Operations**
- [ ] Runbook for common incidents (Redis eviction, Kafka consumer lag, OpenAI outage)
- [ ] Database backup and point-in-time recovery tested
- [ ] Chaos engineering: what happens when OpenAI is down for 5 minutes?

## What Comes Next

The capstone service is a foundation, not a ceiling. Natural next investments:

| Enhancement | Value | Complexity |
|-------------|-------|------------|
| Semantic caching (embedding similarity) | Reduce AI costs 30-60% | Medium |
| Per-tenant embedding model fine-tuning | Better domain-specific retrieval | High |
| Agentic loop (multi-step task execution) | Power users can delegate workflows | High |
| Multi-modal documents (images, tables) | Richer knowledge base | Medium |
| Tenant-level usage analytics dashboard | Product growth + billing | Low |
| Cross-tenant federated knowledge base | Enterprise feature | Very high |

## The Architect's Mindset

You have now worked through the full Spring Boot AI Architect curriculum. The most important skill developed is not a specific framework or pattern — it is the habit of:

1. **Naming the problem before naming the solution**
2. **Making trade-offs explicitly** and recording them in ADRs
3. **Designing for failure** — every external call will fail; the system must handle it
4. **Measuring first** — intuition about performance is usually wrong
5. **Using AI tooling deliberately** — it accelerates mechanics; you own the thinking

Carry these habits into every system you design. The frameworks will change; the thinking will not.
`,

}

export const quiz: Record<string, QuizQuestion[]> = {

'237.1': [
  {
    question: 'The capstone Kubernetes Deployment uses a preStop hook with `sleep 5`. What problem does this solve?',
    options: [
      'It gives the JVM time to compile hot methods before serving traffic',
      'It allows the load balancer to stop sending new requests before Spring begins graceful shutdown, preventing 502 errors during rolling updates',
      'It ensures the Flyway migration completes before the application accepts requests',
      'It delays the liveness probe check to allow the database connection pool to warm up',
    ],
    correctIndex: 1,
    explanation: 'Kubernetes removes the pod from service endpoints and sends SIGTERM simultaneously. Without a delay, the load balancer may still route traffic to the pod while Spring is shutting down. The sleep gives the load balancer time to drain.',
  },
  {
    question: 'Why are secrets (database password, OpenAI API key) stored in Kubernetes Secret objects rather than ConfigMaps?',
    options: [
      'ConfigMaps cannot store strings longer than 256 characters',
      'Kubernetes Secrets are base64-encoded and access can be restricted via RBAC; ConfigMaps are plain text with no access control separation',
      'Spring Boot\'s @Value annotation cannot read values from ConfigMaps',
      'Secrets are automatically encrypted at rest while ConfigMaps are not encrypted',
    ],
    correctIndex: 1,
    explanation: 'Secrets and ConfigMaps both store key-value data, but Secrets are designed for sensitive data: access can be restricted with RBAC separately from ConfigMaps, and they can be encrypted at rest with KMS integration. ConfigMaps are designed for non-sensitive configuration.',
  },
  {
    question: 'The HPA is configured with averageUtilization: 60 for CPU. When does it trigger a scale-up?',
    options: [
      'When any single pod\'s CPU exceeds 60%',
      'When the average CPU utilisation across all pods exceeds 60% of their CPU requests',
      'When the cluster node CPU reaches 60% of its total capacity',
      'When 60% of the configured maxReplicas are already running',
    ],
    correctIndex: 1,
    explanation: 'The HPA calculates the average CPU utilisation (actual / requested) across all pods. If this average exceeds 60%, it calculates how many replicas are needed to bring the average back to or below the target.',
  },
  {
    question: 'In the Kustomize structure, what is the role of `overlays/production/patch-resources.yaml`?',
    options: [
      'It replaces the base kustomization.yaml entirely for production',
      'It applies strategic-merge or JSON patches that override specific fields (e.g., resource limits) in the base manifest without duplicating the full YAML',
      'It defines production-only Kubernetes resources not present in the base',
      'It contains Helm chart values for the production release',
    ],
    correctIndex: 1,
    explanation: 'Kustomize patches modify specific fields in base manifests. The base has common configuration; overlays patch only the values that differ per environment (replicas, resource limits, image tags), keeping a single source of truth.',
  },
  {
    question: 'Why does the capstone Dockerfile copy the four JAR layers in a specific order (dependencies → spring-boot-loader → snapshot-dependencies → application)?',
    options: [
      'The Spring Boot launcher requires this exact load order to initialise correctly',
      'Layers that change least frequently are added first; Docker\'s layer cache skips unchanged layers during rebuild, making application code changes rebuild only the last layer',
      'The JVM class loader searches layers in this order, so frequently used classes must be first',
      'This order reduces the final image size by deduplicating shared classes across layers',
    ],
    correctIndex: 1,
    explanation: 'Docker layer caching works top-to-bottom. Libraries (dependencies) rarely change; the application class files change with every commit. Placing stable layers first means most rebuilds only invalidate and re-push the `application` layer — dramatically speeding up CI.',
  },
],

'237.2': [
  {
    question: 'According to the capstone workflow, which category of code should never be solely AI-generated without explicit human security review?',
    options: [
      'Kubernetes ConfigMap YAML files',
      'Spring Data repository interfaces with @Query annotations',
      'JWT validation logic and Row-Level Security policies',
      'OpenAPI documentation annotations',
    ],
    correctIndex: 2,
    explanation: 'JWT validation and RLS policies are security boundaries. A subtle error — a missing claim check, an incorrect policy condition — can silently grant access to all tenants\' data. These require deliberate human review and adversarial testing.',
  },
  {
    question: 'What does the "trust-but-verify protocol" recommend after AI generates a security-sensitive piece of code?',
    options: [
      'Run the existing test suite and merge if it passes',
      'Read every line, run negative tests (cross-tenant probe, missing JWT), check logs for secret exposure, and have a second engineer review',
      'Ask the AI to review its own output for security issues',
      'Deploy to staging and monitor error rates for 24 hours before merging',
    ],
    correctIndex: 1,
    explanation: 'AI tools can generate plausible-looking but subtly broken security code. Negative tests (prove that unauthorised access is denied) and log inspection (prove secrets are not printed) are mandatory verification steps.',
  },
  {
    question: 'Why is incremental prompting ("skeleton first, then one section at a time") more effective than asking AI to generate a complete complex implementation in one prompt?',
    options: [
      'LLMs have token limits that prevent generating large files',
      'Incremental prompting lets you test each section before building on it, catching errors before they compound and keeping you in control of the design',
      'AI coding assistants charge per token, so shorter prompts reduce cost',
      'The Spring Boot compiler cannot handle files generated in a single pass',
    ],
    correctIndex: 1,
    explanation: 'A large one-shot generation gives you a lot of code to review at once — errors compound, and an incorrect foundation invalidates everything built on it. Incremental generation lets you test each piece, correct errors early, and maintain architectural intent.',
  },
  {
    question: 'In the context of AI-assisted development, what does "AI should not own architecture decisions" mean in practice?',
    options: [
      'AI tools should not be used to explain architecture patterns',
      'Architectural choices (which database, which messaging system, how to handle tenant isolation) must be made by engineers who understand the constraints — AI can present options but humans evaluate trade-offs and write ADRs',
      'AI-generated code must not touch configuration files',
      'Only senior architects may use AI coding assistants',
    ],
    correctIndex: 1,
    explanation: 'Architecture decisions depend on non-obvious constraints: team skills, operational capacity, compliance requirements, cost envelopes, future roadmap. AI cannot assess these. Engineers make the decision; AI can assist research and generate options.',
  },
  {
    question: 'What is the primary purpose of tracking "bugs introduced by AI-generated code" as a capstone metric?',
    options: [
      'To satisfy university grading requirements for AI tool attribution',
      'To quantify whether AI-generated code actually reduces net defects or shifts review burden in ways that cancel the productivity gain',
      'To comply with open-source licence requirements for AI-generated contributions',
      'To identify which AI model produces fewer bugs for Java vs Kotlin',
    ],
    correctIndex: 1,
    explanation: 'Honest measurement reveals the real trade-off: AI tools speed up writing code but may increase review time if generated code is subtly wrong. Tracking bugs per origin tells you whether the net effect on quality is positive.',
  },
],

}

export const codingTask: Record<string, { instructions: string; boilerplate: string; rubric: string[]; hints: string[] }> = {

'237.3': {
  instructions: `## Capstone Final Project: Complete AI Knowledge Service — Core Integration

You have implemented the individual components throughout Part X. This final task wires them into a complete, testable integration: the full \`ChatService.processMessage()\` flow.

### Requirements

Implement \`ChatService.processMessage()\` completely, integrating all capstone components:

**Step 1 — Rate limiting:**
- Call \`rateLimiter.checkLimit(tenantId, userId, tenantService.getPlan(tenantId))\`
- If the rate limit is exceeded, the exception propagates (do not catch here)

**Step 2 — Cache check:**
- Compute \`cacheKey = tenantId + ":cache:chat:" + request.message().hashCode()\`
- Call \`redis.opsForValue().get(cacheKey)\`
- If non-null, deserialize and return immediately (call \`objectMapper.readValue(cached, ChatMessageResponse.class)\`)

**Step 3 — Build ChatClient:**
- Use \`chatClientBuilder\` with:
  - System prompt: "You are a helpful AI assistant. Answer using ONLY the provided context. If not in context, say so."
  - \`MessageChatMemoryAdvisor\` with conversation ID = \`tenantId + ":" + request.sessionId()\`
  - \`QuestionAnswerAdvisor\` with the vector store and \`SearchRequest\` filtered to \`tenant_id == '<tenantId>'\`, topK=5, threshold=0.65
  - \`SimpleLoggerAdvisor\`

**Step 4 — Call AI and extract result:**
- Call \`client.prompt().user(request.message()).call().chatResponse()\`
- Extract content from \`response.getResult().getOutput().getContent()\`
- Extract sources from \`response.getMetadata()\` using \`QuestionAnswerAdvisor.RETRIEVED_DOCUMENTS\` key (cast to \`List<Document>\`, map to distinct document_id metadata values)

**Step 5 — Persist messages:**
- Save two \`ChatMessage\` entities: one with role="user" and one with role="assistant"
- Use \`messageRepo.saveAll(List.of(userMsg, assistantMsg))\`; get the assistant message ID for the response

**Step 6 — Publish event:**
- Call \`eventPublisher.publish(DomainEvent.of("chat.message.created", tenantId, userId, new ChatMessagePayload(request.sessionId(), assistantMessageId, "assistant", tokenCount)))\`
- Get token count from \`response.getMetadata().getUsage().getTotalTokens()\`

**Step 7 — Cache and return:**
- Serialize the \`ChatMessageResponse\` with \`objectMapper.writeValueAsString(result)\`
- Store in Redis with \`Duration.ofMinutes(10)\` TTL
- Return the \`ChatMessageResponse\`

### Acceptance Criteria

- Rate-limited requests throw without reaching the AI model
- Cache hits return without any AI call or database write
- Every AI response is persisted as two ChatMessage rows (user + assistant)
- Every successful AI call publishes exactly one ChatMessageEvent to Kafka
- Sources are distinct document IDs extracted from the RAG retrieval metadata
- Cache is populated after every successful (non-cached) AI response
`,
  boilerplate: `import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.client.advisor.QuestionAnswerAdvisor;
import org.springframework.ai.chat.client.advisor.SimpleLoggerAdvisor;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.data.redis.core.RedisTemplate;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.util.List;

@Service
@Transactional
public class ChatService {

    private final ChatClient.Builder chatClientBuilder;
    private final VectorStore vectorStore;
    private final ChatMessageRepository messageRepo;
    private final DomainEventPublisher eventPublisher;
    private final TenantRateLimiter rateLimiter;
    private final TenantService tenantService;
    private final RedisTemplate<String, String> redis;
    private final ObjectMapper objectMapper;

    // Constructor injection (all fields required)
    public ChatService(ChatClient.Builder chatClientBuilder,
                       VectorStore vectorStore,
                       ChatMessageRepository messageRepo,
                       DomainEventPublisher eventPublisher,
                       TenantRateLimiter rateLimiter,
                       TenantService tenantService,
                       RedisTemplate<String, String> redis,
                       ObjectMapper objectMapper) {
        this.chatClientBuilder = chatClientBuilder;
        this.vectorStore       = vectorStore;
        this.messageRepo       = messageRepo;
        this.eventPublisher    = eventPublisher;
        this.rateLimiter       = rateLimiter;
        this.tenantService     = tenantService;
        this.redis             = redis;
        this.objectMapper      = objectMapper;
    }

    public ChatMessageResponse processMessage(String tenantId,
                                               String userId,
                                               ChatMessageRequest request) {
        // TODO: Step 1 — Rate limiting

        // TODO: Step 2 — Cache check

        // TODO: Step 3 — Build ChatClient with advisors

        // TODO: Step 4 — Call AI and extract content + sources

        // TODO: Step 5 — Persist user and assistant messages

        // TODO: Step 6 — Publish ChatMessageEvent

        // TODO: Step 7 — Cache result and return

        return null;
    }

    @SuppressWarnings("unchecked")
    private List<String> extractSources(ChatResponse response) {
        // TODO: get RETRIEVED_DOCUMENTS from response.getMetadata()
        // TODO: cast to List<Document>, map to distinct document_id metadata strings
        return List.of();
    }
}
`,
  rubric: [
    'Step 1: rateLimiter.checkLimit() is called before any AI or cache operation',
    'Step 2: cache key uses tenantId + ":cache:chat:" + message hashCode',
    'Step 2: non-null cache hit is deserialized and returned without AI call',
    'Step 3: ChatClient is built with MessageChatMemoryAdvisor using tenantId:sessionId as conversation ID',
    'Step 3: QuestionAnswerAdvisor includes tenant_id filter expression, topK=5, threshold=0.65',
    'Step 4: AI response content is extracted from getResult().getOutput().getContent()',
    'Step 5: both user and assistant ChatMessage entities are saved via messageRepo.saveAll()',
    'Step 6: DomainEvent.of("chat.message.created", ...) is published with correct token count',
    'Step 7: result is serialized and stored in Redis with 10-minute TTL',
    'extractSources() returns distinct document_id values from RETRIEVED_DOCUMENTS metadata',
  ],
  hints: [
    'Cache key: `String cacheKey = tenantId + ":cache:chat:" + request.message().hashCode();`',
    'Filter expression: `"tenant_id == \'" + tenantId + "\'"` passed to `SearchRequest.defaults().withFilterExpression(...)`.',
    'Conversation ID for memory: `tenantId + ":" + request.sessionId()`.',
    'In extractSources: `(List<Document>) response.getMetadata().get(QuestionAnswerAdvisor.RETRIEVED_DOCUMENTS)` then map to `d.getMetadata().get("document_id")`.',
    'Token count: `(int) response.getMetadata().getUsage().getTotalTokens()`. Store in Redis: `redis.opsForValue().set(cacheKey, json, Duration.ofMinutes(10))`.',
  ],
},

}
