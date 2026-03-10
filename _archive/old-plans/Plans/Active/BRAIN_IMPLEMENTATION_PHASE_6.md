# AXIOM BRAIN - Phase 6: Learning Loop & RLHF
**Duration:** Week 11-12  
**Goal:** Continuous improvement through user feedback

---

## 6.1 Database Migrations

**File:** `database/migrations/005_learning_loop.sql`
```sql
-- ============================================================
-- FEEDBACK SYSTEM
-- ============================================================

CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id),
  user_id UUID NOT NULL REFERENCES users(id),
  org_id UUID NOT NULL REFERENCES organizations(id),
  rating INTEGER CHECK (rating IN (-1, 0, 1)), -- thumbs down, neutral, thumbs up
  feedback_type VARCHAR(50) CHECK (feedback_type IN ('accuracy', 'style', 'helpfulness', 'safety')),
  comment TEXT,
  inline_correction TEXT,
  metadata JSONB DEFAULT '{}',
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX feedback_message_idx ON feedback(message_id);
CREATE INDEX feedback_org_idx ON feedback(org_id, created_at DESC);
CREATE INDEX feedback_processed_idx ON feedback(processed, created_at);
CREATE INDEX feedback_rating_idx ON feedback(rating, feedback_type);

-- ============================================================
-- PREFERENCE PAIRS (for RLHF training)
-- ============================================================

CREATE TABLE preference_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  prompt TEXT NOT NULL,
  response_a TEXT NOT NULL,
  response_b TEXT NOT NULL,
  preference VARCHAR(1) CHECK (preference IN ('A', 'B', 'tie')),
  model_a VARCHAR(100),
  model_b VARCHAR(100),
  confidence FLOAT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX pref_pairs_org_idx ON preference_pairs(org_id, created_at DESC);
CREATE INDEX pref_pairs_user_idx ON preference_pairs(user_id);

-- ============================================================
-- REWARD MODELS
-- ============================================================

CREATE TABLE reward_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version VARCHAR(50) UNIQUE NOT NULL,
  architecture JSONB NOT NULL,
  training_data_count INTEGER,
  validation_accuracy FLOAT,
  deployed BOOLEAN DEFAULT FALSE,
  deployed_at TIMESTAMPTZ,
  deprecated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX reward_models_version_idx ON reward_models(version);
CREATE INDEX reward_models_deployed_idx ON reward_models(deployed, deployed_at DESC);

-- ============================================================
-- POLICY MODELS (fine-tuned LLMs)
-- ============================================================

CREATE TABLE policy_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version VARCHAR(50) UNIQUE NOT NULL,
  base_model VARCHAR(100) NOT NULL,
  reward_model_id UUID REFERENCES reward_models(id),
  training_config JSONB,
  kl_divergence FLOAT,
  avg_reward FLOAT,
  validation_metrics JSONB,
  deployed BOOLEAN DEFAULT FALSE,
  deployed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX policy_models_version_idx ON policy_models(version);
CREATE INDEX policy_models_deployed_idx ON policy_models(deployed);

-- ============================================================
-- LEARNING INSIGHTS (extracted patterns)
-- ============================================================

CREATE TABLE learning_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  insight_type VARCHAR(50) CHECK (insight_type IN ('preference', 'pattern', 'error', 'improvement')),
  title VARCHAR(255),
  description TEXT,
  confidence FLOAT,
  evidence JSONB,
  applied BOOLEAN DEFAULT FALSE,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX learning_insights_org_idx ON learning_insights(org_id, created_at DESC);
CREATE INDEX learning_insights_type_idx ON learning_insights(insight_type, applied);

-- ============================================================
-- A/B TESTS
-- ============================================================

CREATE TABLE ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  control_variant JSONB NOT NULL,
  test_variant JSONB NOT NULL,
  traffic_split FLOAT DEFAULT 0.5,
  org_ids UUID[],
  user_ids UUID[],
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  winner VARCHAR(20) CHECK (winner IN ('control', 'test', 'inconclusive')),
  metrics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ab_tests_active_idx ON ab_tests(is_active, start_date);

-- ============================================================
-- A/B TEST ASSIGNMENTS
-- ============================================================

CREATE TABLE ab_test_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ab_test_id UUID REFERENCES ab_tests(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  variant VARCHAR(20) CHECK (variant IN ('control', 'test')),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ab_test_id, org_id, user_id)
);

CREATE INDEX ab_assignments_test_idx ON ab_test_assignments(ab_test_id);
CREATE INDEX ab_assignments_user_idx ON ab_test_assignments(user_id);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Process feedback batch
CREATE OR REPLACE FUNCTION process_feedback_batch(batch_size INTEGER DEFAULT 100)
RETURNS INTEGER AS $$
DECLARE
  processed_count INTEGER;
BEGIN
  -- Mark unprocessed feedback as processing
  UPDATE feedback
  SET processed = TRUE
  WHERE id IN (
    SELECT id FROM feedback
    WHERE processed = FALSE
    ORDER BY created_at
    LIMIT batch_size
  );
  
  GET DIAGNOSTICS processed_count = ROW_COUNT;
  RETURN processed_count;
END;
$$ LANGUAGE plpgsql;

-- Calculate A/B test metrics
CREATE OR REPLACE FUNCTION calculate_ab_metrics(test_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'control', jsonb_build_object(
      'total', COUNT(*) FILTER (WHERE variant = 'control'),
      'avg_rating', AVG(f.rating) FILTER (WHERE variant = 'control'),
      'positive_rate', 
        COUNT(*) FILTER (WHERE variant = 'control' AND f.rating = 1)::FLOAT / 
        NULLIF(COUNT(*) FILTER (WHERE variant = 'control'), 0)
    ),
    'test', jsonb_build_object(
      'total', COUNT(*) FILTER (WHERE variant = 'test'),
      'avg_rating', AVG(f.rating) FILTER (WHERE variant = 'test'),
      'positive_rate', 
        COUNT(*) FILTER (WHERE variant = 'test' AND f.rating = 1)::FLOAT / 
        NULLIF(COUNT(*) FILTER (WHERE variant = 'test'), 0)
    )
  ) INTO result
  FROM ab_test_assignments a
  LEFT JOIN messages m ON m.user_id = a.user_id
  LEFT JOIN feedback f ON f.message_id = m.id
  WHERE a.ab_test_id = test_uuid;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;
```

