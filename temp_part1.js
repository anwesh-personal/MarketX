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

