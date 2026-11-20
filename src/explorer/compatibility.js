// Observed on 20 November 2026 at 13:20:26 HKT by the explorer's three configured relays.
export const referenceSample = Object.freeze({
  matched: 124,
  total: 146,
  relays: 3,
  observedAt: 1795152026,
});

export function countCompatibility(heads, supportedDomains) {
  const eligible = heads.filter(head => head.status === 'eligible');
  const matched = eligible.filter(head => head.required.every(domain => supportedDomains.has(domain)));
  return { matched: matched.length, total: eligible.length };
}
