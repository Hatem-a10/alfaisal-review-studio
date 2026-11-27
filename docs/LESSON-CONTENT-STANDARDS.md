# Lesson content standards

Use this standard for Learn & Master, inline practice, and the academic material that supports them. Source text and original files are evidence. Editorial interpretation, reviewed adaptations, and machine-generated audit signals have separate provenance. Opening a lesson or revealing an answer never earns review completion.

## Minimum lesson quality

- Show the existing lecture title, subject, and stable ID. State the learning objectives supported by the canonical deck or verified curriculum. Map each to the teaching sections and actual source pages or slides. Flag an unsupported objective or unresolved conflict for review.
- Organize teaching by topic. Explain the concept, mechanism, terminology and exam implications. Give relevant examples or worked steps, a concise **What to remember** section and common traps. Use clinical context when it clarifies the objective. Retain the original lecture wording only where it serves a purpose and the source permits it.
- Give each learning objective at least one distinct teaching concept. Use the number of concepts the objectives and sources justify. Combine related mechanisms and divide broad lessons into topics with distinct learning goals. Integrate the teaching into the lesson prose and use the separate concept cards for individual review. Mark a Renal lesson **Under development** when its supplied slides or transcript are missing.
- Close with high-yield distinctions, definitions, mechanisms, formulas where relevant, retrieval practice and source-linked revision. Preserve explicit student marking and the independent three-pass tracker.
- Keep full slide decks and transcriptions in their existing library/storage paths. Identify transcription excerpts and related sources accurately. For shared decks preserve the exact slide range and the lecture association.

## Practice coverage and quality

Use [the configurable targets](content-audits/lecture-quality-targets.json) and [the audit](content-audits/lecture-coverage.md). Aim for 2–4 distinct useful MCQs per major objective, with 5 or more for especially complex or clinically important objectives when sources support them. The existing regression still requires at least five distinct core stems per mapped teaching topic. CVP A10–A13 also retain their five explained questions per objective. The 2–4 guideline describes editorial coverage per major curriculum objective and is independent of those test floors. Audit the actual topic groups, source bank and available images before setting a higher target. Flag a source gap when an objective cannot support the proposed count.

Each lecture should include medium-difficulty reasoning as well as recall. Use short applications, specimen interpretation, tracing, comparisons or calculation when relevant. A graded item needs a stable ID, an unambiguous stem, at least four meaningful choices for ordinary lesson practice, a verified key or explicitly verified accepted alternatives, a clear explanation of the key and specific feedback for every option, an appropriate difficulty tag, lecture/topic mapping and an exact source citation. Preserve verbatim source items and printed keys in original modes under their existing grading rules. Mark disputed keys, cancelled items, source adaptations and authored items explicitly. Deduplication for analysis cannot delete historical IDs, saved answers or attempts.

## Figures and discipline requirements

For a visual objective, aim for a usable source-supported figure with at least one relevant interpretation or recognition activity where available. Match the crop to the explanation. Keep orientation, labels, axes, units and scale where needed. Provide a useful caption and source locator, and check navigation and zoom on narrow and wide screens. Mask only the answer region for recall and reveal it in the same question view. Register files in approved private storage where required, record the exact source and SHA-256, and reuse valid originals. A figure from another source needs accurate attribution. The separate Accurate CVP mock image and source rules remain governed by [AGENTS.md](../AGENTS.md).

| Discipline | Expected emphasis |
| --- | --- |
| Anatomy | Names, spatial relations, blood supply, nerves, identifying features, clinical correlations, and labeled views for spatial concepts |
| Histology | Cell and tissue identification, differential features, orientation/magnification where known, and recognition using representative micrographs |
| Physiology | Mechanisms, feedback, graphs, equations with units, boundary conditions and worked applications where relevant |
| Embryology | Ordered development, origins, derivatives, congenital changes and labeled stage diagrams where useful |
| Molecular Medicine | Molecular interactions, pathways, controls, consequences of perturbation, clinical applications and course-supported calculations |
| OSPE and practicals | Labeled specimens or traces with a source locator, identification or interpretation task, and a checked rubric with answer-safe covers |

## Editorial workflow

1. Inspect the current runtime lecture, objectives, maps, source registry and practice inventory.
2. Identify the canonical slides and supporting sources. Check SHA-256 and existing associations before adding or reusing material.
3. Audit real gaps. Resolve uncertainty against the primary course source or record it for review. Add supported content and useful figures with exact locators.
4. Use stable source, lecture, topic and question IDs. Preserve mastery, review timestamps, choices, answer histories, booklet provenance and saved attempts.
5. Run `node scripts/audit-lecture-quality.mjs --write` before and after. Inspect the JSON and compare findings. Review text, figure rendering, difficulty, answer leakage and scoring in representative UI flows. Run relevant integrity and regression tests.
6. Submit the content diff, source evidence, before/after coverage and outstanding gaps through staging.

The audit measures repository-backed lesson content and mapped resources. It excludes private uploads and the separate booklet/exam generators. Syntactic validity and counts never establish educational adequacy, key correctness, R2 reachability or editorial approval.
