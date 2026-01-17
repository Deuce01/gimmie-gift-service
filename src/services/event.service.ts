// Event service is a thin wrapper around the event repository
import {
    eventRepository,
    CreateEventData,
} from '../repositories/event.repository';

export class EventService {
    /**
     * Track a user event (view, click, save)
     */
    async trackEvent(data: CreateEventData) {
        return eventRepository.createEvent(data);
    }

    /**
     * Get user's event history
     */
    async getUserEvents(userId: string, limit?: number) {
        return eventRepository.getUserEvents(userId, limit);
    }
}

export const eventService = new EventService();
