function dedent(strings: TemplateStringsArray, ...values: any[]): string {
  const rawString = strings.reduce((result, str, i) => {
    return `${result}${str}${values[i] ?? ""}`;
  }, "");

  const lines = rawString.split("\n");
  const nonEmptyLines = lines.filter((line) => line.trim() !== "");

  if (nonEmptyLines.length === 0) {
    return "";
  }

  const indentSize = Math.min(
    // The regex /^\s*/ always returns a valid result, even on an empty string, because it matches "zero or more spaces at the beginning of the line"
    // Then, line.match(/^\s*/) never will be null
    ...nonEmptyLines.map((line) => line.match(/^\s*/)![0].length)
  );

  return lines
    .map((line) =>
      line.startsWith(" ".repeat(indentSize)) ? line.slice(indentSize) : line
    )
    .join("\n")
    .trim();
}

export { dedent };
