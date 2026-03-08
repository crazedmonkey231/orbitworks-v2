import { ScriptTemplate } from './types';

export const scriptTemplates: Record<string, ScriptTemplate> = {
  log: {
    name: 'log',
    body: ['console.log(message);'],
  },
  moveTo: {
    name: 'moveTo',
    body: ['// Move entity to (x, y)'],
  },
};

export function getScriptTemplateByName(name: string): ScriptTemplate | null {
  return scriptTemplates[name] || null;
}