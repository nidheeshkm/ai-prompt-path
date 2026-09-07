// Part IV — Math & Machine-Learning On-Ramp
// Chapter 307: Math Foundations for AI

import type { QuizQuestion } from '../../src/data/curriculum'

export const courseId = 'python-for-ai'

export const content: Record<string, string> = {

'307.1': `# Linear Algebra: Vectors, Matrices, Dot Products & Norms

You do not need a full linear algebra course to start AI, but you need working intuition for a handful of objects and operations, because **a neural network is linear algebra plus non-linearities**, and embeddings, similarity, and dimensionality reduction are pure linear algebra.

## Vectors

A vector is an ordered list of numbers — a point in space, or a direction with magnitude. In AI, almost everything is a vector: a data sample (its features), a word or document (its embedding), a layer's activations, a set of model parameters.

\`\`\`python
import numpy as np
v = np.array([3.0, -1.0, 2.0])     # a 3-dimensional vector
\`\`\`

Operations:
- **Addition** \`u + v\` — combine, component-wise.
- **Scalar multiply** \`2.5 * v\` — stretch/shrink.
- **Dot product** \`u @ v = Σ uᵢvᵢ\` — a single number measuring alignment.

## The dot product is the key operation

\`u · v = ‖u‖ ‖v‖ cos θ\`, where θ is the angle between them.

- Positive → vectors point in similar directions.
- Zero → orthogonal (unrelated).
- Negative → opposing directions.

Every "score" in deep learning is a dot product: a neuron computes \`w · x + b\`; attention scores a query against keys with \`q · k\`; a recommendation is \`user_vec · item_vec\`; semantic search ranks documents by \`query_embedding · doc_embedding\`.

## Norms — the length of a vector

\`\`\`python
np.linalg.norm(v)          # L2 (Euclidean): sqrt(Σ vᵢ²)
np.linalg.norm(v, ord=1)   # L1 (Manhattan): Σ |vᵢ|
np.linalg.norm(v, ord=np.inf)   # max |vᵢ|
\`\`\`

- **L2** measures magnitude; "weight decay" / L2 regularisation penalises \`‖w‖₂²\` to keep weights small.
- **L1** encourages sparsity (many exact zeros) — used in Lasso and for feature selection.
- **Normalising** \`v / ‖v‖\` gives a unit vector — direction only. Cosine similarity is the dot product of normalised vectors.

## Matrices

A matrix is a 2-D array — a table of numbers, or a **linear transformation** that maps vectors to vectors.

- A dataset: rows = samples, columns = features → shape \`(n, d)\`.
- A linear layer's weights: shape \`(d_out, d_in)\`; it maps a \`d_in\` vector to a \`d_out\` vector.

**Matrix-vector product** \`A x\`: each output component is the dot product of a row of \`A\` with \`x\`. **Matrix-matrix product** \`A B\`: \`(A B)ᵢⱼ = rowᵢ(A) · colⱼ(B)\`. The inner dimensions must match: \`(m, k) @ (k, n) → (m, n)\`.

\`\`\`python
X = np.random.randn(100, 5)      # 100 samples, 5 features
W = np.random.randn(5, 3)        # project 5 -> 3
H = X @ W                         # (100, 3) — a linear layer, no bias
\`\`\`

**Order matters**: \`A B ≠ B A\` in general. **Transpose** \`Aᵀ\` swaps rows and columns; \`(A B)ᵀ = Bᵀ Aᵀ\`.

## Special matrices and ideas

- **Identity** \`I\`: \`I x = x\`. The "do nothing" transform.
- **Inverse** \`A⁻¹\`: undoes \`A\` (only for square, full-rank matrices). Numerically, prefer \`np.linalg.solve\` over forming \`A⁻¹\`.
- **Rank**: the number of truly independent directions. Low rank = redundant information = compressible (the basis of PCA, LoRA, and matrix factorisation).
- **Orthogonal matrix**: rows/columns are mutually perpendicular unit vectors; it rotates without stretching, and \`Qᵀ Q = I\`.

## Why this matters for a forward pass

A 2-layer MLP is literally:

\`\`\`python
h = relu(X @ W1 + b1)     # (n, d) -> (n, hidden)
y = h @ W2 + b2           # (n, hidden) -> (n, classes)
\`\`\`

Everything else — training, attention, convolutions — is variations and compositions of these same matrix operations. If you can track shapes through this and predict the output dimensions, you can read most model code.
`,

'307.2': `# Calculus & Gradients: Derivatives, the Chain Rule & Backprop Intuition

Training a model means **minimising a loss function** by nudging parameters in the direction that reduces it. That direction is the negative gradient. You will almost never compute derivatives by hand — autograd does it — but you must understand what a gradient *is* to reason about learning rates, vanishing gradients, and why training diverges.

## Derivative = slope = sensitivity

The derivative \`df/dx\` answers: *if I increase x by a tiny amount, how much does f change, and in which direction?*

- \`df/dx > 0\`: increasing x increases f.
- \`df/dx < 0\`: increasing x decreases f.
- \`df/dx = 0\`: a flat spot — a minimum, maximum, or saddle.

To **minimise** f, step x in the direction of \`-df/dx\`. That is gradient descent.

## Gradient = derivative for many variables

A model has millions of parameters. The **gradient** \`∇L\` is the vector of partial derivatives — one per parameter — each saying how the loss responds to a tiny change in that one parameter, holding the others fixed.

\`\`\`
θ_new = θ_old − η · ∇L(θ_old)
\`\`\`

\`η\` (eta) is the **learning rate** — the step size.
- Too large → you overshoot the minimum, loss oscillates or explodes to NaN.
- Too small → training crawls, may get stuck.
- Typical starting points: \`1e-3\` (Adam), \`1e-2\` to \`1e-1\` (SGD).

The gradient also points in the direction of *steepest increase*, so its magnitude tells you how steep the loss surface is locally. Huge gradient norms → clip them; near-zero gradients over many layers → the "vanishing gradient" problem.

## The chain rule — how backprop works

The chain rule composes derivatives through function composition:

\`\`\`
if  y = f(g(x))   then   dy/dx = f'(g(x)) · g'(x)
\`\`\`

A neural network is a deep composition: \`loss(f_n(...f_2(f_1(x))...))\`. **Backpropagation** is the chain rule applied from the loss backward to every parameter, reusing intermediate results so it costs about the same as one forward pass.

Conceptually, each layer during the backward pass receives "how much the loss changes with respect to my output" and computes two things: "how much the loss changes with respect to my parameters" (used to update them) and "how much the loss changes with respect to my input" (passed to the previous layer).

\`\`\`python
# PyTorch does all of this for you:
loss = loss_fn(model(x), y)
loss.backward()          # chain rule: fills param.grad for every parameter
optimizer.step()         # θ -= lr * θ.grad
optimizer.zero_grad()    # gradients accumulate — clear them each step
\`\`\`

Forgetting \`zero_grad()\` is a classic bug: gradients from previous batches pile up and training misbehaves.

## Gradients of the functions you will meet

| Function | Derivative | Note |
|---|---|---|
| \`x²\` | \`2x\` | the "bowl"; convex, one minimum |
| \`eˣ\` | \`eˣ\` | grows fast — overflow risk |
| \`ln(x)\` | \`1/x\` | steep near 0 — why log-loss punishes confident mistakes |
| \`relu(x)\` | \`1\` if \`x>0\` else \`0\` | dead neurons when stuck at 0 |
| \`sigmoid(x)\` | \`σ(x)(1−σ(x))\` | max 0.25, → 0 at the tails ⇒ vanishing gradients |
| \`tanh(x)\` | \`1 − tanh²(x)\` | also saturates |

The saturation of sigmoid/tanh (tiny derivative when the input is large in magnitude) is exactly why deep networks switched to ReLU.

## Convexity and local minima

A **convex** loss (a single bowl) has one global minimum; gradient descent always finds it. Linear/logistic regression are convex.

Neural network losses are **non-convex** — a landscape with many valleys, saddle points, and plateaus. In practice, stochastic gradient descent (noisy gradients from minibatches) plus momentum finds solutions that generalise well, even though we cannot prove they are global optima. This is why deep learning is empirical: you run it and look at the validation curve.

## Practical takeaways

- Loss going to \`NaN\` → learning rate too high, or numerical instability (add \`eps\`, clip gradients, lower LR).
- Loss flat from step 0 → LR too low, bad initialisation, frozen parameters, or a data pipeline bug.
- Loss decreasing then diverging → LR too high for the later, sharper region; use a scheduler that decays it.
- Always plot the loss curve. The gradient is invisible; its effect on the curve is not.
`,

'307.3': `# Probability & Statistics Essentials

Machine learning is applied statistics. Models output probabilities, losses are derived from likelihoods, evaluation is statistical, and half of "why is my model wrong" questions are really "I misunderstood the data distribution."

## Random variables and distributions

A **random variable** takes values with certain probabilities. A **distribution** describes those probabilities.

| Distribution | Models | Shows up as |
|---|---|---|
| **Bernoulli(p)** | one yes/no trial | binary labels, dropout masks |
| **Categorical(p₁…p_k)** | one of k outcomes | class labels, next-token prediction |
| **Normal(μ, σ²)** | continuous, symmetric, bell-shaped | measurement noise, weight init, many natural quantities |
| **Uniform(a, b)** | equally likely in a range | random init, sampling |
| **Poisson(λ)** | counts of rare events per interval | arrivals, defects |
| **Exponential / Power-law** | waiting times / heavy tails | word frequencies, network degrees |

The **normal distribution** matters disproportionately because of the **Central Limit Theorem**: the average of many independent random quantities tends toward a normal, regardless of their individual distributions. This is why averaged metrics have roughly normal error bars.

## Summary statistics — and their failure modes

- **Mean** — the balance point. Sensitive to outliers.
- **Median** — the middle value. Robust; prefer it for skewed data (income, latency, file sizes).
- **Variance / standard deviation** — spread. σ is in the same units as the data.
- **Quantiles / percentiles** — the 95th percentile latency matters more than the mean for user experience.
- **Skew** — asymmetry. Right-skewed data often benefits from a \`log1p\` transform before modelling.

"Mean = 50" tells you little without the spread and shape. Always look at a histogram.

## Conditional probability and Bayes

\`P(A | B)\` — probability of A *given that* B happened.

\`\`\`
P(A | B) = P(B | A) · P(A) / P(B)
\`\`\`

Bayes' rule is the backbone of the Naive Bayes classifier, and the mental model for updating beliefs with evidence. The key trap it warns about: with a rare condition (low \`P(A)\`), even an accurate test produces mostly false positives — the **base rate** dominates. The same logic explains why a 99%-accurate classifier for a 1-in-1000 event is nearly useless.

## Independence and correlation

- **Independent**: \`P(A and B) = P(A)·P(B)\`; knowing one tells you nothing about the other.
- **Correlation** (Pearson r ∈ [−1, 1]): strength of a *linear* relationship. \`r = 0\` does **not** mean independent — it means no *linear* trend (a U-shape has r ≈ 0).
- **Correlation ≠ causation.** A feature correlated with the target may be a confounder, a proxy, or leakage.

## Expectation and loss functions

The **expected value** \`E[X]\` is the long-run average. Training minimises the expected loss, estimated as the mean loss over your data.

- **MSE** \`E[(y − ŷ)²]\` comes from assuming Gaussian noise → maximum likelihood for regression.
- **Cross-entropy** \`−E[log P(correct class)]\` comes from maximising the likelihood of the observed labels under the model's predicted distribution. Minimising cross-entropy = making the model assign high probability to the truth.

## Sampling, estimation, and uncertainty

Your dataset is a **sample** from a larger population. Any metric you compute is an **estimate** with uncertainty:

- **Standard error** of a mean ≈ \`σ / √n\` — shrinks slowly; 4× the data halves the error.
- Report metrics over **multiple seeds** as \`mean ± std\`; a single run's number is noisy.
- A **confidence interval** or a **bootstrap** (resample your test set with replacement, recompute the metric many times) tells you whether a 0.5% accuracy gain is real or noise.
- **Stratified sampling** keeps class proportions when splitting — essential for imbalanced data.

## Common statistical traps in ML

1. **Data leakage** — test information influencing training (scaling on the full set, duplicates across splits, future features).
2. **Selection bias** — your data is not representative of deployment (survivorship, time drift, sampling method).
3. **Multiple comparisons** — try 50 hyperparameter configs, one looks great by chance; validate on a held-out set.
4. **Simpson's paradox** — a trend within every subgroup can reverse when groups are pooled.
5. **Imbalanced accuracy** — 99% accuracy on a 99:1 dataset is the majority-class baseline.
`,

'307.4': `# Gradient Descent from Scratch

Every model in this course — and every deep network — is trained by gradient descent. Implementing it once, by hand, in NumPy, makes the rest of machine learning stop being magic.

## The problem: linear regression

Given data \`X\` (shape \`(n, d)\`) and targets \`y\` (shape \`(n,)\`), find weights \`w\` (shape \`(d,)\`) and bias \`b\` so that \`ŷ = X w + b\` is close to \`y\`.

"Close" is measured by **mean squared error**:

\`\`\`
L(w, b) = (1/n) Σᵢ (ŷᵢ − yᵢ)²
\`\`\`

L is a convex bowl in \`(w, b)\` space, so gradient descent converges to the global minimum.

## The gradients

Let \`r = ŷ − y\` be the residual vector (shape \`(n,)\`). Working through the chain rule:

\`\`\`
∂L/∂w = (2/n) Xᵀ r          # shape (d,)
∂L/∂b = (2/n) Σ r           # scalar
\`\`\`

The \`Xᵀ r\` term is the key insight: it is a single matrix-vector product that computes the derivative with respect to *every* weight at once. No loops over parameters.

## The algorithm

\`\`\`python
import numpy as np

def fit(X, y, lr=0.01, epochs=1000, seed=0):
    n, d = X.shape
    rng = np.random.default_rng(seed)
    w = rng.normal(0, 0.01, size=d)     # small random init
    b = 0.0
    history = []

    for _ in range(epochs):
        y_hat = X @ w + b               # forward
        r = y_hat - y                   # residual
        history.append(np.mean(r ** 2)) # record loss

        grad_w = (2 / n) * (X.T @ r)    # backward
        grad_b = (2 / n) * r.sum()

        w -= lr * grad_w               # update
        b -= lr * grad_b

    return w, b, history
\`\`\`

Five lines of real work: forward, residual, two gradients, update. This is the same skeleton as the PyTorch loop — PyTorch just computes the gradients automatically and adds more layers.

## Reading the loss history

Plot \`history\`. On well-scaled data with a reasonable learning rate:

- **Smooth exponential-looking decay to a plateau** → working correctly.
- **Loss increases, then \`inf\`/\`nan\`** → learning rate too large; the updates overshoot and diverge. Halve \`lr\` until it is stable.
- **Loss barely moves** → learning rate too small, or features on wildly different scales. Standardise \`X\` (subtract mean, divide by std) first — this is why feature scaling matters.
- **Loss decays then wiggles around a floor** → normal; the floor is the irreducible noise in the data.

## Feature scaling changes everything

If one feature ranges 0–1 and another 0–100000, the loss surface is a long thin valley. Gradient descent zig-zags down the steep direction and crawls along the shallow one. Standardising every feature to mean 0, std 1 makes the bowl round and convergence fast. Always scale before gradient descent (fit the scaler on training data only).

## Batch vs stochastic vs mini-batch

- **Batch GD** (above): uses all \`n\` rows per step. Exact gradient, but one slow step per epoch; infeasible when \`n\` is millions.
- **Stochastic GD (SGD)**: one random row per step. Noisy, fast, and the noise helps escape bad regions.
- **Mini-batch GD**: 32–512 rows per step. The universal compromise — enough signal, GPU-friendly, still fast. This is what "SGD" means in practice in deep learning.

\`\`\`python
for _ in range(epochs):
    idx = rng.permutation(n)
    for start in range(0, n, batch_size):
        b_idx = idx[start:start + batch_size]
        Xb, yb = X[b_idx], y[b_idx]
        # ... same forward/backward/update on the batch
\`\`\`

## Extensions you will meet

- **Momentum**: accumulate a velocity \`v = β v + grad\`; step with \`v\`. Smooths noise, accelerates through plateaus.
- **Adam**: per-parameter adaptive learning rates from running estimates of the gradient mean and variance. The default optimiser for deep learning; \`lr=1e-3\` is the canonical starting point.
- **Learning-rate schedules**: start higher, decay over time (step, cosine, warmup). Helps reach a sharper minimum without diverging early.

All of them are the same loop — forward, backward, update — with a smarter update rule.
`,
}

