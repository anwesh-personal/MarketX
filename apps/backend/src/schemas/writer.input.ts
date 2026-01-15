import { z } from "zod";

// 02-Writer-Input Schema
export const WriterInputSchema = z.object({
    run_id: z.string().uuid().optional(),
    run_type: z.enum(["ON_DEMAND", "DAILY_SCHEDULED"]),
    icp: z.object({
        icp_id: z.string(),
    }),
    offer: z.object({
        offer_id: z.string(),
    }),
    generation_requests: z.object({
        website: z.object({
            page_types: z.array(z.enum(["LANDING", "HOW_IT_WORKS", "PRICING_PHILOSOPHY"])),
        }),
    }),
    previous_calendar_day: z.string().optional(), // ISO date string for analytics window
});

export type WriterInput = z.infer<typeof WriterInputSchema>;
