// supabase/functions/send-otp/index.ts
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
        const { contact, type } = await req.json()

        // Generate a 6-digit OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString()

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Delete existing OTPs for this contact to avoid collisions
        await supabase
            .from('verification_otps')
            .delete()
            .eq('contact_info', contact)
            .eq('type', type)

        // 2. Store new OTP in database
        const { error: dbError } = await supabase
            .from('verification_otps')
            .insert({
                contact_info: contact,
                code: otpCode,
                type
            })

        if (dbError) throw dbError

        // 2. Send via External Service (Email only)
        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
        if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not set')

        // Example Resend implementation
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: 'Events <onboarding@resend.dev>',
                to: [contact],
                subject: 'Your Verification Code',
                html: `<p>Your code is: <strong>${otpCode}</strong>. It expires in 10 minutes.</p>`,
            }),
        })

        if (!res.ok) throw new Error('Failed to send email via Resend')

        return new Response(
            JSON.stringify({ success: true, message: 'OTP sent successfully' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
