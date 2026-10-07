export type Payment = {
  id: number;
  customerId: string;
  customer: string;
  amount: number;
  date: string;
  method: string;
  status: "Completed";
};

let payments: Payment[] = [
  { id: 1, customerId: "hassan-al-khalil", customer: "Hassan Al-Khalil", amount: 650, date: "2026-09-26", method: "Cash", status: "Completed" },
  { id: 2, customerId: "samir-youssef", customer: "Samir Youssef", amount: 820, date: "2026-09-22", method: "Bank transfer", status: "Completed" },
  { id: 3, customerId: "maria-hani", customer: "Maria Hani", amount: 580, date: "2026-09-18", method: "Whish", status: "Completed" },
];

export function getPayments() {
  return payments.map((payment) => ({ ...payment }));
}

export function getPayment(id: number) {
  const payment = payments.find((item) => item.id === id);
  return payment ? { ...payment } : undefined;
}

export function addPayment(payment: Omit<Payment, "id">) {
  const id = Math.max(0, ...payments.map((item) => item.id)) + 1;
  payments = [...payments, { ...payment, id }];
}

export function updatePayment(id: number, changes: Omit<Payment, "id">) {
  payments = payments.map((item) =>
    item.id === id ? { ...changes, id } : item,
  );
}

export function deletePayment(id: number) {
  payments = payments.filter((item) => item.id !== id);
}

export function deletePaymentsForCustomer(customerId: string) {
  payments = payments.filter((item) => item.customerId !== customerId);
}