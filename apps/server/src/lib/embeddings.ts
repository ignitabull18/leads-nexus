import { embed, embedMany } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

// Initialize Google AI provider
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '',
});

// Create embedding service
export const embeddingsService = {
  /**
   * Generate embedding for a given text using Google's embedding model
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      throw new Error('GOOGLE_GENERATIVE_AI_API_KEY environment variable is not set');
    }

    try {
      const { embedding } = await embed({
        model: google.textEmbeddingModel('text-embedding-004', {
          outputDimensionality: 1536,
        }),
        value: text,
      });

      return embedding;
    } catch (error) {
      console.error('Failed to generate embedding:', error);
      throw new Error('Failed to generate embedding for the provided text');
    }
  },

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      throw new Error('GOOGLE_GENERATIVE_AI_API_KEY environment variable is not set');
    }

    try {
      const { embeddings } = await embedMany({
        model: google.textEmbeddingModel('text-embedding-004', {
          outputDimensionality: 1536,
        }),
        values: texts,
      });

      return embeddings;
    } catch (error) {
      console.error('Failed to generate embeddings:', error);
      throw new Error('Failed to generate embeddings for the provided texts');
    }
  },
};