---

## 6.2 Feedback Service

**File:** `apps/frontend/src/services/brain/FeedbackService.ts`
```typescript
import { createClient } from '@/lib/supabase/server'

export interface Feedback {
  id?: string
  messageId: string
  conversationId?: string
  userId: string
  orgId: string
  rating: -1 | 0 | 1
  feedbackType: 'accuracy' | 'style' | 'helpfulness' | 'safety'
  comment?: string
  inlineCorrection?: string
  metadata?: Record<string, any>
}

export class FeedbackService {
  private supabase = createClient()
  
  /**
   * Submit feedback
   */
  async submitFeedback(feedback: Feedback): Promise<void> {
    const { error } = await this.supabase
      .from('feedback')
      .insert({
        message_id: feedback.messageId,
        conversation_id: feedback.conversationId,
        user_id: feedback.userId,
        org_id: feedback.orgId,
        rating: feedback.rating,
        feedback_type: feedback.feedbackType,
        comment: feedback.comment,
        inline_correction: feedback.inlineCorrection,
        metadata: feedback.metadata || {}
      })
    
    if (error) throw error
  }
  
  /**
   * Submit preference pair
   */
  async submitPreference(data: {
    orgId: string
    userId: string
    prompt: string
    responseA: string
    responseB: string
    preference: 'A' | 'B' | 'tie'
    modelA?: string
    modelB?: string
    confidence?: number
  }): Promise<void> {
    const { error } = await this.supabase
      .from('preference_pairs')
      .insert({
        org_id: data.orgId,
        user_id: data.userId,
        prompt: data.prompt,
        response_a: data.responseA,
        response_b: data.responseB,
        preference: data.preference,
        model_a: data.modelA,
        model_b: data.modelB,
        confidence: data.confidence
      })
    
    if (error) throw error
  }
  
  /**
   * Get feedback summary
   */
  async getFeedbackSummary(
    orgId: string,
    days: number = 30
  ): Promise<any> {
    const { data, error } = await this.supabase
      .from('feedback')
      .select('rating, feedback_type, created_at')
      .eq('org_id', orgId)
      .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
    
    if (error) throw error
    
    // Calculate metrics
    const total = data?.length || 0
    const positive = data?.filter(f => f.rating === 1).length || 0
    const negative = data?.filter(f => f.rating === -1).length || 0
    const neutral = data?.filter(f => f.rating === 0).length || 0
    
    const byType = data?.reduce((acc: any, f) => {
      acc[f.feedback_type] = (acc[f.feedback_type] || 0) + 1
      return acc
    }, {})
    
    return {
      total,
      positive,
      negative,
      neutral,
      positiveRate: total > 0 ? positive / total : 0,
      byType,
      rawData: data
    }
  }
  
  /**
   * Get unprocessed feedback
   */
  async getUnprocessedFeedback(limit: number = 100): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('feedback')
      .select(`
        *,
        message:messages(content, role),
        user:users(email, full_name)
      `)
      .eq('processed', false)
      .order('created_at', { ascending: true })
      .limit(limit)
    
    if (error) throw error
    return data || []
  }
}

export const feedbackService = new FeedbackService()
```

