import React, { useEffect, useRef, useState } from 'react';
import { LayoutGrid, Table2 } from 'lucide-react';
import TableManagement_Card from './TableManagement_sub';
import TableManagement_Table from './TableManagement_Table';
import { useClientPreferences } from '../../utils/Preferences/useClientPreferences';

// preference value -> view
const VIEW_TABS = [
  { key: 'floor', label: 'Card View', Icon: LayoutGrid, Component: TableManagement_Card },
  { key: 'list', label: 'Table View', Icon: Table2, Component: TableManagement_Table },
];

const TableManagementSwitcher = (props) => {
  const { clientId, token } = props;
  const { preferences, loaded } = useClientPreferences(clientId, token);

  const [view, setView] = useState(null);       // null until the saved preference is known
  const touchedRef = useRef(false);             // true once the user picks a view manually

  // Apply the saved default view, unless the user already chose one this visit
  useEffect(() => {
    if (!loaded || touchedRef.current) return;
    const saved = preferences.table_management.default_view;
    setView(VIEW_TABS.some(v => v.key === saved) ? saved : 'floor');
  }, [loaded, preferences]);

  if (!view) {
    return (
      <div className="ui-page">
        <p className="text-ui text-ink-muted">Loading tables…</p>
      </div>
    );
  }

  const { Component } = VIEW_TABS.find(v => v.key === view);

  return (
    <>
      <Component {...props} />
    </>
  );
};

export default TableManagementSwitcher;