// supabase/functions/verify-otp/index.ts
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
        const { contact, code } = await req.json()

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Check if OTP exists for this contact
        const { data: otpData, error: otpError } = await supabase
            .from('verification_otps')
            .select('*')
            .eq('contact_info', contact)
            .eq('code', code)
            .eq('type', 'email')
            .maybeSingle()

        if (otpError) throw otpError

        if (!otpData) {
            return new Response(
                JSON.stringify({ error: 'Invalid verification code' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 2. Check if code is expired
        const expiresAt = new Date(otpData.expires_at)
        if (expiresAt < new Date()) {
            await supabase.from('verification_otps').delete().eq('id', otpData.id)
            return new Response(
                JSON.stringify({ error: 'Verification code has expired. Please request a new one.' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 2. Delete the used OTP
        await supabase.from('verification_otps').delete().eq('id', otpData.id)

        return new Response(
            JSON.stringify({ success: true }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
