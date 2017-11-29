
import isMobile from 'ismobilejs';
import serialize from 'form-serialize';

$(document).ready(() => {
  /**
   * Prevent minus to be appended to age input
   */

  const age = document.getElementById('age');

   // Listen for input event on numInput.
  age.onkeydown = function onkeydown(e) { // eslint-disable-line
    if (![8, 9, 37, 38, 39, 40].includes(e.keyCode)) {
      if (age.value.length >= 2) {
        return false;
      }

      if (!((e.keyCode > 95 && e.keyCode < 106)
        || (e.keyCode > 47 && e.keyCode < 58)
        || e.keyCode === 8)) {
        return false;
      }
    }
  }

  /**
   * Contact form selector
   */

  $('[data-select-product]').on('click', (event) => {
    const product = $(event.currentTarget).data('select-product');

    // Scroll to registration form
    zenscroll.to(document.getElementById('product_interest'), 500);

    // Set the value of the product interest dropdown
    $('#product_interest').val(product);
    $('#product_interest').trigger('change');

    // Autofocus the first input
    $('#name').focus();
  });

  let customCountryCode = false;

  $('[name="country_code"]').on('change', (event) => {
    const $target = $(event.currentTarget);
    const value = $target.val();
    const value2 = $target.parent().next().find('input');

    if (value === 'other') {
      $(event.currentTarget)
        .parent()
        .removeClass('col-sm-12')
        .addClass('col-sm-6');

      $(event.currentTarget)
        .parent()
        .next()
        .removeClass('hidden');

      value2.focus().val(value2.val());

      customCountryCode = true;
    } else {
      if (!customCountryCode) return;

      $(event.currentTarget)
        .parent()
        .addClass('col-sm-12')
        .removeClass('col-sm-6');

      $(event.currentTarget)
        .parent()
        .next()
        .addClass('hidden');

      value2.val('');

      customCountryCode = false;
    }
  });

  $('#product_interest').on('change', (event) => {
    const $target = $(event.currentTarget);
    const value = $target.val();

    if (value === 'Go') {
      $('.registration-submit').html('Get Started');
    } else {
      $('.registration-submit').html('Join waiting list')
    }
  });

  /**
   * Contact Form Slider
   */

  const $contactSlider = $('.rs-section-registration-slider');
  const $contactForm = $('.rs-section-registration-form');
  const $contactSuccess = $('.rs-section-registration-success');

  $contactSlider.slick({
    // initialSlide: 1,
    arrows: false,
    draggable: false,
    adaptiveHeight: true,
  });

  $contactSlider.on('click', '.registration-next', (event) => {
    event.preventDefault();

    const form = document.querySelector('.rs-section-registration-form')
    const serialized = serialize(form, true);

    const errors = validateFirstStep(serialized);

    if (errors.length) {
      $('.error-field-first').html('Some fields are not properly filled.')
    } else {
      $contactSlider.slick('slickNext');
    }
  });

  $contactSlider.on('click', '.registration-back', (event) => {
    event.preventDefault();
    $contactSlider.slick('slickPrev');
  });

  $contactSlider.on('click', '.registration-submit', (event) => {
    event.preventDefault();

    const formEl = document.querySelector('.rs-section-registration-form')
    const form = serialize(formEl, true);
    const errors = validateLastStep(form);

    if (form.country_code === 'other') {
      form.country_code = form.custom_country_code[1];
    }

    delete form.custom_country_code;

    const formString = Object.keys(form).map((key) => {
      const escapedValue = form[key].replace(/\+/g, '%2B');
      return `${key}=${escapedValue}`;
    }).join('&');

    if (errors.length) {
      $('.error-field-last').html('Some fields are not properly filled.')
    } else {
      $.ajax(`https://members.rensource.energy/webapi/default/webapi?secret=u&${formString}`)
        .then(
          () => {
            $contactForm.hide();
            $contactSuccess.show();
          },
          (error) => {
            let { responseText } = error;

            if (!responseText || responseText !== '') {
              responseText = 'Something went wrong. Please try again later.'
            }

            alert(responseText); // eslint-disable-line
          },
        );
    }
  });

  function validateFirstStep(fields) {
    const requiredFields = ['name', 'surname', 'email', 'age', 'product_interest'];
    const err = [];

    requiredFields.forEach((field) => {
      if (!fields.hasOwnProperty(field)) { err.push(field); } // eslint-disable-line
    });

    return err;
  }

  function validateLastStep(fields) {
    const requiredFields = ['country_code', 'phone_number', 'city', 'address'];
    const err = [];

    requiredFields.forEach((field) => {
      if (!fields.hasOwnProperty(field)) { err.push(field); } // eslint-disable-line
    });

    return err;
  }

  /**
   * Dynamic GIF repeatition
   */
  const scrollPoints = [];
  $('.prevent').on('click', event => event.preventDefault())

  if (!isMobile.any) {
    skrollr.init({ forceHeight: false })

    $('[data-gif-src]').each((i, el) => {
      const element = $(el);
      const src = element.data('gif-src');
      const position = element.offset().top - 900;
      const config = { position, element, src }

      element.attr('src', src);
      element.css('display', 'none');

      scrollPoints.push(config);
    });
  } else {
    $('[data-gif-src]').each((i, el) => {
      const element = $(el);
      const src = element.data('gif-src');

      element.attr('src', src);
      element.css('display', 'block');
    });
  }

  $(window).on('scroll', () => {
    const scrollTop = $(window).scrollTop();

    scrollPoints.forEach(({ position, src, element }) => {
      if (scrollTop >= position) {
        element.css('display', 'block');
        if (element.attr('src') !== src) { element.attr('src', src); }
      } else {
        element.fadeOut(500, () => element.attr('src', src));
      }
    })
  })

  /**
   * Collapse via Data attribute
   */

  $('[data-collapse]').each((index, element) => {
    $(element).on('click', (event) => {
      event.stopPropagation()
      event.preventDefault()

      const { currentTarget } = event
      const collapseClass = $(currentTarget).data('collapse')
      const condition = $(currentTarget).data('collapse-only')

      const hasCondition = () => typeof condition !== 'undefined'
      const metCondition = () => hasCondition() && $('body').width() < condition

      if (metCondition() || !hasCondition()) {
        $(element).toggleClass('active')
        $(collapseClass).slideToggle(250)
      }
    })
  })

  let currentHeadline = 0
  const $headline = $('.rs-headline > span')
  $headline.css('display', 'inline-block')
  const headlines = [
    'Petrol & diesel bill keeps going up?',
    'Want your fridge to run all day?',
    'Inverter batteries dying quickly?',
    'Solar systems are too expensive?',
    'Worried about generator fumes?',
  ]

  setInterval(() => {
    ++currentHeadline // eslint-disable-line

    if (currentHeadline >= headlines.length) {
      currentHeadline = 0
    }

    tickHeadline()
  }, 5000);

  function tickHeadline() {
    function step(now) {
      $headline.css('transform', `rotateX(${90 - (now * 90)}deg)`)
    }

    function complete() {
      $headline.html(headlines[currentHeadline])
      $headline.animate({ opacity: 1 }, { duration: 500, step })
    }

    $headline.animate({ opacity: 0 }, { duration: 500, step, complete })
  }

  setTimeout(() => {
    $('.preloader').addClass('preloader--hidden')

    if ('hash' in window.location && window.location.hash !== '') {
      setTimeout(() => {
        const { hash } = window.location
        const element = document.querySelector(hash)

        if (element !== null) { zenscroll.to(element, 500) }
      }, 500)
    }
  }, 1300)

  const $teaser = $('.rs-section-teaser')
  const lightsClass = 'lights-turned-on'

  $('#turn-lights-on').waypoint({
    handler(dir) { $teaser.toggleClass(lightsClass, dir === 'down') },
  })

  $('.rs-section-distribution').waypoint({
    offset: 300,
    handler(dir) {
      $('.rs-section-distribution').toggleClass('in-viewport', dir === 'down');
    },
  })

  if ('devicePixelRatio' in window && window.devicePixelRatio === 2) {
    $('[data-retina]').each((index, element) => {
      let src = element.src
      src = src.replace(/\.(png|jpg|gif)+$/i, '@2x.$1')
      element.src = src // eslint-disable-line
    })
  }

  $('#is_night').on('change', function daytimeChange() {
    const isNight = $(this).is(':checked')

    $('.rs-section-teaser').toggleClass('rs-section-teaser--night', isNight)
  })

  $('.iphone-slick').slick({
    fade: true,
    autoplay: true,
    autoplaySpeed: 2000,
    arrows: false,
  });

  $('.rs-section-stories .slider').slick({
    dots: true,
    infinite: true,
    arrows: true,
    appendDots: $('.rs-section-stories .dots-container .container'),
  })

  $('a:not([href^="http"], [href^="#"], [href^="mailto"])').on('click', function linkClick(event) {
    event.preventDefault();

    const $this = $(this);
    const link = $this.attr('href');

    $('.preloader').removeClass('preloader--hidden')
    zenscroll.toY(0, 500, () => {
      window.location.href = link
    })
  })

  $(window).scroll(function scroll() {
    const st = $(this).scrollTop()
    $('.rs-header').toggleClass('rs-header--sticky', st > 0)
  })

  const subscriptionText = [
    '',
    '',
    '',
    '',
  ];

  $('[data-overlay]').on('click', function onClick() {
    if (window.location.pathname === '/subscription') {
      const index = $(this).data('index');
      if (index === 0) {
        $('.Overlay p').html(subscriptionText[0]);
      } else if (index === 1) {
        $('.Overlay p').html(subscriptionText[1]);
      } else if (index === 2) {
        $('.Overlay p').html(subscriptionText[2]);
      } else if (index === 3) {
        $('.Overlay p').html(subscriptionText[3]);
      }
      // $('.Overlay p').html(subscriptionText[index]);
      $('.Overlay').addClass('active');
    } else {
      const image = $(this).find('div').attr('style');
      const name = $(this).find('b').html();
      const job = $(this).find('span').html();
      const text = $(this).find('p').html();

      $('.Overlay').addClass('active');

      $('.Overlay-Avatar').attr('style', image);
      $('.Overlay b').html(name);
      $('.Overlay span').html(job);
      $('.Overlay p').html(text);
    }
  });

  $('.Overlay-Close, .Overlay-BG').on('click', () => {
    $('.Overlay').removeClass('active');
  })

  $('.Filter-Item').on('click', function onClick() {
    const filterValue = $(this).attr('data-filter');
    filter.isotope({ filter: filterValue });

    $(this)
      .addClass('active')
      .siblings()
      .removeClass('active');
  });

  let filter = $('.filter-content').isotope();

  $('.rs-header-nav_dropdown_holder span').on('mouseover', () => {
    $('.rs-header-nav_dropdown').addClass('active');
  });

  $('.rs-header-nav_dropdown_holder span').on('mouseleave', () => {
    $('.rs-header-nav_dropdown').removeClass('active');
  });

  if ($('.rs-section-interactive')) {
    const $interactiveSlider = $('.rs-section-interactive-slider');
    $interactiveSlider.slick({
      arrows: false,
      fade: true,
      speed: 800,
      initialSlide: 0,
      draggable: false,
      adaptiveHeight: true,
    });

    $('.rs-section-interactive-item button[data-index="0"]').removeClass('button--outlineborder');
    $('.rs-section-interactive-item button[data-index="0"]').addClass('button--greenborder');
    $('.rs-section-interactive-item button[data-index="0"]').parent().next().css('opacity', 1);

    $('.rs-section-interactive-item button').on('click', (event) => {
      if (!$(event.currentTarget).hasClass('button--greenborder')) {
        $('.rs-section-interactive-item button').removeClass('button--greenborder');
        $('.rs-section-interactive-item button').addClass('button--outlineborder');
        $(event.currentTarget).removeClass('button--outlineborder');
        $(event.currentTarget).addClass('button--greenborder');
        $('.rs-section-interactive-item button').parent().next().css('opacity', 0.5);
        $(event.currentTarget).parent().next().css('opacity', 1);
      }

      const index = $(event.currentTarget).data('index');
      $interactiveSlider.slick('slickGoTo', index);
    });
  }
})
