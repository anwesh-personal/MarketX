// AXIOM Vision V2 - Enhanced Content with Visual Flow & Nerd Talk

function getTabContent(tabName) {
    const contents = {
        'overview': `
            <div class="max-w-7xl mx-auto px-6 py-20 space-y-20">
                <!-- Hero Stats -->
                <div class="grid md:grid-cols-4 gap-6">
                    <div class="glass-light rounded-3xl p-8 text-center card-interactive">
                        <div class="text-5xl font-black gradient-text mb-4">60%</div>
                        <p class="text-gray-300">Foundation Complete</p>
                    </div>
                    <div class="glass-light rounded-3xl p-8 text-center card-interactive">
                        <div class="text-5xl font-black gradient-text mb-4">100%</div>
                        <p class="text-gray-300">Multi-Tenant Ready</p>
                    </div>
                    <div class="glass-light rounded-3xl p-8 text-center card-interactive">
                        <div class="text-5xl font-black gradient-text mb-4">6</div>
                        <p class="text-gray-300">AI Providers</p>
                    </div>
                    <div class="glass-light rounded-3xl p-8 text-center card-interactive">
                        <div class="text-5xl font-black gradient-text mb-4">∞</div>
                        <p class="text-gray-300">Scalability</p>
                    </div>
                </div>

                <!-- What is AXIOM -->
                <div class="text-center max-w-4xl mx-auto">
                    <h2 class="text-6xl font-black gradient-text mb-8">What is AXIOM?</h2>
                    <p class="text-2xl text-gray-300 leading-relaxed">
                        AXIOM is the <span class="gradient-text font-bold">AI brain</span> that powers InMarketTraffic's content generation. 
                        It transforms your knowledge base into <span class="gradient-text font-bold">intelligent, trust-building communications</span> 
                        that get smarter with every interaction.
                    </p>
                </div>

                <!-- Core Pillars -->
                <div class="grid md:grid-cols-3 gap-8">
                    <div class="glass rounded-3xl p-10 card-interactive" data-tippy-content="Every output validated against constitutional rules">
                        <div class="card-icon text-6xl mb-6">🧠</div>
                        <h3 class="text-3xl font-black mb-4 gradient-text">The Brain</h3>
                        <p class="text-gray-300 text-lg leading-relaxed">
                            RAG-powered retrieval, multi-model AI orchestration, and workflow-based content generation that adapts to your needs.
                        </p>
                    </div>

                    <div class="glass rounded-3xl p-10 card-interactive" data-tippy-content="If it hurts long-term trust, it gets rejected">
                        <div class="card-icon text-6xl mb-6">⚖️</div>
                        <h3 class="text-3xl font-black mb-4 gradient-text">Constitutional AI</h3>
                        <p class="text-gray-300 text-lg leading-relaxed">
                            Hard constraints ensure every piece of content preserves trust. No shortcuts, no manipulation, no compromises.
                        </p>
                    </div>

                    <div class="glass rounded-3xl p-10 card-interactive" data-tippy-content="Daily optimization at 06:00 AM ET">
                        <div class="card-icon text-6xl mb-6">📈</div>
                        <h3 class="text-3xl font-black mb-4 gradient-text">Self-Healing</h3>
                        <p class="text-gray-300 text-lg leading-relaxed">
                            A daily learning loop ingests performance data and automatically improves tomorrow's content generation.
                        </p>
                    </div>
                </div>

                <!-- Before/After Comparison -->
                <div class="grid md:grid-cols-2 gap-8">
                    <div class="glass rounded-3xl p-10">
                        <h3 class="text-3xl font-bold mb-6 text-gray-400">❌ Without AXIOM</h3>
                        <ul class="space-y-4 text-lg">
                            <li class="flex items-start gap-3">
                                <span class="text-red-500">✗</span>
                                <span class="text-gray-300">Manual email writing at scale</span>
                            </li>
                            <li class="flex items-start gap-3">
                                <span class="text-red-500">✗</span>
                                <span class="text-gray-300">Guessing what works, no data</span>
                            </li>
                            <li class="flex items-start gap-3">
                                <span class="text-red-500">✗</span>
                                <span class="text-gray-300">Inconsistent brand voice</span>
                            </li>
                            <li class="flex items-start gap-3">
                                <span class="text-red-500">✗</span>
                                <span class="text-gray-300">Zero learning from results</span>
                            </li>
                            <li class="flex items-start gap-3">
                                <span class="text-red-500">✗</span>
                                <span class="text-gray-300">Scaling = hiring more writers</span>
                            </li>
                        </ul>
                    </div>

                    <div class="glass rounded-3xl p-10 glow" style="background: linear-gradient(135deg, rgba(0,212,170,0.1) 0%, rgba(0,153,204,0.1) 100%);">
                        <h3 class="text-3xl font-bold mb-6 gradient-text">✓ With AXIOM</h3>
                        <ul class="space-y-4 text-lg">
                            <li class="flex items-start gap-3">
                                <span class="gradient-text font-bold">✓</span>
                                <span class="text-white font-medium">AI writes following YOUR rules</span>
                            </li>
                            <li class="flex items-start gap-3">
                                <span class="gradient-text font-bold">✓</span>
                                <span class="text-white font-medium">Constitutional guardrails built-in</span>
                            </li>
                            <li class="flex items-start gap-3">
                                <span class="gradient-text font-bold">✓</span>
                                <span class="text-white font-medium">Perfect brand consistency always</span>
                            </li>
                            <li class="flex items-start gap-3">
                                <span class="gradient-text font-bold">✓</span>
                                <span class="text-white font-medium">System learns what works daily</span>
                            </li>
                            <li class="flex items-start gap-3">
                                <span class="gradient-text font-bold">✓</span>
                                <span class="text-white font-medium">Infinite scalability, zero marginal cost</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <!-- CTA -->
                <div class="text-center">
                    <button class="btn-primary text-xl" onclick="tabs[1].click()">
                        <span class="relative z-10">See How It Powers IMT</span> →
                    </button>
                </div>
            </div>
        `,

        'visualflow': `
            <div class="max-w-7xl mx-auto px-6 py-20 space-y-20">
                <div class="text-center mb-16">
                    <h2 class="text-6xl font-black gradient-text mb-6">Complete System Flow</h2>
                    <p class="text-2xl text-gray-300">End-to-End Data Journey with Technical Specs</p>
                </div>

                <!-- Flow Diagram -->
                <div class="glass rounded-3xl p-12">
                    <svg class="w-full" viewBox="0 0 1200 2000" style="max-width: 100%; height: auto;">
                        <defs>
                            <linearGradient id="flowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style="stop-color:#00D4AA"/>
                                <stop offset="100%" style="stop-color:#0099CC"/>
                            </linearGradient>
                            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                <polygon points="0 0, 10 3.5, 0 7" fill="url(#flowGrad)" />
                            </marker>
                        </defs>
                        
                        <!-- Layer 1: n8n Orchestration -->
                        <g class="flow-section">
                            <rect x="50" y="50" width="1100" height="200" rx="20" fill="rgba(0,31,63,0.5)" stroke="url(#flowGrad)" stroke-width="3"/>
                            <text x="600" y="90" text-anchor="middle" fill="#00FFDD" font-size="28" font-weight="bold">n8n ORCHESTRATION LAYER</text>
                            
                            <rect x="100" y="120" width="300" height="100" rx="15" fill="rgba(0,212,170,0.2)" stroke="#00D4AA" stroke-width="2"/>
                            <text x="250" y="160" text-anchor="middle" fill="#fff" font-size="18" font-weight="bold">Email Received</text>
                            <text x="250" y="190" text-anchor="middle" fill="#99CCDD" font-size="14">Mailwiz → n8n</text>
                            
                            <rect x="450" y="120" width="300" height="100" rx="15" fill="rgba(0,212,170,0.2)" stroke="#00D4AA" stroke-width="2"/>
                            <text x="600" y="160" text-anchor="middle" fill="#fff" font-size="18" font-weight="bold">Workflow Trigger</text>
                            <text x="600" y="190" text-anchor="middle" fill="#99CCDD" font-size="14">Webhook → Axiom API</text>
                            
                            <rect x="800" y="120" width="300" height="100" rx="15" fill="rgba(0,212,170,0.2)" stroke="#00D4AA" stroke-width="2"/>
                            <text x="950" y="160" text-anchor="middle" fill="#fff" font-size="18" font-weight="bold">Send to Axiom</text>
                            <text x="950" y="190" text-anchor="middle" fill="#99CCDD" font-size="14">POST /api/brain/input</text>
                        </g>
                        
                        <!-- Arrow 1 -->
                        <line x1="250" y1="220" x2="250" y2="300" stroke="url(#flowGrad)" stroke-width="4" marker-end="url(#arrowhead)" class="flow-line"/>
                        
                        <!-- Layer 2: Axiom API -->
                        <g>
                            <rect x="50" y="300" width="1100" height="200" rx="20" fill="rgba(0,85,139,0.5)" stroke="url(#flowGrad)" stroke-width="3"/>
                            <text x="600" y="340" text-anchor="middle" fill="#00FFDD" font-size="28" font-weight="bold">AXIOM API LAYER</text>
                            
                            <rect x="100" y="370" width="300" height="100" rx="15" fill="rgba(0,153,204,0.2)" stroke="#0099CC" stroke-width="2"/>
                            <text x="250" y="410" text-anchor="middle" fill="#fff" font-size="18" font-weight="bold">Job Queue</text>
                            <text x="250" y="440" text-anchor="middle" fill="#99CCDD" font-size="14">Bull MQ + Redis</text>
                            
                            <rect x="450" y="370" width="300" height="100" rx="15" fill="rgba(0,153,204,0.2)" stroke="#0099CC" stroke-width="2"/>
                            <text x="600" y="410" text-anchor="middle" fill="#fff" font-size="18" font-weight="bold">Return Job ID</text>
                            <text x="600" y="440" text-anchor="middle" fill="#99CCDD" font-size="14">Status: "queued"</text>
                            
                            <rect x="800" y="370" width="300" height="100" rx="15" fill="rgba(0,153,204,0.2)" stroke="#0099CC" stroke-width="2"/>
                            <text x="950" y="410" text-anchor="middle" fill="#fff" font-size="18" font-weight="bold">Worker Processes</text>
                            <text x="950" y="440" text-anchor="middle" fill="#99CCDD" font-size="14">Background execution</text>
                        </g>
                        
                        <!-- Arrow 2 -->
                        <line x1="600" y1="500" x2="600" y2="580" stroke="url(#flowGrad)" stroke-width="4" marker-end="url(#arrowhead)" class="flow-line"/>
                        
                        <!-- Layer 3: The Brain -->
                        <g>
                            <rect x="50" y="580" width="1100" height="400" rx="20" fill="rgba(0,212,170,0.1)" stroke="url(#flowGrad)" stroke-width="4"/>
                            <text x="600" y="620" text-anchor="middle" fill="#00FFDD" font-size="32" font-weight="bold">🧠 THE BRAIN ENGINE</text>
                            
                            <!-- Node 1: Analyze -->
                            <rect x="100" y="660" width="220" height="120" rx="15" fill="rgba(0,212,170,0.3)" stroke="#00D4AA" stroke-width="3" class="pulse"/>
                            <text x="210" y="700" text-anchor="middle" fill="#fff" font-size="16" font-weight="bold">NODE 1: ANALYZE</text>
                            <text x="210" y="730" text-anchor="middle" fill="#fff" font-size="14">(Claude)</text>
                            <text x="210" y="755" text-anchor="middle" fill="#99CCDD" font-size="12">Scenario detection</text>
                            
                            <!-- Node 2: Retrieve -->
                            <rect x="360" y="660" width="220" height="120" rx="15" fill="rgba(0,153,204,0.3)" stroke="#0099CC" stroke-width="3" class="pulse"/>
                            <text x="470" y="700" text-anchor="middle" fill="#fff" font-size="16" font-weight="bold">NODE 2: RETRIEVE</text>
                            <text x="470" y="730" text-anchor="middle" fill="#fff" font-size="14">(RAG)</text>
                            <text x="470" y="755" text-anchor="middle" fill="#99CCDD" font-size="12">KB lookup + context</text>
                            
                            <!-- Node 3: Generate -->
                            <rect x="620" y="660" width="220" height="120" rx="15" fill="rgba(0,212,170,0.3)" stroke="#00D4AA" stroke-width="3" class="pulse"/>
                            <text x="730" y="700" text-anchor="middle" fill="#fff" font-size="16" font-weight="bold">NODE 3: GENERATE</text>
                            <text x="730" y="730" text-anchor="middle" fill="#fff" font-size="14">(Gemini)</text>
                            <text x="730" y="755" text-anchor="middle" fill="#99CCDD" font-size="12">Draft content</text>
                            
                            <!-- Node 4: Validate -->
                            <rect x="880" y="660" width="220" height="120" rx="15" fill="rgba(255,85,85,0.3)" stroke="#FF5555" stroke-width="3" class="pulse"/>
                            <text x="990" y="700" text-anchor="middle" fill="#fff" font-size="16" font-weight="bold">NODE 4: VALIDATE</text>
                            <text x="990" y="730" text-anchor="middle" fill="#fff" font-size="14">(Constitution)</text>
                            <text x="990" y="755" text-anchor="middle" fill="#99CCDD" font-size="12">Pass/Reject</text>
                            
                            <!-- Flow arrows between nodes -->
                            <line x1="320" y1="720" x2="360" y2="720" stroke="url(#flowGrad)" stroke-width="3" marker-end="url(#arrowhead)"/>
                            <line x1="580" y1="720" x2="620" y2="720" stroke="url(#flowGrad)" stroke-width="3" marker-end="url(#arrowhead)"/>
                            <line x1="840" y1="720" x2="880" y2="720" stroke="url(#flowGrad)" stroke-width="3" marker-end="url(#arrowhead)"/>
                            
                            <!-- Knowledge Base -->
                            <rect x="200" y="830" width="800" height="120" rx="15" fill="rgba(0,85,139,0.3)" stroke="#00558B" stroke-width="2"/>
                            <text x="600" y="870" text-anchor="middle" fill="#fff" font-size="18" font-weight="bold">KNOWLEDGE BASE</text>
                            <text x="600" y="900" text-anchor="middle" fill="#99CCDD" font-size="14">Brand • ICPs • Offers • Angles • Constitution • Strategies</text>
                            <text x="600" y="925" text-anchor="middle" fill="#667788" font-size="12">pgvector embeddings | Hybrid search | Reranking</text>
                        </g>
                        
                        <!-- Arrow 3 -->
                        <line x1="600" y1="980" x2="600" y2="1060" stroke="url(#flowGrad)" stroke-width="4" marker-end="url(#arrowhead)" class="flow-line"/>
                        
                        <!-- Layer 4: Output -->
                        <g>
                            <rect x="50" y="1060" width="1100" height="200" rx="20" fill="rgba(0,85,139,0.5)" stroke="url(#flowGrad)" stroke-width="3"/>
                            <text x="600" y="1100" text-anchor="middle" fill="#00FFDD" font-size="28" font-weight="bold">OUTPUT LAYER</text>
                            
                            <rect x="100" y="1130" width="300" height="100" rx="15" fill="rgba(0,212,170,0.2)" stroke="#00D4AA" stroke-width="2"/>
                            <text x="250" y="1170" text-anchor="middle" fill="#fff" font-size="18" font-weight="bold">✅ APPROVED</text>
                            <text x="250" y="1200" text-anchor="middle" fill="#99CCDD" font-size="14">Reply stored & returned</text>
                            
                            <rect x="450" y="1130" width="300" height="100" rx="15" fill="rgba(0,153,204,0.2)" stroke="#0099CC" stroke-width="2"/>
                            <text x="600" y="1170" text-anchor="middle" fill="#fff" font-size="18" font-weight="bold">Job Complete</text>
                            <text x="600" y="1200" text-anchor="middle" fill="#99CCDD" font-size="14">GET /api/brain/output/:id</text>
                            
                            <rect x="800" y="1130" width="300" height="100" rx="15" fill="rgba(0,212,170,0.2)" stroke="#00D4AA" stroke-width="2"/>
                            <text x="950" y="1170" text-anchor="middle" fill="#fff" font-size="18" font-weight="bold">n8n Receives</text>
                            <text x="950" y="1200" text-anchor="middle" fill="#99CCDD" font-size="14">Poll → Fetch → Send</text>
                        </g>
                        
                        <!-- Arrow 4 -->
                        <line x1="250" y1="1260" x2="250" y2="1340" stroke="url(#flowGrad)" stroke-width="4" marker-end="url(#arrowhead)" class="flow-line"/>
                        
                        <!-- Layer 5: Delivery -->
                        <g>
                            <rect x="50" y="1340" width="1100" height="200" rx="20" fill="rgba(0,31,63,0.5)" stroke="url(#flowGrad)" stroke-width="3"/>
                            <text x="600" y="1380" text-anchor="middle" fill="#00FFDD" font-size="28" font-weight="bold">DELIVERY & TRACKING</text>
                            
                            <rect x="100" y="1410" width="300" height="100" rx="15" fill="rgba(0,212,170,0.2)" stroke="#00D4AA" stroke-width="2"/>
                            <text x="250" y="1450" text-anchor="middle" fill="#fff" font-size="18" font-weight="bold">Mailwiz Sends</text>
                            <text x="250" y="1480" text-anchor="middle" fill="#99CCDD" font-size="14">Email delivery</text>
                            
                            <rect x="450" y="1410" width="300" height="100" rx="15" fill="rgba(0,153,204,0.2)" stroke="#0099CC" stroke-width="2"/>
                            <text x="600" y="1450" text-anchor="middle" fill="#fff" font-size="18" font-weight="bold">Recipient Engages</text>
                            <text x="600" y="1480" text-anchor="middle" fill="#99CCDD" font-size="14">Click/Reply/Book</text>
                            
                            <rect x="800" y="1410" width="300" height="100" rx="15" fill="rgba(0,212,170,0.2)" stroke="#00D4AA" stroke-width="2"/>
                            <text x="950" y="1450" text-anchor="middle" fill="#fff" font-size="18" font-weight="bold">Stats Tracked</text>
                            <text x="950" y="1480" text-anchor="middle" fill="#99CCDD" font-size="14">Mailwiz → Axiom</text>
                        </g>
                        
                        <!-- Arrow 5 (feedback loop) -->
                        <path d="M 1100 1460 Q 1150 1600, 1100 1740" stroke="url(#flowGrad)" stroke-width="4" fill="none" marker-end="url(#arrowhead)" stroke-dasharray="10,5" class="flow-line"/>
                        
                        <!-- Layer 6: Learning Loop -->
                        <g>
                            <rect x="50" y="1580" width="1100" height="200" rx="20" fill="rgba(0,212,170,0.1)" stroke="url(#flowGrad)" stroke-width="4"/>
                            <text x="600" y="1620" text-anchor="middle" fill="#00FFDD" font-size="28" font-weight="bold">📊 LEARNING LOOP (Daily @ 06:00 AM ET)</text>
                            
                            <rect x="100" y="1650" width="220" height="100" rx="15" fill="rgba(0,212,170,0.2)" stroke="#00D4AA" stroke-width="2"/>
                            <text x="210" y="1690" text-anchor="middle" fill="#fff" font-size="16" font-weight="bold">INGEST</text>
                            <text x="210" y="1715" text-anchor="middle" fill="#99CCDD" font-size="12">Yesterday's stats</text>
                            
                            <rect x="360" y="1650" width="220" height="100" rx="15" fill="rgba(0,153,204,0.2)" stroke="#0099CC" stroke-width="2"/>
                            <text x="470" y="1690" text-anchor="middle" fill="#fff" font-size="16" font-weight="bold">EVALUATE</text>
                            <text x="470" y="1715" text-anchor="middle" fill="#99CCDD" font-size="12">Performance analysis</text>
                            
                            <rect x="620" y="1650" width="220" height="100" rx="15" fill="rgba(0,212,170,0.2)" stroke="#00D4AA" stroke-width="2"/>
                            <text x="730" y="1690" text-anchor="middle" fill="#fff" font-size="16" font-weight="bold">APPLY RULES</text>
                            <text x="730" y="1715" text-anchor="middle" fill="#99CCDD" font-size="12">Promote/Demote/Pause</text>
                            
                            <rect x="880" y="1650" width="220" height="100" rx="15" fill="rgba(0,153,204,0.2)" stroke="#0099CC" stroke-width="2"/>
                            <text x="990" y="1690" text-anchor="middle" fill="#fff" font-size="16" font-weight="bold">UPDATE KB</text>
                            <text x="990" y="1715" text-anchor="middle" fill="#99CCDD" font-size="12">Smarter tomorrow</text>
                        </g>
                        
                        <!-- Feedback arrow to KB -->
                        <path d="M 50 1700 Q 20 1300, 50 900" stroke="#00FFDD" stroke-width="3" fill="none" marker-end="url(#arrowhead)" stroke-dasharray="8,4" opacity="0.7"/>
                        <text x="30" y="1300" fill="#00FFDD" font-size="16" font-weight="bold" transform="rotate(-90 30 1300)">Continuous Improvement Loop</text>
                    </svg>
                </div>

                <!-- Tech Specs -->
                <div class="grid md:grid-cols-2 gap-8">
                    <div class="glass rounded-3xl p-8">
                        <h3 class="text-3xl font-bold mb-6 gradient-text">🔧 Tech Stack</h3>
                        <div class="space-y-4 mono text-sm">
                            <div class="p-4 glass-light rounded-lg">
                                <p class="text-aqua-accent font-bold mb-2">Frontend</p>
                                <p class="text-gray-300">Next.js 14, React, TailwindCSS</p>
                            </div>
                            <div class="p-4 glass-light rounded-lg">
                                <p class="text-aqua-accent font-bold mb-2">Backend</p>
                                <p class="text-gray-300">Next.js API Routes, Node.js</p>
                            </div>
                            <div class="p-4 glass-light rounded-lg">
                                <p class="text-aqua-accent font-bold mb-2">Database</p>
                                <p class="text-gray-300">Supabase (PostgreSQL + pgvector)</p>
                            </div>
                            <div class="p-4 glass-light rounded-lg">
                                <p class="text-aqua-accent font-bold mb-2">Queue</p>
                                <p class="text-gray-300">BullMQ + Redis</p>
                            </div>
                            <div class="p-4 glass-light rounded-lg">
                                <p class="text-aqua-accent font-bold mb-2">AI Providers</p>
                                <p class="text-gray-300">OpenAI, Anthropic, Google, XAI, Mistral, Perplexity</p>
                            </div>
                        </div>
                    </div>

                    <div class="glass rounded-3xl p-8">
                        <h3 class="text-3xl font-bold mb-6 gradient-text">⚡ Performance Specs</h3>
                        <div class="space-y-4">
                            <div class="p-4 glass-light rounded-lg">
                                <div class="flex justify-between items-center mb-2">
                                    <span class="text-gray-300">Vector Search Latency</span>
                                    <span class="text-aqua-accent font-bold">&lt;50ms</span>
                                </div>
                                <div class="w-full bg-gray-700 rounded-full h-2">
                                    <div class="bg-gradient-to-r from-aqua-primary to-aqua-accent h-2 rounded-full" style="width: 95%"></div>
                                </div>
                            </div>
                            <div class="p-4 glass-light rounded-lg">
                                <div class="flex justify-between items-center mb-2">
                                    <span class="text-gray-300">Reply Generation Time</span>
                                    <span class="text-aqua-accent font-bold">2-4s</span>
                                </div>
                                <div class="w-full bg-gray-700 rounded-full h-2">
                                    <div class="bg-gradient-to-r from-aqua-primary to-aqua-accent h-2 rounded-full" style="width: 85%"></div>
                                </div>
                            </div>
                            <div class="p-4 glass-light rounded-lg">
                                <div class="flex justify-between items-center mb-2">
                                    <span class="text-gray-300">Concurrent Jobs</span>
                                    <span class="text-aqua-accent font-bold">1000+</span>
                                </div>
                                <div class="w-full bg-gray-700 rounded-full h-2">
                                    <div class="bg-gradient-to-r from-aqua-primary to-aqua-accent h-2 rounded-full" style="width: 100%"></div>
                                </div>
                            </div>
                            <div class="p-4 glass-light rounded-lg">
                                <div class="flex justify-between items-center mb-2">
                                    <span class="text-gray-300">Uptime SLA</span>
                                    <span class="text-aqua-accent font-bold">99.9%</span>
                                </div>
                                <div class="w-full bg-gray-700 rounded-full h-2">
                                    <div class="bg-gradient-to-r from-aqua-primary to-aqua-accent h-2 rounded-full" style="width: 99%"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `,

        'nerdtalk': `
            <div class="max-w-7xl mx-auto px-6 py-20 space-y-20">
                <div class="text-center mb-16">
                    <h2 class="text-6xl font-black gradient-text mb-6">🤓 Nerd Talk</h2>
                    <p class="text-2xl text-gray-300">Technical Integration Specifications</p>
                </div>

                <!-- API Endpoints -->
                <div class="glass rounded-3xl p-12">
                    <h3 class="text-4xl font-bold mb-8 gradient-text">API Endpoints</h3>
                    <div class="space-y-6 mono">
                        <!-- Endpoint 1 -->
                        <div class="glass-light rounded-2xl p-6 hover:glow transition-all cursor-pointer" onclick="openModal('POST /api/brain/input', getNerdContent('input'))">
                            <div class="flex items-start justify-between mb-4">
                                <div>
                                    <span class="px-4 py-1 bg-green-500 text-white rounded-full text-sm font-bold">POST</span>
                                    <span class="ml-4 text-2xl font-bold text-aqua-accent">/api/brain/input</span>
                                </div>
                                <span class="text-gray-400">Submit content generation request</span>
                            </div>
                            <p class="text-gray-300 text-sm">Click to see full spec →</p>
                        </div>

                        <!-- Endpoint 2 -->
                        <div class="glass-light rounded-2xl p-6 hover:glow transition-all cursor-pointer" onclick="openModal('GET /api/brain/status/:jobId', getNerdContent('status'))">
                            <div class="flex items-start justify-between mb-4">
                                <div>
                                    <span class="px-4 py-1 bg-blue-500 text-white rounded-full text-sm font-bold">GET</span>
                                    <span class="ml-4 text-2xl font-bold text-aqua-accent">/api/brain/status/:jobId</span>
                                </div>
                                <span class="text-gray-400">Poll job status</span>
                            </div>
                            <p class="text-gray-300 text-sm">Click to see full spec →</p>
                        </div>

                        <!-- Endpoint 3 -->
                        <div class="glass-light rounded-2xl p-6 hover:glow transition-all cursor-pointer" onclick="openModal('GET /api/brain/output/:jobId', getNerdContent('output'))">
                            <div class="flex items-start justify-between mb-4">
                                <div>
                                    <span class="px-4 py-1 bg-blue-500 text-white rounded-full text-sm font-bold">GET</span>
                                    <span class="ml-4 text-2xl font-bold text-aqua-accent">/api/brain/output/:jobId</span>
                                </div>
                                <span class="text-gray-400">Fetch completed output</span>
                            </div>
                            <p class="text-gray-300 text-sm">Click to see full spec →</p>
                        </div>

                        <!-- Endpoint 4 -->
                        <div class="glass-light rounded-2xl p-6 hover:glow transition-all cursor-pointer" onclick="openModal('POST /api/brain/webhooks/stats', getNerdContent('webhook'))">
                            <div class="flex items-start justify-between mb-4">
                                <div>
                                    <span class="px-4 py-1 bg-green-500 text-white rounded-full text-sm font-bold">POST</span>
                                    <span class="ml-4 text-2xl font-bold text-aqua-accent">/api/brain/webhooks/stats</span>
                                </div>
                                <span class="text-gray-400">Receive Mailwiz stats</span>
                            </div>
                            <p class="text-gray-300 text-sm">Click to see full spec →</p>
                        </div>
                    </div>
                </div>

                <!-- Integration Flow (from Nino's diagram) -->
                <div class="glass rounded-3xl p-12">
                    <h3 class="text-4xl font-bold mb-8 gradient-text">Nino's Integration Architecture</h3>
                    <div class="space-y-8">
                        <!-- IMT → Axiom flow -->
                        <div>
                            <h4 class="text-2xl font-bold mb-4 text-aqua-accent">1. Email Reply Request Flow</h4>
                            <div class="space-y-4">
                                <div class="flex items-center gap-4">
                                    <div class="w-48 glass-light rounded-lg p-4 text-center font-bold">Mailwiz</div>
                                    <div class="text-2xl gradient-text">→</div>
                                    <div class="w-48 glass-light rounded-lg p-4 text-center font-bold">n8n Workflow</div>
                                    <div class="text-2xl gradient-text">→</div>
                                    <div class="w-48 glass-light rounded-lg p-4 text-center font-bold">Axiom API</div>
                                </div>
                                <div class="mono text-sm text-gray-400 ml-52">
                                    <p>1. Email received in Mailwiz</p>
                                    <p>2. Webhook triggers n8n</p>
                                    <p>3. n8n calls POST /api/brain/input</p>
                                    <p>4. Axiom returns job_id</p>
                                </div>
                            </div>
                        </div>

                        <!-- Polling flow -->
                        <div>
                            <h4 class="text-2xl font-bold mb-4 text-aqua-accent">2. Status Polling</h4>
                            <div class="space-y-4">
                                <div class="flex items-center gap-4">
                                    <div class="w-48 glass-light rounded-lg p-4 text-center font-bold">n8n</div>
                                    <div class="text-2xl gradient-text">⟳</div>
                                    <div class="w-48 glass-light rounded-lg p-4 text-center font-bold">GET /status/:id</div>
                                    <div class="text-2xl gradient-text">→</div>
                                    <div class="w-48 glass-light rounded-lg p-4 text-center font-bold">"done"</div>
                                </div>
                                <div class="mono text-sm text-gray-400 ml-52">
                                    <p>1. n8n polls every 2s</p>
                                    <p>2. Status: "pending" | "processing" | "done" | "failed"</p>
                                    <p>3. When "done", fetch output</p>
                                </div>
                            </div>
                        </div>

                        <!-- Output fetch -->
                        <div>
                            <h4 class="text-2xl font-bold mb-4 text-aqua-accent">3. Output Retrieval</h4>
                            <div class="space-y-4">
                                <div class="flex items-center gap-4">
                                    <div class="w-48 glass-light rounded-lg p-4 text-center font-bold">n8n</div>
                                    <div class="text-2xl gradient-text">→</div>
                                    <div class="w-48 glass-light rounded-lg p-4 text-center font-bold">GET /output/:id</div>
                                    <div class="text-2xl gradient-text">→</div>
                                    <div class="w-48 glass-light rounded-lg p-4 text-center font-bold">Reply JSON</div>
                                </div>
                                <div class="mono text-sm text-gray-400 ml-52">
                                    <p>1. Fetch complete reply content</p>
                                    <p>2. Parse JSON response</p>
                                    <p>3. Send via Mailwiz</p>
                                </div>
                            </div>
                        </div>

                        <!-- Stats feedback -->
                        <div>
                            <h4 class="text-2xl font-bold mb-4 text-aqua-accent">4. Stats Feedback Loop</h4>
                            <div class="space-y-4">
                                <div class="flex items-center gap-4">
                                    <div class="w-48 glass-light rounded-lg p-4 text-center font-bold">Mailwiz</div>
                                    <div class="text-2xl gradient-text">→</div>
                                    <div class="w-48 glass-light rounded-lg p-4 text-center font-bold">Webhook</div>
                                    <div class="text-2xl gradient-text">→</div>
                                    <div class="w-48 glass-light rounded-lg p-4 text-center font-bold">Axiom Stats API</div>
                                </div>
                                <div class="mono text-sm text-gray-400 ml-52">
                                    <p>1. Click/Reply/Book events from Mailwiz</p>
                                    <p>2. Webhook POSTs to /api/brain/webhooks/stats</p>
                                    <p>3. Axiom ingests for learning loop</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Database Schema -->
                <div class="glass rounded-3xl p-12">
                    <h3 class="text-4xl font-bold mb-8 gradient-text">Database Schema Highlights</h3>
                    <div class="grid md:grid-cols-2 gap-6 mono text-sm">
                        <div class="glass-light rounded-2xl p-6">
                            <h4 class="text-lg font-bold mb-4 text-aqua-accent">Core Tables (Implemented)</h4>
                            <ul class="space-y-2 text-gray-300">
                                <li>• <span class="text-white">organizations</span> - Multi-tenant</li>
                                <li>• <span class="text-white">brain_templates</span> - Brain configs</li>
                                <li>• <span class="text-white">ai_providers</span> - Provider mgmt</li>
                                <li>• <span class="text-white">kb_embeddings</span> - Vector store</li>
                                <li>• <span class="text-white">worker_deployments</span> - Job queue</li>
                                <li>• <span class="text-white">vps_servers</span> - Infrastructure</li>
                            </ul>
                        </div>

                        <div class="glass-light rounded-2xl p-6">
                            <h4 class="text-lg font-bold mb-4 text-aqua-accent">IMT Tables (To Build)</h4>
                            <ul class="space-y-2 text-gray-300">
                                <li>• <span class="text-white">kb_icps</span> - Customer profiles</li>
                                <li>• <span class="text-white">kb_offers</span> - Product library</li>
                                <li>• <span class="text-white">kb_angles</span> - Narrative primitives</li>
                                <li>• <span class="text-white">kb_reply_strategies</span> - Reply logic</li>
                                <li>• <span class="text-white">constitution_rules</span> - Guardrails</li>
                                <li>• <span class="text-white">learning_preferences</span> - Self-healing</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <!-- Security & Auth -->
                <div class="glass rounded-3xl p-12">
                    <h3 class="text-4xl font-bold mb-8 gradient-text">Security & Authentication</h3>
                    <div class="space-y-6">
                        <div class="glass-light rounded-2xl p-6">
                            <h4 class="text-2xl font-bold mb-4 text-aqua-accent">API Authentication</h4>
                            <div class="mono text-sm">
                                <p class="text-gray-300 mb-4">JWT Bearer Token in Authorization header:</p>
                                <div class="bg-gray-900 p-4 rounded-lg">
                                    <code class="text-green-400">
                                        POST /api/brain/input<br/>
                                        Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...<br/>
                                        Content-Type: application/json
                                    </code>
                                </div>
                            </div>
                        </div>

                        <div class="glass-light rounded-2xl p-6">
                            <h4 class="text-2xl font-bold mb-4 text-aqua-accent">Webhook Validation</h4>
                            <div class="mono text-sm">
                                <p class="text-gray-300 mb-4">HMAC signature verification:</p>
                                <div class="bg-gray-900 p-4 rounded-lg">
                                    <code class="text-green-400">
                                        X-Webhook-Signature: sha256=abc123...<br/>
                                        X-Webhook-Timestamp: 1706050800<br/>
                                        // Prevents replay attacks
                                    </code>
                                </div>
                            </div>
                        </div>

                        <div class="glass-light rounded-2xl p-6">
                            <h4 class="text-2xl font-bold mb-4 text-aqua-accent">Rate Limiting</h4>
                            <div class="grid md:grid-cols-3 gap-4 text-center">
                                <div>
                                    <p class="text-3xl font-bold gradient-text">100/min</p>
                                    <p class="text-gray-400 text-sm">Per org</p>
                                </div>
                                <div>
                                    <p class="text-3xl font-bold gradient-text">1000/hr</p>
                                    <p class="text-gray-400 text-sm">Burst allowance</p>
                                </div>
                                <div>
                                    <p class="text-3xl font-bold gradient-text">429</p>
                                    <p class="text-gray-400 text-sm">HTTP status on limit</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `
    };

    // Add other tabs from previous version here (imt, architecture, constitution, workflows, learning, roadmap)
    // For brevity, I'll just add a placeholder - you can paste the full content
    contents.imt = `<div class="max-w-7xl mx-auto px-6 py-20"><h2 class="text-5xl font-black gradient-text text-center">InMarket Traffic content here...</h2></div>`;
    contents.architecture = `<div class="max-w-7xl mx-auto px-6 py-20"><h2 class="text-5xl font-black gradient-text text-center">Architecture content here...</h2></div>`;
    contents.constitution = `<div class="max-w-7xl mx-auto px-6 py-20"><h2 class="text-5xl font-black gradient-text text-center">Constitution content here...</h2></div>`;
    contents.workflows = `<div class="max-w-7xl mx-auto px-6 py-20"><h2 class="text-5xl font-black gradient-text text-center">Workflows content here...</h2></div>`;
    contents.learning = `<div class="max-w-7xl mx-auto px-6 py-20"><h2 class="text-5xl font-black gradient-text text-center">Learning Loop content here...</h2></div>`;
    contents.roadmap = `<div class="max-w-7xl mx-auto px-6 py-20"><h2 class="text-5xl font-black gradient-text text-center">Roadmap content here...</h2></div>`;

    return contents[tabName] || `<div class="text-center py-20"><h2 class="text-5xl font-black gradient-text">Tab: ${tabName}</h2></div>`;
}

