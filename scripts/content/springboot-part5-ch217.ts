// Part V — Microservices + Virtual Threads
// Chapter 217: Microservices Architecture with Spring Boot

import type { QuizQuestion } from '../../src/data/curriculum'

export const courseId = 'springboot-ai-architect'

export const content: Record<string, string> = {

'217.1': `# Monolith to Microservices — When and How to Decompose

Every successful microservices architecture started as a monolith. Microservices are not an architectural starting point — they are an answer to a specific set of scaling and organisational problems that a well-designed monolith eventually surfaces.

## What Microservices Actually Solve

Before decomposing anything, be clear on the problem you're solving:

| Problem | Microservices helps? |
|---|---|
| Independent deployment of separate business capabilities | Yes |
| Different scaling profiles (orders need 10x more capacity than reports) | Yes |
| Multiple teams working on the same codebase with high merge conflict rate | Yes |
| Slow builds and test suites because the monolith is huge | Partially — modular monolith often better |
| We want to use different languages/runtimes for different services | Yes |
| Our monolith has a bug | No — a microservice with the same bug is just a distributed bug |

The last row is the most important. Microservices do not fix bad code or bad domain design. If your monolith is a big ball of mud, you will build a distributed big ball of mud.

## Domain-Driven Design as the Decomposition Guide

Conway's Law: "Organizations design systems that mirror their own communication structure." The most reliable way to find service boundaries is to follow your organisation's team boundaries and your domain's **Bounded Contexts**.

A Bounded Context is a clear boundary within which a particular domain model is consistent and unambiguous. In an e-commerce system:

\`\`\`
+----------------------+   +----------------------+   +----------------------+
|   Order Context      |   |  Inventory Context   |   |  Payment Context     |
|                      |   |                      |   |                      |
|  Order (entity)      |   |  Product (entity)    |   |  Payment (entity)    |
|  OrderItem (VO)      |   |  StockLevel (VO)     |   |  Charge (VO)         |
|  OrderStatus (enum)  |   |  Warehouse (entity)  |   |  Refund (entity)     |
+----------------------+   +----------------------+   +----------------------+
\`\`\`

Notice that "Product" appears in both Order and Inventory, but means different things in each context. In Order, a product is just an SKU and a price. In Inventory, it has stock levels, warehouse locations, and reorder thresholds. Keeping these models separate is the point.

## The Strangler Fig Pattern

For an existing monolith, use the Strangler Fig pattern — extract one capability at a time:

\`\`\`
Phase 1: Monolith handles everything
         Client → Monolith → DB

Phase 2: New service created; traffic for that capability is routed to it
         Client → API Gateway → /orders  → OrderService (new)
                              → /catalog → Monolith (existing)

Phase 3: More services extracted; monolith shrinks
         Client → API Gateway → /orders     → OrderService
                              → /inventory  → InventoryService (new)
                              → /payments   → Monolith (shrinking)

Phase 4: Monolith is gone (or a small residual service)
\`\`\`

The monolith runs throughout — you never have a "big rewrite" flag day that shuts everything down.

## When NOT to Use Microservices

- **Team size under 10 engineers**: The operational overhead of microservices (separate deployments, distributed tracing, network failure handling) exceeds the benefit.
- **New product**: You don't know your domain boundaries yet. Start with a modular monolith. Split when boundaries become clear.
- **Strong data consistency requirements everywhere**: Microservices communicate asynchronously, which means eventual consistency. If every operation requires immediate cross-service consistency, you will fight the architecture constantly.
- **No DevOps maturity**: Microservices require CI/CD, container orchestration, centralized logging, and distributed tracing just to operate. Without this infrastructure, teams spend all their time firefighting.

## The Modular Monolith as a Middle Path

A modular monolith has clearly separated packages (modules) with enforced boundaries — packages only communicate through defined interfaces, never directly accessing each other's internals — but deploys as a single unit.

\`\`\`
src/main/java/com/example/
  orders/
    api/         ← public interface (controllers, event publishers)
    domain/      ← Order, OrderItem, OrderStatus
    application/ ← OrderService
    infra/       ← OrderRepository, OrderMapper
  inventory/
    api/
    domain/
    application/
    infra/
\`\`\`

Orders code can call \`inventory.api.*\` but never \`inventory.domain.*\` or \`inventory.infra.*\`. ArchUnit enforces these rules at build time:

\`\`\`java
@AnalyzeClasses(packages = "com.example")
class ArchitectureRulesTest {
    @ArchTest
    static final ArchRule orders_does_not_access_inventory_internals =
        noClasses().that().resideInAPackage("..orders..")
            .should().accessClassesThat()
            .resideInAPackage("..inventory.domain..")
            .orShould().accessClassesThat()
            .resideInAPackage("..inventory.infra..");
}
\`\`\`

When a module needs its own deployment cadence or scaling profile, extract it to a service. The interface contract already exists.

## AI-Assisted Decomposition

AI tools are effective at analyzing a monolith's dependency graph and suggesting decomposition strategies. A useful Claude prompt:

> "Analyze the following package structure and method call graph. Identify cohesive clusters of classes that could form bounded contexts. For each suggested boundary, list: (1) the classes in the cluster, (2) what crosses the boundary and would become an API or event, (3) what data would need to be duplicated or replicated."

Paste your \`@Service\` and \`@Repository\` class list and the key method calls between them.`,

'217.2': `# Service Discovery with Spring Cloud

When Service A needs to call Service B in a microservices system, how does A find B's address? In a traditional system you'd hardcode an IP and port. In a cloud environment where services scale horizontally and containers move between hosts, that doesn't work. Service discovery solves this.

## The Two Discovery Patterns

### Client-Side Discovery
The client (Service A) queries a registry, gets a list of Service B instances, picks one, and calls it directly.

\`\`\`
ServiceA → [query] → ServiceRegistry → ["http://service-b:8080", "http://service-b:8081"]
ServiceA → [call]  → http://service-b:8081
\`\`\`

Spring Cloud Netflix Eureka and Consul use this pattern.

### Server-Side Discovery
The client calls a load balancer. The load balancer queries the registry and forwards the request.

\`\`\`
ServiceA → [call] → LoadBalancer → [query] → ServiceRegistry
                                 → [forward] → http://service-b:8081
\`\`\`

Kubernetes Services use this pattern. If you're on Kubernetes, you usually don't need Spring Cloud's service discovery — Kubernetes provides it.

## Eureka Server Setup

\`\`\`xml
<!-- eureka-server pom.xml -->
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-netflix-eureka-server</artifactId>
</dependency>
\`\`\`

\`\`\`java
@SpringBootApplication
@EnableEurekaServer
public class EurekaServerApplication {
    public static void main(String[] args) {
        SpringApplication.run(EurekaServerApplication.class, args);
    }
}
\`\`\`

\`\`\`yaml
# application.yml for Eureka server
server:
  port: 8761

eureka:
  client:
    register-with-eureka: false  # The server doesn't register with itself
    fetch-registry: false
  server:
    wait-time-in-ms-when-sync-empty: 0  # Faster startup in dev
\`\`\`

## Registering a Service (Eureka Client)

\`\`\`xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-netflix-eureka-client</artifactId>
</dependency>
\`\`\`

\`\`\`yaml
spring:
  application:
    name: order-service  # This is how other services will refer to this service

eureka:
  client:
    service-url:
      defaultZone: http://localhost:8761/eureka/
  instance:
    prefer-ip-address: true  # Register with IP, not hostname (better for containers)
    lease-renewal-interval-in-seconds: 10
    lease-expiration-duration-in-seconds: 30
\`\`\`

## Load-Balanced RestClient

Once registered, call other services by name rather than URL:

\`\`\`java
@Configuration
public class RestClientConfig {

    @Bean
    @LoadBalanced  // Intercepts calls to service names and resolves via Eureka
    public RestClient.Builder loadBalancedRestClientBuilder() {
        return RestClient.builder();
    }
}

@Service
@RequiredArgsConstructor
public class OrderService {

    private final RestClient.Builder restClientBuilder;

    public InventoryStatus checkInventory(String productId) {
        return restClientBuilder.build()
            .get()
            .uri("http://inventory-service/api/inventory/{productId}", productId)
            // ↑ "inventory-service" is the spring.application.name of the other service
            .retrieve()
            .body(InventoryStatus.class);
    }
}
\`\`\`

The \`@LoadBalanced\` annotation makes Spring intercept the hostname \`inventory-service\`, look it up in Eureka, pick an instance (round-robin by default), and replace the hostname with the actual IP:port.

## Health Checks and Eviction

Eureka expects services to send heartbeats every 30 seconds (configurable). If a service misses 3 heartbeats, Eureka marks it DOWN and eventually removes it from the registry. Spring Boot Actuator provides the health endpoint Eureka uses:

\`\`\`yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info
  endpoint:
    health:
      show-details: when-authorized
\`\`\`

## Kubernetes as a Service Registry

On Kubernetes, each Service gets a stable DNS name (\`order-service.default.svc.cluster.local\`) and a ClusterIP that load-balances across pods. This is server-side discovery built into the platform.

If you deploy to Kubernetes, use Spring Cloud Kubernetes instead of Eureka:

\`\`\`xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-kubernetes-client-loadbalancer</artifactId>
</dependency>
\`\`\`

Spring Cloud Kubernetes reads the Kubernetes API to discover services, giving you \`@LoadBalanced\` RestClient support backed by real Kubernetes Service endpoints — no Eureka server needed.

## What AI Generates (and What to Check)

When asking AI to generate Eureka or service discovery configuration, verify:
1. The \`spring.application.name\` is consistent across all references — a typo here is invisible until a call fails at runtime
2. \`@EnableEurekaServer\` is only on the registry, not on every service
3. \`@LoadBalanced\` is on the builder/template bean, not on every injection point
4. The Eureka server URL uses the right scheme and port in each environment`,

'217.3': `# API Gateway with Spring Cloud Gateway

An API gateway is the single entry point for all external clients into your microservices system. Rather than exposing each service's port directly, all traffic goes through the gateway, which handles routing, authentication, rate limiting, and request transformation.

## Why a Gateway?

| Without Gateway | With Gateway |
|---|---|
| Clients must know addresses of all services | Clients talk to one URL |
| CORS and auth configured on every service | Configured once in the gateway |
| Cross-cutting concerns (rate limiting, logging) duplicated | Implemented once |
| Services exposed directly to the internet | Services hidden in a private network |

## Spring Cloud Gateway MVC vs Reactive

Spring Cloud Gateway comes in two flavours:

- **Spring Cloud Gateway MVC** (Boot 3.2+): Servlet-based, uses the familiar \`@Bean\` and \`application.yml\` configuration. Simpler, works with virtual threads.
- **Spring Cloud Gateway** (original): Reactive, built on Spring WebFlux and Project Reactor. Higher throughput for I/O-heavy workloads.

For new projects, start with the MVC variant unless you have a specific reason for reactive.

## Gateway Setup

\`\`\`xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-gateway-mvc</artifactId>
</dependency>
\`\`\`

## Route Configuration

\`\`\`yaml
spring:
  cloud:
    gateway:
      mvc:
        routes:
          - id: order-service
            uri: lb://order-service        # lb:// uses load-balanced discovery
            predicates:
              - Path=/api/orders/**
            filters:
              - StripPrefix=1              # Remove /api prefix before forwarding

          - id: inventory-service
            uri: lb://inventory-service
            predicates:
              - Path=/api/inventory/**
            filters:
              - StripPrefix=1

          - id: product-service-v2
            uri: http://product-service:8080
            predicates:
              - Path=/api/v2/products/**
              - Header=X-API-Version, 2    # Only route if header present
\`\`\`

## Programmatic Route Configuration

\`\`\`java
@Configuration
public class GatewayConfig {

    @Bean
    public RouterFunction<ServerResponse> routes() {
        return RouterFunctions.route()
            .GET("/api/health", request ->
                ServerResponse.ok().body("Gateway is healthy"))
            .build();
    }
}
\`\`\`

## Global Filters — Adding Auth Validation

\`\`\`java
@Component
public class JwtAuthenticationFilter implements GlobalFilter, Ordered {

    private final JwtService jwtService;

    private static final List<String> PUBLIC_PATHS = List.of(
        "/api/auth/login", "/api/auth/register", "/actuator/health"
    );

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getPath().toString();

        if (PUBLIC_PATHS.stream().anyMatch(path::startsWith)) {
            return chain.filter(exchange);
        }

        String authHeader = exchange.getRequest().getHeaders()
            .getFirst(HttpHeaders.AUTHORIZATION);

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }

        try {
            String token = authHeader.substring(7);
            String username = jwtService.extractUsername(token);
            // Add user info as a header for downstream services
            ServerHttpRequest mutatedRequest = exchange.getRequest().mutate()
                .header("X-Authenticated-User", username)
                .build();
            return chain.filter(exchange.mutate().request(mutatedRequest).build());
        } catch (JwtException e) {
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }
    }

    @Override
    public int getOrder() {
        return -100; // High priority — run before route filters
    }
}
\`\`\`

## Rate Limiting

\`\`\`yaml
spring:
  cloud:
    gateway:
      mvc:
        routes:
          - id: order-service
            uri: lb://order-service
            predicates:
              - Path=/api/orders/**
            filters:
              - name: RequestRateLimiter
                args:
                  redis-rate-limiter.replenishRate: 10   # 10 requests/second
                  redis-rate-limiter.burstCapacity: 20   # Allow bursts up to 20
                  key-resolver: "#{@userKeyResolver}"    # Rate limit per user
\`\`\`

\`\`\`java
@Bean
public KeyResolver userKeyResolver() {
    return exchange -> Mono.just(
        Optional.ofNullable(exchange.getRequest().getHeaders().getFirst("X-Authenticated-User"))
            .orElse("anonymous")
    );
}
\`\`\`

## Path Rewriting

\`\`\`yaml
filters:
  - RewritePath=/api/(?<segment>.*), /\${segment}
  # Rewrites /api/orders/123 → /orders/123 before forwarding
\`\`\`

## CORS at the Gateway

Configure CORS once in the gateway — downstream services should not expose CORS headers (they're behind the gateway and never directly accessed by browsers):

\`\`\`yaml
spring:
  cloud:
    gateway:
      globalcors:
        cors-configurations:
          '[/**]':
            allowedOrigins: "https://app.example.com"
            allowedMethods: "GET,POST,PUT,DELETE,PATCH,OPTIONS"
            allowedHeaders: "Authorization,Content-Type"
            allowCredentials: true
\`\`\`

## Testing the Gateway

\`\`\`java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class GatewayRoutingTest {

    @Container
    static WireMockContainer orderServiceMock = new WireMockContainer("wiremock/wiremock:3.5.4");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        // Override the order-service URI to point to WireMock
        registry.add("spring.cloud.gateway.mvc.routes[0].uri", orderServiceMock::getBaseUrl);
    }

    @Test
    void request_to_api_orders_is_routed_to_order_service() {
        orderServiceMock.stubFor(get(urlEqualTo("/orders"))
            .willReturn(aResponse().withStatus(200).withBody("[]")));

        // Make a request through the gateway
        // Verify it reached the mock
        orderServiceMock.verify(getRequestedFor(urlEqualTo("/orders")));
    }
}
\`\`\``,
}

