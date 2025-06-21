// Get all the necessary elements
const carousel = document.querySelector('.Carousel');
const slideContainer = document.querySelector('.slide-container');
const slides = carousel.querySelectorAll('.slide');
const prevButton = document.getElementById('prevBtn');
const nextButton = document.getElementById('nextBtn');

// Initialize variables
let currentSlide = 0;
const totalSlides = slides.length;
let autoSlideInterval;
let isHovered = false;

// Function to show a specific slide
function showSlide(index) {
    // Hide all slides
    slides.forEach(slide => {
        slide.style.display = 'none';
        slide.style.opacity = 0;
    });

    // Show the current slide
    slides[index].style.display = 'flex';
    
    // Add fade-in animation
    setTimeout(() => {
        slides[index].style.opacity = 1;
    }, 50);
}

// Function to go to the next slide
function nextSlide() {
    currentSlide = (currentSlide + 1) % totalSlides;
    showSlide(currentSlide);
}

// Function to go to the previous slide
function prevSlide() {
    currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
    showSlide(currentSlide);
}

// Add click event listeners to the navigation buttons
nextButton.addEventListener('click', () => {
    nextSlide();
    resetAutoSlide();
});

prevButton.addEventListener('click', () => {
    prevSlide();
    resetAutoSlide();
});

// Function to start auto-sliding
function startAutoSlide() {
    autoSlideInterval = setInterval(() => {
        if (!isHovered) {
            nextSlide();
        }
    }, 5000);
}

// Function to reset auto-slide timer
function resetAutoSlide() {
    clearInterval(autoSlideInterval);
    startAutoSlide();
}

// Add hover event listeners to pause/resume auto-sliding
carousel.addEventListener('mouseenter', () => {
    isHovered = true;
});

carousel.addEventListener('mouseleave', () => {
    isHovered = false;
});

// Initialize the slider
showSlide(currentSlide);
startAutoSlide(); 

// Modal logic for Account access
$(document).ready(function() {
  // Modal logic for Account access
  $('.AccountBtn1, .AccountBtn2').on('click', function(e) {
    const userJson = localStorage.getItem('currentUser');
    if (!userJson) {
      e.preventDefault();
      $('#accountModal').css('display', 'flex');
    } else {
      window.location.href = '../profile/UserProfile.html';
    }
  });

  $('#closeAccountModal').on('click', function() {
    $('#accountModal').css('display', 'none');
  });

  $('#accountLoginRedirectBtn').on('click', function() {
    window.location.href = '../accountLogin/account-login.html';
  });

  $(window).on('click', function(event) {
    if (event.target === document.getElementById('accountModal')) {
      $('#accountModal').css('display', 'none');
    }
  });
});

document.getElementById('go-back-btn').addEventListener('click', function() {
            // Check if there's history to go back to
            if (window.history.length > 1) {
                window.history.back();
            } else {
                 window.location.href = '../Homepage/Homepage.html';
            }
        });

  function scrollToSection(value) {
    if (value) {
      const section = document.getElementById(value);
      if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }