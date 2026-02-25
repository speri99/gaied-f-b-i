import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { User } from "../src/types/user";
import { SecurityProfile } from "../src/types/security";
import * as dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Initialize DynamoDB client with AWS credentials
const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

const docClient = DynamoDBDocumentClient.from(client);

const USERS_TABLE = "GEO-Users";
const SECURITY_PROFILES_TABLE = "GEO-SecurityProfiles";

async function listUsers() {
  try {
    console.log("Listing users in the database...");
    console.log("Using AWS Region:", process.env.AWS_REGION);
    
    // Scan the users table
    const userResult = await docClient.send(new ScanCommand({
      TableName: USERS_TABLE
    }));
    
    console.log(`Found ${userResult.Items?.length || 0} users:`);
    
    // Get all security profiles to map IDs to names
    const profileResult = await docClient.send(new ScanCommand({
      TableName: SECURITY_PROFILES_TABLE
    }));
    
    const profileMap = new Map<string, string>();
    profileResult.Items?.forEach(profile => {
      profileMap.set(profile.profileId, profile.name);
    });
    
    // Display users with their profile names
    userResult.Items?.forEach(user => {
      const profileNames = user.securityProfiles?.map((profileId: string) => 
        profileMap.get(profileId) || `Unknown Profile (${profileId})`
      ) || [];
      
      console.log(`- User ID: ${user.UUID}, Tenant ID: ${user.tenantId}, Status: ${user.status}`);
      console.log(`  Profiles: ${profileNames.join(', ')}`);
      console.log(`  Email: ${user.email}`);
      console.log('');
    });
  } catch (error) {
    console.error("Error listing users:", error);
    console.error("AWS Credentials:", {
      region: process.env.AWS_REGION,
      hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY
    });
  }
}

listUsers(); 