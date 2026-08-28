// Part III — AI-Accelerated Spring Boot Dev
// Chapter 208: Your AI Toolkit — Copilot, Cursor, Claude

import type { QuizQuestion } from '../../src/data/curriculum'

export const courseId = 'springboot-ai-architect'

export const content: Record<string, string> = {

'208.1': `# GitHub Copilot for Spring Boot Development

GitHub Copilot is the most widely adopted AI coding assistant — 77% of teams that use any AI tooling use Copilot. For Spring Boot developers it is particularly effective because Spring's annotation-heavy, convention-driven style gives the model rich context signals: a class annotated \`@RestController\` with a \`@GetMapping\` stub tells Copilot exactly what you need next.

## Setup in IntelliJ IDEA

Install the **GitHub Copilot** plugin from the JetBrains Marketplace, sign in with your GitHub account (Teams or Enterprise plan required for most orgs), and enable inline suggestions under **Settings → GitHub Copilot**.

Key shortcuts:
| Action | Mac | Windows/Linux |
|---|---|---|
| Accept suggestion | Tab | Tab |
| Next suggestion | Option+] | Alt+] |
| Previous suggestion | Option+[ | Alt+[ |
| Open completions panel | Option+Return | Alt+Enter |
| Dismiss | Esc | Esc |

The completions panel shows up to 10 alternatives — use it when the first suggestion is close but not quite right.

## How Copilot Reads Spring Boot Context

Copilot uses the surrounding file, open tabs, and recently visited files as context. It weighs:

1. **Annotations** — \`@Service\`, \`@Repository\`, \`@Transactional\` directly shape completions
2. **Import statements** — importing \`org.springframework.data.jpa.repository.JpaRepository\` tells it you're in JPA territory
3. **Method signatures** — a method named \`findByEmailAndActiveTrue\` will get the right derived query body
4. **Javadoc** — writing a \`/** Creates a new user, hashes password, sends welcome email */\` comment before a method stub is one of the most reliable prompting techniques

## Effective Patterns

### Pattern 1 — Annotation-first generation
Write the full annotation stack before the class body:

\`\`\`java
@RestController
@RequestMapping("/api/v1/products")
@RequiredArgsConstructor
@Slf4j
public class ProductController {
    // Copilot now knows: REST controller, v1 API, Lombok, SLF4J logging
    // Start typing "private final" — it will suggest the service field
\`\`\`

### Pattern 2 — Interface-driven implementation
Define the interface first, then create the implementation class. Copilot fills the method bodies:

\`\`\`java
public interface ProductService {
    ProductDto create(CreateProductRequest request);
    ProductDto findById(UUID id);
    Page<ProductDto> findAll(Pageable pageable);
    ProductDto update(UUID id, UpdateProductRequest request);
    void delete(UUID id);
}
// In ProductServiceImpl.java — Copilot generates complete implementations
\`\`\`

### Pattern 3 — Test method names as specs
JUnit 5 allows descriptive method names. Write the \`@Test\` and the method name, and Copilot generates the body:

\`\`\`java
@Test
void should_return_404_when_product_does_not_exist() {
    // Copilot generates: mockMvc.perform(get("/api/v1/products/" + UUID.randomUUID()))
    //                           .andExpect(status().isNotFound())
\`\`\`

## What Copilot Gets Wrong

Copilot's training data has a cutoff and Spring Boot evolves fast. Common mistakes:

- **Spring Boot 2.x patterns** in a 3.x project: it may suggest \`WebSecurityConfigurerAdapter\` (removed in Boot 3), the old \`spring.datasource.*\` property names, or JUnit 4 imports
- **Transaction boundaries**: Copilot doesn't understand your domain — verify \`@Transactional\` is on the right layer
- **Security**: never accept Copilot-generated Spring Security config without review. Check for missing \`CSRF\` protection, weak \`BCryptPasswordEncoder\` cost factors, or open \`antMatchers\`
- **N+1 queries**: it happily generates \`@OneToMany\` without \`FetchType.LAZY\` or a JOIN FETCH

## Building a Copilot Habit

The highest-leverage use of Copilot is **not** letting it write whole classes. It is:

1. Write the method signature + Javadoc → accept the body
2. Write test method names → accept the arrange/act/assert
3. Write the first statement of a complex method → accept the next 3–4 statements, then review

Think of it as autocomplete that understands Spring, not as a junior developer you can leave unsupervised.

## Copilot Chat (IntelliJ)

The chat panel is separate from inline completions. Use it for:
- **/explain** — paste a complex expression or lambda and ask what it does
- **/fix** — paste a compile error + context
- **/tests** — generate a test class for a highlighted method
- **/doc** — generate Javadoc for a highlighted method

Copilot Chat in IntelliJ uses GPT-4o (as of 2025); the inline completions use a smaller, faster model. Use chat for reasoning tasks, inline for flow-state generation.`,

'208.2': `# Cursor IDE — The AI-First IDE for Spring Boot

Cursor is a fork of VS Code built around a single premise: your entire codebase is context. While GitHub Copilot has per-file context limits, Cursor's \`@codebase\` can index and semantically search hundreds of thousands of lines. For large Spring Boot monorepos this is a qualitative difference.

## Setup for Java / Spring Boot

1. Download Cursor from cursor.com
2. Install the **Extension Pack for Java** (same as VS Code)
3. Install **Spring Boot Extension Pack** and **Lombok Annotations Support**
4. Set your preferred model: **Settings → Models**. For code generation, Claude Sonnet or GPT-4o. For fast completions, cursor-small.

Cursor has the same Copilot-style tab completions PLUS a chat panel, inline edit (\`Cmd+K\`), and an autonomous Agent mode.

## Context Commands

These are typed directly in the chat input:

| Command | What it adds to context |
|---|---|
| \`@file ProductService.java\` | Entire file |
| \`@folder src/main/java/com/myapp/domain\` | All files in folder |
| \`@codebase\` | Semantic search across the whole repo |
| \`@docs\` | Pulls docs from a URL you've added in settings |
| \`@git\` | Recent git diff / commit history |
| \`@web\` | Live web search |

For Spring Boot: add the Spring Boot 3.x and Spring AI Javadoc URLs to \`@docs\`. Now asking "how do I configure Spring AI with Anthropic" gives answers grounded in the actual current API.

## The Three Interaction Modes

### 1. Tab Completion (same as Copilot)
Works identically. Cursor's model is often faster because it uses cursor-small locally, falling back to the cloud model for complex suggestions.

### 2. Inline Edit — \`Cmd+K\`
Select a block of code, press \`Cmd+K\`, and type an instruction:
- *"Add input validation using Jakarta Bean Validation annotations"*
- *"Rewrite this using Java 21 record instead of a class"*
- *"Make this method reactive using Project Reactor Mono/Flux"*

The diff is shown inline — green for additions, red for deletions. Accept with \`Cmd+Enter\`, reject with \`Escape\`, or edit the diff before accepting.

### 3. Composer / Agent Mode — \`Cmd+Shift+I\`
Agent mode can read, create, and edit multiple files in one session. You describe the feature; it writes the controller, service, repository, DTO, and test in sequence. For Spring Boot this is transformative:

**Example prompt:**
\`\`\`
@codebase I need a new OrderService that:
1. Creates an order from a CreateOrderRequest (validate stock using InventoryService)
2. Publishes an OrderCreatedEvent to Kafka topic "order-events"
3. Returns an OrderDto
4. Has Testcontainers integration tests for the happy path and out-of-stock scenario

Follow the same package structure and coding conventions as ProductService.
\`\`\`

Cursor reads \`ProductService\`, identifies your conventions (package name, exception handling pattern, DTO mapping approach), and generates all four files consistently.

## Cursor Rules — Enforcing Your Conventions

Create a \`.cursorrules\` file in your project root. This is injected into every prompt:

\`\`\`
You are a senior Spring Boot 3.2 developer working in a Java 21 project.

Conventions:
- Use Lombok: @RequiredArgsConstructor, @Slf4j, @Builder, @Data for DTOs
- Exceptions: throw custom exceptions that extend RuntimeException, caught by GlobalExceptionHandler
- DTOs are Java records for read operations, classes with @Builder for write operations
- All services implement an interface in the same package
- Tests use @SpringBootTest for integration tests, Testcontainers for DB/Kafka/Redis
- Never use field injection (@Autowired) — constructor injection only
- Spring Security: use SecurityFilterChain beans, never extend WebSecurityConfigurerAdapter
- Database: PostgreSQL via Spring Data JPA, migrations via Flyway
\`\`\`

This single file eliminates 80% of the "AI used the wrong pattern" corrections.

## Privacy Considerations

By default, Cursor sends your code to the cloud model. For proprietary codebases:
- Enable **Privacy Mode** in Settings to prevent code from being stored for training
- Use **local models** via Ollama integration (slower but fully private)
- Enterprise plan supports bring-your-own-key (BYOK) with Azure OpenAI

## Cursor vs. Copilot — When to Use Which

| Scenario | Use |
|---|---|
| Flow-state coding, single-file work | Copilot (lower friction) |
| Cross-file feature generation | Cursor Agent |
| Refactoring across multiple files | Cursor \`Cmd+K\` + Agent |
| Understanding a large unfamiliar codebase | Cursor \`@codebase\` chat |
| PR review / explaining diff | Cursor \`@git\` chat |
| IntelliJ-only team requirement | Copilot |

Most high-output developers use both: IntelliJ + Copilot for day-to-day, Cursor for larger tasks. The investment in a \`.cursorrules\` file pays back in the first week.`,

'208.3': `# Claude Code CLI for Spring Boot Backend Development

Claude Code is Anthropic's terminal-based coding agent. Unlike IDE plugins, it runs in your shell alongside your existing tools — git, Maven/Gradle, your test runner. It can read files, run commands, edit code, and observe the output of test runs to iterate. For backend development this is particularly powerful: you describe a feature, Claude Code reads your codebase, writes code, runs \`./mvnw test\`, reads the failure, fixes it, and retries — all without leaving the terminal.

## Installation and Authentication

\`\`\`bash
npm install -g @anthropic-ai/claude-code
claude login          # opens browser OAuth flow
claude               # starts interactive session in current directory
\`\`\`

Claude Code reads your project structure on first launch. For a Maven project it understands the \`pom.xml\`, source layout, and existing code patterns automatically.

## Core Mental Model

Claude Code operates in **agentic mode**: it is not just generating code you paste — it is executing a plan. It will:

1. **Read** relevant files before writing anything
2. **Write** code to disk
3. **Run** your tests or build
4. **Observe** failures and iterate
5. **Ask** when it needs a decision from you

This loop means you describe outcomes, not steps. "Add a rate-limiting filter that allows 100 requests per minute per IP using Redis" — Claude Code figures out the implementation path.

## Practical Spring Boot Workflows

### Workflow 1 — Generate a vertical slice from a requirement

Start a Claude Code session in your Spring Boot project root:

\`\`\`
> Implement a ProductReview feature:
  - POST /api/v1/products/{productId}/reviews — creates a review (rating 1-5, comment)
  - GET /api/v1/products/{productId}/reviews — paginated list, sorted by created_at desc
  - A product's average rating is updated asynchronously via an ApplicationEvent
  - Add Flyway migration for the reviews table
  - Add Testcontainers integration tests
  Follow the same patterns as the existing Product feature.
\`\`\`

Claude Code reads \`ProductController\`, \`ProductService\`, \`ProductRepository\`, the Flyway migrations folder, and existing tests — then generates the Review equivalents with consistent naming, error handling, and test structure.

### Workflow 2 — Fix a failing test suite

\`\`\`
> Run ./mvnw test and fix any failures. Don't change the test assertions — fix the production code.
\`\`\`

Claude Code runs Maven, reads the failure output, identifies the cause, edits the production code, reruns, and repeats until green.

### Workflow 3 — Refactor to a new pattern

\`\`\`
> All our @Service classes use field injection (@Autowired).
  Refactor them all to constructor injection using @RequiredArgsConstructor.
  Run the tests after each class to make sure nothing broke.
\`\`\`

### Workflow 4 — Security review

\`\`\`
> Review all @RestController classes for common Spring Security issues:
  missing authentication requirements, input validation gaps, mass assignment risks,
  and direct object reference vulnerabilities. Report findings, don't auto-fix.
\`\`\`

## Memory and CLAUDE.md

Create a \`CLAUDE.md\` in your project root — Claude Code reads this at the start of every session:

\`\`\`markdown
# Project: MyApp Backend

## Stack
- Java 21, Spring Boot 3.2, PostgreSQL 16, Kafka 3.7, Redis 7
- Maven, Flyway for migrations, Testcontainers for tests

## Conventions
- All service classes implement an interface
- DTOs are Java records (read) or @Builder classes (write)
- Exceptions: throw ApplicationException subclasses, handled by GlobalExceptionHandler
- Never use @Autowired field injection

## Running tests
\`./mvnw test\`                    — all tests
\`./mvnw test -Dtest=ProductTest\` — specific test

## Local dev
\`docker compose up -d\`   — starts postgres, redis, kafka
\`./mvnw spring-boot:run\` — starts the app on port 8080
\`\`\`

With \`CLAUDE.md\` in place, Claude Code never asks how to run tests or what conventions to follow.

## Permission Model

Claude Code asks for permission before:
- Running shell commands it hasn't run before
- Writing to files outside the project directory
- Installing dependencies

You can pre-approve a set of commands with \`/allowed-tools\` or configure in \`settings.json\`. For a Spring Boot project, pre-approve \`./mvnw test\`, \`./mvnw compile\`, and \`docker compose up -d\`.

## When to Use Claude Code vs. IDE Plugins

Use Claude Code when:
- The task spans **many files** (the IDE plugin has per-context limits)
- You need to **run and observe** test output iteratively
- You want a **written report** (security review, architecture analysis)
- You're working in a **headless environment** (CI/CD, SSH session)

Use Copilot/Cursor when:
- You're in **flow state** writing production code and want inline suggestions
- The task is **localized** to 1–2 files
- You need **instant feedback** as you type`,
}

