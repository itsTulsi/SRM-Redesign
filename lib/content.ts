import alumniData from "@/content/alumni.json";
import campusesData from "@/content/campuses.json";
import collegesData from "@/content/colleges.json";
import programmesData from "@/content/programmes.json";
import researchData from "@/content/research.json";
import siteData from "@/content/site.json";
import statsData from "@/content/stats.json";
import storiesData from "@/content/stories.json";

import type { OrTodo } from "./todo";

/**
 * Typed access to content/*.json. Shapes are enforced at build time by scripts/check-content.mts (prebuild).
 * Server components only — importing this from a client component ships every JSON file to the browser.
 */
export { isTodo, verified, type OrTodo, type Todo } from "./todo";

export type CampusSlug =
  | "kattankulathur"
  | "ramapuram"
  | "vadapalani"
  | "tiruchirappalli"
  | "delhi-ncr"
  | "baburayanpettai"
  | "srm-ap"
  | "srm-haryana"
  | "srm-sikkim";

export type CollegeSlug =
  | "engineering"
  | "medicine"
  | "dental"
  | "law"
  | "management"
  | "architecture"
  | "science-humanities"
  | "agriculture"
  | "pharmacy"
  | "nursing";

export type Programme = {
  slug: string;
  name: string;
  college: CollegeSlug;
  campuses: CampusSlug[];
  level: "UG" | "PG";
  durationYears: OrTodo<number>;
  eligibility: OrTodo<string>;
  entrance: OrTodo<string>;
  feesPerYearINR: OrTodo<number>;
  deadline: OrTodo<string>;
  summary: string;
  tags: string[];
  /** Typical career paths for the discipline — not SRM placement claims. */
  outcomes: string[];
  sources: string[];
};

export type College = {
  slug: CollegeSlug;
  name: string;
  shortName: string;
  campus: CampusSlug;
  outcome: { value: OrTodo<string>; label: string };
  photo: string;
};

export type Campus = {
  slug: CampusSlug;
  name: string;
  city: string;
  state: string;
  kind: "campus" | "sister";
  isMain: boolean;
  lat: number;
  lng: number;
  tour360Url: string | null;
  distanceFromChennai?: OrTodo<string>;
  website?: OrTodo<string>;
  photo: string;
};

export type Alumnus = {
  slug: string;
  name: string;
  role: string;
  line: OrTodo<string>;
  degree: OrTodo<string>;
  path: OrTodo<string>[];
  photo: string;
};

export type Story = {
  slug: string;
  kind: "student-work" | "news";
  title: string;
  dek: string;
  date: OrTodo<string>;
  people: { name: string; role: string }[];
  facts: { label: string; value: string }[];
  body: string[];
  media: { photo?: string; video?: string; model?: string };
  tags: string[];
};

export type SrmEvent = {
  slug: string;
  title: string;
  date: OrTodo<string>;
  campus: CampusSlug;
  url: OrTodo<string>;
};

export type Stat = {
  id: string;
  label: string;
  value: number;
  display: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
};

export type NirfRank = { id: string; label: string; rank: number };

export type Mission = {
  slug: string;
  name: string;
  question: string;
  highlights: OrTodo<string>[];
  photo: string;
};

export const site = siteData;
export const programmes = programmesData.programmes as Programme[];
export const colleges = collegesData.colleges as College[];
export const campuses = campusesData.campuses as Campus[];
export const alumni = alumniData.alumni as Alumnus[];
export const stories = storiesData.stories as Story[];
export const events = storiesData.events as SrmEvent[];
export const missions = researchData.missions as Mission[];

export const placements = {
  season: statsData.placements.season,
  items: statsData.placements.items as Stat[],
};
export const researchStats = statsData.research.items as Stat[];

const currentNirfYear = statsData.nirf.current as "2025";
export const nirf = {
  year: currentNirfYear,
  ranks: statsData.nirf.years[currentNirfYear].ranks as NirfRank[],
  source: statsData.nirf.years[currentNirfYear].source,
};
export const naacGrade = statsData.naac.grade;

export const getProgramme = (slug: string) => programmes.find((p) => p.slug === slug);
export const getCollege = (slug: string) => colleges.find((c) => c.slug === slug);
export const getCampus = (slug: string) => campuses.find((c) => c.slug === slug);
export const getStory = (slug: string) => stories.find((s) => s.slug === slug);
export const featuredStory = getStory(storiesData.featured);
export const studentWork = storiesData.studentWork
  .map((slug) => getStory(slug))
  .filter((s): s is Story => s !== undefined);
