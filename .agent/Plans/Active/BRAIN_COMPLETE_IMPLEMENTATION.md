# AXIOM BRAIN - Complete Implementation Plan

> **NO BAND-AIDS | NO STUBS | NO TODOs | NO MVPs**
> **Every line of code must be production-ready**
> 
> **Created:** 2026-01-24
> **Target Completion:** Full Implementation
> **Author:** Ghazal

---

## ⚠️ RULES

1. **NO STUBS** - Every function must be fully implemented
2. **NO TODOs** - Code is complete or it doesn't exist
3. **NO BAND-AIDS** - Proper solutions, no quick fixes
4. **NO BREVITY** - Full documentation and error handling
5. **NO MVPs** - Production-grade from day one
6. **FULL TYPE SAFETY** - TypeScript strict mode
7. **COMPLETE ERROR HANDLING** - Every edge case
8. **COMPREHENSIVE LOGGING** - Debug, info, error levels
9. **PERFORMANCE OPTIMIZED** - Sub-second responses
10. **SECURITY FIRST** - RLS, validation, sanitization

---

## 📋 IMPLEMENTATION PHASES

### Phase 1: BrainOrchestrator
### Phase 2: AnalystAgent
### Phase 3: CoachAgent  
### Phase 4: Dream State
### Phase 5: Self-Healing System
### Phase 6: Fine-tuning Pipeline

---

# PHASE 1: BRAIN ORCHESTRATOR

## 1.1 Overview

The BrainOrchestrator is the **central intelligence layer** that:
- Routes user queries to the appropriate agent
- Manages context windows and token budgets
- Combines memory retrieval from multiple sources
- Handles streaming responses
- Tracks conversation state
- Applies constitution/brand rules

## 1.2 File Location

```
apps/frontend/src/services/brain/BrainOrchestrator.ts
```

## 1.3 Dependencies

- `RAGOrchestrator` - Already built
- `VectorStore` - Already built
- `IntentClassifier` - Already built
- `Agent`, `WriterAgent`, `GeneralistAgent` - Already built
- `AnalystAgent`, `CoachAgent` - To be built

## 1.4 Type Definitions

```typescript
// ============================================================
// BRAIN ORCHESTRATOR TYPES
// ============================================================

interface BrainContext {
    orgId: string;
    userId: string;
    conversationId: string;
    brainConfig: BrainConfig;
    constitutionId?: string;
    kbId?: string;
    userPreferences?: UserPreferences;
}

interface ProcessInput {
    message: string;
    attachments?: Attachment[];
    context?: Record<string, any>;
    streaming?: boolean;
}

interface ProcessResult {
    response: string;
    agent: string;
    intent: Intent;
    sources: Source[];
    tokenUsage: TokenUsage;
    metadata: ProcessMetadata;
}

interface StreamChunk {
    type: 'content' | 'metadata' | 'error' | 'done';
    content?: string;
    metadata?: Partial<ProcessMetadata>;
    error?: string;
}

interface TokenBudget {
    maxTotal: number;          // Total tokens available (e.g., 8000)
    maxContext: number;        // Max for context (e.g., 4000)
    maxMemory: number;         // Max for RAG (e.g., 2000)
    maxResponse: number;       // Max for response (e.g., 2000)
}

interface ConversationState {
    messages: ConversationMessage[];
    summaries: string[];
    entities: ExtractedEntity[];
    currentTopic: string;
    emotionalTone: string;
}

interface MemoryRetrievalResult {
    ragContext: string;
    documents: RetrievedDocument[];
    userMemory: UserMemoryItem[];
    conversationHistory: ConversationMessage[];
    constitutionRules: string[];
}
```

## 1.5 Core Methods

