(async function() {
    if (document.getElementById('aincrad-logger-overlay')) {
        document.getElementById('aincrad-logger-overlay').style.display = 'block';
        return;
    }

    let lastCapturedMapId = null;
    let capturedAuthToken = "";

    const overlayHtml = `
    <div id="aincrad-logger-overlay" style="position: fixed; top: 10px; left: 10px; right: 10px; max-height: 55vh; background: rgba(15, 23, 42, 0.95); color: #f8fafc; z-index: 999999; border-radius: 12px; padding: 12px; font-family: monospace; font-size: 11px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); display: flex; flex-direction: column; border: 1px solid #334155;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 8px; margin-bottom: 8px;">
            <strong style="color: #38bdf8;">🗺️ DLRMS Auth Fixer</strong>
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

    log("Initialized. Monitoring network headers...");

    // 1. Hook Fetch to catch Bearer Token from request headers
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        try {
            const url = args[0];
            const options = args[1] || {};
            
            if (typeof url === 'string' && url.includes('/core-api/api/public/maps')) {
                if (options.headers) {
                    // Handle Headers object or plain object
                    if (options.headers instanceof Headers) {
                        capturedAuthToken = options.headers.get('authorization') || options.headers.get('Authorization');
                    } else if (typeof options.headers === 'object') {
                        capturedAuthToken = options.headers['authorization'] || options.headers['Authorization'];
                    }
                }
                if (capturedAuthToken) {
                    log("Authorization token successfully captured!", "success");
                }
            }
        } catch(e) {}

        const response = await originalFetch.apply(this, args);
        try {
            const url = args[0];
            if (typeof url === 'string' && url.includes('/core-api/api/public/maps')) {
                const clone = response.clone();
                const json = await clone.json();
                processMapApiResponse(json);
            }
        } catch (err) {}
        return response;
    };

    // 2. Hook XMLHttpRequest to catch token if sent via XHR
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
                capturedAuthToken = value;
                log("Captured Authorization token from XHR!", "success");
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
            log(`Found Map ID: ${lastCapturedMapId} (Sheet: ${record.SHEET_NO})`, "success");
            triggerDownload(lastCapturedMapId);
        }
    }

    async function triggerDownload(mapId) {
        const imageUrl = `https://gateway.dlrms.land.gov.bd/core-api/api/public/maps/image-view-file/${mapId}`;
        log(`Requesting image for ID ${mapId}...`, "info");

        // Fallback: check localStorage/sessionStorage if token wasn't intercepted yet
        if (!capturedAuthToken) {
            for (let i = 0; i < localStorage.length; i++) {
                const val = localStorage.getItem(localStorage.key(i));
                if (val && val.includes('Bearer ')) {
                    capturedAuthToken = val;
                    break;
                }
            }
        }

        try {
            const headers = {
                "accept": "application/json"
            };
            if (capturedAuthToken) {
                headers["authorization"] = capturedAuthToken;
            }

            const imgRes = await fetch(imageUrl, { headers: headers });
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

            log("Map image downloaded successfully!", "success");
        } catch (err) {
            log(`Download failed: ${err.message}`, "error");
        }
    }

    document.getElementById('aincrad-btn-download').onclick = () => {
        if (lastCapturedMapId) {
            triggerDownload(lastCapturedMapId);
        } else {
            log("No Map ID captured. Perform a search first.", "error");
        }
    };
})();
