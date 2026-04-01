'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  Activity,
  ActivityIcon,
  Anchor,
  BarChart3,
  Beaker,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Code2,
  Cpu,
  Database,
  DatabaseZap,
  FileText,
  Fingerprint,
  FlaskConical,
  GitGraph,
  GitPullRequest,
  Gauge,
  Globe,
  LayoutList,
  Lightbulb,
  Lock,
  Menu,
  MessageSquare,
  Moon,
  Move,
  Network,
  Scale,
  Server,
  Shield,
  ShieldAlert,
  Sparkles,
  Sun,
  Target,
  TrendingUp,
  Volume2,
  VolumeX,
  Workflow,
  X,
  Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { MailWriterLogo } from '@/components/MailWriterLogo';

const GATING_RULES = [
  'Minimum Send Threshold Met',
  'Minimum Reply Count Met',
  'Minimum Booked Call Count Met',
  'Durability Window Satisfied (7-14 Days)',
  'Statistical Confidence (>= 90%)',
];

const PHASES = [
  { id: 'p0', title: 'Activation', engine: 'Governance', status: 'LOCKED', content: 'Lock structural inputs: Partner_ID, Offer_ID, CRM links. Setup fee and rev-share alignment verified.', exit: 'ICP scope locked, tracking domain assigned.', additions: ['Signed rev share agreement, $10K setup, monthly retainer, onboarding questionnaire, and intake artifacts are all collected before production begins.', 'Assign Partner_ID, assign Tenant_ID, create the internal project container, validate offer clarity, and validate compliance constraints.'], guardrails: ['If ICP inputs are not confirmed, offer is not locked, suppression rules are missing, or the CRM booking link is not verified, the workflow halts immediately.'] },
  { id: 'p1', title: 'ICP Builder', engine: 'Builder', status: 'ACTIVE', content: '420 taxonomy segmentation. Apply industry, revenue ($10M+), and seniority filters.', exit: 'Zero-bounce protocol active. Deliverability clean.', additions: ['Each ICP segment is structured by industry, revenue band, seniority level, buying power classification, in-market keyword intent, and explicit exclusions.', 'Identity pull applies Universal Person records, exclusion rules, global suppression, partner suppression, internal reject history, catch-all filtering, and verification layers.'], guardrails: ['No broad ICPs, no undefined targeting, and no structural ICP conflicts are allowed to pass Gate 1.'] },
  { id: 'p2', title: 'Belief Construction', engine: 'Writer', status: 'ACTIVE', content: 'MarketWriter brief generation. Bind Flow A (Champion) and Flow B (Challenger).', exit: 'Brief immutability triggered.', additions: ['The MW Brief binds Brief_ID, structural lock fields, angle class, current buyer belief, desired shift, decision movement, champion reference, challenger hypothesis, signal thresholds, extension intent, and Status = TEST.', 'Flow generation produces one belief per flow, two competing flows per ICP segment, initial Emails 1-4, subject testing per email, plain text, and a single CTA.'], guardrails: ['If the Brief does not exist or belief binding is mixed, flow generation is blocked and must be regenerated.'] },
  { id: 'p3', title: 'Infra Verification', engine: 'Surface', status: 'ACTIVE', content: 'Provision 5 TLDs and 10 satellites per domain. Validate SPF/DKIM/DMARC.', exit: 'Satellite connectivity confirmed.', additions: ['Per partner environment: 5 TLD domains, 10 satellites per domain, isolated tracking domain, isolated link domain, isolated reply routing, and lists A/B created with no domain reuse.', 'Testing runs in three layers: DNS/spam/unsubscribe, internal reply classification and objection injection, then partner approval test sends.'], guardrails: ['No launch proceeds without domain verification, suppression enforcement confirmation, reply classification confidence, and partner sign-off.'] },
  { id: 'p4', title: 'Controlled Ramp', engine: 'Surface', status: 'RAMPING', content: '10-14 day disciplined ramp. Max 3,000 sends per satellite/day. One satellite at a time.', exit: 'Stability window met.', additions: ['Satellite activation is centralized and throttled so only one satellite ramps at a time, preventing reputation shocks and preserving clean deliverability baselines.', 'This phase exists to enforce stability before scale, not to chase short-term spikes or volume vanity.'], guardrails: ['No spike scaling, no forced scaling, and no scale before stability.'] },
  { id: 'p5', title: 'Signal Engine', engine: 'Signal', status: 'MONITORING', content: 'Capture replies, booked calls, and revenue. Evaluate confidence score weekly.', exit: 'Hybrid gating met.', additions: ['Signal capture includes sends, replies, reply types, click behavior, booked calls, show rates, revenue, and auto-classified reply outcomes tied to Belief_ID and ICP_ID.', 'Weekly confidence score recalculation weighs booked call rate, positive reply rate, reply composition quality, and negative reply rate using static v1 weights.'], guardrails: ['Allocation changes only happen when minimum volume, replies, booked calls, durability window, and statistical threshold are all met together.'] },
  { id: 'p6', title: 'Flow Extension', engine: 'Writer', status: 'READY', content: 'Generate blocks 5-8 and 9-12. If clicks up but replies zero, lower CTA friction.', exit: 'Lift verified vs baseline flows.', additions: ['Triggered only after gating is met. Extension logic is allowed to change friction level, problem specificity, order of ideas, and fit clarity.', 'Extension generates Emails 5-8 and 9-12 as needed to continue the same belief competition instead of introducing a brand-new thesis.'], guardrails: ['Not allowed: offer change, ICP mutation, or belief mixing.'] },
  { id: 'p7', title: 'Promotion Ladder', engine: 'Growth', status: 'READY', content: 'Status progression: HYP -> TEST -> SW -> IW -> RW -> GW.', exit: 'Winning belief reaches global winner.', additions: ['A belief becomes SW when it wins a segment durably, IW when it transfers across ICPs, RW when it crosses revenue bands, and GW when global durability is proven.', 'Failure reduces allocation locally, but it does not auto-kill the belief; the ladder is governed by durability and transferability, not one-off spikes.'], guardrails: ['No promotion without durability and no status transition without signal evidence.'] },
  { id: 'p8', title: 'Horizontal Scale', engine: 'Growth', status: 'READY', content: 'Scale horizontally across satellites before vertical spikes.', exit: 'Compounding rev-share active.', additions: ['Scale expansion only happens when durability is positive, deliverability is stable, and revenue per 1,000 sends remains healthy.', 'Expansion sequence is deliberate: activate the next satellite, expand the domain layer, and move into the higher offer scale tier ($10K setup + $5K/month).'], guardrails: ['Scale is horizontal before vertical, and no scale is permitted without deliverability stability.'] },
];

const ANGLES = [
  { id: 'ar', name: 'Problem Reframe', concept: 'The pipeline problem is lead quality, not volume.', entryPoint: 'Recognition of a misunderstood problem.', description: 'Reframes root cause to quality and signal failure.', usage: 'Use when ICP has high spend but low returns.', signal: 'High click-to-reply on diagnostics.' },
  { id: 'hc', name: 'Hidden Constraint', concept: 'Upstream signal detection failure is the silent killer.', entryPoint: 'Discovery of an unseen bottleneck.', description: 'Reveals the factor preventing current success.', usage: 'Effective for technical ICPs.', signal: 'Deep reading on technical blocks.' },
  { id: 'fs', name: 'False Solution', concept: 'More SDRs dilute your signal-to-noise ratio.', entryPoint: 'Critical evaluation of standard solutions.', description: 'Accepted industry solutions are often the poison.', usage: 'Use against bloated SDR teams.', signal: 'Immediate positive senior reply.' },
  { id: 'ei', name: 'Economic Inefficiency', concept: 'You are overpaying for demand gen by 5-10x.', entryPoint: 'Financial audit of wasted spend.', description: 'Analyzes actual cost of booked call vs norm.', usage: 'Target CFOs and RevOps.', signal: 'Booking after financial comparison.' },
  { id: 'ms', name: 'Market Shift', concept: 'Old sequence volume is now a spam trigger.', entryPoint: 'Observation of new rules meeting assumptions.', description: 'Old tactics are now reputation threats.', usage: 'Use during onboarding education.', signal: 'Spread across IT and marketing.' },
  { id: 'og', name: 'Opportunity Gap', concept: 'Ignoring intent signals is where winners hide.', entryPoint: 'ID of ignored demand triggers.', description: 'Captures dark-funnel intent competitors miss.', usage: 'Effective in high-competition markets.', signal: 'Engagement on intent case studies.' },
  { id: 're', name: 'Risk Exposure', concept: 'Status quo measurement hides massive churn risk.', entryPoint: 'Revelation of hidden systemic risk.', description: 'Current measurements hide reputation risk.', usage: 'Safety-first enterprise messaging.', signal: 'Clicks on reputation audit CTA.' },
];

const FULL_SCHEMA = [
  { table: 'partner', keys: ['partner_id (PK)', 'partner_name', 'status'], constraints: ['Index on status'] },
  { table: 'offer', keys: ['offer_id (PK)', 'partner_id (FK)', 'offer_name'], constraints: ['Index on partner_id'] },
  { table: 'icp', keys: ['icp_id (PK)', 'partner_id (FK)', 'firmographics_json'], constraints: ['Immutable'] },
  { table: 'brief', keys: ['brief_id (PK)', 'parent_brief_id', 'icp_id (FK)', 'test_intent'], constraints: ['Immutable after lock'] },
  { table: 'belief', keys: ['belief_id (PK)', 'brief_id (FK)', 'role', 'status'], constraints: ['Exactly 2', 'Ladder: HYP -> GW'] },
  { table: 'belief_competition', keys: ['comp_id (PK)', 'brief_id (FK)', 'champ_id', 'chal_id'], constraints: ['Testing alignment'] },
  { table: 'flow', keys: ['flow_id (PK)', 'belief_id (FK)', 'status'], constraints: ['Execution container'] },
  { table: 'flow_step', keys: ['step_id (PK)', 'flow_id (FK)', 'subject', 'body'], constraints: ['Sequence discipline'] },
  { table: 'asset', keys: ['asset_id (PK)', 'brief_id', 'belief_id', 'channel'], constraints: ['Unique per social post'] },
  { table: 'signal_event', keys: ['event_id (PK)', 'brief_id', 'belief_id', 'event_type'], constraints: ['UUID mandatory'] },
  { table: 'meeting', keys: ['meeting_id (PK)', 'signal_event_id', 'status'], constraints: ['Outcome tracker'] },
  { table: 'opportunity', keys: ['opp_id (PK)', 'meeting_id', 'deal_value'], constraints: ['Pipeline link'] },
  { table: 'revenue_event', keys: ['rev_id (PK)', 'opp_id', 'amount'], constraints: ['Economics foundation'] },
  { table: 'sending_identity', keys: ['identity_id (PK)', 'partner_id', 'status'], constraints: ['Reputation guard'] },
  { table: 'belief_gate_snapshot', keys: ['snap_id (PK)', 'belief_id', 'metrics_json'], constraints: ['Audit trail'] },
  { table: 'belief_promotion_log', keys: ['log_id (PK)', 'belief_id', 'from_status', 'to_status'], constraints: ['Linear progression lock'] },
];

const PROMOTION_STATES = [
  { state: 'HYP', label: 'Hypothesis', desc: 'Initial belief concept.' },
  { state: 'TEST', label: 'In-Test', desc: 'Active traffic allocation.' },
  { state: 'SW', label: 'Segment Winner', desc: 'Durable in one segment.' },
  { state: 'IW', label: 'ICP Winner', desc: 'Transferable across ICPs.' },
  { state: 'RW', label: 'Revenue Winner', desc: 'Cross-revenue band.' },
  { state: 'GW', label: 'Global Winner', desc: 'Platform-wide truth.' },
];

const DASHBOARD_HIERARCHY = [
  { layer: '01', name: 'System Health', focus: 'Infra & Uptime', metrics: ['API Health', 'Capacity', 'Backlog'] },
  { layer: '02', name: 'Deliverability', focus: 'Inbox Placement', metrics: ['Spam Score', 'Bounce Rate', 'Reputation'] },
  { layer: '03', name: 'Belief Tracking', focus: 'Learning Logic', metrics: ['Conf Score', 'Promotion State', 'Angles'] },
  { layer: '04', name: 'Campaign Perf.', focus: 'Execution Quality', metrics: ['Reply Quality', 'Click-to-Reply'] },
  { layer: '05', name: 'Sales & Revenue', focus: 'Economics', metrics: ['Booked Calls', 'Show Rate', 'Rev/1k'] },
];

