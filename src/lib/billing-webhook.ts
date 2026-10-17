import type Stripe from "stripe";

import {
  canceledBillingState,
  stripeId,
  subscriptionToBillingState,
} from "@/lib/billing";
import { applyStripeEvent, type BillingWrite } from "@/lib/db/billing";
import { getStripe } from "@/lib/stripe";

/**
 * 向 Stripe 取最新的訂閱狀態再寫入，不採用事件 payload：Stripe 不保證事件順序，
 * 晚到的舊事件若直接採用，會把新狀態蓋回舊的
 */
async function syncSubscription(subscriptionId: string): Promise<BillingWrite | null> {
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  const customerId = stripeId(subscription.customer);
  if (!customerId) {
    return null;
  }
  return {
    target: { customerId, subscriptionId: subscription.id, matchUnset: true },
    data: subscriptionToBillingState(subscription),
  };
}

/** 依事件決定要寫入什麼；不需要更新使用者的事件回傳 null（仍會記錄事件） */
async function toBillingWrite(event: Stripe.Event): Promise<BillingWrite | null> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const userId = session.metadata?.userId;
      const subscriptionId = stripeId(session.subscription);
      if (!userId || !subscriptionId) {
        return null;
      }
      const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
      const customerId = stripeId(session.customer);
      return {
        target: { userId },
        data: {
          ...subscriptionToBillingState(subscription),
          ...(customerId && { stripeCustomerId: customerId }),
        },
      };
    }
    case "invoice.paid": {
      const subscriptionId = stripeId(
        event.data.object.parent?.subscription_details?.subscription,
      );
      return subscriptionId ? syncSubscription(subscriptionId) : null;
    }
    case "invoice.payment_failed":
      // Stripe 會自動重試，不在這裡降級；狀態變化由 customer.subscription.updated 同步
      console.warn("Stripe invoice payment failed", event.data.object.id);
      return null;
    case "customer.subscription.updated":
      return syncSubscription(event.data.object.id);
    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const customerId = stripeId(subscription.customer);
      if (!customerId) {
        return null;
      }
      return {
        target: { customerId, subscriptionId: subscription.id, matchUnset: false },
        data: canceledBillingState(subscription),
      };
    }
    default:
      return null;
  }
}

/** webhook 的主要邏輯；route 只負責驗簽與 HTTP */
export async function handleStripeEvent(
  event: Stripe.Event,
): Promise<"applied" | "duplicate"> {
  return applyStripeEvent(event, await toBillingWrite(event));
}
