let allGames = []; // For Top 20 and Recently Played
let currentPageGames = []; // For Full List (paginated)
let friendGames = [];
let currentPage = 1;
let totalPages = 1;
let totalGames = 0;
const gamesPerPage = 50; // For paginated "Full List"
const initialFetchPerPage = 2000; // Increased to ensure we fetch all games
const recentDaysInSeconds = 31 * 24 * 60 * 60; // 31 days for recent games
const currentTimestamp = Math.floor(Date.now() / 1000);
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
let userUrl = '';
let steamId = '';
let lastRequestTime = 0;
const requestDelay = 1000; // 1 second delay between requests
let playtimeChartInstance = null; // Store the Chart.js instance
let isRenderingChart = false; // Flag to prevent concurrent chart rendering

// Utility function to validate SteamID64
function validateSteamID64(steamID) {
    return /^\d{17}$/.test(steamID);
}

// Utility function to delay requests to avoid rate limiting
async function delayRequest() {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < requestDelay) {
        await new Promise(resolve => setTimeout(resolve, requestDelay - timeSinceLastRequest));
    }
    lastRequestTime = Date.now();
}

// Utility function to fetch with retry on 429 errors (but not 400 errors)
async function fetchWithRetry(url, options, retries = 3, delay = 5000) {
    for (let i = 0; i < retries; i++) {
        await delayRequest();
        try {
            const response = await fetch(url, options);
            if (response.status === 429) { // Retry only on rate limiting
                if (i === retries - 1) {
                    throw new Error('HTTP error! Status: 429 (Too Many Requests) - Max retries reached');
                }
                console.warn(`Rate limit hit (429). Retrying in ${delay/1000} seconds... (Attempt ${i+1}/${retries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            if (error.message.includes('400')) {
                // Do not retry on 400 errors
                throw new Error('Invalid request (HTTP 400). The SteamID64 may be invalid, the profile may not exist, or it may be private.');
            }
            if (i === retries - 1) throw error;
            console.warn(`Fetch error: ${error.message}. Retrying in ${delay/1000} seconds... (Attempt ${i+1}/${retries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// Debounce function to limit rapid form submissions
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

document.getElementById('steamForm').addEventListener('submit', function(event) {
    event.preventDefault();
    debouncedFetchAndRender();
});

const debouncedFetchAndRender = debounce(fetchAndRender, 1000); // Debounce form submission by 1 second

async function fetchAndRender() {
    const userInput = document.getElementById('userInput').value.trim();
    const friendInput = document.getElementById('friendInput').value.trim();
    const gameList = document.getElementById('gameList');
    const topGamesList = document.getElementById('topGamesList');
    const recentGamesList = document.getElementById('recentGamesList');
    const compareList = document.getElementById('compareList');
    const steamIdDisplay = document.getElementById('steamId');
    const copyButton = document.getElementById('copyButton');
    const errorMessage = document.getElementById('errorMessage');

    // Clear previous results
    gameList.innerHTML = '';
    topGamesList.innerHTML = '';
    recentGamesList.innerHTML = '';
    compareList.innerHTML = '';
    steamIdDisplay.textContent = '';
    copyButton.style.display = 'none';
    errorMessage.textContent = '';
    currentPage = 1;
    allGames = [];
    friendGames = [];

    if (!userInput) {
        errorMessage.textContent = 'Please enter your username or SteamID64.';
        return;
    }

    // Validate SteamID64 if provided
    const isSteamID = /^\d{17}$/.test(userInput);
    if (isSteamID && !validateSteamID64(userInput)) {
        errorMessage.textContent = 'Invalid SteamID64. It must be a 17-digit number.';
        return;
    }

    userUrl = isSteamID ?
        `/get_library_by_id?steamid=${encodeURIComponent(userInput)}` :
        `/get_library?username=${encodeURIComponent(userInput)}`;

    try {
        // Fetch the initial library data (for Top 20 and Recently Played)
        const userData = await fetchWithRetry(`${userUrl}&page=1&per_page=${initialFetchPerPage}`, { mode: 'cors' });
        console.log('Fetched full data:', userData);
        if (userData.error) {
            errorMessage.textContent = userData.error;
            if (userData.error.includes("Invalid username")) {
                errorMessage.textContent += ' Try setting a custom URL in Steam or use your SteamID64 instead.';
            } else if (userData.error.includes("profile is private")) {
                errorMessage.textContent += ' Please set your game details to public in Steam (Settings > Privacy).';
            } else if (userData.error.includes("Invalid SteamID64")) {
                errorMessage.textContent += ' The SteamID64 may be incorrect or the profile does not exist.';
            }
        } else {
            // Filter out invalid game entries
            allGames = userData.games.filter(game => game && typeof game === 'object' && 'appid' in game && 'name' in game);
            console.log('Total games fetched in allGames:', allGames.length);
            steamId = userData.steam_id;
            steamIdDisplay.textContent = steamId;
            copyButton.style.display = 'inline';

            renderStats();
            renderPlaytimeTrends();
            renderTopGames();
            renderRecentGames();
        }

        // Fetch the paginated list for the Full List section
        await fetchPaginatedGames(currentPage);
    } catch (error) {
        errorMessage.textContent = error.message;
        console.error('Fetch error:', error);
    }

    if (friendInput) {
        const friendUrl = /^\d{17}$/.test(friendInput) ?
            `/get_library_by_id?steamid=${encodeURIComponent(friendInput)}&page=1&per_page=${initialFetchPerPage}` :
            `/get_library?username=${encodeURIComponent(friendInput)}&page=1&per_page=${initialFetchPerPage}`;
        try {
            const friendData = await fetchWithRetry(friendUrl, { mode: 'cors' });
            if (friendData.error) throw new Error(friendData.error);
            friendGames = friendData.games.filter(game => game && typeof game === 'object' && 'appid' in game && 'name' in game);
            renderComparison();
        } catch (error) {
            compareList.innerHTML = `<li>Error fetching friend's library: ${error.message}</li>`;
        }
    }
}

async function fetchPaginatedGames(page) {
    const params = {
        page: page,
        per_page: gamesPerPage,
        showPlayedOnly: document.getElementById('showPlayedOnly').checked,
        filterWindows: document.getElementById('filterWindows').checked,
        filterMac: document.getElementById('filterMac').checked,
        filterLinux: document.getElementById('filterLinux').checked,
        filterDeck: document.getElementById('filterDeck').checked,
        search: document.getElementById('searchInput').value.trim(),
        sortBy: document.getElementById('sortBy').value,
        dateRange: document.getElementById('dateRange').value
    };
    const queryString = Object.keys(params).map(key => `${key}=${encodeURIComponent(params[key])}`).join('&');
    const url = `${userUrl}&${queryString}`;

    console.log('Fetching paginated games with URL:', url);

    try {
        const userData = await fetchWithRetry(url, { mode: 'cors' });
        console.log('Fetched paginated data for page:', page, userData);
        console.log('Total pages received:', userData.total_pages);
        console.log('Total games received:', userData.total_games);
        if (userData.error) {
            document.getElementById('errorMessage').textContent = userData.error;
        } else {
            // Filter out invalid game entries
            currentPageGames = userData.games.filter(game => game && typeof game === 'object' && 'appid' in game && 'name' in game);
            totalPages = userData.total_pages;
            totalGames = userData.total_games;
            renderGames();
        }
    } catch (error) {
        document.getElementById('errorMessage').textContent = error.message;
        console.error('Fetch error:', error);
    }
}

function renderStats() {
    const statsList = document.getElementById('statsList');
    const totalPlaytime = allGames.reduce((sum, game) => sum + (game.playtime_forever || 0), 0);
    const totalHours = Math.floor(totalPlaytime / 60);
    const playedGames = allGames.filter(game => (game.playtime_forever || 0) > 0);
    const avgPlaytime = playedGames.length > 0 ? Math.floor(totalPlaytime / playedGames.length / 60) : 0;
    const windowsPlaytime = allGames.reduce((sum, game) => sum + (game.playtime_windows_forever || 0), 0);
    const macPlaytime = allGames.reduce((sum, game) => sum + (game.playtime_mac_forever || 0), 0);
    const linuxPlaytime = allGames.reduce((sum, game) => sum + (game.playtime_linux_forever || 0), 0);
    const deckPlaytime = allGames.reduce((sum, game) => sum + (game.playtime_deck_forever || 0), 0);
    const mostActivePlatform = [
        { name: 'Windows', time: windowsPlaytime },
        { name: 'Mac', time: macPlaytime },
        { name: 'Linux', time: linuxPlaytime },
        { name: 'Steam Deck', time: deckPlaytime }
    ].sort((a, b) => b.time - a.time)[0].name;

    statsList.innerHTML = `
        <li>Total Playtime: ${totalHours} hours</li>
        <li>Total Games: ${allGames.length}</li>
        <li>Games Played: ${playedGames.length}</li>
        <li>Average Playtime per Played Game: ${avgPlaytime} hours</li>
        <li>Most Active Platform: ${mostActivePlatform}</li>
    `;
}

function renderPlaytimeTrends() {
    // Prevent concurrent chart rendering
    if (isRenderingChart) {
        console.log('Chart rendering already in progress, skipping...');
        return;
    }

    isRenderingChart = true;
    console.log('Starting chart rendering...');

    try {
        // Destroy the existing chart instance if it exists
        if (playtimeChartInstance) {
            console.log('Destroying existing chart instance:', playtimeChartInstance);
            playtimeChartInstance.destroy();
            playtimeChartInstance = null;
        }

        const monthlyPlaytime = {};
        allGames.forEach(game => {
            if (game.rtime_last_played) {
                const date = new Date(game.rtime_last_played * 1000);
                const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                monthlyPlaytime[monthYear] = (monthlyPlaytime[monthYear] || 0) + (game.playtime_forever || 0);
            }
        });

        const labels = Object.keys(monthlyPlaytime).sort();
        const data = labels.map(label => Math.floor(monthlyPlaytime[label] / 60));

        if (labels.length === 0) {
            console.log('No data to render chart, skipping...');
            return;
        }

        const ctx = document.getElementById('playtimeChart').getContext('2d');
        playtimeChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Playtime (Hours)',
                    data: data,
                    borderColor: '#48bb78',
                    fill: false
                }]
            },
            options: {
                scales: {
                    x: { 
                        title: { 
                            display: true, 
                            text: 'Month',
                            color: document.body.classList.contains('dark-mode') ? '#e2e8f0' : '#4a5568'
                        },
                        ticks: {
                            color: document.body.classList.contains('dark-mode') ? '#e2e8f0' : '#4a5568'
                        }
                    },
                    y: { 
                        title: { 
                            display: true, 
                            text: 'Hours Played',
                            color: document.body.classList.contains('dark-mode') ? '#e2e8f0' : '#4a5568'
                        },
                        ticks: {
                            color: document.body.classList.contains('dark-mode') ? '#e2e8f0' : '#4a5568'
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: document.body.classList.contains('dark-mode') ? '#e2e8f0' : '#4a5568'
                        }
                    }
                }
            }
        });
        console.log('Chart rendering completed successfully:', playtimeChartInstance);
    } catch (error) {
        console.error('Error rendering chart:', error);
    } finally {
        isRenderingChart = false;
    }
}

function renderTopGames() {
    const topGamesList = document.getElementById('topGamesList');
    const topGames = [...allGames]
        .sort((a, b) => (b.playtime_forever || 0) - (a.playtime_forever || 0))
        .slice(0, 20);
    const maxPlaytime = Math.max(...allGames.map(game => game.playtime_forever || 0));

    topGamesList.innerHTML = '';
    topGames.forEach(game => {
        const li = document.createElement('li');
        const hours = Math.floor((game.playtime_forever || 0) / 60);
        const lastPlayed = game.rtime_last_played ? new Date(game.rtime_last_played * 1000).toLocaleDateString() : 'Never';
        const playtime2Weeks = game.playtime_2weeks ? Math.floor(game.playtime_2weeks / 60) : 0;
        li.classList.add('lazy-load');
        li.dataset.appid = game.appid;
        li.innerHTML = `
            <div class="game-item">
                <img src="http://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg" alt="${game.name} icon">
                <span class="game-name ${favorites.includes(game.appid) ? 'favorite' : ''}">${game.name}</span>
                <button class="favorite-btn">${favorites.includes(game.appid) ? '★' : '☆'}</button>
                <div class="playtime-bar">
                    <div class="playtime-bar-fill" style="width: ${maxPlaytime > 0 ? ((game.playtime_forever || 0) / maxPlaytime) * 100 : 0}%;"></div>
                </div>
                <span class="game-playtime">${hours} hours played (Last played: ${lastPlayed}${playtime2Weeks > 0 ? `, ${playtime2Weeks} hours in last 2 weeks` : ''})</span>
            </div>
            <div class="game-details"></div>
        `;
        li.querySelector('.favorite-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(game.appid);
        });
        topGamesList.appendChild(li);
    });

    setupLazyLoading();
}

function renderRecentGames() {
    const recentGamesList = document.getElementById('recentGamesList');
    const recentDaysAgo = currentTimestamp - recentDaysInSeconds;
    console.log('Rendering Recently Played Games...');
    console.log('Current timestamp:', currentTimestamp, 'Recent days ago:', recentDaysAgo);
    console.log('Total games in allGames:', allGames.length);

    // Log all games with rtime_last_played, sorted by most recent
    const gamesWithLastPlayed = allGames
        .filter(game => game.rtime_last_played)
        .sort((a, b) => (b.rtime_last_played || 0) - (a.rtime_last_played || 0));
    console.log('All games with rtime_last_played:', gamesWithLastPlayed.map(game => ({
        name: game.name,
        playtime_2weeks: game.playtime_2weeks || 0,
        rtime_last_played: game.rtime_last_played,
        lastPlayedDate: new Date(game.rtime_last_played * 1000).toLocaleString()
    })));

    // Log games within the recent days window
    const recentCandidates = allGames.filter(game => game.rtime_last_played && game.rtime_last_played >= recentDaysAgo);
    console.log('Games within the last 31 days:', recentCandidates.map(game => ({
        name: game.name,
        playtime_2weeks: game.playtime_2weeks || 0,
        rtime_last_played: game.rtime_last_played,
        lastPlayedDate: new Date(game.rtime_last_played * 1000).toLocaleString()
    })));

    // First, try to find games played within the last 31 days
    let recentGames = allGames.filter(game => 
        (game.playtime_2weeks && game.playtime_2weeks > 0) || 
        (game.rtime_last_played && game.rtime_last_played >= recentDaysAgo)
    ).sort((a, b) => (b.rtime_last_played || 0) - (a.rtime_last_played || 0));

    // If no games were played in the last 31 days, fall back to the top 10 most recently played games
    if (recentGames.length === 0) {
        console.log('No games played in the last 31 days, falling back to most recently played games...');
        recentGames = allGames
            .filter(game => game.rtime_last_played) // Only include games with a last played time
            .sort((a, b) => (b.rtime_last_played || 0) - (a.rtime_last_played || 0))
            .slice(0, 10); // Take the top 10
    }

    const maxPlaytime = Math.max(...allGames.map(game => game.playtime_forever || 0));

    console.log('Number of recently played games:', recentGames.length);
    if (recentGames.length > 0) {
        console.log('Recently played games:', recentGames.map(game => ({
            name: game.name,
            playtime_2weeks: game.playtime_2weeks || 0,
            rtime_last_played: game.rtime_last_played,
            lastPlayedDate: game.rtime_last_played ? new Date(game.rtime_last_played * 1000).toLocaleString() : 'Never'
        })));
    }

    recentGamesList.innerHTML = '';
    if (recentGames.length === 0) {
        recentGamesList.innerHTML = '<li>No recently played games found.</li>';
        return;
    }

    recentGames.forEach(game => {
        const li = document.createElement('li');
        const hours = Math.floor((game.playtime_forever || 0) / 60);
        const lastPlayed = game.rtime_last_played ? new Date(game.rtime_last_played * 1000).toLocaleDateString() : 'Never';
        const playtime2Weeks = game.playtime_2weeks ? Math.floor(game.playtime_2weeks / 60) : 0;
        li.classList.add('lazy-load');
        li.dataset.appid = game.appid;
        li.innerHTML = `
            <div class="game-item">
                <img src="http://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg" alt="${game.name} icon">
                <span class="game-name ${favorites.includes(game.appid) ? 'favorite' : ''}">${game.name}</span>
                <button class="favorite-btn">${favorites.includes(game.appid) ? '★' : '☆'}</button>
                <div class="playtime-bar">
                    <div class="playtime-bar-fill" style="width: ${maxPlaytime > 0 ? ((game.playtime_forever || 0) / maxPlaytime) * 100 : 0}%;"></div>
                </div>
                <span class="game-playtime">${hours} hours played (Last played: ${lastPlayed}${playtime2Weeks > 0 ? `, ${playtime2Weeks} hours in last 2 weeks` : ''})</span>
            </div>
            <div class="game-details"></div>
        `;
        li.querySelector('.favorite-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(game.appid);
        });
        recentGamesList.appendChild(li);
    });

    setupLazyLoading();
}

