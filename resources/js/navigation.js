import { state, persist, toast } from './state';

const csrfToken = () => document.querySelector('meta[name="csrf-token"]').content;

export async function authRequest(url, options = {}) {
    const request = () => fetch(url, {
        ...options,
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRF-TOKEN': csrfToken(),
            ...(options.headers || {}),
        },
    });
    let response = await request();
    if (response.status === 419) {
        const page = await fetch(window.location.href, { credentials: 'same-origin' });
        const html = await page.text();
        const freshToken = new DOMParser().parseFromString(html, 'text/html').querySelector('meta[name="csrf-token"]')?.content;
        if (freshToken) {
            document.querySelector('meta[name="csrf-token"]').content = freshToken;
            response = await request();
        }

    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        const message = Object.values(payload.errors || {}).flat()[0] || payload.message || 'Authentication failed.';
        const error = new Error(message);
        error.errors = payload.errors || {};
        throw error;
    }
    return payload;
}

function showFormError(form, error) {
    const messageBox = form.querySelector('.auth-error');
    const messages = Object.values(error.errors || {}).flat();
    messageBox.textContent = messages.length ? messages.join(' ') : error.message;
    messageBox.hidden = false;
    const fieldIds = {
        name: 'accountName',
        username: 'accountUsername',
        email: form.id === 'signinForm' ? 'signinEmail' : form.id === 'forgotForm' ? 'forgotEmail' : 'accountEmail',
        contact_number: 'accountContact',
        password: form.id === 'signinForm' ? 'signinPassword' : form.id === 'resetForm' ? 'resetPassword' : 'accountPassword',
        password_confirmation: form.id === 'resetForm' ? 'resetPasswordConfirmation' : 'accountPasswordConfirmation',
        role: null,
    };
    Object.keys(error.errors || {}).forEach((field) => {
        const targetId = fieldIds[field];
        const target = targetId ? document.querySelector(`#${targetId}`) : null;
        if (target) target.setAttribute('aria-invalid', 'true');
    });
}

function clearFormError(form) {
    const messageBox = form.querySelector('.auth-error');
    if (messageBox) {
        messageBox.textContent = '';
        messageBox.hidden = true;
    }
    form.querySelectorAll('[aria-invalid=true]').forEach((input) => input.removeAttribute('aria-invalid'));
}

let onboardingStep = 0;
const onboardingTotal = document.querySelectorAll('.onboarding-step').length;
let previousAuthFocus = null;
let previousBodyOverflow = '';
function renderOnboardingStep() {
    document.querySelectorAll('.onboarding-step').forEach((step) => step.classList.toggle('active', Number(step.dataset.step) === onboardingStep));
    document.querySelector('#onboardingProgress').style.width = `${((onboardingStep + 1) / onboardingTotal) * 100}%`;
    document.querySelector('#onboardingNext').textContent = onboardingStep === onboardingTotal - 1 ? 'Explore FlexWork →' : 'Continue →';
}
async function finishOnboarding() {
    const profile = {
        name: state.user.name,
        title: document.querySelector('#onboardingTitle').value.trim() || state.profile.title,
        skills: document.querySelector('#onboardingSkills').value.trim() || state.profile.skills,
        education: state.profile.education || '',
        description: document.querySelector('#onboardingOverview').value.trim() || state.profile.description || '',
        birth_date: document.querySelector('#onboardingBirthDate').value || state.profile.birth_date || '',
        gender: document.querySelector('#onboardingGender').value || state.profile.gender || '',
        birthplace: document.querySelector('#onboardingBirthplace').value.trim() || state.profile.birthplace || '',
    };
    const nextButton = document.querySelector('#onboardingNext');
    const skipButton = document.querySelector('#onboardingSkip');
    nextButton.disabled = true;
    skipButton.disabled = true;

    try {
        const payload = await authRequest('/profile', {
            method: 'PATCH',
            body: JSON.stringify(profile),
        });
        state.profile = {
            ...state.profile,
            ...payload.profile,
            avatarUrl: payload.profile.avatar_url ? `${payload.profile.avatar_url}&t=${Date.now()}` : '',
        };
        state.onboardingComplete = true;
        localStorage.setItem(`wb_onboarding_complete:${state.user.id}`, '1');
        persist();
        show('opportunities');
        toast('Your experience is ready.');
    } catch (error) {
        toast(error.message);
    } finally {
        nextButton.disabled = false;
        skipButton.disabled = false;
    }
}
export function startOnboarding() {
    document.querySelector('#onboardingGreeting').textContent = `${state.user?.name?.split(' ')[0] || 'Welcome'}, let’s personalize your experience`;
    document.querySelectorAll('#onboardingSteps input:not([type=checkbox]), #onboardingSteps textarea').forEach((input) => { input.value = ''; });
    document.querySelectorAll('#onboardingSteps select').forEach((input) => { input.value = ''; });
    document.querySelectorAll('#onboardingSteps [data-onboarding-choice]').forEach((button) => button.classList.remove('selected'));
    onboardingStep = 0;
    renderOnboardingStep();
    show('onboarding');
}