export const quiz: Record<string, QuizQuestion[]> = {

'208.1': [
  {
    question: 'Which GitHub Copilot technique gives the most reliable full-method completions in Spring Boot?',
    options: [
      'Writing the class name only and waiting for Copilot to fill the entire class',
      'Writing a descriptive Javadoc comment immediately above a method stub',
      'Opening as many tab files as possible to give Copilot maximum context',
      'Typing the return statement first so Copilot works backwards',
    ],
    correctIndex: 1,
    explanation: 'A Javadoc comment precisely describes what the method should do — Copilot treats it as a natural-language spec and generates an implementation that matches it, giving far more reliable results than waiting on class-level context alone.',
  },
  {
    question: 'Why does Copilot sometimes generate Spring Boot 2.x patterns in a 3.x project?',
    options: [
      'Copilot has a training data cutoff and Spring Boot 3.x is underrepresented in its training',
      'Copilot always generates the oldest compatible version to maximise backward compatibility',
      'Spring Boot 3.x is not supported by Copilot',
      'This only happens if you use IntelliJ instead of VS Code',
    ],
    correctIndex: 0,
    explanation: 'Copilot\'s training data has a cutoff date. Spring Boot 3.x introduced major changes (Jakarta EE namespace, new Security DSL, virtual threads) that were less represented in public GitHub code when the model was trained. Always verify annotations and APIs against the 3.x docs.',
  },
  {
    question: 'Which of the following is the highest-leverage daily use of Copilot according to experienced practitioners?',
    options: [
      'Let Copilot write entire service classes unsupervised',
      'Use Copilot only for boilerplate like getters and setters',
      'Write the method signature and Javadoc, then accept and review the generated body',
      'Accept all suggestions immediately to maximise speed',
    ],
    correctIndex: 2,
    explanation: 'Writing the signature + Javadoc gives Copilot a precise spec while keeping you in control of the design. Accepting blindly introduces bugs; restricting it to getters wastes its power. The signature-first approach is the practitioner sweet spot.',
  },
  {
    question: 'What is the difference between Copilot inline completions and Copilot Chat?',
    options: [
      'There is no difference — they use the same model and context',
      'Inline uses a smaller fast model for flow-state suggestions; Chat uses a larger model (GPT-4o) for reasoning tasks',
      'Chat only works in VS Code; inline works in IntelliJ',
      'Inline completions are only available with a paid plan; Chat is free',
    ],
    correctIndex: 1,
    explanation: 'Inline completions are optimised for low-latency keystroke-level suggestions and use a smaller model. Copilot Chat uses GPT-4o and is better suited for explaining complex code, generating tests from a description, or debugging failures — reasoning tasks where latency matters less than quality.',
  },
  {
    question: 'You accepted a Copilot suggestion that added @OneToMany on an entity. What should you immediately verify?',
    options: [
      'That the annotation is spelled correctly',
      'That the related entity has a matching @ManyToOne',
      'The fetch type — Copilot often defaults to EAGER, causing N+1 query problems',
      'That Lombok @Data is also present on the entity',
    ],
    correctIndex: 2,
    explanation: 'FetchType.EAGER (the JPA default for @OneToMany in some configurations) causes N+1 queries — a classic Spring Boot performance bug. Always explicitly set FetchType.LAZY on collection associations and use JOIN FETCH in queries where you need the related data.',
  },
],

'208.2': [
  {
    question: 'What is the primary advantage of Cursor\'s @codebase command over GitHub Copilot\'s context window?',
    options: [
      'Cursor is faster at inline completions',
      'Cursor can semantically search the entire repository, not just open files',
      '@codebase runs your tests before generating code',
      'Cursor supports more programming languages than Copilot',
    ],
    correctIndex: 1,
    explanation: 'Copilot\'s context is limited to the current file and a handful of recently opened tabs. @codebase performs semantic (embedding-based) search across the entire indexed codebase, letting Cursor find relevant classes even in large multi-module projects.',
  },
  {
    question: 'What is a .cursorrules file and why is it valuable for team development?',
    options: [
      'It configures which file types Cursor indexes for @codebase',
      'It defines project conventions injected into every prompt, enforcing consistent AI output across the team',
      'It stores API keys for the AI models Cursor uses',
      'It is a VS Code settings file that Cursor also supports',
    ],
    correctIndex: 1,
    explanation: 'The .cursorrules file is injected at the start of every prompt. When every developer\'s prompts include the same conventions (constructor injection, exception patterns, test approach), AI-generated code is consistent regardless of who runs the prompt — eliminating a major source of inconsistency in AI-assisted teams.',
  },
  {
    question: 'You need to refactor a 500-line ProductController by extracting business logic into a ProductService. Which Cursor interaction mode is most appropriate?',
    options: [
      'Tab completion — let Cursor suggest the extraction as you type',
      'Inline Edit (Cmd+K) on the controller to rewrite it, then create the service file separately',
      'Agent mode (Cmd+Shift+I) with @file context — it can read the controller and create both files in one session',
      'Copilot Chat — Cursor is not suited for refactoring',
    ],
    correctIndex: 2,
    explanation: 'Agent mode can read the existing controller file, extract the business logic, create the ProductService file, update the controller to inject the service, and run the tests — all in one coordinated session. Inline Edit and tab completion are single-file tools.',
  },
  {
    question: 'Which Cursor @docs setup would most benefit a Spring Boot team?',
    options: [
      'Adding the Spring Boot 2.x migration guide to ensure backward compatibility',
      'Adding Spring Boot 3.x Javadoc and Spring AI reference docs so AI answers reference the current API',
      'Adding Stack Overflow as a doc source for community-verified answers',
      'No @docs setup is needed — Cursor already knows Spring Boot from training data',
    ],
    correctIndex: 1,
    explanation: 'Training data has a cutoff and may not include the latest Spring Boot 3.x or Spring AI 1.x APIs accurately. Adding the official Javadoc and reference guide URLs to @docs grounds AI answers in the actual current documentation, significantly reducing hallucinated or outdated API usage.',
  },
  {
    question: 'What should you do with proprietary code when using Cursor\'s cloud models?',
    options: [
      'Nothing — Cursor never sends code to any server',
      'Enable Privacy Mode and consider BYOK (bring-your-own-key) or local models to prevent code being stored for training',
      'Only use @file context, never @codebase, to limit what is sent',
      'Cursor\'s cloud is end-to-end encrypted so no action is needed',
    ],
    correctIndex: 1,
    explanation: 'By default Cursor sends code context to cloud model providers. Privacy Mode prevents storage for training purposes. For highly sensitive codebases, teams should evaluate BYOK with Azure OpenAI or run local models via Ollama — confirming the data handling policy with legal/security teams.',
  },
],

'208.3': [
  {
    question: 'What is the key architectural difference between Claude Code and IDE-based AI plugins like Copilot?',
    options: [
      'Claude Code only works with Python, not Java',
      'Claude Code runs in the terminal and can execute commands, run tests, and iterate on failures — not just generate code',
      'Claude Code generates code faster than IDE plugins',
      'Claude Code requires a separate API key that costs more than Copilot',
    ],
    correctIndex: 1,
    explanation: 'IDE plugins generate code for you to paste and run. Claude Code is an agentic loop: it reads your files, writes code, runs your test suite, observes failures, and iterates — the same workflow a developer follows, but automated. This is fundamentally different from autocomplete.',
  },
  {
    question: 'What is CLAUDE.md and why should every Spring Boot project have one?',
    options: [
      'A markdown file documenting Claude Code\'s limitations for the team',
      'A project-specific instruction file read at the start of every Claude Code session, eliminating repeated setup questions',
      'A configuration file that sets Claude Code\'s model temperature and token limit',
      'An alternative to README.md specifically for AI-generated projects',
    ],
    correctIndex: 1,
    explanation: 'CLAUDE.md is read automatically at session start. It tells Claude Code your stack, conventions, how to run tests, and how to start services — so it never asks "how do I run the tests?" and always follows your project\'s patterns. Without it, Claude Code must infer conventions from code, which is slower and less accurate.',
  },
  {
    question: 'You want Claude Code to fix a failing test suite without changing the test assertions. What is the correct prompt?',
    options: [
      '"Fix all tests" — Claude Code infers from context that assertions should be preserved',
      '"Run ./mvnw test and fix any failures. Do not change test assertions — fix the production code."',
      '"Delete failing tests and rewrite them to pass"',
      '"Update test assertions to match the current implementation"',
    ],
    correctIndex: 1,
    explanation: 'Being explicit prevents Claude Code from taking the easy path of changing assertions to match broken production code. Saying "fix production code, not tests" is an important constraint. Claude Code respects explicit constraints in the prompt over its own judgement about the fastest path to green.',
  },
  {
    question: 'When is Claude Code CLI more appropriate than Cursor Agent mode for a Spring Boot task?',
    options: [
      'When you want inline suggestions as you type in the IDE',
      'When the task requires running tests iteratively, working in a headless/SSH environment, or generating a written analysis report',
      'When you are working on a single method in one file',
      'Claude Code is always better — there is no reason to use Cursor',
    ],
    correctIndex: 1,
    explanation: 'Claude Code\'s strengths are iterative test-run loops (it observes real test output), headless environments (SSH, CI), and analytical tasks like security reviews. Cursor Agent is better when you are in the IDE and want the AI to work within the same UI. Both are valuable in a developer\'s toolkit.',
  },
  {
    question: 'You instruct Claude Code to do a security review of all @RestController classes. What is the correct expectation to set in the prompt?',
    options: [
      'Nothing special — Claude Code will automatically determine whether to fix or report',
      'Specify "report findings, do not auto-fix" to prevent unwanted production code changes',
      'Claude Code cannot do security reviews — use a dedicated SAST tool',
      'Set "--read-only" flag in the Claude Code settings before running',
    ],
    correctIndex: 1,
    explanation: 'Without an explicit instruction Claude Code may fix issues it finds, which could be unwanted for a review task where you want to audit and decide. "Report findings, do not auto-fix" keeps Claude Code in analyst mode. Always set the expected output type explicitly for non-generation tasks.',
  },
],
}

