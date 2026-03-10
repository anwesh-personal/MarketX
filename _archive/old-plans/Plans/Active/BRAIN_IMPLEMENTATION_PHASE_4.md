# AXIOM BRAIN - Phase 4: Multi-Agent System
**Duration:** Week 7-8  
**Goal:** Intelligent agent routing and specialized task execution

---

## 4.1 Database Migrations

**File:** `database/migrations/004_agent_system.sql`
```sql
-- ============================================================
-- AGENT DEFINITIONS
-- ============================================================

CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  agent_type VARCHAR(50) NOT NULL CHECK (agent_type IN ('writer', 'analyst', 'coach', 'generalist', 'custom')),
  system_prompt TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  tools TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default agents
INSERT INTO agents (name, agent_type, system_prompt, config, tools) VALUES
(
  'Writer Agent',
  'writer',
  'You are an expert content writer with access to the knowledge base. Your task is to create engaging, well-structured content based on user requirements and available context. Always cite sources when using information from the knowledge base.',
  '{
    "temperature": 0.8,
    "maxTokens": 4000,
    "capabilities": ["long_form_content", "blog_posts", "marketing_copy", "technical_docs"]
  }',
  ARRAY['kb_search', 'style_analysis', 'grammar_check', 'content_outline']
),
(
  'Analyst Agent',
  'analyst',
  'You are a data analyst capable of interpreting data, generating insights, and creating visualizations. Use SQL queries when needed and explain complex analysis in simple terms.',
  '{
    "temperature": 0.2,
    "maxTokens": 3000,
    "capabilities": ["data_analysis", "sql_queries", "statistics", "visualization"]
  }',
  ARRAY['sql_query', 'data_viz', 'statistics', 'trend_analysis']
),
(
  'Coach Agent',
  'coach',
  'You are a productivity and growth coach. Help users achieve their goals, build better habits, and stay motivated. Reference their past progress and preferences.',
  '{
    "temperature": 0.7,
    "maxTokens": 2000,
    "capabilities": ["goal_setting", "habit_tracking", "motivation", "accountability"]
  }',
  ARRAY['memory_recall', 'goal_tracking', 'habit_analysis', 'progress_report']
),
(
  'Generalist Agent',
  'generalist',
  'You are a helpful AI assistant. Answer questions accurately using the knowledge base and your general knowledge. Be conversational and friendly.',
  '{
    "temperature": 0.7,
    "maxTokens": 2000,
    "capabilities": ["general_chat", "q_and_a", "explanation"]
  }',
  ARRAY['kb_search', 'memory_recall', 'web_search']
);

CREATE INDEX agents_type_active_idx ON agents(agent_type, is_active);

-- ============================================================
-- AGENT SESSIONS
-- ============================================================

CREATE TABLE agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id),
  agent_type VARCHAR(50),
  state JSONB DEFAULT '{}',
  tools_used TEXT[] DEFAULT '{}',
  tokens_used INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX agent_sessions_conv_idx ON agent_sessions(conversation_id);
CREATE INDEX agent_sessions_agent_idx ON agent_sessions(agent_id, started_at DESC);

-- ============================================================
-- TOOL REGISTRY
-- ============================================================

CREATE TABLE tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  parameters JSONB NOT NULL,
  implementation VARCHAR(50) CHECK (implementation IN ('internal', 'api', 'function')),
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default tools
INSERT INTO tools (name, description, parameters, implementation, config) VALUES
(
  'kb_search',
  'Search the knowledge base for relevant information',
  '{
    "query": {"type": "string", "description": "Search query", "required": true},
    "maxResults": {"type": "number", "description": "Maximum results to return", "required": false, "default": 5}
  }',
  'internal',
  '{"timeout": 5000}'
),
(
  'web_search',
  'Search the web for current information',
  '{
    "query": {"type": "string", "description": "Search query", "required": true},
    "maxResults": {"type": "number", "description": "Maximum results", "required": false, "default": 5}
  }',
  'api',
  '{"provider": "serpapi", "timeout": 10000}'
),
(
  'memory_recall',
  'Retrieve user-specific memories and preferences',
  '{
    "context": {"type": "string", "description": "Context to search memories", "required": true}
  }',
  'internal',
  '{}'
),
(
  'sql_query',
  'Execute SQL queries for data analysis',
  '{
    "query": {"type": "string", "description": "SQL query", "required": true},
    "database": {"type": "string", "description": "Database name", "required": false}
  }',
  'internal',
  '{"maxRows": 1000, "timeout": 30000}'
);

CREATE INDEX tools_active_idx ON tools(is_active);

-- ============================================================
-- TOOL EXECUTION LOGS
-- ============================================================

CREATE TABLE tool_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_session_id UUID REFERENCES agent_sessions(id),
  tool_id UUID REFERENCES tools(id),
  tool_name VARCHAR(255),
  parameters JSONB,
  result JSONB,
  execution_time_ms INTEGER,
  success BOOLEAN,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX tool_exec_session_idx ON tool_executions(agent_session_id);
CREATE INDEX tool_exec_tool_idx ON tool_executions(tool_id, created_at DESC);

-- ============================================================
-- INTENT CLASSIFICATION
-- ============================================================

CREATE TABLE intent_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type VARCHAR(50) NOT NULL,
  keywords TEXT[] NOT NULL,
  regex_pattern TEXT,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert intent patterns
INSERT INTO intent_patterns (agent_type, keywords, priority) VALUES
('writer', ARRAY['write', 'create', 'draft', 'compose', 'blog', 'article', 'content'], 10),
('analyst', ARRAY['analyze', 'data', 'metrics', 'report', 'statistics', 'trends', 'query'], 10),
('coach', ARRAY['goal', 'habit', 'motivation', 'progress', 'improve', 'plan'], 10),
('generalist', ARRAY['what', 'how', 'explain', 'tell', 'who', 'when', 'where'], 5);

CREATE INDEX intent_patterns_type_idx ON intent_patterns(agent_type, is_active);

-- ============================================================
-- AGENT PERFORMANCE METRICS
-- ============================================================

CREATE TABLE agent_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id),
  date DATE NOT NULL,
  total_sessions INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER,
  avg_tokens_used INTEGER,
  avg_tools_used FLOAT,
  success_rate FLOAT,
  avg_user_rating FLOAT,
  UNIQUE(agent_id, date)
);

CREATE INDEX agent_metrics_agent_date_idx ON agent_metrics(agent_id, date DESC);
```

