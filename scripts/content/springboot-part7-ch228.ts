// Part VII — DDD, CQRS & Event Sourcing
// Chapter 228: Spring Modulith & Enforcing Architecture

import type { QuizQuestion } from '../../src/data/curriculum'

export const courseId = 'springboot-ai-architect'

export const content: Record<string, string> = {

'228.1': `# Spring Modulith — Modular Monolith Architecture

Before committing to microservices, Spring Modulith enables you to build a well-structured modular monolith where bounded context boundaries are enforced by the framework at development time.

## Why a Modular Monolith?

A microservices architecture distributes not just your code but also your operational complexity:
- Distributed tracing across services
- Network latency for every inter-service call
- Distributed transactions (or saga patterns) for consistency
- Multiple deployment pipelines

A well-structured modular monolith gives you:
- Module isolation (bounded contexts enforced)
- Simple local method calls between modules (no network)
- A single deployment unit
- A path to microservices: each module can be extracted later

## Project Structure

Spring Modulith uses the package hierarchy to define modules:

\`\`\`
com.example.
    orders/           <- "orders" module (public API)
        OrderService.java              (public)
        OrderRepository.java           (public)
        api/
            PlaceOrderCommand.java     (public)
            OrderSummary.java          (public)
        internal/
            OrderAggregate.java        (INTERNAL — other modules cannot use)
            OrderEventHandler.java     (INTERNAL)
    inventory/        <- "inventory" module
        InventoryService.java          (public)
        internal/
            StockLevel.java            (INTERNAL)
    shipping/         <- "shipping" module
        ShippingService.java           (public)
        internal/
            Consignment.java           (INTERNAL)
\`\`\`

## Module API vs Internal

Types in the \`internal\` subpackage are treated as module-private:

\`\`\`java
// ALLOWED: orders module calls inventory's public API
@Service
public class OrderService {
    private final InventoryService inventory; // public API — OK

    public void placeOrder(PlaceOrderCommand cmd) {
        inventory.reserve(cmd.productId(), cmd.quantity()); // OK
    }
}

// NOT ALLOWED: orders module reaches into inventory's internals
@Service
public class OrderService {
    private final StockLevel stockLevel; // INTERNAL to inventory — FORBIDDEN
}
\`\`\`

## Verifying Module Structure

\`\`\`java
@SpringBootTest
class ModularStructureTest {

    @Test
    void modulesAreWellStructured() {
        ApplicationModules modules = ApplicationModules.of(Application.class);
        modules.verify();
        // Throws if any module accesses another module's internal types
    }

    @Test
    void generateModuleDocumentation() {
        new Documenter(ApplicationModules.of(Application.class))
            .writeModulesAsPlantUml()
            .writeIndividualModulesAsPlantUml();
        // Generates UML diagrams showing module dependencies
    }
}
\`\`\`

## Inter-Module Communication — Events vs Direct Calls

Modules can communicate via direct method calls (same JVM) or Spring events (decoupled):

### Direct Call (tight coupling — use only when dependency is intentional)

\`\`\`java
// orders → inventory: acceptable because Order always needs inventory
@Service
public class OrderService {
    private final InventoryService inventory; // direct dependency

    public OrderId placeOrder(PlaceOrderCommand cmd) {
        inventory.reserve(cmd.productId(), cmd.quantity());
        // ...
    }
}
\`\`\`

### Spring Events (loose coupling — preferred for cross-cutting concerns)

\`\`\`java
// orders raises an event; shipping and billing listen independently
// orders doesn't know about (or depend on) shipping or billing

// In orders module:
@Service
public class OrderService {
    private final ApplicationEventPublisher events;

    public void confirmOrder(OrderId orderId) {
        order.confirm();
        events.publishEvent(new OrderConfirmed(orderId));
    }
}

// In shipping module — no dependency on orders module:
@ApplicationModuleListener  // Spring Modulith's event listener annotation
public class ShippingEventHandler {
    public void on(OrderConfirmed event) {
        shippingService.scheduleShipment(event.orderId());
    }
}

// In billing module:
@ApplicationModuleListener
public class BillingEventHandler {
    public void on(OrderConfirmed event) {
        billingService.generateInvoice(event.orderId());
    }
}
\`\`\`

\`@ApplicationModuleListener\` is Spring Modulith's version of \`@TransactionalEventListener(AFTER_COMMIT)\` — it runs the listener after the publishing transaction commits and marks the listener as belonging to a specific module.`,

'228.2': `# ArchUnit — Architecture Tests as Code

ArchUnit is a Java library for writing architecture rules as unit tests. Rules like "service classes should not depend on controllers" or "domain classes should not use Spring annotations" are verified automatically on every build.

## Dependency

\`\`\`xml
<dependency>
    <groupId>com.tngtech.archunit</groupId>
    <artifactId>archunit-junit5</artifactId>
    <version>1.3.0</version>
    <scope>test</scope>
</dependency>
\`\`\`

## Basic ArchUnit Setup

\`\`\`java
@AnalyzeClasses(packages = "com.example")
class ArchitectureTest {

    @ArchTest
    static final ArchRule controllers_should_not_depend_on_repositories =
        noClasses()
            .that().areAnnotatedWith(RestController.class)
            .should().dependOnClassesThat().areAnnotatedWith(Repository.class)
            .because("Controllers should go through Services, not access data directly");

    @ArchTest
    static final ArchRule services_should_not_depend_on_controllers =
        noClasses()
            .that().resideInAPackage("..service..")
            .should().dependOnClassesThat().resideInAPackage("..controller..")
            .because("Services are the inner layer and must not depend on the outer layer");

    @ArchTest
    static final ArchRule domain_should_not_use_spring =
        noClasses()
            .that().resideInAPackage("..domain..")
            .should().dependOnClassesThat().resideInAPackage("org.springframework..")
            .because("Domain model must be framework-agnostic");
}
\`\`\`

## Layered Architecture Rules

\`\`\`java
@AnalyzeClasses(packages = "com.example")
class LayeredArchitectureTest {

    @ArchTest
    static final ArchRule layered_architecture =
        layeredArchitecture()
            .consideringAllDependencies()
            .layer("Controller").definedBy("..controller..")
            .layer("Service").definedBy("..service..")
            .layer("Domain").definedBy("..domain..")
            .layer("Repository").definedBy("..repository..")
            .whereLayer("Controller").mayNotBeAccessedByAnyLayer()
            .whereLayer("Service").mayOnlyBeAccessedByLayers("Controller")
            .whereLayer("Repository").mayOnlyBeAccessedByLayers("Service")
            .whereLayer("Domain").mayOnlyBeAccessedByLayers("Service", "Repository");
}
\`\`\`

## Naming Convention Rules

\`\`\`java
@ArchTest
static final ArchRule services_should_be_named_service =
    classes()
        .that().areAnnotatedWith(Service.class)
        .should().haveSimpleNameEndingWith("Service")
        .orShould().haveSimpleNameEndingWith("Handler")
        .orShould().haveSimpleNameEndingWith("Facade");

@ArchTest
static final ArchRule repositories_should_be_named_repository =
    classes()
        .that().areAnnotatedWith(Repository.class)
        .should().haveSimpleNameEndingWith("Repository");

@ArchTest
static final ArchRule controllers_should_be_in_controller_package =
    classes()
        .that().areAnnotatedWith(RestController.class)
        .should().resideInAPackage("..controller..");
\`\`\`

## Cycle Detection

Circular dependencies between modules prevent independent testing and deployment:

\`\`\`java
@ArchTest
static final ArchRule no_cycles_in_modules =
    slices()
        .matching("com.example.(*)..")
        .should().beFreeOfCycles();
\`\`\`

This fails if the orders module imports from shipping and shipping imports from orders.

## Custom Architecture Rules

\`\`\`java
@ArchTest
static final ArchRule aggregates_should_not_access_repositories =
    noClasses()
        .that().resideInAPackage("..domain..")
        .and().haveSimpleNameNotEndingWith("Repository")
        .should().dependOnClassesThat()
            .resideInAPackage("..repository..")
            .andShould().haveSimpleNameEndingWith("Repository")
        .because("Domain objects should not directly access repositories — " +
                 "use application services instead");

@ArchTest
static final ArchRule value_objects_should_be_immutable =
    classes()
        .that().resideInAPackage("..domain.valueobject..")
        .should(HaveNoPublicSetterMethods.INSTANCE);
\`\`\`

## Running ArchUnit Tests in CI

ArchUnit tests are standard JUnit 5 tests — they run with \`mvn test\` or \`gradle test\`. Violations produce clear error messages:

\`\`\`
ArchConditionViolation:
Class <com.example.orders.OrderController>
  accesses field <com.example.orders.OrderRepository.entityManager>
  in (OrderController.java:45)

  because: Controllers should go through Services, not access data directly
\`\`\`

This catches architecture violations before they reach code review, reducing the cognitive load on reviewers.`,

'228.3': `# Module Testing with Spring Modulith

Spring Modulith provides first-class testing support for modular applications — test each module in isolation without loading the full application context.

## Module Integration Tests

Test a single module with only its dependencies loaded:

\`\`\`java
@ApplicationModuleTest  // loads only the "orders" module and its dependencies
class OrderModuleTest {

    @Autowired
    private OrderService orderService;

    // Only orders module beans are available — shipping, billing are excluded
    @MockBean
    private InventoryService inventoryService; // dependency mocked

    @Test
    void placeOrder_reserves_inventory() {
        given(inventoryService.reserve(any(), anyInt())).willReturn(true);

        OrderId id = orderService.placeOrder(new PlaceOrderCommand(
            customerId, List.of(new OrderItemRequest(productId, 2)), address));

        assertThat(id).isNotNull();
        verify(inventoryService).reserve(productId, 2);
    }
}
\`\`\`

Loading only one module is much faster than loading the full application context. A full context with 50 modules might take 30 seconds; loading one module takes 3 seconds.

## Testing Event Publication

Verify that a module publishes the correct events without wiring up all listeners:

\`\`\`java
@ApplicationModuleTest
class OrderEventPublicationTest {

    @Autowired
    private OrderService orderService;

    @Autowired
    private PublishedEvents events;

    @Test
    void placeOrder_publishes_OrderPlaced_event() {
        orderService.placeOrder(new PlaceOrderCommand(customerId, items, address));

        events.ofType(OrderPlaced.class)
            .matching(OrderPlaced::customerId, customerId)
            .hasSize(1);
    }

    @Test
    void confirmOrder_publishes_OrderConfirmed_event() {
        OrderId orderId = orderService.placeOrder(/* ... */);
        orderService.confirmOrder(orderId);

        events.ofType(OrderConfirmed.class)
            .matching(OrderConfirmed::orderId, orderId)
            .hasSize(1);
    }
}
\`\`\`

## Scenario-based Testing

Spring Modulith provides a \`Scenarios\` API for event-driven interaction tests:

\`\`\`java
@ApplicationModuleTest
class ShippingIntegrationTest {

    @Autowired
    Scenarios scenarios;

    @Test
    void orderConfirmed_triggers_shipment_scheduling() {
        scenarios.publish(new OrderConfirmed(OrderId.generate(), Instant.now()))
            .andWaitForStateChange(() -> shipmentRepository.count())
            .andVerify(result -> {
                assertThat(result).isEqualTo(1L);
            });
    }
}
\`\`\`

## Event Publication Log

Spring Modulith tracks event publication to guarantee at-least-once delivery. If the listener crashes after the event is published but before completing, the event is re-published on the next startup:

\`\`\`yaml
spring:
  modulith:
    events:
      completion-mode: delete  # delete event record after successful handling
      # or: update             # mark as completed (keeps audit log)
\`\`\`

\`\`\`java
// Spring Modulith creates this table automatically
// event_publication: id, listener_id, event_type, serialized_event, publication_date, completion_date
\`\`\`

This table-backed delivery guarantee means: even if the shipping module's OrderConfirmed listener crashes, the event isn\'t lost. On restart, Spring Modulith re-publishes incomplete events.

## From Modular Monolith to Microservices

When a module needs independent scaling or deployment, extract it:

1. The module is already self-contained (enforced by Spring Modulith/ArchUnit)
2. Replace direct Spring event publication with Kafka/RabbitMQ for cross-process events
3. Expose the module's public API as REST or gRPC endpoints
4. Deploy as a separate Spring Boot application

The refactoring is mechanical because the module boundaries were enforced from the start. Contrast this with extracting a service from a "Big Ball of Mud" — weeks of untangling vs days of wiring.

## Decision: Modular Monolith vs Microservices

| Factor | Modular Monolith | Microservices |
|---|---|---|
| Team size | < 15 engineers | > 30 engineers |
| Scaling | Vertical + limited horizontal | Fine-grained horizontal |
| Deployment | One artifact | Many artifacts |
| Operational complexity | Low | High |
| Inter-module consistency | Strong (same transaction) | Eventual |
| Time to market | Faster initially | Slower initially |

Default to a well-structured modular monolith. Extract microservices when you have a specific, compelling reason — not because microservices are "the modern way."`,
}

