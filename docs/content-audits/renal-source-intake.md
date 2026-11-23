# REN 123 source intake

The REN 123 timetable controls current dates and group assignments. The supplied past-question booklet is recalled material. Its labels are indexed by topic because older lecture numbers can differ from the current timetable. Source PDFs, presentations and handouts are served only to signed-in students through the existing private asset route. The repository stores source titles, stable IDs, checksums, byte counts and locators.

| Current coverage | Source | Learner access |
| --- | --- | --- |
| A1 Posterior abdominal wall I | Dr. Olena, 28 pages | Native Learn & Master lesson with source-linked topics and explained MCQs |
| A2 Posterior abdominal wall II | Dr. Olena, 19 pages | Native Learn & Master lesson with source-linked topics and explained MCQs |
| A3 Kidney anatomy | Dr. Olena, 34 pages | Native Learn & Master lesson with source-linked topics and explained MCQs |
| A5 Kidney histology | Dr. Anikó, 24 slides | Native Learn & Master lesson with source-linked topics and explained MCQs |
| P1 Kidney structure and functions | Dr. Anzhelika, 21 pages | Nephron structure, vascular control and signaling |
| P2 Mass balances and renal clearance | Dr. Anzhelika, 18 pages | Mass balance, clearance markers and flow calculations |
| P3–P4 Glomerular filtration and renal blood flow | Dr. Anzhelika, 29 shared pages | Separate course lessons with shared source and distinct topics |
| OlyVIA microscopy | Supplied Renal OlyVIA slide-link handout | Private handout in Renal Labs and Material Library |
| Official schedule | Renal Schedule.pdf, five pages | Five weeks for M1, M2, F1 and F2, including A/B labs |
| Gross anatomy lab | Dr. Atif, 13 pages | Original handout, including figures |
| Histology lab I | Dr. Anikó, 11 slides | Original handout, including micrographs |
| Course orientation | Official syllabus (15 pages), block introduction (25 pages), student checklist (1 page) | Originals in the Renal Material Library |
| Past-paper practice | Recalled booklet, 294 pages | 946 interactive questions, with the complete PDF indexed by section. |

## Expanded Renal coverage

| Lecture | Guided topics | Explained MCQs |
| --- | ---: | ---: |
| A1 Posterior abdominal wall I | 4 | 20 |
| A2 Posterior abdominal wall II | 3 | 15 |
| A3 Kidney anatomy | 4 | 20 |
| A5 Kidney histology | 4 | 20 |
| P1 Kidney structure and functions | 3 | 15 |
| P2 Mass balances and renal clearance | 3 | 15 |
| P3 Glomerular filtration and renal plasma flow I | 2 | 10 |
| P4 Glomerular filtration and renal plasma flow II | 2 | 10 |

Learn & Master uses the shared topic navigation, inline grading, explanations and checkpoint. The 25 Renal topics each have five explained checks. Twenty are labeled booklet adaptations with stable source IDs and original page pointers. Other Renal lectures remain out of the lesson catalog until they have source-linked teaching and five checks per topic. The official timetable still shows the full curriculum. Existing review dates and answer IDs remain independent of the new content.

The five-page Renal Schedule PDF replaces the previous workbook grid for Renal and supplies 244 timed or shared rows. No time or group was inferred for blank or unassigned cells. The PDF grid takes priority for the displayed exam slots. Anatomy evening labs retain their shared toggle and GRC placeholders are left to personal settings. To reapply the PDF after a base timetable import, run `python scripts/import-renal-timetable-pdf.py /path/to/Renal-Schedule.pdf public/group-timetables.json` with pdfplumber installed.

The private Renal booklet pack includes 671 MCQs, 172 SAQs and 103 OSPE stations with source pages, spanning 281 PDF pages. It preserves the first 26 question records byte-for-byte at the field level, including their answer indexes. The expanded import uses the booklet’s printed answers and preserves item order within each type’s original run. It includes source crops for 139 image-bearing items, including figures carried forward with identified SAQ vignettes. The printed keys and all crops have not been manually reviewed item by item. Unclear delimiters, missing keys and unresolved figure links are reasons to leave material in the complete PDF instead of assuming a gradeable answer. Source links use physical PDF page numbers.

The fifteen original files and the expanded pack were verified by SHA-256 in private staging storage. The source originals, derived booklet, and figures are outside the public repository. The staging release needs no database migration. Production needs the verified assets transferred under the reviewed release process.
