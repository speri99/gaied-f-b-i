import { DynamoDBService } from "@/lib/dynamodb";
import { Case, DynamoDBCase } from "@/types/case";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";

dotenv.config({ path: '.env.local' });

const db = new DynamoDBService();
const OLD_TABLE = "GEO-Cases"; // Your old table name
const NEW_TABLE = process.env.DDB_CASERECORDS_TABLE_NAME || "GEO-CaseManagerRecords";

if (!NEW_TABLE) {
  console.error("Error: DDB_CASERECORDS_TABLE_NAME is not defined in .env.local");
  process.exit(1);
}

interface OldCase {
  Identifier: string;
  VictimName: string;
  CaseManager: string;
  CaseManagerEmail: string;
  CaseManagerPhone: string;
  BackupCaseManager: string;
  BackupCaseManagerEmail: string;
  BackupCaseManagerPhone: string;
  ReportedAbuser: string;
  status?: string;
  type?: string;
  Priority?: string;
  Notes?: string;
  CaseworkerNotes?: string;
  lastUpdated?: string;
  FollowUpDate?: string;
  SmsNotifications?: boolean;
  BackupSmsNotifications?: boolean;
  tags?: string[];
}

async function migrateCases() {
  try {
    console.log("Starting case migration...");
    console.log(`Target table: ${NEW_TABLE}`);

    // Get all cases from old table
    const oldCases = await db.scan<OldCase>(OLD_TABLE);
    console.log(`Found ${oldCases.total} cases to migrate`);

    // Migrate each case
    for (const oldCase of oldCases.items) {
      try {
        const newCase: Case = {
          UUID: uuidv4(),
          identifier: oldCase.Identifier || `CASE-${Date.now()}`,
          VictimName: oldCase.VictimName || "Unknown",
          CaseManager: oldCase.CaseManager || "Unknown",
          CaseManagerEmail: oldCase.CaseManagerEmail || "",
          CaseManagerPhone: oldCase.CaseManagerPhone || "",
          BackupCaseManager: oldCase.BackupCaseManager || "",
          BackupCaseManagerEmail: oldCase.BackupCaseManagerEmail || "",
          BackupCaseManagerPhone: oldCase.BackupCaseManagerPhone || "",
          ReportedAbuser: oldCase.ReportedAbuser || "Unknown",
          status: (oldCase.status as Case["status"]) || "Active",
          type: oldCase.type || "Unknown",
          priority: (oldCase.Priority as Case["priority"]) || "Medium",
          notes: oldCase.Notes || "",
          caseworkerNotes: oldCase.CaseworkerNotes || "",
          lastUpdated: oldCase.lastUpdated || new Date().toISOString(),
          followUpDate: oldCase.FollowUpDate,
          smsNotifications: oldCase.SmsNotifications || false,
          backupSmsNotifications: oldCase.BackupSmsNotifications || false,
          tags: oldCase.tags || [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        // Put the new case in the new table
        await db.put(NEW_TABLE, newCase);
        console.log(`Migrated case ${oldCase.Identifier}`);
      } catch (error) {
        console.error(`Failed to migrate case ${oldCase.Identifier}:`, error);
      }
    }

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

// Run migration
migrateCases(); 