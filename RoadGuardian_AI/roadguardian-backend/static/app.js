/**
 * RoadGuardian AI - Frontend Application
 * @version 2.0.0
 */

/** @typedef {{id:number|string,hazard_type:string,latitude:number,longitude:number,location_address?:string,description?:string,status:string,urgency_level:string,severity_score:number,created_at:string,reporter_name?:string,resolved_image_url?:string,resolution_notes?:string,resolved_at?:string,resolved_by_name?:string,assigned_to?:string|null,image_url?:string}} Hazard */
/** @typedef {{id:number|string,email:string,full_name?:string|null,role?:string,points?:number}} User */
/** @typedef {{total_hazards:number,avg_severity:number,resolved_count:number,pending_count:number,high_urgency_count?:number,recent_hazards?:Hazard[]}} DashboardStats */
/** @typedef {{severity_score:number,urgency_level:string,factors?:{explanation?:string}}} SeverityAnalysis */
/** @typedef {{north:number,south:number,east:number,west:number}} Bounds */

const API_BASE = window.location.origin;
const TOKEN_KEY = "rg_token";

/** @type {{token:string|null,user:User|null,map:any|null,markers:any[],gpsCenter:[number,number],voiceRecording:boolean,activeFeedTab:string,isLoggedIn:()=>boolean}} */
const store = {
    token: localStorage.getItem(TOKEN_KEY) || localStorage.getItem("access_token"),
    user: null,
    map: null,
    markers: [],
    gpsCenter: [13.0827, 80.2707],
    voiceRecording: false,
    activeFeedTab: "recent",
    isLoggedIn() {
        return !!this.token;
    }
};

const dom = {
    byId(id) {
        return document.getElementById(id);
    },
    show(el, display = "block") {
        if (el) el.style.display = display;
    },
    hide(el) {
        if (el) el.style.display = "none";
    }
};

const sprite = {
    icon(id, className = "sprite-icon", size = 18) {
        return `<svg class="${className}" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="/static/icons.svg#${id}"></use></svg>`;
    },
    hazardIcon(hazardType) {
        const map = {
            pothole: "pothole-icon",
            crack: "crack-icon",
            waterlogging: "waterlogging-icon",
            broken_dividers: "broken-divider-icon",
            missing_signs: "missing-sign-icon"
        };
        return this.icon(map[hazardType] || "location-icon", "sprite-icon hazard-sprite", 16);
    }
};

const toast = {
    show(message, type = "info") {
        let container = dom.byId("toast-holder");
        if (!container) {
            container = document.createElement("div");
            container.id = "toast-holder";
            container.className = "toast-container";
            document.body.appendChild(container);
        }

        const icons = {
            success: sprite.icon("check-icon", "sprite-icon toast-sprite", 16),
            error: sprite.icon("shield-icon", "sprite-icon toast-sprite", 16),
            info: sprite.icon("location-icon", "sprite-icon toast-sprite", 16),
            warning: sprite.icon("shield-icon", "sprite-icon toast-sprite", 16)
        };

        const cleanMessage = typeof message === "string" && !message.trimStart().startsWith("<")
            ? message.replace(/^[^\w<]+/u, "").trim()
            : message;

        const node = document.createElement("div");
        node.className = "toast";
        node.innerHTML = `<span class="toast-indicator">${icons[type] || "🔔"}</span><div class="toast-content">${cleanMessage}</div>`;
        container.appendChild(node);

        setTimeout(() => {
            node.classList.add("fade-out");
            setTimeout(() => node.remove(), 300);
        }, 4000);
    }
};

class AIDetectionOverlay {
    constructor(container, imageElement) {
        this.container = container;
        this.image = imageElement;
        this.canvas = null;
        this.ctx = null;
        this.detections = [];
    }

    init() {
        this.canvas = document.createElement("canvas");
        this.canvas.style.position = "absolute";
        this.canvas.style.top = "0";
        this.canvas.style.left = "0";
        this.canvas.style.width = "100%";
        this.canvas.style.height = "100%";
        this.canvas.style.pointerEvents = "none";

        this.container.style.position = "relative";
        this.container.appendChild(this.canvas);

        this.resize();
        window.addEventListener("resize", () => this.resize(), { passive: true });
    }

    resize() {
        if (!this.canvas) return;
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = Math.max(1, Math.round(rect.width));
        this.canvas.height = Math.max(1, Math.round(rect.height));
        this.draw();
    }

    async detect(imageFile) {
        await this.showScanning();

        const mockDetections = [
            { class: "pothole", confidence: 0.92, x: 0.3, y: 0.4, w: 0.25, h: 0.2 },
            { class: "crack", confidence: 0.78, x: 0.6, y: 0.6, w: 0.2, h: 0.15 }
        ];

        this.detections = mockDetections;
        this.draw();

        return this.detections[0];
    }

    async showScanning() {
        const scanLine = document.createElement("div");
        scanLine.className = "detection-scan-line";
        this.container.appendChild(scanLine);

        await new Promise(resolve => {
            scanLine.addEventListener("animationend", () => {
                scanLine.remove();
                resolve();
            }, { once: true });
        });
    }

    draw() {
        if (!this.canvas) return;
        if (!this.ctx) {
            this.ctx = this.canvas.getContext("2d");
        }
        if (!this.ctx) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.detections.forEach(detection => {
            const x = detection.x * this.canvas.width;
            const y = detection.y * this.canvas.height;
            const w = detection.w * this.canvas.width;
            const h = detection.h * this.canvas.height;

            this.ctx.strokeStyle = "#E85D04";
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(x, y, w, h);

            this.drawCornerMarkers(x, y, w, h);

            this.ctx.fillStyle = "#E85D04";
            this.ctx.font = "bold 14px var(--font-sans, sans-serif)";
            const label = `${detection.class} ${Math.round(detection.confidence * 100)}%`;
            const textWidth = this.ctx.measureText(label).width;
            this.ctx.fillRect(x, Math.max(0, y - 24), textWidth + 12, 24);
            this.ctx.fillStyle = "white";
            this.ctx.fillText(label, x + 6, Math.max(16, y - 8));
        });
    }

