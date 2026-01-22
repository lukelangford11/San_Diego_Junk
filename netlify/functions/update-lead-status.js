import { updateLeadStatus } from './lib/supabase-client.js';

/**
 * Netlify Function: Update Lead Status
 * POST /api/update-lead-status
 * 
 * Allows updating lead status (scheduled, completed, cancelled)
 * Future: Add authentication and permission checks
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

    const { lead_id, status } = body;

    // Validate required fields
    if (!lead_id) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'lead_id is required' })
      };
    }

    if (!status) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'status is required' })
      };
    }

    // Validate status value
    const validStatuses = ['unclaimed', 'claimed', 'scheduled', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        })
      };
    }

    // TODO: Check if buyer owns this lead
    // const lead = await getLead(lead_id);
    // if (lead.claimed_by !== buyer.id) {
    //   return { statusCode: 403, body: JSON.stringify({ error: 'Not your lead' }) };
    // }

    // Update status
    const updatedLead = await updateLeadStatus(lead_id, status);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        lead: {
          id: updatedLead.id,
          status: updatedLead.status
        },
        message: `Lead status updated to: ${status}`
      })
    };

  } catch (error) {
    console.error('Error in update-lead-status:', error);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'Failed to update lead status'
      })
    };
  }
}
