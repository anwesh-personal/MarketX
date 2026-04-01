/**
 * PM2 Bootstrap Management Server
 * ================================
 * Lightweight Express server that wraps PM2 programmatic API.
 * Runs on port 3000 and exposes HTTP endpoints for:
 *   - Listing PM2 processes
 *   - Starting/stopping/restarting/deleting individual workers
 *   - System health checks
 *
 * This is what the Superadmin Dashboard's BootstrapClient talks to.
 * It runs alongside the axiom-workers PM2 process.
 *
 * Security: Binds to 0.0.0.0 for access from Vercel serverless.
 *           In production, firewall should restrict to known IPs.
 */

const express = require('express');
const { exec } = require('child_process');
const os = require('os');

const app = express();
const PORT = 3000;

app.use(express.json());

// ─── Health ──────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        os: `${os.type()} ${os.release()}`,
        node: process.version,
        uptime: formatUptime(os.uptime()),
        hostname: os.hostname(),
        memory: {
            total: formatBytes(os.totalmem()),
            free: formatBytes(os.freemem()),
            used_pct: ((1 - os.freemem() / os.totalmem()) * 100).toFixed(1) + '%',
        },
        loadavg: os.loadavg().map(l => l.toFixed(2)),
        timestamp: new Date().toISOString(),
    });
});

// ─── PM2 List ────────────────────────────────────────────────────────────────

app.get('/pm2/list', (_req, res) => {
    execPM2('pm2 jlist', (err, stdout) => {
        if (err) return res.status(500).json({ error: err.message });

        try {
            const processes = JSON.parse(stdout);
            const mapped = processes.map(p => ({
                name: p.name,
                pm_id: p.pm_id,
                pid: p.pid,
                status: p.pm2_env?.status || 'unknown',
                uptime: p.pm2_env?.pm_uptime ? Date.now() - p.pm2_env.pm_uptime : 0,
                restarts: p.pm2_env?.restart_time || 0,
                memory: p.monit?.memory || 0,
                cpu: p.monit?.cpu || 0,
                script: p.pm2_env?.pm_exec_path || '',
                type: 'standard',
            }));

            res.json({ success: true, processes: mapped });
        } catch (parseErr) {
            res.status(500).json({ error: 'Failed to parse PM2 output' });
        }
    });
});

// ─── PM2 Actions ─────────────────────────────────────────────────────────────

app.post('/pm2/:name/start', (req, res) => {
    const { name } = req.params;
    execPM2(`pm2 start ${sanitize(name)}`, (err, stdout) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, output: stdout.trim() });
    });
});

app.post('/pm2/:name/stop', (req, res) => {
    const { name } = req.params;
    execPM2(`pm2 stop ${sanitize(name)}`, (err, stdout) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, output: stdout.trim() });
    });
});

app.post('/pm2/:name/restart', (req, res) => {
    const { name } = req.params;
    execPM2(`pm2 restart ${sanitize(name)}`, (err, stdout) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, output: stdout.trim() });
    });
});

app.post('/pm2/:name/delete', (req, res) => {
    const { name } = req.params;
    execPM2(`pm2 delete ${sanitize(name)}`, (err, stdout) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, output: stdout.trim() });
    });
});

app.post('/pm2/start-all', (_req, res) => {
    execPM2('pm2 resurrect', (err, stdout) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, output: stdout.trim() });
    });
});

// ─── PM2 Logs ────────────────────────────────────────────────────────────────

app.get('/pm2/:name/logs', (req, res) => {
    const { name } = req.params;
    const lines = Math.min(parseInt(req.query.lines) || 50, 500);
    execPM2(`pm2 logs ${sanitize(name)} --lines ${lines} --nostream`, (err, stdout) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, logs: stdout });
    });
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Sanitize PM2 process name — prevent command injection */
function sanitize(name) {
    return name.replace(/[^a-zA-Z0-9_-]/g, '');
}

/** Execute PM2 command with timeout */
function execPM2(cmd, callback) {
    exec(cmd, { timeout: 15000, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
        if (err) {
            console.error(`[bootstrap] ${cmd} failed:`, err.message);
            callback(new Error(stderr || err.message));
            return;
        }
        callback(null, stdout);
    });
}

function formatUptime(seconds) {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

function formatBytes(bytes) {
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(1)}G`;
    return `${(bytes / (1024 * 1024)).toFixed(0)}M`;
}

// ─── Start ───────────────────────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
    console.log(`[PM2 Bootstrap] Running on port ${PORT}`);
    console.log(`[PM2 Bootstrap] Health: http://localhost:${PORT}/health`);
    console.log(`[PM2 Bootstrap] PM2 List: http://localhost:${PORT}/pm2/list`);
});