export const quiz: Record<string, QuizQuestion[]> = {

'228.1': [
  {
    question: 'What does Spring Modulith use to define module boundaries within a Spring Boot application?',
    options: [
      'A modulith.yml configuration file that lists each module and its public API classes',
      'The Java package hierarchy — each top-level package under the application\'s root package defines one module; types in an "internal" subpackage are treated as module-private',
      'Spring @Module annotations on each configuration class',
      'Separate Maven/Gradle submodules, each with its own Spring Boot application',
    ],
    correctIndex: 1,
    explanation: 'Spring Modulith\'s convention: com.example.orders.* is the "orders" module. com.example.orders.internal.* contains types that other modules cannot access. No configuration file needed — the package structure IS the architecture. This convention-over-configuration approach means the structure is visible in any IDE and enforced by the framework\'s verification.',
  },
  {
    question: 'What is @ApplicationModuleListener and how does it differ from @EventListener?',
    options: [
      '@ApplicationModuleListener is faster because it uses a thread pool for concurrent event processing',
      '@ApplicationModuleListener is Spring Modulith\'s equivalent of @TransactionalEventListener(AFTER_COMMIT) — it runs after the publishing transaction commits, and additionally marks the listener as belonging to a specific module for documentation and monitoring purposes',
      '@ApplicationModuleListener validates that the event type belongs to the same bounded context as the listener',
      '@ApplicationModuleListener automatically retries failed event handling up to 3 times',
    ],
    correctIndex: 1,
    explanation: '@EventListener runs synchronously within the publishing transaction — if the listener fails, the whole transaction rolls back. @ApplicationModuleListener runs after commit, ensuring side effects only happen for successfully committed state changes. The "module" marking enables Spring Modulith to generate module interaction diagrams and track event publication/completion in the event publication log.',
  },
  {
    question: 'When should modules communicate via Spring Events rather than direct method calls?',
    options: [
      'Always — direct calls between modules are forbidden by Spring Modulith',
      'When the downstream module (shipping, billing) should react to the upstream module\'s (orders) state changes without the upstream module needing to know which downstream modules exist — events decouple the publisher from subscribers',
      'When performance is critical — events are faster than direct method calls',
      'When the modules are in different packages — events bridge package boundaries',
    ],
    correctIndex: 1,
    explanation: 'If orders calls shipping.scheduleShipment() directly, orders depends on shipping. Adding a new reactor (billing, analytics) requires modifying orders. With events, orders publishes OrderConfirmed and is done — each module listens independently. Orders has zero knowledge of shipping or billing. New modules can react to existing events without changing the orders module. Direct calls are appropriate when the dependency is intentional and permanent (orders always needs inventory).',
  },
  {
    question: 'What is the primary advantage of starting with a modular monolith over microservices?',
    options: [
      'A modular monolith always performs better because there is no network overhead',
      'A modular monolith has lower operational complexity (one deployment, same-process calls, simple transactions) while enforced module boundaries preserve the option to extract microservices later when there\'s a specific compelling reason',
      'Spring Modulith prevents all architectural mistakes automatically, something microservices cannot do',
      'Modular monoliths have unlimited horizontal scaling capacity',
    ],
    correctIndex: 1,
    explanation: 'The "microservices first" mistake: teams spend months on Kubernetes, service meshes, distributed tracing, and saga patterns before shipping a single feature. Modular monolith first: ship faster, enforce boundaries from day one, and extract only when needed. The extraction is mechanical when boundaries are enforced — versus extracting from a Big Ball of Mud, which can take longer than building the microservice from scratch.',
  },
  {
    question: 'What does Spring Modulith\'s event publication log guarantee?',
    options: [
      'That each event is processed exactly once, even across application restarts',
      'At-least-once delivery — if an @ApplicationModuleListener fails or the process crashes after event publication but before handler completion, the event is re-published on the next startup so no events are permanently lost',
      'That events are processed in strict publication order across all modules',
      'That event processing is transactional and will roll back the originating transaction on failure',
    ],
    correctIndex: 1,
    explanation: 'The event publication log table records every published event and whether its handler completed. On startup, Spring Modulith finds incomplete event records and re-publishes them. This provides at-least-once delivery — handlers must be idempotent (handling the same event twice should be safe). With completion-mode: delete, completed events are removed; with "update," the log is kept as an audit trail.',
  },
],

'228.2': [
  {
    question: 'What is ArchUnit and what type of rules can it enforce?',
    options: [
      'ArchUnit is a code formatter that enforces style rules in Java source files',
      'ArchUnit is a Java testing library that verifies architectural rules as unit tests — enforcing layering (controllers don\'t import repositories), naming conventions (Services end with "Service"), package placement, and detecting circular dependencies',
      'ArchUnit is a Spring Boot starter that generates architecture diagrams from running application metrics',
      'ArchUnit is an alternative to Maven/Gradle that enforces build dependency rules',
    ],
    correctIndex: 1,
    explanation: 'ArchUnit works by analyzing bytecode — it loads compiled classes and checks their dependency relationships. No runtime needed; it runs as part of the test suite. Rules are expressed in a fluent Java DSL: noClasses().that().areAnnotatedWith(RestController.class).should().dependOnClassesThat().areAnnotatedWith(Repository.class). Violations are reported as test failures with specific class and line number.',
  },
  {
    question: 'Why is detecting circular dependencies between modules valuable as an automated test?',
    options: [
      'Circular dependencies cause StackOverflowErrors at runtime that are hard to diagnose',
      'Circular dependencies prevent modules from being independently testable, deployed, or extracted — detecting them automatically in CI prevents the architecture from degrading over time as the codebase grows',
      'Spring\'s dependency injection container fails to start when circular bean dependencies exist',
      'Circular imports prevent Java\'s class loader from loading the affected classes',
    ],
    correctIndex: 1,
    explanation: 'If orders imports shipping and shipping imports orders, you cannot test either in isolation — you must load both. You cannot deploy one without the other. You cannot extract one to a microservice without taking the other. Architecture decays gradually; without automated detection, circular dependencies accumulate until the codebase is one large inextricable blob. ArchUnit catches each addition of a circular dependency immediately.',
  },
  {
    question: 'What is the benefit of enforcing "domain classes should not use Spring annotations" via ArchUnit?',
    options: [
      'It reduces application startup time by keeping domain classes out of Spring\'s component scan',
      'Domain objects that don\'t depend on Spring can be unit-tested without a Spring context (faster, simpler tests), and can be reused in non-Spring contexts if the application is ever migrated',
      'Spring annotations conflict with JPA annotations in domain classes, causing mapping errors',
      'It prevents circular dependency injection in complex domain object graphs',
    ],
    correctIndex: 1,
    explanation: 'A domain class with @Autowired or @Service cannot be instantiated with "new Order()" in a unit test — you need a Spring context. Context startup takes seconds; "new Order()" takes microseconds. Framework-agnostic domain objects can be tested at the unit level with plain Java, making tests faster and simpler. This also separates what your application does (domain) from how it\'s wired (Spring) — a clean separation that improves maintainability.',
  },
  {
    question: 'At what phase of development do ArchUnit architecture tests run?',
    options: [
      'During code review, as a GitHub Actions check that posts comments on PRs',
      'During the standard test phase (mvn test / gradle test) as JUnit 5 tests — violations fail the build immediately without any additional tooling or CI configuration',
      'During application startup, preventing deployment if architecture rules are violated',
      'During the compile phase, as a Java annotation processor that rejects violating code',
    ],
    correctIndex: 1,
    explanation: 'ArchUnit tests are standard JUnit 5 tests using @AnalyzeClasses and @ArchTest annotations. They run in the normal test phase with no special tooling. This means: violations are caught in the developer\'s local build before committing, and they fail the CI pipeline on every push. The rules are code — they live in the repository, are reviewed in PRs, and evolve with the architecture.',
  },
  {
    question: 'What does the noClasses().that().areAnnotatedWith(X).should().dependOnClassesThat().areAnnotatedWith(Y) rule enforce?',
    options: [
      'Classes annotated with X must inherit from classes annotated with Y',
      'No class annotated with X (e.g., @RestController) should have any import or field/method reference to a class annotated with Y (e.g., @Repository) — enforcing that controllers never bypass services to access the database',
      'Classes annotated with X and Y cannot be in the same package',
      'Annotations X and Y cannot be used together on the same class',
    ],
    correctIndex: 1,
    explanation: 'ArchUnit analyzes class dependencies at the bytecode level — any time class A uses class B (imports, field declarations, method calls, constructor invocations), A "depends on" B. The rule noClasses().that().areAnnotatedWith(RestController).should().dependOnClassesThat().areAnnotatedWith(Repository) catches controller.findAll() calling repo.findAll() directly — a bypassed service layer that becomes a maintenance problem as business logic accumulates.',
  },
],

'228.3': [
  {
    question: 'What is @ApplicationModuleTest and what does it load?',
    options: [
      'It loads the full Spring application context for comprehensive integration testing',
      'It loads only the module under test and its declared dependencies — other modules are excluded, making tests faster and more focused. Cross-module dependencies must be mocked',
      'It loads a minimal Spring context with only the test class and its direct @Autowired dependencies',
      'It runs the test in an isolated classpath with no Spring context at all',
    ],
    correctIndex: 1,
    explanation: 'A full @SpringBootTest might load 50 modules taking 30 seconds to start. @ApplicationModuleTest for the orders module loads only orders + its dependencies (inventory) but not shipping or billing. This makes the test 10x faster and forces explicit mocking of cross-module dependencies — making the module\'s external contracts visible. It\'s the Spring Modulith equivalent of a service-level integration test.',
  },
  {
    question: 'What does the PublishedEvents API in Spring Modulith allow you to assert?',
    options: [
      'That specific Kafka topics received messages during the test',
      'That the code under test published specific domain events with specific attributes — without requiring the event listeners to actually execute, testing only the publishing side of the event interaction',
      'That the correct number of database rows were written during the test',
      'That event listeners executed in the correct order',
    ],
    correctIndex: 1,
    explanation: 'PublishedEvents captures events published via ApplicationEventPublisher during the test. You assert which event types were published and what their fields contain — without the listeners running. This is exactly right for testing "does placeOrder() publish an OrderPlaced event with the correct customerId?" without also testing the shipping and billing listeners that would react to that event.',
  },
  {
    question: 'What refactoring work is needed to extract a Spring Modulith module into a microservice?',
    options: [
      'Extensive refactoring — the module must be rewritten from scratch in the microservice architecture',
      'Minimal mechanical work — replace Spring ApplicationEventPublisher with a message broker (Kafka/RabbitMQ) for cross-process events, and expose the module\'s public API as REST/gRPC endpoints. The module\'s internal structure stays the same',
      'The module must be converted from JPA to reactive R2DBC to handle the increased load',
      'All inter-module dependencies must be replaced with REST calls before extraction',
    ],
    correctIndex: 1,
    explanation: 'The modular monolith enforces the same design principles as microservices (bounded contexts, narrow public APIs, no reaching into internal packages). The extraction is wiring work: replace local event publisher with Kafka producer, add Kafka consumer in the new service, add REST controllers for the public API. The domain model, application services, and repositories are unchanged. This is why starting with a modular monolith is not a dead end — it\'s a stepping stone.',
  },
  {
    question: 'What is the main criterion for deciding when to extract a module into a microservice?',
    options: [
      'When the module has more than 10,000 lines of code',
      'When there is a specific, compelling operational reason — independent scaling requirements, different release cadences, different technology stack needs, or team autonomy at scale — not "because microservices are modern"',
      'After 6 months of running the modular monolith in production',
      'When the module is owned by a team of more than 3 developers',
    ],
    correctIndex: 1,
    explanation: 'Microservices add operational complexity: each service needs its own CI/CD pipeline, container image, Kubernetes deployment, health checks, distributed tracing integration, and on-call rotation. This overhead pays off when you need independent scaling ("the AI recommendation module needs 10 GPU nodes, everything else uses 2 CPU nodes") or team autonomy at Amazon scale. For most applications, the overhead never pays off. Extract when you have an actual problem, not in anticipation of hypothetical future scale.',
  },
  {
    question: 'Why does Spring Modulith\'s event publication log use "at-least-once" delivery semantics rather than "exactly-once"?',
    options: [
      'Exactly-once delivery is impossible in distributed systems; at-least-once is the best achievable guarantee',
      'Exactly-once delivery would require a distributed two-phase commit between the event store and the listener state, which is complex and slow. At-least-once delivery (with idempotent handlers) achieves the same correctness guarantee with simpler infrastructure',
      'At-least-once is sufficient for logging; exactly-once is only needed for payment events',
      'Spring\'s transactional infrastructure only supports at-least-once in the current version',
    ],
    correctIndex: 1,
    explanation: 'True exactly-once requires coordinating a transaction across the event store and the handler\'s state change — a distributed transaction. This is expensive and complex. At-least-once + idempotent handlers is equivalent in practice: processing an event twice that is idempotent produces the same result as processing it once. Design all @ApplicationModuleListeners to be idempotent (check "did I already process this?" or use upsert patterns) and at-least-once becomes safe and simple.',
  },
],
}

