(async function() {
    // Prevent multiple injections
    if (document.getElementById('aincrad-logger-overlay')) {
        document.getElementById('aincrad-logger-overlay').style.display = 'block';
        return;
    }

    // 1. Inject Floating UI (HTML & CSS)
    const overlayHtml = `
    <div id="aincrad-logger-overlay" style="position: fixed; top: 10px; left: 10px; right: 10px; max-height: 50vh; background: rgba(15, 23, 42, 0.95); color: #f8fafc; z-index: 999999; border-radius: 12px; padding: 12px; font-family: monospace; font-size: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); display: flex; flex-direction: column; border: 1px solid #334155;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 8px; margin-bottom: 8px;">
            <strong style="color: #38bdf8;">🗺️ DLRMS Automation & Logs</strong>
            <div>
                <button id="aincrad-btn-search" style="background: #22c55e; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; margin-right: 4px; cursor: pointer;">Auto Search</button>
                <button id="aincrad-btn-close" style="background: #ef4444; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;">Close</button>
            </div>
        </div>
        <div id="aincrad-log-content" style="overflow-y: auto; flex-grow: 1; max-height: 35vh; word-break: break-all; white-space: pre-wrap; line-height: 1.4;"></div>
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

    log("Aincrad Mobile UI Loaded successfully.");

    // 2. Navigation Check
    if (!window.location.href.includes("dlrms.land.gov.bd")) {
        log("Redirecting to dlrms.land.gov.bd...", "info");
        window.location.href = "https://dlrms.land.gov.bd/";
        return;
    }

    const wait = (ms) => new Promise(res => setTimeout(res, ms));
    await wait(1000);

    // 3. Network Interceptor for Fetch/XHR
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const response = await originalFetch.apply(this, args);
        try {
            const url = args[0];
            if (typeof url === 'string' && url.includes('/core-api/api/public/maps')) {
                const clone = response.clone();
                const json = await clone.json();
                log("Captured Map API Response successfully!", "success");

                if (json && json.success && json.data && json.data.length > 0) {
                    const mapRecord = json.data[0];
                    const mapId = mapRecord.ID;
                    log(`Target Map ID found: ${mapId} (Sheet: ${mapRecord.SHEET_NO})`, "success");
                    await downloadMapImage(mapId, args[1]);
                }
            }
        } catch (err) {
            log(`Interceptor error: ${err.message}`, "error");
        }
        return response;
    };

    // 4. Image Download Handler
    async function downloadMapImage(mapId, requestOptions) {
        let headers = { "accept": "application/json" };
        if (requestOptions && requestOptions.headers) {
            headers = requestOptions.headers;
        }

        const imageUrl = `https://gateway.dlrms.land.gov.bd/core-api/api/public/maps/image-view-file/${mapId}`;
        log(`Fetching image file for ID ${mapId}...`, "info");

        try {
            const imgResponse = await fetch(imageUrl, { headers: headers });
            if (!imgResponse.ok) throw new Error(`HTTP status ${imgResponse.status}`);

            const blob = await imgResponse.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `dlrms_map_${mapId}.jpg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);

            log("Map image download triggered successfully!", "success");
        } catch (error) {
            log(`Download failed: ${error.message}`, "error");
        }
    }

    // 5. Auto Search Button Handler inside UI
    document.getElementById('aincrad-btn-search').onclick = async () => {
        log("Attempting to trigger search action...", "info");
        // Look for search button on page (e.g., matching text 'সার্চ' or class 'search')
        const buttons = Array.from(document.querySelectorAll('button'));
        const searchBtn = buttons.find(b => b.innerText.includes('সার্চ') || b.innerHTML.includes('search') || b.className.includes('search'));
        
        if (searchBtn) {
            searchBtn.click();
            log("Search button clicked programmatically.", "success");
        } else {
            log("Search button not found automatically. Please click it manually.", "error");
        }
    };

    log("Ready. Select dropdown options or tap 'Auto Search'.");
})();
