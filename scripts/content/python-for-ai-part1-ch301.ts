// Part I — Python & Environment Setup
// Chapter 301: Python Setup & Your AI Development Environment

import type { QuizQuestion } from '../../src/data/curriculum'

export const courseId = 'python-for-ai'

export const content: Record<string, string> = {

'301.1': `# Installing Python & Managing Versions

Every AI library you will ever use — NumPy, pandas, PyTorch, Hugging Face Transformers, LangChain — is distributed as a Python package. Before you can install a single one of them, you need a Python interpreter you control. This topic is about getting that interpreter installed *the right way* so you never fight your operating system later.

## Why not the system Python?

macOS and most Linux distributions ship with a Python already installed. **Do not use it for development.** The OS depends on that interpreter for its own scripts, its version is often old, and installing packages into it usually requires \`sudo\` — a sign you are about to break something. On Windows there is no system Python at all, so the question does not arise.

The rule: install a *separate* Python that belongs to you, and leave the system one untouched.

## The three good options

| Method | Best for | Notes |
|---|---|---|
| **python.org installer** | Beginners, single version | Official builds for Windows and macOS. Simple. |
| **pyenv** | Anyone who needs multiple versions | Installs and switches between many Python versions per-project. |
| **uv** | Modern all-in-one | Rust-based tool that installs Python *and* manages environments and packages, very fast. |

For a first setup, the python.org installer is perfectly fine. As soon as you have two projects that need different Python versions, adopt \`pyenv\` or \`uv\`.

### Installing with the official installer

Download the latest **3.12.x** release from python.org, run it, and — on Windows — **check "Add python.exe to PATH"** during installation. That single checkbox causes 90% of "python is not recognised" problems when skipped.

Verify:

\`\`\`bash
python3 --version
# Python 3.12.4
pip3 --version
# pip 24.0 from /usr/local/lib/python3.12/site-packages/pip (python 3.12)
\`\`\`

### Installing with pyenv

\`\`\`bash
# macOS
brew install pyenv

# then in ~/.zshrc
export PYENV_ROOT="$HOME/.pyenv"
export PATH="$PYENV_ROOT/bin:$PATH"
eval "$(pyenv init -)"
\`\`\`

\`\`\`bash
pyenv install 3.12.4        # download & compile that version
pyenv global 3.12.4         # default for your user
pyenv local 3.11.9          # pins THIS folder to 3.11.9 via a .python-version file
\`\`\`

## Which version should you pick for AI work?

Stay **one minor version behind the newest**. When 3.13 is the latest, use 3.12. AI libraries with compiled C/CUDA extensions (PyTorch, tokenizers, scipy) often take months to publish wheels for a brand-new Python release, and installing them from source on a fresh version is painful. As of this course, **Python 3.11 or 3.12** is the sweet spot — universally supported by the ML ecosystem.

## Interpreter, pip, and PATH — the mental model

- The **interpreter** (\`python\`) runs your code.
- **pip** is a package *installer* that ships with Python; it downloads packages from PyPI (the Python Package Index) and copies them into that interpreter's \`site-packages\` folder.
- **PATH** is an OS environment variable listing folders the shell searches for commands. If \`python\` "isn't found," PATH is almost always the cause.

When you type \`python\`, the shell walks PATH left to right and runs the first \`python\` it finds. \`which python\` (macOS/Linux) or \`where python\` (Windows) tells you exactly which one wins — run it whenever something feels wrong.

## Common failure modes

| Symptom | Cause | Fix |
|---|---|---|
| \`python: command not found\` | Not on PATH | Reinstall with "Add to PATH", or use \`python3\` |
| \`pip install\` needs sudo | Installing into system Python | Use a virtual environment (next topic) |
| Two projects need different versions | Single global Python | Use \`pyenv local\` or \`uv\` |
| \`pip\` installs but \`import\` fails | \`pip\` and \`python\` point to different interpreters | Always call \`python -m pip install\` |

That last tip is worth internalising now: **\`python -m pip install X\`** guarantees the package lands in the same interpreter you are running, because you launched pip *through* that interpreter.
`,

'301.2': `# Virtual Environments & Dependency Management

A virtual environment is an isolated folder containing its own copy of Python and its own \`site-packages\`. Activate it, and \`pip install\` puts packages *there* instead of into your global Python. Every serious Python project — and every AI project without exception — gets its own environment.

## Why isolation is non-negotiable for AI

AI projects have deep, version-sensitive dependency trees. Project A might need \`numpy==1.26\` because an old model checkpoint expects it; Project B needs \`numpy>=2.0\` for a new library. Install both globally and one project breaks. With virtual environments, each project has exactly the versions it declares and nothing else.

Isolation also makes your work **reproducible**: a teammate (or a deployment server, or you in six months) recreates the exact environment from a lock file.

## venv — the built-in tool

\`venv\` ships with Python. Nothing to install.

\`\`\`bash
# create — makes a ./.venv folder
python -m venv .venv

# activate
source .venv/bin/activate        # macOS / Linux
.venv\\Scripts\\activate           # Windows PowerShell

# your prompt now shows (.venv); check it:
which python
# /path/to/project/.venv/bin/python

# install into the environment
python -m pip install numpy pandas

# leave
deactivate
\`\`\`

Add \`.venv/\` to your \`.gitignore\` — never commit it. It is large, platform-specific, and fully regenerable.

## Recording dependencies: requirements.txt

The classic approach:

\`\`\`bash
python -m pip install numpy pandas scikit-learn
python -m pip freeze > requirements.txt
\`\`\`

\`requirements.txt\` now lists every installed package with an exact \`==\` version. Recreate the environment anywhere:

\`\`\`bash
python -m venv .venv && source .venv/bin/activate
python -m pip install -r requirements.txt
\`\`\`

The weakness: \`pip freeze\` dumps *everything*, including transitive dependencies, so you cannot tell which packages you actually asked for. A common convention is to keep a hand-written \`requirements.in\` with just your direct dependencies and compile it to a locked \`requirements.txt\`.

## pyproject.toml — the modern standard

Newer projects declare dependencies in \`pyproject.toml\`:

\`\`\`toml
[project]
name = "my-ai-project"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "numpy>=1.26",
    "pandas>=2.2",
    "scikit-learn>=1.4",
]
\`\`\`

This separates *what you want* (\`pyproject.toml\`) from *exactly what got installed* (a lock file).

## uv — fast, all-in-one

\`uv\` is a modern replacement for \`venv\` + \`pip\` + \`pip-tools\`, written in Rust. It is 10–100x faster and manages the environment, the Python version, and a lock file together.

\`\`\`bash
uv init my-ai-project && cd my-ai-project
uv add numpy pandas scikit-learn      # installs + updates pyproject.toml + uv.lock
uv run python train.py                 # runs inside the managed env automatically
uv sync                                # recreate env exactly from uv.lock
\`\`\`

\`uv.lock\` captures the full resolved tree with hashes — fully reproducible. For new projects in this course, \`uv\` is the recommended path; \`venv\` + \`requirements.txt\` remains everywhere and you must be able to read it.

## conda — the scientific-computing option

\`conda\` (via Miniconda) manages environments *and* non-Python system libraries (CUDA toolkits, MKL, compilers). It was historically dominant in data science because it solved "how do I get a working NumPy with fast BLAS on Windows." Today \`pip\` wheels have caught up for most cases, but you will still meet \`conda\` in research and GPU setups.

\`\`\`bash
conda create -n ai python=3.12
conda activate ai
conda install numpy pandas
\`\`\`

Rule of thumb: pick **one** manager per project. Do not mix \`conda install\` and \`pip install\` casually — let \`pip\` handle Python packages and \`conda\` handle the base environment only.

## Decision guide

| Situation | Use |
|---|---|
| Learning, simple project | \`venv\` + \`pip\` + \`requirements.txt\` |
| New project, want speed & lock files | \`uv\` |
| GPU / CUDA / system libs on Windows | \`conda\` for the base, \`pip\` inside it |
| Contributing to an existing repo | Whatever its README says — match the project |
`,

'301.3': `# IDEs & Notebooks: VS Code, Jupyter, and Colab

You will spend thousands of hours in your editor. Choosing and configuring it well pays back enormously. For AI work there are two complementary environments: an **IDE** for building software, and **notebooks** for exploring data and models interactively.

## VS Code — the default IDE for AI/ML

Visual Studio Code is free, fast, and has the best Python and Jupyter integration of any editor. Install it, then add these extensions:

| Extension | Purpose |
|---|---|
| **Python** (Microsoft) | IntelliSense, debugging, environment selection |
| **Pylance** | Fast type-checking language server (bundled with Python) |
| **Jupyter** | Run \`.ipynb\` notebooks *inside* VS Code |
| **Ruff** | Instant linting and formatting |

### Selecting your interpreter

This is the single most important VS Code skill. Press \`Cmd/Ctrl+Shift+P\` → **Python: Select Interpreter** → choose your project's \`.venv\`. The status bar bottom-left shows the active interpreter. If imports show as unresolved or the wrong packages appear, you have the wrong interpreter selected — this is the number-one beginner confusion.

### The integrated debugger

Set a breakpoint by clicking left of a line number, press \`F5\`, and step through code inspecting variables. For understanding how a training loop or a data transform actually behaves, the debugger beats \`print()\` every time. Key controls: \`F10\` step over, \`F11\` step into, \`F5\` continue.

## Jupyter notebooks — interactive exploration

A notebook is a document of **cells**. Code cells execute and show their output inline — including plots, tables, and images. Markdown cells hold prose. The notebook keeps a live Python **kernel** in memory, so variables persist between cells.

\`\`\`bash
python -m pip install jupyterlab
jupyter lab        # opens in your browser
\`\`\`

### Why notebooks fit AI work

- **Inspect as you go**: load a dataset, look at \`df.head()\`, plot a histogram, adjust — without re-running everything.
- **Expensive state stays warm**: load a 5 GB model once into a variable; keep experimenting with it across dozens of cells.
- **Narrative**: mix explanation, code, and results — ideal for sharing analysis.

### The hidden-state trap

Because the kernel holds state, a notebook can *look* correct while being broken. You might define \`x\` in cell 5, use it in cell 3, then delete cell 5 — cell 3 still works until you restart. **Always finish with Kernel → Restart & Run All** to prove the notebook runs top-to-bottom. Out-of-order execution (the \`[*]\` counters not increasing monotonically) is a warning sign.

### Notebooks vs scripts — when to use which

| Use a notebook for | Use a \`.py\` script/module for |
|---|---|
| EDA, plotting, one-off analysis | Reusable functions and classes |
| Prototyping a model | Training pipelines run from the CLI |
| Teaching and reports | Anything under version control that others import |
| Trying an API | Production code, tests |

A healthy workflow: prototype in a notebook, then *graduate* stable code into \`.py\` files you import back into the notebook.

## Google Colab — notebooks with a free GPU

Colab is a hosted Jupyter notebook running on Google's servers, with **free access to GPUs and TPUs** (with usage limits). You need no local install and nothing to configure — invaluable when your laptop has no NVIDIA GPU and you want to fine-tune a model or run PyTorch on CUDA.

Key points:
- Runtime → Change runtime type → **T4 GPU** to get a GPU.
- Sessions are **ephemeral**: the machine is wiped after a period of inactivity (~90 min) or 12 hours max. Save work to Google Drive or GitHub.
- \`!pip install\` (note the \`!\`) runs shell commands; the environment resets every session so you reinstall each time.
- Great for experiments; not for long training runs or private/sensitive data unless you understand the terms.

## Recommended setup for this course

1. **VS Code** with the Python, Jupyter, and Ruff extensions for writing code.
2. A project \`.venv\` selected as the interpreter.
3. **JupyterLab locally** for exploration, or **Colab** when you need a GPU.
`,

'301.4': `# The Command Line, Git & Environment Variables for AI Projects

AI development happens at the terminal far more than beginners expect: installing packages, launching training runs, moving datasets, inspecting GPU usage, and deploying. You do not need to be a shell wizard, but a working command-line vocabulary and solid Git habits are prerequisites, not extras.

## The shell commands you actually need

| Command | Does |
|---|---|
| \`pwd\` | Print working directory — where am I? |
| \`ls -la\` | List files, including hidden ones (like \`.env\`) |
| \`cd path\` | Change directory; \`cd ..\` goes up, \`cd ~\` goes home |
| \`mkdir data\` | Make a directory |
| \`cp src dst\` / \`mv src dst\` | Copy / move (or rename) |
| \`rm file\` / \`rm -r dir\` | Delete (no undo — be careful) |
| \`cat file\` / \`less file\` | Print / page through a file |
| \`head -20 file\` / \`tail -f log\` | First 20 lines / follow a growing log |
| \`grep "error" log.txt\` | Search text |
| \`curl -O url\` / \`wget url\` | Download a file (datasets, model weights) |
| \`python -m pip list\` | What's installed here |
| \`nvidia-smi\` | GPU model, memory, utilisation (on NVIDIA machines) |

Piping and redirection show up constantly:

\`\`\`bash
python train.py > run.log 2>&1 &     # run in background, capture stdout+stderr
tail -f run.log                       # watch it live
ls data/ | wc -l                      # count files in a folder
\`\`\`

## Git — the minimum viable workflow

Every project you build should be a Git repository from commit one. Git tracks the history of your code so you can experiment fearlessly and collaborate.

\`\`\`bash
git init
git add .
git commit -m "Initial project scaffold"

# day-to-day loop
git status                 # what changed
git add train.py           # stage specific files
git commit -m "Add early stopping to training loop"
git log --oneline          # history

# branching for an experiment
git checkout -b try-bigger-model
# ...work, commit...
git checkout main
git merge try-bigger-model
\`\`\`

### .gitignore for AI projects

Some things must **never** be committed. Create a \`.gitignore\`:

\`\`\`gitignore
.venv/
__pycache__/
*.pyc
.env                 # secrets!
data/                # large datasets — use DVC or cloud storage
*.ckpt
*.pth                # model weights — often hundreds of MB
.ipynb_checkpoints/
wandb/
\`\`\`

Datasets and model checkpoints are large binary files. Git stores full copies of every version and the repo balloons. Keep data out of Git; track it with tools like DVC, or store it in S3/GCS and download it in a setup script.

## Environment variables & secrets

AI projects call paid APIs — OpenAI, Anthropic, Hugging Face, Weights & Biases. Those API keys are **secrets**. Hard-coding them in your source is the most common way developers leak keys onto GitHub, where bots scrape and abuse them within minutes.

The standard pattern uses a \`.env\` file (git-ignored) plus \`python-dotenv\`:

\`\`\`bash
# .env  — never committed
OPENAI_API_KEY=sk-proj-abc123...
ANTHROPIC_API_KEY=sk-ant-xyz789...
HF_TOKEN=hf_...
\`\`\`

\`\`\`python
import os
from dotenv import load_dotenv

load_dotenv()  # reads .env into environment variables

api_key = os.environ["OPENAI_API_KEY"]   # KeyError if missing — fail loudly
model   = os.getenv("MODEL", "gpt-4o-mini")  # with a default
\`\`\`

Commit a \`.env.example\` with the *keys but not the values* so collaborators know what to set:

\`\`\`bash
# .env.example
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
\`\`\`

### If you leak a key

Rotate it immediately in the provider's dashboard — deleting the commit is not enough, because the key is already in the Git history and on anyone's clone. Treat a leaked key as compromised, always.

## Putting it together: a clean project start

\`\`\`bash
mkdir sentiment-classifier && cd sentiment-classifier
git init
python -m venv .venv && source .venv/bin/activate
python -m pip install numpy pandas scikit-learn python-dotenv
python -m pip freeze > requirements.txt
printf ".venv/\\n__pycache__/\\n.env\\ndata/\\n" > .gitignore
printf "OPENAI_API_KEY=\\n" > .env.example
touch .env README.md main.py
git add . && git commit -m "Project scaffold"
\`\`\`

This 10-line ritual gives you isolation, reproducibility, version control, and safe secret handling before you write a line of AI code.
`,
}

