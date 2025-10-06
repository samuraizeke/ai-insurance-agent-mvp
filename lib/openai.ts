import OpenAI from "openai";

export function getOpenAI() {
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) throw new Error("Missing OPENAI_API_KEY env.");
return new OpenAI({ apiKey });
}

export function getModel() {
return process.env.AI_MODEL || "gpt-4o-mini"; // change to any available model
}