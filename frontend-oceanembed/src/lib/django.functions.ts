import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Thin proxy from the Vercel server to the Django API (local dev or
 * wherever BACKEND_BASE_URL points). Keeps the browser out of CORS/CSRF
 * and keeps the Django URL server-side.
 */

const BACKEND_BASE_URL = process.env["BACKEND_BASE_URL"] ?? "http://localhost:8000";

/**
 * Ask Django whether it recognises this Supabase session. Proves the
 * frontend ↔ backend auth integration end to end.
 */
export const getDjangoAuthStatus = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ accessToken: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    const res = await fetch(`${BACKEND_BASE_URL}/api/auth/supabase-me/`, {
      headers: { Authorization: `Bearer ${data.accessToken}` },
      signal: AbortSignal.timeout(8000),
    });
    const body = (await res.json().catch(() => null)) as {
      authenticated?: boolean;
      user?: { id?: string; email?: string };
      error?: string;
    } | null;
    if (!res.ok || !body?.authenticated) {
      throw new Error(body?.error ?? "Django backend did not recognise this session.");
    }
    return { userId: body.user?.id ?? "", email: body.user?.email ?? "" };
  });
