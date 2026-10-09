$(function(){

    var $description = $('.product__description');
    var $arrow = $('.view-arrow');
    var $button = $('#viewMoreButton');
    var isExpanded = false;
    var $descHeight = $('.product__description').height();
    function updateViewMoreButton() {
      if ( $description.length > 0 ) {
         if ($description[0].scrollHeight > $description.innerHeight()) {
          $button.text(isExpanded ? 'Read less' : 'Read more').show();
        } 
      }
    }
    
    updateViewMoreButton();
    
    $button.on('click', function() {
      isExpanded = !isExpanded;
      if (isExpanded) {
        $button.text(isExpanded ? 'Read less' : 'Read more').show();
        
      $description.css('-webkit-line-clamp', 'none');
      $description.css('display', 'block');
      $arrow.css('transform', 'rotate(180deg)');
      $descHeight = $('.product__description').height();
      } else {
        $description.css('display', ' -webkit-box');
          
        $description.css('-webkit-line-clamp', '3');
        $arrow.css('transform', 'rotate(0deg)');
        console.log($descHeight);
        if($descHeight>300){
          $(document).scrollTop($(this).position().top);
        }
      }
      updateViewMoreButton();
    });

    $arrow.on('click', function() {
      isExpanded = !isExpanded;
      if (isExpanded) {
        $button.text(isExpanded ? 'Read less' : 'Read more').show();
        
      $description.css('-webkit-line-clamp', 'none');
      $description.css('display', 'block');
      $arrow.css('transform', 'rotate(180deg)');

      } else {
        $description.css('display', ' -webkit-box');
          
        $description.css('-webkit-line-clamp', '3');
        $arrow.css('transform', 'rotate(0deg)');
      }
      updateViewMoreButton();
    });
    
    $(window).on('resize', function() {
      updateViewMoreButton();
    });


    
   
});
$(document).ready(function() {
  // Function to hide the error message
  function hideErrorMessage() {
 
      var errorMessage = $(this).next('.error__message');
        
      // Hide the error message
      errorMessage.addClass('hidden');
  }

  // Event listener for change event on input field
  $('.input_dietary').change(hideErrorMessage);
});

jQuery(document).on('click', '#related-products-heading', function () {
    jQuery('.relevant-information__content, .extra-section').hide();
    jQuery('.related-products-grid').show();
    jQuery('#relevant-information-heading, #extra-section-heading').css('opacity', '0.5');
    jQuery('#related-products-heading').css('opacity', '1');
});

jQuery(document).on('click', '#relevant-information-heading', function () {
    jQuery('.relevant-information__content').show();
    jQuery('.related-products-grid, .extra-section').hide();
    jQuery('#relevant-information-heading').css('opacity', '1');
    jQuery('#related-products-heading, #extra-section-heading').css('opacity', '0.5');
});

jQuery(document).on('click', '#extra-section-heading', function () {
    jQuery('.extra-section').show();
    jQuery('.relevant-information__content, .related-products-grid').hide();
    jQuery('#extra-section-heading').css('opacity', '1');
    jQuery('#relevant-information-heading, #related-products-heading').css('opacity', '0.5');
});

$(document).ready(function () {
  // Variable to keep track of the last scroll position
  var lastScrollTop = 0;

  // Function to be executed when the window is scrolled
  $(window).scroll(function () {
    // Get the current scroll position
    var currentScrollTop = $(this).scrollTop();
    // console.log(currentScrollTop);
    if (currentScrollTop <= 100) {
      // console.log('x');
      $('sticky-header').removeClass('stick-act');
    } else {
    // Check if the current scroll position is above the last one (scrolling up)
    if (currentScrollTop < lastScrollTop) {
      // Log something to the console
      $('sticky-header').addClass('stick-act');
    } else {
      $('sticky-header').removeClass('stick-act');
    }
    }

    // Update the last scroll position
    lastScrollTop = currentScrollTop;
  });
});
//Smooth Scroll
$( document ).ready(function() {
  // The speed of the scroll in milliseconds
  const speed = 1000;

 $(`a[href*="#"]:not('.notscroll')`)
    .filter((i, a) => a.getAttribute('href').startsWith('#') || a.href.startsWith(`${location.href}#`))
    .unbind('click.smoothScroll')
    .bind('click.smoothScroll', event => {
      const targetId = event.currentTarget.getAttribute('href').split('#')[1];
      const targetElement = document.getElementById(targetId);
      

      if (targetElement) {
        var targetOffset = $(targetElement).offset().top - 140;
        
        event.preventDefault();
        $('html, body').animate({ scrollTop: targetOffset }, speed);
      }
    });
});

$(document).on('click', function(event) {
  // Check if the .drawer has the .active class
  if ($('.drawer').hasClass('active')) {
    // Check if the click was outside of the .cart-drawer
    if (!$(event.target).closest('.cart-drawer').length) {
      // Simulate a click on the .drawer__close button
      $('.drawer__close').click();
    }
  }
});
$(document).ready(function() {
    $(".sub-accordion").click(function() {
        $(this).toggleClass("active").next(".sub-panel").slideToggle();
    });
});

/* 
$(document).ready(function() {
    // Function to check if the browser is Safari
    function isSafari() {
        return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    }

    // If the browser is not Safari, apply the styles
    if (isSafari()) {
        $(".button_container-view").css("display", "none");
    } else {
        $(".product__description.rte").css({
            "display": "-webkit-box",
            "-webkit-line-clamp": "3",
            "-webkit-box-orient": "vertical",
            "overflow": "hidden"
        });
    }
});*/


$(document).on('click','.boxes-contents-accordion', function(e){
  e.preventDefault();
  const acc = $(this);
  const panel = $(this).siblings('.box-contents-accordion--panel');

  if(panel.css('max-height') != 'none' && panel.css('max-height') != '0px'){
    panel.css('max-height', '')
    acc.find('i').css('transform', '');

  } else{
    panel.css('max-height', 'max-content');
    acc.find('i').css('transform', 'rotate(180deg)');
  }
  return false;
});
