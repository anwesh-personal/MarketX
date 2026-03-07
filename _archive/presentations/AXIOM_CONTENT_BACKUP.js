// AXIOM Vision Presentation - Tab Content
// This contains all the tab content that will be inserted into the main presentation

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

                <!-- Primary Metric -->
                <div class="glass rounded-3xl p-12">
                    <h3 class="text-4xl font-bold mb-8 text-center gradient-text">The Primary Metric: BOOKED CALL</h3>
                    <p class="text-xl text-center mb-10" style="color: var(--text-secondary);">
                        Everything in IMT's world optimizes for one thing: <span class="gradient-text font-bold">BOOKED_CALL</span>
                    </p>
                    <div class="space-y-4">
                        <div class="p-6 rounded-xl" style="background: var(--gradient-aqua); color: white;">
                            <div class="flex items-center justify-between">
                                <span class="font-bold text-xl">PRIMARY</span>
                                <span class="text-3xl">→</span>
                                <span class="font-black text-2xl">BOOKED_CALL</span>
                            </div>
                            <p class="text-sm mt-2 opacity-90">This is success</p>
                        </div>
                        <div class="p-6 rounded-xl glass" style="background: var(--bg-secondary);">
                            <div class="flex items-center justify-between">
                                <span class="font-bold">SECONDARY</span>
                                <span class="text-2xl gradient-text">→</span>
                                <span class="font-bold">REPLIES, CLICKS</span>
                            </div>
                            <p class="text-sm mt-2" style="color: var(--text-muted);">Good signals</p>
                        </div>
                        <div class="p-6 rounded-xl glass" style="background: var(--bg-secondary);">
                            <div class="flex items-center justify-between">
                                <span style="color: var(--text-muted);">IGNORED</span>
                                <span class="text-2xl">→</span>
                                <span style="color: var(--text-muted);">OPEN_RATE</span>
                            </div>
                            <p class="text-sm mt-2" style="color: var(--text-muted);">Unreliable metric</p>
                        </div>
                        <div class="p-6 rounded-xl glass" style="background: var(--bg-secondary); border: 2px solid #FF5555;">
                            <div class="flex items-center justify-between">
                                <span class="font-bold" style="color: #FF5555;">GUARDRAILS</span>
                                <span class="text-2xl" style="color: #FF5555;">→</span>
                                <span class="font-bold" style="color: #FF5555;">BOUNCES, UNSUBS, COMPLAINTS</span>
                            </div>
                            <p class="text-sm mt-2" style="color: #FF8888;">Reputation damage</p>
                        </div>
                    </div>
                </div>
            </div>
        `,

        'architecture': `
            <div class="max-w-7xl mx-auto px-6 py-20 space-y-12">
                <div class="text-center mb-16">
                    <h2 class="text-5xl font-black gradient-text mb-6">System Architecture</h2>
                    <p class="text-2xl" style="color: var(--text-secondary);">How the Brain Works</p>
                </div>

                <div class="glass rounded-3xl p-12">
                    <h3 class="text-3xl font-bold mb-8">Three-Layer Architecture</h3>
                    <div class="space-y-6">
                        <div class="card glass rounded-2xl p-6 hover:scale-105 transition-transform cursor-pointer" onclick="openModal('Knowledge Layer', getKnowledgeLayerContent())">
                            <div class="flex items-center justify-between">
                                <div>
                                    <h4 class="text-2xl font-bold mb-2">Layer 1: Knowledge</h4>
                                    <p class="text-muted">KB (Brand, ICPs, Offers, Angles) + Constitution + Analytics</p>
                                </div>
                                <div class="text-4xl">📚</div>
                            </div>
                        </div>
                        
                        <div class="card glass rounded-2xl p-6 hover:scale-105 transition-transform cursor-pointer" onclick="openModal('Intelligence Layer', getIntelligenceLayerContent())">
                            <div class="flex items-center justify-between">
                                <div>
                                    <h4 class="text-2xl font-bold mb-2">Layer 2: Intelligence</h4>
                                    <p class="text-muted">RAG Engine + Workflow Engine + Validator + Learning Loop</p>
                                </div>
                                <div class="text-4xl">⚡</div>
                            </div>
                        </div>
                        
                        <div class="card glass rounded-2xl p-6 hover:scale-105 transition-transform cursor-pointer" onclick="openModal('Output Layer', getOutputLayerContent())">
                            <div class="flex items-center justify-between">
                                <div>
                                    <h4 class="text-2xl font-bold mb-2">Layer 3: Outputs</h4>
                                    <p class="text-muted">Email Flows, Email Replies, Landing Pages, Social Content</p>
                                </div>
                                <div class="text-4xl">📤</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="grid md:grid-cols-2 gap-8">
                    <div class="glass rounded-3xl p-8">
                        <h3 class="text-2xl font-bold mb-6">RAG Engine</h3>
                        <div class="space-y-4 text-muted">
                            <div class="flex items-start gap-3">
                                <span class="text-2xl">1️⃣</span>
                                <div>
                                    <p class="font-semibold mb-1" style="color: var(--text-primary);">EMBEDDING</p>
                                    <p class="text-sm">Convert query to vector</p>
                                </div>
                            </div>
                            <div class="flex items-start gap-3">
                                <span class="text-2xl">2️⃣</span>
                                <div>
                                    <p class="font-semibold mb-1" style="color: var(--text-primary);">SEARCH</p>
                                    <p class="text-sm">Hybrid vector + full-text retrieval</p>
                                </div>
                            </div>
                            <div class="flex items-start gap-3">
                                <span class="text-2xl">3️⃣</span>
                                <div>
                                    <p class="font-semibold mb-1" style="color: var(--text-primary);">RERANK</p>
                                    <p class="text-sm">Precision-focused reordering</p>
                                </div>
                            </div>
                            <div class="flex items-start gap-3">
                                <span class="text-2xl">4️⃣</span>
                                <div>
                                    <p class="font-semibold mb-1" style="color: var(--text-primary);">CONTEXT</p>
                                    <p class="text-sm">Relevant KB chunks for generation</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="glass rounded-3xl p-8">
                        <h3 class="text-2xl font-bold mb-6">Workflow Engine</h3>
                        <p class="text-muted mb-6">Visual workflow builder using React Flow. Create, save, and deploy content generation workflows.</p>
                        <div class="space-y-3">
                            <div class="p-3 rounded-lg" style="background: var(--bg-secondary);">
                                <p class="font-semibold mb-1">Analyze Node</p>
                                <p class="text-sm text-muted">Intent classification (Claude)</p>
                            </div>
                            <div class="p-3 rounded-lg" style="background: var(--bg-secondary);">
                                <p class="font-semibold mb-1">Retrieve Node</p>
                                <p class="text-sm text-muted">RAG from KB</p>
                            </div>
                            <div class="p-3 rounded-lg" style="background: var(--bg-secondary);">
                                <p class="font-semibold mb-1">Generate Node</p>
                                <p class="text-sm text-muted">Content creation (Gemini)</p>
                            </div>
                            <div class="p-3 rounded-lg" style="background: var(--bg-secondary);">
                                <p class="font-semibold mb-1">Validate Node</p>
                                <p class="text-sm text-muted">Constitution check</p>
                            </div>
                        </div>
                    </div>
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

                <!-- 4 Equal Steps -->
                <div class="grid md:grid-cols-4 gap-6">
                    <div class="card rounded-3xl p-8 cursor-pointer hover:glow transition-all" onclick="openModal('1. INGEST Stats', getLearningContent('ingest'))" style="background: rgba(0, 42, 82, 0.95); border: 2px solid rgba(0, 212, 170, 0.5);">
                        <div class="text-5xl mb-4 text-center">📥</div>
                        <h3 class="text-2xl font-bold mb-4 text-center gradient-text">1. INGEST</h3>
                        <p style="color: #FFFFFF; text-align: center;">Fetch yesterday's email stats from Mailwiz</p>
                        <p class="text-sm text-center mt-4" style="color: var(--aqua-accent);">Click for technical details →</p>
                    </div>

                    <div class="card rounded-3xl p-8 cursor-pointer hover:glow transition-all" onclick="openModal('2. EVALUATE Performance', getLearningContent('evaluate'))" style="background: rgba(0, 42, 82, 0.95); border: 2px solid rgba(0, 153, 204, 0.5);">
                        <div class="text-5xl mb-4 text-center">📊</div>
                        <h3 class="text-2xl font-bold mb-4 text-center gradient-text">2. EVALUATE</h3>
                        <p style="color: #FFFFFF; text-align: center;">Group by ICP, angle, offer. Calculate metrics</p>
                        <p class="text-sm text-center mt-4" style="color: var(--aqua-accent);">Click for technical details →</p>
                    </div>

                    <div class="card rounded-3xl p-8 cursor-pointer hover:glow transition-all" onclick="openModal('3. APPLY Learning Rules', getLearningContent('apply'))" style="background: rgba(0, 42, 82, 0.95); border: 2px solid rgba(0, 212, 170, 0.5);">
                        <div class="text-5xl mb-4 text-center">⚙️</div>
                        <h3 class="text-2xl font-bold mb-4 text-center gradient-text">3. APPLY RULES</h3>
                        <p style="color: #FFFFFF; text-align: center;">Promote winners, demote losers, pause failures</p>
                        <p class="text-sm text-center mt-4" style="color: var(--aqua-accent);">Click for technical details →</p>
                    </div>

                    <div class="card rounded-3xl p-8 cursor-pointer hover:glow transition-all" onclick="openModal('4. UPDATE Knowledge Base', getLearningContent('update'))" style="background: rgba(0, 42, 82, 0.95); border: 2px solid rgba(0, 153, 204, 0.5);">
                        <div class="text-5xl mb-4 text-center">💾</div>
                        <h3 class="text-2xl font-bold mb-4 text-center gradient-text">4. UPDATE KB</h3>
                        <p style="color: #FFFFFF; text-align: center;">Write new preferences. Tomorrow uses them</p>
                        <p class="text-sm text-center mt-4" style="color: var(--aqua-accent);">Click for technical details →</p>
                    </div>
                </div>

                <!-- Real Example -->
                <div class="glass rounded-3xl p-12">
                    <h3 class="text-4xl font-bold mb-10 text-center gradient-text">Real Example: Angle Learning</h3>
                    <div class="space-y-6">
                        <div class="p-6 rounded-2xl" style="background: var(--bg-secondary); border-left: 4px solid #00D4AA;">
                            <h4 class="text-xl font-bold mb-3">📧 Yesterday's Data</h4>
                            <div class="grid md:grid-cols-3 gap-4 text-sm">
                                <div>
                                    <p class="font-bold mb-1">Angle A: "Cost of Doing Nothing"</p>
                                    <p style="color: var(--text-muted);">Sent: 1,000 | Clicks: 45 | Booked: 3</p>
                                </div>
                                <div>
                                    <p class="font-bold mb-1">Angle B: "Peer Success Stories"</p>
                                    <p style="color: var(--text-muted);">Sent: 1,000 | Clicks: 89 | Booked: 12</p>
                                </div>
                                <div>
                                    <p class="font-bold mb-1">Angle C: "ROI Calculator"</p>
                                    <p style="color: var(--text-muted);">Sent: 1,000 | Clicks: 23 | Booked: 1</p>
                                </div>
                            </div>
                        </div>

                        <div class="p-6 rounded-2xl" style="background: var(--bg-secondary); border-left: 4px solid #0099CC;">
                            <h4 class="text-xl font-bold mb-3">📊 Evaluation</h4>
                            <p class="mb-3" style="color: #FFFFFF;">Angle B has 4x higher BOOKED_CALL rate than A, 12x higher than C</p>
                            <div class="grid md:grid-cols-3 gap-4">
                                <div class="p-3 rounded-lg" style="background: rgba(255, 85, 85, 0.2);">
                                    <p class="font-bold" style="color: #FF8888;">Angle C: UNDERPERFORMER</p>
                                </div>
                                <div class="p-3 rounded-lg" style="background: rgba(255, 200, 100, 0.2);">
                                    <p class="font-bold" style="color: #FFC864;">Angle A: OKAY</p>
                                </div>
                                <div class="p-3 rounded-lg" style="background: rgba(0, 212, 170, 0.2);">
                                    <p class="font-bold gradient-text">Angle B: WINNER ✓</p>
                                </div>
                            </div>
                        </div>

                        <div class="p-6 rounded-2xl" style="background: var(--bg-secondary); border-left: 4px solid #00FFDD;">
                            <h4 class="text-xl font-bold mb-3">⚙️ Actions Taken</h4>
                            <ul class="space-y-2">
                                <li class="flex items-center gap-3">
                                    <span class="gradient-text font-bold">✓</span>
                                    <span style="color: #FFFFFF;">Angle B: Increase usage weight to 60%</span>
                                </li>
                                <li class="flex items-center gap-3">
                                    <span class="gradient-text font-bold">✓</span>
                                    <span style="color: #FFFFFF;">Angle A: Reduce to 30%</span>
                                </li>
                                <li class="flex items-center gap-3">
                                    <span style="color: #FF5555;">✗</span>
                                    <span style="color: #FFFFFF;">Angle C: Pause (threshold breach)</span>
                                </li>
                            </ul>
                        </div>

                        <div class="p-6 rounded-2xl text-center" style="background: var(--gradient-aqua); color: white;">
                            <p class="text-2xl font-bold">Tomorrow's Emails</p>
                            <p class="text-lg opacity-90 mt-2">60% will use "Peer Success Stories" angle automatically</p>
                        </div>
                    </div>
                </div>

                <!-- Metrics Table -->
                <div class="glass rounded-3xl p-12">
                    <h3 class="text-4xl font-bold mb-8 text-center gradient-text">What We Track</h3>
                    <div class="grid md:grid-cols-2 gap-6">
                        <div class="p-6 rounded-2xl" style="background: var(--bg-secondary);">
                            <h4 class="text-xl font-bold mb-4 gradient-text">Success Metrics</h4>
                            <ul class="space-y-2" style="color: #FFFFFF;">
                                <li>• BOOKED_CALL (primary)</li>
                                <li>• REPLY_RATE (secondary)</li>
                                <li>• CLICK_RATE (secondary)</li>
                                <li>• CONVERSION_TIME</li>
                            </ul>
                        </div>
                        <div class="p-6 rounded-2xl" style="background: var(--bg-secondary);">
                            <h4 class="text-xl font-bold mb-4" style="color: #FF8888;">Guardrail Metrics</h4>
                            <ul class="space-y-2" style="color: #FFFFFF;">
                                <li>• BOUNCE_RATE (reputation)</li>
                                <li>• UNSUBSCRIBE_RATE (list health)</li>
                                <li>• COMPLAINT_RATE (sender score)</li>
                                <li>• REPLY_SENTIMENT (negative signals)</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `,
                        < h4 class="text-xl font-bold mb-3" > 1. INGEST</h4 >
        <p class="text-sm text-muted">Fetch yesterday's stats from Mailwiz: clicks, replies, booked calls, bounces</p>
                    </div >
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
                </div >

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
            </div >
        `,

        'visualflow': `
        < div class="max-w-7xl mx-auto px-6 py-20 space-y-16" >
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
                                    <p class="font-bold text-lg mb-2" style="color: var(--text-primary);">Workflow Trigger</p>
                                    <p class="text-sm" style="color: var(--text-muted);">Parse email, extract context</p>
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
                                <div class="glass rounded-xl p-6">
                                    <p class="font-bold text-lg mb-2" style="color: var(--text-primary);">Worker Picks Up</p>
                                    <p class="text-sm" style="color: var(--text-muted);">Background processing</p>
                                </div>
                            </div>
                        </div>

                        <div class="text-center text-4xl gradient-text">↓</div>

                        <!-- Layer 3: The Brain -->
                        <div class="p-10 rounded-2xl" style="background: linear-gradient(135deg, rgba(0,212,170,0.15) 0%, rgba(0,153,204,0.15) 100%); border: 2px solid var(--aqua-primary);">
                            <h4 class="text-3xl font-black mb-8 text-center gradient-text">🧠 THE BRAIN ENGINE</h4>
                            <div class="grid md:grid-cols-4 gap-6">
                                <div class="card glass rounded-xl p-6" data-tippy-content="Claude analyzes intent and scenario">
                                    <div class="text-4xl mb-3">1️⃣</div>
                                    <p class="font-bold text-lg mb-2">ANALYZE</p>
                                    <p class="text-sm" style="color: var(--text-muted);">Intent classification</p>
                                </div>
                                <div class="card glass rounded-xl p-6" data-tippy-content="Vector search + reranking from KB">
                                    <div class="text-4xl mb-3">2️⃣</div>
                                    <p class="font-bold text-lg mb-2">RETRIEVE</p>
                                    <p class="text-sm" style="color: var(--text-muted);">RAG from KB</p>
                                </div>
                                <div class="card glass rounded-xl p-6" data-tippy-content="Gemini generates reply following cognitive sequence">
                                    <div class="text-4xl mb-3">3️⃣</div>
                                    <p class="font-bold text-lg mb-2">GENERATE</p>
                                    <p class="text-sm" style="color: var(--text-muted);">Draft content</p>
                                </div>
                                <div class="card glass rounded-xl p-6" data-tippy-content="Constitution check - hard reject if violations">
                                    <div class="text-4xl mb-3">4️⃣</div>
                                    <p class="font-bold text-lg mb-2">VALIDATE</p>
                                    <p class="text-sm" style="color: var(--text-muted);">Pass/Reject</p>
                                </div>
                            </div>
                        </div>

                        <div class="text-center text-4xl gradient-text">↓</div>

                        <!-- Layer 4: Output -->
                        <div class="p-8 rounded-2xl" style="background: var(--bg-tertiary); border-left: 4px solid #00FFDD;">
                            <h4 class="text-2xl font-bold mb-4 gradient-text">3. Output & Delivery</h4>
                            <div class="grid md:grid-cols-3 gap-6">
                                <div class="glass rounded-xl p-6">
                                    <p class="font-bold text-lg mb-2 text-green-400">✅ APPROVED</p>
                                    <p class="text-sm" style="color: var(--text-muted);">Reply stored, job complete</p>
                                </div>
                                <div class="glass rounded-xl p-6">
                                    <p class="font-bold text-lg mb-2" style="color: var(--text-primary);">n8n Polls</p>
                                    <p class="text-sm mono" style="color: var(--text-muted);">GET /status/:id → "done"</p>
                                </div>
                                <div class="glass rounded-xl p-6">
                                    <p class="font-bold text-lg mb-2" style="color: var(--text-primary);">Send via Mailwiz</p>
                                    <p class="text-sm" style="color: var(--text-muted);">Email delivered</p>
                                </div>
                            </div>
                        </div>

                        <div class="text-center text-4xl gradient-text">↓</div>

                        <!-- Layer 5: Learning Loop -->
                        <div class="p-8 rounded-2xl" style="background: var(--bg-tertiary); border-left: 4px solid #FF8C00;">
                            <h4 class="text-2xl font-bold mb-4 gradient-text">4. Stats & Learning Loop</h4>
                            <div class="grid md:grid-cols-4 gap-4">
                                <div class="glass rounded-xl p-4">
                                    <p class="font-bold mb-1" style="color: var(--text-primary);">📥 INGEST</p>
                                    <p class="text-sm" style="color: var(--text-muted);">Mailwiz stats</p>
                                </div>
                                <div class="glass rounded-xl p-4">
                                    <p class="font-bold mb-1" style="color: var(--text-primary);">📊 EVALUATE</p>
                                    <p class="text-sm" style="color: var(--text-muted);">Performance by context</p>
                                </div>
                                <div class="glass rounded-xl p-4">
                                    <p class="font-bold mb-1" style="color: var(--text-primary);">⚙️ APPLY RULES</p>
                                    <p class="text-sm" style="color: var(--text-muted);">Promote/Demote/Pause</p>
                                </div>
                                <div class="glass rounded-xl p-4">
                                    <p class="font-bold mb-1" style="color: var(--text-primary);">💾 UPDATE KB</p>
                                    <p class="text-sm" style="color: var(--text-muted);">Tomorrow is smarter</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!--Tech Specs-- >
        <div class="grid md:grid-cols-2 gap-8">
            <div class="glass rounded-3xl p-8">
                <h3 class="text-3xl font-bold mb-6 gradient-text">Tech Stack</h3>
                <div class="space-y-4">
                    <div class="p-4 rounded-lg" style="background: var(--bg-secondary);">
                        <p class="font-bold mb-1" style="color: var(--aqua-accent);">Frontend</p>
                        <p class="mono text-sm" style="color: var(--text-muted);">Next.js 14, React, TailwindCSS</p>
                    </div>
                    <div class="p-4 rounded-lg" style="background: var(--bg-secondary);">
                        <p class="font-bold mb-1" style="color: var(--aqua-accent);">Backend</p>
                        <p class="mono text-sm" style="color: var(--text-muted);">Next.js API Routes, Node.js</p>
                    </div>
                    <div class="p-4 rounded-lg" style="background: var(--bg-secondary);">
                        <p class="font-bold mb-1" style="color: var(--aqua-accent);">Database</p>
                        <p class="mono text-sm" style="color: var(--text-muted);">PostgreSQL + pgvector (Supabase)</p>
                    </div>
                    <div class="p-4 rounded-lg" style="background: var(--bg-secondary);">
                        <p class="font-bold mb-1" style="color: var(--aqua-accent);">Queue</p>
                        <p class="mono text-sm" style="color: var(--text-muted);">BullMQ + Redis</p>
                    </div>
                    <div class="p-4 rounded-lg" style="background: var(--bg-secondary);">
                        <p class="font-bold mb-1" style="color: var(--aqua-accent);">AI</p>
                        <p class="mono text-sm" style="color: var(--text-muted);">OpenAI, Anthropic, Google, XAI, Mistral, Perplexity</p>
                    </div>
                </div>
            </div>

            <div class="glass rounded-3xl p-8">
                <h3 class="text-3xl font-bold mb-6 gradient-text">Performance</h3>
                <div class="space-y-4">
                    <div>
                        <div class="flex justify-between mb-2">
                            <span style="color: var(--text-primary);">Vector Search</span>
                            <span class="font-bold gradient-text">&lt;50ms</span>
                        </div>
                        <div class="w-full bg-gray-700 rounded-full h-3">
                            <div class="h-3 rounded-full" style="background: var(--gradient-aqua); width: 95%"></div>
                        </div>
                    </div>
                    <div>
                        <div class="flex justify-between mb-2">
                            <span style="color: var(--text-primary);">Reply Generation</span>
                            <span class="font-bold gradient-text">2-4s</span>
                        </div>
                        <div class="w-full bg-gray-700 rounded-full h-3">
                            <div class="h-3 rounded-full" style="background: var(--gradient-aqua); width: 85%"></div>
                        </div>
                    </div>
                    <div>
                        <div class="flex justify-between mb-2">
                            <span style="color: var(--text-primary);">Concurrent Jobs</span>
                            <span class="font-bold gradient-text">1000+</span>
                        </div>
                        <div class="w-full bg-gray-700 rounded-full h-3">
                            <div class="h-3 rounded-full" style="background: var(--gradient-aqua); width: 100%"></div>
                        </div>
                    </div>
                    <div>
                        <div class="flex justify-between mb-2">
                            <span style="color: var(--text-primary);">Uptime SLA</span>
                            <span class="font-bold gradient-text">99.9%</span>
                        </div>
                        <div class="w-full bg-gray-700 rounded-full h-3">
                            <div class="h-3 rounded-full" style="background: var(--gradient-aqua); width: 99%"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
            </div >
        `,

        'nerdtalk': `
        < div class="max-w-7xl mx-auto px-6 py-20 space-y-20" >
                <div class="text-center mb-16">
                    <h2 class="text-6xl font-black gradient-text mb-6">🤓 Nerd Talk</h2>
                    <p class="text-2xl" style="color: var(--text-secondary);">Technical Integration Specifications</p>
                </div>

                <!--API Endpoints-- >
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

                <!--Integration Flow(from Nino's diagram) -->
            < div class= "glass rounded-3xl p-12" >
                    <h3 class="text-4xl font-bold mb-8 gradient-text">Nino's Integration Architecture</h3>
                    <div class="space-y-8">
                        <!-- IMT → Axiom flow -->
                        <div>
                            <h4 class="text-2xl font-bold mb-4" style="color: var(--aqua-accent);">1. Email Reply Request Flow</h4>
                            <div class="space-y-4">
                                <div class="flex items-center gap-4">
                                    <div class="w-48 glass rounded-lg p-4 text-center font-bold">Mailwiz</div>
                                    <div class="text-2xl gradient-text">→</div>
                                    <div class="w-48 glass rounded-lg p-4 text-center font-bold">n8n Workflow</div>
                                    <div class="text-2xl gradient-text">→</div>
                                    <div class="w-48 glass rounded-lg p-4 text-center font-bold">Axiom API</div>
                                </div>
                                <div class="mono text-sm ml-52" style="color: var(--text-muted);">
                                    <p>1. Email received in Mailwiz</p>
                                    <p>2. Webhook triggers n8n</p>
                                    <p>3. n8n calls POST /api/brain/input</p>
                                    <p>4. Axiom returns job_id</p>
                                </div>
                            </div>
                        </div>

                        <!-- Polling flow -->
                        <div>
                            <h4 class="text-2xl font-bold mb-4" style="color: var(--aqua-accent);">2. Status Polling</h4>
                            <div class="space-y-4">
                                <div class="flex items-center gap-4">
                                    <div class="w-48 glass rounded-lg p-4 text-center font-bold">n8n</div>
                                    <div class="text-2xl gradient-text">⟳</div>
                                    <div class="w-48 glass rounded-lg p-4 text-center font-bold">GET /status/:id</div>
                                    <div class="text-2xl gradient-text">→</div>
                                    <div class="w-48 glass rounded-lg p-4 text-center font-bold">"done"</div>
                                </div>
                                <div class="mono text-sm ml-52" style="color: var(--text-muted);">
                                    <p>1. n8n polls every 2s</p>
                                    <p>2. Status: "pending" | "processing" | "done" | "failed"</p>
                                    <p>3. When "done", fetch output</p>
                                </div>
                            </div>
                        </div>

                        <!-- Output fetch -->
                        <div>
                            <h4 class="text-2xl font-bold mb-4" style="color: var(--aqua-accent);">3. Output Retrieval</h4>
                            <div class="space-y-4">
                                <div class="flex items-center gap-4">
                                    <div class="w-48 glass rounded-lg p-4 text-center font-bold">n8n</div>
                                    <div class="text-2xl gradient-text">→</div>
                                    <div class="w-48 glass rounded-lg p-4 text-center font-bold">GET /output/:id</div>
                                    <div class="text-2xl gradient-text">→</div>
                                    <div class="w-48 glass rounded-lg p-4 text-center font-bold">Reply JSON</div>
                                </div>
                                <div class="mono text-sm ml-52" style="color: var(--text-muted);">
                                    <p>1. Fetch complete reply content</p>
                                    <p>2. Parse JSON response</p>
                                    <p>3. Send via Mailwiz</p>
                                </div>
                            </div>
                        </div>

                        <!-- Stats feedback -->
                        <div>
                            <h4 class="text-2xl font-bold mb-4" style="color: var(--aqua-accent);">4. Stats Feedback Loop</h4>
                            <div class="space-y-4">
                                <div class="flex items-center gap-4">
                                    <div class="w-48 glass rounded-lg p-4 text-center font-bold">Mailwiz</div>
                                    <div class="text-2xl gradient-text">→</div>
                                    <div class="w-48 glass rounded-lg p-4 text-center font-bold">Webhook</div>
                                    <div class="text-2xl gradient-text">→</div>
                                    <div class="w-48 glass rounded-lg p-4 text-center font-bold">Axiom Stats API</div>
                                </div>
                                <div class="mono text-sm ml-52" style="color: var(--text-muted);">
                                    <p>1. Click/Reply/Book events from Mailwiz</p>
                                    <p>2. Webhook POSTs to /api/brain/webhooks/stats</p>
                                    <p>3. Axiom ingests for learning loop</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div >

                < !--Database Schema-- >
                <div class="glass rounded-3xl p-12">
                    <h3 class="text-4xl font-bold mb-8 gradient-text">Database Schema Highlights</h3>
                    <div class="grid md:grid-cols-2 gap-6 mono text-sm">
                        <div class="glass rounded-2xl p-6" style="background: var(--bg-secondary);">
                            <h4 class="text-lg font-bold mb-4" style="color: var(--aqua-accent);">Core Tables (Implemented)</h4>
                            <ul class="space-y-2" style="color: var(--text-muted);">
                                <li>• <span style="color: var(--text-primary);">organizations</span> - Multi-tenant</li>
                                <li>• <span style="color: var(--text-primary);">brain_templates</span> - Brain configs</li>
                                <li>• <span style="color: var(--text-primary);">ai_providers</span> - Provider mgmt</li>
                                <li>• <span style="color: var(--text-primary);">kb_embeddings</span> - Vector store</li>
                                <li>• <span style="color: var(--text-primary);">worker_deployments</span> - Job queue</li>
                                <li>• <span style="color: var(--text-primary);">vps_servers</span> - Infrastructure</li>
                            </ul>
                        </div>

                        <div class="glass rounded-2xl p-6" style="background: var(--bg-secondary);">
                            <h4 class="text-lg font-bold mb-4" style="color: var(--aqua-accent);">IMT Tables (To Build)</h4>
                            <ul class="space-y-2" style="color: var(--text-muted);">
                                <li>• <span style="color: var(--text-primary);">kb_icps</span> - Customer profiles</li>
                                <li>• <span style="color: var(--text-primary);">kb_offers</span> - Product library</li>
                                <li>• <span style="color: var(--text-primary);">kb_angles</span> - Narrative primitives</li>
                                <li>• <span style="color: var(--text-primary);">kb_reply_strategies</span> - Reply logic</li>
                                <li>• <span style="color: var(--text-primary);">constitution_rules</span> - Guardrails</li>
                                <li>• <span style="color: var(--text-primary);">learning_preferences</span> - Self-healing</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <!--Security & Auth-- >
        <div class="glass rounded-3xl p-12">
            <h3 class="text-4xl font-bold mb-8 gradient-text">Security & Authentication</h3>
            <div class="space-y-6">
                <div class="glass rounded-2xl p-6" style="background: var(--bg-secondary);">
                    <h4 class="text-2xl font-bold mb-4" style="color: var(--aqua-accent);">API Authentication</h4>
                    <div class="mono text-sm">
                        <p class="mb-4" style="color: var(--text-muted);">JWT Bearer Token in Authorization header:</p>
                        <div class="p-4 rounded-lg" style="background: #1a1a1a;">
                            <code style="color: #00FF88;">
                                POST /api/brain/input<br />
                                Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...<br />
                                Content-Type: application/json
                            </code>
                        </div>
                    </div>
                </div>

                <div class="glass rounded-2xl p-6" style="background: var(--bg-secondary);">
                    <h4 class="text-2xl font-bold mb-4" style="color: var(--aqua-accent);">Webhook Validation</h4>
                    <div class="mono text-sm">
                        <p class="mb-4" style="color: var(--text-muted);">HMAC signature verification:</p>
                        <div class="p-4 rounded-lg" style="background: #1a1a1a;">
                            <code style="color: #00FF88;">
                                X-Webhook-Signature: sha256=abc123...<br />
                                X-Webhook-Timestamp: 1706050800<br />
                                        // Prevents replay attacks
                            </code>
                        </div>
                    </div>
                </div>

                <div class="glass rounded-2xl p-6" style="background: var(--bg-secondary);">
                    <h4 class="text-2xl font-bold mb-4" style="color: var(--aqua-accent);">Rate Limiting</h4>
                    <div class="text-center">
                        <p class="text-2xl font-bold gradient-text mb-2">TBD</p>
                        <p class="text-sm" style="color: var(--text-muted);">Per-org limits based on load testing</p>
                    </div>
                </div>
            </div>
        </div>
            </div >
            `,

        'roadmap': `
            < div class= "max-w-7xl mx-auto px-6 py-20 space-y-12" >
                <div class="text-center mb-16">
                    <h2 class="text-5xl font-black gradient-text mb-6">Implementation Roadmap</h2>
                    <p class="text-2xl" style="color: var(--text-secondary);">6-Week Accelerated Development</p>
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
                                <h3 class="text-3xl font-bold gradient-text">Phase 4: Learning Loop & Optimization</h3>
                                <p class="text-muted">Week 5-6</p>
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


                </div>

                <div class="glass rounded-3xl p-12 mt-12" style="background: var(--gradient-dark); color: white;">
                    <h3 class="text-3xl font-bold mb-6 text-center">6-Week Timeline</h3>
                    <div class="grid md:grid-cols-4 gap-6 text-center">
                        <div>
                            <p class="font-bold text-3xl mb-2 gradient-text">W1-2</p>
                            <p class="opacity-90 text-lg">KB & Constitution</p>
                        </div>
                        <div>
                            <p class="font-bold text-3xl mb-2 gradient-text">W2-3</p>
                            <p class="opacity-90 text-lg">Writer Engine</p>
                        </div>
                        <div>
                            <p class="font-bold text-3xl mb-2 gradient-text">W4-5</p>
                            <p class="opacity-90 text-lg">IMT Integration</p>
                        </div>
                        <div>
                            <p class="font-bold text-3xl mb-2 gradient-text">W5-6</p>
                            <p class="opacity-90 text-lg">Learning & Launch</p>
                        </div>
                    </div>
                </div>
            </div >
            `
    };

    return contents[tabName] || `< div class= "text-center py-20" > <h2 class="text-4xl font-bold gradient-text">Content for ${tabName} coming soon...</h2></div > `;
}

