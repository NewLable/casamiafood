/**
 * Casa Mia — browser image pipeline for the CMS.
 * Before upload: max width 1200px, WebP ~82%, square thumbnail.
 */
(function (global) {
  const MAX_WIDTH = 1200;
  const THUMB_SIZE = 480;
  const QUALITY = 0.82;
  const MIME = "image/webp";

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Не удалось прочитать изображение"));
      };
      img.src = url;
    });
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Браузер не смог сохранить изображение"));
        },
        type,
        quality
      );
    });
  }

  async function toBlobWithFallback(canvas) {
    try {
      const blob = await canvasToBlob(canvas, MIME, QUALITY);
      if (blob && blob.size > 0 && blob.type === MIME) return { blob, ext: "webp" };
    } catch {
      /* Safari fallback */
    }
    const blob = await canvasToBlob(canvas, "image/jpeg", QUALITY);
    return { blob, ext: "jpg" };
  }

  function drawCover(ctx, img, size) {
    const min = Math.min(img.width, img.height);
    const sx = (img.width - min) / 2;
    const sy = (img.height - min) / 2;
    ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
  }

  async function processFile(file) {
    if (!file || !file.type.startsWith("image/")) {
      throw new Error("Выберите файл изображения");
    }
    const img = await loadImage(file);
    const scale = img.width > MAX_WIDTH ? MAX_WIDTH / img.width : 1;
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));

    const main = document.createElement("canvas");
    main.width = w;
    main.height = h;
    const mctx = main.getContext("2d", { alpha: true });
    mctx.drawImage(img, 0, 0, w, h);
    const mainOut = await toBlobWithFallback(main);

    const thumb = document.createElement("canvas");
    thumb.width = THUMB_SIZE;
    thumb.height = THUMB_SIZE;
    const tctx = thumb.getContext("2d", { alpha: true });
    tctx.fillStyle = "#f7f1e8";
    tctx.fillRect(0, 0, THUMB_SIZE, THUMB_SIZE);
    drawCover(tctx, img, THUMB_SIZE);
    const thumbOut = await toBlobWithFallback(thumb);

    const previewUrl = URL.createObjectURL(mainOut.blob);
    return {
      blob: mainOut.blob,
      thumbBlob: thumbOut.blob,
      ext: mainOut.ext,
      thumbExt: thumbOut.ext,
      previewUrl,
      width: w,
      height: h
    };
  }

  function slugName(id) {
    return String(id || "image")
      .toLowerCase()
      .replace(/[^a-z0-9а-яё-]+/gi, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "image";
  }

  /**
   * Dropzone + file picker + preview + replace + remove.
   */
  function mount(container, { src = "", onPick, onRemove, label = "Фото товара" } = {}) {
    container.classList.add("img-manager");
    container.innerHTML = `
      <div class="img-drop" tabindex="0">
        <div class="img-preview-wrap ${src ? "" : "is-empty"}">
          ${src ? `<img class="img-preview" src="${src}" alt="">` : `<div class="img-placeholder">📷<span>${label}</span><small>Перетащите файл или нажмите, чтобы выбрать</small></div>`}
        </div>
        <input type="file" accept="image/*" hidden>
        <div class="img-actions">
          <button type="button" class="btn ghost btn-pick">Выбрать файл</button>
          <button type="button" class="btn ghost btn-replace" ${src ? "" : "hidden"}>Заменить</button>
          <button type="button" class="btn danger btn-remove" ${src ? "" : "hidden"}>Удалить</button>
        </div>
        <p class="img-note">Перед публикацией фото уменьшается до 1200 px и сохраняется как WebP.</p>
      </div>
    `;

    const drop = container.querySelector(".img-drop");
    const input = container.querySelector('input[type="file"]');
    const previewWrap = container.querySelector(".img-preview-wrap");
    const btnPick = container.querySelector(".btn-pick");
    const btnReplace = container.querySelector(".btn-replace");
    const btnRemove = container.querySelector(".btn-remove");

    function showPreview(url) {
      previewWrap.classList.remove("is-empty");
      previewWrap.innerHTML = `<img class="img-preview" src="${url}" alt="">`;
      btnReplace.hidden = false;
      btnRemove.hidden = false;
    }

    async function handleFile(file) {
      if (!file) return;
      drop.classList.add("is-busy");
      try {
        const processed = await processFile(file);
        showPreview(processed.previewUrl);
        onPick?.(processed, file);
      } catch (e) {
        alert(e.message || "Не удалось обработать фото");
      } finally {
        drop.classList.remove("is-busy");
        input.value = "";
      }
    }

    drop.addEventListener("dragover", (e) => {
      e.preventDefault();
      drop.classList.add("is-over");
    });
    drop.addEventListener("dragleave", () => drop.classList.remove("is-over"));
    drop.addEventListener("drop", (e) => {
      e.preventDefault();
      drop.classList.remove("is-over");
      handleFile(e.dataTransfer.files?.[0]);
    });
    drop.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      input.click();
    });
    btnPick.addEventListener("click", () => input.click());
    btnReplace.addEventListener("click", () => input.click());
    btnRemove.addEventListener("click", () => {
      previewWrap.classList.add("is-empty");
      previewWrap.innerHTML = `<div class="img-placeholder">📷<span>${label}</span><small>Перетащите файл или нажмите, чтобы выбрать</small></div>`;
      btnReplace.hidden = true;
      btnRemove.hidden = true;
      onRemove?.();
    });
    input.addEventListener("change", () => handleFile(input.files?.[0]));
  }

  global.CasaMiaImages = {
    MAX_WIDTH,
    THUMB_SIZE,
    processFile,
    slugName,
    mount
  };
})(window);
