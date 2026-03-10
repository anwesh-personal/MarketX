// AXIOM Vision Presentation - Tab Content
// This contains all the tab content that will be inserted into the main presentation

function getTabContent(tabName) {
    const contents = {
        'overview': `
            <div class="space-y-12">
                <div class="text-center mb-16">
                    <h2 class="text-5xl font-black gradient-text mb-6">What is AXIOM?</h2>
                    <p class="text-2xl" style="color: var(--text-secondary);">The Intelligence Layer for Email Marketing</p>
                </div>

                <div class="grid md:grid-cols-3 gap-8">
                    <div class="card glass rounded-3xl p-8">
                        <div class="text-4xl mb-4">🧠</div>
                        <h3 class="text-2xl font-bold mb-4">The Brain</h3>
                        <p class="text-muted">Axiom is the AI engine that powers InMarketTraffic's content generation, turning your knowledge base into intelligent, trust-building communications.</p>
                    </div>

                    <div class="card glass rounded-3xl p-8">
                        <div class="text-4xl mb-4">⚖️</div>
                        <h3 class="text-2xl font-bold mb-4">Constitutional AI</h3>
                        <p class="text-muted">Every piece of content is validated against hard rules. If it would help today's metrics but hurt long-term trust, it gets rejected.</p>
                    </div>

                    <div class="card glass rounded-3xl p-8">
                        <div class="text-4xl mb-4">📈</div>
                        <h3 class="text-2xl font-bold mb-4">Self-Healing</h3>
                        <p class="text-muted">A daily learning loop ingests performance data, identifies what works, and automatically improves tomorrow's content.</p>
                    </div>
                </div>

                <div class="glass rounded-3xl p-12 mt-16">
                    <h3 class="text-3xl font-bold mb-8 text-center">The One-Sentence Version</h3>
                    <p class="text-2xl text-center font-light" style="color: var(--text-secondary);">
                        "Axiom is a self-healing AI engine that generates trust-building email content, learns from every interaction, and gets smarter every day."
                    </p>
                </div>

                <div class="grid md:grid-cols-2 gap-8 mt-16">
                    <div class="glass rounded-3xl p-8">
                        <h3 class="text-2xl font-bold mb-4 gradient-text">Without Axiom</h3>
                        <ul class="space-y-3 text-muted">
                            <li>❌ Manual email writing</li>
                            <li>❌ Guessing what works</li>
                            <li>❌ Inconsistent voice</li>
                            <li>❌ No learning from results</li>
                            <li>❌ Scaling = hiring writers</li>
                        </ul>
                    </div>

                    <div class="glass rounded-3xl p-8" style="background: var(--gradient-aqua); color: white;">
                        <h3 class="text-2xl font-bold mb-4">With Axiom</h3>
                        <ul class="space-y-3">
                            <li>✅ AI writes following YOUR rules</li>
                            <li>✅ Constitutional guardrails</li>
                            <li>✅ Consistent brand voice always</li>
                            <li>✅ System learns what works</li>
                            <li>✅ Infinite scalability</li>
                        </ul>
                    </div>
                </div>

                <div class="text-center mt-16">
                    <button class="btn-primary" onclick="openExamples()">See How It Works →</button>
                </div>
            </div>
        `,

        'imt': `
            <div class="space-y-12">
                <div class="text-center mb-16">
                    <h2 class="text-5xl font-black gradient-text mb-6">InMarket Traffic</h2>
                    <p class="text-2xl" style="color: var(--text-secondary);">The Business Axiom Powers</p>
                </div>

                <div class="glass rounded-3xl p-12 mb-12">
                    <h3 class="text-3xl font-bold mb-6">What IMT Does</h3>
                    <p class="text-xl mb-8" style="color: var(--text-secondary);">
                        InMarketTraffic helps B2B companies reach their entire ICP and start real conversations by paying only for verified, identity-linked clicks.
                    </p>
                    <div class="grid md:grid-cols-2 gap-6">
                        <div>
                            <h4 class="font-bold mb-3 gradient-text text-lg">✓ What IMT IS</h4>
                            <ul class="space-y-2 text-muted">
                                <li>• Identity-linked CPC traffic</li>
                                <li>• Email-driven conversations</li>
                                <li>• Verified buyer records</li>
                                <li>• Owned identity graph</li>
                            </ul>
                        </div>
                        <div>
                            <h4 class="font-bold mb-3 text-lg" style="color: var(--text-muted);">✗ What IMT IS NOT</h4>
                            <ul class="space-y-2 text-muted">
                                <li>• Not an ad platform</li>
                                <li>• Not a list broker</li>
                                <li>• Not intent data resale</li>
                                <li>• Not a lead vendor</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div class="glass rounded-3xl p-12">
                    <h3 class="text-3xl font-bold mb-8 text-center">Where Axiom Fits</h3>
                    <div class="space-y-6">
                        <div class="flex items-center gap-4">
                            <div class="w-1/3 text-right font-semibold">IMT Infrastructure</div>
                            <div class="w-2px h-12 bg-gradient-to-b from-transparent via-aqua-primary to-transparent"></div>
                            <div class="w-2/3 text-muted">Identity graph, email delivery (Mailwiz), n8n orchestration</div>
                        </div>
                        <div class="flex items-center gap-4">
                            <div class="w-1/3 text-right font-bold gradient-text">AXIOM (The Brain)</div>
                            <div class="w-2px h-12" style="background: var(--gradient-aqua);"></div>
                            <div class="w-2/3 font-semibold">Content generation, reply logic, learning loop</div>
                        </div>
                        <div class="flex items-center gap-4">
                            <div class="w-1/3 text-right font-semibold">IMT Analytics</div>
                            <div class="w-2px h-12 bg-gradient-to-b from-transparent via-aqua-primary to-transparent"></div>
                            <div class="w-2/3 text-muted">Stats tracking, buyer records, call bookings</div>
                        </div>
                    </div>
                </div>

                <div class="glass rounded-3xl p-12" style="background: var(--bg-secondary);">
                    <h3 class="text-2xl font-bold mb-6">The Primary Metric: BOOKED CALL</h3>
                    <div class="space-y-4">
                        <div class="flex items-center justify-between p-4 rounded-xl" style="background: var(--gradient-aqua); color: white;">
                            <span class="font-bold">PRIMARY</span>
                            <span class="text-2xl">→</span>
                            <span class="font-bold">BOOKED_CALL</span>
                        </div>
                        <div class="flex items-center justify-between p-4 rounded-xl glass">
                            <span class="text-muted">SECONDARY</span>
                            <span>→</span>
                            <span>REPLIES, CLICKS</span>
                        </div>
                        <div class="flex items-center justify-between p-4 rounded-xl glass">
                            <span class="text-muted">IGNORED</span>
                            <span>→</span>
                            <span class="text-muted">OPEN_RATE (unreliable)</span>
                        </div>
                        <div class="flex items-center justify-between p-4 rounded-xl glass">
                            <span style="color: #FF5555;">GUARDRAILS</span>
                            <span>→</span>
                            <span style="color: #FF5555;">BOUNCES, UNSUBS, COMPLAINTS</span>
                        </div>
                    </div>
                </div>
            </div>
        `,

        'architecture': `
            <div class="space-y-12">
                <div class="text-center mb-16">
                    <h2 class="text-5xl font-black gradient-text mb-6">Nerd Talk: System Architecture</h2>
                    <p class="text-2xl" style="color: var(--text-secondary);">Under the Hood of the Intelligence Layer</p>
                </div>

                <!-- Core Stack Grid -->
                <div class="grid md:grid-cols-4 gap-6 mb-12">
                    <div class="card glass rounded-2xl p-6 text-center">
                        <div class="text-4xl mb-3">⚛️</div>
                        <h4 class="font-bold">Next.js 14</h4>
                        <p class="text-xs text-muted">App Router / Server Actions</p>
                    </div>
                    <div class="card glass rounded-2xl p-6 text-center">
                        <div class="text-4xl mb-3">🐘</div>
                        <h4 class="font-bold">PostgreSQL</h4>
                        <p class="text-xs text-muted">Supabase + RLS Multi-tenancy</p>
                    </div>
                    <div class="card glass rounded-2xl p-6 text-center">
                        <div class="text-4xl mb-3">🐮</div>
                        <h4 class="font-bold">BullMQ</h4>
                        <p class="text-xs text-muted">Redis-backed Job Queues</p>
                    </div>
                    <div class="card glass rounded-2xl p-6 text-center">
                        <div class="text-4xl mb-3">⚡</div>
                        <h4 class="font-bold">Workers</h4>
                        <p class="text-xs text-muted">Isolated Node.js Processes</p>
                    </div>
                </div>

                <!-- Multi-Tenancy & Superadmin -->
                <div class="glass rounded-3xl p-12">
                    <h3 class="text-3xl font-bold mb-8">Multi-Tenant & Superadmin System</h3>
                    <div class="grid md:grid-cols-2 gap-12">
                        <div>
                            <h4 class="text-xl font-bold mb-4 gradient-text">Organization Isolation</h4>
                            <p class="text-muted mb-4">True multi-tenancy with strict data isolation. Every request is scoped to an <code>org_id</code>.</p>
                            <ul class="space-y-2 text-sm text-muted font-mono">
                                <li>• Users belong to Organizations</li>
                                <li>• API Keys scoped to Orgs</li>
                                <li>• KB Data (ICPs, Offers) isolated by Org</li>
                                <li>• RLS Policies enforce boundaries at DB level</li>
                            </ul>
                        </div>
                        <div>
                            <h4 class="text-xl font-bold mb-4 gradient-text">Superadmin Privileges</h4>
                            <p class="text-muted mb-4">God-mode dashboard for managing the platform infrastructure.</p>
                            <ul class="space-y-2 text-sm text-muted font-mono">
                                <li>• Manage Tenants (Onboard/Offboard)</li>
                                <li>• Global Worker Oversight (Pause/Resume queues)</li>
                                <li>• AI Provider Management (Gemini, Claude keys)</li>
                                <li>• System Health Monitoring</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <!-- Visual Workflow Engine -->
                <div class="glass rounded-3xl p-12">
                    <div class="flex items-center justify-between mb-8">
                        <h3 class="text-3xl font-bold">Visual Workflow Engine</h3>
                        <span class="px-4 py-1 rounded-full text-xs font-bold bg-[var(--aqua-primary)] text-white">REACT FLOW POWERED</span>
                    </div>
                    
                    <p class="text-lg text-muted mb-8">
                        We don't hardcode logic. We build <strong>Content Pipelines</strong> visually. 
                        A workflow is a directed graph of nodes that process data, generate content, and validate outputs.
                    </p>

                    <div class="grid md:grid-cols-3 gap-6">
                        <div class="p-6 rounded-2xl" style="background: var(--bg-secondary);">
                            <h4 class="font-bold mb-2">1. The Designer</h4>
                            <p class="text-sm text-muted">
                                Drag-and-drop UI to assemble nodes. Connect <code>Triggers</code> to <code>Analyzers</code> to <code>Generators</code>.
                            </p>
                            <div class="mt-4 p-3 bg-black/10 rounded font-mono text-xs">
                                src/components/workflow/Editor.tsx
                            </div>
                        </div>
                        <div class="p-6 rounded-2xl" style="background: var(--bg-secondary);">
                            <h4 class="font-bold mb-2">2. The Compiler</h4>
                            <p class="text-sm text-muted">
                                Converts the visual graph into a JSON execution plan. Validates connections and required inputs.
                            </p>
                            <div class="mt-4 p-3 bg-black/10 rounded font-mono text-xs">
                                lib/workflow/compiler.ts
                            </div>
                        </div>
                        <div class="p-6 rounded-2xl" style="background: var(--bg-secondary);">
                            <h4 class="font-bold mb-2">3. The Execution</h4>
                            <p class="text-sm text-muted">
                                Workers pick up the plan. Each node type (LLM, RAG, Code) has a dedicated processor.
                            </p>
                            <div class="mt-4 p-3 bg-black/10 rounded font-mono text-xs">
                                apps/workers/src/processors/*
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Worker Architecture -->
                <div class="glass rounded-3xl p-12">
                    <h3 class="text-3xl font-bold mb-8">Distributed Worker System</h3>
                    <div class="space-y-6">
                        <div class="flex items-center gap-6">
                            <div class="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                                API
                            </div>
                            <div class="flex-1">
                                <div class="h-1 bg-[var(--border-color)] relative">
                                    <div class="absolute inset-0 bg-[var(--aqua-primary)] w-1/2 animate-pulse"></div>
                                </div>
                                <p class="text-xs text-center mt-2 text-muted">Job Submission (Redis)</p>
                            </div>
                            <div class="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold bg-[var(--aqua-primary)] text-white shadow-lg shadow-[var(--aqua-primary)]/20">
                                Q
                            </div>
                            <div class="flex-1">
                                <div class="h-1 bg-[var(--border-color)] relative">
                                    <div class="absolute inset-0 bg-[var(--aqua-primary)] w-1/2 animate-pulse" style="animation-delay: 0.5s"></div>
                                </div>
                                <p class="text-xs text-center mt-2 text-muted">Job Pickup</p>
                            </div>
                            <div class="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                                W
                            </div>
                        </div>

                        <div class="grid md:grid-cols-3 gap-6 mt-8">
                            <div class="p-4 rounded-lg border border-[var(--border-color)]">
                                <h5 class="font-bold mb-2">Queue: KB_PROCESS</h5>
                                <p class="text-xs text-muted">Embeddings, chunking, graph building.</p>
                            </div>
                            <div class="p-4 rounded-lg border border-[var(--border-color)]">
                                <h5 class="font-bold mb-2">Queue: GENERATION</h5>
                                <p class="text-xs text-muted">LLM generation (High Priority).</p>
                            </div>
                            <div class="p-4 rounded-lg border border-[var(--border-color)]">
                                <h5 class="font-bold mb-2">Queue: ANALYTICS</h5>
                                <p class="text-xs text-muted">Stats aggregation & Learning Loop.</p>
                            </div>
                        </div>
                    </div>
                </div>

                 <!-- Deep Dive Modals -->
                <div class="flex flex-wrap gap-4 justify-center">
                     <button class="btn-primary" onclick="openModal('Full Schema Reference', getKnowledgeLayerContent())">View Database Schema</button>
                     <button class="btn-primary bg-gray-700" onclick="openModal('Worker Config', getIntelligenceLayerContent())">View Worker Config</button>
                </div>
            </div>
        `,

        'constitution': `
            <div class="space-y-12">
                <div class="text-center mb-16">
                    <h2 class="text-5xl font-black gradient-text mb-6">The Constitution</h2>
                    <p class="text-2xl" style="color: var(--text-secondary);">Rules That Cannot Be Broken</p>
                </div>

                <div class="glass rounded-3xl p-12" style="background: var(--gradient-dark); color: white;">
                    <h3 class="text-3xl font-bold mb-6">The Final Law</h3>
                    <p class="text-2xl font-light">
                        "If a reply would improve short-term metrics at the expense of long-term trust, it is <span class="font-bold">INCORRECT</span>."
                    </p>
                </div>

                <div class="grid md:grid-cols-2 gap-8">
                    <div class="glass rounded-3xl p-8">
                        <h3 class="text-2xl font-bold mb-6">✅ Primary Objective</h3>
                        <p class="text-lg mb-4" style="color: var(--text-secondary);">
                            "Earn qualified, self-selecting clicks by clarifying relevance and fit — never by curiosity, pressure, or persuasion."
                        </p>
                    </div>

                    <div class="glass rounded-3xl p-8" style="border: 2px solid #FF5555;">
                        <h3 class="text-2xl font-bold mb-6" style="color: #FF5555;">❌ Non-Objectives</h3>
                        <ul class="space-y-2 text-muted">
                            <li>• Sell</li>
                            <li>• Convince</li>
                            <li>• Close</li>
                            <li>• Maximize clicks</li>
                            <li>• Manufacture urgency</li>
                            <li>• Inflate claims</li>
                        </ul>
                    </div>
                </div>

                <div class="glass rounded-3xl p-12">
                    <h3 class="text-3xl font-bold mb-8 text-center">Cognitive Sequence (ENFORCED)</h3>
                    <div class="space-y-4">
                        <div class="p-6 rounded-2xl" style="background: var(--gradient-aqua); color: white;">
                            <div class="flex items-center gap-4">
                                <div class="text-4xl font-black">1</div>
                                <div>
                                    <p class="font-bold text-lg">REFLECTION</p>
                                    <p class="opacity-90">Demonstrate accurate understanding</p>
                                </div>
                            </div>
                        </div>
                        <div class="p-6 rounded-2xl glass">
                            <div class="flex items-center gap-4">
                                <div class="text-4xl font-black gradient-text">2</div>
                                <div>
                                    <p class="font-bold text-lg">CLARIFICATION</p>
                                    <p class="text-muted">Explain the real decision being made</p>
                                </div>
                            </div>
                        </div>
                        <div class="p-6 rounded-2xl glass">
                            <div class="flex items-center gap-4">
                                <div class="text-4xl font-black gradient-text">3</div>
                                <div>
                                    <p class="font-bold text-lg">REFRAME</p>
                                    <p class="text-muted">Offer a clearer way to think about it</p>
                                </div>
                            </div>
                        </div>
                        <div class="p-6 rounded-2xl glass">
                            <div class="flex items-center gap-4">
                                <div class="text-4xl font-black gradient-text">4</div>
                                <div>
                                    <p class="font-bold text-lg">CHOICE</p>
                                    <p class="text-muted">Offer next step as optional and self-directed</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <p class="text-center mt-6 font-bold" style="color: #FF5555;">⚠️ SKIPPING STEPS IS NOT ALLOWED</p>
                </div>

                <div class="grid md:grid-cols-3 gap-6">
                    <div class="glass rounded-2xl p-6">
                        <h4 class="font-bold mb-4 text-lg">🚫 Claim Guardrails</h4>
                        <ul class="space-y-2 text-sm text-muted">
                            <li>• No guaranteed outcomes</li>
                            <li>• No specific ROI promises</li>
                            <li>• No universal effectiveness</li>
                            <li>• No deterministic results</li>
                        </ul>
                    </div>
                    <div class="glass rounded-2xl p-6">
                        <h4 class="font-bold mb-4 text-lg">🚫 Psychological Guardrails</h4>
                        <ul class="space-y-2 text-sm text-muted">
                            <li>• No urgency tactics</li>
                            <li>• No scarcity tactics</li>
                            <li>• No fear tactics</li>
                            <li>• No authority pressure</li>
                        </ul>
                    </div>
                    <div class="glass rounded-2xl p-6">
                        <h4 class="font-bold mb-4 text-lg">🚫 Technical Guardrails</h4>
                        <ul class="space-y-2 text-sm text-muted">
                            <li>• No data sourcing details</li>
                            <li>• No identity mechanics</li>
                            <li>• No deliverability tactics</li>
                            <li>• Abstraction mandatory</li>
                        </ul>
                    </div>
                </div>
            </div>
        `,

        'workflows': `
            <div class="space-y-12">
                <div class="text-center mb-16">
                    <h2 class="text-5xl font-black gradient-text mb-6">Visual Workflow Builder</h2>
                    <p class="text-2xl" style="color: var(--text-secondary);">React Flow-Based Content Engines</p>
                </div>

                <div class="glass rounded-3xl p-12">
                    <h3 class="text-3xl font-bold mb-8">How Workflows Work</h3>
                    <div class="grid md:grid-cols-2 gap-8">
                        <div>
                            <h4 class="text-xl font-bold mb-4 gradient-text">Create</h4>
                            <p class="text-muted mb-4">Build workflows visually using React Flow. Drag and drop nodes, configure each step, connect the flow.</p>
                            <ul class="space-y-2 text-sm text-muted">
                                <li>• Analyze nodes (intent classification)</li>
                                <li>• Retrieve nodes (RAG from KB)</li>
                                <li>• Generate nodes (LLM content creation)</li>
                                <li>• Validate nodes (constitution check)</li>
                                <li>• Output nodes (email, page, social)</li>
                            </ul>
                        </div>
                        <div>
                            <h4 class="text-xl font-bold mb-4 gradient-text">Deploy</h4>
                            <p class="text-muted mb-4">Save workflows as templates. Deploy them to workers via BullMQ. Execute asynchronously at scale.</p>
                            <ul class="space-y-2 text-sm text-muted">
                                <li>• Save workflow as template</li>
                                <li>• Deploy to worker queue</li>
                                <li>• Workers execute the engine</li>
                                <li>• Results returned via API</li>
                                <li>• Stats fed back to learning loop</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div class="glass rounded-3xl p-12">
                    <h3 class="text-3xl font-bold mb-6">Example: Email Reply Workflow</h3>
                    <div class="space-y-6">
                        <div class="flex items-center gap-6">
                            <div class="w-32 h-20 rounded-2xl flex items-center justify-center text-white font-bold" style="background: var(--gradient-aqua);">
                                ANALYZE
                            </div>
                            <div class="flex-1">
                                <p class="font-semibold mb-1">Scenario Detection</p>
                                <p class="text-sm text-muted">Claude identifies: pricing question, trust concern, buyer stage</p>
                            </div>
                        </div>
                        <div class="text-center text-2xl gradient-text">↓</div>
                        <div class="flex items-center gap-6">
                            <div class="w-32 h-20 rounded-2xl flex items-center justify-center text-white font-bold" style="background: var(--gradient-aqua);">
                                RETRIEVE
                            </div>
                            <div class="flex-1">
                                <p class="font-semibold mb-1">KB Lookup</p>
                                <p class="text-sm text-muted">Fetch relevant angles, strategies, constitution rules</p>
                            </div>
                        </div>
                        <div class="text-center text-2xl gradient-text">↓</div>
                        <div class="flex items-center gap-6">
                            <div class="w-32 h-20 rounded-2xl flex items-center justify-center text-white font-bold" style="background: var(--gradient-aqua);">
                                GENERATE
                            </div>
                            <div class="flex-1">
                                <p class="font-semibold mb-1">Draft Reply</p>
                                <p class="text-sm text-muted">Gemini writes following cognitive sequence: Reflect → Clarify → Reframe → Choice</p>
                            </div>
                        </div>
                        <div class="text-center text-2xl gradient-text">↓</div>
                        <div class="flex items-center gap-6">
                            <div class="w-32 h-20 rounded-2xl flex items-center justify-center text-white font-bold" style="background: var(--gradient-aqua);">
                                VALIDATE
                            </div>
                            <div class="flex-1">
                                <p class="font-semibold mb-1">Constitution Check</p>
                                <p class="text-sm text-muted">All guardrails verified. PASS → Output. FAIL → Reject with reason</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="grid md:grid-cols-2 gap-8">
                    <div class="glass rounded-3xl p-8">
                        <h3 class="text-2xl font-bold mb-6">Worker Execution</h3>
                        <p class="text-muted mb-6">Workers pull jobs from BullMQ, execute the saved workflow, return results.</p>
                        <div class="space-y-3">
                            <div class="p-3 rounded-lg" style="background: var(--bg-secondary);">
                                <p class="font-semibold">1. Job Queued</p>
                                <p class="text-sm text-muted">Request added to BullMQ</p>
                            </div>
                            <div class="p-3 rounded-lg" style="background: var(--bg-secondary);">
                                <p class="font-semibold">2. Worker Picks Up</p>
                                <p class="text-sm text-muted">Loads workflow template</p>
                            </div>
                            <div class="p-3 rounded-lg" style="background: var(--bg-secondary);">
                                <p class="font-semibold">3. Execute Nodes</p>
                                <p class="text-sm text-muted">Runs each step sequentially</p>
                            </div>
                            <div class="p-3 rounded-lg" style="background: var(--bg-secondary);">
                                <p class="font-semibold">4. Return Output</p>
                                <p class="text-sm text-muted">Results via API</p>
                            </div>
                        </div>
                    </div>

                    <div class="glass rounded-3xl p-8">
                        <h3 class="text-2xl font-bold mb-6">Output Types</h3>
                        <p class="text-muted mb-6">Workflows can generate any type of content:</p>
                        <div class="space-y- 3">
                            <div class="p-4 rounded-lg" style="background: var(--gradient-aqua); color: white;">
                                <p class="font-bold">📧 Email Flows</p>
                                <p class="text-sm opacity-90">Multi-step sequences</p>
                            </div>
                            <div class="p-4 rounded-lg glass">
                                <p class="font-bold">💬 Email Replies</p>
                                <p class="text-sm text-muted">Constitutional responses</p>
                            </div>
                            <div class="p-4 rounded-lg glass">
                                <p class="font-bold">🌐 Landing Pages</p>
                                <p class="text-sm text-muted">HTML + Tailwind output</p>
                            </div>
                            <div class="p-4 rounded-lg glass">
                                <p class="font-bold">📱 Social Content</p>
                                <p class="text-sm text-muted">Platform-specific posts</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `,

        'learning': `
            <div class="space-y-12">
                <div class="text-center mb-16">
                    <h2 class="text-5xl font-black gradient-text mb-6">The Learning Loop</h2>
                    <p class="text-2xl" style="color: var(--text-secondary);">How Axiom Gets Smarter Every Day</p>
                </div>

                <div class="glass rounded-3xl p-12" style="background: var(--gradient-dark); color: white;">
                    <h3 class="text-3xl font-bold mb-4 text-center">Daily @ 06:00 AM Eastern</h3>
                    <p class="text-xl text-center opacity-90">
                        Yesterday's stats → Evaluate → Update KB → Tomorrow's content is smarter
                    </p>
                </div>

                <div class="grid md:grid-cols-4 gap-6">
                    <div class="card glass rounded-3xl p-6">
                        <div class="text-4xl mb-4">📥</div>
                        <h4 class="text-xl font-bold mb-3">1. INGEST</h4>
                        <p class="text-sm text-muted">Fetch yesterday's stats from Mailwiz: clicks, replies, booked calls, bounces</p>
                    </div>
                    <div class="card glass rounded-3xl p-6">
                        <div class="text-4xl mb-4">📊</div>
                        <h4 class="text-xl font-bold mb-3">2. EVALUATE</h4>
                        <p class="text-sm text-muted">Group by ICP, angle, variant. Calculate booked_call_rate and other metrics</p>
                    </div>
                    <div class="card glass rounded-3xl p-6">
                        <div class="text-4xl mb-4">⚙️</div>
                        <h4 class="text-xl font-bold mb-3">3. APPLY RULES</h4>
                        <p class="text-sm text-muted">Promotion, demotion, and safety rules. Identify winners and pause underperformers</p>
                    </div>
                    <div class="card glass rounded-3xl p-6">
                        <div class="text-4xl mb-4">💾</div>
                        <h4 class="text-xl font-bold mb-3">4. UPDATE KB</h4>
                        <p class="text-sm text-muted">Create preferences, pause patterns, log history. Tomorrow uses today's learnings</p>
                    </div>
                </div>

                <div class="glass rounded-3xl p-12">
                    <h3 class="text-3xl font-bold mb-8">Example Learning Cycle</h3>
                    <div class="space-y-6">
                        <div class="p-6 rounded-2xl" style="background: var(--bg-secondary);">
                            <h4 class="font-bold mb-4 text-xl">Yesterday's Data:</h4>
                            <div class="grid md:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p class="text-muted mb-2">Enterprise + risk_001 + variant_A:</p>
                                    <p class="font-semibold" style="color: #00DD88;">✓ booked_call_rate = 3.2% (ABOVE THRESHOLD)</p>
                                </div>
                                <div>
                                    <p class="text-muted mb-2">Enterprise + control_001 + variant_B:</p>
                                    <p class="font-semibold" style="color: #FF5555;">✗ booked_call_rate = 0.4% (BELOW THRESHOLD)</p>
                                </div>
                            </div>
                        </div>

                        <div class="text-center text-2xl gradient-text">↓</div>

                        <div class="p-6 rounded-2xl" style="background: var(--gradient-aqua); color: white;">
                            <h4 class="font-bold mb-4 text-xl">Rules Applied:</h4>
                            <div class="space-y-3">
                                <div class="flex items-center gap-3">
                                    <span class="text-2xl">✅</span>
                                    <p><strong>PROMOTE</strong> risk_001 for Enterprise (3.2% = 8x higher than average)</p>
                                </div>
                                <div class="flex items-center gap-3">
                                    <span class="text-2xl">⬇️</span>
                                    <p><strong>DEMOTE</strong> control_001 for Enterprise (below threshold)</p>
                                </div>
                            </div>
                        </div>

                        <div class="text-center text-2xl gradient-text">↓</div>

                        <div class="p-6 rounded-2xl glass">
                            <h4 class="font-bold mb-4 text-xl">KB Updated:</h4>
                            <div class="p-4 rounded-lg font-mono text-sm" style="background: var(--bg-secondary);">
                                <pre>{
  "preference_type": "PREFER_ANGLE",
  "preferred_ids": ["risk_001"],
  "applies_to": { "icp_id": "ent_001" },
  "reason": "3.2% booked_call_rate in 7-day window"
}</pre>
                            </div>
                        </div>

                        <div class="text-center text-2xl gradient-text">↓</div>

                        <div class="p-6 rounded-2xl" style="background: var(--gradient-dark); color: white;">
                            <h4 class="font-bold mb-4 text-xl">Tomorrow's Impact:</h4>
                            <p class="text-lg">Enterprise emails will now favor <strong>risk angle</strong> over control angle. System automatically improved.</p>
                        </div>
                    </div>
                </div>

                <div class="grid md:grid-cols-3 gap-6">
                    <div class="glass rounded-2xl p-6">
                        <h4 class="font-bold mb-4 gradient-text">Promotion Rules</h4>
                        <ul class="space-y-2 text-sm text-muted">
                            <li>• TOP_N performers</li>
                            <li>• Threshold-based</li>
                            <li>• Context-specific</li>
                            <li>• Max winners per context</li>
                        </ul>
                    </div>
                    <div class="glass rounded-2xl p-6">
                        <h4 class="font-bold mb-4 gradient-text">Demotion Rules</h4>
                        <ul class="space-y-2 text-sm text-muted">
                            <li>• BOTTOM_N performers</li>
                            <li>• Below threshold</li>
                            <li>• Weight reduction</li>
                            <li>• Max losers per context</li>
                        </ul>
                    </div>
                    <div class="glass rounded-2xl p-6">
                        <h4 class="font-bold mb-4" style="color: #FF5555;">Safety Rules</h4>
                        <ul class="space-y-2 text-sm text-muted">
                            <li>• Guardrail breach → PAUSE</li>
                            <li>• 7-day cooldown period</li>
                            <li>• Manual resume only</li>
                            <li>• Alert on breach</li>
                        </ul>
                    </div>
                </div>
            </div>
        `,

        'roadmap': `
            <div class="space-y-12">
                <div class="text-center mb-16">
                    <h2 class="text-5xl font-black gradient-text mb-6">Implementation Roadmap</h2>
                    <p class="text-2xl" style="color: var(--text-secondary);">10-Week Phased Development</p>
                </div>

                <div class="space-y-8">
                    <div class="card glass rounded-3xl p-8 hover:scale-105 transition-transform">
                        <div class="flex items-center justify-between mb-6">
                            <div>
                                <h3 class="text-3xl font-bold gradient-text">Phase 1: KB & Constitution</h3>
                                <p class="text-muted">Week 1-2</p>
                            </div>
                            <div class="text-5xl">🧠</div>
                        </div>
                        <p class="text-lg mb-4" style="color: var(--text-secondary);">The brain has something to think with.</p>
                        <div class="grid md:grid-cols-2 gap-4">
                            <div>
                                <h4 class="font-semibold mb-2">Database:</h4>
                                <ul class="space-y-1 text-sm text-muted">
                                    <li>• KB schema (ICPs, offers, angles, strategies)</li>
                                    <li>• Constitution rules table</li>
                                    <li>• Learning preferences table</li>
                                </ul>
                            </div>
                            <div>
                                <h4 class="font-semibold mb-2">Services:</h4>
                                <ul class="space-y-1 text-sm text-muted">
                                    <li>• KB management UI</li>
                                    <li>• ConstitutionalValidator service</li>
                                    <li>• Auto-embedding pipeline</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div class="card glass rounded-3xl p-8 hover:scale-105 transition-transform">
                        <div class="flex items-center justify-between mb-6">
                            <div>
                                <h3 class="text-3xl font-bold gradient-text">Phase 2: Writer Engine</h3>
                                <p class="text-muted">Week 3-4</p>
                            </div>
                            <div class="text-5xl">✍️</div>
                        </div>
                        <p class="text-lg mb-4" style="color: var(--text-secondary);">Generate content from KB.</p>
                        <div class="grid md:grid-cols-2 gap-4">
                            <div>
                                <h4 class="font-semibold mb-2">Workflows:</h4>
                                <ul class="space-y-1 text-sm text-muted">
                                    <li>• React Flow visual builder</li>
                                    <li>• Email flow generation</li>
                                    <li>• Reply generation (cognitive sequence)</li>
                                    <li>• Landing page generation</li>
                                </ul>
                            </div>
                            <div>
                                <h4 class="font-semibold mb-2">Nodes:</h4>
                                <ul class="space-y-1 text-sm text-muted">
                                    <li>• Analyze, Retrieve, Generate, Validate</li>
                                    <li>• Constitution integration</li>
                                    <li>• Multi-provider AI selection</li>
                                    <li>• Output formatting</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div class="card glass rounded-3xl p-8 hover:scale-105 transition-transform">
                        <div class="flex items-center justify-between mb-6">
                            <div>
                                <h3 class="text-3xl font-bold gradient-text">Phase 3: IMT Integration</h3>
                                <p class="text-muted">Week 5-6</p>
                            </div>
                            <div class="text-5xl">🔌</div>
                        </div>
                        <p class="text-lg mb-4" style="color: var(--text-secondary);">Connect to their infrastructure.</p>
                        <div class="grid md:grid-cols-2 gap-4">
                            <div>
                                <h4 class="font-semibold mb-2">API Endpoints:</h4>
                                <ul class="space-y-1 text-sm text-muted">
                                    <li>• POST /api/brain/input (job submission)</li>
                                    <li>• GET /api/brain/status/:id (polling)</li>
                                    <li>• GET /api/brain/output/:id (retrieval)</li>
                                    <li>• POST /api/brain/webhooks/stats</li>
                                </ul>
                            </div>
                            <div>
                                <h4 class="font-semibold mb-2">Integration:</h4>
                                <ul class="space-y-1 text-sm text-muted">
                                    <li>• n8n → Axiom API calls</li>
                                    <li>• Mailwiz stats webhooks</li>
                                    <li>• Worker queue integration</li>
                                    <li>• Documentation for IMT team</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div class="card glass rounded-3xl p-8 hover:scale-105 transition-transform">
                        <div class="flex items-center justify-between mb-6">
                            <div>
                                <h3 class="text-3xl font-bold gradient-text">Phase 4: Learning Loop</h3>
                                <p class="text-muted">Week 7-8</p>
                            </div>
                            <div class="text-5xl">📈</div>
                        </div>
                        <p class="text-lg mb-4" style="color: var(--text-secondary);">The system gets smarter daily.</p>
                        <div class="grid md:grid-cols-2 gap-4">
                            <div>
                                <h4 class="font-semibold mb-2">Analytics:</h4>
                                <ul class="space-y-1 text-sm text-muted">
                                    <li>• Daily aggregation (06:00 AM ET)</li>
                                    <li>• Metric calculation by context</li>
                                    <li>• Stats storage & history</li>
                                </ul>
                            </div>
                            <div>
                                <h4 class="font-semibold mb-2">Rules Engine:</h4>
                                <ul class="space-y-1 text-sm text-muted">
                                    <li>• Promotion/demotion rules</li>
                                    <li>• Safety guardrails</li>
                                    <li>• KB preference updates</li>
                                    <li>• Learning dashboard</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div class="card glass rounded-3xl p-8 hover:scale-105 transition-transform">
                        <div class="flex items-center justify-between mb-6">
                            <div>
                                <h3 class="text-3xl font-bold gradient-text">Phase 5: Testing & Optimization</h3>
                                <p class="text-muted">Week 9-10</p>
                            </div>
                            <div class="text-5xl">⚡</div>
                        </div>
                        <p class="text-lg mb-4" style="color: var(--text-secondary);">A/B testing and continuous improvement.</p>
                        <div class="grid md:grid-cols-2 gap-4">
                            <div>
                                <h4 class="font-semibold mb-2">Testing:</h4>
                                <ul class="space-y-1 text-sm text-muted">
                                    <li>• Variant assignment logic</li>
                                    <li>• Statistical significance</li>
                                    <li>• Winner declaration</li>
                                </ul>
                            </div>
                            <div>
                                <h4 class="font-semibold mb-2">Automation:</h4>
                                <ul class="space-y-1 text-sm text-muted">
                                    <li>• Auto-pause on guardrail breach</li>
                                    <li>• Throttling system</li>
                                    <li>• Alert system</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="glass rounded-3xl p-12 mt-12" style="background: var(--gradient-dark); color: white;">
                    <h3 class="text-3xl font-bold mb-6 text-center">Timeline Summary</h3>
                    <div class="grid md:grid-cols-5 gap-4 text-center">
                        <div>
                            <p class="font-bold text-2xl mb-2">W1-2</p>
                            <p class="opacity-90">KB & Rules</p>
                        </div>
                        <div>
                            <p class="font-bold text-2xl mb-2">W3-4</p>
                            <p class="opacity-90">Writer Engine</p>
                        </div>
                        <div>
                            <p class="font-bold text-2xl mb-2">W5-6</p>
                            <p class="opacity-90">IMT Integration</p>
                        </div>
                        <div>
                            <p class="font-bold text-2xl mb-2">W7-8</p>
                            <p class="opacity-90">Learning Loop</p>
                        </div>
                        <div>
                            <p class="font-bold text-2xl mb-2">W9-10</p>
                            <p class="opacity-90">Optimization</p>
                        </div>
                    </div>
                </div>
            </div>
        `
    };

    return contents[tabName] || `<div class="text-center py-20"><h2 class="text-4xl font-bold gradient-text">Content for ${tabName} coming soon...</h2></div>`;
}

