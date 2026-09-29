'use strict';
document.documentElement.classList.add('js');
const config = window.TACGB_CONFIG || {};
const hero = document.getElementById('hero-video');
const pauseButton = document.getElementById('pause-hero');
const videos = [...document.querySelectorAll('video')];
const visibleVideos = new Set();
let heroManuallyPaused = false;

function startVideo(video) {
  if (document.hidden || video.closest('[hidden]') || (video === hero && heroManuallyPaused)) return;
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  const attempt = video.play();
  if (attempt && typeof attempt.catch === 'function') attempt.catch(() => {});
}
function syncHeroButton() { pauseButton.textContent = hero.paused ? 'Resume' : 'Pause'; }
hero.addEventListener('play', syncHeroButton);
hero.addEventListener('pause', syncHeroButton);
pauseButton.addEventListener('click', () => {
  if (hero.paused) { heroManuallyPaused = false; startVideo(hero); }
  else { heroManuallyPaused = true; hero.pause(); }
});
document.getElementById('replay-hero').addEventListener('click', () => {
  heroManuallyPaused = false;
  hero.currentTime = 0;
  startVideo(hero);
});

// Native autoplay plus visibility-based resumption: no play click required.
// Each visible clip plays independently; playing one never pauses another.
videos.forEach(video => {
  video.autoplay = true;
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  video.playsInline = true;
  video.addEventListener('loadeddata', () => {
    if (visibleVideos.has(video) || video === hero) startVideo(video);
  });
});
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !entry.target.closest('[hidden]')) {
        visibleVideos.add(entry.target);
        startVideo(entry.target);
      } else {
        visibleVideos.delete(entry.target);
        entry.target.pause();
      }
    });
  }, { threshold: 0.02 });
  videos.forEach(video => observer.observe(video));
} else videos.forEach(startVideo);
startVideo(hero);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) videos.forEach(video => video.pause());
  else visibleVideos.forEach(startVideo);
});
// Retry after the first ordinary page interaction on browsers with stricter policies.
['pointerdown', 'keydown'].forEach(event => document.addEventListener(event, () => {
  visibleVideos.forEach(startVideo);
}, { once: true, passive: true }));

const youtubeId = String(config.youtubeId || '').trim();
if (/^[A-Za-z0-9_-]{11}$/.test(youtubeId)) {
  const slot = document.getElementById('youtube-slot');
  slot.replaceChildren();
  slot.setAttribute('aria-label', 'TacGooseBumps research video');
  const frame = document.createElement('iframe');
  frame.src = 'https://www.youtube-nocookie.com/embed/' + youtubeId + '?autoplay=0&mute=0&playsinline=1';
  frame.title = 'TacGooseBumps research video';
  frame.loading = 'lazy';
  frame.allow = 'encrypted-media; picture-in-picture; fullscreen';
  frame.allowFullscreen = true;
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  slot.append(frame);
  document.querySelectorAll('[data-youtube]').forEach(a => {
    a.href = 'https://www.youtube.com/watch?v=' + youtubeId;
    a.hidden = false;
  });
}
if (config.projectUrl) {
  try {
    const url = new URL(config.projectUrl);
    if (url.protocol === 'https:') {
      const canonical = document.querySelector('link[rel="canonical"]') || document.createElement('link');
      canonical.rel = 'canonical';
      canonical.href = url.href;
      document.head.append(canonical);
    }
  } catch {}
}

const tabs = [...document.querySelectorAll('[data-task]')];
function selectTask(button, focus = false) {
  tabs.forEach(tab => {
    const active = tab === button;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    const panel = document.getElementById(tab.getAttribute('aria-controls'));
    panel.hidden = !active;
    panel.querySelectorAll('video').forEach(video => {
      if (active) startVideo(video);
      else { visibleVideos.delete(video); video.pause(); }
    });
  });
  if (focus) button.focus();
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectTask(tab));
  tab.addEventListener('keydown', event => {
    let next = null;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next !== null) { event.preventDefault(); selectTask(tabs[next], true); }
  });
});
if (tabs.length) selectTask(tabs[0]);

const figureModal = document.getElementById('figure-modal');
if (figureModal && typeof figureModal.showModal === 'function') {
  document.querySelectorAll('[data-lightbox]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    const image = link.querySelector('img');
    document.getElementById('modal-image').src = link.href;
    document.getElementById('modal-image').alt = image.alt;
    document.getElementById('modal-caption').textContent = link.closest('figure').querySelector('figcaption').textContent;
    figureModal.showModal();
  }));
}
const citationModal = document.getElementById('citation-modal');
if (citationModal && typeof citationModal.showModal === 'function') {
  document.querySelectorAll('[data-citation]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    document.getElementById('copy-status').textContent = '';
    citationModal.showModal();
  }));
}
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const r = dialog.getBoundingClientRect();
  if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
}));
document.getElementById('copy-bibtex').addEventListener('click', async () => {
  const text = document.getElementById('bibtex-text').textContent;
  const status = document.getElementById('copy-status');
  try {
    await navigator.clipboard.writeText(text);
    status.textContent = 'Copied.';
  } catch {
    const range = document.createRange();
    range.selectNodeContents(document.getElementById('bibtex-text'));
    const selection = window.getSelection();
    selection.removeAllRanges(); selection.addRange(range);
    status.textContent = 'Text selected. Press ⌘C / Ctrl+C to copy.';
  }
});
