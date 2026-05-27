/**
 * RoadGuardian AI - Micro-Interactions
 * Every interaction has road-themed feedback
 */

(function () {
    const STYLE_ID = "roadguardian-micro-interactions";

    const css = `
@keyframes cardRumble {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-2px); }
    75% { transform: translateX(2px); }
}

.btn {
    position: relative;
    overflow: hidden;
    transition: transform 0.1s var(--ease-road, ease);
}

.btn-ripple {
    position: absolute;
    width: 100px;
    height: 100px;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    transform: translate(-50%, -50%) scale(0);
    animation: rippleGrow 0.6s ease-out;
    pointer-events: none;
}

@keyframes rippleGrow {
    0% {
        transform: translate(-50%, -50%) scale(0);
        opacity: 0.5;
    }
    100% {
        transform: translate(-50%, -50%) scale(2);
        opacity: 0;
    }
}

.success-checkmark {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 10000;
    animation: asphaltReveal 0.4s var(--ease-road, ease);
}

.checkmark-svg {
    width: 80px;
    height: 80px;
}

.checkmark-circle {
    stroke: var(--safety-green, #2b9348);
    stroke-width: 3;
    stroke-dasharray: 166;
    stroke-dashoffset: 166;
    animation: strokeDraw 0.6s var(--ease-road, ease) forwards;
}

.checkmark-check {
    stroke: var(--safety-green, #2b9348);
    stroke-width: 3;
    stroke-dasharray: 48;
    stroke-dashoffset: 48;
    animation: strokeDraw 0.3s var(--ease-road, ease) 0.3s forwards;
}

@keyframes strokeDraw {
    100% { stroke-dashoffset: 0; }
}

.hazard-alert-toast {
    position: fixed;
    bottom: 20px;
    left: 20px;
    right: 20px;
    max-width: 380px;
    background: var(--asphalt, #0f172a);
    color: white;
    border-left: 6px solid var(--safety-orange, #e85d04);
    border-radius: var(--radius-md, 16px);
    padding: 14px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    transform: translateX(-120%);
    transition: transform 0.3s var(--ease-road, ease);
    z-index: 1000;
    box-shadow: var(--shadow-lg, 0 20px 40px rgba(15, 23, 42, 0.18));
}

.hazard-alert-toast.show {
    transform: translateX(0);
}

.hazard-alert-icon {
    font-size: 28px;
    animation: hazardPulseOrange 1s infinite;
}

.hazard-alert-content {
    flex: 1;
}

.hazard-alert-content strong {
    display: block;
    font-size: 0.92rem;
}

.hazard-alert-content span {
    font-size: 0.78rem;
    opacity: 0.8;
}

.hazard-alert-close {
    background: none;
    border: none;
    color: white;
    font-size: 20px;
    cursor: pointer;
    opacity: 0.6;
}

.hazard-alert-close:hover {
    opacity: 1;
}
    `;

    function ensureStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = css;
        document.head.appendChild(style);
    }

    function initHazardCardRumble() {
        const cards = document.querySelectorAll(".hazard-card, .preview-hazard");

        cards.forEach(card => {
            card.addEventListener("mouseenter", () => {
                card.style.animation = "cardRumble 0.15s ease-in-out 2";
                setTimeout(() => {
                    card.style.animation = "";
                }, 300);
            });
        });
    }

    function initButtonBump() {
        const buttons = document.querySelectorAll(".btn");

        buttons.forEach(btn => {
            btn.addEventListener("click", (event) => {
                if (btn.disabled || btn.classList.contains("btn-loading")) return;

                btn.style.transform = "scale(0.97)";
                setTimeout(() => {
                    btn.style.transform = "";
                }, 150);

                if (typeof event.clientX !== "number" || typeof event.clientY !== "number") {
                    return;
                }

                const rect = btn.getBoundingClientRect();
                const ripple = document.createElement("div");
                ripple.className = "btn-ripple";
                ripple.style.left = `${event.clientX - rect.left}px`;
                ripple.style.top = `${event.clientY - rect.top}px`;
                btn.appendChild(ripple);

                setTimeout(() => ripple.remove(), 600);
            });
        });
    }

    function animateNewMarker(markerElement, severity) {
        let color;
        let pulseAnimation;

        if (severity >= 8) {
            color = "#DC2626";
            pulseAnimation = "hazardPulse";
        } else if (severity >= 6) {
            color = "#E85D04";
            pulseAnimation = "hazardPulseOrange";
        } else {
            color = "#F59E0B";
            pulseAnimation = "hazardPulseYellow";
        }

        markerElement.style.animation = `${pulseAnimation} 0.6s 3`;
        markerElement.style.transformOrigin = "center";

        const originalFilter = markerElement.style.filter;
        markerElement.style.filter = `drop-shadow(0 0 10px ${color})`;
        setTimeout(() => {
            markerElement.style.filter = originalFilter;
        }, 1800);
    }

    function showSuccessAnimation(container) {
        const successMark = document.createElement("div");
        successMark.className = "success-checkmark";
        successMark.innerHTML = `
            <svg class="checkmark-svg" viewBox="0 0 52 52" aria-hidden="true">
                <circle class="checkmark-circle" cx="26" cy="26" r="25" fill="none"></circle>
                <path class="checkmark-check" fill="none" d="M14 27 L22 35 L38 18"></path>
            </svg>
        `;

        container.appendChild(successMark);

        setTimeout(() => {
            successMark.style.opacity = "0";
            setTimeout(() => successMark.remove(), 500);
        }, 2000);
    }

    function initScrollReveal() {
        const revealElements = document.querySelectorAll(".step-card, .feature, .stat-card, .feature-card, .impact-card, .preview-panel, .auth-panel");

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.animation = "asphaltReveal 0.6s var(--ease-road, ease) forwards";
                    entry.target.style.opacity = "0";
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

        revealElements.forEach(el => {
            el.style.opacity = "0";
            observer.observe(el);
        });
    }

    class VoiceWaveform {
        constructor(container) {
            this.container = container;
            this.canvas = null;
            this.ctx = null;
            this.animationId = null;
            this.isRecording = false;
        }

        init() {
            this.canvas = document.createElement("canvas");
            this.canvas.width = this.container.clientWidth;
            this.canvas.height = 40;
            this.canvas.style.width = "100%";
            this.canvas.style.height = "40px";
            this.canvas.style.borderRadius = "4px";
            this.canvas.style.background = "var(--surface-gray, #f8fafc)";
            this.container.appendChild(this.canvas);
            this.ctx = this.canvas.getContext("2d");
        }

        start() {
            this.isRecording = true;
            this.animate();
        }

        stop() {
            this.isRecording = false;
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.clear();
            }
        }

        animate() {
            if (!this.isRecording || !this.ctx || !this.canvas) return;

            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            const barCount = 40;
            const barWidth = this.canvas.width / barCount - 2;

            for (let i = 0; i < barCount; i++) {
                let height = Math.random() * this.canvas.height;
                const center = Math.abs(i - barCount / 2);
                height = height * (1 - center / barCount * 0.5);

                const x = i * (barWidth + 2);
                const y = (this.canvas.height - height) / 2;

                this.ctx.fillStyle = `hsl(45, 100%, ${50 + height / 2}%)`;
                this.ctx.fillRect(x, y, barWidth, height);
            }

            this.animationId = requestAnimationFrame(() => this.animate());
        }

        clear() {
            if (this.ctx && this.canvas) {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            }
        }
    }

    function animateNumber(element, target, duration = 1000) {
        let start = 0;
        const increment = target / (duration / 16);

        const updateNumber = () => {
            start += increment;
            if (start >= target) {
                element.textContent = target;
                return;
            }
            element.textContent = Math.floor(start);
            requestAnimationFrame(updateNumber);
        };

        updateNumber();
    }

    function showHazardAlert(hazard) {
        const toast = document.createElement("div");
        toast.className = "hazard-alert-toast";

        const severityText = hazard.severity_score >= 8 ? "CRITICAL" :
            hazard.severity_score >= 6 ? "HIGH" : "MEDIUM";

        toast.innerHTML = `
            <div class="hazard-alert-icon" aria-hidden="true">⚠️</div>
            <div class="hazard-alert-content">
                <strong>New ${hazard.hazard_type} reported</strong>
                <span>${severityText} severity • ${hazard.location || "Near you"}</span>
            </div>
            <button class="hazard-alert-close" type="button" aria-label="Close alert">×</button>
        `;

        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add("show"), 10);

        setTimeout(() => {
            toast.classList.remove("show");
            setTimeout(() => toast.remove(), 300);
        }, 6000);

        toast.querySelector(".hazard-alert-close").onclick = () => {
            toast.classList.remove("show");
            setTimeout(() => toast.remove(), 300);
        };
    }

    document.addEventListener("DOMContentLoaded", () => {
        ensureStyle();
        initHazardCardRumble();
        initButtonBump();
        initScrollReveal();

        window.animateNewMarker = animateNewMarker;
        window.showSuccessAnimation = showSuccessAnimation;
        window.animateNumber = animateNumber;
        window.showHazardAlert = showHazardAlert;
        window.VoiceWaveform = VoiceWaveform;
    });
})();
