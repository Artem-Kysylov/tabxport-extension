// Объявляем глобаль Deno для IDE (в рантайме Supabase Edge Functions она есть)
declare const Deno:
  | {
      env: { get(name: string): string | undefined }
    }
  | undefined

// @ts-ignore: URL import валиден в Deno (Supabase Edge Functions)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore: для Deno нужно явное .ts расширение; tsserver может ругаться
import { corsHeaders } from '../_shared/cors.ts'

interface SurveySubmissionData {
  optionId: string
  optionText: string
  timestamp: number
  userEmail?: string
  exportContext?: {
    format?: string
    tableCount?: number
    destination?: string
    exportType?: 'single' | 'batch'
    platform?: string
  }
}

function getEnv(name: string, fallback?: string): string | undefined {
  const v = Deno?.env?.get(name)
  if (v && v.trim().length > 0) return v
  return fallback
}

function buildEmailBody(data: SurveySubmissionData) {
  const surveyDate = new Date(data.timestamp).toLocaleString('ru-RU')
  const contextInfo = data.exportContext
    ? [
        `Format: ${data.exportContext.format || 'Unknown'}`,
        `Table Count: ${data.exportContext.tableCount ?? 'Unknown'}`,
        `Destination: ${data.exportContext.destination || 'Unknown'}`,
        `Export Type: ${data.exportContext.exportType || 'Unknown'}`,
        `Platform: ${data.exportContext.platform || 'Unknown'}`,
      ].join('\n')
    : 'No export context'

  const text = `
New TableXport Survey Response

📊 Survey Details:
- Option Selected: ${data.optionText} (${data.optionId})
- Response Time: ${surveyDate}
- User Email: ${data.userEmail || 'Anonymous'}

📈 Export Context:
${contextInfo}

---
TableXport Extension Survey System
  `.trim()

  const html = text.replace(/\n/g, '<br>')
  const subject = `🗳️ TableXport Survey Response: ${data.optionText}`

  return { subject, text, html }
}

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method Not Allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    })
  }

  try {
    const { optionId, optionText, timestamp, userEmail, exportContext }: SurveySubmissionData = await req.json()

    if (!optionId || !optionText || !timestamp) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid payload' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    console.log('📧 Processing survey response:', { optionId, optionText, userEmail })

    const { subject, text, html } = buildEmailBody({
      optionId,
      optionText,
      timestamp,
      userEmail,
      exportContext,
    })

    // Переменные окружения (секреты нужно задать в Supabase)
    const resendApiKey = getEnv('RESEND_API_KEY')
    const targetEmail = getEnv('SURVEY_TARGET_EMAIL', 'tabxport@gmail.com')!
    const replyTo = getEnv('RESEND_REPLY_TO') // опционально
    const fromEmail = getEnv('RESEND_FROM_EMAIL', 'TableXport Survey <hello@tablexport.com>')!

    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured')
    }

    // Отправка письма через Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [targetEmail],
        subject,
        text,
        html,
        ...(replyTo ? { reply_to: replyTo } : {})
      }),
    })

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text().catch(() => '')
      throw new Error(`Email sending failed [${emailResponse.status}]: ${errorText || 'Unknown error'}`)
    }

    const emailData: { id?: string } = await emailResponse.json().catch(() => ({}))
    console.log('✅ Email sent successfully:', emailData?.id)

    // Опционально: сохранение в БД (оставлено закомментированным)
    /*
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    const supabaseAdmin = createClient(
      (globalThis as any).Deno?.env?.get('SUPABASE_URL') ?? '',
      (globalThis as any).Deno?.env?.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { error: dbError } = await supabaseAdmin
      .from('survey_responses')
      .insert({
        option_id: optionId,
        option_text: optionText,
        user_email: userEmail,
        export_context: exportContext,
        submitted_at: new Date(timestamp).toISOString()
      })

    if (dbError) {
      console.error('Database save error:', dbError)
      // Не блокируем из-за ошибки БД
    }
    */

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Survey response submitted and email sent',
        emailId: emailData?.id ?? null,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('❌ Survey submission error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})