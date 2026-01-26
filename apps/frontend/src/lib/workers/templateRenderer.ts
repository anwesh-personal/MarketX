/**
 * Template Renderer
 * Renders worker code from templates with variable substitution
 */

export interface TemplateContext {
    name: string;
    port: number;
    environmentVars: Record<string, string>;
    config: Record<string, any>;
}

/**
 * Render template with context variables
 */
export function renderTemplate(template: string, context: TemplateContext): string {
    let rendered = template;

    // Simple variable substitution: {{variable}}
    const variables = {
        ...context.environmentVars,
        NAME: context.name,
        PORT: context.port.toString(),
    };

    for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        rendered = rendered.replace(regex, value);
    }

    return rendered;
}

/**
 * Generate PM2 ecosystem.config.js content
 */
export function generateEcosystemConfig(deployment: {
    name: string;
    script_path: string;
    environment_vars: Record<string, string>;
    pm2_config: Record<string, any>;
}): string {
    const config = {
        apps: [
            {
                name: deployment.name,
                script: deployment.script_path,
                cwd: `/home/worker/${deployment.name}`,
                instances: deployment.pm2_config.instances || 1,
                exec_mode: deployment.pm2_config.exec_mode || 'fork',
                env: deployment.environment_vars,
                max_memory_restart: deployment.pm2_config.max_memory_restart || '1G',
                restart_delay: deployment.pm2_config.restart_delay || 4000,
                max_restarts: deployment.pm2_config.max_restarts || 10,
                min_uptime: deployment.pm2_config.min_uptime || '10s',
                kill_timeout: deployment.pm2_config.kill_timeout || 5000,
                autorestart: deployment.pm2_config.autorestart !== false,
                watch: deployment.pm2_config.watch || false,
            },
        ],
    };

    return `module.exports = ${JSON.stringify(config, null, 2)};\n`;
}

/**
 * Generate package.json content
 */
export function generatePackageJson(deployment: {
    name: string;
    dependencies?: Record<string, string>;
}): string {
    const pkg = {
        name: deployment.name,
        version: '1.0.0',
        private: true,
        scripts: {
            start: 'node server.js',
        },
        dependencies: deployment.dependencies || {
            express: '^4.18.2',
        },
    };

    return JSON.stringify(pkg, null, 2);
}

/**
 * Validate template rendering
 */
export function validateRenderedCode(code: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for unresolved variables
    const unresolvedVars = code.match(/{{[^}]+}}/g);
    if (unresolvedVars) {
        errors.push(`Unresolved variables: ${unresolvedVars.join(', ')}`);
    }

    // Check for basic syntax (simple checks)
    if (!code.includes('require') && !code.includes('import')) {
        errors.push('No module imports found');
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}
