# PayPal Integration Plan for TableXport

## Overview

Integration of PayPal subscription payments with the Supabase system to handle:

- Subscription management (Pro/Enterprise plans)
- PayPal webhooks and payment processing
- Trial periods and plan changes
- Billing management through PayPal

## PayPal Setup

### 1. PayPal Developer Console Setup

```bash
# PayPal Environment Variables
NEXT_PUBLIC_PAYPAL_CLIENT_ID=AQ4eIiXQx...
PAYPAL_CLIENT_SECRET=EHkjhKJH...
PAYPAL_WEBHOOK_ID=5ML55555X...

# Environment (sandbox/live)
PAYPAL_ENVIRONMENT=sandbox # or 'live' for production

# Plan IDs (created in PayPal Developer Console)
NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID=P-8ML555555X555555XMNPXQVY
NEXT_PUBLIC_PAYPAL_ENTERPRISE_PLAN_ID=P-8ML555555X555555XMNPXQVZ
```

### 2. PayPal Plans Creation

```typescript
// PayPal Subscription Plans (create via API or Developer Console)
const paypalPlans = [
  {
    name: "TableXport Pro Monthly",
    description: "Advanced table export features with increased limits",
    type: "INFINITE", // Ongoing subscription
    payment_preferences: {
      auto_bill_outstanding: true,
      setup_fee_failure_action: "CONTINUE",
      payment_failure_threshold: 3
    },
    billing_cycles: [
      {
        frequency: {
          interval_unit: "MONTH",
          interval_count: 1
        },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0, // Infinite
        pricing_scheme: {
          fixed_price: {
            value: "9.99",
            currency_code: "USD"
          }
        }
      }
    ]
  },
  {
    name: "TableXport Enterprise Monthly",
    description: "Unlimited exports with team collaboration features",
    type: "INFINITE",
    billing_cycles: [
      {
        frequency: {
          interval_unit: "MONTH",
          interval_count: 1
        },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: {
          fixed_price: {
            value: "29.99",
            currency_code: "USD"
          }
        }
      }
    ]
  }
]
```

## Implementation Components

### 1. PayPal SDK Setup

```typescript
// src/lib/paypal/client.ts
import { loadScript } from "@paypal/paypal-js"
// src/lib/paypal/server.ts
import fetch from "node-fetch"

export const getPayPal = async () => {
  return await loadScript({
    "client-id": process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
    vault: true,
    intent: "subscription"
  })
}

class PayPalAPI {
  private clientId: string
  private clientSecret: string
  private baseUrl: string
  private accessToken?: string

  constructor() {
    this.clientId = process.env.PAYPAL_CLIENT_ID!
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET!
    this.baseUrl =
      process.env.PAYPAL_ENVIRONMENT === "live"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com"
  }

  async getAccessToken() {
    if (this.accessToken) return this.accessToken

    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString(
      "base64"
    )

    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    })

    const data = await response.json()
    this.accessToken = data.access_token

    return this.accessToken
  }

  async createSubscription(planId: string, userEmail: string, userId: string) {
    const accessToken = await this.getAccessToken()

    const subscription = {
      plan_id: planId,
      subscriber: {
        email_address: userEmail
      },
      application_context: {
        brand_name: "TableXport",
        user_action: "SUBSCRIBE_NOW",
        return_url: `${process.env.NEXTAUTH_URL}/dashboard?success=true`,
        cancel_url: `${process.env.NEXTAUTH_URL}/pricing?cancelled=true`
      },
      custom_id: userId // Store user ID for webhook processing
    }

    const response = await fetch(`${this.baseUrl}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(subscription)
    })

    return await response.json()
  }

  async getSubscription(subscriptionId: string) {
    const accessToken = await this.getAccessToken()

    const response = await fetch(
      `${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    )

    return await response.json()
  }

  async cancelSubscription(subscriptionId: string, reason: string) {
    const accessToken = await this.getAccessToken()

    const response = await fetch(
      `${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reason })
      }
    )

    return response.status === 204
  }
}

export const paypalApi = new PayPalAPI()
```

### 2. Subscription Creation API

```typescript
// pages/api/paypal/create-subscription.ts
import { paypalApi } from "@/lib/paypal/server"
import { subscriptionService } from "@/lib/supabase/subscription-service"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" })
  }

  try {
    const { planId, userId, userEmail } = req.body

    // Validate plan ID
    const validPlans = [
      process.env.NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID,
      process.env.NEXT_PUBLIC_PAYPAL_ENTERPRISE_PLAN_ID
    ]

    if (!validPlans.includes(planId)) {
      return res.status(400).json({ message: "Invalid plan ID" })
    }

    // Create PayPal subscription
    const subscription = await paypalApi.createSubscription(
      planId,
      userEmail,
      userId
    )

    if (subscription.status === "APPROVAL_PENDING") {
      // Return approval URL for user to complete subscription
      const approvalUrl = subscription.links.find(
        (link) => link.rel === "approve"
      )?.href

      return res.status(200).json({
        subscriptionId: subscription.id,
        approvalUrl
      })
    } else {
      throw new Error("Failed to create subscription")
    }
  } catch (error) {
    console.error("PayPal subscription creation error:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
}
```

### 3. PayPal Webhooks Handler

```typescript
// pages/api/paypal/webhooks.ts
import crypto from "crypto"
import { paypalApi } from "@/lib/paypal/server"
import { subscriptionService } from "@/lib/supabase/subscription-service"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" })
  }

  try {
    // Verify webhook signature
    const webhookId = process.env.PAYPAL_WEBHOOK_ID!
    const headers = req.headers
    const body = JSON.stringify(req.body)

    const isValid = await verifyPayPalWebhook(webhookId, headers, body)
    if (!isValid) {
      return res.status(401).json({ message: "Invalid webhook signature" })
    }

    const event = req.body

    switch (event.event_type) {
      case "BILLING.SUBSCRIPTION.ACTIVATED":
        await handleSubscriptionActivated(event)
        break

      case "BILLING.SUBSCRIPTION.CANCELLED":
        await handleSubscriptionCancelled(event)
        break

      case "BILLING.SUBSCRIPTION.EXPIRED":
        await handleSubscriptionExpired(event)
        break

      case "PAYMENT.SALE.COMPLETED":
        await handlePaymentCompleted(event)
        break

      case "PAYMENT.SALE.DENIED":
        await handlePaymentFailed(event)
        break

      default:
        console.log(`Unhandled PayPal webhook: ${event.event_type}`)
    }

    res.status(200).json({ message: "Webhook processed" })
  } catch (error) {
    console.error("PayPal webhook error:", error)
    res.status(500).json({ message: "Webhook processing failed" })
  }
}

async function handleSubscriptionActivated(event: any) {
  const subscription = event.resource
  const userId = subscription.custom_id

  // Determine plan type from plan_id
  let planType: SubscriptionPlan = "free"
  if (subscription.plan_id === process.env.NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID) {
    planType = "pro"
  } else if (
    subscription.plan_id === process.env.NEXT_PUBLIC_PAYPAL_ENTERPRISE_PLAN_ID
  ) {
    planType = "enterprise"
  }

  await subscriptionService.updateSubscription(userId, planType, {
    customerId: subscription.subscriber.email_address,
    subscriptionId: subscription.id,
    periodStart: subscription.start_time,
    periodEnd: subscription.billing_info.next_billing_time
  })
}

async function handlePaymentCompleted(event: any) {
  const payment = event.resource
  const subscriptionId = payment.billing_agreement_id

  // Record payment in database
  await supabase.from("payments").insert({
    subscription_id: subscriptionId,
    amount: parseFloat(payment.amount.total),
    currency: payment.amount.currency,
    paypal_payment_id: payment.id,
    status: "succeeded",
    metadata: {
      transaction_fee: payment.transaction_fee,
      payment_mode: payment.payment_mode
    }
  })
}
```

### 4. Frontend Integration

```typescript
// components/PayPalSubscriptionButton.tsx
import { useEffect, useState } from 'react';
import { getPayPal } from '@/lib/paypal/client';

interface PayPalButtonProps {
  planId: string;
  userId: string;
  onSuccess: (subscriptionId: string) => void;
  onError: (error: any) => void;
}

export const PayPalSubscriptionButton: React.FC<PayPalButtonProps> = ({
  planId,
  userId,
  onSuccess,
  onError
}) => {
  const [paypal, setPaypal] = useState<any>(null);

  useEffect(() => {
    const loadPayPal = async () => {
      const paypalSdk = await getPayPal();
      setPaypal(paypalSdk);
    };
    loadPayPal();
  }, []);

  useEffect(() => {
    if (paypal) {
      const renderButton = () => {
        paypal.Buttons({
          style: {
            shape: 'rect',
            color: 'blue',
            layout: 'vertical',
            label: 'subscribe'
          },
          createSubscription: async (data: any, actions: any) => {
            return actions.subscription.create({
              plan_id: planId,
              custom_id: userId,
              application_context: {
                brand_name: 'TableXport',
                user_action: 'SUBSCRIBE_NOW'
              }
            });
          },
          onApprove: async (data: any, actions: any) => {
            try {
              const details = await actions.subscription.get();
              onSuccess(details.id);
            } catch (error) {
              onError(error);
            }
          },
          onError: (err: any) => {
            onError(err);
          }
        }).render('#paypal-button-container');
      };

      renderButton();
    }
  }, [paypal, planId, userId, onSuccess, onError]);

  return <div id="paypal-button-container" />;
};
```

## Обновление схемы БД для PayPal

<function_calls>
<invoke name="search_replace">
<parameter name="file_path">supabase-schema.sql
</code_block_to_apply_changes_from>
</edit_instructions>

Assistant:<rewritten_file>

````
# PayPal Integration Plan for TableXport

## Overview
Integration of PayPal subscription payments with the Supabase system to handle:
- Subscription management (Pro/Enterprise plans)
- PayPal webhooks and payment processing
- Trial periods and plan changes
- Billing management through PayPal

## PayPal Setup

### 1. PayPal Developer Console Setup
```bash
# PayPal Environment Variables
NEXT_PUBLIC_PAYPAL_CLIENT_ID=AQ4eIiXQx...
PAYPAL_CLIENT_SECRET=EHkjhKJH...
PAYPAL_WEBHOOK_ID=5ML55555X...

# Environment (sandbox/live)
PAYPAL_ENVIRONMENT=sandbox # or 'live' for production

# Plan IDs (created in PayPal Developer Console)
NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID=P-8ML555555X555555XMNPXQVY
NEXT_PUBLIC_PAYPAL_ENTERPRISE_PLAN_ID=P-8ML555555X555555XMNPXQVZ
````

### 2. PayPal Plans Creation

```typescript
// PayPal Subscription Plans (create via API or Developer Console)
const paypalPlans = [
  {
    name: "TableXport Pro Monthly",
    description: "Advanced table export features with increased limits",
    type: "INFINITE", // Ongoing subscription
    payment_preferences: {
      auto_bill_outstanding: true,
      setup_fee_failure_action: "CONTINUE",
      payment_failure_threshold: 3
    },
    billing_cycles: [
      {
        frequency: {
          interval_unit: "MONTH",
          interval_count: 1
        },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0, // Infinite
        pricing_scheme: {
          fixed_price: {
            value: "9.99",
            currency_code: "USD"
          }
        }
      }
    ]
  },
  {
    name: "TableXport Enterprise Monthly",
    description: "Unlimited exports with team collaboration features",
    type: "INFINITE",
    billing_cycles: [
      {
        frequency: {
          interval_unit: "MONTH",
          interval_count: 1
        },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: {
          fixed_price: {
            value: "29.99",
            currency_code: "USD"
          }
        }
      }
    ]
  }
]
```

## Implementation Components

### 1. PayPal SDK Setup

```typescript
// src/lib/paypal/client.ts
import { loadScript } from "@paypal/paypal-js"
// src/lib/paypal/server.ts
import fetch from "node-fetch"

export const getPayPal = async () => {
  return await loadScript({
    "client-id": process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
    vault: true,
    intent: "subscription"
  })
}

class PayPalAPI {
  private clientId: string
  private clientSecret: string
  private baseUrl: string
  private accessToken?: string

  constructor() {
    this.clientId = process.env.PAYPAL_CLIENT_ID!
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET!
    this.baseUrl =
      process.env.PAYPAL_ENVIRONMENT === "live"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com"
  }

  async getAccessToken() {
    if (this.accessToken) return this.accessToken

    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString(
      "base64"
    )

    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    })

    const data = await response.json()
    this.accessToken = data.access_token

    return this.accessToken
  }

  async createSubscription(planId: string, userEmail: string, userId: string) {
    const accessToken = await this.getAccessToken()

    const subscription = {
      plan_id: planId,
      subscriber: {
        email_address: userEmail
      },
      application_context: {
        brand_name: "TableXport",
        user_action: "SUBSCRIBE_NOW",
        return_url: `${process.env.NEXTAUTH_URL}/dashboard?success=true`,
        cancel_url: `${process.env.NEXTAUTH_URL}/pricing?cancelled=true`
      },
      custom_id: userId // Store user ID for webhook processing
    }

    const response = await fetch(`${this.baseUrl}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(subscription)
    })

    return await response.json()
  }

  async getSubscription(subscriptionId: string) {
    const accessToken = await this.getAccessToken()

    const response = await fetch(
      `${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    )

    return await response.json()
  }

  async cancelSubscription(subscriptionId: string, reason: string) {
    const accessToken = await this.getAccessToken()

    const response = await fetch(
      `${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reason })
      }
    )

    return response.status === 204
  }
}

export const paypalApi = new PayPalAPI()
```

### 2. Subscription Creation API

```typescript
// pages/api/paypal/create-subscription.ts
import { paypalApi } from "@/lib/paypal/server"
import { subscriptionService } from "@/lib/supabase/subscription-service"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" })
  }

  try {
    const { planId, userId, userEmail } = req.body

    // Validate plan ID
    const validPlans = [
      process.env.NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID,
      process.env.NEXT_PUBLIC_PAYPAL_ENTERPRISE_PLAN_ID
    ]

    if (!validPlans.includes(planId)) {
      return res.status(400).json({ message: "Invalid plan ID" })
    }

    // Create PayPal subscription
    const subscription = await paypalApi.createSubscription(
      planId,
      userEmail,
      userId
    )

    if (subscription.status === "APPROVAL_PENDING") {
      // Return approval URL for user to complete subscription
      const approvalUrl = subscription.links.find(
        (link) => link.rel === "approve"
      )?.href

      return res.status(200).json({
        subscriptionId: subscription.id,
        approvalUrl
      })
    } else {
      throw new Error("Failed to create subscription")
    }
  } catch (error) {
    console.error("PayPal subscription creation error:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
}
```

### 3. PayPal Webhooks Handler

```typescript
// pages/api/paypal/webhooks.ts
import crypto from "crypto"
import { paypalApi } from "@/lib/paypal/server"
import { subscriptionService } from "@/lib/supabase/subscription-service"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" })
  }

  try {
    // Verify webhook signature
    const webhookId = process.env.PAYPAL_WEBHOOK_ID!
    const headers = req.headers
    const body = JSON.stringify(req.body)

    const isValid = await verifyPayPalWebhook(webhookId, headers, body)
    if (!isValid) {
      return res.status(401).json({ message: "Invalid webhook signature" })
    }

    const event = req.body

    switch (event.event_type) {
      case "BILLING.SUBSCRIPTION.ACTIVATED":
        await handleSubscriptionActivated(event)
        break

      case "BILLING.SUBSCRIPTION.CANCELLED":
        await handleSubscriptionCancelled(event)
        break

      case "BILLING.SUBSCRIPTION.EXPIRED":
        await handleSubscriptionExpired(event)
        break

      case "PAYMENT.SALE.COMPLETED":
        await handlePaymentCompleted(event)
        break

      case "PAYMENT.SALE.DENIED":
        await handlePaymentFailed(event)
        break

      default:
        console.log(`Unhandled PayPal webhook: ${event.event_type}`)
    }

    res.status(200).json({ message: "Webhook processed" })
  } catch (error) {
    console.error("PayPal webhook error:", error)
    res.status(500).json({ message: "Webhook processing failed" })
  }
}

async function handleSubscriptionActivated(event: any) {
  const subscription = event.resource
  const userId = subscription.custom_id

  // Determine plan type from plan_id
  let planType: SubscriptionPlan = "free"
  if (subscription.plan_id === process.env.NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID) {
    planType = "pro"
  } else if (
    subscription.plan_id === process.env.NEXT_PUBLIC_PAYPAL_ENTERPRISE_PLAN_ID
  ) {
    planType = "enterprise"
  }

  await subscriptionService.updateSubscription(userId, planType, {
    customerId: subscription.subscriber.email_address,
    subscriptionId: subscription.id,
    periodStart: subscription.start_time,
    periodEnd: subscription.billing_info.next_billing_time
  })
}

async function handlePaymentCompleted(event: any) {
  const payment = event.resource
  const subscriptionId = payment.billing_agreement_id

  // Record payment in database
  await supabase.from("payments").insert({
    subscription_id: subscriptionId,
    amount: parseFloat(payment.amount.total),
    currency: payment.amount.currency,
    paypal_payment_id: payment.id,
    status: "succeeded",
    metadata: {
      transaction_fee: payment.transaction_fee,
      payment_mode: payment.payment_mode
    }
  })
}
```

### 4. Frontend Integration

```typescript
// components/PayPalSubscriptionButton.tsx
import { useEffect, useState } from 'react';
import { getPayPal } from '@/lib/paypal/client';

interface PayPalButtonProps {
  planId: string;
  userId: string;
  onSuccess: (subscriptionId: string) => void;
  onError: (error: any) => void;
}

export const PayPalSubscriptionButton: React.FC<PayPalButtonProps> = ({
  planId,
  userId,
  onSuccess,
  onError
}) => {
  const [paypal, setPaypal] = useState<any>(null);

  useEffect(() => {
    const loadPayPal = async () => {
      const paypalSdk = await getPayPal();
      setPaypal(paypalSdk);
    };
    loadPayPal();
  }, []);

  useEffect(() => {
    if (paypal) {
      const renderButton = () => {
        paypal.Buttons({
          style: {
            shape: 'rect',
            color: 'blue',
            layout: 'vertical',
            label: 'subscribe'
          },
          createSubscription: async (data: any, actions: any) => {
            return actions.subscription.create({
              plan_id: planId,
              custom_id: userId,
              application_context: {
                brand_name: 'TableXport',
                user_action: 'SUBSCRIBE_NOW'
              }
            });
          },
          onApprove: async (data: any, actions: any) => {
            try {
              const details = await actions.subscription.get();
              onSuccess(details.id);
            } catch (error) {
              onError(error);
            }
          },
          onError: (err: any) => {
            onError(err);
          }
        }).render('#paypal-button-container');
      };

      renderButton();
    }
  }, [paypal, planId, userId, onSuccess, onError]);

  return <div id="paypal-button-container" />;
};
```

## Обновление схемы БД для PayPal

<function_calls>
<invoke name="search_replace">
<parameter name="file_path">supabase-schema.sql
</code_block_to_apply_changes_from>
</edit_instructions>

Assistant:<rewritten_file>

````
# PayPal Integration Plan for TableXport

## Overview
Integration of PayPal subscription payments with the Supabase system to handle:
- Subscription management (Pro/Enterprise plans)
- PayPal webhooks and payment processing
- Trial periods and plan changes
- Billing management through PayPal

## PayPal Setup

### 1. PayPal Developer Console Setup
```bash
# PayPal Environment Variables
NEXT_PUBLIC_PAYPAL_CLIENT_ID=AQ4eIiXQx...
PAYPAL_CLIENT_SECRET=EHkjhKJH...
PAYPAL_WEBHOOK_ID=5ML55555X...

