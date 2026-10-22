export type FollowUpStatus = "Upcoming" | "Due Today" | "Overdue" | "Completed";
export type ContactMethod = "WhatsApp" | "Phone Call" | "SMS" | "Other";

export type FollowUp = {
  id: number;
  customerId: string;
  customer: string;
  receivable: string;
  date: string;
  method: ContactMethod;
  status: FollowUpStatus;
  notes: string;
};

let followUps: FollowUp[] = [
  {
    id: 1,
    customerId: "hassan-al-khalil",
    customer: "Hassan Al-Khalil",
    receivable: "Cleaning supplies",
    date: "2026-10-01",
    method: "WhatsApp",
    status: "Due Today",
    notes: "Confirm expected transfer date.",
  },
  {
    id: 2,
    customerId: "samir-youssef",
    customer: "Samir Youssef",
    receivable: "Wholesale products",
    date: "2026-10-05",
    method: "Phone Call",
    status: "Upcoming",
    notes: "Check in about the remaining balance.",
  },
  {
    id: 3,
    customerId: "maria-hani",
    customer: "Maria Hani",
    receivable: "Office supplies",
    date: "2026-09-28",
    method: "SMS",
    status: "Overdue",
    notes: "Reschedule after missed call.",
  },
  {
    id: 4,
    customerId: "hassan-al-khalil",
    customer: "Hassan Al-Khalil",
    receivable: "Delivery equipment",
    date: "2026-09-25",
    method: "Other",
    status: "Completed",
    notes: "Customer confirmed payment plan.",
  },
];

export function getFollowUps() {
  return [...followUps];
}

export function addFollowUp(followUp: Omit<FollowUp, "id">) {
  const id = Math.max(0, ...followUps.map((item) => item.id)) + 1;
  followUps = [...followUps, { ...followUp, id }];
}

export function updateFollowUp(id: number, changes: Omit<FollowUp, "id">) {
  followUps = followUps.map((item) =>
    item.id === id ? { ...changes, id } : item,
  );
}

export function deleteFollowUp(id: number) {
  followUps = followUps.filter((item) => item.id !== id);
}