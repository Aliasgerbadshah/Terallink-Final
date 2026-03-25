document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('tera-form');
    const linkInput = document.getElementById('tera-link');
    const submitBtn = document.getElementById('play-btn');
    const statusMessage = document.getElementById('status-message');
    
    const playerContainer = document.getElementById('player-container');
    const inputSection = document.querySelector('.input-section');
    const videoElement = document.getElementById('tera-video');
    const videoTitle = document.getElementById('video-title');
    const closePlayerBtn = document.getElementById('close-player-btn');

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
            // Calling our Vercel Serverless Function / Local Proxy
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
            
            // Check for explicit API error
            if (data.status !== 'success') {
                throw new Error(data.message || 'The xAPIverse API failed to extract.');
            }

            if (!data.list || data.list.length === 0) {
                throw new Error('No files found in the response.');
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
            } else {
                throw new Error('No playback URL found for the file.');
            }
            
            const title = fileData.name || 'TeraBox Video Stream';

            // Success: Play Video
            showStatus('Stream extracted successfully!', 'success');
            setTimeout(() => {
                showPlayer(directVideoUrl, title);
            }, 500);

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
        } else {
            submitBtn.classList.remove('btn-loading');
            submitBtn.disabled = false;
            linkInput.disabled = false;
        }
    }

    function showStatus(message, type) {
        statusMessage.textContent = message;
        statusMessage.className = `show ${type}`; // type: 'error' or 'success'
    }

    function hideStatus() {
        statusMessage.className = 'hidden';
    }

    function showPlayer(streamUrl, title) {
        inputSection.classList.add('hidden');
        playerContainer.classList.remove('hidden');
        
        videoTitle.textContent = title;
        
        // Use HLS.js if it's an m3u8 format and HLS.js is supported
        if (typeof Hls !== 'undefined' && Hls.isSupported() && streamUrl.includes('.m3u8')) {
            const hls = new Hls();
            hls.loadSource(streamUrl);
            hls.attachMedia(videoElement);
            hls.on(Hls.Events.MANIFEST_PARSED, function() {
                videoElement.play().catch(e => console.log('Autoplay blocked by browser', e));
            });
            // Store it globally for cleanup if needed
            window.currentHls = hls;
        } 
        // For browsers like Safari that support HLS natively, or normal mp4 links
        else {
            videoElement.src = streamUrl;
            videoElement.addEventListener('loadedmetadata', function() {
                videoElement.play().catch(e => console.log('Autoplay blocked by browser', e));
            });
        }
    }

    function hidePlayer() {
        videoElement.pause();
        videoElement.src = '';
        
        // Clean up HLS instance if it exists
        if (window.currentHls) {
            window.currentHls.destroy();
            window.currentHls = null;
        }
        
        playerContainer.classList.add('hidden');
        inputSection.classList.remove('hidden');
        hideStatus();
        linkInput.value = '';
        linkInput.focus();
    }
});
