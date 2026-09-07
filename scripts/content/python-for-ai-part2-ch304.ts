// Part II — Intermediate Python & Numerical Computing
// Chapter 304: NumPy & Vectorized Computing

import type { QuizQuestion } from '../../src/data/curriculum'

export const courseId = 'python-for-ai'

export const content: Record<string, string> = {

'304.1': `# ndarrays, dtypes & Shape

NumPy is the foundation of the entire scientific Python stack. pandas, scikit-learn, SciPy, and PyTorch tensors all share NumPy's mental model. Every AI practitioner must be fluent with the \`ndarray\`.

## Why not just use lists?

A Python list of a million floats stores a million separate Python objects, scattered in memory, each with type info and a reference count. A NumPy array stores the raw numbers in one contiguous block. This makes NumPy **10–100x faster** and far more memory-efficient, and lets it push loops down into optimised C.

\`\`\`python
import numpy as np

a = np.array([1, 2, 3, 4])            # from a list
z = np.zeros((3, 4))                   # 3x4 of 0.0
o = np.ones(5)
e = np.empty((2, 2))                  # uninitialised — fast, contents are garbage
r = np.arange(0, 10, 2)               # [0 2 4 6 8]
l = np.linspace(0, 1, 5)             # [0. 0.25 0.5 0.75 1.]
i = np.eye(3)                         # 3x3 identity
f = np.full((2, 3), 7)
\`\`\`

## The four attributes to always check

\`\`\`python
x = np.random.randn(32, 3, 224, 224)   # a batch of images
x.shape      # (32, 3, 224, 224)  — size along each axis
x.ndim       # 4                  — number of axes
x.dtype      # dtype('float64')   — element type
x.size       # 4816896            — total elements
\`\`\`

**\`shape\` is the single most important thing to track in AI code.** Most bugs in model code are shape mismatches. When something breaks, print shapes first.

## Axes

An axis is a dimension. For a 2-D array of shape \`(rows, cols)\`, axis 0 runs down the rows, axis 1 across the columns. Reductions take an \`axis\` argument:

\`\`\`python
m = np.array([[1, 2, 3],
              [4, 5, 6]])
m.sum()             # 21   — everything
m.sum(axis=0)       # [5 7 9]   — collapse rows, one value per column
m.sum(axis=1)       # [6 15]    — collapse columns, one value per row
m.mean(axis=0)      # [2.5 3.5 4.5]
m.max(axis=1)       # [3 6]
m.argmax(axis=1)    # [2 2]    — index of the max — this is how you turn logits into predictions
\`\`\`

Mnemonic: \`axis=i\` means "the axis that disappears."

## dtypes

The element type controls memory and precision. In ML you constantly convert between them.

| dtype | Bytes | Use |
|---|---|---|
| \`float64\` | 8 | NumPy default; scientific computing |
| \`float32\` | 4 | ML standard — half the memory, plenty of precision |
| \`float16\` / \`bfloat16\` | 2 | mixed-precision training, large models |
| \`int64\` | 8 | indices, counts |
| \`int32\` / \`int8\` | 4 / 1 | quantised weights, compact labels |
| \`bool\` | 1 | masks |

\`\`\`python
x = np.array([1.5, 2.5, 3.5])
x.dtype                      # float64
x32 = x.astype(np.float32)   # explicit conversion
labels = np.array([0, 1, 1, 0], dtype=np.int64)
\`\`\`

Integer arrays do **integer division and can overflow silently**: \`np.array([200], dtype=np.int8) + np.array([100], dtype=np.int8)\` wraps around. When in doubt, work in \`float32\`.

## Reshaping

Same data, different shape — no copy:

\`\`\`python
a = np.arange(12)
a.reshape(3, 4)
a.reshape(3, -1)       # -1 means "infer this axis" -> (3, 4)
a.reshape(2, 2, 3)
a[:, None]             # (12,) -> (12, 1)  add an axis
a.ravel()              # flatten to 1-D
m.T                    # transpose (swap axes)
np.expand_dims(a, 0)   # (12,) -> (1, 12)
np.squeeze(x)          # drop size-1 axes
\`\`\`

Adding/removing size-1 axes (\`None\`/\`np.newaxis\`, \`expand_dims\`, \`squeeze\`) is constant in model code to make shapes line up for broadcasting.

## Views vs copies

Slicing returns a **view** — a window onto the same memory. Writing to it changes the original:

\`\`\`python
a = np.arange(10)
b = a[2:5]
b[0] = 99
a          # [ 0  1 99  3  4  5  6  7  8  9]  — a changed!
c = a[2:5].copy()   # independent
\`\`\`

Fancy indexing (with a list/array of indices or a boolean mask) always returns a **copy**. Knowing which you have prevents both accidental mutation and needless memory use.
`,

'304.2': `# Indexing, Slicing & Boolean Masking

Selecting the right elements without a Python loop is the core NumPy skill. It is how you filter datasets, apply thresholds, gather predictions, and build masks for attention or padding.

## Basic slicing (per axis)

\`\`\`python
x = np.arange(24).reshape(4, 6)

x[0]            # first row            -> shape (6,)
x[:, 0]         # first column         -> shape (4,)
x[1:3, 2:5]     # rows 1-2, cols 2-4   -> shape (2, 3)
x[::2]          # every other row
x[::-1]         # rows reversed
x[-1, -1]       # last element
x[1]            # same as x[1, :]
\`\`\`

Each axis gets its own \`start:stop:step\`, comma-separated. \`...\` (Ellipsis) fills in "all remaining axes": \`x[..., 0]\` is the first element along the last axis, whatever the rank.

## Boolean masking — the workhorse

A comparison produces a boolean array; indexing with it keeps the \`True\` positions.

\`\`\`python
scores = np.array([0.2, 0.9, 0.5, 0.95, 0.1])

mask = scores > 0.5          # [False  True False  True False]
scores[mask]                 # [0.9  0.95]
scores[scores > 0.5]         # same, inline
(scores > 0.5).sum()         # 2   — count how many
(scores > 0.5).mean()        # 0.4 — fraction (accuracy is literally this)
np.where(scores > 0.5)       # (array([1, 3]),)  — the indices
\`\`\`

Combine conditions with \`&\`, \`|\`, \`~\` — **not** \`and\`/\`or\` — and parenthesise each term:

\`\`\`python
keep = (scores > 0.3) & (scores < 0.9)
outliers = data[(data < lo) | (data > hi)]
\`\`\`

Assignment through a mask edits in place:

\`\`\`python
x[x < 0] = 0                 # ReLU by hand
predictions[confidence < 0.5] = -1    # mark low-confidence as "unknown"
\`\`\`

## np.where — vectorised if/else

\`\`\`python
np.where(scores > 0.5, 1, 0)          # class predictions from probabilities
np.where(x > 0, x, 0.01 * x)          # leaky ReLU
np.where(np.isnan(a), 0.0, a)         # fill NaNs
\`\`\`

Reads as "where condition, take A, else take B", element-wise.

## Fancy (integer) indexing

Pass an array of indices to pick specific elements in any order, with repeats:

\`\`\`python
labels = np.array([10, 20, 30, 40, 50])
labels[[0, 2, 4]]            # [10 30 50]
labels[[2, 2, 2]]            # [30 30 30]

# 2-D: pair up row and column index arrays
m = np.arange(12).reshape(3, 4)
rows = np.array([0, 1, 2])
cols = np.array([1, 3, 0])
m[rows, cols]               # [1  7  8]  — one element per pair
\`\`\`

This is how you gather the predicted-class probability for each row:

\`\`\`python
probs = softmax(logits)                 # (batch, n_classes)
correct_class_prob = probs[np.arange(len(y)), y]     # (batch,)
\`\`\`

## Shuffling and sampling — for train/test splits

\`\`\`python
rng = np.random.default_rng(seed=42)     # modern RNG — always seed for reproducibility

idx = rng.permutation(len(X))            # shuffled 0..n-1
X, y = X[idx], y[idx]                     # shuffle in unison

split = int(0.8 * len(X))
X_train, X_test = X[:split], X[split:]
y_train, y_test = y[:split], y[split:]

batch_idx = rng.choice(len(X), size=32, replace=False)   # a random minibatch
\`\`\`

## argsort / argmax — indices, not values

\`\`\`python
scores.argmax()               # index of the best
scores.argsort()[::-1][:5]    # indices of the top 5, descending  (retrieval!)
np.argpartition(scores, -10)[-10:]   # top-10 indices, faster, unordered
\`\`\`

Top-k retrieval — the heart of vector search — is exactly \`argsort\` on a similarity vector.
`,

'304.3': `# Broadcasting & Vectorization

**Vectorization** means expressing a computation as array operations instead of Python loops, so NumPy runs it in compiled C over contiguous memory. **Broadcasting** is the set of rules that lets NumPy combine arrays of different shapes without you manually copying data. Together they are why numerical Python is fast.

## Vectorization

\`\`\`python
# slow: Python loop, ~1,000,000 interpreter steps
out = []
for xi in x:
    out.append(xi * 2 + 1)

# fast: one C loop
out = x * 2 + 1
\`\`\`

Element-wise operators (\`+ - * / ** %\`), comparisons, and **ufuncs** (\`np.exp\`, \`np.log\`, \`np.sqrt\`, \`np.sin\`, \`np.maximum\`, \`np.clip\`, ...) all apply across the whole array at C speed.

\`\`\`python
sigmoid = 1 / (1 + np.exp(-z))
relu    = np.maximum(0, z)
norm    = (x - x.mean()) / x.std()          # standardisation
mse     = np.mean((y_pred - y_true) ** 2)
dist    = np.sqrt(np.sum((a - b) ** 2))     # Euclidean distance
\`\`\`

The rule of thumb: **if you are writing a \`for\` loop over array elements in AI code, there is almost always a vectorized form** — and it will be 10-100x faster.

## Broadcasting rules

When NumPy operates on two arrays, it compares their shapes **element-wise from the right**. Two dimensions are compatible when they are equal, or one of them is 1. A missing dimension is treated as 1.

\`\`\`
(3, 4)  +  (4,)      ->  (4,) becomes (1, 4) -> stretched to (3, 4)   OK
(3, 4)  +  (3, 1)    ->  (3, 1) stretched across columns -> (3, 4)     OK
(3, 4)  +  (3,)      ->  (3,) becomes (1, 3), 3 vs 4 mismatch          ERROR
(32, 3, 224, 224) + (3, 1, 1)  ->  per-channel op over a batch        OK
\`\`\`

No data is actually copied — NumPy iterates cleverly. That makes broadcasting both fast and memory-light.

## Everyday broadcasting patterns

\`\`\`python
# subtract per-column mean (feature normalisation)
X_centered = X - X.mean(axis=0)              # (n, d) - (d,) -> (n, d)

# per-row normalisation to unit length (needed before cosine similarity)
norms = np.linalg.norm(X, axis=1, keepdims=True)   # (n, 1) — keepdims is essential
X_unit = X / norms                                 # (n, d) / (n, 1) -> (n, d)

# add a bias vector to every row of a linear layer output
Y = X @ W + b                               # (n, out) + (out,) -> (n, out)

# pairwise differences via a new axis
A = np.arange(5)
diff = A[:, None] - A[None, :]              # (5,1) - (1,5) -> (5, 5) outer difference
\`\`\`

### keepdims — the detail that trips everyone

\`X.mean(axis=1)\` on shape \`(n, d)\` gives \`(n,)\`, which will **not** broadcast back against \`(n, d)\` (n vs d from the right). \`X.mean(axis=1, keepdims=True)\` gives \`(n, 1)\`, which broadcasts perfectly. Use \`keepdims=True\` whenever you reduce and then combine with the original.

## Pairwise distance matrix — a broadcasting showcase

Computing all pairwise squared distances between rows of \`A\` (shape \`(m, d)\`) and \`B\` (shape \`(n, d)\`) with **no loops**:

\`\`\`python
# (m, 1, d) - (1, n, d) -> (m, n, d), then sum over d
d2 = ((A[:, None, :] - B[None, :, :]) ** 2).sum(axis=2)    # (m, n)
\`\`\`

Or the algebra-optimised form used inside libraries:

\`\`\`python
d2 = (A**2).sum(1)[:, None] + (B**2).sum(1)[None, :] - 2 * A @ B.T
\`\`\`

## When a loop is unavoidable

Not everything vectorizes (recurrences where step *t* depends on step *t-1*). Options, best first: rethink the recurrence (cumsum, cumprod, scan), use \`np.frompyfunc\` / \`np.vectorize\` (convenience, **not** speed), or accept the loop and keep it small — do everything else in bulk and loop only over the irreducible part.
`,

'304.4': `# Linear Algebra & Random with NumPy

Neural networks are matrix multiplications interleaved with non-linearities. Embeddings, similarity search, PCA, and least-squares regression are all linear algebra. NumPy gives you the operations directly.

## Matrix multiplication: @ vs *

\`\`\`python
A = np.random.randn(3, 4)
B = np.random.randn(4, 2)

A @ B          # matrix product -> (3, 2)     — inner dims (4) must match
A * A          # ELEMENT-WISE product         — a completely different thing
A.dot(B)       # same as A @ B
\`\`\`

Confusing \`*\` (Hadamard) with \`@\` (matmul) is one of the most common numerical bugs. A linear layer is \`y = x @ W.T + b\`.

\`\`\`python
np.dot(u, v)                 # 1-D · 1-D -> scalar (dot product)
u @ v                        # same
A @ x                        # matrix-vector -> vector
batch @ W                    # (B, in) @ (in, out) -> (B, out)   — broadcasting matmul
np.matmul(X, Y)              # explicit; supports stacks of matrices
\`\`\`

Batched matmul: if \`X\` is \`(B, m, k)\` and \`Y\` is \`(B, k, n)\`, \`X @ Y\` is \`(B, m, n)\` — it multiplies matrix-by-matrix across the batch. This is attention.

## Norms, similarity, normalization

\`\`\`python
np.linalg.norm(v)                       # L2 length of a vector
np.linalg.norm(X, axis=1)               # L2 norm of each row
np.linalg.norm(a - b)                   # Euclidean distance

# cosine similarity between two vectors
cos = (a @ b) / (np.linalg.norm(a) * np.linalg.norm(b))

# cosine similarity of a query against every row of a matrix (vector search!)
Xn = X / np.linalg.norm(X, axis=1, keepdims=True)
qn = q / np.linalg.norm(q)
sims = Xn @ qn                          # (n,) — one score per document
top5 = np.argsort(sims)[::-1][:5]
\`\`\`

If you normalise all vectors to unit length first, cosine similarity **is** the dot product — which is why real vector databases store normalised embeddings.

## The linalg module

\`\`\`python
np.linalg.inv(A)                 # inverse (avoid when you can — solve is better)
np.linalg.solve(A, b)            # solve Ax = b   — faster & more stable than inv(A) @ b
np.linalg.det(A)                 # determinant
vals, vecs = np.linalg.eig(A)    # eigenvalues / eigenvectors
U, S, Vt = np.linalg.svd(X)      # singular value decomposition — PCA, low-rank
np.linalg.lstsq(X, y, rcond=None)  # least-squares regression solution
np.linalg.matrix_rank(A)
np.trace(A)
\`\`\`

Least-squares linear regression in one line:

\`\`\`python
# add a bias column, then solve
Xb = np.c_[np.ones(len(X)), X]
w, *_ = np.linalg.lstsq(Xb, y, rcond=None)
y_hat = Xb @ w
\`\`\`

## Random numbers — the modern API

Use \`np.random.default_rng()\`, not the legacy \`np.random.seed\` / \`np.random.rand\` functions.

\`\`\`python
rng = np.random.default_rng(seed=0)

rng.random((2, 3))                 # uniform [0, 1)
rng.standard_normal((100, 10))     # N(0, 1)  — weight init
rng.normal(loc=0, scale=0.02, size=W.shape)
rng.integers(0, 10, size=5)        # random ints
rng.choice(n, size=32, replace=False)   # sample without replacement — minibatch
rng.permutation(n)                 # shuffled indices — epoch shuffle
rng.shuffle(arr)                   # in place
\`\`\`

### Reproducibility

Seed **every** source of randomness at the start of a run — NumPy, Python's \`random\`, and your ML framework — and record the seed:

\`\`\`python
SEED = 42
rng = np.random.default_rng(SEED)
random.seed(SEED)
# torch.manual_seed(SEED)
\`\`\`

Without this, two runs of the same code give different numbers and you cannot tell whether a change helped or you just got lucky.

## Numerical stability

- **Softmax**: subtract the max before \`exp\` — \`np.exp(z - z.max(axis=-1, keepdims=True))\` — or \`exp\` overflows.
- **Log-space**: multiply many small probabilities as sums of logs (\`np.log\`, \`np.logaddexp\`) to avoid underflow to 0.
- **Division**: add a small \`eps\` (\`1e-8\`) to denominators like norms and standard deviations.
- **Precision**: \`float32\` accumulation of a million terms loses accuracy; \`x.sum(dtype=np.float64)\` when it matters.
`,
}

