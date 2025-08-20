import { elasticsearchClient } from "@config/elasticsearch";
import { BadRequestError } from "../../errors/BadRequestError.js";
import { searchMessagesHandler } from "../../controllers/search.controller.js";

describe("Search Controller Tests", () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      body: {},
      params: {},
      user: { userId: "mockUserId123" },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
    };
    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  it("should return 400 if search query is empty", async () => {
    mockReq.query = {};

    await expect(
      searchMessagesHandler(mockReq, mockRes, mockNext)
    ).rejects.toThrow(BadRequestError);

    expect(mockRes.status).not.toHaveBeenCalled();
    expect(mockRes.json).not.toHaveBeenCalled();
  });

  it("should return 404 if no messages found", async () => {
    mockReq.query = { q: "nonexistent" };

    const esMock = {
      search: jest.fn().mockResolvedValue({
        hits: { total: { value: 0 }, hits: [] },
      }),
    };
    elasticsearchClient.mockReturnValue(esMock);

    await searchMessagesHandler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({ message: "No messages found" });
  });

  it("should return messages if found", async () => {
    mockReq.query = { q: "test" };

    const mockMessages = [
      { content: "test message 1", senderId: "user1" },
      { content: "test message 2", senderId: "user2" },
    ];

    const esMock = {
      search: jest.fn().mockResolvedValue({
        hits: {
          total: { value: 2 },
          hits: mockMessages.map((msg) => ({ _source: msg })),
        },
      }),
    };
    elasticsearchClient.mockReturnValue(esMock);

    await searchMessagesHandler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      messages: mockMessages,
      source: "elasticsearch",
    });
  });

  it("should handle internal server error", async () => {
    mockReq.query = { q: "error" };

    const esMock = {
      search: jest.fn().mockRejectedValue(new Error("Elasticsearch error")),
    };
    elasticsearchClient.mockReturnValue(esMock);

    await expect(searchMessagesHandler(mockReq, mockRes)).rejects.toThrow();

    expect(mockRes.status).not.toHaveBeenCalled();
    expect(mockRes.json).not.toHaveBeenCalled();
  });
});
