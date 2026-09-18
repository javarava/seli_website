/* Seli website — global interactions. */
(function () {
  'use strict';

  /* ── HOW IT WORKS: scroll-pinned step sequence ─────────────────────────────
     The .how-pin runway is steps × 100vh tall; .how-section sticks to the top
     while the user scrolls through it. Each 100vh wedge of the pinned scroll
     distance highlights the matching .how-step and shows its .how-visual.
     After the last wedge the runway ends and the page scrolls on normally.  */
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var lgMatch = window.matchMedia('(min-width: 992px)');

  var pin = document.querySelector('.how-pin');
  if (!pin) return;

  var steps = Array.prototype.slice.call(pin.querySelectorAll('.how-step'));
  var visuals = Array.prototype.slice.call(pin.querySelectorAll('.how-visual'));
  if (steps.length < 2) return;

  var activeIndex = 0;
  var raf = null;

  // Animate the outgoing visual out while the incoming one slides in.
  // Both move in the same direction — forward steps scroll both upward,
  // backward steps scroll both downward.
  function setStep(index) {
    if (index === activeIndex) return;
    var goingUp = index > activeIndex;
    activeIndex = index;
    var stepNum = String(index + 1);

    steps.forEach(function (step) {
      step.classList.toggle('active', step.getAttribute('data-step') === stepNum);
    });

    if (enabled()) {
      var outVisual = pin.querySelector('.how-visual.is-active');
      var inVisual = pin.querySelector('.how-visual[data-step="' + stepNum + '"]');

      if (outVisual && outVisual !== inVisual) {
        outVisual.classList.remove('is-active');
        outVisual.style.animation = 'none';
        void outVisual.offsetWidth;
        outVisual.style.animation =
          (goingUp ? 'howOutUp' : 'howOutDown') + ' 0.5s ease both';
      }

      if (inVisual) {
        inVisual.classList.remove('d-none');
        inVisual.classList.add('is-active');
        inVisual.style.animation = 'none';
        void inVisual.offsetWidth;
        inVisual.style.animation =
          (goingUp ? 'howInUp' : 'howInDown') + ' 0.5s ease both';
      }
    } else {
      visuals.forEach(function (visual) {
        var isCurrent = visual.getAttribute('data-step') === stepNum;
        visual.classList.toggle('is-active', isCurrent);
        visual.classList.toggle('d-none', !isCurrent);
      });
    }
  }

  // Recompute which step the current scroll position maps to.
  function update() {
    var viewportH = window.innerHeight || document.documentElement.clientHeight;
    var wrapTop = pin.getBoundingClientRect().top + window.scrollY;
    var runway = pin.offsetHeight - viewportH; // distance scrolled while pinned
    if (runway <= 0) return;

    var p = window.scrollY - wrapTop;
    if (p < 0) p = 0;
    if (p > runway) p = runway;
    var index = Math.floor((p / runway) * steps.length);
    if (index > steps.length - 1) index = steps.length - 1;

    setStep(index);
  }

  // Throttle scroll updates to one pass per animation frame.
  function schedule() {
    if (raf !== null) return;
    raf = window.requestAnimationFrame(function () {
      raf = null;
      update();
    });
  }

  // Make the runway exactly steps × viewport so each step owns one 100vh wedge.
  function syncHeight() {
    var viewportH = window.innerHeight || document.documentElement.clientHeight;
    pin.style.height = steps.length * viewportH + 'px';
    update();
  }

  function enabled() {
    return lgMatch.matches && !reduceMotion.matches;
  }

  function boot() {
    if (!enabled()) {
      // Static fallback: step 1 stays active, extra visuals stay hidden.
      setStep(0);
      pin.style.height = '';
      return;
    }
    syncHeight();
  }

  // Re-setup when the breakpoint or reduced-motion preference changes.
  var rebind = function () {
    window.removeEventListener('resize', onResize);
    boot();
    window.addFantasEventListener('resize', onResize);
  };

  function onResize() {
    if (enabled()) syncHeight();
  }

  // Tapping/clicking a step scrolls to that step's pinned position.
  steps.forEach(function (step) {
    step.addEventListener('click', function () {
      var viewportH = window.innerHeight || document.documentElement.clientHeight;
      var wrapTop = pin.getBoundingClientRect().top + window.scrollY;
      var runway = pin.offsetHeight - viewportH;
      var index = steps.indexOf(step);

      var target;
      if (enabled() && runway > 0) {
        // Scroll to the midpoint of the step's wedge so it becomes active.
        target = wrapTop + (index + 0.5) * (runway / steps.length);
        var maxScroll = wrapTop + runway;
        if (target > maxScroll) target = maxScroll;
        if (target < 0) target = 0;
      } else {
        // Static fallback: just bring the section into view.
        target = Math.max(wrapTop - 12, 0);
      }
      window.scrollTo({ top: target, behavior: 'smooth' });
    });
  });

  // Wheel over the steps column cycles to the next/previous step instead of
  // scrolling the page. Only intercepts while the section is actually pinned.
  var stepsEl = pin.querySelector('.how-steps');
  var WHEEL_STEP_THRESHOLD = 80; // approx pixels of wheel travel per step
  var wheelAccum = 0;
  if (stepsEl) {
    stepsEl.addEventListener('wheel', function (e) {
      if (!enabled()) return; // static fallback: let the page scroll normally
      var wrapTop = pin.getBoundingClientRect().top + window.scrollY;
      var runway = pin.offsetHeight - (window.innerHeight || document.documentElement.clientHeight);
      var maxScroll = wrapTop + runway;
      // Only intercept while the section is pinned; otherwise pass through.
      if (runway <= 0 || window.scrollY < wrapTop || window.scrollY > maxScroll) return;

      var delta = e.deltaY;
      if (e.deltaMode === 1) delta *= 16; // lines -> pixels
      else if (e.deltaMode === 2) delta *= window.innerHeight; // pages -> pixels
      wheelAccum += delta;

      var dir = wheelAccum >= WHEEL_STEP_THRESHOLD ? 1
        : wheelAccum <= -WHEEL_STEP_THRESHOLD ? -1 : 0;
      if (dir === 0) return;

      // Boundary exit: leaving the section. Scroll explicitly past the pin so
      // the page continues in the scroll direction (up from step 1, down from
      // the last step). Subsequent wheel events then pass through natively.
      if (activeIndex === 0 && dir < 0) {
        e.preventDefault();
        wheelAccum = 0;
        window.scrollTo({ top: Math.max(wrapTop - 120, 0), behavior: 'smooth' });
        return;
      }
      if (activeIndex === steps.length - 1 && dir > 0) {
        e.preventDefault();
        wheelAccum = 0;
        window.scrollTo({ top: maxScroll + 120, behavior: 'smooth' });
        return;
      }

      e.preventDefault();
      wheelAccum = wheelAccum % WHEEL_STEP_THRESHOLD;

      var target = window.scrollY + dir * (runway / steps.length);
      if (target < wrapTop) target = wrapTop;
      if (target > maxScroll) target = maxScroll;
      window.scrollTo({ top: target, behavior: 'smooth' });
    }, { passive: false });
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('load', schedule); // images settle scroll offsets
  lgMatch.addEventListener('change', rebind);
  reduceMotion.addEventListener('change', rebind);

  /* Display current year */
  document.getElementById('year').textContent = new Date().getFullYear();
  
  boot();
})();