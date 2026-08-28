// Part III — AI-Accelerated Spring Boot Dev
// Chapter 212: Building Your First AI-Enhanced Spring Boot Feature

import type { QuizQuestion } from '../../src/data/curriculum'

export const courseId = 'springboot-ai-architect'

export const content: Record<string, string> = {

'212.1': `# Planning a Feature with AI — Architecture First

The most common mistake developers make with AI coding tools is jumping directly to code generation. Experienced AI-augmented developers spend 15-20 minutes on design before writing a single line. The design prompt is the most important prompt in the workflow.

## Why Architecture-First Matters

AI is excellent at implementing a spec. It is mediocre at designing one. If you ask "build me a notification system", AI will build something generic that may not fit your architecture, domain model, or scale requirements. If you specify "build a notification service that: publishes to Kafka, persists to PostgreSQL for retry, integrates with our existing User entity, and supports email + push channels" — AI builds exactly that.

The design phase answers:
- What entities and tables are needed?
- What are the API contracts (request/response shapes)?
- What events flow between services?
- What are the failure modes and how are they handled?
- What are the performance requirements (expected volume)?

You make these decisions. AI implements them.

## The Technical Design Prompt

Use AI to stress-test your design before implementing it:

\`\`\`
I am designing a ProductReview feature for an e-commerce backend. Here is my design:

Entity: ProductReview
- id: UUID
- productId: UUID (FK to products)
- userId: UUID (FK to users)
- rating: int (1-5)
- comment: String (max 1000 chars)
- status: enum PENDING | APPROVED | REJECTED
- createdAt: LocalDateTime

API:
- POST /api/v1/products/{productId}/reviews — submit review (ROLE_USER, one review per product per user)
- GET /api/v1/products/{productId}/reviews — list approved reviews (anonymous, paginated)
- PATCH /api/v1/admin/reviews/{reviewId}/status — approve/reject (ROLE_ADMIN)

Events:
- ReviewSubmittedEvent → triggers content moderation (async, via Kafka)
- ReviewApprovedEvent → updates product's average rating

Review my design and identify:
1. Missing constraints (what prevents spam? what if productId doesn't exist?)
2. Missing edge cases in the API (what if the user reviews their own product?)
3. Performance concerns (the average rating update — is an event the right approach?)
4. Security gaps
5. Missing error responses (which HTTP codes need explicit handling?)

Do not generate code. Return a structured review of my design.
\`\`\`

AI produces a critical review that often surfaces 3-5 issues you hadn't considered. In a traditional team, this is what a senior architect does in a 30-minute design review — AI does it in 30 seconds.

## Refining the Design Based on AI Feedback

AI's review might flag:
- "No constraint preventing a user from submitting multiple reviews for the same product" → add unique index on (productId, userId), throw DuplicateReviewException
- "The average rating update via event is eventually consistent — the product's displayed rating may lag by seconds" → acceptable? or should you use a synchronous update for the same transaction?
- "No rate limiting on the review endpoint — a user could spam 1000 reviews per minute" → add rate limiting middleware

You decide which concerns to address. Then you update the design and generate implementation.

## API Contract Design with AI

Before building the controller, define the API contract in detail:

\`\`\`
Based on the ProductReview feature, define the complete API contracts:

For each endpoint provide:
- HTTP method and path
- Authentication requirement
- Request body (JSON schema with field names, types, constraints)
- Success response (HTTP code, body shape)
- Error responses (HTTP code, error body for each failure mode)

Output as an OpenAPI-style specification, not code.
\`\`\`

The output is a specification document. Share it with your team for alignment before generating any code. Once everyone agrees on the API shape, implementation is mechanical.

## When AI Is Wrong About Design

AI makes confident design mistakes. Watch for:

- **Over-engineering**: AI suggests event sourcing + CQRS for a simple CRUD feature — "this is a read-heavy feature with no complex domain logic; standard JPA is correct"
- **Premature optimisation**: AI suggests Redis caching before you have measured a performance problem
- **Framework religion**: AI recommends reactive WebFlux for a team comfortable with MVC — unless you need the concurrency model, this adds complexity without benefit
- **Hallucinated constraints**: AI says "Spring Data JPA doesn't support composite unique constraints" — it does

When AI makes a design recommendation you don't understand, ask: "Explain the specific problem this solves in our context, and what the downside is." Force it to justify the design, not just state it.

## The Design Checkpoint

Before writing any code, you should have:
- [ ] Entity fields and types confirmed
- [ ] Flyway migration planned (table name, columns, constraints, indexes)
- [ ] API contracts documented (request/response for every endpoint)
- [ ] Exception hierarchy planned (what exceptions to throw, what HTTP codes they map to)
- [ ] Event flow documented (if async)
- [ ] Security requirements per endpoint confirmed
- [ ] Edge cases identified and decided (handle or defer)

Once this checklist is complete, implementation with AI is fast, consistent, and requires minimal correction.`,

'212.2': `# AI Pair Programming — Building the Full Vertical Slice

With a solid design (from 212.1), implementation with AI pair programming follows a predictable, high-velocity rhythm. This topic walks through a complete ProductReview feature implementation, showing exactly what to say and when.

## Setting Up the Session

Start a Claude Code session in the project root:

\`\`\`bash
claude
> Read CLAUDE.md and the following files to understand the project conventions:
  @file src/main/java/com/myapp/feature/product/ProductServiceImpl.java
  @file src/test/java/com/myapp/feature/product/ProductControllerIntegrationTest.java

  We are building the ProductReview feature. Here is the design:
  [paste the design document from 212.1]

  Start with Step 1: create the ProductReview entity and V5 Flyway migration.
  After generating, run ./mvnw compile to verify.
\`\`\`

## Layer-by-Layer Implementation

### Entity + Migration
Claude Code generates:
- \`ProductReview.java\` — JPA entity with all fields, auditing, optimistic lock
- \`V5__create_product_reviews.sql\` — table with unique index on (product_id, user_id)

Review the entity: are the column types correct? Is the unique constraint right? Approve and continue.

### Repository
\`\`\`
> Generate ProductReviewRepository:
  - existsByProductIdAndUserId(UUID productId, UUID userId): boolean
  - findByProductIdAndStatus(UUID productId, ReviewStatus status, Pageable pageable): Page<ProductReview>
  - findByIdAndUserId(UUID id, UUID userId): Optional<ProductReview>
  - @Query: average rating for a productId where status = APPROVED, return OptionalDouble
\`\`\`

Derived query names are self-documenting — Spring Data generates the SQL. Review: does \`findByProductIdAndStatus\` with a \`Pageable\` parameter return what the controller needs?

### Service
\`\`\`
> @file src/main/java/com/myapp/feature/review/ProductReviewRepository.java
  @file src/main/java/com/myapp/feature/review/ProductReview.java
  @file src/main/java/com/myapp/exception/AppException.java
  @file src/main/java/com/myapp/feature/product/ProductServiceImpl.java (template)

  Generate ProductReviewService interface + ProductReviewServiceImpl:

  submitReview(userId, productId, SubmitReviewRequest):
  - Check product exists (productRepository.existsById) → throw ProductNotFoundException
  - Check user hasn't already reviewed this product → throw DuplicateReviewException
  - Save with status PENDING
  - Publish ReviewSubmittedEvent (productId, reviewId, userId)
  - Return ProductReviewDto

  listApprovedReviews(productId, Pageable):
  - Return Page<ProductReviewDto> filtered by APPROVED status

  moderateReview(reviewId, ReviewModerationRequest):
  - Find review → throw ReviewNotFoundException if not found
  - Update status to APPROVED or REJECTED
  - If APPROVED: publish ReviewApprovedEvent → triggers rating update

  Generate unit tests with @ExtendWith(MockitoExtension.class).
  Run ./mvnw test -Dtest=ProductReviewServiceTest after generating.
\`\`\`

Claude Code generates the service, runs the tests, and reports if they pass. If they fail, it reads the failure and fixes.

### Controller + DTOs
\`\`\`
> @file src/main/java/com/myapp/feature/review/ProductReviewService.java
  @file src/main/java/com/myapp/config/SecurityConfig.java
  @file src/main/java/com/myapp/feature/product/ProductController.java (template)

  Generate ProductReviewController at /api/v1:
  POST /products/{productId}/reviews (ROLE_USER) → submitReview
  GET /products/{productId}/reviews (anonymous, paginated) → listApprovedReviews
  PATCH /admin/reviews/{reviewId}/status (ROLE_ADMIN) → moderateReview

  DTOs (records):
  SubmitReviewRequest(rating: int, comment: String)
  ProductReviewDto(id, productId, userId, rating, comment, status, createdAt)
  ReviewModerationRequest(status: ReviewStatus, moderatorNote: String)

  Validation: @Min(1) @Max(5) on rating, @Size(max=1000) on comment, @NotNull on status
\`\`\`

### Integration Tests
\`\`\`
> @file src/main/java/com/myapp/feature/review/ProductReviewController.java
  @file src/test/java/com/myapp/feature/product/ProductControllerIntegrationTest.java (template)

  Generate ProductReviewControllerIntegrationTest:
  - PostgreSQL 16 + Kafka Testcontainers via @ServiceConnection
  - Test scenarios:
    1. Submit review happy path → 201, review in DB with status PENDING
    2. Submit duplicate review → 409 Conflict
    3. Submit with invalid rating (6) → 400
    4. List approved reviews → 200 with pagination
    5. Moderate review to APPROVED → 200, DB status updated
    6. Moderate nonexistent review → 404
    7. Submit review as ADMIN (wrong role) → 403
    8. Moderate as USER (wrong role) → 403
    9. Submit without auth → 401

  Run ./mvnw test -Dtest=ProductReviewControllerIntegrationTest after generating.
\`\`\`

## The Review Moment

At each step, pause and review before continuing:
- Does the entity have the right column types?
- Does the service throw the right exceptions?
- Does the controller map exceptions to the right HTTP codes?
- Do the tests actually fail before the production code is correct?

AI produces working code in 80-90% of cases. The remaining 10-20% is where your domain knowledge matters — the business rule edge case AI didn't know about, the existing service it should have integrated with, the security constraint specific to your organisation.

## Velocity Benchmark

A ProductReview feature (entity + migration + repository + service + controller + 9 integration tests) built traditionally by an experienced developer: 4-6 hours. With the AI pair programming workflow above: 45-90 minutes, including review time at each step. The time savings compound across a full sprint: a team that ships 2-3 features per sprint without AI can ship 5-6 with it.`,

'212.3': `# The AI Development Loop — Sustaining Velocity

The first AI-assisted feature takes longer than you expect — you're learning the workflow. The tenth feature takes less time than you'd believe possible. The difference is internalising the AI development loop as a rhythm, not a novelty.

## The Loop

\`\`\`
DESIGN → PROMPT → GENERATE → REVIEW → TEST → REFINE
  ↑                                              |
  └──────────────────────────────────────────────┘
\`\`\`

Each iteration of the loop produces verified, working code for one layer. The loop runs 4-6 times per feature (entity → repository → service → controller → events → tests). After 20 features, the loop is unconscious.

## When to Accept vs. Reject AI Suggestions

Develop a fast internal filter:

**Accept immediately:**
- Boilerplate that matches your established pattern (repository interface, DTO records, Flyway migration SQL)
- Test method names and Arrange/Act/Assert structure
- Import statements and annotation syntax
- Repetitive code (10 similar endpoints following the same pattern)

**Review carefully before accepting:**
- Business logic in service implementations — verify against the spec
- Security configuration — verify every endpoint has the right authority
- Transaction boundaries — verify @Transactional is on the right method
- Database queries — verify no N+1, correct fetch type, right index
- Exception handling — verify the right exception is thrown for the right condition

**Reject and rewrite yourself:**
- Distributed system decisions (when to use sagas vs. 2PC, event ordering guarantees)
- Security architecture decisions (token storage, key rotation, session management)
- Performance decisions under specific load profiles
- Any code that touches payment processing or PII handling

The rule: AI decides the "how" (implementation details). You decide the "what" (design, architecture, security model).

## Measuring Productivity Gains

Track these metrics before and after adopting AI tooling:

| Metric | Typical improvement |
|---|---|
| Time to first working vertical slice | 40-60% faster |
| Test coverage (lines) | +15-25% — AI writes tests you would have skipped |
| Defects per feature (security/validation) | -30-40% — AI catches structural bugs |
| Code review time | -20-30% — fewer mechanical corrections |
| Time to onboard on unfamiliar code | -50% — AI explains code on demand |

The gains are not uniform. Complex business logic features improve less (AI doesn't know your domain). Infrastructure and boilerplate features improve most (AI knows Spring Boot conventions deeply).

## Building AI-Augmented Team Processes

### Pre-commit review as standard
Add to your team's PR checklist:
\`\`\`
- [ ] AI pre-commit security review run (claude: review staged changes for security issues)
- [ ] N+1 query check completed (claude: check for lazy collection access in loops)
- [ ] Input validation coverage checked (claude: verify all endpoints have @Valid)
\`\`\`

### Shared .cursorrules and CLAUDE.md
These files belong in version control. When a new team member clones the repo, they get AI that already knows your project's conventions. Onboarding AI effectiveness goes from "takes a week" to "immediate".

### Content Security Policy for AI Tools
As a team, decide:
- Which AI tools are approved (Copilot, Cursor, Claude Code)?
- What code categories require human-only review (payments, auth, PII)?
- What is the policy on sending code to cloud models (privacy mode required?)?
- How do you handle AI-generated code in security audits (does it count as first-party code for SAST purposes)?

Document these decisions in your engineering handbook before the team scales.

## The Skill Ceiling

The developer ceiling with AI tools is not "typing speed" or "memorising APIs" — it is:

1. **System design** — AI cannot design the right system; it implements one
2. **Domain expertise** — AI doesn't know your business rules; you do
3. **AI prompt craft** — describing what you want precisely is a learnable, valuable skill
4. **Critical review** — knowing what to verify and what to trust is judgment developed over time
5. **Integration** — the hardest bugs are at system boundaries AI cannot see holistically

The developers who thrive with AI tooling are those who invest in system design skills and domain expertise — the things AI can't replace — while delegating the mechanical implementation work. This is the "architect mindset" the course title promises: you design the system, AI builds it, you verify it.

## What's Next: Spring AI

In the next part of the course, we move from "AI tools that help you write code" to "Spring AI: the framework for embedding AI capabilities into your application". The skills from Part III — prompt engineering, multi-step generation, AI-assisted testing — apply directly to building AI-powered features with Spring AI.`,
}

