document.getElementById('darkModeToggle').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    document.getElementById('darkModeToggle').textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
});

// Load initial dark mode state
window.addEventListener('load', () => {
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        document.getElementById('darkModeToggle').textContent = '☀️';
    } else {
        document.getElementById('darkModeToggle').textContent = '🌙';
    }
document.getElementById('darkModeToggle').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    document.getElementById('darkModeToggle').textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
});

// Load initial dark mode state
window.addEventListener('load', () => {
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        document.getElementById('darkModeToggle').textContent = '☀️';
    } else {
        document.getElementById('darkModeToggle').textContent = '🌙';
    }
});