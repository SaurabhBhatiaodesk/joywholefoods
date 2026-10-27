class CartRemoveButton extends HTMLElement {
  constructor() {
    super();

    this.addEventListener('click', (event) => {
      event.preventDefault();
      const cartItems = this.closest('cart-items') || this.closest('cart-drawer-items');
      cartItems.updateQuantity(this.dataset.index, 0);
    });
  }
}

customElements.define('cart-remove-button', CartRemoveButton);

class CartItems extends HTMLElement {
  constructor() {
    super();
    this.lineItemStatusElement =
      document.getElementById('shopping-cart-line-item-status') || document.getElementById('CartDrawer-LineItemStatus');

    this.quantityChanges = new Map();
    this.quantityWrites = new Set();
    this.quantityWriteFailed = false;
    this.addEventListener('change', (event) => {
      const input = event.target;
      if (!input.dataset.index || input.name !== 'updates[]') return;
      const index = input.dataset.index;
      const previous = this.quantityChanges.get(index);
      if (previous) clearTimeout(previous.timer);
      // Capture values before a different line's section response replaces this input.
      const change = { target: { dataset: { ...input.dataset }, value: input.value } };
      const pending = { run: () => {
        this.quantityChanges.delete(index);
        return this.onChange(change);
      } };
      pending.timer = setTimeout(pending.run, ON_CHANGE_DEBOUNCE_TIMER);
      this.quantityChanges.set(index, pending);
    });
    this.swapNoteSyncTimer = null;
    this.swapSyncInProgress = false;
    this.checkoutCleanupInProgress = false;
    this.checkoutSubmitting = false;
  }

  cartUpdateUnsubscriber = undefined;

  connectedCallback() {
    this.cartUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.cartUpdate, (event) => {
      if (event.source === 'cart-items') return;
      this.onCartUpdate();
    });

