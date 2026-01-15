import kbWorker from './workers/kb-worker'
import conversationWorker from './workers/conversation-worker'
import analyticsWorker from './workers/analytics-worker'

console.log('🔧 Axiom Workers Starting...')
console.log('  - KB Processor (5 concurrent)')
console.log('  - Conversation Summarizer (3 concurrent)')
console.log('  - Analytics Aggregator (2 concurrent)')
console.log('')
console.log('Worker system ready. Waiting for jobs...')

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🛑 Shutting down workers...')
    await Promise.all([
        kbWorker.close(),
        conversationWorker.close(),
        analyticsWorker.close(),
    ])
    console.log('✅ Workers shut down successfully')
    process.exit(0)
})

process.on('SIGINT', async () => {
    console.log('🛑 Interrupted, shutting down workers...')
    await Promise.all([
        kbWorker.close(),
        conversationWorker.close(),
        analyticsWorker.close(),
    ])
    console.log('✅ Workers shut down successfully')
    process.exit(0)
})

// Keep process alive
setInterval(() => { }, 1000)
