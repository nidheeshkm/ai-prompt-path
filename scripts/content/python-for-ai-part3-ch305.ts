// Part III — Data Handling & Visualization
// Chapter 305: pandas for Data Wrangling

import type { QuizQuestion } from '../../src/data/curriculum'

export const courseId = 'python-for-ai'

export const content: Record<string, string> = {

'305.1': `# Series, DataFrames & Reading Data

Before a model sees data, someone has to load it, inspect it, and shape it. That someone is you, and the tool is **pandas**. Real datasets arrive as CSV, JSON, Parquet, or database rows — messy, mixed-type, full of gaps. pandas is how you turn them into clean numeric arrays.

## The two core objects

**Series** — a 1-D labelled array (one column):

\`\`\`python
import pandas as pd

s = pd.Series([10, 20, 30], index=["a", "b", "c"], name="score")
s["b"]          # 20
s.mean(), s.max(), s.std()
s * 2           # vectorised, like NumPy
\`\`\`

**DataFrame** — a 2-D table: an ordered dict of Series sharing one index (the row labels).

\`\`\`python
df = pd.DataFrame({
    "user_id": [1, 2, 3],
    "age": [25, 32, 47],
    "plan": ["free", "pro", "free"],
})
\`\`\`

Every column has its own dtype. The **index** labels rows; it defaults to \`0..n-1\` but can be dates, IDs, or a multi-level structure.

## Reading data

\`\`\`python
df = pd.read_csv("data.csv")
df = pd.read_csv("data.csv", parse_dates=["created_at"], dtype={"zip": str})
df = pd.read_json("records.json")           # or lines=True for JSONL
df = pd.read_parquet("data.parquet")        # columnar, fast, typed — preferred for big data
df = pd.read_sql("SELECT * FROM events", conn)
df = pd.read_excel("sheet.xlsx", sheet_name="Q3")
\`\`\`

Useful \`read_csv\` arguments: \`usecols=[...]\` (load only some columns), \`nrows=1000\` (peek), \`na_values=["NA", "-"]\`, \`sep="\\t"\`, \`encoding="latin-1"\`, \`chunksize=100_000\` (iterate a huge file).

Writing: \`df.to_csv("out.csv", index=False)\`, \`df.to_parquet("out.parquet")\`.

## First-look ritual — always run this

\`\`\`python
df.shape            # (rows, columns)
df.head(10)         # first rows
df.tail()           # last rows
df.sample(5)        # random rows — better sense of "typical" than head
df.info()           # dtypes, non-null counts, memory — spot missing data & wrong types
df.describe()       # count/mean/std/min/quartiles/max for numeric columns
df.describe(include="object")   # top/freq for text columns
df.columns.tolist()
df.dtypes
df["plan"].value_counts(dropna=False)   # category distribution
df.isna().sum()     # missing values per column
df.nunique()        # distinct values per column
\`\`\`

\`df.info()\` and \`df.isna().sum()\` on the first day save you from training on silently broken data.

## Selecting columns and rows

\`\`\`python
df["age"]                     # one column -> Series
df[["age", "plan"]]           # multiple columns -> DataFrame
df.age                        # attribute access (only if the name is a valid identifier)

df.iloc[0]                    # first row by position
df.iloc[0:5, 0:2]             # positional slice, like NumPy
df.loc[10]                    # row with index label 10
df.loc[df["age"] > 30, "plan"]   # label-based: boolean rows, named column
\`\`\`

Remember the pair: **\`.loc\` is label-based, \`.iloc\` is integer-position-based.** Mixing them up is the most common pandas confusion.

## dtypes and memory

| pandas dtype | Meaning |
|---|---|
| \`int64\` / \`float64\` | numbers; \`float64\` if any NaN present |
| \`object\` | usually Python strings (or mixed) — slow |
| \`category\` | repeated labels stored as integers — big memory win |
| \`datetime64[ns]\` | timestamps — enables \`.dt\` accessor |
| \`bool\` | true/false |
| \`string\` | dedicated string dtype (newer) |

Convert once, early: \`df["plan"] = df["plan"].astype("category")\`, \`df["ts"] = pd.to_datetime(df["ts"])\`, \`df["count"] = pd.to_numeric(df["count"], errors="coerce")\`.

## To NumPy, for the model

When the DataFrame is clean:

\`\`\`python
X = df[feature_cols].to_numpy(dtype="float32")
y = df["target"].to_numpy()
\`\`\`

That hand-off — tidy DataFrame in, NumPy array out — is the boundary between data wrangling and modelling.
`,

'305.2': `# Selection, Filtering, apply & GroupBy

## Boolean filtering

Same idea as NumPy masks, with column names:

\`\`\`python
df[df["age"] > 30]
df[(df["age"] > 30) & (df["plan"] == "pro")]      # & | ~, parenthesise each term
df[df["country"].isin(["US", "CA", "UK"])]
df[df["email"].str.endswith("@gmail.com")]
df[df["name"].str.contains("smith", case=False, na=False)]
df[df["score"].between(0.2, 0.8)]
df.query("age > 30 and plan == 'pro'")            # string form, often more readable
\`\`\`

\`.str\` is an accessor exposing vectorised string methods (\`.lower()\`, \`.strip()\`, \`.split()\`, \`.replace()\`, \`.len()\`, regex \`.extract()\`). \`.dt\` does the same for datetimes (\`.year\`, \`.dayofweek\`, \`.hour\`, \`.floor("D")\`).

## Creating and transforming columns

\`\`\`python
df["age_years"] = df["age_days"] / 365.25
df["is_adult"] = df["age"] >= 18
df["bucket"] = pd.cut(df["age"], bins=[0, 18, 35, 65, 200],
                      labels=["minor", "young", "adult", "senior"])
df["log_income"] = np.log1p(df["income"])
df = df.assign(ratio=lambda d: d["clicks"] / d["impressions"])   # chainable
\`\`\`

Prefer vectorised expressions and \`np.where\` / \`.map\` / \`pd.cut\` over row-wise loops.

## map, apply, applymap

| Method | Operates on | Use |
|---|---|---|
| \`Series.map(func_or_dict)\` | each value of one column | recode categories, lookups |
| \`Series.apply(func)\` | each value | when \`map\` isn't enough |
| \`DataFrame.apply(func, axis=0)\` | each column | column-wise aggregation |
| \`DataFrame.apply(func, axis=1)\` | each row (slow!) | last resort for multi-column logic |

\`\`\`python
df["plan_price"] = df["plan"].map({"free": 0, "pro": 20, "team": 50})
df["domain"] = df["email"].apply(lambda e: e.split("@")[1])
\`\`\`

\`df.apply(..., axis=1)\` runs a Python function per row and is often 100x slower than a vectorised alternative. Use it only when nothing else works, and on small data.

## GroupBy — split, apply, combine

The single most important analytical operation. Split rows into groups, compute something per group, combine the results.

\`\`\`python
df.groupby("plan")["revenue"].mean()
df.groupby("plan")["revenue"].agg(["mean", "sum", "count"])
df.groupby(["country", "plan"])["revenue"].sum()

# named aggregations -> clean column names
df.groupby("plan").agg(
    avg_rev=("revenue", "mean"),
    users=("user_id", "nunique"),
    churn_rate=("churned", "mean"),
)

# transform: broadcast a per-group stat back to every row (for feature engineering)
df["rev_vs_group_avg"] = df["revenue"] / df.groupby("plan")["revenue"].transform("mean")

# filter whole groups
big = df.groupby("plan").filter(lambda g: len(g) >= 100)
\`\`\`

\`value_counts\`, \`crosstab\`, and \`pivot_table\` are groupby in disguise:

\`\`\`python
pd.crosstab(df["country"], df["plan"], normalize="index")
df.pivot_table(index="country", columns="plan", values="revenue", aggfunc="mean")
\`\`\`

## Sorting and ranking

\`\`\`python
df.sort_values("score", ascending=False)
df.sort_values(["country", "score"], ascending=[True, False])
df.nlargest(10, "revenue")           # faster than sort + head
df["rank"] = df.groupby("country")["score"].rank(method="dense", ascending=False)
\`\`\`

## Method chaining

Readable pipelines without intermediate variables:

\`\`\`python
result = (
    df
    .query("status == 'active'")
    .assign(month=lambda d: d["created_at"].dt.to_period("M"))
    .groupby("month")
    .agg(signups=("user_id", "count"), revenue=("revenue", "sum"))
    .reset_index()
    .sort_values("month")
)
\`\`\`
`,

'305.3': `# Cleaning Data: Missing Values, Types & Duplicates

Real data is dirty. Models are not robust to \`NaN\`, wrong dtypes, or duplicated rows — cleaning is not optional preprocessing, it *is* most of the work.

## Missing data

pandas represents missing as \`NaN\` (float), \`None\`, or \`NaT\` (datetime).

\`\`\`python
df.isna().sum()                       # count per column
df.isna().mean().sort_values()        # fraction missing per column
df[df["income"].isna()]               # inspect the rows — is the missingness random?
\`\`\`

**Understand *why* it's missing before you fill it.** "Missing" can mean "not applicable," "not collected," or "zero." Each implies a different fix.

### Options

\`\`\`python
# 1. Drop
df.dropna()                           # any NaN in the row
df.dropna(subset=["target"])          # only if the label is missing — usually right
df.dropna(axis=1, thresh=int(0.5*len(df)))   # drop columns >50% empty

# 2. Fill with a constant / statistic
df["age"] = df["age"].fillna(df["age"].median())      # robust to outliers
df["plan"] = df["plan"].fillna("unknown")
df["balance"] = df["balance"].fillna(0)

# 3. Fill by group (better than a global statistic)
df["age"] = df["age"].fillna(df.groupby("country")["age"].transform("median"))

# 4. Time series: carry forward / interpolate
df["price"] = df["price"].ffill()
df["temp"] = df["temp"].interpolate(method="linear")

# 5. Add a "was missing" flag before filling — often predictive
df["age_missing"] = df["age"].isna().astype(int)
\`\`\`

For proper ML, fit imputation on the **training set only** (e.g. \`sklearn.impute.SimpleImputer\`) and apply the same values to validation/test — computing the median over the whole dataset leaks information.

## Fixing dtypes

\`\`\`python
df["amount"] = (df["amount"].str.replace("$", "", regex=False)
                            .str.replace(",", "")
                            .astype(float))
df["date"] = pd.to_datetime(df["date"], format="%Y-%m-%d", errors="coerce")
df["qty"] = pd.to_numeric(df["qty"], errors="coerce")     # bad values -> NaN
df["active"] = df["active"].map({"Y": True, "N": False, "yes": True, "no": False})
df["category"] = df["category"].astype("category")
\`\`\`

\`errors="coerce"\` turns unparseable values into \`NaN\` instead of raising — then you \`isna()\` to see how many failed.

## Text normalisation

\`\`\`python
df["name"] = df["name"].str.strip().str.title()
df["city"] = df["city"].str.lower().str.replace(r"\\s+", " ", regex=True)
df["code"] = df["code"].str.upper().str.zfill(5)
# unify known variants
df["state"] = df["state"].replace({"calif.": "CA", "california": "CA"})
\`\`\`

## Duplicates

\`\`\`python
df.duplicated().sum()                          # fully identical rows
df[df.duplicated(subset=["email"], keep=False)]   # all rows sharing an email
df = df.drop_duplicates(subset=["email"], keep="last")
\`\`\`

Duplicates inflate metrics and, if they straddle a train/test split, cause leakage.

## Outliers

\`\`\`python
q1, q3 = df["value"].quantile([0.25, 0.75])
iqr = q3 - q1
mask = df["value"].between(q1 - 1.5*iqr, q3 + 1.5*iqr)
df_clipped = df.copy()
df_clipped["value"] = df["value"].clip(q1 - 1.5*iqr, q3 + 1.5*iqr)   # winsorise
\`\`\`

Don't delete outliers reflexively — a fraud label or a sensor fault may be the signal.

## SettingWithCopyWarning

\`\`\`python
subset = df[df["age"] > 30]
subset["flag"] = 1          # WARNING: subset may be a view or a copy
\`\`\`

Fix by being explicit: \`subset = df[df["age"] > 30].copy()\`, or edit the original with \`df.loc[df["age"] > 30, "flag"] = 1\`.

## A cleaning checklist

1. \`df.info()\` / \`df.describe()\` / \`df.isna().mean()\`
2. Fix dtypes (dates, numerics, categories)
3. Handle missing values deliberately (drop label-missing; impute the rest; add flags)
4. Normalise text / unify categories
5. Drop or key-dedupe duplicates
6. Decide on outliers
7. Re-inspect, then hand off to NumPy
`,

'305.4': `# Merging, Joining, Pivoting & Time Series

Data rarely lives in one table. Combining sources correctly — without silently dropping or duplicating rows — is a skill that separates reliable pipelines from subtly broken ones.

## Concatenating

Stack tables with the same columns (e.g. monthly files):

\`\`\`python
df = pd.concat([jan, feb, mar], ignore_index=True)      # rows
wide = pd.concat([features, extra_features], axis=1)     # columns (align on index!)
\`\`\`

## Merging (SQL-style joins)

\`\`\`python
merged = pd.merge(orders, customers, on="customer_id", how="left")
merged = orders.merge(customers, left_on="cust", right_on="id", how="inner")
\`\`\`

| \`how\` | Keeps |
|---|---|
| \`"inner"\` | only keys present in **both** (default) |
| \`"left"\` | all rows of the left table (lookups, enrichment) |
| \`"right"\` | all rows of the right table |
| \`"outer"\` | union of keys, NaN where unmatched |

**Always check row counts and key uniqueness before and after.** If the right table has duplicate keys, a "lookup" merge multiplies your rows (a fan-out). Guardrails:

\`\`\`python
before = len(orders)
merged = orders.merge(customers, on="customer_id", how="left", validate="many_to_one")
assert len(merged) == before, "merge changed row count — duplicate keys on the right?"
merged["_merge"] = merged.merge(..., indicator=True)["_merge"]   # see match status
\`\`\`

\`validate=\` (\`"one_to_one"\`, \`"one_to_many"\`, \`"many_to_one"\`) makes pandas raise if the relationship isn't what you expect — use it.

## Join on the index

\`\`\`python
a.join(b, how="left")                    # aligns on index
df.set_index("date").join(rates.set_index("date"))
\`\`\`

## Reshaping: long ↔ wide

**Wide → long** (\`melt\`) — one row per observation, needed for most plotting and modelling:

\`\`\`python
long = df.melt(id_vars=["user_id"], value_vars=["jan", "feb", "mar"],
               var_name="month", value_name="spend")
\`\`\`

**Long → wide** (\`pivot\` / \`pivot_table\`) — one row per entity, columns per category:

\`\`\`python
wide = long.pivot_table(index="user_id", columns="month", values="spend", aggfunc="sum")
\`\`\`

\`stack\` / \`unstack\` do the same by moving levels between the index and columns.

## Time series

\`\`\`python
df["ts"] = pd.to_datetime(df["ts"])
df = df.set_index("ts").sort_index()

df.loc["2024-03"]                       # partial-string slice: all of March 2024
df.loc["2024-01":"2024-06"]

# resampling — change the frequency
df["amount"].resample("D").sum()        # daily totals
df["amount"].resample("W").mean()       # weekly average
df["amount"].resample("MS").agg(["sum", "count"])

# rolling windows — moving averages, volatility
df["ma7"] = df["amount"].rolling(window=7, min_periods=1).mean()
df["std30"] = df["amount"].rolling(30).std()
df["cummax"] = df["amount"].cummax()

# lag / lead features for forecasting
df["prev_day"] = df["amount"].shift(1)
df["pct_change"] = df["amount"].pct_change()
df["dayofweek"] = df.index.dayofweek
\`\`\`

### The leakage trap in time-series features

Any feature that uses future information relative to the prediction time leaks. Rolling and \`shift(1)\` are safe (they look back); a global \`mean\`, a \`shift(-1)\`, or a train/test split that isn't chronological is not. For temporal data, split by **time**, not randomly.

## Categorical encoding for models

\`\`\`python
X = pd.get_dummies(df, columns=["plan", "country"], drop_first=True)   # one-hot
df["plan_code"] = df["plan"].astype("category").cat.codes              # ordinal codes
\`\`\`

For high-cardinality categories (user IDs, zip codes), one-hot explodes the column count; use target/frequency encoding or embeddings instead — and, again, fit the encoding on training data only.
`,
}

