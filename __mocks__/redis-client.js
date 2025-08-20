import { jest } from "@jest/globals";

export const redisClient = jest.fn().mockReturnValue({
  // Basic operations
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  ttl: jest.fn(),

  // Set operations
  sMembers: jest.fn(),
  sCard: jest.fn(),
  sIsMember: jest.fn(),
  sAdd: jest.fn(),
  sRem: jest.fn(),
  sUnion: jest.fn(),
  sInter: jest.fn(),

  // Hash operations
  hGet: jest.fn(),
  hSet: jest.fn(),
  hDel: jest.fn(),
  hGetAll: jest.fn(),
  hKeys: jest.fn(),
  hLen: jest.fn(),

  // List operations
  lPush: jest.fn(),
  rPush: jest.fn(),
  lPop: jest.fn(),
  rPop: jest.fn(),
  lRange: jest.fn(),
  lLen: jest.fn(),

  // Connection
  connect: jest.fn(),
  disconnect: jest.fn(),
  ping: jest.fn(),
});
