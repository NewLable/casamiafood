/**
 * Casa Mia — GitHub REST client for the static CMS.
 *
 * Writes JSON and images back to the repository so GitHub Pages can publish them.
 * Uses the Contents API (get SHA → Base64 → PUT) and, for a single save,
 * the Git Database API so one click creates one commit.
 *
 * The token is never stored in the repository.
 * Default: sessionStorage (cleared when the browser/tab session ends).
 * Optional: localStorage only if the owner checks “Remember this computer”.
 */
(function (global) {
  const API = "https://api.github.com";
  const ACCEPT = "application/vnd.github+json";
  const VERSION = "2022-11-28";

  const KEYS = {
    owner: "casamia_gh_owner",
    repo: "casamia_gh_repo",
    branch: "casamia_gh_branch",
    remember: "casamia_gh_remember",
    token: "casamia_gh_token"
  };

  function headers(token) {
    return {
      Accept: ACCEPT,
      "X-GitHub-Api-Version": VERSION,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    };
  }

  function readConfig() {
    return {
      owner: localStorage.getItem(KEYS.owner) || "",
      repo: localStorage.getItem(KEYS.repo) || "",
      branch: localStorage.getItem(KEYS.branch) || "main",
      remember: localStorage.getItem(KEYS.remember) === "1",
      token: sessionStorage.getItem(KEYS.token) || (localStorage.getItem(KEYS.remember) === "1" ? localStorage.getItem(KEYS.token) || "" : "")
    };
  }

  function saveConfig({ owner, repo, branch, remember, token }) {
    localStorage.setItem(KEYS.owner, (owner || "").trim());
    localStorage.setItem(KEYS.repo, (repo || "").trim());
    localStorage.setItem(KEYS.branch, (branch || "main").trim() || "main");
    localStorage.setItem(KEYS.remember, remember ? "1" : "0");

    const t = (token || "").trim();
    if (t) sessionStorage.setItem(KEYS.token, t);
    else sessionStorage.removeItem(KEYS.token);

    if (remember && t) localStorage.setItem(KEYS.token, t);
    else localStorage.removeItem(KEYS.token);
  }

  function clearToken() {
    sessionStorage.removeItem(KEYS.token);
  }

  function clearRememberedToken() {
    localStorage.removeItem(KEYS.token);
    localStorage.setItem(KEYS.remember, "0");
    sessionStorage.removeItem(KEYS.token);
  }

  function hasConnection() {
    const c = readConfig();
    return Boolean(c.owner && c.repo && c.token);
  }

  function encodeUtf8ToBase64(text) {
    const bytes = new TextEncoder().encode(text);
    return bytesToBase64(bytes);
  }

  function bytesToBase64(bytes) {
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  async function blobToBase64(blob) {
    const buf = await blob.arrayBuffer();
    return bytesToBase64(new Uint8Array(buf));
  }

  function formatCommitMessage(date = new Date()) {
    const pad = (n) => String(n).padStart(2, "0");
    const stamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    return `Update Casa Mia content — ${stamp}`;
  }

  async function request(path, { method = "GET", body, token } = {}) {
    const cfg = readConfig();
    const t = token || cfg.token;
    if (!t) throw new Error("Нет GitHub-токена. Откройте «Настройки GitHub» и подключите репозиторий.");

    const res = await fetch(`${API}${path}`, {
      method,
      headers: headers(t),
      body: body ? JSON.stringify(body) : undefined
    });

    let data = null;
    const raw = await res.text();
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch {
        data = { message: raw };
      }
    }

    if (!res.ok) {
      const msg = data?.message || `GitHub API ${res.status}`;
      const err = new Error(msg);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  async function verify(config) {
    const owner = (config?.owner || "").trim();
    const repo = (config?.repo || "").trim();
    const token = (config?.token || "").trim();
    if (!owner || !repo || !token) {
      return { ok: false, reason: "Заполните имя пользователя, репозиторий и токен." };
    }
    try {
      const user = await request("/user", { token });
      await request(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, { token });
      return {
        ok: true,
        login: user.login,
        name: user.name || user.login
      };
    } catch (e) {
      if (e.status === 401) return { ok: false, reason: "Неверный токен." };
      if (e.status === 404) return { ok: false, reason: "Репозиторий не найден или токен не имеет доступа." };
      if (e.status === 403) return { ok: false, reason: "Нет прав. У токена нужно Contents: Read and write." };
      return { ok: false, reason: e.message || "Не удалось проверить подключение." };
    }
  }

  async function getFile(path) {
    const { owner, repo, branch } = readConfig();
    try {
      return await request(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}?ref=${encodeURIComponent(branch)}`
      );
    } catch (e) {
      if (e.status === 404) return null;
      throw e;
    }
  }

  /**
   * Contents API write: get SHA → Base64 → PUT.
   * Used as a fallback and for single-file updates.
   */
  async function putFile(path, contentBase64, message) {
    const { owner, repo, branch } = readConfig();
    const existing = await getFile(path);
    const body = {
      message: message || formatCommitMessage(),
      content: contentBase64,
      branch
    };
    if (existing?.sha) body.sha = existing.sha;
    return request(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}`,
      { method: "PUT", body }
    );
  }

  async function putTextFile(path, text, message) {
    return putFile(path, encodeUtf8ToBase64(text), message);
  }

  async function putBlobFile(path, blob, message) {
    return putFile(path, await blobToBase64(blob), message);
  }

  async function listCommits(limit = 5) {
    const { owner, repo, branch } = readConfig();
    const rows = await request(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?sha=${encodeURIComponent(branch)}&per_page=${limit}`
    );
    return (rows || []).map((c) => ({
      sha: c.sha,
      message: (c.commit?.message || "").split("\n")[0],
      date: c.commit?.author?.date || c.commit?.committer?.date || "",
      url: c.html_url
    }));
  }

  /**
   * One commit for many files (JSON + images). GitHub REST Git Database API.
   * files: [{ path, contentBase64 }]
   */
  async function commitFiles(files, message) {
    const { owner, repo, branch } = readConfig();
    const msg = message || formatCommitMessage();
    const base = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;

    const ref = await request(`${base}/git/ref/heads/${encodeURIComponent(branch)}`);
    const parentSha = ref.object.sha;
    const parent = await request(`${base}/git/commits/${parentSha}`);

    const treeItems = [];
    for (const file of files) {
      const blob = await request(`${base}/git/blobs`, {
        method: "POST",
        body: { content: file.contentBase64, encoding: "base64" }
      });
      treeItems.push({
        path: file.path,
        mode: "100644",
        type: "blob",
        sha: blob.sha
      });
    }

    const tree = await request(`${base}/git/trees`, {
      method: "POST",
      body: { base_tree: parent.tree.sha, tree: treeItems }
    });

    const commit = await request(`${base}/git/commits`, {
      method: "POST",
      body: { message: msg, tree: tree.sha, parents: [parentSha] }
    });

    await request(`${base}/git/refs/heads/${encodeURIComponent(branch)}`, {
      method: "PATCH",
      body: { sha: commit.sha, force: false }
    });

    return { sha: commit.sha, message: msg, htmlUrl: commit.html_url };
  }

  /**
   * Save JSON strings and binary blobs in one commit.
   * Fallback: Contents API PUT per file (same commit message).
   */
  async function publish({ jsonFiles, blobs }) {
    const message = formatCommitMessage();
    const files = [];

    for (const item of jsonFiles || []) {
      files.push({
        path: item.path,
        contentBase64: encodeUtf8ToBase64(item.text)
      });
    }
    for (const item of blobs || []) {
      files.push({
        path: item.path,
        contentBase64: await blobToBase64(item.blob)
      });
    }

    try {
      return await commitFiles(files, message);
    } catch (e) {
      // Fine-grained tokens without git-data still work with Contents API.
      for (const file of files) {
        await putFile(file.path, file.contentBase64, message);
      }
      return { sha: "", message, fallback: true, error: e.message };
    }
  }

  global.CasaMiaGitHub = {
    KEYS,
    readConfig,
    saveConfig,
    clearToken,
    clearRememberedToken,
    hasConnection,
    verify,
    getFile,
    putFile,
    putTextFile,
    putBlobFile,
    listCommits,
    commitFiles,
    publish,
    formatCommitMessage,
    encodeUtf8ToBase64,
    blobToBase64
  };
})(window);