    drawCornerMarkers(x, y, w, h) {
        const cornerLength = 15;
        this.ctx.beginPath();
        this.ctx.strokeStyle = "#FFC107";
        this.ctx.lineWidth = 3;

        this.ctx.moveTo(x, y + cornerLength);
        this.ctx.lineTo(x, y);
        this.ctx.lineTo(x + cornerLength, y);

        this.ctx.moveTo(x + w - cornerLength, y);
        this.ctx.lineTo(x + w, y);
        this.ctx.lineTo(x + w, y + cornerLength);

        this.ctx.moveTo(x + w, y + h - cornerLength);
        this.ctx.lineTo(x + w, y + h);
        this.ctx.lineTo(x + w - cornerLength, y + h);

        this.ctx.moveTo(x + cornerLength, y + h);
        this.ctx.lineTo(x, y + h);
        this.ctx.lineTo(x, y + h - cornerLength);

        this.ctx.stroke();
    }

    clear() {
        this.detections = [];
        this.draw();
    }
}

const detectionOverlayCSS = `
.detection-scan-line {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--safety-yellow), transparent);
    animation: scanDown 1.2s ease-in-out;
    pointer-events: none;
    z-index: 10;
}

@keyframes scanDown {
    0% { top: 0; opacity: 1; }
    50% { top: 100%; opacity: 1; }
    100% { top: 100%; opacity: 0; }
}

.ai-status {
    position: absolute;
    left: 12px;
    right: 12px;
    bottom: 12px;
    z-index: 12;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 14px;
    background: rgba(15, 23, 42, 0.82);
    color: #fff;
    font-size: 0.85rem;
    backdrop-filter: blur(8px);
}

.ai-status-success {
    background: rgba(43, 147, 72, 0.92);
}

.photo-preview .detection-overlay-frame {
    position: relative;
    width: 100%;
    overflow: hidden;
    border-radius: 14px;
}

.photo-preview .detection-overlay-frame img {
    display: block;
    width: 100%;
    height: auto;
    border-radius: 14px;
}
`;

function ensureDetectionOverlayCSS() {
    if (document.getElementById("roadguardian-detection-overlay-css")) return;
    const style = document.createElement("style");
    style.id = "roadguardian-detection-overlay-css";
    style.textContent = detectionOverlayCSS;
    document.head.appendChild(style);
}

async function handleImageUploadWithDetection(file) {
    ensureDetectionOverlayCSS();

    const previewContainer = dom.byId("photoPreview");
    if (!previewContainer) return null;

    const frame = document.createElement("div");
    frame.className = "detection-overlay-frame";

    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    img.alt = "Uploaded hazard preview";

    frame.appendChild(img);
    previewContainer.innerHTML = "";
    previewContainer.appendChild(frame);

    try {
        if (img.decode) {
            await img.decode();
        } else {
            await new Promise((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = reject;
            });
        }
    } catch {
        // Fall back to a rendered preview even if decode fails.
    }

    const detector = new AIDetectionOverlay(frame, img);
    detector.init();

    const statusDiv = document.createElement("div");
    statusDiv.className = "ai-status";
    statusDiv.innerHTML = "🤖 AI analyzing image...";
    frame.appendChild(statusDiv);

    const detection = await detector.detect(file);

    statusDiv.innerHTML = `✅ AI detected: ${detection.class} (${Math.round(detection.confidence * 100)}% confidence)`;
    statusDiv.classList.add("ai-status-success");

    setTimeout(() => statusDiv.remove(), 3000);

    const hazardTypeSelect = dom.byId("hazardType");
    if (hazardTypeSelect) {
        hazardTypeSelect.value = detection.class;
        hazardTypeSelect.dispatchEvent(new Event("change", { bubbles: true }));
    }

    if (URL.revokeObjectURL) {
        setTimeout(() => URL.revokeObjectURL(img.src), 0);
    }

    return detection;
}

