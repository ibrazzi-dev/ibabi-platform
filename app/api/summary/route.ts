import { NextResponse } from 'next/server';

const DEMO = {
  ok: true,
  note: 'Demo data',
  harvest: [
    { product: 'Beans', kg: 5600 },
    { product: 'Cassava', kg: 3200 },
    { product: 'Cabbage', kg: 1800 },
    { product: 'Carrots', kg: 1700 },
    { product: 'Tomatoes', kg: 1300 },
    { product: 'Irish Potatoes', kg: 600 },
  ],
  livestock: [
    { product: 'Cattle', qty: 1165 },
    { product: 'Poultry', qty: 80 },
  ],
  totals: { harvestKg: 14200, livestockQty: 1190, issues: 0 },
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const force = searchParams.get('force') === '1';
  const IBABI = process.env.IBABI_SUMMARY_URL; // e.g. https://ibabi.onrender.com/api/ai-data/summary

  // If no IBABI configured or we're forcing demo: return demo immediately
  if (!IBABI || force === false) {
    // still try live, but fallback silently
  }

  if (!IBABI) {
    return NextResponse.json({ ...DEMO, note: 'Demo data (no IBABI_SUMMARY_URL set)' }, { status: 200 });
  }

  try {
    const r = await fetch(IBABI, { next: { revalidate: 0 }, cache: 'no-store' });
    if (!r.ok) throw new Error(`Upstream ${r.status}`);
    const j = await r.json();

    // shape into simple arrays if needed
    const harvest = Array.isArray(j.harvest) ? j.harvest : DEMO.harvest;
    const livestock = Array.isArray(j.livestock) ? j.livestock : DEMO.livestock;
    const totals = j.totals ?? DEMO.totals;

    return NextResponse.json({ ok: true, harvest, livestock, totals, note: 'Live data' }, { status: 200 });
  } catch {
    // Fallback to demo but still 200 so the page stays clean
    return NextResponse.json({ ...DEMO, ok: true, note: 'Demo data (upstream unavailable)' }, { status: 200 });
  }
}
