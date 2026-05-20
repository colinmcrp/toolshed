// docxtemplater 3.x's default parser does not resolve dot-notation paths
// (e.g. {counterparty.legalName}) — it treats the whole string as one key
// and the value comes back as undefined. This parser walks the scope manually.
export function dottedParser(tag: string) {
  const path = tag.trim();
  return {
    get(scope: unknown): unknown {
      if (path === ".") return scope;
      const parts = path.split(".");
      let cur: unknown = scope;
      for (const part of parts) {
        if (cur == null || typeof cur !== "object") return "";
        cur = (cur as Record<string, unknown>)[part];
      }
      return cur == null ? "" : cur;
    },
  };
}
