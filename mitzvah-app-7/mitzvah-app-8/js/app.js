// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAg7LzCyewNnLzXOQPEa381rDLVKRU8tRY",
  authDomain: "mitzvah-riding.firebaseapp.com",
  projectId: "mitzvah-riding",
  storageBucket: "mitzvah-riding.firebasestorage.app",
  messagingSenderId: "1051995289935",
  appId: "1:1051995289935:web:7dce50ec6ec6d41da9ed3a",
  measurementId: "G-DXYRNNHGLR"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let signupData = {};

// Toast notifications
function showToast(message, type = 'info') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add('visible'), 10);
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Loading state
function setLoading(buttonId, loading) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  if (loading) {
    btn.disabled = true;
    btn.dataset.originalText = btn.textContent;
    btn.innerHTML = '<span class="loading"><span class="spinner"></span>Loading...</span>';
  } else {
    btn.disabled = false;
    btn.textContent = btn.dataset.originalText || 'Submit';
  }
}

// Validation
function validateEmail(email) {
  return email.length >= 5 && email.includes('@') && email.includes('.');
}

function validatePassword(password) {
  return password.length >= 8;
}

function validatePhone(phone) {
  return phone.replace(/\D/g, '').length === 10;
}

// Page Navigation
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.getElementById(pageId).classList.remove('hidden');

  const pagesWithNav = ['page-home', 'page-friends', 'page-new', 'page-dress', 'page-profile'];
  const nav = document.getElementById('bottom-nav');
  if (pagesWithNav.includes(pageId)) {
    nav.classList.add('visible');
  } else {
    nav.classList.remove('visible');
  }

  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.page === pageId) item.classList.add('active');
  });

  if (pageId === 'page-home') renderHome();
  if (pageId === 'page-profile') renderProfile();
  if (pageId === 'page-settings') loadSettings();
}

function navigateTo(pageId) {
  showPage(pageId);
}

