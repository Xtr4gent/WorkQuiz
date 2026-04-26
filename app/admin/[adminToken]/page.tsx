import { redirect } from "next/navigation";

export default async function AdminBracketPage({
  params,
}: {
  params: Promise<{ adminToken: string }>;
}) {
  const { adminToken } = await params;
  redirect(`/admin?adminToken=${encodeURIComponent(adminToken)}`);
}
