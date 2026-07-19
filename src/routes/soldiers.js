import express from "express";
import { pino } from "pino";
import * as z from "zod";
import config from "../config.js";
import connectSoldiersCollection from "../soldiersDB.js";

const logger = pino(config.logLevel);

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
		limitations: z.array(z.string()).optional(),
	})
	.strict()
	.refine(
		(data) => {
			const rankValue = data["rankValue"];
			const rankName = data["rankName"];

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

const soldierGetSchema = z.object({
	name: z.string().min(3).max(50).optional(),
	rankValue: z.coerce.number().gte(0).lte(6).optional(),
	rankName: z.string().optional(),
	limitations: z.array(z.string()).optional(),
});

const soldierLimitationSchema = z.object({
	limitations: z.array(z.string())
}).strict();

function createSoldierRouter(client) {
	const router = express.Router();

	router.post("/", async (req, res) => {
		try {
			const validatedSoldier = soldierSchema.parse(req.body);

			if (validatedSoldier.limitations) {
				validatedSoldier.limitations = validatedSoldier.limitations.map(
					(limitation) => limitation.toLowerCase(),
				);
			}

			validatedSoldier["createdAt"] = new Date();
			validatedSoldier["updatedAt"] = new Date();

			const soldiersCollection = connectSoldiersCollection(client);

			await soldiersCollection.insertOne(validatedSoldier);

			logger.info("post request for /soldiers endpoint was successful.");

			return res.status(201).json({
				message: `soldier was added successfully, \n${JSON.stringify(validatedSoldier)}`,
			});
		} catch (err) {
			logger.error("error with /soldiers post request.");
			if (err instanceof z.ZodError)
				return res.status(400).json({
					status: "error",
					message: `there was a problem with the soldier information given \n${err}`,
				});
			res
				.status(400)
				.json({ status: "error", message: `there was a problem. \n${err}` });
		}
	});

	router.get("/:id", async (req, res) => {
		try {
			const soldierToFind = req.params.id;

			soldierIdSchema.parse({ _id: soldierToFind });

			const soldiersCollection = connectSoldiersCollection(client);

			const soldierInDB = await soldiersCollection.findById(soldierToFind);

			if (soldierInDB)
				return res.status(200).json({
					message: `soldier was found ${JSON.stringify(soldierInDB)} `,
				});

			return res
				.status(404)
				.json({ status: "error", message: "soldier was not found." });
		} catch (err) {
			if (err instanceof z.ZodError) {
				return res.status(400).json({
					status: "error",
					message: `there was a problem. \n${err.message}`,
				});
			}
			return res
				.status(400)
				.json({ status: "error", message: `there was a problem. \n${err}` });
		}
	});

	router.get("/", async (req, res) => {
		try {
			let { name, rankValue, rankName, limitations, ...rest } = req.query;

			if (limitations) {
				limitations = limitations.split(",");
			}

			if (Object.keys(rest).length > 0) {
				return res.status(400).json({
					status: "error",
					message: `unknown parameters were given - ${Object.keys(rest).join(", ")}`,
				});
			}

			const validatedSearch = soldierGetSchema.parse({
				name,
				rankValue,
				rankName,
				limitations,
			});

			const filter = Object.fromEntries(
				Object.entries(validatedSearch).filter(
					([key, value]) => value !== undefined && value !== null,
				),
			);
			const soldierCollection = connectSoldiersCollection(client);
			const soldiersFound = await soldierCollection.find(filter);

			return res.status(200).json(soldiersFound);
		} catch (err) {
			if (err instanceof z.ZodError) {
				return res.status(400).json({
					status: "error",
					message: `there was a problem. \n${err.message}`,
				});
			}
			return res
				.status(400)
				.json({ status: "error", message: `there was a problem. \n${err}` });
		}
	});

	router.delete("/:id", async (req, res) => {
		try {
			const validatedSoldierId = soldierIdSchema.parse({ _id: req.params.id });

			const soldierCollection = connectSoldiersCollection(client);

			const deleteResponse =
				await soldierCollection.deleteById(validatedSoldierId);

			if (!deleteResponse.deletedCount)
				return res
					.status(404)
					.json({ status: "error", message: "soldier wasn't found" });

			return res.sendStatus(204);
		} catch (err) {
			if (err instanceof z.ZodError) {
				return res.status(400).json({
					status: "error",
					message: `there was a validation problem. \n${err.message}`,
				});
			}
			return res
				.status(400)
				.json({ status: "error", message: `there was a problem. \n${err}` });
		}
	});

	router.patch("/:id", async (req,res) => {
		try{
			const validatedSoldierId = soldierIdSchema.parse({ _id: req.params.id });

			const validatedSoldier = soldierSchema.parse(req.body);
			
			if (validatedSoldier._id !== validatedSoldierId._id)
				return res.status(400).json({status:"error",message:"the 'id' field is immutable and cannot be modified."})

			validatedSoldier.updatedAt = new Date();

			const soldierCollection = connectSoldiersCollection(client);

			const patchResponse = await soldierCollection.updateById(validatedSoldierId,validatedSoldier);

			if (!(patchResponse.modifiedCount === 1))
				return res.status(404).json({status:"error",message:"solider wasn't found or couldn't be changed"})

			res.status(200).json({message:`new Solider:${JSON.stringify(validatedSoldier)}`})

		}catch(err){
			if (err instanceof z.ZodError) {
				return res.status(400).json({
					status: "error",
					message: `there was a validation problem. \n${err.message}`,
				});
			}
			return res
				.status(400)
				.json({ status: "error", message: `there was a problem. \n${err}` });
		}
	});

	router.patch("/:id/limitations", async (req,res) => {
		try{
			const validatedSoldierId = soldierIdSchema.parse({ _id: req.params.id });
			let newLimitations = soldierLimitationSchema.parse(req.body);
			const updatedAt = new Date();

			const soldierCollection = connectSoldiersCollection(client);

			const patchResponse = await soldierCollection.updateLimitationsById(validatedSoldierId,newLimitations,updatedAt); 

			if (!(patchResponse.modifiedCount === 1))
				return res.status(404).json({status:"error",message:"solider wasn't found or couldn't be changed"})

			res.status(200).json({message:`new limitations:${JSON.stringify(newLimitations.limitations)}`})

		}catch(err){
			if (err instanceof z.ZodError) {
				return res.status(400).json({
					status: "error",
					message: `there was a validation problem. \n${err.message}`,
				});
			}
			return res
				.status(400)
				.json({ status: "error", message: `there was a problem. \n${err}` });
		}
	});

	return router;
}

export default createSoldierRouter;
