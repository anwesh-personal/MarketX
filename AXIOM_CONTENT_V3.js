
// AXIOM Vision Presentation - Tab Content V3
// Definitive "Best Of" Compilation + Deep Dive Tech Specs

function getTabContent(tabName) {
    const contents = {
        'overview': `
            <div class="max-w-7xl mx-auto px-6 py-20 space-y-12">
                <div class="text-center mb-16">
                    <h2 class="text-5xl font-black gradient-text mb-6">What is AXIOM?</h2>
                    <p class="text-2xl" style="color: var(--text-secondary);">The Intelligence Layer for Email Marketing</p>
                </div>

                <div class="grid md:grid-cols-3 gap-8">
                    <div class="card rounded-3xl p-8" data-tippy-content="RAG-powered retrieval with multi-model orchestration" style="background: rgba(0, 42, 82, 0.95); border: 1px solid rgba(0, 212, 170, 0.3);">
                        <div class="text-4xl mb-4">🧠</div>
                        <h3 class="text-2xl font-bold mb-4" style="color: #FFFFFF;">The Brain</h3>
                        <p style="color: #FFFFFF;">Axiom is the AI engine that powers InMarketTraffic's content generation, turning your knowledge base into intelligent, trust-building communications.</p>
                    </div>

                    <div class="card rounded-3xl p-8" data-tippy-content="Hard constraints validated against every output" style="background: rgba(0, 42, 82, 0.95); border: 1px solid rgba(0, 212, 170, 0.3);">
                        <div class="text-4xl mb-4">⚖️</div>
                        <h3 class="text-2xl font-bold mb-4" style="color: #FFFFFF;">Constitutional AI</h3>
                        <p style="color: #FFFFFF;">Every piece of content is validated against hard rules. If it would help today's metrics but hurt long-term trust, it gets rejected.</p>
                    </div>

                    <div class="card rounded-3xl p-8" data-tippy-content="Daily learning loop at 06:00 AM ET optimizes performance" style="background: rgba(0, 42, 82, 0.95); border: 1px solid rgba(0, 212, 170, 0.3);">
                        <div class="text-4xl mb-4">📈</div>
                        <h3 class="text-2xl font-bold mb-4" style="color: #FFFFFF;">Self-Healing</h3>
                        <p style="color: #FFFFFF;">A daily learning loop ingests performance data, identifies what works, and automatically improves tomorrow's content.</p>
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
            <div class="max-w-7xl mx-auto px-6 py-20 space-y-16">
                <div class="text-center mb-16">
                    <h2 class="text-5xl font-black gradient-text mb-6">InMarket Traffic</h2>
                    <p class="text-2xl" style="color: var(--text-secondary);">The Business Axiom Powers</p>
                </div>

                <!-- What IMT Does -->
                <div class="glass rounded-3xl p-12">
                    <h3 class="text-4xl font-bold mb-8">What is InMarketTraffic?</h3>
                    <p class="text-2xl mb-10" style="color: var(--text-secondary);">
                        IMT is a <span class="gradient-text font-bold">B2B market activation system</span> that helps companies reach their entire ICP and start real conversations by paying only for verified, identity-linked clicks.
                    </p>
                    <div class="grid md:grid-cols-2 gap-8">
                        <div class="glass rounded-2xl p-8" style="background: var(--bg-secondary);">
                            <h4 class="font-bold mb-6 gradient-text text-2xl">✓ What IMT IS</h4>
                            <ul class="space-y-3 text-lg" style="color: #E0F0F5;">
                                <li class="flex items-start gap-3">
                                    <span class="gradient-text font-bold">•</span>
                                    <span>Identity-linked CPC traffic (pay per verified click)</span>
                                </li>
                                <li class="flex items-start gap-3">
                                    <span class="gradient-text font-bold">•</span>
                                    <span>Email-driven conversations that lead to sales</span>
                                </li>
                                <li class="flex items-start gap-3">
                                    <span class="gradient-text font-bold">•</span>
                                    <span>Full buyer record with every click</span>
                                </li>
                                <li class="flex items-start gap-3">
                                    <span class="gradient-text font-bold">•</span>
                                    <span>Proprietary identity graph</span>
                                </li>
                            </ul>
                        </div>
                        <div class="glass rounded-2xl p-8" style="background: var(--bg-secondary);">
                            <h4 class="font-bold mb-6 text-2xl" style="color: #FF8888;">✗ What IMT IS NOT</h4>
                            <ul class="space-y-3 text-lg" style="color: #E0F0F5;">
                                <li class="flex items-start gap-3">
                                    <span style="color: #FF5555;">•</span>
                                    <span>Not an ad platform (no impressions)</span>
                                </li>
                                <li class="flex items-start gap-3">
                                    <span style="color: #FF5555;">•</span>
                                    <span>Not a list broker (owned identity graph)</span>
                                </li>
                                <li class="flex items-start gap-3">
                                    <span style="color: #FF5555;">•</span>
                                    <span>Not intent data resale (real conversations)</span>
                                </li>
                                <li class="flex items-start gap-3">
                                    <span style="color: #FF5555;">•</span>
                                    <span>Not a lead vendor (quality over volume)</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                <!-- Business Flow -->
                <div class="glass rounded-3xl p-12">
                    <h3 class="text-4xl font-bold mb-10 text-center gradient-text">The IMT Business Flow</h3>
                    <div class="space-y-8">
                        <div class="flex items-center gap-6">
                            <div class="w-48 glass rounded-xl p-6 text-center">
                                <p class="text-2xl mb-2">🏢</p>
                                <p class="font-bold">B2B Client</p>
                            </div>
                            <div class="flex-1 text-center">
                                <div class="text-2xl gradient-text mb-2">→</div>
                                <p class="text-sm" style="color: var(--text-muted);">Pays CPC</p>
                            </div>
                            <div class="w-48 glass rounded-xl p-6 text-center">
                                <p class="text-2xl mb-2">⚡</p>
                                <p class="font-bold">IMT Engine</p>
                            </div>
                            <div class="flex-1 text-center">
                                <div class="text-2xl gradient-text mb-2">→</div>
                                <p class="text-sm" style="color: var(--text-muted);">Sends Emails</p>
                            </div>
                            <div class="w-48 glass rounded-xl p-6 text-center">
                                <p class="text-2xl mb-2">📧</p>
                                <p class="font-bold">ICP List</p>
                            </div>
                        </div>
                        
                        <div class="flex items-center gap-6">
                            <div class="w-48"></div>
                            <div class="flex-1 text-center">
                                <div class="text-2xl gradient-text">↑</div>
                                <p class="text-sm" style="color: var(--text-muted);">Buyer Records</p>
                            </div>
                            <div class="w-48"></div>
                            <div class="flex-1 text-center">
                                <div class="text-2xl gradient-text">↓</div>
                                <p class="text-sm" style="color: var(--text-muted);">Clicks</p>
                            </div>
                            <div class="w-48"></div>
                        </div>
                        
                        <div class="p-8 rounded-2xl text-center" style="background: var(--gradient-aqua); color: white;">
                            <p class="text-2xl font-bold mb-2">💰 VERIFIED CLICK</p>
                            <p class="text-lg">= Buyer Record = Conversation = Opportunity</p>
                        </div>
                    </div>
                </div>

                <!-- Where Axiom Fits -->
                <div class="glass rounded-3xl p-12">
                    <h3 class="text-4xl font-bold mb-10 text-center gradient-text">Where Axiom Fits</h3>
                    <div class="space-y-6">
                        <div class="p-6 rounded-2xl" style="background: var(--bg-secondary);">
                            <div class="flex items-center gap-6">
                                <div class="text-4xl">🔧</div>
                                <div class="flex-1">
                                    <h4 class="text-xl font-bold mb-2">IMT Infrastructure</h4>
                                    <p style="color: #E0F0F5;">Identity Graph • Mailwiz Email Delivery • n8n Workflows • API Layer</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="p-6 rounded-2xl" style="background: linear-gradient(135deg, rgba(0,212,170,0.2) 0%, rgba(0,153,204,0.2) 100%);">
                            <div class="flex items-center gap-6">
                                <div class="text-4xl">🧠</div>
                                <div class="flex-1">
                                    <h4 class="text-2xl font-black mb-2 gradient-text">AXIOM — The Brain</h4>
                                    <p class="text-lg font-semibold" style="color: var(--text-primary);">Content Generation • Reply Logic • Constitutional Guardrails • Learning Loop</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="p-6 rounded-2xl" style="background: var(--bg-secondary);">
                            <div class="flex items-center gap-6">
                                <div class="text-4xl">📊</div>
                                <div class="flex-1">
                                    <h4 class="text-xl font-bold mb-2">IMT Analytics</h4>
                                    <p style="color: #E0F0F5;">Stats Tracking • Buyer Records • Call Bookings • Performance Data</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <p class="text-2xl text-center mt-10 font-light" style="color: var(--text-secondary);">
                        <span class="gradient-text font-bold">Axiom is the BRAIN.</span> Everything else is plumbing.
                    </p>
                </div>
            </div>
        `,

        'architecture': `
            <div class="max-w-7xl mx-auto px-6 py-20 space-y-12">
                <div class="text-center mb-16">
                    <h2 class="text-5xl font-black gradient-text mb-6">System Architecture</h2>
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
                        </div>
                        <div class="p-6 rounded-2xl" style="background: var(--bg-secondary);">
                            <h4 class="font-bold mb-2">2. The Compiler</h4>
                            <p class="text-sm text-muted">
                                Converts the visual graph into a JSON execution plan. Validates connections and required inputs.
                            </p>
                        </div>
                        <div class="p-6 rounded-2xl" style="background: var(--bg-secondary);">
                            <h4 class="font-bold mb-2">3. The Execution</h4>
                            <p class="text-sm text-muted">
                                Workers pick up the plan. Each node type (LLM, RAG, Code) has a dedicated processor.
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Worker Architecture -->
                <div class="glass rounded-3xl p-12">
                    <h3 class="text-3xl font-bold mb-8">Distributed Worker System</h3>
                    <div class="space-y-6">
                        <div class="flex items-center gap-6">
                            <div class="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold bg-[var(--bg-secondary)] border border-[var(--border-color)]">API</div>
                            <div class="flex-1">
                                <div class="h-1 bg-[var(--border-color)] relative">
                                    <div class="absolute inset-0 bg-[var(--aqua-primary)] w-1/2 animate-pulse"></div>
                                </div>
                                <p class="text-xs text-center mt-2 text-muted">Job Submission (Redis)</p>
                            </div>
                            <div class="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold bg-[var(--aqua-primary)] text-white shadow-lg shadow-[var(--aqua-primary)]/20">Q</div>
                            <div class="flex-1">
                                <div class="h-1 bg-[var(--border-color)] relative">
                                    <div class="absolute inset-0 bg-[var(--aqua-primary)] w-1/2 animate-pulse" style="animation-delay: 0.5s"></div>
                                </div>
                                <p class="text-xs text-center mt-2 text-muted">Job Pickup</p>
                            </div>
                            <div class="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold bg-[var(--bg-secondary)] border border-[var(--border-color)]">W</div>
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
                    <button class="btn-primary" onclick="openModal('Full Database Schema', getDatabaseSchemaContent())">View Database Schema</button>
                    <button class="btn-primary bg-gray-700" onclick="openModal('Worker Config', getIntelligenceLayerContent())">View Worker Config</button>
                </div>
            </div>
        `,

        'constitution': `
             <div class="max-w-7xl mx-auto px-6 py-20 space-y-12">
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
                </div>
            </div>
        `,

        'workflows': `
            <div class="max-w-7xl mx-auto px-6 py-20 space-y-12">
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
                            </ul>
                        </div>
                        <div>
                            <h4 class="text-xl font-bold mb-4 gradient-text">Deploy</h4>
                            <p class="text-muted mb-4">Save workflows as templates. Deploy them to workers via BullMQ. Execute asynchronously at scale.</p>
                            <ul class="space-y-2 text-sm text-muted">
                                <li>• Save workflow as template</li>
                                <li>• Deploy to worker queue</li>
                                <li>• Workers execute the engine</li>
                                <li>• Stats fed back to learning loop</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `,

        'visualflow': `
            <div class="max-w-7xl mx-auto px-6 py-20 space-y-16">
                <div class="text-center mb-16">
                    <h2 class="text-6xl font-black gradient-text mb-6">Complete System Flow</h2>
                    <p class="text-2xl" style="color: var(--text-secondary);">End-to-End Technical Architecture</p>
                </div>

                <div class="glass rounded-3xl p-12">
                    <h3 class="text-4xl font-bold mb-8 text-center gradient-text">Data Journey: Email Request → Validated Reply</h3>
                    
                    <div class="space-y-12">
                        <!-- Layer 1: n8n -->
                        <div class="p-8 rounded-2xl" style="background: var(--bg-tertiary); border-left: 4px solid #00D4AA;">
                            <h4 class="text-2xl font-bold mb-4 gradient-text">1. n8n Orchestration Layer</h4>
                            <div class="grid md:grid-cols-3 gap-6">
                                <div class="glass rounded-xl p-6">
                                    <p  class="font-bold text-lg mb-2" style="color: var(--text-primary);">Email Received</p>
                                    <p class="text-sm" style="color: var(--text-muted);">Mailwiz → n8n webhook</p>
                                </div>
                                <div class="glass rounded-xl p-6">
                                    <p class="font-bold text-lg mb-2" style="color: var(--text-primary);">Call Axiom</p>
                                    <p class="text-sm mono" style="color: var(--text-muted);">POST /api/brain/input</p>
                                </div>
                            </div>
                        </div>

                        <div class="text-center text-4xl gradient-text">↓</div>

                        <!-- Layer 2: Axiom API -->
                        <div class="p-8 rounded-2xl" style="background: var(--bg-tertiary); border-left: 4px solid #0099CC;">
                            <h4 class="text-2xl font-bold mb-4 gradient-text">2. Axiom API Layer</h4>
                            <div class="grid md:grid-cols-3 gap-6">
                                <div class="glass rounded-xl p-6">
                                    <p class="font-bold text-lg mb-2" style="color: var(--text-primary);">Job Queued</p>
                                    <p class="text-sm" style="color: var(--text-muted);">BullMQ + Redis</p>
                                </div>
                                <div class="glass rounded-xl p-6">
                                    <p class="font-bold text-lg mb-2" style="color: var(--text-primary);">Return Job ID</p>
                                    <p class="text-sm mono" style="color: var(--text-muted);">{"job_id": "uuid..."}</p>
                                </div>
                            </div>
                        </div>

                        <div class="text-center text-4xl gradient-text">↓</div>

                        <!-- Layer 3: The Brain -->
                        <div class="p-10 rounded-2xl" style="background: linear-gradient(135deg, rgba(0,212,170,0.15) 0%, rgba(0,153,204,0.15) 100%); border: 2px solid var(--aqua-primary);">
                            <h4 class="text-3xl font-black mb-8 text-center gradient-text">🧠 THE BRAIN ENGINE</h4>
                            <div class="grid md:grid-cols-4 gap-6">
                                <div class="card glass rounded-xl p-6">
                                    <div class="text-4xl mb-3">1️⃣</div>
                                    <p class="font-bold text-lg mb-2">ANALYZE</p>
                                    <p class="text-sm" style="color: var(--text-muted);">Intent classification</p>
                                </div>
                                <div class="card glass rounded-xl p-6">
                                    <div class="text-4xl mb-3">2️⃣</div>
                                    <p class="font-bold text-lg mb-2">RETRIEVE</p>
                                    <p class="text-sm" style="color: var(--text-muted);">RAG from KB</p>
                                </div>
                                <div class="card glass rounded-xl p-6">
                                    <div class="text-4xl mb-3">3️⃣</div>
                                    <p class="font-bold text-lg mb-2">GENERATE</p>
                                    <p class="text-sm" style="color: var(--text-muted);">Draft content</p>
                                </div>
                                <div class="card glass rounded-xl p-6">
                                    <div class="text-4xl mb-3">4️⃣</div>
                                    <p class="font-bold text-lg mb-2">VALIDATE</p>
                                    <p class="text-sm" style="color: var(--text-muted);">Constitution Check</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `,

        'learning': `
            <div class="max-w-7xl mx-auto px-6 py-20 space-y-16">
                <div class="text-center mb-16">
                    <h2 class="text-5xl font-black gradient-text mb-6">The Learning Loop</h2>
                    <p class="text-2xl" style="color: var(--text-secondary);">How Axiom Gets Smarter Every Day</p>
                </div>

                <div class="glass rounded-3xl p-12" style="background: var(--gradient-dark); color: white;">
                    <h3 class="text-4xl font-bold mb-4 text-center">Daily @ 06:00 AM Eastern</h3>
                    <p class="text-2xl text-center opacity-90">
                        Yesterday's stats → Evaluate → Update KB → Tomorrow's content is smarter
                    </p>
                </div>

                <div class="grid md:grid-cols-4 gap-6">
                    <div class="card rounded-3xl p-8" style="background: rgba(0, 42, 82, 0.95); border: 2px solid rgba(0, 212, 170, 0.5);">
                        <div class="text-5xl mb-4 text-center">📥</div>
                        <h3 class="text-2xl font-bold mb-4 text-center gradient-text">1. INGEST</h3>
                        <p style="color: #FFFFFF; text-align: center;">Fetch yesterday's email stats from Mailwiz</p>
                    </div>

                    <div class="card rounded-3xl p-8" style="background: rgba(0, 42, 82, 0.95); border: 2px solid rgba(0, 153, 204, 0.5);">
                        <div class="text-5xl mb-4 text-center">📊</div>
                        <h3 class="text-2xl font-bold mb-4 text-center gradient-text">2. EVALUATE</h3>
                        <p style="color: #FFFFFF; text-align: center;">Group by ICP, angle, offer. Calculate metrics</p>
                    </div>

                    <div class="card rounded-3xl p-8" style="background: rgba(0, 42, 82, 0.95); border: 2px solid rgba(0, 212, 170, 0.5);">
                        <div class="text-5xl mb-4 text-center">⚙️</div>
                        <h3 class="text-2xl font-bold mb-4 text-center gradient-text">3. APPLY RULES</h3>
                        <p style="color: #FFFFFF; text-align: center;">Promote winners, demote losers, pause failures</p>
                    </div>

                    <div class="card rounded-3xl p-8" style="background: rgba(0, 42, 82, 0.95); border: 2px solid rgba(0, 153, 204, 0.5);">
                        <div class="text-5xl mb-4 text-center">💾</div>
                        <h3 class="text-2xl font-bold mb-4 text-center gradient-text">4. UPDATE KB</h3>
                        <p style="color: #FFFFFF; text-align: center;">Write new preferences. Tomorrow uses them</p>
                    </div>
                </div>
            </div>
        `,

        'nerdtalk': `
        <div class="max-w-7xl mx-auto px-6 py-20 space-y-20">
                <div class="text-center mb-16">
                    <h2 class="text-6xl font-black gradient-text mb-6">🤓 Nerd Talk</h2>
                    <p class="text-2xl" style="color: var(--text-secondary);">Technical Integration Specifications</p>
                </div>

                <!--API Endpoints-->
                <div class="glass rounded-3xl p-12">
                    <h3 class="text-4xl font-bold mb-8 gradient-text">API Endpoints</h3>
                    <div class="space-y-6 mono">
                        <!-- Endpoint 1 -->
                        <div class="glass rounded-2xl p-6 hover:glow transition-all cursor-pointer" onclick="openModal('POST /api/brain/input', getNerdContent('input'))">
                            <div class="flex items-start justify-between mb-4">
                                <div>
                                    <span class="px-4 py-1 bg-green-500 text-white rounded-full text-sm font-bold">POST</span>
                                    <span class="ml-4 text-2xl font-bold" style="color: var(--aqua-accent);">/api/brain/input</span>
                                </div>
                                <span style="color: var(--text-muted);">Submit content generation request</span>
                            </div>
                            <p class="text-sm" style="color: var(--text-muted);">Click to see full spec →</p>
                        </div>

                        <!-- Endpoint 2 -->
                        <div class="glass rounded-2xl p-6 hover:glow transition-all cursor-pointer" onclick="openModal('GET /api/brain/status/:jobId', getNerdContent('status'))">
                            <div class="flex items-start justify-between mb-4">
                                <div>
                                    <span class="px-4 py-1 bg-blue-500 text-white rounded-full text-sm font-bold">GET</span>
                                    <span class="ml-4 text-2xl font-bold" style="color: var(--aqua-accent);">/api/brain/status/:jobId</span>
                                </div>
                                <span style="color: var(--text-muted);">Poll job status</span>
                            </div>
                            <p class="text-sm" style="color: var(--text-muted);">Click to see full spec →</p>
                        </div>

                        <!-- Endpoint 3 -->
                        <div class="glass rounded-2xl p-6 hover:glow transition-all cursor-pointer" onclick="openModal('GET /api/brain/output/:jobId', getNerdContent('output'))">
                            <div class="flex items-start justify-between mb-4">
                                <div>
                                    <span class="px-4 py-1 bg-blue-500 text-white rounded-full text-sm font-bold">GET</span>
                                    <span class="ml-4 text-2xl font-bold" style="color: var(--aqua-accent);">/api/brain/output/:jobId</span>
                                </div>
                                <span style="color: var(--text-muted);">Fetch completed output</span>
                            </div>
                            <p class="text-sm" style="color: var(--text-muted);">Click to see full spec →</p>
                        </div>

                        <!-- Endpoint 4 -->
                        <div class="glass rounded-2xl p-6 hover:glow transition-all cursor-pointer" onclick="openModal('POST /api/brain/webhooks/stats', getNerdContent('webhook'))">
                            <div class="flex items-start justify-between mb-4">
                                <div>
                                    <span class="px-4 py-1 bg-green-500 text-white rounded-full text-sm font-bold">POST</span>
                                    <span class="ml-4 text-2xl font-bold" style="color: var(--aqua-accent);">/api/brain/webhooks/stats</span>
                                </div>
                                <span style="color: var(--text-muted);">Receive Mailwiz stats</span>
                            </div>
                            <p class="text-sm" style="color: var(--text-muted);">Click to see full spec →</p>
                        </div>
                    </div>
                </div>

                <!-- Database Schema -->
                <div class="glass rounded-3xl p-12">
                    <h3 class="text-4xl font-bold mb-8 gradient-text">Database Schema Highlights</h3>
                    <div class="grid md:grid-cols-2 gap-6 mono text-sm">
                        <div class="glass rounded-2xl p-6" style="background: var(--bg-secondary);">
                            <h4 class="text-lg font-bold mb-4" style="color: var(--aqua-accent);">Core Tables (Implemented)</h4>
                            <ul class="space-y-2" style="color: var(--text-muted);">
                                <li>• <span style="color: var(--text-primary);">organizations</span> - Multi-tenant isolation</li>
                                <li>• <span style="color: var(--text-primary);">platform_admins</span> - Superadmin access</li>
                                <li>• <span style="color: var(--text-primary);">ai_providers</span> - Provider mgmt (Gemini/Claude)</li>
                                <li>• <span style="color: var(--text-primary);">worker_deployments</span> - Job queue monitoring</li>
                                <li>• <span style="color: var(--text-primary);">kb_embeddings</span> - Vector store (pgvector)</li>
                            </ul>
                        </div>

                        <div class="glass rounded-2xl p-6" style="background: var(--bg-secondary);">
                            <h4 class="text-lg font-bold mb-4" style="color: var(--aqua-accent);">IMT Tables (To Build)</h4>
                            <ul class="space-y-2" style="color: var(--text-muted);">
                                <li>• <span style="color: var(--text-primary);">kb_icps</span> - Customer profiles</li>
                                <li>• <span style="color: var(--text-primary);">kb_offers</span> - Product library</li>
                                <li>• <span style="color: var(--text-primary);">kb_angles</span> - Narrative primitives</li>
                                <li>• <span style="color: var(--text-primary);">constitution_rules</span> - Guardrails</li>
                                <li>• <span style="color: var(--text-primary);">learning_preferences</span> - Self-healing data</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <!-- Security -->
                <div class="glass rounded-3xl p-12">
                    <h3 class="text-4xl font-bold mb-8 gradient-text">Security & Authentication</h3>
                    <div class="space-y-6">
                        <div class="glass rounded-2xl p-6" style="background: var(--bg-secondary);">
                            <h4 class="text-2xl font-bold mb-4" style="color: var(--aqua-accent);">API Authentication</h4>
                            <div class="mono text-sm">
                                <p class="mb-4" style="color: var(--text-muted);">JWT Bearer Token required for all private endpoints. Scoped to Organization ID.</p>
                            </div>
                        </div>
                         <div class="glass rounded-2xl p-6" style="background: var(--bg-secondary);">
                             <h4 class="text-2xl font-bold mb-4" style="color: var(--aqua-accent);">Webhook Security</h4>
                            <div class="mono text-sm">
                                <p class="mb-4" style="color: var(--text-muted);">HMAC SHA-256 Signature verification for all incoming webhooks from Mailwiz/n8n.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            `,

        'roadmap': `
            <div class="max-w-7xl mx-auto px-6 py-20 space-y-12">
                <div class="text-center mb-16">
                    <h2 class="text-5xl font-black gradient-text mb-6">Implementation Roadmap</h2>
                    <p class="text-2xl" style="color: var(--text-secondary);">6-Week Accelerated Development</p>
                </div>

                <div class="space-y-8">
                     <!-- Summarized roadmap from COMPLETE for brevity in this view -->
                    <div class="card glass rounded-3xl p-8 hover:scale-105 transition-transform">
                        <div class="flex items-center justify-between mb-6">
                            <div><h3 class="text-3xl font-bold gradient-text">Phase 1: KB & Constitution</h3><p class="text-muted">Week 1-2</p></div>
                            <div class="text-5xl">🧠</div>
                        </div>
                        <p class="text-lg mb-4" style="color: var(--text-secondary);">The brain has something to think with.</p>
                    </div>

                    <div class="card glass rounded-3xl p-8 hover:scale-105 transition-transform">
                        <div class="flex items-center justify-between mb-6">
                            <div><h3 class="text-3xl font-bold gradient-text">Phase 2: Writer Engine</h3><p class="text-muted">Week 3-4</p></div>
                            <div class="text-5xl">✍️</div>
                        </div>
                        <p class="text-lg mb-4" style="color: var(--text-secondary);">Generate content from KB via Workflows.</p>
                    </div>

                    <div class="card glass rounded-3xl p-8 hover:scale-105 transition-transform">
                        <div class="flex items-center justify-between mb-6">
                            <div><h3 class="text-3xl font-bold gradient-text">Phase 3: IMT & Learning</h3><p class="text-muted">Week 5-6</p></div>
                            <div class="text-5xl">🔌</div>
                        </div>
                        <p class="text-lg mb-4" style="color: var(--text-secondary);">Connect infrastructure and enable self-healing.</p>
                    </div>
                </div>
            </div>
            `
    };

    return contents[tabName] || `<div class="text-center py-20"><h2 class="text-4xl font-bold gradient-text">Content for ${tabName} coming soon...</h2></div>`;
}

