/**
 * Estimate Page JavaScript
 * Handles photo uploads, form navigation, validation, and API submission
 */

// Configuration
// These values are injected at build time from environment variables
// For local development, create a .env file with these values
const CLOUDINARY_CLOUD_NAME = window.ENV?.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = window.ENV?.CLOUDINARY_UPLOAD_PRESET;
const API_ENDPOINT = '/api/submit-estimate';

// Validate required configuration
if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
  console.error('❌ Missing Cloudinary configuration. Please check env-config.js is loaded.');
}
const MAX_PHOTOS = 6;
const MIN_PHOTOS = 1;

// State
let uploadedPhotos = [];
let currentStep = 1;
let detectedItems = [];
let originalEstimate = null;
let aiTotalYards = 0;
let userMadeAdjustments = false; // Track if user manually changed quantities

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initializeCloudinaryWidget();
  initializeFormNavigation();
  initializeFormValidation();
  setupFormSubmission();
  updatePhotoCount();
});

/**
 * Initialize Cloudinary Upload Widget
 */
function initializeCloudinaryWidget() {
  const uploadBtn = document.getElementById('upload-btn');
  
  if (!uploadBtn) return;

  // Create Cloudinary widget
  const widget = cloudinary.createUploadWidget(
    {
      cloudName: CLOUDINARY_CLOUD_NAME,
      uploadPreset: CLOUDINARY_UPLOAD_PRESET,
      sources: ['local', 'camera'],
      multiple: true,
      maxFiles: MAX_PHOTOS,
      maxFileSize: 10000000, // 10MB
      clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
      cropping: false,
      folder: 'estimates',
      resourceType: 'image',
      thumbnailTransformation: [{ width: 200, height: 200, crop: 'fill' }]
    },
    (error, result) => {
      if (error) {
        console.error('Upload error:', error);
        alert('Photo upload failed. Please try again.');
        return;
      }

      if (result.event === 'success') {
        handlePhotoUpload(result.info);
      }
    }
  );

  // Open widget on button click
  uploadBtn.addEventListener('click', () => {
    if (uploadedPhotos.length >= MAX_PHOTOS) {
      alert(`Maximum ${MAX_PHOTOS} photos allowed`);
      return;
    }
    widget.open();
  });
}

/**
 * Handle successful photo upload
 */
function handlePhotoUpload(info) {
  if (uploadedPhotos.length >= MAX_PHOTOS) {
    alert(`Maximum ${MAX_PHOTOS} photos allowed`);
    return;
  }

  const photoData = {
    url: info.secure_url,
    thumbnail: info.thumbnail_url,
    publicId: info.public_id
  };

  uploadedPhotos.push(photoData);
  renderPhotoGrid();
  updatePhotoCount();
  validateStep1();
}

/**
 * Render photo grid
 */
function renderPhotoGrid() {
  const photoGrid = document.getElementById('photo-grid');
  if (!photoGrid) return;

  photoGrid.innerHTML = uploadedPhotos.map((photo, index) => `
    <div class="photo-item">
      <img src="${photo.thumbnail}" alt="Uploaded photo ${index + 1}" />
      <button type="button" class="remove-btn" data-index="${index}" aria-label="Remove photo">
        ×
      </button>
    </div>
  `).join('');

  // Add remove button listeners
  photoGrid.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index, 10);
      removePhoto(index);
    });
  });
}

/**
 * Remove photo from array
 */
function removePhoto(index) {
  uploadedPhotos.splice(index, 1);
  renderPhotoGrid();
  updatePhotoCount();
  validateStep1();
}

/**
 * Update photo count display
 */
function updatePhotoCount() {
  const countEl = document.getElementById('photo-count');
  if (!countEl) return;

  const count = uploadedPhotos.length;
  countEl.textContent = `${count} photo${count !== 1 ? 's' : ''} uploaded (min: ${MIN_PHOTOS}, max: ${MAX_PHOTOS})`;
  
  if (count < MIN_PHOTOS) {
    countEl.style.color = '#ef4444';
  } else {
    countEl.style.color = '#059669';
  }
}

/**
 * Validate Step 1 (photos)
 */
function validateStep1() {
  const continueBtn = document.querySelector('[data-next-step="2"]');
  if (!continueBtn) return;

  const isValid = uploadedPhotos.length >= MIN_PHOTOS && uploadedPhotos.length <= MAX_PHOTOS;
  continueBtn.disabled = !isValid;
}

/**
 * Initialize form navigation (multi-step)
 */
