import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { meta } from '../../lib/meta';

export const GET: APIRoute = async () => {
  const entries = await getCollection('races');
  const races = entries.map((e) => ({ id: e.id, ...e.data }));

  return new Response(JSON.stringify({ meta, races }, null, 2));
};
