/* ==========================================================================
   RoadGuardian AI - Vanilla JavaScript Application Logic
   ========================================================================== */

const API_BASE = window.location.origin;

// State Management
let state = {
    token: localStorage.getItem("token") || null,
    user: null,
    map: null,
    markers: [],
    gpsCenter: [13.0827, 80.2707], // Chennai baseline fallback
    voiceRecording: false,
    activeFeedTab: "recent" // "recent" or "my"
};

// Map Pin Icon Definitions
const iconEmojis = {
    pothole: "🟡",
    crack: "🔵",
    waterlogging: "💧",
    broken_dividers: "🔴",
    missing_signs: "🟢",
    other: "⚪"
};

// ==========================================
// Application Bootstrap Initialization
// ==========================================

document.addEventListener("DOMContentLoaded", async () => {
    logger("System bootstrapping initiated...");
    
    // Initialize GPS coordinates lookups
    initGPSLocation();

    // Initialize Leaflet Map
    initLeafletMap();

    // Connect real-time WebSockets
    initWebSocket();

    // Bind Event Listeners
    bindAuthUI();
    bindReportingUI();
    bindEstimatorUI();
    bindFeedTabs();
    
    // Sync live public data
    await syncDashboardData();

    // Authenticate existing token
    if (state.token) {
        await verifyAndLoadProfile();
    }
});

// Helper logger
function logger(msg) {
    console.log(`[RoadGuardian] ${msg}`);
}

// Get GPS location of visitor
function initGPSLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                state.gpsCenter = [position.coords.latitude, position.coords.longitude];
                logger(`GPS parsed successfully: ${state.gpsCenter}`);
                
                // Prefill lat/lng reporting forms
                document.getElementById("hz-lat").value = state.gpsCenter[0].toFixed(6);
                document.getElementById("hz-lng").value = state.gpsCenter[1].toFixed(6);
                
                // Recenter map if already instantiated
                if (state.map) {
                    state.map.setView(state.gpsCenter, 13);
                }
            },
            (error) => {
                logger("GPS lookup blocked or failed. Using baseline coordinates.");
            }
        );
    }
}

// Initialize Leaflet Spatial Map
function initLeafletMap() {
    logger("Mounting Leaflet map wrapper...");
    state.map = L.map("map").setView(state.gpsCenter, 13);
    
    // Load modern sleek dark theme map tiles from CartoDB
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20
    }).addTo(state.map);

    // Initial heatmap sync
    syncHeatmapMarkers();
}

// ==========================================
// User Authentication Procedures
// ==========================================

function bindAuthUI() {
    const tabLogin = document.getElementById("tab-login");
    const tabRegister = document.getElementById("tab-register");
    const formLogin = document.getElementById("login-form");
    const formRegister = document.getElementById("register-form");
    const logoutBtn = document.getElementById("logout-btn");

    // Tab transitions
    tabLogin.addEventListener("click", () => {
        tabLogin.classList.add("active");
        tabRegister.classList.remove("active");
        formLogin.classList.add("active");
        formRegister.classList.remove("active");
    });

    tabRegister.addEventListener("click", () => {
        tabRegister.classList.add("active");
        tabLogin.classList.remove("active");
        formRegister.classList.add("active");
        formLogin.classList.remove("active");
    });

    // Login Submission
    formLogin.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("login-email").value;
        const password = document.getElementById("login-password").value;

        try {
            const formData = new URLSearchParams();
            formData.append("username", email); // OAuth2 expects username key
            formData.append("password", password);

            const res = await fetch(`${API_BASE}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: formData
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || "Authentication credentials failed.");
            }

            const data = await res.json();
            state.token = data.access_token;
            localStorage.setItem("token", state.token);
            
            logger("Authentication token verified.");
            await verifyAndLoadProfile();
            
            // Clear forms
            formLogin.reset();
        } catch (err) {
            alert(`❌ Sign In Failed: ${err.message}`);
        }
    });

    // Register Submission
    formRegister.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("reg-name").value;
        const email = document.getElementById("reg-email").value;
        const password = document.getElementById("reg-password").value;

        try {
            const res = await fetch(`${API_BASE}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, full_name: name })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || "Sign up details rejected.");
            }

            alert("✅ Account created successfully! Please Sign In.");
            formRegister.reset();
            tabLogin.click(); // Switch to login tab
        } catch (err) {
            alert(`❌ Register Failed: ${err.message}`);
        }
    });

    // Logout Btn Click
    logoutBtn.addEventListener("click", () => {
        state.token = null;
        state.user = null;
        localStorage.removeItem("token");
        
        // Reset profiles view
        document.getElementById("user-profile-badge").className = "profile-badge-container logged-out";
        document.getElementById("auth-card").classList.remove("hidden");
        document.getElementById("reporting-card").classList.add("locked");
        document.getElementById("badges-card").classList.add("hidden");
        
        logger("Signed out. Clearing credentials.");
        syncDashboardData();
    });
}

