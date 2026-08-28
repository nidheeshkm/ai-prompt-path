// Part IV — Security + Testcontainers
// Chapter 215: Testcontainers Foundations

import type { QuizQuestion } from '../../src/data/curriculum'

export const courseId = 'springboot-ai-architect'

export const content: Record<string, string> = {

'215.1': `# What is Testcontainers & Why It Replaces Mocks

The most dangerous test in your suite is the one that passes on every CI run and fails the moment it touches real infrastructure.

Mocking a database or message broker answers the question "does my code call the right methods?" It does not answer "does my code work against the real database?" These are different questions. Testcontainers answers the second one.

## The Problem with Mocks

Consider a \`UserRepository\` test:

\`\`\`java
// Mock-based test
@Test
void findByEmail_returns_user_when_found() {
    when(userRepository.findByEmail("user@example.com"))
        .thenReturn(Optional.of(testUser));

    Optional<User> result = userService.findByEmail("user@example.com");
    assertTrue(result.isPresent());
}
\`\`\`

This test verifies that \`userService.findByEmail()\` calls \`userRepository.findByEmail()\` and returns its result. It does NOT verify:

- Whether your JPA query is syntactically valid
- Whether your index covers the query pattern
- Whether your \`@Column(nullable = false)\` constraints match the schema
- Whether your Flyway migration runs correctly
- Whether your custom \`@Query\` JPQL/SQL is correct

A broken query only surfaces in production. Testcontainers surfaces it in the test.

## How Testcontainers Works

Testcontainers is a Java library that starts real Docker containers during your test run, connects your test to them, and cleans up afterwards:

\`\`\`
@Test starts
     │
     ▼
Testcontainers pulls postgres:16-alpine (cached after first pull)
     │
     ▼
Container starts, picks a random free port
     │
     ▼
Spring datasource URL is updated to point to the container
     │
     ▼
Flyway runs migrations on the real PostgreSQL instance
     │
     ▼
Test executes against real DB
     │
     ▼
Container stops (or reuses if @TestcontainersSupport is used)
\`\`\`

## Dependencies

\`\`\`xml
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>testcontainers</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>postgresql</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>junit-jupiter</artifactId>
    <scope>test</scope>
</dependency>
\`\`\`

Spring Boot 3.1+ manages the Testcontainers version via its BOM — you do not need to specify versions.

## H2 vs Testcontainers

Many older Spring Boot tutorials use H2 in-memory database for tests. H2 is a different database engine with a different SQL dialect. A JSONB column, a \`gen_random_uuid()\` call, or a partial index that works in PostgreSQL may silently behave differently or fail in H2.

| | H2 | Testcontainers + PostgreSQL |
|---|---|---|
| Speed | Very fast (in-process) | Moderate (container startup, ~2s) |
| Fidelity | Low — different dialect | High — identical to production |
| Finds dialect bugs | No | Yes |
| Finds migration bugs | No | Yes |
| Requires Docker | No | Yes |

For greenfield projects: start with Testcontainers. For projects already using H2: migrate incrementally, starting with integration tests that cover database-specific features.

## When to Still Use Mocks

Mocks are appropriate for:
- **External HTTP dependencies** — you don't control the external service and want deterministic behavior
- **Unit tests of pure business logic** — testing a discount calculation that has no DB interaction
- **Edge cases that are hard to reproduce** — network timeouts, specific error codes from a third-party API

Testcontainers is appropriate for:
- Any test involving a real database, message broker, cache, or search engine
- Migration testing
- Full integration tests (controller → service → repository → DB)

The two approaches are complementary, not mutually exclusive.

## Container Reuse

Starting a container takes 1–3 seconds. For a test suite with 100 repository tests, that's 100 container starts if you're not careful. Avoid this with two patterns:

**Pattern 1 — \`@TestcontainersSupport\` (Spring Boot 3.1+)**:

\`\`\`java
@SpringBootTest
@Testcontainers
class UserRepositoryTest {
    // Container is shared across all tests in this class
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");
}
\`\`\`

Declaring the container \`static\` means it starts once per test class, not once per test method.

**Pattern 2 — Base class**:

\`\`\`java
public abstract class IntegrationTestBase {
    static final PostgreSQLContainer<?> POSTGRES =
        new PostgreSQLContainer<>("postgres:16-alpine")
            .withReuse(true);  // Reuses across test runs (Testcontainers Desktop feature)

    static {
        POSTGRES.start();
    }
}
\`\`\`

All integration test classes that \`extend IntegrationTestBase\` share the same container.`,

'215.2': `# PostgreSQL Testcontainers for JPA Repository Tests

Repository tests are the highest-value place to apply Testcontainers: they verify your queries, schema constraints, and Flyway migrations against real PostgreSQL — the exact environment your production code runs in.

## The @DataJpaTest + Testcontainers Pattern

\`@DataJpaTest\` loads only the JPA slice of your application context (repositories, entity managers, Flyway) — no controllers, services, or security. This makes it fast while still providing real database interaction:

\`\`\`java
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE) // Don't replace with H2
@Testcontainers
class UserRepositoryTest {

    @Container
    static PostgreSQLContainer<?> postgres =
        new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("testdb")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private UserRepository userRepository;

    @Test
    void save_and_findByEmail_returns_persisted_user() {
        User user = User.builder()
            .email("alice@example.com")
            .passwordHash("$2a$12$hashed")
            .role(Role.USER)
            .build();

        User saved = userRepository.save(user);
        Optional<User> found = userRepository.findByEmail("alice@example.com");

        assertThat(found).isPresent();
        assertThat(found.get().getId()).isEqualTo(saved.getId());
        assertThat(found.get().getEmail()).isEqualTo("alice@example.com");
    }

    @Test
    void findByEmail_returns_empty_for_unknown_email() {
        Optional<User> found = userRepository.findByEmail("nobody@example.com");
        assertThat(found).isEmpty();
    }

    @Test
    void save_fails_when_email_is_null() {
        User user = User.builder().passwordHash("$2a$12$hashed").role(Role.USER).build();
        assertThrows(DataIntegrityViolationException.class, () -> userRepository.save(user));
    }

    @Test
    @Transactional
    void existsByEmail_returns_true_when_user_exists() {
        userRepository.save(User.builder()
            .email("bob@example.com").passwordHash("hash").role(Role.USER).build());

        assertThat(userRepository.existsByEmail("bob@example.com")).isTrue();
        assertThat(userRepository.existsByEmail("unknown@example.com")).isFalse();
    }
}
\`\`\`

## What Each Annotation Does

| Annotation | Purpose |
|---|---|
| \`@DataJpaTest\` | Loads JPA slice only (fast, no web layer) |
| \`@AutoConfigureTestDatabase(replace = NONE)\` | Keeps your actual datasource config; don't replace with H2 |
| \`@Testcontainers\` | Tells Testcontainers to manage container lifecycle |
| \`@Container\` | Marks the container field; \`static\` = one container per class |
| \`@DynamicPropertySource\` | Injects container connection details into Spring's environment |

## Testing Flyway Migrations

\`@DataJpaTest\` runs Flyway by default. This means every migration in \`src/main/resources/db/migration/\` runs against the real PostgreSQL container. If a migration is broken, the test fails with a clear Flyway error — not a cryptic JPA exception in production.

Add a migration-specific test to make this explicit:

\`\`\`java
@Test
void flyway_migrations_apply_without_errors() {
    // If this test runs at all, migrations succeeded (Flyway runs before any test method)
    // This test documents the intent explicitly
    List<User> users = userRepository.findAll();
    // Schema is correct — we can query it
    assertThat(users).isNotNull();
}
\`\`\`

## Testing Custom @Query Methods

Custom JPQL and native SQL queries are where mocks completely fail you — they bypass the query entirely. Testcontainers validates the SQL:

\`\`\`java
// In UserRepository
@Query("SELECT u FROM User u WHERE u.role = :role AND u.createdAt > :since")
List<User> findByRoleCreatedAfter(@Param("role") Role role,
                                   @Param("since") LocalDateTime since);

// In UserRepositoryTest
@Test
void findByRoleCreatedAfter_returns_only_recent_users_with_matching_role() {
    LocalDateTime yesterday = LocalDateTime.now().minusDays(1);
    LocalDateTime twoDaysAgo = LocalDateTime.now().minusDays(2);

    User recentAdmin = save(email: "admin@e.com", role: ADMIN, createdAt: now());
    User oldAdmin = save(email: "old@e.com", role: ADMIN, createdAt: twoDaysAgo);
    User recentUser = save(email: "user@e.com", role: USER, createdAt: now());

    List<User> result = userRepository.findByRoleCreatedAfter(ADMIN, yesterday);

    assertThat(result).hasSize(1);
    assertThat(result.get(0).getEmail()).isEqualTo("admin@e.com");
}
\`\`\`

## Spring Boot 3.1+ ServiceConnection

Spring Boot 3.1 introduced \`@ServiceConnection\` which eliminates the \`@DynamicPropertySource\` boilerplate:

\`\`\`java
@SpringBootTest
@Testcontainers
class UserRepositoryTest {

    @Container
    @ServiceConnection  // Automatically wires the datasource URL/credentials
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    // No @DynamicPropertySource needed!
}
\`\`\`

\`@ServiceConnection\` works for PostgreSQL, MySQL, Redis, Kafka, RabbitMQ, and several others out of the box.

## Performance Tips

- **Declare containers static** — one container per test class, not per test method
- **Use a specific image tag** — \`postgres:16-alpine\` is faster to pull than \`postgres:latest\` (smaller image)
- **Layer Docker cache** — in CI, cache \`~/.testcontainers\` and Docker layers between runs
- **@Transactional on tests** — \`@DataJpaTest\` applies \`@Transactional\` by default, rolling back after each test so you don't need \`@BeforeEach\` cleanup`,

'215.3': `# WireMock & HTTP Dependency Testing with Testcontainers

External HTTP dependencies — payment gateways, email providers, geocoding APIs — are the hardest part of integration testing. You can't call the real service in tests (cost, rate limits, side effects). Mocking the HTTP client class with Mockito is fragile and tests the wrong thing. WireMock stubs the actual HTTP layer, giving you the fidelity of a real HTTP call without the real service.

## WireMock vs Mockito for HTTP

| | Mockito mock | WireMock |
|---|---|---|
| What is mocked | The Java interface | The HTTP server |
| Tests HTTP client config | No | Yes |
| Tests request serialization | No | Yes |
| Tests response deserialization | No | Yes |
| Tests retry logic | No | Yes |
| Tests timeout handling | No | Yes |

If your code is a \`RestClient\` / \`WebClient\` / \`FeignClient\` calling an external service, WireMock is the right tool.

## WireMock as a Testcontainers Container

Use the official WireMock Docker image via Testcontainers:

\`\`\`xml
<dependency>
    <groupId>org.wiremock.integrations.testcontainers</groupId>
    <artifactId>wiremock-testcontainers-module</artifactId>
    <version>1.0-alpha-13</version>
    <scope>test</scope>
</dependency>
\`\`\`

\`\`\`java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class EmailServiceTest {

    @Container
    static WireMockContainer wireMock = new WireMockContainer("wiremock/wiremock:3.5.4")
        .withMappingFromResource("email-stub.json");  // pre-defined stub file

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("app.email.base-url", wireMock::getBaseUrl);
    }

    @Autowired
    private EmailService emailService;

    @Test
    void send_welcome_email_calls_email_provider_with_correct_payload() {
        // Stub defined in test resources or inline:
        wireMock.stubFor(post(urlEqualTo("/v3/mail/send"))
            .withHeader("Authorization", matching("Bearer .*"))
            .withRequestBody(matchingJsonPath("$.personalizations[0].to[0].email",
                equalTo("user@example.com")))
            .willReturn(aResponse()
                .withStatus(202)
                .withHeader("Content-Type", "application/json")
                .withBody("{\"message\": \"queued\"}")));

        emailService.sendWelcomeEmail("user@example.com", "Alice");

        verify(postRequestedFor(urlEqualTo("/v3/mail/send")));
    }

    @Test
    void send_welcome_email_retries_on_rate_limit_response() {
        wireMock.stubFor(post(urlEqualTo("/v3/mail/send"))
            .inScenario("retry-test")
            .whenScenarioStateIs(STARTED)
            .willReturn(aResponse().withStatus(429).withHeader("Retry-After", "1"))
            .willSetStateTo("first-attempt-done"));

        wireMock.stubFor(post(urlEqualTo("/v3/mail/send"))
            .inScenario("retry-test")
            .whenScenarioStateIs("first-attempt-done")
            .willReturn(aResponse().withStatus(202)));

        emailService.sendWelcomeEmail("user@example.com", "Alice");

        verify(exactly(2), postRequestedFor(urlEqualTo("/v3/mail/send")));
    }
}
\`\`\`

## Stub Files in Test Resources

Instead of inline stubs, store them in \`src/test/resources/mappings/\`:

\`\`\`json
{
  "request": {
    "method": "POST",
    "url": "/v3/mail/send",
    "headers": {
      "Authorization": { "matches": "Bearer .*" }
    }
  },
  "response": {
    "status": 202,
    "headers": { "Content-Type": "application/json" },
    "body": "{\\"message\\": \\"queued\\"}"
  }
}
\`\`\`

Load stub files at container startup with \`.withMappingFromResource()\` — useful for stubs shared across multiple tests.

## Testing Error Scenarios

WireMock makes it easy to simulate scenarios that are hard to trigger against a real service:

\`\`\`java
@Test
void email_service_throws_when_provider_returns_500() {
    wireMock.stubFor(post(anyUrl())
        .willReturn(serverError().withBody("Internal Server Error")));

    assertThrows(EmailProviderException.class,
        () -> emailService.sendWelcomeEmail("user@example.com", "Alice"));
}

@Test
void email_service_times_out_gracefully() {
    wireMock.stubFor(post(anyUrl())
        .willReturn(aResponse()
            .withStatus(200)
            .withFixedDelay(5000))); // 5s delay — exceeds our 3s timeout

    assertThrows(EmailTimeoutException.class,
        () -> emailService.sendWelcomeEmail("user@example.com", "Alice"));
}

@Test
void email_service_handles_connection_refused() {
    wireMock.stubFor(post(anyUrl())
        .willReturn(aResponse().withFault(Fault.CONNECTION_RESET_BY_PEER)));

    assertThrows(EmailProviderException.class,
        () -> emailService.sendWelcomeEmail("user@example.com", "Alice"));
}
\`\`\`

## Verifying Request Content

WireMock's request verification ensures your code sends the right data to the external service:

\`\`\`java
verify(postRequestedFor(urlEqualTo("/v3/mail/send"))
    .withHeader("Authorization", equalTo("Bearer " + apiKey))
    .withHeader("Content-Type", containing("application/json"))
    .withRequestBody(matchingJsonPath("$.from.email", equalTo("noreply@yourapp.com")))
    .withRequestBody(matchingJsonPath("$.subject", containing("Welcome"))));
\`\`\`

This tests the full request serialization pipeline — something a Mockito mock of the HTTP client interface cannot do.

## Combining WireMock with PostgreSQL

Real applications hit both a database and external HTTP services. Combine both containers:

\`\`\`java
@SpringBootTest
@Testcontainers
class OrderServiceIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Container
    static WireMockContainer paymentWireMock = new WireMockContainer("wiremock/wiremock:3.5.4");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("app.payment.base-url", paymentWireMock::getBaseUrl);
    }

    // Now you can test: order saved to DB AND payment gateway called correctly
}
\`\`\`

This is integration testing at full fidelity — the test exercises the entire flow from controller input to database persistence to external HTTP call, with real infrastructure on all sides.`,
}

