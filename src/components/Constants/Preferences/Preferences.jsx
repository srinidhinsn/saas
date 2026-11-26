import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { LayoutGrid, ListChecks, Store, Table2, Monitor, Check, ChevronRight } from 'lucide-react';
import { useClientPreferences } from '../../utils/Preferences/useClientPreferences';

// ─── Options ───────────────────────────────────────────────────────────────────

const SECTIONS = [
  {
    id: 'kds',
    label: 'Kitchen Display',
    hint: 'KDS screen',
    Icon: Monitor,
    title: 'Kitchen Display default view',
    desc: 'Choose how orders are arranged when the kitchen screen opens.',
    options: [
      { key: 'order', label: 'Order View', desc: 'One card per order, with item status controls.', Icon: LayoutGrid, preview: 'order' },
      { key: 'item', label: 'Item View', desc: 'Same items combined across all active orders.', Icon: ListChecks, preview: 'item' },
      { key: 'counter', label: 'Counter View', desc: 'Items grouped by the kitchen counter that makes them.', Icon: Store, preview: 'counter' },
    ],
  },
  {
    id: 'table_management',
    label: 'Table Management',
    hint: 'Tables screen',
    Icon: Table2,
    title: 'Table Management default view',
    desc: 'Choose how tables are shown when the tables screen opens.',
    options: [
      { key: 'floor', label: 'Card View', desc: 'Table cards grouped by section and dining area.', Icon: LayoutGrid, preview: 'floor' },
      { key: 'list', label: 'Table View', desc: 'Summary cards and tables with occupancy details.', Icon: Table2, preview: 'list' },
    ],
  },
];

// ─── Mini previews (CSS only) ──────────────────────────────────────────────────

const C = { pending: '#f59e0b', preparing: '#3b82f6', ready: '#16a34a', vacant: '#16a34a', occupied: '#dc2626', reserved: '#8a56ac' };

const Line = ({ w = 'w-full', dark }) => (
  <div className={`h-1.5 rounded-full ${dark ? 'bg-[#8a56ac]' : 'bg-[#e3d3f0]'} ${w}`} />
);
const Dot = ({ color }) => <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: color }} />;
const Tile = ({ color, className = '', children }) => (
  <div className={`rounded-md bg-white border border-[#e6d9f0] border-t-[3px] p-1.5 ${className}`} style={{ borderTopColor: color }}>
    {children}
  </div>
);