async function verifyAndLoadProfile() {
    try {
        const res = await fetch(`${API_BASE}/auth/me`, {
            headers: { "Authorization": `Bearer ${state.token}` }
        });

        if (!res.ok) {
            throw new Error("Token expired or corrupted.");
        }

        const user = await res.json();
        state.user = user;

        // Toggle UI displays
        document.getElementById("user-profile-badge").className = "profile-badge-container logged-in";
        document.getElementById("user-display-name").textContent = user.full_name || user.email;
        document.getElementById("user-display-points").textContent = `${user.points} pts`;
        document.getElementById("user-display-role").textContent = user.role;
        
        document.getElementById("auth-card").classList.add("hidden");
        document.getElementById("reporting-card").classList.remove("locked");

        // Toggle Authority review tab button based on credentials role
        const authTabBtn = document.getElementById("feed-tab-authority");
        if (user.role === "authority" || user.role === "admin") {
            authTabBtn.classList.remove("hidden");
        } else {
            authTabBtn.classList.add("hidden");
            if (state.activeFeedTab === "authority") {
                document.getElementById("feed-tab-recent").click();
            }
        }

        // Sync achievements
        syncAchievementBadges(user);
        
        // Sync my submissions
        if (state.activeFeedTab === "my") {
            syncMyReports();
        }
        
        logger(`Active session resolved for: ${user.email} (${user.role})`);
    } catch (err) {
        logger(`Session check failed: ${err.message}. Revoking token.`);
        state.token = null;
        localStorage.removeItem("token");
    }
}

// ==========================================
// Hazard Reporting Controls
// ==========================================

