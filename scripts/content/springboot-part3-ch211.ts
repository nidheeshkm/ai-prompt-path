// Part III — AI-Accelerated Spring Boot Dev
// Chapter 211: Prompt Engineering for Java Developers

import type { QuizQuestion } from '../../src/data/curriculum'

export const courseId = 'springboot-ai-architect'

export const content: Record<string, string> = {

'211.1': `# Prompt Patterns for Spring Boot Code Generation

Prompt engineering for code generation is different from prompt engineering for conversation. The goal is not a persuasive answer — it is compilable, correct, production-quality code that matches your codebase's conventions. Every word you add or remove changes what you get.

## The Four-Part Prompt Structure

The most reliable structure for Spring Boot code generation:

\`\`\`
[CONTEXT]   What the codebase looks like — stack, conventions, constraints
[ROLE]      What perspective the AI should take
[TASK]      What exactly to build — API, class, feature, refactoring
[FORMAT]    What the output should look like — files, annotations, test coverage
\`\`\`

Example applying all four:

\`\`\`
CONTEXT: Spring Boot 3.2, Java 21, PostgreSQL, Kafka, constructor injection,
         service-interface pattern, custom exceptions extending AppException.

ROLE: Senior backend engineer who values clean architecture and test coverage.

TASK: Implement WishlistService with add(userId, productId), remove(userId, productId),
      and getItems(userId) methods. Publishing WishlistItemAddedEvent to Kafka on add.
      WishlistItem entity with composite key (userId, productId, addedAt).

FORMAT: WishlistItem.java, WishlistRepository.java, WishlistService.java interface,
        WishlistServiceImpl.java, WishlistItemAddedEvent.java record,
        V3__create_wishlist.sql Flyway migration,
        WishlistServiceIntegrationTest.java with Testcontainers.
\`\`\`

This prompt costs 30 seconds to write and eliminates 95% of the follow-up corrections you would otherwise need.

## Specificity is the Lever

The single biggest improvement to prompt quality is specificity. Compare:

| Vague | Specific |
|---|---|
| "Add validation" | "Add @NotNull on email, @Size(min=8,max=100) on password, @Email on email, @Valid on @RequestBody" |
| "Handle errors" | "Throw UserNotFoundException(userId) — caught by GlobalExceptionHandler which returns 404" |
| "Add logging" | "Add @Slf4j, log at DEBUG for method entry with parameters, ERROR for caught exceptions with full stack trace" |
| "Use Spring Security" | "Require ROLE_ADMIN for POST and DELETE, ROLE_USER for GET, anonymous for /public/**" |
| "Write tests" | "Write Testcontainers integration tests with MockMvc, happy path + 400 validation error + 404 not found" |

Each specific prompt produces code that does not need a correction round.

## Package and Naming Conventions in Prompts

AI generates consistent naming when you tell it what naming to use:

\`\`\`
Package: com.myapp.feature.wishlist
Classes: WishlistItem (entity), WishlistItemDto (response record),
         AddToWishlistRequest (request record), WishlistItemAddedEvent (event record)
Repository: WishlistRepository extends JpaRepository<WishlistItem, WishlistItemId>
Service interface: WishlistService in com.myapp.feature.wishlist
Implementation: WishlistServiceImpl in com.myapp.feature.wishlist.impl
Exception: WishlistItemNotFoundException extends AppException
\`\`\`

Without this, AI invents names. With it, the generated code matches your codebase's naming conventions from day one.

## Asking for Alternatives

One underused technique: ask for two implementations and explain the tradeoffs:

\`\`\`
Implement product search with two approaches:
1. Spring Data derived query: findByNameContainingIgnoreCaseAndPriceBetween(...)
2. @Query with JPQL and Criteria API for dynamic optional filters

For each: show the code and explain when you would choose it.
\`\`\`

This produces a decision record, not just code. When you review with your team, you have the tradeoff analysis already written.

## Iteration Prompting

The first response is rarely perfect. Effective iteration:

**Round 1:** Generate the feature
**Round 2:** "The WishlistServiceImpl does not validate that the productId exists before adding. Add a ProductRepository lookup and throw ProductNotFoundException if not found."
**Round 3:** "The integration test is missing the case where add() is called with a productId that does not exist. Add that test."

Each round adds one missing constraint. Trying to specify everything in round 1 produces a prompt so long that AI loses track of parts of it.

## Anti-Patterns in Code Generation Prompts

| Anti-Pattern | Problem | Fix |
|---|---|---|
| "Write a service for products" | Too vague — generates generic code that won't fit your codebase | Specify every method, dependency, and convention |
| "Fix this code" without sharing the code | AI has nothing to work with | Always include the code, the error, and the expected behaviour |
| "Make it better" | Subjective — AI will change things you didn't want changed | Specify the dimension: "improve error handling", "reduce duplication", "add missing validation" |
| Single mega-prompt for a whole feature | Long context dilutes attention | Break into: entity → repository → service → controller → tests, each as a separate prompt |
| No convention constraints | AI uses its training defaults, not your project's standards | Always include injection style, DTO pattern, exception approach |`,

'211.2': `# Context Strategies for Large Spring Boot Codebases

As a codebase grows, context management becomes as important as prompt writing. AI models have token limits — you cannot paste every file. Choosing the right files to include in context is a skill that separates effective AI users from frustrated ones.

## What to Include vs. What to Omit

**Always include:**
- The **interface** of the service you're building (if it exists)
- The **most similar existing class** in the codebase — AI uses it as a template
- The **exception hierarchy** — so AI throws the right exceptions
- The **entity** the feature operates on
- The **test class** of the similar existing feature — so AI follows your test conventions

**Usually omit:**
- Implementation classes of unrelated services (the interface is enough)
- Configuration classes (Spring, Security, Kafka) — unless the task directly involves them
- Migration files for other features
- The full repository if only 1-2 methods are relevant

**Example — building WishlistService:**

\`\`\`
@file src/main/java/com/myapp/feature/product/ProductService.java      ← template
@file src/main/java/com/myapp/feature/product/ProductServiceImpl.java   ← implementation template
@file src/main/java/com/myapp/domain/WishlistItem.java                  ← the entity
@file src/main/java/com/myapp/exception/AppException.java               ← exception base
@file src/test/java/com/myapp/feature/product/ProductServiceIntegrationTest.java ← test template

Generate WishlistService and WishlistServiceImpl following the same patterns.
\`\`\`

Cursor's \`@codebase\` does semantic search instead of file selection — it finds the most relevant context automatically. For Claude Code, explicit \`@file\` gives you more control and is less expensive.

## System Prompts for Cursor Rules and CLAUDE.md

The most efficient context mechanism: write project conventions once, reference everywhere.

**Cursor .cursorrules** (auto-injected in every prompt):
\`\`\`
Stack: Java 21, Spring Boot 3.2, PostgreSQL 16, Kafka 3.7, Redis 7, Testcontainers
Injection: @RequiredArgsConstructor only — never @Autowired
DTOs: Java records for read, @Builder classes for write/create
Exceptions: Extend AppException, handled by GlobalExceptionHandler → HTTP status from @ResponseStatus
Tests: Testcontainers integration tests for services, MockMvc for controllers
Queries: Spring Data derived queries for simple cases, @Query JPQL for complex cases
Events: Records implementing DomainEvent, published via ApplicationEventPublisher
\`\`\`

This 10-line block replaces the CONTEXT section of every individual prompt. Your per-prompt context budget is now free for task-specific detail.

## Managing Token Limits

When a class is too large to include in full, include only what matters:

### Method signature extraction
Instead of pasting an entire 500-line service:
\`\`\`
// ProductServiceImpl public interface (method signatures only):
public ProductDto create(CreateProductRequest request) — validates SKU uniqueness, saves, returns DTO
public ProductDto findById(UUID id) — throws ProductNotFoundException if not found
public Page<ProductDto> findAll(Pageable pageable) — returns page of active products
public void delete(UUID id) — soft-deletes (sets active=false), throws if not found
// Full implementation available at: ProductServiceImpl.java
\`\`\`

This gives AI the behavioural contract (what each method does, what it throws) without the full implementation body.

### Selective method inclusion
If refactoring one method in a 20-method class:
\`\`\`
[Context: OrderService has 20 methods. Sharing only the relevant ones:]

// The method to refactor:
public void processRefund(Order order, BigDecimal amount) {
    // ... current implementation
}

// The exception classes it should use:
public class RefundAmountExceededException extends AppException { ... }
public class OrderNotEligibleForRefundException extends AppException { ... }
\`\`\`

## Using @docs for Always-Current API Reference

Framework APIs change. Training data is frozen. The gap causes hallucinated APIs.

Add these to Cursor's @docs settings (or reference as URLs in Claude Code):
- Spring Boot 3.2 Reference: \`https://docs.spring.io/spring-boot/docs/3.2.x/reference/htmlsingle/\`
- Spring Data JPA: \`https://docs.spring.io/spring-data/jpa/docs/current/reference/html/\`
- Spring Security 6.x: \`https://docs.spring.io/spring-security/reference/index.html\`
- Spring AI 1.x: \`https://docs.spring.io/spring-ai/reference/\`
- Testcontainers: \`https://java.testcontainers.org/\`

When you then ask "how do I configure Spring AI with the Anthropic provider", the answer is grounded in the actual 1.x API — not the 0.8.x training data.

## The Interface-First Context Strategy

For a new service, always provide the interface as context even before it exists — write it yourself in the prompt:

\`\`\`
Build the implementation for this service interface:

public interface SubscriptionService {
    SubscriptionDto subscribe(UUID userId, PlanId planId);     // creates subscription, charges first payment
    SubscriptionDto cancel(UUID userId, CancellationReason reason); // marks cancelled, refunds prorated
    SubscriptionStatus getStatus(UUID userId);                 // returns current plan and next billing date
}

Exceptions to throw:
- UserAlreadySubscribedException if userId already has an active subscription
- PaymentFailedException if the payment service returns a failure

Follow: @file src/main/java/com/myapp/feature/product/ProductServiceImpl.java conventions.
\`\`\`

Defining the interface yourself ensures the generated implementation matches your design intent, not AI's default guess about what a subscription service should look like.`,

'211.3': `# Multi-Step Prompting for Complex Spring Boot Features

Complex features — those spanning entities, services, events, and APIs — should not be attempted in a single prompt. A single mega-prompt produces code that is internally inconsistent (the controller returns a DTO that the service doesn't produce) or that drifts from your conventions in some parts. Multi-step prompting gives you checkpoints to verify each layer before building on it.

## The Vertical Slice Prompt Chain

A complete feature should be built in this order, verifying each step:

\`\`\`
Step 1: Entity + Migration
Step 2: Repository (derived queries and custom @Query methods)
Step 3: Service interface + implementation + unit tests
Step 4: Controller + request/response DTOs + integration tests
Step 5: Event (if async) + consumer (if needed)
\`\`\`

### Step 1 — Entity + Migration

\`\`\`
CONTEXT: PostgreSQL 16, JPA, Flyway, Java 21.
Conventions: UUIDs as primary keys (gen_random_uuid()), @CreatedDate/@LastModifiedDate
from Spring Data Auditing, @Version for optimistic locking.

Create:
1. Subscription.java @Entity with fields:
   - id UUID
   - userId UUID (indexed)
   - planId (enum: BASIC, PRO, ENTERPRISE)
   - status (enum: ACTIVE, CANCELLED, PAST_DUE)
   - startDate LocalDate
   - nextBillingDate LocalDate
   - createdAt / updatedAt (audited)
   - version (for optimistic locking)
2. V5__create_subscriptions.sql — creates table with correct column types, index on user_id
\`\`\`

Review the entity and migration before proceeding. Does the entity match your domain model? Is the migration using the correct column types (UUID, DATE, VARCHAR with enum check constraint)?

### Step 2 — Repository

\`\`\`
@file src/main/java/com/myapp/subscription/Subscription.java

Create SubscriptionRepository extends JpaRepository<Subscription, UUID>:
- findByUserId(UUID userId) → Optional<Subscription>
- findByUserIdAndStatus(UUID userId, SubscriptionStatus status) → Optional<Subscription>
- findAllByNextBillingDateBefore(LocalDate date) → List<Subscription> (for billing job)
- @Query for: count active subscriptions per plan (returns Map<PlanId, Long>)

No implementation needed — Spring Data generates it.
\`\`\`

### Step 3 — Service

\`\`\`
@file src/main/java/com/myapp/subscription/SubscriptionRepository.java
@file src/main/java/com/myapp/subscription/Subscription.java
@file src/main/java/com/myapp/feature/product/ProductServiceImpl.java (template)
@file src/main/java/com/myapp/exception/AppException.java

Create SubscriptionService interface + SubscriptionServiceImpl:
Methods: subscribe(userId, planId), cancel(userId, reason), getStatus(userId)
Events: publish SubscriptionCreatedEvent and SubscriptionCancelledEvent via ApplicationEventPublisher
Exceptions: UserAlreadySubscribedException, SubscriptionNotFoundException extends AppException

Also create: SubscriptionServiceTest with @ExtendWith(MockitoExtension.class), mock the repository,
test happy path and exception cases for each method.
\`\`\`

Run the unit tests. If they pass, proceed to the controller.

### Step 4 — Controller

\`\`\`
@file src/main/java/com/myapp/subscription/SubscriptionService.java
@file src/test/java/com/myapp/feature/product/ProductControllerIntegrationTest.java (template)

Create SubscriptionController at /api/v1/subscriptions:
- POST /   → subscribe (ROLE_USER)
- DELETE / → cancel (ROLE_USER)
- GET /status → getStatus (ROLE_USER)

DTOs: SubscribeRequest record (planId), CancelRequest record (reason),
      SubscriptionStatusDto record (planId, status, nextBillingDate)

Also create: SubscriptionControllerIntegrationTest with Testcontainers + MockMvc,
covering: happy path for each endpoint, 409 for duplicate subscribe, 404 for cancel-not-subscribed,
403 for wrong role.
\`\`\`

## Feature Flags with Multi-Step Prompting

When building a risky feature, use prompting to build the feature flag gate alongside the implementation:

\`\`\`
Step 1: Create a FeatureFlags @Configuration bean that reads from application.yml:
  features.subscription-v2.enabled: false  ← default off

Step 2: Implement SubscriptionServiceV2 (the new version)

Step 3: Create a SubscriptionServiceRouter that injects both V1 and V2 and delegates based on the flag

Step 4: Swap the @Primary annotation — at flag=true, V2 is primary
\`\`\`

This gives you a clean toggle without if/else scattered through the codebase.

## When to Use One Prompt vs. Many

| Scenario | Approach |
|---|---|
| Simple CRUD feature, 1 entity | Single prompt works — AI handles the full slice |
| Feature with events, 2+ entities, complex business rules | 4-5 step chain |
| Refactoring an existing class | One prompt per class (Cursor Cmd+K) |
| Full codebase migration (javax→jakarta) | Single sweeping Claude Code prompt |
| Security review | One prompt per controller/package |
| Architecture analysis | One prompt — full @codebase |

The heuristic: if the output of step N determines what step N+1 should look like, break it into steps. If the output of all steps is independent, do it in one.`,
}

