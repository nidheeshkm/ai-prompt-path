// Part II — Intermediate Python & Numerical Computing
// Chapter 303: Intermediate Python for AI

import type { QuizQuestion } from '../../src/data/curriculum'

export const courseId = 'python-for-ai'

export const content: Record<string, string> = {

'303.1': `# Classes, Dataclasses & OOP

You do not need heavy object-oriented design for AI work, but you must be able to *read* it — PyTorch models subclass \`nn.Module\`, datasets subclass \`Dataset\`, and config objects are frequently classes.

## A plain class

\`\`\`python
class RunningAverage:
    def __init__(self, name: str):
        self.name = name
        self.total = 0.0
        self.count = 0

    def update(self, value: float, n: int = 1) -> None:
        self.total += value * n
        self.count += n

    @property
    def average(self) -> float:
        return self.total / self.count if self.count else 0.0

    def __repr__(self) -> str:
        return f"RunningAverage({self.name}={self.average:.4f})"
\`\`\`

- \`__init__\` is the constructor; \`self\` is the instance, passed automatically.
- \`self.x = ...\` creates **instance attributes** — unique per object.
- A variable defined in the class body (outside any method) is a **class attribute**, shared by all instances — a classic bug when it is mutable (same trap as mutable default arguments).
- \`@property\` exposes a method as an attribute: \`meter.average\`, not \`meter.average()\`.
- \`__repr__\` controls how the object prints — invaluable when debugging.

Usage:

\`\`\`python
loss_meter = RunningAverage("loss")
for batch in loader:
    loss_meter.update(compute_loss(batch), n=len(batch))
print(loss_meter)     # RunningAverage(loss=0.0421)
\`\`\`

## Dunder methods

"Double-underscore" methods hook into Python syntax:

| Method | Enables |
|---|---|
| \`__init__\` | construction |
| \`__repr__\` / \`__str__\` | \`repr(x)\` / \`str(x)\`, printing |
| \`__len__\` | \`len(x)\` |
| \`__getitem__\` | \`x[i]\` — how a Dataset serves samples |
| \`__iter__\` / \`__next__\` | \`for item in x\` |
| \`__call__\` | \`x(...)\` — makes an instance callable, like a model |
| \`__eq__\` / \`__hash__\` | \`==\` and use as a dict key |

A PyTorch-style dataset is just \`__len__\` + \`__getitem__\`:

\`\`\`python
class TextDataset:
    def __init__(self, rows): self.rows = rows
    def __len__(self): return len(self.rows)
    def __getitem__(self, i):
        row = self.rows[i]
        return row["text"], row["label"]
\`\`\`

## Dataclasses — structure without boilerplate

\`@dataclass\` auto-generates \`__init__\`, \`__repr__\`, and \`__eq__\` from typed fields. Perfect for configs and records.

\`\`\`python
from dataclasses import dataclass, field

@dataclass
class TrainConfig:
    lr: float = 1e-3
    batch_size: int = 32
    epochs: int = 10
    layers: list[int] = field(default_factory=lambda: [128, 64])
    frozen: bool = False

cfg = TrainConfig(lr=5e-4, epochs=20)
print(cfg)   # TrainConfig(lr=0.0005, batch_size=32, epochs=20, layers=[128, 64], frozen=False)
\`\`\`

Note \`field(default_factory=...)\` for mutable defaults — the dataclass enforces the "no mutable default" rule and errors if you write \`layers: list = []\`. Add \`@dataclass(frozen=True)\` to make instances immutable and hashable.

## Inheritance

\`\`\`python
import torch.nn as nn

class MLP(nn.Module):
    def __init__(self, in_dim, hidden, out_dim):
        super().__init__()                    # ALWAYS call this first
        self.net = nn.Sequential(
            nn.Linear(in_dim, hidden), nn.ReLU(),
            nn.Linear(hidden, out_dim),
        )

    def forward(self, x):
        return self.net(x)
\`\`\`

\`super().__init__()\` runs the parent's constructor — omitting it in an \`nn.Module\` subclass is a frequent beginner error that breaks parameter tracking. You override \`forward\`; you never call it directly (you call \`model(x)\`, which invokes \`__call__\` → \`forward\` plus hooks).

## When to use what

| Situation | Choice |
|---|---|
| Bundle of config values | \`@dataclass\` |
| Stateful helper (meters, buffers, tokenizers) | plain class |
| Extending a framework base (Module, Dataset) | inheritance |
| Just grouping data, no methods, no mutation | \`@dataclass(frozen=True)\` or \`NamedTuple\` |
| One function is enough | don't make a class |
`,

'303.2': `# Iterators, Generators & Lazy Evaluation

Datasets in AI are often larger than RAM: millions of documents, streams of log lines, files that don't fit in memory. **Lazy evaluation** — producing values one at a time, on demand — is how you process them.

## Iterables vs iterators

- An **iterable** can be looped over: lists, strings, dicts, files, ranges. It has \`__iter__\`.
- An **iterator** is the object doing the walking: it has \`__next__\` and remembers its position. \`iter(x)\` gets one; \`next(it)\` pulls the next value; \`StopIteration\` signals the end.

\`\`\`python
it = iter([10, 20, 30])
next(it)   # 10
next(it)   # 20
\`\`\`

A \`for\` loop does this for you. Key consequence: an iterator is **single-use**. Once exhausted it yields nothing more — a source of silent bugs when you loop over the same generator twice.

## Generators — iterators the easy way

A function with \`yield\` is a **generator function**. Calling it returns a generator object; execution is paused at each \`yield\` and resumed on the next \`next()\`.

\`\`\`python
def read_jsonl(path):
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line:
                yield json.loads(line)      # one record at a time

for record in read_jsonl("train.jsonl"):    # constant memory, even for a 50 GB file
    process(record)
\`\`\`

Contrast with the eager version \`json.loads(f.read())\` on a JSON array, which loads everything at once.

### Batching generator

A near-universal helper:

\`\`\`python
def batched(iterable, size):
    batch = []
    for item in iterable:
        batch.append(item)
        if len(batch) == size:
            yield batch
            batch = []
    if batch:
        yield batch           # final partial batch

for chunk in batched(read_jsonl("data.jsonl"), 32):
    embeddings = model.encode([r["text"] for r in chunk])
\`\`\`

Python 3.12 has \`itertools.batched\` built in, but knowing how to write it matters.

## Generator expressions

Parentheses instead of brackets:

\`\`\`python
lengths = (len(doc) for doc in corpus)        # lazy
total   = sum(len(doc) for doc in corpus)     # consumed immediately by sum
\`\`\`

Chain them — each stage is lazy, so nothing is materialised until the final consumer pulls:

\`\`\`python
lines   = (l.strip() for l in open("big.txt"))
nonblank = (l for l in lines if l)
lowered = (l.lower() for l in nonblank)
first_100 = list(itertools.islice(lowered, 100))
\`\`\`

## The itertools toolbox

| Function | Use |
|---|---|
| \`islice(it, n)\` | take the first n (or a slice) without indexing |
| \`chain(a, b)\` | concatenate iterables lazily |
| \`count(start, step)\` | infinite counter |
| \`cycle(seq)\` | repeat forever (e.g. cycling data loaders) |
| \`groupby(it, key)\` | group *consecutive* items (sort first!) |
| \`takewhile\` / \`dropwhile\` | stop / skip based on a predicate |
| \`tee(it, n)\` | split one iterator into n independent ones |

## yield from and pipelines

\`yield from sub_generator\` delegates to another generator — useful for flattening or composing stages:

\`\`\`python
def all_tokens(docs):
    for doc in docs:
        yield from doc.split()
\`\`\`

## When laziness bites

- **Double consumption**: \`data = read_jsonl(...)\`; \`len(list(data))\`; then a second loop yields nothing. Materialise with \`list()\` if you need multiple passes (and it fits in memory).
- **Exceptions surface late**: a bug inside the generator only raises when that item is pulled, which can be far from where the generator was created.
- **\`len()\` doesn't work** on a generator; you must consume it to count.
`,

'303.3': `# Exceptions, Context Managers, Files & Logging

## Exceptions

\`\`\`python
try:
    data = load_dataset(path)
except FileNotFoundError:
    logger.error("dataset missing at %s", path)
    raise                                   # re-raise after logging
except (ValueError, KeyError) as e:
    logger.warning("skipping malformed file: %s", e)
    data = []
else:
    logger.info("loaded %d rows", len(data))   # ran only if no exception
finally:
    cleanup_temp_files()                        # always runs
\`\`\`

Principles:
- **Catch narrowly.** \`except Exception:\` (or bare \`except:\`) hides bugs. Name the exceptions you expect.
- **Don't silence.** \`except: pass\` is how data corruption goes unnoticed for weeks. At minimum log it.
- **Re-raise** with a bare \`raise\` to preserve the traceback, or \`raise NewError(...) from e\` to chain.
- **Fail fast** on programmer errors (bad config, wrong shape); recover only from *expected* runtime conditions (network blips, missing optional files).

Custom exceptions make failures explicit:

\`\`\`python
class DataValidationError(Exception):
    """Raised when an input batch fails schema checks."""
\`\`\`

## Context managers and \`with\`

A context manager guarantees setup and teardown even if an exception fires. You have already used the most common one:

\`\`\`python
with open("metrics.csv", "w") as f:
    f.write("epoch,loss\\n")
# file is closed here no matter what
\`\`\`

Others you will meet:

\`\`\`python
with torch.no_grad():           # disable gradient tracking for inference
    preds = model(x)

with timer("embedding"):        # your own — see below
    vecs = embed(docs)

import tempfile
with tempfile.TemporaryDirectory() as d:
    ...                          # directory deleted on exit
\`\`\`

Write one with \`contextlib\`:

\`\`\`python
from contextlib import contextmanager
import time

@contextmanager
def timer(label):
    t0 = time.perf_counter()
    try:
        yield
    finally:
        print(f"{label}: {time.perf_counter() - t0:.2f}s")
\`\`\`

Everything before \`yield\` is setup; everything after (in \`finally\`) is teardown.

## Files and paths

Use \`pathlib\`, not string concatenation:

\`\`\`python
from pathlib import Path

root = Path("experiments") / "run_042"
root.mkdir(parents=True, exist_ok=True)
(root / "config.json").write_text(json.dumps(cfg))
for ckpt in root.glob("*.pt"):
    print(ckpt.name, ckpt.stat().st_size)
latest = max(root.glob("epoch_*.pt"), key=lambda p: p.stat().st_mtime)
\`\`\`

Reading structured data:

\`\`\`python
import json, csv

cfg = json.loads(Path("config.json").read_text())

with open("data.csv", newline="") as f:
    rows = list(csv.DictReader(f))     # list[dict], header as keys
\`\`\`

Always specify encoding for text you don't control: \`open(path, encoding="utf-8")\`.

## Logging beats print

\`print\` has no levels, no timestamps, no way to silence it in production, and writes to stdout only. Use the \`logging\` module.

\`\`\`python
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

logger.debug("batch shapes: %s", shapes)   # hidden unless level=DEBUG
logger.info("epoch %d complete, loss=%.4f", epoch, loss)
logger.warning("gradient norm %.1f exceeds threshold", norm)
logger.error("checkpoint save failed", exc_info=True)  # includes traceback
\`\`\`

- Use \`%s\` placeholders with arguments, not f-strings, so the string is only formatted if that level is enabled.
- \`getLogger(__name__)\` gives each module its own named logger you can tune independently.
- Set third-party noise down: \`logging.getLogger("httpx").setLevel(logging.WARNING)\`.
`,

'303.4': `# Modules, Packages & Project Layout

As a project grows past one file, how you organise and import code determines whether it stays maintainable.

## Modules and imports

Any \`.py\` file is a module. Importing runs it once (results cached in \`sys.modules\`) and binds names.

\`\`\`python
import numpy as np                     # module, aliased
from sklearn.metrics import f1_score   # specific name
from . import preprocessing            # relative — within your package
\`\`\`

Prefer explicit imports over \`from module import *\`, which pollutes the namespace and hides where names come from.

### The \`if __name__ == "__main__":\` guard

\`\`\`python
def main():
    ...

if __name__ == "__main__":
    main()
\`\`\`

\`__name__\` is \`"__main__"\` when the file is *run* (\`python train.py\`) and the module's name when it is *imported*. The guard lets a file be both an executable script and an importable library without running the script body on import — important because test runners and other modules will import it.

## Packages

A directory of modules becomes a package. Modern ("namespace") packages don't strictly need \`__init__.py\`, but adding one is still standard — it marks the package and can expose a clean public API:

\`\`\`
myproject/
├── pyproject.toml
├── README.md
├── .gitignore
├── src/
│   └── myproject/
│       ├── __init__.py
│       ├── data.py
│       ├── models.py
│       └── train.py
├── tests/
│   ├── test_data.py
│   └── test_models.py
├── notebooks/
│   └── exploration.ipynb
└── data/            # git-ignored
\`\`\`

The \`src/\` layout prevents accidentally importing the package from the working directory instead of the installed version — a subtle source of "works in dev, breaks when packaged" bugs.

## Making your package importable

Install it in **editable mode** so \`import myproject\` works from anywhere and code changes take effect without reinstalling:

\`\`\`bash
python -m pip install -e .
# or:  uv pip install -e .
\`\`\`

This reads \`pyproject.toml\`:

\`\`\`toml
[project]
name = "myproject"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = ["numpy>=1.26", "scikit-learn>=1.4"]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.pytest.ini_options]
testpaths = ["tests"]

[tool.ruff]
line-length = 100
\`\`\`

\`pyproject.toml\` is the single config file for the build system, dependencies, and most tools (ruff, pytest, mypy, black).

## Import errors and how to read them

| Error | Usual cause |
|---|---|
| \`ModuleNotFoundError: No module named 'myproject'\` | package not installed (\`pip install -e .\`) or wrong venv active |
| \`ImportError: cannot import name 'X'\` | \`X\` doesn't exist in that module, or a circular import |
| \`ImportError\` only when run as script | relative import in a file run directly — run it as \`python -m myproject.train\` |
| works in notebook, fails in test | notebook's cwd is on \`sys.path\`; the test's isn't — install the package |

## Circular imports

If \`models.py\` imports from \`data.py\` and \`data.py\` imports from \`models.py\`, one of them sees a half-initialised module. Fixes: move the shared thing to a third module, or defer the import inside the function that needs it.

## The mental model

\`sys.path\` is the list of directories Python searches for imports. It includes the script's directory (or cwd for \`-m\`), the standard library, and your venv's \`site-packages\`. \`pip install -e .\` adds a link to your project there. Understanding this one list explains almost every import problem.
`,

'303.5': `# Async Python: asyncio & Concurrency for API Calls

AI applications spend most of their wall-clock time *waiting* — for an LLM API to respond, for an embedding service, for a vector database. That waiting is **I/O-bound**, and \`asyncio\` lets one thread handle hundreds of in-flight requests concurrently.

## Concurrency vs parallelism

| Model | Good for | In Python |
|---|---|---|
| \`asyncio\` (single thread, cooperative) | I/O-bound: API calls, DB, network | \`async\`/\`await\` |
| threads | I/O-bound; simple; limited by the GIL for CPU | \`concurrent.futures.ThreadPoolExecutor\` |
| processes | CPU-bound: heavy NumPy, tokenisation | \`ProcessPoolExecutor\`, \`multiprocessing\` |
| vectorisation / GPU | numerical work | NumPy, PyTorch — the real answer for math |

The **GIL** (Global Interpreter Lock) means only one thread runs Python bytecode at a time, so threads don't speed up pure-Python CPU work — but they and asyncio are excellent for overlapping I/O.

## async / await basics

\`\`\`python
import asyncio

async def fetch_summary(client, doc):
    resp = await client.post("/summarize", json={"text": doc})   # yields control while waiting
    return resp.json()["summary"]

async def main(docs):
    async with httpx.AsyncClient(base_url=API) as client:
        tasks = [fetch_summary(client, d) for d in docs]
        return await asyncio.gather(*tasks)      # all run concurrently

summaries = asyncio.run(main(docs))
\`\`\`

- \`async def\` defines a **coroutine**; calling it returns a coroutine object that does nothing until awaited or scheduled.
- \`await\` suspends the current coroutine until the awaited thing completes, freeing the event loop to run others.
- \`asyncio.run(coro)\` starts the event loop (use once, at the top level).
- \`asyncio.gather(*coros)\` runs many concurrently and returns results in order.

The speedup: 100 API calls at 500 ms each take ~50 s sequentially but ~1 s concurrently (network permitting).

## Bounding concurrency

APIs have rate limits. Don't fire 10,000 requests at once — use a semaphore:

\`\`\`python
sem = asyncio.Semaphore(20)      # at most 20 in flight

async def guarded_fetch(client, doc):
    async with sem:
        return await fetch_summary(client, doc)
\`\`\`

## Handling partial failure

\`gather(..., return_exceptions=True)\` returns exceptions in place of results instead of aborting the whole batch:

\`\`\`python
results = await asyncio.gather(*tasks, return_exceptions=True)
ok  = [r for r in results if not isinstance(r, Exception)]
bad = [r for r in results if isinstance(r, Exception)]
\`\`\`

Add per-call timeouts with \`asyncio.timeout(10)\` (3.11+) or \`asyncio.wait_for\`.

## Rules that keep async code sane

1. **Never call blocking code inside a coroutine.** \`time.sleep\`, \`requests.get\`, heavy \`np\` ops, or synchronous file reads freeze the whole event loop. Use \`asyncio.sleep\`, an async HTTP client (\`httpx\`, \`aiohttp\`), and \`await asyncio.to_thread(blocking_fn, ...)\` for unavoidable blocking calls.
2. **Async is all-or-nothing up a call chain.** To \`await\` something, the caller must be \`async\` too, up to \`asyncio.run\`.
3. **Don't reach for async if you have one request.** It only pays off with many concurrent I/O operations.

## The pragmatic shortcut

If a library gives you a synchronous client and you just need N calls in parallel, a thread pool is often simpler than rewriting everything async:

\`\`\`python
from concurrent.futures import ThreadPoolExecutor

with ThreadPoolExecutor(max_workers=16) as pool:
    summaries = list(pool.map(summarize_sync, docs))
\`\`\`

Reserve full \`asyncio\` for async-native stacks (FastAPI endpoints, \`httpx.AsyncClient\`, async DB drivers) where it composes naturally.
`,
}

