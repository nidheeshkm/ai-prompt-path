// Part III — AI-Accelerated Spring Boot Dev
// Chapter 210: AI-Assisted Code Review & Refactoring

import type { QuizQuestion } from '../../src/data/curriculum'

export const courseId = 'springboot-ai-architect'

export const content: Record<string, string> = {

'210.1': `# AI-Driven Code Review for Spring Boot

AI code review is not a replacement for human review — it is a first-pass filter that catches the mechanical issues (security vulnerabilities, N+1 queries, missing validation) before a human reviewer has to spend attention on them. When AI handles the boilerplate concerns, human reviewers can focus on architecture, business logic correctness, and design coherence.

## The Pre-Commit Review Workflow

The most effective integration point is before you push:

\`\`\`bash
# Stage your changes
git add -p   # or git add .

# AI review in Claude Code
claude
> Review the staged changes (git diff --cached). Check for:
  1. Spring Security: missing authentication, authorization gaps, CSRF issues
  2. JPA: N+1 queries, missing @Transactional, wrong fetch types
  3. Input validation: missing @Valid, unvalidated path variables or headers
  4. Exception handling: caught exceptions swallowed, inappropriate HTTP status codes
  5. Thread safety: shared mutable state in @Service or @Component beans
  Report findings with file and line number. Do not auto-fix.
\`\`\`

This produces a structured finding list you review before pushing. Address the findings, then push. The AI review adds 2-3 minutes; it consistently catches issues that cost 2-3 hours in production.

## Security Review Prompts

### Authentication and Authorization gaps
\`\`\`
@file src/main/java/com/myapp/api/AdminController.java
@file src/main/java/com/myapp/config/SecurityConfig.java

Review AdminController for authorization gaps:
- Are all endpoints explicitly secured (not relying on default deny)?
- Are there any endpoints that ADMIN can reach but should only be SUPER_ADMIN?
- Are path variables sanitised before use in queries?
- Are there any endpoints that accept a userId parameter from the client
  that could be used for horizontal privilege escalation (IDOR)?
\`\`\`

### SQL Injection via JPQL
\`\`\`
@folder src/main/java/com/myapp/repository

Review all @Repository classes for JPQL/HQL injection risks:
- Are any queries built with string concatenation instead of named parameters?
- Are native queries used safely with parameterisation?
Flag each query that uses string interpolation or concatenation.
\`\`\`

## JPA and Performance Review

### N+1 Query Detection

The N+1 problem: loading a list of 100 orders and then accessing each order's items triggers 101 queries instead of 1.

\`\`\`
@file src/main/java/com/myapp/service/ReportService.java

Review ReportService for N+1 query risks:
- Identify every place where a collection association is accessed in a loop
- Check that @ManyToOne and @OneToMany associations use FetchType.LAZY
- Identify methods that would benefit from JOIN FETCH or @EntityGraph
Report each risk with the collection access pattern that triggers it.
\`\`\`

Typical AI finding:
> Line 47: \`orders.forEach(o -> o.getItems().size())\` — \`items\` is a LAZY collection; accessing it inside a loop triggers one SELECT per order. Fix: use \`@Query("SELECT o FROM Order o JOIN FETCH o.items")\` in the repository.

### Transaction Boundary Review

\`\`\`
@file src/main/java/com/myapp/service/PaymentService.java

Review PaymentService for transaction correctness:
- Are multi-step database operations wrapped in a single @Transactional method?
- Are there @Transactional methods that call other @Transactional methods
  in the same class (self-invocation — proxies do not intercept these)?
- Are any @Transactional methods declared on the concrete class instead of the interface?
- Are there places where a transaction should be readOnly=true for performance?
\`\`\`

## Input Validation Review

\`\`\`
@folder src/main/java/com/myapp/api

Review all @RestController classes for missing input validation:
- Every @RequestBody parameter should have @Valid
- Every @PathVariable that is used in a database lookup should validate format (UUID, positive integer)
- Every @RequestParam should have explicit type and optional default
- Are there any endpoints that accept file uploads without size or type validation?
List each endpoint with missing validation by HTTP method and path.
\`\`\`

## Structuring the Review Output

Ask for structured output so you can action findings systematically:

\`\`\`
Format each finding as:
SEVERITY: [CRITICAL|HIGH|MEDIUM|LOW]
FILE: [filename:line]
ISSUE: [one-sentence description]
FIX: [one-sentence remediation]
\`\`\`

This format integrates cleanly into PR comments or a JIRA ticket. It also makes it easy to filter: fix all CRITICAL and HIGH before merging, track MEDIUM and LOW in backlog.

## What AI Misses

AI code review is not perfect. It reliably misses:
- **Business logic correctness** — it cannot verify that the pricing formula matches the product spec
- **Distributed system bugs** — subtle race conditions across microservices
- **Infrastructure misconfigurations** — whether the Kubernetes resource limits are appropriate
- **Domain model violations** — whether an entity represents a valid aggregate root

Treat AI review as the first reviewer, not the last. Human review remains essential for correctness, architecture, and domain alignment.`,

'210.2': `# AI-Assisted Refactoring in Spring Boot

Refactoring with AI is most valuable for two scenarios: modernising existing code to Java 21 / Spring Boot 3.x patterns, and breaking apart God classes that have accumulated too much responsibility. Both are high-effort, low-creativity tasks — exactly what AI handles well.

## Java 21 Modernisation

### Switch to Records for DTOs

Before:
\`\`\`java
public class ProductDto {
    private final String id;
    private final String name;
    private final BigDecimal price;

    public ProductDto(String id, String name, BigDecimal price) {
        this.id = id; this.name = name; this.price = price;
    }
    // getters, equals, hashCode, toString — 40 more lines
}
\`\`\`

Cursor prompt (\`Cmd+K\` on the class):
> Convert this class to a Java record. Keep all existing fields. Remove the constructor, getters, equals, hashCode, and toString — the record generates these.

Result:
\`\`\`java
public record ProductDto(String id, String name, BigDecimal price) {}
\`\`\`

Run this on every DTO in the project:
\`\`\`
@folder src/main/java/com/myapp/dto

Convert all DTO classes that are immutable value objects (final fields, no setters)
to Java records. Do not convert classes that have mutable state or use @Builder for
write operations. Run ./mvnw compile after each conversion to catch issues.
\`\`\`

### Pattern Matching for instanceof

Before (Java 11 style):
\`\`\`java
if (event instanceof OrderCreatedEvent) {
    OrderCreatedEvent created = (OrderCreatedEvent) event;
    process(created.getOrderId());
}
\`\`\`

After (Java 21):
\`\`\`java
if (event instanceof OrderCreatedEvent created) {
    process(created.getOrderId());
}
\`\`\`

Cursor handles this across the entire codebase in one Agent session.

### Sealed Classes for Domain Events

\`\`\`
@file src/main/java/com/myapp/event/OrderEvent.java

Refactor the OrderEvent hierarchy to use Java 21 sealed classes.
OrderEvent should be sealed, permitting: OrderCreatedEvent, OrderCancelledEvent, OrderShippedEvent.
Update all switch statements that handle OrderEvent to use pattern matching switch expressions.
\`\`\`

## Spring Boot 3.x Migration with AI

### Security DSL Migration

The most common Spring Boot 3.x migration task — \`WebSecurityConfigurerAdapter\` was removed.

\`\`\`
@file src/main/java/com/myapp/config/SecurityConfig.java

Migrate this SecurityConfig from the Spring Boot 2.x style (extending WebSecurityConfigurerAdapter
and overriding configure(HttpSecurity)) to the Spring Boot 3.x style using SecurityFilterChain beans.

Requirements:
- All existing security rules must be preserved exactly
- Use the lambda DSL for http.authorizeHttpRequests() and http.csrf()
- The existing custom JWT filter must remain in the filter chain at the same position
\`\`\`

### Jakarta EE Namespace Migration

Spring Boot 3.x uses \`jakarta.*\` not \`javax.*\`:

\`\`\`
@folder src/main/java

Replace all javax.* imports with the jakarta.* equivalents across the entire codebase:
- javax.persistence.* → jakarta.persistence.*
- javax.validation.* → jakarta.validation.*
- javax.servlet.* → jakarta.servlet.*
- javax.transaction.* → jakarta.transaction.*

After replacing imports, run ./mvnw compile to verify no remaining javax.* issues.
\`\`\`

Claude Code executes this across hundreds of files correctly because it is a mechanical substitution — exactly where AI excels.

## Extracting a God Service

A \`ProductService\` that has grown to handle products, inventory, pricing, and reviews is a God class. AI can extract it systematically:

\`\`\`
@file src/main/java/com/myapp/service/ProductService.java

This service has grown too large. Refactor it by extracting:
1. InventoryService — all methods dealing with stock levels and reservations
2. PricingService — all methods dealing with price calculations and discounts
3. ProductReviewService — all methods dealing with customer reviews

Steps:
1. Create the three new service interfaces and implementations
2. Extract the relevant methods (do not duplicate — move them)
3. Update ProductService to inject and delegate to the new services
4. Update all existing callers of the extracted methods
5. Run ./mvnw test after each extraction to stay green

Follow the same patterns as ProductService (constructor injection, same package structure).
\`\`\`

Claude Code reads all callers, updates them, and confirms the test suite stays green after each extraction — a refactoring that would take a senior developer half a day now takes 20 minutes of review.

## Refactoring Anti-Patterns AI Handles Well

| Anti-Pattern | AI Refactoring Task |
|---|---|
| Field injection (@Autowired) | "Convert all @Autowired fields to constructor injection using @RequiredArgsConstructor" |
| Caught-and-swallowed exceptions | "Find all catch blocks that log and return null/empty — replace with proper exception propagation" |
| Magic numbers | "Extract all numeric literals in business logic to named constants" |
| Mutable DTOs (setters on request/response objects) | "Convert to immutable records or add @Builder" |
| Missing @Transactional on multi-step writes | "Identify service methods that perform multiple writes without @Transactional" |

For each, provide \`@folder\` context and ask AI to run tests after each change.`,

'210.3': `# AI Anti-Pattern Detection in Spring Boot

Anti-patterns in Spring Boot are recurring bad solutions that look reasonable at the code level but cause problems at the architecture or performance level. AI is effective at detecting them because they have recognisable structural signatures — patterns that appear in the text of the code that correlate with the bad design.

## The Core Spring Boot Anti-Patterns

### 1. Anemic Domain Model

The anemic domain model puts all business logic in service classes and entities are pure data holders with getters and setters. It is the most common Spring Boot anti-pattern.

\`\`\`java
// Anemic — entity has no behaviour
@Entity
public class Order {
    private OrderStatus status;
    private List<OrderItem> items;
    public OrderStatus getStatus() { return status; }
    public void setStatus(OrderStatus status) { this.status = status; }
}

// All logic in the service
@Service
public class OrderService {
    public void cancelOrder(Order order) {
        if (order.getStatus() == OrderStatus.SHIPPED) throw new IllegalStateException("...");
        order.setStatus(OrderStatus.CANCELLED);  // Behaviour belongs in Order
    }
}
\`\`\`

**Detection prompt:**
\`\`\`
@folder src/main/java/com/myapp

Detect anemic domain model anti-pattern:
- Find @Entity classes that have more than 5 getters/setters but fewer than 2 non-accessor methods
- Find @Service methods that directly call setters on @Entity objects to implement business logic
- List the entities that should own the behaviour that is currently in services
Do not refactor — report only.
\`\`\`

### 2. God Service / Blob Service

A service class exceeding ~300 lines with no clear single responsibility.

\`\`\`
@folder src/main/java/com/myapp/service

Find services that violate the Single Responsibility Principle:
- List all @Service classes with more than 200 lines or more than 15 public methods
- For each, group the methods into responsibility clusters (what domain concept does each method belong to?)
- Suggest what separate services they should be split into
\`\`\`

### 3. Inappropriate Transaction Scope

\`\`\`java
// Anti-pattern: @Transactional on the controller
@RestController
public class OrderController {
    @Transactional  // Wrong — transaction should be in the service layer
    @PostMapping("/orders")
    public ResponseEntity<OrderDto> create(@RequestBody CreateOrderRequest request) { ... }
}
\`\`\`

\`\`\`java
// Anti-pattern: calling @Transactional methods from within the same class (self-invocation)
@Service
public class OrderService {
    @Transactional
    public void processPayment(Order order) { ... }

    public void handleOrder(Order order) {
        processPayment(order);  // Spring proxy not involved — @Transactional is ignored!
    }
}
\`\`\`

**Detection prompt:**
\`\`\`
@folder src/main/java

Detect transaction anti-patterns:
1. @Transactional on @RestController or @Controller methods (wrong layer)
2. @Transactional methods called from non-transactional methods in the SAME class (self-invocation)
3. @Transactional on private methods (Spring cannot proxy these)
4. Large @Transactional methods that include network calls or file I/O (long transactions)
\`\`\`

### 4. Direct Entity Exposure in APIs

Returning JPA entities from REST controllers creates: circular reference serialisation errors, lazy-loading exceptions (LazyInitializationException outside transaction), unintended field exposure.

\`\`\`
@folder src/main/java/com/myapp/api

Find REST endpoints that return @Entity objects directly in ResponseEntity<EntityClass>
or include entity references in other response classes.
List each endpoint and the entity it leaks.
This should always be a DTO — report every case.
\`\`\`

### 5. Missing Pagination

\`\`\`java
// Anti-pattern: unbounded list query
public List<Order> getAllOrders() {
    return orderRepository.findAll();  // Will OOM in production with 1M orders
}
\`\`\`

\`\`\`
@folder src/main/java/com/myapp

Find all repository calls that return List<Entity> or List<Dto> without pagination:
- findAll() calls with no Pageable parameter
- @Query methods returning List that have no WHERE clause limiting the result set
For each, note the calling method and estimate the production risk.
\`\`\`

## Building an AI-Powered Architecture Review

Combine multiple detection prompts into a single structured review:

\`\`\`
@folder src/main/java/com/myapp

Perform a structured Spring Boot architecture review. Check for and report:

LAYER VIOLATIONS:
- Business logic in @RestController methods
- @Transactional outside the service layer
- Repository calls from controllers (skipping service layer)

ENTITY MISUSE:
- @Entity returned directly from controller methods
- Bidirectional @ManyToMany without explicit join table
- Missing @Version for optimistic locking on entities that are updated concurrently

PERFORMANCE:
- findAll() without pagination
- @OneToMany with FetchType.EAGER
- Missing database indexes on foreign key columns (check @JoinColumn fields)

SECURITY:
- @RequestParam or @PathVariable values used in queries without validation
- Passwords or secrets logged at any level

Output format:
CATEGORY | SEVERITY | FILE:LINE | ISSUE | RECOMMENDED FIX
\`\`\`

This produces a comprehensive report in 30 seconds that typically catches 5-15 real issues in a mid-size Spring Boot application. In a traditional manual review, the same analysis takes 1-2 hours.`,
}

