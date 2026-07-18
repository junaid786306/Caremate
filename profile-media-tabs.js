(function () {
    const videoItems = [
        { image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=900', label: 'Morning wellness routine' },
        { image: 'https://images.unsplash.com/photo-1518611012118-29a83679f223?q=80&w=900', label: 'Movement and mobility' },
        { image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=900', label: 'Mindful breathing' }
    ];

    const blogItems = [
        { title: 'Simple Ways to Feel Better Every Day', date: 'Oct 12', tag: 'Wellness', likes: 24, comments: 8 },
        { title: 'Building a Healthy Daily Routine', date: 'Oct 10', tag: 'Lifestyle', likes: 31, comments: 6 },
        { title: 'Small Habits That Make a Difference', date: 'Oct 08', tag: 'Health', likes: 18, comments: 4 }
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
            grid.className = 'space-y-4 px-6 pb-10';
            grid.innerHTML = blogItems.map((item) => `
                <article class="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm">
                    <div class="mb-3 flex items-center justify-between gap-3">
                        <span class="rounded-full bg-secondary/5 px-2 py-1 text-[9px] font-black uppercase tracking-[0.15em] text-secondary">${item.tag}</span>
                        <span class="text-[10px] font-bold text-slate-400">${item.date}</span>
                    </div>
                    <h3 class="mb-2 text-lg font-bold text-primary">${item.title}</h3>
                    <p class="mb-4 text-sm leading-relaxed text-slate-600">Sharing practical ideas for staying active, healthy, and connected through simple habits that fit naturally into everyday life...</p>
                    <div class="flex items-center gap-4 border-t border-slate-50 pt-4">
                        <button type="button" aria-label="Like blog" class="flex items-center gap-1.5 text-slate-400 transition-colors hover:text-rose-500">
                            <span class="material-symbols-outlined text-lg">favorite</span>
                            <span class="text-xs font-bold">${item.likes}</span>
                        </button>
                        <button type="button" aria-label="Comment on blog" class="flex items-center gap-2 text-slate-400 transition-colors hover:text-primary">
                            <span class="material-symbols-outlined grid h-[38px] w-[38px] place-items-center rounded-full border border-slate-200/70 bg-gradient-to-br from-white to-blue-50 text-[21px] text-[#24467c] shadow-[0_7px_18px_rgba(0,45,98,0.1)]">chat_bubble_outline</span>
                            <span class="text-xs font-bold">${item.comments}</span>
                        </button>
                        <button type="button" aria-label="Share blog" class="grid h-[38px] w-[38px] place-items-center rounded-full border border-slate-200/70 bg-gradient-to-br from-white to-blue-50 text-[#24467c] shadow-[0_7px_18px_rgba(0,45,98,0.1)] transition-transform active:scale-95">
                            <span class="material-symbols-outlined text-[21px]">ios_share</span>
                        </button>
                        <button type="button" aria-label="Save blog" class="flex items-center text-slate-400 transition-colors hover:text-primary">
                            <span class="material-symbols-outlined text-lg">bookmark</span>
                        </button>
                        <a href="blog_post_detail.html" class="ml-auto text-xs font-bold text-secondary">Read More</a>
                    </div>
                </article>
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