export const quiz: Record<string, QuizQuestion[]> = {

'307.1': [
  {
    question: 'In deep learning, what does the dot product `w · x` between a weight vector and an input vector represent?',
    options: [
      'The Euclidean distance between w and x',
      'A single scalar score measuring how strongly x aligns with the direction w — the pre-activation of a neuron (before adding bias)',
      'The element-wise product, producing a vector the same size as x',
      'The angle between w and x in radians',
    ],
    correctIndex: 1,
    explanation: 'w · x = Σ wᵢxᵢ is one number. A neuron computes w · x + b then applies a non-linearity. Attention scores, similarity search, and linear models are all built from this operation.',
  },
  {
    question: 'For matrices with shapes (m, k) and (k, n), the matrix product has shape (m, n). What happens with shapes (m, k) and (j, n) where k ≠ j?',
    options: [
      'The product has shape (m, n) and the mismatch is ignored',
      'NumPy broadcasts the smaller matrix',
      'It is undefined — the inner dimensions must match, and NumPy raises a shape error',
      'The product has shape (m, j)',
    ],
    correctIndex: 2,
    explanation: 'Matrix multiplication requires the number of columns of the left matrix to equal the number of rows of the right matrix (the inner dimensions). Otherwise the row·column dot products are not defined and NumPy raises ValueError.',
  },
  {
    question: 'What does normalising a vector (dividing by its L2 norm) achieve, and why is it done before cosine similarity?',
    options: [
      'It removes negative components; cosine similarity needs non-negative vectors',
      'It produces a unit-length vector representing direction only, so the dot product of two normalised vectors equals their cosine similarity',
      'It sorts the vector components in descending order',
      'It converts the vector to integers for faster computation',
    ],
    correctIndex: 1,
    explanation: 'v/‖v‖ has length 1. Since cos θ = (a·b)/(‖a‖‖b‖), normalising both vectors makes the denominator 1, so cosine similarity reduces to a plain dot product — which is why vector databases store normalised embeddings.',
  },
  {
    question: 'A 2-layer MLP computes `h = relu(X @ W1 + b1)` then `y = h @ W2 + b2`. If X is (n, 784), W1 is (784, 256), and W2 is (256, 10), what is the shape of y?',
    options: ['(n, 784)', '(n, 256)', '(n, 10)', '(256, 10)'],
    correctIndex: 2,
    explanation: 'X @ W1 -> (n, 256); relu keeps the shape; h @ W2 -> (n, 10); adding b2 (shape (10,)) broadcasts. The output has one row per sample and one column per class.',
  },
  {
    question: 'Why is L1 regularisation (penalising Σ|wᵢ|) associated with sparse solutions while L2 (penalising Σwᵢ²) is not?',
    options: [
      'L1 is computed faster so it converges before all weights become non-zero',
      'The L1 penalty has a constant gradient magnitude that keeps pushing small weights exactly to zero, whereas the L2 gradient shrinks as the weight approaches zero',
      'L1 only works on positive weights',
      'They both produce equally sparse solutions',
    ],
    correctIndex: 1,
    explanation: 'd/dw of |w| is ±1 regardless of how small w is, so L1 drives weights fully to 0. d/dw of w² is 2w, which vanishes as w -> 0, so L2 merely shrinks weights toward (but not to) zero.',
  },
],

'307.2': [
  {
    question: 'The gradient descent update is θ ← θ − η·∇L(θ). Why subtract the gradient rather than add it?',
    options: [
      'To keep the parameters positive',
      'The gradient points in the direction of steepest increase of the loss; moving opposite to it decreases the loss',
      'Adding the gradient would make the computation unstable',
      'It is an arbitrary convention with no mathematical basis',
    ],
    correctIndex: 1,
    explanation: '∇L points uphill (steepest ascent). To minimise the loss you step downhill, i.e. in the −∇L direction. η scales the step.',
  },
  {
    question: 'During training the loss quickly becomes NaN. Which is the most likely cause and first thing to try?',
    options: [
      'The dataset is too small; add more data',
      'The learning rate is too high (or numerical instability); lower the learning rate and/or add gradient clipping',
      'The model has too few parameters; make it bigger',
      'The GPU is out of memory',
    ],
    correctIndex: 1,
    explanation: 'An exploding loss almost always means steps are too large — the parameters overshoot into a region of huge loss and gradients, feeding back until values overflow. Reduce η, clip gradient norm, check for divide-by-zero / log(0).',
  },
  {
    question: 'What does backpropagation actually compute, and how does the chain rule enable it?',
    options: [
      'It computes the forward pass twice for numerical stability',
      'It computes the gradient of the loss with respect to every parameter by composing per-layer derivatives from the output back to the input, reusing intermediate results',
      'It randomly perturbs each parameter and measures the loss change',
      'It computes the inverse of the weight matrices',
    ],
    correctIndex: 1,
    explanation: 'A network is a composition of functions; the chain rule says the derivative of a composition is the product of the derivatives. Backprop applies this from the loss backward, so each parameter\'s gradient is obtained in roughly one extra pass.',
  },
  {
    question: 'Why did deep networks largely move from sigmoid/tanh activations to ReLU in hidden layers?',
    options: [
      'ReLU is a smoother function',
      'The derivative of sigmoid/tanh is near zero when the input is large in magnitude, so gradients shrink toward zero through many layers (vanishing gradients); ReLU has derivative 1 for positive inputs',
      'ReLU outputs probabilities directly',
      'sigmoid and tanh cannot be computed on GPUs',
    ],
    correctIndex: 1,
    explanation: 'sigmoid\'s max derivative is 0.25 and it saturates to ~0 at the tails. Multiplying many such factors during backprop makes early-layer gradients vanish. ReLU passes gradient unchanged for x > 0, keeping deep training viable.',
  },
  {
    question: 'You call loss.backward() and optimizer.step() each iteration but forget optimizer.zero_grad(). What goes wrong?',
    options: [
      'Nothing — PyTorch clears gradients automatically',
      'Gradients from successive batches accumulate (add up) instead of being replaced, so each update uses a stale, inflated gradient and training misbehaves',
      'The model\'s parameters are frozen',
      'The loss is computed on the wrong batch',
    ],
    correctIndex: 1,
    explanation: 'PyTorch accumulates gradients into .grad by design (useful for gradient accumulation). Without zero_grad() each backward() adds to the previous gradients, so steps are based on a sum over many batches rather than the current one.',
  },
],

'307.3': [
  {
    question: 'A disease affects 1 in 1000 people. A test is 99% accurate (99% sensitivity and 99% specificity). A random person tests positive. Roughly what is the probability they actually have the disease?',
    options: [
      'About 99%',
      'About 90%',
      'About 9% — most positives are false positives because the condition is rare (base-rate effect)',
      'Exactly 50%',
    ],
    correctIndex: 2,
    explanation: 'Out of 1000 people: ~1 true positive, but ~10 false positives (1% of 999). So P(disease | positive) ≈ 1/11 ≈ 9%. When the base rate is low, even an accurate test yields mostly false positives — the same reason accuracy misleads on rare-event classification.',
  },
  {
    question: 'Two features have a Pearson correlation of 0.0 with the target. What can you conclude?',
    options: [
      'The features are statistically independent of the target and can be dropped',
      'There is no linear relationship with the target, but a non-linear one (e.g. U-shaped) may still exist and be useful to a non-linear model',
      'The features are duplicates of each other',
      'The target has zero variance',
    ],
    correctIndex: 1,
    explanation: 'Pearson r measures linear association only. A feature with r ≈ 0 can still be highly predictive through a non-monotonic relationship; tree models and neural nets can exploit it. Never drop features on zero linear correlation alone.',
  },
  {
    question: 'Why should you report a model metric as "mean ± std over 5 seeds" rather than a single number?',
    options: [
      'It makes the results look more scientific',
      'A single run\'s metric is a noisy estimate; random initialisation and data shuffling cause run-to-run variance, and a small apparent improvement may be within that noise',
      'Journals require exactly 5 seeds',
      'It reduces training time',
    ],
    correctIndex: 1,
    explanation: 'Different seeds change weight init, batch order, and dropout masks, producing different final metrics. Without the spread you cannot tell whether a change genuinely helped or you got a lucky (or unlucky) draw.',
  },
  {
    question: 'For a dataset of user session durations that is heavily right-skewed with a few very long sessions, which summary is most representative of a "typical" session, and what preprocessing often helps a model?',
    options: [
      'The mean; standardise by subtracting the mean',
      'The median; a log1p transform to compress the long tail',
      'The maximum; clip all values to it',
      'The mode; one-hot encode the durations',
    ],
    correctIndex: 1,
    explanation: 'The mean is pulled up by the long tail, so the median better reflects a typical value. Applying log1p makes the distribution more symmetric, which helps linear models and gradient-based training.',
  },
  {
    question: 'What is "data leakage" in a statistical/ML context?',
    options: [
      'Losing rows of data due to a disk failure',
      'Information from outside the training data (especially the validation/test set or the future) influencing the model, producing over-optimistic offline metrics that do not hold in deployment',
      'Sending private data to an external API',
      'A memory leak during training',
    ],
    correctIndex: 1,
    explanation: 'Leakage is when the training process gains access to information it would not have at prediction time — scaling fitted on the whole dataset, duplicate rows across splits, target-derived features, or a non-chronological split for time series. It inflates validation scores and collapses in production.',
  },
],
}

