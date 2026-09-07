// Part III — Data Handling & Visualization
// Chapter 306: Data Visualization & EDA

import type { QuizQuestion } from '../../src/data/curriculum'

export const courseId = 'python-for-ai'

export const content: Record<string, string> = {

'306.1': `# Matplotlib Fundamentals

You cannot understand a dataset you have not looked at, and you cannot debug a model whose loss curve you have not plotted. Matplotlib is the base plotting library for Python; pandas and seaborn both draw on top of it, so learning its model pays off everywhere.

## The two interfaces

Matplotlib has a MATLAB-style **pyplot** interface and an **object-oriented** interface. Use the object-oriented one — it is explicit and scales to multi-panel figures.

\`\`\`python
import matplotlib.pyplot as plt

fig, ax = plt.subplots(figsize=(8, 4))
ax.plot(epochs, train_loss, label="train")
ax.plot(epochs, val_loss, label="val")
ax.set_xlabel("epoch")
ax.set_ylabel("loss")
ax.set_title("Training curve")
ax.legend()
ax.grid(True, alpha=0.3)
fig.tight_layout()
plt.show()          # or fig.savefig("curve.png", dpi=150)
\`\`\`

- **Figure** — the whole canvas.
- **Axes** — one plot (has its own x/y axis, title, data). A figure can hold many.
- You call methods on \`ax\`, not on \`plt\`.

## The plot types you will actually use

| Method | Shows | AI use |
|---|---|---|
| \`ax.plot(x, y)\` | line | loss/metric curves, learning rate schedules |
| \`ax.scatter(x, y, c=..., s=...)\` | points | feature relationships, 2-D embeddings (t-SNE/UMAP) |
| \`ax.hist(x, bins=50)\` | distribution | target balance, feature ranges, activation stats |
| \`ax.bar(labels, heights)\` | categories | class counts, feature importances |
| \`ax.imshow(matrix)\` | heatmap/image | confusion matrices, attention maps, filters |
| \`ax.boxplot / ax.violinplot\` | distribution by group | metric spread across runs or classes |
| \`ax.errorbar(x, y, yerr=...)\` | value ± uncertainty | mean ± std over seeds |

## Multi-panel figures

\`\`\`python
fig, axes = plt.subplots(2, 2, figsize=(10, 8))
axes[0, 0].hist(df["age"], bins=30)
axes[0, 1].scatter(df["age"], df["income"], alpha=0.3)
axes[1, 0].plot(history["loss"])
axes[1, 1].imshow(confusion, cmap="Blues")
for ax, name in zip(axes.flat, ["age", "age vs income", "loss", "confusion"]):
    ax.set_title(name)
fig.tight_layout()
\`\`\`

\`axes\` is a NumPy array of Axes; \`.flat\` iterates them in reading order.

## Plotting straight from pandas

\`\`\`python
df["age"].plot.hist(bins=30, ax=ax)
df.plot.scatter(x="age", y="income", ax=ax)
df.groupby("plan")["revenue"].mean().plot.bar(ax=ax)
df.set_index("date")["price"].plot(ax=ax)          # time series
\`\`\`

pandas returns the \`ax\` so you can keep customising it.

## Showing images and matrices

\`\`\`python
ax.imshow(img_array)                 # (H, W, 3) RGB or (H, W) grayscale
ax.imshow(weights, cmap="RdBu", vmin=-1, vmax=1)
fig.colorbar(ax.imshow(cm, cmap="Blues"), ax=ax)
ax.axis("off")                       # hide axes for images

# a grid of sample images
fig, axes = plt.subplots(2, 5, figsize=(12, 5))
for ax, img, label in zip(axes.flat, images[:10], labels[:10]):
    ax.imshow(img, cmap="gray")
    ax.set_title(str(label))
    ax.axis("off")
\`\`\`

## Habits that make plots useful

1. **Always label axes and give a title.** An unlabelled plot is a puzzle in a week.
2. **Use \`alpha\`** (0.2–0.5) for scatter plots with many points, or they become a solid blob (overplotting).
3. **Log scale** for skewed data: \`ax.set_yscale("log")\` — essential for loss curves and long-tailed distributions.
4. **Share axes** for comparisons: \`plt.subplots(1, 2, sharey=True)\`.
5. **Close figures in loops**: \`plt.close(fig)\` after saving, or memory leaks in long training runs.
6. **In notebooks**, plots render automatically; in scripts you need \`plt.show()\` or \`savefig\`.
7. **Save vector** (\`.svg\`/\`.pdf\`) for reports, **PNG at \`dpi=150\`** for quick sharing.

## Reading a loss curve

- Train down, val down, small gap → healthy.
- Train down, val flat or rising → overfitting; regularise, get more data, stop earlier.
- Both flat and high → underfitting or a bug; increase capacity/LR, check the data pipeline.
- Spiky/exploding → learning rate too high, or missing gradient clipping.
`,
}