```typescript
class BrainOrchestrator {
    // Main entry point - streaming
    async *process(
        input: ProcessInput,
        context: BrainContext
    ): AsyncGenerator<StreamChunk>

    // Main entry point - non-streaming
    async processSync(
        input: ProcessInput,
        context: BrainContext
    ): Promise<ProcessResult>

    // Route to appropriate agent
    private async selectAgent(
        intent: Intent,
        context: BrainContext
    ): Promise<Agent>

    // Build complete context from all memory sources
    private async buildMemoryContext(
        query: string,
        context: BrainContext
    ): Promise<MemoryRetrievalResult>

    // Assemble final prompt with all context
    private assemblePrompt(
        input: ProcessInput,
        memory: MemoryRetrievalResult,
        context: BrainContext
    ): AssembledPrompt

    // Manage token budget
    private allocateTokenBudget(
        totalAvailable: number,
        priorities: TokenPriority[]
    ): TokenBudget

    // Trim context to fit budget
    private trimToTokenBudget(
        content: string,
        maxTokens: number
    ): string

    // Track conversation state
    private async updateConversationState(
        input: ProcessInput,
        response: string,
        context: BrainContext
    ): Promise<void>

    // Apply constitution rules
    private async applyConstitution(
        response: string,
        constitutionId: string
    ): Promise<string>

    // Post-process response (citations, formatting)
    private postProcess(
        response: string,
        sources: Source[]
    ): string
}
```

## 1.6 Implementation Details

### 1.6.1 Agent Selection Logic

```typescript
private async selectAgent(intent: Intent, context: BrainContext): Promise<Agent> {
    // Priority order based on intent confidence and capabilities
    const agentMap = {
        'write_content': WriterAgent,
        'analyze_data': AnalystAgent,
        'coach_user': CoachAgent,
        'general_chat': GeneralistAgent,
    };

    // Check agent availability based on brain config
    const availableAgents = context.brainConfig.enabledAgents || ['generalist'];

    // Find best matching agent
    for (const [intentType, AgentClass] of Object.entries(agentMap)) {
        if (intent.type === intentType && availableAgents.includes(intentType)) {
            return new AgentClass(context.brainConfig);
        }
    }

    // Fallback to generalist
    return new GeneralistAgent(context.brainConfig);
}
```

### 1.6.2 Memory Retrieval Pipeline

```typescript
private async buildMemoryContext(
    query: string,
    context: BrainContext
): Promise<MemoryRetrievalResult> {
    // Run all retrievals in parallel for speed
    const [
        ragResult,
        userMemory,
        conversationHistory,
        constitutionRules
    ] = await Promise.all([
        // 1. RAG from knowledge base
        this.ragOrchestrator.retrieve(query, {
            orgId: context.orgId,
            brainConfig: context.brainConfig,
            brainTemplateId: context.brainConfig.templateId
        }),

        // 2. User-specific memory
        this.getUserMemory(context.userId, context.orgId),

        // 3. Recent conversation history
        this.getConversationHistory(context.conversationId, 10),

        // 4. Constitution/brand rules
        context.constitutionId 
            ? this.getConstitutionRules(context.constitutionId)
            : Promise.resolve([])
    ]);

    return {
        ragContext: ragResult.context,
        documents: ragResult.documents,
        userMemory,
        conversationHistory,
        constitutionRules
    };
}
```

### 1.6.3 Streaming Implementation

```typescript
async *process(
    input: ProcessInput,
    context: BrainContext
): AsyncGenerator<StreamChunk> {
    const startTime = Date.now();

    try {
        // 1. Classify intent
        const intent = await this.intentClassifier.classify(input.message, context);
        yield { type: 'metadata', metadata: { intent } };

        // 2. Select agent
        const agent = await this.selectAgent(intent, context);
        yield { type: 'metadata', metadata: { agent: agent.name } };

        // 3. Build memory context
        const memory = await this.buildMemoryContext(input.message, context);
        yield { type: 'metadata', metadata: { sourcesCount: memory.documents.length } };

        // 4. Assemble prompt
        const prompt = this.assemblePrompt(input, memory, context);

        // 5. Execute agent with streaming
        for await (const chunk of agent.executeStreaming(prompt, context)) {
            yield { type: 'content', content: chunk };
        }

        // 6. Record metrics
        const duration = Date.now() - startTime;
        yield { 
            type: 'metadata', 
            metadata: { 
                durationMs: duration,
                sources: memory.documents.map(d => d.citation)
            } 
        };

        // 7. Update conversation state
        await this.updateConversationState(input, '', context);

        yield { type: 'done' };

    } catch (error) {
        yield { type: 'error', error: error.message };
    }
}
```

---

# PHASE 2: ANALYST AGENT

## 2.1 Overview

The AnalystAgent is a specialized agent for:
- Data analysis and interpretation
- SQL query generation
- Statistical insights
- Trend identification
- Visualization recommendations

## 2.2 File Location

```
apps/frontend/src/services/brain/agents/AnalystAgent.ts
```

## 2.3 Capabilities