export function show(id) {
    if (id === 'opportunities' && state.role === 'client') {
        id = 'clientDashboard';
    }
    if (id === 'skills' && state.role === 'worker') {
        id = 'opportunities';
    }
    if (!state.user && !['welcome', 'about'].includes(id)) {
        openAccount('signin');
        return;
    }
    document.querySelectorAll('.screen').forEach((screen) => screen.classList.toggle('active', screen.id === id));
    document.querySelectorAll('.nav-link').forEach((link) => link.classList.toggle('active', link.dataset.go === id));
    document.querySelector('#mainNav').classList.remove('mobile-open');
    window.dispatchEvent(new CustomEvent('screen:changed', { detail: id }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function openAccount(mode = 'signin', role = null) {
    if (state.user) {
        show('opportunities');
        return;
    }
    previousAuthFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const accountModal = document.querySelector('#accountModal');
    accountModal.classList.remove('hidden');
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (role) chooseRole(role);
    setAccountTab(mode === 'signup' ? 'signup' : 'signin');
    requestAnimationFrame(() => {
        const target = mode === 'signup' ? document.querySelector('#accountName') : document.querySelector('#signinEmail');
        target?.focus();
    });
}

export function chooseRole(role) {
    if (!['client', 'worker'].includes(role)) return;
    document.querySelectorAll('[data-role-choice]').forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.roleChoice === role));
    });
    document.querySelector('#signupError').hidden = true;
    document.querySelector('#signupError').textContent = '';
}

function setAccountTab(mode) {
    const isSignup = mode === 'signup';
    window.accountMode = mode;
    document.querySelector('#signInTab').classList.toggle('active', !isSignup);
    document.querySelector('#signUpTab').classList.toggle('active', isSignup);
    document.querySelector('#signInTab').setAttribute('aria-selected', String(!isSignup));
    document.querySelector('#signUpTab').setAttribute('aria-selected', String(isSignup));
    document.querySelector('#signinPanel').hidden = isSignup;
    document.querySelector('#signupPanel').hidden = !isSignup;
    document.querySelector('#forgotPanel').hidden = true;
    document.querySelector('#resetPanel').hidden = true;
    document.querySelector('#accountTitle').textContent = isSignup ? 'Create your account' : 'Welcome back';
    document.querySelector('#accountCopy').textContent = isSignup ? 'Join FlexWork as a client or worker.' : 'Sign in to your FlexWork account.';
}

export function closeAccount() {
    document.querySelector('#accountModal').classList.add('hidden');
    document.body.style.overflow = previousBodyOverflow;
    previousAuthFocus?.focus();
    previousAuthFocus = null;
}

function showAuthPanel(panel) {
    if (panel === 'signin' || panel === 'signup') window.accountMode = panel;
    ['signin', 'signup', 'forgot', 'reset'].forEach((name) => {
        document.querySelector(`#${name}Panel`).hidden = name !== panel;
    });
    document.querySelector('#signInTab').classList.toggle('active', panel === 'signin');
    document.querySelector('#signUpTab').classList.toggle('active', panel === 'signup');
    document.querySelector('#signInTab').setAttribute('aria-selected', String(panel === 'signin'));
    document.querySelector('#signUpTab').setAttribute('aria-selected', String(panel === 'signup'));
    const titles = { signin: 'Welcome back', signup: 'Create your account', forgot: 'Reset your password', reset: 'Choose a new password' };
    document.querySelector('#accountTitle').textContent = titles[panel];
    document.querySelector('#accountCopy').textContent = panel === 'signup' ? 'Join FlexWork as a client or worker.' : panel === 'signin' ? 'Sign in to your FlexWork account.' : '';
}