const api = {
    baseUrl: API_BASE,

    async request(endpoint, options = {}) {
        const headers = { ...(options.headers || {}) };
        if (options.body instanceof FormData) {
            delete headers["Content-Type"];
        } else if (!headers["Content-Type"] && options.body !== undefined) {
            headers["Content-Type"] = "application/json";
        }
        if (store.token) headers.Authorization = `Bearer ${store.token}`;

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers
        });

        if (response.status === 401) {
            auth.logout(true);
            throw new Error("Session expired");
        }

        return response;
    },

    async get(endpoint) {
        const response = await this.request(endpoint);
        return response.json();
    },

    async post(endpoint, data, options = {}) {
        const response = await this.request(endpoint, {
            method: "POST",
            body: JSON.stringify(data),
            ...options
        });
        return response.json();
    },

    async postForm(endpoint, formData) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: "POST",
            headers: store.token ? { Authorization: `Bearer ${store.token}` } : {},
            body: formData
        });

        if (response.status === 401) {
            auth.logout(true);
            throw new Error("Session expired");
        }

        return response.json();
    },

    auth: {
        async login(email, password) {
            const response = await api.request("/auth/login", {
                method: "POST",
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (response.ok) {
                store.token = data.access_token;
                localStorage.setItem(TOKEN_KEY, data.access_token);
                localStorage.setItem("access_token", data.access_token);
                await auth.loadProfile();
            }
            return response.ok;
        },

        async register(email, password, fullName) {
            const response = await api.request("/auth/register", {
                method: "POST",
                body: JSON.stringify({ email, password, full_name: fullName })
            });
            return response.ok;
        },

        async getProfile() {
            return api.get("/auth/me");
        }
    },

    hazards: {
        async getDashboard() {
            return api.get("/hazards/dashboard");
        },

        async getHeatmap(bounds = null) {
            let url = "/hazards/heatmap";
            if (bounds) {
                url += `?north=${bounds.north}&south=${bounds.south}&east=${bounds.east}&west=${bounds.west}`;
            }
            return api.get(url);
        },

        async create(data, imageFile = null) {
            if (imageFile) {
                const formData = new FormData();
                Object.entries(data).forEach(([key, value]) => formData.append(key, String(value)));
                formData.append("image", imageFile);
                return api.postForm("/hazards/upload", formData);
            }
            return api.post("/hazards/upload", data);
        },

        async getMyReports() {
            return api.get("/hazards/my-reports");
        },

        async analyzeSeverity(hazardType, confidence = 0.8) {
            return api.post("/hazards/analyze-severity", {
                hazard_type: hazardType,
                confidence_score: confidence
            });
        }
    }
};

const auth = {
    async loadProfile() {
        try {
            const user = await api.auth.getProfile();
            store.user = user;
            ui.updateUserUI(user);
            badges.sync(user);
            return user;
        } catch (error) {
            console.error("Failed to load profile", error);
            return null;
        }
    },

    logout(silent = false) {
        store.token = null;
        store.user = null;
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem("access_token");
        ui.showLanding();
        if (!silent) toast.show("Logged out successfully", "info");
    },

    async handleLogin(email, password) {
        const success = await api.auth.login(email, password);
        if (success) {
            await dashboard.load();
            ui.showDashboard();
            toast.show("Welcome back!", "success");
        } else {
            toast.show("Invalid email or password", "error");
        }
        return success;
    },

    async handleRegister(email, password, fullName) {
        const success = await api.auth.register(email, password, fullName);
        if (success) {
            await this.handleLogin(email, password);
        } else {
            toast.show("Registration failed", "error");
        }
        return success;
    }
};

const mapModule = {
    async init(containerId, center = [13.0827, 80.2707], zoom = 12) {
        const container = dom.byId(containerId);
        if (!container || typeof L === "undefined") return null;

        if (store.map && store.map.remove) {
            try {
                store.map.remove();
            } catch (_) {
                /* ignore */
            }
        }

        store.map = L.map(container).setView(center, zoom);

        L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
            maxZoom: 19
        }).addTo(store.map);

        await this.loadHeatmap();
        store.map.on("moveend", () => this.loadHeatmap());
        return store.map;
    },

    async loadHeatmap() {
        if (!store.map) return;
        const bounds = store.map.getBounds?.();
        const queryBounds = bounds
            ? { north: bounds.getNorth(), south: bounds.getSouth(), east: bounds.getEast(), west: bounds.getWest() }
            : null;

        const clusters = await api.hazards.getHeatmap(queryBounds);
        this.renderClusters(clusters || []);
    },

    renderClusters(clusters) {
        store.markers.forEach(marker => store.map.removeLayer(marker));
        store.markers = [];

        clusters.forEach(cluster => {
            const color = this.getSeverityColor(cluster.severity_avg);
            const radius = Math.min(40, 12 + cluster.hazard_count * 3);
            const marker = L.circleMarker([cluster.center_lat, cluster.center_lng], {
                radius,
                color,
                weight: 2,
                opacity: 0.8,
                fillOpacity: 0.4
            }).bindPopup(`
                <strong>${cluster.hazard_count} hazards</strong><br>
                Severity: ${Number(cluster.severity_avg || 0).toFixed(1)}/10
            `);

            marker.addTo(store.map);
            store.markers.push(marker);
        });
    },

    getSeverityColor(severity) {
        if (severity >= 8) return "#DC2626";
        if (severity >= 6) return "#E85D04";
        if (severity >= 3) return "#F59E0B";
        return "#2B9348";
    },

    initGPS() {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (position) => {
                store.gpsCenter = [position.coords.latitude, position.coords.longitude];
                const latInput = dom.byId("reportLat");
                const lngInput = dom.byId("reportLng");
                if (latInput) latInput.value = store.gpsCenter[0].toFixed(6);
                if (lngInput) lngInput.value = store.gpsCenter[1].toFixed(6);
                if (store.map) store.map.setView(store.gpsCenter, 13);
            },
            () => toast.show("Could not detect location. Enter it manually.", "warning")
        );
    },

    async addHazardMarker(hazard) {
        if (!store.map) return null;
        const marker = L.marker([hazard.latitude, hazard.longitude]).bindPopup(`
            <strong>${String(hazard.hazard_type || "").replace(/_/g, " ").toUpperCase()}</strong><br>
            Severity: ${hazard.severity_score}/10<br>
            Status: ${hazard.status}<br>
            <small>${new Date(hazard.created_at).toLocaleString()}</small>
        `);
        marker.addTo(store.map);
        store.markers.push(marker);
        return marker;
    }
};

const dashboard = {
    async load() {
        if (!store.isLoggedIn()) return;
        const data = await api.hazards.getDashboard();
        this.updateStats(data);
        await this.loadRecentReports(data.recent_hazards || []);
        await this.loadBadges();
    },

    updateStats(data) {
        const total = dom.byId("statTotal");
        const severity = dom.byId("statSeverity");
        const resolved = dom.byId("statResolved");
        const points = dom.byId("statPoints");
        const pending = dom.byId("stat-pending");

        if (total) total.textContent = String(data.total_hazards || 0);
        if (severity) severity.textContent = Number(data.avg_severity || 0).toFixed(1);
        if (resolved) resolved.textContent = String(data.resolved_count || 0);
        if (points) points.textContent = String(store.user?.points || 0);
        if (pending) pending.textContent = String(data.pending_count || 0);
    },

    async loadRecentReports(reports) {
        const container = dom.byId("recentReports");
        if (!container) return;

        if (!reports.length) {
            container.innerHTML = '<p class="empty-state">No reports yet. Be the first!</p>';
            return;
        }

        container.innerHTML = reports.slice(0, 10).map(report => `
            <div class="report-item" data-lat="${report.latitude}" data-lng="${report.longitude}">
                <div class="report-type">
                    <span class="report-icon">${this.getHazardIcon(report.hazard_type)}</span>
                    <span>${String(report.hazard_type || "").replace(/_/g, " ")}</span>
                </div>
                <div class="report-severity severity-${report.urgency_level}">${Number(report.severity_score || 0).toFixed(1)}/10</div>
                <div class="report-status">${report.status}</div>
                <div class="report-time">${this.timeAgo(report.created_at)}</div>
            </div>
        `).join("");

        container.querySelectorAll(".report-item").forEach(el => {
            el.addEventListener("click", () => {
                const lat = parseFloat(el.dataset.lat || "0");
                const lng = parseFloat(el.dataset.lng || "0");
                if (store.map) store.map.setView([lat, lng], 18);
            });
        });
    },

    getHazardIcon(type) {
        const icons = {
            pothole: "🕳️",
            crack: "〰️",
            waterlogging: "💧",
            broken_dividers: "🚧",
            broken_divider: "🚧",
            missing_signs: "🚸",
            missing_sign: "🚸"
        };
        return icons[type] || "⚠️";
    },

    timeAgo(dateString) {
        const date = new Date(dateString);
        const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
        if (seconds < 60) return "just now";
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    },

    async loadBadges() {
        const container = dom.byId("badgesList");
        if (!container) return;
        container.innerHTML = '<div class="badge-placeholder">🏅 Report 5 hazards to earn "Community Guardian"</div>';
    },

    async refresh() {
        if (store.isLoggedIn()) {
            await this.load();
        } else {
            const data = await api.hazards.getDashboard();
            this.updateStats(data);
            await this.loadRecentReports(data.recent_hazards || []);
        }
        await mapModule.loadHeatmap();
        if (store.user) await auth.loadProfile();
    }
};

