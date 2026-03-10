# AXIOM - Phase 0: Complete Lekhika AI System Port
**Priority:** CRITICAL - Must complete BEFORE all other phases  
**Duration:** 7-10 days  
**Goal:** Production-grade AI Provider Management + Design System + Worker Infrastructure

---

## 🎯 **Objective**

Port Lekhika's **battle-tested** AI management system completely - logic, architecture, patterns, workflows. This is the **foundation** that everything else builds on.

**What We're Porting:**
1. Complete AI Provider Management system (multi-key, failover, validation, model discovery)
2. Design system (theme-governed, NO hardcoded colors)
3. Worker orchestration patterns (PM2, deployment, monitoring)
4. Queue management UI patterns
5. Superadmin architecture patterns
6. Modal/component patterns

**What We're NOT Porting:**
- ❌ Lekhika's specific colors (we use theme system)
- ❌ Lekhika's business logic (book generation, etc.)
- ❌ Lekhika's branding

---

## 📋 **Phase Breakdown**

### **Day 1-2: Design System Foundation**

#### **1.1: Theme Configuration (Theme-Governed Colors)**

**File:** `apps/frontend/src/styles/theme.ts`
```typescript
export const theme = {
  colors: {
    // Primary palette
    primary: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9',  // Main brand color
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',
      950: '#082f49'
    },
    
    // Secondary palette
    secondary: {
      50: '#faf5ff',
      100: '#f3e8ff',
      200: '#e9d5ff',
      300: '#d8b4fe',
      400: '#c084fc',
      500: '#a855f7',  // Secondary brand
      600: '#9333ea',
      700: '#7e22ce',
      800: '#6b21a8',
      900: '#581c87',
      950: '#3b0764'
    },
    
    // Accent palette
    accent: {
      50: '#ecfdf5',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',
      500: '#10b981',  // Success/accent
      600: '#059669',
      700: '#047857',
      800: '#065f46',
      900: '#064e3b',
      950: '#022c22'
    },
    
    // Semantic colors
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    
    // Neutral palette (for backgrounds, text, borders)
    neutral: {
      0: '#ffffff',
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#e5e5e5',
      300: '#d4d4d4',
      400: '#a3a3a3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
      950: '#0a0a0a',
      1000: '#000000'
    },
    
    // Gradients
    gradients: {
      primary: 'linear-gradient(135deg, #0ea5e9 0%, #a855f7 100%)',
      secondary: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
      success: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
      danger: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
      premium: 'linear-gradient(135deg, #f59e0b 0%, #f59e0b 50%, #eab308 100%)'
    }
  },
  
  // Typography
  typography: {
    fontFamily: {
      sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      mono: '"Fira Code", "JetBrains Mono", Consolas, monospace',
      display: '"Cal Sans", Inter, sans-serif'
    },
    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem',// 30px
      '4xl': '2.25rem', // 36px
      '5xl': '3rem',    // 48px
      '6xl': '3.75rem'  // 60px
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      black: 900
    }
  },
  
  // Spacing
  spacing: {
    px: '1px',
    0: '0',
    0.5: '0.125rem',  // 2px
    1: '0.25rem',     // 4px
    1.5: '0.375rem',  // 6px
    2: '0.5rem',      // 8px
    2.5: '0.625rem',  // 10px
    3: '0.75rem',     // 12px
    3.5: '0.875rem',  // 14px
    4: '1rem',        // 16px
    5: '1.25rem',     // 20px
    6: '1.5rem',      // 24px
    7: '1.75rem',     // 28px
    8: '2rem',        // 32px
    9: '2.25rem',     // 36px
    10: '2.5rem',     // 40px
    12: '3rem',       // 48px
    14: '3.5rem',     // 56px
    16: '4rem',       // 64px
    20: '5rem',       // 80px
    24: '6rem',       // 96px
    32: '8rem',       // 128px
    40: '10rem',      // 160px
    48: '12rem',      // 192px
    56: '14rem',      // 224px
    64: '16rem'       // 256px
  },
  
  // Border radius
  borderRadius: {
    none: '0',
    sm: '0.125rem',   // 2px
    base: '0.25rem',  // 4px
    md: '0.375rem',   // 6px
    lg: '0.5rem',     // 8px
    xl: '0.75rem',    // 12px
    '2xl': '1rem',    // 16px
    '3xl': '1.5rem',  // 24px
    full: '9999px'
  },
  
  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
    none: 'none',
    
    // Colored shadows for premium effects
    primaryGlow: '0 0 30px -5px rgba(14, 165, 233, 0.5)',
    secondaryGlow: '0 0 30px -5px rgba(168, 85, 247, 0.5)',
    accentGlow: '0 0 30px -5px rgba(16, 185, 129, 0.5)'
  },
  
  // Animations
  animations: {
    transition: {
      fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
      base: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
      slow: '500ms cubic-bezier(0.4, 0, 0.2, 1)',
      spring: '500ms cubic-bezier(0.68, -0.55, 0.265, 1.55)'
    }
  },
  
  // Z-index layers
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1010,
    fixed: 1020,
    modalBackdrop: 1030,
    modal: 1040,
    popover: 1050,
    tooltip: 1060
  }
} as const

export type Theme = typeof theme
```

