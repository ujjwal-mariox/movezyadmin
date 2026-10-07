/** Bootstrap stubs and un-published drafts are not public policy text. */
export function isPublishedPolicy(value: { content?: string; publishedAt?: string } | null | undefined) {
  const text = value?.content?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || "";
  return text.length >= 400 && !!value?.publishedAt && Number.isFinite(Date.parse(value.publishedAt));
}

/** Keep policy formatting without executing CMS HTML or embedding resources. */
export function safePolicyHtml(html: string) {
  const template = document.createElement("template");
  template.innerHTML = html;
  const allowed = new Set(["H1", "H2", "H3", "H4", "P", "UL", "OL", "LI", "BR", "STRONG", "EM", "B", "I", "A", "BLOCKQUOTE", "TABLE", "THEAD", "TBODY", "TR", "TH", "TD"]);
  const discard = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "SVG", "MATH", "FORM", "INPUT", "BUTTON", "IMG", "VIDEO", "AUDIO", "LINK", "META", "BASE"]);
  for (let element of Array.from(template.content.querySelectorAll("*"))) {
    if (discard.has(element.tagName)) { element.remove(); continue; }
    if (!allowed.has(element.tagName)) { element.replaceWith(...Array.from(element.childNodes)); continue; }
    const href = element.tagName === "A" ? element.getAttribute("href") : null;
    for (const attribute of Array.from(element.attributes)) element.removeAttribute(attribute.name);
    if (element.tagName === "H1") {
      const heading = document.createElement("h2");
      heading.append(...Array.from(element.childNodes)); element.replaceWith(heading); element = heading;
    }
    if (href) {
      try {
        const url = new URL(href, window.location.origin);
        if (["http:", "https:", "mailto:"].includes(url.protocol)) { element.setAttribute("href", url.href); element.setAttribute("rel", "noopener noreferrer"); }
      } catch { /* Invalid links remain plain text. */ }
    }
  }
  return template.innerHTML;
}