export const quiz: Record<string, QuizQuestion[]> = {

'210.1': [
  {
    question: 'What is the primary purpose of AI code review in a development workflow?',
    options: [
      'To replace human code review entirely and speed up PR merges',
      'To be a first-pass filter that catches mechanical issues, freeing human reviewers to focus on architecture and business logic',
      'To generate automatic fixes for all found issues before human review',
      'To measure code quality and generate a score for team performance metrics',
    ],
    correctIndex: 1,
    explanation: 'AI review excels at catching structural, security, and performance anti-patterns that have recognisable code signatures. Human reviewers are uniquely valuable for business logic correctness, distributed system reasoning, and architecture decisions. AI review eliminates noise from human review, not the review itself.',
  },
  {
    question: 'You suspect a @Repository class has SQL injection vulnerabilities in JPQL queries. What is the most targeted AI review prompt?',
    options: [
      '"Review this file for all bugs"',
      '"Find all @Query methods that use string concatenation or interpolation instead of named parameters"',
      '"Check if this file follows OWASP Top 10 guidelines"',
      '"Rewrite all queries to use JdbcTemplate which is safer than JPQL"',
    ],
    correctIndex: 1,
    explanation: 'A targeted prompt for a specific vulnerability pattern (string concatenation in queries) produces actionable findings. "Review for all bugs" is too broad — AI will find trivial issues and miss subtle ones. Specificity in the security concern leads to specificity in the finding.',
  },
  {
    question: 'What is a Horizontal Privilege Escalation (IDOR) vulnerability in a Spring Boot API?',
    options: [
      'An admin endpoint accessible by users with insufficient vertical privileges',
      'An endpoint that accepts a userId or resourceId from the client and accesses that resource without verifying the authenticated user owns it',
      'A SQL injection that allows horizontal (same-table) data access',
      'A misconfigured CORS policy that allows cross-origin requests',
    ],
    correctIndex: 1,
    explanation: 'IDOR (Insecure Direct Object Reference) occurs when a client passes their own resourceId (e.g., GET /orders/12345) and the server fetches that resource without checking if the authenticated user owns order 12345. If user A can access user B\'s orders by changing the ID, that is a horizontal escalation. AI can flag endpoints with userId or resourceId parameters that lack an ownership check.',
  },
  {
    question: 'What format should you request for AI code review findings to make them most actionable?',
    options: [
      'Free-form paragraph explanations for each issue found',
      'Structured format with severity, file:line, one-sentence issue description, and one-sentence fix',
      'A numbered list of issues sorted alphabetically by file name',
      'A diff showing the corrected code for every issue',
    ],
    correctIndex: 1,
    explanation: 'SEVERITY / FILE:LINE / ISSUE / FIX is actionable: you can filter by severity, navigate directly to the line, understand the problem, and know the remedy — all from one line. Free-form paragraphs require parsing. Automatic diffs skip your review step. Alphabetical ordering is arbitrary.',
  },
  {
    question: 'Which type of bug does AI code review reliably MISS?',
    options: [
      'Missing @Valid on a @RequestBody parameter',
      'N+1 query caused by accessing a lazy collection in a loop',
      'Business logic that produces wrong results but compiles correctly',
      'A caught exception that swallows the stack trace',
    ],
    correctIndex: 2,
    explanation: 'AI detects structural code patterns. Business logic bugs — an incorrect discount formula, a wrong interest rate calculation, a misunderstood requirement — require knowledge of the domain specification that AI does not have. Structural issues (missing annotations, collection access in loops, swallowed exceptions) have recognisable code patterns that AI finds reliably.',
  },
],

'210.2': [
  {
    question: 'Why are Java records a better choice than classes for Spring Boot DTOs?',
    options: [
      'Records are faster at runtime because the JVM optimises them specially',
      'Records are immutable value objects — they generate equals, hashCode, toString, and a canonical constructor, eliminating 40+ lines of boilerplate per DTO',
      'Records are required by Spring Boot 3.x for JSON serialisation',
      'Records allow Spring\'s @Autowired injection to work without a no-arg constructor',
    ],
    correctIndex: 1,
    explanation: 'A DTO record with 3 fields is one line. The equivalent class with Lombok is 3-5 lines. Without Lombok it is 40+ lines. Records are structurally immutable (final fields, no setters), which is the correct contract for a DTO — it represents a snapshot of data, not a mutable object. Jackson 2.12+ deserialises records without configuration.',
  },
  {
    question: 'What is Spring Boot self-invocation and why does it break @Transactional?',
    options: [
      'When a service calls itself recursively, causing a StackOverflowError',
      'When a @Transactional method is called from another method in the same class — Spring\'s proxy is bypassed so the transaction annotation has no effect',
      'When a service calls a method on the same interface it implements',
      'When two @Transactional methods call each other creating a circular transaction',
    ],
    correctIndex: 1,
    explanation: 'Spring implements @Transactional via a proxy that wraps the bean. When you call anotherMethod() within the same class, you are calling it on this (the raw object), not on the proxy. The proxy never intercepts the call, so no transaction is started. The fix is to restructure so @Transactional methods are always called from outside the class.',
  },
  {
    question: 'You ask Claude Code to migrate a Spring Boot 2.x SecurityConfig to 3.x. What must you explicitly state in the prompt to ensure the migration is safe?',
    options: [
      'Ask Claude Code to use the newest possible Spring Security version',
      'Specify that all existing security rules must be preserved exactly, including the JWT filter position',
      'Ask Claude Code to improve the security rules while migrating',
      'Specify that WebSecurityConfigurerAdapter must remain in the codebase for backward compatibility',
    ],
    correctIndex: 1,
    explanation: 'Without "preserve all existing rules exactly", Claude Code may simplify or reorder security rules based on what looks reasonable. Security rule ordering matters — a permissive pattern before a restrictive one can open access unintentionally. The JWT filter position in the chain also matters. Explicit preservation constraints prevent security-impacting "improvements" during migration.',
  },
  {
    question: 'When asking AI to extract a God Service into multiple focused services, what instruction ensures the codebase stays compilable throughout the process?',
    options: [
      '"Create all new service interfaces first, then move all methods at once"',
      '"Run ./mvnw test after each extraction step to stay green throughout the refactoring"',
      '"Comment out methods in the original class before moving them to avoid duplication"',
      '"Create a new module for each extracted service to isolate compilation"',
    ],
    correctIndex: 1,
    explanation: 'Incremental extraction — move one responsibility at a time and confirm tests pass — is the only safe way to refactor a large class. Moving everything at once risks a broken state that is hard to debug. AI can follow the "run tests after each step" instruction precisely, producing a series of small, verified changes instead of one large risky change.',
  },
  {
    question: 'Which Java 21 feature is most directly applicable to replacing complex instanceof chains in Spring Boot event handling?',
    options: [
      'Virtual threads — they allow event handlers to run concurrently without blocking',
      'Sealed classes with pattern matching switch — the compiler enforces exhaustive handling of all event subtypes',
      'Records — event classes become records eliminating boilerplate',
      'Text blocks — event payloads can be written as readable multi-line strings',
    ],
    correctIndex: 1,
    explanation: 'Sealed classes declare all permitted subtypes explicitly. A pattern matching switch on a sealed type is checked exhaustively at compile time — if you add a new OrderRefundedEvent but forget to add a case, the compiler fails. This eliminates an entire class of "unhandled event type" bugs that are silent at runtime in instanceof chains.',
  },
],

'210.3': [
  {
    question: 'What is the Anemic Domain Model anti-pattern?',
    options: [
      'An @Entity class with too many fields, causing wide database rows',
      'Entity classes that are pure data holders with getters/setters, with all business logic in service classes',
      'A domain model that uses primitive types instead of value objects',
      'A model where entities have no JPA annotations, relying only on XML configuration',
    ],
    correctIndex: 1,
    explanation: 'Martin Fowler coined "anemic domain model" to describe objects that look like domain entities but behave like data transfer objects — they have state but no behaviour. All business rules live in service classes (procedural style). The fix is to move behaviour into the entity: order.cancel() instead of orderService.setStatusCancelled(order).',
  },
  {
    question: 'Why is returning a JPA @Entity directly from a REST controller dangerous?',
    options: [
      'JPA entities are not serialisable and will cause a ClassCastException',
      'It can expose unintended fields, cause LazyInitializationException for lazy collections, and create circular reference serialisation failures',
      'Spring\'s Jackson integration does not support @Entity objects',
      'It violates the @RestController contract which requires ResponseEntity wrappers',
    ],
    correctIndex: 1,
    explanation: 'Three concrete risks: (1) Lazy collections throw LazyInitializationException when Jackson tries to serialise them outside the transaction. (2) Circular references (Order → Customer → Orders) cause infinite serialisation loops. (3) Internal fields (version, audit metadata, sensitive data) are exposed in the API response. DTOs solve all three.',
  },
  {
    question: 'What makes @Transactional on a private method a bug?',
    options: [
      'Private methods cannot be annotated with Spring annotations due to visibility restrictions',
      'Spring\'s proxy-based AOP cannot intercept private methods — the annotation is silently ignored',
      'The transaction scope of a private method conflicts with the calling method\'s transaction',
      'Private methods annotated with @Transactional fail to compile in Java 17+',
    ],
    correctIndex: 1,
    explanation: 'Spring AOP works by creating a proxy (subclass or interface proxy) that wraps your bean. Private methods cannot be overridden by a subclass — the proxy physically cannot intercept them. The @Transactional annotation on a private method compiles and deploys without error but has zero effect at runtime.',
  },
  {
    question: 'A repository method findAllOrders() returns List<Order> with no WHERE clause. What is the production risk?',
    options: [
      'The query will fail if the orders table has more than 1,000 rows',
      'With millions of orders, this loads all of them into JVM heap memory, potentially causing OutOfMemoryError',
      'JPA will issue a warning but still cap the result at 10,000 rows by default',
      'The risk is minimal because database connection pooling limits concurrent queries',
    ],
    correctIndex: 1,
    explanation: 'JPA has no implicit result cap. findAll() on a 10-million-row table fetches all 10 million rows into memory, materialises them as Java objects, and returns a List — a guaranteed OOM in production. The fix is always Pageable: Page<Order> findAll(Pageable pageable). AI can detect all such unbounded queries across the codebase in seconds.',
  },
  {
    question: 'You run an AI architecture review and it reports "IDOR risk in OrderController line 47". The code is: return orderRepo.findById(id). What is the correct fix?',
    options: [
      'Replace findById with a native SQL query to improve performance',
      'Add an ownership check: verify the authenticated user\'s ID matches the order\'s customerId before returning it',
      'Add @PreAuthorize("hasRole(\'ADMIN\')") to restrict the endpoint to admins only',
      'Add input validation to ensure id is a valid UUID before querying',
    ],
    correctIndex: 1,
    explanation: 'IDOR (Insecure Direct Object Reference) is fixed by ownership verification: fetch the resource, then check resource.getCustomerId().equals(authenticatedUserId). Restricting to ADMIN changes the feature entirely. UUID validation prevents injection but not access to other users\' data. The business rule is: users can only see their own orders.',
  },
],
}

