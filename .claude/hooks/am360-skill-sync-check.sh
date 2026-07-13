#!/usr/bin/env bash
# SessionStart hook: warn when the `am360` skill has fallen behind the repo.
#
# The skill (~/.claude/skills/am360) is the pin-to-pin map of this codebase. It is
# only useful while it is true. This script compares HEAD against the commit the
# skill was last synced to and, if they differ, prints the changed files mapped to
# the reference file each one invalidates. Claude reads that as context and updates
# the skill.
#
# Always exits 0 — a broken sync check must never block a session.

set -u

SKILL_DIR="${HOME}/.claude/skills/am360"
SYNC_FILE="${SKILL_DIR}/.synced-commit"

# Skill not installed → nothing to keep in sync.
[ -d "$SKILL_DIR" ] || exit 0
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

HEAD_SHA="$(git rev-parse HEAD 2>/dev/null)" || exit 0
[ -n "$HEAD_SHA" ] || exit 0

if [ ! -f "$SYNC_FILE" ]; then
  echo "[am360 skill] No sync marker found. Review the skill against the current code, then stamp it:"
  echo "    git rev-parse HEAD > \"$SYNC_FILE\""
  exit 0
fi

SYNCED_SHA="$(tr -d '[:space:]' < "$SYNC_FILE")"
[ -n "$SYNCED_SHA" ] || exit 0
[ "$SYNCED_SHA" = "$HEAD_SHA" ] && exit 0

# The synced commit may be gone (rebase/squash/force-push). Fall back gracefully.
if ! git cat-file -e "${SYNCED_SHA}^{commit}" 2>/dev/null; then
  echo "[am360 skill] The synced commit ${SYNCED_SHA:0:7} is no longer in this repo (rebased or squashed)."
  echo "Re-verify the skill against the current code, then stamp: git rev-parse HEAD > \"$SYNC_FILE\""
  exit 0
fi

CHANGED="$(git diff --name-only "${SYNCED_SHA}" "${HEAD_SHA}" 2>/dev/null)"
[ -n "$CHANGED" ] || exit 0

N_COMMITS="$(git rev-list --count "${SYNCED_SHA}..${HEAD_SHA}" 2>/dev/null || echo "?")"

echo "[am360 skill] OUT OF DATE — ${N_COMMITS} commit(s) since it was last synced (${SYNCED_SHA:0:7} -> ${HEAD_SHA:0:7})."
echo "The skill is the map future sessions trust. Update the reference files below to match the code, then re-stamp."
echo ""
echo "Changed files:"
echo "$CHANGED" | sed 's/^/  /'
echo ""
echo "Reference files these changes may invalidate:"

# Map changed paths -> the reference doc that describes them.
printf '%s\n' "$CHANGED" | awk '
  /^prisma\/schema\.prisma/            { r["references/data-model.md — the schema changed"]=1 }
  /^prisma\/migrations\//              { r["references/ops.md — migration state changed"]=1 }
  /^src\/app\/api\//                   { r["references/api-surface.md — routes changed"]=1 }
  /^src\/lib\/plan\.ts/                { r["references/plans-billing.md — plan limits changed"]=1 }
  /^src\/lib\/fees\.ts/                { r["references/data-model.md — fee status/due-date derivation changed"]=1 }
  /^src\/lib\/razorpay\.ts/            { r["references/plans-billing.md — payment logic changed"]=1 }
  /^src\/app\/api\/subscription\//     { r["references/plans-billing.md — subscription flow changed"]=1 }
  /^src\/app\/api\/admin\//            { r["references/plans-billing.md — Super Admin controls changed"]=1 }
  /^src\/lib\/(api|auth|superauth|audit|prisma|conflict|client|saclient)\.ts/ { r["references/conventions.md — a core helper or the route/client pattern changed"]=1 }
  /^src\/(components|context)\//       { r["references/frontend.md — components changed"]=1 }
  /^src\/app\/globals\.css/            { r["references/frontend.md — the design system changed"]=1 }
  /^src\/app\/(admin|trainer|superadmin)\// { r["references/frontend.md — pages/tabs changed"]=1 }
  /^(\.env\.example|next\.config\.mjs|package\.json|public\/(sw\.js|manifest\.webmanifest))/ { r["references/ops.md — env, build, or PWA changed"]=1 }
  /^(mobile\/|\.github\/workflows\/)/  { r["references/ops.md — mobile shell or CI changed"]=1 }
  END { for (k in r) print "  - " k }
'

echo ""
echo "Also re-check SKILL.md (invariants) and references/known-gaps.md (was a gap closed, or a new one opened?)."
echo "When the skill matches the code again, stamp it:"
echo "    git rev-parse HEAD > \"$SYNC_FILE\""

exit 0
