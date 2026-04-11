import { writeFileSync } from "node:fs";
import { projectUserConfig } from "../src/configs/project";

const jsonSchema = projectUserConfig.schema.toJSONSchema();

writeFileSync("configuration_schema.json", JSON.stringify(jsonSchema, null, 2));
