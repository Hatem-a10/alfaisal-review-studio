# Audit 5 — Performance and scalability register

Target: 300 distinct optimization candidates. This is not 300 confirmed bottlenecks or 300 completed changes. Audit 4 remains separate. Scope: active MOL and REN plus shared runtime; archived CVP content is unchanged. Production remains untouched until separately authorized.

## Acceptance rules

For each item, first inspect implementation and measure a baseline. Mark already optimized, rejected (no benefit), or implemented only with evidence. Count an item as verified only after behavior equivalence, a reproducible performance improvement (or explicitly identified measurement capability), and passing candidate CI. Record exact commit, benchmark fixture, before/after metric, device/runtime, and limitations. No changes to student data, scoring, authentication, cache privacy, academic fidelity or regression coverage. Do not count measurement-only instrumentation as measured speed gains. Avoid mutually duplicative changes and speculative refactors.

Status reconciled against GitHub on 24 November 2026: 126 newly merged candidate scopes (108 speed-oriented changes and 18 measurement capabilities), 83 pre-existing mechanisms source-reviewed, 4 rejected/not-applicable items, 0 submitted candidates and 87 unassessed. The 300 distinct IDs remain intact; production and student data unchanged.

## Activity analytics

| ID | Candidate | Status |
|---|---|---|
| A5-001 | Reuse Riyadh Intl date formatter across timestamps | Merged #116; CI passed |
| A5-002 | Memoize resolved question alias chains within one history calculation | Merged #116; CI passed |
| A5-003 | Find earliest history date by linear scan rather than sorting | Merged #116; CI passed; modest timing signal |
| A5-004 | Avoid scanning history outside requested display window where safe | Merged #169; CI passed; 12-week activity scope |
| A5-005 | Accumulate aggregate counts without allocating intermediate values arrays | Merged #121; CI passed; allocation count evidence |
| A5-006 | Avoid rebuilding attempt lists when only date range changes | Merged #200; staging CI passed; scoped optimization |
| A5-007 | Index daily aggregate identities at ingestion | Existing coverage; day-keyed Maps and canonical-ID Sets during history ingestion |
| A5-008 | Reuse normalized date keys from validated records | Merged #121; CI passed |
| A5-009 | Incrementally update daily unique-question sets | Unassessed |
| A5-010 | Cache activity chart geometry between data changes | Merged #180; CI passed; cached activity heatmap dates |

## Startup

| ID | Candidate | Status |
|---|---|---|
| A5-011 | Minimal essential dashboard entry bundle | Existing coverage; reviewed scope in evidence |
| A5-012 | Defer nonessential startup scripts | Existing coverage; reviewed scope in evidence |
| A5-013 | Parallel independent boot requests | Merged #211; staging CI passed; scoped optimization |
| A5-014 | Preload essential module graph | Existing coverage; reviewed scope in evidence |
| A5-015 | Render shell before academic payload | Unassessed |
| A5-016 | Lazy-load authorized Admin implementation | Existing coverage; reviewed scope in evidence |
| A5-017 | Defer inactive course-pack initialization | Existing coverage; reviewed scope in evidence |
| A5-018 | Restore confirmed account-scoped dashboard snapshot before refresh | Unassessed |
| A5-019 | Coalesce redundant initial renders | Existing coverage; reviewed scope in evidence |
| A5-020 | Idle-schedule noncritical initialization | Existing coverage; reviewed scope in evidence |

## JavaScript execution

| ID | Candidate | Status |
|---|---|---|
| A5-021 | Eliminate provably unreachable runtime code | Merged #198; staging CI passed; scoped optimization |
| A5-022 | Tree-shake modular dependencies | Unassessed |
| A5-023 | Memoize practice analytics lecture-group lookup per calculation | Merged #117; CI passed |
| A5-024 | Reuse latest learning results per lesson within weak-topic calculation | Merged #137; CI passed; narrowed scope |
| A5-025 | Offload expensive question-bank processing to worker | Unassessed |
| A5-026 | Reuse lecture regex descriptors across decks in a cross-link computation | Merged #120; CI passed; combined benchmark |
| A5-027 | Avoid cloning already-isolated mock history attempts again | Merged #139; CI passed; narrowed scope |
| A5-028 | Delegate search result row clicks to the result list | Merged #128; CI passed; narrowed scope |
| A5-029 | Avoid duplicate JSON serialization of study records | Unassessed; structural comparison variant rejected; see evidence |
| A5-030 | Yield between long computation batches | Merged #205; staging CI passed; scoped optimization |

## Rendering

| ID | Candidate | Status |
|---|---|---|
| A5-031 | Retain search result rows when only selection or status changes | Merged #128; CI passed; allocation counts |
| A5-032 | Virtualize large question lists | Unassessed |
| A5-033 | Virtualize material-library list | Unassessed |
| A5-034 | Reuse unchanged dashboard DOM cards | Unassessed |
| A5-035 | Batch DOM reads and writes | Merged #220; staging CI passed; scoped optimization |
| A5-036 | Frame-align visual updates | Merged #213; staging CI passed; scoped optimization |
| A5-037 | Apply CSS containment to independent sections | Unassessed |
| A5-038 | Skip rendering offscreen content via content-visibility | Unassessed |
| A5-039 | Use compositor-friendly animation properties | Existing; source-reviewed public/redesign.css, public/phase3-ui.css; no new merge credit |
| A5-040 | Suspend nonessential hidden-tab visual updates | Merged #164; CI passed; hidden classic mock DOM scope |

## Cloudflare execution

| ID | Candidate | Status |
|---|---|---|
| A5-041 | Serve eligible public static assets without Worker invocation | Unassessed |
| A5-042 | Reduce Worker bundle initialization footprint | Unassessed |
| A5-043 | Lazy-initialize route-specific server modules | Unassessed |
| A5-044 | Edge-cache approved nonpersonal academic metadata | Unassessed |
| A5-045 | Parallel independent D1 and R2 operations | Merged #199; staging CI passed; scoped optimization |
| A5-046 | Deduplicate authentication lookups per request | Existing coverage; authenticate once at managed Worker entry |
| A5-047 | Reuse request-scoped configuration and authorization results | Existing coverage; pass request-scoped auth, account row, and config |
| A5-048 | Benchmark Smart Placement for database-heavy routes | Unassessed |
| A5-049 | Stream large resources without full memory buffering | Existing; source-reviewed lib/site-assets.ts, app/api/study-assets/[id]/route.ts; no new merge credit |
| A5-050 | Eliminate unnecessary internal server API round trips | Existing; source-reviewed app/api/materials/route.ts; no new merge credit |

## D1 queries

| ID | Candidate | Status |
|---|---|---|
| A5-051 | Profile hot queries with EXPLAIN QUERY PLAN | Merged #206; staging CI passed; measurement only |
| A5-052 | Add justified account-scoped composite indexes | Merged #206; staging CI passed; scoped optimization |
| A5-053 | Remove demonstrably redundant indexes | Rejected (no redundant secondary index; keep PK and account/time index) |
| A5-054 | Project only necessary database columns | Existing; source-reviewed app/api/materials/route.ts, app/api/decks/route.ts; no new merge credit |
| A5-055 | Eliminate duplicate progress D1 read on a changed revision | Merged #127; CI passed; narrowed scope |
| A5-056 | Batch compatible D1 statements | Existing; source-reviewed app/api/academic-config/route.ts; no new merge credit |
| A5-057 | Cursor-paginate large Admin datasets | Unassessed |
| A5-058 | Incrementally maintain costly analytics aggregates | Unassessed |
| A5-059 | Evaluate read replication with required consistency | Unassessed |
| A5-060 | Align hot filters and orderings with index structure | Merged #206; staging CI passed; scoped optimization |

## Synchronization

| ID | Candidate | Status |
|---|---|---|
| A5-061 | Transfer deltas instead of unnecessary complete snapshots | Existing coverage; reviewed scope in evidence |
| A5-062 | Coalesce closely spaced progress updates | Existing coverage; reviewed scope in evidence |
| A5-063 | Persist only changed record values | Existing; source-reviewed public/progress-delta.js, app/api/progress/route.ts; no new merge credit |
| A5-064 | Skip unchanged companion-store writes | Existing narrower: unchanged StudyVault companion values skip storage writes; source/test verified |
| A5-065 | Batch compatible IndexedDB writes | Existing coverage; reviewed scope in evidence |
| A5-066 | Adapt sync cadence to connectivity and pending changes | Unassessed |
| A5-067 | Pause unnecessary inactive-tab polling | Existing coverage; reviewed scope in evidence |
| A5-068 | Index frequently accessed local study records | Existing; source-reviewed public/device-storage.js; no new merge credit |
| A5-069 | Compress large recovery snapshots with verified decoding | Unassessed |
| A5-070 | Incrementally fingerprint unchanged snapshot subtrees | Unassessed |

## Course content

| ID | Candidate | Status |
|---|---|---|
| A5-071 | Chunk large course packs by lecture | Unassessed |
| A5-072 | Separate teaching text from question data loading | Unassessed |
| A5-073 | Defer detailed explanation loading until review | Unassessed |
| A5-074 | Fetch diagrams independently from lesson text | Existing; source-reviewed public/learning-ui.js; no new merge credit |
| A5-075 | Idle-prefetch next likely lesson within data budget | Unassessed |
| A5-076 | Pre-index lecture question associations in changelog generator | Merged #129; CI passed; combined benchmark |
| A5-077 | Pre-index source document associations in changelog generator | Merged #129; CI passed; combined benchmark |
| A5-078 | Share identical immutable metadata across course packs | Unassessed |
| A5-079 | Version-cache immutable lesson structures locally | Existing coverage; release-keyed offline cache for lesson data |
| A5-080 | Exclude archived CVP content from active startup dependencies | Existing coverage; reviewed scope in evidence |

## Practice exams and Anki

