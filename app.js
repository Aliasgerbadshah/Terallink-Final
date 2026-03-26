document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide Icons
    if (window.lucide) {
        window.lucide.createIcons();
    }

    const form = document.getElementById('tera-form');
    const linkInput = document.getElementById('tera-link');
    const submitBtn = document.getElementById('play-btn');
    const statusMessage = document.getElementById('status-message');
    
    const playerContainer = document.getElementById('player-container');
    const heroSection = document.querySelector('.hero-section');
    const videoElement = document.getElementById('tera-video');
    const videoTitle = document.getElementById('video-title');
    const closePlayerBtn = document.getElementById('close-player-btn');

    // Scroll Reveal Animation Logic
    const revealElements = document.querySelectorAll('.reveal');
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.1 });

    revealElements.forEach(el => revealObserver.observe(el));

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const url = linkInput.value.trim();
        
        if (!url) return;

        // Validation for terabox links
        if (!url.toLowerCase().includes('terabox')) {
            showStatus('Please enter a valid TeraBox link.', 'error');
            return;
        }

        setLoading(true);
        hideStatus();

        try {
            // API INTEGRATION
            const response = await fetch('/api/proxy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    link: url
                }),
            });

            if (!response.ok) {
                throw new Error(`Server returned status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.status !== 'success') {
                throw new Error(data.message || 'Extraction failed.');
            }

            if (!data.list || data.list.length === 0) {
                throw new Error('No files found.');
            }

            const fileData = data.list[0];
            
            let directVideoUrl = '';
            if (fileData.fast_stream_url && typeof fileData.fast_stream_url === 'object') {
                // Pick highest quality available from fast_stream_url object
                directVideoUrl = fileData.fast_stream_url['1080p'] || fileData.fast_stream_url['720p'] || fileData.fast_stream_url['480p'] || Object.values(fileData.fast_stream_url)[0];
            } else if (fileData.stream_url) {
                directVideoUrl = fileData.stream_url;
            } else if (fileData.download_link) {
                directVideoUrl = fileData.download_link;
            } else if (fileData.image) {
                directVideoUrl = fileData.image; // Fallback to image field if others fail
            } else {
                throw new Error('No playback URL found for the file.');
            }
            
            const title = fileData.name || 'TeraBox Video Stream';

            // Success: Play Video
            showStatus('Stream extracted successfully!', 'success');
            
            // Allow a small delay for the success message to be seen
            setTimeout(() => {
                showPlayer(directVideoUrl, title);
            }, 600);

        } catch (error) {
            showStatus(error.message || 'Failed to extract video stream. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    });

    closePlayerBtn.addEventListener('click', () => {
        hidePlayer();
    });

    // Helper Functions
    function setLoading(isLoading) {
        if (isLoading) {
            submitBtn.classList.add('btn-loading');
            submitBtn.disabled = true;
            linkInput.disabled = true;
            const icon = submitBtn.querySelector('.btn-icon');
            if (icon) icon.classList.add('hidden');
        } else {
            submitBtn.classList.remove('btn-loading');
            submitBtn.disabled = false;
            linkInput.disabled = false;
            const icon = submitBtn.querySelector('.btn-icon');
            if (icon) icon.classList.remove('hidden');
        }
    }

    function showStatus(message, type) {
        statusMessage.textContent = message;
        statusMessage.classList.remove('hidden');
        statusMessage.classList.remove('error', 'success');
        statusMessage.classList.add('show', type);
    }

    function hideStatus() {
        statusMessage.className = 'hidden';
    }

    function showPlayer(streamUrl, title) {
        landingContent.classList.add('hidden');
        playerContainer.classList.remove('hidden');
        
        videoTitle.textContent = title;
        
        // Ensure player is visible and scrolls into view
        playerContainer.scrollIntoView({ behavior: 'smooth' });

        if (typeof Hls !== 'undefined' && Hls.isSupported() && streamUrl.includes('.m3u8')) {
            const hls = new Hls();
            hls.loadSource(streamUrl);
            hls.attachMedia(videoElement);
            hls.on(Hls.Events.MANIFEST_PARSED, function() {
                videoElement.play().catch(e => console.log('Autoplay blocked', e));
            });
            window.currentHls = hls;
        } else {
            videoElement.src = streamUrl;
            videoElement.addEventListener('loadedmetadata', function() {
                videoElement.play().catch(e => console.log('Autoplay blocked', e));
            });
        }
    }

    function hidePlayer() {
        videoElement.pause();
        videoElement.src = '';
        
        if (window.currentHls) {
            window.currentHls.destroy();
            window.currentHls = null;
        }
        
        playerContainer.classList.add('hidden');
        landingContent.classList.remove('hidden');
        hideStatus();
        linkInput.value = '';
        linkInput.focus();
    }
});
