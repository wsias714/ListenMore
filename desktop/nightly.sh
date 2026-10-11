#!/usr/bin/env bash
# Nightly entry point: draft reflections, then (Fri/Sat only) the weekly insights.
# Runs both even if the first fails; exits non-zero if either did, so OnFailure= fires.
cd "$(dirname "$0")" || exit 1
rc=0
/usr/bin/python3 -I draft_job.py || rc=$?
/usr/bin/python3 -I insights.py >/dev/null || rc=$?
exit $rc
