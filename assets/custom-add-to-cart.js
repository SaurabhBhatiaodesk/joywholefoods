document.addEventListener('DOMContentLoaded', () => {
  initCustomAddToCart();
  initVariantSync();
});

document.addEventListener('shopify:section:load', () => {
  initCustomAddToCart();
  initVariantSync();
});

function initVariantSync() {
  const forms = document.querySelectorAll('.custom-add-to-cart-form');

  forms.forEach((form) => {
    if (form.dataset.variantSyncInitialized === 'true') return;
    form.dataset.variantSyncInitialized = 'true';

    const variantInput = form.querySelector('.product-variant-id');
    const productContainer =
      form.closest('[data-product-json]') ||
      document.querySelector('[data-product-json]');

    const variantSelectors = document.querySelectorAll(
      'select[name="id"], input[name="id"], variant-selects select, variant-radios input[type="radio"]'
    );

    variantSelectors.forEach((selector) => {
      selector.addEventListener('change', () => {
        setTimeout(() => {
          const selectedVariantId = getSelectedVariantId();
          if (selectedVariantId && variantInput) {
            variantInput.value = selectedVariantId;
          }
        }, 50);
      });
    });

    const selectedVariantId = getSelectedVariantId();
    if (selectedVariantId && variantInput) {
      variantInput.value = selectedVariantId;
    }
  });
}

function getSelectedVariantId() {
  const checkedRadio = document.querySelector('input[name="id"]:checked');
  if (checkedRadio && checkedRadio.value) return checkedRadio.value;

  const variantSelect = document.querySelector('select[name="id"]');
  if (variantSelect && variantSelect.value) return variantSelect.value;

  const hiddenVariantInput = document.querySelector(
    'form.custom-add-to-cart-form .product-variant-id'
  );
  if (hiddenVariantInput && hiddenVariantInput.value) return hiddenVariantInput.value;

  const urlParams = new URLSearchParams(window.location.search);
  const variantFromUrl = urlParams.get('variant');
  if (variantFromUrl) return variantFromUrl;

  return null;
}

function initCustomAddToCart() {
  const forms = document.querySelectorAll('.custom-add-to-cart-form');

  forms.forEach((form) => {
    if (form.dataset.atcInitialized === 'true') return;
    form.dataset.atcInitialized = 'true';

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitButton = form.querySelector('button[type="submit"]');
      const spinner = form.querySelector('.loading-overlay__spinner');
      const errorWrapper = form
        .closest('.custom-product-form-wrapper')
        ?.querySelector('.product-form__error-message-wrapper');
      const errorMessage = errorWrapper?.querySelector('.product-form__error-message');
      const variantInput = form.querySelector('.product-variant-id');

      if (errorWrapper) errorWrapper.hidden = true;
      if (errorMessage) errorMessage.textContent = '';

      const selectedVariantId = getSelectedVariantId();
      if (selectedVariantId && variantInput) {
        variantInput.value = selectedVariantId;
      }

      if (!variantInput || !variantInput.value) {
        showError(errorWrapper, errorMessage, 'Please select a product variant.');
        return;
      }

      const formData = new FormData(form);

      submitButton?.setAttribute('disabled', 'disabled');
      spinner?.classList.remove('hidden');

      try {
        const response = await fetch('/cart/add.js', {
          method: 'POST',
          headers: {
            Accept: 'application/json'
          },
          body: formData
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.description || data.message || 'Add to cart failed.');
        }

        document.dispatchEvent(
          new CustomEvent('cart:item-added', {
            detail: data
          })
        );

        const cartDrawer = document.querySelector('cart-drawer');
        const cartNotification = document.querySelector('cart-notification');

        if (cartDrawer && typeof cartDrawer.renderContents === 'function') {
          const cartResponse = await fetch('/cart.js');
          const cartData = await cartResponse.json();
          cartDrawer.renderContents({ sections: cartData });
          cartDrawer.classList.add('active');
        } else if (cartNotification && typeof cartNotification.renderContents === 'function') {
          cartNotification.renderContents(data);
        } else {
          window.location.href = '/cart';
        }
      } catch (error) {
        showError(
          errorWrapper,
          errorMessage,
          error.message || 'Something went wrong while adding to cart.'
        );
      } finally {
        submitButton?.removeAttribute('disabled');
        spinner?.classList.add('hidden');
      }
    });
  });
}

function showError(wrapper, messageEl, message) {
  if (messageEl) {
    messageEl.textContent = message;
  }
  if (wrapper) {
    wrapper.hidden = false;
  } else {
    alert(message);
  }
}