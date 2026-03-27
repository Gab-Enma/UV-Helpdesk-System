document.addEventListener("DOMContentLoaded", function () {
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  const backToHome = document.querySelector(".button--secondary");
  if (backToHome) {
    backToHome.addEventListener("click", function (event) {
      event.preventDefault();
      window.location.href = "index.html";
    });
  }
});
