# Agent requirement implementation tracker

This is the only implementation-status source. Keep exactly one row
`in_progress`. Evidence must name commits/files, tests, gate commands, and the
independent verifier verdict.

| Story | Epic | Apps | Status | Depends on | Decisions | Evidence / notes |
|---|---|---|---|---|---|---|
| M1-S01 | M1 | server + dispensary + admin | ready | — | — | — |
| M1-S02 | M1 | server + dispensary + admin | ready | M1-S01 | — | — |
| M1-S03 | M1 | server + dispensary + admin | ready | M1-S01, M11-S02 | — | — |
| M1-S04 | M1 | server + dispensary + admin | ready | M1-S03 | — | — |
| M1-S05 | M1 | server + dispensary + admin | ready | M1-S04 | — | — |
| M1-S06 | M1 | server + dispensary | ready | M1-S05, M2-S04 | — | — |
| M1-S07 | M1 | server + dispensary + admin | ready | M1-S05 | — | — |
| M1-S08 | M1 | server + admin | blocked | M1-S01, M1-S05 | D-001 | — |
| M1-S09 | M1 | server + dispensary + admin | blocked | M1-S07, M3-S01 | D-013 | — |
| M2-S01 | M2 | server + dispensary | ready | M1-S03 | — | — |
| M2-S02 | M2 | server + dispensary + admin | ready | M2-S01, M1-S05 | — | — |
| M2-S03 | M2 | server + dispensary + admin | ready | M2-S02 | — | — |
| M2-S04 | M2 | server + dispensary + admin | ready | M2-S02 | — | — |
| M2-S05 | M2 | server + dispensary + admin | blocked | M2-S02 | D-007, D-008 | — |
| M2-S06 | M2 | server + dispensary | ready | M2-S04, M4-S03, M1-S07 | — | — |
| M2-S07 | M2 | server + dispensary | blocked | M2-S04 | D-009 | — |
| M3-S01 | M3 | server + dispensary | ready | M1-S05 | — | — |
| M3-S02 | M3 | server + dispensary | ready | M3-S01 | — | — |
| M3-S03 | M3 | server + dispensary | ready | M3-S01 | — | — |
| M3-S04 | M3 | server + dispensary | ready | M3-S01 | — | — |
| M3-S05 | M3 | server + dispensary | ready | M3-S03 | — | — |
| M3-S06 | M3 | server + dispensary | ready | M3-S01 | — | — |
| M3-S07 | M3 | server + dispensary | ready | M3-S06, M10-S03, M8-S05 | — | — |
| M3-S08 | M3 | server + dispensary | blocked | M3-S01, M4-S01 | D-011 | — |
| M3-S09 | M3 | server + dispensary | blocked | M3-S01, M2-S05, M6-S05, M6-S07 | D-012 | — |
| M3-S10 | M3 | server + dispensary | blocked | M3-S03, M3-S05 | D-002 | — |
| M4-S01 | M4 | server + dispensary | ready | M1-S05 | — | — |
| M4-S02 | M4 | server + dispensary | ready | M4-S01 | — | — |
| M4-S03 | M4 | server + dispensary | ready | M4-S01, M4-S02 | — | — |
| M4-S04 | M4 | server + dispensary | ready | M4-S03 | — | — |
| M4-S05 | M4 | server + dispensary | ready | M4-S03, M1-S07 | — | — |
| M4-S06 | M4 | server + dispensary | ready | M4-S05 | — | — |
| M4-S07 | M4 | server + dispensary | ready | M4-S03, M1-S05 | — | — |
| M5-S01 | M5 | server + dispensary | ready | M1-S05 | — | — |
| M5-S02 | M5 | server + dispensary | ready | M5-S01, M4-S01 | — | — |
| M5-S03 | M5 | server + dispensary | ready | M5-S02, M4-S04, M2-S05 | — | — |
| M5-S04 | M5 | server + dispensary | ready | M5-S02 | — | — |
| M5-S05 | M5 | server + dispensary | ready | M5-S04, M4-S03 | — | — |
| M5-S06 | M5 | server + dispensary | ready | M5-S05 | — | — |
| M6-S01 | M6 | server + dispensary | ready | M4-S03, M1-S06 | — | — |
| M6-S02 | M6 | server + dispensary | ready | M6-S01, M1-S07 | — | — |
| M6-S03 | M6 | server + dispensary | ready | M6-S02, M3-S05 | — | — |
| M6-S04 | M6 | server + dispensary | ready | M6-S01, M4-S07, M3-S04 | — | — |
| M6-S05 | M6 | server + dispensary | ready | M6-S01, M6-S02, M6-S03, M6-S04, M3-S04, M3-S08, M1-S07 | — | — |
| M6-S06 | M6 | server + dispensary | blocked | M6-S02 | D-010 | — |
| M6-S07 | M6 | server + dispensary | ready | M6-S05, M4-S03 | — | — |
| M6-S08 | M6 | server + dispensary | ready | M6-S05, M11-S02 | — | — |
| M7-S01 | M7 | server + dispensary + admin | ready | M2-S04, M1-S04 | — | — |
| M7-S02 | M7 | server + dispensary | ready | M6-S04, M6-S07, M4-S07 | — | — |
| M7-S03 | M7 | server + dispensary | ready | M4-S04, M4-S05, M4-S06, M5-S06, M6-S07, M7-S01, M7-S02 | — | — |
| M7-S04 | M7 | server + dispensary | blocked | M6-S04 | D-003 | — |
| M7-S05 | M7 | server + dispensary + admin | deferred | M7-S03 | — | Phase 2 only |
| M8-S01 | M8 | server + dispensary | ready | M1-S05, M2-S04 | — | — |
| M8-S02 | M8 | server + dispensary | blocked | M8-S01, M1-S07 | D-004 | — |
| M8-S03 | M8 | server + dispensary | ready | M3-S05, M5-S06 | — | — |
| M8-S04 | M8 | server + dispensary | ready | M6-S05, M5-S06, M8-S01 | — | — |
| M8-S05 | M8 | server + dispensary | ready | M8-S04 | — | — |
| M9-S01 | M9 | server + dispensary | ready | M1-S05, M2-S06, M4-S04, M5-S05, M6-S05, M8-S01, M8-S03 | — | — |
| M9-S02 | M9 | server + dispensary | ready | M9-S01, M1-S07, M2-S06, M4-S04, M5-S05, M6-S05, M7-S01, M8-S03 | — | — |
| M9-S03 | M9 | server + dispensary | ready | M9-S01, M6-S05, M4-S03 | — | — |
| M9-S04 | M9 | server + dispensary | ready | M9-S03 | — | — |
| M9-S05 | M9 | server + dispensary | blocked | M9-S04, M2-S05 | D-005 | — |
| M10-S01 | M10 | server + dispensary + admin | ready | M1-S01 | — | — |
| M10-S02 | M10 | server + dispensary + admin | ready | M10-S01 | — | — |
| M10-S03 | M10 | server + dispensary + admin | ready | M10-S02, M1-S05 | — | — |
| M10-S04 | M10 | server + dispensary | ready | M10-S03, M3-S05, M3-S06, M3-S07 | — | — |
| M11-S01 | M11 | server + dispensary + admin | ready | M2-S05 | — | — |
| M11-S02 | M11 | server | ready | — | — | — |
| M11-S03 | M11 | decision | deferred | — | — | Phase 2 integration backlog |
| M12-S01 | M12 | decision | deferred | — | D-006 | — |
