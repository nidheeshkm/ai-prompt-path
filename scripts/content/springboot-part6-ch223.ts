// Part VI — Spring AI + RAG + AI Security
// Chapter 223: Spring AI Agents & Tool Calling

import type { QuizQuestion } from '../../src/data/curriculum'

export const courseId = 'springboot-ai-architect'

export const content: Record<string, string> = {

'223.1': `# Tool Calling — Giving the LLM Capabilities

Tool calling (also called function calling) lets the LLM invoke Java methods during a conversation. Instead of the model making up answers about your live data, it can ask your application to fetch the real data — and the application answers.

## Why Tool Calling Changes Everything

Without tools, an LLM can only reason over:
- Its training data (static, possibly outdated)
- The content of the current prompt (whatever you included)

With tools, the LLM can:
- Look up current order status from your database
- Check real-time inventory levels via your API
- Send emails, create tickets, update records
- Call external services (weather, payment, maps)

The LLM decides when to call a tool and with what arguments — you define which tools are available and what they do.

## The @Tool Annotation

Spring AI's \`@Tool\` annotation marks a method as callable by the LLM:

\`\`\`java
@Service
public class OrderTools {

    private final OrderRepository orderRepo;
    private final InventoryService inventoryService;

    @Tool(description = "Look up an order by its ID. Returns order status, items, and delivery estimate.")
    public OrderInfo getOrder(String orderId) {
        return orderRepo.findById(orderId)
            .map(o -> new OrderInfo(o.getId(), o.getStatus(), o.getItems(), o.getExpectedDelivery()))
            .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));
    }

    @Tool(description = "Check the current inventory level for a product SKU.")
    public InventoryStatus checkInventory(String sku) {
        int quantity = inventoryService.getAvailableQuantity(sku);
        return new InventoryStatus(sku, quantity, quantity > 0 ? "in-stock" : "out-of-stock");
    }

    @Tool(description = "Cancel an order by ID. Only works for orders in PENDING status.")
    public CancellationResult cancelOrder(String orderId, String reason) {
        Order order = orderRepo.findById(orderId)
            .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));
        if (!order.getStatus().equals(OrderStatus.PENDING)) {
            return new CancellationResult(false, "Cannot cancel order in " + order.getStatus() + " status");
        }
        order.cancel(reason);
        orderRepo.save(order);
        return new CancellationResult(true, "Order cancelled successfully");
    }
}
\`\`\`

## Registering Tools with ChatClient

\`\`\`java
@Bean
public ChatClient orderAssistantClient(ChatClient.Builder builder, OrderTools orderTools) {
    return builder
        .defaultSystem("""
            You are an order management assistant.
            Help customers check order status, verify inventory, and cancel orders when requested.
            Always confirm details before taking irreversible actions like cancellation.
            """)
        .defaultTools(orderTools)  // registers all @Tool methods on the bean
        .build();
}
\`\`\`

Or register tools per-request for dynamic tool sets:

\`\`\`java
String response = chatClient.prompt()
    .user(userMessage)
    .tools(orderTools, paymentTools)  // only these tools for this request
    .call()
    .content();
\`\`\`

## How Tool Calling Works Internally

1. **Tool registration** — Spring AI inspects \`@Tool\` methods, builds JSON schemas for their parameters
2. **First LLM call** — prompt + tool schemas sent to the model
3. **Tool decision** — model returns a "tool_call" response: \`{"function": "getOrder", "arguments": {"orderId": "ORD-123"}}\`
4. **Tool execution** — Spring AI invokes \`getOrder("ORD-123")\` on your bean
5. **Result injection** — the tool's return value is serialized to JSON and sent back to the model
6. **Second LLM call** — model receives the tool result and generates the final answer

This loop can repeat multiple times if the model needs to call multiple tools.

## Tool Parameter Descriptions

Good descriptions dramatically improve tool selection accuracy:

\`\`\`java
@Tool(description = "Search products by name, category, or SKU. Returns up to 10 matching products with prices.")
public List<Product> searchProducts(
        @ToolParam(description = "Product name, partial name, or SKU to search for") String query,
        @ToolParam(description = "Optional category filter. Valid values: ELECTRONICS, CLOTHING, BOOKS, HOME") String category,
        @ToolParam(description = "Maximum price in USD. Omit to include all prices") Double maxPrice
) {
    return productService.search(query, category, maxPrice);
}
\`\`\`

\`@ToolParam\` annotations translate directly into the JSON schema description sent to the LLM, helping it understand what each parameter means and when to provide it.

## Tool Return Types

Tools can return any JSON-serializable Java type:

\`\`\`java
// Return a record — Spring AI serializes it to JSON
public record ProductInfo(String sku, String name, double price, boolean inStock) {}

// Return a primitive or String — returned as-is
@Tool public String getCurrentTime() { return Instant.now().toString(); }

// Return a List — serialized to JSON array
@Tool public List<ProductInfo> getTopSellers() { ... }

// Return void for side-effect-only tools
@Tool(description = "Send a notification email to the customer")
public void sendNotification(String customerId, String message) {
    notificationService.send(customerId, message);
}
\`\`\``,

'223.2': `# Conversation Memory & Session Management

LLMs are stateless — each API call is independent with no memory of prior calls. For a useful assistant, you need to manage conversation history explicitly and pass it with each request. Spring AI's \`ChatMemory\` abstraction handles this.

## ChatMemory Implementations

\`\`\`java
// In-memory: simple, lost on restart, not shared across instances
ChatMemory memory = new InMemoryChatMemory();

// Custom: implement ChatMemory interface for Redis, PostgreSQL, etc.
public class RedisChatMemory implements ChatMemory {

    private final RedisTemplate<String, String> redis;
    private final ObjectMapper objectMapper;
    private static final int MAX_MESSAGES = 20;

    @Override
    public void add(String conversationId, List<Message> messages) {
        String key = "chat:memory:" + conversationId;
        messages.forEach(msg -> {
            try {
                redis.opsForList().rightPush(key, objectMapper.writeValueAsString(msg));
            } catch (JsonProcessingException e) { throw new RuntimeException(e); }
        });
        redis.opsForList().trim(key, -MAX_MESSAGES, -1); // keep last N messages
        redis.expire(key, Duration.ofHours(24));
    }

    @Override
    public List<Message> get(String conversationId, int lastN) {
        String key = "chat:memory:" + conversationId;
        List<String> raw = redis.opsForList().range(key, -lastN, -1);
        if (raw == null) return List.of();
        return raw.stream()
            .map(this::deserialize)
            .toList();
    }

    @Override
    public void clear(String conversationId) {
        redis.delete("chat:memory:" + conversationId);
    }
}
\`\`\`

## Using MessageChatMemoryAdvisor

\`\`\`java
@RestController
@RequiredArgsConstructor
public class ConversationalController {

    private final ChatClient chatClient;

    @PostMapping("/api/chat")
    public String chat(
            @RequestBody ChatRequest request,
            @RequestHeader("X-Conversation-Id") String conversationId) {
        return chatClient.prompt()
            .user(request.message())
            .advisors(a -> a.param(
                MessageChatMemoryAdvisor.CHAT_MEMORY_CONVERSATION_ID_KEY, conversationId))
            .call()
            .content();
    }
}
\`\`\`

The conversation ID is supplied per-request. In practice, this comes from:
- A UUID generated on the first message and stored in the browser's localStorage
- A session token from the user's JWT
- A database-generated conversation entity ID

## Conversation Windowing

LLM context windows are finite. You cannot include the entire conversation history for long sessions. Spring AI's \`MessageWindowChatMemory\` automatically trims old messages:

\`\`\`java
@Bean
public ChatClient chatClientWithWindowMemory(ChatClient.Builder builder) {
    ChatMemory memory = MessageWindowChatMemory.builder()
        .chatMemory(new InMemoryChatMemory())
        .maxMessages(10)   // keep last 10 messages (5 user + 5 assistant turns)
        .build();

    return builder
        .defaultAdvisors(new MessageChatMemoryAdvisor(memory))
        .build();
}
\`\`\`

## Conversation Management API

Expose conversation management endpoints:

\`\`\`java
@RestController
@RequestMapping("/api/conversations")
@RequiredArgsConstructor
public class ConversationController {

    private final ChatMemory chatMemory;

    @DeleteMapping("/{conversationId}")
    public ResponseEntity<Void> clearConversation(@PathVariable String conversationId,
                                                   @AuthenticationPrincipal Jwt jwt) {
        // Verify the conversation belongs to the requesting user
        validateConversationOwnership(conversationId, jwt.getSubject());
        chatMemory.clear(conversationId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{conversationId}/messages")
    public List<MessageDto> getHistory(@PathVariable String conversationId,
                                        @AuthenticationPrincipal Jwt jwt) {
        validateConversationOwnership(conversationId, jwt.getSubject());
        return chatMemory.get(conversationId, 50).stream()
            .map(MessageDto::from)
            .toList();
    }
}
\`\`\`

## Persisting Conversation Metadata

Conversations need more than just messages — they need titles, timestamps, and user ownership:

\`\`\`java
@Entity
public class Conversation {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    private String userId;
    private String title;
    private Instant createdAt;
    private Instant lastMessageAt;

    @Column(name = "message_count")
    private int messageCount;
}
\`\`\`

Auto-title a conversation from its first message:

\`\`\`java
public String createTitle(String firstMessage) {
    return chatClient.prompt()
        .system("Generate a 3-5 word title summarizing this conversation starter. Return only the title, no quotes.")
        .user(firstMessage)
        .options(OpenAiChatOptions.builder().withMaxTokens(20).build())
        .call()
        .content()
        .trim();
}
\`\`\``,

'223.3': `# Building an Agentic Loop

An agent is an LLM that can take multi-step actions to complete a goal — calling tools in sequence, observing results, and deciding what to do next. Spring AI supports this with its built-in agentic loop.

## What Makes an LLM "Agentic"?

An agentic system has:
1. **A goal** — a complex task expressed in natural language
2. **Tools** — capabilities to take action in the world (search, write, read, compute)
3. **A loop** — the model reasons, acts, observes results, reasons again
4. **Termination** — the loop ends when the goal is achieved or the model decides it cannot proceed

## Spring AI's Agentic Tool Execution

When a ChatClient has tools and the model decides to call one, Spring AI automatically handles the tool execution loop:

\`\`\`
User message → Model decides to use tool A
                → Spring AI executes tool A
                → Result sent back to model
                → Model decides to use tool B
                → Spring AI executes tool B
                → Result sent back to model
                → Model generates final answer
                → Spring AI returns answer to you
\`\`\`

This loop is automatic — you don't write it. Spring AI handles:
- Multiple rounds of tool calls
- Passing tool results back to the model correctly
- Terminating when the model produces a text response

## A Complete Agent Example

\`\`\`java
@Service
@RequiredArgsConstructor
public class ResearchAgentService {

    private final ChatClient agentClient;

    public String research(String topic) {
        return agentClient.prompt()
            .user("Research the following topic and provide a comprehensive summary: " + topic)
            .call()
            .content();
    }
}

// The tools the agent can use
@Service
public class ResearchTools {

    @Tool(description = "Search the web for information on a topic. Returns top 5 search results with titles and snippets.")
    public List<SearchResult> webSearch(String query) {
        return searchService.search(query);
    }

    @Tool(description = "Fetch and read the content of a web page by URL.")
    public String fetchWebPage(String url) {
        return webScraperService.fetch(url);
    }

    @Tool(description = "Save a note or finding for later reference.")
    public void saveNote(String title, String content) {
        noteRepository.save(new Note(title, content));
    }

    @Tool(description = "Retrieve all saved notes for this research session.")
    public List<Note> getNotes() {
        return noteRepository.findAll();
    }
}
\`\`\`

## Controlling Agent Behavior — Max Tool Calls

Prevent infinite loops by setting a maximum number of tool call iterations:

\`\`\`java
@Bean
public ChatClient agentClient(ChatClient.Builder builder, ResearchTools tools) {
    return builder
        .defaultSystem("""
            You are a research assistant. Use available tools to gather information.
            Research systematically:
            1. Search for broad overview
            2. Fetch key sources in full
            3. Save important findings as notes
            4. Synthesize notes into a final summary
            Stop when you have enough information for a thorough summary.
            """)
        .defaultTools(tools)
        .defaultOptions(OpenAiChatOptions.builder()
            .withParallelToolCalls(false)  // sequential tool execution (safer)
            .build())
        .build();
}
\`\`\`

## Human-in-the-Loop

For high-stakes actions (sending emails, processing payments), require human confirmation before execution:

\`\`\`java
@Tool(description = "Send an email to a customer. Requires confirmation.")
public EmailResult sendEmail(String to, String subject, String body) {
    // Create a pending action that needs approval
    PendingAction pending = pendingActionRepository.save(
        new PendingAction("SEND_EMAIL", Map.of("to", to, "subject", subject, "body", body))
    );

    // Return a message asking for confirmation instead of sending immediately
    return new EmailResult(
        false,
        "Email prepared but not sent. Pending action ID: " + pending.getId() +
        ". Please confirm before sending."
    );
}

// Separate approval endpoint
@PostMapping("/api/actions/{actionId}/approve")
public ActionResult approveAction(@PathVariable String actionId,
                                   @AuthenticationPrincipal Jwt jwt) {
    PendingAction action = pendingActionRepository.findById(actionId)
        .orElseThrow();
    emailService.send(action.getParams());
    action.setApproved(true);
    pendingActionRepository.save(action);
    return new ActionResult(true, "Email sent successfully");
}
\`\`\`

## Parallel Tool Calls

Some models (GPT-4o, Claude 3.5) support calling multiple tools simultaneously:

\`\`\`java
// GPT-4o may call these tools in parallel when both are needed:
// getInventory("SKU-123") and getPrice("SKU-123")
// Spring AI handles parallel results correctly

.defaultOptions(OpenAiChatOptions.builder()
    .withParallelToolCalls(true)  // enable parallel execution
    .build())
\`\`\`

Parallel tool calls reduce latency when the model needs multiple independent data points.

## Agent Observability

Track what your agents are doing:

\`\`\`java
@Aspect
@Component
public class ToolCallAuditAspect {

    private final AuditLogRepository auditLog;
    private final MeterRegistry meterRegistry;

    @Around("@annotation(org.springframework.ai.tool.annotation.Tool)")
    public Object auditToolCall(ProceedingJoinPoint pjp) throws Throwable {
        String toolName = pjp.getSignature().getName();
        long start = System.currentTimeMillis();

        try {
            Object result = pjp.proceed();
            long duration = System.currentTimeMillis() - start;
            meterRegistry.timer("ai.tool.call", "tool", toolName, "outcome", "success")
                .record(duration, TimeUnit.MILLISECONDS);
            auditLog.save(new AuditEntry(toolName, pjp.getArgs(), result, duration));
            return result;
        } catch (Exception e) {
            meterRegistry.counter("ai.tool.call.error", "tool", toolName).increment();
            throw e;
        }
    }
}
\`\`\``,
}