const TREE_NODES = [
  { id: 'gov', x: 400, y: 0, label: 'Governance Manual', type: 'CORE', icon: Shield, desc: 'Defines non-negotiables, allocation rules, and volume discipline.' },
  { id: 'wrk', x: 700, y: 0, label: 'Operating Workflow', type: 'CORE', icon: Workflow, desc: 'Phases 0-8 with gated transitions between states.' },
  { id: 'tsp', x: 1000, y: 0, label: 'Technical Spec', type: 'CORE', icon: Database, desc: 'Schema, services, and formula enforcement blueprint.' },
  { id: 'bld', x: 200, y: 200, label: 'Market Builder', type: 'ENGINE', icon: Cpu, desc: 'Data and identity engine with taxonomy hygiene.' },
  { id: 'wrt', x: 550, y: 200, label: 'Market Writer', type: 'ENGINE', icon: MessageSquare, desc: 'Brief, belief, and angle conversion engine.' },
  { id: 'sfc', x: 850, y: 200, label: 'Market Surface', type: 'ENGINE', icon: Globe, desc: 'Satellite infra and ramp discipline.' },
  { id: 'sig', x: 1150, y: 200, label: 'Signal Engine', type: 'ENGINE', icon: Activity, desc: 'Primary and secondary signal measurement core.' },
  { id: 'icp', x: 200, y: 400, label: 'ICP Identity', type: 'DATA', icon: Target, desc: 'Immutable segmentation dimensions.' },
  { id: 'brf', x: 450, y: 400, label: 'Immutable Brief', type: 'DATA', icon: FileText, desc: 'Champion-vs-challenger hypothesis container.' },
  { id: 'bel', x: 650, y: 400, label: 'Atomic Belief', type: 'DATA', icon: FlaskConical, desc: 'Unit of testing and angle linkage.' },
  { id: 'sat', x: 850, y: 400, label: 'Identity Satellite', type: 'DATA', icon: Server, desc: '3,000 sends/day cap per satellite.' },
  { id: 'gat', x: 1150, y: 400, label: 'Hybrid Gate', type: 'RULE', icon: Lock, desc: 'Five-condition gate before promotion.' },
  { id: 'pro', x: 550, y: 600, label: 'Promo Ladder', type: 'RULE', icon: TrendingUp, desc: 'HYP -> TEST -> SW -> IW -> RW -> GW progression.' },
  { id: 'rev', x: 1150, y: 600, label: 'Rev-Share Econ', type: 'ECON', icon: Scale, desc: 'Meeting -> Opportunity -> Revenue mapping.' },
];

const TREE_LINKS = [
  { from: 'gov', to: 'wrk' }, { from: 'wrk', to: 'tsp' }, { from: 'gov', to: 'wrt' }, { from: 'wrk', to: 'sfc' },
  { from: 'bld', to: 'icp' }, { from: 'wrt', to: 'brf' }, { from: 'brf', to: 'bel' }, { from: 'sfc', to: 'sat' },
  { from: 'sat', to: 'sig' }, { from: 'sig', to: 'gat' }, { from: 'bel', to: 'pro' }, { from: 'gat', to: 'pro' },
  { from: 'gat', to: 'rev' },
];

const callGemini = async (prompt: string, systemInstruction = '') => {
  const apiKey = '';
  if (!apiKey) return 'Gemini API key not configured in this page.';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
  };
  const fetchWithRetry = async (retries = 5, delay = 1000): Promise<string> => {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('API Error');
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response.';
    } catch (error) {
      if (retries === 0) throw error;
      await new Promise((r) => setTimeout(r, delay));
      return fetchWithRetry(retries - 1, delay * 2);
    }
  };
  return fetchWithRetry();
};

const useAudio = (isMuted: boolean) => {
  const audioCtx = useRef<AudioContext | null>(null);
  const playSfx = (type: 'hover' | 'click' | 'toggle') => {
    if (isMuted) return;
    try {
      if (!audioCtx.current) {
        audioCtx.current = new (window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
      }
      if (audioCtx.current.state === 'suspended') {
        void audioCtx.current.resume();
      }
      const osc = audioCtx.current.createOscillator();
      const gain = audioCtx.current.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.current.destination);
      if (type === 'hover') {
        osc.frequency.setValueAtTime(120, audioCtx.current.currentTime);
        gain.gain.setValueAtTime(0.01, audioCtx.current.currentTime);
        osc.start();
        osc.stop(audioCtx.current.currentTime + 0.05);
      } else {
        osc.frequency.setValueAtTime(60, audioCtx.current.currentTime);
        gain.gain.setValueAtTime(type === 'toggle' ? 0.02 : 0.03, audioCtx.current.currentTime);
        osc.start();
        osc.stop(audioCtx.current.currentTime + 0.1);
      }
    } catch {
      // ignore audio errors
    }
  };
  return playSfx;
};

type TabId = 'workflow' | 'tree' | 'gemini' | 'angles' | 'dashboards' | 'specs' | 'mastery';
type NodeType = 'CORE' | 'ENGINE' | 'DATA' | 'RULE' | 'ECON';

const MASTERY_AGENTS = [
  { id: 'contact', name: 'Contact Decision', controlPoint: 'Contact vs Suppress', task: 'Decide whether a person should be contacted now, delayed, or suppressed.', standard: 'Maximize real conversation probability while minimizing wasted sends.', writes: 'Local KB', icon: Target, phase: 1, inputs: ['ICP fit score', 'Identity confidence', 'Behavioral signals', 'Prior engagement', 'Delivery capacity', 'Compliance constraints'], outputs: ['Contact now', 'Delay', 'Suppress', 'Confidence score', 'Reason codes'], feedback: ['Reply rate', 'Positive reply rate', 'Meeting-booked rate', 'Bounce rate', 'Wrong-person rate'] },
  { id: 'timing', name: 'Timing Window', controlPoint: 'When to Outreach', task: 'Determine when outreach should occur for a qualified person.', standard: 'Maximize conversation likelihood through timing precision, not volume.', writes: 'Local KB + Candidate', icon: Activity, phase: 1, inputs: ['Behavioral signals', 'Signal recency', 'Buying-cycle indicators', 'Historical timing', 'Delivery capacity', 'Role classification'], outputs: ['Send now', 'Delay until window', 'Re-evaluate', 'Confidence score'], feedback: ['Reply rate by timing cohort', 'Meeting-booked rate by timing', 'No-response decay curves'] },
  { id: 'angle', name: 'Angle Selection', controlPoint: 'Which Belief Angle', task: 'Select the best angle for this buyer at this stage in this context.', standard: 'Maximize booked-call movement by angle.', writes: 'Local KB + Candidate', icon: MessageSquare, phase: 1, inputs: ['Role classification', 'Buyer stage', 'ICP context', 'Objection patterns', 'Local angle performance', 'Global angle priors'], outputs: ['Selected angle', 'Ranked backups', 'Confidence score', 'Rationale'], feedback: ['Positive reply rate by angle', 'Meeting-booked rate by angle', 'Objection frequency', 'Angle fatigue'] },
  { id: 'pacing', name: 'Send Pacing', controlPoint: 'Delivery Speed', task: 'Control rollout speed to protect inboxing, reputation, and economics.', standard: 'Preserve earned capacity while allowing sufficient learning throughput.', writes: 'Local KB + Candidate (structural)', icon: Gauge, phase: 1, inputs: ['Current send volume', 'Domain health', 'Inbox placement', 'Complaint rate', 'Warm-up state', 'Cohort mix'], outputs: ['Throttle / Hold / Continue / Expand', 'Confidence score', 'Risk codes'], feedback: ['Inbox placement', 'Complaint rate', 'Bounce rate', 'Domain health trend', 'Recovery time'] },
  { id: 'reply', name: 'Reply Meaning', controlPoint: 'Response Interpretation', task: 'Classify replies: positive intent, objections, wrong-person, meeting intent.', standard: 'Maximize classification accuracy for downstream learning and routing.', writes: 'Local KB + Candidate', icon: MessageSquare, phase: 1, inputs: ['Raw reply text', 'Sequence context', 'Buyer stage', 'Role classification', 'Local objection taxonomy'], outputs: ['Reply class', 'Positive intent flag', 'Objection class', 'Meeting intent flag', 'Confidence'], feedback: ['Human validation rate', 'Meeting-booked after positive', 'Objection resolution success'] },
  { id: 'role', name: 'Buying Role', controlPoint: 'Persona Classification', task: 'Determine likely buying role and route downstream logic.', standard: 'Maximize role-message fit and reduce wasted threading.', writes: 'Local KB', icon: Fingerprint, phase: 2, inputs: ['Title normalization', 'Department', 'Seniority signals', 'Company context', 'Interaction history'], outputs: ['Role classification', 'Confidence', 'Uncertainty flag'], feedback: ['Reply sentiment by role', 'Meeting-booked by role', 'Wrong-thread rate'] },
  { id: 'stage', name: 'Buyer Stage', controlPoint: 'Journey Classification', task: 'Determine current buyer stage and next required conclusion.', standard: 'Maximize stage progression and decision movement.', writes: 'Local KB + Candidate', icon: TrendingUp, phase: 2, inputs: ['Behavioral signals', 'Interaction history', 'Reply content', 'Click behavior', 'Role classification'], outputs: ['Current stage', 'Next conclusion', 'Confidence', 'Rationale'], feedback: ['Progression rate', 'Reply quality by stage', 'Meeting conversion by stage'] },
  { id: 'uncertainty', name: 'Uncertainty Resolution', controlPoint: 'What to Address Next', task: 'Determine which buyer uncertainty must be resolved to move forward.', standard: 'Maximize decision progression and reduce objection drag.', writes: 'Local KB + Candidate', icon: Lightbulb, phase: 2, inputs: ['Buyer stage', 'Role', 'Prior messaging', 'Known objections', 'Click/reply behavior'], outputs: ['Selected uncertainty', 'Reason code', 'Confidence', 'Proof type'], feedback: ['Reply quality after resolution', 'Objection reduction', 'Meeting-booked rate'] },
  { id: 'sequence', name: 'Sequence Progression', controlPoint: 'Message Order', task: 'Decide what message comes next to progress one conclusion at a time.', standard: 'Maximize stepwise progression while maintaining coherence.', writes: 'Local KB + Candidate', icon: GitGraph, phase: 2, inputs: ['Buyer stage', 'Selected angle', 'Uncertainty target', 'Sequence history', 'Silence pattern'], outputs: ['Next step', 'Branch decision', 'Delay recommendation', 'Confidence'], feedback: ['Reply rate by step', 'Stage progression by order', 'Sequence drop-off points'] },
];

const KNOWLEDGE_SCOPES = [
  { scope: 'LOCAL', label: 'Local KB', desc: 'Per partner. Highest authority for execution. Fast learning.', color: 'success', examples: ['ICP fit refinements', 'Angle performance', 'Timing windows', 'Objection patterns', 'Delivery thresholds'] },
  { scope: 'CANDIDATE', label: 'Candidate Global', desc: 'Under review. Not authoritative. Flagged for network analysis.', color: 'warning', examples: ['Repeated angle lift across partners', 'Recurring objection classes', 'Timing heuristics appearing in multiple roles'] },
  { scope: 'GLOBAL', label: 'Global KB', desc: 'Validated structural truths. Advisory priors only. Local overrides.', color: 'info', examples: ['Angle families that generalize', 'Stage progression patterns', 'Structural sequence principles', 'Delivery protection heuristics'] },
];

const GOVERNANCE_STATES = [
  { state: 'Local Active', next: 'Candidate for Review', trigger: 'Pattern detected across multiple environments' },
  { state: 'Candidate for Review', next: 'Under Review', trigger: 'Submitted to network learning layer' },
  { state: 'Under Review', next: 'Approved / Rejected', trigger: 'Evidence meets promotion requirements' },
  { state: 'Global Active', next: 'Weakened / Suspended', trigger: 'Performance degrades or conflicts appear' },
  { state: 'Revalidation', next: 'Confirmed / Retired', trigger: 'Scheduled revalidation cycle completes' },
  { state: 'Rollback', next: 'Prior Trusted State', trigger: 'Material harm or false winner detected' },
];

