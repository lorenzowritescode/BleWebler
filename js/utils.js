// Build filters from namePrefix
const bluetoothFilters = supportedPrinters.map(p => ({
  namePrefix: p.namePrefix
}));

// Collect all optional services from all supported printers
const optionalServices = [
  ...new Set(
    supportedPrinters
      .flatMap(p => p.optionalServices || [])
  )
];

let device = null;
let printerInstance = null;

async function connectPrinter() {
  if (device && device.gatt.connected && printerInstance) {
    return printerInstance;
  }

  try {
    device = await navigator.bluetooth.requestDevice({
      filters: bluetoothFilters,
      optionalServices: optionalServices
    });

    const printer = supportedPrinters.find(p => p.pattern.test(device.name));

    if (printer) {
      log(`Detected printer: ${device.name} -> matched ${printer.name}`);
      printerInstance = new printer.printerClass();
      await printerInstance.connect(device);
      return printerInstance;
    } else {
      log(`Unsupported printer model: ${device.name}`);
      return null;
    }
  } catch (err) {
    log("Bluetooth error: " + err);
    throw err;
  }
}

async function printLabel() {
  try {
    await connectPrinter();

    if (printerInstance) {
      const printer = supportedPrinters.find(p => p.pattern.test(device.name));
      const infinitePaperCheckbox = document.getElementById("infinitePaperCheckbox");
      const isSegmented = infinitePaperCheckbox ? !infinitePaperCheckbox.checked : true; // Default to segmented if checkbox missing
      const isInfinitePaper = infinitePaperCheckbox ? infinitePaperCheckbox.checked : false;

      // Get copy count and spacing
      const copyCountInput = document.getElementById("copyCount");
      const copyCount = copyCountInput ? parseInt(copyCountInput.value) || 1 : 1;


      // Loop to print each copy individually
      for (let i = 0; i < copyCount; i++) {
        log(`Printing copy ${i + 1} of ${copyCount}...`);

        // Construct bitmap for a SINGLE copy
        // We pass 1 as copyCount to constructBitmap so it generates just one label
        // We preserve isInfinitePaper and spacingMm logic, though spacingMm mostly applies to the "gap" in the canvas method. 
        // For separate print jobs, the printer's feed commands (in the class) handle the separation.
        let bitmap = constructBitmap(printer.px, 1, isInfinitePaper);
        if (bitmap) {
          const tune = readPrintTuningFromDom();
          bitmap = applyPrintNudgeMm(bitmap, printer.dpm || 8, tune.nudgeXMm, tune.nudgeYMm);
          bitmap = padBitmapHeightToMultipleOf8(bitmap);
          await printerInstance.print(device, bitmap, isSegmented, {
            feedAfterPrintMm: tune.feedAfterPrintMm,
            dpm: printer.dpm || 8
          });
        }

        // Add a small delay between copies to ensure printer processes the buffer
        if (i < copyCount - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      log("All copies printed successfully.");
    }

  } catch (err) {
    console.error("Print failed:", err);
    log("Print failed: " + err);
  }
}

async function disconnectPrinter() {
  if (printerInstance) {
    await printerInstance.disconnect();
    printerInstance = null;
    device = null;
  } else {
    log("No printer instance found to disconnect.");
  }
}

function splitIntoChunks(data, chunkSize = 96) {
  const chunks = [];
  for (let i = 0; i < data.length; i += chunkSize) {
    chunks.push(data.slice(i, i + chunkSize));
  }
  return chunks;
}

function log(message) {
  const output = document.getElementById("logOutput");
  const now = new Date();
  const timestamp = now.toLocaleTimeString('en-EN', { hour12: false });
  output.textContent += `[${timestamp}] ${message}\n`;
  output.scrollTop = output.scrollHeight;
  console.log(message)
}



function rasterizeCanvas(canvasHeight, isInfinitePaper, ignoreSelection = false) {
  const fabricCanvas = getFabricCanvas();
  if (!fabricCanvas) {
    log("Fabric.js canvas not initialized.");
    return null;
  }

  // Save current selection and deselect only if not ignoring selection
  const activeObject = fabricCanvas.getActiveObject();

  if (!ignoreSelection) {
    fabricCanvas.discardActiveObject();
    fabricCanvas.requestRenderAll();
    fabricCanvas.renderAll(); // Ensure render happens synchronously
  }

  // Padding margin guides are UI-only; hide so print matches artwork (not the red overlay).
  const hiddenForPrint = [];
  fabricCanvas.getObjects().forEach((obj) => {
    if (obj.paddingGuide) {
      hiddenForPrint.push(obj);
      obj.visible = false;
    }
  });
  if (hiddenForPrint.length) {
    fabricCanvas.requestRenderAll();
    fabricCanvas.renderAll();
  }

  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true });

  const canvasWidth = fabricCanvas.width; // Use Fabric canvas width
  tempCanvas.width = canvasWidth;
  tempCanvas.height = canvasHeight;

  tempCtx.imageSmoothingEnabled = false;

  // Render the fabric canvas content onto the temporary canvas
  fabricCanvas.backgroundColor = '#ffffff'; // Ensure white background

  const lowerEl = fabricCanvas.getElement && fabricCanvas.getElement();
  if (lowerEl && lowerEl.getContext) {
    const fctx = lowerEl.getContext("2d");
    if (fctx) {
      fctx.imageSmoothingEnabled = false;
      if (typeof fctx.imageSmoothingQuality !== "undefined") {
        fctx.imageSmoothingQuality = "low";
      }
    }
  }

  // Force a render of the lower canvas to ensure it's up to date
  fabricCanvas.renderAll();
  tempCtx.fillStyle = "#ffffff";
  tempCtx.fillRect(0, 0, canvasWidth, canvasHeight);
  tempCtx.drawImage(fabricCanvas.getElement(), 0, 0, canvasWidth, canvasHeight);

  hiddenForPrint.forEach((obj) => {
    obj.visible = true;
  });
  if (hiddenForPrint.length) {
    fabricCanvas.requestRenderAll();
  }

  // Restore selection if we modified it
  if (!ignoreSelection && activeObject) {
    fabricCanvas.setActiveObject(activeObject);
    fabricCanvas.requestRenderAll();
  }

  const imgData = tempCtx.getImageData(0, 0, canvasWidth, canvasHeight);
  return imgData;
}

