import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Package, Users, MapPin, Clock, Navigation, DollarSign, Activity } from 'lucide-react';
import RateconModal from './components/RateconModal.jsx';
import { useTelegram } from './hooks/useTelegram.js';
import { getDrivers, getLoads, getFleetLocations } from './api/tms.js';

// ─── Driver Status Config ─────────────────────────────────────────────────────
const STATUS_MAP = {
  ENROUTE:    { color: '#ef4444', label: 'Busy' },
  DISPATCHED: { color: '#3b82f6', label: 'Dispatched' },
  RESERVED:   { color: '#8b5cf6', label: 'Reserved' },
  UNLOADING:  { color: '#f59e0b', label: 'Unloading' },
  LOADING:    { color: '#f59e0b', label: 'Loading' },
  AVAILABLE:  { color: '#10b981', label: 'Available' },
  READY:      { color: '#10b981', label: 'Available' },
  HOME:       { color: '#10b981', label: 'Available' },
  EMPTY:      { color: '#10b981', label: 'Available' },
};

const resolveStatus = (rawStatus = '') => {
  const key = rawStatus.toUpperCase().trim();
  return STATUS_MAP[key] || { color: '#6b7280', label: rawStatus || 'Unknown' };
};

const TRUCK_STATUS_COLOR = {
  ENROUTE:    '#ef4444',
  LOADING:    '#f59e0b',
  UNLOADING:  '#f59e0b',
  DISPATCHED: '#3b82f6',
  AVAILABLE:  '#10b981',
  READY:      '#10b981',
  HOME:       '#10b981',
};

const fmt = (n) => new Intl.NumberFormat('en-US').format(n || 0);

