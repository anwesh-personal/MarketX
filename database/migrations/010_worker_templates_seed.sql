-- ============================================================
-- AXIOM - Migration 010: Worker Templates Seed Data
-- Created: 2026-01-16
-- Description: Default worker templates (Lekhika-inspired)
-- ============================================================

-- Insert default worker templates
INSERT INTO worker_templates (
    name,
    description,
    worker_type,
    code_template,
    environment_vars,
    config
) VALUES
(
    'Standard Worker',
    'General-purpose worker for all task types with full features',
    'queue',
    'const express = require(''express'');
const app = express();
const PORT = process.env.PORT || 3001;

// Health check
app.get(''/health'', (req, res) => {
  res.json({ status: ''healthy'', uptime: process.uptime() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Worker listening on port ${PORT}`);
});',
    '{"PORT": "3001", "NODE_ENV": "production", "MAX_MEMORY": "3G"}',
    '{
      "pm2": {
        "name": "standard-worker",
        "script": "server.js",
        "instances": 1,
        "exec_mode": "fork",
        "max_memory_restart": "3G",
        "restart_delay": 4000,
        "max_restarts": 10,
        "min_uptime": "10s",
        "kill_timeout": 5000
      }
    }'
),
(
    'Lean Worker',
    'Optimized worker with reduced memory footprint for simple tasks',
    'queue',
    'const express = require(''express'');
const app = express();
const PORT = process.env.LEAN_PORT || 3002;

app.get(''/health'', (req, res) => {
  res.json({ status: ''healthy'', type: ''lean'' });
});

app.listen(PORT, () => {
  console.log(`Lean worker on ${PORT}`);
});',
    '{"LEAN_PORT": "3002", "NODE_ENV": "production", "MAX_CONCURRENT_EXECUTIONS": "3", "WORKER_TYPE": "lean"}',
    '{
      "pm2": {
        "name": "lean-worker",
        "script": "leanServer.js",
        "instances": 1,
        "exec_mode": "fork",
        "max_memory_restart": "1500M",
        "restart_delay": 4000,
        "max_restarts": 10
      }
    }'
),
(
    'Queue Worker',
    'Background queue processor for asynchronous tasks',
    'queue',
    'const Queue = require(''bull'');
const queue = new Queue(''tasks'');

queue.process(async (job) => {
  console.log(''Processing job:'', job.id);
  // Job processing logic
  return { success: true };
});

console.log(''Queue worker started'');',
    '{"NODE_ENV": "production", "REDIS_URL": "redis://localhost:6379"}',
    '{
      "pm2": {
        "name": "queue-worker",
        "script": "queueWorker.js",
        "instances": 1,
        "exec_mode": "fork",
        "max_memory_restart": "1G",
        "restart_delay": 4000
      }
    }'
),
(
    'Bootstrap Server',
    'Control server for managing PM2 processes (always required)',
    'custom',
    'const express = require(''express'');
const pm2 = require(''pm2'');
const app = express();
const PORT = process.env.BOOTSTRAP_PORT || 3000;

app.use(express.json());

// PM2 list
app.get(''/pm2/list'', async (req, res) => {
  pm2.list((err, list) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ processes: list });
  });
});

// Start worker
app.post(''/pm2/start/:name'', async (req, res) => {
  pm2.start({ name: req.params.name }, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.listen(PORT, () => console.log(`Bootstrap on ${PORT}`));',
    '{"BOOTSTRAP_PORT": "3000", "VPS_WORKER_DIR": "/home/worker/vps-worker"}',
    '{
      "pm2": {
        "name": "bootstrap-server",
        "script": "bootstrap-server.js",
        "instances": 1,
        "exec_mode": "fork",
        "max_memory_restart": "100M",
        "restart_delay": 4000,
        "autorestart": true
      }
    }'
)
ON CONFLICT (name) DO NOTHING;

COMMENT ON TABLE worker_templates IS 'Pre-configured worker templates - Lekhika-inspired, production-grade';
