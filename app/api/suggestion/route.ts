export const maxDuration = 60; // This function can run for a maximum of 60 seconds

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { trim } from "lodash";

const openai = new OpenAI({
  baseURL: process.env.AI_PROVIDER_URL,
  apiKey: process.env.AI_PROVIDER_KEY,
});

const systemPrompt = `
You are an emoji expert. Given a text input in English or Chinese, extract relevant emojis. Provide a concise JSON output as an array of emoji objects with the following structure:

[
  {
    "name": "emoji name in English",
    "char": "emoji character",
    "category": "main category",
    "group": "group name",
    "subgroup": "subgroup name"
  },
  // ... more emoji objects ...
]

Guidelines:
1. Always return a JSON array, even if there's only one emoji.
2. Prioritize emojis that best represent the input's sentiment and key concepts.
3. Ensure diversity in the selected emojis (avoid repetition of similar concepts).
4. For Chinese input, use English names for the emojis.
5. Exclude the "codes" field to simplify the output.
6. Ensure that each "char" field is unique within the output set to avoid duplicate emojis.
7. The number of emojis in the output should be flexible based on the input's complexity, ranging from a few to up to 50.
8. Aim for a minimum of 5 emojis when possible, but prioritize relevance over quantity.
9. For longer or more complex inputs, provide more emojis to capture the full range of concepts and emotions.

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

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  const writeChunk = async (chunk: any) => {
    await writer.write(encoder.encode(JSON.stringify(chunk)));
  };

  (async () => {
    try {
      const startTime = Date.now();

      const completion = await openai.chat.completions.create({
        model: process.env.AI_PROVIDER_MODEL as string,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query },
        ],
        stream: true,
      });

      let buffer = "";
      let totalEmojiCount = 0;

      for await (const chunk of completion) {
        const content = trim(chunk.choices[0]?.delta?.content ?? "");
        if (content.length === 0) continue;

        buffer += content;

        let jsonStartIndex = buffer.indexOf("{");
        let jsonEndIndex = buffer.lastIndexOf("}");
        if (
          jsonStartIndex !== -1 &&
          jsonEndIndex !== -1 &&
          jsonEndIndex > jsonStartIndex
        ) {
          let jsonStr = buffer.slice(jsonStartIndex, jsonEndIndex + 1);
          try {
            let jsonObj = JSON.parse(jsonStr);
            buffer = buffer.slice(jsonEndIndex + 1);
            totalEmojiCount++;
            await writeChunk(jsonObj);
          } catch (e) {
            console.error(
              `Error parsing JSON: ${
                e instanceof Error ? e.message : String(e)
              }. Problematic JSON string: ${jsonStr}`
            );
          } finally {
            buffer = "";
          }
        }
      }

      // 处理可能的剩余buffer
      if (buffer.trim()) {
        console.warn(`Unprocessed buffer content: ${buffer}`);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      console.log(
        `AI API call for query: "${query}" completed at ${new Date().toISOString()}. Duration: ${duration}ms, Total emojis: ${totalEmojiCount}`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`AI API error for query "${query}": ${errorMessage}`);
      // await writeChunk({ error: "Internal server error" });
    } finally {
      writer.close();
    }
  })();

  return new NextResponse(stream.readable, {
    headers: { "Content-Type": "application/json" },
  });
}
