// Part I — Python & Environment Setup
// Chapter 302: Python Language Essentials for AI

import type { QuizQuestion } from '../../src/data/curriculum'

export const courseId = 'python-for-ai'

export const content: Record<string, string> = {

'302.1': `# Core Types, Strings & F-Strings

AI code is mostly ordinary Python: loading config, shaping data, formatting prompts, logging metrics. Fluency with the built-in types removes friction from everything you build later.

## The scalar types

| Type | Example | Notes for AI work |
|---|---|---|
| \`int\` | \`42\`, \`-1\`, \`10_000\` | Arbitrary precision — no overflow. Underscores allowed for readability. |
| \`float\` | \`3.14\`, \`1e-4\`, \`float("inf")\` | 64-bit IEEE 754. Learning rates, losses, probabilities. |
| \`bool\` | \`True\`, \`False\` | Subclass of \`int\`; \`True + True == 2\`. Handy for counting with \`sum()\`. |
| \`str\` | \`"hello"\` | Immutable sequence of Unicode characters. |
| \`None\` | \`None\` | The "no value" singleton. Compare with \`is None\`. |

Dynamic typing means a name can be rebound to any type, but each *object* has a fixed type. \`type(x)\` and \`isinstance(x, (int, float))\` inspect it.

### Numeric gotchas that bite in ML

\`\`\`python
0.1 + 0.2 == 0.3          # False — floating point
abs((0.1 + 0.2) - 0.3) < 1e-9   # the right way to compare floats

7 / 2      # 3.5  — true division always returns float
7 // 2     # 3    — floor division
7 % 2      # 1    — modulo, useful for "every Nth step"
2 ** 10    # 1024 — exponent
\`\`\`

When you see \`if step % 100 == 0:\` in a training loop, that is "do this every 100 steps."

## Strings are everywhere in AI

Prompts, model names, file paths, labels, tokenizer output — all strings. Key operations:

\`\`\`python
name = "  GPT-4o-Mini  "
name.strip()            # "GPT-4o-Mini"
name.strip().lower()    # "gpt-4o-mini"
"a,b,c".split(",")      # ["a", "b", "c"]
"-".join(["2024", "01", "15"])   # "2024-01-15"
"cat" in "concatenate"           # True
"report.csv".endswith(".csv")    # True
"Epoch {}".format(3)             # older style
\`\`\`

Strings are **immutable**: \`s.replace("a", "b")\` returns a new string; the original is unchanged. Building a big string in a loop with \`+=\` is O(n²) — accumulate into a list and \`"".join(parts)\` instead.

## F-strings — the one formatting style to use

Prefix a string with \`f\` and put expressions in \`{}\`:

\`\`\`python
epoch, loss, acc = 3, 0.0421, 0.937
print(f"epoch {epoch}: loss={loss:.4f} acc={acc:.1%}")
# epoch 3: loss=0.0421 acc=93.7%
\`\`\`

Format specifiers after a colon:

| Spec | Result | Use |
|---|---|---|
| \`{loss:.4f}\` | \`0.0421\` | fixed decimals |
| \`{acc:.1%}\` | \`93.7%\` | percentage |
| \`{n:,}\` | \`1,234,567\` | thousands separator |
| \`{lr:.2e}\` | \`3.00e-04\` | scientific — learning rates |
| \`{name:>10}\` | right-align in 10 cols | table output |
| \`{x=}\` | \`x=5\` | debug: prints name and value |

Multi-line f-strings build prompts cleanly:

\`\`\`python
prompt = f"""You are a classifier. Categories: {", ".join(labels)}.

Text: {user_text}
Category:"""
\`\`\`

## Truthiness

Python treats these as falsy: \`False\`, \`None\`, \`0\`, \`0.0\`, \`""\`, \`[]\`, \`{}\`, \`()\`, \`set()\`. Everything else is truthy. So \`if results:\` means "if the list is non-empty," and \`if not text:\` catches both \`None\` and \`""\`.

Careful: \`if x:\` is wrong when \`0\` is a valid value (e.g. a tensor index or a score). Use \`if x is not None:\` there. This exact bug appears constantly in data code where \`0\` and "missing" must stay distinct.

## Type conversion

\`\`\`python
int("42")          # 42
int("42.0")        # ValueError! — go via float("42.0")
float("1e-3")      # 0.001
str(3.14)          # "3.14"
bool("")           # False
list("abc")        # ['a', 'b', 'c']
\`\`\`

User input, CSV cells, and JSON values arrive as strings; converting them safely (with \`try/except ValueError\`) is a routine part of data loading.
`,

'302.2': `# Control Flow, Loops & Comprehensions

## Conditionals

\`\`\`python
if score >= 0.9:
    grade = "A"
elif score >= 0.8:
    grade = "B"
else:
    grade = "C"
\`\`\`

The ternary expression assigns based on a condition in one line — common for defaults and clamping:

\`\`\`python
device = "cuda" if gpu_available else "cpu"
lr = max(lr, 1e-6)            # floor
n = min(batch_size, len(data))  # don't over-read
\`\`\`

Chained comparisons read like math: \`if 0.0 <= p <= 1.0:\`.

## Loops

\`for\` iterates over any iterable — lists, strings, dict keys, files, ranges, NumPy arrays:

\`\`\`python
for i in range(epochs):          # 0 .. epochs-1
for i, sample in enumerate(dataset):        # index + value
for name, value in metrics.items():         # dict pairs
for x, y in zip(features, labels):          # parallel iteration
for i in range(0, len(data), batch_size):   # chunking
\`\`\`

**\`enumerate\` and \`zip\` replace almost every manual index counter.** Reaching for \`range(len(x))\` is usually a sign you actually want \`enumerate\`.

Loop control:

\`\`\`python
for batch in loader:
    if batch is None:
        continue          # skip to next iteration
    if loss < target:
        break             # stop the loop
else:
    print("finished without breaking")   # runs only if no break
\`\`\`

\`while\` loops run until a condition changes — training until convergence, retrying an API call:

\`\`\`python
attempts = 0
while attempts < 3:
    try:
        response = call_api()
        break
    except TimeoutError:
        attempts += 1
\`\`\`

## Comprehensions — the Pythonic transform

A comprehension builds a list/dict/set from an iterable in one expression. It is faster than an equivalent \`for\` loop with \`.append()\` and, once you read them fluently, clearer.

\`\`\`python
# list
squares   = [x**2 for x in range(10)]
lengths   = [len(s) for s in sentences]
cleaned   = [s.strip().lower() for s in raw]

# with a filter
positives = [x for x in scores if x > 0]
long_docs = [d for d in docs if len(d) > 500]

# dict
word_len  = {w: len(w) for w in vocab}
idx_to_word = {i: w for i, w in enumerate(vocab)}

# set
unique_labels = {row["label"] for row in dataset}

# nested (flatten)
flat = [token for doc in corpus for token in doc]
\`\`\`

Read a comprehension left to right as "collect EXPR, for each ITEM, when CONDITION."

### When NOT to use one

- Side effects (printing, writing files): use a plain loop.
- Heavy multi-step logic: a loop with intermediate variables is more readable.
- Huge or infinite sequences: use a **generator expression** \`(x**2 for x in ...)\` with parentheses — it yields lazily and never builds the whole list in memory. Passing one to \`sum()\`, \`max()\`, \`any()\` is idiomatic:

\`\`\`python
total_tokens = sum(len(doc.split()) for doc in corpus)
has_error = any(r.status >= 400 for r in responses)
\`\`\`

## match statement (Python 3.10+)

Structural pattern matching handles multi-way dispatch on shape, not just value:

\`\`\`python
match config["optimizer"]:
    case "adam":
        opt = Adam(params, lr)
    case "sgd" | "momentum":
        opt = SGD(params, lr)
    case _:
        raise ValueError(f"unknown optimizer: {config['optimizer']}")
\`\`\`

For simple value checks a dict lookup is often cleaner; \`match\` shines when destructuring tuples/dicts.
`,

'302.3': `# Functions, *args/**kwargs, Type Hints & Docstrings

Functions are the unit of reuse. AI codebases are built from small functions — \`load_data\`, \`preprocess\`, \`build_model\`, \`train_epoch\`, \`evaluate\` — composed into pipelines.

## Definitions and arguments

\`\`\`python
def train(model, data, lr=1e-3, epochs=10, *, verbose=False):
    ...
\`\`\`

- \`model\`, \`data\` — **positional-or-keyword**, required.
- \`lr\`, \`epochs\` — have **defaults**, so they are optional.
- Everything after \`*\` is **keyword-only**: callers must write \`verbose=True\`, never a bare \`True\`. Use this for flags so call sites stay readable.

### The mutable default trap

\`\`\`python
def add_sample(x, batch=[]):     # BUG: the list is created ONCE
    batch.append(x)
    return batch
\`\`\`

The default list is shared across all calls. Use \`None\` as the sentinel:

\`\`\`python
def add_sample(x, batch=None):
    if batch is None:
        batch = []
    batch.append(x)
    return batch
\`\`\`

This is one of the most-tested Python gotchas — and it does cause real data-leakage bugs.

## *args and **kwargs

\`*args\` collects extra positional arguments into a tuple; \`**kwargs\` collects extra keyword arguments into a dict:

\`\`\`python
def log_metrics(step, **metrics):
    line = " ".join(f"{k}={v:.4f}" for k, v in metrics.items())
    print(f"[{step}] {line}")

log_metrics(100, loss=0.21, acc=0.93, lr=3e-4)
\`\`\`

The mirror image is **unpacking** at the call site:

\`\`\`python
params = {"lr": 1e-3, "epochs": 20}
train(model, data, **params)          # kwargs -> named arguments

defaults = [64, 0.1]
make_layer(*defaults)                  # list -> positional arguments
\`\`\`

Wrapper functions that forward everything to a library call use both:

\`\`\`python
def chat(prompt, **kwargs):
    return client.completions.create(prompt=prompt, model="gpt-4o-mini", **kwargs)
\`\`\`

## Type hints

Hints are optional annotations. Python does not enforce them at runtime, but they power editor autocomplete, catch bugs via \`mypy\`/Pylance, and serve as documentation. Modern AI libraries (Pydantic, FastAPI, LangChain) use them heavily.

\`\`\`python
def preprocess(texts: list[str], max_len: int = 512) -> list[list[int]]:
    ...

def load_config(path: str) -> dict[str, object]:
    ...

from typing import Optional
def find_checkpoint(dir: str) -> Optional[str]:   # str | None
    ...
\`\`\`

Since 3.10 you can write \`str | None\` instead of \`Optional[str]\`, and \`list\`/\`dict\`/\`tuple\` directly instead of importing \`List\`/\`Dict\`.

## Docstrings

The first string literal in a function is its docstring, available as \`func.__doc__\` and shown by \`help(func)\` and editors on hover.

\`\`\`python
def train_epoch(model, loader, optimizer):
    """Run one training epoch.

    Args:
        model: the network in train mode.
        loader: yields (inputs, targets) batches.
        optimizer: updated in place after each batch.

    Returns:
        float: mean loss over the epoch.
    """
\`\`\`

## Functions are first-class

You can pass them as arguments, return them, and store them in dicts — the basis of callbacks, activation-function registries, and higher-order utilities:

\`\`\`python
ACTIVATIONS = {"relu": relu, "gelu": gelu, "tanh": tanh}
act = ACTIVATIONS[config["activation"]]

def with_timing(fn):
    def wrapper(*args, **kwargs):
        t0 = time.perf_counter()
        result = fn(*args, **kwargs)
        print(f"{fn.__name__} took {time.perf_counter()-t0:.2f}s")
        return result
    return wrapper

@with_timing
def build_index(docs): ...
\`\`\`

That \`@with_timing\` syntax is a **decorator** — a function that wraps another function. You will meet them again with \`@dataclass\`, \`@property\`, \`@torch.no_grad()\`, and framework route handlers.

## Lambdas

Small anonymous functions for one-off use, typically as a \`key=\`:

\`\`\`python
results.sort(key=lambda r: r["score"], reverse=True)
best = max(candidates, key=lambda c: c.f1)
\`\`\`

If a lambda gets complex or is reused, promote it to a named \`def\`.
`,

'302.4': `# Data Structures: list, dict, set, tuple

Choosing the right container makes code faster and clearer. Each has a distinct purpose.

## list — ordered, mutable sequence

The workhorse: batches of samples, training-loss history, tokenised sentences.

\`\`\`python
xs = [3, 1, 4, 1, 5]
xs.append(9)          # add to end       O(1)
xs.extend([2, 6])     # add many
xs.insert(0, 0)       # insert at index  O(n)
xs.pop()              # remove & return last
xs[1:4]               # slice -> new list
xs[::-1]              # reversed copy
sorted(xs)            # new sorted list
xs.sort()             # in place
len(xs); sum(xs); min(xs); max(xs)
\`\`\`

Slicing is everywhere in data code: \`data[:split]\` / \`data[split:]\` for train/val, \`seq[-context:]\` for the last N tokens.

## dict — key → value mapping

Config, JSON payloads, metric bundles, word→index vocabularies, model \`state_dict\`. Lookups are O(1) average.

\`\`\`python
config = {"lr": 1e-3, "batch_size": 32}
config["epochs"] = 10
config.get("dropout", 0.0)        # default if absent — no KeyError
config.setdefault("seed", 42)
"lr" in config                    # membership tests keys
for k, v in config.items(): ...
config.update({"lr": 5e-4})
{**base_config, **overrides}      # merge, right side wins
\`\`\`

\`collections.Counter\` and \`defaultdict\` are dict subclasses that show up constantly:

\`\`\`python
from collections import Counter, defaultdict
label_counts = Counter(row["label"] for row in dataset)
label_counts.most_common(3)

groups = defaultdict(list)
for item in data:
    groups[item["category"]].append(item)     # no key-check needed
\`\`\`

Dicts preserve **insertion order** (guaranteed since 3.7).

## set — unordered unique elements

Membership testing and deduplication in O(1). Use it to track seen IDs, compute vocabulary, or compare label sets.

\`\`\`python
seen = set()
for doc_id in stream:
    if doc_id in seen:      # O(1) vs O(n) for a list
        continue
    seen.add(doc_id)

vocab = set()
for sentence in corpus:
    vocab.update(sentence.split())

a, b = {1,2,3}, {2,3,4}
a & b        # {2, 3}  intersection
a | b        # {1,2,3,4} union
a - b        # {1}  difference
\`\`\`

If you find yourself writing \`if x in big_list\` inside a loop, convert \`big_list\` to a set first — this single change turns an O(n²) routine into O(n).

## tuple — immutable, fixed-shape record

Returning multiple values, dictionary keys, array shapes, coordinates. Immutability signals "this grouping won't change."

\`\`\`python
def split_xy(row):
    return row[:-1], row[-1]      # returns a tuple

features, label = split_xy(row)   # unpacking

shape = (32, 3, 224, 224)         # batch, channels, H, W
cache = {}
cache[(user_id, doc_id)] = score  # tuple as composite key — a list can't do this
\`\`\`

\`namedtuple\` and \`typing.NamedTuple\` give tuples named fields when you want lightweight structure without a full class.

## Copying — the reference trap

Assignment never copies; it binds another name to the same object.

\`\`\`python
a = [[1, 2], [3, 4]]
b = a
b.append([5, 6])
# a is now [[1,2],[3,4],[5,6]] too — same list

import copy
shallow = a[:]                # or list(a) — top level copied, inner lists shared
deep    = copy.deepcopy(a)    # fully independent
\`\`\`

This matters when you cache a dataset row and then mutate it during augmentation — without a copy you corrupt the original.

## Quick selection guide

| Need | Use |
|---|---|
| Ordered collection you append to | \`list\` |
| Lookup by name / key | \`dict\` |
| Uniqueness or fast membership | \`set\` |
| Fixed group of related values, or a dict key | \`tuple\` |
| Count occurrences | \`Counter\` |
| Group items by key | \`defaultdict(list)\` |
`,
}

