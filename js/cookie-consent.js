/*
 * Einfacher Cookie-Consent-Banner.
 * Die Seite selbst setzt aktuell KEINE Analyse- oder Marketing-Cookies,
 * nur technisch notwendige (z. B. Session-Cookie im Admin-Bereich).
 * Der Banner dokumentiert die Einwilligung dennoch DSGVO-konform und
 * ist vorbereitet, um später z. B. ein Analyse-Tool nachzuladen.
 */
(function () {
  var STORAGE_KEY = "gebaerden-abc-cookie-consent";

  function getConsent() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch (e) {
      return null;
    }
  }

  function setConsent(value) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ value: value, date: new Date().toISOString() })
    );
  }

  function loadOptionalScripts() {
    // Platzhalter: Hier könnte z. B. ein datenschutzfreundliches
    // Analyse-Tool (z. B. Matomo, selbst gehostet) geladen werden,
    // sobald der Nutzer aktiv zugestimmt hat.
    // Beispiel:
    // var s = document.createElement('script');
    // s.src = 'https://analytics.example.com/matomo.js';
    // document.body.appendChild(s);
  }

  document.addEventListener("DOMContentLoaded", function () {
    var banner = document.getElementById("cookie-banner");
    if (!banner) return;

    var consent = getConsent();

    if (!consent) {
      banner.classList.add("visible");
    } else if (consent.value === "all") {
      loadOptionalScripts();
    }

    var acceptAllBtn = document.getElementById("cookie-accept-all");
    var essentialOnlyBtn = document.getElementById("cookie-essential-only");

    if (acceptAllBtn) {
      acceptAllBtn.addEventListener("click", function () {
        setConsent("all");
        loadOptionalScripts();
        banner.classList.remove("visible");
      });
    }
    if (essentialOnlyBtn) {
      essentialOnlyBtn.addEventListener("click", function () {
        setConsent("essential");
        banner.classList.remove("visible");
      });
    }
  });
})();
