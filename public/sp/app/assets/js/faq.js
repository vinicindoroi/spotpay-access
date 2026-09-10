document.addEventListener('DOMContentLoaded', function() {
    const faqItems = document.querySelectorAll('.faq-item');
    const balanceElement = document.getElementById('balance');

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
                dailyRewards: {},
                totalEvaluations: 0,
                registrationDate: new Date().toISOString()
            };
            localStorage.setItem('users', JSON.stringify(users));
        }
        userData = users[currentUser];
        return true;
    }

    function updateBalance() {
        if (balanceElement && userData) {
            balanceElement.textContent = userData.balance.toFixed(2);
        }
    }

    if (loadUserData()) updateBalance();

    // Accordion FAQ
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        question.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            faqItems.forEach(otherItem => { otherItem.classList.remove('active'); });
            if (!isActive) item.classList.add('active');
        });
    });
});
