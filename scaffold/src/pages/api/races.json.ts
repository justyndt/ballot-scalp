import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { meta } from '../../lib/meta';

/* Optional. The site itself doesn't need this — content collections are
   read at build time. Add it only if something else consumes the data
   (a civic app, a newsroom, a bot). It ships the same artifact the site
   was built from, so the two can never disagree. */
export const GET: APIRoute = async () => {
  const entries = await getCollection('races');
  const races = entries.map((e) => ({ id: e.id, ...e.data }));

  return new Response(JSON.stringify({ meta, races }, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
};
