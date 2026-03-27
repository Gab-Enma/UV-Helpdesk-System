document.addEventListener("DOMContentLoaded", function () {
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  const dashboardBtn = document.querySelector(".hero__actions .button");
  const writeBtn = document.querySelector(".hero__actions .button--secondary");

  if (dashboardBtn) {
    dashboardBtn.addEventListener("click", function (event) {
      event.preventDefault();
      window.location.href = "dashboard.html";
    });
  }

  if (writeBtn) {
    writeBtn.addEventListener("click", function (event) {
      event.preventDefault();
      window.location.href = "write.html";
    });
  }
});
