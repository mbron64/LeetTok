const PYTHON_KEYWORDS = [
  "if",
  "for",
  "return",
  "in",
  "def",
  "class",
  "while",
  "not",
  "and",
  "or",
  "else",
  "elif",
  "True",
  "False",
  "None",
  "import",
  "from",
  "range",
  "len",
  "self",
];

const PYTHON_SYNTAX = ["(", ")", ":", "==", "!=", "[]", "{}", "+=", "-=", "="];

const JAVA_KEYWORDS = [
  "if",
  "for",
  "return",
  "new",
  "int",
  "void",
  "null",
  "else",
  "while",
  "String",
  "boolean",
  "public",
  "private",
  "this",
  "class",
];

const JAVA_SYNTAX = ["(", ")", ";", "==", "!=", "[]", "{}", "+=", "=", "."];

const IDENTIFIER_RE = /\b([a-zA-Z_]\w*)\b/g;

const NOISE_WORDS = new Set([
  "def",
  "class",
  "if",
  "for",
  "while",
  "return",
  "in",
  "not",
  "and",
  "or",
  "else",
  "elif",
  "True",
  "False",
  "None",
  "import",
  "from",
  "range",
  "len",
  "self",
  "new",
  "int",
  "void",
  "null",
  "String",
  "boolean",
  "public",
  "private",
  "this",
  "print",
]);

function extractIdentifiers(lines: string[]): string[] {
  const counts = new Map<string, number>();

  for (const line of lines) {
    let match: RegExpExecArray | null;
    IDENTIFIER_RE.lastIndex = 0;
    while ((match = IDENTIFIER_RE.exec(line)) !== null) {
      const name = match[1];
      if (!NOISE_WORDS.has(name) && name.length > 1) {
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);
}

function inferFromContext(
  lines: string[],
  blankIndex: number,
): string[] {
  const hints: string[] = [];
  const prevLine = blankIndex > 0 ? lines[blankIndex - 1] : "";
  const nextLine = blankIndex < lines.length - 1 ? lines[blankIndex + 1] : "";

  if (/for\s/.test(prevLine)) {
    hints.push("if", "return", "continue", "break");
  }
  if (/if\s/.test(prevLine) || /else/.test(prevLine)) {
    hints.push("return", "=");
  }
  if (/def\s/.test(prevLine)) {
    hints.push("if", "return", "for");
  }
  if (/:\s*$/.test(prevLine)) {
    hints.push("return", "if", "for");
  }
  if (/return/.test(nextLine)) {
    hints.push("=", "if", "+=");
  }
  if (/\bdict\b|\bHash|\bMap|\b{}\b/.test(lines.join("\n"))) {
    hints.push("in", "[]", "{}");
  }

  return hints;
}

export function suggestTokens(
  codeBlock: string[],
  blankLineIndex: number,
  language: string,
): string[] {
  const lang = language.toLowerCase();
  const isJava = lang === "java" || lang === "javascript" || lang === "typescript";

  const contextHints = inferFromContext(codeBlock, blankLineIndex);
  const identifiers = extractIdentifiers(codeBlock);
  const keywords = isJava ? JAVA_KEYWORDS : PYTHON_KEYWORDS;
  const syntax = isJava ? JAVA_SYNTAX : PYTHON_SYNTAX;

  const seen = new Set<string>();
  const result: string[] = [];

  const add = (token: string) => {
    if (!seen.has(token)) {
      seen.add(token);
      result.push(token);
    }
  };

  for (const t of contextHints) add(t);
  for (const id of identifiers.slice(0, 6)) add(id);
  for (const kw of keywords.slice(0, 6)) add(kw);
  for (const s of syntax) add(s);

  return result.slice(0, 12);
}

export function getLanguageTokens(language: string): string[] {
  const lang = language.toLowerCase();
  const isJava = lang === "java" || lang === "javascript" || lang === "typescript";

  const keywords = isJava ? JAVA_KEYWORDS : PYTHON_KEYWORDS;
  const syntax = isJava ? JAVA_SYNTAX : PYTHON_SYNTAX;

  return [...keywords, ...syntax];
}
