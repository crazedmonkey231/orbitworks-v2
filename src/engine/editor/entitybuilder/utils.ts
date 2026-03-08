import { BuilderNode } from "./buildernode";
import { EntityBuilderPanel } from "./entitybuilderpanel";
import { FunctionArg, FunctionTemplate, EntityTemplate, NodeType } from "./types";

export function getFunctionArg(name: string, type: string): FunctionArg {
  return { name, type };
}

export function getFunctionArgsString(args: FunctionArg[]): string {
  return args.map((arg) => `${arg.name}: ${arg.type}`).join(", ");
}

export function getFunctionTemplate(functionTemplate: FunctionTemplate): string {
  const { name, args, script, returnArgs } = functionTemplate;
  const argsString = getFunctionArgsString(args);
  const returnArgsString = getFunctionArgsString(returnArgs);
  const body = script.body.join("\n");
  if (returnArgs.length === 0) {
    return `
  ${name}(${argsString}): void {
    ${body}
  }`;
  } else if (returnArgs.length === 1) {
    return `
  ${name}(${argsString}): ${returnArgs[0].type} { 
    ${body}
  }`;
  } else {
    return `
    ${name}(${argsString}): { ${returnArgsString} } {
      ${body}
    }`;
  }
}

export function getEntityTemplate(template: EntityTemplate): string {
  return `
export class ${template.name} extends EntityBase {
  ${Object.values(template.propertyInjection ?? {}).map((value, index) => `${value}\n`).join("")}
  constructor(threeScene: ThreeSceneBase, state: EntityState) {
    super(threeScene, state);
    ${template.startupScript?.body.join("\n") ?? ""}
  }
  ${Object.values(template.methodInjection)
    .map((value) => getFunctionTemplate(value))
    .join("\n")}
}`;
}

export function createFunctionNode(panel: EntityBuilderPanel, x: number, y: number, functionTemplate: FunctionTemplate): BuilderNode {
  const node = new BuilderNode(panel, x, y, functionTemplate.name, NodeType.Function);
  functionTemplate.args.forEach((arg, index) => {
    node.addDataPort(arg.name, false);
  });
  functionTemplate.returnArgs.forEach((arg, index) => {
    node.addDataPort(arg.name, true);
  });
  return node;
}