# Environment (sandbox/live)
PAYPAL_ENVIRONMENT=sandbox # or 'live' for production

# Plan IDs (created in PayPal Developer Console)
NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID=P-8ML555555X555555XMNPXQVY
NEXT_PUBLIC_PAYPAL_ENTERPRISE_PLAN_ID=P-8ML555555X555555XMNPXQVZ
````

### 2. PayPal Plans Creation

```typescript
// PayPal Subscription Plans (create via API or Developer Console)
const paypalPlans = [
  {
    name: "TableXport Pro Monthly",
    description: "Advanced table export features with increased limits",
    type: "INFINITE", // Ongoing subscription
    payment_preferences: {
      auto_bill_outstanding: true,
      setup_fee_failure_action: "CONTINUE",
      payment_failure_threshold: 3
    },
    billing_cycles: [
      {
        frequency: {
          interval_unit: "MONTH",
          interval_count: 1
        },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0, // Infinite
        pricing_scheme: {
          fixed_price: {
            value: "9.99",
            currency_code: "USD"
          }
        }
      }
    ]
  },
  {
    name: "TableXport Enterprise Monthly",
    description: "Unlimited exports with team collaboration features",
    type: "INFINITE",
    billing_cycles: [
      {
        frequency: {
          interval_unit: "MONTH",
          interval_count: 1
        },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: {
          fixed_price: {
            value: "29.99",
            currency_code: "USD"
          }
        }
      }
    ]
  }
]
```

## Implementation Components

### 1. PayPal SDK Setup

```typescript
// src/lib/paypal/client.ts
import { loadScript } from "@paypal/paypal-js"
// src/lib/paypal/server.ts
import fetch from "node-fetch"

export const getPayPal = async () => {
  return await loadScript({
    "client-id": process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
    vault: true,
    intent: "subscription"
  })
}

class PayPalAPI {
  private clientId: string
  private clientSecret: string
  private baseUrl: string
  private accessToken?: string

  constructor() {
    this.clientId = process.env.PAYPAL_CLIENT_ID!
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET!
    this.baseUrl =
      process.env.PAYPAL_ENVIRONMENT === "live"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com"
  }

  async getAccessToken() {
    if (this.accessToken) return this.accessToken

    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString(
      "base64"
    )

    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    })

    const data = await response.json()
    this.accessToken = data.access_token

    return this.accessToken
  }

  async createSubscription(planId: string, userEmail: string, userId: string) {
    const accessToken = await this.getAccessToken()

    const subscription = {
      plan_id: planId,
      subscriber: {
        email_address: userEmail
      },
      application_context: {
        brand_name: "TableXport",
        user_action: "SUBSCRIBE_NOW",
        return_url: `${process.env.NEXTAUTH_URL}/dashboard?success=true`,
        cancel_url: `${process.env.NEXTAUTH_URL}/pricing?cancelled=true`
      },
      custom_id: userId // Store user ID for webhook processing
    }

    const response = await fetch(`${this.baseUrl}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(subscription)
    })

    return await response.json()
  }

  async getSubscription(subscriptionId: string) {
    const accessToken = await this.getAccessToken()

    const response = await fetch(
      `${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    )

    return await response.json()
  }

  async cancelSubscription(subscriptionId: string, reason: string) {
    const accessToken = await this.getAccessToken()

    const response = await fetch(
      `${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reason })
      }
    )

    return response.status === 204
  }
}

export const paypalApi = new PayPalAPI()
```

### 2. Subscription Creation API

```typescript
// pages/api/paypal/create-subscription.ts
import { paypalApi } from "@/lib/paypal/server"
import { subscriptionService } from "@/lib/supabase/subscription-service"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" })
  }

  try {
    const { planId, userId, userEmail } = req.body

    // Validate plan ID
    const validPlans = [
      process.env.NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID,
      process.env.NEXT_PUBLIC_PAYPAL_ENTERPRISE_PLAN_ID
    ]

    if (!validPlans.includes(planId)) {
      return res.status(400).json({ message: "Invalid plan ID" })
    }

    // Create PayPal subscription
    const subscription = await paypalApi.createSubscription(
      planId,
      userEmail,
      userId
    )

    if (subscription.status === "APPROVAL_PENDING") {
      // Return approval URL for user to complete subscription
      const approvalUrl = subscription.links.find(
        (link) => link.rel === "approve"
      )?.href

      return res.status(200).json({
        subscriptionId: subscription.id,
        approvalUrl
      })
    } else {
      throw new Error("Failed to create subscription")
    }
  } catch (error) {
    console.error("PayPal subscription creation error:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
}
```

### 3. PayPal Webhooks Handler

```typescript
// pages/api/paypal/webhooks.ts
import crypto from "crypto"
import { paypalApi } from "@/lib/paypal/server"
import { subscriptionService } from "@/lib/supabase/subscription-service"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" })
  }

  try {
    // Verify webhook signature
    const webhookId = process.env.PAYPAL_WEBHOOK_ID!
    const headers = req.headers
    const body = JSON.stringify(req.body)

    const isValid = await verifyPayPalWebhook(webhookId, headers, body)
    if (!isValid) {
      return res.status(401).json({ message: "Invalid webhook signature" })
    }

    const event = req.body

    switch (event.event_type) {
      case "BILLING.SUBSCRIPTION.ACTIVATED":
        await handleSubscriptionActivated(event)
        break

      case "BILLING.SUBSCRIPTION.CANCELLED":
        await handleSubscriptionCancelled(event)
        break

      case "BILLING.SUBSCRIPTION.EXPIRED":
        await handleSubscriptionExpired(event)
        break

      case "PAYMENT.SALE.COMPLETED":
        await handlePaymentCompleted(event)
        break

      case "PAYMENT.SALE.DENIED":
        await handlePaymentFailed(event)
        break

      default:
        console.log(`Unhandled PayPal webhook: ${event.event_type}`)
    }

    res.status(200).json({ message: "Webhook processed" })
  } catch (error) {
    console.error("PayPal webhook error:", error)
    res.status(500).json({ message: "Webhook processing failed" })
  }
}

async function handleSubscriptionActivated(event: any) {
  const subscription = event.resource
  const userId = subscription.custom_id

  // Determine plan type from plan_id
  let planType: SubscriptionPlan = "free"
  if (subscription.plan_id === process.env.NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID) {
    planType = "pro"
  } else if (
    subscription.plan_id === process.env.NEXT_PUBLIC_PAYPAL_ENTERPRISE_PLAN_ID
  ) {
    planType = "enterprise"
  }

  await subscriptionService.updateSubscription(userId, planType, {
    customerId: subscription.subscriber.email_address,
    subscriptionId: subscription.id,
    periodStart: subscription.start_time,
    periodEnd: subscription.billing_info.next_billing_time
  })
}

async function handlePaymentCompleted(event: any) {
  const payment = event.resource
  const subscriptionId = payment.billing_agreement_id

  // Record payment in database
  await supabase.from("payments").insert({
    subscription_id: subscriptionId,
    amount: parseFloat(payment.amount.total),
    currency: payment.amount.currency,
    paypal_payment_id: payment.id,
    status: "succeeded",
    metadata: {
      transaction_fee: payment.transaction_fee,
      payment_mode: payment.payment_mode
    }
  })
}
```

### 4. Frontend Integration

```typescript
// components/PayPalSubscriptionButton.tsx
import { useEffect, useState } from 'react';
import { getPayPal } from '@/lib/paypal/client';

interface PayPalButtonProps {
  planId: string;
  userId: string;
  onSuccess: (subscriptionId: string) => void;
  onError: (error: any) => void;
}

export const PayPalSubscriptionButton: React.FC<PayPalButtonProps> = ({
  planId,
  userId,
  onSuccess,
  onError
}) => {
  const [paypal, setPaypal] = useState<any>(null);

  useEffect(() => {
    const loadPayPal = async () => {
      const paypalSdk = await getPayPal();
      setPaypal(paypalSdk);
    };
    loadPayPal();
  }, []);

  useEffect(() => {
    if (paypal) {
      const renderButton = () => {
        paypal.Buttons({
          style: {
            shape: 'rect',
            color: 'blue',
            layout: 'vertical',
            label: 'subscribe'
          },
          createSubscription: async (data: any, actions: any) => {
            return actions.subscription.create({
              plan_id: planId,
              custom_id: userId,
              application_context: {
                brand_name: 'TableXport',
                user_action: 'SUBSCRIBE_NOW'
              }
            });
          },
          onApprove: async (data: any, actions: any) => {
            try {
              const details = await actions.subscription.get();
              onSuccess(details.id);
            } catch (error) {
              onError(error);
            }
          },
          onError: (err: any) => {
            onError(err);
          }
        }).render('#paypal-button-container');
      };

      renderButton();
    }
  }, [paypal, planId, userId, onSuccess, onError]);

  return <div id="paypal-button-container" />;
};
```

## Обновление схемы БД для PayPal

<function_calls>
<invoke name="search_replace">
<parameter name="file_path">supabase-schema.sql
</code_block_to_apply_changes_from>
</edit_instructions>

Assistant:<rewritten_file>

````
# PayPal Integration Plan for TableXport

## Overview
Integration of PayPal subscription payments with the Supabase system to handle:
- Subscription management (Pro/Enterprise plans)
- PayPal webhooks and payment processing
- Trial periods and plan changes
- Billing management through PayPal

## PayPal Setup

### 1. PayPal Developer Console Setup
```bash
# PayPal Environment Variables
NEXT_PUBLIC_PAYPAL_CLIENT_ID=AQ4eIiXQx...
PAYPAL_CLIENT_SECRET=EHkjhKJH...
PAYPAL_WEBHOOK_ID=5ML55555X...

# Environment (sandbox/live)
PAYPAL_ENVIRONMENT=sandbox # or 'live' for production

# Plan IDs (created in PayPal Developer Console)
NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID=P-8ML555555X555555XMNPXQVY
NEXT_PUBLIC_PAYPAL_ENTERPRISE_PLAN_ID=P-8ML555555X555555XMNPXQVZ
````

### 2. PayPal Plans Creation

```typescript
// PayPal Subscription Plans (create via API or Developer Console)
const paypalPlans = [
  {
    name: "TableXport Pro Monthly",
    description: "Advanced table export features with increased limits",
    type: "INFINITE", // Ongoing subscription
    payment_preferences: {
      auto_bill_outstanding: true,
      setup_fee_failure_action: "CONTINUE",
      payment_failure_threshold: 3
    },
    billing_cycles: [
      {
        frequency: {
          interval_unit: "MONTH",
          interval_count: 1
        },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0, // Infinite
        pricing_scheme: {
          fixed_price: {
            value: "9.99",
            currency_code: "USD"
          }
        }
      }
    ]
  },
  {
    name: "TableXport Enterprise Monthly",
    description: "Unlimited exports with team collaboration features",
    type: "INFINITE",
    billing_cycles: [
      {
        frequency: {
          interval_unit: "MONTH",
          interval_count: 1
        },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: {
          fixed_price: {
            value: "29.99",
            currency_code: "USD"
          }
        }
      }
    ]
  }
]
```

## Implementation Components

### 1. PayPal SDK Setup

```typescript
// src/lib/paypal/client.ts
import { loadScript } from "@paypal/paypal-js"
// src/lib/paypal/server.ts
import fetch from "node-fetch"

export const getPayPal = async () => {
  return await loadScript({
    "client-id": process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
    vault: true,
    intent: "subscription"
  })
}

class PayPalAPI {
  private clientId: string
  private clientSecret: string
  private baseUrl: string
  private accessToken?: string

  constructor() {
    this.clientId = process.env.PAYPAL_CLIENT_ID!
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET!
    this.baseUrl =
      process.env.PAYPAL_ENVIRONMENT === "live"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com"
  }

  async getAccessToken() {
    if (this.accessToken) return this.accessToken

    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString(
      "base64"
    )

    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    })

    const data = await response.json()
    this.accessToken = data.access_token

    return this.accessToken
  }

  async createSubscription(planId: string, userEmail: string, userId: string) {
    const accessToken = await this.getAccessToken()

    const subscription = {
      plan_id: planId,
      subscriber: {
        email_address: userEmail
      },
      application_context: {
        brand_name: "TableXport",
        user_action: "SUBSCRIBE_NOW",
        return_url: `${process.env.NEXTAUTH_URL}/dashboard?success=true`,
        cancel_url: `${process.env.NEXTAUTH_URL}/pricing?cancelled=true`
      },
      custom_id: userId // Store user ID for webhook processing
    }

    const response = await fetch(`${this.baseUrl}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(subscription)
    })

    return await response.json()
  }

  async getSubscription(subscriptionId: string) {
    const accessToken = await this.getAccessToken()

    const response = await fetch(
      `${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    )

    return await response.json()
  }

  async cancelSubscription(subscriptionId: string, reason: string) {
    const accessToken = await this.getAccessToken()

    const response = await fetch(
      `${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reason })
      }
    )

    return response.status === 204
  }
}

export const paypalApi = new PayPalAPI()
```

### 2. Subscription Creation API

```typescript
// pages/api/paypal/create-subscription.ts
import { paypalApi } from "@/lib/paypal/server"
import { subscriptionService } from "@/lib/supabase/subscription-service"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" })
  }

  try {
    const { planId, userId, userEmail } = req.body

    // Validate plan ID
    const validPlans = [
      process.env.NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID,
      process.env.NEXT_PUBLIC_PAYPAL_ENTERPRISE_PLAN_ID
    ]

    if (!validPlans.includes(planId)) {
      return res.status(400).json({ message: "Invalid plan ID" })
    }

    // Create PayPal subscription
    const subscription = await paypalApi.createSubscription(
      planId,
      userEmail,
      userId
    )

    if (subscription.status === "APPROVAL_PENDING") {
      // Return approval URL for user to complete subscription
      const approvalUrl = subscription.links.find(
        (link) => link.rel === "approve"
      )?.href

      return res.status(200).json({
        subscriptionId: subscription.id,
        approvalUrl
      })
    } else {
      throw new Error("Failed to create subscription")
    }
  } catch (error) {
    console.error("PayPal subscription creation error:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
}
```

### 3. PayPal Webhooks Handler

```typescript
// pages/api/paypal/webhooks.ts
import crypto from "crypto"
import { paypalApi } from "@/lib/paypal/server"
import { subscriptionService } from "@/lib/supabase/subscription-service"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" })
  }

  try {
    // Verify webhook signature
    const webhookId = process.env.PAYPAL_WEBHOOK_ID!
    const headers = req.headers
    const body = JSON.stringify(req.body)

    const isValid = await verifyPayPalWebhook(webhookId, headers, body)
    if (!isValid) {
      return res.status(401).json({ message: "Invalid webhook signature" })
    }

    const event = req.body

    switch (event.event_type) {
      case "BILLING.SUBSCRIPTION.ACTIVATED":
        await handleSubscriptionActivated(event)
        break

      case "BILLING.SUBSCRIPTION.CANCELLED":
        await handleSubscriptionCancelled(event)
        break

      case "BILLING.SUBSCRIPTION.EXPIRED":
        await handleSubscriptionExpired(event)
        break

      case "PAYMENT.SALE.COMPLETED":
        await handlePaymentCompleted(event)
        break

      case "PAYMENT.SALE.DENIED":
        await handlePaymentFailed(event)
        break

      default:
        console.log(`Unhandled PayPal webhook: ${event.event_type}`)
    }

    res.status(200).json({ message: "Webhook processed" })
  } catch (error) {
    console.error("PayPal webhook error:", error)
    res.status(500).json({ message: "Webhook processing failed" })
  }
}

async function handleSubscriptionActivated(event: any) {
  const subscription = event.resource
  const userId = subscription.custom_id

  // Determine plan type from plan_id
  let planType: SubscriptionPlan = "free"
  if (subscription.plan_id === process.env.NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID) {
    planType = "pro"
  } else if (
    subscription.plan_id === process.env.NEXT_PUBLIC_PAYPAL_ENTERPRISE_PLAN_ID
  ) {
    planType = "enterprise"
  }

  await subscriptionService.updateSubscription(userId, planType, {
    customerId: subscription.subscriber.email_address,
    subscriptionId: subscription.id,
    periodStart: subscription.start_time,
    periodEnd: subscription.billing_info.next_billing_time
  })
}

async function handlePaymentCompleted(event: any) {
  const payment = event.resource
  const subscriptionId = payment.billing_agreement_id

  // Record payment in database
  await supabase.from("payments").insert({
    subscription_id: subscriptionId,
    amount: parseFloat(payment.amount.total),
    currency: payment.amount.currency,
    paypal_payment_id: payment.id,
    status: "succeeded",
    metadata: {
      transaction_fee: payment.transaction_fee,
      payment_mode: payment.payment_mode
    }
  })
}
```

### 4. Frontend Integration

```typescript
// components/PayPalSubscriptionButton.tsx
import { useEffect, useState } from 'react';
import { getPayPal } from '@/lib/paypal/client';

interface PayPalButtonProps {
  planId: string;
  userId: string;
  onSuccess: (subscriptionId: string) => void;
  onError: (error: any) => void;
}

export const PayPalSubscriptionButton: React.FC<PayPalButtonProps> = ({
  planId,
  userId,
  onSuccess,
  onError
}) => {
  const [paypal, setPaypal] = useState<any>(null);

  useEffect(() => {
    const loadPayPal = async () => {
      const paypalSdk = await getPayPal();
      setPaypal(paypalSdk);
    };
    loadPayPal();
  }, []);

  useEffect(() => {
    if (paypal) {
      const renderButton = () => {
        paypal.Buttons({
          style: {
            shape: 'rect',
            color: 'blue',
            layout: 'vertical',
            label: 'subscribe'
          },
          createSubscription: async (data: any, actions: any) => {
            return actions.subscription.create({
              plan_id: planId,
              custom_id: userId,
              application_context: {
                brand_name: 'TableXport',
                user_action: 'SUBSCRIBE_NOW'
              }
            });
          },
          onApprove: async (data: any, actions: any) => {
            try {
              const details = await actions.subscription.get();
              onSuccess(details.id);
            } catch (error) {
              onError(error);
            }
          },
          onError: (err: any) => {
            onError(err);
          }
        }).render('#paypal-button-container');
      };

      renderButton();
    }
  }, [paypal, planId, userId, onSuccess, onError]);

  return <div id="paypal-button-container" />;
};
```

## Обновление схемы БД для PayPal

<function_calls>
<invoke name="search_replace">
<parameter name="file_path">supabase-schema.sql
</code_block_to_apply_changes_from>
</edit_instructions>

Assistant:<rewritten_file>

````
# PayPal Integration Plan for TableXport

## Overview
Integration of PayPal subscription payments with the Supabase system to handle:
- Subscription management (Pro/Enterprise plans)
- PayPal webhooks and payment processing
- Trial periods and plan changes
- Billing management through PayPal

## PayPal Setup

### 1. PayPal Developer Console Setup
```bash
# PayPal Environment Variables
NEXT_PUBLIC_PAYPAL_CLIENT_ID=AQ4eIiXQx...
PAYPAL_CLIENT_SECRET=EHkjhKJH...
PAYPAL_WEBHOOK_ID=5ML55555X...

# Environment (sandbox/live)
PAYPAL_ENVIRONMENT=sandbox # or 'live' for production

# Plan IDs (created in PayPal Developer Console)
NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID=P-8ML555555X555555XMNPXQVY
NEXT_PUBLIC_PAYPAL_ENTERPRISE_PLAN_ID=P-8ML555555X555555XMNPXQVZ
````

### 2. PayPal Plans Creation

