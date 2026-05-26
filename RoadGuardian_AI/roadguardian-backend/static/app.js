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
    const feedRecent = document.getElementById("recent-reports-feed");
    const feedMy = document.getElementById("my-reports-feed");

    btnRecent.addEventListener("click", () => {
        btnRecent.classList.add("active");
        btnMy.classList.remove("active");
        feedRecent.classList.add("active");
        feedMy.classList.remove("active");
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
        feedMy.classList.add("active");
        feedRecent.classList.remove("active");
        state.activeFeedTab = "my";
        syncMyReports();
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

    item.innerHTML = `
        <div class="feed-item-left">
            <span class="feed-item-type">${emoji} ${h.hazard_type.replace("_", " ")}</span>
            <span class="feed-item-address">📍 ${h.location_address || "Resolving location..."}</span>
            <span class="feed-item-meta">Submitted by: <strong>${h.reporter_name || "Anonymous citizen"}</strong> on ${dateStr}</span>
        </div>
        <div class="feed-item-right">
            <span class="feed-status-badge ${h.status}">${h.status}</span>
            ${needsVerify ? `<button class="verify-action-btn" data-id="${h.id}">Verify Report</button>` : ""}
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
