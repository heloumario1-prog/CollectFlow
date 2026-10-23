const tones: Record<string, string> = {
  CANCELLED: "danger",
  CANCELED: "danger",
  VOIDED: "danger",
  OVERDUE: "danger",
  BROKEN: "danger",
  PAID: "success",
  KEPT: "success",
  COMPLETED: "success",
  ACTIVE: "success",
  RECORDED: "success",
  OPEN: "info",
  OUTSTANDING: "info",
  PENDING: "info",
  UPCOMING: "info",
  FOLLOW_UP: "info",
  PARTIALLY_PAID: "warning",
  DUE_TODAY: "warning",
  ARCHIVED: "neutral",
  INACTIVE: "neutral",
};

const labels: Record<string, string> = {
  CANCELLED: "Cancelled", CANCELED: "Cancelled", VOIDED: "Voided", OVERDUE: "Overdue", BROKEN: "Broken",
  PAID: "Paid", KEPT: "Completed", COMPLETED: "Completed", ACTIVE: "Active", RECORDED: "Recorded",
  OPEN: "Open", OUTSTANDING: "Outstanding", PENDING: "Pending", UPCOMING: "Upcoming", FOLLOW_UP: "Follow-up",
  PARTIALLY_PAID: "Partially paid", DUE_TODAY: "Due today", ARCHIVED: "Archived", INACTIVE: "Inactive",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const key = status.trim().toUpperCase().replace(/[\s-]+/g, "_");
  return <span className={`record-status record-status-${tones[key] ?? "neutral"}`}>{label ?? labels[key] ?? status}</span>;
}
