// =========================================================
// Admin-Bereich: Auth + Firestore-Live-Liste der Bestellungen
// =========================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig, ORDERS_COLLECTION } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const loginWrap = document.getElementById("admin-login");
const dashboard = document.getElementById("admin-dashboard");
const loginForm = document.getElementById("login-form");
const loginAlert = document.getElementById("login-alert");
const logoutBtn = document.getElementById("logout-btn");
const userEmailEl = document.getElementById("admin-user-email");
const ordersBody = document.getElementById("orders-body");
const filterStatus = document.getElementById("filter-status");

let alleBestellungen = [];
let unsubscribeSnapshot = null;

const eur = (n) => (n ?? 0).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
const formatDatum = (ts) => {
  if (!ts || !ts.toDate) return "–";
  return ts.toDate().toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" });
};

const STATUS_LABEL = {
  neu: "Neu",
  bezahlt: "Bezahlt",
  versendet: "Versendet",
  storniert: "Storniert"
};
const STATUS_CLASS = {
  neu: "status-open",
  bezahlt: "status-paid",
  versendet: "status-shipped",
  storniert: "status-cancelled"
};

// ---------- Login ----------
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginAlert.style.display = "none";
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    loginAlert.textContent = "Anmeldung fehlgeschlagen. Bitte E-Mail und Passwort prüfen.";
    loginAlert.style.display = "block";
    console.error(err);
  }
});

logoutBtn.addEventListener("click", () => signOut(auth));

// ---------- Auth-Status ----------
onAuthStateChanged(auth, (user) => {
  if (user) {
    loginWrap.style.display = "none";
    dashboard.style.display = "flex";
    userEmailEl.textContent = user.email;
    startOrdersListener();
  } else {
    dashboard.style.display = "none";
    loginWrap.style.display = "flex";
    if (unsubscribeSnapshot) unsubscribeSnapshot();
  }
});

// ---------- Bestellungen live laden ----------
function startOrdersListener() {
  const q = query(collection(db, ORDERS_COLLECTION), orderBy("erstelltAm", "desc"));
  unsubscribeSnapshot = onSnapshot(
    q,
    (snapshot) => {
      alleBestellungen = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderOrders();
    },
    (err) => {
      console.error("Fehler beim Laden der Bestellungen:", err);
      ordersBody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--color-error);padding:30px;">
        Bestellungen konnten nicht geladen werden. Prüfe die Firestore Security Rules und deine Berechtigung.
      </td></tr>`;
    }
  );
}

filterStatus.addEventListener("change", renderOrders);

function renderOrders() {
  const filter = filterStatus.value;
  const gefiltert =
    filter === "alle" ? alleBestellungen : alleBestellungen.filter((b) => b.status === filter);

  // Statistiken (immer über alle Bestellungen, unabhängig vom Filter)
  document.getElementById("stat-total").textContent = alleBestellungen.length;
  document.getElementById("stat-offen").textContent = alleBestellungen.filter((b) => b.zahlungsstatus === "offen").length;
  document.getElementById("stat-bezahlt").textContent = alleBestellungen.filter((b) => b.status === "bezahlt" || b.status === "versendet").length;
  document.getElementById("stat-versendet").textContent = alleBestellungen.filter((b) => b.status === "versendet").length;

  if (gefiltert.length === 0) {
    ordersBody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--color-ink-soft);padding:30px;">Keine Bestellungen gefunden.</td></tr>`;
    return;
  }

  ordersBody.innerHTML = gefiltert
    .map((b) => {
      const status = b.status || "neu";

      return `
      <tr data-id="${b.id}">
        <td><strong>${b.bestellnummer || "–"}</strong></td>
        <td>${formatDatum(b.erstelltAm)}</td>
        <td>${b.vorname || ""} ${b.nachname || ""}<br>
            <a href="mailto:${b.email || ""}" style="font-size:0.85rem;">${b.email || ""}</a></td>
        <td>${b.lieferungStrasse || ""}<br>${b.lieferungPlz || ""} ${b.lieferungOrt || ""} ${b.lieferungLand && b.lieferungLand !== "Deutschland" ? "(" + b.lieferungLand + ")" : ""}</td>
        <td>${b.menge ?? 1}</td>
        <td>${eur(b.gesamtbetrag)}</td>
        <td>${b.zahlungsart || "–"}</td>
        <td>
          <span class="status-pill ${STATUS_CLASS[status] || "status-open"}">${STATUS_LABEL[status] || status}</span>
          <select class="status-select" data-id="${b.id}" style="margin-top:6px;font-size:0.82rem;padding:4px 6px;">
            ${Object.keys(STATUS_LABEL)
              .map((s) => `<option value="${s}" ${s === status ? "selected" : ""}>${STATUS_LABEL[s]}</option>`)
              .join("")}
          </select>
        </td>
      </tr>`;
    })
    .join("");

  document.querySelectorAll(".status-select").forEach((select) => {
    select.addEventListener("change", async (e) => {
      const id = e.target.dataset.id;
      const neuerStatus = e.target.value;
      try {
        await updateDoc(doc(db, ORDERS_COLLECTION, id), {
          status: neuerStatus,
          zahlungsstatus: neuerStatus === "bezahlt" || neuerStatus === "versendet" ? "bezahlt" : "offen"
        });
      } catch (err) {
        console.error("Status konnte nicht aktualisiert werden:", err);
        alert("Status konnte nicht gespeichert werden. Bitte erneut versuchen.");
      }
    });
  });
}
