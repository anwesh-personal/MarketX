/**
 * Engine Services Index
 * 
 * Central exports for the Engine System
 * Uses Axiom's engine_instances table from migration 014
 */

export { engineDeploymentService } from './engineDeploymentService'
export {
    getActiveEngineRuntime,
    requireActiveEngineRuntime,
    invalidateSystemDefaults,
    EngineNotDeployedError,
    EngineConfigError,
    BrainAgentError,
} from './EngineInstanceResolver'
export type {
    EngineRuntime,
    EngineRuntimePromptStack,
    EngineRuntimeOrgAgent,
    EngineRuntimeLLM,
    EngineRuntimeRAG,
    EngineRuntimeSelfHealing,
    EngineRuntimeWriterConfig,
} from './EngineInstanceResolver'
