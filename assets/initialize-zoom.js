$(document).ready(function(){
  $('.product__media img')
    .wrap('<span style="display:inline-block"></span>')
    .css('display', 'block')
    .parent()
    .zoom({ magnify: 1.5 });
});