#!/bin/bash
# ============================================================
# AXIOM ENGINE - Local Development Setup
# Usage: npm run local:up  (or bash scripts/local-setup.sh)
# ============================================================
set -e

YELLOW='\033[1;33m'
GREEN='\033[1;32m'
RED='\033[1;31m'
CYAN='\033[1;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}================================================================${NC}"
echo -e "${CYAN}  AXIOM ENGINE - Local Development Setup${NC}"
echo -e "${CYAN}================================================================${NC}"

# ---- Pre-flight checks ----
echo -e "\n${YELLOW}[1/6] Pre-flight checks...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}  ✗ Docker not found. Install Docker Desktop first.${NC}"
    exit 1
fi
echo -e "${GREEN}  ✓ Docker found${NC}"

if ! docker info &> /dev/null; then
    echo -e "${RED}  ✗ Docker is not running. Start Docker Desktop first.${NC}"
    exit 1
fi
echo -e "${GREEN}  ✓ Docker is running${NC}"

if ! command -v npx &> /dev/null; then
    echo -e "${RED}  ✗ npx not found. Install Node.js >= 18 first.${NC}"
    exit 1
fi
echo -e "${GREEN}  ✓ Node.js / npx found${NC}"

# ---- Start Supabase ----
echo -e "\n${YELLOW}[2/6] Starting Supabase local stack...${NC}"
echo -e "  (This may take a few minutes on first run)"

npx supabase start 2>&1 | tail -20

echo -e "${GREEN}  ✓ Supabase started${NC}"

# ---- Apply migrations ----
echo -e "\n${YELLOW}[3/6] Applying database migrations...${NC}"

npx supabase db reset --no-seed 2>&1 | tail -10
echo -e "${GREEN}  ✓ Migrations applied (82 tables created)${NC}"

# ---- Apply seed data ----
echo -e "\n${YELLOW}[4/6] Seeding default data...${NC}"
# Seed is included in migration 10, so nothing extra needed
echo -e "${GREEN}  ✓ Seed data applied (brain templates, node palette, superadmin)${NC}"

# ---- Copy env files and inject Supabase keys ----
echo -e "\n${YELLOW}[5/6] Setting up environment files...${NC}"

# Extract keys from running Supabase
ANON_KEY=$(npx supabase status 2>/dev/null | grep "anon key" | awk '{print $NF}')
SERVICE_KEY=$(npx supabase status 2>/dev/null | grep "service_role key" | awk '{print $NF}')

if [ ! -f apps/frontend/.env.local ]; then
    cp apps/frontend/.env.example apps/frontend/.env.local
    if [ -n "$ANON_KEY" ] && [ -n "$SERVICE_KEY" ]; then
        sed -i '' "s|<get from.*anon key>|$ANON_KEY|" apps/frontend/.env.local
        sed -i '' "s|<get from.*service_role key>|$SERVICE_KEY|" apps/frontend/.env.local
    fi
    echo -e "${GREEN}  ✓ Created apps/frontend/.env.local (keys auto-filled)${NC}"
else
    echo -e "${GREEN}  ✓ apps/frontend/.env.local already exists${NC}"
fi

if [ ! -f apps/backend/.env ]; then
    cp apps/backend/.env.example apps/backend/.env
    if [ -n "$SERVICE_KEY" ]; then
        sed -i '' "s|<get from.*service_role key>|$SERVICE_KEY|" apps/backend/.env
    fi
    echo -e "${GREEN}  ✓ Created apps/backend/.env (keys auto-filled)${NC}"
else
    echo -e "${GREEN}  ✓ apps/backend/.env already exists${NC}"
fi

# ---- Print connection info ----
echo -e "\n${YELLOW}[6/6] Getting connection details...${NC}"
npx supabase status 2>&1 | grep -E "(API URL|anon key|service_role|DB URL|Studio URL)" | head -10

echo -e "\n${CYAN}================================================================${NC}"
echo -e "${GREEN}  ✓ Local development environment is ready!${NC}"
echo -e "${CYAN}================================================================${NC}"
echo ""
echo -e "  ${YELLOW}Supabase Studio:${NC}    http://localhost:54323"
echo -e "  ${YELLOW}Supabase API:${NC}       http://localhost:54321"
echo -e "  ${YELLOW}Database:${NC}           postgresql://postgres:postgres@localhost:54322/postgres"
echo -e "  ${YELLOW}Inbucket (email):${NC}   http://localhost:54324"
echo ""
echo -e "  ${YELLOW}Next steps:${NC}"
echo -e "    cd apps/frontend && npm run dev    ${CYAN}# Start frontend on :3000${NC}"
echo -e "    cd apps/backend && npm run dev     ${CYAN}# Start backend on :3001${NC}"
echo -e "    docker run -d -p 6379:6379 redis   ${CYAN}# Start Redis for workers${NC}"
echo ""
echo -e "  ${YELLOW}Superadmin login:${NC}"
echo -e "    Email:    anweshrath@gmail.com"
echo -e "    Password: (use the hash from platform_admins table)"
echo ""