export const quiz: Record<string, QuizQuestion[]> = {

'215.1': [
  {
    question: 'What is the fundamental limitation of mocking a database repository in a unit test?',
    options: [
      'Mocking is slower than using a real database',
      'Mocked tests verify method call patterns but cannot detect SQL errors, missing indexes, or broken Flyway migrations',
      'Spring\'s @Mock annotation does not support repository interfaces',
      'Mocked repositories cannot return lists, only single objects',
    ],
    correctIndex: 1,
    explanation: 'A mock answers "did my code call this method?" not "does this query work against the real database?" JPQL errors, dialect incompatibilities, missing columns, and broken migrations only surface when you test against a real DB — which is exactly what Testcontainers provides.',
  },
  {
    question: 'Why is H2 in-memory database considered low-fidelity for testing a PostgreSQL application?',
    options: [
      'H2 is too slow for integration tests',
      'H2 uses a different SQL dialect, so PostgreSQL-specific features like JSONB, partial indexes, and native functions behave differently or fail',
      'Spring Boot 3.x removed support for H2 databases',
      'H2 does not support JPA or Hibernate',
    ],
    correctIndex: 1,
    explanation: 'H2 is a completely different database engine. It silently ignores PostgreSQL-specific DDL, emulates some functions differently, and rejects others. Code that works in H2 tests can fail against real PostgreSQL, which defeats the purpose of testing.',
  },
  {
    question: 'What is the benefit of declaring a Testcontainers @Container field as static?',
    options: [
      'Static containers are faster because they use a different container runtime',
      'The container starts once per test class rather than once per test method, saving startup overhead',
      'Static containers are automatically garbage collected after tests',
      'Only static containers can use @DynamicPropertySource',
    ],
    correctIndex: 1,
    explanation: 'A non-static @Container starts and stops for each @Test method. A static @Container starts once when the test class loads and stops when the class is torn down. For a class with 20 tests, this is the difference between 20 container starts and 1.',
  },
  {
    question: 'Which annotation do you add to prevent @DataJpaTest from replacing your datasource with H2?',
    options: [
      '@DisableH2()',
      '@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)',
      '@UseRealDatabase',
      '@TestcontainersSupport(disableH2 = true)',
    ],
    correctIndex: 1,
    explanation: '@DataJpaTest\'s default behavior is to replace your configured datasource with an embedded H2 database for speed. @AutoConfigureTestDatabase(replace = NONE) overrides this, keeping your actual datasource configuration and allowing Testcontainers to inject the real DB URL.',
  },
  {
    question: 'When is it still appropriate to use Mockito mocks rather than Testcontainers?',
    options: [
      'Never — Testcontainers should replace all mocks',
      'For testing pure business logic with no infrastructure dependencies, and for simulating hard-to-reproduce external service behaviors',
      'Only when Docker is not available on the build machine',
      'When tests run in less than 1 second with mocks and over 10 seconds with Testcontainers',
    ],
    correctIndex: 1,
    explanation: 'Mocks and Testcontainers are complementary. Mocks are right for pure business logic (no infra) and for external services you want deterministic control over. Testcontainers is right for any real infrastructure — DB, Kafka, Redis. Using both strategically gives the best test suite.',
  },
],

'215.2': [
  {
    question: 'What does @DynamicPropertySource accomplish in a Testcontainers test?',
    options: [
      'It starts the container dynamically at test runtime',
      'It overrides Spring\'s datasource properties with the container\'s actual host and port after the container starts',
      'It generates random test data for each property',
      'It configures Flyway to run migrations in parallel',
    ],
    correctIndex: 1,
    explanation: 'Testcontainers assigns a random host port to each container. @DynamicPropertySource runs after container startup and injects the container\'s actual JDBC URL, username, and password into Spring\'s environment, overriding the static values in application.yml.',
  },
  {
    question: 'What replaces @DynamicPropertySource in Spring Boot 3.1+?',
    options: [
      '@ContainerConnection',
      '@ServiceConnection',
      '@AutowiredContainer',
      '@TestPropertySource(container = true)',
    ],
    correctIndex: 1,
    explanation: '@ServiceConnection (introduced in Spring Boot 3.1) detects the container type and automatically wires the appropriate properties. For a PostgreSQLContainer, it sets spring.datasource.url, username, and password without any @DynamicPropertySource boilerplate.',
  },
  {
    question: 'Why is testing a custom @Query method with Testcontainers more valuable than testing it with a mock?',
    options: [
      'Testcontainers tests run faster than mock-based tests for @Query methods',
      'A mock bypasses the @Query entirely, never validating the JPQL or SQL syntax against a real database',
      '@Query methods cannot be mocked because they are interface methods',
      'Spring Data JPA ignores @Query annotations in test contexts',
    ],
    correctIndex: 1,
    explanation: 'When you mock a repository, calling findByRoleCreatedAfter() just returns whatever you configured the mock to return — the @Query JPQL is never parsed or executed. With Testcontainers, the real query runs, catching syntax errors, missing parameter bindings, and incorrect join conditions.',
  },
  {
    question: 'Why does @DataJpaTest apply @Transactional by default?',
    options: [
      'To make Flyway migrations transactional',
      'So each test method rolls back its database changes, keeping tests isolated without manual cleanup in @BeforeEach/@AfterEach',
      'Because JPA requires all operations to be transactional',
      'To enable optimistic locking on all entities during tests',
    ],
    correctIndex: 1,
    explanation: '@DataJpaTest wraps each test method in a transaction that rolls back after the method completes. This means test data inserted in one test is invisible to other tests and you don\'t need to clean up the database between tests. Be aware: if you test rollback behavior itself, you may need @Rollback(false) or @Commit.',
  },
  {
    question: 'What test would you write to explicitly validate that your Flyway migrations run successfully?',
    options: [
      'A test that calls Flyway.configure().load().migrate() directly',
      'Any @DataJpaTest test that performs a simple query — if Flyway fails, the test fails before any @Test method runs',
      'A unit test that mocks the Flyway bean and checks that migrate() was called',
      'Flyway migrations are validated automatically on application startup, no test is needed',
    ],
    correctIndex: 1,
    explanation: '@DataJpaTest runs Flyway as part of the Spring context initialization before any test method. If a migration has a syntax error or conflicts, the context fails to load and all tests in the class fail with a clear Flyway error. You can make this intent explicit with a test that performs a basic query.',
  },
],

'215.3': [
  {
    question: 'What is the key advantage of WireMock over Mockito when testing a service that calls an external HTTP API?',
    options: [
      'WireMock is faster than Mockito for HTTP tests',
      'WireMock stubs the actual HTTP layer, so it validates request serialization, HTTP client configuration, headers, and response deserialization — which Mockito cannot',
      'Mockito cannot mock REST clients, only simple Java objects',
      'WireMock integrates directly with Spring Security for authentication testing',
    ],
    correctIndex: 1,
    explanation: 'Mockito mocks a Java interface — it bypasses the actual HTTP call entirely. WireMock starts a real HTTP server on localhost. Your code sends a real HTTP request, and WireMock responds. This validates the entire HTTP call path: serialization, headers, URL construction, deserialization, and error handling.',
  },
  {
    question: 'How do you configure your Spring application to point at the WireMock server instead of the real external service?',
    options: [
      'WireMock automatically intercepts all HTTP traffic on the machine',
      'Use @DynamicPropertySource to override the service base URL property with wireMock.getBaseUrl()',
      'Annotate the RestClient bean with @WireMockClient',
      'Add the WireMock URL to the application.yml allowlist',
    ],
    correctIndex: 1,
    explanation: 'The WireMock container gets a random port. @DynamicPropertySource injects the container\'s base URL (e.g., http://localhost:54321) into the Spring property that your RestClient/FeignClient reads for the external service URL. Your code is unmodified — it reads from configuration.',
  },
  {
    question: 'What does WireMock\'s "scenario" feature enable in tests?',
    options: [
      'Running multiple WireMock servers in parallel for load testing',
      'Simulating stateful behavior — returning different responses for the same request based on sequence (e.g., first call returns 429, second call returns 200)',
      'Recording real API calls and replaying them in tests',
      'Mapping WireMock stubs to specific test method names',
    ],
    correctIndex: 1,
    explanation: 'WireMock scenarios model state machines. Each stub in the same scenario can specify whenScenarioStateIs() and willSetStateTo(). This lets you test retry logic, pagination, or any sequence-dependent behavior where the same endpoint should return different responses on successive calls.',
  },
  {
    question: 'What does verify(postRequestedFor(urlEqualTo("/v3/mail/send"))) assert in a WireMock test?',
    options: [
      'That the response from the WireMock server was a POST response',
      'That your application code actually made a POST request to /v3/mail/send during the test',
      'That the WireMock server correctly handled a POST request',
      'That no GET requests were made to the same URL',
    ],
    correctIndex: 1,
    explanation: 'WireMock records all requests it receives. verify() checks the request journal. This assertion fails if your application code never made the POST request — catching cases where the email service method returned early or the wrong URL was called.',
  },
  {
    question: 'Which WireMock fault should you use to test your HTTP client\'s connection timeout handling?',
    options: [
      'aResponse().withStatus(503)',
      'aResponse().withFixedDelay(delayExceedingTimeout)',
      'aResponse().withFault(Fault.EMPTY_RESPONSE)',
      'aResponse().withStatus(0)',
    ],
    correctIndex: 1,
    explanation: 'withFixedDelay() introduces a server-side delay before sending any response. If the delay exceeds your HTTP client\'s configured timeout, the client throws a timeout exception. This tests that your application handles timeouts gracefully rather than hanging indefinitely.',
  },
],
}

