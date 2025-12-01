// Payment Processing with Stripe for Tixbro
import { getStripe } from './stripe-config.js';
import { purchaseTicket } from './tickets.js';
import { getEvent, incrementEventClicks } from './events.js';

// Create Stripe Checkout Session for ticket purchase
export async function createCheckoutSession(eventId, quantity = 1) {
    try {
        // Get event details
        const eventResult = await getEvent(eventId);
        if (!eventResult.success) {
            throw new Error('Event not found');
        }

        const event = eventResult.event;

        // Check if tickets are available
        if (event.availableTickets < quantity) {
            throw new Error('Not enough tickets available');
        }

        // Calculate total amount (in paise for INR)
        const amountInPaise = Math.round(event.price * quantity * 100);

        // For demo purposes, we'll redirect to a checkout page
        // In production, you would create a Stripe Checkout Session via your backend

        // Store checkout info in sessionStorage
        sessionStorage.setItem('checkoutEvent', JSON.stringify({
            eventId: eventId,
            eventTitle: event.title,
            price: event.price,
            quantity: quantity,
            totalAmount: event.price * quantity,
            eventDate: event.date,
            eventTime: event.time,
            eventLocation: event.location,
            eventVenue: event.venue
        }));

        // Redirect to checkout page
        window.location.href = 'checkout.html';

        return { success: true };
    } catch (error) {
        console.error('Checkout error:', error);
        return { success: false, error: error.message };
    }
}

// Process payment (called from checkout page)
export async function processStripePayment(customerData) {
    try {
        const stripe = getStripe();
        if (!stripe) {
            throw new Error('Stripe not initialized');
        }

        // Get checkout data from sessionStorage
        const checkoutData = JSON.parse(sessionStorage.getItem('checkoutEvent'));
        if (!checkoutData) {
            throw new Error('No checkout data found');
        }

        // Store customer data temporarily for after Stripe redirect
        sessionStorage.setItem('checkoutCustomer', JSON.stringify(customerData));

        // Create Stripe Checkout Session via backend
        const response = await fetch('/.netlify/functions/create-checkout-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                eventId: checkoutData.eventId,
                eventTitle: checkoutData.eventTitle,
                price: checkoutData.price,
                quantity: checkoutData.quantity,
                customerEmail: customerData.email
            })
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Failed to create checkout session');
        }

        // Redirect to Stripe Checkout
        const { error } = await stripe.redirectToCheckout({
            sessionId: result.sessionId
        });

        if (error) {
            throw new Error(error.message);
        }

        return { success: true };

    } catch (error) {
        console.error('Payment processing error:', error);
        return { success: false, error: error.message };
    }
}

// Verify payment (for webhook handling in future)
export async function verifyPayment(sessionId) {
    // This would be handled by backend webhook
    // For now, just return success
    return { success: true };
}
