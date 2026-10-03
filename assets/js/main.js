/* Veronika Martin – minimales Vanilla-JS.
   Aufgaben: Mobil-Navigation auf-/zuklappen, Schatten am Kopfbereich beim Scrollen. */
(function () {
  'use strict';

  var schalter = document.querySelector('.nav-schalter');
  var nav = document.getElementById('hauptnavigation');
  var kopf = document.querySelector('.kopf');

  if (schalter && nav) {
    schalter.addEventListener('click', function () {
      var offen = nav.classList.toggle('ist-offen');
      schalter.setAttribute('aria-expanded', offen ? 'true' : 'false');
    });

    // Beim Wechsel auf Desktop-Breite den mobilen Zustand zurücksetzen
    window.addEventListener('resize', function () {
      if (window.innerWidth > 760 && nav.classList.contains('ist-offen')) {
        nav.classList.remove('ist-offen');
        schalter.setAttribute('aria-expanded', 'false');
      }
    });

    // Escape schließt das Menü und gibt den Fokus zurück
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('ist-offen')) {
        nav.classList.remove('ist-offen');
        schalter.setAttribute('aria-expanded', 'false');
        schalter.focus();
      }
    });
  }

  if (kopf) {
    var pruefeScroll = function () {
      kopf.classList.toggle('ist-gescrollt', window.scrollY > 8);
    };
    pruefeScroll();
    window.addEventListener('scroll', pruefeScroll, { passive: true });
  }
})();
