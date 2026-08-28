// Part VIII — Cloud, Kubernetes & CI/CD
// Chapter 230: Kubernetes for Spring Boot

import type { QuizQuestion } from '../../src/data/curriculum'

export const courseId = 'springboot-ai-architect'

export const content: Record<string, string> = {

'230.1': `# Kubernetes Core Concepts for Spring Boot Developers

Kubernetes (K8s) is the de-facto standard for running containerized applications in production. Understanding its core abstractions is essential for deploying and operating Spring Boot services at scale.

## The Core Abstractions

| Resource | Role |
|---|---|
| **Pod** | Smallest deployable unit — one or more containers that share network and storage |
| **Deployment** | Manages a set of identical Pods; handles rolling updates and rollbacks |
| **Service** | Stable network endpoint for a set of Pods (load balancing, DNS) |
| **ConfigMap** | Non-sensitive configuration (feature flags, environment config) |
| **Secret** | Sensitive configuration (passwords, API keys) — base64 encoded, RBAC-protected |
| **Ingress** | HTTP/HTTPS routing from outside the cluster to Services |
| **Namespace** | Virtual cluster for resource isolation |

## Deployment Manifest

\`\`\`yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  namespace: production
  labels:
    app: order-service
    version: "1.2.3"
spec:
  replicas: 3
  selector:
    matchLabels:
      app: order-service
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1         # one extra pod during update
      maxUnavailable: 0   # never reduce below desired replicas
  template:
    metadata:
      labels:
        app: order-service
    spec:
      containers:
      - name: order-service
        image: my-registry.example.com/order-service:1.2.3
        ports:
        - containerPort: 8080
        env:
        - name: SPRING_PROFILES_ACTIVE
          value: "prod"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
        - name: DATABASE_USERNAME
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: username
        - name: DATABASE_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: password
        envFrom:
        - configMapRef:
            name: order-service-config  # all keys from ConfigMap as env vars
        resources:
          requests:          # guaranteed resources — used for scheduling
            memory: "256Mi"
            cpu: "250m"      # 250 millicores = 0.25 CPU core
          limits:            # hard limits — OOM kill if exceeded
            memory: "512Mi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /actuator/health/liveness
            port: 8080
          initialDelaySeconds: 60   # wait for JVM startup
          periodSeconds: 10
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /actuator/health/readiness
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 5
          failureThreshold: 3
      terminationGracePeriodSeconds: 40  # > spring.lifecycle.timeout-per-shutdown-phase
\`\`\`

## Service Manifest

\`\`\`yaml
apiVersion: v1
kind: Service
metadata:
  name: order-service
  namespace: production
spec:
  selector:
    app: order-service          # routes to pods with this label
  ports:
  - protocol: TCP
    port: 80                    # Service port (cluster-internal)
    targetPort: 8080            # container port
  type: ClusterIP               # internal only (default)
  # type: LoadBalancer          # external cloud load balancer
\`\`\`

## ConfigMap and Secret

\`\`\`yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: order-service-config
  namespace: production
data:
  FEATURE_NEW_CHECKOUT: "true"
  MAX_ORDER_ITEMS: "50"
  LOG_LEVEL: "INFO"
---
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
  namespace: production
type: Opaque
data:
  url: amRiYzpwb3N0Z3Jlc3FsOi8v...     # base64 encoded
  username: bXl1c2Vy                     # base64 encoded
  password: c3VwZXJzZWNyZXQ=           # base64 encoded
\`\`\`

\`\`\`bash
# Create a secret imperatively (don't commit base64-encoded secrets to git)
kubectl create secret generic db-credentials \\
  --from-literal=url="jdbc:postgresql://postgres:5432/mydb" \\
  --from-literal=username="myuser" \\
  --from-literal=password="supersecret" \\
  -n production
\`\`\``,

'230.2': `# Health Probes, Resource Limits & Horizontal Pod Autoscaler

Getting resource requests, limits, and health probes right is the difference between a Kubernetes deployment that self-heals gracefully and one that causes cascading failures during load spikes.

## Resource Requests vs Limits

**Request** = guaranteed minimum. Kubernetes uses this for scheduling.
**Limit** = hard maximum. Kubernetes kills the container if it exceeds this.

\`\`\`
Cluster has 4 nodes, each with 4GB RAM.
Pod A requests 2GB → scheduled on a node with 2GB available
Pod A limits 3GB → can use up to 3GB; OOM killed if it exceeds 3GB
\`\`\`

### Java Memory Configuration

For a container with 512MB memory limit:

\`\`\`yaml
resources:
  requests:
    memory: "384Mi"
    cpu: "500m"
  limits:
    memory: "512Mi"
    cpu: "1000m"
\`\`\`

\`\`\`
JVM heap max (75% of 512Mi):  384MB
JVM heap min (50% of 512Mi):  256MB
Off-heap (metaspace, etc.):   128MB
Total:                        512MB (at limit)
\`\`\`

Always set memory request = 75% of memory limit for Java apps (heap) to avoid OOM kills during normal GC.

## Liveness Probe Best Practices

\`\`\`yaml
livenessProbe:
  httpGet:
    path: /actuator/health/liveness
    port: 8080
  initialDelaySeconds: 60   # time for JVM + Spring startup
  periodSeconds: 10          # check every 10 seconds
  timeoutSeconds: 5          # fail if no response in 5s
  failureThreshold: 3        # 3 consecutive failures = restart
  successThreshold: 1        # 1 success = alive
\`\`\`

**Critical**: initialDelaySeconds must be > your app's worst-case startup time. If the liveness probe fires before Spring Boot is ready, it restarts the pod in a loop — the dreaded "CrashLoopBackOff."

The liveness probe should only check that the JVM is alive and not in a deadlock. Don't include database connectivity in liveness — a database outage shouldn't restart all your pods.

## Readiness Probe Best Practices

\`\`\`yaml
readinessProbe:
  httpGet:
    path: /actuator/health/readiness
    port: 8080
  initialDelaySeconds: 20
  periodSeconds: 5
  failureThreshold: 3
\`\`\`

The readiness probe can include downstream dependency checks. If the database is down, pods become "not ready" and Kubernetes stops sending them traffic — giving the database time to recover without cascading errors.

Configure what each check includes:

\`\`\`yaml
management:
  health:
    db:
      enabled: true      # include in /health/readiness
    redis:
      enabled: true
    kafka:
      enabled: false     # Kafka down doesn't make us unready
\`\`\`

## Horizontal Pod Autoscaler (HPA)

HPA automatically scales the number of pods based on metrics:

\`\`\`yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: order-service-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-service
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70  # scale when avg CPU > 70%
  - type: Resource
    resource:
      name: memory
      target:
        type: AverageValue
        averageValue: 400Mi
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60    # wait 60s before scale-up
      policies:
      - type: Pods
        value: 4
        periodSeconds: 60   # add at most 4 pods per minute
    scaleDown:
      stabilizationWindowSeconds: 300   # wait 5 minutes before scale-down
\`\`\`

The scale-down stabilization window prevents thrashing: HPA waits 5 minutes of sustained low load before removing pods. Scale-up is faster (1 minute) to handle sudden load spikes.

## Pod Disruption Budget

Ensure minimum availability during rolling updates and node maintenance:

\`\`\`yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: order-service-pdb
spec:
  minAvailable: 2     # at least 2 pods must be running
  selector:
    matchLabels:
      app: order-service
\`\`\`

With 3 replicas and minAvailable: 2, Kubernetes will never voluntarily terminate more than 1 pod at a time during node drains or rolling updates.`,

'230.3': `# Ingress, Namespaces & Production Kubernetes Patterns

## Ingress — External Traffic Routing

An Ingress routes external HTTP/HTTPS traffic to internal Services based on host and path rules:

\`\`\`yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-gateway
  namespace: production
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit-connections: "20"
    nginx.ingress.kubernetes.io/rate-limit-rps: "100"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - api.myapp.com
    secretName: api-tls-cert   # cert-manager populates this
  rules:
  - host: api.myapp.com
    http:
      paths:
      - path: /api/orders
        pathType: Prefix
        backend:
          service:
            name: order-service
            port:
              number: 80
      - path: /api/products
        pathType: Prefix
        backend:
          service:
            name: product-service
            port:
              number: 80
      - path: /api/ai
        pathType: Prefix
        backend:
          service:
            name: ai-service
            port:
              number: 80
\`\`\`

## Namespaces for Environment Isolation

\`\`\`bash
# Create namespaces
kubectl create namespace development
kubectl create namespace staging
kubectl create namespace production

# Deploy to a specific namespace
kubectl apply -f deployment.yaml -n production

# Switch context default namespace
kubectl config set-context --current --namespace=production
\`\`\`

Use namespaces to separate:
- **Environments** (dev, staging, production) — different configs, different image tags
- **Teams** (team-a, team-b) — RBAC, resource quotas per team
- **Services** (infrastructure, application) — separate lifecycle management

## Resource Quotas per Namespace

\`\`\`yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: production-quota
  namespace: production
spec:
  hard:
    requests.cpu: "20"          # total CPU requests in namespace
    requests.memory: "40Gi"     # total memory requests
    limits.cpu: "40"
    limits.memory: "80Gi"
    count/pods: "50"            # max pods
    count/services: "20"
    count/persistentvolumeclaims: "10"
\`\`\`

## Kubernetes-Native Spring Boot Configuration

Use Spring Boot's Kubernetes service discovery:

\`\`\`xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-kubernetes-client-config</artifactId>
</dependency>
\`\`\`

\`\`\`yaml
# application.yml — read config from ConfigMaps
spring:
  cloud:
    kubernetes:
      config:
        enabled: true
        sources:
        - name: order-service-config   # ConfigMap name
          namespace: production
      reload:
        enabled: true         # reload on ConfigMap change
        mode: polling
        period: 30000         # check every 30 seconds
\`\`\`

Spring Cloud Kubernetes reads ConfigMaps and Secrets directly from the Kubernetes API — no need to map them to environment variables.

## Production Deployment Checklist

### Resources
- [ ] CPU and memory requests set (not zero — breaks scheduling)
- [ ] CPU and memory limits set (prevent runaway containers)
- [ ] Memory limit >= 1.3x heap size (room for off-heap)
- [ ] HPA configured (minReplicas >= 2 for high availability)
- [ ] PodDisruptionBudget defined

### Health
- [ ] Liveness probe: /actuator/health/liveness
- [ ] Readiness probe: /actuator/health/readiness
- [ ] initialDelaySeconds > worst-case startup time
- [ ] terminationGracePeriodSeconds > spring.lifecycle.timeout-per-shutdown-phase

### Security
- [ ] Running as non-root (securityContext.runAsNonRoot: true)
- [ ] Read-only filesystem (securityContext.readOnlyRootFilesystem: true where possible)
- [ ] Secrets in Kubernetes Secrets (not ConfigMaps)
- [ ] RBAC: ServiceAccount with minimal permissions
- [ ] NetworkPolicy: restrict pod-to-pod traffic

### Observability
- [ ] Metrics endpoint exposed (Prometheus scraping configured)
- [ ] Structured JSON logging
- [ ] Distributed tracing enabled (Micrometer + OTLP exporter)
- [ ] Alert rules defined for error rate, latency P99, pod restarts`,
}

