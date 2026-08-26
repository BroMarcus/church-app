# Base44 → Supabase Person Reconciliation Ledger

Prepared: 2026-08-26  
Status: **REVIEW READY — NO LIVE DATA CHANGED**  
Canonical authority: **Next.js + Supabase**

## Purpose

Before Base44 is treated as a reference implementation rather than a Madera data authority, confirm that real Madera person information is not quietly abandoned.

This ledger intentionally avoids publishing private contact details or account identifiers into the repository. Exact source records can be re-queried from the connected systems when an approved reconciliation is performed.

## Read-only comparison result

The current Base44 app contains **3 Person records**.

- **2 records represent real Madera people whose canonical identities already exist in Supabase.** Multiple identity signals matched; a new canonical Person/member identity should not be created for either one.
- **1 record is a demo administrator record.** It did not match a real canonical Supabase identity and is classified **DEMO / DO NOT MIGRATE**.

Therefore the immediate risk is **not missing identities**. The remaining risk is field-level information that exists in Base44 but is absent, different, or differently verified in Supabase.

## Field reconciliation classes

### A. Identity — already reconciled

For the two real records:

- canonical Supabase identities already exist;
- canonical church memberships already exist;
- no duplicate account/member should be created from the Base44 Person ids.

Decision: **NO IDENTITY MIGRATION REQUIRED.**

### B. Safe profile facts — review for carryover

Base44 contains some ordinary profile facts that are not currently represented in the corresponding canonical record or are more complete there.

Examples of the category include:

- birthday / anniversary where non-conflicting
- occupation / skills / business-profile facts
- optional profile preferences
- other non-sensitive member-entered profile information

Decision: **CARRYOVER CANDIDATE**, but only after field-by-field comparison and normal privacy rules. Do not overwrite a newer canonical value merely because Base44 has a value.

### C. Conflicting profile facts — manual review

At least one ordinary profile field was found with different values between the two systems.

Decision: **MANUAL REVIEW REQUIRED.** Neither value wins automatically. Prefer the most recently verified/user-confirmed canonical fact.

### D. Spiritual milestones — never auto-import as verified

Base44 contains baptism / Holy Ghost values for real records where canonical Supabase verified milestone fields are unset or differ in verification state.

Decision:

- do not write directly into canonical verified `member_milestones` merely because Base44 says `yes` or contains a date;
- if useful, treat the Base44 value as a **reported / review-needed candidate**;
- Pastor/Admin or the church's approved verification workflow confirms the official value;
- preserve self-report vs official verification distinction.

### E. Training / discipleship completion — verify against canonical evidence

Base44 contains training/completion values for real records where canonical Supabase Learning/milestone state is absent, `not_started`, or otherwise different.

Decision:

- do not silently mark First Steps / Effective Soul Winning / Bible-study qualification complete;
- check canonical Learning enrollment/completion evidence first;
- if the completion occurred outside the canonical Learning engine or predates it, leadership may record a reviewed external/manual equivalency under the Package 4/5 rules;
- keep course completion and church-verified equivalency distinguishable.

### F. Group / ministry / role relationships — reconcile against current canonical assignments

Base44 may contain role, group, ministry, or title references that are snapshots from a separate implementation.

Decision:

- canonical Supabase memberships/assignments win for current access and current group membership;
- Base44 title/role values never grant technical authority;
- historical value may be preserved only if it represents a real past relationship worth retaining.

### G. Demo record

The demo administrator is **not real Madera member data**.

Decision: **DO NOT MIGRATE.** Retain only as Base44 test/reference data until that environment is intentionally cleaned up later.

## Reconciliation workflow before any future Base44 cleanup

1. Re-query the two real Base44 Person records and their matched canonical Supabase records.
2. Produce a field-level diff without exposing sensitive data unnecessarily.
3. Auto-propose only non-sensitive, non-conflicting profile carryover.
4. Route conflicts to the member/admin for confirmation.
5. Route baptism/Holy Ghost/training/leadership facts through the appropriate verification workflow.
6. Record any approved canonical writes in the normal audit trail.
7. Confirm the canonical record now contains every approved useful fact.
8. Only then may the Base44 copy be considered dispensable; no deletion is authorized by this document.

## Current conclusion

**No real Madera identity is stranded in Base44.** The two real Base44 Person records already map to canonical Supabase identities. However, Base44 contains some useful profile/journey information that must be deliberately reviewed before Base44 data could ever be discarded.

No live data, schema, RLS, Auth configuration, permissions, or deployment was changed during this comparison.