export const quiz: Record<string, QuizQuestion[]> = {

'223.1': [
  {
    question: 'What is tool calling in the context of Spring AI, and what problem does it solve?',
    options: [
      'Tool calling is the process of loading Spring beans required by the ChatClient',
      'Tool calling lets the LLM invoke Java methods during a conversation, solving the problem of the model being limited to its training data — it can now request real-time data from your application',
      'Tool calling enables parallel processing of multiple LLM requests simultaneously',
      'Tool calling allows the LLM to edit Java source files based on user instructions',
    ],
    correctIndex: 1,
    explanation: 'LLMs are frozen at their training cutoff. Without tools, a question like "What is the status of order ORD-456?" gets a hallucinated answer. With tool calling, the LLM can invoke your getOrder("ORD-456") method, receive the real database result, and answer accurately. Tool calling bridges the LLM\'s reasoning capability with your application\'s live data and actions.',
  },
  {
    question: 'What does Spring AI do internally when an LLM decides to call a tool?',
    options: [
      'Spring AI sends a webhook to the LLM provider and waits for it to call your endpoint',
      'Spring AI sends the tool schemas to the LLM, receives a tool_call response with function name and arguments, executes the Java method with those arguments, then sends the result back to the LLM for it to generate the final answer',
      'Spring AI generates synthetic results for tool calls to avoid round-trips to the database',
      'Spring AI executes all registered tools and lets the LLM choose which result to use',
    ],
    correctIndex: 1,
    explanation: 'The tool calling protocol is a multi-step exchange: (1) You send prompt + tool schemas. (2) The model responds with a tool_call instead of text. (3) Spring AI executes the Java method. (4) Spring AI sends the result back to the model in a "tool" message role. (5) The model generates its final text answer incorporating the tool result. This loop can repeat for multiple tool calls.',
  },
  {
    question: 'Why are descriptions critical for @Tool methods and @ToolParam annotations?',
    options: [
      'Descriptions are required by the Java compiler — Spring AI will fail to start without them',
      'Descriptions are converted to JSON schema and sent to the LLM — the LLM reads them to decide which tool to call and what arguments to pass, so vague descriptions lead to incorrect tool selection',
      'Descriptions are displayed to users when they hover over the AI assistant interface',
      'Descriptions are used by Spring\'s dependency injection to find the right tool bean',
    ],
    correctIndex: 1,
    explanation: 'The LLM\'s tool selection is guided entirely by the JSON schema it receives. A tool described as "gets data" is ambiguous — should the model call it for inventory data? order data? weather data? A precise description like "Check the current inventory level for a product SKU. Returns quantity available and in-stock status" tells the model exactly when and how to use the tool. Invest time in descriptions — they are the most impactful input to tool-call accuracy.',
  },
  {
    question: 'What happens when a @Tool method throws an exception?',
    options: [
      'Spring AI catches the exception and returns a default empty result to the model',
      'The exception propagates through Spring AI — unless caught in the tool method itself, it terminates the agent loop and surfaces as an error to the caller',
      'Spring AI automatically retries the tool call up to 3 times before failing',
      'The LLM automatically tries a different tool when one throws an exception',
    ],
    correctIndex: 1,
    explanation: 'Tool methods should handle expected errors gracefully by returning a result object that includes error information (e.g., CancellationResult(false, "Cannot cancel: order already shipped")). Unexpected exceptions (database unavailable, NullPointerException) should propagate — they represent bugs or infrastructure failures, not valid tool responses. Catching all exceptions and returning empty results hides real problems.',
  },
  {
    question: 'When should you use .defaultTools() on the ChatClient builder versus .tools() on the per-request prompt?',
    options: [
      'Use .defaultTools() for tools that require database access; .tools() for tools that call external APIs',
      'Use .defaultTools() for tools that should be available on every request (the assistant always needs them); use .tools() for dynamic, per-request tool sets based on user permissions or context',
      'Both are equivalent — .tools() is just a shorter alias for .defaultTools()',
      'Use .defaultTools() for read-only tools and .tools() for write/mutation tools',
    ],
    correctIndex: 1,
    explanation: 'An order assistant always needs getOrder() and checkInventory(), so these are defaultTools. But if your application has admin tools that only privileged users can trigger, you compute the available tools based on the user\'s JWT claims and pass them per-request with .tools(). This prevents the LLM from even knowing admin tools exist for non-admin users — security by tool invisibility.',
  },
],

'223.2': [
  {
    question: 'Why do LLMs require explicit conversation history management for multi-turn interactions?',
    options: [
      'LLMs store conversation history internally but access it only for paying customers',
      'LLMs are stateless — each API call receives no memory of prior calls. Conversation history must be maintained by the application and included in every subsequent request',
      'LLMs maintain conversation history for 5 minutes, then it expires automatically',
      'Spring AI\'s LLM providers maintain session state via cookies sent with each request',
    ],
    correctIndex: 1,
    explanation: 'LLM APIs are fundamentally stateless HTTP endpoints — the provider keeps no memory of your calls. Each request is independent. If you ask "Who was the first president?" then "When was he born?", the second request has no idea what "he" refers to unless you include the first turn in the second request\'s messages array. MessageChatMemoryAdvisor automates this — it prepends prior turns before each API call.',
  },
  {
    question: 'What is the risk of not applying a MessageWindowChatMemory limit in a long-running conversation?',
    options: [
      'The database runs out of storage for chat history records',
      'The accumulated conversation history eventually exceeds the model\'s context window token limit, causing the request to fail with an error or the model to silently drop early messages',
      'Spring AI throws an OutOfMemoryError when InMemoryChatMemory grows too large',
      'The LLM provider bills per-message, so costs grow exponentially with conversation length',
    ],
    correctIndex: 1,
    explanation: 'Every LLM has a context window (e.g., 128K tokens for GPT-4o). Sending the entire conversation history for every turn means long conversations eventually hit this limit. MessageWindowChatMemory (maxMessages: 10) keeps only the most recent N messages, ensuring the prompt stays within bounds. Some important context from early in the conversation is lost, but the alternative — a failed API call — is worse.',
  },
  {
    question: 'Where should a conversation ID come from in a web application using Spring AI?',
    options: [
      'Spring AI generates and manages conversation IDs automatically through the session',
      'The client (browser) generates or stores a UUID per conversation, sends it as a header (X-Conversation-Id), and the server uses it as the ChatMemory key — this ties the conversation to the client session',
      'The conversation ID must be a database primary key generated by a Conversation entity',
      'The LLM provider assigns a conversation ID returned in the first response\'s headers',
    ],
    correctIndex: 1,
    explanation: 'The server is stateless (scaled across instances). The conversation ID must come from the client or be derivable from durable server state. Common patterns: (1) Browser generates a UUID on first message, stores it in localStorage, sends it as a header. (2) Server creates a Conversation entity when a new chat starts, returns its ID, client sends it back. Either way, the ID is the key to ChatMemory storage.',
  },
  {
    question: 'What does auto-titling a conversation with the LLM improve in a chat application?',
    options: [
      'It reduces the number of tokens in subsequent conversation turns',
      'It gives users a recognizable label for each conversation in their history list ("Order ORD-456 issue" vs "Conversation 1"), improving usability when users have many past conversations',
      'It enables Spring AI to route subsequent messages to the most relevant ChatClient',
      'It allows the LLM to maintain better context by summarizing the conversation topic',
    ],
    correctIndex: 1,
    explanation: 'Auto-titling is a UX feature, not a technical requirement. When users have dozens of past conversations, a generic "Conversation 1" label is useless — "Laptop return request" or "Q3 earnings report analysis" lets them find and continue prior conversations. The title is generated from the first user message using a short, cheap LLM call (maxTokens: 20) — minimal cost for significant UX improvement.',
  },
  {
    question: 'Why would you implement a Redis-backed ChatMemory instead of InMemoryChatMemory?',
    options: [
      'Redis is faster than Java heap memory, reducing latency for memory operations',
      'InMemoryChatMemory is lost when the server restarts or when the application scales to multiple instances — Redis provides shared, persistent memory that survives restarts and works correctly across replicas',
      'Spring AI requires Redis for production deployments per its licensing terms',
      'InMemoryChatMemory has a hard limit of 100 conversations; Redis is unlimited',
    ],
    correctIndex: 1,
    explanation: 'InMemoryChatMemory is per-JVM-instance and volatile. In production, your app restarts during deployments and scales horizontally. User 1 may send message 1 to instance A and message 2 to instance B — instance B knows nothing of message 1. Redis as a shared, persistent store fixes both problems: conversations survive restarts and are accessible from any application instance.',
  },
],

'223.3': [
  {
    question: 'What distinguishes an agentic LLM interaction from a simple prompt-response interaction?',
    options: [
      'Agentic interactions use a larger, more capable model than simple interactions',
      'Agentic interactions involve a loop where the model takes actions (tool calls), observes results, reasons about next steps, and repeats until the goal is achieved — not a single prompt and response',
      'Agentic interactions require custom hardware acceleration to run in production',
      'Agentic interactions use streaming output while simple interactions use blocking calls',
    ],
    correctIndex: 1,
    explanation: 'A simple interaction is stateless: prompt in, answer out. An agentic loop is stateful: goal in, then (call tool → observe result → reason → repeat) until the model decides the goal is complete or it\'s stuck. Research agents may call 10+ tools across multiple rounds before synthesizing a final answer. Spring AI handles this loop automatically when you provide tools — the model decides the stopping condition.',
  },
  {
    question: 'What is the human-in-the-loop pattern and when should it be applied in agentic AI systems?',
    options: [
      'Human-in-the-loop means a human reviews every LLM response before it is shown to the user',
      'For high-stakes, irreversible actions (sending emails, processing payments, deleting data), the agent pauses and requests explicit human approval before executing — preventing costly AI mistakes',
      'Human-in-the-loop is required by law for all financial AI applications',
      'It means displaying a CAPTCHA to verify the user is human before the agent acts',
    ],
    correctIndex: 1,
    explanation: 'Agents can make mistakes — misinterpret intent, call the wrong tool, or act on ambiguous instructions. For reversible read operations (checking inventory), the cost of a mistake is low. For irreversible write operations (sending an email to 1000 customers, processing a $50,000 refund), the cost of a mistake is high. Human-in-the-loop gates irreversible actions behind an explicit confirmation step, turning the agent from an autonomous actor into an autonomous preparer.',
  },
  {
    question: 'Why is observability (metrics and audit logging) particularly important for AI agents?',
    options: [
      'AI agents are slower than regular code, so metrics help identify performance bottlenecks',
      'Agents make dynamic decisions that are hard to predict — audit logs show which tools were called with what arguments, enabling debugging, compliance, cost attribution, and detection of unexpected behaviors',
      'Spring AI requires metrics to be registered or it will refuse to execute tool calls',
      'Observability enables automatic retries when an agent fails to complete its goal',
    ],
    correctIndex: 1,
    explanation: 'Traditional code follows predictable paths — you can trace execution by reading the code. Agents follow paths determined at runtime by the LLM. When an agent does something unexpected (calls a tool 50 times, passes wrong arguments, fails to complete a simple task), audit logs are the only way to understand what happened. Metrics reveal patterns: "tool X always fails for user type Y," "the research agent averages 8 tool calls per session."',
  },
  {
    question: 'What does setting parallelToolCalls: false do, and why might you prefer it over true?',
    options: [
      'It disables tool calling entirely, forcing the model to answer from training data only',
      'It prevents the model from calling multiple tools simultaneously, ensuring tools execute sequentially — safer for tools with dependencies (where tool B needs the result of tool A) and for simpler debugging',
      'It limits the total number of tool calls per conversation to prevent runaway agents',
      'It caches tool results so identical calls return immediately without re-executing',
    ],
    correctIndex: 1,
    explanation: 'With parallelToolCalls: true, the model can request multiple tools in a single round (e.g., "call getInventory AND getPrice simultaneously"). This reduces latency for independent tools. But if the model calls getOrder() and cancelOrder() in parallel, the order might cancel before getOrder() returns its status — a logical contradiction. Sequential execution (false) is safer when tools have dependencies or side effects. Enable parallelism only after verifying tool independence.',
  },
  {
    question: 'How does Spring AI handle the multi-round tool execution loop automatically?',
    options: [
      'Spring AI requires you to implement the loop manually using ChatModel.call() in a while loop',
      'Spring AI\'s ChatClient automatically executes the request-tool_call-result-response cycle, calling Java @Tool methods when instructed and passing results back to the model until it produces a final text answer',
      'Spring AI delegates loop management to the LLM provider\'s server-side agent framework',
      'Spring AI uses reactive Flux streams to handle concurrent tool calls across multiple LLM responses',
    ],
    correctIndex: 1,
    explanation: 'The agentic loop is one of Spring AI\'s core features. When you call chatClient.prompt().user(...).tools(...).call().content(), Spring AI handles everything internally: sends the prompt with tool schemas, detects tool_call responses, executes the @Tool methods, sends results back, and repeats until the model produces a text-only response. Your application code stays at a high level — you describe the goal and tools; Spring AI runs the loop.',
  },
],
}

