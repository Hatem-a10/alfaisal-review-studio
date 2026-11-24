# Audit 4 — companion vault integrity

| ID | Evidence | Remedy |
|---|---|---|
| VI-01 | Parsed null/scalar/malformed metadata breaks subsequent saves or emits invalid store timestamps | Validate known store metadata independently of stored progress |
| VI-02 | Inherited store names are accepted in read, set and backup envelope | Require own known store identity |
| VI-03 | Undefined values can write literal invalid JSON to device storage | Reject unserializable root values before storage |
| VI-04 | Absent backup entry value is interpreted as an intentional deletion | Require explicit value and distinguish null |
| VI-05 | Nested unsafe keys or excessive nesting reach companion merge/application | Validate bounded JSON tree before size checks and merge |
| VI-06 | Timestamp-less legacy wrong-bank entries can return after full clear because NaN bypasses cutoff | Require provably later evidence after clear |
| VI-07 | Newer unfinished mock copy can overwrite submitted same-ID answers | Prefer frozen submitted snapshot |
| VI-08 | Newer unfinished original copy can replace submitted same-attempt result | Prefer submitted result for same startedAt |
| VI-09 | Unrelated visual store update can overwrite a newer figure result with old data | Compare individual result timestamps |

Six regression tests; no live data changes or production deployment. Existing documented retention caps are unchanged.
