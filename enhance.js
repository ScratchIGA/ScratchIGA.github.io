/*
 * Progressive enhancements: scroll parallax and the golf-ball cursor.
 *
 * Deliberately plain JS rather than a React component. The homepage is also
 * shipped as a static export with the runtime stripped, and this way one
 * implementation serves both — nothing here needs hydration, and if the file
 * fails to load the page is exactly as it was.
 *
 * Both effects are opt-in by capability: parallax stands down under
 * prefers-reduced-motion, and the cursor additionally requires a fine
 * pointer, so it never appears on touch.
 */
(function () {
  "use strict";

  var calm = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------------------------------------------------------------- parallax
   * Elements carrying data-parallax drift against the scroll.
   *
   * Travel is derived from the headroom the CSS over-scale actually creates,
   * not from a raw scroll factor. That distinction matters: media sits in
   * overflow-hidden boxes, and a fixed factor that looks right on a tall hero
   * will drag a short gallery tile's edge into frame — a 278px tile wants
   * ~43px of travel but scale(1.16) only hides 22px of it.
   *
   * So data-parallax is a fraction of available headroom (0-1), and the
   * geometry can never expose an edge at any viewport size.
   */
  function parallax() {
    var layers = [].slice.call(document.querySelectorAll("[data-parallax]"));
    if (!layers.length || calm.matches) return;

    var visible = [];
    var queued = false;

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var i = visible.indexOf(entry.target);
          if (entry.isIntersecting && i === -1) visible.push(entry.target);
          else if (!entry.isIntersecting && i !== -1) visible.splice(i, 1);
        });
        request();
      },
      { rootMargin: "10% 0px" }
    );
    layers.forEach(function (el) {
      el.classList.add("parallax-layer");
      io.observe(el);
    });

    function draw() {
      queued = false;
      var vh = window.innerHeight;
      var mid = vh / 2;
      visible.forEach(function (el) {
        var box = el.getBoundingClientRect();
        if (!box.height) return;

        /* -1 entering from below, 0 centred, +1 leaving past the top. */
        var progress = (box.top + box.height / 2 - mid) / (mid + box.height / 2);
        progress = Math.max(-1, Math.min(1, progress));

        /* Half the over-scale is the margin hidden on each edge. */
        var scale = parseFloat(getComputedStyle(el).scale) || 1;
        var headroom = ((scale - 1) * box.height) / 2;
        var amount = parseFloat(el.dataset.parallax);
        if (!(amount > 0)) amount = 0.7;

        var shift = -progress * headroom * Math.min(amount, 1);
        el.style.transform = "translate3d(0," + shift.toFixed(2) + "px,0)";
      });
    }

    function request() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(draw);
    }

    addEventListener("scroll", request, { passive: true });
    addEventListener("resize", request, { passive: true });
    draw();
  }

  /* ------------------------------------------------------------------ cursor
   * A golf ball, and a ring that lags behind it. Over anything clickable the
   * ring closes in and the ball settles — a putt dropping.
   *
   * The ring trails at roughly half the ball's easing, which is what gives
   * the pair its weight; matching the two makes it look like one rigid object.
   */
  function cursor() {
    var fine = window.matchMedia("(pointer: fine)");
    if (!fine.matches || calm.matches) return;

    var ball = document.createElement("div");
    var cup = document.createElement("div");
    ball.className = "gcursor-ball";
    cup.className = "gcursor-cup";
    ball.setAttribute("aria-hidden", "true");
    cup.setAttribute("aria-hidden", "true");
    document.body.appendChild(cup);
    document.body.appendChild(ball);
    document.documentElement.classList.add("has-gcursor");

    var target = { x: -100, y: -100 };
    var ballAt = { x: -100, y: -100 };
    var cupAt = { x: -100, y: -100 };
    var live = false;

    addEventListener(
      "mousemove",
      function (e) {
        target.x = e.clientX;
        target.y = e.clientY;
        if (!live) {
          live = true;
          ballAt.x = cupAt.x = e.clientX;
          ballAt.y = cupAt.y = e.clientY;
          document.documentElement.classList.add("gcursor-on");
        }
      },
      { passive: true }
    );

    /* Leaving the window should take the cursor with it. */
    addEventListener("mouseout", function (e) {
      if (!e.relatedTarget) document.documentElement.classList.remove("gcursor-on");
    });
    addEventListener("mouseover", function () {
      if (live) document.documentElement.classList.add("gcursor-on");
    });

    var HOT = "a,button,[role=button],summary,label,input,select,textarea";
    addEventListener(
      "mouseover",
      function (e) {
        var hot = e.target.closest && e.target.closest(HOT);
        document.documentElement.classList.toggle("gcursor-hot", !!hot);
      },
      { passive: true }
    );

    (function frame() {
      ballAt.x += (target.x - ballAt.x) * 0.34;
      ballAt.y += (target.y - ballAt.y) * 0.34;
      cupAt.x += (target.x - cupAt.x) * 0.16;
      cupAt.y += (target.y - cupAt.y) * 0.16;
      ball.style.transform = "translate3d(" + ballAt.x + "px," + ballAt.y + "px,0) translate(-50%,-50%)";
      cup.style.transform = "translate3d(" + cupAt.x + "px," + cupAt.y + "px,0) translate(-50%,-50%)";
      requestAnimationFrame(frame);
    })();
  }

  function start() {
    parallax();
    cursor();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
