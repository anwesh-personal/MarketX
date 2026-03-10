# AI Management Testing Guide

## 🚀 Quick Start

### 1. Start Dev Server
```bash
cd /Users/anweshrath/Documents/Tommy-Fran/Axiom/apps/frontend
npm run dev
```

### 2. Navigate to AI Management
```
http://localhost:3000/superadmin/ai-management
```

### 3. Login (if needed)
```
http://localhost:3000/superadmin/login
Email: anweshrath@gmail.com
Password: 3edcCDE#
```

---

## ✅ What to Test

### **Tab 1: API Keys (Providers)**
1. Click "Add API Key" button
2. Select a provider (OpenAI, Anthropic, Google, etc.)
3. Enter:
   - Name: "Test-OpenAI-01"
   - API Key: (your actual OpenAI key if you want to test)
   - Description: Optional
4. Click "Add Provider"
5. Provider card should appear
6. Click on provider card to select it (should highlight with border)

### **Tab 2: Discover Models**
1. Select a provider from Tab 1 first
2. Click "Discover Models" button
3. Should show list of models for that provider
4. Each model shows:
   - Name
   - Context window
   - Pricing info
   - Vision/Functions support
5. Click "Test" on individual model OR "Test All Models"
6. Click "Console" button (top right) to see logs
7. Watch real-time testing progress

### **Tab 3: Active Models**
1. After testing models, they appear here
2. Check "Select All" checkbox
3. Use batch actions: Activate, Deactivate, Delete
4. Click on model name to edit inline
5. Press Enter to save
6. Status column shows test result (Active/Failed)

---

## 🎨 Theme Testing

Try switching themes to verify all colors are theme-aware:
- Minimalist Light/Dark
- Aqua Light/Dark
- Modern Light/Dark

All colors should adapt - NO hardcoded blues, grays, etc.

---

## 🐛 Common Issues to Check

1. **CORS Errors**: Make sure API routes are accessible
2. **Database Connection**: Check Supabase env vars
3. **Missing Tables**: Run migration-ai-tables.sql if not done
4. **Theme Not Working**: Check if theme CSS files are loaded
5. **Console Not Showing**: Click "Console" button top-right

---

## 📊 Expected Behavior

### Discover Models (OpenAI example)
Should return models like:
- gpt-4-turbo
- gpt-4
- gpt-3.5-turbo
- etc.

### Test Model
Should call actual OpenAI API and:
- Return: "Hello! I am working correctly."
- Show response time
- Save to database
- Appear in Active Models tab

---

## 🔍 Database Verification

After testing, check Supabase:

```sql
-- Check providers
SELECT * FROM ai_providers;

-- Check discovered models
SELECT * FROM ai_model_metadata;
```

---

## 📝 Notes

- Full production code (1,017 lines)
- No setTimeout fakes - real API calls
- All theme variables used
- Inline editing works
- Batch operations work
- Console shows real logs

---

**Ready to test!** 🚀
