# San Diego Junk Removal - AI Estimator Setup Guide

Complete setup instructions for deploying the lead generation platform with AI price estimator.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Supabase Database Setup](#supabase-database-setup)
3. [Cloudinary Configuration](#cloudinary-configuration)
4. [Environment Variables](#environment-variables)
5. [Netlify Deployment](#netlify-deployment)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have:

- **Supabase Account**: Free tier available at [supabase.com](https://supabase.com)
- **Cloudinary Account**: Free tier (25GB/month) at [cloudinary.com](https://cloudinary.com)
- **Netlify Account**: Free tier available at [netlify.com](https://netlify.com)
- **Node.js**: Version 18+ installed (for local development)
- **Git**: For version control and deployment

---

## Supabase Database Setup

### Step 1: Create Supabase Project

1. Log in to [Supabase Dashboard](https://app.supabase.com)
2. Click **"New Project"**
3. Fill in project details:
   - **Name**: `san-diego-junk-removal` (or your preferred name)
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users (e.g., `us-west-1` for San Diego)
4. Click **"Create new project"** and wait ~2 minutes for setup

### Step 2: Run Database Schema

1. In your Supabase project, go to **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Open the `supabase-schema.sql` file from this repository
4. Copy and paste the entire contents into the SQL editor
5. Click **"Run"** (or press Cmd/Ctrl + Enter)
6. Verify success message: "✓ Schema created successfully!"

### Step 3: Get API Keys

1. Go to **Settings** → **API** (left sidebar)
2. Copy the following values (you'll need them for environment variables):
   - **Project URL**: `https://your-project.supabase.co`
   - **anon public key**: Starts with `eyJhbGc...`
   - **service_role secret**: Starts with `eyJhbGc...` (keep this secure!)

### Step 4: Verify Tables Created

1. Go to **Table Editor** (left sidebar)
2. You should see 4 tables:
   - `leads` - Main lead storage
   - `buyers` - Buyer accounts (future use)
   - `lead_claims` - Audit trail (future use)
   - `rate_limit` - Spam protection

---

## Cloudinary Configuration

### Step 1: Create Cloudinary Account

1. Sign up at [cloudinary.com](https://cloudinary.com)
2. Complete email verification
3. Go to **Dashboard**

### Step 2: Get Account Details

1. On the dashboard, find **Account Details**:
   - **Cloud Name**: (e.g., `dg3xt3k2m`)
   - **API Key**: (e.g., `123456789012345`)
   - **API Secret**: (click "Reveal" to see it)
2. Save these values for environment variables

### Step 3: Create Upload Preset

1. Go to **Settings** (gear icon) → **Upload**
2. Scroll down to **Upload presets**
3. Click **"Add upload preset"**
4. Configure the preset:
   - **Preset name**: `junk_removal_estimates`
   - **Signing mode**: **Unsigned** ⚠️ (important!)
   - **Folder**: `estimates`
   - **Format**: `Auto`
   - **Quality**: `Auto`
   - **Max file size**: `10 MB`
   - **Resource type**: `Image`
   - **Allowed formats**: `jpg, png, jpeg, webp`
   - **Transformation**: Add transformation:
     - Width: `1200`
     - Crop: `limit`
     - Quality: `auto`
     - Format: `auto`
5. Click **"Save"**

### Step 4: Test Upload (Optional)

1. Go to **Media Library**
2. Click **"Upload"** → **Upload Widget**
3. Test uploading a photo
4. Verify it appears in the `estimates` folder

### Step 5: Update Frontend Configuration

⚠️ **SECURITY UPDATE**: As of the latest version, Cloudinary credentials are now injected at build time via environment variables. No need to hardcode them in the JavaScript file.

The credentials are automatically loaded from your `.env` file or Netlify environment variables.

---

## Environment Variables

### Step 1: Create .env File

In the project root, create a `.env` file:

```bash
cp .env.example .env
```

### Step 2: Fill in Values

Edit `.env` with your actual credentials:

```env
# Supabase (from Step 3 above)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Cloudinary (from Step 2 above)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
CLOUDINARY_UPLOAD_PRESET=junk_removal_estimates

# Email Notifications
NOTIFICATION_EMAIL=leads@yourdomain.com

# Rate Limiting (adjust as needed)
MAX_SUBMISSIONS_PER_HOUR=3
```

### Step 3: Security

⚠️ **IMPORTANT**: Never commit `.env` to version control!

Verify `.gitignore` includes:
```
.env
.env.local
.env.production
```

---

## Netlify Deployment

### Method 1: Netlify CLI (Recommended)

#### Install Netlify CLI

```bash
npm install -g netlify-cli
```

#### Login to Netlify

```bash
netlify login
```

#### Initialize Site

```bash
netlify init
```

Follow prompts:
- **Create & configure a new site**: Yes
- **Team**: Choose your team
- **Site name**: `san-diego-junk-removal` (or available name)
- **Build command**: (leave empty - static site)
- **Publish directory**: `.` (current directory)

#### Set Environment Variables

```bash
netlify env:set SUPABASE_URL "https://your-project.supabase.co"
netlify env:set SUPABASE_ANON_KEY "your-anon-key"
netlify env:set SUPABASE_SERVICE_ROLE_KEY "your-service-role-key"
netlify env:set CLOUDINARY_CLOUD_NAME "your-cloud-name"
netlify env:set CLOUDINARY_API_KEY "your-api-key"
netlify env:set CLOUDINARY_API_SECRET "your-api-secret"
netlify env:set CLOUDINARY_UPLOAD_PRESET "your-upload-preset"
netlify env:set NOTIFICATION_EMAIL "your-email@example.com"
netlify env:set MAX_SUBMISSIONS_PER_HOUR "3"
```

#### Deploy

```bash
netlify deploy --prod
```

### Method 2: Netlify Dashboard

#### Connect Repository

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Click **"Add new site"** → **"Import an existing project"**
3. Connect your Git provider (GitHub, GitLab, Bitbucket)
4. Select your repository
5. Configure build settings:
   - **Build command**: (leave empty)
   - **Publish directory**: `.`
   - **Functions directory**: `netlify/functions`
6. Click **"Deploy site"**

#### Set Environment Variables

1. Go to **Site settings** → **Environment variables**
2. Click **"Add a variable"**
3. Add each variable from your `.env` file:
   - Key: `SUPABASE_URL`
   - Value: Your actual value
   - Scope: All (default)
4. Repeat for all variables
5. **Important**: Click **"Redeploy"** after adding variables

### Step 3: Configure Custom Domain (Optional)

1. Go to **Domain settings**
2. Click **"Add custom domain"**
3. Enter: `sandiegojunkpros.com`
4. Follow DNS configuration instructions
5. Enable HTTPS (automatic with Netlify)

### Step 4: Verify Deployment

Visit your deployed site:
- Netlify URL: `https://your-site.netlify.app`
- Custom domain: `https://sandiegojunkpros.com`

Check these pages:
- ✅ Homepage: `https://your-site.netlify.app/`
- ✅ Estimator: `https://your-site.netlify.app/estimate.html`

---

## Testing

### Test 1: Photo Upload

1. Go to `/estimate.html`
2. Click **"Upload Photos"**
3. Upload 2-3 test photos
4. Verify photos appear in grid
5. Test remove button

**Expected**: Photos upload successfully to Cloudinary

### Test 2: Form Validation

1. Try clicking "Continue" without photos
2. Try submitting with missing required fields
3. Try invalid phone number (e.g., "123")
4. Try invalid ZIP code (e.g., "abc")

**Expected**: Validation errors prevent submission

### Test 3: Submit Estimate

1. Upload 2 photos
2. Fill in all required fields:
   - Name: Test User
   - Phone: (858) 555-0100
   - ZIP: 92101
3. Select item types (e.g., Furniture)
4. Click "Get My Estimate"
5. Wait for result

**Expected**:
- Loading spinner appears
- Price range displays (e.g., $180-$320)
- Confidence level shows
- Assumptions text explains calculation

### Test 4: Verify Database

1. Go to Supabase → **Table Editor** → `leads`
2. Find your test submission
3. Verify all fields populated correctly

**Expected**: New row in `leads` table with your data

### Test 5: Check Rate Limiting

1. Submit 3 estimates from same browser
2. Try submitting a 4th within 1 hour

**Expected**: 4th submission blocked with "Rate limit exceeded" message

### Test 6: Test API Endpoints (Optional)

Using curl or Postmark:

```bash
# Get leads (future iOS app)
curl https://your-site.netlify.app/api/get-leads?status=unclaimed

# Expected: JSON array of leads
```

---

## Troubleshooting

### Issue: "Cloudinary script not loaded"

**Cause**: CDN blocked or slow connection

**Fix**:
1. Check browser console for errors
2. Verify internet connection
3. Try different browser
4. Check if Cloudinary CDN is accessible: `https://upload-widget.cloudinary.com/global/all.js`

### Issue: "Failed to save estimate"

**Cause**: Supabase connection error

**Fix**:
1. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Netlify environment variables
2. Check Supabase project status (not paused)
3. Check browser network tab for API errors
4. Verify Row Level Security policies allow inserts

### Issue: Photos upload but form submission fails

**Cause**: Validation or API error

**Fix**:
1. Open browser console (F12)
2. Check for JavaScript errors
3. Verify all required fields filled
4. Check honeypot field is empty
5. Check Netlify function logs: `netlify functions:log submit-estimate`

### Issue: "Rate limit exceeded" immediately

**Cause**: IP already hit rate limit or rate limit table issue

**Fix**:
1. Clear rate limit for testing:
   ```sql
   DELETE FROM rate_limit WHERE ip_address = 'your-ip';
   ```
2. Adjust `MAX_SUBMISSIONS_PER_HOUR` environment variable
3. Wait 1 hour for window to reset

### Issue: Estimate displays $0-$0

**Cause**: Price estimator calculation error

**Fix**:
1. Check browser console for errors
2. Verify photos uploaded (count > 0)
3. Check serverless function logs
4. Verify zone configuration includes submitted ZIP code

### Issue: Email notifications not sending

**Cause**: Email service not configured

**Fix**:
1. Email notifications are placeholder implementation
2. To enable, integrate SendGrid, Postmark, or AWS SES
3. Update `netlify/functions/lib/email-notifier.js`
4. Leads are still saved to database regardless of email status

---

## Next Steps

### For Production Launch:

1. ✅ Test thoroughly on staging URL
2. ✅ Configure custom domain DNS
3. ✅ Set up SSL certificate (automatic with Netlify)
4. ✅ Add Google Analytics tracking code
5. ✅ Submit sitemap to Google Search Console
6. ✅ Monitor Supabase usage (free tier limits)
7. ✅ Monitor Cloudinary usage (25GB/month free)
8. ✅ Set up Supabase backups
9. ✅ Configure email service for lead notifications
10. ✅ Test lead workflow from end-to-end

### For Future iOS App:

1. Implement JWT authentication in `/api/get-leads` and `/api/claim-lead`
2. Create buyer accounts in `buyers` table
3. Build iOS app using SwiftUI
4. Consume REST API endpoints documented in plan
5. Implement lead claiming workflow

---

## Support

For issues or questions:

- **Supabase**: [supabase.com/docs](https://supabase.com/docs)
- **Cloudinary**: [cloudinary.com/documentation](https://cloudinary.com/documentation)
- **Netlify**: [docs.netlify.com](https://docs.netlify.com)

---

## License

Proprietary - San Diego Junk Removal Platform

---

**Last Updated**: January 16, 2026