| Capability | Description |
|------------|-------------|
| `sql_query` | Generate and execute SQL queries |
| `statistical_analysis` | Mean, median, correlation, regression |
| `trend_detection` | Identify patterns over time |
| `anomaly_detection` | Find outliers and unusual data |
| `data_visualization` | Recommend chart types |
| `comparison_analysis` | Compare periods, segments |

## 2.4 Type Definitions

```typescript
interface AnalysisRequest {
    query: string;
    dataContext?: DataContext;
    timeRange?: TimeRange;
    dimensions?: string[];
    metrics?: string[];
}

interface AnalysisResult {
    summary: string;
    insights: Insight[];
    data?: any[];
    sql?: string;
    visualizations: VisualizationRecommendation[];
    confidence: number;
}

interface Insight {
    type: 'trend' | 'anomaly' | 'comparison' | 'correlation';
    title: string;
    description: string;
    significance: 'high' | 'medium' | 'low';
    data: Record<string, any>;
}

interface VisualizationRecommendation {
    chartType: 'line' | 'bar' | 'pie' | 'scatter' | 'heatmap' | 'table';
    title: string;
    xAxis?: string;
    yAxis?: string;
    series?: string[];
    config?: ChartConfig;
}
```

## 2.5 Core Methods

```typescript
class AnalystAgent extends Agent {
    name = 'Analyst';
    
    async execute(task: Task, context: AgentContext): Promise<AgentResponse> {
        // 1. Parse analysis request
        const request = this.parseRequest(task);

        // 2. Determine data sources needed
        const dataSources = await this.identifyDataSources(request, context);

        // 3. Generate SQL if needed
        const sqlQuery = await this.generateSQL(request, dataSources);

        // 4. Execute query safely
        const rawData = await this.executeQuery(sqlQuery, context);

        // 5. Run statistical analysis
        const analysis = this.runStatistics(rawData, request);

        // 6. Generate insights
        const insights = await this.generateInsights(analysis, request);

        // 7. Recommend visualizations
        const visualizations = this.recommendVisualizations(analysis);

        // 8. Generate natural language summary
        const summary = await this.generateSummary(insights, context);

        return {
            content: summary,
            data: {
                insights,
                visualizations,
                rawData: rawData.slice(0, 100), // Limit for response
                sql: sqlQuery
            }
        };
    }

    private async generateSQL(
        request: AnalysisRequest,
        dataSources: DataSource[]
    ): Promise<string> {
        // Use LLM to generate safe SQL
        // Include schema context for accuracy
    }

    private async executeQuery(
        sql: string,
        context: AgentContext
    ): Promise<any[]> {
        // Execute via read-only connection
        // Timeout and row limits
    }

    private runStatistics(
        data: any[],
        request: AnalysisRequest
    ): StatisticalResult {
        // Calculate metrics, trends, correlations
    }

    private async generateInsights(
        analysis: StatisticalResult,
        request: AnalysisRequest
    ): Promise<Insight[]> {
        // Use LLM to interpret stats
    }

    private recommendVisualizations(
        analysis: StatisticalResult
    ): VisualizationRecommendation[] {
        // Rule-based chart recommendations
    }
}
```

---

# PHASE 3: COACH AGENT

## 3.1 Overview

The CoachAgent is a specialized agent for:
- Personal productivity coaching
- Goal setting and tracking
- Habit formation
- Motivation and accountability
- Progress reflection

## 3.2 File Location

```
apps/frontend/src/services/brain/agents/CoachAgent.ts
```

## 3.3 Capabilities

| Capability | Description |
|------------|-------------|
| `goal_tracking` | Set, update, track goals |
| `habit_analysis` | Identify patterns in behavior |
| `progress_reflection` | Review accomplishments |
| `motivation` | Encouragement and support |
| `accountability` | Check-ins and reminders |
| `strategy_suggestion` | Recommend approaches |

## 3.4 Type Definitions

