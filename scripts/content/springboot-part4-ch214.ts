// Part IV — Security + Testcontainers
// Chapter 214: JWT Authentication & OAuth2

import type { QuizQuestion } from '../../src/data/curriculum'

export const courseId = 'springboot-ai-architect'

export const content: Record<string, string> = {

'214.1': `# JWT Authentication from Scratch in Spring Boot 3.x

JSON Web Tokens (JWT) are the standard for stateless authentication in modern REST APIs. Understanding how to implement JWT from first principles — rather than copying boilerplate — makes you able to debug authentication failures, extend the token with custom claims, and reason about security trade-offs.

## What is a JWT?

A JWT is three Base64url-encoded segments separated by dots:

\`\`\`
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9   ← Header (algorithm + type)
.eyJzdWIiOiJ1c2VyQGV4YW1wbGUuY29tIn0   ← Payload (claims)
.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV    ← Signature (HMAC or RSA)
\`\`\`

The payload contains **claims** — statements about the user:

\`\`\`json
{
  "sub": "user@example.com",     // subject — the user identity
  "iat": 1716000000,             // issued at (Unix timestamp)
  "exp": 1716086400,             // expiry (24h later)
  "roles": ["ROLE_USER"],        // custom claim
  "tenantId": "acme-corp"        // custom claim for multi-tenancy
}
\`\`\`

The signature proves the token wasn't tampered with. Anyone can decode the payload (it's just Base64) — never put secrets like passwords in a JWT.

## Dependency

Add the JJWT library:

\`\`\`xml
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>0.12.6</version>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>
    <version>0.12.6</version>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-jackson</artifactId>
    <version>0.12.6</version>
    <scope>runtime</scope>
</dependency>
\`\`\`

## JwtService — Token Creation and Validation

\`\`\`java
@Service
public class JwtService {

    @Value("\${app.jwt.secret}")
    private String jwtSecret;

    @Value("\${app.jwt.expiration-ms:86400000}")  // 24h default
    private long expirationMs;

    private SecretKey getSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(jwtSecret);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateToken(UserDetails userDetails) {
        return generateToken(Map.of(), userDetails);
    }

    public String generateToken(Map<String, Object> extraClaims, UserDetails userDetails) {
        return Jwts.builder()
            .claims(extraClaims)
            .subject(userDetails.getUsername())
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + expirationMs))
            .signWith(getSigningKey())
            .compact();
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        Claims claims = Jwts.parser()
            .verifyWith(getSigningKey())
            .build()
            .parseSignedClaims(token)
            .getPayload();
        return claimsResolver.apply(claims);
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        String username = extractUsername(token);
        return username.equals(userDetails.getUsername()) && !isTokenExpired(token);
    }

    private boolean isTokenExpired(String token) {
        return extractClaim(token, Claims::getExpiration).before(new Date());
    }
}
\`\`\`

Store the secret in \`application.yml\` via an environment variable, never hardcoded:

\`\`\`yaml
app:
  jwt:
    secret: \${JWT_SECRET}
    expiration-ms: 86400000
\`\`\`

Generate a strong secret:
\`\`\`bash
openssl rand -base64 64
\`\`\`

## JwtAuthenticationFilter

The filter extracts the JWT from the \`Authorization: Bearer <token>\` header, validates it, and sets the \`SecurityContextHolder\` for the duration of the request:

\`\`\`java
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String jwt = authHeader.substring(7);
        String username;

        try {
            username = jwtService.extractUsername(jwt);
        } catch (JwtException e) {
            // Invalid token — proceed without authentication
            filterChain.doFilter(request, response);
            return;
        }

        if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            UserDetails userDetails = userDetailsService.loadUserByUsername(username);
            if (jwtService.isTokenValid(jwt, userDetails)) {
                UsernamePasswordAuthenticationToken authToken =
                    new UsernamePasswordAuthenticationToken(
                        userDetails, null, userDetails.getAuthorities());
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }
        filterChain.doFilter(request, response);
    }
}
\`\`\`

## Registering the Filter

Add the filter to the security chain before Spring's \`UsernamePasswordAuthenticationFilter\`:

\`\`\`java
@Bean
public SecurityFilterChain filterChain(HttpSecurity http,
                                        JwtAuthenticationFilter jwtFilter) throws Exception {
    http
        // ... other config ...
        .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
    return http.build();
}
\`\`\`

## Auth Controller

\`\`\`java
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;
    private final JwtService jwtService;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody @Valid LoginRequest request) {
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.email(), request.password())
        );
        UserDetails userDetails = userDetailsService.loadUserByUsername(request.email());
        String token = jwtService.generateToken(userDetails);
        return ResponseEntity.ok(new AuthResponse(token));
    }
}
\`\`\`

Don't forget to expose the \`AuthenticationManager\` bean:

\`\`\`java
@Bean
public AuthenticationManager authenticationManager(AuthenticationConfiguration config)
        throws Exception {
    return config.getAuthenticationManager();
}
\`\`\`

## Token Size and Claims

JWTs are sent on every request. Keep them small — avoid putting large objects or entire user profiles in claims. A typical production JWT contains: \`sub\`, \`iat\`, \`exp\`, \`roles\` (or \`scope\`), and at most one or two custom claims like \`tenantId\`.`,

'214.2': `# OAuth2 Resource Server & OIDC with Spring Security

Building your own JWT implementation is valuable for learning, but production systems increasingly delegate authentication to a dedicated Identity Provider (IdP): Keycloak, Auth0, Okta, or Google. Spring Security's OAuth2 Resource Server support lets you validate tokens issued by an external IdP with minimal code.

## The OAuth2 Roles

| Role | Description | Example |
|---|---|---|
| **Resource Owner** | The user who owns the data | A customer |
| **Client** | The app requesting access | Your React frontend |
| **Authorization Server** | Issues tokens after auth | Keycloak, Auth0 |
| **Resource Server** | Holds protected data | Your Spring Boot API |

Your Spring Boot API acts as the **Resource Server** — it validates tokens from the Authorization Server and serves protected data.

## Spring Security OAuth2 Resource Server

Add the dependency:

\`\`\`xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-oauth2-resource-server</artifactId>
</dependency>
\`\`\`

Configure in \`application.yml\`:

\`\`\`yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          # OIDC discovery endpoint — Spring fetches public keys automatically
          issuer-uri: https://your-keycloak-host/realms/your-realm
          # OR: static JWKS endpoint
          # jwk-set-uri: https://your-keycloak-host/realms/your-realm/protocol/openid-connect/certs
\`\`\`

Enable in your \`SecurityFilterChain\`:

\`\`\`java
http.oauth2ResourceServer(oauth2 -> oauth2
    .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter()))
);
\`\`\`

Spring Security now automatically:
1. Extracts the Bearer token from the \`Authorization\` header
2. Fetches the IdP's public keys via JWKS (cached, refreshed on key rotation)
3. Validates the signature, issuer, and expiry
4. Converts the JWT claims to a Spring \`Authentication\` object

## JWT Authentication Converter

Keycloak and Auth0 encode roles differently from Spring Security's expected \`ROLE_\` prefix format. Write a converter:

\`\`\`java
@Bean
public JwtAuthenticationConverter jwtAuthenticationConverter() {
    JwtGrantedAuthoritiesConverter grantedAuthoritiesConverter = new JwtGrantedAuthoritiesConverter();

    // Keycloak puts roles in realm_access.roles
    grantedAuthoritiesConverter.setAuthoritiesClaimName("realm_access.roles");
    grantedAuthoritiesConverter.setAuthorityPrefix("ROLE_");

    JwtAuthenticationConverter jwtConverter = new JwtAuthenticationConverter();
    jwtConverter.setJwtGrantedAuthoritiesConverter(grantedAuthoritiesConverter);
    return jwtConverter;
}
\`\`\`

For Auth0, roles may be in a custom namespace claim. For Okta, they are in \`groups\`. Check your IdP's token documentation.

## OIDC Discovery

When you set \`issuer-uri\`, Spring Boot fetches the OIDC discovery document at startup:

\`\`\`
GET https://your-keycloak-host/realms/your-realm/.well-known/openid-configuration
\`\`\`

This returns the JWKS URI, supported algorithms, and other metadata. Spring caches the public keys and refreshes when it encounters a \`kid\` (key ID) it doesn't recognise — this handles key rotation automatically.

## Validating Custom Claims

Add additional claim validations using a custom \`JwtDecoder\`:

\`\`\`java
@Bean
public JwtDecoder jwtDecoder() {
    NimbusJwtDecoder decoder = JwtDecoders.fromIssuerLocation(issuerUri);

    // Add custom validator — e.g., verify audience claim
    OAuth2TokenValidator<Jwt> audienceValidator = token -> {
        if (token.getAudience().contains("my-api")) {
            return OAuth2TokenValidatorResult.success();
        }
        return OAuth2TokenValidatorResult.failure(
            new OAuth2Error("invalid_token", "Wrong audience", null));
    };

    OAuth2TokenValidator<Jwt> withIssuer = JwtValidators.createDefaultWithIssuer(issuerUri);
    OAuth2TokenValidator<Jwt> withAudience = new DelegatingOAuth2TokenValidator<>(
        withIssuer, audienceValidator);

    decoder.setJwtValidator(withAudience);
    return decoder;
}
\`\`\`

## Accessing Claims in Controllers

Once the token is validated, extract claims from the \`JwtAuthenticationToken\` in your controllers:

\`\`\`java
@GetMapping("/api/me")
public UserProfileDto getMyProfile(Authentication authentication) {
    Jwt jwt = (Jwt) authentication.getPrincipal();
    String userId = jwt.getSubject();
    String email = jwt.getClaimAsString("email");
    List<String> roles = jwt.getClaimAsStringList("realm_access.roles");
    return new UserProfileDto(userId, email, roles);
}
\`\`\`

Or use \`@AuthenticationPrincipal\`:

\`\`\`java
@GetMapping("/api/me")
public UserProfileDto getMyProfile(@AuthenticationPrincipal Jwt jwt) {
    return new UserProfileDto(jwt.getSubject(), jwt.getClaimAsString("email"));
}
\`\`\`

## Testing with Mock JWTs

Spring Security Test provides \`mockJwt()\` for writing controller tests without a real IdP:

\`\`\`java
@WebMvcTest(UserController.class)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void authenticated_user_gets_their_profile() throws Exception {
        mockMvc.perform(get("/api/me")
                .with(jwt().jwt(builder -> builder
                    .subject("user-123")
                    .claim("email", "user@example.com")
                    .claim("realm_access", Map.of("roles", List.of("USER"))))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.userId").value("user-123"));
    }
}
\`\`\`

## When to Build Your Own JWT vs Use an IdP

| Use your own JWT | Use an IdP (Keycloak / Auth0) |
|---|---|
| Simple internal service with one client | Multi-client SaaS with external users |
| Learning exercise | Production systems with compliance requirements |
| No SSO requirement | SSO across multiple applications |
| Full control over the stack | Need social login, MFA, user management UI |`,

'214.3': `# Refresh Tokens & Token Security

Access tokens are intentionally short-lived (15 minutes to 24 hours). Short lifetimes limit the damage from a stolen token — it expires before an attacker can do much. But forcing users to log in every 15 minutes is unacceptable UX. Refresh tokens solve this: they are long-lived, stored securely, and used only to obtain new access tokens.

## The Refresh Token Flow

\`\`\`
Client                    API
  |                         |
  |── POST /auth/login ────>|
  |<─ { accessToken,        |
  |     refreshToken } ─────|
  |                         |
  |  (accessToken expires)  |
  |                         |
  |── POST /auth/refresh ──>| (sends refreshToken)
  |<─ { newAccessToken,     |
  |     newRefreshToken } ──| (old refreshToken is invalidated)
  |                         |
  |── GET /api/resource ───>| (with newAccessToken)
\`\`\`

The key security property is **refresh token rotation**: every refresh issues a new refresh token and invalidates the old one. If a stolen refresh token is used, it will conflict with the legitimate user's token and signal an attack.

## Storing Refresh Tokens

Refresh tokens must be stored server-side (unlike access tokens, which are stateless). Redis is the right choice: it has built-in TTL, fast lookups, and is horizontally scalable.

\`\`\`java
@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private final StringRedisTemplate redisTemplate;
    private final JwtService jwtService;

    private static final String PREFIX = "refresh:";
    private static final Duration REFRESH_TTL = Duration.ofDays(7);

    public String createRefreshToken(String username) {
        String token = UUID.randomUUID().toString();
        redisTemplate.opsForValue().set(
            PREFIX + token,
            username,
            REFRESH_TTL
        );
        return token;
    }

    public Optional<String> validateAndRotate(String refreshToken) {
        String key = PREFIX + refreshToken;
        String username = redisTemplate.opsForValue().get(key);

        if (username == null) {
            return Optional.empty(); // expired or already used
        }

        // Rotate: delete old, create new
        redisTemplate.delete(key);
        String newRefreshToken = createRefreshToken(username);

        return Optional.of(newRefreshToken);
    }

    public void revokeAllForUser(String username) {
        // Called on logout — scan is O(N) but acceptable for infrequent operation
        Set<String> keys = redisTemplate.keys(PREFIX + "*");
        if (keys != null) {
            keys.stream()
                .filter(k -> username.equals(redisTemplate.opsForValue().get(k)))
                .forEach(redisTemplate::delete);
        }
    }
}
\`\`\`

## The Refresh Endpoint

\`\`\`java
@PostMapping("/api/auth/refresh")
public ResponseEntity<AuthResponse> refresh(@RequestBody RefreshRequest request) {
    return refreshTokenService.validateAndRotate(request.refreshToken())
        .map(newRefreshToken -> {
            // Re-load user to get current roles (may have changed since last login)
            String username = // extract from new token... store username when rotating
            UserDetails userDetails = userDetailsService.loadUserByUsername(username);
            String newAccessToken = jwtService.generateToken(userDetails);
            return ResponseEntity.ok(new AuthResponse(newAccessToken, newRefreshToken));
        })
        .orElseGet(() -> ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
}
\`\`\`

## Token Security Best Practices

### Access Token Storage (Client Side)
- **SPA (React/Vue)**: Store in memory (JavaScript variable), not localStorage. LocalStorage is accessible to XSS-injected scripts. Use an HttpOnly cookie for the refresh token.
- **Mobile apps**: Use the platform secure storage (Android Keystore, iOS Keychain).
- **Server-to-server**: Environment variable or secrets manager; never in code.

### HttpOnly Cookies for Refresh Tokens

For browser clients, send the refresh token as an HttpOnly cookie rather than in the response body:

\`\`\`java
@PostMapping("/api/auth/login")
public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request,
                                           HttpServletResponse httpResponse) {
    // ... authenticate, generate tokens ...

    ResponseCookie refreshCookie = ResponseCookie.from("refresh_token", refreshToken)
        .httpOnly(true)        // JS cannot read this cookie
        .secure(true)          // HTTPS only
        .sameSite("Strict")    // CSRF protection
        .maxAge(Duration.ofDays(7))
        .path("/api/auth/refresh")  // Scoped to only the refresh endpoint
        .build();

    httpResponse.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());

    return ResponseEntity.ok(new AuthResponse(accessToken)); // Only access token in body
}
\`\`\`

### Logout

Logout must invalidate the refresh token in Redis. The access token will expire on its own:

\`\`\`java
@PostMapping("/api/auth/logout")
public ResponseEntity<Void> logout(Authentication authentication,
                                    HttpServletResponse response) {
    String username = authentication.getName();
    refreshTokenService.revokeAllForUser(username);

    // Clear the refresh cookie
    ResponseCookie expiredCookie = ResponseCookie.from("refresh_token", "")
        .httpOnly(true).secure(true).maxAge(0).path("/api/auth/refresh").build();
    response.addHeader(HttpHeaders.SET_COOKIE, expiredCookie.toString());

    return ResponseEntity.noContent().build();
}
\`\`\`

### Token Revocation Detection

When a refresh token is used twice (replay attack), the second use finds it already deleted from Redis and returns 401. Log this event and optionally invalidate all sessions for the user:

\`\`\`java
public Optional<String> validateAndRotate(String refreshToken) {
    String key = PREFIX + refreshToken;
    String username = redisTemplate.opsForValue().get(key);

    if (username == null) {
        log.warn("Refresh token reuse detected or expired for token hash: {}",
            Integer.toHexString(refreshToken.hashCode())); // Don't log the actual token
        // Optionally: revoke all sessions for the suspect user
        return Optional.empty();
    }
    // ... rotate ...
}
\`\`\`

## Access Token Expiry Guidelines

| Use case | Access token TTL | Refresh token TTL |
|---|---|---|
| High-security (banking, healthcare) | 5–15 minutes | 1–8 hours |
| Standard SaaS | 1–4 hours | 7–30 days |
| Internal tools | 24 hours | 90 days |
| Mobile apps | 1 hour | 90–180 days |

Shorter access tokens mean more refresh operations and slightly higher Redis load. For most SaaS applications, 1-hour access tokens with 30-day refresh tokens (with rotation) is a sensible starting point.`,
}

