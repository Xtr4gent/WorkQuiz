import { cookies } from "next/headers";
import { nanoid } from "nanoid";

import { COOKIE_NAME } from "@/lib/workquiz/constants";

export async function getOrCreateBrowserToken() {
  const jar = await cookies();
  const existing = jar.get(COOKIE_NAME)?.value;
  if (existing) {
    return existing;
  }

  const token = nanoid(24);
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 90,
    path: "/",
  });

  return token;
}