```typescript
interface CoachingContext {
    userId: string;
    goals: Goal[];
    habits: Habit[];
    sessions: CoachingSession[];
    preferences: CoachingPreferences;
}

interface Goal {
    id: string;
    title: string;
    description: string;
    category: 'health' | 'career' | 'personal' | 'learning' | 'financial';
    targetDate: Date;
    milestones: Milestone[];
    progress: number;
    status: 'active' | 'completed' | 'paused' | 'abandoned';
}

interface Habit {
    id: string;
    name: string;
    frequency: 'daily' | 'weekly' | 'monthly';
    streakCurrent: number;
    streakBest: number;
    completionRate: number;
    lastCompleted: Date;
}

interface CoachingSession {
    id: string;
    date: Date;
    type: 'checkin' | 'planning' | 'reflection' | 'strategy';
    notes: string;
    actionItems: ActionItem[];
}

interface CoachingResponse {
    message: string;
    tone: 'supportive' | 'encouraging' | 'challenging' | 'celebratory';
    suggestions: Suggestion[];
    actionItems: ActionItem[];
    followUpDate?: Date;
}
```

## 3.5 Core Methods

```typescript
class CoachAgent extends Agent {
    name = 'Coach';

    async execute(task: Task, context: AgentContext): Promise<AgentResponse> {
        // 1. Load coaching context
        const coachingContext = await this.loadCoachingContext(context.userId);

        // 2. Classify coaching intent
        const coachingIntent = this.classifyCoachingIntent(task.input);

        // 3. Execute based on intent
        let response: CoachingResponse;

        switch (coachingIntent) {
            case 'goal_setting':
                response = await this.handleGoalSetting(task, coachingContext);
                break;
            case 'progress_update':
                response = await this.handleProgressUpdate(task, coachingContext);
                break;
            case 'reflection':
                response = await this.handleReflection(task, coachingContext);
                break;
            case 'accountability':
                response = await this.handleAccountability(task, coachingContext);
                break;
            case 'motivation':
                response = await this.handleMotivation(task, coachingContext);
                break;
            default:
                response = await this.handleGeneralCoaching(task, coachingContext);
        }

        // 4. Update user memory with insights
        await this.updateUserMemory(context.userId, response);

        // 5. Schedule follow-up if needed
        if (response.followUpDate) {
            await this.scheduleFollowUp(context.userId, response);
        }

        return {
            content: response.message,
            data: {
                suggestions: response.suggestions,
                actionItems: response.actionItems
            }
        };
    }

    private async handleGoalSetting(
        task: Task,
        context: CoachingContext
    ): Promise<CoachingResponse> {
        // Extract goal details from user input
        // Check for conflicts with existing goals
        // Create SMART goal structure
        // Return structured response with guidance
    }

    private async handleProgressUpdate(
        task: Task,
        context: CoachingContext
    ): Promise<CoachingResponse> {
        // Parse progress information
        // Update goal/habit records
        // Calculate streak changes
        // Provide feedback and encouragement
    }

    private async handleReflection(
        task: Task,
        context: CoachingContext
    ): Promise<CoachingResponse> {
        // Summarize recent progress
        // Identify patterns and achievements
        // Suggest areas for improvement
        // Celebrate wins
    }
}
```

---

# PHASE 4: DREAM STATE

## 4.1 Overview

The Dream State is a **background processing system** that:
- Runs during low-activity periods (night/off-hours)
- Optimizes memories and embeddings
- Consolidates learnings from feedback
- Prunes outdated or irrelevant data
- Pre-computes common query patterns
- Generates conversation summaries

## 4.2 File Locations

```
apps/backend/src/core/dreamState/
├── DreamStateOrchestrator.ts    # Main orchestrator
├── jobs/
│   ├── MemoryConsolidation.ts   # Merge/prune memories
│   ├── EmbeddingOptimization.ts # Improve vector quality
│   ├── PatternPrecomputation.ts # Cache common queries
│   ├── ConversationSummary.ts   # Summarize old convos
│   ├── FeedbackAnalysis.ts      # Analyze feedback patterns
│   └── CleanupJob.ts            # Remove stale data
└── types.ts                     # Type definitions
```

## 4.3 Scheduling

```typescript
// Dream State runs during off-peak hours
// Configurable per organization timezone

interface DreamSchedule {
    enabled: boolean;
    startHour: number;     // e.g., 2 (2 AM)
    endHour: number;       // e.g., 6 (6 AM)
    timezone: string;      // e.g., 'Asia/Kolkata'
    maxDurationMinutes: number;
    priority: 'low' | 'normal' | 'high';
}
```

## 4.4 Type Definitions

