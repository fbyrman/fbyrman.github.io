// Render all math on the page ($...$ inline, \[...\] display), then run
// numbering/TOC once MathJax has finished typesetting.
document.addEventListener("DOMContentLoaded", function () {
  MathJax.startup.promise.then(setUpPage);
});

function setUpPage() {
  // --- Auto-number equations in document order, like LaTeX \label/\eqref ---
  var equations = Array.prototype.slice.call(document.querySelectorAll(".equation"));
  var numberOf = {};
  equations.forEach(function (eqEl, i) {
    var n = i + 1;
    numberOf[eqEl.id] = n;
    var tag = document.createElement("span");
    tag.className = "eq-num";
    tag.textContent = "(" + n + ")";
    eqEl.appendChild(tag);
  });

  // --- Resolve \eqref-style spans and make them clickable ---
  document.querySelectorAll(".eqref").forEach(function (span) {
    var ref = span.getAttribute("data-ref");
    var n = numberOf[ref];
    span.textContent = n ? "(" + n + ")" : "(??)";
    if (n) {
      span.addEventListener("click", function () {
        var target = document.getElementById(ref);
        if (!target) return;
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.classList.add("flash");
        setTimeout(function () { target.classList.remove("flash"); }, 900);
      });
    }
  });

  // --- Build the table of contents from section/subsection headings ---
  var tocList = document.getElementById("toc-list");
  document.querySelectorAll(".tex-section").forEach(function (sectionEl) {
    var h2 = sectionEl.querySelector(":scope > h2.sec-title");
    if (!h2) return;
    var li = document.createElement("li");
    var a = document.createElement("a");
    a.href = "#" + sectionEl.id;
    a.textContent = h2.textContent.trim();
    li.appendChild(a);

    var subOl = document.createElement("ol");
    sectionEl.querySelectorAll(".tex-subsection").forEach(function (subEl) {
      var h3 = subEl.querySelector(":scope > h3.subsec-title");
      if (!h3) return;
      var subLi = document.createElement("li");
      var subA = document.createElement("a");
      subA.href = "#" + subEl.id;
      subA.textContent = h3.textContent.trim();
      subLi.appendChild(subA);
      subOl.appendChild(subLi);
    });
    if (subOl.children.length) li.appendChild(subOl);
    tocList.appendChild(li);
  });

  // --- Highlight the active TOC entry on scroll ---
  var tocLinks = Array.prototype.slice.call(document.querySelectorAll(".toc a"));
  var targets = tocLinks
    .map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); })
    .filter(Boolean);
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var link = document.querySelector('.toc a[href="#' + entry.target.id + '"]');
      if (!link) return;
      if (entry.isIntersecting) {
        tocLinks.forEach(function (l) { l.classList.remove("active"); });
        link.classList.add("active");
      }
    });
  }, { rootMargin: "-15% 0px -70% 0px" });
  targets.forEach(function (t) { observer.observe(t); });
}
