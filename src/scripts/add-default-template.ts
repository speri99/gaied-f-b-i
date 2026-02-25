import { createDefaultTemplate } from "./create-default-template";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Get tenant ID from environment variable
const TENANT_ID = process.env.TENANT_ID;

if (!TENANT_ID) {
  console.error("Missing required environment variable: TENANT_ID");
  process.exit(1);
}

async function main() {
  try {
    await createDefaultTemplate(TENANT_ID);
    console.log("Default template created successfully!");
  } catch (error) {
    console.error("Failed to create default template:", error);
    process.exit(1);
  }
}

main(); 