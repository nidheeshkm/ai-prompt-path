import type { Course } from '@/data/curriculum'

export const LEVELS = [
  { level: 1, xpRequired: 0, title: 'Novice' },
  { level: 2, xpRequired: 300, title: 'Apprentice' },
  { level: 3, xpRequired: 750, title: 'Practitioner' },
  { level: 4, xpRequired: 1500, title: 'Chain Builder' },
  { level: 5, xpRequired: 2500, title: 'Retrieval Engineer' },
  { level: 6, xpRequired: 4000, title: 'Agent Architect' },
  { level: 7, xpRequired: 6000, title: 'Graph Master' },
  { level: 8, xpRequired: 8500, title: 'Production Engineer' },
  { level: 9, xpRequired: 10500, title: 'Expert' },
  { level: 10, xpRequired: 12350, title: 'LangChain Hero' },
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