**File:** `apps/frontend/src/styles/globals.css`
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;900&family=Fira+Code:wght@400;500;600&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  /* Primary colors */
  --color-primary-50: 240 249 255;
  --color-primary-500: 14 165 233;
  --color-primary-600: 2 132 199;
  --color-primary-700: 3 105 161;
  
  /* Secondary colors */
  --color-secondary-500: 168 85 247;
  --color-secondary-600: 147 51 234;
  
  /* Accent colors */
  --color-accent-500: 16 185 129;
  
  /* Semantic */
  --color-success: 16 185 129;
  --color-warning: 245 158 11;
  --color-error: 239 68 68;
  --color-info: 59 130 246;
  
  /* Neutral */
  --color-neutral-0: 255 255 255;
  --color-neutral-50: 250 250 250;
  --color-neutral-100: 245 245 245;
  --color-neutral-200: 229 229 229;
  --color-neutral-300: 212 212 212;
  --color-neutral-500: 115 115 115;
  --color-neutral-700: 64 64 64;
  --color-neutral-800: 38 38 38;
  --color-neutral-900: 23 23 23;
  --color-neutral-950: 10 10 10;
  --color-neutral-1000: 0 0 0;
}

* {
  box-sizing: border-box;
  padding: 0;
  margin: 0;
}

html,
body {
  max-width: 100vw;
  overflow-x: hidden;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  background: rgb(var(--color-neutral-50));
  color: rgb(var(--color-neutral-900));
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}

::-webkit-scrollbar-track {
  background: rgb(var(--color-neutral-100));
  border-radius: 6px;
}

::-webkit-scrollbar-thumb {
  background: rgb(var(--color-neutral-300));
  border-radius: 6px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgb(var(--color-neutral-500));
}

/* Focus styles */
*:focus-visible {
  outline: 2px solid rgb(var(--color-primary-500));
  outline-offset: 2px;
}

/* Selection */
::selection {
  background: rgba(var(--color-primary-500), 0.2);
  color: rgb(var(--color-neutral-900));
}
```

**CRITICAL RULE:** All components MUST use theme variables, NEVER hardcoded colors.

---

### **Day 3-4: AI Provider Management (Complete Lekhika Port)**

#### **2.1: Enhanced AI Provider Management**

**File:** `apps/frontend/src/lib/ai-providers.ts`
```typescript
import { createClient } from '@/lib/supabase/server'