| ID | Candidate | Status |
|---|---|---|
| A5-081 | Compute booklet eligibility, pinned question and order index in one scan | Merged #151; CI passed; narrowed shared booklet scope |
| A5-082 | Update question analytics incrementally after answers | Unassessed |
| A5-083 | Index wrong-answer records by question within weak-topic calculation | Merged #137; CI passed; narrowed scope |
| A5-084 | Reuse parsed question fingerprints within a deduplication pass | Merged #120; CI passed; formerly mislabelled A5-074 |
| A5-085 | Sample questions without shuffling full bank where distribution unchanged | Merged #175; CI passed; sparse partial mock sampling |
| A5-086 | Render only active timed-exam question where interface permits | Existing; source-reviewed public/examplify-mode.js; no new merge credit |
| A5-087 | Isolate classic mock timer updates from question content rebuilds | Existing coverage; etTick updates timer and dock separately |
| A5-088 | Cache Anki due-card queue with precise invalidation | Unassessed |
| A5-089 | Reuse progress snapshot for Anki rating and deck-library rendering | Merged #142; CI passed; narrowed scope |
| A5-090 | Incrementally calculate mastery without rescoring entire bank | Unassessed |

## Network and assets

| ID | Candidate | Status |
|---|---|---|
| A5-091 | Generate responsive image sizes | Existing coverage; reviewed scope in evidence |
| A5-092 | Optimize medical diagram compression subject to visual equivalence | Unassessed |
| A5-093 | Evaluate AVIF for appropriate photos | Unassessed |
| A5-094 | Brotli-compress eligible text responses | Unassessed |
| A5-095 | Immutable-cache fingerprinted public assets | Merged #222; staging CI passed; scoped optimization |
| A5-096 | Use conditional requests for versioned resources | Existing coverage; reviewed scope in evidence |
| A5-097 | Lazy-load offscreen thumbnails and images | Existing coverage; reviewed scope in evidence |
| A5-098 | Subset fonts while preserving required glyphs | Existing coverage; Schibsted Latin/Latin-ext Unicode ranges and swap fallback |
| A5-099 | Consolidate duplicate CSS assets respecting Examplify isolation | Existing: build CSS grouped and minified with inline-style ordering preserved; source/test verified |
| A5-100 | Use efficient PDF byte-range delivery where supported | Existing coverage; reviewed scope in evidence |

## Build and verification

| ID | Candidate | Status |
|---|---|---|
| A5-101 | Cache unchanged curriculum generator outputs | Merged #215; staging CI passed; scoped optimization |
| A5-102 | Rebuild only changed academic pack inputs | Unassessed |
| A5-103 | Cache CI dependencies by lockfile | Existing coverage; reviewed scope in evidence |
| A5-104 | Parallelize independent regression suites | Merged #195; staging CI passed; scoped optimization |
| A5-105 | Balance test shards by observed durations | Unassessed |
| A5-106 | Reuse verified immutable build artifacts across stages | Unassessed |
| A5-107 | Reduce unnecessary production diagnostic payloads | Unassessed |
| A5-108 | Instrument startup navigation sync and API timing | Merged #216; staging CI passed; measurement only |
| A5-109 | Establish automated performance budgets | Existing coverage; reviewed scope in evidence |
| A5-110 | Load-test representative synthetic concurrent students | Unassessed |

## Search

| ID | Candidate | Status |
|---|---|---|
| A5-111 | Normalize matching searchable titles once per unchanged index entry | Merged #117; CI passed |
| A5-112 | Pre-tokenize searchable resource text at build time | Existing coverage; reviewed scope in evidence |
| A5-113 | Index exact title and resource ID lookup separately | Merged #183; CI passed; per-render exact lesson ID lookups |
| A5-114 | Intersect smallest posting lists first | Merged #130; CI passed |
| A5-115 | Limit top-k result sorting with equivalent stable ranking | Merged #122; CI passed |
| A5-116 | Debounce expensive search work without delaying keystrokes | Existing coverage; reviewed scope in evidence |
| A5-117 | Cancel superseded asynchronous search work | Merged #205; staging CI passed; scoped optimization |
| A5-118 | Reuse the last normalized query result per search-index session | Merged #128; CI passed; narrowed scope |
| A5-119 | Move large full-text index preparation off main thread | Unassessed |
| A5-120 | Load search index only on first search intent | Existing coverage; reviewed scope in evidence |

## Timetable

| ID | Candidate | Status |
|---|---|---|
| A5-121 | Index visible timetable events by local calendar day per board render | Merged #138; CI passed |
| A5-122 | Index group timetable rows by group identifier | Merged #190; staging CI passed; scoped optimization |
| A5-123 | Cache week calculations keyed by academic calendar version | Merged #189; staging CI passed; scoped optimization |
| A5-124 | Precompute recurrence expansion for bounded visible weeks | Merged #190; staging CI passed; scoped optimization |
| A5-125 | Reuse overlap layout until visible event set changes | Merged #171; CI passed; timetable lane geometry |
| A5-126 | Sort timetable event lanes once per calendar day | Existing coverage; campusLayout groups by day before sorting; reviewed |
| A5-127 | Avoid rebuilding hidden timetable views on clock tick | Existing narrower: second-tick timer toggles live event classes without rebuilding timetable board |
| A5-128 | Cache dashboard clock formatter for fixed Riyadh timezone | Merged #118; CI passed |
| A5-129 | Memoize event category counts per selected group | Unassessed |
| A5-130 | Render only visible calendar range with preserved navigation | Existing: academic timetable renders five days or one compact day |

## Dashboard selectors

| ID | Candidate | Status |
|---|---|---|
| A5-131 | Index due-review counts by date within timetable board | Merged #138; CI passed; narrowed scope |
| A5-132 | Index upcoming lecture targets and course finals within a planning run | Merged #144; CI passed; narrowed scope |
| A5-133 | Precompute stable course display order | Merged #189; staging CI passed; scoped optimization |
| A5-134 | Compute due overdue and completed task buckets in one traversal | Merged #137; CI passed |
| A5-135 | Select next guided same-course lesson in one ordered scan | Merged #152; CI passed; narrowed to guided next lecture |
| A5-136 | Reuse progress denominators for static lesson sets | Merged #186; CI passed; one-pass concept status counts |
| A5-137 | Update countdown digits only when displayed markup changes | Merged #138; CI passed; DOM operation counts |
| A5-138 | Share one saved-options and date snapshot across study activity view | Merged #135; CI passed; narrowed scope |
| A5-139 | Reuse normalized student group profile across timetable filtering | Merged #118; CI passed |
| A5-140 | Recompute only affected course progress after lesson change | Unassessed |

## Learning and reading

| ID | Candidate | Status |
|---|---|---|
| A5-141 | Pre-index concept IDs for adaptive question selection | Merged #143; CI passed; narrowed scope |
| A5-142 | Precompute ordered lesson section offsets | Unassessed |
| A5-143 | Reuse parsed rich-text representation across identical lesson versions | Merged #198; staging CI passed; scoped optimization |
| A5-144 | Cache sanitized static exam question markup fragments by source object | Merged #157; CI passed; narrow scope |
| A5-145 | Defer optional figure captions until corresponding figure is displayed | Unassessed |
| A5-146 | Reuse question option nodes between selection changes | Unassessed |
| A5-147 | Update progress-bar width without rebuilding lesson | Unassessed |
| A5-148 | Compute remaining section count from incremental completion changes | Unassessed |
| A5-149 | Avoid remeasuring unchanged reading pane on navigation | Unassessed |
| A5-150 | Persist reading position at bounded intervals and exit | Unassessed |

## Exam engine

| ID | Candidate | Status |
|---|---|---|
| A5-151 | Index question IDs to attempt positions in learning provenance checks | Merged #147; CI passed |
| A5-152 | Incrementally count original exam responses across active answer edits | Merged #158; CI passed; narrowed scope |
| A5-153 | Cache exam review filter membership per attempt revision | Merged #217; staging CI passed; scoped optimization |
| A5-154 | Count exam receipt scoring and validation tallies in one pass | Merged #125; CI passed |
| A5-155 | Precompute static option permutations at attempt creation | Existing: exam option and rationale permutations fixed when mock created |
| A5-156 | Index original exam source metadata for one render | Merged #154; CI passed; narrowed original exam scope |
| A5-157 | Reuse classic mock navigation grid cells on flag and answer changes | Merged #146; CI passed |
| A5-158 | Defer original-exam answer explanations until review | Existing coverage; originalQuestionMarkup renders feedback only after submission; reviewed narrow scope |
| A5-159 | Reuse classic exam timer dock nodes and avoid unchanged text writes | Merged #146; CI passed; narrowed scope |
| A5-160 | Compute mock-history ordering keys once before history sort | Merged #123; CI passed |

## OSPE and visual practice

| ID | Candidate | Status |
|---|---|---|
| A5-161 | Avoid whole-station-map allocation for one OSPE part lookup | Merged #126; CI passed; narrowed scope |
| A5-162 | Reuse validated station figure metadata | Merged #219; staging CI passed; scoped optimization |
| A5-163 | Precompute category-eligible OSPE circuit pools in one pass | Existing coverage; OspeCore.circuit uses category Map; reviewed |
| A5-164 | Reuse decoded current-station image when moving back | Unassessed |
| A5-165 | Prefetch next authorized station image under memory budget | Unassessed |
| A5-166 | Reuse stable mask geometry for unchanged viewport | Unassessed |
| A5-167 | Accumulate OSPE station scoring summary in one traversal | Existing coverage; OspeCore.score aggregates one pass; reviewed |
| A5-168 | Render only active OSPE review station image | Existing coverage; ospe review() renders one selected station; reviewed |
| A5-169 | Cache rubric tokenization without changing matching rules | Rejected (not applicable): OSPE uses explicit human marking; no text-token rubric matcher |
| A5-170 | Update OSPE countdown without rebuilding unchanged station | Existing coverage; timer updates clock until position changes; reviewed |

## Anki internals