function bindReportingUI() {
    const reportForm = document.getElementById("hazard-report-form");
    const locateBtn = document.getElementById("locate-btn");
    const voiceRecordBtn = document.getElementById("voice-record-btn");

    // Locate GPS Click
    locateBtn.addEventListener("click", () => {
        initGPSLocation();
        alert("📍 Retrieved current GPS coordinate values successfully!");
    });

    // Form Submission
    reportForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const fileInput = document.getElementById("hz-image");
        const type = document.getElementById("hz-type").value;
        const lat = document.getElementById("hz-lat").value;
        const lng = document.getElementById("hz-lng").value;
        const desc = document.getElementById("hz-desc").value;

        if (!fileInput.files || fileInput.files.length === 0) {
            alert("❌ Please choose an image file demonstrating visual proof.");
            return;
        }

        // Assemble multipart form payload
        const formData = new FormData();
        formData.append("image", fileInput.files[0]);
        formData.append("hazard_type", type);
        formData.append("latitude", lat);
        formData.append("longitude", lng);
        if (desc) {
            formData.append("description", desc);
        }

        try {
            const submitBtn = reportForm.querySelector("button[type='submit']");
            submitBtn.textContent = "⌛ Dispatching Report...";
            submitBtn.disabled = true;

            const res = await fetch(`${API_BASE}/hazards/upload`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${state.token}` },
                body: formData
            });

            submitBtn.textContent = "📤 Dispatch Report";
            submitBtn.disabled = false;

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || "Hazard submission failed.");
            }

            alert("✅ Hazard report successfully uploaded! AI models have evaluated the severity score.");
            reportForm.reset();
            
            // Re-sync
            await syncDashboardData();
            await syncHeatmapMarkers();
            if (state.token) {
                await verifyAndLoadProfile();
            }
        } catch (err) {
            alert(`❌ Upload Failed: ${err.message}`);
        }
    });

    // Voice simulation recording
    voiceRecordBtn.addEventListener("click", async () => {
        if (!state.token) {
            alert("🔒 Please Sign In to use voice reporting.");
            return;
        }

        const statusText = document.getElementById("voice-status-text");
        const waves = document.getElementById("voice-waves");

        if (!state.voiceRecording) {
            // Start recording simulation
            state.voiceRecording = true;
            voiceRecordBtn.classList.add("recording");
            statusText.textContent = "🔴 Recording... Speak into mic";
            waves.style.display = "flex";

            // Auto finish simulation after 4 seconds
            setTimeout(async () => {
                state.voiceRecording = false;
                voiceRecordBtn.classList.remove("recording");
                statusText.textContent = "⌛ Transcribing via Whisper...";
                waves.style.display = "none";

                // Simulate uploading a mock WAV audio file
                // Create a mock blob representing WAV audio
                const mockBlob = new Blob(["mock wav audio content"], { type: "audio/wav" });
                const audioFile = new File([mockBlob], "report_audio.wav", { type: "audio/wav" });
                
                const lat = document.getElementById("hz-lat").value || state.gpsCenter[0];
                const lng = document.getElementById("hz-lng").value || state.gpsCenter[1];

                const formData = new FormData();
                formData.append("audio", audioFile);
                formData.append("latitude", lat);
                formData.append("longitude", lng);

                try {
                    const res = await fetch(`${API_BASE}/hazards/voice-report`, {
                        method: "POST",
                        headers: { "Authorization": `Bearer ${state.token}` },
                        body: formData
                    });

                    if (!res.ok) {
                        throw new Error("Whisper transcription failed.");
                    }

                    const data = await res.json();
                    statusText.textContent = "✅ Dispatch successful!";
                    alert(`🎙️ Voice Report successfully parsed via Whisper STT:\n"${data.description}"\nUrgency: ${data.urgency_level.toUpperCase()}`);
                    
                    // Re-sync
                    await syncDashboardData();
                    await syncHeatmapMarkers();
                    await verifyAndLoadProfile();
                } catch (err) {
                    statusText.textContent = "⚠️ Transcription error.";
                    alert(`❌ Voice Report Failed: ${err.message}`);
                }

                // Reset mic prompt after delay
                setTimeout(() => {
                    if (!state.voiceRecording) {
                        statusText.textContent = "Tap mic to record audio report";
                    }
                }, 3000);

            }, 4000);
        }
    });
}

// ==========================================
// Severity Sandbox Simulator
// ==========================================

function bindEstimatorUI() {
    const form = document.getElementById("estimator-form");
    const resultBox = document.getElementById("estimator-result");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const type = document.getElementById("est-type").value;
        const confidence = document.getElementById("est-conf").value;
        const traffic = document.getElementById("est-traffic").value;
        const weather = document.getElementById("est-weather").value;

        try {
            const res = await fetch(`${API_BASE}/hazards/analyze-severity`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    hazard_type: type,
                    confidence_score: parseFloat(confidence),
                    traffic_density: traffic,
                    weather_condition: weather
                })
            });

            if (!res.ok) throw new Error("Simulator returned an error.");

            const data = await res.json();
            
            // Render results
            document.getElementById("est-res-score").textContent = data.severity_score.toFixed(1);
            
            const badge = document.getElementById("est-res-urgency");
            badge.textContent = data.urgency_level;
            badge.className = `urgency-badge ${data.urgency_level}`;
            
            document.getElementById("est-res-exp").textContent = data.factors.explanation;
            
            resultBox.classList.remove("hidden");
        } catch (err) {
            alert(`❌ Simulation Failed: ${err.message}`);
        }
    });
}

// ==========================================
// Feeds and Analytics Syncing
// ==========================================

function bindFeedTabs() {
    const btnRecent = document.getElementById("feed-tab-recent");
    const btnMy = document.getElementById("feed-tab-my");
    const btnAuthority = document.getElementById("feed-tab-authority");
    const feedRecent = document.getElementById("recent-reports-feed");
    const feedMy = document.getElementById("my-reports-feed");
    const feedAuthority = document.getElementById("authority-reports-feed");

    btnRecent.addEventListener("click", () => {
        btnRecent.classList.add("active");
        btnMy.classList.remove("active");
        btnAuthority.classList.remove("active");
        feedRecent.classList.add("active");
        feedMy.classList.remove("active");
        feedAuthority.classList.remove("active");
        state.activeFeedTab = "recent";
        syncDashboardData();
    });

    btnMy.addEventListener("click", () => {
        if (!state.token) {
            alert("🔒 Please Sign In to view your submissions.");
            return;
        }
        btnMy.classList.add("active");
        btnRecent.classList.remove("active");
        btnAuthority.classList.remove("active");
        feedMy.classList.add("active");
        feedRecent.classList.remove("active");
        feedAuthority.classList.remove("active");
        state.activeFeedTab = "my";
        syncMyReports();
    });

    btnAuthority.addEventListener("click", () => {
        if (!state.token) return;
        btnAuthority.classList.add("active");
        btnRecent.classList.remove("active");
        btnMy.classList.remove("active");
        feedAuthority.classList.add("active");
        feedRecent.classList.remove("active");
        feedMy.classList.remove("active");
        state.activeFeedTab = "authority";
        syncAuthorityPendingList();
    });
}

async function syncDashboardData() {
    try {
        const res = await fetch(`${API_BASE}/hazards/dashboard`);
        if (!res.ok) throw new Error("Failed to load dashboard data.");
        
        const data = await res.json();
        
        // Sync stats cards
        document.getElementById("stat-total").textContent = data.total_hazards;
        document.getElementById("stat-critical").textContent = data.high_urgency_count;
        document.getElementById("stat-pending").textContent = data.pending_count;
        document.getElementById("stat-resolved").textContent = data.resolved_count;

        // Sync live feeds list
        const feed = document.getElementById("recent-reports-feed");
        feed.innerHTML = "";

        if (!data.recent_hazards || data.recent_hazards.length === 0) {
            feed.innerHTML = '<div class="empty-state">No hazard reports found in the system.</div>';
            return;
        }

        data.recent_hazards.forEach(h => {
            const item = createFeedItemHTML(h, true);
            feed.appendChild(item);
        });

    } catch (err) {
        logger(`Dashboard sync failed: ${err.message}`);
    }
}

async function syncMyReports() {
    if (!state.token) return;

    try {
        const res = await fetch(`${API_BASE}/hazards/my-reports`, {
            headers: { "Authorization": `Bearer ${state.token}` }
        });
        if (!res.ok) throw new Error("Failed to fetch my reports.");
        
        const list = await res.json();
        const feed = document.getElementById("my-reports-feed");
        feed.innerHTML = "";

        if (!list || list.length === 0) {
            feed.innerHTML = '<div class="empty-state">You have not submitted any hazard reports yet.</div>';
            return;
        }

        list.forEach(h => {
            const item = createFeedItemHTML(h, false);
            feed.appendChild(item);
        });

    } catch (err) {
        logger(`My reports sync failed: ${err.message}`);
    }
}

function createFeedItemHTML(h, showVerifyButton = true) {
    const item = document.createElement("div");
    item.className = "feed-item";

    const emoji = iconEmojis[h.hazard_type] || "⚪";
    const dateStr = new Date(h.created_at).toLocaleDateString(undefined, {
        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
    });

    const isAuthority = state.user && (state.user.role === "authority" || state.user.role === "admin");
    const needsVerify = h.status === "pending" && showVerifyButton && isAuthority;
    const isResolved = h.status === "resolved" && h.resolved_image_url;

    item.innerHTML = `
        <div class="feed-item-left">
            <span class="feed-item-type">${emoji} ${h.hazard_type.replace("_", " ")}</span>
            <span class="feed-item-address">📍 ${h.location_address || "Resolving location..."}</span>
            <span class="feed-item-meta">Submitted by: <strong>${h.reporter_name || "Anonymous citizen"}</strong> on ${dateStr}</span>
        </div>
        <div class="feed-item-right" style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.35rem;">
            <span class="feed-status-badge ${h.status}">${h.status}</span>
            ${needsVerify ? `<button class="verify-action-btn" data-id="${h.id}">Verify Report</button>` : ""}
            ${isResolved ? `<button class="compare-proof-btn" data-id="${h.id}">Compare Proof</button>` : ""}
        </div>
    `;

    // Bind verify action
    if (needsVerify) {
        const btn = item.querySelector(".verify-action-btn");
        btn.addEventListener("click", async () => {
            try {
                const res = await fetch(`${API_BASE}/hazards/${h.id}/status`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${state.token}`
                    },
                    body: JSON.stringify({ status: "verified" })
                });

                if (!res.ok) throw new Error("Verification transition rejected.");

                alert("✅ Report successfully verified! Citizen rewarded points and badges.");
                
                // Re-sync
                await syncDashboardData();
                await syncHeatmapMarkers();
                await verifyAndLoadProfile();
            } catch (err) {
                alert(`❌ Verification Failed: ${err.message}`);
            }
        });
    }

    // Bind compare proof action
    if (isResolved) {
        const compBtn = item.querySelector(".compare-proof-btn");
        compBtn.addEventListener("click", () => {
            launchComparisonModal(h);
        });
    }

    return item;
}

