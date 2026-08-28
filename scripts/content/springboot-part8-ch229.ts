// Part VIII — Cloud, Kubernetes & CI/CD
// Chapter 229: Containerizing Spring Boot — Docker & Jib

import type { QuizQuestion } from '../../src/data/curriculum'

export const courseId = 'springboot-ai-architect'

export const content: Record<string, string> = {

'229.1': `# Dockerfile Best Practices for Spring Boot

A well-crafted Dockerfile is the foundation of every containerized Spring Boot deployment. The choices made here affect image size, build speed, security, and startup time.

## The Naive Dockerfile (Don't Use)

\`\`\`dockerfile
FROM openjdk:21
COPY target/app.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
\`\`\`

Problems:
- **Root user** — runs as root inside the container (security risk)
- **No layer caching** — any code change rebuilds the entire layer with the fat JAR
- **openjdk is deprecated** — use eclipse-temurin or amazoncorretto
- **No JVM memory tuning** — container memory limits are ignored

## Production Dockerfile — Layered Build

\`\`\`dockerfile
# ---- Build stage ----
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /workspace

COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .
# Cache dependencies separately from source
RUN ./mvnw dependency:go-offline -q

COPY src src
RUN ./mvnw package -DskipTests -q

# Extract layers from the fat JAR for better caching
RUN java -Djarmode=layertools -jar target/*.jar extract --destination extracted

# ---- Runtime stage ----
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Copy in order of least-to-most-frequently-changed (for layer cache efficiency)
COPY --from=build /workspace/extracted/dependencies ./
COPY --from=build /workspace/extracted/spring-boot-loader ./
COPY --from=build /workspace/extracted/snapshot-dependencies ./
COPY --from=build /workspace/extracted/application ./

# JVM options: respect container memory, enable virtual threads, optimize for containers
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 \
               -XX:+ExitOnOutOfMemoryError \
               -Djava.security.egd=file:/dev/./urandom"

EXPOSE 8080
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS org.springframework.boot.loader.launch.JarLauncher"]
\`\`\`

## Spring Boot Layered JARs

Spring Boot 2.3+ creates layered JARs. Extract them for optimal Docker layer caching:

\`\`\`
application/     <- your code (changes often)
  BOOT-INF/classes/
  BOOT-INF/classpath.idx
snapshot-dependencies/  <- SNAPSHOT libraries (change occasionally)
spring-boot-loader/     <- Spring Boot loader (changes rarely)
dependencies/           <- stable libraries (changes rarely)
\`\`\`

When you change only your application code, Docker reuses the cached dependencies layers. Only the tiny \`application/\` layer is rebuilt and pushed.

## JVM Container Awareness

Modern JVMs (Java 11+) respect container CPU and memory limits:

\`\`\`
-XX:+UseContainerSupport      # read cgroup limits (enabled by default in JDK 11+)
-XX:MaxRAMPercentage=75.0     # use 75% of container memory for heap
-XX:InitialRAMPercentage=50.0 # start heap at 50% of container memory
\`\`\`

Without these flags on older JVMs, the JVM would see the host machine's memory (e.g., 256GB) and set heap accordingly — quickly being killed by the container runtime OOM killer.

## Image Size Optimization

| Technique | Size Saving |
|---|---|
| Use JRE not JDK in runtime stage | -100MB |
| Alpine base image | -50MB |
| Layered JAR (cache, not size) | Better CI speed |
| GraalVM native image | -200MB + faster startup |

\`\`\`bash
# Compare image sizes
docker images | grep myapp
myapp   latest   345MB
myapp   native   85MB   # GraalVM native image
\`\`\`

## Docker Compose for Local Development

\`\`\`yaml
# docker-compose.yml
services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/mydb
      SPRING_DATASOURCE_USERNAME: myuser
      SPRING_DATASOURCE_PASSWORD: mypassword
      SPRING_REDIS_HOST: redis
      SPRING_AI_OPENAI_API_KEY: \${OPENAI_API_KEY}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started

  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: mydb
      POSTGRES_USER: myuser
      POSTGRES_PASSWORD: mypassword
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U myuser -d mydb"]
      interval: 5s
      timeout: 5s
      retries: 5
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
\`\`\``,

'229.2': `# Jib — Container Images Without Docker

Jib is a Google-developed Maven/Gradle plugin that builds optimized Docker images directly from your Java source — no Docker daemon, no Dockerfile, no Docker build context.

## Why Jib?

| Aspect | Docker build | Jib |
|---|---|---|
| Docker daemon needed | Yes | No |
| Builds in CI without Docker-in-Docker | No | Yes |
| Automatic layer optimization | Manual | Automatic |
| Reproducible builds | Varies | Yes |
| Push without local registry | Complex | Simple |

Jib separates your application into the same logical layers as Spring Boot's layered JAR (dependencies, resources, classes) and only rebuilds/repushes layers that changed.

## Maven Configuration

\`\`\`xml
<plugin>
    <groupId>com.google.cloud.tools</groupId>
    <artifactId>jib-maven-plugin</artifactId>
    <version>3.4.3</version>
    <configuration>
        <from>
            <image>eclipse-temurin:21-jre-alpine</image>
        </from>
        <to>
            <image>my-registry.example.com/myapp</image>
            <tags>
                <tag>\${project.version}</tag>
                <tag>latest</tag>
            </tags>
        </to>
        <container>
            <jvmFlags>
                <jvmFlag>-XX:+UseContainerSupport</jvmFlag>
                <jvmFlag>-XX:MaxRAMPercentage=75.0</jvmFlag>
                <jvmFlag>-XX:+ExitOnOutOfMemoryError</jvmFlag>
            </jvmFlags>
            <ports>
                <port>8080</port>
            </ports>
            <user>1000:1000</user>  <!-- non-root -->
            <environment>
                <SPRING_PROFILES_ACTIVE>prod</SPRING_PROFILES_ACTIVE>
            </environment>
            <creationTime>USE_CURRENT_TIMESTAMP</creationTime>
        </container>
    </configuration>
</plugin>
\`\`\`

## Build Commands

\`\`\`bash
# Build and push to remote registry
mvn jib:build

# Build to local Docker daemon (for local testing)
mvn jib:dockerBuild

# Build to a tarball (for air-gapped environments)
mvn jib:buildTar
\`\`\`

## Spring Boot's Built-in buildpacks

Alternative: Spring Boot 2.3+ supports building OCI images via Buildpacks:

\`\`\`bash
./mvnw spring-boot:build-image -Dspring-boot.build-image.imageName=myapp:latest
\`\`\`

Cloud Native Buildpacks detect your app type and apply optimized build logic automatically. No Dockerfile needed. The resulting image uses Paketo buildpacks that include automatic memory tuning and security hardening.

## Image Security Scanning

Always scan your images for vulnerabilities before deployment:

\`\`\`bash
# Trivy — fast, comprehensive vulnerability scanner
trivy image myapp:latest

# Output:
# myapp:latest (alpine 3.19.1)
# ========================
# Total: 3 (HIGH: 1, MEDIUM: 2)
#
# +--------------+----------------+----------+-------------------+
# | Library      | Vulnerability  | Severity | Fixed Version     |
# +--------------+----------------+----------+-------------------+
# | libssl3      | CVE-2024-0727  | HIGH     | 3.1.4-r5          |
\`\`\`

Integrate Trivy into CI to fail the build on HIGH severity vulnerabilities:

\`\`\`yaml
# GitHub Actions step
- name: Scan image
  run: |
    trivy image --exit-code 1 --severity HIGH,CRITICAL myapp:\${{ github.sha }}
\`\`\`

## .dockerignore

Always include a .dockerignore to exclude unnecessary files from the build context:

\`\`\`
.git
.github
target/
*.md
.env
.env.local
**/*.log
node_modules/
\`\`\`

The build context is the directory sent to Docker daemon. A large build context (accidentally including target/ with gigabytes of build artifacts) slows every \`docker build\`.`,

'229.3': `# Application Configuration for Containers

Spring Boot applications need externalized configuration to run correctly in different environments (local, staging, production). Containers introduce new patterns for injecting configuration at runtime.

## Spring Profiles in Containers

\`\`\`yaml
# application.yml — base config
spring:
  application:
    name: myapp

# application-prod.yml — production overrides
spring:
  datasource:
    url: \${DATABASE_URL}  # injected from container env
    username: \${DATABASE_USERNAME}
    password: \${DATABASE_PASSWORD}
  ai:
    openai:
      api-key: \${OPENAI_API_KEY}
\`\`\`

Activate via environment variable in the container:

\`\`\`
SPRING_PROFILES_ACTIVE=prod
\`\`\`

## Environment Variable Overrides

Spring Boot maps environment variables to properties using a relaxed binding:

\`\`\`
Environment variable:    SPRING_DATASOURCE_URL
maps to property:        spring.datasource.url

SPRING_AI_OPENAI_APIKEY  →  spring.ai.openai.api-key
SERVER_PORT              →  server.port
\`\`\`

This means any property in application.yml can be overridden via environment variable — no code changes needed.

## Secrets Management

Never bake secrets into Docker images or environment variables in docker-compose.yml:

\`\`\`bash
# BAD: Secret visible in image layers, docker inspect, process list
docker run -e OPENAI_API_KEY=sk-abc123 myapp

# BETTER: Kubernetes Secrets (encrypted at rest)
kubectl create secret generic openai \
    --from-literal=api-key=sk-abc123

# BETTER: HashiCorp Vault integration via Spring Cloud Vault
spring:
  cloud:
    vault:
      uri: http://vault:8200
      token: \${VAULT_TOKEN}
      kv:
        enabled: true
        backend: secret
        default-context: myapp
\`\`\`

## Health Endpoints for Container Orchestration

Container orchestrators (Kubernetes, Docker Swarm) use health checks to route traffic:

\`\`\`yaml
management:
  endpoint:
    health:
      show-details: when-authorized
      probes:
        enabled: true   # enables /actuator/health/liveness and /actuator/health/readiness
  endpoints:
    web:
      exposure:
        include: health,info,prometheus
  health:
    livenessstate:
      enabled: true
    readinessstate:
      enabled: true
\`\`\`

Spring Boot Actuator exposes:
- \`/actuator/health/liveness\` — is the application alive? (restarts if DOWN)
- \`/actuator/health/readiness\` — is the application ready to serve traffic? (removes from load balancer if DOWN)

## Graceful Shutdown

Kubernetes sends SIGTERM before killing a pod. Configure Spring Boot to drain in-flight requests:

\`\`\`yaml
server:
  shutdown: graceful          # wait for in-flight requests to complete

spring:
  lifecycle:
    timeout-per-shutdown-phase: 30s  # wait up to 30 seconds
\`\`\`

## Startup Time Optimization

Fast startup is critical for horizontal scaling (quickly adding pods under load):

\`\`\`yaml
spring:
  main:
    lazy-initialization: true   # initialize beans on first use, not startup
                                # (reduces startup time but shifts first-request latency)
\`\`\`

\`\`\`java
// CDS (Class Data Sharing) — cache JVM class loading work
// Build the CDS archive:
//   java -XX:ArchiveClassesAtExit=app.jsa -jar app.jar
// Use the archive:
//   java -XX:SharedArchiveFile=app.jsa -jar app.jar
// Reduces startup by 20-40%
\`\`\``,
}

