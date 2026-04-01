'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import {
  Shield, Target, Activity, MessageSquare, Gauge, Fingerprint, TrendingUp, Lightbulb,
  GitGraph, Lock, ChevronDown, ChevronRight, Zap, Database, Globe, Scale, Network,
  Brain, Eye, BarChart3, Cpu, Layers, ArrowRight, ShieldAlert, CheckCircle2, AlertCircle,
  Moon, Sun, RefreshCcw, XCircle, Clock, Award, Search, Filter, Box,
} from 'lucide-react';

const CONTROL_POINT_DOMAINS = [
  {
    id: 'market', domain: 'A', name: 'Market & Target Selection', color: 'success', desc: 'Decide WHERE you compete.',
    points: [
      { id: 'cp1', name: 'ICP Definition', agent: 'ICP Qualification Agent', tier: 1, question: 'Who belongs in the ideal market?', why: 'Everything downstream depends on whether the system is pointed at the right companies and people.' },
      { id: 'cp2', name: 'Keyword Universe', agent: 'Keyword Context Agent', tier: 1, question: 'What buying contexts are meaningful?', why: 'Keywords are a canonical input into readiness and targeting.' },
      { id: 'cp3', name: 'Vertical Selection', agent: 'Segment Prioritization Agent', tier: 2, question: 'Which market segments to prioritize?', why: 'Segment choice changes economics, competition, and message resonance.' },
      { id: 'cp4', name: 'Company Size Band', agent: 'Account Banding Agent', tier: 2, question: 'Which company sizes enter the action surface?', why: 'Company size changes buying unit, urgency, and proof requirements.' },
      { id: 'cp5', name: 'Economic Attractiveness', agent: 'Segment Economics Agent', tier: 2, question: 'Is this segment worth competing in?', why: 'You want quality economics, not just reachable names.' },
    ],
  },
  {
    id: 'identity', domain: 'B', name: 'Identity & Data Integrity', color: 'info', desc: 'Decide if the market is REPRESENTED correctly.',
    points: [
      { id: 'cp6', name: 'Identity Resolution', agent: 'Identity Resolution Agent', tier: 1, question: 'Is this a correctly resolved real person and company?', why: 'The Data Engine is anchored to a real person and identity-linked delivery.' },
      { id: 'cp7', name: 'Hygiene & Validation', agent: 'Data Hygiene Agent', tier: 1, question: 'Is the record safe and usable?', why: 'Continuous hygiene and validation are canonical parts of the Data Engine.' },
      { id: 'cp8', name: 'CRM Record Delivery', agent: 'CRM Delivery Agent', tier: 2, question: 'Are records correctly delivered into operational workflows?', why: 'The output is a readiness decision, not just a list.' },
      { id: 'cp9', name: 'Click-to-Record Enrichment', agent: 'Click Attribution Agent', tier: 2, question: 'Does click behavior deterministically enrich buyer records?', why: 'Every click should trigger clicker-to-buyer record mapping.' },
    ],
  },
  {
    id: 'readiness', domain: 'C', name: 'Readiness & Timing', color: 'warning', desc: 'Decide WHETHER outreach should happen NOW.',
    points: [
      { id: 'cp10', name: 'Contact vs Suppress', agent: 'Contact Decision Agent', tier: 1, question: 'Go or no-go?', why: 'If the answer is no, the system does not send. One of the most important control points.' },
      { id: 'cp11', name: 'Timing Window', agent: 'Timing Window Agent', tier: 1, question: 'Is now the right time?', why: 'The Data Engine exists to determine whether now is the right time for a real conversation.' },
      { id: 'cp12', name: 'Relevance Threshold', agent: 'Relevance Scoring Agent', tier: 1, question: 'Is there sufficient evidence of current relevance?', why: 'Cheap traffic without relevance destroys ROI.' },
      { id: 'cp13', name: 'InMarket Weighting', agent: 'InMarket Weighting Agent', tier: 1, question: 'How much behavioral evidence is enough to activate?', why: 'Weights are adjusted based on reply behavior, engagement, conversion, signal decay, and deliverability.' },
      { id: 'cp14', name: 'Signal Decay', agent: 'Signal Decay Agent', tier: 2, question: 'When does a signal stop being actionable?', why: 'Old intent corrupts readiness.' },
      { id: 'cp15', name: 'Capacity-Aware Activation', agent: 'Capacity Allocation Agent', tier: 2, question: 'Should lower-priority cohorts activate when capacity allows?', why: 'Lighter green activation only when capacity allows and learning value outweighs cost.' },
    ],
  },
  {
    id: 'persona', domain: 'D', name: 'Buying Unit & Persona', color: 'accent', desc: 'Decide WHO inside the account matters most.',
    points: [
      { id: 'cp16', name: 'Buying Committee Detection', agent: 'Buying Unit Agent', tier: 1, question: 'Is this a real buying unit or just one name?', why: 'In B2B, the wrong thread weakens the whole sequence.' },
      { id: 'cp17', name: 'Persona Role Classification', agent: 'Persona Role Agent', tier: 1, question: 'What role does this person play?', why: 'Different roles require different angles, proof, and next steps.' },
      { id: 'cp18', name: 'Champion / Buyer / Blocker', agent: 'Influence Mapping Agent', tier: 2, question: 'Who should be moved first, who must be won later?', why: 'This changes sequence and escalation logic.' },
      { id: 'cp19', name: 'Role-Specific Angle Assignment', agent: 'Role-Angle Matching Agent', tier: 1, question: 'Which frame is most appropriate for this role?', why: 'Angles are selected by ICP, stage, and role.' },
    ],
  },
  {
    id: 'attention', domain: 'E', name: 'Attention & Entry', color: 'error', desc: 'Decide whether you EARN the first moment.',
    points: [
      { id: 'cp20', name: 'Subject Line Selection', agent: 'Subject Line Agent', tier: 2, question: 'Which opening frame earns attention?', why: 'Subject line and first sentence are scored as a single unit.' },
      { id: 'cp21', name: 'First Sentence Selection', agent: 'Opening Line Agent', tier: 2, question: 'Does attention turn into message entry?', why: 'First-line resonance matters to decision progression.' },
      { id: 'cp22', name: 'Hook Type', agent: 'Hook Testing Agent', tier: 2, question: 'Curiosity vs directness vs behavior-led entry?', why: 'Hooks are entry points to angles, not the angle itself.' },
      { id: 'cp23', name: 'Sender Framing', agent: 'Sender Framing Agent', tier: 3, question: 'How is the sender perceived?', why: 'Trust is part of whether attention becomes meaningful engagement.' },
    ],
  },
  {
    id: 'decision', domain: 'F', name: 'Decision Formation', color: 'success', desc: 'Decide WHAT must happen in the buyer\'s mind.',
    points: [
      { id: 'cp24', name: 'Buyer Stage Classification', agent: 'Buyer Stage Agent', tier: 1, question: 'Which conclusion is the buyer ready to form next?', why: 'MW moves buyers one conclusion at a time through five buyer stages.' },
      { id: 'cp25', name: 'Angle Selection', agent: 'Angle Selection Agent', tier: 1, question: 'Which cognitive frame to enter with?', why: 'Angles are the primary control mechanism inside MarketWriter.' },
      { id: 'cp26', name: 'Angle Governance', agent: 'Angle Governance Agent', tier: 1, question: 'Which angles stay active, get promoted, or retire?', why: 'The system leans into promoted angles and exits demoted or suppressed angles.' },
      { id: 'cp27', name: 'Conclusion Sequence', agent: 'Conclusion Sequencing Agent', tier: 1, question: 'What conclusion must the buyer reach next?', why: 'Each flow step helps the buyer reach the next conclusion, not all at once.' },
      { id: 'cp28', name: 'Uncertainty Collapse', agent: 'Uncertainty Resolution Agent', tier: 1, question: 'What uncertainty must be resolved next?', why: 'Unresolved uncertainty blocks decision progression.' },
      { id: 'cp29', name: 'Proof Selection', agent: 'Proof Type Agent', tier: 2, question: 'Which type of evidence should be deployed?', why: 'Different uncertainties require different proof.' },
      { id: 'cp30', name: 'CTA Decision', agent: 'CTA Decision Agent', tier: 2, question: 'What next step is appropriate?', why: 'Too-early CTAs destroy trust. Too-late CTAs waste momentum.' },
      { id: 'cp31', name: 'Suppress Decision', agent: 'Suppress Agent', tier: 2, question: 'Should the conversation stop?', why: 'Some prospects should be removed, not pursued further.' },
    ],
  },
  {
    id: 'sequence', domain: 'G', name: 'Sequence & Continuity', color: 'info', desc: 'Decide HOW the buyer is moved over time.',
    points: [
      { id: 'cp32', name: 'Sequence Enrollment', agent: 'Flow Enrollment Agent', tier: 2, question: 'Which flow does a buyer enter?', why: 'MW outputs structured flows, not isolated messages.' },
      { id: 'cp33', name: 'Touch Order', agent: 'Message Order Agent', tier: 1, question: 'What comes first, second, and third?', why: 'Each asset helps the buyer reach the next conclusion, not all at once.' },
      { id: 'cp34', name: 'Cadence & Delay', agent: 'Cadence Agent', tier: 2, question: 'How long between touches?', why: 'Timing and continuity are part of readiness reality.' },
      { id: 'cp35', name: 'Branch Logic', agent: 'Branching Logic Agent', tier: 2, question: 'What happens after reply, click, silence, or weak engagement?', why: 'Continuity is where many sequences fail.' },
      { id: 'cp36', name: 'Re-Entry Logic', agent: 'Re-Entry Agent', tier: 3, question: 'If and when does a buyer come back in later?', why: 'Not ready now does not mean never.' },
    ],
  },
  {
    id: 'delivery', domain: 'H', name: 'Delivery & Economic Protection', color: 'warning', desc: 'Decide whether the system can COMPETE at scale.',
    points: [
      { id: 'cp37', name: 'Send Pacing', agent: 'Send Pacing Agent', tier: 1, question: 'How fast should email volume move?', why: 'Single-tenant delivery is the condition for control of pacing and earned scale.' },
      { id: 'cp38', name: 'Domain / Mailbox Allocation', agent: 'Infrastructure Allocation Agent', tier: 2, question: 'Where should send volume be placed?', why: 'Reputation isolation and durable volume depend on correct infrastructure usage.' },
      { id: 'cp39', name: 'Warm-Up Progression', agent: 'Warm-Up Agent', tier: 2, question: 'How is reputation earned over time?', why: 'Scale is earned, not forced.' },
      { id: 'cp40', name: 'Inboxing Threshold', agent: 'Inbox Health Agent', tier: 1, question: 'Can campaigns continue?', why: 'No campaign advances if inboxing is weak.' },
      { id: 'cp41', name: 'Delivery Suspension', agent: 'Delivery Safeguard Agent', tier: 1, question: 'Should we pause, slow, or redirect sending?', why: 'Protecting domain health protects the whole learning system.' },
      { id: 'cp42', name: 'Segment Load Balancing', agent: 'Segment Load Agent', tier: 2, question: 'Is any segment receiving too much too quickly?', why: 'No segment should receive too much too quickly.' },
    ],
  },
  {
    id: 'response', domain: 'I', name: 'Response Interpretation', color: 'accent', desc: 'Decide what the MARKET is telling you.',
    points: [
      { id: 'cp43', name: 'Reply Classification', agent: 'Reply Classification Agent', tier: 1, question: 'Positive, neutral, negative, objection, wrong-person?', why: 'Your SOP explicitly checks reply sentiment.' },
      { id: 'cp44', name: 'Positive Intent Detection', agent: 'Positive Intent Agent', tier: 1, question: 'Is this reply genuinely sales-forward?', why: 'Not every reply is equal; the system needs decision-quality interpretation.' },
      { id: 'cp45', name: 'Objection Extraction', agent: 'Objection Mining Agent', tier: 1, question: 'What resistance actually exists?', why: 'This is decision intelligence, not just response logging.' },
      { id: 'cp46', name: 'Click Intent', agent: 'Click Meaning Agent', tier: 2, question: 'What does a click mean in context?', why: 'Replies and clicks are both first-class engagement signals.' },
      { id: 'cp47', name: 'Silence Interpretation', agent: 'Silence Diagnosis Agent', tier: 2, question: 'Does no response mean no fit, no timing, no resonance, or delivery weakness?', why: 'Silence is not one thing.' },
      { id: 'cp48', name: 'Buying Stage Update', agent: 'Stage Progression Agent', tier: 2, question: 'Has the buyer progressed?', why: 'The system should infer movement through conclusion sequences, not just count interactions.' },
    ],
  },
  {
    id: 'learning', domain: 'J', name: 'Testing, Learning & Governance', color: 'error', desc: 'Decide whether the system is LEARNING correctly.',
    points: [
      { id: 'cp49', name: 'Test Selection', agent: 'Test Prioritization Agent', tier: 1, question: 'What gets tested next?', why: 'Controlled experimentation under real volume, not random variation.' },
      { id: 'cp50', name: 'Variable Isolation', agent: 'Experiment Design Agent', tier: 1, question: 'Are tests interpretable?', why: 'Too many variables creates false winners.' },
      { id: 'cp51', name: 'Sample Attainment', agent: 'Sample Integrity Agent', tier: 1, question: 'Is there enough data to judge?', why: 'Early stopping corrupts learning.' },
      { id: 'cp52', name: 'Winner / Loser Selection', agent: 'Winner Detection Agent', tier: 1, question: 'Which patterns are real?', why: 'The learning loop explicitly selects winners and losers.' },
      { id: 'cp53', name: 'KB Writeback', agent: 'Learning Promotion Agent', tier: 1, question: 'What learning becomes operational?', why: 'The learning loop writes preferences and constraints back to the KB.' },
      { id: 'cp54', name: 'Promotion / Demotion / Pause', agent: 'Pattern Governance Agent', tier: 1, question: 'Should a pattern become more central, delayed, or retired?', why: 'Promotes winners, demotes or pauses losers.' },
      { id: 'cp55', name: 'Learning Integrity', agent: 'Learning Integrity Agent', tier: 1, question: 'Is the system truly learning or merely producing activity?', why: 'A system can produce meetings and still fail if learning is slow, noisy, or corrupted.' },
      { id: 'cp56', name: 'Spaced Revalidation', agent: 'Revalidation Agent', tier: 1, question: 'Do prior winners still hold over time?', why: 'You want mastery, not temporary local optimization.' },
    ],
  },
];

