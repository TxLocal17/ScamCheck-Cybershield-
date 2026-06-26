const GEMINI_MODEL = "gemini-2.5-flash";
const MAX_MESSAGE_LENGTH = 5000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_AUDIO_SECONDS = 60;
const HISTORY_KEY = "scamcheck_history";
const TEXT_SCALE_KEY = "scamcheck_text_scale";
const THEME_KEY = "scamcheck_theme";
const HISTORY_LIMIT = 10;
const TEXT_SCALE_MIN = 1;
const TEXT_SCALE_MAX = 2;
const TEXT_SCALE_STEP = 0.1;
const SITE_URL = "https://txlocal17.github.io/ScamCheck-Cybershield-/";

const RISK_CONFIG = {
    "An toàn": { className: "risk-safe", label: "AN TOÀN", hint: "Tin này có vẻ ổn, nhưng vẫn nên cẩn thận." },
    "Nghi ngờ": { className: "risk-warning", label: "NGHI NGỜ", hint: "Có dấu hiệu đáng ngờ. Hãy dừng lại và kiểm tra kỹ." },
    "Nguy hiểm": { className: "risk-danger", label: "NGUY HIỂM", hint: "Rất có thể là lừa đảo. Không bấm link, không chuyển tiền." }
};

const SAMPLE_MESSAGES = {
    bank: "THÔNG BÁO KHẨN: Tài khoản Vietcombank của quý khách sẽ bị khóa trong 2 giờ do phát hiện giao dịch bất thường. Vui lòng bấm ngay link xác minh: bit.ly/vcb-khoa-tk. Nếu không xác nhận, ngân hàng không chịu trách nhiệm.",
    police: "Cục Cảnh sát điều tra: Quý vị đang bị liên quan đến vụ án rửa tiền xuyên quốc gia. Gọi ngay số 0901234567 trong 30 phút để làm việc. Nếu không hợp tác sẽ phát lệnh bắt và phong tỏa tài khoản.",
    prize: "Chúc mừng! Bạn trúng iPhone 16 Pro trong chương trình tri ân khách hàng 2026. Nhận thưởng tại trungthuong-2026.com. Đóng phí vận chuyển 500.000đ trong 24 giờ để nhận quà."
};

const CRISIS_CHOICES = [
    { id: "nothing", label: "Chưa làm gì" },
    { id: "clicked", label: "Đã bấm vào đường dẫn" },
    { id: "transferred", label: "Đã chuyển khoản" },
    { id: "otp", label: "Đã cung cấp mã xác thực" }
];

const INPUT_TYPE_LABELS = {
    text: "📝",
    image: "📷",
    voice: "🎤"
};

const LIBRARY_CATEGORY_CLASS = {
    "giả ngân hàng": "cat-bank",
    "giả cơ quan công an": "cat-police",
    "trúng thưởng": "cat-prize",
    "giả đơn vị giao hàng": "cat-delivery"
};

let hotlinesData = null;
let scamTypesData = [];
let quizData = [];
let quizState = { index: 0, score: 0, answered: false };
let currentMessage = "";
let lastFullResult = null;
let libraryFilter = "all";
let currentInputMode = "text";
let selectedImageFile = null;
let audioBlob = null;
let mediaRecorder = null;
let audioChunks = [];
let recordingTimer = null;
let recordingSeconds = 0;

const messageInput = document.getElementById("messageInput");
const checkButton = document.getElementById("checkButton");
const resultBox = document.getElementById("resultBox");
const charCount = document.getElementById("charCount");
const viewLanding = document.getElementById("viewLanding");
const viewHome = document.getElementById("viewHome");
const viewHistory = document.getElementById("viewHistory");
const viewLibrary = document.getElementById("viewLibrary");
const viewQuiz = document.getElementById("viewQuiz");
const historyList = document.getElementById("historyList");
const historyDetail = document.getElementById("historyDetail");
const libraryList = document.getElementById("libraryList");
const libraryDetail = document.getElementById("libraryDetail");
const brandHome = document.getElementById("brandHome");
const textScaleDown = document.getElementById("textScaleDown");
const textScaleUp = document.getElementById("textScaleUp");
const textScaleValue = document.getElementById("textScaleValue");
const themeToggle = document.getElementById("themeToggle");
const landingThemeToggle = document.getElementById("landingThemeToggle");
const quizProgress = document.getElementById("quizProgress");
const quizScore = document.getElementById("quizScore");
const quizMessage = document.getElementById("quizMessage");
const quizBtnFake = document.getElementById("quizBtnFake");
const quizBtnReal = document.getElementById("quizBtnReal");
const quizFeedback = document.getElementById("quizFeedback");
const quizNextBtn = document.getElementById("quizNextBtn");
const startAppBtn = document.getElementById("startAppBtn");
const imageUploadInput = document.getElementById("imageUploadInput");
const imagePreview = document.getElementById("imagePreview");
const imageClearBtn = document.getElementById("imageClearBtn");
const voiceRecordBtn = document.getElementById("voiceRecordBtn");
const voiceRecordLabel = document.getElementById("voiceRecordLabel");
const voiceStatus = document.getElementById("voiceStatus");
const voicePlayback = document.getElementById("voicePlayback");
const voiceClearBtn = document.getElementById("voiceClearBtn");
const inputPanelText = document.getElementById("inputPanelText");
const inputPanelImage = document.getElementById("inputPanelImage");
const inputPanelVoice = document.getElementById("inputPanelVoice");
const appHeader = document.querySelector(".app-header");
const bottomNav = document.querySelector(".bottom-nav");
const appFooter = document.querySelector(".app-footer");

init();

function init() {
    bindHomeEvents();
    bindInputModeEvents();
    bindRouter();
    bindHeaderControls();
    bindQuizEvents();
    loadStaticData();
    normalizeHomeHash();
    navigateTo(getRouteFromHash());
}

function bindHeaderControls() {
    initTheme();

    const savedScale = parseFloat(localStorage.getItem(TEXT_SCALE_KEY));
    applyTextScale(Number.isFinite(savedScale) ? savedScale : TEXT_SCALE_MIN);

    textScaleDown?.addEventListener("click", () => {
        applyTextScale(getCurrentTextScale() - TEXT_SCALE_STEP);
    });

    textScaleUp?.addEventListener("click", () => {
        applyTextScale(getCurrentTextScale() + TEXT_SCALE_STEP);
    });

    themeToggle?.addEventListener("click", toggleTheme);
    landingThemeToggle?.addEventListener("click", toggleTheme);
}

function getCurrentTheme() {
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    const theme = saved === "dark" || saved === "light"
        ? saved
        : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    applyTheme(theme);
}

