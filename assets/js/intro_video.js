(function() {
    var introOverlay = document.getElementById('introOverlay');
    var introVideo = document.getElementById('introVideo');
    var body = document.body;
    var sessionKey = 'homeIntroPlayed';

    if (!introOverlay || !introVideo || !body) {
        return;
    }

    function isInternalReferrer() {
        if (!document.referrer) {
            return false;
        }

        try {
            return new URL(document.referrer).origin === window.location.origin;
        } catch (e) {
            return false;
        }
    }

    function hasPlayedInSession() {
        try {
            return window.sessionStorage.getItem(sessionKey) === '1';
        } catch (e) {
            return false;
        }
    }

    function markPlayed() {
        try {
            window.sessionStorage.setItem(sessionKey, '1');
        } catch (e) {
            // Ignore storage failures and keep graceful fallback behavior.
        }
    }

    function enterHome() {
        if (!introOverlay) {
            return;
        }

        body.classList.remove('intro-playing');
        introOverlay.remove();
    }

    if (isInternalReferrer() || hasPlayedInSession()) {
        enterHome();
        return;
    }

    markPlayed();
    body.classList.add('intro-playing');

    var playPromise = introVideo.play();
    if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(function() {
            enterHome();
        });
    }

    introVideo.addEventListener('ended', enterHome, { once: true });
    introVideo.addEventListener('error', enterHome, { once: true });
})();