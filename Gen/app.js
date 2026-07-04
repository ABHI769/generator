(function () {
  "use strict";

  const CANVAS_W = 800;
  const CANVAS_H = 565;

  const els = {
    uploadZone: document.getElementById("uploadZone"),
    templateInput: document.getElementById("templateInput"),
    browseBtn: document.getElementById("browseBtn"),
    templatePreview: document.getElementById("templatePreview"),
    useDefaultBtn: document.getElementById("useDefaultBtn"),
    namesInput: document.getElementById("namesInput"),
    nameCount: document.getElementById("nameCount"),
    fontFamily: document.getElementById("fontFamily"),
    fontSize: document.getElementById("fontSize"),
    fontSizeVal: document.getElementById("fontSizeVal"),
    fontColor: document.getElementById("fontColor"),
    nameY: document.getElementById("nameY"),
    nameYVal: document.getElementById("nameYVal"),
    generateBtn: document.getElementById("generateBtn"),
    liveCanvas: document.getElementById("liveCanvas"),
    downloadAllBtn: document.getElementById("downloadAllBtn"),
    resultsSection: document.getElementById("resultsSection"),
    resultsGrid: document.getElementById("resultsGrid"),
    resultCount: document.getElementById("resultCount"),
    emptyState: document.getElementById("emptyState"),
  };

  let templateImage = null;
  let generatedCertificates = [];

  function parseNames(text) {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function updateNameCount() {
    const count = parseNames(els.namesInput.value).length;
    els.nameCount.textContent = count;
  }

  function getSettings() {
    return {
      fontFamily: els.fontFamily.value,
      fontSize: Number(els.fontSize.value),
      fontColor: els.fontColor.value,
      nameYPercent: Number(els.nameY.value),
    };
  }

  function drawDefaultTemplate(ctx) {
    const w = CANVAS_W;
    const h = CANVAS_H;

    ctx.fillStyle = "#faf8f3";
    ctx.fillRect(0, 0, w, h);

    const margin = 28;
    ctx.strokeStyle = "#c9a227";
    ctx.lineWidth = 4;
    ctx.strokeRect(margin, margin, w - margin * 2, h - margin * 2);

    ctx.lineWidth = 1.5;
    ctx.strokeRect(margin + 10, margin + 10, w - (margin + 10) * 2, h - (margin + 10) * 2);

    ctx.strokeStyle = "#1a2744";
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const x = margin + 20 + i * 18;
      const y = margin + 20 + i * 18;
      ctx.beginPath();
      ctx.moveTo(x, margin + 20);
      ctx.lineTo(margin + 20, y);
      ctx.stroke();
    }

    ctx.textAlign = "center";
    ctx.fillStyle = "#1a2744";

    ctx.font = "600 42px 'Cormorant Garamond', Georgia, serif";
    ctx.fillText("CERTIFICATE", w / 2, 115);

    ctx.font = "italic 400 22px 'Cormorant Garamond', Georgia, serif";
    ctx.fillStyle = "#5a6478";
    ctx.fillText("of Achievement", w / 2, 148);

    ctx.font = "400 18px 'DM Sans', Arial, sans-serif";
    ctx.fillStyle = "#5a6478";
    ctx.fillText("This is to certify that", w / 2, 210);

    ctx.font = "400 16px 'DM Sans', Arial, sans-serif";
    ctx.fillText("has successfully completed the course requirements", w / 2, 340);
    ctx.fillText("with outstanding performance and dedication.", w / 2, 365);

    ctx.strokeStyle = "#c9a227";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 120, 420);
    ctx.lineTo(w / 2 + 120, 420);
    ctx.stroke();

    ctx.font = "400 14px 'DM Sans', Arial, sans-serif";
    ctx.fillStyle = "#5a6478";
    ctx.fillText("Authorized Signature", w / 2, 445);

    ctx.fillText("Date: _______________", w / 2, 490);
  }

  function createDefaultTemplateImage() {
    const off = document.createElement("canvas");
    off.width = CANVAS_W;
    off.height = CANVAS_H;
    const ctx = off.getContext("2d");
    drawDefaultTemplate(ctx);
    const img = new Image();
    img.src = off.toDataURL("image/png");
    return new Promise((resolve) => {
      img.onload = () => resolve(img);
    });
  }

  function drawCertificate(canvas, name, settings) {
    const ctx = canvas.getContext("2d");
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;

    if (templateImage) {
      ctx.drawImage(templateImage, 0, 0, CANVAS_W, CANVAS_H);
    } else {
      drawDefaultTemplate(ctx);
    }

    const y = (settings.nameYPercent / 100) * CANVAS_H;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = settings.fontColor;
    ctx.font = `700 ${settings.fontSize}px "${settings.fontFamily}", Georgia, serif`;

    const maxWidth = CANVAS_W * 0.75;
    let fontSize = settings.fontSize;
    while (fontSize > 20) {
      ctx.font = `700 ${fontSize}px "${settings.fontFamily}", Georgia, serif`;
      if (ctx.measureText(name).width <= maxWidth) break;
      fontSize -= 2;
    }

    ctx.fillText(name, CANVAS_W / 2, y);
    return canvas.toDataURL("image/png");
  }

  function updateLivePreview() {
    const names = parseNames(els.namesInput.value);
    const previewName = names[0] || "Student Name";
    drawCertificate(els.liveCanvas, previewName, getSettings());
  }

  function loadTemplateFromFile(file) {
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        templateImage = img;
        els.templatePreview.src = e.target.result;
        els.templatePreview.classList.remove("hidden");
        els.uploadZone.querySelector(".upload-content").classList.add("hidden");
        updateLivePreview();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  async function useDefaultTemplate() {
    templateImage = await createDefaultTemplateImage();
    els.templatePreview.src = templateImage.src;
    els.templatePreview.classList.remove("hidden");
    els.uploadZone.querySelector(".upload-content").classList.add("hidden");
    updateLivePreview();
  }

  function downloadDataUrl(dataUrl, filename) {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function sanitizeFilename(name) {
    return name.replace(/[<>:"/\\|?*]/g, "").trim() || "certificate";
  }

  function generateCertificates() {
    const names = parseNames(els.namesInput.value);
    if (names.length === 0) {
      alert("Please enter at least one name (one per line).");
      return;
    }

    const settings = getSettings();
    const offscreen = document.createElement("canvas");
    generatedCertificates = names.map((name) => ({
      name,
      dataUrl: drawCertificate(offscreen, name, settings),
    }));

    renderResults();
  }

  function renderResults() {
    els.resultsGrid.innerHTML = "";
    els.resultCount.textContent = generatedCertificates.length;

    generatedCertificates.forEach((cert, index) => {
      const card = document.createElement("div");
      card.className = "result-card";

      const img = document.createElement("img");
      img.src = cert.dataUrl;
      img.alt = `Certificate for ${cert.name}`;

      const footer = document.createElement("div");
      footer.className = "result-card-footer";

      const nameEl = document.createElement("span");
      nameEl.className = "result-name";
      nameEl.textContent = cert.name;
      nameEl.title = cert.name;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-download";
      btn.textContent = "Download";
      btn.addEventListener("click", () => {
        downloadDataUrl(cert.dataUrl, `${sanitizeFilename(cert.name)}-certificate.png`);
      });

      footer.appendChild(nameEl);
      footer.appendChild(btn);
      card.appendChild(img);
      card.appendChild(footer);
      els.resultsGrid.appendChild(card);
    });

    els.resultsSection.classList.remove("hidden");
    els.emptyState.classList.add("hidden");
    els.downloadAllBtn.classList.remove("hidden");
  }

  async function downloadAllAsZip() {
    if (generatedCertificates.length === 0) return;

    const zip = new JSZip();
    generatedCertificates.forEach((cert) => {
      const base64 = cert.dataUrl.split(",")[1];
      zip.file(`${sanitizeFilename(cert.name)}-certificate.png`, base64, { base64: true });
    });

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "certificates.zip";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  els.browseBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    els.templateInput.click();
  });

  els.uploadZone.addEventListener("click", () => els.templateInput.click());

  els.templateInput.addEventListener("change", (e) => {
    if (e.target.files[0]) loadTemplateFromFile(e.target.files[0]);
  });

  els.uploadZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    els.uploadZone.classList.add("dragover");
  });

  els.uploadZone.addEventListener("dragleave", () => {
    els.uploadZone.classList.remove("dragover");
  });

  els.uploadZone.addEventListener("drop", (e) => {
    e.preventDefault();
    els.uploadZone.classList.remove("dragover");
    if (e.dataTransfer.files[0]) loadTemplateFromFile(e.dataTransfer.files[0]);
  });

  els.useDefaultBtn.addEventListener("click", useDefaultTemplate);

  els.namesInput.addEventListener("input", () => {
    updateNameCount();
    updateLivePreview();
  });

  [els.fontFamily, els.fontSize, els.fontColor, els.nameY].forEach((el) => {
    el.addEventListener("input", () => {
      els.fontSizeVal.textContent = `${els.fontSize.value}px`;
      els.nameYVal.textContent = `${els.nameY.value}%`;
      updateLivePreview();
    });
  });

  els.generateBtn.addEventListener("click", generateCertificates);
  els.downloadAllBtn.addEventListener("click", downloadAllAsZip);

  useDefaultTemplate();
  updateNameCount();
})();
