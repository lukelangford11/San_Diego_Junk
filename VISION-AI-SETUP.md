# Vision AI Integration Setup Guide

The OpenAI GPT-4 Vision integration has been successfully implemented! This guide will help you complete the setup and start using AI-powered volume estimation.

## What's Been Implemented

✅ **OpenAI Vision Analyzer Module** (`netlify/functions/lib/vision-analyzer.js`)
- Analyzes photos using GPT-4o Vision API
- Estimates volume in cubic yards
- Detects item categories automatically
- Assesses access difficulty
- Identifies special handling concerns

✅ **Enhanced Price Estimator** (`netlify/functions/lib/price-estimator.js`)
- Volume-based pricing using AI analysis
- Automatic fallback to legacy photo-count method
- Access difficulty multipliers
- Special concerns surcharges

✅ **Updated Submit Function** (`netlify/functions/submit-estimate.js`)
- Automatically calls Vision AI when photos are uploaded
- Stores both legacy and AI analysis data
- Graceful fallback if Vision API fails

✅ **Database Schema Updates**
- New columns for Vision AI data in `leads` table
- Migration script created for existing databases

## Setup Steps

### Step 1: Get Your OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click **"Create new secret key"**
4. Name it "Junk Removal Vision" (or similar)
5. **Copy the key** (you won't be able to see it again!)

**Pricing**: ~$0.03-0.06 per estimate (3-6 photos)
- At 100 estimates/month = ~$3-6/month
- At 1000 estimates/month = ~$30-60/month

### Step 2: Add API Key to .env

The `.env` file has already been updated with a placeholder. Replace it:

1. Open `.env` file in your project root
2. Find the line: `OPENAI_API_KEY=your-openai-api-key-here`
3. Replace with your actual key: `OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx`
4. Save the file

### Step 3: Update Supabase Database

Run the migration to add Vision AI columns to your `leads` table:

1. Go to your Supabase project: https://app.supabase.com
2. Navigate to **SQL Editor** (left sidebar)
3. Click **"New Query"**
4. Open `supabase-vision-migration.sql` from your project
5. Copy and paste the entire contents
6. Click **"Run"** (or Cmd/Ctrl + Enter)
7. Verify you see success messages

The migration adds these columns:
- `ai_volume_cubic_yards` - AI-estimated volume
- `ai_detected_items` - Categories detected by AI
- `ai_access_difficulty` - Access complexity (easy/medium/hard)
- `ai_special_concerns` - Special handling requirements
- `ai_confidence` - AI's confidence level
- `ai_notes` - AI's analysis notes
- `pricing_method` - Whether vision or legacy pricing was used

### Step 4: Restart Your Dev Server

The server needs to reload the new environment variables:

1. **Kill the current server**:
   ```bash
   # Find the process
   tasklist | findstr "node"
   
   # Kill the netlify dev process (look for the PID)
   taskkill /PID <pid> /F
   ```

2. **Start it again**:
   ```bash
   netlify dev
   ```

3. **Verify the .env loaded**:
   Look for this line in the output:
   ```
   ⬥ Injected .env file env vars: SUPABASE_URL, ..., OPENAI_API_KEY
   ```

### Step 5: Test the Integration

1. **Open the estimator**: http://localhost:8888/estimate.html

2. **Upload 2-3 photos** of junk (use test photos showing furniture, appliances, etc.)

3. **Fill out the form**:
   - Name: Test User
   - Phone: (858) 555-0100
   - ZIP: 92127
   - Optionally check item types

4. **Submit and watch the terminal**:
   You should see:
   ```
   Running Vision AI analysis on 3 photos...
   Vision AI analysis complete: { volumeCubicYards: 4.5, ... }
   ```

5. **Check the estimate result**:
   - Should show a price range
   - Assumptions should mention "AI-analyzed volume"
   - Should show detected items and access difficulty

6. **Verify in Supabase**:
   - Go to **Table Editor** → `leads`
   - Find your test submission
   - Check the new Vision AI columns are populated

## Testing Different Scenarios

### Test 1: With Vision AI Enabled (Normal Flow)
- ✅ OpenAI API key is set
- Expected: AI analyzes photos, uses volume-based pricing
- Look for: `"method": "vision"` in the response

### Test 2: Without API Key (Fallback)
- Remove or comment out `OPENAI_API_KEY` in `.env`
- Restart server
- Expected: Falls back to legacy photo-count pricing
- Look for: `"method": "legacy"` in the response

### Test 3: Vision API Failure (Graceful Degradation)
- Use invalid API key
- Expected: Error logged, but estimate still completes using legacy method
- Check terminal for: "Vision AI failed, falling back to legacy pricing"

## Understanding the Pricing Logic

### Legacy Method (Photo Count)
```
Base Price = Photos × $65-$110
× Item Type Multiplier (0.9-1.5)
× Zone Multiplier (1.0-1.5)
= Final Range: $120-$1200
```

### Vision Method (AI Volume)
```
Base Price = Cubic Yards × $50-$80
× Item Type Multiplier (from AI detection)
× Access Difficulty (1.0-1.3)
× Special Concerns (1.0-1.2)
× Zone Multiplier (1.0-1.5)
= Final Range: $120-$1200
```

## How It Works

1. **User uploads photos** → Photos sent to Cloudinary

2. **Photos analyzed by GPT-4 Vision**:
   - Estimates volume in cubic yards
   - Identifies item types (furniture, appliances, etc.)
   - Assesses access difficulty
   - Notes special concerns

3. **Enhanced pricing calculation**:
   - Uses actual volume instead of photo count
   - Applies intelligent multipliers
   - Generates detailed assumptions

4. **Data stored in database**:
   - Both legacy and vision data saved
   - Can compare accuracy over time
   - Audit trail of AI decisions

## Monitoring & Optimization

### Check Vision API Usage
- Go to [OpenAI Usage Dashboard](https://platform.openai.com/usage)
- Monitor costs and requests
- Set spending limits if needed

### Compare Accuracy
Run this query in Supabase to compare methods:

```sql
SELECT 
  pricing_method,
  AVG(estimated_min_price) as avg_min,
  AVG(estimated_max_price) as avg_max,
  AVG(ai_volume_cubic_yards) as avg_volume,
  COUNT(*) as total_estimates
FROM leads
GROUP BY pricing_method;
```

### Tune the Pricing
Edit `netlify/functions/lib/price-estimator.js`:

```javascript
// Adjust volume pricing
const PRICE_PER_CUBIC_YARD_MIN = 50;  // Change this
const PRICE_PER_CUBIC_YARD_MAX = 80;  // Change this

// Adjust access multipliers in vision-analyzer.js
const multipliers = {
  easy: 1.0,    // Change this
  medium: 1.15, // Change this  
  hard: 1.3     // Change this
};
```

## Troubleshooting

### "Missing OPENAI_API_KEY" Error
- Check `.env` file exists and has the key
- Restart `netlify dev` to reload environment
- Verify key starts with `sk-proj-` or `sk-`

### Vision Analysis Returns Fallback Data
- Check OpenAI API key is valid
- Verify you have credits in your OpenAI account
- Check terminal logs for specific API errors
- Test key directly: https://platform.openai.com/playground

### Photos Not Uploading to Cloudinary
- This is separate from Vision AI
- Check Cloudinary credentials in `.env`
- Vision AI requires photos to be uploaded first

### Estimates Still Using Legacy Method
- Check `pricing_method` column in database
- Verify Vision AI didn't error (check terminal logs)
- Test with fresh photos in good lighting

## Future Enhancements

Once this is working, you can:

1. **Fine-tune the prompts** in `vision-analyzer.js` for better accuracy
2. **Add admin dashboard** to review AI decisions
3. **Collect feedback** to improve the model
4. **Train custom model** once you have enough data
5. **Add image preprocessing** to enhance photo quality

## Cost Management

To keep costs low:

1. **Limit photos to 3-4** (still accurate, cheaper)
2. **Use "low" detail mode** in vision-analyzer.js:
   ```javascript
   image_url: { url: url, detail: "low" }  // Change to "low"
   ```
3. **Set OpenAI spending limits** in your dashboard
4. **Only enable for high-value leads** (optional filter)

## Support

If you encounter issues:
- Check terminal logs for detailed error messages
- Review OpenAI API status: https://status.openai.com
- Test API key in OpenAI Playground first
- Verify Supabase migration completed successfully

---

**Status**: ✅ Implementation Complete
**Next Step**: Get OpenAI API key and test!