export const quiz: Record<string, QuizQuestion[]> = {

'301.1': [
  {
    question: 'Why is it recommended NOT to use the Python that comes pre-installed with macOS or Linux for development?',
    options: [
      'The system Python cannot run third-party packages at all',
      'The operating system depends on it, it is often outdated, and installing packages into it usually requires sudo and can break OS tools',
      'The system Python is always a different language dialect incompatible with PyPI packages',
      'It only supports Python 2 and cannot be upgraded',
    ],
    correctIndex: 1,
    explanation: 'The system interpreter is used by OS scripts, tends to lag behind current releases, and modifying its packages (often needing sudo) risks breaking system tooling. Install a separate, user-owned Python instead.',
  },
  {
    question: 'For AI/ML work, which Python version strategy is safest?',
    options: [
      'Always use the newest released version the day it comes out',
      'Use whatever the system ships',
      'Stay about one minor version behind the newest, so compiled ML wheels (PyTorch, scipy, tokenizers) are available',
      'Use the oldest version that still receives security patches',
    ],
    correctIndex: 2,
    explanation: 'Libraries with compiled C/CUDA extensions often take months to publish wheels for a brand-new Python release. Staying one minor version behind (e.g. 3.11 or 3.12) means the whole ecosystem already supports you.',
  },
  {
    question: 'What does the command `python -m pip install requests` guarantee that `pip install requests` does not?',
    options: [
      'It installs the package system-wide for all users',
      'It installs a faster, compiled version of the package',
      'It installs into the exact interpreter you invoked, avoiding the case where `pip` and `python` point to different Pythons',
      'It verifies the package signature before installing',
    ],
    correctIndex: 2,
    explanation: 'Running pip as a module of a specific interpreter ensures the package lands in that interpreter\'s site-packages. A bare `pip` may belong to a different Python, causing "installed but import fails" confusion.',
  },
  {
    question: 'On Windows, skipping which step during the official installer causes most "python is not recognized as a command" errors?',
    options: [
      'Choosing "Install for all users"',
      'Checking "Add python.exe to PATH"',
      'Installing the py launcher',
      'Disabling the path length limit',
    ],
    correctIndex: 1,
    explanation: 'If Python is not added to PATH, the shell cannot find the interpreter by name. The installer offers a checkbox for this that is easy to miss.',
  },
  {
    question: 'What is the role of PyPI in relation to pip?',
    options: [
      'PyPI is the interpreter; pip is the standard library',
      'PyPI is the Python Package Index — the public repository of packages that pip downloads from',
      'PyPI is a virtual environment manager',
      'PyPI is a compiler that turns Python into machine code',
    ],
    correctIndex: 1,
    explanation: 'pip is the installer; PyPI (pypi.org) is the default remote index it fetches packages from before copying them into your interpreter\'s site-packages.',
  },
],

'301.3': [
  {
    question: 'In VS Code, you open a project and every import shows as unresolved even though you installed the packages. What is the most likely cause?',
    options: [
      'VS Code needs to be reinstalled',
      'The wrong Python interpreter is selected — not the project\'s virtual environment',
      'Pylance is incompatible with virtual environments',
      'The packages must be installed globally for VS Code to see them',
    ],
    correctIndex: 1,
    explanation: 'VS Code resolves imports against the selected interpreter. If it points at a global or different Python rather than the project\'s .venv, the installed packages are invisible. Use "Python: Select Interpreter".',
  },
  {
    question: 'Why can a Jupyter notebook appear to work correctly but actually be broken?',
    options: [
      'Notebooks silently ignore syntax errors',
      'The kernel holds state in memory, so cells can depend on variables from deleted or out-of-order cells and still run until the kernel restarts',
      'Markdown cells can overwrite code cell outputs',
      'Notebooks cache results permanently and never re-run code',
    ],
    correctIndex: 1,
    explanation: 'The live kernel keeps every variable ever defined. Running cells out of order, or deleting the cell that defined something still in memory, produces a notebook that fails on a fresh "Restart & Run All".',
  },
  {
    question: 'What is the practical reason many learners use Google Colab for deep-learning experiments?',
    options: [
      'Colab runs code faster than any local machine regardless of hardware',
      'Colab provides free (rate-limited) access to GPUs/TPUs without any local setup',
      'Colab notebooks never lose their state',
      'Colab is the only environment that can run PyTorch',
    ],
    correctIndex: 1,
    explanation: 'Colab hosts the notebook on Google infrastructure and offers free GPU/TPU runtimes, which is valuable when your laptop lacks an NVIDIA GPU. Sessions are ephemeral, so work must be saved externally.',
  },
  {
    question: 'Which task is better suited to a .py module than a Jupyter notebook?',
    options: [
      'Plotting a quick histogram of a new dataset',
      'Reusable functions and classes that other files import, kept under version control',
      'Inspecting df.head() while cleaning data',
      'Writing a narrative analysis report with inline charts',
    ],
    correctIndex: 1,
    explanation: 'Notebooks excel at interactive exploration and narrative. Stable, importable, testable code belongs in .py modules; a common workflow graduates code from notebook to module once it stabilises.',
  },
  {
    question: 'In Colab, what does the leading "!" in "!pip install transformers" signify?',
    options: [
      'It forces the install to run with administrator privileges',
      'It runs the line as a shell command rather than Python code',
      'It suppresses all output from the command',
      'It marks the line as a comment',
    ],
    correctIndex: 1,
    explanation: 'In Jupyter/Colab, a line beginning with ! is executed by the system shell. Because Colab environments reset each session, such installs must be repeated every time.',
  },
],

'301.4': [
  {
    question: 'Why should datasets and model checkpoint files generally be kept out of a Git repository?',
    options: [
      'Git cannot store binary files at all',
      'Git stores a full copy of every version of every file, so large binaries make the repo enormous and slow',
      'GitHub bans repositories that contain any binary data',
      'Model weights change the licence of the whole repository',
    ],
    correctIndex: 1,
    explanation: 'Git history keeps every revision. Large, frequently-changing binaries (datasets, .pth/.ckpt files) bloat the repo permanently. Track them with DVC or store them in cloud object storage and download in a setup step.',
  },
  {
    question: 'What is the recommended way to handle an API key like OPENAI_API_KEY in a Python AI project?',
    options: [
      'Hard-code it as a string constant at the top of main.py',
      'Store it in a git-ignored .env file and load it with python-dotenv into an environment variable',
      'Pass it as a command-line argument every time and also commit it to the README',
      'Store it in a config.py file that is committed so teammates can use it',
    ],
    correctIndex: 1,
    explanation: 'Secrets belong in a .env file that is listed in .gitignore. load_dotenv() reads it into os.environ. A committed .env.example documents which keys are needed without exposing values.',
  },
  {
    question: 'You accidentally committed and pushed a file containing your real API key. Deleting the file in a new commit is not enough. Why, and what must you do?',
    options: [
      'It is enough; the key is safe once the file is deleted',
      'The key remains in Git history and on every clone, so you must rotate (regenerate) the key in the provider dashboard',
      'You must delete the entire GitHub account',
      'You must wait 24 hours for GitHub to purge it automatically',
    ],
    correctIndex: 1,
    explanation: 'Git history retains the old commit, and anyone who cloned or scraped the repo already has the key. The only safe response is to revoke/rotate the key immediately with the provider.',
  },
  {
    question: 'What does "python train.py > run.log 2>&1 &" do?',
    options: [
      'Runs the script twice and compares the logs',
      'Runs the script in the background, redirecting both standard output and standard error into run.log',
      'Runs the script only if run.log does not already exist',
      'Encrypts the output into run.log',
    ],
    correctIndex: 1,
    explanation: '> redirects stdout to run.log, 2>&1 sends stderr to the same place, and the trailing & backgrounds the process so the shell stays free (e.g. to `tail -f run.log`).',
  },
  {
    question: 'Which command shows GPU model, memory usage, and utilisation on an NVIDIA machine?',
    options: ['gpu-info', 'nvidia-smi', 'python -m torch.gpu', 'lsgpu'],
    correctIndex: 1,
    explanation: 'nvidia-smi (NVIDIA System Management Interface) reports installed GPUs, driver/CUDA version, per-process memory use, and current utilisation. It is the first tool to check when training is slow or out-of-memory.',
  },
],
}

