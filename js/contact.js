// contact.js - Gestion des erreurs et validation du formulaire de la page CONTACT

class ContactFormValidator {
  constructor(formSelector) {
    this.form = document.querySelector(formSelector);
    this.errors = {};
    this.init();
  }

  init() {
    if (!this.form) return;

    this.form.addEventListener("submit", (e) => this.handleSubmit(e));
    this.setupRealTimeValidation();
  }

  setupRealTimeValidation() {
    const inputs = this.form.querySelectorAll("input, select, textarea");

    inputs.forEach((input) => {
      input.addEventListener("blur", () => this.validateField(input));
      input.addEventListener("input", () => this.clearFieldError(input.name));
    });
  }

  validateField(field) {
    const { name, value, required } = field;
    let isValid = true;
    let errorMessage = "";
    const trimmedValue = value.trim();

    switch (name) {
      case "firstname":
        if (required && !trimmedValue) {
          errorMessage = "Le prénom est obligatoire.";
          isValid = false;
        } else if (trimmedValue && trimmedValue.length < 2) {
          errorMessage = "Le prénom doit contenir au moins 2 caractères.";
          isValid = false;
        } else if (trimmedValue && !/^[a-zA-ZÀ-ÿ\s-]+$/.test(trimmedValue)) {
          errorMessage = "Le prénom ne doit contenir que des lettres.";
          isValid = false;
        }
        break;

      case "lastname":
        if (required && !trimmedValue) {
          errorMessage = "Le nom est obligatoire.";
          isValid = false;
        } else if (trimmedValue && trimmedValue.length < 2) {
          errorMessage = "Le nom doit contenir au moins 2 caractères.";
          isValid = false;
        } else if (trimmedValue && !/^[a-zA-ZÀ-ÿ\s-]+$/.test(trimmedValue)) {
          errorMessage = "Le nom ne doit contenir que des lettres.";
          isValid = false;
        }
        break;

      case "email":
        if (required && !trimmedValue) {
          errorMessage = "L'email est obligatoire.";
          isValid = false;
        } else if (trimmedValue && !this.isValidEmail(trimmedValue)) {
          errorMessage = "Veuillez saisir un email valide.";
          isValid = false;
        }
        break;

      case "phone":
        if (required && !trimmedValue) {
          errorMessage = "Le téléphone est obligatoire.";
          isValid = false;
        } else if (trimmedValue && !this.isValidPhone(trimmedValue)) {
          errorMessage = "Veuillez saisir un numéro de téléphone valide.";
          isValid = false;
        }
        break;

      case "company":
        if (required && !trimmedValue) {
          errorMessage = "La société est obligatoire.";
          isValid = false;
        } else if (trimmedValue && trimmedValue.length < 2) {
          errorMessage =
            "Le nom de la société doit contenir au moins 2 caractères.";
          isValid = false;
        }
        break;

      case "desk":
        if (required && !trimmedValue) {
          errorMessage = "Le nombre de postes est obligatoire.";
          isValid = false;
        } else if (
          trimmedValue &&
          (isNaN(trimmedValue) || parseInt(trimmedValue) < 1)
        ) {
          errorMessage =
            "Veuillez saisir un nombre de postes valide (minimum 1).";
          isValid = false;
        }
        break;

      case "origine_de_la_piste":
        if (required && !trimmedValue) {
          errorMessage = "Veuillez sélectionner comment vous avez connu Kwerk.";
          isValid = false;
        }
        break;
    }

    if (isValid) {
      this.clearFieldError(name);
    } else {
      this.showFieldError(name, errorMessage);
    }

    return isValid;
  }

  validateForm() {
    let isFormValid = true;
    const allFields = this.form.querySelectorAll("input, select, textarea");

    allFields.forEach((field) => {
      if (!this.validateField(field)) {
        isFormValid = false;
      }
    });

    return isFormValid;
  }

  showFieldError(fieldName, message) {
    this.errors[fieldName] = message;

    const field = this.form.querySelector(`[name="${fieldName}"]`);
    if (field) {
      const errorContainer =
        field.parentElement.querySelector(".error") ||
        field.parentElement.parentElement.querySelector(".error");

      if (errorContainer) {
        errorContainer.textContent = message;
        errorContainer.style.display = "block";
        field.classList.add("error-field");
      }
    }
  }

  clearFieldError(fieldName) {
    delete this.errors[fieldName];

    const field = this.form.querySelector(`[name="${fieldName}"]`);
    if (field) {
      const errorContainer =
        field.parentElement.querySelector(".error") ||
        field.parentElement.parentElement.querySelector(".error");

      if (errorContainer) {
        errorContainer.textContent = "";
        errorContainer.style.display = "none";
        field.classList.remove("error-field");
      }
    }
  }

  clearAllErrors() {
    this.errors = {};
    const errorContainers = this.form.querySelectorAll(".error");
    const errorFields = this.form.querySelectorAll(".error-field");

    errorContainers.forEach((container) => {
      container.textContent = "";
      container.style.display = "none";
    });

    errorFields.forEach((field) => {
      field.classList.remove("error-field");
    });
  }

  showSuccess(message = "Votre demande a été envoyée avec succès !") {
    const successContainer = this.form.querySelector("#successMessage");
    if (successContainer) {
      successContainer.textContent = message;
      successContainer.style.display = "block";

      setTimeout(() => {
        successContainer.style.display = "none";
      }, 5000);
    }
  }

  handleSubmit(e) {
    e.preventDefault();
    this.clearAllErrors();

    if (this.validateForm()) {
      this.submitForm();
    } else {
      this.scrollToFirstError();
    }
  }

  async submitForm() {
    const formData = new FormData(this.form);
    const submitButton = this.form.querySelector(".contact-submit");

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "ENVOI EN COURS...";
    }

    try {
      await this.simulateFormSubmission(formData);
      this.showSuccess();
      this.form.reset();
    } catch (error) {
      console.error("Erreur lors de l'envoi:", error);
      this.showFieldError(
        "general",
        "Une erreur est survenue lors de l'envoi. Veuillez réessayer."
      );
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "ENVOYER MA DEMANDE";
      }
    }
  }

  simulateFormSubmission(formData) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.1) {
          resolve("Succès");
        } else {
          reject(new Error("Erreur simulée"));
        }
      }, 1000);
    });
  }

  scrollToFirstError() {
    const firstErrorField = this.form.querySelector(".error-field");
    if (firstErrorField) {
      firstErrorField.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      firstErrorField.focus();
    }
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidPhone(phone) {
    const phoneRegex = /^(?:(?:\+33|0)[1-9])(?:[0-9]{8})$/;
    const cleanPhone = phone.replace(/[\s.-]/g, "");
    return phoneRegex.test(cleanPhone);
  }
}

// Initialiser le validateur du formulaire CONTACT
document.addEventListener("DOMContentLoaded", () => {
  new ContactFormValidator(".contact-form");
});
