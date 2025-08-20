import express from "express";
import { body, param } from "express-validator";
import { requireAuth } from "../middlewares/requireAuth.js";
import { validateRequest } from "../middlewares/validateRequest.js";

import {
  updateUserHandler,
  getUserHandler,
  getAllMessagesByUserId,
  getConversationByUserId,
  getOnlineUsers,
  getOnlineUserCount,
  getIsUserOnline,
  getAllUsersHandler,
} from "../controllers/user.controller.js";

const router = express.Router();

/**
 *  @swagger
 *  /api/users:
 *    get:
 *      summary: Get all users
 *      tags: [Users]
 *      security:
 *        - bearerAuth: []
 *      responses:
 *        200:
 *          description: Returns a list of all users.
 *        404:
 *          description: No users found.
 */
router.get("/", requireAuth, getAllUsersHandler);

/**
 * @swagger
 * /api/users/onlineuser-count:
 *   get:
 *     summary: Get online user count
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Returns the count of online users in redis.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 onlineUserCount:
 *                   type: integer
 *                   example: 5
 *       401:
 *         description: Unauthorized, user not authenticated.
 */
router.get("/onlineuser-count", requireAuth, getOnlineUserCount);

/**
 * @swagger
 * /api/users/online-users:
 *   get:
 *     summary: Get online user list
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Returns online users in redis.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 onlineUsers:
 *                   type: array
 *                   items:
 *                    type: string
 *                    example: "60c72b2f9b1d4c001c8e4f1a"
 *       401:
 *         description: Unauthorized, user not authenticated.
 */
router.get("/online-users", requireAuth, getOnlineUsers);

/**
 * @swagger
 * /api/users/{userId}/edit:
 *   put:
 *     summary: Update a user's profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user to update.
 *     requestBody:
 *       description: Optional fields to update for the user.
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: The new username for the user.
 *               email:
 *                 type: string
 *                 format: email
 *                 description: The new email address for the user.
 *     responses:
 *       200:
 *         description: User updated successfully.
 *       400:
 *         description: Invalid input data (e.g., invalid user ID or email format).
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: User not found.
 */
router.put(
  "/:userId/edit",
  requireAuth,
  [
    param("userId").isMongoId().withMessage("Valid user ID is required."),

    body("username")
      .optional()
      .trim()
      .isLength({ min: 3 })
      .withMessage("Username must be at least 3 characters long."),
    body("email")
      .optional()
      .isEmail()
      .withMessage("Email must be a valid email address.")
      .normalizeEmail(),
  ],
  validateRequest,
  updateUserHandler
);

/**
 * @swagger
 * /api/users/{userId}:
 *   get:
 *     summary: Get a specific user's profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user to retrieve.
 *     responses:
 *       200:
 *         description: Successfully retrieved user profile.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   description: The user's unique ID.
 *                 username:
 *                   type: string
 *                   description: The user's username.
 *                 email:
 *                   type: string
 *                   format: email
 *                   description: The user's email address.
 *       400:
 *         description: Invalid user ID format.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: User not found.
 */
router.get(
  "/:userId",
  requireAuth,
  [param("userId").isMongoId().withMessage("Valid user ID is required.")],
  validateRequest,
  getUserHandler
);

/**
 * @swagger
 * /api/users/{userId}/messages:
 *   get:
 *     summary: Get all messages sent by a specific user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user whose messages are to be retrieved.
 *     responses:
 *       200:
 *         description: An array of messages sent by the user.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   content:
 *                     type: string
 *                   senderId:
 *                     type: string
 *                   conversationId:
 *                     type: string
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *       400:
 *         description: Invalid user ID format.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: No messages found for this user.
 */
router.get(
  "/:userId/messages",
  requireAuth,
  [param("userId").isMongoId().withMessage("Valid user ID is required.")],
  validateRequest,
  getAllMessagesByUserId
);

/**
 * @swagger
 * /api/users/{userId}/conversations:
 *   get:
 *     summary: Get all conversations for a specific user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user whose conversations are to be retrieved.
 *     responses:
 *       200:
 *         description: An array of conversations for the user.
 *       400:
 *         description: Invalid user ID format.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: User not found or no conversations found.
 */
router.get(
  "/:userId/conversations",
  requireAuth,
  [param("userId").isMongoId().withMessage("Valid user ID is required.")],
  validateRequest,
  getConversationByUserId
);

/**
 * @swagger
 * /api/users/{userId}/is-online:
 *   get:
 *     summary: Check if a specific user is online
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user to check.
 *     responses:
 *       200:
 *         description: Returns the online status of the user from redis.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isOnline:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Invalid user ID format.
 *       401:
 *         description: Unauthorized.
 */
router;
router.get(
  "/:userId/is-online",
  requireAuth,
  [param("userId").isMongoId().withMessage("Valid user ID is required.")],
  validateRequest,
  getIsUserOnline
);

export default router;
