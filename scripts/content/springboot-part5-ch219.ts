// Part V — Microservices + Virtual Threads
// Chapter 219: Java 21 Virtual Threads & Structured Concurrency

import type { QuizQuestion } from '../../src/data/curriculum'

export const courseId = 'springboot-ai-architect'

export const content: Record<string, string> = {

'219.1': `# Virtual Threads — What They Are and Why They Matter

Java 21 made virtual threads a production feature (JEP 444). This is the biggest change to Java concurrency in 20 years. It fundamentally changes how you think about I/O-bound server applications.

## The Old World: Platform Threads

Before virtual threads, every Java thread mapped 1:1 to an OS thread. OS threads are heavy:
- **Stack memory**: ~1MB per thread (committed, not just reserved)
- **Context switch cost**: The OS kernel switches between threads — microseconds, but adds up
- **Practical limit**: ~10,000 threads per JVM before you hit memory limits

Spring Boot's traditional Tomcat server uses a thread pool. Each HTTP request occupies a thread for its entire duration. If the request calls a database (takes 10ms) and an external API (takes 50ms), the thread sits idle for 60ms waiting. With 200 threads in the pool, you can only handle ~200 concurrent requests, and most of those threads are blocked on I/O.

\`\`\`
Request → Thread (waiting for DB 10ms) → Thread (waiting for API 50ms) → Response
          Thread is BLOCKED and IDLE for 60ms out of 70ms total request time
\`\`\`

## The New World: Virtual Threads

Virtual threads are managed by the JVM, not the OS. They are tiny (a few hundred bytes of initial stack) and the JVM can create millions of them.

The key mechanism: when a virtual thread blocks on I/O, the JVM unmounts it from the OS thread (called the **carrier thread**) and parks the virtual thread's state. The carrier thread is then available to run another virtual thread. When the I/O completes, the virtual thread is remounted on a carrier thread and resumes.

\`\`\`
Virtual Thread 1 → calls DB (blocks) → carrier thread freed → runs Virtual Thread 2
Virtual Thread 2 → calls API (blocks) → carrier thread freed → runs Virtual Thread 3
...
Virtual Thread 1 → DB result arrives → remounted → continues → Response
\`\`\`

Result: a server with 8 carrier threads (one per CPU core) can handle tens of thousands of concurrent requests, because most virtual threads are parked waiting for I/O at any given time.

## What Changes For You

Almost nothing in your application code changes. Virtual threads use the same \`Thread\` API, the same \`synchronized\`, the same \`ThreadLocal\`. The difference is in how threads are created:

\`\`\`java
// Platform thread (old)
Thread t = new Thread(() -> { ... });

// Virtual thread (Java 21)
Thread t = Thread.ofVirtual().start(() -> { ... });

// Or via executor
ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();
executor.submit(() -> { ... });
\`\`\`

Spring Boot 3.2+ enables virtual threads for the entire web server with a single configuration line.

## When Virtual Threads Help

Virtual threads excel at **I/O-bound, high-concurrency** workloads:
- REST APIs that call databases and external services
- APIs with high latency variance (some requests fast, some slow)
- Workloads that currently use reactive programming (WebFlux) as a workaround

Virtual threads do NOT help with **CPU-bound** work:
- Image processing
- Cryptography
- Scientific computation
- Anything that keeps the CPU busy rather than waiting

For CPU-bound work, traditional thread pools sized to the CPU count remain correct.

## Thread Pinning — The Gotcha

Virtual threads can be "pinned" to their carrier thread (preventing unmounting) in two situations:

1. **\`synchronized\` blocks/methods**: While inside a synchronized block, the virtual thread cannot unmount. If the code inside blocks on I/O, the carrier thread is blocked too.
2. **Native methods**: JNI calls that block also pin the carrier thread.

\`\`\`java
// This PINS the carrier thread if called from a virtual thread:
synchronized (lock) {
    result = repository.findById(id); // blocking DB call while synchronized
}

// Fix: use ReentrantLock instead of synchronized
private final ReentrantLock lock = new ReentrantLock();
lock.lock();
try {
    result = repository.findById(id);
} finally {
    lock.unlock();
}
\`\`\`

Spring Boot's autoconfigured components (Tomcat, Hikari, Lettuce) are updated to avoid pinning. Third-party libraries may still use \`synchronized\` in ways that cause pinning — monitor with JFR (Java Flight Recorder) if you see carrier threads blocked.`,

'219.2': `# Enabling Virtual Threads in Spring Boot 3.2+

Spring Boot 3.2 added first-class virtual thread support. One configuration property switches Tomcat and \`@Async\` executors to use virtual threads.

## Enabling Virtual Threads

\`\`\`yaml
spring:
  threads:
    virtual:
      enabled: true
\`\`\`

This single property:
1. Replaces Tomcat's thread pool with a virtual-thread-per-request executor
2. Replaces the \`@Async\` task executor with a virtual-thread executor
3. Replaces Spring MVC's \`SimpleAsyncTaskExecutor\` with virtual threads

Requires: Java 21+ and Spring Boot 3.2+.

## Verifying It's Working

\`\`\`java
@RestController
public class DiagnosticController {

    @GetMapping("/api/diagnostic/thread")
    public Map<String, Object> threadInfo() {
        Thread current = Thread.currentThread();
        return Map.of(
            "threadName", current.getName(),
            "isVirtual", current.isVirtual(),
            "threadId", current.threadId()
        );
    }
}
\`\`\`

When virtual threads are enabled, \`isVirtual\` returns \`true\` and the thread name has the pattern \`tomcat-handler-X\`.

## @Async with Virtual Threads

\`@Async\` methods automatically use virtual threads when enabled — no changes to method signatures needed:

\`\`\`java
@Service
public class EmailService {

    @Async
    public CompletableFuture<Void> sendWelcomeEmail(String email, String name) {
        // This now runs on a virtual thread automatically
        emailProvider.send(email, "Welcome " + name, buildWelcomeBody(name));
        return CompletableFuture.completedFuture(null);
    }
}
\`\`\`

## Structured Concurrency Preview

Java 21 includes structured concurrency as a preview feature (JEP 453). It makes running multiple concurrent tasks and collecting their results safe and readable:

\`\`\`java
public OrderSummary buildOrderSummary(UUID orderId) throws InterruptedException {
    try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
        // Fork both tasks — they run concurrently on virtual threads
        StructuredTaskScope.Subtask<ProductDetails> productTask =
            scope.fork(() -> productService.getProductDetails(orderId));

        StructuredTaskScope.Subtask<ShippingInfo> shippingTask =
            scope.fork(() -> shippingService.getShippingInfo(orderId));

        // Wait for both to complete (or either to fail)
        scope.join().throwIfFailed();

        // Both completed successfully — results are available
        return new OrderSummary(productTask.get(), shippingTask.get());
    }
}
\`\`\`

\`ShutdownOnFailure\` cancels the remaining tasks if any one fails. \`ShutdownOnSuccess\` cancels the remaining tasks as soon as one succeeds (useful for racing multiple implementations).

To enable the preview in Spring Boot:

\`\`\`xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-compiler-plugin</artifactId>
    <configuration>
        <compilerArgs>
            <arg>--enable-preview</arg>
        </compilerArgs>
    </configuration>
</plugin>
\`\`\`

## ThreadLocal Considerations

Virtual threads support \`ThreadLocal\`, but they create so many threads that thread-local state grows unbounded if not cleaned up:

\`\`\`java
// PROBLEM: ThreadLocal in virtual threads
static ThreadLocal<RequestContext> context = new ThreadLocal<>();
// With millions of virtual threads, this creates millions of ThreadLocal entries

// BETTER: Use ScopedValue (Java 21 preview) — scoped to a task, not a thread
static final ScopedValue<RequestContext> CONTEXT = ScopedValue.newInstance();

// Set value for a task
ScopedValue.runWhere(CONTEXT, new RequestContext(requestId), () -> {
    processRequest(); // CONTEXT.get() is available here
});
\`\`\`

\`ScopedValue\` is immutable within its scope, doesn't need cleanup, and works correctly with virtual threads and structured concurrency.

## Performance Benchmarking

Compare throughput before and after enabling virtual threads with a simple load test (e.g., using Apache Bench or wrk):

\`\`\`bash
# Without virtual threads (platform threads, pool of 200)
ab -n 10000 -c 500 http://localhost:8080/api/orders

# With virtual threads enabled
ab -n 10000 -c 500 http://localhost:8080/api/orders
\`\`\`

For I/O-bound endpoints that call a database and external API, expect 2–10x improvement in throughput at high concurrency. Endpoints that are purely CPU-bound will show no improvement.

## Database Connection Pool Sizing

With virtual threads, you can handle many more concurrent requests — but your database connection pool still limits concurrency at the DB layer. Hikari's default pool size of 10 becomes a bottleneck:

\`\`\`yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 50   # Increase to match expected concurrent DB operations
      minimum-idle: 10
\`\`\`

Don't set this too high — PostgreSQL has its own \`max_connections\` limit (typically 100–200 for a small instance). Keep the pool size at 50–80% of the DB's max connections.`,

'219.3': `# Structured Concurrency & StructuredTaskScope

Structured concurrency is a programming model that treats a group of concurrent tasks as a single unit of work with a well-defined lifetime. It eliminates an entire class of concurrency bugs: leaked threads, zombie tasks, and inconsistent error handling that plague traditional thread pools.

## The Problem with Unstructured Concurrency

\`\`\`java
// Traditional approach — hard to reason about
ExecutorService executor = Executors.newCachedThreadPool();

Future<User> userFuture = executor.submit(() -> userService.findById(userId));
Future<Orders> orderFuture = executor.submit(() -> orderService.findByUser(userId));

try {
    User user = userFuture.get(5, TimeUnit.SECONDS);
    Orders orders = orderFuture.get(5, TimeUnit.SECONDS);
    return new UserProfile(user, orders);
} catch (Exception e) {
    // Which future failed? Is the other still running?
    // We're leaking a thread if one failed and the other is still running
    throw new RuntimeException(e);
}
\`\`\`

If \`userFuture\` throws an exception, \`orderFuture\` is still running. You need to explicitly cancel it. Easy to forget, easy to get wrong. This leaks threads and can cause subtle bugs.

## StructuredTaskScope.ShutdownOnFailure

The most common scope: if any task fails, all others are cancelled.

\`\`\`java
public UserProfile buildProfile(UUID userId) throws InterruptedException {
    try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {

        Subtask<User> userTask = scope.fork(() -> userService.findById(userId));
        Subtask<List<Order>> ordersTask = scope.fork(() -> orderService.findByUser(userId));
        Subtask<List<Review>> reviewsTask = scope.fork(() -> reviewService.findByUser(userId));

        // Wait for all tasks to complete or any to fail
        scope.join()           // blocks until all done or one fails
             .throwIfFailed(); // throws if any task threw an exception

        // All three completed successfully
        return new UserProfile(userTask.get(), ordersTask.get(), reviewsTask.get());

    } // scope.close() cancels any tasks still running (impossible here after throwIfFailed)
}
\`\`\`

The \`try-with-resources\` block enforces that the scope closes before the method returns. At close time, any still-running tasks are cancelled. No thread leaks — guaranteed by the structure.

## StructuredTaskScope.ShutdownOnSuccess

Returns the first successful result, cancelling the rest. Useful for competing implementations (read from cache, fall back to DB):

\`\`\`java
public Product findProduct(String productId) throws InterruptedException {
    try (var scope = new StructuredTaskScope.ShutdownOnSuccess<Product>()) {

        scope.fork(() -> cacheService.findProduct(productId));  // fast
        scope.fork(() -> databaseService.findProduct(productId)); // fallback

        scope.join(); // waits until one succeeds
        return scope.result(); // returns the first successful result
    }
}
\`\`\`

The winning result is returned; the losing task is cancelled. No need to implement a manual race.

## Nesting Scopes

Structured concurrency composes. A forked task can itself open a scope:

\`\`\`java
public OrderSummary buildSummary(UUID orderId) throws InterruptedException {
    try (var outerScope = new StructuredTaskScope.ShutdownOnFailure()) {

        Subtask<Product> productTask = outerScope.fork(() -> {
            // Inner scope within a forked task
            try (var innerScope = new StructuredTaskScope.ShutdownOnFailure()) {
                Subtask<ProductDetails> details = innerScope.fork(() -> getDetails(orderId));
                Subtask<StockLevel> stock = innerScope.fork(() -> getStock(orderId));
                innerScope.join().throwIfFailed();
                return new Product(details.get(), stock.get());
            }
        });

        Subtask<ShippingInfo> shippingTask = outerScope.fork(() -> getShipping(orderId));

        outerScope.join().throwIfFailed();
        return new OrderSummary(productTask.get(), shippingTask.get());
    }
}
\`\`\`

This nesting is safe: inner scope lifetimes are always shorter than outer scope lifetimes.

## Error Propagation

When \`throwIfFailed()\` is called and a task failed:
- The scope's exception is rethrown at the join point
- The original exception (from the task) is wrapped in an \`ExecutionException\`
- All other running tasks have already been cancelled

\`\`\`java
try {
    scope.join().throwIfFailed();
} catch (ExecutionException e) {
    Throwable cause = e.getCause();
    if (cause instanceof UserNotFoundException) {
        throw (UserNotFoundException) cause;
    }
    throw new RuntimeException("Concurrent task failed", cause);
}
\`\`\`

## Timeout for the Entire Group

\`\`\`java
try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
    Subtask<User> userTask = scope.fork(() -> userService.findById(userId));
    Subtask<Orders> ordersTask = scope.fork(() -> orderService.findByUser(userId));

    scope.joinUntil(Instant.now().plusSeconds(5)); // overall timeout
    scope.throwIfFailed();

    return new Profile(userTask.get(), ordersTask.get());
}
\`\`\`

If either task doesn't complete within 5 seconds, \`joinUntil\` returns and the scope closes, cancelling both. \`throwIfFailed\` then throws because at least one task didn't succeed.

## When to Use Structured Concurrency

Use it when:
- You need to fetch data from 2+ sources concurrently and need all of them
- You want to race 2+ implementations and take the fastest result
- Any failure in the group should abort the rest

Continue using traditional approaches when:
- Tasks are independent and failures should not affect each other (use CompletableFuture chains)
- Long-running background tasks with complex lifecycle management (use dedicated executors)
- You are using Java versions below 21 (use CompletableFuture or reactive libraries)`,
}

