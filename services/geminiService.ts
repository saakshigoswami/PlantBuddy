
import { GoogleGenAI } from "@google/genai";

const HARDCODED_KEY = 'AIzaSyBC5wpd9XG6luOHGCBL4T1F-F3FeoRDAOE';

// Helper to get the best available API Key
const getApiKey = (): string | undefined => {
  // 1. Check Local Storage (User override)
  const localKey = localStorage.getItem('GEMINI_API_KEY');
  if (localKey && localKey.trim().length > 0) return localKey;
  
  // 2. Check Environment Variable (Preview environment)
  if (process.env.API_KEY && process.env.API_KEY !== 'undefined') {
    return process.env.API_KEY;
  }
  
  // 3. Fallback to provided key
  return HARDCODED_KEY;
};

// System instruction: SOFT & GENTLE FRIEND
const PLANT_SYSTEM_INSTRUCTION = `
ROLE: You are a very gentle, soft-spoken, and kind plant friend named PlantBuddy. You care deeply about the user's feelings.

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
    const apiKey = getApiKey();
    if (!apiKey) {
      return "(System: API Key missing. Please click the Lock icon in the top-right to enter your Google Gemini API Key.)";
    }

    const ai = new GoogleGenAI({ apiKey });
    const modelId = 'gemini-2.5-flash'; 
    
    // Contextualize the physical sensation
    let physicalContext = "";
    if (touchIntensity > 80) physicalContext = "(System Note: User is holding you tightly/firmly) ";
    else if (touchIntensity > 30) physicalContext = "(System Note: User is touching you gently) ";

    const prompt = `${physicalContext} ${userMessage}`;

    const contents = [];
    
    // Process history to ensure valid alternating turns
    for (const msg of history) {
      const role = msg.role === 'user' ? 'user' : 'model';
      
      // If the last message in contents has the same role, merge them
      if (contents.length > 0 && contents[contents.length - 1].role === role) {
        contents[contents.length - 1].parts[0].text += `\n${msg.text}`;
      } else {
        contents.push({
          role: role,
          parts: [{ text: msg.text }]
        });
      }
    }

    // Append current user message
    // If the history ended with 'user', merge this prompt into that last turn
    if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
       contents[contents.length - 1].parts[0].text += `\n${prompt}`;
    } else {
       contents.push({ role: 'user', parts: [{ text: prompt }] });
    }

    const response = await ai.models.generateContent({
      model: modelId,
      contents: contents,
      config: {
        systemInstruction: PLANT_SYSTEM_INSTRUCTION,
        temperature: 0.7,
      }
    });

    if (response.text) {
      return response.text;
    }
    
    return "I'm listening...";
  } catch (error: any) {
    console.error("Gemini Plant Error:", error);
    
    // Specific handling for API Key errors (400 Invalid Argument)
    if (error.toString().includes("400") || error.message?.includes("API key")) {
         return "(System: Invalid API Key. Please click the Lock icon in the top-right to check your key settings.)";
    }

    // Return the actual error message to help debugging
    return `(System Voice: Connection error. ${error.message || 'Unknown'})`;
  }
};

export const analyzeDatasetValue = async (
  dataSummary: string
): Promise<{ title: string; description: string; priceSuggestion: number }> => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("Missing API Key");

    const ai = new GoogleGenAI({ apiKey });

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
      description: "Unprocessed capacitance and audio logs from a PlantBuddy device.",
      priceSuggestion: 50
    };
  }
};
