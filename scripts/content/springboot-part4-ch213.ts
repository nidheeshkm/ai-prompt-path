// Part IV — Security + Testcontainers
// Chapter 213: Spring Security 6.x — The New DSL

import type { QuizQuestion } from '../../src/data/curriculum'

export const courseId = 'springboot-ai-architect'

export const content: Record<string, string> = {

'213.1': `# Spring Security 6.x — SecurityFilterChain & the New DSL

Spring Security 6.x (bundled with Spring Boot 3.x) retired \`WebSecurityConfigurerAdapter\` — the class you extended in every Spring Boot 2.x project. If you open a 2.x tutorial today and see \`extends WebSecurityConfigurerAdapter\`, stop reading: that API is gone.

The new model is **component-based**: you declare a \`SecurityFilterChain\` bean that describes your security rules using a fluent lambda DSL.

## Why the Change?

\`WebSecurityConfigurerAdapter\` forced inheritance, which meant:
- Only one security configuration class per application (difficult to split by module)
- Hard to test security configuration in isolation
- Framework internals were entangled with user code

The new approach is composition. You can declare **multiple** \`SecurityFilterChain\` beans, each matched to a different URL pattern, and Spring Security picks the first one that matches a request.

## The Minimal Secure Configuration

\`\`\`java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())                          // REST APIs don't need CSRF
            .sessionManagement(sm -> sm
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/actuator/health").permitAll()
                .anyRequest().authenticated()
            );
        return http.build();
    }
}
\`\`\`

Key observations:
- Every customisation is a **lambda** passed to a method — no more overriding \`configure(HttpSecurity)\`
- \`http.build()\` returns the \`SecurityFilterChain\` bean
- \`@EnableWebSecurity\` is optional in Boot 3.x (autoconfiguration enables it) but recommended for clarity

## The Lambda DSL vs the Old API

| Old (Boot 2.x) | New (Boot 3.x) |
|---|---|
| \`http.csrf().disable()\` | \`http.csrf(csrf -> csrf.disable())\` |
| \`http.sessionManagement().sessionCreationPolicy(...)\` | \`http.sessionManagement(sm -> sm.sessionCreationPolicy(...))\` |
| \`http.authorizeRequests().antMatchers(...).permitAll()\` | \`http.authorizeHttpRequests(auth -> auth.requestMatchers(...).permitAll())\` |
| \`http.formLogin()\` | \`http.formLogin(Customizer.withDefaults())\` |

The pattern is always: **method name → lambda that configures a sub-object**.

## Request Matchers

Spring Security 6 replaced \`antMatchers\` with \`requestMatchers\`. It auto-detects whether Spring MVC is present and delegates to \`MvcRequestMatcher\` or \`AntPathRequestMatcher\` accordingly.

\`\`\`java
.authorizeHttpRequests(auth -> auth
    // Public endpoints
    .requestMatchers("/api/auth/login", "/api/auth/register").permitAll()
    .requestMatchers(HttpMethod.GET, "/api/products/**").permitAll()
    // Admin-only
    .requestMatchers("/api/admin/**").hasRole("ADMIN")
    // Everything else requires authentication
    .anyRequest().authenticated()
)
\`\`\`

**Order matters.** Rules are evaluated top-to-bottom. Put the most specific rules first.

## Multiple Filter Chains

Use multiple filter chains when you have genuinely different security requirements for different URL spaces — for example, a public API and an admin API:

\`\`\`java
@Bean
@Order(1)
public SecurityFilterChain adminChain(HttpSecurity http) throws Exception {
    http
        .securityMatcher("/admin/**")
        .authorizeHttpRequests(auth -> auth.anyRequest().hasRole("ADMIN"))
        .httpBasic(Customizer.withDefaults());
    return http.build();
}

@Bean
@Order(2)
public SecurityFilterChain apiChain(HttpSecurity http) throws Exception {
    http
        .securityMatcher("/api/**")
        .csrf(csrf -> csrf.disable())
        .sessionManagement(sm -> sm
            .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(auth -> auth.anyRequest().authenticated());
    return http.build();
}
\`\`\`

The \`@Order\` annotation controls which chain is checked first. If no \`securityMatcher\` is set, the chain matches all URLs — put it last.

## PasswordEncoder

Always hash passwords with BCrypt (or Argon2 for higher security). Never store plaintext:

\`\`\`java
@Bean
public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(12); // strength factor 12 is the modern recommendation
}
\`\`\`

Inject this bean into your \`UserDetailsService\` to verify passwords on login.

## UserDetailsService

Spring Security calls your \`UserDetailsService\` to load a user by username during authentication:

\`\`\`java
@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        return userRepository.findByEmail(email)
            .map(user -> User.builder()
                .username(user.getEmail())
                .password(user.getPasswordHash())
                .roles(user.getRole().name())
                .build())
            .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));
    }
}
\`\`\`

The \`User\` class here is \`org.springframework.security.core.userdetails.User\`, not your domain entity.

## What AI Tools Do Well Here

Security configuration is an area where AI assistants frequently generate **2.x patterns**. When prompting Copilot or Claude:

- Include \`// Spring Boot 3.x\` in a comment above the class
- Paste the import \`import org.springframework.security.web.SecurityFilterChain;\` — this anchors the model to the new API
- After generation, verify: if you see \`WebSecurityConfigurerAdapter\` or \`.antMatchers\`, reject the output and reprompt`,

'213.2': `# Method Security & Fine-Grained Authorization

Request-level authorization (which URLs require which roles) is coarse-grained. Real applications also need **method-level authorization** — controlling which users can call which service methods, regardless of how those methods are reached.

Spring Security's method security moves authorization logic closer to the domain, making it easier to reason about, test, and audit.

## Enabling Method Security

Add \`@EnableMethodSecurity\` to any \`@Configuration\` class:

\`\`\`java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity  // enables @PreAuthorize, @PostAuthorize, @PreFilter, @PostFilter
public class SecurityConfig {
    // ...
}
\`\`\`

In Spring Boot 3.x, \`@EnableMethodSecurity\` replaces the older \`@EnableGlobalMethodSecurity(prePostEnabled = true)\`.

## @PreAuthorize

The most common annotation. Evaluated **before** the method executes. If the expression returns false, Spring throws \`AccessDeniedException\` and the method never runs.

\`\`\`java
@Service
public class ProductService {

    // Only authenticated users with ROLE_USER or ROLE_ADMIN
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public Page<ProductDto> findAll(Pageable pageable) { ... }

    // Only the product owner OR an admin can update
    @PreAuthorize("@productSecurity.isOwner(#id, authentication) or hasRole('ADMIN')")
    public ProductDto update(UUID id, UpdateProductRequest request) { ... }

    // ADMIN only
    @PreAuthorize("hasRole('ADMIN')")
    public void delete(UUID id) { ... }
}
\`\`\`

The \`#id\` syntax accesses the method parameter by name. Spring EL (SpEL) gives you the full Spring expression language here.

## Custom Security Expressions

For complex rules, extract logic into a dedicated \`@Component\`:

\`\`\`java
@Component("productSecurity")
public class ProductSecurityEvaluator {

    private final ProductRepository productRepository;

    public boolean isOwner(UUID productId, Authentication auth) {
        return productRepository.findById(productId)
            .map(product -> product.getOwnerEmail().equals(auth.getName()))
            .orElse(false);
    }
}
\`\`\`

Reference it in \`@PreAuthorize\` with the bean name: \`@productSecurity.isOwner(...)\`. This pattern keeps SpEL expressions readable and makes the authorization logic independently testable.

## @PostAuthorize

Evaluated **after** the method returns, with the return value accessible as \`returnObject\`:

\`\`\`java
// Ensure the returned resource belongs to the calling user
@PostAuthorize("returnObject.ownerEmail == authentication.name")
public ProductDto findById(UUID id) {
    return productRepository.findById(id)
        .map(productMapper::toDto)
        .orElseThrow(() -> new ResourceNotFoundException(id));
}
\`\`\`

Use \`@PostAuthorize\` when the authorization decision depends on data that only exists after the method runs (e.g., the database result). Note: the method executes even if authorization fails — this matters for side-effecting methods.

## @PreFilter and @PostFilter

Filter collections before or after execution:

\`\`\`java
// Remove from the input list any items the user doesn't own
@PreFilter("filterObject.ownerEmail == authentication.name")
public List<ProductDto> bulkUpdate(List<UpdateProductRequest> requests) { ... }

// Remove from the result list any items the user can't see
@PostFilter("filterObject.visible == true or hasRole('ADMIN')")
public List<ProductDto> findAllVisible() { ... }
\`\`\`

\`filterObject\` refers to each element in the collection. These annotations are useful but can cause N+1 performance problems on large collections — prefer database-level filtering for anything over a few hundred records.

## Role Hierarchy

If \`ADMIN\` should automatically have \`USER\` permissions, configure a role hierarchy instead of duplicating roles in every \`@PreAuthorize\`:

\`\`\`java
@Bean
public RoleHierarchy roleHierarchy() {
    RoleHierarchyImpl hierarchy = new RoleHierarchyImpl();
    hierarchy.setHierarchy("ROLE_ADMIN > ROLE_USER");
    return hierarchy;
}
\`\`\`

Now \`hasRole('USER')\` automatically matches admin users too.

## Testing Method Security

Method security is easy to test with \`@WithMockUser\`:

\`\`\`java
@SpringBootTest
class ProductServiceTest {

    @Autowired
    private ProductService productService;

    @Test
    @WithMockUser(roles = "USER")
    void user_can_read_products() {
        assertDoesNotThrow(() -> productService.findAll(Pageable.unpaged()));
    }

    @Test
    @WithMockUser(roles = "USER")
    void user_cannot_delete_products() {
        assertThrows(AccessDeniedException.class,
            () -> productService.delete(UUID.randomUUID()));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void admin_can_delete_products() {
        assertDoesNotThrow(() -> productService.delete(UUID.randomUUID()));
    }
}
\`\`\`

\`@WithMockUser\` puts a \`UsernamePasswordAuthenticationToken\` into the security context for the duration of the test. No HTTP layer involved — this is pure service-layer testing.

## Common Mistake: Security on Private Methods

Spring Security method security works through AOP proxies. If you call a \`@PreAuthorize\`-annotated method **from within the same class**, the proxy is bypassed and the annotation is ignored:

\`\`\`java
// BROKEN — self-invocation bypasses the proxy
public void doSomethingPublic() {
    this.delete(id); // @PreAuthorize on delete() is NOT enforced here
}

@PreAuthorize("hasRole('ADMIN')")
public void delete(UUID id) { ... }
\`\`\`

The fix is to inject the service into itself via a \`@Lazy\` self-reference, or better: restructure so that protected methods are called through the proxy (i.e., from a different bean).`,

'213.3': `# CORS, CSRF & Security Headers in REST APIs

REST APIs face a different threat model than server-rendered web applications. Understanding what to configure — and why — prevents both over-restriction (blocking legitimate clients) and under-restriction (leaving attack vectors open).

## CORS — Cross-Origin Resource Sharing

CORS is a browser security mechanism, not a Spring Security feature. When a browser makes a request from \`https://app.example.com\` to \`https://api.example.com\`, the browser first sends a **preflight OPTIONS request** to check if the server allows cross-origin calls.

Spring Security intercepts requests before Spring MVC, so CORS must be configured at the Security level:

\`\`\`java
@Bean
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
        .cors(cors -> cors.configurationSource(corsConfigurationSource()))
        // ...
    return http.build();
}

@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOrigins(List.of("https://app.example.com"));
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
    config.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Requested-With"));
    config.setExposedHeaders(List.of("X-Total-Count"));
    config.setAllowCredentials(true);
    config.setMaxAge(3600L); // preflight cache duration in seconds

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/api/**", config);
    return source;
}
\`\`\`

**Key rules:**
- Never use \`setAllowedOrigins(List.of("*"))\` with \`setAllowCredentials(true)\` — browsers reject this combination
- For development, add \`http://localhost:3000\` to allowed origins; never leave it in production config
- Use Spring profiles: \`@Profile("dev")\` on a configuration bean that adds localhost

## CSRF — Cross-Site Request Forgery

CSRF attacks trick authenticated users into making unintended state-changing requests. The attack only works if the browser automatically sends credentials (cookies) with cross-origin requests.

**REST APIs with stateless JWT authentication don't need CSRF protection** because:
1. JWTs are stored in localStorage or Authorization headers — the browser does NOT send them automatically on cross-site requests
2. There's no session cookie to hijack

\`\`\`java
// Correct for stateless JWT APIs
http.csrf(csrf -> csrf.disable())
\`\`\`

**When you DO need CSRF:** If your Spring app uses session-based auth (server-side sessions, \`JSESSIONID\` cookie), CSRF protection is essential. In that case, keep it enabled and use the \`CookieCsrfTokenRepository\` for SPAs:

\`\`\`java
// For session-based apps with SPAs
http.csrf(csrf -> csrf
    .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
)
\`\`\`

## Security Headers

Spring Security adds several HTTP response headers automatically, but knowing what they do and when to customize them matters:

\`\`\`java
http.headers(headers -> headers
    .frameOptions(fo -> fo.deny())                          // Clickjacking protection
    .contentTypeOptions(Customizer.withDefaults())           // MIME sniffing protection
    .httpStrictTransportSecurity(hsts -> hsts              // HTTPS enforcement
        .includeSubDomains(true)
        .maxAgeInSeconds(31536000))
    .contentSecurityPolicy(csp -> csp
        .policyDirectives("default-src 'self'; script-src 'self'"))
)
\`\`\`

| Header | Default | What it does |
|---|---|---|
| \`X-Frame-Options: DENY\` | Enabled | Prevents clickjacking via iframes |
| \`X-Content-Type-Options: nosniff\` | Enabled | Stops MIME-type sniffing |
| \`Strict-Transport-Security\` | HTTPS only | Forces HTTPS for future requests |
| \`Content-Security-Policy\` | Not set | Restricts resource loading origins |
| \`Referrer-Policy\` | Not set | Controls what gets sent in the Referer header |

## Practical Configuration for a REST API

Combining everything into a production-ready base configuration:

\`\`\`java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // CORS — required before auth filters
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            // CSRF — disabled for stateless JWT API
            .csrf(csrf -> csrf.disable())
            // Sessions — stateless
            .sessionManagement(sm -> sm
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            // Authorization rules
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**", "/actuator/health").permitAll()
                .anyRequest().authenticated()
            )
            // Security headers
            .headers(headers -> headers
                .frameOptions(fo -> fo.deny())
                .contentTypeOptions(Customizer.withDefaults())
            );
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(
            "https://app.example.com"
            // Add "http://localhost:3000" via @Profile("dev")
        ));
        config.setAllowedMethods(List.of("GET","POST","PUT","DELETE","PATCH","OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization","Content-Type"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }
}
\`\`\`

## Testing CORS Configuration

Write a Spring MVC test that verifies CORS headers are present:

\`\`\`java
@WebMvcTest
class CorsIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void preflight_request_returns_cors_headers() throws Exception {
        mockMvc.perform(options("/api/products")
                .header("Origin", "https://app.example.com")
                .header("Access-Control-Request-Method", "GET"))
            .andExpect(status().isOk())
            .andExpect(header().string("Access-Control-Allow-Origin", "https://app.example.com"))
            .andExpect(header().string("Access-Control-Allow-Methods", containsString("GET")));
    }

    @Test
    void request_from_disallowed_origin_is_rejected() throws Exception {
        mockMvc.perform(get("/api/products")
                .header("Origin", "https://evil.example.com"))
            .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }
}
\`\`\`

## Scanning with AI

Ask Claude or Copilot to review your \`SecurityConfig\` class with this prompt pattern:

> "Review this Spring Security 6.x configuration for common misconfigurations: overly permissive CORS, unnecessary disabled protections, missing headers, and incorrect request matcher ordering. Flag each issue with the specific line and the fix."

AI tools are effective at spotting ordering mistakes (e.g., \`anyRequest().authenticated()\` before more specific rules) and detecting wildcard CORS configurations.`,
}