const CANONICAL_NINE = [
  { id: 'contact', name: 'Contact Decision', engine: 'Data', controlPoint: 'Contact vs Suppress', task: 'Decide whether a person should be contacted now, delayed, or suppressed.', standard: 'Maximize real conversation probability while minimizing wasted sends.', writes: 'Local KB', icon: Target, inputs: ['ICP fit score', 'Identity confidence', 'Behavioral signals', 'Prior engagement', 'Delivery capacity', 'Compliance constraints'], outputs: ['Contact / Delay / Suppress', 'Confidence score', 'Reason codes'], feedback: ['Reply rate', 'Meeting-booked rate', 'Bounce rate', 'Wrong-person rate'], allowed: ['Readiness thresholds', 'Signal weighting', 'Decay assumptions', 'Suppression heuristics'], locked: ['ICP definition', 'Compliance rules', 'Hard suppression rules', 'Identity validation minimums'] },
  { id: 'timing', name: 'Timing Window', engine: 'Data', controlPoint: 'When to Outreach', task: 'Determine when outreach should occur for a qualified person.', standard: 'Maximize conversation likelihood through timing precision, not volume.', writes: 'Local + Candidate', icon: Clock, inputs: ['Behavioral signals', 'Signal recency & intensity', 'Buying-cycle indicators', 'Historical timing', 'Role classification'], outputs: ['Send now / Delay / Re-evaluate', 'Timing confidence', 'Rationale codes'], feedback: ['Reply rate by timing cohort', 'Meeting rate by timing', 'No-response decay curves'], allowed: ['Optimal send windows', 'Timing by signal band', 'Delay intervals', 'Reactivation heuristics'], locked: ['Max contact frequency', 'Cooling-off rules', 'Compliance timing restrictions'] },
  { id: 'role', name: 'Buying Role', engine: 'Data', controlPoint: 'Persona Classification', task: 'Determine the likely buying role and route downstream logic.', standard: 'Maximize role-message fit and reduce wasted threading.', writes: 'Local KB', icon: Fingerprint, inputs: ['Title normalization', 'Department / function', 'Seniority signals', 'Company context', 'Interaction history'], outputs: ['Role classification', 'Confidence score', 'Uncertainty flag'], feedback: ['Reply sentiment by role', 'Meeting rate by role', 'Wrong-thread rate', 'Manual correction rate'], allowed: ['Title-to-role mappings', 'Role confidence thresholds', 'Role disambiguation'], locked: ['Canonical buying-role taxonomy', 'Partner-specific role rules'] },
  { id: 'stage', name: 'Buyer Stage', engine: 'MarketWriter', controlPoint: 'Journey Classification', task: 'Determine current buyer stage and next required conclusion.', standard: 'Maximize stage progression and decision movement.', writes: 'Local + Candidate', icon: TrendingUp, inputs: ['Behavioral signals', 'Interaction history', 'Reply content', 'Click behavior', 'Role classification'], outputs: ['Current stage', 'Next conclusion', 'Confidence', 'Rationale'], feedback: ['Progression rate', 'Reply quality by stage', 'Meeting conversion by stage', 'Later-stage correction rate'], allowed: ['Stage classification thresholds', 'Signal-to-stage mappings', 'Transition likelihoods'], locked: ['Canonical stage framework', 'Conclusion ordering rules'] },
  { id: 'angle', name: 'Angle Selection', engine: 'MarketWriter', controlPoint: 'Which Belief Angle', task: 'Select the best angle for this buyer at this stage in this context.', standard: 'Maximize booked-call movement by angle.', writes: 'Local + Candidate', icon: MessageSquare, inputs: ['Role', 'Buyer stage', 'ICP context', 'Offer context', 'Objection patterns', 'Local angle performance'], outputs: ['Selected angle', 'Ranked backups', 'Confidence', 'Rationale'], feedback: ['Positive reply rate by angle', 'Meeting rate by angle', 'Objection frequency', 'Angle fatigue'], allowed: ['Angle effectiveness by role/stage/segment', 'Fatigue patterns', 'Confidence adjustments'], locked: ['Approved angle taxonomy', 'Prohibited claims', 'Compliance restrictions'] },
  { id: 'uncertainty', name: 'Uncertainty Resolution', engine: 'MarketWriter', controlPoint: 'What to Address Next', task: 'Determine which uncertainty must be resolved to move the buyer forward.', standard: 'Maximize decision progression, reduce objection drag.', writes: 'Local + Candidate', icon: Lightbulb, inputs: ['Buyer stage', 'Role', 'Prior messaging', 'Known objections', 'Click/reply behavior'], outputs: ['Selected uncertainty', 'Reason code', 'Confidence', 'Proof type'], feedback: ['Reply quality after resolution', 'Objection reduction', 'Meeting rate after resolution'], allowed: ['Uncertainty patterns by role/stage', 'Proof-type effectiveness', 'Sequence placement'], locked: ['Canonical message doctrine', 'Approved proof constraints', 'Offer truth'] },
  { id: 'sequence', name: 'Sequence Progression', engine: 'MarketWriter', controlPoint: 'Message Order', task: 'Decide what message comes next to progress one conclusion at a time.', standard: 'Maximize stepwise progression while maintaining coherence.', writes: 'Local + Candidate', icon: GitGraph, inputs: ['Buyer stage', 'Selected angle', 'Uncertainty target', 'Sequence history', 'Reply/click/silence patterns'], outputs: ['Next step', 'Branch decision', 'Delay recommendation', 'Confidence'], feedback: ['Reply rate by step', 'Stage progression by order', 'Sequence drop-off points', 'Disengagement by branch'], allowed: ['Step-order patterns', 'Branch improvements', 'Delay-spacing effects', 'Continuity heuristics'], locked: ['Canonical sequence framework', 'Contact frequency ceilings', 'Compliance stop rules'] },
  { id: 'pacing', name: 'Send Pacing', engine: 'Delivery', controlPoint: 'Delivery Speed', task: 'Control rollout speed to protect inboxing, reputation, and economics.', standard: 'Preserve earned capacity while allowing sufficient learning throughput.', writes: 'Local + Candidate (structural)', icon: Gauge, inputs: ['Send volume', 'Domain health', 'Inbox placement', 'Complaint/bounce rate', 'Warm-up state', 'Cohort mix'], outputs: ['Throttle / Hold / Continue / Expand', 'Confidence', 'Risk codes'], feedback: ['Inbox placement', 'Complaint rate', 'Domain health trend', 'Recovery time', 'Earned volume stability'], allowed: ['Pacing thresholds', 'Early warning patterns', 'Expansion heuristics', 'Risk tolerances'], locked: ['Hard safety thresholds', 'Infrastructure guardrails', 'Compliance sending limits'] },
  { id: 'reply', name: 'Reply Meaning', engine: 'Signal', controlPoint: 'Response Interpretation', task: 'Classify replies: positive intent, objections, wrong-person, meeting intent.', standard: 'Maximize classification accuracy for downstream learning and routing.', writes: 'Local + Candidate', icon: Eye, inputs: ['Raw reply text', 'Sequence context', 'Buyer stage', 'Role classification', 'Local objection taxonomy'], outputs: ['Reply class', 'Positive intent flag', 'Objection class', 'Meeting intent flag', 'Confidence', 'Routing recommendation'], feedback: ['Human validation rate', 'Meeting rate after positive', 'Objection resolution success', 'False-positive/negative rates'], allowed: ['Reply phrase mappings', 'Objection classification patterns', 'Intent confidence thresholds', 'Routing rules'], locked: ['Canonical reply taxonomy', 'Hard routing rules'] },
];

