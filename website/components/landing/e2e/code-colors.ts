/** Matches the shiki github-dark palette the design's terminal mocks use. */
export const CODE_COLORS = {
  plain: "rgb(230, 237, 243)",
  kw: "rgb(255, 123, 114)",
  str: "rgb(165, 214, 255)",
  fn: "rgb(210, 168, 255)",
  cmt: "rgb(139, 148, 158)",
  type: "rgb(121, 192, 255)",
  name: "rgb(255, 166, 87)",
} as const;

export type CodeTokenColor = keyof typeof CODE_COLORS;
