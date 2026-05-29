// ==========================================
// 2. THEME & NAVIGATION ENGINE
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    // Theme Engine
    const savedTheme = localStorage.getItem("theeha-theme");
    let activeTheme = savedTheme ? savedTheme : "light";
    if (!savedTheme) localStorage.setItem("theeha-theme", "light");
    document.documentElement.setAttribute("data-theme", activeTheme);

    const themeToggleBtn = document.querySelectorAll("#theme-toggle");
    if (themeToggleBtn.length) themeToggleBtn.forEach(b => b.textContent = activeTheme === "dark" ? "🌙" : "☀️");

    themeToggleBtn.forEach(btn => {
        btn.onclick = function() {
            const targetMode = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
            document.documentElement.setAttribute("data-theme", targetMode);
            localStorage.setItem("theeha-theme", targetMode);
            themeToggleBtn.forEach(b => b.textContent = targetMode === "dark" ? "🌙" : "☀️");
        };
    });

    // Mobile Hamburger Menu
    const hamburgerTrigger = document.getElementById("hamburger-menu-trigger");
    const navbarDrawer = document.getElementById("navbar-links-drawer");
    if (hamburgerTrigger && navbarDrawer) {
        hamburgerTrigger.onclick = function(e) { e.stopPropagation(); navbarDrawer.classList.toggle("mobile-open"); };
        document.addEventListener("click", () => { navbarDrawer.classList.remove("mobile-open"); });
    }
});