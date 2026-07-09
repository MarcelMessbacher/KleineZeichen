// =========================================================
// Bestellformular: Berechnung, Validierung, Firebase-Speicherung
// =========================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  doc,
  collection,
  addDoc,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  firebaseConfig,
  ORDERS_COLLECTION,
  EMAIL_EINWILLIGUNG_COLLECTION,
  COUNTERS_COLLECTION,
  MAIL_COLLECTION,
  MAIL_TEMPLATE_BESTELLBESTAETIGUNG
} from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const EINZELPREIS = 12.90;
const VERSAND = 2.90; // Versandkosten pro Paket/Karton innerhalb Deutschlands
const MAX_BUECHER_PRO_KARTON = 5; // ab 6, 11, 16 ... Büchern kommt ein weiteres Paket dazu

function berechneVersand(menge) {
  const pakete = Math.ceil(menge / MAX_BUECHER_PRO_KARTON);
  return { pakete, versandkosten: pakete * VERSAND };
}

const eur = (n) => n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });

// ---------------------------------------------------------------------
// Fortlaufende IDs (1, 2, 3, ...) statt zufälliger Firestore-Doc-IDs
// ---------------------------------------------------------------------
async function speichereMitFortlaufenderId(collectionName, datenOderFactory) {
  const counterRef = doc(db, COUNTERS_COLLECTION, collectionName);

  return await runTransaction(db, async (transaction) => {
    const counterSnap = await transaction.get(counterRef);
    const aktuellerWert = counterSnap.exists() ? counterSnap.data().wert || 0 : 0;
    const neueId = aktuellerWert + 1;

    transaction.set(counterRef, { wert: neueId });

    // datenOderFactory kann entweder ein fertiges Objekt sein, oder eine
    // Funktion, die die neue ID übergeben bekommt (z. B. um daraus die
    // Bestellnummer abzuleiten, bevor das Dokument geschrieben wird).
    const daten =
      typeof datenOderFactory === "function" ? datenOderFactory(neueId) : datenOderFactory;

    const neuerDocRef = doc(db, collectionName, String(neueId));
    transaction.set(neuerDocRef, { id: neueId, ...daten });

    return neueId;
  });
}

