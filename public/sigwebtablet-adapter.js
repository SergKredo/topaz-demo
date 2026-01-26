(function () {
  // Adapter to provide the newer-style SigWebTablet API expected by the demo.
  // It wraps the older function-style SigWebTablet.js (Topaz v1.0.4.0).

  if (typeof window === 'undefined') return;

  if (window.SigWebTablet && typeof window.SigWebTablet.startSignature === 'function') {
    return;
  }

  function assertFn(name) {
    if (typeof window[name] !== 'function') {
      throw new Error(name + ' is not available (SigWebTablet.js not loaded?)');
    }
    return window[name];
  }

  window.SigWebTablet = {
    openTablet: function () {
      // Default mode 0 (as in docs /OpenTablet/0)
      var OpenTablet = assertFn('OpenTablet');
      return OpenTablet(0);
    },

    startSignature: function () {
      // Older SDK pattern: OpenTablet(0) + TabletState/1.
      var OpenTablet = assertFn('OpenTablet');
      var SetTabletState = assertFn('SetTabletState');
      OpenTablet(0);
      // Signature: SetTabletState(v, ctx, tv)
      return SetTabletState(1, null, null);
    },

    stopSignature: function () {
      // Stop capture without closing the tablet session.
      var SetTabletState = assertFn('SetTabletState');
      return SetTabletState(0, null, null);
    },

    closeTablet: function () {
      var CloseTablet = assertFn('CloseTablet');
      return CloseTablet();
    },

    clearSignature: function () {
      var ClearTablet = assertFn('ClearTablet');
      return ClearTablet();
    },

    getSigString: function () {
      var GetSigString = assertFn('GetSigString');
      return GetSigString();
    },

    setSigString: function (sigString) {
      var SetSigString = assertFn('SetSigString');
      return SetSigString(sigString, null);
    },

    getSignatureImageBase64: function () {
      var GetSigImageB64 = assertFn('GetSigImageB64');
      return new Promise(function (resolve, reject) {
        try {
          GetSigImageB64(function (b64) {
            resolve(b64);
          });
        } catch (e) {
          reject(e);
        }
      });
    },

    getVersion: function () {
      var GetVersionString = assertFn('GetVersionString');
      return GetVersionString();
    },

    tabletConnectQuery: function () {
      var TabletConnectQuery = assertFn('TabletConnectQuery');
      return TabletConnectQuery();
    },

    getTabletState: function () {
      var GetTabletState = assertFn('GetTabletState');
      return GetTabletState();
    },

    getTabletModelNumber: function () {
      var TabletModelNumber = assertFn('TabletModelNumber');
      return TabletModelNumber();
    },

    getTabletSerialNumber: function () {
      var TabletSerialNumber = assertFn('TabletSerialNumber');
      return TabletSerialNumber();
    },

    getFirmwareRevision: function () {
      var GetFirmwareRevision = assertFn('GetFirmwareRevision');
      return GetFirmwareRevision();
    },

    getTotalPoints: function () {
      var NumberOfTabletPoints = assertFn('NumberOfTabletPoints');
      return NumberOfTabletPoints();
    },

    getNumberOfStrokes: function () {
      var GetNumberOfStrokes = assertFn('GetNumberOfStrokes');
      return GetNumberOfStrokes();
    }
  };
})();
