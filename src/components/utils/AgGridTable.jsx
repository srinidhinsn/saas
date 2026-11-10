import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';

import {
    ModuleRegistry,
    ClientSideRowModelModule,
    TextFilterModule,
    NumberFilterModule,
    DateFilterModule,
    PaginationModule,
    CsvExportModule,
    ValidationModule,
    RowStyleModule,
    CellStyleModule,
    ColumnApiModule,
} from 'ag-grid-community';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

import {
    Search,
    Download,
    Columns3,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';

ModuleRegistry.registerModules([
    ClientSideRowModelModule,
    TextFilterModule,
    NumberFilterModule,
    DateFilterModule,
    PaginationModule,
    CsvExportModule,
    ValidationModule,
    RowStyleModule,
    CellStyleModule,
    ColumnApiModule,
]);

export const SelectFloatingFilter = React.forwardRef((props, ref) => {
    const [value, setValue] = useState('');

    React.useImperativeHandle(ref, () => ({
        onParentModelChanged(parentModel) {
            setValue(parentModel ? parentModel.filter : '');
        },
    }));

    const options = useMemo(() => {
        if (props.options && props.options.length) {
            return props.options.map(opt => (typeof opt === 'string' ? { value: opt, label: opt } : opt));
        }
        const colDef = props.column.getColDef();
        const unique = new Set();
        props.api.forEachNode(node => {
            const val = colDef.valueGetter
                ? colDef.valueGetter({ data: node.data, node, colDef, api: props.api })
                : node.data?.[props.column.getColId()];
            if (val !== undefined && val !== null && val !== '') unique.add(String(val));
        });
        return Array.from(unique).sort().map(v => ({ value: v, label: v }));
    }, [props.api, props.column, props.options]);

    const handleChange = async (e) => {
        const newValue = e.target.value;
        setValue(newValue);
        const colId = props.column.getColId();
        if (!newValue) {
            await props.api.setColumnFilterModel(colId, null);
        } else {
            await props.api.setColumnFilterModel(colId, { filterType: 'text', type: 'equals', filter: newValue });
        }
        props.api.onFilterChanged();
    };

    return (
        <select
            value={value || ''}
            onChange={handleChange}
            className="w-full text-ui-sm px-2 py-1 rounded-button-sm border border-brand-line bg-brand-light text-brand-dark focus:outline-none focus:border-brand-ring focus:shadow-focus-ring"
        >
            <option value="">All</option>
            {options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
    );
});

const GRID_ICONS = {
    sortAscending:
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>',
    sortDescending:
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    sortUnSort:
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 15 5 5 5-5M7 9l5-5 5 5"/></svg>',
};

// ─────────────────────────────────────────────────────────────────────────────
// Column visibility menu — small, self-contained dropdown
// ─────────────────────────────────────────────────────────────────────────────

const ColumnVisibilityMenu = ({ columnDefs, hiddenCols, onToggle }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const onDocClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, []);

    const toggleable = columnDefs.filter(c => c.colId !== 'actions' && (c.field || c.colId));

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(o => !o)}
                className="ui-btn ui-btn-config"
            >
                <Columns3 size={14} /> Columns
            </button>
            {open && (
                <div className="absolute right-0 mt-2 w-48 rounded-panel border border-brand-line bg-surface shadow-panel z-30 py-2 max-h-64 overflow-y-auto">
                    {toggleable.map(c => {
                        const id = c.colId || c.field;
                        const checked = !hiddenCols.includes(id);
                        return (
                            <label key={id} className="flex items-center gap-2 px-3 py-1.5 text-ui-sm text-ink hover:bg-brand-light cursor-pointer">
                                <input type="checkbox" checked={checked} onChange={() => onToggle(id)} className="accent-brand" />
                                {c.headerName || id}
                            </label>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const AgGridTable = ({
    columnDefs,
    rowData,
    quickFilterText: quickFilterTextProp = '',
    pagination = false,
    paginationPageSize = 10,
    domLayout = 'autoHeight',
    height = 520,
    rowHeight = 68,
    headerHeight = 48,
    gridOptions = {},
    showToolbar = true,
    enableExport = true,
    enableColumnToggle = true,
    exportFileName = 'export',
    toolbarLeft = null,
    toolbarRight = null,
    ...rest
}) => {
    const gridApiRef = useRef(null);
    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [hiddenCols, setHiddenCols] = useState([]);
    const [pageInfo, setPageInfo] = useState({ page: 0, totalPages: 1, from: 0, to: 0, total: 0 });

    // Debounce the toolbar search box (~300ms) so typing feels smooth.
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchInput), 300);
        return () => clearTimeout(t);
    }, [searchInput]);

    const effectiveQuickFilter = showToolbar ? debouncedSearch : quickFilterTextProp;
    useEffect(() => {
        if (!gridApiRef.current) return;

        gridApiRef.current.setGridOption(
            "quickFilterText",
            effectiveQuickFilter
        );
    }, [effectiveQuickFilter]);

    const defaultColDef = useMemo(() => ({
        sortable: true,

        filter: "agTextColumnFilter",

        floatingFilter: false,

        resizable: true,

        flex: 1,

        minWidth: 120,

        cellClass: "flex items-center",

        filterParams: {
            buttons: ["reset"],
            debounceMs: 300,
            filterOptions: [
                "contains",
                "startsWith",
                "endsWith",
                "equals",
            ],
        },
    }), []);

    const onGridReady = useCallback((params) => {
        gridApiRef.current = params.api;

        // Apply any search text that already exists
        if (effectiveQuickFilter) {
            params.api.setGridOption(
                "quickFilterText",
                effectiveQuickFilter
            );
        }

        updatePageInfo(params.api);
    }, [effectiveQuickFilter]);

    const updatePageInfo = useCallback((api) => {
        if (!api || !pagination) return;

        const page = api.paginationGetCurrentPage();
        const totalPages = Math.max(api.paginationGetTotalPages(), 1);
        const total = api.paginationGetDisplayedRowCount();
        const size = api.paginationGetPageSize();

        const from = total === 0 ? 0 : page * size + 1;
        const to = Math.min((page + 1) * size, total);

        setPageInfo({
            page,
            totalPages,
            from,
            to,
            total,
        });
    }, [pagination]);

    const onPaginationChanged = useCallback(() => {
        if (!gridApiRef.current) return;

        updatePageInfo(gridApiRef.current);
    }, [updatePageInfo]);

    const handleToggleColumn = (colId) => {
        if (!gridApiRef.current) return;

        setHiddenCols(prev => {
            const isHidden = prev.includes(colId);

            // true = show column, false = hide column
            gridApiRef.current.setColumnsVisible([colId], isHidden);

            return isHidden
                ? prev.filter(c => c !== colId)
                : [...prev, colId];
        });
    };

    const handleExport = useCallback(() => {
        if (!gridApiRef.current) return;

        gridApiRef.current.exportDataAsCsv({
            fileName: `${exportFileName}.csv`,
        });
    }, [exportFileName]);

    const onFilterChanged = useCallback(() => {
        if (!gridApiRef.current) return;

        updatePageInfo(gridApiRef.current);
    }, [updatePageInfo]);

    return (
        <div className="ag-modern-wrapper w-full">
            {showToolbar && (
                <div className="flex flex-wrap items-center justify-between gap-3 m-2">
                    <div className="flex flex-wrap items-center gap-2">
                        {toolbarLeft}
                    </div>
                    <div className="ml-auto flex flex-wrap items-center gap-2">
                        {toolbarRight}
                        {enableColumnToggle && (
                            <ColumnVisibilityMenu columnDefs={columnDefs} hiddenCols={hiddenCols} onToggle={handleToggleColumn} />
                        )}
                        {enableExport && (
                            <button
                                onClick={handleExport}
                                className="ui-btn ui-btn-config"
                            >
                                <Download size={14} /> Export
                            </button>
                        )}
                    </div>
                </div>
            )}

            <div
                className="ag-theme-quartz ag-modern-grid w-full rounded-xl overflow-hidden"
                style={{
                    ...(domLayout === 'autoHeight' ? {} : { height }),
                    '--ag-row-height': `${rowHeight}px`,
                    '--ag-header-height': `${headerHeight}px`,
                    '--ag-cell-horizontal-padding': '20px',
                    '--ag-border-color': '#e1d4ee',
                    '--ag-row-border-color': '#e9eff3',
                    '--ag-header-column-separator-display': 'none',
                    '--ag-wrapper-border-radius': '0px',
                }}
            >
                <AgGridReact
                    theme="legacy"
                    rowData={rowData}
                    columnDefs={columnDefs}
                    defaultColDef={defaultColDef}

                    pagination={pagination}
                    paginationPageSize={paginationPageSize}
                    paginationPageSizeSelector={false}
                    suppressPaginationPanel={pagination}

                    domLayout={domLayout}

                    rowHeight={rowHeight}
                    headerHeight={headerHeight}

                    animateRows={true}

                    icons={GRID_ICONS}

                    onGridReady={onGridReady}

                    onPaginationChanged={onPaginationChanged}

                    onFilterChanged={onFilterChanged}

                    getRowClass={(params) =>
                        params.node.rowIndex % 2 === 1
                            ? "ag-row-zebra"
                            : ""
                    }

                    {...gridOptions}
                    {...rest}
                />
            </div>

            {pagination && (
                <div className="flex items-center justify-between mt-3 px-1">
                    <span className="text-ui-sm font-medium text-ink-muted">
                        {pageInfo.total === 0 ? 'No rows' : `Showing ${pageInfo.from}–${pageInfo.to} of ${pageInfo.total}`}
                    </span>
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => gridApiRef.current?.paginationGoToPreviousPage()}
                            disabled={pageInfo.page === 0}
                            className="w-8 h-8 flex items-center justify-center rounded-button-sm border border-brand-line text-brand-dark hover:bg-brand-light hover:border-brand-ring disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={15} />
                        </button>
                        <span className="text-ui-sm font-semibold text-ink px-2">
                            {pageInfo.page + 1} / {pageInfo.totalPages}
                        </span>
                        <button
                            onClick={() => gridApiRef.current?.paginationGoToNextPage()}
                            disabled={pageInfo.page >= pageInfo.totalPages - 1}
                            className="w-8 h-8 flex items-center justify-center rounded-button-sm border border-brand-line text-brand-dark hover:bg-brand-light hover:border-brand-ring disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight size={15} />
                        </button>
                    </div>
                </div>
            )}

            <style>{`
        .ag-modern-grid.ag-theme-quartz {
          --ag-font-family: Inter, "Segoe UI", Arial, sans-serif;
          --ag-font-size: 13px;
          --ag-foreground-color: #17283b;
          --ag-background-color: #ffffff;
          --ag-header-background-color: #f5f0f9;
          --ag-header-foreground-color: #695284;
          --ag-odd-row-background-color: #faf7fd;
          --ag-row-hover-color: #f5f0f9;
          --ag-selected-row-background-color: #e9ddf5;
          --ag-accent-color: #7953a7;
          --ag-input-focus-border-color: #a47dc9;
          --ag-checkbox-checked-color: #7953a7;
        }
        .ag-modern-grid .ag-root-wrapper {
          border: 1px solid #e1d4ee;
          border-radius: 9px;
          overflow: hidden;
        }
        .ag-modern-grid .ag-header {
          border-bottom: 1px solid #e1d4ee;
        }
        .ag-modern-grid .ag-header-cell-label {
          font-weight: 750;
          font-size: 11px;
          letter-spacing: .045em;
          text-transform: uppercase;
        }
        .ag-modern-grid .ag-header-cell:hover {
          background-color: #e9ddf5;
        }
        .ag-modern-grid .ag-row {
          border-bottom: 1px solid #e9eff3;
          transition: background .15s ease;
        }
        .ag-modern-grid .ag-row-zebra {
          background-color: #faf7fd;
        }
        .ag-modern-grid .ag-row-hover {
          background: #f5f0f9 !important;
        }
        .ag-modern-grid .ag-cell {
          display: flex;
          align-items: center;
          font-size: 13px;
          color: #354b60;
        }
        .ag-modern-grid .ag-cell-focus,
        .ag-modern-grid .ag-cell:focus {
          border-color: #a47dc9 !important;
        }
        .ag-modern-grid .ag-icon {
          color: #7953a7;
          opacity: .9;
        }
        .ag-modern-grid .ag-header-cell:hover .ag-icon {
          opacity: 1;
        }
        .ag-modern-grid .ag-paging-panel {
          border-top: 1px solid #e1d4ee;
          color: #6d7f90;
        }
        .ag-modern-grid .ag-checkbox-input-wrapper.ag-checked::after {
          color: #7953a7;
        }
      `}</style>
        </div>
    );
};

export default AgGridTable;