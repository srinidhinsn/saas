// src/components/customizations/CustomContextMenu.jsx
import React, { useEffect, useState, useRef } from 'react';

/**
 * CustomContextMenu
 * - listens for `contextmenu` events and prevents default browser menu
 * - shows a custom menu positioned at mouse coords
 * - hides on click outside, Escape, scroll or resize
 *
 * Props:
 * - items: [{ id, label, onClick, icon? }]  // onClick receives (event, item)
 * - selector (optional): CSS selector string to limit which element(s) should show the custom menu.
 *                        If omitted, menu is shown for the whole document.
 */
export default function CustomContextMenu({ items = [], selector = null }) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const menuRef = useRef(null);

  useEffect(() => {
    const handleContext = (e) => {
      // if selector provided, only show for matching targets
      if (selector && !e.target.closest(selector)) return;

      e.preventDefault(); // IMPORTANT: prevent browser default
      setPos(getClampedPosition(e.clientX, e.clientY));
      setVisible(true);
    };

    const handleClick = (e) => {
      // hide when clicking outside menu
      if (!menuRef.current || !menuRef.current.contains(e.target)) {
        setVisible(false);
      }
    };

    const handleKey = (e) => {
      if (e.key === 'Escape') setVisible(false);
    };

    const handleScrollResize = () => setVisible(false);

    document.addEventListener('contextmenu', handleContext);
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKey);
    window.addEventListener('scroll', handleScrollResize, true);
    window.addEventListener('resize', handleScrollResize);

    return () => {
      document.removeEventListener('contextmenu', handleContext);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('scroll', handleScrollResize, true);
      window.removeEventListener('resize', handleScrollResize);
    };
  }, [selector, items.length]);

  // clamp so menu doesn't overflow viewport
  const getClampedPosition = (clientX, clientY) => {
    const pad = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const estimatedWidth = 220; // menu approximate width
    const estimatedHeight = Math.min(40 * items.length + 12, vh - 2 * pad);
    let x = clientX;
    let y = clientY;

    if (x + estimatedWidth + pad > vw) x = vw - estimatedWidth - pad;
    if (y + estimatedHeight + pad > vh) y = vh - estimatedHeight - pad;
    if (x < pad) x = pad;
    if (y < pad) y = pad;
    return { x, y };
  };

  const onItemClick = (item, e) => {
    setVisible(false);
    try {
      item.onClick && item.onClick(e, item);
    } catch (err) {
      console.error('Context menu item error', err);
    }
  };

  if (!visible) return null;

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-hidden={!visible}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        zIndex: 99999,
        minWidth: 160,
        width: 320,
        height:420,
        background: 'var(--color-bg-primary)',
        boxShadow: 'var(--shadow-card)',
        border: '1px solid var(--color-border-default)',
        borderRadius: 8,
        padding: 6,
      }}
    >
      {items.map((it) => (
        <button
          key={it.id}
          role="menuitem"
          tabIndex={0}
          onClick={(e) => onItemClick(it, e)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onItemClick(it, e); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            width: '100%',
            textAlign: 'left',
            padding: '8px 10px',
            borderRadius: 6,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-text-primary)',
          }}
          className="hover:bg-bg-hover"
        >
          {it.icon && <span style={{ opacity: 0.9 }}>{it.icon}</span>}
          <span style={{ fontSize: 14 }}>{it.label}</span>
        </button>
      ))}
    </div>
  );
}
