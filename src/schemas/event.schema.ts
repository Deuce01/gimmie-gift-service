import { z } from 'zod';
import { EventType } from '@prisma/client';

export const eventRequestSchema = z.object({
    userId: z.string().uuid('Invalid user ID format'),
    productId: z.string().uuid('Invalid product ID format'),
    eventType: z.nativeEnum(EventType, {
        errorMap: () => ({ message: 'Invalid event type' }),
    }),
});

export type EventRequest = z.infer<typeof eventRequestSchema>;
