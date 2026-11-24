# Audit 5 — Performance and scalability register

Target: 300 distinct optimization candidates. This is not 300 confirmed bottlenecks or 300 completed changes. Audit 4 remains separate. Scope: active MOL and REN plus shared runtime; archived CVP content is unchanged. Production remains untouched until separately authorized.

## Acceptance rules

For each item, first inspect implementation and measure a baseline. Mark already optimized, rejected (no benefit), or implemented only with evidence. Count an item as verified only after behavior equivalence, a reproducible performance improvement (or explicitly identified measurement capability), and passing candidate CI. Record exact commit, benchmark fixture, before/after metric, device/runtime, and limitations. No changes to student data, scoring, authentication, cache privacy, academic fidelity or regression coverage. Do not count measurement-only instrumentation as measured speed gains. Avoid mutually duplicative changes and speculative refactors.

Status at this evidence update: 14 candidates merged with candidate CI passed; 1 submitted (#125); 285 unassessed. A5-003 has mixed timing across runs; its reduced sorting work is established, not a repeatable wall-time speedup. Combined benchmarks do not establish separate per-change speed gains. The evidence-only PR also exercises the integrated branch.

## Activity analytics

| ID | Candidate | Status |
|---|---|---|
| A5-001 | Reuse Riyadh Intl date formatter across timestamps | Merged #116; CI passed |
| A5-002 | Memoize resolved question alias chains within one history calculation | Merged #116; CI passed |
| A5-003 | Find earliest history date by linear scan rather than sorting | Merged #116; CI passed; modest timing signal |
| A5-004 | Avoid scanning history outside requested display window where safe | Unassessed |
| A5-005 | Accumulate aggregate counts without allocating intermediate values arrays | Merged #121; CI passed; allocation count evidence |
| A5-006 | Avoid rebuilding attempt lists when only date range changes | Unassessed |
| A5-007 | Index daily aggregate identities at ingestion | Unassessed |
| A5-008 | Reuse normalized date keys from validated records | Merged #121; CI passed |
| A5-009 | Incrementally update daily unique-question sets | Unassessed |
| A5-010 | Cache activity chart geometry between data changes | Unassessed |

## Startup

| ID | Candidate | Status |
|---|---|---|
| A5-011 | Minimal essential dashboard entry bundle | Unassessed |
| A5-012 | Defer nonessential startup scripts | Unassessed |
| A5-013 | Parallel independent boot requests | Unassessed |
| A5-014 | Preload essential module graph | Unassessed |
| A5-015 | Render shell before academic payload | Unassessed |
| A5-016 | Lazy-load authorized Admin implementation | Unassessed |
| A5-017 | Defer inactive course-pack initialization | Unassessed |
| A5-018 | Restore confirmed account-scoped dashboard snapshot before refresh | Unassessed |
| A5-019 | Coalesce redundant initial renders | Unassessed |
| A5-020 | Idle-schedule noncritical initialization | Unassessed |

## JavaScript execution

| ID | Candidate | Status |
|---|---|---|
| A5-021 | Eliminate provably unreachable runtime code | Unassessed |
| A5-022 | Tree-shake modular dependencies | Unassessed |
| A5-023 | Memoize practice analytics lecture-group lookup per calculation | Merged #117; CI passed |
| A5-024 | Memoize expensive pure selectors with precise invalidation | Unassessed |
| A5-025 | Offload expensive question-bank processing to worker | Unassessed |
| A5-026 | Reuse lecture regex descriptors across decks in a cross-link computation | Merged #120; CI passed; combined benchmark |
| A5-027 | Replace redundant deep copies with targeted immutable updates | Unassessed |
| A5-028 | Delegate compatible repeated DOM listeners | Unassessed |
| A5-029 | Avoid duplicate JSON serialization of study records | Unassessed |
| A5-030 | Yield between long computation batches | Unassessed |

## Rendering

| ID | Candidate | Status |
|---|---|---|
| A5-031 | Patch changed regions instead of full-page rerenders | Unassessed |
| A5-032 | Virtualize large question lists | Unassessed |
| A5-033 | Virtualize material-library list | Unassessed |
| A5-034 | Reuse unchanged dashboard DOM cards | Unassessed |
| A5-035 | Batch DOM reads and writes | Unassessed |
| A5-036 | Frame-align visual updates | Unassessed |
| A5-037 | Apply CSS containment to independent sections | Unassessed |
| A5-038 | Skip rendering offscreen content via content-visibility | Unassessed |
| A5-039 | Use compositor-friendly animation properties | Unassessed |
| A5-040 | Suspend nonessential hidden-tab visual updates | Unassessed |

## Cloudflare execution

| ID | Candidate | Status |
|---|---|---|
| A5-041 | Serve eligible public static assets without Worker invocation | Unassessed |
| A5-042 | Reduce Worker bundle initialization footprint | Unassessed |
| A5-043 | Lazy-initialize route-specific server modules | Unassessed |
| A5-044 | Edge-cache approved nonpersonal academic metadata | Unassessed |
| A5-045 | Parallel independent D1 and R2 operations | Unassessed |
| A5-046 | Deduplicate authentication lookups per request | Unassessed |
| A5-047 | Reuse request-scoped configuration and authorization results | Unassessed |
| A5-048 | Benchmark Smart Placement for database-heavy routes | Unassessed |
| A5-049 | Stream large resources without full memory buffering | Unassessed |
| A5-050 | Eliminate unnecessary internal server API round trips | Unassessed |

## D1 queries

| ID | Candidate | Status |
|---|---|---|
| A5-051 | Profile hot queries with EXPLAIN QUERY PLAN | Unassessed |
| A5-052 | Add justified account-scoped composite indexes | Unassessed |
| A5-053 | Remove demonstrably redundant indexes | Unassessed |
| A5-054 | Project only necessary database columns | Unassessed |
| A5-055 | Eliminate N+1 database reads | Unassessed |
| A5-056 | Batch compatible D1 statements | Unassessed |
| A5-057 | Cursor-paginate large Admin datasets | Unassessed |
| A5-058 | Incrementally maintain costly analytics aggregates | Unassessed |
| A5-059 | Evaluate read replication with required consistency | Unassessed |
| A5-060 | Align hot filters and orderings with index structure | Unassessed |

## Synchronization

| ID | Candidate | Status |
|---|---|---|
| A5-061 | Transfer deltas instead of unnecessary complete snapshots | Unassessed |
| A5-062 | Coalesce closely spaced progress updates | Unassessed |
| A5-063 | Persist only changed record values | Unassessed |
| A5-064 | Skip unchanged companion-store writes | Unassessed |
| A5-065 | Batch compatible IndexedDB writes | Unassessed |
| A5-066 | Adapt sync cadence to connectivity and pending changes | Unassessed |
| A5-067 | Pause unnecessary inactive-tab polling | Unassessed |
| A5-068 | Index frequently accessed local study records | Unassessed |
| A5-069 | Compress large recovery snapshots with verified decoding | Unassessed |
| A5-070 | Incrementally fingerprint unchanged snapshot subtrees | Unassessed |

## Course content

| ID | Candidate | Status |
|---|---|---|
| A5-071 | Chunk large course packs by lecture | Unassessed |
| A5-072 | Separate teaching text from question data loading | Unassessed |
| A5-073 | Defer detailed explanation loading until review | Unassessed |
| A5-074 | Fetch diagrams independently from lesson text | Unassessed |
| A5-075 | Idle-prefetch next likely lesson within data budget | Unassessed |
| A5-076 | Precompute lecture-to-question mappings | Unassessed |
| A5-077 | Precompute source-document and lecture associations | Unassessed |
| A5-078 | Share identical immutable metadata across course packs | Unassessed |
| A5-079 | Version-cache immutable lesson structures locally | Unassessed |
| A5-080 | Exclude archived CVP content from active startup dependencies | Unassessed |

## Practice exams and Anki

| ID | Candidate | Status |
|---|---|---|
| A5-081 | Precompute eligible pools for common practice filters | Unassessed |
| A5-082 | Update question analytics incrementally after answers | Unassessed |
| A5-083 | Index wrong-answer records by course lecture and question | Unassessed |
| A5-084 | Reuse parsed question fingerprints within a deduplication pass | Merged #120; CI passed; formerly mislabelled A5-074 |
| A5-085 | Sample questions without shuffling full bank where distribution unchanged | Unassessed |
| A5-086 | Render only active timed-exam question where interface permits | Unassessed |
| A5-087 | Isolate timer rendering from exam content | Unassessed |
| A5-088 | Cache Anki due-card queue with precise invalidation | Unassessed |
| A5-089 | Batch Anki review persistence and derived stats | Unassessed |
| A5-090 | Incrementally calculate mastery without rescoring entire bank | Unassessed |

## Network and assets

| ID | Candidate | Status |
|---|---|---|
| A5-091 | Generate responsive image sizes | Unassessed |
| A5-092 | Optimize medical diagram compression subject to visual equivalence | Unassessed |
| A5-093 | Evaluate AVIF for appropriate photos | Unassessed |
| A5-094 | Brotli-compress eligible text responses | Unassessed |
| A5-095 | Immutable-cache fingerprinted public assets | Unassessed |
| A5-096 | Use conditional requests for versioned resources | Unassessed |
| A5-097 | Lazy-load offscreen thumbnails and images | Unassessed |
| A5-098 | Subset fonts while preserving required glyphs | Unassessed |
| A5-099 | Consolidate duplicate CSS assets respecting Examplify isolation | Unassessed |
| A5-100 | Use efficient PDF byte-range delivery where supported | Unassessed |

## Build and verification

| ID | Candidate | Status |
|---|---|---|
| A5-101 | Cache unchanged curriculum generator outputs | Unassessed |
| A5-102 | Rebuild only changed academic pack inputs | Unassessed |
| A5-103 | Cache CI dependencies by lockfile | Unassessed |
| A5-104 | Parallelize independent regression suites | Unassessed |
| A5-105 | Balance test shards by observed durations | Unassessed |
| A5-106 | Reuse verified immutable build artifacts across stages | Unassessed |
| A5-107 | Reduce unnecessary production diagnostic payloads | Unassessed |
| A5-108 | Instrument startup navigation sync and API timing | Unassessed |
| A5-109 | Establish automated performance budgets | Unassessed |
| A5-110 | Load-test representative synthetic concurrent students | Unassessed |

## Search

| ID | Candidate | Status |
|---|---|---|
| A5-111 | Normalize matching searchable titles once per unchanged index entry | Merged #117; CI passed |
| A5-112 | Pre-tokenize searchable resource text at build time | Unassessed |
| A5-113 | Index exact title and resource ID lookup separately | Unassessed |
| A5-114 | Intersect smallest posting lists first | Unassessed |
| A5-115 | Limit top-k result sorting with equivalent stable ranking | Merged #122; CI passed |
| A5-116 | Debounce expensive search work without delaying keystrokes | Unassessed |
| A5-117 | Cancel superseded asynchronous search work | Unassessed |
| A5-118 | Reuse results for unchanged normalized query and scope | Unassessed |
| A5-119 | Move large full-text index preparation off main thread | Unassessed |
| A5-120 | Load search index only on first search intent | Unassessed |

## Timetable

| ID | Candidate | Status |
|---|---|---|
| A5-121 | Index events by local calendar day | Unassessed |
| A5-122 | Index group timetable rows by group identifier | Unassessed |
| A5-123 | Cache week calculations keyed by academic calendar version | Unassessed |
| A5-124 | Precompute recurrence expansion for bounded visible weeks | Unassessed |
| A5-125 | Reuse overlap layout until visible event set changes | Unassessed |
| A5-126 | Sort event lanes once per day rather than per card | Unassessed |
| A5-127 | Avoid rebuilding hidden timetable views on clock tick | Unassessed |
| A5-128 | Cache dashboard clock formatter for fixed Riyadh timezone | Merged #118; CI passed |
| A5-129 | Memoize event category counts per selected group | Unassessed |
| A5-130 | Render only visible calendar range with preserved navigation | Unassessed |

## Dashboard selectors

| ID | Candidate | Status |
|---|---|---|
| A5-131 | Index lesson completion by course and week | Unassessed |
| A5-132 | Reuse grouped upcoming deadline arrays per calendar revision | Unassessed |
| A5-133 | Precompute stable course display order | Unassessed |
| A5-134 | Compute overdue count and breakdown in one traversal | Unassessed |
| A5-135 | Derive next actionable lesson without sorting full curriculum | Unassessed |
| A5-136 | Reuse progress denominators for static lesson sets | Unassessed |
| A5-137 | Update countdown labels at displayed precision only | Unassessed |
| A5-138 | Share derived dashboard summary across cards | Unassessed |
| A5-139 | Reuse normalized student group profile across timetable filtering | Merged #118; CI passed |
| A5-140 | Recompute only affected course progress after lesson change | Unassessed |

## Learning and reading

| ID | Candidate | Status |
|---|---|---|
| A5-141 | Pre-index objective IDs to lesson content | Unassessed |
| A5-142 | Precompute ordered lesson section offsets | Unassessed |
| A5-143 | Reuse parsed rich-text representation across identical lesson versions | Unassessed |
| A5-144 | Cache static quiz markup fragments without personal answers | Unassessed |
| A5-145 | Defer optional figure captions until corresponding figure is displayed | Unassessed |
| A5-146 | Reuse question option nodes between selection changes | Unassessed |
| A5-147 | Update progress-bar width without rebuilding lesson | Unassessed |
| A5-148 | Compute remaining section count from incremental completion changes | Unassessed |
| A5-149 | Avoid remeasuring unchanged reading pane on navigation | Unassessed |
| A5-150 | Persist reading position at bounded intervals and exit | Unassessed |

## Exam engine

| ID | Candidate | Status |
|---|---|---|
| A5-151 | Index question IDs to attempt positions | Unassessed |
| A5-152 | Compute answer counts incrementally on answer changes | Unassessed |
| A5-153 | Cache exam review filter membership per attempt revision | Unassessed |
| A5-154 | Count exam receipt scoring and validation tallies in one pass | Submitted #125; CI pending |
| A5-155 | Precompute static option permutations at attempt creation | Unassessed |
| A5-156 | Avoid repeated parse of unchanged exam source metadata | Unassessed |
| A5-157 | Reuse navigation grid cells on flag changes | Unassessed |
| A5-158 | Defer explanation formatting until review pane opens | Unassessed |
| A5-159 | Avoid recomputing elapsed time outside displayed timer interval | Unassessed |
| A5-160 | Compute mock-history ordering keys once before history sort | Merged #123; CI passed |

## OSPE and visual practice

| ID | Candidate | Status |
|---|---|---|
| A5-161 | Index stations by circuit and question ID | Unassessed |
| A5-162 | Reuse validated station figure metadata | Unassessed |
| A5-163 | Precompute circuit eligible station lists | Unassessed |
| A5-164 | Reuse decoded current-station image when moving back | Unassessed |
| A5-165 | Prefetch next authorized station image under memory budget | Unassessed |
| A5-166 | Reuse stable mask geometry for unchanged viewport | Unassessed |
| A5-167 | Batch station response-derived summaries | Unassessed |
| A5-168 | Defer offscreen station review images | Unassessed |
| A5-169 | Cache rubric tokenization without changing matching rules | Unassessed |
| A5-170 | Calculate circuit progress using changed station only | Unassessed |

## Anki internals

| ID | Candidate | Status |
|---|---|---|
| A5-171 | Index decks by storage and account-scoped IDs | Unassessed |
| A5-172 | Group cards by deck in one traversal | Unassessed |
| A5-173 | Maintain due-time ordered index per deck revision | Unassessed |
| A5-174 | Avoid sorting deck list during unchanged card review | Unassessed |
| A5-175 | Reuse sanitized card template until card version changes | Unassessed |
| A5-176 | Defer media decode until card face is displayed | Unassessed |
| A5-177 | Reuse permitted object URLs during same account session | Unassessed |
| A5-178 | Reuse per-card course scope within an Anki cross-link computation | Merged #120; CI passed; combined benchmark |
| A5-179 | Incrementally maintain per-deck review counters | Unassessed |
| A5-180 | Skip rebuilding unchanged study-control DOM between flips | Unassessed |

## Private materials

| ID | Candidate | Status |
|---|---|---|
| A5-181 | Index library metadata by canonical material ID | Unassessed |
| A5-182 | Build alias reverse lookup once per catalog revision | Unassessed |
| A5-183 | Use lightweight list projections before detailed metadata | Unassessed |
| A5-184 | Paginate large private-material listings with stable order | Unassessed |
| A5-185 | Defer media metadata extraction until needed | Unassessed |
| A5-186 | Deduplicate concurrent authorized reads for same immutable asset | Unassessed |
| A5-187 | Stream authorized upload hashing where supported | Unassessed |
| A5-188 | Avoid duplicate client upload buffers | Unassessed |
| A5-189 | Batch verified metadata lookup for resource cards | Unassessed |
| A5-190 | Cache account-scoped material filter result until mutation | Unassessed |

## Offline storage

| ID | Candidate | Status |
|---|---|---|
| A5-191 | Batch read-only IndexedDB lookups in one transaction | Unassessed |
| A5-192 | Reuse account-scoped IndexedDB connection with lifecycle cleanup | Unassessed |
| A5-193 | Avoid rehydrating untouched stores during route changes | Unassessed |
| A5-194 | Load companion stores on first feature access | Unassessed |
| A5-195 | Store stable index metadata alongside records when validated | Unassessed |
| A5-196 | Use cursor iteration for large local collections | Unassessed |
| A5-197 | Avoid copying large binary blobs into JS arrays | Unassessed |
| A5-198 | Bound in-memory decoded resource cache by bytes | Unassessed |
| A5-199 | Evict least recently used approved cache entries incrementally | Unassessed |
| A5-200 | Reuse service-worker cache manifest parsing per version | Unassessed |

## Service worker

| ID | Candidate | Status |
|---|---|---|
| A5-201 | Benchmark cache-first for immutable approved public assets | Unassessed |
| A5-202 | Avoid redundant service-worker update checks | Unassessed |
| A5-203 | Coalesce identical in-flight cache population requests | Unassessed |
| A5-204 | Use navigation preload for eligible routes | Unassessed |
| A5-205 | Skip cache enumeration on unrelated fetch requests | Unassessed |
| A5-206 | Restrict activation cleanup to relevant old cache names | Unassessed |
| A5-207 | Batch cache warmup within network budget | Unassessed |
| A5-208 | Avoid caching resources that will never be reused | Unassessed |
| A5-209 | Use versioned offline fallback without repeated network probe | Unassessed |
| A5-210 | Benchmark offline bundle download concurrency | Unassessed |

## CSS and typography

| ID | Candidate | Status |
|---|---|---|
| A5-211 | Remove proven unused selector rules from active bundles | Unassessed |
| A5-212 | Minify shipped CSS while preserving cascade | Unassessed |
| A5-213 | Split rarely used feature styles from entry stylesheet | Unassessed |
| A5-214 | Deduplicate identical keyframe declarations | Unassessed |
| A5-215 | Reduce expensive broad descendant selectors in hot views | Unassessed |
| A5-216 | Avoid animating layout-affecting properties | Unassessed |
| A5-217 | Reduce repeated style recalculation from root theme writes | Unassessed |
| A5-218 | Reuse CSS custom property values for stable theme | Unassessed |
| A5-219 | Preload only essential font face | Unassessed |
| A5-220 | Prefer metric-compatible fallback to reduce layout shift | Unassessed |

## Browser memory

| ID | Candidate | Status |
|---|---|---|
| A5-221 | Release large temporary arrays after pack indexing | Unassessed |
| A5-222 | Bound cached question-pool count | Unassessed |
| A5-223 | Bound search query cache by entries and bytes | Unassessed |
| A5-224 | Reuse scratch buffers in pure computation hot paths | Unassessed |
| A5-225 | Clear inactive view-specific cached derived data | Unassessed |
| A5-226 | Release image decode references on route exit | Unassessed |
| A5-227 | Avoid retaining detached DOM through closures | Unassessed |
| A5-228 | Reuse immutable source objects across views | Unassessed |
| A5-229 | Bound activity history memo lifetime to one calculation | Unassessed |
| A5-230 | Profile heap growth across repeated navigation and optimize retained allocations | Unassessed |

## HTTP request efficiency

| ID | Candidate | Status |
|---|---|---|
| A5-231 | Deduplicate identical concurrent account-scoped GET requests | Unassessed |
| A5-232 | Cancel superseded read requests on route changes | Unassessed |
| A5-233 | Combine compatible small metadata reads | Unassessed |
| A5-234 | Reduce oversized response field sets per view | Unassessed |
| A5-235 | Reuse stable response schema encoding | Unassessed |
| A5-236 | Avoid redundant HEAD before known GET resources | Unassessed |
| A5-237 | Prioritize critical requests over speculative prefetch | Unassessed |
| A5-238 | Limit concurrent speculative downloads by connection conditions | Unassessed |
| A5-239 | Use lightweight version checks before fetching unchanged catalogs | Unassessed |
| A5-240 | Avoid automatic retries for nonessential canceled work | Unassessed |

## Server data processing

| ID | Candidate | Status |
|---|---|---|
| A5-241 | Reuse validated request parsing result across middleware | Unassessed |
| A5-242 | Avoid multiple parsing passes on large progress request bodies | Unassessed |
| A5-243 | Precompute constant response metadata | Unassessed |
| A5-244 | Cache compiled schema validators per runtime | Unassessed |
| A5-245 | Avoid repeated string normalization after validated canonical lookup | Unassessed |
| A5-246 | Batch R2 metadata lookups with bounded concurrency | Unassessed |
| A5-247 | Use single-pass filtering and aggregation for reports | Unassessed |
| A5-248 | Avoid sorting server results already ordered by database | Unassessed |
| A5-249 | Limit intermediate allocations during response serialization | Unassessed |
| A5-250 | Reuse validated static resource manifest within isolate | Unassessed |

## Admin workflows

| ID | Candidate | Status |
|---|---|---|
| A5-251 | Load student count before optional detailed breakdown | Unassessed |
| A5-252 | Query only requested report date range | Unassessed |
| A5-253 | Aggregate report metrics in database when equivalent | Unassessed |
| A5-254 | Stream large authorized export output | Unassessed |
| A5-255 | Defer offscreen chart series computations | Unassessed |
| A5-256 | Reuse report filter options per dataset revision | Unassessed |
| A5-257 | Index audit event lists by timestamp and type | Unassessed |
| A5-258 | Batch permission-scoped student metadata reads | Unassessed |
| A5-259 | Avoid repeatedly recomputing unchanged group roster totals | Unassessed |
| A5-260 | Cache derived report chart points within one view session | Unassessed |

## Academic generators

| ID | Candidate | Status |
|---|---|---|
| A5-261 | Parse source manifests once per build invocation | Unassessed |
| A5-262 | Hash source files once and reuse digest for outputs | Unassessed |
| A5-263 | Avoid re-encoding unchanged generated JSON files | Unassessed |
| A5-264 | Use bounded parallelism for independent image generation | Unassessed |
| A5-265 | Deduplicate identical generated public asset bytes by digest | Unassessed |
| A5-266 | Avoid reading archived inputs for active-only builds | Unassessed |
| A5-267 | Precompute normalized question option indexes | Unassessed |
| A5-268 | Serialize large generated tables in deterministic streaming order | Unassessed |
| A5-269 | Cache validated source schema results by content hash | Unassessed |
| A5-270 | Skip writes when generated output is byte-identical | Unassessed |

## Packaging and delivery

| ID | Candidate | Status |
|---|---|---|
| A5-271 | Measure gzip and Brotli sizes per feature entry | Unassessed |
| A5-272 | Deduplicate shared dependency chunks | Unassessed |
| A5-273 | Remove unused transitive runtime dependency imports after evidence | Unassessed |
| A5-274 | Minify eligible shipped JS while keeping debugging maps private | Unassessed |
| A5-275 | Exclude test fixtures from runtime distribution | Unassessed |
| A5-276 | Exclude development tooling from production Worker dependency graph | Unassessed |
| A5-277 | Avoid copying unchanged assets during local staging build | Unassessed |
| A5-278 | Upload only changed immutable asset objects during release | Unassessed |
| A5-279 | Verify artifact hashes without rereading same unchanged local files | Unassessed |
| A5-280 | Parallelize independent release artifact checks | Unassessed |

## Reliability-preserving performance measurement

| ID | Candidate | Status |
|---|---|---|
| A5-281 | Track p50 and p95 navigation timings separately | Unassessed |
| A5-282 | Capture long-task duration by study view | Unassessed |
| A5-283 | Measure IndexedDB write amplification on synthetic data | Unassessed |
| A5-284 | Measure D1 rows read per common request | Unassessed |
| A5-285 | Measure R2 transferred bytes per resource journey | Unassessed |
| A5-286 | Measure client main-thread parsing time per course pack | Unassessed |
| A5-287 | Measure memory peak during large exam review | Unassessed |
| A5-288 | Measure cold versus warm cache startup separately | Unassessed |
| A5-289 | Use deterministic seeded data for reproducible benchmarks | Unassessed |
| A5-290 | Record equivalence assertions beside each performance measurement | Unassessed |

## Scale and cost tuning

| ID | Candidate | Status |
|---|---|---|
| A5-291 | Benchmark simultaneous device sync under realistic account isolation | Unassessed |
| A5-292 | Benchmark burst load at timetable transitions | Unassessed |
| A5-293 | Measure cache hit ratio by eligible resource class | Unassessed |
| A5-294 | Measure private PDF range transfer versus full response | Unassessed |
| A5-295 | Tune bounded background prefetch using measured hit rates | Unassessed |
| A5-296 | Measure Worker CPU per high-volume endpoint and tune hotspots | Unassessed |
| A5-297 | Measure D1 index storage cost versus read savings | Unassessed |
| A5-298 | Evaluate storage compression cost versus transfer savings | Unassessed |
| A5-299 | Measure rollback artifact size and optimize redundant copies | Unassessed |
| A5-300 | Tune synthetic regression dataset size for stable signal without excess CI runtime | Unassessed |

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

- #116: candidate `f00ae2435b6c0badb774a8db4507bdb969da093b`, [CI 45382234949](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45382234949), 1,313 full-suite tests passed, merge `7cd024d7ec3d9b861c48a1006f47f561fc402efd`.
- #117: candidate `8105ce4fee4537e20984b93f354244b47da6af94`, [CI 45382463701](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45382463701), 1,311 full-suite tests passed, merge `ef70a459f78d97ef892d490ff249cfe7b372c3f0`. Candidate started before #116 merged; integrated CI still required.
- #118: candidate `6813bfe17b19298e3e34b5884e7be8b536211dad`, [CI 45382764102](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45382764102), 1,315 full-suite tests passed, merge `2ea6a62a7b5de71d6a621411e22d2b4457a7ce0c`. Candidate started before #117 merged; integrated CI still required.
- #120: candidate `f6e4891a47410c3e4bf5264c5f171f14d4287924`, [CI 45383091302](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45383091302), success. A5-074 in its historical benchmark label means A5-084; the original diagram-loading candidate A5-074 remains unassessed. A5-178 was narrowed from general card search tokenization to per-card course-scope reuse; no general tokenization gain is claimed.
- #119: integrated evidence [CI 45383257697](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45383257697) passed; merge `b1e9f880fbb5ccec0b735ffe8e82624647148921`.
- #121: candidate `1f43138e578e38c525ea7f2448f24cf31c4ecbf3`, [CI 45383566906](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45383566906), 1,321 full-suite tests passed; merge `25f147380b1584e08f08548f271773811373ffab`.
- #122: candidate `82fa59042c8633472d797e67317e22810cc5921e`, [CI 45383782390](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45383782390), 1,320 full-suite tests passed; merge `f57523ba90fba855a569114a333627af68339bf2`. Candidate branched before #121 merged; integrated CI required.
- #123: candidate `695898aa41c28302125261a75ba6fbd083a08292`, [CI 45384086568](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45384086568), 1,323 full-suite tests passed; merge `4caf30bed0f74cf8c1814660975e4d37699f2513`. Candidate branched before #122 merged; integrated CI required.
- #125: candidate `8c94868907278840a815b5e68d8a778063f18d3b`, submitted; CI pending.
- The first evidence-only run 45382874003 failed because benchmark receipt rows duplicated register ID syntax (305 matched rows, expected 300). Receipt formatting corrected without changing the validation test. The same run measured A5-003 at 11.660 ms baseline vs 11.702 ms candidate; no repeatable wall-time improvement claimed.

No production release, migrations, student-data edits or archived curriculum edits.
