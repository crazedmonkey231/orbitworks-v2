export interface FunctionArg {
  name: string;
  type: string;
}

export interface ScriptTemplate {
  name: string;
  body: string[];
}

export interface FunctionTemplate {
  name: string;
  args: FunctionArg[];
  script: ScriptTemplate;
  returnArgs: FunctionArg[];
}

export interface EntityTemplate {
  name: string;
  propertyInjection?: { [key: string]: string };
  startupScript?: ScriptTemplate;
  methodInjection: { [key: string]: FunctionTemplate };
}

export const enum PortType {
  Exec,
  Data,
}

export const enum PortDirection {
  Input,
  Output,
}

export const enum NodeType {
  Function, // Regular function node with exec input/output
  Variable, // Variable node for storing data
  Event, // Event node for handling events
  Start, // Start node for execution flow
  End, // Return node for execution flow
}