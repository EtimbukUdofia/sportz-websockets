import { Router } from "express";
import { matchIdParamSchema } from "../validation/matches.js";
import {
  createCommentarySchema,
  listCommentaryQuerySchema,
} from "../validation/commentary.js";
import { db } from "../db/db.js";
import { commentary } from "../db/schema.js";
import { desc, eq } from "drizzle-orm";

export const commentaryRouter = Router({ mergeParams: true });

const MAX_LIMIT = 100;

commentaryRouter.get("/", async (req, res) => {
  const paramsParsed = matchIdParamSchema.safeParse(req.params);

  if (!paramsParsed.success) {
    return res.status(400).json({
      error: "Invalid match ID parameter.",
      details: paramsParsed.error.issues,
    });
  }

  const queryParsed = listCommentaryQuerySchema.safeParse(req.query);

  if (!queryParsed.success) {
    return res.status(400).json({
      error: "Invalid query.",
      details: queryParsed.error.issues,
    });
  }

  try {
    const { id: matchId } = paramsParsed.data;
    const { limit = 10 } = queryParsed.data;

    const safeLimit = Math.min(limit, MAX_LIMIT);

    const data = await db
      .select()
      .from(commentary)
      .where(eq(commentary.matchId, matchId))
      .orderBy(desc(commentary.createdAt))
      .limit(safeLimit);

    res.json({ data });
  } catch (error) {
    console.error("Failed to fetch commentary:", error);
    res.status(500).json({ error: "Failed to list commentary." });
  }
});

commentaryRouter.post("/", async (req, res) => {
  const paramsParsed = matchIdParamSchema.safeParse(req.params);

  if (!paramsParsed.success) {
    return res.status(400).json({
      error: "Invalid match ID parameter.",
      details: paramsParsed.error.issues,
    });
  }

  const bodyParsed = createCommentarySchema.safeParse(req.body);

  if (!bodyParsed.success) {
    return res.status(400).json({
      error: "Invalid commentary data.",
      details: bodyParsed.error.issues,
    });
  }

  try {
    const { id: matchId } = paramsParsed.data;
    const commentaryData = bodyParsed.data;

    const [result] = await db
      .insert(commentary)
      .values({
        matchId,
        ...commentaryData,
      })
      .returning();

    res.status(201).json({ data: result });
  } catch (error) {
    if (error.code === "23503") {
      console.error("Referenced match does not exist.");
      return res
        .status(400)
        .json({ error: "Referenced match does not exist." });
    }
    console.error("Failed to create commentary:", error);
    res.status(500).json({ error: "Failed to create commentary." });
  }
});
