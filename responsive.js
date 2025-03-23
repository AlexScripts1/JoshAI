// Responsive handling and optimizations
export const initResponsive = () => {
    // Handle viewport height for mobile browsers
    const setViewportHeight = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    // Initial set
    setViewportHeight();

    // Update on resize and orientation change
    window.addEventListener('resize', debounce(setViewportHeight, 250));
    window.addEventListener('orientationchange', () => {
        setTimeout(setViewportHeight, 100);
    });

    // Handle keyboard appearance on mobile
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        const input = document.getElementById('user-input');
        const messagesContainer = document.getElementById('chat-messages');

        input.addEventListener('focus', () => {
            setTimeout(() => {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }, 300);
        });
    }

    // Optimize scroll performance
    const messagesContainer = document.getElementById('chat-messages');
    let scrollTimeout;
    
    messagesContainer.addEventListener('scroll', () => {
        if (!messagesContainer.classList.contains('is-scrolling')) {
            messagesContainer.classList.add('is-scrolling');
        }
        
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            messagesContainer.classList.remove('is-scrolling');
        }, 150);
    }, { passive: true });

    // Handle device orientation changes
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            const messagesContainer = document.getElementById('chat-messages');
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 100);
    });
};

// Utility function for debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}