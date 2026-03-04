# 🚀 Quick Start Deployment Guide

## Get Your TMS Running in 15 Minutes

### Step 1: Deploy to Vercel (5 minutes)

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Navigate to your project directory
cd /path/to/logistics-tms-app

# 3. Install dependencies
npm install

# 4. Deploy!
vercel --prod
```

When prompted:
- Set up and deploy? **Y**
- Which scope? **[your account]**
- Link to existing project? **N**
- Project name? **logistics-tms** (or your choice)
- Directory? **./** (press Enter)
- Override settings? **N**

**Save the deployment URL!** (e.g., `https://logistics-tms-abc123.vercel.app`)

### Step 2: Create Telegram Bot (3 minutes)

1. Open Telegram and search for **@BotFather**

2. Create your bot:
```
/newbot
Name: IdeaByte Logistics TMS
Username: your_unique_bot_name_bot
```

3. **Save your Bot Token!** (looks like `1234567890:ABCdef...`)

4. Set up the menu button:
```
/setmenubutton
[Select your bot]
Button text: 📦 Open TMS
Web App URL: https://logistics-tms-abc123.vercel.app
```

### Step 3: Configure n8n Webhooks (5 minutes)

1. **Import the workflow**:
   - Open n8n
   - Go to Workflows → Import from File
   - Select `n8n-api-workflow.json`

2. **Update Google Sheets IDs**:
   - Open each Google Sheets node
   - Replace `YOUR_GOOGLE_SHEET_ID` with your actual Sheet ID
   - The Sheet ID is in the URL: `docs.google.com/spreadsheets/d/[SHEET_ID]/edit`

3. **Activate the workflow**:
   - Click the toggle in the top right to activate
   - Note your webhook URLs (they'll look like: `https://your-n8n.com/webhook/active-loads`)

### Step 4: Connect Frontend to Backend (2 minutes)

1. **Edit your deployed app** (or redeploy with changes):

Create a file `.env.production`:
```bash
VITE_N8N_API_URL=https://your-n8n-domain.com
```

2. **Update the React component**:

In `logistics-tms-app.jsx`, replace the mock data with real API calls:

```javascript
useEffect(() => {
  const fetchData = async () => {
    try {
      const loadsRes = await fetch(`${import.meta.env.VITE_N8N_API_URL}/webhook/active-loads`);
      const loadsData = await loadsRes.json();
      setLoads(loadsData.loads);

      const driversRes = await fetch(`${import.meta.env.VITE_N8N_API_URL}/webhook/drivers`);
      const driversData = await driversRes.json();
      setDrivers(driversData.drivers);

      const analyticsRes = await fetch(`${import.meta.env.VITE_N8N_API_URL}/webhook/analytics`);
      const analyticsData = await analyticsRes.json();
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  fetchData();
  const interval = setInterval(fetchData, 30000);
  return () => clearInterval(interval);
}, []);
```

3. **Redeploy**:
```bash
vercel --prod
```

### Step 5: Test! (immediately)

1. Open Telegram
2. Search for your bot
3. Click the menu button (📦 Open TMS)
4. Your Mini App should open!

---

## ✅ Verification Checklist

- [ ] Bot responds when you search for it
- [ ] Menu button appears at the bottom
- [ ] Clicking menu button opens your Mini App
- [ ] Mini App displays with dark theme
- [ ] Can navigate between tabs (Dispatch, Drivers, Fleet, Analytics)
- [ ] Floating action button appears (bottom right)

---

## 🔧 Troubleshooting

### "Bot not found"
- Make sure your bot username is unique
- Try searching with the @ symbol: `@your_bot_name_bot`

### "Mini App doesn't open"
- Verify your Vercel deployment is live (visit the URL in a browser)
- Check that the URL in BotFather exactly matches your deployment URL
- Ensure the URL uses HTTPS (Vercel provides this automatically)

### "No data showing"
- Check browser console for errors (inspect Mini App in Telegram Desktop)
- Verify n8n webhooks are accessible (test in Postman)
- Check CORS headers in n8n responses

### "Can't connect to n8n"
- Ensure n8n is accessible via HTTPS
- Add CORS headers to webhook responses:
  ```javascript
  {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
  }
  ```

---

## 🎯 Next Steps

Once everything is working:

1. **Customize the branding**:
   - Update colors in the React component
   - Add your company logo
   - Change "IdeaByte" to your company name

2. **Connect your existing workflows**:
   - Update Flow A to send driver list to Mini App
   - Make Flow B update Mini App after assignment
   - Add Flow C idle alerts to Mini App notifications

3. **Add features**:
   - Push notifications for load updates
   - Driver photo upload
   - GPS tracking on the fleet map
   - Multi-language support

4. **Secure it**:
   - Add webhook authentication tokens
   - Implement user role-based access
   - Add request rate limiting

---

## 📞 Need Help?

Check these resources:
1. **README.md** - Comprehensive setup guide
2. **INTEGRATION_GUIDE.md** - Detailed n8n integration
3. **Telegram Docs** - https://core.telegram.org/bots/webapps
4. **n8n Docs** - https://docs.n8n.io/

---

**Congratulations! 🎉** 

Your enterprise-grade Logistics TMS is now running as a Telegram Mini App!

Users can now:
- ✅ Monitor live dispatches
- ✅ Track driver availability
- ✅ View fleet locations
- ✅ Analyze performance metrics
- ✅ All from within Telegram!
