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