export const quiz: Record<string, QuizQuestion[]> = {

'302.2': [
  {
    question: 'You need both the index and the value while looping over a list of samples. What is the idiomatic approach?',
    options: [
      'for i in range(len(samples)): value = samples[i]',
      'for i, value in enumerate(samples):',
      'for value in samples: i = samples.index(value)',
      'while loop with a manual counter',
    ],
    correctIndex: 1,
    explanation: 'enumerate(samples) yields (index, value) pairs directly. Using range(len(...)) or .index() is slower and more error-prone; .index() is also O(n) per call and breaks with duplicates.',
  },
  {
    question: 'What does `[token for doc in corpus for token in doc]` produce?',
    options: [
      'A list of documents, each filtered to unique tokens',
      'A flattened list of every token across all documents',
      'A nested list of lists',
      'A syntax error — comprehensions cannot have two for clauses',
    ],
    correctIndex: 1,
    explanation: 'Multiple for clauses in a comprehension nest left to right, equivalent to an outer loop over corpus and an inner loop over each doc, appending every token — a flatten.',
  },
  {
    question: 'Why prefer a generator expression `sum(len(d.split()) for d in corpus)` over the list version `sum([len(d.split()) for d in corpus])`?',
    options: [
      'The generator version gives a more precise sum',
      'The generator yields values lazily so the full list of lengths is never materialised in memory',
      'Only generator expressions can be passed to sum()',
      'The list version raises an error on large inputs',
    ],
    correctIndex: 1,
    explanation: 'A generator expression produces items one at a time. For aggregations like sum/max/any over a large corpus, this avoids building an intermediate list of millions of numbers.',
  },
  {
    question: 'What is the value of the `else` clause on a `for` loop?',
    options: [
      'It always runs after the loop finishes',
      'It runs only if the loop completed without hitting a `break`',
      'It runs only if the iterable was empty',
      'It runs once per iteration',
    ],
    correctIndex: 1,
    explanation: 'A for/else (and while/else) runs the else block only when the loop exits normally. It is useful for "searched the whole list and did not find it" logic.',
  },
  {
    question: 'When should you use a plain for loop instead of a comprehension?',
    options: [
      'Whenever the loop body has side effects such as printing or writing to a file, or the logic needs multiple steps',
      'Never — comprehensions are always better',
      'Only when the input is a dict',
      'Only when performance does not matter',
    ],
    correctIndex: 0,
    explanation: 'Comprehensions are for building a collection from a transform/filter. Side effects, multi-step logic, or anything that hurts readability belong in an explicit loop.',
  },
],

'302.4': [
  {
    question: 'You repeatedly check `if item_id in seen` inside a loop, where `seen` grows to millions of entries. What single change makes this dramatically faster?',
    options: [
      'Sort `seen` before each check',
      'Make `seen` a set instead of a list, so membership testing is O(1) instead of O(n)',
      'Convert `seen` to a tuple',
      'Use a for loop to search `seen` manually',
    ],
    correctIndex: 1,
    explanation: 'List membership scans every element (O(n)); a set (or dict) uses hashing for average O(1) lookup. Swapping the container turns an O(n²) routine into O(n).',
  },
  {
    question: 'Why can a tuple be used as a dictionary key while a list cannot?',
    options: [
      'Tuples are smaller in memory',
      'Tuples are immutable and therefore hashable; lists are mutable and unhashable, so they cannot be dict keys or set members',
      'Lists can be keys, tuples cannot',
      'It is an arbitrary restriction',
    ],
    correctIndex: 1,
    explanation: 'Dict keys and set elements must be hashable, which requires immutability so the hash never changes. Tuples of hashable items qualify; lists do not. This is why composite keys like (user_id, doc_id) are tuples.',
  },
  {
    question: 'After `b = a` where `a = [[1, 2], [3, 4]]`, you run `b.append([5, 6])`. What is `a`?',
    options: [
      '[[1, 2], [3, 4]] — unchanged, because b is a copy',
      '[[1, 2], [3, 4], [5, 6]] — a and b are the same list object',
      'A TypeError is raised',
      '[[1, 2, 5], [3, 4, 6]]',
    ],
    correctIndex: 1,
    explanation: 'Assignment binds another name to the same object; it does not copy. Mutating through either name is visible through the other. Use a[:], list(a), or copy.deepcopy(a) for an independent copy.',
  },
  {
    question: 'Which tool is the right choice for counting how many times each label appears in a dataset?',
    options: [
      'A list and repeated .count() calls',
      'collections.Counter(labels), then .most_common()',
      'A set',
      'sorted(labels)',
    ],
    correctIndex: 1,
    explanation: 'Counter is a dict subclass built for tallying: Counter(iterable) produces {value: count} in one pass, and .most_common(k) returns the top k. Repeated list.count() is O(n) per call.',
  },
  {
    question: 'What does `{**base_config, **overrides}` produce when both dicts contain the key "lr"?',
    options: [
      'A TypeError for the duplicate key',
      'A new dict with all keys from both; for "lr" the value from `overrides` wins because it is spread last',
      'A new dict containing only the keys unique to each',
      'base_config is mutated in place',
    ],
    correctIndex: 1,
    explanation: 'Dict unpacking merges left to right, so later mappings overwrite earlier ones on conflicting keys. It creates a new dict and leaves both inputs unchanged — a clean way to apply overrides over defaults.',
  },
],
}

