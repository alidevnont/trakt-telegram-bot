import { trakt } from "./client.ts";

export interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_url: string;
  expires_in: number;
  interval: number;
}

export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  created_at: number;
}

export async function getDeviceCode(): Promise<DeviceCodeResponse> {
  const res = await trakt.oauth.device.code({
    body: {
      client_id: Deno.env.get("TRAKT_CLIENT_ID")!,
    },
  });

  if (res.status !== 200) {
    throw new Error(`Failed to get device code: ${res.status}`);
  }

  return res.body as DeviceCodeResponse;
}

export async function pollDeviceToken(
  deviceCode: string,
): Promise<OAuthTokenResponse | null> {
  const res = await trakt.oauth.device.token({
    body: {
      code: deviceCode,
      client_id: Deno.env.get("TRAKT_CLIENT_ID")!,
      client_secret: Deno.env.get("TRAKT_CLIENT_SECRET")!,
    },
  });

  switch (res.status) {
    case 200:
      return res.body as OAuthTokenResponse;
    case 400:
      return null; // Pending, keep polling
    case 404:
      throw new Error("Invalid device code");
    case 409:
      throw new Error("Device code already used");
    case 410:
      throw new Error("Device code expired");
    case 418:
      throw new Error("User denied authorization");
    case 429:
      return null; // Too fast, will retry
    default:
      throw new Error(`Unexpected status: ${res.status}`);
  }
}

export async function refreshToken(
  refreshToken: string,
): Promise<OAuthTokenResponse> {
  const res = await trakt.oauth.token({
    body: {
      refresh_token: refreshToken,
      client_id: Deno.env.get("TRAKT_CLIENT_ID")!,
      client_secret: Deno.env.get("TRAKT_CLIENT_SECRET")!,
      grant_type: "refresh_token",
    },
  });

  if (res.status !== 200) {
    throw new Error(`Failed to refresh token: ${res.status}`);
  }

  return res.body as OAuthTokenResponse;
}