// Modal Content Functions
function getKnowledgeLayerContent() {
    return `
        <div class="space-y-6">
            <p class="text-lg">The Knowledge Layer stores all the information the brain uses to generate content:</p>
            <div class="grid md:grid-cols-2 gap-4">
                <div class="p-4 rounded-lg" style="background: var(--bg-secondary);">
                    <h4 class="font-bold mb-2">KB Content</h4>
                    <ul class="text-sm text-muted space-y-1">
                        <li>• Brand voice & compliance</li>
                        <li>• ICP library (segments, pain points)</li>
                        <li>• Offer library (value props)</li>
                        <li>• Angle library (narrative primitives)</li>
                        <li>• CTA library</li>
                        <li>• Email flow blueprints</li>
                        <li>• Reply playbooks & strategies</li>
                    </ul>
                </div>
                <div class="p-4 rounded-lg" style="background: var(--bg-secondary);">
                    <h4 class="font-bold mb-2">Constitution</h4>
                    <ul class="text-sm text-muted space-y-1">
                        <li>• Hard constraints (guardrails)</li>
                        <li>• Cognitive sequence rules</li>
                        <li>• Claim safety rules</li>
                        <li>• Psychological safety rules</li>
                        <li>• Abort & deflection logic</li>
                    </ul>
                </div>
            </div>
            <div class="p-4 rounded-lg" style="background: var(--gradient-aqua); color: white;">
                <h4 class="font-bold mb-2">Analytics</h4>
                <p class="text-sm">Performance stats from Mailwiz that feed the learning loop.</p>
            </div>
        </div>
    `;
}

