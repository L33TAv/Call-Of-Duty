import * as z from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const objectIdSchema = z
	.object({
		id: z
			.string()
			.regex(objectIdRegex, { message: "Invalid MongoDB ObjectId" }),
	})
	.strict();

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

const constraintsSchema = z
	.array(
		z
			.string()
			.trim()
			.min(1, "constraints string cannot be empty")
			.toLowerCase(),
	)
	.refine((items) => new Set(items).size === items.length, {
		message: "Array must not contain duplicate items",
	});

const baseDutySchema = z
	.object({
		name: z.string().min(3).max(50),
		description: z.string().min(1).max(100),
		location: GeoJsonPointSchema,
		startTime: z.coerce.date().refine((val) => val > new Date(), {
			message: "Start time must be in the future",
		}),
		endTime: z.coerce.date().refine((val) => val > new Date(), {
			message: "End time must be in the future",
		}),
		constraints: constraintsSchema,
		soldiersRequired: z.coerce.number().positive(),
		value: z.coerce.number().positive(),
		minRank: z.coerce.number().min(0).max(6).optional(),
		maxRank: z.coerce.number().min(0).max(6).optional(),
	})
	.strict();

const rankRefine = (data) => {
	if (data.minRank !== undefined && data.maxRank !== undefined)
		return data.minRank <= data.maxRank;
	return true;
};

const dutySchema = baseDutySchema
	.refine((data) => data.startTime < data.endTime, {
		message: "End time must be after the start time",
		path: ["endTime"],
	})
	.refine((data) => rankRefine(data));
export {
	dutySchema,
	GeoJsonPointSchema,
	objectIdSchema,
};
