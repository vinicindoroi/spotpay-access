// Configurações
const DAILY_LIMIT = 10; // Daily evaluation limit
const MIN_DAILY_REWARD = 110; // Minimum daily reward in dollars
const MAX_DAILY_REWARD = 190; // Maximum daily reward in dollars

// Estado da aplicação
let currentUser = null;
let userData = null;
let currentSong = null;
let hasAnswered = false;
let availableSongs = [];
let audioPlayer = null;
let isPlaying = false;
let timerInterval = null;

const songLibrary = Array.isArray(window.localSongs) ? window.localSongs : [];

// DOM Elements
const balanceElement = document.getElementById('balance');
const progressText = document.getElementById('progressText');
const evaluationActionsElement = document.getElementById('evaluationActions');
const likeBtn = document.getElementById('likeBtn');
const dislikeBtn = document.getElementById('dislikeBtn');
const quickPopupOverlay = document.getElementById('quickPopupOverlay');
const quickPopupMessage = document.getElementById('quickPopupMessage');
const popupOverlay = document.getElementById('popupOverlay');
const popupAmount = document.getElementById('popupAmount');
const popupClose = document.getElementById('popupClose');
const rewardAudio = document.getElementById('rewardAudio');

// Song card elements
const songTitle = document.getElementById('songTitle');
const songArtist = document.getElementById('songArtist');
const songCounter = document.getElementById('songCounter');
const songPlayBtn = document.getElementById('songPlayBtn');
const videoInfoElement = document.getElementById('videoInfo');
const videoInfoTimerElement = document.getElementById('videoInfoTimer');

// Motivational messages
const quickMessages = [
    '¡Buena elección! 💸',
    '¡Bien! ¡Sigue así! 🎯',
    '¡Genial! 🌟',
    '¡Perfecto! 💎',
    '¡Excelente! ⭐',
    '¡Lo estás haciendo muy bien! 🚀',
    '¡Sigue así! 💪',
    '¡Increíble! 🎉'
];

// ========== USER MANAGEMENT ==========

function getCurrentDate() {
    return new Date().toISOString().split('T')[0];
}

function loadUserData() {
    currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
        window.location.href = 'index.html';
        return false;
    }
    const users = JSON.parse(localStorage.getItem('users')) || {};
    if (!users[currentUser]) {
        users[currentUser] = {
            balance: 278.77,
            evaluatedSongs: [],
            dailyEvaluations: {},
            dailyRewards: {},
            totalEvaluations: 0,
            registrationDate: new Date().toISOString()
        };
        localStorage.setItem('users', JSON.stringify(users));
    }
    if (!users[currentUser].dailyRewards) users[currentUser].dailyRewards = {};
    if (!users[currentUser].registrationDate) {
        users[currentUser].registrationDate = new Date().toISOString();
        localStorage.setItem('users', JSON.stringify(users));
    }
    // Support old 'evaluatedVideos' key migration
    if (users[currentUser].evaluatedVideos && !users[currentUser].evaluatedSongs) {
        users[currentUser].evaluatedSongs = [];
    }
    if (!users[currentUser].evaluatedSongs) users[currentUser].evaluatedSongs = [];
    userData = users[currentUser];
    return true;
}

function saveUserData() {
    const users = JSON.parse(localStorage.getItem('users')) || {};
    users[currentUser] = userData;
    localStorage.setItem('users', JSON.stringify(users));
}

function getDailyEvaluationsCount() {
    const today = getCurrentDate();
    return userData.dailyEvaluations[today] || 0;
}

function hasReachedDailyLimit() {
    return getDailyEvaluationsCount() >= DAILY_LIMIT;
}

function incrementDailyCount() {
    const today = getCurrentDate();
    userData.dailyEvaluations[today] = (userData.dailyEvaluations[today] || 0) + 1;
    const dates = Object.keys(userData.dailyEvaluations);
    if (dates.length > 30) {
        dates.sort().slice(0, -30).forEach(date => { delete userData.dailyEvaluations[date]; });
    }
}

function allSongsEvaluated() {
    return userData.evaluatedSongs.length >= songLibrary.length;
}

function resetEvaluatedSongs() {
    userData.evaluatedSongs = [];
    saveUserData();
    updateAvailableSongs();
}

function updateAvailableSongs() {
    availableSongs = songLibrary.filter(song => !userData.evaluatedSongs.includes(song.src));
}

// ========== UI FUNCTIONS ==========

function formatCurrency(value) {
    return value.toFixed(2);
}

