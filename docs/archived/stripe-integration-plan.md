# Stripe Integration Plan for TableXport

## Overview

Integration of Stripe payment processing with the Supabase subscription system to handle:

- Subscription management (Pro/Enterprise plans)
- Payment processing and webhooks
- Trial periods and plan changes
- Billing portal integration

## Stripe Setup

### 1. Stripe Products and Prices

```typescript
// Stripe Products to create
const products = [
  {
    name: "TableXport Pro",
    description: "Advanced table export features with increased limits",
    metadata: { plan: "pro" }
  },
  {
    name: "TableXport Enterprise",
    description: "Unlimited exports with team collaboration features",
    metadata: { plan: "enterprise" }
  }
]

// Stripe Prices (recurring monthly)
const prices = [
  {
    product: "prod_pro_id",
    unit_amount: 999, // $9.99 in cents
    currency: "usd",
    recurring: { interval: "month" },
    metadata: { plan: "pro" }
  },
  {
    product: "prod_enterprise_id",
    unit_amount: 2999, // $29.99 in cents
    currency: "usd",
    recurring: { interval: "month" },
    metadata: { plan: "enterprise" }
  }
]
```

### 2. Environment Variables

```bash
# Stripe Keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID=price_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## Implementation Components

### 1. Stripe Client Setup

```typescript
// src/lib/stripe/client.ts
import { loadStripe } from "@stripe/stripe-js"
// src/lib/stripe/server.ts
import Stripe from "stripe"

export const getStripe = () => {
  return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16"
})
```

### 2. Checkout Session Creation

```typescript
// API endpoint: /api/stripe/create-checkout-session
export async function createCheckoutSession(userId: string, priceId: string) {
  const session = await stripe.checkout.sessions.create({
    customer_email: userEmail,
    client_reference_id: userId,
    line_items: [
      {
        price: priceId,
        quantity: 1
      }
    ],
    mode: "subscription",
    success_url: `${process.env.NEXTAUTH_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXTAUTH_URL}/pricing`,
    subscription_data: {
      trial_period_days: 14, // 14-day free trial
      metadata: {
        userId: userId
      }
    }
  })

  return session
}
```

### 3. Webhook Handler

```typescript
// API endpoint: /api/stripe/webhooks
import { buffer } from "micro"

export async function handleStripeWebhook(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const buf = await buffer(req)
  const sig = req.headers["stripe-signature"]!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.log(`Webhook signature verification failed.`, err)
    return res.status(400).send(`Webhook Error: ${err}`)
  }

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(
        event.data.object as Stripe.Checkout.Session
      )
      break

    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
      break

    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
      break

    case "invoice.payment_succeeded":
      await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
      break

    case "invoice.payment_failed":
      await handlePaymentFailed(event.data.object as Stripe.Invoice)
      break

    default:
      console.log(`Unhandled event type ${event.type}`)
  }

  res.json({ received: true })
}
```

### 4. Webhook Event Handlers

```typescript
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id!
  const subscriptionId = session.subscription as string

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const plan = subscription.items.data[0].price.metadata
    .plan as SubscriptionPlan

  await subscriptionService.updateSubscription(userId, plan, {
    customerId: subscription.customer as string,
    subscriptionId: subscription.id,
    periodStart: new Date(
      subscription.current_period_start * 1000
    ).toISOString(),
    periodEnd: new Date(subscription.current_period_end * 1000).toISOString()
  })
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId
  if (!userId) return

  const plan = subscription.items.data[0].price.metadata
    .plan as SubscriptionPlan

  await subscriptionService.updateSubscription(userId, plan, {
    customerId: subscription.customer as string,
    subscriptionId: subscription.id,
    periodStart: new Date(
      subscription.current_period_start * 1000
    ).toISOString(),
    periodEnd: new Date(subscription.current_period_end * 1000).toISOString()
  })
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string

  // Record payment in database
  await supabase.from("payments").insert({
    subscription_id: subscriptionId,
    amount: invoice.amount_paid / 100, // Convert from cents
    currency: invoice.currency.toUpperCase(),
    stripe_payment_intent_id: invoice.payment_intent as string,
    status: "succeeded",
    metadata: {
      invoice_id: invoice.id,
      billing_reason: invoice.billing_reason
    }
  })
}
```

### 5. Customer Portal Integration

```typescript
// API endpoint: /api/stripe/create-portal-session
export async function createPortalSession(customerId: string) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXTAUTH_URL}/dashboard`
  })

  return session
}
```

## React Components

### 1. Pricing Page

