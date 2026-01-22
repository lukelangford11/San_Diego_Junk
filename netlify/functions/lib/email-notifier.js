/**
 * Email notification service
 * Sends notifications when new leads are created
 * 
 * Note: This is a placeholder implementation.
 * For production, integrate with SendGrid, Postmark, or AWS SES.
 */

/**
 * Send email notification about new lead
 * This is non-blocking and should not fail the lead submission
 */
export async function sendLeadNotification(lead) {
  const notificationEmail = process.env.NOTIFICATION_EMAIL;
  
  if (!notificationEmail) {
    console.log('No notification email configured, skipping email notification');
    return { success: false, reason: 'not_configured' };
  }

  try {
    // Format the lead data
    const emailContent = formatLeadEmail(lead);
    
    // TODO: Implement actual email sending
    // Options:
    // 1. SendGrid: https://www.npmjs.com/package/@sendgrid/mail
    // 2. Postmark: https://www.npmjs.com/package/postmark
    // 3. AWS SES: https://www.npmjs.com/package/@aws-sdk/client-ses
    // 4. Netlify Forms (sends email automatically)
    
    // For now, just log the email content
    console.log('=== NEW LEAD NOTIFICATION ===');
    console.log(emailContent);
    console.log('=============================');
    
    // Example SendGrid implementation (commented out):
    /*
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    const msg = {
      to: notificationEmail,
      from: 'noreply@sandiegojunkpros.com',
      subject: `New Lead: ${lead.customer_name} - ${lead.zip_code}`,
      text: emailContent,
      html: emailContent.replace(/\n/g, '<br>')
    };
    
    await sgMail.send(msg);
    */
    
    return { success: true };
  } catch (error) {
    console.error('Email notification error:', error);
    // Don't fail the lead submission if email fails
    return { success: false, error: error.message };
  }
}

/**
 * Format lead data into email content
 */
function formatLeadEmail(lead) {
  const {
    id,
    customer_name,
    customer_phone,
    customer_email,
    zip_code,
    photo_urls,
    item_types,
    additional_notes,
    estimated_min_price,
    estimated_max_price,
    confidence_level,
    estimate_assumptions,
    pricing_zone,
    preferred_pickup_start,
    preferred_pickup_end,
    created_at
  } = lead;

  return `
NEW LEAD RECEIVED
==================

Lead ID: ${id}
Created: ${new Date(created_at).toLocaleString()}

CUSTOMER INFORMATION
--------------------
Name: ${customer_name}
Phone: ${customer_phone}
Email: ${customer_email || 'Not provided'}
ZIP Code: ${zip_code}

JOB DETAILS
-----------
Item Types: ${item_types.length > 0 ? item_types.join(', ') : 'Not specified'}
Additional Notes: ${additional_notes || 'None'}

Preferred Pickup Window:
${preferred_pickup_start ? `Start: ${new Date(preferred_pickup_start).toLocaleString()}` : 'Not specified'}
${preferred_pickup_end ? `End: ${new Date(preferred_pickup_end).toLocaleString()}` : 'Not specified'}

PHOTOS (${photo_urls.length})
-------------
${photo_urls.map((url, i) => `${i + 1}. ${url}`).join('\n')}

AI PRICE ESTIMATE
-----------------
Range: $${estimated_min_price} - $${estimated_max_price}
Confidence: ${confidence_level}
Zone: ${pricing_zone}

Assumptions: ${estimate_assumptions}

NEXT STEPS
----------
1. Review photos and customer details
2. Contact customer at ${customer_phone}
3. Schedule on-site assessment if needed
4. Provide final quote

View full lead details in Supabase dashboard.
Lead Status: Unclaimed
`.trim();
}

/**
 * Send test email notification
 */
export async function sendTestEmail(recipientEmail) {
  const testLead = {
    id: '00000000-0000-0000-0000-000000000000',
    customer_name: 'Test Customer',
    customer_phone: '+1-858-555-0100',
    customer_email: 'test@example.com',
    zip_code: '92101',
    photo_urls: ['https://example.cloudinary.com/test1.jpg', 'https://example.cloudinary.com/test2.jpg'],
    item_types: ['furniture', 'appliances'],
    additional_notes: 'This is a test notification',
    estimated_min_price: 180,
    estimated_max_price: 320,
    confidence_level: 'medium',
    estimate_assumptions: 'Based on 2 test photos',
    pricing_zone: 'zone_1_core',
    preferred_pickup_start: null,
    preferred_pickup_end: null,
    created_at: new Date().toISOString()
  };

  return sendLeadNotification(testLead);
}
