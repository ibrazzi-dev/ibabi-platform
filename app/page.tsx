"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

// Plotly must be loaded dynamically on the client
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

type Harvest = { product: string; kg: number };
type Livestock = { product: string; qty: number };

export default function Home() {
  // loading + error
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // data
  const [harvest, setHarvest] = useState<Harvest[]>([]);
  const [livestock, setLivestock] = useState<Livestock[]>([]);

  // prediction form state
  const [form, setForm] = useState({
    product_name: "BEANS",
    product_type: "crops",
    district: "NYARUGENGE",
    sector: "KIGALI",
    cell: "KIGALI",
    village: "UMUCYO",
    land_size_ha: 0.5,
    year: 2025,
    month: 8,
  });
  const [pred, setPred] = useState<string>("");

  // fetch aggregated summary from your Next API: /api/summary
  useEffect(() => {
    const go = async () => {
      setLoading(true);
      setErr(null);
      try {
        const r = await fetch("/api/summary", { cache: "no-store" });
        const j = await r.json();
        if (!r.ok || !j.ok) throw new Error(j.error || "Failed to load summary");
        setHarvest(j.harvest || []);
        setLivestock(j.livestock || []);
      } catch (e: any) {
        setErr(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    };
    go();
  }, []);

  // charts
  const harvestFig = useMemo(() => {
    const x = harvest.map((d) => d.product);
    const y = harvest.map((d) => d.kg);
    return {
      data: [{ type: "bar", x, y }],
      layout: {
        title: "Harvest (kg) — monthly totals",
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        margin: { t: 40, r: 20, b: 60, l: 50 },
      },
      config: { displayModeBar: false },
    };
  }, [harvest]);

  const livestockFig = useMemo(() => {
    const x = livestock.map((d) => d.product);
    const y = livestock.map((d) => d.qty);
    return {
      data: [{ type: "bar", x, y }],
      layout: {
        title: "Livestock production — monthly totals",
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        margin: { t: 40, r: 20, b: 60, l: 50 },
      },
      config: { displayModeBar: false },
    };
  }, [livestock]);

  // call your Next API: /api/predict -> forwards to FastAPI (or returns demo)
  async function submitPredict() {
    setPred("…");
    try {
      const r = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await r.json();
      if (!r.ok || j.ok === false) throw new Error(j.error || "Prediction failed");
      const kg = j.predicted_kg ?? j.prediction ?? j.value;
      const note = j.note ? ` — ${j.note}` : "";
      setPred(`Predicted yield: ${Number(kg).toFixed(2)} kg${note}`);
    } catch (e: any) {
      setPred(`Prediction error: ${e?.message || String(e)}`);
    }
  }

  return (
    <main
      style={{
        fontFamily: "Inter, system-ui, Arial, sans-serif",
        padding: "24px",
        background: "#f6fbf7",
        color: "#0f2e16",
        minHeight: "100vh",
      }}
    >
      {/* header */}
      <header style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontWeight: 800, fontSize: 22 }}>AGRI PLATFORM DASHBOARD</div>
        <span style={{ fontSize: 12, color: "#2f7a3e" }}>IBABI API + ML Prediction</span>
      </header>

      {/* error banner */}
      {err && (
        <div style={{ background: "#fff3f3", color: "#b00020", padding: 10, borderRadius: 8, marginBottom: 12 }}>
          Error: {err}
        </div>
      )}

      {/* charts */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div style={{ background: "white", borderRadius: 14, padding: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
          {loading ? (
            <div>Loading…</div>
          ) : (
            <Plot data={harvestFig.data as any} layout={harvestFig.layout as any} config={harvestFig.config as any} />
          )}
        </div>
        <div style={{ background: "white", borderRadius: 14, padding: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
          {loading ? (
            <div>Loading…</div>
          ) : (
            <Plot data={livestockFig.data as any} layout={livestockFig.layout as any} config={livestockFig.config as any} />
          )}
        </div>
      </section>

      {/* prediction */}
      <section style={{ background: "white", borderRadius: 14, padding: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>Prediction panel</div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, minmax(120px, 1fr))",
            gap: 8,
            alignItems: "center",
          }}
        >
          <input value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} placeholder="product_name" />
          <select value={form.product_type} onChange={(e) => setForm({ ...form, product_type: e.target.value })}>
            <option value="crops">crops</option>
            <option value="livestock">livestock</option>
          </select>
          <input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} placeholder="district" />
          <input value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} placeholder="sector" />
          <input value={form.cell} onChange={(e) => setForm({ ...form, cell: e.target.value })} placeholder="cell" />
          <input value={form.village} onChange={(e) => setForm({ ...form, village: e.target.value })} placeholder="village" />
          <input
            type="number"
            value={form.land_size_ha}
            onChange={(e) => setForm({ ...form, land_size_ha: Number(e.target.value) })}
            placeholder="land_size_ha"
          />
          <input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} placeholder="year" />
          <input type="number" value={form.month} onChange={(e) => setForm({ ...form, month: Number(e.target.value) })} placeholder="month" />
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center" }}>
          <button
            onClick={submitPredict}
            style={{
              background: "#2e7d32",
              color: "white",
              border: 0,
              padding: "8px 14px",
              borderRadius: 10,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Predict
          </button>
          <div style={{ color: "#0f5132" }}>{pred}</div>
        </div>

        <div style={{ marginTop: 8, fontSize: 12, color: "#7a8a7f" }}>
          API: <code>/api/summary</code> &nbsp;•&nbsp; <code>/api/predict</code>
        </div>
      </section>
    </main>
  );
}
