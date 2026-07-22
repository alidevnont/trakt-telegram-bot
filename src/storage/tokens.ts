export interface StoredToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  username: string;
}

const SUPABASE_URL = "https://hmjvtodbtwgvbplvzpzs.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtanZ0b2RidHdndmJwbHZ6cHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4NDQ2NDMsImV4cCI6MjA5OTQyMDY0M30.UXHcmZcszWQfZS1E3fBaWLGG6TIaC9N91VduyoCDAz0";

async function supabaseQuery(
  table: string,
  method: string,
  body?: Record<string, unknown>,
  params?: string,
): Promise<unknown> {
  const url = `${SUPABASE_URL}/rest/v1/${table}${params ? `?${params}` : ""}`;
  const headers: Record<string, string> = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
  };

  if (method === "POST" || method === "PATCH") {
    headers.Prefer = "return=representation,resolution=merge-duplicates";
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Supabase error: ${res.status} - ${error}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function saveToken(
  userId: string,
  token: StoredToken,
): Promise<void> {
  // Try to get existing token first
  const existing = await getToken(userId);
  if (existing) {
    // Update existing
    await supabaseQuery("trakt_tokens", "PATCH", {
      access_token: token.accessToken,
      refresh_token: token.refreshToken,
      expires_at: token.expiresAt,
      username: token.username,
    }, `user_id=eq.${userId}`);
  } else {
    // Insert new
    await supabaseQuery("trakt_tokens", "POST", {
      user_id: userId,
      access_token: token.accessToken,
      refresh_token: token.refreshToken,
      expires_at: token.expiresAt,
      username: token.username,
    });
  }
}

export async function getToken(
  userId: string,
): Promise<StoredToken | null> {
  try {
    const result = await supabaseQuery(
      "trakt_tokens",
      "GET",
      undefined,
      `user_id=eq.${userId}&select=*`,
    );

    const rows = result as Array<{
      access_token: string;
      refresh_token: string;
      expires_at: number;
      username: string;
    }>;

    if (!rows || rows.length === 0) return null;

    const row = rows[0];
    const token: StoredToken = {
      accessToken: row.access_token,
      refreshToken: row.refresh_token,
      expiresAt: row.expires_at,
      username: row.username,
    };

    // Check if expired (with 5 min buffer)
    if (Date.now() > token.expiresAt - 300000) {
      try {
        const { refreshToken } = await import("../trakt/auth.ts");
        const newToken = await refreshToken(token.refreshToken);
        const updated: StoredToken = {
          accessToken: newToken.access_token,
          refreshToken: newToken.refresh_token,
          expiresAt: Date.now() + newToken.expires_in * 1000,
          username: token.username,
        };
        await saveToken(userId, updated);
        return updated;
      } catch {
        await deleteToken(userId);
        return null;
      }
    }

    return token;
  } catch (error) {
    console.error("getToken error:", error);
    return null;
  }
}

export async function deleteToken(userId: string): Promise<void> {
  await supabaseQuery(
    "trakt_tokens",
    "DELETE",
    undefined,
    `user_id=eq.${userId}`,
  );
}
