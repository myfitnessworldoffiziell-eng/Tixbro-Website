const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const admin = require('firebase-admin');

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
        }),
        databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
    });
}

const db = admin.firestore();

/**
 * Netlify Function to handle Stripe Webhooks
 */
exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    const sig = event.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let stripeEvent;

    try {
        // Verify the webhook signature
        stripeEvent = stripe.webhooks.constructEvent(
            event.body,
            sig,
            webhookSecret
        );
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return {
            statusCode: 400,
            body: JSON.stringify({ error: `Webhook Error: ${err.message}` })
        };
    }

    console.log(`Received event: ${stripeEvent.type}`);

    // Handle the event
    try {
        switch (stripeEvent.type) {
            case 'checkout.session.completed':
                await handleCheckoutSessionCompleted(stripeEvent.data.object);
                break;

            case 'payment_intent.succeeded':
                await handlePaymentIntentSucceeded(stripeEvent.data.object);
                break;

            case 'payment_intent.payment_failed':
                await handlePaymentIntentFailed(stripeEvent.data.object);
                break;

            case 'charge.refunded':
                await handleChargeRefunded(stripeEvent.data.object);
                break;

            case 'charge.dispute.created':
                await handleDisputeCreated(stripeEvent.data.object);
                break;

            case 'payment_intent.canceled':
                await handlePaymentIntentCanceled(stripeEvent.data.object);
                break;

            case 'customer.created':
                await handleCustomerCreated(stripeEvent.data.object);
                break;

            case 'invoice.payment_succeeded':
                await handleInvoicePaymentSucceeded(stripeEvent.data.object);
                break;

            default:
                console.log(`Unhandled event type: ${stripeEvent.type}`);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ received: true })
        };

    } catch (error) {
        console.error('Error processing webhook:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error' })
        };
    }
};

/**
 * Handle checkout.session.completed event
 * This is the main event for creating tickets
 */
