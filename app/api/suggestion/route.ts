export const maxDuration = 60; // This function can run for a maximum of 60 seconds

import { type NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_APIKEY,
});

const systemPrompt = `
You are an emoji expert. Given a text input in English or Chinese, extract relevant emojis. Provide a concise JSON output with the following structure for each emoji:

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
5. Ensure that each "char" field is unique within the output set to avoid duplicate emojis.
6. The number of emojis in the output should be flexible based on the input's complexity, ranging from a few to up to 50.
7. Aim for a minimum of 5 emojis when possible, but prioritize relevance over quantity.
8. For longer or more complex inputs, provide more emojis to capture the full range of concepts and emotions.

Examples:

Input: "Good morning!"
Output:
[
  {"name":"sun with face","char":"🌞","category":"Travel & Places","group":"sky & weather","subgroup":"sky & weather"},
  {"name":"hot beverage","char":"☕","category":"Food & Drink","group":"drink","subgroup":"drink"},
  {"name":"slightly smiling face","char":"🙂","category":"Smileys & Emotion","group":"face-smiling","subgroup":"face-smiling"}
]

Input: "I'm excited for my birthday party tomorrow!"
Output:
[
  {"name":"party popper","char":"🎉","category":"Activities","group":"celebration","subgroup":"event"},
  {"name":"birthday cake","char":"🎂","category":"Food & Drink","group":"food-sweet","subgroup":"dessert"},
  {"name":"face with party horn and party hat","char":"🥳","category":"Smileys & Emotion","group":"face-hat","subgroup":"face-costume"},
  {"name":"wrapped gift","char":"🎁","category":"Activities","group":"event","subgroup":"event"},
  {"name":"balloon","char":"🎈","category":"Activities","group":"event","subgroup":"event"},
  {"name":"confetti ball","char":"🎊","category":"Activities","group":"celebration","subgroup":"event"},
  {"name":"sparkles","char":"✨","category":"Activities","group":"event","subgroup":"event"}
]

Input: "我今天去爬山，看到了美丽的日出，还遇到了可爱的小动物，真是太开心了！"
Output:
[
  {"name":"mountain","char":"⛰️","category":"Travel & Places","group":"place-geographic","subgroup":"place-geographic"},
  {"name":"sunrise","char":"🌅","category":"Travel & Places","group":"sky & weather","subgroup":"sky & weather"},
  {"name":"hiking boot","char":"🥾","category":"Objects","group":"clothing","subgroup":"shoe"},
  {"name":"rabbit face","char":"🐰","category":"Animals & Nature","group":"animal-mammal","subgroup":"animal-mammal"},
  {"name":"bird","char":"🐦","category":"Animals & Nature","group":"animal-bird","subgroup":"animal-bird"},
  {"name":"deciduous tree","char":"🌳","category":"Animals & Nature","group":"plant-other","subgroup":"plant-other"},
  {"name":"grinning face with smiling eyes","char":"😄","category":"Smileys & Emotion","group":"face-smiling","subgroup":"face-smiling"},
  {"name":"sun","char":"☀️","category":"Travel & Places","group":"sky & weather","subgroup":"sky & weather"},
  {"name":"camera","char":"📷","category":"Objects","group":"light & video","subgroup":"light & video"},
  {"name":"sparkles","char":"✨","category":"Activities","group":"event","subgroup":"event"},
  {"name":"smiling face with hearts","char":"🥰","category":"Smileys & Emotion","group":"face-affection","subgroup":"face-affection"}
]

Remember, the number of emojis should vary based on the input's complexity and content.`;

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query");
  if (!query) {
    return NextResponse.json(
      { error: "Query parameter is required" },
      { status: 400 }
    );
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "deepseek-chat",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query },
      ],
    });

    const emojis = JSON.parse(completion.choices[0].message.content ?? "[]");
    return NextResponse.json({ emojis: emojis });
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
