'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

type Harvest = { product: string; kg: number };
type Livestock = { product: string; qty: number };

type SummaryOut = {
  ok: boolean;
  note?: string;
  harvest: Harvest[];
  livestock: Livestock[];
  totals: { harvestKg: number; livestockQty: number; issues: number };
};

const DEMO: SummaryOut = {
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

export default function Page() {
  const [year, setYear] = useState(2025);
  const [month, setMonth] = useState(8);
  const [pageSize, setPageSize] = useState(40);

  const [status, setStatus] = useState<'loading'|'ready'|'live'|'demo'>('loading');
  const [summary, setSummary] = useState<SummaryOut>(DEMO);
  const [err, setErr] = useState<string | null>(null);

  // prediction
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
  const [pred, setPred] = useState<string>('Model idle.');

  useEffect(() => {
    loadLive(false); // auto try once; will demo-fallback inside route
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadLive(force: boolean) {
    setErr(null);
    setStatus('loading');
    try {
      const url = `/api/summary?year=${year}&month=${month}&pages=3&pageSize=${pageSize}&force=${force?'1':'0'}`;
      const r = await fetch(url, { cache: 'no-store' });
      const j: SummaryOut = await r.json();
      if (!r.ok || !j.ok) throw new Error((j as any).error || 'Failed');
      setSummary(j);
      setStatus(j.note?.toLowerCase().includes('demo') ? 'demo' : 'live');
    } catch (e: any) {
      setSummary(DEMO);
      setStatus('demo');
      setErr(e?.message || String(e));
    }
  }

  const harvestFig = useMemo(() => {
    const x = summary.harvest.map(d => d.product);
    const y = summary.harvest.map(d => d.kg);
    return {
      data: [{ type: 'bar', x, y }],
      layout: {
        title: 'Top harvest products (kg)',
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { color: '#dbe7db' },
        margin: { t: 40, r: 20, b: 60, l: 60 },
      },
      config: { displayModeBar: false },
    };
  }, [summary.harvest]);

  const livestockFig = useMemo(() => {
    const x = summary.livestock.map(d => d.product);
    const y = summary.livestock.map(d => d.qty);
    return {
      data: [{ type: 'bar', x, y }],
      layout: {
        title: 'Livestock production (quantity)',
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { color: '#dbe7db' },
        margin: { t: 40, r: 20, b: 60, l: 60 },
      },
      config: { displayModeBar: false },
    };
  }, [summary.livestock]);

  async function submitPredict() {
    setPred('Predicting…');
    try {
      const r = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const j = await r.json();
      if (!r.ok || j.ok === false) throw new Error(j.error || 'Prediction failed');
      const kg = j.predicted_kg ?? j.prediction ?? j.value ?? 990;
      const note = j.note ? ` — ${j.note}` : ' — Demo prediction (no public model URL)';
      setPred(`Predicted yield: ${Number(kg).toFixed(2)} kg${note}`);
    } catch (e: any) {
      setPred(`Prediction error: ${e?.message || String(e)}`);
    }
  }

  // ---------- styling helpers ----------
  const card: React.CSSProperties = {
    background: '#0f1d14',
    borderRadius: 16,
    padding: 16,
    boxShadow: '0 6px 24px rgba(0,0,0,.25) inset, 0 2px 10px rgba(0,0,0,.25)',
    border: '1px solid #1b2a20',
  };
  const kpiVal: React.CSSProperties = { fontSize: 28, fontWeight: 800, color: '#dbe7db' };
  const label: React.CSSProperties = { fontSize: 12, color: '#9fb59f' };

  return (
    <main style={{ fontFamily:'Inter, system-ui, Arial, sans-serif', background:'#06140a', color:'#dbe7db', minHeight:'100vh' }}>
      {/* Top bar */}
      <div style={{
        background:'linear-gradient(90deg,#155b2a,#0f3e1d)',
        color:'white', padding:'14px 20px', display:'flex', justifyContent:'space-between', alignItems:'center'
      }}>
        <div style={{ fontWeight:900, letterSpacing:.3 }}>Agri Platform Dashboard</div>
        <div style={{ fontSize:12, opacity:.9 }}>IBABI data + ML prediction</div>
      </div>

      {/* Controls */}
      <div style={{ padding:20, display:'grid', gridTemplateColumns:'repeat(5, 160px) 1fr', gap:12, alignItems:'center' }}>
        <div style={card}>
          <div style={label}>Year</div>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            style={{ width:'100%', background:'transparent', color:'#dbe7db', border:'1px solid #213626', borderRadius:10, padding:'6px 10px' }}
          >
            {[2024,2025].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div style={card}>
          <div style={label}>Month</div>
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            style={{ width:'100%', background:'transparent', color:'#dbe7db', border:'1px solid #213626', borderRadius:10, padding:'6px 10px' }}
          >
            {Array.from({length:12},(_,i)=>i+1).map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div style={card}>
          <div style={label}>Page size (fallback)</div>
          <input
            type="number" value={pageSize}
            onChange={e => setPageSize(Number(e.target.value))}
            style={{ width:'100%', background:'transparent', color:'#dbe7db', border:'1px solid #213626', borderRadius:10, padding:'6px 10px' }}
          />
        </div>
        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          <button
            onClick={() => loadLive(true)}
            style={{ background:'#28a745', color:'white', border:0, padding:'10px 16px', borderRadius:999, fontWeight:800 }}
          >
            Load full month
          </button>
          <div style={{
            padding:'6px 10px', borderRadius:999,
            background: status==='live'? '#124f2a' : status==='loading' ? '#5b4a1b' : '#3a2c2c',
            border: '1px solid #1f3124', fontSize:12
          }}>
            {status==='live' ? 'Live' : status==='loading' ? 'Loading…' : 'Using demo'}
          </div>
        </div>
        {summary.note && <div style={{fontSize:12, color:'#aacaaa'}}>{summary.note}</div>}
      </div>

      {/* KPIs */}
      <div style={{ padding:'0 20px', display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12 }}>
        <div style={card}>
          <div style={label}>Total harvest (kg)</div>
          <div style={kpiVal}>{summary.totals.harvestKg.toLocaleString()}</div>
        </div>
        <div style={card}>
          <div style={label}>Livestock quantity</div>
          <div style={kpiVal}>{summary.totals.livestockQty.toLocaleString()}</div>
        </div>
        <div style={card}>
          <div style={label}>Issues reported</div>
          <div style={kpiVal}>{summary.totals.issues || '—'}</div>
        </div>
      </div>

      {/* Charts */}
      <div style={{ padding:20, display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div style={{ ...card, padding:22 }}>
          <Plot data={harvestFig.data as any} layout={harvestFig.layout as any} config={harvestFig.config as any} />
        </div>
        <div style={{ ...card, padding:22 }}>
          <Plot data={livestockFig.data as any} layout={livestockFig.layout as any} config={livestockFig.config as any} />
        </div>
      </div>

      {/* Prediction */}
      <div style={{ padding:'0 20px 24px' }}>
        <div style={{ ...card }}>
          <div style={{ fontWeight:800, marginBottom:12, color:'#cfe6cf' }}>Prediction panel</div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(6, minmax(150px, 1fr))', gap:10 }}>
            <input value={form.product_name} onChange={e=>setForm({...form, product_name:e.target.value})} placeholder="product_name"
              style={{ background:'transparent', color:'#dbe7db', border:'1px solid #213626', borderRadius:10, padding:'8px 10px' }}/>
            <select value={form.product_type} onChange={e=>setForm({...form, product_type:e.target.value})}
              style={{ background:'transparent', color:'#dbe7db', border:'1px solid #213626', borderRadius:10, padding:'8px 10px' }}>
              <option value="crops">crops</option>
              <option value="livestock">livestock</option>
            </select>
            <input value={form.district} onChange={e=>setForm({...form, district:e.target.value})} placeholder="district"
              style={{ background:'transparent', color:'#dbe7db', border:'1px solid #213626', borderRadius:10, padding:'8px 10px' }}/>
            <input value={form.sector} onChange={e=>setForm({...form, sector:e.target.value})} placeholder="sector"
              style={{ background:'transparent', color:'#dbe7db', border:'1px solid #213626', borderRadius:10, padding:'8px 10px' }}/>
            <input value={form.cell} onChange={e=>setForm({...form, cell:e.target.value})} placeholder="cell"
              style={{ background:'transparent', color:'#dbe7db', border:'1px solid #213626', borderRadius:10, padding:'8px 10px' }}/>
            <input value={form.village} onChange={e=>setForm({...form, village:e.target.value})} placeholder="village"
              style={{ background:'transparent', color:'#dbe7db', border:'1px solid #213626', borderRadius:10, padding:'8px 10px' }}/>

            <input type="number" value={form.land_size_ha}
              onChange={e=>setForm({...form, land_size_ha:Number(e.target.value)})}
              placeholder="land_size_ha"
              style={{ background:'transparent', color:'#dbe7db', border:'1px solid #213626', borderRadius:10, padding:'8px 10px' }}/>
            <input type="number" value={form.year}
              onChange={e=>setForm({...form, year:Number(e.target.value)})}
              placeholder="year"
              style={{ background:'transparent', color:'#dbe7db', border:'1px solid #213626', borderRadius:10, padding:'8px 10px' }}/>
            <input type="number" value={form.month}
              onChange={e=>setForm({...form, month:Number(e.target.value)})}
              placeholder="month"
              style={{ background:'transparent', color:'#dbe7db', border:'1px solid #213626', borderRadius:10, padding:'8px 10px' }}/>
          </div>

          <div style={{ marginTop:12, display:'flex', gap:10, alignItems:'center' }}>
            <button onClick={submitPredict}
              style={{ background:'#2aa353', color:'white', border:0, padding:'10px 16px', borderRadius:12, fontWeight:800 }}>
              PREDICT
            </button>
            <div style={{ color:'#9fd3a6', fontSize:14 }}>{pred}</div>
          </div>

          {err && <div style={{ marginTop:10, color:'#ffbdbd', fontSize:12 }}>Last load error: {err}</div>}
          <div style={{ marginTop:10, color:'#7aa184', fontSize:12 }}>
            API_BASE = <code>/api/summary</code>  |  MODEL_API = <code>/api/predict</code>
          </div>
        </div>
      </div>
    </main>
  );
}
