import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const requestTimeServerComponents=[
  "src/app/calendar/page.tsx",
  "src/app/calendar/manage/page.tsx",
  "src/app/calendar/shared/page.tsx",
  "src/app/church/analytics/page.tsx",
  "src/app/church/coordination/page.tsx",
  "src/app/church/invites/page.tsx",
  "src/app/church/page.tsx",
  "src/app/church/schedule-health/page.tsx",
  "src/app/church/today/page.tsx",
  "src/app/content/page.tsx",
  "src/app/district/page.tsx",
  "src/app/organization/page.tsx",
  "src/app/outreach/page.tsx",
  "src/app/prophet/page.tsx",
  "src/app/search/page.tsx",
  "src/app/teams/page.tsx",
  "src/app/today/page.tsx",
  "src/app/updates/page.tsx",
  "src/components/official-updates.tsx",
  "src/components/upcoming-snapshot.tsx",
];

export default defineConfig([
  ...nextVitals,
  {
    files:requestTimeServerComponents,
    rules:{"react-hooks/purity":"off"},
  },
  {
    files:["src/app/groups/**/page.tsx","src/app/church/coordination/page.tsx","src/app/guide/tap/page.tsx"],
    rules:{"react/no-unescaped-entities":"off"},
  },
  {
    files:["src/app/content/page.tsx"],
    rules:{"@next/next/no-assign-module-variable":"off"},
  },
  globalIgnores([".next/**"]),
]);