export const quiz: Record<string, QuizQuestion[]> = {

'305.3': [
  {
    question: 'When preparing an ML dataset, why should you compute an imputation value (e.g. median age) on the training set only, not the full dataset?',
    options: [
      'It runs faster on a smaller set',
      'Using the full dataset lets information from the validation/test rows influence preprocessing, which leaks and inflates your reported performance',
      'The median of the full dataset is mathematically invalid',
      'pandas does not allow it',
    ],
    correctIndex: 1,
    explanation: 'Any statistic computed over data that includes the test set (means, medians, scalers, encoders) leaks test information into training. Fit imputers/scalers on train, then apply the stored values to val/test.',
  },
  {
    question: 'What does `pd.to_numeric(df["qty"], errors="coerce")` do with a value like "abc"?',
    options: [
      'Raises a ValueError and stops',
      'Leaves it as the string "abc"',
      'Converts it to NaN, so you can then count and inspect the failures',
      'Converts it to 0',
    ],
    correctIndex: 2,
    explanation: 'errors="coerce" replaces unparseable values with NaN instead of raising. You then use isna().sum() to quantify how many rows failed and decide what to do.',
  },
  {
    question: 'You write `subset = df[df.age > 30]` then `subset["flag"] = 1` and get a SettingWithCopyWarning. What is the correct fix if you intend to modify a standalone subset?',
    options: [
      'Ignore the warning; the assignment always works',
      'Use `subset = df[df.age > 30].copy()` so subset is explicitly independent',
      'Disable the warning globally with pd.set_option',
      'Use `subset = df[df.age > 30][:]`',
    ],
    correctIndex: 1,
    explanation: 'The warning fires because pandas cannot tell if subset is a view or a copy, so the write may or may not touch df. Add .copy() for an independent frame, or use df.loc[mask, "flag"] = 1 to edit the original deliberately.',
  },
  {
    question: 'Why is adding a column like `df["age_missing"] = df["age"].isna().astype(int)` before filling the NaNs often useful?',
    options: [
      'It is required by pandas before fillna works',
      'The fact that a value was missing can itself be predictive, and the flag preserves that signal after imputation hides it',
      'It makes the imputation more accurate',
      'It prevents the column from being dropped',
    ],
    correctIndex: 1,
    explanation: 'Missingness is frequently informative (e.g. users who skip an income field differ systematically). Once you impute, that signal is gone unless you captured it in an indicator column.',
  },
  {
    question: 'Which `dropna` call is usually the safest default for a supervised ML dataset?',
    options: [
      'df.dropna() — drop any row with any missing value',
      'df.dropna(subset=[target_column]) — drop only rows missing the label, then impute features',
      'df.dropna(axis=1) — drop every column with a missing value',
      'Never drop anything',
    ],
    correctIndex: 1,
    explanation: 'A row with no label is unusable for supervised learning, so dropping those is reasonable. Dropping every row with any missing feature can discard most of your data; impute features instead.',
  },
],

'305.4': [
  {
    question: 'You do a "left merge" of an orders table with a customers lookup table on customer_id, expecting the row count to stay the same, but it grows. What is the most likely cause?',
    options: [
      'A left merge always increases row count',
      'The customers table has duplicate customer_id values, so each order matches multiple customer rows (a fan-out)',
      'The orders table has missing customer_id values',
      'pandas merged on the wrong column automatically',
    ],
    correctIndex: 1,
    explanation: 'If the right side is not unique on the join key, each left row matches several right rows and the result multiplies. Pass validate="many_to_one" to make pandas raise, and de-duplicate the lookup table.',
  },
  {
    question: 'Which reshaping operation converts a wide table (columns jan, feb, mar) into a long table with a "month" column and a "value" column?',
    options: ['df.pivot_table(...)', 'df.melt(id_vars=[...], value_vars=["jan","feb","mar"])', 'df.groupby("month")', 'df.T'],
    correctIndex: 1,
    explanation: 'melt unpivots wide columns into two columns (variable name and value), producing tidy long-format data. pivot/pivot_table does the reverse (long to wide).',
  },
  {
    question: 'For a time-series forecasting dataset, why must the train/test split be chronological rather than random?',
    options: [
      'Random splitting is slower',
      'A random split puts future rows in the training set, letting the model "see the future," which leaks and overstates real-world performance',
      'pandas cannot randomly split datetime-indexed data',
      'Chronological splits produce more balanced classes',
    ],
    correctIndex: 1,
    explanation: 'In deployment you only ever have past data to predict the future. A random split trains on future observations, so validation scores look great but do not reflect real forecasting ability. Split by a cutoff date.',
  },
  {
    question: 'What does `df["amount"].resample("W").sum()` require and produce (df is datetime-indexed)?',
    options: [
      'Requires a sorted datetime index; produces the sum of amount within each calendar week',
      'Produces a 7-row sample of the data',
      'Requires the amount column to be the index',
      'Produces a rolling 7-day average',
    ],
    correctIndex: 0,
    explanation: 'resample groups a datetime-indexed Series/DataFrame by a time frequency ("W" = weekly) and aggregates. It needs the datetime index (ideally sorted). Rolling windows are a different operation (.rolling).',
  },
  {
    question: 'What is the risk of `pd.get_dummies` on a high-cardinality column such as user_id?',
    options: [
      'It silently drops the column',
      'It creates one new column per distinct value, exploding the feature count and memory, and the rare categories carry almost no signal',
      'It converts the whole DataFrame to strings',
      'It always causes data leakage',
    ],
    correctIndex: 1,
    explanation: 'One-hot encoding adds a column per category. With thousands of IDs this creates a huge, sparse matrix. Prefer target/frequency encoding or learned embeddings for high-cardinality features.',
  },
],
}