function initializeFormNavigation() {
  // Next buttons
  document.querySelectorAll('[data-next-step]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const nextStep = parseInt(btn.dataset.nextStep, 10);
      
      if (nextStep === 3) {
        // Validate step 2 before going to step 3
        if (validateStep2()) {
          submitForm();
        }
      } else {
        goToStep(nextStep);
      }
    });
  });

  // Previous buttons
  document.querySelectorAll('[data-prev-step]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const prevStep = parseInt(btn.dataset.prevStep, 10);
      goToStep(prevStep);
    });
  });
}

/**
 * Navigate to a specific step
 */
function goToStep(step) {
  // Hide all steps
  document.querySelectorAll('.form-step').forEach(el => {
    el.classList.remove('active');
  });

  // Show target step
  const targetStep = document.querySelector(`.form-step[data-step="${step}"]`);
  if (targetStep) {
    targetStep.classList.add('active');
  }

  // Update progress indicator
  document.querySelectorAll('.progress-step').forEach(el => {
    const stepNum = parseInt(el.dataset.step, 10);
    el.classList.remove('active', 'completed');
    
    if (stepNum === step) {
      el.classList.add('active');
    } else if (stepNum < step) {
      el.classList.add('completed');
    }
  });

  currentStep = step;
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Initialize form validation
 */
function initializeFormValidation() {
  const form = document.getElementById('estimate-form');
  if (!form) return;

  // Real-time validation
  form.querySelectorAll('input, textarea').forEach(input => {
    input.addEventListener('blur', () => {
      validateField(input);
    });
  });

  // Phone formatting
  const phoneInput = document.getElementById('customer_phone');
  if (phoneInput) {
    phoneInput.addEventListener('input', formatPhoneNumber);
  }

  // ZIP validation
  const zipInput = document.getElementById('zip_code');
  if (zipInput) {
    zipInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 5);
    });
  }

  // Couch size selector visibility (estimator-only)
  const furnitureCheckbox = document.getElementById('item_type_furniture');
  const couchSizeSelector = document.getElementById('couch-size-selector');
  
  if (furnitureCheckbox && couchSizeSelector) {
    furnitureCheckbox.addEventListener('change', () => {
      if (furnitureCheckbox.checked) {
        couchSizeSelector.style.display = 'block';
        // Default to 3-seat if nothing selected
        const selectedSize = document.querySelector('input[name="couch_size"]:checked');
        if (!selectedSize) {
          document.getElementById('couch_3_seat').checked = true;
        }
      } else {
        couchSizeSelector.style.display = 'none';
      }
    });
  }
}

/**
 * Format phone number as user types
 */
