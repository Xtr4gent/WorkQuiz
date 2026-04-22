export type LandingHistoryItem = {
  topic: string;
  winner: string;
  runners: string[];
};

export const DEFAULT_LANDING_HISTORY: LandingHistoryItem[] = [
  {
    topic: "Best Chocolate Snack",
    winner: "Caramilk",
    runners: [
      "Snickers",
      "Kit Kat",
      "Twix",
      "Reese's Peanut Butter Cups",
      "Hershey's Milk Chocolate",
      "Cadbury Dairy Milk",
      "Kinder Bueno",
      "Crunch",
      "Oh Henry!",
      "Coffee Crisp",
      "Mars",
      "Crunchie",
      "Aero",
      "Caramilk",
      "Skor",
      "Wunderbar",
      "Mr. Big",
      "Hershey's cookies and creme",
    ],
  },
];
