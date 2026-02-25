import { NextRequest, NextResponse } from "next/server";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { jsPDF } from "jspdf";
import { getServerAuthContext } from "@/lib/server-auth";
import { checkPermissions } from "@/middleware/permissions";

const dynamoDb = new DynamoDB({});
const docClient = DynamoDBDocument.from(dynamoDb);

const CASES_TABLE = process.env.DYNAMODB_CASE_RECORDS_TABLE || "GEO-CaseRecords";
const CONTACTS_TABLE = process.env.DYNAMODB_CONTACT_RECORDS_TABLE || "GEO-ContactRecords";
const NOTES_TABLE = process.env.DYNAMODB_NOTES_TABLE || "GEO-Notes";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authContext = getServerAuthContext(request);
    if (!authContext) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    const { tenantId, userId } = authContext;

    // Check permission to export cases
    const hasPermission = await checkPermissions(userId, tenantId, ["read:cases", "read:contacts", "read:notes"]);
    if (!hasPermission) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get("format") || "text";
    const caseId = params.id;

    // Fetch case details
    const caseResult = await docClient.get({
      TableName: CASES_TABLE,
      Key: { Identifier: caseId }
    });

    if (!caseResult.Item) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const caseItem = caseResult.Item;

    // Verify tenant ownership
    if (caseItem.tenantId !== tenantId) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Fetch contacts using the phone number
    const contactsResult = await docClient.scan({
      TableName: CONTACTS_TABLE,
      FilterExpression: "identifier = :phoneNumber AND tenantId = :tenantId",
      ExpressionAttributeValues: { 
        ":phoneNumber": caseItem.VictimPhone,
        ":tenantId": tenantId
      }
    });

    // Sort contacts by timestamp in descending order
    const sortedContacts = (contactsResult.Items || []).sort((a, b) => 
      (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0)
    );

    // Fetch all notes for this case
    const notesResult = await docClient.scan({
      TableName: NOTES_TABLE,
      FilterExpression: "entityId = :caseId AND tenantId = :tenantId",
      ExpressionAttributeValues: { 
        ":caseId": caseId,
        ":tenantId": tenantId
      }
    });

    // Sort all notes by timestamp
    const allNotes = (notesResult.Items || [])
      .sort((a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0));

    // Helper function to format date safely
    const formatDate = (timestamp: string | number | undefined): string => {
      if (!timestamp) return "N/A";
      
      let date: Date;
      try {
        // If timestamp is a string that looks like an ISO date
        if (typeof timestamp === "string" && timestamp.includes("T")) {
          date = new Date(timestamp);
        } else {
          // Convert to number if it's a string number
          const numTimestamp = typeof timestamp === "string" ? parseInt(timestamp, 10) : timestamp;
          // If timestamp is in seconds, convert to milliseconds
          date = new Date(numTimestamp < 1000000000000 ? numTimestamp * 1000 : numTimestamp);
        }
        
        return isNaN(date.getTime()) ? "N/A" : date.toLocaleString();
      } catch (e) {
        return "N/A";
      }
    };

    // Generate content sections
    const content = {
      caseDetails: `Case Details:
ID: ${caseItem.Identifier}
Status: ${caseItem.status || "Unknown"}
Type: ${caseItem.caseType || "Unknown"}
Priority: ${caseItem.priority || "Unknown"}
Created: ${formatDate(caseItem.createdAt)}
Last Updated: ${formatDate(caseItem.updatedAt)}
Description: ${caseItem.description || "N/A"}
Victim Phone: ${caseItem.VictimPhone || "N/A"}
Case Manager: ${caseItem.caseManager || "Not assigned"}
${caseItem.tags?.length ? `Tags: ${caseItem.tags.join(", ")}` : ""}
`,
      aiSummary: `AI Generated Summary:
${caseItem.summary || "No AI summary has been generated for this case."}
`,
      statistics: `Case Statistics:
Total Contacts: ${sortedContacts.length}
Total Notes: ${allNotes.length}
Days Open: ${Math.ceil((Date.now() - new Date(caseItem.createdAt).getTime()) / (1000 * 60 * 60 * 24))}
Last Contact: ${sortedContacts.length > 0 ? formatDate(sortedContacts[0].timestamp) : "N/A"}
Last Note: ${allNotes.length > 0 ? formatDate(allNotes[0].timestamp) : "N/A"}
Acknowledged Contacts: ${sortedContacts.filter(c => c.acknowledgment?.status === "Acknowledged").length}
`,
      caseNotes: `Case Notes:
${allNotes.map(note => 
  `Date: ${formatDate(note.timestamp)}
Author: ${note.createdBy || "Unknown"}
Note: ${note.content || "No content"}
`).join("\n\n") || "No notes recorded"}
`,
      contactHistory: `Contact History:
${sortedContacts.map(contact => 
  `Date: ${formatDate(contact.timestamp)}
Location: ${contact.formattedAddress || "Location not available"}
Acknowledgment: ${contact.acknowledgment?.status || "Pending"}
${contact.acknowledgment?.notes?.length ? `Notes: ${contact.acknowledgment.notes.map(n => n.content).join(", ")}` : "No acknowledgment notes"}
`).join("\n\n") || "No contacts recorded"}
`
    };

    if (format === "pdf") {
      try {
        // Create new PDF document
        const doc = new jsPDF();
        let yPos = 20;
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        const contentWidth = pageWidth - (margin * 2);

        // Helper function to add text with word wrap
        const addText = (text: string, fontSize: number, isHeader = false, indent = 0) => {
          doc.setFontSize(fontSize);
          if (isHeader) {
            doc.setFont("helvetica", "bold");
          } else {
            doc.setFont("helvetica", "normal");
          }
          
          const lines = doc.splitTextToSize(text, contentWidth - indent);
          
          // Check if we need a new page
          if (yPos + (lines.length * fontSize * 0.3527) > doc.internal.pageSize.getHeight() - margin) {
            doc.addPage();
            yPos = margin;
          }
          
          doc.text(lines, margin + indent, yPos);
          yPos += (lines.length * fontSize * 0.3527);
          return lines.length * fontSize * 0.3527;
        };

        // Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text("Case Export Report", pageWidth / 2, yPos, { align: "center" });
        yPos += 25;

        // Add each section
        Object.entries(content).forEach(([section, text]) => {
          // Add section header
          doc.setFont("helvetica", "bold");
          doc.setFontSize(14);
          doc.text(section.replace(/([A-Z])/g, " $1").trim(), margin, yPos);
          yPos += 10;

          // Split the content by lines
          const contentLines = text.split("\n");
          
          contentLines.forEach((line) => {
            if (line.trim()) {
              // Check if this is a subsection (starts with number and period or dash)
              if (line.match(/^(\d+\.|-)/) || line.includes(":")) {
                doc.setFont("helvetica", "bold");
                addText(line, 12, false, 0);
              } else {
                doc.setFont("helvetica", "normal");
                addText(line, 12, false, 5);
              }
              yPos += 2; // Small spacing between lines
            } else {
              yPos += 5; // Larger spacing for empty lines
            }
          });

          yPos += 15; // Space between sections
        });

        // Return the PDF
        const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
        return new NextResponse(pdfBuffer, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="case-${caseId}-export.pdf"`
          }
        });
      } catch (error) {
        console.error("PDF Generation Error:", error);
        // Fallback to text format if PDF generation fails
        const textContent = Object.values(content).join("\n\n");
        return new NextResponse(textContent, {
          headers: {
            "Content-Type": "text/plain",
            "Content-Disposition": `attachment; filename="case-${caseId}-export.txt"`
          }
        });
      }
    } else {
      // Return text format
      const textContent = Object.values(content).join("\n\n");
      return new NextResponse(textContent, {
        headers: {
          "Content-Type": "text/plain",
          "Content-Disposition": `attachment; filename="case-${caseId}-export.txt"`
        }
      });
    }
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to export case data" },
      { status: 500 }
    );
  }
} 