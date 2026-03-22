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
    };

    const elements = {
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
    };

    function setStatus(message) {
        elements.statusBanner.textContent = message;
    }

    function updateActions() {
        elements.processBtn.disabled = !state.uploadedPath || state.faces.length === 0 || state.selectedIds.size === 0;
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
            elements.faceList.innerHTML = '<div class="empty-state">No faces were detected in this image.</div>';
            return;
        }

        state.faces.forEach((face) => {
            const item = document.createElement("label");
            item.className = "face-item";
            item.innerHTML = `
                <div class="face-meta">
                    <div class="face-title">Face ${face.id}</div>
                    <div class="face-caption">Use this face in the final output</div>
                </div>
                <div class="face-toggle">
                    <span>Select</span>
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
            const [x, y, w, h] = face.bbox;
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
        setStatus(`${state.selectedIds.size} face(s) selected. Create output when you're ready.`);
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
        setStatus("Uploading image and preparing face selection...");
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
        updateActions();
        renderFaceList();
        renderFaceOverlay();

        if (state.faces.length === 0) {
            setStatus("No faces were found. The app now checks frontal, side-profile, and slightly rotated faces, but very small or heavily stylized faces may still need a closer crop.");
            return;
        }

        setStatus(`Image ready. ${state.faces.length} face(s) detected for selection.`);
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

        setStatus("Output ready. You can preview it now or download the image.");
        updateActions();
    }

    function initEvents() {
        elements.imageFile.addEventListener("change", () => {
            const file = elements.imageFile.files[0];
            if (!file) {
                elements.selectedFile.textContent = "No image selected yet.";
                return;
            }

            previewLocalFile(file);
            state.faces = [];
            state.selectedIds = new Set();
            state.uploadedPath = "";
            renderFaceList();
            renderFaceOverlay();
            resetProcessedPreview();
            setStatus("Preview updated. Upload the image when you're ready.");
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
            }
        });

        elements.processBtn.addEventListener("click", async () => {
            if (!state.uploadedPath || state.selectedIds.size === 0) {
                setStatus("Upload an image and select at least one face before creating output.");
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
            setStatus("Selection cleared. Choose the faces you want in the output.");
        });

        window.addEventListener("resize", renderFaceOverlay);
        elements.originalPreview.addEventListener("load", renderFaceOverlay);
    }

    function init() {
        updateActions();
        updateModeUI();
        setStatus("Choose an image to begin.");
        initEvents();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
