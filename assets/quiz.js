// Reusable quiz widget for graphify lessons.
// Markup contract:
//   <div class="quiz" data-answer="2">
//     <p class="q">Question text?</p>
//     <button type="button">Option A</button>
//     <button type="button">Option B</button>   <- index starts at 0
//     <button type="button">Option C</button>
//     <p class="fb"></p>
//   </div>
// data-answer is the zero-based index of the correct button.
(function () {
  function init() {
    document.querySelectorAll(".quiz").forEach(function (quiz) {
      if (quiz.dataset.bound) return;
      quiz.dataset.bound = "1";
      var answer = parseInt(quiz.dataset.answer, 10);
      var buttons = Array.prototype.slice.call(quiz.querySelectorAll("button"));
      var fb = quiz.querySelector(".fb");
      var done = false;
      buttons.forEach(function (btn, i) {
        btn.addEventListener("click", function () {
          if (done) return;
          if (i === answer) {
            btn.classList.add("correct");
            if (fb) fb.textContent = "Correct. " + (quiz.dataset.explain || "");
            done = true;
          } else {
            btn.classList.add("wrong");
            btn.disabled = true;
            if (fb) fb.textContent = "Not quite. Try again.";
          }
        });
      });
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