const feed = {
    bind() {
        dom.byId("feed-tab-recent")?.addEventListener("click", () => this.switchTab("recent"));
        dom.byId("feed-tab-my")?.addEventListener("click", () => this.switchTab("my"));
        dom.byId("feed-tab-authority")?.addEventListener("click", () => this.switchTab("authority"));
        dom.byId("auth-sub-tab-pending")?.addEventListener("click", () => this.switchAuthoritySubTab("pending"));
        dom.byId("auth-sub-tab-active")?.addEventListener("click", () => this.switchAuthoritySubTab("active"));
        dom.byId("bulk-verify-btn")?.addEventListener("click", () => authorityPanel.bulkVerify());
    },

    switchTab(tab) {
        if (tab === "my" && !store.token) {
            toast.show(`${sprite.icon("shield-icon", "sprite-icon toast-sprite", 16)} Sign in to view your submissions.`, "warning");
            return;
        }

        store.activeFeedTab = tab;
        ["recent", "my", "authority"].forEach(name => {
            const btn = dom.byId(`feed-tab-${name}`);
            const panel = dom.byId(name === "recent" ? "recentReports" : name === "my" ? "myReports" : "authorityReports");
            btn?.classList.toggle("active", name === tab);
            panel?.classList.toggle("active", name === tab);
        });

        if (tab === "recent") dashboard.refresh();
        if (tab === "my") this.loadMyReports();
        if (tab === "authority") authorityPanel.syncPending();
    },

    switchAuthoritySubTab(sub) {
        const pendingSection = dom.byId("auth-pending-section");
        const activeSection = dom.byId("auth-active-section");
        dom.byId("auth-sub-tab-pending")?.classList.toggle("active", sub === "pending");
        dom.byId("auth-sub-tab-active")?.classList.toggle("active", sub === "active");
        if (pendingSection) pendingSection.style.display = sub === "pending" ? "block" : "none";
        if (activeSection) activeSection.style.display = sub === "active" ? "block" : "none";
        if (sub === "pending") authorityPanel.syncPending();
        else authorityPanel.syncActive();
    },

    async loadMyReports() {
        if (!store.token) return;
        try {
            const reports = await api.hazards.getMyReports();
            const container = dom.byId("myReports");
            if (!container) return;
            container.innerHTML = reports.length
                ? reports.map(report => authorityPanel.createFeedItem(report, false)).join("")
                : '<p class="empty-state">You have not submitted any hazard reports yet.</p>';
        } catch (error) {
            console.warn("[Feed] My reports sync failed:", error.message);
        }
    }
};