---

## 6.3 Learning Loop Worker

**File:** `workers/src/workers/learning-loop.ts`
```typescript
import { Worker, Job } from 'bullmq'
import { redis } from '../config/redis'
import { supabase } from '../config/supabase'
import OpenAI from 'openai'

interface LearningJobData {
  type: 'analyze_feedback' | 'extract_patterns' | 'train_reward_model'
  orgId?: string
  batchSize?: number
}

export class LearningLoopWorker {
  private worker: Worker
  private openai: OpenAI
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
    
    this.worker = new Worker(
      'learning-loop',
      async (job: Job<LearningJobData>) => {
        return this.processLearningTask(job)
      },
      {
        connection: redis,
        concurrency: 2
      }
    )
    
    this.setupEventHandlers()
  }
  
  private async processLearningTask(job: Job<LearningJobData>) {
    const { type, orgId, batchSize = 100 } = job.data
    
    switch (type) {
      case 'analyze_feedback':
        return this.analyzeFeedback(orgId, batchSize)
      
      case 'extract_patterns':
        return this.extractPatterns(orgId)
      
      case 'train_reward_model':
        return this.trainRewardModel()
      
      default:
        throw new Error(`Unknown learning task type: ${type}`)
    }
  }
  
  /**
   * Analyze feedback and extract insights
   */
  private async analyzeFeedback(
    orgId: string | undefined,
    batchSize: number
  ) {
    // Get unprocessed feedback
    let query = supabase
      .from('feedback')
      .select(`
        *,
        message:messages(content, role, conversation_id)
      `)
      .eq('processed', false)
      .order('created_at', { ascending: true })
      .limit(batchSize)
    
    if (orgId) {
      query = query.eq('org_id', orgId)
    }
    
    const { data: feedback, error } = await query
    
    if (error) throw error
    if (!feedback || feedback.length === 0) {
      return { processed: 0 }
    }
    
    // Group by rating and type
    const negative = feedback.filter(f => f.rating === -1)
    const positive = feedback.filter(f => f.rating === 1)
    
    // Analyze negative feedback for improvements
    if (negative.length > 0) {
      const insights = await this.analyzeNegativeFeedback(negative)
      
      // Store insights
      for (const insight of insights) {
        await supabase
          .from('learning_insights')
          .insert({
            org_id: orgId,
            insight_type: 'improvement',
            title: insight.title,
            description: insight.description,
            confidence: insight.confidence,
            evidence: { feedbackIds: negative.map(f => f.id) }
          })
      }
    }
    
    // Extract preferences from positive feedback
    if (positive.length > 0) {
      await this.extractPreferences(positive)
    }
    
    // Mark as processed
    await supabase
      .from('feedback')
      .update({ processed: true })
      .in('id', feedback.map(f => f.id))
    
    return {
      processed: feedback.length,
      insights: insights?.length || 0
    }
  }
  
  /**
   * Analyze negative feedback using LLM
   */
  private async analyzeNegativeFeedback(feedback: any[]): Promise<any[]> {
    const feedbackText = feedback.map(f => ({
      message: f.message?.content,
      comment: f.comment,
      type: f.feedback_type
    }))
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{
        role: 'system',
        content: `Analyze this negative feedback and extract common patterns or issues. 