export const quiz: Record<string, QuizQuestion[]> = {

'230.1': [
  {
    question: 'What is the difference between a Kubernetes Deployment and a Pod?',
    options: [
      'A Pod is for stateless applications; a Deployment is for stateful applications',
      'A Pod is the minimal runnable unit (one or more containers). A Deployment manages a set of identical Pods, handling creation, scaling, rolling updates, and rollbacks — you rarely create Pods directly',
      'Deployments run on the control plane; Pods run on worker nodes',
      'A Pod runs one container; a Deployment runs multiple different containers',
    ],
    correctIndex: 1,
    explanation: 'Pods are ephemeral — they can die and won\'t restart themselves. A Deployment wraps a Pod template with a desired replica count and update strategy. If a Pod dies, the Deployment\'s ReplicaSet creates a replacement. Rolling updates replace Pods gradually. Rollbacks restore the previous Pod template. You define what your container needs in a Pod spec; you tell Kubernetes how to manage it via a Deployment.',
  },
  {
    question: 'What is the difference between a Kubernetes ConfigMap and a Secret?',
    options: [
      'ConfigMaps store strings; Secrets store binary data',
      'ConfigMap stores non-sensitive configuration (feature flags, log levels) in plain text; Secret stores sensitive data (passwords, API keys) base64-encoded with RBAC access control — Secrets can be encrypted at rest and access-audited',
      'ConfigMaps are namespace-scoped; Secrets are cluster-scoped',
      'ConfigMaps are read at startup; Secrets are read on every request',
    ],
    correctIndex: 1,
    explanation: 'Base64 encoding in Secrets is NOT encryption — it\'s just encoding. The security comes from: RBAC (only authorized ServiceAccounts can read a Secret), encryption at rest (if configured), and audit logging. ConfigMaps are readable by anyone in the namespace. Never put a password in a ConfigMap. The functional API is identical — both can be consumed as environment variables or volume mounts.',
  },
  {
    question: 'What does maxUnavailable: 0 in a Deployment\'s rollingUpdate strategy ensure?',
    options: [
      'No pods are running during the update, creating a brief downtime window',
      'The Deployment never reduces below the desired replica count during updates — a new pod must be Ready before an old pod is terminated, ensuring zero downtime rolling updates',
      'All pods are updated simultaneously rather than one at a time',
      'The update is paused until manual approval is given via kubectl',
    ],
    correctIndex: 1,
    explanation: 'maxUnavailable: 0 combined with maxSurge: 1 means: create one extra pod (surge) → wait for it to pass readiness → terminate one old pod → repeat. At no point are fewer than `replicas` ready pods. This is the zero-downtime update strategy for stateless services. The trade-off: you briefly use replicas+1 pods, requiring slightly more capacity. maxUnavailable: 1 is faster but allows brief reduction in capacity.',
  },
  {
    question: 'Why should you avoid committing base64-encoded Kubernetes Secrets to git?',
    options: [
      'Git cannot handle binary data in YAML files; Secrets must be applied via kubectl',
      'Base64 is trivially decoded — any developer with git access can decode the secret in seconds. Secrets in git expose credentials to anyone with repository access, including CI systems, contributors, and anyone who ever clones the repo',
      'Kubernetes Secrets expire after 90 days and must be regenerated, making static files impractical',
      'The Kubernetes API rejects Secrets that were not created with kubectl create secret',
    ],
    correctIndex: 1,
    explanation: 'echo "c3VwZXJzZWNyZXQ=" | base64 -d outputs "supersecret" in milliseconds. Git history is permanent — even if you delete the file, the Secret value is in the commit history. Solutions: Sealed Secrets (encrypt before committing), External Secrets Operator (store in Vault/AWS Secrets Manager, sync to K8s), or create Secrets imperatively in CI and never commit them.',
  },
  {
    question: 'What is a Kubernetes Service and why is it needed when Pods have their own IP addresses?',
    options: [
      'A Service provides DNS resolution for pod names within the cluster',
      'Pod IPs are ephemeral — when a Pod dies and is replaced, it gets a new IP. A Service provides a stable cluster-internal IP and DNS name that always routes to healthy, ready Pods regardless of their current IP addresses',
      'A Service is required for containers in the same Pod to communicate',
      'A Service provides TLS termination for Pod-to-Pod communication',
    ],
    correctIndex: 1,
    explanation: 'Pod IPs change every time a Pod is replaced. If service A hardcodes service B\'s Pod IP, it breaks every time B\'s Pod restarts. A Service has a stable ClusterIP (assigned once and kept until the Service is deleted) and a DNS name (order-service.production.svc.cluster.local). kube-proxy maintains routing rules that forward Service traffic to current Pod IPs. Clients talk to the stable Service IP/DNS; Kubernetes handles the routing to actual Pods.',
  },
],

'230.2': [
  {
    question: 'What is the difference between CPU "requests" and CPU "limits" in Kubernetes?',
    options: [
      'Requests are for development; limits are for production deployments',
      'Requests are the guaranteed minimum CPU a pod receives (used for scheduling). Limits are the maximum CPU a pod can use — excess is throttled (not killed) when a node is under CPU pressure',
      'Both are hard limits; requests apply during startup, limits apply during steady state',
      'Requests and limits are the same — setting both to the same value is required for production',
    ],
    correctIndex: 1,
    explanation: 'CPU is compressible: exceeding the limit causes throttling (slower performance), not killing. Memory is incompressible: exceeding the limit causes OOM kill. Requests affect scheduling: Kubernetes only schedules a pod on a node that has enough free requested resources. A node with 4 CPUs might have 8 pods scheduled if each requests 0.5 CPUs — but if all run at 100%, they\'re all throttled to their limits.',
  },
  {
    question: 'What happens if a Spring Boot pod\'s liveness probe fails 3 consecutive times?',
    options: [
      'Kubernetes marks the pod as degraded but continues routing traffic to it',
      'Kubernetes restarts the container in the pod — the JVM exits and restarts. If the pod keeps failing liveness, it enters CrashLoopBackOff with exponential backoff between restarts',
      'Kubernetes deletes the pod and creates a replacement pod on a different node',
      'Kubernetes removes the pod from the Service endpoint but doesn\'t restart it',
    ],
    correctIndex: 1,
    explanation: 'Liveness failure → container restart (not pod deletion). The same pod continues on the same node, but the container is killed and restarted. If the container keeps failing liveness quickly, Kubernetes applies exponential backoff (10s, 20s, 40s, ..., 5 minutes). This is CrashLoopBackOff — the most common symptom of a misconfigured liveness probe (probe fires before startup is complete) or a true application crash.',
  },
  {
    question: 'What does the HPA stabilizationWindowSeconds for scale-down control?',
    options: [
      'The minimum time a pod must be running before being eligible for scale-down',
      'How long HPA waits after the scale-down condition is met before actually removing pods — preventing thrashing when metrics fluctuate around the threshold',
      'The time between consecutive HPA metric evaluations',
      'The time allowed for pods to finish graceful shutdown before force-termination',
    ],
    correctIndex: 1,
    explanation: 'Imagine CPU drops from 80% (scale-up threshold) to 60% for 30 seconds, then spikes back to 85%. Without a stabilization window, HPA removes pods → load increases → HPA adds pods → repeat. With stabilizationWindowSeconds: 300, HPA only scales down after 5 consecutive minutes of low load. Scale-up typically uses a shorter window (60s) because adding capacity is urgent; scale-down uses a longer window (5min) because removing capacity prematurely is costly.',
  },
  {
    question: 'Why should a Spring Boot app\'s liveness probe NOT include database connectivity checks?',
    options: [
      'Database checks are too slow for the default 1-second probe timeout',
      'If the database becomes unavailable, all pods fail liveness and are restarted simultaneously — a database outage triggers a massive pod restart storm, making recovery slower and potentially causing application downtime when the database recovers',
      'Spring Boot\'s /actuator/health/liveness endpoint doesn\'t include the database health indicator',
      'Database connectivity checks require the pod to have network access to the database, which is not permitted by default NetworkPolicy rules',
    ],
    correctIndex: 1,
    explanation: 'Liveness should answer: "Is this process fundamentally broken?" (deadlock, OOM, corrupted state). Database unavailability is a temporary, external condition — the pod is alive and will recover when the database does. If database checks are in liveness: database goes down → all pods restart simultaneously → database recovers → pods restart again → race condition where all pods hit the database at once → database overload. Keep liveness minimal; put dependency checks in readiness.',
  },
  {
    question: 'What does a PodDisruptionBudget (PDB) with minAvailable: 2 guarantee?',
    options: [
      'Kubernetes always maintains exactly 2 pods, never more and never fewer',
      'Kubernetes never voluntarily terminates pods if doing so would bring the running count below 2 — this protects against node drains, rolling updates, and cluster maintenance reducing availability too aggressively',
      'New pods are always started 2 minutes before old pods are terminated',
      'The deployment must have at least 2 replicas configured or the PDB rejects it',
    ],
    correctIndex: 1,
    explanation: 'PDBs apply to voluntary disruptions (node drains, rolling updates, cluster upgrades). Kubernetes checks the PDB before evicting a pod: "If I evict this pod, will the running count go below minAvailable?" If yes, the eviction is blocked until the application is in a state where the eviction would leave enough running instances. Involuntary disruptions (node failure) are not subject to PDB — a node crashing doesn\'t ask permission.',
  },
],

'230.3': [
  {
    question: 'What does an Ingress resource do in Kubernetes?',
    options: [
      'An Ingress routes inter-pod communication within the cluster',
      'An Ingress routes external HTTP/HTTPS traffic into the cluster based on host and path rules, enabling multiple services to share a single external IP/load balancer and TLS certificate',
      'An Ingress is required for pods to access external services (outbound traffic)',
      'An Ingress provides service discovery, replacing the need for DNS lookups between services',
    ],
    correctIndex: 1,
    explanation: 'Without Ingress, every Service of type LoadBalancer gets its own cloud load balancer and IP address. With Ingress, all external traffic enters through one load balancer (the Ingress Controller), and the Ingress resource defines routing rules: api.myapp.com/orders → order-service, api.myapp.com/products → product-service. One TLS certificate, one external IP, many internal services.',
  },
  {
    question: 'Why should you use Kubernetes Namespaces to separate staging and production?',
    options: [
      'Namespaces provide performance isolation — staging workloads cannot consume production CPU',
      'Namespaces provide logical isolation: separate RBAC (production deployments require senior approvals), separate ResourceQuotas (staging cannot exhaust cluster resources), separate network policies, and separate configuration — all within one cluster',
      'Kubernetes requires separate namespaces for different application versions',
      'Namespaces prevent DNS name collisions between services with the same name',
    ],
    correctIndex: 1,
    explanation: 'A junior developer\'s staging deployment gone wrong shouldn\'t be able to consume all cluster resources (ResourceQuota). A staging service with the same name as a production service is fine — order-service.staging.svc.cluster.local vs order-service.production.svc.cluster.local. RBAC can grant developers write access to staging but only read access to production. Namespaces are a cheap, built-in multi-tenancy mechanism.',
  },
  {
    question: 'What does Spring Cloud Kubernetes\'s ConfigMap reload feature enable?',
    options: [
      'Kubernetes automatically restarts pods when a ConfigMap changes',
      'Spring Boot applications can pick up ConfigMap changes without restarting — when the ConfigMap is updated, Spring Cloud Kubernetes detects the change (via polling or watch) and refreshes @ConfigurationProperties beans with the new values',
      'Kubernetes validates ConfigMap values against the application\'s expected types before applying them',
      'ConfigMap changes trigger a new Deployment rollout to ensure all pods see the same configuration',
    ],
    correctIndex: 1,
    explanation: 'Without ConfigMap reload, changing a feature flag requires updating the ConfigMap, then restarting all pods (or triggering a rolling update) to pick up the change. With reload enabled, Spring Boot polls the Kubernetes API for ConfigMap changes and refreshes @RefreshScope beans or @ConfigurationProperties beans automatically. This enables feature flag changes to take effect in seconds without any pod restarts.',
  },
  {
    question: 'What is the purpose of readOnlyRootFilesystem: true in a pod\'s security context?',
    options: [
      'It prevents the application from reading sensitive files like /etc/passwd',
      'It makes the container filesystem read-only, so if the application is compromised, the attacker cannot write malicious files (scripts, backdoors) to the container — they can only read files already in the image',
      'It prevents Spring Boot from writing log files to the container filesystem',
      'It enables Docker image layers to be shared between containers for memory efficiency',
    ],
    correctIndex: 1,
    explanation: 'Container breakout often involves writing a script to the filesystem and executing it. Read-only filesystem eliminates this attack vector. Applications that need to write should use emptyDir volumes (ephemeral, in-memory) mounted at specific paths (/tmp, /app/logs). This follows the principle of minimal attack surface: if your application doesn\'t need to write to the filesystem, disallow it at the OS level.',
  },
  {
    question: 'What terminationGracePeriodSeconds should you set relative to Spring Boot\'s spring.lifecycle.timeout-per-shutdown-phase?',
    options: [
      'They should be set to the same value for synchronized shutdown',
      'terminationGracePeriodSeconds must be greater than spring.lifecycle.timeout-per-shutdown-phase — Kubernetes must give Spring Boot time to complete graceful shutdown before force-killing the process',
      'terminationGracePeriodSeconds should be shorter to ensure fast pod replacement',
      'terminationGracePeriodSeconds applies to the cluster; Spring Boot\'s timeout applies to individual beans',
    ],
    correctIndex: 1,
    explanation: 'Kubernetes sends SIGTERM, then waits terminationGracePeriodSeconds before sending SIGKILL. Spring Boot\'s timeout-per-shutdown-phase is how long it waits for in-flight requests. If terminationGracePeriodSeconds=30 but timeout-per-shutdown-phase=30s, the SIGKILL arrives at the same moment Spring Boot finishes draining — a race. Set terminationGracePeriodSeconds=40 (10s buffer) when timeout-per-shutdown-phase=30s. Add PreStop hook sleep of 5s to allow the load balancer to stop routing new traffic first.',
  },
],
}

