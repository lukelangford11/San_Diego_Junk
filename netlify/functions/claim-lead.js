import { claimLead } from './lib/supabase-client.js';

/**
 * Netlify Function: Claim Lead
 * POST /api/claim-lead
 * 
 * Allows a buyer to claim an unclaimed lead
 * Returns full lead details including customer contact info
 * Future: Add authentication via JWT
 */

export async function handler(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // TODO: Add authentication check
    // const authHeader = event.headers.authorization;
    // const buyer = await authenticateBuyer(authHeader);
    // if (!buyer) {
    //   return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    // }

    // Parse request body
    let body;
    try {
      body = JSON.parse(event.body);
    } catch (parseError) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      };
    }

    const { lead_id, buyer_id } = body;

    // Validate required fields
    if (!lead_id) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'lead_id is required' })
      };
    }

    if (!buyer_id) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'buyer_id is required' })
      };
    }

    // TODO: Verify buyer_id matches authenticated user
    // if (buyer.id !== buyer_id) {
    //   return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) };
    // }

    // Attempt to claim the lead
    const claimedLead = await claimLead(lead_id, buyer_id);

    // Return full lead details (including customer contact info)
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        lead: {
          id: claimedLead.id,
          created_at: claimedLead.created_at,
          
          // Customer contact info (now accessible after claiming)
          customer_name: claimedLead.customer_name,
          customer_phone: claimedLead.customer_phone,
          customer_email: claimedLead.customer_email,
          zip_code: claimedLead.zip_code,
          
          // Job details
          photo_urls: claimedLead.photo_urls,
          item_types: claimedLead.item_types,
          additional_notes: claimedLead.additional_notes,
          preferred_pickup_start: claimedLead.preferred_pickup_start,
          preferred_pickup_end: claimedLead.preferred_pickup_end,
          
          // Estimate
          estimated_min_price: claimedLead.estimated_min_price,
          estimated_max_price: claimedLead.estimated_max_price,
          confidence_level: claimedLead.confidence_level,
          estimate_assumptions: claimedLead.estimate_assumptions,
          pricing_zone: claimedLead.pricing_zone,
          
          // Status
          status: claimedLead.status,
          claimed_by: claimedLead.claimed_by,
          claimed_at: claimedLead.claimed_at
        },
        message: 'Lead claimed successfully! Contact customer to schedule service.'
      })
    };

  } catch (error) {
    console.error('Error in claim-lead:', error);
    
    // Handle specific error cases
    if (error.message.includes('not found') || error.message.includes('already claimed')) {
      return {
        statusCode: 409,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: error.message
        })
      };
    }
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'Failed to claim lead'
      })
    };
  }
}
