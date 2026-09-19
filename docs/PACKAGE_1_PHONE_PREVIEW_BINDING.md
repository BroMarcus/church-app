# Package 1 Phone QA Preview Binding

This branch is a preview-only harness for real-phone Package 1 verification.

- Canonical implementation under test: `54571b2d10a41cf4d189bd9dbe6dd530366a631f`
- Preview branch: `preview/package-1-phone-54571b2d`
- Application/business-logic source: identical to the canonical implementation except `src/lib/supabase/config.ts`, which points to the isolated `$0` Supabase QA project.
- QA Supabase project: `kingdom-network-package1-phone-test`
- Production database: untouched.
- No service-role/private secrets are committed.
- Package 2: HOLD.

Do not merge this preview-only binding into `main`.
