import { FunctionTemplate } from "./types";
import { getFunctionArg } from "./utils";

export const functionTemplates: Record<string, FunctionTemplate> = {
  log: {
    name: "log",
    args: [getFunctionArg("message", "string")],
    script: {
      name: "log",
      body: [`console.log(message);`],
    },
    returnArgs: [],
  },
  moveTo: {
    name: "moveTo",
    args: [getFunctionArg("x", "number"), getFunctionArg("y", "number")],
    script: {
      name: "moveTo",
      body: [`// Move entity to (x, y)`],
    },
    returnArgs: [],
  },
};

export function getFunctionTemplateByName(name: string): FunctionTemplate | null {
  return functionTemplates[name] || null;
}