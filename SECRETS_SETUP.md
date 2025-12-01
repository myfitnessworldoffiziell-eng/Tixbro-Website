# 🔐 Alle benötigten Secrets für Tixbro - Setup Anleitung

## 1️⃣ STRIPE KEYS

### Wo finden?
1. Gehen Sie zu: https://dashboard.stripe.com/
2. Klicken Sie auf **Developers** → **API keys**

### Benötigte Keys:

**A) Publishable Key** (für Frontend - js/stripe-config.js)
```
Aktueller Platzhalter: pk_test_YOUR_PUBLISHABLE_KEY_HERE
Echter Key: pk_test_xxxxxxxxxxxxxxxxxxxxx

Wo: Stripe Dashboard → Developers → API keys → "Publishable key"
Kopieren: Den kompletten Key kopieren
```

**B) Secret Key** (für Backend - Netlify Environment Variable)
```
Name: STRIPE_SECRET_KEY
Wert: sk_test_xxxxxxxxxxxxxxxxxxxxx

Wo: Stripe Dashboard → Developers → API keys → "Secret key" → [Reveal test key]
⚠️ ACHTUNG: Niemals im Frontend verwenden!
```

**C) Webhook Signing Secret** (für Backend - bereits bekannt ✅)
```
Name: STRIPE_WEBHOOK_SECRET
Wert: whsec_9KSIwK3mQhXYdmJb1CYi0SysSbZL7zbe

Status: ✅ Bereits konfiguriert in Stripe
```

---

## 2️⃣ FIREBASE SERVICE ACCOUNT

### Wo erstellen?
1. Gehen Sie zu: https://console.firebase.google.com/
2. Wählen Sie Projekt: **tixbro-411bd**
3. Klicken Sie auf **Zahnrad-Icon** (oben links) → **Project Settings**
4. Gehen Sie zu **Service Accounts** Tab
5. Klicken Sie auf **Generate new private key**
6. JSON-Datei wird heruntergeladen (z.B. `tixbro-411bd-firebase-adminsdk-xxxxx.json`)

### Benötigte Werte aus der JSON-Datei:

**A) Project ID** (bereits bekannt ✅)
```
Name: FIREBASE_PROJECT_ID
Wert: tixbro-411bd

In JSON: "project_id": "tixbro-411bd"
```

**B) Client Email**
```
Name: FIREBASE_CLIENT_EMAIL
Wert: firebase-adminsdk-xxxxx@tixbro-411bd.iam.gserviceaccount.com

In JSON: "client_email": "firebase-adminsdk-xxxxx@tixbro-411bd.iam.gserviceaccount.com"
```

**C) Private Key** ⚠️ WICHTIG: MIT \n Zeichen!
```
Name: FIREBASE_PRIVATE_KEY
Wert: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...[sehr langer Key]...\n-----END PRIVATE KEY-----\n"

In JSON: "private_key": "-----BEGIN PRIVATE KEY-----\n..."

⚠️ KRITISCH:
- Muss GENAU so kopiert werden wie in der JSON-Datei
- MIT den \n Zeichen (nicht als echte Zeilenumbrüche!)
- MIT den Anführungszeichen drum herum
```

---

## 3️⃣ WO WELCHER KEY VERWENDET WIRD

### Frontend (js/stripe-config.js):
```javascript
export const STRIPE_PUBLISHABLE_KEY = 'pk_test_HIER_EINTRAGEN';
```
→ **Datei bearbeiten**: js/stripe-config.js
→ **Zu ersetzen**: 'pk_test_YOUR_PUBLISHABLE_KEY_HERE'
→ **Git committen**: ✅ JA (Publishable Key ist sicher für Frontend)

### Backend (Netlify Environment Variables):
Alle anderen Keys kommen in Netlify:
1. https://app.netlify.com/
2. Ihre Site: **tixbro-website**
3. **Site settings** → **Environment variables** → **Add a variable**

| Variable Name | Wert | Wo finden |
|---------------|------|-----------|
| `STRIPE_SECRET_KEY` | `sk_test_...` | Stripe → API keys → Secret key |
| `STRIPE_WEBHOOK_SECRET` | `whsec_9KSIwK3mQhXYdmJb1CYi0SysSbZL7zbe` | Bereits bekannt ✅ |
| `FIREBASE_PROJECT_ID` | `tixbro-411bd` | Bereits bekannt ✅ |
| `FIREBASE_CLIENT_EMAIL` | `firebase-adminsdk-...@tixbro-411bd.iam.gserviceaccount.com` | Firebase Service Account JSON |
| `FIREBASE_PRIVATE_KEY` | `"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"` | Firebase Service Account JSON |

---

## 4️⃣ SCHRITT-FÜR-SCHRITT ANLEITUNG