export const quiz: Record<string, QuizQuestion[]> = {

'229.1': [
  {
    question: 'Why is a multi-stage Dockerfile important for Spring Boot applications?',
    options: [
      'Multi-stage builds allow parallel compilation of multiple Java modules',
      'The build stage includes the JDK and Maven/Gradle for compilation; the runtime stage uses only the JRE — resulting in a much smaller final image that doesn\'t include build tools, source code, or intermediate artifacts',
      'Multi-stage builds enable building images for multiple architectures (amd64, arm64) simultaneously',
      'Spring Boot requires multi-stage builds for its layered JAR feature to work correctly',
    ],
    correctIndex: 1,
    explanation: 'A single-stage image including the JDK, Maven, and the full build environment can be 600MB+. The runtime only needs the JRE and the compiled JAR — typically 150-200MB. Multi-stage build: stage 1 compiles with the full toolchain; stage 2 copies only the compiled artifacts into a minimal JRE image. Build tools, source code, and .m2 cache never appear in the final image.',
  },
  {
    question: 'What does -XX:MaxRAMPercentage=75.0 do in a containerized JVM?',
    options: [
      'Limits the JVM to using 75% of the CPU allocated to the container',
      'Configures the JVM heap maximum as 75% of the container\'s memory limit — preventing the JVM from setting an enormous heap based on host memory while leaving room for off-heap allocations and OS overhead',
      'Throttles JVM garbage collection to run for no more than 75% of wall clock time',
      'Restricts the JVM to 75% of available disk I/O bandwidth',
    ],
    correctIndex: 1,
    explanation: 'Without -XX:MaxRAMPercentage (or -Xmx), the JVM reads total available memory. On a host with 256GB RAM, it might set a 192GB heap — far exceeding the container\'s 512MB limit. The container runtime kills the process with OOM. MaxRAMPercentage=75 means: if the container has 512MB, heap max = 384MB (75%). The remaining 128MB is for off-heap (Metaspace, thread stacks, direct buffers, OS overhead).',
  },
  {
    question: 'What is the benefit of Spring Boot\'s layered JAR in a Docker context?',
    options: [
      'Layered JARs start faster because the JVM can memory-map individual layers',
      'Layered JARs separate stable dependencies (rarely change) from application code (changes frequently) — Docker can cache the stable layers and only rebuild/transfer the small application layer on each code change',
      'Layered JARs reduce the final image size by compressing each layer independently',
      'Layered JARs enable zero-downtime deployment by swapping the application layer while the server runs',
    ],
    correctIndex: 1,
    explanation: 'A 100MB fat JAR as one layer means every code change pushes 100MB. Layered: dependencies (80MB, changes rarely), spring-boot-loader (5MB, changes rarely), application (2MB, changes every build). After the initial build, only 2MB is pushed on code changes — dependencies are cached. Over hundreds of CI builds, this saves gigabytes of data transfer and minutes of build time.',
  },
  {
    question: 'Why should Docker containers run as non-root users?',
    options: [
      'Non-root processes run faster because they don\'t need to check permissions',
      'If the container process is compromised, a non-root user has limited permissions on the host system — it cannot write to critical files, install software, or escape to other containers, reducing the blast radius of a security breach',
      'Kubernetes requires containers to run as non-root; root containers are rejected by the admission controller',
      'Docker\'s overlay filesystem doesn\'t support root users in production mode',
    ],
    correctIndex: 1,
    explanation: 'Container security principle: least privilege. A root process inside a container that escapes (via a container runtime vulnerability) is a root process on the host — with full system access. A non-root process has the permissions of that user on the host (typically very limited). Creating a dedicated appuser with no home directory and no shell minimizes the attack surface.',
  },
  {
    question: 'What should -Djava.security.egd=file:/dev/./urandom do and why is it sometimes included?',
    options: [
      'It configures the JVM to use a random seed for thread scheduling',
      'It redirects the JVM\'s secure random number generator from /dev/random (blocking on entropy) to /dev/urandom (non-blocking) — preventing startup delays on servers with low entropy, common in containers',
      'It disables SSL certificate validation for internal microservice calls',
      'It configures the JVM\'s garbage collector to use randomized memory regions',
    ],
    correctIndex: 1,
    explanation: '/dev/random blocks when the kernel\'s entropy pool is low. In containers (especially freshly started, without hardware RNG), this can cause multi-second startup delays while the JVM initializes SecureRandom for SSL/TLS. /dev/urandom is non-blocking (uses the entropy pool without waiting for it to refill). The /dev/./ path is a workaround for a JVM bug that ignored the property when set to /dev/urandom directly. Modern JVMs (Java 11+) have this fixed by default.',
  },
],

'229.2': [
  {
    question: 'What is the primary advantage of Jib over a traditional Dockerfile-based build in CI/CD?',
    options: [
      'Jib produces smaller images because it uses a proprietary compression algorithm',
      'Jib builds images without requiring a Docker daemon — enabling container image builds in CI environments that don\'t support Docker-in-Docker (DinD), which has security and complexity concerns',
      'Jib automatically tests the container after building it to verify it starts correctly',
      'Jib images start faster because they use a different entrypoint mechanism than standard Docker images',
    ],
    correctIndex: 1,
    explanation: 'Docker-in-Docker (mounting the host Docker socket in CI) is a security risk — a job running in a privileged container can escape to the host. Rootless DinD is complex to configure. Jib uses Java APIs to directly build and push OCI-compliant images to a registry, with no Docker daemon involvement. The CI worker needs only JVM access, not Docker access — simpler and more secure.',
  },
  {
    question: 'What does trivy image scanning catch that Jib/Docker build cannot?',
    options: [
      'Trivy catches Spring Boot configuration errors that could expose sensitive endpoints',
      'Trivy scans the OS packages and application dependencies in the built image for known CVEs (Common Vulnerabilities and Exposures) — catching vulnerabilities in the base image or library dependencies that your build process unknowingly included',
      'Trivy detects hardcoded secrets in application properties files',
      'Trivy checks that container health checks are correctly configured',
    ],
    correctIndex: 1,
    explanation: 'Building a "clean" application image doesn\'t mean it\'s secure — it includes an OS base image (Alpine, Debian) and dozens of library JARs, any of which might have known vulnerabilities. Trivy compares installed packages against the CVE database. Integrating it in CI means every new image is automatically checked: a dependency that gained a HIGH CVE triggers a build failure before the image reaches production.',
  },
  {
    question: 'What does Spring Boot\'s spring-boot:build-image goal use to build container images?',
    options: [
      'It uses Docker build with a generated Dockerfile based on the project\'s pom.xml',
      'It uses Cloud Native Buildpacks (Paketo) — which detect the project type and apply optimized, security-hardened build logic automatically, with no Dockerfile needed',
      'It uses Jib internally with Spring Boot-specific optimizations',
      'It generates a native binary using GraalVM and packages it in a minimal scratch image',
    ],
    correctIndex: 1,
    explanation: 'Cloud Native Buildpacks (CNBs) are modular build tools that detect the framework/runtime and apply appropriate optimizations. Paketo buildpacks for Spring Boot apply: automatic memory calculation, JVM flag tuning, security hardening, and layer optimization. The developer runs one command; the buildpack handles all the build details that would otherwise go in a Dockerfile. Buildpacks also handle base image upgrades: when a base image CVE is patched, running spring-boot:build-image again applies the fix.',
  },
  {
    question: 'What does a .dockerignore file do and why does it matter for build performance?',
    options: [
      'It prevents specified files from being copied into the image with COPY instructions',
      'It prevents specified files from being included in the Docker build context — the directory tar\'d and sent to the Docker daemon. Excluding large directories (target/, node_modules/) means the build context is small, reducing the time Docker takes to prepare each build',
      'It tells Docker which files to scan for secrets before allowing the build to proceed',
      'It specifies which files should be readable by the non-root container user',
    ],
    correctIndex: 1,
    explanation: 'Every docker build tars the current directory and sends it to the Docker daemon as the "build context." Without .dockerignore, this includes target/ (hundreds of MB of compiled classes, test reports, prior JARs), .git/, node_modules/, etc. A 500MB build context takes seconds to transfer even on localhost. On a remote build server, it\'s even slower. .dockerignore is not about the final image — it\'s about what gets sent to the build.',
  },
  {
    question: 'What does user: 1000:1000 in Jib configuration set?',
    options: [
      'The container\'s CPU and memory quota (1000 millicores, 1000MB)',
      'The user and group ID under which the container process runs — UID 1000 and GID 1000 are typically the first non-root user and group, running the JVM without root privileges inside the container',
      'The maximum number of concurrent HTTP connections the application accepts',
      'The minimum JVM heap size in megabytes',
    ],
    correctIndex: 1,
    explanation: 'Container security requires running as non-root. In Jib\'s container config, user specifies the UID:GID for the container process. UID 1000 is a convention for the first regular user (not root=0, not system users 1-999). Kubernetes admission controllers can enforce that no pod runs as root by checking runAsNonRoot: true — Jib\'s user setting satisfies this requirement.',
  },
],

'229.3': [
  {
    question: 'How does Spring Boot\'s property relaxed binding work with container environment variables?',
    options: [
      'Environment variables must exactly match property names (case-sensitive with dots)',
      'Spring Boot converts environment variable names to property keys: uppercase letters become lowercase, underscores become dots (SPRING_DATASOURCE_URL maps to spring.datasource.url), enabling any application property to be overridden via environment variable',
      'Only properties defined in application.yml can be overridden via environment variables; @Value properties cannot',
      'Environment variables only work with Spring Boot 3.x and newer',
    ],
    correctIndex: 1,
    explanation: 'Relaxed binding is one of Spring Boot\'s most useful container features. SPRING_DATASOURCE_URL → spring.datasource.url, SPRING_AI_OPENAI_APIKEY → spring.ai.openai.api-key. This means you never need to modify code or properties files to configure different environments — set environment variables in your deployment config (Kubernetes Secret, ECS task definition, CI environment). One immutable image serves all environments.',
  },
  {
    question: 'What is the difference between Kubernetes liveness and readiness probes?',
    options: [
      'Liveness checks database connectivity; readiness checks application logic',
      'Liveness: is the process alive and not deadlocked? (Kubernetes restarts if DOWN). Readiness: is the app ready to accept traffic? (Kubernetes removes from Service endpoints if DOWN — used during startup and graceful shutdown)',
      'Liveness is for HTTP endpoints; readiness is for TCP port checks',
      'Both probes do the same thing — use only one to avoid confusion',
    ],
    correctIndex: 1,
    explanation: 'Liveness failure → restart the pod (drastic action). It should only fail for unrecoverable states (deadlock, OOM, corrupted state). Readiness failure → remove from load balancer (gentle action). It should fail while starting up (not yet ready), and during graceful shutdown (draining requests). Spring Boot\'s /actuator/health/liveness and /actuator/health/readiness map directly to these semantics. Getting this right prevents unnecessary pod restarts during high load.',
  },
  {
    question: 'Why is server.shutdown: graceful critical for containerized Spring Boot applications?',
    options: [
      'It prevents Kubernetes from restarting pods too frequently',
      'Without graceful shutdown, Kubernetes SIGTERM causes the JVM to exit immediately, dropping in-flight HTTP requests. Graceful shutdown lets Spring Boot finish processing active requests (up to the timeout) before the process exits',
      'It enables zero-downtime deployments by keeping the old pod alive until the new pod is healthy',
      'It flushes Kafka producer buffers before shutdown to prevent message loss',
    ],
    correctIndex: 1,
    explanation: 'Kubernetes rolling updates: new pod starts → old pod receives SIGTERM → waits for preStop hook and terminationGracePeriodSeconds. Without server.shutdown: graceful, the JVM exits on SIGTERM — any request being processed at that moment gets a connection reset from the client\'s perspective. With graceful shutdown, the embedded Tomcat/Netty stops accepting new requests but completes active ones. The timeout-per-shutdown-phase (30s) is the upper bound — if all requests complete sooner, the process exits faster.',
  },
  {
    question: 'What is the security risk of injecting secrets via environment variables?',
    options: [
      'Environment variables cannot carry special characters, making complex secrets impossible to inject',
      'Environment variables are visible in docker inspect, process listings (ps aux -e shows env), and application logs (if the app logs its env). They\'re also inherited by child processes. Secret management tools (Vault, Kubernetes Secrets with projected volumes) reduce exposure',
      'Environment variables are cleared by the JVM before Spring Boot can read them',
      'Container runtimes limit environment variable values to 256 characters',
    ],
    correctIndex: 1,
    explanation: 'A developer running "docker inspect running-container" or "kubectl exec -it pod -- env" sees all environment variables including API keys. kubernetes Secrets at least encrypt them at rest (if configured) and limit access via RBAC. HashiCorp Vault goes further: secrets are never stored in environment variables — Vault Agent injects them as in-memory files or dynamic short-lived credentials. For high-security environments, environment variables for secrets are the lazy default, not the secure choice.',
  },
  {
    question: 'What does spring.main.lazy-initialization: true do and what is the trade-off?',
    options: [
      'It delays database migrations until the first request, allowing faster startup',
      'Beans are created on first use rather than at startup — reducing startup time significantly. Trade-off: the first request that triggers lazy bean initialization is slower than usual, and some misconfiguration errors that would fail fast at startup are only discovered at runtime',
      'It enables asynchronous bean initialization to parallelize startup across multiple threads',
      'It prevents Spring from initializing beans until the liveness probe passes',
    ],
    correctIndex: 1,
    explanation: 'Eager initialization (default): all beans created at startup → startup is slow but the first request is fast, and wiring errors fail immediately. Lazy initialization: startup is fast but the first request that triggers a complex bean graph is slow. Importantly, a misconfigured bean (wrong property name in @Value) only fails when that bean is first requested — not at startup. Lazy initialization is useful for development inner-loop speed; in production, ensure your readiness probe doesn\'t pass until the application has warmed up.',
  },
],
}

