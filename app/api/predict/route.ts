import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const MODEL = process.env.MODEL_API_URL; // when ready, set to your FastAPI model endpoint

  // If MODEL not set, return demo value
  if (!MODEL) {
    const land = Number(body?.land_size_ha ?? 0.5);
    const demo = 1980 * Math.max(0.2, land); // simple demo calc
    return NextResponse.json({ ok: true, predicted_kg: demo, note: 'Demo prediction (no public model URL)' });
  }

  try {
    const r = await fetch(MODEL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const j = await r.json();
    if (!r.ok) return NextResponse.json({ ok: false, error: j?.detail || 'Model error' }, { status: r.status });
    return NextResponse.json(j);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Model fetch failed' }, { status: 502 });
  }
}
