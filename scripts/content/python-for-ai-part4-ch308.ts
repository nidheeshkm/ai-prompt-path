// Part IV — Math & Machine-Learning On-Ramp
// Chapter 308: Machine Learning & the AI On-Ramp

import type { QuizQuestion } from '../../src/data/curriculum'

export const courseId = 'python-for-ai'

export const content: Record<string, string> = {

'308.1': `# The ML Workflow with scikit-learn: Split, Fit, Predict, Evaluate

scikit-learn is the standard library for classical machine learning in Python. More importantly, its API defines a **workflow** that every ML project follows, including deep learning: split the data, fit on train, predict, evaluate on held-out data, iterate.

## The estimator API

Every model in scikit-learn is an *estimator* with the same three methods:

\`\`\`python
from sklearn.linear_model import LogisticRegression

model = LogisticRegression(C=1.0, max_iter=1000)   # 1. construct with hyperparameters
model.fit(X_train, y_train)                          # 2. learn parameters from data
preds = model.predict(X_test)                        # 3. predict on new data
proba = model.predict_proba(X_test)                  # class probabilities
\`\`\`

Transformers (scalers, encoders, vectorisers) use \`fit\` / \`transform\` / \`fit_transform\` instead of \`predict\`. This uniformity means you can swap a \`RandomForestClassifier\` for a \`LogisticRegression\` by changing one line.

## Step 1 — Split the data

Never evaluate on data the model trained on: it memorises and you learn nothing about generalisation.

\`\`\`python
from sklearn.model_selection import train_test_split

X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.2,
    random_state=42,        # reproducible split
    stratify=y,             # keep class proportions — important for imbalance
)
\`\`\`

For real projects, use **three** splits: train (fit), validation (tune hyperparameters / choose models), test (touched once, at the end). Reusing the test set to make decisions turns it into a second validation set and your final number becomes optimistic.

## Step 2 — Preprocess (fit on train only)

\`\`\`python
from sklearn.preprocessing import StandardScaler

scaler = StandardScaler()
X_train_s = scaler.fit_transform(X_train)   # compute mean/std on TRAIN
X_test_s  = scaler.transform(X_test)        # apply the SAME mean/std to test
\`\`\`

Calling \`fit_transform\` on the test set (or the full dataset before splitting) leaks test statistics into training — a subtle but real form of data leakage that inflates your score.

## Step 3 — Pipelines make leakage hard

A \`Pipeline\` chains preprocessing and the model into one estimator, so \`fit\` only ever sees training data:

\`\`\`python
from sklearn.pipeline import make_pipeline

pipe = make_pipeline(
    StandardScaler(),
    LogisticRegression(max_iter=1000),
)
pipe.fit(X_train, y_train)
pipe.predict(X_test)
\`\`\`

Now cross-validation and grid search refit the scaler correctly on each fold automatically.

## Step 4 — Evaluate

\`\`\`python
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

y_pred = pipe.predict(X_test)
print(accuracy_score(y_test, y_pred))
print(classification_report(y_test, y_pred))     # precision, recall, f1 per class
print(confusion_matrix(y_test, y_pred))
\`\`\`

## Step 5 — Cross-validation for a stable estimate

A single train/test split is noisy. **k-fold cross-validation** splits the training data into k parts, trains k times (each part is the held-out fold once), and averages:

\`\`\`python
from sklearn.model_selection import cross_val_score

scores = cross_val_score(pipe, X_train, y_train, cv=5, scoring="f1_macro")
print(f"{scores.mean():.3f} ± {scores.std():.3f}")
\`\`\`

## Step 6 — Tune hyperparameters

\`\`\`python
from sklearn.model_selection import GridSearchCV

grid = GridSearchCV(
    pipe,
    param_grid={"logisticregression__C": [0.01, 0.1, 1, 10]},
    cv=5, scoring="f1_macro",
)
grid.fit(X_train, y_train)
print(grid.best_params_, grid.best_score_)
best = grid.best_estimator_
\`\`\`

Grid search uses cross-validation internally, so it never sees the test set.

## The workflow, summarised

1. Split into train / (val) / test — stratify, fix the seed.
2. Build a Pipeline (preprocessing + model).
3. Cross-validate on the training set to estimate performance.
4. Tune hyperparameters with GridSearchCV / RandomizedSearchCV.
5. Fit the best pipeline on all training data.
6. Evaluate **once** on the test set. Report that number.

This loop is identical whether the model is logistic regression, gradient boosting, or a neural network.
`,

'308.2': `# Regression, Classification & Evaluation Metrics

Supervised learning has two shapes. Knowing which you have — and which metric actually reflects success — is more important than which algorithm you pick.

## Regression vs classification

| | Regression | Classification |
|---|---|---|
| Target | continuous number | discrete class |
| Examples | price, temperature, ETA, demand | spam/not, disease/healthy, digit 0–9 |
| Output | a value | a class, usually via class probabilities |
| Loss | mean squared error | cross-entropy (log loss) |
| Baseline | predict the mean/median | predict the majority class |

If your target is a count or an ordered rating, you can frame it either way; start with regression and round, or treat ratings as ordinal.

## Models to reach for first

\`\`\`python
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.svm import SVC
\`\`\`

- **Linear / logistic regression** — fast, interpretable, a strong baseline. Always run this first.
- **Random forests / gradient boosting** (XGBoost, LightGBM) — the workhorses for tabular data; handle non-linearity and mixed feature types with little tuning.
- **SVMs, k-NN** — situational.
- **Neural networks** — win on text, images, audio; rarely beat gradient boosting on plain tabular data.

## Regression metrics

\`\`\`python
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

mae  = mean_absolute_error(y_true, y_pred)        # average |error|, same units as y
rmse = mean_squared_error(y_true, y_pred) ** 0.5  # penalises big errors more
r2   = r2_score(y_true, y_pred)                   # fraction of variance explained; 1.0 perfect, 0 = predicting the mean
\`\`\`

Use **MAE** when all errors matter equally, **RMSE** when large errors are disproportionately bad. **R²** gives a scale-free sense of fit but can mislead on non-linear or heteroscedastic data.

## Classification metrics — beyond accuracy

The **confusion matrix** is the source of truth. For binary classification with "positive" = the class you care about:

|  | predicted + | predicted − |
|---|---|---|
| actual + | TP | FN |
| actual − | FP | TN |

\`\`\`
accuracy  = (TP + TN) / total          # misleading under imbalance
precision = TP / (TP + FP)             # of flagged positives, how many are real
recall    = TP / (TP + FN)             # of real positives, how many we caught
F1        = 2·precision·recall / (precision + recall)   # harmonic mean
\`\`\`

- **Fraud / disease screening** → optimise **recall** (missing a positive is costly); tolerate false alarms.
- **Spam filter / content takedown** → optimise **precision** (a false positive removes legit content).
- **Balanced concern** → **F1**, or **F-beta** to weight one side.
- **Multi-class** → \`f1_macro\` (unweighted mean over classes; treats rare classes equally) vs \`f1_micro\`/accuracy (dominated by frequent classes).

\`\`\`python
from sklearn.metrics import classification_report, roc_auc_score, average_precision_score

print(classification_report(y_test, y_pred))
auc = roc_auc_score(y_test, y_proba)              # ranking quality, threshold-free
ap  = average_precision_score(y_test, y_proba)    # PR-AUC — better for heavy imbalance
\`\`\`

## Thresholds and probabilities

A classifier outputs \`P(positive)\`; turning it into a label needs a **threshold** (default 0.5, but rarely optimal). Lowering the threshold raises recall and lowers precision. The **ROC curve** (TPR vs FPR) and **precision-recall curve** show every threshold at once; pick the operating point from the business cost of each error type, on the validation set.

## Bias–variance and the diagnosis table

| Train score | Val score | Diagnosis | Fixes |
|---|---|---|---|
| low | low | underfitting (high bias) | bigger model, more features, less regularisation, train longer |
| high | much lower | overfitting (high variance) | more data, regularisation, simpler model, early stopping, dropout |
| high | slightly lower | good fit | ship it; small gap is normal |
| high | high, but useless in production | leakage or distribution shift | audit features, re-split by time, check data provenance |

## Always compare against a baseline

Before celebrating 0.87 F1, compute the trivial baseline: majority class for classification, mean/median for regression. A model that barely beats "always predict the common class" is not learning. \`sklearn.dummy.DummyClassifier\` / \`DummyRegressor\` make this one line.
`,

'308.3': `# PyTorch Tensors & a Minimal Training Loop

PyTorch is the dominant framework for deep learning research and increasingly for production. Its core object, the **tensor**, is "NumPy with autograd and GPU support." If you know NumPy, you know 80% of PyTorch tensors already.

## Tensors

\`\`\`python
import torch

x = torch.tensor([[1.0, 2.0], [3.0, 4.0]])
torch.zeros(3, 4); torch.ones(2); torch.randn(32, 128)
x.shape          # torch.Size([2, 2])
x.dtype          # torch.float32  — PyTorch defaults to float32, unlike NumPy
x @ x            # matmul; +, *, broadcasting, x.mean(dim=0), x.reshape(-1) all work
x.T; x.unsqueeze(0); x.squeeze()

# interop with NumPy (shares memory on CPU)
import numpy as np
t = torch.from_numpy(np.array([1, 2, 3]))
arr = t.numpy()
\`\`\`

Differences from NumPy to remember: \`dim\` instead of \`axis\`, \`float32\` default, \`.item()\` to get a Python number out of a scalar tensor, and \`.view()\` / \`.reshape()\`.

## Devices — CPU and GPU

\`\`\`python
device = "cuda" if torch.cuda.is_available() else "cpu"
model = model.to(device)
x = x.to(device)          # tensors and model must be on the SAME device
\`\`\`

A "expected all tensors on the same device" error means you moved the model but not the data (or vice versa).

## Autograd

Set \`requires_grad=True\` (parameters do this automatically) and PyTorch builds a computation graph as you compute. \`.backward()\` walks it to fill \`.grad\`.

\`\`\`python
w = torch.tensor([2.0], requires_grad=True)
loss = (w * 3 - 1) ** 2
loss.backward()
w.grad            # d loss / d w  = 2*(3w-1)*3 = 30 at w=2
\`\`\`

Use \`with torch.no_grad():\` for inference to skip graph-building and save memory.

## Building a model

\`\`\`python
import torch.nn as nn

class MLP(nn.Module):
    def __init__(self, in_dim, hidden, out_dim):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(in_dim, hidden),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(hidden, out_dim),
        )

    def forward(self, x):
        return self.net(x)

model = MLP(784, 256, 10).to(device)
\`\`\`

## The training loop — memorise this shape

\`\`\`python
optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)
loss_fn = nn.CrossEntropyLoss()

for epoch in range(epochs):
    model.train()
    for xb, yb in train_loader:
        xb, yb = xb.to(device), yb.to(device)

        optimizer.zero_grad()          # 1. clear old gradients
        logits = model(xb)             # 2. forward pass
        loss = loss_fn(logits, yb)     # 3. compute loss
        loss.backward()                # 4. backprop — fill .grad
        optimizer.step()               # 5. update parameters

    model.eval()
    with torch.no_grad():
        correct = sum((model(xb.to(device)).argmax(1).cpu() == yb).sum().item()
                      for xb, yb in val_loader)
    print(f"epoch {epoch}: val acc {correct / len(val_set):.3f}")
\`\`\`

Those five steps in the inner loop are the heart of deep learning. Every training script — from MNIST to GPT — is this pattern, scaled up.

## DataLoaders

\`\`\`python
from torch.utils.data import TensorDataset, DataLoader

train_ds = TensorDataset(torch.tensor(X_train), torch.tensor(y_train))
train_loader = DataLoader(train_ds, batch_size=64, shuffle=True)
\`\`\`

The loader batches, shuffles each epoch, and (with \`num_workers>0\`) loads in parallel.

## Common beginner errors

| Symptom | Cause |
|---|---|
| loss not decreasing | forgot \`optimizer.zero_grad()\`, or LR wrong, or \`model.train()\` not set |
| "element 0 does not require grad" | broke the graph with \`.detach()\`, \`.numpy()\`, or \`torch.no_grad()\` |
| device mismatch error | model and data on different devices |
| loss is NaN | LR too high, or \`log(0)\` — use \`CrossEntropyLoss\` on raw logits, not after softmax |
| val accuracy stuck at chance | labels misaligned, or \`shuffle=True\` on the *test* loader hiding it |
`,

'308.4': `# Using Pretrained Models & Calling LLM APIs

Most practical AI today is not training from scratch — it is **using models someone else trained**: pretrained vision/text encoders from Hugging Face, and large language models behind APIs. This topic is the bridge from "I know Python and the data stack" to "I can build an AI feature."

## Hugging Face: the pipeline

The fastest path to a working model is \`transformers.pipeline\`:

\`\`\`python
from transformers import pipeline

clf = pipeline("sentiment-analysis")
clf("This tutorial is fantastic")
# [{'label': 'POSITIVE', 'score': 0.9998}]

ner = pipeline("ner", grouped_entities=True)
embed = pipeline("feature-extraction", model="sentence-transformers/all-MiniLM-L6-v2")
summarize = pipeline("summarization", model="facebook/bart-large-cnn")
\`\`\`

It downloads the model (cached in \`~/.cache/huggingface\`), handles tokenisation, and runs inference. \`device=0\` puts it on the GPU.

## Tokenisers and models directly

\`\`\`python
from transformers import AutoTokenizer, AutoModel
import torch

tok = AutoTokenizer.from_pretrained("bert-base-uncased")
model = AutoModel.from_pretrained("bert-base-uncased")

inputs = tok(["hello world", "second sentence"],
             padding=True, truncation=True, return_tensors="pt")
with torch.no_grad():
    out = model(**inputs)
embeddings = out.last_hidden_state.mean(dim=1)     # mean-pool -> (2, 768)
\`\`\`

**Sentence-transformers** wraps this for embeddings, which you need for semantic search and RAG:

\`\`\`python
from sentence_transformers import SentenceTransformer
enc = SentenceTransformer("all-MiniLM-L6-v2")
vecs = enc.encode(["a cat", "a kitten", "a car"], normalize_embeddings=True)
sims = vecs @ vecs.T          # cosine similarity matrix
\`\`\`

## Calling an LLM API

The chat-completions pattern is near-identical across providers.

\`\`\`python
import os
from openai import OpenAI          # Anthropic, and others, mirror this shape

client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

resp = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[
        {"role": "system", "content": "You are a terse classifier. Reply with one word."},
        {"role": "user", "content": f"Sentiment of: {text}"},
    ],
    temperature=0,
    max_tokens=5,
)
answer = resp.choices[0].message.content
\`\`\`

Key parameters:
- **\`temperature\`** — 0 for deterministic/classification, 0.7–1.0 for creative text.
- **\`max_tokens\`** — cap the response length (and cost).
- **\`messages\`** — the conversation: a \`system\` instruction plus alternating \`user\`/\`assistant\` turns. The API is stateless; you resend the history each call.

## Structured output

For anything programmatic, force JSON and validate it:

\`\`\`python
import json
from pydantic import BaseModel

class Extraction(BaseModel):
    sentiment: str
    confidence: float

resp = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": prompt}],
    response_format={"type": "json_object"},
)
data = Extraction.model_validate_json(resp.choices[0].message.content)
\`\`\`

## Cost, latency, and reliability

- **Tokens are money.** Price is per input + output token. Log your token usage (\`resp.usage\`). A retrieval step that dumps 20 documents into the prompt can cost 50x a lean prompt.
- **Latency** is seconds, not milliseconds. Batch with async (Chapter 303.5), stream tokens for UX, and cache identical requests.
- **APIs fail.** Wrap calls in retry-with-backoff for \`429\` (rate limit) and \`5xx\`. Set timeouts.
- **Outputs are non-deterministic** even at \`temperature=0\`. Validate, constrain, and never \`eval()\` a model's output.
- **Prompt injection**: text you pass in (a user message, a retrieved document) can contain instructions. Keep untrusted content clearly separated from your system prompt and never let model output trigger privileged actions unchecked.

## Where this goes next

Embeddings + a vector store + an LLM call is **retrieval-augmented generation (RAG)**. An LLM that can call functions you define is an **agent**. Frameworks like LangChain and LlamaIndex assemble these pieces — but they are all built on exactly the Python, NumPy, and API skills in this course.
`,
}

