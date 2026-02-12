import kbWorker from './workers/kb-worker'
import conversationWorker from './workers/conversation-worker'
import analyticsWorker from './workers/analytics-worker'
import dreamStateWorker from './workers/dream-state-worker'
import fineTuningWorker from './workers/fine-tuning-worker'
import learningLoopWorker from './workers/learning-loop-worker'
import workflowExecutionWorker from './workers/workflow-execution-worker'
import engineExecutionWorker from './workers/engine-execution-worker'
import { startApiServer } from './api/server'

// Start the API server for queue management
const API_PORT = parseInt(process.env.API_PORT || '3100')
startApiServer(API_PORT)

console.log('═══════════════════════════════════════════════════════════')
console.log('               AXIOM WORKER SYSTEM                          ')
console.log('═══════════════════════════════════════════════════════════')
console.log('')
console.log('📦 Core Workers:')
console.log('   - KB Processor (5 concurrent)')
console.log('   - Conversation Summarizer (3 concurrent)')
console.log('   - Analytics Aggregator (2 concurrent)')
console.log('')
console.log('🧠 Brain Workers:')
console.log('   - Dream State (2 concurrent) - Memory consolidation, cleanup')
console.log('   - Fine-Tuning (1 concurrent) - Training pipeline')
console.log('   - Learning Loop (1 concurrent) - Daily optimization')
console.log('')
console.log('⚡ Execution Workers:')
console.log('   - Workflow Execution (10 concurrent) - Template runs')
console.log('   - Engine Execution (2 concurrent) - Deployed engine runs')
console.log('')
console.log('🌐 Management API:')
console.log(`   - Running on port ${API_PORT}`)
console.log('   - Endpoints: /api/health, /api/stats, /api/action')
console.log('')
console.log('═══════════════════════════════════════════════════════════')
console.log('No internal scheduler. Jobs triggered by:')
console.log('   - MailWiz / Email triggers')
console.log('   - API endpoints')
console.log('   - External systems')
console.log('═══════════════════════════════════════════════════════════')
console.log('')
console.log('✅ All workers started. Waiting for jobs...')

// Graceful shutdown
const shutdown = async (signal: string) => {
    console.log(`\n🛑 ${signal} received. Shutting down workers...`)

    await Promise.all([
        kbWorker.close(),
        conversationWorker.close(),
        analyticsWorker.close(),
        dreamStateWorker.close(),
        fineTuningWorker.close(),
        learningLoopWorker.close(),
        workflowExecutionWorker.close(),
        engineExecutionWorker.close(),
    ])

    console.log('✅ All workers shut down successfully')
    process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

// Keep process alive
setInterval(() => { }, 1000)

