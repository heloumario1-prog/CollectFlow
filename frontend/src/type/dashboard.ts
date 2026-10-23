export type DashboardSummary = {
  period: { name: string; start: string; end: string; today_in_beirut: string };
  metrics: {
    total_outstanding: string; total_overdue: string; cash_collected: string;
    whish_collected: string; total_collected: string; total_unpromised: string;
    broken_promises_count: number; upcoming_promises_count: number; due_followups_count: number;
  };
  queues: {
    broken_promises: PromiseQueueItem[];
    upcoming_promises: PromiseQueueItem[];
    due_followups: { id: number; name: string; next_follow_up_on: string; phone_e164: string }[];
  };
};
type PromiseQueueItem = { id: number; customer_name: string; remaining_amount: string; promised_on: string };
