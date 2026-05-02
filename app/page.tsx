import LandingPageClient from "@/components/LandingPageClient";
import {
  advanceReadyBrackets,
  buildSnapshot,
  findCurrentPublicBracket,
  listBracketHistory,
} from "@/lib/workquiz/bracket";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await advanceReadyBrackets(new Date());
  const bracket = await findCurrentPublicBracket();
  const snapshot = bracket ? buildSnapshot(bracket) : null;
  const live = snapshot?.rounds.some((round) => round.status === "live") ?? false;
  const pastTopics = await listBracketHistory(6);

  return <LandingPageClient initialIsLive={live} pastTopics={pastTopics} />;
}
