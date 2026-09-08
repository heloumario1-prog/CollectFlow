# techtalks-CollectFlow

A simple platform for small businesses to manage receivables, payment promises, payments, and customer follow-ups.

# CollectFlow

## Project Overview

CollectFlow is a focused receivables-management platform designed for Lebanese small businesses and suppliers.

Many businesses currently manage money owed to them through WhatsApp chats, notebooks, spreadsheets, paper invoices, and memory. This can cause overdue payments to be missed, partial payments to become unclear, and customer promises to be forgotten.

CollectFlow provides one place to manage customers, complete receivable balances, promised installments, actual payments, due dates, and manual WhatsApp follow-ups.

### Target Users

- Lebanese wholesalers and small suppliers
- Cleaning-supply distributors
- Small businesses that sell to customers on credit
- Suppliers who need to track customer payments and outstanding balances

The supplier business uses CollectFlow. Its customers do not need CollectFlow accounts and may have Lebanese or international phone numbers.

### Main Goal

Help suppliers clearly see:

- Who owes money
- The original receivable amount
- How much has been paid and how much remains unpaid
- When receivables and payment promises are due
- Which promises are pending, kept, or broken
- Which customers require a WhatsApp follow-up

## Approved MVP

The MVP focuses on a complete but manageable manual receivables workflow that can be delivered and piloted within 8-10 weeks.

### Core Features

1. **Business Accounts and Role-Based Access**

   - Register and log in using email and password
   - Support owner and optional staff accounts
   - Allow both roles to perform daily collection work
   - Restrict business settings and staff management to owners
   - Keep every supplier business's data separate

2. **Customer Records**

   - Add and manage customers
   - Require a customer phone number for manual WhatsApp follow-up
   - Default the phone-country selector to Lebanon (`+961`)
   - Allow international customer phone numbers
   - Normalize phone numbers into one international format to prevent duplicates
   - Archive customers without deleting their financial history

3. **Receivable Records**

   - Record the complete amount a customer owes in USD
   - Add an optional reference, description, and issue date
   - Set the receivable due date
   - Calculate the paid and remaining amounts from recorded payments
   - Identify open, partially paid, overdue, and paid receivables

4. **Payment Promises**

   - Divide a receivable into one or more promised installments
   - Allow promises to cover only part of the receivable
   - Show the amount that has not yet been promised
   - Record each promised amount and payment date
   - Identify pending, kept, broken, and cancelled promises
   - Allow one promise to be fulfilled through multiple payments

5. **Cash and Whish Payments**

   - Record every payment against a specific payment promise
   - Support cash and Whish as the MVP payment methods
   - Prevent payments from exceeding the promise's remaining amount
   - Recalculate both the promise and receivable balances automatically
   - Void an incorrect payment without deleting its history

6. **Manual WhatsApp Follow-Ups**

   - Open the customer's WhatsApp chat manually
   - Record a note after completing the follow-up
   - Optionally link the follow-up to a receivable or payment promise
   - Store the next follow-up date

7. **Mobile-Friendly Dashboard**

   - View total outstanding amounts
   - View overdue balances
   - View collected cash and Whish payments
   - View upcoming and broken payment promises
   - View unpromised receivable balances
   - View customers whose WhatsApp follow-up is due

8. **Financial History and Data Protection**

   - Record who created, updated, archived, cancelled, or voided important records
   - Preserve incorrect payments as voided records instead of deleting them
   - Protect passwords using Django's authentication system
   - Back up the PostgreSQL database regularly

WhatsApp conversations are opened and handled manually in the MVP.

## Tech Stack

### Frontend

- React

### Backend

- Python
- Django
- Django REST Framework

### Database

- PostgreSQL

## Team & Responsibilities

| Team Member               | GitHub Username | Responsibility          |
| ------------------------- | --------------- | ----------------------- |
| Fida Abbass Jebaoui       |                 |UX/UI +Research&Business |
| Haidar Fadi Jouni         |                 | Database +frontend      |
| Nour Thaer Al Haj Diab    |                 | UX/UI + Frontend Design |
| Zeinab Khalil Hammoud     |                 |    backend 
| Georges Nidal Abou Rjeily |                 | backend                 |
| Mario Georges El Helou    |                 | Frontend                |

## Getting Started

### Prerequisites

The project setup is currently being prepared.

Planned requirements include:

- Python
- Django
- Django REST Framework
- React
- PostgreSQL
- Git

### Installation

Installation and database setup commands will be added as the project development progresses.

## User Journey

The main workflow is:

**Register/Login -> Add Staff if Needed -> Create Customer and Select Phone Country -> Record Receivable -> Record One or More Payment Promises -> View Dashboard -> Open WhatsApp and Follow Up Manually -> Save Follow-up Note -> Record Cash or Whish Payment Against a Promise -> Recalculate Promise and Receivable Balances -> Complete When Fully Paid**

Example:

1. A supplier owner registers and creates a customer with a Lebanese or international phone number.
2. The owner records a `$500` receivable and its due date.
3. The customer promises to pay `$200` on Friday, so the owner records a `$200` payment promise.
4. The dashboard shows `$500` outstanding, `$200` promised, and `$300` unpromised.
5. The owner opens the customer's WhatsApp chat manually and records the follow-up result.
6. The customer pays `$50` in cash and later `$150` through Whish. Both payments are linked to the `$200` promise.
7. The promise becomes kept automatically, and the receivable remaining balance becomes `$300`.
8. Later promises and payments continue until the receivable remaining balance reaches zero and becomes paid.

## Contribution Workflow

Each team member should work on their assigned task using a separate branch.

### Workflow

1. Create a branch for your task.
2. Make your changes.
3. Commit your work with a meaningful commit message.
4. Push the branch to GitHub.
5. Create a Pull Request.
6. Ask another team member to review the changes.
7. Merge the Pull Request after review.

### Example Branch Names

```text
feature/customer-management
feature/payment-tracking
feature/dashboard
feature/frontend
feature/authentication
```