export interface AIProvider {
  id: string
  org_id: string | null
  provider_type: 'OpenAI' | 'Anthropic' | 'Google' | 'Mistral' | 'Perplexity' | 'XAI'
  api_key: string
  label: string | null
  is_active: boolean
  usage_count: number
  failure_count: number
  last_used_at: string | null
  available_models: string[] | null
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface Provider Config {
  type: AIProvider['provider_type']
  name: string
  baseUrl: string
  validationEndpoint: string
  modelListEndpoint?: string
  icon: string
  gradient: string
  description: string
}

export const PROVIDER_CONFIGS: Record<AIProvider['provider_type'], ProviderConfig> = {
  OpenAI: {
    type: 'OpenAI',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    validationEndpoint: '/models',
    modelListEndpoint: '/models',
    icon: '🤖',
    gradient: 'from-emerald-500 to-teal-600',
    description: 'GPT-4, GPT-3.5, and other OpenAI models'
  },
  Anthropic: {
    type: 'Anthropic',
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    validationEndpoint: '/messages',
    icon: '🧠',
    gradient: 'from-orange-500 to-pink-600',
    description: 'Claude 3.5 Sonnet, Opus, and Haiku'
  },
  Google: {
    type: 'Google',
    name: 'Google AI',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    validationEndpoint: '/models',
    modelListEndpoint: '/models',
    icon: '✨',
    gradient: 'from-blue-500 to-cyan-600',
    description: 'Gemini Pro, Gemini Ultra'
  },
  Mistral: {
    type: 'Mistral',
    name: 'Mistral AI',
    baseUrl: 'https://api.mistral.ai/v1',
    validationEndpoint: '/models',
    modelListEndpoint: '/models',
    icon: '⚡',
    gradient: 'from-purple-500 to-indigo-600',
    description: 'Mistral Large, Medium, Small'
  },
  Perplexity: {
    type: 'Perplexity',
    name: 'Perplexity',
    baseUrl: 'https://api.perplexity.ai',
    validationEndpoint: '/chat/completions',
    icon: '🔍',
    gradient: 'from-cyan-500 to-blue-600',
    description: 'Sonar models with web search'
  },
  XAI: {
    type: 'XAI',
    name: 'X.AI',
    baseUrl: 'https://api.x.ai/v1',
    validationEndpoint: '/chat/completions',
    icon: '🚀',
    gradient: 'from-gray-700 to-gray-900',
    description: 'Grok models'
  }
}

/**
 * Get active provider for org with automatic failover
 */
export async function getActiveProvider(
  providerType: AIProvider['provider_type'],
  orgId: string | null = null
): Promise<AIProvider> {
  const supabase = createClient()
  
  // Query for active providers (org-specific OR platform-level)
  let query = supabase
    .from('ai_providers')
    .select('*')
    .eq('provider_type', providerType)
    .eq('is_active', true)
    .order('failure_count', { ascending: true })
    .order('last_used_at', { ascending: false, nullsFirst: false })
  
  if (orgId) {
    // Prefer org-specific, fallback to platform
    query = query.or(`org_id.eq.${orgId},org_id.is.null`)
  } else {
    // Platform-level only
    query = query.is('org_id', null)
  }
  
  const { data, error } = await query
  
  if (error || !data || data.length === 0) {
    throw new Error(`No active ${providerType} provider found`)
  }
  
  // Return first (least failures, most recently used)
  return data[0]
}

/**
 * Validate API key and discover models
 */
export async function validateAndDiscoverProvider(
  providerType: AIProvider['provider_type'],
  apiKey: string
): Promise<{ valid: boolean; models?: string[]; error?: string }> {
  const config = PROVIDER_CONFIGS[providerType]
  
  try {
    switch (providerType) {
      case 'OpenAI':
        return await validateOpenAI(apiKey)
      case 'Anthropic':
        return await validateAnthropic(apiKey)
      case 'Google':
        return await validateGoogle(apiKey)
      case 'Mistral':
        return await validateMistral(apiKey)
      case 'Perplexity':
        return await validatePerplexity(apiKey)
      case 'XAI':
        return await validateXAI(apiKey)
      default:
        return { valid: false, error: 'Unknown provider type' }
    }
  } catch (error: any) {
    return { valid: false, error: error.message }
  }
}

async function validateOpenAI(apiKey: string) {
  const response = await fetch('https://api.openai.com/v1/models', {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  })
  
  if (!response.ok) {
    throw new Error(`OpenAI validation failed: ${response.statusText}`)
  }
  
  const data = await response.json()
  const models = data.data
    .filter((m: any) => m.id.includes('gpt'))
    .map((m: any) => m.id)
  
  return { valid: true, models }
}

async function validateAnthropic(apiKey: string) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'test' }]
    })
  })
  
  if (!response.ok && response.status !== 400) {
    throw new Error(`Anthropic validation failed: ${response.statusText}`)
  }
  
  // Known Claude models
  const models = [
    'claude-3-5-sonnet-20241022',
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307'
  ]
  
  return { valid: true, models }
}

