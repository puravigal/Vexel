import type { EditableStyleProperty, SelectedElement, VisualChange } from "../core/change-model";
import { makeId } from "../core/change-model";

const VEXEL_ID = "data-vexel-target";
const EDITABLE_PROPERTIES: EditableStyleProperty[] = [
  "color", "backgroundColor", "fontFamily", "fontSize", "fontWeight", "fontStyle", "lineHeight", "textAlign",
  "width", "height", "minWidth", "maxWidth", "minHeight", "maxHeight",
  "marginTop", "marginRight", "marginBottom", "marginLeft", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
  "borderColor", "borderWidth", "borderStyle", "borderRadius", "display", "justifyContent", "alignItems", "gap"
];
const originalStyles = new Map<string, Partial<Record<EditableStyleProperty, string>>>();
const originalTexts = new Map<string, string>();
const changes: VisualChange[] = [];
let pickerActive = false;
let selectedElement: HTMLElement | null = null;
let hoverElement: HTMLElement | null = null;
let overlay: HTMLDivElement | null = null;
let sourceTextSnapshot: string | null = null;

function selectorFor(el: HTMLElement): string {
  const parts: string[] = [];
  let node: HTMLElement | null = el;
  while (node && node !== document.body && parts.length < 5) {
    let part = node.tagName.toLowerCase();
    if (node.id) { parts.unshift(`${part}#${CSS.escape(node.id)}`); break; }
    const classes = typeof node.className === "string" ? node.className.trim().split(/\\s+/).filter(Boolean).slice(0, 2) : [];
    part += classes.map((name) => `.${CSS.escape(name)}`).join("");
    const parent = node.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter((sibling) => sibling.tagName === node?.tagName);
      if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
    }
    parts.unshift(part);
    node = node.parentElement;
  }
  return parts.join(" > ") || el.tagName.toLowerCase();
}
function ensureTargetId(el: HTMLElement): string {
  if (!el.dataset.vexelTarget) el.dataset.vexelTarget = makeId();
  return el.dataset.vexelTarget;
}
function sendSelected(el: HTMLElement): void {
  selectedElement = el;
  const targetId = ensureTargetId(el);
  const computed = getComputedStyle(el);
  const styles: Partial<Record<EditableStyleProperty, string>> = {};
  for (const property of EDITABLE_PROPERTIES) styles[property] = computed[property];
  const rect = el.getBoundingClientRect();
  if (!originalStyles.has(targetId)) {
    const original: Partial<Record<EditableStyleProperty, string>> = {};
    for (const property of EDITABLE_PROPERTIES) original[property] = el.style[property];
    originalStyles.set(targetId, original);
    originalTexts.set(targetId, el.textContent ?? "");
  }
  const element: SelectedElement = {
    targetId, tagName: el.tagName.toLowerCase(), selector: selectorFor(el),
    text: el.innerText?.slice(0, 1200) ?? el.textContent?.slice(0, 1200) ?? "",
    styles, rect: { width: Math.round(rect.width), height: Math.round(rect.height), x: Math.round(rect.x), y: Math.round(rect.y) }
  };
  chrome.runtime.sendMessage({ type: "VEXEL_ELEMENT_SELECTED", element }).catch(() => undefined);
  renderOverlay(el, "selected");
}
function renderOverlay(el: HTMLElement, mode: "hover" | "selected"): void {
  if (!overlay || !overlay.isConnected) {
    overlay = document.createElement("div");
    overlay.id = "vexel-selection-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.style.cssText = "position:fixed;pointer-events:none;z-index:2147483647;box-sizing:border-box;transition:all 40ms linear;";
    (document.documentElement || document.body).appendChild(overlay);
  }
  const rect = el.getBoundingClientRect();
  Object.assign(overlay.style, {
    left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`,
    border: mode === "selected" ? "2px solid #7c5cff" : "2px solid #32d6c5",
    background: mode === "selected" ? "rgba(124,92,255,.06)" : "rgba(50,214,197,.06)"
  });
}
function onPointerMove(event: PointerEvent): void {
  if (!pickerActive) return;
  const target = event.target;
  if (!(target instanceof HTMLElement) || target.id === "vexel-selection-overlay") return;
  hoverElement = target;
  renderOverlay(target, "hover");
}
function onPickerClick(event: MouseEvent): void {
  if (!pickerActive) return;
  const target = event.target;
  if (!(target instanceof HTMLElement) || target.id === "vexel-selection-overlay") return;
  event.preventDefault();
  event.stopImmediatePropagation();
  event.stopPropagation();
  pickerActive = false;
  document.removeEventListener("pointermove", onPointerMove, true);
  document.removeEventListener("click", onPickerClick, true);
  document.getElementById("vexel-picker-style")?.remove();
  sendSelected(target);
  chrome.runtime.sendMessage({ type: "VEXEL_PICKER_STOPPED" }).catch(() => undefined);
}
function startPicker(): void {
  pickerActive = true;
  document.addEventListener("pointermove", onPointerMove, true);
  document.addEventListener("click", onPickerClick, true);
  let style = document.getElementById("vexel-picker-style") as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = "vexel-picker-style";
    (document.head || document.documentElement).appendChild(style);
  }
  style.textContent = "html,html *{cursor:crosshair!important}";
}
function stopPicker(): void {
  pickerActive = false;
  document.removeEventListener("pointermove", onPointerMove, true);
  document.removeEventListener("click", onPickerClick, true);
  document.getElementById("vexel-picker-style")?.remove();
  overlay?.remove();
  overlay = null;
}
function targetFor(id: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[${VEXEL_ID}="${CSS.escape(id)}"]`);
}
function applyStyle(targetId: string, property: EditableStyleProperty, value: string): void {
  const el = targetFor(targetId);
  if (!el) return;
  const previousValue = el.style[property];
  el.style[property] = value;
  changes.push({ id: makeId(), targetId, operation: "set-style", property, previousValue, value });
  chrome.runtime.sendMessage({ type: "VEXEL_CHANGE_APPLIED", changeCount: changes.length }).catch(() => undefined);
  if (el === selectedElement) sendSelected(el);
}
function applyText(targetId: string, value: string): void {
  const el = targetFor(targetId);
  if (!el) return;
  // Container replacement removes descendants; limit text editing to leaf-like elements as a safety guard.
  if (el.children.length > 0) {
    chrome.runtime.sendMessage({ type: "VEXEL_ERROR", message: "For safety, text can only be edited on elements without child elements. Select the text or leaf element instead." }).catch(() => undefined);
    return;
  }
  const previousValue = el.textContent ?? "";
  el.textContent = value;
  changes.push({ id: makeId(), targetId, operation: "set-text", previousValue, value });
  chrome.runtime.sendMessage({ type: "VEXEL_CHANGE_APPLIED", changeCount: changes.length }).catch(() => undefined);
  if (el === selectedElement) sendSelected(el);
}
function undo(): void {
  const change = changes.pop();
  if (!change) return;
  const el = targetFor(change.targetId);
  if (!el) return;
  if (change.operation === "set-style") el.style[change.property] = change.previousValue;
  else el.textContent = change.previousValue;
  chrome.runtime.sendMessage({ type: "VEXEL_CHANGE_APPLIED", changeCount: changes.length }).catch(() => undefined);
  if (el === selectedElement) sendSelected(el);
}
function reset(): void {
  for (const [targetId, original] of originalStyles) {
    const el = targetFor(targetId);
    if (!el) continue;
    for (const property of EDITABLE_PROPERTIES) {
      const cssName = property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
      const value = original[property] ?? "";
      if (value) el.style[property] = value;
      else el.style.removeProperty(cssName);
    }
    const text = originalTexts.get(targetId);
    if (text !== undefined && el.children.length === 0) el.textContent = text;
  }
  changes.length = 0;
  originalStyles.clear();
  originalTexts.clear();
  chrome.runtime.sendMessage({ type: "VEXEL_RESET_DONE" }).catch(() => undefined);
  if (selectedElement?.isConnected) sendSelected(selectedElement);
}
chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "VEXEL_START_PICKER") startPicker();
  if (message?.type === "VEXEL_STOP_PICKER") stopPicker();
  if (message?.type === "VEXEL_APPLY_STYLE" && typeof message.targetId === "string" && typeof message.property === "string" && typeof message.value === "string") {
    if ((EDITABLE_PROPERTIES as string[]).includes(message.property)) applyStyle(message.targetId, message.property as EditableStyleProperty, message.value);
  }
  if (message?.type === "VEXEL_APPLY_TEXT" && typeof message.targetId === "string" && typeof message.value === "string") applyText(message.targetId, message.value);
  if (message?.type === "VEXEL_UNDO") undo();
  if (message?.type === "VEXEL_RESET") reset();
});
window.addEventListener("scroll", () => {
  if (selectedElement?.isConnected) renderOverlay(selectedElement, "selected");
  else if (hoverElement?.isConnected && pickerActive) renderOverlay(hoverElement, "hover");
}, true);
window.addEventListener("resize", () => { if (selectedElement?.isConnected) renderOverlay(selectedElement, "selected"); }, true);
