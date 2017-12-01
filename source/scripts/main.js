
import isMobile from 'ismobilejs';
import serialize from 'form-serialize';
import Cookies from 'js-cookie';
import axios from 'axios';

$(document).ready(() => {
  const headers = {};
  const clientKey = Cookies.get('client');
  const uid = Cookies.get('uid');
  const token = Cookies.get('token');

  if (clientKey && uid && token) {
    headers['access-token'] = token;
    headers.uid = uid;
    headers.client = clientKey;
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
  $('[name="first_name"], [name="middle_name"], [name="last_name"]').on('change', (event) => {
    if ($(event.currentTarget).val() && $(event.currentTarget).val().match(/\d+/g)) {
      $(event.currentTarget).css('border-bottom', '1px solid red');
      $('.error-field-last').html('<div class="error-icon">!</div>Your name should not include numbers.');
    } else {
      $(event.currentTarget).css('border-bottom', '1px solid #eee');
      $('.error-field-last').html('');
    }
  });

  $('[name="password_confirmation"]').on('change', (event) => {
    // $(event.currentTarget).val() === $('[name="password"]').val()
    // const currentLength = $(event.currentTarget).val().length;
    // console.log(currentLength);
    if ($(event.currentTarget).val() === $('[name="password"]').val()) {
      $(event.currentTarget).css('border-bottom', '1px solid #eee');
      $('[name="password"]').css('border-bottom', '1px solid #eee');
      $('.error-field-last').html('');
    } else {
      $(event.currentTarget).css('border-bottom', '1px solid red');
      $('[name="password"]').css('border-bottom', '1px solid red');
      $('.error-field-last').html('<div class="error-icon">!</div>Your passwords must match.');
    }

    if ($(event.currentTarget).val().length <= 7) {
      $(event.currentTarget).css('border-bottom', '1px solid red');
      $('[name="password"]').css('border-bottom', '1px solid red');
      $('.error-field-last').html('<div class="error-icon">!</div>Your password should have at least 8 characters.');
    } else if ($(event.currentTarget).val() !== $('[name="password"]').val()) {
      $('.error-field-last').html('<div class="error-icon">!</div>Your passwords must match.');
    }
  });

  $('[name="email_confirmation"]').on('change', (event) => {
    function validateEmail(mail) {
     if (/(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/.test(mail)) {
        return (true)
      }
      return (false)
    }


    if (($(event.currentTarget).val() === $('[name="email"]').val()) && validateEmail($(event.currentTarget).val())) {
      $(event.currentTarget).css('border-bottom', '1px solid #eee');
      $('[name="email"]').css('border-bottom', '1px solid #eee');
      $('.error-field-last').html('');
    } else {
      $(event.currentTarget).css('border-bottom', '1px solid red');
      $('[name="email"]').css('border-bottom', '1px solid red');
      $('.error-field-last').html('<div class="error-icon">!</div>Your emails must match.');
    }
  });

  $('[name="email"]').on('change', (event) => {
    function validateEmail(mail) {
     if (/(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/.test(mail)) {
        return (true)
      }
      return (false)
    }

    if ($(event.currentTarget).val() === $('[name="email"]').val()) {
      $(event.currentTarget).css('border-bottom', '1px solid #eee');
      $('[name="email"]').css('border-bottom', '1px solid #eee');
    } else {
      $(event.currentTarget).css('border-bottom', '1px solid red');
      $('[name="email"]').css('border-bottom', '1px solid red');
    }

    if (!validateEmail($(event.currentTarget).val())) {
      $('.error-field-last').html('<div class="error-icon">!</div>Please enter a valid email.');
      $(event.currentTarget).css('border-bottom', '1px solid red');
      $('[name="email"]').css('border-bottom', '1px solid red');
    } else {
      $(event.currentTarget).css('border-bottom', '1px solid #eee');
      $('[name="email"]').css('border-bottom', '1px solid #eee');
      $('.error-field-last').html('');
    }
  });

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
      // $('.registration-submit').html('Join waiting list')
      $('.registration-submit').html('Get Started');
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

  $('.registration-resend').on('click', () => {
    let redirectUrl = '/onboarding/verified';

    if (Cookies.get('skipOnboarding')) {
      redirectUrl = '/onboarding/finish';
    }

    axios({
      method: 'post',
      url: 'http://rensource-api-staging.herokuapp.com/v1/onboarding/resend_email_token',
      headers: {
        'Content-Type': 'application/json',
        'access-token': Cookies.get('token'),
        client: Cookies.get('client'),
        uid: Cookies.get('uid'),
      },
      data: {
        redirect_url: `http://staging.rs.testgebiet.com${redirectUrl}`,
      },
    })
    .then(function(data) {
      $('.rs-section-registration-success button').attr('disabled', true);
      $('.rs-section-registration-success button').html('Email has been resent');
    }).catch(function(error) {
      alert('Something went wrong. Please try again later.');
    })
  });

  $('.rs-section-registration-slider input, .rs-section-registration-slider select').on('change', () => {
    const formEl = document.querySelector('.rs-section-registration-form')
    const form = serialize(formEl, true);
    const errors = validateLastStep(form);

    if (errors.length) {
      return false;
    } else {
      $('.registration-submit').attr('disabled', false);
    }
  });

  $contactSlider.on('click', '.registration-submit', (event) => {
    event.preventDefault();

    $('.rs-section-registration-form button').attr('disabled', true);

    const formEl = document.querySelector('.rs-section-registration-form')
    const form = serialize(formEl, true);
    const errors = validateLastStep(form);

    const formString = Object.keys(form).map((key) => {
      const escapedValue = form[key].replace(/\+/g, '%2B');
      return `${key}=${escapedValue}`;
    }).join('&');

    function URLToArray(url) {
      var request = {};
      var pairs = url.substring(url.indexOf('?') + 1).split('&');
      for (var i = 0; i < pairs.length; i++) {
          if(!pairs[i])
              continue;
          var pair = pairs[i].split('=');
          request[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
      }
      return request;
    }

    const formArray = URLToArray(formString);

    function validateEmail(mail) {
     if (/(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/.test(mail)) {
        return (true)
      }
      return (false)
    }

    let redirectUrl = '/onboarding/verified';

    if (typeof formArray.referral_token !== 'undefined' && formArray.referral_token) {
      Cookies.set('skipOnboarding', true);
      redirectUrl = '/onboarding/finish';
    }

    if (!validateEmail(formArray.email)) {
      $('.error-field-last').html('Please enter a valid email address.');
    } else if (formArray.email !== formArray.email_confirmation) {
      $('.error-field-last').html('It seems like your emails dont match.');
    } else if (formArray.password !== formArray.password_confirmation) {
      $('.error-field-last').html('It seems like your password dont match.');
    } else if (errors.length) {
      $('.error-field-last').html('Some fields are not properly filled.');
    } else {
      axios({
        method: 'post',
        url: 'http://rensource-api-staging.herokuapp.com/v1/onboarding',
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          user: formArray,
          redirect_url: `http://staging.rs.testgebiet.com${redirectUrl}`,
        },
      })
      .then(function(data) {
        Cookies.set('client', data.headers.client);
        Cookies.set('uid', data.headers.uid);
        Cookies.set('token', data.headers['access-token']);

        console.log(data);
        $contactForm.hide();
        $contactSuccess.show();

        const userWidth = $(window).outerWidth();

        if (userWidth < 767) {
          const formOffset = $('.rs-section-registration-success').offset().top;
          $('html, body').animate({
            scrollTop: formOffset - 100
          }, 800);
        }
      }).catch(function(error) {
        if (/\bEmail has already been taken\b/i.test(error.response.data.error)) {
          $('.error-field-last').html('Email has already been taken.');
        } else {
          alert('Something went wrong. Please try again later.');
        }
      })
    }
  });

  function validateLastStep(fields) {
    const requiredFields = ['first_name', 'last_name', 'gender', 'email', 'email_confirmation', 'password', 'password_confirmation', 'subscription_tier'];
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