// Bestellnummer aus der fortlaufenden ID ableiten: B0000001, B0000002, ...
function formatBestellnummer(id) {
  return `B${String(id).padStart(7, "0")}`;
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("order-form");
  if (!form) return;

  const mengeInput = document.getElementById("menge");
  const summaryQty = document.getElementById("summary-qty");
  const summaryItemTotal = document.getElementById("summary-item-total");
  const summaryShipping = document.getElementById("summary-shipping");
  const summaryTotal = document.getElementById("summary-total");

  const rechnungGleich = document.getElementById("rechnung_gleich");
  const rechnungFelder = document.getElementById("rechnung-felder");

  const zahlungsRadios = form.querySelectorAll('input[name="zahlungsart"]');
  const ueberweisungDetails = document.getElementById("ueberweisung-details");

  const formAlert = document.getElementById("form-alert");
  const submitBtn = form.querySelector('button[type="submit"]');

  function updateSummary() {
  const menge = Math.max(1, Math.min(20, parseInt(mengeInput.value, 10) || 1));
  mengeInput.value = menge;
  const itemTotal = menge * EINZELPREIS;
  const { pakete, versandkosten } = berechneVersand(menge);
  const total = itemTotal + versandkosten;
  summaryQty.textContent = `${menge}× Gebärden-ABC`;
  summaryItemTotal.textContent = eur(itemTotal);
  summaryShipping.textContent =
    pakete > 1 ? `${eur(versandkosten)} (${pakete}× Paket)` : eur(versandkosten);
  summaryTotal.textContent = eur(total);
}

  mengeInput.addEventListener("input", updateSummary);
  updateSummary();

  function toggleRechnungFelder() {
    const zeigen = !rechnungGleich.checked;
    rechnungFelder.style.display = zeigen ? "block" : "none";
    rechnungFelder.querySelectorAll("input").forEach((el) => {
      el.required = zeigen;
    });
  }
  rechnungGleich.addEventListener("change", toggleRechnungFelder);
  toggleRechnungFelder();

  function toggleZahlungsdetails() {
    const gewaehlt = form.querySelector('input[name="zahlungsart"]:checked').value;
    ueberweisungDetails.style.display = gewaehlt === "ueberweisung" ? "block" : "none";
  }
  zahlungsRadios.forEach((r) => r.addEventListener("change", toggleZahlungsdetails));
  toggleZahlungsdetails();

  function zeigeFeldFehler(feld, zeigen) {
    const wrapper = feld.closest(".field");
    if (!wrapper) return;
    wrapper.classList.toggle("has-error", zeigen);
  }

  function validiereFormular() {
    let gueltig = true;
    const pflichtfelder = form.querySelectorAll("[required]");
    pflichtfelder.forEach((feld) => {
      let feldGueltig = true;
      if (feld.type === "checkbox") {
        feldGueltig = feld.checked;
      } else {
        feldGueltig = feld.value.trim() !== "" && feld.checkValidity();
      }
      if (!feldGueltig) gueltig = false;
      if (feld.type !== "checkbox") zeigeFeldFehler(feld, !feldGueltig);
    });
    return gueltig;
  }

  function baueBestellObjekt() {
  const gleicheAdresse = rechnungGleich.checked;
  const zahlungsart = form.querySelector('input[name="zahlungsart"]:checked').value;
  const menge = parseInt(mengeInput.value, 10) || 1;
  const { pakete, versandkosten } = berechneVersand(menge);
  const gesamt = menge * EINZELPREIS + versandkosten;

  return {
    erstelltAm: serverTimestamp(),
    status: "neu",
    zahlungsstatus: "offen",
    zahlungsart,
    menge,
    einzelpreis: EINZELPREIS,
    versandpakete: pakete,
    versandkosten,
    gesamtbetrag: Math.round(gesamt * 100) / 100,

    // Kontaktdaten – jeder Wert eine eigene Spalte
    anrede: form.anrede.value,
    vorname: form.vorname.value.trim(),
    nachname: form.nachname.value.trim(),
    email: form.email.value.trim(),
    telefon: form.telefon.value.trim(),

    // Lieferadresse
    lieferungStrasse: form.lieferung_strasse.value.trim(),
    lieferungPlz: form.lieferung_plz.value.trim(),
    lieferungOrt: form.lieferung_ort.value.trim(),
    lieferungLand: form.lieferung_land.value,

    // Rechnungsadresse
    rechnungGleichLieferadresse: gleicheAdresse,
    rechnungStrasse: gleicheAdresse ? "" : form.rechnung_strasse.value.trim(),
    rechnungPlz: gleicheAdresse ? "" : form.rechnung_plz.value.trim(),
    rechnungOrt: gleicheAdresse ? "" : form.rechnung_ort.value.trim(),

    newsletterOptIn: form.newsletter.checked
  };
}

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    formAlert.style.display = "none";

    if (!validiereFormular()) {
      formAlert.textContent = "Bitte überprüfe die rot markierten Felder – es fehlen noch ein paar Angaben.";
      formAlert.style.display = "block";
      formAlert.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const bestellungBasis = baueBestellObjekt();

    submitBtn.disabled = true;
    submitBtn.textContent = "Bestellung wird gesendet …";

    try {
      const neueId = await speichereMitFortlaufenderId(ORDERS_COLLECTION, (id) => ({
        ...bestellungBasis,
        bestellnummer: formatBestellnummer(id)
      }));
      const bestellnummer = formatBestellnummer(neueId);
      const bestellung = { ...bestellungBasis, bestellnummer };
	  
      // Nur E-Mail-Adressen speichern, die aktiv der werblichen Ansprache
      // zugestimmt haben (Newsletter-Checkbox). Alle anderen werden NICHT
      // in dieser Tabelle abgelegt.
      if (bestellung.newsletterOptIn) {
        await speichereMitFortlaufenderId(EMAIL_EINWILLIGUNG_COLLECTION, {
          email: bestellung.email,
          vorname: bestellung.vorname,
          nachname: bestellung.nachname,
          einwilligungAm: serverTimestamp(),
          quelle: "bestellformular"
        });
      }

      // Hinweis: Der automatische Versand der Bestellbestätigungs-E-Mail
      // erfolgt idealerweise über eine Firebase Cloud Function, die bei
      // jedem neuen Dokument in "bestellungen" ausgelöst wird (Trigger:
      // onDocumentCreated) und z. B. über die Extension "Trigger Email
      // from Firestore" oder einen eigenen Mailversand (siehe README)
      // automatisch eine E-Mail an den Kunden verschickt.


	  // Bestellbestätigung per E-Mail verschicken – über die Firebase-Extension
      // "Trigger Email from Firestore": Wir legen dazu lediglich ein Dokument
      // in der "mail"-Collection an, den eigentlichen Versand (inkl. Rendern
      // des Handlebars-Templates) übernimmt die Extension serverseitig.
      // Bewusst NICHT blockierend + ohne die Bestellung scheitern zu lassen,
      // falls der Mailversand mal klemmt: Die Bestellung ist zu diesem
      // Zeitpunkt bereits sicher in Firestore gespeichert.
      const zahlungshinweis =
        bestellung.zahlungsart === "ueberweisung"
          ? `Bitte überweise ${eur(bestellung.gesamtbetrag)} unter Angabe der Bestellnummer ${bestellnummer} als Verwendungszweck an: Kontoinhaber: [Ihr Name] · IBAN: [Ihre IBAN] · BIC: [Ihre BIC]`
          : `Die Zahlung per ${bestellung.zahlungsart === "paypal" ? "PayPal" : "Karte (Stripe)"} ist als Platzhalter hinterlegt.`;

      addDoc(collection(db, MAIL_COLLECTION), {
        to: [bestellung.email],
        template: {
          name: MAIL_TEMPLATE_BESTELLBESTAETIGUNG,
          data: {
            vorname: bestellung.vorname,
            nachname: bestellung.nachname,
            bestellnummer,
            menge: bestellung.menge,
            gesamtbetrag: eur(bestellung.gesamtbetrag),
            zahlungshinweis,
            lieferung_strasse: bestellung.lieferungStrasse,
            lieferung_plz: bestellung.lieferungPlz,
            lieferung_ort: bestellung.lieferungOrt,
            lieferung_land: bestellung.lieferungLand
          }
        }
      }).catch((err) => {
        console.error("Bestellbestätigung konnte nicht in die Mail-Warteschlange eingetragen werden:", err);
      });
      document.querySelector(".form-page .container").innerHTML = `
        <div class="form-success" style="max-width:640px;">
          <h2 style="color:#1a6a5f;margin-top:0;">Vielen Dank für deine Bestellung! 🎉</h2>
          <p>Deine Bestellnummer lautet <strong>${bestellnummer}</strong>.</p>
          <p>Wir haben deine Bestellung erhalten und senden dir in Kürze eine Bestätigung per E-Mail an
             <strong>${bestellung.email}</strong>.</p>
          ${
            bestellung.zahlungsart === "ueberweisung"
              ? `<p>Bitte überweise <strong>${eur(bestellung.gesamtbetrag)}</strong> unter Angabe der
                 Bestellnummer <strong>${bestellnummer}</strong> als Verwendungszweck an:<br>
                 Kontoinhaber: [Ihr Name] · IBAN: [Ihre IBAN] · BIC: [Ihre BIC]</p>`
              : `<p>Die Zahlung per ${bestellung.zahlungsart === "paypal" ? "PayPal" : "Karte (Stripe)"}
                 ist als Platzhalter hinterlegt – die echte Zahlungsanbindung folgt in Kürze.</p>`
          }
          <a href="index.html" class="btn btn-primary" style="margin-top:10px;">Zurück zur Startseite</a>
        </div>`;
    } catch (err) {
      console.error("Fehler beim Speichern der Bestellung:", err);
      formAlert.textContent =
        "Deine Bestellung konnte leider nicht gesendet werden. Bitte prüfe deine Internetverbindung und versuche es erneut, oder schreibe uns direkt eine E-Mail.";
      formAlert.style.display = "block";
      submitBtn.disabled = false;
      submitBtn.textContent = "Zahlungspflichtig bestellen";
    }
  });
});
