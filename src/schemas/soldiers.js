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

const NAME_TO_RANK = Object.fromEntries(
	Object.entries(RANK_NAMES).map(([val, name]) => [name, Number(val)]),
);

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
		rankName: z.enum(Object.values(RANK_NAMES)).optional(),
		limitations: limitationSchema.optional(),
	})
	.strict();

const soldierSchema = baseSoldierObject
	.refine(
		(data) => {
			const rankName = data.rankName;
			const rankValue = data.rankValue;

			if (rankName !== undefined && rankValue !== undefined)
				return RANK_NAMES[rankValue] === rankName;
			if (rankName === undefined && rankValue === undefined) return false;
			return true;
		},
		{
			message: "rankValue or rankName doesn't match the requirements.",
		},
	)
	.transform((data) => {
		const result = { ...data };
		const rankName = result.rankName;
		const rankValue = result.rankValue;

		const finalValue =
			rankValue !== undefined ? rankValue : NAME_TO_RANK[rankName];
		const finalName =
			rankName !== undefined ? rankName : RANK_NAMES[finalValue];

		result.rank = {
			name: finalName,
			value: finalValue,
		};

		delete result.rankValue;
		delete result.rankName;

		return result;
	});

const soldierQuerySchema = baseSoldierObject
	.omit({ _id: true })
	.partial()
	.extend({
		limitations: z
			.string()
			.transform((val) => val.split(",").filter((item) => item.trim() !== ""))
			.optional()
			.pipe(limitationSchema.optional()),
	})
	.refine(
		(data) => {
			const rankName = data.rankName;
			const rankValue = data.rankValue;

			if (rankName !== undefined && rankValue !== undefined)
				return RANK_NAMES[rankValue] === rankName;
			return true;
		},
		{
			message: "rank doesn't match the requirements.",
		},
	);

const soldierPatchSchema = baseSoldierObject
	.omit({ _id: true })
	.partial()
	.refine(
		(data) => {
			const rankName = data.rankName;
			const rankValue = data.rankValue;

			if (rankName !== undefined && rankValue !== undefined)
				return RANK_NAMES[rankValue] === rankName;
			return true;
		},
		{
			message: "rankValue or rankName doesn't match the requirements.",
		},
	)
	.transform((data) => {
		const result = { ...data };
		const rankName = result.rankName;
		const rankValue = result.rankValue;

		const hasRank = rankValue !== undefined || rankName !== undefined;

		if (hasRank) {
			const finalValue =
				rankValue !== undefined ? rankValue : NAME_TO_RANK[rankName];
			const finalName =
				rankName !== undefined ? rankName : RANK_NAMES[finalValue];

			result.rank = {
				name: finalName,
				value: finalValue,
			};
			delete result.rankValue;
			delete result.rankName;
		}

		return result;
	});

export {
	soldierIdSchema,
	soldierLimitationSchema,
	soldierPatchSchema,
	soldierQuerySchema,
	soldierSchema,
};