| ID | Candidate | Status |
|---|---|---|
| A5-171 | Index local deck cloud IDs for remote membership lookup | Merged #142; CI passed; narrowed scope |
| A5-172 | Group cards by deck in one traversal | Merged #178; CI passed; per-deck Anki label projection |
| A5-173 | Precompute Anki due keys and read progress once per queue rebuild | Merged #126; CI passed; narrowed scope |
| A5-174 | Keep Anki deck-library list out of active card flips | Existing coverage; active-deck branch bypasses library list; reviewed |
| A5-175 | Reuse sanitized card template until card version changes | Merged #197; staging CI passed; scoped optimization |
| A5-176 | Defer Anki media decode until displayed card face | Merged #153; CI passed |
| A5-177 | Reuse permitted object URLs during same account session | Unassessed |
| A5-178 | Reuse per-card course scope within an Anki cross-link computation | Merged #120; CI passed; combined benchmark |
| A5-179 | Incrementally maintain per-deck review counters | Unassessed |
| A5-180 | Skip rebuilding unchanged study-control DOM between flips | Unassessed |

## Private materials

| ID | Candidate | Status |
|---|---|---|
| A5-181 | Index canonical material IDs within each library render | Merged #140; CI passed |
| A5-182 | Index reverse course reference membership within each library render | Merged #140; CI passed; narrowed scope |
| A5-183 | Project library candidates by lecture before metadata classification | Merged #156; CI passed; narrowed scope |
| A5-184 | Paginate large private-material listings with stable order | Unassessed |
| A5-185 | Defer media metadata extraction until needed | Existing coverage; deck parsing and media import deferred to user action |
| A5-186 | Deduplicate concurrent authorized reads for same immutable asset | Existing coverage; reviewed scope in evidence |
| A5-187 | Stream authorized upload hashing where supported | Existing; source-reviewed lib/personal-upload.ts; no new merge credit |
| A5-188 | Avoid duplicate client upload buffers | Unassessed |
| A5-189 | Batch verified metadata lookup for resource cards | Unassessed |
| A5-190 | Cache account-scoped material filter result until mutation | Unassessed |

## Offline storage

| ID | Candidate | Status |
|---|---|---|
| A5-191 | Batch read-only IndexedDB lookups in one transaction | Existing coverage; reviewed scope in evidence |
| A5-192 | Reuse Anki IndexedDB connection with versionchange cleanup | Existing coverage; ankiDBPromise single-flight, versionchange closes connection |
| A5-193 | Avoid device-store rehydration on routine view navigation | Existing coverage; device hydrate on boot or explicit account switch |
| A5-194 | Load companion stores on first feature access | Existing narrower: companion stores read lazily through StudyVault.read after metadata bootstrap |
| A5-195 | Store stable index metadata alongside records when validated | Unassessed |
| A5-196 | Use cursor iteration for large local collections | Unassessed |
| A5-197 | Avoid copying large binary blobs into JS arrays | Existing narrower: source streams assembled once into bounded Uint8Array, not copied into JS byte arrays |
| A5-198 | Bound in-memory decoded resource cache by bytes | Unassessed |
| A5-199 | Evict bounded source-search term cache by true LRU | Merged #162; CI passed; bounded true LRU |
| A5-200 | Reuse service-worker cache manifest parsing per version | Existing coverage; reviewed scope in evidence |

## Service worker

| ID | Candidate | Status |
|---|---|---|
| A5-201 | Benchmark cache-first for immutable approved public assets | Unassessed |
| A5-202 | Avoid redundant service-worker update checks | Existing narrower: offline registration has no app-level repeated service-worker update poll |
| A5-203 | Coalesce identical in-flight cache population requests | Merged #167; CI passed; public fingerprinted asset scope |
| A5-204 | Use navigation preload for eligible routes | Merged #170; CI passed; eligible navigation preload |
| A5-205 | Skip cache enumeration on unrelated fetch requests | Existing coverage; reviewed scope in evidence |
| A5-206 | Restrict activation cleanup to relevant old cache names | Existing coverage; reviewed scope in evidence |
| A5-207 | Batch cache warmup within network budget | Existing coverage; reviewed scope in evidence |
| A5-208 | Exclude ephemeral authenticated API requests from service-worker caches | Existing narrower coverage; cacheKind denies unrelated APIs |
| A5-209 | Use versioned offline fallback without repeated network probe | Unassessed |
| A5-210 | Benchmark offline bundle download concurrency | Merged #173; CI passed; measurement-only |

## CSS and typography

| ID | Candidate | Status |
|---|---|---|
| A5-211 | Remove proven unused selector rules from active bundles | Unassessed |
| A5-212 | Minify shipped CSS while preserving cascade | Existing coverage; reviewed scope in evidence |
| A5-213 | Split rarely used feature styles from entry stylesheet | Unassessed |
| A5-214 | Deduplicate identical keyframe declarations | Rejected / not applicable; no duplicate keyframe names across public CSS sources |
| A5-215 | Reduce expensive broad descendant selectors in hot views | Merged #212; staging CI passed; scoped optimization |
| A5-216 | Avoid animating layout-affecting properties | Unassessed |
| A5-217 | Guard redundant root theme CSS and dataset assignments | Merged #141; CI passed; DOM operation counts |
| A5-218 | Reuse derived palette for unchanged accent and theme | Merged #141; CI passed |
| A5-219 | Preload only the essential font face | Existing coverage; single index.html font preload; reviewed |
| A5-220 | Prefer metric-compatible fallback to reduce layout shift | Unassessed |

## Browser memory

| ID | Candidate | Status |
|---|---|---|
| A5-221 | Release large temporary arrays after pack indexing | Unassessed |
| A5-222 | Bound cached question-pool count | Unassessed |
| A5-223 | Bound source search query cache by entries and estimated bytes | Merged #132; CI passed; estimated retention only |
| A5-224 | Reuse scratch buffers in pure computation hot paths | Merged #192; staging CI passed; scoped optimization |
| A5-225 | Release inactive search result/index caches on dialog close | Existing coverage; search close clears index/results and pending callbacks |
| A5-226 | Release image decode references on route exit | Existing narrower: Anki closes/replaces card faces with object-URL revocation |
| A5-227 | Avoid retaining detached DOM through closures | Existing narrower: closing quick-search dialog releases results and DOM buttons |
| A5-228 | Reuse immutable source objects across views | Existing narrower: library snapshots reuse canonical source objects within a single render |
| A5-229 | Bound question-history memo maps to one calculation | Existing coverage; local Map lifetimes in questionHistory |
| A5-230 | Profile heap growth across repeated navigation and optimize retained allocations | Merged #209; staging CI passed; scoped optimization |

## HTTP request efficiency

| ID | Candidate | Status |
|---|---|---|
| A5-231 | Deduplicate identical concurrent account-scoped GET requests | Merged #174; CI passed; account-scoped Anki listing deduplication |
| A5-232 | Cancel superseded read requests on route changes | Merged #176; CI passed; cancel stale Library reads |
| A5-233 | Combine compatible small metadata reads | Merged #228; CI passed; one read-only D1 analytics batch |
| A5-234 | Reduce oversized response field sets per view | Existing coverage; account-scoped material and deck SELECT projections |
| A5-235 | Reuse stable response schema encoding | Merged #193; staging CI passed; scoped optimization |
| A5-236 | Avoid redundant HEAD before known GET resources | Merged #194; staging CI passed; scoped optimization |
| A5-237 | Prioritize critical requests over speculative prefetch | Merged #208; staging CI passed; scoped optimization |
| A5-238 | Limit concurrent speculative downloads by connection conditions | Merged #208; staging CI passed; scoped optimization |
| A5-239 | Use lightweight version checks before fetching unchanged catalogs | Unassessed |
| A5-240 | Avoid automatic retries for nonessential canceled work | Unassessed |

## Server data processing

| ID | Candidate | Status |
|---|---|---|
| A5-241 | Reuse validated request parsing result across middleware | Merged #201; staging CI passed; scoped optimization |
| A5-242 | Parse each bounded progress PUT/PATCH request once before validation | Existing coverage; one JSON.parse per request body |
| A5-243 | Precompute constant response metadata | Merged #193; staging CI passed; scoped optimization |
| A5-244 | Cache compiled schema validators per runtime | Rejected (no compiled validators in hot runtime paths) |
| A5-245 | Avoid repeated string normalization after validated canonical lookup | Merged #196; staging CI passed; scoped optimization |
| A5-246 | Batch R2 metadata lookups with bounded concurrency | Existing coverage; reviewed scope in evidence |
| A5-247 | Single-pass study-asset status report counts | Merged #127; CI passed; operation counts |
| A5-248 | Use D1 sort order directly for per-account deck listing | Existing narrower coverage; GET /api/decks already ORDER BY created_at DESC |
| A5-249 | Limit intermediate allocations during response serialization | Merged #195; staging CI passed; scoped optimization |
| A5-250 | Reuse immutable study-asset and publisher-pack lookup indexes per isolate | Merged #127; CI passed; operation counts |

## Admin workflows

| ID | Candidate | Status |
|---|---|---|
| A5-251 | Load student count before optional detailed breakdown | Merged #231; CI passed; overview only fetches account summary SELECT |
| A5-252 | Query only requested report date range | Unassessed |
| A5-253 | Aggregate report metrics in database when equivalent | Existing coverage; database-side SQL COUNT/SUM/GROUP BY analytics |
| A5-254 | Stream large authorized export output | Unassessed |
| A5-255 | Defer offscreen chart series computations | Unassessed |
| A5-256 | Reuse report filter options per dataset revision | Unassessed |
| A5-257 | Index audit event lists by timestamp and type | Existing coverage; audit timestamp/id index and chronological paging; no type filter |
| A5-258 | Batch permission-scoped student metadata reads | Existing coverage; one permission-scoped students JOIN and projection |
| A5-259 | Avoid repeatedly recomputing unchanged group roster totals | Unassessed |
| A5-260 | Cache derived report chart points within one view session | Merged #225; CI passed; cache stable Admin storage chart HTML |

## Academic generators