const LEARNING_PHASES = [
  { phase: 'P1', title: 'Core Infrastructure', desc: 'Knowledge Object Model, storage layers, resolution engine, event system, partner isolation.', status: 'FOUNDATION' },
  { phase: 'P2', title: 'Data & Event Pipeline', desc: 'Capture send, reply, click, meeting, objection, delivery events as structured evidence.', status: 'EVIDENCE' },
  { phase: 'P3', title: 'Decision Logging', desc: 'Log every agent decision with inputs, knowledge used, confidence, and outcomes.', status: 'AUDIT' },
  { phase: 'P4', title: 'First 5 Agents', desc: 'Contact, Timing, Angle, Pacing, Reply — highest-leverage control points.', status: 'EXECUTION' },
  { phase: 'P5', title: 'Local Learning', desc: 'Agents write validated patterns to partner-specific Local KB.', status: 'LEARNING' },
  { phase: 'P6', title: 'Candidate Detection', desc: 'Network layer detects repeated patterns across partner environments.', status: 'NETWORK' },
  { phase: 'P7', title: 'Governance & Promotion', desc: 'Only validated structural truths promoted. Cross-partner evidence required.', status: 'GOVERNANCE' },
  { phase: 'P8', title: 'Global Prior Layer', desc: 'New partners inherit structural priors. Local still overrides.', status: 'COMPOUNDING' },
  { phase: 'P9', title: 'Full Agent Stack', desc: 'Add remaining 4 agents: Role, Stage, Uncertainty, Sequence.', status: 'SCALE' },
  { phase: 'P10', title: 'Network Effect', desc: 'More partners → more signal → better priors → better performance → more partners.', status: 'MOAT' },
];

const NODE_COLORS: Record<NodeType, { border: string; badge: string; line: string; glow: string; panel: string }> = {
  CORE: { border: 'border-border dark:border-borderHover', badge: 'border-border bg-success-muted text-success dark:border-border dark:bg-surfaceElevated dark:text-success', line: 'var(--color-success)', glow: 'shadow-[0_0_42px_rgba(var(--color-success-rgb),0.12)] dark:shadow-[0_0_42px_rgba(var(--color-success-rgb),0.18)]', panel: 'from-success/5 via-success/2 to-transparent dark:from-success/14 dark:via-success/7 dark:to-transparent' },
  ENGINE: { border: 'border-border dark:border-borderHover', badge: 'border-border bg-info-muted text-info dark:border-border dark:bg-surfaceElevated dark:text-info', line: 'var(--color-info)', glow: 'shadow-[0_0_42px_rgba(var(--color-info-rgb),0.12)] dark:shadow-[0_0_42px_rgba(var(--color-info-rgb),0.18)]', panel: 'from-info/5 via-info/2 to-transparent dark:from-info/14 dark:via-info/7 dark:to-transparent' },
  DATA: { border: 'border-accent/30 dark:border-accent/55', badge: 'border-accent/20 bg-accent/10 text-accent dark:border-accent/30 dark:bg-accent/12 dark:text-accent', line: 'var(--color-accent)', glow: 'shadow-[0_0_42px_rgba(var(--color-accent-rgb),0.12)] dark:shadow-[0_0_42px_rgba(var(--color-accent-rgb),0.18)]', panel: 'from-accent/5 via-accent/2 to-transparent dark:from-accent/14 dark:via-accent/7 dark:to-transparent' },
  RULE: { border: 'border-border dark:border-borderHover', badge: 'border-border bg-warning-muted text-warning dark:border-border dark:bg-surfaceElevated dark:text-warning', line: 'var(--color-warning)', glow: 'shadow-[0_0_42px_rgba(var(--color-warning-rgb),0.12)] dark:shadow-[0_0_42px_rgba(var(--color-warning-rgb),0.18)]', panel: 'from-warning/5 via-warning/2 to-transparent dark:from-warning/14 dark:via-warning/7 dark:to-transparent' },
  ECON: { border: 'border-border dark:border-borderHover', badge: 'border-border bg-error-muted text-error dark:border-border dark:bg-surfaceElevated dark:text-error', line: 'var(--color-error)', glow: 'shadow-[0_0_42px_rgba(var(--color-error-rgb),0.12)] dark:shadow-[0_0_42px_rgba(var(--color-error-rgb),0.18)]', panel: 'from-error/5 via-error/2 to-transparent dark:from-error/14 dark:via-error/7 dark:to-transparent' },
};

const TREE_MAX_X = 1150;
const TREE_MAX_Y = 600;
const TREE_CANVAS_WIDTH = 1060;
const TREE_CANVAS_HEIGHT = 700;
const TREE_TOP_OFFSET = 34;

const treeLayers = [
  { id: 'layer-core', label: 'Core Layer', nodes: TREE_NODES.filter((node) => node.y === 0) },
  { id: 'layer-engine', label: 'Execution Engines', nodes: TREE_NODES.filter((node) => node.y === 200) },
  { id: 'layer-data', label: 'Data + Rule Fabric', nodes: TREE_NODES.filter((node) => node.y === 400) },
  { id: 'layer-econ', label: 'Promotion + Economics', nodes: TREE_NODES.filter((node) => node.y === 600) },
];

function getNodeMeta(node: (typeof TREE_NODES)[number]) {
  if (node.y === 0) {
    return { width: 196, height: 98, iconSize: 14, title: 'text-[10px]', badge: 'text-[8px]' };
  }
  if (node.y === 200) {
    return { width: 174, height: 88, iconSize: 13, title: 'text-[10px]', badge: 'text-[8px]' };
  }
  if (node.y === 400) {
    return { width: 156, height: 80, iconSize: 12, title: 'text-[9px]', badge: 'text-[8px]' };
  }
  return { width: 148, height: 74, iconSize: 12, title: 'text-[9px]', badge: 'text-[8px]' };
}

function getNodeCenter(nodeId: string, nodePositions: Record<string, { x: number; y: number }>) {
  const graphNode = TREE_NODES.find((node) => node.id === nodeId)!;
  const meta = getNodeMeta(graphNode);
  const node = nodePositions[nodeId];
  return { x: node.x + meta.width / 2, y: node.y + meta.height / 2 + TREE_TOP_OFFSET };
}

function getNodeStyle(nodeId: string, nodePositions: Record<string, { x: number; y: number }>) {
  const node = nodePositions[nodeId];
  return { left: `${node.x}px`, top: `${node.y + TREE_TOP_OFFSET}px` };
}