```typescript
// PayPal Subscription Plans (create via API or Developer Console)
const paypalPlans = [
  {
    name: "TableXport Pro Monthly",
    description: "Advanced table export features with increased limits",
    type: "INFINITE", // Ongoing subscription
    payment_preferences: {
      auto_bill_outstanding: true,
      setup_fee_failure_action: "CONTINUE",
      payment_failure_threshold: 3
    },
    billing_cycles: [
      {
        frequency: {
          interval_unit: "MONTH",
          interval_count: 1
        },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0, // Infinite
        pricing_scheme: {
          fixed_price: {
            value: "9.99",
            currency_code: "USD"
          }
        }
      }
    ]
  },
  {
    name: "TableXport Enterprise Monthly",
    description: "Unlimited exports with team collaboration features",
    type: "INFINITE",
    billing_cycles: [
      {
        frequency: {
          interval_unit: "MONTH",
          interval_count: 1
        },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: {
          fixed_price: {
            value: "29.99",
            currency_code: "USD"
          }
        }
      }
    ]
  }
]
```

## Implementation Components

### 1. PayPal SDK Setup

```typescript
// src/lib/paypal/client.ts
import { loadScript } from "@paypal/paypal-js"
// src/lib/paypal/server.ts
import fetch from "node-fetch"

export const getPayPal = async () => {
  return await loadScript({
    "client-id": process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
    vault: true,
    intent: "subscription"
  })
}

class PayPalAPI {
  private clientId: string
  private clientSecret: string
  private baseUrl: string
  private accessToken?: string

  constructor() {
    this.clientId = process.env.PAYPAL_CLIENT_ID!
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET!
    this.baseUrl =
      process.env.PAYPAL_ENVIRONMENT === "live"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com"
  }

  async getAccessToken() {
    if (this.accessToken) return this.accessToken

    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString(
      "base64"
    )

    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    })

    const data = await response.json()
    this.accessToken = data.access_token

    return this.accessToken
  }

  async createSubscription(planId: string, userEmail: string, userId: string) {
    const accessToken = await this.getAccessToken()

    const subscription = {
      plan_id: planId,
      subscriber: {
        email_address: userEmail
      },
      application_context: {
        brand_name: "TableXport",
        user_action: "SUBSCRIBE_NOW",
        return_url: `${process.env.NEXTAUTH_URL}/dashboard?success=true`,
        cancel_url: `${process.env.NEXTAUTH_URL}/pricing?cancelled=true`
      },
      custom_id: userId // Store user ID for webhook processing
    }

    const response = await fetch(`${this.baseUrl}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(subscription)
    })

    return await response.json()
  }

  async getSubscription(subscriptionId: string) {
    const accessToken = await this.getAccessToken()

    const response = await fetch(
      `${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    )

    return await response.json()
  }

  async cancelSubscription(subscriptionId: string, reason: string) {
    const accessToken = await this.getAccessToken()

    const response = await fetch(
      `${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reason })
      }
    )

    return response.status === 204
  }
}

export const paypalApi = new PayPalAPI()
```

### 2. Subscription Creation API

```typescript
// pages/api/paypal/create-subscription.ts
import { paypalApi } from "@/lib/paypal/server"
import { subscriptionService } from "@/lib/supabase/subscription-service"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" })
  }

  try {
    const { planId, userId, userEmail } = req.body

    // Validate plan ID
    const validPlans = [
      process.env.NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID,
      process.env.NEXT_PUBLIC_PAYPAL_ENTERPRISE_PLAN_ID
    ]

    if (!validPlans.includes(planId)) {
      return res.status(400).json({ message: "Invalid plan ID" })
    }

    // Create PayPal subscription
    const subscription = await paypalApi.createSubscription(
      planId,
      userEmail,
      userId
    )

    if (subscription.status === "APPROVAL_PENDING") {
      // Return approval URL for user to complete subscription
      const approvalUrl = subscription.links.find(
        (link) => link.rel === "approve"
      )?.href

      return res.status(200).json({
        subscriptionId: subscription.id,
        approvalUrl
      })
    } else {
      throw new Error("Failed to create subscription")
    }
  } catch (error) {
    console.error("PayPal subscription creation error:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
}
```

### 3. PayPal Webhooks Handler

```typescript
// pages/api/paypal/webhooks.ts
import crypto from "crypto"
import { paypalApi } from "@/lib/paypal/server"
import { subscriptionService } from "@/lib/supabase/subscription-service"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" })
  }

  try {
    // Verify webhook signature
    const webhookId = process.env.PAYPAL_WEBHOOK_ID!
    const headers = req.headers
    const body = JSON.stringify(req.body)

    const isValid = await verifyPayPalWebhook(webhookId, headers, body)
    if (!isValid) {
      return res.status(401).json({ message: "Invalid webhook signature" })
    }

    const event = req.body

    switch (event.event_type) {
      case "BILLING.SUBSCRIPTION.ACTIVATED":
        await handleSubscriptionActivated(event)
        break

      case "BILLING.SUBSCRIPTION.CANCELLED":
        await handleSubscriptionCancelled(event)
        break

      case "BILLING.SUBSCRIPTION.EXPIRED":
        await handleSubscriptionExpired(event)
        break

      case "PAYMENT.SALE.COMPLETED":
        await handlePaymentCompleted(event)
        break

      case "PAYMENT.SALE.DENIED":
        await handlePaymentFailed(event)
        break

      default:
        console.log(`Unhandled PayPal webhook: ${event.event_type}`)
    }

    res.status(200).json({ message: "Webhook processed" })
  } catch (error) {
    console.error("PayPal webhook error:", error)
    res.status(500).json({ message: "Webhook processing failed" })
  }
}

async function handleSubscriptionActivated(event: any) {
  const subscription = event.resource
  const userId = subscription.custom_id

  // Determine plan type from plan_id
  let planType: SubscriptionPlan = "free"
  if (subscription.plan_id === process.env.NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID) {
    planType = "pro"
  } else if (
    subscription.plan_id === process.env.NEXT_PUBLIC_PAYPAL_ENTERPRISE_PLAN_ID
  ) {
    planType = "enterprise"
  }

  await subscriptionService.updateSubscription(userId, planType, {
    customerId: subscription.subscriber.email_address,
    subscriptionId: subscription.id,
    periodStart: subscription.start_time,
    periodEnd: subscription.billing_info.next_billing_time
  })
}

async function handlePaymentCompleted(event: any) {
  const payment = event.resource
  const subscriptionId = payment.billing_agreement_id

  // Record payment in database
  await supabase.from("payments").insert({
    subscription_id: subscriptionId,
    amount: parseFloat(payment.amount.total),
    currency: payment.amount.currency,
    paypal_payment_id: payment.id,
    status: "succeeded",
    metadata: {
      transaction_fee: payment.transaction_fee,
      payment_mode: payment.payment_mode
    }
  })
}
```

### 4. Frontend Integration

```typescript
// components/PayPalSubscriptionButton.tsx
import { useEffect, useState } from 'react';
import { getPayPal } from '@/lib/paypal/client';

interface PayPalButtonProps {
  planId: string;
  userId: string;
  onSuccess: (subscriptionId: string) => void;
  onError: (error: any) => void;
}

export const PayPalSubscriptionButton: React.FC<PayPalButtonProps> = ({
  planId,
  userId,
  onSuccess,
  onError
}) => {
  const [paypal, setPaypal] = useState<any>(null);

  useEffect(() => {
    const loadPayPal = async () => {
      const paypalSdk = await getPayPal();
      setPaypal(paypalSdk);
    };
    loadPayPal();
  }, []);

  useEffect(() => {
    if (paypal) {
      const renderButton = () => {
        paypal.Buttons({
          style: {
            shape: 'rect',
            color: 'blue',
            layout: 'vertical',
            label: 'subscribe'
          },
          createSubscription: async (data: any, actions: any) => {
            return actions.subscription.create({
              plan_id: planId,
              custom_id: userId,
              application_context: {
                brand_name: 'TableXport',
                user_action: 'SUBSCRIBE_NOW'
              }
            });
          },
          onApprove: async (data: any, actions: any) => {
            try {
              const details = await actions.subscription.get();
              onSuccess(details.id);
            } catch (error) {
              onError(error);
            }
          },
          onError: (err: any) => {
            onError(err);
          }
        }).render('#paypal-button-container');
      };

      renderButton();
    }
  }, [paypal, planId, userId, onSuccess, onError]);

  return <div id="paypal-button-container" />;
};
```

## Обновление схемы БД для PayPal

<function_calls>
<invoke name="search_replace">
<parameter name="file_path">supabase-schema.sql
</code_block_to_apply_changes_from>
</edit_instructions>

Assistant:<rewritten_file>

````
# PayPal Integration Plan for TableXport

## Overview
Integration of PayPal subscription payments with the Supabase system to handle:
- Subscription management (Pro/Enterprise plans)
- PayPal webhooks and payment processing
- Trial periods and plan changes
- Billing management through PayPal

## PayPal Setup

### 1. PayPal Developer Console Setup
```bash
# PayPal Environment Variables
NEXT_PUBLIC_PAYPAL_CLIENT_ID=AQ4eIiXQx...
PAYPAL_CLIENT_SECRET=EHkjhKJH...
PAYPAL_WEBHOOK_ID=5ML55555X...

# Environment (sandbox/live)
PAYPAL_ENVIRONMENT=sandbox # or 'live' for production

# Plan IDs (created in PayPal Developer Console)
NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID=P-8ML555555X555555XMNPXQVY
NEXT_PUBLIC_PAYPAL_ENTERPRISE_PLAN_ID=P-8ML555555X555555XMNPXQVZ
````

### 2. PayPal Plans Creation

```typescript
// PayPal Subscription Plans (create via API or Developer Console)
const paypalPlans = [
  {
    name: "TableXport Pro Monthly",
    description: "Advanced table export features with increased limits",
    type: "INFINITE", // Ongoing subscription
    payment_preferences: {
      auto_bill_outstanding: true,
      setup_fee_failure_action: "CONTINUE",
      payment_failure_threshold: 3
    },
    billing_cycles: [
      {
        frequency: {
          interval_unit: "MONTH",
          interval_count: 1
        },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0, // Infinite
        pricing_scheme: {
          fixed_price: {
            value: "9.99",
            currency_code: "USD"
          }
        }
      }
    ]
  },
  {
    name: "TableXport Enterprise Monthly",
    description: "Unlimited exports with team collaboration features",
    type: "INFINITE",
    billing_cycles: [
      {
        frequency: {
          interval_unit: "MONTH",
          interval_count: 1
        },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: {
          fixed_price: {
            value: "29.99",
            currency_code: "USD"
          }
        }
      }
    ]
  }
]
```

## Implementation Components

### 1. PayPal SDK Setup

```typescript
// src/lib/paypal/client.ts
import { loadScript } from "@paypal/paypal-js"
// src/lib/paypal/server.ts
import fetch from "node-fetch"

export const getPayPal = async () => {
  return await loadScript({
    "client-id": process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
    vault: true,
    intent: "subscription"
  })
}

class PayPalAPI {
  private clientId: string
  private clientSecret: string
  private baseUrl: string
  private accessToken?: string

  constructor() {
    this.clientId = process.env.PAYPAL_CLIENT_ID!
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET!
    this.baseUrl =
      process.env.PAYPAL_ENVIRONMENT === "live"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com"
  }

  async getAccessToken() {
    if (this.accessToken) return this.accessToken

    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString(
      "base64"
    )

    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    })

    const data = await response.json()
    this.accessToken = data.access_token

    return this.accessToken
  }

  async createSubscription(planId: string, userEmail: string, userId: string) {
    const accessToken = await this.getAccessToken()

    const subscription = {
      plan_id: planId,
      subscriber: {
        email_address: userEmail
      },
      application_context: {
        brand_name: "TableXport",
        user_action: "SUBSCRIBE_NOW",
        return_url: `${process.env.NEXTAUTH_URL}/dashboard?success=true`,
        cancel_url: `${process.env.NEXTAUTH_URL}/pricing?cancelled=true`
      },
      custom_id: userId // Store user ID for webhook processing
    }

    const response = await fetch(`${this.baseUrl}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(subscription)
    })

    return await response.json()
  }

  async getSubscription(subscriptionId: string) {
    const accessToken = await this.getAccessToken()

    const response = await fetch(
      `${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    )

    return await response.json()
  }

  async cancelSubscription(subscriptionId: string, reason: string) {
    const accessToken = await this.getAccessToken()

    const response = await fetch(
      `${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reason })
      }
    )

    return response.status === 204
  }
}

export const paypalApi = new PayPalAPI()
```

### 2. Subscription Creation API

```typescript
// pages/api/paypal/create-subscription.ts
import { paypalApi } from "@/lib/paypal/server"
import { subscriptionService } from "@/lib/supabase/subscription-service"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" })
  }

  try {
    const { planId, userId, userEmail } = req.body

    // Validate plan ID
    const validPlans = [
      process.env.NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID,
      process.env.NEXT_PUBLIC_PAYPAL_ENTERPRISE_PLAN_ID
    ]

    if (!validPlans.includes(planId)) {
      return res.status(400).json({ message: "Invalid plan ID" })
    }

    // Create PayPal subscription
    const subscription = await paypalApi.createSubscription(
      planId,
      userEmail,
      userId
    )

    if (subscription.status === "APPROVAL_PENDING") {
      // Return approval URL for user to complete subscription
      const approvalUrl = subscription.links.find(
        (link) => link.rel === "approve"
      )?.href

      return res.status(200).json({
        subscriptionId: subscription.id,
        approvalUrl
      })
    } else {
      throw new Error("Failed to create subscription")
    }
  } catch (error) {
    console.error("PayPal subscription creation error:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
}
```

### 3. PayPal Webhooks Handler

```typescript
// pages/api/paypal/webhooks.ts
import crypto from "crypto"
import { paypalApi } from "@/lib/paypal/server"
import { subscriptionService } from "@/lib/supabase/subscription-service"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" })
  }

  try {
    // Verify webhook signature
    const webhookId = process.env.PAYPAL_WEBHOOK_ID!
    const headers = req.headers
    const body = JSON.stringify(req.body)

    const isValid = await verifyPayPalWebhook(webhookId, headers, body)
    if (!isValid) {
      return res.status(401).json({ message: "Invalid webhook signature" })
    }

    const event = req.body

    switch (event.event_type) {
      case "BILLING.SUBSCRIPTION.ACTIVATED":
        await handleSubscriptionActivated(event)
        break

      case "BILLING.SUBSCRIPTION.CANCELLED":
        await handleSubscriptionCancelled(event)
        break

      case "BILLING.SUBSCRIPTION.EXPIRED":
        await handleSubscriptionExpired(event)
        break

      case "PAYMENT.SALE.COMPLETED":
        await handlePaymentCompleted(event)
        break

      case "PAYMENT.SALE.DENIED":
        await handlePaymentFailed(event)
        break

      default:
        console.log(`Unhandled PayPal webhook: ${event.event_type}`)
    }

    res.status(200).json({ message: "Webhook processed" })
  } catch (error) {
    console.error("PayPal webhook error:", error)
    res.status(500).json({ message: "Webhook processing failed" })
  }
}

async function handleSubscriptionActivated(event: any) {
  const subscription = event.resource
  const userId = subscription.custom_id

  // Determine plan type from plan_id
  let planType: SubscriptionPlan = "free"
  if (subscription.plan_id === process.env.NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID) {
    planType = "pro"
  } else if (
    subscription.plan_id === process.env.NEXT_PUBLIC_PAYPAL_ENTERPRISE_PLAN_ID
  ) {
    planType = "enterprise"
  }

  await subscriptionService.updateSubscription(userId, planType, {
    customerId: subscription.subscriber.email_address,
    subscriptionId: subscription.id,
    periodStart: subscription.start_time,
    periodEnd: subscription.billing_info.next_billing_time
  })
}

async function handlePaymentCompleted(event: any) {
  const payment = event.resource
  const subscriptionId = payment.billing_agreement_id

  // Record payment in database
  await supabase.from("payments").insert({
    subscription_id: subscriptionId,
    amount: parseFloat(payment.amount.total),
    currency: payment.amount.currency,
    paypal_payment_id: payment.id,
    status: "succeeded",
    metadata: {
      transaction_fee: payment.transaction_fee,
      payment_mode: payment.payment_mode
    }
  })
}
```

### 4. Frontend Integration

```typescript
// components/PayPalSubscriptionButton.tsx
import { useEffect, useState } from 'react';
import { getPayPal } from '@/lib/paypal/client';

interface PayPalButtonProps {
  planId: string;
  userId: string;
  onSuccess: (subscriptionId: string) => void;
  onError: (error: any) => void;
}

export const PayPalSubscriptionButton: React.FC<PayPalButtonProps> = ({
  planId,
  userId,
  onSuccess,
  onError
}) => {
  const [paypal, setPaypal] = useState<any>(null);

  useEffect(() => {
    const loadPayPal = async () => {
      const paypalSdk = await getPayPal();
      setPaypal(paypalSdk);
    };
    loadPayPal();
  }, []);

  useEffect(() => {
    if (paypal) {
      const renderButton = () => {
        paypal.Buttons({
          style: {
            shape: 'rect',
            color: 'blue',
            layout: 'vertical',
            label: 'subscribe'
          },
          createSubscription: async (data: any, actions: any) => {
            return actions.subscription.create({
              plan_id: planId,
              custom_id: userId,
              application_context: {
                brand_name: 'TableXport',
                user_action: 'SUBSCRIBE_NOW'
              }
            });
          },
          onApprove: async (data: any, actions: any) => {
            try {
              const details = await actions.subscription.get();
              onSuccess(details.id);
            } catch (error) {
              onError(error);
            }
          },
          onError: (err: any) => {
            onError(err);
          }
        }).render('#paypal-button-container');
      };

      renderButton();
    }
  }, [paypal, planId, userId, onSuccess, onError]);

  return <div id="paypal-button-container" />;
};
```

## Обновление схемы БД для PayPal

<function_calls>
<invoke name="search_replace">
<parameter name="file_path">supabase-schema.sql
</code_block_to_apply_changes_from>
</edit_instructions>

Assistant:<rewritten_file>

````
# PayPal Integration Plan for TableXport

## Overview
Integration of PayPal subscription payments with the Supabase system to handle:
- Subscription management (Pro/Enterprise plans)
- PayPal webhooks and payment processing
- Trial periods and plan changes
- Billing management through PayPal

## PayPal Setup

### 1. PayPal Developer Console Setup
```bash
# PayPal Environment Variables
NEXT_PUBLIC_PAYPAL_CLIENT_ID=AQ4eIiXQx...
PAYPAL_CLIENT_SECRET=EHkjhKJH...
PAYPAL_WEBHOOK_ID=5ML55555X...

# Environment (sandbox/live)
PAYPAL_ENVIRONMENT=sandbox # or 'live' for production

# Plan IDs (created in PayPal Developer Console)
NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID=P-8ML555555X555555XMNPXQVY
NEXT_PUBLIC_PAYPAL_ENTERPRISE_PLAN_ID=P-8ML555555X555555XMNPXQVZ
````

### 2. PayPal Plans Creation

```typescript
// PayPal Subscription Plans (create via API or Developer Console)
const paypalPlans = [
  {
    name: "TableXport Pro Monthly",
    description: "Advanced table export features with increased limits",
    type: "INFINITE", // Ongoing subscription
    payment_preferences: {
      auto_bill_outstanding: true,
      setup_fee_failure_action: "CONTINUE",
      payment_failure_threshold: 3
    },
    billing_cycles: [
      {
        frequency: {
          interval_unit: "MONTH",
          interval_count: 1
        },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0, // Infinite
        pricing_scheme: {
          fixed_price: {
            value: "9.99",
            currency_code: "USD"
          }
        }
      }
    ]
  },
  {
    name: "TableXport Enterprise Monthly",
    description: "Unlimited exports with team collaboration features",
    type: "INFINITE",
    billing_cycles: [
      {
        frequency: {
          interval_unit: "MONTH",
          interval_count: 1
        },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: {
          fixed_price: {
            value: "29.99",
            currency_code: "USD"
          }
        }
      }
    ]
  }
]
```