| ID | Candidate | Status |
|---|---|---|
| A5-261 | Parse source manifests once per build invocation | Existing coverage; build reads each manifest once per invocation |
| A5-262 | Reuse model and generated variant SHA-256 digests in asset generator | Merged #133; CI passed; narrowed scope |
| A5-263 | Avoid re-encoding unchanged generated JSON files | Merged #188; staging CI passed; scoped optimization |
| A5-264 | Use bounded parallelism for independent image generation | Merged #191; staging CI passed; scoped optimization |
| A5-265 | Deduplicate identical generated public asset bytes by digest | Merged #191; staging CI passed; scoped optimization |
| A5-266 | Avoid reading archived inputs for active-only builds | Unassessed |
| A5-267 | Precompute normalized question option indexes | Merged #192; staging CI passed; scoped optimization |
| A5-268 | Serialize large generated tables in deterministic streaming order | Unassessed |
| A5-269 | Cache validated source schema results by content hash | Unassessed |
| A5-270 | Skip writes when generated output is byte-identical | Existing coverage; reviewed scope in evidence |

## Packaging and delivery

| ID | Candidate | Status |
|---|---|---|
| A5-271 | Measure gzip and Brotli sizes for startup and deferred course entries | Merged #134; CI passed; measurement capability only |
| A5-272 | Deduplicate shared dependency chunks | Unassessed |
| A5-273 | Remove unused transitive runtime dependency imports after evidence | Merged #221; staging CI passed; scoped optimization |
| A5-274 | Minify eligible shipped JS while keeping debugging maps private | Existing coverage; reviewed scope in evidence |
| A5-275 | Exclude tests outside public startup source graph | Existing narrower coverage; startup bundler resolves only public sources |
| A5-276 | Exclude development tooling from production Worker dependency graph | Unassessed |
| A5-277 | Avoid copying unchanged assets during local staging build | Merged #188; staging CI passed; scoped optimization |
| A5-278 | Upload only changed immutable asset objects during release | Existing coverage; reviewed scope in evidence |
| A5-279 | Verify artifact hashes without rereading same unchanged local files | Unassessed |
| A5-280 | Parallelize independent release artifact checks | Unassessed |

## Reliability-preserving performance measurement

| ID | Candidate | Status |
|---|---|---|
| A5-281 | Record bounded local-only p50 and p95 view render timings | Merged #161; CI passed; measurement capability only |
| A5-282 | Capture long-task duration by study view | Merged #166; CI passed; measurement-only |
| A5-283 | Measure IndexedDB write amplification on synthetic data | Merged #202; staging CI passed; measurement only |
| A5-284 | Measure D1 rows read per common request | Merged #202; staging CI passed; measurement only |
| A5-285 | Measure R2 transferred bytes per resource journey | Merged #202; staging CI passed; measurement only |
| A5-286 | Measure client main-thread parsing time per course pack | Merged #203; staging CI passed; measurement only |
| A5-287 | Measure memory peak during large exam review | Merged #226; CI passed; measurement-only sampled synthetic exam heap |
| A5-288 | Measure cold versus warm cache startup separately | Merged #203; staging CI passed; measurement only |
| A5-289 | Use deterministic seeded data for reproducible benchmarks | Merged #202; staging CI passed; measurement only |
| A5-290 | Assert baseline equivalence within each measured optimization fixture | Existing coverage; benchmark tests compare exact outputs |

## Scale and cost tuning

| ID | Candidate | Status |
|---|---|---|
| A5-291 | Benchmark simultaneous device sync under realistic account isolation | Unassessed |
| A5-292 | Benchmark burst load at timetable transitions | Merged #218; staging CI passed; measurement only |
| A5-293 | Measure cache hit ratio by eligible resource class | Merged #203; staging CI passed; measurement only |
| A5-294 | Measure private PDF range transfer versus full response | Existing coverage; A5-285 full versus range byte test |
| A5-295 | Tune bounded background prefetch using measured hit rates | Unassessed |
| A5-296 | Measure Worker CPU per high-volume endpoint and tune hotspots | Unassessed |
| A5-297 | Measure D1 index storage cost versus read savings | Merged #206; staging CI passed; measurement only |
| A5-298 | Evaluate storage compression cost versus transfer savings | Merged #218; staging CI passed; measurement only |
| A5-299 | Measure rollback artifact size and optimize redundant copies | Unassessed |
| A5-300 | Tune synthetic regression dataset size for stable signal without excess CI runtime | Merged #218; staging CI passed; measurement only |

## Benchmark and verification receipts

Median of three measured executions unless otherwise indicated, on the candidate CI runner after an equivalence comparison; synthetic workloads, not site-wide or production timings. Retained memory and real-device performance require separate testing.

