# Domain Glossary: Splitzz

Shared domain vocabulary and ubiquitous language for the Splitzz codebase.

## Core Domain Terms

### Group
A shared financial space owned by an Owner user, containing multiple Member users who share expenses and record settlements. A group has a base currency (default: `INR`) and a `simplifyDebts` preference.

### Member
A registered user participating in a Group. A member can hold the role of `Owner` (creator with administrative powers) or `Member`.

### Expense
A monetary transaction paid by one Member on behalf of one or more Members in a Group. An expense has a total amount, a category (e.g. `food`, `travel`, `utilities`), and is divided into individual Shares.

### Share
The allocated monetary obligation assigned to a specific Member for a given Expense. Can be divided equally, by exact unequal amounts, by percentage, or by ratio shares. The sum of all share amounts in cents must exactly equal the total expense amount in cents.

### Balance
The net standing of a Member within a Group:
- `RECEIVABLE`: The group owes money to this member (positive standing).
- `PAYABLE`: The member owes money to the group (negative standing).
The sum of all member balances within any group is always zero.

### Settlement
A direct financial payment from a debtor Member to a creditor Member to reduce or eliminate an outstanding debt. Settle-up actions update member balances and can be executed via digital payment deep links (such as UPI).

### Debt Simplification
An optimization algorithm that computes a minimized directed graph of settlement transactions across all group members, minimizing the total number of payments required to resolve all net debts.

## Architectural Modules

### Group Domain Store
The unified client-side state machine managing groups, expenses, members, balances, and suggested settlements. Provides optimistic mutations, cache-first instant rendering, and automatic cascade revalidation.

### Receipt Parser
The server-side ingestion module that accepts raw receipt image bytes, delegates to OCR or multimodal vision adapters, and tokenizes merchant names, dates, amounts, taxes, and line items into structured transaction models.

### Receipt Tokenizer
The deterministic heuristics engine that extracts financial entities from unformatted OCR text lines using pattern recognition and vocabulary scoring.
