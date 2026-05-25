/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from '@google/genai';

// Initialize the GoogleGenAI client lazily to avoid startup crashes if key is omitted
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not configured in environment secrets. AI summarization is running in offline preview mode.');
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

/**
 * Summarize student notes with Gemini AI
 */
export async function summarizeNoteContent(title: string, content: string): Promise<string> {
  const ai = getAiClient();
  if (!ai) {
    return `### Offline Preview Summary: ${title}\n(Configure GEMINI_API_KEY in Settings > Secrets for real-time live AI synthesis!)\n\nThis note discusses key design paradigms and essential software components related to "${title}". Standard elements include architectural patterns, modular divisions, and responsive frameworks.`;
  }

  try {
    const prompt = `Synthesize and summarize the following student note concisely. Ensure you pull out a structured bulleted summary, 3 key takeaways, and action items.

Note Title: ${title}

Content:
${content}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction: 'You are an elite academic tutor assisting students. Synthesize summaries cleanly in markdown.'
      }
    });

    return response.text || 'Unable to generate summary.';
  } catch (err: any) {
    console.error('Gemini API Error (generateContent):', err);
    return `### AI Summarization Failed\nDetail: ${err.message || 'System error'}. Correct key mappings inside Settings > Secrets can fix this!`;
  }
}

/**
 * Generate interactive study guide or quiz questions from note content
 */
export async function generateStudyGuide(title: string, content: string): Promise<string> {
  const ai = getAiClient();
  if (!ai) {
    return `### Offline Study Guide & Quiz: ${title}\n(Configure GEMINI_API_KEY to generate full dynamic quizzes!)\n\n#### Sample Q1: What makes ${title} crucial for final practical exams?\n- **Answer**: It forms the basis of foundational review guidelines.`;
  }

  try {
    const prompt = `Based on these lecture/collaboration notes, compile an interactive study guide. Include:
1. A brief "Concept Glossary" defining key terms.
2. 3 multiple-choice study quiz questions with answers marked under an accordion.
3. 2 open-ended essay prompt assignments for practical final review.

Note Title: ${title}

Content:
${content}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction: 'You are a warm, helpful university professor building interactive study materials.'
      }
    });

    return response.text || 'Unable to build study guide.';
  } catch (err: any) {
    console.error('Gemini API Error (generateStudyGuide):', err);
    return `### AI Study Guide Construction Failed\nError: ${err.message || 'Unavailable'}.`;
  }
}