export const codingTask: Record<string, {
  instructions: string
  boilerplate: string
  rubric: string[]
  hints: string[]
}> = {

'210.2': {
  instructions: `Refactor the following legacy Spring Boot 2.x code to modern Spring Boot 3.x / Java 21 standards. You will receive a \`LegacyOrderService\` class with multiple anti-patterns. Your task:

1. Convert the anemic \`OrderSummaryDto\` class to a Java record
2. Replace all field injection (\`@Autowired\`) with constructor injection using \`@RequiredArgsConstructor\`
3. Fix the \`@Transactional\` self-invocation bug: \`processPayment\` is called from \`createOrder\` in the same class
4. Move the self-invocation fix: extract \`processPayment\` to a new \`PaymentService\` interface + implementation and inject it into \`OrderService\`
5. Replace the \`instanceof\` chain in \`handleEvent\` with a Java 21 sealed class + pattern matching switch

Do NOT change the business logic — only modernise the code structure.`,
  boilerplate: `// OrderSummaryDto.java — convert to record
public class OrderSummaryDto {
    private final String orderId;
    private final String status;
    private final BigDecimal total;

    public OrderSummaryDto(String orderId, String status, BigDecimal total) {
        this.orderId = orderId; this.status = status; this.total = total;
    }
    public String getOrderId() { return orderId; }
    public String getStatus() { return status; }
    public BigDecimal getTotal() { return total; }
    @Override public boolean equals(Object o) { /* ... */ return false; }
    @Override public int hashCode() { return 0; }
    @Override public String toString() { return ""; }
}

// OrderEvent.java — needs sealing
public abstract class OrderEvent { public abstract String getOrderId(); }
public class OrderCreatedEvent extends OrderEvent { /* ... */ }
public class OrderCancelledEvent extends OrderEvent { /* ... */ }
public class OrderShippedEvent extends OrderEvent { /* ... */ }

// LegacyOrderService.java
@Service
public class LegacyOrderService {

    @Autowired  // ← anti-pattern: field injection
    private OrderRepository orderRepository;

    @Autowired  // ← anti-pattern: field injection
    private NotificationService notificationService;

    @Transactional
    public OrderSummaryDto createOrder(CreateOrderRequest request) {
        Order order = new Order(request.customerId(), request.items());
        orderRepository.save(order);
        processPayment(order);  // ← self-invocation bug: @Transactional is ignored here
        return new OrderSummaryDto(order.getId(), order.getStatus().name(), order.getTotal());
    }

    @Transactional  // ← ignored due to self-invocation from createOrder()
    public void processPayment(Order order) {
        // payment processing logic
        order.setStatus(OrderStatus.PAID);
        orderRepository.save(order);
    }

    public void handleEvent(OrderEvent event) {
        // ← old instanceof chain — replace with sealed + pattern matching
        if (event instanceof OrderCreatedEvent) {
            notificationService.sendOrderConfirmation(((OrderCreatedEvent) event).getOrderId());
        } else if (event instanceof OrderCancelledEvent) {
            notificationService.sendCancellationNotice(((OrderCancelledEvent) event).getOrderId());
        } else if (event instanceof OrderShippedEvent) {
            notificationService.sendShippingUpdate(((OrderShippedEvent) event).getOrderId());
        }
    }
}`,
  rubric: [
    'OrderSummaryDto is a Java record with three components — no constructor/getter/equals/hashCode/toString',
    'OrderEvent is sealed, permitting OrderCreatedEvent, OrderCancelledEvent, OrderShippedEvent',
    'All three event classes are declared as permits in the sealed hierarchy',
    'LegacyOrderService uses @RequiredArgsConstructor and has no @Autowired fields',
    'PaymentService interface and PaymentServiceImpl exist with the extracted processPayment logic',
    'OrderService injects PaymentService (not calls itself) to fix the self-invocation bug',
    'handleEvent uses a pattern matching switch expression (not switch statement) over the sealed OrderEvent',
    'Pattern matching switch is exhaustive — covers all three permitted subtypes without a default case',
  ],
  hints: [
    'sealed class OrderEvent permits OrderCreatedEvent, OrderCancelledEvent, OrderShippedEvent',
    'Pattern matching switch: switch(event) { case OrderCreatedEvent e -> ...; case OrderCancelledEvent e -> ...; }',
    'A sealed hierarchy switch expression is exhaustive without default if all permits are covered',
    '@RequiredArgsConstructor generates a constructor for all final fields — declare them as private final',
  ],
},
}
