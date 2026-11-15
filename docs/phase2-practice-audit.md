# Practice question coverage audit

The local assembled-bank audit ran on 2026-11-14 at 23:35 UTC after the corrected booklet and objective packs loaded. It compares mapped lecture IDs against the configured lecture list. The exact machine-readable result is in `phase2-practice-coverage.json`.

| Generator scope | Eligible mapped questions | Lectures checked | Lectures with no eligible mapped question |
| --- | ---: | ---: | --- |
| Ordinary, all question types | 4,118 | 79 | None |
| Ordinary, exam sources | 2,147 | 79 | MOL-23, MOL-24, MOL-25, MOL-26 |
| Accurate CVP | 1,069 | 51 CVP lectures | CVP-A23 |

The ordinary exam-source pool accepts usable questions whose `kind` begins with Past, Lecture or Uploaded, then removes duplicates. The four uncovered lectures are MOL-23 Alternative Pathway of Carbohydrate Metabolism, MOL-24 Alcohol Metabolism, MOL-25 Vitamins Part I and MOL-26 Vitamins Part II. Their base learning-bank questions are authored concept checks, which do not pass the exam-source kind filter. The assembled exam pool contains no other eligible mapped question for these lectures after its filters and deduplication. They are covered in the broader all-types pool.

Accurate CVP draws from the corrected 19th booklet, eligible prior CVP papers and the repeat-question bank; it also requires a valid keyed MCQ, an allowed curriculum item and usable subject/category mapping. CVP-A23 Clinical Embryology / Review has no mapped question in the resulting eligible Accurate pool. Its base learning-bank questions are concept checks and are outside Accurate's source selection. This audit does not establish that no question about the subject exists elsewhere.

A lecture marked covered has at least one eligible question mapped to it in the audited pool. This is not a guarantee that any particular generated mock includes that lecture, nor a clinical validation of the mapping. Accurate selection also applies category targets, image requirements, mandatory repeat families and duplicate checks. No questions were invented or added to fill these gaps.

To repeat the audit in the initialized local application, run `await (await import('/phase2-practice-audit.mjs')).auditCoverage()`. Account-specific uploaded questions may change the ordinary pool.