export const quiz: Record<string, QuizQuestion[]> = {

'219.1': [
  {
    question: 'What is the key mechanism that allows virtual threads to scale to millions of concurrent operations?',
    options: [
      'Virtual threads use less CPU by running at lower priority than platform threads',
      'When a virtual thread blocks on I/O, the JVM unmounts it from the carrier thread, freeing that carrier thread to run other virtual threads',
      'Virtual threads share memory more efficiently by using copy-on-write semantics',
      'The JVM automatically distributes virtual threads across multiple JVM instances',
    ],
    correctIndex: 1,
    explanation: 'The critical innovation is unmounting: a blocking virtual thread is parked (its stack state saved) and the carrier thread is freed to run another virtual thread. Millions of virtual threads can exist simultaneously because only the few actually executing (not blocking) occupy a carrier thread at any moment.',
  },
  {
    question: 'For which type of workload do virtual threads provide NO improvement over platform threads?',
    options: [
      'REST APIs that call a database',
      'APIs that call multiple external HTTP services',
      'CPU-bound work like image processing or cryptography',
      'Applications with high request concurrency',
    ],
    correctIndex: 2,
    explanation: 'Virtual threads improve throughput for I/O-bound work by keeping carrier threads busy while waiting threads are parked. CPU-bound work never blocks on I/O — the thread is always running. For CPU-bound tasks, the limit is CPU cores, not threads, and virtual threads add overhead without benefit.',
  },
  {
    question: 'What is "thread pinning" in the context of virtual threads?',
    options: [
      'Assigning a virtual thread permanently to a specific carrier thread for its lifetime',
      'A situation where a virtual thread cannot unmount from its carrier thread, typically because it is inside a synchronized block or JNI call',
      'Pinning a virtual thread to a specific CPU core using thread affinity',
      'A JVM optimization that pre-allocates carrier threads for frequently used virtual threads',
    ],
    correctIndex: 1,
    explanation: 'A pinned virtual thread cannot be unmounted from its carrier thread. If it then blocks on I/O, the carrier thread is also blocked — eliminating the benefit of virtual threads for that task. Pinning happens with synchronized blocks (not ReentrantLock) and native/JNI code.',
  },
  {
    question: 'Why should ReentrantLock be preferred over synchronized when using virtual threads?',
    options: [
      'ReentrantLock is faster than synchronized in all scenarios',
      'synchronized pins the virtual thread to its carrier during blocking I/O inside the block, while ReentrantLock allows the virtual thread to unmount and free the carrier',
      'synchronized is deprecated in Java 21 and will be removed in Java 25',
      'ReentrantLock supports virtual threads directly while synchronized does not',
    ],
    correctIndex: 1,
    explanation: 'Inside a synchronized block, the virtual thread is pinned and cannot unmount even during blocking I/O. ReentrantLock is a standard Java lock that doesn\'t trigger pinning. When Java code uses ReentrantLock, virtual threads can unmount normally during any blocking call inside the lock.',
  },
  {
    question: 'A Spring Boot REST endpoint that calls a database (5ms) and an external API (50ms) is handling 10,000 concurrent requests. Why do virtual threads significantly improve this scenario?',
    options: [
      'Virtual threads batch database calls to reduce round trips',
      'With platform threads (limited pool), most requests queue waiting for a thread. Virtual threads allow 10,000 concurrent virtual threads; while one waits for the DB, the carrier thread runs others — increasing throughput without adding memory',
      'Virtual threads cache database responses automatically',
      'Virtual threads run at higher OS priority, getting more CPU time',
    ],
    correctIndex: 1,
    explanation: 'With 200 platform threads and 10,000 concurrent requests, 9,800 requests queue. Each thread is idle for 55ms of the 55ms request processing time (waiting for I/O). Virtual threads let all 10,000 proceed "concurrently" — 8 carrier threads serve all of them because at any moment only a few are actually executing.',
  },
],

'219.2': [
  {
    question: 'What does setting spring.threads.virtual.enabled=true do in Spring Boot 3.2+?',
    options: [
      'Creates a pool of virtual threads at startup for reuse across requests',
      'Replaces Tomcat\'s thread pool with a virtual-thread-per-request executor and updates @Async to use virtual threads — requiring no other code changes',
      'Enables virtual thread support only for @Async methods, not for HTTP request handling',
      'Sets the JVM flag --enable-preview to unlock virtual thread features',
    ],
    correctIndex: 1,
    explanation: 'The single property wires Spring Boot\'s autoconfiguration to use virtual threads at multiple layers: Tomcat\'s connector (each request gets its own virtual thread), the @Async executor, and Spring MVC\'s task executor. Application code does not need to change.',
  },
  {
    question: 'Why is Hikari connection pool sizing more important after enabling virtual threads?',
    options: [
      'Virtual threads bypass Hikari and create direct database connections',
      'More concurrent requests can now reach the pool simultaneously — if the pool is too small (e.g., 10), most requests will wait for a connection, negating the throughput gain',
      'Hikari must be replaced with a virtual-thread-aware pool when using virtual threads',
      'Virtual threads reduce connection pool efficiency because they context-switch too frequently',
    ],
    correctIndex: 1,
    explanation: 'Virtual threads allow many more concurrent requests to reach the database layer. With a pool of 10, 1000 concurrent requests all queue waiting for one of 10 connections. The bottleneck moves from Tomcat threads to DB connections. Increase the pool size (but within PostgreSQL\'s max_connections limit).',
  },
  {
    question: 'What is the advantage of ScopedValue over ThreadLocal when using virtual threads?',
    options: [
      'ScopedValue is faster because it uses less memory per value',
      'ThreadLocal values persist for the thread\'s lifetime and can leak with millions of virtual threads; ScopedValue is immutable, scoped to a task\'s lifetime, and automatically cleaned up',
      'ScopedValue supports serialization while ThreadLocal does not',
      'ThreadLocal does not work with virtual threads due to JVM restrictions',
    ],
    correctIndex: 1,
    explanation: 'With millions of short-lived virtual threads, each with a ThreadLocal, entries can accumulate faster than they are cleaned up. ThreadLocal values are only removed when Thread.remove() is called or the thread terminates — which may take time with a virtual-thread-per-task executor. ScopedValue is automatically cleaned up when its scope exits.',
  },
  {
    question: 'How can you verify at runtime that a specific request is being handled by a virtual thread?',
    options: [
      'Call VirtualThreadManager.isEnabled() from the Spring context',
      'Call Thread.currentThread().isVirtual() — returns true if the current thread is a virtual thread',
      'Check the thread name — virtual threads always start with "vt-"',
      'Use @ConditionalOnVirtualThreads to inject a verification bean',
    ],
    correctIndex: 1,
    explanation: 'Thread.isVirtual() was added in Java 21 specifically to allow code to detect whether it is running on a virtual thread. Thread.currentThread().isVirtual() returns true for virtual threads. This is useful for diagnostics endpoints and tests that verify virtual thread configuration.',
  },
  {
    question: 'StructuredTaskScope.ShutdownOnFailure and ShutdownOnSuccess represent which two common concurrent patterns?',
    options: [
      'Parallel map and parallel reduce',
      'ShutdownOnFailure: run all tasks, fail if any fail (fan-out/all-of). ShutdownOnSuccess: race tasks, succeed when the first succeeds (racing/any-of)',
      'ShutdownOnFailure: sequential fallback. ShutdownOnSuccess: parallel retry',
      'ShutdownOnFailure: read/write locking. ShutdownOnSuccess: optimistic concurrency',
    ],
    correctIndex: 1,
    explanation: 'ShutdownOnFailure is analogous to CompletableFuture.allOf() — all tasks must succeed. ShutdownOnSuccess is analogous to CompletableFuture.anyOf() — the first success wins and the others are cancelled. These two policies cover the majority of concurrent fan-out use cases.',
  },
],

'219.3': [
  {
    question: 'What guarantee does structured concurrency provide that traditional ExecutorService does not?',
    options: [
      'Structured concurrency is faster because tasks share a carrier thread',
      'A scope\'s child tasks cannot outlive the scope — when the scope closes, all tasks are cancelled, preventing thread leaks and ensuring the parent task sees all outcomes before proceeding',
      'Structured concurrency automatically retries failed tasks',
      'Tasks in a structured scope share the same ThreadLocal context',
    ],
    correctIndex: 1,
    explanation: 'With ExecutorService, a Future that throws an exception leaves other submitted tasks running — leaked threads. StructuredTaskScope enforces that all forked tasks complete (or are cancelled) before the scope closes. The try-with-resources pattern makes this guarantee visible and compile-enforced.',
  },
  {
    question: 'When should you use ShutdownOnSuccess instead of ShutdownOnFailure?',
    options: [
      'When you want tasks to continue even after one fails',
      'When you have multiple implementations that can produce the same result and you want the fastest one — the first success wins and the rest are cancelled',
      'When you want to collect the results of all successful tasks and ignore failures',
      'ShutdownOnSuccess should never be used — it wastes resources by running redundant tasks',
    ],
    correctIndex: 1,
    explanation: 'ShutdownOnSuccess races multiple strategies and takes the first winner. Classic use case: try Redis cache first, simultaneously try the database, use whichever returns first. In practice the cache wins almost always; the DB task is cancelled immediately after. No fallback logic needed.',
  },
  {
    question: 'What happens to a still-running forked task when StructuredTaskScope.close() is called?',
    options: [
      'The task continues running until it completes naturally',
      'The task is cancelled via Thread.interrupt() — it receives an InterruptedException on its next blocking operation',
      'The task\'s result is discarded but it continues to its natural completion',
      'An IllegalStateException is thrown if any task is still running at close time',
    ],
    correctIndex: 1,
    explanation: 'Structured concurrency uses thread interruption to cancel running tasks. When close() is called (e.g., after ShutdownOnFailure detects a failure), still-running tasks have their carrier virtual thread interrupted. Well-behaved code handles InterruptedException by stopping promptly.',
  },
  {
    question: 'How does joinUntil(Instant deadline) differ from join() in StructuredTaskScope?',
    options: [
      'joinUntil() cancels tasks that miss the deadline; join() waits forever',
      'joinUntil() applies a timeout to the entire scope — if the deadline passes before all tasks complete, it returns and subsequent throwIfFailed() sees the incomplete tasks as failures',
      'joinUntil() only waits for the first task to complete; join() waits for all',
      'There is no difference — joinUntil() is an alias for join() with a timeout parameter',
    ],
    correctIndex: 1,
    explanation: 'joinUntil(deadline) allows you to set a wall-clock deadline for the entire group of concurrent tasks. After the deadline, joinUntil() returns regardless of task status. Tasks that did not complete are in a non-terminal state, and throwIfFailed() will treat them as failures, cancelling any still-running.',
  },
  {
    question: 'Why is the pattern of forking tasks inside a try-with-resources StructuredTaskScope block significant?',
    options: [
      'try-with-resources allocates memory for all tasks upfront',
      'It makes the scope\'s lifetime lexically visible in the code — the scope closes when the block exits, guaranteeing structured lifetimes that are enforceable by code review and tools',
      'try-with-resources enables the scope to use off-heap memory for task stacks',
      'It is a convention — StructuredTaskScope works identically without try-with-resources',
    ],
    correctIndex: 1,
    explanation: 'The "structured" in structured concurrency refers to tasks whose lifetimes are nested within the scope that created them, just as structured control flow (loops, if-blocks) is nested within the method that contains it. try-with-resources enforces this nesting visually and mechanically — the scope cannot escape the block.',
  },
],
}

