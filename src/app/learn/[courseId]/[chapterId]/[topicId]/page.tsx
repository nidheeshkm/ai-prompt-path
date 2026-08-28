import { getCourse, getCourseTopics, getCourseNextTopic, getCoursePrevTopic } from '@/data/curriculum'
import { getTopicContent, getTopicQuizQuestions, getTopicCodingTask } from '@/server/curriculum'
import TopicView from '@/components/TopicView'

type Props = {
  params: Promise<{ courseId: string; chapterId: string; topicId: string }>
}

export default async function TopicPage({ params }: Props) {
  const { courseId, chapterId, topicId } = await params

  const course  = getCourse(courseId)
  const chapter = course?.chapters.find(c => c.id === Number(chapterId))
  const topic   = chapter?.topics.find(t => t.id === topicId)

  const allTopics  = getCourseTopics(courseId)
  const nextTopicId = topic ? getCourseNextTopic(courseId, topicId) : null
  const prevTopicId = topic ? getCoursePrevTopic(courseId, topicId) : null
  const nextTopic   = nextTopicId ? allTopics.find(t => t.id === nextTopicId) : null
  const prevTopic   = prevTopicId ? allTopics.find(t => t.id === prevTopicId) : null

  if (!course || !chapter || !topic) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-slate-400">Topic not found.</p>
      </main>
    )
  }

  // Fetch content server-side — never bundled into client JS
  const [content, quiz, codingTask] = await Promise.all([
    getTopicContent(courseId, topicId),
    topic.assessmentType === 'quiz' ? getTopicQuizQuestions(courseId, topicId) : Promise.resolve(null),
    topic.assessmentType !== 'quiz' ? getTopicCodingTask(courseId, topicId) : Promise.resolve(null),
  ])

  // Fallbacks while DB is being seeded
  const resolvedContent    = content    ?? topic.content ?? ''
  const resolvedQuiz       = quiz       ?? (topic.quiz?.map(q => ({ question: q.question, options: q.options })) ?? null)
  const resolvedCodingTask = codingTask ?? (topic.codingTask
    ? { instructions: topic.codingTask.instructions, boilerplate: topic.codingTask.boilerplate, rubric: topic.codingTask.rubric, hints: topic.codingTask.hints, solutionCode: '' as const }
    : null)

  return (
    <TopicView
      courseId={courseId}
      chapterId={Number(chapterId)}
      topicId={topicId}
      topicTitle={topic.title}
      topicXp={topic.xp}
      assessmentType={topic.assessmentType}
      courseTitle={course.title}
      chapterTitle={chapter.title}
      content={resolvedContent}
      quiz={resolvedQuiz}
      codingTask={resolvedCodingTask}
      nextTopic={nextTopic ? { id: nextTopic.id, title: nextTopic.title, chapterId: nextTopic.chapterId } : null}
      prevTopic={prevTopic ? { id: prevTopic.id, title: prevTopic.title, chapterId: prevTopic.chapterId } : null}
    />
  )
}