export const codingTask: Record<string, {
  instructions: string; boilerplate: string; rubric: string[]; hints: string[]
}> = {

'228.2': {
  instructions: `Write an ArchUnit architecture test class for a Spring Boot application.

Requirements:

1. Create a class \`ArchitectureTest\` annotated with \`@AnalyzeClasses(packages = "com.example")\`.

2. Add an \`@ArchTest\` rule \`controllers_should_not_use_repositories\`:
   - No class annotated with \`@RestController\` should depend on classes annotated with \`@Repository\`
   - Use \`noClasses().that().areAnnotatedWith(RestController.class).should().dependOnClassesThat().areAnnotatedWith(Repository.class)\`

3. Add an \`@ArchTest\` rule \`services_should_not_depend_on_controllers\`:
   - No class in any package matching "..service.." should depend on classes in "..controller.."
   - Use package matching with \`.resideInAPackage("..service..")\` and \`.resideInAPackage("..controller..")\`

4. Add an \`@ArchTest\` rule \`no_cycles_in_top_level_packages\`:
   - Use \`slices().matching("com.example.(*)..")\` to check that the top-level modules are free of cycles

All rules must be \`static final\` fields of type \`ArchRule\`.`,
  boilerplate: `package com.example;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.dependencies.SlicesRuleDefinition.slices;

import org.springframework.data.repository.Repository;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.stereotype.Service;

// TODO: Add @AnalyzeClasses(packages = "com.example")
public class ArchitectureTest {

    // TODO: controllers_should_not_use_repositories — @ArchTest static final ArchRule
    // noClasses that are @RestController should depend on @Repository classes

    // TODO: services_should_not_depend_on_controllers — @ArchTest static final ArchRule
    // noClasses in "..service.." should depend on classes in "..controller.."

    // TODO: no_cycles_in_top_level_packages — @ArchTest static final ArchRule
    // slices().matching("com.example.(*)..")should().beFreeOfCycles()
}`,
  rubric: [
    '@AnalyzeClasses(packages = "com.example") annotation present on the class',
    'controllers_should_not_use_repositories is static final ArchRule with @ArchTest',
    'controllers rule uses noClasses().that().areAnnotatedWith(RestController.class).should().dependOnClassesThat().areAnnotatedWith(Repository.class)',
    'services_should_not_depend_on_controllers is static final ArchRule with @ArchTest',
    'services rule uses noClasses().that().resideInAPackage("..service..").should().dependOnClassesThat().resideInAPackage("..controller..")',
    'no_cycles_in_top_level_packages is static final ArchRule with @ArchTest',
    'cycles rule uses slices().matching("com.example.(*)..").should().beFreeOfCycles()',
  ],
  hints: [
    '@AnalyzeClasses(packages = "com.example")',
    '@ArchTest static final ArchRule controllers_should_not_use_repositories = noClasses().that().areAnnotatedWith(RestController.class).should().dependOnClassesThat().areAnnotatedWith(Repository.class);',
    '@ArchTest static final ArchRule services_should_not_depend_on_controllers = noClasses().that().resideInAPackage("..service..").should().dependOnClassesThat().resideInAPackage("..controller..");',
    '@ArchTest static final ArchRule no_cycles_in_top_level_packages = slices().matching("com.example.(*)..").should().beFreeOfCycles();',
  ],
},
}
