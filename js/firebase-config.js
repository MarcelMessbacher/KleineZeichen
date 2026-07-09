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
  apiKey: "DEIN_API_KEY",
  authDomain: "DEIN_PROJEKT.firebaseapp.com",
  projectId: "DEIN_PROJEKT",
  storageBucket: "DEIN_PROJEKT.appspot.com",
  messagingSenderId: "DEINE_SENDER_ID",
  appId: "DEINE_APP_ID"
};

// Name der Firestore-Collection, in der Bestellungen gespeichert werden
export const ORDERS_COLLECTION = "bestellungen";
