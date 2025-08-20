import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { jest } from "@jest/globals";

jest.mock("@config/elasticsearch");
jest.mock("@config/redis-client.js");

jest.mock("@config/rabbitmq-client.js", () =>
  jest.requireActual("../__mocks__/rabbitmq-client.js")
);
let mongo;

beforeAll(async () => {
  process.env.JWT_ACCESS_SECRET = "your_access_secret";
  process.env.JWT_REFRESH_SECRET = "your_refresh_secret";
  mongo = await MongoMemoryServer.create();
  const mongoUri = mongo.getUri();
  await mongoose.connect(mongoUri);
});

beforeEach(async () => {
  if (mongoose.connection.db) {
    const collections = await mongoose.connection.db.collections();

    for (const collection of collections) {
      await collection.deleteMany({});
    }
  }

  jest.clearAllMocks();
});

afterAll(async () => {
  if (mongo) {
    await mongo.stop();
  }
  await mongoose.connection.close();
});
