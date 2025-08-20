import express from "express";
import { body } from "express-validator";
import {
  registerHandler,
  loginHandler,
  refreshTokenHandler,
  logoutHandler,
  infoHandler,
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { validateRequest } from "../middlewares/validateRequest.js";

const router = express.Router();
/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Create a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: Name of user.
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address of user.
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Password for user. At least 6 characters long.
 *     responses:
 *       201:
 *         description: User registered successfully.
 *       400:
 *         description: User already exists with this username or email.
 */
router.post(
  "/register",
  [
    body("username").notEmpty().withMessage("Username is required"),
    body("email").isEmail().withMessage("Invalid email format"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
  ],
  validateRequest,
  registerHandler
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login endpoint
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address.
 *               password:
 *                 type: string
 *                 format: password
 *                 description: User's password.
 *     responses:
 *       200:
 *         description: User logged in successfully, returns access and refresh tokens.
 *       400:
 *         description: Invalid email or password.
 */
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Invalid email format"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  validateRequest,
  loginHandler
);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh token endpoint
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: returns a new access token.
 *       400:
 *         description: Invalid refresh token.
 *       401:
 *        description: Unauthorized, user not authenticated.
 */
router.post("/refresh", requireAuth, refreshTokenHandler);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: User logout endpoint
 *     tags: [Auth]
 *     security:
 *      - bearerAuth: []
 *     description: Logs out the user by clearing the refresh token from cookies.
 *     responses:
 *       200:
 *         description: User logged out successfully.
 *       401:
 *         description: Unauthorized, user not authenticated.
 */
router.post("/logout", requireAuth, logoutHandler);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user information
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Returns the current user's information.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   description: Id of the user.
 *                 username:
 *                   type: string
 *                   description: Username of the user.
 *                 email:
 *                   type: string
 *                   format: email
 *                   description: Email address of the user.
 *       401:
 *         description: Unauthorized, user not authenticated.
 */
router.get("/me", requireAuth, infoHandler);

export default router;
