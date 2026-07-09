// =========================================================
// Firebase-Konfiguration
// =========================================================
// Ersetze die Werte unten mit den Zugangsdaten DEINES eigenen
// Firebase-Projekts. Du findest sie in der Firebase Console unter:
// Projekteinstellungen -> "Meine Apps" -> Web-App -> SDK-Setup
//
// WICHTIG:
// - Diese Konfiguration ist KEIN Geheimnis, sie darf im Frontend
//   stehen. Der eigentliche Schutz deiner Daten passiert über die
//   Firestore Security Rules (siehe firestore.rules) und über
//   Firebase Authentication für den Admin-Bereich.
// - Wähle beim Anlegen der Firestore-Datenbank eine Region in der
//   EU (z. B. "eur3" / europe-west), damit die Bestelldaten
//   innerhalb der EU gespeichert werden (wichtig für die DSGVO).
// =========================================================

export const firebaseConfig = {
  apiKey: "AIzaSyDixZtQ7jyQ4B1oowzjj_8YFhg2I2fvxqA",
  authDomain: "kleinezeichen-dec16.firebaseapp.com",
  projectId: "kleinezeichen-dec16",
  storageBucket: "kleinezeichen-dec16.firebasestorage.app",
  messagingSenderId: "634027298811",
  appId: "1:634027298811:web:1240a3541e32197442055e",
};

// Name der Firestore-Collection, in der Bestellungen gespeichert werden
export const ORDERS_COLLECTION = "bestellungen";
export const EMAIL_EINWILLIGUNG_COLLECTION = "email_einwilligungen";
export const COUNTERS_COLLECTION = "zaehler";

// Collection, in die die "Trigger Email from Firestore"-Extension schreibt.
// Jedes Dokument hier löst automatisch einen E-Mail-Versand aus.
export const MAIL_COLLECTION = "mail";

// Name des Handlebars-Templates (Dokument-ID in der Templates-Collection
// der Extension), das für die Bestellbestätigung verwendet wird.
export const MAIL_TEMPLATE_BESTELLBESTAETIGUNG = "bestellbestaetigung";