const FIVE_LAYERS = [
  { layer: 1, name: 'Task Definition', desc: 'Exact job, boundaries, triggers, inputs, outputs', icon: Target, color: 'success' },
  { layer: 2, name: 'Performance Standard', desc: 'What correct means, what failure means, explicit rubric', icon: Award, color: 'info' },
  { layer: 3, name: 'Execution', desc: 'Performs the task using approved logic, tools, constraints', icon: Zap, color: 'accent' },
  { layer: 4, name: 'Feedback', desc: 'Captures real-world outcomes after execution', icon: BarChart3, color: 'warning' },
  { layer: 5, name: 'Learning', desc: 'Turns measured outcomes into retained improvements', icon: Brain, color: 'error' },
];

const KB_SCOPES = [
  { scope: 'LOCAL', label: 'Local KB', authority: 'Highest', desc: 'Per partner. Fast learning. Controls execution.', examples: ['ICP fit refinements', 'Angle performance for this partner', 'Timing windows by cohort', 'Objection patterns for this vertical', 'Delivery thresholds for this environment', 'Sequence branch behavior'], color: 'success' },
  { scope: 'CANDIDATE', label: 'Candidate Global', authority: 'Under Review', desc: 'Flagged for network analysis. Not authoritative.', examples: ['Repeated angle lift across 3+ partners', 'Recurring objection classes', 'Timing heuristics in multiple roles', 'Structural sequence patterns'], color: 'warning' },
  { scope: 'GLOBAL', label: 'Global KB', authority: 'Advisory Prior', desc: 'Validated structural truths. Local always overrides.', examples: ['Angle families that generalize broadly', 'Stage progression patterns', 'Durable timing heuristics', 'Structural message principles', 'Delivery protection patterns'], color: 'info' },
];

const GOVERNANCE_LIFECYCLE = [
  { state: 'Local Active', icon: CheckCircle2, color: 'success', desc: 'Knowledge is live inside one partner environment.' },
  { state: 'Candidate for Review', icon: Search, color: 'warning', desc: 'Flagged as potentially transferable across partners.' },
  { state: 'Under Review', icon: Filter, color: 'info', desc: 'Being evaluated: is the pattern real, structural, transferable?' },
  { state: 'Global Active', icon: Globe, color: 'accent', desc: 'Validated structural truth. Available as a prior.' },
  { state: 'Weakened', icon: AlertCircle, color: 'warning', desc: 'Evidence shrinking. Applicability narrowing.' },
  { state: 'Suspended', icon: XCircle, color: 'error', desc: 'Temporarily inactive until revalidated.' },
  { state: 'Retired', icon: Box, color: 'error', desc: 'No longer active. Preserved in audit trail.' },
  { state: 'Rolled Back', icon: RefreshCcw, color: 'error', desc: 'Reversed to prior trusted state.' },
];