function applyTheme(theme) {
    const nextTheme = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem(THEME_KEY, nextTheme);

    const isDark = nextTheme === "dark";
    [themeToggle, landingThemeToggle].forEach((btn) => {
        if (!btn) return;
        btn.setAttribute("aria-pressed", isDark ? "true" : "false");
        btn.setAttribute("aria-label", isDark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối");
        btn.querySelector(".theme-icon-moon")?.classList.toggle("hidden", isDark);
        btn.querySelector(".theme-icon-sun")?.classList.toggle("hidden", !isDark);
    });
}

function toggleTheme() {
    applyTheme(getCurrentTheme() === "dark" ? "light" : "dark");
}

function getCurrentTextScale() {
    const saved = parseFloat(localStorage.getItem(TEXT_SCALE_KEY));
    return Number.isFinite(saved) ? saved : TEXT_SCALE_MIN;
}

function formatTextScaleLabel(scale) {
    return scale % 1 === 0 ? `${scale}x` : `${scale.toFixed(1)}x`;
}

function goToCheck() {
    updateUrlForRoute("/check");
    navigateTo("/check");
    historyDetail.classList.add("hidden");
    libraryDetail.classList.add("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function goToLanding() {
    updateUrlForRoute("/");
    navigateTo("/");
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function goHome() {
    goToCheck();
}

function scrollToPanel(element) {
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "start" });
}

function getScalableRoots() {
    return [
        document.querySelector(".container"),
        document.querySelector(".app-footer"),
        document.querySelector(".bottom-nav")
    ];
}

function applyTextScale(scale) {
    const rounded = Math.round(scale * 10) / 10;
    const clamped = Math.min(TEXT_SCALE_MAX, Math.max(TEXT_SCALE_MIN, rounded));
    document.documentElement.style.setProperty("--text-scale", String(clamped));
    document.body.style.zoom = "";

    getScalableRoots().forEach((el) => {
        if (!el) return;
        el.style.zoom = clamped;
    });

    if (!CSS.supports("zoom", "1")) {
        getScalableRoots().forEach((el) => {
            if (el) el.style.zoom = "";
        });
        document.documentElement.style.fontSize = `${clamped * 100}%`;
    }

    localStorage.setItem(TEXT_SCALE_KEY, String(clamped));

    if (textScaleValue) {
        textScaleValue.textContent = formatTextScaleLabel(clamped);
    }

    if (textScaleDown) {
        textScaleDown.disabled = clamped <= TEXT_SCALE_MIN;
    }

    if (textScaleUp) {
        textScaleUp.disabled = clamped >= TEXT_SCALE_MAX;
    }
}

function bindHomeEvents() {
    checkButton.addEventListener("click", runCheck);
    messageInput.addEventListener("input", updateCharCount);
    updateCharCount();
    startAppBtn?.addEventListener("click", goToCheck);

    document.querySelectorAll(".sample-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const key = btn.dataset.sample;
            if (SAMPLE_MESSAGES[key]) {
                setInputMode("text");
                messageInput.value = SAMPLE_MESSAGES[key];
                updateCharCount();
                messageInput.focus();
            }
        });
    });

    document.querySelectorAll(".filter-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            libraryFilter = btn.dataset.filter;
            renderLibraryList();
        });
    });
}

function bindInputModeEvents() {
    document.querySelectorAll(".input-mode-btn").forEach((btn) => {
        btn.addEventListener("click", () => setInputMode(btn.dataset.mode));
    });

    imageUploadInput?.addEventListener("change", handleImageSelected);
    imageClearBtn?.addEventListener("click", clearSelectedImage);
    voiceRecordBtn?.addEventListener("click", toggleVoiceRecording);
    voiceClearBtn?.addEventListener("click", clearVoiceRecording);
}

function setInputMode(mode) {
    if (!["text", "image", "voice"].includes(mode)) return;
    currentInputMode = mode;

    document.querySelectorAll(".input-mode-btn").forEach((btn) => {
        const active = btn.dataset.mode === mode;
        btn.classList.toggle("active", active);
        btn.setAttribute("aria-selected", active ? "true" : "false");
    });

    inputPanelText?.classList.toggle("hidden", mode !== "text");
    inputPanelImage?.classList.toggle("hidden", mode !== "image");
    inputPanelVoice?.classList.toggle("hidden", mode !== "voice");
    document.querySelector(".sample-buttons")?.classList.toggle("hidden", mode !== "text");
}

function handleImageSelected(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
        showError("Vui lòng chọn file ảnh (JPG, PNG, WEBP).");
        imageUploadInput.value = "";
        return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
        showError("Ảnh quá lớn. Vui lòng chọn ảnh dưới 5 MB.");
        imageUploadInput.value = "";
        return;
    }

    selectedImageFile = file;
    const reader = new FileReader();
    reader.onload = () => {
        imagePreview.innerHTML = `<img src="${reader.result}" alt="Ảnh tin nhắn đã chọn">`;
        imagePreview.classList.remove("hidden");
        imageClearBtn?.classList.remove("hidden");
    };
    reader.readAsDataURL(file);
}

function clearSelectedImage() {
    selectedImageFile = null;
    if (imageUploadInput) imageUploadInput.value = "";
    imagePreview?.classList.add("hidden");
    imagePreview.innerHTML = "";
    imageClearBtn?.classList.add("hidden");
}

async function toggleVoiceRecording() {
    if (mediaRecorder?.state === "recording") {
        stopVoiceRecording();
        return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
        showError("Trình duyệt không hỗ trợ ghi âm. Bác thử dùng văn bản hoặc ảnh nhé.");
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunks = [];
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) audioChunks.push(event.data);
        };
        mediaRecorder.onstop = () => {
            stream.getTracks().forEach((track) => track.stop());
            audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || "audio/webm" });
            const url = URL.createObjectURL(audioBlob);
            voicePlayback.src = url;
            voicePlayback.classList.remove("hidden");
            voiceClearBtn?.classList.remove("hidden");
            voiceStatus.textContent = `Đã ghi ${recordingSeconds} giây. Bác nghe lại rồi bấm Kiểm tra nhé.`;
            resetRecordingUi(false);
        };

        mediaRecorder.start();
        recordingSeconds = 0;
        voiceRecordBtn.classList.add("recording");
        voiceRecordBtn.setAttribute("aria-pressed", "true");
        voiceRecordLabel.textContent = "Dừng ghi âm";
        voiceStatus.textContent = "Đang ghi... 0 giây";

        recordingTimer = window.setInterval(() => {
            recordingSeconds += 1;
            voiceStatus.textContent = `Đang ghi... ${recordingSeconds} giây`;
            if (recordingSeconds >= MAX_AUDIO_SECONDS) stopVoiceRecording();
        }, 1000);
    } catch (error) {
        console.error(error);
        showError("Không truy cập được micro. Bác kiểm tra quyền micro rồi thử lại.");
        resetRecordingUi(true);
    }
}

function stopVoiceRecording() {
    if (mediaRecorder?.state === "recording") {
        mediaRecorder.stop();
    }
    if (recordingTimer) {
        clearInterval(recordingTimer);
        recordingTimer = null;
    }
}

function resetRecordingUi(clearBlob) {
    voiceRecordBtn?.classList.remove("recording");
    voiceRecordBtn?.setAttribute("aria-pressed", "false");
    if (voiceRecordLabel) voiceRecordLabel.textContent = "Bấm để ghi âm";
    if (clearBlob) {
        audioBlob = null;
        if (voicePlayback) {
            voicePlayback.pause();
            voicePlayback.removeAttribute("src");
            voicePlayback.classList.add("hidden");
        }
        voiceClearBtn?.classList.add("hidden");
        if (voiceStatus) voiceStatus.textContent = "Chưa có bản ghi";
    }
}