export const quiz: Record<string, QuizQuestion[]> = {

'306.2': [
  {
    question: 'seaborn is built on top of which library, and what does that mean in practice?',
    options: [
      'plotly — seaborn plots are interactive by default',
      'matplotlib — seaborn creates matplotlib Figures/Axes you can further customise with ax methods',
      'pandas — seaborn only works on DataFrames and returns DataFrames',
      'NumPy — seaborn returns arrays of pixel data',
    ],
    correctIndex: 1,
    explanation: 'seaborn is a high-level interface over matplotlib. Its functions return matplotlib Axes (or a FacetGrid wrapping them), so you can still call ax.set_title, ax.set_xlim, fig.savefig, etc.',
  },
  {
    question: 'What is the main advantage of seaborn over raw matplotlib for exploratory data analysis?',
    options: [
      'It renders faster',
      'It works directly with DataFrame columns and produces statistically-aware plots (distributions, regressions, categorical splits, correlation heatmaps) in one line',
      'It is the only way to make scatter plots in Python',
      'It does not require importing matplotlib',
    ],
    correctIndex: 1,
    explanation: 'seaborn takes a DataFrame plus column names (x=, y=, hue=) and handles aggregation, confidence intervals, and faceting automatically, so common EDA charts need far less code than matplotlib.',
  },
  {
    question: 'Which seaborn function gives you a quick overview of pairwise relationships and per-feature distributions across a small dataset?',
    options: ['sns.lineplot', 'sns.pairplot', 'sns.barplot', 'sns.kdeplot'],
    correctIndex: 1,
    explanation: 'sns.pairplot(df, hue="target") draws a scatter matrix for every pair of numeric columns with histograms/KDEs on the diagonal — a fast first look at structure and class separation.',
  },
  {
    question: 'You call `sns.heatmap(df.corr(), annot=True, cmap="coolwarm")`. What are you visualising?',
    options: [
      'The raw data values of df as a colour grid',
      'The pairwise correlation coefficients between numeric columns, with values printed in each cell',
      'A confusion matrix of predictions vs labels',
      'The missing-value pattern of df',
    ],
    correctIndex: 1,
    explanation: 'df.corr() produces a square correlation matrix; heatmap colours each cell by coefficient and annot=True writes the number. It reveals redundant features and strong predictors at a glance.',
  },
  {
    question: 'When overlaying groups with `hue="class"` on a scatter or KDE plot, what should you watch for with large datasets?',
    options: [
      'seaborn cannot handle more than two groups',
      'Overplotting — dense points hide structure; reduce alpha, subsample, or use a 2D histogram / hexbin instead',
      'hue only works with numeric columns',
      'The legend is always wrong',
    ],
    correctIndex: 1,
    explanation: 'With many overlapping points, colour-by-group becomes an unreadable blob. Lower alpha, sample the data, or switch to sns.histplot(..., bins=...) / plt.hexbin for density.',
  },
],

'306.3': [
  {
    question: 'What is the primary goal of exploratory data analysis (EDA) before modelling?',
    options: [
      'To achieve the highest possible model accuracy',
      'To understand the data\'s structure, quality, distributions, relationships, and problems so you can make informed modelling and cleaning decisions',
      'To produce publication-quality figures',
      'To reduce the dataset size',
    ],
    correctIndex: 1,
    explanation: 'EDA is about building an accurate mental model of the data: what each column means, how it is distributed, what is missing or wrong, which features relate to the target, and what could leak. Modelling decisions follow from it.',
  },
  {
    question: 'During EDA you find that one feature is almost perfectly correlated with the target (r = 0.99). What is the responsible first reaction?',
    options: [
      'Celebrate — the modelling is basically done',
      'Be suspicious of leakage: check whether that feature is actually available at prediction time or is a proxy/derivative of the target',
      'Immediately drop the feature',
      'Duplicate the feature to strengthen the signal',
    ],
    correctIndex: 1,
    explanation: 'A near-perfect single-feature predictor usually means target leakage — the feature encodes the answer (e.g. "days_until_churn" predicting "churned"), or was computed after the outcome. Verify it exists at inference time before trusting it.',
  },
  {
    question: 'Why check the distribution of the target variable early in EDA for a classification problem?',
    options: [
      'It determines the programming language to use',
      'Class imbalance (e.g. 98% negative) changes metric choice (accuracy becomes misleading), may require resampling or class weights, and affects the train/test split strategy',
      'The target distribution must always be uniform or the data is invalid',
      'It is only relevant for regression',
    ],
    correctIndex: 1,
    explanation: 'If 98% of rows are one class, a model predicting that class always gets 98% accuracy while being useless. Knowing the balance upfront tells you to use precision/recall/F1/AUC, stratify the split, and consider class weights.',
  },
  {
    question: 'Which combination of plots best characterises a single numeric feature during EDA?',
    options: [
      'A pie chart and a line plot',
      'A histogram/KDE (shape, skew, modality) plus a boxplot (median, spread, outliers), and its relationship to the target via a scatter or grouped boxplot',
      'Only a bar chart of its mean',
      'A heatmap of the raw values',
    ],
    correctIndex: 1,
    explanation: 'A histogram shows the distribution shape; a boxplot summarises central tendency and flags outliers; plotting the feature against the target shows whether it carries predictive signal. Together they characterise the feature.',
  },
  {
    question: 'You compute summary statistics and see a numeric column with min = 0, max = 999, and a huge spike of exactly 999 values. What is the likely explanation?',
    options: [
      'The data is perfectly clean',
      '999 is probably a sentinel/placeholder for "missing" or "unknown" that was never converted to NaN',
      'The column should be dropped without investigation',
      'The maximum is always an outlier and should be clipped',
    ],
    correctIndex: 1,
    explanation: 'Legacy datasets often encode missing values as 999, -1, 9999, or similar. A suspicious pile-up at a round extreme value means you should convert it to NaN and handle it as missing, not treat it as a real measurement.',
  },
],
}

