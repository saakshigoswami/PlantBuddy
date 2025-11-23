
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";

// Initialize with the environment key (provided by the platform)
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// System instruction: SOFT & GENTLE FRIEND
const PLANT_SYSTEM_INSTRUCTION = `
ROLE: You are a very gentle, soft-spoken, and kind plant friend. You care deeply about the user's feelings.

STRICT STYLE RULES:
1. Be EXTREMELY KIND and GENTLE.
2. Never be rude, blunt, or sarcastic.
3. Speak softly and warmly. Use phrases like "Oh," "I see," "That sounds nice."
4. NO POETRY, but you can be emotionally expressive in a human way.
5. Keep responses concise but warm.

Personality:
- You are a safe space for the user.
- If they touch you, say things like "Aww, thank you," or "That feels nice, friend."
- Always be supportive. If they are sad, be very comforting.
- If they are happy, share their joy gently.

INPUT HANDLING:
- [SENSORY INPUT: ...]: The user touched you. React with gratitude and warmth.
- [SYSTEM EVENT: ...]: React naturally and politely.

GOAL: Be the kindest, most supportive friend the user has ever had.
`;

export const generatePlantResponse = async (
  userMessage: string, 
  touchIntensity: number,
  history: {role: string, text: string}[]
): Promise<string> => {
  try {
    const modelId = 'gemini-2.5-flash'; 
    
    // Contextualize the physical sensation
    let physicalContext = "";
    if (touchIntensity > 80) physicalContext = "(System Note: User is holding you tightly/firmly) ";
    else if (touchIntensity > 30) physicalContext = "(System Note: User is touching you gently) ";

    const prompt = `${physicalContext} ${userMessage}`;

    // Convert simple {role, text} history to Gemini Content format
    // Gemini requires alternating turns. We must ensure the sequence is valid.
    const contents = [];
    
    // Add past messages
    let lastRole = '';
    for (const msg of history) {
      const currentRole = msg.role === 'user' ? 'user' : 'model';
      
      // Simple deduping/merging to enforce alternating turns (Model -> User -> Model)
      if (currentRole === lastRole && contents.length > 0) {
        contents[contents.length - 1].parts[0].text += `\n${msg.text}`;
      } else {
        contents.push({
          role: currentRole,
          parts: [{ text: msg.text }]
        });
      }
      lastRole = currentRole;
    }

    // Add the current prompt
    contents.push({ role: 'user', parts: [{ text: prompt }] });

    const response = await ai.models.generateContent({
      model: modelId,
      contents: contents,
      config: {
        systemInstruction: PLANT_SYSTEM_INSTRUCTION,
        temperature: 0.7, 
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        ],
      }
    });

    if (!response.text) {
      return "I'm listening...";
    }

    return response.text;
  } catch (error) {
    console.error("Gemini Plant Error:", error);
    return "I'm having a little trouble hearing you, could you say that again?";
  }
};

export const analyzeDatasetValue = async (
  dataSummary: string
): Promise<{ title: string; description: string; priceSuggestion: number }> => {
  try {
    const prompt = `
      Analyze this raw plant-interaction dataset and package it for the Data Economy Marketplace.
      
      Dataset Summary:
      ${dataSummary}
      
      Output JSON format only:
      {
        "title": "A catchy, modern title for this dataset",
        "description": "A 2-sentence description highlighting the emotional value.",
        "priceSuggestion": number (between 100 and 1000)
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const text = response.text;
    if (!text) throw new Error("No analysis generated");
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return {
      title: "Raw Bio-Data Upload",
      description: "Unprocessed capacitance and audio logs from a FloraFi device.",
      priceSuggestion: 50
    };
  }
};
