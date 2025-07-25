// Type declarations for test globals
declare global {
  interface GlobalThis {
    document: Document;
    window: Window & typeof globalThis;
    navigator: Navigator;
    HTMLElement: typeof HTMLElement;
    Element: typeof Element;
    Node: typeof Node;
    Event: typeof Event;
    CustomEvent: typeof CustomEvent;
    IntersectionObserver: typeof IntersectionObserver;
    matchMedia: typeof matchMedia;
    requestIdleCallback: typeof requestIdleCallback;
    cancelIdleCallback: typeof cancelIdleCallback;
    React: any;
    ReactDOM: any;
  }
}

// Type declaration for writable global object in test environment
type WritableGlobal = {
  document: Document;
  window: Window & typeof globalThis;
  navigator: Navigator;
  [key: string]: any;
};

declare const global: NodeJS.Global & WritableGlobal;

export {};