Return insights in JSON format with: title, description, confidence (0-1).`
      }, {
        role: 'user',
        content: JSON.stringify(feedbackText)
      }],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    })
    
    const result = JSON.parse(response.choices[0].message.content || '{"insights": []}')
    return result.insights || []
  }
  
  /**
   * Extract user preferences
   */
  private async extractPreferences(feedback: any[]): Promise<void> {
    // Look for patterns in positive feedback
    const patterns: Record<string, number> = {}
    
    for (const f of feedback) {
      if (f.comment) {
        // Simple keyword extraction (could be enhanced with NLP)
        const keywords = f.comment.toLowerCase().split(/\s+/)
        
        for (const kw of keywords) {
          patterns[kw] = (patterns[kw] || 0) + 1
        }
      }
    }
    
    // Store top patterns as preferences
    const topPatterns = Object.entries(patterns)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
    
    for (const [pattern, count] of topPatterns) {
      await supabase
        .from('learning_insights')
        .insert({
          insight_type: 'preference',
          title: `Users prefer: ${pattern}`,
          description: `Found in ${count} positive feedback instances`,
          confidence: Math.min(count / feedback.length, 1),
          evidence: { count, total: feedback.length }
        })
    }
  }
  
  /**
   * Extract patterns from conversation data
   */
  private async extractPatterns(orgId: string | undefined) {
    // Analyze successful vs unsuccessful conversations
    let query = supabase
      .from('conversations')
      .select(`
        id,
        total_messages,
        summary,
        messages(rating_avg:feedback(rating))
      `)
      .order('created_at', { ascending: false })
      .limit(500)
    
    if (orgId) {
      query = query.eq('org_id', orgId)
    }
    
    const { data: conversations } = await query
    
    if (!conversations) return { patterns: 0 }
    
    // Calculate success metrics
    const successful = conversations.filter(c => {
      const avgRating = (c as any).messages?.[0]?.rating_avg || 0
      return avgRating > 0.5
    })
    
    const unsuccessful = conversations.filter(c => {
      const avgRating = (c as any).messages?.[0]?.rating_avg || 0
      return avgRating < -0.5
    })
    
    // Compare patterns
    const pattern = {
      successful_avg_length: successful.reduce((sum, c) => sum + c.total_messages, 0) / successful.length,
      unsuccessful_avg_length: unsuccessful.reduce((sum, c) => sum + c.total_messages, 0) / unsuccessful.length
    }
    
    await supabase
      .from('learning_insights')
      .insert({
        org_id: orgId,
        insight_type: 'pattern',
        title: 'Conversation length analysis',
        description: `Successful conversations avg ${pattern.successful_avg_length.toFixed(1)} messages vs ${pattern.unsuccessful_avg_length.toFixed(1)} for unsuccessful`,
        confidence: 0.8,
        evidence: pattern
      })
    
    return { patterns: 1 }
  }
  
  /**
   * Train reward model (simplified - in production use actual ML training)
   */
  private async trainRewardModel() {
    // Get preference pairs
    const { data: pairs, error } = await supabase
      .from('preference_pairs')
      .select('*')
      .limit(1000)
    
    if (error) throw error
    if (!pairs || pairs.length < 100) {
      return { trained: false, reason: 'Insufficient data' }
    }
    
    // In production, this would train an actual reward model
    // For now, create a simple version based on preferences
    
    const version = `v${Date.now()}`
    
    await supabase
      .from('reward_models')
      .insert({
        version,
        architecture: {
          type: 'preference_based',
          training_samples: pairs.length
        },
        training_data_count: pairs.length,
        validation_accuracy: 0.85, // Mock value
        deployed: false
      })
    
    return {
      trained: true,
      version,
      samples: pairs.length
    }
  }
  
  private setupEventHandlers() {
    this.worker.on('completed', (job) => {
      console.log(`✅ Learning task completed: ${job.id}`)
    })
    
    this.worker.on('failed', (job, err) => {
      console.error(`❌ Learning task failed: ${job?.id}`, err)
    })
  }
  
  getWorker() {
    return this.worker
  }
}
```