// Sync Heatmap Markers on Leaflet
async function syncHeatmapMarkers() {
    try {
        const res = await fetch(`${API_BASE}/hazards/heatmap`);
        if (!res.ok) throw new Error("Heatmap coordinates load failed.");
        
        const clusters = await res.json();
        
        // Remove existing markers
        state.markers.forEach(m => state.map.removeLayer(m));
        state.markers = [];

        // Plot new markers
        clusters.forEach(c => {
            const typesBreakdown = Object.entries(c.hazard_types)
                .map(([type, count]) => `${iconEmojis[type] || "⚪"} ${type.replace("_", " ")}: ${count}`)
                .join("<br>");

            // Choose predominant emoji
            const predominantType = Object.keys(c.hazard_types)[0] || "other";
            const predominantEmoji = iconEmojis[predominantType] || "⚪";

            // Create customizable Leaflet circle marker mapping spatial hazard clusters
            const circle = L.circle([c.center_lat, c.center_lng], {
                color: getClusterColor(predominantType),
                fillColor: getClusterColor(predominantType),
                fillOpacity: 0.35,
                radius: c.cluster_radius_meters
            }).addTo(state.map);

            circle.bindPopup(`
                <div style="font-family: inherit; font-size: 0.85rem; color: #fff; background: #111622; padding: 0.25rem;">
                    <h4 style="font-weight: 700; margin-bottom: 0.35rem; color: #3b82f6;">📍 Hazard Area Cluster</h4>
                    <p style="margin-bottom: 0.25rem;">Hazards Count: <strong>${c.hazard_count}</strong></p>
                    <p style="margin-bottom: 0.5rem;">Avg Severity: <strong style="color: #ef4444;">${c.severity_avg}/10.0</strong></p>
                    <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 0.4rem;">
                        ${typesBreakdown}
                    </div>
                </div>
            `);

            state.markers.push(circle);
        });

    } catch (err) {
        logger(`Heatmap sync failed: ${err.message}`);
    }
}

