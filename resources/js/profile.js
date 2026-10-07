import { state, persist, toast } from './state';
import { authRequest, openAccount, updateHeader, show } from './navigation';
import { jobs } from './data';

const emptyState = (title, text, action = '') => `<div class="status-row"><span class="job-left"><strong>${title}</strong><span>${text}</span></span>${action}</div>`;

function renderList(selector, items, empty) {
    document.querySelector(selector).innerHTML = items.length ? items.join('') : empty;
}

function reviewActions(application) {
    return `<div class="review-actions"><button class="mini-btn accept-application-btn" data-application-action="Approved" data-application-id="${application.id}" type="button">Accept</button><button class="mini-btn reject-application-btn" data-application-action="Rejected" data-application-id="${application.id}" type="button">Reject</button></div>`;
}

function downloadResume() {
    if (!state.resume?.data) { toast('No resume file is available.'); return; }
    const link = document.createElement('a');
    link.href = state.resume.data;
    link.download = state.resume.name || 'resume';
    document.body.appendChild(link);
    link.click();
    link.remove();
}

function previewResume() {
    if (!state.resume?.data) { toast('No resume file is available.'); return; }
    document.querySelector('#previewResumeTitle').textContent = state.resume.name;
    const frame = document.querySelector('#resumePreviewFrame');
    frame.innerHTML = state.resume.type === 'application/pdf' ? `<iframe src="${state.resume.data}" title="Resume preview"></iframe>` : '<p>This file type cannot be previewed in the browser. Use Download resume to open it.</p>';
    document.querySelector('#resumePreviewModal').classList.remove('hidden');
}

