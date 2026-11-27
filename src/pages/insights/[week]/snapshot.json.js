import { loadEditions } from '../../../insights/archive.js';

export async function getStaticPaths() {
  const editions = await loadEditions();
  return editions.filter(edition => edition.event).map(({ snapshot, event }) => ({
    params: { week: snapshot.weekStartUtc },
    props: { event },
  }));
}

export function GET({ props }) {
  return Response.json(props.event);
}