function getIntelligenceLayerContent() {
    return `
        <div class="space-y-6">
            <p class="text-lg">The Intelligence Layer processes requests and generates validated content:</p>
            <div class="space-y-4">
                <div class="p-4 rounded-lg" style="background: var(--bg-secondary);">
                    <h4 class="font-bold mb-2 gradient-text">RAG Engine</h4>
                    <p class="text-sm text-muted">Retrieves relevant KB chunks using vector search + reranking.</p>
                </div>
                <div class="p-4 rounded-lg" style="background: var(--bg-secondary);">
                    <h4 class="font-bold mb-2 gradient-text">Workflow Engine</h4>
                    <p class="text-sm text-muted">Visual React Flow builder. Create specialized pipelines (analyze → retrieve → generate → validate).</p>
                </div>
                <div class="p-4 rounded-lg" style="background: var(--bg-secondary);">
                    <h4 class="font-bold mb-2 gradient-text">Constitutional Validator</h4>
                    <p class="text-sm text-muted">Checks every output against ALL rules. Rejects anything that violates constraints.</p>
                </div>
                <div class="p-4 rounded-lg" style="background: var(--bg-secondary);">
                    <h4 class="font-bold mb-2 gradient-text">Learning Loop</h4>
                    <p class="text-sm text-muted">Daily optimization. Stats → Evaluate → Update KB → Smarter content tomorrow.</p>
                </div>
            </div>
        </div>
    `;
}

