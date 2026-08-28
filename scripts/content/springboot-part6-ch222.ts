// Part VI — Spring AI + RAG + AI Security
// Chapter 222: RAG with Spring AI — VectorStore, Document Pipelines & QuestionAnswerAdvisor

import type { QuizQuestion } from '../../src/data/curriculum'

export const courseId = 'springboot-ai-architect'

export const content: Record<string, string> = {

'222.1': `# Vector Stores & the Document Pipeline

Retrieval-Augmented Generation (RAG) solves the fundamental limitations of LLMs:
- **Knowledge cutoff** — the model doesn't know about events after its training data
- **Private data** — the model has never seen your internal documents, Confluence pages, or database records
- **Hallucination** — without sources, the model invents plausible-sounding answers

RAG grounds every answer in retrieved documents. The model only synthesizes, it doesn't invent.

## The Two-Phase Architecture

RAG has two distinct phases:

### Phase 1 — Ingestion (offline)

\`\`\`
Raw documents (PDF, web, DB)
    → Load (DocumentReader)
    → Transform (TextSplitter, MetadataEnricher)
    → Embed (EmbeddingModel)
    → Store (VectorStore)
\`\`\`

### Phase 2 — Retrieval + Generation (per-query)

\`\`\`
User query
    → Embed query
    → Search VectorStore (similarity search)
    → Retrieved documents
    → Augmented prompt (query + documents)
    → LLM generates grounded answer
\`\`\`

## Spring AI VectorStore Abstraction

Spring AI's \`VectorStore\` interface has one critical method:

\`\`\`java
public interface VectorStore {
    void add(List<Document> documents);
    List<Document> similaritySearch(SearchRequest request);
    Optional<Boolean> delete(List<String> idList);
}
\`\`\`

Implementations include PgVector (PostgreSQL), Redis, Pinecone, Weaviate, Qdrant, Milvus, ChromaDB, Neo4j. You switch implementations by changing the dependency and configuration — your application code stays the same.

## PgVector — The Default Choice for Spring Boot

PgVector stores vectors directly in PostgreSQL using the \`pgvector\` extension. It's the practical first choice: no new infrastructure (you already have Postgres), ACID-compliant, SQL-queryable, and fast enough for most use cases.

### Dependency

\`\`\`xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-pgvector-store-spring-boot-starter</artifactId>
</dependency>
\`\`\`

### Configuration

\`\`\`yaml
spring:
  ai:
    vectorstore:
      pgvector:
        index-type: HNSW              # Hierarchical Navigable Small World index
        distance-type: COSINE_DISTANCE
        dimensions: 1536              # must match your embedding model's output
        initialize-schema: true       # creates the table on startup (dev only)
  datasource:
    url: jdbc:postgresql://localhost:5432/mydb
\`\`\`

### Schema (what initialize-schema creates)

\`\`\`sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS vector_store (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content     TEXT,
    metadata    JSON,
    embedding   VECTOR(1536)
);

CREATE INDEX IF NOT EXISTS vector_store_embedding_idx
ON vector_store USING hnsw (embedding vector_cosine_ops);
\`\`\`

## Document Loading

\`\`\`java
@Service
@RequiredArgsConstructor
public class DocumentIngestionService {

    private final VectorStore vectorStore;
    private final TokenTextSplitter splitter;

    // Ingest from a PDF file
    public void ingestPdf(Resource pdfResource) {
        PagePdfDocumentReader reader = new PagePdfDocumentReader(
            pdfResource,
            PdfDocumentReaderConfig.builder()
                .withPageTopMargin(0)
                .withPageExtractedTextFormatter(
                    ExtractedTextFormatter.builder()
                        .withNumberOfTopPagesToSkipBeforeExtraction(0)
                        .build())
                .withPagesPerDocument(1)
                .build()
        );
        List<Document> rawDocs = reader.get();
        List<Document> chunks = splitter.apply(rawDocs);
        vectorStore.add(chunks);
    }

    // Ingest from plain text
    public void ingestText(String content, Map<String, Object> metadata) {
        Document doc = new Document(content, metadata);
        List<Document> chunks = splitter.apply(List.of(doc));
        vectorStore.add(chunks);
    }

    // Ingest from a web page
    public void ingestUrl(String url) {
        TikaDocumentReader reader = new TikaDocumentReader(url);
        List<Document> chunks = splitter.apply(reader.get());
        vectorStore.add(chunks);
    }
}
\`\`\`

## Configuring the Splitter

\`\`\`java
@Bean
public TokenTextSplitter tokenTextSplitter() {
    return new TokenTextSplitter(
        512,    // default chunk size in tokens
        128,    // overlap in tokens
        5,      // min chunk size
        10000,  // max chunk size
        true    // keepSeparator
    );
}
\`\`\`

Overlap rule of thumb: 20–25% of chunk size. For 500-token chunks, 100–125 token overlap is typical.

## Similarity Search

\`\`\`java
List<Document> results = vectorStore.similaritySearch(
    SearchRequest.query("how to configure Spring Security?")
        .withTopK(5)                        // return top 5 most similar
        .withSimilarityThreshold(0.7)       // minimum similarity score (0–1)
);
\`\`\`

You can also filter by metadata:

\`\`\`java
List<Document> results = vectorStore.similaritySearch(
    SearchRequest.query("payment processing")
        .withTopK(3)
        .withFilterExpression("source == 'payment-docs' && version >= '2.0'")
);
\`\`\`

Metadata filtering enables multi-tenant RAG (filter by \`tenantId\`) and version-aware retrieval.`,

'222.2': `# Building a RAG Pipeline — Ingest, Retrieve, Generate

The QuestionAnswerAdvisor is Spring AI's built-in RAG advisor. It intercepts every ChatClient call, performs a similarity search using the user's message as the query, stuffs the retrieved documents into the prompt, and calls the model with augmented context.

## The Advisor Pattern for RAG

\`\`\`java
@Bean
public ChatClient ragChatClient(ChatClient.Builder builder, VectorStore vectorStore) {
    return builder
        .defaultSystem("""
            You are a helpful assistant that answers questions about our product documentation.

            Instructions:
            - Answer ONLY based on the provided context documents
            - If the answer is not in the context, say "I don't have information about that in our documentation"
            - Always cite which document section you're drawing from
            - Be concise and precise
            """)
        .defaultAdvisors(
            new QuestionAnswerAdvisor(
                vectorStore,
                SearchRequest.defaults()
                    .withTopK(5)
                    .withSimilarityThreshold(0.65))
        )
        .build();
}
\`\`\`

Now every call to this ChatClient automatically retrieves context:

\`\`\`java
@RestController
@RequiredArgsConstructor
public class DocumentationChatController {

    private final ChatClient ragChatClient;

    @PostMapping("/api/chat/docs")
    public String answer(@RequestBody ChatRequest request) {
        return ragChatClient.prompt()
            .user(request.question())
            .call()
            .content();
    }
}
\`\`\`

## What the QuestionAnswerAdvisor Adds to the Prompt

When the user asks "How do I configure JWT authentication?", the advisor:

1. Embeds "How do I configure JWT authentication?" using the \`EmbeddingModel\`
2. Queries the VectorStore for the 5 most similar chunks
3. Inserts them into the prompt as a \`CONTEXT\` block:

\`\`\`
[System: You are a helpful assistant...]

Context information is below:
---------------------
[Chunk 1: ...JWT filter configuration...]
[Chunk 2: ...SecurityFilterChain setup...]
[Chunk 3: ...application.yml security settings...]
---------------------
Given the context information, answer the user's question.

User: How do I configure JWT authentication?
\`\`\`

## Returning Source Documents

Often you want to show the user which documents were cited:

\`\`\`java
@PostMapping("/api/chat/docs/with-sources")
public ChatWithSourcesResponse answerWithSources(@RequestBody ChatRequest request) {
    ChatResponse response = ragChatClient.prompt()
        .user(request.question())
        .call()
        .chatResponse();

    // The advisor stores retrieved documents in the response metadata
    List<Document> sources = (List<Document>) response
        .getMetadata()
        .get(QuestionAnswerAdvisor.RETRIEVED_DOCUMENTS);

    List<String> sourceRefs = sources.stream()
        .map(d -> (String) d.getMetadata().get("source"))
        .filter(Objects::nonNull)
        .distinct()
        .toList();

    return new ChatWithSourcesResponse(
        response.getResult().getOutput().getContent(),
        sourceRefs
    );
}
\`\`\`

## Enriching Document Metadata During Ingestion

Metadata is searchable and filterable — enrich it during ingestion:

\`\`\`java
public void ingestWithMetadata(Resource pdfResource, String product, String version) {
    PagePdfDocumentReader reader = new PagePdfDocumentReader(pdfResource);
    List<Document> docs = reader.get();

    // Enrich each chunk's metadata
    docs = docs.stream()
        .map(doc -> {
            Map<String, Object> metadata = new HashMap<>(doc.getMetadata());
            metadata.put("source", pdfResource.getFilename());
            metadata.put("product", product);
            metadata.put("version", version);
            metadata.put("ingested_at", Instant.now().toString());
            return new Document(doc.getId(), doc.getContent(), metadata);
        })
        .toList();

    List<Document> chunks = splitter.apply(docs);
    vectorStore.add(chunks);
}
\`\`\`

## Re-ingestion and Updates

VectorStore.add() with the same document ID upserts:

\`\`\`java
// Delete old version
vectorStore.delete(oldDocumentIds);

// Ingest new version
vectorStore.add(newChunks);
\`\`\`

For continuous data (support tickets, emails), set up a scheduled ingestion job:

\`\`\`java
@Scheduled(cron = "0 */30 * * * *") // every 30 minutes
public void ingestNewSupportTickets() {
    List<SupportTicket> newTickets = ticketRepo.findByIngestedFalse();
    newTickets.forEach(ticket -> {
        Document doc = new Document(
            ticket.getContent(),
            Map.of("ticketId", ticket.getId(), "category", ticket.getCategory())
        );
        vectorStore.add(splitter.apply(List.of(doc)));
        ticket.setIngested(true);
    });
    ticketRepo.saveAll(newTickets);
}
\`\`\`

## RAG Quality Factors

| Factor | Impact | Recommendation |
|---|---|---|
| Chunk size | Too large = diluted similarity; too small = missing context | 300–600 tokens is the sweet spot |
| Overlap | Too little = broken sentences; too much = wasted tokens | 15–25% overlap |
| Embedding model | Determines similarity quality | \`text-embedding-3-small\` for most cases |
| Top-K | Too few = missing answer; too many = noise in context | Start at 5, tune up/down |
| Similarity threshold | Too strict = empty results; too loose = irrelevant chunks | 0.6–0.75 range |
| Metadata enrichment | Enables filtering and source attribution | Always add source, version, timestamp |`,

'222.3': `# Advanced RAG — Hybrid Search, Reranking & Conversational Memory

Basic semantic search retrieves documents by embedding similarity. Advanced RAG combines multiple retrieval signals, reranks results, and maintains conversation context across turns.

## Hybrid Search — Combining Semantic + Keyword

Pure semantic search misses exact keyword matches. Hybrid search combines:
- **Dense retrieval** — embedding similarity (semantic meaning)
- **Sparse retrieval** — BM25/full-text search (keyword matching)

PgVector supports hybrid search via SQL:

\`\`\`java
@Repository
public class HybridVectorRepository {

    private final JdbcTemplate jdbc;
    private final EmbeddingModel embeddingModel;

    public List<Document> hybridSearch(String query, int topK) {
        float[] queryEmbedding = embeddingModel.embed(query);

        // Reciprocal Rank Fusion of semantic + keyword results
        String sql = """
            WITH semantic AS (
                SELECT id, content, metadata,
                       1 - (embedding <=> ?) AS semantic_score,
                       ROW_NUMBER() OVER (ORDER BY embedding <=> ?) AS rank
                FROM vector_store
            ),
            keyword AS (
                SELECT id, content, metadata,
                       ts_rank(to_tsvector('english', content),
                               plainto_tsquery('english', ?)) AS keyword_score,
                       ROW_NUMBER() OVER (
                           ORDER BY ts_rank(to_tsvector('english', content),
                                            plainto_tsquery('english', ?)) DESC
                       ) AS rank
                FROM vector_store
                WHERE to_tsvector('english', content) @@
                      plainto_tsquery('english', ?)
            ),
            fused AS (
                SELECT COALESCE(s.id, k.id) AS id,
                       COALESCE(s.content, k.content) AS content,
                       COALESCE(s.metadata, k.metadata) AS metadata,
                       (1.0 / (60 + COALESCE(s.rank, 100))) +
                       (1.0 / (60 + COALESCE(k.rank, 100))) AS rrf_score
                FROM semantic s
                FULL OUTER JOIN keyword k ON s.id = k.id
            )
            SELECT id, content, metadata FROM fused
            ORDER BY rrf_score DESC
            LIMIT ?
            """;
        // ... execute and map results
    }
}
\`\`\`

## Conversational RAG — Memory Across Turns

A question in a multi-turn conversation often depends on previous context:
- Turn 1: "What is Spring AI?"
- Turn 2: "How do I configure it?" (refers to Spring AI from Turn 1)

Without memory, Turn 2's embedding search finds generic "configuration" documents, not Spring AI docs.

Solution: Combine \`MessageChatMemoryAdvisor\` with \`QuestionAnswerAdvisor\`:

\`\`\`java
@Bean
public ChatClient conversationalRagClient(ChatClient.Builder builder, VectorStore vectorStore) {
    InMemoryChatMemory memory = new InMemoryChatMemory();

    return builder
        .defaultSystem("You are a knowledgeable assistant. Answer based on the provided context.")
        .defaultAdvisors(
            // Memory advisor FIRST — it rewrites the query using conversation history
            new MessageChatMemoryAdvisor(memory),
            // RAG advisor SECOND — it retrieves with the rewritten query
            new QuestionAnswerAdvisor(
                vectorStore,
                SearchRequest.defaults().withTopK(5))
        )
        .build();
}
\`\`\`

Per-user conversation sessions:

\`\`\`java
@PostMapping("/api/chat/session")
public String chat(@RequestBody ChatRequest request,
                   @RequestHeader("X-Session-Id") String sessionId) {
    return conversationalRagClient.prompt()
        .user(request.question())
        .advisors(a -> a.param(MessageChatMemoryAdvisor.CHAT_MEMORY_CONVERSATION_ID_KEY, sessionId))
        .call()
        .content();
}
\`\`\`

## Query Rewriting

Instead of embedding the raw user query, rewrite it to be more retrieval-friendly:

\`\`\`java
@Service
public class QueryRewritingRagService {

    private final ChatClient queryRewriter;
    private final VectorStore vectorStore;
    private final ChatClient ragClient;

    public String answer(String userQuery, String conversationHistory) {
        // Step 1: Rewrite the query for better retrieval
        String rewrittenQuery = queryRewriter.prompt()
            .system("Rewrite the user's question to be a standalone retrieval query. " +
                    "Use context from the conversation history if the question is ambiguous.")
            .user("History: " + conversationHistory + "\\nQuestion: " + userQuery)
            .call()
            .content();

        // Step 2: Retrieve with the rewritten query
        List<Document> docs = vectorStore.similaritySearch(
            SearchRequest.query(rewrittenQuery).withTopK(5));

        // Step 3: Generate with original question + retrieved docs
        String context = docs.stream()
            .map(Document::getContent)
            .collect(Collectors.joining("\\n---\\n"));

        return ragClient.prompt()
            .system("Answer using only the provided context:\\n" + context)
            .user(userQuery)
            .call()
            .content();
    }
}
\`\`\`

## Evaluating RAG Quality

Three key metrics:

| Metric | Question | How to Measure |
|---|---|---|
| **Retrieval recall** | Are the right documents being retrieved? | Manually check top-K results for sample queries |
| **Answer faithfulness** | Does the answer stick to the retrieved context? | Ask LLM: "Is this answer supported by this context? Yes/No" |
| **Answer relevance** | Does the answer address the question? | Ask LLM: "Does this answer the question? Score 1-5" |

Spring AI + Tonic Validate / DeepEval integrate for automated RAG evaluation:

\`\`\`java
// Faithfulness evaluation: does the answer hallucinate beyond the context?
String faithfulnessPrompt = """
    Context: {context}
    Answer: {answer}
    Question: Is every claim in the answer directly supported by the context?
    Return JSON: {"faithful": true/false, "unsupported_claims": ["claim1", ...]}
    """;
\`\`\`

## Production Checklist for RAG

- [ ] Chunk size tuned for your domain (code needs larger chunks than prose)
- [ ] Metadata schema defined and consistently applied during ingestion
- [ ] Similarity threshold set to avoid irrelevant chunks (not 0.0)
- [ ] Fallback when no documents retrieved ("I don't have information about...")
- [ ] Source attribution in responses (which doc answered the question)
- [ ] Ingestion pipeline idempotent (safe to re-run on updates)
- [ ] Monitoring: track retrieval hit rate, latency, and user satisfaction`,
}

