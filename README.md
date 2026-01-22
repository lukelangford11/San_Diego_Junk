# San Diego Junk Removal - Lead Generation Platform

AI-powered price estimator and lead capture system for junk removal services in San Diego, CA.

## Overview

This platform allows customers to:
- Upload 1-6 photos of items to be removed
- Get instant AI-generated price estimates
- Submit lead requests with contact information
- Receive same-day service quotes

Leads are stored in a PostgreSQL database (Supabase) and can be accessed via REST API for future buyer marketplace integration.

## Features

- **AI Price Estimator**: Heuristic-based pricing using photo count, item types, and location zones
- **Photo Uploads**: Cloudinary integration for reliable image hosting
- **Multi-Step Form**: User-friendly wizard interface
- **Spam Protection**: Honeypot fields + IP-based rate limiting
- **Mobile Optimized**: Responsive design with mobile camera upload support
- **SEO Optimized**: Structured data, meta tags, and fast page load
- **API-First**: RESTful endpoints ready for iOS app integration
- **Lead Management**: Database-backed lead storage with status tracking

## Tech Stack

- **Frontend**: Static HTML, CSS, Vanilla JavaScript
- **Backend**: Netlify Serverless Functions (Node.js)
- **Database**: Supabase (PostgreSQL)
- **File Storage**: Cloudinary
- **Hosting**: Netlify
- **API**: REST API with JSON responses

## Quick Start

### 1. Clone Repository

```bash
git clone <repository-url>
cd san-diego-junk-removal
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your Supabase and Cloudinary credentials
```

See [SETUP.md](SETUP.md) for detailed configuration instructions.

### 4. Local Development

```bash
netlify dev
```

Open http://localhost:8888 in your browser.

### 5. Deploy to Production

```bash
netlify deploy --prod
```

## Project Structure

```
.
├── index.html              # Homepage
├── estimate.html           # AI Estimator page
├── style.css               # Base styles
├── estimate.css            # Estimator styles
├── script.js               # Homepage JavaScript
├── estimate-script.js      # Estimator JavaScript
├── netlify/
│   └── functions/          # Serverless API functions
│       ├── submit-estimate.js    # Submit estimate endpoint
│       ├── get-leads.js          # Get leads (iOS app)
│       ├── claim-lead.js         # Claim lead (iOS app)
│       ├── update-lead-status.js # Update status (iOS app)
│       └── lib/                  # Shared utilities
│           ├── supabase-client.js
│           ├── price-estimator.js
│           ├── zone-config.js
│           ├── validator.js
│           ├── rate-limiter.js
│           └── email-notifier.js
├── supabase-schema.sql     # Database schema
├── netlify.toml            # Netlify config
├── package.json            # Dependencies
├── SETUP.md               # Detailed setup guide
└── README.md              # This file
```

## API Endpoints

### POST /api/submit-estimate

Submit a new estimate request.

**Request Body:**
```json
{
  "customer_name": "John Doe",
  "customer_phone": "(858) 555-0100",
  "customer_email": "john@example.com",
  "zip_code": "92101",
  "photo_urls": ["https://..."],
  "item_types": ["furniture", "appliances"],
  "additional_notes": "Ground floor access",
  "preferred_pickup_start": "2026-01-20T09:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "lead_id": "uuid",
  "estimate": {
    "min_price": 180,
    "max_price": 320,
    "confidence": "medium",
    "assumptions": "Based on 3 photos...",
    "zone": "zone_1_core"
  }
}
```

### GET /api/get-leads

Get paginated list of leads (for buyer dashboard/iOS app).

**Query Parameters:**
- `status`: `unclaimed` | `claimed` | `all`
- `zip_code`: Filter by ZIP
- `min_price`, `max_price`: Price range filters
- `limit`, `offset`: Pagination

**Response:**
```json
{
  "success": true,
  "leads": [...],
  "pagination": {
    "total": 45,
    "page": 1,
    "totalPages": 3
  }
}
```

See [SETUP.md](SETUP.md) for complete API documentation.

## Pricing Algorithm

The AI estimator uses a heuristic-based approach:

1. **Base Volume**: `photos × $65-$110` (photos as volume proxy)
2. **Item Type Multipliers**:
   - Furniture: 1.0x (baseline)
   - Appliances: 1.2x
   - Yard Waste: 0.9x
   - Hot Tub: 1.5x
   - Construction: 1.3x
   - Electronics: 1.1x
3. **Zone Pricing**:
   - Zone 1 (Core San Diego): 1.0x
   - Zone 2 (Extended): 1.15x
   - Zone 3 (County): 1.3x
   - Zone 4 (Out of area): 1.5x
4. **Floors & Ceilings**: $120 minimum, $1200 maximum
5. **Confidence Scoring**: Based on photo count, item types, and notes

See `netlify/functions/lib/price-estimator.js` for implementation details.

## Database Schema

### Tables

- **leads**: Primary lead storage with estimate data
- **buyers**: Junk removal companies (future)
- **lead_claims**: Audit trail of buyer actions (future)
- **rate_limit**: Spam protection tracking

See `supabase-schema.sql` for complete schema with indexes and RLS policies.

## Security

- **Rate Limiting**: 3 submissions per hour per IP
- **Honeypot Fields**: Bot detection
- **Input Validation**: Server-side validation of all fields
- **Row Level Security**: Supabase RLS policies restrict data access
- **Environment Variables**: Sensitive credentials never committed
- **HTTPS Only**: Enforced via Netlify

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile Safari (iOS 14+)
- Chrome Mobile (Android 11+)

## Performance

- **Page Load**: < 2 seconds
- **Photo Upload**: Direct to Cloudinary (no server bottleneck)
- **API Response**: < 500ms average
- **Mobile Optimized**: Responsive images, touch-friendly UI

## SEO

- Structured data (Schema.org)
- Open Graph tags
- Twitter Cards
- Semantic HTML
- Mobile-first responsive design
- Fast page load times
- Clean URLs
- XML sitemap

## Future Enhancements

- [ ] Buyer dashboard (React SPA)
- [ ] iOS app for buyer marketplace
- [ ] Computer vision for photo analysis
- [ ] Payment integration (Stripe)
- [ ] SMS notifications (Twilio)
- [ ] CallRail phone tracking
- [ ] Lead scoring ML model
- [ ] Real-time availability calendar

## Contributing

This is a private production repository. Contact the team before making changes.

## License

Proprietary - San Diego Junk Removal Platform

## Support

For setup issues, see [SETUP.md](SETUP.md).

For production issues, contact the development team.

---

**Built with** ⚡ by San Diego Junk Removal Team
