# Package 1 Phone QA Test Accounts

Reserved test-only signup identities for the isolated QA Supabase project:

- `p1.admin@kingdomnetwork.test` — Church Admin / Outreach oversight
- `p1.enleader@kingdomnetwork.test` — English Friendship Group leader
- `p1.esleader@kingdomnetwork.test` — Spanish Friendship Group leader
- `p1.member@kingdomnetwork.test` — ordinary member / English Friendship Group member

Each tester creates the account through the normal **Create account** form and chooses their own temporary password (minimum 8 characters). The isolated QA database auto-confirms only these four reserved `.test` addresses and provisions the corresponding fake church/group role. No real email, production account, or real Madera personal data is used.

Package 2 remains out of scope; this fixture exists only to establish authenticated roles for Package 1 human verification.