export const codingTask: Record<string, {
  instructions: string; boilerplate: string; rubric: string[]; hints: string[]
}> = {

'223.1': {
  instructions: `Implement a \`ProductTools\` Spring bean with two \`@Tool\` methods for a product assistant agent.

Requirements:

1. Create a \`ProductTools\` Spring service that injects a \`ProductRepository\`.

2. Implement \`@Tool String searchProducts(String query)\`:
   - Description: "Search for products by name or description. Returns a list of matching products with name, SKU, price, and availability."
   - Call \`productRepository.findByNameContainingIgnoreCase(query)\`
   - Format results as a JSON-style summary string (each product on one line: "- [SKU] name: $price (available: true/false)")
   - If no results: return "No products found matching: [query]"

3. Implement \`@Tool ProductDetails getProductDetails(String sku)\`:
   - Description: "Get full details for a specific product by its SKU code."
   - Annotate the \`sku\` parameter with \`@ToolParam(description = "The product SKU code, e.g. LAPTOP-001")\`
   - Call \`productRepository.findBySku(sku).orElseThrow(() -> new IllegalArgumentException("Product not found: " + sku))\`
   - Return a \`ProductDetails\` record: \`String sku, String name, String description, double price, int stockQuantity, boolean available\`

4. Define \`ProductDetails\` as a nested record inside the class.`,
  boilerplate: `package com.example.tools;

import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Service;

import com.example.repository.ProductRepository;
import com.example.entity.Product;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ProductTools {

    private final ProductRepository productRepository;

    public ProductTools(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    // TODO: Define ProductDetails record
    // Fields: sku (String), name (String), description (String), price (double), stockQuantity (int), available (boolean)
    public record ProductDetails(/* TODO */) {}

    // TODO: Annotate with @Tool and implement searchProducts
    public String searchProducts(String query) {
        return null;
    }

    // TODO: Annotate with @Tool, add @ToolParam on sku, implement getProductDetails
    public ProductDetails getProductDetails(String sku) {
        return null;
    }
}`,
  rubric: [
    'ProductDetails record has sku, name, description, price, stockQuantity, available fields',
    '@Tool annotation on searchProducts with a descriptive description string',
    'searchProducts calls productRepository.findByNameContainingIgnoreCase(query)',
    'searchProducts formats results with SKU, name, price, available per line; handles empty results',
    '@Tool annotation on getProductDetails with a descriptive description string',
    '@ToolParam(description = "...") annotation on the sku parameter',
    'getProductDetails calls productRepository.findBySku(sku).orElseThrow(...) and maps to ProductDetails',
  ],
  hints: [
    'public record ProductDetails(String sku, String name, String description, double price, int stockQuantity, boolean available) {}',
    '@Tool(description = "Search for products by name or description...")',
    'productRepository.findByNameContainingIgnoreCase(query).stream().map(p -> "- [" + p.getSku() + "] " + p.getName() + ": $" + p.getPrice() + " (available: " + p.isAvailable() + ")").collect(Collectors.joining("\\n"))',
    'if (results.isEmpty()) return "No products found matching: " + query;',
    '@Tool(description = "Get full details for a specific product by its SKU code.")',
    'public ProductDetails getProductDetails(@ToolParam(description = "The product SKU code, e.g. LAPTOP-001") String sku)',
    'Product p = productRepository.findBySku(sku).orElseThrow(() -> new IllegalArgumentException("Product not found: " + sku)); return new ProductDetails(p.getSku(), p.getName(), p.getDescription(), p.getPrice(), p.getStockQuantity(), p.isAvailable());',
  ],
},
}
