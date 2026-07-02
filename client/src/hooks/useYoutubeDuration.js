import { useEffect, useState } from 'react';

let youtubeApiPromise = null;

function loadYoutubeIframeApi() {
    if (window.YT?.Player) {
        return Promise.resolve();
    }

    if (!youtubeApiPromise) {
        youtubeApiPromise = new Promise((resolve) => {
            const existing = document.getElementById('youtube-iframe-api');
            if (!existing) {
                const tag = document.createElement('script');
                tag.id = 'youtube-iframe-api';
                tag.src = 'https://www.youtube.com/iframe_api';
                document.head.appendChild(tag);
            }

            const previousReady = window.onYouTubeIframeAPIReady;
            window.onYouTubeIframeAPIReady = () => {
                previousReady?.();
                resolve();
            };

            if (window.YT?.Player) {
                resolve();
            }
        });
    }

    return youtubeApiPromise;
}

export function useYoutubeDuration(videoId) {
    const [duration, setDuration] = useState(null);

    useEffect(() => {
        if (!videoId) {
            setDuration(null);
            return undefined;
        }

        let player = null;
        let mount = null;
        let cancelled = false;

        const init = async () => {
            await loadYoutubeIframeApi();
            if (cancelled) return;

            mount = document.createElement('div');
            mount.style.display = 'none';
            document.body.appendChild(mount);

            player = new window.YT.Player(mount, {
                videoId,
                events: {
                    onReady: (event) => {
                        const seconds = Math.floor(event.target.getDuration() || 0);
                        if (!cancelled && seconds > 0) {
                            setDuration(seconds);
                        }
                    },
                },
            });
        };

        setDuration(null);
        init();

        return () => {
            cancelled = true;
            player?.destroy?.();
            mount?.remove();
        };
    }, [videoId]);

    return duration;
}
