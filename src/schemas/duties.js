import * as z from "zod";

const GeoJsonPointSchema = z.object({
    type: z.literal("Point"),
    coordinates: z
        .array(z.number())
        .min(2)
        .max(3)
        .refine(
            ([lon, lat]) => lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90,
            {
                message:
                    "Invalid coordinates: Longitude (-180 to 180), Latitude (-90 to 90)",
            },
        ),
});

const dutyScehma = z
    .object({
        name: z.string().min(3).max(50),
        description: z.string().min(1).max(100),
        location: GeoJsonPointSchema,
        startTime: z.string().datetime(),
        endTime: z.string().datetime(),
        constraints: z.array(z.string()),
        soldiersRequired: z.number().positive(),
        value: z.number().positive(),
        minRank: z.number().min(0).max(6).optional(),
        maxRank: z.number().min(0).max(6).optional(),
    })
    .strict()
    .refine((data) => data.startTime < data.endTime, {
        message: "End time must be after the start time",
        path: ["endTime"],
    });

export {GeoJsonPointSchema,dutyScehma}