export const codingTask: Record<string, {
  instructions: string; boilerplate: string; rubric: string[]; hints: string[]
}> = {

'219.2': {
  instructions: `Implement a \`ProductAggregationService\` that fetches product details from three separate services concurrently using \`StructuredTaskScope.ShutdownOnFailure\`.

The service must:
1. Concurrently fetch:
   - \`ProductDetails\` from \`ProductDetailsService.getDetails(productId)\`
   - \`StockLevel\` from \`InventoryService.getStockLevel(productId)\`
   - \`List<Review>\` from \`ReviewService.getReviews(productId)\`
2. Return a \`ProductAggregate(details, stockLevel, reviews)\` combining all three results.
3. Apply a 5-second overall deadline using \`joinUntil()\`.
4. Throw \`ProductAggregationException\` if any task fails or the deadline is exceeded.

Use \`StructuredTaskScope.ShutdownOnFailure\` and the try-with-resources pattern.`,
  boilerplate: `package com.example.service;

import com.example.dto.ProductAggregate;
import com.example.dto.ProductDetails;
import com.example.dto.StockLevel;
import com.example.dto.Review;
import com.example.exception.ProductAggregationException;
import jdk.incubator.concurrent.StructuredTaskScope;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.concurrent.ExecutionException;

@Service
public class ProductAggregationService {

    private final ProductDetailsService productDetailsService;
    private final InventoryService inventoryService;
    private final ReviewService reviewService;

    public ProductAggregationService(ProductDetailsService productDetailsService,
                                      InventoryService inventoryService,
                                      ReviewService reviewService) {
        this.productDetailsService = productDetailsService;
        this.inventoryService = inventoryService;
        this.reviewService = reviewService;
    }

    public ProductAggregate aggregate(String productId) {
        // TODO: Open a StructuredTaskScope.ShutdownOnFailure with try-with-resources
        // TODO: Fork three tasks:
        //   - productDetailsService.getDetails(productId)
        //   - inventoryService.getStockLevel(productId)
        //   - reviewService.getReviews(productId)
        // TODO: Call scope.joinUntil(Instant.now().plusSeconds(5))
        // TODO: Call scope.throwIfFailed()
        // TODO: Return new ProductAggregate(detailsTask.get(), stockTask.get(), reviewsTask.get())
        // TODO: Catch InterruptedException and ExecutionException, wrap in ProductAggregationException
        return null;
    }
}`,
  rubric: [
    'try (var scope = new StructuredTaskScope.ShutdownOnFailure()) is used',
    'Three scope.fork(() -> ...) calls are made for the three services',
    'scope.joinUntil(Instant.now().plusSeconds(5)) is called (not scope.join())',
    'scope.throwIfFailed() is called after joinUntil()',
    'new ProductAggregate(detailsTask.get(), stockTask.get(), reviewsTask.get()) constructs the result',
    'InterruptedException is caught and wrapped in ProductAggregationException',
    'ExecutionException is caught and wrapped in ProductAggregationException',
  ],
  hints: [
    'try (var scope = new StructuredTaskScope.ShutdownOnFailure()) { ... }',
    'StructuredTaskScope.Subtask<ProductDetails> detailsTask = scope.fork(() -> productDetailsService.getDetails(productId))',
    'scope.joinUntil(Instant.now().plusSeconds(5)).throwIfFailed()',
    'return new ProductAggregate(detailsTask.get(), stockTask.get(), reviewsTask.get())',
    'catch (InterruptedException | ExecutionException e) { throw new ProductAggregationException("Failed to aggregate product data", e); }',
  ],
},
}