async function validateGoogle(apiKey: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
  )
  
  if (!response.ok) {
    throw new Error(`Google validation failed: ${response.statusText}`)
  }
  
  const data = await response.json()
  const models = data.models
    .filter((m: any) => m.name.includes('gemini'))
    .map((m: any) => m.name.split('/').pop())
  
  return { valid: true, models }
}

async function validateMistral(apiKey: string) {
  const response = await fetch('https://api.mistral.ai/v1/models', {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  })
  
  if (!response.ok) {
    throw new Error(`Mistral validation failed: ${response.statusText}`)
  }
  
  const data = await response.json()
  const models = data.data.map((m: any) => m.id)
  
  return { valid: true, models }
}

async function validatePerplexity(apiKey: string) {
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.1-sonar-small-128k-online',
      messages: [{ role: 'user', content: 'test' }],
      max_tokens: 1
    })
  })
  
  if (!response.ok && response.status !== 400) {
    throw new Error(`Perplexity validation failed: ${response.statusText}`)
  }
  
  const models = [
    'llama-3.1-sonar-small-128k-online',
    'llama-3.1-sonar-large-128k-online',
    'llama-3.1-sonar-huge-128k-online'
  ]
  
  return { valid: true, models }
}

async function validateXAI(apiKey: string) {
  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'grok-beta',
      messages: [{ role: 'user', content: 'test' }],
      max_tokens: 1
    })
  })
  
  if (!response.ok && response.status !== 400) {
    throw new Error(`X.AI validation failed: ${response.statusText}`)
  }
  
  const models = ['grok-beta', 'grok-vision-beta']
  
  return { valid: true, models }
}

/**
 * Track usage and failures
 */
export async function trackProviderUsage(
  providerId: string,
  success: boolean
) {
  const supabase = createClient()
  
  const updateData: any = {
    updated_at: new Date().toISOString(),
    last_used_at: new Date().toISOString()
  }
  
  if (success) {
    updateData.usage_count = supabase.raw('usage_count + 1')
  } else {
    updateData.failure_count = supabase.raw('failure_count + 1')
    
    // Auto-disable if too many failures
    const { data } = await supabase
      .from('ai_providers')
      .select('failure_count')
      .eq('id', providerId)
      .single()
    
    if (data && data.failure_count >= 5) {
      updateData.is_active = false
    }
  }
  
  await supabase
    .from('ai_providers')
    .update(updateData)
    .eq('id', providerId)
}
```

**NO HARDCODED KEYS. EVER. PERIOD.**

---

### **Day 5-6: Worker Infrastructure (Lekhika Patterns)**

#### **3.1: PM2 Ecosystem Config**

**File:** `ecosystem.config.js` (Root)
```javascript
module.exports = {
  apps: [
    // Main worker process (all workers in one)
    {
      name: 'axiom-workers',
      script: './apps/workers/src/index.ts',
      interpreter: 'tsx',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        WORKER_TYPES: 'kb,conversation,analytics,learning'
      },
      max_memory_restart: '2G',
      error_file: './logs/workers-error.log',
      out_file: './logs/workers-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false
    },
    
    // Optional: Individual workers for scaling
    {
      name: 'axiom-kb-worker',
      script: './apps/workers/src/workers/kb-worker.ts',
      interpreter: 'tsx',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        WORKER_TYPE: 'kb'
      },
      max_memory_restart: '2G',
      autorestart: true
    },
    
    {
      name: 'axiom-learning-worker',
      script: './apps/workers/src/workers/learning-worker.ts',
      interpreter: 'tsx',
      instances: 1,
      exec_mode: 'fork',
      cron_restart: '0 6 * * *', // 6 AM daily
      env: {
        NODE_ENV: 'production',
        WORKER_TYPE: 'learning',
        TIMEZONE: 'America/New_York'
      },
      max_memory_restart: '1G',
      autorestart: true
    }
  ]
}
```

#### **3.2: Deployment Script (Lekhika Pattern)**

**File:** `deploy-workers.sh`
```bash
#!/bin/bash
set -e