export function updateHeader() {
    document.querySelectorAll('[data-client-only]').forEach((element) => {
        element.hidden = state.role === 'worker';
    });
    document.querySelectorAll('[data-client-account]').forEach((element) => {
        element.hidden = state.role !== 'client';
    });
    document.querySelectorAll('[data-worker-account]').forEach((element) => {
        element.hidden = state.role !== 'worker';
    });
    if (state.role === 'worker' && document.querySelector('#skills.active')) {
        show('opportunities');
    }
    const login = document.querySelector('#loginBtn');
    const start = document.querySelector('#startBtn');
    login.textContent = state.user ? 'My profile' : 'Sign in';
    start.textContent = state.user ? 'Feedback' : 'Get started';
    login.onclick = () => state.user ? show('profile') : openAccount('signin');
    start.onclick = () => state.user ? show('feedback') : openAccount('signup');
}

function applyTheme(theme) {
    document.documentElement.classList.toggle('light-mode', theme === 'light');
    document.documentElement.classList.toggle('dark-mode', theme === 'dark');
    const toggle = document.querySelector('#themeToggle');
    if (toggle) {
        toggle.textContent = theme === 'light' ? '☾' : '☼';
        toggle.setAttribute('aria-label', theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
    }
}

export function initNavigation() {
    state.user = null;
    state.role = null;
    applyTheme(localStorage.getItem('wb_theme') || 'light');
    document.querySelector('#themeToggle').addEventListener('click', () => {
        const theme = document.documentElement.classList.contains('light-mode') ? 'dark' : 'light';
        localStorage.setItem('wb_theme', theme);
        applyTheme(theme);
    });
    document.querySelectorAll('[data-go]').forEach((button) => button.addEventListener('click', () => {
        const dest = button.dataset.go;
        // Require sign-in for all sections except welcome and about; prompt sign-in when unauthenticated
        const requiresAuth = dest !== 'welcome' && dest !== 'about';
        if (requiresAuth && !state.user) {
            openAccount('signin');
            return;
        }
        show(dest);
    }));
    document.querySelector('#menuBtn').addEventListener('click', () => document.querySelector('#mainNav').classList.toggle('mobile-open'));
    document.querySelector('#loginBtn').addEventListener('click', () => openAccount());
    document.querySelector('#startBtn').addEventListener('click', () => openAccount('signup'));
    document.querySelector('#navPostJob').addEventListener('click', () => {
        document.querySelector('#mainNav').classList.remove('mobile-open');
        if (!state.user) {
            openAccount('signin');
            return;
        }
        if (state.role !== 'client') return;
        document.querySelector('#postJobModal').classList.remove('hidden');
    });
    document.querySelectorAll('.role-card[data-role]').forEach((button) => button.addEventListener('click', () => openAccount('signin', button.dataset.role)));
    document.querySelectorAll('[data-role-choice]').forEach((button) => button.addEventListener('click', () => chooseRole(button.dataset.roleChoice)));
    document.querySelector('#signInTab').addEventListener('click', () => showAuthPanel('signin'));
    document.querySelector('#signUpTab').addEventListener('click', () => showAuthPanel('signup'));
    document.querySelectorAll('[data-auth-tab]').forEach((button) => button.addEventListener('click', () => showAuthPanel(button.dataset.authTab)));
    document.querySelector('#accountModal [role="tablist"]').addEventListener('keydown', (event) => {
        if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        event.preventDefault();
        const next = event.target.id === 'signInTab' ? 'signUpTab' : 'signInTab';
        document.querySelector(`#${next}`).focus();
        document.querySelector(`#${next}`).click();
    });
    document.querySelectorAll('[data-toggle-password]').forEach((button) => button.addEventListener('click', () => {
        const password = document.querySelector(`#${button.dataset.togglePassword}`);
        password.type = password.type === 'password' ? 'text' : 'password';
        button.textContent = password.type === 'password' ? 'Show' : 'Hide';
        button.setAttribute('aria-label', password.type === 'password' ? 'Show password' : 'Hide password');
    }));
    document.querySelectorAll('#signinForm,#signupForm,#forgotForm,#resetForm').forEach((form) => {
        form.addEventListener('input', () => clearFormError(form));
    });
    document.querySelector('#forgotPassword').addEventListener('click', () => {
        document.querySelector('#forgotEmail').value = document.querySelector('#signinEmail').value.trim();
        showAuthPanel('forgot');
        document.querySelector('#forgotEmail').focus();
    });
    document.querySelectorAll('[data-google-oauth]').forEach((button) => button.addEventListener('click', () => {
        const flow = button.dataset.googleOauth;
        const params = new URLSearchParams({ flow });
        if (flow === 'signup') {
            const role = document.querySelector('[data-role-choice][aria-pressed=true]')?.dataset.roleChoice;
            if (!role) {
                showFormError(document.querySelector('#signupForm'), new Error('Choose Client or Worker to continue with Google.'));
                document.querySelector('[data-role-choice="client"]').focus();
                return;
            }
            params.set('role', role);
        }
        button.disabled = true;
        window.location.assign(`/auth/google?${params.toString()}`);
    }));
    document.querySelector('#signinForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        clearFormError(form);
        if (!form.reportValidity()) return;
        const submit = form.querySelector('[type=submit]');
        submit.disabled = true;
        submit.textContent = 'Signing in…';
        try {
            const payload = await authRequest('/auth/login', {
                method: 'POST',
                body: JSON.stringify({
                    email: document.querySelector('#signinEmail').value.trim(),
                    password: document.querySelector('#signinPassword').value,
                }),
            });
            finishAuthentication(payload.user, 'Signed in.');
        } catch (error) {
            document.querySelector('#signinPassword').value = '';
            showFormError(form, error);
        } finally {
            submit.disabled = false;
            submit.textContent = 'Sign In';
        }
    });
    document.querySelector('#signupForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        clearFormError(form);
        if (!form.reportValidity()) return;
        const role = document.querySelector('[data-role-choice][aria-pressed=true]')?.dataset.roleChoice;
        if (!role) {
            showFormError(form, new Error('Choose whether you are a Client or Worker.'));
            document.querySelector('[data-role-choice="client"]').focus();
            return;
        }
        const password = document.querySelector('#accountPassword');
        const confirmation = document.querySelector('#accountPasswordConfirmation');
        if (password.value !== confirmation.value) {
            confirmation.setAttribute('aria-invalid', 'true');
            showFormError(form, new Error('Password confirmation must match your password.'));
            confirmation.focus();
            return;
        }
        const submit = form.querySelector('[type=submit]');
        submit.disabled = true;
        submit.textContent = 'Creating account…';
        try {
            const payload = await authRequest('/auth/register', {
                method: 'POST',
                body: JSON.stringify({
                    name: document.querySelector('#accountName').value.trim(),
                    username: document.querySelector('#accountUsername').value.trim(),
                    email: document.querySelector('#accountEmail').value.trim(),
                    contact_number: document.querySelector('#accountContact').value.trim(),
                    password: password.value,
                    password_confirmation: confirmation.value,
                    role,
                }),
            });
            finishAuthentication(payload.user, 'Account created and signed in.');
        } catch (error) {
            password.value = '';
            confirmation.value = '';
            showFormError(form, error);
        } finally {
            submit.disabled = false;
            submit.textContent = 'Create Account';
        }
    });
    document.querySelector('#forgotForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        clearFormError(form);
        document.querySelector('#forgotSuccess').hidden = true;
        if (!form.reportValidity()) return;
        const submit = form.querySelector('[type=submit]');
        submit.disabled = true;
        try {
            const response = await authRequest('/auth/forgot-password', {
                method: 'POST',
                body: JSON.stringify({ email: document.querySelector('#forgotEmail').value.trim() }),
            });
            document.querySelector('#forgotSuccess').textContent = response.message;
            document.querySelector('#forgotSuccess').hidden = false;
        } catch (error) {
            showFormError(form, error);
        } finally {
            submit.disabled = false;
        }
    });
    document.querySelector('#resetForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        clearFormError(form);
        if (!form.reportValidity()) return;
        const submit = form.querySelector('[type=submit]');
        submit.disabled = true;
        try {
            await authRequest('/auth/reset-password', {
                method: 'POST',
                body: JSON.stringify({
                    token: document.querySelector('#resetToken').value,
                    email: document.querySelector('#resetEmail').value,
                    password: document.querySelector('#resetPassword').value,
                    password_confirmation: document.querySelector('#resetPasswordConfirmation').value,
                }),
            });
            document.querySelector('#resetPassword').value = '';
            document.querySelector('#resetPasswordConfirmation').value = '';
            showAuthPanel('signin');
            toast('Password reset. Please sign in with your new password.');
        } catch (error) {
            document.querySelector('#resetPassword').value = '';
            document.querySelector('#resetPasswordConfirmation').value = '';
            showFormError(form, error);
        } finally {
            submit.disabled = false;
        }
    });
    document.querySelector('#accountModal').addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeAccount();
            return;
        }
        if (event.key !== 'Tab') return;
        const modal = document.querySelector('#accountModal');
        const focusable = [...modal.querySelectorAll('button:not(:disabled),input:not(:disabled),a[href]')]
            .filter((element) => !element.closest('[hidden]'));
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    });
    loadCurrentUser();
    handleAuthRedirect();
    document.querySelector('#onboardingNext').addEventListener('click', () => {
        if (onboardingStep === 0) state.onboarding.location = document.querySelector('#onboardingLocation').value.trim();
        if (onboardingStep === 1) { state.onboarding.experience = document.querySelector('#onboardingExperience').value.trim(); state.onboarding.company = document.querySelector('#onboardingCompany').value.trim(); }
        if (onboardingStep === 1) {
            state.profile.birth_date = document.querySelector('#onboardingBirthDate').value;
            state.profile.gender = document.querySelector('#onboardingGender').value;
            state.profile.birthplace = document.querySelector('#onboardingBirthplace').value.trim();
        }
        if (onboardingStep === 3 && !state.onboarding.looking) { toast('Choose an option to continue.'); return; }
        if (onboardingStep === 4) state.onboarding.interests = document.querySelector('#onboardingInterests').value.split(',').map((item) => item.trim()).filter(Boolean);
        if (onboardingStep === 5) state.onboarding.notifications = document.querySelector('#onboardingNotifications').checked;
        if (onboardingStep < onboardingTotal - 1) { onboardingStep += 1; renderOnboardingStep(); } else finishOnboarding();
    });
    document.querySelector('#onboardingSkip').addEventListener('click', finishOnboarding);
    document.querySelectorAll('[data-onboarding-choice]').forEach((button) => button.addEventListener('click', () => {
        state.onboarding[button.dataset.onboardingChoice] = button.dataset.value;
        document.querySelectorAll(`[data-onboarding-choice="${button.dataset.onboardingChoice}"]`).forEach((item) => item.classList.toggle('selected', item === button));
    }));
}

