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
  if (pageId === 'page-edit-profile') loadEditProfile();
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
function handleSignupStep1() {
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim().toLowerCase();

  document.querySelectorAll('#page-signup-1 .form-error').forEach(el => el.classList.remove('visible'));
  document.querySelectorAll('#page-signup-1 .form-input').forEach(el => el.classList.remove('error'));

  let hasError = false;

  if (!name) {
    document.getElementById('signup-name').classList.add('error');
    document.getElementById('signup-name-error').classList.add('visible');
    hasError = true;
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
    } else {
      showToast('Error: ' + error.message, 'error');
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
    document.getElementById('login-email').classList.add('error');
    document.getElementById('login-password').classList.add('error');
    document.getElementById('login-error').classList.add('visible');
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
    const photoHtml = currentUser.photo 
      ? '<img src="' + currentUser.photo + '" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin-bottom: 16px;">'
      : '<div style="width: 80px; height: 80px; border-radius: 50%; background: rgba(255,255,255,0.06); margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; color: rgba(245,245,247,0.3); font-size: 0.75rem;">No Photo</div>';
    
    document.getElementById('profile-info').innerHTML = photoHtml +
      '<h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 4px;">' + currentUser.name + '</h3>' +
      '<p style="font-size: 0.875rem; color: rgba(245,245,247,0.5);">' + currentUser.email + '</p>' +
      '<p style="font-size: 0.875rem; color: rgba(245,245,247,0.5);">' + currentUser.phone + '</p>';
  }
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

// Load Edit Profile Page
function loadEditProfile() {
  if (currentUser) {
    document.getElementById('edit-name').value = currentUser.name || '';
    document.getElementById('edit-phone').value = currentUser.phone || '';
    document.getElementById('edit-email').value = currentUser.email || '';
    
    if (currentUser.photo) {
      document.getElementById('edit-photo-preview-img').src = currentUser.photo;
      document.getElementById('edit-photo-preview-img').style.display = 'block';
      document.getElementById('edit-photo-icon').style.display = 'none';
    } else {
      document.getElementById('edit-photo-preview-img').style.display = 'none';
      document.getElementById('edit-photo-icon').style.display = 'block';
    }
    editPhotoData = null;
  }
}

// Save Profile
async function saveProfile() {
  const name = document.getElementById('edit-name').value.trim();
  const phone = document.getElementById('edit-phone').value.trim();
  
  if (!name) {
    showToast('Name is required', 'error');
    return;
  }
  
  if (!validatePhone(phone)) {
    showToast('Valid phone number required', 'error');
    return;
  }
  
  setLoading('save-profile-btn', true);
  
  try {
    const updates = {
      name: name,
      phone: phone
    };
    
    if (editPhotoData) {
      updates.photo = editPhotoData;
    }
    
    await db.collection('users').doc(currentUser.uid).update(updates);
    
    currentUser.name = name;
    currentUser.phone = phone;
    if (editPhotoData) currentUser.photo = editPhotoData;
    
    showToast('Profile updated!', 'success');
    showPage('page-profile');
  } catch (error) {
    showToast('Error updating profile', 'error');
  } finally {
    setLoading('save-profile-btn', false);
  }
}

// Change Password
async function changePassword() {
  const currentPwd = document.getElementById('current-password').value;
  const newPwd = document.getElementById('new-password').value;
  const confirmPwd = document.getElementById('confirm-new-password').value;
  
  if (!currentPwd || !newPwd || !confirmPwd) {
    showToast('All fields are required', 'error');
    return;
  }
  
  if (newPwd.length < 8) {
    showToast('Password must be at least 8 characters', 'error');
    return;
  }
  
  if (newPwd !== confirmPwd) {
    showToast('Passwords do not match', 'error');
    return;
  }
  
  setLoading('change-password-btn', true);
  
  try {
    const user = auth.currentUser;
    const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPwd);
    await user.reauthenticateWithCredential(credential);
    await user.updatePassword(newPwd);
    
    document.getElementById('current-password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-new-password').value = '';
    
    showToast('Password updated!', 'success');
    showPage('page-profile');
  } catch (error) {
    if (error.code === 'auth/wrong-password') {
      showToast('Current password is incorrect', 'error');
    } else {
      showToast('Error updating password', 'error');
    }
  } finally {
    setLoading('change-password-btn', false);
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
  if (currentUser && currentUser.settings) {
    const s = currentUser.settings;
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
