/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

// Client device features and capabilities.

declare var window;

let IS_MOBILE,
  IS_TOUCH,
  IS_CHROME,
  IS_ANDROID,
  IS_IPAD,
  IS_IOS,
  IS_FIREFOX,
  IS_SAFARI,
  IS_MACOS,
  isMobile,
  get_browser,
  get_mobile;

if (typeof window != "undefined" && typeof navigator != "undefined") {
  // In a web browser.
  const navigator = window.navigator;
  let { $ } = window;

  isMobile = {
    Android() {
      return !!(navigator != undefined
        ? navigator.userAgent.match(/Android/i)
        : undefined);
    },
    BlackBerry() {
      return !!(navigator != undefined
        ? navigator.userAgent.match(/BlackBerry/i)
        : undefined);
    },
    iOS() {
      return !!(navigator != undefined
        ? navigator.userAgent.match(/iPhone|iPad|iPod/i)
        : undefined);
    },
    Windows() {
      return !!(navigator != undefined
        ? navigator.userAgent.match(/IEMobile/i)
        : undefined);
    },
    tablet() {
      return (
        !!(navigator != undefined
          ? navigator.userAgent.match(/iPad/i)
          : undefined) ||
        !!(navigator != undefined
          ? navigator.userAgent.match(/Tablet/i)
          : undefined)
      );
    },
    any() {
      return (
        isMobile.Android() ||
        isMobile.BlackBerry() ||
        isMobile.iOS() ||
        isMobile.Windows()
      );
    },
  };

  if ($ == undefined) {
    // don't even have jQuery -- obviously won't have any features -- this happens, e.g., in node.js
    IS_MOBILE = false;
    $ = {};
  }

  if ($.browser == undefined) {
    $.browser = {};
  }

  let user_agent: string = "";
  if (navigator) {
    user_agent = navigator.userAgent.toLowerCase();
  }

  $.browser.chrome = /chrom(e|ium)/.test(user_agent);

  $.browser.opera =
    (!!window.opr && !!window.opr.addons) ||
    !!window.opera ||
    user_agent.indexOf(" OPR/") >= 0;
  $.browser.firefox = !$.browser.chrome && user_agent.indexOf("firefox") > 0;
  $.browser.safari = !$.browser.chrome && user_agent.indexOf("safari") > 0;
  $.browser.ie = !$.browser.chrome && user_agent.indexOf("windows") > 0;
  $.browser.blink = ($.browser.chrome || $.browser.opera) && !!window.CSS;
  $.browser.edge = /edge\/\d./i.test(user_agent);

  IS_SAFARI = !!$.browser?.safari;

  IS_FIREFOX = !!$.browser?.firefox;

  IS_CHROME = !!$.browser?.chrome;

  IS_MACOS = (navigator.platform ?? "").toLowerCase().includes("mac");

  IS_ANDROID = isMobile.Android();

  get_browser = function () {
    for (const k in $.browser) {
      const v = $.browser[k];
      if (v) {
        return k;
      }
    }
    return undefined;
  };

  get_mobile = function () {
    for (const k in isMobile) {
      const v = isMobile[k];
      if (v()) {
        return k;
      }
    }
    return undefined;
  };

  // MOBILE for us means "responsive skinny" and on a mobile device.
  // On iPad, where the screen is wide, we do not enable MOBILE, since that
  // currently disables things like chat completely.
  // See https://github.com/sagemathinc/cocalc/issues/1392
  IS_MOBILE = isMobile.any();

  // See https://stackoverflow.com/questions/56578799/tell-ipados-from-macos-on-the-web
  const isIpadOS =
    typeof navigator !== "undefined" &&
    navigator?.userAgent?.match(/Mac/) &&
    navigator.maxTouchPoints &&
    navigator.maxTouchPoints > 2;

  IS_IOS = isMobile.iOS();

  // NOTE: iOS is the operating system of ipads and iPadOS is the operating system of ipads.
  IS_IPAD =
    !IS_IOS &&
    (isIpadOS ||
      !!(typeof navigator !== "undefined" && navigator !== null
        ? navigator.userAgent.match(/iPad/i)
        : undefined));

  // IS_TOUCH for us means multitouch tablet or mobile, the point being that it
  // is mostly *only* touch, so not something like a Chromebook with a touch screen.
  IS_TOUCH = isMobile.tablet() || IS_MOBILE || isMobile.any() || IS_IPAD;

} else {
  // Backend.

  // TODO: maybe provide the full api?
  IS_MOBILE = IS_TOUCH = false;
}

export {
  IS_MOBILE,
  IS_TOUCH,
  IS_IPAD,
  IS_IOS,
  IS_SAFARI,
  IS_FIREFOX,
  IS_CHROME,
  IS_ANDROID,
  IS_MACOS,
  isMobile,
  get_browser,
  get_mobile,
};
