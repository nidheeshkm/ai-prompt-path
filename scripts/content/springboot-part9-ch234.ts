// Part IX — Architect Thinking
// Chapter 234: API Design & Microservices Communication

import type { QuizQuestion } from '../../src/data/curriculum'

export const courseId = 'springboot-ai-architect'

export const content: Record<string, string> = {

'234.1': `# REST API Design Excellence

A well-designed REST API is a product. Engineers who consume it should feel productive on day one. Engineers who maintain it should be able to evolve it without breaking consumers.

## REST Maturity Model (Richardson)

| Level | Description | Example |
|-------|-------------|---------|
| 0 | Single URI, all operations via POST | \`POST /api\` with \`action: "getOrder"\` |
| 1 | Multiple URIs per resource | \`POST /orders\`, \`POST /orders/cancel\` |
| 2 | HTTP verbs used correctly | \`GET /orders/{id}\`, \`DELETE /orders/{id}\` |
| 3 | Hypermedia (HATEOAS) | Response includes \`_links\` to related actions |

Most production APIs operate at Level 2. Level 3 (HATEOAS) is valuable for public APIs where clients should not hard-code URIs.

## URL Design Principles

\`\`\`
# Good
GET    /api/v1/orders                   # list
GET    /api/v1/orders/{id}              # get one
POST   /api/v1/orders                   # create
PUT    /api/v1/orders/{id}              # replace
PATCH  /api/v1/orders/{id}             # partial update
DELETE /api/v1/orders/{id}             # delete
GET    /api/v1/orders/{id}/items       # sub-resource
POST   /api/v1/orders/{id}/cancel      # action as sub-resource

# Bad
GET  /api/getOrderById?orderId=123     # verbs in URL
POST /api/deleteOrder                  # wrong HTTP method
GET  /api/order/123                    # singular resource name
\`\`\`

**Rules:**
- Use plural nouns for collections (\`/orders\`, not \`/order\`)
- Use path parameters for IDs; query parameters for filtering, sorting, pagination
- Model actions as sub-resources: \`POST /orders/{id}/cancel\` not \`PATCH /orders/{id}?action=cancel\`
- Version in the URL path: \`/api/v1/\` (simplest to reason about)

## HTTP Status Codes

| Code | Meaning | When to use |
|------|---------|-------------|
| 200 | OK | Successful GET, PATCH, PUT |
| 201 | Created | Successful POST that creates a resource |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid input, validation error |
| 401 | Unauthorized | Missing/invalid authentication |
| 403 | Forbidden | Authenticated but not authorised |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Duplicate resource, concurrent modification |
| 422 | Unprocessable Entity | Syntactically valid but semantically invalid |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unhandled server exception |

## Error Response Standard (RFC 9457 — Problem Details)

\`\`\`java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidation(MethodArgumentNotValidException ex,
                                          HttpServletRequest request) {
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        problem.setTitle("Validation Failed");
        problem.setDetail("One or more fields have invalid values");
        problem.setInstance(URI.create(request.getRequestURI()));
        problem.setProperty("errors",
            ex.getBindingResult().getFieldErrors().stream()
              .map(fe -> Map.of("field", fe.getField(), "message", fe.getDefaultMessage()))
              .toList());
        return problem;
    }
}
\`\`\`

Response body:
\`\`\`json
{
  "type": "about:blank",
  "title": "Validation Failed",
  "status": 400,
  "detail": "One or more fields have invalid values",
  "instance": "/api/v1/orders",
  "errors": [
    { "field": "quantity", "message": "must be greater than 0" }
  ]
}
\`\`\`

## API Versioning Strategies

| Strategy | Example | Trade-off |
|----------|---------|-----------|
| URL path | \`/api/v2/orders\` | Simple; version visible; many URL variants |
| Header | \`Accept: application/vnd.myapp.v2+json\` | Clean URLs; hard to test in browser |
| Query param | \`/api/orders?version=2\` | Easy to test; caching complexity |

**Recommendation:** URL path versioning for REST APIs consumed by external clients. Breaking changes get a new version; non-breaking changes (new optional fields, new endpoints) are added to the existing version.

## OpenAPI with springdoc

\`\`\`java
@Operation(summary = "Place a new order",
           description = "Creates an order and initiates payment. Idempotent with X-Idempotency-Key header.")
@ApiResponse(responseCode = "201", description = "Order created",
             content = @Content(schema = @Schema(implementation = OrderResponse.class)))
@ApiResponse(responseCode = "400", description = "Invalid input",
             content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
@PostMapping("/orders")
public ResponseEntity<OrderResponse> placeOrder(
        @Valid @RequestBody PlaceOrderRequest request,
        @RequestHeader(value = "X-Idempotency-Key", required = false) String idempotencyKey) {
    // ...
}
\`\`\`

## HATEOAS with Spring HATEOAS

\`\`\`java
@GetMapping("/orders/{id}")
public EntityModel<OrderResponse> getOrder(@PathVariable String id) {
    OrderResponse order = orderService.findById(id);
    return EntityModel.of(order,
        linkTo(methodOn(OrderController.class).getOrder(id)).withSelfRel(),
        linkTo(methodOn(OrderController.class).cancelOrder(id)).withRel("cancel"),
        linkTo(methodOn(OrderController.class).getOrderItems(id)).withRel("items"));
}
\`\`\`

Response:
\`\`\`json
{
  "orderId": "order-123",
  "status": "PENDING",
  "_links": {
    "self": { "href": "/api/v1/orders/order-123" },
    "cancel": { "href": "/api/v1/orders/order-123/cancel" },
    "items": { "href": "/api/v1/orders/order-123/items" }
  }
}
\`\`\`
`,

'234.2': `# gRPC with Spring Boot — Protocol Buffers & Streaming

gRPC is a high-performance RPC framework from Google, built on HTTP/2 and Protocol Buffers. Where REST uses JSON over HTTP/1.1, gRPC uses strongly-typed binary messages over multiplexed streams.

## When to Choose gRPC over REST

| Factor | REST | gRPC |
|--------|------|------|
| Payload size | JSON — human readable, verbose | Binary protobuf — 3–10x smaller |
| Latency | HTTP/1.1 — one request per connection | HTTP/2 — multiplexed, lower latency |
| Contract | OpenAPI (optional) | .proto file (enforced) |
| Streaming | Limited (SSE, WebSockets workaround) | Native (server, client, bidirectional) |
| Browser support | First-class | Requires grpc-web proxy |
| Ecosystem | Universal | Excellent for internal service-to-service |

**Rule of thumb:** Use REST for public APIs and web clients. Use gRPC for internal service-to-service communication where performance and strong contracts matter.

## Protocol Buffers

\`\`\`protobuf
syntax = "proto3";
package com.example.order;
option java_package = "com.example.order.proto";
option java_multiple_files = true;

message PlaceOrderRequest {
  string customer_id = 1;
  string product_id  = 2;
  int32  quantity    = 3;
}

message OrderResponse {
  string order_id    = 1;
  string status      = 2;
  double total_amount = 3;
}

service OrderService {
  // Unary RPC
  rpc PlaceOrder(PlaceOrderRequest) returns (OrderResponse);

  // Server streaming — client requests once, server streams multiple responses
  rpc WatchOrderStatus(OrderStatusRequest) returns (stream OrderStatusUpdate);

  // Client streaming — client sends multiple messages, server responds once
  rpc BatchPlaceOrders(stream PlaceOrderRequest) returns (BatchOrderResponse);

  // Bidirectional streaming
  rpc ProcessOrderStream(stream PlaceOrderRequest) returns (stream OrderResponse);
}
\`\`\`

## Spring Boot gRPC Setup (grpc-spring-boot-starter)

\`\`\`xml
<dependency>
    <groupId>net.devh</groupId>
    <artifactId>grpc-server-spring-boot-starter</artifactId>
    <version>3.1.0.RELEASE</version>
</dependency>
\`\`\`

\`\`\`yaml
grpc:
  server:
    port: 9090
    security:
      certificate-chain: classpath:server.crt
      private-key: classpath:server.key
      client-auth: REQUIRE
      trust-cert-collection: classpath:ca.crt
\`\`\`

### Server Implementation

\`\`\`java
@GrpcService
public class OrderGrpcService extends OrderServiceGrpc.OrderServiceImplBase {

    private final OrderCommandHandler commandHandler;

    @Override
    public void placeOrder(PlaceOrderRequest request,
                           StreamObserver<OrderResponse> responseObserver) {
        try {
            var command = new PlaceOrderCommand(
                request.getCustomerId(),
                request.getProductId(),
                request.getQuantity()
            );
            var result = commandHandler.handle(command);
            responseObserver.onNext(OrderResponse.newBuilder()
                .setOrderId(result.orderId())
                .setStatus("CREATED")
                .setTotalAmount(result.totalAmount().doubleValue())
                .build());
            responseObserver.onCompleted();
        } catch (InsufficientStockException e) {
            responseObserver.onError(
                Status.FAILED_PRECONDITION
                    .withDescription("Insufficient stock for product " + request.getProductId())
                    .asRuntimeException());
        }
    }

    @Override
    public void watchOrderStatus(OrderStatusRequest request,
                                 StreamObserver<OrderStatusUpdate> responseObserver) {
        // Server streaming: push updates as order status changes
        orderTracker.subscribe(request.getOrderId(), update -> {
            responseObserver.onNext(OrderStatusUpdate.newBuilder()
                .setStatus(update.status())
                .setTimestamp(update.at().toString())
                .build());
            if (update.isFinal()) {
                responseObserver.onCompleted();
            }
        });
    }
}
\`\`\`

### Client

\`\`\`java
@GrpcClient("order-service")
private OrderServiceGrpc.OrderServiceBlockingStub orderStub;

public OrderResponse placeOrder(PlaceOrderCommand command) {
    return orderStub
        .withDeadlineAfter(5, TimeUnit.SECONDS)
        .placeOrder(PlaceOrderRequest.newBuilder()
            .setCustomerId(command.customerId())
            .setProductId(command.productId())
            .setQuantity(command.quantity())
            .build());
}
\`\`\`

## gRPC Status Codes

\`\`\`
OK                   → 200
INVALID_ARGUMENT     → 400 Bad Request equivalent
NOT_FOUND            → 404
ALREADY_EXISTS       → 409
PERMISSION_DENIED    → 403
RESOURCE_EXHAUSTED   → 429 (rate limited)
INTERNAL             → 500
UNAVAILABLE          → 503
DEADLINE_EXCEEDED    → 504
FAILED_PRECONDITION  → 412 (business rule violation)
\`\`\`

## gRPC Reflection & Testing

\`\`\`xml
<dependency>
    <groupId>io.grpc</groupId>
    <artifactId>grpc-services</artifactId>  <!-- enables reflection -->
</dependency>
\`\`\`

With reflection enabled, tools like \`grpcurl\` can introspect and call your service without the .proto file:

\`\`\`bash
grpcurl -plaintext localhost:9090 list
grpcurl -plaintext -d '{"customer_id":"c1","product_id":"p1","quantity":2}' \\
    localhost:9090 com.example.order.OrderService/PlaceOrder
\`\`\`
`,

'234.3': `# GraphQL, WebSockets & Protocol Selection

Choosing the right protocol is an architectural decision. REST, gRPC, GraphQL, and WebSockets each solve a different problem. Choosing incorrectly is expensive to undo.

## GraphQL with Spring for GraphQL

GraphQL lets clients request exactly the data they need — no over-fetching, no under-fetching. Ideal for complex UI data requirements with many related entities.

\`\`\`graphql
# schema.graphqls
type Query {
  order(id: ID!): Order
  orders(customerId: ID!, status: OrderStatus): [Order!]!
}

type Mutation {
  placeOrder(input: PlaceOrderInput!): OrderResult!
  cancelOrder(id: ID!): CancelResult!
}

type Subscription {
  orderStatusChanged(orderId: ID!): OrderStatusEvent!
}

type Order {
  id: ID!
  status: OrderStatus!
  customer: Customer!
  items: [OrderItem!]!
  totalAmount: Float!
  createdAt: String!
}
\`\`\`

\`\`\`java
@Controller
public class OrderGraphQLController {

    @QueryMapping
    public Order order(@Argument String id) {
        return orderService.findById(id);
    }

    @QueryMapping
    public List<Order> orders(@Argument String customerId,
                               @Argument OrderStatus status) {
        return orderService.findByCustomer(customerId, status);
    }

    @MutationMapping
    public OrderResult placeOrder(@Argument PlaceOrderInput input) {
        return orderService.placeOrder(input);
    }

    @SubscriptionMapping
    public Publisher<OrderStatusEvent> orderStatusChanged(@Argument String orderId) {
        return orderEventPublisher.statusChanges(orderId);
    }

    // N+1 protection with DataLoader
    @SchemaMapping(typeName = "Order", field = "customer")
    public CompletableFuture<Customer> customer(Order order,
                                                DataLoader<String, Customer> loader) {
        return loader.load(order.getCustomerId());
    }
}
\`\`\`

### GraphQL vs REST Trade-offs

| Concern | REST | GraphQL |
|---------|------|---------|
| Over-fetching | Common; full resource returned | None; client specifies exact fields |
| Under-fetching (multiple round trips) | Common for complex UIs | None; one query spans multiple entities |
| Caching | HTTP caching (GET is cacheable) | Complex; queries are POST by default |
| Schema contract | OpenAPI (optional) | Schema is mandatory and runtime-introspectable |
| File uploads | Simple multipart | Awkward; non-standard extensions required |
| Learning curve | Low | Medium |

**When to choose GraphQL:** Multiple client types (web, mobile, partner) with different data shapes; complex UIs that aggregate data from many entities; rapid frontend iteration without waiting for backend API changes.

## WebSockets for Real-Time Communication

\`\`\`java
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic", "/queue");  // in-memory for dev
        // registry.enableStompBrokerRelay("/topic", "/queue")  // RabbitMQ in prod
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }
}

@Controller
public class OrderWebSocketController {

    @MessageMapping("/orders/track")
    @SendToUser("/queue/order-updates")
    public OrderStatusUpdate trackOrder(TrackOrderRequest request) {
        return orderService.getCurrentStatus(request.orderId());
    }

    // Push from server (e.g., from an event listener)
    @EventListener
    public void onOrderStatusChanged(OrderStatusChangedEvent event) {
        messagingTemplate.convertAndSend(
            "/topic/orders/" + event.orderId(),
            new OrderStatusUpdate(event.orderId(), event.newStatus()));
    }
}
\`\`\`

## Protocol Selection Decision Tree

\`\`\`
Is the client a browser?
├── YES: Will you need real-time push?
│     ├── YES: WebSockets (STOMP) or Server-Sent Events
│     └── NO: REST + OpenAPI
└── NO: Is it internal service-to-service?
      ├── YES: Is performance/streaming critical?
      │     ├── YES: gRPC (protobuf, HTTP/2)
      │     └── NO: REST or message broker (Kafka/RabbitMQ)
      └── NO (partner/external API): REST + OpenAPI
\`\`\`

## Idempotency Keys

Any non-GET operation that could be retried needs idempotency protection:

\`\`\`java
@PostMapping("/orders")
public ResponseEntity<OrderResponse> placeOrder(
        @RequestHeader("X-Idempotency-Key") String idempotencyKey,
        @Valid @RequestBody PlaceOrderRequest request) {

    return idempotencyService.computeIfAbsent(idempotencyKey, () -> {
        var order = orderService.placeOrder(request);
        return ResponseEntity.status(201).body(order);
    });
}
\`\`\`

The \`idempotencyService\` stores the response keyed by the client-supplied UUID. A duplicate request within the TTL returns the stored response without re-executing the business logic.

## API Design Checklist

Before shipping an API:

- [ ] All endpoints documented with OpenAPI/springdoc
- [ ] Error responses follow RFC 9457 Problem Details
- [ ] Authentication documented (Bearer JWT, API key, OAuth2 scope)
- [ ] Rate limits documented and enforced
- [ ] Idempotency keys on all state-changing operations
- [ ] Pagination on all list endpoints (cursor-based for large datasets)
- [ ] Versioning strategy documented and enforced
- [ ] Breaking change policy communicated to consumers
- [ ] Correlation IDs accepted and propagated (\`X-Request-ID\` header)
`,

}

