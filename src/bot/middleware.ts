import { Context, NextFunction } from "grammy";
import { getToken } from "../storage/tokens.ts";

export async function authMiddleware(
  ctx: Context,
  next: NextFunction,
) {
  const userId = ctx.from?.id?.toString();
  if (!userId) return;

  const token = await getToken(userId);
  ctx.traktToken = token;

  await next();
}

declare module "grammy" {
  interface Context {
    traktToken: import("../storage/tokens.ts").StoredToken | null;
  }
}
