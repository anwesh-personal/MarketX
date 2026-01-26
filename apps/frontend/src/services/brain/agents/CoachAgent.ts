/**
 * COACH AGENT
 * ============
 * Specialized agent for mentoring, guidance, and personal development.
 * 
 * Capabilities:
 * - Goal setting and tracking
 * - Habit formation guidance
 * - Motivational support
 * - Learning path recommendations
 * - Feedback and evaluation
 * - Accountability partnerships
 * - Skill development coaching
 * - Mindset and growth strategies
 * 
 * NO STUBS. NO TODOs. PRODUCTION-GRADE.
 */

import { Agent, AgentConfig, AgentContext, AgentResponse, ToolExecution, ChatMessage } from './Agent';
import { ragOrchestrator } from '../RAGOrchestrator';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Goal {
    id: string;
    title: string;
    description: string;
    category: GoalCategory;
    status: 'not_started' | 'in_progress' | 'completed' | 'paused';
    progress: number; // 0-100
    milestones: Milestone[];
    targetDate?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export type GoalCategory =
    | 'career'
    | 'learning'
    | 'health'
    | 'productivity'
    | 'relationships'
    | 'finance'
    | 'creativity'
    | 'personal';

export interface Milestone {
    id: string;
    title: string;
    completed: boolean;
    completedAt?: Date;
    dueDate?: Date;
}

export interface Habit {
    id: string;
    name: string;
    frequency: 'daily' | 'weekly' | 'custom';
    streak: number;
    bestStreak: number;
    completions: HabitCompletion[];
    reminders: string[];
    motivation: string;
}

export interface HabitCompletion {
    date: Date;
    completed: boolean;
    notes?: string;
}

export interface LearningPath {
    id: string;
    skill: string;
    level: 'beginner' | 'intermediate' | 'advanced';
    steps: LearningStep[];
    resources: LearningResource[];
    estimatedTime: string;
}

export interface LearningStep {
    order: number;
    title: string;
    description: string;
    completed: boolean;
    resources: string[];
}

export interface LearningResource {
    type: 'article' | 'video' | 'course' | 'book' | 'practice';
    title: string;
    url?: string;
    duration?: string;
    difficulty: 'easy' | 'medium' | 'hard';
}

export interface FeedbackResult {
    overall: 'excellent' | 'good' | 'needs_improvement' | 'struggling';
    strengths: string[];
    improvements: string[];
    actionItems: string[];
    encouragement: string;
}

// ============================================================================
// COACH AGENT CLASS
// ============================================================================

export class CoachAgent extends Agent {
    name = 'Coach Agent';
    agentType = 'coach';

    config: AgentConfig = {
        systemPrompt: `You are an empathetic and insightful personal coach, dedicated to helping users achieve their goals and grow as individuals. You combine wisdom, encouragement, and practical strategies to guide users toward success.

## Your Role:
- **Supportive Mentor**: Listen actively and understand the user's situation
- **Goal Partner**: Help set, track, and achieve meaningful goals
- **Accountability Buddy**: Provide gentle accountability and check-ins
- **Growth Catalyst**: Encourage continuous learning and improvement
- **Motivator**: Offer encouragement during challenges and celebrate wins

## Coaching Principles:
1. **Empathy First** - Understand the person before giving advice
2. **Ask Powerful Questions** - Help users discover their own insights
3. **Celebrate Progress** - Acknowledge every step forward, no matter how small
4. **Growth Mindset** - Frame challenges as opportunities to learn
5. **Actionable Steps** - Always provide concrete next actions
6. **Realistic Expectations** - Balance ambition with achievability
7. **Holistic View** - Consider work-life balance and wellbeing

## Coaching Approach:
1. Listen and understand the current situation
2. Clarify goals and desired outcomes
3. Explore obstacles and challenges
4. Co-create strategies and action plans
5. Provide resources and recommendations
6. Set up accountability mechanisms
7. Celebrate wins and learn from setbacks

## You Excel At:
- Goal setting (SMART goals, OKRs)
- Habit formation (atomic habits, habit stacking)
- Time management and productivity
- Career development and transitions
- Skill building and learning paths
- Overcoming procrastination and blocks
- Building confidence and resilience
- Work-life balance strategies

## Tone:
- Warm and encouraging
- Direct but compassionate
- Optimistic and empowering
- Curious and non-judgmental`,
        temperature: 0.7, // Balanced for creativity and consistency
        maxTokens: 2500,
        tools: ['kb_search', 'goal_analyze', 'habit_suggest', 'learning_path', 'feedback_generate']
    };

    // Motivational quotes library
    private readonly MOTIVATIONAL_QUOTES = [
        { quote: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
        { quote: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
        { quote: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
        { quote: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
        { quote: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
        { quote: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
        { quote: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
        { quote: "Progress, not perfection.", author: "Unknown" },
        { quote: "Small steps every day lead to big changes.", author: "Unknown" },
        { quote: "Your only limit is your mind.", author: "Unknown" },
    ];

    // Habit templates
    private readonly HABIT_TEMPLATES: Record<string, {
        habits: string[];
        tips: string[];
    }> = {
            productivity: {
                habits: [
                    'Morning planning session (10 min)',
                    'Daily top 3 priorities',
                    'Time blocking for deep work',
                    'End-of-day review',
                    'Weekly review and planning'
                ],
                tips: [
                    'Start with just one habit',
                    'Stack new habits onto existing ones',
                    'Track your progress visually',
                    'Celebrate small wins'
                ]
            },
            health: {
                habits: [
                    'Morning hydration (glass of water)',
                    'Daily movement (walk, stretch)',
                    'Mindful eating',
                    'Sleep routine (same bedtime)',
                    'Regular breaks during work'
                ],
                tips: [
                    'Prepare the night before',
                    'Start incredibly small',
                    'Link habits to identity ("I am someone who...")',
                    'Environment design matters'
                ]
            },
            learning: {
                habits: [
                    'Daily reading (20 min)',
                    'Weekly skill practice',
                    'Note-taking and review',
                    'Teaching others what you learn',
                    'Learning journal'
                ],
                tips: [
                    'Consistency beats intensity',
                    'Active recall is key',
                    'Space your practice',
                    'Apply what you learn immediately'
                ]
            },
            mindfulness: {
                habits: [
                    'Morning meditation (5-10 min)',
                    'Gratitude journaling',
                    'Mindful breathing moments',
                    'Evening reflection',
                    'Digital detox periods'
                ],
                tips: [
                    'Start with just 2 minutes',
                    'Same time, same place',
                    'Use guided meditations initially',
                    'Be patient with yourself'
                ]
            }
        };

    /**
     * Check if this agent can handle the user's intent
     */
    canHandle(intent: string): boolean {
        const coachKeywords = [
            'goal', 'habit', 'motivation', 'help me', 'how do i',
            'advice', 'guidance', 'coach', 'mentor', 'improve',
            'learn', 'develop', 'grow', 'achieve', 'success',
            'struggling', 'stuck', 'procrastinating', 'overwhelmed',
            'career', 'skills', 'balance', 'productivity', 'focus',
            'confidence', 'mindset', 'feedback', 'progress', 'accountability'
        ];

        const lowerIntent = intent.toLowerCase();
        return coachKeywords.some(keyword => lowerIntent.includes(keyword));
    }

    /**
     * Execute coach-specific tools
     */
    protected async executeTool(
        toolName: string,
        input: string,
        context: AgentContext
    ): Promise<any> {
        switch (toolName) {
            case 'kb_search':
                return this.searchKnowledgeBase(input, context);

            case 'goal_analyze':
                return this.analyzeGoal(input);

            case 'habit_suggest':
                return this.suggestHabits(input);

            case 'learning_path':
                return this.createLearningPath(input);

            case 'feedback_generate':
                return this.generateFeedback(input);

            default:
                console.warn(`Unknown tool: ${toolName}`);
                return null;
        }
    }

    /**
     * Search knowledge base for relevant coaching content
     */
    private async searchKnowledgeBase(
        query: string,
        context: AgentContext
    ): Promise<any> {
        const ragResult = await ragOrchestrator.retrieve(query, {
            orgId: context.orgId,
            userId: context.userId,
            brainConfig: context.brainConfig,
            brainTemplateId: context.brainTemplateId
        });

        return {
            documentsFound: ragResult.documents.length,
            documents: ragResult.documents.slice(0, 5).map(doc => ({
                content: doc.content.substring(0, 500) + '...',
                score: doc.score,
                citation: doc.citation
            })),
            context: ragResult.context
        };
    }

    /**
     * Analyze and structure a user's goal
     */
    private analyzeGoal(goalDescription: string): {
        structured: Partial<Goal>;
        analysis: {
            clarity: number;
            measurability: number;
            achievability: number;
            relevance: number;
            timebound: number;
            overallScore: number;
        };
        suggestions: string[];
        powerfulQuestions: string[];
    } {
        const lower = goalDescription.toLowerCase();

        // SMART goal analysis
        const clarity = this.assessClarity(goalDescription);
        const measurability = this.assessMeasurability(goalDescription);
        const achievability = this.assessAchievability(goalDescription);
        const relevance = 0.7; // Assumed relevant since user stated it
        const timebound = this.assessTimebound(goalDescription);

        const overallScore = (clarity + measurability + achievability + relevance + timebound) / 5;

        // Determine category
        const category = this.detectGoalCategory(lower);

        // Generate suggestions
        const suggestions: string[] = [];
        if (clarity < 0.7) suggestions.push('Make the goal more specific - what exactly do you want to achieve?');
        if (measurability < 0.7) suggestions.push('Add measurable criteria - how will you know when you\'ve achieved it?');
        if (achievability < 0.7) suggestions.push('Consider breaking this into smaller, achievable milestones');
        if (timebound < 0.7) suggestions.push('Set a target date or timeframe for this goal');

        // Generate milestones
        const milestones = this.generateMilestones(goalDescription, category);

        return {
            structured: {
                title: this.extractGoalTitle(goalDescription),
                description: goalDescription,
                category,
                status: 'not_started',
                progress: 0,
                milestones
            },
            analysis: {
                clarity,
                measurability,
                achievability,
                relevance,
                timebound,
                overallScore
            },
            suggestions,
            powerfulQuestions: this.generatePowerfulQuestions(goalDescription, category)
        };
    }

    /**
     * Assess goal clarity
     */
    private assessClarity(goal: string): number {
        const specificIndicators = ['specifically', 'exactly', 'to be able to', 'to achieve', 'to complete'];
        const vaguendicators = ['maybe', 'sort of', 'kind of', 'somehow', 'better'];

        let score = 0.5;
        const lower = goal.toLowerCase();

        specificIndicators.forEach(ind => {
            if (lower.includes(ind)) score += 0.1;
        });
        vaguendicators.forEach(ind => {
            if (lower.includes(ind)) score -= 0.1;
        });

        // Length and detail
        if (goal.length > 100) score += 0.1;
        if (goal.split(' ').length > 20) score += 0.1;

        return Math.max(0.2, Math.min(1, score));
    }

    /**
     * Assess measurability
     */
    private assessMeasurability(goal: string): number {
        const numbers = /\d+/.test(goal);
        const units = /times?|hours?|minutes?|days?|weeks?|months?|percent|%|\$/i.test(goal);
        const metrics = /track|measure|count|score|grade|level/i.test(goal);

        let score = 0.3;
        if (numbers) score += 0.3;
        if (units) score += 0.2;
        if (metrics) score += 0.2;

        return Math.min(1, score);
    }

    /**
     * Assess achievability
     */
    private assessAchievability(goal: string): number {
        const unrealistic = /everything|always|never|perfect|all the time|impossible/i.test(goal);
        const realistic = /start|begin|first step|gradually|improve|learn|practice/i.test(goal);

        let score = 0.6;
        if (unrealistic) score -= 0.3;
        if (realistic) score += 0.2;

        return Math.max(0.2, Math.min(1, score));
    }

    /**
     * Assess if goal is time-bound
     */
    private assessTimebound(goal: string): number {
        const timeIndicators = /by |in \d|within|deadline|before|this week|this month|this year|january|february|march|april|may|june|july|august|september|october|november|december/i;

        return timeIndicators.test(goal) ? 0.9 : 0.3;
    }

    /**
     * Detect goal category
     */
    private detectGoalCategory(goal: string): GoalCategory {
        const categoryPatterns: { pattern: RegExp; category: GoalCategory }[] = [
            { pattern: /career|job|work|promotion|salary|professional/i, category: 'career' },
            { pattern: /learn|study|course|skill|read|knowledge/i, category: 'learning' },
            { pattern: /health|fitness|exercise|weight|diet|sleep|wellness/i, category: 'health' },
            { pattern: /productive|efficiency|time|organize|focus|habit/i, category: 'productivity' },
            { pattern: /relationship|friend|family|social|network|communicate/i, category: 'relationships' },
            { pattern: /money|save|invest|budget|finance|income/i, category: 'finance' },
            { pattern: /creative|art|music|write|design|craft/i, category: 'creativity' },
        ];

        for (const { pattern, category } of categoryPatterns) {
            if (pattern.test(goal)) return category;
        }

        return 'personal';
    }

    /**
     * Generate milestones for a goal
     */
    private generateMilestones(goal: string, category: GoalCategory): Milestone[] {
        const milestoneTemplates: Record<GoalCategory, string[]> = {
            career: ['Define target role/position', 'Identify skill gaps', 'Complete relevant training', 'Build network in target area', 'Apply and interview'],
            learning: ['Define learning objectives', 'Gather resources', 'Complete fundamentals', 'Practice through projects', 'Teach or apply the skill'],
            health: ['Establish baseline metrics', 'Create sustainable routine', 'Hit first milestone', 'Build consistency', 'Reach target'],
            productivity: ['Audit current habits', 'Design new system', 'Test for one week', 'Refine and adjust', 'Make it automatic'],
            relationships: ['Identify key relationships', 'Schedule regular touchpoints', 'Deepen one relationship', 'Expand network', 'Maintain rhythm'],
            finance: ['Assess current state', 'Set specific target', 'Create action plan', 'Track progress weekly', 'Celebrate milestone'],
            creativity: ['Define creative project', 'Gather inspiration', 'Create first draft', 'Iterate and refine', 'Share your work'],
            personal: ['Clarify vision', 'Set first milestone', 'Take initial action', 'Build momentum', 'Celebrate progress'],
        };

        const templates = milestoneTemplates[category] || milestoneTemplates.personal;

        return templates.map((title, index) => ({
            id: `milestone_${index + 1}`,
            title,
            completed: false
        }));
    }

    /**
     * Generate powerful coaching questions
     */
    private generatePowerfulQuestions(goal: string, category: GoalCategory): string[] {
        const general = [
            "What would achieving this goal mean for you?",
            "What's been stopping you from starting already?",
            "What resources do you have that could help?",
            "Who could support you on this journey?",
            "What's the smallest next step you could take today?"
        ];

        const categorySpecific: Record<GoalCategory, string[]> = {
            career: ["What does success look like in this role?", "What unique value do you bring?"],
            learning: ["How do you learn best?", "How will you apply this knowledge?"],
            health: ["What would improved health enable you to do?", "What's worked for you before?"],
            productivity: ["What's your biggest time drain?", "When are you most focused?"],
            relationships: ["What kind of connections do you value most?", "How do you want to show up?"],
            finance: ["What's your relationship with money?", "What would financial freedom look like?"],
            creativity: ["What inspires you?", "What creative risks could you take?"],
            personal: ["What kind of person do you want to become?", "What legacy do you want to leave?"],
        };

        return [...general, ...(categorySpecific[category] || [])].slice(0, 5);
    }

    /**
     * Extract goal title from description
     */
    private extractGoalTitle(description: string): string {
        // First sentence or first 50 chars
        const firstSentence = description.split(/[.!?]/)[0];
        if (firstSentence.length <= 60) return firstSentence.trim();
        return firstSentence.substring(0, 50).trim() + '...';
    }

    /**
     * Suggest habits based on goal or area
     */
    private suggestHabits(request: string): {
        category: string;
        suggestedHabits: string[];
        tips: string[];
        startingPlan: {
            week1: string;
            week2: string;
            week3: string;
            week4: string;
        };
        quote: { quote: string; author: string };
    } {
        const lower = request.toLowerCase();

        // Match to habit category
        let category = 'productivity';
        if (/health|exercise|fitness|sleep|diet/i.test(lower)) category = 'health';
        else if (/learn|study|read|skill/i.test(lower)) category = 'learning';
        else if (/meditat|mindful|gratitude|calm|stress/i.test(lower)) category = 'mindfulness';

        const template = this.HABIT_TEMPLATES[category] || this.HABIT_TEMPLATES.productivity;

        // Get random motivational quote
        const quote = this.MOTIVATIONAL_QUOTES[Math.floor(Math.random() * this.MOTIVATIONAL_QUOTES.length)];

        return {
            category,
            suggestedHabits: template.habits,
            tips: template.tips,
            startingPlan: {
                week1: `Start with just ONE habit from the list. Make it incredibly easy. Focus on consistency, not perfection.`,
                week2: `If Week 1 went well, slightly increase difficulty. If not, make it even easier. Add tracking.`,
                week3: `Stack a second habit onto your first one. Continue tracking and celebrating wins.`,
                week4: `Reflect on progress. Adjust what's not working. Plan for the next month.`
            },
            quote
        };
    }

    /**
     * Create a learning path for a skill
     */
    private createLearningPath(skillRequest: string): LearningPath {
        const skill = this.extractSkillName(skillRequest);
        const level = this.detectCurrentLevel(skillRequest);

        // Generic learning path structure
        const steps: LearningStep[] = [
            {
                order: 1,
                title: 'Fundamentals',
                description: `Build a solid foundation in ${skill}. Understand core concepts and terminology.`,
                completed: false,
                resources: ['Beginner tutorials', 'Official documentation', 'Foundational course']
            },
            {
                order: 2,
                title: 'Hands-on Practice',
                description: `Apply concepts through guided exercises and small projects.`,
                completed: false,
                resources: ['Practice exercises', 'Guided projects', 'Code challenges']
            },
            {
                order: 3,
                title: 'Intermediate Concepts',
                description: `Dive deeper into intermediate topics and best practices.`,
                completed: false,
                resources: ['Intermediate courses', 'Industry blogs', 'Technical books']
            },
            {
                order: 4,
                title: 'Real Project',
                description: `Build a complete project that solves a real problem.`,
                completed: false,
                resources: ['Project ideas', 'Open source contributions', 'Portfolio projects']
            },
            {
                order: 5,
                title: 'Advanced Topics',
                description: `Explore advanced concepts and specialize in areas of interest.`,
                completed: false,
                resources: ['Advanced courses', 'Research papers', 'Expert workshops']
            },
            {
                order: 6,
                title: 'Teach and Share',
                description: `Solidify knowledge by teaching others and contributing to the community.`,
                completed: false,
                resources: ['Write blogs', 'Create tutorials', 'Mentor others']
            }
        ];

        // Adjust based on level
        if (level === 'intermediate') {
            steps[0].completed = true;
            steps[1].completed = true;
        } else if (level === 'advanced') {
            steps.slice(0, 4).forEach(s => s.completed = true);
        }

        return {
            id: `path_${Date.now()}`,
            skill,
            level,
            steps,
            resources: this.getGenericResources(skill),
            estimatedTime: level === 'beginner' ? '3-6 months' : level === 'intermediate' ? '2-4 months' : '1-2 months'
        };
    }

    /**
     * Extract skill name from request
     */
    private extractSkillName(request: string): string {
        // Common skill patterns
        const learnMatch = request.match(/learn\s+(?:about\s+)?(.+?)(?:\.|$|,|\s+to\s+)/i);
        if (learnMatch) return learnMatch[1].trim();

        const improveMatch = request.match(/improve\s+(?:my\s+)?(.+?)(?:\.|$|,)/i);
        if (improveMatch) return improveMatch[1].trim();

        // Return first few significant words
        const words = request.split(' ').slice(0, 4).join(' ');
        return words.charAt(0).toUpperCase() + words.slice(1);
    }

    /**
     * Detect current level from request
     */
    private detectCurrentLevel(request: string): 'beginner' | 'intermediate' | 'advanced' {
        const lower = request.toLowerCase();

        if (/beginner|start|new to|first time|never/i.test(lower)) return 'beginner';
        if (/advanced|expert|master|deep dive|already know/i.test(lower)) return 'advanced';

        return 'intermediate';
    }

    /**
     * Get generic learning resources
     */
    private getGenericResources(skill: string): LearningResource[] {
        return [
            { type: 'course', title: `${skill} Fundamentals`, duration: '10-20 hours', difficulty: 'easy' },
            { type: 'book', title: `Comprehensive Guide to ${skill}`, difficulty: 'medium' },
            { type: 'video', title: `${skill} Tutorial Series`, duration: '5-10 hours', difficulty: 'easy' },
            { type: 'practice', title: `${skill} Exercises and Challenges`, difficulty: 'medium' },
            { type: 'article', title: `Best Practices in ${skill}`, difficulty: 'medium' },
        ];
    }

    /**
     * Generate coaching feedback
     */
    private generateFeedback(context: string): FeedbackResult {
        // Analyze sentiment and progress signals
        const lower = context.toLowerCase();

        const positiveSignals = ['completed', 'achieved', 'improved', 'succeeded', 'progress', 'done', 'finished'];
        const negativeSignals = ['failed', 'struggling', 'stuck', 'didn\'t', 'couldn\'t', 'missed'];

        let positiveCount = 0, negativeCount = 0;
        positiveSignals.forEach(s => { if (lower.includes(s)) positiveCount++; });
        negativeSignals.forEach(s => { if (lower.includes(s)) negativeCount++; });

        let overall: FeedbackResult['overall'];
        if (positiveCount >= 3 && negativeCount === 0) overall = 'excellent';
        else if (positiveCount > negativeCount) overall = 'good';
        else if (negativeCount > positiveCount + 1) overall = 'struggling';
        else overall = 'needs_improvement';

        // Generate strengths and improvements
        const strengths = this.identifyStrengths(overall);
        const improvements = this.identifyImprovements(overall);
        const actionItems = this.generateActionItems(overall);
        const encouragement = this.generateEncouragement(overall);

        return {
            overall,
            strengths,
            improvements,
            actionItems,
            encouragement
        };
    }

    /**
     * Identify strengths based on performance
     */
    private identifyStrengths(overall: FeedbackResult['overall']): string[] {
        const strengths: Record<FeedbackResult['overall'], string[]> = {
            excellent: [
                'Exceptional consistency and follow-through',
                'Strong commitment to your goals',
                'Great at building momentum'
            ],
            good: [
                'Making steady progress',
                'Showing resilience through challenges',
                'Good awareness of your journey'
            ],
            needs_improvement: [
                'Willingness to reflect and improve',
                'Taking action despite difficulties',
                'Seeking feedback and guidance'
            ],
            struggling: [
                'Courage to acknowledge challenges',
                'Reaching out for support',
                'Not giving up'
            ]
        };

        return strengths[overall];
    }

    /**
     * Identify areas for improvement
     */
    private identifyImprovements(overall: FeedbackResult['overall']): string[] {
        const improvements: Record<FeedbackResult['overall'], string[]> = {
            excellent: [
                'Consider raising the bar slightly',
                'Help others on their journey',
                'Prevent burnout by maintaining balance'
            ],
            good: [
                'Increase consistency in daily habits',
                'Set more specific milestones',
                'Build in more accountability'
            ],
            needs_improvement: [
                'Break goals into smaller, achievable steps',
                'Identify and remove obstacles',
                'Create a more supportive environment'
            ],
            struggling: [
                'Simplify your goals dramatically',
                'Focus on just one thing at a time',
                'Be more compassionate with yourself'
            ]
        };

        return improvements[overall];
    }

    /**
     * Generate action items
     */
    private generateActionItems(overall: FeedbackResult['overall']): string[] {
        const actions: Record<FeedbackResult['overall'], string[]> = {
            excellent: [
                'Set a new stretch goal for next week',
                'Document your winning strategies',
                'Share your progress with others'
            ],
            good: [
                'Identify one habit to strengthen',
                'Schedule your most important task first thing tomorrow',
                'Find an accountability partner'
            ],
            needs_improvement: [
                'Choose just ONE priority for this week',
                'Create a 5-minute daily ritual to build momentum',
                'Remove one distraction from your environment'
            ],
            struggling: [
                'Take a short break to reset',
                'Lower expectations temporarily - any progress counts',
                'Reach out to someone who can support you'
            ]
        };

        return actions[overall];
    }

    /**
     * Generate encouraging message
     */
    private generateEncouragement(overall: FeedbackResult['overall']): string {
        const messages: Record<FeedbackResult['overall'], string> = {
            excellent: "You're absolutely crushing it! 🌟 Your dedication is inspiring. Keep this momentum going, and remember to celebrate how far you've come.",
            good: "You're making real progress! 💪 Every step forward counts. Stay consistent, and you'll keep building on this success.",
            needs_improvement: "You're on the path! 🌱 Growth isn't always linear. Focus on small wins and keep showing up. You've got what it takes.",
            struggling: "I see you, and I'm proud of you for not giving up. 💙 This is temporary. Be gentle with yourself, and remember - asking for help is a sign of strength."
        };

        return messages[overall];
    }

    /**
     * Smart tool selection for coaching queries
     */
    protected async selectTools(
        input: string,
        context: AgentContext
    ): Promise<string[]> {
        const lowerInput = input.toLowerCase();
        const selectedTools: string[] = [];

        // Always search KB for relevant content
        if (context.brainConfig.rag.enabled) {
            selectedTools.push('kb_search');
        }

        // Goal analysis
        if (/goal|objective|target|achieve|accomplish/i.test(lowerInput)) {
            selectedTools.push('goal_analyze');
        }

        // Habit suggestions
        if (/habit|routine|daily|consistent|ritual|practice/i.test(lowerInput)) {
            selectedTools.push('habit_suggest');
        }

        // Learning path
        if (/learn|study|skill|develop|course|training/i.test(lowerInput)) {
            selectedTools.push('learning_path');
        }

        // Feedback
        if (/feedback|review|progress|how.?am.?i|evaluate|assess/i.test(lowerInput)) {
            selectedTools.push('feedback_generate');
        }

        return selectedTools;
    }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const coachAgent = new CoachAgent();
