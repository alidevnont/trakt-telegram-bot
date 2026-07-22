export interface StoredToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  username: string;
}

// In-memory storage (works everywhere, tokens reset on cold start)
const store = new Map<string, StoredToken>();

export async function saveToken(
  userId: string,
  token: StoredToken,
): Promise<void> {
  store.set(userId, token);
}

export async function getToken(
  userId: string,
): Promise<StoredToken | null> {
  const token = store.get(userId);
  if (!token) return null;

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
  store.delete(userId);
}
