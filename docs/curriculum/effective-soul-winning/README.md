# Effective Soul Winning — One Kingdom Course Package

Status: PACKAGE READY / IMPORT PATH BUILT / NOT PUBLISHED / HUMAN PREVIEW REQUIRED

## Canonical source

Church-provided source: `ESW & Supplements 2024 - FINAL.pdf`.

The source remains outside the public application repository. Kingdom Network stores course structure, protected native assessments, and approved source-link metadata; it does not copy the curriculum PDF into the app repository.

## Verified lesson order

1. The Old and the New Testament
2. What Is Repentance?
3. There Is Only One God
4. Man of Sorrows
5. Apostolic Authority
6. The New Birth

## Assessment model

- Mastery progression
- 80% passing
- Checkpoint 1 after Lesson 2: 6 questions
- Checkpoint 2 after Lesson 4: 6 questions
- Checkpoint 3 after Lesson 6: 6 questions
- Final exam: 20 questions
- Every package question includes a source reference
- Package import creates assessments as Draft/unpublished even when the canonical package marks them reviewed; leadership reviews/publishes them before the course can publish.

## Source page map

- Teacher recommendations / Do's and Don'ts / contents: pp. 30–32
- Lesson 1: p. 33
- Lesson 2: pp. 34–36
- Lesson 3: pp. 37–39
- Matthew 28:19 supplement: pp. 40–46
- Oneness / Trinity comparison supplement: pp. 47–51
- Matthew 28:19 questionnaires: pp. 52–62
- Lesson 4: pp. 63–65
- Lesson 5: pp. 66–68
- Baptism in Jesus' Name supplement: pp. 69–73
- Lesson 6 / holiness: pp. 74–77
- Rapture section: pp. 78–79

## Import workflow

1. Create a new empty Draft course in Course Builder.
2. Open **Course Package**.
3. Select `course-package-v1.json`.
4. Import.
5. Connect the church-authorized Dropbox/Google Drive/web source link.
6. Review all six lessons and four assessments.
7. Publish each required assessment after review.
8. Publish the course only after the database readiness gate passes.
9. Human-test learner progression, final exam, completion, and credential behavior before production deployment.

The package importer is atomic: if validation or any insert fails, the database transaction rolls back instead of leaving a half-built class.

## Rights boundary

The supplied source contains a copyright notice. Do not assume network-wide redistribution rights. Keep the source private to the owning church unless leadership has permission to share it. Cross-church curriculum sharing remains explicit and permission-based.
