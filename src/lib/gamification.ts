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
  const next = LEVELS.find(l => l.level === current.level + 1)
  return next || null
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

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  { id: 'first_lesson', name: 'First Steps', description: 'Complete your first lesson', icon: '🎯' },
  { id: 'chapter_1', name: 'Foundation Layer', description: 'Complete Chapter 1', icon: '🧱' },
  { id: 'chapter_2', name: 'Prompt Crafter', description: 'Complete Chapter 2', icon: '✍️' },
  { id: 'chapter_3', name: 'Chain Linker', description: 'Complete Chapter 3', icon: '🔗' },
  { id: 'chapter_4', name: 'Doc Loader', description: 'Complete Chapter 4', icon: '📄' },
  { id: 'chapter_5', name: 'Vector Voyager', description: 'Complete Chapter 5', icon: '🧭' },
  { id: 'chapter_6', name: 'RAG Builder', description: 'Complete Chapter 6', icon: '🏗️' },
  { id: 'chapter_7', name: 'RAG Master', description: 'Complete Chapter 7', icon: '🎓' },
  { id: 'chapter_8', name: 'Memory Keeper', description: 'Complete Chapter 8', icon: '🧠' },
  { id: 'chapter_9', name: 'Tool Smith', description: 'Complete Chapter 9', icon: '🔧' },
  { id: 'chapter_10', name: 'Agent Handler', description: 'Complete Chapter 10', icon: '🤖' },
  { id: 'chapter_11', name: 'Graph Thinker', description: 'Complete Chapter 11', icon: '📊' },
  { id: 'chapter_12', name: 'Graph Architect', description: 'Complete Chapter 12', icon: '🏛️' },
  { id: 'chapter_13', name: 'Multi-Agent Commander', description: 'Complete Chapter 13', icon: '👥' },
  { id: 'chapter_14', name: 'Observer', description: 'Complete Chapter 14', icon: '🔭' },
  { id: 'chapter_15', name: 'Security Guard', description: 'Complete Chapter 15', icon: '🛡️' },
  { id: 'chapter_16', name: 'Production Ready', description: 'Complete Chapter 16', icon: '🚀' },
  { id: 'streak_3', name: 'Getting Warm', description: '3-day learning streak', icon: '🔥' },
  { id: 'streak_7', name: 'On Fire', description: '7-day learning streak', icon: '🔥' },
  { id: 'streak_14', name: 'Unstoppable', description: '14-day learning streak', icon: '💥' },
  { id: 'streak_30', name: 'Legendary', description: '30-day learning streak', icon: '⚡' },
  { id: 'perfect_quiz', name: 'Perfect Score', description: 'Score 100% on a quiz', icon: '💯' },
  { id: 'first_try', name: 'Nailed It', description: 'Pass a coding task on first attempt', icon: '🎯' },
  { id: 'halfway', name: 'Halfway There', description: 'Complete 40 topics', icon: '⛰️' },
  { id: 'course_complete', name: 'LangChain Hero', description: 'Complete the entire course', icon: '🏆' },
]