function clearVoiceRecording() {
    stopVoiceRecording();
    resetRecordingUi(true);
}

function readBlobAsBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = String(reader.result || "");
            const base64 = result.includes(",") ? result.split(",")[1] : result;
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

function bindRouter() {
    window.addEventListener("hashchange", () => navigateTo(getRouteFromHash()));
    window.addEventListener("popstate", () => navigateTo(getRouteFromHash()));

    document.querySelectorAll(".nav-link").forEach((link) => {
        link.addEventListener("click", (event) => {
            event.preventDefault();
            const route = link.dataset.route || "/";
            updateUrlForRoute(route);
            navigateTo(route);
        });
    });

    document.querySelectorAll(".brand-home").forEach((link) => {
        link.addEventListener("click", (event) => {
            event.preventDefault();
            goToLanding();
        });
    });

    document.querySelectorAll(".back-link").forEach((link) => {
        link.addEventListener("click", (event) => {
            event.preventDefault();
            goToCheck();
        });
    });
}

function updateUrlForRoute(route) {
    const baseUrl = window.location.pathname + window.location.search;
    if (route === "/") {
        history.replaceState(null, "", baseUrl);
        return;
    }
    history.replaceState(null, "", `${baseUrl}#${route}`);
}

function normalizeHomeHash() {
    const hash = window.location.hash;
    if (hash === "#/" || hash === "#") {
        history.replaceState(null, "", window.location.pathname + window.location.search);
    }
}

function getRouteFromHash() {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash || hash === "/") return "/";
    if (hash.startsWith("/check") || hash === "check") return "/check";
    if (hash.startsWith("/history") || hash === "history") return "/history";
    if (hash.startsWith("/library") || hash === "library") return "/library";
    if (hash.startsWith("/quiz") || hash === "quiz") return "/quiz";
    return "/";
}

function navigateTo(route) {
    const isLanding = route === "/";
    viewLanding?.classList.toggle("hidden", !isLanding);
    viewHome.classList.toggle("hidden", route !== "/check");
    viewHistory.classList.toggle("hidden", route !== "/history");
    viewLibrary.classList.toggle("hidden", route !== "/library");
    viewQuiz.classList.toggle("hidden", route !== "/quiz");

    appHeader?.classList.toggle("hidden", isLanding);
    bottomNav?.classList.toggle("hidden", isLanding);
    appFooter?.classList.toggle("hidden", isLanding);
    document.body.classList.toggle("landing-active", isLanding);

    document.querySelectorAll(".nav-link").forEach((link) => {
        link.classList.toggle("active", link.dataset.route === route);
    });

    if (route === "/history") renderHistoryList();
    if (route === "/library") renderLibraryList();
    if (route === "/quiz") renderQuiz();
}

async function loadStaticData() {
    try {
        const [hotlinesRes, typesRes, quizRes] = await Promise.all([
            fetch("data/hotlines.json"),
            fetch("data/scam-types.json"),
            fetch("data/quiz.json")
        ]);
        if (hotlinesRes.ok) hotlinesData = await hotlinesRes.json();
        if (typesRes.ok) scamTypesData = await typesRes.json();
        if (quizRes.ok) quizData = await quizRes.json();
    } catch (error) {
        console.error("Không tải được dữ liệu tĩnh:", error);
    }
}

function bindQuizEvents() {
    quizBtnFake?.addEventListener("click", () => handleQuizAnswer(true));
    quizBtnReal?.addEventListener("click", () => handleQuizAnswer(false));
    quizNextBtn?.addEventListener("click", () => {
        if (quizState.index >= quizData.length) {
            resetQuiz();
            document.getElementById("quizChoices")?.classList.remove("hidden");
            renderQuiz();
            return;
        }
        advanceQuiz();
    });
}

function resetQuiz() {
    quizState = { index: 0, score: 0, answered: false };
}

function renderQuiz() {
    if (!quizData.length) {
        quizMessage.textContent = "Chưa tải được câu hỏi. Bác thử tải lại trang nhé.";
        quizProgress.textContent = "Câu 0/0";
        quizScore.textContent = "Điểm: 0";
        quizChoicesHide();
        return;
    }

    if (quizState.index >= quizData.length) {
        renderQuizComplete();
        return;
    }

    const question = quizData[quizState.index];
    quizMessage.textContent = question.message;
    quizProgress.textContent = `Câu ${quizState.index + 1}/${quizData.length}`;
    quizScore.textContent = `Điểm: ${quizState.score}`;
    quizFeedback.classList.add("hidden");
    quizNextBtn.classList.add("hidden");
    quizState.answered = false;
    setQuizChoicesEnabled(true);
}

function quizChoicesHide() {
    document.getElementById("quizChoices")?.classList.add("hidden");
}

function setQuizChoicesEnabled(enabled) {
    if (quizBtnFake) quizBtnFake.disabled = !enabled;
    if (quizBtnReal) quizBtnReal.disabled = !enabled;
}

function handleQuizAnswer(userPickedFake) {
    if (quizState.answered || !quizData.length) return;

    const question = quizData[quizState.index];
    const isCorrect = userPickedFake === question.isFake;
    quizState.answered = true;
    setQuizChoicesEnabled(false);

    if (isCorrect) {
        quizState.score += 1;
        quizScore.textContent = `Điểm: ${quizState.score}`;
        quizFeedback.className = "quiz-feedback quiz-feedback-correct";
        quizFeedback.textContent = `Đúng rồi bác! ${question.explanation}`;
    } else {
        quizFeedback.className = "quiz-feedback quiz-feedback-wrong";
        quizFeedback.textContent = `Chưa đúng bác. ${question.explanation}`;
    }

    quizFeedback.classList.remove("hidden");
    quizNextBtn.textContent = quizState.index >= quizData.length - 1 ? "Xem kết quả" : "Câu tiếp theo";
    quizNextBtn.classList.remove("hidden");
}

function advanceQuiz() {
    if (!quizState.answered) return;

    quizState.index += 1;
    renderQuiz();
}

function renderQuizComplete() {
    const total = quizData.length;
    const score = quizState.score;
    quizProgress.textContent = "Hoàn thành";
    quizScore.textContent = `Điểm: ${score}/${total}`;
    quizMessage.textContent = score >= total * 0.7
        ? "Giỏi lắm bác! Bác đã nhận ra khá nhiều tin lừa đảo."
        : "Bác cứ luyện thêm vài lần nữa sẽ quen tay hơn.";
    document.getElementById("quizChoices")?.classList.add("hidden");
    quizFeedback.className = "quiz-feedback quiz-feedback-correct";
    quizFeedback.textContent = score === total
        ? "Xuất sắc bác! Bác trả lời đúng hết cả rồi."
        : `Bác đúng ${score} trên ${total} câu. Hãy đọc kỹ link và yêu cầu chuyển tiền trong tin lạ.`;
    quizFeedback.classList.remove("hidden");
    quizNextBtn.textContent = "Làm lại";
    quizNextBtn.classList.remove("hidden");
}

function updateCharCount() {
    const len = messageInput.value.length;
    charCount.textContent = `${len} / ${MAX_MESSAGE_LENGTH} ký tự`;
    charCount.classList.toggle("char-count-warn", len > MAX_MESSAGE_LENGTH * 0.9);
}

