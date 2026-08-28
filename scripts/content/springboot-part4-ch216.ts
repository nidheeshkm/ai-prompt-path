// Part IV — Security + Testcontainers
// Chapter 216: Advanced Testcontainers & Security Integration Tests

import type { QuizQuestion } from '../../src/data/curriculum'

export const courseId = 'springboot-ai-architect'

export const content: Record<string, string> = {

'216.1': `# Kafka Testcontainers for Event-Driven Tests

Event-driven architectures decouple services via message brokers. Testing a Kafka producer-consumer pair with mocks gives false confidence: you're testing that methods are called, not that serialization is correct, that the right topic is used, or that the consumer group offset is managed properly. Testcontainers with Kafka validates all of this.

## Dependency

\`\`\`xml
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>kafka</artifactId>
    <scope>test</scope>
</dependency>
\`\`\`

## KafkaContainer Setup

\`\`\`java
@SpringBootTest
@Testcontainers
class OrderEventIntegrationTest {

    @Container
    static KafkaContainer kafka = new KafkaContainer(
        DockerImageName.parse("confluentinc/cp-kafka:7.6.1")
    );

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.kafka.bootstrap-servers", kafka::getBootstrapServers);
    }
}
\`\`\`

Or with \`@ServiceConnection\` in Spring Boot 3.1+:

\`\`\`java
@Container
@ServiceConnection
static KafkaContainer kafka = new KafkaContainer(
    DockerImageName.parse("confluentinc/cp-kafka:7.6.1")
);
\`\`\`

## Testing a Producer

\`\`\`java
@SpringBootTest
@Testcontainers
class OrderProducerTest {

    @Container
    @ServiceConnection
    static KafkaContainer kafka = new KafkaContainer(
        DockerImageName.parse("confluentinc/cp-kafka:7.6.1"));

    @Autowired
    private OrderProducer orderProducer;

    @Autowired
    private KafkaTemplate<String, OrderEvent> kafkaTemplate;

    @Test
    void publishOrder_sends_event_to_correct_topic() throws Exception {
        Order order = new Order(UUID.randomUUID(), "user@example.com", BigDecimal.valueOf(99.99));

        orderProducer.publish(order);

        // Use a KafkaConsumer to read back the message
        KafkaConsumer<String, String> consumer = createConsumer("orders.created");
        ConsumerRecords<String, String> records = consumer.poll(Duration.ofSeconds(5));

        assertThat(records.count()).isEqualTo(1);
        ConsumerRecord<String, String> record = records.iterator().next();
        assertThat(record.key()).isEqualTo(order.getId().toString());

        // Verify payload contains the right data
        ObjectMapper objectMapper = new ObjectMapper();
        OrderEvent event = objectMapper.readValue(record.value(), OrderEvent.class);
        assertThat(event.getUserEmail()).isEqualTo("user@example.com");
        assertThat(event.getTotal()).isEqualByComparingTo(BigDecimal.valueOf(99.99));

        consumer.close();
    }

    private KafkaConsumer<String, String> createConsumer(String topic) {
        Map<String, Object> props = new HashMap<>();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, kafka.getBootstrapServers());
        props.put(ConsumerConfig.GROUP_ID_CONFIG, "test-group-" + UUID.randomUUID()); // unique group
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);

        KafkaConsumer<String, String> consumer = new KafkaConsumer<>(props);
        consumer.subscribe(List.of(topic));
        return consumer;
    }
}
\`\`\`

## Testing a Consumer

Testing a Kafka consumer requires sending a message and asserting that the consumer processes it correctly:

\`\`\`java
@SpringBootTest
@Testcontainers
class OrderConsumerTest {

    @Container
    @ServiceConnection
    static KafkaContainer kafka = new KafkaContainer(
        DockerImageName.parse("confluentinc/cp-kafka:7.6.1"));

    @Autowired
    private KafkaTemplate<String, String> kafkaTemplate;

    @Autowired
    private OrderRepository orderRepository;

    @Test
    void order_created_event_is_processed_and_persisted() throws Exception {
        String orderId = UUID.randomUUID().toString();
        String payload = """
            {"orderId": "%s", "userEmail": "user@example.com", "total": 99.99}
            """.formatted(orderId);

        kafkaTemplate.send("orders.created", orderId, payload).get(5, TimeUnit.SECONDS);

        // Wait for async consumer to process the message
        await().atMost(Duration.ofSeconds(10))
            .untilAsserted(() ->
                assertThat(orderRepository.findById(UUID.fromString(orderId))).isPresent()
            );

        Order savedOrder = orderRepository.findById(UUID.fromString(orderId)).orElseThrow();
        assertThat(savedOrder.getUserEmail()).isEqualTo("user@example.com");
    }
}
\`\`\`

The \`await().atMost(...).untilAsserted()\` pattern (from the Awaitility library) polls the assertion until it passes or the timeout expires. This handles the async gap between message publication and consumer processing.

## Awaitility Dependency

\`\`\`xml
<dependency>
    <groupId>org.awaitility</groupId>
    <artifactId>awaitility</artifactId>
    <scope>test</scope>
</dependency>
\`\`\`

## Testing Dead Letter Topics

\`\`\`java
@Test
void malformed_message_is_sent_to_dead_letter_topic() throws Exception {
    kafkaTemplate.send("orders.created", "bad-key", "this is not valid JSON").get(5, TimeUnit.SECONDS);

    KafkaConsumer<String, String> dlqConsumer = createConsumer("orders.created.DLT");
    await().atMost(Duration.ofSeconds(10)).untilAsserted(() -> {
        ConsumerRecords<String, String> records = dlqConsumer.poll(Duration.ofMillis(500));
        assertThat(records.count()).isGreaterThan(0);
    });
    dlqConsumer.close();
}
\`\`\`

## Producer and Consumer in the Same Test

For end-to-end event flow testing, publish through your application's producer and verify through the consumer side effect (e.g., a database write or a downstream API call stubbed with WireMock). This validates the entire event pipeline.`,

'216.2': `# Redis Testcontainers for Caching Tests

Caching is one of the most common Spring Boot features and one of the most undertested. A broken cache — one that never actually caches, caches stale data, or fails to invalidate — can degrade performance or serve incorrect data without any test catching it. Testcontainers with Redis validates your \`@Cacheable\` configuration against a real Redis instance.

## Dependency

\`\`\`xml
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>testcontainers</artifactId>
    <scope>test</scope>
</dependency>
\`\`\`

There is no dedicated Redis module — use \`GenericContainer\` with the Redis image:

\`\`\`java
@Container
static GenericContainer<?> redis = new GenericContainer<>("redis:7-alpine")
    .withExposedPorts(6379);
\`\`\`

Or use the dedicated \`RedisContainer\` from the Testcontainers library if available for your version:

\`\`\`xml
<dependency>
    <groupId>com.redis</groupId>
    <artifactId>testcontainers-redis</artifactId>
    <version>2.0.1</version>
    <scope>test</scope>
</dependency>
\`\`\`

## Basic Setup

\`\`\`java
@SpringBootTest
@Testcontainers
class ProductCacheTest {

    @Container
    static GenericContainer<?> redis = new GenericContainer<>("redis:7-alpine")
        .withExposedPorts(6379);

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.data.redis.host", redis::getHost);
        registry.add("spring.data.redis.port", () -> redis.getMappedPort(6379));
    }

    @Autowired
    private ProductService productService;

    @Autowired
    private ProductRepository productRepository; // to verify DB hits

    @Autowired
    private CacheManager cacheManager;
}
\`\`\`

## Testing @Cacheable

The key question: does the second call return the cached value without hitting the database?

\`\`\`java
@Test
void findById_caches_result_after_first_call() {
    // Arrange: save a product to the DB
    Product saved = productRepository.save(
        Product.builder().name("Laptop").category("ELECTRONICS")
                         .price(BigDecimal.valueOf(999)).build());

    // Act: call twice
    ProductDto firstCall = productService.findById(saved.getId());
    ProductDto secondCall = productService.findById(saved.getId());

    // Assert: both return the same data
    assertThat(firstCall.getName()).isEqualTo("Laptop");
    assertThat(secondCall.getName()).isEqualTo("Laptop");

    // Assert: cache now contains the entry
    Cache productCache = cacheManager.getCache("products");
    assertThat(productCache).isNotNull();
    assertThat(productCache.get(saved.getId())).isNotNull();
}
\`\`\`

## Testing @CacheEvict

\`\`\`java
@Test
void update_evicts_cache_so_next_read_gets_fresh_data() {
    Product saved = productRepository.save(
        Product.builder().name("OldName").category("ELECTRONICS")
                         .price(BigDecimal.valueOf(999)).build());

    // Prime the cache
    productService.findById(saved.getId());
    Cache productCache = cacheManager.getCache("products");
    assertThat(productCache.get(saved.getId())).isNotNull();

    // Update — should evict the cache entry
    productService.update(saved.getId(),
        new UpdateProductRequest("NewName", BigDecimal.valueOf(1099)));

    // Cache entry should be gone
    assertThat(productCache.get(saved.getId())).isNull();

    // Next read should get the updated value
    ProductDto updated = productService.findById(saved.getId());
    assertThat(updated.getName()).isEqualTo("NewName");
}
\`\`\`

## Testing Cache TTL

\`\`\`java
@Test
void cached_value_expires_after_ttl() throws InterruptedException {
    // Configure TTL to 1 second in test properties:
    // spring.cache.redis.time-to-live=1000

    Product saved = productRepository.save(
        Product.builder().name("Laptop").category("ELECTRONICS")
                         .price(BigDecimal.valueOf(999)).build());

    productService.findById(saved.getId()); // prime cache

    Thread.sleep(1500); // wait past TTL

    Cache productCache = cacheManager.getCache("products");
    // Redis has evicted the entry
    assertThat(productCache.get(saved.getId())).isNull();
}
\`\`\`

Use a short TTL in test configuration (\`application-test.yml\`) to make TTL tests fast.

## Counting Database Hits

To prove caching is actually reducing database load, count repository calls using a Spy or a query count interceptor:

\`\`\`java
@SpyBean
private ProductRepository productRepositorySpy;

@Test
void findById_only_hits_database_once_for_repeated_calls() {
    Product saved = productRepository.save(
        Product.builder().name("Laptop").category("ELECTRONICS")
                         .price(BigDecimal.valueOf(999)).build());

    productService.findById(saved.getId());
    productService.findById(saved.getId());
    productService.findById(saved.getId());

    // findById on the repository should only be called once
    verify(productRepositorySpy, times(1)).findById(saved.getId());
}
\`\`\`

This test is more rigorous: it proves the cache is actually preventing database calls, not just storing values.

## Cache Configuration

In your application's cache configuration, use TTL-based expiry:

\`\`\`java
@Configuration
public class CacheConfig {

    @Bean
    public RedisCacheConfiguration cacheConfiguration(
            @Value("\${spring.cache.redis.time-to-live:3600000}") long ttlMs) {
        return RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofMillis(ttlMs))
            .disableCachingNullValues()
            .serializeValuesWith(
                RedisSerializationContext.SerializationPair
                    .fromSerializer(new GenericJackson2JsonRedisSerializer()));
    }
}
\`\`\`

Using JSON serialization means cached objects are readable in Redis CLI, which is invaluable for debugging cache content in non-production environments.`,

'216.3': `# Security Integration Tests with MockMvc & Testcontainers

Security integration tests verify the full stack: authentication filter → authorization rules → controller → service → database. They're the highest-confidence tests in your suite and should cover the golden path plus the key rejection scenarios for each endpoint.

## The Test Setup

Combine MockMvc (for HTTP-level testing), Testcontainers (for real DB), and JwtService (for real token generation):

\`\`\`java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@Testcontainers
class ProductControllerSecurityTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private String userToken;
    private String adminToken;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();

        User user = userRepository.save(User.builder()
            .email("user@example.com")
            .passwordHash(passwordEncoder.encode("password"))
            .role(Role.USER).build());

        User admin = userRepository.save(User.builder()
            .email("admin@example.com")
            .passwordHash(passwordEncoder.encode("password"))
            .role(Role.ADMIN).build());

        userToken = jwtService.generateToken(
            new org.springframework.security.core.userdetails.User(
                user.getEmail(), user.getPasswordHash(),
                List.of(new SimpleGrantedAuthority("ROLE_USER"))));

        adminToken = jwtService.generateToken(
            new org.springframework.security.core.userdetails.User(
                admin.getEmail(), admin.getPasswordHash(),
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));
    }
}
\`\`\`

## Testing Authentication Enforcement

\`\`\`java
@Test
void unauthenticated_request_returns_401() throws Exception {
    mockMvc.perform(get("/api/products"))
        .andExpect(status().isUnauthorized());
}

@Test
void invalid_jwt_returns_401() throws Exception {
    mockMvc.perform(get("/api/products")
            .header("Authorization", "Bearer invalid.token.here"))
        .andExpect(status().isUnauthorized());
}

@Test
void expired_jwt_returns_401() throws Exception {
    // Generate a token that expired 1 hour ago
    String expiredToken = Jwts.builder()
        .subject("user@example.com")
        .issuedAt(Date.from(Instant.now().minus(2, ChronoUnit.HOURS)))
        .expiration(Date.from(Instant.now().minus(1, ChronoUnit.HOURS)))
        .signWith(testSigningKey)
        .compact();

    mockMvc.perform(get("/api/products")
            .header("Authorization", "Bearer " + expiredToken))
        .andExpect(status().isUnauthorized());
}
\`\`\`

## Testing Role-Based Authorization

\`\`\`java
@Test
void authenticated_user_can_list_products() throws Exception {
    mockMvc.perform(get("/api/products")
            .header("Authorization", "Bearer " + userToken))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content").isArray());
}

@Test
void user_cannot_delete_product() throws Exception {
    Product product = productRepository.save(
        Product.builder().name("Laptop").category("ELECTRONICS")
                         .price(BigDecimal.valueOf(999)).build());

    mockMvc.perform(delete("/api/products/" + product.getId())
            .header("Authorization", "Bearer " + userToken))
        .andExpect(status().isForbidden());
}

@Test
void admin_can_delete_product() throws Exception {
    Product product = productRepository.save(
        Product.builder().name("Laptop").category("ELECTRONICS")
                         .price(BigDecimal.valueOf(999)).build());

    mockMvc.perform(delete("/api/products/" + product.getId())
            .header("Authorization", "Bearer " + adminToken))
        .andExpect(status().isNoContent());
}
\`\`\`

## Testing the Login Endpoint

\`\`\`java
@Test
void login_with_valid_credentials_returns_jwt() throws Exception {
    String requestBody = """
        {"email": "user@example.com", "password": "password"}
        """;

    mockMvc.perform(post("/api/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(requestBody))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.accessToken").isNotEmpty())
        .andExpect(jsonPath("$.accessToken", matchesPattern("[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+")));
}

@Test
void login_with_wrong_password_returns_401() throws Exception {
    String requestBody = """
        {"email": "user@example.com", "password": "wrongpassword"}
        """;

    mockMvc.perform(post("/api/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(requestBody))
        .andExpect(status().isUnauthorized());
}

@Test
void login_with_unknown_email_returns_401() throws Exception {
    String requestBody = """
        {"email": "nobody@example.com", "password": "password"}
        """;

    mockMvc.perform(post("/api/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(requestBody))
        .andExpect(status().isUnauthorized());
}
\`\`\`

## Testing Input Validation

\`\`\`java
@Test
void create_product_with_missing_name_returns_400() throws Exception {
    String requestBody = """
        {"category": "ELECTRONICS", "price": 999.00}
        """; // missing required "name" field

    mockMvc.perform(post("/api/products")
            .contentType(MediaType.APPLICATION_JSON)
            .content(requestBody)
            .header("Authorization", "Bearer " + adminToken))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors.name").exists());
}
\`\`\`

## Test Coverage Checklist

For each secured endpoint, write tests for:

| Scenario | Expected Status |
|---|---|
| No Authorization header | 401 |
| Invalid/malformed JWT | 401 |
| Expired JWT | 401 |
| Valid JWT, insufficient role | 403 |
| Valid JWT, correct role | 2xx |
| Valid JWT, correct role, invalid input | 400 |

This matrix ensures your security configuration is correct end-to-end, not just in unit tests of individual components.

## Using @WithMockUser vs Real JWTs

\`@WithMockUser\` is faster (no JwtService, no DB) and appropriate for testing controller logic in isolation with \`@WebMvcTest\`. For integration tests that span the full stack (including the JWT filter, real DB, and service layer), generate real tokens with JwtService and run against a Testcontainers database. The two approaches are complementary: \`@WebMvcTest\` + \`@WithMockUser\` for focused controller tests, \`@SpringBootTest\` + real tokens + Testcontainers for end-to-end security verification.`,
}

