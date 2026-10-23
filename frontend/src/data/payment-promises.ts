import type { Payment } from "./payments";

import { listPromises, type ApiPromise } from "./promises";
import {
  listReceivables,
  type ApiReceivable,
} from "./receivables";

export type PromiseOption = {
  id: number;
  remaining_amount: string;
  label: string;
};

export async function listPromisesForCustomer(
  customerId: number,
  editing?: Payment,
): Promise<PromiseOption[]> {
  const [promises, receivables] = await Promise.all([
    listPromises(),
    listReceivables(),
  ]);

  const activeReceivableIds = new Set(
    (receivables as ApiReceivable[])
      .filter(
        (receivable) =>
          receivable.customer_detail.id === customerId &&
          !receivable.archived_at,
      )
      .map((receivable) => receivable.id),
  );

  return (promises as ApiPromise[])
    .filter(
      (promise) =>
        promise.customer_id === customerId &&
        (promise.status !== "CANCELLED" || editing?.paymentPromiseId === promise.id) &&
        activeReceivableIds.has(promise.receivable) &&
        (Number(promise.remaining_amount) > 0 || editing?.paymentPromiseId === promise.id),
    )
    .map((promise) => {
      const original = editing?.paymentPromiseId === promise.id;
      let available = Number(promise.remaining_amount) + (original ? editing.amount : 0);
      if (original && promise.status === "CANCELLED") {
        const receivable = receivables.find(item => item.id === promise.receivable);
        available = Math.min(available, editing.amount + Number(receivable?.unpromised_amount ?? "0"));
      }
      const remaining_amount = available.toFixed(2);
      return {
        id: promise.id,
        remaining_amount,
        label: `Promise #${promise.id} - due ${promise.promised_on} - $${remaining_amount} available - Receivable #${promise.receivable}`,
      };
    });
}