export const quiz: Record<string, QuizQuestion[]> = {

'304.2': [
  {
    question: 'What does `x[x < 0] = 0` do to a NumPy array x?',
    options: [
      'Raises an error — you cannot assign to an indexed array',
      'Creates a new array with negatives removed',
      'Sets every negative element of x to 0 in place (a vectorised ReLU)',
      'Sets the first negative element to 0',
    ],
    correctIndex: 2,
    explanation: 'x < 0 is a boolean mask; assigning a scalar through it writes 0 to every position where the mask is True, modifying x in place. This is the manual form of ReLU / clipping.',
  },
  {
    question: 'Why must you write `(a > 1) & (a < 5)` rather than `(a > 1) and (a < 5)` for NumPy arrays?',
    options: [
      '`and` is slower but otherwise equivalent',
      'Python\'s `and` tries to evaluate the truth value of a whole array, which is ambiguous and raises ValueError; `&` is the element-wise operator',
      '`&` and `and` are identical for arrays',
      '`and` only works on 1-D arrays',
    ],
    correctIndex: 1,
    explanation: 'and/or need a single bool. NumPy refuses to collapse a multi-element array to one truth value ("truth value ... is ambiguous"). The bitwise operators & | ~ work element-wise; parenthesise each comparison because & binds tighter than <.',
  },
  {
    question: 'Given probabilities `probs` of shape (batch, n_classes) and true labels `y` of shape (batch,), what does `probs[np.arange(len(y)), y]` return?',
    options: [
      'The full probability matrix, unchanged',
      'The predicted class for each row',
      'The probability the model assigned to the correct class, for each row — shape (batch,)',
      'The row indices sorted by probability',
    ],
    correctIndex: 2,
    explanation: 'This is fancy indexing with paired index arrays: row i pairs with column y[i], gathering probs[i, y[i]] for every i. It extracts the correct-class probability per example, used in cross-entropy.',
  },
  {
    question: 'To get the indices of the top 5 highest scores in descending order, which is correct?',
    options: [
      'scores.sort()[:5]',
      'scores.argsort()[::-1][:5]',
      'scores.argmax(5)',
      'np.where(scores > 5)',
    ],
    correctIndex: 1,
    explanation: 'argsort() returns indices that would sort ascending; reversing with [::-1] makes it descending; [:5] takes the first five. This is the core operation of top-k retrieval / vector search.',
  },
  {
    question: 'Why seed the RNG with `np.random.default_rng(42)` before a train/test split or weight initialisation?',
    options: [
      'It makes the random numbers more uniformly distributed',
      'It makes the run reproducible, so re-running the same code produces the same split/initialisation and results are comparable',
      'It speeds up random number generation',
      'It is required or NumPy raises an error',
    ],
    correctIndex: 1,
    explanation: 'A fixed seed makes the pseudo-random sequence deterministic. Without it, every run shuffles data and initialises weights differently, so you cannot tell whether a code change or luck caused a metric to move.',
  },
],

'304.4': [
  {
    question: 'For 2-D NumPy arrays A and B, what is the difference between `A @ B` and `A * B`?',
    options: [
      'They are identical',
      '`A @ B` is matrix multiplication (inner dimensions must match); `A * B` is element-wise multiplication (shapes must match/broadcast)',
      '`A * B` is matrix multiplication; `A @ B` is element-wise',
      '`A @ B` only works for square matrices',
    ],
    correctIndex: 1,
    explanation: '@ is the matmul operator: (m,k) @ (k,n) -> (m,n). * is the Hadamard (element-wise) product. Mixing them up is a classic bug; a linear layer is x @ W.T + b, not x * W.',
  },
  {
    question: 'If all embedding vectors are normalised to unit L2 length, cosine similarity between two of them equals what?',
    options: [
      'Their Euclidean distance',
      'Their dot product',
      'Always 1',
      'The angle between them in degrees',
    ],
    correctIndex: 1,
    explanation: 'cosine(a,b) = (a·b)/(‖a‖‖b‖). When ‖a‖ = ‖b‖ = 1 the denominator is 1, so cosine similarity is just a·b. Vector databases store normalised vectors so similarity search reduces to a matrix-vector product.',
  },
  {
    question: 'Why prefer `np.linalg.solve(A, b)` over `np.linalg.inv(A) @ b` to solve Ax = b?',
    options: [
      'solve returns a different, more useful answer',
      'solve is faster and numerically more stable — forming the explicit inverse loses precision and does extra work',
      'inv does not exist in NumPy',
      'solve works on non-square matrices while inv does not',
    ],
    correctIndex: 1,
    explanation: 'Computing inv(A) then multiplying does more floating-point work and amplifies rounding error. LU-based solve gets x directly with better accuracy and speed. Rule: never form an inverse just to multiply by it.',
  },
  {
    question: 'Why subtract the row max before exponentiating in a softmax implementation?',
    options: [
      'It changes the softmax output to be more accurate probabilities',
      'Without it, exp() of large logits overflows to inf; subtracting the max keeps exponents ≤ 0 and the result is mathematically unchanged',
      'It makes the function differentiable',
      'It is only needed for float64',
    ],
    correctIndex: 1,
    explanation: 'softmax is invariant to adding a constant to all logits. Subtracting the max bounds every exponent at 0, avoiding overflow, while producing identical probabilities. This is the standard numerically-stable softmax.',
  },
  {
    question: 'What does `keepdims=True` do in `X.mean(axis=1, keepdims=True)` for X of shape (n, d)?',
    options: [
      'Keeps the mean as an integer',
      'Returns shape (n, 1) instead of (n,), so the result broadcasts back against X',
      'Prevents X from being modified',
      'Keeps all decimal places',
    ],
    correctIndex: 1,
    explanation: 'Without keepdims the reduced axis is removed, giving (n,), which will not broadcast against (n, d). keepdims retains it as size 1 -> (n, 1), which broadcasts cleanly for centering/normalising.',
  },
],
}

