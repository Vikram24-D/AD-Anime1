document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("loginForm");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const rememberCheckbox = document.getElementById("remember");
    const messageEl = document.getElementById("message");
    const eyeToggle = document.getElementById("eye");
    const demoBtn = document.getElementById("demo-fill-btn");
    const forgotLink = document.getElementById("forgot-link");

    // Quick-fill demo credentials
    if (demoBtn) {
        demoBtn.addEventListener("click", function () {
            emailInput.value = "admin@gmail.com";
            passwordInput.value = "123456";
            if (messageEl) {
                messageEl.style.color = "#38bdf8";
                messageEl.textContent = "Demo credentials loaded. Click Login!";
            }
        });
    }

    // Toggle password visibility
    if (eyeToggle && passwordInput) {
        eyeToggle.addEventListener("click", function () {
            const isHidden = passwordInput.type === "password";
            passwordInput.type = isHidden ? "text" : "password";
            this.classList.toggle("fa-eye", !isHidden);
            this.classList.toggle("fa-eye-slash", isHidden);
        });
    }

    // Handle Forgot Password
    if (forgotLink) {
        forgotLink.addEventListener("click", function (e) {
            e.preventDefault();
            alert("Demo Password Reset:\nUse 'admin@gmail.com' and password '123456', or create a new account on the Sign Up page!");
        });
    }

    // Social login click handlers (informative demo notification)
    document.querySelectorAll(".social i").forEach(icon => {
        icon.addEventListener("click", function () {
            if (messageEl) {
                messageEl.style.color = "#38bdf8";
                messageEl.textContent = "Social sign-in is disabled in demo mode. Please use admin@gmail.com";
            }
        });
    });

    // Form Submission
    if (loginForm) {
        loginForm.addEventListener("submit", function (event) {
            event.preventDefault();

            const email = emailInput.value.trim().toLowerCase();
            const password = passwordInput.value;
            const remember = rememberCheckbox ? rememberCheckbox.checked : false;

            // Load saved accounts from localStorage
            let users = [];
            try {
                users = JSON.parse(localStorage.getItem("users") || "[]");
            } catch (err) {
                users = [];
            }

            // Always support the primary admin demo account
            const adminAccount = {
                name: "Admin",
                email: "admin@gmail.com",
                password: "123456",
                role: "Administrator"
            };

            const matchedUser = users.find(u => u.email === email && u.password === password) ||
                (email === adminAccount.email && password === adminAccount.password ? adminAccount : null);

            if (matchedUser) {
                messageEl.style.color = "#4ade80";
                messageEl.textContent = "✓ Login Successful! Redirecting to AnimeDex...";

                // Determine storage based on Remember Me
                const store = remember ? localStorage : sessionStorage;
                store.setItem("isLoggedIn", "true");

                const currentUser = {
                    name: matchedUser.name || (email === "admin@gmail.com" ? "Admin" : email.split("@")[0]),
                    email: matchedUser.email,
                    role: matchedUser.role || "Otaku Member"
                };

                localStorage.setItem("currentUser", JSON.stringify(currentUser));
                sessionStorage.setItem("currentUser", JSON.stringify(currentUser));

                // Button loading animation
                const submitBtn = loginForm.querySelector("button[type='submit']");
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = "Loading...";
                }

                setTimeout(function () {
                    window.location.href = "AD-Anime.html";
                }, 600);
            } else {
                messageEl.style.color = "#f87171";
                messageEl.textContent = "✕ Invalid Email or Password. Try admin@gmail.com / 123456";

                // Shake animation on error
                const card = document.querySelector(".card-box") || document.querySelector(".circle");
                if (card) {
                    card.classList.add("shake-error");
                    setTimeout(() => card.classList.remove("shake-error"), 500);
                }
            }
        });
    }
});
