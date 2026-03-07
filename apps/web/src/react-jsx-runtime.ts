export const Fragment = Symbol.for("binbuddy.fragment");

export namespace JSX {
  export interface Element {
    readonly __brand?: "binbuddy-jsx-element";
    readonly type?: unknown;
    readonly props?: Record<string, unknown>;
    readonly key?: string | null;
  }

  export interface ElementChildrenAttribute {
    children: unknown;
  }

  export interface IntrinsicElements {
    [elementName: string]: Record<string, unknown>;
  }
}

type JsxNodeType = string | ((props: Record<string, unknown>) => JSX.Element);

function createElement(
  type: JsxNodeType,
  props: Record<string, unknown>,
  key?: string
): JSX.Element {
  return {
    __brand: "binbuddy-jsx-element",
    type,
    props,
    key: key ?? null
  } as unknown as JSX.Element;
}

export function jsx(
  type: JsxNodeType,
  props: Record<string, unknown>,
  key?: string
): JSX.Element {
  return createElement(type, props, key);
}

export function jsxs(
  type: JsxNodeType,
  props: Record<string, unknown>,
  key?: string
): JSX.Element {
  return createElement(type, props, key);
}