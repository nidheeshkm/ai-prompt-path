import type { Course } from '@/data/curriculum'

// Global prestige levels — domain-neutral (not tech/course specific).
// Meaningful level titles live on each Course's `levelTitles` array instead.
export const LEVELS = [
  { level: 1,  xpRequired: 0,     title: 'Starter' },
  { level: 2,  xpRequired: 300,   title: 'Explorer' },
  { level: 3,  xpRequired: 750,   title: 'Learner' },
  { level: 4,  xpRequired: 1500,  title: 'Achiever' },
  { level: 5,  xpRequired: 2500,  title: 'Specialist' },
  { level: 6,  xpRequired: 4000,  title: 'Veteran' },
  { level: 7,  xpRequired: 6000,  title: 'Expert' },
  { level: 8,  xpRequired: 8500,  title: 'Master' },
  { level: 9,  xpRequired: 10500, title: 'Champion' },
  { level: 10, xpRequired: 12350, title: 'Legend' },
]

export function getLevelForXp(xp: number) {
  let current = LEVELS[0]
  for (const lvl of LEVELS) {
    if (xp >= lvl.xpRequired) current = lvl
    else break
  }
  return current
}

export function getNextLevel(xp: number) {
  const current = getLevelForXp(xp)
  return LEVELS.find(l => l.level === current.level + 1) || null
}

export function getXpProgress(xp: number) {
  const current = getLevelForXp(xp)
  const next = getNextLevel(xp)
  if (!next) return { current: xp, needed: xp, percentage: 100 }
  const progressInLevel = xp - current.xpRequired
  const levelRange = next.xpRequired - current.xpRequired
  return {
    current: progressInLevel,
    needed: levelRange,
    percentage: Math.round((progressInLevel / levelRange) * 100),
  }
}

// ── Per-course levels ────────────────────────────────────────────
// Five tiers based on % of total course XP earned.
const COURSE_LEVEL_THRESHOLDS = [0, 0.2, 0.45, 0.70, 0.90] as const

export type CourseLevel = {
  tier: 1 | 2 | 3 | 4 | 5
  title: string
  nextTitle: string | null
  /** 0–100 progress through the current tier */
  fillPct: number
  /** XP still needed to reach the next tier, 0 if at max */
  xpToNext: number
  earnedXp: number
  totalXp: number
}

export function getCourseLevel(
  earnedXp: number,
  totalCourseXp: number,
  levelTitles: [string, string, string, string, string],
): CourseLevel {
  const pct = totalCourseXp > 0 ? earnedXp / totalCourseXp : 0

  let tierIdx = 0
  for (let i = COURSE_LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (pct >= COURSE_LEVEL_THRESHOLDS[i]) { tierIdx = i; break }
  }

  const currentThreshold = COURSE_LEVEL_THRESHOLDS[tierIdx]
  const nextThreshold = COURSE_LEVEL_THRESHOLDS[tierIdx + 1] ?? 1

  const progressInTier = pct - currentThreshold
  const tierRange = nextThreshold - currentThreshold
  const fillPct = tierIdx === 4 && pct >= 0.9
    ? Math.min(100, Math.round(((pct - 0.9) / 0.1) * 100))
    : Math.min(100, Math.round((progressInTier / tierRange) * 100))

  const xpToNext = tierIdx < 4
    ? Math.max(0, Math.ceil(nextThreshold * totalCourseXp) - earnedXp)
    : 0

  return {
    tier: (tierIdx + 1) as 1 | 2 | 3 | 4 | 5,
    title: levelTitles[tierIdx],
    nextTitle: levelTitles[tierIdx + 1] ?? null,
    fillPct,
    xpToNext,
    earnedXp,
    totalXp: totalCourseXp,
  }
}

// ── Learning pace tracker ────────────────────────────────────────
// Weights reflect realistic effort: coding tasks take ~1.5× a quiz,
// mini-projects ~2.5×, and capstone milestones ~3×.
const TOPIC_WEIGHT: Record<string, number> = {
  quiz:           1.0,
  coding:         1.5,
  'mini-project': 2.5,
}
const MILESTONE_WEIGHT = 3.0

export type PaceLabel = 'not-started' | 'paused' | 'slow' | 'steady' | 'fast' | 'blazing'

export type PaceInfo = {
  label: PaceLabel
  topicsPerWeek: number
  estimatedDays: number | null   // null = can't estimate yet
  estimatedDate: Date | null
  daysEnrolled: number
  completedCount: number
  totalCount: number             // topics + milestones
}

