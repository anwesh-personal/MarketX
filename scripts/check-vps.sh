#!/bin/bash
# VPS Connection and Deployment Script
# Server: 157.254.24.49
# User: lekhi7866

echo "🔌 Connecting to VPS..."

# Check VPS connectivity
sshpass -p '3edcCDE#Amitesh123' ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 lekhi7866@157.254.24.49 << 'ENDSSH'
echo "=== ✅ CONNECTED TO VPS ==="
echo ""
echo "=== System Info ==="
uname -a
echo ""
echo "=== Node.js Version ==="
node --version || echo "Node.js NOT installed"
echo ""
echo "=== npm Version ==="
npm --version || echo "npm NOT installed"
echo ""
echo "=== PM2 Version ==="
pm2 --version || echo "PM2 NOT installed"
echo ""
echo "=== Current Directory ==="
pwd
ls -la
echo ""
echo "=== Axiom Project Check ==="
if [ -d "axiom" ]; then
    echo "✅ Axiom directory exists"
    cd axiom
    ls -la
else
    echo "❌ Axiom directory NOT found"
fi
ENDSSH

echo ""
echo "✅ VPS Check Complete!"
