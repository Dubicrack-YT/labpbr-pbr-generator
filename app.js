/* Tectonic Field Notes: conversión local y moderada de albedo en mapas PBR; nunca Glossy ni desplazamiento falso. */
(() => {
  const MAX_BYTES = 300 * 1024 * 1024;
  const MAX_TEXTURES = 20000;
  const BEDROCK_SAMPLES_API = "https://api.github.com/repos/Mojang/bedrock-samples/releases?per_page=24";
  const state = { edition: "java", profile: "vibrant", bedrockSource: "official", strength: 2.2, files: [], busy: false, releases: [], selectedRelease: "", releasesState: "loading", officialLoading: false };
  const $ = (selector) => document.querySelector(selector);
  const elements = {
    editionButtons: [...document.querySelectorAll(".edition-option")], profileButtons: [...document.querySelectorAll(".profile-option")], assetSourceButtons: [...document.querySelectorAll(".asset-source")],
    bedrockProfiles: $("#bedrock-profiles"), bedrockAssets: $("#bedrock-assets"), officialAssetsPanel: $("#official-assets-panel"), profileWarning: $("#profile-warning"), strength: $("#strength"), strengthOutput: $("#strength-output"),
    formatChip: $("#format-chip"), fileInput: $("#file-input"), dropzone: $("#dropzone"), dropTitle: $("#drop-title"), dropHelp: $("#drop-help"),
    fileQueue: $("#file-queue"), convertButton: $("#convert-button"), resultLabel: $("#result-label"), processingSummary: $("#processing-summary"),
    outputDescription: $("#output-description"), propertiesLetter: $("#properties-letter"), propertiesName: $("#properties-name"), propertiesDetail: $("#properties-detail"),
    profileNote: $("#profile-note"), toast: $("#toast"), officialStatus: $("#official-assets-status"), officialControls: $("#official-assets-controls"), officialRelease: $("#official-release"), officialReleaseKind: $("#official-release-kind"), officialReleaseSize: $("#official-release-size"), officialDownload: $("#official-download"), officialQueue: $("#official-queue"), sourceNote: $("#source-note")
  };
  let toastTimer;

  function showToast(message, isError = false) {
    clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.toggle("is-error", isError);
    elements.toast.classList.add("is-visible");
    toastTimer = setTimeout(() => elements.toast.classList.remove("is-visible"), 4400);
  }

  function fileSize(bytes) { return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`; }
  function cleanName(name) { return name.replace(/\.(zip|jar|mcpack)$/i, "").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 70) || "pack"; }
  function isAllowed(file) { const ext = file.name.split(".").pop().toLowerCase(); return state.edition === "java" ? ["zip", "jar"].includes(ext) : ["zip", "mcpack"].includes(ext); }
  function zipName(file) { const base = cleanName(file.name); return state.edition === "java" ? `${base}-pbr-normal-java.zip` : `${base}-pbr-normal-${state.profile}.mcpack`; }
  function releaseAsset() { return state.releases.find((release) => release.tag === state.selectedRelease) || state.releases[0]; }
  function setOfficialStatus(message, isError = false) { elements.officialStatus.textContent = message; elements.officialStatus.classList.toggle("is-error", isError); }
  function renderOfficialAssets() {
    const release = releaseAsset();
    const official = state.edition === "bedrock" && state.bedrockSource === "official";
    elements.officialAssetsPanel.hidden = !official;
    if (!official) return;
    if (state.releasesState === "loading") { elements.officialControls.hidden = true; setOfficialStatus("Consultando releases oficiales…"); return; }
    if (state.releasesState === "error") { elements.officialControls.hidden = true; setOfficialStatus("No se pudo cargar el catálogo. Abre Releases de Mojang y descarga un full.zip para subirlo en Custom.", true); return; }
    elements.officialControls.hidden = false;
    elements.officialRelease.innerHTML = state.releases.map((release) => `<option value="${escapeHtml(release.tag)}">${escapeHtml(release.tag)} · ${release.prerelease ? "Preview" : "estable"}</option>`).join("");
    elements.officialRelease.value = release.tag;
    elements.officialReleaseKind.textContent = release.prerelease ? "PREVIEW" : "ESTABLE";
    elements.officialReleaseKind.classList.toggle("is-preview", release.prerelease);
    elements.officialReleaseSize.textContent = `${fileSize(release.size)} · ${release.assetName}`;
    elements.officialDownload.href = release.url;
    elements.officialQueue.disabled = state.officialLoading;
    elements.officialQueue.textContent = state.officialLoading ? "CARGANDO…" : "USAR FULL.ZIP";
    setOfficialStatus(state.officialLoading ? "Intentando preparar el asset oficial dentro del navegador…" : "Selecciona una release estable o preview; el asset completo se conserva siempre como full.zip.");
  }
  async function loadOfficialAssets() {
    try {
      state.releasesState = "loading"; renderOfficialAssets();
      const response = await fetch(BEDROCK_SAMPLES_API);
      if (!response.ok) throw new Error(`GitHub respondió ${response.status}`);
      const raw = await response.json();
      state.releases = raw.map((release) => { const asset = release.assets.find((item) => /-full\.zip$/i.test(item.name)); return asset ? { tag: release.tag_name, prerelease: Boolean(release.prerelease), assetName: asset.name, url: asset.browser_download_url, size: asset.size } : null; }).filter(Boolean).sort((left, right) => Number(left.prerelease) - Number(right.prerelease));
      if (!state.releases.length) throw new Error("No hay full.zip disponibles");
      state.selectedRelease = state.releases.find((release) => !release.prerelease)?.tag || state.releases[0].tag;
      state.releasesState = "ready";
    } catch (error) { console.warn(error); state.releasesState = "error"; }
    renderOfficialAssets();
  }
  async function useOfficialAsset() {
    const release = releaseAsset(); if (!release || state.officialLoading) return;
    state.officialLoading = true; renderOfficialAssets();
    try {
      const response = await fetch(release.url);
      if (!response.ok) throw new Error(`El asset respondió ${response.status}`);
      const blob = await response.blob(); addFiles([new File([blob], release.assetName, { type: "application/zip" })]);
      setOfficialStatus(`${release.assetName} está listo para convertir localmente.`);
    } catch (error) { console.warn(error); setOfficialStatus("La lectura directa fue bloqueada. Usa DESCARGAR y, cuando termine, cambia a Custom para subir el full.zip.", true); }
    state.officialLoading = false; renderOfficialAssets();
  }

  function syncInterface() {
    const bedrock = state.edition === "bedrock";
    elements.bedrockProfiles.hidden = !bedrock;
    elements.bedrockAssets.hidden = !bedrock;
    const officialMode = bedrock && state.bedrockSource === "official";
    elements.fileInput.closest(".input-panel").classList.toggle("is-official-mode", officialMode);
    elements.dropzone.hidden = officialMode;
    elements.assetSourceButtons.forEach((item) => { const active = item.dataset.bedrockSource === state.bedrockSource; item.classList.toggle("is-selected", active); item.setAttribute("aria-checked", String(active)); });
    elements.fileInput.accept = bedrock ? ".zip,.mcpack" : ".zip,.jar";
    elements.formatChip.textContent = bedrock ? "BEDROCK · .ZIP / .MCPACK" : "JAVA · .ZIP / .JAR";
    elements.dropTitle.textContent = bedrock ? "Suelta Vanilla ZIP o MCPACK Bedrock" : "Suelta resource packs Java o JARs";
    elements.dropHelp.textContent = bedrock ? "ZIP · MCPACK · selección múltiple" : "ZIP · JAR · selección múltiple";
    elements.propertiesLetter.textContent = bedrock ? "MER" : "S";
    elements.propertiesName.textContent = bedrock ? "MER" : "Propiedades";
    elements.propertiesDetail.textContent = bedrock ? "metal · emisión 0 · rugosidad" : "suavidad · F0 · sin emisión";
    elements.outputDescription.innerHTML = bedrock
      ? "La salida Bedrock crea un MCPACK con color preservado, normal, MER y <code>*.texture_set.json</code>."
      : "La salida Java crea un resource pack ZIP con color preservado, normal derivada y mapa LABPBR <code>_s</code>.";
    elements.resultLabel.textContent = bedrock ? `MCPACK · BEDROCK ${state.profile === "vibrant" ? "VIBRANT VISUALS" : "RTX"}` : "RESOURCE PACK ZIP · JAVA LABPBR";
    elements.profileWarning.textContent = state.profile === "vibrant"
      ? "Vibrant Visuals puede cambiar entre versiones, dispositivos y recursos activos. El pack no añade shaders."
      : "RTX requiere hardware y ray tracing compatibles. Bedrock aplica PBR de RTX a bloques; ítems y entidades no se convertirán para este perfil.";
    elements.profileNote.textContent = bedrock && state.profile === "rtx"
      ? "RTX: se convierten únicamente texturas de bloques, según el alcance PBR documentado por Bedrock."
      : "Lectura automática del nombre: metales, madera, piedra, vidrio y material genérico. Puedes conservar mapas ya existentes.";
    if (bedrock) { elements.sourceNote.innerHTML = officialMode ? "El catálogo usa releases oficiales de Mojang. Si la lectura directa se bloquea, descarga el <code>full.zip</code> y súbelo desde Custom." : "Custom acepta exclusivamente tu ZIP o MCPACK Bedrock. No se admiten JAR, APK ni imágenes individuales."; renderOfficialAssets(); }
    renderQueue();
  }

  function renderQueue() {
    const count = state.files.length;
    elements.processingSummary.textContent = `${count} archivo${count === 1 ? "" : "s"} en cola`;
    elements.convertButton.disabled = !count || state.busy;
    elements.convertButton.innerHTML = state.busy ? "PROCESANDO LOCALMENTE…" : `GENERAR MAPAS PBR <span>→</span>`;
    if (!count) { elements.fileQueue.innerHTML = '<div class="empty-queue"><span>—</span>La cola está vacía. Elige un archivo empaquetado para iniciar.</div>'; return; }
    elements.fileQueue.innerHTML = state.files.map((file, index) => `<div class="queue-item"><span class="file-name">${escapeHtml(file.name)}</span><span class="file-size">${fileSize(file.size)}</span><button class="remove-file" type="button" data-remove="${index}" aria-label="Eliminar ${escapeHtml(file.name)}">×</button></div>`).join("");
    document.querySelectorAll("[data-remove]").forEach(button => button.addEventListener("click", () => { if (!state.busy) { state.files.splice(Number(button.dataset.remove), 1); renderQueue(); } }));
  }
  function escapeHtml(value) { return value.replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c])); }

  function addFiles(files) {
    if (state.busy) return;
    const accepted = []; const rejected = [];
    for (const file of files) {
      if (!isAllowed(file)) rejected.push(file.name);
      else if (file.size > MAX_BYTES) rejected.push(`${file.name} (supera 300 MB)`);
      else accepted.push(file);
    }
    state.files = [...state.files, ...accepted].slice(0, 20);
    if (rejected.length) showToast(`No se añadieron: ${rejected.join(", ")}. Solo se aceptan paquetes compatibles con el destino elegido.`, true);
    if (accepted.length) showToast(`${accepted.length} archivo${accepted.length === 1 ? " añadido" : "s añadidos"} a la cola.`);
    renderQueue();
  }

  function normalizeJavaPath(path) { const found = path.toLowerCase().indexOf("assets/"); return found >= 0 ? path.slice(found) : path; }
  function normalizeBedrockPath(path) { const marker = path.toLowerCase().indexOf("textures/"); return marker >= 0 ? path.slice(marker) : path; }
  function pathParts(path) { const dot = path.lastIndexOf("."); return { stem: path.slice(0, dot), ext: path.slice(dot), name: path.slice(path.lastIndexOf("/") + 1, dot) }; }
  function isPng(path) { return /\.png$/i.test(path); }
  function isMap(path) { return /(?:_n|_s|_normal|_mer|_heightmap|_mers)\.png$/i.test(path); }
  function isJavaTexture(path) { return isPng(path) && /(?:^|\/)assets\/[^/]+\/textures\/(?:block|blocks|item|items|entity)\//i.test(normalizeJavaPath(path)) && !isMap(path); }
  function isBedrockTexture(path) { return isPng(path) && /(?:^|\/)textures\/(?:block|blocks|item|items|entity)\//i.test(normalizeBedrockPath(path)) && !isMap(path); }
  function isBedrockBlock(path) { return /(?:^|\/)textures\/(?:block|blocks)\//i.test(normalizeBedrockPath(path)); }
  function materialFor(path) {
    const name = path.toLowerCase();
    if (/(iron|gold|copper|netherite|chain|anvil|rail|cauldron|lantern|bucket|bell|lightning_rod|raw_.*block)/.test(name)) return { rough: .34, metal: .9, f0: .82 };
    if (/(glass|ice|water|amethyst|crystal|slime)/.test(name)) return { rough: .18, metal: 0, f0: .08 };
    if (/(wood|log|plank|bark|stem|hyphae|leaves|leaf|vine|bamboo|wool|carpet|cloth)/.test(name)) return { rough: .72, metal: 0, f0: .06 };
    if (/(dirt|sand|gravel|clay|soil|grass|moss|mud|snow|powder)/.test(name)) return { rough: .92, metal: 0, f0: .045 };
    if (/(stone|deepslate|cobble|brick|ore|tuff|basalt|netherrack|end_stone|concrete|terracotta)/.test(name)) return { rough: .84, metal: 0, f0: .055 };
    return { rough: .7, metal: 0, f0: .06 };
  }
  function makeUUID() { return crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === "x" ? r : r & 3 | 8).toString(16); }); }
  function makeJavaMeta() { return JSON.stringify({ pack: { pack_format: 5, description: "PBR Forge — normal maps preservando color original" } }, null, 2); }
  function makeBedrockManifest(profile) { return JSON.stringify({ format_version: 2, header: { name: `PBR Forge · ${profile === "vibrant" ? "Vibrant Visuals" : "RTX"}`, description: "PBR normal generado localmente; color original preservado.", uuid: makeUUID(), version: [1, 0, 0], min_engine_version: [1, 21, 120] }, modules: [{ type: "resources", uuid: makeUUID(), version: [1, 0, 0] }], capabilities: [profile === "vibrant" ? "pbr" : "raytraced"] }, null, 2); }
  function makeTextureSet(base) { return JSON.stringify({ format_version: "1.16.100", "minecraft:texture_set": { color: base, normal: `${base}_normal`, metalness_emissive_roughness: `${base}_mer` } }, null, 2); }

  async function blobToImageData(blob) {
    const image = await createImageBitmap(blob);
    const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
    const context = canvas.getContext("2d", { willReadFrequently: true }); context.drawImage(image, 0, 0);
    image.close(); return { canvas, context, imageData: context.getImageData(0, 0, canvas.width, canvas.height) };
  }
  function pixelLuma(data, width, height, x, y) { const px = Math.max(0, Math.min(width - 1, x)); const py = Math.max(0, Math.min(height - 1, y)); const i = (py * width + px) * 4; return (data[i] * .2126 + data[i + 1] * .7152 + data[i + 2] * .0722) / 255; }
  async function normalMap(blob, strength) {
    const { canvas, context, imageData } = await blobToImageData(blob); const { data } = imageData; const output = context.createImageData(canvas.width, canvas.height); const out = output.data;
    for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
      const tl = pixelLuma(data, canvas.width, canvas.height, x - 1, y - 1), t = pixelLuma(data, canvas.width, canvas.height, x, y - 1), tr = pixelLuma(data, canvas.width, canvas.height, x + 1, y - 1);
      const l = pixelLuma(data, canvas.width, canvas.height, x - 1, y), r = pixelLuma(data, canvas.width, canvas.height, x + 1, y);
      const bl = pixelLuma(data, canvas.width, canvas.height, x - 1, y + 1), b = pixelLuma(data, canvas.width, canvas.height, x, y + 1), br = pixelLuma(data, canvas.width, canvas.height, x + 1, y + 1);
      const dx = ((tr + 2 * r + br) - (tl + 2 * l + bl)) * strength; const dy = ((bl + 2 * b + br) - (tl + 2 * t + tr)) * strength;
      const length = Math.hypot(-dx, -dy, 1); const index = (y * canvas.width + x) * 4; out[index] = Math.round(((-dx / length) * .5 + .5) * 255); out[index + 1] = Math.round(((-dy / length) * .5 + .5) * 255); out[index + 2] = Math.round(((1 / length) * .5 + .5) * 255); out[index + 3] = data[index + 3];
    }
    context.putImageData(output, 0, 0); return new Promise(resolve => canvas.toBlob(result => resolve(result), "image/png"));
  }
  async function propertyMap(blob, material, mode) {
    const { canvas, context, imageData } = await blobToImageData(blob); const output = context.createImageData(canvas.width, canvas.height); const source = imageData.data; const target = output.data;
    const baseRough = Math.round(material.rough * 255); const metal = Math.round(material.metal * 255); const f0 = Math.round(material.f0 * 255);
    for (let i = 0; i < source.length; i += 4) { const luma = (source[i] * .2126 + source[i + 1] * .7152 + source[i + 2] * .0722) / 255; const variation = Math.round((luma - .5) * 32); const rough = Math.max(18, Math.min(245, baseRough - variation));
      if (mode === "mer") { target[i] = metal; target[i + 1] = 0; target[i + 2] = rough; target[i + 3] = 255; } else { target[i] = 255 - rough; target[i + 1] = f0; target[i + 2] = 0; target[i + 3] = 255; }
    }
    context.putImageData(output, 0, 0); return new Promise(resolve => canvas.toBlob(result => resolve(result), "image/png"));
  }
  async function copyOrGenerate(zipIn, zipOut, sourceName, outputName, existingName, factory) {
    const existing = zipIn.file(existingName);
    if (existing) { zipOut.file(outputName, await existing.async("blob")); return "preserved"; }
    const source = zipIn.file(sourceName); zipOut.file(outputName, await factory(await source.async("blob"))); return "generated";
  }
  function findNormalizedEntry(zip, desiredPath, normalize) { return Object.keys(zip.files).find(path => normalize(path) === desiredPath); }

  async function convertJava(file, onProgress) {
    const input = await JSZip.loadAsync(file); const candidates = Object.keys(input.files).filter(path => !input.files[path].dir && isJavaTexture(path));
    if (!candidates.length) throw new Error("No encontré PNG de bloques, ítems o entidades en rutas Java dentro de este archivo.");
    if (candidates.length > MAX_TEXTURES) throw new Error(`El archivo contiene más de ${MAX_TEXTURES.toLocaleString("es-MX")} texturas elegibles.`);
    const output = new JSZip(); output.file("pack.mcmeta", makeJavaMeta());
    let preserved = 0;
    for (let index = 0; index < candidates.length; index++) {
      const rawPath = candidates[index]; const path = normalizeJavaPath(rawPath); const { stem, ext } = pathParts(path); const source = input.file(rawPath);
      output.file(path, await source.async("blob"));
      const animation = input.file(`${rawPath}.mcmeta`);
      if (animation) { const animationData = await animation.async("string"); output.file(`${path}.mcmeta`, animationData); output.file(`${stem}_n${ext}.mcmeta`, animationData); output.file(`${stem}_s${ext}.mcmeta`, animationData); }
      const rawStem = rawPath.slice(0, rawPath.lastIndexOf(".")); const rawN = `${rawStem}_n.png`; const rawS = `${rawStem}_s.png`;
      const normal = await copyOrGenerate(input, output, rawPath, `${stem}_n${ext}`, rawN, blob => normalMap(blob, state.strength));
      const spec = await copyOrGenerate(input, output, rawPath, `${stem}_s${ext}`, rawS, blob => propertyMap(blob, materialFor(path), "spec"));
      if (normal === "preserved") preserved++; if (spec === "preserved") preserved++;
      if (index % 4 === 0 || index + 1 === candidates.length) onProgress(index + 1, candidates.length, preserved);
    }
    return { blob: await output.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } }), textures: candidates.length, preserved };
  }
  async function convertBedrock(file, onProgress) {
    const input = await JSZip.loadAsync(file); let candidates = Object.keys(input.files).filter(path => !input.files[path].dir && isBedrockTexture(path));
    if (state.profile === "rtx") candidates = candidates.filter(isBedrockBlock);
    if (!candidates.length) throw new Error(state.profile === "rtx" ? "No encontré PNG de bloques Bedrock en este archivo para el perfil RTX." : "No encontré PNG de bloques, ítems o entidades en rutas Bedrock dentro de este archivo.");
    if (candidates.length > MAX_TEXTURES) throw new Error(`El archivo contiene más de ${MAX_TEXTURES.toLocaleString("es-MX")} texturas elegibles.`);
    const output = new JSZip(); output.file("manifest.json", makeBedrockManifest(state.profile));
    let preserved = 0;
    for (let index = 0; index < candidates.length; index++) {
      const rawPath = candidates[index]; const path = normalizeBedrockPath(rawPath); const { stem, ext, name } = pathParts(path); const source = input.file(rawPath);
      output.file(path, await source.async("blob"));
      const rawStem = rawPath.slice(0, rawPath.lastIndexOf(".")); const existingNormal = `${rawStem}_normal.png`; const existingMer = `${rawStem}_mer.png`;
      const normal = await copyOrGenerate(input, output, rawPath, `${stem}_normal${ext}`, existingNormal, blob => normalMap(blob, state.strength));
      const mer = await copyOrGenerate(input, output, rawPath, `${stem}_mer${ext}`, existingMer, blob => propertyMap(blob, materialFor(path), "mer"));
      output.file(`${stem}.texture_set.json`, makeTextureSet(name));
      if (normal === "preserved") preserved++; if (mer === "preserved") preserved++;
      if (index % 4 === 0 || index + 1 === candidates.length) onProgress(index + 1, candidates.length, preserved);
    }
    return { blob: await output.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } }), textures: candidates.length, preserved };
  }
  function download(blob, name) { const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = name; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(link.href), 3000); }
  async function convertAll() {
    if (!state.files.length || state.busy) return;
    if (!window.JSZip) { showToast("No se pudo cargar JSZip. Revisa tu conexión e inténtalo de nuevo.", true); return; }
    state.busy = true; renderQueue(); let totalTextures = 0; let totalPreserved = 0; const sourceFiles = [...state.files];
    try {
      for (let index = 0; index < sourceFiles.length; index++) {
        const file = sourceFiles[index];
        const result = state.edition === "java" ? await convertJava(file, (done, total, preserved) => { elements.processingSummary.textContent = `${index + 1}/${sourceFiles.length} · ${done}/${total} texturas · ${preserved} mapas preservados`; }) : await convertBedrock(file, (done, total, preserved) => { elements.processingSummary.textContent = `${index + 1}/${sourceFiles.length} · ${done}/${total} texturas · ${preserved} mapas preservados`; });
        totalTextures += result.textures; totalPreserved += result.preserved; download(result.blob, zipName(file));
      }
      showToast(`Listo: ${totalTextures} texturas procesadas; ${totalPreserved} mapas PBR existentes se conservaron.`);
    } catch (error) { console.error(error); showToast(error.message || "No se pudo procesar el archivo. Verifica que sea un ZIP/JAR/MCPACK válido.", true); }
    finally { state.busy = false; elements.processingSummary.textContent = `${state.files.length} archivo${state.files.length === 1 ? "" : "s"} en cola`; renderQueue(); }
  }

  elements.editionButtons.forEach(button => button.addEventListener("click", () => { if (state.busy) return; state.edition = button.dataset.edition; state.files = []; elements.editionButtons.forEach(item => { const active = item === button; item.classList.toggle("is-selected", active); item.setAttribute("aria-checked", String(active)); }); syncInterface(); }));
  elements.profileButtons.forEach(button => button.addEventListener("click", () => { if (state.busy) return; state.profile = button.dataset.profile; elements.profileButtons.forEach(item => { const active = item === button; item.classList.toggle("is-selected", active); item.setAttribute("aria-checked", String(active)); }); syncInterface(); }));
  elements.assetSourceButtons.forEach(button => button.addEventListener("click", () => { if (state.busy) return; state.bedrockSource = button.dataset.bedrockSource; state.files = []; syncInterface(); }));
  elements.officialRelease.addEventListener("change", () => { state.selectedRelease = elements.officialRelease.value; renderOfficialAssets(); });
  elements.officialQueue.addEventListener("click", useOfficialAsset);
  elements.strength.addEventListener("input", () => { state.strength = Number(elements.strength.value); elements.strengthOutput.value = state.strength.toFixed(1); });
  elements.dropzone.addEventListener("click", () => elements.fileInput.click()); elements.fileInput.addEventListener("change", event => { addFiles([...event.target.files]); event.target.value = ""; });
  ["dragenter", "dragover"].forEach(type => elements.dropzone.addEventListener(type, event => { event.preventDefault(); elements.dropzone.classList.add("is-dragover"); }));
  ["dragleave", "drop"].forEach(type => elements.dropzone.addEventListener(type, event => { event.preventDefault(); elements.dropzone.classList.remove("is-dragover"); }));
  elements.dropzone.addEventListener("drop", event => addFiles([...event.dataTransfer.files])); elements.convertButton.addEventListener("click", convertAll);
  syncInterface();
  void loadOfficialAssets();
})();