function renderComparison() {
    const compareList = document.getElementById('compareList');
    const userGameNames = new Set(allGames.map(game => game.name));
    const friendGameNames = new Set(friendGames.map(game => game.name));

    const commonGames = [...userGameNames].filter(name => friendGameNames.has(name));
    const onlyUserGames = [...userGameNames].filter(name => !friendGameNames.has(name));
    const onlyFriendGames = [...friendGameNames].filter(name => !userGameNames.has(name));

    compareList.innerHTML = `
        <li><strong>Common Games (${commonGames.length}):</strong> ${commonGames.join(', ')}</li>
        <li><strong>Only in Your Library (${onlyUserGames.length}):</strong> ${onlyUserGames.join(', ')}</li>
        <li><strong>Only in Friend's Library (${onlyFriendGames.length}):</strong> ${onlyFriendGames.join(', ')}</li>
    `;
}

function renderGames() {
    const gameList = document.getElementById('gameList');
    const prevPageButton = document.getElementById('prevPage');
    const nextPageButton = document.getElementById('nextPage');
    const pageInfo = document.getElementById('pageInfo');
    const maxPlaytime = Math.max(...allGames.map(game => game.playtime_forever || 0));

    gameList.innerHTML = '';
    console.log('Rendering games for page:', currentPage, 'Total games on this page:', currentPageGames.length);

    if (currentPageGames.length === 0) {
        gameList.innerHTML = '<li>No games match your criteria.</li>';
        prevPageButton.disabled = true;
        nextPageButton.disabled = true;
        pageInfo.textContent = `Page ${currentPage} of ${totalPages || 1} (Total Games: ${totalGames})`;
        return;
    }

    currentPageGames.forEach(game => {
        const li = document.createElement('li');
        li.classList.add('lazy-load');
        li.dataset.appid = game.appid;
        gameList.appendChild(li);
    });

    pageInfo.textContent = `Page ${currentPage} of ${totalPages || 1} (Total Games: ${totalGames})`;
    prevPageButton.disabled = currentPage === 1;
    nextPageButton.disabled = currentPage === totalPages || totalPages === 0;

    // Add pagination event listeners (remove old ones to prevent duplicates)
    const prevPageButtonClone = prevPageButton.cloneNode(true);
    const nextPageButtonClone = nextPageButton.cloneNode(true);
    prevPageButton.parentNode.replaceChild(prevPageButtonClone, prevPageButton);
    nextPageButton.parentNode.replaceChild(nextPageButtonClone, nextPageButton);

    prevPageButtonClone.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            fetchPaginatedGames(currentPage);
            savePreferences();
            updateShareableLink();
        }
    });
    nextPageButtonClone.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            fetchPaginatedGames(currentPage);
            savePreferences();
            updateShareableLink();
        }
    });

    setupLazyLoading();
}