export const quiz: Record<string, QuizQuestion[]> = {

'212.1': [
  {
    question: 'What is the primary purpose of the "technical design prompt" before writing any implementation code?',
    options: [
      'To generate boilerplate code that will be refined later',
      'To have AI stress-test your design by identifying missing constraints, edge cases, performance concerns, and security gaps',
      'To produce API documentation automatically from the feature description',
      'To estimate development time by asking AI how long the feature will take',
    ],
    correctIndex: 1,
    explanation: 'The design prompt treats AI as a critical reviewer: you present your design and ask it to find holes. A well-phrased design review prompt surfaces constraints you missed (duplicate review prevention), performance concerns (eventual consistency in rating updates), and security gaps — in 30 seconds instead of a 30-minute team review. You make the design decisions; AI finds what you haven\'t considered.',
  },
  {
    question: 'AI suggests using event sourcing + CQRS for a simple product listing feature. How should you respond?',
    options: [
      'Accept the suggestion — AI knows the most scalable patterns',
      'Reject it by asking AI to justify the specific problem it solves in your context and the downside, then decide based on the explanation',
      'Implement it for learning purposes even if it is over-engineered',
      'Reject all AI architectural suggestions — they are always wrong',
    ],
    correctIndex: 1,
    explanation: 'AI makes confident recommendations for complex patterns regardless of whether complexity is warranted. Forcing justification ("explain the specific problem this solves in our context and the downside") surfaces whether the suggestion is genuinely applicable or generic. Event sourcing for a product listing with no complex domain events and a team unfamiliar with CQRS is over-engineering — AI won\'t volunteer that assessment unless prompted.',
  },
  {
    question: 'Which of these design checkpoint items must be completed BEFORE generating any implementation code?',
    options: [
      'Performance testing plan and expected response time SLAs',
      'Entity fields and types confirmed, API contracts documented, exception hierarchy planned, edge cases decided',
      'CI/CD pipeline configuration and deployment strategy',
      'Database migration rollback plan and production deployment checklist',
    ],
    correctIndex: 1,
    explanation: 'These four items define what AI will implement. If entity fields are wrong, every subsequent layer is built on a wrong foundation. If API contracts are undefined, the controller shape is guessed. If the exception hierarchy is not planned, AI invents exception names that don\'t match your existing codebase. Performance, CI/CD, and deployment are important but are downstream of the implementation.',
  },
  {
    question: 'You design a review endpoint where productId comes from the URL path. AI\'s design review flags this with a missing constraint. What is the most likely gap?',
    options: [
      'The URL path should use query parameters instead of path variables for UUID identifiers',
      'There is no check that the productId in the path corresponds to an existing product before creating the review',
      'UUID path variables require a special Spring Boot configuration',
      'The GET method should be used instead of POST for creating reviews',
    ],
    correctIndex: 1,
    explanation: 'Accepting a productId from the client without verifying the product exists allows orphaned reviews (reviews for non-existent products). This is a classic missing constraint: validate the foreign key exists before inserting. The fix: productRepository.existsById(productId) in the service, throwing ProductNotFoundException if false.',
  },
  {
    question: 'An AI design review suggests adding Redis caching to every service. What is the correct approach?',
    options: [
      'Add caching to all services immediately — it is a best practice',
      'Reject premature caching; measure actual performance first, then add caching only where profiling shows a bottleneck',
      'Add caching only to read-heavy services and remove it from write-heavy ones',
      'Accept the suggestion but configure Redis with a very low TTL to minimise risk',
    ],
    correctIndex: 1,
    explanation: 'Caching adds complexity: cache invalidation bugs, stale data issues, memory management, and additional infrastructure. Adding it before measuring performance is premature optimisation (Knuth: "the root of all evil"). Measure first with a realistic load profile. If reads are measurably slow, cache. AI suggests caching liberally because it is a well-known pattern — you must apply the "do we actually have this problem?" filter.',
  },
],

'212.2': [
  {
    question: 'In the AI pair programming workflow, what happens at the "Review Moment" between generation steps?',
    options: [
      'You send the generated code to a senior developer for traditional code review',
      'You pause to verify the generated layer is correct before building the next layer on top of it',
      'You commit the generated code to version control before continuing',
      'You ask AI to review its own output and fix any errors it finds',
    ],
    correctIndex: 1,
    explanation: 'Each layer depends on the previous. If the entity has the wrong column type, the repository query is wrong, the service DTO mapping is wrong, and the controller returns wrong data — all built on one unreviewed mistake. Pausing to verify at each layer means errors are caught when they affect one file, not after they propagate through five.',
  },
  {
    question: 'What is the correct first message to Claude Code at the start of an AI pair programming session?',
    options: [
      '"Generate the complete feature immediately"',
      '"Read CLAUDE.md and the existing similar feature files, then we will start with Step 1"',
      '"What is the best way to implement this feature? Give me options."',
      '"Here is the code I want you to write" followed by the full implementation spec',
    ],
    correctIndex: 1,
    explanation: 'Orienting Claude Code to CLAUDE.md and an existing similar feature before any generation ensures every subsequent output follows your project\'s conventions. Without this orientation, Claude Code uses its training defaults. Reading CLAUDE.md + a template feature file is the equivalent of onboarding a new developer — it takes 60 seconds and pays back for the entire session.',
  },
  {
    question: 'A feature\'s integration tests fail after Claude Code generates them. What is the correct instruction?',
    options: [
      '"Rewrite the tests to make them pass"',
      '"Run ./mvnw test, read the failure output, and fix the production code without changing test assertions"',
      '"The tests are wrong — delete them and regenerate"',
      '"Add @Disabled to the failing tests and continue"',
    ],
    correctIndex: 1,
    explanation: 'The same constraint as TDD: production code must be fixed, not tests weakened. Specifying "do not change test assertions" prevents Claude Code from taking the easy path of asserting whatever the broken implementation returns. Claude Code\'s ability to read real test failure output and iterate is its key advantage over IDE-based tools — use it.',
  },
  {
    question: 'Compared to traditional development, what is the realistic velocity improvement for a standard CRUD feature using the AI pair programming workflow?',
    options: [
      '10x faster — AI does all the work instantly',
      '40-60% faster — including design, implementation, and review time at each step',
      'No improvement — the review and correction time offsets any generation speed gains',
      '2-3x faster only for unit tests, not for production code',
    ],
    correctIndex: 1,
    explanation: 'The 40-60% figure accounts for real workflow: design time (not saved), prompt writing (adds time), generation (saves time), review at each step (adds time), correction rounds (adds time). For boilerplate-heavy CRUD features, the gains are at the high end. For complex business logic features, gains are lower. 10x is a marketing number, not a practitioner number.',
  },
  {
    question: 'After generating the ProductReview service, you notice AI created a findAll() call with no pagination inside a loop. What do you do?',
    options: [
      'Accept it — AI optimised for correctness and pagination can be added later',
      'Reject the relevant method and prompt with the constraint: "use Pageable for any list query, never findAll() without bounds"',
      'Add a comment in the code noting the N+1 risk for future developers',
      'Switch to a different AI tool that would not make this mistake',
    ],
    correctIndex: 1,
    explanation: 'A missing pagination constraint in the prompt leads to unbounded queries in the output. Add the constraint to the prompt and regenerate the affected method. This is the review-and-refine cycle: AI generates 80-90% correctly, the review step catches the specific omission, and the correction prompt is targeted and fast. The constraint should also be added to CLAUDE.md so it doesn\'t happen again.',
  },
],

'212.3': [
  {
    question: 'Which category of code should NEVER be accepted from AI without thorough human expert review?',
    options: [
      'JPA entity definitions and Flyway migrations',
      'Payment processing, authentication/authorisation logic, and PII handling',
      'Lombok annotations and DTO record definitions',
      'Testcontainers configuration and MockMvc test assertions',
    ],
    correctIndex: 1,
    explanation: 'Payment processing bugs cause financial loss. Auth logic bugs cause security breaches. PII handling bugs cause GDPR/CCPA violations. These are high-consequence, domain-specific, often legally regulated areas where AI\'s training data may contain outdated, context-free, or incorrect patterns. Human expert review is non-negotiable for these categories regardless of development velocity targets.',
  },
  {
    question: 'What is the practical benefit of committing .cursorrules and CLAUDE.md to version control?',
    options: [
      'These files are required by the build system to compile the project',
      'New team members get AI that already knows the project\'s conventions from the moment they clone the repo',
      'These files trigger CI/CD pipeline steps that validate AI-generated code quality',
      'Version control enables rollback if an AI convention causes a production incident',
    ],
    correctIndex: 1,
    explanation: 'Without committed convention files, each developer starts with an AI that knows only its training defaults — and spends the first week correcting conventions. With committed files, day-one AI output already follows your injection style, exception patterns, test approach, and naming conventions. Onboarding AI effectiveness goes from "gradually improves over a week" to "immediately effective".',
  },
  {
    question: 'The AI development loop runs 4-6 times per feature. What does each iteration verify?',
    options: [
      'Each iteration deploys to a staging environment and verifies with end-to-end tests',
      'Each iteration produces one verified layer (entity, repository, service, controller, etc.) before the next is generated',
      'Each iteration runs the full test suite and ensures 100% coverage',
      'Each iteration gets a peer review from another developer on the team',
    ],
    correctIndex: 1,
    explanation: 'The loop cadence is: generate one layer → review → test → confirm → move to next layer. This prevents error propagation: an entity field type mistake caught before the repository is generated costs 30 seconds. The same mistake caught after service + controller + 9 integration tests are generated costs 30 minutes of corrections across 5 files.',
  },
  {
    question: 'A developer on your team reports that AI tooling made them 10x faster and they no longer review AI output carefully. What is the risk?',
    options: [
      'No risk — if the tests pass, the code is correct',
      'AI structural bugs (security gaps, N+1 queries, missing transaction boundaries) accumulate undetected, causing production incidents',
      'The developer will lose their coding skills through lack of practice',
      'The organisation may violate AI usage policies',
    ],
    correctIndex: 1,
    explanation: 'AI produces plausible-looking code that may be structurally correct but semantically wrong: a missing ownership check (IDOR), an eager-fetched collection on a high-traffic endpoint, a @Transactional method on the wrong layer. These bugs don\'t fail tests — they fail in production under real data and concurrent load. The review step is not optional; it is where human judgment prevents AI\'s structural blind spots from reaching production.',
  },
  {
    question: 'What distinguishes a developer who reaches the "architect ceiling" with AI tools from one who plateaus at "typing speed" gains?',
    options: [
      'The architect knows more programming languages and can prompt AI in multiple contexts',
      'The architect invests in system design, domain expertise, and AI judgment — the things AI cannot replace — and delegates only mechanical implementation',
      'The architect uses more expensive AI models that produce higher-quality code',
      'The architect writes longer, more detailed prompts covering every implementation detail',
    ],
    correctIndex: 1,
    explanation: 'AI makes developers faster at implementing specs. It does not make them better at designing systems, understanding domains, or making architecture tradeoffs. Developers who invest in what AI can\'t do (system design, domain modeling, distributed systems reasoning) get compounding returns: they design better systems AND implement them faster. Developers who only invest in prompting get bounded returns — they\'re faster typers in a world where typing was never the bottleneck.',
  },
],
}

