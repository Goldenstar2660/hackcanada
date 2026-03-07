declare namespace JSX {
  interface Element {
    readonly __brand?: "binbuddy-jsx-element";
  }

  interface ElementChildrenAttribute {
    children: unknown;
  }

  interface IntrinsicElements {
    [elementName: string]: Record<string, unknown>;
  }
}