## Implementation Components

### 1. PayPal SDK Setup

```typescript
// src/lib/paypal/client.ts
import { loadScript } from "@paypal/paypal-js"
// src/lib/paypal/server.ts
import fetch from "node-fetch"

export const getPayPal = async () => {
  return await loadScript({
    "client-id": process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
    vault: true,
    intent: "subscription"
  })
}

class PayPalAPI {
  private clientId: string
  private clientSecret: string
  private baseUrl: string
  private accessToken?: string

  constructor() {
    this.clientId = process.env.PAYPAL_CLIENT_ID!
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET!
    this.baseUrl =
      process.env.PAYPAL_ENVIRONMENT === "live"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com"
  }

  async getAccessToken() {
    if (this.accessToken) return this.accessToken

    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString(
      "base64"
    )

    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    })

    const data = await response.json()
    this.accessToken = data.access_token

    return this.accessToken
  }

  async createSubscription(planId: string, userEmail: string, userId: string) {
    const accessToken = await this.getAccessToken()

    const subscription = {
      plan_id: planId,
      subscriber: {
        email_address: userEmail
      },
      application_context: {
        brand_name: "TableXport",
        user_action: "SUBSCRIBE_NOW",
        return_url: `${process.env.NEXTAUTH_URL}/dashboard?success=true`,
        cancel_url: `${process.env.NEXTAUTH_URL}/pricing?cancelled=true`
      },
      custom_id: userId // Store user ID for webhook processing
    }

    const response = await fetch(`${this.baseUrl}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(subscription)
    })

    return await response.json()
  }

  async getSubscription(subscriptionId: string) {
    const accessToken = await this.getAccessToken()

    const response = await fetch(
      `${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    )

    return await response.json()
  }

  async cancelSubscription(subscriptionId: string, reason: string) {
    const accessToken = await this.getAccessToken()

    const response = await fetch(
      `${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reason })
      }
    )

    return response.status === 204
  }
}

export const paypalApi = new PayPalAPI()
```

### 2. Subscription Creation API

```typescript
// pages/api/paypal/create-subscription.ts
import { paypalApi } from "@/lib/paypal/server"
import { subscriptionService } from "@/lib/supabase/subscription-service"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" })
  }

  try {
    const { planId, userId, userEmail } = req.body

    // Validate plan ID
    const validPlans = [
      process.env.NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID,
      process.env.NEXT_PUBLIC_PAYPAL_ENTERPRISE_PLAN_ID
    ]

    if (!validPlans.includes(planId)) {
      return res.status(400).json({ message: "Invalid plan ID" })
    }

    // Create PayPal subscription
    const subscription = await paypalApi.createSubscription(
      planId,
      userEmail,
      userId
    )

    if (subscription.status === "APPROVAL_PENDING") {
      // Return approval URL for user to complete subscription
      const approvalUrl = subscription.links.find(
        (link) => link.rel === "approve"
      )?.href

      return res.status(200).json({
        subscriptionId: subscription.id,
        approvalUrl
      })
    } else {
      throw new Error("Failed to create subscription")
    }
  } catch (error) {
    console.error("PayPal subscription creation error:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
}
```

### 3. PayPal Webhooks Handler

```typescript
// pages/api/paypal/webhooks.ts
import crypto from "crypto"
import { paypalApi } from "@/lib/paypal/server"
import { subscriptionService } from "@/lib/supabase/subscription-service"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" })
  }

  try {
    // Verify webhook signature
    const webhookId = process.env.PAYPAL_WEBHOOK_ID!
    const headers = req.headers
    const body = JSON.stringify(req.body)

    const isValid = await verifyPayPalWebhook(webhookId, headers, body)
    if (!isValid) {
      return res.status(401).json({ message: "Invalid webhook signature" })
    }

    const event = req.body

    switch (event.event_type) {
      case "BILLING.SUBSCRIPTION.ACTIVATED":
        await handleSubscriptionActivated(event)
        break

      case "BILLING.SUBSCRIPTION.CANCELLED":
        await handleSubscriptionCancelled(event)
        break

      case "BILLING.SUBSCRIPTION.EXPIRED":
        await handleSubscriptionExpired(event)
        break

      case "PAYMENT.SALE.COMPLETED":
        await handlePaymentCompleted(event)
        break

      case "PAYMENT.SALE.DENIED":
        await handlePaymentFailed(event)
        break

      default:
        console.log(`Unhandled PayPal webhook: ${event.event_type}`)
    }

    res.status(200).json({ message: "Webhook processed" })
  } catch (error) {
    console.error("PayPal webhook error:", error)
    res.status(500).json({ message: "Webhook processing failed" })
  }
}

async function handleSubscriptionActivated(event: any) {
  const subscription = event.resource
  const userId = subscription.custom_id

  // Determine plan type from plan_id
  let planType: SubscriptionPlan = "free"
  if (subscription.plan_id === process.env.NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID) {
    planType = "pro"
  } else if (
    subscription.plan_id === process.env.NEXT_PUBLIC_PAYPAL_ENTERPRISE_PLAN_ID
  ) {
    planType = "enterprise"
  }

  await subscriptionService.updateSubscription(userId, planType, {
    customerId: subscription.subscriber.email_address,
    subscriptionId: subscription.id,
    periodStart: subscription.start_time,
    periodEnd: subscription.billing_info.next_billing_time
  })
}

async function handlePaymentCompleted(event: any) {
  const payment = event.resource
  const subscriptionId = payment.billing_agreement_id

  // Record payment in database
  await supabase.from("payments").insert({
    subscription_id: subscriptionId,
    amount: parseFloat(payment.amount.total),
    currency: payment.amount.currency,
    paypal_payment_id: payment.id,
    status: "succeeded",
    metadata: {
      transaction_fee: payment.transaction_fee,
      payment_mode: payment.payment_mode
    }
  })
}
```

### 4. Frontend Integration

```typescript
// components/PayPalSubscriptionButton.tsx
import { useEffect, useState } from 'react';
import { getPayPal } from '@/lib/paypal/client';

interface PayPalButtonProps {
  planId: string;
  userId: string;
  onSuccess: (subscriptionId: string) => void;
  onError: (error: any) => void;
}

export const PayPalSubscriptionButton: React.FC<PayPalButtonProps> = ({
  planId,
  userId,
  onSuccess,
  onError
}) => {
  const [paypal, setPaypal] = useState<any>(null);

  useEffect(() => {
    const loadPayPal = async () => {
      const paypalSdk = await getPayPal();
      setPaypal(paypalSdk);
    };
    loadPayPal();
  }, []);

  useEffect(() => {
    if (paypal) {
      const renderButton = () => {
        paypal.Buttons({
          style: {
            shape: 'rect',
            color: 'blue',
            layout: 'vertical',
            label: 'subscribe'
          },
          createSubscription: async (data: any, actions: any) => {
            return actions.subscription.create({
              plan_id: planId,
              custom_id: userId,
              application_context: {
                brand_name: 'TableXport',
                user_action: 'SUBSCRIBE_NOW'
              }
            });
          },
          onApprove: async (data: any, actions: any) => {
            try {
              const details = await actions.subscription.get();
              onSuccess(details.id);
            } catch (error) {
              onError(error);
            }
          },
          onError: (err: any) => {
            onError(err);
          }
        }).render('#paypal-button-container');
      };

      renderButton();
    }
  }, [paypal, planId, userId, onSuccess, onError]);

  return <div id="paypal-button-container" />;
};
```

## Обновление схемы БД для PayPal

<function_calls>
<invoke name="search_replace">
<parameter name="file_path">supabase-schema.sql
</code_block_to_apply_changes_from>
</edit_instructions>

Assistant:<rewritten_file>

````
# PayPal Integration Plan for TableXport

## Overview
Integration of PayPal subscription payments with the Supabase system to handle:
- Subscription management (Pro/Enterprise plans)
- PayPal webhooks and payment processing
- Trial periods and plan changes
- Billing management through PayPal

## PayPal Setup

### 1. PayPal Developer Console Setup
```bash
# PayPal Environment Variables
NEXT_PUBLIC_PAYPAL_CLIENT_ID=AQ4eIiXQx...
PAYPAL_CLIENT_SECRET=EHkjhKJH...
PAYPAL_WEBHOOK_ID=5ML55555X...

# Environment (sandbox/live)
PAYPAL_ENVIRONMENT=sandbox # or 'live' for production

# Plan IDs (created in PayPal Developer Console)
NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID=P-8ML555555X555555XMNPXQVY
NEXT_PUBLIC_PAYPAL_ENTERPRISE_PLAN_ID=P-8ML555555X555555XMNPXQVZ
````

### 2. PayPal Plans Creation

```typescript
// PayPal Subscription Plans (create via API or Developer Console)
const paypalPlans = [
  {
    name: "TableXport Pro Monthly",
    description: "Advanced table export features with increased limits",
    type: "INFINITE", // Ongoing subscription
    payment_preferences: {
      auto_bill_outstanding: true,
      setup_fee_failure_action: "CONTINUE",
      payment_failure_threshold: 3
    },
    billing_cycles: [
      {
        frequency: {
          interval_unit: "MONTH",
          interval_count: 1
        },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0, // Infinite
        pricing_scheme: {
          fixed_price: {
            value: "9.99",
            currency_code: "USD"
          }
        }
      }
    ]
  },
  {
    name: "TableXport Enterprise Monthly",
    description: "Unlimited exports with team collaboration features",
    type: "INFINITE",
    billing_cycles: [
      {
        frequency: {
          interval_unit: "MONTH",
          interval_count: 1
        },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: {
          fixed_price: {
            value: "29.99",
            currency_code: "USD"
          }
        }
      }
    ]
  }
]
```

## Implementation Components

### 1. PayPal SDK Setup

```typescript
// src/lib/paypal/client.ts
import { loadScript } from "@paypal/paypal-js"
// src/lib/paypal/server.ts
import fetch from "node-fetch"

export const getPayPal = async () => {
  return await loadScript({
    "client-id": process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
    vault: true,
    intent: "subscription"
  })
}

class PayPalAPI {
  private clientId: string
  private clientSecret: string
  private baseUrl: string
  private accessToken?: string

  constructor() {
    this.clientId = process.env.PAYPAL_CLIENT_ID!
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET!
    this.baseUrl =
      process.env.PAYPAL_ENVIRONMENT === "live"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com"
  }

  async getAccessToken() {
    if (this.accessToken) return this.accessToken

    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString(
      "base64"
    )

    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    })

    const data = await response.json()
    this.accessToken = data.access_token

    return this.accessToken
  }

  async createSubscription(planId: string, userEmail: string, userId: string) {
    const accessToken = await this.getAccessToken()

    const subscription = {
      plan_id: planId,
      subscriber: {
        email_address: userEmail
      },
      application_context: {
        brand_name: "TableXport",
        user_action: "SUBSCRIBE_NOW",
        return_url: `${process.env.NEXTAUTH_URL}/dashboard?success=true`,
        cancel_url: `${process.env.NEXTAUTH_URL}/pricing?cancelled=true`
      },
      custom_id: userId // Store user ID for webhook processing
    }

    const response = await fetch(`${this.baseUrl}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(subscription)
    })

    return await response.json()
  }

  async getSubscription(subscriptionId: string) {
    const accessToken = await this.getAccessToken()

    const response = await fetch(
      `${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    )

    return await response.json()
  }

  async cancelSubscription(subscriptionId: string, reason: string) {
    const accessToken = await this.getAccessToken()

    const response = await fetch(
      `${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reason })
      }
    )

    return response.status === 204
  }
}

export const paypalApi = new PayPalAPI()
```

### 2. Subscription Creation API

```typescript
// pages/api/paypal/create-subscription.ts
import { paypalApi } from "@/lib/paypal/server"
import { subscriptionService } from "@/lib/supabase/subscription-service"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" })
  }

  try {
    const { planId, userId, userEmail } = req.body

    // Validate plan ID
    const validPlans = [
      process.env.NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID,
      process.env.NEXT_PUBLIC_PAYPAL_ENTERPRISE_PLAN_ID
    ]

    if (!validPlans.includes(planId)) {
      return res.status(400).json({ message: "Invalid plan ID" })
    }

    // Create PayPal subscription
    const subscription = await paypalApi.createSubscription(
      planId,
      userEmail,
      userId
    )

    if (subscription.status === "APPROVAL_PENDING") {
      // Return approval URL for user to complete subscription
      const approvalUrl = subscription.links.find(
        (link) => link.rel === "approve"
      )?.href

      return res.status(200).json({
        subscriptionId: subscription.id,
        approvalUrl
      })
    } else {
      throw new Error("Failed to create subscription")
    }
  } catch (error) {
    console.error("PayPal subscription creation error:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
}
```

### 3. PayPal Webhooks Handler

```typescript
// pages/api/paypal/webhooks.ts
import crypto from "crypto"
import { paypalApi } from "@/lib/paypal/server"
import { subscriptionService } from "@/lib/supabase/subscription-service"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" })
  }

  try {
    // Verify webhook signature
    const webhookId = process.env.PAYPAL_WEBHOOK_ID!
    const headers = req.headers
    const body = JSON.stringify(req.body)

    const isValid = await verifyPayPalWebhook(webhookId, headers, body)
    if (!isValid) {
      return res.status(401).json({ message: "Invalid webhook signature" })
    }

    const event = req.body

    switch (event.event_type) {
      case "BILLING.SUBSCRIPTION.ACTIVATED":
        await handleSubscriptionActivated(event)
        break

      case "BILLING.SUBSCRIPTION.CANCELLED":
        await handleSubscriptionCancelled(event)
        break

      case "BILLING.SUBSCRIPTION.EXPIRED":
        await handleSubscriptionExpired(event)
        break

      case "PAYMENT.SALE.COMPLETED":
        await handlePaymentCompleted(event)
        break

      case "PAYMENT.SALE.DENIED":
        await handlePaymentFailed(event)
        break

      default:
        console.log(`Unhandled PayPal webhook: ${event.event_type}`)
    }

    res.status(200).json({ message: "Webhook processed" })
  } catch (error) {
    console.error("PayPal webhook error:", error)
    res.status(500).json({ message: "Webhook processing failed" })
  }
}

async function handleSubscriptionActivated(event: any) {
  const subscription = event.resource
  const userId = subscription.custom_id

  // Determine plan type from plan_id
  let planType: SubscriptionPlan = "free"
  if (subscription.plan_id === process.env.NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID) {
    planType = "pro"
  } else if (
    subscription.plan_id === process.env.NEXT_PUBLIC_PAYPAL_ENTERPRISE_PLAN_ID
  ) {
    planType = "enterprise"
  }

  await subscriptionService.updateSubscription(userId, planType, {
    customerId: subscription.subscriber.email_address,
    subscriptionId: subscription.id,
    periodStart: subscription.start_time,
    periodEnd: subscription.billing_info.next_billing_time
  })
}

async function handlePaymentCompleted(event: any) {
  const payment = event.resource
  const subscriptionId = payment.billing_agreement_id

  // Record payment in database
  await supabase.from("payments").insert({
    subscription_id: subscriptionId,
    amount: parseFloat(payment.amount.total),
    currency: payment.amount.currency,
    paypal_payment_id: payment.id,
    status: "succeeded",
    metadata: {
      transaction_fee: payment.transaction_fee,
      payment_mode: payment.payment_mode
    }
  })
}
```

### 4. Frontend Integration

```typescript
// components/PayPalSubscriptionButton.tsx
import { useEffect, useState } from 'react';
import { getPayPal } from '@/lib/paypal/client';

interface PayPalButtonProps {
  planId: string;
  userId: string;
  onSuccess: (subscriptionId: string) => void;
  onError: (error: any) => void;
}

export const PayPalSubscriptionButton: React.FC<PayPalButtonProps> = ({
  planId,
  userId,
  onSuccess,
  onError
}) => {
  const [paypal, setPaypal] = useState<any>(null);

  useEffect(() => {
    const loadPayPal = async () => {
      const paypalSdk = await getPayPal();
      setPaypal(paypalSdk);
    };
    loadPayPal();
  }, []);

  useEffect(() => {
    if (paypal) {
      const renderButton = () => {
        paypal.Buttons({
          style: {
            shape: 'rect',
            color: 'blue',
            layout: 'vertical',
            label: 'subscribe'
          },
          createSubscription: async (data: any, actions: any) => {
            return actions.subscription.create({
              plan_id: planId,
              custom_id: userId,
              application_context: {
                brand_name: 'TableXport',
                user_action: 'SUBSCRIBE_NOW'
              }
            });
          },
          onApprove: async (data: any, actions: any) => {
            try {
              const details = await actions.subscription.get();
              onSuccess(details.id);
            } catch (error) {
              onError(error);
            }
          },
          onError: (err: any) => {
            onError(err);
          }
        }).render('#paypal-button-container');
      };

      renderButton();
    }
  }, [paypal, planId, userId, onSuccess, onError]);

  return <div id="paypal-button-container" />;
};
```

## Обновление схемы БД для PayPal

<function_calls>
<invoke name="search_replace">
<parameter name="file_path">supabase-schema.sql
</code_block_to_apply_changes_from>
</edit_instructions>

Assistant:<rewritten_file>

````
# PayPal Integration Plan for TableXport

## Overview
Integration of PayPal subscription payments with the Supabase system to handle:
- Subscription management (Pro/Enterprise plans)
- PayPal webhooks and payment processing
- Trial periods and plan changes
- Billing management through PayPal

## PayPal Setup

### 1. PayPal Developer Console Setup
```bash
# PayPal Environment Variables
NEXT_PUBLIC_PAYPAL_CLIENT_ID=AQ4eIiXQx...
PAYPAL_CLIENT_SECRET=EHkjhKJH...
PAYPAL_WEBHOOK_ID=5ML55555X...

# Environment (sandbox/live)
PAYPAL_ENVIRONMENT=sandbox # or 'live' for production

# Plan IDs (created in PayPal Developer Console)
NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID=P-8ML555555X555555XMNPXQVY
NEXT_PUBLIC_PAYPAL_ENTERPRISE_PLAN_ID=P-8ML555555X555555XMNPXQVZ
````

### 2. PayPal Plans Creation

```typescript
// PayPal Subscription Plans (create via API or Developer Console)
const paypalPlans = [
  {
    name: "TableXport Pro Monthly",
    description: "Advanced table export features with increased limits",
    type: "INFINITE", // Ongoing subscription
    payment_preferences: {
      auto_bill_outstanding: true,
      setup_fee_failure_action: "CONTINUE",
      payment_failure_threshold: 3
    },
    billing_cycles: [
      {
        frequency: {
          interval_unit: "MONTH",
          interval_count: 1
        },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0, // Infinite
        pricing_scheme: {
          fixed_price: {
            value: "9.99",
            currency_code: "USD"
          }
        }
      }
    ]
  },
  {
    name: "TableXport Enterprise Monthly",
    description: "Unlimited exports with team collaboration features",
    type: "INFINITE",
    billing_cycles: [
      {
        frequency: {
          interval_unit: "MONTH",
          interval_count: 1
        },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: {
          fixed_price: {
            value: "29.99",
            currency_code: "USD"
          }
        }
      }
    ]
  }
]
```

## Implementation Components

### 1. PayPal SDK Setup