async function handleCheckoutSessionCompleted(session) {
    console.log('Processing checkout.session.completed:', session.id);

    // Get metadata from the session (we'll need to add this when creating the session)
    const { eventId, quantity, customerEmail } = session.metadata || {};

    if (!eventId) {
        console.error('No eventId in session metadata');
        return;
    }

    // The ticket should already be created by the client-side code
    // Here we can double-check and update the status
    const ticketsRef = db.collection('tickets');
    const ticketQuery = await ticketsRef
        .where('paymentId', '==', session.payment_intent)
        .limit(1)
        .get();

    if (!ticketQuery.empty) {
        const ticketDoc = ticketQuery.docs[0];
        await ticketDoc.ref.update({
            paymentStatus: 'completed',
            stripeSessionId: session.id,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Ticket ${ticketDoc.id} updated with session info`);
    } else {
        console.log('No existing ticket found for this payment');
    }
}

/**
 * Handle payment_intent.succeeded event
 */
async function handlePaymentIntentSucceeded(paymentIntent) {
    console.log('Processing payment_intent.succeeded:', paymentIntent.id);

    // Update ticket status to paid
    const ticketsRef = db.collection('tickets');
    const ticketQuery = await ticketsRef
        .where('paymentId', '==', paymentIntent.id)
        .limit(1)
        .get();

    if (!ticketQuery.empty) {
        const ticketDoc = ticketQuery.docs[0];
        await ticketDoc.ref.update({
            paymentStatus: 'succeeded',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Ticket ${ticketDoc.id} payment status updated to succeeded`);
    }
}

/**
 * Handle payment_intent.payment_failed event
 */
async function handlePaymentIntentFailed(paymentIntent) {
    console.log('Processing payment_intent.payment_failed:', paymentIntent.id);

    // Find the ticket
    const ticketsRef = db.collection('tickets');
    const ticketQuery = await ticketsRef
        .where('paymentId', '==', paymentIntent.id)
        .limit(1)
        .get();

    if (!ticketQuery.empty) {
        const ticketDoc = ticketQuery.docs[0];
        const ticketData = ticketDoc.data();

        // Update ticket status to failed
        await ticketDoc.ref.update({
            paymentStatus: 'failed',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Restore available tickets
        const eventRef = db.collection('events').doc(ticketData.eventId);
        await eventRef.update({
            availableTickets: admin.firestore.FieldValue.increment(ticketData.quantity)
        });

        console.log(`Payment failed for ticket ${ticketDoc.id}, tickets restored`);
    }
}

/**
 * Handle charge.refunded event
 */
async function handleChargeRefunded(charge) {
    console.log('Processing charge.refunded:', charge.id);

    // Find the ticket by payment intent
    const ticketsRef = db.collection('tickets');
    const ticketQuery = await ticketsRef
        .where('paymentId', '==', charge.payment_intent)
        .limit(1)
        .get();

    if (!ticketQuery.empty) {
        const ticketDoc = ticketQuery.docs[0];
        const ticketData = ticketDoc.data();

        // Update ticket status to refunded
        await ticketDoc.ref.update({
            paymentStatus: 'refunded',
            refundedAt: admin.firestore.FieldValue.serverTimestamp(),
            refundAmount: charge.amount_refunded / 100, // Convert from cents
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Restore available tickets
        const eventRef = db.collection('events').doc(ticketData.eventId);
        await eventRef.update({
            availableTickets: admin.firestore.FieldValue.increment(ticketData.quantity),
            soldTickets: admin.firestore.FieldValue.increment(-ticketData.quantity)
        });

        // Update company revenue
        const eventDoc = await eventRef.get();
        const eventData = eventDoc.data();

        if (eventData.companyId) {
            const companyRef = db.collection('companies').doc(eventData.companyId);
            await companyRef.update({
                totalRevenue: admin.firestore.FieldValue.increment(-ticketData.totalAmount)
            });
        }

        console.log(`Ticket ${ticketDoc.id} refunded, inventory restored`);
    }
}

/**
 * Handle charge.dispute.created event
 */
async function handleDisputeCreated(dispute) {
    console.log('Processing charge.dispute.created:', dispute.id);

    // Find the ticket
    const ticketsRef = db.collection('tickets');
    const ticketQuery = await ticketsRef
        .where('paymentId', '==', dispute.payment_intent)
        .limit(1)
        .get();

    if (!ticketQuery.empty) {
        const ticketDoc = ticketQuery.docs[0];

        // Update ticket status to disputed
        await ticketDoc.ref.update({
            paymentStatus: 'disputed',
            disputeId: dispute.id,
            disputeReason: dispute.reason,
            disputedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // TODO: Send notification to admin
        console.log(`Dispute created for ticket ${ticketDoc.id}`);
    }
}

/**
 * Handle payment_intent.canceled event
 */
async function handlePaymentIntentCanceled(paymentIntent) {
    console.log('Processing payment_intent.canceled:', paymentIntent.id);

    // Find and delete the pending ticket
    const ticketsRef = db.collection('tickets');
    const ticketQuery = await ticketsRef
        .where('paymentId', '==', paymentIntent.id)
        .limit(1)
        .get();

    if (!ticketQuery.empty) {
        const ticketDoc = ticketQuery.docs[0];
        const ticketData = ticketDoc.data();

        // Restore available tickets
        const eventRef = db.collection('events').doc(ticketData.eventId);
        await eventRef.update({
            availableTickets: admin.firestore.FieldValue.increment(ticketData.quantity)
        });

        // Delete the ticket
        await ticketDoc.ref.delete();
        console.log(`Canceled ticket ${ticketDoc.id} deleted, inventory restored`);
    }
}

/**
 * Handle customer.created event
 */
async function handleCustomerCreated(customer) {
    console.log('Processing customer.created:', customer.id);

    // Store customer in Firestore for future reference
    const customersRef = db.collection('customers');
    await customersRef.doc(customer.id).set({
        stripeCustomerId: customer.id,
        email: customer.email,
        name: customer.name,
        phone: customer.phone,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`Customer ${customer.id} stored in Firestore`);
}

/**
 * Handle invoice.payment_succeeded event
 * For future subscription/membership features
 */
async function handleInvoicePaymentSucceeded(invoice) {
    console.log('Processing invoice.payment_succeeded:', invoice.id);

    // TODO: Implement subscription handling when needed
    console.log('Invoice payment succeeded - subscription feature not yet implemented');
}