function toggleDetails(element) {
    const detailsDiv = element.nextElementSibling;
    if (!detailsDiv.innerHTML.includes('unlocked') && !detailsDiv.innerHTML.includes('No achievements')) {
        const game = currentPageGames.find(g => g.appid == element.parentElement.dataset.appid);
        const steamIdDisplay = document.getElementById('steamId');
        fetch(`/get_achievements?steamid=${steamIdDisplay.textContent}&appid=${game.appid}`, { mode: 'cors' })
            .then(response => response.json())
            .then(achData => {
                if (achData.error) {
                    detailsDiv.innerHTML = detailsDiv.innerHTML.replace('Achievements: Loading...', `<p>Achievements: ${achData.error}</p>`);
                } else {
                    const achieved = achData.achievements ? achData.achievements.filter(ach => ach.achieved === 1).length : 0;
                    const total = achData.achievements ? achData.achievements.length : 0;
                    detailsDiv.innerHTML = detailsDiv.innerHTML.replace('Achievements: Loading...', `<p>Achievements: ${achieved}/${total} unlocked</p>`);
                }
            })
            .catch(error => {
                detailsDiv.innerHTML = detailsDiv.innerHTML.replace('Achievements: Loading...', `<p>Achievements: Error fetching data</p>`);
            });
    }
    detailsDiv.style.display = detailsDiv.style.display === 'none' ? 'block' : 'none';
}