export const quiz: Record<string, QuizQuestion[]> = {

'234.1': [
  {
    question: 'According to Richardson\'s REST Maturity Model, what distinguishes a Level 3 (HATEOAS) API from a Level 2 API?',
    options: [
      'Level 3 uses HTTPS; Level 2 uses HTTP',
      'Level 3 responses include hypermedia links that guide clients to available actions; Level 2 does not',
      'Level 3 uses query parameters for all operations; Level 2 uses path parameters',
      'Level 3 supports multiple HTTP methods; Level 2 uses only GET and POST',
    ],
    correctIndex: 1,
    explanation: 'HATEOAS (Level 3) embeds `_links` in responses so clients can navigate the API by following links rather than hard-coding URIs. Level 2 uses correct HTTP verbs but does not include hypermedia.',
  },
  {
    question: 'Which HTTP status code is most appropriate when a client submits a request that is syntactically valid JSON but violates a business rule (e.g., ordering a negative quantity)?',
    options: ['400 Bad Request', '409 Conflict', '422 Unprocessable Entity', '500 Internal Server Error'],
    correctIndex: 2,
    explanation: '422 Unprocessable Entity signals that the request body is well-formed and parseable but semantically invalid. 400 is for malformed/unparseable requests. 422 is the correct code for business rule violations.',
  },
  {
    question: 'What is the recommended approach for handling API breaking changes under URL path versioning?',
    options: [
      'Deploy breaking changes directly to existing endpoints and notify consumers via email',
      'Create a new version path (e.g., /api/v2/) for breaking changes; add non-breaking additions to the existing version',
      'Use feature flags to gradually roll out breaking changes on the same endpoint',
      'Use query parameters to select the response schema version',
    ],
    correctIndex: 1,
    explanation: 'Non-breaking additions (new optional fields, new endpoints) go into the existing version. Breaking changes (removed fields, changed behaviour) require a new version path. This lets consumers migrate at their own pace.',
  },
  {
    question: 'The RFC 9457 Problem Details standard provides a structured error response format. Which field in a Problem Detail response identifies the specific instance of the problem (e.g., the URI of the failing request)?',
    options: ['type', 'title', 'detail', 'instance'],
    correctIndex: 3,
    explanation: '`instance` is a URI reference identifying the specific occurrence of the problem — typically the request URI. `type` is the problem category URI, `title` is a short human-readable summary, and `detail` is a longer explanation.',
  },
  {
    question: 'When designing REST resource URLs, which of these follows best practices?',
    options: [
      'POST /api/v1/cancelOrder/{id}',
      'GET /api/v1/order/123/getItems',
      'POST /api/v1/orders/{id}/cancel',
      'DELETE /api/v1/deleteOrder?id=123',
    ],
    correctIndex: 2,
    explanation: 'Actions are modelled as sub-resources with the appropriate HTTP verb: `POST /orders/{id}/cancel`. Verbs in URL paths (cancelOrder, getItems, deleteOrder) violate REST conventions. Nouns should be plural (orders, not order).',
  },
],

'234.3': [
  {
    question: 'What core problem does GraphQL solve compared to REST APIs?',
    options: [
      'GraphQL uses binary serialisation for lower latency than JSON',
      'GraphQL eliminates over-fetching and under-fetching by letting clients specify exactly which fields they need in a single query',
      'GraphQL provides built-in authentication that REST lacks',
      'GraphQL automatically generates REST endpoints from database schemas',
    ],
    correctIndex: 1,
    explanation: 'REST returns fixed shapes per endpoint, leading to over-fetching (unused fields) or under-fetching (multiple round trips for related data). GraphQL lets clients declare exactly what they need, solved in one request.',
  },
  {
    question: 'In Spring for GraphQL, what is the purpose of a DataLoader when resolving a field on a type?',
    options: [
      'It preloads the entire database into memory for faster queries',
      'It batches and deduplicates field-level database lookups to prevent N+1 queries across list results',
      'It provides reactive backpressure for streaming GraphQL subscriptions',
      'It caches GraphQL query results for repeated identical requests',
    ],
    correctIndex: 1,
    explanation: 'Without DataLoader, resolving `customer` on each of N orders causes N separate database calls. DataLoader collects all customer IDs across a batch, loads them in one query, and distributes results — eliminating the N+1 problem.',
  },
  {
    question: 'Which protocol is most appropriate for real-time bidirectional communication between a browser client and a Spring Boot server?',
    options: [
      'gRPC with HTTP/2 server streaming',
      'REST with long-polling',
      'WebSockets with STOMP over SockJS',
      'GraphQL queries over HTTP/1.1',
    ],
    correctIndex: 2,
    explanation: 'WebSockets provide full-duplex communication. STOMP is a simple messaging protocol over WebSockets. SockJS provides a fallback for environments that block WebSocket connections. Spring\'s `@EnableWebSocketMessageBroker` makes this production-ready.',
  },
  {
    question: 'Why do POST/PUT/PATCH endpoints that can be retried (e.g., network timeout before receiving the response) need idempotency key support?',
    options: [
      'To improve performance by caching the response for identical requests',
      'To prevent duplicate side effects (e.g., double-charging a payment) when a client retries a request it never received a response for',
      'To enable request tracing across distributed services',
      'To satisfy PCI-DSS compliance requirements for financial APIs',
    ],
    correctIndex: 1,
    explanation: 'A client that times out does not know if the server processed the request. Without idempotency keys, a retry could create a duplicate order or charge. The server returns the stored result for duplicate keys without re-executing the operation.',
  },
  {
    question: 'According to the protocol selection decision tree, when is gRPC preferred over REST for service-to-service communication?',
    options: [
      'When the consumer is a web browser with modern JavaScript support',
      'When the API must be publicly documented and consumed by external third parties',
      'When performance or streaming is critical in internal service-to-service communication',
      'When the payload is primarily human-readable configuration data',
    ],
    correctIndex: 2,
    explanation: 'gRPC\'s binary protobuf serialisation, HTTP/2 multiplexing, and native streaming make it optimal for internal microservice communication where latency and throughput matter. Browser clients and external APIs are better served by REST.',
  },
],

}

