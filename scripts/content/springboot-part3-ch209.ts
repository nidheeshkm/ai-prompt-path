// Part III — AI-Accelerated Spring Boot Dev
// Chapter 209: AI-Driven Test-Driven Development

import type { QuizQuestion } from '../../src/data/curriculum'

export const courseId = 'springboot-ai-architect'

export const content: Record<string, string> = {

'209.1': `# Writing Tests with AI — From Spec to Green

Test-Driven Development with AI flips the traditional TDD ceremony: instead of writing a failing test by hand, you describe the behaviour in plain language, let AI generate the test, review it, then write the implementation. The discipline is the same — tests first, production code second — but the speed of the red phase collapses from minutes to seconds.

## The AI-TDD Loop

\`\`\`
1. Write a behaviour description (comment or Javadoc)
2. AI generates the @Test method (or entire test class)
3. Review: does this test actually verify the behaviour?
4. Run — it fails (no implementation yet)
5. Implement the production code
6. Run — green
7. Refactor, rerun
\`\`\`

Step 3 is the most important and the step developers most often skip. AI-generated tests have a failure mode: they test *what you wrote* not *what you need*. A test that calls \`productService.create(request)\` and asserts \`assertNotNull(result)\` is almost always correct but almost always useless.

## Prompting for JUnit 5 Tests

### Copilot — Method-name technique
JUnit 5 test method names are executable documentation. Write the name, press Enter, and let Copilot generate the body:

\`\`\`java
@Test
void should_throw_OutOfStockException_when_requested_quantity_exceeds_stock() {
    // Copilot generates:
    // given
    var product = new Product("SKU-001", 5); // 5 in stock
    var request = new PurchaseRequest("SKU-001", 10);

    // when / then
    assertThrows(OutOfStockException.class, () -> purchaseService.purchase(request));
}
\`\`\`

The specificity of the method name is the prompt. \`should_throw_X_when_Y\` is far more generative than \`test_purchase\`.

### Cursor — Generate a full test class
In Cursor chat with \`@file ProductService.java\`:

> Generate a complete JUnit 5 test class for ProductService. For each public method, write at least one happy-path test and one error/edge-case test. Use @ExtendWith(MockitoExtension.class), mock dependencies with @Mock, test the service via @InjectMocks.

Cursor reads the real interface and generates tests that mirror its actual method signatures and exceptions.

### Claude Code — Behaviour-driven test generation
\`\`\`
> @file src/main/java/com/myapp/service/ProductService.java
  Generate a test class that covers:
  - Happy path for each method
  - Validation failures (null inputs, empty strings, negative quantities)
  - Concurrent calls: ensure idempotency of create()
  - Database error propagation: what happens when the repository throws DataAccessException

  Use Mockito for unit tests. Run ./mvnw test after generating to verify compilation.
\`\`\`

## AI for Edge Case Discovery

The most underrated use of AI in testing is edge case discovery, not code generation:

\`\`\`
> You are a QA engineer reviewing OrderService.createOrder().
  Here is the method signature and Javadoc:
  [paste]

  List every edge case and failure mode I should test. Include:
  - Input validation failures
  - Concurrent execution scenarios
  - External system failures (DB down, Kafka unavailable)
  - Business rule violations
  Do not write code yet — just list the scenarios.
\`\`\`

This produces a checklist that drives your test plan. Then, for each scenario: write the method name → accept Copilot's body → verify → move on.

## Reviewing AI-Generated Tests

Before accepting an AI-generated test, ask:

1. **Does the assertion actually fail if the production code is wrong?** Replace the implementation with a no-op — does the test fail? If not, it's a false positive.
2. **Is the arrange section realistic?** AI loves to create \`new Product("test", 0)\` — does a zero-price product make sense in your domain?
3. **Are there hidden dependencies?** AI sometimes creates \`@SpringBootTest\` when \`@ExtendWith(MockitoExtension.class)\` was intended, pulling in the full application context unnecessarily.
4. **Does it test behaviour or implementation?** A test that verifies \`verify(repository, times(1)).save(any())\` is testing implementation. A test that verifies the returned DTO has the correct values is testing behaviour. Prefer behaviour.

## Parametrised Test Generation

AI excels at generating \`@ParameterizedTest\` cases because it can enumerate a value space efficiently:

\`\`\`
> Generate a @ParameterizedTest for the email validation in UserService.register().
  Include: valid emails, missing @ symbol, missing domain, multiple @ symbols,
  very long email, email with special characters, null, empty string.
\`\`\`

Result: a \`@MethodSource\` or \`@CsvSource\` with 10-15 test cases that would take 20 minutes to write by hand.`,

'209.2': `# AI-Assisted Testcontainers Integration Tests

Testcontainers is the standard for Spring Boot integration testing: instead of mocking a database or message broker, you spin up real Docker containers in the test JVM. The setup code — container declarations, dynamic properties, lifecycle management — is boilerplate that AI generates perfectly.

## Why Testcontainers + AI is Transformative

Without AI, setting up a Testcontainers test for a service that uses PostgreSQL, Kafka, and Redis requires:
- 30-50 lines of container declaration and property configuration
- Knowing the exact container image names and versions
- Understanding \`@DynamicPropertySource\` and its caveats
- Debugging port binding and network issues

With AI, you describe the scenario and review the output. The AI knows Testcontainers idioms because they appear repeatedly in open-source Spring Boot projects.

## Standard Testcontainers Pattern (Spring Boot 3.1+)

Spring Boot 3.1 introduced first-class Testcontainers support. The canonical pattern:

\`\`\`java
@SpringBootTest
@Testcontainers
class OrderServiceIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @Container
    @ServiceConnection
    static KafkaContainer kafka = new KafkaContainer(
        DockerImageName.parse("confluentinc/cp-kafka:7.6.0")
    );

    @Container
    @ServiceConnection
    static GenericContainer<?> redis = new GenericContainer<>("redis:7-alpine")
        .withExposedPorts(6379);

    @Autowired
    private OrderService orderService;

    // Tests — containers are started once, shared across all test methods
}
\`\`\`

\`@ServiceConnection\` automatically configures Spring datasource/broker properties from the container's bound ports — no \`@DynamicPropertySource\` needed.

## Prompting AI for Testcontainers Setup

### Copilot — container-declaration completion
Type the \`@Container\` annotation and the container class name; Copilot fills the constructor:

\`\`\`java
@Container
@ServiceConnection
static PostgreSQLContainer<?> postgres = // Copilot: new PostgreSQLContainer<>("postgres:16");
\`\`\`

### Cursor — full test class from scenario description

\`\`\`
@file src/main/java/com/myapp/service/OrderService.java

Generate a Testcontainers integration test for OrderService.createOrder():
- Use PostgreSQL 16 and Kafka (confluentinc 7.6) containers via @ServiceConnection
- Test 1: happy path — order is persisted, OrderCreatedEvent published to Kafka
- Test 2: out-of-stock — throws OutOfStockException, no event published
- Test 3: database constraint violation — duplicate order ID handled gracefully

Use @SpringBootTest, @Testcontainers. Verify Kafka messages using KafkaTestUtils.
\`\`\`

### Claude Code — full integration test with iterative fix

\`\`\`
> Generate Testcontainers integration tests for all @Service classes that interact
  with external systems (database, Kafka, Redis). After generating, run
  ./mvnw test and fix any container startup or test failures.
\`\`\`

Claude Code will run the tests, see that e.g. Redis is not using the right property key, fix the \`@DynamicPropertySource\`, and rerun — iterating until green.

## Testing Kafka Message Production

\`\`\`java
@Test
void should_publish_OrderCreatedEvent_when_order_is_created() throws Exception {
    // Arrange
    var consumer = createKafkaConsumer("order-events");
    var request = new CreateOrderRequest(customerId, List.of(new OrderItem("SKU-001", 2)));

    // Act
    var order = orderService.create(request);

    // Assert — poll Kafka with a timeout
    ConsumerRecords<String, String> records = consumer.poll(Duration.ofSeconds(5));
    assertThat(records).hasSize(1);

    var event = objectMapper.readValue(records.iterator().next().value(), OrderCreatedEvent.class);
    assertThat(event.orderId()).isEqualTo(order.id());
    assertThat(event.customerId()).isEqualTo(customerId);
}

private KafkaConsumer<String, String> createKafkaConsumer(String topic) {
    var props = new Properties();
    props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, kafka.getBootstrapServers());
    props.put(ConsumerConfig.GROUP_ID_CONFIG, "test-" + UUID.randomUUID());
    props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
    props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
    props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
    var consumer = new KafkaConsumer<String, String>(props);
    consumer.subscribe(List.of(topic));
    return consumer;
}
\`\`\`

Describe this pattern to AI once; it replicates it correctly for every Kafka test thereafter.

## Flyway + Testcontainers

Testcontainers starts a fresh database for each test run. Flyway applies your migrations automatically when the application context starts — so your integration tests always run against the same schema as production. No separate test schema management needed.

If a migration fails in a Testcontainers test, it means the migration is broken — catch it before production.

## Performance Tip: Shared Container Lifecycle

The \`static\` keyword on container declarations causes Testcontainers to start them once per class. For a test suite with many classes, use the singleton pattern:

\`\`\`java
public abstract class BaseIntegrationTest {
    static final PostgreSQLContainer<?> POSTGRES;
    static {
        POSTGRES = new PostgreSQLContainer<>("postgres:16");
        POSTGRES.start();
    }
    // All test classes extending this share one container instance
}
\`\`\`

AI generates this pattern correctly when you describe "start containers once for the entire test suite".`,

'209.3': `# Full Integration Test Generation with AI

The ultimate test of AI-assisted TDD is generating a complete integration test for an HTTP endpoint — arrange the database state, send the HTTP request through the full stack, assert the response and the resulting database state. This end-to-end verification is where Testcontainers + AI becomes a multiplier.

## The MockMvc Pattern for REST Endpoint Tests

\`\`\`java
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class ProductControllerIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired ProductRepository productRepository;
    @Autowired JdbcTemplate jdbcTemplate;

    @BeforeEach
    void cleanDatabase() {
        jdbcTemplate.execute("TRUNCATE TABLE products RESTART IDENTITY CASCADE");
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void should_create_product_and_return_201() throws Exception {
        var request = new CreateProductRequest("Widget Pro", new BigDecimal("49.99"), 100);

        mockMvc.perform(post("/api/v1/products")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").isNotEmpty())
            .andExpect(jsonPath("$.name").value("Widget Pro"))
            .andExpect(jsonPath("$.price").value(49.99));

        // Verify persistence
        assertThat(productRepository.count()).isEqualTo(1);
    }

    @Test
    @WithMockUser(roles = "USER")
    void should_return_403_when_user_creates_product() throws Exception {
        var request = new CreateProductRequest("Widget", new BigDecimal("9.99"), 10);

        mockMvc.perform(post("/api/v1/products")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isForbidden());
    }
}
\`\`\`

## Prompting AI for the Full Test Class

The most effective Claude Code prompt for integration tests:

\`\`\`
@file src/main/java/com/myapp/api/ProductController.java
@file src/main/java/com/myapp/service/ProductService.java
@file src/main/java/com/myapp/security/SecurityConfig.java

Generate a complete MockMvc integration test class for ProductController.
Requirements:
- PostgreSQL 16 via Testcontainers @ServiceConnection
- Test every endpoint: GET /products, GET /products/{id}, POST /products, PUT /products/{id}, DELETE /products/{id}
- For each endpoint: happy path + validation error + auth failure
- Use @WithMockUser(roles="ADMIN") and @WithMockUser(roles="USER") to test security
- @BeforeEach truncates the products table so tests are isolated
- Assert both HTTP response (status + body) and database state
Run ./mvnw test -Dtest=ProductControllerIntegrationTest after generating.
\`\`\`

Claude Code reads the actual SecurityConfig to understand which roles have which permissions, then generates tests that match your real security rules — not invented ones.

## AI-Generated Test Data Builders

Hardcoded test data is brittle. The Builder pattern for test fixtures is better, and AI generates it from your entity:

\`\`\`
@file src/main/java/com/myapp/domain/Product.java

Generate a ProductTestBuilder class that creates valid Product instances for tests.
Use the Builder pattern. Include factory methods:
- ProductTestBuilder.aProduct() — default valid product
- ProductTestBuilder.anExpiredProduct() — product past its expiry date
- ProductTestBuilder.anOutOfStockProduct() — product with quantity 0
- ProductTestBuilder.anInvalidProduct() — product that fails Bean Validation
\`\`\`

Result: reusable test data that every test in the codebase can use, keeping test setup readable:

\`\`\`java
var product = ProductTestBuilder.aProduct().withPrice(new BigDecimal("99.99")).build();
\`\`\`

## Analysing Test Coverage with AI

After generating tests, use AI to identify gaps:

\`\`\`
@file src/main/java/com/myapp/service/OrderService.java
@file src/test/java/com/myapp/service/OrderServiceTest.java

Compare the production code and the test class.
List every code path in OrderService that is NOT covered by a test.
For each gap, write a one-line description of the test case needed.
Do not generate the test code yet — just the list.
\`\`\`

This produces a prioritised coverage checklist. Add the missing tests in the next session.

## The AI TDD Workflow in Practice

Day-to-day with AI-TDD looks like this:

1. **Morning**: Describe today's feature to Claude Code → get a list of test cases
2. **Start coding**: Write method name → Copilot generates test body → review
3. **Run tests**: Everything fails (red)
4. **Implement**: Copilot assists with production code → guided by failing tests
5. **Green**: All tests pass
6. **Refactor**: Use Cursor \`Cmd+K\` to clean up → tests stay green
7. **Coverage check**: AI identifies untested paths → add tests

The key discipline: never let AI skip the red phase. If you ask for production code and tests in the same prompt, AI often writes tests that pass without implementing anything meaningful. Separate the prompts: tests first, implementation second.`,
}