const NETWORK_EFFECT_THREE = [
  { name: 'Angle Selection', why: 'Every partner, campaign, audience, and buying role generates evidence about what framing moves people. At network scale, this becomes a distributed persuasion intelligence system.', compounds: 'New partners start with better priors on what to lead with, what to avoid, what to test next.' },
  { name: 'Timing Window', why: 'Timing gets smarter with scale faster than almost anything else. Fifty partners teach the system far more about recency decay, buying-window detection, and engagement timing by role.', compounds: 'Good timing is a signal quality multiplier for the whole network. Bad timing creates noise.' },
  { name: 'Reply Meaning', why: 'Replies contain high-value decision intelligence. At scale, the system builds richer objection taxonomies, better intent classification, better stage inference, better future messaging.', compounds: 'Every partner benefits from the accumulated interpretation intelligence of the whole network.' },
];

const LEARNING_ROADMAP = [
  { phase: 'P1', title: 'Core Infrastructure', icon: Database, status: 'FOUNDATION', color: 'success',
    plain: 'Build the system\'s memory before anything else. Without memory, agents are just disconnected tools.',
    technical: 'Knowledge Object Model, 3-scope storage layers (Local/Candidate/Global), resolution engine with deterministic authority order, knowledge event system, partner environment isolation via RLS.',
    delivers: ['Knowledge Object table (20+ fields)', 'Partner-scoped Local KB', 'Candidate Global review layer', 'Global KB for validated truths', 'Event logging for all knowledge state changes'],
    unlocks: 'The system can remember, version, and scope every piece of learning.' },
  { phase: 'P2', title: 'Data & Event Pipeline', icon: Activity, status: 'EVIDENCE', color: 'success',
    plain: 'Capture every meaningful thing that happens — every email sent, every reply, every click, every meeting booked. This is the raw material for learning.',
    technical: 'Structured event capture for: send, reply, click, meeting booked, meeting qualified, objection extraction, wrong-person signals, delivery anomalies. Each event must carry partner_id, belief_id, icp_id.',
    delivers: ['signal_event table with full attribution', 'Webhook receivers for email provider events', 'CRM booking event ingestion', 'Reply classification pipeline'],
    unlocks: 'The system has experience memory — it knows what happened.' },
  { phase: 'P3', title: 'Decision Logging', icon: Eye, status: 'AUDIT', color: 'info',
    plain: 'Before agents can learn, we must record every decision they make. Which person did we contact? Why? What angle did we use? What knowledge informed the choice?',
    technical: 'Decision records for: contact decisions, timing decisions, angle selections, sequence progression, send pacing. Each record includes decision_id, type, inputs_used, knowledge_objects_consulted, confidence_score, timestamp.',
    delivers: ['Decision log table', 'Full audit trail per agent', 'Input/output traceability', 'Outcome linkage (populated later when signal arrives)'],
    unlocks: 'We can analyze which decisions worked, which failed, and which rules produced outcomes. Without this, learning is guesswork.' },
  { phase: 'P4', title: 'First 5 Agents', icon: Shield, status: 'EXECUTION', color: 'info',
    plain: 'Deploy the 5 most impactful agents — they control who gets contacted, when, what angle is used, how fast we send, and what replies mean. This covers 80% of acquisition performance.',
    technical: 'Contact Decision Agent, Timing Window Agent, Angle Selection Agent, Send Pacing Agent, Reply Meaning Agent. Each agent: reads from Local KB first, produces structured decisions, writes local learning only.',
    delivers: ['5 operational agents making real decisions', 'Each agent has defined task, standard, inputs, outputs', 'All decisions logged with full audit trail', 'Agents respect locked constraints'],
    unlocks: 'A working learning acquisition system. The system now makes decisions, not just sends emails.' },
  { phase: 'P5', title: 'Local Learning', icon: Brain, status: 'LEARNING', color: 'accent',
    plain: 'Each partner\'s environment starts learning on its own. The agents discover what works for THIS partner — which timing windows, which angles, which objection patterns are unique to their market.',
    technical: 'Agents write validated local patterns: ICP readiness thresholds, timing windows by role, angle performance by segment, sequence step effectiveness, objection patterns, pacing risk signals. All writes to Local KB only.',
    delivers: ['Per-partner learning accumulation', 'Local pattern detection', 'Threshold auto-adjustment', 'Angle effectiveness scoring'],
    unlocks: 'Each partner environment improves independently. Performance gets better with every send cycle.' },
  { phase: 'P6', title: 'Candidate Detection', icon: Search, status: 'NETWORK', color: 'accent',
    plain: 'The system starts looking across ALL partners and notices: "Hey, this angle keeps working everywhere. This timing pattern repeats across industries." These cross-partner patterns get flagged for review.',
    technical: 'Network Pattern Detection layer analyzes cross-environment signals: repeated angle success, stage transition improvements, recurring objections, timing heuristics, delivery patterns. Creates candidate-global knowledge objects.',
    delivers: ['Network learning layer', 'Cross-partner pattern detection', 'Automatic candidate-global flagging', 'Pattern frequency and confidence tracking'],
    unlocks: 'The system begins discovering network-level intelligence. Patterns that appear in 3+ partners get surfaced.' },
  { phase: 'P7', title: 'Governance & Promotion', icon: Scale, status: 'GOVERNANCE', color: 'warning',
    plain: 'Not every pattern deserves to become a global truth. This phase builds the judge — a governance engine that decides which candidate patterns are real, structural, and safe to promote. No shortcuts.',
    technical: 'Promotion requires: cross-partner evidence, sufficient sample, structural transferability, positive downstream impact, no harmful side effects, revalidation plan. Supports: promotion, demotion, suspension, retirement, rollback. All state transitions are auditable.',
    delivers: ['Governance engine with promotion gates', 'Revalidation scheduling (fast/medium/slow cycle)', 'Demotion and rollback workflows', 'Human approval workflow for promotions'],
    unlocks: 'Global knowledge begins forming. Slowly. Carefully. Correctly.' },
  { phase: 'P8', title: 'Global Prior Layer', icon: Globe, status: 'COMPOUND', color: 'warning',
    plain: 'When a new partner joins, they don\'t start from zero anymore. They inherit validated structural truths — which angle families work, how buyers progress through stages, what objection patterns to expect. But their own local learning still overrides if it\'s stronger.',
    technical: 'New partner environments inherit: structural angle families, stage progression patterns, objection frameworks, delivery protection heuristics, timing priors. Local KB has authority over Global KB for execution decisions.',
    delivers: ['Global prior inheritance for new partners', 'Faster ramp-up for new environments', 'Structural knowledge transfer without flattening specificity', 'Local override guarantee'],
    unlocks: 'The system now has network learning. New partners start stronger than earlier ones did.' },
  { phase: 'P9', title: 'Full Agent Stack', icon: Layers, status: 'SCALE', color: 'error',
    plain: 'With the system proven stable, add the remaining 4 specialized agents — they handle buyer stage classification, what uncertainty to resolve next, message sequencing, and buying role detection. This increases learning density dramatically.',
    technical: 'Add: Buyer Stage Agent, Uncertainty Resolution Agent, Sequence Progression Agent, Buying Role Agent. These increase the decision surface and learning granularity. Inter-agent communication layer for coordinated decisions.',
    delivers: ['9 total operational agents', 'Inter-agent coordination', 'Full decision coverage across all control points', 'Higher learning density per send cycle'],
    unlocks: 'The acquisition system is now fully autonomous in its decision-making.' },
  { phase: 'P10', title: 'Network Effect', icon: Network, status: 'MOAT', color: 'error',
    plain: 'This is the endgame. More partners join → more signal flows in → the system discovers more patterns → global priors get stronger → new partners perform even better → which attracts more partners. A self-reinforcing flywheel that gets harder and harder to compete against.',
    technical: 'Compounding network intelligence: more partners → more signal → more structural patterns → better priors → better acquisition performance → more partners. The three strongest compounding surfaces: Angle Selection, Timing Window, Reply Meaning.',
    delivers: ['Self-reinforcing acquisition flywheel', 'Compounding intelligence network', 'Competitive moat through accumulated learning', 'Revenue per 1,000 sends improves with scale'],
    unlocks: 'This is the III network effect. Very few companies have this architecture.' },
];

type SectionId = 'control-points' | 'canonical-nine' | 'blueprint' | 'knowledge' | 'governance' | 'network' | 'roadmap';

