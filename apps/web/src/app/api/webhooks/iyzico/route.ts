import { type SupabaseClient } from '@supabase/supabase-js';
import { AuditLogger } from '@yapiops/audit';
import {
  eArsivFaturaKes,
  parseIyzicoEvent,
  verifyIyzicoSignature,
  type IyzicoWebhookEvent,
} from '@yapiops/billing';
import { createSupabaseServiceClient } from '@yapiops/db/server';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const secret = process.env.IYZICO_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const rawPayload = await request.text();
  const signature = (await headers()).get('x-iyzico-signature');

  if (!verifyIyzicoSignature(rawPayload, signature, secret)) {
    // Don't leak why we rejected — just deny.
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: IyzicoWebhookEvent;
  try {
    event = parseIyzicoEvent(rawPayload);
  } catch {
    return NextResponse.json({ error: 'Malformed event' }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();

  switch (event.event) {
    case 'subscription.payment_succeeded':
      await handlePaymentSucceeded(supabase, event);
      break;

    case 'subscription.payment_failed':
      await handlePaymentFailed(supabase, event);
      break;

    case 'subscription.canceled':
      await handleSubscriptionCanceled(supabase, event);
      break;

    case 'subscription.created':
    case 'subscription.trial_ending':
      // No-op for Phase 0 — we provision the subscription server-side
      // ourselves (callback route) and trial reminders are sent by Resend
      // via cron in Phase 1.
      break;
  }

  return NextResponse.json({ received: true });
}

async function handlePaymentSucceeded(supabase: SupabaseClient, event: IyzicoWebhookEvent) {
  if (!event.iyzicoSubscriptionReferenceCode || !event.paidPrice) return;

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id, org_id')
    .eq('iyzico_subscription_id', event.iyzicoSubscriptionReferenceCode)
    .maybeSingle();

  if (!sub) return;

  await supabase.from('subscriptions').update({ status: 'active' }).eq('id', sub.id);

  const { data: org } = await supabase
    .from('organizations')
    .select('name, tax_number, e_invoice_alias')
    .eq('id', sub.org_id)
    .maybeSingle();

  // VAT-inclusive paidPrice arrives from Iyzico; reconstruct the breakdown.
  const total = event.paidPrice;
  const exclVat = Math.round((total / 1.2) * 100) / 100;
  const vat = Math.round((total - exclVat) * 100) / 100;

  let eFaturaUuid: string | null = null;
  let eFaturaStatus = 'failed';
  try {
    const result = await eArsivFaturaKes({
      alici: {
        fullName: org?.name ?? 'Unknown',
        email: '',
        vknOrTckn: org?.tax_number ?? '11111111111',
        address: '',
        city: 'Istanbul',
        country: 'Turkey',
      },
      kalemler: [{ description: 'YapıOps subscription', quantity: 1, unitPriceTry: exclVat }],
    });
    eFaturaUuid = result.uuid;
    eFaturaStatus = result.status;
  } catch (err) {
    // Don't fail the webhook just because the e-fatura provider hiccuped.
    // Phase 1 will route this through Inngest with retries.
    console.error('eArsivFaturaKes failed:', err);
  }

  await supabase.from('invoices').insert({
    org_id: sub.org_id,
    subscription_id: sub.id,
    amount_try: total,
    vat_amount: vat,
    e_invoice_uuid: eFaturaUuid,
    e_invoice_status: eFaturaStatus,
    issued_at: new Date().toISOString(),
  });

  const audit = new AuditLogger(supabase, { orgId: sub.org_id, userId: null });
  await audit.log('subscription.payment_succeeded', {
    resourceType: 'subscription',
    resourceId: sub.id,
    metadata: { iyzico_payment_id: event.iyzicoPaymentId, total },
  });
  await audit.log('invoice.issued', {
    resourceType: 'invoice',
    metadata: { e_invoice_uuid: eFaturaUuid, total },
  });
}

async function handlePaymentFailed(supabase: SupabaseClient, event: IyzicoWebhookEvent) {
  if (!event.iyzicoSubscriptionReferenceCode) return;

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id, org_id')
    .eq('iyzico_subscription_id', event.iyzicoSubscriptionReferenceCode)
    .maybeSingle();

  if (!sub) return;

  await supabase.from('subscriptions').update({ status: 'past_due' }).eq('id', sub.id);

  const audit = new AuditLogger(supabase, { orgId: sub.org_id, userId: null });
  await audit.log('subscription.payment_failed', {
    resourceType: 'subscription',
    resourceId: sub.id,
    metadata: { iyzico_reference: event.iyzicoReferenceCode },
  });
}

async function handleSubscriptionCanceled(supabase: SupabaseClient, event: IyzicoWebhookEvent) {
  if (!event.iyzicoSubscriptionReferenceCode) return;

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id, org_id')
    .eq('iyzico_subscription_id', event.iyzicoSubscriptionReferenceCode)
    .maybeSingle();

  if (!sub) return;

  await supabase
    .from('subscriptions')
    .update({ status: 'canceled', canceled_at: new Date().toISOString() })
    .eq('id', sub.id);

  const audit = new AuditLogger(supabase, { orgId: sub.org_id, userId: null });
  await audit.log('subscription.canceled', {
    resourceType: 'subscription',
    resourceId: sub.id,
  });
}
