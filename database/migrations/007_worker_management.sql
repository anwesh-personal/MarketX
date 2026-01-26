-- ============================================================
-- AXIOM - MIGRATION 007: Worker Management System
-- Created: 2026-01-16
-- Description: Premium worker template and deployment management
--              for superadmin control of all worker infrastructure
-- ============================================================

-- ============================================================
-- WORKER TEMPLATES
-- ============================================================

CREATE TABLE IF NOT EXISTS worker_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('brain', 'queue', 'api', 'custom')),
  description TEXT,
  code_template TEXT NOT NULL, -- Actual worker code
  config_schema JSONB DEFAULT '{}', -- Configuration options schema
  env_vars JSONB DEFAULT '{}', -- Required environment variables
  dependencies JSONB DEFAULT '{}', -- package.json dependencies
  docker_config JSONB DEFAULT '{}', -- Docker/PM2 configuration
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES platform_admins(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS worker_templates_type_idx ON worker_templates(type, is_active);
CREATE INDEX IF NOT EXISTS worker_templates_active_idx ON worker_templates(is_active, created_at DESC);

COMMENT ON TABLE worker_templates IS 'Worker code templates managed by superadmin';
COMMENT ON COLUMN worker_templates.code_template IS 'Complete worker source code with placeholders';
COMMENT ON COLUMN worker_templates.config_schema IS 'JSON schema for worker configuration UI';
COMMENT ON COLUMN worker_templates.env_vars IS 'Required environment variables with descriptions';

-- ============================================================
-- WORKER DEPLOYMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS worker_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES worker_templates(id) ON DELETE RESTRICT,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  
  -- Server details
  server_ip VARCHAR(45) NOT NULL, -- IPv4 or IPv6
  port INTEGER NOT NULL CHECK (port > 0 AND port < 65536),
  ssh_user VARCHAR(255),
  ssh_key_encrypted TEXT, -- Encrypted SSH private key
  
  -- Configuration
  env_config JSONB DEFAULT '{}', -- Actual environment variable values
  worker_config JSONB DEFAULT '{}', -- Worker-specific config
  
  -- Status
  status VARCHAR(50) DEFAULT 'stopped' CHECK (status IN ('stopped', 'starting', 'running', 'stopping', 'error', 'unhealthy')),
  health_status JSONB DEFAULT '{}', -- CPU, memory, uptime, etc.
  last_health_check TIMESTAMPTZ,
  error_message TEXT,
  
  -- Deployment info
  last_deployed_at TIMESTAMPTZ,
  last_deployed_by UUID REFERENCES platform_admins(id),
  deployment_log TEXT,
  
  --Settings
  auto_restart BOOLEAN DEFAULT true,
  max_memory VARCHAR(10) DEFAULT '2G',
  concurrency INTEGER DEFAULT 1,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(server_ip, port)
);

CREATE INDEX IF NOT EXISTS worker_deployments_template_idx ON worker_deployments(template_id);
CREATE INDEX IF NOT EXISTS worker_deployments_status_idx ON worker_deployments(status);
CREATE INDEX IF NOT EXISTS worker_deployments_server_idx ON worker_deployments(server_ip, port);
CREATE INDEX IF NOT EXISTS worker_deployments_health_idx ON worker_deployments(last_health_check DESC) WHERE status = 'running';

COMMENT ON TABLE worker_deployments IS 'Deployed worker instances with server details';
COMMENT ON COLUMN worker_deployments.ssh_key_encrypted IS 'Encrypted SSH key for server access (use encrypt/decrypt functions)';
COMMENT ON COLUMN worker_deployments.health_status IS 'Real-time health metrics: {cpu, memory, uptime, requests}';

-- ============================================================
-- WORKER HEALTH LOGS
-- ============================================================

