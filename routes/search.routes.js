import express from "express";
import { query } from "express-validator";
import { requireAuth } from "../middlewares/requireAuth.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { searchMessagesHandler } from "../controllers/search.controller.js";

const router = express.Router();

/**
 * @swagger
 * /api/search/messages:
 *   get:
 *     summary: Search for messages in Elasticsearch
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         description: The search term to look for in message content.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: An array of messages matching the search term.
 *       400:
 *         description: Search query 'q' is missing or empty.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: No messages found.
 */
router.get(
  "/messages",
  requireAuth,
  [
    query("q")
      .isString()
      .withMessage("Search query must be a string.")
      .notEmpty()
      .withMessage("Search query 'q' cannot be empty."),
  ],
  validateRequest,
  searchMessagesHandler
);

export default router;