function getOutputLayerContent() {
    return `
        <div class="space-y-6">
            <p class="text-lg">The Output Layer is what the brain produces:</p>
            <div class="grid md:grid-cols-2 gap-4">
                <div class="p-6 rounded-lg" style="background: var(--gradient-aqua); color: white;">
                    <h4 class="font-bold mb-3 text-xl">📧 Email Flows</h4>
                    <p class="text-sm opacity-90">Multi-step sequences with delay configuration, subject/first-line variants, and CTA selection.</p>
                </div>
                <div class="p-6 rounded-lg" style="background: var(--gradient-aqua); color: white;">
                    <h4 class="font-bold mb-3 text-xl">💬 Email Replies</h4>
                    <p class="text-sm opacity-90">Constitutional responses following the 4-step cognitive sequence. Scenario-aware, strategy-driven.</p>
                </div>
                <div class="p-6 rounded-lg" style="background: var(--gradient-aqua); color: white;">
                    <h4 class="font-bold mb-3 text-xl">🌐 Landing Pages</h4>
                    <p class="text-sm opacity-90">Full HTML + Tailwind pages with section-based content, CTA placement, and routing logic.</p>
                </div>
                <div class="p-6 rounded-lg" style="background: var(--gradient-aqua); color: white;">
                    <h4 class="font-bold mb-3 text-xl">📱 Social Content</h4>
                    <p class="text-sm opacity-90">Platform-specific posts (LinkedIn, X, YouTube) with pillar alignment and angle application.</p>
                </div>
            </div>
            <p class="text-center text-muted mt-6">All outputs pass through constitutional validation before delivery.</p>
        </div>
    `;
}

