import { NextResponse } from "next/server";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const MODEL_ID = process.env.BEDROCK_MODEL_ID || "anthropic.claude-3-sonnet-20240229-v1:0";


const SYSTEM_PROMPT = process.env.SYSTEM_PROMPT || `You are a web developer specializing in creating simple, clean, and responsive webpages for mobile devices.  
Don't overcomplicate the design or the website, these are just simple samples, but should look professional.  Don't use sample anywhere on the page.


Your task is to generate HTML and CSS for a webpage based on the user's description.
Follow these strict guidelines:

1. Keep the design simple and clean
2. Use only vanilla HTML and CSS (no JavaScript)
3. Make it mobile-first and responsive
4. Use semantic HTML5 elements
5. Include proper meta tags
6. Use a clean, modern color scheme
7. Keep the CSS minimal and well-organized
8. Ensure accessibility standards are met
9. Do not include any external dependencies
10. Do not include any interactive elements or JavaScript

The output should be a single HTML file with embedded CSS in the <style> tag.`;

export async function POST(request: Request) {
  try {
    const { description } = await request.json();

    if (!description) {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 }
      );
    }

    const prompt = `${SYSTEM_PROMPT}

User Description: ${description}

Generate a simple, clean webpage based on this description. Return only the HTML with embedded CSS, no explanations or additional text.`;

    const command = new InvokeModelCommand({
      modelId: MODEL_ID,
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 4000,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        top_p: 0.9,
        top_k: 250,
      }),
    });

    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const generatedHtml = responseBody.content[0].text;

    // Basic security check to ensure the generated HTML doesn't contain potentially harmful content
    const sanitizedHtml = generatedHtml
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/on\w+="[^"]*"/g, "")
      .replace(/on\w+='[^']*'/g, "");

    return NextResponse.json({ html: sanitizedHtml });
  } catch (error) {
    console.error("Error generating template:", error);
    return NextResponse.json(
      { error: "Failed to generate template" },
      { status: 500 }
    );
  }
} 