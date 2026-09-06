(async function() {
    // যদি অলরেডি এলিমেন্টগুলো থাকে তবে টগল করবে
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

    let lastCurlCommand = "No cURL captured yet. Please perform a train search on Rail Seva.";

    // আধুনিক গ্লাসমরফিজম এবং রেসপন্সিভ স্টাইল ইনজেক্ট করা
    const styleTag = document.createElement('style');
    styleTag.innerHTML = `
        @keyframes cybersh-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        #cybersh-logger-overlay {
            resize: both;
            overflow-y: auto !important;
            overflow-x: hidden;
            min-width: 320px;
            min-height: 380px;
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
        }
        #cybersh-logger-overlay::-webkit-scrollbar {
            width: 5px;
        }
        #cybersh-logger-overlay::-webkit-scrollbar-thumb {
            background: rgba(56, 189, 248, 0.3);
            border-radius: 10px;
        }
        #cybersh-logger-overlay button:hover {
            filter: brightness(1.15);
            transition: filter 0.2s ease;
        }
    `;
    document.head.appendChild(styleTag);

    // ফ্লোটিং মিনিমাইজড অবতার (Avatar)
    const avatarHtml = `
    <div id="cybersh-floating-avatar" style="position: fixed; bottom: 24px; right: 24px; width: 52px; height: 52px; border-radius: 50%; z-index: 999998; box-shadow: 0 10px 25px rgba(0,0,0,0.7); border: 2px solid #38bdf8; cursor: pointer; overflow: hidden; background: #0f172a; display: none; touch-action: none;">
        <img src="https://avatars.githubusercontent.com/u/85736436?v=4" alt="CyberSH" style="width: 100%; height: 100%; object-fit: cover; pointer-events: none;" />
    </div>`;

    // ইউজার ইন্টারফেস ওভারলে (UI Overlay)
    const overlayHtml = `
    <div id="cybersh-logger-overlay" style="position: fixed; top: 15px; left: 50%; transform: translateX(-50%); width: 92%; max-width: 450px; height: auto; max-height: 85vh; background: linear-gradient(145deg, rgba(15, 23, 42, 0.96), rgba(2, 6, 23, 0.98)); color: #f8fafc; z-index: 999999; border-radius: 20px; padding: 18px; font-family: system-ui, -apple-system, sans-serif; font-size: 12px; box-shadow: 0 30px 60px rgba(0, 0, 0, 0.75), 0 0 20px rgba(56, 189, 248, 0.12); display: flex; flex-direction: column; border: 1px solid rgba(56, 189, 248, 0.3);">
        
        <!-- Header / Drag Handle -->
        <div id="cybersh-drag-handle" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(51, 65, 85, 0.5); padding-bottom: 12px; margin-bottom: 12px; cursor: grab; flex-shrink: 0;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <div style="background: rgba(56, 189, 248, 0.12); padding: 7px; border-radius: 10px; border: 1px solid rgba(56, 189, 248, 0.25);">
                    <span style="font-size: 15px;">🚆</span>
                </div>
                <div>
                    <strong style="color: #38bdf8; font-size: 13px; letter-spacing: 0.3px;">Rail Trip cURL Grabber</strong>
                    <div style="font-size: 9px; color: #94a3b8; font-weight: 500;">Shohoz API Edition</div>
                </div>
            </div>
            <div style="display: flex; gap: 6px; align-items: center;">
                <button id="cybersh-btn-minimize" style="background: rgba(56, 189, 248, 0.1); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); width: 26px; height: 26px; border-radius: 6px; display: flex; align-items: center; justify-content: center; cursor: pointer;" title="Minimize">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
            </div>
        </div>

        <!-- Terminal cURL Output Window -->
        <div style="font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; font-weight: 600;">Captured cURL Command:</div>
        <div id="cybersh-log-content" style="overflow-y: auto; flex-grow: 1; min-height: 120px; max-height: 220px; word-break: break-all; white-space: pre-wrap; line-height: 1.4; background: rgba(2, 6, 23, 0.85); padding: 12px; border-radius: 10px; border: 1px solid rgba(51, 65, 85, 0.6); font-family: 'SF Mono', Consolas, 'Courier New', Courier, monospace; font-size: 11px; color: #4ade80; flex-shrink: 0;">Waiting for search-trips request...</div>

        <!-- Action Footer -->
        <div style="margin-top: 12px; display: flex; gap: 8px; flex-shrink: 0;">
            <button id="cybersh-btn-copy" style="flex: 1; background: linear-gradient(135deg, #0284c7, #0369a1); color: white; border: none; padding: 10px; border-radius: 9px; font-size: 11px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.4);">Copy cURL</button>
        </div>
    </div>`;

    const container = document.createElement('div');
    container.innerHTML = overlayHtml + avatarHtml;
    document.body.appendChild(container);

    const overlay = document.getElementById('cybersh-logger-overlay');
    const avatar = document.getElementById('cybersh-floating-avatar');
    const logContent = document.getElementById('cybersh-log-content');
    const copyBtn = document.getElementById('cybersh-btn-copy');

    // ৩ সেকেন্ড পর অটো মিনিমাইজ হয়ে যাবে
    setTimeout(() => {
        if (overlay && overlay.style.display !== 'none') {
            overlay.style.display = 'none';
            avatar.style.display = 'block';
        }
    }, 3000);

    // Minimize & Restore Handlers
    document.getElementById('cybersh-btn-minimize').onclick = () => {
        overlay.style.display = 'none';
        avatar.style.display = 'block';
    };

    avatar.onclick = () => {
        avatar.style.display = 'none';
        overlay.style.display = 'flex';
    };

    // Copy cURL Handler
    copyBtn.onclick = () => {
        navigator.clipboard.writeText(lastCurlCommand).then(() => {
            copyBtn.innerText = "Copied to Clipboard!";
            copyBtn.style.background = "#16a34a";
            setTimeout(() => {
                copyBtn.innerText = "Copy cURL";
                copyBtn.style.background = "#0284c7";
            }, 2000);
        }).catch(() => {
            copyBtn.innerText = "Failed to Copy";
        });
    };

    // XMLHttpRequest ইন্টারসেপ্ট করে Shohoz API ধরতে হবে
    const XHR = window.XMLHttpRequest;
    function customXHR() {
        const xhr = new XHR();
        const originalOpen = xhr.open;
        const originalSetRequestHeader = xhr.setRequestHeader;
        let requestMethod = 'GET';
        let requestURL = '';
        const requestHeaders = {};

        xhr.open = function(method, url) {
            requestMethod = method;
            requestURL = url;
            return originalOpen.apply(this, arguments);
        };

        xhr.setRequestHeader = function(header, value) {
            requestHeaders[header] = value;
            return originalSetRequestHeader.apply(this, arguments);
        };

        xhr.addEventListener('load', function() {
            // চেক করা হচ্ছে রিকোয়েস্টটি নির্দিষ্ট Shohoz API কিনা
            if (requestURL.includes('search-trips-v2')) {
                let curl = `curl '${requestURL}' \\\n  -X '${requestMethod}'`;
                
                for (let header in requestHeaders) {
                    curl += ` \\\n  -H '${header}: ${requestHeaders[header]}'`;
                }

                lastCurlCommand = curl;
                logContent.innerText = curl;
                
                // পপআপ হাইড থাকলে অটো পপআপ ওপেন করে দেখাবে
                if (overlay.style.display === 'none') {
                    avatar.style.display = 'none';
                    overlay.style.display = 'flex';
                }
            }
        });
        return xhr;
    }
    window.XMLHttpRequest = customXHR;

    // Fetch API ইন্টারসেপ্ট করার জন্য (যদি সাইটটি fetch ব্যবহার করে)
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const response = await originalFetch.apply(this, args);
        try {
            const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');
            if (url.includes('search-trips-v2')) {
                const options = args[1] || {};
                const method = options.method || 'GET';
                let curl = `curl '${url}' \\\n  -X '${method}'`;

                if (options.headers) {
                    const headers = options.headers instanceof Headers ? Object.fromEntries(options.headers.entries()) : options.headers;
                    for (let header in headers) {
                        curl += ` \\\n  -H '${header}: ${headers[header]}'`;
                    }
                }

                lastCurlCommand = curl;
                logContent.innerText = curl;

                if (overlay.style.display === 'none') {
                    avatar.style.display = 'none';
                    overlay.style.display = 'flex';
                }
            }
        } catch (e) {}
        return response;
    };
})();
