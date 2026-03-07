import type { LiveStationStatus } from "@binbuddy/contracts";

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
