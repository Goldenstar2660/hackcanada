import type { CallableAuthContext } from "../functions/runtime.js";

import { FunctionError } from "../functions/runtime.js";

export interface OperatorClaims {
  readonly admin?: boolean;
  readonly binsightOperator?: boolean;
  readonly role?: string;
  readonly roles?: readonly string[];
}

export interface OperatorIdentity {
  readonly uid: string;
  readonly email?: string | null;
  readonly claims: OperatorClaims;
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function normalizeClaims(context: CallableAuthContext): OperatorClaims {
  const token = context.token ?? {};

  return {
    admin: token.admin === true,
    binsightOperator: token.binsightOperator === true,
    role: typeof token.role === "string" ? token.role : undefined,
    roles: isStringArray(token.roles) ? token.roles : undefined
  };
}

export function isOperatorAuthorized(auth: CallableAuthContext | null): auth is CallableAuthContext {
  if (!auth) {
    return false;
  }

  const claims = normalizeClaims(auth);
  return (
    auth.uid.trim().length > 0
    || claims.admin === true
    || claims.binsightOperator === true
    || claims.role === "admin"
    || claims.role === "operator"
    || claims.roles?.includes("admin") === true
    || claims.roles?.includes("operator") === true
  );
}

export function assertOperatorIdentity(auth: CallableAuthContext | null): OperatorIdentity {
  if (!isOperatorAuthorized(auth)) {
    throw new FunctionError(403, "operator-auth", "Operator authorization is required for this dashboard function.");
  }

  return {
    uid: auth.uid,
    email: auth.email,
    claims: normalizeClaims(auth)
  };
}