```typescript
// src/lib/paypal/client.ts
import { loadScript } from "@paypal/paypal-js"
// src/lib/paypal/server.ts
import fetch from "node-fetch"

export const getPayPal = async () => {
  return await loadScript({
    "client-id": process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
    vault: true,
    intent: "subscription"
  })
}

class PayPalAPI {
  private clientId: string
  private clientSecret: string
  private baseUrl: string
  private accessToken?: string

  constructor() {
    this.clientId = process.env.PAYPAL_CLIENT_ID!
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET!
    this.baseUrl =
      process.env.PAYPAL_ENVIRONMENT === "live"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com"
  }

  async getAccessToken() {
    if (this.accessToken) return this.accessToken

    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString(
      "base64"
    )

    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    })

    const data = await response.json()
    this.accessToken = data.access_token

    return this.accessToken
  }

  async createSubscription(planId: string, userEmail: string, userId: string) {
    const accessToken = await this.getAccessToken()

    const subscription = {
      plan_id: planId,
      subscriber: {
        email_address: userEmail
      },
      application_context: {
        brand_name: "TableXport",
        user_action: "SUBSCRIBE_NOW",
        return_url: `${process.env.NEXTAUTH_URL}/dashboard?success=true`,
        cancel_url: `${process.env.NEXTAUTH_URL}/pricing?cancelled=true`
      },
      custom_id: userId // Store user ID for webhook processing
    }

    const response = await fetch(`${this.baseUrl}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(subscription)
    })

    return await response.json()
  }

  async getSubscription(subscriptionId: string) {
    const accessToken = await this.getAccessToken()

    const response = await fetch(
      `${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    )

    return await response.json()
  }

  async cancelSubscription(subscriptionId: string, reason: string) {
    const accessToken = await this.getAccessToken()

    const response = await fetch(
      `${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reason })
      }
    )

    return response.status === 204
  }
}

export const paypalApi = new PayPalAPI()
```

### 2. Subscription Creation API

```typescript
// pages/api/paypal/create-subscription.ts
import { paypalApi } from "@/lib/paypal/server"
import { subscriptionService } from "@/lib/supabase/subscription-service"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" })
  }

  try {
    const { planId, userId, userEmail } = req.body

    // Validate plan ID
    const validPlans = [
      process.env.NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID,
      process.env.NEXT_PUBLIC_PAYPAL_ENTERPRISE_PLAN_ID
    ]

    if (!validPlans.includes(planId)) {
      return res.status(400).json({ message: "Invalid plan ID" })
    }

    // Create PayPal subscription
    const subscription = await paypalApi.createSubscription(
      planId,
      userEmail,
      userId
    )

    if (subscription.status === "APPROVAL_PENDING") {
      // Return approval URL for user to complete subscription
      const approvalUrl = subscription.links.find(
        (link) => link.rel === "approve"
      )?.href

      return res.status(200).json({
        subscriptionId: subscription.id,
        approvalUrl
      })
    } else {
      throw new Error("Failed to create subscription")
    }
  } catch (error) {
    console.error("PayPal subscription creation error:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
}
```

### 3. PayPal Webhooks Handler

```typescript
// pages/api/paypal/webhooks.ts
import crypto from "crypto"
import { paypalApi } from "@/lib/paypal/server"
import { subscriptionService } from "@/lib/supabase/subscription-service"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" })
  }

  try {
    // Verify webhook signature
    const webhookId = process.env.PAYPAL_WEBHOOK_ID!
    const headers = req.headers
    const body = JSON.stringify(req.body)

    const isValid = await verifyPayPalWebhook(webhookId, headers, body)
    if (!isValid) {
      return res.status(401).json({ message: "Invalid webhook signature" })
    }

    const event = req.body

    switch (event.event_type) {
      case "BILLING.SUBSCRIPTION.ACTIVATED":
        await handleSubscriptionActivated(event)
        break

      case "BILLING.SUBSCRIPTION.CANCELLED":
        await handleSubscriptionCancelled(event)
        break

      case "BILLING.SUBSCRIPTION.EXPIRED":
        await handleSubscriptionExpired(event)
        break

      case "PAYMENT.SALE.COMPLETED":
        await handlePaymentCompleted(event)
        break

      case "PAYMENT.SALE.DENIED":
        await handlePaymentFailed(event)
        break

      default:
        console.log(`Unhandled PayPal webhook: ${event.event_type}`)
    }

    res.status(200).json({ message: "Webhook processed" })
  } catch (error) {
    console.error("PayPal webhook error:", error)
    res.status(500).json({ message: "Webhook processing failed" })
  }
}

async function handleSubscriptionActivated(event: any) {
  const subscription = event.resource
  const userId = subscription.custom_id

  // Determine plan type from plan_id
  let planType: SubscriptionPlan = "free"
  if (subscription.plan_id === process.env.NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID) {
    planType = "pro"
  } else if (
    subscription.plan_id === process.env.NEXT_PUBLIC_PAYPAL_ENTERPRISE_PLAN_ID
  ) {
    planType = "enterprise"
  }

  await subscriptionService.updateSubscription(userId, planType, {
    customerId: subscription.subscriber.email_address,
    subscriptionId: subscription.id,
    periodStart: subscription.start_time,
    periodEnd: subscription.billing_info.next_billing_time
  })
}

async function handlePaymentCompleted(event: any) {
  const payment = event.resource
  const subscriptionId = payment.billing_agreement_id

  // Record payment in database
  await supabase.from("payments").insert({
    subscription_id: subscriptionId,
    amount: parseFloat(payment.amount.total),
    currency: payment.amount.currency,
    paypal_payment_id: payment.id,
    status: "succeeded",
    metadata: {
      transaction_fee: payment.transaction_fee,
      payment_mode: payment.payment_mode
    }
  })
}
```

### 4. Frontend Integration

```typescript
// components/PayPalSubscriptionButton.tsx
import { useEffect, useState } from 'react';
import { getPayPal } from '@/lib/paypal/client';

interface PayPalButtonProps {
  planId: string;
  userId: string;
  onSuccess: (subscriptionId: string) => void;
  onError: (error: any) => void;
}

export const PayPalSubscriptionButton: React.FC<PayPalButtonProps> = ({
  planId,
  userId,
  onSuccess,
  onError
}) => {
  const [paypal, setPaypal] = useState<any>(null);

  useEffect(() => {
    const loadPayPal = async () => {
      const paypalSdk = await getPayPal();
      setPaypal(paypalSdk);
    };
    loadPayPal();
  }, []);

  useEffect(() => {
    if (paypal) {
      const renderButton = () => {
        paypal.Buttons({
          style: {
            shape: 'rect',
            color: 'blue',
            layout: 'vertical',
            label: 'subscribe'
          },
          createSubscription: async (data: any, actions: any) => {
            return actions.subscription.create({
              plan_id: planId,
              custom_id: userId,
              application_context: {
                brand_name: 'TableXport',
                user_action: 'SUBSCRIBE_NOW'
              }
            });
          },
          onApprove: async (data: any, actions: any) => {
            try {
              const details = await actions.subscription.get();
              onSuccess(details.id);
            } catch (error) {
              onError(error);
            }
          },
          onError: (err: any) => {
            onError(err);
          }
        }).render('#paypal-button-container');
      };

      renderButton();
    }
  }, [paypal, planId, userId, onSuccess, onError]);

  return <div id="paypal-button-container" />;
};
```

## Обновление схемы БД для PayPal

<function_calls>
<invoke name="search_replace">
<parameter name="file_path">supabase-schema.sql
</code_block_to_apply_changes_from>
</edit_instructions>

Assistant:<rewritten_file>

````
# PayPal Integration Plan for TableXport

## Overview
Integration of PayPal subscription payments with the Supabase system to handle:
- Subscription management (Pro/Enterprise plans)
- PayPal webhooks and payment processing
- Trial periods and plan changes
- Billing management through PayPal

## PayPal Setup

### 1. PayPal Developer Console Setup
```bash
# PayPal Environment Variables
NEXT_PUBLIC_PAYPAL_CLIENT_ID=AQ4eIiXQx...
PAYPAL_CLIENT_SECRET=EHkjhKJH...
PAYPAL_WEBHOOK_ID=5ML55555X...

# Environment (sandbox/live)
PAYPAL_ENVIRONMENT=sandbox # or 'live' for production

# Plan IDs (created in PayPal Developer Console)
NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID=P-8ML555555X555555XMNPXQVY
NEXT_PUBLIC_PAYPAL_ENTERPRISE_PLAN_ID=P-8ML555555X555555XMNPXQVZ
````

### 2. PayPal Plans Creation

```typescript
// PayPal Subscription Plans (create via API or Developer Console)
const paypalPlans = [
  {
    name: "TableXport Pro Monthly",
    description: "Advanced table export features with increased limits",
    type: "INFINITE", // Ongoing subscription
    payment_preferences: {
      auto_bill_outstanding: true,
      setup_fee_failure_action: "CONTINUE",
      payment_failure_threshold: 3
    },
    billing_cycles: [
      {
        frequency: {
          interval_unit: "MONTH",
          interval_count: 1
        },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0, // Infinite
        pricing_scheme: {
          fixed_price: {
            value: "9.99",
            currency_code: "USD"
          }
        }
      }
    ]
  },
  {
    name: "TableXport Enterprise Monthly",
    description: "Unlimited exports with team collaboration features",
    type: "INFINITE",
    billing_cycles: [
      {
        frequency: {
          interval_unit: "MONTH",
          interval_count: 1
        },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: {
          fixed_price: {
            value: "29.99",
            currency_code: "USD"
          }
        }
      }
    ]
  }
]
```

## Implementation Components

### 1. PayPal SDK Setup

```typescript
// src/lib/paypal/client.ts
import { loadScript } from "@paypal/paypal-js"
// src/lib/paypal/server.ts
import fetch from "node-fetch"

export const getPayPal = async () => {
  return await loadScript({
    "client-id": process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
    vault: true,
    intent: "subscription"
  })
}

class PayPalAPI {
  private clientId: string
  private clientSecret: string
  private baseUrl: string
  private accessToken?: string

  constructor() {
    this.clientId = process.env.PAYPAL_CLIENT_ID!
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET!
    this.baseUrl =
      process.env.PAYPAL_ENVIRONMENT === "live"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com"
  }

  async getAccessToken() {
    if (this.accessToken) return this.accessToken

    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString(
      "base64"
    )

    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    })

    const data = await response.json()
    this.accessToken = data.access_token

    return this.accessToken
  }

  async createSubscription(planId: string, userEmail: string, userId: string) {
    const accessToken = await this.getAccessToken()

    const subscription = {
      plan_id: planId,
      subscriber: {
        email_address: userEmail
      },
      application_context: {
        brand_name: "TableXport",
        user_action: "SUBSCRIBE_NOW",
        return_url: `${process.env.NEXTAUTH_URL}/dashboard?success=true`,
        cancel_url: `${process.env.NEXTAUTH_URL}/pricing?cancelled=true`
      },
      custom_id: userId // Store user ID for webhook processing
    }

    const response = await fetch(`${this.baseUrl}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(subscription)
    })

    return await response.json()
  }

  async getSubscription(subscriptionId: string) {
    const accessToken = await this.getAccessToken()

    const response = await fetch(
      `${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    )

    return await response.json()
  }

  async cancelSubscription(subscriptionId: string, reason: string) {
    const accessToken = await this.getAccessToken()

    const response = await fetch(
      `${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reason })
      }
    )

    return response.status === 204
  }
}

export const paypalApi = new PayPalAPI()
```

### 2. Subscription Creation API

```typescript
// pages/api/paypal/create-subscription.ts
import { paypalApi } from "@/lib/paypal/server"
import { subscriptionService } from "@/lib/supabase/subscription-service"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" })
  }

  try {
    const { planId, userId, userEmail } = req.body

    // Validate plan ID
    const validPlans = [
      process.env.NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID,
      process.env.NEXT_PUBLIC_PAYPAL_ENTERPRISE_PLAN_ID
    ]

    if (!validPlans.includes(planId)) {
      return res.status(400).json({ message: "Invalid plan ID" })
    }

    // Create PayPal subscription
    const subscription = await paypalApi.createSubscription(
      planId,
      userEmail,
      userId
    )

    if (subscription.status === "APPROVAL_PENDING") {
      // Return approval URL for user to complete subscription
      const approvalUrl = subscription.links.find(
        (link) => link.rel === "approve"
      )?.href

      return res.status(200).json({
        subscriptionId: subscription.id,
        approvalUrl
      })
    } else {
      throw new Error("Failed to create subscription")
    }
  } catch (error) {
    console.error("PayPal subscription creation error:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
}
```

### 3. PayPal Webhooks Handler

```typescript
// pages/api/paypal/webhooks.ts
import crypto from "crypto"
import { paypalApi } from "@/lib/paypal/server"
import { subscriptionService } from "@/lib/supabase/subscription-service"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" })
  }

  try {
    // Verify webhook signature
    const webhookId = process.env.PAYPAL_WEBHOOK_ID!
    const headers = req.headers
    const body = JSON.stringify(req.body)

    const isValid = await verifyPayPalWebhook(webhookId, headers, body)
    if (!isValid) {
      return res.status(401).json({ message: "Invalid webhook signature" })
    }

    const event = req.body

    switch (event.event_type) {
      case "BILLING.SUBSCRIPTION.ACTIVATED":
        await handleSubscriptionActivated(event)
        break

      case "BILLING.SUBSCRIPTION.CANCELLED":
        await handleSubscriptionCancelled(event)
        break

      case "BILLING.SUBSCRIPTION.EXPIRED":
        await handleSubscriptionExpired(event)
        break

      case "PAYMENT.SALE.COMPLETED":
        await handlePaymentCompleted(event)
        break

      case "PAYMENT.SALE.DENIED":
        await handlePaymentFailed(event)
        break

      default:
        console.log(`Unhandled PayPal webhook: ${event.event_type}`)
    }

    res.status(200).json({ message: "Webhook processed" })
  } catch (error) {
    console.error("PayPal webhook error:", error)
    res.status(500).json({ message: "Webhook processing failed" })
  }
}

async function handleSubscriptionActivated(event: any) {
  const subscription = event.resource
  const userId = subscription.custom_id

  // Determine plan type from plan_id
  let planType: SubscriptionPlan = "free"
  if (subscription.plan_id === process.env.NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID) {
    planType = "pro"
  } else if (
    subscription.plan_id === process.env.NEXT_PUBLIC_PAYPAL_ENTERPRISE_PLAN_ID
  ) {
    planType = "enterprise"
  }

  await subscriptionService.updateSubscription(userId, planType, {
    customerId: subscription.subscriber.email_address,
    subscriptionId: subscription.id,
    periodStart: subscription.start_time,
    periodEnd: subscription.billing_info.next_billing_time
  })
}

async function handlePaymentCompleted(event: any) {
  const payment = event.resource
  const subscriptionId = payment.billing_agreement_id

  // Record payment in database
  await supabase.from("payments").insert({
    subscription_id: subscriptionId,
    amount: parseFloat(payment.amount.total),
    currency: payment.amount.currency,
    paypal_payment_id: payment.id,
    status: "succeeded",
    metadata: {
      transaction_fee: payment.transaction_fee,
      payment_mode: payment.payment_mode
    }
  })
}
```

### 4. Frontend Integration

```typescript
// components/PayPalSubscriptionButton.tsx
import { useEffect, useState } from 'react';
import { getPayPal } from '@/lib/paypal/client';

interface PayPalButtonProps {
  planId: string;
  userId: string;
  onSuccess: (subscriptionId: string) => void;
  onError: (error: any) => void;
}

export const PayPalSubscriptionButton: React.FC<PayPalButtonProps> = ({
  planId,
  userId,
  onSuccess,
  onError
}) => {
  const [paypal, setPaypal] = useState<any>(null);

  useEffect(() => {
    const loadPayPal = async () => {
      const paypalSdk = await getPayPal();
      setPaypal(paypalSdk);
    };
    loadPayPal();
  }, []);

  useEffect(() => {
    if (paypal) {
      const renderButton = () => {
        paypal.Buttons({
          style: {
            shape: 'rect',
            color: 'blue',
            layout: 'vertical',
            label: 'subscribe'
          },
          createSubscription: async (data: any, actions: any) => {
            return actions.subscription.create({
              plan_id: planId,
              custom_id: userId,
              application_context: {
                brand_name: 'TableXport',
                user_action: 'SUBSCRIBE_NOW'
              }
            });
          },
          onApprove: async (data: any, actions: any) => {
            try {
              const details = await actions.subscription.get();
              onSuccess(details.id);
            } catch (error) {
              onError(error);
            }
          },
          onError: (err: any) => {
            onError(err);
          }
        }).render('#paypal-button-container');
      };

      renderButton();
    }
  }, [paypal, planId, userId, onSuccess, onError]);

  return <div id="paypal-button-container" />;
};
```

## Обновление схемы БД для PayPal

<function_calls>
<invoke name="search_replace">
<parameter name="file_path">supabase-schema.sql
</code_block_to_apply_changes_from>
</edit_instructions>

Assistant:<rewritten_file>

````
# PayPal Integration Plan for TableXport

## Overview
Integration of PayPal subscription payments with the Supabase system to handle:
- Subscription management (Pro/Enterprise plans)
- PayPal webhooks and payment processing
- Trial periods and plan changes
- Billing management through PayPal

## PayPal Setup

### 1. PayPal Developer Console Setup
```bash
# PayPal Environment Variables
NEXT_PUBLIC_PAYPAL_CLIENT_ID=AQ4eIiXQx...
PAYPAL_CLIENT_SECRET=EHkjhKJH...
PAYPAL_WEBHOOK_ID=5ML55555X...

# Environment (sandbox/live)
PAYPAL_ENVIRONMENT=sandbox # or 'live' for production

# Plan IDs (created in PayPal Developer Console)
NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID=P-8ML555555X555555XMNPXQVY
NEXT_PUBLIC_PAYPAL_ENTERPRISE_PLAN_ID=P-8ML555555X555555XMNPXQVZ
````

### 2. PayPal Plans Creation

```typescript
// PayPal Subscription Plans (create via API or Developer Console)
const paypalPlans = [
  {
    name: "TableXport Pro Monthly",
    description: "Advanced table export features with increased limits",
    type: "INFINITE", // Ongoing subscription
    payment_preferences: {
      auto_bill_outstanding: true,
      setup_fee_failure_action: "CONTINUE",
      payment_failure_threshold: 3
    },
    billing_cycles: [
      {
        frequency: {
          interval_unit: "MONTH",
          interval_count: 1
        },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0, // Infinite
        pricing_scheme: {
          fixed_price: {
            value: "9.99",
            currency_code: "USD"
          }
        }
      }
    ]
  },
  {
    name: "TableXport Enterprise Monthly",
    description: "Unlimited exports with team collaboration features",
    type: "INFINITE",
    billing_cycles: [
      {
        frequency: {
          interval_unit: "MONTH",
          interval_count: 1
        },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: {
          fixed_price: {
            value: "29.99",
            currency_code: "USD"
          }
        }
      }
    ]
  }
]
```

## Implementation Components

### 1. PayPal SDK Setup

```typescript
// src/lib/paypal/client.ts
import { loadScript } from "@paypal/paypal-js"
// src/lib/paypal/server.ts
import fetch from "node-fetch"

export const getPayPal = async () => {
  return await loadScript({
    "client-id": process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
    vault: true,
    intent: "subscription"
  })
}

class PayPalAPI {
  private clientId: string
  private clientSecret: string
  private baseUrl: string
  private accessToken?: string

  constructor() {
    this.clientId = process.env.PAYPAL_CLIENT_ID!
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET!
    this.baseUrl =
      process.env.PAYPAL_ENVIRONMENT === "live"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com"
  }

  async getAccessToken() {
    if (this.accessToken) return this.accessToken

    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString(
      "base64"
    )

    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    })

    const data = await response.json()
    this.accessToken = data.access_token

    return this.accessToken
  }

  async createSubscription(planId: string, userEmail: string, userId: string) {
    const accessToken = await this.getAccessToken()

    const subscription = {
      plan_id: planId,
      subscriber: {
        email_address: userEmail
      },
      application_context: {
        brand_name: "TableXport",
        user_action: "SUBSCRIBE_NOW",
        return_url: `${process.env.NEXTAUTH_URL}/dashboard?success=true`,
        cancel_url: `${process.env.NEXTAUTH_URL}/pricing?cancelled=true`
      },
      custom_id: userId // Store user ID for webhook processing
    }

    const response = await fetch(`${this.baseUrl}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(subscription)
    })

    return await response.json()
  }

  async getSubscription(subscriptionId: string) {
    const accessToken = await this.getAccessToken()

    const response = await fetch(
      `${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    )

    return await response.json()
  }

  async cancelSubscription(subscriptionId: string, reason: string) {
    const accessToken = await this.getAccessToken()

    const response = await fetch(
      `${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reason })
      }
    )

    return response.status === 204
  }
}

