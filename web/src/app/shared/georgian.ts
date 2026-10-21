/** Phone keyboards can type Georgian capitals (Mtavruli, U+1C90–U+1CBF); names are stored in Mkhedruli. */
export function toMkhedruli(text: string): string {
  return text.replace(/[Ა-Ჿ]/g, char => String.fromCharCode(char.charCodeAt(0) - 0x1c90 + 0x10d0));
}

/** Folds case and Georgian capitals so a typed term can be compared with a name. */
export function foldForSearch(text: string): string {
  return toMkhedruli(text).toLocaleLowerCase();
}