| ID | Baseline | Candidate | Operation-count evidence | Receipt |
|---|---:|---:|---|---|
| **A5-001** | 62.733 ms | 2.489 ms | 4,800 formatter constructions → 1 across four fixture executions | [#116](https://github.com/Hatem-a10/alfaisal-review-studio/pull/116) |
| **A5-002** | 22.761 ms | 9.859 ms | Per-call alias resolution memo; cycle and invalidation assertions | #116 |
| **A5-003** | 8.996 ms | 8.524 ms | No complete date-key sort; bounded display-mode scan | #116 |
| **A5-023** | 47.404 ms | 5.200 ms | 9,000 lecture lookups → 51 per fixture execution | [#117](https://github.com/Hatem-a10/alfaisal-review-studio/pull/117) |
| **A5-111** | 92.421 ms | 17.608 ms | WeakMap cache follows entry lifetime and title changes; warm searches only | #117 |
| **A5-128** | 45.150 ms | 1.055 ms | 2,880 formatter constructions → 1 across four fixture executions | [#118](https://github.com/Hatem-a10/alfaisal-review-studio/pull/118) |
| **A5-139** | 16.862 ms | 14.944 ms | 8,002 profile reads → 2 per timetable fixture | #118 |
| **A5-084** | 28.906 ms | 16.048 ms | 124-question deduplication fixture (historical label A5-074) | #120 |
| **A5-026 + A5-178** | 89.299 ms | 11.492 ms | Combined cross-link workload, 30 lectures and 8 decks | #120 |
| **A5-008** | 19.739 ms | 1.255 ms | 4,000 → 2 date format calls; seven measured runs after warmup | #121 |
| **A5-005 + A5-008** | 34.900 ms | 16.700 ms | Combined workload; 10,000 aggregate array entries → 0; seven runs | #121 |
| **A5-115** | 49.769 ms | 2.265 ms | 20,300 matched entries; maximum retained ranking entries 40; seven runs | #122 |
| **A5-160** | 29.268 ms | 3.138 ms | 47,392 → 2,376 timestamp parses, 2,500 synthetic mocks; seven runs | #123 |
| **A5-154** | 0.674 ms | 0.361 ms | 12,000-row receipt verification, 3 intermediate arrays → 0; seven runs | #125 |
| **A5-173** | 560.426 ms | 0.584 ms | 10,398 progress reads → 1; 750-card fixed-time synthetic queue; five runs | #126 |
| **A5-161** | 24.064 ms | 2.143 ms | 2,000 station-map entries → 0 per lookup; five runs | #126 |
| **A5-134** | 21.290 ms | 19.679 ms | 8,000 synthetic review tasks; one fewer intermediate array; seven runs | #137 |
| **A5-024 + A5-083** | 33.835 ms | 5.970 ms | Latest-result calls 1,041 → 21, wrong-answer reads 318,193 → 6,193 | #137 |
| **A5-121 + A5-131** | 2.871 ms | 1.948 ms | Board markup; task calls 5 → 1 and event date reads 3,404 → 1,539 | #138 |
| **A5-137** | 60 DOM assignments | 8 DOM assignments | Three countdowns over 20 simulated ticks; not browser paint timing | #138 |
| **A5-027** | 15.542 ms | 8.072 ms | Four → three clone calls for 100-attempt mock history; seven runs | #139 |
| **A5-181 + A5-182** | 24.631 ms | 2.420 ms | Source ID reads 248,124 → 3,061; reference reads 124,208 → 300 | #140 |
| **A5-217 + A5-218** | 14.034 ms | 0.865 ms | 301 → 1 derivations; 5,117 → 17 CSS writes; 602 → 2 dataset writes; simulated root | #141 |
| **A5-089 + A5-171** | 224.169 ms | 3.568 ms | 120-deck fixture; progress reads 120 → 1, cloud ID reads 14,700 → 360 | #142 |
| **A5-141** | 24.090 ms | 3.344 ms | 12,000 questions, 150 concepts; stable minimum scan plus concept index; combined workload | #143 |

| **A5-132** | 8.278 ms | 0.327 ms | 1,500 upcoming scans → 1; synthetic planning target lookup, not full planner time | #144 |

| **A5-157** | 100 navigator rebuilds | 1 navigator rebuild | 200 cells, 99 changes; unchanged node identity; synthetic DOM | #146 |
| **A5-159** | 6 dock rebuilds | 1 dock rebuild | Simulated timer ticks and expiration; no clock accuracy change | #146 |

| **A5-151** | 13.547 ms | 1.230 ms | Question ID reads 120,200 → 600; state reads 28,000 → 70; synthetic tracked exam | #147 |

| **A5-081** | 5.783 ms | 3.063 ms | 12,000 synthetic booklet questions, completed/random filter; equality matrix | #151 |
| **A5-135** | 636.029 ms | 405.630 ms | 100 repeated guided-next lookups across 50,000 items; no filtered array | #152 |
| **A5-176** | 4 media reads | 2 media reads | Displayed Anki front face and CSS; inactive media not decoded | #153 |
| **A5-156** | 20.428 ms | 2.465 ms | 1,000 questions, 1,201 sources; source ID reads 559,915 → 2,399 | #154 |

| **A5-183** | 878.302 ms | 7.445 ms | 200 lecture material lists, 13,068 sources; kind reads 10,347,600 → 3,738 | #156 |
| **A5-144** | 5.201 ms | 2.194 ms | 200 repeated question fragments; 1,858 → 400 escaped fragments | #157 |
| **A5-152** | 17.744 ms | 0.280 ms | 2,000 existing answers, 250 edits; includes render-time reconciliation | #158 |
| **A5-281** | not applicable | bounded p50/p95 | Local measurement-only; 120 samples per view/24 views maximum | #161 |

- #116: candidate `f00ae2435b6c0badb774a8db4507bdb969da093b`, [CI 45382234949](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45382234949), 1,313 full-suite tests passed, merge `7cd024d7ec3d9b861c48a1006f47f561fc402efd`.
- #117: candidate `8105ce4fee4537e20984b93f354244b47da6af94`, [CI 45382463701](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45382463701), 1,311 full-suite tests passed, merge `ef70a459f78d97ef892d490ff249cfe7b372c3f0`. Candidate started before #116 merged; integrated CI still required.
- #118: candidate `6813bfe17b19298e3e34b5884e7be8b536211dad`, [CI 45382764102](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45382764102), 1,315 full-suite tests passed, merge `2ea6a62a7b5de71d6a621411e22d2b4457a7ce0c`. Candidate started before #117 merged; integrated CI still required.
- #120: candidate `f6e4891a47410c3e4bf5264c5f171f14d4287924`, [CI 45383091302](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45383091302), success. A5-074 in its historical benchmark label means A5-084; the original diagram-loading candidate A5-074 remains unassessed. A5-178 was narrowed from general card search tokenization to per-card course-scope reuse; no general tokenization gain is claimed.
- #119: integrated evidence [CI 45383257697](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45383257697) passed; merge `b1e9f880fbb5ccec0b735ffe8e82624647148921`.
- #121: candidate `1f43138e578e38c525ea7f2448f24cf31c4ecbf3`, [CI 45383566906](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45383566906), 1,321 full-suite tests passed; merge `25f147380b1584e08f08548f271773811373ffab`.
- #122: candidate `82fa59042c8633472d797e67317e22810cc5921e`, [CI 45383782390](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45383782390), 1,320 full-suite tests passed; merge `f57523ba90fba855a569114a333627af68339bf2`. Candidate branched before #121 merged; integrated CI required.
- #123: candidate `695898aa41c28302125261a75ba6fbd083a08292`, [CI 45384086568](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45384086568), 1,323 full-suite tests passed; merge `4caf30bed0f74cf8c1814660975e4d37699f2513`. Candidate branched before #122 merged; integrated CI required.
- #125: candidate `8c94868907278840a815b5e68d8a778063f18d3b`, [CI 45384363446](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45384363446), 1,325 tests passed; merge `6cc651c382d7ee521aca5ba7b2ee68662f7d99ab`.
- #124: register correction CI 45384466867 passed; merge `c1cb25d25a5e5f1512690a452e966181bd46f236`.
- #126: candidate `bb57af557e835db0537f99147047c549382ec842`, [CI 45384988779](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45384988779), 1,330 tests passed; merge `dce18a1df0ff05293cb1a2f68a9119676bedf870`. A5-173 uses a fixed queue-build timestamp rather than repeated wall-clock reads; no persistent due index. A5-161 uses reverse lookup, not a persistent station index.
- #127: candidate `6b614cf536fbe53b466f046c59b38c910d3c1bd8`, [CI 45385197576](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45385197576), 1,330 tests passed; merge `b47a296a81a447a7630b5612c328164b0a042611`. A5-055 one D1 row per GET (consistent read point, CAS unchanged); A5-250 30,000 warm manifest key reads → 0 per fixture; A5-247 two intermediate filter arrays per batch → 0. Provider latency unmeasured.
- #128: candidate `5ebe90ef7e6452e8cb491ada8e22ede75b7ec7c2`, [CI 45385508587](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45385508587), 1,331 tests passed; merge `b71b5883a612f77d1eb4a2faac3552ed39456826`. Search navigation fixture creates 1,000 → 0 new result buttons; one delegated listener instead of per-row handlers and one result-set memo per index/session; actual DOM/device timing unmeasured.
- #129: candidate `5a044be747f90d3add886bb1c1034c0524eb1ec0`, [CI 45385633870](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45385633870), 1,332 full-suite tests passed; merge `7536e11418260d652a8a1225228596811311de53`. Combined A5-076/A5-077 changelog indexing: 141.307 → 45.102 ms; digest calls 20,000 → 10,000 (200 lessons, 10,000 questions, 1,600 sources).
- #130: candidate `061b0eb85069db54c73c9ebb50e6bff8c7e38a28`, [CI 45385790698](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45385790698), 1,335 full-suite tests passed; merge `226494b1e3ca7ecd1737502de885dbadcf30dca2`. A5-114 selective source search 10.383 → 1.566 ms; first-term insertion order preserved; union map 40,001 entries avoided, 2 matches retained.
- #131: evidence-only [CI 45386011456](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45386011456) passed; merge `7b0ae45479a0771d7e733f9a4b410ecf733ea095`.
- #132: candidate `ed99bad9ba63a25367a002a9817b71225b9b4c87`, [CI 45386304913](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45386304913), 1,340 full-suite tests passed; merge `ed50e19cb92f49bb0b3f2703086e3dfa2fe0fab9`. A5-223 bounded cache: 100 entries and estimated 2,097,152 retained bytes, fixture estimate 2,560,260 → 1,280,130; actual JS heap unmeasured.
- #133: candidate `292fd06082451aa2c493228e99dedbf970a11477`, [CI 45386422070](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45386422070), 1,339 full-suite tests passed; merge `f167fb6483365e40cb4881a376a85e3e2651f04a`. A5-262 model and generated variant SHA-256 digest calls 6 → 3, identical synthetic registry and output bytes; real asset generation not run.
- #134: candidate `abda03eff3718b43570598ceca213f430baac33b`, [CI 45386540888](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45386540888), 1,339 full-suite tests passed; merge `99274b6cbafff2c2a6c53d2d75c5aacff244a9d5`. A5-271 measurement only: startup 861,638 raw / 237,435 gzip / 209,807 Brotli quality-5 bytes; MOL 3,254,527 / 652,263 / 432,696; archived CVP 3,208,610 / 761,385 / 623,070. No transfer encoding change, no new speed claim.
- #135: candidate `c5beffccb65807ba20cc0f6e2af4e3185368a75b`, [CI 45386617986](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45386617986), 1,339 full-suite tests passed; merge `065069391180a6e6c10ba7e8890244191835f475`. A5-138 activity view options reads 369 → 1, clock reads 612 → 1; identical markup for four metrics and two ranges with fixed date; no whole-dashboard or actual-device timing claim.
- Combined latest staging tree requires independent integrated CI and browser/Worker profiling. Per-PR test counts differ because several branches were opened in parallel. No live deployment or production performance claim.
- #136: integrated candidate `6005dbdec8e3666712b43829f174f93868fb4ac8`, [CI 45386983116](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45386983116), 1,343 full-suite tests passed; merge `4aa8519502343f09dd58943739a1e9cc891db740`.
- #137: candidate `0971c383555dd5006a73429b44fdc74de0e45146`, [CI 45389842509](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45389842509), 1,345 tests passed; merge `24c720f14b95e879184b461e6adeb54ae545c16c`.
- #138: candidate `f4697427e2855f9c00fbfa916a1509dd2d36326c`, [CI 45389975812](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45389975812), 1,345 tests passed; merge `3775de48ee8894417389295f78c1b19fcdab11f7`. A5-131 is date-based due counts, not a persistent course/week completion index.
- #139: candidate `9bd3d57a50073b46d310012a879c40e0fe35eb9d`, [CI 45390538706](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45390538706), 1,348 tests passed; merge `db1dc7e8ffec59a6461b831b1ce60cf2028d6865`. Earlier candidate CI 45390095233 measured A5-029 structural comparison at 75.878 → 103.059 ms, despite serialization calls 3,016 → 2. Reverted; no new delta optimization claimed. A5-029 remains open for other approaches.
- #140: candidate `db448e2d19b9bbcd19e92dbf6b94fe9b57012f77`, [CI 45390385167](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45390385167), 1,347 tests passed; merge `8fccea1836f86bbc9100a484500c91d3b4db9b19`. A5-182 covers course references, not arbitrary aliases.
- #141: candidate `116d5d99db9bb7f159ad20999588abd8ec5d46bb`, [CI 45391146154](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45391146154), 1,352 tests passed; merge `84c05c8074a66e0988cc3c7c9a312737c41728ed`. Earlier CI 45390717823 failed due to test variable shadowing, corrected before merge; CSS recalculation timing remains unmeasured.
- #142: candidate `1236ce38c531fdbb4fe58638418622a79ddfc27d`, [CI 45390957296](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45390957296), 1,351 tests passed; merge `d6c0bc46f029c0284891e5af831bfe4951060b31`. A5-089 reduces reads, not storage transaction count; A5-171 is render-local cloud membership.
- #143: candidate `ea3c9c9fc72d1f2e8410ba65982e10ef01f26ac9`, [CI 45391243880](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45391243880), 1,352 tests passed; merge `50c0146d46e58d72d4b495bbce24dfe7025eb617`. A5-135 next actionable lesson remains open; #143 optimizes question selection only.
- #144: candidate `6880d1c0a7b3a0598d0c77ccb42d1624f7937121`, [CI 45391612418](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45391612418), 1,356 tests passed; merge `b591132c478e6d1fa1ceeb2e5135ffb3fd15f594`.
- #145: integrated evidence candidate `ae09b15aac2e4b0ecd410dfeb94b1307300ae878`, [CI 45392119203](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45392119203) passed; merge `66edfbd19939c97f3214fb78f48b0a1c7cfd9159`.
- #146: candidate `3cf9268e8e2968d19ce8e1f68748e98c4056485c`, [CI 45391921215](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45391921215), 1,358 tests passed; merge `7dd9a882b9c86250ea1cc631399c337d4c523b60`. A5-159 concerns timer DOM updates, not changes to elapsed time calculations.
- #147: candidate `bd49017c781c3014e1c70dc8d16abf44e3616de3`, [CI 45392281529](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45392281529), 1,360 tests passed; merge `3a00b02049faa568f9d0695f22015236e5c03e1f`. Provenance lookups only; academic scoring semantics unchanged in equivalence fixture.
- #149: archived-CVP demand-loading bugfix; candidate `c69ec53ed95b3931b9e95283675227f6dac22433`, [CI 45394683144](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45394683144) passed. Active MOL/REN pages no longer require CVP corrected booklet, pack or large CVP supplement; archives remain on demand. This is a correctness fix outside the 300 performance candidate IDs.
- #150: additional planning-capacity memo, candidate `d8434e9faef0229b3930f8de962c15de15a4aa27`, [CI 45396543564](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45396543564), 1,381 tests passed; merge `21ff88d20f2d811e90141aae238f52d5332045de`. Realistic capacity scan workload 228.825 → 36.653 ms (84,931 → 882 reads), though cheap callbacks can regress. **Not counted under A5-124** (recurrence expansion).
- #151: candidate `53a80b5d7990a134cc4b3e7ee57689493fc66694`, [CI 45395457887](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45395457887), 1,370 tests passed; merge `51f6a3980065d01cfaf0c9e776ee2ca4ace93d2a`. A5-081 shared booklet selection only.
- #152: candidate `a5da69861d1f16ebd419dd13b69f148f5cc1ff12`, [CI 45395682879](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45395682879), 1,370 tests passed; merge `cb003ba733b8b9f0fdf2ddb15c4a79ca77556853`. A5-135 narrowed to guided next-lecture scan, not an incomplete-lesson ranking engine.
- #153: candidate `359869a2a50e63a74a7c12ceb06e5e63d0d8a9e0`, [CI 45395741361](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45395741361), 1,370 tests passed; merge `48a796456c779fdc0f922f3236d4f315d3099f83`. Media request equivalence verified on synthetic card faces; no real-device decode timings.
- #154: candidate `d408dcc3c6c1593fb3e78d11cc51fc89b58353b2`, [CI 45396465517](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45396465517), 1,376 tests passed; merge `6a5e7d5d721bbdaae4157fa8a54a4a4cd6e50893`. Source index is per-render and preserves duplicate-first precedence.
- #155: candidate `c8fa8de1831c56855ab39455f4cd05e3d41d9a7b`, submitted; CI pending; conflicts with #154 reconciled in latest file; reverify integrated CI.
- #156: candidate `f413f74e05d4b2a8aca3cb4e76c0e647dd42557f`, submitted; CI pending. Association index built per material list, preserving duplicate IDs and source order.
- #156: candidate `f413f74e05d4b2a8aca3cb4e76c0e647dd42557f`, [CI 45397083814](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45397083814) 1,378 tests passed, merge `b2899870ddf836a66b4c161bd331671e2e9a189d`. A5-183 scoped to original library lecture-material projection.
- #157: candidate `9c5cbe8fab139cd881d75395df696db65c42cf87`, [CI 45397791555](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45397791555) 1,387 tests passed. A5-144 caches static question fragments, preserves same markup after in-place edits and across states. Initial cold-cache benchmark assertion revised to warm repeated-render benchmark before passing.
- #158: candidate `23ff25d6445f6133425036e2c5d7b6b266ba10e8`, [CI 45397862010](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45397862010) 1,388 tests passed. A5-152 input changes maintain response count; render reconciles external writes. Supersedes conflicted #155.
- #161: candidate `f0aa81c97549259c6285d755131ca02d6821ca9b`, [CI 45397997320](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45397997320) 1,388 tests passed; merge `545d78a3ccf6bafcd99431d8c7f866cb998b67a5`. A5-281 is timing measurement-only (synchronous render duration, not network/async completion).
- #162: candidate `72eba8f7e29f577d1ae711da3107568f443f40bb`, submitted CI 45398589141; A5-199 LRU term cache remains unmerged until success.
- #163: extra (unmatched 300-register ID), candidate `e8f7b832b42eea6e2ce48ae2b5ca2ecf262f78be`, [CI 45398339033](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45398339033), 1,394 tests passed; merge `808ef8856f5072e052fb64decabe789f845ae477`. Synthetic four GETs of immutable compressed payload 287.155→84.057 ms with 4→1 base64 decodes. Not credited as a register candidate.
- The first evidence-only run 45382874003 failed because benchmark receipt rows duplicated register ID syntax (305 matched rows, expected 300). Receipt formatting corrected without changing the validation test. The same run measured A5-003 at 11.660 ms baseline vs 11.702 ms candidate; no repeatable wall-time improvement claimed.

No production release, migrations, student-data edits or archived curriculum edits.

## Audit 5 merge reconciliation — 24 November 2026

The fifteen previously unrecorded candidate scopes below are merged into `cloudflare-staging`, with successful candidate-head staging CI. These PR links document narrowed scopes and benchmarks; passing synthetic CI is not evidence of production-wide latency gains.

- **A5-199**: [merged PR #162](https://github.com/Hatem-a10/alfaisal-review-studio/pull/162); [successful staging CI 45398589141](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45398589141).
- **A5-040**: [merged PR #164](https://github.com/Hatem-a10/alfaisal-review-studio/pull/164); [successful staging CI 45398779135](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45398779135).
- **A5-282**: [merged PR #166](https://github.com/Hatem-a10/alfaisal-review-studio/pull/166); [successful staging CI 45399097226](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45399097226). Measurement-only capability, not a speed gain.
- **A5-203**: [merged PR #167](https://github.com/Hatem-a10/alfaisal-review-studio/pull/167); [successful staging CI 45399222206](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45399222206).
- **A5-004**: [merged PR #169](https://github.com/Hatem-a10/alfaisal-review-studio/pull/169); [successful staging CI 45400751470](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45400751470).
- **A5-204**: [merged PR #170](https://github.com/Hatem-a10/alfaisal-review-studio/pull/170); [successful staging CI 45400048125](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45400048125).
- **A5-125**: [merged PR #171](https://github.com/Hatem-a10/alfaisal-review-studio/pull/171); [successful staging CI 45400534132](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45400534132).
- **A5-210**: [merged PR #173](https://github.com/Hatem-a10/alfaisal-review-studio/pull/173); [successful staging CI 45400615774](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45400615774). Measurement-only capability, not a speed gain.
- **A5-085**: [merged PR #175](https://github.com/Hatem-a10/alfaisal-review-studio/pull/175); [successful staging CI 45401595267](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45401595267).
- **A5-172**: [merged PR #178](https://github.com/Hatem-a10/alfaisal-review-studio/pull/178); [successful staging CI 45402010575](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45402010575).
- **A5-010**: [merged PR #180](https://github.com/Hatem-a10/alfaisal-review-studio/pull/180); [successful staging CI 45403909856](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45403909856).
- **A5-231**: [merged PR #174](https://github.com/Hatem-a10/alfaisal-review-studio/pull/174); [successful staging CI 45403810122](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45403810122).
- **A5-232**: [merged PR #176](https://github.com/Hatem-a10/alfaisal-review-studio/pull/176); [successful staging CI 45404176204](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45404176204).
- **A5-113**: [merged PR #183](https://github.com/Hatem-a10/alfaisal-review-studio/pull/183); [successful staging CI 45404544379](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45404544379); merge `7bf85e0b8fab5be7055814a2344c09ff6fa2075c`.
- **A5-136**: [merged PR #186](https://github.com/Hatem-a10/alfaisal-review-studio/pull/186); [successful staging CI 45405171431](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45405171431); merge `e2a48fcf1f390377fc333dcb6aff3968a9f85568`. Narrowly covers single-pass runtime concept mastery status; no persistent cache or grading rule changes.

[#177](https://github.com/Hatem-a10/alfaisal-review-studio/pull/177) corrected a flaky hard timing assertion for A5-199 while keeping strict behavior and operation-count checks, not an extra candidate. [#181](https://github.com/Hatem-a10/alfaisal-review-studio/pull/181) added six source-verified existing mechanisms, not newly implemented gains. Candidate **A5-113** was merged in [PR #183](https://github.com/Hatem-a10/alfaisal-review-studio/pull/183) after staging CI passed and is credited as one speed-oriented implementation. Archived-CVP load correction remains outside Audit 5. No production release, migrations, or student-data changes.

**71 merged + 61 existing + 1 rejected + 0 submitted + 167 unassessed = 300.** Of merged items, 67 target performance and 4 are measurement-only.

## Audit 5 continuation — merge and CI receipts (24 November 2026)

Each line below credits only numbered candidate scopes actually merged on `cloudflare-staging`, with complete successful staging CI on the PR head. Narrowed scopes, synthetic fixture limitations and before/after operations are in the PR and associated tests. No live production speedups are inferred from synthetic data.

- **A5-263, A5-277**: [PR #188](https://github.com/Hatem-a10/alfaisal-review-studio/pull/188); [passing staging CI 45407291716](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45407291716); immutable JSON output once; skip byte-identical asset writes.
- **A5-123, A5-133**: [PR #189](https://github.com/Hatem-a10/alfaisal-review-studio/pull/189); [passing staging CI 45407134059](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45407134059); week-sort cache and stable course order.
- **A5-122, A5-124**: [PR #190](https://github.com/Hatem-a10/alfaisal-review-studio/pull/190); [passing staging CI 45407745493](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45407745493); catalog group index; bounded English recurrence dates.
- **A5-264, A5-265**: [PR #191](https://github.com/Hatem-a10/alfaisal-review-studio/pull/191); [passing staging CI 45408227410](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45408227410); bounded image-conversion concurrency and hash duplicate elimination.
- **A5-224, A5-267**: [PR #192](https://github.com/Hatem-a10/alfaisal-review-studio/pull/192); [passing staging CI 45408627506](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45408627506); scratch-map reuse and normalized option cache.
- **A5-235, A5-243**: [PR #193](https://github.com/Hatem-a10/alfaisal-review-studio/pull/193); [passing staging CI 45409332367](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45409332367); immutable admin payload serialization and static MIME metadata.
- **A5-236**: [PR #194](https://github.com/Hatem-a10/alfaisal-review-studio/pull/194); [passing staging CI 45409906100](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45409906100); remove redundant R2 HEAD from authorized range GET.
- **A5-104, A5-249**: [PR #195](https://github.com/Hatem-a10/alfaisal-review-studio/pull/195); [passing staging CI 45410298946](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45410298946); parallel independent CI suites and reusable no-store header templates.
- **A5-245**: [PR #196](https://github.com/Hatem-a10/alfaisal-review-studio/pull/196); [passing staging CI 45410534304](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45410534304); preserve filename encoding with no encoder/decoder roundtrip.
- **A5-175**: [PR #197](https://github.com/Hatem-a10/alfaisal-review-studio/pull/197); [passing staging CI 45411657089](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45411657089); sanitized media-free Anki markup cache.
- **A5-021, A5-143**: [PR #198](https://github.com/Hatem-a10/alfaisal-review-studio/pull/198); [passing staging CI 45411928591](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45411928591); remove unused progress scan; reusable static guide paragraph HTML.
- **A5-045**: [PR #199](https://github.com/Hatem-a10/alfaisal-review-studio/pull/199); [passing staging CI 45412340673](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45412340673); overlap independent authorized D1 and R2 reads.
- **A5-006**: [PR #200](https://github.com/Hatem-a10/alfaisal-review-studio/pull/200); [passing staging CI 45412677029](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45412677029); reuse unchanged activity history attempt list.
- **A5-241**: [PR #201](https://github.com/Hatem-a10/alfaisal-review-studio/pull/201); [passing staging CI 45413914149](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45413914149); reuse validation on unmodified progress snapshots; revalidate after receipt merge.
- **A5-283, A5-284, A5-285, A5-289**: [PR #202](https://github.com/Hatem-a10/alfaisal-review-studio/pull/202); [passing staging CI 45414279051](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45414279051); synthetic device/D1/R2 measurements and seeded fixtures — measurement only; no direct speed gain.

**A5-286, A5-288, A5-293**: [merged PR #203](https://github.com/Hatem-a10/alfaisal-review-studio/pull/203); [passing staging CI 45414603438](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45414603438); merge `8ef8ca2f5e3dec9afc1b86af7aee06c8c4c6eab4`. These are measurement-only capabilities with synthetic timing proxies; not direct speed gains.

**Snapshot reconciliation: 122 merged + 71 existing + 2 rejected + 0 submitted + 105 unassessed = 300.** Seventeen merged scopes are measurement-only, and 105 are speed-oriented. D1 index migration is not yet applied; production remains untouched.


## Audit 5 continuation (100 → 122) — PR and CI receipts

Only the newly merged IDs below add new candidate credit. Each linked PR passed the full staging CI on its head; benchmark fixtures are synthetic unless the PR explicitly describes a different runtime. No live production performance claims are inferred. The index migration was committed, not executed on staging or production D1.

- **A5-030, A5-117**: [PR #205](https://github.com/Hatem-a10/alfaisal-review-studio/pull/205), [passing CI 45416612222](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45416612222); cooperative search index building and superseded-session cancellation.
- **A5-051, A5-052, A5-060, A5-297**: [PR #206](https://github.com/Hatem-a10/alfaisal-review-studio/pull/206), [passing CI 45418427995](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45418427995); D1 index plan/size measurements and an account/time index migration; migration not applied to staging or production.
- **A5-237, A5-238**: [PR #208](https://github.com/Hatem-a10/alfaisal-review-studio/pull/208), [passing CI 45418273747](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45418273747); offline shell priority and connectivity-bounded precache concurrency.
- **A5-230**: [PR #209](https://github.com/Hatem-a10/alfaisal-review-studio/pull/209), [passing CI 45418702585](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45418702585); allocation-light lecture crosslink invalidation.
- **A5-013**: [PR #211](https://github.com/Hatem-a10/alfaisal-review-studio/pull/211), [passing CI 45419430582](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45419430582); parallel critical module downloads while preserving execution order.
- **A5-215**: [PR #212](https://github.com/Hatem-a10/alfaisal-review-studio/pull/212), [passing CI 45419817593](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45419817593); skip already decorated modal/tab/completion nodes.
- **A5-036**: [PR #213](https://github.com/Hatem-a10/alfaisal-review-studio/pull/213), [passing CI 45420034920](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45420034920); frame-align mobile scroll geometry measurements.
- **A5-101**: [PR #215](https://github.com/Hatem-a10/alfaisal-review-studio/pull/215), [passing CI 45420354616](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45420354616); reuse verified unchanged learning gzip output.
- **A5-108**: [PR #216](https://github.com/Hatem-a10/alfaisal-review-studio/pull/216), [passing CI 45420670088](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45420670088); local-only API timing categorization, no identifiers (measurement only).
- **A5-153**: [PR #217](https://github.com/Hatem-a10/alfaisal-review-studio/pull/217), [passing CI 45421066289](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45421066289); one exam state snapshot per navigation paint.
- **A5-292, A5-298, A5-300**: [PR #218](https://github.com/Hatem-a10/alfaisal-review-studio/pull/218), [passing CI 45421747663](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45421747663); synthetic timetable/transfer benchmarks and bounded fixture sizing (measurement only).
- **A5-162**: [PR #219](https://github.com/Hatem-a10/alfaisal-review-studio/pull/219), [passing CI 45422058496](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45422058496); cache static station figure markup in all reveal/zoom modes.
- **A5-035**: [PR #220](https://github.com/Hatem-a10/alfaisal-review-studio/pull/220), [passing CI 45422463954](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45422463954); batch DOM selection reads before copy removal.
- **A5-273**: [PR #221](https://github.com/Hatem-a10/alfaisal-review-studio/pull/221), [passing CI 45422917031](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45422917031); checksum-verified minifier output reuse across unchanged builds.
- **A5-095**: [PR #222](https://github.com/Hatem-a10/alfaisal-review-studio/pull/222), [passing CI 45423240968](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45423240968); immutable caching for exact fingerprinted public course and stylesheet packs.

Additional source review (no new optimization credit): A5-039, A5-049, A5-050, A5-054, A5-056, A5-063, A5-068, A5-074, A5-086, A5-187. Checks are scoped to cited source files, not comprehensive real-device performance validation. A5-214 was marked not applicable because public CSS has no duplicate declared keyframe names.

## Audit 5 continuation: source-reviewed redundancies and rejected ideas (24 November 2026)

The following six candidates were inspected against current staging source rather than counted as new performance gains:

- **A5-053 rejected.** [`db/schema.ts`](https://github.com/Hatem-a10/alfaisal-review-studio/blob/cloudflare-staging/db/schema.ts) defines one account-scoped secondary index for `study_materials` plus the distinct primary-key access path. No redundant second index was found to remove. Existing index query-plan tests are in `tests/cloudflare-staging-audit5-material-d1-index.test.mjs`.
- **A5-079 existing.** [`phase3-cache-policy.mjs`](https://github.com/Hatem-a10/alfaisal-review-studio/blob/cloudflare-staging/public/phase3-cache-policy.mjs) assigns a release-versioned service-worker core cache and identifies `/api/lesson-data` as cacheable. [`review-sw.js`](https://github.com/Hatem-a10/alfaisal-review-studio/blob/cloudflare-staging/public/review-sw.js) stores and reads those resources; no additional account-scoped lesson data cache is justified here.
- **A5-185 existing, narrow scope.** [`anki.js`](https://github.com/Hatem-a10/alfaisal-review-studio/blob/cloudflare-staging/public/anki.js) opens the IndexedDB deck store lazily; package parsing (`AnkiEngine.parse`) starts only when the user imports a deck. This source review does not claim that every possible media format has deferred metadata parsing.
- **A5-244 rejected.** The hot progress, personal material and Anki API handlers have explicit hand-written validation; they do not compile schemas at request time. A compiled-validator cache would not save an existing runtime cost. This is not a recommendation to bypass validation.
- **A5-261 existing.** [`scripts/client-scripts.mjs`](https://github.com/Hatem-a10/alfaisal-review-studio/blob/cloudflare-staging/scripts/client-scripts.mjs) parses `lab-curriculum.json` once within `optimizeClientScripts`, and its `readingURL` manifest inputs are distinct in the current source. No duplicate manifest parse was observed within this build invocation.
- **A5-294 existing.** [`tests/cloudflare-staging-audit5-resource-measurement.test.mjs`](https://github.com/Hatem-a10/alfaisal-review-studio/blob/cloudflare-staging/tests/cloudflare-staging-audit5-resource-measurement.test.mjs) uses `serveAsset` to compare full and ranged synthetic R2 responses: 1,048,576 bytes full versus 65,536 bytes ranged. That directly covers the requested diagnostic; it does not assert measured production latency gains.

These are **four existing mechanisms and two not-applicable candidates**, not six newly implemented optimizations. Existing/rejected totals change; merged totals do not. No app runtime or production changes accompany this reconciliation.

## Audit 5 continuation: three new merges and five source-reviewed mechanisms (24 November 2026)

- **A5-260**: [PR #225](https://github.com/Hatem-a10/alfaisal-review-studio/pull/225), successful staging [CI 45438660554](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45438660554). Unchanged Admin storage charts reuse the same derived markup; cache invalidation is tied to the build report, limit, and private-media object.
- **A5-287**: [PR #226](https://github.com/Hatem-a10/alfaisal-review-studio/pull/226), successful staging [CI 45438800346](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45438800346). Synthetic, discrete-stage heap high-water measurement only; not a speed gain or continuously monitored production peak.
- **A5-233**: [PR #228](https://github.com/Hatem-a10/alfaisal-review-studio/pull/228), successful staging [CI 45439713757](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45439713757). Five independent, read-only Admin analytics statements are collected in one D1 batch without relaxing the minimum-group privacy threshold.

The following five were already covered by source, and are **not newly implemented gains**:

- **A5-007:** `public/activity-metrics.mjs` `questionHistory` constructs date-keyed `days` Maps and `questions` Sets as attempts are ingested; unique question identities are not reconstructed by sorting every event.
- **A5-046:** `worker/staging.ts` performs one managed or staging authentication at the Worker entry and propagates the authorized request into route handling. This review does not assert downstream route-level owner verification never occurs.
- **A5-047:** `worker/staging.ts` reuses per-request `auth`, `config` and selected account `row` across its canonical path dispatch and `controlRoute` call.
- **A5-253:** `lib/admin-control.mjs` performs owner analytics counts and activity totals with SQL `COUNT`, `SUM` and `GROUP BY`, rather than loading all student rows into browser JavaScript.
- **A5-258:** `lib/admin-control.mjs` `studentList` joins account and role/assignment rows within one D1 query and returns just the requested, permission-scoped page.

Pending but **not credited here**: A5-251 in [PR #229](https://github.com/Hatem-a10/alfaisal-review-studio/pull/229); it must pass staging CI and merge before implementation credit.

No production release, schema application, student-data editing, or academic/scoring changes.

## Audit 5 continuing — verified A5-251 and three existing optimizations (24 November 2026)

- **A5-251 merged:** [PR #231](https://github.com/Hatem-a10/alfaisal-review-studio/pull/231), successful [staging CI 45440580731](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45440580731), switched owner overview to one privacy-suppressed aggregate SELECT while Analytics retains the separate, five-query D1 batch. This is one newly implemented speed-oriented scope.
- **A5-098 existing:** `public/redesign.css` already declares self-hosted Schibsted Grotesk with distinct Latin and Latin-ext `@font-face` files, specific `unicode-range` blocks, weight ranges, `font-display:swap`, and system-ui fallback. Thus basic glyph subsetting is already in use. This is not evidence of optimal font byte counts or coverage of every non-Latin glyph.
- **A5-234 existing:** `app/api/materials/route.ts` and `app/api/decks/route.ts` project precise per-view D1 columns for listings rather than using `SELECT *`, including explicit user scoping. The register should not credit the same projection twice as a new runtime change.
- **A5-257 existing, constrained:** `staging/admin-control.sql` defines `control_audit_recent(created_at DESC,id)`; `lib/admin-control.mjs` requests only the recent timestamp-window with identical ordering and bounded page size. The current audit UI has no action-type filter, so no speculative type index was added.

These three reviewed mechanisms are **not newly implemented**. Staging-only GitHub merges do not establish production deployment or measured live performance.

## Pre-existing implementation coverage (source review, not new speed gains)

Scope below reflects existing mechanisms verified in repository source and related regression tests where identified. It does not establish comprehensive coverage of broader candidate wording or new performance gains. Do not count these entries as newly implemented.

| Candidate | Source and existing test evidence | Observed coverage and limitations |
|---|---|---|
| **A5-011** | scripts/client-scripts.mjs; scripts/performance-budget.mjs; tests/client-scripts.test.mjs | Shared boot bundle uses one classic-script request and 1.25 MiB raw / 0.35 MiB gzip limits; not proof of globally minimal entry size. |
| **A5-012** | public/ospe-entry.js; public/anki-entry.js; public/phase2-runtime.mjs; tests/cloudflare-staging-deferred-ui.test.mjs | Lab, OSPE, Anki and practice implementation is deferred; additional startup opportunities remain. |
| **A5-014** | scripts/client-scripts.mjs; tests/module-preload.test.mjs | Static import graph preloaded without promoting dynamic imports. |
| **A5-016** | public/admin-panel.js | Admin center imported on opening the authorized interface; server authorization remains independent. |
| **A5-017** | public/course-packs.js; tests/course-packs.test.mjs; tests/cloudflare-staging-audit4-course-pack-loading.test.mjs | Course packs loaded on demand, serialized and deduplicated; core contains no packed lecture content. |
| **A5-019** | public/app.js; tests/startup-sync.test.mjs | Initial intermediate render calls suppressed until the permitted boot render. |
| **A5-020** | public/anki-entry.js | Anki deferred initialization via idle callback with bounded fallback; other noncritical tasks remain reviewable. |
| **A5-061** | public/app.js; public/progress-delta.js; tests/startup-sync.test.mjs | Revision-checked PATCH chosen when small; complete backup fallback retained. |
| **A5-062** | public/app.js; tests/startup-sync.test.mjs | Busy/queued guards and debounced resync preserve edits arriving in flight. |
| **A5-065** | public/device-storage.js; tests/device-storage.test.mjs | Pending durable writes grouped into a readwrite transaction with retry on failure. |
| **A5-067** | public/app.js; tests/startup-sync.test.mjs | Periodic sync suppressed when hidden/offline; dirty visibility-transition sync intentionally retained. |
| **A5-080** | public/course-packs.js; tests/cloudflare-staging-archive-pack-scope.test.mjs | Active learning, mixed views and stale routes exclude archived CVP pack; authorized archive still works. |
| **A5-091** | scripts/prepare-study-assets.mjs; public/reading-tools.js | 480/960px variants generated only when smaller and selected with srcset/sizes; original fallback preserved. |
| **A5-096** | lib/site-assets.ts; lib/publisher-packs.ts; tests/cloudflare-staging-audit4-asset-boundaries.test.mjs | ETag conditional responses preserve object existence checks and avoid reading bodies. |
| **A5-097** | public/reading-tools.js; public/learning-ui.js | Eligible figures and responsive diagrams use lazy images; not blanket lazy-loading all exam figures. |
| **A5-100** | lib/site-assets.ts; tests/cloudflare-staging-audit4-asset-boundaries.test.mjs | PDF-compatible byte-range responses use R2 range reads and validate If-Range/size. |
| **A5-103** | .github/workflows/cloudflare-staging-check.yml | setup-node npm dependency cache already enabled; workflow uses npm ci. |
| **A5-109** | scripts/performance-budget.mjs; scripts/client-scripts.mjs | Enforced startup raw/gzip size and request budget in independent builds. |
| **A5-112** | scripts/source-demand.mjs; public/source-demand.js; tests/cloudflare-staging-audit4-source-index.test.mjs | Source reading terms/postings generated at build time; global quick search is a separate index. |
| **A5-116** | public/phase1-search.mjs; tests/search-session-regression.test.mjs | 75 ms input debounce with immediate keyboard flush and IME guard. |
| **A5-120** | public/phase1-search.mjs; public/source-demand.js; tests/search-session-regression.test.mjs | Quick search index on dialog opening, enrichment only after nonblank input; source index on first use. |
| **A5-186** | public/source-demand.js; tests/cloudflare-staging-audit4-source-index.test.mjs | Versioned reading URL has one in-flight request with multiple consumers; other private reads remain separate. |
| **A5-191** | public/device-storage.js; tests/device-storage.test.mjs | Keys and values read together from one account-scoped readonly transaction. |
| **A5-200** | public/review-sw.js | Manifest fetched and parsed once during each worker install, not every request. |
| **A5-205** | public/review-sw.js; public/phase3-cache-policy.mjs; tests/phase3-offline.test.mjs | Unrelated method/origin/API bypasses cache work; private enumeration reserved for account clearing/fallback. |
| **A5-206** | public/phase3-cache-policy.mjs; tests/cloudflare-staging-audit2-offline-cache.test.mjs | Activation removes only obsolete core cache names and preserves private/account caches. |
| **A5-207** | public/review-sw.js | Offline warmup is already bounded to batches of eight eligible assets; optimal batch size not measured. |
| **A5-212** | scripts/client-styles.mjs; tests/runtime-optimization.test.mjs | CSS minified and grouped with inline style ordering preserved. |
| **A5-246** | app/api/study-assets/route.ts | R2 status heads already batched with concurrency 30; upload verification uses batches of 10. |
| **A5-270** | scripts/learning-payload.mjs; scripts/lecture-changelog.mjs | Identical generated lesson payload and full changelog skip rewriting; other generator outputs remain reviewable. |
| **A5-274** | scripts/client-scripts.mjs; tests/client-scripts.test.mjs | Eligible shared and course JS minified without generated source maps, identifiers preserved. |
| **A5-278** | scripts/transfer-production-assets.mjs | Content-addressed transfer skips existing object uploads and verifies readback; only static code review, no production operation. |
| **A5-064** | public/study-vault.js; tests/cloudflare-staging-audit5-existing-coverage-006.test.mjs | `StudyVault.set` compares JSON values before writing; unchanged underlying device storage paths outside the companion setter remain unassessed. |
| **A5-099** | scripts/client-styles.mjs; tests/runtime-optimization.test.mjs | Existing combined/minified CSS keeps inline-style ordering boundaries; no additional bundle reduction claimed. |
| **A5-169** | public/ospe.js; public/ospe-core.mjs; tests/cloudflare-staging-audit5-existing-coverage-006.test.mjs | Marking points are awarded explicitly by the student; there is no tokenization-based rubric matcher to memoize. Avoid inventing an automatic grading mechanism. |
| **A5-197** | public/source-demand.js; tests/cloudflare-staging-audit5-existing-coverage-006.test.mjs | Reading parser retains typed stream chunks and performs a single size-checked typed-array assembly. Does not assert zero copies in browser-native Blob internals. |
| **A5-202** | public/phase3-offline.mjs; tests/cloudflare-staging-audit5-existing-coverage-006.test.mjs | Worker registration relies on browser lifecycle; no custom recurring `registration.update()` timer exists. Native browser update checks are outside app scope. |
| **A5-226** | public/anki.js; tests/cloudflare-staging-audit5-existing-coverage-006.test.mjs | Anki card replacement/exit revokes object URLs. Other image surfaces are not covered by this narrower classification. |
| **A5-127** | public/hub-upgrade.js; tests/cloudflare-staging-audit5-existing-007.test.mjs | One-second paint toggles live event state, with separate day-rollover rendering; no general view diffing claim. |
| **A5-130** | public/schedule-ui.js; tests/cloudflare-staging-audit5-existing-007.test.mjs | Five-day academic grid on desktop and one active-day column in compact mode; other calendar views remain unassessed. |
| **A5-155** | public/exam-engine.js; tests/cloudflare-staging-audit5-existing-007.test.mjs | Option and reason permutation fixed on mock creation, persisted in the attempt; no per-render reshuffle. |
| **A5-193** | public/device-storage.js; tests/cloudflare-staging-audit5-existing-007.test.mjs | Additional regression coverage for the pre-existing device hydration scope already classified by #172; NOT additional candidate credit. |
| **A5-194** | public/study-vault.js; tests/cloudflare-staging-audit5-existing-007.test.mjs | Vault boot reads only metadata; companion JSON is read when feature invokes StudyVault.read. Not proof of zero startup reads elsewhere. |
| **A5-227** | public/phase1-search.mjs; tests/cloudflare-staging-audit5-existing-007.test.mjs | Quick-search close discards index, results, references and child buttons; other detached DOM closure paths remain unassessed. |
| **A5-228** | public/library-list.js; tests/cloudflare-staging-audit5-existing-007.test.mjs | Canonical source map exposes original source objects during single synchronous library render; no cross-account cache claim. |