export const quiz: Record<string, QuizQuestion[]> = {

'217.1': [
  {
    question: 'What does Conway\'s Law state, and how does it guide microservice boundaries?',
    options: [
      'Software systems tend to be as complex as the hardware they run on',
      'Organizations design systems that mirror their own communication structure — so service boundaries should align with team boundaries and bounded contexts',
      'The number of microservices in a system equals the number of developers squared',
      'Microservices should be small enough for one developer to understand completely',
    ],
    correctIndex: 1,
    explanation: 'Conway\'s Law observes that system architecture reflects team communication patterns. This means the most stable and natural service boundaries are those that align with how your organization is structured — one team owns one service. Fighting this alignment creates artificial coupling.',
  },
  {
    question: 'What is the Strangler Fig pattern for microservices migration?',
    options: [
      'Rewriting the entire monolith at once and switching over on a flag day',
      'Extracting one capability at a time to a new service, routing traffic incrementally, until the monolith is replaced',
      'Breaking the monolith into the smallest possible services as quickly as possible',
      'Keeping the monolith as the source of truth and building read-only microservices',
    ],
    correctIndex: 1,
    explanation: 'The Strangler Fig grows around a tree until the original is replaced. Applied to software: you add new services alongside the running monolith, route traffic for each extracted capability to the new service, and gradually shrink the monolith until it\'s gone. No risky big-bang migrations.',
  },
  {
    question: 'Which situation is most appropriate for starting with a modular monolith rather than microservices?',
    options: [
      'When you have 50+ engineers who need independent deployment cycles',
      'When you\'re building a new product and domain boundaries are not yet clear',
      'When different services need different programming languages',
      'When services have vastly different scaling requirements',
    ],
    correctIndex: 1,
    explanation: 'For a new product, your understanding of the domain evolves rapidly. Drawing service boundaries too early locks you into a design that may need expensive re-distribution later. A modular monolith with enforced package boundaries lets you refine the model and extract services when boundaries stabilize.',
  },
  {
    question: 'How does ArchUnit help enforce modular monolith boundaries?',
    options: [
      'ArchUnit generates microservices from package definitions automatically',
      'ArchUnit writes architectural rules as tests that fail if code violates package access rules, enforcing boundaries at build time',
      'ArchUnit monitors runtime calls and logs boundary violations',
      'ArchUnit encrypts inter-package communication to enforce access control',
    ],
    correctIndex: 1,
    explanation: 'ArchUnit lets you write architectural rules as JUnit tests (e.g., "classes in orders package must not access classes in inventory.infra package"). These tests run in CI and fail the build if a developer accidentally couples two modules that should be independent.',
  },
  {
    question: 'Why do microservices require strong DevOps maturity to operate successfully?',
    options: [
      'Microservices use more memory and require specialized hardware provisioning',
      'Each service needs independent CI/CD pipelines, distributed tracing, centralized logging, and container orchestration — without these, operational complexity overwhelms teams',
      'Microservices must be deployed to multiple cloud regions simultaneously',
      'Each microservice requires a dedicated database administrator',
    ],
    correctIndex: 1,
    explanation: 'A monolith has one build, one deployment, one log stream. Ten microservices have ten of each, plus inter-service failures, network partitions, and distributed traces to stitch together. Without CI/CD automation, centralized observability, and orchestration (Kubernetes), the operational burden becomes untenable.',
  },
],

'217.2': [
  {
    question: 'What is the difference between client-side and server-side service discovery?',
    options: [
      'Client-side discovery runs on the developer\'s machine; server-side runs in production',
      'In client-side discovery the caller queries the registry and load-balances itself; in server-side a load balancer does the registry lookup and forwarding',
      'Client-side discovery uses HTTP; server-side uses gRPC',
      'Server-side discovery requires a Eureka server; client-side does not',
    ],
    correctIndex: 1,
    explanation: 'Client-side: the calling service asks the registry (Eureka/Consul) for a list of instances and picks one itself (Spring Cloud LoadBalancer does this). Server-side: the calling service talks to a load balancer (e.g., a Kubernetes Service) which queries the registry and routes the request.',
  },
  {
    question: 'Why should spring.application.name be configured consistently in every microservice?',
    options: [
      'Spring Boot uses it to name the main class at startup',
      'It is how other services discover and call this service — a typo means no traffic is routed to it',
      'Eureka uses it to set the JWT issuer for this service',
      'It determines the default database schema name for the service',
    ],
    correctIndex: 1,
    explanation: 'spring.application.name is the service identifier in the registry. When Service A calls http://inventory-service/..., Spring resolves "inventory-service" by looking it up in Eureka. If the inventory service registered with a different name (e.g., "Inventory-Service"), the lookup fails silently at runtime.',
  },
  {
    question: 'Why is the @LoadBalanced annotation placed on the RestClient.Builder bean rather than on every injection point?',
    options: [
      'Spring only supports @LoadBalanced on @Bean methods, not on @Autowired fields',
      'A single @LoadBalanced builder creates all clients with load balancing enabled; annotating injection points would create duplicate interceptors per client',
      '@LoadBalanced on the bean applies to all calls; on injection points it only applies to that specific caller class',
      'This is a Eureka limitation — only one load-balanced client is allowed per application',
    ],
    correctIndex: 1,
    explanation: '@LoadBalanced is a qualifier that tells Spring to add the LoadBalancerInterceptor to this builder\'s built clients. Applying it to the builder bean means every RestClient created from that builder inherits load balancing. Applying it to every injection point would add the interceptor redundantly for each.',
  },
  {
    question: 'When should you use Spring Cloud Kubernetes instead of Eureka for service discovery?',
    options: [
      'When your team prefers YAML configuration over Java code',
      'When your services run on Kubernetes, which already provides server-side discovery via its Service and DNS mechanism',
      'When you have more than 10 microservices',
      'When you need TLS between services',
    ],
    correctIndex: 1,
    explanation: 'Kubernetes provides built-in service discovery via DNS (service-name.namespace.svc.cluster.local) and ClusterIP load balancing. Running Eureka on Kubernetes duplicates this infrastructure. Spring Cloud Kubernetes integrates with the Kubernetes API directly, giving you @LoadBalanced support without a separate registry server.',
  },
  {
    question: 'What happens in Eureka if a service stops sending heartbeats?',
    options: [
      'Eureka immediately removes it from the registry',
      'After missing a configured number of heartbeats, Eureka marks the service DOWN and eventually evicts it from the registry',
      'Other services retry indefinitely until the service comes back',
      'Eureka notifies all registered clients via a push notification',
    ],
    correctIndex: 1,
    explanation: 'Eureka uses a lease mechanism. Services renew their lease every 30 seconds (default). If a lease is not renewed within the expiration duration (90 seconds default), Eureka marks the instance as DOWN. After further time passes without renewal, it evicts the instance from the registry.',
  },
],

'217.3': [
  {
    question: 'What is the primary role of an API gateway in a microservices architecture?',
    options: [
      'To store shared configuration for all services',
      'To provide a single entry point for all external clients, handling routing, authentication, rate limiting, and request transformation centrally',
      'To act as the service registry where services register their endpoints',
      'To replace the load balancer at the infrastructure level',
    ],
    correctIndex: 1,
    explanation: 'The gateway is the façade for the entire system. Clients see one URL; the gateway routes to the right service. Cross-cutting concerns (auth, CORS, rate limiting, logging) are implemented once in the gateway rather than duplicated across every service.',
  },
  {
    question: 'What does the StripPrefix=1 filter do in a Spring Cloud Gateway route?',
    options: [
      'Removes the first query parameter from the request URL',
      'Removes the first path segment before forwarding — e.g., /api/orders/123 becomes /orders/123',
      'Removes the Authorization header before forwarding to the service',
      'Limits the request to the first 1MB of the body',
    ],
    correctIndex: 1,
    explanation: 'StripPrefix=1 removes the first path segment from the request path before forwarding. If the gateway path is /api/orders/** and the downstream service expects /orders/**, StripPrefix=1 bridges the difference — clients call /api/orders/123, the service receives /orders/123.',
  },
  {
    question: 'Why should CORS be configured at the API gateway rather than on each individual microservice?',
    options: [
      'Spring Boot microservices do not support CORS configuration',
      'Services are in the private network and never directly accessed by browsers — only the gateway is public, so CORS belongs there',
      'The gateway has access to a Redis cache that individual services cannot reach',
      'Browser CORS policies only apply to requests going through a gateway',
    ],
    correctIndex: 1,
    explanation: 'Microservices behind a gateway are not exposed to the internet. Browsers only communicate with the gateway URL. Configuring CORS on each service duplicates configuration and is irrelevant for service-to-service calls (which don\'t involve browsers). The gateway is the right single point.',
  },
  {
    question: 'What does the lb:// prefix in a gateway route URI do?',
    options: [
      'Enables HTTPS (load-balanced secure) for the connection',
      'Triggers Spring Cloud LoadBalancer to resolve the service name to an actual instance via the service registry',
      'Routes the request to the local developer machine (lb = localhost bridge)',
      'Enables layer-7 load balancing at the TCP level',
    ],
    correctIndex: 1,
    explanation: 'lb:// is the scheme prefix recognized by Spring Cloud Gateway that tells it to use the LoadBalancer to resolve the host. lb://order-service means: look up "order-service" in the registry (Eureka or Kubernetes), pick an instance, and forward the request there.',
  },
  {
    question: 'In a gateway global filter, what is the significance of the getOrder() return value?',
    options: [
      'It specifies which HTTP status code the filter returns when it rejects a request',
      'Filters with lower order values execute first — a negative value like -100 ensures auth runs before route-specific filters',
      'It controls the maximum number of concurrent requests this filter handles',
      'It determines which services this filter applies to based on their port numbers',
    ],
    correctIndex: 1,
    explanation: 'Spring\'s ordered filter chain executes filters from lowest to highest order value. A global auth filter with getOrder() = -100 runs before all route-specific filters. If auth fails, the filter short-circuits and returns 401 without ever touching the route filters or the downstream service.',
  },
],
}