export const quiz: Record<string, QuizQuestion[]> = {

'209.1': [
  {
    question: 'What is the most effective way to prompt GitHub Copilot to generate a specific JUnit 5 test body?',
    options: [
      'Type @Test and wait for Copilot to suggest a random test',
      'Write a highly descriptive method name like should_throw_OutOfStockException_when_quantity_exceeds_stock',
      'Write the full implementation first, then ask Copilot to generate a test for it',
      'Use Copilot Chat with /tests and highlight the test class',
    ],
    correctIndex: 1,
    explanation: 'A specific method name is a natural-language spec that Copilot can translate directly into arrange/act/assert code. The more specific the name (including what is expected and under what condition), the more accurate the generated test body. This is the highest-leverage single technique in AI-assisted TDD.',
  },
  {
    question: 'What is the key failure mode of AI-generated tests that developers must guard against?',
    options: [
      'AI generates tests with incorrect syntax that do not compile',
      'AI generates tests that verify what you wrote rather than what you need — they pass even when the code is wrong',
      'AI only generates unit tests and cannot generate integration tests',
      'AI-generated tests always use deprecated JUnit 4 APIs',
    ],
    correctIndex: 1,
    explanation: 'assertNotNull(result) and similar trivially-true assertions are the classic AI test failure mode. These tests pass even if the method is completely broken. Always verify by temporarily breaking the production code and confirming the test fails — if it still passes, the test provides no value.',
  },
  {
    question: 'Which type of AI prompt is most valuable for discovering edge cases to test, before writing any test code?',
    options: [
      '"Generate @ParameterizedTest cases for this method"',
      '"List every edge case, failure mode, and boundary condition for this method — do not generate code yet"',
      '"Write tests for all edge cases in this service class"',
      '"What would a QA tester check in this method — give me the test code"',
    ],
    correctIndex: 1,
    explanation: 'Separating discovery from generation gives you a checklist you can review, prioritise, and add to. When AI generates code directly, it makes implicit choices about which cases matter. The two-step approach — list first, code second — keeps you in control of the test plan.',
  },
  {
    question: 'You ask AI to generate a @ParameterizedTest for email validation. What should you verify before accepting it?',
    options: [
      'That the @ParameterizedTest annotation is spelled correctly',
      'That the test cases include meaningful boundary conditions (null, empty, invalid format, valid format) not just the happy path',
      'That the test uses @CsvSource not @MethodSource, which is more readable',
      'That the test class has @SpringBootTest for realistic validation context',
    ],
    correctIndex: 1,
    explanation: 'AI may generate plausible-looking parameterised tests that only cover obvious cases. Verify that null, empty string, boundary-length values, and invalid format variants are all present. For a validator, a test that only includes "valid@email.com" is almost worthless regardless of how it is structured.',
  },
  {
    question: 'What distinguishes a test of BEHAVIOUR from a test of IMPLEMENTATION?',
    options: [
      'Behaviour tests use MockMvc; implementation tests use Mockito',
      'Behaviour tests verify returned values and state changes; implementation tests verify that specific methods were called a specific number of times',
      'Behaviour tests are written before the code; implementation tests are written after',
      'There is no meaningful distinction — both are equally valid',
    ],
    correctIndex: 1,
    explanation: 'verify(repository, times(1)).save(any()) is an implementation test — it breaks if you rename the method or change the call count even if the feature still works. assertThat(result.status()).isEqualTo("ACTIVE") is a behaviour test — it only breaks if the actual behaviour is wrong. Prefer behaviour tests; they survive refactoring.',
  },
],

'209.2': [
  {
    question: 'What does the @ServiceConnection annotation in Spring Boot 3.1+ Testcontainers integration do?',
    options: [
      'It connects the test container to the production database for realistic data',
      'It automatically configures Spring datasource/broker properties from the container\'s bound ports, eliminating the need for @DynamicPropertySource',
      'It creates a service proxy that intercepts repository calls during testing',
      'It registers the container as a Spring bean available for injection in tests',
    ],
    correctIndex: 1,
    explanation: '@ServiceConnection reads the container\'s bound host and port after startup and sets the corresponding Spring Boot auto-configuration properties (e.g., spring.datasource.url). Before 3.1, this required @DynamicPropertySource with manual property mapping. @ServiceConnection works for JDBC, Kafka, Redis, and other supported container types.',
  },
  {
    question: 'Why should Testcontainers container fields be declared static in a test class?',
    options: [
      'Testcontainers requires static fields — non-static declarations cause a compilation error',
      'Static fields are started once per class rather than once per test method, dramatically reducing test suite runtime',
      'Static fields allow the container to be shared across different test classes in the same run',
      'Non-static containers do not support @ServiceConnection',
    ],
    correctIndex: 1,
    explanation: 'A non-static container starts and stops for every @Test method. For a PostgreSQL container that takes 2-3 seconds to start, a test class with 20 tests would spend 40-60 seconds on container management alone. Static containers start once and are destroyed at class teardown — the standard approach for any test class with multiple test methods.',
  },
  {
    question: 'You have a service that writes to a Kafka topic. In a Testcontainers integration test, how do you verify the message was published?',
    options: [
      'Mock the KafkaTemplate and verify the send() method was called',
      'Create a KafkaConsumer in the test with the container\'s bootstrap servers, subscribe to the topic, and poll with a timeout',
      'Use @SpyBean on KafkaTemplate and capture the argument with ArgumentCaptor',
      'Check the Kafka container\'s log output for the message content',
    ],
    correctIndex: 1,
    explanation: 'Mocking KafkaTemplate verifies the call happened but not that Kafka actually received the message in the correct format. A real KafkaConsumer connected to the Testcontainers Kafka broker verifies the full path: serialisation, broker acceptance, and topic routing — exactly what production will do.',
  },
  {
    question: 'What is the benefit of Flyway running automatically in Testcontainers integration tests?',
    options: [
      'Flyway speeds up container startup by pre-warming the database schema',
      'Tests run against the same schema as production — a migration error in tests means a migration error in production',
      'Flyway adds test-specific seed data that makes the arrange phase easier',
      'Flyway prevents test isolation issues by rolling back after each test',
    ],
    correctIndex: 1,
    explanation: 'Testcontainers starts a clean database. Flyway applies all migrations when the Spring context boots. If a migration is broken or incompatible, the test fails before any test method runs — catching schema errors in CI instead of production. This is the most valuable property of combining Testcontainers with Flyway.',
  },
  {
    question: 'What is the singleton Testcontainers pattern and when should you use it?',
    options: [
      'Using one @Container annotation per test suite — the default behaviour',
      'Declaring containers in an abstract base class with a static initialiser so they start once and are shared across all test classes in the suite',
      'A Spring Boot auto-configuration that creates one container per application context',
      'The pattern of using @Singleton on container beans to prevent duplicate containers',
    ],
    correctIndex: 1,
    explanation: 'The singleton pattern (static field in an abstract base class with static initialiser) shares a single container instance across every test class that extends the base. Without it, each test class starts its own containers. For a suite with 50 test classes, the singleton pattern can reduce total test runtime by 3-5 minutes.',
  },
],

'209.3': [
  {
    question: 'In a MockMvc integration test for a secured REST endpoint, what does @WithMockUser(roles="ADMIN") do?',
    options: [
      'It creates a real admin user in the test database before the test runs',
      'It sets up the Spring Security context with a mock authenticated user having ROLE_ADMIN, bypassing actual authentication',
      'It mocks the UserDetailsService to return an admin user on any authentication call',
      'It disables Spring Security for the duration of the annotated test method',
    ],
    correctIndex: 1,
    explanation: '@WithMockUser injects a pre-authenticated SecurityContext so the test request is treated as authenticated without needing a real JWT or session. It tests authorisation logic (does ADMIN have access?) without testing authentication (how does a user get a JWT?). Separate your auth tests from your business logic tests.',
  },
  {
    question: 'Why is @BeforeEach database truncation important in MockMvc integration tests?',
    options: [
      'It resets the auto-increment sequence so entity IDs are predictable',
      'It ensures test isolation — state from one test does not affect assertions in the next test',
      'It triggers Flyway to reapply all migrations before each test',
      'It is a performance optimisation that reduces query times',
    ],
    correctIndex: 1,
    explanation: 'Without truncation, a test that creates a product in the database leaves that product there for subsequent tests. A test asserting productRepository.count() == 1 would fail if a previous test already inserted a product. @BeforeEach truncation guarantees each test starts with a known empty state.',
  },
  {
    question: 'What is the advantage of AI-generated Test Data Builders (e.g., ProductTestBuilder) over hardcoded new Product() calls in each test?',
    options: [
      'Builders are faster to execute than direct constructor calls',
      'Builders provide meaningful defaults and named variants (aProduct(), anExpiredProduct()) that make tests readable and resilient to entity changes',
      'Builders avoid the need for Testcontainers by using in-memory data',
      'Builders automatically satisfy all Bean Validation constraints',
    ],
    correctIndex: 1,
    explanation: 'When you add a required field to Product, every hardcoded new Product() call fails. A builder with sensible defaults only requires updating the builder. Named variants (anOutOfStockProduct()) make test intent explicit — future readers understand the test scenario from the builder name, not from decoding raw field values.',
  },
  {
    question: 'You ask AI to analyse coverage gaps between a service class and its test class. What should the prompt specify to be most useful?',
    options: [
      'Ask for new test code immediately to fill the gaps',
      'Ask for a list of uncovered code paths only — no code — so you can review and prioritise before generating',
      'Ask AI to calculate the exact line coverage percentage',
      'Share only the test class, not the production class, so AI focuses on test quality',
    ],
    correctIndex: 1,
    explanation: 'Separating analysis from generation keeps you in control. AI may prioritise gaps differently than you would. Reviewing the gap list lets you decide which cases are critical vs. low-risk before spending time on test generation. It also reveals when AI misunderstands the code — catching that in the list is cheaper than catching it in generated tests.',
  },
  {
    question: 'What is the risk of asking AI for production code and tests in the same prompt, without following the red-green-refactor discipline?',
    options: [
      'AI cannot generate both in one prompt — it will only generate one or the other',
      'AI writes tests that are designed to pass its own implementation, creating tests that are always green but may miss real requirements',
      'The generated code will not compile because of circular dependencies between tests and production code',
      'AI always writes integration tests when asked for both, ignoring unit test requirements',
    ],
    correctIndex: 1,
    explanation: 'When AI writes both production code and tests together, it writes tests that verify what the production code does — not what it should do. The tests start green, giving false confidence. The failing-test discipline forces AI to write a specification first (test) and then an implementation that satisfies it, which is the only way to get meaningful verification.',
  },
],
}

