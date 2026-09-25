import React, { useRef } from 'react';

export const getDateRangeFromPreset = (preset, customFrom, customTo) => {
  const now = new Date();
  const toStr = (d) => d.toISOString().split('T')[0];
  const today = toStr(now);
  const subtractDays = (n) => { const d = new Date(now); d.setDate(d.getDate() - n); return toStr(d); };
  const subtractMonths = (n) => { const d = new Date(now); d.setMonth(d.getMonth() - n); return toStr(d); };
  switch (preset) {
    case 'today': return { from: today, to: today };
    case '1w': return { from: subtractDays(7), to: today };
    case '15d': return { from: subtractDays(15), to: today };
    case '1m': return { from: subtractMonths(1), to: today };
    case '3m': return { from: subtractMonths(3), to: today };
    case '6m': return { from: subtractMonths(6), to: today };
    case 'custom': return { from: customFrom, to: customTo };
    default: return { from: today, to: today };
  }
};

export const parseISTTimestamp = (createdAt) => {
  if (!createdAt) return 0;
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const raw = typeof createdAt === 'string'
    ? createdAt.replace(' ', 'T').split('.')[0]
    : String(createdAt);
  const hasZone = raw.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(raw);
  return hasZone
    ? new Date(raw).getTime()
    : new Date(raw + 'Z').getTime() - IST_OFFSET_MS;
};

export const DateRangeFilter = ({ datePreset, setDatePreset, customFrom, setCustomFrom, customTo, setCustomTo }) => {
  const customFromRef = useRef(null);
  const customToRef = useRef(null);
  const todayDate = new Date().toISOString().split('T')[0];

  return (
    <div className="relative flex items-center gap-2">
      <select
        value={datePreset}
        onChange={e => {
          const val = e.target.value;
          setDatePreset(val);
          if (val === 'custom') setTimeout(() => customFromRef.current?.showPicker?.(), 50);
        }}
        className="pl-3 pr-8 py-2 rounded-lg bg-bg-primary border border-border-default text-text-primary text-sm appearance-none cursor-pointer">
        <option value="today">Today</option>
        <option value="1w">Last 1 Week</option>
        <option value="15d">Last 15 Days</option>
        <option value="1m">Last 1 Month</option>
        <option value="3m">Last 3 Months</option>
        <option value="6m">Last 6 Months</option>
        <option value="custom">Custom Range</option>
      </select>
      {datePreset === 'custom' && (
        <>
          <input
            ref={customFromRef}
            type="date"
            value={customFrom}
            max={customTo}
            onChange={e => { setCustomFrom(e.target.value); setTimeout(() => customToRef.current?.showPicker?.(), 50); }}
            className="px-3 py-2 rounded-lg bg-bg-primary border border-border-default text-text-primary text-sm"
          />
          <span className="text-text-secondary text-xs font-medium">→</span>
          <input
            ref={customToRef}
            type="date"
            value={customTo}
            min={customFrom}
            max={todayDate}
            onChange={e => setCustomTo(e.target.value)}
            className="px-3 py-2 rounded-lg bg-bg-primary border border-border-default text-text-primary text-sm"
          />
        </>
      )}
    </div>
  );
};