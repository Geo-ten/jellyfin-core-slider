// Slider uuid
var coreSlideId = "3a2c88a1-ed97-43a0-8425-36985ca4491a";

// Slider static settings
var coreSlideSettings = null;
var coreRetryInterval = 250;

// State management
var coreSlideData = {
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
        isInitializing: false,
        currentSlideIndex: 0,
        previousSlideIndex: null,
        slideInterval: 0,
        itemIds: [],
        preloadImages: [],
        loadedItems: {},
        totalItems: 0,
        direction: 1,
        isAnimating: false,
        isLoading: false,
        isHome: null,
        isHidden: false,
        trailer: {
            isPlaying: false,
            isPaused: false,
            timeout: null
        },
        elements: {}
    },
};

function initCoreSlider() {
    // Init Youtube API Video
    function initYouTubeAPI() {
        if (coreSlideData.slideshow.ytPromise) return coreSlideData.slideshow.ytPromise;

        coreSlideData.slideshow.ytPromise = new Promise(function(resolve) {
            if ( window.YT && window.YT.Player ) {
                resolve(window.YT);
                return;
            }

            window.onYouTubeIframeAPIReady = function() {
                resolve(window.YT);
            };

            if ( !document.getElementById('youtube-api-script')) {
                var tag = document.createElement("script");
                tag.id = 'youtube-api-script';
                tag.src = 'https://www.youtube.com/iframe_api';
                document.head.appendChild(tag);
            }
        });

        return coreSlideData.slideshow.ytPromise;
    }
    
    // Get authentication headers for API requests
    function getAuthHeader() {
        return ({
            Authorization: 'MediaBrowser Client="' + coreSlideData.jellyfinData.appName + '", Device="' + coreSlideData.jellyfinData.deviceName + '", DeviceId="' + coreSlideData.jellyfinData.deviceId + '", Version="' + coreSlideData.jellyfinData.appVersion + '", Token="' + coreSlideData.jellyfinData.accessToken + '"'
        });
    };

    // Step 1 (Wait for ApiClient to initialize before starting the slideshow)
    function waitForApiClient() {
        function check() {
            if ( !window.ApiClient ) {
                console.log("Core Slider - ApiClient is not available yet. Waiting...");
                setTimeout(check, coreRetryInterval);
                return;
            }

            if ( window.ApiClient._currentUser && window.ApiClient._currentUser.Id && window.ApiClient._serverInfo && window.ApiClient._serverInfo.AccessToken ) {

                if ( !coreSlideData.slideshow.hasInitialized ) {
                    initCoreData(function() {
                        
                        // ServerAddress
                        var safeServerAddress = typeof window.ApiClient.serverAddress === 'function' ? window.ApiClient.serverAddress() : "";

                        fetch(safeServerAddress + '/CoreSlider/config', {
                            method: 'GET',
                            headers: getAuthHeader()
                        }).then(function(response) {
                            if ( !response.ok ) { throw new Error('Network response was not ok: ' + response.status); }
                            return response.json(); 
                        }).then(function(data) {
                            if ( !coreSlideSettings ) { 
                                coreSlideSettings = data;
                                // Import custom css
                                if (data.SlideShadow) {
                                    document.documentElement.style.setProperty('--slider-color-slide-shadow', data.SlideShadow);
                                }
                            }
                            
                            console.log("Core Slider - Configuration completed.");
                            if ( coreSlideSettings.TrailersEnabled && coreSlideSettings.TrailersYoutube ) { initYouTubeAPI(); }
                            initCoreDataSlides();

                        }).catch(function(error) {
                            console.warn("Core Slider - Failed to load custom plugin config. Re-checking...", error);
                            coreRetryInterval += 250;
                            setTimeout(check, coreRetryInterval);
                        });

                    });
                } else {
                    console.log("Core Slider - Already initialized. Skipping...");
                }

            } else {
                console.log("Core Slider - Authentication is incomplete. Retrying...");
                coreRetryInterval += 250;
                setTimeout(check, coreRetryInterval);
            }
        }

        check();
    }

    // Step 2 (Initializes Jellyfin data from ApiClient)
    function initCoreData(callback) {
        if ( !window.ApiClient ) {
            console.warn("Core Slider - apiClient is not available yet. Retrying...");
            setTimeout(function() { initCoreData(callback), coreRetryInterval });
            return;
        }

        try {
            var apiClient = window.ApiClient;
            var htmlClasses = document.querySelector('html').classList.value;
            var layoutMatch = htmlClasses.match(/layout-(\w+)/);
            var layout = layoutMatch ? layoutMatch[1] : null;

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
            console.error("Core Slider - Error initializing ApiClient data:", error);
            setTimeout(function() { initCoreData(callback), coreRetryInterval });
        }
    };

    // Step 3 (Initialize the slideshow)
    function initCoreDataSlides() {
        if (coreSlideData.slideshow.hasInitialized) {
            console.log("Core Slider - Already initialized. Skipping...");
            return;
        } else {
            coreSlideData.slideshow.hasInitialized = true;
        }

        // Call loadDataSlides
        loadDataSlides();
    };

    // Step 4
    // Fetches random items from the server
    function randomSlides() {
        return new Promise(function(resolve, reject) {
            try {
                if ( !coreSlideData.jellyfinData.accessToken || coreSlideData.jellyfinData.accessToken === "Not Found" ) {
                    console.warn("Core Slider - Access token is not available. Delaying API request...");
                    resolve([]);
                    return;
                }

                if ( !coreSlideData.jellyfinData.serverAddress || coreSlideData.jellyfinData.serverAddress === "Not Found" ) {
                    console.warn("Core Slider - Server address is not available. Delaying API request...");
                    resolve([]);
                    return;
                }

                fetch(coreSlideData.jellyfinData.serverAddress + '/Items?IncludeItemTypes=' + coreSlideSettings.SearchType + '&Recursive=true&hasOverview=true&imageTypes=Logo,Backdrop&sortBy=Random&isPlayed=False&enableUserData=true&Limit=' + coreSlideSettings.MaxItems + '&fields=Id,ImageTags,RemoteTrailers,HasTrailer', {
                    headers: getAuthHeader(),
                }).then(function(response) {
                    return response.json();
                }).then(function(data) {
                    var items = data.Items || [];
                    var filteredItems = items.filter(function(item) { return item.ImageTags && item.ImageTags.Logo; }).map(function(item) { return item.Id; });

                    resolve(filteredItems);
                }).catch(function(error) {
                    console.error('Core Slider - Failed to fetch items: ', error);
                    resolve([]);
                });
            } catch (error) {
                console.error('Core Slider - Failed to fetch items: ' + response.status + ' ' + response.statusText, error);
                resolve([]);
            }
        });
    };

    function loadDataList() {
        return new Promise(function(resolve, reject) {
            try {
                var listFileName = coreSlideData.jellyfinData.serverAddress + '/web/' + coreSlideSettings.FileNameLocation + '?userId=' + coreSlideData.jellyfinData.userId;
                
                fetch(listFileName).then(function(response) {
                    return response.text();
                }).then(function(text) {
                    var ids = text.split("\n").map(function(id) { return id.trim(); }).filter(function(id) { return id; }).slice(1);
                    resolve(ids);
                }).catch(function(error) {
                    console.error("Core Slider - List not found or is inaccessible.", error);
                    resolve([]);
                });
            } catch (error) {
                console.error("Core Slider - Error fetching list:", error);
                resolve([]);
            }
        });
    };

    // Build image urls
    function buildImageUrl(item, imageType, index, serverAddress, quality) {
        var itemId = item.Id;
        var tag = null;

        if ( imageType === "Backdrop" ) {
            if ( item.BackdropImageTags && Array.isArray(item.BackdropImageTags) && item.BackdropImageTags.length > 0 ) {
                var backdropIndex = index !== undefined ? index : 0;
                if ( backdropIndex < item.BackdropImageTags.length ) {
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

        var baseUrl;
        // Limit the width for TV (Optimized for pre-load)
        var maxWidth = coreSlideData.jellyfinData.deviceLayout === 'tv' ? '&maxWidth=1280' : '&maxWidth=1785';
        if ( imageType === "Logo" ) { maxWidth = '&maxWidth=400'; }

        if ( index !== undefined ) {
            baseUrl = serverAddress + '/Items/' + itemId + '/Images/' + imageType + '/' + index;
        } else {
            baseUrl = serverAddress + '/Items/' + itemId + '/Images/' + imageType;
        }

        if ( tag ) {
            var qualityParam = quality !== undefined ? '&quality=' + quality : "";
            return '' + baseUrl + '?tag=' + tag + qualityParam + maxWidth;
        } else {
            var qualityParam = quality !== undefined ? quality : coreSlideSettings.QualityBackdrop;
            return '' + baseUrl + '?quality=' + qualityParam + maxWidth;
        }
    }

    // Trailers
    // Trailers - Local
    function runLocalVideo(parent) {
        var video = parent.querySelector('video');

        video.addEventListener("ended", function (event) {
            video.load();
            startAutoplay();
            triggerLayout(null, 'show');
            video.classList.remove('core-slide-video-active');
            coreSlideData.slideshow.trailer.isPlaying = false;
            coreSlideData.slideshow.trailer.isPaused = false;
        });

        video.play();
        video.classList.add('core-slide-video-active');
        triggerLayout(null, 'hide');
        stopAutoplay();
        coreSlideData.slideshow.trailer.isPlaying = true;
    }

    function stopLocalVideo() {
        clearTrailerTimeout();

        if ( coreSlideData.slideshow.trailer.isPlaying || coreSlideData.slideshow.trailer.isPaused ) {
            var video = coreSlideData.slideshow.elements.createSlides.querySelector('.core-slide-video-active');

            if ( video ) {
                triggerLayout(coreSlideData.slideshow.elements.createSlides.children[video.dataset.parentIndex], 'show');
                video.pause();
                video.load();
                video.classList.remove('core-slide-video-active');
                coreSlideData.slideshow.trailer.isPlaying = false;
                coreSlideData.slideshow.trailer.isPaused = false;
            }
        }
    }

    // Trailers - Youtube
    function createYoutubeVideo(parent) {
        // If exist
        if ( parent.youtubePlayer ) {
            startYoutubeIframe(parent, 'exist');
        }

        // If videoEnabled
        if ( parent.dataset.videoEnabled ) { return; }
        parent.dataset.videoEnabled = true;

        // Create Player
        var playerId = 'youtube-player-' + parent.dataset.videoId;
        var container = document.createElement('div');
        container.id = playerId;

        parent.appendChild(container);

        var player = new YT.Player(playerId, {
            videoId: parent.dataset.videoId,
            playerVars: {
                autoplay: 1,
                mute: coreSlideSettings.TrailersMuted ? 1 : 0,
                controls: coreSlideData.jellyfinData.deviceLayout === 'tv' ? 0 : 1,
                rel: 0,
                modestbranding: 0,
                showinfo: 0,
                playsinline: 1,
                enablejsapi: 1,
                origin: '127.0.0.1'
            },
            events: {
                onReady: function() {
                    startYoutubeIframe(parent, 'event');
                },
                onStateChange: function(event) {
                    if ( event.data === 0 ) {
                        startAutoplay();
                        triggerLayout(null, 'show');

                        coreSlideData.slideshow.trailer.isPlaying = false;
                        coreSlideData.slideshow.trailer.isPaused = false;

                        parent.removeAttribute('data-video-enabled');
                        parent.youtubePlayer.seekTo(0);
                        parent.youtubePlayer.stopVideo();
                    }
                },
                onError: function(event) {
                    console.error('YouTube player error:', event.data);
                }
            }
        });

        parent.youtubePlayer = player;

        return player;
    }

    function stopYoutubeIframe(next) {
        var slides = coreSlideData.slideshow.elements.createSlides.querySelectorAll('.core-slide');

        Array.prototype.forEach.call(slides, function(slide, key) {
            if ( typeof next === 'number' ) {
                if ( key === next ) {  slide.classList.add('core-slide-active');
                } else { slide.classList.remove('core-slide-active'); }
            }

            // Stop old trailer
            if ( key !== next && slide.firstElementChild.hasAttribute('data-video-enabled') ) {
                var slideBackdrop = coreSlideData.slideshow.elements.createSlides.children[key].firstElementChild;

                slideBackdrop.removeAttribute('data-video-enabled');
                slideBackdrop.youtubePlayer.seekTo(0);
                slideBackdrop.youtubePlayer.stopVideo();

                if ( coreSlideData.slideshow.trailer.isPlaying || coreSlideData.slideshow.trailer.isPaused ) {
                    triggerLayout(coreSlideData.slideshow.elements.createSlides.children[key], 'show');
                    coreSlideData.slideshow.trailer.isPlaying = false;
                    coreSlideData.slideshow.trailer.isPaused = false;
                }
            }
        });
    }

    function startYoutubeIframe(parent, state) {
        parent.dataset.videoEnabled = true;
        coreSlideData.slideshow.trailer.isPlaying = true;
        stopAutoplay();
        triggerLayout(null, 'hide');

        if ( state === 'exist' ) {
            if ( coreSlideSettings.TrailersMuted ) { parent.youtubePlayer.mute(); } else { parent.youtubePlayer.unMute(); }
            parent.youtubePlayer.playVideo();

            return parent.youtubePlayer;
        }
    }

    // YouTube ID
    function youtubeID(url) {
        var patterns = [ /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/, /v=([a-zA-Z0-9_-]{11})/ ];

        for (var i = 0; i < patterns.length; i++) {
            var pattern = patterns[i];
            var match = url.match(pattern);
            if (match) {
                return match[1];
            }
        }

        return null;
    }

    // Trailers - Global
    function clearTrailerTimeout() {
        if ( coreSlideData.slideshow.trailer.timeout ) {
            clearTimeout(coreSlideData.slideshow.trailer.timeout);
            coreSlideData.slideshow.trailer.timeout = null;
        }
    }

    function triggerLayout(slideTarget, state) {
        var target = slideTarget || document.querySelector('.core-slide-active');

        if ( target ) { 
            if ( state === 'hide' ) { target.classList.add('core-slider-hidden'); }
            else { target.classList.remove('core-slider-hidden'); }
        }
        
        var dots = document.querySelector('#core-slider .core-slider-dots');
        if ( dots ) { 
            if ( state === 'hide' ) { dots.classList.add('core-slider-hidden'); }
            else { dots.classList.remove('core-slider-hidden'); }
        }
        
        var arrows = document.querySelector('#core-slider .core-slider-arrows');
        if ( arrows ) { 
            if ( state === 'hide' ) { arrows.classList.add('core-slider-hidden'); }
            else { arrows.classList.remove('core-slider-hidden'); }
        }
    }

    function startTrailers(next) {
        clearTrailerTimeout();
        
        var slideBackdrop = coreSlideData.slideshow.elements.createSlides.children[next].firstElementChild;

        // Local Trailers
        if ( coreSlideSettings.TrailersLocal && slideBackdrop.querySelector('video') ) {
            coreSlideData.slideshow.trailer.timeout = setTimeout(function() {
                runLocalVideo(slideBackdrop);
            }, coreSlideSettings.TrailersInterval);
            return;
        }

        // Youtube Trailers
        if ( coreSlideSettings.TrailersYoutube && slideBackdrop.dataset.videoId && !slideBackdrop.dataset.videoEnabled ) {
            coreSlideData.slideshow.trailer.timeout = setTimeout(function() {
                createYoutubeVideo(slideBackdrop);
            }, coreSlideSettings.TrailersInterval);
            return;
        }
        
        resetAutoplay();
    }

    // Get the item details
    function fetchItemDetails(itemId) {
        return new Promise(function(resolve, reject) {
            try {
                if ( coreSlideData.slideshow.loadedItems[itemId] ) {
                    resolve(coreSlideData.slideshow.loadedItems[itemId]);
                    return;
                }

                fetch(coreSlideData.jellyfinData.serverAddress + '/Items/' + itemId, {
                    headers: getAuthHeader(),
                }).then(function(response) {
                    return response.json();
                }).then(function(itemData) {
                    // Import Images
                    itemData.Images = { 
                        Backdrop: buildImageUrl(itemData, "Backdrop", 0, coreSlideData.jellyfinData.serverAddress, coreSlideSettings.QualityBackdrop),
                        Logo: buildImageUrl(itemData, "Logo", undefined, coreSlideData.jellyfinData.serverAddress, coreSlideSettings.QualityLogo)
                    };

                    // Get local trailers
                    if ( coreSlideSettings.TrailersEnabled && coreSlideSettings.TrailersLocal ) {
                        try {
                            fetch(coreSlideData.jellyfinData.serverAddress + '/Items/' + itemId + '/LocalTrailers', {
                                headers: getAuthHeader(),
                            }).then(function(response) {
                                return response.json();
                            }).then(function(trailers) {
                                itemData.LocalTrailers = trailers.map(function(trailer) {
                                    return {
                                        RunTimeTicks: trailer.RunTimeTicks * 10000,
                                        Src: '' + coreSlideData.jellyfinData.serverAddress + '/Videos/' + trailer.Id + '/stream?Static=true&api_key=' + coreSlideData.jellyfinData.accessToken
                                    }
                                });

                                coreSlideData.slideshow.loadedItems[itemId] = itemData;
                                resolve(itemData);
                            }).catch(function(error) {
                                console.error('Core Slider - Failed to get local trailer: ', error);
                                itemData.LocalTrailers = [];
                                coreSlideData.slideshow.loadedItems[itemId] = itemData;
                                resolve(itemData);
                            });
                        } catch (e) {
                            console.error('Error fetching local trailer for ' + itemId + ':', e);
                            resolve(null);
                        }
                    } else {
                        coreSlideData.slideshow.loadedItems[itemId] = itemData;
                        resolve(itemData);
                    }                    
                }).catch(function(error) {
                    console.error('Core Slider - Failed to fetch item details: ' + error.statusText, error);
                    resolve(null);
                });
            } catch (error) {
                console.error('Core Slider - Error fetching details for item ' + itemId + ':', error);
                resolve(null);
            }
        });
    }

    // Change slide trigger
    function changeSlide(next, slideWidth) {
        var animationEffectEvent = coreSlideSettings.AnimationEffectTV && coreSlideData.jellyfinData.deviceLayout === 'tv';
        var animationEffectEventTV = coreSlideData.jellyfinData.deviceLayout !== 'tv' && coreSlideSettings.AnimationEffect;

        // Prevent Slider to return something wrong
        if ( coreSlideData.slideshow.isAnimating || next === coreSlideData.slideshow.currentSlideIndex || next > coreSlideData.slideshow.totalItems - 1 || next < 0 ) {
            // Return slider event to previous position
            if ( animationEffectEvent || animationEffectEventTV ) {
                coreSlideData.slideshow.elements.createSlides.style.transform = 'translateX(' + ( -coreSlideData.slideshow.currentSlideIndex * slideWidth ) + 'px)';
            }
            return;
        }

        // Preload (one-time) next image
        if ( coreSlideData.slideshow.preloadImages.length !== coreSlideData.slideshow.totalItems && coreSlideData.slideshow.preloadImages.indexOf(next + 1) === -1 ) {
            preloadNextSlideImage(next + 1, coreSlideData);
        }

        // Start animation
        coreSlideData.slideshow.isAnimating = true;

        // Animated transform
        if ( animationEffectEvent || animationEffectEventTV ) {
            coreSlideData.slideshow.elements.createSlides.style.transform = 'translateX(' + ( -next * 100 ) + '%)';
        }

        // Stop Local/iFrame Trailers
        stopLocalVideo(next);
        stopYoutubeIframe(next);

        Array.prototype.forEach.call(coreSlideData.slideshow.elements.createDots.querySelectorAll('.core-slider-dot'), function(dot, key) {
            if (key === next) {
                dot.classList.add('core-slider-dot-active');
            } else {
                dot.classList.remove('core-slider-dot-active');
            }
        });

        setTimeout(function() {
            coreSlideData.slideshow.currentSlideIndex = next;
            coreSlideData.slideshow.isAnimating = false;
        }, 350);

        // Load Trailers
        if ( coreSlideSettings.TrailersEnabled ) {
            startTrailers(next);
        } else {
            resetAutoplay();
        }
    }

    // Pre-load next image
    function preloadNextSlideImage(nextIndex) {
        var slides = coreSlideData.slideshow.elements.createSlides.querySelectorAll('.core-slide');
        var nextSlide = slides[nextIndex];
        if ( !nextSlide ) { return; }

        coreSlideData.slideshow.preloadImages.push(nextIndex);

        function getImage(img) {
            if ( !img.src ) { return; }

            if ( coreSlideData.jellyfinData.deviceLayout !== 'tv' ) {
                img.loading = 'eager';
            } else {
                // Load, cache and replace the new image
                var preload = new Image();
                preload.onload = function() {
                    img.src = preload.src;
                };
                preload.src = img.src;
            }
        }

        var lazyImages = nextSlide.querySelectorAll('img[loading="lazy"]');
        Array.prototype.forEach.call(lazyImages, function(img) {
            getImage(img);
        });

        // Pre-load at the init the second slide image
        if ( nextIndex === 0 ) { 
            coreSlideData.slideshow.preloadImages.push(nextIndex + 1);
            var secondSlideImages = slides[nextIndex + 1].querySelectorAll('img[loading="lazy"]');
            Array.prototype.forEach.call(secondSlideImages, function(img) {
                getImage(img);
            });
        }
    }

    function loadDataSlides() {
        try {
            coreSlideData.slideshow.isLoading = true;

            (coreSlideSettings.FileNameLocation ? loadDataList() : randomSlides()).then(function(itemIds) {
                if ( itemIds.length === 0 ) { return; }

                coreSlideData.slideshow.itemIds = itemIds;
                coreSlideData.slideshow.totalItems = itemIds.length;

                // Create the core slider
                var sliderElements = createSliderShell();
                var coreSlide = sliderElements.coreSlide;
                var createSlides = sliderElements.createSlides;
                var createDots = sliderElements.createDots;
                var buttonNext = sliderElements.buttonNext;
                var buttonPrevious = sliderElements.buttonPrevious;

                function createItem(item, index) {
                    if ( !item ) { return };
    
                    var slide = createSlideElement(item, index);
                    var dot = createDotElement(index);
                    createSlides.appendChild(slide);
                    createDots.appendChild(dot);
    
                    // Pre-load the next image if the current slide is the first
                    if ( index === 1 ) { preloadNextSlideImage(index - 1); }
                    // Load trailers
                    if ( index === 0 ) { startTrailers(index); }
                };

                // Load each slide (one by one)
                var items = itemIds.map(function(id) { return fetchItemDetails(id) });

                Promise.resolve(items[0]).then(function(firstItem) {
                    if ( firstItem ) {
                        createItem(firstItem, 0);
                    }
                    
                    // load the rest
                    Promise.all(items.slice(1)).then(function(results) {
                        results.forEach(function(getItem, key) {
                            if (getItem) {
                                createItem(getItem, key + 1);
                            }
                        });
                    });
                });

                // Arrows
                if ( buttonNext ) {
                    buttonNext.onclick = function() { 
                        changeSlide(coreSlideData.slideshow.currentSlideIndex + 1);
                        coreSlideData.slideshow.previousSlideIndex = coreSlideData.slideshow.currentSlideIndex;
                    };
                }
                if ( buttonPrevious ) {
                    buttonPrevious.onclick = function() { 
                        changeSlide(coreSlideData.slideshow.currentSlideIndex - 1);
                        coreSlideData.slideshow.previousSlideIndex = coreSlideData.slideshow.currentSlideIndex;
                    };
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

                console.log("Core Slider - Successfully started.");
            });
        } catch (error) {
            console.error("Core Slider - Error loading slides data:", error);
        } finally {
            coreSlideData.slideshow.isLoading = false;
        }
    }
    
    function startAutoplay() {
        stopAutoplay();

        coreSlideData.slideshow.slideInterval = setInterval(function() {
            var next = coreSlideData.slideshow.currentSlideIndex + coreSlideData.slideshow.direction;

            // If autoplay reach the start/end, change direction
            if ( next >= coreSlideData.slideshow.totalItems ) {
                coreSlideData.slideshow.direction = -1;
                next = coreSlideData.slideshow.currentSlideIndex + coreSlideData.slideshow.direction;
                coreSlideData.slideshow.previousSlideIndex = coreSlideData.slideshow.currentSlideIndex;
            } else if ( next < 0 ) {
                coreSlideData.slideshow.direction = 1;
                next = coreSlideData.slideshow.currentSlideIndex + coreSlideData.slideshow.direction;
                coreSlideData.slideshow.previousSlideIndex = coreSlideData.slideshow.currentSlideIndex;
            }

            changeSlide(next);
        }, coreSlideSettings.SlideInterval);
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
      
        var coreSlide = document.createElement('div');
        coreSlide.id = 'core-slider';
        if ( coreSlideSettings.Theme !== 'default' ) { coreSlide.classList.add('core-slider-' + coreSlideSettings.Theme); }
        if ( !coreSlideSettings.AnimationEffectTV && coreSlideData.jellyfinData.deviceLayout === 'tv' || !coreSlideSettings.AnimationEffect ) { coreSlide.classList.add('core-slider-no-animation'); }

        // Add custom height to prevent menu from covering the slider
        if ( coreSlideSettings.Theme === 'default' ) {
            var skinHeader = document.querySelector('.skinHeader');
            var headerHeight = skinHeader.offsetHeight;
            document.documentElement.style.setProperty('--slider-height-header', headerHeight + 'px');
        }

        var createSlides = document.createElement('div');
        createSlides.className = 'core-slider-slides';

        var createDots = document.createElement('div');
        createDots.className = 'core-slider-dots';

        var focusRing = document.createElement('div');
        focusRing.className = 'core-slider-focus-ring';

        coreSlide.appendChild(createSlides);
        coreSlide.appendChild(createDots);
        coreSlide.appendChild(focusRing);
        
        // Arrows if the device is desktop
        var buttonNext = null;
        var buttonPrevious = null;
        if ( coreSlideData.jellyfinData.deviceLayout === 'desktop' ) {
            var createArrows = document.createElement('div');
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
        return { coreSlide: coreSlide, createSlides: createSlides, createDots: createDots, buttonNext: buttonNext, buttonPrevious: buttonPrevious };
    }

    // Create slide
    function createSlideElement(getItem, index) {
        var createSlide = document.createElement('div');
        createSlide.setAttribute('data-id', getItem.Id);
        createSlide.setAttribute('data-server', coreSlideData.jellyfinData.serverId);
        createSlide.className = index === 0 ? 'core-slide core-slide-active' : 'core-slide';

        if ( window.Emby && window.Emby.Page && coreSlideData.jellyfinData.deviceLayout !== 'desktop' ) {
            createSlide.onclick = function() {
                Emby.Page.show('/details?id=' + getItem.Id + '&serverId=' + coreSlideData.jellyfinData.serverId);
            };
        }

        var createSlideBackdrop = document.createElement('div');
        createSlideBackdrop.classList.add('core-slide-backdrop');
        createSlideBackdrop.innerHTML = '<img loading="lazy" decoding="' + (index === 0 ? 'sync' : 'async') + '" src="' + getItem.Images.Backdrop + '" alt="' + getItem.Name + ' - Backdrop" width="1800" height="810" />';
        
        // Trailers
        if ( coreSlideSettings.TrailersEnabled ) {
            if ( coreSlideSettings.TrailersLocal && getItem.LocalTrailers.length > 0 ) {
                // Local Trailer
                var video = getItem.LocalTrailers.find(function(text) { /official trailer/i.test(text) }) || getItem.LocalTrailers[0];
                createSlideBackdrop.classList.add('core-slide-video');

                var createVideo = document.createElement('video');
                createVideo.muted = coreSlideSettings.TrailersMuted;
                createVideo.controls = coreSlideData.jellyfinData.deviceLayout === 'tv' ? false : true;
                createVideo.dataset.videoDuration = video.RunTimeTicks;
                createVideo.disablePictureInPicture = true;
                createVideo.playsInline = true;
                createVideo.setAttribute('controlsList', 'nodownload');
                createVideo.dataset.parentIndex = index;
                createVideo.src = video.Src;

                createSlideBackdrop.appendChild(createVideo);
            } else if ( coreSlideSettings.TrailersYoutube && getItem.RemoteTrailers.length > 0 ) {
                // Youtube Trailer
                var video = getItem.RemoteTrailers.find(function(text) { return /official trailer/i.test(text.Name) }) || getItem.RemoteTrailers[0];
                var videoID = youtubeID(video.Url);
    
                createSlideBackdrop.classList.add('core-slide-video');
                createSlideBackdrop.dataset.videoId = videoID;

                var createPassVideo = document.createElement('div');
                createPassVideo.classList.add('core-slide-video-pass');
                createSlideBackdrop.appendChild(createPassVideo);
            }
        }
        createSlide.appendChild(createSlideBackdrop);

        var createSlideLogo = document.createElement('div');
        createSlideLogo.className = 'core-slide-logo';
        createSlideLogo.innerHTML = '<img loading="lazy" decoding="' + (index === 0 ? 'sync' : 'async') + '" src="' + getItem.Images.Logo + '" alt="' + getItem.Name + ' - Logo" width="296" height="110" />';
        createSlide.appendChild(createSlideLogo);

        var createSlideInfo = document.createElement('div');
        createSlideInfo.className = 'core-slide-info';

        // Item info
        if ( coreSlideSettings.InfoPremiereDate && getItem.PremiereDate && !isNaN(new Date(getItem.PremiereDate)) ) {
            var premiere = new Date(getItem.PremiereDate).getFullYear();
            var createSlideInfoPremiere = document.createElement('div');
            createSlideInfoPremiere.className = 'core-slide-info-premiere';
            createSlideInfoPremiere.innerHTML = '<p>' + premiere + '</p>';
            createSlideInfo.appendChild(createSlideInfoPremiere);
        }

        if ( coreSlideSettings.InfoGenre && getItem.Genres && getItem.Genres.length > 0 ) {
            var genre = getItem.Genres;
            if ( genre.length > 1 ) { 
                genre = genre.slice(0, 2).toString().replace(/,/g, ', ');
            }
            var createSlideInfoGenre = document.createElement('div');
            createSlideInfoGenre.className = 'core-slide-info-genre';
            createSlideInfoGenre.innerHTML = '<p>' + genre + '</p>';
            createSlideInfo.appendChild(createSlideInfoGenre);
        }

        if ( coreSlideSettings.InfoAgeRating && getItem.OfficialRating ) {
            var createSlideInfoRating = document.createElement('div');
            createSlideInfoRating.className = 'core-slide-info-age-rating';
            createSlideInfoRating.innerHTML = '<p>' + getItem.OfficialRating + '</p>';
            createSlideInfo.appendChild(createSlideInfoRating);
        }

        if ( coreSlideSettings.InfoRuntime && (getItem.ChildCount || getItem.RunTimeTicks) ) {
            var createSlideInfoCount = document.createElement('div');

            if ( getItem.ChildCount ) {
                var seasonText = 'Season';
                if ( getItem.ChildCount > 1 ) { seasonText += 's'; }
                createSlideInfoCount.className = 'core-slide-info-season';
                createSlideInfoCount.innerHTML = '<p>' + getItem.ChildCount + ' ' + seasonText + '</p>';
            } else {
                var milliseconds = getItem.RunTimeTicks / 10000;
                var endTime = new Date(new Date().getTime() + milliseconds);
                var hours = endTime.getHours();
                var minutes = endTime.getMinutes();
                var formattedEndTime = (hours < 10 ? '0' : '') + hours + ':' + (minutes < 10 ? '0' : '') + minutes;
                createSlideInfoCount.className = 'core-slide-info-time';
                createSlideInfoCount.innerHTML = '<p>Ends at ' + formattedEndTime + '</p>';
            }

            createSlideInfo.appendChild(createSlideInfoCount);
        }

        if ( coreSlideSettings.InfoStarRating && getItem.CommunityRating ) {
            var createSlideInfoCommunityRating = document.createElement('div');
            createSlideInfoCommunityRating.className = 'core-slide-info-star-rating';
            createSlideInfoCommunityRating.innerHTML = '<p><span class="material-icons starIcon star" aria-hidden="true"></span> ' + getItem.CommunityRating.toFixed(1) + '</p>';
            createSlideInfo.appendChild(createSlideInfoCommunityRating);
        }

        createSlide.appendChild(createSlideInfo);

        var overview = getItem.Overview || '';
        if ( overview && overview.length > coreSlideSettings.MaxOverviewLength ) {
            overview = overview.substring(0, coreSlideSettings.MaxOverviewLength) + '...';
        }
        if ( overview && overview !== '' ) { 
            var createSlideOverview = document.createElement('div');
            createSlideOverview.className = 'core-slide-overview';
            createSlideOverview.innerHTML = '<p>' + overview + '</p>';
            createSlide.appendChild(createSlideOverview);
        }

        if ( coreSlideData.jellyfinData.deviceLayout === 'desktop' ) {
            var createSlideButtons = document.createElement('div');
            createSlideButtons.className = 'core-slide-buttons';
            createSlideButtons.setAttribute('data-theme', coreSlideSettings.ButtonTheme.toLowerCase());
            createSlide.appendChild(createSlideButtons);

            // Play Button
            if ( coreSlideSettings.ButtonPlayEnabled ) {
                var createSlideButtonPlay = document.createElement('button');
                createSlideButtonPlay.type = 'button';
                createSlideButtonPlay.className = 'core-slide-button-play';
                createSlideButtonPlay.innerHTML = '<span class="material-icons play_arrow" aria-hidden="true"></span> ' + (coreSlideSettings.ButtonPlayName ? '<p>' + coreSlideSettings.ButtonPlayName + '</p>' : '');
                createSlideButtonPlay.onclick = function() {
                    try {
                        // Get the session id
                        fetch(coreSlideData.jellyfinData.serverAddress + '/Sessions?controllableByUserId=' + coreSlideData.jellyfinData.userId, {
                            headers: getAuthHeader()
                        }).then(function(response) {
                            return response.json();
                        }).then(function(sessions) {
                            // Find the session of your deviceId
                            var currentSession = sessions.find(function(session) { session.DeviceId === coreSlideData.jellyfinData.deviceId });

                            if ( !currentSession ) {
                                console.warn('Core Slider - Session not found');
                                return;
                            }

                            return currentSession;
                        }).then(function(session) {
                            // Play
                            return fetch(coreSlideData.jellyfinData.serverAddress + '/Sessions/' + session.Id + '/Playing?playCommand=PlayNow&itemIds=' + getItem.Id, {
                                method: 'POST',
                                headers: getAuthHeader()
                            });
                        }).catch(function(error) {
                            console.error('Core Slider - Failed play session: ', error);
                        });
                    } catch (error) {
                        console.error('Core Slider - Play error:', error);
                    }
                };
                createSlideButtons.appendChild(createSlideButtonPlay);
            }

            if ( coreSlideSettings.ButtonInfoEnabled ) {
                // Info Button
                var createSlideButtonInfo = document.createElement('button');
                createSlideButtonInfo.type = 'button';
                createSlideButtonInfo.className = 'core-slide-button-info';
                createSlideButtonInfo.innerHTML = '<span class="material-icons info_outline" aria-hidden="true"></span> ' + (coreSlideSettings.ButtonInfoName ? '<p>' + coreSlideSettings.ButtonInfoName + '</p>' : '');
                createSlideButtonInfo.onclick = function() {
                    Emby.Page.show('/details?id=' + getItem.Id + '&serverId=' + coreSlideData.jellyfinData.serverId);
                };
                createSlideButtons.appendChild(createSlideButtonInfo);
            }

            if ( coreSlideSettings.ButtonFavoriteEnabled ) {
                // Favorite Button
                var isFavorite = false;
                if ( getItem.UserData ) { isFavorite = getItem.UserData.IsFavorite }

                var createSlideButtonFavorite = document.createElement('button');
                createSlideButtonFavorite.type = 'button';
                createSlideButtonFavorite.classList.add('core-slide-button-favorite');
                if ( isFavorite ) { createSlideButtonFavorite.classList.add("core-slide-button-favorite-active"); }
                createSlideButtonFavorite.innerHTML = '<span class="material-icons favorite_outline" aria-hidden="true"></span> ' + (coreSlideSettings.ButtonFavoriteName ? '<p>' + coreSlideSettings.ButtonFavoriteName + '</p>' : '');
                createSlideButtonFavorite.onclick = function() {
                    try {
                        var method = isFavorite ? "DELETE" : "POST";

                        fetch(coreSlideData.jellyfinData.serverAddress + '/Users/' + coreSlideData.jellyfinData.userId + '/FavoriteItems/' + getItem.Id, {
                            method: method,
                            headers: getAuthHeader()
                        }).then(function(response) {
                            // Button classes
                            isFavorite != isFavorite;
                            createSlideButtonFavorite.classList.toggle("core-slide-button-favorite-active");
                            createSlideButtonFavorite.querySelector('span').classList.toggle('favorite_outline');
                            createSlideButtonFavorite.querySelector('span').classList.toggle('favorite');
                        }).catch(function(error) {
                            throw new Error('Failed to toggle favorite: ' + error.statusText);
                        });
                    } catch (error) {
                        console.error("Core Slider - Error toggling favorite: ", error);
                    }
                };
                createSlideButtons.appendChild(createSlideButtonFavorite);
            }
        }

        return createSlide;
    }

    // Create the dot element
    function createDotElement(index) {
        var dot = document.createElement('div');
        
        dot.classList.add('core-slider-dot');
        if ( index === 0 ) { dot.classList.add('core-slider-dot-active'); }

        dot.setAttribute('data-index', index); 
        dot.onclick = function() { changeSlide(index); };
        return dot;
    }

    // Step 6
    // TV slider event navigation
    function initSliderNavigation(coreSlide, createSlides) {
        coreSlide.setAttribute('tabindex', '0');

        var sliderHasFocus = false;

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

            var video = document.querySelector('.core-slide-active .core-slide-video video');
            var iframe = document.querySelector('.core-slide-active .core-slide-video');

            var key = e.keyCode || e.key;

            function checkFocusAndPrevent(e) {
                if ( !sliderHasFocus ) { return false; }
                e.preventDefault();
                e.stopImmediatePropagation();
                return true;
            };

            switch(key) {
                case 'MediaPlayPause':
                case 'Play':
                case 'Pause':
                case 19:
                case 415:
                case 10014:
                    // Play or Pause
                    if ( !checkFocusAndPrevent(e) ) { break; }

                    if ( coreSlideData.slideshow.trailer.isPlaying ) {
                        if ( video ) { video.pause(); }
                        if ( iframe && iframe.youtubePlayer ) { iframe.youtubePlayer.pauseVideo(); }
                        coreSlideData.slideshow.trailer.isPaused = true;
                        coreSlideData.slideshow.trailer.isPlaying = false;
                    } else if ( coreSlideData.slideshow.trailer.isPaused ) {
                        if ( video ) { video.play(); }
                        if ( iframe && iframe.youtubePlayer ) { iframe.youtubePlayer.playVideo(); }
                        coreSlideData.slideshow.trailer.isPaused = false;
                        coreSlideData.slideshow.trailer.isPlaying = true;
                    }  
                    break;
                case 'MediaStop':
                case 'Stop':
                case 413:
                    // Stop (Un/Mute)
                    if ( !checkFocusAndPrevent(e) ) { break; }

                    if ( video ) { video.muted = !video.muted; } 
                    if ( iframe && iframe.youtubePlayer ) { 
                        if ( iframe.youtubePlayer.isMuted() ) { iframe.youtubePlayer.unMute(); 
                        } else { iframe.youtubePlayer.mute(); }
                    }
                    break;
                case 'MediaRewind':
                case 'Rewind':
                case 412:
                    // Rewind -15s
                    if ( !checkFocusAndPrevent(e) ) { break; }

                    // Math.max fallback to zero  / parseFloat
                    if ( video ) { 
                        var currentLocalTime = parseFloat(video.currentTime) || 0;
                        video.currentTime = Math.max(0, currentLocalTime - 15); }
                    if ( iframe && iframe.youtubePlayer ) { 
                        var currentYoutubeTime = parseFloat(iframe.youtubePlayer.getCurrentTime()) || 0;
                        iframe.youtubePlayer.seekTo(Math.max(0, currentYoutubeTime - 15), true);
                    } 
                    break;
                case 'MediaFastForward':
                case 'FastForward':
                case 417:
                    // Forward +15s
                    if ( !checkFocusAndPrevent(e) ) { break; }
                    
                    // Math.min fallback to video's length / parseFloat
                    if ( video ) { 
                        var currentLocalTime = parseFloat(video.currentTime) || 0;
                        var localDuration = isNaN(video.duration) ? 1000 : parseFloat(video.duration);
                        video.currentTime = Math.min(localDuration, currentLocalTime + 15); }
                    if ( iframe && iframe.youtubePlayer ) { 
                        var currentYoutubeTime = parseFloat(iframe.youtubePlayer.getCurrentTime()) || 0;
                        var YoutubeDuration = parseFloat(iframe.youtubePlayer.getDuration()) || 1000;
                        iframe.youtubePlayer.seekTo(Math.min(YoutubeDuration, currentYoutubeTime + 15), true);
                    } 
                    break;
                case 'ArrowLeft':
                case 'Left':
                case 37:
                    // ←
                    if ( !checkFocusAndPrevent(e) ) { break; }

                    if ( coreSlideData.slideshow.currentSlideIndex > 0 ) {
                        changeSlide(coreSlideData.slideshow.currentSlideIndex - 1);
                        coreSlideData.slideshow.previousSlideIndex = coreSlideData.slideshow.currentSlideIndex;
                    }
                    break;
                case 'ArrowRight':
                case 'Right':
                case 39:
                    // →
                    if ( !checkFocusAndPrevent(e) ) { break; }

                    if ( coreSlideData.slideshow.currentSlideIndex < coreSlideSettings.MaxItems - 1 ) {
                        changeSlide(coreSlideData.slideshow.currentSlideIndex + 1);
                        coreSlideData.slideshow.previousSlideIndex = coreSlideData.slideshow.currentSlideIndex;
                    }
                    break;
                case 'ArrowUp':
                case 'Up':
                case 38:
                    // ↑
                    if ( !checkFocusAndPrevent(e) ) { break; }

                    sliderHasFocus = false;
                    coreSlide.classList.remove('core-slider-focused');
                    coreSlide.blur();
                    setTimeout(function() {
                        // Go to the home button
                        var homeButton = document.querySelector('.skinHeader .headerTabs .emby-tab-button');
                        if ( homeButton ) homeButton.focus();
                    }, 50);
                    break;
                case 'ArrowDown':
                case 'Down':
                case 40:
                    // ↓
                    if ( !checkFocusAndPrevent(e) ) { break; }

                    sliderHasFocus = false;
                    coreSlide.classList.remove('core-slider-focused');
                    coreSlide.blur();
                    setTimeout(function() {
                        var tabContent = document.querySelector('.tabContent.is-active');
                        if ( tabContent ) {
                            var firstFocusable = tabContent.querySelector('a, button, [tabindex="0"]');
                            if ( firstFocusable ) { firstFocusable.focus(); }
                        }
                    }, 50);
                    break;
                case 'Enter':
                case 13:
                    // OK
                    if ( !checkFocusAndPrevent(e) ) { break; }

                    var activeSlide = createSlides.querySelectorAll('.core-slide')[coreSlideData.slideshow.currentSlideIndex];
                    if ( activeSlide ) {
                        var itemId = activeSlide.getAttribute('data-id');
                        var serverId = activeSlide.getAttribute('data-server');

                        if ( window.Emby && window.Emby.Page && coreSlideData.jellyfinData.deviceLayout !== 'desktop' ) {
                            Emby.Page.show('/details?id=' + itemId + '&serverId=' + serverId);
                        } else {
                            var link = activeSlide.querySelector('a');
                            if ( link ) window.location.href = link.href;
                        }
                    }
                    break;
            }
        }, true);

        // ↑ Up from (tabContent)
        document.addEventListener('keydown', function(e) {
            if ( !isSliderActive() ) { return; }

            if ( (e.keyCode !== 38 && e.key !== 'ArrowUp' && e.key !== 'Up') || sliderHasFocus ) { return; }
            var activeElement = document.activeElement;
            if ( !activeElement ) { return; }

            var activeRect = activeElement.getBoundingClientRect();
            var sliderRect = coreSlide.getBoundingClientRect();
            var distanceFromSlider = activeRect.top - sliderRect.bottom;

            if ( activeRect.top > sliderRect.bottom && distanceFromSlider < 200 ) {
                e.preventDefault();
                e.stopImmediatePropagation();
                setFocus(true);
            }
        }, true);

        // ↓ Down from (header)
        document.addEventListener('keydown', function(e) {
            if ( !isSliderActive() ) { return; }

            if ( (e.keyCode !== 40 && e.key !== 'ArrowDown' && e.key !== 'Down') || sliderHasFocus ) { return; }
            var activeElement = document.activeElement;
            if ( !activeElement ) { return; }

            var header = document.querySelector('.skinHeader');
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
        var visibilityObserver = new MutationObserver(function() {
            if ( coreSlide.classList.contains('core-slider-hidden') && sliderHasFocus ) {
                sliderHasFocus = false;
                coreSlide.classList.remove('core-slider-focused');
            }
        });
        visibilityObserver.observe(coreSlide, { attributes: true, attributeFilter: ['class'] });

        // Initial focus
        setTimeout(function() { setFocus(true); }, 2100);
    }

    // coreSliderEventMouse — Global touch/pointers events
    function coreSliderEventMouse(createSlides) {
        var pointerStartX = 0;
        var pointerCurrentX = 0;
        var pointerStartTime = 0;
        var isDragging = false;
        var wasDragging = false;

        var VELOCITY_THRESHOLD = 0.3;
        var DISTANCE_THRESHOLD = 0.25; 

        // Legacy helper for client moving
        function getClientX(e) {
            if ( e.touches && e.touches.length > 0 ) {
                return e.touches[0].clientX;
            } else if ( e.changedTouches && e.changedTouches.length > 0 ) {
                return e.changedTouches[0].clientX;
            }
            return e.clientX;
        }

        function onDragStart(e) {
            if ( coreSlideData.slideshow.isAnimating ) { return; }

            // Prevent event from button element
            if ( e.target.closest('button, a') ) { return; }

            // Pause autoplay on drag
            stopAutoplay();

            if ( e.type !== 'touchstart' ) { e.preventDefault(); }

            pointerStartX = getClientX(e);
            pointerCurrentX = getClientX(e);
            pointerStartTime = Date.now();
            isDragging = true;
            wasDragging = false;

            if ( e.pointerId ) { createSlides.setPointerCapture(e.pointerId); }
            createSlides.classList.add('touch-dragging', 'no-select');
        }

        function onDragMove(e) {
            if ( !isDragging ) { return; }
            
            // Legacy
            if ( e.type === 'touchmove' ) { e.preventDefault(); }
            
            pointerCurrentX = getClientX(e);
            
            var diff = pointerCurrentX - pointerStartX;
            var slideWidth = createSlides.parentElement.offsetWidth;
            
            // Convert px to % for consistency
            var diffPercent = (diff / slideWidth) * 100;
            var currentOffsetPercent = -coreSlideData.slideshow.currentSlideIndex * 100;
            
            var finalPercent = currentOffsetPercent + diffPercent;

            // Resistance for edges
            if ( (coreSlideData.slideshow.currentSlideIndex === 0 && diffPercent > 0) || (coreSlideData.slideshow.currentSlideIndex === coreSlideData.slideshow.totalItems - 1 && diffPercent < 0) ) {
                finalPercent = currentOffsetPercent + (diffPercent * 0.2);
            }

            if ( coreSlideSettings.AnimationEffect ) {
                createSlides.style.transform = 'translateX(' + finalPercent + '%)';
            }
        }

        function onDragEnd(e) {
            if ( !isDragging ) { return; }
            isDragging = false;
            
            var diff = pointerCurrentX - pointerStartX;
            var elapsed = Date.now() - pointerStartTime;
            var slideWidth = createSlides.parentElement.offsetWidth;

            function resetSlide() {
                createSlides.classList.remove('touch-dragging', 'no-select');
                pointerStartX = 0;
                pointerCurrentX = 0;
            };
            
            // Remove accidentaly touch event
            if ( Math.abs(diff) < 5 ) {
                // Revert slide to original position
                if ( coreSlideSettings.AnimationEffect ) {
                    createSlides.style.transform = 'translateX(' + ( -coreSlideData.slideshow.currentSlideIndex * slideWidth ) + 'px)';
                }
                resetSlide();
                return;
            }

            var velocity = Math.abs(diff) / elapsed;
            var distanceRatio = Math.abs(diff) / slideWidth;
            var shouldChange = velocity > VELOCITY_THRESHOLD || distanceRatio > DISTANCE_THRESHOLD;

            if ( shouldChange && diff < 0 ) {
                changeSlide(coreSlideData.slideshow.currentSlideIndex + 1, slideWidth);
                coreSlideData.slideshow.previousSlideIndex = coreSlideData.slideshow.currentSlideIndex;
            } else if ( shouldChange && diff > 0 ) {
                changeSlide(coreSlideData.slideshow.currentSlideIndex - 1, slideWidth);
                coreSlideData.slideshow.previousSlideIndex = coreSlideData.slideshow.currentSlideIndex;
            } else {
                changeSlide(coreSlideData.slideshow.currentSlideIndex, slideWidth);
            }
            
            resetSlide();

            // Resume autoplay after dragging
            resetAutoplay();
        }

        function onDragCancel() {
            if ( !isDragging ) { return; }
            isDragging = false;
            var slideWidth = createSlides.parentElement.offsetWidth;
            if ( coreSlideSettings.AnimationEffect ) {
                createSlides.style.transform = 'translateX(' + (-coreSlideData.slideshow.currentSlideIndex * slideWidth) + 'px)';
            }
            createSlides.classList.remove('touch-dragging', 'no-select');
            pointerStartX = 0;
            pointerCurrentX = 0;
        }

        if ( window.PointerEvent ) {
            // Modern Browsers
            createSlides.addEventListener('pointerdown', onDragStart);
            createSlides.addEventListener('pointermove', onDragMove);
            createSlides.addEventListener('pointerup', onDragEnd);
            createSlides.addEventListener('pointercancel', onDragCancel);
            createSlides.addEventListener('pointerleave', function(e) {
                if ( e.target === createSlides ) { onDragCancel(); }
            });
        } else {
            // Legacy Browsers
            // Touch Events
            createSlides.addEventListener('touchstart', onDragStart, { passive: false });
            createSlides.addEventListener('touchmove', onDragMove, { passive: false });
            createSlides.addEventListener('touchend', onDragEnd);
            createSlides.addEventListener('touchcancel', onDragCancel);
            
            // Mouse Events
            createSlides.addEventListener('mousedown', onDragStart);
            createSlides.addEventListener('mousemove', onDragMove);
            createSlides.addEventListener('mouseup', onDragEnd);
            createSlides.addEventListener('mouseleave', function(e) {
                if ( e.target === createSlides ) { onDragCancel(); }
            });
        }

        createSlides.addEventListener('click', function(e) {
            if ( wasDragging ) {
                e.stopPropagation();
                e.preventDefault();
                wasDragging = false;
            }
        }, true);
    }

    // Step 7
    // MutationObserver Observer
    function checkAndShowSlider() {
        // Variables
        var coreSlide = document.getElementById('core-slider');
        var currentPath = window.location.href.toLowerCase().replace(window.location.origin, "");
        var isHome = currentPath.indexOf("/web/#/home.html") > -1 || currentPath.indexOf("/web/#/home") > -1 || currentPath.indexOf("/web/index.html#/home.html") > -1 || currentPath === "/web/index.html#/home" || currentPath === "/web/?#/home.html";
        coreSlideData.slideshow.isHome = isHome;

        // Slider has been initialized at home?
        if ( coreSlideData.slideshow.isHome && !coreSlideData.slideshow.hasInitialized && !coreSlideData.slideshow.isInitializing ) {
            coreSlideData.slideshow.isInitializing = true;
            waitForApiClient();
        }

        if ( coreSlide && coreSlideData.slideshow.hasInitialized ) {
            if ( coreSlideData.slideshow.isHome && !coreSlideData.slideshow.isHidden ) { 
                coreSlide.classList.remove('core-slider-hidden');
                document.documentElement.classList.add('html-slider');
                
                if ( coreSlideSettings.Theme !== 'default' ) { document.documentElement.classList.add('html-slider-' + coreSlideSettings.Theme); }

                // If it's not running
                if ( !coreSlideData.slideshow.slideInterval && !coreSlideData.slideshow.trailer.isPlaying && !coreSlideData.slideshow.trailer.isPaused ) {
                    startAutoplay();
                    
                    if ( coreSlideSettings.TrailersEnabled ) {
                        startTrailers(coreSlideData.slideshow.currentSlideIndex);
                    }
                } 
            } else { 
                coreSlide.classList.add('core-slider-hidden');
                document.documentElement.classList.remove('html-slider');
                stopAutoplay();

                if ( coreSlideSettings.TrailersEnabled ) {
                    stopYoutubeIframe();
                    stopLocalVideo();
    
                    // Trailers - Fallback
                    coreSlideData.slideshow.trailer.isPlaying = false;
                    coreSlideData.slideshow.trailer.isPaused = false;
                }
            }
        }
    }

    function initVisibilityObserver() {
        // Listen url changes
        window.addEventListener('hashchange', function() {
            checkAndShowSlider();
        });

        // Observe Jellyfin
        var observer = new MutationObserver(function (mutations) {
            checkAndShowSlider();
        });
        observer.observe(document.body, { childList: true, subtree: true });

        // One time event delegation - Emby Buttons (favorite)
        document.addEventListener('click', function(event) {
            var tabButton = event.target.closest('.headerTabs .emby-tab-button');
            
            if ( tabButton ) {
                if ( tabButton.innerText.toLowerCase() === 'home' ) {
                    coreSlideData.slideshow.isHidden = false;
                } else {
                    coreSlideData.slideshow.isHidden = true;
                }
                
                setTimeout(checkAndShowSlider, 50);
            }
        });

        checkAndShowSlider();
    }

    initVisibilityObserver();
}

// Start the slider
initCoreSlider();
