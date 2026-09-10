(function () {
    'use strict';

    function rand(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

    // ─── 1. SPLASH SCREEN ────────────────────────────────────────────────────
    function showSplash() {
        if (sessionStorage.getItem('splashShown')) return;
        sessionStorage.setItem('splashShown', '1');
        const el = document.createElement('div');
        el.id = 'splashScreen';
        // Spotify logo SVG
        el.innerHTML = `
            <div class="splash-content">
                <div class="splash-logo">
                    <svg viewBox="0 0 24 24" fill="white" width="56" height="56" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                </div>
                <h1 class="splash-title">Spotify Evaluator</h1>
                <div class="splash-loader"><div class="splash-loader-bar"></div></div>
            </div>`;
        document.body.appendChild(el);
        setTimeout(function () {
            el.classList.add('fade-out');
            setTimeout(function () { el.remove(); }, 500);
        }, 1800);
    }

    // ─── 2. SOCIAL PROOF NOTIFICATIONS ───────────────────────────────────────
    var NAMES = ['Ana G.', 'Carlos M.', 'Sofía R.', 'Miguel A.', 'Laura P.', 'Diego F.', 'Valentina L.', 'Sebastián T.', 'Camila N.', 'Andrés B.', 'Mariana V.', 'José C.', 'Isabella M.', 'Roberto H.', 'Fernanda S.'];
    var CITIES = ['Buenos Aires', 'Ciudad de México', 'Bogotá', 'Lima', 'Santiago', 'Caracas', 'Montevideo', 'Quito', 'Medellín', 'Guadalajara'];

    function showSocialProof() {
        var name = NAMES[rand(0, NAMES.length - 1)];
        var city = CITIES[rand(0, CITIES.length - 1)];
        var amount = (rand(100, 499) + rand(0, 99) / 100).toFixed(2);
        var mins = rand(1, 15);
        var el = document.createElement('div');
        el.className = 'social-proof-toast';
        el.innerHTML = '<div class="sp-avatar">' + name[0] + '</div>'
            + '<div class="sp-text"><strong>' + name + '</strong> de ' + city + '<br>'
            + '<span>retiró <strong>$' + amount + '</strong> hace ' + mins + ' min</span></div>'
            + '<div class="sp-icon">💸</div>';
        document.body.appendChild(el);
        setTimeout(function () { el.classList.add('sp-visible'); }, 100);
        setTimeout(function () {
            el.classList.remove('sp-visible');
            setTimeout(function () { el.remove(); }, 400);
        }, 4500);
    }

    function startSocialProof() {
        setTimeout(function () {
            showSocialProof();
            function loop() {
                setTimeout(function () { showSocialProof(); loop(); }, rand(18000, 32000));
            }
            loop();
        }, 6000);
    }

    // ─── 3. EXIT INTENT POPUP ────────────────────────────────────────────────
    var exitShown = false;

    function showExitPopup() {
        if (exitShown) return;
        if (window.isPremiumUser && window.isPremiumUser()) return;
        exitShown = true;
        var bal = window.getUserBalance ? window.getUserBalance() : 0;
        var overlay = document.createElement('div');
        overlay.className = 'exit-popup-overlay';
        overlay.id = 'exitPopupOverlay';
        overlay.innerHTML = '<div class="exit-popup">'
            + '<div class="exit-popup-icon">⚠️</div>'
            + '<h3 class="exit-popup-title">¡Espera!</h3>'
            + '<p class="exit-popup-msg">Tienes <strong>$' + bal.toFixed(2) + '</strong> acumulados que podrías perder si no desbloqueas tu cuenta hoy.</p>'
            + '<button class="exit-popup-cta" id="exitCtaBtn">🔓 Desbloquear y Sacar Ahora</button>'
            + '<br><button class="exit-popup-dismiss" id="exitDismissBtn">Salir sin retirar</button>'
            + '</div>';
        document.body.appendChild(overlay);
        setTimeout(function () { overlay.classList.add('show'); }, 30);
        overlay.querySelector('#exitCtaBtn').addEventListener('click', function () {
            overlay.remove();
            if (window.openUnlockPopup) window.openUnlockPopup();
        });
        overlay.querySelector('#exitDismissBtn').addEventListener('click', function () {
            overlay.classList.remove('show');
            setTimeout(function () { overlay.remove(); }, 300);
        });
    }

    // ─── 4. CONFETTI (Spotify colors) ────────────────────────────────────────
    var CONFETTI_COLORS = ['#1DB954', '#1ed760', '#ffffff', '#000000', '#535353', '#b3b3b3', '#1DB954'];

    window.launchConfetti = function () {
        for (var i = 0; i < 90; i++) {
            (function () {
                var el = document.createElement('div');
                el.className = 'confetti-piece';
                var size = rand(6, 13);
                el.style.cssText = 'left:' + (Math.random() * 100) + 'vw;'
                    + 'background:' + CONFETTI_COLORS[rand(0, CONFETTI_COLORS.length - 1)] + ';'
                    + 'width:' + size + 'px; height:' + size + 'px;'
                    + 'animation-duration:' + (rand(25, 45) / 10) + 's;'
                    + 'animation-delay:' + (Math.random() * 0.6) + 's;'
                    + 'border-radius:' + (Math.random() > 0.5 ? '50%' : '2px') + ';';
                document.body.appendChild(el);
                setTimeout(function () { el.remove(); }, 5000);
            })();
        }
    };

    // ─── 5. ANIMATED BALANCE COUNTER ─────────────────────────────────────────
    window.animateBalance = function (el, target, duration) {
        if (!el) return;
        duration = duration || 1200;
        var start = performance.now();
        function tick(now) {
            var p = Math.min((now - start) / duration, 1);
            var eased = 1 - Math.pow(1 - p, 3);
            el.textContent = (target * eased).toFixed(2);
            if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    };

    // ─── 6. BALANCE EXPIRY WARNING ────────────────────────────────────────────
    window.showBalanceExpiry = function () {
        if (window.isPremiumUser && window.isPremiumUser()) return;
        var bal = window.getUserBalance ? window.getUserBalance() : 0;
        if (bal <= 0) return;
        var today = new Date().toISOString().split('T')[0];
        var user = localStorage.getItem('currentUser') || 'guest';
        var key = 'expiryShown_' + user;
        if (localStorage.getItem(key) === today) return;
        localStorage.setItem(key, today);
        if (document.getElementById('expiryBanner')) return;
        var banner = document.createElement('div');
        banner.id = 'expiryBanner';
        banner.className = 'expiry-banner';
        banner.innerHTML = '<span>⚠️ Tu saldo de <strong>$' + bal.toFixed(2)
            + '</strong> expira en <strong>7 días</strong>. '
            + '<span class="expiry-link" id="expiryLink">Retíralo ahora →</span></span>'
            + '<button class="expiry-x" id="expiryX">✕</button>';
        var after = document.getElementById('countdownBanner') || document.querySelector('.header');
        if (after) after.after(banner);
        else document.body.prepend(banner);
        banner.querySelector('#expiryLink').addEventListener('click', function () {
            if (window.openUnlockPopup) window.openUnlockPopup();
        });
        banner.querySelector('#expiryX').addEventListener('click', function () { banner.remove(); });
    };

    // ─── 7. NAV BADGE ────────────────────────────────────────────────────────
    window.addNavBadge = function () {
        if (window.isPremiumUser && window.isPremiumUser()) return;
        var nav = document.getElementById('navWithdraw');
        if (!nav || nav.querySelector('.nav-badge')) return;
        nav.style.position = 'relative';
        var badge = document.createElement('span');
        badge.className = 'nav-badge';
        badge.textContent = '1';
        nav.appendChild(badge);
    };

    // ─── 8. GIFT CARD BADGE POPUP ────────────────────────────────────────────
    function setupGiftCardPopup() {
        var badge = document.querySelector('.gift-card-badge');
        if (!badge) return;
        badge.style.cursor = 'pointer';
        badge.addEventListener('click', function () {
            if (document.getElementById('giftCardPopupOverlay')) return;
            var overlay = document.createElement('div');
            overlay.id = 'giftCardPopupOverlay';
            overlay.className = 'exit-popup-overlay';
            overlay.innerHTML = '<div class="exit-popup gift-card-popup">'
                + '<button class="unlock-popup-x" id="gcPopupX" style="position:absolute;top:12px;right:14px">✕</button>'
                + '<div style="font-size:48px;margin-bottom:8px">🎁</div>'
                + '<h3 class="exit-popup-title">Tarjeta Amazon $100</h3>'
                + '<p class="exit-popup-msg">¡Tienes una <strong>tarjeta de regalo de Amazon de $100</strong> esperándote!<br><br>'
                + 'Podrás retirarla junto con tu saldo acumulado al activar tu cuenta <strong>Premium</strong>. '
                + 'El código será enviado directamente a tu correo de PayPal.</p>'
                + '<button class="unlock-cta-btn" id="gcCtaBtn">🔓 Desbloquear y Recibir mi Tarjeta</button>'
                + '<br><button class="exit-popup-dismiss" id="gcDismissBtn">Más tarde</button>'
                + '</div>';
            document.body.appendChild(overlay);
            setTimeout(function () { overlay.classList.add('show'); }, 30);

            overlay.querySelector('#gcPopupX').addEventListener('click', closeGcPopup);
            overlay.querySelector('#gcDismissBtn').addEventListener('click', closeGcPopup);
            overlay.addEventListener('click', function (e) { if (e.target === overlay) closeGcPopup(); });
            overlay.querySelector('#gcCtaBtn').addEventListener('click', function () {
                closeGcPopup();
                if (window.openUnlockPopup) window.openUnlockPopup();
            });

            function closeGcPopup() {
                overlay.classList.remove('show');
                setTimeout(function () { overlay.remove(); }, 300);
            }
        });
    }

    // ─── INIT ─────────────────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', function () {
        showSplash();
        startSocialProof();
        // setupExitIntent(); // Disabled
        // setupGiftCardPopup(); // Disabled
    });
})();