export const codingTask: Record<string, {
  instructions: string
  boilerplate: string
  rubric: string[]
  hints: string[]
}> = {

'209.2': {
  instructions: `Write a Testcontainers integration test class for a \`NotificationService\` that:
- Saves a \`Notification\` entity to PostgreSQL (with fields: id UUID, recipientEmail, message, status, createdAt)
- Publishes a \`NotificationCreatedEvent\` to a Kafka topic named \`"notifications"\`
- Returns a \`NotificationDto\`

Your test class must:
1. Start PostgreSQL 16 and Kafka (confluentinc/cp-kafka:7.6.0) via \`@ServiceConnection\`
2. Test 1 — Happy path: call \`notificationService.send(request)\`, verify the notification is persisted with status \`"PENDING"\` AND the Kafka message is received on the \`"notifications"\` topic within 5 seconds
3. Test 2 — Null email input: verify \`ConstraintViolationException\` or \`IllegalArgumentException\` is thrown, nothing is saved to DB, no Kafka message produced
4. Use \`@BeforeEach\` to truncate the notifications table
5. Assert the Kafka message body contains the notification ID`,
  boilerplate: `@SpringBootTest
@Testcontainers
class NotificationServiceIntegrationTest {

    // TODO: declare PostgreSQL container with @ServiceConnection

    // TODO: declare Kafka container with @ServiceConnection

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        // TODO: truncate notifications table
    }

    @Test
    void should_persist_notification_and_publish_event() throws Exception {
        // TODO: arrange — create a SendNotificationRequest

        // TODO: act — call notificationService.send(request)

        // TODO: assert — notification in DB with status PENDING

        // TODO: assert — Kafka message received on "notifications" topic containing the notification ID
    }

    @Test
    void should_reject_null_email_without_persisting_or_publishing() {
        // TODO: arrange — null email request

        // TODO: act + assert — exception thrown

        // TODO: assert — DB is empty, no Kafka message
    }

    private KafkaConsumer<String, String> createConsumer() {
        // TODO: create consumer connected to the Kafka container's bootstrap servers
    }
}`,
  rubric: [
    'PostgreSQL container declared as static with @Container and @ServiceConnection',
    'Kafka container declared as static with @Container and @ServiceConnection',
    '@BeforeEach truncates the notifications table to ensure test isolation',
    'Happy path test verifies DB persistence (count or findById assertion)',
    'Happy path test creates a real KafkaConsumer and polls with Duration.ofSeconds(5)',
    'Kafka message assertion verifies the notification ID is present in the message body',
    'Error test verifies an exception is thrown for null/invalid input',
    'Error test asserts notificationRepository.count() == 0 after the failure',
  ],
  hints: [
    'KafkaContainer image name: "confluentinc/cp-kafka:7.6.0" — use DockerImageName.parse()',
    'KafkaConsumer needs: BOOTSTRAP_SERVERS_CONFIG from kafka.getBootstrapServers(), GROUP_ID_CONFIG, AUTO_OFFSET_RESET_CONFIG="earliest"',
    'consumer.subscribe(List.of("notifications")) then consumer.poll(Duration.ofSeconds(5))',
    'assertThat(records).hasSize(1) fails clearly if no message was published within the timeout',
  ],
},

'209.3': {
  instructions: `Write a complete MockMvc integration test for a \`CartController\` with the following endpoints:
- \`POST /api/v1/cart/items\` — adds an item (requires ROLE_USER auth), returns 201 with \`CartItemDto\`
- \`DELETE /api/v1/cart/items/{itemId}\` — removes an item (requires ROLE_USER auth), returns 204
- \`GET /api/v1/cart\` — gets the full cart (requires ROLE_USER auth), returns 200 with list
- All endpoints return 401 if not authenticated, 403 if wrong role

Write tests for:
1. Successful add item (happy path)
2. Add item — invalid quantity (≤ 0) returns 400
3. Remove item — item not found returns 404
4. Get cart — returns all items for the authenticated user
5. Any endpoint without auth returns 401
6. Any endpoint with ROLE_ADMIN (not ROLE_USER) returns 403

Include: PostgreSQL Testcontainers, @BeforeEach cleanup, and assert both HTTP response and database state where appropriate.`,
  boilerplate: `@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class CartControllerIntegrationTest {

    // TODO: PostgreSQL container

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired CartItemRepository cartItemRepository;
    @Autowired JdbcTemplate jdbcTemplate;

    @BeforeEach
    void cleanUp() {
        // TODO: truncate cart_items
    }

    // TODO: 6 test methods as described in the instructions
}`,
  rubric: [
    'PostgreSQL Testcontainers container declared as static with @ServiceConnection',
    '@BeforeEach truncates cart_items table',
    'Happy-path add test: asserts status 201 and jsonPath on the response body',
    'Happy-path add test: asserts cartItemRepository.count() == 1 after the request',
    'Invalid quantity test: asserts status 400',
    'Not-found delete test: asserts status 404',
    'Get cart test: uses @WithMockUser and asserts the items list is returned correctly',
    'Unauthenticated request test: no @WithMockUser annotation, asserts status 401',
    'Wrong-role test: uses @WithMockUser(roles="ADMIN"), asserts status 403',
  ],
  hints: [
    '@WithMockUser defaults to ROLE_USER — use roles="ADMIN" to test forbidden access',
    'For unauthenticated: do NOT add @WithMockUser — the request is anonymous by default',
    'jsonPath("$[0].productId") for asserting list items in GET /cart response',
    'mockMvc.perform(post(...).contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(request)))',
  ],
},
}