export const codingTask: Record<string, {
  instructions: string
  boilerplate: string
  rubric: string[]
  hints: string[]
}> = {

'212.2': {
  instructions: `Execute the complete AI pair programming workflow to build a \`ProductTag\` feature for a Spring Boot e-commerce backend.

**Feature requirements:**
- Tags are strings (e.g., "sale", "new-arrival", "featured"). A product can have multiple tags.
- \`POST /api/v1/admin/products/{productId}/tags\` — add a tag to a product (ROLE_ADMIN)
- \`DELETE /api/v1/admin/products/{productId}/tags/{tag}\` — remove a tag (ROLE_ADMIN)
- \`GET /api/v1/products/by-tag?tag=sale\` — list products with a specific tag (anonymous, paginated)
- A product's tags are stored in a separate \`product_tags\` join table (productId, tag)

**Your task:** Write the complete set of prompts you would send in an AI pair programming session to implement this feature, following the 5-step vertical slice chain. Then implement the feature yourself using those prompts.

**Deliverable:** The actual Spring Boot code for the feature (entity mapping, repository, service, controller, DTOs, Flyway migration, and integration tests).`,
  boilerplate: `// ProductTag join table mapping
// Hint: use @ElementCollection with @CollectionTable on the Product entity

// ProductRepository additions needed:
// - Find by tag with pagination

// ProductTagController — to be created

// V_create_product_tags.sql — to be created

// ProductControllerTagIntegrationTest — to be created

// Your prompts go in comments above each file:
/*
PROMPT FOR ENTITY ADDITION:
[Write your entity modification prompt here]
*/

// Product.java additions:
@Entity
public class Product {
    // ... existing fields ...

    // TODO: add tags collection
}`,
  rubric: [
    'Tags stored as @ElementCollection with @CollectionTable(name="product_tags") on Product entity',
    'Flyway migration creates product_tags table with (product_id UUID, tag VARCHAR) and composite primary key',
    'Repository has findByTagsContaining(String tag, Pageable pageable) or equivalent @Query method',
    'Service has addTag, removeTag, and findByTag methods with appropriate exceptions (ProductNotFoundException)',
    'Controller uses ROLE_ADMIN for add/remove endpoints, anonymous for findByTag',
    'Paginated GET /products/by-tag endpoint returns Page<ProductDto>',
    'Integration test verifies add tag persists to DB',
    'Integration test verifies remove tag removes from DB',
    'Integration test verifies findByTag returns correct products',
    'Integration test verifies 403 when non-admin tries to add/remove tags',
    'Integration test verifies 404 when adding tag to non-existent product',
  ],
  hints: [
    '@ElementCollection(fetch = FetchType.LAZY) @CollectionTable(name = "product_tags", joinColumns = @JoinColumn(name = "product_id")) @Column(name = "tag") private Set<String> tags = new HashSet<>()',
    'For findByTag: @Query("SELECT p FROM Product p JOIN p.tags t WHERE t = :tag") Page<Product> findByTag(@Param("tag") String tag, Pageable pageable)',
    'V5__create_product_tags.sql: CREATE TABLE product_tags (product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE, tag VARCHAR(100) NOT NULL, PRIMARY KEY (product_id, tag))',
    'Use @WithMockUser(roles = "ADMIN") for add/remove tests, no annotation for findByTag (anonymous)',
  ],
},
}
