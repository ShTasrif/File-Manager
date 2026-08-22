// Aincrad Automation Script for dlrms.land.gov.bd
(async function() {
    console.log("Aincrad Automation Initialized...");

    // Helper function to wait for elements to load
    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const waitForElement = async (selector, timeout = 10000) => {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            const el = document.querySelector(selector);
            if (el) return el;
            await.sleep(200); // placeholder or standard wait
            await wait(200);
        }
        return null;
    };

    // 1. Open / Navigate to target page if not already there
    if (!window.location.href.includes("dlrms.land.gov.bd")) {
        window.location.href = "https://dlrms.land.gov.bd/";
        return;
    }

    console.log("Page loaded. Automating dropdown selections...");
    await wait(2000);

    // Note: The site usually uses custom dropdown components (like ng-select or react-select).
    // Below is a generalized routine to trigger API capture or interact with select fields.
    
    // Intercept fetch/XHR to grab the Bearer token or automatically capture the map API response
    const originalFetch = window.fetch;
    let capturedToken = "";
    
    window.fetch = async function(...args) {
        const response = await originalFetch.apply(this, args);
        try {
            const url = args[0];
            if (typeof url === 'string' && url.includes('/core-api/api/public/maps')) {
                const clone = response.clone();
                const data = await clone.json();
                console.log("Intercepted Map API Data:", data);
                
                if (data && data.success && data.data && data.data.length > 0) {
                    const mapId = data.data[0].ID;
                    console.log(`Found Map ID: ${mapId}. Triggering image download...`);
                    downloadMapImage(mapId, args);
                }
            }
        } catch (e) {
            console.error("Fetch interception error:", e);
        }
        return response;
    };

    async function downloadMapImage(mapId, originalArgs) {
        // Extract headers (like Authorization bearer token) from original fetch call if available
        let headers = { "accept": "application/json" };
        if (originalArgs[1] && originalArgs[1].headers) {
            headers = originalArgs[1].headers;
        }

        const imageUrl = `https://gateway.dlrms.land.gov.bd/core-api/api/public/maps/image-view-file/${mapId}`;
        console.log("Fetching image from:", imageUrl);

        try {
            const imgRes = await fetch(imageUrl, { headers: headers });
            const blob = await imgRes.blob();
            
            // Create automatic download link in browser
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `map_sheet_${mapId}.jpg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);
            console.log("Map image download triggered successfully!");
        } catch (err) {
            console.error("Failed to download map image file:", err);
        }
    }

    console.log("Network hooks active. Please perform your search or let the script execute selections.");
})();