export function renderProfile() {
    const profile = state.profile;
    const client = state.role === 'client' && Boolean(state.user);
    const applications = state.applications || [];
    const received = applications.filter((application) => application.status === 'Pending Review' && application.clientId === state.user?.id);
    const starred = jobs.filter((job) => state.starred.includes(job.id));
    const posted = state.clientJobs || [];

    const displayName = profile.name || state.user?.name;
    document.querySelector('#profileName').textContent = displayName || 'Guest User';
    document.querySelector('#profileBannerName').textContent = displayName || 'Name not specified';
    document.querySelector('#profileBannerTitle').textContent = profile.title || 'Job description not specified';
    const avatarImage = document.querySelector('#profileAvatarImage');
    const avatarPlaceholder = document.querySelector('#profileAvatarPlaceholder');
    avatarImage.hidden = !profile.avatarUrl;
    avatarPlaceholder.hidden = Boolean(profile.avatarUrl);
    avatarImage.src = profile.avatarUrl || '';
    document.querySelector('#profileAvatarEdit').textContent = profile.avatarUrl ? 'Change photo' : 'Upload photo';
    document.querySelector('#profilePictureBtn').setAttribute('aria-label', profile.avatarUrl ? 'Change profile picture' : 'Upload profile picture');
    document.querySelector('#profileSkillsText').textContent = profile.skills || 'Not specified';
    document.querySelector('#profileEducationText').textContent = profile.education || 'Not specified';
    document.querySelector('#profileDescriptionText').textContent = profile.description || 'Add a short description about your experience and the work you do.';
    document.querySelector('#profileRole').textContent = state.user ? `${client ? 'Client' : 'Worker'} · ${client ? 'Hiring / Talent seeker' : 'Job seeker'}` : 'Not signed in';
    document.querySelector('#profileSignIn').hidden = Boolean(state.user);
    document.querySelector('#logoutBtn').hidden = !state.user;
    document.querySelectorAll('.client-only').forEach((element) => { element.hidden = !client; });
    document.querySelectorAll('.worker-only').forEach((element) => { element.hidden = !state.user || state.role !== 'worker'; });
    document.querySelector('#applicationsTitle').textContent = client ? 'My Posted Jobs' : 'My applications';

    renderList('#myJobsList', client ? posted.map((job) => `<div class="myjob-row"><div class="job-left"><strong>${job.title}</strong><span>${job.cat} · ${job.place} · ${job.salary}</span></div><span class="status-chip status-approved">LIVE</span></div>`) : applications.map((application) => `<div class="myjob-row"><div class="job-left"><strong>${application.title}</strong><span>${application.company} · ${application.submitted}</span></div><span class="status-chip status-pending">${application.status}</span></div>`), client ? emptyState('No jobs posted yet', 'Use Post a Job to create your first opportunity for workers.') : emptyState('No applications yet', 'Browse opportunities and submit an application with your resume.'));
    document.querySelector('#myJobsCount').textContent = `${client ? posted.length : applications.length} items`;
    renderList('#postedJobsList', posted.map((job) => `<div class="myjob-row"><div class="job-left"><strong>${job.title}</strong><span>${job.cat} · ${job.place} · ${job.budget}</span></div><span class="status-chip status-approved">LIVE</span></div>`), emptyState('No jobs posted yet', 'Use Post a Job to create your first opportunity for workers.'));
    renderList('#receivedList', received.map((application) => `<div class="myjob-row"><div class="job-left"><strong>${application.title}</strong><span>${application.applicant?.name || 'Worker applicant'} · ${application.company} · ${application.submitted}</span></div>${reviewActions(application)}</div>`), emptyState('No worker applications yet', 'Applications to your posted jobs will appear here.'));
    renderList('#starredList', starred.map((job) => `<div class="myjob-row"><div class="job-left"><strong>${job.title}</strong><span>${job.company}</span></div></div>`), emptyState('No starred jobs yet', 'Save opportunities to find them here.'));
    renderList('#pendingList', client ? received.map((application) => `<div class="myjob-row"><div class="job-left"><strong>${application.title}</strong><span>${application.applicant?.name || 'Worker applicant'} · ${application.submitted}</span></div>${reviewActions(application)}</div>`) : applications.filter((application) => application.status === 'Pending Review').map((application) => `<div class="myjob-row"><div class="job-left"><strong>${application.title}</strong><span>${application.company} · ${application.submitted}</span></div><div class="application-actions"><span class="status-chip status-pending">Pending Review</span><button class="mini-btn cancel-application-btn" data-cancel-application="${application.id}" type="button">Cancel</button></div></div>`), emptyState(client ? 'No pending worker applications' : 'No pending applications', client ? 'Worker applications waiting for your review will appear here.' : 'Submitted applications will appear here.'));
    document.querySelectorAll('[data-application-action]').forEach((button) => button.addEventListener('click', () => {
        const application = state.applications.find((item) => String(item.id) === button.dataset.applicationId);
        if (!application) return;
        application.status = button.dataset.applicationAction;
        persist();
        renderProfile();
        toast(`Application ${button.dataset.applicationAction.toLowerCase()}.`);
    }));
    document.querySelectorAll('[data-cancel-application]').forEach((button) => button.addEventListener('click', () => {
        state.applications = state.applications.filter((application) => String(application.id) !== button.dataset.cancelApplication);
        persist();
        renderProfile();
        document.querySelector('[data-profile="pending"]')?.click();
        toast('Application cancelled.');
    }));
    renderList('#rejectedList', applications.filter((application) => application.status === 'Rejected').map((application) => `<div class="myjob-row"><div class="job-left"><strong>${application.title}</strong><span>${application.company} · ${application.submitted}</span></div><span class="status-chip status-rejected">Rejected</span></div>`), emptyState('No rejected applications', 'Keep building skills and applying.'));
    document.querySelector('#starredCount').textContent = `${starred.length} items`;
    document.querySelector('#resumeTitle').textContent = state.resume?.name || 'No resume uploaded';
    document.querySelector('#resumeMeta').textContent = state.resume ? `Updated ${state.resume.updated}` : 'Upload a PDF, DOC, or DOCX resume.';
    document.querySelector('#viewResumeBtn').hidden = !state.resume?.data;
    document.querySelector('#downloadResumeBtn').hidden = !state.resume?.data;
}

function updateVerificationStatus(status) {
    const badge = document.querySelector('#profileVerificationBadge');
    const marker = badge.querySelector('b');
    const states = {
        pending: ['P', 'ID UNDER REVIEW'],
        approved: ['✓', 'ID VERIFIED'],
        rejected: ['!', 'RESUBMIT ID'],
        not_submitted: ['0', 'ID PROOF'],
    };
    const [markerText, label] = states[status] || states.not_submitted;
    marker.textContent = markerText;
    badge.lastChild.textContent = ` ${label}`;
    badge.dataset.status = status;
}

async function loadRemoteProfile() {
    if (!state.user) return;
    try {
        const payload = await authRequest('/profile');
        state.profile = {
            ...state.profile,
            ...payload.profile,
            avatarUrl: payload.profile.avatar_url ? `${payload.profile.avatar_url}&t=${Date.now()}` : '',
        };
        if (payload.profile.name) state.user.name = payload.profile.name;
        updateVerificationStatus(payload.verification.status);
        persist();
        renderProfile();
    } catch (error) {
        toast(error.message);
    }
}