function setupLazyLoading() {
    const maxPlaytime = Math.max(...allGames.map(game => game.playtime_forever || 0));
    const steamIdDisplay = document.getElementById('steamId');
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const li = entry.target;
                const game = currentPageGames.find(g => g.appid == li.dataset.appid);
                if (!game) return; // Skip if game is not found
                const hours = Math.floor((game.playtime_forever || 0) / 60);
                const lastPlayed = game.rtime_last_played ? new Date(game.rtime_last_played * 1000).toLocaleDateString() : 'Never';
                const playtime2Weeks = game.playtime_2weeks ? Math.floor(game.playtime_2weeks / 60) : 0;
                li.innerHTML = `
                    <div class="game-item" onclick="toggleDetails(this)">
                        <img src="http://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg" alt="${game.name} icon">
                        <span class="game-name ${favorites.includes(game.appid) ? 'favorite' : ''}">${game.name}</span>
                        <button class="favorite-btn">${favorites.includes(game.appid) ? '★' : '☆'}</button>
                        <div class="playtime-bar">
                            <div class="playtime-bar-fill" style="width: ${maxPlaytime > 0 ? ((game.playtime_forever || 0) / maxPlaytime) * 100 : 0}%;"></div>
                        </div>
                        <span class="game-playtime">${hours} hours played (Last played: ${lastPlayed}${playtime2Weeks > 0 ? `, ${playtime2Weeks} hours in last 2 weeks` : ''})</span>
                    </div>
                    <div class="game-details">
                        <p>App ID: ${game.appid}</p>
                        <p>Windows Playtime: ${Math.floor((game.playtime_windows_forever || 0) / 60)} hours</p>
                        <p>Mac Playtime: ${Math.floor((game.playtime_mac_forever || 0) / 60)} hours</p>
                        <p>Linux Playtime: ${Math.floor((game.playtime_linux_forever || 0) / 60)} hours</p>
                        <p>Steam Deck Playtime: ${Math.floor((game.playtime_deck_forever || 0) / 60)} hours</p>
                        ${game.content_descriptorids ? `<p>Content Descriptors: ${game.content_descriptorids.join(', ')}</p>` : ''}
                        ${game.details && Object.keys(game.details).length > 0 ? `
                            <p>Genres: ${game.details.genres ? game.details.genres.join(', ') : 'Unknown'}</p>
                            <p>Release Date: ${game.details.release_date || 'Unknown'}</p>
                            <p>Categories: ${game.details.categories ? game.details.categories.join(', ') : 'Unknown'}</p>
                        ` : '<p>Details not available (fetchDetails=false)</p>'}
                        <p>Achievements: Loading...</p>
                    </div>
                `;
                li.querySelector('.favorite-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleFavorite(game.appid);
                });
                observer.unobserve(li);
            }
        });
    }, { rootMargin: '0px 0px 200px 0px' });

    document.querySelectorAll('.lazy-load').forEach(li => observer.observe(li));
}

