# Stripe Webhook Setup für Tixbro

## 1. Firebase Service Account erstellen

1. Gehen Sie zur [Firebase Console](https://console.firebase.google.com/)
2. Wählen Sie Ihr Projekt: **tixbro-411bd**
3. Gehen Sie zu **Project Settings** (Zahnrad-Icon oben links) → **Service Accounts**
4. Klicken Sie auf **Generate new private key**
5. Laden Sie die JSON-Datei herunter
6. Die Datei enthält:
   - `project_id`
   - `client_email`
   - `private_key`

## 2. Umgebungsvariablen in Netlify konfigurieren

1. Gehen Sie zu Ihrem [Netlify Dashboard](https://app.netlify.com/)
2. Wählen Sie Ihre Site: **tixbro-website**
3. Gehen Sie zu **Site settings** → **Environment variables**
4. Fügen Sie folgende Variablen hinzu:

### STRIPE_SECRET_KEY
- **Key**: `STRIPE_SECRET_KEY`
- **Value**: Ihr Stripe Secret Key (beginnt mit `sk_test_...` oder `sk_live_...`)
- **Scopes**: Alle Scopes auswählen

### STRIPE_WEBHOOK_SECRET
- **Key**: `STRIPE_WEBHOOK_SECRET`
- **Value**: `whsec_9KSIwK3mQhXYdmJb1CYi0SysSbZL7zbe`
- **Scopes**: Alle Scopes auswählen

### FIREBASE_PROJECT_ID
- **Key**: `FIREBASE_PROJECT_ID`
- **Value**: `tixbro-411bd`
- **Scopes**: Alle Scopes auswählen

### FIREBASE_CLIENT_EMAIL
- **Key**: `FIREBASE_CLIENT_EMAIL`
- **Value**: Der `client_email` Wert aus Ihrer Firebase Service Account JSON
- **Format**: `firebase-adminsdk-xxxxx@tixbro-411bd.iam.gserviceaccount.com`
- **Scopes**: Alle Scopes auswählen

### FIREBASE_PRIVATE_KEY
- **Key**: `FIREBASE_PRIVATE_KEY`
- **Value**: Der `private_key` Wert aus Ihrer Firebase Service Account JSON
- **Format**: Muss so kopiert werden wie er in der JSON steht, MIT den `\n` Zeichen
- **Beispiel**: `"-----BEGIN PRIVATE KEY-----\nMIIEvQIB...Ihr Key...\n-----END PRIVATE KEY-----\n"`
- **WICHTIG**: Den gesamten String MIT Anführungszeichen kopieren
- **Scopes**: Alle Scopes auswählen

## 3. Dependencies installieren

Nach dem Push auf GitHub wird Netlify automatisch die Dependencies installieren:

```bash
npm install
```

Die benötigten Packages sind:
- `stripe` - Stripe Node.js SDK
- `firebase-admin` - Firebase Admin SDK

## 4. Webhook-URL in Stripe konfigurieren

Ihre Webhook ist bereits konfiguriert:
- **Endpoint URL**: `https://tixbro-website.netlify.app/api/stripe-webhook`
- **Signing Secret**: `whsec_9KSIwK3mQhXYdmJb1CYi0SysSbZL7zbe`
- **Events**: 8 Events aktiviert

Die Netlify Function leitet automatisch `/api/stripe-webhook` zu `/.netlify/functions/stripe-webhook` um.

## 5. Webhook testen

Nach dem Deployment:

1. Gehen Sie zu Stripe Dashboard → **Developers** → **Webhooks**
2. Klicken Sie auf Ihren Webhook Endpoint
3. Klicken Sie auf **Send test webhook**
4. Wählen Sie ein Event (z.B. `checkout.session.completed`)
5. Klicken Sie auf **Send test webhook**

Sie sollten eine `200 OK` Antwort sehen.

## 6. Logs überprüfen

### Netlify Logs:
1. Netlify Dashboard → Ihre Site → **Functions**
2. Klicken Sie auf `stripe-webhook`
3. Sehen Sie sich die **Function logs** an

### Stripe Logs:
1. Stripe Dashboard → **Developers** → **Webhooks**
2. Klicken Sie auf Ihren Endpoint
3. Sehen Sie sich die **Recent events** an

## Troubleshooting

### Fehler: "Webhook signature verification failed"
- Überprüfen Sie, ob `STRIPE_WEBHOOK_SECRET` korrekt gesetzt ist
- Der Secret muss GENAU mit dem aus Stripe übereinstimmen

### Fehler: "Firebase Admin initialization failed"
- Überprüfen Sie alle Firebase Umgebungsvariablen
- `FIREBASE_PRIVATE_KEY` muss die `\n` Zeichen enthalten
- Stellen Sie sicher, dass der Service Account die richtigen Berechtigungen hat

### Fehler: "Function not found"
- Überprüfen Sie, ob die Function deployed wurde
- Sehen Sie sich die Netlify Deploy Logs an
- Überprüfen Sie die `netlify.toml` Konfiguration

## Webhook Events Übersicht

Folgende Events werden verarbeitet:

| Event | Beschreibung | Aktion |
|-------|--------------|--------|
| `checkout.session.completed` | Checkout erfolgreich | Ticket-Status aktualisieren |
| `payment_intent.succeeded` | Zahlung erfolgreich | Status auf "paid" setzen |
| `payment_intent.payment_failed` | Zahlung fehlgeschlagen | Tickets wieder freigeben |
| `charge.refunded` | Rückerstattung | Ticket stornieren, Inventar aktualisieren |
| `charge.dispute.created` | Chargeback | Ticket sperren, Admin benachrichtigen |
| `payment_intent.canceled` | Zahlung abgebrochen | Reservierung löschen |
| `customer.created` | Kunde erstellt | Kundenprofil speichern |
| `invoice.payment_succeeded` | Rechnung bezahlt | Für zukünftige Features |

## Nächste Schritte

1. ✅ Umgebungsvariablen in Netlify setzen
2. ✅ Code committen und pushen
3. ✅ Netlify Deployment abwarten
4. ✅ Webhook mit Stripe testen
5. ✅ Ersten Test-Kauf durchführen
6. ✅ Logs überprüfen
