import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";
import process from "node:process";

import { compile } from "json-schema-to-typescript";

const draft2020Schema = "https://json-schema.org/draft/2020-12/schema";
const repoRoot = resolve(import.meta.dirname, "../../..");
const schemaRoot = join(repoRoot, "packages/contracts/schemas");
const generatedRoot = join(repoRoot, "packages/contracts/generated/typescript");

async function collectSchemaFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(directory, entry.name);

      if (entry.isDirectory()) {
        return collectSchemaFiles(fullPath);
      }

      return extname(entry.name) === ".json" ? [fullPath] : [];
    })
  );

  return files.flat().sort();
}

function validateSchemaDocument(schemaPath, schema) {
  if (schema.$schema !== draft2020Schema) {
    throw new Error(`${schemaPath}: expected $schema to be ${draft2020Schema}`);
  }

  if (typeof schema.$id !== "string" || schema.$id.length === 0) {
    throw new Error(`${schemaPath}: missing non-empty $id`);
  }

  if (typeof schema.title !== "string" || schema.title.length === 0) {
    throw new Error(`${schemaPath}: missing non-empty title`);
  }

  if (typeof schema.description !== "string" || schema.description.length === 0) {
    throw new Error(`${schemaPath}: missing non-empty description`);
  }

  if (schema.type !== "object") {
    throw new Error(`${schemaPath}: canonical contracts must declare type object`);
  }

  if (schema.additionalProperties !== false) {
    throw new Error(`${schemaPath}: canonical contracts must set additionalProperties to false`);
  }
}

async function readSchemas() {
  const schemaFiles = await collectSchemaFiles(schemaRoot);

  return Promise.all(
    schemaFiles.map(async (schemaPath) => {
      const schemaText = await readFile(schemaPath, "utf8");
      const schema = JSON.parse(schemaText);
      validateSchemaDocument(relative(repoRoot, schemaPath), schema);
      return { schemaPath, schema };
    })
  );
}

async function validateSchemas() {
  const schemas = await readSchemas();
  console.log(`Validated ${schemas.length} canonical JSON Schema documents.`);
}

async function generateTypes() {
  const schemas = await readSchemas();

  for (const { schemaPath, schema } of schemas) {
    const schemaRelativePath = relative(schemaRoot, schemaPath);
    const outputPath = join(
      generatedRoot,
      schemaRelativePath.replace(/\.schema\.json$/u, ".d.ts")
    );
    const outputDirectory = dirname(outputPath);

    await mkdir(outputDirectory, { recursive: true });

    const generatedType = await compile(schema, schema.title, {
      bannerComment: "",
      format: false,
      unreachableDefinitions: true,
      strictIndexSignatures: true
    });

    await writeFile(outputPath, `${generatedType.trim()}\n`, "utf8");
  }

  console.log(`Generated ${schemas.length} TypeScript declaration files.`);
}

const command = process.argv[2];

if (command === "validate") {
  await validateSchemas();
} else if (command === "generate-types") {
  await generateTypes();
} else {
  console.error("Usage: node scripts/schema-tooling.mjs <validate|generate-types>");
  process.exitCode = 1;
}