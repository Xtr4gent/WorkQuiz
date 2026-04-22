export type LandingHistoryItem = {
  topic: string;
  winner: string;
  runners: string[];
};

export const DEFAULT_LANDING_HISTORY: LandingHistoryItem[] = [
  {
    topic: "What is the best chocolate bar/snack",
    winner: "Kit Kat",
    runners: ["Kit Kat", "Coffee Crisp", "Twix", "Mars"],
  },
];