function finishAuthentication(user, message) {
    const accountChanged = state.user?.id !== user.id;
    state.user = user;
    state.role = user.role;
    if (accountChanged) {
        state.profile = {
            name: user.name,
            title: '',
            skills: '',
            education: '',
            description: '',
            birth_date: '',
            gender: '',
            birthplace: '',
            avatarUrl: '',
        };
        state.resume = null;
        state.applications = [];
        state.onboarding = {};
    }
    if (user.role === 'worker') {
        state.onboardingComplete = localStorage.getItem(`wb_onboarding_complete:${user.id}`) === '1';
    }
    state.profile.name = user.name;
    persist();
    updateHeader();
    window.dispatchEvent(new Event('auth:updated'));
    closeAccount();
    toast(message);
    if (!state.onboardingComplete && state.role === 'worker') startOnboarding();
    else if (state.role === 'client') show('clientDashboard');
    else show('opportunities');
}

function handleAuthRedirect() {
    const url = new URL(window.location.href);
    const authState = url.searchParams.get('auth');
    const authError = url.searchParams.get('auth_error');
    const token = url.searchParams.get('token') || url.pathname.match(/\/password\/reset\/([^/]+)/)?.[1];
    const email = url.searchParams.get('email');
    if (authError || authState === 'google-account-type-required') {
        state.user = null;
        state.role = null;
        persist();
        updateHeader();
    }

    if (token && email) {
        document.querySelector('#resetToken').value = token;
        document.querySelector('#resetEmail').value = email;
        openAccount();
        showAuthPanel('reset');
        requestAnimationFrame(() => document.querySelector('#resetPassword').focus());
    } else if (authState === 'google-account-type-required') {
        openAccount('signup');
        toast('Choose Client or Worker, then continue with Google.');
    } else if (authState === 'success') {
        toast('Signed in with Google.');
    } else if (authError) {
        const messages = {
            google_not_configured: 'Google sign-in is not configured yet.',
            google_cancelled: 'Google sign-in was cancelled.',
            google_state: 'Google sign-in expired. Please try again.',
            google_failed: 'Google sign-in could not be completed. Please try again.',
            google_identity: 'Google did not provide a verified email identity.',
            google_link_required: 'This email already has an account. Sign in with your password first.',
        };
        openAccount('signin');
        toast(messages[authError] || 'Google sign-in could not be completed.');
    }
    if (authState || authError || (token && email)) {
        window.history.replaceState({}, '', `${url.pathname}`);
    }
}

async function loadCurrentUser() {
    try {
        const payload = await authRequest('/auth/me');
        if (payload.user) {
            state.user = payload.user;
            state.role = payload.user.role;
            state.profile.name = payload.user.name;
            persist();
            updateHeader();
            closeAccount();
            window.dispatchEvent(new Event('auth:updated'));
            if (!state.onboardingComplete && state.role === 'worker') startOnboarding();
            else if (state.role === 'client') show('clientDashboard');
        } else {
            state.user = null;
            state.role = null;
            persist();
            updateHeader();
        }
    } catch {
        state.user = null;
        state.role = null;
        persist();
    }
}
