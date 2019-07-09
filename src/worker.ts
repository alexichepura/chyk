interface ExtendableEvent extends Event {
  waitUntil(f: any): void;
}
export interface FetchEvent extends ExtendableEvent {
  readonly clientId: string;
  readonly preloadResponse: Promise<any>;
  readonly request: Request;
  readonly resultingClientId: string;
  readonly targetClientId: string;
  respondWith(r: Response | Promise<Response>): void;
}
interface ServiceWorkerGlobalScope {
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void;
}

export const sw_global: ServiceWorkerGlobalScope = global as any;