// Modal Content Functions (Preserved & Enhanced)
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
                    </ul>
                </div>
                <div class="p-4 rounded-lg" style="background: var(--bg-secondary);">
                    <h4 class="font-bold mb-2">Constitution</h4>
                    <ul class="text-sm text-muted space-y-1">
                        <li>• Hard constraints (guardrails)</li>
                        <li>• Cognitive sequence rules</li>
                    </ul>
                </div>
            </div>
        </div>
    `;
}

function getDatabaseSchemaContent() {
    return `
        <div class="space-y-6">
            <h3 class="text-xl font-bold gradient-text">Detailed Database Schema</h3>
            <div class="grid md:grid-cols-2 gap-6">
                <div class="p-4 rounded-lg bg-gray-900 border border-gray-700">
                    <h4 class="text-aqua-primary font-mono mb-2">public.organizations</h4>
                    <ul class="text-xs text-gray-400 font-mono space-y-1">
                        <li>id: uuid (PK)</li>
                        <li>name: text</li>
                        <li>settings: jsonb</li>
                        <li>api_keys: jsonb</li>
                    </ul>
                </div>
                <div class="p-4 rounded-lg bg-gray-900 border border-gray-700">
                    <h4 class="text-aqua-primary font-mono mb-2">public.kb_embeddings</h4>
                    <ul class="text-xs text-gray-400 font-mono space-y-1">
                        <li>id: uuid (PK)</li>
                        <li>org_id: uuid (FK)</li>
                        <li>content: text</li>
                        <li>embedding: vector(1536)</li>
                        <li>metadata: jsonb</li>
                    </ul>
                </div>
                <!-- More tables can be added here if needed -->
            </div>
            <p class="text-sm text-muted mt-4">All tables are RLS-protected ensuring tenants can only access their own data.</p>
        </div>
    `;
}

function getIntelligenceLayerContent() {
    return `
        <div class="space-y-6">
            <h4 class="font-bold mb-2 gradient-text">Worker Configuration</h4>
            <div class="p-4 rounded-lg bg-gray-900 font-mono text-xs text-green-400">
                <p>WORKER_CONCURRENCY=50</p>
                <p>REDIS_URL=redis://...</p>
                <p>QUEUE_PREFIX=axiom_v1</p>
                <p>AI_PROVIDER_TIMEOUT=30000</p>
            </div>
        </div>
    `;
}

function getOutputLayerContent() {
    return `<div class="p-4 text-center">Output Layer Details coming soon...</div>`;
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
                        <p class="text-sm text-muted">"I hear you — getting burned by hidden fees is frustrating..."</p>
                    </div>
                    <div>
                        <p class="font-semibold gradient-text">2. CLARIFICATION</p>
                        <p class="text-sm text-muted">"The core decision here is actually about what you're paying for..."</p>
                    </div>
                </div>
            </div>
        </div>
    `);
}

function getNerdContent(type) {
    // Basic placeholder responses for the Nerd Talk modal interactions
    const content = {
        'input': `<div class="p-4 bg-gray-900 text-green-400 font-mono text-sm">POST /api/brain/input</div>`,
        'status': `<div class="p-4 bg-gray-900 text-blue-400 font-mono text-sm">GET /api/brain/status/:jobId</div>`,
        'output': `<div class="p-4 bg-gray-900 text-purple-400 font-mono text-sm">GET /api/brain/output/:jobId</div>`,
        'webhook': `<div class="p-4 bg-gray-900 text-yellow-400 font-mono text-sm">POST /webhooks/stats</div>`
    };
    return content[type] || 'Checking specs...';
}