export const quiz: Record<string, QuizQuestion[]> = {

'216.1': [
  {
    question: 'Why does a Kafka consumer test use a unique consumer group ID (often with UUID.randomUUID()) for each test?',
    options: [
      'Kafka requires unique group IDs for each consumer instance',
      'To ensure each test starts reading from the earliest offset rather than continuing from where a previous test\'s consumer left off',
      'UUID group IDs enable faster message delivery in test environments',
      'Spring Kafka automatically generates unique group IDs so this is unnecessary',
    ],
    correctIndex: 1,
    explanation: 'Consumer groups track their offset in a topic. If a previous test consumed messages on group "test-group", a new test using the same group would start from where the previous left off and miss earlier messages. A unique UUID group ID combined with AUTO_OFFSET_RESET_CONFIG = "earliest" ensures each test reads all messages from the beginning.',
  },
  {
    question: 'Why do Kafka consumer tests use Awaitility\'s await().untilAsserted() rather than Thread.sleep()?',
    options: [
      'Awaitility is required by Testcontainers for async operations',
      'Kafka consumers process messages asynchronously — await() polls until the assertion passes or times out, avoiding both race conditions and unnecessary waiting',
      'Thread.sleep() is blocked by Spring Boot test context loading',
      'Awaitility automatically retries failed assertions up to 3 times',
    ],
    correctIndex: 1,
    explanation: 'Thread.sleep(X) always waits the full X milliseconds, which is wasteful when the consumer is fast and unreliable when it\'s slow. Awaitility polls the assertion repeatedly with configurable intervals, succeeding as soon as the condition is met and failing cleanly when the timeout is exceeded.',
  },
  {
    question: 'What does KafkaContainer from Testcontainers provide that a simple embedded Kafka does not?',
    options: [
      'Support for multiple partitions and replication',
      'A real Kafka broker running in Docker, identical to production — validating serialization, topic configuration, and consumer group behavior exactly as in production',
      'Faster message throughput for load testing',
      'Built-in support for Avro schema registry',
    ],
    correctIndex: 1,
    explanation: 'Embedded Kafka (e.g., spring-kafka-test\'s EmbeddedKafkaBroker) is a lightweight in-process broker that omits many Kafka features and behaves slightly differently from production Kafka. KafkaContainer runs the real Confluent Kafka Docker image, giving you true production fidelity.',
  },
  {
    question: 'What is the purpose of an end-to-end Kafka test that publishes via the producer and verifies via a database write?',
    options: [
      'To test the KafkaTemplate API itself',
      'To validate the entire event pipeline — that the producer publishes correctly, the consumer receives and deserializes the event, and the downstream side effect (DB write) is applied',
      'To verify that the Testcontainers Kafka and PostgreSQL containers can communicate',
      'To measure Kafka message throughput under test load',
    ],
    correctIndex: 1,
    explanation: 'Testing producer and consumer in isolation misses integration bugs. An end-to-end test that publishes through your real producer code and asserts a downstream state change validates the entire pipeline: serialization, topic routing, consumer group configuration, deserialization, and business logic — all in one test.',
  },
  {
    question: 'When testing a Dead Letter Topic (DLT), what should the test publish to trigger the DLT?',
    options: [
      'A message with a special header: X-Kafka-DLT: true',
      'A malformed or unprocessable message that causes the consumer to throw an exception and route to the DLT after retry exhaustion',
      'A null key, which Kafka automatically routes to the DLT',
      'Any message published to the main topic will appear in the DLT as well',
    ],
    correctIndex: 1,
    explanation: 'Spring Kafka\'s DefaultErrorHandler retries failed messages and, after retries are exhausted, publishes to the Dead Letter Topic. Publishing a malformed message (e.g., invalid JSON when the consumer expects JSON) causes deserialization to fail, triggering the retry-then-DLT flow.',
  },
],

'216.2': [
  {
    question: 'Why is it important to test @CacheEvict behavior in addition to @Cacheable?',
    options: [
      '@CacheEvict is more complex to implement and therefore more likely to have bugs',
      'A broken @CacheEvict causes stale data to be served indefinitely — users see outdated information after updates or deletes',
      'Spring Boot 3.x changed the @CacheEvict semantics and old code may not work correctly',
      'Cache eviction tests run faster than cache population tests',
    ],
    correctIndex: 1,
    explanation: 'A cache that populates correctly but fails to evict on update is arguably worse than no cache at all — it confidently serves wrong data. Testing @CacheEvict confirms that your cache stays coherent with the database after mutations.',
  },
  {
    question: 'What does using @SpyBean ProductRepository in a caching test enable that simple @Autowired cannot?',
    options: [
      '@SpyBean provides a faster database connection for test purposes',
      'It wraps the real repository in a Spy, allowing verify() to count how many times specific methods were called — proving the cache prevented unnecessary DB hits',
      '@SpyBean enables @Cacheable to be applied to repository methods directly',
      'It automatically clears the cache between test methods',
    ],
    correctIndex: 1,
    explanation: 'A Mockito Spy delegates all calls to the real object but records invocations. verify(productRepositorySpy, times(1)).findById(id) fails if findById was called more than once, proving that subsequent calls were served from cache without hitting the database.',
  },
  {
    question: 'Why should Redis cache serialization use JSON (GenericJackson2JsonRedisSerializer) rather than Java serialization?',
    options: [
      'JSON serialization is faster than Java serialization',
      'Java serialization breaks when class names or field names change, causing deserialization errors for cached entries — JSON is more resilient and human-readable for debugging',
      'Spring Boot 3.x removed support for Java serialization in Redis',
      'JSON serialization uses less memory in Redis',
    ],
    correctIndex: 1,
    explanation: 'Java serialization is brittle: adding, removing, or renaming a field can break deserialization of existing cache entries, causing a ClassNotFoundException or InvalidClassException. JSON is schema-flexible and readable in Redis CLI, making cache inspection and debugging far easier.',
  },
  {
    question: 'How do you test a specific cache TTL (time-to-live) without making tests wait for the production TTL?',
    options: [
      'Set a very short TTL in the test cache configuration or application-test.yml (e.g., 1 second), then assert after Thread.sleep(1500)',
      'Use @MockBean to mock the cache and control expiry programmatically',
      'TTL cannot be tested because it depends on system time',
      'Use CacheManager.evictAll() to simulate TTL expiry',
    ],
    correctIndex: 0,
    explanation: 'The standard approach is an application-test.yml (activated with @ActiveProfiles("test")) that sets spring.cache.redis.time-to-live=1000 (1 second), then Thread.sleep(1500) before asserting the cache is empty. Keep TTL tests minimal — they\'re inherently time-dependent.',
  },
  {
    question: 'What is the correct way to wire a GenericContainer (Redis) datasource in tests when @ServiceConnection is not available for Redis?',
    options: [
      'Use @AutoConfigureRedis(replace = NONE) on the test class',
      'Use @DynamicPropertySource to register spring.data.redis.host as redis.getHost() and spring.data.redis.port as redis.getMappedPort(6379)',
      'Set the Redis port to 6379 in the container to match the default Spring configuration',
      'Use @TestPropertySource with a fixed Redis URL',
    ],
    correctIndex: 1,
    explanation: 'GenericContainer doesn\'t have type-aware autoconfiguration. @DynamicPropertySource is the bridge: redis.getHost() returns the container\'s host (usually localhost in CI) and redis.getMappedPort(6379) returns the random external port Testcontainers assigned.',
  },
],

'216.3': [
  {
    question: 'What is the difference between @WebMvcTest + @WithMockUser and @SpringBootTest + real JWT for security testing?',
    options: [
      '@WebMvcTest tests are always more reliable because they don\'t depend on external infrastructure',
      '@WebMvcTest + @WithMockUser tests the controller layer in isolation (fast, focused); @SpringBootTest + real JWT tests the full stack including the JWT filter, service, and database (comprehensive, higher confidence)',
      '@SpringBootTest + real JWT only works if a running JWT server is available',
      'There is no meaningful difference — use whichever is more convenient',
    ],
    correctIndex: 1,
    explanation: '@WebMvcTest skips the JWT filter, service layer, and database — it\'s fast and good for controller logic tests. @SpringBootTest loads the full application context. Combined with a real JWT generated by JwtService and a Testcontainers database, it proves the entire security configuration works end-to-end.',
  },
  {
    question: 'Why should an integration test for an admin-only endpoint test BOTH a user receiving 403 AND an admin receiving 2xx?',
    options: [
      'Spring Security requires both directions to be tested before the filter chain is activated',
      'Testing only 403 proves the endpoint rejects users but not that it accepts admins; testing only 2xx proves admins succeed but not that users are properly blocked — both are needed for a complete security guarantee',
      'JUnit 5 requires paired positive and negative test cases',
      'Testing both directions increases code coverage metrics',
    ],
    correctIndex: 1,
    explanation: 'A common misconfiguration is .anyRequest().permitAll() — in that case, the admin test passes but the user test reveals the broken authorization. Conversely, .anyRequest().denyAll() makes the user test pass but the admin test fail. Both directions are needed to prove the rule is correct.',
  },
  {
    question: 'What status code should a secured endpoint return for a request with a valid but expired JWT token?',
    options: [
      '403 Forbidden — the token identifies the user but they are no longer authorized',
      '401 Unauthorized — the token is cryptographically invalid (expired tokens cannot authenticate)',
      '400 Bad Request — the token format is incorrect',
      '200 OK with a refreshed token in the response header',
    ],
    correctIndex: 1,
    explanation: '401 is correct because an expired token fails authentication — the server cannot establish who the caller is with sufficient confidence. 403 would mean the caller is authenticated but lacks permission. Expiry is an authentication failure, not an authorization failure.',
  },
  {
    question: 'When setting up security integration tests, why is it best to call userRepository.deleteAll() in @BeforeEach?',
    options: [
      'Testcontainers does not automatically clean up data between tests',
      'To ensure each test starts with a known clean state — leftover test users from previous tests can cause duplicate key errors or interfere with findBy queries',
      'deleteAll() resets the Redis cache at the same time',
      'Spring\'s @DataJpaTest applies @Transactional, but @SpringBootTest does not roll back by default',
    ],
    correctIndex: 3,
    explanation: '@DataJpaTest wraps tests in rollback transactions. @SpringBootTest with RANDOM_PORT does not apply @Transactional by default — each test method commits its data. Without @BeforeEach cleanup, user data from one test persists and can cause the next test to fail due to duplicate email constraints.',
  },
  {
    question: 'What HTTP status code should a Spring Security REST API return when a valid authenticated user tries to access a resource they don\'t have permission for?',
    options: [
      '401 Unauthorized',
      '403 Forbidden',
      '404 Not Found (to avoid revealing the resource exists)',
      '400 Bad Request',
    ],
    correctIndex: 1,
    explanation: '403 Forbidden means the server understands the request, the user is authenticated, but they lack the required permissions. 401 would imply the user is not authenticated at all. Some security-sensitive APIs return 404 to avoid revealing that a resource exists, but 403 is the semantically correct RFC-compliant response for authorization failures.',
  },
],
}

