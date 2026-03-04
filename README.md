# IdeaByte Logistics TMS - Telegram Mini App

Enterprise-grade Transportation Management System as a Telegram Mini App, seamlessly integrated with your existing n8n workflows.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![React](https://img.shields.io/badge/React-18.2.0-61dafb.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 🚀 Features

- **Live Dispatch Monitoring**: Real-time tracking of active loads with progress indicators
- **Driver Management**: View driver availability, status, and assignments
- **Fleet Map**: Interactive map showing all vehicles across Uzbekistan
- **Analytics Dashboard**: Revenue insights, performance metrics, and top performers
- **n8n Integration**: Seamlessly connects with your existing automation workflows
- **Dark Theme**: Professional dark UI matching modern logistics software
- **Mobile-First**: Optimized for Telegram on mobile devices

## 📸 Screenshots

The app includes four main sections:
1. **Live Dispatch** - Monitor active shipments in real-time
2. **Drivers** - Manage driver availability and status
3. **Fleet Map** - Track vehicle locations on map
4. **Analytics** - Revenue and performance insights

## 🛠️ Tech Stack

- **Frontend**: React 18 with hooks
- **Icons**: Lucide React
- **Build Tool**: Vite
- **Deployment**: Vercel/Netlify (or any static hosting)
- **Integration**: Telegram Bot API + n8n webhooks

## 📋 Prerequisites

- Node.js 18+ and npm
- Telegram account
- Telegram Bot Token (from @BotFather)
- n8n instance with your existing workflows
- HTTPS domain for hosting the Mini App

## 🚀 Quick Start

### 1. Clone and Install

```bash
# Create project directory
mkdir logistics-tms-app
cd logistics-tms-app

# Copy the files from this package
# - logistics-tms-app.jsx
# - package.json
# - vite.config.js
# - index.html (optional, for standalone deployment)

# Install dependencies
npm install
```

### 2. Development

```bash
# Start development server
npm run dev

# Open http://localhost:3000 in your browser
```

### 3. Build for Production

```bash
# Create optimized production build
npm run build

# Preview production build locally
npm run preview
```

## 🌐 Deployment Options

### Option 1: Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod

# Note the deployment URL (e.g., https://your-app.vercel.app)
```

### Option 2: Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist

# Note the deployment URL
```

### Option 3: Static Hosting

Simply upload the contents of the `dist` folder to any static hosting service:
- GitHub Pages
- Cloudflare Pages
- AWS S3 + CloudFront
- DigitalOcean App Platform

## 🤖 Telegram Bot Setup

### 1. Create Your Bot

Talk to @BotFather on Telegram:

```
/newbot
Bot Name: IdeaByte Logistics
Bot Username: ideabyte_logistics_bot
```

Save your bot token (looks like: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 2. Configure Web App

```
/setmenubutton
[Select your bot]
Button text: Open TMS
Web App URL: https://your-deployment-url.vercel.app
```

### 3. Test Your Bot

1. Open Telegram
2. Search for your bot (@ideabyte_logistics_bot)
3. Click "Menu" button at bottom
4. Click "Open TMS"
5. Your Mini App should open!

## 🔗 n8n Integration

### Configure API Endpoints

Your n8n workflows should expose these webhook endpoints:

#### 1. Get Active Loads
```
GET https://your-n8n-domain.com/webhook/active-loads
```

#### 2. Get Drivers
```
GET https://your-n8n-domain.com/webhook/drivers
```

#### 3. Get Analytics
```
GET https://your-n8n-domain.com/webhook/analytics
```

#### 4. Upload Rate Con (Flow A)
```
POST https://your-n8n-domain.com/webhook/ratecon-upload
Content-Type: multipart/form-data
```

#### 5. Assign Driver (Flow B)
```
POST https://your-n8n-domain.com/webhook/assign-driver
Content-Type: application/json
{
  "load_id": "LD-4821",
  "driver_id": "AK",
  "redis_key": "load:abc123"
}
```

### Update the React App

Edit `logistics-tms-app.jsx` and replace the mock data fetching with actual API calls:

```javascript
useEffect(() => {
  const fetchData = async () => {
    try {
      // Fetch loads
      const loadsRes = await fetch('https://your-n8n-domain.com/webhook/active-loads');
      const loadsData = await loadsRes.json();
      setLoads(loadsData.loads);

      // Fetch drivers
      const driversRes = await fetch('https://your-n8n-domain.com/webhook/drivers');
      const driversData = await driversRes.json();
      setDrivers(driversData.drivers);

      // Fetch analytics
      const analyticsRes = await fetch('https://your-n8n-domain.com/webhook/analytics');
      const analyticsData = await analyticsRes.json();
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  fetchData();
  
  // Poll for updates every 30 seconds
  const interval = setInterval(fetchData, 30000);
  return () => clearInterval(interval);
}, []);
```

## 🔐 Security

### 1. Validate Telegram Requests

Add this function to validate requests come from Telegram:

```javascript
const validateTelegramWebAppData = (initData, botToken) => {
  const crypto = require('crypto');
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  urlParams.delete('hash');
  
  const dataCheckString = Array.from(urlParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  const secretKey = crypto.createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();
  
  const calculatedHash = crypto.createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');
  
  return hash === calculatedHash;
};
```

### 2. Environment Variables

Create `.env` file:

```bash
VITE_N8N_API_URL=https://your-n8n-domain.com
VITE_WEBHOOK_SECRET=your-secret-key
VITE_BOT_TOKEN=your-telegram-bot-token
```

Access in your app:
```javascript
const API_URL = import.meta.env.VITE_N8N_API_URL;
```

### 3. CORS Configuration

Ensure your n8n instance allows requests from your Telegram Mini App domain:

```javascript
// In your n8n webhook responses
headers: {
  'Access-Control-Allow-Origin': 'https://your-deployment-url.vercel.app',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}
```

## 📊 Data Flow

```
User Action in Mini App
    ↓
Telegram WebApp API
    ↓
Your n8n Webhook
    ↓
Process (Flow A/B/C)
    ↓
Update Google Sheets / Redis
    ↓
Return Response
    ↓
Update Mini App UI
```

## 🎨 Customization

### Change Branding Colors

Edit the color scheme in `logistics-tms-app.jsx`:

```javascript
// Primary blue
'#3b82f6' → 'your-brand-color'

// Success green
'#10b981' → 'your-success-color'

// Warning orange
'#f59e0b' → 'your-warning-color'
```

### Add Your Logo

Replace the Package icon in the header with your logo:

```javascript
<img src="/path-to-your-logo.svg" alt="Logo" style={{ width: '36px', height: '36px' }} />
```

### Modify Layout

All styling is inline CSS-in-JS. Simply modify the style objects to change spacing, sizing, colors, etc.

## 🐛 Troubleshooting

### Issue: Mini App doesn't load in Telegram

**Solution**: Ensure your deployment URL uses HTTPS and is publicly accessible. Test the URL in a regular browser first.

### Issue: Data not updating

**Solution**: Check browser console for CORS errors. Verify your n8n webhooks are returning correct headers.

### Issue: Telegram WebApp API not available

**Solution**: The app must be opened through Telegram (not in a regular browser) to access Telegram.WebApp features.

### Issue: Build fails

**Solution**: 
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

## 📱 Testing

### Local Testing
```bash
npm run dev
# Open http://localhost:3000
```

### Telegram Testing
1. Deploy to a temporary URL (Vercel/Netlify preview)
2. Configure bot with preview URL
3. Test in Telegram
4. Once verified, deploy to production

### Production Checklist
- [ ] n8n webhooks are accessible and returning correct data
- [ ] HTTPS is enabled on both Mini App and n8n
- [ ] CORS headers configured correctly
- [ ] Bot menu button configured
- [ ] All environment variables set
- [ ] Error handling implemented
- [ ] Loading states added
- [ ] Mobile responsiveness verified

## 📚 Additional Resources

- [Telegram Mini Apps Documentation](https://core.telegram.org/bots/webapps)
- [n8n Documentation](https://docs.n8n.io/)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)

## 🤝 Support

For issues related to:
- **Mini App UI/UX**: Check React console logs
- **n8n Integration**: Check n8n execution logs
- **Telegram Bot**: Check Bot API logs via @BotFather

## 📄 File Structure

```
logistics-tms-app/
├── logistics-tms-app.jsx   # Main React component (complete app)
├── index.html              # Standalone HTML version (optional)
├── package.json            # Dependencies and scripts
├── vite.config.js         # Vite build configuration
├── INTEGRATION_GUIDE.md   # Detailed n8n integration guide
├── README.md              # This file
└── .env                   # Environment variables (create this)
```

## 🎯 Next Steps

1. ✅ Deploy the Mini App to Vercel/Netlify
2. ✅ Configure your Telegram Bot
3. ✅ Set up n8n webhook endpoints
4. ✅ Update API URLs in the React app
5. ✅ Test end-to-end workflow
6. ✅ Customize branding and colors
7. ✅ Add real-time notifications
8. ✅ Implement user authentication
9. ✅ Add multi-language support

## 📝 License

MIT License - feel free to use this for your logistics business!

---

**Built with ❤️ for IdeaByte Logistics**

Need help? Check the `INTEGRATION_GUIDE.md` for detailed setup instructions!