export function getCoursePace(
  enrolledAt: string,
  completedTopics: Array<{ assessmentType: string }>,
  remainingTopics: Array<{ assessmentType: string }>,
  completedMilestoneCount: number,
  remainingMilestoneCount: number,
): PaceInfo {
  const now = new Date()
  const daysElapsed = Math.max(1, (now.getTime() - new Date(enrolledAt).getTime()) / 86_400_000)

  const completedCount = completedTopics.length + completedMilestoneCount
  const totalCount = completedCount + remainingTopics.length + remainingMilestoneCount

  const doneUnits = completedTopics.reduce((s, t) => s + (TOPIC_WEIGHT[t.assessmentType] ?? 1), 0)
    + completedMilestoneCount * MILESTONE_WEIGHT
  const remainingUnits = remainingTopics.reduce((s, t) => s + (TOPIC_WEIGHT[t.assessmentType] ?? 1), 0)
    + remainingMilestoneCount * MILESTONE_WEIGHT

  const topicsPerDay  = completedTopics.length / daysElapsed
  const topicsPerWeek = topicsPerDay * 7

  let label: PaceLabel
  if (completedCount === 0)        label = 'not-started'
  else if (topicsPerWeek < 0.5)   label = 'paused'
  else if (topicsPerWeek < 2)     label = 'slow'
  else if (topicsPerWeek < 4)     label = 'steady'
  else if (topicsPerWeek < 7)     label = 'fast'
  else                            label = 'blazing'

  let estimatedDays: number | null = null
  let estimatedDate: Date | null = null

  if (doneUnits > 0 && remainingUnits > 0) {
    const unitsPerDay = doneUnits / daysElapsed
    estimatedDays = Math.ceil(remainingUnits / unitsPerDay)
    estimatedDate = new Date(now.getTime() + estimatedDays * 86_400_000)
  } else if (remainingUnits === 0 && completedCount > 0) {
    estimatedDays = 0
    estimatedDate = now
  }

  return {
    label,
    topicsPerWeek,
    estimatedDays,
    estimatedDate,
    daysEnrolled: Math.floor(daysElapsed),
    completedCount,
    totalCount,
  }
}

export function getStreakMultiplier(streak: number): number {
  if (streak >= 14) return 1.5
  if (streak >= 7) return 1.25
  if (streak >= 3) return 1.1
  return 1.0
}

export type BadgeDefinition = {
  id: string
  name: string
  description: string
  icon: string
}

// ── Global badges — not tied to any specific course ──────────────

export const GLOBAL_BADGE_DEFINITIONS: BadgeDefinition[] = [
  { id: 'first_lesson',  name: 'First Steps',   description: 'Complete your very first lesson on PromptPath', icon: '🎯' },
  { id: 'halfway',       name: 'Halfway There',  description: 'Complete 40 topics across all enrolled courses',  icon: '⛰️' },
  { id: 'perfect_quiz',  name: 'Perfect Score',  description: 'Score 100% on a quiz',                           icon: '💯' },
  { id: 'first_try',     name: 'Nailed It',      description: 'Pass a coding task on the first attempt',        icon: '🎯' },
  { id: 'streak_3',      name: 'Getting Warm',   description: '3-day learning streak',                          icon: '🔥' },
  { id: 'streak_7',      name: 'On Fire',        description: '7-day learning streak',                          icon: '🔥' },
  { id: 'streak_14',     name: 'Unstoppable',    description: '14-day learning streak',                         icon: '💥' },
  { id: 'streak_30',     name: 'Legendary',      description: '30-day learning streak',                         icon: '⚡' },
]

// ── Per-course badges — generated dynamically from a Course object ──

export function getCourseBadgeDefinitions(course: Course): BadgeDefinition[] {
  const chapterBadges: BadgeDefinition[] = course.chapters.map(ch => ({
    id: `chapter_${course.id}_${ch.id}`,
    name: ch.title,
    description: `Complete Chapter ${ch.id} of ${course.title}`,
    icon: ch.icon,
  }))

  return [
    ...chapterBadges,
    {
      id: `course_complete_${course.id}`,
      name: `${course.title} Champion`,
      description: `Complete all chapters in ${course.title}`,
      icon: '🏆',
    },
    {
      id: `cert_${course.id}`,
      name: `${course.title} Graduate`,
      description: `Earned the ${course.title} certificate`,
      icon: '🎓',
    },
  ]
}

// ── Combined view for the dashboard ─────────────────────────────

export function getAllBadgeDefinitions(enrolledCourses: Course[]): BadgeDefinition[] {
  const courseBadges = enrolledCourses.flatMap(getCourseBadgeDefinitions)
  return [...GLOBAL_BADGE_DEFINITIONS, ...courseBadges]
}

// Legacy export so any remaining code that imports BADGE_DEFINITIONS still compiles.
// The dashboard now uses getAllBadgeDefinitions() instead.
export const BADGE_DEFINITIONS = GLOBAL_BADGE_DEFINITIONS