```typescript
// components/PricingPlans.tsx
import { SUBSCRIPTION_PLANS } from '@/lib/supabase/types';

export const PricingPlans = () => {
  const handleUpgrade = async (plan: SubscriptionPlan) => {
    const response = await fetch('/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    });

    const { sessionId } = await response.json();
    const stripe = await getStripe();

    await stripe?.redirectToCheckout({ sessionId });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {Object.entries(SUBSCRIPTION_PLANS).map(([planKey, plan]) => (
        <PricingCard
          key={planKey}
          plan={plan}
          planKey={planKey as SubscriptionPlan}
          onUpgrade={handleUpgrade}
        />
      ))}
    </div>
  );
};
```

### 2. Usage Dashboard Component

```typescript
// components/UsageDashboard.tsx
export const UsageDashboard = () => {
  const [usageStats, setUsageStats] = useState(null);

  useEffect(() => {
    async function loadUsageStats() {
      const stats = await subscriptionService.getUsageStats(userId);
      setUsageStats(stats);
    }
    loadUsageStats();
  }, [userId]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <UsageCard
          title="Exports This Month"
          current={usageStats?.usage.exports.current}
          limit={usageStats?.usage.exports.limit}
          percentage={usageStats?.usage.exports.percentage}
        />
        <UsageCard
          title="Cloud Storage"
          current={usageStats?.usage.storage.current}
          limit={usageStats?.usage.storage.limit}
          percentage={usageStats?.usage.storage.percentage}
          unit="MB"
        />
        <UsageCard
          title="Shared Tables"
          current={usageStats?.usage.sharedTables.current}
          limit={usageStats?.usage.sharedTables.limit}
          percentage={usageStats?.usage.sharedTables.percentage}
        />
      </div>

      <UpgradePrompt currentPlan={usageStats?.subscription.plan_type} />
    </div>
  );
};
```

## Security Considerations

### 1. Webhook Security

- Verify webhook signatures from Stripe
- Use HTTPS endpoints only
- Implement idempotency for webhook processing
- Log all webhook events for debugging

### 2. User Data Protection

- Never store sensitive payment data
- Use Stripe Customer Portal for billing management
- Implement proper RLS policies in Supabase
- Encrypt sensitive metadata

### 3. Error Handling

```typescript
try {
  await subscriptionService.recordExport(userId, exportData)
} catch (error) {
  if (error.message.includes("limit reached")) {
    // Show upgrade prompt
    showUpgradeModal()
  } else {
    // Log error and show generic message
    console.error("Export failed:", error)
    showErrorToast("Export failed. Please try again.")
  }
}
```

## Testing Strategy

### 1. Stripe Test Mode

- Use test API keys for development
- Test with Stripe test card numbers
- Verify webhook handling with Stripe CLI

### 2. Test Scenarios

- Successful subscription creation
- Failed payment handling
- Subscription cancellation
- Plan upgrades/downgrades
- Trial period expiration
- Usage limit enforcement

### 3. Integration Tests

```typescript
describe("Subscription Service", () => {
  test("should enforce export limits for free users", async () => {
    const userId = "test-user-free"

    // Simulate 10 exports (free limit)
    for (let i = 0; i < 10; i++) {
      await subscriptionService.recordExport(userId, mockExportData)
    }

    // 11th export should fail
    await expect(
      subscriptionService.recordExport(userId, mockExportData)
    ).rejects.toThrow("Export limit reached")
  })
})
```

## Deployment Checklist

1. ✅ Set up Stripe webhook endpoint
2. ✅ Configure environment variables
3. ✅ Create Stripe products and prices
4. ✅ Test webhook handling in staging
5. ✅ Verify payment flows work correctly
6. ✅ Test subscription management features
7. ✅ Monitor webhook delivery and errors
8. ✅ Set up alerting for failed payments

## Monitoring and Analytics

### 1. Key Metrics to Track

- Monthly Recurring Revenue (MRR)
- Churn rate by plan
- Trial-to-paid conversion rate
- Average revenue per user (ARPU)
- Usage patterns by plan tier

### 2. Error Monitoring

- Failed webhook deliveries
- Payment failures
- Subscription creation errors
- Usage limit violations

### 3. Dashboard Queries

```sql
-- Monthly revenue by plan
SELECT
  s.plan_type,
  DATE_TRUNC('month', p.created_at) as month,
  SUM(p.amount) as revenue,
  COUNT(DISTINCT s.user_id) as subscribers
FROM subscriptions s
JOIN payments p ON p.subscription_id = s.id
WHERE p.status = 'succeeded'
GROUP BY s.plan_type, month
ORDER BY month DESC;

-- Usage by plan
SELECT
  s.plan_type,
  AVG(uq.exports_this_month) as avg_exports,
  AVG(uq.storage_used_mb) as avg_storage,
  AVG(uq.shared_tables_count) as avg_shared_tables
FROM subscriptions s
JOIN usage_quotas uq ON uq.user_id = s.user_id
WHERE s.status = 'active'
GROUP BY s.plan_type;
```

This comprehensive plan ensures a robust subscription system that scales with your business while providing excellent user experience and proper financial tracking.
