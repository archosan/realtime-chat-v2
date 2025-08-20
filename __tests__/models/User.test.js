import mongoose from "mongoose";
import User from "../../models/User.js";

describe("User Model", () => {
  it("should correctly create and save a user with valid data", async () => {
    const validUserData = {
      username: "testuser",
      email: "testuser@example.com",
      password: "password123",
    };

    const user = new User(validUserData);
    const savedUser = await user.save();

    expect(savedUser._id).toBeDefined();
    expect(savedUser.username).toBe(validUserData.username);
    expect(savedUser.email).toBe(validUserData.email);
    expect(savedUser.createdAt).toBeDefined();

    expect(savedUser.createdAt).toBeDefined();
  });

  it("should hash the password before saving", async () => {
    const plainPassword = "password123";
    const user = new User({
      username: "testuser2",
      email: "testuser2@example.com",
      password: plainPassword,
    });

    const savedUser = await user.save();

    expect(savedUser.password).toBeDefined();
    expect(savedUser.password).not.toBe(plainPassword);
  });

  it("should return validation errors for missing required fields", async () => {
    const user = new User({
      username: "testuser3",

      password: "password123",
    });

    let error;
    try {
      await user.save();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.name).toBe("ValidationError");
    expect(error.errors.email).toBeDefined();
  });

  it("should update the updatedAt field on save", async () => {
    const user = new User({
      username: "testuser5",
      email: "testuser5@example.com",
      password: "password123",
    });

    const savedUser = await user.save();
    const firstUpdatedAt = savedUser.updatedAt;

    expect(firstUpdatedAt).toBeDefined();
    expect(firstUpdatedAt).toBeInstanceOf(Date);

    savedUser.username = "updateduser";
    const updatedUser = await savedUser.save();
    expect(updatedUser.updatedAt).toBeDefined();
    expect(updatedUser.updatedAt).not.toEqual(firstUpdatedAt);
  });
});
