# techtalks-CollectFlow
A simple platform for small businesses to manage receivables, payments, and customer follow-ups.
# CollectFlow

## Project Overview

CollectFlow is a simple receivables management platform designed for Lebanese small businesses and suppliers.

Many businesses currently manage money owed to them through WhatsApp chats, notebooks, spreadsheets, paper invoices, and memory. This can cause overdue payments to be missed, partial payments to become unclear, and customer promises to be forgotten.

CollectFlow provides one place to manage customer balances, payments, due dates, promises, and follow-ups.

### Target Users

- Lebanese wholesalers and small suppliers
- Cleaning-supply distributors
- Small businesses that sell to customers on credit
- Suppliers who need to track customer payments and outstanding balances

### Main Goal

Help suppliers clearly see:

- Who owes money
- How much is still unpaid
- When payments are due
- What follow-up is required
- Customer payment promises

## Approved MVP

The MVP focuses on the core receivables-management workflow.

### Core Features

1. **Customer and Receivable Records**
   - Add and manage customers
   - Record amounts owed
   - Store currencies and due dates

2. **Full and Partial Payment Tracking**
   - Record payments
   - Calculate remaining balances
   - Track payment status
   - Identify open, partially paid, overdue, and paid receivables

3. **Payment Promises and Follow-up Notes**
   - Record customer promises
   - Add follow-up notes
   - Remember when to contact customers again

4. **Mobile-Friendly Dashboard**
   - View total outstanding amounts
   - View overdue balances
   - View collected payments
   - View upcoming payment promises

### Out of Scope for the First MVP

The following features are planned for later versions:

- Automatic WhatsApp message processing
- AI-detected payment actions
- Voice-note transcription
- Online payments
- Advanced reporting
- Accounting features
- Inventory management
- ERP features

WhatsApp conversations will initially be opened and handled manually.

## Tech Stack

### Frontend
- React

### Backend
- Python
- Django REST Framework

### Database
- PostgreSQL

### Planned External Services
- WhatsApp Business API / Webhook
- LangChain
- Large Language Model (LLM)

### Planned AI Functionality

In a future version, AI may interpret incoming WhatsApp replies and convert them into structured, reviewable actions.

Human confirmation will be required before AI-detected actions modify business records.


## Team & Responsibilities

| Team Member | GitHub Username | Responsibility |
|---|---|---|
| Fida Abbass Jebaoui | `YOUR_USERNAME` | Database + Backend |
| Haidar Fadi Jouni | `GITHUB_USERNAME` | Database + Backend |
| Nour Thaer Al Haj Diab | `GITHUB_USERNAME` | UX/UI + Frontend Design |
| Zeinab Khalil Hammoud | `GITHUB_USERNAME` | Research & Business |
| Georges Nidal Abou Rjeily | `GITHUB_USERNAME` | Frontend |
| Mario Georges El Helou | `GITHUB_USERNAME` | Frontend |

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

> **Status:** Planned



## User Journey

The main workflow is:

**Register/Login → Create Customer → Record Receivable → Set Due Date → View Dashboard → Follow Up → Record Payment or Promise → Update Remaining Balance → Complete When Fully Paid**


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