echo "🚀 Deploying Axiom Workers to VPS..."

# Configuration
VPS_HOST=${VPS_HOST:-"your-vps-host"}
VPS_USER=${VPS_USER:-"deploy"}
DEPLOY_PATH="/var/www/axiom/workers"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Build workers
echo -e "${BLUE}📦 Building workers...${NC}"
cd apps/workers
npm run build
cd ../..

# Create deployment archive
echo -e "${BLUE}📝 Creating deployment archive...${NC}"
tar -czf workers-deploy.tar.gz \
  apps/workers/dist \
  apps/workers/package.json \
  apps/workers/package-lock.json \
  ecosystem.config.js \
  .env.production

# Upload to VPS
echo -e "${BLUE}⬆️  Uploading to VPS...${NC}"
scp workers-deploy.tar.gz ${VPS_USER}@${VPS_HOST}:/tmp/

# Deploy on VPS
echo -e "${BLUE}🔧 Deploying on VPS...${NC}"
ssh ${VPS_USER}@${VPS_HOST} << 'ENDSSH'
  set -e
  
  # Extract
  mkdir -p /var/www/axiom/workers
  cd /var/www/axiom/workers
  tar -xzf /tmp/workers-deploy.tar.gz
  rm /tmp/workers-deploy.tar.gz
  
  # Install dependencies
  cd apps/workers
  npm ci --production
  cd ../..
  
  # Reload PM2
  pm2 reload ecosystem.config.js
  pm2 save
  
  echo "✅ Deployment complete!"
ENDSSH

# Cleanup
rm workers-deploy.tar.gz

echo -e "${GREEN}✅ Workers deployed successfully!${NC}"
echo -e "${YELLOW}📊 Check status with: ssh ${VPS_USER}@${VPS_HOST} 'pm2 status'${NC}"
```

---

### **Day 7: Component Library (Lekhika Patterns)**

#### **4.1: Base Components (Theme-Governed)**

**File:** `apps/frontend/src/components/ui/Button.tsx`
```typescript
'use client'

import { ButtonHTMLAttributes, forwardRef } from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'
import { theme } from '@/styles/theme'

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof HTMLMotionProps<'button'>> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
}

const variantStyles = {
  primary: {
    base: 'bg-primary-500 text-white border-transparent hover:bg-primary-600 active:bg-primary-700',
    disabled: 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
  },
  secondary: {
    base: 'bg-secondary-500 text-white border-transparent hover:bg-secondary-600 active:bg-secondary-700',
    disabled: 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
  },
  outline: {
    base: 'bg-transparent text-primary-600 border-primary-500 hover:bg-primary-50 active:bg-primary-100',
    disabled: 'bg-transparent text-neutral-400 border-neutral-300 cursor-not-allowed'
  },
  ghost: {
    base: 'bg-transparent text-neutral-700 border-transparent hover:bg-neutral-100 active:bg-neutral-200',
    disabled: 'bg-transparent text-neutral-400 cursor-not-allowed'
  },
  danger: {
    base: 'bg-error text-white border-transparent hover:bg-red-600 active:bg-red-700',
    disabled: 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
  }
}

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      icon,
      iconPosition = 'left',
      className = '',
      ...props
    },
    ref
  ) => {
    const variantClasses = disabled || loading
      ? variantStyles[variant].disabled
      : variantStyles[variant].base
    
    const sizeClasses = sizeStyles[size]
    
    return (
      <motion.button
        ref={ref}
        className={`
          inline-flex items-center justify-center
          font-medium rounded-lg border
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
          disabled:cursor-not-allowed
          ${variantClasses}
          ${sizeClasses}
          ${className}
        `}
        disabled={disabled || loading}
        whileHover={!disabled && !loading ? { scale: 1.02 } : undefined}
        whileTap={!disabled && !loading ? { scale: 0.98 } : undefined}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        
        {!loading && icon && iconPosition === 'left' && (
          <span className="mr-2">{icon}</span>
        )}
        
        {children}
        
        {!loading && icon && iconPosition === 'right' && (
          <span className="ml-2">{icon}</span>
        )}
      </motion.button>
    )
  }
)

