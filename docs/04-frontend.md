# Ppopgi (뽑기) — Frontend Architecture & Guarantees

## 1. Purpose of the Frontend

The Ppopgi frontend is a **pure interface layer**.

It exists to:
- help users discover raffles
- guide them through interactions
- visualize on-chain state clearly

It does **not**:
- custody funds
- simulate outcomes
- fabricate activity
- override contract rules

---

## 2. Core Principles

### 2.1 On-chain Truth Only

All displayed data comes from:
- direct contract reads
- verified events
- derived values (e.g. countdown from `deadline`)

There are:
- no fake winners
- no fake timers
- no fake social proof

---

### 2.2 Explicit User Consent

Every write action requires:
- wallet connection
- correct network
- explicit user click
- signed transaction

No background or automatic transactions.

---

### 2.3 Safety Over Convenience

If any state is unclear:
- actions are disabled
- the user is asked to refresh
- no assumptions are made

---

## 3. Network Enforcement

- Only Etherlink Mainnet (Chain ID 42793)
- Wrong network → all writes disabled
- Single CTA: “Switch to Etherlink”

---

## 4. Discovery & Listing

### 4.1 Official vs Registered vs Unlisted

The frontend distinguishes:

- **Official Verified**
  - Created by the official deployer
  - Registered in the registry

- **Registered**
  - In registry
  - But not deployed by official deployer

- **Unlisted**
  - Not in registry
  - Accessible only via direct address

This avoids central censorship while preserving trust signals.

---

## 5. Home Page Logic

The home page always contains:

1. **Biggest Winning Pots**
   - Top 3 raffles
   - Sorted by `winningPot`

2. **Expiring Soon**
   - Next 5 raffles by `deadline`

This is computed **live** from registry reads.
No indexer required.

---

## 6. Raffle Detail Page

### Mandatory Reads
- status
- ticket price
- prize
- sold tickets
- limits
- deadline
- entropy provider
- fee recipient
- protocol fee %

### UX Rules
- Countdown uses on-chain deadline
- Progress bar freezes on cancel
- Odds shown only if meaningful

---

## 7. Fees Transparency

Every raffle explicitly displays:
- protocol fee percentage
- fee recipient address
- explanation in friendly language

Users know **before playing**:
- who receives fees
- how much
- why fees exist

---

## 8. Create Raffle Flow

Before creation, frontend verifies:
- wallet connected
- correct network
- sufficient USDC balance
- sufficient allowance
- valid duration
- sane price vs min purchase

If anything would revert:
- the button is disabled
- an explanation is shown

---

## 9. Play Flow

Before buying tickets:
- status must be Open
- not expired
- not creator
- caps respected
- balances sufficient

After purchase:
- state is re-read
- ownership updated
- no optimistic assumptions

---

## 10. Draw (Finalize) Flow

- Eligibility strictly checked
- Entropy fee quoted from contract
- Exact fee used
- Overpayment avoided

If someone else finalized first:
- UI handles gracefully
- user is prompted to refresh

---

## 11. Claims & Withdrawals

- Pull-based only
- Users explicitly withdraw
- Frontend never auto-withdraws

Supports:
- USDC withdrawals
- Native refunds
- Multiple raffles aggregation

---

## 12. Admin UI (Safe Only)

Admin UI is:
- hidden unless authorized
- guarded by on-chain reads

Admin can:
- configure future defaults
- rescue failed registrations
- sweep surplus only

Admin **cannot**:
- move user funds
- change existing raffles
- pick winners

---

## 13. Failure Handling

Handled gracefully:
- race conditions
- RPC hiccups
- reverted txs
- stale reads

User always sees:
- what happened
- what to do next

---

## 14. Transparency Without Intimidation

Technical details are:
- accessible via “Details” modals
- never forced on casual users

This balances:
- trust
- usability
- education

---

## 15. Final Statement

The frontend is designed to be:
- replaceable
- auditable
- honest

If the UI disappears tomorrow,  
**the raffles still work.** 