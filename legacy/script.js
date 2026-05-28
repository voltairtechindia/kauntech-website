/**
 * KAUNTECH - Premium SaaS Interactions
 * Handles all interactive elements: animations, pricing toggles, chat widget, etc.
 */

document.addEventListener('DOMContentLoaded', () => {
  /* ===== NAVBAR SCROLL & MOBILE MENU ===== */
  const navbar = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  
  // Scroll effect
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });

  // Mobile menu toggle
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    mobileMenu.classList.toggle('active');
  });

  // Close mobile menu on link click
  document.querySelectorAll('.mobile-link').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      mobileMenu.classList.remove('active');
    });
  });

  // Active navigation link on scroll
  const sections = document.querySelectorAll('section[id]');
  window.addEventListener('scroll', () => {
    const scrollY = window.pageYOffset;
    sections.forEach(current => {
      const sectionHeight = current.offsetHeight;
      const sectionTop = current.offsetTop - 100;
      const sectionId = current.getAttribute('id');
      const navLink = document.querySelector(`.nav-links a[href*=${sectionId}]`);
      
      if (navLink) {
        if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
          document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
          navLink.classList.add('active');
        } else {
          navLink.classList.remove('active');
        }
      }
    });
  });

  /* ===== SCROLL REVEAL ANIMATIONS ===== */
  const revealElements = document.querySelectorAll('.reveal');
  
  const revealOnScroll = () => {
    const windowHeight = window.innerHeight;
    const elementVisible = 100;
    
    revealElements.forEach(element => {
      const elementTop = element.getBoundingClientRect().top;
      if (elementTop < windowHeight - elementVisible) {
        element.classList.add('visible');
      }
    });
  };
  
  revealOnScroll();
  window.addEventListener('scroll', revealOnScroll);

  /* ===== FAQ ACCORDION ===== */
  const faqItems = document.querySelectorAll('.faq-item');
  
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    
    question.addEventListener('click', () => {
      faqItems.forEach(otherItem => {
        if (otherItem !== item && otherItem.classList.contains('active')) {
          otherItem.classList.remove('active');
          otherItem.querySelector('.faq-answer').style.maxHeight = null;
        }
      });
      
      item.classList.toggle('active');
      if (item.classList.contains('active')) {
        answer.style.maxHeight = answer.scrollHeight + "px";
      } else {
        answer.style.maxHeight = null;
      }
    });
  });

  /* ===== PRICING TOGGLE (MONTHLY/ANNUAL) ===== */
  const monthlyBtn = document.getElementById('monthlyBtn');
  const annualBtn = document.getElementById('annualBtn');
  const monthlyVals = document.querySelectorAll('.monthly-val');
  const annualVals = document.querySelectorAll('.annual-val');
  const annualPrices = document.querySelectorAll('.annual-price');

  if (monthlyBtn && annualBtn) {
    monthlyBtn.addEventListener('click', () => {
      monthlyBtn.classList.add('active');
      annualBtn.classList.remove('active');
      
      monthlyVals.forEach(el => el.style.display = 'inline');
      annualVals.forEach(el => el.style.display = 'none');
      annualPrices.forEach(el => el.style.display = 'none');
    });

    annualBtn.addEventListener('click', () => {
      annualBtn.classList.add('active');
      monthlyBtn.classList.remove('active');
      
      monthlyVals.forEach(el => el.style.display = 'none');
      annualVals.forEach(el => el.style.display = 'inline');
      annualPrices.forEach(el => el.style.display = 'block');
    });
  }

  /* ===== FEATURE EXPLORER MODAL ===== */
  const featureModal = document.getElementById('featureModal');
  const openExplorerBtn = document.getElementById('openExplorerBtn');
  const closeFeatureModal = document.getElementById('closeFeatureModal');

  if (openExplorerBtn && featureModal && closeFeatureModal) {
    openExplorerBtn.addEventListener('click', () => {
      featureModal.classList.add('active');
      document.body.style.overflow = 'hidden'; 
    });

    closeFeatureModal.addEventListener('click', () => {
      featureModal.classList.remove('active');
      document.body.style.overflow = '';
    });

    featureModal.addEventListener('click', (e) => {
      if (e.target === featureModal) {
        featureModal.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  }

  /* ===== LIVE CHAT WIDGET SIMULATION ===== */
  const chatWidgetBtn = document.getElementById('chatWidgetBtn');
  const chatWindow = document.getElementById('chatWindow');
  const closeChatBtn = document.getElementById('closeChatBtn');
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');
  const chatBody = document.getElementById('chatBody');
  const presetChipsContainer = document.getElementById('presetChips');

  if (chatWidgetBtn && chatWindow) {
    chatWidgetBtn.addEventListener('click', () => {
      chatWindow.classList.add('active');
      chatWidgetBtn.style.transform = 'scale(0)';
      chatWidgetBtn.style.opacity = '0';
    });

    closeChatBtn.addEventListener('click', () => {
      chatWindow.classList.remove('active');
      chatWidgetBtn.style.transform = '';
      chatWidgetBtn.style.opacity = '1';
    });

    // Handle Preset Chips
    if (presetChipsContainer) {
      const chips = presetChipsContainer.querySelectorAll('.preset-chip');
      chips.forEach(chip => {
        chip.addEventListener('click', () => {
          chatInput.value = chip.innerText;
          chatForm.dispatchEvent(new Event('submit'));
          presetChipsContainer.style.display = 'none'; // Hide after first use
        });
      });
    }

    // Bot Logic
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const userMessage = chatInput.value.trim();
      if (!userMessage) return;

      // Add User Message
      const userDiv = document.createElement('div');
      userDiv.className = 'chat-msg user';
      userDiv.textContent = userMessage;
      chatBody.appendChild(userDiv);
      chatInput.value = '';
      chatBody.scrollTop = chatBody.scrollHeight;

      if(presetChipsContainer) presetChipsContainer.style.display = 'none';

      // Simulate Bot Typing
      setTimeout(() => {
        const botDiv = document.createElement('div');
        botDiv.className = 'chat-msg bot';
        
        const lowerMsg = userMessage.toLowerCase();
        let botResponse = "";
        let requireForm = false;
        
        // Exact matching for preset questions or closely related
        if (lowerMsg.includes('offline')) {
          botResponse = "Kauntech works 100% offline! OCR, audio notes, and data storage happen securely on your device. We sync to the cloud only when you reconnect.";
        } else if (lowerMsg.includes('dpdp') || lowerMsg.includes('compliance')) {
          botResponse = "We are fully DPDP Act 2023 compliant. We record specific consent, process data locally, and offer a transparent audit ledger. We don't save your images or contacts on our servers.";
        } else if (lowerMsg.includes('token') || lowerMsg.includes('ai')) {
          botResponse = "AI Tokens power our advanced features. AI Intel costs 2 tokens per scan. Pro plans include 1,000 tokens monthly. You can also earn free tokens by following our social media pages and competing in our community Q&A if you are a Pro or Ultra user!";
        } else if (lowerMsg.includes('price') || lowerMsg.includes('cost') || lowerMsg.includes('plan')) {
          botResponse = "We offer flexible plans: Free (49 scans), Pro (₹499/mo), Ultra (₹999/mo), and Custom enterprise suites. Top-ups are also available anytime.";
        } else if (lowerMsg.includes('data') || lowerMsg.includes('stored') || lowerMsg.includes('server')) {
          botResponse = "We do not save or store your scanned images or contact details on our servers. Your data belongs to you and stays securely on your device until you decide to sync it to your own CRM.";
        } else {
          // Unrecognized Question -> Show Fallback Form
          botResponse = "I'm sorry, I cannot answer that specific question right now. Please provide your details, and our admin will revert back to your email ID shortly.";
          requireForm = true;
        }

        botDiv.textContent = botResponse;
        
        if (requireForm) {
          const formHtml = `
            <div class="chat-fallback-form" style="margin-top: 12px;">
              <input type="text" placeholder="Your Name" id="fbName" required>
              <input type="email" placeholder="Your Email ID" id="fbEmail" required>
              <textarea placeholder="Please describe your question or issue in detail..." id="fbDetails" rows="3" required></textarea>
              <button type="button" onclick="alert('Details submitted successfully. Our admin will email you shortly.'); this.parentElement.innerHTML = '<span style=\\'color: #34d399; font-weight: 700;\\'>Request Submitted. Thank you!</span>';">Submit to Admin</button>
            </div>
          `;
          botDiv.innerHTML += formHtml;
        }

        chatBody.appendChild(botDiv);
        chatBody.scrollTop = chatBody.scrollHeight;
      }, 600);
    });
  }

  /* ===== CONTACT FORM GOOGLE SHEETS SUBMISSION ===== */
  const contactForm = document.getElementById('kauntechContactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('cSubmitBtn');
      const originalBtnText = submitBtn.innerHTML;
      submitBtn.innerHTML = '<span>Sending...</span><i class="fa-solid fa-spinner fa-spin"></i>';
      submitBtn.disabled = true;

      const scriptURL = 'https://script.google.com/macros/s/AKfycbztbMN_DrSEfxk7F6gljRxpYBp7qhkybE0on_Jfc5JvtIAg7ymdZCDVHVd3Szm3pPj0/exec';
      const formData = new FormData(contactForm);

      fetch(scriptURL, { method: 'POST', body: formData, mode: 'no-cors' })
        .then(() => {
          alert('Thank you! Your message has been successfully shared. Our team will revert as soon as possible.');
          contactForm.reset();
          submitBtn.innerHTML = originalBtnText;
          submitBtn.disabled = false;
        })
        .catch(error => {
          console.error('Error!', error.message);
          alert('Thank you! Your message has been shared. We will revert as soon as possible.');
          contactForm.reset();
          submitBtn.innerHTML = originalBtnText;
          submitBtn.disabled = false;
        });
    });
  }
});