```typescript
interface DreamJob {
    id: string;
    type: DreamJobType;
    orgId: string;
    priority: number;
    status: 'pending' | 'running' | 'completed' | 'failed';
    progress: number;
    startedAt?: Date;
    completedAt?: Date;
    result?: DreamJobResult;
    error?: string;
}

type DreamJobType = 
    | 'memory_consolidation'
    | 'embedding_optimization'
    | 'pattern_precomputation'
    | 'conversation_summary'
    | 'feedback_analysis'
    | 'cleanup';

interface DreamJobResult {
    processed: number;
    updated: number;
    deleted: number;
    errors: number;
    insights: DreamInsight[];
    duration: number;
}

interface DreamInsight {
    type: 'optimization' | 'pattern' | 'anomaly' | 'recommendation';
    title: string;
    description: string;
    actionRequired: boolean;
    data: Record<string, any>;
}
```

## 4.5 Core Methods

```typescript
class DreamStateOrchestrator {
    // Start dream state processing for an org
    async startDreamCycle(orgId: string): Promise<DreamCycle>

    // Check if it's dream time for this org
    isDreamTime(orgId: string): boolean

    // Queue a dream job
    async queueJob(job: Omit<DreamJob, 'id' | 'status'>): Promise<string>

    // Process next job in queue
    async processNextJob(): Promise<DreamJobResult | null>

    // Run memory consolidation
    async consolidateMemories(orgId: string): Promise<ConsolidationResult>

    // Optimize embeddings
    async optimizeEmbeddings(orgId: string): Promise<OptimizationResult>

    // Pre-compute common patterns
    async precomputePatterns(orgId: string): Promise<PatternResult>

    // Summarize old conversations
    async summarizeConversations(orgId: string): Promise<SummaryResult>

    // Analyze feedback for learnings
    async analyzeFeedback(orgId: string): Promise<FeedbackResult>

    // Cleanup stale data
    async cleanup(orgId: string): Promise<CleanupResult>
}
```

## 4.6 Memory Consolidation Details

```typescript
class MemoryConsolidationJob {
    async run(orgId: string): Promise<ConsolidationResult> {
        // 1. Find duplicate/similar memories
        const duplicates = await this.findDuplicateMemories(orgId);

        // 2. Merge similar memories
        const merged = await this.mergeMemories(duplicates);

        // 3. Identify outdated memories
        const outdated = await this.findOutdatedMemories(orgId);

        // 4. Archive or delete based on policy
        await this.archiveMemories(outdated);

        // 5. Strengthen frequently accessed memories
        await this.strengthenFrequentMemories(orgId);

        // 6. Create memory indices for faster retrieval
        await this.updateMemoryIndices(orgId);

        return {
            duplicatesFound: duplicates.length,
            memoriesMerged: merged.length,
            memoriesArchived: outdated.length,
            indicesUpdated: true
        };
    }

    private async findDuplicateMemories(orgId: string): Promise<MemoryPair[]> {
        // Use vector similarity to find near-duplicates
        // Threshold: cosine similarity > 0.95
    }

    private async mergeMemories(pairs: MemoryPair[]): Promise<Memory[]> {
        // Combine content, keep best metadata
        // Update embeddings for merged memories
    }
}
```

## 4.7 Embedding Optimization Details

```typescript
class EmbeddingOptimizationJob {
    async run(orgId: string): Promise<OptimizationResult> {
        // 1. Find embeddings with old models
        const outdatedEmbeddings = await this.findOutdatedEmbeddings(orgId);

        // 2. Re-generate with latest model
        for (const batch of this.batchEmbeddings(outdatedEmbeddings)) {
            await this.regenerateEmbeddings(batch);
        }

        // 3. Find low-quality embeddings (by usage patterns)
        const lowQuality = await this.findLowQualityEmbeddings(orgId);

        // 4. Enhance with additional context
        await this.enhanceEmbeddings(lowQuality);

        // 5. Update vector indices
        await this.rebuildVectorIndex(orgId);

        return {
            regenerated: outdatedEmbeddings.length,
            enhanced: lowQuality.length,
            indexRebuilt: true
        };
    }
}
```

---

# PHASE 5: SELF-HEALING SYSTEM

## 5.1 Overview

The Self-Healing System **automatically improves** the AI based on:
- User feedback (thumbs up/down)
- Error patterns
- Performance metrics
- Conversation outcomes
- Agent accuracy

## 5.2 File Locations

