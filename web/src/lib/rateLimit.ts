/** Rate limit en memoria (ventana fija) por clave. Suficiente para el MVP/demo; no sirve entre instancias. */
export function createRateLimiter(max: number, windowMs: number, now: () => number = Date.now) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return function allow(key: string): boolean {
    const t = now();
    const h = hits.get(key);
    if (!h || t >= h.resetAt) {
      hits.set(key, { count: 1, resetAt: t + windowMs });
      if (hits.size > 5000) for (const [k, v] of hits) if (t >= v.resetAt) hits.delete(k);
      return true;
    }
    h.count += 1;
    return h.count <= max;
  };
}
