// Payment Processing with Stripe for Tixbro
// Tickets and emails are now handled by Stripe Webhook (stripe-webhook.js)
import { getStripe } from './stripe-config.js';
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
export async function processStripePayment(customerData, cardElement) {
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

        // Validate quantity
        const quantity = checkoutData.quantity || 1;
        if (quantity < 1) {
            throw new Error('Invalid quantity');
        }

        // Step 1: Create Payment Intent on backend with all customer & event data
        const response = await fetch('/.netlify/functions/create-payment-intent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: checkoutData.totalAmount,
                currency: 'inr',
                eventId: checkoutData.eventId,
                eventTitle: checkoutData.eventTitle,
                customerEmail: customerData.email,
                customerName: `${customerData.firstName} ${customerData.lastName}`,
                customerPhone: customerData.phone || '',
                eventDate: checkoutData.eventDate,
                eventTime: checkoutData.eventTime,
                eventLocation: checkoutData.eventLocation,
                eventVenue: checkoutData.eventVenue,
                quantity: quantity
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create payment intent');
        }

        const { clientSecret, paymentIntentId } = await response.json();

        // Step 2: Confirm payment with card details
        const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
            clientSecret,
            {
                payment_method: {
                    card: cardElement,
                    billing_details: {
                        name: `${customerData.firstName} ${customerData.lastName}`,
                        email: customerData.email,
                        phone: customerData.phone
                    }
                }
            }
        );

        if (confirmError) {
            throw new Error(confirmError.message);
        }

        // Step 3: Verify payment succeeded
        if (paymentIntent.status !== 'succeeded') {
            throw new Error('Payment was not successful. Please try again.');
        }

        // Step 4: Payment successful!
        // Stripe webhook will automatically:
        // ✅ Create tickets in Firebase
        // ✅ Send confirmation email via Brevo
        // ✅ Create contact in Brevo for marketing

        console.log('Payment successful! Webhook will process tickets and email.');
        console.log('Payment ID:', paymentIntent.id);

        // Clear checkout data
        sessionStorage.removeItem('checkoutEvent');

        // Store payment info for success page
        // Note: Ticket IDs will be sent via email (created by webhook)
        sessionStorage.setItem('purchasedTicket', JSON.stringify({
            paymentId: paymentIntent.id,
            customerEmail: customerData.email,
            customerName: `${customerData.firstName} ${customerData.lastName}`,
            quantity: checkoutData.quantity || 1,
            totalAmount: checkoutData.totalAmount,
            eventTitle: checkoutData.eventTitle,
            eventDate: checkoutData.eventDate,
            eventTime: checkoutData.eventTime,
            eventLocation: checkoutData.eventLocation,
            eventVenue: checkoutData.eventVenue,
            webhookProcessing: true // Indicates tickets are being created by webhook
        }));

        return {
            success: true,
            paymentId: paymentIntent.id,
            message: 'Payment successful! You will receive your tickets via email shortly.'
        };

    } catch (error) {
        console.error('Payment processing error:', error);
        return { success: false, error: error.message };
    }
}

// NOTE: Ticket creation and email confirmation are now handled by the Stripe webhook
// See netlify/functions/stripe-webhook.js for implementation
// This ensures 100% reliability even if the user's browser closes after payment
