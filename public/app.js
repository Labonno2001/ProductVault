
const loginForm = document.querySelector("#loginForm");
const message = document.querySelector("#message");
const loginButton = document.querySelector("#loginButton");
const collectTokenButton = document.querySelector("#collectTokenButton");
const tokenMessage = document.querySelector("#tokenMessage");

let collectedToken = "";
let loginSuccessful = false;

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.querySelector("#email").value.trim();
  const password = document.querySelector("#password").value;

  message.textContent = "Signing in...";
  tokenMessage.textContent = "";
  collectTokenButton.style.display = "none";
  collectedToken = "";
  loginSuccessful = false;

  loginButton.disabled = true;
  loginButton.textContent = "Signing in...";

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Login failed.");
    }

    if (!data.token) {
      throw new Error("Login succeeded, but no token was received.");
    }

    localStorage.setItem("productvault_token", data.token);
    localStorage.setItem(
      "productvault_user",
      JSON.stringify(data.user)
    );

    collectedToken = data.token;
    loginSuccessful = true;

    message.textContent = "Login successful! Click Collect Token to continue.";
    collectTokenButton.style.display = "block";

    loginButton.disabled = true;
    loginButton.textContent = "Login Successful";

  } catch (error) {
    message.textContent = error.message;
    loginButton.disabled = false;
    loginButton.textContent = "Login";
  }
});

collectTokenButton.addEventListener("click", async () => {
  if (!loginSuccessful || !collectedToken) {
    tokenMessage.textContent = "Please log in successfully first.";
    return;
  }

  collectTokenButton.disabled = true;
  tokenMessage.textContent = "Copying token...";

  try {
    await navigator.clipboard.writeText(collectedToken);
  } catch (error) {
    // Fallback for browsers where clipboard access is unavailable.
    const textArea = document.createElement("textarea");
    textArea.value = collectedToken;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";

    document.body.appendChild(textArea);
    textArea.select();

    const copied = document.execCommand("copy");
    textArea.remove();

    if (!copied) {
      tokenMessage.textContent =
        "Could not copy the token. Please allow clipboard access and try again.";
      collectTokenButton.disabled = false;
      return;
    }
  }

  tokenMessage.textContent =
    "Token copied successfully! Opening your dashboard...";

  // Redirect only after the token has been copied successfully.
  setTimeout(() => {
    window.location.replace("/dashboard.html");
  }, 1000);
});