async function runCheck() {
    const inputType = currentInputMode;
    let message = "";
    const mediaParts = [];

    if (inputType === "text") {
        message = messageInput.value.trim();
        if (!message) {
            showError("Vui lòng nhập tin nhắn.");
            return;
        }
        if (message.length > MAX_MESSAGE_LENGTH) {
            showError(`Tin nhắn quá dài. Vui lòng rút gọn dưới ${MAX_MESSAGE_LENGTH} ký tự.`);
            return;
        }
    } else if (inputType === "image") {
        if (!selectedImageFile) {
            showError("Vui lòng chọn ảnh tin nhắn trước khi kiểm tra.");
            return;
        }
        const base64 = await readBlobAsBase64(selectedImageFile);
        mediaParts.push({ mimeType: selectedImageFile.type || "image/jpeg", base64 });
    } else if (inputType === "voice") {
        if (!audioBlob) {
            showError("Vui lòng ghi âm tin nhắn trước khi kiểm tra.");
            return;
        }
        const base64 = await readBlobAsBase64(audioBlob);
        mediaParts.push({ mimeType: audioBlob.type || "audio/webm", base64 });
    }

    const loadingMessages = {
        text: "🔍 Thám tử đang phân tích tin nhắn...",
        image: "🔍 Thám tử đang đọc ảnh và phân tích...",
        voice: "🔍 Thám tử đang nghe và phân tích..."
    };

    checkButton.disabled = true;
    showLoading(loadingMessages[inputType] || loadingMessages.text);
    lastFullResult = null;

    try {
        const detectiveRaw = await callGemini(buildDetectivePrompt(inputType, message), mediaParts);
        const detective = parseDetectiveResult(detectiveRaw);

        if (inputType !== "text") {
            message = detective.extractedMessage || "";
            if (!message.trim()) {
                showError("Không đọc được nội dung từ ảnh hoặc ghi âm. Bác thử lại hoặc nhập tay nhé.");
                return;
            }
            if (message.length > MAX_MESSAGE_LENGTH) {
                message = message.slice(0, MAX_MESSAGE_LENGTH);
            }
        }

        currentMessage = message;
        let psychologist = null;
        let psychologistError = null;

        if (shouldCallPsychologist(detective.riskLevel)) {
            showLoading("💬 Cô tâm lý đang giải thích...");
            try {
                const psychRaw = await callGemini(buildPsychologistPrompt(message, detective));
                psychologist = parsePsychologistResult(psychRaw);
            } catch (error) {
                psychologistError = getUserErrorMessage(error);
            }
        }

        lastFullResult = { detective, psychologist, psychologistError, message, inputType };
        saveToHistory(lastFullResult);
        renderFullResult(lastFullResult);
    } catch (error) {
        showError(getUserErrorMessage(error));
        console.error(error);
    } finally {
        checkButton.disabled = false;
    }
}

function shouldCallPsychologist(riskLevel) {
    return riskLevel === "Nghi ngờ" || riskLevel === "Nguy hiểm";
}

function buildSectionHeading(icon, title) {
    return `
        <h2 class="section-title">
            <span class="section-icon" aria-hidden="true">${icon}</span>
            <span>${escapeHtml(title)}</span>
        </h2>
    `;
}

function getLibraryCategoryClass(category) {
    return LIBRARY_CATEGORY_CLASS[category] || "";
}

function showLoading(text) {
    resultBox.className = "result-box result-loading";
    resultBox.innerHTML = `
        <div class="spinner" aria-hidden="true"></div>
        <p class="loading-text">${escapeHtml(text)}</p>
        <p class="loading-subtext">Vui lòng đợi trong giây lát.</p>
    `;
}

function showError(message) {
    resultBox.className = "result-box result-error";
    resultBox.innerHTML = `<p>${escapeHtml(message)}</p>`;
}

function renderFullResult(data, options = {}) {
    const target = options.container || resultBox;
    const { detective, psychologist, psychologistError, message } = data;
    const risk = RISK_CONFIG[detective.riskLevel] || RISK_CONFIG["Nghi ngờ"];
    const signs = Array.isArray(detective.signs) ? detective.signs : [];

    let highlightedHtml = "";
    if (signs.length > 0 && message) {
        highlightedHtml = `
            <div class="original-section result-span-full">
                ${buildSectionHeading("📄", "Tin gốc (đoạn đáng ngờ được tô vàng)")}
                <div class="original-message">${highlightPhrasesInText(message, signs.map((s) => s.phrase))}</div>
            </div>
        `;
    }

    let signsHtml = "";
    if (signs.length > 0) {
        const signCards = signs.map((sign, index) => `
            <article class="sign-card">
                <p class="sign-number">Dấu hiệu ${index + 1}</p>
                <p class="sign-phrase">"${escapeHtml(sign.phrase || "")}"</p>
                <p class="sign-reason">${escapeHtml(sign.reason || "")}</p>
            </article>
        `).join("");
        signsHtml = `
            <div class="signs-section character-panel character-detective result-span-full">
                ${buildSectionHeading("🔍", "Phân tích kỹ thuật (Thám tử)")}
                <div class="signs-list">${signCards}</div>
            </div>
        `;
    } else if (detective.riskLevel === "An toàn") {
        signsHtml = `
            <div class="character-panel character-detective">
                ${buildSectionHeading("🔍", "Phân tích kỹ thuật (Thám tử)")}
                <p class="safe-note">Không thấy câu nào đặc biệt đáng ngờ trong tin này.</p>
            </div>
        `;
    } else {
        signsHtml = `
            <div class="character-panel character-detective">
                ${buildSectionHeading("🔍", "Phân tích kỹ thuật (Thám tử)")}
            </div>
        `;
    }

    let psychHtml = "";
    if (psychologist?.explanation) {
        psychHtml = `
            <div class="character-panel character-psychologist">
                ${buildSectionHeading("💬", "Hiểu vì sao mình suýt tin (Cô tâm lý)")}
                <p class="psychologist-text">${escapeHtml(psychologist.explanation)}</p>
            </div>
        `;
    } else if (psychologistError) {
        psychHtml = `
            <div class="character-panel character-psychologist">
                ${buildSectionHeading("💬", "Hiểu vì sao mình suýt tin (Cô tâm lý)")}
                <p class="psychologist-text">Cô tâm lý đang bận, vui lòng thử lại sau.</p>
            </div>
        `;
    }

    const actionsRaw = Array.isArray(detective.actions) ? detective.actions.map((a) => String(a).trim()).filter(Boolean) : [];
    const defaultActions = [
        "Không bấm link trong tin lạ",
        "Gọi tổng đài ngân hàng in trên thẻ để xác nhận",
        "Hỏi con cháu hoặc hàng xóm tin cậy"
    ];
    const actions = [...actionsRaw];
    while (actions.length < 3) {
        actions.push(defaultActions[actions.length] || defaultActions[defaultActions.length - 1]);
    }
    const actionsDisplay = actions.slice(0, 3);
    let actionsHtml = "";
    if (actions.length > 0) {
        actionsHtml = `
            <div class="character-panel character-actions">
                ${buildSectionHeading("✅", "Nên làm gì tiếp theo")}
                <ul class="actions-list">${actionsDisplay.map((a) => `<li>${escapeHtml(a)}</li>`).join("")}</ul>
            </div>
        `;
    }

    const shareHtml = options.readOnly ? "" : `
        <div class="share-section">
            ${buildSectionHeading("📤", "Chia sẻ cho người thân")}
            <button type="button" id="shareCardBtn" class="secondary-btn">Tạo thẻ cảnh báo</button>
            <div id="shareCardPreview" class="share-preview hidden"></div>
        </div>
    `;

    const needsCrisisFlow = detective.riskLevel !== "An toàn";
    const crisisHtml = options.readOnly || !needsCrisisFlow ? "" : buildCrisisQuestionHtml();

    if (!options.container) {
        resultBox.className = "result-box";
    }

    target.innerHTML = `
        <div class="result-layout">
            <div class="risk-card ${risk.className}">
                <p class="risk-label">${risk.label}</p>
                <p class="risk-summary">${escapeHtml(detective.summary || risk.hint)}</p>
            </div>
            <div class="result-grid">
                ${highlightedHtml}
                ${signsHtml}
                ${psychHtml}
                ${actionsHtml}
                ${shareHtml}
                ${crisisHtml}
            </div>
        </div>
    `;

    if (!options.readOnly) {
        target.querySelector("#shareCardBtn")?.addEventListener("click", () => generateShareCard(data));
        bindCrisisButtons(data, target);
    }
}

