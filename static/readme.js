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
>>>>>>> 4902f97 (Set up Steam Library Fetcher in new directory for GitHub upload and created a new userdatabase for the user/pass as well as a run.bat script to start this whole project.)
});