function getClusterColor(type) {
    const colors = {
        pothole: "#f59e0b",
        crack: "#3b82f6",
        waterlogging: "#06b6d4",
        broken_dividers: "#ef4444",
        missing_signs: "#10b981",
        other: "#6b7280"
    };
    return colors[type] || "#3b82f6";
}

// Sync gamification badges Achievement
async function syncAchievementBadges(user) {
    const drawer = document.getElementById("badges-card");
    const container = document.getElementById("badges-list");

    try {
        // Mock checking user badges or querying them.
        // We will mock badges displays based on user's current points total!
        // This is a premium touch making the gamification instantly reactive!
        const mockBadges = [
            { name: "First Responder Medal", req: 10, desc: "Awarded for submitting your first hazard report.", medal: "🥉" },
            { name: "Hazard Hunter", req: 50, desc: "Awarded for earning 50 points of verified reports.", medal: "🥈" },
            { name: "Verified Citizen Hero", req: 150, desc: "Awarded for elite community safety participation.", medal: "🥇" }
        ];

        container.innerHTML = "";
        let hasBadges = false;

        mockBadges.forEach(b => {
            if (user.points >= b.req) {
                hasBadges = true;
                const item = document.createElement("div");
                item.className = "badge-item";
                item.innerHTML = `
                    <span class="badge-medal">${b.medal}</span>
                    <div class="badge-details">
                        <h4>${b.name}</h4>
                        <p>${b.desc}</p>
                    </div>
                `;
                container.appendChild(item);
            }
        });

        if (hasBadges) {
            drawer.classList.remove("hidden");
        } else {
            drawer.classList.add("hidden");
        }

    } catch (err) {
        logger(`Badges sync failed: ${err.message}`);
    }
}

// ==========================================
// Authority Operations & Panel Syncing
// ==========================================

async function syncAuthorityPendingList() {
    if (!state.token) return;

    try {
        const res = await fetch(`${API_BASE}/hazards/authority/pending`, {
            headers: { "Authorization": `Bearer ${state.token}` }
        });

        if (!res.ok) throw new Error("Failed to load pending authority reports.");

        const list = await res.json();
        const container = document.getElementById("authority-pending-list");
        const bulkBar = document.querySelector(".bulk-verify-bar");
        
        container.innerHTML = "";
        bulkBar.classList.add("hidden"); // Reset bulk bar by default

        if (!list || list.length === 0) {
            container.innerHTML = '<div class="empty-state">No pending reports for review. All clear! 🌟</div>';
            return;
        }

        list.forEach(h => {
            const wrapper = document.createElement("div");
            wrapper.className = "feed-item";

            const emoji = iconEmojis[h.hazard_type] || "⚪";
            const dateStr = new Date(h.created_at).toLocaleDateString(undefined, {
                month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
            });

            // Verify if crew is already assigned
            const hasCrew = h.assigned_to !== null;
            const crewSection = hasCrew 
                ? `<span class="assignment-badge">🚛 Assigned: ${h.assigned_to}</span>` 
                : `<div class="crew-dispatch-container">
                    <input type="text" class="crew-input" placeholder="Enter Crew Name (e.g. Crew Alpha)">
                    <button class="crew-dispatch-btn" data-id="${h.id}">Dispatch</button>
                   </div>`;

            wrapper.innerHTML = `
                <div class="feed-item-checkbox-container" style="display: flex; align-items: center; width: 100%;">
                    <input type="checkbox" class="feed-item-checkbox" data-id="${h.id}">
                    <div style="flex: 1;">
                        <div class="feed-item-container" style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
                            <div class="feed-item-left">
                                <span class="feed-item-type">${emoji} ${h.hazard_type.replace("_", " ")}</span>
                                <span class="feed-item-address">📍 ${h.location_address || "Resolving location..."}</span>
                                <span class="feed-item-meta">Reporter: <strong>${h.reporter_name || "Anonymous citizen"}</strong> on ${dateStr}</span>
                                ${crewSection}
                            </div>
                            <div class="feed-item-right" style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.5rem;">
                                <span class="urgency-badge ${h.urgency_level}">${h.urgency_level}</span>
                                <span class="score-value" style="font-size: 1.15rem; font-weight: 700; color: #ef4444;">${h.severity_score.toFixed(1)}</span>
                                <button class="verify-action-btn single-verify-btn" data-id="${h.id}">Verify</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Bind single verify click
            const verifyBtn = wrapper.querySelector(".single-verify-btn");
            verifyBtn.addEventListener("click", async () => {
                await verifyReportSingle(h.id);
            });

            // Bind crew dispatch action if missing
            if (!hasCrew) {
                const dispatchBtn = wrapper.querySelector(".crew-dispatch-btn");
                const crewInput = wrapper.querySelector(".crew-input");
                dispatchBtn.addEventListener("click", async () => {
                    const crewName = crewInput.value.trim();
                    if (!crewName) {
                        alert("⚠️ Please enter a crew name to dispatch.");
                        return;
                    }
                    await dispatchCrewAction(h.id, crewName);
                });
            }

            // Bind checkbox triggers to toggle bulk bar
            const checkbox = wrapper.querySelector(".feed-item-checkbox");
            checkbox.addEventListener("change", () => {
                const checkedBoxes = container.querySelectorAll(".feed-item-checkbox:checked");
                if (checkedBoxes.length > 0) {
                    bulkBar.classList.remove("hidden");
                } else {
                    bulkBar.classList.add("hidden");
                }
            });

            container.appendChild(wrapper);
        });

    } catch (err) {
        logger(`Authority pending sync failed: ${err.message}`);
    }
}

// Single Verify Action from Authority Panel
async function verifyReportSingle(id) {
    try {
        const res = await fetch(`${API_BASE}/hazards/${id}/status`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${state.token}`
            },
            body: JSON.stringify({ status: "verified" })
        });

        if (!res.ok) throw new Error("Verification transition failed.");
        alert("✅ Report verified successfully!");
        
        await syncDashboardData();
        await syncHeatmapMarkers();
        await syncAuthorityPendingList();
    } catch (err) {
        alert(`❌ Verification Failed: ${err.message}`);
    }
}