function buildCrisisQuestionHtml() {
    const buttons = CRISIS_CHOICES.map((c) =>
        `<button type="button" class="crisis-btn" data-crisis="${c.id}">${escapeHtml(c.label)}</button>`
    ).join("");

    return `
        <div class="character-panel character-crisis result-span-full" id="crisisSection">
            ${buildSectionHeading("❓", "Bác đã làm gì rồi?")}
            <div class="crisis-buttons">${buttons}</div>
            <div id="crisisResult" class="crisis-result hidden"></div>
        </div>
    `;
}

function bindCrisisButtons(data, root = resultBox) {
    const section = root.querySelector("#crisisSection");
    if (!section) return;

    section.querySelectorAll(".crisis-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (section.dataset.answered === "true") return;
            section.dataset.answered = "true";
            section.querySelectorAll(".crisis-btn").forEach((b) => {
                b.disabled = true;
                b.classList.toggle("selected", b === btn);
            });

            const choice = btn.dataset.crisis;
            const resultEl = root.querySelector("#crisisResult");
            resultEl.classList.remove("hidden");

            if (choice === "nothing") {
                resultEl.innerHTML = `<p class="praise-text">Bác làm đúng rồi! Cứ giữ bình tĩnh, không bấm link và không chuyển tiền theo tin lạ nhé.</p>`;
                return;
            }

            resultEl.innerHTML = `<p class="loading-text">🆘 Người ứng cứu đang soạn hướng dẫn...</p>`;

            try {
                const hotlines = await ensureHotlines();
                const raw = await callGemini(buildRescuerPrompt(data.message, data.detective, choice, hotlines));
                const steps = sanitizeRescuerSteps(parseRescuerResult(raw), hotlines);
                resultEl.innerHTML = renderRescuerSteps(steps, hotlines);
            } catch (error) {
                resultEl.innerHTML = `<p class="result-error-inline">${escapeHtml(getUserErrorMessage(error))}</p>`;
            }
        });
    });
}

function renderRescuerSteps(steps, hotlines) {
    if (!steps.length) {
        return `<p>${escapeHtml(getDefaultRescuerMessage(hotlines))}</p>`;
    }

    const items = steps.map((step, i) => {
        let phoneHtml = "";
        if (step.phone) {
            const label = step.phoneLabel ? `${step.phoneLabel}: ` : "";
            phoneHtml = `<p class="rescuer-phone">Gọi ${escapeHtml(label)}${escapeHtml(step.phone)}</p>`;
        }

        return `
        <li class="rescuer-step">
            <strong>Bước ${i + 1}: ${escapeHtml(step.action || "")}</strong>
            ${phoneHtml}
            ${step.script ? `<p class="rescuer-script">"${escapeHtml(step.script)}"</p>` : ""}
        </li>
    `;
    }).join("");

    return `
        <div class="character-panel character-rescuer">
            ${buildSectionHeading("🆘", "Hướng dẫn ứng cứu (Người ứng cứu)")}
            <ol class="rescuer-list">${items}</ol>
        </div>
    `;
}

function getDefaultRescuerMessage(hotlines) {
    const police = (hotlines?.authorities || []).find((entry) => normalizePhoneDigits(entry.phone) === "113");
    const bank = (hotlines?.banks || [])[0];
    const parts = ["Gọi tổng đài ngân hàng in trên thẻ ngay"];

    if (bank?.phone) {
        parts.push(`hoặc ${bank.name} ${bank.phone}`);
    }

    if (police?.phone) {
        parts.push(`báo công an ${police.phone}`);
    }

    parts.push("nếu đã chuyển tiền hoặc lộ mã OTP");
    return parts.join(", ") + ".";
}

function buildHotlineIndex(hotlines) {
    return [...(hotlines?.banks || []), ...(hotlines?.authorities || [])].map((entry) => ({
        name: entry.name,
        phone: entry.phone,
        digits: normalizePhoneDigits(entry.phone)
    }));
}

function normalizePhoneDigits(value) {
    let digits = String(value || "").replace(/\D/g, "");

    if (digits.startsWith("84") && digits.length > 10) {
        digits = "0" + digits.slice(2);
    }

    return digits;
}

function resolveOfficialPhone(value, hotlineIndex) {
    const digits = normalizePhoneDigits(value);
    if (!digits) {
        return null;
    }

    const exact = hotlineIndex.find((entry) => entry.digits === digits);
    if (exact) {
        return exact;
    }

    for (const entry of hotlineIndex) {
        if (entry.digits.length >= 8 && (digits.endsWith(entry.digits) || entry.digits.endsWith(digits))) {
            return entry;
        }
    }

    return null;
}

function sanitizeTextPhones(text, hotlineIndex) {
    if (!text) {
        return "";
    }

    return String(text).replace(/(?:\+?84|0)[\d\s.\-]{2,16}\d|\b\d{3,4}\b/g, (match) => {
        const official = resolveOfficialPhone(match, hotlineIndex);

        if (official) {
            return official.phone;
        }

        const digits = normalizePhoneDigits(match);
        if (digits.length >= 3) {
            console.warn("Loai bo so khong co trong hotlines.json:", match);
            return "so tong dai in tren the ngan hang";
        }

        return match;
    });
}

function sanitizeRescuerSteps(steps, hotlines) {
    const hotlineIndex = buildHotlineIndex(hotlines);

    return steps
        .map((step) => {
            const official = step.phone ? resolveOfficialPhone(step.phone, hotlineIndex) : null;

            return {
                action: sanitizeTextPhones(step.action, hotlineIndex),
                phone: official ? official.phone : "",
                phoneLabel: official ? official.name : "",
                script: sanitizeTextPhones(step.script, hotlineIndex)
            };
        })
        .filter((step) => step.action || step.phone || step.script);
}

