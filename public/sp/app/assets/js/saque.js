document.addEventListener('DOMContentLoaded', function() {
    const withdrawForm = document.getElementById('withdrawForm');
    const paypalEmail = document.getElementById('paypalEmail');
    const withdrawAmount = document.getElementById('withdrawAmount');
    const submitBtn = document.getElementById('submitBtn');
    const balanceElement = document.getElementById('balance');
    const availableBalanceElement = document.getElementById('availableBalance');
    const popupOverlay = document.getElementById('popupOverlay');
    const popupMessage = document.getElementById('popupMessage');
    const popupClose = document.getElementById('popupClose');
    const popupTitle = document.querySelector('.popup-title');
    const popupIcon = document.querySelector('.popup-icon');
    const popupSubmessage = document.querySelector('.popup-submessage');

    let currentUser = null;
    let userData = null;

    function loadUserData() {
        currentUser = localStorage.getItem('currentUser');
        if (!currentUser) { window.location.href = 'index.html'; return false; }
        const users = JSON.parse(localStorage.getItem('users')) || {};
        if (!users[currentUser]) {
            users[currentUser] = {
                balance: 278.77,
                evaluatedSongs: [],
                dailyEvaluations: {},
                totalEvaluations: 0,
                registrationDate: new Date().toISOString()
            };
            localStorage.setItem('users', JSON.stringify(users));
        }
        userData = users[currentUser];
        return true;
    }

    function saveUserData() {
        const users = JSON.parse(localStorage.getItem('users')) || {};
        users[currentUser] = userData;
        localStorage.setItem('users', JSON.stringify(users));
    }

    function updateBalance() {
        const formattedBalance = userData.balance.toFixed(2);
        if (balanceElement) balanceElement.textContent = formattedBalance;
        if (availableBalanceElement) availableBalanceElement.textContent = formattedBalance;
    }

    if (!loadUserData()) return;
    updateBalance();
    if (window.addNavBadge) window.addNavBadge();

    withdrawAmount.addEventListener('input', function() {
        let value = this.value;
        if (value && !isNaN(value)) {
            const numValue = parseFloat(value);
            if (numValue > userData.balance) {
                this.setCustomValidity('Saldo insuficiente');
            } else if (numValue < 1) {
                this.setCustomValidity('El monto mínimo es de $1.00');
            } else {
                this.setCustomValidity('');
            }
        }
    });

    withdrawForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const email = paypalEmail.value.trim();
        const amount = parseFloat(withdrawAmount.value);
        if (!email || !amount) { showErrorPopup('Por favor, completá todos los campos'); return; }
        const blocked = amount < 8000;
        if (amount > userData.balance) { showErrorPopup('Saldo insuficiente'); return; }
        if (blocked) { showErrorPopup('El monto mínimo para retirar es de $8,000.00'); return; }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Procesando...';
        setTimeout(() => {
            userData.balance -= amount;
            saveUserData();
            updateBalance();
            withdrawForm.reset();
            submitBtn.disabled = false;
            submitBtn.textContent = 'Solicitar Retiro';
            showSuccessPopup(amount);
        }, 1500);
    });

    function showSuccessPopup(amount) {
        popupTitle.textContent = '¡Retiro solicitado con éxito!';
        popupIcon.textContent = '✅';
        popupMessage.textContent = `El retiro de $${amount.toFixed(2)} ha sido solicitado con éxito.`;
        popupSubmessage.style.display = 'block';
        popupOverlay.classList.add('show');
    }

    function showErrorPopup(message) {
        popupTitle.textContent = 'Error';
        popupIcon.textContent = '❌';
        popupMessage.textContent = message;
        popupSubmessage.style.display = 'none';
        popupOverlay.classList.add('show');
    }

    function closePopup() {
        popupOverlay.classList.remove('show');
        popupTitle.textContent = '¡Retiro solicitado con éxito!';
        popupIcon.textContent = '✅';
        popupSubmessage.style.display = 'block';
    }

    popupClose.addEventListener('click', closePopup);
    popupOverlay.addEventListener('click', function(e) {
        if (e.target === popupOverlay) closePopup();
    });

    document.getElementById('paypalBtn').addEventListener('click', function() {
        paypalEmail.focus();
    });
});
