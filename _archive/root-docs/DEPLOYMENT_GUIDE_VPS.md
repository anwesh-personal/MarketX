# Axiom VPS Deployment - Complete Guide
**VPS:** 103.190.93.3  
**User:** anweshrath  
**OS:** AlmaLinux 9.7  
**Date:** 2026-01-16 04:07 IST

---

## 🚀 STEP-BY-STEP DEPLOYMENT

### **Step 1: SSH Connect**
```bash
ssh anweshrath@103.190.93.3
# Password: 3edcCDE#Amitesh123!!!
```

---

### **Step 2: Install Node.js 20.x**
```bash
# Enable NodeSource repository
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -

# Install Node.js
sudo dnf install -y nodejs

# Verify
node --version  # Should show v20.x
npm --version   # Should show v10.x
```

---

### **Step 3: Install PM2 & Git**
```bash
# Install PM2 globally
sudo npm install -g pm2

# Install git
sudo dnf install -y git

# Verify
pm2 --version
git --version
```

---

### **Step 4: Clone Axiom Repository**
```bash
# Navigate to home
cd ~

# Clone repo (replace with your actual repo URL)
git clone https://github.com/YOUR_USERNAME/Axiom.git

# Or if private repo:
# You'll need to setup SSH key or use PAT
```

---

### **Step 5: Setup Frontend**
```bash
cd ~/Axiom/apps/frontend

# Install dependencies
npm install

# Create .env.local file
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_KEY
EOF

# Build production
npm run build
```

---

### **Step 6: Run Database Migrations**
```bash
# Connect to Supabase and run migrations
# Option A: Using psql
psql YOUR_SUPABASE_CONNECTION_STRING -f ~/Axiom/database/migrations/006_ai_provider_system.sql
psql YOUR_SUPABASE_CONNECTION_STRING -f ~/Axiom/database/migrations/007_worker_management.sql

# Option B: Run from Supabase dashboard
# Copy-paste SQL content from migration files
```

---

### **Step 7: Start Application with PM2**
```bash
# Start frontend
cd ~/Axiom/apps/frontend
pm2 start npm --name "axiom-frontend" -- start

# Save PM2 config
pm2 save

# Setup auto-restart on reboot
pm2 startup
# Follow the command it shows

# Check status
pm2 status
pm2 logs axiom-frontend
```

---

### **Step 8: Install & Configure Nginx**
```bash
# Install nginx
sudo dnf install -y nginx

# Create nginx config
sudo nano /etc/nginx/conf.d/axiom.conf
```

**Paste this config:**
```nginx
server {
    listen 80;
    server_name 103.190.93.3;  # Replace with domain later

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Then:**
```bash
# Test nginx config
sudo nginx -t

# Start nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Allow firewall
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

---

### **Step 9: Test Deployment**
```bash
# Check if app is running
curl http://localhost:3000

# Check via public IP
curl http://103.190.93.3
```

**Open in browser:**
```
http://103.190.93.3
```

---

## 🔧 TROUBLESHOOTING

### **If Node.js install fails:**
```bash
# Try alternate method
sudo dnf install -y https://rpm.nodesource.com/pub_20.x/nodistro/repo/nodesource-release-nodistro-1.noarch.rpm
sudo dnf install -y nodejs --setopt=nodesource-nodejs.module_hotfixes=1
```

### **If build fails:**
```bash
# Check logs
npm run build 2>&1 | tee build.log

# Common fix: increase memory
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

### **If PM2 won't start:**
```bash
# Check logs
pm2 logs axiom-frontend --lines 100

# Restart
pm2 restart axiom-frontend
```

### **If port 3000 already in use:**
```bash
# Find what's using it
sudo lsof -i :3000

# Kill it
sudo kill -9 <PID>
```

---

## 📝 IMPORTANT FILES

**Environment Variables Location:**
`~/Axiom/apps/frontend/.env.local`

**PM2 Logs:**
`~/.pm2/logs/`

**Nginx Config:**
`/etc/nginx/conf.d/axiom.conf`

**Nginx Logs:**
`/var/log/nginx/`

---

## ✅ VERIFICATION CHECKLIST

After deployment:
- [ ] `node --version` shows v20.x
- [ ] `pm2 status` shows axiom-frontend online
- [ ] `curl http://localhost:3000` returns HTML
- [ ] `http://103.190.93.3` loads in browser
- [ ] Supabase migrations ran successfully
- [ ] No errors in `pm2 logs`

---

## 🚀 NEXT STEPS

**Once working:**
1. Setup domain DNS (point to 103.190.93.3)
2. Install SSL certificate (Let's Encrypt)
3. Setup workers for background jobs
4. Configure monitoring

---

**Total Time:** 20-30 minutes  
**Difficulty:** Intermediate  

**Ready to deploy! Follow step-by-step. 🎯**