async function ensureHotlines() {
    if (hotlinesData) return hotlinesData;
    const res = await fetch("data/hotlines.json");
    if (!res.ok) throw new Error("Loi mang");
    hotlinesData = await res.json();
    return hotlinesData;
}

async function generateShareCard(data) {
    const preview = document.getElementById("shareCardPreview");
    preview.classList.remove("hidden");
    preview.innerHTML = `<p class="loading-text">Đang tạo thẻ...</p>`;

    try {
        if (typeof QRCode === "undefined") {
            throw new Error("Không tải được thư viện QR");
        }

        const canvasWidth = 600;
        const padding = 30;
        const contentWidth = canvasWidth - padding * 2;
        const qrSize = 140;
        const risk = data.detective.riskLevel;
        const colors = {
            "An toàn": "#2e7d32",
            "Nghi ngờ": "#f9a825",
            "Nguy hiểm": "#d93025"
        };
        const headerColor = colors[risk] || "#f9a825";
        const rawMessage = String(data.message || "").trim();
        const displayMessage = rawMessage.length > 320 ? `${rawMessage.slice(0, 317)}...` : rawMessage;

        const measureCanvas = document.createElement("canvas");
        const measureCtx = measureCanvas.getContext("2d");
        measureCtx.font = "18px Arial";
        const messageLineCount = Math.min(8, countWrappedTextLines(measureCtx, displayMessage || "—", contentWidth - 20));
        const messageHeight = Math.max(56, messageLineCount * 26 + 24);

        measureCtx.font = "18px Arial";
        const summaryLineCount = Math.min(3, countWrappedTextLines(measureCtx, data.detective.summary || "", contentWidth));
        const summaryHeight = summaryLineCount * 26;

        const signs = (data.detective.signs || []).slice(0, 2);
        measureCtx.font = "17px Arial";
        let signsHeight = signs.length ? 36 : 0;
        signs.forEach((sign) => {
            signsHeight += Math.min(2, countWrappedTextLines(measureCtx, `• ${sign.phrase}`, contentWidth)) * 24 + 8;
        });

        const canvasHeight = 120 + 40 + messageHeight + 50 + summaryHeight + signsHeight + 30 + qrSize + 60;

        const canvas = document.createElement("canvas");
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext("2d");

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        ctx.fillStyle = headerColor;
        ctx.fillRect(0, 0, canvasWidth, 120);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 36px Arial";
        ctx.textAlign = "center";
        ctx.fillText(risk.toUpperCase(), canvasWidth / 2, 55);
        ctx.font = "20px Arial";
        ctx.fillText("ScamCheck", canvasWidth / 2, 95);

        ctx.textAlign = "left";
        let y = 150;

        ctx.fillStyle = "#111";
        ctx.font = "bold 20px Arial";
        ctx.fillText("Tin nhắn gốc:", padding, y);
        y += 30;

        ctx.fillStyle = "#f4f6f8";
        ctx.fillRect(padding - 5, y - 6, contentWidth + 10, messageHeight);
        ctx.strokeStyle = "#dde3ea";
        ctx.lineWidth = 1;
        ctx.strokeRect(padding - 5, y - 6, contentWidth + 10, messageHeight);

        ctx.fillStyle = "#1a1a1a";
        ctx.font = "18px Arial";
        y = wrapCanvasText(ctx, displayMessage || "—", padding + 8, y + 18, contentWidth - 16, 26, 8);
        y += 36;

        ctx.fillStyle = "#111";
        ctx.font = "bold 20px Arial";
        ctx.fillText("Kết luận:", padding, y);
        y += 28;
        ctx.font = "18px Arial";
        y = wrapCanvasText(ctx, data.detective.summary || "", padding, y, contentWidth, 26, 3);
        y += 16;

        if (signs.length) {
            ctx.font = "bold 20px Arial";
            ctx.fillText("Dấu hiệu chính:", padding, y);
            y += 28;
            ctx.font = "17px Arial";
            signs.forEach((sign) => {
                y = wrapCanvasText(ctx, `• ${sign.phrase}`, padding, y, contentWidth, 24, 2);
                y += 8;
            });
        }

        y += 24;
        const qrX = (canvasWidth - qrSize) / 2;
        const qrCanvas = document.createElement("canvas");
        await QRCode.toCanvas(qrCanvas, SITE_URL, { width: qrSize, margin: 1 });
        ctx.drawImage(qrCanvas, qrX, y, qrSize, qrSize);
        y += qrSize + 28;

        ctx.font = "16px Arial";
        ctx.textAlign = "center";
        ctx.fillStyle = "#555";
        ctx.fillText("Quét mã để dùng ScamCheck", canvasWidth / 2, y);

        const dataUrl = canvas.toDataURL("image/png");
        preview.innerHTML = `
            <img src="${dataUrl}" alt="Thẻ cảnh báo ScamCheck" class="share-image">
            <a href="${dataUrl}" download="scamcheck-canh-bao.png" class="secondary-btn download-btn">Tải ảnh về máy</a>
        `;
    } catch (error) {
        preview.innerHTML = `<p class="result-error-inline">Không tạo được thẻ. Vui lòng thử lại sau.</p>`;
        console.error(error);
    }
}

function countWrappedTextLines(ctx, text, maxWidth, maxLines = Infinity) {
    const words = String(text || "").split(/\s+/).filter(Boolean);
    if (!words.length) return 1;

    let line = "";
    let lines = 0;
    for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth && line) {
            lines++;
            if (lines >= maxLines) return maxLines;
            line = word;
        } else {
            line = test;
        }
    }
    if (line && lines < maxLines) lines++;
    return lines || 1;
}

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines = Infinity) {
    const words = String(text || "").split(/\s+/).filter(Boolean);
    if (!words.length) return y;

    let line = "";
    let lineCount = 0;

    for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth && line) {
            ctx.fillText(line, x, y);
            y += lineHeight;
            lineCount++;
            if (lineCount >= maxLines) {
                ctx.fillText("...", x, y);
                return y + lineHeight;
            }
            line = word;
        } else {
            line = test;
        }
    }

    if (line && lineCount < maxLines) {
        ctx.fillText(line, x, y);
        y += lineHeight;
    } else if (line && lineCount >= maxLines) {
        ctx.fillText("...", x, y);
        y += lineHeight;
    }

    return y;
}

function highlightPhrasesInText(text, phrases) {
    const validPhrases = [...new Set(phrases.filter(Boolean))];
    if (!validPhrases.length) return escapeHtml(text);

    const ranges = [];
    for (const phrase of validPhrases) {
        let start = 0;
        while (start < text.length) {
            const idx = text.indexOf(phrase, start);
            if (idx === -1) break;
            ranges.push({ start: idx, end: idx + phrase.length });
            start = idx + phrase.length;
        }
    }

    if (!ranges.length) return escapeHtml(text);

    ranges.sort((a, b) => a.start - b.start);
    const merged = [];
    for (const r of ranges) {
        const last = merged[merged.length - 1];
        if (last && r.start <= last.end) {
            last.end = Math.max(last.end, r.end);
        } else {
            merged.push({ ...r });
        }
    }

    let html = "";
    let cursor = 0;
    for (const r of merged) {
        html += escapeHtml(text.slice(cursor, r.start));
        html += `<mark class="highlight">${escapeHtml(text.slice(r.start, r.end))}</mark>`;
        cursor = r.end;
    }
    html += escapeHtml(text.slice(cursor));
    return html;
}

