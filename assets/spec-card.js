// Interactive spec-card builder for the "Engineer's Prompt" lessons.
// Markup contract (ids are scoped by the container class .specbuilder):
//   <div class="specbuilder">
//     <label>1. What it builds<input class="sc-what"></label>
//     <label>2. Exit criterion<input class="sc-exit"></label>
//     <label>3. Out of scope<input class="sc-scope"></label>
//     <label>4. Locked decisions<input class="sc-locked"></label>
//     <label>5. Verification command<input class="sc-verify"></label>
//     <pre class="spec-out"></pre>
//     <button class="copybtn" type="button">Copy spec card</button>
//   </div>
// Emits a copy-pasteable spec card. No dependencies.
(function () {
  function render(box) {
    var q = function (c) { return (box.querySelector("." + c) || {}).value || ""; };
    var line = function (n, label, val) {
      return n + ". " + label + "\n" + (val.trim() || "—") + "\n";
    };
    var out =
      "SPEC CARD\n" +
      line(1, "WHAT IT BUILDS", q("sc-what")) +
      line(2, "EXIT CRITERION", q("sc-exit")) +
      line(3, "OUT OF SCOPE", q("sc-scope")) +
      line(4, "LOCKED DECISIONS", q("sc-locked")) +
      line(5, "VERIFICATION", q("sc-verify")) +
      "\nRule: stop at the first blocker and report it. Do not improvise.";
    box.querySelector(".spec-out").textContent = out;
  }

  function init() {
    document.querySelectorAll(".specbuilder").forEach(function (box) {
      if (box.dataset.bound) return;
      box.dataset.bound = "1";
      box.querySelectorAll("input, textarea").forEach(function (el) {
        el.addEventListener("input", function () { render(box); });
      });
      var btn = box.querySelector(".copybtn");
      if (btn) {
        btn.addEventListener("click", function () {
          var text = box.querySelector(".spec-out").textContent;
          var done = function () {
            btn.textContent = "Copied";
            setTimeout(function () { btn.textContent = "Copy spec card"; }, 1200);
          };
          if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(done, done);
          } else {
            var ta = document.createElement("textarea");
            ta.value = text; document.body.appendChild(ta); ta.select();
            try { document.execCommand("copy"); } catch (e) {}
            document.body.removeChild(ta); done();
          }
        });
      }
      render(box);
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