export const codingTask: Record<string, {
  instructions: string; boilerplate: string; rubric: string[]; hints: string[]
}> = {

'217.3': {
  instructions: `Configure a Spring Cloud Gateway MVC application that routes to two downstream services and enforces JWT authentication.

Requirements:

**Routes (in application.yml):**
1. \`/api/orders/**\` → \`lb://order-service\`, strip the \`/api\` prefix (StripPrefix=1)
2. \`/api/inventory/**\` → \`lb://inventory-service\`, strip the \`/api\` prefix

**Global Auth Filter (Java):**
Implement \`JwtGatewayFilter implements GlobalFilter, Ordered\` that:
1. Skips auth for \`/api/auth/**\` and \`/actuator/health\`
2. Reads the \`Authorization: Bearer <token>\` header
3. Returns 401 if missing or not starting with "Bearer "
4. Validates the token using \`JwtService.isTokenValid()\` (assume it's autowired)
5. On success, adds header \`X-Authenticated-User: <username>\` to the forwarded request
6. Returns order \`-100\` so it runs before route filters`,
  boilerplate: `// application.yml — configure the two routes

// ---

package com.example.gateway;

import com.example.security.JwtService;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.List;

@Component
public class JwtGatewayFilter implements GlobalFilter, Ordered {

    private final JwtService jwtService;

    private static final List<String> PUBLIC_PATHS = List.of(
        "/api/auth/", "/actuator/health"
    );

    public JwtGatewayFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getPath().toString();

        // TODO: skip auth if path starts with any PUBLIC_PATHS entry

        String authHeader = exchange.getRequest().getHeaders()
            .getFirst(HttpHeaders.AUTHORIZATION);

        // TODO: return 401 if authHeader is null or doesn't start with "Bearer "

        String token = authHeader.substring(7);

        // TODO: extract username using jwtService, validate, add X-Authenticated-User header
        // TODO: return 401 on JwtException

        return chain.filter(exchange); // placeholder
    }

    @Override
    public int getOrder() {
        // TODO: return the correct order value
        return 0;
    }
}`,
  rubric: [
    'application.yml routes /api/orders/** to lb://order-service with StripPrefix=1',
    'application.yml routes /api/inventory/** to lb://inventory-service with StripPrefix=1',
    'JwtGatewayFilter skips auth when path starts with /api/auth/ or /actuator/health',
    'Returns HttpStatus.UNAUTHORIZED when Authorization header is missing',
    'Returns HttpStatus.UNAUTHORIZED when Authorization header does not start with "Bearer "',
    'Extracts token with authHeader.substring(7)',
    'Calls jwtService.extractUsername(token) and adds X-Authenticated-User header via exchange.getRequest().mutate()',
    'Wraps token validation in try-catch for JwtException and returns 401 on exception',
    'getOrder() returns -100',
  ],
  hints: [
    'PUBLIC_PATHS.stream().anyMatch(path::startsWith) — short-circuit with return chain.filter(exchange)',
    'exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED); return exchange.getResponse().setComplete();',
    'exchange.getRequest().mutate().header("X-Authenticated-User", username).build() then exchange.mutate().request(mutated).build()',
    'Wrap jwtService calls in try { } catch (JwtException e) { ... }',
    'return -100 from getOrder()',
  ],
},
}
