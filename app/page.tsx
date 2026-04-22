import LandingPageClient from "@/components/LandingPageClient";
import { findCurrentPublicBracket, listBracketHistory } from "@/lib/workquiz/bracket";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const currentBracket = findCurrentPublicBracket();
  const pastTopics = listBracketHistory(6);

  return <LandingPageClient initialIsLive={currentBracket !== null} pastTopics={pastTopics} />;
}
