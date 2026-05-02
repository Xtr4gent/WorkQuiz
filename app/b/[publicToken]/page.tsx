import { notFound, redirect } from "next/navigation";

import { findBracketByPublicToken } from "@/lib/workquiz/bracket";

export default async function PublicBracketPage({
  params,
}: {
  params: Promise<{ publicToken: string }>;
}) {
  const { publicToken } = await params;
  const bracket = await findBracketByPublicToken(publicToken);

  if (!bracket) {
    notFound();
  }

  if (bracket.status === "disabled") {
    return (
      <main className="shell not-found-shell">
        <section className="panel stack-md">
          <span className="eyebrow">Bracket Closed</span>
          <h1>This bracket is no longer available.</h1>
          <p className="muted">
            The organizer shut this one down, so this public link does not accept votes anymore.
          </p>
        </section>
      </main>
    );
  }

  redirect("/voting");
}