// Nerd Talk Modal Content
function getNerdContent(type) {
    const content = {
        'input': `
            <div class="space-y-6 mono text-sm">
                <div class="bg-gray-900 p-6 rounded-lg">
                    <p class="text-aqua-accent font-bold mb-4">REQUEST:</p>
                    <pre class="text-green-400">POST /api/brain/input
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
    "buyer_stage": "CONSIDERATION",
    "previous_interactions": []
  }
}</pre>
                </div>

                <div class="bg-gray-900 p-6 rounded-lg">
                    <p class="text-aqua-accent font-bold mb-4">RESPONSE:</p>
                    <pre class="text-green-400">{
  "job_id": "uuid-1234-5678",
  "status": "queued",
  "estimated_completion": "2026-01-23T22:00:00Z"
}</pre>
                </div>
            </div>
        `,
        'status': `
            <div class="space-y-6 mono text-sm">
                <div class="bg-gray-900 p-6 rounded-lg">
                    <p class="text-aqua-accent font-bold mb-4">REQUEST:</p>
                    <pre class="text-green-400">GET /api/brain/status/{job_id}
Authorization: Bearer {jwt_token}</pre>
                </div>

                <div class="bg-gray-900 p-6 rounded-lg">
                    <p class="text-aqua-accent font-bold mb-4">RESPONSE:</p>
                    <pre class="text-green-400">{
  "job_id": "uuid-1234-5678",
  "status": "processing",  // "pending" | "processing" | "done" | "failed"
  "progress": 75,
  "created_at": "2026-01-23T21:59:45Z",
  "updated_at": "2026-01-23T21:59:58Z"
}</pre>
                </div>
            </div>
        `,
        'output': `
            <div class="space-y-6 mono text-sm">
                <div class="bg-gray-900 p-6 rounded-lg">
                    <p class="text-aqua-accent font-bold mb-4">REQUEST:</p>
                    <pre class="text-green-400">GET /api/brain/output/{job_id}
Authorization: Bearer {jwt_token}</pre>
                </div>

                <div class="bg-gray-900 p-6 rounded-lg">
                    <p class="text-aqua-accent font-bold mb-4">RESPONSE:</p>
                    <pre class="text-green-400">{
  "job_id": "uuid-1234-5678",
  "type": "email_reply",
  "output": {
    "reply_markdown": "I hear you — getting burned...",
    "reply_html": "<p>I hear you...</p>",
    "cta_included": false,
    "validation_passed": true,
    "scenario_detected": "pricing_question",
    "strategy_used": "CLARIFYING_QUESTION_FIRST"
  },
  "metadata": {
    "processing_time_ms": 2340,
    "model_used": "gemini-1.5-pro",
    "kb_version": "1.0.0",
    "constitution_checks_passed": 12
  }
}</pre>
                </div>
            </div>
        `,
        'webhook': `
            <div class="space-y-6 mono text-sm">
                <div class="bg-gray-900 p-6 rounded-lg">
                    <p class="text-aqua-accent font-bold mb-4">WEBHOOK PAYLOAD (from Mailwiz):</p>
                    <pre class="text-green-400">POST /api/brain/webhooks/stats
X-Webhook-Signature: sha256=abc123...
X-Webhook-Timestamp: 1706050800
Content-Type: application/json

{
  "date": "2026-01-22",
  "events": [
    {
      "event_type": "CLICK",
      "email_id": "email_123",
      "variant_id": "variant_a",
      "recipient_id": "recipient_456",
      "timestamp": "2026-01-22T14:30:00Z",
      "metadata": { "cta_clicked": "book_call" }
    },
    {
      "event_type": "BOOKED_CALL",
      "email_id": "email_789",
      "recipient_id": "recipient_101",
      "calendar_link": "https://cal.com/...",
      "timestamp": "2026-01-22T15:45:00Z"
    }
  ]
}</pre>
                </div>

                <div class="bg-gray-900 p-6 rounded-lg">
                    <p class="text-aqua-accent font-bold mb-4">RESPONSE:</p>
                    <pre class="text-green-400">{
  "received": 42,
  "processed": 42,
  "errors": []
}</pre>
                </div>
            </div>
        `
    };

    return content[type] || '<p>Content not found</p>';
}
