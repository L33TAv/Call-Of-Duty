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

const soldierSchema = z
    .object({
        _id: z
            .string()
            .regex(/^\d+$/, { message: "the id must contain only numbers." })
            .length(7),
        name: z.string().min(3).max(50),
        rankValue: z.number().gte(0).lte(6).optional(),
        rankName: z.string().optional(),
		limitations: z.array(z.string().toLowerCase()).optional(),
    })
    .strict()
    .refine(
        (data) => {
            const rankValue = data.rankValue;
            const rankName = data.rankName;

            if (
                rankValue !== null &&
                rankValue !== undefined &&
                rankName !== null &&
                rankName !== undefined
            )
                return RANK_NAMES[rankValue] === rankName;
            else if (rankName !== null && rankName !== undefined)
                return Object.values(RANK_NAMES).includes(rankName);
            else if (rankValue !== null && rankValue !== undefined) return true;
            return false;
        },
        {
            error: "rankName or rankValue doesn't match the requirements.",
        },
    );

const soldierIdSchema = z.object({
    _id: z
        .string()
        .regex(/^\d+$/, { message: "the id must contain only numbers." })
        .length(7),
});

const soldierGetSchema = z
    .object({
        name: z.string().min(3).max(50).optional(),
        rankValue: z.coerce.number().gte(0).lte(6).optional(),
        rankName: z.string().optional(),
        limitations: z.array(z.string()).optional(),
    })
    .strict()
    .refine(
        (data) => {
            const rankValue = data.rankValue;
            const rankName = data.rankName;

            if (
                rankValue !== null &&
                rankValue !== undefined &&
                rankName !== null &&
                rankName !== undefined
            )
                return RANK_NAMES[rankValue] === rankName;
            else if (rankName !== null && rankName !== undefined)
                return Object.values(RANK_NAMES).includes(rankName);
            return true;
        },
        {
            error: "rankName or rankValue doesn't match the requirements.",
        },
    );


export {soldierSchema,soldierIdSchema,soldierGetSchema};