export const paypalApi = new PayPalAPI()
```

### 2. Subscription Creation API

```typescript
// pages/api/paypal/create-subscription.ts
import { paypalApi } from "@/lib/paypal/server"
import { subscriptionService } from "@/lib/supabase/subscription-service"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" })
  }

  try {
    const { planId, userId, userEmail } = req.body

    // Validate plan ID
    const validPlans = [
      process.env.NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID,
      process.env.NEXT_PUBLIC_PAYPAL_ENTERPRISE_PLAN_ID
    ]

    if (!validPlans.includes(planId)) {
      return res.status(400).json({ message: "Invalid plan ID" })
    }

    // Create PayPal subscription
    const subscription = await paypalApi.createSubscription(
      planId,
      userEmail,
      userId
    )

    if (subscription.status === "APPROVAL_PENDING") {
      // Return approval URL for user to complete subscription
      const approvalUrl = subscription.links.find(
        (link) => link.rel === "approve"
      )?.href

      return res.status(200).json({
        subscriptionId: subscription.id,
        approvalUrl
      })
    } else {
      throw new Error("Failed to create subscription")
    }
  } catch (error) {
    console.error("PayPal subscription creation error:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
}
```

### 3. PayPal Webhooks Handler

```typescript
// pages/api/paypal/webhooks.ts
import crypto from "crypto"
import { paypalApi } from "@/lib/paypal/server"
import { subscriptionService } from "@/lib/supabase/subscription-service"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" })
  }

  try {
    // Verify webhook signature
    const webhookId = process.env.PAYPAL_WEBHOOK_ID!
    const headers = req.headers
    const body = JSON.stringify(req.body)

    const isValid = await verifyPayPalWebhook(webhookId, headers, body)
    if (!isValid) {
      return res.status(401).json({ message: "Invalid webhook signature" })
    }

    const event = req.body

    switch (event.event_type) {
      case "BILLING.SUBSCRIPTION.ACTIVATED":
        await handleSubscriptionActivated(event)
        break

      case "BILLING.SUBSCRIPTION.CANCELLED":
        await handleSubscriptionCancelled(event)
        break

      case "BILLING.SUBSCRIPTION.EXPIRED":
        await handleSubscriptionExpired(event)
        break

      case "PAYMENT.SALE.COMPLETED":
        await handlePaymentCompleted(event)
        break

      case "PAYMENT.SALE.DENIED":
        await handlePaymentFailed(event)
        break

      default:
        console.log(`Unhandled PayPal webhook: ${event.event_type}`)
    }

    res.status(200).json({ message: "Webhook processed" })
  } catch (error) {
    console.error("PayPal webhook error:", error)
    res.status(500).json({ message: "Webhook processing failed" })
  }
}

async function handleSubscriptionActivated(event: any) {
  const subscription = event.resource
  const userId = subscription.custom_id

  // Determine plan type from plan_id
  let planType: SubscriptionPlan = "free"
  if (subscription.plan_id === process.env.NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID) {
    planType = "pro"
  } else if (
    subscription.plan_id === process.env.NEXT_PUBLIC_PAYPAL_ENTERPRISE_PLAN_ID
  ) {
    planType = "enterprise"
  }

  await subscriptionService.updateSubscription(userId, planType, {
    customerId: subscription.subscriber.email_address,
    subscriptionId: subscription.id,
    periodStart: subscription.start_time,
    periodEnd: subscription.billing_info.next_billing_time
  })
}

async function handlePaymentCompleted(event: any) {
  const payment = event.resource
  const subscriptionId = payment.billing_agreement_id

  // Record payment in database
  await supabase.from("payments").insert({
    subscription_id: subscriptionId,
    amount: parseFloat(payment.amount.total),
    currency: payment.amount.currency,
    paypal_payment_id: payment.id,
    status: "succeeded",
    metadata: {
      transaction_fee: payment.transaction_fee,
      payment_mode: payment.payment_mode
    }
  })
}
```

### 4. Frontend Integration

```typescript
// components/PayPalSubscriptionButton.tsx
import { useEffect, useState } from 'react';
import { getPayPal } from '@/lib/paypal/client';

interface PayPalButtonProps {
  planId: string;
  userId: string;
  onSuccess: (subscriptionId: string) => void;
  onError: (error: any) => void;
}

export const PayPalSubscriptionButton: React.FC<PayPalButtonProps> = ({
  planId,
  userId,
  onSuccess,
  onError
}) => {
  const [paypal, setPaypal] = useState<any>(null);

  useEffect(() => {
    const loadPayPal = async () => {
      const paypalSdk = await getPayPal();
      setPaypal(paypalSdk);
    };
    loadPayPal();
  }, []);

  useEffect(() => {
    if (paypal) {
      const renderButton = () => {
        paypal.Buttons({
          style: {
            shape: 'rect',
            color: 'blue',
            layout: 'vertical',
            label: 'subscribe'
          },
          createSubscription: async (data: any, actions: any) => {
            return actions.subscription.create({
              plan_id: planId,
              custom_id: userId,
              application_context: {
                brand_name: 'TableXport',
                user_action: 'SUBSCRIBE_NOW'
              }
            });
          },
          onApprove: async (data: any, actions: any) => {
            try {
              const details = await actions.subscription.get();
              onSuccess(details.id);
            } catch (error) {
              onError(error);
            }
          },
          onError: (err: any) => {
            onError(err);
          }
        }).render('#paypal-button-container');
      };

      renderButton();
    }
  }, [paypal, planId, userId, onSuccess, onError]);

  return <div id="paypal-button-container" />;
};
```

## Обновление схемы БД для PayPal

<function_calls>
<invoke name="search_replace">
<parameter name="file_path">supabase-schema.sql
</code_block_to_apply_changes_from>
</edit_instructions>

Assistant:<rewritten_file>

````
# PayPal Integration Plan for TableXport

## Overview
Integration of PayPal subscription payments with the Supabase system to handle:
- Subscription management (Pro/Enterprise plans)
- PayPal webhooks and payment processing
- Trial periods and plan changes
- Billing management through PayPal

## PayPal Setup

### 1. PayPal Developer Console Setup
```bash
# PayPal Environment Variables
NEXT_PUBLIC_PAYPAL_CLIENT_ID=AQ4eIiXQx...
PAYPAL_CLIENT_SECRET=EHkjhKJH...
PAYPAL_WEBHOOK_ID=5ML55555X...

# Environment (sandbox/live)
PAYPAL_ENVIRONMENT=sandbox # or 'live' for production

# Plan IDs (created in PayPal Developer Console)
NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID=P-8ML555555X555555XMNPXQVY
NEXT_PUBLIC_PAYPAL_ENTERPRISE_PLAN_ID=P-8ML555555X555555XMNPXQVZ
````

### 2. PayPal Plans Creation

```typescript
// PayPal Subscription Plans (create via API or Developer Console)
const paypalPlans = [
  {
    name: "TableXport Pro Monthly",
    description: "Advanced table export features with increased limits",
    type: "INFINITE", // Ongoing subscription
    payment_preferences: {
      auto_bill_outstanding: true,
      setup_fee_failure_action: "CONTINUE",
      payment_failure_threshold: 3
    },
    billing_cycles: [
      {
        frequency: {
          interval_unit: "MONTH",
          interval_count: 1
        },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0, // Infinite
        pricing_scheme: {
          fixed_price: {
            value: "9.99",
            currency_code: "USD"
          }
        }
      }
    ]
  },
  {
    name: "TableXport Enterprise Monthly",
    description: "Unlimited exports with team collaboration features",
    type: "INFINITE",
    billing_cycles: [
      {
        frequency: {
          interval_unit: "MONTH",
          interval_count: 1
        },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: {
          fixed_price: {
            value: "29.99",
            currency_code: "USD"
          }
        }
      }
    ]
  }
]
```

## Implementation Components

### 1. PayPal SDK Setup

```typescript
// src/lib/paypal/client.ts
import { loadScript } from "@paypal/paypal-js"
// src/lib/paypal/server.ts
import fetch from "node-fetch"

export const getPayPal = async () => {
  return await loadScript({
    "client-id": process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
    vault: true,
    intent: "subscription"
  })
}

class PayPalAPI {
  private clientId: string
  private clientSecret: string
  private baseUrl: string
  private accessToken?: string

  constructor() {
    this.clientId = process.env.PAYPAL_CLIENT_ID!
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET!
    this.baseUrl =
      process.env.PAYPAL_ENVIRONMENT === "live"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com"
  }

  async getAccessToken() {
    if (this.accessToken) return this.accessToken

    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString(
      "base64"
    )

    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    })

    const data = await response.json()
    this.accessToken = data.access_token

    return this.accessToken
  }

  async createSubscription(planId: string, userEmail: string, userId: string) {
    const accessToken = await this.getAccessToken()

    const subscription = {
      plan_id: planId,
      subscriber: {
        email_address: userEmail
      },
      application_context: {
        brand_name: "TableXport",
        user_action: "SUBSCRIBE_NOW",
        return_url: `${process.env.NEXTAUTH_URL}/dashboard?success=true`,
        cancel_url: `${process.env.NEXTAUTH_URL}/pricing?cancelled=true`
      },
      custom_id: userId // Store user ID for webhook processing
    }

    const response = await fetch(`${this.baseUrl}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(subscription)
    })

    return await response.json()
  }

  async getSubscription(subscriptionId: string) {
    const accessToken = await this.getAccessToken()

    const response = await fetch(
      `${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    )

    return await response.json()
  }

  async cancelSubscription(subscriptionId: string, reason: string) {
    const accessToken = await this.getAccessToken()

    const response = await fetch(
      `${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reason })
      }
    )

    return response.status === 204
  }
}

export const paypalApi = new PayPalAPI()
```

### 2. Subscription Creation API

```typescript
// pages/api/paypal/create-subscription.ts
import { paypalApi } from "@/lib/paypal/server"
import { subscriptionService } from "@/lib/supabase/subscription-service"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" })
  }

  try {
    const { planId, userId, userEmail } = req.body

    // Validate plan ID
    const validPlans = [
      process.env.NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID,
      process.env.NEXT_PUBLIC_PAYPAL_ENTERPRISE_PLAN_ID
    ]

    if (!validPlans.includes(planId)) {
      return res.status(400).json({ message: "Invalid plan ID" })
    }

    // Create PayPal subscription
    const subscription = await paypalApi.createSubscription(
      planId,
      userEmail,
      userId
    )

    if (subscription.status === "APPROVAL_PENDING") {
      // Return approval URL for user to complete subscription
      const approvalUrl = subscription.links.find(
        (link) => link.rel === "approve"
      )?.href

      return res.status(200).json({
        subscriptionId: subscription.id,
        approvalUrl
      })
    } else {
      throw new Error("Failed to create subscription")
    }
  } catch (error) {
    console.error("PayPal subscription creation error:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
}
```

### 3. PayPal Webhooks Handler

```typescript
// pages/api/paypal/webhooks.ts
import crypto from "crypto"
import { paypalApi } from "@/lib/paypal/server"
import { subscriptionService } from "@/lib/supabase/subscription-service"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" })
  }

  try {
    // Verify webhook signature
    const webhookId = process.env.PAYPAL_WEBHOOK_ID!
    const headers = req.headers
    const body = JSON.stringify(req.body)

    const isValid = await verifyPayPalWebhook(webhookId, headers, body)
    if (!isValid) {
      return res.status(401).json({ message: "Invalid webhook signature" })
    }

    const event = req.body

    switch (event.event_type) {
      case "BILLING.SUBSCRIPTION.ACTIVATED":
        await handleSubscriptionActivated(event)
        break

      case "BILLING.SUBSCRIPTION.CANCELLED":
        await handleSubscriptionCancelled(event)
        break

      case "BILLING.SUBSCRIPTION.EXPIRED":
        await handleSubscriptionExpired(event)
        break

      case "PAYMENT.SALE.COMPLETED":
        await handlePaymentCompleted(event)
        break

      case "PAYMENT.SALE.DENIED":
        await handlePaymentFailed(event)
        break

      default:
        console.log(`Unhandled PayPal webhook: ${event.event_type}`)
    }

    res.status(200).json({ message: "Webhook processed" })
  } catch (error) {
    console.error("PayPal webhook error:", error)
    res.status(500).json({ message: "Webhook processing failed" })
  }
}

async function handleSubscriptionActivated(event: any) {
  const subscription = event.resource
  const userId = subscription.custom_id

  // Determine plan type from plan_id
  let planType: SubscriptionPlan = "free"
  if (subscription.plan_id === process.env.NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID) {
    planType = "pro"
  } else if (
    subscription.plan_id === process.env.NEXT_PUBLIC_PAYPAL_ENTERPRISE_PLAN_ID
  ) {
    planType = "enterprise"
  }

  await subscriptionService.updateSubscription(userId, planType, {
    customerId: subscription.subscriber.email_address,
    subscriptionId: subscription.id,
    periodStart: subscription.start_time,
    periodEnd: subscription.billing_info.next_billing_time
  })
}

async function handlePaymentCompleted(event: any) {
  const payment = event.resource
  const subscriptionId = payment.billing_agreement_id

  // Record payment in database
  await supabase.from("payments").insert({
    subscription_id: subscriptionId,
    amount: parseFloat(payment.amount.total),
    currency: payment.amount.currency,
    paypal_payment_id: payment.id,
    status: "succeeded",
    metadata: {
      transaction_fee: payment.transaction_fee,
      payment_mode: payment.payment_mode
    }
  })
}
```

### 4. Frontend Integration

```typescript
// components/PayPalSubscriptionButton.tsx
import { useEffect, useState } from 'react';
import { getPayPal } from '@/lib/paypal/client';

interface PayPalButtonProps {
  planId: string;
  userId: string;
  onSuccess: (subscriptionId: string) => void;
  onError: (error: any) => void;
}

export const PayPalSubscriptionButton: React.FC<PayPalButtonProps> = ({
  planId,
  userId,
  onSuccess,
  onError
}) => {
  const [paypal, setPaypal] = useState<any>(null);

  useEffect(() => {
    const loadPayPal = async () => {
      const paypalSdk = await getPayPal();
      setPaypal(paypalSdk);
    };
    loadPayPal();
  }, []);

  useEffect(() => {
    if (paypal) {
      const renderButton = () => {
        paypal.Buttons({
          style: {
            shape: 'rect',
            color: 'blue',
            layout: 'vertical',
            label: 'subscribe'
          },
          createSubscription: async (data: any, actions: any) => {
            return actions.subscription.create({
              plan_id: planId,
              custom_id: userId,
              application_context: {
                brand_name: 'TableXport',
                user_action: 'SUBSCRIBE_NOW'
              }
            });
          },
          onApprove: async (data: any, actions: any) => {
            try {
              const details = await actions.subscription.get();
              onSuccess(details.id);
            } catch (error) {
              onError(error);
            }
          },
          onError: (err: any) => {
            onError(err);
          }
        }).render('#paypal-button-container');
      };

      renderButton();
    }
  }, [paypal, planId, userId, onSuccess, onError]);

  return <div id="paypal-button-container" />;
};
```

## Обновление схемы БД для PayPal

<function_calls>
<invoke name="search_replace">
<parameter name="file_path">supabase-schema.sql
</code_block_to_apply_changes_from>
</edit_instructions>

Assistant:<rewritten_file>

````
# PayPal Integration Plan for TableXport

## Overview
Integration of PayPal subscription payments with the Supabase system to handle:
- Subscription management (Pro/Enterprise plans)
- PayPal webhooks and payment processing
- Trial periods and plan changes
- Billing management through PayPal

## PayPal Setup

### 1. PayPal Developer Console Setup
```bash
# PayPal Environment Variables
NEXT_PUBLIC_PAYPAL_CLIENT_ID=AQ4eIiXQx...
PAYPAL_CLIENT_SECRET=EHkjhKJH...
PAYPAL_WEBHOOK_ID=5ML55555X...

# Environment (sandbox/live)
PAYPAL_ENVIRONMENT=sandbox # or 'live' for production

# Plan IDs (created in PayPal Developer Console)
NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID=P-8ML555555X555555XMNPXQVY
NEXT_PUBLIC_PAYPAL_ENTERPRISE_PLAN_ID=P-8ML555555X555555XMNPXQVZ
````

### 2. PayPal Plans Creation

```typescript
// PayPal Subscription Plans (create via API or Developer Console)
const paypalPlans = [
  {
    name: "TableXport Pro Monthly",
    description: "Advanced table export features with increased limits",
    type: "INFINITE", // Ongoing subscription
    payment_preferences: {
      auto_bill_outstanding: true,
      setup_fee_failure_action: "CONTINUE",
      payment_failure_threshold: 3
    },
    billing_cycles: [
      {
        frequency: {
          interval_unit: "MONTH",
          interval_count: 1
        },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0, // Infinite
        pricing_scheme: {
          fixed_price: {
            value: "9.99",
            currency_code: "USD"
          }
        }
      }
    ]
  },
  {
    name: "TableXport Enterprise Monthly",
    description: "Unlimited exports with team collaboration features",
    type: "INFINITE",
    billing_cycles: [
      {
        frequency: {
          interval_unit: "MONTH",
          interval_count: 1
        },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: {
          fixed_price: {
            value: "29.99",
            currency_code: "USD"
          }
        }
      }
    ]
  }
]
```

## Implementation Components

### 1. PayPal SDK Setup

```typescript
// src/lib/paypal/client.ts
import { loadScript } from "@paypal/paypal-js"
// src/lib/paypal/server.ts
import fetch from "node-fetch"

export const getPayPal = async () => {
  return await loadScript({
    "client-id": process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
    vault: true,
    intent: "subscription"
  })
}

class PayPalAPI {
  private clientId: string
  private clientSecret: string
  private baseUrl: string
  private accessToken?: string

  constructor() {
    this.clientId = process.env.PAYPAL_CLIENT_ID!
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET!
    this.baseUrl =
      process.env.PAYPAL_ENVIRONMENT === "live"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com"
  }

  async getAccessToken() {
    if (this.accessToken) return this.accessToken

    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString(
      "base64"
    )

    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    })

    const data = await response.json()
    this.accessToken = data.access_token

    return this.accessToken
  }

  async createSubscription(planId: string, userEmail: string, userId: string) {
    const accessToken = await this.getAccessToken()

    const subscription = {
      plan_id: planId,
      subscriber: {
        email_address: userEmail
      },
      application_context: {
        brand_name: "TableXport",
        user_action: "SUBSCRIBE_NOW",
        return_url: `${process.env.NEXTAUTH_URL}/dashboard?success=true`,
        cancel_url: `${process.env.NEXTAUTH_URL}/pricing?cancelled=true`
      },
      custom_id: userId // Store user ID for webhook processing
    }

    const response = await fetch(`${this.baseUrl}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(subscription)
    })

    return await response.json()
  }

  async getSubscription(subscriptionId: string) {
    const accessToken = await this.getAccessToken()

    const response = await fetch(
      `${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    )

    return await response.json()
  }

  async cancelSubscription(subscriptionId: string, reason: string) {
    const accessToken = await this.getAccessToken()

    const response = await fetch(
      `${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reason })
      }
    )

    return response.status === 204
  }
}