export const codingTask: Record<string, {
  instructions: string; boilerplate: string; rubric: string[]; hints: string[]
}> = {

'216.3': {
  instructions: `Write a Spring Boot security integration test class that covers the core security scenarios for a \`ProductController\`.

The test must use:
- \`@SpringBootTest(webEnvironment = RANDOM_PORT)\`
- \`@AutoConfigureMockMvc\`
- A static \`PostgreSQLContainer\` with \`@ServiceConnection\`
- Real JWT tokens generated by \`JwtService\`

Write 6 test methods covering:
1. Unauthenticated GET /api/products → 401
2. Invalid JWT → 401
3. Valid USER token on GET /api/products → 200
4. Valid USER token on DELETE /api/products/{id} → 403
5. Valid ADMIN token on DELETE /api/products/{id} → 204
6. Valid ADMIN token on POST /api/products with missing name → 400

In \`@BeforeEach\`: create a USER and an ADMIN in the database and generate tokens for each.`,
  boilerplate: `package com.example.controller;

import com.example.entity.Product;
import com.example.entity.Role;
import com.example.entity.User;
import com.example.repository.ProductRepository;
import com.example.repository.UserRepository;
import com.example.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@Testcontainers
class ProductControllerSecurityTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = // TODO: initialize

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private String userToken;
    private String adminToken;

    @BeforeEach
    void setUp() {
        // TODO: Clean up repositories
        // TODO: Create a USER with email user@example.com
        // TODO: Create an ADMIN with email admin@example.com
        // TODO: Generate JWT tokens for each using jwtService.generateToken(UserDetails)
    }

    @Test
    void unauthenticated_request_returns_401() throws Exception {
        // TODO: GET /api/products with no Authorization header → expect 401
    }

    @Test
    void invalid_jwt_returns_401() throws Exception {
        // TODO: GET /api/products with Authorization: Bearer invalid.token → expect 401
    }

    @Test
    void user_can_list_products() throws Exception {
        // TODO: GET /api/products with userToken → expect 200
    }

    @Test
    void user_cannot_delete_product() throws Exception {
        // TODO: Save a product, DELETE it with userToken → expect 403
    }

    @Test
    void admin_can_delete_product() throws Exception {
        // TODO: Save a product, DELETE it with adminToken → expect 204
    }

    @Test
    void create_product_with_missing_name_returns_400() throws Exception {
        // TODO: POST /api/products with adminToken and body {"category":"ELECTRONICS","price":999}
        //       (no "name" field) → expect 400
    }
}`,
  rubric: [
    'PostgreSQLContainer is declared static with @ServiceConnection',
    '@BeforeEach calls userRepository.deleteAll() and productRepository.deleteAll()',
    '@BeforeEach creates a USER and ADMIN and generates real tokens via jwtService.generateToken()',
    'unauthenticated_request_returns_401 performs GET with no header and expects status().isUnauthorized()',
    'invalid_jwt_returns_401 sends "Bearer invalid.token.here" and expects status().isUnauthorized()',
    'user_can_list_products sends Bearer userToken and expects status().isOk()',
    'user_cannot_delete_product sends Bearer userToken on DELETE and expects status().isForbidden()',
    'admin_can_delete_product sends Bearer adminToken on DELETE and expects status().isNoContent()',
    'create_product_with_missing_name_returns_400 sends a JSON body without "name" and expects status().isBadRequest()',
  ],
  hints: [
    'new PostgreSQLContainer<>("postgres:16-alpine") — @ServiceConnection handles property wiring',
    'For jwtService.generateToken(), create a org.springframework.security.core.userdetails.User with the email, encoded password, and List.of(new SimpleGrantedAuthority("ROLE_USER"))',
    'mockMvc.perform(get("/api/products")) — no .header() means no Authorization header',
    '.header("Authorization", "Bearer " + userToken) adds the token',
    'Product.builder().name("Laptop").category("ELECTRONICS").price(BigDecimal.valueOf(999)).build() for the delete tests',
    'delete("/api/products/" + product.getId()) constructs the DELETE URL',
    'Content-Type: application/json with body {"category":"ELECTRONICS","price":999.00} (no name)',
  ],
},
}