function updateBalance() {
    if (window.animateBalance) {
        window.animateBalance(balanceElement, userData.balance, 900);
    } else {
        balanceElement.textContent = formatCurrency(userData.balance);
    }
}

function updateProgress() {
    const count = getDailyEvaluationsCount();
    if (progressText) progressText.textContent = `${count}/${DAILY_LIMIT} completadas`;
    if (songCounter) songCounter.textContent = `Song ${count + 1} of ${DAILY_LIMIT}`;
}

function updateWithdrawProgress() {
    if (window.isPremiumUser && window.isPremiumUser()) {
        const wrap = document.getElementById('withdrawProgressWrap');
        if (wrap) wrap.classList.add('hidden');
        return;
    }
    const bal = userData.balance;
    const pct = Math.min(100, (bal / 8000) * 100);
    const fill = document.getElementById('wpFill');
    const cur = document.getElementById('wpCurrent');
    if (fill) fill.style.width = pct.toFixed(1) + '%';
    if (cur) cur.textContent = bal.toFixed(0);
}

function generateDailyReward() {
    return Math.floor(Math.random() * (MAX_DAILY_REWARD - MIN_DAILY_REWARD + 1)) + MIN_DAILY_REWARD;
}

function hasReceivedDailyReward() {
    const today = getCurrentDate();
    return userData.dailyRewards[today] === true;
}

function showQuickPopup() {
    const randomMessage = quickMessages[Math.floor(Math.random() * quickMessages.length)];
    quickPopupMessage.textContent = randomMessage;
    quickPopupOverlay.classList.add('show');
    if (rewardAudio) {
        rewardAudio.currentTime = 0;
        rewardAudio.play().catch(() => {});
    }
    setTimeout(() => { quickPopupOverlay.classList.remove('show'); }, 1000);
}

// ========== AUDIO PLAYER ==========

function stopAudio() {
    if (audioPlayer) {
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
    }
    isPlaying = false;
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    updatePlayBtn(false);
}

function updatePlayBtn(playing) {
    if (!songPlayBtn) return;
    songPlayBtn.innerHTML = playing
        ? `<svg viewBox="0 0 24 24" width="20" height="20" fill="#000"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`
        : `<svg viewBox="0 0 24 24" width="20" height="20" fill="#000"><path d="M8 5.5v13l10-6.5z"/></svg>`;
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    if (!audioPlayer) return;
    timerInterval = setInterval(() => {
        if (!audioPlayer || audioPlayer.paused) return;
        const remaining = audioPlayer.duration - audioPlayer.currentTime;
        if (videoInfoTimerElement) {
            videoInfoTimerElement.textContent = isFinite(remaining) ? `${Math.max(0, Math.ceil(remaining))}s` : '0s';
        }
    }, 500);
}

function togglePlay() {
    if (!currentSong) return;

    if (!audioPlayer) {
        audioPlayer = new Audio();
        audioPlayer.addEventListener('ended', () => {
            isPlaying = false;
            updatePlayBtn(false);
            if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
            if (videoInfoTimerElement) videoInfoTimerElement.textContent = '0s';
            showEvaluationActions();
        });
        audioPlayer.addEventListener('loadedmetadata', () => {
            if (videoInfoTimerElement) {
                videoInfoTimerElement.textContent = `${Math.ceil(audioPlayer.duration)}s`;
            }
        });
    }

    if (isPlaying) {
        audioPlayer.pause();
        isPlaying = false;
        updatePlayBtn(false);
        if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    } else {
        if (audioPlayer.src !== location.origin + '/' + currentSong.src && audioPlayer.src !== currentSong.src) {
            audioPlayer.src = currentSong.src;
        }
        audioPlayer.play().then(() => {
            isPlaying = true;
            updatePlayBtn(true);
            startTimer();
        }).catch(() => {
            // If audio fails (file not found), still allow evaluation after 3s
            isPlaying = false;
            updatePlayBtn(false);
            setTimeout(() => showEvaluationActions(), 3000);
        });
    }
}

function hideEvaluationActions() {
    if (evaluationActionsElement) evaluationActionsElement.classList.add('is-hidden');
    if (videoInfoElement) videoInfoElement.classList.remove('is-hidden');
}

function showEvaluationActions() {
    if (evaluationActionsElement) evaluationActionsElement.classList.remove('is-hidden');
    if (videoInfoElement) videoInfoElement.classList.add('is-hidden');
}

// ========== SONG LOADING ==========