export default function MasteryAgentsPage() {
  useTheme();
  const [activeSection, setActiveSection] = useState<SectionId>('control-points');
  const [expandedDomain, setExpandedDomain] = useState<string | null>('market');
  const [selectedAgent, setSelectedAgent] = useState(CANONICAL_NINE[0]);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);

  const sections: { id: SectionId; label: string; short: string; icon: React.ElementType }[] = [
    { id: 'control-points', label: '56 Control Points', short: 'Controls', icon: Target },
    { id: 'canonical-nine', label: '9 Canonical Agents', short: 'Agents', icon: Shield },
    { id: 'blueprint', label: 'Agent Blueprint', short: 'Blueprint', icon: Layers },
    { id: 'knowledge', label: 'Knowledge System', short: 'KB', icon: Database },
    { id: 'governance', label: 'Governance', short: 'Gov', icon: Scale },
    { id: 'network', label: 'Network Effect', short: 'Network', icon: Network },
    { id: 'roadmap', label: 'Learning Roadmap', short: 'Roadmap', icon: GitGraph },
  ];

  const c = {
    bg: 'bg-background',
    surface: 'bg-surface',
    surfaceHover: 'bg-surfaceHover',
    border: 'border-border',
    borderStrong: 'border-borderHover',
    text: 'text-textPrimary',
    textMuted: 'text-textSecondary',
    textDim: 'text-textTertiary',
  };

  const totalControlPoints = CONTROL_POINT_DOMAINS.reduce((sum, d) => sum + d.points.length, 0);
  const tier1Count = CONTROL_POINT_DOMAINS.reduce((sum, d) => sum + d.points.filter(p => p.tier === 1).length, 0);

  return (
    <div className={`min-h-screen ${c.bg} ${c.text} font-sans`}>
      <header className={`sticky top-0 z-50 border-b ${c.border} bg-background/80 backdrop-blur-2xl px-4 py-4 sm:px-8`}>
        <div className='mx-auto max-w-7xl flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h1 className='text-2xl font-black tracking-tight sm:text-3xl'>Mastery Agent Architecture</h1>
            <p className={`text-sm mt-1 ${c.textMuted}`}>IIInfrastructure Acquisition Learning System — Complete Specification</p>
          </div>
          <div className='flex items-center gap-3 text-sm'>
            <span className='px-3 py-1.5 rounded-full bg-surfaceElevated text-success font-bold border border-border'>{totalControlPoints} Control Points</span>
            <span className='px-3 py-1.5 rounded-full bg-accent/10 text-accent font-bold border border-accent/20'>9 Canonical Agents</span>
            <span className='px-3 py-1.5 rounded-full bg-surfaceElevated text-info font-bold border border-border'>3-Tier KB</span>
          </div>
        </div>
      </header>

      <nav className={`sticky top-[73px] z-40 border-b ${c.border} bg-background/90 backdrop-blur-xl`}>
        <div className='mx-auto max-w-7xl px-4 sm:px-8'>
          <div className='flex gap-1 overflow-x-auto py-2 hide-scrollbar'>
            {sections.map((s) => {
              const isActive = activeSection === s.id;
              return (
                  <button key={s.id} onClick={() => setActiveSection(s.id)} className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${isActive ? 'bg-accent text-textInverse shadow-lg shadow-accent/20' : `${c.textMuted} hover:bg-surfaceHover`}`}>
                  <s.icon size={16} />
                  <span className='hidden sm:inline'>{s.label}</span>
                  <span className='sm:hidden'>{s.short}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <main className='relative mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-12'>
        <div className='pointer-events-none absolute inset-0 overflow-hidden'>
          <motion.div animate={{ y: [0, -30, 0], x: [0, 15, 0] }} transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }} className='absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-accent/[0.04] blur-[100px]' />
          <motion.div animate={{ y: [0, 20, 0], x: [0, -20, 0] }} transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }} className='absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-success/[0.04] blur-[100px]' />
          <motion.div animate={{ y: [0, -15, 0] }} transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }} className='absolute top-1/3 left-1/2 w-[300px] h-[300px] rounded-full bg-info/[0.03] blur-[80px]' />
        </div>

        <AnimatePresence mode='wait'>
          {activeSection === 'control-points' && (
            <motion.div key='cp' initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className='relative space-y-6'>
              <div className='mb-8'>
                <motion.h2 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className='text-3xl font-black mb-3'>Acquisition Control Points</motion.h2>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className={`text-lg leading-relaxed max-w-3xl ${c.textMuted}`}>Every place where a decision changes downstream economics, conversion quality, learning quality, or scalability. <strong className={c.text}>10 domains. {totalControlPoints} control points. {tier1Count} Tier-1 critical.</strong></motion.p>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className='flex flex-wrap gap-3 mt-5'>
                  <span className='px-3 py-1.5 rounded-full bg-surfaceElevated text-success text-sm font-bold border border-border'>Tier 1 — Critical ({tier1Count})</span>
                  <span className='px-3 py-1.5 rounded-full bg-surfaceElevated text-info text-sm font-bold border border-border'>Tier 2 — Supporting</span>
                  <span className='px-3 py-1.5 rounded-full bg-surfaceElevated text-warning text-sm font-bold border border-border'>Tier 3 — Specialized</span>
                </motion.div>
              </div>
              {CONTROL_POINT_DOMAINS.map((domain, dIdx) => {
                const isExpanded = expandedDomain === domain.id;
                return (
                  <motion.div key={domain.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: dIdx * 0.05, type: 'spring', stiffness: 120, damping: 16 }} className={`rounded-[var(--radius-lg)] border-2 transition-all ${isExpanded ? `border-${domain.color}/40 shadow-lg` : `${c.border}`} ${c.surface} overflow-hidden`}>
                    <button onClick={() => setExpandedDomain(isExpanded ? null : domain.id)} className='w-full text-left p-6 flex items-center justify-between gap-4 group'>
                      <div className='flex items-center gap-4'>
                        <motion.span whileHover={{ scale: 1.1, rotate: -3 }} className={`text-sm font-black w-10 h-10 rounded-xl bg-${domain.color}/10 text-${domain.color} border border-${domain.color}/20 flex items-center justify-center`}>{domain.domain}</motion.span>
                        <div>
                          <h3 className='text-lg font-black group-hover:text-accent transition-colors'>{domain.name}</h3>
                          <p className={`text-sm ${c.textMuted}`}>{domain.desc} — <strong>{domain.points.length}</strong> control points</p>
                        </div>
                      </div>
                      <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ type: 'spring', stiffness: 200 }}><ChevronDown size={20} className={c.textMuted} /></motion.div>
                    </button>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35 }} className='overflow-hidden'>
                          <div className='px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-4'>
                            {domain.points.map((cp, cpIdx) => (
                              <motion.div key={cp.id} initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: cpIdx * 0.04, type: 'spring', stiffness: 150, damping: 16 }} whileHover={{ y: -3, scale: 1.01 }} className={`rounded-xl border ${c.border} ${c.surfaceHover} p-5 transition-shadow hover:shadow-lg`}>
                                <div className='flex items-start justify-between gap-3 mb-3'>
                                  <h4 className='font-bold text-base'>{cp.name}</h4>
                                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-full flex-shrink-0 ${cp.tier === 1 ? 'bg-surfaceElevated text-success border border-border' : cp.tier === 2 ? 'bg-surfaceElevated text-info border border-border' : 'bg-surfaceElevated text-warning border border-border'}`}>Tier {cp.tier}</span>
                                </div>
                                <p className={`text-sm font-semibold mb-2 ${c.text}`}>&ldquo;{cp.question}&rdquo;</p>
                                <p className={`text-sm leading-relaxed ${c.textMuted} mb-3`}>{cp.why}</p>
                                <div className={`flex items-center gap-2 text-xs font-mono ${c.textDim} pt-2 border-t ${c.border}`}>
                                  <Cpu size={12} className='text-accent' /> {cp.agent}
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {activeSection === 'canonical-nine' && (
            <motion.div key='nine' initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className='relative space-y-6'>
              <div className='mb-8'>
                <motion.h2 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className='text-3xl font-black mb-3'>The 9 Canonical Agents</motion.h2>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className={`text-lg leading-relaxed max-w-3xl ${c.textMuted}`}>One agent. One task. One standard. Each governs a single control point, makes structured decisions, and improves through validated learning. <strong className={c.text}>Click any agent to see its full specification.</strong></motion.p>
              </div>
              <div className='space-y-4'>
                {CANONICAL_NINE.map((agent, idx) => {
                  const isOpen = expandedAgent === agent.id;
                  return (
                    <motion.div key={agent.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05, type: 'spring', stiffness: 120, damping: 16 }} className={`rounded-[var(--radius-lg)] border-2 transition-all ${isOpen ? 'border-accent/40 shadow-xl' : c.border} ${c.surface} overflow-hidden`}>
                      <button onClick={() => setExpandedAgent(isOpen ? null : agent.id)} className='w-full text-left p-6 flex items-center justify-between gap-4 group'>
                        <div className='flex items-center gap-4'>
                          <motion.div whileHover={{ scale: 1.12, rotate: -5 }} className='w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0 border border-accent/20'>
                            <agent.icon size={22} className='text-accent' />
                          </motion.div>
                          <div>
                            <div className='flex items-center gap-3 mb-1 flex-wrap'>
                              <h3 className='text-lg font-black group-hover:text-accent transition-colors'>{agent.name}</h3>
                              <span className={`text-[10px] font-mono px-2.5 py-1 rounded-full bg-surfaceHover ${c.textMuted} border ${c.border}`}>{agent.engine} Engine</span>
                            </div>
                            <p className={`text-sm ${c.textMuted}`}>{agent.task}</p>
                          </div>
                        </div>
                        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ type: 'spring', stiffness: 200 }}><ChevronDown size={20} className={c.textMuted} /></motion.div>
                      </button>
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35 }} className='overflow-hidden'>
                            <div className='px-6 pb-6 space-y-5'>
                              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={`rounded-xl bg-surface p-5 border border-border`}>
                                <h4 className='text-xs font-black uppercase tracking-[0.2em] text-warning mb-2 flex items-center gap-2'><Award size={14} /> Performance Standard</h4>
                                <p className='text-sm leading-relaxed'>{agent.standard}</p>
                              </motion.div>
                              <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
                                {[
                                  { title: 'Inputs', items: agent.inputs, color: 'success' },
                                  { title: 'Outputs', items: agent.outputs, color: 'accent' },
                                  { title: 'Allowed Learning', items: agent.allowed, color: 'info' },
                                  { title: 'Locked Constraints', items: agent.locked, color: 'error', lockIcon: true },
                                ].map((col, colIdx) => (
                                  <motion.div key={col.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + colIdx * 0.06 }} className={`rounded-xl ${c.surfaceHover} p-4 border ${c.border}`}>
                                    <h4 className={`text-xs font-black uppercase tracking-[0.2em] text-${col.color} mb-3`}>{col.title}</h4>
                                    {col.items.map((item, iIdx) => (
                                      <motion.div key={item} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + iIdx * 0.03 }} className={`text-sm ${c.textMuted} flex items-start gap-2 mb-1.5`}>
                                        {col.lockIcon ? <Lock size={10} className={`mt-1.5 text-${col.color} flex-shrink-0`} /> : <div className={`mt-1.5 w-1.5 h-1.5 rounded-full bg-${col.color} flex-shrink-0`} />}
                                        {item}
                                      </motion.div>
                                    ))}
                                  </motion.div>
                                ))}
                              </div>
                              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className='flex flex-wrap gap-3'>
                                <span className='text-xs font-bold px-3 py-1.5 rounded-full bg-accent/10 text-accent border border-accent/20'>Writes → {agent.writes}</span>
                                <span className='text-xs font-bold px-3 py-1.5 rounded-full bg-surfaceElevated text-info border border-border'>Control: {agent.controlPoint}</span>
                              </motion.div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeSection === 'blueprint' && (
            <motion.div key='bp' initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className='relative space-y-10'>
              <div className='mb-8'>
                <motion.h2 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className='text-3xl font-black mb-3'>Mastery Agent Blueprint</motion.h2>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className={`text-lg leading-relaxed max-w-3xl ${c.textMuted}`}>A Mastery Agent is a bounded system built to perform <strong className={c.text}>one defined task</strong> under <strong className={c.text}>one defined standard</strong>, improve through feedback, and retain validated learning over time. Not a general AI. Not a chatbot. <strong className={c.text}>One worker. One job. One rubric. One improvement loop.</strong></motion.p>
              </div>
              <div>
                <h3 className='text-xl font-black mb-6'>The 5 Structural Layers</h3>
                <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4'>
                  {FIVE_LAYERS.map((layer, idx) => (
                    <motion.div key={layer.layer} initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: idx * 0.1, type: 'spring', stiffness: 120, damping: 14 }} whileHover={{ y: -6, scale: 1.03 }} className={`rounded-[var(--radius-lg)] border ${c.border} ${c.surface} p-6 text-center transition-shadow hover:shadow-xl relative overflow-hidden`}>
                      <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 4 + idx, repeat: Infinity, ease: 'easeInOut' }} className={`absolute -top-10 -right-10 w-24 h-24 rounded-full bg-${layer.color}/[0.06] blur-xl`} />
                      <motion.div whileHover={{ scale: 1.1, rotate: -5 }} className={`w-14 h-14 mx-auto rounded-xl bg-${layer.color}/10 flex items-center justify-center mb-4 border border-${layer.color}/20`}>
                        <layer.icon size={26} className={`text-${layer.color}`} />
                      </motion.div>
                      <div className={`text-xs font-bold mb-2 text-${layer.color}`}>Layer {layer.layer}</div>
                      <h4 className='text-base font-black mb-2'>{layer.name}</h4>
                      <p className={`text-sm ${c.textMuted}`}>{layer.desc}</p>
                      {idx < FIVE_LAYERS.length - 1 && <div className={`hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 text-${layer.color}`}><ArrowRight size={18} /></div>}
                    </motion.div>
                  ))}
                </div>
              </div>
              <div className={`rounded-[var(--radius-lg)] border ${c.border} ${c.surface} p-8`}>
                <h3 className='text-xl font-black mb-6'>Critical Design Rules</h3>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
                  {[
                    { title: 'Execution ≠ Learning', desc: 'The system that performs the task must NOT be the same as the system that decides what to change. Execution is consistency. Learning is refinement. Mixing them causes drift.', icon: Zap },
                    { title: 'Bounded Learning Surface', desc: 'Each agent may only learn within approved categories. Mission, task boundary, core rubric, safety constraints, and brand doctrine are LOCKED.', icon: Lock },
                    { title: 'Validation Before Promotion', desc: 'A single success can be luck. Promotion requires: 50+ uses, across 3+ segments, with statistically better performance, within constraint limits.', icon: CheckCircle2 },
                    { title: 'Spaced Reinforcement', desc: 'A lesson is not mastery until it remains true across repeated exposure over time. Re-check winning patterns later. Verify durability.', icon: RefreshCcw },
                    { title: 'Start Narrow, High-Frequency', desc: 'First agents should be built on tasks with high repetition, fast feedback, clear scoring, and bounded complexity. Mastery depends on cycles.', icon: Target },
                    { title: 'Error Diagnosis, Not Just Scores', desc: 'Metrics alone do not teach. A Mastery Agent needs: what failed, why it failed, under what conditions, and what should change next time.', icon: Eye },
                  ].map((rule, rIdx) => (
                    <motion.div key={rule.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: rIdx * 0.06 }} whileHover={{ y: -3 }} className={`rounded-xl ${c.surfaceHover} p-5 border ${c.border} transition-shadow hover:shadow-lg`}>
                      <h4 className='font-bold text-base mb-2 flex items-center gap-2'><rule.icon size={16} className='text-accent' />{rule.title}</h4>
                      <p className={`text-sm leading-relaxed ${c.textMuted}`}>{rule.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'knowledge' && (
            <motion.div key='kb' initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className='relative space-y-10'>
              <div className='mb-8'>
                <motion.h2 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className='text-3xl font-black mb-3'>3-Tier Knowledge Architecture</motion.h2>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className={`text-lg leading-relaxed max-w-3xl ${c.textMuted}`}>Local learning controls execution. Global learning provides priors. Candidate-global is under review, not authoritative. <strong className={c.text}>Knowledge must move from local to global only through governed promotion.</strong></motion.p>
              </div>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
                {KB_SCOPES.map((ks, idx) => (
                  <motion.div key={ks.scope} initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: idx * 0.12, type: 'spring', stiffness: 100, damping: 14 }} whileHover={{ y: -6, scale: 1.02 }} className={`rounded-[var(--radius-lg)] border-2 border-${ks.color}/20 ${c.surface} p-6 transition-shadow hover:shadow-xl relative overflow-hidden`}>
                    <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 6 + idx * 2, repeat: Infinity, ease: 'easeInOut' }} className={`absolute -top-16 -right-16 w-40 h-40 rounded-full bg-${ks.color}/[0.06] blur-[50px]`} />
                    <div className='relative'>
                      <div className='flex items-center gap-3 mb-4'>
                        <motion.div whileHover={{ scale: 1.2 }} className={`w-4 h-4 rounded-full bg-${ks.color} shadow-lg`} style={{ boxShadow: `0 0 12px var(--color-${ks.color})` }} />
                        <h3 className='text-xl font-black'>{ks.label}</h3>
                      </div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full bg-${ks.color}/10 text-${ks.color} border border-${ks.color}/20 mb-4 inline-block`}>Authority: {ks.authority}</span>
                      <p className={`text-sm leading-relaxed ${c.textMuted} mt-3 mb-5`}>{ks.desc}</p>
                      <div className='space-y-2.5'>
                        {ks.examples.map((ex, eIdx) => (
                          <motion.div key={ex} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + eIdx * 0.05 }} className={`text-sm ${c.textMuted} flex items-start gap-2.5`}>
                            <div className={`mt-1.5 w-2 h-2 rounded-full bg-${ks.color} flex-shrink-0`} />
                            {ex}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className={`rounded-[var(--radius-lg)] border ${c.border} ${c.surface} p-8`}>
                <h3 className='text-xl font-black mb-4'>Authority Resolution Order</h3>
                <p className={`text-sm ${c.textMuted} mb-6`}>When an agent makes a decision, knowledge is consulted in this <strong className={c.text}>deterministic</strong> order — no exceptions:</p>
                <div className='flex flex-col sm:flex-row items-center gap-3'>
                  {[
                    { label: 'Hard Constraints', sub: 'Non-negotiable rules', color: 'error' },
                    { label: 'Local Knowledge', sub: 'Partner-specific truth', color: 'success' },
                    { label: 'Global Priors', sub: 'Validated network truths', color: 'info' },
                    { label: 'Candidate Global', sub: 'Under review (advisory)', color: 'warning' },
                  ].map((step, i) => (
                    <React.Fragment key={step.label}>
                      {i > 0 && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 + i * 0.1 }} className='hidden sm:block'><ArrowRight size={20} className='text-accent' /></motion.div>}
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.1, type: 'spring' }} whileHover={{ y: -3, scale: 1.03 }} className={`w-full sm:w-auto rounded-xl border border-${step.color}/20 bg-${step.color}/5 px-5 py-4 text-center transition-shadow hover:shadow-lg`}>
                        <span className={`text-lg font-black block mb-1 text-${step.color}`}>#{i + 1}</span>
                        <span className='text-sm font-bold block'>{step.label}</span>
                        <span className={`text-xs ${c.textMuted}`}>{step.sub}</span>
                      </motion.div>
                    </React.Fragment>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}

          {activeSection === 'governance' && (
            <motion.div key='gov' initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className='relative space-y-10'>
              <div className='mb-8'>
                <motion.h2 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className='text-3xl font-black mb-3'>Knowledge Governance & Promotion</motion.h2>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className={`text-lg leading-relaxed max-w-3xl ${c.textMuted}`}>All global knowledge must be <strong className={c.text}>earned</strong> through governed promotion. No shortcuts. Execution agents may propose — <strong className={c.text}>governance approves</strong>. Rollback must always be possible.</motion.p>
              </div>
              <div>
                <h3 className='text-xl font-black mb-6'>Knowledge Lifecycle States</h3>
                <div className='grid grid-cols-2 sm:grid-cols-4 gap-4'>
                  {GOVERNANCE_LIFECYCLE.map((gs, idx) => (
                    <motion.div key={gs.state} initial={{ opacity: 0, y: 16, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: idx * 0.07, type: 'spring', stiffness: 130, damping: 14 }} whileHover={{ y: -5, scale: 1.04 }} className={`rounded-[var(--radius-lg)] border ${c.border} ${c.surface} p-5 flex flex-col items-center text-center transition-shadow hover:shadow-xl relative overflow-hidden`}>
                      <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 3, repeat: Infinity, delay: idx * 0.3 }} className={`w-14 h-14 rounded-xl bg-${gs.color}/10 flex items-center justify-center mb-3 border border-${gs.color}/20`}>
                        <gs.icon size={24} className={`text-${gs.color}`} />
                      </motion.div>
                      <h4 className='text-sm font-black mb-2'>{gs.state}</h4>
                      <p className={`text-xs leading-relaxed ${c.textMuted}`}>{gs.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className={`rounded-[var(--radius-lg)] border ${c.border} ${c.surface} p-8`}>
                <h3 className='text-xl font-black mb-2'>Promotion Requirements</h3>
                <p className={`text-sm ${c.textMuted} mb-6`}>A candidate-global object may be promoted only if <strong className='text-error'>ALL</strong> of the following are satisfied:</p>
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                  {[
                    { title: 'Cross-Environment Evidence', desc: 'Pattern appears across multiple partner environments' },
                    { title: 'Sufficient Sample', desc: 'Enough data to justify confidence' },
                    { title: 'Structural Transferability', desc: 'Evidence of applying beyond a single partner context' },
                    { title: 'Positive Downstream Impact', desc: 'Improves approved outcomes: reply rate, meeting rate, stage progression' },
                    { title: 'No Harmful Side Effects', desc: 'Does not create unacceptable tradeoffs in delivery, objections, or compliance' },
                    { title: 'Revalidation Plan', desc: 'Promotion is not complete without a defined revalidation cadence' },
                  ].map((req, rIdx) => (
                    <motion.div key={req.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + rIdx * 0.05 }} whileHover={{ y: -2 }} className={`rounded-xl ${c.surfaceHover} p-4 border ${c.border} transition-shadow hover:shadow-md`}>
                      <h4 className='text-sm font-bold mb-1 flex items-center gap-2'><CheckCircle2 size={14} className='text-success' />{req.title}</h4>
                      <p className={`text-xs leading-relaxed ${c.textMuted}`}>{req.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className={`rounded-[var(--radius-lg)] border-2 border-border bg-error/[0.03] p-6`}>
                <h3 className='text-lg font-black mb-4 text-error flex items-center gap-2'><Lock size={18} /> What Must NEVER Happen</h3>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                  {[
                    'Global knowledge overriding stronger local evidence',
                    'Direct local-to-global promotion without governance',
                    'Execution agents freely rewriting their own mission or standards',
                    'Single successes becoming global truth',
                    'Generic flattening across all partner environments',
                    'Permanent global truth without revalidation',
                  ].map((rule, rIdx) => (
                    <motion.div key={rule} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 + rIdx * 0.04 }} className='flex items-start gap-2.5 text-sm'>
                      <XCircle size={15} className='mt-0.5 text-error flex-shrink-0' />{rule}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}

          {activeSection === 'network' && (
            <motion.div key='net' initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className='relative space-y-10'>
              <div className='mb-8'>
                <motion.h2 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className='text-3xl font-black mb-3'>The Network Effect — Compounding Moat</motion.h2>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className={`text-lg leading-relaxed max-w-3xl ${c.textMuted}`}>At scale, the system becomes <strong className={c.text}>harder and harder to compete against</strong>. Each partner contributes signal. Each campaign contributes signal. The network compounds intelligence through controlled local execution and governed global knowledge promotion.</motion.p>
              </div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className={`rounded-[var(--radius-lg)] border-2 border-accent/20 ${c.surface} p-8 sm:p-12 relative overflow-hidden`}>
                <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }} className='absolute -top-20 -right-20 w-60 h-60 rounded-full border border-accent/10' />
                <motion.div animate={{ rotate: [360, 0] }} transition={{ duration: 45, repeat: Infinity, ease: 'linear' }} className='absolute -bottom-16 -left-16 w-48 h-48 rounded-full border border-border' />
                <div className='relative flex flex-col items-center gap-0 py-4'>
                  {['More Partners', 'More Signal', 'More Patterns', 'Better Priors', 'Better Acquisition', 'More Partners'].map((step, i) => (
                    <motion.div key={`${step}-${i}`} initial={{ opacity: 0, scale: 0.8, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.12, type: 'spring', stiffness: 100, damping: 12 }} className='flex flex-col items-center'>
                      {i > 0 && (
                        <motion.div initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: 0.3 + i * 0.12 }} className='h-8 sm:h-10 w-px bg-gradient-to-b from-accent/40 to-accent/10 origin-top' />
                      )}
                      <motion.div whileHover={{ scale: 1.08, y: -3 }} className={`rounded-[var(--radius-lg)] border-2 ${i === 0 || i === 5 ? 'border-borderHover bg-surfaceElevated shadow-lg' : 'border-accent/20 bg-accent/5'} px-8 sm:px-12 py-4 sm:py-5 text-center transition-shadow hover:shadow-xl`}>
                        <span className={`text-lg sm:text-xl font-black ${i === 0 || i === 5 ? 'text-success' : 'text-accent'}`}>{step}</span>
                        {(i === 0 || i === 5) && <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 2, repeat: Infinity }} className='absolute -inset-px rounded-[var(--radius-lg)] border border-border' />}
                      </motion.div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
              <div>
                <h3 className='text-xl font-black mb-6'>The 3 Biggest Network-Effect Control Points</h3>
                <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
                  {NETWORK_EFFECT_THREE.map((ne, idx) => (
                    <motion.div key={ne.name} initial={{ opacity: 0, y: 20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.5 + idx * 0.12, type: 'spring', stiffness: 100, damping: 14 }} whileHover={{ y: -6, scale: 1.02 }} className={`rounded-[var(--radius-lg)] border-2 ${c.borderStrong} ${c.surface} p-6 transition-shadow hover:shadow-xl relative overflow-hidden`}>
                      <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 5 + idx * 2, repeat: Infinity, ease: 'easeInOut' }} className='absolute -top-12 -right-12 w-32 h-32 rounded-full bg-accent/[0.05] blur-[40px]' />
                      <div className='relative'>
                        <h4 className='text-xl font-black mb-3 text-accent'>{ne.name}</h4>
                        <p className={`text-sm leading-relaxed ${c.textMuted} mb-5`}>{ne.why}</p>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 + idx * 0.1 }} className={`rounded-xl bg-surface p-4 border border-border`}>
                          <h5 className='text-xs font-black uppercase tracking-[0.2em] text-success mb-2 flex items-center gap-2'><Zap size={13} /> Compounds Into</h5>
                          <p className='text-sm leading-relaxed'>{ne.compounds}</p>
                        </motion.div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'roadmap' && (
            <motion.div key='rm' initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className='space-y-8'>
              <div className='mb-8'>
                <h2 className='text-3xl font-black mb-3'>Acquisition Learning System — 10-Phase Roadmap</h2>
                <p className={`text-lg leading-relaxed max-w-3xl ${c.textMuted}`}>Build the memory and governance infrastructure <strong>before</strong> building agents. Without memory, agents become disconnected tools. Each phase gates the next — no skipping.</p>
                <div className='flex flex-wrap gap-3 mt-5'>
                  <span className='px-3 py-1.5 rounded-full bg-surfaceElevated text-success text-sm font-bold border border-border'>Phases 1–2: Memory</span>
                  <span className='px-3 py-1.5 rounded-full bg-surfaceElevated text-info text-sm font-bold border border-border'>Phases 3–4: Agents</span>
                  <span className='px-3 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-bold border border-accent/20'>Phases 5–6: Learning</span>
                  <span className='px-3 py-1.5 rounded-full bg-surfaceElevated text-warning text-sm font-bold border border-border'>Phases 7–8: Network</span>
                  <span className='px-3 py-1.5 rounded-full bg-surfaceElevated text-error text-sm font-bold border border-border'>Phases 9–10: Moat</span>
                </div>
              </div>

              <div className='relative'>
                <div className={`absolute left-6 sm:left-8 top-0 bottom-0 w-px bg-border`} />

                {LEARNING_ROADMAP.map((phase, idx) => {
                  const isOpen = expandedPhase === phase.phase;
                  const PhaseIcon = phase.icon;
                  return (
                    <motion.div key={phase.phase} initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.07, type: 'spring', stiffness: 120, damping: 16 }} className='relative pl-16 sm:pl-20 pb-6'>
                      <motion.div
                        className={`absolute left-3 sm:left-5 w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center z-10 border-2 transition-all ${isOpen ? `bg-${phase.color} border-${phase.color} shadow-lg` : `bg-surface border-border`}`}
                        whileHover={{ scale: 1.15 }}
                        animate={isOpen ? { scale: [1, 1.15, 1], transition: { duration: 0.4 } } : {}}
                      >
                        <PhaseIcon size={14} className={isOpen ? 'text-textInverse' : `text-${phase.color}`} />
                      </motion.div>

                      <motion.button
                        onClick={() => setExpandedPhase(isOpen ? null : phase.phase)}
                        whileHover={{ x: 4 }}
                        className={`w-full text-left rounded-[var(--radius-lg)] border ${isOpen ? `border-${phase.color}/40 shadow-lg` : c.border} ${c.surface} p-5 sm:p-6 transition-all`}
                      >
                        <div className='flex items-center justify-between gap-3 mb-2'>
                          <div className='flex items-center gap-3 flex-wrap'>
                            <span className={`text-xs font-mono font-black px-2.5 py-1 rounded-lg bg-${phase.color}/10 text-${phase.color} border border-${phase.color}/20`}>{phase.phase}</span>
                            <h3 className='text-lg sm:text-xl font-black'>{phase.title}</h3>
                            <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full bg-${phase.color}/10 text-${phase.color}`}>{phase.status}</span>
                          </div>
                          <motion.div animate={{ rotate: isOpen ? 180 : 0 }} className='flex-shrink-0'>
                            <ChevronDown size={20} className={c.textMuted} />
                          </motion.div>
                        </div>

                        <p className={`text-base leading-relaxed ${c.text}`}>{phase.plain}</p>
                      </motion.button>

                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className='overflow-hidden'
                          >
                            <div className={`mt-3 rounded-[var(--radius-lg)] border ${c.border} ${c.surfaceHover} p-5 sm:p-6 space-y-5`}>
                              <div>
                                <h4 className={`text-xs font-black uppercase tracking-[0.25em] mb-3 text-${phase.color} flex items-center gap-2`}><Cpu size={13} /> Technical Specification</h4>
                                <p className={`text-sm leading-relaxed ${c.textMuted}`}>{phase.technical}</p>
                              </div>

                              <div>
                                <h4 className='text-xs font-black uppercase tracking-[0.25em] mb-3 text-accent flex items-center gap-2'><CheckCircle2 size={13} /> What This Phase Delivers</h4>
                                <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                                  {phase.delivers.map((d, i) => (
                                    <motion.div key={d} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className='flex items-start gap-2.5 text-sm'>
                                      <div className={`mt-1.5 w-2 h-2 rounded-full bg-${phase.color} flex-shrink-0`} />
                                      <span>{d}</span>
                                    </motion.div>
                                  ))}
                                </div>
                              </div>

                              <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className={`rounded-xl bg-${phase.color}/5 border border-${phase.color}/20 p-4 flex items-start gap-3`}
                              >
                                <Zap size={18} className={`text-${phase.color} flex-shrink-0 mt-0.5`} />
                                <div>
                                  <h4 className={`text-sm font-black mb-1 text-${phase.color}`}>What This Unlocks</h4>
                                  <p className='text-sm leading-relaxed'>{phase.unlocks}</p>
                                </div>
                              </motion.div>

                              {idx < LEARNING_ROADMAP.length - 1 && (
                                <div className='flex items-center gap-3 pt-2'>
                                  <ArrowRight size={16} className={c.textDim} />
                                  <span className={`text-sm font-bold ${c.textMuted}`}>Feeds into → <span className='text-textPrimary'>{LEARNING_ROADMAP[idx + 1].title}</span></span>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className={`rounded-[var(--radius-lg)] border border-border bg-surface p-6 sm:p-8 text-center`}>
                <h3 className='text-xl font-black mb-3 text-success'>The Final Outcome</h3>
                <p className={`text-base leading-relaxed max-w-2xl mx-auto ${c.text}`}>
                  If built correctly, III will operate a <strong>self-improving acquisition system</strong> where partners learn locally, the network learns globally, knowledge compounds, and performance improves with every new partner that joins.
                </p>
                <p className={`text-sm mt-4 ${c.textMuted}`}>Very few companies have this architecture. Most "AI agent" systems are automation tools. What you are building is a <strong>compounding intelligence system for acquisition</strong>.</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className={`border-t ${c.border} px-4 py-6 sm:px-8 text-center`}>
        <p className={`text-xs ${c.textDim}`}>MarketX — Mastery Agent Architecture — IIInfrastructure Acquisition Learning System</p>
        <p className={`text-xs ${c.textDim} mt-1`}>Source: Tommy&apos;s Canonical Documentation Suite (31 documents)</p>
      </footer>
    </div>
  );
}