export const quiz: Record<string, QuizQuestion[]> = {

'308.2': [
  {
    question: 'For a dataset that is 95% class A and 5% class B, a model predicts "A" for every input. What accuracy does it achieve, and why is accuracy the wrong metric here?',
    options: [
      '50% accuracy; accuracy is fine for imbalanced data',
      '95% accuracy; it looks good but the model is useless for finding class B — precision/recall/F1 for class B, or ROC-AUC, reveal the failure',
      '5% accuracy; the model is clearly broken',
      '0% accuracy; predicting one class always fails',
    ],
    correctIndex: 1,
    explanation: 'The majority-class baseline scores 95% while never detecting class B. On imbalanced problems use per-class precision/recall/F1, the confusion matrix, ROC-AUC or PR-AUC, and consider class weights or resampling.',
  },
  {
    question: 'What is the difference between precision and recall for a "spam" classifier?',
    options: [
      'They are two names for the same quantity',
      'Precision = of the emails flagged as spam, how many really were spam; Recall = of all actual spam, how much did we catch',
      'Precision measures speed; recall measures memory usage',
      'Precision is for training, recall is for testing',
    ],
    correctIndex: 1,
    explanation: 'Precision = TP / (TP + FP): trustworthiness of positive predictions. Recall = TP / (TP + FN): coverage of actual positives. Raising the decision threshold usually trades recall for precision; F1 is their harmonic mean.',
  },
  {
    question: 'A model scores 0.99 on training data and 0.71 on the test set. What is happening and what are appropriate responses?',
    options: [
      'Underfitting; make the model bigger and train longer',
      'Overfitting; add regularisation, get more data, reduce model capacity, use early stopping, or add dropout/augmentation',
      'The test set is corrupted; delete it',
      'Nothing is wrong; this gap is expected and healthy',
    ],
    correctIndex: 1,
    explanation: 'A large train-minus-test gap means the model memorised training-specific patterns that do not generalise. Standard fixes reduce variance: more/augmented data, simpler model, L2/dropout, early stopping.',
  },
  {
    question: 'Why is k-fold cross-validation preferred over a single train/validation split when comparing models or hyperparameters?',
    options: [
      'It trains faster',
      'It uses every training example for both training and validation across folds, giving a lower-variance performance estimate and a sense of its spread',
      'It eliminates the need for a test set',
      'It guarantees the model will not overfit',
    ],
    correctIndex: 1,
    explanation: 'A single split\'s score depends heavily on which rows landed in validation. k-fold averages over k different validation sets, producing a more reliable estimate (mean ± std) for model selection. A held-out test set is still needed for the final number.',
  },
  {
    question: 'In scikit-learn, why should preprocessing steps like StandardScaler be inside a Pipeline rather than applied to X before train_test_split?',
    options: [
      'Pipelines run faster',
      'Fitting the scaler on data that includes the test rows leaks test statistics into training; a Pipeline ensures the scaler is fit only on the training fold during fit/cross-validation',
      'StandardScaler does not work outside a Pipeline',
      'It is only a style preference with no effect on results',
    ],
    correctIndex: 1,
    explanation: 'Scaling with the mean/std of the whole dataset (test included) is data leakage. A Pipeline refits preprocessing on the training portion for every fit and every CV fold, so the test data never influences the transform parameters.',
  },
  {
    question: 'You need to predict a continuous house price. Which metric and model family are appropriate?',
    options: [
      'Accuracy and LogisticRegression',
      'MAE / RMSE / R² and a regressor such as LinearRegression, RandomForestRegressor, or GradientBoostingRegressor',
      'F1 score and KMeans',
      'Cross-entropy and a classifier',
    ],
    correctIndex: 1,
    explanation: 'Predicting a real-valued number is regression. Evaluate with mean absolute error, root mean squared error, or R². Classification metrics (accuracy, F1) and classifiers do not apply.',
  },
],
}

