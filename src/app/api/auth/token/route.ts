import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';


export async function POST(request: NextRequest) {
  try {
    const { code, state } = await request.json();
    console.log('code:', code);
    if (!code) {
      return NextResponse.json({ error: 'Missing code in request body' }, { status: 400 });
    }

    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('client_id', process.env.COGNITO_CLIENT_ID!);
    params.append('code', code);
    params.append('redirect_uri', process.env.COGNITO_REDIRECT_URI!);
    console.log("Fetching the token after login!")
    const response = await fetch(`${process.env.COGNITO_DOMAIN}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });
    const data = await response.json();
    const { id_token } = data;
    console.log("Token data retreived------" + data)
    if (!id_token) {
      console.log("ID Token not found----");
      return NextResponse.json({ error: 'Token not returned' }, { status: 401 });
    }
    const cookieStore = cookies();
    cookieStore.set('token', id_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours in seconds
      path: '/',
    });
    cookieStore.set('access_token', data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours in seconds
      path: '/',
    });
    cookieStore.set('tenant_id', state);
    return NextResponse.json({
      status: 200,
    });
  } catch (err) {
    console.error('Error during token exchange ---------:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}