async function loadVerificationStatus() {
    if (!state.user || state.role !== 'worker') return;
    try {
        const payload = await authRequest('/profile/verification');
        updateVerificationStatus(payload.status);
    } catch (error) {
        toast(error.message);
    }
}

export function initProfile() {
    window.addEventListener('auth:updated', () => {
        renderProfile();
        loadRemoteProfile();
        loadVerificationStatus();
    });
    loadRemoteProfile();
    loadVerificationStatus();
    document.querySelectorAll('[data-profile]').forEach((button) => button.addEventListener('click', () => {
        document.querySelectorAll('.profile-tab').forEach((item) => item.classList.remove('active'));
        button.classList.add('active');
        document.querySelectorAll('.profile-panel').forEach((panel) => panel.classList.remove('active'));
        document.querySelector(`#panel-${button.dataset.profile}`).classList.add('active');
    }));
    document.querySelector('#logoutBtn').addEventListener('click', async () => {
        try { await authRequest('/auth/logout', { method: 'POST', body: JSON.stringify({}) }); state.user = null; state.role = null; persist(); updateHeader(); renderProfile(); window.dispatchEvent(new Event('auth:updated')); show('welcome'); toast('Signed out.'); } catch (error) { toast(error.message); }
    });
    document.querySelector('#profileSignIn').addEventListener('click', () => openAccount());
    document.querySelector('#profilePictureBtn').addEventListener('click', () => {
        if (!state.user) { openAccount('signin'); return; }
        document.querySelector('#profilePictureInput').click();
    });
    document.querySelector('#profilePictureInput').addEventListener('change', async (event) => {
        const input = event.currentTarget;
        const file = input.files?.[0];
        if (!file) return;
        const isJfif = /\.jfif$/i.test(file.name);
        if (!['image/jpeg', 'image/jfif', 'image/png', 'image/webp'].includes(file.type) && !isJfif) {
            toast('Choose a JPG, JFIF, PNG, or WebP profile picture.');
            input.value = '';
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            toast('Choose a profile picture smaller than 2 MB.');
            input.value = '';
            return;
        }

        const formData = new FormData();
        formData.append('avatar', file);
        const button = document.querySelector('#profilePictureBtn');
        button.disabled = true;
        try {
            const payload = await authRequest('/profile/avatar', { method: 'POST', body: formData });
            state.profile.avatarUrl = `${payload.avatar_url}&t=${Date.now()}`;
            renderProfile();
            toast(payload.message);
        } catch (error) {
            toast(error.message);
        } finally {
            button.disabled = false;
            input.value = '';
        }
    });
    document.querySelector('#verificationBtn').addEventListener('click', () => {
        if (!state.user) { openAccount('signin'); return; }
        if (state.role !== 'worker') { toast('Identity verification is available for worker accounts.'); return; }
        document.querySelector('#verificationModal').classList.remove('hidden');
    });
    document.querySelector('#postJobBtn').addEventListener('click', () => {
        if (!state.user || state.role !== 'client') { openAccount('signup', 'client'); return; }
        document.querySelector('#postJobModal').classList.remove('hidden');
    });
    document.querySelector('#postJobForm').addEventListener('submit', (event) => {
        event.preventDefault();
        if (!state.user || state.role !== 'client') { toast('Sign in with a client account to post a job.'); return; }
        const title = document.querySelector('#postJobTitle').value.trim();
        const place = document.querySelector('#postJobPlace').value.trim();
        const budget = document.querySelector('#postJobBudget').value.trim();
        const desc = document.querySelector('#postJobDescription').value.trim();
        if (!title || !place || !budget || !desc) { toast('Complete all required job fields.'); return; }
        const tags = [...document.querySelectorAll('#postJobForm .skill-options input:checked')].map((input) => input.value).filter((tag) => tag !== 'Others');
        const otherSkill = document.querySelector('#postJobOtherSkill').value.trim();
        if (document.querySelector('#otherSkillChoice').checked && otherSkill) tags.push(otherSkill);
        const category = document.querySelector('#postJobCategory').value === 'Others' ? document.querySelector('#postJobOtherCategory').value.trim() : document.querySelector('#postJobCategory').value;
        if (!category) { toast('Specify the other category.'); return; }
        state.clientJobs.unshift({
            id: `client-${Date.now()}`,
            ownerId: state.user.id,
            cat: category,
            title,
            company: state.profile.name || state.user.name,
            place,
            type: document.querySelector('#postJobType').value,
            salary: budget,
            budget,
            match: 90,
            tags,
            desc,
        });
        document.querySelector('#postJobCategory').addEventListener('change', (event) => { document.querySelector('#otherCategoryLabel').hidden = event.target.value !== 'Others'; });
        document.querySelector('#otherSkillChoice').addEventListener('change', (event) => { document.querySelector('#postJobOtherSkill').hidden = !event.target.checked; });
        persist();
        event.currentTarget.reset();
        document.querySelector('#postJobModal').classList.add('hidden');
        renderProfile();
        window.dispatchEvent(new Event('jobs:updated'));
        toast('Job published. Workers can now apply.');
    });
    document.querySelector('#clientMessagesBtn').addEventListener('click', () => show('messages'));
    const openProfileEditor = (focusEducation = false) => {
        if (!state.user) { openAccount('signin'); return; }
        document.querySelector('#profileFullName').value = state.profile.name || state.user?.name || '';
        document.querySelector('#profileTitle').value = state.profile.title || '';
        document.querySelector('#profileSkills').value = state.profile.skills || '';
        document.querySelector('#profileEducation').value = state.profile.education || '';
        document.querySelector('#profileBio').value = state.profile.description || '';
        document.querySelector('#profileModal').classList.remove('hidden');
        if (focusEducation) document.querySelector('#profileEducation').focus();
    };
    document.querySelector('#editProfileBtn').addEventListener('click', () => openProfileEditor());
    document.querySelector('#editEducationBtn').addEventListener('click', () => openProfileEditor(true));
    document.querySelector('#profileForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const profile = {
            name: document.querySelector('#profileFullName').value.trim(),
            title: document.querySelector('#profileTitle').value.trim(),
            skills: document.querySelector('#profileSkills').value.trim(),
            education: document.querySelector('#profileEducation').value.trim(),
            description: document.querySelector('#profileBio').value.trim(),
        };
        const submit = event.currentTarget.querySelector('[type="submit"]');
        submit.disabled = true;
        try {
            const payload = await authRequest('/profile', { method: 'PATCH', body: JSON.stringify(profile) });
            state.profile = payload.profile;
            state.user.name = payload.profile.name;
            persist();
            renderProfile();
            document.querySelector('#profileModal').classList.add('hidden');
            toast('Profile updated.');
        } catch (error) {
            toast(error.message);
        } finally {
            submit.disabled = false;
        }
    });
    document.querySelector('#verificationForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const input = document.querySelector('#verificationFile');
        const file = input.files?.[0];
        if (!file) { toast('Choose an ID or school ID to submit.'); return; }
        const isJfif = /\.jfif$/i.test(file.name);
        if (!['image/jpeg', 'image/jfif', 'image/png', 'application/pdf'].includes(file.type) && !isJfif) {
            toast('Choose a JPG, JFIF, PNG, or PDF ID.');
            input.value = '';
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast('Choose an ID smaller than 5 MB.');
            input.value = '';
            return;
        }
        const formData = new FormData();
        formData.append('document', file);
        const submit = document.querySelector('#submitVerificationBtn');
        submit.disabled = true;
        try {
            const payload = await authRequest('/profile/verification', { method: 'POST', body: formData });
            updateVerificationStatus(payload.status);
            form.reset();
            document.querySelector('#verificationModal').classList.add('hidden');
            toast(payload.message);
        } catch (error) {
            toast(error.message);
        } finally {
            submit.disabled = false;
        }
    });
    document.querySelector('#resumeBtn').addEventListener('click', () => document.querySelector('#resumeFileInput').click());
    document.querySelector('#resumePanelBtn').addEventListener('click', () => document.querySelector('#resumeFileInput').click());
    document.querySelector('#viewResumeBtn').addEventListener('click', previewResume);
    document.querySelector('#downloadResumeBtn').addEventListener('click', downloadResume);
    document.querySelector('#previewDownloadBtn').addEventListener('click', downloadResume);
    document.querySelector('#resumeFileInput').addEventListener('change', (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!/\.(pdf|doc|docx)$/i.test(file.name)) { toast('Choose a PDF, DOC, or DOCX file.'); return; }
        if (file.size > 4 * 1024 * 1024) { toast('Choose a resume smaller than 4 MB.'); return; }
        const reader = new FileReader();
        reader.onerror = () => toast('The resume could not be read. Please try again.');
        reader.onload = () => { state.resume = { name: file.name, type: file.type, size: file.size, data: reader.result, updated: new Date().toLocaleDateString() }; persist(); renderProfile(); toast('Resume uploaded.'); };
        reader.readAsDataURL(file);
    });
}
