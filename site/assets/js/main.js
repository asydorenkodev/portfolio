// Small progressive enhancements. The site works fully without JavaScript.
(function () {
  var doc = document.documentElement;

  // Current year in the footer
  var y = document.querySelectorAll('[data-year]');
  for (var i = 0; i < y.length; i++) y[i].textContent = new Date().getFullYear();

  // Showreel: big "Play" button over the poster. Without JS the native controls still work.
  var reel = document.querySelector('.reel'), vid = document.getElementById('showreel-video');
  if (reel && vid) {
    vid.removeAttribute('controls');
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'reel-play'; b.setAttribute('aria-label', 'Play the showreel with sound');
    b.innerHTML = '<span>Play showreel · 1:00 <i><svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4 2.5v11l9-5.5z"/></svg></i></span>';
    reel.appendChild(b);
    b.addEventListener('click', function () {
      reel.classList.add('is-playing'); vid.setAttribute('controls', ''); vid.play();
    });
    vid.addEventListener('ended', function () { vid.currentTime = 0; });
  }

  // Fade-in on scroll. The inline script in <head> adds .js only when
  // IntersectionObserver exists and the visitor hasn't asked for reduced motion.
  if (!doc.classList.contains('js')) return;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  document.querySelectorAll('.rv').forEach(function (el) { io.observe(el); });
})();