function openExamples() {
    openModal('How It Works: Real Example', `
        <div class="space-y-6">
            <div class="p-6 rounded-lg" style="background: var(--bg-secondary);">
                <h4 class="font-bold mb-4 text-xl">Scenario: Pricing Question Reply</h4>
                <p class="text-muted mb-4"><strong>Incoming:</strong> "What does this cost? We've been burned by hidden fees before."</p>
                
                <div class="space-y-4">
                    <div>
                        <p class="font-semibold gradient-text">1. REFLECTION</p>
                        <p class="text-sm text-muted">"I hear you — getting burned by hidden fees is frustrating, and it makes complete sense that you'd want clarity upfront."</p>
                    </div>
                    <div>
                        <p class="font-semibold gradient-text">2. CLARIFICATION</p>
                        <p class="text-sm text-muted">"The core decision here is actually about what you're paying for. Most services charge for impressions or 'leads' that may or may not turn into anything real."</p>
                    </div>
                    <div>
                        <p class="font-semibold gradient-text">3. REFRAME</p>
                        <p class="text-sm text-muted">"Our model is different: you only pay when someone actually clicks, and that click produces a full buyer record with their identity. No clicks, no charge. No hidden fees, no minimums."</p>
                    </div>
                    <div>
                        <p class="font-semibold gradient-text">4. CHOICE</p>
                        <p class="text-sm text-muted">"If it would be helpful, I could walk you through exactly how pricing works for your specific situation — just let me know."</p>
                    </div>
                </div>

                <div class="mt-6 p-4 rounded-lg" style="background: var(--gradient-aqua); color: white;">
                    <p class="font-bold mb-2">✅ Validation Passed:</p>
                    <ul class="text-sm space-y-1">
                        <li>• All 4 cognitive steps present</li>
                        <li>• No guaranteed outcomes</li>
                        <li>• No urgency tactics</li>
                        <li>• Choice is optional</li>
                    </ul>
                </div>
            </div>
        </div>
    `);
}