    this.bindCheckoutCleanup();
    this.triggerSwapNoteSync();
  }

  disconnectedCallback() {
    if (this.cartUpdateUnsubscriber) {
      this.cartUpdateUnsubscriber();
    }
  }

  onChange(event) {
    return this.updateQuantity(
      event.target.dataset.index,
      event.target.value,
      document.activeElement && document.activeElement.getAttribute('name'),
      event.target.dataset.quantityVariantId,
      event.target.dataset.cartLineKey
    );
  }

  async flushQuantityChanges() {
    for (const pending of [...this.quantityChanges.values()]) {
      clearTimeout(pending.timer);
      pending.run();
    }
    while (this.quantityWrites.size) await Promise.all([...this.quantityWrites]);
    if (this.quantityWriteFailed) throw new Error('A cart quantity could not be saved');
  }

  onCartUpdate() {
    if (this.tagName === 'CART-DRAWER-ITEMS') {
      fetch(`${routes.cart_url}?section_id=cart-drawer`)
        .then((response) => response.text())
        .then((responseText) => {
          const html = new DOMParser().parseFromString(responseText, 'text/html');
          const selectors = ['cart-drawer-items', '.cart-drawer__footer'];

          for (const selector of selectors) {
            const targetElement = document.querySelector(selector);
            const sourceElement = html.querySelector(selector);

            if (targetElement && sourceElement) {
              targetElement.replaceWith(sourceElement);
            }
          }

          this.bindCheckoutCleanup();
          this.triggerSwapNoteSync();
        })
        .catch((e) => {
          console.error(e);
        });
    } else {
      fetch(`${routes.cart_url}?section_id=main-cart-items`)
        .then((response) => response.text())
        .then((responseText) => {
          const html = new DOMParser().parseFromString(responseText, 'text/html');
          const sourceQty = html.querySelector('cart-items');
          this.innerHTML = sourceQty.innerHTML;

          this.bindCheckoutCleanup();
          this.triggerSwapNoteSync();
        })
        .catch((e) => {
          console.error(e);
        });
    }
  }

  getSectionsToRender() {
    return [
      {
        id: 'main-cart-items',
        section: document.getElementById('main-cart-items').dataset.id,
        selector: '.js-contents',
      },
      {
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
        selector: '.shopify-section',
      },
      {
        id: 'cart-live-region-text',
        section: 'cart-live-region-text',
        selector: '.shopify-section',
      },
      {
        id: 'main-cart-footer',
        section: document.getElementById('main-cart-footer').dataset.id,
        selector: '.js-contents',
      },
    ];
  }

  updateQuantity(line, quantity, name, variantId, lineKey) {
    if (this.quantityWrites.size === 0) this.quantityWriteFailed = false;
    this.enableLoading(line);

    const currentInput = document.getElementById(`Quantity-${line}`) || document.getElementById(`Drawer-quantity-${line}`);
    const key = lineKey || (currentInput && currentInput.dataset.cartLineKey);

    const body = JSON.stringify({
      ...(key ? { id: key } : { line }),
      quantity,
      sections: this.getSectionsToRender().map((section) => section.section),
      sections_url: window.location.pathname,
    });

    const write = fetch(`${routes.cart_change_url}`, { ...fetchConfig(), ...{ body } })
      .then((response) => response.text())
      .then((state) => {
        const parsedState = JSON.parse(state);
        const quantityElement =
          document.getElementById(`Quantity-${line}`) || document.getElementById(`Drawer-quantity-${line}`);
        const items = document.querySelectorAll('.cart-item');

        if (parsedState.errors) {
          this.quantityWriteFailed = true;
          if (quantityElement) quantityElement.value = quantityElement.getAttribute('value');
          this.updateLiveRegions(line, parsedState.errors);
          return;
        }

        this.classList.toggle('is-empty', parsedState.item_count === 0);
        const cartDrawerWrapper = document.querySelector('cart-drawer');
        const cartFooter = document.getElementById('main-cart-footer');

        if (cartFooter) cartFooter.classList.toggle('is-empty', parsedState.item_count === 0);
        if (cartDrawerWrapper) cartDrawerWrapper.classList.toggle('is-empty', parsedState.item_count === 0);

        this.getSectionsToRender().forEach((section) => {
          const elementToReplace =
            document.getElementById(section.id).querySelector(section.selector) || document.getElementById(section.id);
          elementToReplace.innerHTML = this.getSectionInnerHTML(
            parsedState.sections[section.section],
            section.selector
          );
        });

        const updatedValue = parsedState.items[line - 1] ? parsedState.items[line - 1].quantity : undefined;
        let message = '';

        if (quantityElement && items.length === parsedState.items.length && updatedValue !== parseInt(quantityElement.value)) {
          if (typeof updatedValue === 'undefined') {
            message = window.cartStrings.error;
          } else {
            message = window.cartStrings.quantityError.replace('[quantity]', updatedValue);
          }
        }

        this.updateLiveRegions(line, message);

        const lineItem =
          document.getElementById(`CartItem-${line}`) || document.getElementById(`CartDrawer-Item-${line}`);

        if (lineItem && lineItem.querySelector(`[name="${name}"]`)) {
          cartDrawerWrapper
            ? trapFocus(cartDrawerWrapper, lineItem.querySelector(`[name="${name}"]`))
            : lineItem.querySelector(`[name="${name}"]`).focus();
        } else if (parsedState.item_count === 0 && cartDrawerWrapper) {
          trapFocus(cartDrawerWrapper.querySelector('.drawer__inner-empty'), cartDrawerWrapper.querySelector('a'));
        } else if (document.querySelector('.cart-item') && cartDrawerWrapper) {
          trapFocus(cartDrawerWrapper, document.querySelector('.cart-item__name'));
        }

        publish(PUB_SUB_EVENTS.cartUpdate, { source: 'cart-items', cartData: parsedState, variantId: variantId });
        this.triggerSwapNoteSync();
      })
      .catch(() => {
        this.quantityWriteFailed = true;
        this.querySelectorAll('.loading-overlay').forEach((overlay) => overlay.classList.add('hidden'));
        const errors = document.getElementById('cart-errors') || document.getElementById('CartDrawer-CartErrors');
        if (errors) errors.textContent = window.cartStrings.error;
      })
      .finally(() => {
        this.disableLoading(line);
        this.quantityWrites.delete(write);
      });
    this.quantityWrites.add(write);
    return write;
  }

  updateLiveRegions(line, message) {
    const lineItemError =
      document.getElementById(`Line-item-error-${line}`) || document.getElementById(`CartDrawer-LineItemError-${line}`);

    if (lineItemError) lineItemError.querySelector('.cart-item__error-text').innerHTML = message;

    this.lineItemStatusElement.setAttribute('aria-hidden', true);

    const cartStatus =
      document.getElementById('cart-live-region-text') || document.getElementById('CartDrawer-LiveRegionText');

    cartStatus.setAttribute('aria-hidden', false);

    setTimeout(() => {
      cartStatus.setAttribute('aria-hidden', true);
    }, 1000);
  }

  getSectionInnerHTML(html, selector) {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector).innerHTML;
  }

  enableLoading(line) {
    const mainCartItems = document.getElementById('main-cart-items') || document.getElementById('CartDrawer-CartItems');
    mainCartItems.classList.add('cart__items--disabled');

    const cartItemElements = this.querySelectorAll(`#CartItem-${line} .loading-overlay`);
    const cartDrawerItemElements = this.querySelectorAll(`#CartDrawer-Item-${line} .loading-overlay`);

    [...cartItemElements, ...cartDrawerItemElements].forEach((overlay) => overlay.classList.remove('hidden'));

    document.activeElement.blur();
    this.lineItemStatusElement.setAttribute('aria-hidden', false);
  }

  disableLoading(line) {
    const mainCartItems = document.getElementById('main-cart-items') || document.getElementById('CartDrawer-CartItems');
    mainCartItems.classList.remove('cart__items--disabled');

    const cartItemElements = this.querySelectorAll(`#CartItem-${line} .loading-overlay`);
    const cartDrawerItemElements = this.querySelectorAll(`#CartDrawer-Item-${line} .loading-overlay`);

    cartItemElements.forEach((overlay) => overlay.classList.add('hidden'));
    cartDrawerItemElements.forEach((overlay) => overlay.classList.add('hidden'));
  }

  cleanCartAttributes(response) {
    var cleanedAttributes = {};
    const items = response.items;
    var excludeSearch = [
      'cart_type',
      'Checkout-Method',
      'Pickup-Location-Id',
      'Pickup-Location-Company',
      'Pickup-Location-Address-Line-1',
      'Pickup-Location-Address-Line-2',
      'Pickup-Location-City',
      'Pickup-Location-Region',
      'Pickup-Location-Postal-Code',
      'Pickup-Location-Country',
      'Pickup-Date',
      'Pickup-Time',
      'Delivery-Location-Id',
      'Delivery-Date',
      'Delivery-Time',
      'Delivery-Slot-Id',
      'Shipping-Date',
      'Custom-Attribute-2',
      'Custom-Attribute-3'
    ];

    if (response.item_count != 0) {
      items.forEach((item) => {
        let grouping = item.properties._grouping;
        excludeSearch.push(grouping);
      });
    }

    for (const [key, value] of Object.entries(response.attributes)) {
      var exlcuded = false;
      excludeSearch.forEach((item) => {
        if (key.includes(item)) {
          exlcuded = true;
        }
      });

      if (exlcuded) {
        cleanedAttributes[key] = value;
      } else {
        cleanedAttributes[key] = null;
      }
    }

    cleanedAttributes['Custom-Attribute-1'] = null;

    $.post(window.Shopify.routes.root + 'cart/update.js', { attributes: cleanedAttributes });
  }

  async syncSwapItemsToCartNote() {
    if (this.swapSyncInProgress) return;
    this.swapSyncInProgress = true;

    try {
      const response = await fetch('/cart.js', {
        headers: { Accept: 'application/json' },
      });
      const cart = await response.json();

      const swapLines = [];

      (cart.items || []).forEach((item) => {
        if (!item.properties) return;

        const publicSwap = item.properties['Swap Item'];
        const privateSwap = item.properties['_Swap Item'];
        const swapValue = privateSwap || publicSwap;

        if (swapValue && String(swapValue).trim() !== '') {
          swapLines.push(`Swap Item: ${String(swapValue).trim()}`);
        }
      });

      const noteInput = document.getElementById('Cart-note') || document.getElementById('CartDrawer-Note');
      const existingNote = (noteInput ? noteInput.value : cart.note || '').trim();

      const preservedLines = existingNote
        ? existingNote
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line !== '' && !line.toLowerCase().startsWith('swap item:'))
        : [];

      const finalLines = [...preservedLines, ...swapLines];
      const finalNote = finalLines.join('\n').trim();

      if (existingNote !== finalNote) {
        await fetch(`${routes.cart_update_url}.js`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ note: finalNote }),
        });
      }
    } catch (error) {
      console.error('Failed to sync swap items to cart note:', error);
    } finally {
      this.swapSyncInProgress = false;
    }
  }

  async cleanupSwapPropertiesBeforeCheckout() {
    if (this.checkoutCleanupPromise) return this.checkoutCleanupPromise;
    this.checkoutCleanupPromise = this.performCheckoutCleanup();
    try {
      return await this.checkoutCleanupPromise;
    } finally {
      this.checkoutCleanupPromise = null;
    }
  }

  async performCheckoutCleanup() {
    this.checkoutCleanupInProgress = true;

    try {
      await this.flushQuantityChanges();
      const response = await fetch('/cart.js', {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error('Unable to read cart before checkout');
      const cart = await response.json();

      const swapLines = [];
      const updatePromises = [];

      (cart.items || []).forEach((item) => {
        if (!item.properties) return;

        const publicSwap = item.properties['Swap Item'];
        const privateSwap = item.properties['_Swap Item'];
        const swapValue = privateSwap || publicSwap;

        if (swapValue && String(swapValue).trim() !== '') {
          swapLines.push(`Swap Item: ${String(swapValue).trim()}`);
        }

        if (privateSwap) {
          const updatedProperties = { ...item.properties };
          delete updatedProperties['_Swap Item'];

          // Shopify rejects replacing existing properties with an empty object.
          // Keep a sole private swap property; it remains on the order and its
          // readable value is also copied to the order note below.
          if (Object.keys(updatedProperties).length === 0) return;

          updatePromises.push(
            fetch(`${routes.cart_change_url}.js`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
              },
              body: JSON.stringify({
                id: item.key,
                properties: updatedProperties,
              }),
            }).then((result) => {
              if (!result.ok) throw new Error('Unable to save box swaps');
              return result;
            })
          );
        }
      });

      if (updatePromises.length) {
        await Promise.all(updatePromises);
      }

      const noteInput = document.getElementById('Cart-note') || document.getElementById('CartDrawer-Note');
      const existingNote = (noteInput ? noteInput.value : cart.note || '').trim();

      const preservedLines = existingNote
        ? existingNote
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line !== '' && !line.toLowerCase().startsWith('swap item:'))
        : [];

      const finalLines = [...preservedLines, ...swapLines];
      const finalNote = finalLines.join('\n').trim();

      const noteResponse = await fetch(`${routes.cart_update_url}.js`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ note: finalNote }),
      });
      if (!noteResponse.ok) throw new Error('Unable to save cart instructions');

      return true;
    } catch (error) {
      console.error('Failed to cleanup swap properties before checkout:', error);
      return false;
    } finally {
      this.checkoutCleanupInProgress = false;
    }
  }

  bindCheckoutCleanup() {
    if (document.body.dataset.swapCheckoutBound === 'true') return;
    document.body.dataset.swapCheckoutBound = 'true';

    let submitResetTimer = null;
    const resetCheckoutSubmitting = () => {
      clearTimeout(submitResetTimer);
      this.checkoutSubmitting = false;
    };

    // Coming back from checkout with the Back button can restore this page from the
    // back/forward cache with checkoutSubmitting still true, so reset it.
    window.addEventListener('pageshow', () => {
      resetCheckoutSubmitting();
      document.querySelectorAll('input[data-cart-checkout-fallback]').forEach((input) => input.remove());
    });

    document.addEventListener('click', async (event) => {
      const checkoutTrigger = event.target.closest(
        'button[name="checkout"], input[name="checkout"], a[href="/checkout"], button[data-checkout], .cart__checkout-button'
      );

      if (!checkoutTrigger) return;

      event.preventDefault();
      event.stopPropagation();

      // Ignore repeated taps while checkout is already being prepared / submitted.
      if (this.checkoutSubmitting) return;
      this.checkoutSubmitting = true;

      // Safety net: if the submit is blocked for any reason and the page doesn't navigate,
      // let the customer try again instead of leaving the button dead.
      const cleaned = await this.cleanupSwapPropertiesBeforeCheckout();

      if (!cleaned) {
        resetCheckoutSubmitting();
        window.alert('Your cart changes could not be saved. Please check your cart and try again.');
        return;
      }

      // Only release the tap guard after cleanup finishes, never during a slow save.
      clearTimeout(submitResetTimer);
      submitResetTimer = setTimeout(resetCheckoutSubmitting, 5000);

      const linkedFormId = checkoutTrigger.getAttribute('form');
      const cartForm =
        checkoutTrigger.form ||
        (linkedFormId ? document.getElementById(linkedFormId) : null) ||
        checkoutTrigger.closest('form') ||
        document.querySelector('form[action^="/cart"]');

      if (!cartForm) {
        console.error('Cart form could not be found.');
        resetCheckoutSubmitting();
        return;
      }

      let submitButton = cartForm.querySelector(
        'button[name="checkout"], input[name="checkout"]'
      );

      if (!submitButton) {
        submitButton = document.createElement('button');
        submitButton.type = 'submit';
        submitButton.name = 'checkout';
        submitButton.value = 'checkout';
        submitButton.hidden = true;
        cartForm.appendChild(submitButton);
      }

      if (typeof cartForm.requestSubmit === 'function') {
        cartForm.requestSubmit(submitButton);
        return;
      }

      // Safari before iOS 16 has no requestSubmit(). form.submit() skips validation and
      // doesn't send the clicked button, so validate first and add the checkout field by hand.
      if (typeof cartForm.reportValidity === 'function' && !cartForm.reportValidity()) {
        resetCheckoutSubmitting();
        return;
      }

      let checkoutField = cartForm.querySelector('input[data-cart-checkout-fallback]');
      if (!checkoutField) {
        checkoutField = document.createElement('input');
        checkoutField.type = 'hidden';
        checkoutField.name = 'checkout';
        checkoutField.dataset.cartCheckoutFallback = '';
        cartForm.appendChild(checkoutField);
      }
      checkoutField.value = submitButton.value || 'checkout';

      cartForm.submit();
    }, true);
  }

  triggerSwapNoteSync() {
    clearTimeout(this.swapNoteSyncTimer);
    this.swapNoteSyncTimer = setTimeout(() => {
      this.syncSwapItemsToCartNote();
    }, 300);
  }
}

customElements.define('cart-items', CartItems);

if (!customElements.get('cart-note')) {
  customElements.define(
    'cart-note',
    class CartNote extends HTMLElement {
      constructor() {
        super();

        this.addEventListener(
          'change',
          debounce((event) => {
            const body = JSON.stringify({ note: event.target.value });
            fetch(`${routes.cart_update_url}`, { ...fetchConfig(), ...{ body } });
          }, ON_CHANGE_DEBOUNCE_TIMER)
        );
      }
    }
  );
}
