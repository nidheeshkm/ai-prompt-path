export type AssessmentType = 'quiz' | 'coding' | 'mini-project'

export type QuizQuestion = {
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

export type CodingTask = {
  instructions: string
  boilerplate: string
  rubric: string[]
  hints: string[]
  solutionCode: string
}

export type Topic = {
  id: string
  title: string
  xp: number
  assessmentType: AssessmentType
  content: string
  quiz?: QuizQuestion[]
  codingTask?: CodingTask
}

export type Chapter = {
  id: number
  title: string
  description: string
  part: string
  icon: string
  topics: Topic[]
}

export const curriculum: Chapter[] = [
  // ═══════════════════════════════════════════════
  // PART I: FOUNDATIONS (Chapters 1-3)
  // ═══════════════════════════════════════════════
  {
    id: 1,
    title: 'The LLM Landscape & Setup',
    description: 'Understand what LangChain is, why it exists, and set up your development environment.',
    part: 'Part I: Foundations',
    icon: '🌍',
    topics: [
      {
        id: '1.1',
        title: 'What is LangChain? The Ecosystem',
        xp: 50,
        assessmentType: 'quiz',
        content: '',
        quiz: []
      },
      {
        id: '1.2',
        title: 'LLMs vs Traditional Programming',
        xp: 50,
        assessmentType: 'quiz',
        content: '',
        quiz: []
      },
      {
        id: '1.3',
        title: 'Setting Up Your Environment',
        xp: 75,
        assessmentType: 'coding',
        content: '',
        codingTask: undefined
      },
      {
        id: '1.4',
        title: 'Your First LLM Call with LangChain',
        xp: 100,
        assessmentType: 'coding',
        content: '',
        codingTask: undefined
      },
      {
        id: '1.5',
        title: 'Tokens, Temperature & Model Parameters',
        xp: 75,
        assessmentType: 'quiz',
        content: '',
        quiz: []
      },
      {
        id: '1.MP',
        title: 'CLI Ask-Me-Anything Tool',
        xp: 250,
        assessmentType: 'mini-project' as AssessmentType,
        content: '',
        codingTask: undefined
      }
    ]
  },

  // Chapter 2: Prompt Engineering
  {
    id: 2,
    title: 'Prompt Engineering',
    description: 'Master the art and science of crafting effective prompts -- the core skill for all LLM applications.',
    part: 'Part I: Foundations',
    icon: '✍️',
    topics: [
      {
        id: '2.1',
        title: 'Anatomy of a Prompt',
        xp: 50,
        assessmentType: 'quiz',
        content: '',
        quiz: []
      },
      {
        id: '2.2',
        title: 'Zero-Shot & Few-Shot Prompting',
        xp: 100,
        assessmentType: 'coding',
        content: '',
        codingTask: undefined
      },
      {
        id: '2.3',
        title: 'Chain-of-Thought Prompting',
        xp: 125,
        assessmentType: 'coding',
        content: '',
        codingTask: undefined
      },
      {
        id: '2.4',
        title: 'Self-Consistency -- Multiple Reasoning Paths',
        xp: 150,
        assessmentType: 'coding',
        content: '',
        codingTask: undefined
      },
      {
        id: '2.5',
        title: 'Tree of Thoughts',
        xp: 150,
        assessmentType: 'coding',
        content: '',
        codingTask: undefined
      },
      {
        id: '2.6',
        title: 'System Prompts & Instruction Hierarchy',
        xp: 125,
        assessmentType: 'coding',
        content: '',
        codingTask: undefined
      },
      {
        id: '2.7',
        title: 'Output Formatting',
        xp: 100,
        assessmentType: 'coding',
        content: '',
        codingTask: undefined
      },
      {
        id: '2.8',
        title: 'Meta-Prompting',
        xp: 150,
        assessmentType: 'coding',
        content: '',
        codingTask: undefined
      },
      {
        id: '2.9',
        title: 'Adversarial Prompting -- Attacks & Defenses',
        xp: 100,
        assessmentType: 'quiz',
        content: '',
        quiz: []
      },
      {
        id: '2.10',
        title: 'Prompt Evaluation & Iteration',
        xp: 175,
        assessmentType: 'coding',
        content: '',
        codingTask: undefined
      },
      {
        id: '2.MP',
        title: 'Prompt Engineering Showcase',
        xp: 250,
        assessmentType: 'mini-project' as AssessmentType,
        content: '',
        codingTask: undefined
      }
    ]
  },

  // Chapter 3: Models & Prompts (LangChain API)
  {
    id: 3,
    title: 'Models & Prompts in LangChain',
    description: 'Master LangChain\'s prompt templates, output parsers, and structured output APIs.',
    part: 'Part I: Foundations',
    icon: '🔤',
    topics: [
      {
        id: '3.1',
        title: 'Chat Models vs Completion Models',
        xp: 50,
        assessmentType: 'quiz',
        content: '',
        quiz: []
      },
      {
        id: '3.2',
        title: 'PromptTemplates',
        xp: 100,
        assessmentType: 'coding',
        content: '',
        codingTask: undefined
      },
      {
        id: '3.3',
        title: 'ChatPromptTemplates & Message Types',
        xp: 100,
        assessmentType: 'coding',
        content: '',
        codingTask: undefined
      },
      {
        id: '3.4',
        title: 'Few-Shot Prompting with LangChain',
        xp: 125,
        assessmentType: 'coding',
        content: '',
        codingTask: undefined
      },
      {
        id: '3.5',
        title: 'Output Parsers -- Structured Output',
        xp: 125,
        assessmentType: 'coding',
        content: '',
        codingTask: undefined
      },
      {
        id: '3.6',
        title: 'Pydantic + with_structured_output()',
        xp: 150,
        assessmentType: 'coding',
        content: '',
        codingTask: undefined
      },
      {
        id: '3.MP',
        title: 'Multi-Model Comparison Tool',
        xp: 250,
        assessmentType: 'mini-project' as AssessmentType,
        content: '',
        codingTask: undefined
      }
    ]
  },

  // Chapters 4-17 -- Defined with essential structure but shortened content for build efficiency
  // Full content follows the same depth pattern as chapters 1-3

  {
    id: 4,
    title: 'Chains & LCEL',
    description: 'Master LangChain Expression Language -- the composable pipeline system at the heart of LangChain.',
    part: 'Part II: Chains & Pipelines',
    icon: '🔗',
    topics: generateTopicStubs(4, [
      { id: '4.1', title: 'What Are Chains? The Pipe Operator', xp: 75, type: 'quiz' },
      { id: '4.2', title: 'LCEL Deep Dive -- Composing Runnables', xp: 150, type: 'coding' },
      { id: '4.3', title: 'RunnablePassthrough, RunnableParallel, RunnableLambda', xp: 150, type: 'coding' },
      { id: '4.4', title: 'RunnableBranch -- Conditional Logic', xp: 125, type: 'coding' },
      { id: '4.5', title: 'Error Handling, Retries & Fallbacks', xp: 125, type: 'coding' },
      { id: '4.6', title: 'Streaming -- Token-by-Token & Events', xp: 100, type: 'coding' },
    ])
  },
  {
    id: 5,
    title: 'Document Loading & Text Splitting',
    description: 'Load documents from any source and split them intelligently for retrieval.',
    part: 'Part III: Data & Retrieval',
    icon: '📄',
    topics: generateTopicStubs(5, [
      { id: '5.1', title: 'Document Loaders -- PDFs, Web, CSV, APIs', xp: 100, type: 'coding' },
      { id: '5.2', title: 'Why Chunking Matters', xp: 75, type: 'quiz' },
      { id: '5.3', title: 'Splitting Strategies -- Recursive, Semantic, Code', xp: 125, type: 'coding' },
      { id: '5.4', title: 'Metadata Enrichment & Document Organization', xp: 100, type: 'coding' },
    ])
  },
  {
    id: 6,
    title: 'Embeddings & Vector Stores',
    description: 'Transform text into mathematical representations and store them for fast retrieval.',
    part: 'Part III: Data & Retrieval',
    icon: '🧭',
    topics: generateTopicStubs(6, [
      { id: '6.1', title: 'What Are Embeddings? (Visual Intuition)', xp: 75, type: 'quiz' },
      { id: '6.2', title: 'Embedding Models -- OpenAI, HuggingFace, Cohere', xp: 100, type: 'coding' },
      { id: '6.3', title: 'Vector Stores -- FAISS, Chroma, Pinecone', xp: 150, type: 'coding' },
      { id: '6.4', title: 'Similarity Search, MMR & Filtering', xp: 125, type: 'coding' },
      { id: '6.5', title: 'Hybrid Search -- Dense + Sparse Retrieval', xp: 150, type: 'coding' },
    ])
  },
  {
    id: 7,
    title: 'RAG -- Retrieval-Augmented Generation',
    description: 'Build the most important pattern in LLM applications -- grounding responses in your data.',
    part: 'Part III: Data & Retrieval',
    icon: '🏗️',
    topics: generateTopicStubs(7, [
      { id: '7.1', title: 'The RAG Pattern -- Architecture & When to Use', xp: 75, type: 'quiz' },
      { id: '7.2', title: 'Building a Basic RAG Pipeline', xp: 200, type: 'coding' },
      { id: '7.3', title: 'Multi-Query Retrieval & Query Transformation', xp: 175, type: 'coding' },
      { id: '7.4', title: 'Contextual Compression & Re-ranking', xp: 150, type: 'coding' },
      { id: '7.5', title: 'Parent Document & Multi-Vector Retriever', xp: 175, type: 'coding' },
    ])
  },
  {
    id: 8,
    title: 'Advanced RAG Patterns',
    description: 'Production-grade RAG techniques that separate junior from senior engineers.',
    part: 'Part III: Data & Retrieval',
    icon: '🎓',
    topics: generateTopicStubs(8, [
      { id: '8.1', title: 'Self-RAG -- LLM Decides When to Retrieve', xp: 200, type: 'coding' },
      { id: '8.2', title: 'Corrective RAG (CRAG)', xp: 200, type: 'coding' },
      { id: '8.3', title: 'Adaptive RAG -- Routing Between Strategies', xp: 200, type: 'coding' },
      { id: '8.4', title: 'Graph RAG -- Knowledge Graphs + Retrieval', xp: 225, type: 'coding' },
      { id: '8.5', title: 'Agentic RAG -- Agent-Driven Retrieval', xp: 250, type: 'coding' },
      { id: '8.6', title: 'RAG Evaluation Metrics & Frameworks', xp: 175, type: 'coding' },
    ])
  },
  {
    id: 9,
    title: 'Memory & Stateful Conversations',
    description: 'Give your LLM applications memory -- from simple buffers to persistent long-term storage.',
    part: 'Part IV: Memory',
    icon: '🧠',
    topics: generateTopicStubs(9, [
      { id: '9.1', title: 'Why LLMs Are Stateless', xp: 50, type: 'quiz' },
      { id: '9.2', title: 'Buffer, Summary & Window Memory', xp: 125, type: 'coding' },
      { id: '9.3', title: 'Building a Chatbot with Persistent Memory', xp: 175, type: 'coding' },
      { id: '9.4', title: 'Long-Term Memory with Vector Stores', xp: 150, type: 'coding' },
      { id: '9.5', title: 'Conversation History Management at Scale', xp: 150, type: 'coding' },
    ])
  },
  {
    id: 10,
    title: 'Tool Calling & Function Calling',
    description: 'Extend LLM capabilities by giving them tools to interact with the real world.',
    part: 'Part V: Tools & Agents',
    icon: '🔧',
    topics: generateTopicStubs(10, [
      { id: '10.1', title: 'What Are Tools? Extending LLM Capabilities', xp: 75, type: 'quiz' },
      { id: '10.2', title: 'Defining Tools with @tool and Pydantic', xp: 150, type: 'coding' },
      { id: '10.3', title: 'Built-in Tools -- Search, Math, Wikipedia', xp: 125, type: 'coding' },
      { id: '10.4', title: 'Custom Tools -- API Wrappers, DB Queries', xp: 175, type: 'coding' },
      { id: '10.5', title: 'Tool Error Handling & Validation', xp: 125, type: 'coding' },
    ])
  },
  {
    id: 11,
    title: 'Agents',
    description: 'Build LLMs that reason about which actions to take and execute multi-step plans.',
    part: 'Part V: Tools & Agents',
    icon: '🤖',
    topics: generateTopicStubs(11, [
      { id: '11.1', title: 'What Are Agents? LLMs That Plan & Act', xp: 75, type: 'quiz' },
      { id: '11.2', title: 'ReAct Pattern -- Reasoning + Acting', xp: 175, type: 'coding' },
      { id: '11.3', title: 'Agent with Tools -- Web Search Agent', xp: 200, type: 'coding' },
      { id: '11.4', title: 'Agent with Memory -- Persistent Context', xp: 200, type: 'coding' },
      { id: '11.5', title: 'Agent Evaluation -- Testing Behavior', xp: 175, type: 'coding' },
    ])
  },
  {
    id: 12,
    title: 'LangGraph Fundamentals',
    description: 'Learn the graph-based framework for building complex, stateful LLM workflows.',
    part: 'Part VI: LangGraph',
    icon: '📊',
    topics: generateTopicStubs(12, [
      { id: '12.1', title: 'Why LangGraph? From Chains to Graphs', xp: 75, type: 'quiz' },
      { id: '12.2', title: 'Nodes, Edges & State -- The Graph Model', xp: 150, type: 'coding' },
      { id: '12.3', title: 'Your First LangGraph -- Simple State Machine', xp: 175, type: 'coding' },
      { id: '12.4', title: 'Conditional Edges -- Dynamic Routing', xp: 175, type: 'coding' },
      { id: '12.5', title: 'State Management -- TypedDict & Reducers', xp: 200, type: 'coding' },
    ])
  },
  {
    id: 13,
    title: 'LangGraph Advanced Patterns',
    description: 'Master advanced LangGraph features: human-in-the-loop, persistence, subgraphs.',
    part: 'Part VI: LangGraph',
    icon: '🏛️',
    topics: generateTopicStubs(13, [
      { id: '13.1', title: 'Subgraphs -- Modular Graph Composition', xp: 200, type: 'coding' },
      { id: '13.2', title: 'Human-in-the-Loop -- Breakpoints & Approvals', xp: 225, type: 'coding' },
      { id: '13.3', title: 'Persistence -- Checkpointing & Recovery', xp: 200, type: 'coding' },
      { id: '13.4', title: 'Streaming in LangGraph', xp: 175, type: 'coding' },
      { id: '13.5', title: 'Error Handling & Retry Patterns', xp: 150, type: 'coding' },
    ])
  },
  {
    id: 14,
    title: 'Multi-Agent Systems',
    description: 'Orchestrate multiple AI agents that collaborate, delegate, and solve complex problems together.',
    part: 'Part VI: LangGraph',
    icon: '👥',
    topics: generateTopicStubs(14, [
      { id: '14.1', title: 'Multi-Agent Architectures Overview', xp: 100, type: 'quiz' },
      { id: '14.2', title: 'Supervisor Agent -- Orchestrating Specialists', xp: 250, type: 'coding' },
      { id: '14.3', title: 'Agent Handoffs -- Transferring Context', xp: 225, type: 'coding' },
      { id: '14.4', title: 'Collaborative Multi-Agent Workflows', xp: 250, type: 'coding' },
      { id: '14.5', title: 'Research Team: Multi-Agent Capstone', xp: 300, type: 'coding' },
    ])
  },
  {
    id: 15,
    title: 'Tracing & Observability',
    description: 'Debug, monitor, and evaluate your LLM applications with LangFuse and LangSmith.',
    part: 'Part VII: Observability',
    icon: '🔭',
    topics: generateTopicStubs(15, [
      { id: '15.1', title: 'Why Observability Matters', xp: 50, type: 'quiz' },
      { id: '15.2', title: 'LangFuse Setup -- Tracing Your First Chain', xp: 125, type: 'coding' },
      { id: '15.3', title: 'Reading Traces -- Debugging Pipelines', xp: 150, type: 'coding' },
      { id: '15.4', title: 'Evaluations & Datasets in LangFuse', xp: 175, type: 'coding' },
      { id: '15.5', title: 'Prompt Management & Versioning', xp: 125, type: 'coding' },
      { id: '15.6', title: 'LangSmith -- The Commercial Alternative', xp: 125, type: 'coding' },
      { id: '15.7', title: 'LangSmith Evaluations & Monitoring', xp: 150, type: 'coding' },
    ])
  },
  {
    id: 16,
    title: 'Security, Testing & Reliability',
    description: 'Harden your LLM applications against attacks and ensure reliability with comprehensive testing.',
    part: 'Part VIII: Production',
    icon: '🛡️',
    topics: generateTopicStubs(16, [
      { id: '16.1', title: 'Prompt Injection -- Attacks & Defenses', xp: 175, type: 'coding' },
      { id: '16.2', title: 'Input/Output Guardrails', xp: 175, type: 'coding' },
      { id: '16.3', title: 'Unit Testing Chains & Agents', xp: 200, type: 'coding' },
      { id: '16.4', title: 'Integration Testing LLM Pipelines', xp: 200, type: 'coding' },
      { id: '16.5', title: 'Regression Testing Prompts', xp: 175, type: 'coding' },
    ])
  },
  {
    id: 17,
    title: 'Production Architecture & Deployment',
    description: 'Ship your LLM application -- deployment, scaling, cost control, and the capstone project.',
    part: 'Part VIII: Production',
    icon: '🚀',
    topics: generateTopicStubs(17, [
      { id: '17.1', title: 'Production Project Structure', xp: 100, type: 'quiz' },
      { id: '17.2', title: 'Async & Parallel Execution', xp: 200, type: 'coding' },
      { id: '17.3', title: 'Caching -- Semantic & Exact', xp: 150, type: 'coding' },
      { id: '17.4', title: 'Rate Limiting & Cost Optimization', xp: 150, type: 'coding' },
      { id: '17.5', title: 'Deploying with LangServe / FastAPI', xp: 175, type: 'coding' },
      { id: '17.6', title: 'Capstone: Production RAG Agent', xp: 500, type: 'coding' },
    ])
  }
]

// Mini-project topics for chapters 4-17
// Appended after curriculum array since generateTopicStubs() doesn't support mini-project type
;(function addMiniProjects() {
  const mp: Array<{chapterIdx: number, topic: Topic}> = [
    {
      chapterIdx: 3,
      topic: {
        id: '4.MP',
        title: 'LCEL Document Q&A Pipeline',
        xp: 250,
        assessmentType: 'mini-project' as AssessmentType,
        content: '',
        codingTask: undefined
      },
    },
    {
      chapterIdx: 4,
      topic: {
        id: '5.MP',
        title: 'Document Ingestion Dashboard',
        xp: 250,
        assessmentType: 'mini-project' as AssessmentType,
        content: '',
        codingTask: undefined
      },
    },
    {
      chapterIdx: 5,
      topic: {
        id: '6.MP',
        title: 'Semantic Search Engine',
        xp: 250,
        assessmentType: 'mini-project' as AssessmentType,
        content: '',
        codingTask: undefined
      },
    },
    {
      chapterIdx: 6,
      topic: {
        id: '7.MP',
        title: 'Text File Q&A with RAG',
        xp: 300,
        assessmentType: 'mini-project' as AssessmentType,
        content: '',
        codingTask: undefined
      },
    },
    {
      chapterIdx: 7,
      topic: {
        id: '8.MP',
        title: 'Self-Checking RAG',
        xp: 300,
        assessmentType: 'mini-project' as AssessmentType,
        content: '',
        codingTask: undefined
      },
    },
    {
      chapterIdx: 8,
      topic: {
        id: '9.MP',
        title: 'Stateful Research Assistant',
        xp: 300,
        assessmentType: 'mini-project' as AssessmentType,
        content: '',
        codingTask: undefined
      },
    },
    {
      chapterIdx: 9,
      topic: {
        id: '10.MP',
        title: 'LLM-Powered Swiss Army Knife',
        xp: 300,
        assessmentType: 'mini-project' as AssessmentType,
        content: '',
        codingTask: undefined
      },
    },
    {
      chapterIdx: 10,
      topic: {
        id: '11.MP',
        title: 'ReAct Research Agent',
        xp: 300,
        assessmentType: 'mini-project' as AssessmentType,
        content: '',
        codingTask: undefined
      },
    },
    {
      chapterIdx: 11,
      topic: {
        id: '12.MP',
        title: 'LangGraph Conversation Flow',
        xp: 300,
        assessmentType: 'mini-project' as AssessmentType,
        content: '',
        codingTask: undefined
      },
    },
    {
      chapterIdx: 12,
      topic: {
        id: '13.MP',
        title: 'Human-Approved Research Graph',
        xp: 350,
        assessmentType: 'mini-project' as AssessmentType,
        content: '',
        codingTask: undefined
      },
    },
    {
      chapterIdx: 13,
      topic: {
        id: '14.MP',
        title: 'Multi-Agent Content Team',
        xp: 350,
        assessmentType: 'mini-project' as AssessmentType,
        content: '',
        codingTask: undefined
      },
    },
    {
      chapterIdx: 14,
      topic: {
        id: '15.MP',
        title: 'Fully Traced RAG Agent',
        xp: 350,
        assessmentType: 'mini-project' as AssessmentType,
        content: '',
        codingTask: undefined
      },
    },
    {
      chapterIdx: 15,
      topic: {
        id: '16.MP',
        title: 'Production RAG Service',
        xp: 350,
        assessmentType: 'mini-project' as AssessmentType,
        content: '',
        codingTask: undefined
      },
    },
    {
      chapterIdx: 16,
      topic: {
        id: '17.MP',
        title: 'End-to-End LangChain System',
        xp: 350,
        assessmentType: 'mini-project' as AssessmentType,
        content: '',
        codingTask: undefined
      },
    },
  ]
  mp.forEach(({ chapterIdx, topic }) => curriculum[chapterIdx].topics.push(topic))
})()


// Helper function to generate topic stubs for chapters 4-17
// These have the same structure but abbreviated content to keep the build moving
function generateTopicStubs(chapterId: number, topicDefs: Array<{id: string, title: string, xp: number, type: 'quiz' | 'coding'}>): Topic[] {
  return topicDefs.map(def => {
    const topic: Topic = {
      id: def.id,
      title: def.title,
      xp: def.xp,
      assessmentType: def.type,
      content: generateLessonContent(chapterId, def.id, def.title),
    }

    if (def.type === 'quiz') {
      topic.quiz = generateQuizQuestions(def.id, def.title)
    } else {
      topic.codingTask = generateCodingTask(def.id, def.title)
    }

    return topic
  })
}

function generateLessonContent(chapterId: number, topicId: string, title: string): string {
  // Content mapping for chapters 4-17
  const contentMap: Record<string, string> = {
    '4.1': `# What Are Chains? The Pipe Operator

## The Core Idea

A **chain** is a sequence of operations where each step's output feeds into the next step's input. In LangChain, chains are built using the **pipe operator** (\`|\`):

\`\`\`python
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

prompt = ChatPromptTemplate.from_template("Tell me a joke about {topic}")
llm = ChatOpenAI(model="openai/gpt-4o-mini", base_url="https://openrouter.ai/api/v1", api_key=os.getenv("OPENROUTER_API_KEY"))
parser = StrOutputParser()

# The pipe operator creates a chain
chain = prompt | llm | parser

result = chain.invoke({"topic": "programming"})
\`\`\`

## How the Pipe Works

\`\`\`
Input: {"topic": "programming"}
    ↓
[PromptTemplate] → "Tell me a joke about programming"
    ↓
[ChatOpenAI] → AIMessage(content="Why do programmers prefer dark mode?...")
    ↓
[StrOutputParser] → "Why do programmers prefer dark mode?..."
    ↓
Output: string
\`\`\`

Each component in a chain is a **Runnable** -- an object that has \`.invoke()\`, \`.batch()\`, \`.stream()\`, and async variants. The pipe operator connects Runnables into a sequence.

## Why Chains Matter

1. **Composability**: Build complex pipelines from simple pieces
2. **Reusability**: Each component can be used in multiple chains
3. **Debuggability**: Each step can be tested independently
4. **Streaming**: The entire chain supports streaming automatically
5. **Async**: The entire chain supports async automatically

## LCEL (LangChain Expression Language)

The pipe operator syntax IS LangChain Expression Language (LCEL). It's the modern way to build anything in LangChain. Every tutorial, example, and production app uses LCEL.

Before LCEL, you had to use legacy chain classes like \`LLMChain\`, \`SequentialChain\`, etc. These are deprecated. **Always use LCEL.**`,

    '4.2': `# LCEL Deep Dive -- Composing Runnables

## The Runnable Protocol

Every component in LCEL implements the Runnable interface:

\`\`\`python
class Runnable:
    def invoke(self, input)       # Single input → single output
    def batch(self, inputs)       # List of inputs → list of outputs
    def stream(self, input)       # Single input → stream of outputs
    async def ainvoke(self, input)
    async def abatch(self, inputs)
    async def astream(self, input)
\`\`\`

## Building Complex Chains

\`\`\`python
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

# Multi-step chain: Translate → Summarize → Format
translate = ChatPromptTemplate.from_template(
    "Translate to English: {text}"
) | ChatOpenAI(model="openai/gpt-4o-mini", base_url="https://openrouter.ai/api/v1", api_key=os.getenv("OPENROUTER_API_KEY")) | StrOutputParser()

summarize = ChatPromptTemplate.from_template(
    "Summarize in one sentence: {text}"
) | ChatOpenAI(model="openai/gpt-4o-mini", base_url="https://openrouter.ai/api/v1", api_key=os.getenv("OPENROUTER_API_KEY")) | StrOutputParser()

# Chain chains together
from langchain_core.runnables import RunnableLambda

full_pipeline = (
    translate
    | RunnableLambda(lambda x: {"text": x})  # Reshape for next prompt
    | summarize
)
\`\`\`

## Key LCEL Patterns

### Pattern 1: Simple Pipeline
\`\`\`python
chain = prompt | llm | parser
\`\`\`

### Pattern 2: With Pre-processing
\`\`\`python
chain = RunnableLambda(preprocess) | prompt | llm | parser
\`\`\`

### Pattern 3: With Post-processing
\`\`\`python
chain = prompt | llm | parser | RunnableLambda(postprocess)
\`\`\`

### Pattern 4: Parallel Steps
\`\`\`python
from langchain_core.runnables import RunnableParallel

chain = RunnableParallel(
    summary=summary_chain,
    sentiment=sentiment_chain,
    keywords=keyword_chain,
)
\`\`\`

## Debugging Chains

\`\`\`python
# See what each step produces
with_debug = chain.with_config({"run_name": "my_chain"})

# Or add logging between steps
def log_step(x):
    print(f"Step output: {x}")
    return x

debug_chain = prompt | RunnableLambda(log_step) | llm | RunnableLambda(log_step) | parser
\`\`\``,

    '4.3': `# RunnablePassthrough, RunnableParallel, RunnableLambda

## The Three Essential Runnables

These three utilities are used in virtually every LCEL chain:

### RunnablePassthrough -- Pass Input Through

\`\`\`python
from langchain_core.runnables import RunnablePassthrough

# Passes input unchanged -- useful for including original input alongside transformed data
chain = RunnableParallel(
    original=RunnablePassthrough(),         # Keeps the original input
    processed=some_processing_chain,        # Transforms the input
)

# Common RAG pattern:
chain = RunnableParallel(
    context=retriever,                       # Fetch documents
    question=RunnablePassthrough(),          # Keep the question
) | prompt | llm
\`\`\`

### RunnableParallel -- Run Steps in Parallel

\`\`\`python
from langchain_core.runnables import RunnableParallel

# Run multiple chains simultaneously
analysis = RunnableParallel(
    summary=summary_chain,
    sentiment=sentiment_chain,
    entities=entity_chain,
)

result = analysis.invoke("Your text here")
# result = {"summary": "...", "sentiment": "positive", "entities": [...]}
\`\`\`

### RunnableLambda -- Custom Functions

\`\`\`python
from langchain_core.runnables import RunnableLambda

# Wrap any function as a Runnable
def clean_text(text: str) -> str:
    return text.strip().lower()

def format_output(data: dict) -> str:
    return f"Summary: {data['summary']}\\nSentiment: {data['sentiment']}"

chain = (
    RunnableLambda(clean_text)
    | analysis_chain
    | RunnableLambda(format_output)
)
\`\`\`

## Combining All Three

\`\`\`python
# A real-world pattern: RAG with metadata
from langchain_core.runnables import RunnableParallel, RunnablePassthrough, RunnableLambda

def format_docs(docs):
    return "\\n".join(d.page_content for d in docs)

rag_chain = (
    RunnableParallel(
        context=retriever | RunnableLambda(format_docs),
        question=RunnablePassthrough(),
    )
    | prompt
    | llm
    | StrOutputParser()
)
\`\`\``,

    '4.4': `# RunnableBranch -- Conditional Logic in Chains

## Routing Based on Input

Sometimes you need different processing paths based on the input:

\`\`\`python
from langchain_core.runnables import RunnableBranch, RunnableLambda

# Route based on input content
branch = RunnableBranch(
    # (condition, runnable) pairs
    (lambda x: "code" in x["type"], code_review_chain),
    (lambda x: "email" in x["type"], email_writer_chain),
    (lambda x: "data" in x["type"], data_analysis_chain),
    # Default (no condition)
    general_chain,
)

result = branch.invoke({"type": "code", "content": "def foo(): pass"})
\`\`\`

## Router with LLM Classification

\`\`\`python
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

# Step 1: LLM classifies the input
classifier = ChatPromptTemplate.from_template(
    "Classify this query as 'technical', 'billing', or 'general': {query}"
) | llm | StrOutputParser()

# Step 2: Route to specialized chains
def route(classification: str):
    routes = {
        "technical": tech_chain,
        "billing": billing_chain,
        "general": general_chain,
    }
    return routes.get(classification.strip().lower(), general_chain)

# Step 3: Full routing pipeline
chain = classifier | RunnableLambda(route)
\`\`\`

## The Modern Alternative: RunnableLambda with Router

\`\`\`python
def smart_route(input_dict):
    """Route to different chains based on classification."""
    query = input_dict["query"]

    # Classify
    category = classifier.invoke({"query": query})

    # Route
    if "technical" in category.lower():
        return tech_chain.invoke(input_dict)
    elif "billing" in category.lower():
        return billing_chain.invoke(input_dict)
    else:
        return general_chain.invoke(input_dict)

chain = RunnableLambda(smart_route)
\`\`\``,

    '4.5': `# Error Handling, Retries & Fallbacks

## The Problem

LLM calls can fail: rate limits, network errors, malformed output. Production chains need resilience.

## Retry Logic

\`\`\`python
from langchain_openai import ChatOpenAI

# Built-in retries
llm = ChatOpenAI(model="openai/gpt-4o-mini", base_url="https://openrouter.ai/api/v1", api_key=os.getenv("OPENROUTER_API_KEY"), max_retries=3)  # Retries on transient errors

# Custom retry with backoff
chain = prompt | llm | parser
chain_with_retry = chain.with_retry(
    stop_after_attempt=3,
    wait_exponential_jitter=True,
)
\`\`\`

## Fallback Chains

\`\`\`python
# Primary model with fallback to cheaper model
primary = ChatOpenAI(model="openai/gpt-4o", base_url="https://openrouter.ai/api/v1", api_key=os.getenv("OPENROUTER_API_KEY"))
fallback = ChatOpenAI(model="openai/gpt-4o-mini", base_url="https://openrouter.ai/api/v1", api_key=os.getenv("OPENROUTER_API_KEY"))

llm_with_fallback = primary.with_fallbacks([fallback])

# Chain-level fallback
primary_chain = prompt | primary | parser
fallback_chain = simple_prompt | fallback | parser

chain = primary_chain.with_fallbacks([fallback_chain])
\`\`\`

## Output Validation

\`\`\`python
from langchain_core.runnables import RunnableLambda

def validate_output(output: str) -> str:
    """Validate and clean LLM output."""
    if not output or len(output) < 10:
        raise ValueError("Output too short")
    if "I cannot" in output or "I'm sorry" in output:
        raise ValueError("Model refused to answer")
    return output

safe_chain = prompt | llm | StrOutputParser() | RunnableLambda(validate_output)
safe_chain_with_retry = safe_chain.with_retry(stop_after_attempt=2)
\`\`\`

## Graceful Degradation Pattern

\`\`\`python
def graceful_chain(input_dict):
    try:
        return advanced_chain.invoke(input_dict)
    except Exception:
        try:
            return simple_chain.invoke(input_dict)
        except Exception:
            return {"error": "Unable to process request", "input": input_dict}
\`\`\``,

    '4.6': `# Streaming -- Token-by-Token & Event Streaming

## Why Streaming Matters

Without streaming, users wait 5-10 seconds staring at a blank screen. With streaming, they see tokens appear immediately -- dramatically better UX.

## Basic Streaming

\`\`\`python
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="openai/gpt-4o-mini", base_url="https://openrouter.ai/api/v1", api_key=os.getenv("OPENROUTER_API_KEY"), streaming=True)

# Token-by-token streaming
for chunk in llm.stream("Tell me a story about a robot"):
    print(chunk.content, end="", flush=True)
\`\`\`

## Streaming with Chains

\`\`\`python
chain = prompt | llm | StrOutputParser()

for chunk in chain.stream({"topic": "AI"}):
    print(chunk, end="", flush=True)
\`\`\`

## Event Streaming (astream_events)

For complex chains, you can stream events from every step:

\`\`\`python
async for event in chain.astream_events({"topic": "AI"}, version="v2"):
    if event["event"] == "on_chat_model_stream":
        print(event["data"]["chunk"].content, end="")
    elif event["event"] == "on_chain_end":
        print("\\n--- Chain complete ---")
\`\`\`

## Streaming Best Practices

1. Always use \`StrOutputParser()\` -- it makes chunks concatenatable
2. Use \`flush=True\` when printing to avoid buffering
3. For web apps, use Server-Sent Events (SSE) to push chunks to the client
4. Not all steps support streaming -- only LLM calls stream tokens; parsers batch`,
  }

  // Return the content or a generated default
  return contentMap[topicId] || generateDefaultContent(topicId, title)
}

function generateDefaultContent(topicId: string, title: string): string {
  return `# ${title}

## Overview

This lesson covers **${title}** -- a critical concept for building production LLM applications with LangChain.

## Why This Matters

Understanding ${title.toLowerCase()} is essential because it directly impacts the quality, reliability, and scalability of your LLM applications. This concept builds on everything you've learned so far and prepares you for the more advanced topics ahead.

## Key Concepts

### Core Principle
The fundamental idea behind ${title.toLowerCase()} is about composing LLM components in a way that is maintainable, testable, and production-ready.

### How It Works
When building with LangChain, this pattern follows a specific workflow:

1. **Define** your components (prompts, models, parsers, tools)
2. **Compose** them using LCEL or LangGraph
3. **Test** with representative inputs
4. **Monitor** with tracing (LangFuse/LangSmith)
5. **Iterate** based on evaluation results

### Code Example

\`\`\`python
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate

# This pattern is central to ${title.toLowerCase()}
llm = ChatOpenAI(model="openai/gpt-4o-mini", base_url="https://openrouter.ai/api/v1", api_key=os.getenv("OPENROUTER_API_KEY"), temperature=0)

# Build your pipeline
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are an expert assistant."),
    ("human", "{input}")
])

chain = prompt | llm
\`\`\`

## Real-World Application

In production systems, ${title.toLowerCase()} is used to solve problems like:
- Building reliable data pipelines that process thousands of documents
- Creating agents that interact with external APIs and databases
- Designing multi-step workflows that handle failures gracefully

## Best Practices

1. Always start simple and add complexity incrementally
2. Test each component independently before composing
3. Use tracing to understand the flow of data through your pipeline
4. Handle errors gracefully with fallbacks and retries
5. Monitor token usage and costs in production

## Common Pitfalls

- Overcomplicating the pipeline before understanding each component
- Not handling edge cases in LLM output
- Ignoring token limits and cost implications
- Skipping evaluation before deploying to production

## What's Next

In the next lesson, we'll build on this foundation to tackle more complex patterns. Make sure you're comfortable with the concepts here before moving forward.`
}

function generateQuizQuestions(topicId: string, title: string): QuizQuestion[] {
  const quizMap: Record<string, QuizQuestion[]> = {
    '4.1': [
      {
        question: 'What does the pipe operator (|) do in LCEL?',
        options: ['Filters data', 'Connects Runnables in sequence so output feeds into input', 'Creates parallel execution', 'Handles errors'],
        correctIndex: 1,
        explanation: 'The pipe operator connects Runnables sequentially -- the output of one becomes the input of the next, creating a processing pipeline.'
      },
      {
        question: 'What is a Runnable in LangChain?',
        options: ['A Python script that runs automatically', 'An object that implements invoke(), batch(), and stream() methods', 'A Docker container for LLM deployment', 'A type of LLM model'],
        correctIndex: 1,
        explanation: 'A Runnable is any object implementing the Runnable protocol: invoke(), batch(), stream(), and their async variants. All LCEL components are Runnables.'
      },
      {
        question: 'Why should you use LCEL instead of legacy chain classes like LLMChain?',
        options: ['LCEL is faster', 'LCEL provides composability, automatic streaming, async support, and is the modern standard', 'Legacy chains cost less', 'There is no difference'],
        correctIndex: 1,
        explanation: 'LCEL provides composability, automatic streaming and async support, debugging, and is the actively maintained standard. Legacy chains are deprecated.'
      },
      {
        question: 'In a chain like `prompt | llm | parser`, what happens if you call chain.stream()?',
        options: ['Only the LLM streams', 'The entire chain supports streaming automatically', 'Streaming is not supported in chains', 'You need to enable streaming for each component'],
        correctIndex: 1,
        explanation: 'When you call stream() on an LCEL chain, it automatically handles streaming through the pipeline. LLM tokens stream through the parser to the output.'
      }
    ],
    '5.2': [
      {
        question: 'Why is text splitting (chunking) important for RAG applications?',
        options: ['It makes documents smaller to save storage', 'LLMs have context limits, and smaller focused chunks improve retrieval relevance', 'It speeds up embedding generation', 'It is not important -- you should use full documents'],
        correctIndex: 1,
        explanation: 'Chunking is critical because LLMs have context limits, and retrieval works best when chunks are focused on a single topic -- overly large chunks dilute relevance.'
      },
      {
        question: 'What problem does recursive character text splitting solve compared to naive splitting?',
        options: ['It splits by sentences, then characters, preserving semantic boundaries', 'It splits text faster', 'It compresses the text while splitting', 'It removes duplicate content'],
        correctIndex: 0,
        explanation: 'Recursive splitting tries a hierarchy of separators (paragraphs → sentences → words → characters), preserving natural semantic boundaries where possible.'
      },
      {
        question: 'What is the purpose of chunk overlap?',
        options: ['To increase the document count', 'To ensure context is not lost at chunk boundaries', 'To make embeddings more accurate', 'To reduce costs'],
        correctIndex: 1,
        explanation: 'Chunk overlap ensures that information spanning a chunk boundary is preserved in both chunks, preventing loss of context at split points.'
      },
      {
        question: 'What chunk size should you start with for most RAG applications?',
        options: ['50-100 tokens', '500-1000 tokens', '5000-10000 tokens', 'The full document'],
        correctIndex: 1,
        explanation: '500-1000 tokens is a good starting point. Too small and you lose context; too large and you dilute relevance. Always evaluate and tune for your specific use case.'
      }
    ],
    '6.1': [
      {
        question: 'What is a text embedding?',
        options: ['A compressed version of text', 'A numerical vector representation that captures semantic meaning', 'A hash of the text for quick lookup', 'An encryption of the text'],
        correctIndex: 1,
        explanation: 'An embedding is a dense numerical vector that captures the semantic meaning of text. Similar meanings produce vectors that are close together in vector space.'
      },
      {
        question: 'Why are embeddings useful for search/retrieval?',
        options: ['They make text shorter', 'Similar meanings produce similar vectors, enabling semantic search beyond keyword matching', 'They speed up database queries', 'They reduce API costs'],
        correctIndex: 1,
        explanation: 'Embeddings enable semantic search -- finding text with similar meaning regardless of exact words used. "automobile" and "car" would have similar embeddings.'
      },
      {
        question: 'What is cosine similarity used for in the context of embeddings?',
        options: ['Compressing embeddings', 'Measuring how similar two embedding vectors are (how close their meanings are)', 'Generating new embeddings', 'Training embedding models'],
        correctIndex: 1,
        explanation: 'Cosine similarity measures the angle between two vectors. A value close to 1 means the texts have very similar meanings; close to 0 means they are unrelated.'
      },
      {
        question: 'What is a vector store?',
        options: ['A regular SQL database', 'A specialized database optimized for storing and searching embedding vectors efficiently', 'A file system for storing vectors', 'A type of LLM'],
        correctIndex: 1,
        explanation: 'A vector store is a database specifically designed to store embedding vectors and perform fast similarity searches across potentially millions of vectors.'
      }
    ],
    '7.1': [
      {
        question: 'What does RAG stand for and what problem does it solve?',
        options: ['Random Access Generation -- speeds up LLM responses', 'Retrieval-Augmented Generation -- grounds LLM responses in specific, relevant data', 'Recursive Agent Graph -- creates complex workflows', 'Real-time AI Gateway -- connects to live data'],
        correctIndex: 1,
        explanation: 'RAG (Retrieval-Augmented Generation) solves the problem of LLMs not having access to your specific data. It retrieves relevant documents and includes them as context for the LLM.'
      },
      {
        question: 'What are the core steps of a RAG pipeline?',
        options: ['Train → Fine-tune → Deploy', 'Load → Split → Embed → Store → Retrieve → Generate', 'Prompt → Call → Parse', 'Index → Search → Rank'],
        correctIndex: 1,
        explanation: 'A RAG pipeline: loads documents, splits them into chunks, generates embeddings, stores in a vector database, retrieves relevant chunks for a query, and generates an answer using the LLM with those chunks as context.'
      },
      {
        question: 'When should you use RAG instead of fine-tuning?',
        options: ['When you need to access frequently changing data or specific documents', 'When you want to change the model\'s writing style', 'When you need faster inference', 'When you want to reduce model size'],
        correctIndex: 0,
        explanation: 'RAG is ideal for dynamic data, specific document collections, and when you need source attribution. Fine-tuning is better for changing behavior/style permanently.'
      },
      {
        question: 'What is the role of the retriever in a RAG pipeline?',
        options: ['It trains the LLM on new data', 'It fetches the most relevant document chunks for a given query', 'It generates the final response', 'It splits documents into chunks'],
        correctIndex: 1,
        explanation: 'The retriever takes the user\'s query, searches the vector store for the most semantically similar document chunks, and returns them as context for the LLM to use when generating its response.'
      }
    ],
    '9.1': [
      {
        question: 'Why are LLMs fundamentally stateless?',
        options: ['They forget after each API call -- each request is independent with no memory of previous interactions', 'They have limited storage', 'They are designed to be stateless for security', 'They are not stateless -- they remember everything'],
        correctIndex: 0,
        explanation: 'Each LLM API call is completely independent. The model has no built-in mechanism to remember previous interactions. Every conversation context must be re-sent with each call.'
      },
      {
        question: 'How does LangChain implement conversation memory?',
        options: ['By training the model on conversation history', 'By storing messages and re-injecting them into the prompt as context for each new call', 'By saving state inside the LLM model weights', 'By using browser cookies'],
        correctIndex: 1,
        explanation: 'LangChain memory works by storing conversation messages and including them in the prompt context for each new LLM call. The LLM sees the history as part of its input.'
      },
      {
        question: 'What is the tradeoff of including full conversation history in every LLM call?',
        options: ['It makes responses more creative', 'Longer histories consume more tokens (cost) and can exceed context window limits', 'It speeds up response time', 'There is no tradeoff'],
        correctIndex: 1,
        explanation: 'Full conversation history grows with each turn, consuming more tokens (cost) and eventually exceeding the context window. This is why memory management strategies (summarization, windowing) are needed.'
      },
      {
        question: 'Which memory type would you use for a chatbot with very long conversations?',
        options: ['BufferMemory (store everything)', 'SummaryMemory (summarize older turns, keep recent ones)', 'No memory (stateless is fine)', 'File-based memory'],
        correctIndex: 1,
        explanation: 'SummaryMemory (or ConversationSummaryBufferMemory) summarizes older conversation turns while keeping recent ones verbatim. This balances context retention with token limits.'
      }
    ],
    '10.1': [
      {
        question: 'What are "tools" in the context of LangChain agents?',
        options: ['IDE plugins for writing code', 'Functions that LLMs can choose to call to interact with external systems', 'Debugging utilities for developers', 'Training scripts for LLMs'],
        correctIndex: 1,
        explanation: 'Tools are functions (search, calculators, APIs, databases) that LLMs can decide to call when they need capabilities beyond text generation -- like looking up real-time data or performing calculations.'
      },
      {
        question: 'How does an LLM "decide" which tool to use?',
        options: ['The developer hardcodes the tool selection', 'The LLM receives tool descriptions and selects the appropriate one based on the user query', 'Tools are selected randomly', 'All tools are called every time'],
        correctIndex: 1,
        explanation: 'Each tool has a name and description. The LLM reads these descriptions and reasons about which tool(s) to call based on the user\'s query -- this is the core of agent behavior.'
      },
      {
        question: 'What is the difference between tool calling and function calling?',
        options: ['They are completely different concepts', 'They are the same concept -- "function calling" is the older term, "tool calling" is the modern standard', 'Function calling is for Python, tool calling is for JavaScript', 'Tool calling is faster'],
        correctIndex: 1,
        explanation: 'Function calling and tool calling refer to the same capability. "Function calling" was the original OpenAI term; "tool calling" is the standardized modern term used across providers.'
      },
      {
        question: 'Why is a tool\'s description critical for agent performance?',
        options: ['It affects the tool\'s execution speed', 'The LLM uses the description to decide WHEN to use the tool -- a bad description leads to wrong tool selection', 'It is shown to the end user', 'It is only for documentation purposes'],
        correctIndex: 1,
        explanation: 'The LLM relies on tool descriptions to decide which tool to use and when. A vague or misleading description causes the agent to use the wrong tool or miss using the right one.'
      }
    ],
    '11.1': [
      {
        question: 'What distinguishes an agent from a chain?',
        options: ['Agents are faster', 'Agents decide what to do at runtime based on LLM reasoning, while chains follow a fixed sequence', 'Agents don\'t use LLMs', 'Chains can\'t use tools'],
        correctIndex: 1,
        explanation: 'Chains follow a predetermined sequence of steps. Agents use LLM reasoning to dynamically decide which tools to call, in what order, and when to stop -- the execution path is not fixed.'
      },
      {
        question: 'What is the ReAct pattern?',
        options: ['A JavaScript framework for LLMs', 'A loop of Reasoning (think about what to do) → Acting (call a tool) → Observing (see the result) → Repeat', 'A way to make LLMs respond faster', 'A testing framework for agents'],
        correctIndex: 1,
        explanation: 'ReAct (Reason + Act) is an agent pattern: the LLM reasons about the task, decides on an action (tool call), observes the result, and repeats until the task is complete.'
      },
      {
        question: 'What is the risk of giving an agent too many tools?',
        options: ['It runs out of memory', 'The LLM struggles to select the right tool, and tool descriptions consume context tokens', 'It becomes too fast', 'There is no risk'],
        correctIndex: 1,
        explanation: 'Too many tools overwhelm the LLM\'s decision-making (it picks wrong tools or gets confused) and consume context window space with descriptions. Keep tool sets focused.'
      },
      {
        question: 'When should you use an agent instead of a chain?',
        options: ['Always -- agents are strictly better', 'When the execution path depends on intermediate results and cannot be predetermined', 'Only for chatbots', 'Never -- chains are always sufficient'],
        correctIndex: 1,
        explanation: 'Use agents when the next step depends on previous results (dynamic routing). Use chains when you know the exact sequence of steps in advance (deterministic flow).'
      }
    ],
    '12.1': [
      {
        question: 'What problem does LangGraph solve that basic chains and agents don\'t?',
        options: ['It makes LLM calls faster', 'It enables complex workflows with cycles, branching, state persistence, and human-in-the-loop patterns', 'It reduces API costs', 'It provides better prompts'],
        correctIndex: 1,
        explanation: 'LangGraph handles workflows that need cycles (loops back), branching logic, persistent state across steps, human approval points, and error recovery -- patterns too complex for linear chains.'
      },
      {
        question: 'What are the three core concepts of LangGraph?',
        options: ['Prompt, Model, Parser', 'Nodes (functions), Edges (connections), State (shared data)', 'Input, Process, Output', 'Agent, Tool, Memory'],
        correctIndex: 1,
        explanation: 'LangGraph is built on three concepts: Nodes (functions that process data), Edges (connections defining flow between nodes), and State (a shared data object passed between nodes).'
      },
      {
        question: 'How does LangGraph differ from LCEL chains?',
        options: ['LangGraph is a separate library, LCEL is built into LangChain', 'LangGraph supports cycles (loops) and conditional branching; LCEL is linear', 'There is no difference', 'LangGraph is only for agents'],
        correctIndex: 1,
        explanation: 'LCEL chains are DAGs (directed acyclic graphs) -- no loops. LangGraph supports cycles (a node can route back to a previous node), conditional edges, and persistent state management.'
      },
      {
        question: 'In LangGraph, what is "state"?',
        options: ['The current status of the API', 'A shared data object (TypedDict) that nodes read from and write to as data flows through the graph', 'The geographic location of the server', 'The model\'s internal weights'],
        correctIndex: 1,
        explanation: 'State in LangGraph is a TypedDict that acts as shared memory for the graph. Each node receives the current state, can read and modify it, and passes the updated state to the next node.'
      }
    ],
    '14.1': [
      {
        question: 'What is a multi-agent system?',
        options: ['Multiple users chatting with one LLM', 'Multiple specialized LLM agents collaborating to solve complex tasks', 'A single agent with multiple tools', 'A load-balanced LLM deployment'],
        correctIndex: 1,
        explanation: 'A multi-agent system uses multiple specialized LLM agents -- each with focused expertise and tools -- that collaborate, delegate, and coordinate to solve problems too complex for a single agent.'
      },
      {
        question: 'What is the "supervisor" pattern in multi-agent systems?',
        options: ['A human monitoring all agents', 'One agent that routes tasks to specialist agents and synthesizes their results', 'A backup agent that takes over on failures', 'An agent that trains other agents'],
        correctIndex: 1,
        explanation: 'The supervisor pattern has a central agent that understands the overall task, delegates subtasks to specialist agents (researcher, coder, writer, etc.), and synthesizes the final result.'
      },
      {
        question: 'Why would you use multiple agents instead of one powerful agent?',
        options: ['It\'s always cheaper', 'Specialization: each agent has focused tools and prompts, reducing complexity and improving reliability', 'Multiple agents are always faster', 'There\'s no good reason -- single agents are always better'],
        correctIndex: 1,
        explanation: 'Specialization reduces each agent\'s complexity (fewer tools, more focused prompts), making them more reliable. A "research agent" with search tools outperforms a single agent juggling research, coding, and writing.'
      },
      {
        question: 'What is "agent handoff"?',
        options: ['Shutting down an agent', 'Transferring context and control from one agent to another mid-conversation', 'Copying an agent\'s configuration', 'An agent passing results to a database'],
        correctIndex: 1,
        explanation: 'Agent handoff transfers the conversation context and control from one agent to another -- for example, a triage agent handing off to a billing specialist agent with the relevant context intact.'
      }
    ],
    '15.1': [
      {
        question: 'Why is observability especially important for LLM applications compared to traditional software?',
        options: ['LLM APIs are unreliable', 'LLM behavior is probabilistic -- the same input can produce different outputs, making debugging without traces nearly impossible', 'LLMs are too expensive without monitoring', 'It is equally important for all software'],
        correctIndex: 1,
        explanation: 'LLM applications are non-deterministic. Without tracing every call, retrieval, and tool use, debugging failures in complex chains and agents is nearly impossible -- you can\'t reproduce bugs by reading the code.'
      },
      {
        question: 'What does a "trace" capture in LLM observability?',
        options: ['Only the final LLM output', 'The complete execution path: every LLM call, retrieval, tool use, inputs, outputs, latency, and token usage', 'Only errors and exceptions', 'The model\'s training data used'],
        correctIndex: 1,
        explanation: 'A trace captures the full execution path of a request through your application -- every LLM call with its prompt and response, every retrieval query and results, every tool call, timing, and token counts.'
      },
      {
        question: 'What is the difference between LangFuse and LangSmith?',
        options: ['LangFuse is open-source and self-hostable; LangSmith is a commercial product by LangChain Inc.', 'They are the same product', 'LangFuse is only for Python; LangSmith is only for JavaScript', 'LangSmith is open-source; LangFuse is commercial'],
        correctIndex: 0,
        explanation: 'LangFuse is open-source (MIT license), can be self-hosted, and has a free cloud tier. LangSmith is a commercial SaaS product by LangChain Inc. with a free developer tier. Both provide tracing and evaluation.'
      },
      {
        question: 'When should you add observability to your LLM application?',
        options: ['Only in production', 'Only during debugging', 'From the very start -- during development, testing, and production', 'Only when users report issues'],
        correctIndex: 2,
        explanation: 'Add tracing from day one. During development it helps you debug chains. During testing it validates behavior. In production it monitors quality, costs, and catches regressions.'
      }
    ],
    '17.1': [
      {
        question: 'What is the recommended project structure for a production LangChain application?',
        options: ['Everything in one file', 'Separate modules for chains, prompts, tools, config, and tests with clear boundaries', 'Follow Django project structure', 'There is no recommended structure'],
        correctIndex: 1,
        explanation: 'Production LangChain apps should have clear separation: config/ (settings, API keys), prompts/ (templates), chains/ (LCEL pipelines), tools/ (custom tools), agents/ (agent definitions), and tests/.'
      },
      {
        question: 'Why is async execution important for production LLM applications?',
        options: ['It makes individual LLM calls faster', 'It enables concurrent processing -- handling multiple requests simultaneously without blocking', 'It reduces token costs', 'It is not important'],
        correctIndex: 1,
        explanation: 'LLM calls take 1-30 seconds. With synchronous code, your server blocks during each call. Async enables handling thousands of concurrent requests without requiring thousands of threads.'
      },
      {
        question: 'What is semantic caching for LLM applications?',
        options: ['Caching LLM model weights locally', 'Caching responses for semantically similar queries -- "What is Python?" and "Tell me about Python" hit the same cache', 'Caching API keys', 'Caching embeddings only'],
        correctIndex: 1,
        explanation: 'Semantic caching uses embeddings to identify similar (not identical) queries and return cached responses. This reduces costs and latency for queries that are semantically the same.'
      },
      {
        question: 'What should you monitor in a production LLM application?',
        options: ['Only errors', 'Cost, latency, quality (evaluations), error rates, and user satisfaction -- all tracked per chain/agent', 'Only token usage', 'Only uptime'],
        correctIndex: 1,
        explanation: 'Production monitoring covers: cost (token usage per chain), latency (response times), quality (automated evaluations, user feedback), error rates, and system health -- all attributed to specific components.'
      }
    ],
  }

  return quizMap[topicId] || [
    {
      question: `Which of the following best describes the concept of ${title}?`,
      options: [
        `A technique for optimizing LLM performance`,
        `A core LangChain pattern for building reliable applications`,
        `A way to reduce API costs`,
        `A debugging tool for LLM applications`
      ],
      correctIndex: 1,
      explanation: `${title} is a fundamental pattern in the LangChain ecosystem for building reliable, production-ready LLM applications.`
    },
    {
      question: `When would you use ${title} in a real-world LLM application?`,
      options: [
        `Only during initial development`,
        `Only in production environments`,
        `Whenever you need to build robust, maintainable LLM pipelines`,
        `Only when debugging issues`
      ],
      correctIndex: 2,
      explanation: `${title} is applicable throughout the development lifecycle -- from prototyping to production -- whenever you need reliable LLM application behavior.`
    },
    {
      question: `What is a key benefit of understanding ${title}?`,
      options: [
        `It makes LLM calls free`,
        `It enables you to build production-grade LLM applications`,
        `It replaces the need for testing`,
        `It eliminates all LLM errors`
      ],
      correctIndex: 1,
      explanation: `Understanding ${title} is essential for building applications that can handle real-world usage -- with proper error handling, scalability, and maintainability.`
    },
    {
      question: `How does ${title} relate to other LangChain concepts?`,
      options: [
        `It replaces all other concepts`,
        `It is independent and unrelated`,
        `It builds upon and integrates with chains, agents, and other LangChain components`,
        `It only works with specific LLM providers`
      ],
      correctIndex: 2,
      explanation: `${title} integrates with the broader LangChain ecosystem -- it works alongside chains, agents, memory, and other components to create complete applications.`
    }
  ]
}

function generateCodingTask(topicId: string, title: string): CodingTask {
  const taskMap: Record<string, CodingTask> = {
    '4.2': {
      instructions: 'Build a multi-step text analysis pipeline using LCEL. Create a chain that: (1) Takes raw text input, (2) Cleans it (via RunnableLambda), (3) Runs it through two parallel analyses using RunnableParallel -- one for sentiment and one for key entities extraction, (4) Combines the results into a final summary. Use StrOutputParser for each LLM call.',
      boilerplate: `from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnableParallel, RunnableLambda

llm = ChatOpenAI(model="openai/gpt-4o-mini", base_url="https://openrouter.ai/api/v1", api_key=os.getenv("OPENROUTER_API_KEY"), temperature=0)

# TODO: Create a clean_text function (strip whitespace, limit length)
# TODO: Create sentiment_chain (prompt | llm | parser)
# TODO: Create entities_chain (prompt | llm | parser)
# TODO: Create parallel analysis using RunnableParallel
# TODO: Create a combine function that formats the final output
# TODO: Build the full pipeline

def analyze_text(text: str) -> str:
    # TODO: Run the full pipeline
    pass

if __name__ == "__main__":
    print(analyze_text("Apple announced the new iPhone 15 today. The stock rose 3%. Investors are optimistic about the new features."))`,
      rubric: [
        'Uses RunnableLambda for text cleaning',
        'Creates separate sentiment and entity extraction chains',
        'Uses RunnableParallel to run both analyses simultaneously',
        'Has a combining step that formats the parallel results',
        'Full pipeline works end-to-end',
        'Uses StrOutputParser correctly'
      ],
      hints: [
        'Clean function: RunnableLambda(lambda x: x.strip()[:1000])',
        'Parallel: RunnableParallel(sentiment=sentiment_chain, entities=entities_chain)',
        'The parallel step outputs a dict -- your combine function receives {"sentiment": "...", "entities": "..."}'
      ],
      solutionCode: ''
    },
  }

  return taskMap[topicId] || {
    instructions: `Implement the core concepts from "${title}". Create a working Python function that demonstrates the key pattern covered in this lesson. Your code should use LangChain components (ChatOpenAI, prompts, chains, parsers as appropriate) and handle edge cases properly. Follow the TODO comments in the boilerplate.`,
    boilerplate: `from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

llm = ChatOpenAI(model="openai/gpt-4o-mini", base_url="https://openrouter.ai/api/v1", api_key=os.getenv("OPENROUTER_API_KEY"), temperature=0)

# TODO: Implement the main function for this topic
# The function should demonstrate the key concept of "${title}"
# Use appropriate LangChain components

def main_function(input_text: str) -> str:
    """Implement ${title} pattern."""
    # TODO: Build prompt template
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a helpful assistant."),
        ("human", "{input}")
    ])

    # TODO: Create and execute the chain
    chain = prompt | llm | StrOutputParser()

    # TODO: Return the result
    return chain.invoke({"input": input_text})


if __name__ == "__main__":
    result = main_function("Test input for ${title}")
    print(result)`,
    rubric: [
      'Uses appropriate LangChain imports',
      'Implements the core pattern correctly',
      'Uses ChatPromptTemplate for prompt construction',
      'Chains components using LCEL pipe operator',
      'Returns a meaningful result',
      'Handles edge cases'
    ],
    hints: [
      'Start by importing the necessary LangChain components',
      'Use ChatPromptTemplate.from_messages() for chat model prompts',
      'Chain components with the pipe operator: prompt | llm | parser'
    ],
    solutionCode: ''
  }
}

// Helper: Get all topics flat
export function getAllTopics(): (Topic & { chapterId: number; chapterTitle: string })[] {
  return curriculum.flatMap(chapter =>
    chapter.topics.map(topic => ({
      ...topic,
      chapterId: chapter.id,
      chapterTitle: chapter.title,
    }))
  )
}

// Helper: Get topic by ID
export function getTopicById(topicId: string): (Topic & { chapterId: number; chapterTitle: string }) | undefined {
  return getAllTopics().find(t => t.id === topicId)
}

// Helper: Get next topic
export function getNextTopic(currentTopicId: string): string | null {
  const all = getAllTopics()
  const idx = all.findIndex(t => t.id === currentTopicId)
  if (idx === -1 || idx === all.length - 1) return null
  return all[idx + 1].id
}

// Helper: Get previous topic
export function getPrevTopic(currentTopicId: string): string | null {
  const all = getAllTopics()
  const idx = all.findIndex(t => t.id === currentTopicId)
  if (idx <= 0) return null
  return all[idx - 1].id
}

// Total XP in the course
export function getTotalXP(): number {
  return getAllTopics().reduce((sum, t) => sum + t.xp, 0)
}

// ═══════════════════════════════════════════════════════════════
// MULTI-COURSE TYPES & DATA
// ═══════════════════════════════════════════════════════════════

export type Milestone = {
  id: string
  title: string
  xp: number
  instructions: string
  boilerplate: string
  rubric: string[]
  hints: string[]
  solutionCode: string
}

export type Project = {
  id: string
  title: string
  description: string
  milestones: Milestone[]
}

export type Course = {
  id: string
  title: string
  tagline: string
  description: string
  icon: string
  level: 'beginner' | 'intermediate' | 'advanced'
  estimatedHours: number
  tags: string[]
  // Five course-specific level titles, from beginner (index 0) to expert (index 4).
  // Used on dashboard course cards instead of generic global titles.
  levelTitles: [string, string, string, string, string]
  chapters: Chapter[]
  project: Project
}

export const courses: Course[] = [
  {
    id: 'promptpath-starter',
    title: 'LangChain: Zero to Production',
    tagline: 'Build production-ready AI applications from the ground up',
    description: 'A complete, hands-on journey through the LangChain ecosystem. Start from the fundamentals of LLMs, work through prompt engineering, chains, RAG, agents, and LangGraph, and finish by building a production-grade AI application. Every chapter includes lessons, quizzes, and coding challenges.',
    icon: '🦜',
    level: 'beginner',
    estimatedHours: 40,
    tags: ['LangChain', 'LangGraph', 'LangSmith', 'Python', 'RAG', 'Agents'],
    levelTitles: ['LangChain Beginner', 'Chain Builder', 'RAG Engineer', 'Agent Developer', 'LangChain Architect'],
    chapters: curriculum,
    project: {
      id: 'research-assistant',
      title: 'Build a LangChain Research Assistant',
      description: 'Put everything you\'ve learned into practice by building a full-featured AI research assistant. You\'ll work through four guided milestones -- document ingestion, RAG Q&A, conversational memory, and a multi-tool agent -- culminating in a production-ready LangChain application you can showcase.',
      milestones: [
        {
          id: 'milestone-1',
          title: 'Document Ingestion Pipeline',
          xp: 200,
          instructions: `Build a document ingestion pipeline that loads PDF files, splits them into semantically meaningful chunks, generates embeddings, and stores them in a ChromaDB vector store.

Your function \`build_vector_store(pdf_paths: list[str]) -> Chroma\` must:
1. Load each PDF using PyPDFLoader
2. Split documents using RecursiveCharacterTextSplitter with chunk_size=1000, chunk_overlap=200
3. Create embeddings using HuggingFaceEmbeddings
4. Persist everything in a ChromaDB instance at "./chroma_db"
5. Return the Chroma vector store object

Also write \`count_chunks(pdf_paths: list[str]) -> int\` that returns the total number of chunks created.`,
          boilerplate: `from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from dotenv import load_dotenv

load_dotenv()


def build_vector_store(pdf_paths: list[str]) -> Chroma:
    """Load PDFs, split, embed, and store in ChromaDB.

    Args:
        pdf_paths: List of paths to PDF files

    Returns:
        Chroma vector store instance
    """
    # TODO: Load all PDFs using PyPDFLoader
    # TODO: Split documents with chunk_size=1000, chunk_overlap=200
    # TODO: Create HuggingFaceEmbeddings (model_name="all-MiniLM-L6-v2")
    # TODO: Create and persist Chroma vector store at "./chroma_db"
    # TODO: Return the Chroma instance
    pass


def count_chunks(pdf_paths: list[str]) -> int:
    """Return the total number of chunks that would be created."""
    # TODO: Use the same loading and splitting logic, return len(chunks)
    pass


if __name__ == "__main__":
    # Test with any PDF you have
    import os
    sample_pdfs = [f for f in os.listdir(".") if f.endswith(".pdf")]
    if sample_pdfs:
        store = build_vector_store(sample_pdfs)
        print(f"Vector store created with {count_chunks(sample_pdfs)} chunks")
        # Test a similarity search
        results = store.similarity_search("What is the main topic?", k=3)
        print(f"Found {len(results)} relevant chunks")
    else:
        print("No PDFs found. Create a sample PDF to test.")`,
          rubric: [
            'Loads PDFs using PyPDFLoader for each path in the list',
            'Uses RecursiveCharacterTextSplitter with chunk_size=1000 and chunk_overlap=200',
            'Creates HuggingFaceEmbeddings correctly',
            'Persists Chroma store at "./chroma_db" with the persist_directory parameter',
            'Returns the Chroma instance from build_vector_store',
            'count_chunks applies same loading/splitting and returns len(chunks)',
            'Handles empty pdf_paths list gracefully',
          ],
          hints: [
            'Loop over pdf_paths and use PyPDFLoader(path).load() for each, collect all documents',
            'RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200).split_documents(docs)',
            'Chroma.from_documents(chunks, embedding, persist_directory="./chroma_db") creates and persists in one step',
          ],
          solutionCode: '',
        },
        {
          id: 'milestone-2',
          title: 'RAG-Powered Q&A Chain',
          xp: 250,
          instructions: `Using the vector store from Milestone 1, build a RAG (Retrieval-Augmented Generation) Q&A chain that answers questions grounded in your document collection.

Your function \`create_rag_chain(vector_store: Chroma) -> Runnable\` must:
1. Create a retriever from the vector store (top 4 results)
2. Build a ChatPromptTemplate with system + human messages -- the system message should include the retrieved context and instruct the model to only answer from the provided documents
3. Compose the chain: retriever → context formatting → prompt → ChatOpenAI → StrOutputParser
4. Return the chain (it should accept {"question": str} and return a string answer)

Also write \`ask(chain, question: str) -> str\` as a thin wrapper that invokes the chain and returns the answer.`,
          boilerplate: `from langchain_chroma import Chroma
from langchain_openai import ChatOpenAI
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough, Runnable
from dotenv import load_dotenv

load_dotenv()


def format_docs(docs) -> str:
    """Join retrieved document content into a single string."""
    return "\\n\\n".join(doc.page_content for doc in docs)


def create_rag_chain(vector_store: Chroma) -> Runnable:
    """Build a RAG chain that retrieves context and answers questions.

    Args:
        vector_store: Chroma instance with embedded documents

    Returns:
        An LCEL chain accepting {"question": str} and returning str
    """
    # TODO: Create a retriever with k=4
    # TODO: Build a ChatPromptTemplate -- system message should include {context}
    #       and tell the model to answer ONLY from the provided documents
    # TODO: Compose the chain using LCEL (| operator)
    #       retriever + format_docs → context, passthrough → question → prompt → llm → parser
    pass


def ask(chain: Runnable, question: str) -> str:
    """Ask a question to the RAG chain and return the answer."""
    # TODO: Invoke the chain with {"question": question}
    pass


if __name__ == "__main__":
    embedding = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    store = Chroma(persist_directory="./chroma_db", embedding_function=embedding)
    chain = create_rag_chain(store)
    answer = ask(chain, "What are the main topics covered in the documents?")
    print("Answer:", answer)`,
          rubric: [
            'Creates retriever with search_kwargs={"k": 4}',
            'ChatPromptTemplate includes both system and human message templates',
            'System message uses {context} placeholder for retrieved documents',
            'System message instructs model to answer only from provided documents',
            'Chain uses RunnablePassthrough for question and format_docs for context',
            'Chain composes: context+question → prompt → llm → StrOutputParser',
            'ask() correctly invokes the chain with {"question": question}',
          ],
          hints: [
            'retriever = vector_store.as_retriever(search_kwargs={"k": 4})',
            'Use RunnablePassthrough.assign(context=...) or {"context": retriever | format_docs, "question": RunnablePassthrough()}',
            'ChatPromptTemplate.from_messages([("system", "Use the following context...\\n\\n{context}"), ("human", "{question}")])',
          ],
          solutionCode: '',
        },
        {
          id: 'milestone-3',
          title: 'Conversational Memory',
          xp: 200,
          instructions: `Upgrade your RAG chain to support multi-turn conversations. The assistant should remember what was said earlier in the session and use that context when answering follow-up questions.

Build a \`ConversationalRAGAssistant\` class with:
- \`__init__(self, vector_store: Chroma)\` -- sets up the retriever, LLM, and an internal message history list
- \`chat(self, question: str) -> str\` -- adds the question to history, runs the RAG chain with full history, adds the response to history, returns the answer
- \`get_history(self) -> list\` -- returns the current message history
- \`reset(self)\` -- clears the history

The chain inside must include the chat history in the prompt so the model can reference earlier exchanges. Use \`HumanMessage\` and \`AIMessage\` objects for history.`,
          boilerplate: `from langchain_chroma import Chroma
from langchain_openai import ChatOpenAI
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage
from dotenv import load_dotenv

load_dotenv()


class ConversationalRAGAssistant:
    """A RAG assistant that maintains conversation history."""

    def __init__(self, vector_store: Chroma):
        # TODO: Create retriever (k=4)
        # TODO: Create ChatOpenAI LLM
        # TODO: Build a ChatPromptTemplate that includes:
        #       - A system message with {context}
        #       - A MessagesPlaceholder for {history}
        #       - A human message for {question}
        # TODO: Compose the chain
        # TODO: Initialize self._history as empty list
        pass

    def chat(self, question: str) -> str:
        """Send a message and get a response, maintaining history."""
        # TODO: Retrieve context for the question
        # TODO: Add HumanMessage(question) to history
        # TODO: Invoke the chain with context, history, and question
        # TODO: Add AIMessage(response) to history
        # TODO: Return the response string
        pass

    def get_history(self) -> list[BaseMessage]:
        """Return the full conversation history."""
        return self._history

    def reset(self) -> None:
        """Clear conversation history."""
        self._history = []


if __name__ == "__main__":
    embedding = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    store = Chroma(persist_directory="./chroma_db", embedding_function=embedding)
    assistant = ConversationalRAGAssistant(store)

    print(assistant.chat("What are the main topics in the documents?"))
    print(assistant.chat("Can you elaborate on the first one?"))
    print(f"History length: {len(assistant.get_history())} messages")`,
          rubric: [
            '__init__ creates a retriever with k=4',
            'Prompt includes MessagesPlaceholder for {history}',
            'Prompt includes {context} in system message',
            'history list initialized as empty in __init__',
            'chat() appends HumanMessage before invoking the chain',
            'chat() appends AIMessage after getting response',
            'chain receives context, history, and question',
            'reset() clears the history list',
          ],
          hints: [
            'Use MessagesPlaceholder(variable_name="history") in the prompt between system and human messages',
            'In chat(), retrieve docs first: docs = self._retriever.invoke(question), then format them',
            'Pass {"context": formatted_context, "history": self._history, "question": question} to the chain',
          ],
          solutionCode: '',
        },
        {
          id: 'milestone-4',
          title: 'Multi-Tool Agent',
          xp: 350,
          instructions: `Transform your research assistant into a fully autonomous agent that can decide when to search documents, perform web searches, and do calculations -- choosing the right tool for each question.

Build a \`ResearchAgent\` class with:
- \`__init__(self, vector_store: Chroma)\` -- creates the agent with three tools: a document search tool (searches your ChromaDB), a calculator tool, and a web search placeholder
- \`run(self, query: str) -> str\` -- runs the agent on a query and returns the final answer
- \`get_tool_names(self) -> list[str]\` -- returns the list of available tool names

The agent should use \`create_react_agent\` from LangGraph and the \`ToolNode\` pattern. Each tool must be decorated with \`@tool\` and have a clear docstring so the LLM knows when to use it.`,
          boilerplate: `from langchain_chroma import Chroma
from langchain_openai import ChatOpenAI
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent
from dotenv import load_dotenv
import numexpr

load_dotenv()


def build_tools(vector_store: Chroma):
    """Create and return the list of tools for the agent."""

    @tool
    def search_documents(query: str) -> str:
        """Search the document knowledge base for information relevant to the query.
        Use this when the question is about the content of the loaded documents."""
        # TODO: Use vector_store.similarity_search(query, k=4)
        # TODO: Return formatted string of results
        pass

    @tool
    def calculate(expression: str) -> str:
        """Evaluate a mathematical expression and return the result.
        Use this for any arithmetic, algebra, or numerical calculations.
        Input should be a valid Python math expression like '2 ** 10' or '(15 * 3) / 2'."""
        # TODO: Use numexpr.evaluate(expression) and return str result
        # TODO: Wrap in try/except and return error message on failure
        pass

    @tool
    def web_search(query: str) -> str:
        """Search the web for current information not found in the documents.
        Use this for recent events, real-time data, or topics outside the knowledge base."""
        # Placeholder -- in production, wire up Tavily or DuckDuckGo
        return f"[Web search placeholder] For '{query}', please check a search engine for current results."

    return [search_documents, calculate, web_search]


class ResearchAgent:
    """An autonomous agent that routes queries to the right tool."""

    def __init__(self, vector_store: Chroma):
        # TODO: Build tools
        # TODO: Create ChatOpenAI llm
        # TODO: Create the ReAct agent using create_react_agent(llm, tools)
        pass

    def run(self, query: str) -> str:
        """Run the agent on a query and return the final answer."""
        # TODO: Invoke the agent with {"messages": [("human", query)]}
        # TODO: Return the last message content from the response
        pass

    def get_tool_names(self) -> list[str]:
        """Return the names of all available tools."""
        pass


if __name__ == "__main__":
    embedding = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    store = Chroma(persist_directory="./chroma_db", embedding_function=embedding)
    agent = ResearchAgent(store)

    print("Tools:", agent.get_tool_names())
    print(agent.run("What does the document say about machine learning?"))
    print(agent.run("What is 2 to the power of 16?"))`,
          rubric: [
            'search_documents tool calls similarity_search with k=4 and formats results',
            'calculate tool uses numexpr.evaluate() with try/except error handling',
            'web_search tool has a clear docstring explaining when to use it',
            'All tools decorated with @tool and have meaningful docstrings',
            'ResearchAgent creates tools and builds the ReAct agent with create_react_agent',
            'run() invokes agent with {"messages": [("human", query)]}',
            'run() extracts and returns the final message content',
            'get_tool_names() returns names of all tools in the agent',
          ],
          hints: [
            'format search results as: "\\n\\n".join(f"[{i+1}] {doc.page_content}" for i, doc in enumerate(docs))',
            'create_react_agent(llm, tools) returns a compiled graph -- invoke it with .invoke({"messages": [("human", query)]})',
            'The response["messages"][-1].content gives the final agent answer',
          ],
          solutionCode: '',
        },
      ],
    },
  },
  {
    id: 'kubernetes-naive-to-pro',
    title: 'Kubernetes: Naive to Pro',
    tagline: 'From zero Linux knowledge to production EKS deployments',
    description: 'A complete hands-on Kubernetes journey starting from Mac terminal basics, through Docker, to running production workloads on AWS EKS.',
    icon: '☸️',
    level: 'intermediate',
    estimatedHours: 60,
    tags: ['Kubernetes', 'Docker', 'Linux', 'AWS', 'EKS', 'Helm', 'DevOps'],
    levelTitles: ['Linux Beginner', 'Container Trainee', 'K8s Operator', 'DevOps Engineer', 'Platform Architect'],
    chapters: [
      {
        id: 101,
        title: 'Linux Foundations (Mac Terminal)',
        description: 'Master the Mac terminal, bash scripting, and Linux fundamentals needed for Kubernetes.',
        part: 'Part I: Linux Foundations',
        icon: '🐧',
        topics: [
          {
            id: '101.1',
            title: 'Your Mac Terminal — Shell Basics',
            xp: 75,
            assessmentType: 'quiz' as AssessmentType,
            content: '',
            quiz: []
          },
          {
            id: '101.2',
            title: 'Files, Permissions & Ownership',
            xp: 125,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
          {
            id: '101.3',
            title: 'Processes & System Monitoring',
            xp: 100,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
          {
            id: '101.4',
            title: 'Networking Commands',
            xp: 100,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
          {
            id: '101.5',
            title: 'Bash Scripting Fundamentals',
            xp: 150,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
          {
            id: '101.6',
            title: 'SSH & Remote Access',
            xp: 75,
            assessmentType: 'quiz' as AssessmentType,
            content: '',
            quiz: []
          },
          {
            id: '101.MP',
            title: 'Linux Sysadmin Starter Script',
            xp: 250,
            assessmentType: 'mini-project' as AssessmentType,
            content: '',
            codingTask: undefined
          },
        ],
      },
      {
        id: 102,
        title: 'Docker — Containers from Zero',
        description: 'Understand containers, write Dockerfiles, and orchestrate multi-container apps.',
        part: 'Part II: Docker',
        icon: '🐳',
        topics: [
          {
            id: '102.1',
            title: 'Why Containers?',
            xp: 75,
            assessmentType: 'quiz' as AssessmentType,
            content: '',
            quiz: []
          },
          {
            id: '102.2',
            title: 'Images, Containers & Docker CLI',
            xp: 125,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
          {
            id: '102.3',
            title: 'Writing a Dockerfile',
            xp: 150,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
          {
            id: '102.4',
            title: 'Volumes & Persistent Data',
            xp: 100,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
          {
            id: '102.5',
            title: 'Docker Networking',
            xp: 125,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
          {
            id: '102.6',
            title: 'Docker Compose',
            xp: 150,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
          {
            id: '102.MP',
            title: 'Containerised Python API',
            xp: 250,
            assessmentType: 'mini-project' as AssessmentType,
            content: '',
            codingTask: undefined
          },
        ],
      },
      {
        id: 103,
        title: 'Kubernetes Architecture & Local Setup',
        description: 'Understand K8s architecture, set up minikube, and master kubectl basics.',
        part: 'Part III: Kubernetes Basics',
        icon: '☸️',
        topics: [
          {
            id: '103.1',
            title: 'What is Kubernetes?',
            xp: 75,
            assessmentType: 'quiz' as AssessmentType,
            content: '',
            quiz: []
          },
          {
            id: '103.2',
            title: 'Local Cluster Setup (Mac)',
            xp: 150,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
          {
            id: '103.3',
            title: 'kubectl Crash Course',
            xp: 125,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
          {
            id: '103.4',
            title: 'Namespaces & kubeconfig',
            xp: 100,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
          {
            id: '103.5',
            title: 'Your First YAML Manifest',
            xp: 150,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
          {
            id: '103.MP',
            title: 'Local K8s Bootstrapper',
            xp: 300,
            assessmentType: 'mini-project' as AssessmentType,
            content: '',
            codingTask: undefined
          },
        ],
      },
      {
        id: 104,
        title: 'Pods, Deployments & ReplicaSets',
        description: 'Master fundamental K8s workload resources — pods, self-healing, rolling updates.',
        part: 'Part III: Kubernetes Basics',
        icon: '🔄',
        topics: [
          {
            id: '104.1',
            title: 'Pod Lifecycle & Multi-Container Pods',
            xp: 75,
            assessmentType: 'quiz' as AssessmentType,
            content: '',
            quiz: []
          },
          {
            id: '104.2',
            title: 'ReplicaSets — Self-Healing',
            xp: 125,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
          {
            id: '104.3',
            title: 'Deployments — Rolling Updates & Rollbacks',
            xp: 175,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
          {
            id: '104.4',
            title: 'Resource Requests & Limits',
            xp: 100,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
          {
            id: '104.5',
            title: 'Labels, Selectors & Annotations',
            xp: 100,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
          {
            id: '104.MP',
            title: 'Mini-Project: Zero-Downtime Deployment',
            xp: 300,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
        ]
      },
      {
        id: 105,
        title: 'Networking & Services',
        description: 'Expose and connect your applications using Kubernetes Services and Ingress.',
        part: 'Part IV: Networking',
        icon: '🌐',
        topics: [
          {
            id: '105.1',
            title: 'K8s Networking Model',
            xp: 75,
            assessmentType: 'quiz' as AssessmentType,
            content: '',
            quiz: []
          },
          {
            id: '105.2',
            title: 'ClusterIP & NodePort Services',
            xp: 150,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
          {
            id: '105.3',
            title: 'LoadBalancer & ExternalName',
            xp: 100,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
          {
            id: '105.4',
            title: 'Ingress — HTTP Routing',
            xp: 175,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
          {
            id: '105.5',
            title: 'K8s DNS & Service Discovery',
            xp: 75,
            assessmentType: 'quiz' as AssessmentType,
            content: '',
            quiz: []
          },
          {
            id: '105.MP',
            title: 'Mini-Project: Two-Tier App Networking',
            xp: 300,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
        ]
      },
      {
        id: 106,
        title: 'Configuration & Secrets',
        description: 'Externalise configuration and securely manage sensitive data.',
        part: 'Part IV: Networking',
        icon: '⚙️',
        topics: [
          {
            id: '106.1',
            title: 'ConfigMaps — Externalising Config',
            xp: 125,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
          {
            id: '106.2',
            title: 'Secrets — Sensitive Data',
            xp: 150,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
          {
            id: '106.3',
            title: 'Environment Variable Patterns',
            xp: 100,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
          {
            id: '106.4',
            title: 'Managing Config Across Environments',
            xp: 100,
            assessmentType: 'quiz' as AssessmentType,
            content: '',
            quiz: []
          },
          {
            id: '106.MP',
            title: 'Mini-Project: Config-Driven App',
            xp: 300,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
        ]
      },
      {
        id: 107,
        title: 'Storage — Persistent Data',
        description: 'Make your data survive pod restarts with Kubernetes storage primitives.',
        part: 'Part V: Storage',
        icon: '💾',
        topics: [
          {
            id: '107.1',
            title: 'Why Storage in K8s is Hard',
            xp: 75,
            assessmentType: 'quiz' as AssessmentType,
            content: '',
            quiz: []
          },
          {
            id: '107.2',
            title: 'PersistentVolumes & PVCs',
            xp: 150,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
          {
            id: '107.3',
            title: 'StorageClasses & Dynamic Provisioning',
            xp: 125,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
          {
            id: '107.4',
            title: 'StatefulSets — Ordered, Stable Storage',
            xp: 175,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
          {
            id: '107.5',
            title: 'Postgres on Kubernetes',
            xp: 150,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
          {
            id: '107.MP',
            title: 'Mini-Project: Stateful Todo API',
            xp: 300,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
        ]
      },
      {
        id: 108,
        title: 'Observability & Health',
        description: 'Make your applications self-healing and observable with probes and metrics.',
        part: 'Part VI: Observability',
        icon: '📊',
        topics: [
          {
            id: '108.1',
            title: 'Liveness, Readiness & Startup Probes',
            xp: 150,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
          {
            id: '108.2',
            title: 'Resource Management & QoS Classes',
            xp: 125,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
          {
            id: '108.3',
            title: 'Logging — kubectl & Beyond',
            xp: 100,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
          {
            id: '108.4',
            title: 'Events & Debugging Crashed Pods',
            xp: 125,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
          {
            id: '108.5',
            title: 'Metrics Server & kubectl top',
            xp: 100,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
          {
            id: '108.MP',
            title: 'Mini-Project: Observable Deployment',
            xp: 300,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
        ]
      },
      {
        id: 109,
        title: 'Security & RBAC',
        description: 'Secure your cluster with RBAC, NetworkPolicies, and pod security standards.',
        part: 'Part VI: Observability',
        icon: '🔒',
        topics: [
          {
            id: '109.1',
            title: 'K8s Security Model Overview',
            xp: 75,
            assessmentType: 'quiz' as AssessmentType,
            content: '',
            quiz: []
          },
          {
            id: '109.2',
            title: 'RBAC — Roles & RoleBindings',
            xp: 175,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
          {
            id: '109.3',
            title: 'ServiceAccounts & Pod Identity',
            xp: 125,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
          {
            id: '109.4',
            title: 'Network Policies — Firewall for Pods',
            xp: 150,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
          {
            id: '109.5',
            title: 'Pod Security — Non-Root & Read-Only',
            xp: 125,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
          {
            id: '109.MP',
            title: 'Mini-Project: Hardened Namespace',
            xp: 350,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
        ]
      },
      {
        id: 110,
        title: 'Helm — Package Management',
        description: 'Package, version, and deploy Kubernetes applications with Helm charts.',
        part: 'Part VII: Helm',
        icon: '⛵',
        topics: [
          {
            id: '110.1',
            title: 'Why Helm? The Package Problem',
            xp: 75,
            assessmentType: 'quiz' as AssessmentType,
            content: '',
            quiz: []
          },
          {
            id: '110.2',
            title: 'Installing Helm & Exploring Charts',
            xp: 125,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
          {
            id: '110.3',
            title: 'Anatomy of a Helm Chart',
            xp: 150,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
          {
            id: '110.4',
            title: 'Templating — Values, Conditionals, Loops',
            xp: 175,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
          {
            id: '110.5',
            title: 'Helm Upgrades, Rollbacks & Hooks',
            xp: 125,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
          {
            id: '110.MP',
            title: 'Mini-Project: Helm Two-Tier App',
            xp: 350,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
        ]
      },
      {
        id: 111,
        title: 'Scaling & Advanced Workloads',
        description: 'Scale automatically and run specialized workloads with HPA, Jobs, and DaemonSets.',
        part: 'Part VII: Helm',
        icon: '📈',
        topics: [
          {
            id: '111.1',
            title: 'Horizontal Pod Autoscaler (HPA)',
            xp: 175,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
          {
            id: '111.2',
            title: 'Jobs & CronJobs',
            xp: 125,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
          {
            id: '111.3',
            title: 'DaemonSets — Node-Level Workloads',
            xp: 100,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
          {
            id: '111.4',
            title: 'StatefulSets Patterns & Headless Services',
            xp: 125,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
          {
            id: '111.5',
            title: 'Vertical Pod Autoscaler & Cluster Autoscaler',
            xp: 100,
            assessmentType: 'quiz' as AssessmentType,
            content: '',
            quiz: []
          },
          {
            id: '111.MP',
            title: 'Mini-Project: Auto-Scaling Stack',
            xp: 350,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
        ]
      },
      {
        id: 112,
        title: 'Production & AWS EKS',
        description: 'Graduate to real clusters — AWS EKS, GitOps with ArgoCD, and production best practices.',
        part: 'Part VIII: Production',
        icon: '☁️',
        topics: [
          {
            id: '112.1',
            title: 'From minikube to Real Clusters',
            xp: 75,
            assessmentType: 'quiz' as AssessmentType,
            content: '',
            quiz: []
          },
          {
            id: '112.2',
            title: 'AWS EKS — Setup & COST WARNINGS',
            xp: 200,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
          {
            id: '112.3',
            title: 'EKS — IAM, ALB Ingress & EBS Storage',
            xp: 175,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
          {
            id: '112.4',
            title: 'GitOps with ArgoCD',
            xp: 175,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
          {
            id: '112.5',
            title: 'Production Checklist & Cost Control',
            xp: 125,
            assessmentType: 'quiz' as AssessmentType,
            content: '',
            quiz: []
          },
          {
            id: '112.MP',
            title: 'Mini-Project: EKS Production Deploy',
            xp: 350,
            assessmentType: 'coding' as AssessmentType,
            content: '',
            codingTask: undefined
          },
        ]
      },
    ],
    project: {
      id: 'k8s-production-deploy',
      title: 'Production K8s Deployment',
      description: 'Deploy a production-grade 3-tier application on AWS EKS with GitOps, security hardening, and full observability.',
      milestones: [
        {
          id: 'k8s-milestone-1',
          title: 'Production App Manifests',
          xp: 200,
          instructions: `Write complete YAML manifests for a 3-tier app (nginx frontend + Python API + Postgres). Include Deployments, Services, PVCs. All resources must be in a 'production' namespace.`,
          boilerplate: `# Apply with: kubectl apply -f manifests/ -n production
# 1. frontend-deployment.yaml (nginx, 2 replicas)
# 2. api-deployment.yaml (2 replicas)
# 3. postgres-statefulset.yaml (1 replica with PVC)
# 4. services.yaml`,
          rubric: ['Namespace production created', 'Frontend has 2+ replicas', 'Postgres is StatefulSet with PVC', 'All services use correct selectors', 'Resource requests/limits on all containers'],
          hints: ['Use kubectl create ns production', 'StatefulSet uses volumeClaimTemplates', 'ClusterIP DNS: postgres-svc.production.svc.cluster.local'],
          solutionCode: '',
        },
        {
          id: 'k8s-milestone-2',
          title: 'Hardened & Configured',
          xp: 250,
          instructions: `Add RBAC (read-only ServiceAccount), NetworkPolicies (deny-all + allow tiers), Secrets for DB credentials, ConfigMaps, and non-root securityContexts.`,
          boilerplate: `# Add: rbac.yaml, network-policies.yaml, secrets.yaml, configmap.yaml`,
          rubric: ['ServiceAccount with automountServiceAccountToken: false', 'deny-all NetworkPolicy', 'Tier-specific allow policies', 'Secret for DB_PASSWORD', 'runAsNonRoot: true on all pods'],
          hints: ['echo -n "password" | base64', 'NetworkPolicy podSelector uses matchLabels', 'runAsNonRoot: true under securityContext'],
          solutionCode: '',
        },
        {
          id: 'k8s-milestone-3',
          title: 'Helm Chart & Environments',
          xp: 300,
          instructions: `Package manifests as a Helm chart. Create dev values (1 replica) and production values (3 replicas). Chart must lint cleanly.`,
          boilerplate: `# helm create myapp; modify Chart.yaml, values.yaml; create production-values.yaml; helm lint myapp`,
          rubric: ['helm lint passes', 'values.yaml has replicaCount image resources', 'production-values.yaml has 3+ replicas', 'ConfigMap uses .Values', 'helm template previews correctly'],
          hints: ['{{ .Values.replicaCount | default 1 }}', 'helm template myapp --values production-values.yaml'],
          solutionCode: '',
        },
        {
          id: 'k8s-milestone-4',
          title: 'EKS + GitOps Pipeline',
          xp: 400,
          instructions: `⚠️ COST WARNING: AWS EKS costs ~$0.10/hr + EC2. Delete cluster when done!\n\nDeploy Helm chart to EKS via ArgoCD. Add HPA (70% CPU), CronJob for backups. Write cleanup script.`,
          boilerplate: `#!/bin/bash
# COST WARNING: Billable AWS resources created below
# DELETE cluster when done: eksctl delete cluster --name prod-cluster
set -euo pipefail`,
          rubric: ['EKS created with eksctl', 'ArgoCD installed', 'HPA with CPU target', 'CronJob for backup sim', 'Cleanup script deletes cluster'],
          hints: ['eksctl create cluster --name my-cluster --nodes 2 --node-type t3.micro --region us-east-1', 'ALWAYS verify: aws elb describe-load-balancers after delete'],
          solutionCode: '',
        },
      ],
    },
  },

  {
    id: 'springboot-ai-architect',
    title: 'Be an AI-Enabled Java Spring Boot Developer — From Zero to Architect',
    tagline: 'Master Spring Boot with AI tooling and reach architect-level thinking',
    description: 'A dual-track course for complete beginners and experienced Java developers. You will go from zero (or skip the basics) through AI-accelerated development, microservices, Spring AI integration, DDD/CQRS, Kubernetes, and architect-level system design — all with AI tools woven into every workflow.',
    icon: '☕',
    level: 'intermediate' as const,
    estimatedHours: 88,
    tags: ['Java', 'Spring Boot', 'Spring AI', 'GitHub Copilot', 'Cursor', 'Microservices', 'Kubernetes', 'System Design'],
    levelTitles: ['Java Beginner', 'Spring Boot Developer', 'AI-Powered Engineer', 'Senior Developer', 'Software Architect'] as [string, string, string, string, string],
    chapters: [
      // ═══════════════════════════════════════════
      // PART I: Java & Spring Boot Foundations
      // ═══════════════════════════════════════════
      {
        id: 201,
        title: 'Java Essentials Crash Course',
        description: 'Core Java concepts every Spring Boot developer must know — with Java 21 highlights including Virtual Threads.',
        part: 'Part I: Java & Spring Boot Foundations',
        icon: '☕',
        topics: [
          {
            id: '201.1',
            title: 'OOP in Java: Classes, Interfaces & Polymorphism',
            xp: 60,
            assessmentType: 'quiz' as const,
            content: '',
            quiz: [],
          },
          {
            id: '201.2',
            title: 'Generics, Collections & the Stream API',
            xp: 60,
            assessmentType: 'quiz' as const,
            content: '',
            quiz: [],
          },
          {
            id: '201.3',
            title: 'Lambdas, Functional Interfaces & Optional',
            xp: 75,
            assessmentType: 'coding' as const,
            content: '',
            codingTask: undefined,
          },
          {
            id: '201.4',
            title: 'Java 21 Highlights: Records, Sealed Classes & Virtual Threads',
            xp: 75,
            assessmentType: 'quiz' as const,
            content: '',
            quiz: [],
          },
        ],
      },
      {
        id: 202,
        title: 'Spring Boot 3.x Fundamentals',
        description: 'How Spring Boot really works — autoconfiguration, IoC, beans, DI, and profiles.',
        part: 'Part I: Java & Spring Boot Foundations',
        icon: '🍃',
        topics: [
          {
            id: '202.1',
            title: 'How Spring Boot Works: Autoconfiguration & the IoC Container',
            xp: 75,
            assessmentType: 'quiz' as const,
            content: '',
            quiz: [],
          },
          {
            id: '202.2',
            title: 'Beans, Dependency Injection & Component Scanning',
            xp: 75,
            assessmentType: 'quiz' as const,
            content: '',
            quiz: [],
          },
          {
            id: '202.3',
            title: 'application.yml, Profiles & Externalized Configuration',
            xp: 75,
            assessmentType: 'coding' as const,
            content: '',
            codingTask: undefined,
          },
        ],
      },
      {
        id: 203,
        title: 'REST APIs with Spring MVC',
        description: 'Build production-quality REST APIs: controllers, DTOs, validation, and error handling.',
        part: 'Part I: Java & Spring Boot Foundations',
        icon: '🌐',
        topics: [
          {
            id: '203.1',
            title: 'Controllers, Request Mapping & ResponseEntity',
            xp: 75,
            assessmentType: 'quiz' as const,
            content: '',
            quiz: [],
          },
          {
            id: '203.2',
            title: 'DTOs, Validation & Bean Validation',
            xp: 80,
            assessmentType: 'coding' as const,
            content: '',
            codingTask: undefined,
          },
          {
            id: '203.3',
            title: 'Global Exception Handling & Problem Details (RFC 9457)',
            xp: 75,
            assessmentType: 'quiz' as const,
            content: '',
            quiz: [],
          },
        ],
      },
      {
        id: 204,
        title: 'Spring Data JPA & Persistence',
        description: 'Entities, repositories, JPQL, transactions, the N+1 problem, and Flyway migrations.',
        part: 'Part I: Java & Spring Boot Foundations',
        icon: '🗄️',
        topics: [
          {
            id: '204.1',
            title: 'Entities, Repositories & JPQL Queries',
            xp: 80,
            assessmentType: 'quiz' as const,
            content: '',
            quiz: [],
          },
          {
            id: '204.2',
            title: 'Transactions, Lazy Loading & the N+1 Problem',
            xp: 80,
            assessmentType: 'quiz' as const,
            content: '',
            quiz: [],
          },
          {
            id: '204.3',
            title: 'Database Migrations with Flyway',
            xp: 70,
            assessmentType: 'coding' as const,
            content: '',
            codingTask: undefined,
          },
        ],
      },
      // ═══════════════════════════════════════════
      // PART II: AI Tooling Setup & Developer Mindset
      // ═══════════════════════════════════════════
      {
        id: 205,
        title: 'The AI-Enabled Developer Workflow',
        description: 'Understand the landscape of AI coding tools and build the mindset of an augmented developer.',
        part: 'Part II: AI Tooling Setup & Developer Mindset',
        icon: '🤖',
        topics: [
          {
            id: '205.1',
            title: 'GitHub Copilot vs Cursor vs Claude Code — When to Use Which',
            xp: 60,
            assessmentType: 'quiz' as const,
            content: '',
            quiz: [],
          },
          {
            id: '205.2',
            title: 'The Augmented Developer Mindset',
            xp: 60,
            assessmentType: 'quiz' as const,
            content: '',
            quiz: [],
          },
          {
            id: '205.3',
            title: 'Measuring Your AI Productivity Gains',
            xp: 60,
            assessmentType: 'quiz' as const,
            content: '',
            quiz: [],
          },
        ],
      },
      {
        id: 206,
        title: 'Setting Up Your AI Dev Environment',
        description: 'Hands-on setup of GitHub Copilot, Cursor, and Claude Code for Spring Boot development.',
        part: 'Part II: AI Tooling Setup & Developer Mindset',
        icon: '⚙️',
        topics: [
          {
            id: '206.1',
            title: 'GitHub Copilot in IntelliJ IDEA & VS Code',
            xp: 60,
            assessmentType: 'quiz' as const,
            content: '',
            quiz: [],
          },
          {
            id: '206.2',
            title: 'Cursor Setup for Spring Boot Projects',
            xp: 60,
            assessmentType: 'quiz' as const,
            content: '',
            quiz: [],
          },
          {
            id: '206.3',
            title: 'Claude Code CLI for Java Projects',
            xp: 70,
            assessmentType: 'coding' as const,
            content: '',
            codingTask: undefined,
          },
        ],
      },
      {
        id: 207,
        title: 'Prompt Engineering for Java Developers',
        description: 'Write prompts that produce production-quality Spring Boot code on the first try.',
        part: 'Part II: AI Tooling Setup & Developer Mindset',
        icon: '✍️',
        topics: [
          {
            id: '207.1',
            title: 'Writing Effective Code Prompts — Java & Spring Boot Patterns',
            xp: 70,
            assessmentType: 'quiz' as const,
            content: '',
            quiz: [],
          },
          {
            id: '207.2',
            title: 'Context Management: Feeding Your Codebase to AI',
            xp: 65,
            assessmentType: 'quiz' as const,
            content: '',
            quiz: [],
          },
          {
            id: '207.3',
            title: 'AI Code Review Habits & Trust Calibration',
            xp: 65,
            assessmentType: 'quiz' as const,
            content: '',
            quiz: [],
          },
        ],
      },

      // ═══════════════════════════════════════════
      // PART III — AI-Accelerated Spring Boot Dev
      // ═══════════════════════════════════════════
      {
        id: 208,
        title: 'Your AI Toolkit — Copilot, Cursor, Claude',
        description: 'Master the three leading AI coding tools and learn when to use each for Spring Boot development.',
        part: 'Part III — AI-Accelerated Spring Boot Dev',
        icon: '🤖',
        topics: [
          { id: '208.1', title: 'GitHub Copilot for Spring Boot', xp: 75, assessmentType: 'quiz', content: '', quiz: [] },
          { id: '208.2', title: 'Cursor IDE — The AI-First IDE', xp: 75, assessmentType: 'quiz', content: '', quiz: [] },
          { id: '208.3', title: 'Claude Code CLI for Backend Dev', xp: 100, assessmentType: 'coding', content: '', codingTask: undefined },
        ],
      },
      {
        id: 209,
        title: 'AI-Driven Test-Driven Development',
        description: 'Use AI to accelerate TDD — from test spec generation to Testcontainers integration tests.',
        part: 'Part III — AI-Accelerated Spring Boot Dev',
        icon: '🧪',
        topics: [
          { id: '209.1', title: 'Writing Tests with AI — From Spec to Green', xp: 75, assessmentType: 'quiz', content: '', quiz: [] },
          { id: '209.2', title: 'AI-Assisted Testcontainers Integration Tests', xp: 100, assessmentType: 'coding', content: '', codingTask: undefined },
          { id: '209.3', title: 'Full Integration Test Generation with AI', xp: 100, assessmentType: 'coding', content: '', codingTask: undefined },
        ],
      },
      {
        id: 210,
        title: 'AI-Assisted Code Review & Refactoring',
        description: 'Use AI as a first-pass reviewer and modernise Spring Boot 2.x codebases to Java 21 / Boot 3.x.',
        part: 'Part III — AI-Accelerated Spring Boot Dev',
        icon: '🔍',
        topics: [
          { id: '210.1', title: 'AI Code Review Workflow', xp: 75, assessmentType: 'quiz', content: '', quiz: [] },
          { id: '210.2', title: 'AI-Assisted Refactoring', xp: 100, assessmentType: 'coding', content: '', codingTask: undefined },
          { id: '210.3', title: 'Anti-Pattern Detection with AI', xp: 75, assessmentType: 'quiz', content: '', quiz: [] },
        ],
      },
      {
        id: 211,
        title: 'Prompt Engineering for Java Developers',
        description: 'Write prompts that generate production-quality Spring Boot code on the first try.',
        part: 'Part III — AI-Accelerated Spring Boot Dev',
        icon: '✍️',
        topics: [
          { id: '211.1', title: 'Prompt Patterns for Code Generation', xp: 75, assessmentType: 'quiz', content: '', quiz: [] },
          { id: '211.2', title: 'Context Strategies for Large Codebases', xp: 75, assessmentType: 'quiz', content: '', quiz: [] },
          { id: '211.3', title: 'Multi-Step Prompting for Complex Features', xp: 100, assessmentType: 'coding', content: '', codingTask: undefined },
        ],
      },
      {
        id: 212,
        title: 'Building Your First AI-Enhanced Feature',
        description: 'Execute a complete vertical slice — design, implement, and test with AI pairing.',
        part: 'Part III — AI-Accelerated Spring Boot Dev',
        icon: '🚀',
        topics: [
          { id: '212.1', title: 'Planning a Feature with AI — Architecture First', xp: 75, assessmentType: 'quiz', content: '', quiz: [] },
          { id: '212.2', title: 'AI Pair Programming — Building the Full Vertical Slice', xp: 125, assessmentType: 'coding', content: '', codingTask: undefined },
          { id: '212.3', title: 'The AI Development Loop — Sustaining Velocity', xp: 75, assessmentType: 'quiz', content: '', quiz: [] },
        ],
      },

      // ═══════════════════════════════════════════
      // PART IV: Security + Testcontainers
      // ═══════════════════════════════════════════
      {
        id: 213,
        title: 'Spring Security 6.x — The New DSL',
        description: 'Master the component-based SecurityFilterChain API that replaced WebSecurityConfigurerAdapter in Spring Boot 3.x.',
        part: 'Part IV: Security + Testcontainers',
        icon: '🔐',
        topics: [
          { id: '213.1', title: 'SecurityFilterChain & the New Lambda DSL', xp: 100, assessmentType: 'quiz' as const, content: '', quiz: [] },
          { id: '213.2', title: 'Method Security & Fine-Grained Authorization', xp: 100, assessmentType: 'quiz' as const, content: '', quiz: [] },
          { id: '213.3', title: 'CORS, CSRF & Security Headers in REST APIs', xp: 150, assessmentType: 'coding' as const, content: '', codingTask: undefined },
        ],
      },
      {
        id: 214,
        title: 'JWT Authentication & OAuth2',
        description: 'Build stateless JWT authentication from scratch and integrate with external Identity Providers via OAuth2 Resource Server.',
        part: 'Part IV: Security + Testcontainers',
        icon: '🔑',
        topics: [
          { id: '214.1', title: 'JWT Authentication from Scratch', xp: 175, assessmentType: 'coding' as const, content: '', codingTask: undefined },
          { id: '214.2', title: 'OAuth2 Resource Server & OIDC', xp: 100, assessmentType: 'quiz' as const, content: '', quiz: [] },
          { id: '214.3', title: 'Refresh Tokens & Token Security', xp: 125, assessmentType: 'quiz' as const, content: '', quiz: [] },
        ],
      },
      {
        id: 215,
        title: 'Testcontainers Foundations',
        description: 'Replace mocks with real infrastructure in your tests using Testcontainers for PostgreSQL, WireMock, and beyond.',
        part: 'Part IV: Security + Testcontainers',
        icon: '🐳',
        topics: [
          { id: '215.1', title: 'What is Testcontainers & Why It Replaces Mocks', xp: 75, assessmentType: 'quiz' as const, content: '', quiz: [] },
          { id: '215.2', title: 'PostgreSQL Testcontainers for JPA Repository Tests', xp: 175, assessmentType: 'coding' as const, content: '', codingTask: undefined },
          { id: '215.3', title: 'WireMock & HTTP Dependency Testing', xp: 125, assessmentType: 'quiz' as const, content: '', quiz: [] },
        ],
      },
      {
        id: 216,
        title: 'Advanced Testcontainers & Security Integration Tests',
        description: 'Test Kafka event flows, Redis caching, and end-to-end JWT security with real infrastructure containers.',
        part: 'Part IV: Security + Testcontainers',
        icon: '🧪',
        topics: [
          { id: '216.1', title: 'Kafka Testcontainers for Event-Driven Tests', xp: 150, assessmentType: 'quiz' as const, content: '', quiz: [] },
          { id: '216.2', title: 'Redis Testcontainers for Caching Tests', xp: 125, assessmentType: 'quiz' as const, content: '', quiz: [] },
          { id: '216.3', title: 'Security Integration Tests with MockMvc & Testcontainers', xp: 200, assessmentType: 'coding' as const, content: '', codingTask: undefined },
        ],
      },

      // ═══════════════════════════════════════════
      // PART V: Microservices + Virtual Threads
      // ═══════════════════════════════════════════
      {
        id: 217,
        title: 'Microservices Architecture with Spring Boot',
        description: 'Know when and how to decompose a monolith, set up service discovery with Eureka, and build an API gateway with Spring Cloud Gateway.',
        part: 'Part V: Microservices + Virtual Threads',
        icon: '🏗️',
        topics: [
          { id: '217.1', title: 'Monolith to Microservices — When and How to Decompose', xp: 100, assessmentType: 'quiz' as const, content: '', quiz: [] },
          { id: '217.2', title: 'Service Discovery with Spring Cloud', xp: 100, assessmentType: 'quiz' as const, content: '', quiz: [] },
          { id: '217.3', title: 'API Gateway with Spring Cloud Gateway', xp: 150, assessmentType: 'coding' as const, content: '', codingTask: undefined },
        ],
      },
      {
        id: 218,
        title: 'Service Communication — OpenFeign, Kafka & Sagas',
        description: 'Build declarative HTTP clients with OpenFeign, publish and consume Kafka events, and implement the Saga pattern for distributed transactions.',
        part: 'Part V: Microservices + Virtual Threads',
        icon: '🔗',
        topics: [
          { id: '218.1', title: 'Synchronous REST with Spring Cloud OpenFeign', xp: 175, assessmentType: 'coding' as const, content: '', codingTask: undefined },
          { id: '218.2', title: 'Asynchronous Messaging with Spring Kafka', xp: 100, assessmentType: 'quiz' as const, content: '', quiz: [] },
          { id: '218.3', title: 'The Event-Driven Saga Pattern', xp: 100, assessmentType: 'quiz' as const, content: '', quiz: [] },
        ],
      },
      {
        id: 219,
        title: 'Java 21 Virtual Threads & Structured Concurrency',
        description: 'Understand how virtual threads work, enable them in Spring Boot 3.2+, and use StructuredTaskScope to safely run concurrent tasks.',
        part: 'Part V: Microservices + Virtual Threads',
        icon: '⚡',
        topics: [
          { id: '219.1', title: 'Virtual Threads — What They Are and Why They Matter', xp: 100, assessmentType: 'quiz' as const, content: '', quiz: [] },
          { id: '219.2', title: 'Enabling Virtual Threads in Spring Boot 3.2+', xp: 150, assessmentType: 'coding' as const, content: '', codingTask: undefined },
          { id: '219.3', title: 'Structured Concurrency & StructuredTaskScope', xp: 100, assessmentType: 'quiz' as const, content: '', quiz: [] },
        ],
      },
      {
        id: 220,
        title: 'Resilience Patterns — Circuit Breaker, Retry & Tracing',
        description: 'Prevent cascade failures with Resilience4j circuit breakers, add retry and bulkhead protection, and trace requests across services with Micrometer.',
        part: 'Part V: Microservices + Virtual Threads',
        icon: '🛡️',
        topics: [
          { id: '220.1', title: 'Circuit Breaker with Resilience4j', xp: 175, assessmentType: 'coding' as const, content: '', codingTask: undefined },
          { id: '220.2', title: 'Retry, Rate Limiter & Bulkhead', xp: 100, assessmentType: 'quiz' as const, content: '', quiz: [] },
          { id: '220.3', title: 'Distributed Tracing with Micrometer & Zipkin', xp: 100, assessmentType: 'quiz' as const, content: '', quiz: [] },
        ],
      },

      // ═══════════════════════════════════════════
      // PART VI: Spring AI + RAG + AI Security (Chapters 221-224)
      // ═══════════════════════════════════════════
      {
        id: 221,
        title: 'Spring AI Foundations',
        description: 'ChatClient API, Advisors, Prompt Templates, Structured Output & Embeddings.',
        part: 'Part VI: Spring AI + RAG',
        icon: '🤖',
        topics: [
          { id: '221.1', title: 'Spring AI Overview — ChatClient, Models & Advisors', xp: 100, assessmentType: 'quiz' as const, content: '', quiz: [] },
          { id: '221.2', title: 'Prompt Templates & Structured Output', xp: 175, assessmentType: 'coding' as const, content: '', codingTask: undefined },
          { id: '221.3', title: 'Multimodality & Embeddings', xp: 100, assessmentType: 'quiz' as const, content: '', quiz: [] },
        ],
      },
      {
        id: 222,
        title: 'RAG with Spring AI',
        description: 'Vector stores, document pipelines, QuestionAnswerAdvisor, hybrid search & evaluation.',
        part: 'Part VI: Spring AI + RAG',
        icon: '🔍',
        topics: [
          { id: '222.1', title: 'Vector Stores & the Document Pipeline', xp: 100, assessmentType: 'quiz' as const, content: '', quiz: [] },
          { id: '222.2', title: 'Building a RAG Pipeline — Ingest, Retrieve, Generate', xp: 175, assessmentType: 'coding' as const, content: '', codingTask: undefined },
          { id: '222.3', title: 'Advanced RAG — Hybrid Search, Reranking & Conversational Memory', xp: 100, assessmentType: 'quiz' as const, content: '', quiz: [] },
        ],
      },
      {
        id: 223,
        title: 'Spring AI Agents & Tool Calling',
        description: 'Function calling with @Tool, conversation memory, and building agentic loops.',
        part: 'Part VI: Spring AI + RAG',
        icon: '⚙️',
        topics: [
          { id: '223.1', title: 'Tool Calling — Giving the LLM Capabilities', xp: 175, assessmentType: 'coding' as const, content: '', codingTask: undefined },
          { id: '223.2', title: 'Conversation Memory & Session Management', xp: 100, assessmentType: 'quiz' as const, content: '', quiz: [] },
          { id: '223.3', title: 'Building an Agentic Loop', xp: 100, assessmentType: 'quiz' as const, content: '', quiz: [] },
        ],
      },
      {
        id: 224,
        title: 'AI Security & Production Readiness',
        description: 'Prompt injection, input/output guardrails, cost control & AI observability.',
        part: 'Part VI: Spring AI + RAG',
        icon: '🛡️',
        topics: [
          { id: '224.1', title: 'Prompt Injection — Attacks & Defenses', xp: 100, assessmentType: 'quiz' as const, content: '', quiz: [] },
          { id: '224.2', title: 'Input/Output Guardrails & Content Moderation', xp: 175, assessmentType: 'coding' as const, content: '', codingTask: undefined },
          { id: '224.3', title: 'Cost Control, Observability & Production Readiness', xp: 100, assessmentType: 'quiz' as const, content: '', quiz: [] },
        ],
      },

      // ═══════════════════════════════════════════
      // PART VII: DDD, CQRS & Event Sourcing (Chapters 225-228)
      // ═══════════════════════════════════════════
      {
        id: 225,
        title: 'DDD Foundations',
        description: 'Bounded contexts, ubiquitous language, aggregates, value objects & domain events.',
        part: 'Part VII: DDD, CQRS & Event Sourcing',
        icon: '🏗️',
        topics: [
          { id: '225.1', title: 'Strategic DDD — Bounded Contexts & Ubiquitous Language', xp: 100, assessmentType: 'quiz' as const, content: '', quiz: [] },
          { id: '225.2', title: 'Tactical DDD — Aggregates, Entities & Value Objects', xp: 175, assessmentType: 'coding' as const, content: '', codingTask: undefined },
          { id: '225.3', title: 'Domain Events & Application Services', xp: 100, assessmentType: 'quiz' as const, content: '', quiz: [] },
        ],
      },
      {
        id: 226,
        title: 'CQRS Pattern',
        description: 'Command/Query segregation, read models, projections & eventual consistency.',
        part: 'Part VII: DDD, CQRS & Event Sourcing',
        icon: '↔️',
        topics: [
          { id: '226.1', title: 'CQRS Fundamentals — Separating Reads from Writes', xp: 175, assessmentType: 'coding' as const, content: '', codingTask: undefined },
          { id: '226.2', title: 'Read Models, Projections & Eventual Consistency', xp: 100, assessmentType: 'quiz' as const, content: '', quiz: [] },
          { id: '226.3', title: 'CQRS with Spring + Spring Data', xp: 100, assessmentType: 'quiz' as const, content: '', quiz: [] },
        ],
      },
      {
        id: 227,
        title: 'Event Sourcing',
        description: 'Event store, append-only persistence, snapshots & projection replay.',
        part: 'Part VII: DDD, CQRS & Event Sourcing',
        icon: '📜',
        topics: [
          { id: '227.1', title: 'Event Sourcing Fundamentals — The Event Store', xp: 175, assessmentType: 'coding' as const, content: '', codingTask: undefined },
          { id: '227.2', title: 'Snapshots & Event Stream Management', xp: 100, assessmentType: 'quiz' as const, content: '', quiz: [] },
          { id: '227.3', title: 'Event Replay, Projections & Trade-offs', xp: 100, assessmentType: 'quiz' as const, content: '', quiz: [] },
        ],
      },
      {
        id: 228,
        title: 'Spring Modulith & Architecture Tests',
        description: 'Modular monolith with Spring Modulith, ArchUnit, and module testing.',
        part: 'Part VII: DDD, CQRS & Event Sourcing',
        icon: '🔬',
        topics: [
          { id: '228.1', title: 'Spring Modulith — Modular Monolith Architecture', xp: 100, assessmentType: 'quiz' as const, content: '', quiz: [] },
          { id: '228.2', title: 'ArchUnit — Architecture Tests as Code', xp: 175, assessmentType: 'coding' as const, content: '', codingTask: undefined },
          { id: '228.3', title: 'Module Testing with Spring Modulith', xp: 100, assessmentType: 'quiz' as const, content: '', quiz: [] },
        ],
      },

      // ═══════════════════════════════════════════
      // PART VIII: Cloud, Kubernetes & CI/CD (Chapters 229-231)
      // ═══════════════════════════════════════════
      {
        id: 229,
        title: 'Containerizing Spring Boot',
        description: 'Multi-stage Dockerfiles, Jib, Spring Buildpacks & container configuration.',
        part: 'Part VIII: Cloud, Kubernetes & CI/CD',
        icon: '🐳',
        topics: [
          { id: '229.1', title: 'Dockerfile Best Practices for Spring Boot', xp: 175, assessmentType: 'coding' as const, content: '', codingTask: undefined },
          { id: '229.2', title: 'Jib — Container Images Without Docker', xp: 100, assessmentType: 'quiz' as const, content: '', quiz: [] },
          { id: '229.3', title: 'Application Configuration for Containers', xp: 100, assessmentType: 'quiz' as const, content: '', quiz: [] },
        ],
      },
      {
        id: 230,
        title: 'Kubernetes for Spring Boot',
        description: 'Deployments, Services, ConfigMaps, health probes, HPA & production patterns.',
        part: 'Part VIII: Cloud, Kubernetes & CI/CD',
        icon: '☸️',
        topics: [
          { id: '230.1', title: 'Kubernetes Core Concepts for Spring Boot Developers', xp: 175, assessmentType: 'coding' as const, content: '', codingTask: undefined },
          { id: '230.2', title: 'Health Probes, Resource Limits & Horizontal Pod Autoscaler', xp: 100, assessmentType: 'quiz' as const, content: '', quiz: [] },
          { id: '230.3', title: 'Ingress, Namespaces & Production Kubernetes Patterns', xp: 100, assessmentType: 'quiz' as const, content: '', quiz: [] },
        ],
      },
      {
        id: 231,
        title: 'CI/CD with GitHub Actions',
        description: 'CI pipelines, staging/production deployments, GitOps with ArgoCD & DORA metrics.',
        part: 'Part VIII: Cloud, Kubernetes & CI/CD',
        icon: '🚀',
        topics: [
          { id: '231.1', title: 'GitHub Actions CI Pipeline for Spring Boot', xp: 175, assessmentType: 'coding' as const, content: '', codingTask: undefined },
          { id: '231.2', title: 'CD Pipeline — Staging & Production Deployment', xp: 100, assessmentType: 'quiz' as const, content: '', quiz: [] },
          { id: '231.3', title: 'GitOps with ArgoCD & Production Best Practices', xp: 100, assessmentType: 'quiz' as const, content: '', quiz: [] },
        ],
      },

      // ═══════════════════════════════════════════
      // PART IX: Architect Thinking (Chapters 232-234)
      // ═══════════════════════════════════════════
      {
        id: 232,
        title: 'System Design & Architecture Patterns',
        description: 'CAP theorem, distributed patterns, ADRs, sagas, outbox pattern & API gateway.',
        part: 'Part IX: Architect Thinking',
        icon: '🧠',
        topics: [
          { id: '232.1', title: 'CAP Theorem, Distributed Trade-offs & Architecture Decision Records', xp: 100, assessmentType: 'quiz' as const, content: '', quiz: [] },
          { id: '232.2', title: 'Designing for Scale — Caching, Load Balancing & Data Partitioning', xp: 175, assessmentType: 'coding' as const, content: '', codingTask: undefined },
          { id: '232.3', title: 'Microservices Patterns — API Gateway, Service Mesh & Event-Driven Design', xp: 100, assessmentType: 'quiz' as const, content: '', quiz: [] },
        ],
      },
      {
        id: 233,
        title: 'Observability & Resilience Engineering',
        description: 'OpenTelemetry, structured logging, SLOs, Resilience4j circuit breakers & performance tuning.',
        part: 'Part IX: Architect Thinking',
        icon: '🔭',
        topics: [
          { id: '233.1', title: 'Observability with OpenTelemetry & Spring Boot', xp: 100, assessmentType: 'quiz' as const, content: '', quiz: [] },
          { id: '233.2', title: 'Resilience Patterns with Resilience4j', xp: 175, assessmentType: 'coding' as const, content: '', codingTask: undefined },
          { id: '233.3', title: 'Performance Engineering — Profiling, Tuning & Capacity Planning', xp: 100, assessmentType: 'quiz' as const, content: '', quiz: [] },
        ],
      },
      {
        id: 234,
        title: 'API Design & Microservices Communication',
        description: 'REST excellence, gRPC, GraphQL, WebSockets & protocol selection.',
        part: 'Part IX: Architect Thinking',
        icon: '🔌',
        topics: [
          { id: '234.1', title: 'REST API Design Excellence', xp: 100, assessmentType: 'quiz' as const, content: '', quiz: [] },
          { id: '234.2', title: 'gRPC with Spring Boot — Protocol Buffers & Streaming', xp: 175, assessmentType: 'coding' as const, content: '', codingTask: undefined },
          { id: '234.3', title: 'GraphQL, WebSockets & Protocol Selection', xp: 100, assessmentType: 'quiz' as const, content: '', quiz: [] },
        ],
      },

      // ═══════════════════════════════════════════
      // PART X: Coming in next content batch
      // (chapters 235+ will be inserted here)
      // ═══════════════════════════════════════════
    ],
    project: {
      id: 'springboot-saas-capstone',
      title: 'Build a Production-Grade AI-Powered SaaS Backend',
      description: 'A multi-tenant SaaS backend with JWT auth, Spring AI chat endpoint, RAG knowledge base, Kafka event streaming, Redis caching, Testcontainers-powered CI, containerized and deployed to Kubernetes — built with AI tooling throughout.',
      milestones: [
        {
          id: 'sb-milestone-1',
          title: 'Core API + Auth + Database',
          xp: 200,
          instructions: `Build the multi-tenant data model with JWT authentication and a fully tested REST API.

Your implementation must:
1. Create JPA entities: Tenant, User (with tenantId), and Product (with tenantId)
2. Implement JWT-based authentication: POST /auth/login returns a signed JWT
3. Implement tenant isolation: all repository queries filter by tenantId from the JWT
4. Expose: GET /products, POST /products, GET /products/{id}, DELETE /products/{id}
5. Write Flyway V1 and V2 migrations for the schema
6. Write Testcontainers integration tests covering auth + CRUD happy paths`,
          boilerplate: `// Spring Boot 3.2 + Java 21 project
// Dependencies: spring-boot-starter-web, spring-boot-starter-data-jpa,
//               spring-boot-starter-security, flyway-core, jjwt, testcontainers

// TODO: Implement entities, JWT filter, controllers, and tests`,
          rubric: ['Tenant + User + Product entities with correct JPA annotations', 'JWT filter validates token and populates SecurityContext', 'All endpoints require authentication', 'Products filtered by tenant from JWT claims', 'V1 and V2 Flyway migrations', 'Testcontainers integration tests pass'],
          hints: ['Use @TenantId or a ThreadLocal to propagate tenant context', 'jjwt: Jwts.parserBuilder().setSigningKey(secret).build().parseClaimsJws(token)', 'Testcontainers: @Container static PostgreSQLContainer<?> postgres'],
          solutionCode: '',
        },
        {
          id: 'sb-milestone-2',
          title: 'Spring AI Integration — Chat + RAG',
          xp: 250,
          instructions: `Add a Spring AI chat endpoint with RAG (Retrieval-Augmented Generation) backed by pgvector.

Your implementation must:
1. Add Spring AI dependency with OpenAI or Anthropic provider
2. POST /ai/chat — accepts {"message": "..."}, streams response via SSE
3. POST /ai/documents — ingests plain text, chunks and embeds it into pgvector
4. GET /ai/query?q=... — answers a question using RAG (retrieve relevant chunks, pass to LLM)
5. Add prompt injection defense: validate user input length and reject obvious injection patterns
6. All endpoints require JWT authentication`,
          boilerplate: `// Add to pom.xml:
// spring-ai-openai-spring-boot-starter (or anthropic variant)
// pgvector extension must be enabled in PostgreSQL

// TODO: Implement ChatController, DocumentIngestionService, RagQueryService`,
          rubric: ['Spring AI ChatClient configured and injected', 'SSE streaming endpoint returns chunks', 'Document ingestion splits text and stores embeddings', 'RAG query retrieves top-k chunks before LLM call', 'Prompt injection defence validates input', 'Integration test covers chat + RAG round-trip'],
          hints: ['ChatClient.builder(chatModel).build()', 'VectorStore.add(List.of(new Document(text)))', 'VectorStore.similaritySearch(SearchRequest.query(q).withTopK(5))'],
          solutionCode: '',
        },
        {
          id: 'sb-milestone-3',
          title: 'Event Streaming + Caching',
          xp: 250,
          instructions: `Add Kafka event streaming and Redis caching to the product service.

Your implementation must:
1. Publish a ProductCreatedEvent to Kafka topic "product-events" on POST /products
2. Publish a ProductDeletedEvent on DELETE /products/{id}
3. Add a Kafka consumer that logs all product events (for audit)
4. Cache GET /products response in Redis with key "products:{tenantId}" TTL 60s
5. Invalidate the cache on any write operation (POST, DELETE)
6. Write Testcontainers tests using Kafka + Redis containers`,
          boilerplate: `// Add to pom.xml: spring-kafka, spring-boot-starter-data-redis, spring-boot-starter-cache
// Add to application.yml: kafka bootstrap-servers, redis host/port

// TODO: KafkaProducerConfig, ProductEventPublisher, ProductEventConsumer
// TODO: RedisConfig (@EnableCaching), @Cacheable/@CacheEvict on service methods`,
          rubric: ['KafkaTemplate publishes ProductCreatedEvent and ProductDeletedEvent', '@KafkaListener consumer logs events', '@Cacheable on findAllByTenant with correct cache key', '@CacheEvict on create and delete', 'Testcontainers test uses KafkaContainer and RedisContainer', 'Cache TTL configured to 60 seconds'],
          hints: ['@EnableCaching on @Configuration class', '@Cacheable(value = "products", key = "#tenantId")', 'KafkaContainer from org.testcontainers.kafka'],
          solutionCode: '',
        },
        {
          id: 'sb-milestone-4',
          title: 'Cloud Deployment + CI/CD',
          xp: 300,
          instructions: `Containerize the application with Docker and deploy to Kubernetes with a GitHub Actions CI/CD pipeline.

Your implementation must:
1. Write a multi-stage Dockerfile: build stage (Maven) → runtime stage (JRE 21 slim)
2. Write a docker-compose.yml for local dev: app + postgres + redis + kafka
3. Write Kubernetes manifests: Deployment, Service, ConfigMap, Secret (for JWT secret and DB password)
4. Add liveness (/actuator/health/liveness) and readiness (/actuator/health/readiness) probes to the Deployment
5. Write a GitHub Actions workflow: build → test → build Docker image → push to registry → apply kubectl
6. Add a HorizontalPodAutoscaler targeting 70% CPU utilization`,
          boilerplate: `# Dockerfile
FROM maven:3.9-eclipse-temurin-21 AS build
# TODO: multi-stage build

# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
# TODO: complete manifest

# .github/workflows/deploy.yml
name: CI/CD
# TODO: complete workflow`,
          rubric: ['Multi-stage Dockerfile produces a minimal image', 'docker-compose.yml starts all services', 'Kubernetes Deployment with liveness/readiness probes', 'Secret used for JWT_SECRET and DB_PASSWORD (not ConfigMap)', 'GitHub Actions: test → build image → push → deploy', 'HPA with CPU target 70%'],
          hints: ['FROM eclipse-temurin:21-jre-alpine for the runtime stage', 'livenessProbe: httpGet: path: /actuator/health/liveness', 'management.endpoint.health.probes.enabled: true'],
          solutionCode: '',
        },
      ],
    },
  },

]

// ── Course-aware helpers ──────────────────────────────────────

export function getCourse(courseId: string): Course | undefined {
  return courses.find(c => c.id === courseId)
}

export function getCourseTopics(courseId: string): (Topic & { chapterId: number; chapterTitle: string })[] {
  const course = getCourse(courseId)
  if (!course) return []
  return course.chapters.flatMap(chapter =>
    chapter.topics.map(topic => ({
      ...topic,
      chapterId: chapter.id,
      chapterTitle: chapter.title,
    }))
  )
}

export function getCourseNextTopic(courseId: string, currentTopicId: string): string | null {
  const all = getCourseTopics(courseId)
  const idx = all.findIndex(t => t.id === currentTopicId)
  if (idx === -1 || idx === all.length - 1) return null
  return all[idx + 1].id
}

export function getCoursePrevTopic(courseId: string, currentTopicId: string): string | null {
  const all = getCourseTopics(courseId)
  const idx = all.findIndex(t => t.id === currentTopicId)
  if (idx <= 0) return null
  return all[idx - 1].id
}

export function getCourseTotalXP(courseId: string): number {
  const course = getCourse(courseId)
  if (!course) return 0
  const topicsXP = getCourseTopics(courseId).reduce((sum, t) => sum + t.xp, 0)
  const projectXP = course.project.milestones.reduce((sum, m) => sum + m.xp, 0)
  return topicsXP + projectXP
}