export const quiz: Record<string, QuizQuestion[]> = {

'214.1': [
  {
    question: 'Which part of a JWT contains the user\'s claims (subject, roles, expiry)?',
    options: [
      'The Header — the first segment',
      'The Payload — the second segment',
      'The Signature — the third segment',
      'Claims are stored outside the token in a database',
    ],
    correctIndex: 1,
    explanation: 'The JWT Payload (second segment) contains the claims. It is Base64url-encoded but not encrypted — anyone can decode it. The Signature proves it wasn\'t tampered with, but the claims themselves are readable without the secret key.',
  },
  {
    question: 'Why should you never put a user\'s password in a JWT claim?',
    options: [
      'JWTs are limited to 4KB and passwords would exceed this',
      'JWT claims are only Base64-encoded, not encrypted — anyone who intercepts the token can decode them',
      'Spring Security automatically strips passwords from JWT claims for security',
      'Passwords cannot be serialized to JSON format',
    ],
    correctIndex: 1,
    explanation: 'Base64 encoding is not encryption. Any party that receives or intercepts the JWT can trivially decode all three segments. Sensitive data like passwords, SSNs, or API keys must never appear in JWT claims.',
  },
  {
    question: 'In the JwtAuthenticationFilter, why do we check SecurityContextHolder.getContext().getAuthentication() == null before processing the token?',
    options: [
      'To avoid NullPointerException if the authentication object is missing',
      'To prevent overwriting an existing authentication set by an earlier filter in the chain',
      'Because getAuthentication() blocks until the DB responds',
      'Spring Security requires this check before any filter can proceed',
    ],
    correctIndex: 1,
    explanation: 'Multiple filters can set the SecurityContext. If a previous filter already authenticated the request (e.g., a session-based filter), we should not override that with JWT authentication. This null check prevents double-authentication.',
  },
  {
    question: 'Where should you store the JWT secret in a Spring Boot application?',
    options: [
      'Hardcoded in JwtService as a static final String',
      'In application.yml, read from an environment variable at runtime',
      'In a public GitHub repository alongside the code',
      'Embedded in the JWT header for easy retrieval',
    ],
    correctIndex: 1,
    explanation: 'The JWT secret must never be hardcoded or committed to version control. Store it in an environment variable and reference it in application.yml with ${JWT_SECRET}. Use a secrets manager (AWS Secrets Manager, HashiCorp Vault) in production.',
  },
  {
    question: 'Which filter position should JwtAuthenticationFilter be registered at?',
    options: [
      'After UsernamePasswordAuthenticationFilter, so basic auth runs first',
      'Before UsernamePasswordAuthenticationFilter, so JWT takes precedence',
      'At the very end of the filter chain, after all other security checks',
      'Position doesn\'t matter — Spring Security automatically determines the order',
    ],
    correctIndex: 1,
    explanation: 'addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class) ensures the JWT filter runs first. If the JWT is valid, the SecurityContext is populated before UsernamePasswordAuthenticationFilter runs, which then skips its own processing.',
  },
],

'214.2': [
  {
    question: 'When using Spring Security OAuth2 Resource Server with issuer-uri, how are the IdP\'s public keys obtained?',
    options: [
      'You manually download and paste the public key into application.yml',
      'Spring Boot fetches them from the JWKS endpoint discovered via the OIDC discovery document at startup',
      'Public keys are embedded in each JWT token',
      'Spring generates matching keys locally from the issuer-uri string',
    ],
    correctIndex: 1,
    explanation: 'Spring Boot uses the issuer-uri to fetch the OIDC discovery document (/.well-known/openid-configuration), which contains the JWKS endpoint. Spring then fetches and caches the public keys, refreshing when it encounters an unknown key ID (kid).',
  },
  {
    question: 'Why is a JwtAuthenticationConverter needed when integrating with Keycloak?',
    options: [
      'Keycloak tokens are encrypted and need decryption before Spring can read them',
      'Keycloak stores roles in a different claim path (realm_access.roles) than Spring Security\'s default, and without a converter roles are not mapped to Spring authorities',
      'Spring Security cannot validate Keycloak tokens without this converter',
      'The converter changes the token format from JWT to opaque tokens',
    ],
    correctIndex: 1,
    explanation: 'Spring Security\'s default JWT converter looks for authorities in the "scope" claim with a "SCOPE_" prefix. Keycloak puts roles in "realm_access.roles". Without a custom converter, @PreAuthorize("hasRole(\'USER\')") will never match even for authenticated users.',
  },
  {
    question: 'What is the advantage of using @AuthenticationPrincipal Jwt over Authentication authentication in a controller method?',
    options: [
      '@AuthenticationPrincipal performs additional validation before the method is called',
      'It directly provides the Jwt object without casting from Authentication.getPrincipal()',
      'Authentication authentication only works for form-based login, not JWT',
      'There is no advantage — they are identical',
    ],
    correctIndex: 1,
    explanation: '@AuthenticationPrincipal Jwt is a convenience annotation that resolves to (Jwt) authentication.getPrincipal() automatically. It removes the cast, makes the method signature self-documenting, and is directly testable with Spring\'s mockJwt() test support.',
  },
  {
    question: 'In which scenario is it most appropriate to build your own JWT implementation rather than using an IdP like Keycloak or Auth0?',
    options: [
      'When your application has external users who need social login',
      'When you need MFA enforcement across multiple applications',
      'For a simple internal microservice with one trusted client — a learning exercise or where full stack control is required',
      'When compliance requires SOC2 or GDPR certification',
    ],
    correctIndex: 2,
    explanation: 'External IdPs shine for multi-client SaaS, social login, SSO, and compliance scenarios. For simple internal services, a custom JWT implementation is lighter-weight and avoids an infrastructure dependency. It\'s also the right choice for understanding how JWT works.',
  },
  {
    question: 'How does the OAuth2 Resource Server automatically handle IdP key rotation?',
    options: [
      'You must restart the Spring Boot application whenever keys rotate',
      'When it encounters a JWT with an unknown key ID (kid), it re-fetches the JWKS endpoint to pick up new keys',
      'Key rotation is not supported — you must use static keys',
      'Spring Security subscribes to a webhook from the IdP for key rotation events',
    ],
    correctIndex: 1,
    explanation: 'Each JWT contains a "kid" (key ID) in its header. If Spring\'s cached JWKS doesn\'t contain that kid, it re-fetches the JWKS endpoint. This zero-downtime key rotation mechanism is one of the main advantages of using JWKS over static public key configuration.',
  },
],

'214.3': [
  {
    question: 'What is "refresh token rotation" and why does it improve security?',
    options: [
      'Rotating the JWT signing algorithm on each token issuance',
      'Issuing a new refresh token on every use and invalidating the old one, so replay attacks using a stolen token are detectable',
      'Encrypting the refresh token with a new key every 24 hours',
      'Changing the refresh token\'s storage location from Redis to the database on each use',
    ],
    correctIndex: 1,
    explanation: 'Rotation means each refresh operation issues a new refresh token and invalidates the old one. If an attacker steals the old token and tries to use it, the server detects the conflict (the legitimate user already rotated it) and can invalidate all sessions.',
  },
  {
    question: 'Why is Redis preferred over a relational database for storing refresh tokens?',
    options: [
      'Redis supports JPA repositories, making it easy to integrate with existing Spring Data code',
      'Redis has built-in TTL support, is extremely fast for single-key lookups, and scales horizontally without complex schema migrations',
      'Redis tokens are automatically encrypted at rest, unlike relational databases',
      'Spring Security only supports Redis for refresh token storage',
    ],
    correctIndex: 1,
    explanation: 'Redis is a natural fit: TTL handles expiry without a scheduled cleanup job, single-key reads are O(1) and sub-millisecond, and it scales horizontally with Redis Cluster. A relational database can work but requires a scheduled purge job and is slower for this type of operation.',
  },
  {
    question: 'Why should a browser SPA store access tokens in memory (a JS variable) rather than localStorage?',
    options: [
      'localStorage is too slow for frequent access token reads',
      'localStorage is accessible to any JavaScript on the page, including XSS-injected scripts, while memory is not',
      'Access tokens are too large to fit in localStorage\'s 5MB limit',
      'Spring Security automatically clears localStorage on logout, but not memory',
    ],
    correctIndex: 1,
    explanation: 'Any script running on the page — including malicious scripts injected via XSS — can read localStorage. An in-memory variable is only accessible to your own code within the same closure. The trade-off is that in-memory tokens are lost on page refresh, requiring a refresh token flow to recover.',
  },
  {
    question: 'What should happen when a refresh token is presented a second time (replay attack)?',
    options: [
      'Issue a new access token — treat all presented refresh tokens as valid regardless of history',
      'Return 401 and optionally revoke all sessions for the affected user, then log the event',
      'Silently ignore the second use and return the same tokens as the first use',
      'Block the IP address for 24 hours',
    ],
    correctIndex: 1,
    explanation: 'The second use of a rotated-away refresh token is evidence of either a stolen token or a bug. The correct response is: deny the request (401), log the anomaly (without logging the token itself), and optionally revoke all sessions for that user as a precaution.',
  },
  {
    question: 'Why is scoping the refresh token cookie to path="/api/auth/refresh" a security improvement?',
    options: [
      'It encrypts the cookie when sent to that path',
      'The browser only sends the refresh cookie to the /api/auth/refresh endpoint, so a compromised API endpoint on another path cannot read it',
      'Spring Security automatically validates the cookie path before processing it',
      'It reduces cookie size by limiting the path string length',
    ],
    correctIndex: 1,
    explanation: 'Cookie path scoping means the browser attaches the cookie only to requests matching that path. Even if an attacker exploits another endpoint (e.g., an SSRF vulnerability), they cannot access the refresh cookie because the browser won\'t send it to other paths.',
  },
],
}