```
apps/backend/src/core/selfHealing/
├── SelfHealingOrchestrator.ts   # Main orchestrator
├── analyzers/
│   ├── FeedbackAnalyzer.ts      # Pattern detection
│   ├── ErrorAnalyzer.ts         # Error categorization
│   ├── PerformanceAnalyzer.ts   # Latency/cost analysis
│   └── OutcomeAnalyzer.ts       # Success rate tracking
├── healers/
│   ├── PromptHealer.ts          # Adjust prompts
│   ├── MemoryHealer.ts          # Fix memories
│   ├── AgentHealer.ts           # Adjust agent behavior
│   └── KBHealer.ts              # Update knowledge base
└── types.ts
```

## 5.3 Healing Triggers

| Trigger | Threshold | Action |
|---------|-----------|--------|
| Negative feedback rate > 20% | 5+ in 24h | Analyze and adjust prompts |
| Same error > 3 times | 3 occurrences | Auto-fix or escalate |
| Response latency > 5s avg | 10+ requests | Optimize retrieval |
| Agent misrouting > 10% | 20+ requests | Retrain classifier |
| Memory retrieval failure | 5+ failures | Rebuild indices |

## 5.4 Type Definitions

```typescript
interface HealingTrigger {
    id: string;
    type: TriggerType;
    condition: TriggerCondition;
    threshold: number;
    windowMinutes: number;
    action: HealingAction;
    enabled: boolean;
}

type TriggerType = 
    | 'negative_feedback'
    | 'repeated_error'
    | 'high_latency'
    | 'low_accuracy'
    | 'retrieval_failure'
    | 'agent_misrouting';

interface HealingAction {
    type: ActionType;
    priority: 'immediate' | 'next_dream' | 'manual';
    autoExecute: boolean;
    notifyAdmin: boolean;
}

type ActionType = 
    | 'adjust_prompt'
    | 'update_memory'
    | 'retrain_classifier'
    | 'rebuild_index'
    | 'escalate_to_admin'
    | 'add_to_kb';

interface HealingResult {
    triggerId: string;
    action: ActionType;
    success: boolean;
    changes: Change[];
    metrics: {
        before: Record<string, number>;
        after: Record<string, number>;
    };
}
```

## 5.5 Core Methods

```typescript
class SelfHealingOrchestrator {
    // Check all triggers and heal if needed
    async runHealingCycle(orgId: string): Promise<HealingCycleResult>

    // Analyze feedback patterns
    async analyzeFeedback(orgId: string): Promise<FeedbackPattern[]>

    // Detect error patterns
    async analyzeErrors(orgId: string): Promise<ErrorPattern[]>

    // Check performance metrics
    async analyzePerformance(orgId: string): Promise<PerformanceIssue[]>

    // Execute healing action
    async executeHealing(
        trigger: HealingTrigger,
        data: AnalysisData
    ): Promise<HealingResult>

    // Adjust agent prompts based on feedback
    async adjustPrompts(
        agentId: string,
        feedback: FeedbackPattern[]
    ): Promise<PromptUpdate>

    // Update KB based on corrections
    async updateKnowledgeBase(
        errors: ErrorPattern[],
        corrections: Correction[]
    ): Promise<KBUpdate>

    // Validate healing was effective
    async validateHealing(result: HealingResult): Promise<ValidationResult>

    // Rollback if healing made things worse
    async rollbackHealing(resultId: string): Promise<void>
}
```

## 5.6 Prompt Healer Implementation

```typescript
class PromptHealer {
    async heal(
        agentId: string,
        issues: FeedbackPattern[]
    ): Promise<PromptUpdate> {
        // 1. Load current prompts
        const currentPrompts = await this.loadAgentPrompts(agentId);

        // 2. Analyze what went wrong
        const analysis = await this.analyzeIssues(issues);

        // 3. Generate prompt adjustments using LLM
        const adjustments = await this.generateAdjustments(
            currentPrompts,
            analysis
        );

        // 4. Validate adjustments (test with historical queries)
        const validated = await this.validateAdjustments(
            adjustments,
            issues.map(i => i.sampleQuery)
        );

        // 5. Apply if validation passes
        if (validated.improvementScore > 0.1) {
            await this.applyPromptUpdate(agentId, validated.prompts);
            return { success: true, changes: validated.changes };
        }

        return { success: false, reason: 'No improvement detected' };
    }

    private async generateAdjustments(
        prompts: AgentPrompts,
        analysis: IssueAnalysis
    ): Promise<PromptAdjustment[]> {
        // Use LLM to analyze issues and suggest fixes
        const systemPrompt = `