export const codingTask: Record<string, {
  instructions: string; boilerplate: string; rubric: string[]; hints: string[]
}> = {

'215.2': {
  instructions: `Write a Testcontainers-based repository test for a \`ProductRepository\` against a real PostgreSQL database.

Requirements:
1. Use \`@DataJpaTest\` with \`@AutoConfigureTestDatabase(replace = NONE)\` to prevent H2 substitution.
2. Declare a static \`PostgreSQLContainer\` with \`postgres:16-alpine\`.
3. Use \`@DynamicPropertySource\` to wire the container's JDBC URL, username, and password.
4. Write 4 test methods:
   - \`save_and_findById_returns_persisted_product\` — saves a Product, retrieves by ID, asserts fields match
   - \`findByCategory_returns_only_matching_products\` — saves two products (different categories), asserts only the matching one is returned
   - \`save_fails_when_name_is_null\` — asserts \`DataIntegrityViolationException\` is thrown
   - \`existsByName_returns_correct_result\` — tests both true and false cases

Assume Product has fields: id (UUID, generated), name (String, not null), category (String), price (BigDecimal).`,
  boilerplate: `package com.example.repository;

import com.example.entity.Product;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers
class ProductRepositoryTest {

    @Container
    static PostgreSQLContainer<?> postgres = // TODO: initialize with postgres:16-alpine

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        // TODO: register spring.datasource.url, username, and password
    }

    @Autowired
    private ProductRepository productRepository;

    @Test
    void save_and_findById_returns_persisted_product() {
        // TODO: Build a Product, save it, find by ID, assert name and category match
    }

    @Test
    void findByCategory_returns_only_matching_products() {
        // TODO: Save a "ELECTRONICS" and a "CLOTHING" product,
        //       call findByCategory("ELECTRONICS"), assert only 1 result with correct name
    }

    @Test
    void save_fails_when_name_is_null() {
        // TODO: Build a Product with null name, assert DataIntegrityViolationException
    }

    @Test
    void existsByName_returns_correct_result() {
        // TODO: Save a product, assert existsByName returns true for that name
        //       and false for an unknown name
    }
}`,
  rubric: [
    'PostgreSQLContainer is declared static with "postgres:16-alpine"',
    '@DynamicPropertySource registers spring.datasource.url via postgres::getJdbcUrl',
    '@DynamicPropertySource registers spring.datasource.username and password',
    'save_and_findById saves a Product and asserts findById returns non-empty with matching fields',
    'findByCategory saves two products and asserts only the matching category is returned',
    'save_fails_when_name_is_null uses assertThrows(DataIntegrityViolationException.class, ...)',
    'existsByName_returns_correct_result checks both true and false cases',
  ],
  hints: [
    'new PostgreSQLContainer<>("postgres:16-alpine") — no version needed in the BOM',
    'registry.add("spring.datasource.url", postgres::getJdbcUrl) — method reference, not postgres.getJdbcUrl()',
    'Product.builder().name("Laptop").category("ELECTRONICS").price(BigDecimal.valueOf(999)).build()',
    'productRepository.save(product) returns the saved entity with the generated ID',
    'assertThat(found).isPresent(); assertThat(found.get().getName()).isEqualTo("Laptop")',
  ],
},
}
