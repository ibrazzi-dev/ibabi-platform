import { NextResponse } from "next/server";

export async function GET() {
  try {
    const base = process.env.IBABI_API_BASE || "https://ibabi.onrender.com/api/ai-data/";
    // keep the query light to avoid timeouts
    const url = `${base}?page=1&page_size=50&year=2025&month=8`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ error: `Upstream ${res.status}` }, { status: 502 });
    }
    const payload = await res.json();

    // Flexible reading: works whether the data is nested or flat
    const results = payload?.results || payload?.reports?.harvest_reports?.results || [];

    // Aggregate: top products by kg (crops) & quantities for livestock
    type Row = { product_name?: string; product?: string; product_type?: string; quantity?: number; target_kg?: number; kg?: number };

    const harvestMap = new Map<string, number>();
    const livestockMap = new Map<string, number>();

    (results as Row[]).forEach((r) => {
      const name = (r.product_name || r.product || "Unknown").toUpperCase();
      const isLivestock = (r.product_type || "").toLowerCase() === "livestock";

      const value = Number(r.target_kg ?? r.kg ?? r.quantity ?? 0);

      if (isLivestock) {
        livestockMap.set(name, (livestockMap.get(name) || 0) + value);
      } else {
        harvestMap.set(name, (harvestMap.get(name) || 0) + value);
      }
    });

    const harvest = Array.from(harvestMap, ([product, kg]) => ({ product, kg }))
      .sort((a, b) => b.kg - a.kg)
      .slice(0, 8);

    const livestock = Array.from(livestockMap, ([product, qty]) => ({ product, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 8);

    return NextResponse.json({ ok: true, harvest, livestock });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
