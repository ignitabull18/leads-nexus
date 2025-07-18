import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';
import { leadCategorySchema } from '../db/schema';

// Initialize Google AI provider
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '',
});

// Schema for extracted lead information
const extractedLeadSchema = z.object({
  name: z.string().describe('Full name of the person or organization'),
  email: z.string().email().optional().describe('Email address if found'),
  bio: z.string().describe('Brief biography or description of the lead'),
  category: leadCategorySchema.describe('Category of the lead based on their role'),
  socialLinks: z.array(z.object({
    platform: z.string(),
    url: z.string().url(),
  })).optional().describe('Social media or professional profile links'),
  expertise: z.array(z.string()).optional().describe('Areas of expertise or topics they cover'),
  organization: z.string().optional().describe('Current company or organization affiliation'),
  location: z.string().optional().describe('Geographic location if mentioned'),
});

export type ExtractedLead = z.infer<typeof extractedLeadSchema>;

export const entityExtractionService = {
  /**
   * Extract lead information from scraped content
   */
  async extractLeadFromContent(content: string, sourceUrl: string): Promise<ExtractedLead | null> {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      throw new Error('GOOGLE_GENERATIVE_AI_API_KEY environment variable is not set');
    }

    try {
      const { text } = await generateText({
        model: google('gemini-1.5-flash'),
        prompt: `Extract lead/contact information from the following content and return as JSON. 
        
Content from URL: ${sourceUrl}

${content}

Instructions:
- Extract information about a person or organization that could be a valuable lead
- Determine the most appropriate category: influencer, journalist, or publisher
- Extract contact information if available
- Provide a concise but informative bio
- Include any social media links or professional profiles
- Note areas of expertise or topics they cover
- If no clear lead information is found, return null

Return the data in this exact JSON format:
{
  "name": "Full name of the person or organization",
  "email": "email@example.com or null",
  "bio": "Brief biography or description",
  "category": "influencer" | "journalist" | "publisher",
  "socialLinks": [{"platform": "Twitter", "url": "https://twitter.com/username"}],
  "expertise": ["topic1", "topic2"],
  "organization": "Company name or null",
  "location": "Geographic location or null"
}

Return ONLY valid JSON, no markdown formatting or explanations.`,
      });

      // Parse the JSON response
      try {
        const parsed = JSON.parse(text);
        const validated = extractedLeadSchema.parse(parsed);
        return validated;
      } catch (parseError) {
        console.error('Failed to parse AI response:', text);
        return null;
      }
    } catch (error) {
      console.error('Entity extraction error:', error);
      return null;
    }
  },

  /**
   * Extract multiple leads from content (for pages listing multiple people)
   */
  async extractMultipleLeads(content: string, sourceUrl: string): Promise<ExtractedLead[]> {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      throw new Error('GOOGLE_GENERATIVE_AI_API_KEY environment variable is not set');
    }

    try {
      const { text } = await generateText({
        model: google('gemini-1.5-flash'),
        prompt: `Extract all lead/contact information from the following content and return as JSON. 
        
Content from URL: ${sourceUrl}

${content}

Instructions:
- Extract information about ALL people or organizations that could be valuable leads
- For each lead, determine the most appropriate category: influencer, journalist, or publisher
- Extract contact information if available for each
- Provide a concise but informative bio for each
- Include any social media links or professional profiles
- Note areas of expertise or topics they cover
- Return an empty array if no lead information is found

Return the data in this exact JSON format:
{
  "leads": [
    {
      "name": "Full name of the person or organization",
      "email": "email@example.com or null",
      "bio": "Brief biography or description",
      "category": "influencer" | "journalist" | "publisher",
      "socialLinks": [{"platform": "Twitter", "url": "https://twitter.com/username"}],
      "expertise": ["topic1", "topic2"],
      "organization": "Company name or null",
      "location": "Geographic location or null"
    }
  ]
}

Return ONLY valid JSON, no markdown formatting or explanations.`,
      });

      // Parse the JSON response
      try {
        const parsed = JSON.parse(text);
        const validatedArray = z.array(extractedLeadSchema).parse(parsed.leads || []);
        return validatedArray;
      } catch (parseError) {
        console.error('Failed to parse AI response:', text);
        return [];
      }
    } catch (error) {
      console.error('Multiple entity extraction error:', error);
      return [];
    }
  },

  /**
   * Generate a combined bio/description for embedding
   */
  generateEmbeddingText(lead: ExtractedLead): string {
    const parts = [
      lead.name,
      lead.category,
      lead.bio,
    ];

    if (lead.organization) {
      parts.push(`Works at ${lead.organization}`);
    }

    if (lead.expertise && lead.expertise.length > 0) {
      parts.push(`Expert in: ${lead.expertise.join(', ')}`);
    }

    if (lead.location) {
      parts.push(`Located in ${lead.location}`);
    }

    return parts.filter(Boolean).join('. ');
  },
};