You are a prompt engineer. Analyze these issues and suggest improvements:

Current System Prompt:
${prompts.system}

Issues Found:
${analysis.issues.map(i => `- ${i.description}`).join('\n')}

Negative Feedback Examples:
${analysis.negativeExamples.slice(0, 5).map(e => `User: ${e.query}\nResponse: ${e.response}\nFeedback: ${e.feedback}`).join('\n---\n')}

Provide specific prompt adjustments that would prevent these issues.
Format as JSON: { adjustments: [{ section, oldText, newText, reason }] }
        `;

        const response = await this.llm.generate(systemPrompt);
        return JSON.parse(response).adjustments;
    }
}
```

## 5.7 Knowledge Base Healer

```typescript
class KBHealer {
    async heal(
        kbId: string,
        errors: ErrorPattern[]
    ): Promise<KBUpdate> {
        // 1. Identify KB gaps from errors
        const gaps = await this.identifyKBGaps(errors);

        // 2. Generate missing content
        for (const gap of gaps) {
            const content = await this.generateContent(gap);
            await this.addToKB(kbId, content);
        }

        // 3. Fix incorrect information
        const incorrect = await this.findIncorrectInfo(errors);
        for (const item of incorrect) {
            await this.correctKBEntry(kbId, item);
        }

        // 4. Improve unclear entries
        const unclear = await this.findUnclearEntries(errors);
        for (const entry of unclear) {
            await this.clarifyKBEntry(kbId, entry);
        }

        // 5. Re-embed updated content
        await this.reembedUpdatedContent(kbId);

        return {
            gapsFilled: gaps.length,
            correctionsMade: incorrect.length,
            entriesClarified: unclear.length
        };
    }
}
```

---

# PHASE 6: FINE-TUNING PIPELINE

## 6.1 Overview

The Fine-tuning Pipeline enables:
- Collecting training data from positive interactions
- Formatting data for fine-tuning
- Submitting fine-tuning jobs to OpenAI
- Managing model versions
- A/B testing fine-tuned models
- Rolling back to base models

## 6.2 File Locations

```
apps/backend/src/core/fineTuning/
├── FineTuningOrchestrator.ts    # Main orchestrator
├── DataCollector.ts             # Gather training data
├── DataFormatter.ts             # Format for OpenAI
├── JobManager.ts                # Manage fine-tuning jobs
├── ModelRegistry.ts             # Track model versions
├── ABTester.ts                  # A/B test models
└── types.ts
```

## 6.3 Type Definitions

```typescript
interface TrainingExample {
    id: string;
    messages: ChatMessage[];
    rating: number;           // 1-5 from feedback
    source: 'feedback' | 'curated';
    orgId: string;
    agentType: string;
    createdAt: Date;
}

interface FineTuningJob {
    id: string;
    openaiJobId: string;
    orgId: string;
    baseModel: string;        // e.g., 'gpt-3.5-turbo'
    status: 'pending' | 'running' | 'completed' | 'failed';
    examplesCount: number;
    resultModelId?: string;
    metrics?: FineTuningMetrics;
    createdAt: Date;
    completedAt?: Date;
}

interface ModelVersion {
    id: string;
    orgId: string;
    modelId: string;          // OpenAI model ID
    version: number;
    baseModel: string;
    trainingExamples: number;
    accuracy: number;
    status: 'active' | 'testing' | 'retired';
    deployedAt?: Date;
}

interface ABTest {
    id: string;
    orgId: string;
    modelA: string;           // Current model
    modelB: string;           // New model
    trafficSplit: number;     // 0-100, % to model B
    startedAt: Date;
    endsAt: Date;
    metrics: ABMetrics;
    status: 'running' | 'completed' | 'cancelled';
    winner?: 'A' | 'B' | 'tie';
}
```

## 6.4 Core Methods

