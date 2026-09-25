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
            className="w-full text-xs px-1.5 py-1 rounded-md border border-border-default bg-bg-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
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
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-border-default bg-bg-primary text-text-secondary hover:text-text-primary hover:border-action-primary/40 transition-colors"
            >
                <Columns3 size={14} /> Columns
            </button>
            {open && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg border border-border-default bg-bg-primary shadow-card z-30 py-2 max-h-64 overflow-y-auto">
                    {toggleable.map(c => {
                        const id = c.colId || c.field;
                        const checked = !hiddenCols.includes(id);
                        return (
                            <label key={id} className="flex items-center gap-2 px-3 py-1.5 text-xs text-text-primary hover:bg-bg-tertiary cursor-pointer">
                                <input type="checkbox" checked={checked} onChange={() => onToggle(id)} className="accent-action-primary" />
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
                <div className="flex justify-between gap-3 m-2">

                    {toolbarLeft}
                    <div className="ml-auto flex items-center gap-2">
                        {enableColumnToggle && (
                            <ColumnVisibilityMenu columnDefs={columnDefs} hiddenCols={hiddenCols} onToggle={handleToggleColumn} />
                        )}
                        {enableExport && (
                            <button
                                onClick={handleExport}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-action-primary text-text-white hover:opacity-90 transition-opacity"
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
                    '--ag-border-color': 'var(--color-border-default, #eee)',
                    '--ag-row-border-color': 'var(--color-border-default, #eee)',
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
                    <span className="text-xs font-medium text-text-secondary">
                        {pageInfo.total === 0 ? 'No rows' : `Showing ${pageInfo.from}–${pageInfo.to} of ${pageInfo.total}`}
                    </span>
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => gridApiRef.current?.paginationGoToPreviousPage()}
                            disabled={pageInfo.page === 0}
                            className="w-8 h-8 flex items-center justify-center rounded-full border border-border-default text-text-secondary hover:bg-bg-tertiary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={15} />
                        </button>
                        <span className="text-xs font-semibold text-text-primary px-2">
                            {pageInfo.page + 1} / {pageInfo.totalPages}
                        </span>
                        <button
                            onClick={() => gridApiRef.current?.paginationGoToNextPage()}
                            disabled={pageInfo.page >= pageInfo.totalPages - 1}
                            className="w-8 h-8 flex items-center justify-center rounded-full border border-border-default text-text-secondary hover:bg-bg-tertiary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight size={15} />
                        </button>
                    </div>
                </div>
            )}

            <style>{`
        .ag-modern-grid.ag-theme-quartz {
          --ag-font-size: 13.5px;
          --ag-foreground-color: var(--color-text-primary, #1f2937);
          --ag-background-color: var(--color-bg-primary, #fff);
          --ag-header-background-color: var(--color-bg-primary, #fff);
          --ag-header-foreground-color: var(--color-text-secondary, #6b7280);
          --ag-odd-row-background-color: var(--color-bg-primary, #fff);
          --ag-row-hover-color: #fff7ed;
        }
        .ag-modern-grid .ag-header{
    border-radius:12px 12px 0 0;
}
        .ag-modern-grid .ag-header-cell-label{
    font-weight:700;
    font-size:12px;
    letter-spacing:.05em;
    text-transform:uppercase;
}
        .ag-modern-grid .ag-row{
    transition:background .15s ease;
}
        .ag-modern-grid .ag-row-zebra {
          background-color: #fafafa;
        }
        .ag-modern-grid .ag-row-hover {
    background:#fff7ed !important;
    transition:background .18s ease;
}
        .ag-modern-grid .ag-cell{
    display:flex;
    align-items:center;
    font-size:13px;
}
    .ag-modern-grid .ag-icon{
    opacity:.95;
}

.ag-modern-grid .ag-header-cell:hover .ag-icon{
    opacity:1;
}
      `}</style>
        </div>
    );
};

export default AgGridTable;