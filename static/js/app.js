(function () {
    const state = {
        uploadedPath: "",
        outputPath: "",
        faces: [],
        selectedIds: new Set(),
        mode: "blur",
    };

    const elements = {
        uploadForm: document.getElementById("uploadForm"),
        imageFile: document.getElementById("imageFile"),
        uploadAnalyzeBtn: document.getElementById("uploadAnalyzeBtn"),
        processBtn: document.getElementById("processBtn"),
        modeSelect: document.getElementById("modeSelect"),
        originalPreview: document.getElementById("originalPreview"),
        processedPreview: document.getElementById("processedPreview"),
        originalPlaceholder: document.getElementById("originalPlaceholder"),
        processedPlaceholder: document.getElementById("processedPlaceholder"),
        faceOverlay: document.getElementById("faceOverlay"),
        faceList: document.getElementById("faceList"),
        facesDetected: document.getElementById("facesDetected"),
        facesSelected: document.getElementById("facesSelected"),
        currentModeLabel: document.getElementById("currentModeLabel"),
        pipelineStatus: document.getElementById("pipelineStatus"),
        statusHint: document.getElementById("statusHint"),
        statusBanner: document.getElementById("statusBanner"),
        uploadedPath: document.getElementById("uploadedPath"),
        outputPath: document.getElementById("outputPath"),
        selectedIds: document.getElementById("selectedIds"),
        activityLog: document.getElementById("activityLog"),
        downloadOutput: document.getElementById("downloadOutput"),
        selectAllBtn: document.getElementById("selectAllBtn"),
        clearAllBtn: document.getElementById("clearAllBtn"),
    };

    function capitalize(text) {
        return text.charAt(0).toUpperCase() + text.slice(1);
    }

    function logActivity(message) {
        const wrapper = document.createElement("div");
        wrapper.className = "activity-item custom";
        wrapper.innerHTML = `
            <div class="activity-avatar log">AI</div>
            <div class="activity-content">
                <div class="activity-text">${message}</div>
                <span class="activity-time">${new Date().toLocaleTimeString()}</span>
            </div>
        `;
        elements.activityLog.prepend(wrapper);
    }

    function setStatus(status, hint, banner) {
        elements.pipelineStatus.textContent = status;
        elements.statusHint.textContent = hint;
        elements.statusBanner.textContent = banner;
    }

    function updateSummary() {
        elements.facesDetected.textContent = String(state.faces.length);
        elements.facesSelected.textContent = String(state.selectedIds.size);
        elements.currentModeLabel.textContent = capitalize(state.mode);
        elements.uploadedPath.textContent = state.uploadedPath || "Not uploaded";
        elements.outputPath.textContent = state.outputPath || "Not generated";
        elements.selectedIds.textContent = JSON.stringify(Array.from(state.selectedIds));
        elements.processBtn.disabled = !state.uploadedPath || state.faces.length === 0 || state.selectedIds.size === 0;
    }

    function resetProcessedPreview() {
        elements.processedPreview.classList.remove("visible");
        elements.processedPreview.removeAttribute("src");
        elements.processedPlaceholder.classList.remove("hidden");
        elements.downloadOutput.classList.add("hidden");
        state.outputPath = "";
        updateSummary();
    }

    function previewLocalFile(file) {
        const localUrl = URL.createObjectURL(file);
        elements.originalPreview.src = localUrl;
        elements.originalPreview.classList.add("visible");
        elements.originalPlaceholder.classList.add("hidden");
        elements.originalPreview.onload = () => renderFaceOverlay();
    }

    function renderFaceList() {
        elements.faceList.innerHTML = "";

        if (state.faces.length === 0) {
            elements.faceList.innerHTML = '<div class="empty-state">No faces detected yet.</div>';
            return;
        }

        state.faces.forEach((face) => {
            const item = document.createElement("label");
            item.className = "face-item";
            item.innerHTML = `
                <div class="face-meta">
                    <div class="face-title">Face ${face.id}</div>
                    <div class="face-caption">bbox: [${face.bbox.join(", ")}]</div>
                </div>
                <div class="face-toggle">
                    <span>Mask this face</span>
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
        updateSummary();
        renderFaceOverlay();
    }

    async function uploadAndAnalyze(file) {
        const formData = new FormData();
        formData.append("file", file);

        setStatus("Uploading", "Sending image", "Uploading image to Flask backend...");
        logActivity("Uploading image to /upload.");

        const uploadResponse = await fetch("/upload", {
            method: "POST",
            body: formData,
        });
        const uploadData = await uploadResponse.json();
        if (!uploadResponse.ok) {
            throw new Error(uploadData.error || "Upload failed.");
        }

        state.uploadedPath = uploadData.filepath;
        logActivity("Upload finished. Calling /analyze for face detection.");

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
        updateSummary();
        renderFaceList();
        renderFaceOverlay();

        setStatus(
            "Analyzed",
            `${state.faces.length} faces ready`,
            `Detected ${state.faces.length} face(s). Adjust the selections and process when ready.`
        );
        logActivity(`Analyze completed with ${state.faces.length} detected face(s).`);
    }

    async function processImage() {
        setStatus("Processing", "Applying anonymizer", `Processing ${state.selectedIds.size} selected face(s) with ${state.mode} mode.`);
        logActivity(`Calling /process with mode "${state.mode}".`);

        const response = await fetch("/process", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                filepath: state.uploadedPath,
                allowed_ids: Array.from(state.selectedIds),
                mode: state.mode,
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

        setStatus("Complete", "Output saved", "Processed image generated successfully.");
        updateSummary();
        logActivity("Processing completed and output preview updated.");
    }

    function handleModeChange() {
        state.mode = elements.modeSelect.value;
        updateSummary();
        if (state.uploadedPath) {
            resetProcessedPreview();
            logActivity(`Mode switched to "${state.mode}".`);
        }
    }

    function initEvents() {
        elements.uploadForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const file = elements.imageFile.files[0];
            if (!file) {
                setStatus("Idle", "No image chosen", "Please choose an image before uploading.");
                return;
            }

            previewLocalFile(file);
            resetProcessedPreview();

            try {
                elements.uploadAnalyzeBtn.disabled = true;
                await uploadAndAnalyze(file);
            } catch (error) {
                setStatus("Error", "Request failed", error.message);
                logActivity(`Error: ${error.message}`);
            } finally {
                elements.uploadAnalyzeBtn.disabled = false;
            }
        });

        elements.processBtn.addEventListener("click", async () => {
            if (!state.uploadedPath || state.selectedIds.size === 0) {
                setStatus("Idle", "Nothing to process", "Upload, analyze, and select at least one face before processing.");
                return;
            }

            try {
                elements.processBtn.disabled = true;
                await processImage();
            } catch (error) {
                setStatus("Error", "Processing failed", error.message);
                logActivity(`Error: ${error.message}`);
            } finally {
                elements.processBtn.disabled = false;
                updateSummary();
            }
        });

        elements.modeSelect.addEventListener("change", handleModeChange);

        elements.faceList.addEventListener("change", (event) => {
            if (event.target.matches('input[type="checkbox"]')) {
                syncSelectionFromInputs();
            }
        });

        elements.selectAllBtn.addEventListener("click", () => {
            state.selectedIds = new Set(state.faces.map((face) => face.id));
            renderFaceList();
            updateSummary();
            renderFaceOverlay();
        });

        elements.clearAllBtn.addEventListener("click", () => {
            state.selectedIds = new Set();
            renderFaceList();
            updateSummary();
            renderFaceOverlay();
        });

        window.addEventListener("resize", renderFaceOverlay);
        elements.originalPreview.addEventListener("load", renderFaceOverlay);
    }

    function init() {
        updateSummary();
        setStatus("Idle", "Waiting for image", "Choose an image to begin.");
        logActivity("Frontend ready. Waiting for an upload.");
        initEvents();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
