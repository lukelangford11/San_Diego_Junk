# Security Guidelines

## Environment Variables

This project uses environment variables to protect sensitive API keys and credentials.

### Required Environment Variables

#### Backend (Netlify Functions)
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (⚠️ NEVER expose publicly)
- `OPENAI_API_KEY` - OpenAI API key for AI estimation (⚠️ NEVER expose publicly)

#### Frontend (Build-time injection)
- `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name (safe to expose)
- `CLOUDINARY_UPLOAD_PRESET` - Cloudinary unsigned upload preset (safe to expose)

### Setup Instructions

1. **Local Development:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual credentials
   ```

2. **Netlify Deployment:**
   - Go to Netlify Dashboard → Site Settings → Environment Variables
   - Add all required environment variables
   - Redeploy your site

3. **Build Process:**
   ```bash
   node build-env.js  # Generates env-config.js
   ```

## Cloudinary Upload Preset Security

The Cloudinary upload preset (`junk_removal_estimates`) should be configured as **unsigned** with these restrictions:

1. ✅ **Unsigned preset** - Allows client-side uploads without API secret
2. ✅ **Folder restriction** - Uploads go to `estimates/` folder
3. ✅ **File size limit** - Max 10MB per file
4. ✅ **File type restriction** - Only images (jpg, png, webp)
5. ✅ **Rate limiting** - Enable to prevent abuse

### How to Configure Cloudinary Unsigned Preset:

1. Log into Cloudinary Dashboard
2. Go to Settings → Upload
3. Scroll to "Upload presets"
4. Click "Add upload preset"
5. Set:
   - **Preset name:** `junk_removal_estimates`
   - **Signing Mode:** Unsigned
   - **Folder:** `estimates`
   - **Access mode:** Public
   - **Allowed formats:** jpg, png, webp
   - **Max file size:** 10000000 (10MB)
6. Save preset

## Never Commit These Files:
- `.env` - Contains actual secrets
- `env-config.js` - Generated at build time
- Any files with actual API keys or passwords

## Git Protection

The `.gitignore` file already protects:
- `.env` and `.env.local`
- `env-config.js`
- `node_modules/`
- `.netlify/`

## Reporting Security Issues

If you discover a security vulnerability, please email: security@yourdomain.com

Do NOT create a public GitHub issue for security vulnerabilities.
