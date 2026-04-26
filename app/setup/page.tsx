import { redirect } from "next/navigation";

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string; adminToken?: string }>;
}) {
  const params = await searchParams;
  const next = new URLSearchParams();
  if (params.adminToken) {
    next.set("adminToken", params.adminToken);
  }
  if (params.template) {
    next.set("template", params.template);
  }

  redirect(`/admin${next.size ? `?${next.toString()}` : ""}`);
}