function loadNewSong() {
    if (hasReachedDailyLimit()) {
        showLimitReachedMessage();
        return;
    }
    if (allSongsEvaluated()) {
        showAllSongsEvaluatedMessage();
        return;
    }
    updateAvailableSongs();
    if (availableSongs.length === 0) {
        showAllSongsEvaluatedMessage();
        return;
    }
    stopAudio();
    currentSong = availableSongs[Math.floor(Math.random() * availableSongs.length)];
    if (songTitle) songTitle.textContent = currentSong.title;
    if (songArtist) songArtist.textContent = currentSong.artist;
    hasAnswered = false;
    if (likeBtn) likeBtn.disabled = false;
    if (dislikeBtn) dislikeBtn.disabled = false;
    hideEvaluationActions();
    if (videoInfoTimerElement) videoInfoTimerElement.textContent = '0s';
    updateProgress();
    updatePlayBtn(false);
}

function showLimitReachedMessage() {
    if (likeBtn) likeBtn.disabled = true;
    if (dislikeBtn) dislikeBtn.disabled = true;
    const remaining = DAILY_LIMIT - getDailyEvaluationsCount();
    let message, icon;
    if (remaining > 0) {
        message = `Te quedan ${remaining} evaluación${remaining > 1 ? 'es' : ''} por hoy`;
        icon = '⏰';
    } else {
        message = `¡Buen trabajo! Has completado las ${DAILY_LIMIT} evaluaciones de hoy. Vuelve mañana para ganar más dinero`;
        icon = '🎯';
    }
    showInfoPopup('Límite diario alcanzado', message, icon);
}

function showAllSongsEvaluatedMessage() {
    if (likeBtn) likeBtn.disabled = true;
    if (dislikeBtn) dislikeBtn.disabled = true;
    showInfoPopup('¡Todo listo!', 'Ya evaluaste todas las canciones disponibles. ¿Quieres reiniciar para seguir ganando?', '🎉', true);
}