---

## 4.2 Backend Services

**File:** `apps/frontend/src/services/brain/agents/Agent.ts`
```typescript
import { ragOrchestrator } from '../RAGOrchestrator'
import { BrainConfig } from '../BrainConfigService'
import OpenAI from 'openai'

export interface AgentConfig {
  systemPrompt: string
  temperature: number
  maxTokens: number
  tools: string[]
}

export interface AgentContext {
  orgId: string
  userId: string
  conversationId: string
  brainConfig: BrainConfig
  sessionState?: Record<string, any>
}

export interface AgentResponse {
  content: string
  toolsUsed: ToolExecution[]
  metadata: {
    tokensUsed: number
    responseTime: number
    agentType: string
  }
}

export interface ToolExecution {
  tool: string
  parameters: any
  result: any
  executionTime: number
}

export abstract class Agent {
  protected openai: OpenAI
  abstract name: string
  abstract agentType: string
  abstract config: AgentConfig
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  }
  
  /**
   * Main execution method
   */
  async execute(
    input: string,
    context: AgentContext
  ): Promise<AgentResponse> {
    const startTime = Date.now()
    const toolsUsed: ToolExecution[] = []
    
    // 1. Gather context
    const relevantContext = await this.gatherContext(input, context)
    
    // 2. Execute tools if needed
    if (this.config.tools.length > 0) {
      const toolResults = await this.executeTools(input, context)
      toolsUsed.push(...toolResults)
    }
    
    // 3. Generate response
    const messages = this.buildMessages(input, relevantContext, toolsUsed)
    
    const response = await this.openai.chat.completions.create({
      model: context.brainConfig.models.chat,
      messages,
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens
    })
    
    const content = response.choices[0].message.content || ''
    const tokensUsed = response.usage?.total_tokens || 0
    
    return {
      content,
      toolsUsed,
      metadata: {
        tokensUsed,
        responseTime: Date.now() - startTime,
        agentType: this.agentType
      }
    }
  }
  
  /**
   * Stream execution for real-time responses
   */
  async *executeStream(
    input: string,
    context: AgentContext
  ): AsyncGenerator<string> {
    // Gather context first
    const relevantContext = await this.gatherContext(input, context)
    const toolResults = await this.executeTools(input, context)
    
    // Build messages
    const messages = this.buildMessages(input, relevantContext, toolResults)
    
    // Stream response
    const stream = await this.openai.chat.completions.create({
      model: context.brainConfig.models.chat,
      messages,
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
      stream: true
    })
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content
      if (content) {
        yield content
      }
    }
  }
  
  /**
   * Gather relevant context from RAG
   */
  protected async gatherContext(
    input: string,
    context: AgentContext
  ): Promise<string> {
    if (!context.brainConfig.rag.enabled) {
      return ''
    }
    
    const ragResult = await ragOrchestrator.retrieve(input, {
      orgId: context.orgId,
      brainConfig: context.brainConfig,
      maxResults: 5
    })
    
    return ragResult.context
  }
  
  /**
   * Execute tools
   */
  protected async executeTools(
    input: string,
    context: AgentContext
  ): Promise<ToolExecution[]> {
    const executions: ToolExecution[] = []
    
    // Determine which tools to use based on input
    const toolsToUse = await this.selectTools(input, context)
    
    for (const toolName of toolsToUse) {
      const startTime = Date.now()
      
      try {
        const result = await this.executeTool(toolName, input, context)
        
        executions.push({
          tool: toolName,
          parameters: { query: input },
          result,
          executionTime: Date.now() - startTime
        })
      } catch (error) {
        console.error(`Tool ${toolName} failed:`, error)
      }
    }
    
    return executions
  }
  
  /**
   * Select which tools to use
   */
  protected async selectTools(
    input: string,
    context: AgentContext
  ): Promise<string[]> {
    // Default: use all available tools if applicable
    // Override in subclasses for smarter selection
    return this.config.tools.filter(tool => {
      // Only use kb_search if RAG is enabled
      if (tool === 'kb_search') {
        return context.brainConfig.rag.enabled
      }
      return true
    })
  }
  
  /**
   * Execute a single tool
   */
  protected abstract executeTool(
    toolName: string,
    input: string,
    context: AgentContext
  ): Promise<any>
  
  /**
   * Build messages for LLM
   */
  protected buildMessages(
    input: string,
    ragContext: string,
    toolResults: ToolExecution[]
  ): OpenAI.Chat.ChatCompletionMessageParam[] {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: this.config.systemPrompt
      }
    ]
    
    // Add RAG context if available
    if (ragContext) {
      messages.push({
        role: 'system',
        content: `Here is relevant context from the knowledge base:\n\n${ragContext}`
      })
    }
    
    // Add tool results
    if (toolResults.length > 0) {
      const toolContext = toolResults
        .map(t => `[${t.tool}] ${JSON.stringify(t.result)}`)
        .join('\n\n')
      
      messages.push({
        role: 'system',
        content: `Tool execution results:\n\n${toolContext}`
      })
    }
    
    // Add user input
    messages.push({
      role: 'user',
      content: input
    })
    
    return messages
  }
  
  /**
   * Check if this agent can handle the intent
   */
  abstract canHandle(intent: string): boolean
}
```

**File:** `apps/frontend/src/services/brain/agents/WriterAgent.ts`
```typescript
import { Agent, AgentConfig, AgentContext } from './Agent'
import { ragOrchestrator } from '../RAGOrchestrator'

export class WriterAgent extends Agent {
  name = 'Writer Agent'
  agentType = 'writer'
  
  config: AgentConfig = {
    systemPrompt: `You are an expert content writer with access to the knowledge base. Your task is to create engaging, well-structured content based on user requirements and available context.

Guidelines:
- Always cite sources when using information from the knowledge base
- Maintain a consistent tone and style
- Structure content with clear headings and sections
- Optimize for readability
- Include relevant examples when appropriate`,
    temperature: 0.8,
    maxTokens: 4000,
    tools: ['kb_search', 'style_analysis', 'content_outline']
  }
  
  canHandle(intent: string): boolean {
    const writerKeywords = ['write', 'create', 'draft', 'compose', 'blog', 'article', 'content', 'copy']
    return writerKeywords.some(kw => intent.toLowerCase().includes(kw))
  }
  
  protected async executeTool(
    toolName: string,
    input: string,
    context: AgentContext
  ): Promise<any> {
    switch (toolName) {
      case 'kb_search':
        const ragResult = await ragOrchestrator.retrieve(input, {
          orgId: context.orgId,
          brainConfig: context.brainConfig,
          maxResults: 10
        })
        return ragResult.documents
      
      case 'content_outline':
        return this.generateOutline(input, context)
      
      case 'style_analysis':
        return this.analyzeStyle(input)
      
      default:
        return null
    }
  }
  
  private async generateOutline(
    input: string,
    context: AgentContext
  ): Promise<string[]> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
    messages: [{
        role: 'system',
        content: 'Generate a content outline with main sections and key points.'
      }, {
        role: 'user',
        content: input
      }],
      temperature: 0.7,
      max_tokens: 500
    })
    
    return response.choices[0].message.content
      ?.split('\n')
      .filter(line => line.trim()) || []
  }
  
  private analyzeStyle(input: string): any {
    // Simple style analysis
    return {
      length: input.length,
      wordCount: input.split(/\s+/).length,
      avgWordLength: input.length / input.split(/\s+/).length,
      sentenceCount: input.split(/[.!?]+/).length
    }
  }
}
```

**File:** `apps/frontend/src/services/brain/agents/IntentClassifier.ts`
```typescript
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

export type Intent = 'writer' | 'analyst' | 'coach' | 'generalist'

export class IntentClassifier {
  private supabase = createClient()
  private openai: OpenAI
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  }
  
  /**
   * Classify user intent
   */
  async classify(input: string): Promise<Intent> {
    // Try pattern matching first (fast)
    const patternMatch = await this.patternMatching(input)
    if (patternMatch) {
      return patternMatch
    }
    
    // Fall back to LLM classification
    return this.llmClassification(input)
  }
  
  /**
   * Pattern-based classification
   */
  private async patternMatching(input: string): Promise<Intent | null> {
    const { data: patterns } = await this.supabase
      .from('intent_patterns')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false })
    
    if (!patterns) return null
    
    const lowerInput = input.toLowerCase()
    
    for (const pattern of patterns) {
      // Check keywords
      const hasKeyword = pattern.keywords.some((kw: string) =>
        lowerInput.includes(kw.toLowerCase())
      )
      
      if (hasKeyword) {
        return pattern.agent_type as Intent
      }
      
      // Check regex if available
      if (pattern.regex_pattern) {
        const regex = new RegExp(pattern.regex_pattern, 'i')
        if (regex.test(input)) {
          return pattern.agent_type as Intent
        }
      }
    }
    
    return null
  }
  
  /**
   * LLM-based classification
   */
  private async llmClassification(input: string): Promise<Intent> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{
        role: 'system',
        content: `Classify the user intent into one of these categories:
- writer: Content creation, writing, drafting
- analyst: Data analysis, metrics, reporting
- coach: Goal setting, habits, productivity
- generalist: General questions, chat

Respond with only the category name.`
      }, {
        role: 'user',
        content: input
      }],
      temperature: 0.0,
      max_tokens: 10
    })
    
    const intent = response.choices[0].message.content?.trim().toLowerCase() || 'generalist'
    
    // Validate and return
    const validIntents: Intent[] = ['writer', 'analyst', 'coach', 'generalist']
    return validIntents.includes(intent as Intent) ? intent as Intent : 'generalist'
  }
}

export const intentClassifier = new IntentClassifier()
```

**Continuing with Phase 4 API routes and remaining phases...**
