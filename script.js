document.addEventListener("DOMContentLoaded", () => {
    // Mobile menu toggle
    const menuToggle = document.querySelector(".menu-toggle");
    const mainNav = document.querySelector(".main-nav");
  
    if (menuToggle && mainNav) {
      menuToggle.addEventListener("click", () => {
        const isOpen = mainNav.classList.toggle("open");
        menuToggle.setAttribute("aria-expanded", String(isOpen));
      });
    }
  
    // FAQ accordion
    const faqButtons = document.querySelectorAll(".faq-question");
  
    faqButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const item = button.closest(".faq-item");
        const expanded = button.getAttribute("aria-expanded") === "true";
        button.setAttribute("aria-expanded", String(!expanded));
  
        if (item) {
          item.classList.toggle("open", !expanded);
        }
      });
    });
  
    // Current year in footer
    const yearSpan = document.getElementById("current-year");
    if (yearSpan) {
      yearSpan.textContent = new Date().getFullYear();
    }
  
    // Contact form -> open mailto
    const form = document.getElementById("quote-form");
    const successMessage = document.getElementById("form-success-message");
  
    if (form) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
  
        const formData = new FormData(form);
        const name = formData.get("name") || "";
        const phone = formData.get("phone") || "";
        const email = formData.get("email") || "";
        const city = formData.get("city") || "";
        const details = formData.get("details") || "";
  
        const subject = `San Diego Junk Removal Quote Request - ${city}`;
        const bodyLines = [
          `Name: ${name}`,
          `Phone: ${phone}`,
          email ? `Email: ${email}` : "",
          `City / Neighborhood: ${city}`,
          "",
          "What they need removed:",
          `${details}`
        ].filter(Boolean);
  
        const mailto = `mailto:info@example.com?subject=${encodeURIComponent(
          subject
        )}&body=${encodeURIComponent(bodyLines.join("\n"))}`;
  
        window.location.href = mailto;
  
        if (successMessage) {
          successMessage.hidden = false;
        }
      });
    }
  });
  