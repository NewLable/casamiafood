/**
 * Casa Mia — multilingual field helpers for the CMS.
 * Languages: RU / UA / TR / EN. Empty values stay empty (no auto-copy from Russian).
 * Public site fallback: selected language → Russian.
 */
(function (global) {
  const LANGS = [
    { code: "ru", label: "RU" },
    { code: "ua", label: "UA" },
    { code: "tr", label: "TR" },
    { code: "en", label: "EN" }
  ];

  function emptyI18n() {
    return { ru: "", ua: "", tr: "", en: "" };
  }

  function ensureI18n(obj) {
    const base = emptyI18n();
    if (!obj) return base;
    if (typeof obj === "string") {
      base.ru = obj;
      return base;
    }
    LANGS.forEach((l) => {
      base[l.code] = typeof obj[l.code] === "string" ? obj[l.code] : "";
    });
    return base;
  }

  /** Public-site fallback: chosen language, then Russian. */
  function pick(obj, lang) {
    if (!obj) return "";
    if (typeof obj === "string") return obj;
    const code = lang || "ru";
    return obj[code] || obj.ru || "";
  }

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escAttr(s) {
    return esc(s).replace(/'/g, "&#39;");
  }

  /**
   * Four inputs/textareas stacked with language badges.
   * values are never copied across languages.
   */
  function fieldsHtml(name, values, { multiline = false, rows = 3, placeholder = "" } = {}) {
    const data = ensureI18n(values);
    return LANGS.map((l) => {
      const ph = placeholder ? ` placeholder="${escAttr(placeholder)}"` : "";
      const control = multiline
        ? `<textarea name="${name}.${l.code}" rows="${rows}"${ph}>${esc(data[l.code])}</textarea>`
        : `<input type="text" name="${name}.${l.code}" value="${escAttr(data[l.code])}"${ph}>`;
      return `<div class="i18n-field">
        <span class="lang-badge">${l.label}</span>
        ${control}
      </div>`;
    }).join("");
  }

  function blockHtml(title, name, values, options) {
    return `<div class="field-block">
      <div class="field-title">${esc(title)}</div>
      <div class="lang-grid">${fieldsHtml(name, values, options)}</div>
    </div>`;
  }

  function readNamed(form, name) {
    const out = emptyI18n();
    LANGS.forEach((l) => {
      const el = form.querySelector(`[name="${name}.${l.code}"]`);
      out[l.code] = el ? el.value : "";
    });
    return out;
  }

  function readFrom(root, name) {
    const out = emptyI18n();
    LANGS.forEach((l) => {
      const el = root.querySelector(`[name="${name}.${l.code}"]`);
      out[l.code] = el ? el.value : "";
    });
    return out;
  }

  global.CasaMiaI18n = {
    LANGS,
    emptyI18n,
    ensureI18n,
    pick,
    esc,
    escAttr,
    fieldsHtml,
    blockHtml,
    readNamed,
    readFrom
  };
})(window);