export const quiz: Record<string, QuizQuestion[]> = {

'213.1': [
  {
    question: 'Which class was removed in Spring Security 6.x that you previously extended for security configuration?',
    options: [
      'SecurityFilterChain',
      'WebSecurityConfigurerAdapter',
      'AuthenticationManagerBuilder',
      'HttpSecurityConfig',
    ],
    correctIndex: 1,
    explanation: 'WebSecurityConfigurerAdapter was deprecated in Spring Security 5.7 and removed in 6.0 (Spring Boot 3.x). The replacement is declaring SecurityFilterChain beans with the lambda-style DSL.',
  },
  {
    question: 'In Spring Security 6.x, which method replaces the old antMatchers() for URL authorization?',
    options: [
      'urlMatchers()',
      'pathMatchers()',
      'requestMatchers()',
      'mvcMatchers()',
    ],
    correctIndex: 2,
    explanation: 'requestMatchers() is the unified replacement. It auto-selects MvcRequestMatcher when Spring MVC is present, falling back to AntPathRequestMatcher otherwise. Both antMatchers() and mvcMatchers() were removed in Spring Security 6.',
  },
  {
    question: 'What does the following code produce: http.authorizeHttpRequests(auth -> auth.anyRequest().authenticated().requestMatchers("/public").permitAll())?',
    options: [
      'Public endpoints are open and everything else requires authentication',
      'A compilation error because permitAll() cannot follow authenticated()',
      'All requests require authentication because anyRequest().authenticated() is evaluated first',
      'The /public endpoint is secured and everything else is open',
    ],
    correctIndex: 2,
    explanation: 'Authorization rules are evaluated in order. Once anyRequest().authenticated() matches (which it does for every request), the subsequent requestMatchers("/public").permitAll() is never reached. Specific rules must come before anyRequest().',
  },
  {
    question: 'How do you declare two independent security filter chains in Spring Security 6.x?',
    options: [
      'Create two classes that both extend WebSecurityConfigurerAdapter',
      'Declare two SecurityFilterChain beans with @Bean and @Order, using securityMatcher() to scope each',
      'Use @Primary on the main chain and @Secondary on the fallback',
      'Configure both in a single SecurityFilterChain by calling http.and()',
    ],
    correctIndex: 1,
    explanation: 'Multiple @Bean SecurityFilterChain methods can coexist. Use @Order to set priority and securityMatcher() to restrict each chain to a URL prefix. Spring Security evaluates chains in order and applies the first match.',
  },
  {
    question: 'What is the recommended BCrypt strength factor for new Spring Boot applications as of current best practices?',
    options: [
      '4 (the minimum — fastest)',
      '8 (the default)',
      '12 (the modern recommendation)',
      '16 (maximum security)',
    ],
    correctIndex: 2,
    explanation: 'BCrypt strength 12 strikes the right balance: it requires ~200–400ms to hash on modern hardware, which is slow enough to defeat offline brute-force attacks but fast enough not to degrade user login performance. The default of 10 is now considered low.',
  },
],

'213.2': [
  {
    question: 'Which annotation replaces @EnableGlobalMethodSecurity(prePostEnabled = true) in Spring Security 6.x?',
    options: [
      '@EnableSpringSecurity',
      '@EnableMethodSecurity',
      '@EnablePrePostAnnotations',
      '@EnableAuthorizationManager',
    ],
    correctIndex: 1,
    explanation: '@EnableMethodSecurity is the Spring Security 6 replacement. It enables @PreAuthorize, @PostAuthorize, @PreFilter, and @PostFilter by default without needing prePostEnabled = true.',
  },
  {
    question: 'When does @PostAuthorize execute its security check?',
    options: [
      'Before the method executes, preventing execution if the check fails',
      'After the method executes, with access to the return value via returnObject',
      'Asynchronously, after the HTTP response is sent',
      'At application startup, to validate the configuration',
    ],
    correctIndex: 1,
    explanation: '@PostAuthorize runs after the method completes, giving it access to returnObject (the return value). The method body runs even if authorization will ultimately fail — important to consider for side-effecting methods.',
  },
  {
    question: 'Why does calling a @PreAuthorize-annotated method from within the same class fail to enforce the annotation?',
    options: [
      '@PreAuthorize only works on public methods called via HTTP',
      'Spring Security AOP proxies only intercept external calls — internal self-invocation bypasses the proxy',
      'You must add @Transactional alongside @PreAuthorize for it to work',
      'IntelliJ\'s compiler strips @PreAuthorize from private methods',
    ],
    correctIndex: 1,
    explanation: 'Method security works via AOP proxies. When a method calls another method on the same object (this.method()), it bypasses the proxy and the @PreAuthorize check is never invoked. The solution is to restructure the call to go through a separate bean.',
  },
  {
    question: 'What does this expression mean: @PreAuthorize("@productSecurity.isOwner(#id, authentication)")?',
    options: [
      'Calls the static method isOwner() on the ProductSecurity class',
      'Calls isOwner() on the productSecurity Spring bean, passing the id parameter and the current Authentication',
      'Checks if the authenticated user\'s username equals "productSecurity"',
      'Runs a database query named productSecurity.isOwner',
    ],
    correctIndex: 1,
    explanation: 'The @ prefix in SpEL refers to a Spring bean by name. #id accesses the method parameter named "id". "authentication" is a built-in SpEL variable providing the current Authentication object. This pattern externalizes complex authorization logic into a testable component.',
  },
  {
    question: 'Which annotation would you use to filter items from a returned collection, removing any elements the current user is not permitted to see?',
    options: [
      '@PreAuthorize with a collection check',
      '@PostFilter',
      '@SecuredCollection',
      '@ResponseFilter',
    ],
    correctIndex: 1,
    explanation: '@PostFilter iterates the returned collection after the method runs and removes any element for which the filterObject expression returns false. Unlike @PostAuthorize, it does not block the call — it silently removes unauthorized items.',
  },
],

'213.3': [
  {
    question: 'Why should CORS be configured in Spring Security rather than only in Spring MVC @CrossOrigin annotations for a secured API?',
    options: [
      '@CrossOrigin is deprecated and no longer works',
      'Spring Security processes requests before Spring MVC, so MVC-level CORS is never reached for unauthorized requests',
      'Spring MVC CORS does not support the OPTIONS preflight method',
      'Spring Security and Spring MVC CORS configurations conflict and only one can be active',
    ],
    correctIndex: 1,
    explanation: 'Spring Security\'s filter chain runs before the DispatcherServlet. A preflight OPTIONS request from the browser might be rejected by Spring Security\'s authentication filter before it ever reaches your @CrossOrigin annotation. Configuring CORS in Security ensures preflight requests are handled correctly.',
  },
  {
    question: 'Why is CSRF protection unnecessary for a stateless REST API using JWT tokens in Authorization headers?',
    options: [
      'JWT tokens contain a built-in CSRF token that browsers validate automatically',
      'Browsers do not automatically send Authorization headers on cross-site requests, so there is no credential to hijack',
      'Spring Security automatically detects JWT and disables CSRF internally',
      'CSRF only affects SOAP services, not REST APIs',
    ],
    correctIndex: 1,
    explanation: 'CSRF attacks exploit the browser\'s automatic cookie sending. JWTs stored in localStorage and sent in Authorization headers are never sent automatically by the browser on cross-site requests. Without an automatic credential to hijack, the attack vector does not exist.',
  },
  {
    question: 'Which combination of CORS settings is rejected by browsers and should never be used?',
    options: [
      'allowedOrigins: ["*"] with allowCredentials: false',
      'allowedOrigins: ["https://app.example.com"] with allowCredentials: true',
      'allowedOrigins: ["*"] with allowCredentials: true',
      'allowedMethods: ["GET", "POST"] with allowCredentials: true',
    ],
    correctIndex: 2,
    explanation: 'The CORS spec explicitly prohibits the wildcard origin (*) when credentials (cookies, Authorization headers) are involved. Browsers enforce this and will block responses with this combination. Use specific origins when credentials are needed.',
  },
  {
    question: 'What does the X-Content-Type-Options: nosniff header prevent?',
    options: [
      'Clickjacking attacks via iframe embedding',
      'SQL injection through Content-Type headers',
      'Browsers from ignoring the declared Content-Type and treating responses as a different type',
      'Cross-site scripting via content negotiation',
    ],
    correctIndex: 2,
    explanation: 'MIME sniffing lets browsers guess the content type if it looks different from the declared type. Attackers can abuse this to get a browser to execute a response as script even if served with a non-script Content-Type. nosniff tells the browser to trust the declared type.',
  },
  {
    question: 'In a SecurityFilterChain with multiple requestMatchers rules, what happens if anyRequest().authenticated() appears before a specific permitAll() rule?',
    options: [
      'Spring Security automatically reorders rules to put specific matchers first',
      'The permitAll() rule is never reached — all requests require authentication because anyRequest() matches first',
      'Both rules apply and the most permissive one wins',
      'A startup exception is thrown indicating the configuration is invalid',
    ],
    correctIndex: 1,
    explanation: 'Authorization rules are evaluated top-to-bottom and the first match wins. anyRequest() matches every URL, so placing it before specific rules makes those specific rules unreachable. Specific rules must always come before anyRequest().',
  },
],
}

