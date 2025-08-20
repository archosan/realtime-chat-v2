import { jest } from "@jest/globals";

export const elasticsearchClient = jest.fn().mockReturnValue({
  ping: jest.fn(),
  search: jest.fn(),
  index: jest.fn(),
  indices: {
    exists: jest.fn(),
    create: jest.fn(),
  },
});