export const codingTask: Record<string, {
  instructions: string; boilerplate: string; rubric: string[]; hints: string[]
}> = {

'229.1': {
  instructions: `Write a production-quality multi-stage Dockerfile for a Spring Boot application.

Requirements:

1. **Build stage** (name it \`build\`):
   - Use \`eclipse-temurin:21-jdk-alpine\` as the base
   - Set WORKDIR to \`/workspace\`
   - Copy \`mvnw\`, \`.mvn/\`, and \`pom.xml\` first (for dependency caching)
   - Run \`./mvnw dependency:go-offline -q\`
   - Copy \`src/\` directory
   - Run \`./mvnw package -DskipTests -q\`
   - Run the layertools extract: \`RUN java -Djarmode=layertools -jar target/*.jar extract --destination extracted\`

2. **Runtime stage**:
   - Use \`eclipse-temurin:21-jre-alpine\` as the base
   - Set WORKDIR to \`/app\`
   - Create a non-root user: \`RUN addgroup -S appgroup && adduser -S appuser -G appgroup\`
   - Switch to that user: \`USER appuser\`
   - COPY the four extracted layers from the build stage in order: \`dependencies\`, \`spring-boot-loader\`, \`snapshot-dependencies\`, \`application\`
   - Set ENV for JAVA_OPTS: \`-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:+ExitOnOutOfMemoryError\`
   - EXPOSE port 8080
   - Set ENTRYPOINT to \`["sh", "-c", "java $JAVA_OPTS org.springframework.boot.loader.launch.JarLauncher"]\``,
  boilerplate: `# TODO: Build stage
# Base image: eclipse-temurin:21-jdk-alpine, name the stage "build"

# TODO: Set WORKDIR /workspace

# TODO: Copy mvnw, .mvn/, pom.xml for dependency caching

# TODO: Run mvnw dependency:go-offline -q

# TODO: Copy src/

# TODO: Run mvnw package -DskipTests -q

# TODO: Extract layered JAR to ./extracted

# TODO: Runtime stage
# Base image: eclipse-temurin:21-jre-alpine

# TODO: WORKDIR /app

# TODO: Create non-root user (addgroup appgroup, adduser appuser)

# TODO: USER appuser

# TODO: COPY extracted layers from build stage (4 COPY statements in order)

# TODO: ENV JAVA_OPTS

# TODO: EXPOSE 8080

# TODO: ENTRYPOINT`,
  rubric: [
    'FROM eclipse-temurin:21-jdk-alpine AS build with WORKDIR /workspace',
    'COPY mvnw, .mvn/, pom.xml before src/ (cache dependencies layer)',
    'RUN ./mvnw dependency:go-offline -q',
    'COPY src src followed by RUN ./mvnw package -DskipTests -q',
    'RUN java -Djarmode=layertools -jar target/*.jar extract --destination extracted',
    'FROM eclipse-temurin:21-jre-alpine for runtime stage',
    'WORKDIR /app in runtime stage',
    'RUN addgroup -S appgroup && adduser -S appuser -G appgroup and USER appuser',
    'Four COPY --from=build statements for dependencies, spring-boot-loader, snapshot-dependencies, application (in this order)',
    'ENV JAVA_OPTS with -XX:+UseContainerSupport and -XX:MaxRAMPercentage=75.0',
    'EXPOSE 8080 and ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS org.springframework.boot.loader.launch.JarLauncher"]',
  ],
  hints: [
    'FROM eclipse-temurin:21-jdk-alpine AS build',
    'COPY mvnw . then COPY .mvn .mvn then COPY pom.xml .',
    'RUN ./mvnw dependency:go-offline -q',
    'COPY src src && RUN ./mvnw package -DskipTests -q',
    'RUN java -Djarmode=layertools -jar target/*.jar extract --destination extracted',
    'FROM eclipse-temurin:21-jre-alpine',
    'COPY --from=build /workspace/extracted/dependencies ./',
    'COPY --from=build /workspace/extracted/spring-boot-loader ./',
    'COPY --from=build /workspace/extracted/snapshot-dependencies ./',
    'COPY --from=build /workspace/extracted/application ./',
    'ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:+ExitOnOutOfMemoryError"',
  ],
},
}
