import React, { useState } from 'react';
import { Upload, Download, CloudUpload } from 'lucide-react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { jwtDecode } from 'jwt-decode';
import { menuCache } from '../../utils/Menu-utils/menuCache';
import { getDietaryFromSlug, toSlugSegment } from '../../utils/Menu-utils/menuUtils';

const API = import.meta.env.VITE_API_INVENTORY_SERVICE_URL;

const normalize = (str) => (str || '').toLowerCase().replace(/[-_\s]/g, '');
const sectionLabel = (s) => `${s.zone}-${s.section}`.trim().toLowerCase();

const MenuExcelTools = ({
  clientId,
  token,
  realm,
  menuConfig,
  categoriesFlat,
  sections,
  allMenuItemsRaw,
  dietaryOptions,
  timingOptions,
  selectedCategoryId,
  fetchData,
}) => {
  const [importValidationModal, setImportValidationModal] = useState(null);
  const [importSuccess, setImportSuccess] = useState(null);
  const [importConfirm, setImportConfirm] = useState(null);
  const [importError, setImportError] = useState(null);

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  const showError = (err) => {
    console.error('Import Error:', err);
    setImportError(err.message || 'Something went wrong during import.');
    setTimeout(() => setImportError(null), 4000);
  };

  // ─── EXPORT ────────────────────────────────────────────────────────
  const handleExportToExcel = () => {
    try {
      const catNameById = (idOrName) => {
        if (!idOrName) return 'Uncategorized';
        const found = categoriesFlat.find(
          (c) => c.id === idOrName || c.name?.toLowerCase() === String(idOrName).toLowerCase()
        );
        return found?.name || idOrName || 'Unknown';
      };

      const grouped = {};
      allMenuItemsRaw.forEach((item) => {
        const key = item.id;
        if (!grouped[key]) grouped[key] = { baseItem: null, zonePrices: {} };

        const zid = Number(item.zone_config_id);
        if (zid === 0) {
          grouped[key].baseItem = item;
        } else {
          const sec = sections.find((s) => Number(s.id) === zid);
          if (sec) grouped[key].zonePrices[sectionLabel(sec)] = item.unit_price;
        }
      });

      const zoneColumns = sections.map(sectionLabel);

      const exportData = Object.values(grouped)
        .filter(({ baseItem }) => baseItem !== null)
        .map(({ baseItem: item, zonePrices }) => {
          const dietary = getDietaryFromSlug(item, dietaryOptions);
          const slugTimingPart = item.slug?.includes('__') ? item.slug.split('__')[1] : '';
          const suffixParts = (slugTimingPart || '')
            .split('+')
            .filter(
              (p) =>
                p &&
                p !== 'unavailable' &&
                p !== 'allday' &&
                !dietaryOptions.some((d) => normalize(d) === normalize(p))
            );

          const row = {
            Name: item.name ?? '',
            Description: item.description ?? '',
            Category: catNameById(item.category_id) || 'Unknown',
            Dietary_Type: dietary || '',
            Availability_Timing: suffixParts.join('+') || '',
            Image: item.image_id ?? '',
            Unit: item.unit ?? '',
            Unit_Price: Number(item.unit_price) || 0,
            Discount: Number(item.discount) || 0,
            Availability: Number(item.availability) || 0,
            Code: item.code != null ? String(item.code) : '',
            Serving_Quantity: item.serving_quantity ?? '',
            Serving_Unit: item.serving_unit ?? '',
            Line_Item_IDs: Array.isArray(item.line_item_id) ? item.line_item_id.join(', ') : '',
          };
          zoneColumns.forEach((col) => {
            row[`Price_${col}`] = zonePrices[col] ?? '';
          });
          return row;
        });

      const headers = [
        'Name', 'Description', 'Category', 'Dietary_Type', 'Availability_Timing',
        'Image', 'Unit', 'Unit_Price', 'Discount', 'Availability', 'Code',
        'Serving_Quantity', 'Serving_Unit', 'Line_Item_IDs',
        ...zoneColumns.map((c) => `Price_${c}`),
      ];

      const worksheet = XLSX.utils.json_to_sheet(exportData, { header: headers });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'MenuItems');
      XLSX.writeFile(workbook, `menu_items_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  // ─── IMPORT: write to backend ──────────────────────────────────────
  const runImport = async ({
    parsedData, priceColumns, allMenuItems,
    created_by, updated_by,
    currentCategoriesFlat, currentSelectedCategoryId, currentSections,
  }) => {
    for (const row of parsedData) {
      if (!row.Name?.trim()) continue;

      const existingRecords = allMenuItems.filter(
        (item) => item.name?.trim().toLowerCase() === row.Name.trim().toLowerCase()
      );

      const categoryId =
        currentCategoriesFlat.find(
          (c) => c.name.trim().toLowerCase() === (row.Category || '').trim().toLowerCase()
        )?.id || currentSelectedCategoryId;

      const categoryName = currentCategoriesFlat.find((c) => c.id === categoryId)?.name || null;
      if (!categoryName) {
        console.warn(`[Import] Skipping "${row.Name}" — category not found: "${row.Category}"`);
        continue;
      }

      const rawDietary = normalize((row.Dietary_Type || '').trim());
      const matchedDietaryOption = dietaryOptions.find((d) => normalize(d) === rawDietary);
      const importedDietary = matchedDietaryOption ? normalize(matchedDietaryOption) : rawDietary;

      const timingPart = (row.Availability_Timing || '').trim().toLowerCase() || null;

      const slug = (() => {
        const parts = [];
        let currentId = categoryId;
        const visited = new Set();
        while (currentId && !visited.has(currentId)) {
          visited.add(currentId);
          const cat = currentCategoriesFlat.find((c) => c.id === currentId);
          if (!cat) break;
          parts.unshift(toSlugSegment(cat.name));
          currentId = cat.parentId ?? cat.parent_id ?? null;
        }
        const base = [...parts, toSlugSegment(row.Name)].filter(Boolean).join('_');
        const suffixParts = [
          ...(importedDietary ? [importedDietary] : []),
          ...(timingPart ? [timingPart] : []),
        ].filter(Boolean);
        return suffixParts.length > 0 ? `${base}__${suffixParts.join('+')}` : base;
      })();

      const existingImageId =
        allMenuItems.find(
          (item) =>
            item.name?.trim().toLowerCase() === row.Name.trim().toLowerCase() &&
            (item.zone_config_id === 0 || item.zone_config_id === null)
        )?.image_id ?? null;

      const importedImageId =
        row.Image && String(row.Image).trim() !== '' ? String(row.Image).trim() : null;

      const basePayload = {
        client_id: clientId,
        inventory_id: menuConfig.menuInventoryId,
        name: row.Name.trim(),
        description: row.Description || null,
        category_id: categoryId,
        realm: realm || null,
        code: row.Code ? String(row.Code) : null,
        serving_quantity: row.Serving_Quantity || null,
        serving_unit: row.Serving_Unit || null,
        unit: row.Unit || null,
        image_id: importedImageId ?? existingImageId,
        discount: Number(row.Discount) || 0,
        availability: Number(row.Availability) || 0,
        slug,
        line_item_id: row.Line_Item_IDs
          ? String(row.Line_Item_IDs)
              .split(',')
              .map((v) => parseInt(v.trim(), 10))
              .filter((v) => !isNaN(v))
          : null,
        created_by,
        updated_by,
      };

      const baseUnitPrice = Number(row.Unit_Price) || 0;
      const existingBase = existingRecords.find((item) => item.zone_config_id === 0);
      let sharedId;

      if (existingBase) {
        sharedId = existingBase.id;
        await axios.post(
          `${API}/${clientId}/menu/delete`,
          { id: sharedId, zone_config_id: 0 },
          authHeaders
        );
        const res = await axios.post(
          `${API}/${clientId}/menu/create`,
          { ...basePayload, id: sharedId, unit_price: baseUnitPrice, zone_config_id: 0 },
          authHeaders
        );
        sharedId = res.data.data.id;
      } else {
        const res = await axios.post(
          `${API}/${clientId}/menu/create`,
          { ...basePayload, unit_price: baseUnitPrice, zone_config_id: 0 },
          authHeaders
        );
        sharedId = res.data.data.id;
      }

      for (const section of currentSections) {
        const configId = Number(section.id);
        if (!configId) continue;

        const priceCol = priceColumns.find(
          (col) => col.replace('Price_', '').trim().toLowerCase() === sectionLabel(section)
        );
        const priceVal = priceCol ? row[priceCol] : undefined;
        const finalPrice =
          priceVal !== '' && priceVal !== null && priceVal !== undefined
            ? Number(priceVal)
            : baseUnitPrice;

        await axios.post(
          `${API}/${clientId}/menu/create`,
          { ...basePayload, id: sharedId, unit_price: finalPrice, zone_config_id: configId },
          authHeaders
        );
      }
    }

    menuCache.invalidate(clientId);
    await fetchData({ silent: false, force: true });
    setImportSuccess('Import completed successfully');
    setTimeout(() => setImportSuccess(null), 3000);
  };

  // ─── IMPORT: parse + validate ──────────────────────────────────────
  const handleImportFromExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    let created_by = 'system';
    try {
      created_by = jwtDecode(token)?.user_id || created_by;
    } catch { /* keep default */ }
    const updated_by = created_by;

    const currentCategoriesFlat = [...categoriesFlat];
    const currentSelectedCategoryId = selectedCategoryId;
    const currentSections = [...sections];

    let allMenuItems = [];
    try {
      const res = await axios.get(`${API}/${clientId}/menu/read`, {
        ...authHeaders,
        params: { inventory_id: menuConfig.menuInventoryId },
      });
      allMenuItems = (res.data.data || []).map((item) => ({
        ...item,
        zone_config_id:
          item.zone_config_id === null || item.zone_config_id === undefined
            ? 0
            : Number(item.zone_config_id),
      }));
    } catch (err) {
      console.error('Failed to fetch full menu:', err);
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const workbook = XLSX.read(evt.target.result, { type: 'binary' });
        const parsedData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {
          defval: '',
        });
        if (!parsedData.length) return;

        const priceColumns = Object.keys(parsedData[0]).filter((c) => c.startsWith('Price_'));

        const invalidDietarySet = new Set();
        const invalidTimingSet = new Set();
        const invalidCategorySet = new Set();
        const duplicateCodeMap = new Map();

        const addDup = (code, ...names) => {
          if (!duplicateCodeMap.has(code)) duplicateCodeMap.set(code, new Set());
          names.forEach((n) => duplicateCodeMap.get(code).add(n));
        };

        for (const row of parsedData) {
          if (!row.Name?.trim()) continue;

          const rawCategory = (row.Category || '').trim();
          if (
            rawCategory &&
            !currentCategoriesFlat.find((c) => c.name.trim().toLowerCase() === rawCategory.toLowerCase())
          ) {
            invalidCategorySet.add(rawCategory);
          }

          const rawDietary = (row.Dietary_Type || '').trim();
          if (rawDietary && !dietaryOptions.find((d) => normalize(d) === normalize(rawDietary))) {
            invalidDietarySet.add(rawDietary);
          }

          const rawTiming = (row.Availability_Timing || '').trim();
          if (rawTiming && rawTiming.toLowerCase() !== 'allday') {
            const keys = rawTiming.toLowerCase().split('+').map((t) => t.trim()).filter(Boolean);
            for (const key of keys) {
              if (!timingOptions.find((o) => o.name?.toLowerCase() === key)) invalidTimingSet.add(key);
            }
          }

          const rowCode = String(row.Code ?? '').trim();
          if (rowCode) {
            const existingConflict = allMenuItems.find((item) => {
              const isBase = item.zone_config_id === 0 || item.zone_config_id === null;
              const sameCode = String(item.code ?? '').trim() === rowCode;
              const differentName =
                (item.name || '').trim().toLowerCase() !== row.Name.trim().toLowerCase();
              return isBase && sameCode && differentName;
            });
            if (existingConflict) addDup(rowCode, row.Name.trim(), existingConflict.name);

            const others = parsedData.filter(
              (r) => r !== row && String(r.Code ?? '').trim() === rowCode
            );
            if (others.length > 0) addDup(rowCode, row.Name.trim(), ...others.map((r) => r.Name.trim()));
          }
        }

        const invalidCodeDetails = Array.from(duplicateCodeMap.entries()).map(
          ([code, names]) => `${code} → ${Array.from(names).join(', ')}`
        );

        const importArgs = {
          parsedData, priceColumns, allMenuItems,
          created_by, updated_by,
          currentCategoriesFlat, currentSelectedCategoryId, currentSections,
        };

        if (
          invalidDietarySet.size > 0 ||
          invalidCategorySet.size > 0 ||
          invalidTimingSet.size > 0 ||
          invalidCodeDetails.length > 0
        ) {
          setImportValidationModal({
            invalidCategory: [...invalidCategorySet],
            invalidDietary: [...invalidDietarySet],
            invalidTiming: [...invalidTimingSet],
            invalidCode: invalidCodeDetails,
            fileEvent: e,
            ...importArgs,
          });
          return;
        }

        setImportConfirm({
          count: parsedData.length,
          onConfirm: async () => {
            setImportConfirm(null);
            try {
              await runImport(importArgs);
            } catch (err) {
              showError(err);
            }
            e.target.value = '';
          },
          onCancel: () => {
            setImportConfirm(null);
            e.target.value = '';
          },
        });
      } catch (err) {
        showError(err);
        e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImportAnyway = async () => {
    const { fileEvent, invalidCategory, invalidDietary, invalidTiming, invalidCode, ...importArgs } =
      importValidationModal;
    setImportValidationModal(null);
    try {
      await runImport(importArgs);
    } catch (err) {
      showError(err);
    }
    if (fileEvent) fileEvent.target.value = '';
  };

  const closeValidationModal = () => {
    if (importValidationModal?.fileEvent) importValidationModal.fileEvent.target.value = '';
    setImportValidationModal(null);
  };

  const CloseIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );

  return (
    <>
      {/* ── Toolbar dropdown + hidden file input ── */}
      <div className="relative group">
        <button className="h-9 px-3 flex items-center gap-2 rounded-lg bg-bg-tertiary border border-border-default text-sm font-semibold hover:border-action-primary hover:bg-bg-secondary">
          <CloudUpload size={14} />
        </button>
        <div className="absolute right-0 mt-1 w-36 bg-bg-primary border border-border-default rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
          <button onClick={() => document.getElementById('excelInput').click()} className="w-full px-4 py-2 flex items-center gap-2 text-sm hover:bg-bg-secondary">
            <Upload size={14} />Import
          </button>
          <button onClick={handleExportToExcel} className="w-full px-4 py-2 flex items-center gap-2 text-sm hover:bg-bg-secondary">
            <Download size={14} />Export
          </button>
        </div>
      </div>
      <input type="file" id="excelInput" accept=".xlsx, .xls" className="hidden" onChange={handleImportFromExcel} />

      {/* ── Validation modal ── */}
      {importValidationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-bg-primary rounded-2xl w-full max-w-md shadow-xl border border-border-default overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border-default bg-yellow-50">
              <div className="w-9 h-9 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-yellow-900">Invalid values detected</h3>
            </div>

            <div className="px-5 py-4 space-y-4 max-h-72 overflow-y-auto">
              {importValidationModal.invalidCategory?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Category — not found</p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {importValidationModal.invalidCategory.map((v) => (
                      <span key={v} className="px-2.5 py-1 rounded-full text-xs bg-red-100 text-red-800 font-medium">{v}</span>
                    ))}
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    These categories don't exist in your menu tree. Create them first in the sidebar for a smooth import.
                  </p>
                </div>
              )}

              {importValidationModal.invalidCode?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Duplicate item codes</p>
                  <div className="flex flex-col gap-1.5 mb-2">
                    {importValidationModal.invalidCode.map((v) => (
                      <span key={v} className="px-2.5 py-1.5 rounded-lg text-xs bg-red-100 text-red-800 font-medium">{v}</span>
                    ))}
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Two or more items share the same code. Item codes must be unique.
                  </p>
                </div>
              )}

              {importValidationModal.invalidDietary?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Dietary type — not found</p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {importValidationModal.invalidDietary.map((v) => (
                      <span key={v} className="px-2.5 py-1 rounded-full text-xs bg-red-100 text-red-800 font-medium">{v}</span>
                    ))}
                  </div>
                  <p className="text-xs text-text-secondary">
                    Valid options:{' '}
                    {dietaryOptions.length > 0
                      ? dietaryOptions.map((d) => (
                          <span key={d} className="inline-block mx-0.5 px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-medium">{d}</span>
                        ))
                      : <span className="italic">none configured</span>}
                  </p>
                </div>
              )}

              {importValidationModal.invalidTiming?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Availability timing — not found</p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {importValidationModal.invalidTiming.map((v) => (
                      <span key={v} className="px-2.5 py-1 rounded-full text-xs bg-red-100 text-red-800 font-medium">{v}</span>
                    ))}
                  </div>
                  <p className="text-xs text-text-secondary">
                    Valid options:{' '}
                    {timingOptions.length > 0
                      ? timingOptions.map((t) => (
                          <span key={t.name} className="inline-block mx-0.5 px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-medium">{t.name}</span>
                        ))
                      : <span className="italic">none configured</span>}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2 px-5 py-4 border-t border-border-default">
              <button onClick={closeValidationModal} className="flex-1 h-9 rounded-lg border border-border-default text-sm font-semibold bg-bg-tertiary hover:bg-bg-secondary transition-colors">
                OK
              </button>
              {!importValidationModal.invalidCode?.length && (
                <button onClick={handleImportAnyway} className="flex-1 h-9 rounded-lg bg-action-primary text-text-white text-sm font-semibold hover:opacity-90 transition-opacity">
                  Import Anyway
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm modal ── */}
      {importConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-bg-primary rounded-2xl w-full max-w-sm shadow-xl border border-border-default overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border-default bg-blue-50">
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <Upload size={16} className="text-blue-700" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-blue-900">Confirm import</h3>
                <p className="text-xs text-blue-700 mt-0.5">Review before proceeding</p>
              </div>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-text-secondary leading-relaxed">
                Import <strong className="text-text-primary">{importConfirm.count}</strong> item(s) from this file?
              </p>
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-border-default">
              <button onClick={importConfirm.onCancel} className="flex-1 h-9 rounded-lg border border-border-default text-sm font-semibold bg-bg-tertiary hover:bg-bg-secondary transition-colors">
                Cancel
              </button>
              <button onClick={importConfirm.onConfirm} className="flex-1 h-9 rounded-lg bg-action-primary text-text-white text-sm font-semibold hover:opacity-90 transition-opacity">
                Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toasts ── */}
      {importSuccess && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-green-600 text-white shadow-lg animate-slideUp">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          <span className="text-sm font-semibold">{importSuccess}</span>
          <button onClick={() => setImportSuccess(null)} className="ml-1 opacity-70 hover:opacity-100 transition-opacity">
            <CloseIcon />
          </button>
        </div>
      )}

      {importError && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-red-600 text-white shadow-lg animate-slideUp max-w-sm">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Import failed</span>
            <span className="text-xs opacity-80 mt-0.5 leading-snug">{importError}</span>
          </div>
          <button onClick={() => setImportError(null)} className="ml-1 opacity-70 hover:opacity-100 transition-opacity shrink-0">
            <CloseIcon />
          </button>
        </div>
      )}
    </>
  );
};

export default MenuExcelTools;