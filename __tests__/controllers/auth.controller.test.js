import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import { redisClient } from "@config/redis-client.js";
import User from "../../models/User.js";
import {
  registerHandler,
  loginHandler,
  refreshTokenHandler,
  logoutHandler,
  infoHandler,
} from "../../controllers/auth.controller";
import { BadRequestError } from "../../errors/BadRequestError.js";
import { NotFoundError } from "../../errors/NotFound.js";

jest.mock("../../models/User.js");
jest.mock("uuid");

describe("Auth Controller Tests", () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      body: {},
      params: {},
      user: { userId: "mockUserId123" },
      cookies: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };
    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  describe("Register Handler", () => {
    it("should register a new user successfully", async () => {
      mockReq.body = {
        username: "testUser",
        email: "testUser@example.com",
        password: "testPassword",
      };

      User.findOne = jest.fn().mockResolvedValue(null);

      const mockInstance = {
        save: jest.fn().mockResolvedValue(true),
      };

      User.mockImplementation(() => mockInstance);

      await registerHandler(mockReq, mockRes, mockNext);

      expect(User.findOne).toHaveBeenCalledWith({
        email: "testUser@example.com",
      });
      expect(User).toHaveBeenCalledWith({
        username: "testUser",
        email: "testUser@example.com",
        password: "testPassword",
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockInstance.save).toHaveBeenCalled();
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "User registered successfully",
      });
    });

    it("should throw BadRequestError if user already exists", async () => {
      mockReq.body = {
        username: "existingUser",
        email: "existingUser@example.com",
        password: "existingPassword",
      };

      User.findOne = jest.fn().mockResolvedValue(true);

      await expect(registerHandler(mockReq, mockRes)).rejects.toThrow(
        BadRequestError
      );
      expect(User.findOne).toHaveBeenCalledWith({
        email: "existingUser@example.com",
      });
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.send).not.toHaveBeenCalled();
    });
  });

  describe("Login Handler", () => {
    it("should login user and return tokens when credentials are valid", async () => {
      mockReq.body = {
        email: "test@example.com",
        password: "password123",
      };

      const mockUser = {
        _id: "userId123",
        username: "testuser",
        email: "test@example.com",
        password: "hashedPassword",
      };

      User.findOne = jest.fn().mockResolvedValue(mockUser);

      jest.spyOn(bcrypt, "compare").mockResolvedValue(true);

      const mockAccessToken = "mock-access-token";
      const mockRefreshToken = "mock-refresh-token";
      const mockTokenId = "mock-token-id";

      jest.spyOn(jwt, "sign").mockReturnValueOnce(mockAccessToken);

      jest.spyOn(jwt, "sign").mockReturnValueOnce(mockRefreshToken);

      redisClient.set = jest.fn().mockResolvedValue(true);

      uuidv4.mockReturnValue(mockTokenId);

      await loginHandler(mockReq, mockRes, mockNext);

      expect(User.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        "password123",
        "hashedPassword"
      );
      expect(jwt.sign).toHaveBeenCalledTimes(2);
      expect(redisClient.set).toHaveBeenCalledWith(
        `refresh-Token:userId123`,
        mockRefreshToken,
        expect.objectContaining({
          EX: expect.any(Number),
          NX: true,
        })
      );
      expect(mockRes.cookie).toHaveBeenCalledWith(
        "refreshToken",
        mockRefreshToken,
        expect.objectContaining({
          httpOnly: true,
          sameSite: "strict",
          maxAge: expect.any(Number),
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({
        accessToken: mockAccessToken,
        user: {
          id: "userId123",
          username: "testuser",
          email: "test@example.com",
        },
      });
    });
    it("should throw BadRequestError when user not found", async () => {
      //
      mockReq.body = {
        email: "nonexistent@example.com",
        password: "password123",
      };

      User.findOne.mockResolvedValue(null);

      await expect(loginHandler(mockReq, mockRes)).rejects.toThrow(
        BadRequestError
      );
      expect(User.findOne).toHaveBeenCalledWith({
        email: "nonexistent@example.com",
      });
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should throw BadRequestError when password is invalid", async () => {
      mockReq.body = {
        email: "test@example.com",
        password: "wrongpassword",
      };

      const mockUser = {
        _id: "userId123",
        email: "test@example.com",
        password: "hashedPassword",
      };

      User.findOne.mockResolvedValue(mockUser);

      bcrypt.compare.mockResolvedValue(false);

      await expect(loginHandler(mockReq, mockRes)).rejects.toThrow(
        BadRequestError
      );
      expect(User.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        "wrongpassword",
        "hashedPassword"
      );
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe("Refresh Token Handler", () => {
    it("should issue new access token with valid refresh token", async () => {
      const mockRefreshToken = "valid-refresh-token";
      mockReq.cookies.refreshToken = mockRefreshToken;

      const decodedToken = { userId: "userId123" };
      jest.spyOn(jwt, "verify").mockReturnValue(decodedToken);

      redisClient.get = jest.fn().mockResolvedValue(mockRefreshToken);

      const mockAccessToken = "new-access-token";
      const mockTokenId = "new-token-id";

      jwt.sign.mockReturnValue(mockAccessToken);
      uuidv4.mockReturnValue(mockTokenId);

      await refreshTokenHandler(mockReq, mockRes, mockNext);

      expect(jwt.verify).toHaveBeenCalledWith(
        mockRefreshToken,
        process.env.JWT_REFRESH_SECRET
      );
      expect(redisClient.get).toHaveBeenCalledWith(`refresh-Token:userId123`);
      expect(jwt.sign).toHaveBeenCalledWith(
        { userId: "userId123" },
        process.env.JWT_ACCESS_SECRET,
        expect.objectContaining({
          expiresIn: expect.any(String),
          jwtid: mockTokenId,
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        accessToken: mockAccessToken,
      });
    });
    it("should throw BadRequestError when no refresh token provided", async () => {
      mockReq.cookies = {};

      await expect(refreshTokenHandler(mockReq, mockRes)).rejects.toThrow(
        BadRequestError
      );
      expect(jwt.verify).not.toHaveBeenCalled();
      expect(redisClient.get).not.toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should throw BadRequestError when refresh token is invalid", async () => {
      const mockRefreshToken = "invalid-refresh-token";
      mockReq.cookies = { refreshToken: mockRefreshToken };

      const decodedToken = { userId: "userId123" };
      jwt.verify.mockReturnValue(decodedToken);

      redisClient.get.mockResolvedValue(null);

      await expect(refreshTokenHandler(mockReq, mockRes)).rejects.toThrow(
        BadRequestError
      );
      expect(jwt.verify).toHaveBeenCalled();
      expect(redisClient.get).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should throw error when JWT verification fails", async () => {
      const mockRefreshToken = "expired-refresh-token";
      mockReq.cookies = { refreshToken: mockRefreshToken };

      jwt.verify.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      await expect(refreshTokenHandler(mockReq, mockRes)).rejects.toThrow(
        "Invalid token"
      );
      expect(jwt.verify).toHaveBeenCalled();
      expect(redisClient.get).not.toHaveBeenCalled();
    });
  });

  describe("Logout Handler", () => {
    it("should logout user successfully", async () => {
      mockReq.user = {
        userId: "userId123",
        jti: "token-id-123",
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      redisClient.del = jest.fn().mockResolvedValue(true);
      redisClient.set = jest.fn().mockResolvedValue(true);

      await logoutHandler(mockReq, mockRes);

      expect(redisClient.del).toHaveBeenCalledWith(`refresh-Token:userId123`);
      expect(redisClient.set).toHaveBeenCalledWith(
        `denylist:token-id-123`,
        "revoked",
        expect.objectContaining({ EX: expect.any(Number) })
      );
      expect(mockRes.clearCookie).toHaveBeenCalledWith(
        "refreshToken",
        expect.objectContaining({
          httpOnly: true,
          sameSite: "strict",
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Logged out successfully",
      });
    });

    it("should handle logout with expired token", async () => {
      mockReq.user = {
        userId: "userId123",
        jti: "token-id-123",
        exp: Math.floor(Date.now() / 1000) - 3600,
      };

      redisClient.del.mockResolvedValue(1);

      await logoutHandler(mockReq, mockRes);

      expect(redisClient.del).toHaveBeenCalledWith(`refresh-Token:userId123`);
      expect(redisClient.set).not.toHaveBeenCalled();
      expect(mockRes.clearCookie).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe("Info Handler", () => {
    it("should return user information", async () => {
      mockReq.user = { userId: "userId123" };

      const mockUser = {
        _id: "userId123",
        username: "testuser",
        email: "test@example.com",
        password: "hashedPassword",
      };

      const mockSelect = jest.fn().mockResolvedValue(mockUser);
      User.findById = jest.fn().mockReturnValue({ select: mockSelect });

      await infoHandler(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith("userId123");
      expect(mockSelect).toHaveBeenCalledWith("-password");
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({
        user: {
          id: "userId123",
          username: "testuser",
          email: "test@example.com",
        },
      });
    });

    it("should throw NotFoundError when user not found", async () => {
      mockReq.user = { userId: "nonexistentId" };

      const mockSelect = jest.fn().mockResolvedValue(null);
      User.findById = jest.fn().mockReturnValue({ select: mockSelect });

      await expect(infoHandler(mockReq, mockRes)).rejects.toThrow(
        NotFoundError
      );
      expect(User.findById).toHaveBeenCalledWith("nonexistentId");
      expect(mockSelect).toHaveBeenCalledWith("-password");
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });
});
