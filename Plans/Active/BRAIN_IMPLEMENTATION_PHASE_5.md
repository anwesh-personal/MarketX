# AXIOM BRAIN - Phase 5: Worker Processing System
**Duration:** Week 9-10  
**Goal:** Background job processing for heavy workloads

---

## 5.1 Infrastructure Setup

**File:** `workers/package.json`
```json
{
  "name": "@axiom/workers",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "build": "tsc",
    "test": "jest"
  },
  "dependencies": {
    "bullmq": "^5.0.0",
    "ioredis": "^5.3.0",
    "@supabase/supabase-js": "^2.39.0",
    "openai": "^4.24.0",
    "pdf-parse": "^1.1.1",
    "mammoth": "^1.6.0",
    "tiktoken": "^1.0.0",
    "node-cron": "^3.0.3"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.3.0"
  }
}
```

**File:** `workers/src/config/redis.ts`
```typescript
import Redis from 'ioredis'

export const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000)
    return delay
  }
})

redis.on('connect', () => {
  console.log('✅ Redis connected')
})

redis.on('error', (err) => {
  console.error('❌ Redis error:', err)
})
```

**File:** `workers/src/config/supabase.ts`
```typescript
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
```

---

## 5.2 Queue Definitions

**File:** `workers/src/queues/index.ts`
```typescript
import { Queue } from 'bullmq'
import { redis } from '../config/redis'

// KB Processing Queue
export const kbQueue = new Queue('kb-processing', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: {
      age: 86400, // 24 hours
      count: 1000
    },
    removeOnFail: {
      age: 604800 // 7 days
    }
  }
})

// Embedding Generation Queue
export const embeddingQueue = new Queue('embedding-generation', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    }
  }
})

// Conversation Summarization Queue
export const summaryQueue = new Queue('conversation-summary', {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 5000
    }
  }
})

// Learning Loop Queue
export const learningQueue = new Queue('learning-loop', {
  connection: redis,
  defaultJobOptions: {
    attempts: 1,
    priority: 5, // Lower priority
  }
})

// Analytics Queue
export const analyticsQueue = new Queue('analytics', {
  connection: redis,
  defaultJobOptions: {
    attempts: 2
  }
})

export const queues = {
  kb: kbQueue,
  embedding: embeddingQueue,
  summary: summaryQueue,
  learning: learningQueue,
  analytics: analyticsQueue
}
```

---

## 5.3 KB Processing Worker

