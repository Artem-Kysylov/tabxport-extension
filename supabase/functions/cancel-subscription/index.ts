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

type Provider = 'paypal' | 'stripe' | 'none'

interface CancelPayload {
  userId: string
}

const getEnv = (key: string): string | undefined => Deno?.env?.get(key)

// PayPal helpers
const getPayPalEnv = () =>
  (getEnv('PAYPAL_ENV') || getEnv('PAYPAL_ENVIRONMENT') || 'live').toLowerCase()

const getPayPalBaseUrl = () => {
  const env = getPayPalEnv()
  return env === 'sandbox'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com'
}

const getPayPalAccessToken = async () => {
  const clientId = getEnv('PAYPAL_CLIENT_ID')
  const clientSecret = getEnv('PAYPAL_CLIENT_SECRET')

  if (!clientId || !clientSecret) {
    throw new Error('PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET not configured')
  }

  const tokenUrl = `${getPayPalBaseUrl()}/v1/oauth2/token`
  const auth = btoa(`${clientId}:${clientSecret}`)

  const resp = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  })

  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`PayPal token fetch failed: ${text}`)
  }

  const json = await resp.json()
  return json.access_token as string
}

const cancelPayPalSubscription = async (subscriptionId: string) => {
  const accessToken = await getPayPalAccessToken()
  const url = `${getPayPalBaseUrl()}/v1/billing/subscriptions/${subscriptionId}/cancel`

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ reason: 'User requested cancellation from extension' })
  })

  // PayPal возвращает 204 No Content при успехе
  if (resp.status === 204) return { success: true as const }

  // Если уже отменено или не найдено — вернем ошибку с телом
  const text = await resp.text()
  return { success: false as const, error: `PayPal cancel failed: ${text}` }
}

// Stripe helpers
const cancelStripeSubscription = async (subscriptionId: string) => {
  const secretKey = getEnv('STRIPE_SECRET_KEY')
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY not configured')
  }

  // Немедленная отмена
  const url = `https://api.stripe.com/v1/subscriptions/${subscriptionId}/cancel`

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${secretKey}`
    }
  })

  if (!resp.ok) {
    const text = await resp.text()
    return { success: false as const, error: `Stripe cancel failed: ${text}` }
  }

  const json = await resp.json()
  // json.status может быть 'canceled'
  if (json.status !== 'canceled') {
    return { success: false as const, error: `Stripe cancel returned status ${json.status}` }
  }

  return { success: true as const }
}

serve(async (req: Request) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405
      })
    }

    const { userId }: CancelPayload = await req.json()
    if (!userId) {
      return new Response(JSON.stringify({ success: false, error: 'Missing userId' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    // + Проверка авторизации вызова
    const supabaseUrl = getEnv('SUPABASE_URL') || getEnv('PLASMO_PUBLIC_SUPABASE_URL') || ''
    const anonKey = getEnv('SUPABASE_ANON_KEY') || getEnv('PLASMO_PUBLIC_SUPABASE_ANON_KEY') || ''
    const authHeader = req.headers.get('Authorization') || ''

    if (!supabaseUrl || !anonKey || !authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      })
    }

    // @ts-ignore Deno URL import
    const { createClient: createPublicClient } = await import('https://esm.sh/@supabase/supabase-js@2?target=deno&dts')
    const supabaseClient = createPublicClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    })
    const { data: authData, error: authError } = await supabaseClient.auth.getUser()

    if (authError || !authData?.user || authData.user.id !== userId) {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403
      })
    }

    // Supabase admin client
    const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY') || ''

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured')
    }

    // @ts-ignore: URL import резолвится в Deno на рантайме; флаг dts генерирует типы
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2?target=deno&dts')
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // Получаем активную/триал подписку
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .single()

    if (subError?.code === 'PGRST116' || !subscription) {
      // Нет активной подписки — считаем успехом (ничего отменять)
      return new Response(
        JSON.stringify({ success: true, message: 'No active subscription found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Определяем провайдера
    const hasPayPal = !!(subscription as any).paypal_subscription_id
    const hasStripe = !!(subscription as any).stripe_subscription_id

    let provider: Provider = 'none'
    let cancelResult: { success: boolean; error?: string } = { success: true }

    if (hasPayPal) {
      provider = 'paypal'
      const paypalSubId = (subscription as any).paypal_subscription_id as string
      cancelResult = await cancelPayPalSubscription(paypalSubId)
    } else if (hasStripe) {
      provider = 'stripe'
      const stripeSubId = (subscription as any).stripe_subscription_id as string
      cancelResult = await cancelStripeSubscription(stripeSubId)
    } else {
      provider = 'none'
      // Нет привязки к провайдеру — просто отменим локально
      cancelResult = { success: true }
    }

    if (!cancelResult.success) {
      return new Response(
        JSON.stringify({ success: false, error: cancelResult.error || 'Provider cancellation failed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      )
    }

    // Обновляем статус в нашей БД
    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id)

    if (updateError) {
      return new Response(
        JSON.stringify({ success: false, error: `Failed to update subscription: ${updateError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Subscription cancelled${provider !== 'none' ? ` via ${provider}` : ''}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('❌ Cancel subscription error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})