export const codingTask: Record<string, {
  instructions: string; boilerplate: string; rubric: string[]; hints: string[]
}> = {

'307.4': {
  instructions: `Implement gradient descent for linear regression from scratch in \`gradient_descent.py\` — no scikit-learn, only NumPy. This is the algorithm underneath most of ML.

Model: \`ŷ = X @ w + b\`. Loss: mean squared error \`L = mean((ŷ - y)²)\`.

1. \`predict(X, w, b) -> np.ndarray\` — \`X\` is \`(n, d)\`, \`w\` is \`(d,)\`, \`b\` is a float. Return \`(n,)\`.

2. \`mse_loss(X, y, w, b) -> float\` — mean squared error as a Python float.

3. \`gradients(X, y, w, b) -> tuple[np.ndarray, float]\` — return \`(grad_w, grad_b)\` where, with \`r = predict(...) - y\` (shape \`(n,)\`):
   - \`grad_w = (2/n) * X.T @ r\`  (shape \`(d,)\`)
   - \`grad_b = (2/n) * r.sum()\`  (float)

4. \`fit(X, y, lr=0.01, epochs=1000, seed=0) -> dict\` — initialise \`w\` with \`np.random.default_rng(seed).normal(0, 0.01, size=d)\` and \`b = 0.0\`. For each epoch: compute gradients on the **full** dataset, update \`w -= lr * grad_w\`, \`b -= lr * grad_b\`, and record the loss. Return \`{"w": w, "b": b, "loss_history": [floats], "epochs": epochs}\`. \`loss_history\` has one entry per epoch (the loss **before** that epoch's update).

5. \`r2_score(X, y, w, b) -> float\` — coefficient of determination \`1 - SS_res / SS_tot\` where \`SS_res = sum((y - ŷ)²)\`, \`SS_tot = sum((y - mean(y))²)\`.

Acceptance criteria:
- pure NumPy, vectorised, no explicit sample loops (an epoch loop is fine)
- on well-conditioned data with a suitable \`lr\`, \`loss_history\` is non-increasing and converges
- \`gradients\` matches the analytic MSE gradient (verifiable by finite differences)
- \`fit\` is reproducible for a fixed seed
- \`r2_score\` returns ~1.0 for a near-perfect fit`,
  boilerplate: `"""Linear regression via batch gradient descent — NumPy only."""
import numpy as np


def predict(X: np.ndarray, w: np.ndarray, b: float) -> np.ndarray:
    # TODO: X @ w + b
    raise NotImplementedError


def mse_loss(X: np.ndarray, y: np.ndarray, w: np.ndarray, b: float) -> float:
    # TODO: mean of squared residuals
    raise NotImplementedError


def gradients(X: np.ndarray, y: np.ndarray, w: np.ndarray, b: float):
    # TODO: r = predict - y; grad_w = 2/n X.T r; grad_b = 2/n sum(r)
    raise NotImplementedError


def fit(X: np.ndarray, y: np.ndarray, lr: float = 0.01, epochs: int = 1000, seed: int = 0) -> dict:
    n, d = X.shape
    rng = np.random.default_rng(seed)
    w = rng.normal(0, 0.01, size=d)
    b = 0.0
    loss_history = []
    # TODO: epoch loop: record loss, compute grads, update w and b
    raise NotImplementedError


def r2_score(X: np.ndarray, y: np.ndarray, w: np.ndarray, b: float) -> float:
    # TODO: 1 - SS_res / SS_tot
    raise NotImplementedError
`,
  rubric: [
    'predict returns X @ w + b with shape (n,)',
    'mse_loss returns the mean of squared residuals as a float',
    'gradients returns grad_w = (2/n) * X.T @ r and grad_b = (2/n) * r.sum() with r = predict - y',
    'gradients result matches a finite-difference check of mse_loss',
    'fit initialises w via np.random.default_rng(seed).normal(0, 0.01, size=d) and b = 0.0',
    'fit updates w and b by -lr * gradient each epoch on the full batch',
    'fit records one loss per epoch (pre-update) in loss_history',
    'fit loss_history is non-increasing / converges on well-conditioned data with a sane lr',
    'fit is reproducible for a fixed seed',
    'r2_score computes 1 - SS_res/SS_tot and is ~1.0 for a near-perfect fit',
    'implementation is vectorised with no per-sample Python loops',
  ],
  hints: [
    'predict: return X @ w + b.',
    'mse_loss: r = predict(X, w, b) - y; return float(np.mean(r ** 2)).',
    'gradients: n = len(y); r = predict(X, w, b) - y; return (2 / n) * (X.T @ r), float((2 / n) * r.sum()).',
    'fit loop: for _ in range(epochs): loss_history.append(mse_loss(...)); gw, gb = gradients(...); w = w - lr * gw; b = b - lr * gb.',
    'r2: yhat = predict(X, w, b); ss_res = np.sum((y - yhat) ** 2); ss_tot = np.sum((y - y.mean()) ** 2); return float(1 - ss_res / ss_tot).',
    'If loss diverges in your own testing, that means lr is too large — the algorithm is fine.',
  ],
},
}
