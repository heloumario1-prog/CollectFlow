export type PromiseStatus = "Upcoming" | "Overdue";

export type PaymentPromise = {
  id: number;
  customer: string;
  customerId: string;
  amount: number;
  promiseDate: string;
  status: PromiseStatus;
};

let promises: PaymentPromise[] = [
  { id: 1, customer: "Hassan Al-Khalil", customerId: "hassan-al-khalil", amount: 600, promiseDate: "2026-10-03", status: "Upcoming" },
  { id: 2, customer: "Samir Youssef", customerId: "samir-youssef", amount: 500, promiseDate: "2026-10-07", status: "Upcoming" },
  { id: 3, customer: "Maria Hani", customerId: "maria-hani", amount: 420, promiseDate: "2026-09-25", status: "Overdue" },
];

export function getPromises() {
  return promises.map((promise) => ({ ...promise }));
}

export function getPromise(id: number) {
  const promise = promises.find((item) => item.id === id);
  return promise ? { ...promise } : undefined;
}

export function addPromise(promise: Omit<PaymentPromise, "id">) {
  const id = Math.max(0, ...promises.map((item) => item.id)) + 1;
  promises = [...promises, { ...promise, id }];
}

export function updatePromise(id: number, changes: Omit<PaymentPromise, "id">) {
  promises = promises.map((item) =>
    item.id === id ? { ...changes, id } : item,
  );
}

export function deletePromise(id: number) {
  promises = promises.filter((item) => item.id !== id);
}