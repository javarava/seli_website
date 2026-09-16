/**
 * Seli cookie consent banner.
 *
 * Injects the consent banner into the page and remembers the visitor's
 * choice (accept / decline / close) in `sessionStorage`, so the banner is
 * shown only once per browsing session instead of on every page view.
 *
 * Consent state is intentionally session-scoped: closing a tab or opening a
 * new one resets the choice, which keeps the banner in line with the way our
 * own session non-essential cookies behave.
 */
(function () {
  'use strict';

  /* Storage key + allowed values shared between the banner and any future
     consent-gated scripts (analytics, marketing pixels, etc.). */
  var KEY = 'seli_cookie_consent';
  var ACCEPTED = 'accepted';
  var DECLINED = 'declined';

  /** Host page path is used only for labelling; choice logic is per-session. */
  var PAGE_COOKIE_LINK = 'cookie-policy.html';

  /* ------------------------------------------------------------------ */
  /* Build the banner DOM instead of shipping static markup on every page,  */
  /* so there is no visible "flash" of the bar before JavaScript runs.      */
  /* ------------------------------------------------------------------ */
  function buildBanner() {
    var banner = document.createElement('div');
    banner.id = 'seliCookieBanner';
    banner.className = 'seli-cookie-banner is-hidden';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-live', 'polite');
    banner.setAttribute('aria-label', 'Cookie consent');
    banner.setAttribute('aria-describedby', 'seliCookieText');

    var text = document.createElement('div');
    text.className = 'seli-cookie-text';
    text.id = 'seliCookieText';
    text.innerHTML =
      '<strong>We value your privacy</strong>. We use cookies to keep the ' +
      'site secure and measure performance, and — with your consent — to ' +
      'personalise your experience. Learn more in our ' +
      '<a href="' + PAGE_COOKIE_LINK + '">Cookie Policy</a>.';

    var actions = document.createElement('div');
    actions.className = 'seli-cookie-actions';

    var acceptBtn = document.createElement('button');
    acceptBtn.type = 'button';
    acceptBtn.className = 'btn btn-cta-white';
    acceptBtn.textContent = 'Accept all cookies';
    acceptBtn.addEventListener('click', function () {
      setConsent(ACCEPTED);
      hideBanner(banner);
    });

    var declineBtn = document.createElement('button');
    declineBtn.type = 'button';
    declineBtn.className = 'btn btn-cta-outline';
    declineBtn.textContent = 'Decline';
    declineBtn.addEventListener('click', function () {
      setConsent(DECLINED);
      hideBanner(banner);
    });

    /* Small dismiss (X) button — closing the bar counts as a decline so the
       banner does not nag the visitor again during the session. */
    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'seli-cookie-close';
    closeBtn.setAttribute('aria-label', 'Dismiss cookie notice');
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', function () {
      setConsent(DECLINED);
      hideBanner(banner);
    });

    actions.appendChild(acceptBtn);
    actions.appendChild(declineBtn);
    banner.appendChild(text);
    banner.appendChild(actions);
    banner.appendChild(closeBtn);
    document.body.appendChild(banner);
    return banner;
  }

  /* ------------------------------------------------------------------ */
  /* Persist the choice for the current session.                          */
  /* ------------------------------------------------------------------ */
  function setConsent(value) {
    try {
      sessionStorage.setItem(KEY, value);
    } catch (e) {
      /* Storage may be unavailable (private browsing); the in-memory flag
         still keeps the banner hidden for this page view. */
      window.__seliCookieConsent = value;
    }
    applyConsent(value);
  }

  /** Reads the current session consent (from sessionStorage or fallback). */
  function getConsent() {
    var value =
      window.__seliCookieConsent ||
      (function () {
        try {
          return sessionStorage.getItem(KEY);
        } catch (e) {
          return null;
        }
      })();
    return value === ACCEPTED || value === DECLINED ? value : null;
  }

  /**
   * Applies the consent decision. Non-essential scripts can read
   * `window.__seliConsentReady` / `getConsent()` to gate themselves; today
   * the site sets no third-party cookies, so this mainly keeps the state in
   * one well-known place for future integrations.
   */
  function applyConsent(value) {
    window.__seliCookieConsent = value;
    if (window.dispatchEvent) {
      window.dispatchEvent(
        new CustomEvent('seli:cookieChange', {
          detail: { consent: value },
        })
      );
    }
  }

  /** Fades/dismisses the banner out of the layout. */
  function hideBanner(banner) {
    banner.classList.add('is-hidden');
  }

  /* ------------------------------------------------------------------ */
  /* Boot                                                                 */
  /* ------------------------------------------------------------------ */
  function init() {
    var banner = buildBanner();
    var consent = getConsent();

    if (consent) {
      /* A choice already exists for this session — keep the banner hidden.
         Recreate the global flag in case sessionStorage was the source. */
      applyConsent(consent);
      return;
    }

    /* First visit in this session: reveal the bar on the next frame so the
       entrance animation plays instead of flashing in mid-layout. */
    requestAnimationFrame(function () {
      banner.classList.remove('is-hidden');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();