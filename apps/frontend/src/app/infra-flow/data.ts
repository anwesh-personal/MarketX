export interface Phase {
    num: number
    title: string
    subtitle: string
    color: string
    engine: string
    owner: string
    objective: string
    steps: string[]
    outputs: string[]
    entryCondition: string
    exitConditions: string[]
    failureConditions: string[]
    gates: string[]
    systemLaws: string[]
    modules: string[]
}

export const SYSTEM_LAWS = [
    'No production before structural prerequisites are complete',
    'No messaging without a valid MarketWriter Brief',
    'No launch without passing Pre-Launch Validation',
    'No scale without validated signal quality',
    'No optimization on invalid signals',
    'No mixing of beliefs within a sequence',
    'No override of suppression or compliance rules',
    'No downstream conclusions without upstream health validation',
]

export const ENGINES = [
    { name: 'Data Engine', color: '#06b6d4', desc: 'Who to contact, when, who not to' },
    { name: 'MarketWriter', color: '#8b5cf6', desc: 'What must happen in the buyer\'s mind' },
    { name: 'Delivery Engine', color: '#f59e0b', desc: 'Safe execution infrastructure' },
]

export const PHASES: Phase[] = [
    {
        num: 0, title: 'Partner Qualification', subtitle: 'Admission Control',
        color: '#64748b', engine: 'Pre-engine', owner: 'Commercial / Strategy',
        objective: 'Determine whether the partner is allowed into the system and create the structural container required for execution.',
        steps: ['Define proposed partner', 'Define proposed offer', 'Define proposed market', 'Confirm commercial agreement', 'Verify booking path', 'Record compliance constraints', 'Approve or reject partner'],
        outputs: ['partner_id', 'tenant_id', 'activation status', 'internal system container'],
        entryCondition: 'None',
        exitConditions: ['Agreement signed', 'Payment confirmed', 'Partner approved', 'Offer defined', 'Booking system verified', 'Compliance constraints documented'],
        failureConditions: ['Unclear or unstable offer', 'Inability to fulfill qualified demand', 'Compliance ambiguity', 'Inability to define qualified lead'],
        gates: [],
        systemLaws: ['No production before structural prerequisites are complete'],
        modules: ['Client and Offer Setup', 'Artifact and Intake Uploads'],
    },
    {
        num: 1, title: 'Onboarding & Intake', subtitle: 'Truth Extraction',
        color: '#3b82f6', engine: 'Cross-engine', owner: 'Onboarding / Success',
        objective: 'Extract the full set of truths required to construct the system.',
        steps: ['Upload onboarding questionnaire', 'Upload intake artifacts', 'Upload knowledge base', 'Upload offer breakdown', 'Upload sales process definition', 'Define qualified sales lead', 'Define suppression rules', 'Define compliance rules', 'Define CRM / booking flow', 'Mark intake completeness'],
        outputs: ['Structured intake package', 'Operating assumptions', 'Validated booking path', 'Qualification criteria'],
        entryCondition: 'Phase 0 complete',
        exitConditions: ['Intake complete', 'Offer stable', 'Qualification defined', 'Suppression rules defined', 'Booking flow validated'],
        failureConditions: ['Missing intake data', 'Undefined qualified lead', 'Vague offer', 'Missing suppression rules', 'Broken booking system'],
        gates: [],
        systemLaws: ['No production before structural prerequisites are complete'],
        modules: ['Artifact and Intake Uploads', 'Client and Offer Setup'],
    },
    {
        num: 2, title: 'Data Engine Build', subtitle: 'Governed Action Surface',
        color: '#06b6d4', engine: 'Data Engine', owner: 'Data Engine',
        objective: 'Construct the governed action surface that determines who can be contacted.',
        steps: ['Define ICP segments', 'Load suppression', 'Upload monthly UP file', 'Run UP prep', 'Select active up_prep_version', 'Run ICP classification', 'Run buying unit assignment', 'Run identity validation', 'Run role classification', 'Run buyer stage classification', 'Run timing/readiness evaluation', 'Run person-level decisioning', 'Select approved contacts', 'Run email hygiene', 'Re-check suppression', 'Generate approved contact pool', 'Record rejected contact memory'],
        outputs: ['contact_now', 'delay', 'suppress', 'confidence score', 'rationale codes'],
        entryCondition: 'Phase 1 complete',
        exitConditions: ['Segments explicit and non-overlapping', 'Suppression active', 'Hygiene validated', 'Sufficient viable volume', 'Identity confidence acceptable', 'Action surface generated'],
        failureConditions: ['ICP too broad', 'Incorrect role targeting', 'Weak identity resolution', 'Poor hygiene', 'Insufficient viable contacts'],
        gates: ['Active ICP segment(s)', 'Active suppression', 'Active up_prep_version', 'Identity confidence acceptable', 'Hygiene validated', 'Viable approved contact pool'],
        systemLaws: ['No override of suppression or compliance rules', 'No downstream conclusions without upstream health validation'],
        modules: ['ICP Segment Builder', 'Suppression Manager', 'UP Prep Control', 'Data Engine Workspace', 'InMarket Workspace'],
    },
    {
        num: 3, title: 'MarketWriter Build', subtitle: 'Belief System Construction',
        color: '#8b5cf6', engine: 'MarketWriter', owner: 'MarketWriter',
        objective: 'Construct the belief system that governs buyer progression.',
        steps: ['Create offer record', 'Create VP worksheet', 'Upload Product/Service KB', 'Build angle inventory', 'Build angle coverage map', 'Create Brief per ICP segment', 'Validate Brief', 'Generate Flow A', 'Generate Flow B', 'Lock one belief per flow', 'Configure testing plan', 'Configure extension rules', 'Configure reply meaning rules'],
        outputs: ['Locked Brief per segment', 'Governed angle inventory', 'Live angle coverage map', 'Two competing belief flows per ICP', 'Reply meaning classification'],
        entryCondition: 'Phase 2 complete',
        exitConditions: ['Valid Brief per segment', 'Each flow contains one belief', 'Two competing beliefs exist', 'Uncertainty explicitly defined', 'Decision movement defined'],
        failureConditions: ['No Brief', 'Belief mixing', 'Unclear decision movement', 'Unsupported claims', 'Weak angle construction'],
        gates: ['Valid Brief per active segment', 'Flow A and Flow B created', 'One belief per flow', 'No belief mixing'],
        systemLaws: ['No messaging without a valid MarketWriter Brief', 'No mixing of beliefs within a sequence'],
        modules: ['MarketWriter Workspace', 'Artifact and Intake Uploads'],
    },
    {
        num: 4, title: 'Delivery Engine Build', subtitle: 'Safe Execution Infrastructure',
        color: '#f59e0b', engine: 'Delivery Engine', owner: 'Delivery Engine',
        objective: 'Construct the infrastructure required for safe execution.',
        steps: ['Create tenant environment', 'Create domains', 'Verify DNS', 'Create mailboxes', 'Configure routing', 'Configure suppression enforcement', 'Define pacing model', 'Define warm-up plan', 'Create delivery campaign objects', 'Create MailWizz customer', 'Create MailWizz lists', 'Assign sending domain', 'Confirm infrastructure readiness'],
        outputs: ['Isolated delivery environment', 'Warmed infrastructure', 'Enforced pacing', 'Validated routing', 'Protected sending layer', 'Executable send queue'],
        entryCondition: 'Phase 3 complete',
        exitConditions: ['Infrastructure functional', 'Routing validated', 'Warm-up acceptable', 'Suppression enforced'],
        failureConditions: ['Routing failure', 'Insufficient warm-up', 'Infrastructure instability', 'Missing suppression enforcement'],
        gates: ['Tenant environment exists', 'Domains verified', 'Mailboxes active', 'Routing validated', 'Suppression enforced', 'Warm-up active/complete', 'Pacing defined', 'Send queue functional'],
        systemLaws: ['No override of suppression or compliance rules'],
        modules: ['Delivery Engine Workspace', 'MailWizz Setup', 'Lead Load', 'Flow Builder'],
    },
]
