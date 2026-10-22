
import { listPromises, type ApiPromise } from "./promises";
import {
  listReceivables,
  type ApiReceivable,
} from "./receivables";

export type PromiseOption = {
  id: number;
  remaining_amount: string;
};

export async function listPromisesForCustomer(
  customerId: number,
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
        promise.status !== "CANCELLED" &&
        activeReceivableIds.has(promise.receivable) &&
        Number(promise.remaining_amount) > 0,
    )
    .map((promise) => ({
      id: promise.id,
      remaining_amount: promise.remaining_amount,
    }));
}
