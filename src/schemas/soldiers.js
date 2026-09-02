import * as z from "zod";

const RANK_NAMES = {
	0: "private",
	1: "corporal",
	2: "sergeant",
	3: "lieutenant",
	4: "captain",
	5: "major",
	6: "colonel",
};

const idSchema = z
	.string()
	.regex(/^\d+$/, { message: "the id must contain only numbers." })
	.length(7);

const limitationSchema = z
	.array(
		z.string().trim().min(1, "limitation string cannot be empty").toLowerCase(),
	)
	.min(1, "Limitations list cannot be empty")
	.refine((items) => new Set(items).size === items.length, {
		message: "Array must not contain duplicate items",
	});

const soldierIdSchema = z.object({
	id: idSchema,
});

const soldierLimitationSchema = z
	.object({
		limitations: limitationSchema,
	})
	.strict();

const baseSoldierObject = z
	.object({
		_id: idSchema,
		name: z.string().trim().min(3).max(50),
		rankValue: z.coerce.number().gte(0).lte(6).optional(),
		rankName: z.string().optional(),
		limitations: limitationSchema.optional(),
	})
	.strict();

const rankvalidationRefine = (allowEmpty = false) => [
	(data) => {
		const rankValue = data.rankValue;
		const rankName = data.rankName;

		if (rankValue !== undefined && rankName !== undefined)
			return RANK_NAMES[rankValue] === rankName;
		else if (rankName !== undefined)
			return Object.values(RANK_NAMES).includes(rankName);
		else if (rankValue !== undefined) return rankValue in RANK_NAMES;
		return allowEmpty;
	},
	{
		message: "rankName or rankValue doesn't match the requirements.",
	},
];

const soldierSchema = baseSoldierObject.refine(...rankvalidationRefine(false));

const soldierQuerySchema = baseSoldierObject
	.omit({ _id: true })
	.partial()
	.extend({
		limitations: z
			.union([
				z
					.string()
					.transform((val) =>
						val
							? val.split(",").filter((item) => item.trim() !== "")
							: undefined,
					),
				z.array(z.string()),
			])
			.optional()
			.pipe(limitationSchema.optional()),
	})
	.refine(...rankvalidationRefine(true));

export {
	soldierIdSchema,
	soldierLimitationSchema,
	soldierQuerySchema,
	soldierSchema,
};
