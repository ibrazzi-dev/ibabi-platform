'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

// ---------- DEMO DATA (never fails) ----------
type Harvest = { product: string; kg: number };
type Livestock = { product: string; qty: number };

const DEMO: { harvest: Harvest[]; livestock: Livestock[] } = {
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
};

export default function Page() {
  const [harvest, setHarvest] = useState<Harvest[]>(DEMO.harvest);
  const [livestock, setLivestock] = useState<Livestock[]>(DEMO.livestock);
  const [status, setStatus] = useState<'Ready'|'Loading…'|'Live loaded'|'Live failed (using demo)'>('Ready');

  // prediction form
  const [form, setForm] = useState({
    product_name: 'BEANS',
    product_type: 'crops',
    district: 'NYARUGENGE',
    sector: 'KIGALI',
    cell: 'KIGALI',
    village: 'UMUCYO',
    land_size_ha: 0.5,
    year: 2025,
    month: 8,
  });
  const [pred, setPred] = useState<string>('');

  async function tryLoadLive() {
    setStatus('Loading…');
    try {
      const r = await fetch('/api/summary?pages=3&pageSize=40', { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok || !j.ok || !Array.isArray(j.harvest) || !Array.isArray(j.livestock)) {
        setStatus('Live failed (using demo)');
        // keep demo
        return;
      }
      setHarvest(j.harvest);
      setLivestock(j.livestock);
      setStatus('Live loaded');
    } catch {
      setStatus('Live failed (using demo)');
    }
  }

  async function submitPredict() {
    setPred('…');
    try {
      const r = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const j = await r.json();
      if (!r.ok || j.ok === false) throw new Error(j.error || 'Prediction failed');
      const kg = j.predicted_kg ?? j.prediction ?? j.value;
      const note = j.note ? ` — ${j.note}` : ' — Demo prediction (no public model URL)';
      setPred(`Predicted yield: ${Number(kg).toFixed(2)} kg${note}`);
    } catch (e: any) {
      setPred(`Prediction error: ${e?.message || String(e)}`);
    }
  }

  const harvestFig = useMemo(() => {
    const x = harvest.map(d => d.product);
    const y = harvest.map(d => d.kg);
    return {
      data: [{ type: 'bar', x, y }],
      layout: {
        title: 'Harvest (kg) — monthly totals',
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        margin: { t: 40, r: 20, b: 60, l: 50 },
      },
      config: { displayModeBar: false },
    };
  }, [harvest]);

  const livestockFig = useMemo(() => {
    const x = livestock.map(d => d.product);
    const y = livestock.map(d => d.qty);
    return {
      data: [{ type: 'bar', x, y }],
      layout: {
        title: 'Livestock production — monthly totals',
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        margin: { t: 40, r: 20, b: 60, l: 50 },
      },
      config: { displayModeBar: false },
    };
  }, [livestock]);

  const badgeColor =
    status === 'Live loaded' ? '#d1fae5' :
    status === 'Loading…' ? '#fff7ed' :
    status === 'Ready' ? '#e5f3ea' : '#fee2e2';

  return (
    <main style={{ fontFamily: 'Inter, system-ui, Arial, sans-serif', background:'#f6fbf7', color:'#0f2e16', padding:'24px' }}>
      <header style={{ display:'flex', gap:12, alignItems:'center', marginBottom:12 }}>
        <div style={{ fontWeight:800, fontSize:22 }}>AGRI PLATFORM DASHBOARD</div>
        <span style={{ fontSize:12, color:'#2f7a3e' }}>IBABI API + ML Prediction</span>
      </header>

      <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:12 }}>
        <div style={{ fontSize:12, color:'#2f7a3e' }}>Status</div>
        <div style={{ background: badgeColor, padding:'6px 10px', borderRadius:999, fontSize:12 }}>
          {status}
        </div>
        <button
          onClick={tryLoadLive}
          style={{ marginLeft:8, background:'#2e7d32', color:'white', border:0, padding:'6px 12px', borderRadius:8, fontWeight:700 }}
        >Load live summary</button>
      </div>

      <section style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        <div style={{ background:'white', borderRadius:14, padding:16, boxShadow:'0 2px 10px rgba(0,0,0,0.06)' }}>
          <Plot data={harvestFig.data as any} layout={harvestFig.layout as any} config={harvestFig.config as any} />
        </div>
        <div style={{ background:'white', borderRadius:14, padding:16, boxShadow:'0 2px 10px rgba(0,0,0,0.06)' }}>
          <Plot data={livestockFig.data as any} layout={livestockFig.layout as any} config={livestockFig.config as any} />
        </div>
      </section>

      <section style={{ background:'white', borderRadius:14, padding:16, boxShadow:'0 2px 10px rgba(0,0,0,0.06)' }}>
        <div style={{ fontWeight:700, marginBottom:12 }}>Prediction panel</div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(6, minmax(120px, 1fr))', gap:8, alignItems:'center' }}>
          <input value={form.product_name} onChange={e=>setForm({...form, product_name:e.target.value})} placeholder="product_name" />
          <select value={form.product_type} onChange={e=>setForm({...form, product_type:e.target.value})}>
            <option value="crops">crops</option>
            <option value="livestock">livestock</option>
          </select>
          <input value={form.district} onChange={e=>setForm({...form, district:e.target.value})} placeholder="district" />
          <input value={form.sector} onChange={e=>setForm({...form, sector:e.target.value})} placeholder="sector" />
          <input value={form.cell} onChange={e=>setForm({...form, cell:e.target.value})} placeholder="cell" />
          <input value={form.village} onChange={e=>setForm({...form, village:e.target.value})} placeholder="village" />
          <input type="number" value={form.land_size_ha} onChange={e=>setForm({...form, land_size_ha:Number(e.target.value)})} placeholder="land_size_ha" />
          <input type="number" value={form.year} onChange={e=>setForm({...form, year:Number(e.target.value)})} placeholder="year" />
          <input type="number" value={form.month} onChange={e=>setForm({...form, month:Number(e.target.value)})} placeholder="month" />
        </div>

        <div style={{ marginTop:10, display:'flex', gap:10, alignItems:'center' }}>
          <button onClick={submitPredict} style={{ background:'#2e7d32', color:'white', border:0, padding:'8px 14px', borderRadius:10, fontWeight:700 }}>
            Predict
          </button>
          <div style={{ color:'#0f5132' }}>{pred}</div>
        </div>

        <div style={{ marginTop:8, fontSize:12, color:'#7a8a7f' }}>
          API: <code>/api/summary</code> &nbsp;•&nbsp; <code>/api/predict</code>
        </div>
      </section>
    </main>
  );
}
