export interface StoredToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  username: string;
}

const TOKENS_FILE = "./data/tokens.json";

async function ensureDataDir() {
  try {
    await Deno.stat("./data");
  } catch {
    await Deno.mkdir("./data", { recursive: true });
  }
}

async function loadTokens(): Promise<Record<string, StoredToken>> {
  try {
    const data = await Deno.readTextFile(TOKENS_FILE);
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function saveTokens(tokens: Record<string, StoredToken>): Promise<void> {
  await ensureDataDir();
  await Deno.writeTextFile(TOKENS_FILE, JSON.stringify(tokens, null, 2));
}

export async function saveToken(
  userId: string,
  token: StoredToken,
): Promise<void> {
  const tokens = await loadTokens();
  tokens[userId] = token;
  await saveTokens(tokens);
}

export async function getToken(
  userId: string,
): Promise<StoredToken | null> {
  const tokens = await loadTokens();
  const token = tokens[userId];

  if (!token) return null;

  // Check if expired (with 5 min buffer)
  if (Date.now() > token.expiresAt - 300000) {
    // Token expired, try refresh
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
      // Refresh failed, token is invalid
      await deleteToken(userId);
      return null;
    }
  }

  return token;
}

export async function deleteToken(userId: string): Promise<void> {
  const tokens = await loadTokens();
  delete tokens[userId];
  await saveTokens(tokens);
}
