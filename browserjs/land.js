(async function() {
    if (document.getElementById('aincrad-logger-overlay')) {
        document.getElementById('aincrad-logger-overlay').style.display = 'block';
        return;
    }

    let lastCapturedMapId = null;
    let lastRequestHeaders = { "accept": "application/json" };

    const overlayHtml = `
    <div id="aincrad-logger-overlay" style="position: fixed; top: 10px; left: 10px; right: 10px; max-height: 55vh; background: rgba(15, 23, 42, 0.95); color: #f8fafc; z-index: 999999; border-radius: 12px; padding: 12px; font-family: monospace; font-size: 11px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); display: flex; flex-direction: column; border: 1px solid #334155;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 8px; margin-bottom: 8px;">
            <strong style="color: #38bdf8;">🗺️ DLRMS Debugger</strong>
            <div>
                <button id="aincrad-btn-download" style="background: #3b82f6; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 10px; margin-right: 4px; cursor: pointer;">Download Map</button>
                <button id="aincrad-btn-close" style="background: #ef4444; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 10px; cursor: pointer;">X</button>
            </div>
        </div>
        <div id="aincrad-log-content" style="overflow-y: auto; flex-grow: 1; max-height: 38vh; word-break: break-all; white-space: pre-wrap; line-height: 1.4;"></div>
    </div>`;

    const div = document.createElement('div');
    div.innerHTML = overlayHtml;
    document.body.appendChild(div);

    const logContent = document.getElementById('aincrad-log-content');
    function log(msg, type = 'info') {
        const color = type === 'error' ? '#f87171' : type === 'success' ? '#4ade80' : '#cbd5e1';
        logContent.innerHTML += `<div style="color: ${color}; margin-bottom: 4px;">[${new Date().toLocaleTimeString()}] ${msg}</div>`;
        logContent.scrollTop = logContent.scrollHeight;
        console.log(`[Aincrad] ${msg}`);
    }

    document.getElementById('aincrad-btn-close').onclick = () => {
        document.getElementById('aincrad-logger-overlay').remove();
    };

    log("UI Initialized & Monitoring Network...");

    // 1. Hook into Fetch API
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const response = await originalFetch.apply(this, args);
        try {
            const url = args[0];
            if (typeof url === 'string' && url.includes('/core-api/api/public/maps')) {
                if (args[1] && args[1].headers) {
                    lastRequestHeaders = args[1].headers;
                }
                const clone = response.clone();
                const json = await clone.json();
                processMapApiResponse(json);
            }
        } catch (err) {
            // Ignore non-json responses
        }
        return response;
    };

    // 2. Hook into XMLHttpRequest (XHR) for Angular/Axios safety
    const XHR = window.XMLHttpRequest;
    function activeXHR() {
        const xhr = new XHR();
        const originalOpen = xhr.open;
        let requestURL = '';
        
        xhr.open = function(method, url) {
            requestURL = url;
            return originalOpen.apply(this, arguments);
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
    window.XMLHttpRequest = activeXHR;

    function processMapApiResponse(json) {
        log("Map API response intercepted!", "success");
        if (json && json.success && json.data && json.data.length > 0) {
            const record = json.data[0];
            lastCapturedMapId = record.ID;
            log(`Found Map ID: ${lastCapturedMapId} (Sheet: ${record.SHEET_NO})`, "success");
            triggerDownload(lastCapturedMapId);
        }
    }

    async function triggerDownload(mapId) {
        const imageUrl = `https://gateway.dlrms.land.gov.bd/core-api/api/public/maps/image-view-file/${mapId}`;
        log(`Downloading image from ID ${mapId}...`, "info");

        try {
            // Include authorization headers if captured
            const imgRes = await fetch(imageUrl, {
                headers: lastRequestHeaders
            });

            if (!imgRes.ok) throw new Error(`HTTP error status: ${imgRes.status}`);

            const blob = await imgRes.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `dlrms_map_${mapId}.jpg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);

            log("Image file downloaded successfully!", "success");
        } catch (err) {
            log(`Download failed: ${err.message}. Try clicking 'Download Map' manually.`, "error");
        }
    }

    document.getElementById('aincrad-btn-download').onclick = () => {
        if (lastCapturedMapId) {
            log(`Manual download triggered for Map ID: ${lastCapturedMapId}`);
            triggerDownload(lastCapturedMapId);
        } else {
            log("No Map ID captured yet. Please perform a search first.", "error");
        }
    };
})();
