/** Homepage section anchors. Nav, footer and the act components all use these, so links never drift. */
export const SECTION = {
  main: "main",
  learn: "learn",
  rankings: "rankings",
  leap: "leap",
  studentWork: "student-work",
  research: "research",
  lead: "lead",
  alumni: "alumni",
  placements: "placements",
  explore: "explore",
  thisWeek: "this-week",
} as const;

export const missionAnchor = (slug: string) => `research-${slug}`;