function toggleFavorite(appid) {
    if (favorites.includes(appid)) {
        favorites = favorites.filter(id => id !== appid);
    } else {
        favorites.push(appid);
    }
    localStorage.setItem('favorites', JSON.stringify(favorites));
    renderGames();
    renderTopGames();
    renderRecentGames();
}

function savePreferences() {
    const preferences = {
        showPlayedOnly: document.getElementById('showPlayedOnly').checked,
        filterWindows: document.getElementById('filterWindows').checked,
        filterMac: document.getElementById('filterMac').checked,
        filterLinux: document.getElementById('filterLinux').checked,
        filterDeck: document.getElementById('filterDeck').checked,
        search: document.getElementById('searchInput').value.trim(),
        sortBy: document.getElementById('sortBy').value,
        dateRange: document.getElementById('dateRange').value,
        page: currentPage,
        steamId: steamId
    };
    localStorage.setItem('steamLibraryPrefs', JSON.stringify(preferences));
}

function loadPreferences() {
    const preferences = JSON.parse(localStorage.getItem('steamLibraryPrefs')) || {};
    document.getElementById('showPlayedOnly').checked = preferences.showPlayedOnly || false;
    document.getElementById('filterWindows').checked = preferences.filterWindows || false;
    document.getElementById('filterMac').checked = preferences.filterMac || false;
    document.getElementById('filterLinux').checked = preferences.filterLinux || false;
    document.getElementById('filterDeck').checked = preferences.filterDeck || false;
    document.getElementById('searchInput').value = preferences.search || '';
    document.getElementById('sortBy').value = preferences.sortBy || 'name';
    document.getElementById('dateRange').value = preferences.dateRange || 'all';
    currentPage = preferences.page || 1;
    steamId = preferences.steamId || '';
    if (steamId) {
        document.getElementById('userInput').value = steamId;
        fetchAndRender();
    }
}

