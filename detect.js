// New detect.js - Replace your current detect.js with this
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
    
    // Check URL parameters for manual override
    const urlParams = new URLSearchParams(window.location.search);
    const forceDesktop = urlParams.get('desktop') === 'true';
    const forceMobile = urlParams.get('mobile') === 'true';
    
    let useMobileCSS = false;
    
    if (forceMobile) {
        useMobileCSS = true;
    } else if (forceDesktop) {
        useMobileCSS = false;
    } else {
        useMobileCSS = shouldUseMobileVersion();
    }
    
    // Load the appropriate CSS file
    const cssFile = useMobileCSS ? 'mobile.css' : 'desktop.css';
    const linkElement = document.createElement('link');
    linkElement.rel = 'stylesheet';
    linkElement.href = cssFile;
    
    // Remove any existing stylesheet links (except this one)
    document.addEventListener('DOMContentLoaded', function() {
        const existingLinks = document.querySelectorAll('link[rel="stylesheet"]');
        existingLinks.forEach(link => {
            if (link.href.includes('style.css')) {
                link.remove();
            }
        });
        
        // Add our CSS
        document.head.appendChild(linkElement);
        
        // Update button text for mobile version
        if (useMobileCSS) {
            const monthNav = document.querySelector('.month-nav');
            if (monthNav) {
                setTimeout(() => {
                    const prevBtn = monthNav.querySelector('button:first-child');
                    const nextBtn = monthNav.querySelector('button:last-child');
                    if (prevBtn) prevBtn.textContent = '← Prev';
                    if (nextBtn) nextBtn.textContent = 'Next →';
                }, 100);
            }
        }
        
        // Add version switcher
        const body = document.body;
        const switchLink = document.createElement('div');
        switchLink.style.cssText = `
            position: fixed;
            bottom: 10px;
            ${useMobileCSS ? 'left' : 'right'}: 10px;
            background: #402924;
            color: #FAE3B0;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            cursor: pointer;
            z-index: 9999;
            border: 1px solid #FAE3B0;
        `;
        
        if (useMobileCSS) {
            switchLink.innerHTML = '🖥️ Desktop Version';
            switchLink.onclick = () => {
                window.location.href = window.location.pathname + '?desktop=true';
            };
        } else {
            switchLink.innerHTML = '📱 Mobile Version';
            switchLink.onclick = () => {
                window.location.href = window.location.pathname + '?mobile=true';
            };
        }
        
        body.appendChild(switchLink);
    });
})();
