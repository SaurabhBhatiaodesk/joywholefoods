var boxCart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');

$('.customize-box__count .items--selected').text(selectedCount());

function isMaxSelected(){
  var selectedCount = 0;
  $('.customize-box__product_card.selected').each(function(){
      selectedCount += parseInt($(this).find('.quantity__input').val());
  });
  return !(selectedCount < custom_boxes_max_items);
}
function selectedCount(){
  var selectedCount = 0;
  $('.customize-box__product_card.selected').each(function(){
      selectedCount += parseInt($(this).find('.quantity__input').val());
  });
  return selectedCount;
}
function disableAllPlusButton(){
  $('.quantity__button[name="plus"]').addClass('disabled');
  $('.quantity__button[name="plus"]').attr('disabled',true);
}
function enableAllPlusButton(){
  $('.quantity__button[name="plus"]').removeClass('disabled');
  $('.quantity__button[name="plus"]').removeAttr('disabled');
}
function enableAddToCart(){
  $('.product-form__submit').removeClass('disabled');
}
function disableAddToCart(){
   $('.product-form__submit').addClass('disabled');
}
function showAddItemsError(){
  $('.error-message.message--add-items').addClass('active');
}
function hideAddItemsError(){
  $('.error-message.message--add-items').removeClass('active');
}
function removeAllSelected(){
  $('.customize-box__product_card').each(function(){
    $(this).removeClass('selected');
    $(this).find('.quantity__input').val(0);
    $(this).find('.quantity__input').trigger('change');
  });
}


$('.customize-box__product_card').on('click',function(e){
  if($(this).hasClass('selected')){
    return;
  }
  if(e.target.classList.contains('quantity__button')){
    return;
  }
 
  if(!isMaxSelected()){
    $(this).addClass('selected');
    $(this).find('.quantity__input').val(1);
    $(this).find('.quantity__button[name=minus]').removeClass('disabled');
    $(this).find('.quantity__input').trigger('change');
  }
});

$(".quantity__input").change(function(){
  var p_id = $(this).attr('data-product-id');
  var quantity = $(this).val();
  $(`.customize-box__product_card[data-product-id="${p_id}"]`).attr('data-qty', quantity);
 
  //If 0 remove selected
  if( quantity == 0 ){
    $(`.customize-box__product_card[data-product-id="${p_id}"]`).removeClass('selected');
  }

  
  if(isMaxSelected()){
    disableAllPlusButton();
    enableAddToCart();
    hideAddItemsError();
  }
  else{
    enableAllPlusButton();
    disableAddToCart();
  }

  $('.customize-box__count .items--selected').text(selectedCount());


});

$('.customize-box__reset').on('click',function(){
  removeAllSelected();
});