export const codingTask: Record<string, {
  instructions: string; boilerplate: string; rubric: string[]; hints: string[]
}> = {

'305.1': {
  instructions: `Implement \`profiling.py\` — data-quality profiling helpers you run on every new dataset before modelling.

1. \`load_csv(path: str, date_cols: list[str] | None = None) -> pd.DataFrame\` — read a CSV, parsing \`date_cols\` as datetimes if given, and strip leading/trailing whitespace from all **object** (string) columns.

2. \`column_report(df: pd.DataFrame) -> pd.DataFrame\` — return a DataFrame indexed by column name with columns:
   - \`dtype\` — str
   - \`n_missing\` — int count of NaN
   - \`pct_missing\` — float, 0–100, rounded to 2 decimals
   - \`n_unique\` — int distinct non-null values
   - \`sample_value\` — the first non-null value in the column (or \`None\` if all null)
   Rows ordered by \`pct_missing\` descending.

3. \`suggest_drops(df: pd.DataFrame, missing_threshold: float = 60.0) -> list[str]\` — return the sorted list of column names whose missing percentage is \`>= missing_threshold\`, OR that are entirely constant (\`n_unique <= 1\` among non-null values).

4. \`to_model_matrix(df: pd.DataFrame, target: str) -> tuple[np.ndarray, np.ndarray, list[str]]\` — drop rows where \`target\` is NaN; select only numeric feature columns (exclude \`target\`); return \`(X_float32, y, feature_names)\` where \`X\` is \`float32\`, \`y\` is the target as a NumPy array, and \`feature_names\` is the list of columns used.

Acceptance criteria:
- \`load_csv\` strips whitespace only on object columns
- \`column_report\` is sorted by pct_missing descending and has exactly the 5 specified columns
- \`suggest_drops\` catches both high-missingness and constant columns, returns sorted unique names
- \`to_model_matrix\` never includes the target in X and drops target-NaN rows`,
  boilerplate: `"""Dataset profiling helpers."""
import numpy as np
import pandas as pd


def load_csv(path: str, date_cols: list[str] | None = None) -> pd.DataFrame:
    # TODO: pd.read_csv(..., parse_dates=date_cols or []); strip object columns
    raise NotImplementedError


def column_report(df: pd.DataFrame) -> pd.DataFrame:
    # TODO: build per-column stats, sort by pct_missing desc
    raise NotImplementedError


def suggest_drops(df: pd.DataFrame, missing_threshold: float = 60.0) -> list[str]:
    # TODO: high missingness OR constant
    raise NotImplementedError


def to_model_matrix(df: pd.DataFrame, target: str):
    # TODO: dropna(subset=[target]); numeric columns minus target; return X, y, names
    raise NotImplementedError
`,
  rubric: [
    'load_csv parses date_cols as datetime when provided',
    'load_csv strips whitespace only on object-dtype columns',
    'column_report returns a DataFrame indexed by column with dtype, n_missing, pct_missing, n_unique, sample_value',
    'column_report pct_missing is a 0-100 float rounded to 2 decimals',
    'column_report rows are sorted by pct_missing descending',
    'column_report sample_value is the first non-null value or None',
    'suggest_drops returns columns with pct_missing >= threshold',
    'suggest_drops also returns columns that are constant (<=1 unique non-null value)',
    'suggest_drops result is sorted and de-duplicated',
    'to_model_matrix drops rows with NaN target and excludes target from X',
    'to_model_matrix returns X as float32, y as ndarray, and the feature name list',
  ],
  hints: [
    'object columns: df.select_dtypes("object").columns, then df[c] = df[c].str.strip().',
    'pct_missing: round(df[c].isna().mean() * 100, 2).',
    'sample_value: s = df[c].dropna(); s.iloc[0] if len(s) else None.',
    'numeric features: df.select_dtypes(include="number").columns.difference([target]).',
    'Build column_report rows as a list of dicts then pd.DataFrame(rows).set_index("column").sort_values("pct_missing", ascending=False).',
  ],
},

'305.2': {
  instructions: `Implement \`aggregate.py\` — groupby-based feature engineering, the bread and butter of tabular ML.

1. \`group_summary(df, group_col, value_col) -> pd.DataFrame\` — return a DataFrame indexed by \`group_col\` with columns \`count\`, \`mean\`, \`median\`, \`std\`, \`min\`, \`max\` of \`value_col\` per group, sorted by \`mean\` descending. \`std\` of a size-1 group should be \`0.0\`, not NaN.

2. \`add_group_features(df, group_col, value_col) -> pd.DataFrame\` — return a **copy** of \`df\` with three new columns (do not mutate the input):
   - \`{value_col}_group_mean\` — the group mean broadcast to each row (use \`groupby(...).transform\`)
   - \`{value_col}_vs_group\` — \`value_col\` minus that group mean
   - \`{value_col}_group_rank\` — dense rank of \`value_col\` **within** its group, descending (1 = largest)

3. \`top_n_per_group(df, group_col, sort_col, n) -> pd.DataFrame\` — for each group, the \`n\` rows with the largest \`sort_col\`, concatenated, original columns preserved, index reset.

4. \`pivot_counts(df, row_col, col_col) -> pd.DataFrame\` — a contingency table: rows = distinct \`row_col\` values, columns = distinct \`col_col\` values, cells = row counts, missing combinations = 0 (int).

Acceptance criteria:
- \`group_summary\` fills std NaN (single-row groups) with 0.0 and sorts by mean desc
- \`add_group_features\` returns a copy; input df is unchanged; uses transform for the broadcast
- \`add_group_features\` rank is dense, descending, within group
- \`top_n_per_group\` returns at most n rows per group with a clean RangeIndex
- \`pivot_counts\` has no NaN and integer dtype`,
  boilerplate: `"""GroupBy aggregation and feature engineering."""
import pandas as pd


def group_summary(df: pd.DataFrame, group_col: str, value_col: str) -> pd.DataFrame:
    # TODO: groupby(group_col)[value_col].agg([...]); fillna std; sort by mean desc
    raise NotImplementedError


def add_group_features(df: pd.DataFrame, group_col: str, value_col: str) -> pd.DataFrame:
    out = df.copy()
    # TODO: transform("mean"); difference; groupby(...).rank(method="dense", ascending=False)
    raise NotImplementedError


def top_n_per_group(df: pd.DataFrame, group_col: str, sort_col: str, n: int) -> pd.DataFrame:
    # TODO: groupby(group_col, group_keys=False).apply(lambda g: g.nlargest(n, sort_col))
    raise NotImplementedError


def pivot_counts(df: pd.DataFrame, row_col: str, col_col: str) -> pd.DataFrame:
    # TODO: pd.crosstab(df[row_col], df[col_col])
    raise NotImplementedError
`,
  rubric: [
    'group_summary aggregates count/mean/median/std/min/max per group',
    'group_summary replaces NaN std (single-row groups) with 0.0',
    'group_summary is sorted by mean descending',
    'add_group_features does not mutate the input df (operates on a copy)',
    'add_group_features uses groupby(...).transform("mean") for the broadcast column',
    'add_group_features adds the vs-group difference column',
    'add_group_features rank is dense, descending, computed within each group',
    'top_n_per_group returns up to n highest-sort_col rows per group with reset index',
    'pivot_counts returns an integer contingency table with 0 for missing combinations',
  ],
  hints: [
    'agg = df.groupby(group_col)[value_col].agg(["count","mean","median","std","min","max"]).',
    'agg["std"] = agg["std"].fillna(0.0); agg.sort_values("mean", ascending=False).',
    'transform broadcasts: out[f"{value_col}_group_mean"] = out.groupby(group_col)[value_col].transform("mean").',
    'rank: out.groupby(group_col)[value_col].rank(method="dense", ascending=False).',
    'top_n: df.groupby(group_col, group_keys=False).apply(lambda g: g.nlargest(n, sort_col)).reset_index(drop=True).',
    'pivot_counts: pd.crosstab(df[row_col], df[col_col]) already fills 0 and is int.',
  ],
},
}
