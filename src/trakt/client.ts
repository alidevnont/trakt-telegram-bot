import { traktApi, Environment } from "@trakt/api";

const client = traktApi({
  apiKey: Deno.env.get("TRAKT_CLIENT_ID")!,
  environment: Environment.production,
});

export { client as trakt };