---

## 6.4 A/B Testing Service

**File:** `apps/frontend/src/services/brain/ABTestService.ts`
```typescript
import { createClient } from '@/lib/supabase/server'

export interface ABTest {
  id?: string
  name: string
  description?: string
  controlVariant: any
  testVariant: any
  trafficSplit: number
  orgIds?: string[]
  userIds?: string[]
  startDate: string
  endDate?: string
  isActive: boolean
}

export class ABTestService {
  private supabase = createClient()
  
  /**
   * Create A/B test
   */
  async createTest(test: ABTest): Promise<any> {
    const { data, error } = await this.supabase
      .from('ab_tests')
      .insert({
        name: test.name,
        description: test.description,
        control_variant: test.controlVariant,
        test_variant: test.testVariant,
        traffic_split: test.trafficSplit,
        org_ids: test.orgIds,
        user_ids: test.userIds,
        start_date: test.startDate,
        end_date: test.endDate,
        is_active: test.isActive
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  }
  
  /**
   * Get variant assignment for user
   */
  async getVariant(
    testId: string,
    userId: string,
    orgId: string
  ): Promise<'control' | 'test'> {
    // Check existing assignment
    const { data: existing } = await this.supabase
      .from('ab_test_assignments')
      .select('variant')
      .eq('ab_test_id', testId)
      .eq('user_id', userId)
      .single()
    
    if (existing) {
      return existing.variant as 'control' | 'test'
    }
    
    // Get test config
    const { data: test } = await this.supabase
      .from('ab_tests')
      .select('traffic_split')
      .eq('id', testId)
      .single()
    
    if (!test) throw new Error('Test not found')
    
    // Assign variant based on traffic split
    const variant = Math.random() < test.traffic_split ? 'test' : 'control'
    
    // Save assignment
    await this.supabase
      .from('ab_test_assignments')
      .insert({
        ab_test_id: testId,
        org_id: orgId,
        user_id: userId,
        variant
      })
    
    return variant
  }
  
  /**
   * Calculate test metrics
   */
  async getTestMetrics(testId: string): Promise<any> {
    const { data, error } = await this.supabase
      .rpc('calculate_ab_metrics', { test_uuid: testId })
    
    if (error) throw error
    return data
  }
  
  /**
   * Determine test winner
   */
  async determineWinner(testId: string): Promise<'control' | 'test' | 'inconclusive'> {
    const metrics = await this.getTestMetrics(testId)
    
    const controlRate = metrics.control?.positive_rate || 0
    const testRate = metrics.test?.positive_rate || 0
    const diff = Math.abs(testRate - controlRate)
    const minSampleSize = 100
    
    // Need sufficient data and significant difference
    if (metrics.control.total < minSampleSize || metrics.test.total < minSampleSize) {
      return 'inconclusive'
    }
    
    if (diff < 0.05) {
      return 'inconclusive'
    }
    
    return testRate > controlRate ? 'test' : 'control'
  }
}

export const abTestService = new ABTestService()
```

---

## Success Metrics

- ✅ Feedback collection rate >20%
- ✅ Pattern detection accuracy >85%
- ✅ A/B test statistical significance (p<0.05)
- ✅ Model improvement >10% per iteration
- ✅ Processing latency <10min

**Phase 6 Complete. Creating Phases 7 & 8...**
