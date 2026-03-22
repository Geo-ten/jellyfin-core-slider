// Slider static settings
const core_slide_settings = {
    quality: {
        backdrop: 60,
        logo: 40,
    },
    fileNameLocation: null,
    shuffleInterval: 12000,
    retryInterval: 1000,
    maxOverviewLength: 230,
    maxItems: 6
};

// State management
const core_slide_data = {
    jellyfinData: {
        userId: null,
        appName: null,
        appVersion: null,
        deviceName: null,
        deviceLayout: null,
        deviceId: null,
        accessToken: null,
        serverAddress: null
    },
    slideshow: {
        hasInitialized: false,
        currentSlideIndex: 0,
        slideInterval: 12000,
        itemIds: [],
        loadedItems: {},
        totalItems: 0,
        direction: 1,
        isAnimating: false,
        isLoading: false,
        isHome: null,
        elements: {}
    },
};

function coreSlider() {
    let wasLoggedIn = false;

    // Check the user
    function userState() {
        try {
            return (window.ApiClient && window.ApiClient._currentUser && window.ApiClient._currentUser.Id && window.ApiClient._serverInfo && window.ApiClient._serverInfo.AccessToken);
        } catch (error) {
            console.error("Error checking login status:", error);
            return false;
        }
    }

    // Resets the slideshow state completely
    function resetSlideData() {
        console.log("🔄 Resetting slideshow state...");

        if ( core_slide_data.slideshow.slideInterval ) {
            core_slide_data.slideshow.slideInterval.stop();
        }

        const container = document.getElementById("core-slider");
        if ( container ) {
            while ( container.firstChild ) {
                container.removeChild(container.firstChild);
            }
        }

        core_slide_data.slideshow.hasInitialized = false;
        core_slide_data.slideshow.currentSlideIndex = 0;
        core_slide_data.slideshow.slideInterval = null;
        core_slide_data.slideshow.itemIds = [];
        core_slide_data.slideshow.loadedItems = {};
        core_slide_data.slideshow.totalItems = 0;
        core_slide_data.slideshow.isLoading = false;
    }

    // Step 1 (Checks if the user is currently logged in)
    const loginInterval = setInterval(function() {
        const isLoggedIn = userState();

        if ( isLoggedIn !== wasLoggedIn ) {
            if ( isLoggedIn ) {
                console.log("👤 User logged in. Initializing slideshow...");

                if ( !core_slide_data.slideshow.hasInitialized ) {
                    // Step 2
                    waitForApiClient();
                    clearInterval(loginInterval);
                } else {
                    console.log("🔄 Slideshow already initialized, skipping");
                }
            } else {
                console.log("👋 User logged out. Stopping slideshow...");
                resetSlideData();
            }
            wasLoggedIn = isLoggedIn;
        }
    }, 2000);

    // Step 2 (Wait for ApiClient to initialize before starting the slideshow)
    function waitForApiClient() {

        function check() {
            if ( !window.ApiClient ) {
                console.log("⏳ ApiClient not available yet. Waiting...");
                setTimeout(check, core_slide_settings.retryInterval);
                return;
            }

            if ( window.ApiClient._currentUser && window.ApiClient._currentUser.Id && window.ApiClient._serverInfo && window.ApiClient._serverInfo.AccessToken ) {
                console.log("🔓 User is fully logged in. Starting slideshow initialization...");

                if ( !core_slide_data.slideshow.hasInitialized ) {
                    initCoreData(function() {
                        console.log("✅ Jellyfin API client initialized successfully");
                        initCoreDataSlides();
                    });
                } else {
                    console.log("🔄 Slideshow already initialized, skipping");
                }
            } else {
                console.log("🔒 Authentication incomplete. Waiting for complete login...");
                setTimeout(check, core_slide_settings.retryInterval);
            }
        }

        check();
    }

    // Step 3 (Initializes Jellyfin data from ApiClient)
    async function initCoreData(callback) {
        if ( !window.ApiClient ) {
            console.warn("⏳ window.ApiClient is not available yet. Retrying...");
            setTimeout(() => initCoreData(callback), core_slide_settings.retryInterval);
            return;
        }

        try {
            const apiClient = window.ApiClient;
            const htmlClasses = document.querySelector('html').classList.value;
            const layoutMatch = htmlClasses.match(/layout-(\w+)/);
            const layout = layoutMatch ? layoutMatch[1] : null;

            core_slide_data.jellyfinData = {
                userId: apiClient.getCurrentUserId() || "Not Found",
                appName: apiClient._appName || "Not Found",
                appVersion: apiClient._appVersion || "Not Found",
                deviceName: apiClient._deviceName || "Not Found",
                deviceLayout: layout || "Not Found",
                deviceId: apiClient._deviceId || "Not Found",
                accessToken: apiClient._serverInfo.AccessToken || "Not Found",
                serverId: apiClient._serverInfo.Id || "Not Found",
                serverAddress: apiClient._serverAddress || "Not Found",
            };
            if ( callback && typeof callback === "function" ) {
                callback();
            }
        } catch (error) {
            console.error("Error initializing Jellyfin data:", error);
            setTimeout(() => initCoreData(callback), core_slide_settings.retryInterval);
        }
    };

    // Step 4 (Initialize the slideshow)
    async function initCoreDataSlides() {
        if ( core_slide_data.slideshow.hasInitialized ) {
            console.log("⚠️ Slideshow already initialized, skipping");
            return;
        } else {
            core_slide_data.slideshow.hasInitialized = true;
        }

        try {
            console.log("🌟 Initializing Enhanced Jellyfin Slideshow");
            await loadDataSlides();

            console.log("✅ Enhanced Jellyfin Slideshow initialized successfully");
        } catch (error) {
            console.error("Error initializing slideshow:", error);
            core_slide_data.slideshow.hasInitialized = false;
        }
    };

    // Process the next request in the queue with throttling
    const processNextRequest = () => {
        if (requestQueue.length === 0) {
            isProcessingQueue = false;
            return;
        }

        isProcessingQueue = true;
        const { url, callback } = requestQueue.shift();

        fetch(url).then((response) => {
            if (response.ok) {
                return response;
            }
            throw new Error(`Failed to fetch: ${response.status}`);
        })
        .then(callback)
        .catch((error) => {
            console.error("Error in throttled request:", error);
        })
        .finally(() => {
            setTimeout(processNextRequest, 100);
        });
    };

    // Step 5
    // Get authentication headers for API requests
    function getAuthHeader() {
        return ({
            Authorization: `MediaBrowser Client="${core_slide_data.jellyfinData.appName}", Device="${core_slide_data.jellyfinData.deviceName}", DeviceId="${core_slide_data.jellyfinData.deviceId}", Version="${core_slide_data.jellyfinData.appVersion}", Token="${core_slide_data.jellyfinData.accessToken}"`
        });
    };

    // Fetches random items from the server
    async function randomSlides() {
        try {
            if ( !core_slide_data.jellyfinData.accessToken || core_slide_data.jellyfinData.accessToken === "Not Found" ) {
                console.warn("Access token not available. Delaying API request...");
                return [];
            }

            if ( !core_slide_data.jellyfinData.serverAddress || core_slide_data.jellyfinData.serverAddress === "Not Found" ) {
                console.warn("Server address not available. Delaying API request...");
                return [];
            }

            console.log("Fetching random items from server...");

            const response = await fetch(`${core_slide_data.jellyfinData.serverAddress}/Items?IncludeItemTypes=Movie,Series&Recursive=true&hasOverview=true&imageTypes=Logo,Backdrop&sortBy=Random&isPlayed=False&enableUserData=true&Limit=${core_slide_settings.maxItems}&fields=Id,ImageTags,RemoteTrailers`, {
                headers: getAuthHeader(),
            });

            if ( !response.ok ) {
                console.error(`Failed to fetch items: ${response.status} ${response.statusText}`);
                return [];
            }

            const data = await response.json();
            const items = data.Items || [];

            console.log(`Successfully fetched ${items.length} random items from server`);
            return items.filter((item) => item.ImageTags && item.ImageTags.Logo).map((item) => item.Id);
        } catch (error) {
            console.error("Error fetching item IDs:", error);
            return [];
        }
    };

    async function loadDataList() {
        try {
            const listFileName = `${core_slide_data.jellyfinData.serverAddress}/web/${core_slide_settings.fileNameLocation}?userId=${core_slide_data.jellyfinData.userId}`;
            const response = await fetch(listFileName);

            if (!response.ok) {
                console.warn("list not found or inaccessible. Using random items.");
                return [];
            }

            const text = await response.text();
            return text.split("\n").map((id) => id.trim()).filter((id) => id).slice(1);
        } catch (error) {
            console.error("Error fetching list:", error);
            return [];
        }
    };

    // Build image urls
    async function buildImageUrl(item, imageType, index, serverAddress, quality) {
        const itemId = item.Id;
        let tag = null;

        if (imageType === "Backdrop") {
            if ( item.BackdropImageTags && Array.isArray(item.BackdropImageTags) && item.BackdropImageTags.length > 0 ) {
                const backdropIndex = index !== undefined ? index : 0;
                if (backdropIndex < item.BackdropImageTags.length) {
                    tag = item.BackdropImageTags[backdropIndex];
                }
            }
            if (!tag && item.ImageTags && item.ImageTags.Backdrop) {
                tag = item.ImageTags.Backdrop;
            }
        } else {
            if (item.ImageTags && item.ImageTags[imageType]) {
                tag = item.ImageTags[imageType];
            }
        }

        let baseUrl;
        if (index !== undefined) {
            baseUrl = `${serverAddress}/Items/${itemId}/Images/${imageType}/${index}`;
        } else {
            baseUrl = `${serverAddress}/Items/${itemId}/Images/${imageType}`;
        }

        if (tag) {
            const qualityParam = quality !== undefined ? `&quality=${quality}` : "";
            return `${baseUrl}?tag=${tag}${qualityParam}`;
        } else {
            const qualityParam = quality !== undefined ? quality : core_slide_settings.quality.backdrop;
            return `${baseUrl}?quality=${qualityParam}`;
        }
    }

    // Get the item details
    async function fetchItemDetails(itemId) {
        try {
            if (core_slide_data.slideshow.loadedItems[itemId]) {
                return core_slide_data.slideshow.loadedItems[itemId];
            }

            const response = await fetch(`${core_slide_data.jellyfinData.serverAddress}/Items/${itemId}`, {
                headers: getAuthHeader(),
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch item details: ${response.statusText}`);
            }

            const itemData = await response.json();

            core_slide_data.slideshow.loadedItems[itemId] = itemData;

            // Import Images
            core_slide_data.slideshow.loadedItems[itemId].Images = { 
                Backdrop: await buildImageUrl(itemData, "Backdrop", 0, core_slide_data.jellyfinData.serverAddress, core_slide_settings.quality.backdrop),
                Logo: await buildImageUrl(itemData, "Logo", undefined, core_slide_data.jellyfinData.serverAddress, core_slide_settings.quality.logo)
            };

            return itemData;
        } catch (error) {
            console.error(`Error fetching details for item ${itemId}:`, error);
            return null;
        }
    }

    // Change slide trigger
    function changeSlide(next) {
        if ( core_slide_data.slideshow.isAnimating || next === core_slide_data.slideshow.currentSlideIndex ) return;
        core_slide_data.slideshow.isAnimating = true;

        core_slide_data.slideshow.elements.createSlides.style.transform = 'translateX(' + (-next * 100) + '%)';

        core_slide_data.slideshow.elements.createSlides.querySelectorAll('.core-slide').forEach(function(slide, key) {
            slide.classList.toggle('core-slide-active', key === next);
        });

        core_slide_data.slideshow.elements.createDots.querySelectorAll('.core-slider-dot').forEach(function(dot, key) {
            dot.classList.toggle('core-slider-dot-active', key === next);
        });

        setTimeout(function() {
            core_slide_data.slideshow.currentSlideIndex = next;
            core_slide_data.slideshow.isAnimating = false;
        }, 350);

        resetAutoplay();
    }

    async function loadDataSlides() {
        try {
            core_slide_data.slideshow.isLoading = true;

            let itemIds = [];
            if ( core_slide_settings.fileNameLocation ) {
                itemIds = await loadDataList();
            } else {
                itemIds = await randomSlides();
            }

            core_slide_data.slideshow.itemIds = itemIds;
            core_slide_data.slideshow.totalItems = itemIds.length;

            // Create the core slider
            const { coreSlide, createSlides, createDots, buttonNext, buttonPrevious } = createSliderShell();

            // Load each slide (one by one)
            for (let i = 0; i < itemIds.length; i++) {
                await fetchItemDetails(itemIds[i]);
                const getItem = core_slide_data.slideshow.loadedItems[itemIds[i]];
                if ( !getItem ) continue;

                const slide = createSlideElement(getItem, i);
                const dot = createDotElement(i);
                createSlides.appendChild(slide);
                createDots.appendChild(dot);
            }

            // Arrows
            if ( buttonNext ) {
                buttonNext.onclick = function() { changeSlide((core_slide_data.slideshow.currentSlideIndex + 1) % core_slide_data.slideshow.totalItems); };
            }
            if ( buttonPrevious ) {
                buttonPrevious.onclick = function() { changeSlide((core_slide_data.slideshow.currentSlideIndex - 1 + core_slide_data.slideshow.totalItems) % core_slide_data.slideshow.totalItems); };
            }

            // Mouse/touch events
            coreSliderEventMouse(createSlides);

            // utoplay
            startAutoplay();

            // TV Navigation
            if ( core_slide_data.jellyfinData.deviceLayout === 'tv' ) {
                initSliderNavigation(coreSlide, createSlides);
            }
        } catch (error) {
            console.error("Error loading slideshow data:", error);
        } finally {
            core_slide_data.slideshow.isLoading = false;
        }
    }
    
    function startAutoplay() {
        stopAutoplay();

        core_slide_data.slideshow.slideInterval = setInterval(function() {
            let next = core_slide_data.slideshow.currentSlideIndex + core_slide_data.slideshow.direction;

            // If autoplay reach the start/end, change direction
            if ( next >= core_slide_data.slideshow.totalItems ) {
                core_slide_data.slideshow.direction = -1;
                next = core_slide_data.slideshow.currentSlideIndex + core_slide_data.slideshow.direction;
            } else if ( next < 0 ) {
                core_slide_data.slideshow.direction = 1;
                next = core_slide_data.slideshow.currentSlideIndex + core_slide_data.slideshow.direction;
            }

            changeSlide(next);
        }, core_slide_settings.shuffleInterval);
    }

    function stopAutoplay() {
        if ( core_slide_data.slideshow.slideInterval ) {
            clearInterval(core_slide_data.slideshow.slideInterval);
            core_slide_data.slideshow.slideInterval = null;
        }
    }

    function resetAutoplay() {
        if ( !core_slide_data.slideshow.isHome ) return;

        stopAutoplay();
        startAutoplay();
    }

    // Step 6 (Create the core slide)
    function createSliderShell() {
        if ( document.getElementById('core-slider') ) return;

        const coreSlide = document.createElement('div');
        coreSlide.id = 'core-slider';

        const createSlides = document.createElement('div');
        createSlides.className = 'core-slider-slides';

        const createDots = document.createElement('div');
        createDots.className = 'core-slider-dots';

        const focusRing = document.createElement('div');
        focusRing.className = 'core-slider-focus-ring';

        coreSlide.appendChild(createSlides);
        coreSlide.appendChild(createDots);
        coreSlide.appendChild(focusRing);

        // Arrows if the device is desktop
        let buttonNext = null;
        let buttonPrevious = null;
        if ( core_slide_data.jellyfinData.deviceLayout === 'desktop' ) {
            const createArrows = document.createElement('div');
            createArrows.className = 'core-slider-arrows';

            buttonPrevious = document.createElement('button');
            buttonPrevious.className = 'core-slider-button-prev';
            buttonPrevious.innerHTML = '<span class="material-icons chevron_left" aria-hidden="true"></span>';
            
            buttonNext = document.createElement('button');
            buttonNext.className = 'core-slider-button-next';
            buttonNext.innerHTML = '<span class="material-icons chevron_right" aria-hidden="true"></span>';

            createArrows.appendChild(buttonPrevious);
            createArrows.appendChild(buttonNext);
            coreSlide.appendChild(createArrows);
        }

        core_slide_data.slideshow.elements.createSlides = createSlides;
        core_slide_data.slideshow.elements.createDots = createDots;

        document.body.appendChild(coreSlide);
        return { coreSlide, createSlides, createDots, buttonNext, buttonPrevious };
    }

    // Create slide
    function createSlideElement(getItem, index) {
        const createSlide = document.createElement('div');
        createSlide.setAttribute('data-id', getItem.Id);
        createSlide.setAttribute('data-server', core_slide_data.jellyfinData.serverId);
        createSlide.className = index === 0 ? 'core-slide core-slide-active' : 'core-slide';

        if ( window.Emby && window.Emby.Page && core_slide_data.jellyfinData.deviceLayout !== 'desktop' ) {
            createSlide.onclick = function() {
                Emby.Page.show(`/details?id=${getItem.Id}&serverId=${core_slide_data.jellyfinData.serverId}`);
            };
        }

        const createSlideBackdrop = document.createElement('div');
        createSlideBackdrop.className = 'core-slide-backdrop';
        createSlideBackdrop.innerHTML = `<img loading="lazy" decoding="async" src="${getItem.Images.Backdrop}" alt="${getItem.Name} - Backdrop" width="1800" height="810" />`;
        createSlide.appendChild(createSlideBackdrop);

        const createSlideLogo = document.createElement('div');
        createSlideLogo.className = 'core-slide-logo';
        createSlideLogo.innerHTML = `<img loading="lazy" decoding="async" src="${getItem.Images.Logo}" alt="${getItem.Name} - Logo" width="296" height="110" />`;
        createSlide.appendChild(createSlideLogo);

        let overview = getItem.Overview || '';
        if ( overview.length > core_slide_settings.maxOverviewLength ) {
            overview = overview.substring(0, core_slide_settings.maxOverviewLength) + '...';
        }
        const createSlideOverview = document.createElement('div');
        createSlideOverview.className = 'core-slide-overview';
        if ( overview ) createSlideOverview.innerHTML = `<p>${overview}</p>`;
        createSlide.appendChild(createSlideOverview);

        if ( core_slide_data.jellyfinData.deviceLayout === 'desktop' ) {
            const createSlideButtons = document.createElement('div');
            createSlideButtons.className = 'core-slide-buttons';

            const createSlideButton = document.createElement('button');
            createSlideButton.type = `button`;
            createSlideButton.innerHTML = `Show more`;
            createSlideButton.onclick = function() {
                Emby.Page.show(`/details?id=${getItem.Id}&serverId=${core_slide_data.jellyfinData.serverId}`);
            };

            createSlide.appendChild(createSlideButtons);
            createSlideButtons.appendChild(createSlideButton);
        }

        return createSlide;
    }

    // Create the dot elementt
    function createDotElement(index) {
        const dot = document.createElement('div');
        dot.className = 'core-slider-dot' + (index === 0 ? ' core-slider-dot-active' : '');
        dot.setAttribute('data-index', index);
        dot.onclick = function() { changeSlide(index); };
        return dot;
    }

    // Step 7
    // TV slider event navigation
    function initSliderNavigation(coreSlide, createSlides) {
        coreSlide.setAttribute('tabindex', '0');

        let sliderHasFocus = false;

        // Check the active slider
        function isSliderActive() {
            return !coreSlide.classList.contains('core-slider-hidden') && document.getElementById('core-slider') !== null;
        }

        function setFocus(hasFocus) {
            sliderHasFocus = hasFocus;
            coreSlide.classList.toggle('is-focused', hasFocus);
            if ( hasFocus ) {
                coreSlide.focus();
                // Scroll to the top
                window.scrollTo({ top: 0, behavior: 'instant' });
            }
        }

        // If Jellyfin return's focus, respect it
        coreSlide.addEventListener('focus', function() {
            sliderHasFocus = true;
            coreSlide.classList.add('is-focused');
        });

        document.addEventListener('keydown', function(e) {
            if ( !isSliderActive() ) return;

            switch(e.keyCode) {
                case 37:
                    if ( sliderHasFocus ) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        changeSlide((core_slide_data.slideshow.currentSlideIndex - 1 + core_slide_data.slideshow.totalItems) % core_slide_data.slideshow.totalItems);
                    }
                    break;
                case 39:
                    if ( sliderHasFocus ) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        changeSlide((core_slide_data.slideshow.currentSlideIndex + 1) % core_slide_data.slideshow.totalItems);
                    }
                    break;
                case 38:
                    if ( sliderHasFocus ) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        sliderHasFocus = false;
                        coreSlide.classList.remove('is-focused');
                        coreSlide.blur();
                        setTimeout(function() {
                            // Go to the home button
                            const homeBtn = document.querySelector('.skinHeader .headerTabs .emby-tab-button');
                            if ( homeBtn ) homeBtn.focus();
                        }, 50);
                    }
                    break;
                case 40:
                    if ( sliderHasFocus ) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        sliderHasFocus = false;
                        coreSlide.classList.remove('is-focused');
                        coreSlide.blur();
                        setTimeout(function() {
                            const tabContent = document.querySelector('.tabContent.is-active');
                            if ( tabContent ) {
                                const firstFocusable = tabContent.querySelector('a, button, [tabindex="0"]');
                                if ( firstFocusable ) firstFocusable.focus();
                            }
                        }, 50);
                    }
                    break;
                case 13:
                    if ( sliderHasFocus ) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        const activeSlide = createSlides.querySelectorAll('.core-slide')[core_slide_data.slideshow.currentSlideIndex];
                        if ( activeSlide ) {
                            const itemId = activeSlide.getAttribute('data-id');
                            const serverId = activeSlide.getAttribute('data-server');
                            if ( window.Emby && window.Emby.Page && core_slide_data.jellyfinData.deviceLayout !== 'desktop' ) {
                                Emby.Page.show('/details?id=' + itemId + '&serverId=' + serverId);
                            } else {
                                const link = activeSlide.querySelector('a');
                                if ( link ) window.location.href = link.href;
                            }
                        }
                    }
                    break;
            }
        }, true);

        // ↑ Up from (tabContent)
        document.addEventListener('keydown', function(e) {
            if ( !isSliderActive() ) return;

            if ( e.keyCode !== 38 || sliderHasFocus ) return;
            const activeEl = document.activeElement;
            if ( !activeEl ) return;

            const activeRect = activeEl.getBoundingClientRect();
            const sliderRect = coreSlide.getBoundingClientRect();
            const distanceFromSlider = activeRect.top - sliderRect.bottom;

            if ( activeRect.top > sliderRect.bottom && distanceFromSlider < 200 ) {
                e.preventDefault();
                e.stopImmediatePropagation();
                setFocus(true);
            }
        }, true);

        // ↓ Down from (header)
        document.addEventListener('keydown', function(e) {
            if ( !isSliderActive() ) return;

            if ( e.keyCode !== 40 || sliderHasFocus ) return;
            const activeEl = document.activeElement;
            if ( !activeEl ) return;

            const header = document.querySelector('.skinHeader');
            if ( header && header.contains(activeEl) ) {
                e.preventDefault();
                e.stopImmediatePropagation();
                setFocus(true);
            }
        }, true);

        // Magic Remote
        coreSlide.addEventListener('mouseenter', function() { setFocus(true); });
        coreSlide.addEventListener('mouseleave', function() {
            sliderHasFocus = false;
            coreSlide.classList.remove('is-focused');
        });

        // Remove focus from the slider if is hidden
        const visibilityObserver = new MutationObserver(function() {
            if ( coreSlide.classList.contains('core-slider-hidden') && sliderHasFocus ) {
                sliderHasFocus = false;
                coreSlide.classList.remove('is-focused');
            }
        });
        visibilityObserver.observe(coreSlide, { attributes: true, attributeFilter: ['class'] });

        // Initial focus
        setTimeout(function() { setFocus(true); }, 500);
    }

    // coreSliderEventMouse — Global touch/pointers events
    function coreSliderEventMouse(createSlides) {
        let pointerStartX = 0;
        let pointerCurrentX = 0;
        let pointerStartTime = 0;
        let isDragging = false;
        let wasDragging = false;

        const VELOCITY_THRESHOLD = 0.3;
        const DISTANCE_THRESHOLD = 0.25;

        createSlides.addEventListener('pointerdown', function(e) {
            if ( core_slide_data.slideshow.isAnimating ) return;

            // Prevent event from button element
            if ( e.target.closest('button, a') ) return;

            // Pause autoplay on drag
            stopAutoplay();

            e.preventDefault();
            pointerStartX = e.clientX;
            pointerCurrentX = e.clientX;
            pointerStartTime = Date.now();
            isDragging = true;
            wasDragging = false;

            createSlides.style.transition = 'none';
            createSlides.setPointerCapture(e.pointerId);
            createSlides.classList.add('touch-dragging', 'no-select');
        });

        createSlides.addEventListener('pointermove', function(e) {
            if ( !isDragging ) return;
            pointerCurrentX = e.clientX;

            const diff = pointerCurrentX - pointerStartX;
            const slideWidth = createSlides.parentElement.offsetWidth;

            // Convert px to % for consistency
            const diffPercent = (diff / slideWidth) * 100;
            const currentOffsetPercent = -core_slide_data.slideshow.currentSlideIndex * 100;

            let finalPercent = currentOffsetPercent + diffPercent;

            // Resistance for edges
            if ( (core_slide_data.slideshow.currentSlideIndex === 0 && diffPercent > 0) || (core_slide_data.slideshow.currentSlideIndex === core_slide_data.slideshow.totalItems - 1 && diffPercent < 0) ) {
                finalPercent = currentOffsetPercent + (diffPercent * 0.2);
            }

            createSlides.style.transform = 'translateX(' + finalPercent + '%)';
        });

        createSlides.addEventListener('pointerup', function() {
            if ( !isDragging ) return;
            isDragging = false;

            const diff = pointerCurrentX - pointerStartX;
            const elapsed = Date.now() - pointerStartTime;
            const slideWidth = createSlides.parentElement.offsetWidth;

            if ( Math.abs(diff) < 5 ) {
                createSlides.style.transition = 'transform 0.4s ease';
                createSlides.style.transform = 'translateX(' + (-core_slide_data.slideshow.currentSlideIndex * slideWidth) + 'px)';
                createSlides.classList.remove('touch-dragging', 'no-select');
                pointerStartX = 0;
                pointerCurrentX = 0;
                return;
            }

            const velocity = Math.abs(diff) / elapsed;
            const distanceRatio = Math.abs(diff) / slideWidth;
            const shouldChange = velocity > VELOCITY_THRESHOLD || distanceRatio > DISTANCE_THRESHOLD;

            createSlides.style.transition = 'transform 0.4s ease';

            if ( shouldChange && diff < 0 && core_slide_data.slideshow.currentSlideIndex < core_slide_data.slideshow.totalItems - 1 ) {
                changeSlide(core_slide_data.slideshow.currentSlideIndex + 1);
            } else if ( shouldChange && diff > 0 && core_slide_data.slideshow.currentSlideIndex > 0 ) {
                changeSlide(core_slide_data.slideshow.currentSlideIndex - 1);
            } else {
                createSlides.style.transform = 'translateX(' + (-core_slide_data.slideshow.currentSlideIndex * slideWidth) + 'px)';
            }

            createSlides.classList.remove('touch-dragging', 'no-select');
            pointerStartX = 0;
            pointerCurrentX = 0;

            // Resume autoplay after dragging
            resetAutoplay();
        });

        createSlides.addEventListener('click', function(e) {
            if ( wasDragging ) {
                e.stopPropagation();
                e.preventDefault();
                wasDragging = false;
            }
        }, true);

        function resetDrag() {
            if ( !isDragging ) return;
            isDragging = false;
            const slideWidth = createSlides.parentElement.offsetWidth;
            createSlides.style.transition = 'transform 0.4s ease';
            createSlides.style.transform = 'translateX(' + (-core_slide_data.slideshow.currentSlideIndex * slideWidth) + 'px)';
            createSlides.classList.remove('touch-dragging', 'no-select');
            pointerStartX = 0;
            pointerCurrentX = 0;
        }

        createSlides.addEventListener('pointercancel', resetDrag);
        createSlides.addEventListener('pointerleave', function(e) {
            if ( e.target === createSlides ) resetDrag();
        });
    }

    // Step 8
    // MutationObserver Observer
    function initVisibilityObserver() {
        function checkAndShowSlider() {
            const coreSlide = document.getElementById('core-slider');
            if ( !coreSlide ) return;

            const currentPath = window.location.href.toLowerCase().replace(window.location.origin, "");
            const isHome = currentPath.includes("/web/#/home.html") || currentPath.includes("/web/#/home") || currentPath.includes("/web/index.html#/home.html") || currentPath === "/web/index.html#/home" || currentPath === "/web/?#/home.html";
            core_slide_data.slideshow.isHome = isHome;

            if ( isHome ) {
                coreSlide.classList.remove('core-slider-hidden');
                document.documentElement.classList.add('html-slider');
                // ✅ Μόνο αν δεν τρέχει ήδη
                if ( !core_slide_data.slideshow.slideInterval ) {
                    startAutoplay();
                }
            } else {
                coreSlide.classList.add('core-slider-hidden');
                document.documentElement.classList.remove('html-slider');
                stopAutoplay();
            }

            // Slider has been initialized at home?
            if ( isHome && !core_slide_data.slideshow.hasInitialized ) {
                waitForApiClient();
            }
        }

        // Listen url changes
        window.addEventListener('hashchange', checkAndShowSlider);

        // Observe Jellyfin
        const observer = new MutationObserver(checkAndShowSlider);
        observer.observe(document.body, { childList: true, subtree: true });

        checkAndShowSlider();
    }

    initVisibilityObserver();
}

coreSlider();