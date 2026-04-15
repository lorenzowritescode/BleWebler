function toggleAdvanced() {
  const section = document.getElementById("advancedSection");
  const toggleButton = document.querySelector("button[onclick='toggleAdvanced()']");

  const visible = section.style.display !== "none";
  section.style.display = visible ? "none" : "block";
  toggleButton.textContent = visible ? "Show Advanced" : "Hide Advanced";
}


function setVerticalAlign(alignment) {
  if (window.fabricEditor) {
    window.fabricEditor.setVerticalAlign(alignment);
  }
}

// Function to update the font family in fabric editor
function updateFontFamily(fontFamily) {
  if (window.fabricEditor) {
    window.fabricEditor.setFontFamily(fontFamily);
  }
}

// Function to update the font size in fabric editor
function updateFontSize(fontSize) {
  if (window.fabricEditor) {
    window.fabricEditor.setFontSize(fontSize);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll(".label-type-btn");
  const fontFamilyInput = document.getElementById("fontFamilyInput");
  const bitmapFontGallery = document.getElementById("bitmapFontGallery");
  const fontList = document.getElementById("fontList");
  const loadSystemFontsBtn = document.getElementById("loadSystemFontsBtn");
  const fontSizeInput = document.getElementById("fontSize");
  const fontSizeDownBtn = document.getElementById("fontSizeDownBtn");
  const fontSizeUpBtn = document.getElementById("fontSizeUpBtn");
  const fontSizeAutoBtn = document.getElementById("fontSizeAutoBtn");
  const noBluetoothModal = document.getElementById("noBluetoothModal");
  const textOptions = document.getElementById("textOptions");
  let shouldRestoreITextFocus = false;

  // Check for Web Bluetooth support
  if (!navigator.bluetooth) {
    if (noBluetoothModal) {
      noBluetoothModal.classList.add("show");
    }
  }

  const dismissBluetoothModalBtn = document.getElementById("dismissBluetoothModalBtn");
  if (dismissBluetoothModalBtn && noBluetoothModal) {
    dismissBluetoothModalBtn.addEventListener("click", () => {
      noBluetoothModal.classList.remove("show");
    });
  }

  // Bundled pixel/bitmap fonts (see js/bitmap_fonts.js + css @font-face) first, then web-safe fonts
  const bitmapFonts = Array.isArray(window.BITMAP_FONT_FAMILIES) ? window.BITMAP_FONT_FAMILIES : [];
  const basicFonts = ["Arial", "Verdana", "Times New Roman", "Courier New", "Georgia", "Impact", "Tahoma", "Trebuchet MS"];
  const defaultFontList = () => [...bitmapFonts, ...basicFonts];

  // Event listeners for toggle buttons
  document.querySelectorAll('.toggle-btn').forEach(button => {
    button.addEventListener('click', () => {
      const property = button.dataset.property;
      if (window.fabricEditor) {
        const isActive = window.fabricEditor.toggleStyle(property);
        button.classList.toggle('active', isActive);
      }
    });
  });

  function getActiveITextObject() {
    if (!window.fabricEditor || typeof window.fabricEditor.getActiveObject !== "function") return null;
    const activeObject = window.fabricEditor.getActiveObject();
    if (!activeObject || activeObject.type !== "i-text") return null;
    return activeObject;
  }

  function restoreActiveITextFocus() {
    if (!shouldRestoreITextFocus) return;
    shouldRestoreITextFocus = false;
    const activeIText = getActiveITextObject();
    if (!activeIText) return;

    if (!activeIText.isEditing && typeof activeIText.enterEditing === "function") {
      activeIText.enterEditing();
      if (typeof activeIText.text === "string") {
        const end = activeIText.text.length;
        activeIText.selectionStart = end;
        activeIText.selectionEnd = end;
      }
    }

    if (activeIText.hiddenTextarea) {
      activeIText.hiddenTextarea.focus();
    }
  }

  if (textOptions) {
    textOptions.addEventListener("mousedown", (event) => {
      const actionableControl = event.target.closest(".btn, .font-gallery-chip");
      if (!actionableControl) return;

      const activeIText = getActiveITextObject();
      if (activeIText && activeIText.isEditing) {
        shouldRestoreITextFocus = true;
        // Prevent the clicked button from taking keyboard focus.
        event.preventDefault();
      }
    });

    textOptions.addEventListener("click", () => {
      requestAnimationFrame(restoreActiveITextFocus);
    });
  }

  function populateFontDropdown(fonts) {
    fontList.innerHTML = ""; // Clear existing options
    fonts.forEach(font => {
      const option = document.createElement("option");
      option.value = font;
      fontList.appendChild(option);
    });
    // Set initial value
    if (window.fabricEditor && window.fabricEditor.getActiveObject()) {
      fontFamilyInput.value = window.fabricEditor.getActiveObject().fontFamily;
    } else {
      fontFamilyInput.value = "DePixel Breit"; // Default
    }
  }

  function buildFontGallery() {
    if (!bitmapFontGallery) return;
    bitmapFontGallery.innerHTML = "";
    bitmapFonts.forEach((name) => {
      const chip = document.createElement("div");
      chip.className = "font-gallery-chip";
      chip.dataset.font = name;

      const preview = document.createElement("span");
      preview.className = "font-gallery-preview";
      preview.style.fontFamily = '"' + name + '", monospace';
      preview.textContent = "Abc";

      const label = document.createElement("span");
      label.className = "font-gallery-name";
      label.textContent = name;

      chip.appendChild(preview);
      chip.appendChild(label);
      chip.addEventListener("click", () => {
        fontFamilyInput.value = name;
        updateFontFamily(name);
        syncFontGallerySelection();
      });
      bitmapFontGallery.appendChild(chip);
    });
    syncFontGallerySelection();
  }

  function syncFontGallerySelection() {
    if (!bitmapFontGallery) return;
    const v = (fontFamilyInput.value || "").trim();
    bitmapFontGallery.querySelectorAll(".font-gallery-chip").forEach((chip) => {
      chip.classList.toggle("active", chip.dataset.font === v);
    });
  }

  window.syncBitmapFontQuickPick = syncFontGallerySelection;

  populateFontDropdown(defaultFontList());
  if (typeof window.preloadBitmapFonts === "function") {
    window.preloadBitmapFonts().then(() => buildFontGallery()).catch(() => buildFontGallery());
  } else {
    buildFontGallery();
  }

  fontFamilyInput.addEventListener("input", (event) => {
    updateFontFamily(event.target.value);
    syncFontGallerySelection();
  });

  // Event listener for font size change
  if (fontSizeInput) {
    fontSizeInput.addEventListener("change", (event) => {
      updateFontSize(parseInt(event.target.value, 10));
    });
  }

  if (fontSizeDownBtn) {
    fontSizeDownBtn.addEventListener("click", () => {
      if (window.fabricEditor && typeof window.fabricEditor.bumpFontSize === "function") {
        window.fabricEditor.bumpFontSize(-2);
      }
    });
  }

  if (fontSizeUpBtn) {
    fontSizeUpBtn.addEventListener("click", () => {
      if (window.fabricEditor && typeof window.fabricEditor.bumpFontSize === "function") {
        window.fabricEditor.bumpFontSize(2);
      }
    });
  }

  if (fontSizeAutoBtn) {
    fontSizeAutoBtn.addEventListener("click", () => {
      if (!window.fabricEditor || typeof window.fabricEditor.toggleAutoFontSize !== "function") return;
      window.fabricEditor.toggleAutoFontSize();
    });
  }

  // Event listener for loading system fonts
  if (loadSystemFontsBtn) {
    // Hide button if API not supported
    if (!('queryLocalFonts' in window)) {
      loadSystemFontsBtn.style.display = 'none';
    }

    loadSystemFontsBtn.addEventListener("click", async () => {
      if ('queryLocalFonts' in window) {
        try {
          const systemFonts = await window.queryLocalFonts();
          const fontNames = systemFonts.map(font => font.family).filter((value, index, self) => self.indexOf(value) === index); // Get unique font names
          populateFontDropdown([...defaultFontList(), ...fontNames].filter((value, index, self) => self.indexOf(value) === index).sort()); // Merge, make unique, sort, and repopulate
          loadSystemFontsBtn.style.display = 'none'; // Hide button after successful load
        } catch (err) {
          console.error("Error querying local fonts:", err);
          alert("Failed to load system fonts. Please check console for details.");
        }
      } else {
        alert("Your browser does not support the Local Font Access API.");
        loadSystemFontsBtn.style.display = 'none';
      }
    });
  }

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const type = btn.dataset.type;

      // Set active class
      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      // Hide all option divs
      const textDiv = document.getElementById("textOptions");
      const infoDiv = document.getElementById("infoOptions");

      if (!textDiv || !infoDiv) {
        console.error("Option divs not found!");
        return;
      }

      textDiv.style.display = "none";
      infoDiv.style.display = "none";

      // Show selected option
      if (type === "text") textDiv.style.display = "block";
      else if (type === "info") {
        infoDiv.style.display = "block";
        handleInfoTab();
      }
    });
  });

  async function handleInfoTab() {
    const infoDisplay = document.getElementById("printerInfoDisplay");
    infoDisplay.textContent = "Connecting to printer...";

    try {
      // Ensure connectPrinter is available globally or imported
      if (typeof connectPrinter === 'function') {
        const printer = await connectPrinter();
        if (printer) {
          infoDisplay.textContent = "Retrieving information...";
          const info = await printer.getPrinterInfo();
          infoDisplay.innerHTML = info;
        } else {
          infoDisplay.textContent = "Could not connect to printer.";
        }
      } else {
        infoDisplay.textContent = "Error: connectPrinter function not found.";
      }
    } catch (err) {
      infoDisplay.textContent = "Error: " + err.message;
    }
  }

  const refreshInfoBtn = document.getElementById("refreshInfoBtn");
  if (refreshInfoBtn) {
    refreshInfoBtn.addEventListener("click", handleInfoTab);
  }

  // Set initial state
  const activeBtn = document.querySelector(".label-type-btn.active");
  if (activeBtn) activeBtn.click(); // Triggers display of text options

  // Add event listener for the print button
  const printButton = document.getElementById("printButton");
  if (printButton) {
    printButton.addEventListener("click", printLabel);
  }

  const calibrationPrintButton = document.getElementById("calibrationPrintButton");
  if (calibrationPrintButton) {
    calibrationPrintButton.addEventListener("click", () => {
      if (typeof printCalibrationLabel === "function") {
        printCalibrationLabel();
      }
    });
  }

  // Live Preview Logic (Standard Behavior)
  let previewCanvasElement = null;

  function initLivePreview() {
    // 1. Initial Render
    updatePreview();

    // 2. Add Listeners for Live Update
    const fabricCanvas = window.getFabricCanvas();
    if (fabricCanvas) {
      fabricCanvas.on('object:modified', updatePreview);
      fabricCanvas.on('object:added', updatePreview);
      fabricCanvas.on('object:removed', updatePreview);
      fabricCanvas.on('selection:updated', updatePreview);
      fabricCanvas.on('selection:created', updatePreview);
      fabricCanvas.on('selection:cleared', updatePreview);
      fabricCanvas.on('canvas:resized', updatePreview);

      // Debounce text changes
      let timeout;
      fabricCanvas.on('text:changed', () => {
        clearTimeout(timeout);
        timeout = setTimeout(updatePreview, 100);
      });
    }
  }

  // Initialize preview when scripts are ready
  // A simple timeout or event hook might be needed if fabric canvas isn't ready immediately.
  // Assuming fabric_editor.js runs before or initLivePreview can safely bind active listeners.
  // Since we use window.getFabricCanvas(), we can try running it.
  // Better yet, wait a moment or check if fabricCanvas is available.
  if (window.getFabricCanvas()) {
    initLivePreview();
  } else {
    // Wait for DOMContentLoaded or similar if needed, or just try to hook
    window.addEventListener('load', initLivePreview);
  }

  function updatePreview() {
    const fabricCanvas = window.getFabricCanvas();
    if (!fabricCanvas) return;

    // Auto-hide preview if an object is selected
    if (fabricCanvas.getActiveObject()) {
      if (previewCanvasElement) {
        previewCanvasElement.style.display = 'none';
      }
      return;
    }

    // 1. Generate Bitmap
    const printerSelect = document.getElementById("printerSelect");
    const supportedPrinters = window.supportedPrinters;

    // Handle case where vars might not be ready yet
    if (!printerSelect || !supportedPrinters) return;

    // Safety check for printer selection
    const printerIndex = printerSelect.value;
    if (!supportedPrinters[printerIndex]) return;

    const printerPx = supportedPrinters[printerIndex].px;

    let heightToUse = printerPx;
    if (window.fabricEditor) {
      heightToUse = printerPx;
    }

    const infinitePaperCheckbox = document.getElementById("infinitePaperCheckbox");
    const isInfinitePaper = infinitePaperCheckbox ? infinitePaperCheckbox.checked : false;

    // Use constructBitmap ensuring 1 copy
    const bitmap = constructBitmap(heightToUse, 1, isInfinitePaper, true);

    if (!bitmap || bitmap.length === 0) return;

    const bitmapHeight = bitmap.length;
    const bitmapWidth = bitmap[0].length;

    // 2. Create/Update Preview Canvas
    if (!previewCanvasElement) {
      previewCanvasElement = document.createElement("canvas");
      // Style for overlay
      previewCanvasElement.style.position = "absolute";
      previewCanvasElement.style.top = "0";
      previewCanvasElement.style.left = "0";

      // Crucial: Pointer events NONE allows clicks to pass through to the upper-canvas (selection handles)
      previewCanvasElement.style.pointerEvents = "none";

      previewCanvasElement.style.backgroundColor = "white";
      previewCanvasElement.style.imageRendering = "pixelated";
      previewCanvasElement.className = "preview-canvas";

      // We need to insert this BEFORE the upper-canvas but AFTER the lower-canvas
      const fabricCanvas = window.getFabricCanvas();
      if (fabricCanvas) {
        const upperCanvas = fabricCanvas.upperCanvasEl;
        const container = upperCanvas.parentNode;
        // Insert before upper canvas
        container.insertBefore(previewCanvasElement, upperCanvas);
      }
    }

    // 3. Draw Binary Data to Preview Canvas
    previewCanvasElement.width = bitmapWidth;
    previewCanvasElement.height = bitmapHeight;
    const ctx = previewCanvasElement.getContext("2d");

    const previewData = ctx.createImageData(bitmapWidth, bitmapHeight);
    const pData = previewData.data;

    for (let y = 0; y < bitmapHeight; y++) {
      const rowString = bitmap[y];
      for (let x = 0; x < bitmapWidth; x++) {
        const char = rowString[x];
        const pixelColor = (char === '1') ? 0 : 255;

        const index = (y * bitmapWidth + x) * 4;
        pData[index] = pixelColor;     // R
        pData[index + 1] = pixelColor; // G
        pData[index + 2] = pixelColor; // B
        pData[index + 3] = 255;        // Alpha
      }
    }

    ctx.putImageData(previewData, 0, 0);
    previewCanvasElement.style.display = "block";
  }

  // --- Printer Selection Modal Logic ---
  const startupModal = document.getElementById("startupModal");
  const printerSelect = document.getElementById("printerSelect");
  const startBtn = document.getElementById("startBtn");
  const paperWidthInput = document.getElementById("paperWidth");
  const paperWidthContainer = document.getElementById("paperWidthContainer");
  const paperHeightInput = document.getElementById("paperHeight");
  const settingsBtn = document.getElementById("settingsBtn");
  const infinitePaperCheckbox = document.getElementById("infinitePaperCheckbox");

  const resizeHandle = document.getElementById("resizeHandle");
  const canvasWrapper = document.getElementById("canvasWrapper");
  const homeTitle = document.getElementById("homeTitle");

  // Resize Handle Logic
  let isDragging = false;
  let startX;
  let startWidth;
  let currentPrinterDpm = 8; // Default dpm, will be updated when printer is selected
  const dimensionControls = document.getElementById("dimensionControls");
  const widthInput = document.getElementById("widthInput");
  const heightInput = document.getElementById("heightInput");

  // Function to get current printer dpm
  const getCurrentPrinterDpm = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlPrinter = urlParams.get('printer');
    if (urlPrinter !== null && typeof supportedPrinters !== 'undefined') {
      const pIndex = parseInt(urlPrinter);
      if (!isNaN(pIndex) && supportedPrinters[pIndex]) {
        return supportedPrinters[pIndex].dpm;
      }
    }
    return currentPrinterDpm; // Fallback to stored value
  };

  // Function to update dimension inputs from canvas
  const updateDimensionInputs = () => {
    const canvas = window.getFabricCanvas();
    if (canvas && widthInput && heightInput) {
      currentPrinterDpm = getCurrentPrinterDpm();
      const widthMm = canvas.getWidth() / currentPrinterDpm;
      const heightMm = canvas.getHeight() / currentPrinterDpm;
      widthInput.value = widthMm.toFixed(1);
      heightInput.value = heightMm.toFixed(1);
    }
  };

  // Function to update canvas from dimension inputs
  const updateCanvasFromInputs = () => {
    const canvas = window.getFabricCanvas();
    if (canvas && widthInput && heightInput) {
      currentPrinterDpm = getCurrentPrinterDpm();
      const widthMm = parseFloat(widthInput.value);
      const heightMm = parseFloat(heightInput.value);

      if (!isNaN(widthMm) && widthMm > 0 && !isNaN(heightMm) && heightMm > 0) {
        const widthPx = Math.round(widthMm * currentPrinterDpm);
        const heightPx = Math.round(heightMm * currentPrinterDpm);
        if (window.fabricEditor) {
          window.fabricEditor.updateCanvasSize(widthPx, heightPx);
        }
      }
    }
  };

  if (resizeHandle) {
    const startDrag = (clientX) => {
      isDragging = true;
      startX = clientX;
      resizeHandle.classList.add('active');
      // Update dpm from current printer
      currentPrinterDpm = getCurrentPrinterDpm();
      if (window.fabricEditor && window.fabricEditor.getActiveObject) {
        // Get current canvas width
        const canvas = window.getFabricCanvas();
        if (canvas) {
          startWidth = canvas.getWidth();
        }
      }
    };

    const onDrag = (clientX) => {
      if (!isDragging) return;
      const dx = clientX - startX;
      const newWidth = startWidth + dx;

      if (newWidth > 50) { // Minimum width
        if (window.fabricEditor) {
          // We only want to update width, keep height same.
          const canvas = window.getFabricCanvas();
          if (canvas) {
            window.fabricEditor.updateCanvasSize(newWidth, canvas.getHeight());
            // Update width input
            updateDimensionInputs();
          }
        }
      }
    };

    const endDrag = () => {
      isDragging = false;
      resizeHandle.classList.remove('active');
    };

    // Mouse events
    resizeHandle.addEventListener('mousedown', (e) => {
      startDrag(e.clientX);
      e.preventDefault(); // Prevent text selection
    });

    window.addEventListener('mousemove', (e) => {
      if (isDragging) {
        onDrag(e.clientX);
      }
    });

    window.addEventListener('mouseup', endDrag);

    // Touch events
    resizeHandle.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        startDrag(e.touches[0].clientX);
        e.preventDefault(); // Prevent scrolling
      }
    });

    window.addEventListener('touchmove', (e) => {
      if (isDragging && e.touches.length > 0) {
        onDrag(e.touches[0].clientX);
      }
    });

    window.addEventListener('touchend', endDrag);
  }

  // Flag to prevent update loops
  let isUpdatingFromInputs = false;

  // Dimension input handlers
  if (widthInput) {
    widthInput.addEventListener('change', () => {
      isUpdatingFromInputs = true;
      updateCanvasFromInputs();
      isUpdatingFromInputs = false;
    });
    widthInput.addEventListener('blur', () => {
      isUpdatingFromInputs = true;
      updateCanvasFromInputs();
      isUpdatingFromInputs = false;
    });
  }

  if (heightInput) {
    heightInput.addEventListener('change', () => {
      isUpdatingFromInputs = true;
      updateCanvasFromInputs();
      isUpdatingFromInputs = false;
    });
    heightInput.addEventListener('blur', () => {
      isUpdatingFromInputs = true;
      updateCanvasFromInputs();
      isUpdatingFromInputs = false;
    });
  }

  // Update dimension inputs when canvas size changes (but not when updating from inputs)
  if (window.fabricEditor) {
    const originalUpdateCanvasSize = window.fabricEditor.updateCanvasSize;
    if (originalUpdateCanvasSize) {
      window.fabricEditor.updateCanvasSize = function (width, height) {
        originalUpdateCanvasSize.call(this, width, height);
        if (!isUpdatingFromInputs) {
          updateDimensionInputs();
        }
      };
    }
  }

  if (startupModal && printerSelect && startBtn) {
    const presetSelect = document.getElementById('presetSelect');
    const presetContainer = document.getElementById('presetContainer');

    // 1. Populate Printer List
    if (typeof supportedPrinters !== 'undefined') {
      supportedPrinters.forEach((printer, index) => {
        const option = document.createElement("option");
        option.value = index;
        option.textContent = printer.name;
        printerSelect.appendChild(option);
      });
    }

    const populatePresets = (printerIndex) => {
      if (!presetSelect || !presetContainer) return;
      while (presetSelect.options.length > 1) presetSelect.remove(1);
      const printer = typeof supportedPrinters !== 'undefined' && supportedPrinters[printerIndex];
      const presets = printer && Array.isArray(printer.presets) ? printer.presets : [];
      if (presets.length === 0) {
        presetContainer.style.display = 'none';
        return;
      }
      presets.forEach((p, i) => {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = p.name;
        presetSelect.appendChild(opt);
      });
      presetContainer.style.display = 'block';
    };

    const applyPreset = (printerIndex, presetIndex) => {
      const printer = typeof supportedPrinters !== 'undefined' && supportedPrinters[printerIndex];
      if (!printer || !Array.isArray(printer.presets) || !printer.presets[presetIndex]) return;
      const p = printer.presets[presetIndex];
      if (paperWidthInput) paperWidthInput.value = p.width;
      if (paperHeightInput) paperHeightInput.value = p.height;
      if (infinitePaperCheckbox) {
        infinitePaperCheckbox.checked = !!p.infinite;
        infinitePaperCheckbox.dispatchEvent(new Event('change'));
      }
      if (paddingTopInput) paddingTopInput.value = p.paddingTop ?? 0;
      if (paddingBottomInput) paddingBottomInput.value = p.paddingBottom ?? 0;
      if (paddingLeftInput) paddingLeftInput.value = p.paddingLeft ?? 0;
      if (paddingRightInput) paddingRightInput.value = p.paddingRight ?? 0;
      if (printNudgeXInput) printNudgeXInput.value = p.nudgeX ?? 0;
      if (printNudgeYInput) printNudgeYInput.value = p.nudgeY ?? 0;
    };

    printerSelect.addEventListener('change', () => {
      populatePresets(parseInt(printerSelect.value));
    });

    if (presetSelect) {
      presetSelect.addEventListener('change', () => {
        const v = presetSelect.value;
        if (v === '') return;
        applyPreset(parseInt(printerSelect.value), parseInt(v));
      });
    }

    // Function to apply settings
    const applyPrinterSettings = (printerIndex, widthMm, heightMm, isInfinite, paddingTopMm = 0, paddingBottomMm = 0, paddingLeftMm = 0, paddingRightMm = 0) => {
      if (typeof supportedPrinters !== 'undefined' && supportedPrinters[printerIndex]) {
        const printer = supportedPrinters[printerIndex];
        const dpm = printer.dpm;
        // Store dpm for resize handle
        currentPrinterDpm = dpm;

        // Calculate pixels
        let widthPx;
        if (isInfinite) {
          widthPx = Math.round((widthMm || 100) * dpm);
          if (resizeHandle) resizeHandle.classList.remove('hidden');
          if (dimensionControls) dimensionControls.classList.remove('hidden');
        } else {
          widthPx = Math.round(widthMm * dpm);
          if (resizeHandle) resizeHandle.classList.add('hidden');
          if (dimensionControls) dimensionControls.classList.add('hidden');
        }

        // Cap height at printer's max printable height
        let heightPx = Math.round(heightMm * dpm);
        if (heightPx > printer.px) {
          heightPx = printer.px;
        }

        // Update Canvas
        if (window.fabricEditor && window.fabricEditor.updateCanvasSize) {
          window.fabricEditor.updateCanvasSize(widthPx, heightPx);
          // Update dimension inputs after canvas is updated
          setTimeout(updateDimensionInputs, 0);
        }

        // Apply padding (convert mm to pixels)
        if (window.fabricEditor && window.fabricEditor.setPadding) {
          const paddingTopPx = Math.round(paddingTopMm * dpm);
          const paddingBottomPx = Math.round(paddingBottomMm * dpm);
          const paddingLeftPx = Math.round(paddingLeftMm * dpm);
          const paddingRightPx = Math.round(paddingRightMm * dpm);
          window.fabricEditor.setPadding(paddingTopPx, paddingBottomPx, paddingLeftPx, paddingRightPx);
        }

        // Hide Modal
        startupModal.classList.remove("show");
      }
    };

    // Get padding inputs
    const paddingTopInput = document.getElementById('paddingTop');
    const paddingBottomInput = document.getElementById('paddingBottom');
    const paddingLeftInput = document.getElementById('paddingLeft');
    const paddingRightInput = document.getElementById('paddingRight');
    const printNudgeXInput = document.getElementById('printNudgeXMm');
    const printNudgeYInput = document.getElementById('printNudgeYMm');

    // Check for URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const urlPrinter = urlParams.get('printer');
    const urlWidth = urlParams.get('width');
    const urlHeight = urlParams.get('height');
    const urlInfinite = urlParams.get('infinite') === 'true';
    const urlPaddingTop = urlParams.get('paddingTop');
    const urlPaddingBottom = urlParams.get('paddingBottom');
    const urlPaddingLeft = urlParams.get('paddingLeft');
    const urlPaddingRight = urlParams.get('paddingRight');
    const urlPrintNudgeX = urlParams.get('printNudgeX');
    const urlPrintNudgeY = urlParams.get('printNudgeY');
    const urlPreset = urlParams.get('preset');

    // Infinite Paper Checkbox Logic
    if (infinitePaperCheckbox && paperWidthInput && paperWidthContainer) {
      infinitePaperCheckbox.addEventListener("change", (e) => {
        if (e.target.checked) {
          paperWidthInput.removeAttribute("max");
          paperWidthContainer.style.display = 'none'; // Hide width input
          if (resizeHandle) resizeHandle.classList.remove('hidden');
          if (dimensionControls) dimensionControls.classList.remove('hidden');
          // Update dimension inputs when enabling infinite paper
          updateDimensionInputs();
        } else {
          paperWidthInput.setAttribute("max", "100"); // Restore default max
          if (parseFloat(paperWidthInput.value) > 100) {
            paperWidthInput.value = 100; // Cap value if it exceeds max
          }
          paperWidthContainer.style.display = 'block'; // Show width input
          if (resizeHandle) resizeHandle.classList.add('hidden');
          if (dimensionControls) dimensionControls.classList.add('hidden');
        }
      });
    }

    if (urlPrinter !== null && urlWidth !== null && urlHeight !== null) {
      const pIndex = parseInt(urlPrinter);
      const w = parseFloat(urlWidth);
      const h = parseFloat(urlHeight);

      if (!isNaN(pIndex) && !isNaN(w) && !isNaN(h)) {
        printerSelect.value = pIndex;
        populatePresets(pIndex);

        // If a preset was saved, apply it (fills form inputs) then override with URL values
        if (urlPreset !== null && urlPreset !== '') {
          const pi = parseInt(urlPreset);
          if (!isNaN(pi)) {
            applyPreset(pIndex, pi);
            if (presetSelect) presetSelect.value = pi;
          }
        }

        paperWidthInput.value = w;
        paperHeightInput.value = h;
        if (infinitePaperCheckbox) {
          infinitePaperCheckbox.checked = urlInfinite;
          infinitePaperCheckbox.dispatchEvent(new Event('change'));
        }

        const pTop = urlPaddingTop !== null ? parseFloat(urlPaddingTop) : 0;
        const pBottom = urlPaddingBottom !== null ? parseFloat(urlPaddingBottom) : 0;
        const pLeft = urlPaddingLeft !== null ? parseFloat(urlPaddingLeft) : 0;
        const pRight = urlPaddingRight !== null ? parseFloat(urlPaddingRight) : 0;

        if (paddingTopInput) paddingTopInput.value = pTop;
        if (paddingBottomInput) paddingBottomInput.value = pBottom;
        if (paddingLeftInput) paddingLeftInput.value = pLeft;
        if (paddingRightInput) paddingRightInput.value = pRight;

        const nudgeX = urlPrintNudgeX !== null ? parseFloat(urlPrintNudgeX) : 0;
        const nudgeY = urlPrintNudgeY !== null ? parseFloat(urlPrintNudgeY) : 0;
        if (printNudgeXInput) printNudgeXInput.value = Number.isFinite(nudgeX) ? nudgeX : 0;
        if (printNudgeYInput) printNudgeYInput.value = Number.isFinite(nudgeY) ? nudgeY : 0;

        applyPrinterSettings(pIndex, w, h, urlInfinite, pTop, pBottom, pLeft, pRight);
      } else {
        populatePresets(0);
        startupModal.classList.add("show");
      }
    } else {
      populatePresets(0);
      startupModal.classList.add("show");
    }

    if (settingsBtn) {
      settingsBtn.addEventListener("click", () => {
        startupModal.classList.add("show");
      });
    }

    // Close settings modal
    const closeSettingsModal = document.getElementById("closeSettingsModal");
    if (closeSettingsModal && startupModal) {
      closeSettingsModal.addEventListener("click", () => {
        startupModal.classList.remove("show");
      });

      // Close modal when clicking outside
      startupModal.addEventListener("click", (e) => {
        if (e.target === startupModal) {
          startupModal.classList.remove("show");
        }
      });
    }

    // Home title click handler - go back to home (clear URL params)
    if (homeTitle) {
      homeTitle.addEventListener("click", () => {
        window.location.href = window.location.pathname;
      });
    }

    // Function to update padding from inputs
    const updatePaddingFromInputs = () => {
      if (!window.fabricEditor || !window.fabricEditor.setPadding) return;

      const dpm = getCurrentPrinterDpm();
      const paddingTopMm = paddingTopInput ? parseFloat(paddingTopInput.value) || 0 : 0;
      const paddingBottomMm = paddingBottomInput ? parseFloat(paddingBottomInput.value) || 0 : 0;
      const paddingLeftMm = paddingLeftInput ? parseFloat(paddingLeftInput.value) || 0 : 0;
      const paddingRightMm = paddingRightInput ? parseFloat(paddingRightInput.value) || 0 : 0;

      // Convert mm to pixels
      const paddingTopPx = Math.round(paddingTopMm * dpm);
      const paddingBottomPx = Math.round(paddingBottomMm * dpm);
      const paddingLeftPx = Math.round(paddingLeftMm * dpm);
      const paddingRightPx = Math.round(paddingRightMm * dpm);

      window.fabricEditor.setPadding(paddingTopPx, paddingBottomPx, paddingLeftPx, paddingRightPx);

      // Update URL
      const newUrl = new URL(window.location);
      newUrl.searchParams.set('paddingTop', paddingTopMm);
      newUrl.searchParams.set('paddingBottom', paddingBottomMm);
      newUrl.searchParams.set('paddingLeft', paddingLeftMm);
      newUrl.searchParams.set('paddingRight', paddingRightMm);
      const nudgeXMm = printNudgeXInput ? parseFloat(printNudgeXInput.value) : 0;
      const nudgeYMm = printNudgeYInput ? parseFloat(printNudgeYInput.value) : 0;
      newUrl.searchParams.set('printNudgeX', Number.isFinite(nudgeXMm) ? nudgeXMm : 0);
      newUrl.searchParams.set('printNudgeY', Number.isFinite(nudgeYMm) ? nudgeYMm : 0);
      window.history.replaceState({}, '', newUrl);
    };

    // Add event listeners to padding inputs for real-time updates
    if (paddingTopInput) {
      paddingTopInput.addEventListener('change', updatePaddingFromInputs);
      paddingTopInput.addEventListener('blur', updatePaddingFromInputs);
    }
    if (paddingBottomInput) {
      paddingBottomInput.addEventListener('change', updatePaddingFromInputs);
      paddingBottomInput.addEventListener('blur', updatePaddingFromInputs);
    }
    if (paddingLeftInput) {
      paddingLeftInput.addEventListener('change', updatePaddingFromInputs);
      paddingLeftInput.addEventListener('blur', updatePaddingFromInputs);
    }
    if (paddingRightInput) {
      paddingRightInput.addEventListener('change', updatePaddingFromInputs);
      paddingRightInput.addEventListener('blur', updatePaddingFromInputs);
    }

    const updatePrintTuningFromInputs = () => {
      const nudgeXMm = printNudgeXInput ? parseFloat(printNudgeXInput.value) : 0;
      const nudgeYMm = printNudgeYInput ? parseFloat(printNudgeYInput.value) : 0;
      const newUrl = new URL(window.location);
      newUrl.searchParams.set('printNudgeX', Number.isFinite(nudgeXMm) ? nudgeXMm : 0);
      newUrl.searchParams.set('printNudgeY', Number.isFinite(nudgeYMm) ? nudgeYMm : 0);
      window.history.replaceState({}, '', newUrl);
    };

    if (printNudgeXInput) {
      printNudgeXInput.addEventListener('change', updatePrintTuningFromInputs);
      printNudgeXInput.addEventListener('blur', updatePrintTuningFromInputs);
    }
    if (printNudgeYInput) {
      printNudgeYInput.addEventListener('change', updatePrintTuningFromInputs);
      printNudgeYInput.addEventListener('blur', updatePrintTuningFromInputs);
    }

    // 3. Handle Start Button Click
    startBtn.addEventListener("click", () => {
      const selectedPrinterIndex = printerSelect.value;
      const widthMm = parseFloat(paperWidthInput.value);
      const heightMm = parseFloat(paperHeightInput.value);
      const isInfinite = infinitePaperCheckbox ? infinitePaperCheckbox.checked : false;
      const paddingTopMm = paddingTopInput ? parseFloat(paddingTopInput.value) || 0 : 0;
      const paddingBottomMm = paddingBottomInput ? parseFloat(paddingBottomInput.value) || 0 : 0;
      const paddingLeftMm = paddingLeftInput ? parseFloat(paddingLeftInput.value) || 0 : 0;
      const paddingRightMm = paddingRightInput ? parseFloat(paddingRightInput.value) || 0 : 0;

      applyPrinterSettings(selectedPrinterIndex, widthMm, heightMm, isInfinite,
        paddingTopMm, paddingBottomMm, paddingLeftMm, paddingRightMm);

      const newUrl = new URL(window.location);
      newUrl.searchParams.set('printer', selectedPrinterIndex);
      newUrl.searchParams.set('width', widthMm);
      newUrl.searchParams.set('height', heightMm);
      newUrl.searchParams.set('infinite', isInfinite);
      newUrl.searchParams.set('paddingTop', paddingTopMm);
      newUrl.searchParams.set('paddingBottom', paddingBottomMm);
      newUrl.searchParams.set('paddingLeft', paddingLeftMm);
      newUrl.searchParams.set('paddingRight', paddingRightMm);
      const nudgeXMm = printNudgeXInput ? parseFloat(printNudgeXInput.value) : 0;
      const nudgeYMm = printNudgeYInput ? parseFloat(printNudgeYInput.value) : 0;
      newUrl.searchParams.set('printNudgeX', Number.isFinite(nudgeXMm) ? nudgeXMm : 0);
      newUrl.searchParams.set('printNudgeY', Number.isFinite(nudgeYMm) ? nudgeYMm : 0);
      if (presetSelect && presetSelect.value !== '') {
        newUrl.searchParams.set('preset', presetSelect.value);
      } else {
        newUrl.searchParams.delete('preset');
      }
      window.history.replaceState({}, '', newUrl);
    });
  }
});

function setTextAlign(alignment) {
  if (window.fabricEditor) {
    window.fabricEditor.setTextAlign(alignment);
  }
}

function setVerticalAlign(alignment) {
  if (window.fabricEditor) {
    window.fabricEditor.setVerticalAlign(alignment);
  }
}
