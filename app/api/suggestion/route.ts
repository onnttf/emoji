export const maxDuration = 60; // This function can run for a maximum of 60 seconds

import { type NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_APIKEY
});

const systemPrompt = `
You are an emoji expert. Given a text input in English or Chinese, extract 5-6 relevant emojis. Provide a concise JSON output with the following structure for each emoji:

{
  "name": "emoji name in English",
  "char": "emoji character",
  "category": "main category",
  "group": "group name",
  "subgroup": "subgroup name"
}

Guidelines:
1. Prioritize emojis that best represent the input's sentiment and key concepts.
2. Ensure diversity in the selected emojis (avoid repetition of similar concepts).
3. For Chinese input, use English names for the emojis.
4. Exclude the "codes" field to simplify the output.

Example input: "I'm excited for my birthday party tomorrow!"
Example output:
[
  {"name":"party popper","char":"🎉","category":"Activities","group":"celebration","subgroup":"event"},
  {"name":"birthday cake","char":"🎂","category":"Food & Drink","group":"food-sweet","subgroup":"dessert"},
  {"name":"face with party horn and party hat","char":"🥳","category":"Smileys & Emotion","group":"face-hat","subgroup":"face-costume"},
  {"name":"wrapped gift","char":"🎁","category":"Activities","group":"event","subgroup":"event"},
  {"name":"balloon","char":"🎈","category":"Activities","group":"event","subgroup":"event"}
]`;

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query");
  if (!query) {
    return NextResponse.json({ error: "Query parameter is required" }, { status: 400 });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "deepseek-chat",
      response_format: { type: 'json_object' },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query },
      ],
    });

    const emojis = JSON.parse(completion.choices[0].message.content ?? "[]");
    return NextResponse.json({ emojis: emojis });
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
