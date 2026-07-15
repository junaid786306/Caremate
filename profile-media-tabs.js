(function () {
    const videoItems = [
        { image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=900', label: 'Morning wellness routine' },
        { image: 'https://images.unsplash.com/photo-1518611012118-29a83679f223?q=80&w=900', label: 'Movement and mobility' },
        { image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=900', label: 'Mindful breathing' }
    ];

    const blogItems = [
        { title: 'Simple Ways to Feel Better Every Day', date: 'Oct 12', tag: 'Wellness' },
        { title: 'Building a Healthy Daily Routine', date: 'Oct 10', tag: 'Lifestyle' },
        { title: 'Small Habits That Make a Difference', date: 'Oct 08', tag: 'Health' }
    ];

    document.querySelectorAll('[data-profile-media]').forEach((section) => {
        const grid = section.querySelector('[data-media-grid]');
        const buttons = Array.from(section.querySelectorAll('[data-media-tab]'));
        const images = Array.from(grid.querySelectorAll('img')).map((image) => ({
            src: image.currentSrc || image.src,
            alt: image.alt || 'Profile image'
        }));

        function setActive(activeButton) {
            buttons.forEach((button) => {
                const active = button === activeButton;
                button.classList.toggle('border-primary', active);
                button.classList.toggle('text-primary', active);
                button.classList.toggle('border-transparent', !active);
                button.classList.toggle('text-on-surface-variant', !active);
                button.setAttribute('aria-selected', String(active));
            });
        }

        function renderImages() {
            grid.className = 'grid grid-cols-3 gap-1 px-1 pb-10';
            grid.innerHTML = images.map((item) => `
                <a href="profile_feed.html" class="aspect-square overflow-hidden rounded-sm bg-slate-100 transition-opacity hover:opacity-80">
                    <img src="${item.src}" alt="${item.alt}" class="h-full w-full object-cover">
                </a>
            `).join('');
        }

        function renderVideos() {
            grid.className = 'grid grid-cols-3 gap-1 px-1 pb-10';
            grid.innerHTML = videoItems.map((item) => `
                <a href="reels.html" aria-label="Play ${item.label}" class="group relative aspect-square overflow-hidden rounded-sm bg-slate-100">
                    <img src="${item.image}" alt="${item.label}" class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105">
                    <span class="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-transparent"></span>
                    <span class="material-symbols-outlined absolute right-2 top-2 text-xl text-white drop-shadow" style="font-variation-settings: 'FILL' 1;">play_circle</span>
                    <span class="absolute bottom-2 left-2 right-2 truncate text-[10px] font-bold text-white">${item.label}</span>
                </a>
            `).join('');
        }

        function renderBlogs() {
            grid.className = 'space-y-3 px-4 pb-10';
            grid.innerHTML = blogItems.map((item) => `
                <a href="blog_post_detail.html" class="block rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
                    <div class="mb-2 flex items-center justify-between gap-3">
                        <span class="rounded-full bg-secondary/5 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-secondary">${item.tag}</span>
                        <span class="text-[10px] font-bold text-slate-400">${item.date}</span>
                    </div>
                    <div class="flex items-center justify-between gap-3">
                        <h3 class="text-sm font-bold text-primary">${item.title}</h3>
                        <span class="material-symbols-outlined text-lg text-slate-400">arrow_forward</span>
                    </div>
                </a>
            `).join('');
        }

        buttons.forEach((button) => {
            button.addEventListener('click', () => {
                setActive(button);
                const type = button.dataset.mediaTab;
                if (type === 'videos') renderVideos();
                else if (type === 'blogs') renderBlogs();
                else renderImages();
            });
        });
    });
})();
