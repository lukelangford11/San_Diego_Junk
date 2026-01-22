import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client for serverless functions
 * Uses service role key for full database access
 */

let supabaseClient = null;

export function getSupabaseClient() {
  if (!supabaseClient) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
    }

    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  return supabaseClient;
}

/**
 * Insert a new lead into the database
 */
export async function insertLead(leadData) {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('leads')
    .insert([leadData])
    .select()
    .single();

  if (error) {
    console.error('Supabase insert error:', error);
    throw new Error(`Failed to insert lead: ${error.message}`);
  }

  return data;
}

/**
 * Get leads with optional filters (for iOS app)
 */
export async function getLeads({ status, zipCode, minPrice, maxPrice, limit = 20, offset = 0 }) {
  const supabase = getSupabaseClient();
  
  let query = supabase
    .from('leads')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  if (zipCode) {
    query = query.eq('zip_code', zipCode);
  }

  if (minPrice) {
    query = query.gte('estimated_min_price', minPrice);
  }

  if (maxPrice) {
    query = query.lte('estimated_max_price', maxPrice);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Supabase query error:', error);
    throw new Error(`Failed to fetch leads: ${error.message}`);
  }

  return { leads: data, total: count };
}

/**
 * Claim a lead (mark as claimed by a buyer)
 */
export async function claimLead(leadId, buyerId) {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('leads')
    .update({
      status: 'claimed',
      claimed_by: buyerId,
      claimed_at: new Date().toISOString()
    })
    .eq('id', leadId)
    .eq('status', 'unclaimed') // Only claim if still unclaimed
    .select()
    .single();

  if (error) {
    console.error('Supabase claim error:', error);
    throw new Error(`Failed to claim lead: ${error.message}`);
  }

  if (!data) {
    throw new Error('Lead not found or already claimed');
  }

  // Log the claim action
  await supabase.from('lead_claims').insert([{
    lead_id: leadId,
    buyer_id: buyerId,
    action: 'claimed'
  }]);

  return data;
}

/**
 * Update lead status
 */
export async function updateLeadStatus(leadId, status) {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('leads')
    .update({ status })
    .eq('id', leadId)
    .select()
    .single();

  if (error) {
    console.error('Supabase update error:', error);
    throw new Error(`Failed to update lead status: ${error.message}`);
  }

  return data;
}
