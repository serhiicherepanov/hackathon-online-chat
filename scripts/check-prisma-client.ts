import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Prisma } from "@prisma/client";

function parseSchemaModels(schema: string): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>();
  const modelRegex = /model\s+(\w+)\s*\{([\s\S]*?)\}/g;

  let match: RegExpExecArray | null;
  while ((match = modelRegex.exec(schema)) !== null) {
    const modelName = match[1];
    const body = match[2] ?? "";
    const fields = new Set<string>();

    for (const rawLine of body.split("\n")) {
      const line = rawLine.trim();
      if (line.length === 0 || line.startsWith("//") || line.startsWith("@@")) {
        continue;
      }

      const token = line.split(/\s+/)[0];
      if (!token || token.startsWith("@")) {
        continue;
      }
      fields.add(token);
    }

    result.set(modelName, fields);
  }

  return result;
}

function main() {
  const schemaPath = resolve(process.cwd(), "prisma/schema.prisma");
  const schema = readFileSync(schemaPath, "utf8");
  const schemaModels = parseSchemaModels(schema);
  const clientModels = new Map(
    Prisma.dmmf.datamodel.models.map((model) => [
      model.name,
      new Set(model.fields.map((field) => field.name)),
    ]),
  );

  const problems: string[] = [];

  for (const [modelName, schemaFields] of schemaModels) {
    const clientFields = clientModels.get(modelName);
    if (!clientFields) {
      problems.push(`Missing model in generated client: ${modelName}`);
      continue;
    }

    for (const fieldName of schemaFields) {
      if (!clientFields.has(fieldName)) {
        problems.push(`Missing field in generated client: ${modelName}.${fieldName}`);
      }
    }
  }

  if (problems.length > 0) {
    console.error("Prisma client is out of sync with prisma/schema.prisma.");
    console.error("Regenerate and redeploy with a clean cache.");
    for (const problem of problems) {
      console.error(`- ${problem}`);
    }
    process.exit(1);
  }

  console.log("Prisma client is in sync with prisma/schema.prisma.");
}

main();
