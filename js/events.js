// Event Management for Tixbro
import { db, storage } from './firebase-config.js';
import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    updateDoc,
    increment
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
    ref,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// Create new event
export async function createEvent(companyId, eventData, imageFile) {
    try {
        // Generate event ID
        const eventId = Date.now().toString();

        // Upload image if provided
        let imageUrl = '';
        if (imageFile) {
            const storageRef = ref(storage, `events/${eventId}/${imageFile.name}`);
            await uploadBytes(storageRef, imageFile);
            imageUrl = await getDownloadURL(storageRef);
        }

        // Create event document
        await setDoc(doc(db, "events", eventId), {
            eventId: eventId,
            companyId: companyId,
            title: eventData.title,
            description: eventData.description,
            category: eventData.category, // bus, movies, concerts, theatre, sports, events
            location: eventData.location,
            city: eventData.city,
            venue: eventData.venue,
            date: eventData.date,
            time: eventData.time,
            price: parseFloat(eventData.price),
            totalTickets: parseInt(eventData.totalTickets),
            availableTickets: parseInt(eventData.totalTickets),
            soldTickets: 0,
            imageUrl: imageUrl,
            status: 'active', // active, inactive, sold_out
            views: 0,
            clicks: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        return { success: true, eventId: eventId };
    } catch (error) {
        console.error("Create event error:", error);
        return { success: false, error: error.message };
    }
}

// Get all active events
export async function getActiveEvents(categoryFilter = null) {
    try {
        let q;
        if (categoryFilter) {
            q = query(
                collection(db, "events"),
                where("status", "==", "active"),
                where("category", "==", categoryFilter),
                orderBy("createdAt", "desc"),
                limit(50)
            );
        } else {
            q = query(
                collection(db, "events"),
                where("status", "==", "active"),
                orderBy("createdAt", "desc"),
                limit(50)
            );
        }

        const querySnapshot = await getDocs(q);
        const events = [];
        querySnapshot.forEach((doc) => {
            events.push({ id: doc.id, ...doc.data() });
        });

        return { success: true, events: events };
    } catch (error) {
        console.error("Get events error:", error);
        return { success: false, error: error.message };
    }
}

// Get events by company
export async function getCompanyEvents(companyId) {
    try {
        const q = query(
            collection(db, "events"),
            where("companyId", "==", companyId),
            orderBy("createdAt", "desc")
        );

        const querySnapshot = await getDocs(q);
        const events = [];
        querySnapshot.forEach((doc) => {
            events.push({ id: doc.id, ...doc.data() });
        });

        return { success: true, events: events };
    } catch (error) {
        console.error("Get company events error:", error);
        return { success: false, error: error.message };
    }
}

// Get single event
export async function getEvent(eventId) {
    try {
        const eventDoc = await getDoc(doc(db, "events", eventId));

        if (!eventDoc.exists()) {
            throw new Error("Event not found");
        }

        // Increment views
        await updateDoc(doc(db, "events", eventId), {
            views: increment(1)
        });

        return { success: true, event: { id: eventDoc.id, ...eventDoc.data() } };
    } catch (error) {
        console.error("Get event error:", error);
        return { success: false, error: error.message };
    }
}

// Increment event clicks
export async function incrementEventClicks(eventId) {
    try {
        await updateDoc(doc(db, "events", eventId), {
            clicks: increment(1)
        });
        return { success: true };
    } catch (error) {
        console.error("Increment clicks error:", error);
        return { success: false, error: error.message };
    }
}

// Update event
export async function updateEvent(eventId, updateData) {
    try {
        await updateDoc(doc(db, "events", eventId), {
            ...updateData,
            updatedAt: new Date().toISOString()
        });

        return { success: true };
    } catch (error) {
        console.error("Update event error:", error);
        return { success: false, error: error.message };
    }
}
