export {};

declare global {
  type MaybePromise<T> = T | Promise<T>;

  interface SigWebTabletApi {
    openTablet?: () => MaybePromise<unknown>;
    startSignature?: () => MaybePromise<unknown>;
    stopSignature?: () => MaybePromise<unknown>;
    closeTablet?: () => MaybePromise<unknown>;
    clearSignature?: () => MaybePromise<unknown>;
    getSignatureImageBase64?: () => MaybePromise<string>;
    getVersion?: () => MaybePromise<string>;
    tabletConnectQuery?: () => MaybePromise<string>;
    getTabletState?: () => MaybePromise<string>;
    getTabletModelNumber?: () => MaybePromise<string>;
    getTabletSerialNumber?: () => MaybePromise<string>;
    getFirmwareRevision?: () => MaybePromise<string>;
    getSigString?: () => MaybePromise<string>;
    setSigString?: (sigString: string) => MaybePromise<unknown>;
    getTotalPoints?: () => MaybePromise<string>;
    getNumberOfStrokes?: () => MaybePromise<string>;
    // Other methods exist, but we only type what we use in the demo.
  }

  interface Window {
    SigWebTablet?: SigWebTabletApi;
  }

  const SigWebTablet: SigWebTabletApi;
}
