import { rabbitmqClient } from "@config/rabbitmq-client.js";
import { QUEUE_NAME } from "@config/constant.js";
import { startMessageConsumer } from "../../consumers/message.consumer.js";
import { mockChannel } from "../../__mocks__/rabbitmq-client.js";

describe("startMessageConsumer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.consumeCallback = null;
  });
  it("should initialize RabbitMQ consumer with correct parameters", async () => {
    await startMessageConsumer();

    expect(rabbitmqClient).toHaveBeenCalled();
    expect(mockChannel.assertQueue).toHaveBeenCalledWith(QUEUE_NAME, {
      durable: true,
    });
    expect(mockChannel.prefetch).toHaveBeenCalledWith(1);
    expect(mockChannel.consume).toHaveBeenCalledWith(
      QUEUE_NAME,
      expect.any(Function),
      { noAck: false }
    );
  });
});
