import { elasticsearchClient } from "../config/elasticsearch.js";
import { BadRequestError } from "../errors/BadRequestError.js";

export const searchMessagesHandler = async (req, res) => {
  const { q } = req.query;

  if (!q || q.trim() === "") {
    throw new BadRequestError("Search query cannot be empty.");
  }
  const es = await elasticsearchClient();

  const response = await es.search({
    index: "messages",
    query: {
      match: {
        content: {
          query: q,
          fuzziness: "AUTO",
        },
      },
    },
  });

  if (response.hits.total.value === 0) {
    return res.status(404).json({ message: "No messages found" });
  }

  const messages = response.hits.hits.map((hit) => hit._source);

  res.status(200).json({ messages, source: "elasticsearch" });
};
