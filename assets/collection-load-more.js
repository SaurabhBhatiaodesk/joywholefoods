var products_on_page = $('.products-on-page');
var next_url = products_on_page.data('next-url');

var load_more_btn = $('.load-more_btn ');
var load_more_spinner = $('.load-more_spinner');

function loadMoreProducts() {
  $.ajax(
    {
      url: next_url,
      type: 'GET',
      dataType: 'html',
      beforeSend: function(){
      	load_more_btn.hide();
        load_more_spinner.show();
      }

    }
  ).done(function(next_page){
	
    load_more_spinner.hide();
    
    var new_products = $(next_page).find('.products-on-page');
    var new_url = new_products.data('next-url');
    
    if(new_url)
      load_more_btn.show();

    next_url = new_url;
    products_on_page.append(new_products.html());

  })

}