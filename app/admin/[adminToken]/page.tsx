import { notFound } from "next/navigation";

import { BracketClient } from "@/components/BracketClient";
import { buildSnapshot, findBracketByAdminToken } from "@/lib/workquiz/bracket";

export default async function AdminBracketPage({
  params,
}: {
  params: Promise<{ adminToken: string }>;
}) {
  const { adminToken } = await params;
  const bracket = findBracketByAdminToken(adminToken);

  if (!bracket) {
    notFound();
  }

  const snapshot = buildSnapshot(bracket, {
    includeAdminUrl: true,
    adminToken,
  });

  return (
    <main className="shell bracket-shell">
      <BracketClient
        adminToken={adminToken}
        initialSnapshot={snapshot}
        mode="admin"
        token={bracket.publicToken}
      />
    </main>
  );
}