function constructBitmap(canvasHeight, copyCount, isInfinitePaper, ignoreSelection = false) {
  const imgDataObj = rasterizeCanvas(canvasHeight, isInfinitePaper, ignoreSelection);
  if (!imgDataObj) return null;

  const imgData = imgDataObj.data;
  const canvasWidth = imgDataObj.width;
  const height = imgDataObj.height;

  // BT.601 luma; ink where luma < inkLumaMax. **Lower** inkLumaMax = fewer pixels = thinner strokes.
  // (Using `luma < 222` wrongly marks almost all non-white pixels as ink — that made text thicker.)
  const inkLumaMax = 108;
  const bitmap = [];
  for (let y = 0; y < height; y++) {
    let row = "";
    for (let x = 0; x < canvasWidth; x++) {
      const i = (y * canvasWidth + x) * 4;
      const r = imgData[i];
      const g = imgData[i + 1];
      const b = imgData[i + 2];
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      row += luma < inkLumaMax ? "1" : "0";
    }
    bitmap.push(row);
  }
  return bitmap;
}

/**
 * Read print tuning from the Printer output section (mm → dots via caller dpm).
 */
function readPrintTuningFromDom() {
  const el = (id) => document.getElementById(id);
  const num = (id, fallback) => {
    const v = el(id);
    if (!v) return fallback;
    const n = parseFloat(v.value);
    return Number.isFinite(n) ? n : fallback;
  };
  return {
    nudgeXMm: num("printNudgeXMm", 0),
    nudgeYMm: num("printNudgeYMm", 0),
    feedAfterPrintMm: num("feedAfterPrintMm", 14)
  };
}

/**
 * Nudge the final raster relative to the printer’s origin (hardware often has dead margin).
 * Positive X → pad left (image shifts right on the sticker). Negative X → trim from the left.
 * Positive Y → pad rows at top (image shifts down). Negative Y → trim from the top.
 */
function applyPrintNudgeMm(bitmap, dpm, nudgeXMm, nudgeYMm) {
  if (!bitmap || !bitmap.length) return bitmap;
  const d = Math.max(1, dpm || 8);
  let dx = Math.round((Number.isFinite(nudgeXMm) ? nudgeXMm : 0) * d);
  let dy = Math.round((Number.isFinite(nudgeYMm) ? nudgeYMm : 0) * d);
  let b = bitmap.map((r) => r);
  const w0 = b[0].length;

  if (dx > 0) {
    const pad = "0".repeat(dx);
    b = b.map((row) => pad + row);
  } else if (dx < 0) {
    const t = Math.min(w0, -dx);
    if (t > 0) b = b.map((row) => row.slice(t));
  }

  if (!b.length || !b[0].length) return bitmap;

  if (dy > 0) {
    const line = "0".repeat(b[0].length);
    const padRows = Array(dy).fill(line);
    b = padRows.concat(b);
  } else if (dy < 0) {
    const t = Math.min(b.length, -dy);
    if (t > 0) b = b.slice(t);
  }

  return b.length && b[0].length ? b : bitmap;
}

