import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Check,
  ChevronRight,
  Clock3,
  Crosshair,
  Download,
  Eye,
  Layers3,
  MapPin,
  Radio,
  RadioTower,
  Route,
  ShieldAlert,
  ShieldCheck,
  Signal,
  Siren,
  Users,
  Waves,
  WifiOff,
  X,
  Zap,
} from 'lucide-react';
import MapPanel from './MapPanel';
import { roads, villages, type RiskLevel } from './data';

const riskTone: Record<RiskLevel, string> = {
  Critical: 'critical',
  High: 'high',
  Medium: 'medium',
  Safe: 'safe',
};

const navItems = [
  { id: 'overview', label: 'Command overview', icon: Crosshair },
  { id: 'live-map', label: 'Live disaster map', icon: MapPin },
  { id: 'silent-areas', label: 'Silent area detection', icon: Eye, count: '02' },
  { id: 'rescue-priority', label: 'Rescue priority', icon: ShieldAlert },
  { id: 'mesh-network', label: 'Offline mesh relay', icon: RadioTower },
];

type LayerKey = 'villages' | 'facilities' | 'roads' | 'riskZones';
const layerOptions: { key: LayerKey; label: string; hint: string }[] = [
  { key: 'villages', label: 'Villages & isolation', hint: '7 village markers' },
  { key: 'facilities', label: 'Response facilities', hint: 'Hospitals, shelters, teams' },
  { key: 'roads', label: 'Road network', hint: 'Open, flooded, blocked' },
  { key: 'riskZones', label: 'Risk & flood zones', hint: 'Modeled exposure overlays' },
];

