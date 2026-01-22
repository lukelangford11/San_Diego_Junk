import { getLeads } from './lib/supabase-client.js';

/**
 * Netlify Function: Get Leads
 * GET /api/get-leads
 * 
 * Returns paginated list of leads for buyer dashboard/iOS app
 * Future: Add authentication via JWT
 */

export async function handler(event, context) {
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // TODO: Add authentication check
    // const authHeader = event.headers.authorization;
    // if (!authHeader || !isValidToken(authHeader)) {
    //   return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    // }

    // Parse query parameters
    const params = event.queryStringParameters || {};
    const {
      status = 'unclaimed',
      zip_code,
      min_price,
      max_price,
      limit = '20',
      offset = '0'
    } = params;

    // Validate and parse numeric params
    const parsedLimit = Math.min(parseInt(limit, 10) || 20, 100); // Max 100 per page
    const parsedOffset = parseInt(offset, 10) || 0;
    const parsedMinPrice = min_price ? parseFloat(min_price) : undefined;
    const parsedMaxPrice = max_price ? parseFloat(max_price) : undefined;

    // Query database
    const result = await getLeads({
      status,
      zipCode: zip_code,
      minPrice: parsedMinPrice,
      maxPrice: parsedMaxPrice,
      limit: parsedLimit,
      offset: parsedOffset
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(result.total / parsedLimit);
    const currentPage = Math.floor(parsedOffset / parsedLimit) + 1;

    // Return filtered leads (hide sensitive info for list view)
    const sanitizedLeads = result.leads.map(lead => ({
      id: lead.id,
      created_at: lead.created_at,
      zip_code: lead.zip_code,
      photo_urls: lead.photo_urls,
      item_types: lead.item_types,
      estimated_min_price: lead.estimated_min_price,
      estimated_max_price: lead.estimated_max_price,
      confidence_level: lead.confidence_level,
      pricing_zone: lead.pricing_zone,
      status: lead.status,
      preferred_pickup_start: lead.preferred_pickup_start,
      preferred_pickup_end: lead.preferred_pickup_end
      // Note: customer contact info NOT included in list view
      // Only revealed after claiming the lead
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        leads: sanitizedLeads,
        pagination: {
          total: result.total,
          limit: parsedLimit,
          offset: parsedOffset,
          page: currentPage,
          totalPages
        }
      })
    };

  } catch (error) {
    console.error('Error in get-leads:', error);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'Failed to fetch leads'
      })
    };
  }
}