export const quiz: Record<string, QuizQuestion[]> = {

'211.1': [
  {
    question: 'Which element of the four-part prompt structure (Context, Role, Task, Format) has the biggest impact on avoiding correction rounds?',
    options: [
      'Role — telling AI to be a "senior engineer" ensures higher quality output',
      'Format — specifying exact file names, classes, and annotations prevents AI from inventing its own structure',
      'Context — providing the stack and conventions ensures generated code matches the project',
      'Task — the more detailed the task description the better',
    ],
    correctIndex: 2,
    explanation: 'Context is the highest leverage element because it defines the "universe" the AI is working in — without it, AI defaults to its training distribution (which may be Spring Boot 2.x, different package names, different exception patterns). A precise context means every generated class matches your codebase\'s existing style without correction.',
  },
  {
    question: 'You ask AI to "add validation" to a request class. What is the most common failure mode of this vague prompt?',
    options: [
      'AI adds @Valid to the wrong class',
      'AI adds generic @NotNull everywhere without understanding which fields are truly required vs. optional in your domain',
      'AI refuses to generate code without knowing the complete validation rules',
      'AI generates code that uses javax.validation instead of jakarta.validation',
    ],
    correctIndex: 1,
    explanation: '@NotNull on every field is the lazy interpretation of "add validation". In a real domain, some fields are optional (middle name), some have specific constraints (password must be 8-100 chars, email must match RFC 5322). Saying "add @NotNull on email and userId, @Size(min=8, max=100) on password, @Email on email" gets you the right validation in one round.',
  },
  {
    question: 'What is the benefit of asking for two alternative implementations in one prompt?',
    options: [
      'AI generates more code, which is always better for completeness',
      'You get a comparison with tradeoffs explained, creating a decision record without additional effort',
      'AI is more reliable when it has two options to choose between',
      'Two alternatives ensure at least one of them will compile correctly',
    ],
    correctIndex: 1,
    explanation: 'Asking for alternatives forces AI to articulate the tradeoffs it would otherwise silently choose between. The output is not just code — it is a documented comparison: "Use derived queries for simple filters; use Criteria API for dynamic multi-parameter filters." This is the decision record your team needs for future maintenance.',
  },
  {
    question: 'Why is a single mega-prompt for an entire feature often less effective than a series of smaller prompts?',
    options: [
      'AI models have a hard token limit that prevents processing large prompts',
      'Long prompts dilute attention — AI may follow early instructions well but drift from constraints stated later in the prompt',
      'Smaller prompts are cheaper in API costs',
      'AI cannot generate multiple files in a single response',
    ],
    correctIndex: 1,
    explanation: 'AI attention is not uniform across a long context. Instructions near the end of a 2,000-word prompt receive less "weight" than those near the beginning. A mega-prompt for entity + repository + service + controller + tests often produces a controller that returns a DTO the service doesn\'t generate. Separate prompts with explicit verification at each step catch this before it compounds.',
  },
  {
    question: 'You specify package names, class names, and exception types in your prompt. What problem does this solve?',
    options: [
      'It prevents AI from generating code that uses deprecated APIs',
      'It eliminates naming inconsistency — the generated code matches your codebase\'s conventions from day one without renaming',
      'It allows AI to understand the database schema automatically',
      'It reduces the number of files AI needs to generate',
    ],
    correctIndex: 1,
    explanation: 'AI defaults to naming based on its training distribution: "UserService", "getUserById", "UserNotFoundException". Your codebase may use "MemberService", "findMemberById", "MemberNotFoundException". Without explicit naming in the prompt, every generated class needs a rename-and-move pass. Naming in the prompt eliminates this entirely.',
  },
],

'211.2': [
  {
    question: 'When selecting context files to include for building a new service, which file provides the most value?',
    options: [
      'The application.properties configuration file',
      'An existing similar service in the codebase — AI uses it as a template for conventions',
      'The full Flyway migration history to understand the database schema',
      'The Spring Security configuration class',
    ],
    correctIndex: 1,
    explanation: 'An existing similar service (e.g., ProductServiceImpl when building WishlistServiceImpl) gives AI a concrete example of your injection style, exception handling pattern, DTO mapping approach, and method naming conventions. AI reverse-engineers your project\'s conventions from this one file and applies them to the new service automatically.',
  },
  {
    question: 'Why does the "interface-first context strategy" produce better AI-generated implementations?',
    options: [
      'Spring Boot requires interfaces for all services — this enforces the necessary contract',
      'Writing the interface yourself defines the exact method signatures, return types, and exceptions — AI implements what you designed, not what it guesses you need',
      'Interfaces reduce the number of tokens needed in the prompt',
      'AI models are specifically trained on interface-implementation pairs',
    ],
    correctIndex: 1,
    explanation: 'When you write the interface, you make the design decisions: method names, parameter types, return types, and exception types. AI\'s job is then just implementation — which it does well. When you omit the interface, AI also makes the design decisions, which may not match your domain model, naming conventions, or intended exception strategy.',
  },
  {
    question: 'What is the correct way to handle a 500-line service class that exceeds your context budget?',
    options: [
      'Pass the entire file anyway — AI handles large contexts gracefully',
      'Include method signatures with brief behavioural descriptions instead of full implementations',
      'Omit the service class entirely and only include the interface',
      'Summarise the class in prose: "There is a service that manages products"',
    ],
    correctIndex: 1,
    explanation: 'Method signatures with one-line behavioural descriptions give AI the contract (what each method does, what it throws) without the implementation details it doesn\'t need. This is more useful than prose summarisation (which loses type information) and more token-efficient than the full class.',
  },
  {
    question: 'Why should @docs be configured in Cursor to point to Spring AI 1.x documentation?',
    options: [
      'Cursor requires @docs to be configured before it can generate any code',
      'AI training data may contain Spring AI 0.x APIs (pre-GA) that were renamed or removed — @docs grounds answers in the current 1.x API',
      '@docs provides Cursor with access to real-time Stack Overflow answers',
      'Without @docs, Cursor cannot access the Spring AI dependency from Maven Central',
    ],
    correctIndex: 1,
    explanation: 'Spring AI had significant API changes between 0.8.x and 1.0 GA. Training data contains both versions, and AI may suggest the old API (e.g., ChatClient constructor vs. ChatClient.builder()). Pointing @docs at the 1.x reference documentation means AI answers are grounded in the current public API, not historical beta versions.',
  },
  {
    question: 'What is the Cursor .cursorrules file\'s practical effect on development speed?',
    options: [
      'It speeds up Cursor\'s code indexing by telling it which files to prioritise',
      'It eliminates the Context section from every individual prompt — conventions are injected automatically, freeing prompt budget for task specifics',
      'It allows Cursor to run code without asking for permission',
      'It configures which AI model Cursor uses for each type of task',
    ],
    correctIndex: 1,
    explanation: 'Without .cursorrules, every prompt must include: "Use constructor injection, DTOs are records, exceptions extend AppException, use Testcontainers for tests..." — 200+ tokens of context setup. .cursorrules injects this automatically. In a team of 10 developers each writing 20 prompts a day, this saves thousands of tokens of context and eliminates repeated convention corrections.',
  },
],

'211.3': [
  {
    question: 'In the vertical slice prompt chain, why is the entity + migration the correct first step?',
    options: [
      'JPA requires entities to be registered before services can use them',
      'All subsequent layers (repository, service, controller) depend on the entity\'s fields and types — errors in the entity propagate through every layer',
      'The migration must be applied to the database before Spring Boot can start',
      'It is easier to start with entities because they have no dependencies on other layers',
    ],
    correctIndex: 1,
    explanation: 'If the Subscription entity uses LocalDate for nextBillingDate but your business logic needed LocalDateTime, every subsequent layer has the wrong type. Verifying the entity first — field types, relationships, constraints — catches this before 4 more files are generated on top of a wrong foundation.',
  },
  {
    question: 'You are building a feature that uses events. In the multi-step prompt chain, at which step should the event classes be created?',
    options: [
      'Step 1 — events are part of the domain and should be defined alongside the entity',
      'Step 3 (service) — the service publishes events, so they should be defined at that step with the service that uses them',
      'Step 5 — events are infrastructure concerns and should be last',
      'Events should be in a separate top-level prompt not tied to the feature steps',
    ],
    correctIndex: 1,
    explanation: 'The service is the publisher. Defining event records in step 3 alongside the service ensures the event\'s fields match exactly what the service has available at publish time. Defining events in step 1 risks defining event fields that don\'t exist yet on the entity. Defining in step 5 means the service code has to be revised.',
  },
  {
    question: 'You have a complex feature with 3 entities, cross-service events, and 6 API endpoints. What is the correct prompting strategy?',
    options: [
      'Write one comprehensive prompt with all details — more context gives better results',
      'Break into a step chain: entities → repositories → services (with unit tests) → controllers (with integration tests) → events and consumers',
      'Let AI design the feature by describing only the high-level business requirement',
      'Use one prompt per file since AI cannot coordinate multi-file generation',
    ],
    correctIndex: 1,
    explanation: 'With 3 entities, cross-service events, and 6 endpoints, a single prompt produces inconsistencies — DTOs that don\'t match service return types, event fields that don\'t match entity fields. Checkpoints between layers let you verify each layer before building on it, catching misalignment early when it\'s a one-line fix rather than a cross-file correction.',
  },
  {
    question: 'What is the risk of asking AI to build a feature with a single mega-prompt in a large Spring Boot codebase?',
    options: [
      'AI cannot process prompts longer than 500 tokens',
      'AI may generate code that is internally consistent but uses different patterns in different files, or that ignores later-stated constraints',
      'AI will generate too many files, making it hard to review',
      'Large prompts always produce code that does not compile',
    ],
    correctIndex: 1,
    explanation: 'Internal inconsistency is the primary risk: the controller\'s DTO and the service\'s return type may diverge. Pattern drift is the secondary risk: the controller follows your conventions but the test class uses a different approach because the prompt was long enough that later convention constraints received less model attention. Multi-step prevents both by making each layer explicit and verified.',
  },
  {
    question: 'When should you use a single sweeping Claude Code prompt rather than a step chain?',
    options: [
      'Always — single prompts are always more efficient',
      'For mechanical transformations across the whole codebase: namespace migrations, field injection → constructor injection, class → record conversions',
      'Only for trivial single-file changes',
      'When working on a feature you have built many times before',
    ],
    correctIndex: 1,
    explanation: 'Mechanical transformations (javax→jakarta, @Autowired→@RequiredArgsConstructor, DTO class→record) have no design decisions — they are pure substitutions. AI applies them correctly across hundreds of files in one pass with ./mvnw compile as verification. These are the scenarios where a sweeping single prompt beats step chains: no design decisions, pure mechanical consistency, verifiable by compilation.',
  },
],
}