export const quiz: Record<string, QuizQuestion[]> = {

'303.3': [
  {
    question: 'Why is `except Exception: pass` considered dangerous in data-processing code?',
    options: [
      'It is a syntax error in modern Python',
      'It silently swallows every error, so bugs and data corruption go unnoticed — at minimum you should log the exception',
      'It is slower than catching specific exceptions',
      'It only catches exceptions raised in the current function',
    ],
    correctIndex: 1,
    explanation: 'A bare catch-and-pass hides real failures (bad rows, missing keys, network errors) with no trace. Catch the specific exceptions you can handle, and always log anything you deliberately continue past.',
  },
  {
    question: 'What guarantee does a context manager used with `with` provide?',
    options: [
      'The block runs faster',
      'The teardown/cleanup step (e.g. closing a file, restoring gradient state) runs even if the block raises an exception',
      'The block cannot raise exceptions',
      'The resource is shared across threads safely',
    ],
    correctIndex: 1,
    explanation: 'A context manager\'s __exit__ (or the code after `yield` in a @contextmanager) always runs on block exit, normal or exceptional. That is why `with open(...)` cannot leak a file handle.',
  },
  {
    question: 'Why prefer `logging` over `print` for a training script that runs for hours?',
    options: [
      'print does not work inside functions',
      'logging provides severity levels, timestamps, module names, and configurable routing/filtering, so you can control verbosity without editing code',
      'print is deprecated in Python 3.12',
      'logging is faster in every case',
    ],
    correctIndex: 1,
    explanation: 'logging lets you emit DEBUG/INFO/WARNING/ERROR, attach timestamps and logger names, send output to files or services, and dial third-party noise down — none of which print offers.',
  },
  {
    question: 'Why is `logger.info("loaded %d rows", n)` preferred over `logger.info(f"loaded {n} rows")`?',
    options: [
      'f-strings are not allowed in logging calls',
      'With %-style args, the message string is only formatted if that log level is actually enabled, saving work for suppressed messages',
      'The %d version is more readable',
      'They behave identically in all respects',
    ],
    correctIndex: 1,
    explanation: 'Passing the format string and arguments separately lets logging skip the string interpolation entirely when the level is filtered out. An f-string is always built, even if the record is discarded.',
  },
  {
    question: 'Which is the modern, cross-platform way to build a file path like experiments/run_042/config.json?',
    options: [
      '"experiments" + "/" + "run_042" + "/" + "config.json"',
      'Path("experiments") / "run_042" / "config.json" using pathlib',
      'os.system("mkdir experiments/run_042")',
      'string .format() with hard-coded backslashes',
    ],
    correctIndex: 1,
    explanation: 'pathlib.Path overloads / to join path segments correctly on any OS and provides .mkdir, .glob, .read_text, .stat, etc. Manual string concatenation breaks on Windows and is error-prone.',
  },
],

'303.4': [
  {
    question: 'What does the `if __name__ == "__main__":` guard accomplish?',
    options: [
      'It makes the file run faster by skipping imports',
      'It ensures the block runs only when the file is executed directly, not when it is imported by another module',
      'It is required for any file that defines a function',
      'It prevents the file from being imported at all',
    ],
    correctIndex: 1,
    explanation: '__name__ equals "__main__" only when the file is run directly. The guard lets a module act as both an importable library and a runnable script without executing the script body on import.',
  },
  {
    question: 'Why is the `src/` layout (package under `src/myproject/`) recommended over putting the package at the repo root?',
    options: [
      'It is required by pip',
      'It prevents Python from importing the package from the working directory instead of the properly installed version, catching packaging bugs early',
      'It makes imports shorter',
      'It allows the package to be private',
    ],
    correctIndex: 1,
    explanation: 'With a flat layout, the cwd is on sys.path and shadows the installed package, so "it works in dev" can hide a broken install. The src/ layout forces you to install the package to import it, matching how users will run it.',
  },
  {
    question: 'You run `python myproject/train.py` and get an ImportError on a relative import that works fine in tests. What is the fix?',
    options: [
      'Delete the relative import and hard-code paths',
      'Run it as a module: `python -m myproject.train`, or restructure so the entry point is outside the package',
      'Add `sys.path.append(".")` at the top of every file',
      'Rename train.py to __main__.py',
    ],
    correctIndex: 1,
    explanation: 'Relative imports require the file to be run as part of a package. Running the file directly makes its package context "__main__" with no parent, so `python -m myproject.train` (or a top-level entry script) is the correct way.',
  },
  {
    question: 'What is `sys.path`?',
    options: [
      'The path to the Python executable',
      'The ordered list of directories Python searches when resolving an import',
      'The current working directory only',
      'A cache of previously imported modules',
    ],
    correctIndex: 1,
    explanation: 'sys.path lists the directories searched for modules/packages: the script dir (or cwd for -m), the standard library, and the active environment\'s site-packages. `pip install -e .` registers your project there.',
  },
  {
    question: 'Which is the modern single file for declaring a project\'s dependencies, build system, and tool configuration (ruff, pytest, mypy)?',
    options: ['setup.cfg', 'requirements.txt', 'pyproject.toml', 'Pipfile'],
    correctIndex: 2,
    explanation: 'pyproject.toml is the standardised project metadata file. It holds [project] dependencies, [build-system], and [tool.*] sections that most modern Python tools read.',
  },
],
}