Button.displayName = 'Button'
```

**CRITICAL:** NO hardcoded colors (bg-blue-500, etc.), ONLY theme classes (bg-primary-500).

---

## 📊 **Success Criteria**

### **Design System**
- ✅ Complete theme.ts with all color palettes
- ✅ All components use theme variables
- ✅ NO hardcoded colors anywhere in codebase
- ✅ Consistent spacing, typography, shadows

### **AI Provider Management**
- ✅ Multi-key support per provider
- ✅ Automatic failover logic
- ✅ Validation before save
- ✅ Model discovery working
- ✅ Usage/failure tracking
- ✅ NO hardcoded API keys in code

### **Worker Infrastructure**
- ✅ PM2 ecosystem config complete
- ✅ Deployment script tested
- ✅ Workers run independently
- ✅ Graceful shutdown
- ✅ Health monitoring

### **Component Library**
- ✅ Button, Input, Modal, Card, Badge, etc.
- ✅ All theme-governed
- ✅ Framer Motion animations
- ✅ Accessibility compliant
- ✅ TypeScript strict mode

---

## 🚨 **CRITICAL RULES**

### **1. NO BAND-AIDS**
```typescript
// ❌ NEVER DO THIS
const apiKey = process.env.OPENAI_API_KEY || 'fallback-key' // BAND-AID!

// ✅ ALWAYS DO THIS
const provider = await getActiveProvider('OpenAI', orgId)
if (!provider) {
  throw new Error('No OpenAI provider configured')
}
const apiKey = provider.api_key
```

### **2. NO HARDCODED COLORS**
```tsx
// ❌ NEVER
<div className="bg-blue-500 text-white">

// ✅ ALWAYS
<div className="bg-primary-500 text-white">
```

### **3. NO TODOs IN PRODUCTION CODE**
```typescript
// ❌ NEVER
// TODO: Implement cross-encoder

// ✅ EITHER implement it NOW or create a GitHub issue
```

### **4. THEME-GOVERNED EVERYTHING**
All colors, spacing, typography, shadows MUST come from theme.

---

## 📝 **Deliverables Checklist**

- [ ] `apps/frontend/src/styles/theme.ts` - Complete theme system
- [ ] `apps/frontend/src/styles/globals.css` - Theme CSS variables
- [ ] `apps/frontend/src/lib/ai-providers.ts` - Complete AI provider logic
- [ ] `apps/frontend/src/components/ui/*` - Base component library (Button, Input, Modal, Card, Badge, Select, etc.)
- [ ] `ecosystem.config.js` - PM2 configuration
- [ ] `deploy-workers.sh` - Deployment automation
- [ ] `apps/workers/src/index.ts` - Updated to use AI provider system
- [ ] All existing code refactored to use theme (NO hardcoded colors)
- [ ] Documentation: `Documentation/LEKHIKA_PORT_GUIDE.md`

---

## 🎯 **Next Actions After Phase 0**

Once Phase 0 is COMPLETE (not before):
1. Continue with Brain Phase 3 (RAG Orchestration) - but fixing all TODOs and hardcoded keys
2. Add Market Writer as Phase 9 (after Brain is stable)
3. Integration testing with real providers

---

**Phase 0 is FOUNDATION. Everything else depends on this being PERFECT.**

**NO compromises. NO shortcuts. NO "we'll fix it later".**

**Build it RIGHT the first time.**

---

**Status:** 🚧 Ready to Start  
**Priority:** 🔴 CRITICAL  
**Est. Completion:** 7-10 days (solo), 3-5 days (pair)  
**Owner:** You (The Boss)
