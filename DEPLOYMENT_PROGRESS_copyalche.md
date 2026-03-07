# Axiom Deployment - copyalche.my
**Date:** 2026-01-16 04:18 IST  
**Domain:** copyalche.my  
**VPS:** 103.190.93.3  
**Status:** IN PROGRESS

---

## ✅ COMPLETED STEPS

1. ✅ DNS configured (A record → 103.190.93.3)
2. ✅ VPS SSH access confirmed
3. 🔄 Installing Node.js 20.x (in progress)
4. 🔄 Installing Nginx (in progress)

---

## 📋 REMAINING STEPS

### **After Node.js installs:**
1. Install PM2 globally
2. Clone Axiom repository
3. Setup environment variables
4. Build frontend
5. Configure Nginx
6. Start with PM2
7. Setup SSL certificate

---

## 🔧 MANUAL COMMANDS (If needed)

**If automatic install fails, run these manually:**

```bash
# SSH into VPS
ssh anweshrath@103.190.93.3

# Check Node.js
node --version
npm --version

# Install PM2
sudo npm install -g pm2

# Install git
sudo dnf install -y git

# Clone Axiom (need repo URL)
cd ~
git clone <YOUR_REPO_URL> Axiom

# Setup frontend
cd ~/Axiom/apps/frontend
npm install

# Create env file
nano .env.local
# Add:
# NEXT_PUBLIC_SUPABASE_URL=your_url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
# SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Build
npm run build

# Start with PM2
pm2 start npm --name "axiom" -- start
pm2 save
pm2 startup

# Configure Nginx
sudo nano /etc/nginx/conf.d/copyalche.conf
# Paste nginx config

# Test and restart
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

# Open firewall
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

---

## 🌐 ACCESS

**Once deployed:**
- **URL:** http://copyalche.my
- **Admin:** http://copyalche.my/superadmin

---

## 📝 NEXT: SSL Setup

**After HTTP works:**
```bash
# Install Certbot
sudo dnf install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d copyalche.my -d www.copyalche.my
```

---

**Current Status:** Installing dependencies...  
**ETA:** 5-10 minutes for basic setup  

Will update as progress continues! 🚀
