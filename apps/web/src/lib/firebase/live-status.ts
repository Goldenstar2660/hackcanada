import type { LiveStationStatus } from "@binbuddy/contracts";
import type { IdTokenResult, User } from "firebase/auth";
import type { Firestore } from "firebase/firestore";

import { doc, onSnapshot } from "firebase/firestore";

export const LIVE_STATUS_COLLECTION_PATH = "stationLiveStatus";

export interface OperatorSession {
  readonly uid: string;
  readonly email?: string | null;
  readonly claims?: {
    readonly admin?: boolean;
    readonly binbuddyOperator?: boolean;
    readonly role?: string;
    readonly roles?: readonly string[];
  };
}

export interface LiveStatusListenerTransport {
  subscribeToDocument<TDocument>(
    documentPath: string,
    onValue: (document: TDocument | null) => void,
    onError?: (error: unknown) => void
  ): () => void;
}

export interface LiveStatusClient {
  readonly collectionPath: string;
  subscribeToStation(
    stationId: string,
    onValue: (status: LiveStationStatus | null) => void,
    onError?: (error: unknown) => void
  ): () => void;
}

function hasOperatorClaims(session: OperatorSession | null | undefined): boolean {
  if (!session) {
    return false;
  }

  if (session.uid.trim().length > 0) {
    return true;
  }

  const claims = session.claims;
  return (
    claims?.admin === true
    || claims?.binbuddyOperator === true
    || claims?.role === "admin"
    || claims?.role === "operator"
    || claims?.roles?.includes("admin") === true
    || claims?.roles?.includes("operator") === true
  );
}

export function assertOperatorSession(session: OperatorSession | null | undefined): OperatorSession {
  if (!session || !hasOperatorClaims(session)) {
    throw new Error("Operator authorization is required before subscribing to live station state.");
  }

  return session;
}

export function createStationLiveStatusPath(stationId: string): string {
  return `${LIVE_STATUS_COLLECTION_PATH}/${stationId}`;
}

export function createAuthorizedLiveStatusClient(
  session: OperatorSession,
  transport: LiveStatusListenerTransport
): LiveStatusClient {
  assertOperatorSession(session);

  return {
    collectionPath: LIVE_STATUS_COLLECTION_PATH,
    subscribeToStation(stationId, onValue, onError) {
      return transport.subscribeToDocument<LiveStationStatus>(
        createStationLiveStatusPath(stationId),
        onValue,
        onError
      );
    }
  };
}

function normalizeRoleClaims(claims: IdTokenResult["claims"]): OperatorSession["claims"] {
  const roles = claims.roles;

  return {
    admin: claims.admin === true,
    binbuddyOperator: claims.binbuddyOperator === true,
    role: typeof claims.role === "string" ? claims.role : undefined,
    roles: Array.isArray(roles) && roles.every((entry) => typeof entry === "string") ? roles : undefined
  };
}

export async function createOperatorSessionFromUser(user: User): Promise<OperatorSession> {
  const token = await user.getIdTokenResult();

  return {
    uid: user.uid,
    email: user.email,
    claims: normalizeRoleClaims(token.claims)
  };
}

export function createFirestoreLiveStatusTransport(firestore: Firestore): LiveStatusListenerTransport {
  return {
    subscribeToDocument<TDocument>(documentPath: string, onValue: (document: TDocument | null) => void, onError?: (error: unknown) => void) {
      return onSnapshot(
        doc(firestore, documentPath),
        (snapshot) => {
          onValue(snapshot.exists() ? (snapshot.data() as TDocument) : null);
        },
        onError
      );
    }
  };
}
