import { NextResponse } from "next/server";
import { DynamoDBService } from "@/lib/dynamodb";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const dynamoDB = new DynamoDBService();
const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION });
const NOTES_TABLE_NAME = process.env.DYNAMODB_NOTES_TABLE || "GEO-Notes";

interface Note {
  content: string;
  createdBy: string;
  timestamp: string;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get case details
    const caseData = await dynamoDB.getCase(params.id);
    if (!caseData) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    // Get all case notes
    const caseNotes = await dynamoDB.scan<Note>(
      NOTES_TABLE_NAME,
      "entityId = :entityId AND entityType = :entityType",
      {
        ":entityId": params.id,
        ":entityType": "case",
      }
    );

    // Get all contact notes
    const contactNotes = await dynamoDB.scan<Note>(
      NOTES_TABLE_NAME,
      "entityType = :entityType AND begins_with(entityId, :phoneNumber)",
      {
        ":entityType": "contact",
        ":phoneNumber": caseData.VictimPhone,
      }
    );

    // Prepare the prompt for Bedrock
    const prompt = `Please provide a concise summary of this case based on the following information:

Case Details:
- Victim: ${caseData.VictimName}
- Case Type: ${caseData.caseType}
- Status: ${caseData.status}
- Priority: ${caseData.priority}
- Reported Abuser: ${caseData.ReportedAbuser || "Not specified"}

Case Notes:
${caseNotes.items?.map(note => `- ${note.content}: ${note.createdBy} (${note.timestamp})`).join("\n") || "No case notes"}

Contact Notes:
${contactNotes.items?.map(note => `- ${note.content}: ${note.createdBy} (${note.timestamp})`).join("\n") || "No contact notes"}

Please provide a clear, concise summary that highlights:
1. The key facts about the case
2. The current status and any important updates
3. Any significant contact attempts or responses
4. Any immediate concerns or actions needed

Keep the summary professional and focused on the most relevant information.`;

    // Call Bedrock to generate the summary
    const command = new InvokeModelCommand({
      modelId: "anthropic.claude-3-sonnet-20240229-v1:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
      }),
    });

    const response = await bedrock.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const summary = responseBody.content[0].text;

    // Update the case with the new summary
    await dynamoDB.updateCase(params.id, {
      summary: summary,
      lastSummaryRefresh: new Date().toISOString(),
      updatedAt: Date.now(),
      updatedBy: "system", // TODO: Get from auth context
    });

    return NextResponse.json({ 
      summary,
      lastSummaryRefresh: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error generating case summary:", error);
    return NextResponse.json(
      { error: "Failed to generate case summary" },
      { status: 500 }
    );
  }
} 