function saveToHistory(data) {
    const items = getHistory();
    const entry = {
        id: Date.now(),
        message: data.message,
        inputType: data.inputType || "text",
        detective: data.detective,
        psychologist: data.psychologist,
        psychologistError: data.psychologistError,
        savedAt: new Date().toISOString()
    };
    items.unshift(entry);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, HISTORY_LIMIT)));
}

function getHistory() {
    try {
        const raw = localStorage.getItem(HISTORY_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function renderHistoryList() {
    const items = getHistory();
    historyDetail.classList.add("hidden");

    if (!items.length) {
        historyList.innerHTML = `<p class="empty-state">📋 Chưa có tin nào.<br>Hãy kiểm tra tin đầu tiên ở tab Kiểm tra.</p>`;
        return;
    }

    historyList.innerHTML = items.map((item) => {
        const risk = RISK_CONFIG[item.detective?.riskLevel] || RISK_CONFIG["Nghi ngờ"];
        const preview = item.message.slice(0, 60) + (item.message.length > 60 ? "..." : "");
        const date = new Date(item.savedAt).toLocaleString("vi-VN");
        const typeLabel = INPUT_TYPE_LABELS[item.inputType] || INPUT_TYPE_LABELS.text;
        return `
            <button type="button" class="history-item" data-id="${item.id}">
                <span class="history-risk ${risk.className}">${risk.label}</span>
                <span class="history-preview"><span class="history-input-type" aria-hidden="true">${typeLabel}</span>${escapeHtml(preview)}</span>
                <span class="history-date">${escapeHtml(date)}</span>
            </button>
        `;
    }).join("");

    historyList.querySelectorAll(".history-item").forEach((btn) => {
        btn.addEventListener("click", () => {
            const item = items.find((i) => i.id === Number(btn.dataset.id));
            if (!item) return;
            historyDetail.classList.remove("hidden");
            historyDetail.innerHTML = `<button type="button" class="back-detail-btn">← Quay lại danh sách</button><div id="historyResultHost" class="result-box"></div>`;
            historyDetail.querySelector(".back-detail-btn").addEventListener("click", () => {
                historyDetail.classList.add("hidden");
            });
            const host = historyDetail.querySelector("#historyResultHost");
            renderFullResult({
                message: item.message,
                detective: item.detective,
                psychologist: item.psychologist,
                psychologistError: item.psychologistError
            }, { readOnly: true, container: host });
            scrollToPanel(host);
        });
    });
}

function renderLibraryList() {
    if (!scamTypesData.length) {
        libraryList.innerHTML = `<p class="empty-state">Đang tải thư viện...</p>`;
        return;
    }

    libraryDetail.classList.add("hidden");
    const filtered = libraryFilter === "all"
        ? scamTypesData
        : scamTypesData.filter((t) => t.category === libraryFilter);

    libraryList.innerHTML = filtered.map((item) => {
        const catClass = getLibraryCategoryClass(item.category);
        return `
        <button type="button" class="library-item" data-id="${escapeHtml(item.id)}">
            <span class="library-category ${catClass}">${escapeHtml(item.category)}</span>
            <span class="library-name">${escapeHtml(item.name)}</span>
        </button>
    `;
    }).join("");

    libraryList.querySelectorAll(".library-item").forEach((btn) => {
        btn.addEventListener("click", () => {
            const item = scamTypesData.find((t) => t.id === btn.dataset.id);
            if (!item) return;
            libraryDetail.classList.remove("hidden");
            libraryDetail.innerHTML = `
                <span class="library-category ${getLibraryCategoryClass(item.category)}">${escapeHtml(item.category)}</span>
                <h3 class="library-detail-title">${escapeHtml(item.name)}</h3>
                <p>${escapeHtml(item.description)}</p>
                <div class="library-example">
                    <strong>Ví dụ tin nhắn:</strong>
                    <p>${escapeHtml(item.example)}</p>
                </div>
                <button type="button" class="secondary-btn" id="tryInCheckBtn">Thử kiểm tra tin này</button>
            `;
            const tryBtn = document.getElementById("tryInCheckBtn");
            tryBtn.addEventListener("click", () => {
                messageInput.value = item.example;
                updateCharCount();
                goHome();
            });
            scrollToPanel(tryBtn);
        });
    });
}

function parseDetectiveResult(rawText) {
    const fallback = {
        riskLevel: "Nghi ngờ",
        summary: "Không đọc được kết quả chi tiết. Hãy thử lại hoặc hỏi người thân.",
        signs: [],
        actions: [
            "Không bấm link trong tin lạ",
            "Gọi tổng đài ngân hàng in trên thẻ để xác nhận",
            "Hỏi con cháu hoặc hàng xóm tin cậy"
        ]
    };

    try {
        const parsed = JSON.parse(cleanJsonText(rawText));
        const riskLevel = normalizeRiskLevel(parsed.riskLevel);
        return {
            riskLevel,
            summary: String(parsed.summary || RISK_CONFIG[riskLevel].hint),
            extractedMessage: String(parsed.extractedMessage || "").trim(),
            signs: (parsed.signs || [])
                .filter((s) => s && (s.phrase || s.reason))
                .map((s) => ({
                    phrase: String(s.phrase || "").trim(),
                    reason: String(s.reason || "").trim()
                })),
            actions: (parsed.actions || []).map((a) => String(a).trim())
        };
    } catch (error) {
        console.error("Parse detective error:", error, rawText);
        return fallback;
    }
}

function parsePsychologistResult(rawText) {
    const fallback = {
        explanation: "Tin này thường nhắm vào cảm xúc gấp gáp. Bác cứ dừng lại, hít thở sâu và hỏi người thân trước khi làm gì nhé."
    };

    try {
        const parsed = JSON.parse(cleanJsonText(rawText));
        return { explanation: String(parsed.explanation || fallback.explanation).trim() };
    } catch (error) {
        console.error("Parse psychologist error:", error);
        return fallback;
    }
}

function parseRescuerResult(rawText) {
    try {
        const parsed = JSON.parse(cleanJsonText(rawText));
        return (parsed.steps || []).map((s) => ({
            action: String(s.action || "").trim(),
            phone: String(s.phone || "").trim(),
            script: String(s.script || "").trim()
        }));
    } catch (error) {
        console.error("Parse rescuer error:", error);
        return [];
    }
}

function cleanJsonText(rawText) {
    return String(rawText)
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();
}

function normalizeRiskLevel(level) {
    const value = String(level || "").toLowerCase();
    if (value.includes("an toàn") || value.includes("an toan")) return "An toàn";
    if (value.includes("nguy hiểm") || value.includes("nguy hiem")) return "Nguy hiểm";
    return "Nghi ngờ";
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function getApiKey() {
    if (typeof GEMINI_API_KEY !== "undefined" && GEMINI_API_KEY && GEMINI_API_KEY !== "YOUR_GEMINI_API_KEY_HERE") {
        return GEMINI_API_KEY;
    }
    return "";
}

async function callGemini(promptText, mediaParts = []) {
    if (window.location.protocol === "file:") {
        throw new Error("Bi chan CORS");
    }

    const apiKey = getApiKey();
    if (!apiKey) throw new Error("Thiếu cấu hình API");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);

    const parts = [{ text: promptText }];
    mediaParts.forEach((media) => {
        parts.push({
            inline_data: {
                mime_type: media.mimeType,
                data: media.base64
            }
        });
    });

    let response;
    try {
        response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey
            },
            signal: controller.signal,
            body: JSON.stringify({
                contents: [{ parts }],
                generationConfig: { responseMimeType: "application/json" }
            })
        });
    } catch (error) {
        if (error.name === "AbortError") throw new Error("Het thoi gian cho");
        throw new Error("Loi mang");
    } finally {
        clearTimeout(timeoutId);
    }

    const data = await response.json();
    if (!response.ok) {
        console.error(data);
        throw new Error(getApiErrorMessage(response.status, data));
    }

    const blockedReason = data.candidates?.[0]?.finishReason;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
        if (blockedReason === "SAFETY" || data.promptFeedback?.blockReason) {
            throw new Error("Bi loc noi dung");
        }
        throw new Error("Khong co ket qua");
    }

    return text;
}