export const codingTask: Record<string, {
  instructions: string
  boilerplate: string
  rubric: string[]
  hints: string[]
}> = {

'211.3': {
  instructions: `Apply the vertical slice multi-step prompting strategy to design and implement a \`Coupon\` feature for an e-commerce Spring Boot backend.

**You will write the PROMPTS, not the code.**

Design a 4-step prompt chain that would generate the complete Coupon feature:
- Coupons have: code (unique string), discountPercent (0-100), expiryDate, maxUses, currentUses, active flag
- POST /api/v1/coupons — create coupon (ADMIN only)
- POST /api/v1/coupons/apply — apply coupon to a cart (returns discount amount)
- GET /api/v1/coupons/{code} — get coupon details (ADMIN only)
- Business rules: coupon must be active, not expired, not exceeded maxUses

Write 4 prompts (Steps 1-4) following the vertical slice chain:
1. Entity + Flyway migration prompt
2. Repository + service interface + service implementation prompt
3. Controller + DTOs prompt
4. Integration tests prompt

Each prompt must include: Context section, specific class names with package paths, field names with types, exception names, and expected output files.`,
  boilerplate: `// Step 1 Prompt: Entity + Flyway Migration
// ============================================
CONTEXT:
[TODO: List stack, Java version, Spring Boot version, conventions]

TASK:
[TODO: Describe Coupon entity with all fields and types]
[TODO: Describe the Flyway migration — table name, column types, constraints]

OUTPUT FILES:
[TODO: List exact file paths to generate]

// Step 2 Prompt: Repository + Service
// =====================================
CONTEXT:
[TODO: Reference the entity file from Step 1]
[TODO: Reference a similar existing service as template]

TASK:
[TODO: List repository method signatures]
[TODO: List service interface methods with return types and exceptions]
[TODO: Describe service implementation business rules for apply()]

OUTPUT FILES:
[TODO: List exact file paths]

// Step 3 Prompt: Controller + DTOs
// ==================================
CONTEXT:
[TODO: Reference the service interface from Step 2]
[TODO: Reference a similar existing controller as template]
[TODO: Reference SecurityConfig for auth requirements]

TASK:
[TODO: List every endpoint with HTTP method, path, auth requirement, request/response types]
[TODO: List DTO classes/records with all fields]

OUTPUT FILES:
[TODO: List exact file paths]

// Step 4 Prompt: Integration Tests
// ==================================
CONTEXT:
[TODO: Reference controller from Step 3]
[TODO: Reference a similar existing integration test as template]

TASK:
[TODO: List every test scenario: happy paths + error cases + auth failures]

OUTPUT FILES:
[TODO: List exact file path]`,
  rubric: [
    'Step 1 prompt specifies exact Java field types (String, Integer, LocalDate, boolean) not just field names',
    'Step 1 prompt specifies Flyway migration constraints (UNIQUE on code, CHECK on discountPercent 0-100)',
    'Step 2 prompt explicitly references the Step 1 entity file in the context section',
    'Step 2 prompt names all custom exceptions (CouponNotFoundException, CouponExpiredException, etc.)',
    'Step 2 prompt describes apply() business rules in the task section (active check, expiry check, maxUses check)',
    'Step 3 prompt specifies security requirements per endpoint (ADMIN vs USER vs anonymous)',
    'Step 3 prompt names every DTO record with its exact fields and types',
    'Step 4 prompt lists at least 8 distinct test scenarios including auth failures and business rule violations',
    'Each prompt names the existing template file it should follow for conventions',
    'Prompts are sequential — each references output from the previous step as context',
  ],
  hints: [
    'Step 1 context: "Java 21, Spring Boot 3.2, PostgreSQL 16, Flyway, @CreatedDate/@LastModifiedDate auditing"',
    'Step 2: include the exception base class file in context — AI will extend it correctly',
    'Step 3: include SecurityConfig in context so AI knows which roles exist in your project',
    'Step 4: specify "@BeforeEach truncates the coupons table" and "use @WithMockUser for auth tests"',
  ],
},
}