export const codingTask: Record<string, { instructions: string; boilerplate: string; rubric: string[]; hints: string[] }> = {

'234.2': {
  instructions: `## Task: Implement a gRPC Service — ProductService

Implement a \`ProductGrpcService\` that serves as a gRPC server for product lookups. The .proto contract defines two RPCs: a unary lookup and a server-streaming search.

### .proto contract (already generated — do NOT modify)

\`\`\`proto
service ProductService {
  rpc GetProduct(GetProductRequest) returns (ProductProto);
  rpc SearchProducts(SearchProductsRequest) returns (stream ProductProto);
}

message GetProductRequest { string sku = 1; }
message SearchProductsRequest { string query = 1; int32 max_results = 2; }
message ProductProto { string sku = 1; string name = 2; double price = 3; bool in_stock = 4; }
\`\`\`

### Requirements

1. **\`getProduct\`** (unary):
   - Look up product by SKU from the \`ProductRepository\`
   - If found: respond with the product mapped to \`ProductProto\`, then call \`onCompleted()\`
   - If not found: call \`onError\` with \`Status.NOT_FOUND.withDescription("Product not found: " + sku)\`

2. **\`searchProducts\`** (server streaming):
   - Search the repository using \`request.getQuery()\` with limit \`request.getMaxResults()\`
   - For each result, call \`responseObserver.onNext(toProto(product))\`
   - After all results, call \`onCompleted()\`
   - On exception: call \`onError\` with \`Status.INTERNAL\`

3. **\`toProto(Product product)\`** private helper:
   - Maps \`Product\` domain object to \`ProductProto\` using the builder pattern

### Acceptance Criteria

- Unary RPC returns \`NOT_FOUND\` for unknown SKUs
- Streaming RPC calls \`onNext\` once per result, then \`onCompleted\`
- Exceptions are mapped to appropriate gRPC \`Status\` codes (not propagated raw)
- Class is annotated with \`@GrpcService\`
`,
  boilerplate: `import io.grpc.Status;
import io.grpc.stub.StreamObserver;
import net.devh.boot.grpc.server.service.GrpcService;

// TODO: Add @GrpcService annotation
public class ProductGrpcService extends ProductServiceGrpc.ProductServiceImplBase {

    private final ProductRepository productRepository;

    public ProductGrpcService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Override
    public void getProduct(GetProductRequest request,
                           StreamObserver<ProductProto> responseObserver) {
        String sku = request.getSku();
        // TODO: look up product by sku from productRepository
        // TODO: if present: map to ProductProto, call onNext then onCompleted
        // TODO: if absent: call onError with Status.NOT_FOUND and a descriptive message
    }

    @Override
    public void searchProducts(SearchProductsRequest request,
                               StreamObserver<ProductProto> responseObserver) {
        // TODO: search repository using request.getQuery() and request.getMaxResults()
        // TODO: for each result, call responseObserver.onNext(toProto(product))
        // TODO: call onCompleted() after all results
        // TODO: wrap in try-catch; on exception call onError with Status.INTERNAL
    }

    private ProductProto toProto(Product product) {
        // TODO: build and return a ProductProto from the Product domain object
        //       Fields: sku, name, price (double), inStock (boolean)
        return null;
    }
}
`,
  rubric: [
    'Class is annotated with @GrpcService',
    'getProduct looks up product by SKU using productRepository',
    'getProduct calls responseObserver.onNext with mapped ProductProto when found',
    'getProduct calls responseObserver.onCompleted() after onNext',
    'getProduct calls responseObserver.onError with Status.NOT_FOUND when product absent',
    'searchProducts calls onNext for each result then onCompleted',
    'searchProducts wraps logic in try-catch and maps exceptions to Status.INTERNAL',
    'toProto correctly maps all four fields: sku, name, price, inStock',
  ],
  hints: [
    'Use `productRepository.findBySku(sku)` which returns `Optional<Product>`.',
    'Call `responseObserver.onError(Status.NOT_FOUND.withDescription(...).asRuntimeException())` for missing products.',
    'In searchProducts, call `productRepository.search(request.getQuery(), request.getMaxResults())` to get a list.',
    'In toProto: `ProductProto.newBuilder().setSku(p.getSku()).setName(p.getName()).setPrice(p.getPrice()).setInStock(p.isInStock()).build()`.',
    'For Status.INTERNAL in the catch block: `responseObserver.onError(Status.INTERNAL.withCause(ex).asRuntimeException())`.',
  ],
},

}
