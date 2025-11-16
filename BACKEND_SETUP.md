# Tixbro Backend Setup Guide

## Firebase Configuration

The Tixbro platform uses Firebase for:
- **Authentication**: User login and registration
- **Firestore Database**: Storing companies, events, and tickets
- **Storage**: Storing event images

## Firebase Project Setup

### 1. Firestore Database Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Companies collection
    match /companies/{companyId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == companyId;
    }

    // Events collection
    match /events/{eventId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null &&
        resource.data.companyId == request.auth.uid;
    }

    // Tickets collection
    match /tickets/{ticketId} {
      allow read: if true;
      allow create: if true; // Public can purchase
      allow update: if request.auth != null;
    }
  }
}
```

### 2. Firebase Storage Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /events/{eventId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### 3. Firestore Indexes

Create composite indexes for queries:

**events collection:**
- `status` (Ascending) + `createdAt` (Descending)
- `category` (Ascending) + `status` (Ascending) + `createdAt` (Descending)
- `companyId` (Ascending) + `createdAt` (Descending)

**tickets collection:**
- `customerEmail` (Ascending) + `status` (Ascending)

## Database Structure

### Companies Collection
```json
{
  "companyId": "string (user UID)",
  "companyName": "string",
  "contactPerson": "string",
  "phone": "string",
  "email": "string",
  "address": "string",
  "accountType": "company",
  "verified": boolean,
  "totalRevenue": number,
  "totalTicketsSold": number,
  "createdAt": "ISO string"
}
```

### Events Collection
```json
{
  "eventId": "string",
  "companyId": "string",
  "title": "string",
  "description": "string",
  "category": "bus|movies|concerts|theatre|sports|events",
  "location": "string",
  "city": "string",
  "venue": "string",
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "price": number,
  "totalTickets": number,
  "availableTickets": number,
  "soldTickets": number,
  "imageUrl": "string",
  "status": "active|inactive|sold_out",
  "views": number,
  "clicks": number,
  "createdAt": "ISO string",
  "updatedAt": "ISO string"
}
```

### Tickets Collection
```json
{
  "ticketId": "string",
  "eventId": "string",
  "eventTitle": "string",
  "companyId": "string",
  "customerName": "string",
  "customerEmail": "string",
  "customerPhone": "string",
  "ticketPrice": number,
  "tixbroCommission": number (10%),
  "companyPayout": number (90%),
  "paymentStatus": "completed|pending|failed",
  "paymentMethod": "credit_card",
  "paymentId": "string",
  "eventDate": "YYYY-MM-DD",
  "eventTime": "HH:MM",
  "eventLocation": "string",
  "eventVenue": "string",
  "purchaseDate": "ISO string",
  "status": "valid|used|cancelled",
  "qrCode": "string"
}
```

## Features Implemented

### ✅ Company Authentication
- Registration with company details
- Login/Logout
- Session management

### ✅ Company Dashboard
- Total revenue display
- Total tickets sold
- Active events count
- List of all company events with statistics

### ✅ Event Management
- Create events with images
- Set ticket prices and quantities
- Categorize events (bus, movies, concerts, theatre, sports, events)
- Track views and clicks
- Automatic sold-out status

### ✅ Ticket Sales System
- Purchase flow (ready for payment integration)
- Automatic inventory management
- Revenue calculation (10% commission to Tixbro, 90% to company)
- Ticket generation with QR code

## Next Steps for Production

### 1. Payment Integration (Stripe/Razorpay)
Replace the placeholder payment function in `js/tickets.js` with actual payment gateway integration.

### 2. Email Service
Set up Firebase Cloud Functions for sending ticket emails:
- Use SendGrid, Mailgun, or Firebase Extensions
- Send ticket PDF with QR code
- Send purchase confirmation

### 3. Additional Features
- Customer portal to view their tickets
- QR code scanning for event entry
- Analytics dashboard
- Payout management for companies
- Rating and review system
- Advanced search and filtering

## How to Use

1. **Company Registration**: Companies register at `/login.html`
2. **Create Events**: Logged-in companies create events at `/create-event.html`
3. **Dashboard**: View statistics at `/dashboard.html`
4. **Customers**: Browse and purchase tickets (frontend ready, needs payment integration)

## Security Notes

- Enable Firebase App Check for production
- Set up proper authentication rules
- Validate all inputs on frontend and backend
- Use Firebase Cloud Functions for sensitive operations
- Enable HTTPS only