**File:** `workers/src/workers/kb-processor.ts`
```typescript
import { Worker, Job } from 'bullmq'
import { redis } from '../config/redis'
import { supabase } from '../config/supabase'
import { embeddingQueue } from '../queues'
import fs from 'fs/promises'
import path from 'path'
import pdf from 'pdf-parse'
import mammoth from 'mammoth'

interface KBJobData {
  kbId: string
  orgId: string
  filePath: string
  fileType: string
  chunkSize?: number
  chunkOverlap?: number
}

export class KBProcessor {
  private worker: Worker
  
  constructor() {
    this.worker = new Worker(
      'kb-processing',
      async (job: Job<KBJobData>) => {
        return this.processKB(job)
      },
      {
        connection: redis,
        concurrency: 5,
        limiter: {
          max: 10,
          duration: 60000 // 10 jobs per minute
        }
      }
    )
    
    this.setupEventHandlers()
  }
  
  private async processKB(job: Job<KBJobData>) {
    const { kbId, orgId, filePath, fileType, chunkSize = 1000, chunkOverlap = 200 } = job.data
    
    job.log(`Starting KB processing: ${kbId}`)
    await job.updateProgress(0)
    
    try {
      // 1. Download file from Supabase Storage
      job.log('Downloading file...')
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('knowledge-bases')
        .download(filePath)
      
      if (downloadError) throw downloadError
      
      await job.updateProgress(20)
      
      // 2. Extract text based on file type
      job.log('Extracting text...')
      const text = await this.extractText(fileData, fileType)
      
      await job.updateProgress(40)
      
      // 3. Chunk text
      job.log('Chunking text...')
      const chunks = this.chunkText(text, chunkSize, chunkOverlap)
      
      job.log(`Created ${chunks.length} chunks`)
      await job.updateProgress(60)
      
      // 4. Queue embedding jobs
      job.log('Queueing embedding jobs...')
      const embeddingJobs = chunks.map((chunk, index) => ({
        name: `embed-${kbId}-chunk-${index}`,
        data: {
          kbId,
          orgId,
          chunkIndex: index,
          content: chunk,
          totalChunks: chunks.length
        }
      }))
      
      await embeddingQueue.addBulk(embeddingJobs)
      
      await job.updateProgress(80)
      
      // 5. Update KB record
      await supabase
        .from('knowledge_bases')
        .update({
          data: {
            ...job.data,
            totalChunks: chunks.length,
            processedAt: new Date().toISOString(),
            status: 'processing_embeddings'
          }
        })
        .eq('id', kbId)
      
      await job.updateProgress(100)
      
      return {
        success: true,
        chunksCreated: chunks.length,
        kbId
      }
    } catch (error: any) {
      job.log(`Error: ${error.message}`)
      
      // Update KB with error
      await supabase
        .from('knowledge_bases')
        .update({
          data: {
            error: error.message,
            status: 'failed'
          }
        })
        .eq('id', kbId)
      
      throw error
    }
  }
  
  private async extractText(file: Blob, fileType: string): Promise<string> {
    const buffer = Buffer.from(await file.arrayBuffer())
    
    switch (fileType.toLowerCase()) {
      case 'pdf':
        const pdfData = await pdf(buffer)
        return pdfData.text
      
      case 'docx':
      case 'doc':
        const docxResult = await mammoth.extractRawText({ buffer })
        return docxResult.value
      
      case 'txt':
        return buffer.toString('utf-8')
      
      default:
        throw new Error(`Unsupported file type: ${fileType}`)
    }
  }
  
  private chunkText(
    text: string,
    maxSize: number,
    overlap: number
  ): string[] {
    const chunks: string[] = []
    
    // Split into sentences
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
    
    let currentChunk: string[] = []
    let currentLength = 0
    
    for (const sentence of sentences) {
      const sentenceLength = sentence.length
      
      if (currentLength + sentenceLength > maxSize && currentChunk.length > 0) {
        // Finalize current chunk
        chunks.push(currentChunk.join(' '))
        
        // Start new chunk with overlap
        const overlapSentences = this.getOverlapSentences(currentChunk, overlap)
        currentChunk = overlapSentences
        currentLength = currentChunk.join(' ').length
      }
      
      currentChunk.push(sentence.trim())
      currentLength += sentenceLength + 1
    }
    
    // Add final chunk
    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '))
    }
    
    return chunks
  }
  
  private getOverlapSentences(sentences: string[], targetLength: number): string[] {
    const overlap: string[] = []
    let length = 0
    
    for (let i = sentences.length - 1; i >= 0; i--) {
      const sentence = sentences[i]
      if (length + sentence.length <= targetLength) {
        overlap.unshift(sentence)
        length += sentence.length + 1
      } else {
        break
      }
    }
    
    return overlap
  }
  
  private setupEventHandlers() {
    this.worker.on('completed', (job) => {
      console.log(`✅ KB processed: ${job.id}`)
    })
    
    this.worker.on('failed', (job, err) => {
      console.error(`❌ KB processing failed: ${job?.id}`, err)
    })
    
    this.worker.on('progress', (job, progress) => {
      console.log(`📊 KB processing progress: ${job.id} - ${progress}%`)
    })
  }
  
  getWorker() {
    return this.worker
  }
}
```

---

## 5.4 Embedding Generation Worker