// Compress and resize image
function compressImage(file, maxSize = 500) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Scale down if needed
        if (width > height) {
          if (width > maxSize) {
            height = height * (maxSize / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = width * (maxSize / height);
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Compress to JPEG at 70% quality
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Photo Upload (Signup)
async function handlePhotoUpload(event) {
  const file = event.target.files[0];
  if (file) {
    const compressed = await compressImage(file);
    const img = document.getElementById('photo-preview-img');
    img.src = compressed;
    img.style.display = 'block';
    document.getElementById('photo-icon').style.display = 'none';
    signupData.photo = compressed;
  }
}

// Sign Up Step 1
async function handleSignupStep1() {
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim().toLowerCase();

  document.querySelectorAll('#page-signup-1 .form-error').forEach(el => el.classList.remove('visible'));
  document.querySelectorAll('#page-signup-1 .form-input').forEach(el => el.classList.remove('error'));

  let hasError = false;

  if (!name) {
    document.getElementById('signup-name').classList.add('error');
    document.getElementById('signup-name-error').classList.add('visible');
    hasError = true;
  } else {
    // Check if name is unique
    const unique = await isNameUnique(name);
    if (!unique) {
      document.getElementById('signup-name').classList.add('error');
      document.getElementById('signup-name-error').textContent = 'This name is already taken';
      document.getElementById('signup-name-error').classList.add('visible');
      hasError = true;
    }
  }

  if (!validateEmail(email)) {
    document.getElementById('signup-email').classList.add('error');
    document.getElementById('signup-email-error').classList.add('visible');
    hasError = true;
  }

  if (hasError) return;

  signupData.name = name;
  signupData.email = email;
  showPage('page-signup-2');
}

// Sign Up Step 2
async function handleSignupStep2() {
  const phone = document.getElementById('signup-phone').value.trim();
  const password = document.getElementById('signup-password').value;
  const confirm = document.getElementById('signup-confirm').value;

  document.querySelectorAll('#page-signup-2 .form-error').forEach(el => el.classList.remove('visible'));
  document.querySelectorAll('#page-signup-2 .form-input').forEach(el => el.classList.remove('error'));

  let hasError = false;

  if (!validatePhone(phone)) {
    document.getElementById('signup-phone').classList.add('error');
    document.getElementById('signup-phone-error').classList.add('visible');
    hasError = true;
  }

  if (!validatePassword(password)) {
    document.getElementById('signup-password').classList.add('error');
    document.getElementById('signup-password-error').classList.add('visible');
    hasError = true;
  }

  if (password !== confirm) {
    document.getElementById('signup-confirm').classList.add('error');
    document.getElementById('signup-confirm-error').classList.add('visible');
    hasError = true;
  }

  if (hasError) return;

  setLoading('signup-btn', true);

  try {
    const userCredential = await auth.createUserWithEmailAndPassword(signupData.email, password);
    const user = userCredential.user;

    await db.collection('users').doc(user.uid).set({
      name: signupData.name,
      email: signupData.email,
      phone: phone,
      photo: signupData.photo || null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      friends: [],
      events: []
    });

    document.getElementById('signup-name').value = '';
    document.getElementById('signup-email').value = '';
    document.getElementById('signup-phone').value = '';
    document.getElementById('signup-password').value = '';
    document.getElementById('signup-confirm').value = '';
    document.getElementById('photo-preview-img').style.display = 'none';
    document.getElementById('photo-icon').style.display = 'block';
    signupData = {};
  } catch (error) {
    console.error('Signup error:', error);
    if (error.code === 'auth/email-already-in-use') {
      showToast('Email already in use', 'error');
      showPage('page-signup-1');
    } else if (error.code === 'auth/network-request-failed') {
      showToast('No internet connection', 'error');
    } else if (error.code === 'auth/too-many-requests') {
      showToast('Too many attempts. Try again later', 'error');
    } else {
      showToast('Could not create account. Try again.', 'error');
    }
  } finally {
    setLoading('signup-btn', false);
  }
}

// Login
async function handleLogin() {
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const password = document.getElementById('login-password').value;

  document.getElementById('login-error').classList.remove('visible');
  document.querySelectorAll('#page-login .form-input').forEach(el => el.classList.remove('error'));

  if (!email || !password) {
    document.getElementById('login-email').classList.add('error');
    document.getElementById('login-password').classList.add('error');
    document.getElementById('login-error').classList.add('visible');
    return;
  }

  setLoading('login-btn', true);

  try {
    await auth.signInWithEmailAndPassword(email, password);
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
  } catch (error) {
    console.error('Login error:', error);
    if (error.code === 'auth/network-request-failed') {
      showToast('No internet connection', 'error');
    } else if (error.code === 'auth/too-many-requests') {
      showToast('Too many attempts. Try again later', 'error');
    } else {
      document.getElementById('login-email').classList.add('error');
      document.getElementById('login-password').classList.add('error');
      document.getElementById('login-error').classList.add('visible');
    }
  } finally {
    setLoading('login-btn', false);
  }
}

// Logout
async function handleLogout() {
  try {
    await auth.signOut();
    currentUser = null;
    showPage('page-landing');
  } catch (error) {
    showToast('Error logging out', 'error');
  }
}

// Render Pages
function renderHome() {
  if (currentUser) {
    document.getElementById('home-greeting').textContent = 'Welcome back, ' + currentUser.name;
  }
}

function renderProfile() {
  if (currentUser) {
    // Set photo or placeholder
    const photoContainer = document.getElementById('profile-photo-large');
    if (currentUser.photo) {
      photoContainer.innerHTML = '<img src="' + currentUser.photo + '" alt="Profile">';
    } else {
      photoContainer.innerHTML = '<svg class="profile-placeholder-logo" viewBox="0 0 100 100" fill="none"><circle cx="50" cy="50" r="45" stroke="rgba(255,255,255,0.2)" stroke-width="2" fill="none"/><path d="M25 70 L35 30 L50 55 L65 30 L75 70" stroke="rgba(255,255,255,0.2)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>';
    }
    
    // Set name, username, contact
    document.getElementById('profile-name').textContent = currentUser.name;
    document.getElementById('profile-username').textContent = '@' + currentUser.name.toLowerCase().replace(/\s+/g, '');
    document.getElementById('profile-contact').textContent = currentUser.email + ' • ' + currentUser.phone;
    
    // Reset account info locked state
    document.getElementById('account-info-locked').style.display = 'block';
    document.getElementById('account-info-unlocked').style.display = 'none';
    document.getElementById('unlock-password').value = '';
  }
}

// Unlock Account Info
async function unlockAccountInfo() {
  const password = document.getElementById('unlock-password').value;
  
  if (!password) {
    showToast('Enter your password', 'error');
    return;
  }
  
  try {
    const user = auth.currentUser;
    const credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
    await user.reauthenticateWithCredential(credential);
    
    // Unlock successful - show editable form
    document.getElementById('account-info-locked').style.display = 'none';
    document.getElementById('account-info-unlocked').style.display = 'block';
    
    // Fill in current values
    document.getElementById('edit-name').value = currentUser.name;
    document.getElementById('edit-email').value = currentUser.email;
    document.getElementById('edit-phone').value = currentUser.phone;
    document.getElementById('edit-new-password').value = '';
    
    if (currentUser.photo) {
      document.getElementById('edit-photo-preview-img').src = currentUser.photo;
      document.getElementById('edit-photo-preview-img').style.display = 'block';
      document.getElementById('edit-photo-icon').style.display = 'none';
    } else {
      document.getElementById('edit-photo-preview-img').style.display = 'none';
      document.getElementById('edit-photo-icon').style.display = 'block';
    }
    editPhotoData = null;
    
  } catch (error) {
    showToast('Incorrect password', 'error');
  }
}

// Check if name is unique
async function isNameUnique(name, excludeUid = null) {
  const snapshot = await db.collection('users').where('name', '==', name).get();
  if (snapshot.empty) return true;
  if (excludeUid && snapshot.docs.length === 1 && snapshot.docs[0].id === excludeUid) return true;
  return false;
}

// Save Account Info
async function saveAccountInfo() {
  const name = document.getElementById('edit-name').value.trim();
  const phone = document.getElementById('edit-phone').value.trim();
  const newPassword = document.getElementById('edit-new-password').value;
  
  if (!name) {
    showToast('Name is required', 'error');
    return;
  }
  
  if (!validatePhone(phone)) {
    showToast('Valid phone number required', 'error');
    return;
  }
  
  // Check if name changed and is unique
  if (name !== currentUser.name) {
    const unique = await isNameUnique(name, currentUser.uid);
    if (!unique) {
      document.getElementById('edit-name').classList.add('error');
      document.getElementById('edit-name-error').classList.add('visible');
      showToast('This name is already taken', 'error');
      return;
    }
  }
  
  document.getElementById('edit-name').classList.remove('error');
  document.getElementById('edit-name-error').classList.remove('visible');
  
  setLoading('save-account-btn', true);
  
  try {
    const updates = {
      name: name,
      phone: phone
    };
    
    if (editPhotoData) {
      updates.photo = editPhotoData;
    }
    
    await db.collection('users').doc(currentUser.uid).update(updates);
    
    // Update password if provided
    if (newPassword) {
      if (newPassword.length < 8) {
        showToast('Password must be at least 8 characters', 'error');
        setLoading('save-account-btn', false);
        return;
      }
      await auth.currentUser.updatePassword(newPassword);
    }
    
    currentUser.name = name;
    currentUser.phone = phone;
    if (editPhotoData) currentUser.photo = editPhotoData;
    
    showToast('Account updated!', 'success');
    showPage('page-profile');
  } catch (error) {
    showToast('Error saving changes', 'error');
  } finally {
    setLoading('save-account-btn', false);
  }
}

// Toggle Dark Mode
function toggleDarkMode(isDark) {
  if (isDark) {
    document.body.classList.remove('light-mode');
  } else {
    document.body.classList.add('light-mode');
  }
  
  // Save preference
  if (currentUser) {
    saveSetting('darkMode', isDark);
  }
  localStorage.setItem('darkMode', isDark);
}

// Auth State Listener
auth.onAuthStateChanged(async (user) => {
  if (user) {
    try {
      const doc = await db.collection('users').doc(user.uid).get();
      if (doc.exists) {
        currentUser = { uid: user.uid, ...doc.data() };
        showPage('page-home');
      } else {
        await auth.signOut();
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  }
});

// Intro Animation
window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('intro-screen').classList.add('fade-out');
    document.getElementById('app').classList.add('visible');
  }, 2000);
});

// Edit Profile Photo Upload
let editPhotoData = null;

async function handleEditPhotoUpload(event) {
  const file = event.target.files[0];
  if (file) {
    const compressed = await compressImage(file);
    const img = document.getElementById('edit-photo-preview-img');
    img.src = compressed;
    img.style.display = 'block';
    document.getElementById('edit-photo-icon').style.display = 'none';
    editPhotoData = compressed;
  }
}

// Save Setting
async function saveSetting(key, value) {
  if (!currentUser) return;
  
  try {
    const settings = currentUser.settings || {};
    settings[key] = value;
    
    await db.collection('users').doc(currentUser.uid).update({ settings: settings });
    currentUser.settings = settings;
  } catch (error) {
    showToast('Error saving setting', 'error');
  }
}

// Load Settings
function loadSettings() {
  // Load dark mode from localStorage or user settings
  let darkMode = localStorage.getItem('darkMode');
  if (darkMode === null) darkMode = 'true'; // default to dark
  darkMode = darkMode === 'true';
  
  document.getElementById('setting-dark-mode').checked = darkMode;
  if (!darkMode) {
    document.body.classList.add('light-mode');
  } else {
    document.body.classList.remove('light-mode');
  }
  
  if (currentUser && currentUser.settings) {
    const s = currentUser.settings;
    if (s.darkMode !== undefined) {
      document.getElementById('setting-dark-mode').checked = s.darkMode;
      if (!s.darkMode) {
        document.body.classList.add('light-mode');
      }
    }
    document.getElementById('setting-event-reminders').checked = s.eventReminders !== false;
    document.getElementById('setting-friend-requests').checked = s.friendRequests !== false;
    document.getElementById('setting-carpool-updates').checked = s.carpoolUpdates !== false;
    document.getElementById('setting-show-phone').checked = s.showPhone !== false;
    document.getElementById('setting-allow-requests').checked = s.allowRequests !== false;
  }
}

// Delete Account
async function deleteAccount() {
  const password = document.getElementById('delete-password').value;
  
  if (!password) {
    showToast('Password is required', 'error');
    return;
  }
  
  setLoading('delete-account-btn', true);
  
  try {
    const user = auth.currentUser;
    const credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
    await user.reauthenticateWithCredential(credential);
    
    // Delete user data from Firestore
    await db.collection('users').doc(user.uid).delete();
    
    // Delete user account
    await user.delete();
    
    currentUser = null;
    document.getElementById('delete-password').value = '';
    showPage('page-landing');
    showToast('Account deleted', 'success');
  } catch (error) {
    if (error.code === 'auth/wrong-password') {
      showToast('Incorrect password', 'error');
    } else {
      showToast('Error deleting account', 'error');
    }
  } finally {
    setLoading('delete-account-btn', false);
  }
}