/**
 * Ruler grid matching the current canvas pixel size (WYSIWYG check vs physical label).
 * Ticks every 1 mm (dpm dots); longer ticks every 12 mm. Full border + center cross.
 * Bitmap height is padded to a multiple of 8 for the Marklife packet encoder.
 */
function buildCalibrationBitmap(width, height, dpm) {
  const d = Math.max(1, dpm | 0);
  const major = 12 * d;
  const w = Math.max(1, width | 0);
  const h = Math.max(1, height | 0);
  const g = Array.from({ length: h }, () => Array(w).fill("0"));
  const set = (x, y) => {
    if (x >= 0 && x < w && y >= 0 && y < h) g[y][x] = "1";
  };
  const hline = (y, x0, x1) => {
    for (let x = Math.max(0, x0); x <= Math.min(w - 1, x1); x++) set(x, y);
  };
  const vline = (x, y0, y1) => {
    for (let y = Math.max(0, y0); y <= Math.min(h - 1, y1); y++) set(x, y);
  };
  hline(0, 0, w - 1);
  hline(h - 1, 0, w - 1);
  vline(0, 0, h - 1);
  vline(w - 1, 0, h - 1);
  for (let x = 0; x < w; x += d) {
    const isMajor = x % major === 0;
    const tl = isMajor ? Math.min(14, h - 2) : Math.min(6, h - 2);
    for (let dy = 1; dy <= tl; dy++) set(x, dy);
  }
  for (let y = 0; y < h; y += d) {
    const isMajor = y % major === 0;
    const tl = isMajor ? Math.min(14, w - 2) : Math.min(6, w - 2);
    for (let dx = 1; dx <= tl; dx++) set(dx, y);
  }
  const cx = Math.floor(w / 2);
  const cy = Math.floor(h / 2);
  const clen = Math.min(9, Math.floor(Math.min(w, h) / 4));
  for (let k = -clen; k <= clen; k++) {
    set(cx + k, cy);
    set(cx, cy + k);
  }
  return g.map((row) => row.join(""));
}

function padBitmapHeightToMultipleOf8(bitmap) {
  if (!bitmap || !bitmap.length) return bitmap;
  const h = bitmap.length;
  const pad = (8 - (h % 8)) % 8;
  if (pad === 0) return bitmap;
  const line = "0".repeat(bitmap[0].length);
  const out = bitmap.slice();
  for (let i = 0; i < pad; i++) out.push(line);
  return out;
}

async function printCalibrationLabel() {
  try {
    await connectPrinter();
    if (!printerInstance || !device) return;

    const printer = supportedPrinters.find((p) => p.pattern.test(device.name));
    if (!printer) {
      log("Calibration: unknown printer.");
      return;
    }

    const fabricCanvas = getFabricCanvas();
    if (!fabricCanvas) {
      log("Calibration: canvas not ready.");
      return;
    }

    const w = fabricCanvas.width | 0;
    const h = fabricCanvas.height | 0;
    if (w < 1 || h < 1) {
      log("Calibration: invalid canvas size.");
      return;
    }

    const dpm = printer.dpm || 8;
    const infinitePaperCheckbox = document.getElementById("infinitePaperCheckbox");
    const isSegmented = infinitePaperCheckbox ? !infinitePaperCheckbox.checked : true;

    let bitmap = buildCalibrationBitmap(w, h, dpm);
    const tune = readPrintTuningFromDom();
    bitmap = applyPrintNudgeMm(bitmap, dpm, tune.nudgeXMm, tune.nudgeYMm);
    bitmap = padBitmapHeightToMultipleOf8(bitmap);
    log(
      `Calibration print: ${bitmap[0].length}×${bitmap.length} dots after nudge; ${dpm} dots/mm ticks. Feed ${tune.feedAfterPrintMm} mm.`
    );

    await printerInstance.print(device, bitmap, isSegmented, {
      feedAfterPrintMm: tune.feedAfterPrintMm,
      dpm
    });
    log("Calibration print finished.");
  } catch (err) {
    console.error("Calibration print failed:", err);
    log("Calibration print failed: " + err);
  }
}

window.printCalibrationLabel = printCalibrationLabel;