function buildDetectivePrompt(inputType, message = "") {
    const jsonSchema = `JSON bắt buộc:
{
  "riskLevel": "An toàn" hoặc "Nghi ngờ" hoặc "Nguy hiểm",
  "summary": "một câu tóm tắt dễ hiểu cho người lớn tuổi",
  "signs": [{"phrase": "đoạn nguyên văn trích từ tin gốc", "reason": "giải thích ngắn"}],
  "actions": ["việc 1", "việc 2", "việc 3"]
}

Quy tắc:
- riskLevel chỉ được là một trong ba giá trị trên
- signs: tối đa 5, phrase phải trích nguyên văn từ tin gốc
- Nếu An toàn thì signs = []
- actions: đúng 3 việc cụ thể
- Tiếng Việt`;

    if (inputType === "image") {
        return `Bạn là Thám tử phân tích tin nhắn lừa đảo. Giọng khô khan, lý tính.
Ảnh đính kèm là screenshot tin nhắn (SMS, Zalo, ngân hàng, v.v.).
Hãy đọc toàn bộ nội dung tin nhắn trong ảnh, rồi phân tích mức rủi ro lừa đảo.

Trả về ĐÚNG định dạng JSON, không thêm chữ nào khác. Thêm trường "extractedMessage" chứa nội dung tin nhắn đọc được từ ảnh.

${jsonSchema}`;
    }

    if (inputType === "voice") {
        return `Bạn là Thám tử phân tích tin nhắn lừa đảo. Giọng khô khan, lý tính.
File âm thanh đính kèm: người dùng đọc to hoặc mô tả tin nhắn nghi ngờ.
Hãy chép lại nội dung tin nhắn từ giọng nói, rồi phân tích mức rủi ro lừa đảo.

Trả về ĐÚNG định dạng JSON, không thêm chữ nào khác. Thêm trường "extractedMessage" chứa nội dung tin nhắn nghe được.

${jsonSchema}`;
    }

    return `Bạn là Thám tử phân tích tin nhắn lừa đảo. Giọng khô khan, lý tính. Phân tích tin sau và trả về ĐÚNG định dạng JSON, không thêm chữ nào khác:

"${message}"

${jsonSchema}`;
}

function buildPsychologistPrompt(message, detective) {
    return `Bạn là Cô tâm lý. Giọng gần gũi, xưng "cô", gọi người dùng là "bác". Không hù doạ, không dạy dỗ.

Tin nhắn: "${message}"
Mức rủi ro Thám tử kết luận: ${detective.riskLevel}

Trả về ĐÚNG JSON:
{"explanation": "từ 2 đến 3 câu giải thích chiêu thức tâm lý kẻ lừa đảo dùng"}

Chỉ 2-3 câu, tiếng Việt, thân thiện.`;
}

function buildRescuerPrompt(message, detective, choice, hotlines) {
    const hotlineText = formatHotlinesForPrompt(hotlines);
    const scenarioMap = {
        clicked: "Người dùng ĐÃ BẤM vào đường dẫn lạ trong tin nhắn.",
        transferred: "Người dùng ĐÃ CHUYỂN KHOẢN theo yêu cầu trong tin nhắn.",
        otp: "Người dùng ĐÃ CUNG CẤP mã xác thực OTP cho kẻ lừa đảo."
    };

    return `Bạn là Người ứng cứu. Giọng bình tĩnh, dứt khoát. Không an ủi, không phân tích dài. Chỉ đưa bước hành động cụ thể.

Tình huống: ${scenarioMap[choice] || ""}
Tin nhắn: "${message}"
Mức rủi ro: ${detective.riskLevel}

DANH SÁCH SỐ ĐIỆN THOẠI CHÍNH THỐNG (CHỈ được dùng số trong danh sách này, KHÔNG tự bịa số):
${hotlineText}

Trả về ĐÚNG JSON:
{
  "steps": [
    {"action": "việc cần làm", "phone": "số từ danh sách hoặc rỗng", "script": "câu nói mẫu khi gọi điện"}
  ]
}

Quy tắc:
- 4 đến 6 bước, đánh số logic
- phone chỉ lấy từ danh sách trên
- script ngắn, đọc được khi gọi điện
- Không câu cảm thán
- Tiếng Việt`;
}

function formatHotlinesForPrompt(hotlines) {
    const lines = [];
    (hotlines.banks || []).forEach((b) => lines.push(`${b.name}: ${b.phone}`));
    (hotlines.authorities || []).forEach((a) => lines.push(`${a.name}: ${a.phone}`));
    return lines.join("\n");
}

function getApiErrorMessage(status, data) {
    const apiMessage = String(data?.error?.message || "");
    if (status === 401 || status === 403) return "Key het han";
    if (status === 429 || apiMessage.toLowerCase().includes("quota")) return "Het quota";
    return "Gemini API loi";
}

function getUserErrorMessage(error) {
    const messages = {
        "Thiếu cấu hình API": "Ứng dụng chưa được cấu hình API. Nhóm phát triển cần thiết lập GitHub Secret GEMINI_API_KEY.",
        "Bi chan CORS": "Vui lòng mở trang bằng Live Server hoặc link GitHub Pages, không mở file HTML trực tiếp.",
        "Key het han": "API key đã hết hạn hoặc không hợp lệ. Nhóm cần liên hệ mentor để lấy key mới.",
        "Het quota": "Đã hết lượt gọi AI hôm nay (giới hạn 1000 lượt/ngày). Vui lòng thử lại vào ngày mai.",
        "Het thoi gian cho": "AI phản hồi quá lâu. Vui lòng thử lại sau.",
        "Loi mang": "Không có kết nối mạng. Kiểm tra Wi-Fi rồi thử lại.",
        "Bi loc noi dung": "Không thể phân tích tin này. Hãy thử rút gọn nội dung hoặc hỏi người thân.",
        "Khong co ket qua": "AI không trả về kết quả. Vui lòng thử lại sau."
    };
    return messages[error.message] || "Không thể kết nối tới Gemini. Vui lòng thử lại sau.";
}
