import { GoogleGenAI, Type } from "@google/genai";
import { NoteData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to convert file to base64
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:image/jpeg;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const analyzeSheetMusic = async (base64Image: string, mimeType: string): Promise<NoteData[]> => {
  try {
    const prompt = `
      Act as an expert music theorist and optical music recognition engine.
      Analyze this image of sheet music carefully.
      
      Steps:
      1. Identify the Clef (assume Treble Clef / Sol Anahtarı if not obvious).
      2. Read the notes from left to right.
      3. Pay extreme attention to the vertical position of the note head on the staff lines and spaces to determine the correct Pitch.
      4. Identify the duration of each note based on the note head (filled/hollow) and stems/flags.
      
      If there are chords (multiple notes stacked), ONLY pick the top note (the melody).
      
      Return a strict JSON array of notes.
      
      For each note, provide:
      - "pitch": The scientific pitch notation (e.g., "C4", "D5", "F#4", "B3"). Use "R" for rests.
      - "duration": The rhythmic value relative to a quarter note. 
         (Quarter note = 1.0, Half note = 2.0, Whole note = 4.0, Eighth note = 0.5, Sixteenth = 0.25).
      
      Examples:
      - A note on the bottom line of Treble clef is E4.
      - A note in the bottom space of Treble clef is F4.
      - A note on the second line of Treble clef is G4 (Sol).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            notes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  pitch: { type: Type.STRING, description: "Scientific pitch notation like C4, D#5, or R for rest" },
                  duration: { type: Type.NUMBER, description: "Duration relative to quarter note (1.0)" }
                },
                required: ["pitch", "duration"]
              }
            }
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No data returned from Gemini");

    const parsed = JSON.parse(jsonText);
    
    // Add IDs to notes for React keys
    return parsed.notes.map((n: any, i: number) => ({
      ...n,
      id: `generated-${Date.now()}-${i}`
    }));

  } catch (error) {
    console.error("Error analyzing sheet music:", error);
    throw error;
  }
};
