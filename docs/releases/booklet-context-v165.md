# v1.65 — Booklet subjects, shared source context, and app name

Uniform title, Apple home-screen/application title, OpenGraph/Twitter title, web manifest name/short_name and server metadata: Review Studio. Existing installed iOS shortcuts may retain their user-saved title until renamed/re-added.

Booklet Subject dropdown defaults to All subjects, with Physiology, Anatomy, Histology and Embryology from the original booklet's section headings. Added Include MCQs, enabled for existing/new accounts unless explicitly disabled. MCQ/SAQ/OSPE filters combine with subject/completion filters, preserve all answer records, and sync only presentation preferences through the existing per-student navigation merge.

Source context audit: 121 linked parts retain their case text, 54 carry shared figures (including 15b/15c from 15a and 16b from 16a). Five OSPE A-prompts were found appended to the preceding key and restored to their correct questions: 20,57,65,104,151. Corrected OSPE56 rib figure and OSPE174 echo association; removed unrelated extra echo from173 and previous answer spill-over from178. SAQ18 previous answer spill-over removed. Canonical printed keys/explanations retained unchanged; no answer recalculation or progress migration. Dedicated OSPE viewer consumes the corrected canonical prompts/figures without altering marking rubrics.

Verified against original PDF pages37–38,241–242,246–247,280–281,299–300,304–305,329,356,369–373. Existing exact source PDF reused, no duplicate upload. MCQ234 references a renal graph not present on the original source page77; recorded as a review issue, no substitute figure invented.

Data preservation check: all1,214 IDs, options, answer indices, accepted answers, printed answers, canonical/legacy IDs, objective mappings, explanations and booklet revision identical before/after. No saved-account reads/writes, D1/R2 migrations or binding changes. Added geometry to available source figures for stable layout.

Validation: 8 focused logic checks, 4 isolated390px mobile browser checks (default filters,15b context/figure, written-only subject filter retaining MCQ completion, no overflow/nested scroll), build. No broad suite or subagents; physical iPhone/Safari home-screen cache not tested. Audit work retained in work/booklet-context/.
