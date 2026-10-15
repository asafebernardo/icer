(function () {
  try {
    var t = localStorage.getItem("church-theme");
    if (t === "light") document.documentElement.classList.remove("dark");
    else document.documentElement.classList.add("dark");
  } catch (e) {}
})();
