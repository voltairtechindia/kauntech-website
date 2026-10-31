/**
 * `output: "export"` refuses to build a dynamic route that has no params at all
 * (for example /career/[slug] while no role is open). An empty list builds one
 * placeholder page instead; the page finds no record for it and 404s.
 */
export const EMPTY_PARAM = "_none";

export function orPlaceholder<T extends Record<string, string>>(params: T[], empty: T): T[] {
  return params.length ? params : [empty];
}
