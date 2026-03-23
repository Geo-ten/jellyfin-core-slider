// Slider static settings
const coreSlideSettings = {
    fileNameLocation: null,
    quality: {
        backdrop: 60,
        logo: 40,
    },
    maxItems: 6,
    maxOverviewLength: 230,
    slideInterval: 12000,
    retryInterval: 1000,
    button: {
        slideButtonName: 'Show more'
    },
    searchType: 'Movie,Series',
    info: {
        premiereDate: true,
        genre: true,
        ageRating: true,
        runtime: true,
        starRating: true,
    },
    AnimationEffectTV: true
};

// State management
const coreSlideData = {
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
        slideInterval: coreSlideSettings.slideInterval,
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

// Override Settings
if ( coreSlider ) {
    if ( coreSlider.AnimationEffectTV ) { coreSlideSettings.AnimationEffectTV = coreSlider.AnimationEffectTV; }
    if ( coreSlider.fileNameLocation ) { coreSlideSettings.fileNameLocation = coreSlider.fileNameLocation; }
    if ( coreSlider.qualityBackdrop ) { coreSlideSettings.quality.backdrop = coreSlider.qualityBackdrop; }
    if ( coreSlider.qualityLogo ) { coreSlideSettings.quality.logo = coreSlider.qualityLogo ;}
    if ( coreSlider.maxItems ) { coreSlideSettings.maxItems = coreSlider.maxItems; }
    if ( coreSlider.maxOverviewLength ) { coreSlideSettings.maxOverviewLength = coreSlider.maxOverviewLength; }
    if ( coreSlider.searchType ) { coreSlideSettings.searchType = coreSlider.searchType; }
    if ( coreSlider.slideButtonName ) { coreSlideSettings.button.slideButtonName = coreSlider.slideButtonName; }
    if ( coreSlider.slideInterval ) { coreSlideSettings.slideInterval = coreSlider.slideInterval; coreSlideData.slideshow.slideInterval = coreSlider.slideInterval; }
    if ( coreSlider.retryInterval ) { coreSlideSettings.retryInterval = coreSlider.retryInterval; }
    if ( coreSlider.enableInfoPremiereDate ) { coreSlideSettings.info.premiereDate = coreSlider.enableInfoPremiereDate; }
    if ( coreSlider.enableInfoGenre ) { coreSlideSettings.info.genre = coreSlider.enableInfoGenre; }
    if ( coreSlider.enableInfoAgeRating ) { coreSlideSettings.info.ageRating = coreSlider.enableInfoAgeRating; }
    if ( coreSlider.enableInfoRuntime ) { coreSlideSettings.info.runtime = coreSlider.enableInfoRuntime; }
    if ( coreSlider.enableInfoStarRating ) { coreSlideSettings.info.starRating = coreSlider.enableInfoStarRating; }
};

function initCoreSlider() {
    // Step 1 (Wait for ApiClient to initialize before starting the slideshow)
    function waitForApiClient() {

        function check() {
            if ( !window.ApiClient ) {
                console.log("⏳ ApiClient not available yet. Waiting...");
                setTimeout(check, coreSlideSettings.retryInterval);
                return;
            }

            if ( window.ApiClient._currentUser && window.ApiClient._currentUser.Id && window.ApiClient._serverInfo && window.ApiClient._serverInfo.AccessToken ) {
                console.log("🔓 User is fully logged in. Starting slideshow initialization...");

                if ( !coreSlideData.slideshow.hasInitialized ) {
                    initCoreData(function() {
                        console.log("✅ Jellyfin API client initialized successfully");
                        initCoreDataSlides();
                    });
                } else {
                    console.log("🔄 Slideshow already initialized, skipping");
                }
            } else {
                console.log("🔒 Authentication incomplete. Waiting for complete login...");
                setTimeout(check, coreSlideSettings.retryInterval);
            }
        }

        check();
    }

    // Step 2 (Initializes Jellyfin data from ApiClient)
    async function initCoreData(callback) {
        if ( !window.ApiClient ) {
            console.warn("⏳ window.ApiClient is not available yet. Retrying...");
            setTimeout(() => initCoreData(callback), coreSlideSettings.retryInterval);
            return;
        }

        try {
            const apiClient = window.ApiClient;
            const htmlClasses = document.querySelector('html').classList.value;
            const layoutMatch = htmlClasses.match(/layout-(\w+)/);
            const layout = layoutMatch ? layoutMatch[1] : null;

            coreSlideData.jellyfinData = {
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
            setTimeout(() => initCoreData(callback), coreSlideSettings.retryInterval);
        }
    };

    // Step 3 (Initialize the slideshow)
    async function initCoreDataSlides() {
        if ( coreSlideData.slideshow.hasInitialized ) {
            console.log("⚠️ Slideshow already initialized, skipping");
            return;
        } else {
            coreSlideData.slideshow.hasInitialized = true;
        }

        try {
            console.log("🌟 Initializing Enhanced Jellyfin Slideshow");
            await loadDataSlides();

            console.log("✅ Enhanced Jellyfin Slideshow initialized successfully");
        } catch (error) {
            console.error("Error initializing slideshow:", error);
            coreSlideData.slideshow.hasInitialized = false;
        }
    };

    // Step 4
    // Get authentication headers for API requests
    function getAuthHeader() {
        return ({
            Authorization: `MediaBrowser Client="${coreSlideData.jellyfinData.appName}", Device="${coreSlideData.jellyfinData.deviceName}", DeviceId="${coreSlideData.jellyfinData.deviceId}", Version="${coreSlideData.jellyfinData.appVersion}", Token="${coreSlideData.jellyfinData.accessToken}"`
        });
    };

    // Fetches random items from the server
    async function randomSlides() {
        try {
            if ( !coreSlideData.jellyfinData.accessToken || coreSlideData.jellyfinData.accessToken === "Not Found" ) {
                console.warn("Access token not available. Delaying API request...");
                return [];
            }

            if ( !coreSlideData.jellyfinData.serverAddress || coreSlideData.jellyfinData.serverAddress === "Not Found" ) {
                console.warn("Server address not available. Delaying API request...");
                return [];
            }

            console.log("Fetching random items from server...");

            const response = await fetch(`${coreSlideData.jellyfinData.serverAddress}/Items?IncludeItemTypes=${coreSlideSettings.searchType}&Recursive=true&hasOverview=true&imageTypes=Logo,Backdrop&sortBy=Random&isPlayed=False&enableUserData=true&Limit=${coreSlideSettings.maxItems}&fields=Id,ImageTags,RemoteTrailers`, {
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
            const listFileName = `${coreSlideData.jellyfinData.serverAddress}/web/${coreSlideSettings.fileNameLocation}?userId=${coreSlideData.jellyfinData.userId}`;
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
            const qualityParam = quality !== undefined ? quality : coreSlideSettings.quality.backdrop;
            return `${baseUrl}?quality=${qualityParam}`;
        }
    }

    // Get the item details
    async function fetchItemDetails(itemId) {
        try {
            if (coreSlideData.slideshow.loadedItems[itemId]) {
                return coreSlideData.slideshow.loadedItems[itemId];
            }

            const response = await fetch(`${coreSlideData.jellyfinData.serverAddress}/Items/${itemId}`, {
                headers: getAuthHeader(),
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch item details: ${response.statusText}`);
            }

            const itemData = await response.json();

            coreSlideData.slideshow.loadedItems[itemId] = itemData;

            // Import Images
            coreSlideData.slideshow.loadedItems[itemId].Images = { 
                Backdrop: await buildImageUrl(itemData, "Backdrop", 0, coreSlideData.jellyfinData.serverAddress, coreSlideSettings.quality.backdrop),
                Logo: await buildImageUrl(itemData, "Logo", undefined, coreSlideData.jellyfinData.serverAddress, coreSlideSettings.quality.logo)
            };

            return itemData;
        } catch (error) {
            console.error(`Error fetching details for item ${itemId}:`, error);
            return null;
        }
    }

    // Change slide trigger
    function changeSlide(next) {
        if ( coreSlideData.slideshow.isAnimating || next === coreSlideData.slideshow.currentSlideIndex ) { return; }
        coreSlideData.slideshow.isAnimating = true;

        // Animated transform
        if ( coreSlideSettings.AnimationEffectTV && coreSlideData.jellyfinData.deviceLayout === 'tv' || coreSlideData.jellyfinData.deviceLayout !== 'tv' ) {
            coreSlideData.slideshow.elements.createSlides.style.transform = 'translateX(' + (-next * 100) + '%)';
        }

        coreSlideData.slideshow.elements.createSlides.querySelectorAll('.core-slide').forEach(function(slide, key) {
            slide.classList.toggle('core-slide-active', key === next);
        });

        coreSlideData.slideshow.elements.createDots.querySelectorAll('.core-slider-dot').forEach(function(dot, key) {
            dot.classList.toggle('core-slider-dot-active', key === next);
        });

        setTimeout(function() {
            coreSlideData.slideshow.currentSlideIndex = next;
            coreSlideData.slideshow.isAnimating = false;
        }, 350);

        resetAutoplay();
    }

    async function loadDataSlides() {
        try {
            coreSlideData.slideshow.isLoading = true;

            let itemIds = [];
            if ( coreSlideSettings.fileNameLocation ) {
                itemIds = await loadDataList();
            } else {
                itemIds = await randomSlides();
            }

            coreSlideData.slideshow.itemIds = itemIds;
            coreSlideData.slideshow.totalItems = itemIds.length;

            // Create the core slider
            const { coreSlide, createSlides, createDots, buttonNext, buttonPrevious } = createSliderShell();

            // Load each slide (one by one)
            for (let i = 0; i < itemIds.length; i++) {
                await fetchItemDetails(itemIds[i]);
                const getItem = coreSlideData.slideshow.loadedItems[itemIds[i]];
                if ( !getItem ) { continue };

                const slide = createSlideElement(getItem, i);
                const dot = createDotElement(i);
                createSlides.appendChild(slide);
                createDots.appendChild(dot);
            }

            // Arrows
            if ( buttonNext ) {
                buttonNext.onclick = function() { changeSlide((coreSlideData.slideshow.currentSlideIndex + 1) % coreSlideData.slideshow.totalItems); };
            }
            if ( buttonPrevious ) {
                buttonPrevious.onclick = function() { changeSlide((coreSlideData.slideshow.currentSlideIndex - 1 + coreSlideData.slideshow.totalItems) % coreSlideData.slideshow.totalItems); };
            }

            // Mouse/touch events
            if ( coreSlideData.jellyfinData.deviceLayout !== 'tv' ) {
                coreSliderEventMouse(createSlides);
            }

            // Autoplay
            startAutoplay();

            // TV Navigation
            if ( coreSlideData.jellyfinData.deviceLayout === 'tv' ) {
                initSliderNavigation(coreSlide, createSlides);
            }
        } catch (error) {
            console.error("Error loading slideshow data:", error);
        } finally {
            coreSlideData.slideshow.isLoading = false;
        }
    }
    
    function startAutoplay() {
        stopAutoplay();

        coreSlideData.slideshow.slideInterval = setInterval(function() {
            let next = coreSlideData.slideshow.currentSlideIndex + coreSlideData.slideshow.direction;

            // If autoplay reach the start/end, change direction
            if ( next >= coreSlideData.slideshow.totalItems ) {
                coreSlideData.slideshow.direction = -1;
                next = coreSlideData.slideshow.currentSlideIndex + coreSlideData.slideshow.direction;
            } else if ( next < 0 ) {
                coreSlideData.slideshow.direction = 1;
                next = coreSlideData.slideshow.currentSlideIndex + coreSlideData.slideshow.direction;
            }

            changeSlide(next);
        }, coreSlideSettings.slideInterval);
    }

    function stopAutoplay() {
        if ( coreSlideData.slideshow.slideInterval ) {
            clearInterval(coreSlideData.slideshow.slideInterval);
            coreSlideData.slideshow.slideInterval = null;
        }
    }

    function resetAutoplay() {
        if ( !coreSlideData.slideshow.isHome ) { return; }

        stopAutoplay();
        startAutoplay();
    }

    // Step 5 (Create the core slide)
    function createSliderShell() {
        if ( document.getElementById('core-slider') ) { return; }
        
        const coreSlide = document.createElement('div');
        coreSlide.id = 'core-slider';
        if ( !coreSlideSettings.AnimationEffectTV && coreSlideData.jellyfinData.deviceLayout === 'tv' ) { coreSlide.className = 'core-slider-no-animation'; }

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
        if ( coreSlideData.jellyfinData.deviceLayout === 'desktop' ) {
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

        coreSlideData.slideshow.elements.createSlides = createSlides;
        coreSlideData.slideshow.elements.createDots = createDots;

        document.body.appendChild(coreSlide);
        return { coreSlide, createSlides, createDots, buttonNext, buttonPrevious };
    }

    // Create slide
    function createSlideElement(getItem, index) {
        const createSlide = document.createElement('div');
        createSlide.setAttribute('data-id', getItem.Id);
        createSlide.setAttribute('data-server', coreSlideData.jellyfinData.serverId);
        createSlide.className = index === 0 ? 'core-slide core-slide-active' : 'core-slide';

        if ( window.Emby && window.Emby.Page && coreSlideData.jellyfinData.deviceLayout !== 'desktop' ) {
            createSlide.onclick = function() {
                Emby.Page.show(`/details?id=${getItem.Id}&serverId=${coreSlideData.jellyfinData.serverId}`);
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

        const createSlideInfo = document.createElement('div');
        createSlideInfo.className = 'core-slide-info';

        // Item info
        if ( coreSlideSettings.info.premiereDate && getItem.PremiereDate && !isNaN(new Date(getItem.PremiereDate)) ) {
            const premiere = new Date(getItem.PremiereDate).getFullYear();
            const createSlideInfoPremiere = document.createElement('div');
            createSlideInfoPremiere.className = 'core-slide-info-premiere';
            createSlideInfoPremiere.innerHTML = `<p>${premiere}</p>`;
            createSlideInfo.appendChild(createSlideInfoPremiere);
        }

        if ( coreSlideSettings.info.genre && getItem.Genres && getItem.Genres.length > 0 ) {
            let genre = getItem.Genres;
            if ( genre.length > 1 ) { 
                genre = genre.slice(0, 2).toString().replace(/,/g, ', ');
            }
            const createSlideInfoGenre = document.createElement('div');
            createSlideInfoGenre.className = 'core-slide-info-genre';
            createSlideInfoGenre.innerHTML = `<p>${genre}</p>`;
            createSlideInfo.appendChild(createSlideInfoGenre);
        }

        if ( coreSlideSettings.info.ageRating && getItem.OfficialRating ) {
            const createSlideInfoRating = document.createElement('div');
            createSlideInfoRating.className = 'core-slide-info-age-rating';
            createSlideInfoRating.innerHTML = `<p>${getItem.OfficialRating}</p>`;
            createSlideInfo.appendChild(createSlideInfoRating);
        }

        if ( coreSlideSettings.info.runtime && (getItem.ChildCount || getItem.RunTimeTicks) ) {
            const createSlideInfoCount = document.createElement('div');

            if ( getItem.ChildCount ) {
                let seasonText = 'Season';
                if ( getItem.ChildCount > 1 ) { seasonText += 's'; }
                createSlideInfoCount.className = 'core-slide-info-season';
                createSlideInfoCount.innerHTML = `<p>${getItem.ChildCount} ${seasonText}</p>`;
            } else {
                const milliseconds = getItem.RunTimeTicks / 10000;
                const endTime = new Date(new Date().getTime() + milliseconds);
                const formattedEndTime = endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
                createSlideInfoCount.className = 'core-slide-info-time';
                createSlideInfoCount.innerHTML = `<p>Ends at ${formattedEndTime}</p>`;
            }

            createSlideInfo.appendChild(createSlideInfoCount);
        }

        if ( coreSlideSettings.info.starRating && getItem.CommunityRating ) {
            const createSlideInfoCommunityRating = document.createElement('div');
            createSlideInfoCommunityRating.className = 'core-slide-info-star-rating';
            createSlideInfoCommunityRating.innerHTML = `<p><span class="material-icons starIcon star" aria-hidden="true"></span> ${getItem.CommunityRating.toFixed(1)}</p>`;
            createSlideInfo.appendChild(createSlideInfoCommunityRating);
        }

        createSlide.appendChild(createSlideInfo);

        let overview = getItem.Overview || '';
        if ( overview && overview.length > coreSlideSettings.maxOverviewLength ) {
            overview = overview.substring(0, coreSlideSettings.maxOverviewLength) + '...';
        }
        if ( overview && overview !== '' ) { 
            const createSlideOverview = document.createElement('div');
            createSlideOverview.className = 'core-slide-overview';
            createSlideOverview.innerHTML = `<p>${overview}</p>`;
            createSlide.appendChild(createSlideOverview);
        }

        if ( coreSlideData.jellyfinData.deviceLayout === 'desktop' ) {
            const createSlideButtons = document.createElement('div');
            createSlideButtons.className = 'core-slide-buttons';

            const createSlideButton = document.createElement('button');
            createSlideButton.type = `button`;
            createSlideButton.innerHTML = `${coreSlideSettings.button.slideButtonName}`;
            createSlideButton.onclick = function() {
                Emby.Page.show(`/details?id=${getItem.Id}&serverId=${coreSlideData.jellyfinData.serverId}`);
            };

            createSlide.appendChild(createSlideButtons);
            createSlideButtons.appendChild(createSlideButton);
        }

        return createSlide;
    }

    // Create the dot element
    function createDotElement(index) {
        const dot = document.createElement('div');
        dot.className = 'core-slider-dot' + (index === 0 ? ' core-slider-dot-active' : '');
        dot.setAttribute('data-index', index);
        dot.onclick = function() { changeSlide(index); };
        return dot;
    }

    // Step 6
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
            coreSlide.classList.toggle('core-slider-focused', hasFocus);
            if ( hasFocus ) {
                coreSlide.focus();
                // Scroll to the top
                window.scrollTo({ top: 0, behavior: 'instant' });
            }
        }

        // If Jellyfin return's focus, respect it
        coreSlide.addEventListener('focus', function() {
            sliderHasFocus = true;
            coreSlide.classList.add('core-slider-focused');
        });

        document.addEventListener('keydown', function(e) {
            if ( !isSliderActive() ) { return; }

            switch(e.keyCode) {
                case 37:
                    // ←
                    if ( sliderHasFocus ) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        if ( coreSlideData.slideshow.currentSlideIndex > 0 ) {
                            changeSlide((coreSlideData.slideshow.currentSlideIndex - 1 + coreSlideData.slideshow.totalItems) % coreSlideData.slideshow.totalItems);
                        }
                    }
                    break;
                case 39:
                    // →
                    if ( sliderHasFocus ) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        if ( coreSlideData.slideshow.currentSlideIndex < coreSlideSettings.maxItems - 1 ) {
                            changeSlide((coreSlideData.slideshow.currentSlideIndex + 1) % coreSlideData.slideshow.totalItems);
                        }
                    }
                    break;
                case 38:
                    // ↑
                    if ( sliderHasFocus ) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        sliderHasFocus = false;
                        coreSlide.classList.remove('core-slider-focused');
                        coreSlide.blur();
                        setTimeout(function() {
                            // Go to the home button
                            const homeButton = document.querySelector('.skinHeader .headerTabs .emby-tab-button');
                            if ( homeButton ) homeButton.focus();
                        }, 50);
                    }
                    break;
                case 40:
                    // ↓
                    if ( sliderHasFocus ) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        sliderHasFocus = false;
                        coreSlide.classList.remove('core-slider-focused');
                        coreSlide.blur();
                        setTimeout(function() {
                            const tabContent = document.querySelector('.tabContent.is-active');
                            if ( tabContent ) {
                                const firstFocusable = tabContent.querySelector('a, button, [tabindex="0"]');
                                if ( firstFocusable ) { firstFocusable.focus(); }
                            }
                        }, 50);
                    }
                    break;
                case 13:
                    // OK
                    if ( sliderHasFocus ) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        const activeSlide = createSlides.querySelectorAll('.core-slide')[coreSlideData.slideshow.currentSlideIndex];
                        if ( activeSlide ) {
                            const itemId = activeSlide.getAttribute('data-id');
                            const serverId = activeSlide.getAttribute('data-server');

                            if ( window.Emby && window.Emby.Page && coreSlideData.jellyfinData.deviceLayout !== 'desktop' ) {
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
            if ( !isSliderActive() ) { return; }

            if ( e.keyCode !== 38 || sliderHasFocus ) { return; }
            const activeElement = document.activeElement;
            if ( !activeElement ) { return; }

            const activeRect = activeElement.getBoundingClientRect();
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
            if ( !isSliderActive() ) { return; }

            if ( e.keyCode !== 40 || sliderHasFocus ) { return; }
            const activeElement = document.activeElement;
            if ( !activeElement ) { return; }

            const header = document.querySelector('.skinHeader');
            if ( header && header.contains(activeElement) ) {
                e.preventDefault();
                e.stopImmediatePropagation();
                setFocus(true);
            }
        }, true);

        // Magic Remote
        coreSlide.addEventListener('mouseenter', function() { setFocus(true); });
        coreSlide.addEventListener('mouseleave', function() {
            sliderHasFocus = false;
            coreSlide.classList.remove('core-slider-focused');
        });

        // Remove focus from the slider if is hidden
        const visibilityObserver = new MutationObserver(function() {
            if ( coreSlide.classList.contains('core-slider-hidden') && sliderHasFocus ) {
                sliderHasFocus = false;
                coreSlide.classList.remove('core-slider-focused');
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
            if ( coreSlideData.slideshow.isAnimating ) { return; }

            // Prevent event from button element
            if ( e.target.closest('button, a') ) { return; }

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
            if ( !isDragging ) { return; }
            pointerCurrentX = e.clientX;

            const diff = pointerCurrentX - pointerStartX;
            const slideWidth = createSlides.parentElement.offsetWidth;

            // Convert px to % for consistency
            const diffPercent = (diff / slideWidth) * 100;
            const currentOffsetPercent = -coreSlideData.slideshow.currentSlideIndex * 100;

            let finalPercent = currentOffsetPercent + diffPercent;

            // Resistance for edges
            if ( (coreSlideData.slideshow.currentSlideIndex === 0 && diffPercent > 0) || (coreSlideData.slideshow.currentSlideIndex === coreSlideData.slideshow.totalItems - 1 && diffPercent < 0) ) {
                finalPercent = currentOffsetPercent + (diffPercent * 0.2);
            }

            createSlides.style.transform = 'translateX(' + finalPercent + '%)';
        });

        createSlides.addEventListener('pointerup', function() {
            if ( !isDragging ) { return; }
            isDragging = false;

            const diff = pointerCurrentX - pointerStartX;
            const elapsed = Date.now() - pointerStartTime;
            const slideWidth = createSlides.parentElement.offsetWidth;

            if ( Math.abs(diff) < 5 ) {
                createSlides.style.transition = 'transform 0.4s ease';
                createSlides.style.transform = 'translateX(' + (-coreSlideData.slideshow.currentSlideIndex * slideWidth) + 'px)';
                createSlides.classList.remove('touch-dragging', 'no-select');
                pointerStartX = 0;
                pointerCurrentX = 0;
                return;
            }

            const velocity = Math.abs(diff) / elapsed;
            const distanceRatio = Math.abs(diff) / slideWidth;
            const shouldChange = velocity > VELOCITY_THRESHOLD || distanceRatio > DISTANCE_THRESHOLD;

            createSlides.style.transition = 'transform 0.4s ease';

            if ( shouldChange && diff < 0 && coreSlideData.slideshow.currentSlideIndex < coreSlideData.slideshow.totalItems - 1 ) {
                changeSlide(coreSlideData.slideshow.currentSlideIndex + 1);
            } else if ( shouldChange && diff > 0 && coreSlideData.slideshow.currentSlideIndex > 0 ) {
                changeSlide(coreSlideData.slideshow.currentSlideIndex - 1);
            } else {
                createSlides.style.transform = 'translateX(' + (-coreSlideData.slideshow.currentSlideIndex * slideWidth) + 'px)';
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
            if ( !isDragging ) { return; }
            isDragging = false;
            const slideWidth = createSlides.parentElement.offsetWidth;
            createSlides.style.transition = 'transform 0.4s ease';
            createSlides.style.transform = 'translateX(' + (-coreSlideData.slideshow.currentSlideIndex * slideWidth) + 'px)';
            createSlides.classList.remove('touch-dragging', 'no-select');
            pointerStartX = 0;
            pointerCurrentX = 0;
        }

        createSlides.addEventListener('pointercancel', resetDrag);
        createSlides.addEventListener('pointerleave', function(e) {
            if ( e.target === createSlides ) { resetDrag(); }
        });
    }

    // Step 7
    // MutationObserver Observer
    function initVisibilityObserver() {
        function checkAndShowSlider() {
            // Variables
            const coreSlide = document.getElementById('core-slider');
            const currentPath = window.location.href.toLowerCase().replace(window.location.origin, "");
            const isHome = currentPath.includes("/web/#/home.html") || currentPath.includes("/web/#/home") || currentPath.includes("/web/index.html#/home.html") || currentPath === "/web/index.html#/home" || currentPath === "/web/?#/home.html";
            coreSlideData.slideshow.isHome = isHome;

            // Slider has been initialized at home?
            if ( isHome && !coreSlideData.slideshow.hasInitialized ) {
                waitForApiClient();
            }
            
            if ( coreSlide && coreSlideData.slideshow.hasInitialized ) {
                if ( isHome ) {
                    coreSlide.classList.remove('core-slider-hidden');
                    document.documentElement.classList.add('html-slider');
                    // If it's not running
                    if ( !coreSlideData.slideshow.slideInterval ) {
                        startAutoplay();
                    }
                } else {
                    coreSlide.classList.add('core-slider-hidden');
                    document.documentElement.classList.remove('html-slider');
                    stopAutoplay();
                }
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

initCoreSlider();