### Schritt 1: Stripe Publishable Key eintragen
```bash
# Datei öffnen
nano js/stripe-config.js

# Zeile 2 ändern von:
export const STRIPE_PUBLISHABLE_KEY = 'pk_test_YOUR_PUBLISHABLE_KEY_HERE';

# zu (Ihren echten Key eintragen):
export const STRIPE_PUBLISHABLE_KEY = 'pk_test_xxxxxxxxxxxxxxxxxxxxx';

# Speichern und committen
git add js/stripe-config.js
git commit -m "Add Stripe Publishable Key"
git push
```

### Schritt 2: Firebase Service Account erstellen
1. Firebase Console öffnen → tixbro-411bd
2. Project Settings → Service Accounts
3. "Generate new private key" klicken
4. JSON-Datei downloaden und an sicherem Ort speichern

### Schritt 3: Netlify Environment Variables setzen
1. Netlify Dashboard öffnen: https://app.netlify.com/
2. Site auswählen: tixbro-website
3. Site settings → Environment variables
4. Alle 5 Variablen einzeln hinzufügen (siehe Tabelle oben)

**Wichtig bei FIREBASE_PRIVATE_KEY:**
- Öffnen Sie die JSON-Datei mit einem Text-Editor
- Kopieren Sie den Wert von "private_key" GENAU so wie er dort steht
- MIT den Anführungszeichen
- MIT den \n Zeichen (nicht als echte Zeilenumbrüche)

### Schritt 4: Netlify neu deployen
Nach dem Setzen der Environment Variables:
1. Netlify Dashboard → Ihre Site → Deploys
2. "Trigger deploy" → "Clear cache and deploy site"

### Schritt 5: Testen
1. Stripe Webhook testen (siehe unten)
2. Test-Kauf durchführen (siehe unten)

---

## 5️⃣ TESTING

### Webhook testen:
1. Stripe Dashboard → Developers → Webhooks
2. Endpoint auswählen: https://tixbro-website.netlify.app/api/stripe-webhook
3. "Send test webhook" klicken
4. Event auswählen: checkout.session.completed
5. Erwartetes Ergebnis: 200 OK Response

### Test-Kauf durchführen:
1. Website öffnen: https://tixbro-website.netlify.app/shop.html
2. Event auswählen
3. Tickets hinzufügen
4. Checkout
5. Test-Kartennummer verwenden: **4242 4242 4242 4242**
   - Ablaufdatum: Beliebig in der Zukunft (z.B. 12/34)
   - CVC: Beliebig 3 Ziffern (z.B. 123)
   - Name: Beliebig
6. Zahlung abschließen
7. Prüfen ob Ticket in Firebase erstellt wurde

---

## 6️⃣ TROUBLESHOOTING

### Fehler: "Stripe not initialized"
→ Publishable Key in js/stripe-config.js noch nicht eingetragen

### Fehler: "Failed to create checkout session"
→ STRIPE_SECRET_KEY in Netlify nicht gesetzt oder falsch

### Fehler: "Webhook signature verification failed"
→ STRIPE_WEBHOOK_SECRET in Netlify falsch oder fehlt

### Fehler: "Firebase Admin initialization failed"
→ FIREBASE_PRIVATE_KEY falsch kopiert (ohne \n Zeichen?)
→ Oder FIREBASE_CLIENT_EMAIL falsch

### Netlify Function Logs ansehen:
1. Netlify Dashboard → Functions Tab
2. Klick auf Function (z.B. "stripe-webhook")
3. Function logs anschauen

---

## 7️⃣ SICHERHEIT

✅ **Publishable Key (pk_test_...)**: Kann im Frontend-Code stehen (öffentlich sicher)
❌ **Secret Key (sk_test_...)**: NUR in Backend/Netlify Environment Variables
❌ **Webhook Secret (whsec_...)**: NUR in Backend/Netlify Environment Variables
❌ **Firebase Private Key**: NUR in Backend/Netlify Environment Variables

⚠️ **NIEMALS committen:**
- .env Dateien
- Firebase Service Account JSON-Dateien
- Stripe Secret Keys
- Private Keys

✅ **.gitignore** schützt diese Dateien bereits!

---

## 📞 SUPPORT

Bei Problemen:
1. Netlify Logs checken: https://app.netlify.com/sites/tixbro-website/logs
2. Stripe Logs checken: https://dashboard.stripe.com/logs
3. Firebase Logs checken: https://console.firebase.google.com/project/tixbro-411bd/firestore

---

**Status Checklist:**

- [ ] Firebase Service Account JSON heruntergeladen
- [ ] Stripe Publishable Key in js/stripe-config.js eingetragen
- [ ] STRIPE_SECRET_KEY in Netlify gesetzt
- [ ] STRIPE_WEBHOOK_SECRET in Netlify gesetzt
- [ ] FIREBASE_PROJECT_ID in Netlify gesetzt
- [ ] FIREBASE_CLIENT_EMAIL in Netlify gesetzt
- [ ] FIREBASE_PRIVATE_KEY in Netlify gesetzt (MIT \n!)
- [ ] Netlify neu deployed
- [ ] Webhook getestet (200 OK)
- [ ] Test-Kauf durchgeführt
- [ ] Ticket in Firebase erstellt

Viel Erfolg! 🚀
