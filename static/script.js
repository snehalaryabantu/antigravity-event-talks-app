document.addEventListener('DOMContentLoaded', () => {
    // State variables
    let updates = [];
    let activeFilter = 'all';
    let searchQuery = '';
    let selectedUpdate = null;
    let activeLayout = 'card'; // 'card' or 'list'
    let currentPage = 1;
    const itemsPerPage = 10;
    let activeSharePlatform = 'twitter'; // 'twitter', 'slack', or 'linkedin'

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

    const exportCsvBtn = document.getElementById('export-csv-btn');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const themeToggleIcon = document.getElementById('theme-toggle-icon');
    const backToTopBtn = document.getElementById('back-to-top-btn');

    const layoutCardBtn = document.getElementById('layout-card-btn');
    const layoutListBtn = document.getElementById('layout-list-btn');
    const loadMoreBtn = document.getElementById('load-more-btn');
    const offlineBanner = document.getElementById('offline-banner');
    const shareTabs = document.querySelectorAll('.share-tab');

    // Theme initialization
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        themeToggleIcon.className = 'fa-solid fa-sun';
    } else {
        document.body.classList.remove('light-theme');
        themeToggleIcon.className = 'fa-solid fa-moon';
    }

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
        // Update counts on filter chips
        updateFilterChipCounts();

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
            loadMoreBtn.style.display = 'none';
            return;
        }

        emptyState.style.display = 'none';
        feedContainer.style.display = 'flex';
        feedContainer.innerHTML = '';

        // Slicing for pagination
        const itemsToShow = currentPage * itemsPerPage;
        const sliced = filtered.slice(0, itemsToShow);

        // Toggle load more button visibility
        if (filtered.length > itemsToShow) {
            loadMoreBtn.style.display = 'block';
        } else {
            loadMoreBtn.style.display = 'none';
        }

        // Render each update as a card
        sliced.forEach(update => {
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

            // Add compact toggle icon for list view
            if (activeLayout === 'list') {
                const chevron = document.createElement('i');
                chevron.className = 'fa-solid fa-chevron-down compact-toggle-icon';
                badgeDateGroup.appendChild(chevron);
                
                card.classList.add('collapsed');
                
                // Add click handler to toggle collapse
                card.addEventListener('click', (e) => {
                    // Prevent toggling when clicking action buttons
                    if (e.target.closest('.card-actions')) return;
                    card.classList.toggle('collapsed');
                });
            }
            
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
            
            // Copy (Clipboard) Button
            const copyBtn = document.createElement('button');
            copyBtn.className = 'action-icon-btn btn-copy-action';
            copyBtn.title = 'Copy this update to clipboard';
            copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i>';
            copyBtn.addEventListener('click', () => copyToClipboard(update, copyBtn));

            // Share (Tweet) Button
            const tweetBtn = document.createElement('button');
            tweetBtn.className = 'action-icon-btn btn-tweet-action';
            tweetBtn.title = 'Select and compose a Tweet about this update';
            tweetBtn.innerHTML = '<i class="fa-brands fa-x-twitter"></i>';
            tweetBtn.addEventListener('click', () => openTweetModal(update));
            
            actions.appendChild(linkBtn);
            actions.appendChild(copyBtn);
            actions.appendChild(tweetBtn);
            
            header.appendChild(badgeDateGroup);
            header.appendChild(actions);

            // Body content
            const body = document.createElement('div');
            body.className = 'card-body';
            body.innerHTML = searchQuery ? highlightHTML(update.content_html, searchQuery) : update.content_html;

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
        document.querySelector('#tweet-modal .modal-container').setAttribute('data-type', update.type);
        
        modalUpdateDate.textContent = update.date;
        
        // Shorten html-to-text preview for the modal card header
        let previewText = update.content_text;
        if (previewText.length > 180) {
            previewText = previewText.substring(0, 177) + '...';
        }
        modalUpdateContent.textContent = previewText;

        // Reset tabs to default (Twitter)
        activeSharePlatform = 'twitter';
        shareTabs.forEach(t => {
            if (t.getAttribute('data-platform') === 'twitter') t.classList.add('active');
            else t.classList.remove('active');
        });
        
        // Load default content
        updateShareComposer('twitter');
        
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
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const urls = text.match(urlRegex) || [];
        
        let calculatedLength = text.length;
        urls.forEach(url => {
            calculatedLength = calculatedLength - url.length + 23;
        });

        charCountCurrent.textContent = calculatedLength;
        
        const charCounterContainer = document.querySelector('.char-counter');
        const progressCircle = document.getElementById('progress-ring-circle');
        
        // Update SVG progress ring
        // Circumference = 2 * PI * r = 2 * 3.14159 * 9 = 56.55
        const circumference = 56.55;
        let percentage = Math.min(calculatedLength / 280, 1.0);
        if (calculatedLength < 0) percentage = 0;
        const offset = circumference - (percentage * circumference);
        progressCircle.style.strokeDashoffset = offset;
        
        // Update color and state based on limits
        if (calculatedLength > 280) {
            charCounterContainer.className = 'char-counter over-limit';
            progressCircle.style.stroke = 'var(--accent-rose)';
            sendTweetBtn.disabled = true;
        } else if (calculatedLength > 250) {
            charCounterContainer.className = 'char-counter near-limit';
            progressCircle.style.stroke = 'var(--accent-amber)';
            sendTweetBtn.disabled = false;
        } else {
            charCounterContainer.className = 'char-counter';
            progressCircle.style.stroke = 'var(--accent-primary)';
            sendTweetBtn.disabled = false;
        }
    }

    function sendTweet() {
        const shareText = tweetTextarea.value.trim();
        if (!shareText) return;
        
        if (activeSharePlatform === 'twitter') {
            const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
            window.open(twitterUrl, '_blank', 'noopener,noreferrer');
            closeTweetModal();
        } else {
            // Slack or LinkedIn: Copy to Clipboard
            navigator.clipboard.writeText(shareText).then(() => {
                const originalContent = sendTweetBtn.innerHTML;
                sendTweetBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
                sendTweetBtn.disabled = true;
                
                setTimeout(() => {
                    sendTweetBtn.innerHTML = originalContent;
                    sendTweetBtn.disabled = false;
                    closeTweetModal();
                }, 1000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
                alert('Failed to copy to clipboard.');
            });
        }
    }

    // Share Platform Composer Switcher Utility
    function updateShareComposer(platform) {
        activeSharePlatform = platform;
        shareTabs.forEach(t => {
            if (t.getAttribute('data-platform') === platform) t.classList.add('active');
            else t.classList.remove('active');
        });
        
        const characterCountContainer = document.querySelector('.char-counter-container');
        const badge = selectedUpdate.type;
        const date = selectedUpdate.date;
        const text = selectedUpdate.content_text;
        const link = selectedUpdate.link;
        
        if (platform === 'twitter') {
            characterCountContainer.style.display = 'flex';
            sendTweetBtn.className = 'btn btn-twitter';
            sendTweetBtn.innerHTML = '<i class="fa-brands fa-x-twitter"></i> Post to Twitter';
            
            // Twitter default
            const titlePrefix = `BigQuery [${badge}] (${date}):`;
            const twitterLinkLength = 23;
            const extraWhitespace = 4;
            const remainingSpace = 280 - titlePrefix.length - twitterLinkLength - extraWhitespace;
            let trimmed = text;
            if (trimmed.length > remainingSpace) {
                trimmed = trimmed.substring(0, remainingSpace - 3) + '...';
            }
            tweetTextarea.value = `${titlePrefix}\n${trimmed}\n\n${link}`;
            updateCharCounter();
        } else if (platform === 'slack') {
            characterCountContainer.style.display = 'none';
            sendTweetBtn.className = 'btn btn-slack';
            sendTweetBtn.innerHTML = '<i class="fa-solid fa-copy"></i> Copy Slack Format';
            sendTweetBtn.disabled = false;
            
            // Slack markdown styling
            tweetTextarea.value = `*BigQuery Release [${badge}]* (${date})\n> ${text.replace(/\n/g, '\n> ')}\nRead more: ${link}`;
        } else if (platform === 'linkedin') {
            characterCountContainer.style.display = 'none';
            sendTweetBtn.className = 'btn btn-linkedin';
            sendTweetBtn.innerHTML = '<i class="fa-solid fa-copy"></i> Copy LinkedIn Format';
            sendTweetBtn.disabled = false;
            
            // LinkedIn professional styling
            tweetTextarea.value = `📊 New BigQuery Release! [${badge}] (${date})\n\n${text}\n\nRead the full release documentation here: ${link}\n\n#BigQuery #GoogleCloud #DataEngineering #Analytics`;
        }
    }

    // Copy to Clipboard Utility
    function copyToClipboard(update, button) {
        const textToCopy = `BigQuery Update [${update.type}] (${update.date}):\n${update.content_text}\n\nRead more: ${update.link}`;
        navigator.clipboard.writeText(textToCopy).then(() => {
            const icon = button.querySelector('i');
            icon.className = 'fa-solid fa-check';
            button.classList.add('copied');
            button.title = 'Copied!';
            
            setTimeout(() => {
                icon.className = 'fa-regular fa-copy';
                button.classList.remove('copied');
                button.title = 'Copy this update to clipboard';
            }, 1500);
        }).catch(err => {
            console.error('Failed to copy to clipboard:', err);
        });
    }

    // Export to CSV Utility
    function exportToCSV() {
        if (!updates || updates.length === 0) return;
        
        // Get currently displayed updates
        const filtered = updates.filter(update => {
            const matchesFilter = activeFilter === 'all' || 
                update.type.toLowerCase() === activeFilter.toLowerCase();
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch = !searchQuery || 
                update.date.toLowerCase().includes(searchLower) ||
                update.type.toLowerCase().includes(searchLower) ||
                update.content_text.toLowerCase().includes(searchLower);
            return matchesFilter && matchesSearch;
        });
        
        if (filtered.length === 0) {
            alert('No release notes found to export.');
            return;
        }
        
        // Helper to properly format values for CSV (escaping quotes, wrapping commas/newlines)
        const escapeCSV = (val) => {
            if (val === null || val === undefined) return '';
            let str = String(val).replace(/"/g, '""');
            if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
                return `"${str}"`;
            }
            return str;
        };
        
        const headers = ['Date', 'Type', 'Content Text', 'Link'];
        const csvRows = [headers.map(escapeCSV).join(',')];
        
        filtered.forEach(update => {
            csvRows.push([
                update.date,
                update.type,
                update.content_text,
                update.link
            ].map(escapeCSV).join(','));
        });
        
        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `BigQuery_Release_Notes_Export_${activeFilter}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Search Highlighting Utility
    function highlightHTML(html, search) {
        if (!search) return html;
        const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(?![^<]*>)(${escapedSearch})`, 'gi');
        return html.replace(regex, '<mark class="search-highlight">$1</mark>');
    }

    // Filter Chip Counts Utility
    function updateFilterChipCounts() {
        filterChips.forEach(chip => {
            const type = chip.getAttribute('data-type');
            const count = updates.filter(update => {
                const matchesType = type === 'all' || update.type.toLowerCase() === type.toLowerCase();
                const searchLower = searchQuery.toLowerCase();
                const matchesSearch = !searchQuery || 
                    update.date.toLowerCase().includes(searchLower) ||
                    update.type.toLowerCase().includes(searchLower) ||
                    update.content_text.toLowerCase().includes(searchLower);
                return matchesType && matchesSearch;
            }).length;
            
            let countSpan = chip.querySelector('.chip-count');
            if (!countSpan) {
                countSpan = document.createElement('span');
                countSpan.className = 'chip-count';
                chip.appendChild(countSpan);
            }
            countSpan.textContent = count;
        });
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
        currentPage = 1; // Reset pagination
        renderFeed();
    });
    
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        searchInput.focus();
        currentPage = 1; // Reset pagination
        renderFeed();
    });

    // Filters
    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            activeFilter = chip.getAttribute('data-type');
            currentPage = 1; // Reset pagination
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
        currentPage = 1; // Reset pagination
        renderFeed();
    });

    // Layout switcher events
    layoutCardBtn.addEventListener('click', () => {
        activeLayout = 'card';
        layoutCardBtn.classList.add('active');
        layoutListBtn.classList.remove('active');
        feedContainer.classList.remove('compact-view');
        currentPage = 1; // Reset pagination
        renderFeed();
    });

    layoutListBtn.addEventListener('click', () => {
        activeLayout = 'list';
        layoutListBtn.classList.add('active');
        layoutCardBtn.classList.remove('active');
        feedContainer.classList.add('compact-view');
        currentPage = 1; // Reset pagination
        renderFeed();
    });

    // Load More Pagination events
    loadMoreBtn.addEventListener('click', () => {
        currentPage++;
        renderFeed();
    });

    // Export CSV & Theme Toggle Events
    exportCsvBtn.addEventListener('click', exportToCSV);
    
    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
        let theme = 'dark';
        
        if (document.body.classList.contains('light-theme')) {
            theme = 'light';
            themeToggleIcon.className = 'fa-solid fa-sun';
        } else {
            themeToggleIcon.className = 'fa-solid fa-moon';
        }
        localStorage.setItem('theme', theme);
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

    // Back to Top Events
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            backToTopBtn.classList.add('visible');
        } else {
            backToTopBtn.classList.remove('visible');
        }
    });

    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Share Modal Platform Tab events
    shareTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const platform = tab.getAttribute('data-platform');
            updateShareComposer(platform);
        });
    });

    // Offline Network Status Events
    function updateNetworkStatus() {
        if (navigator.onLine) {
            offlineBanner.style.display = 'none';
            refreshBtn.disabled = false;
        } else {
            offlineBanner.style.display = 'flex';
            refreshBtn.disabled = true;
        }
    }
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    // ----------------------------------------------------
    // Initialization
    // ----------------------------------------------------
    updateNetworkStatus(); // Initial check
    fetchUpdates(false);
});
