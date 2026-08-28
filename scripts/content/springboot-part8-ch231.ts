// Part VIII — Cloud, Kubernetes & CI/CD
// Chapter 231: CI/CD with GitHub Actions

import type { QuizQuestion } from '../../src/data/curriculum'

export const courseId = 'springboot-ai-architect'

export const content: Record<string, string> = {

'231.1': `# GitHub Actions CI Pipeline for Spring Boot

A CI/CD pipeline automates the path from git commit to production deployment. GitHub Actions provides a first-class, integrated CI/CD platform with free minutes for public repositories and generous limits for private ones.

## Pipeline Architecture

\`\`\`
git push / PR open
    → CI pipeline triggers
        → Compile
        → Unit tests
        → Integration tests (Testcontainers)
        → Static analysis (SonarQube / Checkstyle)
        → Build container image (Jib)
        → Scan image for CVEs (Trivy)
        → Push to registry
    → CD pipeline triggers (on merge to main)
        → Deploy to staging
        → Run smoke tests
        → Deploy to production (gated by approval)
\`\`\`

## Complete CI Workflow

\`\`\`yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  JAVA_VERSION: '21'
  REGISTRY: ghcr.io
  IMAGE_NAME: \${{ github.repository }}

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write    # for GitHub Container Registry push
      security-events: write  # for Trivy SARIF upload

    steps:
    - name: Checkout
      uses: actions/checkout@v4

    - name: Set up Java
      uses: actions/setup-java@v4
      with:
        java-version: \${{ env.JAVA_VERSION }}
        distribution: temurin
        cache: maven    # cache ~/.m2/repository

    - name: Run tests
      run: ./mvnw verify -q
      # 'verify' runs: compile, test, integration-test, verify
      # Testcontainers starts automatically during integration tests

    - name: Build and push image
      if: github.event_name != 'pull_request'
      run: |
        ./mvnw jib:build \\
          -Djib.to.image=\${{ env.REGISTRY }}/\${{ env.IMAGE_NAME }}:\${{ github.sha }} \\
          -Djib.to.auth.username=\${{ github.actor }} \\
          -Djib.to.auth.password=\${{ secrets.GITHUB_TOKEN }}

    - name: Scan image for vulnerabilities
      if: github.event_name != 'pull_request'
      uses: aquasecurity/trivy-action@master
      with:
        image-ref: \${{ env.REGISTRY }}/\${{ env.IMAGE_NAME }}:\${{ github.sha }}
        format: sarif
        output: trivy-results.sarif
        severity: HIGH,CRITICAL
        exit-code: '1'   # fail pipeline on HIGH/CRITICAL

    - name: Upload Trivy scan results
      if: always()
      uses: github/codeql-action/upload-sarif@v3
      with:
        sarif_file: trivy-results.sarif

  code-quality:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
      with:
        fetch-depth: 0   # full history for SonarQube blame analysis

    - uses: actions/setup-java@v4
      with:
        java-version: \${{ env.JAVA_VERSION }}
        distribution: temurin
        cache: maven

    - name: SonarQube analysis
      run: |
        ./mvnw sonar:sonar \\
          -Dsonar.projectKey=my-project \\
          -Dsonar.host.url=\${{ secrets.SONAR_HOST_URL }} \\
          -Dsonar.login=\${{ secrets.SONAR_TOKEN }}
\`\`\`

## Secrets Management in GitHub Actions

\`\`\`yaml
# Secrets are set in GitHub repository settings → Secrets and variables → Actions
# Reference in workflow:
- name: Deploy
  env:
    DATABASE_PASSWORD: \${{ secrets.DATABASE_PASSWORD }}
    OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
  run: kubectl apply -f k8s/

# Environment-specific secrets (different values for staging vs production):
# Environment: staging → secrets.STAGING_DATABASE_PASSWORD
# Environment: production → secrets.PROD_DATABASE_PASSWORD
\`\`\`

## Caching Maven Dependencies

\`\`\`yaml
- uses: actions/setup-java@v4
  with:
    java-version: '21'
    distribution: temurin
    cache: maven   # automatically caches ~/.m2/repository

# Result: first run: 3 minutes downloading deps
#         subsequent runs: 30 seconds (deps cached)
\`\`\`

## Test Parallelism with Matrix

Run tests across multiple Java versions or split into shards:

\`\`\`yaml
jobs:
  test:
    strategy:
      matrix:
        java: [21]
        os: [ubuntu-latest]
    runs-on: \${{ matrix.os }}
    steps:
    - uses: actions/setup-java@v4
      with:
        java-version: \${{ matrix.java }}
        distribution: temurin
    - run: ./mvnw test
\`\`\``,

'231.2': `# CD Pipeline — Staging & Production Deployment

A CD pipeline takes the artifact (container image) built by CI and deploys it to environments. The key principles: one artifact across all environments (same image, different config), and production requires explicit approval.

## CD Workflow with Environment Gates

\`\`\`yaml
# .github/workflows/cd.yml
name: CD

on:
  workflow_run:
    workflows: [CI]
    types: [completed]
    branches: [main]

jobs:
  deploy-staging:
    if: \${{ github.event.workflow_run.conclusion == 'success' }}
    runs-on: ubuntu-latest
    environment: staging

    steps:
    - uses: actions/checkout@v4

    - name: Set up kubectl
      uses: azure/setup-kubectl@v3

    - name: Configure kubeconfig
      run: |
        echo "\${{ secrets.KUBECONFIG_STAGING }}" | base64 -d > kubeconfig
        echo "KUBECONFIG=\$(pwd)/kubeconfig" >> \$GITHUB_ENV

    - name: Update image in Deployment
      run: |
        kubectl set image deployment/order-service \\
          order-service=ghcr.io/\${{ github.repository }}:\${{ github.event.workflow_run.head_sha }} \\
          -n staging

    - name: Wait for rollout
      run: |
        kubectl rollout status deployment/order-service -n staging --timeout=300s

    - name: Smoke test staging
      run: |
        STAGING_URL="\${{ secrets.STAGING_URL }}"
        curl -f "\$STAGING_URL/actuator/health" || exit 1
        curl -f "\$STAGING_URL/api/products?limit=1" || exit 1

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production   # ← requires manual approval in GitHub UI
    if: \${{ github.event.workflow_run.conclusion == 'success' }}

    steps:
    - uses: actions/checkout@v4

    - name: Configure kubeconfig (production)
      run: |
        echo "\${{ secrets.KUBECONFIG_PROD }}" | base64 -d > kubeconfig
        echo "KUBECONFIG=\$(pwd)/kubeconfig" >> \$GITHUB_ENV

    - name: Deploy to production
      run: |
        kubectl set image deployment/order-service \\
          order-service=ghcr.io/\${{ github.repository }}:\${{ github.event.workflow_run.head_sha }} \\
          -n production

    - name: Wait for rollout
      run: |
        kubectl rollout status deployment/order-service -n production --timeout=600s

    - name: Verify production
      run: |
        PROD_URL="\${{ secrets.PRODUCTION_URL }}"
        curl -f "\$PROD_URL/actuator/health" || exit 1

    - name: Rollback on failure
      if: failure()
      run: |
        kubectl rollout undo deployment/order-service -n production
\`\`\`

## GitHub Environments for Approval Gates

Configure production environment in GitHub: Settings → Environments → production → Required reviewers. This pauses the workflow until a designated reviewer approves the deployment.

## Kustomize for Environment-Specific Configuration

\`\`\`
k8s/
  base/
    deployment.yaml    # base template
    service.yaml
    kustomization.yaml
  overlays/
    staging/
      kustomization.yaml    # patches for staging
      config-patch.yaml
    production/
      kustomization.yaml    # patches for production
      config-patch.yaml
      hpa.yaml             # only in production
\`\`\`

\`\`\`yaml
# k8s/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
\`\`\`

\`\`\`yaml
# k8s/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: production
bases:
  - ../../base
patches:
  - path: config-patch.yaml    # increase replicas to 5, change resource limits
resources:
  - hpa.yaml                   # add HPA only in production
images:
  - name: registry.example.com/order-service
    newTag: \${{ IMAGE_TAG }}   # replaced by CI/CD
\`\`\`

\`\`\`bash
# Apply production overlay
kubectl apply -k k8s/overlays/production/
\`\`\``,

'231.3': `# GitOps with ArgoCD & Production Best Practices

GitOps is a CD paradigm where the desired state of your infrastructure is stored in git, and a GitOps operator (ArgoCD, Flux) continuously reconciles the cluster to match that state. This makes deployments declarative, auditable, and self-healing.

## ArgoCD Architecture

\`\`\`
Developer → git push to app-config repo
                → ArgoCD watches the repo
                    → detects diff from cluster state
                        → applies the diff (kubectl apply)
                            → cluster matches desired state
\`\`\`

Two separate repositories:
- **App repo**: source code, CI pipeline — pushes container images
- **Config repo**: Kubernetes manifests (Kustomize/Helm) — ArgoCD watches this

## ArgoCD Application

\`\`\`yaml
# argocd-application.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: order-service
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/app-config
    targetRevision: main
    path: order-service/overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true         # delete resources removed from git
      selfHeal: true      # revert manual changes to cluster
    syncOptions:
      - CreateNamespace=true
\`\`\`

With selfHeal: true, any manual kubectl change is automatically reverted — the git repo is the only source of truth.

## Updating ArgoCD Deployments from CI

When CI builds a new image, it updates the config repo:

\`\`\`yaml
# In CI pipeline (after building image):
- name: Update image tag in config repo
  run: |
    git clone https://x-access-token:\${{ secrets.CONFIG_REPO_TOKEN }}@github.com/myorg/app-config
    cd app-config
    # Update the image tag in kustomization.yaml
    cd order-service/overlays/production
    kustomize edit set image \\
      registry.example.com/order-service=registry.example.com/order-service:\${{ github.sha }}
    git config user.email "ci@myorg.com"
    git config user.name "CI Bot"
    git add .
    git commit -m "ci: update order-service to \${{ github.sha }}"
    git push
    # ArgoCD detects the commit and syncs automatically
\`\`\`

## Release Strategies — Canary & Blue/Green

### Canary Deployment

Route a small percentage of traffic to the new version:

\`\`\`yaml
# Stable deployment: 9 replicas
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service-stable
spec:
  replicas: 9
  # ...
---
# Canary deployment: 1 replica (10% traffic)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service-canary
spec:
  replicas: 1
  template:
    spec:
      containers:
      - name: order-service
        image: registry.example.com/order-service:new-version
\`\`\`

The Service selects both Deployments via shared labels. 1/(9+1) = 10% of traffic goes to the canary.

### Blue/Green Deployment

Two complete environments, switch traffic instantly:

\`\`\`bash
# Deploy new version to "green" deployment (currently offline)
kubectl set image deployment/order-service-green \\
  order-service=registry.example.com/order-service:new-version -n production

# Wait for green to be ready
kubectl rollout status deployment/order-service-green --timeout=300s

# Switch Service selector from "blue" to "green"
kubectl patch service order-service \\
  -p '{"spec":{"selector":{"version":"green"}}}'

# Keep blue running for instant rollback
# kubectl patch service order-service -p '{"spec":{"selector":{"version":"blue"}}}'
\`\`\`

## CI/CD Metrics — Measuring Pipeline Health

| Metric | Good Target | How to Measure |
|---|---|---|
| Deployment frequency | Multiple per day | Count production deployments/day |
| Lead time for changes | < 1 hour | Commit timestamp to production deployment |
| Change failure rate | < 5% | % deployments causing incidents |
| Time to restore | < 1 hour | Incident detection to deployment of fix |

These are DORA metrics (DevOps Research and Assessment). High-performing teams deploy multiple times daily with < 1-hour recovery time. Poor-performing teams deploy monthly with multi-day recovery times.

## Branch Strategy

\`\`\`
feature/ABC-123  → PR → main → staging auto-deploy
                              → production (manual approval)

hotfix/CVE-fix   → PR (from tag) → main → prod (expedited approval)
\`\`\`

Trunk-based development (all work merges to main frequently) outperforms long-lived feature branches for CI/CD velocity. Feature flags control what users see, not branches.`,
}

