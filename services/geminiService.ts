
import { GoogleGenAI } from "@google/genai";

const HARDCODED_KEY = 'AIzaSyBC5wpd9XG6luOHGCBL4T1F-F3FeoRDAOE';

// Helper to get the best available API Key
const getApiKey = (): string | undefined => {
  // 1. Check Local Storage (User override)
  const localKey = localStorage.getItem('GEMINI_API_KEY');
  if (localKey && localKey.trim().length > 0) return localKey.trim();
  
  // 2. Check Environment Variable (Vite uses import.meta.env)
  const envKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
  if (envKey && envKey !== 'undefined' && envKey.trim().length > 0) {
    return envKey.trim();
  }
  
  // 3. Fallback to provided key (for development only)
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
  const MAX_RETRIES = 2;
  let lastError: any = null;
  
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const apiKey = getApiKey();
      if (!apiKey) {
        return "(System: API Key missing. Please click the Lock icon in the top-right to enter your Google Gemini API Key.)";
      }

      const ai = new GoogleGenAI({ apiKey });
      // Use correct model name - gemini-1.5-flash is the current stable model
      const modelId = 'gemini-1.5-flash'; 
    
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
      lastError = error;
      
      // Don't retry on API key errors
      const errorMessage = error?.message || error?.toString() || String(error);
      const errorStr = errorMessage.toLowerCase();
      
      if (errorStr.includes("api key") || errorStr.includes("invalid") || errorStr.includes("401") || errorStr.includes("403")) {
        break; // Don't retry
      }
      
      // Retry on rate limits or network errors
      if (attempt < MAX_RETRIES && (errorStr.includes("rate limit") || errorStr.includes("429") || errorStr.includes("network") || errorStr.includes("timeout"))) {
        console.log(`Retrying Gemini API call (attempt ${attempt + 1}/${MAX_RETRIES + 1})...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Exponential backoff
        continue;
      }
      
      // If not retrying, break and handle error
      break;
    }
  }
  
  // Handle final error after retries
  console.error("Gemini Plant Error:", lastError);
  
  // Handle specific error types
  const errorMessage = lastError?.message || lastError?.toString() || String(lastError || 'Unknown error');
  const errorStr = errorMessage.toLowerCase();
  
  // API Key errors
  if (errorStr.includes("api key") || errorStr.includes("invalid") || errorStr.includes("401") || errorStr.includes("403")) {
    return "(System: Invalid or missing API Key. Please click the Lock icon in the top-right to enter your Google Gemini API Key.)";
  }
  
  // Rate limit / Quota errors
  if (errorStr.includes("quota") || errorStr.includes("rate limit") || errorStr.includes("429")) {
    return "(System: API quota exceeded. Please try again later or check your Gemini API quota.)";
  }
  
  // Network errors
  if (errorStr.includes("network") || errorStr.includes("fetch") || errorStr.includes("timeout")) {
    return "(System: Network error. Please check your internet connection and try again.)";
  }
  
  // Return a user-friendly error message
  return `(System: ${errorMessage.slice(0, 100)})`;
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
      model: 'gemini-1.5-flash',
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