export const paypalApi = new PayPalAPI()
```

### 2. Subscription Creation API

```typescript
// pages/api/paypal/create-subscription.ts
import { paypalApi } from "@/lib/paypal/server"
import { subscriptionService } from "@/lib/supabase/subscription-service"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" })
  }

  try {
    const { planId, userId, userEmail } = req.body

    // Validate plan ID
    const validPlans = [
      process.env.NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID,
      process.env.NEXT_PUBLIC_PAYPAL_ENTERPRISE_PLAN_ID
    ]

    if (!validPlans.includes(planId)) {
      return res.status(400).json({ message: "Invalid plan ID" })
    }

    // Create PayPal subscription
    const subscription = await paypalApi.createSubscription(
      planId,
      userEmail,
      userId
    )

    if (subscription.status === "APPROVAL_PENDING") {
      // Return approval URL for user to complete subscription
      const approvalUrl = subscription.links.find(
        (link) => link.rel === "approve"
      )?.href

      return res.status(200).json({
        subscriptionId: subscription.id,
        approvalUrl
      })
    } else {
      throw new Error("Failed to create subscription")
    }
  } catch (error) {
    console.error("PayPal subscription creation error:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
}
```

### 3. PayPal Webhooks Handler

```typescript
// pages/api/paypal/webhooks.ts
import crypto from "crypto"
import { paypalApi } from "@/lib/paypal/server"
import { subscriptionService } from "@/lib/supabase/subscription-service"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" })
  }

  try {
    // Verify webhook signature
    const webhookId = process.env.PAYPAL_WEBHOOK_ID!
    const headers = req.headers
    const body = JSON.stringify(req.body)

    const isValid = await verifyPayPalWebhook(webhookId, headers, body)
    if (!isValid) {
      return res.status(401).json({ message: "Invalid webhook signature" })
    }

    const event = req.body

    switch (event.event_type) {
      case "BILLING.SUBSCRIPTION.ACTIVATED":
        await handleSubscriptionActivated(event)
        break

      case "BILLING.SUBSCRIPTION.CANCELLED":
        await handleSubscriptionCancelled(event)
        break

      case "BILLING.SUBSCRIPTION.EXPIRED":
        await handleSubscriptionExpired(event)
        break

      case "PAYMENT.SALE.COMPLETED":
        await handlePaymentCompleted(event)
        break

      case "PAYMENT.SALE.DENIED":
        await handlePaymentFailed(event)
        break

      default:
        console.log(`Unhandled PayPal webhook: ${event.event_type}`)
    }

    res.status(200).json({ message: "Webhook processed" })
  } catch (error) {
    console.error("PayPal webhook error:", error)
    res.status(500).json({ message: "Webhook processing failed" })
  }
}

async function handleSubscriptionActivated(event: any) {
  const subscription = event.resource
  const userId = subscription.custom_id

  // Determine plan type from plan_id
  let planType: SubscriptionPlan = "free"
  if (subscription.plan_id === process.env.NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID) {
    planType = "pro"
  } else if (
    subscription.plan_id === process.env.NEXT_PUBLIC_PAYPAL_ENTERPRISE_PLAN_ID
  ) {
    planType = "enterprise"
  }

  await subscriptionService.updateSubscription(userId, planType, {
    customerId: subscription.subscriber.email_address,
    subscriptionId: subscription.id,
    periodStart: subscription.start_time,
    periodEnd: subscription.billing_info.next_billing_time
  })
}

async function handlePaymentCompleted(event: any) {
  const payment = event.resource
  const subscriptionId = payment.billing_agreement_id

  // Record payment in database
  await supabase.from("payments").insert({
    subscription_id: subscriptionId,
    amount: parseFloat(payment.amount.total),
    currency: payment.amount.currency,
    paypal_payment_id: payment.id,
    status: "succeeded",
    metadata: {
      transaction_fee: payment.transaction_fee,
      payment_mode: payment.payment_mode
    }
  })
}
```

### 4. Frontend Integration

```typescript
// components/PayPalSubscriptionButton.tsx
import { useEffect, useState } from 'react';
import { getPayPal } from '@/lib/paypal/client';

interface PayPalButtonProps {
  planId: string;
  userId: string;
  onSuccess: (subscriptionId: string) => void;
  onError: (error: any) => void;
}

export const PayPalSubscriptionButton: React.FC<PayPalButtonProps> = ({
  planId,
  userId,
  onSuccess,
  onError
}) => {
  const [paypal, setPaypal] = useState<any>(null);

  useEffect(() => {
    const loadPayPal = async () => {
      const paypalSdk = await getPayPal();
      setPaypal(paypalSdk);
    };
    loadPayPal();
  }, []);

  useEffect(() => {
    if (paypal) {
      const renderButton = () => {
        paypal.Buttons({
          style: {
            shape: 'rect',
            color: 'blue',
            layout: 'vertical',
            label: 'subscribe'
          },
          createSubscription: async (data: any, actions: any) => {
            return actions.subscription.create({
              plan_id: planId,
              custom_id: userId,
              application_context: {
                brand_name: 'TableXport',
                user_action: 'SUBSCRIBE_NOW'
              }
            });
          },
          onApprove: async (data: any, actions: any) => {
            try {
              const details = await actions.subscription.get();
              onSuccess(details.id);
            } catch (error) {
              onError(error);
            }
          },
          onError: (err: any) => {
            onError(err);
          }
        }).render('#paypal-button-container');
      };

      renderButton();
    }
  }, [paypal, planId, userId, onSuccess, onError]);

  return <div id="paypal-button-container" />;
};
```

## Обновление схемы БД для PayPal

<function_calls>
<invoke name="search_replace">
<parameter name="file_path">supabase-schema.sql
</code_block_to_apply_changes_from>
</edit_instructions>

Assistant:<rewritten_file>

````
# PayPal Integration Plan for TableXport

## Overview
Integration of PayPal subscription payments with the Supabase system to handle:
- Subscription management (Pro/Enterprise plans)
- PayPal webhooks and payment processing
- Trial periods and plan changes
- Billing management through PayPal

## PayPal Setup

### 1. PayPal Developer Console Setup
```bash
# PayPal Environment Variables
NEXT_PUBLIC_PAYPAL_CLIENT_ID=AQ4eIiXQx...
PAYPAL_CLIENT_SECRET=EHkjhKJH...
PAYPAL_WEBHOOK_ID=5ML55555X...

# Environment (sandbox/live)
PAYPAL_ENVIRONMENT=sandbox # or 'live' for production

# Plan IDs (created in PayPal Developer Console)
NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID=P-8ML555555X555555XMNPXQVY
NEXT_PUBLIC_PAYPAL_ENTERPRISE_PLAN_ID=P-8ML555555X555555XMNPXQVZ
````

### 2. PayPal Plans Creation

```typescript
// PayPal Subscription Plans (create via API or Developer Console)
const paypalPlans = [
  {
    name: "TableXport Pro Monthly",
    description: "Advanced table export features with increased limits",
    type: "INFINITE", // Ongoing subscription
    payment_preferences: {
      auto_bill_outstanding: true,
      setup_fee_failure_action: "CONTINUE",
      payment_failure_threshold: 3
    },
    billing_cycles: [
      {
        frequency: {
          interval_unit: "MONTH",
          interval_count: 1
        },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0, // Infinite
        pricing_scheme: {
          fixed_price: {
            value: "9.99",
            currency_code: "USD"
          }
        }
      }
    ]
  },
  {
    name: "TableXport Enterprise Monthly",
    description: "Unlimited exports with team collaboration features",
    type: "INFINITE",
    billing_cycles: [
      {
        frequency: {
          interval_unit: "MONTH",
          interval_count: 1
        },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: {
          fixed_price: {
            value: "29.99",
            currency_code: "USD"
          }
        }
      }
    ]
  }
]
```

## Implementation Components

### 1. PayPal SDK Setup

```typescript
// src/lib/paypal/client.ts
import { loadScript } from "@paypal/paypal-js"
// src/lib/paypal/server.ts
import fetch from "node-fetch"

export const getPayPal = async () => {
  return await loadScript({
    "client-id": process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
    vault: true,
    intent: "subscription"
  })
}

class PayPalAPI {
  private clientId: string
  private clientSecret: string
  private baseUrl: string
  private accessToken?: string

  constructor() {
    this.clientId = process.env.PAYPAL_CLIENT_ID!
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET!
    this.baseUrl =
      process.env.PAYPAL_ENVIRONMENT === "live"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com"
  }

  async getAccessToken() {
    if (this.accessToken) return this.accessToken

    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString(
      "base64"
    )

    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    })

    const data = await response.json()
    this.accessToken = data.access_token

    return this.accessToken
  }

  async createSubscription(planId: string, userEmail: string, userId: string) {
    const accessToken = await this.getAccessToken()

    const subscription = {
      plan_id: planId,
      subscriber: {
        email_address: userEmail
      },
      application_context: {
        brand_name: "TableXport",
        user_action: "SUBSCRIBE_NOW",
        return_url: `${process.env.NEXTAUTH_URL}/dashboard?success=true`,
        cancel_url: `${process.env.NEXTAUTH_URL}/pricing?cancelled=true`
      },
      custom_id: userId // Store user ID for webhook processing
    }

    const response = await fetch(`${this.baseUrl}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(subscription)
    })

    return await response.json()
  }

  async getSubscription(subscriptionId: string) {
    const accessToken = await this.getAccessToken()

    const response = await fetch(
      `${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    )

    return await response.json()
  }

  async cancelSubscription(subscriptionId: string, reason: string) {
    const accessToken = await this.getAccessToken()

    const response = await fetch(
      `${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reason })
      }
    )

    return response.status === 204
  }
}

export const paypalApi = new PayPalAPI()
```

### 2. Subscription Creation API

```typescript
// pages/api/paypal/create-subscription.ts
import { paypalApi } from "@/lib/paypal/server"
import { subscriptionService } from "@/lib/supabase/subscription-service"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" })
  }

  try {
    const { planId, userId, userEmail } = req.body

    // Validate plan ID
    const validPlans = [
      process.env.NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID,
      process.env.NEXT_PUBLIC_PAYPAL_ENTERPRISE_PLAN_ID
    ]

    if (!validPlans.includes(planId)) {
      return res.status(400).json({ message: "Invalid plan ID" })
    }

    // Create PayPal subscription
    const subscription = await paypalApi.createSubscription(
      planId,
      userEmail,
      userId
    )

    if (subscription.status === "APPROVAL_PENDING") {
      // Return approval URL for user to complete subscription
      const approvalUrl = subscription.links.find(
        (link) => link.rel === "approve"
      )?.href

      return res.status(200).json({
        subscriptionId: subscription.id,
        approvalUrl
      })
    } else {
      throw new Error("Failed to create subscription")
    }
  } catch (error) {
    console.error("PayPal subscription creation error:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
}
```

### 3. PayPal Webhooks Handler

```typescript
// pages/api/paypal/webhooks.ts
import crypto from "crypto"
import { paypalApi } from "@/lib/paypal/server"
import { subscriptionService } from "@/lib/supabase/subscription-service"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" })
  }

  try {
    // Verify webhook signature
    const webhookId = process.env.PAYPAL_WEBHOOK_ID!
    const headers = req.headers
    const body = JSON.stringify(req.body)

    const isValid = await verifyPayPalWebhook(webhookId, headers, body)
    if (!isValid) {
      return res.status(401).json({ message: "Invalid webhook signature" })
    }

    const event = req.body

    switch (event.event_type) {
      case "BILLING.SUBSCRIPTION.ACTIVATED":
        await handleSubscriptionActivated(event)
        break

      case "BILLING.SUBSCRIPTION.CANCELLED":
        await handleSubscriptionCancelled(event)
        break

      case "BILLING.SUBSCRIPTION.EXPIRED":
        await handleSubscriptionExpired(event)
        break

      case "PAYMENT.SALE.COMPLETED":
        await handlePaymentCompleted(event)
        break

      case "PAYMENT.SALE.DENIED":
        await handlePaymentFailed(event)
        break

      default:
        console.log(`Unhandled PayPal webhook: ${event.event_type}`)
    }

    res.status(200).json({ message: "Webhook processed" })
  } catch (error) {
    console.error("PayPal webhook error:", error)
    res.status(500).json({ message: "Webhook processing failed" })
  }
}

async function handleSubscriptionActivated(event: any) {
  const subscription = event.resource
  const userId = subscription.custom_id

  // Determine plan type from plan_id
  let planType: SubscriptionPlan = "free"
  if (subscription.plan_id === process.env.NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID) {
    planType = "pro"
  } else if (
    subscription.plan_id === process.env.NEXT_PUBLIC_PAYPAL_ENTERPRISE_PLAN_ID
  ) {
    planType = "enterprise"
  }

  await subscriptionService.updateSubscription(userId, planType, {
    customerId: subscription.subscriber.email_address,
    subscriptionId: subscription.id,
    periodStart: subscription.start_time,
    periodEnd: subscription.billing_info.next_billing_time
  })
}

async function handlePaymentCompleted(event: any) {
  const payment = event.resource
  const subscriptionId = payment.billing_agreement_id

  // Record payment in database
  await supabase.from("payments").insert({
    subscription_id: subscriptionId,
    amount: parseFloat(payment.amount.total),
    currency: payment.amount.currency,
    paypal_payment_id: payment.id,
    status: "succeeded",
    metadata: {
      transaction_fee: payment.transaction_fee,
      payment_mode: payment.payment_mode
    }
  })
}
```

### 4. Frontend Integration

```typescript
// components/PayPalSubscriptionButton.tsx
import { useEffect, useState } from 'react';
import { getPayPal } from '@/lib/paypal/client';

interface PayPalButtonProps {
  planId: string;
  userId: string;
  onSuccess: (subscriptionId: string) => void;
  onError: (error: any) => void;
}

export const PayPalSubscriptionButton: React.FC<PayPalButtonProps> = ({
  planId,
  userId,
  onSuccess,
  onError
}) => {
  const [paypal, setPaypal] = useState<any>(null);

  useEffect(() => {
    const loadPayPal = async () => {
      const paypalSdk = await getPayPal();
      setPaypal(paypalSdk);
    };
    loadPayPal();
  }, []);

  useEffect(() => {
    if (paypal) {
      const renderButton = () => {
        paypal.Buttons({
          style: {
            shape: 'rect',
            color: 'blue',
            layout: 'vertical',
            label: 'subscribe'
          },
          createSubscription: async (data: any, actions: any) => {
            return actions.subscription.create({
              plan_id: planId,
              custom_id: userId,
              application_context: {
                brand_name: 'TableXport',
                user_action: 'SUBSCRIBE_NOW'
              }
            });
          },
          onApprove: async (data: any, actions: any) => {
            try {
              const details = await actions.subscription.get();
              onSuccess(details.id);
            } catch (error) {
              onError(error);
            }
          },
          onError: (err: any) => {
            onError(err);
          }
        }).render('#paypal-button-container');
      };

      renderButton();
    }
  }, [paypal, planId, userId, onSuccess, onError]);

  return <div id="paypal-button-container" />;
};
```

## Обновление схемы БД для PayPal

<function_calls>
<invoke name="search_replace">
<parameter name="file_path">supabase-schema.sql
</code_block_to_apply_changes_from>
</edit_instructions>

Assistant:<rewritten_file>

````
# PayPal Integration Plan for TableXport

## Overview
Integration of PayPal subscription payments with the Supabase system to handle:
- Subscription management (Pro/Enterprise plans)
- PayPal webhooks and payment processing
- Trial periods and plan changes
- Billing management through PayPal

## PayPal Setup

### 1. PayPal Developer Console Setup
```bash
# PayPal Environment Variables
NEXT_PUBLIC_PAYPAL_CLIENT_ID=AQ4eIiXQx...
PAYPAL_CLIENT_SECRET=EHkjhKJH...
PAYPAL_WEBHOOK_ID=5ML55555X...

# Environment (sandbox/live)
PAYPAL_ENVIRONMENT=sandbox # or 'live' for production

# Plan IDs (created in PayPal Developer Console)
NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID=P-8ML555555X555555XMNPXQVY
NEXT_PUBLIC_PAYPAL_ENTERPRISE_PLAN_ID=P-8ML555555X555555XMNPXQVZ
````

### 2. PayPal Plans Creation

```typescript
// PayPal Subscription Plans (create via API or Developer Console)
const paypalPlans = [
  {
    name: "TableXport Pro Monthly",
    description: "Advanced table export features with increased limits",
    type: "INFINITE", // Ongoing subscription
    payment_preferences: {
      auto_bill_outstanding: true,
      setup_fee_failure_action: "CONTINUE",
      payment_failure_threshold: 3
    },
    billing_cycles: [
      {
        frequency: {
          interval_unit: "MONTH",
          interval_count: 1
        },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0, // Infinite
        pricing_scheme: {
          fixed_price: {
            value: "9.99",
            currency_code: "USD"
          }
        }
      }
    ]
  },
  {
    name: "TableXport Enterprise Monthly",
    description: "Unlimited exports with team collaboration features",
    type: "INFINITE",
    billing_cycles: [
      {
        frequency: {
          interval_unit: "MONTH",
          interval_count: 1
        },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: {
          fixed_price: {
            value: "29.99",
            currency_code: "USD"
          }
        }
      }
    ]
  }
]
```

## Implementation Components

### 1. PayPal SDK Setup

```typescript
// src/lib/paypal/client.ts
import { loadScript } from "@paypal/paypal-js"
// src/lib/paypal/server.ts
import fetch from "node-fetch"

export const getPayPal = async () => {
  return await loadScript({
    "client-id": process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
    vault: true,
    intent: "subscription"
  })
}

class PayPalAPI {
  private clientId: string
  private clientSecret: string
  private baseUrl: string
  private accessToken?: string

  constructor() {
    this.clientId = process.env.PAYPAL_CLIENT_ID!
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET!
    this.baseUrl =
      process.env.PAYPAL_ENVIRONMENT === "live"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com"
  }

  async getAccessToken() {
    if (this.accessToken) return this.accessToken

    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString(
      "base64"
    )

    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    })

    const data = await response.json()
    this.accessToken = data.access_token

    return this.accessToken
  }

  async createSubscription(planId: string, userEmail: string, userId: string) {
    const accessToken = await this.getAccessToken()

    const subscription = {
      plan_id: planId,
      subscriber: {
        email_address: userEmail
      },
      application_context: {
        brand_name: "TableXport",
        user_action: "SUBSCRIBE_NOW",
        return_url: `${process.env.NEXTAUTH_URL}/dashboard?success=true`,
        cancel_url: `${process.env.NEXTAUTH_URL}/pricing?cancelled=true`
      },
      custom_id: userId // Store user ID for webhook processing
    }

    const response = await fetch(`${this.baseUrl}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(subscription)
    })

    return await response.json()
  }

  async getSubscription(subscriptionId: string) {
    const accessToken = await this.getAccessToken()

    const response = await fetch(
      `${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    )

    return await response.json()
  }

  async cancelSubscription(subscriptionId: string, reason: string) {
    const accessToken = await this.getAccessToken()

    const response = await fetch(
      `${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reason })
      }
    )

    return response.status === 204
  }
}