function loadFromUrlParams() {
    const params = new URLSearchParams(window.location.search);
    document.getElementById('showPlayedOnly').checked = params.get('showPlayedOnly') === 'true';
    document.getElementById('filterWindows').checked = params.get('filterWindows') === 'true';
    document.getElementById('filterMac').checked = params.get('filterMac') === 'true';
    document.getElementById('filterLinux').checked = params.get('filterLinux') === 'true';
    document.getElementById('filterDeck').checked = params.get('filterDeck') === 'true';
    document.getElementById('searchInput').value = params.get('search') || '';
    document.getElementById('sortBy').value = params.get('sortBy') || 'name';
    document.getElementById('dateRange').value = params.get('dateRange') || 'all';
    currentPage = parseInt(params.get('page')) || 1;
    steamId = params.get('steamid') || params.get('userInput') || '';
    if (steamId && !document.getElementById('userInput').value) {
        document.getElementById('userInput').value = steamId;
        fetchAndRender();
    } else {
        renderGames();
    }
}

function updateShareableLink() {
    const params = new URLSearchParams({
        steamid: steamId,
        showPlayedOnly: document.getElementById('showPlayedOnly').checked,
        filterWindows: document.getElementById('filterWindows').checked,
        filterMac: document.getElementById('filterMac').checked,
        filterLinux: document.getElementById('filterLinux').checked,
        filterDeck: document.getElementById('filterDeck').checked,
        search: document.getElementById('searchInput').value.trim(),
        sortBy: document.getElementById('sortBy').value,
        dateRange: document.getElementById('dateRange').value,
        page: currentPage
    });
    const shareableUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    history.pushState(null, '', shareableUrl);
    return shareableUrl;
}