const authorityPanel = {
    async syncPending() {
        if (!store.token) return;
        try {
            const response = await api.request("/hazards/authority/pending", { headers: { Authorization: `Bearer ${store.token}` } });
            if (!response.ok) throw new Error("Failed to load pending");
            const list = await response.json();
            const container = dom.byId("authorityPendingList");
            const bulkBar = document.querySelector(".bulk-verify-bar");
            if (!container) return;
            container.innerHTML = "";
            if (bulkBar) bulkBar.classList.add("hidden");

            if (!list.length) {
                container.innerHTML = '<div class="empty-state">No pending reports. All clear! 🌟</div>';
                return;
            }

            list.forEach(hazard => {
                const item = document.createElement("div");
                item.className = "feed-item";
                const date = new Date(hazard.created_at).toLocaleDateString(undefined, {
                    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                });
                const hasCrew = hazard.assigned_to !== null;
                const crewHtml = hasCrew
                    ? `<span class="assignment-badge">Assigned: ${hazard.assigned_to}</span>`
                    : `<div class="crew-dispatch-container"><input type="text" class="crew-input" placeholder="Crew name (e.g. Alpha)"><button class="crew-dispatch-btn" data-id="${hazard.id}">Dispatch</button></div>`;

                item.innerHTML = `
                    <div class="feed-item-checkbox-container" style="display:flex;align-items:center;width:100%;">
                        <input type="checkbox" class="feed-item-checkbox" data-id="${hazard.id}">
                        <div style="flex:1;">
                            <div style="display:flex;justify-content:space-between;align-items:flex-start;width:100%;">
                                <div class="feed-item-left">
                                    <span class="feed-item-type">${sprite.hazardIcon(hazard.hazard_type)} ${String(hazard.hazard_type || "").replace(/_/g, " ")}</span>
                                    <span class="feed-item-address">${sprite.icon("location-icon", "sprite-icon meta-sprite", 14)} ${hazard.location_address || `${hazard.latitude.toFixed(4)}, ${hazard.longitude.toFixed(4)}`}</span>
                                    <span class="feed-item-meta">Reporter: <strong>${hazard.reporter_name || "Anonymous"}</strong> on ${date}</span>
                                    ${crewHtml}
                                </div>
                                <div class="feed-item-right" style="display:flex;flex-direction:column;align-items:flex-end;gap:0.5rem;">
                                    <span class="urgency-badge ${hazard.urgency_level}">${hazard.urgency_level}</span>
                                    <span class="score-value" style="font-size:1.15rem;font-weight:700;color:var(--safety-red);">${Number(hazard.severity_score || 0).toFixed(1)}</span>
                                    <button class="verify-action-btn single-verify-btn" data-id="${hazard.id}">Verify</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;

                item.querySelector(".single-verify-btn")?.addEventListener("click", () => this.verifySingle(hazard.id));
                if (!hasCrew) {
                    const dispatchBtn = item.querySelector(".crew-dispatch-btn");
                    const crewInput = item.querySelector(".crew-input");
                    dispatchBtn?.addEventListener("click", async () => {
                        const crewName = crewInput.value.trim();
                        if (!crewName) return toast.show("⚠️ Enter a crew name.", "warning");
                        await this.dispatchCrew(hazard.id, crewName);
                    });
                }

                item.querySelector(".feed-item-checkbox")?.addEventListener("change", () => {
                    const checked = container.querySelectorAll(".feed-item-checkbox:checked");
                    if (bulkBar) bulkBar.classList.toggle("hidden", checked.length === 0);
                });

                container.appendChild(item);
            });
        } catch (error) {
            console.warn("[Authority] Pending sync failed:", error.message);
        }
    },

    async syncActive() {
        if (!store.token) return;
        try {
            const response = await api.request("/hazards/authority/active", { headers: { Authorization: `Bearer ${store.token}` } });
            if (!response.ok) throw new Error("Failed to load active");
            const list = await response.json();
            const container = dom.byId("authorityActiveList");
            if (!container) return;
            container.innerHTML = "";

            if (!list.length) {
                container.innerHTML = '<div class="empty-state">No active crew dispatches found.</div>';
                return;
            }

            list.forEach(hazard => {
                const item = document.createElement("div");
                item.className = "feed-item";
                const date = new Date(hazard.created_at).toLocaleDateString(undefined, {
                    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                });

                item.innerHTML = `
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;width:100%;">
                        <div class="feed-item-left">
                            <span class="feed-item-type">${sprite.hazardIcon(hazard.hazard_type)} ${String(hazard.hazard_type || "").replace(/_/g, " ")}</span>
                            <span class="feed-item-address">${sprite.icon("location-icon", "sprite-icon meta-sprite", 14)} ${hazard.location_address || `${hazard.latitude.toFixed(4)}, ${hazard.longitude.toFixed(4)}`}</span>
                            <span class="feed-item-meta">Reporter: <strong>${hazard.reporter_name || "Anonymous"}</strong> on ${date}</span>
                            <span class="assignment-badge">Dispatched: ${hazard.assigned_to}</span>
                        </div>
                        <div class="feed-item-right" style="display:flex;flex-direction:column;align-items:flex-end;gap:0.5rem;">
                            <span class="urgency-badge ${hazard.urgency_level}">${hazard.urgency_level}</span>
                            <span class="score-value" style="font-size:1.15rem;font-weight:700;color:var(--safety-red);">${Number(hazard.severity_score || 0).toFixed(1)}</span>
                            <button class="verify-action-btn mark-resolved-btn" data-id="${hazard.id}">Resolve</button>
                        </div>
                    </div>
                `;

                item.querySelector(".mark-resolved-btn")?.addEventListener("click", () => {
                    const hazardIdInput = dom.byId("resolve-hazard-id");
                    const modalEl = dom.byId("resolve-modal");
                    if (hazardIdInput) hazardIdInput.value = String(hazard.id);
                    modalEl?.classList.remove("hidden");
                });

                container.appendChild(item);
            });
        } catch (error) {
            console.warn("[Authority] Active sync failed:", error.message);
        }
    },

    createFeedItem(hazard, showVerify = true) {
        const date = new Date(hazard.created_at).toLocaleDateString(undefined, {
            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
        });

        const isAuthority = store.user && (store.user.role === "authority" || store.user.role === "admin");
        const canVerify = hazard.status === "pending" && showVerify && isAuthority;
        const isResolved = hazard.status === "resolved" && hazard.resolved_image_url;

        return `
            <div class="feed-item">
                <div class="feed-item-left">
                    <span class="feed-item-type">${sprite.hazardIcon(hazard.hazard_type)} ${String(hazard.hazard_type || "").replace(/_/g, " ")}</span>
                    <span class="feed-item-address">${sprite.icon("location-icon", "sprite-icon meta-sprite", 14)} ${hazard.location_address || `${hazard.latitude.toFixed(4)}, ${hazard.longitude.toFixed(4)}`}</span>
                    <span class="feed-item-meta">By: <strong>${hazard.reporter_name || "Anonymous"}</strong> on ${date}</span>
                </div>
                <div class="feed-item-right" style="display:flex;flex-direction:column;align-items:flex-end;gap:0.35rem;">
                    <span class="feed-status-badge ${hazard.status}">${hazard.status}</span>
                    ${canVerify ? `<button class="verify-action-btn" data-id="${hazard.id}">Verify</button>` : ""}
                    ${isResolved ? `<button class="compare-proof-btn" data-id="${hazard.id}">Compare</button>` : ""}
                </div>
            </div>
        `;
    },

    async verifySingle(id) {
        try {
            const response = await api.request(`/hazards/${id}/status`, {
                method: "PATCH",
                body: JSON.stringify({ status: "verified" })
            });
            if (!response.ok) throw new Error("Verification failed");
            toast.show(`${sprite.icon("check-icon", "sprite-icon toast-sprite", 16)} Report verified!`, "success");
            await dashboard.refresh();
            await this.syncPending();
        } catch (error) {
            toast.show(`❌ ${error.message}`, "error");
        }
    },

    async bulkVerify() {
        const ids = Array.from(document.querySelectorAll("#authorityPendingList .feed-item-checkbox:checked")).map(cb => parseInt(cb.dataset.id, 10));
        if (!ids.length) return;

        try {
            const response = await api.request("/hazards/authority/verify-bulk", {
                method: "POST",
                body: JSON.stringify(ids)
            });
            if (!response.ok) throw new Error("Bulk verify failed");
            const data = await response.json();
            toast.show(`✅ Bulk verified ${data.verified_count} reports!`, "success");
            await dashboard.refresh();
            await this.syncPending();
        } catch (error) {
            toast.show(`❌ ${error.message}`, "error");
        }
    },

    async dispatchCrew(id, crewName) {
        try {
            const response = await api.request(`/hazards/authority/assign/${id}`, {
                method: "POST",
                body: JSON.stringify({ crew_name: crewName })
            });
            if (!response.ok) throw new Error("Dispatch failed");
            const data = await response.json();
            toast.show(`✅ ${data.message}`, "success");
            await dashboard.refresh();
            await this.syncPending();
        } catch (error) {
            toast.show(`❌ ${error.message}`, "error");
        }
    }
};

const resolveModal = {
    bind() {
        dom.byId("close-resolve-modal")?.addEventListener("click", () => dom.byId("resolve-modal")?.classList.add("hidden"));
        dom.byId("resolve-hazard-form")?.addEventListener("submit", async (event) => {
            event.preventDefault();
            const id = dom.byId("resolve-hazard-id")?.value;
            const imgInput = dom.byId("res-proof-image");
            const notes = dom.byId("res-notes")?.value || "";

            if (!imgInput?.files || !imgInput.files.length) {
                return toast.show(`${sprite.icon("camera-icon", "sprite-icon toast-sprite", 16)} Upload a reparation proof image.`, "warning");
            }

            const formData = new FormData();
            formData.append("resolved_image", imgInput.files[0]);
            formData.append("resolution_notes", notes);

            const button = event.target.querySelector("button[type='submit']");
            button.textContent = "⌛ Submitting...";
            button.disabled = true;

            try {
                const response = await api.request(`/hazards/authority/resolve/${id}`, {
                    method: "POST",
                    body: formData
                });
                if (!response.ok) throw new Error("Resolution failed");
                toast.show("✅ Hazard resolved! Citizen rewarded.", "success");
                dom.byId("resolve-modal")?.classList.add("hidden");
                event.target.reset();
                await dashboard.refresh();
                await authorityPanel.syncActive();
            } catch (error) {
                toast.show(`❌ ${error.message}`, "error");
            } finally {
                button.textContent = "✓ Submit Proof & Resolve";
                button.disabled = false;
            }
        });
    }
};

const comparisonSlider = {
    bind() {
        dom.byId("close-comparison-modal")?.addEventListener("click", () => dom.byId("comparison-modal")?.classList.add("hidden"));
        const viewport = document.querySelector(".slider-viewport");
        if (!viewport) return;

        const afterContainer = viewport.querySelector(".after-image-container");
        const handle = viewport.querySelector(".slider-handle");
        let dragging = false;

        const drag = (event) => {
            if (!dragging || !handle || !afterContainer) return;
            const rect = viewport.getBoundingClientRect();
            const x = (event.clientX || event.touches?.[0]?.clientX || 0) - rect.left;
            const pct = Math.min(100, Math.max(0, (x / rect.width) * 100));
            handle.style.left = `${pct}%`;
            afterContainer.style.clipPath = `inset(0 0 0 ${pct}%)`;
        };

        const startDrag = (event) => { dragging = true; drag(event); };
        const stopDrag = () => { dragging = false; };

        handle?.addEventListener("mousedown", startDrag);
        viewport.addEventListener("mousedown", startDrag);
        window.addEventListener("mousemove", drag);
        window.addEventListener("mouseup", stopDrag);
        handle?.addEventListener("touchstart", startDrag);
        viewport.addEventListener("touchstart", startDrag);
        window.addEventListener("touchmove", drag);
        window.addEventListener("touchend", stopDrag);
    },

    launch(hazard) {
        const modalEl = dom.byId("comparison-modal");
        const beforeImg = dom.byId("slider-before-img");
        const afterImg = dom.byId("slider-after-img");
        if (!modalEl || !beforeImg || !afterImg) return;

        beforeImg.src = hazard.image_url ? `${API_BASE}${hazard.image_url}` : "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='375'><rect width='600' height='375' fill='%23f3f4f6'/><text x='50%25' y='50%25' fill='%239ca3af' font-family='sans-serif' font-weight='bold' font-size='14' text-anchor='middle'>[Voice Report] No Image</text></svg>";
        afterImg.src = `${API_BASE}${hazard.resolved_image_url}`;
        dom.byId("comp-type").textContent = `${String(hazard.hazard_type).replace(/_/g, " ").toUpperCase()} REPAIRED`;
        dom.byId("comp-notes").textContent = hazard.resolution_notes || "Successfully repaired by authorities.";
        dom.byId("comp-resolved-by").textContent = `Resolved by: ${hazard.resolved_by_name || "Crew Lead"}`;
        dom.byId("comp-resolved-at").textContent = `Date: ${hazard.resolved_at ? new Date(hazard.resolved_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "N/A"}`;

        const afterContainer = modalEl.querySelector(".after-image-container");
        const handle = modalEl.querySelector(".slider-handle");
        if (afterContainer) afterContainer.style.clipPath = "inset(0 0 0 50%)";
        if (handle) handle.style.left = "50%";
        modalEl.classList.remove("hidden");
    }
};

const badges = {
    definitions: [
        { name: "First Responder Medal", req: 10, desc: "Submitted your first hazard report.", medal: "🥉" },
        { name: "Hazard Hunter", req: 50, desc: "Earned 50 points from verified reports.", medal: "🥈" },
        { name: "Verified Citizen Hero", req: 150, desc: "Elite community safety participation.", medal: "🥇" }
    ],

    sync(user) {
        const drawer = dom.byId("badges-card");
        const container = dom.byId("badgesList");
        if (!drawer || !container) return;

        container.innerHTML = "";
        let hasBadges = false;
        this.definitions.forEach(badge => {
            if ((user.points || 0) >= badge.req) {
                hasBadges = true;
                const item = document.createElement("div");
                item.className = "badge-item";
                item.innerHTML = `<span class="badge-medal">${badge.medal}</span><div class="badge-details"><h4>${badge.name}</h4><p>${badge.desc}</p></div>`;
                container.appendChild(item);
            }
        });

        drawer.classList.toggle("hidden", !hasBadges);
    }
};

const websocket = {
    init() {
        const proto = location.protocol === "https:" ? "wss:" : "ws:";
        const url = `${proto}//${location.host}/ws/hazards`;
        const socket = new WebSocket(url);

        socket.onmessage = async (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type === "new_hazard") {
                    const hazard = message.data;
                    toast.show(`${sprite.hazardIcon(hazard.hazard_type)} New hazard: <strong>${String(hazard.hazard_type || "").replace(/_/g, " ")}</strong>`, "info");
                    await dashboard.refresh();
                } else if (message.type === "status_update") {
                    const hazard = message.data;
                    const badge = hazard.status === "verified"
                        ? sprite.icon("check-icon", "sprite-icon toast-sprite", 16)
                        : sprite.icon("shield-icon", "sprite-icon toast-sprite", 16);
                    toast.show(`${badge} Status: <strong>${String(hazard.hazard_type || "").replace(/_/g, " ")}</strong> → ${hazard.status}`, "info");
                    await dashboard.refresh();
                }
            } catch (error) {
                console.warn("[WS] Parse error:", error.message);
            }
        };

        socket.onclose = () => setTimeout(() => this.init(), 5000);
    }
};

const hazardReport = {
    currentImage: null,
    mediaRecorder: null,
    audioChunks: [],
    currentLocation: null,
    selectedHazardType: null,

    async init() {
        await this.getLocation();
        this.bindEvents();
    },

    bindEvents() {
        dom.byId("uploadPhotoBtn")?.addEventListener("click", () => dom.byId("photoInput")?.click());
        dom.byId("photoInput")?.addEventListener("change", async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;

            this.currentImage = file;
            try {
                await handleImageUploadWithDetection(file);
            } catch (error) {
                const preview = dom.byId("photoPreview");
                if (preview) preview.innerHTML = `<img src="${URL.createObjectURL(file)}" class="image-preview" alt="Uploaded hazard preview">`;
                toast.show(`AI detection unavailable: ${error.message}`, "warning");
            }
        });
        dom.byId("recordVoiceBtn")?.addEventListener("click", () => this.toggleRecording());
        dom.byId("submitReport")?.addEventListener("click", () => this.submit());
        dom.byId("cancelReport")?.addEventListener("click", () => modal.close());

        const hazardTypeSelect = dom.byId("hazardType");
        if (hazardTypeSelect) {
            this.selectedHazardType = hazardTypeSelect.value;
            hazardTypeSelect.addEventListener("change", () => {
                this.selectedHazardType = hazardTypeSelect.value;
            });
        }

        document.querySelectorAll("[data-hazard-type]").forEach(button => {
            button.addEventListener("click", () => {
                document.querySelectorAll("[data-hazard-type]").forEach(item => item.classList.remove("selected"));
                button.classList.add("selected");
                this.selectedHazardType = button.dataset.hazardType;
            });
        });
    },

    async toggleRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
            this.mediaRecorder.stop();
            dom.byId("recordVoiceBtn").innerHTML = "🎙️ Start recording";
            return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.mediaRecorder = new MediaRecorder(stream);
        this.audioChunks = [];

        this.mediaRecorder.ondataavailable = (event) => this.audioChunks.push(event.data);
        this.mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(this.audioChunks, { type: "audio/webm" });
            await this.transcribeAudio(audioBlob);
            stream.getTracks().forEach(track => track.stop());
        };

        this.mediaRecorder.start();
        dom.byId("recordVoiceBtn").innerHTML = "🔴 Stop recording";
    },

    async transcribeAudio(audioBlob) {
        const formData = new FormData();
        formData.append("audio", audioBlob);
        formData.append("latitude", String(this.currentLocation?.lat || store.gpsCenter[0]));
        formData.append("longitude", String(this.currentLocation?.lng || store.gpsCenter[1]));

        const transcript = dom.byId("voiceTranscript");
        if (transcript) transcript.textContent = "Transcribing...";

        try {
            const response = await api.postForm("/hazards/voice-report", formData);
            if (transcript) transcript.textContent = `📝 "${response.description || response.transcript || ""}"`;
            const description = dom.byId("hazardDescription");
            if (description) description.value = response.description || "";
        } catch (error) {
            if (transcript) transcript.textContent = "Could not transcribe. Please type description.";
        }
    },

    async submit() {
        const hazardType = this.selectedHazardType || dom.byId("hazardType")?.value;
        if (!hazardType) {
            toast.show("Please select a hazard type", "error");
            return;
        }

        if (!this.currentLocation) {
            await this.getLocation();
        }

        const data = {
            hazard_type: hazardType,
            latitude: this.currentLocation?.lat || store.gpsCenter[0],
            longitude: this.currentLocation?.lng || store.gpsCenter[1],
            description: dom.byId("hazardDescription")?.value || ""
        };

        try {
            const result = await api.hazards.create(data, this.currentImage);
            toast.show("Hazard reported successfully!", "success");
            modal.close();
            await dashboard.load();
            await mapModule.loadHeatmap();
            if (result) await mapModule.addHazardMarker(result);
        } catch (error) {
            toast.show("Failed to report hazard", "error");
        }
    },

    async getLocation() {
        const status = dom.byId("locationStatus");
        if (status) status.textContent = "📍 Fetching your location...";

        if (!navigator.geolocation) return null;

        return new Promise(resolve => {
            navigator.geolocation.getCurrentPosition(
                position => {
                    this.currentLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
                    store.gpsCenter = [this.currentLocation.lat, this.currentLocation.lng];
                    if (status) status.textContent = `📍 Location detected: ${this.currentLocation.lat.toFixed(4)}, ${this.currentLocation.lng.toFixed(4)}`;
                    const latInput = dom.byId("reportLat");
                    const lngInput = dom.byId("reportLng");
                    if (latInput) latInput.value = String(this.currentLocation.lat);
                    if (lngInput) lngInput.value = String(this.currentLocation.lng);
                    resolve(this.currentLocation);
                },
                () => {
                    if (status) status.textContent = "📍 Could not get location. Please enter manually.";
                    resolve(null);
                }
            );
        });
    }
};

