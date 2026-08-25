export type ReviewMode = 'quick' | 'standard' | 'deep_dive'

export const REVIEW_MODE_KEY = 'promptpath_review_mode'
export const DEFAULT_REVIEW_MODE: ReviewMode = 'deep_dive'

export type ReviewModeConfig = {
  id: ReviewMode
  name: string
  tagline: string
  description: string
  approxOutputTokens: number
  features: string[]
  samplePassed: {
    headline: string
    bullets: string[]
    extra?: string
  }
  sampleFailed: {
    headline: string
    bullets: string[]
    extra?: string
  }
}

// Sample task used in all three mode previews:
//   two_sum(nums, target) — return indices of the two numbers that add to target.
//   Simple goal, but the efficient solution (dict / hash map) teaches O(1) lookup,
//   time complexity trade-offs, and a pattern that appears everywhere in real code.

export const REVIEW_MODES: ReviewModeConfig[] = [
  {
    id: 'quick',
    name: 'Quick Check',
    tagline: 'Fast pass/fail verdict',
    description: 'A rapid review that tells you if your code meets the rubric. Good for retrying quickly or when you want minimal reading.',
    approxOutputTokens: 250,
    features: ['Pass / fail verdict', 'Score', '2–3 bullet highlights', 'One-line hint on fail'],
    samplePassed: {
      headline: 'Passed — 88%',
      bullets: [
        '✓ Returns correct indices for all test cases',
        '✓ Uses a dictionary for O(n) lookup instead of nested loops',
        '✓ Handles the case where no solution exists by returning []',
      ],
    },
    sampleFailed: {
      headline: 'Not passed — 45%',
      bullets: [
        '✓ Function returns the right output format (a list of two indices)',
        '✗ Nested loop approach is O(n²) — the rubric requires an O(n) solution',
        '✗ No return value when no valid pair exists',
      ],
      extra: 'Tip: Try storing each number you\'ve seen in a dict and check if target - num is already in it.',
    },
  },
  {
    id: 'standard',
    name: 'Standard Review',
    tagline: 'Detailed feedback with guidance',
    description: 'Covers what you got right, what needs fixing, and a concept insight on pass. The right balance for most learners.',
    approxOutputTokens: 650,
    features: ['Pass / fail verdict', 'Score', 'What you got right', 'Specific improvements', 'Concept insight on pass', 'Targeted hint on fail'],
    samplePassed: {
      headline: 'Passed — 88%',
      bullets: [
        '✓ seen = {} correctly acts as a running memory of every number visited so far',
        '✓ complement = target - num is the right question: "what do I need to have already seen?"',
        '✓ Checking complement in seen before adding num prevents a number matching itself',
      ],
      extra: 'Concept: Python dict lookup runs in O(1) average time because dicts are hash tables — Python hashes each key to a memory bucket, so checking "is this key present?" is a direct jump, not a scan through the list.',
    },
    sampleFailed: {
      headline: 'Not passed — 45%',
      bullets: [
        '✓ Output format is correct — returning a list of two indices',
        '✗ The nested for loop checks every possible pair, making this O(n²). For 10,000 numbers that\'s 100,000,000 comparisons vs ~10,000 with a dict',
        '✗ If no valid pair exists the function returns None implicitly — callers can\'t tell if there\'s no solution or if you forgot to return',
      ],
      extra: 'Hint: Before the loop, create seen = {}. On each iteration compute complement = target - nums[i], check if complement in seen, and if not store seen[nums[i]] = i.',
    },
  },
  {
    id: 'deep_dive',
    name: 'Deep Dive',
    tagline: 'Step-by-step explanation of your code',
    description: 'On pass, explains exactly how your code works line by line and what\'s happening under the hood. On fail, breaks down each gap with why it matters and how to fix it.',
    approxOutputTokens: 1500,
    features: [
      'Pass / fail verdict',
      'Score',
      'Step-by-step code walkthrough (pass)',
      '"Under the hood" concept note (pass)',
      'Each gap: what\'s wrong + why it matters + how to fix (fail)',
      'Topics to revisit (fail)',
    ],
    samplePassed: {
      headline: 'Passed — 88%',
      bullets: [
        'Step 1 · Building the lookup table — seen = {} starts empty. As the loop runs, it fills up like a notebook: every number you visit gets written in with its index. This is the key insight — you\'re converting a "search problem" into a "lookup problem".',
        'Step 2 · Finding the complement — complement = target - num asks: "given what I\'m looking at right now, what number would complete the pair?" For target=9 and num=7, the answer is 2. You don\'t need to find both numbers at once — just ask what you\'re missing.',
        'Step 3 · O(1) lookup — if complement in seen is where the magic happens. Python dicts are hash tables: each key is passed through a hash function that converts it to a memory address. Checking membership is a direct jump to that address — not a scan. This is why it\'s O(1) regardless of how large seen gets.',
        'Step 4 · Returning in order — return [seen[complement], i] puts the complement\'s index first (it was seen earlier) and the current index second. This matches the expected output order.',
        'Step 5 · Delayed insert — seen[num] = i runs after the complement check, not before. This prevents num from matching itself when target is exactly double num (e.g. nums=[3,5], target=6).',
      ],
      extra: 'Under the hood: This is the "trade memory for speed" pattern — you spend O(n) extra space on the dict to cut time from O(n²) to O(n). The same idea powers database indexes, browser caches, and Python\'s own set type. Whenever you find yourself writing a nested loop to search, ask: "could a dict eliminate the inner loop?"',
    },
    sampleFailed: {
      headline: 'Not passed — 45%',
      bullets: [
        '✗ Nested loops instead of a hash map — Why it matters: for j in range(i+1, len(nums)) restarts the search from scratch for every element. With 10,000 numbers, that\'s up to 50,000,000 pair checks. The dict approach checks each number exactly once. How to fix: replace both loops with a single loop. Before it, write seen = {}. Inside, compute complement = target - nums[i]. If complement in seen: return [seen[complement], i]. Otherwise: seen[nums[i]] = i.',
        '✗ No fallback return — Why it matters: Python functions return None by default. If no pair exists, the caller receives None and likely crashes with "TypeError: cannot unpack non-iterable NoneType". How to fix: add return [] after the loop closes so callers always get a list they can safely check.',
      ],
      extra: 'Revisit: Python Dictionaries & Hash Tables · Time & Space Complexity (Big O) · Single-pass algorithms',
    },
  },
]

export function getReviewMode(): ReviewMode {
  if (typeof window === 'undefined') return DEFAULT_REVIEW_MODE
  const stored = localStorage.getItem(REVIEW_MODE_KEY)
  return (stored as ReviewMode) || DEFAULT_REVIEW_MODE
}

export function setReviewMode(mode: ReviewMode): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(REVIEW_MODE_KEY, mode)
}
