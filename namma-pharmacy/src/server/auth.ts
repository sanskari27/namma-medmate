import { createHmac } from "crypto";
import {
  AdminCreateUserCommand, CognitoIdentityProviderClient, InitiateAuthCommand, RespondToAuthChallengeCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { fail } from "./errors";

export function cognitoConfigured() {
  return Boolean(process.env.COGNITO_USER_POOL_ID && process.env.COGNITO_CLIENT_ID);
}

function client() {
  return new CognitoIdentityProviderClient({ region: process.env.AWS_REGION || "ap-south-1" });
}

function secretHash(username: string) {
  const secret = process.env.COGNITO_CLIENT_SECRET;
  if (!secret || !process.env.COGNITO_CLIENT_ID) return undefined;
  return createHmac("sha256", secret).update(username + process.env.COGNITO_CLIENT_ID).digest("base64");
}

export async function sendCognitoOtp(phone: string) {
  const c = client();
  try {
    await c.send(new AdminCreateUserCommand({
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: phone,
      MessageAction: "SUPPRESS",
      UserAttributes: [
        { Name: "phone_number", Value: phone },
        { Name: "phone_number_verified", Value: "true" },
      ],
    }));
  } catch (err) {
    if ((err as { name?: string }).name !== "UsernameExistsException") throw err;
  }
  const params: Record<string, string> = { USERNAME: phone, PREFERRED_CHALLENGE: "SMS_OTP" };
  const hash = secretHash(phone);
  if (hash) params.SECRET_HASH = hash;
  const out = await c.send(new InitiateAuthCommand({
    AuthFlow: "USER_AUTH",
    ClientId: process.env.COGNITO_CLIENT_ID,
    AuthParameters: params,
  }));
  if (!out.Session) fail(502, "VALIDATION", "Cognito did not start an SMS challenge. Enable SMS OTP on the user pool.");
  return out.Session;
}

export async function verifyCognitoOtp(phone: string, code: string, session: string) {
  const params: Record<string, string> = { USERNAME: phone, SMS_OTP_CODE: code };
  const hash = secretHash(phone);
  if (hash) params.SECRET_HASH = hash;
  const out = await client().send(new RespondToAuthChallengeCommand({
    ClientId: process.env.COGNITO_CLIENT_ID,
    ChallengeName: "SMS_OTP",
    Session: session,
    ChallengeResponses: params,
  }));
  const token = out.AuthenticationResult?.IdToken;
  if (!token) fail(401, "UNAUTHENTICATED", "That code was not accepted", "otp");
  const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()) as { sub?: string };
  return payload.sub || phone;
}