// Modal Content Functions
function getKnowledgeLayerContent() {
    return `
        < div class= "space-y-6" >
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
        </div >
            `;
}

function getIntelligenceLayerContent() {
    return `
            < div class= "space-y-6" >
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
        </div >
            `;
}

function getOutputLayerContent() {
    return `
            < div class= "space-y-6" >
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
        </div >
            `;
}

function openExamples() {
    openModal('How It Works: Real Example', `
            < div class= "space-y-6" >
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
        </div >
            `);
}
// Content base created

// Adding Visual Flow and Nerd Talk tabs

// Insert before the closing of getTabContent function - these go AFTER 'learning' and BEFORE 'roadmap'

// Note: The file AXIOM_VISION_CONTENT.js already has overview through roadmap (7 original tabs)
// I need to add visualflow and nerdtalk, and modify roadmap to be 6 weeks


// Nerd Talk Modal Content
function getNerdContent(type) {
    const content = {
        'input': `
            < div class= "space-y-6 mono text-sm" >
                <div class="p-6 rounded-lg" style="background: #1a1a1a;">
                    <p class="text-aqua-accent font-bold mb-4">REQUEST:</p>
                    <pre style="color: #00FF88;">POST /api/brain/input
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "type": "email_reply",
  "incoming_email": {
    "from": "prospect@company.com",
    "subject": "Re: Your message",
    "body": "What does this cost?",
    "thread_id": "abc123"
  },
  "sender_context": {
    "icp_id": "ent_001",
    "buyer_stage": "CONSIDERATION"
  }
}</pre>
                </div>

                <div class="p-6 rounded-lg" style="background: #1a1a1a;">
                    <p class="text-aqua-accent font-bold mb-4">RESPONSE:</p>
                    <pre style="color: #00FF88;">{
  "job_id": "uuid-1234-5678",
  "status": "queued",
  "estimated_completion": "2026-01-23T22:00:00Z"
}</pre>
                </div>
            </div >
            `,
        'status': `
            < div class= "space-y-6 mono text-sm" >
                <div class="p-6 rounded-lg" style="background: #1a1a1a;">
                    <p class="text-aqua-accent font-bold mb-4">REQUEST:</p>
                    <pre style="color: #00FF88;">GET /api/brain/status/{job_id}
Authorization: Bearer {jwt_token}</pre>
                </div>

                <div class="p-6 rounded-lg" style="background: #1a1a1a;">
                    <p class="text-aqua-accent font-bold mb-4">RESPONSE:</p>
                    <pre style="color: #00FF88;">{
  "job_id": "uuid-1234-5678",
  "status": "processing",
  "progress": 75,
  "created_at": "2026-01-23T21:59:45Z"
}</pre>
                </div>
            </div >
            `,
        'output': `
            < div class= "space-y-6 mono text-sm" >
                <div class="p-6 rounded-lg" style="background: #1a1a1a;">
                    <p class="text-aqua-accent font-bold mb-4">REQUEST:</p>
                    <pre style="color: #00FF88;">GET /api/brain/output/{job_id}
Authorization: Bearer {jwt_token}</pre>
                </div>

                <div class="p-6 rounded-lg" style="background: #1a1a1a;">
                    <p class="text-aqua-accent font-bold mb-4">RESPONSE:</p>
                    <pre style="color: #00FF88;">{
  "job_id": "uuid-1234-5678",
  "type": "email_reply",
  "output": {
    "reply_markdown": "I hear you...",
    "reply_html": "<p>I hear you...</p>",
    "validation_passed": true,
    "scenario_detected": "pricing_question"
  },
  "metadata": {
    "processing_time_ms": 2340,
    "model_used": "gemini-1.5-pro",
    "constitution_checks_passed": 12
  }
}</pre>
                </div>
            </div >
            `,
        'webhook': `
            < div class= "space-y-6 mono text-sm" >
                <div class="p-6 rounded-lg" style="background: #1a1a1a;">
                    <p class="text-aqua-accent font-bold mb-4">WEBHOOK PAYLOAD (from Mailw iz):</p>
                    <pre style="color: #00FF88;">POST /api/brain/webhooks/stats
X-Webhook-Signature: sha256=abc123...
X-Webhook-Timestamp: 1706050800

{
  "date": "2026-01-22",
  "events": [
    {
      "event_type": "CLICK",
      "email_id": "email_123",
      "timestamp": "2026-01-22T14:30:00Z"
    },
    {
      "event_type": "BOOKED_CALL",
      "email_id": "email_789",
      "timestamp": "2026-01-22T15:45:00Z"
    }
  ]
}</pre>
                </div>

                <div class="p-6 rounded-lg" style="background: #1a1a1a;">
                    <p class="text-aqua-accent font-bold mb-4">RESPONSE:</p>
                    <pre style="color: #00FF88;">{
  "received": 42,
  "processed": 42,
  "errors": []
}</pre>
                </div>
            </div >
            `
    };

    return content[type] || '<p>Content not found</p>';
}
