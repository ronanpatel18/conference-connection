export type IndustryTheme = {
  name: string;
  main: string;
  tint: string;
};

export type IndustryCategory = {
  name: string;
  main: string;
  tint: string;
  subcategories: string[];
};

export const CATEGORY_THEMES: IndustryTheme[] = [
  {
    name: "Brand Development and Fan Experience",
    main: "#F97316",
    tint: "#FFEDD5",
  },
  {
    name: "Brand Communications",
    main: "#2563EB",
    tint: "#DBEAFE",
  },
  {
    name: "Journalism and Media Operations",
    main: "#7C3AED",
    tint: "#EDE9FE",
  },
  {
    name: "Sports Finance and Real Estate",
    main: "#15803D",
    tint: "#DCFCE7",
  },
  {
    name: "Talent Representation",
    main: "#111827",
    tint: "#E5E7EB",
  },
  {
    name: "Sales, Partnerships and Merchandise",
    main: "#DC2626",
    tint: "#FEE2E2",
  },
  {
    name: "Data and Technology",
    main: "#0891B2",
    tint: "#CFFAFE",
  },
  {
    name: "Team Operations and Coaching",
    main: "#1E3A8A",
    tint: "#E0E7FF",
  },
];

export const CATEGORY_TREE: IndustryCategory[] = [
  {
    name: "Brand Development and Fan Experience",
    main: "#F97316",
    tint: "#FFEDD5",
    subcategories: [
      "Fan Experience",
      "Brand Strategy",
      "Community Engagement",
    ],
  },
  {
    name: "Brand Communications",
    main: "#2563EB",
    tint: "#DBEAFE",
    subcategories: [
      "Public Relations",
      "Communications",
      "Content",
    ],
  },
  {
    name: "Journalism and Media Operations",
    main: "#7C3AED",
    tint: "#EDE9FE",
    subcategories: [
      "Journalism",
      "Media Operations",
      "Broadcast",
    ],
  },
  {
    name: "Sports Finance and Real Estate",
    main: "#15803D",
    tint: "#DCFCE7",
    subcategories: [
      "Finance",
      "Real Estate",
      "Consulting",
    ],
  },
  {
    name: "Talent Representation",
    main: "#111827",
    tint: "#E5E7EB",
    subcategories: [
      "Talent Representation",
      "Athlete Relations",
      "Negotiations",
    ],
  },
  {
    name: "Sales, Partnerships and Merchandise",
    main: "#DC2626",
    tint: "#FEE2E2",
    subcategories: [
      "Sales",
      "Partnerships",
      "Merchandise",
    ],
  },
  {
    name: "Data and Technology",
    main: "#0891B2",
    tint: "#CFFAFE",
    subcategories: [
      "Data",
      "Analytics",
      "Technology",
    ],
  },
  {
    name: "Team Operations and Coaching",
    main: "#1E3A8A",
    tint: "#E0E7FF",
    subcategories: [
      "Team Operations",
      "Coaching",
      "Player Development",
    ],
  },
];

const SPECIAL_COMPANY_THEMES: IndustryTheme[] = [
  {
    name: "Wisconsin Sports Business Conference",
    main: "#c5050c",
    tint: "#FEE2E2",
  },
  {
    name: "Wisconsin",
    main: "#c5050c",
    tint: "#FEE2E2",
  },
];

const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, " ").trim();

export const getThemeForCategory = (category?: string | null): IndustryTheme | null => {
  if (!category) return null;
  const normalized = normalize(category);
  return (
    CATEGORY_THEMES.find((theme) => normalize(theme.name) === normalized) || null
  );
};

export const getThemeForSubcategory = (subcategory?: string | null): IndustryTheme | null => {
  if (!subcategory) return null;
  const normalized = normalize(subcategory);
  const category = CATEGORY_TREE.find((item) =>
    item.subcategories.some((sub) => normalize(sub) === normalized)
  );
  return category ? { name: category.name, main: category.main, tint: category.tint } : null;
};

export const getMainCategoryForSubcategory = (subcategory?: string | null): string | null => {
  if (!subcategory) return null;
  const normalized = normalize(subcategory);
  const category = CATEGORY_TREE.find((item) =>
    item.subcategories.some((sub) => normalize(sub) === normalized)
  );
  return category ? category.name : null;
};

export const isValidSubcategory = (subcategory?: string | null): boolean => {
  if (!subcategory) return false;
  return CATEGORY_TREE.some((item) =>
    item.subcategories.some((sub) => normalize(sub) === normalize(subcategory))
  );
};

export const getThemeForAttendee = (attendee: {
  company?: string | null;
  industry_tags?: string[] | null;
}): IndustryTheme => {
  const company = attendee.company || "";
  const companyNormalized = normalize(company);

  if (
    companyNormalized.includes("wisconsin sports business conference") ||
    companyNormalized.includes("wisconsin sports buisness conference")
  ) {
    return SPECIAL_COMPANY_THEMES[0];
  }

  if (companyNormalized.includes("wisconsin")) {
    return SPECIAL_COMPANY_THEMES[1];
  }

  const tags = attendee.industry_tags || [];
  for (const tag of tags) {
    const theme = getThemeForSubcategory(tag);
    if (theme) return theme;
  }

  return CATEGORY_THEMES[0];
};
