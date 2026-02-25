// app/api/auth/signout/route.ts
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import next from 'next/types';

const clientId = process.env.COGNITO_CLIENT_ID!;
const domain = process.env.COGNITO_DOMAIN!;
const postLogoutRedirectUri = process.env.COGNITO_LOGOUT_REDIRECT_URL!;

export async function GET() {
  const cookieStore = cookies();
  const logoutUrl = new URL(`${domain}/logout`);
  logoutUrl.searchParams.set('client_id', clientId);
  logoutUrl.searchParams.set('logout_uri', postLogoutRedirectUri);
  console.log(logoutUrl.toString());
  cookieStore.delete("id_token"); 2
  cookieStore.delete("tenant_id");

  const headers = new Headers();

  return NextResponse.redirect(logoutUrl.toString());
  ;
}