export default function MarketXOsPage() {
  const { mode, toggleMode } = useTheme();
  const dragIntentRef = useRef<Record<string, boolean>>({});
  const [isMuted, setIsMuted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('workflow');
  const [selectedPhase, setSelectedPhase] = useState(PHASES[0]);
  const [selectedAngle, setSelectedAngle] = useState(ANGLES[0]);
  const [selectedTreeNode, setSelectedTreeNode] = useState(TREE_NODES[0]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiOutput, setAiOutput] = useState('');
  const [aiInput, setAiInput] = useState('');
  const [treeModalOpen, setTreeModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(MASTERY_AGENTS[0]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [tabDirection, setTabDirection] = useState(1);
  const [nodePositions, setNodePositions] = useState(
    TREE_NODES.reduce((acc, node) => {
      const meta = getNodeMeta(node);
      const normalizedX = (node.x - 200) / (TREE_MAX_X - 200);
      const paddedWidth = TREE_CANVAS_WIDTH - meta.width - 56;
      const rowY =
        node.y === 0 ? 18 :
        node.y === 200 ? 182 :
        node.y === 400 ? 356 :
        560;
      acc[node.id] = {
        x: 28 + normalizedX * paddedWidth,
        y: rowY,
      };
      return acc;
    }, {} as Record<string, { x: number; y: number }>),
  );
  const playSfx = useAudio(isMuted);
  const theme: 'dark' | 'light' = mode === 'night' ? 'dark' : 'light';

  const navItems = [
    { id: 'workflow' as const, label: 'Workflow', short: 'WF', Icon: Zap },
    { id: 'tree' as const, label: 'System Tree', short: 'Tree', Icon: GitGraph },
    { id: 'gemini' as const, label: 'Gemini AI', short: 'AI', Icon: BrainCircuit },
    { id: 'angles' as const, label: 'Angles', short: 'Angles', Icon: MessageSquare },
    { id: 'dashboards' as const, label: 'Measurement', short: 'Metrics', Icon: BarChart3 },
    { id: 'mastery' as const, label: 'Mastery Agents', short: 'Agents', Icon: Shield },
    { id: 'specs' as const, label: 'Specs', short: 'Specs', Icon: Database },
  ];

  const activeTabMeta = navItems.find((item) => item.id === activeTab) ?? navItems[0];
  const currentLayer = treeLayers.find((layer) => layer.nodes.some((node) => node.id === selectedTreeNode.id)) ?? treeLayers[0];
  const selectedTreeLinks = useMemo(
    () => TREE_LINKS.filter((link) => link.from === selectedTreeNode.id || link.to === selectedTreeNode.id),
    [selectedTreeNode],
  );

  const colors = useMemo(
    () =>
      theme === 'dark'
        ? {
            bg: 'bg-background',
            panel: 'bg-surface/60',
            panelSoft: 'bg-surface/35',
            border: 'border-border/80',
            borderStrong: 'border-border',
            heading: 'text-textPrimary',
            text: 'text-textSecondary',
            textMuted: 'text-textSecondary',
            footer: 'bg-background/95',
            spotlight: 'from-success/14 via-transparent to-info/12',
          }
        : {
            bg: 'bg-background',
            panel: 'bg-surface',
            panelSoft: 'bg-background',
            border: 'border-border',
            borderStrong: 'border-border',
            heading: 'text-textPrimary',
            text: 'text-textPrimary',
            textMuted: 'text-textSecondary',
            footer: 'bg-surface',
            spotlight: 'from-success/10 via-transparent to-info/10',
          },
    [theme],
  );

  const particleDots = useMemo(
    () => Array.from({ length: 28 }, (_, index) => ({
      id: index,
      left: `${(index * 13) % 100}%`,
      top: `${(index * 19) % 100}%`,
      size: index % 3 === 0 ? 3 : 2,
      delay: index * 0.15,
    })),
    [],
  );

  const changeTab = (nextTab: TabId) => {
    const currentIndex = navItems.findIndex((item) => item.id === activeTab);
    const nextIndex = navItems.findIndex((item) => item.id === nextTab);
    setTabDirection(nextIndex >= currentIndex ? 1 : -1);
    setActiveTab(nextTab);
    setMobileMenuOpen(false);
    playSfx('click');
  };

  const openTreeNode = (node: (typeof TREE_NODES)[number]) => {
    setSelectedTreeNode(node);
    setTreeModalOpen(true);
    playSfx('click');
  };

  const aiAction = async (type: 'brief' | 'reply' | 'angle', angle = '') => {
    if (!aiInput && type !== 'angle') return;
    setAiLoading(true);
    playSfx('click');
    let prompt = '';
    const system = 'You are Zara, the intelligence core of Market Maker OS.';
    if (type === 'brief') prompt = `Draft a rigorous MarketWriter Brief for: ${aiInput}. Define ICP, movement, and Champ/Chal hypothesis.`;
    else if (type === 'reply') prompt = `Analyze this prospect reply string according to Signal Hierarchy: ${aiInput}.`;
    else prompt = `Draft a belief-shifting email using '${angle}' based on: ${aiInput || 'B2B service'}.`;
    try {
      const result = await callGemini(prompt, system);
      setAiOutput(result);
    } catch {
      setAiOutput('Unable to get AI response right now.');
    } finally {
      setAiLoading(false);
    }
  };

  const renderSidebarContent = () => {
    if (activeTab === 'workflow') {
      return (
        <motion.div key='sidebar-workflow' initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className='space-y-4'>
          <div className='flex items-center justify-between'>
            <h2 className='text-[11px] font-black uppercase tracking-[0.35em] opacity-50 flex items-center gap-3'>
              <Workflow size={16} /> Operational Spine
            </h2>
            <span className='text-[10px] uppercase tracking-[0.2em] text-success/80'>9 Phases</span>
          </div>
          {PHASES.map((phase, index) => (
            <motion.button
              key={phase.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04, type: 'spring', stiffness: 180, damping: 18 }}
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                setSelectedPhase(phase);
                playSfx('click');
              }}
              className={`w-full text-left rounded-[1.75rem] border p-5 transition-all ${selectedPhase.id === phase.id ? 'border-borderHover bg-success-muted shadow-[0_0_40px_rgba(var(--color-success-rgb),0.12)]' : `${colors.border} ${colors.panelSoft} hover:border-border`}`}
            >
              <div className='mb-3 flex items-center justify-between gap-3'>
                <span className={`text-[10px] font-black uppercase tracking-[0.28em] ${selectedPhase.id === phase.id ? 'text-success' : colors.textMuted}`}>{phase.engine}</span>
                <span className='text-[10px] font-mono opacity-40'>{phase.id}</span>
              </div>
              <div className='flex items-start justify-between gap-4'>
                <div>
                  <h3 className={`text-base font-black ${colors.heading}`}>{phase.title}</h3>
                  <p className='mt-2 text-sm leading-relaxed opacity-70'>{phase.status}</p>
                  <p className='mt-3 text-xs leading-relaxed opacity-60'>
                    {phase.additions[0]}
                  </p>
                </div>
                <ChevronRight className={`mt-1 h-4 w-4 transition-transform ${selectedPhase.id === phase.id ? 'translate-x-1 text-success' : colors.textMuted}`} />
              </div>
            </motion.button>
          ))}
        </motion.div>
      );
    }
    if (activeTab === 'angles') {
      return (
        <motion.div key='sidebar-angles' initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className='space-y-6'>
          <h2 className='text-xs font-black uppercase tracking-[0.4em] mb-8 opacity-40 flex items-center gap-3'>
            <FlaskConical size={18} /> Belief Vectors
          </h2>
          {ANGLES.map((angle, index) => (
            <motion.div
              key={angle.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              whileHover={{ scale: 1.02, x: 10 }}
              onClick={() => {
                setSelectedAngle(angle);
                playSfx('click');
              }}
              className={`p-8 rounded-[2.5rem] border-2 cursor-pointer transition-all ${
                selectedAngle.id === angle.id
                  ? 'bg-success-muted border-success shadow-xl'
                  : `${colors.border} bg-surfaceHover/5 hover:border-borderHover`
              }`}
            >
              <h4 className='text-[10px] font-black text-success uppercase mb-3 tracking-[0.3em]'>
                {angle.name}
              </h4>
              <p className='text-xl font-black leading-tight mb-4 opacity-90'>
                {angle.concept}
              </p>
              <div className='text-[9px] font-mono opacity-30 uppercase tracking-widest flex items-center gap-2'>
                <Fingerprint size={12} /> VECTOR_0{index + 1}
              </div>
            </motion.div>
          ))}
        </motion.div>
      );
    }

    if (activeTab === 'mastery') {
      return (
        <motion.div key='sidebar-mastery' initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className='space-y-4'>
          <div className='flex items-center justify-between'>
            <h2 className='text-[11px] font-black uppercase tracking-[0.35em] opacity-50 flex items-center gap-3'><Shield size={16} /> Agent Stack</h2>
            <span className='text-[10px] uppercase tracking-[0.2em] text-accent/80'>9 Agents</span>
          </div>
          {MASTERY_AGENTS.map((agent, index) => (
            <motion.button
              key={agent.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.035, type: 'spring', stiffness: 200, damping: 20 }}
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => { setSelectedAgent(agent); playSfx('click'); }}
              className={`w-full text-left rounded-[1.75rem] border p-4 transition-all ${selectedAgent.id === agent.id ? 'border-accent/60 bg-accent/8 shadow-[0_0_40px_rgba(var(--color-accent-rgb),0.12)]' : `${colors.border} ${colors.panelSoft} hover:border-border`}`}
            >
              <div className='mb-2 flex items-center justify-between gap-3'>
                <span className={`text-[10px] font-black uppercase tracking-[0.28em] ${selectedAgent.id === agent.id ? 'text-accent' : colors.textMuted}`}>{agent.controlPoint}</span>
                <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full ${agent.phase === 1 ? 'bg-success-muted text-success' : 'bg-info-muted text-info'}`}>Phase {agent.phase}</span>
              </div>
              <div className='flex items-start justify-between gap-3'>
                <div>
                  <h3 className={`text-sm font-black ${colors.heading}`}>{agent.name}</h3>
                  <p className='mt-1.5 text-xs leading-relaxed opacity-60 line-clamp-2'>{agent.task}</p>
                </div>
                <ChevronRight className={`mt-1 h-4 w-4 flex-shrink-0 transition-transform ${selectedAgent.id === agent.id ? 'translate-x-1 text-accent' : colors.textMuted}`} />
              </div>
            </motion.button>
          ))}
        </motion.div>
      );
    }

    return (
      <motion.div key='sidebar-generic' initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className='space-y-4'>
        <div className={`rounded-[1.75rem] border ${colors.border} ${colors.panelSoft} p-5`}>
          <div className='mb-3 flex items-center gap-3 text-success'>
            {activeTab === 'tree' && <Anchor size={16} />}
            {activeTab === 'gemini' && <Sparkles size={16} />}
            {activeTab === 'dashboards' && <LayoutList size={16} />}
            {activeTab === 'specs' && <DatabaseZap size={16} />}
            <span className='text-[10px] font-black uppercase tracking-[0.35em]'>{activeTabMeta.label}</span>
          </div>
          <p className='text-sm leading-relaxed opacity-75'>
            {activeTab === 'tree' && 'Desktop view keeps the graph interactive and draggable. Mobile turns the same graph into expandable system cards.'}
            {activeTab === 'gemini' && 'Zara uses Gemini to architect briefs, classify replies, and synthesize operating model output.'}
            {activeTab === 'dashboards' && 'Measurement law, gating, signal hierarchy, and the promotion ladder all remain intact.'}
            {activeTab === 'specs' && 'Every schema card is still present, now with stronger layout hierarchy and better hover feedback.'}
          </p>
        </div>
        {activeTab === 'tree' && (
          <div className='space-y-3'>
            {treeLayers.map((layer) => (
              <div key={layer.id} className={`rounded-[1.5rem] border ${colors.border} ${colors.panelSoft} p-4`}>
                <div className='mb-2 flex items-center justify-between gap-3'>
                  <span className='text-xs font-black uppercase tracking-[0.22em] text-success'>{layer.label}</span>
                  <span className='text-[10px] uppercase tracking-[0.2em] opacity-45'>{layer.nodes.length} nodes</span>
                </div>
                <div className='flex flex-wrap gap-2'>
                  {layer.nodes.map((node) => {
                    const tone = NODE_COLORS[node.type as NodeType];
                    return (
                      <button
                        key={node.id}
                        onClick={() => {
                          openTreeNode(node);
                        }}
                        className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${selectedTreeNode.id === node.id ? tone.badge : `${colors.border} ${colors.textMuted} hover:border-border hover:text-textPrimary`}`}
                      >
                        {node.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    );
  };

  const renderWorkflowView = () => (
    <motion.div key={selectedPhase.id} initial={{ opacity: 0, x: tabDirection * 32 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: tabDirection * -24 }} className='mx-auto max-w-5xl space-y-8 lg:space-y-10'>
      <div className='space-y-5'>
        <div className='inline-flex items-center gap-3 rounded-full border border-border bg-success-muted px-4 py-2 text-[10px] font-black uppercase tracking-[0.35em] text-success'>
          <Activity size={14} /> {selectedPhase.status}
        </div>
        <div className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
          <div>
            <h2 className={`text-3xl sm:text-[2rem] font-black uppercase tracking-tight sm:text-[2.5rem] lg:text-[4.25rem] ${colors.heading}`}>{selectedPhase.title}</h2>
            <p className='mt-3 text-sm uppercase tracking-[0.34em] text-success/80'>{selectedPhase.engine}</p>
          </div>
          <div className={`rounded-[var(--radius-xl)] border ${colors.border} ${colors.panelSoft} px-5 py-4 text-sm leading-relaxed ${colors.textMuted} lg:max-w-xs`}>
            Phase {selectedPhase.id.replace('p', '')} controls one non-negotiable transition in the operating model.
          </div>
        </div>
      </div>
      <motion.div whileHover={{ y: -3, scale: 1.01 }} className={`rounded-[2rem] border ${colors.borderStrong} bg-gradient-to-br ${colors.spotlight} ${colors.panel} p-6 shadow-[0_30px_80px_rgba(var(--color-background-rgb),0.25)] backdrop-blur-xl sm:p-8 lg:p-12`}>
        <p className='text-[0.98rem] font-semibold leading-relaxed opacity-90 sm:text-[1.15rem] lg:text-[1.7rem]'>{selectedPhase.content}</p>
      </motion.div>
      <div className='grid gap-6 lg:grid-cols-[1.4fr_0.9fr]'>
        <motion.div whileHover={{ y: -2, scale: 1.01 }} className={`rounded-[2rem] border ${colors.borderStrong} ${colors.panel} p-6 shadow-2xl sm:p-8 lg:p-10`}>
          <div className='mb-5 flex items-center gap-4 text-success'>
            <CheckCircle2 size={28} />
            <h4 className='text-lg font-black uppercase tracking-[0.24em] opacity-90'>Exit Criteria</h4>
          </div>
          <p className={`text-xl font-bold leading-relaxed sm:text-2xl lg:text-3xl ${colors.heading}`}>{selectedPhase.exit}</p>
        </motion.div>
        <motion.div whileHover={{ y: -2, scale: 1.01 }} className='rounded-[2rem] border border-border bg-success-muted p-6 sm:p-8'>
          <p className='mb-3 text-[10px] font-black uppercase tracking-[0.34em] text-success'>Phase Signal</p>
          <p className='text-sm leading-relaxed opacity-75 sm:text-base'>Each gate exists to stop premature scaling and protect belief integrity, deliverability, and economics.</p>
        </motion.div>
      </div>

      <div className='grid gap-6 lg:grid-cols-2'>
        <motion.div whileHover={{ y: -2, scale: 1.01 }} className={`rounded-[2rem] border ${colors.borderStrong} ${colors.panelSoft} p-6 sm:p-8`}>
          <h4 className='mb-4 text-[10px] font-black uppercase tracking-[0.34em] text-success'>Operational Additions</h4>
          <div className='space-y-4'>
            {selectedPhase.additions.map((addition) => (
              <div key={addition} className='flex items-start gap-3'>
                <div className='mt-1 h-2 w-2 rounded-full bg-success shadow-[0_0_8px_rgba(var(--color-success-rgb),0.8)]' />
                <p className='text-sm leading-relaxed opacity-80 sm:text-base'>{addition}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -2, scale: 1.01 }} className='rounded-[2rem] border border-border bg-warning-muted p-6 sm:p-8'>
          <h4 className='mb-4 text-[10px] font-black uppercase tracking-[0.34em] text-warning'>Guardrails</h4>
          <div className='space-y-4'>
            {selectedPhase.guardrails.map((guardrail) => (
              <div key={guardrail} className='flex items-start gap-3'>
                <div className='mt-1 h-2 w-2 rounded-full bg-warning shadow-[0_0_8px_rgba(var(--color-warning-rgb),0.7)]' />
                <p className='text-sm leading-relaxed opacity-85 sm:text-base'>{guardrail}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );

  const renderTreeView = () => (
    <motion.div key='tree-view' initial={{ opacity: 0, x: tabDirection * 32 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: tabDirection * -24 }} className='mx-auto max-w-[1420px] space-y-6 lg:space-y-8'>
      <div className='space-y-4'>
        <p className='inline-flex items-center gap-2 rounded-full border border-border bg-success-muted px-4 py-2 text-[10px] font-black uppercase tracking-[0.34em] text-success'>
          <GitGraph size={14} /> Structural Graph
        </p>
        <div className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
          <div>
            <h2 className={`text-3xl sm:text-[2rem] font-black tracking-tight sm:text-[2.4rem] lg:text-[4rem] ${colors.heading}`}>System Tree</h2>
            <p className={`mt-3 max-w-3xl text-base leading-relaxed ${colors.textMuted}`}>The full graph remains intact, but it now adapts elegantly across mobile, tablet, and desktop with stronger motion, stronger hierarchy, and better inspection flows.</p>
          </div>
          <div className={`rounded-[var(--radius-xl)] border ${colors.border} ${colors.panelSoft} p-4 text-right`}>
            <p className='text-[10px] font-black uppercase tracking-[0.3em] text-success'>Active Layer</p>
            <p className='mt-2 text-sm font-semibold'>{currentLayer.label}</p>
          </div>
        </div>
      </div>

      <div className='hidden xl:block'>
        <div className={`relative overflow-hidden rounded-[2rem] border ${colors.borderStrong} ${colors.panel} p-5 ${theme === 'dark' ? 'shadow-[0_32px_72px_rgba(var(--color-background-rgb),0.26)]' : 'shadow-[0_20px_60px_rgba(var(--color-background-rgb),0.08)]'}`}>
          <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-[radial-gradient(circle_at_top,rgba(var(--color-success-rgb),0.14),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(var(--color-info-rgb),0.14),transparent_32%)]' : 'bg-[radial-gradient(circle_at_top,rgba(var(--color-success-rgb),0.05),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(var(--color-info-rgb),0.05),transparent_40%)]'}`} />
          <div className='absolute inset-0 opacity-40'>
            {Array.from({ length: 24 }, (_, index) => (
              <motion.span
                key={`tree-particle-${index}`}
                className='absolute rounded-full bg-surfaceHover'
                style={{
                  left: `${(index * 11) % 100}%`,
                  top: `${(index * 17) % 100}%`,
                  width: index % 3 === 0 ? 3 : 2,
                  height: index % 3 === 0 ? 3 : 2,
                }}
                animate={{ y: [0, -10, 0], opacity: [0.18, 0.55, 0.18] }}
                transition={{ duration: 4.5 + index * 0.12, repeat: Infinity, ease: 'easeInOut', delay: index * 0.08 }}
              />
            ))}
          </div>
          <div className='absolute inset-x-6 top-5 flex items-center justify-between gap-2'>
            {treeLayers.map((layer) => (
              <div key={layer.id} className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.2em] backdrop-blur ${theme === 'dark' ? 'border-border/10 bg-background/20 text-textSecondary/80' : 'border-border bg-surface/60 text-textSecondary'}`}>
                {layer.label}
              </div>
            ))}
          </div>
          <div className='relative mt-8 h-[720px] overflow-hidden rounded-[1.65rem] border border-border/6 bg-[linear-gradient(180deg,rgba(var(--color-background-rgb),0.18),rgba(var(--color-surface-rgb),0.3))]'>
            <svg className='absolute inset-0 h-full w-full pointer-events-none'>
              {TREE_LINKS.map((link, index) => {
                const sourceNode = TREE_NODES.find((node) => node.id === link.from);
                const targetNode = TREE_NODES.find((node) => node.id === link.to);
                if (!sourceNode || !targetNode) return null;
                const source = getNodeCenter(link.from, nodePositions);
                const target = getNodeCenter(link.to, nodePositions);
                const sourceColor = NODE_COLORS[sourceNode.type as NodeType].line;
                const targetColor = NODE_COLORS[targetNode.type as NodeType].line;
                const midY = (source.y + target.y) / 2;
                const midX = (source.x + target.x) / 2;
                const path = `M ${source.x} ${source.y} C ${source.x} ${midY}, ${target.x} ${midY}, ${target.x} ${target.y}`;
                return (
                  <g key={`${link.from}-${link.to}-${index}`}>
                    <path d={path} stroke={sourceColor} strokeWidth='1.2' strokeOpacity={theme === 'dark' ? '0.18' : '0.35'} fill='none' />
                    <path d={path} stroke={targetColor} strokeWidth='4' strokeOpacity={theme === 'dark' ? '0.06' : '0.12'} fill='none' />
                    <motion.path
                      d={path}
                      stroke={targetColor}
                      strokeWidth='1.8'
                      strokeDasharray='8 12'
                      strokeLinecap='round'
                      strokeOpacity={selectedTreeNode.id === link.from || selectedTreeNode.id === link.to ? (theme === 'dark' ? 0.82 : 0.9) : (theme === 'dark' ? 0.42 : 0.5)}
                      fill='none'
                      animate={{ strokeDashoffset: [0, -48] }}
                      transition={{ duration: 2.8, repeat: Infinity, ease: 'linear', delay: index * 0.08 }}
                    />
                    <motion.circle
                      cx={midX}
                      cy={midY}
                      r='2.4'
                      fill={targetColor}
                      animate={{ opacity: [0.25, 0.9, 0.25], scale: [0.85, 1.15, 0.85] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: index * 0.08 }}
                    />
                  </g>
                );
              })}
            </svg>
            {TREE_NODES.map((node, index) => {
              const tone = NODE_COLORS[node.type as NodeType];
              const meta = getNodeMeta(node);
              const isSelected = selectedTreeNode.id === node.id;
              return (
                <motion.div
                  key={node.id}
                  drag
                  dragMomentum={false}
                  dragElastic={0.08}
                  initial={{ opacity: 0, scale: 0.82, y: 20 }}
                  animate={isSelected ? { opacity: 1, scale: [1, 1.018, 1], y: 0 } : { opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.55, scale: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } }}
                  whileHover={{ y: -6, scale: 1.025 }}
                  whileTap={{ scale: 0.97 }}
                  onPointerDown={() => {
                    dragIntentRef.current[node.id] = false;
                  }}
                  onDrag={(_event, info) => {
                    if (Math.abs(info.delta.x) > 0 || Math.abs(info.delta.y) > 0) {
                      dragIntentRef.current[node.id] = true;
                    }
                    setNodePositions((prev) => ({
                      ...prev,
                      [node.id]: {
                        x: Math.max(18, Math.min(TREE_CANVAS_WIDTH - meta.width - 18, prev[node.id].x + info.delta.x)),
                        y: Math.max(8, Math.min(TREE_CANVAS_HEIGHT - meta.height - 8, prev[node.id].y + info.delta.y)),
                      },
                    }));
                  }}
                  onDragEnd={() => {
                    window.setTimeout(() => {
                      dragIntentRef.current[node.id] = false;
                    }, 0);
                  }}
                  onClick={() => {
                    if (dragIntentRef.current[node.id]) return;
                    openTreeNode(node);
                  }}
                  className={`absolute z-10 cursor-pointer rounded-[1.2rem] border bg-gradient-to-br ${tone.panel} ${colors.panel} p-3 backdrop-blur-xl ${isSelected ? `${tone.border} ${tone.glow} ${theme === 'light' ? 'bg-surface' : ''}` : `${colors.border} ${theme === 'dark' ? 'hover:border-border' : 'hover:border-border'}`}`}
                  style={{ ...getNodeStyle(node.id, nodePositions), width: `${meta.width}px`, minHeight: `${meta.height}px` }}
                >
                  <div className='mb-3 flex items-start justify-between gap-3'>
                    <motion.div
                      whileHover={{ rotate: -4, scale: 1.06 }}
                      className={`rounded-xl border p-2.5 ${isSelected ? tone.badge : theme === 'dark' ? 'border-border/10 bg-surface/5 text-textSecondary' : 'border-border bg-surfaceHover text-textSecondary'}`}
                    >
                      {React.createElement(node.icon, { size: meta.iconSize })}
                    </motion.div>
                    <div className='h-2 w-2 rounded-full bg-info/80 shadow-[0_0_10px_rgba(var(--color-info-rgb),0.6)]' />
                  </div>
                  <div className='space-y-2'>
                    <span className={`inline-flex rounded-full border px-2 py-0.5 font-black uppercase tracking-[0.22em] ${meta.badge} ${tone.badge}`}>{node.type}</span>
                    <h3 className={`${meta.title} font-black uppercase tracking-[0.15em] ${colors.heading}`}>{node.label}</h3>
                    <p className={`text-[10px] leading-relaxed line-clamp-2 ${theme === 'dark' ? 'opacity-70' : 'text-textSecondary'}`}>{node.desc}</p>
                  </div>
                  <div className='mt-2.5 flex items-center justify-between text-[8px] uppercase tracking-[0.18em] opacity-45'>
                    <span>{node.id}</span>
                    <span>{isSelected ? 'Open' : 'Inspect'}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      <div className='space-y-4 xl:hidden'>
        {treeLayers.map((layer, index) => (
          <motion.div key={layer.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className={`rounded-[1.8rem] border ${colors.border} ${colors.panel} p-4 sm:p-5`}>
            <div className='mb-4 flex items-center justify-between gap-3'>
              <h3 className='text-sm font-black uppercase tracking-[0.24em] text-success'>{layer.label}</h3>
              <span className='text-[10px] uppercase tracking-[0.2em] opacity-45'>{layer.nodes.length} nodes</span>
            </div>
            <div className='space-y-3'>
              {layer.nodes.map((node) => {
                const tone = NODE_COLORS[node.type as NodeType];
                const isSelected = selectedTreeNode.id === node.id;
                return (
                  <motion.button
                    key={node.id}
                    whileHover={{ y: -2, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => openTreeNode(node)}
                    className={`w-full rounded-[1.35rem] border p-4 text-left transition-all ${isSelected ? `${tone.border} ${tone.glow} bg-surface/5` : `${colors.border} bg-background/5`}`}
                  >
                    <div className='mb-3 flex items-center justify-between gap-3'>
                      <div className='flex items-center gap-3'>
                        <div className={`rounded-xl border p-2.5 ${tone.badge}`}>
                          {React.createElement(node.icon, { size: 16 })}
                        </div>
                        <div>
                          <h4 className={`text-sm font-black uppercase tracking-[0.16em] ${colors.heading}`}>{node.label}</h4>
                          <p className='mt-1 text-[10px] uppercase tracking-[0.22em] opacity-45'>{node.id}</p>
                        </div>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${tone.badge}`}>{node.type}</span>
                    </div>
                    <AnimatePresence initial={false}>
                      {isSelected && (
                        <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className='overflow-hidden text-sm leading-relaxed opacity-75'>
                          {node.desc}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className={`rounded-[2rem] border ${NODE_COLORS[selectedTreeNode.type as NodeType].border} ${colors.panel} bg-gradient-to-br ${NODE_COLORS[selectedTreeNode.type as NodeType].panel} p-6 shadow-[0_30px_80px_rgba(var(--color-background-rgb),0.26)] sm:p-8 lg:p-10`}>
        <div className='mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
          <div className='flex items-start gap-4'>
            <div className={`rounded-[1.5rem] border p-4 ${NODE_COLORS[selectedTreeNode.type as NodeType].badge}`}>{React.createElement(selectedTreeNode.icon, { size: 28 })}</div>
            <div>
              <p className='mb-2 text-[10px] font-black uppercase tracking-[0.32em] text-success'>{currentLayer.label}</p>
              <h3 className={`text-lg font-black uppercase tracking-tight sm:text-2xl lg:text-[2.7rem] ${colors.heading}`}>{selectedTreeNode.label}</h3>
              <div className={`mt-3 inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] ${NODE_COLORS[selectedTreeNode.type as NodeType].badge}`}>{selectedTreeNode.type}</div>
            </div>
          </div>
          <div className={`rounded-[var(--radius-lg)] border ${colors.border} ${colors.panelSoft} px-4 py-3 text-sm ${colors.textMuted}`}>
            <div className='text-[10px] font-black uppercase tracking-[0.24em] opacity-45'>Selection Path</div>
            <div className='mt-2 font-semibold'>{activeTabMeta.label} / {selectedTreeNode.label}</div>
          </div>
        </div>
        <p className='text-base leading-relaxed opacity-80 sm:text-lg lg:text-2xl'>{selectedTreeNode.desc}</p>
      </motion.div>
    </motion.div>
  );

  const renderGeminiView = () => (
    <motion.div key='gemini-view' initial={{ opacity: 0, x: tabDirection * 32 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: tabDirection * -24 }} className='mx-auto flex max-w-7xl flex-col gap-6 lg:gap-8'>
      <div className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
        <div>
          <p className='mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-success-muted px-4 py-2 text-[10px] font-black uppercase tracking-[0.34em] text-success'>
            <Sparkles size={14} /> Gemini Copilot
          </p>
          <h2 className={`text-3xl sm:text-[2rem] font-black tracking-tight ${colors.heading} sm:text-[2.4rem] lg:text-[4rem]`}>Neural Cockpit</h2>
        </div>
        <div className={`rounded-[var(--radius-xl)] border ${colors.border} ${colors.panelSoft} px-5 py-4 text-sm ${colors.textMuted}`}>Prompt Zara with operational context, reply payloads, or belief-generation instructions.</div>
      </div>
      <div className='grid gap-6 xl:grid-cols-[0.95fr_1.25fr]'>
        <div className='space-y-6'>
          <motion.div whileHover={{ y: -2, scale: 1.01 }} className={`rounded-[2rem] border ${colors.borderStrong} ${colors.panel} p-5 sm:p-7`}>
            <textarea
              className={`min-h-[280px] w-full resize-none bg-transparent text-base outline-none sm:min-h-[340px] sm:text-lg ${colors.heading}`}
              placeholder='Feed system context...'
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
            />
            <div className='mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2'>
              <motion.button whileHover={{ y: -2, scale: 1.01 }} whileTap={{ scale: 0.97 }} onClick={() => aiAction('brief')} disabled={aiLoading} className='rounded-[var(--radius-lg)] bg-success px-4 py-4 text-xs font-black uppercase tracking-[0.22em] text-textInverse shadow-lg disabled:opacity-50'>
                <div className='flex items-center justify-center gap-2'>
                  <FileText size={16} /> Brief Architect
                </div>
              </motion.button>
              <motion.button whileHover={{ y: -2, scale: 1.01 }} whileTap={{ scale: 0.97 }} onClick={() => aiAction('reply')} disabled={aiLoading} className={`rounded-[var(--radius-lg)] border ${colors.border} bg-surface/70 px-4 py-4 text-xs font-black uppercase tracking-[0.22em] text-textInverse disabled:opacity-50`}>
                <div className='flex items-center justify-center gap-2'>
                  <Fingerprint size={16} /> Signal Classifier
                </div>
              </motion.button>
            </div>
          </motion.div>
          <motion.div whileHover={{ y: -2, scale: 1.01 }} className={`rounded-[2rem] border ${colors.borderStrong} ${colors.panelSoft} p-5 sm:p-7`}>
            <h4 className='mb-4 text-[10px] font-black uppercase tracking-[0.34em] opacity-50'>Draft via Canonical Angles</h4>
            <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
              {ANGLES.map((angle) => (
                <motion.button key={angle.id} whileHover={{ y: -2, scale: 1.01 }} whileTap={{ scale: 0.97 }} onClick={() => aiAction('angle', angle.name)} className={`rounded-[var(--radius-lg)] border ${colors.border} px-4 py-4 text-left text-xs font-black uppercase tracking-[0.2em] transition-all hover:border-borderHover hover:bg-surface`}>
                  {angle.name}
                </motion.button>
              ))}
            </div>
          </motion.div>
        </div>
        <motion.div whileHover={{ y: -2, scale: 1.01 }} className={`relative overflow-hidden rounded-[2rem] border ${aiLoading ? 'border-borderHover' : colors.borderStrong} ${theme === 'dark' ? 'bg-background/55' : 'bg-background'} p-5 shadow-[0_30px_80px_rgba(var(--color-background-rgb),0.22)] sm:p-8`}>
          {aiLoading ? (
            <div className='space-y-4'>
              {Array.from({ length: 8 }, (_, index) => (
                <motion.div
                  key={index}
                  className='h-4 rounded-full bg-gradient-to-r from-transparent via-success/20 to-transparent'
                  animate={{ x: ['-30%', '30%'] }}
                  transition={{ duration: 1.3, repeat: Infinity, delay: index * 0.08, ease: 'easeInOut' }}
                />
              ))}
            </div>
          ) : (
            <div className={`min-h-[320px] whitespace-pre-wrap pr-2 font-mono text-sm leading-relaxed sm:min-h-[420px] sm:text-base ${theme === 'dark' ? 'text-success/92' : 'text-textPrimary'}`}>
              {aiOutput || (
                <div className='flex min-h-[320px] flex-col items-center justify-center gap-4 text-center opacity-25'>
                  <Sparkles size={72} />
                  <p className='text-xl font-black uppercase tracking-[0.18em]'>Awaiting Signal Input</p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );

  const renderAnglesView = () => (
    <motion.div key={selectedAngle.id} initial={{ opacity: 0, x: tabDirection * 32 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: tabDirection * -24 }} className='mx-auto max-w-5xl space-y-6 lg:space-y-8'>
      <div>
        <p className='mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-success-muted px-4 py-2 text-[10px] font-black uppercase tracking-[0.34em] text-success'>
          <Lightbulb size={14} /> BELIEF VECTOR: ACTIVE
        </p>
        <h2 className={`text-4xl font-black ${colors.heading} uppercase tracking-tighter sm:text-5xl lg:text-7xl`}>{selectedAngle.name}</h2>
        <p className='mt-5 text-xl font-semibold italic opacity-90 sm:text-3xl lg:text-4xl'>{selectedAngle.concept}</p>
      </div>
      <div className='grid gap-6 md:grid-cols-2'>
        <motion.div whileHover={{ y: -2, scale: 1.01 }} className={`p-6 sm:p-8 lg:p-12 rounded-[2rem] lg:rounded-[3.5rem] ${colors.panel} border-4 ${colors.border} shadow-3xl`}>
          <div className='mb-5 flex items-center gap-3 text-success'>
            <Beaker size={32} />
            <h4 className='text-lg font-black uppercase tracking-[0.3em] opacity-40'>Entry Point</h4>
          </div>
          <p className={`text-xl font-bold ${colors.heading} leading-snug`}>{selectedAngle.entryPoint}</p>
        </motion.div>
        <motion.div whileHover={{ y: -2, scale: 1.01 }} className='p-6 sm:p-8 lg:p-12 rounded-[2rem] lg:rounded-[3.5rem] bg-surface border-4 border-border'>
          <div className='mb-5 flex items-center gap-3 text-success'>
            <GitPullRequest size={32} />
            <h4 className='text-lg font-black uppercase tracking-[0.3em] opacity-40'>Usage</h4>
          </div>
          <p className={`text-xl font-bold ${colors.heading} leading-snug opacity-80`}>{selectedAngle.usage}</p>
        </motion.div>
      </div>
      <motion.div whileHover={{ y: -2, scale: 1.01 }} className={`p-6 sm:p-8 lg:p-12 rounded-[2rem] lg:rounded-[3.5rem] bg-surfaceHover/5 border-4 ${colors.border} shadow-3xl mb-12`}>
        <h4 className='text-xs font-black uppercase tracking-[0.4em] text-success mb-6'>DESCRIPTION</h4>
        <p className='text-2xl font-bold leading-relaxed opacity-90 italic'>{selectedAngle.description}</p>
      </motion.div>
      <div className='grid gap-6 md:grid-cols-2'>
        <motion.div whileHover={{ y: -2, scale: 1.01 }} className={`p-6 sm:p-8 lg:p-12 rounded-[2rem] lg:rounded-[3.5rem] ${colors.panel} border-4 ${colors.border} shadow-3xl`}>
          <h4 className='text-xs font-black uppercase tracking-[0.4em] text-success mb-6'>BRIEF BINDING</h4>
          <div className='space-y-4 text-lg font-bold opacity-90'>
            <p>Angle_Class ({selectedAngle.name})</p>
            <p>Current_Belief</p>
            <p>Desired_Shift</p>
            <p>Decision_Movement</p>
            <p>Champion / Challenger pairing</p>
          </div>
        </motion.div>
        <motion.div whileHover={{ y: -2, scale: 1.01 }} className='p-6 sm:p-8 lg:p-12 rounded-[2rem] lg:rounded-[3.5rem] bg-surface border-4 border-border'>
          <h4 className='text-xs font-black uppercase tracking-[0.4em] text-info mb-6'>TESTING DOCTRINE</h4>
          <div className='space-y-4 text-lg font-bold opacity-90'>
            <p>One belief per flow</p>
            <p>Two competing beliefs per ICP segment</p>
            <p>No belief mixing</p>
            <p>No 100% allocation</p>
            <p>Promotion only after durability</p>
          </div>
        </motion.div>
      </div>
      <motion.div whileHover={{ y: -2, scale: 1.01 }} className='p-6 sm:p-8 lg:p-12 rounded-[2rem] lg:rounded-[3.5rem] bg-surface border-4 border-border mb-20'>
        <div className='mb-5 flex items-center gap-3 text-warning'>
          <ShieldAlert size={32} />
          <h4 className='text-lg font-black uppercase tracking-[0.3em] opacity-40'>Resonance Signal</h4>
        </div>
        <p className='text-2xl font-black leading-snug'>{selectedAngle.signal}</p>
      </motion.div>
    </motion.div>
  );

  const renderDashboardsView = () => (
    <motion.div key='dashboards-view' initial={{ opacity: 0, x: tabDirection * 32 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: tabDirection * -24 }} className='mx-auto max-w-7xl space-y-10'>
      <div>
        <div className='mb-4 flex items-center gap-3 opacity-40'>
          <LayoutList size={20} />
          <span className='text-sm font-black uppercase tracking-[0.4em]'>Measurement Law</span>
        </div>
        <h2 className={`text-3xl sm:text-[2rem] font-black leading-[0.92] ${colors.heading} sm:text-[3rem] lg:text-[4.8rem]`}>Measurement<br />Law</h2>
      </div>
      <div className='grid gap-5 sm:grid-cols-2 xl:grid-cols-5'>
        {DASHBOARD_HIERARCHY.map((item, index) => (
          <motion.div key={item.layer} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }} whileHover={{ y: -3, scale: 1.01 }} className={`relative overflow-hidden rounded-[2rem] border ${colors.borderStrong} ${colors.panel} p-6 text-center shadow-2xl`}>
            <div className='absolute right-5 top-5 text-[10px] font-black uppercase tracking-[0.2em] text-success/45'>LAYER_{item.layer}</div>
            <h3 className={`mt-8 text-2xl font-black ${colors.heading}`}>{item.name}</h3>
            <p className='mt-2 text-xs uppercase tracking-[0.22em] opacity-45'>{item.focus}</p>
            <div className='mt-8 space-y-3 border-t border-border/8 pt-6 text-left'>
              {item.metrics.map((metric) => (
                <div key={metric} className='flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.16em] opacity-65'>
                  <div className='h-1.5 w-1.5 rounded-full bg-success' />
                  {metric}
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
      <div className='grid gap-8 lg:grid-cols-2'>
        <div className='space-y-5'>
          <div className='flex items-center gap-4'>
            <div className='rounded-[var(--radius-lg)] border border-border bg-success-muted p-4 text-success'>
              <Lock size={24} />
            </div>
            <h4 className='text-xl font-black uppercase tracking-[0.28em] text-success'>Hybrid Gating</h4>
          </div>
          <div className='space-y-4'>
            {GATING_RULES.map((rule, index) => (
              <motion.div key={rule} whileHover={{ y: -2, scale: 1.01 }} className='flex items-center gap-5 rounded-[2rem] border border-border bg-surfaceHover/5 p-5 sm:p-7'>
                <div className='text-3xl sm:text-[2rem] font-black opacity-10'>0{index + 1}</div>
                <CheckCircle2 className='shrink-0 text-success' size={28} />
                <div className='text-lg font-black leading-tight opacity-85 sm:text-2xl'>{rule}</div>
              </motion.div>
            ))}
          </div>
        </div>
        <div className='space-y-8'>
          <div>
            <div className='mb-5 flex items-center gap-4'>
              <div className='rounded-[var(--radius-lg)] border border-border bg-success-muted p-4 text-success'>
                <ActivityIcon size={24} />
              </div>
              <h4 className='text-xl font-black uppercase tracking-[0.28em] text-success'>Signal Hierarchy</h4>
            </div>
            <div className='grid gap-5'>
              <motion.div whileHover={{ y: -2, scale: 1.01 }} className='rounded-[2rem] border border-border bg-success-muted p-6 sm:p-8'>
                <p className='mb-5 text-[10px] font-black uppercase tracking-[0.34em] text-success underline decoration-success/40'>Primary (Actionable)</p>
                <ul className='space-y-4 text-2xl font-black sm:text-3xl'>
                  <li>Booked Calls</li>
                  <li>Positive Replies</li>
                  <li>Reply Quality</li>
                </ul>
              </motion.div>
              <motion.div whileHover={{ y: -2, scale: 1.01 }} className='rounded-[2rem] border border-border bg-warning-muted p-6 sm:p-8'>
                <p className='mb-5 text-[10px] font-black uppercase tracking-[0.34em] text-warning'>Secondary (Friction)</p>
                <ul className='space-y-4 text-xl font-black opacity-85 sm:text-2xl'>
                  <li>Click-to-Reply</li>
                  <li>Intent Mapping</li>
                </ul>
              </motion.div>
            </div>
          </div>
          <div>
            <h4 className='mb-5 border-b border-border pb-4 text-xl font-black uppercase tracking-[0.4em] text-success'>Promotion Ladder</h4>
            <div className='grid gap-4 sm:grid-cols-2'>
              {PROMOTION_STATES.map((state) => (
                <motion.div key={state.state} whileHover={{ y: -2, scale: 1.01 }} className={`rounded-[1.75rem] border ${colors.borderStrong} ${colors.panel} p-5 shadow-xl`}>
                  <div>
                    <div className='mb-3 flex items-center justify-between'>
                      <span className='text-[11px] font-black uppercase tracking-[0.24em] text-success'>{state.state}</span>
                      <div className='h-2 w-2 rounded-full bg-success shadow-[0_0_10px_rgba(var(--color-success-rgb),0.8)]' />
                    </div>
                    <p className='text-lg font-black'>{state.label}</p>
                  </div>
                  <p className='mt-4 text-xs uppercase tracking-[0.08em] opacity-45'>{state.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderMasteryView = () => (
    <motion.div key='mastery-view' initial={{ opacity: 0, x: tabDirection * 32 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: tabDirection * -24 }} className='mx-auto max-w-7xl space-y-10 pb-12'>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className={`rounded-[2rem] border ${colors.borderStrong} ${colors.panel} p-6 sm:p-8 lg:p-10 shadow-[0_30px_80px_rgba(var(--color-background-rgb),0.22)]`}>
        <div className='mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
          <div>
            <div className='flex items-center gap-3 mb-2'>
              <selectedAgent.icon size={24} className='text-accent' />
              <h2 className='text-2xl font-black uppercase tracking-[0.12em] sm:text-3xl'>{selectedAgent.name}</h2>
            </div>
            <p className='text-sm font-mono uppercase tracking-[0.2em] text-accent mb-3'>{selectedAgent.controlPoint}</p>
            <p className='text-base leading-relaxed opacity-80 max-w-2xl'>{selectedAgent.task}</p>
          </div>
          <div className='flex flex-wrap gap-2'>
            <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full ${selectedAgent.phase === 1 ? 'bg-success-muted text-success border border-border' : 'bg-info-muted text-info border border-border'}`}>Phase {selectedAgent.phase}</span>
            <span className='text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full bg-accent/10 text-accent border border-accent/30'>Writes → {selectedAgent.writes}</span>
          </div>
        </div>
        <div className={`rounded-[1.5rem] border ${colors.border} ${colors.panelSoft} p-5 mb-6`}>
          <h3 className='text-[10px] font-black uppercase tracking-[0.3em] text-warning mb-3'>Performance Standard</h3>
          <p className='text-sm leading-relaxed opacity-85'>{selectedAgent.standard}</p>
        </div>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-5'>
          <div className={`rounded-[1.5rem] border ${colors.border} ${colors.panelSoft} p-5`}>
            <h3 className='text-[10px] font-black uppercase tracking-[0.3em] text-success mb-4 flex items-center gap-2'><Cpu size={13} /> Inputs</h3>
            <ul className='space-y-2'>
              {selectedAgent.inputs.map((input) => (
                <li key={input} className='text-xs leading-relaxed opacity-75 flex items-start gap-2'>
                  <div className='mt-1.5 h-1.5 w-1.5 rounded-full bg-success flex-shrink-0' />
                  {input}
                </li>
              ))}
            </ul>
          </div>
          <div className={`rounded-[1.5rem] border ${colors.border} ${colors.panelSoft} p-5`}>
            <h3 className='text-[10px] font-black uppercase tracking-[0.3em] text-accent mb-4 flex items-center gap-2'><Zap size={13} /> Outputs</h3>
            <ul className='space-y-2'>
              {selectedAgent.outputs.map((output) => (
                <li key={output} className='text-xs leading-relaxed opacity-75 flex items-start gap-2'>
                  <div className='mt-1.5 h-1.5 w-1.5 rounded-full bg-accent flex-shrink-0' />
                  {output}
                </li>
              ))}
            </ul>
          </div>
          <div className={`rounded-[1.5rem] border ${colors.border} ${colors.panelSoft} p-5`}>
            <h3 className='text-[10px] font-black uppercase tracking-[0.3em] text-info mb-4 flex items-center gap-2'><TrendingUp size={13} /> Feedback Signals</h3>
            <ul className='space-y-2'>
              {selectedAgent.feedback.map((fb) => (
                <li key={fb} className='text-xs leading-relaxed opacity-75 flex items-start gap-2'>
                  <div className='mt-1.5 h-1.5 w-1.5 rounded-full bg-info flex-shrink-0' />
                  {fb}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </motion.div>

      <div>
        <h2 className='text-[11px] font-black uppercase tracking-[0.4em] opacity-40 mb-6 flex items-center gap-3'><Lock size={15} /> Knowledge Scoping — 3-Tier Architecture</h2>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-5'>
          {KNOWLEDGE_SCOPES.map((ks, index) => (
            <motion.div key={ks.scope} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }} whileHover={{ y: -4, scale: 1.01 }} className={`rounded-[2rem] border ${colors.borderStrong} ${colors.panel} p-6 shadow-[0_20px_50px_rgba(var(--color-background-rgb),0.15)]`}>
              <div className='flex items-center gap-3 mb-4'>
                <div className={`h-3 w-3 rounded-full bg-${ks.color} shadow-[0_0_10px_rgba(var(--color-${ks.color}-rgb),0.8)]`} />
                <h3 className='text-sm font-black uppercase tracking-[0.2em]'>{ks.label}</h3>
                <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full bg-${ks.color}-muted text-${ks.color}`}>{ks.scope}</span>
              </div>
              <p className='text-sm leading-relaxed opacity-75 mb-5'>{ks.desc}</p>
              <div className='space-y-2'>
                {ks.examples.map((ex) => (
                  <div key={ex} className='flex items-start gap-2 text-xs opacity-65'>
                    <div className={`mt-1.5 h-1 w-1 rounded-full bg-${ks.color} flex-shrink-0`} />
                    {ex}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div>
        <h2 className='text-[11px] font-black uppercase tracking-[0.4em] opacity-40 mb-6 flex items-center gap-3'><Scale size={15} /> Knowledge Governance — Promotion Lifecycle</h2>
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
          {GOVERNANCE_STATES.map((gs, index) => (
            <motion.div key={gs.state} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }} whileHover={{ y: -3 }} className={`rounded-[1.5rem] border ${colors.border} ${colors.panelSoft} p-5 relative overflow-hidden`}>
              <div className={`absolute top-0 left-0 w-1 h-full ${index < 3 ? 'bg-success' : index < 5 ? 'bg-warning' : 'bg-error'}`} />
              <h3 className='text-sm font-black mb-2 pl-3'>{gs.state}</h3>
              <p className='text-xs opacity-60 mb-3 pl-3'>{gs.trigger}</p>
              <div className='flex items-center gap-2 pl-3'>
                <ChevronRight size={12} className='text-accent' />
                <span className='text-[10px] font-mono text-accent'>{gs.next}</span>
              </div>
            </motion.div>
          ))}
        </div>
        <div className={`mt-6 rounded-[1.75rem] border ${colors.border} ${colors.panelSoft} p-5`}>
          <h3 className='text-[10px] font-black uppercase tracking-[0.3em] text-error mb-3 flex items-center gap-2'><ShieldAlert size={13} /> Non-Negotiable Rules</h3>
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'>
            {['No direct local-to-global promotion', 'Local evidence always overrides global priors', 'Execution agents may propose — governance approves', 'No promotion of noise (single success ≠ truth)', 'Rollback must always be possible', 'Revalidation is mandatory for all global knowledge'].map((rule) => (
              <div key={rule} className='flex items-start gap-2 text-xs opacity-75'>
                <Lock size={11} className='mt-0.5 text-error flex-shrink-0' />
                {rule}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h2 className='text-[11px] font-black uppercase tracking-[0.4em] opacity-40 mb-6 flex items-center gap-3'><GitPullRequest size={15} /> Acquisition Learning System — 10-Phase Roadmap</h2>
        <div className='space-y-3'>
          {LEARNING_PHASES.map((lp, index) => (
            <motion.div key={lp.phase} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }} whileHover={{ x: 6 }} className={`rounded-[1.5rem] border ${colors.border} ${colors.panelSoft} p-5 flex flex-col sm:flex-row sm:items-center gap-4`}>
              <div className='flex items-center gap-3 sm:w-48 flex-shrink-0'>
                <span className='text-[10px] font-mono opacity-40'>{lp.phase}</span>
                <h3 className='text-sm font-black'>{lp.title}</h3>
              </div>
              <p className='text-xs leading-relaxed opacity-65 flex-1'>{lp.desc}</p>
              <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full flex-shrink-0 ${
                index < 1 ? 'bg-success-muted text-success' :
                index < 3 ? 'bg-info-muted text-info' :
                index < 5 ? 'bg-accent/10 text-accent' :
                index < 7 ? 'bg-warning-muted text-warning' :
                'bg-error-muted text-error'
              }`}>{lp.status}</span>
            </motion.div>
          ))}
        </div>
      </div>

      <div className={`rounded-[2rem] border ${colors.borderStrong} ${colors.panel} p-6 sm:p-8`}>
        <h2 className='text-[11px] font-black uppercase tracking-[0.4em] opacity-40 mb-6 flex items-center gap-3'><Network size={15} /> Network Effect — The Compounding Moat</h2>
        <div className='flex flex-col items-center gap-4 py-6'>
          {['More Partners', 'More Signal', 'More Patterns', 'Better Priors', 'Better Acquisition Performance', 'More Partners'].map((step, index) => (
            <motion.div key={step} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.1 }}>
              {index > 0 && <div className='h-6 w-px bg-accent/30 mx-auto mb-4' />}
              <div className={`rounded-[1.25rem] border ${index === 0 || index === 5 ? 'border-borderHover bg-success-muted' : 'border-accent/30 bg-accent/5'} px-8 py-3 text-center`}>
                <span className={`text-sm font-black uppercase tracking-[0.15em] ${index === 0 || index === 5 ? 'text-success' : 'text-accent'}`}>{step}</span>
              </div>
            </motion.div>
          ))}
        </div>
        <p className='text-center text-xs opacity-50 mt-4 max-w-lg mx-auto'>Each partner contributes signal. Each campaign contributes signal. The network becomes stronger as usage grows. This is the III network effect.</p>
      </div>
    </motion.div>
  );

  const renderSpecsView = () => (
    <motion.div key='specs-view' initial={{ opacity: 0, x: tabDirection * 32 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: tabDirection * -24 }} className='mx-auto max-w-7xl space-y-8 pb-12'>
      <div>
        <p className={`mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-success-muted px-4 py-2 text-[12px] font-black uppercase tracking-[0.34em] text-success`}>
          <DatabaseZap size={14} /> Schema + Constraint Map
        </p>
        <h2 className={`text-4xl sm:text-[2.2rem] font-black tracking-tight ${colors.heading} sm:text-[2.7rem] lg:text-[4.5rem]`}>Engineering Spec</h2>
      </div>
      <div className='grid gap-5 md:grid-cols-2 xl:grid-cols-3'>
        {FULL_SCHEMA.map((table, index) => (
          <motion.div key={table.table} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }} whileHover={{ rotateX: 2, rotateY: -2, y: -4, scale: 1.01 }} className={`group relative overflow-hidden rounded-[2rem] border ${colors.borderStrong} ${colors.panel} p-6 shadow-[0_25px_60px_rgba(var(--color-background-rgb),0.18)]`}>
            <DatabaseZap className='absolute -right-6 -top-6 h-24 w-24 text-success/10 transition-transform duration-500 group-hover:rotate-12' />
            <div className={`mb-5 flex items-center justify-between gap-4 pb-4 ${theme === 'dark' ? 'border-b border-border/8' : 'border-b border-border/90'}`}>
              <h4 className={`text-[1.6rem] font-black uppercase tracking-[0.15em] text-textPrimary`}>{table.table}</h4>
              <Code2 className='text-success/50' />
            </div>
            <div className='space-y-5'>
              <div>
                <h5 className={`mb-3 text-[13px] font-black uppercase tracking-[0.3em] text-success`}>Field Map</h5>
                <div className={`space-y-2 font-mono text-[14px] text-textSecondary/70`}>
                  {table.keys.map((key) => (
                    <div key={key}>- {key}</div>
                  ))}
                </div>
              </div>
              <div>
                <h5 className={`mb-3 text-[12px] font-black uppercase tracking-[0.3em] text-warning`}>Constraints</h5>
                <div className={`space-y-2 text-[12px] font-black uppercase tracking-[0.12em] text-textSecondary/60`}>
                  {table.constraints.map((constraint) => (
                    <div key={constraint} className='flex items-center gap-2'>
                      <Shield size={12} className='text-success' />
                      {constraint}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );

  const renderMainContent = () => {
    switch (activeTab) {
      case 'workflow':
        return renderWorkflowView();
      case 'tree':
        return renderTreeView();
      case 'gemini':
        return renderGeminiView();
      case 'angles':
        return renderAnglesView();
      case 'dashboards':
        return renderDashboardsView();
      case 'mastery':
        return renderMasteryView();
      case 'specs':
        return renderSpecsView();
      default:
        return null;
    }
  };

  return (
    <div className={`page-scale relative min-h-screen overflow-x-hidden flex flex-col ${colors.bg} ${colors.text} font-sans text-[105%] transition-colors duration-500 lg:text-[100%] xl:text-[105%]`}>
      <div className='pointer-events-none absolute inset-0 overflow-hidden'>
        <div className='absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(var(--color-success-rgb),0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(var(--color-info-rgb),0.12),transparent_30%)]' />
        {particleDots.map((dot) => (
          <motion.span
            key={dot.id}
            className='absolute rounded-full bg-surfaceElevated'
            style={{ left: dot.left, top: dot.top, width: dot.size, height: dot.size }}
            animate={{ y: [0, -8, 0], opacity: [0.15, 0.45, 0.15] }}
            transition={{ duration: 6 + dot.delay, repeat: Infinity, ease: 'easeInOut', delay: dot.delay }}
          />
        ))}
      </div>

      <header className={`sticky top-0 z-40 border-b ${colors.border} ${theme === 'dark' ? 'bg-background/75' : 'bg-surface/96'} px-4 py-3 backdrop-blur-2xl sm:px-6 lg:px-8`}>
        <div className='flex items-center justify-between gap-4'>
          <div className='flex items-center gap-3'>
            <motion.div whileHover={{ scale: 1.06 }} className='flex items-center justify-center'>
              <MailWriterLogo size='sm' showText={false} />
            </motion.div>
            <div>
              <p className={`text-[10px] font-black uppercase tracking-[0.3em] text-textSecondary`}>System Core V4.0.1</p>
            </div>
          </div>
          <div className='hidden min-w-0 flex-1 xl:flex xl:justify-center'>
            <nav className={`flex max-w-full items-center gap-2 overflow-x-auto rounded-[var(--radius-lg)] border ${colors.border} ${theme === 'dark' ? 'bg-surfaceHover/5' : 'bg-surfaceHover/70'} p-1.5`}>
              {navItems.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <motion.button
                    key={tab.id}
                    whileHover={{ y: -2, scale: 1.01 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => changeTab(tab.id)}
                    className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.22em] transition-all ${isActive ? 'bg-success text-textInverse shadow-xl shadow-success/20' : theme === 'dark' ? 'opacity-65 hover:bg-surfaceHover/10 hover:opacity-100 text-textSecondary' : 'text-textSecondary hover:bg-surfaceHover/60 hover:text-textPrimary'}`}
                  >
                    <div className='flex items-center gap-2.5'>
                      <tab.Icon size={15} />
                      {tab.label}
                    </div>
                  </motion.button>
                );
              })}
            </nav>
          </div>
          <div className='flex items-center gap-2 sm:gap-3'>
            <button onClick={() => setIsMuted(!isMuted)} className={`rounded-xl border ${colors.border} ${theme === 'dark' ? 'text-textSecondary' : 'text-textSecondary bg-surface/70'} p-2.5 transition-all hover:scale-105`}>
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <button
              onClick={() => {
                toggleMode();
                playSfx('toggle');
              }}
              className={`rounded-xl border ${colors.border} ${theme === 'dark' ? 'text-textSecondary' : 'text-textSecondary bg-surface/70'} p-2.5 transition-all hover:scale-105`}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={() => setMobileMenuOpen((current) => !current)} className={`rounded-xl border ${colors.border} ${theme === 'dark' ? 'text-textSecondary' : 'text-textSecondary bg-surface/70'} p-2.5 transition-all xl:hidden`}>
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        <div className='mt-4 xl:hidden'>
          <div className='flex gap-2 overflow-x-auto pb-1 hide-scrollbar'>
            {navItems.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <motion.button
                  key={tab.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => changeTab(tab.id)}
                  className={`shrink-0 rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] transition-all ${isActive ? theme === 'dark' ? 'border-borderHover bg-surfaceElevated text-success' : 'border-borderHover bg-surfaceElevated text-success' : `${colors.border} ${colors.textMuted}`}`}
                >
                  <div className='flex items-center gap-2'>
                    <tab.Icon size={14} />
                    {tab.short}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className='overflow-hidden xl:hidden'>
              <div className={`mt-4 rounded-[1.5rem] border ${colors.border} ${colors.panelSoft} p-4`}>
                <div className='mb-3 flex items-center justify-between'>
                  <p className='text-[10px] font-black uppercase tracking-[0.28em] text-success'>Current Section</p>
                  <span className='text-xs opacity-45'>{activeTabMeta.label}</span>
                </div>
                {renderSidebarContent()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className='relative z-10 flex flex-col xl:flex-row'>
        <aside className={`hidden xl:block xl:w-[340px] 2xl:w-[430px] xl:border-r ${colors.border} ${colors.panelSoft} px-5 py-6 2xl:px-8`}>
          {renderSidebarContent()}
        </aside>
        <section className='min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8'>
          <div className={`mb-6 flex flex-col gap-3 rounded-[1.75rem] border p-4 backdrop-blur md:flex-row md:items-center md:justify-between ${theme === 'dark' ? 'border-border/6 bg-surface/5' : 'border-border bg-surface/75'}`}>
            <div>
              <p className={`text-[10px] font-black uppercase tracking-[0.3em] text-success`}>Active Module</p>
              <h2 className={`mt-2 text-2xl font-black ${colors.heading}`}>{activeTabMeta.label}</h2>
            </div>
            <div className={`rounded-[var(--radius-lg)] border ${colors.border} ${colors.panelSoft} px-4 py-3 text-sm ${colors.textMuted}`}>
              Responsive shell active · desktop graph + mobile stack preserved.
            </div>
          </div>
          <AnimatePresence mode='wait'>{renderMainContent()}</AnimatePresence>
        </section>
      </main>

      <footer className={`relative z-10 border-t ${colors.border} ${colors.footer} px-4 py-4 backdrop-blur-2xl sm:px-6 lg:px-8`}>
        <motion.div className='pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-success/40 to-transparent' animate={{ x: ['-15%', '15%', '-15%'] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} />
        <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
          <div className='flex items-center gap-4'>
            <div className='relative flex items-center justify-center'>
              <div className='h-2 w-2 rounded-full bg-success shadow-[0_0_10px_rgba(var(--color-success-rgb),0.9)]' />
              <div className='absolute h-4 w-4 rounded-full bg-surfaceElevated animate-ping' />
            </div>
            <div>
              <p className='text-[10px] font-black uppercase tracking-[0.36em] text-success'>OS_CORE_READY</p>
              <p className='text-[10px] font-mono opacity-35'>REV_PROTOCOL: V4.0.01_S</p>
            </div>
          </div>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-8'>
            <div className='text-[10px] font-mono uppercase tracking-[0.28em] opacity-25'>KERNEL_SYNC_0x1A2 · SYNC_READY</div>
            <motion.div whileHover={{ y: -2 }} className='flex items-center gap-3'>
              <div>
                <p className='text-[9px] font-black uppercase tracking-[0.34em] opacity-25'>Architect_ID</p>
                <p className={`text-sm font-black tracking-tight text-textPrimary/90`}>Anwesh Rath</p>
              </div>
              <div className='rounded-lg border border-border/10 p-2 transition-all hover:border-border'>
                <Fingerprint size={14} className='text-success/50' />
              </div>
            </motion.div>
          </div>
        </div>
      </footer>

      <AnimatePresence>
        {treeModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 z-50 flex items-end justify-center bg-background/70 p-3 backdrop-blur-md sm:items-center sm:p-6'
            onClick={() => setTreeModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 220, damping: 20 }}
              onClick={(event) => event.stopPropagation()}
              className={`w-full max-w-3xl overflow-hidden rounded-[2rem] border ${NODE_COLORS[selectedTreeNode.type as NodeType].border} ${colors.panel} shadow-[0_40px_100px_rgba(var(--color-background-rgb),0.42)]`}
            >
              <div className={`bg-gradient-to-br ${NODE_COLORS[selectedTreeNode.type as NodeType].panel} border-b ${colors.border} p-5 sm:p-7`}>
                <div className='flex items-start justify-between gap-4'>
                  <div className='flex items-start gap-4'>
                    <div className={`rounded-[1.3rem] border p-3 ${NODE_COLORS[selectedTreeNode.type as NodeType].badge}`}>
                      {React.createElement(selectedTreeNode.icon, { size: 24 })}
                    </div>
                    <div>
                      <p className='mb-2 text-[10px] font-black uppercase tracking-[0.3em] text-success'>{currentLayer.label}</p>
                      <h3 className={`text-2xl font-black uppercase tracking-tight sm:text-3xl ${colors.heading}`}>{selectedTreeNode.label}</h3>
                      <div className='mt-3 flex flex-wrap gap-2'>
                        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] ${NODE_COLORS[selectedTreeNode.type as NodeType].badge}`}>{selectedTreeNode.type}</span>
                        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] ${colors.border} ${colors.textMuted}`}>{selectedTreeNode.id}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setTreeModalOpen(false)}
                    className={`rounded-xl border ${colors.border} p-2 transition-all hover:scale-105`}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className='grid gap-5 p-5 sm:grid-cols-[1.1fr_0.9fr] sm:p-7'>
                <div className='space-y-4'>
                  <div className={`rounded-[1.4rem] border ${colors.border} ${colors.panelSoft} p-4`}>
                    <p className='mb-2 text-[10px] font-black uppercase tracking-[0.26em] text-success'>Node Purpose</p>
                    <p className='text-sm leading-relaxed opacity-80 sm:text-base'>{selectedTreeNode.desc}</p>
                  </div>
                  <div className={`rounded-[1.4rem] border ${colors.border} ${colors.panelSoft} p-4`}>
                    <p className='mb-2 text-[10px] font-black uppercase tracking-[0.26em] text-success'>Position In System</p>
                    <p className='text-sm leading-relaxed opacity-75'>This node lives inside the <span className='font-semibold text-success'>{currentLayer.label}</span> and connects into the broader MarketX operating map through the relationships shown here.</p>
                  </div>
                </div>
                <div className='space-y-4'>
                  <div className={`rounded-[1.4rem] border ${colors.border} ${colors.panelSoft} p-4`}>
                    <p className='mb-3 text-[10px] font-black uppercase tracking-[0.26em] text-success'>Connected Links</p>
                    <div className='space-y-2'>
                      {selectedTreeLinks.map((link) => {
                        const otherNodeId = link.from === selectedTreeNode.id ? link.to : link.from;
                        const otherNode = TREE_NODES.find((node) => node.id === otherNodeId);
                        if (!otherNode) return null;
                        return (
                          <button
                            key={`${link.from}-${link.to}`}
                            onClick={() => setSelectedTreeNode(otherNode)}
                            className={`flex w-full items-center justify-between rounded-xl border ${colors.border} px-3 py-2 text-left text-xs font-semibold transition-all hover:border-borderHover hover:bg-surface`}
                          >
                            <span>{otherNode.label}</span>
                            <ChevronRight size={14} className='opacity-50' />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className={`rounded-[1.4rem] border ${colors.border} ${colors.panelSoft} p-4`}>
                    <p className='mb-2 text-[10px] font-black uppercase tracking-[0.26em] text-success'>Interaction Note</p>
                    <p className='text-xs leading-relaxed opacity-65'>Desktop keeps the graph draggable. Mobile collapses the same data into tactile inspection cards. This modal gives you the clean, focused node readout in both modes.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .page-scale {
          zoom: 0.84;
        }
        @media (max-width: 1279px) {
          .page-scale {
            zoom: 0.92;
          }
        }
        @media (max-width: 767px) {
          .page-scale {
            zoom: 1;
          }
        }
                .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(var(--color-success-rgb), 0.18);
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(var(--color-success-rgb), 0.42);
        }
        .font-black {
          font-weight: 900;
        }
      `}</style>
    </div>
  );
}
