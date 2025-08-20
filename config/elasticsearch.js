import { Client } from "@elastic/elasticsearch";
import { logger } from "./logger.js";

let esClientInstance = null;

const getEsClient = async () => {
  if (!esClientInstance) {
    logger.info("Creating new Elasticsearch client instance...");

    esClientInstance = new Client({
      node: process.env.ELASTICSEARCH_URL || "http://localhost:9200",
    });
  }

  try {
    await esClientInstance.ping();
    logger.info("Successfully connected to Elasticsearch");
    return esClientInstance;
  } catch (error) {
    logger.error("Elasticsearch connection error:", error);

    esClientInstance = null;
    throw error;
  }
};

export const elasticsearchClient = getEsClient;
