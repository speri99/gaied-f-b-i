import { NextResponse } from "next/server";

export async function GET() {
  // Only show AWS-related environment variables and mask sensitive values
  const awsEnvVars = Object.entries(process.env)
    .filter(([key]) => key.startsWith('AWS_'))
    .reduce((acc, [key, value]) => ({
      ...acc,
      [key]: value ? (key.includes('SECRET') ? '***' : value.substring(0, 5) + '...') : null
    }), {});

  return NextResponse.json({
    awsEnvVars,
    nodeEnv: process.env.NODE_ENV,
  });
} 