export const codingTask: Record<string, {
  instructions: string
  boilerplate: string
  rubric: string[]
  hints: string[]
}> = {

'208.3': {
  instructions: `Create a CLAUDE.md file for a Spring Boot project that gives Claude Code (or any AI agent) everything it needs to work effectively in your codebase.

Your CLAUDE.md must cover:
1. **Project overview** — app name, purpose, domain (e.g., e-commerce, SaaS platform)
2. **Tech stack** — Java version, Spring Boot version, key dependencies (JPA, Security, Kafka, Redis, etc.)
3. **Coding conventions** — injection style, DTO patterns, exception handling, naming rules
4. **Build and test commands** — how to compile, run all tests, run a specific test class
5. **Local dev setup** — how to start dependent services (docker compose), how to run the app
6. **Key architectural decisions** — why certain patterns are used (e.g., "we use events not direct service calls between bounded contexts")
7. **What NOT to do** — common mistakes to avoid in this codebase

Then write a sample one-shot Claude Code prompt that uses this CLAUDE.md context to generate a complete UserAddress feature (entity, repository, service, controller, migration, tests) for an e-commerce backend.`,
  boilerplate: `# CLAUDE.md

## Project Overview
<!-- TODO: App name, purpose, main domain concepts -->

## Tech Stack
<!-- TODO: Java version, Spring Boot version, key dependencies -->

## Coding Conventions
<!-- TODO: Injection style, DTO patterns, exception handling -->

## Build & Test
\`\`\`bash
# TODO: How to build and run tests
\`\`\`

## Local Development
\`\`\`bash
# TODO: How to start services and the app
\`\`\`

## Architectural Decisions
<!-- TODO: Key patterns and why they were chosen -->

## Do NOT
<!-- TODO: Anti-patterns to avoid in this codebase -->

---

# Sample Claude Code Prompt for UserAddress Feature

\`\`\`
TODO: Write a detailed one-shot prompt that references the conventions above
\`\`\``,
  rubric: [
    'CLAUDE.md specifies Java 21 and Spring Boot 3.x (not older versions)',
    'Conventions section explicitly states constructor injection (no @Autowired field injection)',
    'Build section includes exact Maven/Gradle commands with examples',
    'Local dev section shows docker compose command and app startup command',
    'At least one architectural decision is explained with a "why" not just a "what"',
    'Do NOT section lists at least 3 concrete anti-patterns specific to the project',
    'The Claude Code prompt references specific class names/patterns from the CLAUDE.md conventions',
    'The prompt specifies expected output files (controller, service, repository, migration, tests)',
  ],
  hints: [
    'A great CLAUDE.md is specific — "use @RequiredArgsConstructor" beats "use constructor injection"',
    'Include the exact test command including how to run a single test: ./mvnw test -Dtest=ClassName',
    'For the Claude Code prompt: start with "@codebase" so it reads the whole project first',
    'The "Do NOT" section is often the most valuable — think about what mistakes AI tools make in your codebase',
  ],
},
}