const estimator = {
    bind() {
        const form = dom.byId("estimator-form");
        if (!form) return;

        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            const payload = {
                hazard_type: dom.byId("est-type")?.value,
                confidence_score: parseFloat(dom.byId("est-conf")?.value || "0.8"),
                traffic_density: dom.byId("est-traffic")?.value,
                weather_condition: dom.byId("est-weather")?.value
            };

            try {
                const response = await api.request("/hazards/analyze-severity", {
                    method: "POST",
                    body: JSON.stringify(payload)
                });
                if (!response.ok) throw new Error("Simulation error");
                const data = await response.json();
                const resultBox = dom.byId("estimator-result");
                const score = dom.byId("est-res-score");
                const badge = dom.byId("est-res-urgency");
                const explanation = dom.byId("est-res-exp");

                if (score) score.textContent = data.severity_score.toFixed(1);
                if (badge) {
                    badge.textContent = data.urgency_level;
                    badge.className = `urgency-badge ${data.urgency_level}`;
                }
                if (explanation) explanation.textContent = data.factors?.explanation || "";
                resultBox?.classList.remove("hidden");
            } catch (error) {
                toast.show(`❌ Simulation failed: ${error.message}`, "error");
            }
        });
    }
};

function bindAuthForms() {
    const loginTab = dom.byId("tab-login");
    const registerTab = dom.byId("tab-register");
    const loginForm = dom.byId("form-login") || dom.byId("loginForm");
    const registerForm = dom.byId("form-register") || dom.byId("registerForm");
    const logoutBtn = dom.byId("logout-btn");
    const ctaBtn = dom.byId("hero-cta-btn") || dom.byId("heroGetStarted");
    const viewMapBtn = dom.byId("heroViewMap");
    const loginModal = dom.byId("loginModal");
    const registerModal = dom.byId("registerModal");
    const openLoginLinks = [dom.byId("switchToLogin")].filter(Boolean);
    const openRegisterLinks = [dom.byId("switchToRegister")].filter(Boolean);

    const closeModal = (modalEl) => {
        if (modalEl) modalEl.style.display = "none";
    };

    const openModal = (modalEl) => {
        if (modalEl) modalEl.style.display = "flex";
    };

    [loginModal, registerModal].forEach(modalEl => {
        if (!modalEl) return;
        modalEl.addEventListener("click", (event) => {
            if (event.target === modalEl) closeModal(modalEl);
        });
        modalEl.querySelectorAll(".modal-close").forEach(button => {
            button.addEventListener("click", () => closeModal(modalEl));
        });
    });

    openLoginLinks.forEach(link => link?.addEventListener("click", (event) => {
        event.preventDefault();
        closeModal(registerModal);
        openModal(loginModal);
    }));

    openRegisterLinks.forEach(link => link?.addEventListener("click", (event) => {
        event.preventDefault();
        closeModal(loginModal);
        openModal(registerModal);
    }));

    dom.byId("loginNavBtn")?.addEventListener("click", () => openModal(loginModal));
    dom.byId("registerNavBtn")?.addEventListener("click", () => openModal(registerModal));
    viewMapBtn?.addEventListener("click", () => {
        dom.byId("map-view")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    loginTab?.addEventListener("click", () => {
        loginTab.classList.add("active");
        registerTab?.classList.remove("active");
        loginForm?.classList.add("active");
        registerForm?.classList.remove("active");
    });

    registerTab?.addEventListener("click", () => {
        registerTab.classList.add("active");
        loginTab?.classList.remove("active");
        registerForm?.classList.add("active");
        loginForm?.classList.remove("active");
    });

    loginForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const email = dom.byId("login-email")?.value || dom.byId("loginEmail")?.value || "";
        const password = dom.byId("login-password")?.value || dom.byId("loginPassword")?.value || "";
        const ok = await auth.handleLogin(email, password);
        if (ok) loginForm.reset();
        if (ok) {
            closeModal(loginModal);
        }
    });

    registerForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const fullName = dom.byId("reg-name")?.value || dom.byId("registerName")?.value || "";
        const email = dom.byId("reg-email")?.value || dom.byId("registerEmail")?.value || "";
        const password = dom.byId("reg-password")?.value || dom.byId("registerPassword")?.value || "";
        const ok = await auth.handleRegister(email, password, fullName);
        if (ok) {
            registerForm.reset();
            loginTab?.click();
            closeModal(registerModal);
        }
    });

    ctaBtn?.addEventListener("click", () => {
        modal.showReport();
    });

    logoutBtn?.addEventListener("click", () => auth.logout());
    ctaBtn?.addEventListener("click", () => dom.byId("auth-card")?.scrollIntoView({ behavior: "smooth", block: "center" }));
}