export const quiz: Record<string, QuizQuestion[]> = {

'222.1': [
  {
    question: 'What are the two phases of a RAG system and what happens in each phase?',
    options: [
      'Training and inference — in training, the model learns from documents; in inference, it generates answers',
      'Ingestion and retrieval-generation — ingestion loads/splits/embeds documents into a VectorStore offline; retrieval-generation embeds the user query, finds similar chunks, and generates a grounded answer at query time',
      'Indexing and searching — both phases happen synchronously on each user query',
      'Fine-tuning and prompting — fine-tuning teaches the model your data; prompting queries the fine-tuned model',
    ],
    correctIndex: 1,
    explanation: 'RAG has two distinct phases. Ingestion (offline) loads documents, splits them, embeds each chunk, and stores them in a VectorStore. Retrieval+generation (at query time) embeds the user question, finds the top-K most similar chunks via cosine similarity, adds those chunks to the prompt as context, and generates an answer. These phases are intentionally separate — ingestion can happen on a schedule, generation happens on demand.',
  },
  {
    question: 'Why is PgVector often the best first choice for a VectorStore in a Spring Boot application?',
    options: [
      'PgVector has the highest similarity search performance of all VectorStore implementations',
      'PgVector stores vectors in PostgreSQL — no new infrastructure is needed if you already have Postgres, and it\'s ACID-compliant, SQL-queryable, and fast enough for most use cases',
      'PgVector is the only Spring AI VectorStore that supports metadata filtering',
      'PgVector automatically shards across multiple nodes for large document collections',
    ],
    correctIndex: 1,
    explanation: 'New infrastructure means new ops complexity (deployments, monitoring, backups, scaling). Most Spring Boot projects already run PostgreSQL. PgVector as a PostgreSQL extension adds vector similarity search without adding another service to manage. For pinecone-scale (hundreds of millions of vectors), specialized vector databases win; but for most enterprise use cases, PgVector is sufficient and operationally simpler.',
  },
  {
    question: 'What is the correct configuration for PgVector dimensions when using OpenAI\'s text-embedding-3-small model?',
    options: [
      'dimensions: 768 — the default for all OpenAI embedding models',
      'dimensions: 1536 — this is the output size of text-embedding-3-small, and it must match exactly',
      'dimensions: 3072 — always use the maximum for best quality',
      'dimensions is not needed — Spring AI detects it automatically at startup',
    ],
    correctIndex: 1,
    explanation: 'text-embedding-3-small outputs 1536-dimensional vectors. The PgVector table column (VECTOR(1536)) must match exactly — a mismatch causes an error at indexing time. text-embedding-3-large outputs 3072 dimensions; the dimensions setting must always match the specific model. Spring AI cannot auto-detect this because the schema is created before any embedding call.',
  },
  {
    question: 'What does setting withSimilarityThreshold(0.7) on a SearchRequest do?',
    options: [
      'It limits results to documents where 70% of the words match the query',
      'It filters out documents whose cosine similarity score to the query embedding is below 0.7, preventing irrelevant chunks from being added to the prompt',
      'It returns only the top 70% of retrieved results by relevance',
      'It sets the embedding model to use 70% of its capacity for faster results',
    ],
    correctIndex: 1,
    explanation: 'Cosine similarity ranges from -1.0 to 1.0. A threshold of 0.7 means "only include documents that are at least 70% similar to the query by direction in vector space." Without a threshold, the VectorStore always returns topK results even if they have nothing to do with the query — low-quality retrievals produce worse answers than no retrieval at all.',
  },
  {
    question: 'Why is metadata enrichment during ingestion important for production RAG systems?',
    options: [
      'Metadata reduces the size of the embedding vector, making search faster',
      'Metadata enables multi-tenant isolation (filter by tenantId), version-aware retrieval, source attribution in answers, and selective deletion/re-ingestion of document versions',
      'Spring AI requires metadata for all documents or the VectorStore will reject them',
      'Metadata automatically improves the similarity score of relevant documents',
    ],
    correctIndex: 1,
    explanation: 'Without metadata, all documents form an undifferentiated pool. With metadata, you can filter by tenant ("only search Acme Corp\'s docs"), by version ("only use v2.0+ docs"), by date ("only recent content"), or by source ("only payment-service docs"). Metadata also powers source attribution — showing users which specific document answered their question builds trust in the AI system.',
  },
],

'222.2': [
  {
    question: 'What does Spring AI\'s QuestionAnswerAdvisor do automatically on each ChatClient call?',
    options: [
      'It validates that the user\'s question is related to the configured topic domain',
      'It embeds the user message, performs a similarity search against the VectorStore, and inserts the retrieved documents into the prompt as context before the model call',
      'It calls the LLM twice — once to generate an answer and once to verify accuracy',
      'It checks the vector store for a cached answer to the exact same question',
    ],
    correctIndex: 1,
    explanation: 'QuestionAnswerAdvisor is a pre-call advisor. When a ChatClient request arrives, it: (1) takes the user\'s message text, (2) embeds it, (3) calls VectorStore.similaritySearch() with the configured SearchRequest, (4) formats the retrieved chunks as a "Context" block, and (5) inserts this block into the prompt before the system instructions and user message. The model then has concrete source material to draw from.',
  },
  {
    question: 'How do you retrieve the source documents that were used to generate a RAG answer?',
    options: [
      'Call vectorStore.getLastRetrievedDocuments() after each ChatClient call',
      'Call .chatResponse() instead of .content(), then get QuestionAnswerAdvisor.RETRIEVED_DOCUMENTS from the response metadata',
      'Annotate the ChatClient bean with @ReturnSources to automatically include source references in the response',
      'Parse the LLM\'s response text — Spring AI always appends source filenames as a JSON suffix',
    ],
    correctIndex: 1,
    explanation: 'Spring AI\'s response metadata is a Map<String, Object> where advisors can store arbitrary data. QuestionAnswerAdvisor stores the retrieved documents under the key RETRIEVED_DOCUMENTS. By calling .chatResponse() instead of .content(), you get access to this metadata. This is how you implement a "Sources:" section in your UI, showing which document sections backed the answer.',
  },
  {
    question: 'In a Spring AI RAG setup, what is the correct order of defaultAdvisors for conversational RAG?',
    options: [
      'QuestionAnswerAdvisor first, then MessageChatMemoryAdvisor — RAG context must be retrieved before memory is added',
      'MessageChatMemoryAdvisor first, then QuestionAnswerAdvisor — memory rewrites or contextualizes the query, then retrieval uses the contextualized query for better results',
      'The order doesn\'t matter — Spring AI processes all advisors simultaneously',
      'SafeGuardAdvisor must always be first regardless of other advisors',
    ],
    correctIndex: 1,
    explanation: 'Advisor order determines the processing pipeline. MessageChatMemoryAdvisor prepends previous conversation turns to the prompt. When this happens first, the user\'s query is contextualized with prior turns — making it a better retrieval query. If QuestionAnswerAdvisor runs first, it embeds only the bare user message, missing the conversational context. The order is: Memory → (query is now contextualized) → RAG → (context is retrieved based on better query) → model.',
  },
  {
    question: 'What is a scheduled ingestion job and when would you use one in a RAG system?',
    options: [
      'A job that schedules LLM API calls during off-peak hours to reduce cost',
      'A @Scheduled method that periodically ingests new documents (new support tickets, articles, product updates) into the VectorStore so the RAG system stays current with fresh data',
      'A job that pre-generates answers to common questions and caches them in the VectorStore',
      'A job that periodically re-embeds all documents with a new embedding model version',
    ],
    correctIndex: 1,
    explanation: 'RAG\'s retrieval quality depends on the VectorStore\'s contents being current. For dynamic data sources (support tickets, news articles, API documentation that updates with each release), you need scheduled ingestion. The job queries the source for new items since the last ingestion, documents them, chunks, embeds, and upserts into the VectorStore. The idempotency of upsert-by-id means re-running the job is safe.',
  },
  {
    question: 'What happens if no documents meet the similarity threshold during RAG retrieval?',
    options: [
      'Spring AI throws a NoDocumentsFoundException that you must catch in your controller',
      'The QuestionAnswerAdvisor passes an empty context to the model — your system prompt must handle this case with a fallback instruction like "If no context is provided, say you don\'t have information about that topic"',
      'The ChatClient automatically falls back to the model\'s training data knowledge',
      'The request is retried with a lower similarity threshold until documents are found',
    ],
    correctIndex: 1,
    explanation: 'When no documents meet the threshold, the advisor inserts an empty context block. Without explicit instruction, the model fills the void with its training-data knowledge — which defeats the purpose of RAG and risks hallucination. The system prompt must include a fallback instruction: "If the context is empty or doesn\'t contain an answer, respond that you don\'t have information about that topic." This keeps the model honest.',
  },
],

'222.3': [
  {
    question: 'What problem does hybrid search (combining semantic + keyword) solve that pure semantic search cannot?',
    options: [
      'Hybrid search reduces the number of API calls to the embedding model',
      'Pure semantic search can miss exact matches for technical terms, product names, or codes — hybrid search combines dense embedding similarity with sparse keyword (BM25) matching to retrieve both semantically similar and exact-match results',
      'Hybrid search enables searching across multiple VectorStore implementations simultaneously',
      'Hybrid search uses less database storage by compressing vectors with keyword indices',
    ],
    correctIndex: 1,
    explanation: 'Semantic search finds "cars" when you search "automobiles," but may miss "GPT-4o" if the embedding space doesn\'t clearly separate model version names. Keyword search (BM25/full-text) nails exact matches but misses paraphrases. Hybrid search via Reciprocal Rank Fusion merges both ranked lists — a document appearing in both gets a high combined score, and neither modality is lost.',
  },
  {
    question: 'Why is query rewriting valuable in conversational RAG?',
    options: [
      'Query rewriting reduces token count, making retrieval cheaper',
      'Conversational queries often use pronouns or implicit references ("it", "that", "configure it") that produce poor embeddings — rewriting creates a standalone, self-contained query that retrieves the right documents',
      'Query rewriting applies spell correction to handle user typos',
      'Spring AI requires standalone queries because the VectorStore cannot access conversation history',
    ],
    correctIndex: 1,
    explanation: 'If a user asks "How do I configure it?" after discussing Spring Security, embedding "How do I configure it?" produces a generic retrieval about configuration. Rewriting it to "How do I configure Spring Security?" makes the embedding encode the specific topic, retrieving the right documents. Query rewriting is especially critical for multi-turn conversations where context accumulates across many turns.',
  },
  {
    question: 'What are the three key RAG evaluation metrics and what does each measure?',
    options: [
      'Speed, cost, and accuracy — optimized together for production deployment',
      'Retrieval recall (are the right documents retrieved?), answer faithfulness (does the answer stick to retrieved context?), and answer relevance (does the answer address the question?)',
      'Token count, chunk size, and overlap percentage — optimized to minimize hallucination',
      'Precision, recall, and F1 score — standard information retrieval metrics applied directly to RAG',
    ],
    correctIndex: 1,
    explanation: 'These three metrics form the RAG evaluation triangle. Retrieval recall catches when the VectorStore fails to find relevant documents (the right answer never reaches the model). Faithfulness catches hallucination (the model invents beyond the retrieved context). Relevance catches when the model answers a different question than asked. A RAG system can fail on any of these independently — you need all three to diagnose problems correctly.',
  },
  {
    question: 'In a multi-tenant RAG system, how do you prevent one tenant\'s documents from appearing in another tenant\'s answers?',
    options: [
      'Create a separate VectorStore instance per tenant',
      'Store a tenantId in each document\'s metadata during ingestion, then apply a withFilterExpression("tenantId == \'<tenant>\'") on every SearchRequest',
      'Prefix all document IDs with the tenant identifier so Spring AI automatically partitions retrieval',
      'Multi-tenant RAG is not supported — you must create separate databases per tenant',
    ],
    correctIndex: 1,
    explanation: 'Creating separate VectorStore instances per tenant multiplies infrastructure and operational complexity. Metadata filtering is the scalable solution: tag every chunk with tenantId during ingestion, then include withFilterExpression("tenantId == \'acme\'") in every retrieval call. The filter is applied as a SQL WHERE clause in PgVector — only Acme\'s documents can ever reach Acme\'s answers. Extract the tenantId from the authenticated user\'s JWT claims for automatic enforcement.',
  },
  {
    question: 'What does the "answer faithfulness" metric measure in RAG evaluation, and how can you automate it?',
    options: [
      'Whether the answer is grammatically correct and well-formatted',
      'Whether every claim in the model\'s answer is directly supported by the retrieved context — measured by asking a separate LLM evaluation call to verify each claim against the retrieved documents',
      'Whether the answer contains the same keywords as the retrieved documents',
      'Whether the user rated the answer as helpful via thumbs up/down',
    ],
    correctIndex: 1,
    explanation: 'Faithfulness detects hallucination: the model invented a claim not present in the retrieved context. You automate it by asking a second LLM call (the "evaluator") with the context and the answer, asking it to identify any claims in the answer that are not supported by the context. This "LLM-as-judge" approach scales to large evaluation sets and catches subtle hallucinations that keyword matching would miss.',
  },
],
}

