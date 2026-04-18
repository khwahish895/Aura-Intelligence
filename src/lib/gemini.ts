import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getProductRecommendations(currentProduct: any, allProducts: any[]) {
  try {
    const prompt = `Based on this product: ${JSON.stringify(currentProduct)}, 
      recommend 3 similar products from this list: ${JSON.stringify(allProducts.slice(0, 50))}.
      Return ONLY a JSON array of product IDs.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Failed to get recommendations:", error);
    return [];
  }
}

export async function getSearchSuggestions(query: string, products: string[]) {
  try {
    const prompt = `User search query: "${query}". 
      Available product names: ${products.join(", ")}.
      Provide 5 relevant autocomplete suggestions based on these.
      Return ONLY a JSON array of strings.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Failed to get search suggestions:", error);
    return [];
  }
}
