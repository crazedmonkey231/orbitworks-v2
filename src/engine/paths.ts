/** 
 * Paths to various assets in the public folder. 
 * These functions take a filename and return the full path to the asset.
 */

export const AudioPath = (file: string) => `audio/${file}`;
export const ModelPath = (file: string) => `models/${file}`;
export const TexturePath = (file: string) => `textures/${file}`;
export const ScenesPath = (file: string) => `scenes/${file}`;
export const ScriptsPath = (file: string) => `scripts/${file}`;