export const codingTask: Record<string, {
  instructions: string; boilerplate: string; rubric: string[]; hints: string[]
}> = {

'306.1': {
  instructions: `Implement \`plots.py\` — reusable plotting helpers for model diagnostics. Every function takes an optional \`ax\` and **returns the Axes** it drew on, creating a new one with \`plt.subplots()\` only when \`ax is None\`. Use the object-oriented API (\`ax.plot\`, not \`plt.plot\`). Do not call \`plt.show()\`.

1. \`plot_learning_curve(history: dict, ax=None)\` — \`history\` has keys \`"train_loss"\` and \`"val_loss"\`, each a list of floats (same length). Plot both against epoch index (starting at 1), label them \`"train"\` / \`"val"\`, set xlabel \`"epoch"\`, ylabel \`"loss"\`, title \`"Learning curve"\`, add a legend and a light grid (\`alpha=0.3\`). Return \`ax\`.

2. \`plot_class_balance(labels, ax=None)\` — \`labels\` is a sequence of class labels. Draw a bar chart of counts per class, x-axis sorted by label, xlabel \`"class"\`, ylabel \`"count"\`, title \`"Class balance"\`. Return \`ax\`.

3. \`plot_confusion(cm: np.ndarray, class_names: list[str], ax=None)\` — \`cm\` is a square count matrix. Show it with \`ax.imshow(cm, cmap="Blues")\`, tick labels = \`class_names\` on both axes, xlabel \`"predicted"\`, ylabel \`"actual"\`, and write each count as text centered in its cell. Return \`ax\`.

4. \`save_grid(images, labels, path: str, ncols: int = 5)\` — arrange \`images\` (list of 2-D arrays) in a grid with \`ncols\` columns and \`ceil(n/ncols)\` rows, each subplot showing the image (\`cmap="gray"\`) titled with its label and axes hidden. Save to \`path\` with \`dpi=150\` and \`bbox_inches="tight"\`, then close the figure. Return the \`path\`.

Acceptance criteria:
- functions create a figure only when \`ax\` is None and always return the Axes (save_grid returns the path)
- no \`plt.show()\`; \`save_grid\` calls \`plt.close(fig)\`
- confusion cells display the integer counts
- learning curve x-axis starts at epoch 1, not 0`,
  boilerplate: `"""Matplotlib diagnostic plotting helpers."""
from math import ceil

import matplotlib.pyplot as plt
import numpy as np


def _get_ax(ax):
    if ax is None:
        _, ax = plt.subplots(figsize=(7, 4))
    return ax


def plot_learning_curve(history: dict, ax=None):
    ax = _get_ax(ax)
    # TODO: epochs = range(1, len(history["train_loss"]) + 1)
    raise NotImplementedError


def plot_class_balance(labels, ax=None):
    ax = _get_ax(ax)
    # TODO: Counter(labels); sorted keys; ax.bar
    raise NotImplementedError


def plot_confusion(cm: np.ndarray, class_names: list[str], ax=None):
    ax = _get_ax(ax)
    # TODO: imshow + tick labels + per-cell text
    raise NotImplementedError


def save_grid(images, labels, path: str, ncols: int = 5):
    # TODO: subplots grid; imshow each; savefig; close
    raise NotImplementedError
`,
  rubric: [
    'each plot function creates a figure only when ax is None and returns the Axes',
    'plot_learning_curve plots train and val against epochs starting at 1 with legend, labels, title, grid alpha=0.3',
    'plot_class_balance draws a bar chart of per-class counts with classes sorted on the x-axis',
    'plot_confusion uses ax.imshow with cmap="Blues" and sets tick labels to class_names on both axes',
    'plot_confusion writes each integer count as centered cell text',
    'plot_confusion sets xlabel "predicted" and ylabel "actual"',
    'save_grid lays images out in ncols columns and ceil(n/ncols) rows with hidden axes and per-image titles',
    'save_grid saves with dpi=150, bbox_inches="tight", then calls plt.close(fig) and returns path',
    'no function calls plt.show()',
  ],
  hints: [
    'epochs = range(1, len(history["train_loss"]) + 1); ax.plot(epochs, history["train_loss"], label="train").',
    'from collections import Counter; c = Counter(labels); keys = sorted(c); ax.bar([str(k) for k in keys], [c[k] for k in keys]).',
    'confusion text: for i in range(n): for j in range(n): ax.text(j, i, str(cm[i, j]), ha="center", va="center").',
    'ticks: ax.set_xticks(range(len(class_names))); ax.set_xticklabels(class_names).',
    'grid: nrows = ceil(len(images) / ncols); fig, axes = plt.subplots(nrows, ncols, figsize=(2*ncols, 2*nrows)); iterate np.atleast_1d(axes).flat.',
  ],
},
}