CREATE TABLE IF NOT EXISTS worker_health_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id UUID NOT NULL REFERENCES worker_deployments(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  cpu_percent FLOAT,
  memory_mb INTEGER,
  uptime_seconds INTEGER,
  active_requests INTEGER,
  errors_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Partition by time for better performance (optional, implement later)
CREATE INDEX IF NOT EXISTS worker_health_deployment_idx ON worker_health_logs(deployment_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS worker_health_timestamp_idx ON worker_health_logs(timestamp DESC);

COMMENT ON TABLE worker_health_logs IS 'Time-series health metrics for deployed workers';

-- ============================================================
-- WORKER EXECUTION LOGS
-- ============================================================

CREATE TABLE IF NOT EXISTS worker_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id UUID NOT NULL REFERENCES worker_deployments(id) ON DELETE CASCADE,
  execution_id UUID, -- Reference to specific job/task
  log_level VARCHAR(20) DEFAULT 'info' CHECK (log_level IN ('debug', 'info', 'warn', 'error', 'fatal')),
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS worker_logs_deployment_idx ON worker_execution_logs(deployment_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS worker_logs_level_idx ON worker_execution_logs(log_level, timestamp DESC) WHERE log_level IN ('error', 'fatal');
CREATE INDEX IF NOT EXISTS worker_logs_execution_idx ON worker_execution_logs(execution_id) WHERE execution_id IS NOT NULL;

COMMENT ON TABLE worker_execution_logs IS 'Centralized logging for all worker executions';

-- ============================================================
-- WORKERS (ACTUAL INSTANCES)
-- ============================================================

-- Track running worker instances (separate from deployments/configs)
CREATE TABLE IF NOT EXISTS workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_type VARCHAR(100) NOT NULL CHECK (worker_type IN ('writer', 'learning', 'analytics', 'brain', 'queue', 'custom')),
  deployment_id UUID REFERENCES worker_deployments(id) ON DELETE SET NULL,
  hostname VARCHAR(255) NOT NULL,
  pid INTEGER,
  status VARCHAR(50) DEFAULT 'idle' CHECK (status IN ('active', 'idle', 'dead')),
  last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure deployment_id exists (for re-running migrations)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workers' AND column_name = 'deployment_id'
  ) THEN
    ALTER TABLE workers ADD COLUMN deployment_id UUID REFERENCES worker_deployments(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS workers_status_idx ON workers(status, last_heartbeat DESC);
CREATE INDEX IF NOT EXISTS workers_type_idx ON workers(worker_type, status);
CREATE INDEX IF NOT EXISTS workers_deployment_idx ON workers(deployment_id) WHERE deployment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS workers_heartbeat_idx ON workers(last_heartbeat DESC) WHERE status != 'dead';

COMMENT ON TABLE workers IS 'Running worker instances with heartbeat tracking';
COMMENT ON COLUMN workers.deployment_id IS 'Links to deployment config (null if manually started)';
COMMENT ON COLUMN workers.status IS 'active=processing, idle=waiting, dead=no heartbeat >60s';

-- Auto-update dead workers (no heartbeat in 60s)
CREATE OR REPLACE FUNCTION mark_dead_workers()
RETURNS void AS $$
BEGIN
  UPDATE workers
  SET status = 'dead'
  WHERE status != 'dead'
    AND last_heartbeat < NOW() - INTERVAL '60 seconds';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION mark_dead_workers() IS 'Mark workers as dead if no heartbeat in 60 seconds';

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_worker_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp triggers
CREATE TRIGGER worker_templates_updated_at
BEFORE UPDATE ON worker_templates
FOR EACH ROW
EXECUTE FUNCTION update_worker_timestamp();

CREATE TRIGGER worker_deployments_updated_at
BEFORE UPDATE ON worker_deployments
FOR EACH ROW
EXECUTE FUNCTION update_worker_timestamp();

-- Get worker health summary
CREATE OR REPLACE FUNCTION get_worker_health_summary(p_deployment_id UUID)
RETURNS TABLE (
  avg_cpu FLOAT,
  avg_memory FLOAT,
  max_memory FLOAT,
  avg_uptime FLOAT,
  total_errors INTEGER,
  last_check TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    AVG(cpu_percent),
    AVG(memory_mb),
    MAX(memory_mb),
    AVG(uptime_seconds),
    SUM(errors_count)::INTEGER,
    MAX(timestamp)
  FROM worker_health_logs
  WHERE deployment_id = p_deployment_id
    AND timestamp > NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_worker_health_summary(UUID) IS 'Get aggregated health metrics for last hour';

-- ============================================================
-- SECURITY (RLS)
-- ============================================================

ALTER TABLE worker_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_health_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;

-- Only superadmins can manage workers
CREATE POLICY superadmin_worker_templates ON worker_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admins
      WHERE platform_admins.email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY superadmin_worker_deployments ON worker_deployments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admins
      WHERE platform_admins.email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY superadmin_worker_health ON worker_health_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admins
      WHERE platform_admins.email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY superadmin_worker_logs ON worker_execution_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admins
      WHERE platform_admins.email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY superadmin_workers ON workers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admins
      WHERE platform_admins.email = auth.jwt() ->> 'email'
    )
  );

-- ============================================================
-- DEFAULT WORKER TEMPLATES
-- ============================================================

-- Brain Worker Template
INSERT INTO worker_templates (name, type, description, code_template, config_schema, env_vars, dependencies) VALUES
('Brain Worker', 'brain', 'Processes brain/AI requests with RAG and agent orchestration', 
'// Brain Worker Template
import { BrainOrchestrator } from "@/services/brain"
import { aiProviderService } from "@/services/ai"

export async function processBrainRequest(request) {
  const { brainId, userId, query, context } = request
  
  // Initialize brain orchestrator
  const orchestrator = new BrainOrchestrator(brainId)
  
  // Process request
  const response = await orchestrator.process({
    userId,
    query,
    context
  })
  
  return response
}

// Health check
export async function healthCheck() {
  return {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  }
}',
'{
  "port": {
    "type": "number",
    "description": "Port to run worker on",
    "default": 3001
  },
  "concurrency": {
    "type": "number",
    "description": "Max concurrent requests",
    "default": 5
  }
}',
'{
  "SUPABASE_URL": "Supabase project URL",
  "SUPABASE_SERVICE_KEY": "Supabase service role key",
  "REDIS_URL": "Redis connection string (optional)"
}',
'{
  "@supabase/supabase-js": "^2.39.0",
  "ioredis": "^5.3.2",
  "dotenv": "^16.3.1"
}'),