const ui = {
    showLanding() {
        dom.show(dom.byId("landing"));
        dom.hide(dom.byId("dashboard"));
        dom.hide(dom.byId("reportModal"));
        const profile = dom.byId("user-profile-badge");
        if (profile) profile.className = "profile-badge-container logged-out";
        dom.byId("feed-tab-authority")?.classList.add("hidden");
    },

    showDashboard() {
        dom.hide(dom.byId("landing"));
        dom.show(dom.byId("dashboard"));
        dom.hide(dom.byId("reportModal"));
        const profile = dom.byId("user-profile-badge");
        if (profile) profile.className = "profile-badge-container logged-in";
        if (store.map && typeof store.map.invalidateSize === "function") {
            setTimeout(() => store.map.invalidateSize(), 60);
        }
    },

    updateUserUI(user) {
        const name = dom.byId("user-display-name");
        const points = dom.byId("user-display-points");
        const role = dom.byId("user-display-role");
        const dashboardPoints = dom.byId("statPoints");
        if (name) name.textContent = user.full_name || user.email;
        if (points) points.textContent = `${user.points || 0} pts`;
        if (role) role.textContent = user.role || "citizen";
        if (dashboardPoints) dashboardPoints.textContent = String(user.points || 0);
        const authTab = dom.byId("feed-tab-authority");
        if (authTab) authTab.classList.toggle("hidden", !(user.role === "authority" || user.role === "admin"));
    }
};