export const paypalApi = new PayPalAPI()
```

### 2. Subscription Creation API

```typescript
// pages/api/paypal/create-subscription.ts
import { paypalApi } from "@/lib/paypal/server"
import { subscriptionService } from "@/lib/supabase/subscription-service"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" })
  }

  try {
    const { planId, userId, userEmail } = req.body

    // Validate plan ID
    const validPlans = [
      process.env.NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID,
      process.env.NEXT_PUBLIC_PAYPAL_ENTERPRISE_PLAN_ID
    ]

    if (!validPlans.includes(planId)) {
      return res.status(400).json({ message: "Invalid plan ID" })
    }

    // Create PayPal subscription
    const subscription = await paypalApi.createSubscription(
      planId,
      userEmail,
      userId
    )

    if (subscription.status === "APPROVAL_PENDING") {
      // Return approval URL for user to complete subscription
      const approvalUrl = subscription.links.find(
        (link) => link.rel === "approve"
      )?.href

      return res.status(200).json({
        subscriptionId: subscription.id,
        approvalUrl
      })
    } else {
      throw new Error("Failed to create subscription")
    }
  } catch (error) {
    console.error("PayPal subscription creation error:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
}
```

### 3. PayPal Webhooks Handler

```typescript
// pages/api/paypal/webhooks.ts
import crypto from "crypto"
import { paypalApi } from "@/lib/paypal/server"
import { subscriptionService } from "@/lib/supabase/subscription-service"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" })
  }

  try {
    // Verify webhook signature
    const webhookId = process.env.PAYPAL_WEBHOOK_ID!
    const headers = req.headers
    const body = JSON.stringify(req.body)

    const isValid = await verifyPayPalWebhook(webhookId, headers, body)
    if (!isValid) {
      return res.status(401).json({ message: "Invalid webhook signature" })
    }

    const event = req.body

    switch (event.event_type) {
      case "BILLING.SUBSCRIPTION.ACTIVATED":
        await handleSubscriptionActivated(event)
        break

      case "BILLING.SUBSCRIPTION.CANCELLED":
        await handleSubscriptionCancelled(event)
        break

      case "BILLING.SUBSCRIPTION.EXPIRED":
        await handleSubscriptionExpired(event)
        break

      case "PAYMENT.SALE.COMPLETED":
        await handlePaymentCompleted(event)
        break

      case "PAYMENT.SALE.DENIED":
        await handlePaymentFailed(event)
        break

      default:
        console.log(`Unhandled PayPal webhook: ${event.event_type}`)
    }

    res.status(200).json({ message: "Webhook processed" })
  } catch (error) {
    console.error("PayPal webhook error:", error)
    res.status(500).json({ message: "Webhook processing failed" })
  }
}

async function handleSubscriptionActivated(event: any) {
  const subscription = event.resource
  const userId = subscription.custom_id

  // Determine plan type from plan_id
  let planType: SubscriptionPlan = "free"
  if (subscription.plan_id === process.env.NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID) {
    planType = "pro"
  } else if (
    subscription.plan_id === process.env.NEXT_PUBLIC_PAYPAL_ENTERPRISE_PLAN_ID
  ) {
    planType = "enterprise"
  }

  await subscriptionService.updateSubscription(userId, planType, {
    customerId: subscription.subscriber.email_address,
    subscriptionId: subscription.id,
    periodStart: subscription.start_time,
    periodEnd: subscription.billing_info.next_billing_time
  })
}

async function handlePaymentCompleted(event: any) {
  const payment = event.resource
  const subscriptionId = payment.billing_agreement_id

  // Record payment in database
  await supabase.from("payments").insert({
    subscription_id: subscriptionId,
    amount: parseFloat(payment.amount.total),
    currency: payment.amount.currency,
    paypal_payment_id: payment.id,
    status: "succeeded",
    metadata: {
      transaction_fee: payment.transaction_fee,
      payment_mode: payment.payment_mode
    }
  })
}
```

### 4. Frontend Integration

```typescript
// components/PayPalSubscriptionButton.tsx
import { useEffect, useState } from 'react';
import { getPayPal } from '@/lib/paypal/client';

interface PayPalButtonProps {
  planId: string;
  userId: string;
  onSuccess: (subscriptionId: string) => void;
  onError: (error: any) => void;
}

export const PayPalSubscriptionButton: React.FC<PayPalButtonProps> = ({
  planId,
  userId,
  onSuccess,
  onError
}) => {
  const [paypal, setPaypal] = useState<any>(null);

  useEffect(() => {
    const loadPayPal = async () => {
      const paypalSdk = await getPayPal();
      setPaypal(paypalSdk);
    };
    loadPayPal();
  }, []);

  useEffect(() => {
    if (paypal) {
      const renderButton = () => {
        paypal.Buttons({
          style: {
            shape: 'rect',
            color: 'blue',
            layout: 'vertical',
            label: 'subscribe'
          },
          createSubscription: async (data: any, actions: any) => {
            return actions.subscription.create({
              plan_id: planId,
              custom_id: userId,
              application_context: {
                brand_name: 'TableXport',
                user_action: 'SUBSCRIBE_NOW'
              }
            });
          },
          onApprove: async (data: any, actions: any) => {
            try {
              const details = await actions.subscription.get();
              onSuccess(details.id);
            } catch (error) {
              onError(error);
            }
          },
          onError: (err: any) => {
            onError(err);
          }
        }).render('#paypal-button-container');
      };

      renderButton();
    }
  }, [paypal, planId, userId, onSuccess, onError]);

  return <div id="paypal-button-container" />;
};
```

## Обновление схемы БД для PayPal

<function_calls>
<invoke name="search_replace">
<parameter name="file_path">supabase-schema.sql
</code_block_to_apply_changes_from>
</edit_instructions>

Assistant:<rewritten_file>

````
# PayPal Integration Plan for TableXport

## Overview
Integration of PayPal subscription payments with the Supabase system to handle:
- Subscription management (Pro/Enterprise plans)
- PayPal webhooks and payment processing
- Trial periods and plan changes
- Billing management through PayPal

## PayPal Setup

### 1. PayPal Developer Console Setup
```bash
# PayPal Environment Variables
NEXT_PUBLIC_PAYPAL_CLIENT_ID=AQ4eIiXQx...
PAYPAL_CLIENT_SECRET=EHkjhKJH...
PAYPAL_WEBHOOK_ID=5ML55555X...

# Environment (sandbox/live)
PAYPAL_ENVIRONMENT=sandbox # or 'live' for production

# Plan IDs (created in PayPal Developer Console)
NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID=P-8ML555555X555555XMNPXQVY
NEXT_PUBLIC_PAYPAL_ENTERPRISE_PLAN_ID=P-8ML555555X555555XMNPXQVZ
````

### 2. PayPal Plans Creation

```typescript
// PayPal Subscription Plans (create via API or Developer Console)
const paypalPlans = [
  {
    name: "TableXport Pro Monthly",
    description: "Advanced table export features with increased limits",
    type: "INFINITE", // Ongoing subscription
    payment_preferences: {
      auto_bill_outstanding: true,
      setup_fee_failure_action: "CONTINUE",
      payment_failure_threshold: 3
    },
    billing_cycles: [
      {
        frequency: {
          interval_unit: "MONTH",
          interval_count: 1
        },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0, // Infinite
        pricing_scheme: {
          fixed_price: {
            value: "9.99",
            currency_code: "USD"
          }
        }
      }
    ]
  },
  {
    name: "TableXport Enterprise Monthly",
    description: "Unlimited exports with team collaboration features",
    type: "INFINITE",
    billing_cycles: [
      {
        frequency: {
          interval_unit: "MONTH",
          interval_count: 1
        },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: {
          fixed_price: {
            value: "29.99",
            currency_code: "USD"
          }
        }
      }
    ]
  }
]
```

## Implementation Components

### 1. PayPal SDK Setup

```typescript
// src/lib/paypal/client.ts
import { loadScript } from "@paypal/paypal-js"
// src/lib/paypal/server.ts
import fetch from "node-fetch"

export const getPayPal = async () => {
  return await loadScript({
    "client-id": process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
    vault: true,
    intent: "subscription"
  })
}

class PayPalAPI {
  private clientId: string
  private clientSecret: string
  private baseUrl: string
  private accessToken?: string

  constructor() {
    this.clientId = process.env.PAYPAL_CLIENT_ID!
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET!
    this.baseUrl =
      process.env.PAYPAL_ENVIRONMENT === "live"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com"
  }

  async getAccessToken() {
    if (this.accessToken) return this.accessToken

    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString(
      "base64"
    )

    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    })

    const data = await response.json()
    this.accessToken = data.access_token

    return this.accessToken
  }

  async createSubscription(planId: string, userEmail: string, userId: string) {
    const accessToken = await this.getAccessToken()

    const subscription = {
      plan_id: planId,
      subscriber: {
        email_address: userEmail
      },
      application_context: {
        brand_name: "TableXport",
        user_action: "SUBSCRIBE_NOW",
        return_url: `${process.env.NEXTAUTH_URL}/dashboard?success=true`,
        cancel_url: `${process.env.NEXTAUTH_URL}/pricing?cancelled=true`
      },
      custom_id: userId // Store user ID for webhook processing
    }

    const response = await fetch(`${this.baseUrl}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(subscription)
    })

    return await response.json()
  }

  async getSubscription(subscriptionId: string) {
    const accessToken = await this.getAccessToken()

    const response = await fetch(
      `${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    )

    return await response.json()
  }

  async cancelSubscription(subscriptionId: string, reason: string) {
    const accessToken = await this.getAccessToken()

    const response = await fetch(
      `${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reason })
      }
    )

    return response.status === 204
  }
}

export const paypalApi = new PayPalAPI()
```

### 2. Subscription Creation API

```typescript
// pages/api/paypal/create-subscription.ts
import { paypalApi } from "@/lib/paypal/server"
import { subscriptionService } from "@/lib/supabase/subscription-service"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" })
  }

  try {
    const { planId, userId, userEmail } = req.body

    // Validate plan ID
    const validPlans = [
      process.env.NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID,
      process.env.NEXT_PUBLIC_PAYPAL_ENTERPRISE_PLAN_ID
    ]

    if (!validPlans.includes(planId)) {
      return res.status(400).json({ message: "Invalid plan ID" })
    }

    // Create PayPal subscription
    const subscription = await paypalApi.createSubscription(
      planId,
      userEmail,
      userId
    )

    if (subscription.status === "APPROVAL_PENDING") {
      // Return approval URL for user to complete subscription
      const approvalUrl = subscription.links.find(
        (link) => link.rel === "approve"
      )?.href

      return res.status(200).json({
        subscriptionId: subscription.id,
        approvalUrl
      })
    } else {
      throw new Error("Failed to create subscription")
    }
  } catch (error) {
    console.error("PayPal subscription creation error:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
}
```

### 3. PayPal Webhooks Handler

```typescript
// pages/api/paypal/webhooks.ts
import crypto from "crypto"
import { paypalApi } from "@/lib/paypal/server"
import { subscriptionService } from "@/lib/supabase/subscription-service"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" })
  }

  try {
    // Verify webhook signature
    const webhookId = process.env.PAYPAL_WEBHOOK_ID!
    const headers = req.headers
    const body = JSON.stringify(req.body)

    const isValid = await verifyPayPalWebhook(webhookId, headers, body)
    if (!isValid) {
      return res.status(401).json({ message: "Invalid webhook signature" })
    }

    const event = req.body

    switch (event.event_type) {
      case "BILLING.SUBSCRIPTION.ACTIVATED":
        await handleSubscriptionActivated(event)
        break

      case "BILLING.SUBSCRIPTION.CANCELLED":
        await handleSubscriptionCancelled(event)
        break

      case "BILLING.SUBSCRIPTION.EXPIRED":
        await handleSubscriptionExpired(event)
        break

      case "PAYMENT.SALE.COMPLETED":
        await handlePaymentCompleted(event)
        break

      case "PAYMENT.SALE.DENIED":
        await handlePaymentFailed(event)
        break

      default:
        console.log(`Unhandled PayPal webhook: ${event.event_type}`)
    }

    res.status(200).json({ message: "Webhook processed" })
  } catch (error) {
    console.error("PayPal webhook error:", error)
    res.status(500).json({ message: "Webhook processing failed" })
  }
}

async function handleSubscriptionActivated(event: any) {
  const subscription = event.resource
  const userId = subscription.custom_id

  // Determine plan type from plan_id
  let planType: SubscriptionPlan = "free"
  if (subscription.plan_id === process.env.NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID) {
    planType = "pro"
  } else if (
    subscription.plan_id === process.env.NEXT_PUBLIC_PAYPAL_ENTERPRISE_PLAN_ID
  ) {
    planType = "enterprise"
  }

  await subscriptionService.updateSubscription(userId, planType, {
    customerId: subscription.subscriber.email_address,
    subscriptionId: subscription.id,
    periodStart: subscription.start_time,
    periodEnd: subscription.billing_info.next_billing_time
  })
}

async function handlePaymentCompleted(event: any) {
  const payment = event.resource
  const subscriptionId = payment.billing_agreement_id

  // Record payment in database
  await supabase.from("payments").insert({
    subscription_id: subscriptionId,
    amount: parseFloat(payment.amount.total),
    currency: payment.amount.currency,
    paypal_payment_id: payment.id,
    status: "succeeded",
    metadata: {
      transaction_fee: payment.transaction_fee,
      payment_mode: payment.payment_mode
    }
  })
}
```

### 4. Frontend Integration

```typescript
// components/PayPalSubscriptionButton.tsx
import { useEffect, useState } from 'react';
import { getPayPal } from '@/lib/paypal/client';

interface PayPalButtonProps {
  planId: string;
  userId: string;
  onSuccess: (subscriptionId: string) => void;
  onError: (error: any) => void;
}

export const PayPalSubscriptionButton: React.FC<PayPalButtonProps> = ({
  planId,
  userId,
  onSuccess,
  onError
}) => {
  const [paypal, setPaypal] = useState<any>(null);

  useEffect(() => {
    const loadPayPal = async () => {
      const paypalSdk = await getPayPal();
      setPaypal(paypalSdk);
    };
    loadPayPal();
  }, []);

  useEffect(() => {
    if (paypal) {
      const renderButton = () => {
        paypal.Buttons({
          style: {
            shape: 'rect',
            color: 'blue',
            layout: 'vertical',
            label: 'subscribe'
          },
          createSubscription: async (data: any, actions: any) => {
            return actions.subscription.create({
              plan_id: planId,
              custom_id: userId,
              application_context: {
                brand_name: 'TableXport',
                user_action: 'SUBSCRIBE_NOW'
              }
            });
          },
          onApprove: async (data: any, actions: any) => {
            try {
              const details = await actions.subscription.get();
              onSuccess(details.id);
            } catch (error) {
              onError(error);
            }
          },
          onError: (err: any) => {
            onError(err);
          }
        }).render('#paypal-button-container');
      };

      renderButton();
    }
  }, [paypal, planId, userId, onSuccess, onError]);

  return <div id="paypal-button-container" />;
};
```

## Обновление схемы БД для PayPal

<function_calls>
<invoke name="search_replace">
<parameter name="file_path">supabase-schema.sql
</code_block_to_apply_changes_from>
</edit_instructions>

Assistant:<rewritten_file>

````
# PayPal Integration Plan for TableXport

## Overview
Integration of PayPal subscription payments with the Supabase system to handle:
- Subscription management (Pro/Enterprise plans)
- PayPal webhooks and payment processing
- Trial periods and plan changes
- Billing management through PayPal

## PayPal Setup

### 1. PayPal Developer Console Setup
```bash
# PayPal Environment Variables
NEXT_PUBLIC_PAYPAL_CLIENT_ID=AQ4eIiXQx...
PAYPAL_CLIENT_SECRET=EHkjhKJH...
PAYPAL_WEBHOOK_ID=5ML55555X...

# Environment (sandbox/live)
PAYPAL_ENVIRONMENT=sandbox # or 'live' for production

# Plan IDs (created in PayPal Developer Console)
NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID=P-8ML555555X555555XMNPXQVY
NEXT_PUBLIC_PAYPAL_ENTERPRISE_PLAN_ID=P-8ML555555X555555XMNPXQVZ
````

### 2. PayPal Plans Creation

```typescript
// PayPal Subscription Plans (create via API or Developer Console)
const paypalPlans = [
  {
    name: "TableXport Pro Monthly",
    description: "Advanced table export features with increased limits",
    type: "INFINITE", // Ongoing subscription
    payment_preferences: {
      auto_bill_outstanding: true,
      setup_fee_failure_action: "CONTINUE",
      payment_failure_threshold: 3
    },
    billing_cycles: [
      {
        frequency: {
          interval_unit: "MONTH",
          interval_count: 1
        },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0, // Infinite
        pricing_scheme: {
          fixed_price: {
            value: "9.99",
            currency_code: "USD"
          }
        }
      }
    ]
  },
  {
    name: "TableXport Enterprise Monthly",
    description: "Unlimited exports with team collaboration features",
    type: "INFINITE",
    billing_cycles: [
      {
        frequency: {
          interval_unit: "MONTH",
          interval_count: 1
        },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: {
          fixed_price: {
            value: "29.99",
            currency_code: "USD"
          }
        }
      }
    ]
  }
]
```

## Implementation Components

### 1. PayPal SDK Setup

```typescript
// src/lib/paypal/client.ts
import { loadScript } from "@paypal/paypal-js"
// src/lib/paypal/server.ts
import fetch from "node-fetch"

export const getPayPal = async () => {
  return await loadScript({
    "client-id": process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
    vault: true,
    intent: "subscription"
  })
}

class PayPalAPI {
  private clientId: string
  private clientSecret: string
  private baseUrl: string
  private accessToken?: string

  constructor() {
    this.clientId = process.env.PAYPAL_CLIENT_ID!
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET!
    this.baseUrl =
      process.env.PAYPAL_ENVIRONMENT === "live"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com"
  }

  async getAccessToken() {
    if (this.accessToken) return this.accessToken

    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString(
      "base64"
    )

    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    })

    const data = await response.json()
    this.accessToken = data.access_token

    return this.accessToken
  }

  async createSubscription(planId: string, userEmail: string, userId: string) {
    const accessToken = await this.getAccessToken()

    const subscription = {
      plan_id: planId,
      subscriber: {
        email_address: userEmail
      },
      application_context: {
        brand_name: "TableXport",
        user_action: "SUBSCRIBE_NOW",
        return_url: `${process.env.NEXTAUTH_URL}/dashboard?success=true`,
        cancel_url: `${process.env.NEXTAUTH_URL}/pricing?cancelled=true`
      },
      custom_id: userId // Store user ID for webhook processing
    }

    const response = await fetch(`${this.baseUrl}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(subscription)
    })

    return await response.json()
  }

  async getSubscription(subscriptionId: string) {
    const accessToken = await this.getAccessToken()

    const response = await fetch(
      `${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    )

    return await response.json()
  }

  async cancelSubscription(subscriptionId: string, reason: string) {
    const accessToken = await this.getAccessToken()

    const response = await fetch(
      `${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reason })
      }
    )

    return response.status === 204
  }
}

export const paypalApi = new PayPalAPI()
```

### 2. Subscription Creation API

```typescript
// pages/api/paypal/create-subscription.ts
import { paypalApi } from '@/lib/paypal/server';
import { subscriptionService } from '@/lib/supabase/subscription-service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { planId, userId, userEmail } = req.body;

    // Validate plan ID
    const validPlans = [
      process.env.NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID,
      process.env.NEXT_PUBLIC_PAYPAL_ENTERPRISE_PLAN_ID
    ];

    if (!validPlans.includes(planId)) {
      return res.status(400).json({ message: 'Invalid plan ID' });
    }

    // Create PayPal subscription
    const subscription = await paypalApi.createSubscription(planId, userEmail, userId);

    if (subscription.status === 'APPROVAL_PENDING') {
      // Return approval URL for user to complete subscription
      const approvalUrl = subscription.links.find(link => link.rel === 'approve')?.href;

      return res.status(200).json({
        subscriptionId: subscription.id,
        approvalUrl
```