export const codingTask: Record<string, {
  instructions: string; boilerplate: string; rubric: string[]; hints: string[]
}> = {

'222.2': {
  instructions: `Implement a \`DocumentQAService\` that provides RAG-powered question answering over ingested documents.

Requirements:

1. Inject both a \`VectorStore\` and a \`ChatClient.Builder\`.

2. In the constructor, build a \`ChatClient\` with:
   - A system prompt: "You are a helpful assistant. Answer ONLY based on the provided context. If the context does not contain an answer, say: 'I don't have information about that in the documentation.'"
   - A \`QuestionAnswerAdvisor\` using the VectorStore with \`topK=5\` and \`similarityThreshold=0.65\`

3. Implement \`String answer(String question)\` — calls the ChatClient with the user's question and returns the text answer.

4. Implement \`AnswerWithSources answerWithSources(String question)\` — returns both the text answer and the list of distinct \`source\` metadata values from retrieved documents.

Define the \`AnswerWithSources\` record inside the class: \`record AnswerWithSources(String answer, List<String> sources) {}\``,
  boilerplate: `package com.example.service;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.QuestionAnswerAdvisor;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;

@Service
public class DocumentQAService {

    private final ChatClient chatClient;

    public DocumentQAService(ChatClient.Builder builder, VectorStore vectorStore) {
        // TODO: Build chatClient with system prompt and QuestionAnswerAdvisor
        this.chatClient = null;
    }

    public record AnswerWithSources(String answer, List<String> sources) {}

    public String answer(String question) {
        // TODO: Use chatClient to answer the question, return content string
        return null;
    }

    public AnswerWithSources answerWithSources(String question) {
        // TODO: Call chatResponse(), extract RETRIEVED_DOCUMENTS from metadata,
        //       map to source metadata values, return AnswerWithSources
        return null;
    }
}`,
  rubric: [
    'chatClient built with builder.defaultSystem("...only based on the provided context...").defaultAdvisors(new QuestionAnswerAdvisor(...)).build()',
    'QuestionAnswerAdvisor constructed with vectorStore and SearchRequest.defaults().withTopK(5).withSimilarityThreshold(0.65)',
    'answer() calls chatClient.prompt().user(question).call().content() and returns the result',
    'answerWithSources() calls .call().chatResponse() to get the full ChatResponse',
    'Retrieved documents extracted via response.getMetadata().get(QuestionAnswerAdvisor.RETRIEVED_DOCUMENTS)',
    'Source values mapped from document metadata with .getMetadata().get("source"), filtered with Objects::nonNull, deduplicated with .distinct()',
    'Returns new AnswerWithSources(content, sourceList)',
  ],
  hints: [
    'builder.defaultSystem("You are a helpful assistant...").defaultAdvisors(new QuestionAnswerAdvisor(vectorStore, SearchRequest.defaults().withTopK(5).withSimilarityThreshold(0.65f))).build()',
    'chatClient.prompt().user(question).call().content()',
    'ChatResponse response = chatClient.prompt().user(question).call().chatResponse()',
    'List<Document> docs = (List<Document>) response.getMetadata().get(QuestionAnswerAdvisor.RETRIEVED_DOCUMENTS)',
    'docs.stream().map(d -> (String) d.getMetadata().get("source")).filter(Objects::nonNull).distinct().toList()',
  ],
},
}
