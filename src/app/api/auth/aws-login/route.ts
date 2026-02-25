
import { NextResponse } from "next/server";

export async function GET() {
  let AWS_COGNITO_URL=process.env.COGNITO_DOMAIN!;
  //const subdomain = window.location.hostname.split('.')[0]; 
  try {
    const cognitoUrl = new URL(
      AWS_COGNITO_URL+'/login'
    );
    cognitoUrl.searchParams.append('client_id', process.env.COGNITO_CLIENT_ID!);
    cognitoUrl.searchParams.append('response_type', 'code');
    cognitoUrl.searchParams.append('scope', 'openid email phone');
    cognitoUrl.searchParams.append(
      'redirect_uri',
      process.env.COGNITO_REDIRECT_URI
    );
    //cognitoUrl.searchParams.append('state', '42d8b2bc-d864-43df-8739-980daba0ed1f');
    cognitoUrl.searchParams.append('state', 'a475d436-b240-4ed2-8494-1aecf9c1f414');
    return NextResponse.redirect(cognitoUrl);
  } catch (error) {
    console.error('Error in AWS login:', error);
    return NextResponse.json(
      { error: 'Failed to initiate AWS login' },
      { status: 500 }
    );
  }
}