export const codingTask: Record<string, {
  instructions: string; boilerplate: string; rubric: string[]; hints: string[]
}> = {

'301.2': {
  instructions: `Write a module \`envtools.py\` that reports on the current Python environment — the kind of diagnostic helper you reach for when "it works on my machine" problems appear.

Implement three functions:

1. \`interpreter_info() -> dict\` — returns a dict with keys:
   - \`"version"\`: the Python version as \`"3.12.4"\` style string (major.minor.micro)
   - \`"executable"\`: the absolute path to the running interpreter
   - \`"in_venv"\`: \`True\` if running inside a virtual environment, else \`False\`

2. \`installed_packages() -> dict[str, str]\` — returns a mapping of \`{distribution_name: version}\` for every installed third-party package, sorted by name (case-insensitive).

3. \`missing_requirements(requirements_path: str) -> list[str]\` — given a path to a \`requirements.txt\` file with lines like \`numpy==1.26.4\` or \`pandas>=2.0\`, return the sorted list of package names that are **not** currently installed. Ignore blank lines and comment lines starting with \`#\`. Only compare on the package name (the part before any of \`=\`, \`<\`, \`>\`, \`~\`, \`!\`).

Acceptance criteria:
- \`interpreter_info()["version"]\` matches \`sys.version_info\`
- \`in_venv\` detection works for both venv and virtualenv (\`sys.prefix != sys.base_prefix\`)
- \`installed_packages()\` uses \`importlib.metadata\`, not a subprocess call to pip
- \`missing_requirements\` parses specifiers correctly and is case-insensitive on names
- No hard-coded package lists`,
  boilerplate: `"""Environment diagnostic helpers."""
import sys
from importlib import metadata


def interpreter_info() -> dict:
    """Return version, executable path, and virtual-env status."""
    # TODO: build the version string from sys.version_info
    # TODO: sys.executable for the path
    # TODO: sys.prefix != sys.base_prefix means we are in a venv
    raise NotImplementedError


def installed_packages() -> dict[str, str]:
    """Return {name: version} for all installed distributions, sorted by name."""
    # TODO: iterate metadata.distributions()
    raise NotImplementedError


def _package_name(requirement_line: str) -> str:
    """Extract just the package name from a requirements.txt line."""
    # TODO: strip at the first specifier character
    raise NotImplementedError


def missing_requirements(requirements_path: str) -> list[str]:
    """Return sorted names from the requirements file that are not installed."""
    # TODO: read file, skip blanks/comments, compare names case-insensitively
    raise NotImplementedError


if __name__ == "__main__":
    import json
    print(json.dumps(interpreter_info(), indent=2))
    print(f"{len(installed_packages())} packages installed")
`,
  rubric: [
    'interpreter_info returns version as major.minor.micro string from sys.version_info',
    'interpreter_info returns sys.executable as the executable path',
    'in_venv correctly uses sys.prefix != sys.base_prefix',
    'installed_packages uses importlib.metadata and returns a name-sorted dict',
    'installed_packages keys are distribution names with their version strings',
    '_package_name strips at the first of = < > ~ ! characters',
    'missing_requirements ignores blank lines and # comment lines',
    'missing_requirements compares names case-insensitively and returns a sorted list',
    'No subprocess/pip calls and no hard-coded package names',
  ],
  hints: [
    'sys.version_info gives .major .minor .micro; f"{v.major}.{v.minor}.{v.micro}".',
    'metadata.distributions() yields objects; use d.metadata["Name"] and d.version.',
    'For the name split, re.split(r"[=<>~!]", line, maxsplit=1)[0].strip() works.',
    'Normalise names with .lower() (and optionally replace "_" with "-") on both sides before comparing.',
    'A virtualenv sets sys.prefix to the env folder while sys.base_prefix stays at the system Python.',
  ],
},
}