export const codingTask: Record<string, {
  instructions: string; boilerplate: string; rubric: string[]; hints: string[]
}> = {

'230.1': {
  instructions: `Write a Kubernetes Deployment manifest for a Spring Boot application.

Requirements:

The manifest must define a Deployment named \`product-service\` in namespace \`production\` with:

1. **3 replicas** with a RollingUpdate strategy: \`maxSurge: 1\`, \`maxUnavailable: 0\`

2. **Container spec**:
   - Image: \`registry.example.com/product-service:1.0.0\`
   - containerPort: 8080
   - Environment variables:
     - \`SPRING_PROFILES_ACTIVE\` = \`"prod"\` (plain value)
     - \`DATABASE_PASSWORD\` from Secret named \`db-secret\`, key \`password\`
   - Resource requests: \`memory: "256Mi"\`, \`cpu: "250m"\`
   - Resource limits: \`memory: "512Mi"\`, \`cpu: "1000m"\`

3. **Liveness probe**: GET \`/actuator/health/liveness\` on port 8080, initialDelaySeconds: 60, periodSeconds: 10

4. **Readiness probe**: GET \`/actuator/health/readiness\` on port 8080, initialDelaySeconds: 30, periodSeconds: 5

5. **terminationGracePeriodSeconds: 40**

Write the complete YAML manifest (apiVersion through spec).`,
  boilerplate: `# TODO: Write the complete Kubernetes Deployment manifest below
# apiVersion: apps/v1
# kind: Deployment
# ...`,
  rubric: [
    'apiVersion: apps/v1 and kind: Deployment',
    'metadata.name: product-service and metadata.namespace: production',
    'spec.replicas: 3',
    'strategy.type: RollingUpdate with maxSurge: 1 and maxUnavailable: 0',
    'container name: product-service, image: registry.example.com/product-service:1.0.0, containerPort: 8080',
    'SPRING_PROFILES_ACTIVE env var with value: "prod"',
    'DATABASE_PASSWORD from secretKeyRef name: db-secret, key: password',
    'resources.requests: memory 256Mi, cpu 250m; limits: memory 512Mi, cpu 1000m',
    'livenessProbe httpGet /actuator/health/liveness port 8080, initialDelaySeconds: 60, periodSeconds: 10',
    'readinessProbe httpGet /actuator/health/readiness port 8080, initialDelaySeconds: 30, periodSeconds: 5',
    'terminationGracePeriodSeconds: 40',
  ],
  hints: [
    'Start with: apiVersion: apps/v1 / kind: Deployment / metadata: / name: product-service / namespace: production',
    'spec.selector.matchLabels must match spec.template.metadata.labels',
    'strategy: type: RollingUpdate / rollingUpdate: maxSurge: 1 / maxUnavailable: 0',
    'env: - name: SPRING_PROFILES_ACTIVE / value: "prod"',
    'env: - name: DATABASE_PASSWORD / valueFrom: secretKeyRef: name: db-secret / key: password',
    'resources: requests: memory: "256Mi" cpu: "250m" / limits: memory: "512Mi" cpu: "1000m"',
    'livenessProbe: httpGet: path: /actuator/health/liveness / port: 8080 / initialDelaySeconds: 60 / periodSeconds: 10',
  ],
},
}