export const quiz: Record<string, QuizQuestion[]> = {

'231.1': [
  {
    question: 'Why does the CI workflow build and push the container image only when github.event_name != \'pull_request\'?',
    options: [
      'Building images requires more resources than GitHub Actions provides for PR builds',
      'PR builds come from forked repositories that don\'t have registry push permissions, and PRs represent code under review — only builds from pushes to main branches (which have passed review) should produce deployable images',
      'The image build step requires Docker-in-Docker which is not available in PR context',
      'GitHub Container Registry only accepts pushes from the repository owner, not contributors',
    ],
    correctIndex: 1,
    explanation: 'PRs can come from forks (external contributors) that don\'t have repository secrets. Even for internal PRs, you don\'t want to push images for every draft or work-in-progress commit — only merged, reviewed code should produce deployment artifacts. The test step runs on PRs (catching issues before merge); the build+push runs only on post-merge pushes to main.',
  },
  {
    question: 'What does Trivy SARIF output format enable in the GitHub Actions workflow?',
    options: [
      'SARIF format compresses the scan results to reduce artifact storage costs',
      'SARIF (Static Analysis Results Interchange Format) integrates with GitHub\'s Security tab — vulnerabilities appear as inline annotations on the repository\'s code scanning view, making them visible in the PR interface and trackable over time',
      'SARIF format allows Trivy to cache results between builds to speed up subsequent scans',
      'SARIF output is required for GitHub Actions to parse the exit code correctly',
    ],
    correctIndex: 1,
    explanation: 'GitHub natively understands SARIF files — uploading via github/codeql-action/upload-sarif puts vulnerability findings directly in the repository\'s Security → Code scanning alerts section. Reviewers see security findings inline in PRs. Historical trends are tracked. This integrates security scanning into the normal developer workflow rather than requiring a separate security tool login.',
  },
  {
    question: 'Why is cache: maven in actions/setup-java important for build performance?',
    options: [
      'It caches the JDK download between runs, avoiding repeated JDK installation',
      'It caches the ~/.m2/repository directory between workflow runs — Maven dependencies downloaded in one run are reused in subsequent runs, reducing download time from 3-5 minutes to seconds',
      'It caches compiled class files so the compiler doesn\'t re-compile unchanged files',
      'It caches the Docker image layers produced by Jib for faster pushes',
    ],
    correctIndex: 1,
    explanation: 'A typical Spring Boot project has 50-200+ Maven dependencies. Without caching, every CI run re-downloads all dependencies (often 200-500MB). With caching, the ~/.m2/repository is preserved between runs using the pom.xml hash as the cache key — unchanged dependencies are never downloaded again. This is one of the highest-ROI CI optimizations, often saving 2-4 minutes per run.',
  },
  {
    question: 'What does ./mvnw verify do versus ./mvnw test?',
    options: [
      'verify runs tests with code coverage; test runs tests without coverage',
      'test runs unit tests only; verify runs the full Maven lifecycle including unit tests, integration tests (@SpringBootTest, Testcontainers), and any verify-phase plugins (checkstyle, enforcer rules)',
      'verify is Maven 4 syntax; test is Maven 3 syntax — they are functionally equivalent',
      'verify packages the application after testing; test only runs tests without packaging',
    ],
    correctIndex: 1,
    explanation: 'Maven lifecycle phases in order: compile → test → package → verify → install → deploy. "test" stops after unit tests. "verify" includes the integration-test phase (where Testcontainers-based @SpringBootTest integration tests run) and then runs verifiers (code quality plugins, test coverage thresholds). CI should run "verify" to catch integration-level failures, not just "test".',
  },
  {
    question: 'What role does GITHUB_TOKEN play in pushing images to GitHub Container Registry?',
    options: [
      'GITHUB_TOKEN is the developer\'s personal access token stored as a repository secret',
      'GITHUB_TOKEN is automatically provided by GitHub Actions with permissions scoped to the current workflow run — it authenticates pushes to ghcr.io for the repository\'s packages without requiring manual secret setup',
      'GITHUB_TOKEN is an API key for GitHub\'s REST API, not for container registry authentication',
      'GITHUB_TOKEN must be manually generated and stored as a repository secret before use',
    ],
    correctIndex: 1,
    explanation: 'GITHUB_TOKEN is ephemeral — GitHub generates it at workflow start and revokes it when the workflow ends. It automatically has permissions matching the workflow\'s permissions: block. Setting permissions.packages: write grants it push access to GitHub Container Registry (ghcr.io) for packages in this repository. No manual token creation or rotation needed — a significant operational advantage over long-lived personal access tokens.',
  },
],

'231.2': [
  {
    question: 'What is a GitHub Environment and what does adding "Required reviewers" to production do?',
    options: [
      'An Environment is a named set of environment variables available to a workflow',
      'An Environment defines a deployment target (staging, production) with optional protection rules. Required reviewers pause the workflow at the deploy-production job until a designated team member manually approves the deployment in the GitHub UI',
      'An Environment restricts which branches can deploy to it using branch protection rules',
      'Environments automatically rotate secrets every 90 days for security compliance',
    ],
    correctIndex: 1,
    explanation: 'GitHub Environments provide deployment protection rules. When a job specifies environment: production with required reviewers configured, GitHub pauses the workflow at that job and sends notifications to reviewers. A reviewer must click "Approve and deploy" in the GitHub UI. This provides a human gate before production deployments — audit trail, change control, and protection against automated deployments to prod without oversight.',
  },
  {
    question: 'What does kubectl rollout undo deployment/order-service do?',
    options: [
      'It deletes the current deployment and recreates it from the original manifest',
      'It rolls back to the previous ReplicaSet — the last known-good deployment configuration, replacing the current pod template with the previous version without downtime',
      'It undoes all changes made to the cluster since the deployment was created',
      'It pauses the rollout, allowing a developer to manually fix the failing pods',
    ],
    correctIndex: 1,
    explanation: 'Kubernetes Deployments maintain a rollout history (controlled by revisionHistoryLimit). Each update creates a new ReplicaSet. rollout undo switches back to the previous ReplicaSet\'s pod template — effectively deploying the previous image version. This is instant (no build required) and uses the same zero-downtime rolling update mechanism. The if: failure() condition in the workflow triggers automatic rollback if the deployment or verification steps fail.',
  },
  {
    question: 'What is Kustomize and why is it used for multi-environment Kubernetes deployments?',
    options: [
      'Kustomize is a Kubernetes alternative to Helm that uses Go templates',
      'Kustomize is a configuration management tool that applies patches and overlays to base YAML manifests — allowing one base configuration with environment-specific overlays (staging: 2 replicas; production: 5 replicas + HPA) without duplicating the entire manifest',
      'Kustomize validates Kubernetes manifests against the API server\'s schema',
      'Kustomize generates Kubernetes manifests from Docker Compose files',
    ],
    correctIndex: 1,
    explanation: 'Without Kustomize (or Helm), you\'d maintain separate staging and production YAML files — 90% identical, requiring changes in both places when the deployment structure changes. Kustomize\'s base + overlays model: base has the common structure; overlays patch only what differs. An image tag change in CI only needs to update the overlay, not duplicate files. kubectl apply -k works natively — no plugin needed.',
  },
  {
    question: 'Why should CI update a separate "config repo" rather than modifying the app repo\'s Kubernetes manifests?',
    options: [
      'The config repo must be private while the app repo can be public',
      'Separating app code (app repo) from deployment config (config repo) enables independent review of infrastructure changes, allows GitOps tools like ArgoCD to watch only the config repo for changes, and prevents deployment config changes from triggering CI builds',
      'GitHub Actions cannot modify files in the same repository that triggered the workflow',
      'Kubernetes manifests must be in a separate repository for ArgoCD to discover them',
    ],
    correctIndex: 1,
    explanation: 'The separation of concerns: app repo triggers CI (build, test, push image); config repo triggers CD (ArgoCD detects change, syncs cluster). This means deployment configuration changes (adding environment variables, changing resource limits) have their own PR history separate from code changes. Security teams can review config repo changes independently. CI builds only trigger on code changes, not config changes.',
  },
  {
    question: 'What does kubectl rollout status --timeout=300s do in a CD pipeline?',
    options: [
      'It polls the Kubernetes API every 300 seconds to check deployment progress',
      'It blocks until the Deployment\'s rolling update completes (all pods running the new version are ready) or 5 minutes elapse — if the deployment fails or stalls, the command exits with a non-zero code, triggering the pipeline\'s failure path',
      'It sets a 300-second SLA for deployment; Kubernetes alerts if this threshold is exceeded',
      'It waits 300 seconds after the deployment before running smoke tests to ensure stability',
    ],
    correctIndex: 1,
    explanation: 'Without rollout status, the CD pipeline moves to smoke tests immediately after kubectl set image — before new pods are even scheduled. If the new image fails to start (OOM kill, failed liveness probe), smoke tests run against old pods and pass, falsely indicating a successful deployment. rollout status blocks until all new pods are ready — if any pod fails health checks, the status command returns a non-zero exit code, failing the pipeline step and triggering rollback.',
  },
],

'231.3': [
  {
    question: 'What does GitOps mean and how does ArgoCD implement it?',
    options: [
      'GitOps means all code is reviewed in git before deployment; ArgoCD enforces code review policies',
      'GitOps means the desired cluster state is declared in a git repository; ArgoCD continuously watches the repo and applies any differences to the cluster — the git repo is the single source of truth, not the cluster\'s current state',
      'GitOps is a branching strategy where each environment has a dedicated git branch',
      'GitOps means deployment scripts are stored in git and manually triggered by operators',
    ],
    correctIndex: 1,
    explanation: 'Traditional CD: CI pushes config → cluster. GitOps: CI pushes config to git → ArgoCD pulls from git → cluster. The key difference: the cluster state is always derivable from git. If someone manually changes the cluster (kubectl edit), ArgoCD\'s selfHeal reverts it. The entire deployment history is git history. Rolling back is a git revert. Auditing is git log. Git becomes the infrastructure control plane.',
  },
  {
    question: 'What is ArgoCD\'s selfHeal option and why might it be controversial?',
    options: [
      'selfHeal automatically patches vulnerabilities in deployed container images',
      'selfHeal automatically reverts any cluster state that differs from the git config — including manually applied emergency hotfixes. It ensures git is always the truth, but operators must understand that manual kubectl changes will be undone, which can surprise teams during incidents',
      'selfHeal retries failed sync operations automatically without operator intervention',
      'selfHeal monitors application health and restarts unhealthy pods independently of Kubernetes',
    ],
    correctIndex: 1,
    explanation: 'selfHeal is powerful but requires discipline. During an incident, an operator might kubectl edit deployment to quickly change an env var — selfHeal reverts it within minutes. The correct incident response in a GitOps world: make the change in git, push, ArgoCD syncs. This forces all changes through git (full audit trail) but requires operators to internalize "git is truth, not the cluster." Some teams disable selfHeal for emergency access.',
  },
  {
    question: 'What is a canary deployment and what risk does it mitigate?',
    options: [
      'A canary deployment uses a different color scheme in the UI to signal the new version to users',
      'A canary deployment routes a small percentage of traffic (5-10%) to the new version while most traffic goes to the stable version — if the canary shows errors or degraded performance, only a small percentage of users are affected before a full rollback',
      'A canary deployment runs performance tests in production before routing real user traffic',
      'A canary deployment deploys to a single geographic region before rolling out globally',
    ],
    correctIndex: 1,
    explanation: 'Named after the "canary in a coal mine" — a warning signal. Deploy to 1 of 10 pods (10% traffic). Monitor error rate, latency, and business metrics for 30 minutes. If the canary is healthy, gradually increase to 20%, 50%, 100%. If the canary shows problems, roll back only the 1 canary pod — 90% of users were unaffected. This is the safest way to deploy high-risk changes to production.',
  },
  {
    question: 'What are DORA metrics and why do they matter for engineering teams?',
    options: [
      'DORA metrics measure developer productivity: lines of code per day, PR merge time, and test coverage',
      'DORA (DevOps Research and Assessment) metrics measure software delivery performance: deployment frequency, lead time, change failure rate, and time to restore — research shows these correlate with both business outcomes and developer satisfaction',
      'DORA metrics are required by cloud providers (AWS, GCP, Azure) to calculate SLA credits',
      'DORA metrics are internal GitHub statistics available in the repository\'s Insights tab',
    ],
    correctIndex: 1,
    explanation: 'DORA research found that high-performing teams deploy multiple times per day with < 1-hour recovery time. Low-performing teams deploy monthly with multi-day recovery. These metrics predict organizational performance (profitability, market share). They also correlate with developer wellbeing — teams with high deployment frequency report higher job satisfaction. They\'re leading indicators: improving CI/CD infrastructure improves DORA metrics, which predicts improved business outcomes.',
  },
  {
    question: 'Why does trunk-based development outperform long-lived feature branches for CI/CD velocity?',
    options: [
      'Trunk-based development avoids merge conflicts entirely by having everyone edit files serially',
      'Long-lived branches accumulate changes that are hard to integrate; trunk-based development (small, frequent merges to main) means integration is continuous and CI provides constant feedback — there is no "integration phase" where months of parallel work must be reconciled',
      'GitHub Actions can only trigger CI on the main branch, making feature branches inefficient',
      'Trunk-based development is required for Kubernetes deployments to function correctly',
    ],
    correctIndex: 1,
    explanation: 'A feature branch open for 2 weeks diverges from main every day. Merging 2 weeks of changes causes a large merge conflict and a large PR that\'s hard to review. CI runs rarely (only when pushed). Trunk-based: commit to main every day, behind a feature flag. CI runs on every commit. Integration issues are found and fixed immediately while the context is fresh. DORA high performers use trunk-based development because it maximizes the feedback loop speed.',
  },
],
}

