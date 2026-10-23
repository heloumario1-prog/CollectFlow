
import { ApiError, apiRequest } from "../api/client";

export type PaymentMethod = "CASH" | "WHISH";

export const methodLabels: Record<PaymentMethod, string> = {
  CASH: "Cash",
  WHISH: "Whish",
};

export type Payment = {
  id: number;
  paymentPromiseId: number;
  customerId: number;
  customer: string;
  amount: number;
  date: string;
  method: PaymentMethod;
  note: string | null;
  status: "Completed" | "Voided";
  voidReason: string | null;
};

type ApiPayment = {
  id: number;
  payment_promise: number;
  receivable_id: number;
  customer_id: number;
  customer_name: string;
  amount: string | number;
  paid_on: string;
  method: PaymentMethod;
  note: string | null;
  is_voided: boolean;
  void_reason: string | null;
};

type Page<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

function fromApi(payment: ApiPayment): Payment {
  return {
    id: payment.id,
    paymentPromiseId: payment.payment_promise,
    customerId: payment.customer_id,
    customer: payment.customer_name,
    amount: Number(payment.amount),
    date: payment.paid_on,
    method: payment.method,
    note: payment.note,
    status: payment.is_voided ? "Voided" : "Completed",
    voidReason: payment.void_reason,
  };
}

/**
 * Get all payments from Django, including subsequent pages.
 */
export async function getPayments(): Promise<Payment[]> {
  const payments: Payment[] = [];
  let page = 1;

  while (true) {
    const response = await apiRequest<Page<ApiPayment> | ApiPayment[]>(
      `payments/?page=${page}`,
    );

    // Support APIs that return a plain array.
    if (Array.isArray(response)) {
      payments.push(...response.map(fromApi));
      break;
    }

    payments.push(...response.results.map(fromApi));

    if (!response.next) {
      break;
    }

    page += 1;
  }

  return payments;
}

/**
 * Get one payment by ID.
 */
export async function getPayment(
  id: number,
): Promise<Payment | undefined> {
  try {
    const payment = await apiRequest<ApiPayment>(`payments/${id}/`);
    return fromApi(payment);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 404) throw error;
    return undefined;
  }
}

export type PaymentInput = {
  paymentPromiseId?: number;
  amount: number;
  date: string;
  method: PaymentMethod;
  note: string;
};

/**
 * Record a new payment against a payment promise.
 */
export async function addPayment(
  input: PaymentInput & { paymentPromiseId: number; idempotencyKey?: string },
): Promise<void> {
  await apiRequest<ApiPayment>("payments/", {
    method: "POST",
    idempotencyKey: input.idempotencyKey,
    body: {
      payment_promise: input.paymentPromiseId,
      amount: input.amount.toFixed(2),
      paid_on: input.date,
      method: input.method,
      note: input.note.trim() || null,
    },
  });
}

/**
 * Edit an existing payment.
 */
export async function updatePayment(
  id: number,
  input: PaymentInput,
): Promise<void> {
  await apiRequest<ApiPayment>(`payments/${id}/`, {
    method: "PATCH",
    body: {
      ...(input.paymentPromiseId ? { payment_promise: input.paymentPromiseId } : {}),
      amount: input.amount.toFixed(2),
      paid_on: input.date,
      method: input.method,
      note: input.note.trim() || null,
    },
  });
}

/**
 * Void a payment instead of permanently deleting its financial record.
 */
export async function voidPayment(
  id: number,
  reason: string,
): Promise<void> {
  await apiRequest<ApiPayment>(`payments/${id}/void/`, {
    method: "POST",
    body: {
      void_reason: reason.trim(),
    },
  });
}