export const codingTask: Record<string, {
  instructions: string; boilerplate: string; rubric: string[]; hints: string[]
}> = {

'303.1': {
  instructions: `Implement two classes in \`meters.py\` for tracking training metrics — the kind of utility inside every training loop.

1. \`@dataclass\` **\`RunConfig\`** with fields and defaults:
   - \`lr: float = 1e-3\`
   - \`batch_size: int = 32\`
   - \`epochs: int = 10\`
   - \`metrics: list[str]\` defaulting to \`["loss", "accuracy"]\` (use \`field(default_factory=...)\`)
   Add a method \`steps_per_epoch(self, dataset_size: int) -> int\` returning \`ceil(dataset_size / batch_size)\`.

2. Plain class **\`MetricTracker\`**:
   - \`__init__(self, *names: str)\` — one running average per metric name.
   - \`update(self, n: int = 1, **values: float) -> None\` — add each \`name=value\` weighted by \`n\`. Raise \`KeyError\` if a name was not registered in \`__init__\`.
   - \`average(self, name: str) -> float\` — weighted mean so far (0.0 if nothing recorded).
   - \`summary(self) -> dict[str, float]\` — \`{name: average}\` for all metrics.
   - \`reset(self) -> None\` — zero all counters.
   - \`__getitem__(self, name)\` — alias for \`average(name)\`.
   - \`__repr__\` — \`MetricTracker(loss=0.0421, accuracy=0.9370)\` using the current averages, names in registration order, 4 decimals.

Acceptance criteria:
- \`RunConfig()\` works with all defaults and \`metrics\` is a fresh list per instance
- \`steps_per_epoch(100)\` with batch_size 32 returns 4
- \`update\` rejects unknown metric names with KeyError
- weighted averaging: \`update(n=10, loss=1.0)\` then \`update(n=30, loss=2.0)\` → \`average("loss") == 1.75\`
- \`__getitem__\` and \`__repr__\` behave as specified`,
  boilerplate: `"""Config and metric-tracking classes for training loops."""
from dataclasses import dataclass, field
from math import ceil


@dataclass
class RunConfig:
    # TODO: fields with defaults; metrics via field(default_factory=...)

    def steps_per_epoch(self, dataset_size: int) -> int:
        # TODO: ceil division
        raise NotImplementedError


class MetricTracker:
    def __init__(self, *names: str):
        # TODO: store total and count per name
        raise NotImplementedError

    def update(self, n: int = 1, **values: float) -> None:
        raise NotImplementedError

    def average(self, name: str) -> float:
        raise NotImplementedError

    def summary(self) -> dict[str, float]:
        raise NotImplementedError

    def reset(self) -> None:
        raise NotImplementedError

    def __getitem__(self, name: str) -> float:
        raise NotImplementedError

    def __repr__(self) -> str:
        raise NotImplementedError
`,
  rubric: [
    'RunConfig is a @dataclass with lr, batch_size, epochs, metrics and correct defaults',
    'RunConfig.metrics uses field(default_factory=...) so each instance gets its own list',
    'steps_per_epoch uses ceil division (100, bs=32 -> 4)',
    'MetricTracker.__init__ registers one running average per name via *names',
    'update weights each value by n and accumulates total and count',
    'update raises KeyError for a name not registered in __init__',
    'average returns weighted mean, 0.0 when count is zero',
    'summary returns {name: average} for every registered metric',
    'reset zeroes all totals and counts',
    '__getitem__ delegates to average and __repr__ matches the specified format',
  ],
  hints: [
    'For metrics default: metrics: list[str] = field(default_factory=lambda: ["loss", "accuracy"]).',
    'ceil(dataset_size / self.batch_size) — or -(-dataset_size // self.batch_size).',
    'Store self._total = {name: 0.0 ...} and self._count = {name: 0 ...} keyed by the *names tuple.',
    'update: for name, value in values.items(): if name not in self._total: raise KeyError(name).',
    'weighted mean = total / count; guard count == 0.',
    '__repr__: ", ".join(f"{n}={self.average(n):.4f}" for n in self._names).',
  ],
},

'303.2': {
  instructions: `Implement lazy data-pipeline helpers in \`streams.py\`. Everything must be lazy — no function may build a full list of the input unless the spec says so.

1. \`take(iterable, n)\` — yield at most the first \`n\` items. \`n <= 0\` yields nothing.

2. \`batched(iterable, size)\` — yield lists of length \`size\`; the final batch may be shorter. Raise \`ValueError\` if \`size < 1\`.

3. \`map_filter(iterable, *, transform=None, keep=None)\` — yield \`transform(x)\` for each \`x\` where \`keep(x)\` is truthy. \`keep\` is tested on the **original** item, before \`transform\`. \`None\` for either means "identity / keep all".

4. \`window(iterable, size)\` — yield overlapping tuples of consecutive items of length \`size\` (a sliding window). For \`[1,2,3,4]\`, \`size=2\` → \`(1,2), (2,3), (3,4)\`. If fewer than \`size\` items exist, yield nothing. Use O(size) memory (a \`collections.deque(maxlen=size)\`).

5. \`count_by(iterable, key)\` — this one is **eager**: consume the iterable and return a \`dict\` mapping \`key(item)\` → count.

Acceptance criteria:
- \`take\`, \`batched\`, \`map_filter\`, \`window\` are generators (calling them does not consume the input)
- passing an infinite iterator (e.g. \`itertools.count()\`) to \`take(it, 5)\` still terminates
- \`window\` uses a bounded deque, not a growing list
- \`batched\` validates \`size\`
- \`count_by\` returns plain dict counts`,
  boilerplate: `"""Lazy iterator pipeline helpers."""
from collections import deque


def take(iterable, n):
    # TODO: stop after n yields
    raise NotImplementedError


def batched(iterable, size):
    if size < 1:
        raise ValueError("size must be >= 1")
    # TODO: accumulate into a list, yield when full, yield remainder
    raise NotImplementedError


def map_filter(iterable, *, transform=None, keep=None):
    # TODO: test keep on the original item, then yield transform(item)
    raise NotImplementedError


def window(iterable, size):
    # TODO: deque(maxlen=size); yield tuple(dq) once it is full
    raise NotImplementedError


def count_by(iterable, key):
    # TODO: eager dict of counts
    raise NotImplementedError
`,
  rubric: [
    'take yields at most n items and terminates on infinite iterators',
    'take yields nothing for n <= 0',
    'batched yields lists of the given size with a possibly shorter final batch',
    'batched raises ValueError when size < 1',
    'map_filter applies keep to the original item before transform',
    'map_filter treats None transform/keep as identity/keep-all',
    'window yields overlapping tuples of length size using a deque(maxlen=size)',
    'window yields nothing when the input has fewer than size items',
    'count_by consumes the iterable and returns a dict of key(item) -> count',
    'take/batched/map_filter/window are generators (no eager materialisation of input)',
  ],
  hints: [
    'take: for i, x in enumerate(iterable): if i >= n: return; yield x.',
    'batched: build a list, when len == size yield it and reset; after the loop yield it if non-empty.',
    'map_filter: t = transform or (lambda x: x); k = keep or (lambda x: True).',
    'window: dq = deque(maxlen=size); for x in iterable: dq.append(x); if len(dq) == size: yield tuple(dq).',
    'count_by: counts = {}; for x in iterable: counts[key(x)] = counts.get(key(x), 0) + 1.',
  ],
},

'303.5': {
  instructions: `Implement \`concurrency.py\` — helpers for running many I/O-bound async calls safely against a rate-limited API.

1. \`async def gather_limited(coros, limit)\` — run the given coroutines with at most \`limit\` running concurrently, returning results **in the original order**. Raise \`ValueError\` if \`limit < 1\`.

2. \`async def gather_settled(coros, limit)\` — like \`gather_limited\`, but never raises: return a list of dicts \`{"ok": True, "value": result}\` or \`{"ok": False, "error": repr(exc)}\`, in order.

3. \`async def retry_async(factory, *, attempts=3, base_delay=0.1, exceptions=(Exception,))\` — \`factory\` is a zero-arg function returning a fresh coroutine. Await it; on a listed exception, wait \`base_delay * 2**(try_index)\` seconds (exponential backoff) and retry, up to \`attempts\` total. Re-raise the last exception if all fail.

4. \`async def map_async(fn, items, *, limit=10)\` — \`fn\` is an async function of one argument; apply it to every item with concurrency \`limit\`, results in order. Implement it in terms of \`gather_limited\`.

Acceptance criteria:
- concurrency is actually bounded by \`limit\` (use \`asyncio.Semaphore\`)
- results preserve input order even though tasks finish out of order
- \`gather_settled\` captures exceptions instead of propagating
- \`retry_async\` builds a **new** coroutine each attempt via \`factory\` (a coroutine can only be awaited once)
- \`retry_async\` backoff delay doubles each attempt`,
  boilerplate: `"""Async concurrency helpers for rate-limited I/O."""
import asyncio


async def gather_limited(coros, limit):
    if limit < 1:
        raise ValueError("limit must be >= 1")
    sem = asyncio.Semaphore(limit)

    async def run(coro):
        async with sem:
            return await coro

    # TODO: wrap each coro with run() and asyncio.gather in order
    raise NotImplementedError


async def gather_settled(coros, limit):
    # TODO: reuse gather_limited on wrapper coroutines that catch exceptions
    raise NotImplementedError


async def retry_async(factory, *, attempts=3, base_delay=0.1, exceptions=(Exception,)):
    # TODO: loop; await factory(); on listed exception sleep base_delay * 2**i then retry
    raise NotImplementedError


async def map_async(fn, items, *, limit=10):
    # TODO: build coros = [fn(x) for x in items]; return await gather_limited(coros, limit)
    raise NotImplementedError
`,
  rubric: [
    'gather_limited uses asyncio.Semaphore(limit) to cap concurrency',
    'gather_limited raises ValueError for limit < 1',
    'gather_limited returns results in the original coroutine order',
    'gather_settled returns {"ok": True, "value": ...} / {"ok": False, "error": ...} dicts and never raises',
    'retry_async calls factory() to get a fresh coroutine on every attempt',
    'retry_async sleeps base_delay * 2**attempt_index between tries (exponential backoff)',
    'retry_async re-raises the final exception after `attempts` failures',
    'retry_async only catches the exception types passed in `exceptions`',
    'map_async is implemented via gather_limited and preserves order',
  ],
  hints: [
    'gather_limited: return await asyncio.gather(*(run(c) for c in coros)) — gather preserves order.',
    'gather_settled: define an async wrapper: try: return {"ok": True, "value": await c} except Exception as e: return {"ok": False, "error": repr(e)}.',
    'retry_async: for i in range(attempts): try: return await factory() except exceptions as e: last = e; await asyncio.sleep(base_delay * 2 ** i). After loop: raise last.',
    'A coroutine object is single-use — that is why retry takes a factory, not a coroutine.',
    'map_async: coros = [fn(x) for x in items]; return await gather_limited(coros, limit).',
  ],
},
}
