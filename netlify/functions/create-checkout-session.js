const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Netlify Function to create Stripe Checkout Session
 */
exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    // Enable CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        // Parse request body
        const { eventId, eventTitle, price, quantity, customerEmail } = JSON.parse(event.body);

        // Validate required fields
        if (!eventId || !eventTitle || !price || !quantity) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Missing required fields: eventId, eventTitle, price, quantity'
                })
            };
        }

        // Calculate amount in paise (smallest currency unit for INR)
        const amountInPaise = Math.round(price * quantity * 100);

        // Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'inr',
                        product_data: {
                            name: eventTitle,
                            description: `Ticket for ${eventTitle}`,
                        },
                        unit_amount: Math.round(price * 100), // Price per ticket in paise
                    },
                    quantity: quantity,
                },
            ],
            mode: 'payment',

            // Store metadata for webhook processing
            metadata: {
                eventId: eventId,
                quantity: quantity.toString(),
                customerEmail: customerEmail || ''
            },

            // Success and cancel URLs
            success_url: `${process.env.URL || 'https://tixbro-website.netlify.app'}/success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.URL || 'https://tixbro-website.netlify.app'}/cancel.html`,

            // Customer email
            customer_email: customerEmail || undefined,

            // Payment intent data
            payment_intent_data: {
                metadata: {
                    eventId: eventId,
                    quantity: quantity.toString()
                }
            }
        });

        // Return session ID to client
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                sessionId: session.id,
                url: session.url
            })
        };

    } catch (error) {
        console.error('Error creating checkout session:', error);

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
};