export const codingTask: Record<string, {
  instructions: string; boilerplate: string; rubric: string[]; hints: string[]
}> = {

'231.1': {
  instructions: `Write a GitHub Actions CI workflow for a Spring Boot application.

Requirements:

Create a workflow file that:

1. **Triggers on**: \`push\` to \`main\` branch, and \`pull_request\` to \`main\` branch.

2. **Has one job** \`build-and-test\` that runs on \`ubuntu-latest\`.

3. **Steps in order**:
   a. Checkout code using \`actions/checkout@v4\`
   b. Set up Java 21 (distribution: \`temurin\`, enable \`cache: maven\`) using \`actions/setup-java@v4\`
   c. Run Maven verify: \`./mvnw verify -q\`
   d. Build and push the Docker image with Jib, **only if** \`github.event_name != 'pull_request'\`:
      - Command: \`./mvnw jib:build -Djib.to.image=ghcr.io/\${{ github.repository }}:\${{ github.sha }} -Djib.to.auth.username=\${{ github.actor }} -Djib.to.auth.password=\${{ secrets.GITHUB_TOKEN }}\`

4. **Permissions block** on the job: \`contents: read\`, \`packages: write\`.

Write the complete YAML (name, on, jobs sections).`,
  boilerplate: `# TODO: Write the complete GitHub Actions workflow YAML
# File: .github/workflows/ci.yml

# name: CI

# on:
#   ...triggers...

# jobs:
#   build-and-test:
#     ...`,
  rubric: [
    'name: CI (or similar)',
    'on.push.branches: [main] and on.pull_request.branches: [main]',
    'jobs.build-and-test.runs-on: ubuntu-latest',
    'permissions: contents: read and packages: write',
    'Step: uses: actions/checkout@v4',
    'Step: uses: actions/setup-java@v4 with java-version: \'21\', distribution: temurin, cache: maven',
    'Step: run: ./mvnw verify -q',
    'Step: jib:build with if: github.event_name != \'pull_request\' condition',
    'Jib command includes -Djib.to.image, -Djib.to.auth.username, -Djib.to.auth.password: ${{ secrets.GITHUB_TOKEN }}',
  ],
  hints: [
    'on: push: branches: [main] pull_request: branches: [main]',
    'jobs: build-and-test: runs-on: ubuntu-latest permissions: contents: read packages: write',
    'steps: - uses: actions/checkout@v4',
    '- uses: actions/setup-java@v4 with: java-version: \'21\' distribution: temurin cache: maven',
    '- name: Run tests run: ./mvnw verify -q',
    '- name: Build and push if: github.event_name != \'pull_request\' run: ./mvnw jib:build -Djib.to.image=ghcr.io/${{ github.repository }}:${{ github.sha }} -Djib.to.auth.username=${{ github.actor }} -Djib.to.auth.password=${{ secrets.GITHUB_TOKEN }}',
  ],
},
}