$('form[action="/cart/add"]').submit(function(e){
	// Stop the form submitting

  	e.preventDefault();
    e.stopPropagation();
    const submittedForm = e.currentTarget;
    if (submittedForm.dataset.joyBoxSubmitting === 'true') return;
    // cleanCartAttributes();
  
    if(!isMaxSelected()){
       // console.log('Please add contents to box to continue');
       showAddItemsError();
       return;
    }
  
    submittedForm.dataset.joyBoxSubmitting = 'true';
    var submitButton = $(submittedForm).find('[type="submit"]');
    var loadingSpinner = $(submittedForm).find('.loading-overlay__spinner');
    submitButton.attr('aria-disabled', true);
    submitButton.addClass('loading');
    loadingSpinner.removeClass('hidden');

  
    let addToCartForm = submittedForm;
    let formData = new FormData(addToCartForm);
    

    if (boxCart) {
      formData.append(
        'sections',
        boxCart.getSectionsToRender().map((section) => section.id)
      );
      formData.append('sections_url', window.location.pathname);
      boxCart.setActiveElement(document.activeElement);
    }
    // formData.append('properties','asd');

    var box_content = [];
    var box_content_items = [];
    var iterations = 1;
    var prop_string = "";
  
    $('.customize-box__product_card.selected').each(function(){
      var id = $(this).attr('data-product-id');
      var name = $(this).attr('data-product-title');
      var qty = $(this).attr('data-qty');
      
      var json = '{"id":' + id + ',"title":"' + name + '","qty":' + qty + '}';

      box_content.push(json);

      qty = parseInt(qty);
      for (let j = 0; j < qty; j++) {
          const key = 'Item ' + (iterations)
          box_content_items.push(id);
          // console.log($(this).is('[data-frozen="TRUE"]'));
          prop_string += key + ': ' + name + ($(this).is('[data-frozen="TRUE"]') ? '(frozen)' : '') + '{' + id + '}; ';
          iterations++;
      }
      
    });
  
    // console.log(!!frozenSelected().length);
    // console.log(prop_string);
    // console.log(selectedProducts());
  
    selectedProducts().forEach(function(item,index){
      // formData.set(`properties[_box_content][${index}][title]`, item.title );
      // formData.set(`properties[_box_content][${index}][id]`, item.id );
      // formData.set(`properties[_box_content][${index}][qty]`, item.qty );
         formData.set(`properties[${item.title}]`, item.qty ); 
    });
  
    const group_id = (Math.floor(Math.random() * (9999999 - 1000000 + 1) + 1000000)).toString();
  
    
    // formData.set('properties[_grouping]', group_id);
    formData.set('properties[_Frozen]', !!frozenSelected().length);
  
    // formData.set('attributes['+$('[data-main-variant-handle]').data('main-variant-handle') + '{' + group_id + '}.json'+']', JSON.stringify(selectedProducts()));
    // formData.set('attributes['+$('[data-main-product-title]').data('main-product-title') + '{' + group_id + '}'+']', prop_string.replace(/;\s+$/g, ''));
    // formData.set('attributes[cart_type]', "shop_add");
    // formData.set('attributes[Pickup-Location-Id]', "testID");
  
    fetch(window.Shopify.routes.root + 'cart/add.js', {
      method: 'POST',
      body: formData
    })
    .then(response => {
      return response.json().then(data => {
        if (!response.ok || data.status) {
          throw new Error(data.description || data.message || 'Unable to add this box. Please try again.');
        }
        return data;
      });
    })
    .then((response) => {
      // console.log(response);
      if (boxCart) {
        try {
          boxCart.renderContents(response);
          boxCart.classList.remove("is-empty");
        } catch (error) {
          // The add succeeded. Do not invite a duplicate add if section rendering fails.
          window.location.assign(window.Shopify.routes.root + 'cart');
        }
      } else {
        window.location.assign(window.Shopify.routes.root + 'cart');
      }
    })
    .catch((error) => {
      console.error('Error:', error);
      window.alert(error.message || 'Unable to confirm this add. Please check your cart before trying again.');
    })
    .finally(() => {
      submittedForm.dataset.joyBoxSubmitting = 'false';
      submitButton.attr('aria-disabled', false);
      submitButton.removeClass('loading');
      loadingSpinner.addClass('hidden');
    });

});

function selectedProducts(){
  return $('.customize-box__product_card.selected').map((function (i, item) {
      return {
          id: $(item).data('product-id'),
          title: $(item).data('product-title'),
          qty: $(item).data('qty'),
          index: i,
          // product: products[$(item).data('product-id')]
      };
  })).get();
}
function frozenSelected(){
    return $('.customize-box__product_card.selected').filter('[data-frozen="TRUE"]');
}
function cleanCartAttributes(){
  $.ajax({
      type: "GET",
      url: '/cart.js',
      dataType: 'json',
      success: function(resp) { 
          var nullHash = {};
          for ([key, value] of Object.entries(resp.attributes)) {    
              nullHash[key] = null;
          }
          $.ajax({
              type: "POST",
              url: '/cart/update.js',
              data: {attributes:nullHash},
              dataType: 'json'
          });
      }
  });
}