export const codingTask: Record<string, {
  instructions: string; boilerplate: string; rubric: string[]; hints: string[]
}> = {

'308.1': {
  instructions: `Implement \`ml_workflow.py\` — a small, leakage-safe scikit-learn workflow wrapper. Assume scikit-learn and NumPy are available.

1. \`make_splits(X, y, *, test_size=0.2, val_size=0.2, seed=42)\` — return a dict with keys \`X_train, X_val, X_test, y_train, y_val, y_test\`. First split off the test set (stratified, seeded), then split the remaining data into train/val (stratified, seeded) so that \`val\` is \`val_size\` of the **original** dataset. Use \`sklearn.model_selection.train_test_split\`.

2. \`build_pipeline(model)\` — return an \`sklearn.pipeline.Pipeline\` of \`StandardScaler()\` then the given \`model\` (steps named \`"scaler"\` and \`"model"\`).

3. \`evaluate(pipeline, X, y) -> dict\` — fit-free; assume \`pipeline\` is already fitted. Return \`{"accuracy": float, "f1_macro": float, "confusion": list[list[int]]}\` using \`sklearn.metrics\`.

4. \`cross_validate_pipeline(model, X, y, *, cv=5, seed=42) -> dict\` — build the pipeline, run \`cross_val_score\` with \`StratifiedKFold(n_splits=cv, shuffle=True, random_state=seed)\` and \`scoring="f1_macro"\`, and return \`{"scores": list[float], "mean": float, "std": float}\`.

5. \`select_and_fit(candidates: dict[str, estimator], splits: dict) -> tuple[str, Pipeline]\` — for each named candidate, build a pipeline, fit on \`X_train\`, score \`f1_macro\` on \`X_val\`; pick the best, **refit it on train+val combined**, and return \`(best_name, fitted_pipeline)\`. The test set must never be touched here.

Acceptance criteria:
- the test split is created before the train/val split and is never used except in explicit \`evaluate\` calls by the caller
- \`val_size\` is measured against the original dataset size
- all splits are stratified and reproducible
- \`build_pipeline\` names its steps \`"scaler"\` and \`"model"\`
- \`select_and_fit\` chooses on validation F1 and refits on train+val, not on test`,
  boilerplate: `"""Leakage-safe scikit-learn workflow helpers."""
import numpy as np
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


def make_splits(X, y, *, test_size=0.2, val_size=0.2, seed=42) -> dict:
    # TODO: split off test first (stratified), then train/val from the rest
    raise NotImplementedError


def build_pipeline(model) -> Pipeline:
    # TODO: Pipeline([("scaler", StandardScaler()), ("model", model)])
    raise NotImplementedError


def evaluate(pipeline, X, y) -> dict:
    # TODO: predict; accuracy, f1_macro, confusion matrix as list of lists
    raise NotImplementedError


def cross_validate_pipeline(model, X, y, *, cv=5, seed=42) -> dict:
    # TODO: StratifiedKFold + cross_val_score(scoring="f1_macro")
    raise NotImplementedError


def select_and_fit(candidates: dict, splits: dict):
    # TODO: fit each on train, score on val, refit best on train+val
    raise NotImplementedError
`,
  rubric: [
    'make_splits creates the test set first with a stratified, seeded train_test_split',
    'make_splits then splits the remainder into train/val, stratified and seeded',
    'val_size is interpreted relative to the original dataset (adjust the second split fraction)',
    'make_splits returns all six arrays under the specified keys',
    'build_pipeline returns a Pipeline with steps named "scaler" (StandardScaler) and "model"',
    'evaluate assumes a fitted pipeline and returns accuracy, f1_macro (average="macro"), and confusion as list[list[int]]',
    'cross_validate_pipeline uses StratifiedKFold(shuffle=True, random_state=seed) and scoring="f1_macro"',
    'cross_validate_pipeline returns scores list, mean, and std',
    'select_and_fit fits candidates on train, ranks by validation f1_macro, and refits the winner on train+val',
    'select_and_fit never reads X_test / y_test',
  ],
  hints: [
    'Second split fraction: rel_val = val_size / (1 - test_size), passed as test_size to the train/val split.',
    'train_test_split(..., stratify=y, random_state=seed) for every split.',
    'confusion_matrix(y, pred).tolist() gives list[list[int]].',
    'cross_val_score(build_pipeline(model), X, y, cv=StratifiedKFold(...), scoring="f1_macro").',
    'For train+val: np.concatenate([X_train, X_val]) and np.concatenate([y_train, y_val]).',
  ],
},

'308.3': {
  instructions: `Implement a minimal PyTorch training loop in \`torch_train.py\`. Assume \`torch\` is available.

1. \`class MLP(nn.Module)\` — constructor \`(in_dim, hidden, out_dim, p_drop=0.1)\` building \`nn.Sequential(Linear(in_dim, hidden), ReLU, Dropout(p_drop), Linear(hidden, out_dim))\` stored as \`self.net\`; \`forward(x)\` returns \`self.net(x)\` (raw logits, no softmax).

2. \`make_loader(X, y, *, batch_size=32, shuffle=True)\` — convert NumPy \`X\` (float) and \`y\` (int) to tensors (\`float32\` / \`long\`), wrap in \`TensorDataset\`, return a \`DataLoader\`.

3. \`train_one_epoch(model, loader, optimizer, loss_fn, device) -> float\` — set \`model.train()\`; for each batch move to \`device\`, do the 5 steps (zero_grad, forward, loss, backward, step); return the **mean loss over samples** for the epoch.

4. \`evaluate(model, loader, device) -> dict\` — set \`model.eval()\`; under \`torch.no_grad()\` compute overall \`accuracy\` and mean cross-entropy \`loss\` over the loader; return \`{"accuracy": float, "loss": float}\`.

5. \`fit(model, train_loader, val_loader, *, epochs=10, lr=1e-3, device="cpu") -> dict\` — Adam optimizer, \`nn.CrossEntropyLoss\`. Each epoch: train, then evaluate on val. Return \`{"train_loss": [...], "val_loss": [...], "val_acc": [...]}\` (one entry per epoch). Move \`model\` to \`device\` first.

Acceptance criteria:
- \`forward\` returns logits; loss is \`CrossEntropyLoss\` on logits (never apply softmax first)
- the 5 steps appear in the correct order with \`optimizer.zero_grad()\` first
- \`evaluate\` runs inside \`torch.no_grad()\` and sets \`model.eval()\`
- \`train_one_epoch\` sets \`model.train()\`
- all tensors and the model are moved to \`device\` consistently
- on a linearly separable toy dataset, \`fit\` drives \`train_loss\` down and \`val_acc\` up`,
  boilerplate: `"""Minimal PyTorch training loop."""
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset


class MLP(nn.Module):
    def __init__(self, in_dim, hidden, out_dim, p_drop=0.1):
        super().__init__()
        # TODO: self.net = nn.Sequential(...)
        raise NotImplementedError

    def forward(self, x):
        raise NotImplementedError


def make_loader(X, y, *, batch_size=32, shuffle=True) -> DataLoader:
    # TODO: torch.as_tensor(X, dtype=torch.float32), torch.as_tensor(y, dtype=torch.long)
    raise NotImplementedError


def train_one_epoch(model, loader, optimizer, loss_fn, device) -> float:
    model.train()
    # TODO: 5-step loop; accumulate loss * batch_size; divide by N
    raise NotImplementedError


def evaluate(model, loader, device) -> dict:
    model.eval()
    # TODO: no_grad; accumulate correct and loss; return dict
    raise NotImplementedError


def fit(model, train_loader, val_loader, *, epochs=10, lr=1e-3, device="cpu") -> dict:
    # TODO: model.to(device); Adam; CrossEntropyLoss; per-epoch train + eval
    raise NotImplementedError
`,
  rubric: [
    'MLP builds the specified Sequential (Linear, ReLU, Dropout, Linear) and forward returns raw logits',
    'make_loader creates float32 features and long labels in a TensorDataset/DataLoader',
    'train_one_epoch sets model.train() and performs zero_grad -> forward -> loss -> backward -> step in that order',
    'train_one_epoch returns the sample-weighted mean loss for the epoch',
    'evaluate sets model.eval() and wraps computation in torch.no_grad()',
    'evaluate returns accuracy and mean cross-entropy loss as floats',
    'loss is computed by nn.CrossEntropyLoss on logits, with no manual softmax',
    'fit moves the model to device, uses torch.optim.Adam(lr=lr), and returns train_loss/val_loss/val_acc lists of length epochs',
    'tensors and model are consistently moved to device',
  ],
  hints: [
    'nn.Sequential(nn.Linear(in_dim, hidden), nn.ReLU(), nn.Dropout(p_drop), nn.Linear(hidden, out_dim)).',
    'make_loader: ds = TensorDataset(torch.as_tensor(X, dtype=torch.float32), torch.as_tensor(y, dtype=torch.long)).',
    '5 steps: optimizer.zero_grad(); logits = model(xb); loss = loss_fn(logits, yb); loss.backward(); optimizer.step().',
    'epoch loss: total += loss.item() * xb.size(0); then total / len(loader.dataset).',
    'accuracy: (logits.argmax(1) == yb).sum().item(); accumulate and divide by dataset size.',
  ],
},

'308.4': {
  instructions: `Implement \`llm_client.py\` — a defensive wrapper around a chat-completions-style LLM API. **Do not call any real network API.** The client is injected so it can be mocked in tests.

Assume an injected \`client\` object with \`client.complete(messages: list[dict], *, temperature: float, max_tokens: int) -> str\` that returns the assistant's text (and may raise \`RateLimitError\` or \`ServerError\`, both provided).

1. \`build_messages(system: str, user: str, examples: list[tuple[str, str]] | None = None) -> list[dict]\` — return the messages list: one \`{"role": "system", ...}\`, then for each \`(u, a)\` in \`examples\` a \`user\` then \`assistant\` message, then the final \`{"role": "user", "content": user}\`.

2. \`call_with_retry(client, messages, *, temperature=0.0, max_tokens=256, attempts=4, base_delay=0.5, sleep=time.sleep) -> str\` — call \`client.complete\`; on \`RateLimitError\` or \`ServerError\` retry with exponential backoff (\`base_delay * 2**i\`), calling the injected \`sleep\`. Re-raise after \`attempts\` failures. Other exceptions propagate immediately.

3. \`classify(client, text: str, labels: list[str], **kw) -> str\` — build a system prompt instructing the model to reply with exactly one of \`labels\`, call \`call_with_retry\` at \`temperature=0\`, then **validate**: strip/lowercase the reply and match it case-insensitively against \`labels\`; return the canonical label. If it matches none, raise \`ValueError\`.

4. \`extract_json(client, prompt: str, required_keys: list[str], **kw) -> dict\` — call the model, parse the reply as JSON (find the first \`{\` and last \`}\` if there is surrounding prose), and confirm every key in \`required_keys\` is present; raise \`ValueError\` on parse failure or missing keys.

Acceptance criteria:
- no real HTTP / SDK calls; everything goes through the injected \`client\` and \`sleep\`
- \`call_with_retry\` only retries the two transient error types and backs off exponentially
- \`classify\` never returns a value outside \`labels\`
- \`extract_json\` tolerates leading/trailing prose around the JSON object
- \`classify\` and \`extract_json\` forward extra kwargs (e.g. \`max_tokens\`) through to \`call_with_retry\``,
  boilerplate: `"""Defensive LLM API wrapper (network-free; client is injected)."""
import json
import time


class RateLimitError(Exception):
    pass


class ServerError(Exception):
    pass


def build_messages(system: str, user: str, examples=None) -> list[dict]:
    # TODO: system, then few-shot user/assistant pairs, then final user
    raise NotImplementedError


def call_with_retry(client, messages, *, temperature=0.0, max_tokens=256,
                    attempts=4, base_delay=0.5, sleep=time.sleep) -> str:
    # TODO: retry RateLimitError / ServerError with exponential backoff via sleep()
    raise NotImplementedError


def classify(client, text: str, labels: list[str], **kw) -> str:
    # TODO: build prompt, call_with_retry(temperature=0), validate against labels
    raise NotImplementedError


def extract_json(client, prompt: str, required_keys: list[str], **kw) -> dict:
    # TODO: call model, slice first "{" .. last "}", json.loads, check keys
    raise NotImplementedError
`,
  rubric: [
    'build_messages emits system first, then alternating user/assistant few-shot pairs, then the final user message',
    'call_with_retry retries only RateLimitError and ServerError',
    'call_with_retry backs off as base_delay * 2**attempt_index using the injected sleep function',
    'call_with_retry re-raises the last transient error after `attempts` tries and lets other exceptions propagate immediately',
    'classify calls call_with_retry with temperature=0 and validates the reply against labels case-insensitively',
    'classify returns the canonical label and raises ValueError when the reply matches none',
    'extract_json slices from the first "{" to the last "}" before json.loads to tolerate surrounding prose',
    'extract_json raises ValueError on invalid JSON or any missing required key',
    'classify and extract_json pass **kw through to call_with_retry',
    'no real network/SDK calls anywhere',
  ],
  hints: [
    'build_messages: msgs = [{"role": "system", "content": system}]; for u, a in examples or []: msgs += [{"role": "user", "content": u}, {"role": "assistant", "content": a}]; msgs.append({"role": "user", "content": user}).',
    'retry: for i in range(attempts): try: return client.complete(...) except (RateLimitError, ServerError) as e: last = e; sleep(base_delay * 2 ** i). After loop: raise last.',
    'classify system prompt: f"Reply with exactly one of: {\\", \\".join(labels)}. Nothing else."',
    'validation: lut = {l.lower(): l for l in labels}; key = reply.strip().lower(); if key not in lut: raise ValueError.',
    'extract_json: s = reply[reply.index("{"): reply.rindex("}") + 1]; data = json.loads(s); missing = [k for k in required_keys if k not in data].',
  ],
},
}
