if (!customElements.get('product-form')) {
  customElements.define(
    'product-form',
    class ProductForm extends HTMLElement {
      constructor() {
        super();

        this.form = this.querySelector('form');
        const variantInput = this.form.querySelector('[name=id]');
        if (variantInput) variantInput.disabled = false;
        this.form.addEventListener('submit', this.onSubmitHandler.bind(this));
        this.cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
        this.submitButton = this.querySelector('[type="submit"]');

        if (document.querySelector('cart-drawer') && this.submitButton) this.submitButton.setAttribute('aria-haspopup', 'dialog');

        this.hideErrors = this.dataset.hideErrors === 'true';
      }

      onSubmitHandler(evt) {
        evt.preventDefault();
         const form = evt.target;
        const productId = form.getAttribute('prdid');
        let currentUrl = window.location.href;
        
        if (currentUrl.includes("collections")) {
        // Check if URL already has parameters
        const separator = currentUrl.includes("?") ? "&" : "?";
        const newUrl = currentUrl + `${separator}prdId=${productId}`;
        
        // Update the URL in the browser without reloading the page
        window.history.pushState({}, "", newUrl);
        }
        
        if (this.submitButton && this.submitButton.getAttribute('aria-disabled') === 'true') return;

        const variantInput = this.form.querySelector('[name="id"]');
        const collectionVariantSelect = this.form.querySelector('[data-product-card-variant-select]');
        if (collectionVariantSelect && variantInput && !variantInput.value) {
          collectionVariantSelect.focus();
          const card = this.closest('.card-wrapper-os') || this.closest('.grid__item');
          const message = card ? card.querySelector('.joy-variant-required-message') : null;
          if (message) message.classList.add('is-visible');
          return;
        }

        const parentContainers = document.querySelectorAll('.parent_dietary');
        let templateValue = document.getElementById('check_template');
        if(templateValue){
          var value_template = templateValue.value
        }
        const formData = new FormData(this.form);

    // Retrieve the value of the hidden input field
        if(value_template){
         
          let isEmpty = false;

          parentContainers.forEach((container, index) => {
            const inputFields = container.querySelectorAll('input.input_dietary');
          
            const selectFields = container.querySelectorAll('select.input_dietary');
            const textareaFields = container.querySelectorAll('textarea.input_dietary');

        
            inputFields.forEach(inputField => {
              const inputValue = inputField.value.trim();
             
    
              inputField.addEventListener('change', (event) => {
                if (event.target.classList.contains('input_dietary')) {
                  // Find the next sibling element with the class 'error__message'
                  var errorMessage = event.target.nextElementSibling;
        
                  // Add the 'hidden' class to hide the error message
                  errorMessage.classList.add('hidden');
                }
              });
        
              switch(inputField.id) {
                case "your-name":
                    formData.append(`properties[Name ${index + 1}]`, inputValue);
                    break;
                case "email_dietary":
                    formData.append(`properties[Email ${index + 1}]`, inputValue);
                    break;
                case "phone_dietary":
                    formData.append(`properties[Phone number ${index + 1}]`, inputValue);
                    break;
                default:
                    // Default case if none of the conditions match
                    break;
              }
              
              

              if (inputValue === '') {

                // If it's empty, set isEmpty to true and display the error message
                isEmpty = true;
                const errorMessages = document.querySelectorAll('#container_dietary .error__message')
                // Iterate over each error message element
                errorMessages.forEach(errorMessage => {
                    // Remove the "hidden" class from each error message element
                    errorMessage.classList.remove('hidden');
                });

              } else {
             
               if( inputField.nextElementSibling ) {
                 inputField.nextElementSibling.classList.add('hiddensss');;
             
                 
               }

              }
        
            });
           

            selectFields.forEach(selectField => {
              selectField.addEventListener('change', (event) => {
                  const errorMessage = event.target.nextElementSibling;
                  errorMessage.classList.add('hidden');
              });
  
              const selectValue = selectField.value.trim();
              if(selectValue !== "other" || selectValue !== "No Dietary" ) {
                formData.append(`properties[Dietary ${index + 1}]`, selectValue);
              }
           


              if (selectValue === '') {
                  isEmpty = true;
                  const errorMessages = container.querySelectorAll('.error__messages');
                  errorMessages.forEach(errorMessage => {
                      errorMessage.classList.remove('hidden');
                  });
              } else {
                  const errorMessage = container.querySelector('.error__messages');
                  errorMessage.classList.add('hidden');
              }
          });
        
          textareaFields.forEach(textareaField => {
            const textareaValue = textareaField.value.trim()
            console.log(textareaValue)
            if(textareaValue){
              formData.append(`properties[Dietary ${index + 1}]`, textareaValue);
            }
         
            if (!textareaField.classList.contains('hidden') && textareaField.value.trim() === '') {
              
             
              const errorMessagesText = container.querySelectorAll('.error__messagetext')
              // Iterate over each error message element
              errorMessagesText.forEach(errorMessagetext => {
                  // Remove the "hidden" class from each error message element
                  errorMessagetext.classList.remove('hidden');
              });
            }else {
              const errorMessage = container.querySelector('.error__messagetext');
              errorMessage.classList.add('hidden');
            }
          })

          
          
          });
        
        
          if (isEmpty) {
            return;
        }
         
        }

      
        this.handleErrorMessage();
      
        if (this.submitButton) {
          this.submitButton.setAttribute('aria-disabled', true);
          this.submitButton.classList.add('loading');
        }
        this.querySelector('.loading-overlay__spinner')?.classList.remove('hidden');

        let stickybutton = document.querySelector('.sticky-bar #sticky_button');
        if(stickybutton){
          stickybutton.classList.add('loading')
          document.querySelector('.sticky-bar .loading-overlay__spinner').classList.remove('hidden');
        }
       
        const config = fetchConfig('javascript');
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        delete config.headers['Content-Type'];


        if (this.cart) {
          formData.append(
            'sections',
            this.cart.getSectionsToRender().map((section) => section.id)
          );
          formData.append('sections_url', window.location.pathname);

       

          this.cart.setActiveElement(document.activeElement);
        }
        config.body = formData;

        fetch(`${routes.cart_add_url}`, config)
          .then((response) => response.json())
          .then((response) => {
            
            /* custom upsell page */
            if(window.routes.upsellPage && response.url.includes('selling_plan='))
            { 
              if(window.location.pathname != window.routes.upsellPage)
              window.location = window.routes.upsellPage;  
            
              
              return;
            }
            /* end custom upsell */
 
            
            if (response.status) {
              publish(PUB_SUB_EVENTS.cartError, {
                source: 'product-form',
                productVariantId: formData.get('id'),
                errors: response.errors || response.description,
                message: response.message,
              });
              this.handleErrorMessage(response.description);
 
              
              const soldOutMessage = this.submitButton ? this.submitButton.querySelector('.sold-out-message') : null;
              if (!soldOutMessage) return;
              this.submitButton.setAttribute('aria-disabled', true);
              this.submitButton.querySelector('span').classList.add('hidden');
            
              soldOutMessage.classList.remove('hidden');
              this.error = true;
              return;
            } else if (!this.cart) {
              window.location = window.routes.cart_url;
              return;
            }

            if (!this.error)
              publish(PUB_SUB_EVENTS.cartUpdate, { source: 'product-form', productVariantId: formData.get('id'), cartData: response });
            this.error = false;
            const quickAddModal = this.closest('quick-add-modal');
            if (quickAddModal) {
              document.body.addEventListener(
                'modalClosed',
                () => {
                  setTimeout(() => {
                    this.cart.renderContents(response);
                  });
                },
                { once: true }
              );
              quickAddModal.hide(true);
            } else {
              this.cart.renderContents(response);
            }


            
          })
          .catch((e) => {
            console.error(e);
          })
          .finally(() => {  
            if (this.submitButton) this.submitButton.classList.remove('loading');
            if (this.cart && this.cart.classList.contains('is-empty')) this.cart.classList.remove('is-empty');
            if (!this.error && this.submitButton) this.submitButton.removeAttribute('aria-disabled');
            this.querySelector('.loading-overlay__spinner').classList.add('hidden');
       
            let stickybutton = document.querySelector('.sticky-bar #sticky_button');
            if(stickybutton){
              stickybutton.classList.remove('loading')
              document.querySelector('.sticky-bar .loading-overlay__spinner').classList.add('hidden');
            }
            $("#container_dietary").load(location.href + " #container_dietary");


            /* custom fix to show added to cart for subscription items */
              var itemSelector = $(this).attr('data-notification');
               if(itemSelector)
               {
                 var notificationArea = $('.custom-notification-wrapper[notification-id="'+itemSelector+'"]');
                 if(notificationArea)notificationArea.addClass('active');
               }
            /* fix end */
            
          });
      }

      handleErrorMessage(errorMessage = false) {
        if (this.hideErrors) return;

        this.errorMessageWrapper =
          this.errorMessageWrapper || this.querySelector('.product-form__error-message-wrapper');
        if (!this.errorMessageWrapper) return;
        this.errorMessage = this.errorMessage || this.errorMessageWrapper.querySelector('.product-form__error-message');

        this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);

        if (errorMessage) {
          this.errorMessage.textContent = errorMessage;
        }
      }
    }
  );
}