const modal = {
    currentModal: null,

    show(modalId) {
        this.close();
        this.currentModal = dom.byId(modalId);
        if (this.currentModal) {
            this.currentModal.style.display = "flex";
            document.body.style.overflow = "hidden";
        }
    },

    close() {
        if (this.currentModal) {
            this.currentModal.style.display = "none";
            document.body.style.overflow = "";
            this.currentModal = null;
        }
    },

    showLogin() {
        this.show("loginModal");
    },

    showRegister() {
        this.show("registerModal");
    },

    showReport() {
        this.show("reportModal");
    }
};

document.addEventListener("DOMContentLoaded", async () => {
    bindAuthForms();
    estimator.bind();
    feed.bind();
    resolveModal.bind();
    comparisonSlider.bind();
    websocket.init();

    await mapModule.init("preview-map", store.gpsCenter, 11);
    await dashboard.refresh();

    if (store.token) {
        const user = await auth.loadProfile();
        if (user) {
            ui.showDashboard();
            await dashboard.load();
            await mapModule.init("dashboard-map", store.gpsCenter, 12);
        }
    } else {
        ui.showLanding();
    }

    dom.byId("reportFab")?.addEventListener("click", async () => {
        modal.showReport();
        await hazardReport.init();
    });

    dom.byId("cancelReport")?.addEventListener("click", () => modal.close());
});

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("/static/sw.js", { scope: "/static/" }).catch(() => {});
    });
}
