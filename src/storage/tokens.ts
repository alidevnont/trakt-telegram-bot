export interface StoredToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  username: string;
}

let kv: Deno.Kv | null = null;

async function getKv(): Promise<Deno.Kv> {
  if (!kv) {
    kv = await Deno.openKv();
  }
  return kv;
}

export async function saveToken(
  userId: string,
  token: StoredToken,
): Promise<void> {
  const db = await getKv();
  await db.set(["tokens", userId], token);
}

export async function getToken(
  userId: string,
): Promise<StoredToken | null> {
  const db = await getKv();
  const result = await db.get<StoredToken>(["tokens", userId]);

  if (!result.value) return null;

  const token = result.value;

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
}

export async function deleteToken(userId: string): Promise<void> {
  const db = await getKv();
  await db.delete(["tokens", userId]);
}
