import * as z from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const objectIdSchema = z
	.object({
		_id: z
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
		startTime: z
			.string()
			.datetime()
			.refine((val) => new Date(val) > new Date(), {
				message: "Start time must be in the future",
			}),
		endTime: z.string().datetime(),
		constraints: constraintsSchema,
		soldiersRequired: z.number().positive(),
		value: z.number().positive(),
		minRank: z.number().min(0).max(6).optional(),
		maxRank: z.number().min(0).max(6).optional(),
	})
	.strict();

const rankRefine = (data) => {
	if (data.minRank !== undefined && data.maxRank !== undefined)
		return data.minRank < data.maxRank;
	return true;
};

const dutyScehma = baseDutySchema
	.refine((data) => data.startTime < data.endTime, {
		message: "End time must be after the start time",
		path: ["endTime"],
	})
	.refine((data) => rankRefine(data));

const getDutySchema = baseDutySchema
	.omit({ location: true })
	.partial()
	.extend({
		location: z
			.string()
			.transform((val) => {
				const items = val
					.split(",")
					.filter((item) => item.trim() !== "")
					.map(Number);
				return items.length > 0 ? items : undefined;
			})
			.transform((val) => ({ type: "Point", coordinates: val }))
			.pipe(GeoJsonPointSchema)
			.optional(),

		constraints: z
			.string()
			.transform((val) => {
				const items = val.split(",").filter((item) => item.trim() !== "");
				return items.length > 0 ? items : undefined;
			})
			.pipe(constraintsSchema)
			.optional(),

		startTime: z
			.string()
			.datetime()
			.refine((val) => new Date(val) > new Date(), {
				message: "Start time must be in the future",
			})
			.optional(),

		minRank: z.coerce.number().min(0).max(6).optional(),
		maxRank: z.coerce.number().min(0).max(6).optional(),
		soldiersRequired: z.coerce.number().positive().optional(),
		value: z.coerce.number().positive().optional(),

		status: z.enum(["unscheduled", "scheduled", "canceled"]).optional(),
	})
	.refine(
		(data) => {
			if (data.startTime !== undefined && data.endTime !== undefined)
				return data.startTime < data.endTime;
			return true;
		},
		{
			message: "End time must be after the start time",
			path: ["endTime"],
		},
	)
	.refine(
		(data) => {
			if (data.startTime === undefined && data.endTime !== undefined)
				return new Date(data.endTime) > new Date();
			return true;
		},
		{
			message: "End time must be in the future",
			path: ["endTime"],
		},
	)
	.refine((data) => rankRefine(data), {
		message: "minRank must be below maxRank",
	})
	.refine((data) => Object.keys(data).length > 0, {
		message: "At least one filter must be provided",
	});

const patchDutyScehma = z
	.object({
		name: z.string().min(3).max(50).optional(),
		description: z.string().min(1).max(100).optional(),
		location: GeoJsonPointSchema.optional(),
		startTime: z.string().datetime().optional(),
		endTime: z.string().datetime().optional(),
		constraints: z.array(z.string()).optional(),
		soldiersRequired: z.coerce.number().positive().optional(),
		value: z.coerce.number().positive().optional(),
		minRank: z.coerce.number().min(0).max(6).optional(),
		maxRank: z.coerce.number().min(0).max(6).optional(),
	})
	.strict()
	.refine(
		(data) => {
			if (data.startTime && data.endTime) return data.startTime < data.endTime;
			return true;
		},
		{
			message: "End time must be after the start time",
			path: ["endTime"],
		},
	)
	.refine((data) => Object.keys(data).length > 0, {
		message: "At least one property must be provided",
	})
	.refine((data) => rankRefine(data));

export {
	dutyScehma,
	GeoJsonPointSchema,
	getDutySchema,
	objectIdSchema,
	patchDutyScehma,
};
