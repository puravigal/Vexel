export type EditableStyleProperty =
  | "color" | "backgroundColor" | "fontFamily" | "fontSize" | "fontWeight" | "fontStyle" | "lineHeight" | "textAlign"
  | "width" | "height" | "minWidth" | "maxWidth" | "minHeight" | "maxHeight"
  | "marginTop" | "marginRight" | "marginBottom" | "marginLeft"
  | "paddingTop" | "paddingRight" | "paddingBottom" | "paddingLeft"
  | "borderColor" | "borderWidth" | "borderStyle" | "borderRadius"
  | "display" | "justifyContent" | "alignItems" | "gap";

export type VisualChange =
  | { id: string; targetId: string; operation: "set-style"; property: EditableStyleProperty; previousValue: string; value: string }
  | { id: string; targetId: string; operation: "set-text"; previousValue: string; value: string };

export type SelectedElement = {
  targetId: string;
  tagName: string;
  selector: string;
  text: string;
  styles: Partial<Record<EditableStyleProperty, string>>;
  rect: { width: number; height: number; x: number; y: number };
};

export const STYLE_SECTIONS: { title: string; properties: EditableStyleProperty[] }[] = [
  { title: "Typography", properties: ["color", "fontFamily", "fontSize", "fontWeight", "fontStyle", "lineHeight", "textAlign"] },
  { title: "Background & border", properties: ["backgroundColor", "borderColor", "borderWidth", "borderStyle", "borderRadius"] },
  { title: "Dimensions", properties: ["width", "height", "minWidth", "maxWidth", "minHeight", "maxHeight"] },
  { title: "Spacing", properties: ["marginTop", "marginRight", "marginBottom", "marginLeft", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "gap"] },
  { title: "Layout", properties: ["display", "justifyContent", "alignItems"] }
];

export const PROPERTY_LABELS: Record<EditableStyleProperty, string> = {
  color: "Text color", backgroundColor: "Background", fontFamily: "Font family", fontSize: "Font size",
  fontWeight: "Font weight", fontStyle: "Font style", lineHeight: "Line height", textAlign: "Text align",
  width: "Width", height: "Height", minWidth: "Min width", maxWidth: "Max width", minHeight: "Min height",
  maxHeight: "Max height", marginTop: "Margin top", marginRight: "Margin right", marginBottom: "Margin bottom",
  marginLeft: "Margin left", paddingTop: "Padding top", paddingRight: "Padding right", paddingBottom: "Padding bottom",
  paddingLeft: "Padding left", borderColor: "Border color", borderWidth: "Border width", borderStyle: "Border style",
  borderRadius: "Border radius", display: "Display", justifyContent: "Justify content", alignItems: "Align items", gap: "Gap"
};

export function makeId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `vexel-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