export const codingTask: Record<string, {
  instructions: string; boilerplate: string; rubric: string[]; hints: string[]
}> = {

'213.3': {
  instructions: `Configure Spring Security 6.x for a stateless REST API with the following requirements:

1. **CORS**: Allow requests from \`https://app.example.com\`. Permitted methods: GET, POST, PUT, DELETE, PATCH, OPTIONS. Permitted headers: Authorization, Content-Type. Allow credentials. Apply to all \`/api/**\` paths.

2. **CSRF**: Disable (stateless JWT API).

3. **Session management**: Stateless.

4. **Authorization rules** (in order):
   - \`/api/auth/**\` — public
   - \`/actuator/health\` — public
   - \`/api/admin/**\` — requires ROLE_ADMIN
   - Everything else — requires authentication

5. **Method security**: Enable \`@PreAuthorize\` and \`@PostAuthorize\`.

6. **PasswordEncoder**: BCrypt with strength 12.

Implement the complete \`SecurityConfig\` class.`,
  boilerplate: `package com.example.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        // TODO: Configure CORS using corsConfigurationSource()
        // TODO: Disable CSRF
        // TODO: Set session management to STATELESS
        // TODO: Configure authorization rules in the correct order:
        //        /api/auth/** and /actuator/health → permitAll
        //        /api/admin/** → hasRole("ADMIN")
        //        anyRequest → authenticated
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        // TODO: Create CorsConfiguration
        //   allowedOrigins: https://app.example.com
        //   allowedMethods: GET, POST, PUT, DELETE, PATCH, OPTIONS
        //   allowedHeaders: Authorization, Content-Type
        //   allowCredentials: true
        //   maxAge: 3600
        // TODO: Register for /api/** and return the source
        return null;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        // TODO: Return BCryptPasswordEncoder with strength 12
        return null;
    }
}`,
  rubric: [
    '.cors(cors -> cors.configurationSource(corsConfigurationSource())) is called',
    '.csrf(csrf -> csrf.disable()) is present',
    'SessionCreationPolicy.STATELESS is set via sessionManagement',
    'requestMatchers("/api/auth/**") and "/actuator/health" are permitAll()',
    'requestMatchers("/api/admin/**") requires hasRole("ADMIN")',
    'anyRequest().authenticated() is the last rule',
    'CorsConfiguration.setAllowedOrigins includes https://app.example.com',
    'CorsConfiguration.setAllowCredentials(true) is set',
    'corsConfigurationSource registers config for /api/**',
    'BCryptPasswordEncoder is constructed with strength 12',
  ],
  hints: [
    'The lambda DSL pattern is: http.cors(cors -> cors.configurationSource(myBean())).csrf(csrf -> csrf.disable())',
    'Session management: http.sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))',
    'Authorization: http.authorizeHttpRequests(auth -> auth.requestMatchers(...).permitAll() ... .anyRequest().authenticated())',
    'For CORS: new CorsConfiguration(), set all fields, then new UrlBasedCorsConfigurationSource() and source.registerCorsConfiguration("/api/**", config)',
    'new BCryptPasswordEncoder(12) — the int constructor sets the strength',
  ],
},
}
