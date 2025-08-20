import request from "supertest";
import { jest } from "@jest/globals";
import app from "../../app.js";
import User from "../../models/User.js";

describe("Auth Routes", () => {
  const registerUrl = "/api/auth/register";
  const loginUrl = "/api/auth/login";

  const validUserData = {
    username: "testuser",
    email: "testuser@example.com",
    password: "password123",
  };
  const validLoginData = {
    email: "testuser@example.com",
    password: "password123",
  };

  it("should return 201 for succesfull registration", async () => {
    const response = await request(app)
      .post(registerUrl)
      .send(validUserData)
      .expect(201);
    expect(response.body).toHaveProperty(
      "message",
      "User registered successfully"
    );
    const user = await User.findOne({ email: validUserData.email });
    expect(user).not.toBeNull();
    expect(user.username).toBe(validUserData.username);
  });

  it("should return 400 for duplicate username", async () => {
    await request(app).post(registerUrl).send(validUserData).expect(201);
    const response = await request(app)
      .post(registerUrl)
      .send(validUserData)
      .expect(400);
    expect(response.body).toHaveProperty("errors");
    expect(response.body.errors[0].message).toBe(
      "User already exists with this username or email"
    );
  });

  it("should return 400 for invalid email format", async () => {
    const invalidUserData = { ...validUserData, email: "invalid-email" };
    const response = await request(app)
      .post(registerUrl)
      .send(invalidUserData)
      .expect(400);
    expect(response.body).toHaveProperty("errors");
    expect(response.body.errors[0].message).toBe("Invalid email format");
  });

  it("should return 400 for password less than 6 characters", async () => {
    const invalidUserData = { ...validUserData, password: "123" };
    const response = await request(app)
      .post(registerUrl)
      .send(invalidUserData)
      .expect(400);
    expect(response.body).toHaveProperty("errors");
    expect(response.body.errors[0].message).toBe(
      "Password must be at least 6 characters long"
    );
  });

  it("should return 200 for successful login", async () => {
    await request(app)
      .post(registerUrl)
      .send({
        username: "testuser",
        email: validLoginData.email,
        password: validLoginData.password,
      })
      .expect(201);
    const response = await request(app).post(loginUrl).send(validLoginData);

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("accessToken");
    expect(response.body).toHaveProperty("user");
    expect(response.body.user.email).toBe(validLoginData.email);
    expect(response.body.user.username).toBe("testuser");
    expect(response.body.user).toHaveProperty("id");
    expect(response.headers["set-cookie"]).toBeDefined();
    expect(response.headers["set-cookie"][0]).toMatch(/refreshToken=/);
    expect(response.headers["set-cookie"][0]).toMatch(/HttpOnly/);
  });
});
