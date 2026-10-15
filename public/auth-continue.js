(function () {
  var el = document.getElementById("icer-auth-ticket");
  var ticket = el ? String(el.textContent || "").trim() : "";
  if (!ticket) {
    location.replace("/Home?google_login=err&reason=oauth");
    return;
  }
  fetch("/api/auth/google-login/complete", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ ticket: ticket }),
  })
    .then(function (response) {
      return response.json().then(function (body) {
        return { ok: response.ok, body: body || {} };
      });
    })
    .then(function (result) {
      var next =
        result.body && result.body.redirect
          ? result.body.redirect
          : result.ok
            ? "/Home?google_login=ok"
            : "/Home?google_login=err&reason=oauth";
      location.replace(next);
    })
    .catch(function () {
      location.replace("/Home?google_login=err&reason=oauth");
    });
})();