**File:** `workers/src/workers/embedding-generator.ts`
```typescript
import { Worker, Job } from 'bullmq'
import { redis } from '../config/redis'
import { supabase } from '../config/supabase'
import OpenAI from 'openai'

interface EmbeddingJobData {
  kbId: string
  orgId: string
  chunkIndex: number
  content: string
  totalChunks: number
}

export class EmbeddingGenerator {
  private worker: Worker
  private openai: OpenAI
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
    
    this.worker = new Worker(
      'embedding-generation',
      async (job: Job<EmbeddingJobData>) => {
        return this.generateEmbedding(job)
      },
      {
        connection: redis,
        concurrency: 10,
        limiter: {
          max: 100,
          duration: 60000 // 100 embeddings per minute
        }
      }
    )
    
    this.setupEventHandlers()
  }
  
  private async generateEmbedding(job: Job<EmbeddingJobData>) {
    const { kbId, orgId, chunkIndex, content, totalChunks } = job.data
    
    try {
      // Generate embedding
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-large',
        input: content,
        dimensions: 1536
      })
      
      const embedding = response.data[0].embedding
      
      // Store in database
      const { error } = await supabase
        .from('embeddings')
        .insert({
          org_id: orgId,
          source_type: 'kb',
          source_id: kbId,
          chunk_index: chunkIndex,
          content: content,
          embedding: JSON.stringify(embedding),
          metadata: {
            model: 'text-embedding-3-large',
            dimensions: 1536,
            totalChunks
          }
        })
      
      if (error) throw error
      
      // Update KB progress
      const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100)
      
      await supabase
        .from('knowledge_bases')
        .update({
          data: supabase.raw(`
            jsonb_set(
              data,
              '{embeddingProgress}',
              '${progress}'::jsonb
            )
          `)
        })
        .eq('id', kbId)
      
      // Mark as complete if last chunk
      if (chunkIndex === totalChunks - 1) {
        await supabase
          .from('knowledge_bases')
          .update({
            data: {
              status: 'ready',
              completedAt: new Date().toISOString()
            }
          })
          .eq('id', kbId)
      }
      
      return {
        success: true,
        kbId,
        chunkIndex,
        progress
      }
    } catch (error: any) {
      job.log(`Error generating embedding: ${error.message}`)
      throw error
    }
  }
  
  private setupEventHandlers() {
    this.worker.on('completed', (job) => {
      console.log(`✅ Embedding generated: ${job.id}`)
    })
    
    this.worker.on('failed', (job, err) => {
      console.error(`❌ Embedding generation failed: ${job?.id}`, err)
    })
  }
  
  getWorker() {
    return this.worker
  }
}
```

---

## 5.5 Conversation Summarization Worker

**File:** `workers/src/workers/conversation-summarizer.ts`
```typescript
import { Worker, Job } from 'bullmq'
import { redis } from '../config/redis'
import { supabase } from '../config/supabase'
import OpenAI from 'openai'

interface SummaryJobData {
  conversationId: string
  orgId: string
  userId: string
}

export class ConversationSummarizer {
  private worker: Worker
  private openai: OpenAI
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
    
    this.worker = new Worker(
      'conversation-summary',
      async (job: Job<SummaryJobData>) => {
        return this.summarizeConversation(job)
      },
      {
        connection: redis,
        concurrency: 3
      }
    )
    
    this.setupEventHandlers()
  }
  
  private async summarizeConversation(job: Job<SummaryJobData>) {
    const { conversationId, orgId, userId } = job.data
    
    try {
      // Get messages
      const { data: messages, error } = await supabase
        .from('messages')
        .select('role, content, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
      
      if (error) throw error
      
      if (!messages || messages.length === 0) {
        return { success: true, summary: null }
      }
      
      // Format messages for summarization
      const transcript = messages
        .map(m => `${m.role}: ${m.content}`)
        .join('\n\n')
      
      // Generate summary
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{
          role: 'system',
          content: `Summarize this conversation in 2-3 concise sentences. Focus on:
1. Main topics discussed
2. Key decisions or outcomes
3. Action items or next steps`
        }, {
          role: 'user',
          content: transcript
        }],
        temperature: 0.3,
        max_tokens: 200
      })
      
      const summary = response.choices[0].message.content || ''
      
      // Extract key points
      const keyPointsResponse = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{
          role: 'system',
          content: 'Extract 3-5 key points or topics from this conversation. Return as a JSON array of strings.'
        }, {
          role: 'user',
          content: transcript
        }],
        temperature: 0.3,
        max_tokens: 300,
        response_format: { type: 'json_object' }
      })
      
      const keyPoints = JSON.parse(keyPointsResponse.choices[0].message.content || '{"points": []}')
      
      // Store summary
      await supabase
        .from('conversations')
        .update({
          summary,
          metadata: {
            keyPoints: keyPoints.points || [],
            summarizedAt: new Date().toISOString(),
            messageCount: messages.length
          }
        })
        .eq('id', conversationId)
      
      return {
        success: true,
        summary,
        keyPoints: keyPoints.points || []
      }
    } catch (error: any) {
      job.log(`Error summarizing conversation: ${error.message}`)
      throw error
    }
  }
  
  private setupEventHandlers() {
    this.worker.on('completed', (job) => {
      console.log(`✅ Conversation summarized: ${job.id}`)
    })
    
    this.worker.on('failed', (job, err) => {
      console.error(`❌ Summarization failed: ${job?.id}`, err)
    })
  }
  
  getWorker() {
    return this.worker
  }
}
```

---

## 5.6 Main Worker Entry Point

**File:** `workers/src/index.ts`
```typescript
import 'dotenv/config'
import { KBProcessor } from './workers/kb-processor'
import { EmbeddingGenerator } from './workers/embedding-generator'
import { ConversationSummarizer } from './workers/conversation-summarizer'
import cron from 'node-cron'
import { supabase } from './config/supabase'
import { summaryQueue } from './queues'

async function main() {
  console.log('🚀 Starting Axiom Workers...')
  
  // Start workers
  const kbProcessor = new KBProcessor()
  const embeddingGenerator = new EmbeddingGenerator()
  const conversationSummarizer = new ConversationSummarizer()
  
  console.log('✅ All workers started')
  
  // Schedule periodic tasks
  schedulePeriodicTasks()
  
  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('Shutting down workers...')
    await kbProcessor.getWorker().close()
    await embeddingGenerator.getWorker().close()
    await conversationSummarizer.getWorker().close()
    process.exit(0)
  })
}

function schedulePeriodicTasks() {
  // Summarize conversations every hour
  cron.schedule('0 * * * *', async () => {
    console.log('Running periodic conversation summarization...')
    
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id, org_id, user_id')
      .is('summary', null)
      .gte('total_messages', 10)
      .limit(100)
    
    if (conversations && conversations.length > 0) {
      const jobs = conversations.map(conv => ({
        name: `summary-${conv.id}`,
        data: {
          conversationId: conv.id,
          orgId: conv.org_id,
          userId: conv.user_id
        }
      }))
      
      await summaryQueue.addBulk(jobs)
      console.log(`Queued ${jobs.length} conversations for summarization`)
    }
  })
  
  console.log('✅ Periodic tasks scheduled')
}

main().catch(console.error)
```

---

## 5.7 Docker Configuration

**File:** `workers/Dockerfile`
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Run worker
CMD ["npm", "start"]
```

**File:** `workers/docker-compose.yml`
```yaml
version: '3.8'

services:
  worker:
    build: .
    environment:
      - NODE_ENV=production
      - REDIS_URL=${REDIS_URL}
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    restart: unless-stopped
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '2'
          memory: 2G
```

---

## Success Metrics

- ✅ KB processing time <2min per MB
- ✅ Embedding generation <100ms per chunk
- ✅ Job completion rate >99.5%
- ✅ Max queue depth <1000
- ✅ Worker uptime >99.9%

**Phase 5 Complete. Creating Phase 6...**