// Dispatch Crew Action
async function dispatchCrewAction(id, crewName) {
    try {
        const res = await fetch(`${API_BASE}/hazards/authority/assign/${id}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${state.token}`
            },
            body: JSON.stringify({ crew_name: crewName })
        });

        if (!res.ok) throw new Error("Crew dispatch assignment failed.");
        const data = await res.json();
        alert(`✅ Success: ${data.message}`);

        await syncDashboardData();
        await syncHeatmapMarkers();
        await syncAuthorityPendingList();
    } catch (err) {
        alert(`❌ Crew Dispatch Failed: ${err.message}`);
    }
}

// Bind Bulk Verification Action
document.addEventListener("DOMContentLoaded", () => {
    const bulkBtn = document.getElementById("bulk-verify-btn");
    if (bulkBtn) {
        bulkBtn.addEventListener("click", async () => {
            const checkedBoxes = document.querySelectorAll("#authority-pending-list .feed-item-checkbox:checked");
            const ids = Array.from(checkedBoxes).map(cb => parseInt(cb.dataset.id));

            if (ids.length === 0) return;

            try {
                const res = await fetch(`${API_BASE}/hazards/authority/verify-bulk`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${state.token}`
                    },
                    body: JSON.stringify(ids)
                });

                if (!res.ok) throw new Error("Bulk verification failed.");
                const data = await res.json();
                alert(`✅ Success: Bulk verified ${data.verified_count} hazards! Citizens rewarded points.`);

                await syncDashboardData();
                await syncHeatmapMarkers();
                await syncAuthorityPendingList();
            } catch (err) {
                alert(`❌ Bulk Verification Failed: ${err.message}`);
            }
        });
    }
});

// ==========================================
// Real-Time WebSockets Communication
// ==========================================

function initWebSocket() {
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/hazards`;
    
    logger(`Connecting to WebSocket at: ${wsUrl}`);
    const socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
        logger("🔌 WebSocket connection active.");
    };
    
    socket.onmessage = async (event) => {
        try {
            const msg = JSON.parse(event.data);
            logger(`Received real-time update: ${msg.type}`);
            
            if (msg.type === "new_hazard") {
                const h = msg.data;
                const emoji = iconEmojis[h.hazard_type] || "⚪";
                
                showToastNotification(`${emoji} New reported hazard: <strong>${h.hazard_type.replace("_", " ")}</strong>`);
                
                // Re-sync dashboard analytics and leaflet map live
                await syncDashboardData();
                await syncHeatmapMarkers();
                if (state.token) {
                    await syncMyReports();
                }
            } else if (msg.type === "status_update") {
                const h = msg.data;
                const emoji = iconEmojis[h.hazard_type] || "⚪";
                const badgeClass = h.status === "verified" ? "✅" : "📦";
                
                showToastNotification(`${badgeClass} Report status updated: ${emoji} <strong>${h.hazard_type.replace("_", " ")}</strong> is now <strong>${h.status}</strong>`);
                
                // Re-sync dashboard analytics, leaflet map, and profile points
                await syncDashboardData();
                await syncHeatmapMarkers();
                if (state.token) {
                    await syncMyReports();
                    await verifyAndLoadProfile(); // Sync citizen points in-app if they are the reporter
                }
            }
        } catch (err) {
            logger(`Error parsing WebSocket event data: ${err.message}`);
        }
    };
    
    socket.onclose = () => {
        logger("⚠️ WebSocket disconnected. Reconnecting in 5 seconds...");
        setTimeout(initWebSocket, 5000); // Dynamic self-reconnection hook
    };
}

// Toast Toaster Notifications
function showToastNotification(msg) {
    // Create toast container if missing
    let container = document.getElementById("toast-holder");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-holder";
        container.className = "toast-container";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `
        <span class="toast-indicator">🔔</span>
        <div class="toast-content">${msg}</div>
    `;

    container.appendChild(toast);

    // Audio beep notification simulation
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // Pitch A5
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.12);
    } catch (e) {
        // Silently skip if user hasn't interacted or audio is blocked
    }

    // Auto dismiss after 4 seconds
    setTimeout(() => {
        toast.classList.add("fade-out");
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 4000);
}

// ==========================================
// Authority Active Crews & Resolution Handler
// ==========================================

// Bind Sub-Tabs on DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
    const tabPending = document.getElementById("auth-sub-tab-pending");
    const tabActive = document.getElementById("auth-sub-tab-active");
    const sectPending = document.getElementById("auth-pending-section");
    const sectActive = document.getElementById("auth-active-section");

    if (tabPending && tabActive) {
        tabPending.addEventListener("click", () => {
            tabPending.classList.add("active");
            tabActive.classList.remove("active");
            sectPending.style.display = "block";
            sectActive.style.display = "none";
            syncAuthorityPendingList();
        });

        tabActive.addEventListener("click", () => {
            tabActive.classList.add("active");
            tabPending.classList.remove("active");
            sectActive.style.display = "block";
            sectPending.style.display = "none";
            syncAuthorityActiveList();
        });
    }

    // Bind Close Buttons for modals
    const closeResolve = document.getElementById("close-resolve-modal");
    if (closeResolve) {
        closeResolve.addEventListener("click", () => {
            document.getElementById("resolve-modal").classList.add("hidden");
        });
    }

    const closeComp = document.getElementById("close-comparison-modal");
    if (closeComp) {
        closeComp.addEventListener("click", () => {
            document.getElementById("comparison-modal").classList.add("hidden");
        });
    }

    // Bind Resolve Form Submission
    const resolveForm = document.getElementById("resolve-hazard-form");
    if (resolveForm) {
        resolveForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const id = document.getElementById("resolve-hazard-id").value;
            const imgInput = document.getElementById("res-proof-image");
            const notesInput = document.getElementById("res-notes");

            if (!imgInput.files || imgInput.files.length === 0) {
                alert("⚠️ Please upload reparation image proof.");
                return;
            }

            const formData = new FormData();
            formData.append("resolved_image", imgInput.files[0]);
            formData.append("resolution_notes", notesInput.value);

            try {
                const submitBtn = resolveForm.querySelector("button[type='submit']");
                submitBtn.textContent = "⌛ Submitting Resolution...";
                submitBtn.disabled = true;

                const res = await fetch(`${API_BASE}/hazards/authority/resolve/${id}`, {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${state.token}` },
                    body: formData
                });

                submitBtn.textContent = "✓ Submit Proof & Resolve";
                submitBtn.disabled = false;

                if (!res.ok) throw new Error("Resolution submission failed.");

                alert("✅ Road hazard successfully marked resolved! Citizen rewarded point achievements.");
                document.getElementById("resolve-modal").classList.add("hidden");
                resolveForm.reset();

                // Sync lists
                await syncDashboardData();
                await syncHeatmapMarkers();
                await syncAuthorityActiveList();
            } catch (err) {
                alert(`❌ Resolution Failed: ${err.message}`);
            }
        });
    }

    // Draggable Split Screen Slider event listeners
    initComparisonSlider();
});

// Sync Dispatched/Active crew list
async function syncAuthorityActiveList() {
    if (!state.token) return;

    try {
        const res = await fetch(`${API_BASE}/hazards/authority/active`, {
            headers: { "Authorization": `Bearer ${state.token}` }
        });

        if (!res.ok) throw new Error("Failed to load active dispatches.");

        const list = await res.json();
        const container = document.getElementById("authority-active-list");
        container.innerHTML = "";

        if (!list || list.length === 0) {
            container.innerHTML = '<div class="empty-state">No active crew dispatches found.</div>';
            return;
        }

        list.forEach(h => {
            const wrapper = document.createElement("div");
            wrapper.className = "feed-item";

            const emoji = iconEmojis[h.hazard_type] || "⚪";
            const dateStr = new Date(h.created_at).toLocaleDateString(undefined, {
                month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
            });

            wrapper.innerHTML = `
                <div class="feed-item-container" style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
                    <div class="feed-item-left">
                        <span class="feed-item-type">${emoji} ${h.hazard_type.replace("_", " ")}</span>
                        <span class="feed-item-address">📍 ${h.location_address || "Resolving location..."}</span>
                        <span class="feed-item-meta">Reporter: <strong>${h.reporter_name || "Anonymous citizen"}</strong> on ${dateStr}</span>
                        <span class="assignment-badge">🚛 Dispatched: ${h.assigned_to}</span>
                    </div>
                    <div class="feed-item-right" style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.5rem;">
                        <span class="urgency-badge ${h.urgency_level}">${h.urgency_level}</span>
                        <span class="score-value" style="font-size: 1.15rem; font-weight: 700; color: #ef4444;">${h.severity_score.toFixed(1)}</span>
                        <button class="verify-action-btn mark-resolved-btn" data-id="${h.id}">Resolve</button>
                    </div>
                </div>
            `;

            // Bind Resolve Trigger
            const resBtn = wrapper.querySelector(".mark-resolved-btn");
            resBtn.addEventListener("click", () => {
                document.getElementById("resolve-hazard-id").value = h.id;
                document.getElementById("resolve-modal").classList.remove("hidden");
            });

            container.appendChild(wrapper);
        });

    } catch (err) {
        logger(`Authority active dispatches sync failed: ${err.message}`);
    }
}

// Launch slider comparison modal
function launchComparisonModal(h) {
    const modal = document.getElementById("comparison-modal");
    const beforeImg = document.getElementById("slider-before-img");
    const afterImg = document.getElementById("slider-after-img");
    
    // Fallback if before image is missing (e.g. voice report)
    if (h.image_url) {
        beforeImg.src = API_BASE + h.image_url;
        beforeImg.style.display = "block";
    } else {
        // Aesthetic base64 or placeholder indicating Voice Report
        beforeImg.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='375' viewBox='0 0 600 375'><rect width='600' height='375' fill='%23111622'/><text x='50%25' y='50%25' fill='%2394a3b8' font-family='sans-serif' font-weight='bold' font-size='16' text-anchor='middle'>[Voice Report] No Initial Image Uploaded</text></svg>";
    }
    
    afterImg.src = API_BASE + h.resolved_image_url;
    
    document.getElementById("comp-type").textContent = `${iconEmojis[h.hazard_type] || "⚪"} ${h.hazard_type.replace("_", " ").toUpperCase()} REPAIRED`;
    document.getElementById("comp-notes").textContent = h.resolution_notes || "Reparation successfully processed and inspected by authorities.";
    
    const resolveDate = h.resolved_at 
        ? new Date(h.resolved_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
        : "N/A";
    document.getElementById("comp-resolved-by").textContent = `Resolved by: ${h.resolved_by_name || "Crew Lead"}`;
    document.getElementById("comp-resolved-at").textContent = `Date: ${resolveDate}`;

    // Reset slider viewport center
    const afterContainer = modal.querySelector(".after-image-container");
    const handle = modal.querySelector(".slider-handle");
    afterContainer.style.clipPath = "inset(0 0 0 50%)";
    handle.style.left = "50%";

    modal.classList.remove("hidden");
}

// Draggable split screen before/after comparison slider
function initComparisonSlider() {
    const viewport = document.querySelector(".slider-viewport");
    if (!viewport) return;

    const afterContainer = viewport.querySelector(".after-image-container");
    const handle = viewport.querySelector(".slider-handle");
    let isDragging = false;

    const drag = (e) => {
        if (!isDragging) return;

        const rect = viewport.getBoundingClientRect();
        let clientX = e.clientX;
        if (e.touches && e.touches[0]) {
            clientX = e.touches[0].clientX;
        }

        let offset = clientX - rect.left;
        let percentage = (offset / rect.width) * 100;

        if (percentage < 0) percentage = 0;
        if (percentage > 100) percentage = 100;

        handle.style.left = percentage + "%";
        afterContainer.style.clipPath = `inset(0 0 0 ${percentage}%)`;
    };

    const startDrag = (e) => {
        isDragging = true;
        drag(e);
    };

    const stopDrag = () => {
        isDragging = false;
    };

    handle.addEventListener("mousedown", startDrag);
    viewport.addEventListener("mousedown", startDrag);
    window.addEventListener("mousemove", drag);
    window.addEventListener("mouseup", stopDrag);

    // Touch events for mobile responsiveness
    handle.addEventListener("touchstart", startDrag);
    viewport.addEventListener("touchstart", startDrag);
    window.addEventListener("touchmove", drag);
    window.addEventListener("touchend", stopDrag);
}

// ==========================================
// Service Worker Registration
// ==========================================
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("/static/sw.js", { scope: "/static/" })
            .then(reg => logger(`Service Worker registered successfully under scope: ${reg.scope}`))
            .catch(err => logger(`Service Worker registration failed: ${err}`));
    });
}
