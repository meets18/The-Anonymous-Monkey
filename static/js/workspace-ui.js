(function () {
    const state = {
        uploadedPath: "",
        outputPath: "",
        faces: [],
        selectedIds: new Set(),
        mode: "blur",
        pixelateStyle: "standard",
        maskStyle: "black_box",
        maskImagePath: "",
        activeScreen: "upload",
    };

    const elements = {
        splashScreen: document.getElementById("splashScreen"),
        uploadForm: document.getElementById("uploadForm"),
        imageFile: document.getElementById("imageFile"),
        selectedFile: document.getElementById("selectedFile"),
        uploadAnalyzeBtn: document.getElementById("uploadAnalyzeBtn"),
        processBtn: document.getElementById("processBtn"),
        modeSelect: document.getElementById("modeSelect"),
        pixelateStyle: document.getElementById("pixelateStyle"),
        maskStyle: document.getElementById("maskStyle"),
        maskImageFile: document.getElementById("maskImageFile"),
        maskImageStatus: document.getElementById("maskImageStatus"),
        pixelateOptions: document.getElementById("pixelateOptions"),
        maskOptions: document.getElementById("maskOptions"),
        maskImageGroup: document.getElementById("maskImageGroup"),
        originalPreview: document.getElementById("originalPreview"),
        processedPreview: document.getElementById("processedPreview"),
        originalPlaceholder: document.getElementById("originalPlaceholder"),
        processedPlaceholder: document.getElementById("processedPlaceholder"),
        faceOverlay: document.getElementById("faceOverlay"),
        faceList: document.getElementById("faceList"),
        statusBanner: document.getElementById("statusBanner"),
        downloadOutput: document.getElementById("downloadOutput"),
        selectAllBtn: document.getElementById("selectAllBtn"),
        clearAllBtn: document.getElementById("clearAllBtn"),
        stepNavUpload: document.getElementById("stepNavUpload"),
        stepNavSelect: document.getElementById("stepNavSelect"),
        stepNavOutput: document.getElementById("stepNavOutput"),
        backToUploadBtn: document.getElementById("backToUploadBtn"),
        toOutputBtn: document.getElementById("toOutputBtn"),
        backToSelectBtn: document.getElementById("backToSelectBtn"),
        screens: Array.from(document.querySelectorAll(".screen-panel[data-screen]")),
    };

    function runSplashSequence() {
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const splashDuration = reducedMotion ? 150 : 3600;

        window.setTimeout(() => {
            document.body.classList.remove("splash-active");
            document.body.classList.add("splash-complete");

            if (elements.splashScreen) {
                elements.splashScreen.setAttribute("aria-hidden", "true");
            }
        }, splashDuration);
    }

    function setStatus(message) {
        elements.statusBanner.textContent = message;
    }

    function canOpenSelect() {
        return Boolean(state.uploadedPath);
    }

    function canOpenOutput() {
        return Boolean(state.uploadedPath) && state.faces.length > 0 && state.selectedIds.size > 0;
    }

    function updateStepAvailability() {
        elements.stepNavSelect.disabled = !canOpenSelect();
        elements.stepNavOutput.disabled = !canOpenOutput();
        elements.toOutputBtn.disabled = !canOpenOutput();
    }

    function showScreen(screenName) {
        if (screenName === "select" && !canOpenSelect()) {
            return;
        }

        if (screenName === "output" && !canOpenOutput()) {
            return;
        }

        state.activeScreen = screenName;

        elements.screens.forEach((screen) => {
            const isActive = screen.dataset.screen === screenName;
            screen.classList.toggle("screen-panel-active", isActive);
        });

        [elements.stepNavUpload, elements.stepNavSelect, elements.stepNavOutput].forEach((button) => {
            const isActive = button.dataset.screen === screenName;
            button.classList.toggle("active", isActive);
            if (isActive) {
                button.setAttribute("aria-current", "step");
            } else {
                button.removeAttribute("aria-current");
            }
        });

        if (screenName === "select") {
            renderFaceOverlay();
        }
    }

    function updateActions() {
        elements.processBtn.disabled = !canOpenOutput();
        updateStepAvailability();
    }

    function updateModeUI() {
        elements.pixelateOptions.classList.toggle("hidden", state.mode !== "pixelate");
        elements.maskOptions.classList.toggle("hidden", state.mode !== "mask");
        elements.maskImageGroup.classList.toggle(
            "hidden",
            !(state.mode === "mask" && state.maskStyle === "image_overlay")
        );
    }

    function resetProcessedPreview() {
        elements.processedPreview.classList.remove("visible");
        elements.processedPreview.removeAttribute("src");
        elements.processedPlaceholder.classList.remove("hidden");
        elements.downloadOutput.classList.add("hidden");
        state.outputPath = "";
        updateActions();
    }

    function resetSelectionState() {
        state.faces = [];
        state.selectedIds = new Set();
        state.uploadedPath = "";
        renderFaceList();
        renderFaceOverlay();
        resetProcessedPreview();
        updateActions();
    }

    function previewLocalFile(file) {
        const localUrl = URL.createObjectURL(file);
        elements.originalPreview.src = localUrl;
        elements.originalPreview.classList.add("visible");
        elements.originalPlaceholder.classList.add("hidden");
        elements.selectedFile.textContent = `Selected image: ${file.name}`;
        elements.originalPreview.onload = () => renderFaceOverlay();
    }

    function renderFaceList() {
        elements.faceList.innerHTML = "";

        if (state.faces.length === 0) {
            const emptyMessage = state.uploadedPath
                ? "No faces were detected in this image."
                : "Detected faces will show up here after upload.";
            elements.faceList.innerHTML = `<div class="empty-state">${emptyMessage}</div>`;
            return;
        }

        state.faces.forEach((face) => {
            const item = document.createElement("label");
            item.className = "face-item";
            item.innerHTML = `
                <div class="face-meta">
                    <div class="face-title">Face ${face.id}</div>
                    <div class="face-caption">Keep this face visible in the final image</div>
                </div>
                <div class="face-toggle">
                    <span>Keep</span>
                    <input type="checkbox" data-face-id="${face.id}" ${state.selectedIds.has(face.id) ? "checked" : ""}>
                </div>
            `;
            elements.faceList.appendChild(item);
        });
    }

    function renderFaceOverlay() {
        elements.faceOverlay.innerHTML = "";

        if (!state.faces.length || !elements.originalPreview.naturalWidth) {
            return;
        }

        const imageRect = elements.originalPreview.getBoundingClientRect();
        const containerRect = elements.faceOverlay.getBoundingClientRect();
        const scaleX = imageRect.width / elements.originalPreview.naturalWidth;
        const scaleY = imageRect.height / elements.originalPreview.naturalHeight;
        const offsetLeft = imageRect.left - containerRect.left;
        const offsetTop = imageRect.top - containerRect.top;

        state.faces.forEach((face) => {
            const bbox = face.bbox || [];
            const [x, y, w, h] = bbox;
            if (bbox.length !== 4) {
                return;
            }

            const box = document.createElement("div");
            box.className = `face-box ${state.selectedIds.has(face.id) ? "selected" : ""}`;
            box.style.left = `${offsetLeft + (x * scaleX)}px`;
            box.style.top = `${offsetTop + (y * scaleY)}px`;
            box.style.width = `${w * scaleX}px`;
            box.style.height = `${h * scaleY}px`;
            box.innerHTML = `<span class="face-badge">Face ${face.id}</span>`;
            elements.faceOverlay.appendChild(box);
        });
    }

    function syncSelectionFromInputs() {
        const checkedIds = Array.from(
            elements.faceList.querySelectorAll('input[type="checkbox"]:checked')
        ).map((input) => Number(input.dataset.faceId));

        state.selectedIds = new Set(checkedIds);
        updateActions();
        renderFaceOverlay();

        if (state.selectedIds.size === 0) {
            setStatus("No faces selected yet. Choose at least one face to keep before continuing.");
            return;
        }

        setStatus(`${state.selectedIds.size} face(s) marked to stay visible. Continue when you're ready.`);
    }

    async function uploadFile(file) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/upload", {
            method: "POST",
            body: formData,
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || "Upload failed.");
        }
        return data;
    }

    async function uploadAndAnalyze(file) {
        setStatus("Uploading image and looking for faces...");
        const uploadData = await uploadFile(file);
        state.uploadedPath = uploadData.filepath;

        const analyzeResponse = await fetch("/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filepath: state.uploadedPath }),
        });
        const analyzeData = await analyzeResponse.json();
        if (!analyzeResponse.ok) {
            throw new Error(analyzeData.error || "Analyze failed.");
        }

        state.faces = analyzeData.faces || [];
        state.selectedIds = new Set(state.faces.map((face) => face.id));
        renderFaceList();
        renderFaceOverlay();
        updateActions();

        if (state.faces.length === 0) {
            setStatus("No faces were found. Try a clearer image or a tighter crop.");
            showScreen("select");
            return;
        }

        setStatus(`Image ready. ${state.faces.length} face(s) detected and pre-selected.`);
        showScreen("select");
    }

    async function ensureMaskImageUploaded() {
        if (!(state.mode === "mask" && state.maskStyle === "image_overlay")) {
            return "";
        }

        const file = elements.maskImageFile.files[0];
        if (!file) {
            throw new Error("Choose an overlay image for the mask mode.");
        }

        if (state.maskImagePath) {
            return state.maskImagePath;
        }

        elements.maskImageStatus.textContent = "Uploading overlay image...";
        const uploadData = await uploadFile(file);
        state.maskImagePath = uploadData.filepath;
        elements.maskImageStatus.textContent = `Overlay image: ${file.name}`;
        return state.maskImagePath;
    }

    async function processImage() {
        setStatus(`Creating output for ${state.selectedIds.size} selected face(s)...`);
        const maskImagePath = await ensureMaskImageUploaded();

        const response = await fetch("/process", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                filepath: state.uploadedPath,
                allowed_ids: Array.from(state.selectedIds),
                mode: state.mode,
                options: {
                    pixelate_style: state.pixelateStyle,
                    mask_style: state.maskStyle,
                    mask_image_path: maskImagePath,
                },
            }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || "Processing failed.");
        }

        state.outputPath = data.output;
        const filename = state.outputPath.split(/[\\/]/).pop();
        const outputUrl = `/output/${encodeURIComponent(filename)}`;

        elements.processedPreview.src = outputUrl;
        elements.processedPreview.classList.add("visible");
        elements.processedPlaceholder.classList.add("hidden");
        elements.downloadOutput.href = outputUrl;
        elements.downloadOutput.classList.remove("hidden");

        setStatus("Output ready. Preview it here or download the image.");
        updateActions();
    }

    function initEvents() {
        elements.imageFile.addEventListener("change", () => {
            const file = elements.imageFile.files[0];
            if (!file) {
                elements.selectedFile.textContent = "No image selected yet.";
                resetSelectionState();
                showScreen("upload");
                return;
            }

            previewLocalFile(file);
            resetSelectionState();
            setStatus("Preview updated. Upload the image when you're ready.");
            showScreen("upload");
        });

        elements.modeSelect.addEventListener("change", () => {
            state.mode = elements.modeSelect.value;
            updateModeUI();
            resetProcessedPreview();
        });

        elements.pixelateStyle.addEventListener("change", () => {
            state.pixelateStyle = elements.pixelateStyle.value;
            resetProcessedPreview();
        });

        elements.maskStyle.addEventListener("change", () => {
            state.maskStyle = elements.maskStyle.value;
            updateModeUI();
            resetProcessedPreview();
        });

        elements.maskImageFile.addEventListener("change", async () => {
            const file = elements.maskImageFile.files[0];
            state.maskImagePath = "";

            if (!file) {
                elements.maskImageStatus.textContent = "No overlay image selected.";
                resetProcessedPreview();
                return;
            }

            elements.maskImageStatus.textContent = `Uploading overlay image: ${file.name}`;
            resetProcessedPreview();

            try {
                const uploadData = await uploadFile(file);
                state.maskImagePath = uploadData.filepath;
                elements.maskImageStatus.textContent = `Overlay image uploaded: ${file.name}`;
                setStatus("Overlay image uploaded. Create output when you're ready.");
            } catch (error) {
                elements.maskImageStatus.textContent = `Overlay upload failed: ${file.name}`;
                setStatus(error.message);
            }
        });

        elements.uploadForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const file = elements.imageFile.files[0];
            if (!file) {
                setStatus("Please choose an image before uploading.");
                return;
            }

            previewLocalFile(file);
            resetProcessedPreview();

            try {
                elements.uploadAnalyzeBtn.disabled = true;
                await uploadAndAnalyze(file);
            } catch (error) {
                setStatus(error.message);
            } finally {
                elements.uploadAnalyzeBtn.disabled = false;
                updateActions();
            }
        });

        elements.processBtn.addEventListener("click", async () => {
            if (!canOpenOutput()) {
                setStatus("Upload an image and keep at least one face before creating output.");
                return;
            }

            try {
                elements.processBtn.disabled = true;
                await processImage();
            } catch (error) {
                setStatus(error.message);
            } finally {
                elements.processBtn.disabled = false;
                updateActions();
            }
        });

        elements.faceList.addEventListener("change", (event) => {
            if (event.target.matches('input[type="checkbox"]')) {
                syncSelectionFromInputs();
            }
        });

        elements.selectAllBtn.addEventListener("click", () => {
            state.selectedIds = new Set(state.faces.map((face) => face.id));
            renderFaceList();
            updateActions();
            renderFaceOverlay();
            setStatus(`All ${state.selectedIds.size} face(s) selected.`);
        });

        elements.clearAllBtn.addEventListener("click", () => {
            state.selectedIds = new Set();
            renderFaceList();
            updateActions();
            renderFaceOverlay();
            setStatus("Selection cleared. Choose the faces you want to keep.");
        });

        elements.stepNavUpload.addEventListener("click", () => showScreen("upload"));
        elements.stepNavSelect.addEventListener("click", () => showScreen("select"));
        elements.stepNavOutput.addEventListener("click", () => showScreen("output"));
        elements.backToUploadBtn.addEventListener("click", () => showScreen("upload"));
        elements.backToSelectBtn.addEventListener("click", () => showScreen("select"));
        elements.toOutputBtn.addEventListener("click", () => {
            if (!canOpenOutput()) {
                setStatus("Keep at least one detected face selected before continuing.");
                return;
            }
            showScreen("output");
            setStatus("Choose an output style, then create the final image.");
        });

        window.addEventListener("resize", renderFaceOverlay);
        elements.originalPreview.addEventListener("load", renderFaceOverlay);
    }

    function init() {
        runSplashSequence();
        renderFaceList();
        updateActions();
        updateModeUI();
        showScreen("upload");
        setStatus("Choose an image to begin.");
        initEvents();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