function App() {
  const [blockedRoads, setBlockedRoads] = useState<string[]>(roads.filter((road) => road.status === 'blocked').map((road) => road.id));
  const [activeNav, setActiveNav] = useState('overview');
  const [layersOpen, setLayersOpen] = useState(false);
  const [mapLayers, setMapLayers] = useState<Record<LayerKey, boolean>>({ villages: true, facilities: true, roads: true, riskZones: true });
  const [toast, setToast] = useState('');
  const [meshHop, setMeshHop] = useState(3);
  const [meshSending, setMeshSending] = useState(false);
  const [meshDelivered, setMeshDelivered] = useState(true);
  const [alertOpen, setAlertOpen] = useState(false);
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!meshSending) return undefined;
    const timer = window.setTimeout(() => {
      if (meshHop >= 3) {
        setMeshSending(false);
        setMeshDelivered(true);
        showToast('Emergency ping relayed to the command post.');
      } else {
        setMeshHop((current) => current + 1);
      }
    }, 820);
    return () => window.clearTimeout(timer);
  }, [meshSending, meshHop]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function showToast(message: string) {
    setToast(message);
  }

  const isolatedIds = useMemo(() => {
    const connected = new Set<string>(['sullia']);
    let changed = true;
    while (changed) {
      changed = false;
      roads.forEach((road) => {
        if (blockedRoads.includes(road.id)) return;
        if (connected.has(road.from) && !connected.has(road.to)) {
          connected.add(road.to);
          changed = true;
        } else if (connected.has(road.to) && !connected.has(road.from)) {
          connected.add(road.from);
          changed = true;
        }
      });
    }
    return new Set(villages.filter((village) => village.id !== 'sullia' && !connected.has(village.id)).map((village) => village.id));
  }, [blockedRoads]);

  const priorityRows = useMemo(() => villages
    .filter((village) => village.id !== 'sullia')
    .map((village) => {
      const isolated = isolatedIds.has(village.id);
      const score = Math.min(99, village.score + (isolated ? 11 : 0));
      const risk: RiskLevel = isolated ? 'Critical' : village.risk;
      const reason = isolated ? `Access severed by road closure. ${village.reason}` : village.reason;
      return { ...village, isolated, score, risk, reason };
    })
    .sort((a, b) => b.score - a.score), [isolatedIds]);

  const silentVillages = villages.filter((village) => village.reports === 0 && village.risk !== 'Safe');
  const blockedCount = blockedRoads.length;
  const floodedCount = roads.filter((road) => road.status === 'flooded' && !blockedRoads.includes(road.id)).length;
  const activeLayerCount = Object.values(mapLayers).filter(Boolean).length;

  function toggleRoad(id: string) {
    const road = roads.find((item) => item.id === id);
    if (!road) return;
    const willBlock = !blockedRoads.includes(id);
    setBlockedRoads((current) => willBlock ? [...current, id] : current.filter((roadId) => roadId !== id));
    showToast(willBlock ? `${road.name} marked blocked · isolation model updated` : `${road.name} reopened · access recalculated`);
  }

  function launchMeshRelay() {
    if (meshSending) return;
    setMeshHop(0);
    setMeshDelivered(false);
    setMeshSending(true);
  }

  function exportBrief() {
    const rows = [
      ['Rank', 'Village', 'Taluk', 'Priority score', 'Risk', 'Confidence %', 'Accessibility', 'Emergency reports'],
      ...priorityRows.map((village, index) => [
        String(index + 1), village.name, village.taluk, String(village.score), village.risk,
        String(village.confidence), village.isolated ? 'Isolated' : 'Reachable', String(village.reports),
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = 'drishti-situation-brief.csv';
    link.click();
    URL.revokeObjectURL(link.href);
    showToast('Situation brief exported as CSV.');
  }

  function jumpTo(id: string) {
    setActiveNav(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const formattedTime = time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' });
  const dateLabel = time.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).toUpperCase();

  return (
    <div className="app-shell" id="overview">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <span className="mark-ring ring-one" />
            <span className="mark-ring ring-two" />
            <span className="mark-needle" />
            <span className="mark-core" />
          </div>
          <div>
            <div className="brand-name">DRISHTI<span>™</span></div>
            <div className="brand-subtitle">DISASTER INTELLIGENCE</div>
          </div>
        </div>

        <div className="team-chip"><span className="team-dot" /> PROJECT ABHEDYA <span className="chip-separator">/</span> TRACK 05</div>
        <div className="sidebar-section-label">OPERATIONS</div>
        <nav className="side-nav" aria-label="Dashboard sections">
          {navItems.map(({ id, label, icon: Icon, count }) => (
            <button key={id} className={`nav-item ${activeNav === id ? 'active' : ''}`} onClick={() => jumpTo(id)}>
              <Icon size={16} strokeWidth={1.8} />
              <span>{label}</span>
              {count && <span className="nav-count">{silentVillages.length.toString().padStart(2, '0')}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-divider" />
        <div className="sidebar-section-label">ACTIVE SCENARIO</div>
        <div className="scenario-card">
          <div className="scenario-icon"><Waves size={17} /></div>
          <div className="scenario-copy">
            <strong>Monsoon response</strong>
            <span>Dakshina Kannada</span>
          </div>
          <span className="pulse-dot" />
        </div>
        <div className="scenario-meta"><span>Scenario ID</span><strong>DK-FLD-062</strong></div>
        <div className="scenario-meta"><span>Activated</span><strong>06 Nov · 08:20 IST</strong></div>

        <div className="sidebar-footer">
          <div className="footer-status"><span className="online-dot" /> DEMO SYSTEM READY</div>
          <div className="team-credit">DESIGNED BY <strong>TEAM ANVESHA</strong></div>
          <div className="sidebar-version">DRISHTI CONSOLE <span>v0.9.4</span></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb"><span>COMMAND CENTRE</span><ChevronRight size={13} /><strong>OVERVIEW</strong></div>
          <div className="topbar-right">
            <div className="simulation-pill"><span className="simulation-pulse" /> SIMULATION · NOT LIVE</div>
            <div className="topbar-clock"><Clock3 size={14} /><span>{dateLabel}</span><b>{formattedTime} IST</b></div>
            <button className={`icon-button notification-button ${alertOpen ? 'selected' : ''}`} aria-label="Show notifications" onClick={() => setAlertOpen(!alertOpen)}>
              <Bell size={17} />
              <span className="notification-dot" />
            </button>
            <div className="user-avatar" title="Incident commander">IC</div>
            {alertOpen && (
              <div className="notification-popover">
                <div className="popover-heading">Incident updates <button aria-label="Close notifications" onClick={() => setAlertOpen(false)}><X size={14} /></button></div>
                <div className="popover-row"><span className="popover-alert"><AlertTriangle size={14} /></span><span><b>2 silent zones</b><small>Verification dispatch recommended</small></span></div>
                <div className="popover-row"><span className="popover-info"><Route size={14} /></span><span><b>Bridge approach blocked</b><small>Belthangady–Dharmasthala · 3 min ago</small></span></div>
              </div>
            )}
          </div>
        </header>

        <div className="page-content">
          <section className="page-heading">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> DISASTER RESPONSE DASHBOARD <span className="heading-separator">·</span> DAKSHINA KANNADA</div>
              <h1>Situation overview<span className="title-period">.</span></h1>
              <p className="page-subtitle">Flood &amp; landslide response coordination across Sullia and Belthangady taluks.</p>
            </div>
            <div className="heading-actions">
              <div className="sync-caption"><span className="online-dot" /> SCENARIO FEED <b>SYNCED</b></div>
              <button className="button-secondary" onClick={exportBrief}><Download size={15} /> Export situation brief</button>
            </div>
          </section>

          <section className="metric-grid" aria-label="Scenario summary">
            <article className="metric-card metric-alert">
              <div className="metric-topline"><span>Villages isolated</span><span className="metric-icon red-icon"><Route size={16} /></span></div>
              <div className="metric-value">{isolatedIds.size.toString().padStart(2, '0')}<span className="metric-unit"> / 06</span></div>
              <div className="metric-foot"><span className="metric-change red-text"><ArrowUpRight size={13} /> ACCESS WATCH</span><span>network model</span></div>
            </article>
            <article className="metric-card">
              <div className="metric-topline"><span>High-risk villages</span><span className="metric-icon amber-icon"><ShieldAlert size={16} /></span></div>
              <div className="metric-value">04<span className="metric-unit"> / 07</span></div>
              <div className="metric-foot"><span className="metric-change amber-text"><ArrowUpRight size={13} /> PRIORITY RESPONSE</span><span>risk model</span></div>
            </article>
            <article className="metric-card">
              <div className="metric-topline"><span>Silent areas</span><span className="metric-icon gold-icon"><Eye size={16} /></span></div>
              <div className="metric-value">{silentVillages.length.toString().padStart(2, '0')}<span className="metric-unit"> unverified</span></div>
              <div className="metric-foot"><span className="metric-change gold-text"><AlertTriangle size={13} /> NEEDS VERIFICATION</span><span>0 reports</span></div>
            </article>
            <article className="metric-card">
              <div className="metric-topline"><span>Rescue teams deployed</span><span className="metric-icon green-icon"><Users size={16} /></span></div>
              <div className="metric-value">06<span className="metric-unit"> / 08</span></div>
              <div className="metric-foot"><span className="metric-change green-text"><ArrowDownRight size={13} /> 2 ON STANDBY</span><span>field units</span></div>
            </article>
          </section>

          <div className="workspace-grid">
            <div className="primary-column">
              <section className="panel map-panel" id="live-map">
                <div className="panel-header map-panel-header">
                  <div className="panel-heading-group">
                    <div className="section-icon map-heading-icon"><Layers3 size={16} /></div>
                    <div><h2>Live disaster map</h2><p>FLOOD EXPOSURE &amp; FIELD ASSETS <span className="small-divider">·</span> {blockedCount} BLOCKED <span className="small-divider">·</span> {floodedCount} FLOODED</p></div>
                  </div>
                  <div className="map-header-actions"><span className="map-location"><MapPin size={13} /> 12.79°N, 75.42°E</span><button className="small-select" aria-expanded={layersOpen} aria-controls="map-layer-menu" onClick={() => setLayersOpen((open) => !open)}>LAYERS {activeLayerCount}/4 <ChevronRight size={12} /></button></div>
                </div>
                {layersOpen && (
                  <div className="layer-menu" id="map-layer-menu" role="group" aria-label="Map layer visibility">
                    <div className="layer-menu-title">MAP LAYERS <span>{activeLayerCount} ACTIVE</span></div>
                    {layerOptions.map((layer) => (
                      <button key={layer.key} className="layer-menu-item" aria-pressed={mapLayers[layer.key]} onClick={() => setMapLayers((current) => ({ ...current, [layer.key]: !current[layer.key] }))}>
                        <span><b>{layer.label}</b><small>{layer.hint}</small></span>
                        <i className={mapLayers[layer.key] ? 'layer-check active' : 'layer-check'}>{mapLayers[layer.key] && <Check size={11} />}</i>
                      </button>
                    ))}
                  </div>
                )}
                <div className="map-content-wrap">
                  <MapPanel blockedRoads={blockedRoads} isolatedIds={isolatedIds} onToggleRoad={toggleRoad} showVillages={mapLayers.villages} showFacilities={mapLayers.facilities} showRoads={mapLayers.roads} showRiskZones={mapLayers.riskZones} />
                  <div className="map-live-badge"><span className="mini-live-dot" /> FLOOD MODEL ACTIVE</div>
                  <div className="map-zoom-hint"><Crosshair size={12} /> Click a road segment to toggle access</div>
                </div>
                <div className="map-footer">
                  <div className="map-legend">
                    <span><i className="legend-dot legend-critical" /> Critical / isolated</span>
                    <span><i className="legend-dot legend-high" /> High risk</span>
                    <span><i className="legend-dot legend-medium" /> Medium risk</span>
                    <span><i className="legend-marker hospital-legend">+</i> Hospital</span>
                    <span><i className="legend-marker shelter-legend">S</i> Shelter</span>
                    <span><i className="legend-marker team-legend">R</i> Rescue team</span>
                    <span><i className="legend-line legend-safe" /> Safe route</span>
                    <span><i className="legend-line legend-flood" /> Flooded · caution</span>
                    <span><i className="legend-line legend-blocked" /> Blocked road</span>
                  </div>
                  <div className="map-attribution">MAP DATA · OPENSTREETMAP</div>
                </div>
              </section>

              <section className="panel priority-panel" id="rescue-priority">
                <div className="panel-header">
                  <div className="panel-heading-group">
                    <div className="section-icon priority-heading-icon"><ShieldCheck size={16} /></div>
                    <div><h2>Rescue priority queue</h2><p>MODEL-RANKED FIELD ATTENTION <span className="small-divider">·</span> UPDATED WITH ROAD ACCESS</p></div>
                  </div>
                  <button className="text-action" onClick={() => showToast('Priority scores combine exposure, access and reporting confidence.')}>How scoring works <ChevronRight size={13} /></button>
                </div>
                <div className="priority-table-wrap">
                  <table className="priority-table">
                    <thead><tr><th>RANK / VILLAGE</th><th>ACCESS</th><th>RISK LEVEL</th><th>PRIORITY SCORE</th><th>CONFIDENCE</th></tr></thead>
                    <tbody>
                      {priorityRows.map((village, index) => (
                        <tr key={village.id} className={index === 0 ? 'top-priority-row' : ''}>
                          <td><div className="rank-village"><span className={`rank-number ${index === 0 ? 'rank-first' : ''}`}>{String(index + 1).padStart(2, '0')}</span><span><b>{village.name}</b><small className="rank-meta">{village.taluk} taluk · {village.population} residents</small><small className="rank-reason" title={village.reason}>{village.reason}</small></span></div></td>
                          <td><span className={`access-label ${village.isolated ? 'access-isolated' : 'access-open'}`}><i />{village.isolated ? 'ISOLATED' : 'REACHABLE'}</span></td>
                          <td><span className={`risk-tag ${riskTone[village.risk]}`}>{village.risk.toUpperCase()}</span></td>
                          <td><div className="score-cell"><b>{village.score}</b><span className="score-track"><i className={riskTone[village.risk]} style={{ width: `${village.score}%` }} /></span></div></td>
                          <td><span className="confidence-cell">{village.confidence}% <Check size={12} /></span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="panel-bottom-note"><Activity size={13} /> SCORE INPUTS: FLOOD EXPOSURE <i>+</i> ROAD ACCESS <i>+</i> EMERGENCY REPORT SIGNAL <i>+</i> POPULATION <span className="panel-bottom-right">DEMO MODEL · NOT FOR FIELD DISPATCH</span></div>
              </section>

              <section className="lower-grid">
                <article className="panel report-panel">
                  <div className="panel-header compact-header">
                    <div className="panel-heading-group"><div className="section-icon report-heading-icon"><Activity size={15} /></div><div><h2>Emergency signal activity</h2><p>INCOMING REPORTS · LAST 12 HOURS</p></div></div>
                    <div className="chart-total"><b>47</b><span>signals</span></div>
                  </div>
                  <div className="signal-chart" aria-label="Bar chart of incoming emergency reports over 12 hours">
                    {[22, 31, 25, 42, 34, 52, 48, 68, 59, 82, 71, 94].map((height, index) => (
                      <div key={index} className="chart-column"><div className={`chart-bar ${index === 11 ? 'chart-bar-current' : ''}`} style={{ height: `${height}%` }} /><span>{index % 3 === 0 ? `${String((index + 8) % 12 || 12).padStart(2, '0')}:00` : ''}</span></div>
                    ))}
                  </div>
                  <div className="chart-foot"><span><i className="legend-dot legend-high" /> VILLAGE REPORTS</span><span><ArrowUpRight size={13} /> +18% vs previous window</span></div>
                </article>
                <article className="panel asset-panel">
                  <div className="panel-header compact-header">
                    <div className="panel-heading-group"><div className="section-icon asset-heading-icon"><Users size={15} /></div><div><h2>Field asset status</h2><p>RESPONSE UNITS &amp; SHELTER CAPACITY</p></div></div>
                    <button className="micro-button" onClick={() => showToast('Asset positions are simulated for this demo.')}>VIEW ASSETS <ChevronRight size={12} /></button>
                  </div>
                  <div className="asset-stats">
                    <div className="asset-stat"><div className="asset-symbol team-symbol"><Users size={15} /></div><span><b>06 <small>/ 08</small></b><em>Teams deployed</em></span><span className="asset-live">ACTIVE</span></div>
                    <div className="asset-stat"><div className="asset-symbol hospital-symbol"><span>+</span></div><span><b>02 <small>/ 03</small></b><em>Medical units</em></span><span className="asset-live">OPEN</span></div>
                    <div className="asset-stat"><div className="asset-symbol shelter-symbol"><Radio size={15} /></div><span><b>68<small>%</small></b><em>Shelter capacity</em></span><span className="capacity-track"><i /></span></div>
                  </div>
                </article>
              </section>
            </div>

            <aside className="right-rail">
              <section className="panel silent-panel" id="silent-areas">
                <div className="panel-header rail-header">
                  <div className="panel-heading-group"><div className="section-icon silent-heading-icon"><Eye size={16} /></div><div><h2>Silent area detection</h2><p>RISK SIGNAL WITHOUT REPORTS</p></div></div>
                  <span className="alert-count">{silentVillages.length.toString().padStart(2, '0')}</span>
                </div>
                <div className="silent-intro"><span className="silent-alert-icon"><AlertTriangle size={15} /></span><span>High exposure detected with <b>zero emergency reports.</b> Verify through alternate channels.</span></div>
                <div className="silent-list">
                  {silentVillages.map((village, index) => (
                    <div className="silent-village" key={village.id}>
                      <div className="silent-village-top"><span className="silent-village-name"><i className={`silent-risk-dot ${riskTone[village.risk]}`} />{village.name}</span><span className="silent-time">{index === 0 ? '06h 12m' : '04h 48m'} NO REPORT</span></div>
                      <div className="silent-flag">HIGH RISK – NO REPORTS – NEEDS VERIFICATION</div>
                      <div className="silent-village-foot"><span>{village.taluk} taluk <b>·</b> {village.population} residents</span><span className="confidence-mini">{village.confidence}% confidence</span></div>
                    </div>
                  ))}
                </div>
                <button className="button-alert" onClick={() => showToast('Verification task added to the simulated dispatch queue.')}><Siren size={15} /> Dispatch verification check <ChevronRight size={14} /></button>
                <div className="alert-method"><ShieldCheck size={12} /> Cross-signal check: rainfall + terrain + report silence</div>
              </section>

              <section className="panel road-panel" id="road-predictor">
                <div className="panel-header rail-header road-header">
                  <div className="panel-heading-group"><div className="section-icon road-heading-icon"><Route size={16} /></div><div><h2>Isolation predictor</h2><p>ROAD STATUS → ACCESS MODEL</p></div></div>
                  <span className="road-status-count">{blockedCount} BLOCKED</span>
                </div>
                <div className="predictor-summary"><div><span>Reachable</span><b className="reachable-number">{6 - isolatedIds.size}<small> / 6</small></b></div><div className="predictor-arrow"><ChevronRight size={15} /></div><div><span>Isolated</span><b className="isolated-number">{isolatedIds.size}<small> / 6</small></b></div></div>
                <div className="road-list-label"><span>CRITICAL CORRIDORS</span><span>CLICK TO SIMULATE</span></div>
                <div className="road-list">
                  {roads.map((road) => {
                    const blocked = blockedRoads.includes(road.id);
                    const status = blocked ? 'blocked' : road.status === 'blocked' ? 'open' : road.status;
                    return (
                      <div key={road.id} className={`road-row ${blocked ? 'road-row-blocked' : ''}`}>
                        <span className={`road-status-indicator ${status}`} />
                        <span className="road-name-wrap"><b>{road.name}</b><small>{blocked ? 'Road closure · access severed' : road.status === 'flooded' ? 'Flooded · passable with caution' : road.status === 'blocked' ? 'Reopened · access model restored' : road.note}</small></span>
                        <button className={`road-toggle ${blocked ? 'reopen' : 'block'}`} onClick={() => toggleRoad(road.id)}>{blocked ? 'REOPEN' : 'BLOCK'}</button>
                      </div>
                    );
                  })}
                </div>
                <div className="flood-access-note"><Waves size={12} /> Flooded segments stay passable until marked blocked.</div>
                <div className="accessibility-wrap">
                  <div className="accessibility-head"><span>VILLAGE ACCESSIBILITY</span><span>{isolatedIds.size} ISOLATED</span></div>
                  <div className="accessibility-chips">
                    {villages.filter((village) => village.id !== 'sullia').map((village) => {
                      const isolated = isolatedIds.has(village.id);
                      return <span key={village.id} className={`access-chip ${isolated ? 'isolated' : ''}`}><i />{village.name}</span>;
                    })}
                  </div>
                </div>
              </section>

              <section className="panel mesh-panel" id="mesh-network">
                <div className="panel-header rail-header mesh-header">
                  <div className="panel-heading-group"><div className="section-icon mesh-heading-icon"><WifiOff size={16} /></div><div><h2>Offline mesh relay</h2><p>EMERGENCY MESSAGE ROUTE</p></div></div>
                  <span className="mesh-online"><span /> MESH ACTIVE</span>
                </div>
                <div className="mesh-message"><div className="mesh-message-icon"><RadioTower size={15} /></div><div><span>INCOMING DISTRESS PING</span><b>Village 04 · Kokkada</b></div><div className="mesh-message-time">14:26</div></div>
                <div className="mesh-route">
                  {[
                    { label: 'VILLAGE', sub: 'Kokkada', icon: MapPin },
                    { label: 'RELAY 01', sub: 'Rescue Alpha', icon: RadioTower },
                    { label: 'SHELTER', sub: 'Ujire', icon: Signal },
                    { label: 'COMMAND', sub: 'Sullia HQ', icon: Crosshair },
                  ].map(({ label, sub, icon: Icon }, index) => (
                    <div className="mesh-hop-node" key={label}>
                      <div className={`mesh-node-icon ${meshHop > index ? 'reached' : ''} ${meshSending && meshHop === index ? 'current-hop' : ''}`}><Icon size={14} /></div>
                      <span>{label}</span><b>{sub}</b>
                      {index < 3 && <div className={`mesh-connector ${meshHop > index ? 'connected' : ''}`}><i /></div>}
                    </div>
                  ))}
                </div>
                <div className="mesh-footer"><span className={`mesh-delivery ${meshDelivered ? 'delivered' : ''}`}><span />{meshSending ? `RELAYING · HOP ${Math.min(meshHop + 1, 3)} / 3` : meshDelivered ? 'DELIVERED · 3 HOPS' : 'AWAITING RELAY'}</span><button className="mesh-send-button" onClick={launchMeshRelay} disabled={meshSending}>{meshSending ? <Activity size={13} className="spin-icon" /> : <Zap size={13} />}{meshSending ? 'RELAYING' : 'SEND PING'}</button></div>
                <div className="mesh-caption"><WifiOff size={11} /> Store-and-forward route · no cellular link required</div>
              </section>
            </aside>
          </div>

          <footer className="app-footer"><span><span className="footer-mark">D</span> DRISHTI <b>·</b> DISASTER INTELLIGENCE &amp; RESCUE SYSTEM</span><span>PROJECT ABHEDYA <b>·</b> TRACK 5: DISASTER MANAGEMENT &amp; RESCUE <b>·</b> TEAM ANVESHA</span><span className="footer-demo">SIMULATED DATA FOR DEMONSTRATION</span></footer>
        </div>
      </main>
      {toast && <div className="toast-message"><Check size={15} />{toast}</div>}
    </div>
  );
}

export default App;
