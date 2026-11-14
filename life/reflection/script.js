(function () {
  'use strict';

  var scroller = document.querySelector('.reflection-scroll');
  var links = Array.from(document.querySelectorAll('.reflection-timeline a'));
  var starts = Array.from(document.querySelectorAll('[data-year-start]'));
  if (!scroller || !links.length || !starts.length) return;

  function updateCurrentYear() {
    var top = scroller.getBoundingClientRect().top;
    var current = starts[0].dataset.yearStart;
    starts.forEach(function (start) {
      if (start.getBoundingClientRect().top <= top + 32) {
        current = start.dataset.yearStart;
      }
    });
    // The last year may be too short to reach the top of the scroll area.
    if (scroller.scrollHeight > scroller.clientHeight &&
        scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2) {
      current = starts[starts.length - 1].dataset.yearStart;
    }
    links.forEach(function (link) {
      if (link.dataset.year === current) {
        link.setAttribute('aria-current', 'location');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  var scheduled = false;
  function scheduleUpdate() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(function () {
      scheduled = false;
      updateCurrentYear();
    });
  }

  // Native fragment links handle scrolling, history and no-JavaScript access.
  scroller.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate);
  window.addEventListener('hashchange', scheduleUpdate);
  window.addEventListener('load', scheduleUpdate);
  if ('ResizeObserver' in window) {
    var observer = new ResizeObserver(scheduleUpdate);
    observer.observe(scroller);
    observer.observe(document.querySelector('.reflection-list'));
  }
  updateCurrentYear();
})();
