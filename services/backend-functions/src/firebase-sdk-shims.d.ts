declare module "firebase-admin/app" {
  export interface App {
    readonly name?: string;
  }

  export function getApps(): readonly App[];
  export function initializeApp(options?: unknown): App;
}

declare module "firebase-admin/firestore" {
  import type { App } from "firebase-admin/app";

  export type DocumentData = Record<string, unknown>;

  export interface SetOptions {
    readonly merge?: boolean;
  }

  export interface DocumentSnapshot<T = DocumentData> {
    readonly exists: boolean;
    data(): T | undefined;
  }

  export interface QueryDocumentSnapshot<T = DocumentData> extends DocumentSnapshot<T> {
    readonly id: string;
    readonly ref: DocumentReference<T>;
    data(): T;
  }

  export interface QuerySnapshot<T = DocumentData> {
    readonly docs: readonly QueryDocumentSnapshot<T>[];
    readonly empty: boolean;
    readonly size: number;
  }

  export interface FirestoreDataConverter<T> {
    toFirestore(modelObject: T): DocumentData;
    fromFirestore(snapshot: QueryDocumentSnapshot<DocumentData>): T;
  }

  export interface Query<T = DocumentData> {
    where(fieldPath: string, opStr: "==" | ">=" | "<=" | ">" | "<", value: unknown): Query<T>;
    orderBy(fieldPath: string, directionStr?: "asc" | "desc"): Query<T>;
    limit(limit: number): Query<T>;
    startAfter(...fieldValues: unknown[]): Query<T>;
    withConverter<U>(converter: FirestoreDataConverter<U>): Query<U>;
    get(): Promise<QuerySnapshot<T>>;
  }

  export interface CollectionReference<T = DocumentData> extends Query<T> {
    readonly id: string;
    doc(documentPath?: string): DocumentReference<T>;
    withConverter<U>(converter: FirestoreDataConverter<U>): CollectionReference<U>;
  }

  export interface DocumentReference<T = DocumentData> {
    readonly id: string;
    readonly path: string;
    get(): Promise<DocumentSnapshot<T>>;
    set(data: T, options?: SetOptions): Promise<void>;
    create(data: T): Promise<void>;
    withConverter<U>(converter: FirestoreDataConverter<U>): DocumentReference<U>;
  }

  export interface WriteBatch {
    set<T>(documentRef: DocumentReference<T>, data: T, options?: SetOptions): WriteBatch;
    commit(): Promise<void>;
  }

  export interface Firestore {
    collection(collectionPath: string): CollectionReference<DocumentData>;
    doc(documentPath: string): DocumentReference<DocumentData>;
    batch(): WriteBatch;
  }

  export function getFirestore(app?: App): Firestore;
}

declare module "firebase-admin/storage" {
  import type { App } from "firebase-admin/app";

  export interface SaveOptions {
    readonly metadata?: {
      readonly contentType?: string;
    };
    readonly resumable?: boolean;
  }

  export interface DeleteOptions {
    readonly ignoreNotFound?: boolean;
  }

  export interface File {
    save(data: string, options?: SaveOptions): Promise<void>;
    delete(options?: DeleteOptions): Promise<void>;
    exists(): Promise<[boolean]>;
    publicUrl(): string;
  }

  export interface Bucket {
    file(path: string): File;
  }

  export interface Storage {
    bucket(name?: string): Bucket;
  }

  export function getStorage(app?: App): Storage;
}

declare module "firebase-functions/v2/https" {
  export type Invoker = "public" | "private" | string | readonly string[];

  export interface HttpsOptions {
    readonly invoker?: Invoker;
  }

  export interface CallableOptions extends HttpsOptions {}

  export interface Request {
    readonly method: string;
    readonly headers: Readonly<Record<string, string | readonly string[] | undefined>>;
    readonly body?: unknown;
  }

  export interface Response {
    status(code: number): Response;
    set(field: string, value: string): Response;
    json(body: unknown): void;
    send(body: unknown): void;
  }

  export interface CallableRequest<T = unknown> {
    readonly data: T;
    readonly auth:
      | {
          readonly uid: string;
          readonly token?: Readonly<Record<string, unknown>>;
        }
      | null;
  }

  export type HttpsFunction = (request: Request, response: Response) => void | Promise<void>;
  export type CallableFunction<T = unknown, TResult = unknown> = (request: CallableRequest<T>) => TResult | Promise<TResult>;

  export function onRequest(handler: HttpsFunction): HttpsFunction;
  export function onRequest(options: HttpsOptions, handler: HttpsFunction): HttpsFunction;
  export function onCall<T = unknown, TResult = unknown>(handler: CallableFunction<T, TResult>): CallableFunction<T, TResult>;
  export function onCall<T = unknown, TResult = unknown>(
    options: CallableOptions,
    handler: CallableFunction<T, TResult>
  ): CallableFunction<T, TResult>;

  export class HttpsError extends Error {
    readonly code: string;
    readonly details?: unknown;

    constructor(code: string, message: string, details?: unknown);
  }
}

declare module "firebase-functions/v2/firestore" {
  import type { QueryDocumentSnapshot } from "firebase-admin/firestore";

  export interface FirestoreEvent<T = unknown, Params extends Record<string, string> = Record<string, string>> {
    readonly data: T | undefined;
    readonly params: Params;
  }

  export type FirestoreEventHandler<T = unknown, Params extends Record<string, string> = Record<string, string>> = (
    event: FirestoreEvent<T, Params>
  ) => void | Promise<void>;

  export function onDocumentCreated<Params extends Record<string, string> = Record<string, string>>(
    document: string,
    handler: FirestoreEventHandler<QueryDocumentSnapshot<Record<string, unknown>>, Params>
  ): FirestoreEventHandler<QueryDocumentSnapshot<Record<string, unknown>>, Params>;
}

declare const process: {
  readonly env: Record<string, string | undefined>;
};