const Preview = ({ type }) => {
  const frame = 'h-[132px] rounded-xl border border-[#e6d9f0] bg-[#f8f4fc] p-3 overflow-hidden';

  if (type === 'order') {
    return (
      <div className={`${frame} grid grid-cols-3 gap-2`}>
        {[C.pending, C.preparing, C.ready].map((c, i) => (
          <Tile key={i} color={c} className="space-y-1.5">
            <div className="flex justify-between"><Line dark w="w-1/2" /><Line w="w-3" /></div>
            {[0, 1, 2].map(r => (
              <div key={r} className="flex items-center gap-1"><Dot color={c} /><Line w={r === 1 ? 'w-3/5' : 'w-4/5'} /></div>
            ))}
          </Tile>
        ))}
      </div>
    );
  }
  if (type === 'item') {
    return (
      <div className={`${frame} space-y-1.5`}>
        {[['w-2/5', 4], ['w-1/3', 3], ['w-1/2', 2], ['w-2/5', 2]].map(([w, n], i) => (
          <div key={i} className="flex items-center justify-between rounded-md bg-white border border-[#e6d9f0] px-2 py-1.5">
            <Line dark w={w} />
            <span className="text-[9px] font-bold leading-none text-[#6b3a8a] bg-[#f5eefa] rounded px-1.5 py-0.5">x{n}</span>
          </div>
        ))}
      </div>
    );
  }
  if (type === 'counter') {
    return (
      <div className={`${frame} grid grid-cols-3 gap-2`}>
        {[0, 1, 2].map(i => (
          <div key={i} className="space-y-1.5">
            <div className="h-4 rounded bg-[#8a56ac] flex items-center px-1.5"><div className="h-1 w-2/3 rounded-full bg-white/80" /></div>
            {[0, 1].map(r => (
              <Tile key={r} color="#d9c2ea" className="space-y-1"><Line dark w="w-3/5" /><Line w="w-4/5" /></Tile>
            ))}
          </div>
        ))}
      </div>
    );
  }
  if (type === 'floor') {
    const cols = [C.vacant, C.occupied, C.vacant, C.reserved, C.vacant, C.occupied, C.vacant, C.vacant, C.reserved, C.vacant, C.occupied, C.vacant];
    return (
      <div className={`${frame} space-y-2`}>
        <div className="flex items-center gap-2"><Line dark w="w-16" /><Line w="w-8" /></div>
        <div className="grid grid-cols-6 gap-1.5">
          {cols.map((c, i) => (
            <Tile key={i} color={c} className="h-6 !p-1"><Line w="w-3/4" /></Tile>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className={`${frame} space-y-2`}>
      <div className="grid grid-cols-3 gap-1.5">
        {[0, 1, 2].map(i => (
          <div key={i} className="rounded-md border border-[#e6d9f0] bg-gradient-to-b from-[#f1e7f9] to-white p-1.5 space-y-1">
            <Line w="w-1/2" /><Line dark w="w-1/3" />
          </div>
        ))}
      </div>
      <div className="rounded-md bg-white border border-[#e6d9f0] overflow-hidden">
        <div className="h-3 bg-[#f1e7f9]" />
        {[0, 1, 2].map(i => (
          <div key={i} className="flex gap-2 px-2 py-1.5 border-t border-[#f0e6f6]"><Line w="w-1/4" /><Line w="w-1/5" /><Line w="w-1/6" /></div>
        ))}
      </div>
    </div>
  );
};

// ─── Option card ───────────────────────────────────────────────────────────────

const OptionCard = ({ option, selected, saved, onSelect }) => {
  const { label, desc, Icon, preview } = option;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`text-left rounded-2xl border-2 bg-white p-3 transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-[#6b3a8a]/25
        ${selected
          ? 'border-[#6b3a8a] shadow-md ring-4 ring-[#6b3a8a]/10'
          : 'border-[#e8edf3] shadow-sm hover:border-[#d9c2ea] hover:shadow-md'}`}
    >
      <Preview type={preview} />

      <div className="mt-3 flex items-center gap-2 px-1">
        <Icon size={17} strokeWidth={1.9} className="text-[#6b3a8a] shrink-0" />
        <span className="text-base font-bold text-[#5b2d7a]">{label}</span>
        <span
          aria-hidden="true"
          className={`ml-auto grid h-5 w-5 place-items-center rounded-full border-2 transition-colors
            ${selected ? 'bg-[#6b3a8a] border-[#6b3a8a] text-white' : 'border-[#d9c2ea] text-transparent'}`}
        >
          <Check size={12} strokeWidth={3.5} />
        </span>
      </div>

      <p className="mt-1 px-1 text-sm leading-5 text-[#475569]">{desc}</p>

      {saved && (
        <span className="mt-2 ml-1 inline-block rounded-full border border-[#d9c2ea] bg-[#f5eefa] px-2.5 py-0.5 text-[11px] font-semibold text-[#6b3a8a]">
          Current default
        </span>
      )}
    </button>
  );
};

// ─── Page ──────────────────────────────────────────────────────────────────────

const Preferences = ({ clientId, token }) => {
  const { preferences, loaded, save } = useClientPreferences(clientId, token);
  const [draft, setDraft] = useState({ kds: 'order', table_management: 'floor' });
  const [activeTab, setActiveTab] = useState(SECTIONS[0].id);
  const [saving, setSaving] = useState(false);

  const saved = useMemo(() => ({
    kds: preferences.kds.default_view,
    table_management: preferences.table_management.default_view,
  }), [preferences]);

  useEffect(() => {
    if (loaded) setDraft({ kds: saved.kds, table_management: saved.table_management });
  }, [loaded, saved.kds, saved.table_management]);

  const changed = (id) => draft[id] !== saved[id];
  const dirty = changed('kds') || changed('table_management');
  const section = SECTIONS.find(s => s.id === activeTab);

  const labelOf = (sectionId, key) =>
    SECTIONS.find(s => s.id === sectionId)?.options.find(o => o.key === key)?.label || '—';

  const handleSave = async () => {
    setSaving(true);
    try {
      await save({
        kds: { default_view: draft.kds },
        table_management: { default_view: draft.table_management },
      });
      toast.success('Preferences saved');
    } catch (e) {
      console.error(e);
      toast.error('Could not save preferences. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f6f9]">
      {/* Header */}
      <div className="bg-white border-b border-[#e8edf3]">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-7 py-5">
          <h1 className="text-2xl font-bold tracking-tight text-[#5b2d7a]">My Preferences</h1>
          <p className="mt-1 text-sm text-[#475569]">Choose which view each screen opens with.</p>
        </div>
      </div>

      <main className="mx-auto max-w-[1400px] px-3 sm:px-7 py-6">
        {!loaded ? (
          <p className="text-sm text-[#475569]">Loading preferences…</p>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[280px_1fr] items-start">
            {/* Section list */}
            <nav
              aria-label="Preference sections"
              className="rounded-2xl border border-[#e8edf3] bg-white p-2 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-1"
            >
              {SECTIONS.map(({ id, label, hint, Icon }) => {
                const active = activeTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-current={active ? 'true' : undefined}
                    onClick={() => setActiveTab(id)}
                    className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6b3a8a]/40
                      ${active ? 'bg-[#f5eefa]' : 'hover:bg-[#faf6fd]'}`}
                  >
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg border
                      ${active ? 'bg-white border-[#d9c2ea] text-[#6b3a8a]' : 'bg-[#f5eefa] border-transparent text-[#6b3a8a]'}`}>
                      <Icon size={19} strokeWidth={1.9} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-[15px] font-bold ${active ? 'text-[#5b2d7a]' : 'text-[#334155]'}`}>{label}</span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-xs text-[#475569]">
                        {changed(id) && <span className="h-1.5 w-1.5 rounded-full bg-[#f59e0b]" title="Unsaved change" />}
                        <span className="truncate">{labelOf(id, draft[id])}</span>
                      </span>
                    </span>
                    <ChevronRight size={16} className={`hidden lg:block shrink-0 ${active ? 'text-[#6b3a8a]' : 'text-[#cbd5e1]'}`} />
                  </button>
                );
              })}
            </nav>

            {/* Options */}
            <section className="rounded-2xl border border-[#e8edf3] bg-white p-5 sm:p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#6b3a8a]">{section.title}</h2>
              <p className="mt-1 mb-5 text-sm text-[#475569]">
                {section.desc} You can still switch views while you work.
              </p>

              <div
                role="radiogroup"
                aria-label={section.title}
                className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4"
              >
                {section.options.map(option => (
                  <OptionCard
                    key={option.key}
                    option={option}
                    selected={draft[section.id] === option.key}
                    saved={saved[section.id] === option.key}
                    onSelect={() => setDraft(d => ({ ...d, [section.id]: option.key }))}
                  />
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Save bar: only when something changed */}
        {loaded && dirty && (
          <div
            role="region"
            aria-label="Unsaved changes"
            className="sticky bottom-4 z-10 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#4a2563] px-5 py-3 text-white shadow-xl"
          >
            <p className="text-sm font-semibold">You have unsaved changes</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setDraft({ kds: saved.kds, table_management: saved.table_management })}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10 disabled:opacity-50"
              >
                Discard
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="rounded-xl bg-white px-5 py-2 text-sm font-bold text-[#4a2563] shadow-sm transition hover:bg-[#f5eefa] disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Preferences;