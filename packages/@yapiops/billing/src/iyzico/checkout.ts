import type { PlanCode } from '@yapiops/db';

import { getPlan } from '../plans';
import { calculateVat } from '../plans';

import { getIyzipayClient } from './client';

export interface CheckoutInput {
  orgId: string;
  planCode: PlanCode;
  customer: {
    id: string;
    name: string;
    surname: string;
    email: string;
    gsmNumber?: string;
    identityNumber?: string;
    /** VKN if billing as TICARI; TCKN otherwise. Iyzico requires it for taxable Turkish flow. */
    registrationAddress?: string;
    city?: string;
    country?: string;
  };
  callbackUrl: string;
}

export interface CheckoutResult {
  token: string;
  paymentPageUrl: string;
}

/**
 * Initializes an Iyzico CheckoutForm session for the chosen plan. Returns the
 * iframe-embeddable payment page URL.
 *
 * Phase 0 stub: returns a placeholder when the SDK isn't fully wired. Replace
 * with a real `iyzipay.checkoutFormInitialize` call once Iyzico sandbox plan
 * reference codes are populated in env (see `IYZICO_PLAN_*` vars).
 */
export async function createCheckoutForm(input: CheckoutInput): Promise<CheckoutResult> {
  const plan = getPlan(input.planCode);
  if (plan.iyzicoRefEnvKey === null) {
    throw new Error(`Plan ${input.planCode} is not purchasable via Iyzico`);
  }

  const planRef = process.env[plan.iyzicoRefEnvKey];
  if (!planRef) {
    throw new Error(`Missing Iyzico plan reference: ${plan.iyzicoRefEnvKey}`);
  }

  const { total } = calculateVat(plan.priceTry);

  // Defer to the SDK. Real call shape:
  //   iyzipay.subscriptionCheckoutForm.initialize({
  //     locale: 'tr',
  //     conversationId: <random>,
  //     pricingPlanReferenceCode: planRef,
  //     subscriptionInitialStatus: 'ACTIVE',
  //     callbackUrl: input.callbackUrl,
  //     customer: { ... }
  //   }, callback)
  //
  // The SDK uses Node-style callbacks. We wrap into a Promise here.
  const client = getIyzipayClient();
  return new Promise((resolve, reject) => {
    const request = {
      locale: 'tr',
      conversationId: `${input.orgId}-${Date.now().toString()}`,
      pricingPlanReferenceCode: planRef,
      subscriptionInitialStatus: 'ACTIVE' as const,
      callbackUrl: input.callbackUrl,
      customer: {
        ...input.customer,
        billingAddress: {
          contactName: `${input.customer.name} ${input.customer.surname}`,
          city: input.customer.city ?? 'Istanbul',
          country: input.customer.country ?? 'Turkey',
          address: input.customer.registrationAddress ?? '',
        },
        shippingAddress: {
          contactName: `${input.customer.name} ${input.customer.surname}`,
          city: input.customer.city ?? 'Istanbul',
          country: input.customer.country ?? 'Turkey',
          address: input.customer.registrationAddress ?? '',
        },
      },
      paidPrice: total.toFixed(2),
    };

    // The Iyzipay SDK shape varies per version; we cast through unknown here
    // because the typings don't cover the subscription endpoint fully.
    const sdk = client as unknown as {
      subscriptionCheckoutForm: {
        initialize: (
          req: typeof request,
          cb: (
            err: Error | null,
            result: {
              token: string;
              checkoutFormContent: string;
              tokenExpireTime: number;
              paymentPageUrl: string;
            },
          ) => void,
        ) => void;
      };
    };

    sdk.subscriptionCheckoutForm.initialize(request, (err, result) => {
      if (err) reject(err);
      else resolve({ token: result.token, paymentPageUrl: result.paymentPageUrl });
    });
  });
}