export const codingTask: Record<string, {
  instructions: string; boilerplate: string; rubric: string[]; hints: string[]
}> = {

'302.1': {
  instructions: `Build a small prompt/metrics formatting toolkit in \`textkit.py\` — the kind of string utilities every LLM project ends up writing.

Implement four functions:

1. \`normalize(text: str) -> str\` — collapse all runs of whitespace (spaces, tabs, newlines) to a single space, strip leading/trailing whitespace, and lowercase. \`normalize("  Hello\\t\\n World ")\` → \`"hello world"\`.

2. \`format_metrics(metrics: dict[str, float]) -> str\` — turn \`{"loss": 0.04213, "acc": 0.9374}\` into \`"acc=93.74% | loss=0.0421"\`. Rules: keys sorted alphabetically, joined by \`" | "\`. A value whose key contains \`"acc"\`, \`"precision"\`, \`"recall"\`, or \`"f1"\` is formatted as a percentage with 2 decimals (\`93.74%\`); every other value is formatted with 4 decimal places.

3. \`build_prompt(system: str, labels: list[str], text: str) -> str\` — return exactly:
   \`\`\`
   <system>

   Categories: <comma-space-joined labels>

   Text: <text>
   Category:
   \`\`\`
   (one blank line after the system line and after the Categories line; no trailing newline).

4. \`truncate_words(text: str, max_words: int) -> str\` — keep the first \`max_words\` whitespace-separated words. If truncation happened, append \`" …"\` (space + horizontal ellipsis). If \`max_words <= 0\`, return \`""\`.

Acceptance criteria:
- \`normalize\` handles tabs and newlines, not just spaces
- \`format_metrics\` percentage detection is a substring check on the lowercased key
- \`build_prompt\` output matches the spec byte-for-byte (check the blank lines)
- \`truncate_words\` only adds the ellipsis when it actually dropped words`,
  boilerplate: `"""String utilities for LLM prompting and metric display."""
import re

_PERCENT_KEYS = ("acc", "precision", "recall", "f1")


def normalize(text: str) -> str:
    # TODO: re.sub on \\s+, then strip and lower
    raise NotImplementedError


def format_metrics(metrics: dict[str, float]) -> str:
    # TODO: sort keys; choose % vs .4f per key; join with " | "
    raise NotImplementedError


def build_prompt(system: str, labels: list[str], text: str) -> str:
    # TODO: assemble with the exact blank lines
    raise NotImplementedError


def truncate_words(text: str, max_words: int) -> str:
    # TODO: split, slice, re-join, conditionally add " …"
    raise NotImplementedError
`,
  rubric: [
    'normalize uses re.sub(r"\\s+", " ", ...) so tabs and newlines collapse too',
    'normalize strips then lowercases',
    'format_metrics sorts keys alphabetically and joins with " | "',
    'format_metrics formats acc/precision/recall/f1 keys as NN.NN% and others as .4f',
    'format_metrics percentage check is a substring test on the lowercased key',
    'build_prompt produces the exact blank-line layout and no trailing newline',
    'build_prompt joins labels with ", "',
    'truncate_words returns "" for max_words <= 0',
    'truncate_words appends " …" only when words were actually removed',
  ],
  hints: [
    're.sub(r"\\s+", " ", text).strip().lower() is the whole of normalize.',
    'For the percent value: f"{v:.2%}" already multiplies by 100 and adds the % sign.',
    'Build build_prompt with an f-string triple-quoted literal, or "\\n".join of the parts.',
    'words = text.split(); kept = words[:max_words]; suffix = " …" if len(words) > len(kept) else "".',
    'any(k in key.lower() for k in _PERCENT_KEYS) selects the percentage format.',
  ],
},

'302.3': {
  instructions: `Implement \`pipeline.py\`, a minimal function-composition toolkit — the pattern behind scikit-learn Pipelines and LangChain chains.

1. \`compose(*funcs)\` — return a new function that applies \`funcs\` **left to right**: \`compose(f, g, h)(x)\` computes \`h(g(f(x)))\`. \`compose()\` with no args returns an identity function.

2. \`retry(fn, *, attempts=3, exceptions=(Exception,))\` — return a wrapped function that calls \`fn\`; if it raises one of \`exceptions\`, retry up to \`attempts\` total tries. Re-raise the last exception if all attempts fail. Pass through \`*args\`/\`**kwargs\` and the return value.

3. \`timed(fn)\` — a decorator that returns a wrapper which runs \`fn\`, and stores the elapsed seconds on \`wrapper.last_duration\` (a float). It must preserve \`fn.__name__\` and \`fn.__doc__\` (use \`functools.wraps\`).

4. \`with_defaults(fn, **defaults)\` — return a wrapper that fills in any missing keyword arguments from \`defaults\` before calling \`fn\` (an explicitly passed kwarg always wins).

Acceptance criteria:
- \`compose\` order is left-to-right and works for 0, 1, or many functions
- \`retry\` stops early on success and re-raises the final error after exhausting attempts
- \`retry\` only catches the exception types it was told to
- \`timed\` preserves metadata via functools.wraps and exposes \`last_duration\`
- \`with_defaults\` lets caller-supplied kwargs override the defaults`,
  boilerplate: `"""Function composition and wrapping utilities."""
import functools
import time


def compose(*funcs):
    # TODO: return a function applying funcs left to right
    raise NotImplementedError


def retry(fn, *, attempts=3, exceptions=(Exception,)):
    # TODO: loop up to attempts times, catch the listed exceptions, re-raise the last one
    raise NotImplementedError


def timed(fn):
    # TODO: functools.wraps; measure time.perf_counter(); set wrapper.last_duration
    raise NotImplementedError


def with_defaults(fn, **defaults):
    # TODO: merge defaults under the call's kwargs
    raise NotImplementedError
`,
  rubric: [
    'compose applies functions left to right (compose(f,g)(x) == g(f(x)))',
    'compose() with no arguments returns an identity function',
    'retry returns fn result immediately on first success',
    'retry attempts exactly `attempts` times before re-raising',
    'retry re-raises the last exception and does not swallow non-listed exception types',
    'timed uses functools.wraps to preserve __name__ and __doc__',
    'timed sets wrapper.last_duration to a float after each call',
    'with_defaults merges so explicit kwargs override defaults ({**defaults, **kwargs})',
  ],
  hints: [
    'compose: def composed(x): for f in funcs: x = f(x); return x.',
    'retry: for i in range(attempts): try/return; except exceptions as e: last = e; then raise last.',
    'timed: t0 = time.perf_counter() before, wrapper.last_duration = time.perf_counter() - t0 after.',
    'with_defaults: call fn(*args, **{**defaults, **kwargs}) so kwargs win.',
    'Remember @functools.wraps(fn) goes on the inner wrapper definition.',
  ],
},
}
