/** "Asha Verma" → "Asha". Used to greet people on Study. */
export function firstName(displayName: string): string {
  return displayName.trim().split(/\s+/)[0] || 'there'
}