// ─── Main Component ───────────────────────────────────────────────────────────
const LogisticsTMS = () => {
  const { userId, clientPrefix, username, init } = useTelegram();

  const [activeTab, setActiveTab] = useState('dispatch');
  const [systemOnline, setOnline] = useState(true);
  const [isModalOpen, setModal]   = useState(false);
  const [isLoading, setLoading]   = useState(true);
  const [loads, setLoads]         = useState([]);
  const [drivers, setDrivers]     = useState([]);
  const [fleetData, setFleetData] = useState([]);   // ← ELD fleet data
  const [analytics, setAnalytics] = useState(buildEmptyAnalytics());
  const [lastUpdated, setUpdated] = useState(null);

  useEffect(() => { init(); }, []);

  // ── Data Fetch ─────────────────────────────────────────────────────────────
  const fetchDrivers = useCallback(async () => {
    const data = await getDrivers();
    const mapped = (Array.isArray(data) ? data : []).map(row => {
      const { color, label } = resolveStatus(row.STATUS);
      const driverType = (row['Driver type'] || '').trim();
      return {
        id:         (row.Driver || 'DR').slice(0, 2).toUpperCase(),
        name:       row.Driver         || 'Unknown',
        vehicle:    `${driverType || 'Truck'} #${row['Truck ID'] || 'N/A'}`,
        location:   row['PU city']     || row['DEL city'] || '',
        status:     label,
        color,
        speed:      label === 'Busy' ? `${row.speed || '—'} mph` : null,
        idle:       row.notes          || '',
        driverType,
        rawTruckId: row['Truck ID']    || '',
        telegramId: row['Telegram ID'] || row['telegram_id'] || row['TelegramID'] || null,
      };
    });
    setDrivers(mapped);
    return mapped;
  }, []);

  const fetchLoads = useCallback(async () => {
    const data = await getLoads();
    const mapped = (Array.isArray(data) ? data : [])
      .filter(row => row['Load number'])
      .map(row => ({
        id:       row['Load number'],
        status:   row['Driver Name'] ? 'In Transit' : 'Idle',
        from:     row['PU locations']  || '—',
        to:       row['DEL locations'] || '—',
        driver:   row['Driver Name']   || 'Unassigned',
        weight:   row.Commodity        || '',
        revenue:  parseFloat(row.rate) || 0,
        distance: parseFloat(row.distance) || 0,
        rpm:      parseFloat(row.ratePerMile) || 0,
        progress: row['Driver Name'] ? 50 : 0,
        updated:  row.assignedAt ? timeAgo(row.assignedAt) : 'Pending',
        truckId:  row['Truck Id'] || '',
      }));
    setLoads(mapped);
    return mapped;
  }, []);

  const fetchFleet = useCallback(async () => {
    const data = await getFleetLocations();
    const trucks = data?.trucks || [];
    setFleetData(trucks);
    return trucks;
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [drv, lds] = await Promise.all([
        fetchDrivers(),
        fetchLoads(),
        fetchFleet(),   // runs in parallel, failure is already caught in getFleetLocations
      ]);
      setAnalytics(buildAnalytics(drv, lds));
      setOnline(true);
      setUpdated(new Date());
    } catch (err) {
      console.error('[TMS] fetch error', err);
      setOnline(false);
    } finally {
      setLoading(false);
    }
  }, [fetchDrivers, fetchLoads, fetchFleet]);

  useEffect(() => {
    fetchAll();
    const iv = setInterval(fetchAll, 30_000);
    return () => clearInterval(iv);
  }, [fetchAll]);

  // ── Tab Config ─────────────────────────────────────────────────────────────
  const TABS = [
    { id: 'dispatch',  label: 'Live Dispatch', icon: Activity    },
    { id: 'drivers',   label: 'Drivers',       icon: Users       },
    { id: 'fleet',     label: 'Fleet Map',     icon: MapPin      },
    { id: 'analytics', label: 'Analytics',     icon: TrendingUp  },
  ];

  const getStatusColor = (status) => ({
    'In Transit': '#3b82f6', Loading: '#f59e0b',
    Idle: '#6b7280', Delivered: '#10b981', Dispatched: '#8b5cf6',
  }[status] || '#6b7280');

  if (isLoading && drivers.length === 0) {
    return (
      <div style={styles.fullCenter}>
        <div style={styles.spinner} />
        <p style={{ color: '#9ca3af', marginTop: '16px', fontSize: '14px' }}>Loading TMS data…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  return (
    <div style={styles.root}>

      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={styles.logo}><Package size={18} color="#fff" /></div>
          <div>
            <div style={{ fontSize: '17px', fontWeight: '700', letterSpacing: '-0.02em' }}>VIS TMS</div>
            <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '-1px' }}>
              {username ? `@${username}` : 'Logistics TMS'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: systemOnline ? '#10b981' : '#ef4444', boxShadow: `0 0 8px ${systemOnline ? '#10b981' : '#ef4444'}` }} />
          <span style={{ fontSize: '12px', color: systemOnline ? '#10b981' : '#ef4444', fontWeight: '500' }}>
            {systemOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Nav */}
      <div style={styles.nav}>
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button key={id} onClick={() => setActiveTab(id)} style={{ ...styles.tab, ...(active ? styles.tabActive : {}) }}>
              <Icon size={15} />{label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={styles.content}>

        {/* ── Live Dispatch ─────────────────────────────────────────── */}
        {activeTab === 'dispatch' && (
          <div>
            <SectionHeader title="Live Dispatch" sub={lastUpdated ? `Updated ${timeAgo(lastUpdated)}` : ''} onRefresh={fetchAll} />
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <StatPill icon={<Activity size={14} />} value={loads.filter(l => l.status === 'In Transit').length} label="Active"  color="#3b82f6" />
              <StatPill icon={<Package  size={14} />} value={loads.filter(l => l.status === 'Loading').length}    label="Loading" color="#f59e0b" />
              <StatPill icon={<Clock    size={14} />} value={loads.filter(l => l.status === 'Idle').length}       label="Idle"    color="#6b7280" />
            </div>
            {loads.length === 0 ? <EmptyState icon={<Package size={40} />} message="No loads found" /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {loads.map(load => (
                  <div key={load.id} style={styles.card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                          <span style={{ fontSize: '14px', fontWeight: '700', color: '#e5e7eb' }}>{load.id}</span>
                          <Tag color={getStatusColor(load.status)}>{load.status}</Tag>
                        </div>
                        <div style={{ fontSize: '11px', color: '#6b7280' }}>{load.updated}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: '#10b981' }}>${fmt(load.revenue)}</div>
                        {load.rpm > 0 && <div style={{ fontSize: '11px', color: '#6b7280' }}>${load.rpm.toFixed(2)}/mi</div>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
                      <MapPin size={13} color="#6b7280" />
                      <span style={{ fontSize: '13px', color: '#d1d5db', fontWeight: '500' }}>{load.from}</span>
                      <Navigation size={12} color="#3b82f6" />
                      <MapPin size={13} color="#6b7280" />
                      <span style={{ fontSize: '13px', color: '#d1d5db', fontWeight: '500' }}>{load.to}</span>
                    </div>
                    {load.progress > 0 && (
                      <div style={{ height: '3px', background: '#1f2937', borderRadius: '2px', overflow: 'hidden', marginBottom: '10px' }}>
                        <div style={{ height: '100%', width: `${load.progress}%`, background: 'linear-gradient(90deg, #3b82f6, #2563eb)' }} />
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Users size={13} color="#6b7280" />
                        <span style={{ fontSize: '12px', color: '#9ca3af' }}>{load.driver}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        {load.distance > 0 && <MetaItem icon={<Navigation size={12} color="#6b7280" />} text={`${fmt(load.distance)} mi`} />}
                        {load.weight && <MetaItem icon={<Package size={12} color="#6b7280" />} text={load.weight} />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Drivers ───────────────────────────────────────────────── */}
        {activeTab === 'drivers' && (
          <div>
            <SectionHeader title="Driver Management" sub="Availability and assignments" onRefresh={fetchAll} />
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              {[
                { label: 'Available', color: '#10b981', count: drivers.filter(d => d.status === 'Available').length },
                { label: 'Busy',      color: '#ef4444', count: drivers.filter(d => d.status === 'Busy' || d.status === 'Dispatched').length },
                { label: 'Total',     color: '#9ca3af', count: drivers.length },
              ].map(({ label, color, count }) => (
                <div key={label} style={{ flex: 1, padding: '12px', background: `${color}12`, border: `1px solid ${color}30`, borderRadius: '10px' }}>
                  <div style={{ fontSize: '22px', fontWeight: '700', color }}>{count}</div>
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>{label}</div>
                </div>
              ))}
            </div>
            {drivers.length === 0 ? <EmptyState icon={<Users size={40} />} message="No drivers found" /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {drivers.map(driver => (
                  <div key={driver.rawTruckId || driver.id} style={styles.card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: `${driver.color}20`, border: `1.5px solid ${driver.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: driver.color }}>
                          {driver.id}
                        </div>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: '600', color: '#e5e7eb' }}>{driver.name}</div>
                          <div style={{ fontSize: '12px', color: '#9ca3af' }}>{driver.vehicle}</div>
                          {driver.driverType && (
                            <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '1px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              {driver.driverType}
                            </div>
                          )}
                        </div>
                      </div>
                      <Tag color={driver.color}>{driver.status}</Tag>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <MetaItem icon={<MapPin size={13} color="#6b7280" />} text={driver.location || 'No location'} />
                      {driver.speed && <MetaItem icon={<Navigation size={13} color="#3b82f6" />} text={driver.speed} blue />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Fleet Map ─────────────────────────────────────────────── */}
        {activeTab === 'fleet' && (
          <div>
            <SectionHeader
              title="Fleet Tracking"
              sub={fleetData.length > 0 ? `${fleetData.length} trucks · ${fleetData.filter(t => t.status === 'ENROUTE').length} en route` : 'ELD stub active — replace with Samsara API'}
              onRefresh={fetchFleet}
            />

            {fleetData.length === 0 ? (
              <div style={{ ...styles.card, textAlign: 'center', padding: '48px 20px' }}>
                <MapPin size={40} color="#374151" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '6px' }}>No fleet data yet</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Run the ELD Sync workflow manually in n8n to load mock data</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {fleetData.map(truck => {
                  const statusColor = TRUCK_STATUS_COLOR[truck.status] || '#6b7280';
                  return (
                    <div key={truck.truckId} style={styles.card}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: `${statusColor}20`, border: `1.5px solid ${statusColor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                            🚛
                          </div>
                          <div>
                            <div style={{ fontSize: '15px', fontWeight: '600', color: '#e5e7eb' }}>{truck.driverName}</div>
                            <div style={{ fontSize: '12px', color: '#9ca3af' }}>Truck #{truck.truckId}</div>
                          </div>
                        </div>
                        <Tag color={statusColor}>{truck.status}</Tag>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                        <div style={{ flex: 1, padding: '8px', background: '#1a2235', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '18px', fontWeight: '700', color: '#3b82f6' }}>{truck.speed}</div>
                          <div style={{ fontSize: '10px', color: '#6b7280' }}>mph</div>
                        </div>
                        <div style={{ flex: 1, padding: '8px', background: '#1a2235', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '12px', fontWeight: '600', color: '#e5e7eb' }}>{truck.lat?.toFixed(3)}</div>
                          <div style={{ fontSize: '10px', color: '#6b7280' }}>lat</div>
                        </div>
                        <div style={{ flex: 1, padding: '8px', background: '#1a2235', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '12px', fontWeight: '600', color: '#e5e7eb' }}>{truck.lng?.toFixed(3)}</div>
                          <div style={{ fontSize: '10px', color: '#6b7280' }}>lng</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <MetaItem icon={<Activity size={13} color="#6b7280" />} text={truck.engineOn ? 'Engine on' : 'Engine off'} />
                        <span style={{ fontSize: '11px', color: '#6b7280' }}>
                          {truck.lastUpdate ? timeAgo(truck.lastUpdate) : '—'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Analytics ─────────────────────────────────────────────── */}
        {activeTab === 'analytics' && (
          <div>
            <SectionHeader title="Analytics" sub="Revenue and performance insights" onRefresh={fetchAll} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '16px' }}>
              {[
                { icon: <DollarSign size={16} color="#10b981" />, value: `$${fmt(analytics.weeklyRevenue)}`, label: 'Total Revenue'  },
                { icon: <Package    size={16} color="#3b82f6" />, value: analytics.totalLoads,               label: 'Total Loads'    },
                { icon: <Users      size={16} color="#f59e0b" />, value: analytics.activeDrivers,            label: 'Active Drivers' },
                { icon: <TrendingUp size={16} color="#8b5cf6" />, value: `$${fmt(analytics.avgPerLoad)}`,    label: 'Avg/Load'       },
              ].map(({ icon, value, label }) => (
                <div key={label} style={styles.card}>
                  <div style={{ marginBottom: '8px' }}>{icon}</div>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: '#e5e7eb', marginBottom: '2px' }}>{value}</div>
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>{label}</div>
                </div>
              ))}
            </div>
            {analytics.topPerformers.length > 0 && (
              <div style={styles.card}>
                <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '14px', color: '#e5e7eb' }}>Top Performers</div>
                {analytics.topPerformers.map((p, i) => (
                  <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: i < analytics.topPerformers.length - 1 ? '1px solid #1f2937' : 'none' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: ['#f59e0b20','#9ca3af20','#cd7c2820'][i], color: ['#f59e0b','#9ca3af','#cd7c28'][i], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700' }}>
                      #{i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#e5e7eb' }}>{p.name}</div>
                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>{p.loads} loads</div>
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#10b981' }}>${fmt(p.revenue)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* FAB */}
      <button style={styles.fab} onClick={() => setModal(true)}>
        <Package size={22} color="#fff" />
      </button>

      {/* Modal */}
      <RateconModal
        isOpen={isModalOpen}
        onClose={() => setModal(false)}
        drivers={drivers}
        telegramUserId={userId}
        dispatchUsername={username}
        clientPrefix={clientPrefix}
        onAssigned={() => { setTimeout(fetchAll, 2000); }}
      />

      <style>{`
        * { box-sizing: border-box }
        body { margin: 0 }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  );
};

// ─── Sub-components ────────────────────────────────────────────────────────────
const SectionHeader = ({ title, sub, onRefresh }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
    <div>
      <h2 style={{ margin: 0, fontSize: '19px', fontWeight: '700', color: '#f0f0f0' }}>{title}</h2>
      {sub && <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{sub}</div>}
    </div>
    {onRefresh && (
      <button onClick={onRefresh} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '6px 10px', color: '#9ca3af', fontSize: '12px', cursor: 'pointer' }}>↻</button>
    )}
  </div>
);

const StatPill = ({ icon, value, label, color }) => (
  <div style={{ flex: 1, padding: '12px', background: `${color}15`, border: `1px solid ${color}30`, borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
    <span style={{ color }}>{icon}</span>
    <div>
      <div style={{ fontSize: '20px', fontWeight: '700', color }}>{value}</div>
      <div style={{ fontSize: '10px', color: '#9ca3af' }}>{label}</div>
    </div>
  </div>
);

const Tag = ({ color, children }) => (
  <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: `${color}20`, color, fontWeight: '600', whiteSpace: 'nowrap' }}>
    {children}
  </span>
);

const MetaItem = ({ icon, text, blue }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
    {icon}
    <span style={{ fontSize: '12px', color: blue ? '#3b82f6' : '#9ca3af' }}>{text}</span>
  </div>
);

const EmptyState = ({ icon, message }) => (
  <div style={{ textAlign: 'center', padding: '60px 20px', color: '#374151' }}>
    {icon}
    <p style={{ marginTop: '12px', color: '#9ca3af', fontSize: '14px' }}>{message}</p>
  </div>
);

// ─── Analytics ────────────────────────────────────────────────────────────────
function buildEmptyAnalytics() {
  return { weeklyRevenue: 0, totalLoads: 0, activeDrivers: 0, avgPerLoad: 0, topPerformers: [] };
}

function buildAnalytics(drivers, loads) {
  const totalRevenue  = loads.reduce((s, l) => s + l.revenue, 0);
  const activeDrivers = drivers.filter(d => d.status === 'Busy' || d.status === 'Dispatched').length;
  const totalLoads    = loads.length;
  const byDriver = {};
  loads.forEach(l => {
    if (!l.driver || l.driver === 'Unassigned') return;
    if (!byDriver[l.driver]) byDriver[l.driver] = { loads: 0, revenue: 0 };
    byDriver[l.driver].loads++;
    byDriver[l.driver].revenue += l.revenue;
  });
  const topPerformers = Object.entries(byDriver)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 3)
    .map(([name, stats]) => ({ name, ...stats }));
  return { weeklyRevenue: totalRevenue, totalLoads, activeDrivers, avgPerLoad: totalLoads > 0 ? Math.round(totalRevenue / totalLoads) : 0, topPerformers };
}

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  root:       { minHeight: '100vh', background: '#0f1419', color: '#e5e7eb', fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', paddingBottom: '90px' },
  fullCenter: { minHeight: '100vh', background: '#0f1419', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  spinner:    { width: '40px', height: '40px', border: '3px solid #1f2937', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  header:     { position: 'sticky', top: 0, zIndex: 50, background: 'rgba(15,20,25,0.96)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #1a2030', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  logo:       { width: '34px', height: '34px', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(59,130,246,0.3)' },
  nav:        { display: 'flex', gap: '6px', padding: '12px 16px', overflowX: 'auto', borderBottom: '1px solid #1a2030', scrollbarWidth: 'none' },
  tab:        { padding: '8px 14px', borderRadius: '9px', border: 'none', background: 'transparent', color: '#6b7280', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '5px', transition: 'all 0.15s ease' },
  tabActive:  { background: '#1f2937', color: '#3b82f6' },
  content:    { padding: '18px 16px' },
  card:       { background: '#161c27', borderRadius: '12px', padding: '14px 16px', border: '1px solid #1e2a3a' },
  fab:        { position: 'fixed', bottom: '24px', right: '20px', width: '54px', height: '54px', borderRadius: '16px', border: 'none', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', boxShadow: '0 8px 24px rgba(59,130,246,0.45)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, transition: 'all 0.2s ease' },
};

export default LogisticsTMS;