export const codingTask: Record<string, {
  instructions: string; boilerplate: string; rubric: string[]; hints: string[]
}> = {

'304.1': {
  instructions: `Implement \`arrays.py\` — foundational NumPy array manipulation, no Python loops over elements anywhere.

1. \`describe(a: np.ndarray) -> dict\` — return \`{"shape": tuple, "ndim": int, "dtype": str, "size": int, "min": float, "max": float, "mean": float}\`. \`dtype\` is \`str(a.dtype)\`. Stats are Python \`float\`s.

2. \`to_float32_batch(arrays: list[np.ndarray]) -> np.ndarray\` — stack a list of equally-shaped arrays into one array with a new **leading** batch axis, cast to \`float32\`. \`[a, b, c]\` each \`(H, W)\` → \`(3, H, W)\` float32.

3. \`standardize(X: np.ndarray, eps: float = 1e-8) -> np.ndarray\` — for a 2-D \`(n, d)\` array, subtract the per-column mean and divide by the per-column std (population std, \`ddof=0\`), adding \`eps\` to the denominator. Result has ~0 mean and ~1 std per column.

4. \`one_hot(labels: np.ndarray, num_classes: int) -> np.ndarray\` — turn a 1-D int array of length \`n\` into an \`(n, num_classes)\` \`float32\` array with a single 1.0 per row. No loop — use fancy indexing or \`np.eye\`.

5. \`train_test_split_idx(n: int, test_frac: float, seed: int) -> tuple[np.ndarray, np.ndarray]\` — return \`(train_idx, test_idx)\`, a random partition of \`0..n-1\`. Use \`np.random.default_rng(seed).permutation\`. \`test\` gets \`round(n * test_frac)\` items; \`train\` gets the rest. Indices within each split may be in shuffled order.

Acceptance criteria:
- no \`for\` loop iterating array elements in any function
- \`standardize\` uses \`axis=0\` and \`ddof=0\`
- \`one_hot\` output dtype is float32 with exactly one 1.0 per row
- split is reproducible for a fixed seed and the two index sets are disjoint and cover \`0..n-1\``,
  boilerplate: `"""Foundational NumPy helpers."""
import numpy as np


def describe(a: np.ndarray) -> dict:
    # TODO: shape/ndim/dtype/size + min/max/mean as Python floats
    raise NotImplementedError


def to_float32_batch(arrays: list[np.ndarray]) -> np.ndarray:
    # TODO: np.stack then astype(np.float32)
    raise NotImplementedError


def standardize(X: np.ndarray, eps: float = 1e-8) -> np.ndarray:
    # TODO: (X - mean) / (std + eps), per column
    raise NotImplementedError


def one_hot(labels: np.ndarray, num_classes: int) -> np.ndarray:
    # TODO: np.eye(num_classes, dtype=np.float32)[labels]
    raise NotImplementedError


def train_test_split_idx(n: int, test_frac: float, seed: int):
    # TODO: default_rng(seed).permutation(n); slice by round(n * test_frac)
    raise NotImplementedError
`,
  rubric: [
    'describe returns shape as tuple, ndim/size as int, dtype as str(a.dtype)',
    'describe min/max/mean are Python float',
    'to_float32_batch uses np.stack to add a leading axis and casts to float32',
    'standardize subtracts mean(axis=0) and divides by std(axis=0, ddof=0) + eps',
    'standardize output has near-zero mean and near-unit std per column',
    'one_hot returns (n, num_classes) float32 with exactly one 1.0 per row',
    'one_hot uses vectorised indexing (np.eye[...] or arange fancy indexing), no loop',
    'train_test_split_idx uses np.random.default_rng(seed).permutation',
    'test split size is round(n * test_frac); train and test indices are disjoint and cover 0..n-1',
    'no per-element Python loops anywhere',
  ],
  hints: [
    'describe: {"shape": tuple(a.shape), "ndim": a.ndim, "dtype": str(a.dtype), "size": a.size, "min": float(a.min()), ...}.',
    'to_float32_batch: np.stack(arrays, axis=0).astype(np.float32).',
    'standardize: mu = X.mean(axis=0); sd = X.std(axis=0, ddof=0); return (X - mu) / (sd + eps).',
    'one_hot: np.eye(num_classes, dtype=np.float32)[labels] gives exactly the right shape.',
    'split: idx = np.random.default_rng(seed).permutation(n); k = round(n * test_frac); test_idx, train_idx = idx[:k], idx[k:].',
  ],
},

'304.3': {
  instructions: `Implement \`vectorized.py\` — pure vectorized numerical routines. **No Python loops of any kind.** Each function is one to a few NumPy expressions.

1. \`sigmoid(z: np.ndarray) -> np.ndarray\` — numerically stable logistic function. For large negative \`z\`, \`np.exp(-z)\` overflows; handle both signs (e.g. \`np.where\` on the sign of z, or use \`0.5 * (1 + np.tanh(0.5 * z))\`).

2. \`softmax(logits: np.ndarray, axis: int = -1) -> np.ndarray\` — stable softmax along \`axis\`: subtract \`max\` along that axis (\`keepdims=True\`), exponentiate, divide by the sum along that axis. Rows (along \`axis\`) sum to 1.

3. \`row_normalize(X: np.ndarray, eps: float = 1e-12) -> np.ndarray\` — divide each row of a 2-D array by its L2 norm (+ eps). Result rows have unit length.

4. \`cosine_sim_matrix(A: np.ndarray, B: np.ndarray) -> np.ndarray\` — \`(m, d)\` and \`(n, d)\` → \`(m, n)\` matrix of cosine similarities between every row of A and every row of B. Normalize then matmul.

5. \`pairwise_sq_dists(A: np.ndarray, B: np.ndarray) -> np.ndarray\` — \`(m, d)\`, \`(n, d)\` → \`(m, n)\` of squared Euclidean distances, using the identity \`‖a-b‖² = ‖a‖² + ‖b‖² - 2a·b\`. Clip tiny negatives from float error to 0.

Acceptance criteria:
- no loops; broadcasting and matmul only
- \`softmax\` output sums to 1 along \`axis\` and is overflow-safe for large logits
- \`sigmoid\` does not overflow for \`z = -1000\` or \`z = 1000\`
- \`cosine_sim_matrix\` diagonal is ~1.0 when \`B is A\`
- \`pairwise_sq_dists\` has no negative entries`,
  boilerplate: `"""Vectorized numerical routines — no Python loops."""
import numpy as np


def sigmoid(z: np.ndarray) -> np.ndarray:
    # TODO: stable for both signs of z
    raise NotImplementedError


def softmax(logits: np.ndarray, axis: int = -1) -> np.ndarray:
    # TODO: subtract max (keepdims), exp, normalise by sum (keepdims)
    raise NotImplementedError


def row_normalize(X: np.ndarray, eps: float = 1e-12) -> np.ndarray:
    # TODO: X / (norm(axis=1, keepdims=True) + eps)
    raise NotImplementedError


def cosine_sim_matrix(A: np.ndarray, B: np.ndarray) -> np.ndarray:
    # TODO: row_normalize both, then A_n @ B_n.T
    raise NotImplementedError


def pairwise_sq_dists(A: np.ndarray, B: np.ndarray) -> np.ndarray:
    # TODO: |a|^2 + |b|^2 - 2 A @ B.T, then clip at 0
    raise NotImplementedError
`,
  rubric: [
    'sigmoid is overflow-safe for very large positive and negative z',
    'softmax subtracts the max along axis with keepdims before exp',
    'softmax result sums to 1 along the given axis',
    'row_normalize divides by L2 norm along axis=1 with keepdims and eps',
    'row_normalize rows have unit L2 norm',
    'cosine_sim_matrix normalizes rows of both inputs then does a matmul, output shape (m, n)',
    'cosine_sim_matrix(A, A) has a near-1.0 diagonal',
    'pairwise_sq_dists uses the ||a||^2 + ||b||^2 - 2 a.b identity, output shape (m, n)',
    'pairwise_sq_dists clips small negative values to 0',
    'no Python loops in any function',
  ],
  hints: [
    'sigmoid: return 0.5 * (1.0 + np.tanh(0.5 * z)) is simple and stable.',
    'softmax: m = logits.max(axis=axis, keepdims=True); e = np.exp(logits - m); return e / e.sum(axis=axis, keepdims=True).',
    'row_normalize: n = np.linalg.norm(X, axis=1, keepdims=True); return X / (n + eps).',
    'cosine: An = row_normalize(A); Bn = row_normalize(B); return An @ Bn.T.',
    'dists: a2 = (A**2).sum(1)[:, None]; b2 = (B**2).sum(1)[None, :]; d2 = a2 + b2 - 2 * A @ B.T; return np.clip(d2, 0, None).',
  ],
},
}
