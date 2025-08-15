// detect.js - Add this to your main index.html
(function() {
    function isMobileDevice() {
        return (typeof window.orientation !== "undefined") || (navigator.userAgent.indexOf('IEMobile') !== -1);
    }
    
    function isSmallScreen() {
        return window.innerWidth <= 768;
    }
    
    function shouldUseMobileVersion() {
        return isMobileDevice() || isSmallScreen();
    }
    
    // Check if we're already on the mobile site
    const isOnMobileSite = window.location.pathname.includes('/mobile/');
    const isOnDesktopSite = !isOnMobileSite;
    
    if (shouldUseMobileVersion() && isOnDesktopSite) {
        // Redirect to mobile version
        window.location.href = window.location.origin + '/mobile/';
    } else if (!shouldUseMobileVersion() && isOnMobileSite) {
        // Redirect to desktop version
        window.location.href = window.location.origin + '/';
    }
    
    // Add version switcher links
    window.addEventListener('DOMContentLoaded', function() {
        const body = document.body;
        
        if (isOnMobileSite) {
            // Add "View Desktop Version" link
            const switchLink = document.createElement('div');
            switchLink.style.cssText = `
                position: fixed;
                bottom: 10px;
                left: 10px;
                background: #402924;
                color: #FAE3B0;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 12px;
                cursor: pointer;
                z-index: 9999;
                border: 1px solid #FAE3B0;
            `;
            switchLink.innerHTML = '🖥️ Desktop Version';
            switchLink.onclick = () => {
                window.location.href = window.location.origin + '/';
            };
            body.appendChild(switchLink);
        } else {
            // Add "View Mobile Version" link
            const switchLink = document.createElement('div');
            switchLink.style.cssText = `
                position: fixed;
                bottom: 10px;
                right: 10px;
                background: #402924;
                color: #FAE3B0;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 12px;
                cursor: pointer;
                z-index: 9999;
                border: 1px solid #FAE3B0;
            `;
            switchLink.innerHTML = '📱 Mobile Version';
            switchLink.onclick = () => {
                window.location.href = window.location.origin + '/mobile/';
            };
            body.appendChild(switchLink);
        }
    });
})();