-- Queue Worker Template
('Queue Worker', 'queue', 'Processes background jobs from BullMQ queues',
'// Queue Worker Template
import Queue from "bullmq"
import { processJob } from "./jobs"

const queue = new Queue("axiom-jobs", {
  connection: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
  }
})

// Process jobs
queue.process(async (job) => {
  console.log(`Processing job ${job.id}`)
  return await processJob(job.data)
})

console.log("Queue worker started")
',
'{
  "concurrency": {
    "type": "number",
    "description": "Number of concurrent jobs",
    "default": 2
  }
}',
'{
  "REDIS_HOST": "Redis server host",
  "REDIS_PORT": "Redis server port",
  "REDIS_PASSWORD": "Redis password (optional)"
}',
'{
  "bullmq": "^5.0.0",
  "ioredis": "^5.3.2"
}')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- VALIDATION
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE 'Loaded % worker templates', (SELECT COUNT(*) FROM worker_templates);
END $$;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration 007_worker_management.sql COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  - worker_templates';
  RAISE NOTICE '  - worker_deployments';
  RAISE NOTICE '  - worker_health_logs';
  RAISE NOTICE '  - worker_execution_logs';
  RAISE NOTICE '  - workers (instances)';
  RAISE NOTICE 'RLS Policies: 5 policies enabled';
  RAISE NOTICE 'Default templates: 2 loaded';
  RAISE NOTICE '========================================';
END $$;
