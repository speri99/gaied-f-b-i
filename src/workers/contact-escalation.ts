import { DynamoDBService } from "@/lib/dynamodb";
import { ContactRecord, AcknowledgmentStatus, EscalationLevel } from "@/types/contact";
import { sendNotification } from "@/lib/notifications";

const db = new DynamoDBService();
const TABLE_NAME = process.env.DYNAMODB_CONTACT_RECORDS_TABLE;

export async function processContactEscalations() {
  try {
    // Get all pending contacts
    const response = await db.scan<ContactRecord>(
      TABLE_NAME!,
      "acknowledgment.status = :status",
      { ":status": "Pending" }
    );

    const now = Date.now();
    const contacts = response.items || [];

    for (const contact of contacts) {
      const { escalationSettings } = contact.metadata;
      if (!escalationSettings) continue;

      const timeSinceLastEscalation = now - (contact.acknowledgment.lastEscalated || contact.timestamp);
      const minutesSinceLastEscalation = timeSinceLastEscalation / (1000 * 60);

      // Check if we need to escalate based on current level and time passed
      switch (contact.acknowledgment.escalationLevel) {
        case "Primary":
          if (minutesSinceLastEscalation >= escalationSettings.primaryWaitTime) {
            await escalateToBackup(contact);
          }
          break;

        case "Backup":
          if (minutesSinceLastEscalation >= escalationSettings.backupWaitTime) {
            await escalateToEmergency(contact);
          }
          break;

        // Emergency level doesn't escalate further
        case "Emergency":
          break;
      }
    }
  } catch (error) {
    console.error("Error processing contact escalations:", error);
  }
}

async function escalateToBackup(contact: ContactRecord) {
  try {
    // Update contact status
    const updates = {
      acknowledgment: {
        ...contact.acknowledgment,
        status: "Escalated" as AcknowledgmentStatus,
        escalationLevel: "Backup" as EscalationLevel,
        lastEscalated: Date.now(),
      },
    };

    await db.update<ContactRecord>(
      TABLE_NAME!,
      { UUID: contact.UUID },
      updates
    );

    // Send notification to backup case worker
    if (contact.backupAssignedTo) {
      await sendNotification({
        userId: contact.backupAssignedTo,
        title: "Contact Escalated",
        message: `A contact has been escalated to you: ${contact.identifier}`,
        type: "contact_escalation",
        data: { contactId: contact.UUID },
      });
    }
  } catch (error) {
    console.error("Error escalating to backup:", error);
  }
}

async function escalateToEmergency(contact: ContactRecord) {
  try {
    // Update contact status
    const updates = {
      acknowledgment: {
        ...contact.acknowledgment,
        status: "Escalated" as AcknowledgmentStatus,
        escalationLevel: "Emergency" as EscalationLevel,
        lastEscalated: Date.now(),
      },
    };

    await db.update<ContactRecord>(
      TABLE_NAME!,
      { UUID: contact.UUID },
      updates
    );

    // Send notification to emergency contact
    const { emergencyContact } = contact.metadata.escalationSettings!;
    await sendNotification({
      type: emergencyContact.type,
      to: emergencyContact.value,
      title: "Emergency Contact Escalation",
      message: `Urgent: Unacknowledged contact requires immediate attention: ${contact.identifier}`,
      data: { contactId: contact.UUID },
    });
  } catch (error) {
    console.error("Error escalating to emergency:", error);
  }
} 