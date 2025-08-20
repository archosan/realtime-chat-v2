import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { BadRequestError } from "../errors/BadRequestError.js";
import { NotFoundError } from "../errors/NotFound.js";
import User from "../models/User.js";
import { redisClient } from "../config/redis-client.js";

const registerHandler = async (req, res) => {
  const { username, email, password } = req.body;

  const existingUser = await User.findOne({
    email,
  });

  if (existingUser) {
    throw new BadRequestError(
      "User already exists with this username or email"
    );
  }

  const user = new User({
    username,
    email,
    password,
  });
  await user.save();

  res.status(201).send({
    message: "User registered successfully",
  });
};

const loginHandler = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    throw new BadRequestError("Invalid email or password");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new BadRequestError("Invalid email or password");
  }

  const accesTokenId = uuidv4();
  const accessToken = jwt.sign(
    { userId: user._id },
    process.env.JWT_ACCESS_SECRET,
    {
      expiresIn: process.env.JWT_ACCESS_EXPIRE || "1h",
      jwtid: accesTokenId,
    }
  );

  const refreshToken = jwt.sign(
    { userId: user._id },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRE || "7d",
    }
  );

  await redisClient.set(`refresh-Token:${user._id}`, refreshToken, {
    EX: 7 * 24 * 60 * 60,
    NX: true,
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.status(200).send({
    accessToken,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
    },
  });
};

const refreshTokenHandler = async (req, res, next) => {
  const { refreshToken } = req.cookies;
  if (!refreshToken) {
    throw new BadRequestError("No refresh token provided");
  }
  const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

  const storedToken = await redisClient.get(`refresh-Token:${decoded.userId}`);
  if (!storedToken || storedToken !== refreshToken) {
    throw new BadRequestError("Invalid refresh token");
  }

  const accessTokenId = uuidv4();
  const newAccessToken = jwt.sign(
    { userId: decoded.userId },
    process.env.JWT_ACCESS_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRATION || "15m",
      jwtid: accessTokenId,
    }
  );

  res.status(200).json({
    accessToken: newAccessToken,
  });
};
const logoutHandler = async (req, res) => {
  const { userId, jti, exp } = req.user;

  await redisClient.del(`refresh-Token:${userId}`);

  const remainingTime = exp - Math.floor(Date.now() / 1000);
  if (remainingTime > 0) {
    await redisClient.set(`denylist:${jti}`, "revoked", {
      EX: remainingTime,
    });
  }

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  res.status(200).send({ message: "Logged out successfully" });
};
const infoHandler = async (req, res) => {
  const user = await User.findById(req.user.userId).select("-password");
  if (!user) {
    throw new NotFoundError("User not found");
  }

  res.status(200).send({
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
    },
  });
};

export {
  registerHandler,
  loginHandler,
  refreshTokenHandler,
  logoutHandler,
  infoHandler,
};
