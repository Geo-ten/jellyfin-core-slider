// Slider uuid
const coreSlideId = "3a2c88a1-ed97-43a0-8425-36985ca4491a";

// Slider static settings
let coreSlideSettings = {
    animationEffectTV: true,
    animationEffect: true,
    fileNameLocation: null,
    quality: {
        backdrop: 60,
        logo: 40,
    },
    maxItems: 6,
    maxOverviewLength: 230,
    slideInterval: 12000,
    retryInterval: 1000,
    theme: 'default',
    button: {
        play: { name: 'Play Now', enabled: true },
        info: { name: 'Details', enabled: true },
        favorite: { name: '', enabled: true },
    },
    searchType: 'Movie,Series',
    info: {
        premiereDate: true,
        genre: true,
        ageRating: true,
        runtime: true,
        starRating: true,
    },
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
        preloadImages: [],
        loadedItems: {},
        totalItems: 0,
        direction: 1,
        isAnimating: false,
        isLoading: false,
        isHome: null,
        isHidden: false,
        elements: {}
    },
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

        if ( imageType === "Backdrop" ) {
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
        // Limit the width for TV (Optimized for pre-load)
        let maxWidth = coreSlideData.jellyfinData.deviceLayout === 'tv' ? `&maxWidth=1280` : `&maxWidth=1785`;
        if ( imageType === "Logo" ) { maxWidth = `&maxWidth=400`; }

        if ( index !== undefined ) {
            baseUrl = `${serverAddress}/Items/${itemId}/Images/${imageType}/${index}`;
        } else {
            baseUrl = `${serverAddress}/Items/${itemId}/Images/${imageType}`;
        }

        if ( tag ) {
            const qualityParam = quality !== undefined ? `&quality=${quality}` : "";
            return `${baseUrl}?tag=${tag}${qualityParam}${maxWidth}`;
        } else {
            const qualityParam = quality !== undefined ? quality : coreSlideSettings.quality.backdrop;
            return `${baseUrl}?quality=${qualityParam}${maxWidth}`;
        }
    }

    // Get the item details
    async function fetchItemDetails(itemId) {
        try {
            if ( coreSlideData.slideshow.loadedItems[itemId] ) {
                return coreSlideData.slideshow.loadedItems[itemId];
            }

            const response = await fetch(`${coreSlideData.jellyfinData.serverAddress}/Items/${itemId}`, {
                headers: getAuthHeader(),
            });

            if ( !response.ok ) {
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
    function changeSlide(next, slideWidth) {
        const animationEffectEvent = coreSlideSettings.animationEffectTV && coreSlideData.jellyfinData.deviceLayout === 'tv';
        const animationEffectEventTV = coreSlideData.jellyfinData.deviceLayout !== 'tv' && coreSlideSettings.animationEffect;

        // Prevent Slider to return something wrong
        if ( coreSlideData.slideshow.isAnimating || next === coreSlideData.slideshow.currentSlideIndex || next > coreSlideData.slideshow.totalItems - 1 || next < 0 ) {
            // Return slider event to previous position
            if ( (animationEffectEvent || animationEffectEventTV) && event ) {
                coreSlideData.slideshow.elements.createSlides.style.transform = 'translateX(' + ( -coreSlideData.slideshow.currentSlideIndex * slideWidth ) + 'px)';
            }
            return;
        }

        // Preload (one-time) next image
        if ( coreSlideData.slideshow.preloadImages.length !== coreSlideData.slideshow.totalItems && !coreSlideData.slideshow.preloadImages.includes(next + 1) ) {
            preloadNextSlideImage(next + 1, coreSlideData);
        }

        // Start animation
        coreSlideData.slideshow.isAnimating = true;

        // Animated transform
        if ( animationEffectEvent || animationEffectEventTV ) {
            coreSlideData.slideshow.elements.createSlides.style.transform = 'translateX(' + ( -next * 100 ) + '%)';
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

    // Pre-load next image
    function preloadNextSlideImage(nextIndex) {
        const slides = coreSlideData.slideshow.elements.createSlides.querySelectorAll('.core-slide');
        const nextSlide = slides[nextIndex];
        if ( !nextSlide ) { return; }

        coreSlideData.slideshow.preloadImages.push(nextIndex);

        function getImage(img) {
            if ( !img.src ) { return; }

            if ( coreSlideData.jellyfinData.deviceLayout !== 'tv' ) {
                img.loading = 'eager';
            } else {
                // Load, cache and replace the new image
                const preload = new Image();
                preload.onload = function() {
                    img.src = preload.src;
                };
                preload.src = img.src;
            }
        }

        nextSlide.querySelectorAll('img[loading="lazy"]').forEach(function(img) {
            getImage(img);
        });

        // Pre-load at the init the second slide image
        if ( nextIndex === 0 ) { 
            coreSlideData.slideshow.preloadImages.push(nextIndex + 1); 
            slides[nextIndex + 1].querySelectorAll('img[loading="lazy"]').forEach(function(img) {
                getImage(img);
            });
        }
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

                // Pre-load the next image if the current slide is the first
                if ( i === 1 ) { preloadNextSlideImage(i - 1); }
            }

            // Arrows
            if ( buttonNext ) {
                buttonNext.onclick = function() { changeSlide(coreSlideData.slideshow.currentSlideIndex + 1); };
            }
            if ( buttonPrevious ) {
                buttonPrevious.onclick = function() { changeSlide(coreSlideData.slideshow.currentSlideIndex - 1); };
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
        if ( coreSlideSettings.theme !== 'default' ) { coreSlide.classList.add(`core-slider-${coreSlideSettings.theme}`); }
        if ( !coreSlideSettings.animationEffectTV && coreSlideData.jellyfinData.deviceLayout === 'tv' || !coreSlideSettings.animationEffect ) { coreSlide.classList.add('core-slider-no-animation'); }

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
        createSlideBackdrop.innerHTML = `<img loading="lazy" decoding="${index === 0 ? 'sync' : 'async'}" src="${getItem.Images.Backdrop}" alt="${getItem.Name} - Backdrop" width="1800" height="810" />`;
        createSlide.appendChild(createSlideBackdrop);

        const createSlideLogo = document.createElement('div');
        createSlideLogo.className = 'core-slide-logo';
        createSlideLogo.innerHTML = `<img loading="lazy" decoding="${index === 0 ? 'sync' : 'async'}" src="${getItem.Images.Logo}" alt="${getItem.Name} - Logo" width="296" height="110" />`;
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
            createSlide.appendChild(createSlideButtons);

            // Play Button
            if ( coreSlideSettings.button.play.enabled ) {
                const createSlideButtonPlay = document.createElement('button');
                createSlideButtonPlay.type = `button`;
                createSlideButtonPlay.className = `core-slide-button-play`;
                createSlideButtonPlay.innerHTML = `<span class="material-icons play_arrow" aria-hidden="true"></span> ${coreSlideSettings.button.play.name ? `<p>${coreSlideSettings.button.play.name}</p>` : '' }`;
                createSlideButtonPlay.onclick = async function() {
                    try {
                        // Get the session id
                        const sessionRes = await fetch(`${coreSlideData.jellyfinData.serverAddress}/Sessions?controllableByUserId=${coreSlideData.jellyfinData.userId}`, {
                            headers: getAuthHeader()
                        });
                        const sessions = await sessionRes.json();
    
                        // Find the session of your deviceId
                        const currentSession = sessions.find((session) => session.DeviceId === coreSlideData.jellyfinData.deviceId);
                        if ( !currentSession ) {
                            console.warn('Session not found');
                            return;
                        }
    
                        // Play
                        await fetch(`${coreSlideData.jellyfinData.serverAddress}/Sessions/${currentSession.Id}/Playing?playCommand=PlayNow&itemIds=${getItem.Id}`, {
                            method: 'POST',
                            headers: getAuthHeader()
                        });
                    } catch (error) {
                        console.error('Play error:', error);
                    }
                };
                createSlideButtons.appendChild(createSlideButtonPlay);
            }

            if ( coreSlideSettings.button.info.enabled ) {
                // Info Button
                const createSlideButtonInfo = document.createElement('button');
                createSlideButtonInfo.type = `button`;
                createSlideButtonInfo.className = `core-slide-button-info`;
                createSlideButtonInfo.innerHTML = `<span class="material-icons info_outline" aria-hidden="true"></span> ${coreSlideSettings.button.info.name ? `<p>${coreSlideSettings.button.info.name}</p>` : '' }`;
                createSlideButtonInfo.onclick = function() {
                    Emby.Page.show(`/details?id=${getItem.Id}&serverId=${coreSlideData.jellyfinData.serverId}`);
                };
                createSlideButtons.appendChild(createSlideButtonInfo);
            }

            if ( coreSlideSettings.button.favorite.enabled ) {
                // Favorite Button
                let isFavorite = false;
                if ( getItem.UserData ) { isFavorite = getItem.UserData.IsFavorite }

                const createSlideButtonFavorite = document.createElement('button');
                createSlideButtonFavorite.type = `button`;
                createSlideButtonFavorite.classList.add(`core-slide-button-favorite`);
                if ( isFavorite ) { createSlideButtonFavorite.classList.add("core-slide-button-favorite-active"); }
                createSlideButtonFavorite.innerHTML = `<span class="material-icons favorite_outline" aria-hidden="true"></span> ${coreSlideSettings.button.favorite.name ? `<p>${coreSlideSettings.button.favorite.name}</p>` : '' }`;
                createSlideButtonFavorite.onclick = async function() {
                    try {
                        const method = isFavorite ? "DELETE" : "POST";
                        const response = await fetch(`${coreSlideData.jellyfinData.serverAddress}/Users/${coreSlideData.jellyfinData.userId}/FavoriteItems/${getItem.Id}`, {
                            method,
                            headers: getAuthHeader()
                        });

                        if ( !response.ok ) {
                            throw new Error(`Failed to toggle favorite: ${response.statusText}`);
                        }

                        // Button classes
                        isFavorite != isFavorite;
                        createSlideButtonFavorite.classList.toggle("core-slide-button-favorite-active");
                        createSlideButtonFavorite.querySelector('span').classList.toggle('favorite_outline');
                        createSlideButtonFavorite.querySelector('span').classList.toggle('favorite');
                    } catch (error) {
                        console.error("Error toggling favorite:", error);
                    }
                };
                createSlideButtons.appendChild(createSlideButtonFavorite);
            }
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
                            changeSlide(coreSlideData.slideshow.currentSlideIndex - 1);
                        }
                    }
                    break;
                case 39:
                    // →
                    if ( sliderHasFocus ) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        if ( coreSlideData.slideshow.currentSlideIndex < coreSlideSettings.maxItems - 1 ) {
                            changeSlide(coreSlideData.slideshow.currentSlideIndex + 1);
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
        setTimeout(function() { setFocus(true); }, 150);
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

            if ( coreSlideSettings.animationEffect ) {
                createSlides.style.transform = 'translateX(' + finalPercent + '%)';
            }
        });

        createSlides.addEventListener('pointerup', function() {
            if ( !isDragging ) { return; }
            isDragging = false;
            
            const diff = pointerCurrentX - pointerStartX;
            const elapsed = Date.now() - pointerStartTime;
            const slideWidth = createSlides.parentElement.offsetWidth;

            function resetSlide() {
                createSlides.classList.remove('touch-dragging', 'no-select');
                pointerStartX = 0;
                pointerCurrentX = 0;
            };
            
            // Remove accidentaly touch event
            if ( Math.abs(diff) < 5 ) {
                // Revert slide to original position
                if ( coreSlideSettings.animationEffect ) {
                    createSlides.style.transform = 'translateX(' + ( -coreSlideData.slideshow.currentSlideIndex * slideWidth ) + 'px)';
                }
                resetSlide();
                return;
            }

            const velocity = Math.abs(diff) / elapsed;
            const distanceRatio = Math.abs(diff) / slideWidth;
            const shouldChange = velocity > VELOCITY_THRESHOLD || distanceRatio > DISTANCE_THRESHOLD;

            if ( shouldChange && diff < 0 ) {
                changeSlide(coreSlideData.slideshow.currentSlideIndex + 1, slideWidth);
            } else if ( shouldChange && diff > 0 ) {
                changeSlide(coreSlideData.slideshow.currentSlideIndex - 1, slideWidth);
            } else {
                changeSlide(coreSlideData.slideshow.currentSlideIndex, slideWidth);
            }
            
            resetSlide();

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
            if ( coreSlideSettings.animationEffect ) {
                createSlides.style.transform = 'translateX(' + (-coreSlideData.slideshow.currentSlideIndex * slideWidth) + 'px)';
            }
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
    function checkAndShowSlider() {
        // Variables
        const coreSlide = document.getElementById('core-slider');
        const currentPath = window.location.href.toLowerCase().replace(window.location.origin, "");
        const isHome = currentPath.includes("/web/#/home.html") || currentPath.includes("/web/#/home") || currentPath.includes("/web/index.html#/home.html") || currentPath === "/web/index.html#/home" || currentPath === "/web/?#/home.html";
        coreSlideData.slideshow.isHome = isHome;

        // Slider has been initialized at home?
        if ( coreSlideData.slideshow.isHome && !coreSlideData.slideshow.hasInitialized ) {
            waitForApiClient();
        }

        if ( coreSlide && coreSlideData.slideshow.hasInitialized ) {
            // console.log(coreSlideData.slideshow.isHome, ' - isHome  |  ', coreSlideData.slideshow.isHidden, ' - isHidden')
            if ( coreSlideData.slideshow.isHome && !coreSlideData.slideshow.isHidden ) { 
                coreSlide.classList.remove('core-slider-hidden');
                document.documentElement.classList.add('html-slider');
                if ( coreSlideSettings.theme !== 'default' ) { document.documentElement.classList.add(`html-slider-${coreSlideSettings.theme}`); }
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

    function checkEmbyButton() {
        // Hide slide in favorite section
        const embyButtons = document.querySelectorAll('.headerTabs .emby-tab-button');
        const activeTabButton = document.querySelector('.headerTabs .emby-tab-button-active');

        if ( activeTabButton ) {
            if ( activeTabButton.innerText.toLowerCase() === 'home' ) {
                coreSlideData.slideshow.isHidden = false;
            }
        }

        // Trigger emby buttons
        if ( embyButtons && embyButtons.length > 0 ) {
            for ( let key = 0; key < embyButtons.length; key++ ) {
                embyButtons[key].addEventListener('click', function(event) {
                    if ( event.target.innerText.toLowerCase() === 'home' ) {
                        coreSlideData.slideshow.isHidden = false;
                        checkAndShowSlider();
                    } else {
                        coreSlideData.slideshow.isHidden = true;
                        checkAndShowSlider();
                    }
                });
            };
        }
    }

    function initVisibilityObserver() {
        // Listen url changes
        window.addEventListener('hashchange', function() {
            checkAndShowSlider();
        });

        // Observe Jellyfin
        const observer = new MutationObserver(function (mutations) {
            checkAndShowSlider();
            checkEmbyButton();
        });
        observer.observe(document.body, { childList: true, subtree: true });

        checkAndShowSlider();
    }

    checkEmbyButton();
    initVisibilityObserver();
}

if ( ApiClient.getPluginConfiguration(coreSlideId) ) {
    ApiClient.getPluginConfiguration(coreSlideId).then(function(config) {
        coreSlideSettings = {
            animationEffectTV: config.AnimationEffectTV,
            animationEffect: config.AnimationEffect,
            fileNameLocation: config.FileNameLocation,
            quality: {
                backdrop: config.QualityBackdrop,
                logo: config.QualityLogo,
            },
            maxItems: config.MaxItems,
            maxOverviewLength: config.MaxOverviewLength,
            slideInterval: config.SlideInterval,
            retryInterval: config.RetryInterval,
            theme: config.Theme,
            button: {
                play: { name: config.ButtonPlayName, enabled: config.ButtonPlayEnabled },
                info: { name: config.ButtonInfoName, enabled: config.ButtonInfoEnabled },
                favorite: { name: config.ButtonFavoriteName, enabled: config.ButtonFavoriteEnabled },
            },
            searchType: config.SearchType,
            info: {
                premiereDate: config.InfoPremiereDate,
                genre: config.InfoGenre,
                ageRating: config.InfoAgeRating,
                runtime: config.InfoRuntime,
                starRating: config.InfoStarRating,
            },
        };
    
        // Start the slider
        initCoreSlider();
    });
} else {
    // User Override Settings
    if ( coreSlider ) {
        if ( coreSlider.animationEffectTV !== null ) { coreSlideSettings.animationEffectTV = coreSlider.animationEffectTV; }
        if ( coreSlider.animationEffect !== null ) { coreSlideSettings.animationEffect = coreSlider.animationEffect; }
        if ( coreSlider.fileNameLocation ) { coreSlideSettings.fileNameLocation = coreSlider.fileNameLocation; }
        if ( coreSlider.qualityBackdrop ) { coreSlideSettings.quality.backdrop = coreSlider.qualityBackdrop; }
        if ( coreSlider.qualityLogo ) { coreSlideSettings.quality.logo = coreSlider.qualityLogo ;}
        if ( coreSlider.maxItems ) { coreSlideSettings.maxItems = coreSlider.maxItems; }
        if ( coreSlider.maxOverviewLength ) { coreSlideSettings.maxOverviewLength = coreSlider.maxOverviewLength; }
        if ( coreSlider.searchType ) { coreSlideSettings.searchType = coreSlider.searchType; }
        if ( coreSlider.slideButtonPlay ) {
            coreSlideSettings.button.play.name = coreSlider.slideButtonPlay.name;
            coreSlideSettings.button.play.enabled = coreSlider.slideButtonPlay.enabled;
        }
        if ( coreSlider.slideButtonInfo ) {
            coreSlideSettings.button.info.name = coreSlider.slideButtonInfo.name;
            coreSlideSettings.button.info.enabled = coreSlider.slideButtonInfo.enabled;
        }
        if ( coreSlider.slideButtonFavorite ) { 
            coreSlideSettings.button.favorite.name = coreSlider.slideButtonFavorite.name;
            coreSlideSettings.button.favorite.enabled = coreSlider.slideButtonFavorite.enabled;
        }
        if ( coreSlider.slideInterval ) { 
            coreSlideSettings.slideInterval = coreSlider.slideInterval;
            coreSlideData.slideshow.slideInterval = coreSlider.slideInterval;
        }
        if ( coreSlider.theme ) { coreSlideSettings.theme = coreSlider.theme; }
        if ( coreSlider.retryInterval ) { coreSlideSettings.retryInterval = coreSlider.retryInterval; }
        if ( coreSlider.enableInfoPremiereDate !== null ) { coreSlideSettings.info.premiereDate = coreSlider.enableInfoPremiereDate; }
        if ( coreSlider.enableInfoGenre !== null ) { coreSlideSettings.info.genre = coreSlider.enableInfoGenre; }
        if ( coreSlider.enableInfoAgeRating !== null ) { coreSlideSettings.info.ageRating = coreSlider.enableInfoAgeRating; }
        if ( coreSlider.enableInfoRuntime !== null ) { coreSlideSettings.info.runtime = coreSlider.enableInfoRuntime; }
        if ( coreSlider.enableInfoStarRating !== null ) { coreSlideSettings.info.starRating = coreSlider.enableInfoStarRating; }
    };

    initCoreSlider();
}