export const codingTask: Record<string, {
  instructions: string; boilerplate: string; rubric: string[]; hints: string[]
}> = {

'214.1': {
  instructions: `Implement a \`JwtService\` class that handles JWT generation and validation for a Spring Boot 3.x REST API.

Requirements:
1. Read the JWT secret from property \`app.jwt.secret\` (Base64-encoded) and expiration from \`app.jwt.expiration-ms\` (default 86400000ms = 24h).
2. \`generateToken(UserDetails userDetails)\` — creates a signed JWT with subject = username, iat = now, exp = now + expirationMs.
3. \`generateToken(Map<String, Object> extraClaims, UserDetails userDetails)\` — same but includes extra claims.
4. \`extractUsername(String token)\` — returns the subject claim.
5. \`isTokenValid(String token, UserDetails userDetails)\` — returns true if the username matches AND the token is not expired.

Use the JJWT 0.12.x API (\`Jwts.builder()\`, \`Jwts.parser().verifyWith(...).build()\`).`,
  boilerplate: `package com.example.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.Map;
import java.util.function.Function;

@Service
public class JwtService {

    @Value("\${app.jwt.secret}")
    private String jwtSecret;

    @Value("\${app.jwt.expiration-ms:86400000}")
    private long expirationMs;

    private SecretKey getSigningKey() {
        // TODO: Base64-decode jwtSecret and return an HMAC SecretKey
        return null;
    }

    public String generateToken(UserDetails userDetails) {
        return generateToken(Map.of(), userDetails);
    }

    public String generateToken(Map<String, Object> extraClaims, UserDetails userDetails) {
        // TODO: Build and sign a JWT with:
        //   - extraClaims as additional claims
        //   - subject = userDetails.getUsername()
        //   - issuedAt = now
        //   - expiration = now + expirationMs
        //   - signed with getSigningKey()
        return null;
    }

    public String extractUsername(String token) {
        // TODO: Extract the subject claim
        return null;
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        // TODO: Parse the token with verifyWith(getSigningKey()),
        //       get the payload Claims, then apply claimsResolver
        return null;
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        // TODO: Return true if username matches AND token is not expired
        return false;
    }

    private boolean isTokenExpired(String token) {
        // TODO: Return true if the expiration claim is before now
        return false;
    }
}`,
  rubric: [
    'getSigningKey() uses Decoders.BASE64.decode(jwtSecret) and Keys.hmacShaKeyFor()',
    'generateToken builds with Jwts.builder().claims(extraClaims).subject(...).issuedAt(new Date()).expiration(new Date(System.currentTimeMillis() + expirationMs)).signWith(getSigningKey()).compact()',
    'extractClaim parses with Jwts.parser().verifyWith(getSigningKey()).build().parseSignedClaims(token).getPayload()',
    'extractUsername delegates to extractClaim with Claims::getSubject',
    'isTokenValid checks username equality AND !isTokenExpired()',
    'isTokenExpired extracts the expiration claim and checks .before(new Date())',
  ],
  hints: [
    'Decoders.BASE64.decode(jwtSecret) returns a byte[], then Keys.hmacShaKeyFor(bytes) creates the SecretKey',
    'Jwts.builder().claims(map).subject(s).issuedAt(d).expiration(d).signWith(key).compact()',
    'Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload() returns Claims',
    'extractClaim(token, Claims::getSubject) gives the username',
    'extractClaim(token, Claims::getExpiration) gives a Date — call .before(new Date())',
  ],
},
}
