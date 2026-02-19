// supabase/functions/send-confirmation/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { email, name, registration_id, event_title, type } = await req.json()

        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
        if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not set')

        let subject = ''
        let htmlContent = ''

        if (type === 'receipt') {
            subject = `Payment Received - ${event_title}`
            htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Payment Received!</h2>
          <p>Hello ${name},</p>
          <p>We have successfully received your Payment ID for the event: <strong>${event_title}</strong>.</p>
          <p>Our team is currently verifying the transaction. You will receive another email once your registration is officially confirmed.</p>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Registration ID</p>
            <p style="margin: 5px 0 0 0; font-family: monospace; font-size: 18px; color: #1e40af;">${registration_id}</p>
          </div>
          <p>Thank you for your patience!</p>
        </div>
      `
        } else if (type === 'confirmed') {
            subject = `Registration Confirmed! - ${event_title}`
            htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #059669;">Your Registration is Confirmed!</h1>
          <p>Hello ${name},</p>
          <p>Great news! Your payment has been verified and your registration for <strong>${event_title}</strong> is now officially confirmed.</p>
          <div style="background: #ecfdf5; border: 1px solid #10b981; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <p style="margin: 0; font-weight: bold; color: #065f46;">Registration Details:</p>
            <ul style="color: #065f46; margin: 10px 0 0 0;">
              <li><strong>Event:</strong> ${event_title}</li>
              <li><strong>ID:</strong> ${registration_id}</li>
              <li><strong>Status:</strong> Confirmed ✓</li>
            </ul>
          </div>
          <p>We look forward to seeing you at the event!</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="font-size: 12px; color: #9ca3af;">This is an automated message. Please do not reply to this email.</p>
        </div>
      `
        }

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: 'Events <onboarding@resend.dev>',
                to: [email],
                subject: subject,
                html: htmlContent,
            }),
        })

        const resData = await res.json()
        if (!res.ok) throw new Error(resData.message || 'Failed to send email via Resend')

        return new Response(
            JSON.stringify({ success: true, id: resData.id }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
