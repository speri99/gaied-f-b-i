import { DynamoDBService } from "@/lib/dynamodb";
import { Case, CaseStatus, CasePriority } from "@/types/case";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";

dotenv.config({ path: '.env.local' });

const db = new DynamoDBService();
const TABLE_NAME = process.env.DDB_CASERECORDS_TABLE_NAME;

if (!TABLE_NAME) {
  console.error("Error: DDB_CASERECORDS_TABLE_NAME is not defined in .env.local");
  process.exit(1);
}

const CASE_TYPES = [
  "Domestic Violence",
  "Child Abuse",
  "Elder Abuse",
  "Sexual Assault",
  "Human Trafficking",
];

const SAMPLE_FIRST_NAMES = [
  "John",
  "Jane",
  "Michael",
  "Sarah",
  "David",
  "Emily",
  "Robert",
  "Lisa",
];

const SAMPLE_LAST_NAMES = [
  "Smith",
  "Johnson",
  "Williams",
  "Brown",
  "Jones",
  "Garcia",
  "Miller",
  "Davis",
];

function generatePhoneNumber(): string {
  return `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`;
}

function generateEmail(firstName: string, lastName: string): string {
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;
}

async function createSampleCases() {
  try {
    console.log("Creating sample cases...");
    console.log(`Target table: ${TABLE_NAME}`);

    const sampleCases: Case[] = Array.from({ length: 10 }, (_, i) => {
      const firstName = SAMPLE_FIRST_NAMES[Math.floor(Math.random() * SAMPLE_FIRST_NAMES.length)];
      const lastName = SAMPLE_LAST_NAMES[Math.floor(Math.random() * SAMPLE_LAST_NAMES.length)];
      const caseType = CASE_TYPES[Math.floor(Math.random() * CASE_TYPES.length)];
      const now = Date.now();
      const Identifier = `CASE-${now}-${i + 1}`;

      return {
        Identifier,
        VictimName: `${firstName} ${lastName}`,
        CaseManager: "Sarah Thompson",
        CaseManagerEmail: "sarah.thompson@safeguard.org",
        CaseManagerPhone: generatePhoneNumber(),
        BackupCaseManager: "Michael Rodriguez",
        BackupCaseManagerEmail: "michael.rodriguez@safeguard.org",
        BackupCaseManagerPhone: generatePhoneNumber(),
        ReportedAbuser: `${SAMPLE_FIRST_NAMES[Math.floor(Math.random() * SAMPLE_FIRST_NAMES.length)]} ${SAMPLE_LAST_NAMES[Math.floor(Math.random() * SAMPLE_LAST_NAMES.length)]}`,
        status: Math.random() > 0.3 ? "Active" as CaseStatus : "Closed" as CaseStatus,
        type: caseType,
        priority: Math.random() > 0.7 ? "High" as CasePriority : Math.random() > 0.4 ? "Medium" as CasePriority : "Low" as CasePriority,
        notes: `Initial case notes for ${firstName} ${lastName}'s ${caseType.toLowerCase()} case.`,
        caseworkerNotes: "Preliminary assessment completed. Follow-up scheduled.",
        lastUpdated: new Date().toISOString(),
        followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        smsNotifications: Math.random() > 0.5,
        backupSmsNotifications: Math.random() > 0.5,
        tags: [caseType, Math.random() > 0.5 ? "Urgent" : "Routine", Math.random() > 0.5 ? "Follow-up Required" : "Initial Contact"],
        createdAt: now,
        updatedAt: now,
        metadata: {
          type: caseType,
          category: caseType,
          tags: [],
          description: `Case opened for ${firstName} ${lastName} regarding ${caseType.toLowerCase()}.`,
          notes: ["Initial assessment completed", "Follow-up scheduled"],
        }
      };
    });

    // Create cases in parallel
    await Promise.all(
      sampleCases.map(async (caseData) => {
        await db.put(TABLE_NAME, caseData);
        console.log(`Created case record for ${caseData.VictimName}`);
      })
    );

    console.log("Sample cases created successfully!");
  } catch (error) {
    console.error("Failed to create sample cases:", error);
    process.exit(1);
  }
}

// Run the script
createSampleCases(); 