document.getElementById('exportCsv').addEventListener('click', () => {
    const filteredGames = currentPageGames;
    const csvContent = [
        ['Name', 'Playtime (Hours)', 'Last Played', 'Playtime Last 2 Weeks (Hours)'].join(','),
        ...filteredGames.map(game => {
            const hours = Math.floor((game.playtime_forever || 0) / 60);
            const lastPlayed = game.rtime_last_played ? new Date(game.rtime_last_played * 1000).toLocaleDateString() : 'Never';
            const playtime2Weeks = game.playtime_2weeks ? Math.floor(game.playtime_2weeks / 60) : 0;
            return [
                `"${game.name.replace(/"/g, '""')}"`,
                hours,
                lastPlayed,
                playtime2Weeks
            ].join(',');
        })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'steam_library.csv';
    link.click();
});

document.getElementById('shareLink').addEventListener('click', () => {
    const shareableUrl = updateShareableLink();
    navigator.clipboard.writeText(shareableUrl).then(() => {
        alert('Shareable link copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
});

document.getElementById('darkModeToggle').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    document.getElementById('darkModeToggle').textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
    renderPlaytimeTrends(); // Re-render chart to update colors
});

document.querySelectorAll('.toggle-section').forEach(button => {
    button.addEventListener('click', () => {
        const section = button.parentElement.nextElementSibling;
        section.style.display = section.style.display === 'none' ? 'block' : 'none';
    });
});

document.getElementById('copyButton').addEventListener('click', function() {
    const steamId = document.getElementById('steamId').textContent;
    navigator.clipboard.writeText(steamId).then(() => {
        alert('SteamID copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
});

// Add filter and search event listeners
document.getElementById('showPlayedOnly').addEventListener('change', () => {
    currentPage = 1;
    fetchPaginatedGames(currentPage);
    savePreferences();
    updateShareableLink();
});
document.getElementById('filterWindows').addEventListener('change', () => {
    currentPage = 1;
    fetchPaginatedGames(currentPage);
    savePreferences();
    updateShareableLink();
});
document.getElementById('filterMac').addEventListener('change', () => {
    currentPage = 1;
    fetchPaginatedGames(currentPage);
    savePreferences();
    updateShareableLink();
});
document.getElementById('filterLinux').addEventListener('change', () => {
    currentPage = 1;
    fetchPaginatedGames(currentPage);
    savePreferences();
    updateShareableLink();
});
document.getElementById('filterDeck').addEventListener('change', () => {
    currentPage = 1;
    fetchPaginatedGames(currentPage);
    savePreferences();
    updateShareableLink();
});
document.getElementById('searchInput').addEventListener('input', () => {
    currentPage = 1;
    fetchPaginatedGames(currentPage);
    savePreferences();
    updateShareableLink();
});
document.getElementById('sortBy').addEventListener('change', () => {
    currentPage = 1;
    fetchPaginatedGames(currentPage);
    savePreferences();
    updateShareableLink();
});
document.getElementById('dateRange').addEventListener('change', () => {
    currentPage = 1;
    fetchPaginatedGames(currentPage);
    savePreferences();
    updateShareableLink();
});

// Load initial state
window.addEventListener('load', () => {
    loadPreferences();
    loadFromUrlParams();
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        document.getElementById('darkModeToggle').textContent = '☀️';
    } else {
        document.getElementById('darkModeToggle').textContent = '🌙';
    }
});