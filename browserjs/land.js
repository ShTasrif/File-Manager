(async function() {
    // If the floating avatar already exists, just make sure the panel opens back up
    const existingAvatar = document.getElementById('cybersh-floating-avatar');
    const existingOverlay = document.getElementById('cybersh-logger-overlay');
    
    if (existingAvatar && existingOverlay) {
        existingOverlay.style.display = 'flex';
        existingAvatar.style.display = 'none';
        return;
    }

    let lastCapturedMapId = null;
    let capturedAuthToken = "";

    // 1. Inject Floating Circular Avatar (Minimized State)
    const avatarHtml = `
    <div id="cybersh-floating-avatar" style="position: fixed; bottom: 20px; right: 20px; width: 50px; height: 50px; border-radius: 50%; z-index: 999998; box-shadow: 0 4px 12px rgba(0,0,0,0.4); border: 2px solid #38bdf8; cursor: pointer; overflow: hidden; background: #0f172a; display: none; transition: transform 0.2s ease;">
        <img src="https://avatars.githubusercontent.com/u/85736436?v=4" alt="CyberSH" style="width: 100%; height: 100%; object-fit: cover;" />
    </div>`;

    // 2. Inject Main Professional UI Overlay
    const overlayHtml = `
    <div id="cybersh-logger-overlay" style="position: fixed; top: 15px; left: 50%; transform: translateX(-50%); width: 92%; max-width: 420px; max-height: 60vh; background: linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.98)); color: #f8fafc; z-index: 999999; border-radius: 16px; padding: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.04); display: flex; flex-direction: column; border: 1px solid rgba(56, 189, 248, 0.3); backdrop-filter: blur(12px);">
        
        <!-- Header / Drag Handle -->
        <div id="cybersh-drag-handle" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(51, 65, 85, 0.8); padding-bottom: 10px; margin-bottom: 10px; cursor: grab;">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 16px;">🛡️</span>
                <div>
                    <strong style="color: #38bdf8; font-size: 13px; letter-spacing: 0.5px;">CyberSH Mouza Map</strong>
                    <div style="font-size: 9px; color: #94a3b8;">Background Active v2.2</div>
                </div>
            </div>
            <div style="display: flex; gap: 6px;">
                <button id="cybersh-btn-support" style="background: rgba(14, 165, 233, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 600; cursor: pointer; text-decoration: none;">Support</button>
                <button id="cybersh-btn-minimize" style="background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(248, 113, 113, 0.4); padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 600; cursor: pointer;" title="Minimize to Avatar">✕</button>
            </div>
        </div>

        <!-- Log Terminal Window -->
        <div id="cybersh-log-content" style="overflow-y: auto; flex-grow: 1; max-height: 35vh; word-break: break-all; white-space: pre-wrap; line-height: 1.5; background: rgba(2, 6, 23, 0.6); padding: 10px; border-radius: 8px; border: 1px solid rgba(51, 65, 85, 0.5); font-family: 'Courier New', Courier, monospace; font-size: 11px;"></div>

        <!-- Action Footer -->
        <div style="margin-top: 10px; display: flex; gap: 8px;">
            <button id="cybersh-btn-download" style="flex: 1; background: linear-gradient(135deg, #0284c7, #0369a1); color: white; border: none; padding: 8px; border-radius: 8px; font-size: 11px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);">Download Last Map</button>
        </div>
    </div>`;

    const container = document.createElement('div');
    container.innerHTML = overlayHtml + avatarHtml;
    document.body.appendChild(container);

    const overlay = document.getElementById('cybersh-logger-overlay');
    const avatar = document.getElementById('cybersh-floating-avatar');
    const logContent = document.getElementById('cybersh-log-content');

    function log(msg, type = 'info') {
        const color = type === 'error' ? '#f87171' : type === 'success' ? '#4ade80' : '#cbd5e1';
        logContent.innerHTML += `<div style="color: ${color}; margin-bottom: 4px;">[${new Date().toLocaleTimeString()}] ${msg}</div>`;
        logContent.scrollTop = logContent.scrollHeight;
        console.log(`[CyberSH] ${msg}`);
    }

    // Minimize to Avatar
    document.getElementById('cybersh-btn-minimize').onclick = () => {
        overlay.style.display = 'none';
        avatar.style.display = 'block';
        log("Minimized to background avatar. Script is still active.");
    };

    // Restore on Avatar Click
    avatar.onclick = () => {
        avatar.style.display = 'none';
        overlay.style.display = 'flex';
    };

    // Support Link Action
    document.getElementById('cybersh-btn-support').onclick = (e) => {
        e.preventDefault();
        window.open('https://t.me/cybersh_official', '_blank');
    };

    // Make Panel Draggable (Touch & Mouse Support)
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

    log("CyberSH Mouza Tool Initialized & Running in Background.");

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
                log("Auth token secured.", "success");
            }
            return originalSetRequestHeader.apply(this, arguments);
        };

        xhr.addEventListener('load', function() {
            if (requestURL.includes('/core-api/api/public/maps') && xhr.status === 200) {
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
        if (json && json.success && json.data && json.data.length > 0) {
            const record = json.data[0];
            lastCapturedMapId = record.ID;
            log(`Target Map ID found: ${lastCapturedMapId} (Sheet: ${record.SHEET_NO})`, "success");
            triggerDownload(lastCapturedMapId);
        }
    }

    async function triggerDownload(mapId) {
        const imageUrl = `https://gateway.dlrms.land.gov.bd/core-api/api/public/maps/image-view-file/${mapId}`;
        log(`Processing image download for ID ${mapId}...`, "info");

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

            const blob = await imgRes.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `CyberSH_Map_${mapId}.jpg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);

            log("Map image downloaded successfully!", "success");
        } catch (err) {
            log(`Download error: ${err.message}`, "error");
        }
    }

    document.getElementById('cybersh-btn-download').onclick = () => {
        if (lastCapturedMapId) {
            triggerDownload(lastCapturedMapId);
        } else {
            log("No Map ID available. Perform search first.", "error");
        }
    };
})();
