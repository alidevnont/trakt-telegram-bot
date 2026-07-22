import { trakt } from "./client.ts";

interface TraktImages {
  poster?: { full?: string; medium?: string; thumb?: string };
  fanart?: { full?: string; medium?: string };
  banner?: { full?: string; medium?: string };
}

export async function getMovieImages(
  slug: string,
  accessToken?: string,
): Promise<TraktImages | null> {
  try {
    const res = await trakt.movies.summary({
      params: { id: slug },
      query: { extended: "full,images" },
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });
    if (res.status === 200) {
      return (res.body as Record<string, unknown>).images as TraktImages || null;
    }
  } catch {}
  return null;
}

export async function getShowImages(
  slug: string,
  accessToken?: string,
): Promise<TraktImages | null> {
  try {
    const res = await trakt.shows.summary({
      params: { id: slug },
      query: { extended: "full,images" },
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });
    if (res.status === 200) {
      return (res.body as Record<string, unknown>).images as TraktImages || null;
    }
  } catch {}
  return null;
}

export function getPosterUrl(images: TraktImages | null): string | null {
  return images?.poster?.full || images?.poster?.medium || null;
}

export function getFanartUrl(images: TraktImages | null): string | null {
  return images?.fanart?.full || images?.fanart?.medium || null;
}
