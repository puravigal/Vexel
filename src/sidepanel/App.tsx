import { useEffect, useMemo, useState } from "react";
import {
  AlignCenter, AlignLeft, AlignRight, Check, ChevronDown, CircleHelp,
  MousePointer2, RotateCcw, Undo2, WandSparkles
} from "lucide-react";
import type { EditableStyleProperty, SelectedElement } from "../core/change-model";
import { PROPERTY_LABELS, STYLE_SECTIONS } from "../core/change-model";

type ChangeState = { count: number; };
const defaults: ChangeState = { count: 0 };
const colorProperties = new Set<EditableStyleProperty>(["color", "backgroundColor", "borderColor"]);
const unitless = new Set<EditableStyleProperty>(["fontWeight", "lineHeight", "display", "justifyContent", "alignItems", "textAlign", "fontStyle", "borderStyle", "fontFamily"]);

export default function App() {
  const [tabId, setTabId] = useState<number | null>(null);
  const [pageUrl, setPageUrl] = useState("");
  const [selected, setSelected] = useState<SelectedElement | null>(null);
  const [pickerActive, setPickerActive] = useState(false);
  const [changeState, setChangeState] = useState(defaults);
  const [textDraft, setTextDraft] = useState("");
  const [status, setStatus] = useState("Connect to a page");
  const [openSections, setOpenSections] = useState<string[]>(["Typography", "Background & border", "Dimensions", "Spacing", "Layout"]);

  const hostname = useMemo(() => {
    try { return new URL(pageUrl).hostname; } catch { return "No active page"; }
  }, [pageUrl]);

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      setTabId(tabs[0]?.id ?? null);
      setPageUrl(tabs[0]?.url ?? "");
      setStatus(tabs[0]?.url ? "Ready to edit" : "Open a website to begin");
    }).catch(() => setStatus("Open a website to begin"));

    const listener = (message: any) => {
      if (message?.type === "VEXEL_ELEMENT_SELECTED") {
        setSelected(message.element);
        setTextDraft(message.element.text ?? "");
        setPickerActive(false);
        setStatus("Element selected");
      }
      if (message?.type === "VEXEL_PICKER_STOPPED") setPickerActive(false);
      if (message?.type === "VEXEL_CHANGE_APPLIED") setChangeState({ count: message.changeCount });
      if (message?.type === "VEXEL_RESET_DONE") {
        setChangeState(defaults);
        setStatus("Preview reset");
      }
      if (message?.type === "VEXEL_ERROR" && typeof message.message === "string") setStatus(message.message);
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const sendToPage = (message: Record<string, unknown>) => {
    if (tabId == null) return;
    chrome.tabs.sendMessage(tabId, message).catch(() => setStatus("This page cannot be edited by extensions."));
  };

  const startPicker = async () => {
    if (tabId == null) return;
    try {
      await chrome.tabs.sendMessage(tabId, { type: "VEXEL_START_PICKER" });
      setPickerActive(true);
      setStatus("Click an element on the webpage");
    } catch {
      setStatus("Reload the page once, then try again. Browser-internal pages cannot be edited.");
    }
  };

  const setStyle = (property: EditableStyleProperty, raw: string) => {
    if (!selected) return;
    let value = raw;
    if (!unitless.has(property) && raw && /^-?\d+(\.\d+)?$/.test(raw)) value = `${raw}px`;
    sendToPage({ type: "VEXEL_APPLY_STYLE", targetId: selected.targetId, property, value });
    setSelected((current) => current ? { ...current, styles: { ...current.styles, [property]: value } } : current);
  };

  const updateText = () => {
    if (!selected) return;
    sendToPage({ type: "VEXEL_APPLY_TEXT", targetId: selected.targetId, value: textDraft });
  };

  const styleInput = (property: EditableStyleProperty, value: string | undefined) => {
    const safeValue = value ?? "";
    if (colorProperties.has(property)) {
      const hex = (() => {
        if (/^#[0-9a-f]{6}$/i.test(safeValue)) return safeValue;
        const rgb = safeValue.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        return rgb ? `#${[rgb[1], rgb[2], rgb[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("")}` : "#ffffff";
      })();
      return <div className="color-field"><input aria-label={PROPERTY_LABELS[property]} type="color" value={hex} onChange={(e) => setStyle(property, e.target.value)} /><input aria-label={`${PROPERTY_LABELS[property]} value`} className="text-input" value={safeValue} onChange={(e) => setStyle(property, e.target.value)} /></div>;
    }
    if (property === "textAlign") return <div className="segmented">{(["left", "center", "right", "justify"] as const).map((alignment) => <button key={alignment} title={alignment} className={safeValue === alignment ? "active" : ""} onClick={() => setStyle(property, alignment)}>{alignment === "left" ? <AlignLeft size={14} /> : alignment === "center" ? <AlignCenter size={14} /> : alignment === "right" ? <AlignRight size={14} /> : "Justify"}</button>)}</div>;
    if (property === "fontWeight") return <select aria-label={PROPERTY_LABELS[property]} className="text-input" value={safeValue} onChange={(e) => setStyle(property, e.target.value)}>{["300", "400", "500", "600", "700", "800", "900", "normal", "bold"].map((x) => <option key={x}>{x}</option>)}</select>;
    if (["fontStyle", "display", "borderStyle", "justifyContent", "alignItems"].includes(property)) {
      const options: Record<string, string[]> = {
        fontStyle: ["normal", "italic", "oblique"], display: ["block", "inline", "inline-block", "flex", "grid", "none"],
        borderStyle: ["none", "solid", "dashed", "dotted", "double"], justifyContent: ["flex-start", "center", "flex-end", "space-between", "space-around", "space-evenly"],
        alignItems: ["stretch", "flex-start", "center", "flex-end", "baseline"]
      };
      return <select aria-label={PROPERTY_LABELS[property]} className="text-input" value={safeValue} onChange={(e) => setStyle(property, e.target.value)}>{(options[property] ?? []).map((x) => <option key={x}>{x}</option>)}</select>;
    }
    return <input aria-label={PROPERTY_LABELS[property]} className="text-input" value={safeValue} onChange={(e) => setStyle(property, e.target.value)} placeholder="CSS value" />;
  };

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand-mark">V<span>•</span></div>
      <div className="brand-copy"><strong>Vexel</strong><span>VISUAL EDITOR</span></div>
      <div className="spacer" />
      <button className="icon-button" title="Undo latest change" disabled={changeState.count === 0} onClick={() => sendToPage({ type: "VEXEL_UNDO" })}><Undo2 size={16} /></button>
      <button className="icon-button" title="Reset preview changes" disabled={changeState.count === 0} onClick={() => sendToPage({ type: "VEXEL_RESET" })}><RotateCcw size={15} /></button>
    </header>
    <div className="page-pill"><span className="live-dot" /> <span title={pageUrl}>{hostname}</span><span className="pill-end">PREVIEW</span></div>
    <main>
      <div className="hero">
        <div className="eyebrow"><WandSparkles size={14} /> VISUAL PLAYGROUND</div>
        <h1>Shape your<br/><em>web experience.</em></h1>
        <p>Select any visible element. Make changes live. Keep the original source untouched.</p>
        <button className={pickerActive ? "pick-button picking" : "pick-button"} onClick={startPicker}><MousePointer2 size={16}/>{pickerActive ? "Pick mode active…" : "Pick element"}<span>↗</span></button>
        <div className="status-line"><span className={selected ? "status-icon good" : "status-icon"}>{selected ? <Check size={12}/> : <CircleHelp size={12}/>}</span>{status}</div>
      </div>
      {!selected ? <section className="empty-state">
        <div className="target-art"><div className="target-square"/><div className="target-dot"/><MousePointer2 className="target-cursor" size={26}/></div>
        <strong>Your canvas is waiting</strong>
        <p>Hit <b>Pick element</b>, then click a heading, button, card or any visible UI element on the page.</p>
        <div className="hint-row"><span>01</span> Hover to preview the target</div><div className="hint-row"><span>02</span> Click to select it</div><div className="hint-row"><span>03</span> Tweak the properties here</div>
      </section> : <>
        <section className="selected-card">
          <div className="selected-card-head"><span className="tiny-label">SELECTED ELEMENT</span><span className="tag-name">&lt;{selected.tagName}&gt;</span></div>
          <div className="selector-text">{selected.selector}</div>
          <div className="element-size">{selected.rect.width} × {selected.rect.height}px</div>
          <label className="field-label" htmlFor="element-text">Text content</label>
          <textarea id="element-text" className="text-area" rows={3} value={textDraft} onChange={(e) => setTextDraft(e.target.value)} />
          <button className="apply-text-button" onClick={updateText}><Check size={14}/> Apply text</button>
        </section>
        <section className="property-list">
          {STYLE_SECTIONS.map((section) => <div className="property-section" key={section.title}>
            <button className="section-toggle" onClick={() => setOpenSections((current) => current.includes(section.title) ? current.filter((item) => item !== section.title) : [...current, section.title])}>
              <span>{section.title}</span><ChevronDown className={openSections.includes(section.title) ? "" : "collapsed"} size={15}/>
            </button>
            {openSections.includes(section.title) && <div className="property-grid">
              {section.properties.map((property) => <label className="property-field" key={property}><span>{PROPERTY_LABELS[property]}</span>{styleInput(property, selected.styles[property])}</label>)}
            </div>}
          </div>)}
        </section>
      </>}
    </main>
    <footer className="footer">
      <div><span className="change-count">{changeState.count}</span> pending preview edits</div>
      <div className="footer-note"><span /> Local preview only</div>
    </footer>
  </div>;
}