```typescript
class FineTuningOrchestrator {
    // Collect training data from positive feedback
    async collectTrainingData(
        orgId: string,
        minRating: number = 4
    ): Promise<TrainingExample[]>

    // Format data for OpenAI fine-tuning
    async formatForFineTuning(
        examples: TrainingExample[]
    ): Promise<OpenAITrainingData>

    // Submit fine-tuning job
    async submitFineTuningJob(
        orgId: string,
        data: OpenAITrainingData,
        baseModel: string
    ): Promise<FineTuningJob>

    // Monitor job status
    async monitorJob(jobId: string): Promise<JobStatus>

    // Register new model version
    async registerModel(
        job: FineTuningJob
    ): Promise<ModelVersion>

    // Start A/B test
    async startABTest(
        orgId: string,
        currentModel: string,
        newModel: string,
        config: ABTestConfig
    ): Promise<ABTest>

    // Evaluate A/B test results
    async evaluateABTest(testId: string): Promise<ABTestResult>

    // Deploy winning model
    async deployModel(
        orgId: string,
        modelId: string
    ): Promise<void>

    // Rollback to previous version
    async rollback(orgId: string): Promise<void>
}
```

## 6.5 Data Collection Implementation

```typescript
class DataCollector {
    async collect(
        orgId: string,
        minRating: number
    ): Promise<TrainingExample[]> {
        // 1. Query highly-rated interactions
        const positiveInteractions = await this.supabase
            .from('messages')
            .select(`
                id,
                conversation_id,
                role,
                content,
                feedback(rating, comment)
            `)
            .eq('org_id', orgId)
            .gte('feedback.rating', minRating)
            .order('created_at', { ascending: false })
            .limit(1000);

        // 2. Group by conversation
        const conversations = this.groupByConversation(positiveInteractions);

        // 3. Format as training examples
        const examples: TrainingExample[] = [];
        for (const conv of conversations) {
            examples.push({
                id: conv.id,
                messages: this.formatMessages(conv.messages),
                rating: conv.avgRating,
                source: 'feedback',
                orgId,
                agentType: conv.agentType,
                createdAt: new Date()
            });
        }

        // 4. Filter duplicates
        return this.deduplicateExamples(examples);
    }
}
```

## 6.6 Model Registry Implementation

```typescript
class ModelRegistry {
    // Get current active model for org
    async getCurrentModel(orgId: string): Promise<ModelVersion>

    // List all versions for org
    async listVersions(orgId: string): Promise<ModelVersion[]>

    // Register new version
    async registerVersion(
        orgId: string,
        modelId: string,
        metadata: VersionMetadata
    ): Promise<ModelVersion>

    // Set active version
    async setActiveVersion(
        orgId: string,
        versionId: string
    ): Promise<void>

    // Get model for request (handles A/B testing)
    async getModelForRequest(
        orgId: string,
        requestId: string
    ): Promise<{ modelId: string; isTest: boolean }>

    // Retire old versions
    async retireOldVersions(
        orgId: string,
        keepCount: number
    ): Promise<number>
}
```

---

# DATABASE MIGRATIONS REQUIRED

## New Tables Needed

```sql
-- Dream State
CREATE TABLE dream_jobs (...);
CREATE TABLE dream_cycles (...);
CREATE TABLE dream_insights (...);

-- Self-Healing
CREATE TABLE healing_triggers (...);
CREATE TABLE healing_results (...);
CREATE TABLE healing_rollbacks (...);

-- Fine-Tuning
CREATE TABLE training_examples (...);
CREATE TABLE finetuning_jobs (...);
CREATE TABLE model_versions (...);
CREATE TABLE ab_tests (...);

-- Coaching
CREATE TABLE user_goals (...);
CREATE TABLE user_habits (...);
CREATE TABLE coaching_sessions (...);
```

---

# IMPLEMENTATION ORDER

1. **Week 1: BrainOrchestrator** - Central routing (depends on existing agents)
2. **Week 2: AnalystAgent** - Data analysis capabilities
3. **Week 3: CoachAgent** - Productivity coaching
4. **Week 4: Dream State** - Background optimization
5. **Week 5: Self-Healing** - Auto-improvement
6. **Week 6: Fine-Tuning** - Model improvement

---

# SUCCESS METRICS

| System | Metric | Target |
|--------|--------|--------|
| BrainOrchestrator | Routing accuracy | > 95% |
| AnalystAgent | Query accuracy | > 90% |
| CoachAgent | User satisfaction | > 4.5/5 |
| Dream State | Memory optimization | > 20% reduction |
| Self-Healing | Issue auto-fix rate | > 60% |
| Fine-Tuning | Model improvement | > 10%/iteration |

---

**NO SHORTCUTS. IMPLEMENT FULLY OR DON'T IMPLEMENT AT ALL.**
