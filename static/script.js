document.addEventListener('DOMContentLoaded', () => {
    // State variables
    let updates = [];
    let activeFilter = 'all';
    let searchQuery = '';
    let selectedUpdate = null;

    // DOM Elements
    const feedContainer = document.getElementById('feed-container');
    const loadingState = document.getElementById('loading-state');
    const errorState = document.getElementById('error-state');
    const errorMessage = document.getElementById('error-message');
    const emptyState = document.getElementById('empty-state');
    
    const refreshBtn = document.getElementById('refresh-btn');
    const refreshIcon = document.getElementById('refresh-icon');
    const lastUpdatedText = document.getElementById('last-updated-text');
    const retryBtn = document.getElementById('retry-btn');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');
    
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    const filterChips = document.querySelectorAll('.filter-chip');
    
    // Stats elements
    const statTotalCount = document.getElementById('stat-total-count');
    const statFeatureCount = document.getElementById('stat-feature-count');
    const statAnnouncementCount = document.getElementById('stat-announcement-count');
    const statIssueCount = document.getElementById('stat-issue-count');
    
    // Modal elements
    const tweetModal = document.getElementById('tweet-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const cancelTweetBtn = document.getElementById('cancel-tweet-btn');
    const sendTweetBtn = document.getElementById('send-tweet-btn');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const charCountCurrent = document.getElementById('char-count-current');
    const modalUpdateBadge = document.getElementById('modal-update-badge');
    const modalUpdateDate = document.getElementById('modal-update-date');
    const modalUpdateContent = document.getElementById('modal-update-content');

    // ----------------------------------------------------
    // API Interactions
    // ----------------------------------------------------

    // Fetch release notes
    async function fetchUpdates(forceRefresh = false) {
        setLoading(true);
        const endpoint = forceRefresh ? '/api/refresh' : '/api/updates';
        const method = forceRefresh ? 'POST' : 'GET';
        
        try {
            const response = await fetch(endpoint, { method });
            if (!response.ok) {
                throw new Error(`Server returned status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            updates = data.updates;
            
            // Format and display last updated timestamp
            if (data.last_fetched) {
                const fetchTime = new Date(data.last_fetched);
                lastUpdatedText.textContent = `Last checked: ${fetchTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            } else {
                lastUpdatedText.textContent = 'Last checked: Just now';
            }
            
            updateStats();
            renderFeed();
            setError(null);
        } catch (error) {
            console.error('Error fetching release notes:', error);
            setError(error.message || 'Failed to connect to the backend server.');
        } finally {
            setLoading(false);
        }
    }

    // ----------------------------------------------------
    // UI State Handlers
    // ----------------------------------------------------

    function setLoading(isLoading) {
        if (isLoading) {
            loadingState.style.display = 'flex';
            feedContainer.style.display = 'none';
            emptyState.style.display = 'none';
            errorState.style.display = 'none';
            refreshIcon.classList.add('spin-anim');
            refreshBtn.disabled = true;
        } else {
            loadingState.style.display = 'none';
            refreshIcon.classList.remove('spin-anim');
            refreshBtn.disabled = false;
        }
    }

    function setError(errorMsg) {
        if (errorMsg) {
            errorState.style.display = 'flex';
            errorMessage.textContent = errorMsg;
            feedContainer.style.display = 'none';
            emptyState.style.display = 'none';
            loadingState.style.display = 'none';
        } else {
            errorState.style.display = 'none';
        }
    }

    // ----------------------------------------------------
    // Dashboard Stats Manager
    // ----------------------------------------------------
    function updateStats() {
        statTotalCount.textContent = updates.length;
        
        const featureCount = updates.filter(u => u.type.toLowerCase() === 'feature').length;
        const announcementCount = updates.filter(u => u.type.toLowerCase() === 'announcement').length;
        const issueCount = updates.filter(u => {
            const t = u.type.toLowerCase();
            return t === 'issue' || t === 'changed' || t === 'deprecated' || t === 'general';
        }).length;
        
        statFeatureCount.textContent = featureCount;
        statAnnouncementCount.textContent = announcementCount;
        statIssueCount.textContent = issueCount;
    }

    // ----------------------------------------------------
    // Rendering Logic
    // ----------------------------------------------------
    
    function renderFeed() {
        // Filter updates
        const filtered = updates.filter(update => {
            // Filter by type
            const matchesFilter = activeFilter === 'all' || 
                update.type.toLowerCase() === activeFilter.toLowerCase();
                
            // Filter by search query
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch = !searchQuery || 
                update.date.toLowerCase().includes(searchLower) ||
                update.type.toLowerCase().includes(searchLower) ||
                update.content_text.toLowerCase().includes(searchLower);
                
            return matchesFilter && matchesSearch;
        });

        // Toggle visibility based on result count
        if (filtered.length === 0) {
            feedContainer.style.display = 'none';
            emptyState.style.display = 'flex';
            return;
        }

        emptyState.style.display = 'none';
        feedContainer.style.display = 'flex';
        feedContainer.innerHTML = '';

        // Render each update as a card
        filtered.forEach(update => {
            const card = document.createElement('article');
            card.className = 'update-card';
            card.setAttribute('data-type', update.type);
            card.id = update.id;

            // Header structure
            const header = document.createElement('div');
            header.className = 'card-header';
            
            const badgeDateGroup = document.createElement('div');
            badgeDateGroup.className = 'badge-date-group';
            
            const badge = document.createElement('span');
            badge.className = 'badge';
            
            // Add icon to badge depending on type
            let badgeIcon = 'fa-circle-info';
            if (update.type.toLowerCase() === 'feature') badgeIcon = 'fa-wand-magic-sparkles';
            if (update.type.toLowerCase() === 'announcement') badgeIcon = 'fa-bullhorn';
            if (update.type.toLowerCase() === 'issue') badgeIcon = 'fa-triangle-exclamation';
            if (update.type.toLowerCase() === 'changed') badgeIcon = 'fa-pen-to-square';
            if (update.type.toLowerCase() === 'deprecated') badgeIcon = 'fa-trash-can';
            
            badge.innerHTML = `<i class="fa-solid ${badgeIcon}"></i> ${update.type}`;
            
            const date = document.createElement('span');
            date.className = 'update-date';
            date.textContent = update.date;
            
            badgeDateGroup.appendChild(badge);
            badgeDateGroup.appendChild(date);
            
            const actions = document.createElement('div');
            actions.className = 'card-actions';
            
            // Link icon
            const linkBtn = document.createElement('a');
            linkBtn.href = update.link;
            linkBtn.target = '_blank';
            linkBtn.rel = 'noopener noreferrer';
            linkBtn.className = 'action-icon-btn';
            linkBtn.title = 'View official release documentation';
            linkBtn.innerHTML = '<i class="fa-solid fa-arrow-up-right-from-square"></i>';
            
            // Share (Tweet) Button
            const tweetBtn = document.createElement('button');
            tweetBtn.className = 'action-icon-btn btn-tweet-action';
            tweetBtn.title = 'Select and compose a Tweet about this update';
            tweetBtn.innerHTML = '<i class="fa-brands fa-x-twitter"></i>';
            tweetBtn.addEventListener('click', () => openTweetModal(update));
            
            actions.appendChild(linkBtn);
            actions.appendChild(tweetBtn);
            
            header.appendChild(badgeDateGroup);
            header.appendChild(actions);

            // Body content
            const body = document.createElement('div');
            body.className = 'card-body';
            body.innerHTML = update.content_html;

            // Connect everything
            card.appendChild(header);
            card.appendChild(body);
            feedContainer.appendChild(card);
        });
    }

    // ----------------------------------------------------
    // Twitter Modal Functions
    // ----------------------------------------------------
    
    function openTweetModal(update) {
        selectedUpdate = update;
        
        // Setup Modal info
        modalUpdateBadge.textContent = update.type;
        // Reset badge classes on modal
        const cardClass = `update-card`;
        document.querySelector('#tweet-modal .modal-container').setAttribute('data-type', update.type);
        
        modalUpdateDate.textContent = update.date;
        
        // Shorten html-to-text preview for the modal card header
        let previewText = update.content_text;
        if (previewText.length > 180) {
            previewText = previewText.substring(0, 177) + '...';
        }
        modalUpdateContent.textContent = previewText;

        // Auto-compose smart default tweet:
        // Title prefix layout
        const titlePrefix = `BigQuery [${update.type}] (${update.date}):`;
        
        // We calculate max description length
        // Twitter treats links as 23 characters.
        const twitterLinkLength = 23;
        const extraWhitespace = 4; // newlines and spaces
        const remainingSpace = 280 - titlePrefix.length - twitterLinkLength - extraWhitespace;
        
        let trimmedDesc = update.content_text;
        if (trimmedDesc.length > remainingSpace) {
            trimmedDesc = trimmedDesc.substring(0, remainingSpace - 3) + '...';
        }
        
        const defaultTweetContent = `${titlePrefix}\n${trimmedDesc}\n\n${update.link}`;
        
        tweetTextarea.value = defaultTweetContent;
        updateCharCounter();
        
        tweetModal.style.display = 'flex';
        tweetTextarea.focus();
        document.body.style.overflow = 'hidden'; // Lock background scroll
    }

    function closeTweetModal() {
        tweetModal.style.display = 'none';
        selectedUpdate = null;
        document.body.style.overflow = ''; // Unlock scroll
    }

    function updateCharCounter() {
        const text = tweetTextarea.value;
        
        // Calculate length taking into account that URLs are treated as 23 chars
        // We extract URLs in text and replace their length with 23.
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const urls = text.match(urlRegex) || [];
        
        let calculatedLength = text.length;
        urls.forEach(url => {
            calculatedLength = calculatedLength - url.length + 23;
        });

        charCountCurrent.textContent = calculatedLength;
        
        const charCounterContainer = document.querySelector('.char-counter');
        
        if (calculatedLength > 280) {
            charCounterContainer.className = 'char-counter over-limit';
            sendTweetBtn.disabled = true;
        } else if (calculatedLength > 250) {
            charCounterContainer.className = 'char-counter near-limit';
            sendTweetBtn.disabled = false;
        } else {
            charCounterContainer.className = 'char-counter';
            sendTweetBtn.disabled = false;
        }
    }

    function sendTweet() {
        const tweetText = tweetTextarea.value.strip ? tweetTextarea.value.strip() : tweetTextarea.value.trim();
        if (!tweetText) return;
        
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
        window.open(twitterUrl, '_blank', 'noopener,noreferrer');
        closeTweetModal();
    }

    // ----------------------------------------------------
    // Event Listeners Setup
    // ----------------------------------------------------

    // Refresh & Retry
    refreshBtn.addEventListener('click', () => fetchUpdates(true));
    retryBtn.addEventListener('click', () => fetchUpdates(true));
    
    // Search
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        if (searchQuery) {
            clearSearchBtn.style.display = 'block';
        } else {
            clearSearchBtn.style.display = 'none';
        }
        renderFeed();
    });
    
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        searchInput.focus();
        renderFeed();
    });

    // Filters
    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            activeFilter = chip.getAttribute('data-type');
            renderFeed();
        });
    });

    resetFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        
        filterChips.forEach(c => c.classList.remove('active'));
        filterChips[0].classList.add('active');
        activeFilter = 'all';
        
        renderFeed();
    });

    // Modal Events
    closeModalBtn.addEventListener('click', closeTweetModal);
    cancelTweetBtn.addEventListener('click', closeTweetModal);
    sendTweetBtn.addEventListener('click', sendTweet);
    tweetTextarea.addEventListener('input', updateCharCounter);
    
    // Close modal on click outside container
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) {
            closeTweetModal();
        }
    });

    // Close modal on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && tweetModal.style.display === 'flex') {
            closeTweetModal();
        }
    });

    // ----------------------------------------------------
    // Initialization
    // ----------------------------------------------------
    fetchUpdates(false);
});
