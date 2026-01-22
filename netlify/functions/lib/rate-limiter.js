import { getSupabaseClient } from './supabase-client.js';

/**
 * Rate limiting for spam protection
 * Tracks submissions per IP address per endpoint
 */

const MAX_ATTEMPTS_PER_HOUR = parseInt(process.env.MAX_SUBMISSIONS_PER_HOUR || '3', 10);
const WINDOW_DURATION_MS = 60 * 60 * 1000; // 1 hour

/**
 * Check if IP is rate limited
 * Returns { allowed: boolean, remaining: number, resetAt: Date }
 */
export async function checkRateLimit(ipAddress, endpoint = 'submit-estimate') {
  // TEMPORARY: Rate limiting disabled for testing
  return {
    allowed: true,
    remaining: 999,
    resetAt: new Date(Date.now() + WINDOW_DURATION_MS)
  };
  
  const supabase = getSupabaseClient();
  
  try {
    // Get existing rate limit record
    const { data: existing, error: queryError } = await supabase
      .from('rate_limit')
      .select('*')
      .eq('ip_address', ipAddress)
      .eq('endpoint', endpoint)
      .single();

    const now = new Date();

    // No existing record - create one
    if (queryError || !existing) {
      const { error: insertError } = await supabase
        .from('rate_limit')
        .insert([{
          ip_address: ipAddress,
          endpoint,
          attempt_count: 1,
          window_start: now.toISOString(),
          last_attempt: now.toISOString()
        }]);

      if (insertError) {
        console.error('Rate limit insert error:', insertError);
        // Fail open - allow request if we can't track it
        return { allowed: true, remaining: MAX_ATTEMPTS_PER_HOUR - 1, resetAt: new Date(now.getTime() + WINDOW_DURATION_MS) };
      }

      return {
        allowed: true,
        remaining: MAX_ATTEMPTS_PER_HOUR - 1,
        resetAt: new Date(now.getTime() + WINDOW_DURATION_MS)
      };
    }

    // Check if window has expired
    const windowStart = new Date(existing.window_start);
    const windowEnd = new Date(windowStart.getTime() + WINDOW_DURATION_MS);

    if (now > windowEnd) {
      // Window expired - reset counter
      const { error: updateError } = await supabase
        .from('rate_limit')
        .update({
          attempt_count: 1,
          window_start: now.toISOString(),
          last_attempt: now.toISOString()
        })
        .eq('ip_address', ipAddress)
        .eq('endpoint', endpoint);

      if (updateError) {
        console.error('Rate limit update error:', updateError);
      }

      return {
        allowed: true,
        remaining: MAX_ATTEMPTS_PER_HOUR - 1,
        resetAt: new Date(now.getTime() + WINDOW_DURATION_MS)
      };
    }

    // Window is active - check count
    if (existing.attempt_count >= MAX_ATTEMPTS_PER_HOUR) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: windowEnd
      };
    }

    // Increment counter
    const { error: updateError } = await supabase
      .from('rate_limit')
      .update({
        attempt_count: existing.attempt_count + 1,
        last_attempt: now.toISOString()
      })
      .eq('ip_address', ipAddress)
      .eq('endpoint', endpoint);

    if (updateError) {
      console.error('Rate limit increment error:', updateError);
    }

    return {
      allowed: true,
      remaining: MAX_ATTEMPTS_PER_HOUR - (existing.attempt_count + 1),
      resetAt: windowEnd
    };

  } catch (error) {
    console.error('Rate limit check error:', error);
    // Fail open - allow request if rate limiting fails
    return {
      allowed: true,
      remaining: MAX_ATTEMPTS_PER_HOUR - 1,
      resetAt: new Date(Date.now() + WINDOW_DURATION_MS)
    };
  }
}

/**
 * Get client IP address from request headers
 * Handles various proxy headers
 */
export function getClientIp(headers) {
  // Check common headers in order of preference
  const ipHeaders = [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip', // Cloudflare
    'x-client-ip',
    'true-client-ip'
  ];

  for (const header of ipHeaders) {
    const value = headers[header];
    if (value) {
      // x-forwarded-for can be comma-separated, take first IP
      const ip = value.split(',')[0].trim();
      if (ip) {
        return ip;
      }
    }
  }

  // Fallback to unknown
  return '0.0.0.0';
}
