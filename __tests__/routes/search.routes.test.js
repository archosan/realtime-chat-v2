import { beforeAll, beforeEach, jest } from "@jest/globals";
import app from "../../app.js";
import request from "supertest";
import { elasticsearchClient } from "@config/elasticsearch.js";
import { getAuthToken } from "../helpers/auth.helper.js";

describe("Search Routes", () => {
  let authToken;
  beforeAll(async () => {
    authToken = await getAuthToken();
  });

  const validSearchQuery = "test message";
  const searchUrl = "/api/search/messages";

  it("should return 200 for valid search query", async () => {
    const mockMessages = [
      { id: "msg1", content: "This is a test message" },
      { id: "msg2", content: "Another test about something" },
    ];

    const mockSearchFn = jest.fn().mockResolvedValue({
      hits: { total: { value: 1 }, hits: [{ _source: mockMessages[0] }] },
    });

    elasticsearchClient.mockReturnValue({
      search: mockSearchFn,
    });

    const response = await request(app)
      .get(searchUrl)
      .set("Authorization", `Bearer ${authToken}`)
      .query({ q: validSearchQuery })
      .expect(200);

    expect(response.body).toHaveProperty("messages");
    expect(Array.isArray(response.body.messages)).toBe(true);
  });

  it("should return 400 for missing search query", async () => {
    const response = await request(app)
      .get(searchUrl)
      .set("Authorization", `Bearer ${authToken}`)
      .query({ q: "" })
      .expect(400);

    expect(response.body).toHaveProperty("errors");
    expect(response.body.errors[0].message).toBe(
      "Search query 'q' cannot be empty."
    );
  });

  it("should return 401 for unauthorized access", async () => {
    const response = await request(app)
      .get(searchUrl)
      .query({ q: validSearchQuery })
      .expect(401);
    expect(response.body).toHaveProperty("errors");
    expect(response.body.errors[0].message).toBe(
      "No token provided or invalid token format"
    );
  });

  it("should return 404 if no messages found", async () => {
    elasticsearchClient.mockReturnValue({
      search: jest.fn().mockResolvedValue({
        hits: { total: { value: 0 }, hits: [] },
      }),
    });

    const response = await request(app)
      .get(searchUrl)
      .set("Authorization", `Bearer ${authToken}`)
      .query({ q: "nonexistent" })
      .set("Authorization", `Bearer ${authToken}`)
      .expect(404);
    expect(response.body).toHaveProperty("message");
    expect(response.body.message).toBe("No messages found");
  });

  it("should validate search query format", async () => {
    const response = await request(app)
      .get(searchUrl)
      .query({ q: "" })
      .set("Authorization", `Bearer ${authToken}`)
      .expect(400);

    expect(response.body).toHaveProperty("errors");
    expect(response.body.errors[0].message).toBe(
      "Search query 'q' cannot be empty."
    );
  });
});
