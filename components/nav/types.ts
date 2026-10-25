export type NavLink = { label: string; href: string };

export type NavGroup = { title: string; links: NavLink[] };

export type NavSection = {
  id: "study" | "research" | "student-work" | "campuses" | "about";
  label: string;
  intro: string;
  groups: NavGroup[];
  feature?: { eyebrow: string; title: string; href: string };
};

export type NavData = {
  sections: NavSection[];
  apply: NavLink;
  enquiry: NavLink;
  labels: { primary: string; home: string; menu: string; close: string; language: string; external: string; apply: string };
};