function formatPhoneNumber(e) {
  const input = e.target;
  let value = input.value.replace(/\D/g, '');
  
  if (value.length > 10) {
    value = value.slice(0, 10);
  }

  if (value.length >= 6) {
    value = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6)}`;
  } else if (value.length >= 3) {
    value = `(${value.slice(0, 3)}) ${value.slice(3)}`;
  }

  input.value = value;
}

/**
 * Validate individual field
 */
function validateField(input) {
  const isValid = input.checkValidity();
  
  if (isValid) {
    input.style.borderColor = '#10b981';
  } else if (input.value.length > 0) {
    input.style.borderColor = '#ef4444';
  } else {
    input.style.borderColor = '#e5e7eb';
  }
  
  return isValid;
}

/**
 * Validate Step 2 (form fields)
 */
function validateStep2() {
  const requiredFields = [
    document.getElementById('customer_name'),
    document.getElementById('customer_phone'),
    document.getElementById('zip_code')
  ];

  let isValid = true;
  const errors = [];

  requiredFields.forEach(field => {
    if (!field) return;
    
    if (!field.value.trim()) {
      isValid = false;
      errors.push(`${field.labels[0].textContent} is required`);
      field.style.borderColor = '#ef4444';
    } else if (!field.checkValidity()) {
      isValid = false;
      errors.push(`${field.labels[0].textContent} is invalid`);
      field.style.borderColor = '#ef4444';
    } else {
      field.style.borderColor = '#10b981';
    }
  });

  // Validate email if provided
  const emailInput = document.getElementById('customer_email');
  if (emailInput && emailInput.value.trim() && !emailInput.checkValidity()) {
    isValid = false;
    errors.push('Email format is invalid');
    emailInput.style.borderColor = '#ef4444';
  }

  if (!isValid) {
    alert('Please fix the following errors:\n\n' + errors.join('\n'));
  }

  return isValid;
}

/**
 * Setup form submission
 */
function setupFormSubmission() {
  const form = document.getElementById('estimate-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    // Form is submitted via the "Get My Estimate" button
  });
}

/**
 * Submit form to API
 */
async function submitForm() {
  // Validate service type selection before proceeding
  const serviceType = document.querySelector('input[name="service_type"]:checked');
  if (!serviceType) {
    alert('Please select where the junk is located (Curbside, Garage, Inside Home, or Upstairs)');
    goToStep(2); // Go back to step 2
    return;
  }
  
  // Go to step 3 and show loading
  goToStep(3);
  showLoading();

  try {
    // Gather form data
    const formData = gatherFormData();

    // Validate
    if (!formData) {
      throw new Error('Please fill in all required fields');
    }

    // Submit to API
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Submission failed');
    }

    if (!result.success) {
      throw new Error(result.error || 'Estimate generation failed');
    }

    // Show success with estimate
    showSuccess(result);

  } catch (error) {
    console.error('Submission error:', error);
    showError(error.message);
  }
}

/**
 * Gather form data
 */
function gatherFormData() {
  const form = document.getElementById('estimate-form');
  if (!form) return null;

  // Get item types (checkboxes)
  const itemTypes = Array.from(form.querySelectorAll('input[name="item_types"]:checked'))
    .map(cb => cb.value);

  // Get photo URLs
  const photoUrls = uploadedPhotos.map(photo => photo.url);

  // Get preferred pickup time
  const pickupInput = document.getElementById('preferred_pickup');
  const preferredPickup = pickupInput?.value ? new Date(pickupInput.value).toISOString() : null;

  // Get service type (where junk is located)
  const serviceType = document.querySelector('input[name="service_type"]:checked')?.value || 'inside_home'; // Default to higher price

  // Get couch size override (estimator-only)
  const couchSizeOverride = document.querySelector('input[name="couch_size"]:checked')?.value || null;

  return {
    customer_name: document.getElementById('customer_name')?.value.trim(),
    customer_phone: document.getElementById('customer_phone')?.value.trim(),
    customer_email: document.getElementById('customer_email')?.value.trim() || null,
    zip_code: document.getElementById('zip_code')?.value.trim(),
    photo_urls: photoUrls,
    item_types: itemTypes,
    service_type: serviceType, // NEW: User-confirmed service type
    couch_size_override: couchSizeOverride, // NEW: User-selected couch size
    additional_notes: document.getElementById('additional_notes')?.value.trim() || null,
    preferred_pickup_start: preferredPickup,
    preferred_pickup_end: null, // Could add separate end time if needed
    honeypot: document.getElementById('website')?.value || '' // Spam trap
  };
}

/**
 * Show loading state
 */
function showLoading() {
  document.getElementById('estimate-loading').style.display = 'block';
  document.getElementById('estimate-error').style.display = 'none';
  document.getElementById('estimate-success').style.display = 'none';
}

/**
 * Show error state
 */
function showError(message) {
  document.getElementById('estimate-loading').style.display = 'none';
  document.getElementById('estimate-error').style.display = 'block';
  document.getElementById('estimate-success').style.display = 'none';
  document.getElementById('error-message').textContent = message;
}

/**
 * Show success state with estimate
 */
function showSuccess(result) {
  document.getElementById('estimate-loading').style.display = 'none';
  document.getElementById('estimate-error').style.display = 'none';
  document.getElementById('estimate-success').style.display = 'block';

  const { estimate } = result;

  // Store original estimate for recalculation
  originalEstimate = { 
    ...estimate,
    cubic_yards_adjusted: result.cubic_yards_adjusted || result.cubic_yards || 2
  };
  aiTotalYards = result.cubic_yards_adjusted || result.cubic_yards || 2;
  
  // Store detected items
  detectedItems = (result.detected_items || []).map(item => ({
    ...item,
    included: true // Ensure all start included
  }));
  
  // Reset adjustment flag for new estimates
  userMadeAdjustments = false;

  // Display price range
  document.getElementById('result-min').textContent = estimate.min_price;
  document.getElementById('result-max').textContent = estimate.max_price;

  // Display confidence
  const confidenceBadge = document.getElementById('result-confidence');
  confidenceBadge.textContent = estimate.confidence;
  confidenceBadge.className = `confidence-badge ${estimate.confidence}`;

  // Render item checklist if items detected
  renderItemChecklist(result);

  // Scroll to result
  setTimeout(() => {
    const successEl = document.getElementById('estimate-success');
    if (successEl) {
      successEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 100);

  // Track conversion (optional - add analytics here)
  if (typeof gtag !== 'undefined') {
    gtag('event', 'estimate_completed', {
      value: (estimate.min_price + estimate.max_price) / 2,
      currency: 'USD'
    });
  }
}

/**
 * Render item checklist (estimator-only)
 */
function renderItemChecklist(result) {
  const section = document.getElementById('item-checklist-section');
  const container = document.getElementById('item-checklist');
  const checklistContainer = document.getElementById('item-checklist-container');
  
  if (!section || !container) return;
  
  // Decide whether to show checklist
  const confidence = result.estimate?.confidence || 'medium';
  const itemCount = detectedItems.length;
  const serviceType = result.service_type || 'unknown';
  
  // Show checklist if: not high confidence OR 3+ items OR not curbside
  const shouldShowExpanded = confidence !== 'high' || itemCount >= 3 || serviceType !== 'curbside';
  
  if (itemCount === 0) {
    section.style.display = 'none';
    return;
  }
  
  section.style.display = 'block';
  
  // Toggle expand/collapse behavior
  const toggleBtn = document.querySelector('.checklist-expand-btn');
  const expandText = toggleBtn?.querySelector('.expand-text');
  const collapseText = toggleBtn?.querySelector('.collapse-text');
  
  if (shouldShowExpanded) {
    checklistContainer.classList.remove('collapsed');
    if (expandText) expandText.style.display = 'none';
    if (collapseText) collapseText.style.display = 'inline';
    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'true');
  } else {
    checklistContainer.classList.add('collapsed');
    if (expandText) expandText.style.display = 'inline';
    if (collapseText) collapseText.style.display = 'none';
    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
  }
  
  // Toggle handler
  const header = document.getElementById('checklist-toggle');
  if (header && !header.dataset.listenerAttached) {
    header.addEventListener('click', () => {
      const isCollapsed = checklistContainer.classList.contains('collapsed');
      checklistContainer.classList.toggle('collapsed');
      if (expandText) expandText.style.display = isCollapsed ? 'none' : 'inline';
      if (collapseText) collapseText.style.display = isCollapsed ? 'inline' : 'none';
      if (toggleBtn) toggleBtn.setAttribute('aria-expanded', isCollapsed ? 'true' : 'false');
    });
    header.dataset.listenerAttached = 'true';
  }
  
  // Render items
  container.innerHTML = detectedItems.map((item, index) => {
    const itemYards = (item.qty * item.baselineYardsPerUnit).toFixed(1);
    return `
      <div class="checklist-item ${item.included ? '' : 'unchecked'}" data-index="${index}">
        <input type="checkbox" 
               id="item_${item.id}" 
               ${item.included ? 'checked' : ''}
               aria-label="Include ${item.displayName}">
        <span class="checklist-item-name">${item.displayName}</span>
        <div class="qty-stepper">
          <button type="button" class="qty-decrease" ${!item.included || item.qty <= item.minQty ? 'disabled' : ''}>−</button>
          <input type="text" value="${item.qty}" readonly disabled="${!item.included}">
          <button type="button" class="qty-increase" ${!item.included || item.qty >= item.maxQty ? 'disabled' : ''}>+</button>
        </div>
        <span class="checklist-item-yards">~${itemYards} yd³</span>
      </div>
    `;
  }).join('');
  
  // Attach event listeners
  container.querySelectorAll('.checklist-item').forEach((row, index) => {
    const checkbox = row.querySelector('input[type="checkbox"]');
    const decreaseBtn = row.querySelector('.qty-decrease');
    const increaseBtn = row.querySelector('.qty-increase');
    
    checkbox?.addEventListener('change', () => {
      detectedItems[index].included = checkbox.checked;
      userMadeAdjustments = true; // User made a manual change
      recalculateFromChecklist();
      renderItemChecklist(result); // Re-render to update UI
    });
    
    decreaseBtn?.addEventListener('click', () => {
      if (detectedItems[index].qty > detectedItems[index].minQty) {
        detectedItems[index].qty--;
        userMadeAdjustments = true; // User made a manual change
        recalculateFromChecklist();
        renderItemChecklist(result);
      }
    });
    
    increaseBtn?.addEventListener('click', () => {
      if (detectedItems[index].qty < detectedItems[index].maxQty) {
        detectedItems[index].qty++;
        userMadeAdjustments = true; // User made a manual change
        recalculateFromChecklist();
        renderItemChecklist(result);
      }
    });
  });
  
  // Update totals
  updateChecklistTotals();
}

/**
 * Recalculate estimate from checklist (estimator-only)
 * Uses blending: finalYards = max(aiTotalYards * 0.9, totalItemizedYards)
 */
function recalculateFromChecklist() {
  if (!originalEstimate || detectedItems.length === 0) return;
  
  // Calculate itemized yards
  const totalItemizedYards = detectedItems
    .filter(item => item.included)
    .reduce((sum, item) => sum + (item.qty * item.baselineYardsPerUnit), 0);
  
  // Defensive blending: if user made adjustments, trust their input; otherwise use AI floor
  // This prevents gaming while allowing legitimate user corrections
  const finalYards = userMadeAdjustments 
    ? totalItemizedYards 
    : Math.max(aiTotalYards * 0.9, totalItemizedYards);
  
  // DEV ASSERTION: Unchecking should never increase yards
  if (typeof console !== 'undefined' && totalItemizedYards > aiTotalYards * 1.1) {
    console.warn('[ESTIMATOR DEV] Itemized yards exceeds AI total by >10%:', {
      itemized: totalItemizedYards,
      ai: aiTotalYards
    });
  }
  
  // Recalculate price using simple ratio from original
  // Price scales linearly with volume (preserving original pricing logic)
  const originalYards = originalEstimate.cubic_yards_adjusted || aiTotalYards || 2;
  const volumeRatio = Math.max(0.5, finalYards / originalYards); // Floor at 50% to prevent absurdly low
  
  const newMinPrice = Math.max(59, Math.round(originalEstimate.min_price * volumeRatio));
  const newMaxPrice = Math.max(newMinPrice + 20, Math.round(originalEstimate.max_price * volumeRatio));
  
  // DEV ASSERTION: Price should never increase when removing items
  const includedCount = detectedItems.filter(item => item.included).length;
  if (includedCount < detectedItems.length && newMinPrice > originalEstimate.min_price) {
    console.error('[ESTIMATOR DEV] Price increased after unchecking items!', {
      original: originalEstimate.min_price,
      new: newMinPrice
    });
  }
  
  // Update displayed prices
  const minEl = document.getElementById('result-min');
  const maxEl = document.getElementById('result-max');
  if (minEl) minEl.textContent = newMinPrice;
  if (maxEl) maxEl.textContent = newMaxPrice;
  
  // Show warning if significantly reduced
  const warningEl = document.getElementById('checklist-warning');
  if (warningEl) {
    const reductionPercent = 1 - volumeRatio;
    warningEl.style.display = reductionPercent > 0.2 ? 'block' : 'none';
  }
}

/**
 * Update checklist totals display
 */
function updateChecklistTotals() {
  const totalEl = document.getElementById('total-yards');
  if (!totalEl) return;
  
  const totalItemizedYards = detectedItems
    .filter(item => item.included)
    .reduce((sum, item) => sum + (item.qty * item.baselineYardsPerUnit), 0);
  
  totalEl.textContent = `~${totalItemizedYards.toFixed(1)} yd³`;
}

/**
 * Pre-select service type based on vision AI inference (if available)
 * This is called after vision analysis completes and should be globally accessible
 */
window.preSelectServiceType = function(visionData) {
  if (!visionData || !visionData.inferredServiceType) return;
  
  // Map inferred service type to radio button
  const typeMap = {
    'curbside': 'service_curbside',
    'full_service': 'service_garage' // Default full-service to garage (safest option)
  };
  
  const radioId = typeMap[visionData.inferredServiceType];
  if (radioId) {
    const radio = document.getElementById(radioId);
    if (radio && visionData.serviceTypeConfidence > 0.6) {
      // Only pre-select if AI is fairly confident
      radio.checked = true;
      console.log('Pre-selected service type:', visionData.inferredServiceType, 'confidence:', visionData.serviceTypeConfidence);
    }
  }
};

/**
 * Detect if Cloudinary script loaded successfully
 */
window.addEventListener('load', () => {
  if (typeof cloudinary === 'undefined') {
    console.error('Cloudinary script not loaded');
    const uploadBtn = document.getElementById('upload-btn');
    if (uploadBtn) {
      uploadBtn.textContent = 'Photo upload unavailable - Please call us';
      uploadBtn.disabled = true;
      uploadBtn.style.background = '#9ca3af';
    }
  }
});
