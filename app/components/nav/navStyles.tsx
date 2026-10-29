import { c, z } from '@/lib/tokens'
import { MOBILE_BREAKPOINT } from './navConfig'

/**
 * All navbar CSS in one place. Hover/focus/active states live here instead of
 * onMouseEnter/onMouseLeave handlers, so they cannot get stuck.
 */
export const NAV_CSS = `
@keyframes nbFade { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
@keyframes nbPulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }

/* ---------- Shell ---------- */
.nb-row {
  max-width: var(--max-w);
  margin: 0 auto;
  padding: 0 var(--page-px);
  height: 100%;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 28px;
}
.nb-search-slot { width: 100%; max-width: 520px; justify-self: center; min-width: 0; }
.nb-right { display: flex; align-items: center; height: 100%; gap: 2px; }
.nb-mobile-actions { display: none; align-items: center; gap: 2px; }
.nb-icon-btn {
  display: flex; align-items: center; justify-content: center;
  width: 40px; height: 40px; padding: 0;
  color: ${c.text2}; background: none; border: 0; border-radius: var(--r-sm); cursor: pointer;
}
.nb-icon-btn:hover { color: ${c.text1}; background: rgba(21,21,31,0.05); }

@media (max-width: ${MOBILE_BREAKPOINT}px) {
  .nb-row { display: flex; justify-content: space-between; }
  .nb-search-slot, .nb-right { display: none; }
  .nb-mobile-actions { display: flex; }
}

/* ---------- Focus ---------- */
.nb a:focus-visible, .nb button:focus-visible,
.nb-sheet a:focus-visible, .nb-sheet button:focus-visible {
  outline: 2px solid ${c.primary};
  outline-offset: 2px;
}

/* ---------- Primary links ---------- */
.nb-trigger {
  position: relative; display: flex; align-items: center; gap: 5px;
  height: 36px; padding: 0 12px;
  font: inherit; font-size: 13.5px; font-weight: 500; color: ${c.text2};
  background: transparent; border: 0; border-radius: var(--r-sm);
  text-decoration: none; cursor: pointer;
  transition: color .15s, background .15s;
}
.nb-trigger:hover, .nb-trigger[aria-expanded="true"] { color: ${c.text1}; background: rgba(21,21,31,0.05); }
.nb-trigger[data-current="true"] { color: ${c.text1}; }
.nb-trigger[data-current="true"]::after {
  content: ''; position: absolute; left: 12px; right: 12px;
  bottom: calc((var(--nav-h) - 36px) / -2);
  height: 2px; border-radius: 2px; background: ${c.primary};
}
.nb-chev { transition: transform .15s; }
[aria-expanded="true"] > .nb-chev { transform: rotate(180deg); }

.nb-cta {
  display: inline-flex; align-items: center; gap: 6px;
  height: 36px; padding: 0 16px; margin-left: 10px;
  font-size: 13.5px; font-weight: 600; color: #fff; background: ${c.primary};
  border-radius: var(--r-full); text-decoration: none; white-space: nowrap;
  transition: background .15s;
}
.nb-cta:hover { background: ${c.primaryHover}; }

.nb-badge {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 16px; height: 16px; padding: 0 4px;
  font-size: 10.5px; font-weight: 700; color: #fff; background: ${c.accent}; border-radius: 8px;
}

/* ---------- Mega panel (anchored to the nav, not to a button) ---------- */
.nb-panel {
  position: absolute; left: 0; right: 0; top: 100%;
  background: ${c.surface}; border-bottom: 1px solid ${c.border};
  box-shadow: var(--shadow-xl); z-index: ${z.dropdown};
  animation: nbFade .14s ease-out;
}
.nb-panel-inner { max-width: var(--max-w); margin: 0 auto; padding: 24px var(--page-px) 0; }
.nb-group-title { margin: 0 0 8px 10px; font-size: 12.5px; font-weight: 600; color: ${c.text3}; }
.nb-panel-foot {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 20px; padding: 10px 0 12px; border-top: 1px solid ${c.border};
}
.nb-foot-link {
  display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px;
  font-size: 13px; font-weight: 500; color: ${c.text2}; text-decoration: none; border-radius: var(--r-sm);
}
.nb-foot-link:hover { background: ${c.bg}; color: ${c.text1}; }
.nb-foot-link--strong { color: ${c.accent}; }
.nb-foot-link--strong:hover { color: ${c.accent}; }

.nb-item {
  display: flex; align-items: center; gap: 10px; padding: 7px 10px;
  font-size: 13.5px; color: ${c.text1}; text-decoration: none;
  border-radius: var(--r-sm); transition: background .1s;
}
.nb-item:hover, .nb-item:focus-visible { background: ${c.bg}; }
.nb-item[aria-current="page"] { background: ${c.bg}; font-weight: 600; }
.nb-item--brand { justify-content: space-between; padding: 9px 10px; font-weight: 500; }
.nb-item-icon {
  width: 32px; height: 32px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  color: ${c.text2}; background: ${c.bg}; border-radius: var(--r-sm);
}
.nb-item:hover .nb-item-icon, .nb-item[aria-current="page"] .nb-item-icon { background: ${c.surface}; }
.nb-count { font-size: 11.5px; font-weight: 400; color: ${c.text3}; }
.nb-skel { background: ${c.bg}; border-radius: var(--r-sm); animation: nbPulse 1.2s ease-in-out infinite; }
.nb-retry {
  margin-left: 6px; padding: 0; font: inherit; font-weight: 600; color: ${c.accent};
  background: none; border: 0; cursor: pointer; text-decoration: underline;
}

/* ---------- Search ---------- */
.nb-input {
  width: 100%; height: 40px; padding: 0 40px 0 40px;
  font: inherit; font-size: 14px; color: ${c.text1};
  background: ${c.surface}; border: 1px solid ${c.border}; border-radius: var(--r-full);
  transition: border-color .15s, box-shadow .15s;
}
.nb-input::placeholder { color: ${c.text3}; }
.nb-input:focus { outline: none; border-color: ${c.primary}; box-shadow: 0 0 0 3px rgba(21,21,31,0.07); }
.nb-search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: ${c.text3}; pointer-events: none; }
.nb-kbd {
  position: absolute; right: 12px; top: 50%; transform: translateY(-50%); pointer-events: none;
  padding: 1px 7px; font-size: 11.5px; font-weight: 500; color: ${c.text3};
  border: 1px solid ${c.border}; border-radius: 6px;
}
.nb-clear {
  position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
  display: flex; padding: 7px; color: ${c.text3}; background: none; border: 0; border-radius: 50%; cursor: pointer;
}
.nb-clear:hover { color: ${c.text1}; }

.nb-listbox {
  background: ${c.surface}; border: 1px solid ${c.border}; border-radius: var(--r-lg);
  box-shadow: var(--shadow-lg); padding: 6px; overflow-y: auto; overscroll-behavior: contain;
  animation: nbFade .12s ease-out;
}
.nb-listbox--bar { position: absolute; top: calc(100% + 8px); left: 0; right: 0; max-height: min(70vh, 480px); z-index: ${z.dropdown}; }
.nb-listbox--sheet { margin-top: 10px; box-shadow: none; }
.nb-opt { display: flex; align-items: center; gap: 12px; padding: 8px; border-radius: var(--r-sm); cursor: pointer; }
.nb-opt[aria-selected="true"] { background: ${c.bg}; }
.nb-opt-icon {
  width: 38px; height: 38px; flex-shrink: 0; overflow: hidden;
  display: flex; align-items: center; justify-content: center;
  color: ${c.text2}; background: ${c.bg}; border-radius: var(--r-sm);
}
.nb-opt[aria-selected="true"] .nb-opt-icon { background: ${c.surface}; }
.nb-opt-text { flex: 1; min-width: 0; }
.nb-opt-title { font-size: 14px; font-weight: 500; color: ${c.text1}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nb-opt-sub { font-size: 12px; color: ${c.text3}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nb-opt-price { flex-shrink: 0; font-size: 13px; font-weight: 600; color: ${c.text1}; }
.nb-opt-head {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 8px 4px; font-size: 12px; font-weight: 600; color: ${c.text3};
}
.nb-opt-clear { padding: 0; font: inherit; font-weight: 500; color: ${c.text3}; background: none; border: 0; cursor: pointer; }
.nb-opt-clear:hover { color: ${c.text1}; }
.nb-opt-msg { padding: 10px 8px; font-size: 13px; color: ${c.text3}; }
.nb-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

/* ---------- Mobile sheet ---------- */
.nb-sheet { animation: nbFade .16s ease-out; }
.nb-sheet .nb-input { height: 46px; font-size: 16px; }
.nb-sheet .nb-opt-title { font-size: 15px; }
.nb-cta--block { display: flex; justify-content: center; width: 100%; height: 46px; margin: 0; font-size: 15px; }
.nb-acc-btn {
  width: 100%; display: flex; align-items: center; justify-content: space-between;
  padding: 16px 0; font: inherit; font-size: 15px; font-weight: 600; color: ${c.text1};
  background: none; border: 0; border-top: 1px solid ${c.border}; text-align: left; text-decoration: none; cursor: pointer;
}
.nb-sheet .nb-item { padding: 10px 8px; font-size: 14.5px; }

@media (prefers-reduced-motion: reduce) {
  .nb-panel, .nb-listbox, .nb-sheet, .nb-skel { animation: none !important; }
  .nb-chev, .nb-input, .nb-trigger, .nb-cta { transition: none !important; }
}
`