function showInfoPopup(title, message, icon = 'ℹ️', showResetButton = false) {
    const popup = document.createElement('div');
    popup.className = 'popup-overlay show';
    popup.innerHTML = `
        <div class="popup info-popup">
            <div class="popup-icon-large">${icon}</div>
            <h2 class="popup-title-info">${title}</h2>
            <p class="popup-message-info">${message}</p>
            <div class="popup-stats">
                <div class="stat-item">
                    <span class="stat-label">Hoy</span>
                    <span class="stat-value">${getDailyEvaluationsCount()}/${DAILY_LIMIT}</span>
                </div>
                <div class="stat-divider"></div>
                <div class="stat-item">
                    <span class="stat-label">Total</span>
                    <span class="stat-value">${userData.totalEvaluations}</span>
                </div>
            </div>
            <div class="popup-buttons">
                ${showResetButton ? '<button class="popup-btn popup-btn-primary" id="resetSongsBtn">Reiniciar y continuar</button>' : ''}
                <button class="popup-btn ${showResetButton ? 'popup-btn-secondary' : 'popup-btn-primary'}" id="closeInfoPopup">${showResetButton ? 'Cancelar' : 'OK'}</button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);
    popup.querySelector('#closeInfoPopup').addEventListener('click', () => document.body.removeChild(popup));
    if (showResetButton) {
        popup.querySelector('#resetSongsBtn').addEventListener('click', () => {
            resetEvaluatedSongs();
            document.body.removeChild(popup);
            loadNewSong();
        });
    }
    popup.addEventListener('click', (e) => { if (e.target === popup) document.body.removeChild(popup); });
}

// ========== ANSWER HANDLING ==========

function handleAnswer(isLike) {
    if (hasAnswered) return;
    if (hasReachedDailyLimit()) { showLimitReachedMessage(); return; }

    hasAnswered = true;
    if (likeBtn) likeBtn.disabled = true;
    if (dislikeBtn) dislikeBtn.disabled = true;
    stopAudio();

    userData.evaluatedSongs.push(currentSong.src);
    incrementDailyCount();
    userData.totalEvaluations++;
    updateProgress();
    showQuickPopup();

    const count = getDailyEvaluationsCount();

    if (count >= DAILY_LIMIT && !hasReceivedDailyReward()) {
        const dailyReward = generateDailyReward();
        userData.balance += dailyReward;
        const today = getCurrentDate();
        userData.dailyRewards[today] = true;
        saveUserData();
        updateBalance();
        updateWithdrawProgress();
        if (window.checkMilestone) window.checkMilestone(userData.balance, userData, saveUserData);
        setTimeout(() => {
            if (window.launchConfetti) window.launchConfetti();
            showDailyRewardPopup(dailyReward);
        }, 1200);
    } else {
        saveUserData();
        updateWithdrawProgress();
        setTimeout(() => { loadNewSong(); }, 1200);
    }
}

function showDailyRewardPopup(amount) {
    popupAmount.textContent = `+$ ${formatCurrency(amount)}`;
    document.querySelector('.popup-title').textContent = '¡Felicitaciones!';
    let popupMessage = document.querySelector('.popup-message');
    if (!popupMessage) {
        popupMessage = document.createElement('p');
        popupMessage.className = 'popup-message';
        const popup = document.querySelector('.popup');
        popup.insertBefore(popupMessage, document.getElementById('popupAmount').nextSibling);
    }
    popupMessage.textContent = `¡Completaste las ${DAILY_LIMIT} evaluaciones de hoy!`;
    popupMessage.style.display = 'block';
    popupOverlay.classList.add('show');
    if (rewardAudio) { rewardAudio.currentTime = 0; rewardAudio.play().catch(() => {}); }
}

// ========== EVENT LISTENERS ==========

if (likeBtn) likeBtn.addEventListener('click', () => handleAnswer(true));
if (dislikeBtn) dislikeBtn.addEventListener('click', () => handleAnswer(false));
if (songPlayBtn) songPlayBtn.addEventListener('click', () => togglePlay());

if (popupClose) {
    popupClose.addEventListener('click', () => {
        popupOverlay.classList.remove('show');
        const popupMessage = document.querySelector('.popup-message');
        if (popupMessage) popupMessage.style.display = 'none';
        document.querySelector('.popup-title').textContent = '¡Ganaste!';
        setTimeout(() => { showLimitReachedMessage(); }, 300);
    });
}

if (popupOverlay) {
    popupOverlay.addEventListener('click', (e) => {
        if (e.target === popupOverlay) {
            popupOverlay.classList.remove('show');
            const popupMessage = document.querySelector('.popup-message');
            if (popupMessage) popupMessage.style.display = 'none';
            document.querySelector('.popup-title').textContent = '¡Ganaste!';
            setTimeout(() => { showLimitReachedMessage(); }, 300);
        }
    });
}

// ========== INIT ==========

document.addEventListener('DOMContentLoaded', () => {
    if (new URLSearchParams(window.location.search).get('premium') === '1') {
        history.replaceState({}, '', window.location.pathname);
        if (window.setPremium) { window.setPremium(); return; }
    }
    if (!loadUserData()) return;
    if (songLibrary.length === 0) {
        showInfoPopup('No se encontraron canciones', 'Agrega tus archivos de audio en assets/audio/.', '🎵');
        if (likeBtn) likeBtn.disabled = true;
        if (dislikeBtn) dislikeBtn.disabled = true;
        return;
    }
    updateBalance();
    updateProgress();
    updateWithdrawProgress();
    updateAvailableSongs();
    loadNewSong();
    if (window.addNavBadge) window.addNavBadge();
    if (window.maybeShowWelcomePopup) window.maybeShowWelcomePopup();

    // Countdown banner
    const banner = document.getElementById('countdownBanner');
    const timerEl = document.getElementById('countdownTimer');
    const bannerBalance = document.getElementById('bannerBalance');
    if (banner && timerEl) {
        if (window.isPremiumUser && window.isPremiumUser()) {
            banner.classList.add('hidden');
        } else {
            if (bannerBalance) bannerBalance.textContent = '$' + userData.balance.toFixed(2);
            banner.addEventListener('click', () => { if (window.openUnlockPopup) window.openUnlockPopup(); });
            const today = new Date().toISOString().split('T')[0];
            const cdKey = 'countdownEnd_' + today;
            let endTs = parseInt(localStorage.getItem(cdKey) || '0');
            if (!endTs || endTs < Date.now()) {
                endTs = Date.now() + 24 * 60 * 60 * 1000;
                localStorage.setItem(cdKey, endTs);
            }
            function tickCountdown() {
                const diff = Math.max(0, endTs - Date.now());
                const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
                const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
                const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
                timerEl.textContent = `${h}:${m}:${s}`;
                if (diff > 0) setTimeout(tickCountdown, 1000);
            }
            tickCountdown();
        }
    }

    const wpLink = document.getElementById('wpUnlockLink');
    if (wpLink) wpLink.addEventListener('click', () => { if (window.openUnlockPopup) window.openUnlockPopup(); });
});
